import { catalogGraph } from './graph-presets.js';
import { layoutDiagram, terminal, connectionState, palette, transitionDuration } from './lifecycle.js';
import { planFlow, fadeDuration } from './flow.js';
import { clamp, colors, geometry, pointAt } from './primitives.js';

const empty={events:[],spans:[]};
const evaluate=(value,time)=>typeof value==='function'?value(time):value;
const captionAt=(captions,time)=>(captions||[]).filter(c=>c[0]<=time).at(-1)?.[1]||'';
const workSpans=row=>(row.spans||[]).filter(p=>!['queue','state','window','subscription'].includes(p.kind));

// Kompilacja wykonuje się raz. Cały graf (także niewidoczne inner) rezerwuje miejsca.
// rows i jawny graf kończą w tym samym planie; RAF nie uczestniczy w semantyce.
export function compileScene(scene) {
  const graph=scene.graph ? (typeof scene.graph==='function'?scene.graph(scene):scene.graph) :
    scene.kind==='cards'?{nodes:[],edges:[],trays:[],width:1240,height:340}:catalogGraph(scene);
  const nodes=graph.nodes.map(n=>({w:230,h:70,ri:null,...n}));
  const nodeById=new Map(nodes.map(n=>[n.id,n]));
  const trays=(graph.trays||[]).map(q=>({...q}));
  const row=n=>n.lifecycleRow || (n.ri!==null?scene.rows[n.ri]:null) || empty;
  const width=graph.width||1240, height=graph.height||340;
  let edges=graph.edges.map(e=>({...e,a:nodeById.get(e.from||e.a.id),b:nodeById.get(e.to||e.b.id)}));
  if(graph.layout!=='fixed') edges=layoutDiagram(nodes,edges,trays,width,height);
  for(const edge of edges) {
    if(!edge.a || !edge.b) throw new Error(`${scene.id}: nieznany węzeł krawędzi`);
    edge.id ||= edge.a.id+'-'+edge.b.id;
    edge.events ||= [];
    const sourceRow=edge.a.lifecycleRow || (edge.workRow!==undefined?scene.rows[edge.workRow]:edge.a.ri!==null?row(edge.a):null);
    const targetRow=edge.b.ri!==null?row(edge.b):null;
    const work=sourceRow?workSpans(sourceRow):[];
    const subscription=targetRow?.spans.find(p=>p.kind==='subscription');
    edge.logicalStart ??= Math.max(edge.born||0,edge.a.born||0,edge.b.born||0,subscription?.start||0,
      (edge.gateWork||edge.a.work)&&work.length?work[0].start:0);
    if(edge.logicalEnd===undefined) {
      let end=terminal(sourceRow) || (!sourceRow?terminal(targetRow):null);
      const targetEnd=subscription?terminal(targetRow):null;
      if(targetEnd && (!end||targetEnd.at<end.at))end=targetEnd;
      if(edge.until!==undefined&&(!end||edge.until<end.at))end={at:edge.until,kind:'unsubscribe'};
      edge.logicalEnd=end;
    }
  }
  for(let i=0;i<edges.length;i++) for(const edge of edges) {
    const downstream=edges.filter(next=>next.a===edge.b&&!next.gateWork);
    if(downstream.length&&!edge.fixedStart)edge.logicalStart=Math.max(edge.logicalStart,Math.min(...downstream.map(e=>e.logicalStart)));
  }
  edges.forEach(e=>{e.events=e.events.filter(v=>v.at>=e.logicalStart&&(!e.logicalEnd || v.at<=e.logicalEnd.at)&&!(e.logicalEnd?.kind==='unsubscribe'&&v.at>=e.logicalEnd.at));});
  const plan=graph.schedule ? scheduledPlan(graph,edges,scene.duration) : planFlow(nodes,edges,scene.duration);
  const records=[...plan.records.values()];
  const births=new Map(nodes.map(n=>[n.id,n.ready?0:n.createdBy?
    plan.records.get(n.createdBy.edge)?.events.find(e=>e.value===n.createdBy.value)?.arrival??Infinity:
    n.createdAt!==undefined?plan.timeOf(n.createdAt):plan.births.get(n.id)??plan.timeOf(n.born||0)]));
  const events=[];
  const add=(type,at,data={})=>events.push({id:`${type}:${data.edge||data.node||'scene'}:${events.length}`,type,at,...data});
  nodes.forEach(n=>add(n.inner?'inner-create':'node-create',births.get(n.id),{node:n.id}));
  for(const r of records) {
    add('subscribe',r.start,{edge:r.id,node:r.b.id,logicalAt:r.logicalStart});
    add(r.gateWork?'inner-subscribe':'connected',r.start+(r.connectDuration||transitionDuration),{edge:r.id,node:r.a.id,logicalAt:r.logicalStart});
    for(const v of r.events) {
      add(r.a.inner?'inner-next':'source-next',v.at,{edge:r.id,node:r.a.id,value:v.value,logicalAt:v.logicalAt});
      add('value-travel',v.at,{edge:r.id,node:r.a.id,value:v.value,until:v.arrival,logicalAt:v.logicalAt});
      add('deliver-next',v.arrival,{edge:r.id,node:r.b.id,value:v.value,logicalAt:v.logicalAt});
    }
    if(r.end) {
      add(r.end.kind==='unsubscribe'?'inner-unsubscribe':r.end.kind==='error'?'stream-error':'stream-complete',r.end.at,{edge:r.id,node:r.a.id,logicalAt:r.end.logicalAt});
      add('disconnected',r.end.at+(r.end.duration||transitionDuration),{edge:r.id,node:r.b.id,kind:r.end.kind});
    }
  }
  for(const n of nodes) for(const span of row(n).spans||[]) {
    if(span.kind==='queue') {add('queue-add',plan.timeOf(span.start),{node:n.id,value:span.label});add('queue-pop',plan.timeOf(span.end),{node:n.id,value:span.label});}
    else if(span.kind==='window') {add('buffer-open',plan.timeOf(span.start),{node:n.id});add('buffer-close',plan.timeOf(span.end),{node:n.id});}
    else if(['work','cancel','error'].includes(span.kind)) {
      const edge=records.find(e=>e.a.id===n.id&&e.logicalStart===span.start);
      add('work-start',edge?edge.start+(edge.connectDuration||transitionDuration):plan.timeOf(span.start),{node:n.id,logicalAt:span.start});
      add('work-stop',edge?.end?.at??plan.timeOf(span.end),{node:n.id,logicalAt:span.end,reason:span.kind==='cancel'?'unsubscribe':span.kind==='error'?'error':'complete'});
    }
  }
  for(const transform of graph.transforms||[])add('operator-transform',transform.at,{node:transform.node,value:transform.label,until:transform.until});
  for(const event of graph.timeline||[]) {
    const {at,...data}=event;
    add(event.type,graph.schedule?at:plan.timeOf(at),{...data,logicalAt:at});
  }
  events.sort((a,b)=>a.at-b.at);
  const stops=(scene.playback?.stops||[]).map(stop=>{
    let time=stop.time;
    if(time===undefined&&stop.modelTime!==undefined) {
      const batch=plan.batches.find(b=>b.at===stop.modelTime);
      time=stop.phase==='before'?plan.timeOf(stop.modelTime):(batch?.end??plan.timeOf(stop.modelTime));
    }
    if(time===undefined) {
      const matches=events.filter(e=>Object.entries(stop.event||{}).every(([key,value])=>e[key]===value));
      time=(stop.last?matches.at(-1):matches[0])?.at;
    }
    if(!Number.isFinite(time))throw new Error(`${scene.id}: nierozwiązany checkpoint ${stop.id}`);
    return {...stop,time:time+(stop.offset||0)};
  });
  const checkpoints=[...new Set([0,plan.duration,...events.map(e=>e.at),...stops.map(s=>s.time),...(scene.checkpoints||[]).map(plan.timeOf)])].filter(Number.isFinite).sort((a,b)=>a-b);
  const captions=[...(scene.captions||[]).map(([at,caption])=>[plan.timeOf(at),caption]),
    ...events.filter(e=>e.caption).map(e=>[e.at,e.caption]),...stops.filter(s=>s.caption).map(s=>[s.time,s.caption])].sort((a,b)=>a[0]-b[0]);

  function snapshot(time) {
    time=clamp(time,0,plan.duration);
    const logicalTime=plan.logicalTime(time);
    const edgeStates=records.map(r=>{
      const state=connectionState(time,r.start,r.end,r.events,r.connectDuration);
      return {...state,id:r.id,from:r.a.id,to:r.b.id,points:r.points||geometry(r.a,r.b),visible:!r.internal&&time>=r.start&&!state.done,
        progress:1-Math.abs(state.offset)};
    });
    const stateByEdge=new Map(edgeStates.map(e=>[e.id,e]));
    const tokens=[];
    for(const r of records) for(const e of r.events) if(!r.internal&&time>=e.at && time<e.arrival) {
      const points=r.points||geometry(r.a,r.b);
      const [x,y]=pointAt(points,(time-e.at)/(e.arrival-e.at));
      tokens.push({x,y,value:e.value,color:e.color||'a',edge:r.id,phase:e.phase||'travel'});
    }
    for(const e of graph.tokens||[]) if(time>=e.at&&time<e.until)tokens.push({...e});
    const nodeStates=nodes.map(n=>{
      const r=row(n),outgoing=records.filter(e=>e.a.id===n.id),incoming=records.filter(e=>e.b.id===n.id);
      const emitted=outgoing.flatMap(e=>e.events.filter(v=>v.at<=time).map(v=>v.logicalAt));
      const received=incoming.flatMap(e=>e.events.filter(v=>v.arrival<=time).map(v=>v.logicalAt));
      const t=Math.max(logicalTime,...emitted,...received);
      const work=n.timer?r.spans.filter(p=>p.kind==='window'):workSpans(r),span=work.find(p=>p.start<=t&&p.end>t)||work.filter(p=>p.start<=t).at(-1);
      const workEdge=outgoing.find(e=>e.gateWork||n.work);
      const lifecycle=workEdge?.end;
      const canceled=lifecycle?.kind==='unsubscribe'&&time>=lifecycle.at || (!workEdge&&span?.kind==='cancel'&&t>=span.end);
      const started=workEdge?time>=workEdge.start+(workEdge.connectDuration||transitionDuration):span&&t>=span.start;
      const active=Boolean(span&&started&&!canceled&&t<span.end);
      const queued=r.spans.some(p=>p.kind==='queue'&&p.start<=t&&t<p.end)||
        Boolean(n.createdBy&&n.inner&&time>=births.get(n.id)&&!started&&r.spans.some(p=>p.kind==='queue'));
      const completed=Boolean(r.completeAt!==undefined&&t>=r.completeAt);
      const errored=r.events.some(e=>e.kind==='error'&&e.at<=t)||span?.kind==='error'&&t>=span.end;
      const workState=canceled?'canceled':errored?'errored':completed?'completed':active?'active':queued?'queued':'idle';
      const terminalInput=incoming.filter(e=>e.end&&stateByEdge.get(e.id).done&&['complete','error'].includes(e.end.kind)).at(-1);
      const receiver=incoming.length>0&&!outgoing.length;
      const ownEnd=terminal(r);
      const notification=terminalInput&&(receiver||ownEnd&&terminalInput.end.logicalAt===ownEnd.at)?terminalInput.end.kind:null;
      const stateSpan=r.spans.find(p=>p.kind==='state'&&p.start<=t&&p.end>t);
      const detail=evaluate(n.detail,t);
      let status=notification?(notification==='complete'?'✓ complete':'× error'):detail;
      if(status===undefined)status=canceled?(n.cancelLabel||'odsubskrybowano'):errored?'× error':queued?'czeka w kolejce':stateSpan?.label||
        (active?(n.timer?'okno otwarte':'praca trwa'):completed?'complete':r.spans.some(p=>p.kind==='subscription'&&p.start<=t&&p.end>t)?'subskrybuje':'');
      const lastInput=incoming.flatMap(e=>e.events.filter(v=>v.arrival<=time)).sort((a,b)=>a.arrival-b.arrival).at(-1);
      if(n.showInput&&lastInput&&!status)status='wejście: '+lastInput.value;
      const activity=(graph.activities||[]).some(a=>a.node===n.id&&time>=a.at&&time<a.until);
      const transform=(graph.transforms||[]).find(a=>a.node===n.id&&time>=a.at&&time<a.until);
      const progress=span?clamp(((canceled?span.end:t)-span.start)/(span.duration||span.end-span.start)):0;
      const fill=notification?palette[notification]:queued||n.workRow&&!active&&!canceled&&!completed&&!errored?colors.muted:n.work||n.inner?palette.work:receiver?palette.observer:!incoming.length?palette.source:colors[n.color]||colors.op;
      return {...n,label:evaluate(n.label,t),visible:time>=births.get(n.id)&&(n.until===undefined||t<n.until),
        opacity:n.ready||n.instant?1:clamp((time-births.get(n.id))/fadeDuration),fill,status,notification,workState,
        active:activity||Boolean(transform),progress,showProgress:Boolean(span&&(active||canceled)),transform:transform?.label,
        disabled:evaluate(n.disabled,t)};
    });
    const histories=trays.map(q=>{
      const values=records.filter(e=>e.b.id===q.anchor).flatMap(e=>e.events.filter(v=>v.arrival<=time));
      // An explicit history at an operator can show its emitted values too.
      const delivered=values.length?values:records.filter(e=>e.a.id===q.anchor).flatMap(e=>e.events.filter(v=>v.at<=time));
      // Historia next zachowuje powtórzenia. Deduplikacja jest jawną cechą
      // wizualizacji Set, nigdy domyślną semantyką strumienia.
      const valuesToShow=q.deduplicate?[...new Map(delivered.map(v=>[v.value,v])).values()]:delivered;
      return {...q,values:valuesToShow.sort((a,b)=>a.arrival-b.arrival)};
    });
    return {id:scene.id,title:scene.title,width,height,time,logicalTime,nodes:nodeStates,edges:edgeStates,tokens,histories,
      panels:graph.panels||[],cards:scene.kind==='cards'?scene.items:[],caption:captionAt(captions,time),
      metrics:(scene.metrics||[]).map(m=>({label:m.label,value:m.value(logicalTime)})),
      queue:graph.queue?evaluate(graph.queue,logicalTime):null};
  }
  return {duration:plan.duration,stops,checkpoints,events,plan,snapshot};
}

// Jawne tempo ilustracji jest danymi, przydatnymi np. w synchronicznej transformacji.
// Format wyniku jest identyczny jak planFlow; nie ma drugiego renderera ani zegara.
function scheduledPlan(graph,edges,duration) {
  const records=new Map(edges.map(e=>[e.id,{...e,...graph.schedule[e.id],events:(graph.schedule[e.id]?.events||[]).map(v=>({...v,logicalAt:v.logicalAt??v.at}))}]));
  return {records,births:new Map(),batches:[],duration,logicalTime:t=>t,timeOf:t=>t};
}

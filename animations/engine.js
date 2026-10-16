import { catalogGraph } from './graph-presets.js';
import { prepareExecutions, executionSnapshot } from './execution-state.js';
import { innerWorkPanelSnapshot } from './inner-work-panel.js';
import { layoutDiagram, stretchGraph, terminal, connectionState, palette, transitionDuration } from './lifecycle.js';
import { graphHeightFor, textScaleFor, labelScaleFor } from './format.js';
import { planFlow, fadeDuration } from './flow.js';
import { clamp, colors, geometry, pointAt } from './primitives.js';

const empty={events:[],spans:[]};
const evaluate=(value,time)=>typeof value==='function'?value(time):value;
const captionAt=(captions,time)=>(captions||[]).filter(c=>c[0]<=time).at(-1)?.[1]||'';
// Rosnący kafelek (laneSlots): góra i część definicji (defH) są stałe, wiersz wykonania slotu i leży pod nią (rowH na wiersz).
const laneY=(n,id)=>{
  if(n.laneSlots&&id in n.laneSlots)return n.top+n.defH+(n.laneSlots[id]+.5)*n.rowH;
  const i=(n.laneIds||[]).indexOf(id);return i<0?n.y:n.y+(n.laneTop||0)+i*(n.laneStep||0);
};
const rowGrowth=.35,dropDuration=.5,emitMove=.6;
const workSpans=row=>(row.spans||[]).filter(p=>!['queue','state','window','subscription'].includes(p.kind));

// Kompilacja wykonuje się raz. Cały graf (także niewidoczne inner) rezerwuje miejsca.
// rows i jawny graf kończą w tym samym planie; RAF nie uczestniczy w semantyce.
export function compileScene(scene) {
  const source=scene.graph ? (typeof scene.graph==='function'?scene.graph(scene):scene.graph) :
    scene.kind==='cards'?{nodes:[],edges:[],trays:[],width:1240,height:340}:catalogGraph(scene);
  // Format 4:3 daje wyższy diagram. Grafy z własnym profilem (formatAware) już go mają;
  // stałe układy rosną proporcjonalnie, automatyczne dostają wyższy obszar w layoutDiagram.
  const target=graphHeightFor(scene),fixed=source.layout==='fixed';
  const graph=target&&fixed&&!source.formatAware&&(source.height||340)<target?stretchGraph(source,target):source;
  const nodes=graph.nodes.map(n=>({w:230,h:70,ri:null,...n}));
  const nodeById=new Map(nodes.map(n=>[n.id,n]));
  const trays=(graph.trays||[]).map(q=>({...q}));
  const row=n=>n.lifecycleRow || (n.ri!==null?scene.rows[n.ri]:null) || empty;
  const width=graph.width||1240, height=target&&!fixed?target:graph.height||340;
  let edges=graph.edges.map(e=>({...e,events:(e.events||[]).map(v=>({...v})),a:nodeById.get(e.from||e.a.id),b:nodeById.get(e.to||e.b.id)}));
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
  // Tory subskrybentów: krawędź z subscriber łączy gniazda na wysokości toru (laneIds/laneTop/laneStep kafelka).
  for(const edge of edges) if(edge.subscriber&&!edge.points) {
    const sx=edge.a.x+edge.a.w/2,ex=edge.b.x-edge.b.w/2,mid=(sx+ex)/2,y1=laneY(edge.a,edge.subscriber),y2=laneY(edge.b,edge.subscriber);
    edge.points=[[sx,y1],[mid,y1],[mid,y2],[ex,y2]];
  }
  for(let i=0;i<edges.length;i++) for(const edge of edges) {
    const downstream=edges.filter(next=>next.a===edge.b&&!next.gateWork);
    if(downstream.length&&!edge.fixedStart)edge.logicalStart=Math.max(edge.logicalStart,Math.min(...downstream.map(e=>e.logicalStart)));
  }
  const executionDefinitions=prepareExecutions(graph.executions,edges);
  edges.forEach(e=>{e.events=e.events.filter(v=>v.at>=e.logicalStart&&(!e.logicalEnd || v.at<=e.logicalEnd.at)&&!(e.logicalEnd?.kind==='unsubscribe'&&v.at>=e.logicalEnd.at));});
  const plan=graph.schedule ? scheduledPlan(graph,edges,scene.duration,executionDefinitions) : planFlow(nodes,edges,scene.duration,scene.timing);
  const sourceTokens=(graph.tokens||[]).map(token=>{
    const value=token.modelTime?{...token,at:plan.timeOf(token.at),until:plan.timeOf(token.until)}:{...token};
    const execution=executionDefinitions.find(e=>e.id===token.execution);
    const end=plan.records.get(execution?.edge)?.end;
    return end?.kind==='unsubscribe'?{...value,until:Math.min(value.until,end.at)}:value;
  }).filter(token=>token.until>token.at);
  const explicitHistories=new Map(trays.filter(q=>q.events).map(q=>[q,q.events.map(value=>{
    const at=q.modelTime?(plan.receivedAt?.(q.anchor,value)??plan.timeOf(value.at)):value.at;
    return {...value,at,arrival:at,shownAt:at};
  })]));
  const records=[...plan.records.values()];
  records.forEach(r=>{r.connectDuration??=transitionDuration;});
  const births=new Map(nodes.map(n=>[n.id,n.ready?0:n.createdBy?
    plan.records.get(n.createdBy.edge)?.events.find(e=>e.value===n.createdBy.value)?.arrival??Infinity:
    n.createdAt!==undefined?plan.timeOf(n.createdAt):plan.births.get(n.id)??plan.timeOf(n.born||0)]));
  const events=[];
  const add=(type,at,data={})=>events.push({id:`${type}:${data.edge||data.node||'scene'}:${events.length}`,type,at,...data});
  nodes.forEach(n=>add(n.inner?'inner-create':'node-create',births.get(n.id),{node:n.id}));
  for(const r of records) {
    const execution=executionDefinitions.find(e=>e.edge===r.id)?.id;
    add('subscribe',r.start,{edge:r.id,node:r.b.id,logicalAt:r.logicalStart,...(execution?{execution}:{})});
    add(r.gateWork?'inner-subscribe':'connected',r.start+(r.connectDuration||transitionDuration),{edge:r.id,node:r.a.id,logicalAt:r.logicalStart,...(execution?{execution}:{})});
    for(const v of r.events) {
      add(r.a.inner?'inner-next':'source-next',v.at,{edge:r.id,node:r.a.id,value:v.value,logicalAt:v.logicalAt,...(v.execution?{execution:v.execution}:{})});
      add('value-travel',v.at,{edge:r.id,node:r.a.id,value:v.value,until:v.arrival,logicalAt:v.logicalAt,...(v.execution?{execution:v.execution}:{})});
      add('deliver-next',v.arrival,{edge:r.id,node:r.b.id,value:v.value,logicalAt:v.logicalAt,...(v.execution?{execution:v.execution}:{})});
    }
    if(r.end) {
      add(r.end.kind==='unsubscribe'?'inner-unsubscribe':r.end.kind==='error'?'stream-error':'stream-complete',r.end.at,{edge:r.id,node:r.a.id,logicalAt:r.end.logicalAt,...(execution?{execution}:{})});
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
  for(const transform of graph.transforms||[])add('operator-transform',transform.at,{node:transform.node,value:transform.label,until:transform.until,...(transform.logicalAt===undefined?{}:{logicalAt:transform.logicalAt})});
  for(const event of graph.timeline||[]) {
    const {at,event:selector,offset=0,last=false,...data}=event;
    const matches=selector?events.filter(e=>Object.entries(selector).every(([key,value])=>e[key]===value)):[];
    const selected=last?matches.at(-1):matches[0];
    const definition=executionDefinitions.find(e=>e.id===event.execution);
    const record=records.find(r=>r.id===definition?.edge);
    if(selector&&!selected&&record?.end?.kind==='unsubscribe')continue;
    const eventTime=(selector?selected?.at:graph.schedule?at:plan.timeOf(at))+offset;
    if(!Number.isFinite(eventTime))throw new Error(`${scene.id}: nierozwiązane zdarzenie ${event.type}`);
    if(record?.end?.kind==='unsubscribe'&&eventTime>=record.end.at)continue;
    add(event.type,eventTime,{...data,logicalAt:at??selected?.logicalAt??plan.logicalTime(eventTime)});
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
  // Wpis kodu może wskazać zdarzenie (jak postój) zamiast czasu ilustracji, np. dopisanie subscribe w chwili subskrypcji.
  const codeFrames=(scene.codeFrames||[]).map(frame=>{
    if(!frame.event)return frame;
    const match=events.find(e=>Object.entries(frame.event).every(([key,value])=>e[key]===value));
    if(!match)throw new Error(`${scene.id}: nierozwiązany wpis kodu`);
    return {...frame,at:match.at+(frame.offset||0)};
  }).sort((a,b)=>a.at-b.at);
  // codeLines (opcjonalne): kod jako linie fragmentów. Fragment może mieć mark (kolor klocka/toru), show (zdarzenie
  // pojawienia się, fade-in 0,3 s; miejsce jest zarezerwowane od READY) i active ([{from,to}] — selektory zdarzeń,
  // w których fragment świeci mocniej). Selektory działają jak w postojach; nierozwiązany jest błędem.
  const eventTime=(selector,label)=>{
    const {offset=0,last=false,...match}=selector;
    const matches=events.filter(e=>Object.entries(match).every(([key,value])=>e[key]===value)),found=last?matches.at(-1):matches[0];
    if(!found)throw new Error(`${scene.id}: nierozwiązany ${label}`);
    return found.at+offset;
  };
  const codeLines=(scene.codeLines||[]).map(line=>line.map(segment=>({...segment,
    shownAt:segment.show?eventTime(segment.show,'fragment kodu'):0,
    activeIntervals:(segment.active||[]).map(({from,to})=>[eventTime(from,'start wyróżnienia kodu'),eventTime(to,'koniec wyróżnienia kodu')])})));
  // graph.callouts: chwilowy napis zdarzenia (np. .subscribe() / .unsubscribe() z identyfikatorem toru) w przedziale
  // od zdarzenia from do zdarzenia to (selektory jak w postojach); fade-in 0,25 s, fade-out 0,3 s po końcu przedziału.
  const callouts=(graph.callouts||[]).map(callout=>({...callout,from:eventTime(callout.from,'początek napisu'),to:eventTime(callout.to,'koniec napisu')}));
  const codeReveals=codeFrames.flatMap((frame,i)=>{
    if(!frame.fadeIn)return [];
    const prefix=i?codeFrames[i-1].code:scene.code;
    if(!frame.code.startsWith(prefix)||!Number.isFinite(frame.fadeIn)||frame.fadeIn<=0)
      throw new Error(`${scene.id}: fadeIn kodu wymaga dopisania tekstu i dodatniego czasu`);
    return [{index:i,at:frame.at,duration:frame.fadeIn,prefix,suffix:frame.code.slice(prefix.length)}];
  });
  // Podpis chwili modelu pojawia się z jej pierwszym widocznym skutkiem: dotarciem wartości albo emisją operatora.
  // Sam wylot ze źródła tego nie zmienia; partia bez wartości (subskrypcja, terminal) zachowuje swój początek.
  const captionTime=at=>{
    const batch=plan.batches.find(b=>b.at===at);
    if(!batch)return plan.timeOf(at);
    const operator=id=>records.some(r=>r.b.id===id&&!r.internal);
    const effects=events.filter(e=>e.logicalAt===at&&e.at>=batch.start&&e.at<=batch.end&&
      (e.type==='deliver-next'||['source-next','inner-next'].includes(e.type)&&operator(e.node))).map(e=>e.at);
    return effects.length?Math.min(...effects):batch.start;
  };
  const captions=[...(scene.captions||[]).map(([at,caption])=>[captionTime(at),caption]),
    ...events.filter(e=>e.caption).map(e=>[e.at,e.caption]),...stops.filter(s=>s.caption).map(s=>[s.time,s.caption])].sort((a,b)=>a[0]-b[0]);

  // panel.showOn: panel (box) pojawia się przy pierwszym zdarzeniu pasującym do selektora, jak postój.
  const panelShownAt=(graph.panels||[]).map(panel=>{
    if(!panel.showOn)return panel.shownAt;
    const match=events.find(e=>Object.entries(panel.showOn).every(([key,value])=>e[key]===value));
    if(!match)throw new Error(`${scene.id}: nierozwiązane showOn panelu`);
    return match.at;
  });

  // Gniazda: kropka subskrybenta na prawej krawędzi nadawcy (po dotarciu subscribe) i lewej odbiorcy (od wysłania subscribe).
  // Znikają razem z połączeniem: complete/error najpierw u nadawcy, unsubscribe najpierw u odbiorcy.
  const subscriberColor=id=>graph.subscribers?.[id]?.color||colors.a;
  const laneRecords=records.filter(r=>r.subscriber&&!r.internal);
  const connectedAt=r=>r.start+(r.connectDuration||transitionDuration);
  const hideAt=r=>{
    if(!r.end)return {out:Infinity,in:Infinity};
    const duration=r.end.duration||transitionDuration;
    if(r.end.kind==='unsubscribe')return {in:r.end.at,out:r.end.at+duration};
    const finish=Math.max(r.end.at,...r.events.filter(e=>e.at<=r.end.at).map(e=>e.arrival));
    return {out:finish,in:finish+duration};
  };
  // Zakończony tor zostaje jako przygaszona historia: kabel i gniazda w kolorze toru z mniejszym kryciem.
  const trail=.35,laneAccent={complete:'#26804E',error:'#C54848'},laneIdle='#808890';
  const presence=(time,shown,hidden)=>Math.min(clamp((time-shown)/fadeDuration),1-(1-trail)*clamp((time-hidden)/fadeDuration));
  // Kabel toru: subscribe rysuje go od odbiorcy; complete/error przebiega krótkim impulsem w kolorze stanu do odbiorcy,
  // potem kabel wraca do koloru toru z mniejszym kryciem. Unsubscribe bez impulsu: kabel szarzeje i gaśnie.
  function laneEdgeState(r,time) {
    const color=subscriberColor(r.subscriber),width=graph.laneWire,base={id:r.id,from:r.a.id,to:r.b.id,subscriber:r.subscriber,
      points:r.points||geometry(r.a,r.b),visible:!r.internal&&time>=r.start,width};
    const subscribing=clamp((time-r.start)/(r.connectDuration||transitionDuration));
    if(!r.end||time<r.end.at)return {...base,phase:'subscribed',color,offset:-(1-subscribing),progress:subscribing,opacity:1};
    const duration=r.end.duration||transitionDuration;
    if(r.end.kind==='unsubscribe') {
      const p=clamp((time-r.end.at)/duration);
      // cancelPulse: szary pocisk „×” biegnie od odbiorcy do nadawcy; przebyta część kabla szarzeje za nim (grey),
      // a po dotarciu kabel przygasa jak zwykle po unsubscribe. Bez flagi zachowanie dotychczasowe.
      if(r.cancelPulse) {
        const points=base.points,[x,y]=pointAt(points,1-p),settled=clamp((time-r.end.at-duration)/fadeDuration);
        return {...base,phase:'unsubscribe',color:p>=1?laneIdle:color,offset:0,progress:1,opacity:1-(1-trail)*settled,done:p>=1,
          ...(p<1?{grey:p,cancel:{x,y}}:{})};
      }
      return {...base,phase:'unsubscribe',color:p>0?laneIdle:color,offset:0,progress:1,opacity:1-(1-trail)*p,done:p>=1};
    }
    const start=Math.max(r.end.at,...r.events.filter(e=>e.at<=r.end.at).map(e=>e.arrival)),p=clamp((time-start)/duration);
    return {...base,phase:r.end.kind,color,offset:0,progress:1,opacity:1-(1-trail)*clamp((time-start-duration)/fadeDuration),done:p>=1,
      ...(time>=start&&p<1?{pulse:{at:p,color:laneAccent[r.end.kind]||laneAccent.complete}}:{})};
  }
  function socketsOf(n,time) {
    return laneRecords.flatMap(r=>{
      const hidden=hideAt(r),side=r.a.id===n.id?'out':r.b.id===n.id?'in':null;
      if(!side)return [];
      const opacity=side==='out'?presence(time,connectedAt(r),hidden.out):presence(time,r.start,hidden.in);
      const idle=r.end?.kind==='unsubscribe'&&time>=(side==='out'?hidden.out:hidden.in);
      return opacity>0?[{side,subscriber:r.subscriber,edge:r.id,y:laneY(n,r.subscriber),color:idle?laneIdle:subscriberColor(r.subscriber),opacity,
        ...(graph.portRadius?{r:graph.portRadius}:{})}]:[];
    });
  }
  // Stan wykonania na torze (mały element w kafelku definicji): work — pasek i ikona producenta (np. HTTP),
  // operator — chip subskrypcji operatora, receiver — znaczek odbiorcy. Kafelek pozostaje definicją.
  // workUntil (czas modelu) zachowuje niedokończony pasek po anulowaniu.
  const laneStatus={running:'w trakcie',waiting:'podłączony, czeka na next',completed:'✓ complete',error:'× error',cancelled:'odsubskrybowano'};
  function laneStatesOf(n,time) {
    const ids=[...new Set(laneRecords.filter(r=>r.a.id===n.id||r.b.id===n.id).map(r=>r.subscriber))];
    return ids.flatMap(subscriber=>{
      const out=laneRecords.find(r=>r.a.id===n.id&&r.subscriber===subscriber),input=laneRecords.find(r=>r.b.id===n.id&&r.subscriber===subscriber);
      // Hub (np. share): wyjścia odbiorców to chipy subskrypcji, wspólne wejście pokazuje samo gniazdo.
      const hub=laneRecords.some(r=>r.a.id===n.id);
      const role=out&&n.workLanes?'work':out?'operator':hub?null:'receiver';
      if(!role)return [];
      const from=role==='receiver'?input.start:connectedAt(out);
      if(time<from)return [];
      let state='running',stoppedAt,since=from;
      if(role==='receiver') {
        const end=input.end,arrival=end&&(end.kind==='unsubscribe'?end.at:end.at+(end.duration||transitionDuration));
        if(end&&time>=arrival){state=end.kind==='complete'?'completed':end.kind==='error'?'error':'cancelled';since=arrival;}
      } else if(out.end&&time>=out.end.at+(out.end.kind==='unsubscribe'?out.end.duration||transitionDuration:0)) {
        // complete/error zmienia stan w chwili wysłania w dół; unsubscribe — po dotarciu od odbiorcy.
        since=out.end.at+(out.end.kind==='unsubscribe'?out.end.duration||transitionDuration:0);
        state=out.end.kind==='complete'?'completed':out.end.kind==='error'?'error':'cancelled';stoppedAt=out.end.at;
      }
      const lane={role,subscriber,label:graph.subscribers?.[subscriber]?.label??subscriber,y:laneY(n,subscriber),color:subscriberColor(subscriber),fill:graph.subscribers?.[subscriber]?.fill,
        progressFill:graph.subscribers?.[subscriber]?.progress??graph.subscribers?.[subscriber]?.fill,
        state,since,status:laneStatus[state==='running'&&role!=='work'?'waiting':state],opacity:clamp((time-from)/fadeDuration),
        ...(n.rowTint?{labelColor:graph.subscribers?.[subscriber]?.ink}:{})};
      if(role==='work') {
        // progressUntilNext: oczekiwanie kończy się z wysłaniem pierwszej wartości (odpowiedź HTTP), nie dopiero z complete.
        const firstNext=n.progressUntilNext?out.events[0]?.at:undefined;
        const to=out.workUntil!==undefined?plan.timeOf(out.workUntil):firstNext??out.end?.at??plan.duration;
        lane.progress=state==='completed'?1:clamp(((stoppedAt??time)-from)/Math.max(1e-9,to-from));
      }
      return [lane];
    });
  }

  // Wiersz wykonania rezerwuje miejsce, gdy subscribe wyrusza do kafelka (kabel trafia w gotowy wiersz);
  // stan toru wypełnia go po dotarciu. Wiersze zostają po zakończeniu, więc kafelek tylko rośnie.
  function laneRowsOf(n,time) {
    const rows=new Map();
    for(const r of laneRecords) if(r.a.id===n.id&&n.laneSlots?.[r.subscriber]!==undefined) {
      // Wiersz rozszerza kafelek tuż przed dotarciem subscribe i kończy wzrost razem z nim.
      const grow=Math.max(r.start,connectedAt(r)-rowGrowth);
      const slot=n.laneSlots[r.subscriber],growth=clamp((time-grow)/rowGrowth),eased=growth*growth*(3-2*growth);
      // Hub (np. share): lewy pasek wiersza ma kolor wspólnego upstreamu aktywnego w chwili dołączenia Subscribera.
      // Czas modelu: inicjator dołącza w tej samej chwili, w której share otwiera upstream (w ilustracji subscribe dociera do share wcześniej).
      const upstream=n.splitBalls&&n.upstreamStripe!==false&&laneRecords.find(u=>u.b.id===n.id&&u.subscriber!==r.subscriber&&u.logicalStart<=r.logicalStart&&(!u.end||(u.end.logicalAt??u.end.at)>r.logicalStart));
      if(eased>(rows.get(slot)?.growth??0))rows.set(slot,{slot,subscriber:r.subscriber,color:subscriberColor(r.subscriber),growth:eased,
        ...(upstream?{stripe:subscriberColor(upstream.subscriber)}:{}),...(n.rowTint?{tint:graph.subscribers?.[r.subscriber]?.tint}:{})});
    }
    return [...rows.values()].filter(row=>row.growth>0).sort((a,b)=>a.slot-b.slot)
      .map(row=>({...row,top:n.top+n.defH+row.slot*n.rowH,h:n.rowH}));
  }
  function growingTile(n,time) {
    // growRows: kafelek rośnie z wierszami; bez flagi (odbiorca) ma stałą wysokość i jeden wiersz pod nagłówkiem defH.
    if(!n.laneSlots||!n.growRows)return {};
    const rows=laneRowsOf(n,time),h=n.defH+rows.reduce((sum,row)=>sum+row.growth*n.rowH,0);
    return {y:n.top+h/2,h,labelOffset:-h/2+n.defH/2,laneRows:rows,defH:n.defH};
  }

  // Rozdzielenia w hubie: wejście wspólnego upstreamu → wyjścia z tą samą wartością (logicalAt), które wychodzą po nim.
  function splitsOf(n) {
    const left=n.x-n.w/2,right=n.x+n.w/2,x=left+n.w*(n.splitAt??.3);
    return laneRecords.filter(r=>r.b.id===n.id).flatMap(input=>input.events.map(e=>{
      const outputs=laneRecords.filter(r=>r.a.id===n.id).flatMap(out=>out.events.filter(v=>v.logicalAt===e.logicalAt&&v.at>=e.arrival)
        .map(v=>({value:v.value,color:v.color||'a',y:laneY(n,out.subscriber),at:v.at})));
      // node.buffer: ta sama wartość trafia też do kieszeni bufora (zapis równolegle z rozesłaniem).
      if(outputs.length&&n.buffer)outputs.push({value:e.value,color:e.color||'a',at:Math.min(...outputs.map(o=>o.at)),buffer:true});
      return outputs.length?{arrival:e.arrival,departure:Math.min(...outputs.map(o=>o.at)),value:e.value,color:e.color||'a',
        y:laneY(n,input.subscriber),left,right,x,outputs}:null;
    })).concat(emitsOf(n,left,right)).filter(Boolean);
  }
  // node.emits (opt-in, np. subject$.next(user)): wartość bez kabla wejścia pojawia się (fade-in) w środku wierszy kafelka
  // w chwili at i stamtąd rozdziela się na wyjścia z tym samym logicalAt — jedna emisja, kilka powiadomień next.
  function emitsOf(n,left,right) {
    const slots=Object.values(n.laneSlots||{}),y=n.top+n.defH+(slots.length?Math.max(...slots)+1:1)*n.rowH/2;
    return (n.emits||[]).map(e=>{
      const logicalAt=e.logicalAt??e.at;
      const outputs=laneRecords.filter(r=>r.a.id===n.id).flatMap(out=>out.events.filter(v=>v.logicalAt===logicalAt&&v.at>=e.at)
        .map(v=>({value:v.value,color:v.color||'a',y:laneY(n,out.subscriber),at:v.at})));
      return outputs.length?{arrival:e.at,departure:Math.min(...outputs.map(o=>o.at)),value:e.value,color:e.color||'a',
        y,left,right,x:n.x,outputs,emitted:true}:null;
    });
  }
  // Subtelne przerywane ścieżki rozdzielenia — widoczne tylko w trakcie rozdzielania, nie na stałe.
  function splitGuides(n,time) {
    return splitsOf(n).flatMap(split=>{
      if(time<split.arrival||time>=split.departure)return [];
      const p=(time-split.arrival)/(split.departure-split.arrival),opacity=Math.min(clamp(p/.15),clamp((1-p)/.15));
      return split.outputs.map(out=>({x1:split.x,y1:split.y,x2:split.right,y2:out.y,color:out.color,opacity}));
    });
  }

  // Kieszeń bufora (node.buffer, np. shareReplay): mały pod-kafelek tuż pod rosnącym kafelkiem operatora, zjeżdża razem
  // z jego wierszami. Zawiera ostatnie size wartości wejścia, zapisane w chwili rozesłania (split); kulka zostaje po odtworzeniu.
  function bufferOf(n,time) {
    const b=n.buffer,r=graph.ball?.r??29,pad=b.pad??8,h=b.h??2*r+2*pad,gap=b.gap??6;
    const bottom=n.top+n.defH+laneRowsOf(n,time).reduce((sum,row)=>sum+row.growth*n.rowH,0);
    const y=bottom+gap+h/2,ball={x:n.x+n.w/2-pad-r-(b.inset??10),y};
    const splits=splitsOf(n),inputs=laneRecords.filter(rec=>rec.b.id===n.id).flatMap(rec=>rec.events);
    const stored=inputs.map(e=>({value:e.value,color:e.color||'a',shownAt:splits.find(sp=>sp.value===e.value&&sp.arrival===e.arrival)?.departure??e.arrival}))
      .filter(v=>v.shownAt<=time).sort((a,b)=>a.shownAt-b.shownAt).slice(-(b.size||1));
    return {x:n.x,y,w:n.w,h,label:b.label??'bufor',ball,values:stored};
  }
  // Odtworzenia z bufora: wartości wyjścia z replayHold bez odpowiadającego wejścia (logicalAt) — kulka wyjeżdża z kieszeni.
  function replaysOf(n) {
    const inputs=laneRecords.filter(rec=>rec.b.id===n.id).flatMap(rec=>rec.events);
    return laneRecords.filter(rec=>rec.a.id===n.id&&rec.replayHold).flatMap(out=>out.events
      .filter(v=>!inputs.some(e=>e.logicalAt===v.logicalAt))
      .map(v=>({value:v.value,color:v.color||'a',start:v.at-Math.min(out.replayHold,n.buffer.move??.8),end:v.at,subscriber:out.subscriber})));
  }

  function snapshot(time) {
    time=clamp(time,0,plan.duration);
    const logicalTime=plan.logicalTime(time);
    const executionState=executionSnapshot(executionDefinitions,records,events,time,logicalTime,Boolean(graph.illustratedWork));
    const edgeStates=records.map(r=>{
      if(r.subscriber)return laneEdgeState(r,time);
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
    for(const e of sourceTokens) if(time>=e.at&&time<e.until)tokens.push({...e});
    // transformBalls: między dotarciem wartości do kafelka a wyjściem wyniku kulka wjeżdża do środka wiersza,
    // zatrzymuje się, zmienia wartość (krótki puls) i jedzie do portu wyjścia. Czas modelu stoi, to wyłącznie ilustracja.
    // splitBalls (hub, np. share): jedna kulka wspólnego upstreamu wjeżdża do punktu rozdzielenia, tam rozchodzi się
    // na osobne powiadomienia next — po jednej kulce z kolorem zdarzenia wyjścia — do wierszy i portów odbiorców.
    for(const n of nodes) if(n.splitBalls) for(const split of splitsOf(n)) {
      if(time<split.arrival||time>=split.departure)continue;
      const p=(time-split.arrival)/(split.departure-split.arrival),ease=u=>u*u*(3-2*u);
      if(split.emitted) {
        // Emisja w kafelku: kulka wchodzi fade-in i czeka w środku; ostatnie emitMove s przed wyjściem rozchodzi się do portów.
        const move=Math.min(emitMove,split.departure-split.arrival),start=split.departure-move;
        if(time<start)tokens.push({x:split.x,y:split.y,value:split.value,color:split.color,phase:'emit',opacity:clamp((time-split.arrival)/fadeDuration)});
        else for(const out of split.outputs) {
          const u=ease((time-start)/move);
          tokens.push({x:split.x+(split.right-split.x)*u,y:split.y+(out.y-split.y)*u,value:out.value,color:out.color,phase:'split-out',
            scale:1+.15*Math.max(0,1-(time-start)/move/.15)});
        }
        continue;
      }
      if(p<.4)tokens.push({x:split.left+(split.x-split.left)*ease(p/.4),y:split.y,value:split.value,color:split.color,phase:'split-in'});
      else for(const out of split.outputs) {
        // Wyjście do bufora jedzie do kulki w kieszeni pod kafelkiem, pozostałe — do portów wyjść.
        const target=out.buffer?bufferOf(n,time).ball:{x:split.right,y:out.y},u=ease((p-.4)/.6);
        tokens.push({x:split.x+(target.x-split.x)*u,y:split.y+(target.y-split.y)*u,
          value:out.value,color:out.color,phase:out.buffer?'buffer-in':'split-out',scale:1+.15*Math.max(0,1-Math.abs(p-.4)/.08)});
      }
    }
    // dropBalls (hub, np. Subject bez odbiorców): wartość, której nikt nie odbiera, kurczy się i gaśnie na porcie wejścia.
    for(const n of nodes) if(n.dropBalls) for(const input of laneRecords.filter(r=>r.b.id===n.id)) for(const e of input.events) {
      if(time<e.arrival||time>=e.arrival+dropDuration)continue;
      if(laneRecords.some(out=>out.a.id===n.id&&out.events.some(v=>v.logicalAt===e.logicalAt&&v.at>=e.arrival)))continue;
      const p=(time-e.arrival)/dropDuration;
      tokens.push({x:n.x-n.w/2,y:laneY(n,input.subscriber),value:e.value,color:e.color||'a',phase:'drop',opacity:1-p,scale:1-.4*p});
    }
    for(const n of nodes) if(n.buffer) for(const replay of replaysOf(n)) {
      if(time<replay.start||time>=replay.end)continue;
      const from=bufferOf(n,time).ball,u=(time-replay.start)/(replay.end-replay.start),e=u*u*(3-2*u);
      tokens.push({x:from.x+(n.x+n.w/2-from.x)*e,y:from.y+(laneY(n,replay.subscriber)-from.y)*e,value:replay.value,color:replay.color,
        phase:'replay',scale:1+.15*Math.max(0,1-u/.15)});
    }
    for(const n of nodes) if(n.transformBalls) for(const input of laneRecords.filter(r=>r.b.id===n.id)) {
      const output=laneRecords.find(r=>r.a.id===n.id&&r.subscriber===input.subscriber);
      for(const e of output?input.events:[]) {
        const v=output.events.find(o=>o.logicalAt===e.logicalAt&&o.at>=e.arrival);
        if(!v||time<e.arrival||time>=v.at)continue;
        const p=(time-e.arrival)/(v.at-e.arrival),ease=u=>u*u*(3-2*u),left=n.x-n.w/2,right=n.x+n.w/2;
        const x=p<.3?left+(n.x-left)*ease(p/.3):p<.7?n.x:n.x+(right-n.x)*ease((p-.7)/.3),changed=p>=.5;
        tokens.push({x,y:laneY(n,input.subscriber),value:changed?v.value:e.value,color:changed?v.color||'a':e.color||'a',
          phase:'transform',scale:1+.2*Math.max(0,1-Math.abs(p-.5)/.12)});
      }
    }
    const nodeStates=nodes.map(n=>{
      const r=row(n),outgoing=records.filter(e=>e.a.id===n.id),incoming=records.filter(e=>e.b.id===n.id);
      const emitted=outgoing.flatMap(e=>e.events.filter(v=>v.at<=time).map(v=>v.logicalAt));
      const received=incoming.flatMap(e=>e.events.filter(v=>v.arrival<=time).map(v=>v.logicalAt));
      const t=Math.max(logicalTime,...emitted,...received);
      const work=n.timer?r.spans.filter(p=>p.kind==='window'):workSpans(r),span=work.find(p=>p.start<=t&&p.end>t)||work.filter(p=>p.start<=t).at(-1);
      const workEdge=outgoing.find(e=>e.gateWork||n.work);
      const lifecycle=workEdge?.end;
      const canceled=lifecycle?.kind==='unsubscribe'&&time>=lifecycle.at || (!workEdge&&span?.kind==='cancel'&&t>=span.end);
      // Okno czasowe (timer) liczy się dopiero od zestawionej subskrypcji, nie od READY.
      const touching=records.filter(e=>(e.a.id===n.id||e.b.id===n.id)&&!e.internal);
      const connected=!touching.length||touching.some(e=>time>=e.start+(e.connectDuration||transitionDuration));
      const started=workEdge?time>=workEdge.start+(workEdge.connectDuration||transitionDuration):span&&t>=span.start&&(!n.timer||connected);
      // Terminal w czasie ilustracji: nadawca pokazuje complete/error w chwili wysłania, odbiorca po dotarciu.
      // Czas modelu stoi podczas partii, więc bez tego stan wyprzedzałby ostatnią wartość albo spóźniał się za błędem.
      const terminalTime=kind=>{
        const sent=outgoing.filter(e=>e.end?.kind===kind).map(e=>e.end.at);
        if(sent.length||outgoing.length)return sent.length?Math.min(...sent):undefined;
        const got=incoming.filter(e=>e.end?.kind===kind).map(e=>e.end.at+(e.end.duration||transitionDuration));
        return got.length?Math.min(...got):undefined;
      };
      const completeTime=terminalTime('complete'),errorTime=terminalTime('error');
      const completed=Boolean(r.completeAt!==undefined&&(completeTime!==undefined?time>=completeTime:t>=r.completeAt));
      const errored=errorTime!==undefined?time>=errorTime:r.events.some(e=>e.kind==='error'&&e.at<=t)||span?.kind==='error'&&t>=span.end;
      const active=Boolean(span&&started&&!canceled&&!completed&&!errored&&t<span.end);
      const queued=r.spans.some(p=>p.kind==='queue'&&p.start<=t&&t<p.end)||
        Boolean(n.createdBy&&n.inner&&time>=births.get(n.id)&&!started&&r.spans.some(p=>p.kind==='queue'));
      const workState=canceled?'canceled':errored?'errored':completed?'completed':active?'active':queued?'queued':'idle';
      const terminalInput=incoming.filter(e=>e.end&&stateByEdge.get(e.id).done&&['complete','error'].includes(e.end.kind)).at(-1);
      const receiver=incoming.length>0&&!outgoing.length;
      const ownEnd=terminal(r);
      // Jawne powiązanie kafelka z własnym terminalem wyjścia, niezależne od operatora.
      const declaredEnd=records.find(edge=>edge.id===n.terminalEdge)?.end;
      const ownNotification=declaredEnd&&time>=declaredEnd.at&&['complete','error'].includes(declaredEnd.kind)?declaredEnd.kind:null;
      const notification=n.terminalEdge?ownNotification:terminalInput&&(receiver||ownEnd&&terminalInput.end.logicalAt===ownEnd.at)?terminalInput.end.kind:null;
      const stateSpan=r.spans.find(p=>p.kind==='state'&&p.start<=t&&p.end>t);
      const detail=evaluate(n.detail,t);
      // „subskrybuje” tylko przy narysowanym połączeniu: nie przed jego zestawieniem i nie po rozpoczęciu unsubscribe.
      const wires=incoming.filter(e=>!e.internal);
      const wired=!wires.length||wires.some(e=>time>=e.start+(e.connectDuration||transitionDuration)&&!(e.end&&time>=e.end.at));
      const subscribed=wired&&r.spans.some(p=>p.kind==='subscription'&&p.start<=t&&p.end>t);
      let status=notification&&!n.terminalBadge?(notification==='complete'?'✓ complete':'× error'):detail;
      if(status===undefined)status=canceled?(n.cancelLabel||'odsubskrybowano'):errored?'× error':queued?'czeka w kolejce':stateSpan?.label||
        (active?(n.timer?'okno otwarte':'praca trwa'):completed?'complete':graph.illustratedWork&&workEdge&&!started||subscribed?'subskrybuje':'');
      const lastInput=incoming.flatMap(e=>e.events.filter(v=>v.arrival<=time)).sort((a,b)=>a.arrival-b.arrival).at(-1);
      if(n.showInput&&lastInput&&!status)status='wejście: '+lastInput.value;
      const activity=(graph.activities||[]).some(a=>a.node===n.id&&time>=a.at&&time<a.until);
      const transform=(graph.transforms||[]).find(a=>a.node===n.id&&time>=a.at&&time<(a.displayUntil??a.until));
      // illustratedWork: pasek biegnie w czasie ilustracji, nie staje na przelot wartości i kończy się razem z pracą.
      let progress=0;
      if(span&&!graph.illustratedWork)progress=clamp(((canceled?span.end:t)-span.start)/(span.duration||span.end-span.start));
      else if(span) {
        // share < 1 zachowuje niedokończony pasek pracy anulowanej przed czasem.
        const share=(span.end-span.start)/(span.duration||span.end-span.start);
        const from=Math.max(plan.timeOf(span.start),workEdge?workEdge.start+(workEdge.connectDuration||transitionDuration):-Infinity);
        const to=lifecycle?lifecycle.at:plan.timeOf(span.end);
        if(canceled||completed||t>=span.end)progress=clamp(share);
        else if(to>from)progress=clamp((time-from)/(to-from))*share;
        else progress=clamp((t-span.start)/(span.end-span.start))*share;
      }
      const fill=notification&&!n.terminalBadge?palette[notification]:n.headerFill?n.headerFill:n.subscriber&&graph.subscribers?.[n.subscriber]?graph.subscribers[n.subscriber].tile||graph.subscribers[n.subscriber].fill||subscriberColor(n.subscriber):queued||n.workRow&&!active&&!canceled&&!completed&&!errored?colors.muted:n.work||n.inner?palette.work:receiver?palette.observer:!incoming.length?palette.source:colors[n.color]||colors.op;
      return {...n,label:evaluate(n.label,t),visible:time>=births.get(n.id)&&(n.until===undefined||t<n.until),
        opacity:n.ready||n.instant?1:clamp((time-births.get(n.id))/fadeDuration),fill,status,notification,workState,
        active:activity||Boolean(transform&&time<transform.until),progress,showProgress:Boolean(span&&(active||canceled)),transform:transform?.label,
        disabled:evaluate(n.disabled,t),
        ...(laneRecords.length?{socketDots:socketsOf(n,time),laneStates:laneStatesOf(n,time),...growingTile(n,time),
          ...(n.subscriber?{laneColor:subscriberColor(n.subscriber),...(n.rowTint?{laneTint:graph.subscribers?.[n.subscriber]?.tint}:{})}:{}),
          ...(n.splitBalls?{splitGuides:n.splitGuides===false?[]:splitGuides(n,time)}:{}),
          ...(n.buffer?{bufferPocket:bufferOf(n,time)}:{})}:{})};
    });
    const histories=trays.map(q=>{
      const values=records.filter(e=>e.b.id===q.anchor).flatMap(e=>e.events.filter(v=>v.arrival<=time));
      // An explicit history at an operator can show its emitted values too.
      const emitted=values.length?[]:records.filter(e=>e.a.id===q.anchor).flatMap(e=>e.events.filter(v=>v.at<=time));
      // shownAt: chwila pojawienia się w historii (dotarcie albo emisja), dla fade-in w rendererze.
      const delivered=explicitHistories.has(q)?explicitHistories.get(q).filter(v=>v.at<=time):
        values.length?values.map(v=>({...v,shownAt:v.arrival})):emitted.map(v=>({...v,shownAt:v.at}));
      // Historia next zachowuje powtórzenia. Deduplikacja jest jawną cechą
      // wizualizacji Set, nigdy domyślną semantyką strumienia.
      const valuesToShow=q.deduplicate?[...new Map(delivered.map(v=>[v.value,v])).values()]:delivered;
      const ordered=valuesToShow.sort((a,b)=>a.arrival-b.arrival);
      // Kulki: tylko max widocznych i jedna wypadająca — snapshot nie rośnie z liczbą emisji.
      return {...q,values:q.balls&&q.max?ordered.slice(-(q.max+1)):ordered};
    });
    const codeIndex=codeFrames.findLastIndex(frame=>frame.at<=time);
    const reveal=codeReveals.find(frame=>frame.index===codeIndex)||codeReveals.find(frame=>frame.index===codeIndex+1);
    return {id:scene.id,title:scene.title,code:codeFrames.filter(frame=>frame.at<=time).at(-1)?.code??scene.code,
      ...(reveal?{codeReveal:{prefix:reveal.prefix,suffix:reveal.suffix,opacity:clamp((time-reveal.at)/reveal.duration)}}:{}),
      ...(codeLines.length?{codeView:codeLines.map(line=>line.map(({text,mark,shownAt,activeIntervals})=>({text,mark,
        opacity:shownAt?clamp((time-shownAt)/fadeDuration):1,active:activeIntervals.some(([from,to])=>time>=from&&time<to)})))}:{}),
      width,height,textScale:graph.textScale??textScaleFor(scene),labelScale:graph.labelScale??labelScaleFor(scene),time,logicalTime,nodes:nodeStates,edges:edgeStates,tokens,histories,
      panels:(graph.panels||[]).map((panel,i)=>panelShownAt[i]===undefined?panel:{...panel,shownAt:panelShownAt[i],visible:time>=panelShownAt[i]}),cards:scene.kind==='cards'?scene.items:[],caption:captionAt(captions,time),
      ...(graph.ball?{ball:graph.ball}:{}),
      ...(callouts.length?{callouts:callouts.flatMap(callout=>{
        const opacity=Math.min(clamp((time-callout.from)/.25),1-clamp((time-callout.to)/.3));
        if(time<callout.from||opacity<=0)return [];
        const subscriber=graph.subscribers?.[callout.subscriber]||{};
        return [{text:callout.text,label:callout.label??callout.subscriber,x:callout.x??width/2,y:callout.y,size:callout.size,opacity,
          color:subscriber.color||colors.a,ink:subscriber.ink||subscriber.color||'#26323B',fill:subscriber.tint||'#fff'}];
      })}:{}),
      ...executionState,
      ...((graph.panels||[]).some(p=>p.innerWork)?{innerWorkPanels:graph.panels.filter(p=>p.innerWork).map(p=>innerWorkPanelSnapshot(p,records,births,time))}:{}),
      metrics:(scene.metrics||[]).map(m=>({label:m.label,value:m.count?executionState.executionCounts[m.count]:m.value(logicalTime)})),
      queue:graph.queue?evaluate(graph.queue,logicalTime):null};
  }
  return {duration:plan.duration,stops,checkpoints,events,plan,snapshot};
}

// Jawne tempo ilustracji jest danymi, przydatnymi np. w synchronicznej transformacji.
// Format wyniku jest identyczny jak planFlow; nie ma drugiego renderera ani zegara.
function scheduledPlan(graph,edges,duration,executions) {
  const records=new Map(edges.map(e=>{
    const execution=executions.find(x=>x.edge===e.id);
    const events=(graph.schedule[e.id]?.events||[]).map(v=>({...v,logicalAt:v.logicalAt??v.at,
      ...(v.execution||execution?{execution:v.execution||execution.id}:{})})).filter(v=>{
      const owner=executions.find(x=>x.id===v.execution);
      return !owner||owner.modelEnd?.kind!=='unsubscribe'||v.logicalAt<owner.modelEnd.at;
    });
    return [e.id,{...e,...graph.schedule[e.id],events}];
  }));
  return {records,births:new Map(),batches:[],duration,logicalTime:t=>t,timeOf:t=>t};
}

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
  const row=n.laneRows?.find(row=>row.subscriber===id);
  if(row)return row.top+row.h/2;
  if(n.laneSlots&&id in n.laneSlots)return n.top+n.defH+(n.laneSlots[id]+.5)*n.rowH;
  const i=(n.laneIds||[]).indexOf(id);return i<0?n.y:n.y+(n.laneTop||0)+i*(n.laneStep||0);
};
const rowGrowth=.35,dropDuration=.5,emitMove=.6,storeMove=.4;
const workSpans=row=>(row.spans||[]).filter(p=>!['queue','state','window','subscription'].includes(p.kind));

// Kompilacja wykonuje się raz. Cały graf (także niewidoczne inner) rezerwuje miejsca.
// rows i jawny graf kończą w tym samym planie; RAF nie uczestniczy w semantyce.
export function compileScene(scene) {
  if(scene.phases)return compilePhases(scene);
  const source=scene.graph ? (typeof scene.graph==='function'?scene.graph(scene):scene.graph) :
    scene.kind==='cards'?{nodes:[],edges:[],trays:[],width:1240,height:340}:null;
  if(!source)throw new Error(`${scene.id}: brak grafu sceny`);
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
    // Postój na końcu sceny (np. modelTime = scene.duration) nie może wypaść za nią przez błąd zaokrąglenia.
    time+=stop.offset||0;
    return {...stop,time:Math.abs(time-plan.duration)<1e-9?plan.duration:time};
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
  // pojawienia się, fade-in 0,3 s; miejsce jest zarezerwowane od READY), hide (zdarzenie zniknięcia, fade-out 0,3 s;
  // miejsce zostaje — np. średnik końca linii, gdy dopisujemy dalszy ciąg wywołania) i active ([{from,to}] — selektory
  // zdarzeń, w których fragment świeci mocniej). Selektory działają jak w postojach; nierozwiązany jest błędem.
  const eventTime=(selector,label)=>{
    const {offset=0,last=false,...match}=selector;
    const matches=events.filter(e=>Object.entries(match).every(([key,value])=>e[key]===value)),found=last?matches.at(-1):matches[0];
    if(!found)throw new Error(`${scene.id}: nierozwiązany ${label}`);
    return found.at+offset;
  };
  const fallbackTimes=new Map(nodes.filter(n=>n.laneFallback).map(n=>[n.id,
    {from:eventTime(n.laneFallback.from,'fallback'),to:eventTime(n.laneFallback.to,'fallback')}]));
  const codeLines=(scene.codeLines||[]).map(line=>line.map(segment=>({...segment,
    shownAt:segment.show?eventTime(segment.show,'fragment kodu'):0,
    ...(segment.hide?{hiddenAt:eventTime(segment.hide,'ukrycie fragmentu kodu')}:{}),
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
  const presence=(time,shown,hidden,endOpacity=trail)=>Math.min(clamp((time-shown)/fadeDuration),1-(1-endOpacity)*clamp((time-hidden)/fadeDuration));
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
    const opacity=r.hideAfterTerminal?1-p:1-(1-trail)*clamp((time-start-duration)/fadeDuration);
    return {...base,phase:r.end.kind,color,offset:0,progress:1,opacity,done:p>=1,
      ...(time>=start&&p<1?{pulse:{at:p,color:laneAccent[r.end.kind]||laneAccent.complete}}:{})};
  }
  function socketsOf(n,time) {
    return laneRecords.flatMap(r=>{
      const hidden=hideAt(r),side=r.a.id===n.id?'out':r.b.id===n.id?'in':null;
      if(!side)return [];
      const opacity=side==='out'?presence(time,connectedAt(r),hidden.out,r.hideAfterTerminal?0:trail):presence(time,r.start,hidden.in,r.hideAfterTerminal?0:trail);
      const idle=r.end?.kind==='unsubscribe'&&time>=(side==='out'?hidden.out:hidden.in);
      const points=r.points||geometry(r.a,r.b),y=side==='out'?points[0][1]:points.at(-1)[1];
      return opacity>0?[{side,subscriber:r.subscriber,edge:r.id,y,color:idle?laneIdle:subscriberColor(r.subscriber),opacity,
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
      // Kolejne subskrypcje tego samego źródła (np. retry) mogą używać wielu krawędzi tego samego toru.
      // Kafelek pokazuje najnowszą rozpoczętą, a wcześniejsze terminale pozostają historią na przewodach.
      const latest=items=>items.filter(r=>r.start<=time).sort((a,b)=>a.start-b.start).at(-1)||items[0];
      const out=latest(laneRecords.filter(r=>r.a.id===n.id&&r.subscriber===subscriber));
      const input=latest(laneRecords.filter(r=>r.b.id===n.id&&r.subscriber===subscriber));
      // Hub (np. share): wyjścia odbiorców to chipy subskrypcji, wspólne wejście pokazuje samo gniazdo.
      const hub=laneRecords.some(r=>r.a.id===n.id);
      const role=out&&n.workLanes?'work':out?'operator':hub?null:'receiver';
      if(!role)return [];
      const from=role==='receiver'?input.start:connectedAt(out);
      if(time<from)return [];
      let state='running',stoppedAt,since=from,statusAt;
      if(role==='receiver') {
        const end=input.end,arrival=end&&(end.kind==='unsubscribe'?end.at:end.at+(end.duration||transitionDuration));
        if(end&&time>=arrival){state=end.kind==='complete'?'completed':end.kind==='error'?'error':'cancelled';since=arrival;
          // Status tekstowy odbiorcy (laneTerminalText): po unsubscribe dopiero, gdy × dotrze do źródła.
          if(end.kind==='unsubscribe')statusAt=end.at+(end.duration||transitionDuration);}
      } else if(out.end&&time>=out.end.at+(out.end.kind==='unsubscribe'?out.end.duration||transitionDuration:0)) {
        // complete/error zmienia stan w chwili wysłania w dół; unsubscribe — po dotarciu od odbiorcy.
        since=out.end.at+(out.end.kind==='unsubscribe'?out.end.duration||transitionDuration:0);
        state=out.end.kind==='complete'?'completed':out.end.kind==='error'?'error':'cancelled';stoppedAt=out.end.at;
      }
      // teardownEdge (opt-in): operator przekazał błąd dalej, ale jego pierwotne wykonanie zamyka teardown wskazanej
      // krawędzi (np. switchMap przed zewnętrznym catchError) — wiersz trwa do odłączenia źródła i szarzeje bez czerwieni.
      const teardown=role!=='receiver'&&n.teardownEdge?laneRecords.find(r=>r.id===n.teardownEdge)?.end:null;
      if(teardown?.kind==='unsubscribe'){
        if(time>=teardown.at){state='cancelled';since=stoppedAt=teardown.at;}else{state='running';since=from;stoppedAt=undefined;}
      }
      const lane={role,subscriber,label:graph.subscribers?.[subscriber]?.label??subscriber,y:laneY(n,subscriber),color:subscriberColor(subscriber),fill:graph.subscribers?.[subscriber]?.fill,
        progressFill:graph.subscribers?.[subscriber]?.progress??graph.subscribers?.[subscriber]?.fill,
        state,since,...(statusAt===undefined?{}:{statusAt}),status:laneStatus[state==='running'&&role!=='work'?'waiting':state],opacity:clamp((time-from)/fadeDuration),
        ...(n.rowTint?{labelColor:graph.subscribers?.[subscriber]?.ink}:{})};
      // laneFallback (opt-in, np. catchError → of([])): chwilowa pigułka w wierszu operatora, fade-in i fade-out 0,3 s.
      const shown=fallbackTimes.get(n.id);
      if(role==='operator'&&shown&&time>=shown.from&&time<shown.to+fadeDuration)
        lane.fallback={label:n.laneFallback.label,opacity:Math.min(clamp((time-shown.from)/fadeDuration),1-clamp((time-shown.to)/fadeDuration))};
      if(role==='operator'&&n.memory)lane.memory=memoryOf(n,out,input,time);
      if(role==='operator'&&n.laneTimer)Object.assign(lane,timerOf(n,out,input,time));
      if(lane.timer&&state==='completed')Object.assign(lane.timer,{active:false,progress:1,text:'complete'});
      if(role==='work') {
        // progressUntilNext: oczekiwanie kończy się z wysłaniem pierwszej wartości (odpowiedź HTTP), nie dopiero z complete.
        const firstNext=n.progressUntilNext?out.events[0]?.at:undefined;
        const to=out.workUntil!==undefined?plan.timeOf(out.workUntil):firstNext??out.end?.at??plan.duration;
        // workStart (opt-in, czas ilustracji): praca rusza później niż zestawienie subskrypcji (np. osobny etap HTTP 05-zrodla-2).
        const begin=Math.max(from,out.workStart??from);
        lane.progress=state==='completed'?1:clamp(((stoppedAt??time)-begin)/Math.max(1e-9,to-begin));
      }
      return [lane];
    });
  }

  // memory (opt-in, np. distinctUntilChanged): pamięć osobna dla każdej subskrypcji operatora — ostatnia przepuszczona
  // wartość. Zmienia się w połowie przejścia przepuszczonej kulki przez wiersz; odrzucenie (wejście bez wyjścia) jej nie
  // zmienia, tylko zaznacza chwilę porównania (comparedAt = koniec decide). chars: najdłuższa wartość — szerokość slotu.
  // memory.ball (opt-in): pamięć jako zwykła kulka przy prawej krawędzi wiersza (memorySlot), bez ramki i etykiety;
  // zmienia się, gdy przepuszczona kulka (transformBalls) mija slot w drodze do portu wyjścia.
  function memoryOf(n,out,input,time) {
    const inputs=input?.events||[],slot=n.memory.ball?memorySlot(n):null;
    const updates=out.events.map(v=>{
      const e=inputs.find(i=>i.logicalAt===v.logicalAt&&i.arrival<=v.at);
      return {value:v.value,color:v.color||'a',at:!e?v.at:slot!==null?e.arrival+(v.at-e.arrival)*transformPassAt(n,slot):(e.arrival+v.at)/2};
    }).filter(u=>u.at<=time);
    const compared=inputs.filter(e=>!out.events.some(v=>v.logicalAt===e.logicalAt)).map(e=>e.arrival+(e.decide||0)).filter(at=>at<=time);
    const last=updates.at(-1);
    return {label:n.memory.label??'prev',empty:n.memory.empty??'—',chars:Math.max(1,...out.events.map(v=>String(v.value).length)),...(last?{value:last.value,color:last.color,since:last.at}:{}),
      ...(compared.length?{comparedAt:compared.at(-1)}:{}),...(slot!==null?{ball:true,x:slot}:{})};
  }
  // replayMemory: jedna wspólna pamięć huba (np. shareReplay(1)) — ostatnia wartość wejścia, zapisana, gdy kulka
  // wejścia dojedzie do slotu (storeMove), niezależnie od liczby odbiorców. Kulka stoi w wierszu wejścia (inputRow).
  function replayMemoryOf(n,time) {
    const input=laneRecords.find(r=>r.b.id===n.id),stored=(input?.events||[]).filter(e=>e.arrival+storeMove<=time).at(-1);
    const header=typeof n.replayMemory==='object'&&n.replayMemory.header;
    const x=n.replayMemory?.x??memorySlot(n),y=n.replayMemory?.y??(header?n.top+n.defH/2:input?laneY(n,input.subscriber):n.y);
    return {x,y,...(stored?{value:stored.value,color:stored.color||'a',since:stored.arrival+storeMove}:{})};
  }
  // inputMemories: kilka niezależnych slotów ostatniej wartości, przypisanych do konkretnych wejść operatora.
  // Sloty są częścią stanu operatora, nie osobnymi panelami ani emisjami. Nowa wartość zastępuje poprzednią po
  // krótkim dojeździe od portu wejściowego; źródłem prawdy pozostaje plan zdarzeń danej krawędzi.
  function inputMemoriesOf(n,time) {
    return (n.inputMemories||[]).map(slot=>{
      const input=records.find(r=>r.id===slot.edge),stored=(input?.events||[]).filter(e=>e.arrival+storeMove<=time).at(-1);
      return {...slot,...(stored?{value:stored.value,color:stored.color||'a',since:stored.arrival+storeMove}:{})};
    });
  }
  // Środek kulki pamięci: tuż przed portem wyjścia, w odległości jak kulka czekająca przy porcie.
  // memory.x (opt-in): stały środek kulki pamięci, np. gdy szeroka kapsułka (pill) nie mieści się przy porcie.
  function memorySlot(n){return n.memory?.x??n.laneTimer?.memoryX??n.x+n.w/2-(graph.ball?.r??25)-18;}
  // Ułamek przejazdu transformBalls, w którym kulka mija x: wyjazd od środka do prawej krawędzi w ostatnich 30%
  // (smoothstep), więc odwracamy smoothstep: u = 1/2 − sin(asin(1 − 2f)/3).
  function transformPassAt(n,x) {
    const f=clamp((x-n.x)/Math.max(1e-9,n.w/2));
    return .7+.3*(.5-Math.sin(Math.asin(1-2*f)/3));
  }
  // laneTimer (opt-in, np. debounceTime/auditTime): timer operatora w czasie modelu — stoi podczas przelotów, płynie między
  // zdarzeniami. Wejście liczy się od dotarcia do kafelka (czas ilustracji), okres i momenty w czasie modelu (logicalAt).
  // debounce: każde wejście zaczyna odliczanie od nowa; audit: pierwsze wejście bez otwartego okna otwiera okno, kolejne
  // tylko podmieniają zapamiętaną wartość. Po emisji (wyjście z logicalAt = koniec) operator nie trzyma wartości.
  function timerOf(n,out,input,time) {
    if(n.laneTimer.kind==='countdown') {
      const window=n.laneTimer.windows.find(({start,end})=>time>=start&&time<=end);
      const period=window ? window.end-window.start : 1;
      const remaining=window ? Math.max(0,window.end-time) : null;
      return {timer:{label:n.laneTimer.label,progress:window?clamp((time-window.start)/period):0,active:Boolean(window),
        text:window?`${n.laneTimer.label} ${remaining.toFixed(1).replace('.',',')} s`:'',since:window?.start}};
    }
    // timeScale: sekundy ilustracji przeliczone na sekundy modelu (np. 5×, prezentacja w ms).
    // Bez opcji pozostaje dotychczasowy zegar modelu, zatrzymywany na czas przelotów.
    const {kind,period,label,timeScale,unit,empty='—'}=n.laneTimer,scaled=timeScale!==undefined;
    const logical=scaled?time/timeScale:plan.logicalTime(time),startOf=e=>scaled?e.arrival/timeScale:e.logicalAt;
    const arrived=(input?.events||[]).filter(e=>e.arrival<=time);
    let open=null;
    for(const e of arrived){
      const start=startOf(e);
      if(kind==='debounce'||!open||start>=open.end)open={start,end:start+period,value:e.value,color:e.color||'a'};
      else Object.assign(open,{value:e.value,color:e.color||'a'});
    }
    const emitted=open&&out.events.some(v=>(scaled?v.at/timeScale:v.logicalAt)>=open.end-1e-9&&v.at<=time);
    const active=open&&!emitted&&logical<open.end+1e-9;
    const remaining=active?Math.max(0,open.end-logical):null;
    // ball (opt-in): wejście dojeżdża do kulki pamięci (storeMove), dopiero wtedy zastępuje poprzednią wartość.
    const ball=n.laneTimer.ball,stored=ball?arrived.filter(e=>e.arrival+storeMove<=time).at(-1):arrived.at(-1);
    const keep=active&&stored&&!out.events.some(v=>(scaled?v.at/timeScale:v.logicalAt)>=startOf(stored)&&v.at<=time);
    const remainingText=unit==='ms'?Math.round(remaining*1000)+' ms':remaining?.toFixed(1).replace('.',',')+' s';
    return {timer:{label,progress:active?clamp((logical-open.start)/period):0,active:Boolean(active),
      text:(label?label+': ':'')+(active?remainingText:empty),since:active?open.start:undefined},
      memory:{label:n.laneTimer.memory??'pamięć',empty:'—',...(ball?{ball:true,x:memorySlot(n)}:{}),
        ...(keep?{value:ball?stored.value:open.value,color:ball?stored.color||'a':open.color,since:stored.arrival+(ball?storeMove:0)}:{})}};
  }
  // Wiersz wykonania rezerwuje miejsce, gdy subscribe wyrusza do kafelka (kabel trafia w gotowy wiersz);
  // stan toru wypełnia go po dotarciu. Wiersze zostają po zakończeniu, więc kafelek tylko rośnie.
  function laneRowsOf(n,time) {
    const rows=new Map();
    // inputRow (opt-in, hub z jednym upstreamem, np. shareReplay): wiersz także dla subskrypcji wejścia (np. #1),
    // rośnie razem z nią; w nim stoi wspólna kulka pamięci huba (replayMemory).
    for(const r of laneRecords) if((r.a.id===n.id||n.inputRow&&r.b.id===n.id)&&n.laneSlots?.[r.subscriber]!==undefined) {
      // Wiersz rozszerza kafelek tuż przed dotarciem subscribe i kończy wzrost razem z nim. Wiersz wejścia (inputRow)
      // rośnie razem z pierwszym wierszem wyjścia — hub subskrybuje upstream w tej samej chwili, co pierwszy odbiorca.
      const growAt=x=>Math.max(x.start,connectedAt(x)-rowGrowth);
      const grow=r.b.id===n.id?Math.min(growAt(r),...laneRecords.filter(o=>o.a.id===n.id).map(growAt)):growAt(r);
      const slot=n.laneSlots[r.subscriber],growth=clamp((time-grow)/rowGrowth),eased=growth*growth*(3-2*growth);
      // Hub (np. share): lewy pasek wiersza ma kolor wspólnego upstreamu aktywnego w chwili dołączenia Subscribera.
      // Czas modelu: inicjator dołącza w tej samej chwili, w której share otwiera upstream (w ilustracji subscribe dociera do share wcześniej).
      const upstream=n.splitBalls&&n.upstreamStripe!==false&&laneRecords.find(u=>u.b.id===n.id&&u.subscriber!==r.subscriber&&u.logicalStart<=r.logicalStart&&(!u.end||(u.end.logicalAt??u.end.at)>r.logicalStart));
      if(eased>(rows.get(slot)?.growth??0))rows.set(slot,{slot,subscriber:r.subscriber,color:subscriberColor(r.subscriber),growth:eased,
        ...(r.b.id===n.id?{input:true,label:graph.subscribers?.[r.subscriber]?.label??r.subscriber}:{}),
        ...(upstream?{stripe:subscriberColor(upstream.subscriber)}:{}),...(n.rowTint?{tint:graph.subscribers?.[r.subscriber]?.tint}:{})});
    }
    return [...rows.values()].filter(row=>row.growth>0).sort((a,b)=>a.slot-b.slot)
      .map(row=>({...row,top:n.top+n.defH+row.slot*n.rowH,h:n.rowH}));
  }
  function growingTile(n,time) {
    // growRows: kafelek rośnie z wierszami; bez flagi (odbiorca) ma stałą wysokość i jeden wiersz pod nagłówkiem defH.
    if(!n.laneSlots||!n.growRows)return {};
    const rows=laneRowsOf(n,time),own=ownExecutionsOf(n,time);
    const h=n.defH+[...rows,...own].reduce((sum,row)=>sum+row.growth*n.rowH,0);
    return {y:n.top+h/2,h,labelOffset:-h/2+n.defH/2,laneRows:rows,defH:n.defH,...(own.length?{executionRows:own}:{})};
  }
  // ownExecutions (opt-in, np. from(promise)): wykonanie rozpoczęte jawnie, bez subskrypcji — operacja ruszyła już
  // przy tworzeniu Observable. Wiersz w stałym slocie (jak tory), postęp do settle, potem stan end.kind. Bez kabla,
  // portów i odbiorcy; rysuje go ten sam wiersz wykonania co executionStack, z opcjonalnymi tekstami stanów (status).
  function ownExecutionsOf(n,time) {
    const smooth=value=>value*value*(3-2*value);
    return (n.ownExecutions||[]).filter(x=>time>=x.start).map(x=>{
      const growth=smooth(clamp((time-x.start)/rowGrowth)),ended=x.end&&time>=x.end.at;
      const state=!ended?'running':x.end.kind==='complete'?'completed':x.end.kind==='error'?'error':'cancelled';
      const settle=x.settle??x.end?.at??plan.duration;
      return {id:x.id,rank:0,top:n.top+n.defH+x.slot*n.rowH,h:n.rowH*growth,growth,state,color:x.color,since:ended?x.end.at:x.start,
        progress:ended?1:clamp((time-x.start)/Math.max(1e-9,settle-x.start)),...(x.status?.[state]?{status:x.status[state]}:{})};
    });
  }

  // executionStack: kolejne wykonania jednego cold źródła pod wspólnym nagłówkiem. Najnowszy rekord zajmuje
  // pierwszy wiersz, a wcześniejsze terminale płynnie przesuwają się w dół. To historia subskrypcji źródła,
  // bez dodatkowych węzłów, odbiorców ani zegara; pozycje wynikają wyłącznie z czasu snapshotu.
  function executionStackOf(n,time) {
    if(!n.executionStack)return {};
    const shift=n.executionStack.shiftDuration??rowGrowth,smooth=value=>value*value*(3-2*value);
    const items=n.executionStack.items.map((item,index)=>({...item,index,record:records.find(r=>r.id===item.edge)}))
      .filter(item=>item.record&&time>=item.record.start);
    const revealed=item=>smooth(clamp((time-item.record.start)/shift));
    const rows=items.map(item=>{
      const r=item.record,growth=revealed(item);
      const rank=items.filter(other=>other.index>item.index).reduce((sum,other)=>sum+revealed(other),0);
      const connected=connectedAt(r),ended=r.end&&time>=r.end.at;
      const state=time<connected?'subscribing':!ended?'running':r.end.kind==='complete'?'completed':r.end.kind==='error'?'error':'cancelled';
      const stop=r.events[0]?.at??r.end?.at??plan.duration;
      const progress=time<connected?0:state==='completed'||state==='error'?1:clamp((time-connected)/Math.max(1e-9,stop-connected));
      return {id:item.id,edge:item.edge,rank,top:n.top+n.defH+rank*n.rowH,h:n.rowH*growth,growth,state,
        progress,color:item.color||subscriberColor(r.subscriber),since:ended?r.end.at:connected};
    });
    const h=n.defH+items.reduce((sum,item)=>sum+revealed(item)*n.rowH,0);
    return {y:n.top+h/2,h,labelOffset:-h/2+n.defH/2,defH:n.defH,laneRows:[],executionRows:rows};
  }

  // Rozdzielenia w hubie: wejście wspólnego upstreamu → wyjścia z tą samą wartością (logicalAt), które wychodzą po nim.
  function splitsOf(n) {
    const left=n.x-n.w/2,right=n.x+n.w/2,x=left+n.w*(n.splitAt??.3);
    return laneRecords.filter(r=>r.b.id===n.id).flatMap(input=>input.events.map(e=>{
      const outputs=laneRecords.filter(r=>r.a.id===n.id).flatMap(out=>out.events.filter(v=>v.logicalAt===e.logicalAt&&v.at>=e.arrival)
        .map(v=>({value:v.value,color:v.color||'a',y:laneY(n,out.subscriber),at:v.at})));
      // node.buffer: ta sama wartość trafia też do kieszeni bufora (zapis równolegle z rozesłaniem).
      if(outputs.length&&n.buffer)outputs.push({value:e.value,color:e.color||'a',at:Math.min(...outputs.map(o=>o.at)),buffer:true});
      // buffer.alone (opt-in, np. shareReplay bez odbiorców): wartość bez wyjść i tak wjeżdża do kieszeni po tylu sekundach.
      else if(n.buffer?.alone)outputs.push({value:e.value,color:e.color||'a',at:e.arrival+n.buffer.alone,buffer:true});
      return outputs.length?{arrival:e.arrival,departure:Math.min(...outputs.map(o=>o.at)),value:e.value,color:e.color||'a',
        y:laneY(n,input.subscriber),left,right,x,outputs}:null;
    })).concat(emitsOf(n,left,right)).filter(Boolean);
  }
  // node.emits (opt-in, np. subject$.next(user)): wartość bez kabla wejścia pojawia się (fade-in) w środku wierszy kafelka
  // w chwili at i stamtąd rozdziela się na wyjścia z tym samym logicalAt — jedna emisja, kilka powiadomień next.
  // Kulka czeka na wysokości wierszy odbiorców tej emisji (środek ich torów): przy jednym odbiorcy — w jego wierszu.
  function emitsOf(n,left,right) {
    return (n.emits||[]).map(e=>{
      const logicalAt=e.logicalAt??e.at;
      const outputs=laneRecords.filter(r=>r.a.id===n.id).flatMap(out=>out.events.filter(v=>v.logicalAt===logicalAt&&v.at>=e.at)
        .map(v=>({value:v.value,color:v.color||'a',y:laneY(n,out.subscriber),at:v.at})));
      // slot (opt-in): emisja startuje z konkretnego wiersza kafelka (np. wiersza wykonania), nie ze środka odbiorców.
      const y=e.slot!==undefined?n.top+n.defH+(e.slot+.5)*n.rowH:
        outputs.length?(Math.min(...outputs.map(o=>o.y))+Math.max(...outputs.map(o=>o.y)))/2:0;
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
    // clears (opt-in, np. shareReplay z refCount przy refCount = 0): od tej chwili wcześniejsze wartości znikają
    // (kurczą się i gasną jak wartość bez odbiorcy), kieszeń zostaje pusta do kolejnego zapisu.
    const clearOf=v=>(b.clears||[]).filter(at=>at>=v.shownAt).sort((x,y)=>x-y)[0];
    const stored=inputs.map(e=>({value:e.value,color:e.color||'a',shownAt:splits.find(sp=>sp.value===e.value&&sp.arrival===e.arrival)?.departure??e.arrival}))
      .filter(v=>v.shownAt<=time).flatMap(v=>{
        const cleared=clearOf(v);
        if(cleared===undefined||time<cleared)return [v];
        const p=(time-cleared)/dropDuration;
        return p<1?[{...v,opacity:1-p,scale:1-.4*p}]:[];
      }).sort((a,b)=>a.shownAt-b.shownAt).slice(-(b.size||1));
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
    // Wartość z decide (flow.js) czeka na porcie wejścia odbiorcy, aż operator pokaże reakcję; potem gaśnie.
    for(const r of records) for(const e of r.events) if(!r.internal&&!r.b.rejectBalls&&e.decide&&time>=e.arrival&&time<e.arrival+e.decide+fadeDuration) {
      const [x,y]=pointAt(r.points||geometry(r.a,r.b),1);
      tokens.push({x,y,value:e.value,color:e.color||'a',edge:r.id,phase:'decide',opacity:1-clamp((time-e.arrival-e.decide)/fadeDuration)});
    }
    // fade (opt-in): token wchodzi fade-in, a na końcu gaśnie jak wartość bez odbiorcy (krycie → 0, skala → 0,6).
    for(const e of sourceTokens) if(time>=e.at&&time<e.until) {
      const drop=e.fade?clamp((time-(e.until-dropDuration))/dropDuration):0;
      tokens.push(e.fade?{...e,opacity:Math.min(clamp((time-e.at)/fadeDuration),1-drop),scale:1-.4*drop}:{...e});
    }
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
    // rejectBalls (opt-in, np. distinctUntilChanged): wejście bez wyjścia o tym samym logicalAt wjeżdża do wiersza
    // (n.rejectAt·w), stoi do końca decide (pytanie, porównanie z pamięcią), potem kurczy się i gaśnie w wierszu.
    for(const n of nodes) if(n.rejectBalls) for(const input of laneRecords.filter(r=>r.b.id===n.id)) for(const e of input.events) {
      if(laneRecords.some(out=>out.a.id===n.id&&out.events.some(v=>v.logicalAt===e.logicalAt)))continue;
      const decided=e.arrival+(e.decide||0),left=n.x-n.w/2,x=left+n.w*(n.rejectAt??.5);
      if(time<e.arrival||time>=decided+dropDuration)continue;
      const enter=clamp((time-e.arrival)/Math.min(.5,Math.max(.001,decided-e.arrival))),u=enter*enter*(3-2*enter),drop=clamp((time-decided)/dropDuration);
      tokens.push({x:left+(x-left)*u,y:laneY(n,input.subscriber),value:e.value,color:e.color||'a',edge:input.id,phase:'reject',
        ...(drop>0?{opacity:1-drop,scale:1-.4*drop}:{})});
    }
    // laneTimer.ball (opt-in, np. debounceTime/auditTime): wejście wjeżdża przez wiersz do kulki pamięci przy prawej
    // krawędzi (storeMove) i tam staje się zapamiętaną wartością; wyjście rusza z portu przy emisji timera.
    for(const n of nodes) if(n.laneTimer?.ball||n.replayMemory) for(const input of laneRecords.filter(r=>r.b.id===n.id)) for(const e of input.events) {
      if(time<e.arrival||time>=e.arrival+storeMove)continue;
      const from=pointAt(input.points||geometry(input.a,input.b),1),memory=n.replayMemory?replayMemoryOf(n,time):null;
      const target=memory||{x:memorySlot(n),y:laneY(n,input.subscriber)},u=(time-e.arrival)/storeMove,ease=u*u*(3-2*u);
      tokens.push({x:from[0]+(target.x-from[0])*ease,y:from[1]+(target.y-from[1])*ease,value:e.value,color:e.color||'a',edge:input.id,phase:'store'});
    }
    for(const n of nodes) for(const slot of n.inputMemories||[]) {
      const input=records.find(r=>r.id===slot.edge);
      for(const e of input?.events||[]) {
        if(time<e.arrival||time>=e.arrival+storeMove)continue;
        const from=pointAt(input.points||geometry(input.a,input.b),1),u=(time-e.arrival)/storeMove,ease=u*u*(3-2*u);
        tokens.push({x:from[0]+(slot.x-from[0])*ease,y:from[1]+(slot.y-from[1])*ease,value:e.value,color:e.color||'a',edge:input.id,phase:'store'});
      }
    }
    // replayMemory (opt-in, hub np. shareReplay): każde powiadomienie wyjścia rusza z kulki pamięci do portu wyjścia
    // w ostatnich storeMove s przed wylotem — także odtworzenie ostatniej wartości dla późnego odbiorcy.
    for(const n of nodes) if(n.replayMemory) {
      const memory=replayMemoryOf(n,time);
      for(const out of laneRecords.filter(r=>r.a.id===n.id)) for(const e of out.events) {
        if(time<e.at-storeMove||time>=e.at)continue;
        const u=(time-(e.at-storeMove))/storeMove,ease=u*u*(3-2*u),y=laneY(n,out.subscriber),x1=n.x+n.w/2;
        tokens.push({x:memory.x+(x1-memory.x)*ease,y:memory.y+(y-memory.y)*ease,value:e.value,color:e.color||'a',edge:out.id,phase:'replay'});
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
      // teardownEdge: operator przekazał błąd dalej, ale sam kończy się teardown — bez czerwonego obrysu kafelka.
      const errored=n.executionStack?false:n.teardownEdge?false:errorTime!==undefined?time>=errorTime:r.events.some(e=>e.kind==='error'&&e.at<=t)||span?.kind==='error'&&t>=span.end;
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
        ...(laneRecords.length?{socketDots:socketsOf(n,time),laneStates:laneStatesOf(n,time),...growingTile(n,time),...executionStackOf(n,time),
          ...(n.subscriber?{laneColor:subscriberColor(n.subscriber),...(n.rowTint?{laneTint:graph.subscribers?.[n.subscriber]?.tint}:{})}:{}),
          ...(n.splitBalls?{splitGuides:n.splitGuides===false?[]:splitGuides(n,time)}:{}),
          ...(n.buffer?{bufferPocket:bufferOf(n,time)}:{}),...(n.replayMemory?{memoryBall:replayMemoryOf(n,time)}:{}),
          ...(n.inputMemories?{memoryBalls:inputMemoriesOf(n,time)}:{})}:{})};
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
      // field.error (opt-in): pole widoku po dotarciu error do swojego odbiorcy pokazuje komunikat błędu zamiast wartości.
      const failedAt=q.field?.error===undefined?undefined:Math.min(...records.filter(e=>e.b.id===q.anchor&&e.end?.kind==='error')
        .map(e=>e.end.at+(e.end.duration||transitionDuration)));
      return {...q,values:q.balls&&q.max?ordered.slice(-(q.max+1)):ordered,...(time>=failedAt?{failed:{shownAt:failedAt}}:{})};
    });
    const codeIndex=codeFrames.findLastIndex(frame=>frame.at<=time);
    const reveal=codeReveals.find(frame=>frame.index===codeIndex)||codeReveals.find(frame=>frame.index===codeIndex+1);
    return {id:scene.id,title:scene.title,code:codeFrames.filter(frame=>frame.at<=time).at(-1)?.code??scene.code,...(scene.codeSyntax?{codeSyntax:true}:{}),
      ...(reveal?{codeReveal:{prefix:reveal.prefix,suffix:reveal.suffix,opacity:clamp((time-reveal.at)/reveal.duration)}}:{}),
      ...(codeLines.length?{codeView:codeLines.map(line=>line.map(({text,mark,shownAt,hiddenAt,activeIntervals})=>({text:evaluate(text,time),mark,
        opacity:Math.min(shownAt?clamp((time-shownAt)/fadeDuration):1,hiddenAt===undefined?1:1-clamp((time-hiddenAt)/fadeDuration)),active:activeIntervals.some(([from,to])=>time>=from&&time<to)})))}:{}),
      width,height,textScale:graph.textScale??textScaleFor(scene),labelScale:graph.labelScale??labelScaleFor(scene),time,logicalTime,nodes:nodeStates,edges:edgeStates,tokens,histories,
      panels:(graph.panels||[]).map((panel,i)=>panelShownAt[i]===undefined?panel:{...panel,shownAt:panelShownAt[i],visible:time>=panelShownAt[i]}),cards:scene.kind==='cards'?scene.items:[],caption:captionAt(captions,time),
      ...(graph.ball?{ball:graph.ball}:{}),
      ...(graph.readouts?{readouts:graph.readouts.map(readout=>({...readout,value:evaluate(readout.value,time)}))}:{}),
      ...(graph.searchPanels?{searchPanels:graph.searchPanels.map(({state,...panel})=>({...panel,...evaluate(state,time)}))}:{}),
      // Wykres poziomy i duże liczby (opt-in): postęp odsłonięcia z jedynego zegara; długość paska = share % wspólnej skali 100.
      ...(graph.barCharts?{barCharts:graph.barCharts.map(chart=>{
        const grow=clamp((time-chart.from)/chart.duration);
        return {...chart,progress:1-(1-grow)**3,valuesOpacity:clamp((time-(chart.valuesFrom??chart.from))/(chart.valuesDuration??chart.duration))};
      })}:{}),
      ...(graph.bigStats?{bigStats:graph.bigStats.map(stat=>({...stat,opacity:clamp((time-stat.at)/stat.duration)}))}:{}),
      ...(callouts.length?{callouts:callouts.flatMap(callout=>{
        const opacity=Math.min(clamp((time-callout.from)/.25),1-clamp((time-callout.to)/.3));
        if(time<callout.from||opacity<=0)return [];
        const subscriber=graph.subscribers?.[callout.subscriber]||{};
        return [{text:callout.text,label:callout.label??callout.subscriber,x:callout.x??width/2,y:callout.y,size:callout.size,opacity,
          color:subscriber.color||colors.a,ink:subscriber.ink||subscriber.color||'#26323B',fill:subscriber.tint||'#fff'}];
      })}:{}),
      ...executionState,
      ...((graph.panels||[]).some(p=>p.innerWork)?{innerWorkPanels:graph.panels.filter(p=>p.innerWork).map(p=>innerWorkPanelSnapshot(p,records,births,time,logicalTime))}:{}),
      metrics:(scene.metrics||[]).map(m=>({label:m.label,value:m.count?executionState.executionCounts[m.count]:m.value(logicalTime)})),
      queue:graph.queue?evaluate(graph.queue,logicalTime):null};
  }
  return {duration:plan.duration,stops,checkpoints,events,plan,snapshot};
}

// scene.phases (opt-in): kolejne, niezależne stany jednego diagramu (np. from → defer) na wspólnej osi czasu.
// Każda faza jest pełną sceną (graph, code, rows, captions, metrics, duration) kompilowaną osobno; postoje sceny
// wskazują fazę (stop.scenePhase). Snapshot wybiera wyłącznie aktywną fazę, więc po przejściu nie zostaje żaden stan
// poprzedniej: tory, wykonania, historie i liczniki zaczynają od zera. snapshot.time pozostaje czasem fazy.
function compilePhases(scene) {
  const stops=scene.playback?.stops||[];
  for(const stop of stops)if(!scene.phases.some(phase=>phase.name===stop.scenePhase))throw new Error(`${scene.id}: postój ${stop.id} bez fazy`);
  let offset=0;
  const parts=scene.phases.map(({name,...phase})=>{
    const compiled=compileScene({...scene,...phase,id:scene.id,phases:undefined,checkpoints:phase.checkpoints||[],
      playback:{...scene.playback,stops:stops.filter(stop=>stop.scenePhase===name)}});
    const part={name,offset,compiled};offset=+(offset+compiled.duration).toFixed(6);return part;
  });
  const partAt=time=>parts.findLast(part=>time>=part.offset)||parts[0];
  const shift=(part,time)=>time+part.offset;
  const records=new Map(parts.flatMap(part=>[...part.compiled.plan.records].map(([id,r])=>[id,{...r,phase:part.name}])));
  return {duration:offset,
    stops:parts.flatMap(part=>part.compiled.stops.map(stop=>({...stop,time:shift(part,stop.time)}))),
    checkpoints:[...new Set(parts.flatMap(part=>[part.offset,...part.compiled.checkpoints.map(t=>shift(part,t))]).concat(offset))]
      .filter(t=>t>=0&&t<=offset).sort((a,b)=>a-b),
    events:parts.flatMap(part=>part.compiled.events.map(e=>({...e,id:`${part.name}:${e.id}`,at:shift(part,e.at),phase:part.name}))),
    plan:{duration:offset,records,phases:parts.map(part=>({name:part.name,offset:part.offset,duration:part.compiled.duration,plan:part.compiled.plan}))},
    snapshot(time){
      time=clamp(time,0,offset);
      const part=partAt(time);
      return {...part.compiled.snapshot(time-part.offset),phase:part.name,sceneTime:time};
    }};
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

import { transitionDuration, resolveTiming } from './lifecycle.js';

export const fadeDuration = 0.3;
export const handoffDuration = 0.15;

// Zatrzymujemy czas modelu na czas ilustracji przepływu. Dzięki temu opóźnienia
// rysowania nie zmieniają kolejności zdarzeń RxJS ani czasu pracy producenta.
export function planFlow(nodes, links, modelDuration, timingOverrides) {
  const timing=resolveTiming(timingOverrides);
  const travel=timing?.travel??transitionDuration;
  const terminalTravel=timing?.terminal??transitionDuration;
  const handoff=timing?0:handoffDuration;
  const gap=timing?.gap??handoffDuration;
  const records = new Map(links.map(e => [e.id, { ...e, events: [], start: Infinity, end: null }]));
  const births = new Map();
  const batches = [];
  const times = [...new Set(links.flatMap(e => [e.logicalStart,
    ...e.events.map(v=>v.at), ...(e.logicalEnd?[e.logicalEnd.at]:[])]))]
    .filter(t=>Number.isFinite(t)&&t>=0&&t<=modelDuration).sort((a,b)=>a-b);
  let clock = 0, model = 0;
  const incoming = n => links.filter(e=>e.b.id===n);
  const outgoing = n => links.filter(e=>e.a.id===n);
  function reveal(id, at) {
    if (births.has(id)) return 0;
    births.set(id, at);
    return timing&&nodes.find(n=>n.id===id)?.ready?0:fadeDuration;
  }
  for (const at of times) {
    const start = clock + at - model;
    let phase = start;
    const beginning = links.filter(e=>e.logicalStart===at);
    const values = links.filter(e=>e.events.some(v=>v.at===at));
    const ending = links.filter(e=>e.logicalEnd?.at===at);
    function subscribe(edges) {
      const pending = new Set(edges);
      const finished = new Map();
      const depth=(e,seen=new Set())=>{
        if(seen.has(e))throw new Error('Cyclic subscription flow');
        const next=new Set(seen).add(e);
        return 1+Math.max(0,...edges.filter(child=>child.a.id===e.b.id).map(child=>depth(child,next)));
      };
      const connectDuration=timing?timing.subscribe/Math.max(1,...edges.map(e=>depth(e))):transitionDuration;
      function connect(e) {
        if (finished.has(e)) return finished.get(e);
        pending.delete(e);
        // edge.preconnected: subskrypcja zestawiona przed READY (scena nie powtarza jej animacji); nie zajmuje czasu ilustracji.
        if (e.preconnected) {
          const record=records.get(e.id);
          record.connectDuration=e.connect??connectDuration;
          record.start=-1-record.connectDuration;
          for (const id of [e.a.id,e.b.id]) if (!births.has(id)) births.set(id,record.start);
          finished.set(e,phase);
          return phase;
        }
        const downstream = outgoing(e.b.id).filter(next=>pending.has(next)||finished.has(next));
        const ready = Math.max(phase,...downstream.map(connect));
        const fade = Math.max(reveal(e.b.id,ready),reveal(e.a.id,ready));
        const record=records.get(e.id);
        record.start=ready+fade;
        // edge.connect: własny czas zestawienia jednego połączenia (np. subscribe inner tempem kroku głównego toru).
        record.connectDuration=e.connect??connectDuration;
        const done=record.start+record.connectDuration;
        finished.set(e,done);
        return done;
      }
      const done=edges.map(connect);
      phase=Math.max(phase,...done);
    }
    // Inner utworzony przez wartość zaczyna się dopiero po dotarciu tej wartości.
    const gated=beginning.filter(e=>e.gateWork);
    subscribe(beginning.filter(e=>!e.gateWork));
    const valueEnds = new Map();
    function emit(e, visiting=new Set()) {
      if(valueEnds.has(e))return valueEnds.get(e);
      if(visiting.has(e))throw new Error('Cyclic value flow');
      const next=new Set(visiting).add(e);
      const dependencies=incoming(e.a.id).filter(parent=>values.includes(parent));
      dependencies.forEach(parent=>emit(parent,next));
      const record=records.get(e.id);
      let arrival=phase;
      e.events.filter(v=>v.at===at).forEach((v,i)=>{
        const upstream=dependencies.flatMap(parent=>records.get(parent.id).events.filter(p=>p.logicalAt===at));
        const matching=upstream.filter(p=>String(p.value)===String(v.value));
        // edge.hold: opcjonalny postój wartości w kafelku przed wyjściem tą krawędzią (np. rozdzielenie w share).
        const ready=Math.max(phase,...(matching.length?matching:upstream).map(p=>p.arrival+(timing&&String(p.value)!==String(v.value)?timing.transform:handoff)+(e.hold||0)));
        // edge.replayHold: wartość bez wejścia w tej partii (odtworzenie z bufora operatora) wychodzi po czasie wyjęcia z bufora.
        const replay=upstream.length?0:e.replayHold||0;
        const departure=Math.max(ready+replay,record.start+record.connectDuration+replay,i?arrival+gap:0);
        // Krawędź może mieć własny czas przelotu, np. krótki powrót wyniku inner do operatora.
        arrival=departure+(e.travel??travel);
        record.events.push({...v,logicalAt:v.at,at:departure,arrival});
      });
      valueEnds.set(e,arrival);
      return arrival;
    }
    phase=Math.max(phase,...values.map(e=>emit(e)));
    // Wartość z decide: po dotarciu czeka (czas ilustracji), zanim operator pokaże reakcję — miejsce na pytanie.
    phase=Math.max(phase,...values.flatMap(e=>records.get(e.id).events.filter(v=>v.logicalAt===at&&v.decide).map(v=>v.arrival+v.decide)));
    // Czytelny checkpoint: nowa wartość już dotarła, stara praca jeszcze trwa.
    // To wyłącznie handoff ilustracji, bez przesuwania czasu modelu. timing.valueTerminalGap (opt-in) wydłuża tę
    // przerwę, żeby dotarcie ostatniej wartości i terminal tej samej chwili modelu były osobnymi kadrami.
    if(values.length&&ending.length)phase+=timing?.valueTerminalGap??handoffDuration;
    const terminalEnds = new Map();
    function finish(e, visiting=new Set()) {
      if(terminalEnds.has(e))return terminalEnds.get(e);
      if(visiting.has(e))throw new Error('Cyclic terminal flow');
      const next=new Set(visiting).add(e);
      const cancelling=e.logicalEnd.kind==='unsubscribe';
      const dependencies=(cancelling?outgoing(e.b.id):incoming(e.a.id))
        .filter(parent=>ending.includes(parent)&&parent.logicalEnd.kind===e.logicalEnd.kind);
      // Operator odłącza źródło dopiero po otrzymaniu błędu z innego wejścia (np. inner w switchMap).
      if(cancelling)dependencies.push(...incoming(e.b.id).filter(parent=>parent!==e&&ending.includes(parent)&&parent.logicalEnd.kind==='error'));
      // timing.terminalGap (opt-in): terminal zależny od innego (np. complete outer po complete ostatniego inner)
      // rusza z przerwą po jego dotarciu, a nie w tej samej klatce.
      const gap=cancelling?0:timing?.terminalGap??0;
      const departure=Math.max(phase,...dependencies.map(parent=>finish(parent,next)+gap));
      // edge.terminal (opt-in): własny czas przelotu terminala tej krawędzi.
      const duration=e.terminal??terminalTravel;
      records.get(e.id).end={...e.logicalEnd,at:departure,logicalAt:e.logicalEnd.at,duration};
      const arrival=departure+duration;
      terminalEnds.set(e,arrival);
      return arrival;
    }
    phase=Math.max(phase,...ending.map(e=>finish(e)));
    subscribe(gated);
    batches.push({at,start,end:phase});
    clock=phase;model=at;
  }
  const duration=clock+modelDuration-model;
  function logicalTime(time) {
    let last={at:0,end:0};
    for(const batch of batches){
      if(time<batch.start)return last.at+time-last.end;
      if(time<batch.end)return Math.max(0,batch.at-0.000001);
      last=batch;
    }
    return Math.min(modelDuration,last.at+time-last.end);
  }
  function timeOf(at) {
    let offset=0;
    for(const batch of batches){
      if(batch.at===at)return batch.start;
      if(batch.at>at)break;
      offset=batch.end-batch.at;
    }
    return at+offset;
  }
  function receivedAt(id, event) {
    const matches=record=>record.events.filter(v=>v.logicalAt===event.at&&String(v.value)===String(event.value));
    const delivered=links.filter(e=>e.b.id===id).flatMap(e=>matches(records.get(e.id)).map(v=>v.arrival));
    if(delivered.length)return Math.max(...delivered);
    const emitted=links.filter(e=>e.a.id===id).flatMap(e=>matches(records.get(e.id)).map(v=>v.at));
    return emitted.length?Math.min(...emitted):timeOf(event.at);
  }
  return {records,births,batches,duration,logicalTime,timeOf,receivedAt};
}

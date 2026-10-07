import { transitionDuration } from './lifecycle.js';

export const fadeDuration = 0.3;
export const handoffDuration = 0.15;

// Zatrzymujemy czas modelu na czas ilustracji przepływu. Dzięki temu opóźnienia
// rysowania nie zmieniają kolejności zdarzeń RxJS ani czasu pracy producenta.
export function planFlow(nodes, links, modelDuration) {
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
    return fadeDuration;
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
      function connect(e) {
        if (finished.has(e)) return finished.get(e);
        pending.delete(e);
        const downstream = outgoing(e.b.id).filter(next=>pending.has(next)||finished.has(next));
        const ready = Math.max(phase,...downstream.map(connect));
        const fade = Math.max(reveal(e.b.id,ready),reveal(e.a.id,ready));
        const record=records.get(e.id);
        record.start=ready+fade;
        const done=record.start+transitionDuration;
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
      const ready=Math.max(phase,...dependencies.map(parent=>emit(parent,next)+(dependencies.length?handoffDuration:0)));
      const record=records.get(e.id);
      const departure=Math.max(ready,record.start+transitionDuration);
      const arrival=departure+transitionDuration;
      e.events.filter(v=>v.at===at).forEach(v=>record.events.push({...v,logicalAt:v.at,at:departure,arrival}));
      valueEnds.set(e,arrival);
      return arrival;
    }
    phase=Math.max(phase,...values.map(e=>emit(e)));
    const terminalEnds = new Map();
    function finish(e, visiting=new Set()) {
      if(terminalEnds.has(e))return terminalEnds.get(e);
      if(visiting.has(e))throw new Error('Cyclic terminal flow');
      const next=new Set(visiting).add(e);
      const cancelling=e.logicalEnd.kind==='unsubscribe';
      const dependencies=(cancelling?outgoing(e.b.id):incoming(e.a.id))
        .filter(parent=>ending.includes(parent)&&parent.logicalEnd.kind===e.logicalEnd.kind);
      const departure=Math.max(phase,...dependencies.map(parent=>finish(parent,next)));
      records.get(e.id).end={...e.logicalEnd,at:departure,logicalAt:e.logicalEnd.at};
      const arrival=departure+transitionDuration;
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

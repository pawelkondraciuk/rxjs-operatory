const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {modules}=require('./v2-harness.cjs');
async function family(){
 class Slide{
  constructor(id){this.id=id;this.dataset={animation:id};this.heading={};this.player={setAttribute(){}};}
  querySelector(s){return s==='h2'?this.heading:this.player;}
  cloneNode(){return new Slide(this.id);}
  after(){}
 }
 const slides=[...fs.readFileSync('index.html','utf8').matchAll(/data-animation="([^"]+)"/g)].map(m=>new Slide(m[1]));
 const m=await modules(['catalog','presentation','engine','renderer','prototype-scenes'],{document:{querySelectorAll:()=>slides}});
 return {scenes:m.presentation.prepareSlides(m.catalog.scenes),compile:m.engine.compileScene,render:m.renderer.renderScene,prototypes:m['prototype-scenes'].prototypeScenes};
}
const ids=['08-map-strumienie','09-concatmap','10-mergemap','11-switchmap','12-exhaustmap','12a-complete','12a-complete-2','13-limit'];
const history=(f,id)=>Array.from(f.histories.find(h=>h.anchor===id).values,e=>e.value);
test('HTTP slides share the accepted panel and retain native Reveal playback',async()=>{
 const {scenes,compile,prototypes}=await family();
 for(const [id,mode]of [['09-concatmap','concatMap'],['10-mergemap','mergeMap'],['11-switchmap','switchMap'],['12-exhaustmap','exhaustMap']]){
  const real=scenes.get(id),prototype={...prototypes.find(s=>s.id==='prototype-'+mode),format:real.format},c=compile(real),p=compile(prototype);
  assert.equal(c.snapshot(0).panels[0].frameless,true);
  assert.equal(p.snapshot(0).innerWorkPanels,undefined); // Prototypy pozostają przy poprzednich modelach.
  // Porównanie 09–12: te same A/B/C; pełna subskrypcja tylko w concatMap, odpowiedź na osobnym ręcznym postoju.
  const expected={concatMap:['A','B','C'],mergeMap:['B','A','C'],switchMap:['B','C'],exhaustMap:['A','C']}[mode];
  assert.deepEqual(history(c.snapshot(c.duration),'observer'),expected);
  assert.equal(real.playback.controller,undefined);assert.equal(real.playback.entry,'manual');
  assert.deepEqual(Array.from(c.stops,s=>s.id),{concatMap:['subscribe','first','active','question','answer'],
    switchMap:['question','answer','started']}[mode]||['question','answer']);
 }
 for(const id of ids){
  const scene=scenes.get(id),c=compile(scene);
  assert.equal(scene.playback.finish,'hold',id);
  assert.equal(c.snapshot(0).executionCounts.started,0);
  assert.equal(c.snapshot(c.duration).executionCounts.active,0);
  assert.equal(c.snapshot(c.duration).nodes.find(n=>n.id==='observer').notification,'complete');
 }
});
test('real concatMap queue is visible at the answer, while concatAll queues existing unsubscribed Observables',async()=>{
 const {scenes,compile,render}=await family(),c=compile(scenes.get('09-concatmap'));
 const q=c.snapshot(c.stops.at(-1).time),queued=q.nodes.find(n=>n.id==='queued1');
 assert.equal(queued.label,'B (wartość)');assert.equal(queued.opacity,1);assert.equal(q.executionCounts.started,1);
 assert.equal(q.executions.some(e=>e.id==='B'),false);
 const done=render(c.snapshot(c.duration));assert.equal((done.match(/data-inner-state="completed"/g)||[]).length,3);
 assert.doesNotMatch(done,/PRACE WEWNĘTRZNE|data-queue=|EMISJE|ODBIÓR/);assert.match(done,/data-panel-divider="true"/);
 const all=compile(scenes.get('08-map-strumienie')),f=all.snapshot(all.stops.at(-1).time),svg=render(f);
 assert.equal(f.executionCounts.started,1);assert.match(svg,/W KOLEJCE · Observable/);
 assert.deepEqual(Array.from(f.innerWorkPanels[0].rows.filter(r=>r.state==='queued'),r=>r.value),['B$','C$']);
 assert.equal(f.executions.some(e=>e.id==='B'),false);
});
test('real mergeMap demonstrates chronological reception: B overlaps A and returns first',async()=>{
 const {scenes,compile}=await family(),c=compile(scenes.get('10-mergemap')),f=c.snapshot(c.duration);
 assert.deepEqual(history(f,'observer'),['B','A','C']);
 const sub=c.events.find(e=>e.type==='inner-subscribe'&&e.execution==='B');
 const overlap=c.snapshot(sub.at+.01).executions;assert.equal(overlap.find(e=>e.id==='A').state,'running');assert.equal(overlap.find(e=>e.id==='B').state,'running');
 const terminal=e=>c.events.find(x=>x.type==='stream-complete'&&x.execution===e).at;
 const delivery=c.events.find(e=>e.type==='deliver-next'&&e.node==='observer'&&e.value==='B');
 assert.match(c.snapshot(delivery.at).caption,/B wróciło przed A/);
 assert.ok(terminal('B')<terminal('A'));assert.equal(f.histories.find(h=>h.anchor==='observer').max,4);
});
test('complete outer waits for remaining work; concurrency limit never exceeds three subscriptions',async()=>{
 const {scenes,compile}=await family();
 for(const id of ['12a-complete','12a-complete-2']){
  const c=compile(scenes.get(id)),source=c.events.find(e=>e.type==='stream-complete'&&e.edge==='source-op');
  const f=c.snapshot(source.at+.81);
  assert.equal(f.nodes.find(n=>n.id==='source').notification,'complete');assert.equal(f.nodes.find(n=>n.id==='observer').notification,null);
  assert.ok(f.executionCounts.active>0);assert.equal(f.histories.find(h=>h.anchor==='source').columns,1);
 }
 const c=compile(scenes.get('13-limit'));let peak=0;
 for(const event of c.events){const f=c.snapshot(event.at+.001);peak=Math.max(peak,f.executionCounts.active);assert.ok(f.executionCounts.active<=3);}
 assert.equal(peak,3);assert.equal(c.snapshot(c.duration).executionCounts.started,5);
 assert.equal(c.snapshot(0).panels.find(p=>p.id==='jobs').slots,5);
});
test('migrated work bars continue during travel and snapshots survive reversing every transition',async()=>{
 const {scenes,compile}=await family();
 for(const id of ids){
  const c=compile(scenes.get(id));
  for(const t of [0,...c.stops.map(s=>s.time),...c.events.map(e=>e.at),c.duration]){
   const expected=JSON.stringify(c.snapshot(t));c.snapshot(c.duration);c.snapshot(0);assert.equal(JSON.stringify(c.snapshot(t)),expected);
  }
  for(const e of c.events.filter(e=>e.type==='inner-subscribe')){
   const end=c.events.find(x=>['stream-complete','inner-unsubscribe'].includes(x.type)&&x.execution===e.execution);
   let previous=-1;
   for(let t=e.at+.05;t<end.at;t+=.15){const row=c.snapshot(t).executions.find(r=>r.id===e.execution);assert.ok(row.progress>previous,id+' '+e.execution);previous=row.progress;}
  }
 }
});

test('source and flattening operator turn green at their own complete, not together',async()=>{
 const {scenes,compile}=await family();
 for(const id of ids){
  const c=compile(scenes.get(id)),ready=c.snapshot(0),final=c.snapshot(c.duration);
  for(const nodeId of ['source','op']){
   const n=ready.nodes.find(n=>n.id===nodeId),end=c.plan.records.get(n.terminalEdge).end;
   assert.equal(n.notification,null);
   assert.notEqual(c.snapshot(end.at-.001).nodes.find(n=>n.id===nodeId).fill,'#087438');
   const ended=c.snapshot(end.at).nodes.find(n=>n.id===nodeId);
   assert.equal(ended.notification,'complete');
   if(c.snapshot(0).innerWorkPanels){
    assert.equal(ended.fill,n.fill);assert.equal(ended.laneStates[0].state,'completed');
    assert.equal(final.nodes.find(n=>n.id===nodeId).fill,n.fill);
   }else{assert.equal(ended.fill,'#087438');assert.equal(final.nodes.find(n=>n.id===nodeId).fill,'#087438');}
  }
 }
 const c=compile(scenes.get('12a-complete')),source=c.events.find(e=>e.type==='stream-complete'&&e.edge==='source-op');
 const f=c.snapshot(source.at);
 assert.equal(f.nodes.find(n=>n.id==='source').fill,'#087438');
 assert.notEqual(f.nodes.find(n=>n.id==='op').fill,'#087438');
 assert.ok(f.executionCounts.active>0);
});

test('unhandled error and cancellation cannot turn source or operator green',async()=>{
 const {compile,prototypes}=await family();
 for(const id of ['prototype-uncaught-error','prototype-concat-catch-outer']){
  const c=compile(prototypes.find(s=>s.id===id)),f=c.snapshot(c.duration);
  assert.equal(f.nodes.find(n=>n.id==='source').notification,null);
  assert.notEqual(f.nodes.find(n=>n.id==='source').fill,'#087438');
  assert.equal(f.nodes.find(n=>n.id==='op').notification,'error');
  assert.equal(f.nodes.find(n=>n.id==='op').fill,'#b51e2e');
 }
});

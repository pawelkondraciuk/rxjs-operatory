const {test}=require('node:test');
const assert=require('node:assert/strict');
const {modules,playbackHarness}=require('./v2-harness.cjs');
const values=(frame,anchor)=>Array.from(frame.histories.find(h=>h.anchor===anchor).values,v=>v.value);
async function subject(format){
  const m=await modules(['catalog','scene-config','engine','renderer']);
  const base=m.catalog.scenes.find(s=>s.id==='05-zrodla');
  const scene=m['scene-config'].configureScene({...base,id:'05-zrodla-3',rendererId:'05-zrodla',sourceExample:2,...(format?{format}:{})});
  return {scene,m,compiled:m.engine.compileScene(scene)};
}

test('A is emitted without listeners and never delivered; histories start empty',async()=>{
 const {compiled:c}=await subject(),ready=c.snapshot(0);
 assert.equal(ready.panels.length,3);assert.ok(ready.histories.every(h=>h.values.length===0));
 assert.ok(ready.edges.every(e=>!e.visible));
 const a=c.snapshot(c.stops[0].time);
 assert.deepEqual(values(a,'source'),['A']);assert.deepEqual(values(a,'sink'),[]);assert.deepEqual(values(a,'sink2'),[]);
 assert.ok(a.edges.every(e=>!e.visible));assert.equal(c.events.filter(e=>e.type==='source-next'&&e.value==='A').length,1);
 assert.equal(c.events.some(e=>e.type==='deliver-next'&&e.value==='A'),false);
});

test('B reaches only the first listener; the second subscribes without replay and receives C',async()=>{
 const {compiled:c}=await subject();
 assert.deepEqual(Array.from(c.stops,s=>s.id),['unobserved','subscribed','first','second']);
 const connected=c.snapshot(c.stops[1].time);
 assert.deepEqual(values(connected,'sink'),[]);assert.deepEqual(values(connected,'sink2'),[]);
 assert.equal(connected.edges.find(e=>e.id==='source-sink').visible,true);
 assert.equal(connected.edges.find(e=>e.id==='source-sink2').visible,false);
 const b=c.plan.records.get('source-sink').events.find(e=>e.value==='B');
 assert.deepEqual(values(c.snapshot(b.arrival-1e-6),'sink'),[]);
 assert.deepEqual(values(c.snapshot(b.arrival),'sink'),['B']);
 const second=c.snapshot(c.stops[3].time);
 assert.deepEqual(values(second,'sink'),['B']);assert.deepEqual(values(second,'sink2'),[]);
 assert.ok(second.edges.every(e=>e.visible&&e.phase==='subscribed'));
 const final=c.snapshot(c.duration);
 assert.deepEqual(values(final,'source'),['A','B','C']);assert.deepEqual(values(final,'sink'),['B','C']);assert.deepEqual(values(final,'sink2'),['C']);
 assert.match(final.caption,/Log emisji.*Odbiorca 1.*Odbiorca 2/);
 assert.equal(c.events.some(e=>e.type==='stream-complete'||e.type==='inner-unsubscribe'),false);
 assert.ok(final.nodes.every(n=>n.notification===null&&!n.showProgress));
});

test('emission history follows source departure and all checkpoints are deterministic',async()=>{
 const {compiled:c}=await subject();
 for(const value of c.snapshot(c.duration).histories.find(h=>h.anchor==='source').values){
  const event=c.events.find(e=>e.type==='source-next'&&e.node==='source'&&e.value===value.value);
  assert.equal(value.shownAt,event.at);
 }
 for(const time of [0,...c.stops.map(s=>s.time),...c.events.map(e=>e.at),c.duration]){
  const expected=JSON.stringify(c.snapshot(time));c.snapshot(c.duration);c.snapshot(0);assert.equal(JSON.stringify(c.snapshot(time)),expected);
 }
});

test('Subject holds FINISHED and rewind removes later listeners and receipts',async()=>{
 const {scene}=await subject(),h=await playbackHarness(),{player}=h.create({scene});
 player.seek(player.stops[0].time);const before=JSON.stringify(player.snapshot);
 player.playContinuously();h.advance(30000);assert.equal(player.state,'finished');assert.equal(h.frames.size,0);
 assert.deepEqual(values(player.snapshot,'sink2'),['C']);
 player.seek(player.stops[0].time);assert.equal(JSON.stringify(player.snapshot),before);
});

test('vertical fanout reserves three readable boxes inside both formats; boxes appear on first emission or delivery',async()=>{
 for(const format of ['4:3','16:9']){
  const {compiled:c,m}=await subject(format),f=c.snapshot(c.duration);
  assert.equal(f.nodes.find(n=>n.id==='sink').x,f.nodes.find(n=>n.id==='sink2').x);
  assert.ok(f.nodes.find(n=>n.id==='sink').y<f.nodes.find(n=>n.id==='sink2').y);
  assert.ok(f.nodes.every(n=>n.w>=400&&n.h>=90));
  for(const p of f.panels){assert.ok(p.x>=0&&p.x+p.w<=f.width);assert.ok(p.y>=0&&p.y+p.h<=f.height);}
  assert.ok(f.histories.every(h=>h.lines===1));
  assert.ok(c.snapshot(0).panels.every(p=>!p.visible));
  for(const [i,type,edge,value] of [[0,'source-next',undefined,'A'],[1,'deliver-next','source-sink','B'],[2,'deliver-next','source-sink2','C']]){
   const event=c.events.find(e=>e.type===type&&e.value===value&&(!edge||e.edge===edge));
   assert.equal(c.snapshot(event.at-.001).panels[i].visible,false);assert.equal(c.snapshot(event.at).panels[i].visible,true);
  }
  assert.doesNotMatch(m.renderer.renderScene(f),/NaN|Infinity|data-work-progress/);
 }
});

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
 assert.equal(ready.panels.length,1);assert.equal(ready.panels[0].visible,false);assert.ok(ready.histories.every(h=>h.values.length===0));
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
 assert.match(final.caption,/Log emisji.*Odbiorca A.*Odbiorca B/);
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

test('lane layout: Subject rows A/B grow on subscribe, receivers keep balls and the log appears with the first emission',async()=>{
 for(const format of ['4:3','16:9']){
  const {compiled:c,m}=await subject(format),f=c.snapshot(c.duration),node=id=>f.nodes.find(n=>n.id===id);
  assert.equal(f.textScale,1.42);assert.equal(node('source').label,'Subject');assert.equal(node('source').fill,'#8FC9D4');
  const lanes=node('source').laneStates;
  assert.deepEqual(Array.from(lanes,l=>l.subscriber).sort(),['A','B']);
  for(const [sink,id] of [['sink','A'],['sink2','B']]){
   const y=lanes.find(l=>l.subscriber===id).y;
   assert.equal(node(sink).laneStates[0].y,y);assert.equal(f.histories.find(h=>h.anchor===sink).y,y);
   assert.ok(f.histories.find(h=>h.anchor===sink).balls);
  }
  assert.equal(node('sink').x,node('sink2').x);assert.ok(node('sink').y<node('sink2').y);
  // Wiersz B w Subject rośnie dopiero z subskrypcją B; wcześniej tylko A.
  assert.equal(c.snapshot(c.stops[2].time).nodes.find(n=>n.id==='source').laneRows.length,1);
  const log=f.panels[0];assert.equal(log.label,'log emisji (bez bufora)');
  assert.ok(log.y+log.h<=node('source').y-node('source').h/2,'log nad nagłówkiem Subject');
  for(const p of f.panels){assert.ok(p.x>=0&&p.x+p.w<=f.width);assert.ok(p.y>=0&&p.y+p.h<=f.height);}
  const event=c.events.find(e=>e.type==='source-next'&&e.value==='A');
  assert.equal(c.snapshot(event.at-.001).panels[0].visible,false);assert.equal(c.snapshot(event.at).panels[0].visible,true);
  for(const [edge,value,anchor] of [['source-sink','B','sink'],['source-sink2','C','sink2']]){
   const got=c.events.find(e=>e.type==='deliver-next'&&e.edge===edge&&e.value===value);
   assert.ok(!values(c.snapshot(got.at-.001),anchor).includes(value));assert.ok(values(c.snapshot(got.at),anchor).includes(value));
  }
  const svg=m.renderer.renderScene(f);
  assert.doesNotMatch(svg,/NaN|Infinity|data-work-progress|>…</);
 }
});

test('.subscribe() A and B appear above the receiver column at their own subscriptions only',async()=>{
 const {compiled:c}=await subject('4:3'),shown=t=>Array.from(c.snapshot(t).callouts||[],k=>k.text+' '+k.label);
 for(const [edge,label] of [['source-sink','A'],['source-sink2','B']]){
  const sub=c.events.find(e=>e.type==='subscribe'&&e.edge===edge);assert.deepEqual(shown(sub.at),['.subscribe() '+label]);
 }
 for(const stop of c.stops)assert.deepEqual(shown(stop.time),[],stop.id);
 const f=c.snapshot(c.events.find(e=>e.type==='subscribe'&&e.edge==='source-sink').at),k=f.callouts[0];
 assert.ok(k.y<f.nodes.find(n=>n.id==='sink').y-f.nodes.find(n=>n.id==='sink').h/2);
});

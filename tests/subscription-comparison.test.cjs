const {test}=require('node:test'),assert=require('node:assert/strict');
const {modules}=require('./v2-harness.cjs');
async function comparison(id,mode='without',format='4:3'){
 const m=await modules(['catalog','scene-config','engine','renderer']);
 const base=m.catalog.scenes.find(s=>s.id===id);
 const scene=m['scene-config'].configureScene({...base,...base.variants[mode],variants:undefined,
  id:mode==='shared'?id+'-2':id,rendererId:id,comparisonMode:mode,format});
 return {scene,c:m.engine.compileScene(scene),render:m.renderer.renderScene};
}
const received=f=>Array.from(f.histories.filter(h=>h.anchor.startsWith('receiver')),h=>Array.from(h.values,e=>e.value));
// share (bez -2) ma wygląd torów: tests/share-late.test.cjs. Diagram „late” zostaje dla shareReplay.
test('shareReplay retains completed HTTP and replays to B',async()=>{
 for(const [mode,count] of [['shared',1]]){
  const {c}=await comparison('20-sharereplay',mode),f=c.snapshot(c.duration);
  const question=c.snapshot(c.stops.find(s=>s.id==='question').time);
  assert.deepEqual(received(question)[1],[],'B is connected; the answer is revealed only after the question');
  assert.equal(f.metrics[0].value,count);assert.deepEqual(received(f),[['dane'],['dane']]);
  assert.match(f.caption,mode==='shared'?/zapamiętaną.*jeden request/:/nową.*Dwa requesty/);
  const b=c.events.find(e=>e.type==='deliver-next'&&e.node==='receiver1');
  assert.equal(b.logicalAt,mode==='shared'?10:15);
  assert.ok(c.snapshot(b.at-.001).histories[1].values.length===0);
  assert.equal(c.snapshot(b.at).histories[1].values.length,1);
  if(mode==='shared'){
   const cache=c.events.find(e=>e.type==='deliver-next'&&e.edge==='http1-hub');
   const buffer=frame=>frame.panels.find(p=>p.label==='bufor ReplaySubject');
   assert.equal(buffer(c.snapshot(cache.at-.001)).visible,false);
   assert.equal(buffer(c.snapshot(cache.at)).visible,true);
   assert.deepEqual(Array.from(f.histories.find(h=>h.anchor==='hub').values,e=>e.value),['dane']);
  }
 }
});

test('late comparison geometry, request counters and rewind remain correct in both formats',async()=>{
 for(const format of ['4:3','16:9'])for(const mode of ['shared']){
  const {c,render}=await comparison('20-sharereplay',mode,format),f=c.snapshot(c.duration);
  const first=f.panels[0],next=f.nodes.find(n=>n.id==='receiver1');
  assert.ok(first.y+first.h<next.y-next.h/2,'history must not overlap the second receiver');
  const connected=c.events.find(e=>e.type==='connected'&&e.edge==='http1-hub').at;
  assert.equal(c.snapshot(connected-.001).executionCounts.started,0);
  assert.equal(c.snapshot(connected+.001).executionCounts.started,1);
  assert.deepEqual(received(f),[['dane'],['dane']]);
  assert.doesNotMatch(render(f),/NaN|Infinity/);
  const before=JSON.stringify(c.snapshot(c.stops[1].time));c.snapshot(c.duration);
  assert.equal(JSON.stringify(c.snapshot(c.stops[1].time)),before);
 }
});

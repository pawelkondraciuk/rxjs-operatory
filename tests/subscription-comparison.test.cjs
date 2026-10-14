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
test('one cold definition creates independent executions; request counters wait for connection',async()=>{
 for(const id of ['06a-cold-hot','07-hot-cold']){
  const {c}=await comparison(id),r=c.plan.records.get('work0-receiver0');
  const ready=c.snapshot(0);assert.equal(ready.nodes.filter(n=>n.id==='observable'&&n.visible).length,0);
  assert.equal(ready.metrics[0].value,0);
  assert.equal(c.snapshot(r.start+r.connectDuration-.001).metrics[0].value,0);
  assert.equal(c.snapshot(r.start+r.connectDuration+.001).metrics[0].value,1);
  assert.equal(c.snapshot(c.duration).metrics[0].value,2);
 }
 const {c}=await comparison('06a-cold-hot'),firstB=c.events.find(e=>e.type==='deliver-next'&&e.edge==='work1-receiver1');
 const f=c.snapshot(firstB.at);assert.equal(received(f)[1][0],'0');assert.ok(received(f)[0].includes('2'));
});
test('overlapping shared HTTP uses one upstream execution and delivers to both receivers',async()=>{
 const {c}=await comparison('07-hot-cold','shared'),f=c.snapshot(c.duration);
 const birth=c.events.find(e=>e.type==='node-create'&&e.node==='hub').at;
 // W READY hub jest niewidoczny (brak kafelka albo krycie 0 przed fade-in pierwszego etapu).
 const shown=f=>{const n=f.nodes.find(n=>n.id==='hub');return n.visible&&n.opacity>0;};
 const ready=c.snapshot(0),fading=c.snapshot(birth+.15);
 assert.equal(shown(ready),false);
 assert.ok(Math.abs(fading.nodes.find(n=>n.id==='hub').opacity-.5)<1e-8);
 assert.equal(fading.executionCounts.started,0,'revealing share must not start the HTTP request');
 assert.equal(c.snapshot(c.stops[0].time).nodes.find(n=>n.id==='hub').opacity,1);
 assert.equal(shown(c.snapshot(0)),false,'rewind hides share again');
 assert.equal(f.metrics[0].value,1);assert.equal(f.executionCounts.started,1);
 assert.deepEqual(received(f),[['dane'],['dane']]);
 const delivery=c.events.filter(e=>e.type==='deliver-next'&&e.node.startsWith('receiver'));
 assert.equal(new Set(delivery.map(e=>e.logicalAt)).size,1);
});
test('late share starts a second HTTP; shareReplay retains completed HTTP and replays to B',async()=>{
 for(const [mode,count] of [['without',2],['shared',1]]){
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

test('cold timer histories fit in separate boxes and retain every emitted value in both formats',async()=>{
 for(const format of ['4:3','16:9']){
  const {c,render}=await comparison('06a-cold-hot','without',format),f=c.snapshot(c.duration);
  const first=f.panels[0],next=f.nodes.find(n=>n.id==='receiver1');
  assert.ok(first.y+first.h<next.y-next.h/2,'history must not overlap the second receiver');
  const shown=Array.from(render(f).matchAll(/data-token="received"[^>]*>[^]*?<text[^>]*>([^<]*)<\/text>/g),m=>m[1]);
  assert.deepEqual(shown,['0','1','2','3','4','5','6','0','1','2','3','4']);
  assert.deepEqual(received(f),[['0','1','2','3','4','5','6'],['0','1','2','3','4']]);
  const before=JSON.stringify(c.snapshot(c.stops[1].time));c.snapshot(c.duration);
  assert.equal(JSON.stringify(c.snapshot(c.stops[1].time)),before);
 }
});

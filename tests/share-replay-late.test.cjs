const {slideNotes}=require('./slide-notes.cjs');
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {modules,playbackHarness}=require('./v2-harness.cjs');
// 20-sharereplay-2 (shareReplay({ bufferSize: 1, refCount: true })): HTTP GET → shareReplay(1) → A/B w wyglądzie torów
// z kieszenią bufora. Jedno wykonanie HTTP; 42 trafia do A i do bufora; późny B dostaje 42 z bufora, bez nowego HTTP.
async function replay(format='4:3'){
 const m=await modules(['catalog','scene-config','engine','renderer']);
 const base=m.catalog.scenes.find(s=>s.id==='20-sharereplay');
 const scene=m['scene-config'].configureScene({...base,...base.variants.shared,variants:undefined,
  id:'20-sharereplay-2',rendererId:'20-sharereplay',comparisonMode:'shared',format});
 return {scene,c:m.engine.compileScene(scene),render:m.renderer.renderScene};
}
const at=(c,type,edge)=>c.events.find(e=>e.type===type&&e.edge===edge).at;
const balls=(f,id)=>Array.from(f.histories.find(h=>h.anchor===id).values,v=>v.value);
const pocket=f=>f.nodes.find(n=>n.id==='replay').bufferPocket;
const buffered=f=>Array.from(pocket(f).values,v=>v.value);
const lane=(f,node,id)=>f.nodes.find(n=>n.id===node).laneStates.find(l=>l.subscriber===id);

test('shareReplay: one HTTP header, a single execution and a request counter that ends at 1',async()=>{
 const {scene,c}=await replay(),end=c.snapshot(c.duration);
 assert.equal(scene.code,'http$.pipe(\n  shareReplay({ bufferSize: 1, refCount: true }))');
 assert.doesNotMatch(scene.code,/subscribe/);
 assert.deepEqual(Array.from(end.nodes,n=>n.id),['http','replay','A','B']);
 assert.equal(end.nodes.find(n=>n.id==='replay').label,'shareReplay(1)');
 assert.deepEqual(Array.from(end.nodes.find(n=>n.id==='http').laneRows,r=>r.subscriber),['U1']);
 assert.equal(c.events.filter(e=>e.type==='subscribe'&&e.node==='replay').length,1,'jedno subscribe do HTTP');
 assert.ok(!c.events.some(e=>e.type==='subscribe'&&e.edge!=='http-replay'&&e.node==='replay'));
 const count=t=>c.snapshot(t).metrics[0].value;
 assert.equal(count(at(c,'connected','http-replay')-.001),0);
 assert.equal(count(at(c,'connected','http-replay')+.001),1);
 assert.equal(count(at(c,'disconnected','replay-A')+.5),1);
 assert.equal(count(at(c,'connected','replay-B')+.001),1);
 assert.equal(end.executionCounts.started,1);assert.equal(count(c.duration),1);
 assert.deepEqual(balls(end,'A'),['42']);assert.deepEqual(balls(end,'B'),['42']);
 assert.deepEqual(buffered(end),['42']);
});

test('shareReplay: the buffer is empty until the split stores 42 and keeps it after complete',async()=>{
 const {c}=await replay();
 const input=c.plan.records.get('http-replay').events[0],toA=c.plan.records.get('replay-A').events[0];
 assert.deepEqual(buffered(c.snapshot(0)),[]);
 assert.deepEqual(buffered(c.snapshot(input.arrival)),[],'kulka dopiero dotarła do operatora');
 // Rozgałęzienie: ta sama kulka jedzie do portu A i do kieszeni bufora.
 const split=c.snapshot(input.arrival+(toA.at-input.arrival)*.7);
 assert.deepEqual(Array.from(split.tokens,t=>t.phase).sort(),['buffer-in','split-out']);
 assert.deepEqual(buffered(c.snapshot(toA.at)),['42']);
 assert.deepEqual(balls(c.snapshot(toA.at),'A'),[],'A dostaje 42 dopiero po przelocie');
 const completed=c.snapshot(at(c,'disconnected','replay-A')+.8);
 assert.equal(lane(completed,'http','U1').state,'completed');
 assert.equal(lane(completed,'replay','A').state,'completed');
 assert.deepEqual(buffered(completed),['42'],'refCount: true nie czyści bufora zakończonego źródła');
});

test('shareReplay: late B subscribes after complete and receives 42 from the buffer, then complete',async()=>{
 const {c}=await replay();
 assert.ok(at(c,'disconnected','replay-A')<at(c,'subscribe','replay-B'),'B dopiero po complete A');
 const replayB=c.plan.records.get('replay-B');
 assert.equal(replayB.events.length,1);
 const v=replayB.events[0];
 // Wartość wychodzi z kieszeni bufora (token replay), nie z HTTP: w tym czasie HTTP nie emituje.
 const leaving=c.snapshot(v.at-.3);
 assert.deepEqual(Array.from(leaving.tokens,t=>t.phase),['replay']);
 assert.equal(c.events.filter(e=>e.type==='source-next'&&e.node==='http').length,1);
 assert.deepEqual(buffered(leaving),['42'],'kopia wychodzi, bufor zostaje');
 assert.deepEqual(balls(c.snapshot(v.arrival-.001),'B'),[]);
 assert.deepEqual(balls(c.snapshot(v.arrival),'B'),['42']);
 assert.equal(replayB.end.kind,'complete');assert.ok(replayB.end.at>v.arrival);
 assert.equal(lane(c.snapshot(c.duration),'B','B').state,'completed');
 // Kolor kulki należy do odbiorcy: A fioletowa, B pomarańczowa; w buforze wartość z wykonania #1.
 assert.deepEqual(Array.from(c.plan.records.get('replay-A').events,e=>e.color),['#cbbff2']);
 assert.equal(v.color,'#f3d09d');
 assert.equal(pocket(c.snapshot(c.duration)).values[0].color,'#cbbff2');
});

test('shareReplay: one stop right after B subscribes (ball still in the buffer), slower replay and a slightly slower first delivery',async()=>{
 const {scene,c}=await replay();assert.deepEqual(Array.from(c.stops,s=>s.id),['subscribed-b']);
 const request=c.plan.records.get('http-replay'),toA=c.plan.records.get('replay-A'),toB=c.plan.records.get('replay-B');
 assert.ok(request.events[0].at-(request.start+request.connectDuration)<=1.01);
 // Przekazanie 42 z HTTP do A odrobinę wolniej niż dawne 0,4 s.
 for(const r of [request,toA])for(const e of r.events)assert.ok(Math.abs(e.arrival-e.at-.6)<1e-6);
 // Postój: subskrypcja B zestawiona, kulka leży w buforze, nic nie leci, B pusty, migawka subscribe już zgasła.
 const stop=c.stops[0].time,connected=at(c,'connected','replay-B'),v=toB.events[0],frame=c.snapshot(stop);
 assert.ok(stop>connected&&stop<v.at-1.2,'po subscribe B, przed wyjęciem kulki z bufora');
 assert.equal(frame.tokens.length,0);assert.deepEqual(buffered(frame),['42']);assert.deepEqual(balls(frame,'B'),[]);
 assert.equal(lane(frame,'B','B').state,'running');assert.equal((frame.callouts||[]).length,0);
 assert.equal(frame.executionCounts.started,1,'bez nowego HTTP');
 // Wolniejsze przekazanie z bufora: 1,2 s wyjazdu z kieszeni i 0,8 s przelotu do B.
 assert.ok(Math.abs(v.arrival-v.at-.8)<1e-6);
 assert.deepEqual(Array.from(c.snapshot(v.at-1.1).tokens,t=>t.phase),['replay']);
 assert.equal(c.snapshot(v.at-1.3).tokens.length,0);
 const h=await playbackHarness(),navigation=[],{player,controller}=h.create({scene,controls:{stageOptions:{onNavigate:d=>navigation.push(d)}}});
 assert.equal(player.time,0);assert.equal(player.isPlaying,false);
 controller.next();h.advance(30000);assert.equal(player.time,stop);assert.equal(player.isPlaying,false);
 assert.deepEqual(balls(player.snapshot,'B'),[]);
 controller.next();h.advance(30000);assert.equal(player.state,'finished');assert.equal(player.snapshot.executionCounts.started,1);
 assert.deepEqual(balls(player.snapshot,'B'),['42']);controller.next();assert.deepEqual(navigation,[1]);
 controller.reset();controller.next();h.advance(100);controller.next();assert.equal(player.time,stop,'szybkie dalej kończy tylko etap');
 controller.next();h.advance(100);controller.next();assert.equal(player.state,'finished');
 controller.previous();assert.equal(player.time,stop);assert.deepEqual(balls(player.snapshot,'B'),[]);
 controller.reset();controller.setMode('manual');controller.setMode('auto');h.advance(30000);assert.equal(player.state,'finished');
 const notes=slideNotes('20-sharereplay-2');
 assert.match(notes,/Późny B — co dostanie\?/);assert.match(notes,/42 \+ complete/);assert.match(notes,/Po complete bufor zostaje/);
});

test('shareReplay: ports share Y, the buffer pocket hangs under the operator and rewind is deterministic in both formats',async()=>{
 for(const format of ['4:3','16:9']){
  const {c,render}=await replay(format),end=c.snapshot(c.duration);
  const ys=id=>end.nodes.flatMap(n=>(n.socketDots||[]).filter(d=>d.subscriber===id).map(d=>d.y));
  assert.equal(new Set([...ys('U1'),...ys('A')]).size,1,format+' A');
  assert.equal(new Set(ys('B')).size,1,format+' B');
  const op=end.nodes.find(n=>n.id==='replay'),b=op.bufferPocket;
  assert.ok(b.y-b.h/2>=op.y+op.h/2&&b.y-b.h/2-(op.y+op.h/2)<12,format+' kieszeń przylega do kafelka');
  assert.ok(b.y+b.h/2<=end.height,format+' kieszeń w viewBox');
  assert.equal(b.x,op.x);assert.equal(b.w,op.w);
  const ready=c.snapshot(0).nodes.find(n=>n.id==='replay');
  assert.ok(ready.bufferPocket.y<b.y,'kieszeń zjeżdża razem z wierszami');
  const svg=render(end);
  assert.match(svg,/data-buffer="replay" data-buffer-size="1"/);
  assert.doesNotMatch(svg,/NaN|Infinity|="undefined"/);
  const before=JSON.stringify(c.snapshot(at(c,'disconnected','replay-A')));c.snapshot(c.duration);c.snapshot(0);
  assert.equal(JSON.stringify(c.snapshot(at(c,'disconnected','replay-A'))),before);
 }
});

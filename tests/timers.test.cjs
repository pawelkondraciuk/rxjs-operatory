const {test}=require('node:test'),assert=require('node:assert/strict');
const {modules}=require('./v2-harness.cjs');
// Wariant 05-zrodla: timer(1000) i interval(1000) jeden pod drugim.
async function timers(format){
 const m=await modules(['catalog','scene-config','engine','renderer']);
 const base=m.catalog.scenes.find(s=>s.id==='05-zrodla');
 const scene=m['scene-config'].configureScene({...base,rendererId:'05-zrodla',sourceExample:0,...(format?{format}:{})});
 return {scene,c:m.engine.compileScene(scene),render:m.renderer.renderScene};
}
const values=(frame,anchor)=>Array.from(frame.histories.find(h=>h.anchor===anchor).values,v=>v.value);
const node=(frame,id)=>frame.nodes.find(n=>n.id===id);
const lane=(frame,id)=>node(frame,id).laneStates?.[0];

test('timer emits one value and completes; interval emits 0, 1, 2 until the receiver unsubscribes',async()=>{
 const {scene,c}=await timers();
 assert.equal(scene.code,'timer(1000) / interval(1000)');
 assert.doesNotMatch(scene.code,/subscribe/);
 assert.deepEqual(Array.from(c.stops,s=>s.id),['first','question','third','unsubscribed']);
 const end=c.snapshot(c.duration);
 assert.deepEqual(values(end,'timerSink'),['0']);
 assert.deepEqual(values(end,'intervalSink'),['0','1','2']);
 // Stan wykonania niesie wiersz toru: timer A complete, interval B odsubskrybowany (bez complete).
 assert.equal(lane(end,'timer').state,'completed');assert.equal(lane(end,'timerSink').state,'completed');
 assert.equal(lane(end,'interval').state,'cancelled');assert.equal(lane(end,'intervalSink').state,'cancelled');
 const cable=end.edges.find(e=>e.id==='interval-intervalSink');
 assert.equal(cable.phase,'unsubscribe');assert.ok(cable.done);assert.equal(cable.color,'#808890');
 assert.notEqual(node(end,'interval').notification,'complete');assert.notEqual(node(end,'intervalSink').notification,'complete');
 assert.ok(c.events.some(e=>e.type==='stream-complete'&&e.edge==='timer-timerSink'));
 assert.ok(!c.events.some(e=>e.type==='stream-complete'&&e.edge==='interval-intervalSink'));
 assert.ok(c.events.some(e=>e.type==='inner-unsubscribe'&&e.edge==='interval-intervalSink'));
});

test('stops: both have 0, timer completes, interval reaches 2 and is unsubscribed manually',async()=>{
 const {c}=await timers();
 const [first,question,third,unsubscribed]=c.stops,a=c.snapshot(first.time),b=c.snapshot(question.time);
 assert.deepEqual([values(a,'timerSink'),values(a,'intervalSink')],[['0'],['0']]);
 assert.equal(lane(b,'timer').state,'completed');assert.equal(lane(b,'timerSink').state,'completed');
 assert.deepEqual(values(b,'intervalSink'),['0']);
 assert.equal(c.snapshot(0).histories.every(h=>h.values.length===0),true);
 // Odbiorca nie pokazuje complete, zanim dotrze do niego sygnał.
 assert.notEqual(lane(a,'timerSink').state,'completed');
 const t=c.snapshot(third.time),u=c.snapshot(unsubscribed.time);
 assert.deepEqual(values(t,'intervalSink'),['0','1','2']);
 assert.equal(t.edges.find(e=>e.id==='interval-intervalSink').phase,'subscribed','przed unsubscribe kabel jest');
 assert.equal(lane(t,'intervalSink').state,'running');
 assert.equal(u.edges.find(e=>e.id==='interval-intervalSink').phase,'unsubscribe');
 assert.equal(lane(u,'intervalSink').state,'cancelled');
 assert.ok(unsubscribed.time<=c.duration,'ostatni postój mieści się w scenie');
});

test('lane layout: two centred pipelines A and B, receiver rows with balls; shared look in both formats',async()=>{
 for(const format of ['4:3','16:9']){
  const {c,render}=await timers(format),f=c.snapshot(c.duration);
  assert.equal(f.height,format==='4:3'?612:460);assert.equal(f.textScale,1.42);assert.equal(f.panels.length,0);
  const top=Math.min(...f.nodes.map(n=>n.y-n.h/2)),bottom=Math.max(...f.nodes.map(n=>n.y+n.h/2));
  assert.ok(Math.abs((top+bottom)/2-f.height/2)<2,format);
  for(const [source,sink,id] of [['timer','timerSink','A'],['interval','intervalSink','B']]){
   assert.equal(lane(f,source).subscriber,id);assert.equal(lane(f,source).y,lane(f,sink).y);
   const h=f.histories.find(x=>x.anchor===sink),n=node(f,sink);
   assert.equal(h.y,lane(f,sink).y);assert.ok(h.balls&&h.x>n.x-n.w/2&&h.x<n.x+n.w/2);
  }
  assert.equal(node(f,'timer').fill,'#8FC9D4','nagłówek definicji bez koloru complete');
  const svg=render(f);
  assert.doesNotMatch(svg,/>…</,'pełne wartości w kulkach');
  assert.doesNotMatch(svg,/>✓ complete<\/text>|rx="12"/);
 }
 // Odbiorcy (wiersze wykonań) wchodzą przed subscribe, historia pojawia się dopiero przy odbiorze.
 const {c}=await timers('4:3');
 assert.ok(c.snapshot(0).nodes.filter(n=>n.id.endsWith('Sink')).every(n=>!n.visible||n.opacity<1));
 for(const edge of ['timer-timerSink','interval-intervalSink']){
  const first=c.events.find(e=>e.type==='deliver-next'&&e.edge===edge&&e.value==='0'),anchor=edge.split('-')[1];
  assert.deepEqual(values(c.snapshot(first.at-.01),anchor),[]);assert.deepEqual(values(c.snapshot(first.at),anchor),['0']);
 }
});

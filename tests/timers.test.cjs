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

test('timer emits one value and completes; interval emits 0, 1, 2 until the receiver unsubscribes',async()=>{
 const {scene,c}=await timers();
 assert.equal(scene.code,'timer(1000) / interval(1000)');
 assert.doesNotMatch(scene.code,/subscribe/);
 assert.deepEqual(Array.from(c.stops,s=>s.id),['first','question','third','unsubscribed']);
 const end=c.snapshot(c.duration);
 assert.deepEqual(values(end,'timerSink'),['0']);
 assert.deepEqual(values(end,'intervalSink'),['0','1','2']);
 assert.equal(node(end,'intervalSink').status,'unsubscribe');assert.equal(node(end,'interval').status,'zatrzymany');
 assert.ok(!end.edges.find(e=>e.id==='interval-intervalSink').visible,'kabel odłączony');
 assert.equal(node(end,'timer').status,'✓ complete');assert.equal(node(end,'timerSink').status,'✓ complete');
 assert.notEqual(node(end,'interval').notification,'complete');assert.notEqual(node(end,'intervalSink').notification,'complete');
 assert.ok(c.events.some(e=>e.type==='stream-complete'&&e.edge==='timer-timerSink'));
 assert.ok(!c.events.some(e=>e.type==='stream-complete'&&e.edge==='interval-intervalSink'));
 assert.ok(c.events.some(e=>e.type==='inner-unsubscribe'&&e.edge==='interval-intervalSink'));
});

test('stops: both have 0, timer completes, interval reaches 2 and is unsubscribed manually',async()=>{
 const {c}=await timers();
 const [first,question,third,unsubscribed]=c.stops,a=c.snapshot(first.time),b=c.snapshot(question.time);
 assert.deepEqual([values(a,'timerSink'),values(a,'intervalSink')],[['0'],['0']]);
 assert.equal(node(b,'timer').status,'✓ complete');
 assert.deepEqual(values(b,'intervalSink'),['0']);
 assert.equal(c.snapshot(0).histories.every(h=>h.values.length===0),true);
 // Odbiorca nie pokazuje complete, zanim dotrze do niego sygnał.
 assert.notEqual(node(a,'timerSink').status,'complete');
 const t=c.snapshot(third.time),u=c.snapshot(unsubscribed.time);
 assert.deepEqual(values(t,'intervalSink'),['0','1','2']);
 assert.ok(t.edges.find(e=>e.id==='interval-intervalSink').visible,'przed unsubscribe kabel jest');
 assert.notEqual(node(t,'intervalSink').status,'unsubscribe');
 assert.ok(!u.edges.find(e=>e.id==='interval-intervalSink').visible);
 assert.equal(node(u,'intervalSink').status,'unsubscribe');
 assert.ok(unsubscribed.time<=c.duration,'ostatni postój mieści się w scenie');
});

test('4:3 layout: two centred rows, receiver boxes on the right, large labels; 16:9 keeps default scale',async()=>{
 const {c,render}=await timers('4:3'),f=c.snapshot(c.duration);
 assert.equal(f.height,612);assert.equal(f.textScale,1.8);
 const rows=[...new Set(f.nodes.map(n=>n.y))];
 assert.equal(rows.length,2);
 const top=Math.min(...f.nodes.map(n=>n.y-n.h/2)),bottom=Math.max(...f.nodes.map(n=>n.y+n.h/2));
 assert.ok(Math.abs((top+bottom)/2-f.height/2)<2);
 for(const [sink,panel] of [['timerSink',f.panels[0]],['intervalSink',f.panels[1]]]){
  const n=node(f,sink);
  assert.ok(panel.x>n.x+n.w/2,'box na prawo');assert.equal(panel.y+panel.h/2,n.y,'ten sam rząd');
 }
 const svg=render(f);
 assert.doesNotMatch(svg,/>…</,'bez wielokropka w boxie');
 assert.match(svg,/d="M770 181 H870"/,'poziomy łącznik');
 const size=Number(svg.match(/<g data-node="timer"[^>]*>.*?<text[^>]*font-size="([^"]+)"/)[1]);
 assert.ok(size>=50,String(size));
 // Box w rzędzie pojawia się dopiero przy pierwszym odbiorze w tym rzędzie.
 assert.deepEqual(Array.from(c.snapshot(0).panels,p=>p.visible),[false,false]);
 for(const [i,edge] of ['timer-timerSink','interval-intervalSink'].entries()){
  const first=c.events.find(e=>e.type==='deliver-next'&&e.edge===edge&&e.value==='0');
  assert.equal(c.snapshot(first.at-.01).panels[i].visible,false);assert.equal(c.snapshot(first.at).panels[i].visible,true);
 }
 const wide=(await timers('16:9')).c.snapshot(0);
 assert.equal(wide.textScale,1);assert.equal(wide.height,460);
});

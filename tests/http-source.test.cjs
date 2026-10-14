const {test}=require('node:test'),assert=require('node:assert/strict');
const {modules}=require('./v2-harness.cjs');
// Wariant 05-zrodla-2: HTTP → Odbiorca, box odbioru pod odbiorcą, praca tylko w kafelku HTTP.
async function http(format){
 const m=await modules(['catalog','scene-config','engine','renderer']);
 const base=m.catalog.scenes.find(s=>s.id==='05-zrodla');
 const scene=m['scene-config'].configureScene({...base,id:'05-zrodla-2',rendererId:'05-zrodla',sourceExample:1,...(format?{format}:{})});
 return {scene,c:m.engine.compileScene(scene),render:m.renderer.renderScene};
}
const node=(frame,id)=>frame.nodes.find(n=>n.id===id);
const values=frame=>Array.from(frame.histories[0].values,v=>v.value);

test('only the HTTP tile works; the receiver box gets the response, then both complete',async()=>{
 const {scene,c}=await http();
 assert.equal(scene.code,"http.get('/api/data')");
 const work=c.snapshot(c.stops[0].time);
 assert.deepEqual(Array.from(c.stops,s=>s.id),['request','first']);
 assert.equal(node(work,'http').status,'praca trwa');assert.ok(node(work,'http').showProgress);
 assert.ok(!node(work,'observer').showProgress);assert.notEqual(node(work,'observer').status,'praca trwa');
 assert.deepEqual(values(work),[]);
 const sent=c.events.find(e=>e.type==='source-next'&&e.node==='http');
 assert.equal(node(c.snapshot(sent.at+.1),'http').status,'odpowiedź wysłana');
 const end=c.snapshot(c.duration);
 assert.deepEqual(values(end),['dane']);
 assert.equal(node(end,'http').status,'✓ complete');assert.equal(node(end,'observer').status,'✓ complete');
 assert.ok(!node(end,'observer').showProgress);
});

test('4:3: tiles and the box under the receiver form one centred group with large labels',async()=>{
 const {c,render}=await http('4:3'),f=c.snapshot(c.duration),box=f.panels[0],observer=node(f,'observer');
 assert.equal(f.height,612);assert.equal(f.textScale,1.8);
 assert.equal(box.x+box.w/2,observer.x,'box pod odbiorcą');assert.equal(box.w,observer.w);
 const top=Math.min(...f.nodes.map(n=>n.y-n.h/2)),bottom=box.y+box.h;
 assert.ok(Math.abs((top+bottom)/2-f.height/2)<2,'wyśrodkowane w pionie');
 const left=Math.min(...f.nodes.map(n=>n.x-n.w/2)),right=Math.max(...f.nodes.map(n=>n.x+n.w/2));
 assert.ok(Math.abs((left+right)/2-f.width/2)<2,'wyśrodkowane w poziomie');
 const size=Number(render(f).match(/<g data-node="http"[^>]*>.*?<text[^>]*font-size="([^"]+)"/)[1]);
 assert.ok(size>=50,String(size));
 assert.match(render(f),/>dane<\/text>/,'pełna etykieta „dane” w boxie');
 const arrived=c.events.find(e=>e.type==='deliver-next'&&e.edge==='http-observer');
 assert.equal(c.snapshot(c.stops[0].time).panels[0].visible,false,'box ukryty w trakcie requestu');
 assert.equal(c.snapshot(arrived.at-.01).panels[0].visible,false);assert.equal(c.snapshot(arrived.at).panels[0].visible,true);
 const wide=(await http('16:9')).c.snapshot(0);
 assert.equal(wide.textScale,1);assert.equal(wide.height,460);
});

test('definition is idle before subscribe; first next stops before complete; rewind hides subscriber and code',async()=>{
 const {c}=await http();const ready=c.snapshot(0);
 assert.equal(node(ready,'http').visible,true);assert.equal(node(ready,'observer').visible,false);
 assert.equal(node(ready,'http').showProgress,false);assert.ok(ready.edges.every(e=>!e.visible));
 assert.doesNotMatch(ready.code,/subscribe/);assert.equal(ready.panels[0].visible,false);
 const subscribe=c.events.find(e=>e.type==='subscribe'),connected=c.events.find(e=>e.type==='connected');
 assert.equal(node(c.snapshot(subscribe.at),'observer').visible,true);
 assert.match(c.snapshot(subscribe.at).code,/subscribe\(render\)/);
 assert.equal(node(c.snapshot((subscribe.at+connected.at)/2),'http').showProgress,false);
 const first=c.snapshot(c.stops[1].time);assert.deepEqual(values(first),['dane']);
 assert.equal(node(first,'observer').notification,null);assert.equal(node(first,'http').notification,null);
 c.snapshot(c.duration);assert.deepEqual(c.snapshot(0),ready);
});

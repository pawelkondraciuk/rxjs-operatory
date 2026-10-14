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
const lane=(frame,id)=>node(frame,id).laneStates?.[0];

test('only the HTTP row works; the receiver row gets the response, then both complete',async()=>{
 const {scene,c}=await http();
 assert.equal(scene.code,"http.get('/api/data')");
 const work=c.snapshot(c.stops[0].time);
 assert.deepEqual(Array.from(c.stops,s=>s.id),['request','first']);
 assert.equal(lane(work,'http').role,'work');assert.equal(lane(work,'http').state,'running');
 assert.ok(lane(work,'http').progress>0&&lane(work,'http').progress<.1);
 assert.equal(lane(work,'observer').role,'receiver');assert.equal(lane(work,'observer').progress,undefined);
 assert.deepEqual(values(work),[]);
 // Postęp requestu kończy się z odpowiedzią; complete przychodzi po niej.
 const sent=c.events.find(e=>e.type==='source-next'&&e.node==='http'),after=c.snapshot(sent.at+.1);
 assert.equal(lane(after,'http').progress,1);assert.equal(lane(after,'http').state,'running');
 const end=c.snapshot(c.duration);
 assert.deepEqual(values(end),['dane']);
 assert.equal(lane(end,'http').state,'completed');assert.equal(lane(end,'observer').state,'completed');
 assert.ok(end.nodes.every(n=>!n.showProgress));
});

test('lane layout: centred HTTP GET → receiver A with the full response ball, shared look in both formats',async()=>{
 for(const format of ['4:3','16:9']){
  const {c,render}=await http(format),f=c.snapshot(c.duration),http_=node(f,'http'),observer=node(f,'observer');
  assert.equal(f.height,format==='4:3'?612:460);assert.equal(f.textScale,1.42);assert.equal(f.panels.length,0);
  assert.equal(http_.label,'HTTP GET');assert.equal(http_.fill,'#8FC9D4');
  assert.equal(lane(f,'http').y,lane(f,'observer').y);
  const top=Math.min(...f.nodes.map(n=>n.y-n.h/2)),bottom=Math.max(...f.nodes.map(n=>n.y+n.h/2));
  assert.ok(Math.abs((top+bottom)/2-f.height/2)<2,'wyśrodkowane w pionie');
  const left=Math.min(...f.nodes.map(n=>n.x-n.w/2)),right=Math.max(...f.nodes.map(n=>n.x+n.w/2));
  assert.ok(Math.abs((left+right)/2-f.width/2)<2,'wyśrodkowane w poziomie');
  const svg=render(f);
  assert.match(svg,/>dane<\/text>/,'pełna etykieta „dane” w kulce');
  assert.ok(f.histories[0].balls&&f.histories[0].x<observer.x+observer.w/2);
  assert.doesNotMatch(svg,/>✓ complete<\/text>|rx="12"/);
 }
 const {c}=await http('4:3'),arrived=c.events.find(e=>e.type==='deliver-next'&&e.edge==='http-observer');
 assert.deepEqual(values(c.snapshot(arrived.at-.01)),[]);assert.deepEqual(values(c.snapshot(arrived.at)),['dane']);
 // Rozbłysk complete wygasa przed FINISHED.
 const complete=c.plan.records.get('http-observer').end;
 assert.ok(c.duration-(complete.at+complete.duration)>=.6);
});

test('definition is idle before subscribe; first next stops before complete; rewind hides subscriber and code',async()=>{
 const {c}=await http();const ready=c.snapshot(0);
 assert.equal(node(ready,'http').visible,true);assert.equal(node(ready,'observer').visible,false);
 assert.deepEqual(Array.from(node(ready,'http').laneRows),[]);assert.deepEqual(Array.from(node(ready,'http').laneStates),[]);
 assert.ok(ready.edges.every(e=>!e.visible));
 assert.doesNotMatch(ready.code,/subscribe/);
 const subscribe=c.events.find(e=>e.type==='subscribe'),connected=c.events.find(e=>e.type==='connected');
 assert.equal(node(c.snapshot(subscribe.at),'observer').visible,true);
 assert.match(c.snapshot(subscribe.at).code,/subscribe\(render\)/);
 assert.deepEqual(Array.from(node(c.snapshot((subscribe.at+connected.at)/2),'http').laneStates),[]);
 const first=c.snapshot(c.stops[1].time);assert.deepEqual(values(first),['dane']);
 assert.equal(node(first,'observer').notification,null);assert.equal(node(first,'http').notification,null);
 c.snapshot(c.duration);assert.deepEqual(c.snapshot(0),ready);
});

test('.subscribe() A appears with the receiver and fades before the request stop',async()=>{
 const {c}=await http('4:3'),shown=t=>Array.from(c.snapshot(t).callouts||[],k=>k.text+' '+k.label);
 const sub=c.events.find(e=>e.type==='subscribe'&&e.edge==='http-observer');
 assert.deepEqual(shown(sub.at),['.subscribe() A']);assert.deepEqual(shown(0),[]);
 for(const stop of c.stops)assert.deepEqual(shown(stop.time),[],stop.id);
});

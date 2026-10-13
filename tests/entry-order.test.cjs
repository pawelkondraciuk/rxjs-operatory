const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {modules}=require('./v2-harness.cjs');
// Wszystkie warianty z index.html (4:3), jak w main.js.
async function deck(){
 class Slide{
  constructor(id){this.id=id;this.dataset={animation:id};this.heading={};this.player={setAttribute(){}};}
  querySelector(s){return s==='h2'?this.heading:this.player;}
  cloneNode(){return new Slide(this.id);}
  after(){}
 }
 const slides=[...fs.readFileSync('index.html','utf8').matchAll(/data-animation="([^"]+)"/g)].map(m=>new Slide(m[1]));
 const m=await modules(['catalog','presentation','engine'],{document:{querySelectorAll:()=>slides}});
 const scenes=new Map([...m.presentation.prepareSlides(m.catalog.scenes,{format:'4:3'})].filter(([id])=>id!=='01-tytul'));
 return {scenes,compile:m.engine.compileScene};
}
const samples=c=>[...new Set([...c.checkpoints,...Array.from({length:Math.ceil(c.duration*10)+1},(_,i)=>Math.min(c.duration,i/10))])];

test('connections, tokens and histories appear only with fully visible tiles',async()=>{
 const {scenes,compile}=await deck();
 for(const scene of scenes.values()){
  const c=compile(scene);
  for(const t of samples(c)){
   const f=c.snapshot(t),op=new Map(f.nodes.map(n=>[n.id,n.visible?(n.opacity??1):0]));
   for(const e of f.edges.filter(e=>e.visible))assert.ok(op.get(e.from)>.999&&op.get(e.to)>.999,`${scene.id} @${t} ${e.id}`);
   for(const k of f.tokens.filter(k=>k.edge)){const e=f.edges.find(x=>x.id===k.edge);if(e)assert.ok(op.get(e.from)>0&&op.get(e.to)>0,`${scene.id} @${t} ${k.value}`);}
   for(const h of f.histories.filter(h=>h.values.length&&op.has(h.anchor)))assert.ok(op.get(h.anchor)>0,`${scene.id} @${t} ${h.anchor}`);
  }
 }
});

test('a tile shows complete or error only once it sends it, or receives it as a receiver',async()=>{
 const {scenes,compile}=await deck();
 for(const scene of scenes.values()){
  const c=compile(scene),records=[...c.plan.records.values()];
  for(const t of samples(c))for(const n of c.snapshot(t).nodes){
   if(!n.visible||n.workRow||!/complete|error/.test(n.status||''))continue;
   const sent=records.filter(r=>r.a.id===n.id&&r.end&&['complete','error'].includes(r.end.kind)).map(r=>r.end.at);
   const got=records.filter(r=>r.b.id===n.id&&r.end&&['complete','error'].includes(r.end.kind)).map(r=>r.end.at+(r.end.duration||0));
   const own=sent.length?Math.min(...sent):got.length?Math.min(...got):-Infinity;
   assert.ok(t>=own-1e-6,`${scene.id} ${n.id} „${n.status}” @${t}, terminal @${own}`);
  }
 }
});

test('the error source shows the error before operators downstream, and the outer source is detached after it arrives',async()=>{
 const {scenes,compile}=await deck();
 const c=compile(scenes.get('b04-catcherror'));
 const sent=c.events.find(e=>e.type==='stream-error'&&e.edge==='http-a-switch').at;
 const arrived=c.events.find(e=>e.type==='disconnected'&&e.edge==='http-a-switch').at;
 const detach=c.events.find(e=>e.type==='inner-unsubscribe'&&e.edge==='clicks-switch').at;
 assert.ok(detach>=arrived,`klik$ odłączony @${detach}, błąd dotarł @${arrived}`);
 const http=c.snapshot(sent+.05).nodes.find(n=>n.id==='http-a');
 assert.equal(http.workState,'errored');assert.equal(http.showProgress,false);
 assert.notEqual(c.snapshot(sent+.05).nodes.find(n=>n.id==='switch').workState,'errored');
 for(const id of ['b04-catcherror','b04-catcherror-2']){
  const model=compile(scenes.get(id)),error=model.events.find(e=>e.type==='stream-error'&&e.edge.startsWith('http-a-')).at;
  assert.notEqual(model.snapshot(error+.1).nodes.find(n=>n.id==='http-a').status,'praca trwa',id);
 }
});

test('„subskrybuje” needs a drawn connection: not before it, not after unsubscribe starts',async()=>{
 const {scenes,compile}=await deck();
 for(const scene of scenes.values()){
  const c=compile(scene),records=[...c.plan.records.values()];
  for(const t of samples(c))for(const n of c.snapshot(t).nodes.filter(n=>n.visible&&n.status==='subskrybuje'&&!n.workRow&&!n.inner)){
   const wires=records.filter(r=>r.b.id===n.id&&!r.internal);
   if(!wires.length)continue;
   assert.ok(wires.some(r=>t>=r.start+r.connectDuration&&!(r.end&&t>=r.end.at)),`${scene.id} ${n.id} @${t}`);
  }
 }
});

test('the same value keeps its colour in both distinctUntilChanged branches',async()=>{
 const {scenes,compile}=await deck();
 const c=compile(scenes.get('14-distinct')),colours=new Map();
 for(const r of c.plan.records.values())for(const e of r.events){
  colours.set(e.value,colours.get(e.value)||new Set());colours.get(e.value).add(e.color);
 }
 for(const [value,set] of colours)assert.equal(set.size,1,`${value}: ${[...set]}`);
});

test('manual question stops do not reveal the replayed value or freeze fading capsules',async()=>{
 const {scenes,compile}=await deck();
 for(const id of ['20-sharereplay','20-sharereplay-2']){
  const c=compile(scenes.get(id)),stop=c.stops.find(s=>s.id==='question'),f=c.snapshot(stop.time);
  assert.equal(f.tokens.length,0,id);
  assert.ok(f.edges.find(e=>e.id==='hub-receiver1').progress>.99,id);
 }
 const micro=compile(scenes.get('27-resolver-microtask')),stop=micro.stops.find(s=>s.id==='scheduled');
 for(const h of micro.snapshot(stop.time).histories)for(const v of h.values)assert.ok(stop.time-v.shownAt>=.3-1e-6,h.anchor);
});

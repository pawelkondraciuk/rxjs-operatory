const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {modules}=require('./v2-harness.cjs');
// Wszystkie warianty z index.html, przygotowane w wybranym formacie jak w main.js.
async function deck(format){
 class Slide{
  constructor(id){this.id=id;this.dataset={animation:id};this.heading={};this.player={setAttribute(){}};}
  querySelector(s){return s==='h2'?this.heading:this.player;}
  cloneNode(){return new Slide(this.id);}
  after(){}
 }
 const slides=[...fs.readFileSync('index.html','utf8').matchAll(/data-animation="([^"]+)"/g)].map(m=>new Slide(m[1]));
 const m=await modules(['catalog','presentation','engine','renderer','lifecycle'],{document:{querySelectorAll:()=>slides}});
 return {scenes:[...m.presentation.prepareSlides(m.catalog.scenes,{format}).values()].filter(s=>s.id!=='01-tytul'),
  compile:m.engine.compileScene,render:m.renderer.renderScene,stretch:m.lifecycle.stretchGraph};
}

test('4:3 diagrams fill the taller stage and keep every block inside the viewBox',async()=>{
 const {scenes,compile,render}=await deck('4:3');
 assert.ok(scenes.length>=54,String(scenes.length));
 for(const scene of scenes){
  const c=compile(scene);
  for(const time of [0,...c.stops.map(s=>s.time),c.duration]){
   const f=c.snapshot(time);
   assert.equal(f.height,scene.id==='05-zrodla-3'?500:scene.playerLayout?612:535,scene.id);
   assert.ok(f.textScale>=1.15,scene.id);
   for(const n of f.nodes.filter(n=>n.visible)){
    assert.ok(n.x-n.w/2>=-1&&n.x+n.w/2<=f.width+1,scene.id+' '+n.id+' poziomo');
    assert.ok(n.y-n.h/2>=-1&&n.y+n.h/2<=f.height+1,scene.id+' '+n.id+' pionowo');
   }
   for(const p of f.panels)assert.ok(p.y>=0&&p.y+p.h<=f.height+1,scene.id+' panel');
   for(const h of f.histories)assert.ok(h.y>0&&h.y+(h.lines>1?(h.lines-1)*(h.lineStep||0):0)<f.height,scene.id+' '+h.anchor+' historia');
   assert.match(render(f),new RegExp(`viewBox="0 0 ${f.width} ${f.height}"`));
  }
 }
});

test('16:9 keeps the previous geometry and SVG of every variant',async()=>{
 const {scenes,compile,render}=await deck('16:9');
 for(const scene of scenes){
  const wide=compile(scene),legacy=compile({...scene,format:undefined});
  for(const time of [0,...wide.stops.map(s=>s.time),wide.duration])
   assert.equal(render(wide.snapshot(time)),render(legacy.snapshot(time)),scene.id+' @'+time);
  // Slajdy torów (04a-dwa-tory(-2,-3), 04-operator, cała rodzina 05-zrodla i share 20-sharereplay) mają w obu formatach wspólne,
  // powiększone wymiary pod projektor (graph.textScale).
  if(!/^(04a-dwa-tory|04-operator$|05-zrodla(-[23])?$|20-sharereplay$)/.test(scene.id))assert.equal(wide.snapshot(0).textScale,1);
 }
});

test('4:3 slot rows grow and stay inside the jobs panel',async()=>{
 const {scenes,compile}=await deck('4:3');
 for(const id of ['09-concatmap','10-mergemap','11-switchmap','12-exhaustmap','13-limit']){
  const jobs=compile(scenes.find(s=>s.id===id)).snapshot(0).panels.find(p=>p.id==='jobs');
  assert.ok(jobs.rowHeight>=60,id);
  assert.ok(jobs.rowsTop+(Math.max(4,jobs.slots)-1)*jobs.rowStep+jobs.rowHeight<=jobs.y+jobs.h,id);
 }
});

test('stretchGraph scales fixed layouts vertically, caps growth and centres the result',async()=>{
 const {stretch}=await deck('4:3');
 const graph={layout:'fixed',width:1240,height:400,nodes:[{id:'a',x:100,y:100,h:60,labelOffset:-10}],
  edges:[{from:'a',to:'a',points:[[0,100],[10,200]]}],trays:[{anchor:'a',x:100,y:200}],
  panels:[{x:0,y:150,w:100,h:200,from:{x:50,y:130}}],tokens:[{x:5,y:50}]};
 const out=stretch(graph,560);
 assert.equal(out.height,560);
 assert.deepEqual([out.nodes[0].y,out.nodes[0].h,out.nodes[0].labelOffset],[140,84,-14]);
 assert.deepEqual(out.edges[0].points.map(p=>[...p]),[[0,140],[10,280]]);
 assert.deepEqual([out.trays[0].y,out.panels[0].y,out.panels[0].h,out.panels[0].from.y,out.tokens[0].y],[280,210,280,182,70]);
 const capped=stretch({...graph,height:200},560);
 assert.deepEqual([capped.nodes[0].y,capped.nodes[0].h],[100*1.4+(560-280)/2,84]);
 assert.equal(graph.nodes[0].y,100,'wejście bez zmian');
});

test('4:3 tile labels grow to 1.3× when they fit and keep 1.15× for long names',async()=>{
 const {scenes,compile,render}=await deck('4:3');
 const label=(id,node)=>{
  const scene=scenes.find(s=>s.id===id),svg=render(compile(scene).snapshot(0));
  const group=svg.match(new RegExp(`<g data-node="${node}"[^>]*>(.*?)</g>`))[1];
  return Number(group.match(/<text[^>]*font-size="([^"]+)"/)[1]);
 };
 assert.equal(label('09-concatmap','source'),41.6); // Powiększony nagłówek tylko concatMap.
 assert.equal(label('12-exhaustmap','source'),41.6); // Odbiorca jest teraz wierszem bez nagłówka.
 assert.equal(label('14-distinct','distinct'),29.9);
});

test('04-operator in 4:3 is a centred lane pipeline and the receiver row shows 2, 4, 6',async()=>{
 const {scenes,compile,render}=await deck('4:3');
 const c=compile(scenes.find(s=>s.id==='04-operator')),end=c.snapshot(c.duration);
 assert.equal(end.textScale,1.42);
 const tiles=end.nodes.filter(n=>['source','map','observer'].includes(n.id));
 const top=Math.min(...tiles.map(n=>n.y-n.h/2)),bottom=Math.max(...tiles.map(n=>n.y+n.h/2));
 assert.ok(Math.abs((top+bottom)/2-end.height/2)<2,'wyśrodkowane w pionie');
 const left=Math.min(...tiles.map(n=>n.x-n.w/2)),right=Math.max(...tiles.map(n=>n.x+n.w/2));
 assert.ok(Math.abs((left+right)/2-end.width/2)<2,'wyśrodkowane w poziomie');
 const svg=render(end),received=[...svg.matchAll(/data-token="received"[^>]*>.*?<text[^>]*>([^<]*)<\/text>/g)].map(m=>m[1]);
 assert.deepEqual(received,['2','4','6']);
 const label=Number(svg.match(/<g data-node="source"[^>]*>.*?<text[^>]*font-size="([^"]+)"/)[1]);
 assert.ok(label>=40,String(label));
});

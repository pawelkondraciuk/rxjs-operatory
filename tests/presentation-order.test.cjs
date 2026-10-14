const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {modules}=require('./v2-harness.cjs');

const expectedMain=['05-zrodla-2','05-zrodla','04-operator','04a-dwa-tory','04a-dwa-tory-2','04a-dwa-tory-3','05-zrodla-3',
 '20-sharereplay','20-sharereplay-2','08-map-strumienie','09-concatmap','10-mergemap','11-switchmap','12-exhaustmap',
 'b04-catcherror','b04-catcherror-2','14-distinct','16-czas-cztery','25-podsumowanie','pytania'];

async function presentation(options={}){
 const container={children:[],append(slide){slide.remove();this.children.push(slide);slide.parent=this;},
  querySelectorAll(){return this.children.filter(s=>s.id);}};
 class Slide{
  constructor(id,animation,extra=false){this.id=id;this.dataset=animation?{animation}:{};this.extra=extra;this.heading={};this.player={setAttribute(){}};this.back=extra?this.link():null;}
  link(){return {remove:()=>{this.back=null;}};}
  querySelector(selector){return selector==='h2'?this.heading:selector==='.rx-player'?this.player:selector==='.extras-back'?this.back:null;}
  cloneNode(){return new Slide(this.id,this.dataset.animation,this.extra);}
  after(slide){slide.remove();this.parent.children.splice(this.parent.children.indexOf(this)+1,0,slide);slide.parent=this.parent;}
  remove(){if(this.parent){this.parent.children.splice(this.parent.children.indexOf(this),1);this.parent=null;}}
  setAttribute(name){if(name==='data-extras')this.extra=true;}
  removeAttribute(name){if(name==='data-extras')this.extra=false;}
  append(link){this.back=link;link.remove=()=>{this.back=null;};}
 }
 const html=fs.readFileSync('index.html','utf8');
 for(const [tag] of html.matchAll(/<section\b[^>]*>/g)){
  const id=tag.match(/\bid="([^"]+)"/)?.[1]||'',animation=tag.match(/data-animation="([^"]+)"/)?.[1];
  container.append(new Slide(id,animation,/data-extras/.test(tag)));
 }
 const opening=container.children.slice(0,10);
 const document={querySelector:()=>container,querySelectorAll:()=>container.children.filter(s=>s.dataset.animation),createElement:()=>({})};
 const m=await modules(['catalog','presentation','scene-config','engine'],{document});
 const scenes=m.presentation.prepareSlides(m.catalog.scenes);
 const prepared=container.children.slice();
 const route=m.presentation.arrangeSlides(scenes,options);
 return {container,opening,scenes,prepared,route,config:m['scene-config'],compile:m.engine.compileScene};
}

test('MAIN preserves the opening and orders final variants independently, ending on questions',async()=>{
 const {container,opening,scenes}=await presentation();
 assert.equal(container.children.length,30);
 assert.deepEqual(container.children.slice(0,10),opening);
 assert.deepEqual(container.children.slice(10).map(s=>s.id),expectedMain);
 for(const slide of container.children){assert.equal(slide.extra,false,slide.id);assert.equal(slide.back,null,slide.id);}
 for(const id of expectedMain.filter(id=>id!=='pytania'))assert.equal(scenes.get(id).group,'main',id);
});

test('EXTRAS preserves every demo once and starts with the three-slide follow-up',async()=>{
 const {container,prepared,config}=await presentation({extras:true});
 const ids=container.children.map(s=>s.id);
 assert.equal(ids.length,65);
 assert.deepEqual(ids.slice(10,30),expectedMain);
 assert.deepEqual(ids.slice(30,33),['12a-complete','12a-complete-2','13-limit']);
 assert.deepEqual(ids.slice(30),Array.from(config.extraOrder));
 assert.deepEqual(ids.filter(Boolean).sort(),prepared.map(s=>s.id).filter(Boolean).sort());
 assert.equal(new Set(ids.filter(Boolean)).size,ids.filter(Boolean).length);
 for(const slide of container.children.slice(30)){assert.equal(slide.extra,true,slide.id);assert.ok(slide.back,slide.id);}
});

test('direct hashes route exact variants, including time operators and the standalone hot extra',async()=>{
 for(const requestedId of ['06a-cold-hot-2','16-czas-cztery-2','16-czas-cztery-3','18-async-2','28-resolver-batch']){
  const {container,route}=await presentation({requestedId});assert.equal(route.extras,true,requestedId);assert.equal(container.children.length,65);
 }
 for(const requestedId of ['06a-cold-hot','16-czas-cztery','04-operator','unknown']){
  const {container,route}=await presentation({requestedId});assert.equal(route.extras,false,requestedId);assert.equal(container.children.length,30);
 }
});

test('print includes every expanded slide once, with main narration before extras',async()=>{
 const {container,prepared}=await presentation({printMode:true});
 assert.equal(container.children.length,65);
 assert.deepEqual(container.children.map(s=>s.id).filter(Boolean).sort(),prepared.map(s=>s.id).filter(Boolean).sort());
 assert.deepEqual(container.children.slice(10,30).map(s=>s.id),expectedMain);
});

test('removed comparisons stay absent from MAIN, EXTRAS, print and direct hashes',async()=>{
 const removed=['06a-cold-hot','07-hot-cold','07-hot-cold-2'];
 for(const options of [{},{extras:true},{printMode:true},...removed.map(requestedId=>({requestedId}))]){
  const {container,scenes,prepared,compile}=await presentation(options);
  for(const id of removed){
   assert.ok(!prepared.some(s=>s.id===id),id+' is not generated');
   assert.ok(!container.children.some(s=>s.id===id),id+' is not routed');
   assert.equal(scenes.has(id),false,id+' has no catalog scene');
  }
  for(const id of ['20-sharereplay','20-sharereplay-2']){
   assert.equal(container.children.filter(s=>s.id===id).length,1,id);
   const c=compile(scenes.get(id));
   assert.equal(c.snapshot(c.duration).executionCounts.started,id.endsWith('-2')?1:2,id);
  }
 }
 const {scenes,compile}=await presentation({requestedId:'06a-cold-hot-2'});
 const hot=scenes.get('06a-cold-hot-2'),c=compile(hot),end=c.snapshot(c.duration);
 assert.equal(hot.comparisonMode,'shared');assert.equal(hot.group,'bonus');
 assert.deepEqual(Array.from(end.histories.find(h=>h.anchor==='receiver1').values,e=>e.value),['2','3','4','5','6']);
});

test('combined time operators compare the same input and stop on audit before debounce',async()=>{
 const {scenes,compile}=await presentation(),scene=scenes.get('16-czas-cztery'),c=compile(scene);
 assert.equal(scene.playback.entry,'manual');assert.equal(scene.playback.finish,'hold');
 assert.deepEqual(Array.from(scene.seriesIndices),[1,2]);
 assert.deepEqual(Array.from(c.stops,s=>s.id),['question','audit','debounce']);
 const input=id=>Array.from(c.plan.records.get('source-op'+id).events,e=>[e.logicalAt,e.value]);
 assert.deepEqual(input(1),input(2));
 assert.equal(c.snapshot(0).nodes.length,5);
 const history=(f,id)=>Array.from(f.histories.find(h=>h.anchor==='sink'+id).values,e=>e.value);
 const question=c.snapshot(c.stops[0].time),audit=c.snapshot(c.stops[1].time),debounce=c.snapshot(c.stops[2].time);
 assert.deepEqual(history(question,1),[]);assert.deepEqual(history(question,2),[]);
 assert.deepEqual(history(audit,1),[]);assert.deepEqual(history(audit,2),['D']);
 assert.deepEqual(history(debounce,1),['G']);assert.deepEqual(history(debounce,2),['D','G']);
 const end=c.snapshot(c.duration);
 assert.deepEqual(history(end,1),['G','I','J']);assert.deepEqual(history(end,2),['D','G','I','J']);
 assert.ok(Array.from(c.plan.records.values()).every(e=>!e.end),'ongoing source does not complete');
 assert.equal(scenes.get('16-czas-cztery-2').group,'bonus');
 for(const id of ['08-map-strumienie','09-concatmap','10-mergemap','11-switchmap','12-exhaustmap','12a-complete','13-limit'])assert.notEqual(scenes.get(id).playback.controller,'stages',id);
 for(const id of ['04-operator','05-zrodla','05-zrodla-2','05-zrodla-3','20-sharereplay','20-sharereplay-2'])assert.equal(scenes.get(id).playback.controller,'stages',id);
});

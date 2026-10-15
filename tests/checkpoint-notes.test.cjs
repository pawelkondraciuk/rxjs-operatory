const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {modules}=require('./v2-harness.cjs');
const ids=['ready','subscribed-a','subscribed-b','connect-http','request','received','multicast','complete','finished'];
function slide(id='05-zrodla-3'){
 const html=fs.readFileSync('index.html','utf8');
 const source=html.match(/<template data-checkpoint-notes="05-zrodla-3">([\s\S]*?)<\/template>/)[1];
 const entries=[...source.matchAll(/<div data-checkpoint="([^"]+)">([\s\S]*?)<\/div>/g)]
  .map(([,checkpoint,innerHTML])=>({dataset:{checkpoint},innerHTML}));
 const template={content:{querySelectorAll:()=>entries}};
 const note={innerHTML:'existing variant notes'};
 const markers=ids.slice(1).map(stop=>({dataset:stop==='finished'?{handoff:'true'}:{stop},children:[],append(n){this.children.push(n);}}));
 return {id,note,markers,entries,ownerDocument:{createElement:()=>({})},
  querySelector:s=>s==='aside.notes'?note:s===`template[data-checkpoint-notes="05-zrodla-3"]`?template:null,
  querySelectorAll:()=>markers};
}
test('Subject checkpoint notes use native Reveal fragment notes and keep READY separate',async()=>{
 const {['checkpoint-notes']:m}=await modules(['checkpoint-notes']);const s=slide();
 assert.equal(m.prepareCheckpointNotes(s),true);
 assert.deepEqual(s.entries.map(n=>n.dataset.checkpoint),ids);
 assert.match(s.note.innerHTML,/0 — Wprowadzenie/);
 assert.doesNotMatch(s.note.innerHTML,/8 — Przejście/);
 for(const [i,marker] of s.markers.entries()){
  assert.equal(marker.children.length,1);assert.equal(marker.children[0].className,'notes');
  assert.equal(marker.children[0].innerHTML,s.entries[i+1].innerHTML);
 }
 assert.match(s.markers.at(-1).children[0].innerHTML,/musielibyśmy sami.*anulowanie/s);
});
test('checkpoint notes leave other variants untouched and print uses the final explanation',async()=>{
 const {['checkpoint-notes']:m}=await modules(['checkpoint-notes']);
 for(const id of ['05-zrodla','05-zrodla-2','04a-dwa-tory-2']){
  const s=slide(id);assert.equal(m.prepareCheckpointNotes(s),false);assert.equal(s.note.innerHTML,'existing variant notes');
  assert.ok(s.markers.every(marker=>marker.children.length===0));
 }
 const s=slide();s.markers=[];m.prepareCheckpointNotes(s,{printMode:true});assert.match(s.note.innerHTML,/8 — Przejście/);
});
test('missing checkpoint notes fail explicitly instead of retaining a stale explanation',async()=>{
 const {['checkpoint-notes']:m}=await modules(['checkpoint-notes']);const s=slide();
 s.entries.splice(4,1);assert.throws(()=>m.prepareCheckpointNotes(s),/brak notatki checkpointu request/);
});

test('Notes receiver restores the requested frame only for a matching template and trusted parent',async()=>{
 const {['checkpoint-notes']:m}=await modules(['checkpoint-notes']);
 const s=slide(),calls=[];s.markers.forEach((marker,i)=>marker.dataset.time=String(i+1));
 const parent={},listeners=[];
 const view={parent,location:{origin:'http://localhost'},frameElement:{parentElement:{id:'current-slide'}},addEventListener:(type,fn,capture)=>listeners.push({type,fn,capture})};
 const deck={getSlide:()=>s,setState:state=>calls.push(['state',state.indexf])};
 const stages={restore:action=>{calls.push(['restore']);action();}};
 const player={duration:20,controller:{seek:time=>calls.push(['seek',time])}};
 m.installCheckpointNotesReceiver(deck,stages,{view,getPlayer:()=>player});
 assert.equal(listeners.length,1);assert.equal(listeners[0].capture,true);
 const send=(indexf,extra={})=>listeners[0].fn({source:parent,origin:view.location.origin,data:JSON.stringify({method:'setState',args:[{indexh:14,indexv:0,indexf}]}),stopImmediatePropagation:()=>calls.push(['stop']),...extra});
 send(4);assert.deepEqual(calls,[['stop'],['restore'],['state',4],['seek',5]]);
 calls.length=0;send(7);assert.equal(calls.at(-1)[1],20);
 calls.length=0;send(-1);assert.equal(calls.at(-1)[1],0);
 calls.length=0;send(4,{origin:'http://untrusted'});send(4,{source:{}});assert.equal(calls.length,0);
 s.id='05-zrodla-2';send(4);assert.equal(calls.length,0);
});

test('restoring fragment state does not turn Notes synchronization into pilot actions',async()=>{
 const {revealMock}=require('./v2-harness.cjs');
 const {['reveal-stages']:m}=await modules(['reveal-stages']);
 const {deck,stage}=revealMock();let checkpointIndex=0,next=0,previous=0,changed;
 const controller={get state(){return {checkpointIndex,state:'paused'};},subscribe:fn=>{changed=fn;return()=>{};},
  next(){next++;},previous(){previous++;},seek(index){checkpointIndex=index;changed?.();}};
 const adapter=m.installRevealStages(deck,{getController:()=>controller});adapter.refresh();
 adapter.restore(()=>{deck.navigateFragment(1);controller.seek(2);});
 assert.equal(deck.fragmentIndex,1);assert.equal(next,0);assert.equal(previous,0);
 adapter.restore(()=>{deck.navigateFragment(-1);controller.seek(0);});
 assert.equal(deck.fragmentIndex,-1);assert.equal(next,0);assert.equal(previous,0);
 deck.press(39);assert.equal(next,1);adapter.destroy();
});

test('an uninitialized Notes preview cannot rewind the main slide before its handshake',async()=>{
 const {['checkpoint-notes']:m}=await modules(['checkpoint-notes']);const s=slide(),calls=[];let listener;
 s.markers.forEach((marker,i)=>marker.dataset.time=String(i+1));
 const view={location:{origin:'http://localhost'},addEventListener:(type,fn)=>listener=fn};view.parent=view;
 const popup={opener:view};
 const deck={getSlide:()=>s,setState:state=>calls.push(['state',state.indexf])};
 m.installCheckpointNotesReceiver(deck,{restore:fn=>fn()},{view,getPlayer:()=>({duration:20,controller:{seek:time=>calls.push(['seek',time])}})});
 const send=data=>listener({source:popup,origin:view.location.origin,data:JSON.stringify(data),stopImmediatePropagation:()=>calls.push(['stop'])});
 send({method:'setState',args:[{indexh:14,indexf:-1}]});assert.deepEqual(calls,[['stop']]);
 calls.length=0;send({namespace:'reveal-notes',type:'connected'});
 send({method:'setState',args:[{indexh:14,indexf:3}]});assert.deepEqual(calls,[['stop'],['state',3],['seek',4]]);
});

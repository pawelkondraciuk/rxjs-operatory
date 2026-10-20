const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {modules}=require('./v2-harness.cjs');
const ids=['ready','defined','connect-http','multicast','complete','finished'];
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
 assert.doesNotMatch(s.note.innerHTML,/6 — Podsumowanie/);
 for(const [i,marker] of s.markers.entries()){
  assert.equal(marker.children.length,1);assert.equal(marker.children[0].className,'notes');
  assert.equal(marker.children[0].innerHTML,s.entries[i+1].innerHTML);
 }
 assert.match(s.markers.at(-1).children[0].innerHTML,/Ale sami musieliśmy podłączyć źródło\. Czy RxJS może zrobić to za nas\?/);
});
test('checkpoint notes leave other variants untouched and print uses the final explanation',async()=>{
 const {['checkpoint-notes']:m}=await modules(['checkpoint-notes']);
 for(const id of ['05-zrodla','06-subskrypcja']){
  const s=slide(id);assert.equal(m.prepareCheckpointNotes(s),false);assert.equal(s.note.innerHTML,'existing variant notes');
  assert.ok(s.markers.every(marker=>marker.children.length===0));
 }
 const s=slide();s.markers=[];m.prepareCheckpointNotes(s,{printMode:true});assert.match(s.note.innerHTML,/5 — Podsumowanie/);
});
test('missing checkpoint notes fail explicitly instead of retaining a stale explanation',async()=>{
 const {['checkpoint-notes']:m}=await modules(['checkpoint-notes']);const s=slide();
 s.entries.splice(3,1);assert.throws(()=>m.prepareCheckpointNotes(s),/brak notatki checkpointu multicast/);
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
 send(3);assert.deepEqual(calls,[['stop'],['restore'],['state',3],['seek',4]]);
 calls.length=0;send(4);assert.equal(calls.at(-1)[1],20);
 calls.length=0;send(-1);assert.equal(calls.at(-1)[1],0);
 calls.length=0;send(4,{origin:'http://untrusted'});send(4,{source:{}});assert.equal(calls.length,0);
 s.id='05-zrodla';send(4);assert.equal(calls.length,0);
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

test('the main window ignores every setState from the Notes window, before and after the handshake',async()=>{
 const {['checkpoint-notes']:m}=await modules(['checkpoint-notes']);const s=slide(),calls=[];let listener;
 s.markers.forEach((marker,i)=>marker.dataset.time=String(i+1));
 const view={location:{origin:'http://localhost'},addEventListener:(type,fn)=>listener=fn};view.parent=view;
 const popup={opener:view};
 const deck={getSlide:()=>s,setState:state=>calls.push(['state',state.indexf])};
 m.installCheckpointNotesReceiver(deck,{restore:fn=>fn()},{view,getPlayer:()=>({duration:20,controller:{seek:time=>calls.push(['seek',time])}})});
 const send=data=>listener({source:popup,origin:view.location.origin,data:JSON.stringify(data),stopImmediatePropagation:()=>calls.push(['stop'])});
 send({method:'setState',args:[{indexh:14,indexf:-1}]});assert.deepEqual(calls,[['stop']]);
 calls.length=0;send({namespace:'reveal-notes',type:'connected'});assert.deepEqual(calls,[],'handshake przechodzi do pluginu');
 send({method:'setState',args:[{indexh:14,indexf:3}]});assert.deepEqual(calls,[['stop']],'podgląd nie steruje główną prezentacją');
 s.id='05-zrodla';calls.length=0;send({method:'setState',args:[{indexh:3,indexf:0}]});assert.deepEqual(calls,[['stop']],'także slajdy bez szablonu');
 // Inne okna (nie Notes otwarte z tej prezentacji) nie są dotykane.
 calls.length=0;listener({source:{},origin:view.location.origin,data:JSON.stringify({method:'setState',args:[{indexh:1}]}),stopImmediatePropagation:()=>calls.push(['stop'])});
 assert.deepEqual(calls,[]);
});

test('keys pressed in the Notes window reach the main deck like the remote; the preview frame never navigates itself',async()=>{
 const {['checkpoint-notes']:m}=await modules(['checkpoint-notes']);
 const main={location:{origin:'http://localhost'},listeners:[],addEventListener(type,fn){this.listeners.push(fn);}};main.parent=main;
 const speaker={opener:main};
 const keys=[];const doc={listeners:[],addEventListener(type,fn,capture){this.listeners.push({type,fn,capture});}};
 const frame={location:{origin:'http://localhost'},parent:speaker,frameElement:{parentElement:{id:'current-slide'}},document:doc,
  listeners:[],addEventListener(type,fn,capture){this.listeners.push({type,fn,capture});}};
 main.postMessage=undefined;speaker.opener.postMessage=(data,origin)=>{for(const fn of main.listeners)fn({source:frame,origin,data});};
 m.installNotesKeyBridge({triggerKey:k=>keys.push(['frame',k])},frame);
 m.installNotesKeyBridge({triggerKey:k=>keys.push(['main',k])},main);
 assert.equal(frame.listeners[0].capture,true);assert.equal(doc.listeners[0].capture,true);
 let stopped=0;
 frame.listeners[0].fn({source:speaker,origin:'http://localhost',data:JSON.stringify({method:'triggerKey',args:[39]}),stopImmediatePropagation:()=>stopped++});
 assert.deepEqual(keys,[['main',39]]);assert.equal(stopped,1,'ramka nie obsługuje triggerKey sama');
 let prevented=0;
 doc.listeners[0].fn({keyCode:37,preventDefault:()=>prevented++,stopImmediatePropagation:()=>{}});
 assert.deepEqual(keys,[['main',39],['main',37]]);assert.equal(prevented,1);
 // S (kolejne okno Notes) i W (przeładowanie formatu) nie są przekazywane.
 frame.listeners[0].fn({source:speaker,origin:'http://localhost',data:JSON.stringify({method:'triggerKey',args:[83]}),stopImmediatePropagation:()=>{}});
 frame.listeners[0].fn({source:speaker,origin:'http://localhost',data:JSON.stringify({method:'triggerKey',args:[87]}),stopImmediatePropagation:()=>{}});
 assert.equal(keys.length,2);
 // Główne okno przyjmuje klawisze tylko od ramki podglądu okna Notes otwartego z tej prezentacji.
 for(const fn of main.listeners)fn({source:{parent:{opener:{}},frameElement:{parentElement:{id:'current-slide'}}},origin:'http://localhost',data:JSON.stringify({namespace:'rx-notes',type:'key',keyCode:39})});
 for(const fn of main.listeners)fn({source:frame,origin:'http://evil',data:JSON.stringify({namespace:'rx-notes',type:'key',keyCode:39})});
 assert.equal(keys.length,2);
 // Ramka upcoming nie przekazuje niczego.
 const upcoming={...frame,frameElement:{parentElement:{id:'upcoming-slide'}},listeners:[],addEventListener(){this.listeners.push(1);}};
 m.installNotesKeyBridge({triggerKey(){}},upcoming);assert.equal(upcoming.listeners.length,0);
});

test('a Notes preview frame shows the still checkpoint frame and never plays',async()=>{
 const {['checkpoint-notes']:m}=await modules(['checkpoint-notes']);
 const marker=(time,visible,handoff=false)=>({dataset:{time:String(time),...(handoff?{handoff:'true'}:{})},visible});
 const slideWith=markers=>({querySelectorAll:sel=>markers.filter(x=>sel.includes('.visible')?x.visible:true)});
 const calls=[],staged={duration:9,controller:{seekCheckpoint:(t,f)=>calls.push(['checkpoint',t,f]),reset:()=>calls.push(['reset'])},play:()=>calls.push(['play'])};
 m.showNotesPreviewFrame(slideWith([marker(1,true),marker(2,true),marker(2,false,true)]),staged);
 m.showNotesPreviewFrame(slideWith([marker(1,true),marker(2,true),marker(2,true,true)]),staged);
 m.showNotesPreviewFrame(slideWith([marker(1,false)]),staged);
 assert.deepEqual(calls,[['checkpoint',2,false],['checkpoint',2,true],['reset']]);
 calls.length=0;const stepped={duration:9,seek:t=>calls.push(['seek',t]),finish:()=>calls.push(['finish']),play:()=>calls.push(['play'])};
 m.showNotesPreviewFrame(slideWith([marker(3,true),marker(3,true,true)]),stepped);
 m.showNotesPreviewFrame(slideWith([marker(3,false)]),stepped);
 m.showNotesPreviewFrame(slideWith([]),stepped);m.showNotesPreviewFrame(slideWith([]),stepped,{still:true});
 assert.deepEqual(calls,[['seek',9],['seek',0],['finish']]);
});


test('the Notes current-slide preview mirrors the painted frames of the main window for the same slide',async()=>{
 const {['checkpoint-notes']:m}=await modules(['checkpoint-notes']);
 const part=()=>({_v:'',writes:0,get innerHTML(){return this._v;},set innerHTML(v){this._v=v;this.writes++;}});
 const playerRoot=()=>{const parts={'.rx-code':part(),'.rx-stage':part(),'.rx-caption':part(),'.rx-metrics':part()};
  return {parts,querySelector:s=>parts[s]};};
 const mainSlide={id:'09-concatmap',root:playerRoot()},otherSlide={id:'10-mergemap',root:playerRoot()};
 let mainCurrent=mainSlide;
 const main={location:{origin:'http://localhost'}};main.parent=main;
 const mirror=m.installNotesMirror({getCurrentSlide:()=>mainCurrent},{view:main,getRoot:s=>s.root});
 const frameSlide={id:'09-concatmap',root:playerRoot()};let frameCurrent=frameSlide;
 const frame={location:{origin:'http://localhost'},parent:{opener:main},frameElement:{parentElement:{id:'current-slide'}},addEventListener(){}};
 const preview=m.installNotesMirror({getCurrentSlide:()=>frameCurrent},{view:frame,getRoot:s=>s.root});
 mainSlide.root.parts['.rx-stage'].innerHTML='<svg>t1</svg>';mainSlide.root.parts['.rx-caption'].innerHTML='A';
 mirror.notify(mainSlide);
 assert.equal(frameSlide.root.parts['.rx-stage'].innerHTML,'<svg>t1</svg>');assert.equal(frameSlide.root.parts['.rx-caption'].innerHTML,'A');
 const writes=frameSlide.root.parts['.rx-stage'].writes;mirror.notify(mainSlide);
 assert.equal(frameSlide.root.parts['.rx-stage'].writes,writes,'bez zmian kadru nie ma zapisu DOM');
 // Kadr innego slajdu (główne okno już dalej) nie trafia do ramki; pull po własnym kadrze ramki przywraca lustro.
 mirror.notify(otherSlide);assert.equal(frameSlide.root.parts['.rx-stage'].innerHTML,'<svg>t1</svg>');
 frameSlide.root.parts['.rx-stage'].innerHTML='<svg>still</svg>';
 assert.equal(preview.pull(),true);assert.equal(frameSlide.root.parts['.rx-stage'].innerHTML,'<svg>t1</svg>');
 mainCurrent=otherSlide;assert.equal(preview.pull(),false,'inny slajd w głównym oknie — zostaje nieruchomy kadr');
 // Ramka upcoming nie subskrybuje lustra.
 const upcoming=m.installNotesMirror({getCurrentSlide:()=>frameCurrent},{view:{...frame,frameElement:{parentElement:{id:'upcoming-slide'}}},getRoot:s=>s.root});
 assert.equal(upcoming.pull(),false);
});

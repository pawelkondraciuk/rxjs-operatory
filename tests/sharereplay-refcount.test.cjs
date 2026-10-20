const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {modules,playbackHarness}=require('./v2-harness.cjs');
// 20b-sharereplay-refcount (MAIN, po 20a): interval(1000).pipe(shareReplay({ bufferSize: 1, refCount: true })) → A/B/C
// na żywo w wyglądzie 20a. Pierwsze „dalej” — A subskrybuje i ruszają emisje (#1); akcje: pauza animacji + B z bufora,
// wznowienie, subA/subB.unsubscribe() (refCount = 0 → reset: pusty bufor i × do interval), C (nowe wykonanie #2 od 0,
// bez wartości z bufora), subC.unsubscribe() (reset, koniec sceny). Bez complete.
const id='20b-sharereplay-refcount';

async function scene(format='4:3'){
 const m=await modules(['catalog','scene-config','engine','renderer']);
 const s=m['scene-config'].configureScene({...m.catalog.scenes.find(x=>x.id===id),format});
 return {scene:s,compile:m.engine.compileScene,render:m.renderer.renderScene};
}
async function live(format,controls){
 const {scene:s,render}=await scene(format),h=await playbackHarness(),{player,controller}=h.create({scene:s,controls});
 return {scene:s,render,h,player,controller};
}
const metric=(f,label)=>f.metrics.find(x=>x.label===label).value;
const values=(f,anchor)=>Array.from(f.histories.find(h=>h.anchor===anchor)?.values||[],v=>v.value);
const node=(f,id)=>f.nodes.find(n=>n.id===id);
const lane=(f,id,sub)=>node(f,id)?.laneStates.find(l=>l.subscriber===sub);
const buffer=f=>Array.from(node(f,'replay').bufferPocket?.values||[],v=>v.value);
const counts=f=>[metric(f,'Odbiorcy'),metric(f,'Upstream')];
// Start emisji i stage kolejnych akcji (czasy między kliknięciami w ms).
async function until(stage,format='4:3',controls){
 const run=await live(format,controls),{controller,h}=run;
 const waits=[6000,5000,4000,7000,2000,5500,6000];
 for(let i=0;i<=stage;i++){controller.next();h.advance(waits[i]);}
 return run;
}

test('READY: definitions, empty buffer, refCount: true in code; stops follow the actions',async()=>{
 const {scene:s,compile,render}=await scene(),f=compile(s).snapshot(0);
 assert.equal(s.title,'shareReplay z refCount: kiedy znika bufor?');
 assert.equal(s.code,'interval(1000).pipe(\n  shareReplay({ bufferSize: 1, refCount: true })\n)');
 assert.equal(s.playback.controller,'stages');assert.ok(s.live&&!s.live.autoplay);
 assert.deepEqual(Array.from(s.live.actions),['B','resume','unsub-all','reset','C','unsub-C']);
 assert.deepEqual(Array.from(s.playback.stops,x=>x.id),['subscribed-a','subscribed-b','resumed','unsub-all','reset','subscribed-c','unsub-c']);
 assert.equal(s.playback.stops[0].time,s.live.start);
 assert.deepEqual(Array.from(f.nodes.filter(n=>n.visible&&n.opacity>0),n=>n.label),['interval(1000)','shareReplay(1)']);
 assert.ok(f.edges.every(e=>!e.visible));assert.deepEqual(buffer(f),[]);assert.deepEqual(counts(f),[0,0]);
 assert.match(render(f),/data-buffer=/);
});

test('pause: interval stops emitting, the last value reaches the buffer, then B gets it from the pocket',async()=>{
 const {player,controller,h}=await live('4:3');
 controller.next();h.advance(6000);
 controller.next();assert.equal(player.live.stage,1);assert.equal(player.live.busy,true);
 h.advance(400);assert.ok(player.snapshot.callouts.some(c=>c.text==='pauza animacji'&&c.opacity>0));
 const plan=()=>player.snapshot;let replayed;
 for(let i=0;i<120;i++){h.advance(50);const r=plan().tokens.find(t=>t.phase==='replay');
  if(r&&replayed===undefined){replayed=r.value;assert.equal(buffer(plan())[0],r.value,'kulka z kieszeni = zawartość bufora');}}
 assert.ok(replayed!==undefined,'B dostaje wartość z kieszeni');
 let f=plan();
 assert.deepEqual(values(f,'B'),[replayed]);assert.equal(values(f,'A').at(-1),replayed,'B dostaje to, co ostatnio dostał A');
 assert.deepEqual(counts(f),[2,1]);assert.equal(player.live.busy,false);
 // Pauza trwa do kolejnego „dalej”: brak nowych emisji.
 h.advance(5000);f=plan();
 assert.deepEqual(values(f,'B'),[replayed]);assert.equal(buffer(f)[0],replayed);
 assert.ok(!f.tokens.some(t=>t.edge==='interval-replay'),'interval nie emituje w pauzie');
 assert.equal(node(f,'interval').laneStates.length,1,'jedno połączenie upstream');
});

test('resume: emissions return to A and B; quick next during B replay only finishes it',async()=>{
 const {player,controller,h}=await live('4:3');
 controller.next();h.advance(6000);controller.next();h.advance(200);
 controller.next();assert.equal(player.live.stage,1,'szybkie „dalej” kończy animację B, nie wznawia');
 assert.equal(player.live.busy,false);assert.equal(values(player.snapshot,'B').length,1);
 controller.next();assert.equal(player.live.stage,2);h.advance(4000);
 const f=player.snapshot,b=values(f,'B');
 assert.ok(b.length>=2&&Number(b.at(-1))===Number(b[0])+1,'B dostaje kolejne wartości na żywo: '+b);
 assert.equal(values(f,'A').at(-1),b.at(-1));assert.equal(buffer(f)[0],b.at(-1));
 assert.deepEqual(counts(f),[2,1]);
 assert.ok(!player.snapshot.callouts.some(c=>c.text==='pauza animacji'&&c.opacity>0));
});

test('unsubscribe A and B: refCount 0 clears the buffer and disconnects interval #1',async()=>{
 const {player,controller,h}=await until(4);
 assert.equal(player.live.stage,4);
 let f=player.snapshot;
 assert.deepEqual(['A','B'].map(x=>lane(f,x,x).state),['cancelled','cancelled']);
 assert.equal(lane(f,'interval','U1').state,'cancelled');assert.deepEqual(counts(f),[0,0]);
 assert.deepEqual(buffer(f),[],'bufor wyczyszczony przy unsubscribe ostatniego odbiorcy');
 assert.equal(f.edges.find(e=>e.id==='interval-replay').phase,'unsubscribe','× dotarł do interval');
 const before=values(f,'A');h.advance(4000);f=player.snapshot;
 assert.deepEqual(values(f,'A'),before);assert.deepEqual(buffer(f),[]);
 assert.ok(!f.tokens.length,'interval już nie emituje');
});

test('late C: no buffered value, a new interval execution #2 counts from zero',async()=>{
 const {player,controller,h,scene:s}=await until(4);
 controller.next();assert.equal(player.live.stage,5);
 const phases=new Set();
 for(let i=0;i<120;i++){h.advance(50);for(const t of player.snapshot.tokens)phases.add(t.phase);}
 const f=player.snapshot;
 assert.ok(!phases.has('replay'),'C nie dostaje nic z bufora');
 assert.equal(values(f,'C')[0],'0','licznik od zera');assert.deepEqual(counts(f),[1,1]);
 assert.deepEqual(Array.from(node(f,'interval').laneStates,l=>l.subscriber+':'+l.state),['U1:cancelled','U2:running']);
 assert.ok(buffer(f).length===1&&Number(buffer(f)[0])>=Number(values(f,'C').at(-1)),'bufor wypełnia się wartościami #2');
 assert.ok(s.live&&player.live.busy===false);
});

test('unsubscribe C ends the scene: buffer empty, interval #2 disconnected, next navigates, left undoes',async()=>{
 const navigation=[];
 const {player,controller,h,render}=await until(6,'4:3',{stageOptions:{onNavigate:d=>navigation.push(d)}});
 assert.equal(player.live.stage,6);h.advance(6000);
 const f=player.snapshot;
 assert.equal(player.state,'finished');
 assert.deepEqual(buffer(f),[]);assert.deepEqual(counts(f),[0,0]);
 assert.deepEqual(Array.from(node(f,'interval').laneStates,l=>l.state),['cancelled','cancelled']);
 assert.equal(lane(f,'C','C').state,'cancelled');
 assert.doesNotMatch(render(f),/✓ complete|NaN|Infinity/);
 controller.next();assert.deepEqual(navigation,[1]);
 controller.previous();assert.equal(player.live.stage,5);h.advance(2000);
 assert.equal(lane(player.snapshot,'C','C').state,'running','cofnięcie przywraca C');
 controller.suspend('slide');controller.reset();assert.equal(player.live.stage,0);assert.equal(player.time,0);
});

test('print and restore: stable frames with defaults; deterministic snapshots in both formats',async()=>{
 for(const format of ['4:3','16:9']){
  const {scene:s,compile,render}=await scene(format);
  const v=s.live.variant(s,{from:0,to:s.live.window,closedAt:s.live.defaultClose,actions:s.live.defaults}),c=compile(v);
  assert.equal(c.duration,s.live.defaultClose);
  const at=Object.fromEntries(s.playback.stops.map(x=>[x.id,c.snapshot(x.time)]));
  assert.deepEqual(values(at['subscribed-b'],'B').length,1);assert.equal(buffer(at['subscribed-b'])[0],values(at['subscribed-b'],'B')[0]);
  assert.deepEqual(counts(at['resumed']),[2,1]);assert.ok(values(at['resumed'],'B').length>=2);
  assert.equal(buffer(at['unsub-all']).length,1);assert.deepEqual(counts(at['unsub-all']),[0,1]);
  assert.deepEqual(buffer(at.reset),[]);assert.deepEqual(counts(at.reset),[0,0]);
  assert.equal(values(at['subscribed-c'],'C')[0],'0');assert.deepEqual(counts(at['subscribed-c']),[1,1]);
  assert.deepEqual(buffer(at['unsub-c']),[]);assert.deepEqual(counts(at['unsub-c']),[0,0]);
  for(const time of [0,...s.playback.stops.map(x=>x.time),c.duration]){
   const f=c.snapshot(time),frame=JSON.stringify(f);
   for(const n of f.nodes.filter(n=>n.visible))assert.ok(n.y-n.h/2>=-1&&n.y+n.h/2<=f.height+1,format+' '+n.id);
   const pocket=node(f,'replay').bufferPocket;assert.ok(pocket.y+pocket.h/2<=f.height,format+' bufor w ramce');
   c.snapshot(c.duration);c.snapshot(0);assert.equal(JSON.stringify(c.snapshot(time)),frame);
   assert.doesNotMatch(render(f),/NaN|Infinity|="undefined"/);
  }
  assert.equal(c.events.some(e=>e.type==='stream-complete'),false);
 }
 const restored=await live('4:3');
 restored.controller.seekCheckpoint(restored.player.stops.find(x=>x.id==='unsub-all').time);
 assert.equal(restored.player.live.stage,3);assert.equal(buffer(restored.player.snapshot).length,1);
 const printed=await live('16:9');printed.player.finish();
 assert.equal(printed.player.state,'finished');assert.equal(printed.player.live.stage,6);
});

test('buffer reset fades the stored ball out instead of cutting it',async()=>{
 const {scene:s,compile,render}=await scene();
 const v=s.live.variant(s,{from:0,to:s.live.window,closedAt:s.live.defaultClose,actions:s.live.defaults}),c=compile(v);
 const reset=v.shareReplayRefPlan.clear1,f=c.snapshot(reset+.2),stored=node(f,'replay').bufferPocket.values;
 assert.equal(stored.length,1);assert.ok(stored[0].opacity>0&&stored[0].opacity<1);
 assert.match(render(f),/data-buffer-clear="true"/);
 assert.equal(node(c.snapshot(reset+.6),'replay').bufferPocket.values.length,0);
 assert.equal(node(c.snapshot(reset-.05),'replay').bufferPocket.values.length,1);
});

test('placed between shareReplay(1) on interval and shareReplay refCount on HTTP; notes cover every checkpoint',async()=>{
 const {scene:s}=await scene(),{mainOrder}=(await modules(['scene-config']))['scene-config'];
 const i=mainOrder.indexOf(id);
 assert.deepEqual([mainOrder[i-1],mainOrder[i+1]],['20a-sharereplay-interval','20-sharereplay-2']);
 const html=fs.readFileSync('index.html','utf8');
 const source=html.match(new RegExp(`<template data-checkpoint-notes="${id}">([\\s\\S]*?)</template>`))[1];
 assert.deepEqual(Array.from(source.matchAll(/data-checkpoint="([^"]+)"/g),x=>x[1]),['ready',...s.playback.stops.map(x=>x.id),'finished']);
 assert.match(source,/resetOnRefCountZero/);assert.match(source,/przy unsubscribe/);assert.match(source,/od 0/);
});

test('only after unsubscribe B: hold a normal upstream and buffer until the explicit answer, including AUTO and fast next',async()=>{
 for(const mode of ['manual','auto']){
  const {player,controller,h}=await until(2);if(mode==='auto')controller.setMode('auto');
  controller.next();h.advance(100);assert.equal(player.live.stage,3);assert.equal(player.live.busy,true);
  controller.next();assert.equal(player.live.stage,3);assert.equal(player.isPlaying,false);
  const f=player.snapshot;assert.deepEqual(counts(f),[0,1]);assert.equal(buffer(f).length,1);
  assert.equal(f.edges.find(e=>e.id==='interval-replay').phase,'subscribed');
  assert.equal(lane(f,'interval','U1').state,'running');assert.deepEqual(['A','B'].map(id=>lane(f,id,id).state),['cancelled','cancelled']);
  assert.ok(!f.tokens.length);const frozen=JSON.stringify(f);h.advance(120000);assert.equal(JSON.stringify(player.snapshot),frozen);
  controller.toggle();h.advance(5000);assert.equal(JSON.stringify(player.snapshot),frozen);
  controller.next();assert.equal(player.live.stage,4);h.advance(2000);assert.deepEqual(counts(player.snapshot),[0,0]);assert.deepEqual(buffer(player.snapshot),[]);
  controller.previous();assert.equal(player.live.stage,3);assert.equal(buffer(player.snapshot).length,1);
 }
});

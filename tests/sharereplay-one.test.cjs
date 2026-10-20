const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {modules,playbackHarness}=require('./v2-harness.cjs');
// 20a-sharereplay-interval (MAIN, przed shareReplay z refCount: true na HTTP): interval(1000).pipe(shareReplay(1)) → A/B.
// Cztery kroki: A subskrybuje i dostaje 0–2 → subA.unsubscribe() (interval pracuje, bufor 3) → B dostaje 3 z bufora
// i 4 na żywo → subB.unsubscribe(): zero odbiorców, interval nadal emituje (bufor 5). Bez complete i teardownu upstreamu.
const id='20a-sharereplay-interval';

async function deck(format='4:3'){
 class Slide{constructor(id){this.id=id;this.dataset={animation:id};this.heading={};this.player={setAttribute(){}};}
  querySelector(s){return s==='h2'?this.heading:this.player;}cloneNode(){return new Slide(this.id);}after(){}}
 const slides=[...fs.readFileSync('index.html','utf8').matchAll(/data-animation="([^"]+)"/g)].map(m=>new Slide(m[1]));
 const m=await modules(['catalog','presentation','engine','renderer'],{document:{querySelectorAll:()=>slides}});
 const scene=m.presentation.prepareSlides(m.catalog.scenes,{format}).get(id),compiled=m.engine.compileScene(scene);
 return {scene,compiled,render:m.renderer.renderScene};
}
const metric=(frame,label)=>frame.metrics.find(x=>x.label===label).value;
const values=(frame,anchor)=>Array.from(frame.histories.find(h=>h.anchor===anchor)?.values||[],v=>v.value);
const memory=frame=>frame.nodes.find(n=>n.id==='share').memoryBall.value;
const lane=(frame,node,subscriber)=>frame.nodes.find(n=>n.id===node)?.laneStates.find(l=>l.subscriber===subscriber);
const atStop=(compiled,id)=>compiled.snapshot(compiled.stops.find(s=>s.id===id).time);
const shown=frame=>Array.from(frame.callouts||[],c=>c.text);

test('READY: definitions only, empty buffer, four manual steps',async()=>{
 const {scene,compiled}=await deck(),ready=compiled.snapshot(0);
 assert.equal(scene.title,'shareReplay(1): kto zatrzyma interval?');
 assert.equal(scene.code,'const shared$ = interval(1000).pipe(shareReplay(1));');
 assert.equal(scene.playback.controller,'stages');assert.equal(scene.group,'main');
 assert.deepEqual(Array.from(compiled.stops,s=>s.id),['subscribed-a','unsub-a','subscribed-b','unsub-b']);
 assert.deepEqual(Array.from(ready.nodes.filter(n=>n.visible&&n.opacity>0),n=>n.label),['interval(1000)','shareReplay(1)']);
 assert.ok(ready.edges.every(e=>!e.visible));assert.equal(memory(ready),undefined);
 assert.deepEqual([metric(ready,'Odbiorcy'),metric(ready,'Upstream')],[0,0]);
});

test('step 1: A subscribes, one upstream connection, A gets 0, 1, 2',async()=>{
 const {compiled}=await deck(),f=atStop(compiled,'subscribed-a');
 assert.deepEqual(values(f,'A'),['0','1','2']);assert.equal(memory(f),'2');
 assert.deepEqual([metric(f,'Odbiorcy'),metric(f,'Upstream')],[1,1]);
 assert.equal(f.tokens.length,0,'postój bez kulek w locie');
 assert.deepEqual(Array.from(compiled.events.filter(e=>e.type==='subscribe'),e=>e.edge),['share-A','interval-share','share-B'],'jedno połączenie upstream');
});

test('step 2: subA.unsubscribe() ends on shareReplay(1); interval keeps emitting into the buffer',async()=>{
 const {compiled}=await deck(),f=atStop(compiled,'unsub-a');
 assert.equal(lane(f,'A','A').state,'cancelled');assert.equal(lane(f,'interval','U').state,'running');
 assert.deepEqual(values(f,'A'),['0','1','2'],'A nic już nie dostaje');assert.equal(memory(f),'3');
 assert.deepEqual([metric(f,'Odbiorcy'),metric(f,'Upstream')],[0,1]);
 assert.ok(!f.nodes.some(n=>n.id==='B'&&n.opacity>0),'B jeszcze nie istnieje');
 assert.equal(f.tokens.length,0);
});

test('step 3: B gets 3 from the buffer first, then 4 live from the same interval',async()=>{
 const {compiled}=await deck(),f=atStop(compiled,'subscribed-b');
 assert.deepEqual(Array.from(compiled.events.filter(e=>e.type==='deliver-next'&&e.edge==='share-B'),e=>e.value),['3','4']);
 assert.deepEqual(values(f,'B'),['3','4']);assert.equal(memory(f),'4');
 assert.deepEqual([metric(f,'Odbiorcy'),metric(f,'Upstream')],[1,1]);
 assert.equal(compiled.events.filter(e=>e.type==='subscribe'&&e.edge==='interval-share').length,1,'bez drugiego upstreamu');
});

test('step 4: subB.unsubscribe(); zero receivers, interval still running, no complete or upstream teardown',async()=>{
 const {compiled,render}=await deck(),f=atStop(compiled,'unsub-b'),end=compiled.snapshot(compiled.duration);
 assert.equal(lane(f,'B','B').state,'cancelled');assert.equal(lane(f,'interval','U').state,'running');
 assert.equal(memory(f),'5');assert.deepEqual([metric(f,'Odbiorcy'),metric(f,'Upstream')],[0,1]);
 assert.deepEqual(Array.from(compiled.events.filter(e=>e.type==='inner-unsubscribe'),e=>e.edge),['share-A','share-B']);
 assert.equal(compiled.events.some(e=>e.edge==='interval-share'&&['inner-unsubscribe','disconnected'].includes(e.type)),false);
 assert.equal(compiled.events.some(e=>e.type==='stream-complete'),false);
 assert.equal(memory(end),'7');assert.match(end.caption,/bufor: 7[\s\S]*refCount: false/);assert.equal(lane(end,'interval','U').state,'running');
 assert.ok(end.codeView.flat().find(p=>p.mark?.id==='share').active,'shareReplay(1) świeci, gdy pracuje bez odbiorców');
 assert.doesNotMatch(render(end),/✓ complete|NaN|Infinity/);
});

test('callouts follow the four calls without overlapping',async()=>{
 const {compiled}=await deck();
 const calls=[['subscribe','share-A'],['unsubscribe-call','share-A'],['subscribe','share-B'],['unsubscribe-call','share-B']]
  .map(([type,edge])=>compiled.events.find(e=>e.type===type&&e.edge===edge).at);
 assert.deepEqual(shown(compiled.snapshot(calls[0]+.3)),['const subA = shared$.subscribe(…)']);
 assert.deepEqual(shown(compiled.snapshot(calls[1]+.3)),['subA.unsubscribe()']);
 assert.deepEqual(shown(compiled.snapshot(calls[2]+.1)),['const subB = shared$.subscribe(…)']);
 assert.deepEqual(shown(compiled.snapshot(calls[3]+.3)),['subB.unsubscribe()']);
 for(const s of compiled.stops)assert.ok(shown(compiled.snapshot(s.time)).length<=1);
});

test('geometry fits both formats; frames are deterministic; MANUAL stops then AUTO finishes',async()=>{
 for(const format of ['4:3','16:9']){
  const {scene,compiled}=await deck(format);
  for(const time of [0,...compiled.stops.map(s=>s.time),compiled.duration]){
   const f=compiled.snapshot(time),frame=JSON.stringify(f);
   for(const n of f.nodes.filter(n=>n.visible))assert.ok(n.y-n.h/2>=-1&&n.y+n.h/2<=f.height+1,format+' '+n.id);
   compiled.snapshot(compiled.duration);compiled.snapshot(0);assert.equal(JSON.stringify(compiled.snapshot(time)),frame);
  }
  const h=await playbackHarness(),{player,controller}=h.create({scene});
  for(const stop of player.stops){controller.next();h.advance(30000);assert.equal(player.time,stop.time);}
  controller.next();h.advance(30000);assert.equal(player.state,'finished');
  controller.previous();assert.equal(player.time,player.stops.at(-1).time);
  controller.reset();assert.equal(player.time,0);
 }
});

test('placed between share() late receiver and shareReplay refCount: true; notes cover every checkpoint',async()=>{
 const {scene}=await deck(),{mainOrder}=(await modules(['scene-config']))['scene-config'];
 const i=mainOrder.indexOf(id);
 assert.deepEqual([mainOrder[i-1],mainOrder[i+1]],['20-sharereplay','20-sharereplay-2']);
 const html=fs.readFileSync('index.html','utf8');
 const source=html.match(new RegExp(`<template data-checkpoint-notes="${id}">([\\s\\S]*?)</template>`))[1];
 assert.deepEqual(Array.from(source.matchAll(/data-checkpoint="([^"]+)"/g),x=>x[1]),['ready',...scene.playback.stops.map(s=>s.id),'finished']);
 assert.match(source,/refCount: false/);assert.match(source,/refCount: true/);
});

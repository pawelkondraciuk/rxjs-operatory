const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {modules,playbackHarness}=require('./v2-harness.cjs');
// x01-sharereplay-interval (pierwszy EXTRAS): interval(1000).pipe(shareReplay({ bufferSize: 1, refCount: false })).
const id='x01-sharereplay-interval';
async function deck(format='4:3'){
 class Slide{constructor(id){this.id=id;this.dataset={animation:id};this.heading={};this.player={setAttribute(){}};}
  querySelector(s){return s==='h2'?this.heading:this.player;}cloneNode(){return new Slide(this.id);}after(){}}
 const slides=[...fs.readFileSync('index.html','utf8').matchAll(/data-animation="([^"]+)"/g)].map(m=>new Slide(m[1]));
 const m=await modules(['catalog','presentation','engine','renderer'],{document:{querySelectorAll:()=>slides}});
 const scene=m.presentation.prepareSlides(m.catalog.scenes,{format}).get(id);
 const variant=actions=>m.engine.compileScene(scene.live.variant(scene,{from:0,to:30,closedAt:null,actions}));
 return {m,scene,variant,render:m.renderer.renderScene};
}
const metric=(f,label)=>f.metrics.find(x=>x.label===label).value;
const values=(f,anchor)=>Array.from(f.histories.find(h=>h.anchor===anchor)?.values||[],v=>v.value);
const hub=f=>f.nodes.find(n=>n.id==='share');
const lanes=(f,node)=>Array.from(f.nodes.find(n=>n.id===node)?.laneStates||[],l=>l.subscriber+':'+l.state);

test('READY: only the definition — no receivers, no lanes, interval idle, empty memory, counters 0/0',async()=>{
 const {scene,variant,render}=await deck(),c=variant([]),ready=c.snapshot(0),svg=render(ready);
 assert.equal(scene.title,'shareReplay — kto zatrzyma interval?');
 assert.equal(scene.code,'const shared$ = interval(1000).pipe(\n  shareReplay({ bufferSize: 1, refCount: false }));');
 assert.equal(scene.playback.controller,'stages');assert.equal(scene.live.autoplay,false);
 assert.deepEqual(Array.from(scene.playback.stops,s=>s.id),['unsub-a','zero','sub-b','summary']);
 assert.deepEqual(Array.from(ready.nodes.filter(n=>n.visible&&n.opacity>0),n=>n.label),['interval(1000)','shareReplay(1)'],'A pojawia się dopiero z subscribe');
 assert.ok(ready.edges.every(e=>!e.visible));assert.equal(hub(ready).memoryBall.value,undefined);
 assert.deepEqual([metric(ready,'Odbiorcy'),metric(ready,'Upstream')],[0,0]);
 assert.doesNotMatch(svg,/data-lane-memory|data-token="travel"/);
 assert.equal(c.events.some(e=>e.type==='source-next'&&e.at<c.events.find(x=>x.type==='connected'&&x.edge==='interval-share').at),false,'interval nie emituje przed subskrypcją');
});

test('A subscribes through shareReplay to interval: exactly one upstream; 0, 1, 2 reach A via the memory ball',async()=>{
 const {variant,render}=await deck(),c=variant([7.2]);
 const subs=c.events.filter(e=>e.type==='subscribe');
 assert.deepEqual(Array.from(subs,e=>e.edge),['share-A','interval-share'],'A → shareReplay, potem jedno upstream');
 const shareA=c.events.find(e=>e.type==='connected'&&e.edge==='share-A').at,up=c.events.find(e=>e.type==='connected'&&e.edge==='interval-share').at;
 assert.ok(up>shareA,'impuls biegnie dalej do interval');
 const mid=c.snapshot((shareA+up)/2);
 assert.deepEqual(Array.from(mid.callouts,x=>x.text),['const subA = shared$.subscribe(…)']);
 assert.deepEqual(values(c.snapshot(9),'A'),['0','1','2']);
 assert.equal(hub(c.snapshot(c.events.find(e=>e.type==='deliver-next'&&e.edge==='interval-share'&&e.value==='2').at+.45)).memoryBall.value,'2','pamięć aktualizuje się przy dotarciu do shareReplay');
 assert.ok(render(c.snapshot(9)).includes('data-lane-memory="'));
 assert.deepEqual([metric(c.snapshot(up+.1),'Odbiorcy'),metric(c.snapshot(up+.1),'Upstream')],[1,1]);
});

test('subA.unsubscribe(): × stops at shareReplay; upstream keeps running and updating memory with zero receivers',async()=>{
 const {variant,render}=await deck(),c=variant([7.2,11]);
 const ends=c.events.filter(e=>e.type==='inner-unsubscribe');
 assert.deepEqual(Array.from(ends,e=>e.edge),['share-A'],'× tylko na share-A');
 assert.equal(c.events.some(e=>e.edge==='interval-share'&&['inner-unsubscribe','stream-complete','disconnected'].includes(e.type)),false,'upstream nie odłączony');
 assert.equal(c.events.some(e=>e.type==='stream-complete'),false,'bez complete');
 const gone=c.events.find(e=>e.type==='disconnected'&&e.edge==='share-A').at;
 const zero=c.snapshot(gone+3);
 assert.deepEqual([metric(zero,'Odbiorcy'),metric(zero,'Upstream')],[0,1],'0 odbiorców / 1 upstream');
 assert.deepEqual(lanes(zero,'interval'),['U:running']);assert.deepEqual(lanes(zero,'A'),['A:cancelled']);
 assert.deepEqual(values(zero,'A'),['0','1','2'],'A nic więcej nie dostaje');
 const memAt=t=>hub(c.snapshot(t)).memoryBall.value;
 assert.ok(Number(memAt(gone+3))>Number(memAt(gone+1)),'kulka pamięci się podmienia');
 assert.ok(c.events.some(e=>e.type==='source-next'&&e.edge==='interval-share'&&e.at>gone+2),'interval nadal emituje');
 const svg=render(zero);
 assert.match(svg,/data-connection="interval-share" data-phase="subscribed"/);
 assert.ok(zero.codeView.flat().find(p=>p.mark?.id==='refcount').active,'wyróżnienie refCount: false');
 assert.doesNotMatch(svg,/✓ complete|data-node="B"/);
});

test('late B: subscribe stops at shareReplay, immediately gets the value stored at connection time, then live values',async()=>{
 const {variant}=await deck();
 for(const subB of [14.5,17.3,22]){
  const c=variant([7.2,11,subB]);
  assert.equal(c.events.filter(e=>e.type==='subscribe'&&e.edge==='interval-share').length,1,'bez drugiego interval');
  const connected=c.events.find(e=>e.type==='connected'&&e.edge==='share-B').at;
  const storedNow=hub(c.snapshot(connected)).memoryBall.value;
  const bValues=c.events.filter(e=>e.type==='deliver-next'&&e.edge==='share-B').map(e=>e.value);
  assert.equal(bValues[0],storedNow,`B@${subB}: pierwsza wartość = pamięć w chwili subskrypcji`);
  assert.ok(bValues.slice(1).every((v,i)=>Number(v)===Number(storedNow)+i+1),'potem kolejne emisje bez historii');
  assert.ok(bValues.length>=3);
  const f=c.snapshot(connected+4);
  assert.deepEqual([metric(f,'Odbiorcy'),metric(f,'Upstream')],[1,1]);
  assert.deepEqual(lanes(f,'A'),['A:cancelled']);
  assert.equal(c.events.some(e=>e.type==='stream-complete'||e.type==='inner-unsubscribe'&&e.edge!=='share-A'),false);
 }
});

test('layout: interval → shareReplay(1) with #1 row and memory ball → A/B, horizontal wires, fits both formats',async()=>{
 for(const format of ['4:3','16:9']){
  const {variant,render}=await deck(format),c=variant([7.2,11,14.5,19]),f=c.snapshot(20),svg=render(f);
  assert.ok(f.nodes.every(n=>!n.visible||n.y+n.h/2<=f.height&&n.y-n.h/2>=0),format);
  for(const e of f.edges.filter(e=>e.visible))assert.ok(e.points.every(p=>p[1]===e.points[0][1]),e.id+' poziomo');
  const memory=hub(f).memoryBall,row=hub(f).laneRows.find(r=>r.input);
  assert.ok(row&&memory.y>row.top&&memory.y<row.top+row.h,'kulka w wierszu #1');
  assert.doesNotMatch(svg,/data-buffer|bufor|pamięć<|NaN|Infinity/);
 }
});

test('stages: manual flow, undo, reset and leaving leave no running timer; finish and print give still frames',async()=>{
 const {scene}=await deck(),h=await playbackHarness(),{player,controller}=h.create({scene});
 assert.equal(player.state,'ready');h.advance(3000);assert.equal(player.time,0,'bez „dalej” nic nie rusza');
 controller.next();h.advance(9000);
 assert.ok(player.snapshot.metrics.find(x=>x.label==='Upstream').value===1);
 for(let i=0;i<4;i++){controller.next();h.advance(4000);assert.equal(player.live.stage,i+1);assert.equal(player.isPlaying,true,'emisje trwają na postoju');}
 const memory=Number(player.snapshot.nodes.find(n=>n.id==='share').memoryBall.value);h.advance(3000);
 assert.ok(Number(player.snapshot.nodes.find(n=>n.id==='share').memoryBall.value)>memory,'interval pracuje dalej');
 controller.previous();assert.equal(player.live.stage,3);
 controller.reset();assert.equal(player.state,'ready');assert.equal(player.time,0);
 controller.suspend('slide');h.advance(5000);assert.equal(h.frames.size,0,'po wyjściu brak RAF');
 const p2=h.create({scene});p2.player.finish();assert.equal(p2.player.state,'finished');assert.equal(h.frames.size,0);
 const fin=p2.player.snapshot;
 assert.deepEqual(Array.from(fin.metrics,x=>x.value),[1,1]);
 assert.deepEqual(Array.from(fin.nodes.find(n=>n.id==='A').laneStates,l=>l.state),['cancelled']);
});

test('placement and notes: first EXTRAS right after Pytania?, notes per action with the question before the answer',async()=>{
 const {m}=await deck();
 const sc=await modules(['scene-config']);
 assert.equal(sc['scene-config'].extraOrder[0],id);
 assert.ok(!sc['scene-config'].mainOrder.includes(id));
 const html=fs.readFileSync('index.html','utf8');
 assert.ok(html.indexOf(`<section id="${id}"`)>html.indexOf('<section id="pytania"'));
 const source=html.match(new RegExp(`<template data-checkpoint-notes="${id}">([\\s\\S]*?)</template>`))[1];
 const notes=Object.fromEntries([...source.matchAll(/<div data-checkpoint="([^"]+)">([\s\S]*?)<\/div>/g)].map(([,k,v])=>[k,v]));
 assert.deepEqual(Object.keys(notes),['ready','unsub-a','zero','sub-b','summary','finished']);
 assert.match(notes.ready,/HTTP samo się kończy\. Co się stanie, jeśli współdzielimy źródło, które nigdy się nie kończy\?[\s\S]*Pierwszy subskrybent uruchamia interval/);
 assert.match(notes['unsub-a'],/Czy to oznacza, że interval też przestał działać\?/);assert.doesNotMatch(notes['unsub-a'],/utrzymuje połączenie/);
 assert.match(notes.zero,/Przy refCount ustawionym na false shareReplay utrzymuje połączenie upstream/);
 assert.match(notes['sub-b'],/Nie powstaje nowa subskrypcja interval/);
 assert.match(notes.summary,/potencjalna pułapka[\s\S]*A co zmieniłoby refCount: true\?/);
 void m;
});

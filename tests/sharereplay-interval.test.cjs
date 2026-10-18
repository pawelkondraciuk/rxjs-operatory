const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {modules,playbackHarness}=require('./v2-harness.cjs');
const id='x01-sharereplay-interval';

async function deck(format='4:3'){
 class Slide{constructor(id){this.id=id;this.dataset={animation:id};this.heading={};this.player={setAttribute(){}};}
  querySelector(s){return s==='h2'?this.heading:this.player;}cloneNode(){return new Slide(this.id);}after(){}}
 const slides=[...fs.readFileSync('index.html','utf8').matchAll(/data-animation="([^"]+)"/g)].map(m=>new Slide(m[1]));
 const m=await modules(['catalog','presentation','engine','renderer'],{document:{querySelectorAll:()=>slides}});
 const scene=m.presentation.prepareSlides(m.catalog.scenes,{format}).get(id),compiled=m.engine.compileScene(scene);
 return {m,scene,compiled,render:m.renderer.renderScene};
}
const metric=(frame,label)=>frame.metrics.find(x=>x.label===label).value;
const values=(frame,anchor)=>Array.from(frame.histories.find(h=>h.anchor===anchor)?.values||[],v=>v.value);
const hub=frame=>frame.nodes.find(n=>n.id==='share');
const lane=(frame,node,subscriber)=>frame.nodes.find(n=>n.id===node)?.laneStates.find(l=>l.subscriber===subscriber);
const atStop=(compiled,id)=>compiled.snapshot(compiled.stops.find(s=>s.id===id).time);

test('READY pokazuje wyłącznie definicję, pustą pamięć i liczniki 0/0',async()=>{
 const {scene,compiled,render}=await deck(),ready=compiled.snapshot(0),svg=render(ready);
 assert.equal(scene.title,'shareReplay — kto zatrzyma interval?');
 assert.equal(scene.code,'const shared$ = interval(1000).pipe(\n  shareReplay({ bufferSize: 1, refCount: false })\n);');
 assert.equal(scene.live,undefined);assert.equal(scene.playback.controller,'stages');
 assert.deepEqual(Array.from(scene.playback.stops,s=>s.id),
  ['subscribed-a','first-values','unsub-a','zero','replayed-b','summary']);
 assert.deepEqual(Array.from(ready.nodes.filter(n=>n.visible&&n.opacity>0),n=>n.label),['interval(1000)','shareReplay(1)']);
 assert.ok(ready.edges.every(e=>!e.visible));assert.equal(hub(ready).memoryBall.value,undefined);
 assert.deepEqual([metric(ready,'Odbiorcy'),metric(ready,'Upstream')],[0,0]);
 assert.deepEqual(Array.from(ready.codeView.flat().filter(p=>p.mark),p=>p.mark.id),['interval','share','refcount']);
 assert.equal(ready.codeSyntax,true);
 assert.doesNotMatch(svg,/data-lane-memory|data-token="travel"|#1/);
});

test('A uruchamia dokładnie jeden upstream i dostaje 0, 1, 2, 3',async()=>{
 const {compiled}=await deck(),subscribed=atStop(compiled,'subscribed-a'),first=atStop(compiled,'first-values');
 assert.deepEqual(Array.from(compiled.events.filter(e=>e.type==='subscribe'),e=>e.edge),
  ['share-A','interval-share','share-B']);
 assert.deepEqual([metric(subscribed,'Odbiorcy'),metric(subscribed,'Upstream')],[1,1]);
 assert.deepEqual(values(first,'A'),['0','1','2','3']);assert.equal(hub(first).memoryBall.value,'3');
 assert.deepEqual(values(first,'B'),[]);assert.equal(lane(first,'interval','U').state,'running');
});

test('po unsubscribe A upstream pozostaje aktywny i pamięć zmienia się z 4 na 5 bez odbiorców',async()=>{
 const {compiled,render}=await deck(),unsub=atStop(compiled,'unsub-a'),zero=atStop(compiled,'zero');
 assert.deepEqual(Array.from(compiled.events.filter(e=>e.type==='inner-unsubscribe'),e=>e.edge),['share-A']);
 assert.equal(compiled.events.some(e=>e.edge==='interval-share'&&['inner-unsubscribe','stream-complete','disconnected'].includes(e.type)),false);
 assert.equal(compiled.events.some(e=>e.type==='stream-complete'),false);
 assert.deepEqual([metric(unsub,'Odbiorcy'),metric(unsub,'Upstream')],[0,1]);
 assert.equal(lane(unsub,'A','A').state,'cancelled');assert.equal(lane(unsub,'interval','U').state,'running');
 assert.deepEqual(values(unsub,'A'),['0','1','2','3']);assert.equal(hub(unsub).memoryBall.value,'4');
 assert.deepEqual([metric(zero,'Odbiorcy'),metric(zero,'Upstream')],[0,1]);assert.equal(hub(zero).memoryBall.value,'5');
 assert.ok(zero.codeView.flat().find(p=>p.mark?.id==='refcount').active);
 assert.match(render(zero),/data-connection="interval-share" data-phase="subscribed"/);
 assert.doesNotMatch(render(zero),/data-node="B"|#1/);
});

test('późny B dostaje najpierw 5 z pamięci, a potem 6 i 7 na żywo',async()=>{
 const {compiled}=await deck(),replayed=atStop(compiled,'replayed-b'),final=atStop(compiled,'summary');
 const bEvents=compiled.events.filter(e=>e.type==='deliver-next'&&e.edge==='share-B');
 assert.deepEqual(Array.from(bEvents,e=>e.value),['5','6','7']);
 assert.equal(bEvents[0].logicalAt,14.8,'pierwszy next B jest replay przy subskrypcji, nie nową emisją interval');
 assert.deepEqual(values(replayed,'B'),['5']);assert.equal(hub(replayed).memoryBall.value,'5');
 assert.deepEqual(values(final,'B'),['5','6','7']);assert.equal(hub(final).memoryBall.value,'7');
 assert.deepEqual([metric(final,'Odbiorcy'),metric(final,'Upstream')],[1,1]);
 assert.equal(lane(final,'A','A').state,'cancelled');assert.equal(lane(final,'B','B').state,'running');
 assert.equal(lane(final,'interval','U').state,'running');
});

test('bufor jest lokalnym stanem nagłówka, bez numerowanego lane i osobnego panelu',async()=>{
 for(const format of ['4:3','16:9']){
  const {compiled,render}=await deck(format),frame=atStop(compiled,'summary'),svg=render(frame),node=hub(frame);
  assert.ok(frame.nodes.every(n=>!n.visible||n.y+n.h/2<=frame.height&&n.y-n.h/2>=0),format);
  for(const edge of frame.edges.filter(e=>e.visible))assert.ok(edge.points.every(p=>p[1]===edge.points[0][1]),edge.id+' poziomo');
  assert.ok(node.memoryBall.y>node.top&&node.memoryBall.y<node.top+node.defH,'pamięć w nagłówku');
  assert.ok(node.memoryBall.x>node.labelX,'pamięć po prawej stronie etykiety');
  assert.deepEqual(Array.from(node.laneRows,r=>r.subscriber),['A','B'],'bez osobnego wiersza upstream/bufora');
  assert.equal((svg.match(/data-token="memory"/g)||[]).length,1);
  assert.doesNotMatch(svg,/#1|data-buffer|NaN|Infinity/);
 }
});

test('MANUAL zatrzymuje stałe checkpointy, AUTO odtwarza całość, cofanie/reset/F są deterministyczne',async()=>{
 const {scene}=await deck(),h=await playbackHarness();
 const manual=h.create({scene}),times=scene.playback.stops.map(s=>s.time);
 for(const expected of times){manual.controller.next();h.advance(30000);assert.equal(manual.player.time,expected);assert.equal(manual.player.isPlaying,false);}
 const stopped=manual.player.time;h.advance(5000);assert.equal(manual.player.time,stopped,'checkpoint pozostaje nieruchomy');
 manual.controller.previous();assert.equal(manual.player.time,times.at(-2));
 manual.controller.reset();assert.equal(manual.player.state,'ready');assert.equal(manual.player.time,0);
 manual.controller.suspend('slide');h.advance(5000);assert.equal(h.frames.size,0,'po wyjściu brak RAF');

 const auto=h.create({scene});auto.controller.setMode('auto');h.advance(30000);
 assert.equal(auto.player.state,'finished');assert.deepEqual(Array.from(auto.player.snapshot.metrics,x=>x.value),[1,1]);
 assert.deepEqual(values(auto.player.snapshot,'B'),['5','6','7']);

 const still=h.create({scene});still.player.finish();assert.equal(still.player.state,'finished');assert.equal(h.frames.size,0);
 assert.deepEqual(Array.from(still.player.snapshot.metrics,x=>x.value),[1,1]);
 assert.equal(lane(still.player.snapshot,'A','A').state,'cancelled');assert.equal(lane(still.player.snapshot,'B','B').state,'running');
});

test('miejsce w EXTRAS i notatki odpowiadają sześciu etapom oraz finałowi',async()=>{
 const sc=await modules(['scene-config']);
 assert.equal(sc['scene-config'].extraOrder[0],id);assert.ok(!sc['scene-config'].mainOrder.includes(id));
 const html=fs.readFileSync('index.html','utf8');
 assert.ok(html.indexOf(`<section id="${id}"`)>html.indexOf('<section id="pytania"'));
 const source=html.match(new RegExp(`<template data-checkpoint-notes="${id}">([\\s\\S]*?)</template>`))[1];
 const notes=Object.fromEntries([...source.matchAll(/<div data-checkpoint="([^"]+)">([\s\S]*?)<\/div>/g)].map(([,key,value])=>[key,value]));
 assert.deepEqual(Object.keys(notes),['ready','subscribed-a','first-values','unsub-a','zero','replayed-b','summary','finished']);
 const all=Object.values(notes).join(' ');
 assert.match(notes['first-values'],/zapamiętuje ostatnią wartość/);
 assert.match(notes.zero,/refCount: false[\s\S]*nie odłącza się od źródła[\s\S]*interval działa dalej/);
 assert.match(notes['replayed-b'],/najpierw[\s\S]*bufora[\s\S]*potem[\s\S]*na żywo/i);
 assert.match(notes.finished,/nieskończonych[\s\S]*w tle/);assert.doesNotMatch(all,/#1|subB\.unsubscribe/);
});

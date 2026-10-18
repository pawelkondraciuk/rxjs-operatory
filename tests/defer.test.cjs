const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {modules,playbackHarness}=require('./v2-harness.cjs');
const id='x04-defer';

async function deck(format='4:3'){
 class Slide{constructor(id){this.id=id;this.dataset={animation:id};this.heading={};this.player={setAttribute(){}};}
  querySelector(s){return s==='h2'?this.heading:this.player;}cloneNode(){return new Slide(this.id);}after(){}}
 const slides=[...fs.readFileSync('index.html','utf8').matchAll(/data-animation="([^"]+)"/g)].map(m=>new Slide(m[1]));
 const m=await modules(['catalog','presentation','engine','renderer','code-syntax','scene-config'],{document:{querySelectorAll:()=>slides}});
 const scene=m.presentation.prepareSlides(m.catalog.scenes,{format}).get(id),c=m.engine.compileScene(scene);
 return {m,scene,c,render:m.renderer.renderScene};
}
const at=(c,stop)=>c.stops.find(s=>s.id===stop).time;
const frame=(c,stop)=>c.snapshot(at(c,stop));
const metrics=f=>Object.fromEntries(f.metrics.map(m=>[m.label,m.value]));
const node=(f,nodeId)=>f.nodes.find(n=>n.id===nodeId);
const values=(f,anchor)=>Array.from(f.histories.find(h=>h.anchor===anchor).values,v=>v.value);
const stops=['from-a','from-b','from-complete','defer-definition','defer-a','defer-b','defer-a-complete','defer-b-complete','summary'];

test('one diagram in two phases with the agreed checkpoints; only the phase boundary stops pause AUTO',async()=>{
 const {scene,c}=await deck();
 assert.equal(scene.title,'defer — nie wywołuj mnie jeszcze');
 assert.deepEqual(Array.from(c.stops,s=>s.id),stops);
 assert.deepEqual(Array.from(c.stops.filter(s=>s.autoPause),s=>s.id),['from-complete','defer-definition']);
 assert.deepEqual(Array.from(c.plan.phases,p=>p.name),['from','defer']);
 const boundary=c.plan.phases[1].offset;
 assert.ok(at(c,'from-complete')<boundary&&at(c,'defer-definition')>boundary);
 for(const stop of c.stops)assert.equal(c.snapshot(stop.time).phase,stop.scenePhase,stop.id);
 // Nigdy oba warianty naraz: każdy kadr ma tylko jeden kafelek źródła i kod jednego wariantu.
 for(const time of [0,...c.stops.map(s=>s.time),c.duration]){
  const f=c.snapshot(time),sources=f.nodes.filter(n=>['source','defer'].includes(n.id));
  assert.equal(sources.length,1,String(time));
  const code=f.codeView.flat().map(p=>p.text).join('');
  assert.ok(f.phase==='from'?code==='const user$ = from(loadUser());':code==='const user$ = defer(() => loadUser());',code);
 }
});

test('from(loadUser()) starts HTTP before any subscription; A and B observe the same Promise',async()=>{
 const {c,render}=await deck(),ready=c.snapshot(0),http=node(ready,'source').executionRows;
 assert.equal(ready.phase,'from');
 assert.equal(http.length,1);assert.equal(http[0].id,'HTTP #1');assert.equal(http[0].state,'running');assert.ok(http[0].progress>0);
 assert.deepEqual(metrics(ready),{'Wywołania loadUser()':1,'Requesty HTTP':1});
 assert.equal(node(ready,'A').visible,false);assert.equal(node(ready,'B').visible,false);
 assert.equal(ready.edges.filter(e=>e.visible).length,0,'brak subskrypcji w READY');
 const svg=render(ready);
 assert.match(svg,/data-execution-row="HTTP #1"[^>]*data-row-state="running"/);
 assert.match(svg,/>pending</);
 assert.match(svg,/data-callout="loadUser\(\)"/);
 for(const stop of ['from-a','from-b']){
  const f=frame(c,stop);
  assert.equal(node(f,'source').executionRows.length,1,stop);
  assert.equal(node(f,'source').executionRows[0].state,'running',stop);
  assert.deepEqual(metrics(f),{'Wywołania loadUser()':1,'Requesty HTTP':1},stop);
 }
 assert.ok(node(frame(c,'from-b'),'source').executionRows[0].progress>node(frame(c,'from-a'),'source').executionRows[0].progress);
 assert.deepEqual(Array.from(node(frame(c,'from-b'),'source').laneStates,l=>[l.subscriber,l.role,l.state]),
  [['A','operator','running'],['B','operator','running']]);
 // Jedna emisja Promise: wspólna wartość i chwila logiczna dla obu subskrypcji, potem complete.
 const a=c.plan.records.get('from-A'),b=c.plan.records.get('from-B');
 assert.equal(a.events.length,1);assert.equal(b.events.length,1);
 assert.equal(a.events[0].logicalAt,b.events[0].logicalAt);assert.equal(a.events[0].value,b.events[0].value);
 const resolved=c.plan.phases[0].plan.records.get('from-A').events[0].logicalAt;
 assert.ok(c.events.find(e=>e.type==='subscribe'&&e.edge==='from-A').at<resolved);
 assert.equal(a.end.kind,'complete');assert.equal(b.end.kind,'complete');
 const done=frame(c,'from-complete'),doneSvg=render(done);
 assert.equal(node(done,'source').executionRows[0].state,'completed');
 assert.match(doneSvg,/✓ resolved/);
 assert.deepEqual(values(done,'A'),['{…}']);assert.deepEqual(values(done,'B'),['{…}']);
 assert.equal((doneSvg.match(/data-lane-terminal="completed"/g)||[]).length,2);
 assert.deepEqual(metrics(done),{'Wywołania loadUser()':1,'Requesty HTTP':1});
});

test('defer(() => loadUser()) calls the factory once per subscription: two parallel HTTP, then User and complete each',async()=>{
 const {c,render}=await deck(),definition=frame(c,'defer-definition');
 assert.equal(definition.phase,'defer');
 assert.deepEqual(metrics(definition),{'Wywołania loadUser()':0,'Requesty HTTP':0});
 assert.equal(node(definition,'defer').visible,true);
 assert.equal(node(definition,'defer').laneStates.length,0);
 assert.equal(node(definition,'defer').executionRows,undefined);
 assert.equal(node(definition,'A').visible,false);assert.equal(node(definition,'B').visible,false);
 assert.equal(definition.edges.filter(e=>e.visible).length,0);
 assert.deepEqual(values(definition,'A'),[]);assert.deepEqual(values(definition,'B'),[]);
 const a=frame(c,'defer-a');
 assert.deepEqual(metrics(a),{'Wywołania loadUser()':1,'Requesty HTTP':1});
 assert.match(render(a),/data-callout="loadUser\(\)" data-callout-lane="#1"/);
 const b=frame(c,'defer-b'),lanes=node(b,'defer').laneStates;
 assert.deepEqual(metrics(b),{'Wywołania loadUser()':2,'Requesty HTTP':2});
 assert.deepEqual(Array.from(lanes,l=>[l.subscriber,l.role,l.state]),[['A','work','running'],['B','work','running']]);
 assert.equal(b.executionCounts.active,2,'oba HTTP równolegle');
 assert.match(render(b),/data-callout="loadUser\(\)" data-callout-lane="#2"/);
 const aDone=frame(c,'defer-a-complete');
 assert.deepEqual(Array.from(node(aDone,'defer').laneStates,l=>l.state),['completed','running']);
 assert.deepEqual(values(aDone,'A'),['{…}']);assert.deepEqual(values(aDone,'B'),[]);
 const bDone=frame(c,'defer-b-complete');
 assert.deepEqual(values(bDone,'B'),['{…}']);
 assert.deepEqual({...bDone.executionCounts},{started:2,active:0,completed:2,cancelled:0,error:0});
 for(const edge of ['defer-A','defer-B']){
  const record=c.plan.records.get(edge);
  assert.deepEqual(Array.from(record.events,e=>e.value),['{…}']);assert.equal(record.end.kind,'complete');
  assert.ok(record.events[0].arrival<=record.end.at,'User przed complete');
  // Rekordy planu fazy mają czas fazy; zdarzenia sceny są przesunięte o początek fazy.
  const offset=c.plan.phases.find(p=>p.name===record.phase).offset;
  assert.ok(c.events.find(e=>e.type==='connected'&&e.edge===edge).at-offset<record.events[0].at,'request dopiero po subskrypcji');
 }
 assert.notEqual(c.plan.records.get('defer-A').events[0].logicalAt,c.plan.records.get('defer-B').events[0].logicalAt);
 assert.match(frame(c,'summary').caption,/from: 1 wywołanie, 1 HTTP · defer: 2 wywołania, 2 HTTP/);
});

test('no error, retry or unsubscribe; the defer phase keeps nothing from the from phase',async()=>{
 const {c,render}=await deck();
 assert.ok(!c.events.some(e=>['stream-error','inner-unsubscribe'].includes(e.type)));
 for(const r of c.plan.records.values())assert.equal(r.end.kind,'complete',r.id);
 const boundary=c.plan.phases[1].offset;
 for(const time of [boundary,boundary+.05,at(c,'defer-definition')]){
  const f=c.snapshot(time),svg=render(f);
  assert.equal(f.phase,'defer');
  assert.ok(!f.nodes.some(n=>n.id==='source'));
  assert.equal(f.tokens.length,0);
  assert.deepEqual(metrics(f),{'Wywołania loadUser()':0,'Requesty HTTP':0});
  assert.doesNotMatch(svg,/HTTP #1|data-lane-terminal|data-execution-row/);
 }
});

test('geometry fits both formats; text stays inside its tiles and nothing reaches the controls band',async()=>{
 for(const format of ['4:3','16:9']){
  const {c,render}=await deck(format);
  for(const time of [0,...c.stops.map(s=>s.time),c.duration]){
   const f=c.snapshot(time);
   assert.equal(f.textScale,1.42);
   for(const n of f.nodes.filter(n=>n.visible)){
    assert.ok(n.x-n.w/2>=0&&n.x+n.w/2<=f.width,format+' '+n.id);
    assert.ok(n.y-n.h/2>=0&&n.y+n.h/2<=f.height-8,format+' '+n.id+' '+time);
   }
   for(const callout of f.callouts||[])assert.ok(callout.y>0&&callout.y<node(f,f.phase==='from'?'source':'defer').top,format+' callout');
   const src=node(f,f.phase==='from'?'source':'defer'),label=String(src.label);
   // Renderer zmniejsza etykietę do (w − 24)/(znaki · 0,55), ale nie poniżej 26 · textScale — wtedy tekst by wystawał.
   assert.ok((src.w-24)/(label.length*.55)>=26*f.textScale,format+' etykieta '+label);
   assert.match(render(f),new RegExp(`viewBox="0 0 ${f.width} ${f.height}"`));
  }
 }
});

test('MANUAL stops at every checkpoint; AUTO pauses on the from result and on the defer definition',async()=>{
 const {scene,c}=await deck(),h=await playbackHarness(),{player,controller}=h.create({scene});
 assert.equal(player.state,'ready');
 for(let i=0;i<stops.length;i++){controller.next();h.advance(15000);
  assert.equal(player.time,c.stops[i].time,stops[i]);assert.equal(player.isPlaying,false,stops[i]);}
 controller.next();h.advance(15000);assert.equal(player.state,'finished');
 const final=JSON.stringify(player.snapshot);
 controller.previous();assert.equal(player.time,at(c,'summary'));
 controller.seek(at(c,'defer-a'));controller.previous();assert.equal(player.time,at(c,'defer-definition'));
 // Cofnięcie przez granicę faz: kadr wyniku from jest identyczny jak przy pierwszym przejściu.
 controller.previous();assert.equal(player.time,at(c,'from-complete'));
 assert.equal(JSON.stringify(player.snapshot),JSON.stringify(c.snapshot(at(c,'from-complete'))));
 assert.equal(player.snapshot.phase,'from');
 controller.reset();assert.equal(player.state,'ready');assert.equal(player.time,0);assert.equal(h.frames.size,0);
 assert.equal(player.resetOnExit,true);

 const auto=await playbackHarness(),run=auto.create({scene});
 run.controller.setMode('auto');auto.advance(30000);
 assert.equal(run.player.time,at(c,'from-complete'));assert.equal(run.player.isPlaying,false);
 run.controller.toggle();auto.advance(30000);
 assert.equal(run.player.time,at(c,'defer-definition'));assert.equal(run.player.isPlaying,false);
 assert.deepEqual(metrics(run.player.snapshot),{'Wywołania loadUser()':0,'Requesty HTTP':0});
 run.controller.next();auto.advance(30000);
 assert.equal(run.player.state,'finished');
 assert.equal(JSON.stringify(run.player.snapshot),final,'MANUAL i AUTO kończą się tym samym kadrem');
 // Szybkie „dalej” w AUTO kończy etap; F zawsze daje nieruchomy wynik.
 run.controller.reset();run.controller.next();auto.advance(500);run.controller.next();
 assert.equal(run.player.isPlaying,false);assert.ok(run.player.time<=at(c,'from-complete'));
 run.controller.finish();assert.equal(run.player.state,'finished');assert.equal(JSON.stringify(run.player.snapshot),final);
});

test('order, return link, code marks and speaker notes',async()=>{
 const {m,c}=await deck(),order=Array.from(m['scene-config'].extraOrder);
 assert.deepEqual(order,['x01-sharereplay-interval','x02-combinelatest-withlatestfrom','x03-retry-backoff',id]);
 assert.ok(!m['scene-config'].mainOrder.includes(id));
 const html=fs.readFileSync('index.html','utf8');
 assert.ok(html.indexOf(`<section id="${id}"`)>html.indexOf('<section id="x03-retry-backoff"'));
 const template=html.match(new RegExp(`<template data-checkpoint-notes="${id}">([\\s\\S]*?)</template>`))[1];
 assert.deepEqual([...template.matchAll(/data-checkpoint="([^"]+)"/g)].map(m=>m[1]),['ready',...stops,'finished']);
 assert.match(template,/Ale co, jeśli mamy funkcję, która nie zwraca Observable, tylko Promise\?/);
 assert.match(template,/Defer opóźnia nie tylko pracę źródła, ale samo wywołanie funkcji/);
 assert.match(template,/selectedId/);
 assert.match(template,/nie trzeba automatycznie dodawać defer/);
 const marks=phase=>JSON.parse(JSON.stringify(c.snapshot(phase==='from'?0:at(c,'defer-definition')).codeView.flat().filter(p=>p.mark).map(p=>[p.text,p.mark.id])));
 assert.deepEqual(marks('from'),[['loadUser()','load-user']]);
 assert.deepEqual(marks('defer'),[['defer','defer'],['loadUser()','load-user']]);
 assert.ok(c.snapshot(0).codeView.flat().find(p=>p.text==='loadUser()').active,'loadUser() świeci, gdy HTTP trwa bez subskrypcji');
 assert.ok(!frame(c,'defer-definition').codeView.flat().find(p=>p.text==='loadUser()').active);
});

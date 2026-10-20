const {test}=require('node:test'),assert=require('node:assert/strict');
const {modules,playbackHarness}=require('./v2-harness.cjs');
const definitions=[['08-map-strumienie','concatAll'],['09-concatmap','concatMap'],['10-mergemap','mergeMap'],['11-switchmap','switchMap'],['12-exhaustmap','exhaustMap']];
async function family(){
 const m=await modules(['reference-scenes','engine','renderer']);
 const scene=(id,format='4:3')=>{const s={id,format};m['reference-scenes'].configureFlatten(s,definitions.find(d=>d[0]===id)[1]);return s;};
 return {definitions,scene,compile:m.engine.compileScene,render:m.renderer.renderScene};
}
const find=(c,selector)=>c.events.find(e=>Object.entries(selector).every(([k,v])=>e[k]===v));
const rows=(c,t)=>c.snapshot(t).innerWorkPanels[0].rows;

test('the five HTTP slides share S1, frameless rows, palette and one response per completed request',async()=>{
 const {definitions,scene,compile,render}=await family();
 const expected={concatAll:['A'],concatMap:['A','B','C'],mergeMap:['B','A','C'],switchMap:['B','C'],exhaustMap:['A','C']};
 for(const format of ['4:3','16:9'])for(const [id,mode]of definitions){
  const s=scene(id,format),c=compile(s),f=c.snapshot(c.duration),panel=f.panels[0],receiver=f.nodes.find(n=>n.id==='observer');
  assert.equal(s.http,true);assert.equal(panel.frameless,true);
  // 08–12: osobne instancje (nagłówek + lane + odstęp).
  assert.ok(panel.instances&&panel.rowStep>panel.headerH+panel.rowHeight,id);
  assert.equal(f.histories.length,1);assert.equal(f.histories[0].anchor,'observer');
  assert.deepEqual(Array.from(f.histories[0].values,v=>v.value),expected[mode]);
  assert.ok(f.edges.filter(e=>e.subscriber).every(e=>e.subscriber==='S1'&&e.points.every(p=>p[1]===e.points[0][1])));
  const h=f.histories[0],ball=h.ball;
  assert.ok(h.x+3*(2*ball.r+h.gap)+ball.r<receiver.x+receiver.w/2);assert.ok(ball.r*2+3<=receiver.h);
  for(const r of c.plan.records.values())if(/^inner\d+-op$/.test(r.id)){
   assert.equal(r.events.length,r.end.kind==='unsubscribe'?0:1);
   if(r.events.length){assert.equal(r.events[0].logicalAt,r.end.logicalAt);assert.ok(r.events[0].arrival<r.end.at);}
  }
  assert.match(render(f),/HTTP GET/);assert.match(render(f),/data-panel-divider/);
  assert.doesNotMatch(render(f),/stroke="#111"/);
 }
});

test('map + concatAll: six manual steps separate creation, subscription, response and complete for one HTTP request',async()=>{
 const {scene,compile,render}=await family();
 for(const format of ['4:3','16:9']){
  const s=scene('08-map-strumienie',format),c=compile(s),ready=c.snapshot(0);
  const frames=Object.fromEntries(c.stops.map(stop=>[stop.id,c.snapshot(stop.time)]));
  const time=id=>c.stops.find(stop=>stop.id===id).time;
  assert.equal(s.code,'id$.pipe(map(id => httpGet(url(id))), concatAll())');
  assert.deepEqual(Array.from(c.stops,stop=>stop.id),['first','created','active','received','complete-a','complete']);
  assert.equal(s.playback.entry,'manual');assert.equal(s.playback.afterLastManualStop,undefined);assert.equal(s.playback.finish,'hold');
  assert.equal(time('complete'),c.duration);
  assert.ok(c.stops.every((stop,i)=>!i||stop.time>c.stops[i-1].time));
  assert.deepEqual(Array.from(ready.nodes.filter(n=>n.visible),n=>n.id).sort(),['observer','op','projection','source']);
  assert.ok(ready.edges.every(edge=>!edge.visible));assert.equal(ready.innerWorkPanels[0].rows.length,0);
  assert.match(render(ready),/data-icon="inbox"/);
  assert.ok(frames.first.edges.filter(e=>e.subscriber).every(e=>e.visible&&e.phase==='subscribed'&&e.progress===1));
  assert.equal(frames.first.executionCounts.started,0);
  assert.equal(frames.first.tokens.find(t=>t.phase==='transform').value,'A$');
  assert.equal(frames.first.tokens.find(t=>t.phase==='transform').x,frames.first.nodes.find(n=>n.id==='projection').x);
  assert.equal(frames.first.innerWorkPanels[0].rows.length,0);
  const created=frames.created,row=created.innerWorkPanels[0].rows[0],html=render(created);
  assert.equal(created.executionCounts.started,0);
  assert.equal(row.state,'idle');assert.equal(row.stages[0].state,'idle');assert.equal(row.stages[0].progress,0);
  assert.equal(row.receiver.state,'idle');assert.equal(row.opacity,1);
  assert.ok(row.wires.every(wire=>!wire.visible));assert.equal(row.tokens.length,0);
  assert.match(html,/HTTP GET/);assert.match(html,/>inner #1</);
  assert.doesNotMatch(html,/data-inner-wire|data-inner-port|data-inner-progress/);
  assert.equal(frames.active.executionCounts.started,1);assert.equal(frames.active.executionCounts.active,1);
  assert.equal(frames.active.innerWorkPanels[0].rows[0].state,'active');
  assert.equal(frames.active.innerWorkPanels[0].rows[0].stages[0].progress,0);
  assert.deepEqual(Array.from(frames.received.histories[0].values,v=>v.value),['A']);
  assert.equal(frames.received.innerWorkPanels[0].rows[0].receiver.state,'active');
  assert.equal(frames.received.executionCounts.active,1);
  assert.equal(frames['complete-a'].executionCounts.active,0);assert.equal(frames['complete-a'].executionCounts.started,1);
  assert.equal(frames['complete-a'].innerWorkPanels[0].rows[0].receiver.state,'completed');
  assert.equal(frames['complete-a'].nodes.find(n=>n.id==='observer').notification,null);
  for(const [i,value]of ['A'].entries()){
   const input=c.plan.records.get('source-projection').events[i],mapped=c.plan.records.get('projection-op').events[i];
   assert.equal(input.logicalAt,mapped.logicalAt);assert.equal(mapped.value,value+'$');
   const before=c.snapshot(input.arrival+(mapped.at-input.arrival)*.25),after=c.snapshot(input.arrival+(mapped.at-input.arrival)*.75);
   assert.equal(before.tokens.find(t=>t.phase==='transform').value,value);
   assert.equal(after.tokens.find(t=>t.phase==='transform').value,value+'$');
   const born=find(c,{type:'inner-create',node:'inner'+i}),subscription=c.plan.records.get('inner'+i+'-op');
   assert.equal(born.at,mapped.arrival);assert.ok(subscription.start>born.at+.3);
   const response=subscription.events[0],output=c.plan.records.get('op-observer').events[i];
   assert.equal(response.arrival,output.at);
   assert.ok(output.arrival+.3<subscription.end.at,'odpowiedź u S1 przed complete HTTP');
   assert.equal(c.snapshot(response.arrival).innerWorkPanels[0].rows[i].receiver.value,value);
   assert.equal(subscription.connectDuration,.4);
   assert.ok(Math.abs(response.at-(subscription.start+subscription.connectDuration)-.8)<1e-8);
  }
  // id$ kończy się dopiero po complete innera: complete S1 bez aktywnych innerów.
  assert.equal(c.plan.records.get('source-projection').events.length,1);
  assert.ok(c.plan.records.get('source-projection').end.at>=c.plan.records.get('inner0-op').end.at+c.plan.records.get('inner0-op').end.duration);
  assert.equal(frames['complete-a'].nodes.find(n=>n.id==='source').notification,null);
  const final=frames.complete;
  assert.ok(final.innerWorkPanels[0].rows.every(row=>row.receiver.state==='completed'));
  assert.ok(final.nodes.filter(n=>['source','projection','op','observer'].includes(n.id)).every(n=>n.notification==='complete'));
  assert.deepEqual(Array.from(final.metrics,m=>[m.label,m.value]),[['Innery uruchomione',1],['Aktywne',0]]);
  assert.equal(c.events.filter(e=>e.type==='inner-create').length,1);
  assert.ok(!c.events.some(e=>['queue-add','queue-pop','inner-unsubscribe','stream-error'].includes(e.type)));
  for(const t of [...c.checkpoints,...Array.from({length:Math.ceil(c.duration*10)},(_,i)=>i/10)]){
   const f=c.snapshot(t),expected=JSON.stringify(f);
   assert.ok(f.innerWorkPanels[0].rows.length<=1);
   assert.ok(f.innerWorkPanels[0].rows.every(r=>!['queued','pending'].includes(r.state)));
   assert.doesNotMatch(render(f),/W KOLEJCE|data-inner-placeholder|inner #2|B\$|C\$|Kolejka/);
   assert.ok(f.executionCounts.active<=1);
   c.snapshot(c.duration);c.snapshot(0);assert.equal(JSON.stringify(c.snapshot(t)),expected);
  }
 }
});

test('concatAll manual playback holds all seven frames, fast next finishes the current step, reset and AUTO preserve the final frame',async()=>{
 const {scene}=await family(),s=scene('08-map-strumienie'),h=await playbackHarness(),{player}=h.create({scene:s});
 for(const stop of player.stops){
  player.playTo(stop.time);h.advance(20000);
  assert.equal(player.time,stop.time);assert.equal(h.frames.size,0);
  const expected=JSON.stringify(player.snapshot);h.advance(10000);assert.equal(JSON.stringify(player.snapshot),expected);
 }
 const final=JSON.stringify(player.snapshot);
 for(const stop of [...player.stops].reverse()){
  player.seek(stop.time);assert.equal(player.time,stop.time);
 }
 player.seek(0);
 for(const stop of player.stops){player.playTo(stop.time);h.advance(100);assert.equal(player.finishStep(),true);assert.equal(player.time,stop.time);}
 player.seek(0);player.playContinuously();h.advance(20000);
 assert.equal(player.state,'finished');assert.equal(JSON.stringify(player.snapshot),final);assert.equal(h.frames.size,0);
 player.seek(0);assert.equal(player.state,'ready');assert.equal(player.snapshot.executionCounts.started,0);assert.equal(h.frames.size,0);
});

const comparison=definitions.slice(1);
const stopAt=(c,id)=>c.stops.find(s=>s.id===id).time;

test('the four strategies stop at the same moment: A works at half, B arrived, its fate is unknown',async()=>{
 const {scene,compile,render}=await family(),progress=[];
 const input=JSON.stringify(scene('09-concatmap').rows[0].events.slice(0,2));
 for(const [id,mode]of comparison){
  const s=scene(id),c=compile(s),t=stopAt(c,'question'),f=c.snapshot(t),r=rows(c,t),svg=render(f);
  assert.equal(JSON.stringify(s.rows[0].events.slice(0,2)),input,id);
  assert.equal(s.code,`id$.pipe(${mode}(id => httpGet(url(id))))`);
  assert.deepEqual(Array.from(r,row=>[row.id,row.value,row.state]),[['#1','A','active'],['#2','B','pending']],id);
  assert.equal(r[1].question,1);assert.equal(r[1].stages,undefined);assert.equal(r[1].wires,undefined);
  assert.doesNotMatch(svg,/w kolejce|pominięte|anulowane|data-inner-cancel/,id);
  assert.equal(f.executionCounts.started,1);assert.equal(f.executionCounts.active,1);
  assert.equal(f.histories[0].values.length,0);
  assert.ok(find(c,{type:'deliver-next',edge:'source-op',value:'B'}).at<t,id);
  progress.push(r[0].stages[0].progress);
  // Reakcja dopiero po pytaniu: chwilę przed decyzją nadal ten sam stan, bez projekcji B i bez anulowania A.
  const decided=find(c,{type:'operator-decision'}).at;
  assert.ok(decided>t,id);
  assert.deepEqual(Array.from(rows(c,decided-.01),row=>row.state),['active','pending'],id);
  assert.ok(!c.events.some(e=>e.at<decided&&(e.node==='inner1'&&e.type==='inner-create'||e.type==='inner-unsubscribe')),id);
  // Odpowiedź wymaga kolejnego ręcznego kroku, a nie AUTO.
  assert.equal(c.stops.findIndex(x=>x.id==='answer'),c.stops.findIndex(x=>x.id==='question')+1);
  assert.equal(s.playback.entry,'manual');assert.equal(s.playback.afterLastManualStop,'start-auto');
 }
 assert.ok(progress.every(p=>Math.abs(p-progress[0])<1e-9),progress.join());
 assert.ok(progress[0]>.4&&progress[0]<.6,String(progress[0]));
});

test('only concatMap animates the main subscription; the other three start with S1 already connected',async()=>{
 const {scene,compile}=await family();
 for(const [id]of comparison){
  const c=compile(scene(id)),f=c.snapshot(0),ids=Array.from(c.stops,s=>s.id),concat=id==='09-concatmap';
  assert.deepEqual(ids.slice(0,concat?4:1),concat?['subscribe','first','active','question']:['question'],id);
  const wires=f.edges.filter(e=>e.visible&&e.subscriber==='S1');
  assert.equal(wires.length,concat?0:2,id);
  if(!concat){
   assert.ok(wires.every(e=>e.progress===1&&e.phase==='subscribed'));
   assert.ok(f.nodes.filter(n=>['source','op','observer'].includes(n.id)).every(n=>n.visible&&n.opacity===1));
   assert.equal(rows(c,0).length,0);
  }
  for(const t of [0,...c.stops.map(s=>s.time)]){
   const expected=JSON.stringify(c.snapshot(t));c.snapshot(c.duration);c.snapshot(0);assert.equal(JSON.stringify(c.snapshot(t)),expected);
  }
 }
});

const groups=svg=>svg.split('<g data-inner-work="').slice(1).map(part=>part.split('<g data-inner-work="')[0]);
const count=(text,pattern)=>(text.match(pattern)||[]).length;

test('09–12: each started inner is a full pipeline — #n, input ball, HTTP GET tile, full inner subscriber; values without inner have no HTTP',async()=>{
 const {scene,compile,render}=await family();
 for(const format of ['4:3','16:9'])for(const [id]of comparison){
  const c=compile(scene(id,format)),panel=c.snapshot(0).panels[0],top=c.snapshot(0).nodes.find(n=>n.id==='source');
  assert.ok(panel.instances,id);assert.deepEqual(Array.from(panel.columns,col=>col.label),['HTTP GET']);
  assert.equal(panel.works.length,3,id);
  // Trzy sloty mieszczą się między górnym pipeline'em a dołem ramki; subscriber stoi za kablem, na wysokości lane.
  assert.ok(panel.rowsTop>top.y+top.h/2&&panel.dividerY<panel.rowsTop,id);
  assert.ok(panel.rowsTop+2*panel.rowStep+panel.headerH+panel.rowHeight<=c.snapshot(0).height-8,id);
  // Wspólne kolumny: ID od x 50, kulka, HTTP GET od x 180 (300), subscriber pod odbiorcą głównym (840–1210).
  assert.deepEqual([panel.idX,panel.stagesLeft,panel.stageWs[0],panel.receiverX,panel.receiverW],[50,180,300,840,370]);
  assert.ok(panel.idX<panel.ballX&&panel.ballX<panel.stagesLeft,id);
  for(const t of [stopAt(c,'question'),stopAt(c,'answer'),c.duration]){
   const f=c.snapshot(t),svg=render(f),parts=groups(svg),rows=f.innerWorkPanels[0].rows;
   // Kafelek HTTP GET istnieje tylko dla utworzonego inner (projekcja wywołana); subskrypcja może jeszcze trwać.
   assert.equal(count(svg,/data-inner-header=/g),rows.filter(r=>r.stages).length,id+' '+t);
   assert.ok(rows.filter(r=>r.stages).length>=f.executionCounts.started,id+' '+t);
   for(const [i,row]of rows.entries()){
    const part=parts[i],lane=row.y+panel.headerH,cy=lane+panel.rowHeight/2;
    // ID i kulka wejścia osobno (bez napisu „#1 · A”), w stałych kolumnach.
    assert.equal(count(part,/data-inner-id=/g),1);assert.doesNotMatch(part,/data-inner-name|>#\d · [ABC]</);
    assert.match(part,new RegExp(`<text x="${panel.idX}" y="${cy}"[^>]*>${row.id}</text>`));
    assert.match(part,new RegExp(`data-inner-ball="${row.value}"[^>]*><circle cx="${panel.ballX}" cy="${cy}"`));
    if(['pending','queued','ignored'].includes(row.state)){
     assert.doesNotMatch(part,/data-inner-header|data-inner-lane|data-inner-receiver|data-inner-port|data-inner-progress|data-inner-wire/,id+' '+row.state);
     assert.match(part,new RegExp(`data-inner-placeholder="${row.state}"[^>]*><rect x="${panel.stagesLeft}" y="${lane}" width="${panel.receiverX+panel.receiverW-panel.stagesLeft}" height="${panel.rowHeight-1}"`));
    }else{
     assert.equal(count(part,/data-inner-header=/g),1);assert.equal(count(part,/data-inner-lane=/g),1);assert.equal(count(part,/data-inner-receiver=/g),1);
     assert.match(part,new RegExp(`data-inner-header="source" x="${panel.stagesLeft}" y="${row.y}" width="${panel.stageWs[0]}" height="${panel.headerH}"`));
     assert.match(part,new RegExp(`data-inner-lane="source" x="${panel.stagesLeft}" y="${lane}" width="${panel.stageWs[0]}" height="${panel.rowHeight-1}"`));
     assert.match(part,new RegExp(`<rect x="${panel.receiverX}" y="${lane}" width="${panel.receiverW}" height="${panel.rowHeight-1}"`));
     assert.match(part,new RegExp(`>inner ${row.id}</text>`));assert.doesNotMatch(part,/>S1</);
    }
   }
  }
 }
});

test('the instance layout keeps HTTP GET and the subscriber columns and fits another stage (catchError) between them',async()=>{
 const {createInnerWorkPanel}=(await modules(['inner-work-panel']))['inner-work-panel'];
 const columns=[{id:'source',label:'HTTP GET'},{id:'catch',label:'catchError'}];
 for(const large of [true,false]){
  const one=createInnerWorkPanel({works:[],columns:columns.slice(0,1),height:large?612:460,large,instances:true,minRows:3});
  const two=createInnerWorkPanel({works:[],columns,height:large?612:460,large,instances:true,minRows:3});
  assert.deepEqual([two.stageXs[0],two.stageWs[0],two.receiverX,two.receiverW],[one.stageXs[0],one.stageWs[0],one.receiverX,one.receiverW]);
  assert.equal(two.stageXs[1]-(two.stageXs[0]+two.stageWs[0]),two.stageGap);
  assert.equal(two.receiverX-(two.stageXs[1]+two.stageWs[1]),two.stageGap);
  assert.ok(two.stageWs[1]>=200,'catchError czytelny');assert.equal(two.rowsTop,one.rowsTop);
  assert.ok(two.receiverX+two.receiverW<two.x+two.w);
 }
});

test('concatMap answer: B in the queue, no projection until A completes',async()=>{
 const {scene,compile,render}=await family(),c=compile(scene('09-concatmap')),t=stopAt(c,'answer');
 assert.deepEqual(Array.from(rows(c,t),r=>r.state),['active','queued']);
 assert.match(render(c.snapshot(t)),/>W KOLEJCE</);
 const doneA=find(c,{type:'stream-complete',edge:'inner0-op'}).at,bornB=find(c,{type:'inner-create',node:'inner1'}).at;
 assert.ok(bornB>=doneA);assert.equal(c.snapshot(t).executionCounts.started,1);
 // C przychodzi dopiero po complete B: kolejka pusta, więc HTTP C startuje od razu — i nigdy przed końcem B.
 const doneB=find(c,{type:'stream-complete',edge:'inner1-op'}).at,arrivedC=find(c,{type:'deliver-next',edge:'source-op',value:'C'}).at;
 const startC=find(c,{type:'inner-subscribe',edge:'inner2-op'}).at;
 assert.ok(doneB<arrivedC&&arrivedC<startC);
 assert.deepEqual(Array.from(rows(c,arrivedC),r=>r.state).slice(0,2),['completed','completed']);
 const html=require('node:fs').readFileSync('index.html','utf8'),notes=html.match(/<template data-checkpoint-notes="09-concatmap">([\s\S]*?)<\/template>/)[1];
 assert.match(notes,/B kończy się, zanim przyjdzie C/);
});

test('mergeMap answer: two active HTTP rows, B returns before A',async()=>{
 const {scene,compile}=await family(),c=compile(scene('10-mergemap')),t=stopAt(c,'answer');
 const r=rows(c,t);
 assert.deepEqual(Array.from(r,row=>row.state),['active','active']);
 assert.equal(new Set(r.map(row=>row.color)).size,2);assert.equal(c.snapshot(t).executionCounts.active,2);
 const end=value=>find(c,{type:'stream-complete',execution:value}).at;
 assert.ok(end('B')<end('A'));
 const got=find(c,{type:'deliver-next',edge:'op-observer',value:'B'});
 assert.match(c.snapshot(got.at).caption,/B wróciło przed A/);
});

test('switchMap answer: grey × tears down inner A (no complete, S1 untouched), then B starts',async()=>{
 const {scene,compile,render}=await family(),c=compile(scene('11-switchmap'));
 const cancel=find(c,{type:'inner-unsubscribe',edge:'inner0-op'}),during=cancel.at+.4,a=rows(c,during)[0];
 assert.equal(a.state,'active');assert.ok(a.wires[0].cancel.at>0&&a.wires[0].cancel.at<1);
 assert.match(render(c.snapshot(during)),/data-inner-cancel="#1-0"/);
 assert.doesNotMatch(render(c.snapshot(during),{reducedMotion:true}),/data-inner-cancel="/);
 assert.ok(c.snapshot(during).edges.filter(e=>e.subscriber==='S1').every(e=>e.phase==='subscribed'));
 const answered=rows(c,stopAt(c,'answer'));
 assert.equal(answered[0].state,'cancelled');assert.ok(['pending','subscribing'].includes(answered[1].state));
 const r=rows(c,stopAt(c,'started'));
 assert.deepEqual(Array.from(r,row=>row.state),['cancelled','active']);
 const cancelled=r[0];
 assert.ok(cancelled.stages[0].progress>0&&cancelled.stages[0].progress<1);
 assert.equal(cancelled.wires[0].pulse,null);assert.equal(cancelled.wires[0].cancel,null);assert.equal(cancelled.wires[0].color,'#808890');assert.equal(cancelled.tokens.length,0);
 assert.ok(!c.events.some(e=>e.type==='stream-complete'&&e.edge==='inner0-op'));
 const f=c.snapshot(c.duration);assert.equal(f.executionCounts.cancelled,1);assert.equal(f.executionCounts.completed,2);
 assert.match(render(f),/anulowane/);
});

test('exhaustMap answer: B ignored without inner or queue; C after A starts a new HTTP',async()=>{
 const {scene,compile,render}=await family(),c=compile(scene('12-exhaustmap'));
 const t=stopAt(c,'answer'),ignored=rows(c,t)[1];
 assert.equal(ignored.state,'ignored');assert.equal(ignored.stages,undefined);assert.equal(ignored.wires,undefined);
 assert.match(render(c.snapshot(t)),/>POMINIĘTE</);
 assert.ok(!c.events.some(e=>e.type==='inner-create'&&e.node==='inner1'));
 assert.ok(find(c,{type:'inner-create',node:'inner2'}).at>find(c,{type:'stream-complete',edge:'inner0-op'}).at);
 assert.deepEqual(Array.from(rows(c,c.duration),r=>r.state),['completed','ignored','completed']);
 assert.deepEqual(Array.from(rows(c,c.duration),r=>r.id),['#1','#2','#3']);
 assert.equal(rows(c,0).length,0);
 assert.equal(c.snapshot(c.duration).executionCounts.started,2);
});

test('seeking all event frames in either format is deterministic and local rows stay fixed',async()=>{
 const {definitions,scene,compile,render}=await family();
 for(const format of ['4:3','16:9'])for(const [id]of definitions){
  const c=compile(scene(id,format)),slots=new Map();
  for(const t of [0,...c.events.map(e=>e.at+.01),...c.stops.map(s=>s.time),c.duration]){
   const f=c.snapshot(t),expected=JSON.stringify(f);c.snapshot(c.duration);c.snapshot(0);assert.equal(JSON.stringify(c.snapshot(t)),expected);
   for(const r of f.innerWorkPanels[0].rows){if(slots.has(r.id))assert.equal(r.y,slots.get(r.id));else slots.set(r.id,r.y);}
   assert.doesNotMatch(render(f),/NaN|Infinity|="undefined"/);
  }
 }
});

test('speaker notes of concatAll and the four strategies follow their checkpoints in order',async()=>{
 const {scene,compile}=await family(),html=require('node:fs').readFileSync('index.html','utf8');
 for(const [id]of definitions){
  const source=html.match(new RegExp(`<template data-checkpoint-notes="${id}">([\\s\\S]*?)</template>`))[1];
  const notes=[...source.matchAll(/<div data-checkpoint="([^"]+)">([\s\S]*?)<\/div>/g)];
  assert.deepEqual(notes.map(n=>n[1]),['ready',...Array.from(compile(scene(id)).stops,s=>s.id),'finished'],id);
  if(id!=='08-map-strumienie')assert.match(notes.find(n=>n[1]==='question')[2],/\?/,id);
 }
});

test('09–12 titles hide the operator answer until the question stop has passed',async()=>{
 const fs=require('node:fs'),main=fs.readFileSync('main.js','utf8'),css=fs.readFileSync('animations/reveal.css','utf8');
 const {scene,compile}=await family();
 for(const id of ['09-concatmap','10-mergemap','11-switchmap','12-exhaustmap']){
  const s=scene(id);assert.equal(s.titleAnswerAfter,'question',id);
  assert.ok(compile(s).stops.some(stop=>stop.id==='question'),id);
 }
 assert.equal(scene('08-map-strumienie').titleAnswerAfter,undefined);
 // prepareSlides buduje h2: nazwa operatora + ukryty span z odpowiedzią po „ — ”.
 const heading={},player={setAttribute(k,v){this[k]=v;}},slide={id:'10-mergemap',dataset:{animation:'10-mergemap'},
  querySelector:sel=>sel==='h2'?heading:player};
 const m=await modules(['catalog','presentation'],{document:{querySelectorAll:()=>[slide]}});
 m.presentation.prepareSlides(m.catalog.scenes);
 assert.equal(heading.innerHTML,'mergeMap<span class="rx-title-answer" data-after-stop="question"> — Równocześnie</span>');
 assert.equal(player['aria-label'],'mergeMap');
 assert.match(css,/\.rx-title-answer \{[^}]*opacity:0/);assert.match(css,/\.rx-title-answer\.rx-shown \{ opacity:1/);
 assert.match(main,/player\.time > stop\.time/);
});

test('mergeMap: each inner delivers its result before complete; S1 complete only after the last inner complete, in separate frames',async()=>{
 const {scene,compile}=await family();
 for(const format of ['4:3','16:9']){
  const c=compile(scene('10-mergemap',format)),ev=(type,edge,value)=>c.events.find(e=>e.type===type&&e.edge===edge&&(value===undefined||e.value===value));
  for(const [value,inner] of [['B','inner1-op'],['A','inner0-op'],['C','inner2-op']])
   assert.ok(ev('stream-complete',inner).at>=ev('deliver-next','op-observer',value).at+.45,value+': wynik u S1, potem complete inner');
  assert.ok(ev('stream-complete','op-observer').at>=ev('disconnected','inner2-op').at+.35,'complete S1 po dotarciu complete inner C');
  assert.ok(ev('stream-complete','op-observer').at>ev('disconnected','source-op').at,'id$ zakończone wcześniej');
  const stop=c.stops.find(s=>s.id==='c-result'),f=c.snapshot(stop.time);
  assert.ok(stop.time<ev('stream-complete','inner2-op').at);
  assert.deepEqual(Array.from(f.histories[0].values,v=>v.value),['B','A','C']);
  assert.equal(f.nodes.find(n=>n.id==='observer').notification,null,'S1 bez complete na postoju c-result');
  assert.equal(f.executionCounts.active,1,'inner C jeszcze aktywny');
 }
});

test('switchMap: shorter finale after the new request; A unsubscribed without complete, B and C reach S1',async()=>{
 const {scene,compile}=await family();
 const c=compile(scene('11-switchmap')),started=c.stops.find(s=>s.id==='started').time;
 assert.ok(c.duration-started<11,'finał po starcie nowego requestu krótszy niż 11 s');
 assert.equal(c.plan.records.get('inner0-op').end.kind,'unsubscribe');
 assert.ok(!c.events.some(e=>e.type==='stream-complete'&&e.edge==='inner0-op'));
 assert.deepEqual(Array.from(c.snapshot(c.duration).histories[0].values,v=>v.value),['B','C']);
});

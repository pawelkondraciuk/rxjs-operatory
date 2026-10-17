const {test}=require('node:test'),assert=require('node:assert/strict');
const {modules}=require('./v2-harness.cjs');
const definitions=[['08-map-strumienie','concatAll'],['09-concatmap','concatMap'],['10-mergemap','mergeMap'],['11-switchmap','switchMap'],['12-exhaustmap','exhaustMap']];
async function family(){
 const m=await modules(['reference-scenes','engine','renderer']);
 const scene=(id,format='4:3')=>{const s={id,format};m['reference-scenes'].configureFlatten(s,definitions.find(d=>d[0]===id)[1]);return s;};
 return {definitions,scene,compile:m.engine.compileScene,render:m.renderer.renderScene};
}
const find=(c,selector)=>c.events.find(e=>Object.entries(selector).every(([k,v])=>e[k]===v));
const rows=(c,t)=>c.snapshot(t).innerWorkPanels[0].rows;

test('the four HTTP slides share S1, frameless rows, palette and one response per completed request',async()=>{
 const {definitions,scene,compile,render}=await family();
 const expected={concatAll:['A','B','C'],concatMap:['A','B','C'],mergeMap:['B','A','C'],switchMap:['B','C'],exhaustMap:['A','C']};
 for(const format of ['4:3','16:9'])for(const [id,mode]of definitions){
  const s=scene(id,format),c=compile(s),f=c.snapshot(c.duration),panel=f.panels[0],receiver=f.nodes.find(n=>n.id==='observer');
  assert.equal(s.http,true);assert.equal(panel.frameless,true);
  // 09–12: osobne instancje (nagłówek + lane + odstęp); 08 zachowuje przylegające wiersze wspólnego kafelka.
  if(mode==='concatAll')assert.equal(panel.rowStep,panel.rowHeight);else assert.ok(panel.instances&&panel.rowStep>panel.headerH+panel.rowHeight,id);
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

test('map creates Observable references synchronously; concatAll queues existing inner without subscribing',async()=>{
 const {scene,compile,render}=await family(),c=compile(scene('08-map-strumienie'));
 const input=c.plan.records.get('source-projection').events[0],mapped=c.plan.records.get('projection-op').events[0];
 assert.equal(input.logicalAt,mapped.logicalAt);assert.equal(mapped.value,'A$');
 const before=c.snapshot(input.arrival+(mapped.at-input.arrival)*.25),after=c.snapshot(input.arrival+(mapped.at-input.arrival)*.75);
 assert.equal(before.tokens.find(t=>t.phase==='transform').value,'A');
 assert.equal(after.tokens.find(t=>t.phase==='transform').value,'A$');
 const question=c.stops.at(-1).time,f=c.snapshot(question);
 assert.equal(f.executionCounts.started,1);
 const queued=rows(c,question).filter(r=>r.state==='queued');
 assert.deepEqual(Array.from(queued,r=>r.value),['B$','C$']);assert.ok(queued.every(r=>r.existingObservable&&r.stages===undefined&&r.wires===undefined));
 for(const [i,value]of ['A','B','C'].entries()){
  const born=find(c,{type:'inner-create',node:'inner'+i}),got=find(c,{type:'deliver-next',edge:'projection-op',value:value+'$'});
  assert.equal(born.at,got.at);
  const subscription=c.plan.records.get('inner'+i+'-op');
  assert.ok(subscription.start>=born.at);
 }
 assert.match(render(f),/W KOLEJCE · Observable/);
 const r=c.plan.records.get('inner1-op');
 assert.equal(rows(c,r.start+.4).find(row=>row.id==='#2').state,'subscribing');
 assert.equal(rows(c,r.start+r.connectDuration+.1).find(row=>row.id==='#2').state,'active');
});

const comparison=definitions.slice(1);
const stopAt=(c,id)=>c.stops.find(s=>s.id===id).time;

test('the four strategies stop at the same moment: A works at half, B arrived, its fate is unknown',async()=>{
 const {scene,compile,render}=await family(),progress=[];
 const input=JSON.stringify(scene('09-concatmap').rows[0].events);
 for(const [id,mode]of comparison){
  const s=scene(id),c=compile(s),t=stopAt(c,'question'),f=c.snapshot(t),r=rows(c,t),svg=render(f);
  assert.equal(JSON.stringify(s.rows[0].events),input,id);
  assert.equal(s.code,`source$.pipe(${mode}(id => http.get(url(id))))`);
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

test('09–12: each started inner is its own HTTP GET tile (header + one lane) wired to its own inbox; values without inner have no HTTP',async()=>{
 const {scene,compile,render}=await family();
 for(const format of ['4:3','16:9'])for(const [id]of comparison){
  const c=compile(scene(id,format)),panel=c.snapshot(0).panels[0],top=c.snapshot(0).nodes.find(n=>n.id==='source');
  assert.ok(panel.instances,id);assert.deepEqual(Array.from(panel.columns,col=>col.label),['HTTP GET']);
  assert.equal(panel.works.length,3,id);
  // Trzy sloty mieszczą się między górnym pipeline'em a dołem ramki; inbox stoi za kablem, na wysokości lane.
  assert.ok(panel.rowsTop>top.y+top.h/2&&panel.dividerY<panel.rowsTop,id);
  assert.ok(panel.rowsTop+2*panel.rowStep+panel.headerH+panel.rowHeight<=c.snapshot(0).height-8,id);
  assert.ok(panel.inboxX>panel.stagesLeft+panel.stageW&&panel.inboxX+panel.inboxW<panel.x+panel.w,id);
  for(const t of [stopAt(c,'question'),stopAt(c,'answer'),c.duration]){
   const f=c.snapshot(t),svg=render(f),parts=groups(svg),rows=f.innerWorkPanels[0].rows;
   // Kafelek HTTP GET istnieje tylko dla utworzonego inner (projekcja wywołana); subskrypcja może jeszcze trwać.
   assert.equal(count(svg,/data-inner-header=/g),rows.filter(r=>r.stages).length,id+' '+t);
   assert.ok(rows.filter(r=>r.stages).length>=f.executionCounts.started,id+' '+t);
   for(const [i,row]of rows.entries()){
    const part=parts[i],lane=row.y+panel.headerH;
    assert.equal(count(part,/data-inner-identifier=/g),1);
    assert.match(part,new RegExp(`data-inner-identifier="${row.value}"><rect x="${panel.tileLeft}" y="${lane}"`));
    assert.match(part,/style="fill:#fff;font-weight:700">#\d · [ABC]</);
    if(['pending','queued','ignored'].includes(row.state)){
     assert.doesNotMatch(part,/data-inner-header|data-inner-lane|data-inner-inbox|data-inner-port|data-inner-progress|data-inner-wire/,id+' '+row.state);
    }else{
     assert.equal(count(part,/data-inner-header=/g),1);assert.equal(count(part,/data-inner-lane=/g),1);assert.equal(count(part,/data-inner-inbox=/g),1);
     assert.match(part,new RegExp(`data-inner-header="source" x="${panel.stagesLeft}" y="${row.y}" width="${panel.stageW}" height="${panel.headerH}"`));
     assert.match(part,new RegExp(`<rect x="${panel.inboxX}" y="${lane}" width="${panel.inboxW}"`));
     assert.doesNotMatch(part,/inner subscriber|>sub</);
    }
   }
  }
 }
});

test('the instance layout leaves room for another stage per inner (e.g. catchError) before the inbox',async()=>{
 const {createInnerWorkPanel}=(await modules(['inner-work-panel']))['inner-work-panel'];
 const columns=[{id:'source',label:'HTTP GET'},{id:'catch',label:'catchError'}];
 for(const large of [true,false]){
  const one=createInnerWorkPanel({works:[],columns:columns.slice(0,1),height:large?612:460,large,tileLeft:50,instances:true,minRows:3});
  const two=createInnerWorkPanel({works:[],columns,height:large?612:460,large,tileLeft:50,instances:true,minRows:3});
  assert.equal(two.inboxX-one.inboxX,one.stageW+one.stageGap);assert.equal(two.rowsTop,one.rowsTop);
  assert.ok(two.inboxX+two.inboxW<two.x+two.w);
 }
});

test('concatMap answer: B in the queue, no projection until A completes',async()=>{
 const {scene,compile,render}=await family(),c=compile(scene('09-concatmap')),t=stopAt(c,'answer');
 assert.deepEqual(Array.from(rows(c,t),r=>r.state),['active','queued']);
 assert.match(render(c.snapshot(t)),/>w kolejce</);
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
 assert.match(render(c.snapshot(t)),/>pominięte</);
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

test('speaker notes of the four strategies follow their checkpoints in order',async()=>{
 const {scene,compile}=await family(),html=require('node:fs').readFileSync('index.html','utf8');
 for(const [id]of comparison){
  const source=html.match(new RegExp(`<template data-checkpoint-notes="${id}">([\\s\\S]*?)</template>`))[1];
  const notes=[...source.matchAll(/<div data-checkpoint="([^"]+)">([\s\S]*?)<\/div>/g)];
  assert.deepEqual(notes.map(n=>n[1]),['ready',...Array.from(compile(scene(id)).stops,s=>s.id),'finished'],id);
  assert.match(notes.find(n=>n[1]==='question')[2],/\?/,id);
 }
});

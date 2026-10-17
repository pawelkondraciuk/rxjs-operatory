const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {modules}=require('./v2-harness.cjs');
// 11a-distinct-switchmap: selectedUserId$ → distinctUntilChanged → switchMap → S1, wejścia A, A, B, B, A.
// Powtórzenia gasną w wierszu distinctUntilChanged (pamięć prev), do switchMap trafia A, B, A — trzy HTTP.
async function deck(format='4:3'){
 const m=await modules(['catalog','scene-config','engine','renderer']);
 const scene=m['scene-config'].configureScene({...m.catalog.scenes.find(s=>s.id==='11a-distinct-switchmap'),format});
 return {scene,c:m.engine.compileScene(scene),render:m.renderer.renderScene};
}
const rows=f=>f.innerWorkPanels[0].rows;
const memory=f=>f.nodes.find(n=>n.id==='distinct').laneStates[0].memory;
const stop=(c,id)=>c.snapshot(c.stops.find(s=>s.id===id).time);
const states=f=>Array.from(rows(f),r=>r.id+' · '+r.value+' '+r.state);

test('one pipeline with S1 lanes, a prev slot inside the distinctUntilChanged lane and an instance panel below',async()=>{
 for(const format of ['4:3','16:9']){
  const {scene,c,render}=await deck(format),f=c.snapshot(0);
  assert.equal(scene.title,'distinctUntilChanged — czy coś się zmieniło?');
  assert.equal(scene.code,'selectedUserId$.pipe(distinctUntilChanged(),\n  switchMap(id => http.get(url(id))))');
  const top=f.nodes.filter(n=>['source','distinct','op','observer'].includes(n.id));
  assert.deepEqual(Array.from(top,n=>n.label),['selectedUserId$','distinctUntilChanged','switchMap','']);
  for(const [a,b] of [[0,1],[1,2],[2,3]])assert.ok(top[a].x+top[a].w/2<top[b].x-top[b].w/2,format+' kafelki bez nakładania');
  assert.ok(top.at(-1).x+top.at(-1).w/2<=f.width-20);
  const ys=f.edges.filter(e=>e.subscriber&&e.visible).flatMap(e=>e.points.map(p=>p[1]));
  assert.equal(ys.length>0&&new Set(ys).size,1,'S1 już zestawione, porty na wspólnej osi');
  assert.ok(f.nodes.filter(n=>n.laneStates?.length).every(n=>n.laneStates[0].state==='running'));
  assert.equal(memory(f).value,undefined);
  const svg=render(f),slot=svg.match(/<g data-lane-memory="">[\s\S]*?<\/g>/)[0];
  assert.match(slot,/prev: <tspan[^>]*>—<\/tspan>/);
  const lane=f.nodes.find(n=>n.id==='distinct'),x=Number(slot.match(/<rect x="([\d.]+)"/)[1]);
  assert.ok(x>lane.x-lane.w/2&&x<lane.x+lane.w/2,'slot wewnątrz wiersza operatora');
  const panel=f.innerWorkPanels[0];
  assert.equal(panel.instances,true);assert.deepEqual(Array.from(panel.columns,col=>col.label),['HTTP GET']);
  assert.equal(rows(f).length,0);assert.equal(f.executionCounts.started,0);
 }
});

test('A, A, B, B, A: only A, B, A reach switchMap; three HTTP, duplicates create no work and cancel nothing',async()=>{
 const {c}=await deck();
 assert.deepEqual(Array.from(c.plan.records.get('source-distinct').events,e=>e.value),['A','A','B','B','A']);
 assert.deepEqual(Array.from(c.plan.records.get('distinct-op').events,e=>e.value),['A','B','A']);
 assert.equal(c.events.filter(e=>e.type==='inner-create').length,3);
 const ends=[0,1,2].map(i=>c.plan.records.get(`inner${i}-op`).end.kind);
 assert.deepEqual(ends,['unsubscribe','unsubscribe','complete']);
 // Anulowania tylko w chwilach przepuszczonych B i A, nigdy przy powtórzeniu.
 const passedAt=Array.from(c.plan.records.get('distinct-op').events,e=>e.logicalAt);
 for(const i of [0,1])assert.ok(passedAt.includes(c.plan.records.get(`inner${i}-op`).end.logicalAt));
 const end=c.snapshot(c.duration);
 assert.deepEqual(states(end),['#1 · A cancelled','#2 · B cancelled','#3 · A completed']);
 assert.equal(end.executionCounts.started,3);
 assert.deepEqual(Array.from(end.histories[0].values,v=>v.value),['A']);
 for(const edge of ['source-distinct','distinct-op','op-observer'])assert.equal(c.plan.records.get(edge).end,null,edge);
 assert.ok(end.nodes.filter(n=>n.laneStates?.length).every(n=>n.laneStates[0].state==='running'),'S1 nadal aktywny');
 assert.equal(rows(end)[0].color,rows(end)[2].color,'A ma swój kolor w obu wykonaniach');
});

test('checkpoints: prev changes only on passed values, the duplicate waits at the question and fades without touching HTTP A',async()=>{
 const {c,render}=await deck();
 assert.deepEqual(Array.from(c.stops,s=>s.id),['first','question','answer','switched','repeat-b','again-a']);
 const first=stop(c,'first');
 assert.equal(memory(first).value,'A');assert.deepEqual(states(first),['#1 · A active']);
 assert.ok(Math.abs(rows(first)[0].stages[0].progress-.5)<.1,'HTTP A około połowy');
 assert.equal(first.tokens.length,0,'drugie A jeszcze nie wyszło');
 const question=stop(c,'question'),ball=question.tokens.find(t=>t.phase==='reject');
 const lane=question.nodes.find(n=>n.id==='distinct');
 assert.equal(ball.value,'A');assert.ok(ball.x>lane.x-lane.w/2&&ball.x<lane.x+lane.w/2);assert.equal(ball.opacity,undefined);
 assert.equal(memory(question).value,'A');assert.deepEqual(states(question),['#1 · A active']);
 // Pytanie: czas modelu stoi, więc pasek HTTP A też.
 const q=c.stops.find(s=>s.id==='question').time;
 assert.equal(rows(c.snapshot(q-.3))[0].stages[0].progress,rows(question)[0].stages[0].progress);
 const answer=stop(c,'answer');
 assert.equal(answer.tokens.some(t=>t.phase==='reject'),false,'kulka zgasła w operatorze');
 assert.equal(memory(answer).value,'A');assert.ok(memory(answer).comparedAt);
 assert.deepEqual(states(answer),['#1 · A active']);assert.equal(answer.executionCounts.started,1);
 assert.doesNotMatch(render(answer),/data-inner-cancel|anulowane|complete/);
 const switched=stop(c,'switched');
 assert.equal(memory(switched).value,'B');assert.deepEqual(states(switched),['#1 · A cancelled','#2 · B active']);
 const repeat=stop(c,'repeat-b');
 assert.equal(memory(repeat).value,'B');assert.deepEqual(states(repeat),['#1 · A cancelled','#2 · B active']);
 assert.equal(repeat.executionCounts.started,2);
 const again=stop(c,'again-a');
 assert.equal(memory(again).value,'A','A po B przechodzi');
 assert.deepEqual(states(again),['#1 · A cancelled','#2 · B cancelled','#3 · A active']);
});

test('speaker notes follow the checkpoints; rewind and reset are deterministic in both formats',async()=>{
 const html=fs.readFileSync('index.html','utf8');
 const template=html.match(/<template data-checkpoint-notes="11a-distinct-switchmap">([\s\S]*?)<\/template>/)[1];
 assert.deepEqual([...template.matchAll(/data-checkpoint="([^"]+)"/g)].map(m=>m[1]),['ready','first','question','answer','switched','repeat-b','again-a','finished']);
 assert.match(template,/nie jest cache'em/);
 for(const format of ['4:3','16:9']){
  const {c,render}=await deck(format);
  for(const time of [0,...c.stops.map(s=>s.time),c.duration]){
   const frame=JSON.stringify(c.snapshot(time));c.snapshot(c.duration);c.snapshot(0);
   assert.equal(JSON.stringify(c.snapshot(time)),frame);
   assert.doesNotMatch(render(c.snapshot(time)),/NaN|Infinity|="undefined"/);
  }
 }
});

// 14-distinct: ten sam model w profilu id$ → distinctUntilChanged → switchMap → S1, emisje 42, 42, 43, 43, 42.
// subscribe w animacji (lane S1 z pustą pamięcią powstaje na pierwszym postoju; pamięć to sama kulka, bez prev:), każde HTTP kończy się przed kolejnym nowym ID,
// więc powtórzenia jedynie gasną w operatorze: bez inner, HTTP i anulowania. 5 emisji, 3 requesty, 3 wyniki.
async function deck14(format='4:3'){
 const m=await modules(['catalog','scene-config','engine','renderer']);
 const scene=m['scene-config'].configureScene({...m.catalog.scenes.find(s=>s.id==='14-distinct'),format});
 return {scene,c:m.engine.compileScene(scene),render:m.renderer.renderScene};
}
const lanes=f=>f.nodes.filter(n=>n.laneStates?.length);

test('14-distinct: switchMap layout, subscribe creates the S1 lane with an empty memory (no prev box)',async()=>{
 for(const format of ['4:3','16:9']){
  const {scene,c,render}=await deck14(format),ready=c.snapshot(0);
  assert.equal(scene.title,'To samo ID — kolejny request?');
  assert.equal(scene.code,'id$.pipe(distinctUntilChanged(),\n  switchMap(id => http.get(`/api/users/${id}`)))');
  const top=ready.nodes.filter(n=>['source','distinct','op','observer'].includes(n.id));
  assert.deepEqual(Array.from(top,n=>n.label),['id$','distinctUntilChanged','switchMap','']);
  for(const [a,b] of [[0,1],[1,2],[2,3]])assert.ok(top[a].x+top[a].w/2<top[b].x-top[b].w/2,format+' kafelki bez nakładania');
  assert.equal(lanes(ready).length,0,'przed subscribe nie ma lane S1');
  assert.equal(ready.innerWorkPanels[0].instances,true);assert.equal(rows(ready).length,0);
  const sub=stop(c,'subscribe');
  assert.ok(lanes(sub).length>=4&&lanes(sub).every(n=>n.laneStates[0].state==='running'));
  const ys=sub.edges.filter(e=>e.subscriber&&e.visible).flatMap(e=>e.points.map(p=>p[1]));
  assert.equal(ys.length>0&&new Set(ys).size,1,'porty na wspólnej osi');
  assert.equal(memory(sub).value,undefined);
  assert.equal(memory(sub).ball,true);
  assert.doesNotMatch(render(sub),/data-lane-memory|prev:/,'pusta pamięć bez slotu i etykiety');
  assert.equal(sub.executionCounts.started,0);
 }
});

test('14-distinct: 42, 42, 43, 43, 42 → three HTTP that all complete; duplicates never reach switchMap',async()=>{
 const {c}=await deck14();
 assert.deepEqual(Array.from(c.plan.records.get('source-distinct').events,e=>e.value),['42','42','43','43','42']);
 assert.deepEqual(Array.from(c.plan.records.get('distinct-op').events,e=>e.value),['42','43','42']);
 assert.deepEqual(Array.from(c.plan.records.get('op-observer').events,e=>e.value),['42','43','42']);
 assert.equal(c.events.filter(e=>e.type==='inner-create').length,3);
 assert.equal(c.events.filter(e=>e.type==='inner-unsubscribe').length,0,'nic nie jest anulowane');
 assert.deepEqual([0,1,2].map(i=>c.plan.records.get(`inner${i}-op`).end.kind),['complete','complete','complete']);
 // Odrzucenie nie jest error, complete ani unsubscribe w górnym potoku.
 for(const edge of ['source-distinct','distinct-op','op-observer'])assert.equal(c.plan.records.get(edge).end,null,edge);
 const end=c.snapshot(c.duration);
 assert.deepEqual(states(end),['#1 · 42 completed','#2 · 43 completed','#3 · 42 completed']);
 assert.equal(end.executionCounts.started,3);assert.equal(end.metrics[0].value,5);
 assert.match(end.caption,/5 emisji ID, 3 requesty HTTP/);
 assert.ok(lanes(end).every(n=>n.laneStates[0].state==='running'),'S1 nadal aktywny');
});

test('14-distinct: each duplicate stops inside distinctUntilChanged during a running HTTP and fades without cancelling it',async()=>{
 const {c,render}=await deck14();
 assert.deepEqual(Array.from(c.stops,s=>s.id),['subscribe','first','duplicate','second','duplicate-2','again']);
 const first=stop(c,'first');
 assert.equal(memory(first).value,'42');assert.deepEqual(states(first),['#1 · 42 active']);
 // Pamięć: jedna zwykła kulka 42 tuż przed portem wyjścia wiersza distinctUntilChanged, bez prostokąta i napisu prev.
 const op=first.nodes.find(n=>n.id==='distinct'),kept=[...render(first).matchAll(/<g data-lane-memory="([^"]*)" data-token="memory"><circle cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)"/g)];
 assert.equal(kept.length,1);assert.equal(kept[0][1],'42');
 assert.equal(+kept[0][4],first.ball.r);assert.ok(+kept[0][2]+ +kept[0][4]<op.x+op.w/2&&+kept[0][2]>op.x,'po prawej stronie lane, przed portem');
 assert.equal(+kept[0][3],op.laneStates[0].y);
 assert.doesNotMatch(render(first),/prev:/);
 for(const [i,[id,running,value]] of [['duplicate','#1',`42`],['duplicate-2','#2','43']].entries()){
  const reject=c.events.filter(e=>e.type==='distinct-reject')[i],frame=c.snapshot(reject.at-.3);
  const ball=frame.tokens.find(t=>t.phase==='reject'),lane=frame.nodes.find(n=>n.id==='distinct');
  assert.equal(ball.value,value);assert.ok(ball.x>lane.x-lane.w/2&&ball.x<lane.x+lane.w/2,'kulka stoi w wierszu distinctUntilChanged');
  const row=rows(frame).find(r=>r.id===running);assert.equal(row.state,'active');
  const after=stop(c,id),same=rows(after).find(r=>r.id===running);
  assert.equal(after.tokens.some(t=>t.phase==='reject'),false,'kulka zgasła w operatorze');
  assert.equal(same.state,'active');assert.ok(same.stages[0].progress>row.stages[0].progress-1e-9&&same.stages[0].progress<1);
  assert.equal(memory(after).value,value);assert.equal(rows(after).length,i+1,'bez nowego wiersza');
  assert.equal([...render(after).matchAll(/data-lane-memory="/g)].length,1,'jedna kulka pamięci');
  assert.doesNotMatch(render(after),/data-inner-cancel|anulowane/);
 }
 const second=stop(c,'second');
 assert.equal(memory(second).value,'43');assert.deepEqual(states(second),['#1 · 42 completed','#2 · 43 active']);
 const again=stop(c,'again');
 assert.equal(memory(again).value,'42','42 po 43 przechodzi');
 assert.deepEqual(states(again),['#1 · 42 completed','#2 · 43 completed','#3 · 42 active']);
});

test('14-distinct: speaker notes per checkpoint; rewind and reset are deterministic in both formats',async()=>{
 const html=fs.readFileSync('index.html','utf8');
 const template=html.match(/<template data-checkpoint-notes="14-distinct">([\s\S]*?)<\/template>/)[1];
 assert.deepEqual([...template.matchAll(/data-checkpoint="([^"]+)"/g)].map(m=>m[1]),
  ['ready','subscribe','first','duplicate','second','duplicate-2','again','finished']);
 assert.match(template,/Pięć emisji, trzy requesty/);
 for(const format of ['4:3','16:9']){
  const {c,render}=await deck14(format);
  for(const time of [0,...c.stops.map(s=>s.time),c.duration]){
   const frame=JSON.stringify(c.snapshot(time));c.snapshot(c.duration);c.snapshot(0);
   assert.equal(JSON.stringify(c.snapshot(time)),frame);
   assert.doesNotMatch(render(c.snapshot(time)),/NaN|Infinity|="undefined"/);
  }
 }
});

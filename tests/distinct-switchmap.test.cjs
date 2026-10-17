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

const {test}=require('node:test'),assert=require('node:assert/strict');
const {modules}=require('./v2-harness.cjs');
async function family(){
 const m=await modules(['reference-scenes','engine','renderer']);
 const definitions=[['08-map-strumienie','concatAll'],['10-mergemap','mergeMap'],['11-switchmap','switchMap'],['12-exhaustmap','exhaustMap']];
 const scene=(id,format='4:3')=>{const s={id,format};m['reference-scenes'].configureFlatten(s,definitions.find(d=>d[0]===id)[1]);return s;};
 return {definitions,scene,compile:m.engine.compileScene,render:m.renderer.renderScene};
}
const find=(c,selector)=>c.events.find(e=>Object.entries(selector).every(([k,v])=>e[k]===v));
const rows=(c,t)=>c.snapshot(t).innerWorkPanels[0].rows;

test('the four HTTP slides share S1, frameless rows, palette and one response per completed request',async()=>{
 const {definitions,scene,compile,render}=await family();
 const expected={concatAll:['A','B','C'],mergeMap:['A','B','D','C'],switchMap:['D'],exhaustMap:['A','D']};
 for(const format of ['4:3','16:9'])for(const [id,mode]of definitions){
  const s=scene(id,format),c=compile(s),f=c.snapshot(c.duration),panel=f.panels[0],receiver=f.nodes.find(n=>n.id==='observer');
  assert.equal(s.http,true);assert.equal(panel.frameless,true);assert.equal(panel.rowStep,panel.rowHeight);
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

test('mergeMap keeps three active HTTP rows and a later D completes before C',async()=>{
 const {scene,compile}=await family(),c=compile(scene('10-mergemap'));
 const third=find(c,{type:'inner-subscribe',node:'inner2'}).at+.1;
 assert.equal(rows(c,third).filter(r=>r.state==='active').length,3);
 assert.equal(new Set(rows(c,third).map(r=>r.color)).size,3);
 const end=value=>find(c,{type:'stream-complete',execution:value}).at;
 assert.ok(end('D')<end('C'));
 const got=find(c,{type:'deliver-next',edge:'op-observer',value:'D'});
 assert.match(c.snapshot(got.at).caption,/D dotarło przed C/);
});

test('switchMap preserves incomplete cancelled work without emitting results or complete pulses',async()=>{
 const {scene,compile,render}=await family(),c=compile(scene('11-switchmap'));
 const t=find(c,{type:'inner-subscribe',node:'inner2'}).at+.1,r=rows(c,t);
 assert.deepEqual(Array.from(r,row=>row.state),['cancelled','cancelled','active']);
 for(const cancelled of r.slice(0,2)){
  assert.ok(cancelled.stages[0].progress>0&&cancelled.stages[0].progress<1);
  assert.equal(cancelled.wires[0].pulse,null);assert.equal(cancelled.wires[0].color,'#808890');assert.equal(cancelled.tokens.length,0);
 }
 const f=c.snapshot(c.duration);assert.equal(f.executionCounts.cancelled,3);assert.equal(f.executionCounts.completed,1);
 assert.match(render(f),/anulowane/);
});

test('exhaustMap preserves IDs and ignored B/C rows without creating inner or queue entries',async()=>{
 const {scene,compile,render}=await family(),c=compile(scene('12-exhaustmap'));
 for(const value of ['B','C']){
  const t=find(c,{type:'deliver-next',edge:'source-op',value}).at+.35,ignored=rows(c,t).find(r=>r.value===value);
  assert.equal(ignored.state,'ignored');assert.equal(ignored.stages,undefined);assert.equal(ignored.wires,undefined);
  assert.match(render(c.snapshot(t)),/pominięte/);
 }
 assert.ok(!c.events.some(e=>e.type==='inner-create'&&['inner1','inner2'].includes(e.node)));
 assert.deepEqual(Array.from(rows(c,c.duration),r=>r.state),['completed','ignored','ignored','completed']);
  assert.deepEqual(Array.from(rows(c,c.duration),r=>r.id),['#1','#2','#3','#4']);
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

const {test}=require('node:test'),assert=require('node:assert/strict');
const {modules}=require('./v2-harness.cjs');
async function harness(){
 const m=await modules(['reference-scenes','engine','renderer']);
 const scene={id:'09-concatmap',format:'4:3'};m['reference-scenes'].configureFlatten(scene,'concatMap');
 return {c:m.engine.compileScene(scene),render:m.renderer.renderScene,scene,compile:m.engine.compileScene};
}
const rows=(c,t)=>c.snapshot(t).innerWorkPanels[0].rows;
const event=(c,s)=>c.events.find(e=>Object.entries(s).every(([k,v])=>e[k]===v));

test('concatMap queues values without inner, ports or subscription; activation retains the same slot',async()=>{
 const {c,render}=await harness();
 const first=event(c,{type:'inner-subscribe',node:'inner0'}).at+.1;
 assert.deepEqual(Array.from(rows(c,first),r=>r.state),['active']);
 const t=event(c,{type:'deliver-next',edge:'source-op',value:'C'}).at+.35,waiting=rows(c,t);
 assert.deepEqual(Array.from(waiting,r=>r.state),['active','queued','queued']);
 for(const r of waiting.slice(1)){
  assert.equal(r.stages,undefined);assert.equal(r.wires,undefined);
  const group=render(c.snapshot(t)).split(`data-inner-work="${r.id}"`)[1].split('data-inner-work=')[0];
  assert.match(group,/W KOLEJCE/);assert.doesNotMatch(group,/data-inner-port|data-inner-progress|data-inner-wire/);
 }
 assert.ok(event(c,{type:'inner-create',node:'inner1'}).at>t);
 const r=c.plan.records.get('inner1-op'),starting=rows(c,r.start+.1);
 assert.equal(starting[0].state,'completed');assert.equal(starting[1].state,'subscribing');
 assert.equal(starting[1].y,waiting[1].y);assert.equal(starting[2].state,'queued');
 assert.equal(rows(c,r.start+r.connectDuration+.05)[1].state,'active');
});

test('the main pipeline keeps source empty and puts four responses inside the receiver lane',async()=>{
 const {c,render}=await harness(),t=event(c,{type:'inner-subscribe',node:'inner0'}).at+.1,f=c.snapshot(t);
 const top=f.nodes.filter(n=>['source','op','observer'].includes(n.id));
 const ys=top.map(n=>n.laneStates.find(l=>l.subscriber==='S1').y);
 assert.equal(new Set(ys).size,1);
 const wires=f.edges.filter(e=>e.visible);
 assert.equal(wires.length,2);assert.ok(wires.every(e=>e.subscriber==='S1'&&e.color==='#7457D9'));
 for(const wire of wires)assert.ok(wire.points.every(p=>p[1]===ys[0]));
 assert.equal(f.histories.length,1);assert.equal(f.histories[0].anchor,'observer');
 assert.ok(f.histories.every(h=>h.y===ys[0]&&h.balls));
 const svg=render(f);
 assert.match(svg,/data-panel-divider="true"/);assert.match(svg,/PRACE WEWNĘTRZNE/);
 assert.doesNotMatch(svg,/<rect[^>]*x="28"[^>]*rx="12"/);
 assert.doesNotMatch(svg,/stroke="#111"/);
 assert.ok(top.filter(n=>n.id!=='observer').every(n=>n.defH>0&&n.growRows));
 const done=c.snapshot(c.duration);
 assert.equal(done.nodes.find(n=>n.id==='source').fill,'#8FC9D4');
 assert.equal(done.nodes.find(n=>n.id==='op').fill,'#D8B3E6');
 assert.equal(done.nodes.find(n=>n.id==='op').laneStates[0].state,'completed');
});

test('inner result reaches the right border before main next, with consistent work colours and deterministic rewind',async()=>{
 const {c,render}=await harness(),panel=c.snapshot(0).panels[0];
 assert.equal(panel.rowStep,panel.rowHeight);assert.ok(panel.w/c.snapshot(0).width>.9);
 for(const r of [...c.plan.records.values()].filter(r=>/^inner\d+-op$/.test(r.id)))for(const v of r.events){
  const output=c.plan.records.get('op-observer').events.find(e=>e.execution===v.execution&&e.logicalAt===v.logicalAt&&e.value===v.value);
  assert.ok(output.at>=v.arrival);
  const work=rows(c,(v.at+v.arrival)/2).find(r=>r.tokens?.some(t=>t.value===v.value));
  assert.ok(work);assert.equal(output.color,work.color);
 }
 for(const t of [0,...c.events.map(e=>e.at+.01),c.duration]){
  const expected=JSON.stringify(c.snapshot(t));c.snapshot(c.duration);c.snapshot(0);
  assert.equal(JSON.stringify(c.snapshot(t)),expected);assert.doesNotMatch(render(c.snapshot(t)),/NaN|Infinity|="undefined"/);
 }
});

test('complete outer does not finish the concatMap lane until all inner work completes',async()=>{
 const {c}=await harness(),source=event(c,{type:'stream-complete',edge:'source-op'});
 const f=c.snapshot(source.at+.81);
 assert.equal(f.nodes.find(n=>n.id==='source').laneStates[0].state,'completed');
 assert.equal(f.nodes.find(n=>n.id==='op').laneStates[0].state,'running');
 assert.equal(f.nodes.find(n=>n.id==='observer').laneStates[0].state,'running');
 assert.ok(f.executionCounts.active>0);
 assert.deepEqual(Array.from(c.snapshot(c.duration).histories.find(h=>h.anchor==='observer').values,v=>v.value),['A','B','C','D']);
});

test('reduced motion keeps completed work history without terminal pulses',async()=>{
 const {c,render}=await harness(),t=event(c,{type:'stream-complete',edge:'inner0-op'}).at+.2;
 assert.match(render(c.snapshot(t)),/data-inner-pulse/);
 const reduced=render(c.snapshot(t),{reducedMotion:true});
 assert.doesNotMatch(reduced,/data-inner-pulse/);assert.match(reduced,/data-inner-state="completed"/);
});


test('each HTTP emits exactly one response before complete; all four fixed-size balls fit in the receiver',async()=>{
 const {c,scene,render}=await harness();
 assert.equal(scene.http,true);assert.match(scene.code,/concatMap\(id => http.get/);
 for(const record of [...c.plan.records.values()].filter(r=>/^inner\d+-op$/.test(r.id))){
  assert.equal(record.events.length,1);assert.equal(record.events[0].logicalAt,record.end.logicalAt);
  assert.ok(record.events[0].arrival<record.end.at);
 }
 const f=c.snapshot(c.duration),h=f.histories[0],n=f.nodes.find(n=>n.id==='observer');
 assert.equal(h.max,4);assert.equal(h.values.length,4);
 const size=h.ball||f.ball;assert.equal(size.r,29.5);assert.equal(size.font,34.2);
 assert.ok(h.x-size.r>n.x-n.w/2);
 assert.ok(h.x+3*(2*size.r+h.gap)+size.r<n.x+n.w/2);
 assert.ok(size.r*2+3<=n.h);
 assert.deepEqual(Array.from(f.innerWorkPanels[0].rows,r=>r.color),['#6D4CD3','#B85D05','#087FAD','#B73770']);
 const svg=render(f);assert.equal((svg.match(/data-token="received"/g)||[]).length,4);
 assert.match(svg,/HTTP GET/);
 assert.equal((svg.match(/data-token="received"[^]*?<text[^>]*style="font-weight:700;fill:#fff"/g)||[]).length,4);
});

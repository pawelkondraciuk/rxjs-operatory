const {test}=require('node:test'),assert=require('node:assert/strict');
const {modules,next,terminal,values,scenario}=require('./v2-harness.cjs');
const model=async()=> (await modules(['engine'])).engine.compileScene;
test('execution counters follow actual subscription, while queued input has no inner',async()=>{
 const compile=await model(),c=compile(scenario({concat:true}));
 assert.equal(c.snapshot(0).executions.length,0);
 const b=c.events.find(e=>e.type==='deliver-next'&&e.edge==='source-op'&&e.value==='B'),f=c.snapshot(b.at);
 assert.deepEqual(Array.from(f.executions,e=>e.id),['A']);assert.equal(f.executionCounts.started,1);assert.equal(f.executionCounts.active,1);
 assert.equal(f.metrics[0].value,1);assert.equal(f.nodes.find(n=>n.id==='queue-B').visible,true);
 const sub=c.events.find(e=>e.type==='inner-subscribe'&&e.execution==='B');
 assert.equal(c.snapshot(sub.at-.0001).executionCounts.started,1);assert.equal(c.snapshot(sub.at).executionCounts.started,2);
 assert.equal(c.snapshot(sub.at).executionCounts.completed,1);
});
test('replacement inner starts after cancellation of its predecessor',async()=>{
 const compile=await model(),c=compile(scenario());
 const arrival=c.events.find(e=>e.type==='deliver-next'&&e.edge==='source-op'&&e.value==='B');
 assert.equal(c.snapshot(arrival.at).executionCounts.started,1);assert.equal(c.snapshot(arrival.at).executions[0].state,'running');
 const cancel=c.events.find(e=>e.type==='inner-unsubscribe'&&e.execution==='A'),sub=c.events.find(e=>e.type==='inner-subscribe'&&e.execution==='B');
 assert.ok(sub.at>cancel.at);assert.equal(c.snapshot(sub.at).executionCounts.active,1);assert.equal(c.snapshot(sub.at).executionCounts.cancelled,1);
 assert.ok(c.snapshot(sub.at).executions[0].progress<1);
});
test('HTTP error, catch, fallback delivery and completed inner remain separate states',async()=>{
 const compile=await model(),c=compile(scenario()),error=c.events.find(e=>e.type==='http-error');
 let b=c.snapshot(error.at).executions.find(e=>e.id==='B');
 assert.equal(b.state,'running');assert.equal(b.httpState,'error');assert.equal(b.handledError,false);
 const caught=c.events.find(e=>e.type==='catch-handle');b=c.snapshot(caught.at).executions.find(e=>e.id==='B');
 assert.equal(b.state,'running');assert.equal(b.handledError,true);assert.equal(b.focused,true);
 const delivered=c.events.find(e=>e.type==='deliver-next'&&e.edge==='op-receiver'&&e.value==='fallback B');
 assert.deepEqual(values(c.snapshot(delivered.at-.001)),[]);assert.deepEqual(values(c.snapshot(delivered.at)),['fallback B']);
 const end=c.events.find(e=>e.type==='stream-complete'&&e.execution==='B');assert.ok(end.at>=delivered.at);
 b=c.snapshot(end.at).executions.find(e=>e.id==='B');assert.equal(b.state,'completed');assert.equal(b.httpState,'error');assert.equal(b.handledError,true);
 assert.deepEqual(values(c.snapshot(c.duration)),['fallback B','C']);assert.equal(c.snapshot(c.duration).executionCounts.error,0);
});
test('cancellation suppresses every late error and fallback and freezes progress without mutating data',async()=>{
 const compile=await model(),s=scenario({cancelB:true}),before=JSON.stringify(s),c=compile(s);assert.equal(JSON.stringify(s),before);
 s.graph.timeline.push({type:'fallback-next',execution:'B',event:{type:'deliver-next',execution:'B'}});assert.doesNotThrow(()=>compile(s));
 assert.ok(!c.events.some(e=>e.execution==='B'&&['http-error','catch-handle','fallback-next','deliver-next','inner-next'].includes(e.type)));
 const end=c.events.find(e=>e.type==='inner-unsubscribe'&&e.execution==='B'),a=c.snapshot(end.at).executions.find(e=>e.id==='B'),b=c.snapshot(c.duration).executions.find(e=>e.id==='B');
 assert.equal(b.state,'cancelled');assert.equal(b.httpState,'cancelled');assert.equal(b.handledError,false);assert.equal(b.values.length,0);
 assert.equal(b.progress,a.progress);assert.ok(b.progress>0&&b.progress<1);assert.deepEqual(values(c.snapshot(c.duration)),['C']);
});
test('unhandled errors terminate receiver; EMPTY recovery completes inner without a value',async()=>{
 const compile=await model(),error=compile(scenario({noCatch:true})),f=error.snapshot(error.duration);
 assert.equal(f.executions.find(e=>e.id==='B').state,'error');assert.equal(f.nodes.find(n=>n.id==='receiver').notification,'error');assert.equal(f.executionCounts.started,2);
 const c=compile(scenario({empty:true})),final=c.snapshot(c.duration),b=final.executions.find(e=>e.id==='B');
 assert.equal(b.state,'completed');assert.equal(b.httpState,'error');assert.equal(b.handledError,true);assert.equal(b.values.length,0);assert.deepEqual(values(final),['C']);
});
test('execution snapshots survive direct seek, backward seek and reset',async()=>{
 const compile=await model(),c=compile(scenario());
 for(const t of [0,...c.events.map(e=>e.at),c.duration]){const expected=JSON.stringify(c.snapshot(t));c.snapshot(c.duration);c.snapshot(0);assert.equal(JSON.stringify(c.snapshot(t)),expected);}
});
test('timing changes illustration while retaining duplicate values and model chronology',async()=>{
 const compile=await model(),s={id:'timing',title:'Tempo',duration:3,rows:[],timing:{},graph:{layout:'fixed',
 nodes:['s','op','sink'].map((id,i)=>({id,x:150+i*450,y:100,ready:true})),
 edges:[{id:'s-op',from:'s',to:'op',logicalStart:0,logicalEnd:terminal(2),events:[next(1,'A'),next(1,'A')]},{id:'op-sink',from:'op',to:'sink',logicalStart:0,logicalEnd:terminal(2),events:[next(1,'A'),next(1,'A')]}],
 trays:[{anchor:'sink',x:1050,y:140,w:240}]}};
 const fast=compile(s),rs=[...fast.plan.records.values()],first=rs.find(r=>r.id==='op-sink'),last=rs.find(r=>r.id==='s-op');
 assert.ok(Math.abs(last.start+last.connectDuration-first.start-.7)<1e-9);
 for(const r of rs){assert.equal(r.end.duration,.35);for(const e of r.events)assert.ok(Math.abs(e.arrival-e.at-.4)<1e-9);assert.ok(r.events[1].at-r.events[0].arrival>=.5-1e-9);}
 assert.deepEqual(values(fast.snapshot(fast.duration)),['A','A']);
 const slow=compile({...s,timing:{travel:.9,subscribe:1.2,terminal:.7}});
 assert.deepEqual(Array.from(fast.events.filter(e=>e.type==='deliver-next'),e=>[e.edge,e.value,e.logicalAt]),Array.from(slow.events.filter(e=>e.type==='deliver-next'),e=>[e.edge,e.value,e.logicalAt]));assert.ok(slow.duration>fast.duration);
});
test('timeline selectors bind to delivery and reject missing uncancelled events',async()=>{
 const compile=await model(),s=scenario();s.graph.timeline.push({type:'execution-focus',execution:'C',event:{type:'inner-subscribe',execution:'C'}});
 const c=compile(s),sub=c.events.find(e=>e.type==='inner-subscribe'&&e.execution==='C');assert.equal(c.snapshot(sub.at).focusedExecutionId,'C');
 s.graph.timeline.push({type:'execution-focus',execution:'C',event:{type:'missing-event'}});assert.throws(()=>compile(s),/nierozwiązane zdarzenie/);
});
test('transformation pause belongs to illustration, with identical logical times',async()=>{
 const compile=await model(),s={id:'transform',title:'Transformacja',duration:3,rows:[],timing:{},graph:{layout:'fixed',
 nodes:['s','op','sink'].map((id,i)=>({id,x:150+i*450,y:100,ready:true})),edges:[{id:'s-op',from:'s',to:'op',logicalStart:0,events:[next(1,1)]},{id:'op-sink',from:'op',to:'sink',logicalStart:0,events:[next(1,10)]}],trays:[]}};
 const c=compile(s),input=c.plan.records.get('s-op').events[0],output=c.plan.records.get('op-sink').events[0];
 assert.ok(Math.abs(output.at-input.arrival-.3)<1e-9);assert.equal(output.logicalAt,input.logicalAt);
});

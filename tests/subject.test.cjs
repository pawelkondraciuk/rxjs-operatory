const {test}=require('node:test');
const assert=require('node:assert/strict');
const {modules,playbackHarness}=require('./v2-harness.cjs');
const values=(frame,id)=>Array.from(frame.histories.find(h=>h.anchor===id).values,v=>v.value);
const node=(frame,id)=>frame.nodes.find(n=>n.id===id);
const stopIds=['subscribed-a','subscribed-b','connect-http','request','received','multicast','complete'];
async function subject(format='4:3'){
 const m=await modules(['catalog','scene-config','engine','renderer']);
 const scene=m['scene-config'].configureScene({...m.catalog.scenes.find(s=>s.id==='05-zrodla'),
  id:'05-zrodla-3',rendererId:'05-zrodla',sourceExample:2,format});
 const c=m.engine.compileScene(scene);
 return {scene,m,c,at:id=>c.stops.find(s=>s.id===id).time};
}

test('Subject: two downstream subscriptions do not start the separate HTTP subscription',async()=>{
 const {scene,c,at}=await subject(),ready=c.snapshot(0);
 assert.equal(scene.code,'const subject$ = new Subject<number>();\nsubject$.subscribe(v => renderA(v));\nsubject$.subscribe(v => renderB(v));\nhttp.get<number>(url).subscribe(subject$);');
 assert.deepEqual(Array.from(c.stops,s=>s.id),stopIds);
 assert.ok(node(ready,'http').visible&&node(ready,'subject').visible);
 assert.ok(!node(ready,'A').visible&&!node(ready,'B').visible);
 assert.ok(ready.nodes.every(n=>n.laneStates.length===0));
 assert.ok(ready.edges.every(e=>!e.visible));
 assert.equal(ready.panels.length,0);assert.equal(ready.histories.length,2);
 for(const [id,count] of [['subscribed-a',1],['subscribed-b',2],['connect-http',2]]){
  const f=c.snapshot(at(id));
  assert.equal(node(f,'subject').laneRows.length,count);
  assert.equal(node(f,'http').laneRows.length,0);
  assert.equal(f.executionCounts.started,0);
  assert.equal(f.edges.find(e=>e.id==='http-subject').visible,false);
  assert.ok(f.histories.every(h=>h.values.length===0));
 }
 const before=c.snapshot(at('connect-http'));
 assert.ok(before.codeView.flat().find(p=>p.mark?.id==='subject-observer').active);
 const connected=c.events.find(e=>e.type==='connected'&&e.edge==='http-subject').at;
 assert.equal(c.snapshot(connected-1e-6).executionCounts.started,0);
 const running=c.snapshot(at('request'));
 assert.equal(running.executionCounts.started,1);assert.equal(running.executionCounts.active,1);
 assert.equal(node(running,'http').laneStates.length,1);
 assert.ok(node(running,'http').laneStates[0].progress>0);
 assert.ok(node(running,'subject').laneStates.every(l=>l.role==='operator'));
 assert.equal(c.events.filter(e=>e.type==='subscribe'&&e.edge==='http-subject').length,1);
});

test('one HTTP value splits inside Subject into identical simultaneous notifications',async()=>{
 const {c,at,m}=await subject();
 assert.equal(c.events.filter(e=>e.type==='source-next'&&e.node==='http').length,1);
 const input=c.plan.records.get('http-subject').events[0];
 const a=c.plan.records.get('subject-A').events[0],b=c.plan.records.get('subject-B').events[0];
 assert.equal(a.at,b.at);assert.equal(a.arrival,b.arrival);
 const received=c.snapshot(at('received'));
 assert.equal(received.tokens.length,1);assert.equal(received.tokens[0].phase,'split-in');
 assert.equal(received.tokens[0].value,'42');assert.equal(received.tokens[0].color,'#087FAD');
 assert.ok(received.histories.every(h=>!h.values.length));
 const split=c.snapshot(input.arrival+(a.at-input.arrival)*.7);
 assert.equal(split.tokens.length,2);
 assert.ok(split.tokens.every(t=>t.phase==='split-out'&&t.value==='42'&&t.color==='#087FAD'));
 assert.notEqual(split.tokens[0].y,split.tokens[1].y);
 const flying=c.snapshot((a.at+a.arrival)/2);
 assert.equal(flying.tokens.length,2);
 assert.deepEqual(Array.from(flying.tokens,t=>t.edge).sort(),['subject-A','subject-B']);
 assert.equal(flying.tokens[0].x,flying.tokens[1].x);
 for(const id of ['A','B']){
  assert.deepEqual(values(c.snapshot(a.arrival-1e-6),id),[]);
  assert.deepEqual(values(c.snapshot(a.arrival),id),['42']);
 }
 for(const f of [received,split,flying,c.snapshot(c.duration)]){
  assert.equal(f.ball.textFill,'#fff');
  assert.ok(f.histories.every(h=>h.values.every(v=>v.color==='#087FAD')));
  assert.doesNotMatch(m.renderer.renderScene(f),/data-split-guide|data-hub-link|NaN|Infinity/);
 }
});

test('complete follows next and propagates from HTTP through Subject to both subscribers',async()=>{
 const {c,at}=await subject();
 const upstream=c.plan.records.get('http-subject'),a=c.plan.records.get('subject-A'),b=c.plan.records.get('subject-B');
 assert.equal(a.end.kind,'complete');assert.equal(b.end.at,a.end.at);
 assert.ok(upstream.end.at>a.events[0].arrival);
 assert.equal(a.end.at,upstream.end.at+upstream.end.duration);
 assert.equal(node(c.snapshot(upstream.end.at),'http').laneStates[0].state,'completed');
 assert.ok(node(c.snapshot(upstream.end.at),'subject').laneStates.every(l=>l.state==='running'));
 assert.ok(node(c.snapshot(a.end.at),'subject').laneStates.every(l=>l.state==='completed'));
 assert.equal(node(c.snapshot(a.end.at),'B').laneStates[0].state,'running');
 const end=c.snapshot(c.duration);
 assert.ok(end.nodes.every(n=>n.laneStates.every(l=>l.state==='completed')));
 assert.ok(end.edges.every(e=>e.done&&!e.pulse));
 assert.equal(end.executionCounts.started,1);assert.equal(end.executionCounts.completed,1);
 assert.ok(c.snapshot(at('multicast')).nodes.every(n=>n.laneStates.every(l=>l.state==='running')));
 assert.match(end.caption,/ręcznie.*share/);
 assert.equal(c.events.some(e=>e.type==='inner-unsubscribe'),false);
});

test('Subject keeps A/B colours, independent upstream and fixed horizontal geometry in both formats',async()=>{
 for(const format of ['4:3','16:9']){
  const {c,at}=await subject(format),end=c.snapshot(c.duration);
  const colors={A:'#7457D9',B:'#D8840F',U:'#238F83'};
  for(const time of [at('subscribed-b'),at('request'),at('multicast'),c.duration]){
   const f=c.snapshot(time);
   for(const n of f.nodes){
    assert.ok(n.socketDots.every(d=>d.color===colors[d.subscriber]));
    assert.ok(n.laneRows?.every(r=>r.color===colors[r.subscriber]&&!r.stripe)??true);
    assert.equal(n.x,node(end,n.id).x);assert.equal(n.w,node(end,n.id).w);assert.equal(n.top,node(end,n.id).top);
    if(n.visible)assert.ok(n.y-n.h/2>=0&&n.y+n.h/2<=f.height);
   }
   for(const e of f.edges){assert.equal(e.color,colors[e.subscriber]);assert.ok(e.points.every(p=>p[1]===e.points[0][1]));}
  }
  for(const id of ['A','B']){
   const lane=node(end,'subject').laneStates.find(l=>l.subscriber===id);
   assert.equal(node(end,id).laneStates[0].y,lane.y);
   assert.equal(end.histories.find(h=>h.anchor===id).y,lane.y);
  }
 }
});

test('all Subject checkpoints and split frames rewind deterministically; manual and AUTO finish and reset',async()=>{
 const {scene,c}=await subject();
 const times=[0,...c.stops.map(s=>s.time),11.7,12.7,c.duration];
 for(const time of times){const expected=JSON.stringify(c.snapshot(time));c.snapshot(c.duration);c.snapshot(0);assert.equal(JSON.stringify(c.snapshot(time)),expected);}
 const h=await playbackHarness(),{player,controller}=h.create({scene});
 for(const stop of player.stops){controller.next();h.advance(30000);assert.equal(player.time,stop.time);assert.equal(player.isPlaying,false);}
 controller.next();h.advance(30000);assert.equal(player.state,'finished');assert.equal(h.frames.size,0);
 controller.previous();assert.equal(player.time,player.stops.at(-1).time);
 controller.reset();assert.equal(player.time,0);assert.equal(player.snapshot.executionCounts.started,0);
 controller.setMode('manual');controller.setMode('auto');h.advance(30000);assert.equal(player.state,'finished');
 assert.deepEqual(values(player.snapshot,'A'),['42']);assert.deepEqual(values(player.snapshot,'B'),['42']);
});

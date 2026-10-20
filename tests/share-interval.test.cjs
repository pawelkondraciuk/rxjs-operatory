const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {modules,playbackHarness,revealMock}=require('./v2-harness.cjs');
async function scene(format='4:3'){
 const m=await modules(['catalog','scene-config','engine','renderer']);
 const s=m['scene-config'].configureScene({...m.catalog.scenes.find(x=>x.id==='04a-dwa-tory'),id:'04a-dwa-tory-3',rendererId:'04a-dwa-tory',lanesMode:'share-interval',format});
 return {scene:s,render:m.renderer.renderScene,compile:m.engine.compileScene};
}
async function live(format,controls){
 const {scene:s,render}=await scene(format),h=await playbackHarness(),{player,controller}=h.create({scene:s,controls});
 return {scene:s,render,h,player,controller};
}
const node=(f,id)=>f.nodes.find(n=>n.id===id),lane=(f,id,sub)=>node(f,id)?.laneStates.find(l=>l.subscriber===sub);
const edge=(f,id)=>f.edges.find(e=>e.id===id),metric=(f,label)=>f.metrics.find(m=>m.label===label).value;
const values=(f,id)=>Array.from(f.histories.find(h=>h.anchor===id)?.values||[],v=>v.value);

test('READY: only A/B share interval #1, with no C, new source or subscription animation',async()=>{
 for(const format of ['4:3','16:9']){
  const {scene:s,compile}=await scene(format),c=compile(s),f=c.snapshot(0);
  assert.equal(s.code,'const shared$ = interval(1000).pipe(share());');assert.equal(s.playback.controller,'stages');
  assert.deepEqual(Array.from(c.stops,s=>s.id),['unsub-a','unsub-b','subscribed-c']);
  assert.deepEqual(Array.from(f.nodes,n=>n.id),['interval','share','A','B']);
  assert.equal(node(f,'share').label,'share()');assert.equal(node(f,'interval').laneStates.length,1);
  assert.equal(lane(f,'interval','U').state,'running');assert.equal(edge(f,'interval-share').phase,'subscribed');
  for(const id of ['A','B'])assert.equal(edge(f,'share-'+id).progress,1);
  assert.ok(c.events.filter(e=>e.type==='connected').every(e=>e.at<0));
  assert.equal(metric(f,'Odbiorcy share()'),2);assert.equal(metric(f,'Emisje interval'),0);
  assert.ok(f.nodes.every(n=>n.y+n.h/2<=f.height));
 }
});

test('A leaves, B disconnects interval #1, then late C subscribes to a new interval #2 starting from zero',async()=>{
 for(const format of ['4:3','16:9']){
  const navigation=[],{player,controller,h,render}=await live(format,{stageOptions:{onNavigate:d=>navigation.push(d)}});
  controller.toggle();h.advance(4000);controller.next();assert.equal(player.live.stage,1);
  h.advance(3000);let f=player.snapshot;
  assert.equal(lane(f,'share','A').state,'cancelled');assert.equal(lane(f,'share','B').state,'running');
  assert.equal(edge(f,'interval-share').phase,'subscribed');assert.equal(metric(f,'Odbiorcy share()'),1);
  const emitted=metric(f,'Emisje interval');h.advance(2000);assert.ok(metric(player.snapshot,'Emisje interval')>emitted);
  controller.next();assert.equal(player.live.stage,2);
  const positions=[];for(let i=0;i<100;i++){h.advance(50);const pulse=edge(player.snapshot,'interval-share').cancel;if(pulse)positions.push(pulse.x)}
  assert.ok(positions.length>3);assert.ok(positions.every((x,i)=>!i||x<positions[i-1]),'unsubscribe moves upstream');
  f=player.snapshot;assert.equal(lane(f,'interval','U').state,'cancelled');assert.equal(metric(f,'Odbiorcy share()'),0);
  assert.equal(node(f,'C'),undefined);assert.equal(player.live.busy,false);
  const stopped=metric(f,'Emisje interval'),histories=JSON.stringify(f.histories);h.advance(10000);
  assert.equal(metric(player.snapshot,'Emisje interval'),stopped);assert.equal(JSON.stringify(player.snapshot.histories),histories);
  assert.notEqual(player.state,'finished','C is still a possible next action');
  controller.next();assert.equal(player.live.stage,3);assert.equal(player.live.busy,true);
  const received=[];for(let i=0;i<140;i++){h.advance(50);for(const v of values(player.snapshot,'C'))if(received.at(-1)!==v)received.push(v)}
  assert.equal(received[0],'0');assert.ok(Number(received.at(-1))>0);
  f=player.snapshot;assert.equal(lane(f,'interval','U').state,'cancelled');assert.equal(lane(f,'interval','U2').state,'running');
  assert.equal(lane(f,'interval','U2').label,'#2');assert.equal(metric(f,'Odbiorcy share()'),1);
  assert.ok(!f.tokens.some(t=>t.phase==='replay'));assert.ok(f.nodes.every(n=>n.notification===null));assert.doesNotMatch(render(f),/✓ complete|NaN|Infinity/);
  controller.next();assert.deepEqual(navigation,[1]);
  controller.previous();assert.equal(player.live.stage,2);assert.equal(node(player.snapshot,'C'),undefined);
  assert.equal(lane(player.snapshot,'interval','U').state,'cancelled');
  controller.previous();h.advance(2000);assert.equal(player.live.stage,1);assert.equal(lane(player.snapshot,'share','B').state,'running');
  assert.equal(lane(player.snapshot,'interval','U').state,'running');
  controller.suspend('slide');controller.reset();assert.equal(player.live.stage,0);assert.equal(player.time,0);assert.equal(h.frames.size,0);
 }
});

test('quick next finishes unsubscribe or C subscribe without executing the following action; AUTO does not act on its own',async()=>{
 const navigation=[],{player,controller,h}=await live('4:3',{stageOptions:{onNavigate:d=>navigation.push(d)}});
 controller.setMode('auto');h.advance(4000);assert.equal(player.live.stage,0);
 controller.next();h.advance(100);controller.next();assert.equal(player.live.stage,1);assert.equal(player.live.busy,false);
 controller.next();h.advance(100);controller.next();assert.equal(player.live.stage,2);assert.equal(player.live.busy,false);
 assert.equal(lane(player.snapshot,'interval','U').state,'cancelled');assert.equal(node(player.snapshot,'C'),undefined);
 controller.next();h.advance(100);controller.next();assert.equal(player.live.stage,3);assert.equal(player.live.busy,false);
 assert.deepEqual(values(player.snapshot,'C'),['0']);assert.deepEqual(navigation,[]);
 h.advance(1000);controller.next();assert.deepEqual(navigation,[1]);
});

test('restore and print show stopped #1 and active #2; moving live windows preserve terminal histories and remain bounded',async()=>{
 for(const format of ['4:3','16:9']){
  const {scene:s,compile,render}=await scene(format);
  const v=s.live.variant(s,{from:0,to:30,closedAt:s.live.defaultClose,actions:s.live.defaults}),c=compile(v);
  const stop=id=>c.stops.find(s=>s.id===id).time;
  assert.equal(lane(c.snapshot(stop('unsub-b')),'interval','U').state,'cancelled');
  assert.equal(node(c.snapshot(stop('unsub-b')),'C')?.opacity??0,0);
  const mark=t=>c.snapshot(t).codeView[0].find(p=>p.mark?.id==='share').active;
  const at=(type,id)=>c.events.find(e=>e.type===type&&e.edge===id).at;
  assert.equal(mark(at('inner-unsubscribe','share-A')+.2),false);
  assert.equal(mark((at('disconnected','share-B')+at('disconnected','interval-share'))/2),true);
  assert.ok(at('inner-unsubscribe','interval-share')>=at('disconnected','share-B')-1e-8);
  const restarted=c.plan.records.get('interval-share-2');assert.equal(restarted.events[0].value,'0');
  assert.ok(restarted.start>at('disconnected','interval-share'));assert.equal(c.events.some(e=>e.type==='stream-complete'),false);
  for(const time of [0,...c.stops.map(s=>s.time),c.duration]){
   const f=c.snapshot(time),saved=JSON.stringify(f);c.snapshot(c.duration);c.snapshot(0);assert.equal(JSON.stringify(c.snapshot(time)),saved);
   assert.ok(f.nodes.filter(n=>n.visible).every(n=>n.y+n.h/2<=f.height));assert.doesNotMatch(render(f),/NaN|Infinity|="undefined"/);
  }
  const far=compile(s.live.variant(s,{from:1000,to:1030,closedAt:null,actions:s.live.defaults}));
  assert.ok(far.events.length<250);assert.equal(lane(far.snapshot(1010),'interval','U').state,'cancelled');
  assert.equal(lane(far.snapshot(1010),'interval','U2').state,'running');assert.ok(Number(values(far.snapshot(1010),'C')[0])>900);
  assert.ok(values(far.snapshot(1010),'A').length&&values(far.snapshot(1010),'B').length);
 }
 const restored=await live('4:3');restored.controller.seekCheckpoint(restored.player.stops.find(s=>s.id==='unsub-b').time);
 assert.equal(restored.player.live.stage,2);assert.equal(node(restored.player.snapshot,'C'),undefined);
 restored.controller.seekCheckpoint(restored.player.stops.find(s=>s.id==='subscribed-c').time);assert.equal(restored.player.live.stage,3);
 assert.deepEqual(values(restored.player.snapshot,'C'),['0']);
 const printed=await live('4:3');printed.player.finish();assert.equal(printed.player.state,'finished');
 assert.equal(lane(printed.player.snapshot,'interval','U').state,'cancelled');assert.equal(lane(printed.player.snapshot,'interval','U2').state,'running');
});

test('Reveal advances through two unsubscribe actions and a late subscribe; notes explain the fresh source',async()=>{
 const {scene:s}=await scene(),h=await playbackHarness(),{deck,stage}=revealMock();
 stage.markers=Array.from({length:4},(_,index)=>({index,visible:false,closest(x){return x==='section'?stage:x==='.rx-fragment-steps'?stage.markers:null}}));
 const {player,controller}=h.create({scene:s,controls:{stageOptions:{onNavigate:d=>deck.navigation.push(d)}}});
 const adapter=h.install(deck,{getController:()=>controller});adapter.refresh();controller.toggle();h.advance(4000);
 for(let i=0;i<3;i++){deck.press(39);h.advance(6000);assert.equal(player.live.stage,i+1);assert.equal(deck.fragmentIndex,i)}
 deck.press(39);assert.deepEqual(deck.navigation,[1]);adapter.destroy();
 const html=fs.readFileSync('index.html','utf8'),source=html.match(/<template data-checkpoint-notes="04a-dwa-tory-3">([\s\S]*?)<\/template>/)[1];
 assert.deepEqual([...source.matchAll(/data-checkpoint="([^"]+)"/g)].map(m=>m[1]),['ready',...s.playback.stops.map(s=>s.id),'finished']);
 assert.match(source,/B.*ostatni/);assert.match(source,/C.*od 0/);assert.match(source,/Prawo: shareReplay\(1\)/);
});

test('F during either unsubscribe or late subscribe finishes the handoff and shows a value from interval #2',async()=>{
 for(const stage of [1,2,3]){
  const {player,controller,h}=await live('4:3');controller.toggle();h.advance(4000);
  for(let i=0;i<stage;i++){controller.next();h.advance(i===stage-1?100:5000)}
  controller.finish();const f=player.snapshot;
  assert.equal(player.state,'finished');assert.equal(player.live.stage,3);
  assert.equal(lane(f,'interval','U').state,'cancelled');assert.equal(lane(f,'interval','U2').state,'running');
  assert.ok(values(f,'C').length>0,'late C receives a fresh value even when F interrupts a busy action');
 }
});

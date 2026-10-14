const {test}=require('node:test');
const assert=require('node:assert/strict');
const {modules,playbackHarness,revealMock}=require('./v2-harness.cjs');
const history=frame=>Array.from(frame.histories[0].values,v=>v.value);
const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-8,`${actual} != ${expected}`);
async function subject() {
  const m=await modules(['catalog','engine','renderer','reference-scenes']);
  const scene=m.catalog.scenes.find(s=>s.id==='04-operator');
  return {scene,compiled:m.engine.compileScene(scene),m};
}

const lane=(frame,id)=>frame.nodes.find(n=>n.id===id).laneStates.find(l=>l.subscriber==='A');

test('pipe and map fade in together before subscribe and three synchronous emissions',async()=>{
  const {scene,compiled:c,m}=await subject();
  assert.deepEqual(Array.from(m.catalog.scenes.filter(s=>s.playback.controller==='stages'),s=>s.id),['04-operator']);
  assert.deepEqual(Array.from(c.stops,s=>s.id),['pipeline','subscribed','first']);
  const ready=c.snapshot(0),pipeline=c.snapshot(c.stops[0].time),subscribed=c.snapshot(c.stops[1].time);
  assert.equal(ready.code,'of(1, 2, 3)');
  assert.equal(pipeline.code,ready.code+'\n.pipe(map(x => x * 2))');
  assert.equal(subscribed.code,pipeline.code);
  assert.equal(c.snapshot(c.duration).code,pipeline.code);
  assert.doesNotMatch(subscribed.code,/subscribe/);
  assert.doesNotMatch(subscribed.code,/OperatorFunction|Observable|const|number|\/\//);
  assert.match(c.stops[0].caption,/pipe/);assert.match(c.stops[1].caption,/subscribe/);
  assert.equal(ready.nodes.find(n=>n.id==='map').visible,false);
  assert.equal(pipeline.nodes.find(n=>n.id==='map').visible,true);
  assert.equal(ready.codeReveal.opacity,0);
  const fading=c.snapshot(scene.timing.handoff+.15),map=fading.nodes.find(n=>n.id==='map');
  close(fading.codeReveal.opacity,.5);close(map.opacity,.5);
  assert.equal(pipeline.codeReveal.opacity,1);
  assert.equal(pipeline.nodes.find(n=>n.id==='map').opacity,1);
  // Odbiorca to wiersz wykonania: pojawia się dopiero po etapie pipeline, przed subscribe.
  for(const frame of [ready,pipeline])assert.equal(frame.nodes.find(n=>n.id==='observer').visible,false);
  assert.equal(subscribed.nodes.find(n=>n.id==='observer').opacity,1);
  assert.doesNotMatch(m.renderer.renderScene(subscribed),/Subscriber|wykonanie #1/);
  assert.equal(subscribed.panels.length,0);
  for(const frame of [ready,pipeline,subscribed]) {
    assert.deepEqual(history(frame),[]);assert.equal(frame.tokens.length,0);
    assert.ok(frame.nodes.every(n=>!n.active&&!n.showProgress));
  }
  assert.ok(ready.edges.every(e=>!e.visible));assert.ok(pipeline.edges.every(e=>!e.visible));
  assert.ok(subscribed.edges.every(e=>e.visible&&e.phase==='subscribed'&&e.subscriber==='A'));
  const plain=m.catalog.scenes.find(s=>s.id==='19-share');
  assert.equal(m.engine.compileScene(plain).snapshot(0).code,plain.code);
});

test('subscribe travels backwards slowly and next waits for both connections',async()=>{
  const {compiled:c,scene}=await subject();
  const downstream=c.plan.records.get('map-observer'),upstream=c.plan.records.get('source-map');
  close(upstream.start,downstream.start+downstream.connectDuration);
  close(c.stops[1].time-downstream.start,scene.timing.subscribe+scene.timing.laneReveal);
  const duringDownstream=c.snapshot(downstream.start+downstream.connectDuration/2);
  assert.equal(duringDownstream.edges.find(e=>e.id==='source-map').visible,false);
  close(duringDownstream.edges.find(e=>e.id==='map-observer').offset,-.5);
  // Wiersz wykonania w map rośnie razem z subscribe; źródło dostaje wiersz, gdy subscribe do niego dotrze.
  assert.equal(c.snapshot(downstream.start).nodes.find(n=>n.id==='source').laneRows.length,0);
  assert.equal(c.snapshot(c.stops[1].time).nodes.find(n=>n.id==='source').laneRows[0].growth,1);
  const first=c.events.find(e=>e.type==='source-next'&&e.edge==='source-map');
  assert.ok(first.at>c.stops[1].time);
});

test('one ball stops in map, changes value halfway and continues, with synchronous logical time',async()=>{
  const {compiled:c,scene}=await subject();
  const inputs=c.plan.records.get('source-map').events,outputs=c.plan.records.get('map-observer').events;
  assert.equal(inputs.length,3);assert.equal(outputs.length,3);
  for(let i=0;i<inputs.length;i++) {
    const input=inputs[i],output=outputs[i];
    close(input.arrival-input.at,scene.timing.travel);
    close(output.at-input.arrival,scene.timing.transform);
    close(output.arrival-output.at,scene.timing.travel);
    const incoming=c.snapshot((input.at+input.arrival)/2),outgoing=c.snapshot((output.at+output.arrival)/2);
    assert.deepEqual(Array.from(incoming.tokens,t=>t.value),[String(i+1)]);
    const before=c.snapshot(input.arrival+(output.at-input.arrival)*.4),after=c.snapshot(input.arrival+(output.at-input.arrival)*.6);
    assert.deepEqual(Array.from(before.tokens,t=>[t.phase,t.value]),[['transform',String(i+1)]]);
    assert.deepEqual(Array.from(after.tokens,t=>[t.phase,t.value]),[['transform',String((i+1)*2)]]);
    const map=before.nodes.find(n=>n.id==='map'),token=before.tokens[0];
    assert.ok(Math.abs(token.x-map.x)<1e-6);assert.equal(token.y,lane(before,'map').y);
    assert.deepEqual(Array.from(outgoing.tokens,t=>t.value),[String((i+1)*2)]);
    assert.deepEqual(history(c.snapshot(output.arrival-1e-6)),['2','4','6'].slice(0,i));
    assert.deepEqual(history(c.snapshot(output.arrival)),['2','4','6'].slice(0,i+1));
  }
  for(const event of c.events.filter(e=>['source-next','deliver-next','stream-complete'].includes(e.type)))assert.equal(event.logicalAt,0);
  for(const time of [0,...c.events.flatMap(e=>[e.at-1e-6,e.at,e.at+1e-6]),c.duration]) {
    const frame=c.snapshot(time);
    assert.ok(frame.tokens.length<=1);assert.equal(frame.histories.length,1);assert.equal(frame.panels.length,0);
    assert.ok(frame.nodes.every(n=>!n.showProgress));
  }
});

test('lane geometry: definition headers, one execution lane A and balls inside the receiver row',async()=>{
  const {compiled:c,m}=await subject();
  const final=c.snapshot(c.duration),nodes=['source','map','observer'].map(id=>final.nodes.find(n=>n.id===id));
  assert.equal(nodes[0].label,'of(1, 2, 3)');assert.equal(nodes[1].label,'map');
  const y=lane(final,'source').y;
  for(const id of ['map','observer'])assert.equal(lane(final,id).y,y);
  assert.ok(final.edges.every(e=>e.points.every(p=>p[1]===y)));
  const left=Math.min(...nodes.map(n=>n.x-n.w/2)),right=Math.max(...nodes.map(n=>n.x+n.w/2));
  assert.ok(Math.abs((left+right)/2-final.width/2)<2,'wyśrodkowane w poziomie');
  // Nagłówki definicji zostają pastelowe; stan wykonania niesie wiersz.
  assert.equal(nodes[0].fill,'#8FC9D4');assert.equal(nodes[1].fill,'#D8B3E6');
  assert.ok(['source','map','observer'].every(id=>lane(final,id).state==='completed'));
  const receiver=nodes[2],tray=final.histories[0];
  assert.equal(tray.y,y);assert.ok(tray.balls);
  assert.ok(tray.x-final.ball.r>receiver.x-receiver.w/2&&tray.x+2*(2*final.ball.r+tray.gap)+final.ball.r<receiver.x+receiver.w/2);
  const svg=m.renderer.renderScene(final);
  assert.doesNotMatch(svg,/>✓ complete<\/text>|data-transformation|rx="12"/);
  assert.deepEqual(Array.from(svg.matchAll(/data-token="received"[^>]*>[^]*?<text[^>]*>([^<]*)<\/text>/g),x=>x[1]),['2','4','6']);
});

test('receiver row, history and connections follow rewind and reset',async()=>{
  const {compiled:c,scene}=await subject();
  const first=c.plan.records.get('map-observer').events[0];
  for(const time of [0,c.stops[1].time,first.at,(first.at+first.arrival)/2,first.arrival-1e-6])assert.deepEqual(history(c.snapshot(time)),[]);
  for(const time of [first.arrival,c.stops[2].time,c.duration])assert.ok(history(c.snapshot(time)).length>=1);
  const h=await playbackHarness(),{player,controller}=h.create({scene});
  controller.finish();assert.deepEqual(history(player.snapshot),['2','4','6']);
  controller.previous();assert.deepEqual(history(player.snapshot),['2']);
  controller.previous();assert.deepEqual(history(player.snapshot),[]);
  controller.reset();assert.equal(player.snapshot.nodes.find(n=>n.id==='observer').visible,false);
  assert.ok(player.snapshot.edges.every(e=>!e.visible));
  controller.seek(first.arrival);assert.deepEqual(history(player.snapshot),['2']);
});

test('complete follows the last result as a pulse, settles and ends both edges before FINISHED',async()=>{
  const {compiled:c,scene}=await subject();
  const result=c.plan.records.get('map-observer'),source=c.plan.records.get('source-map');
  assert.ok(source.end.at>result.events.at(-1).arrival);
  close(result.end.at,source.end.at+source.end.duration);
  close(c.duration-source.end.at,scene.timing.terminal+scene.timing.settle);
  const during=c.snapshot(source.end.at+source.end.duration/2);
  assert.equal(during.edges.find(e=>e.id==='source-map').phase,'complete');
  assert.equal(during.edges.find(e=>e.id==='source-map').pulse.color,'#26804E');
  assert.equal(during.nodes.find(n=>n.id==='source').notification,'complete');
  assert.equal(during.nodes.find(n=>n.id==='map').notification,null);
  assert.equal(lane(during,'source').state,'completed');assert.equal(lane(during,'observer').state,'running');
  const forwarded=c.snapshot(result.end.at);
  assert.equal(forwarded.nodes.find(n=>n.id==='map').notification,'complete');
  const final=c.snapshot(c.duration);
  assert.deepEqual(history(final),['2','4','6']);assert.equal(final.tokens.length,0);
  assert.ok(final.edges.every(e=>e.done&&!e.pulse));
  assert.ok(final.nodes.filter(n=>['source','map','observer'].includes(n.id)).every(n=>n.notification==='complete'));
  // Rozbłysk wiersza (0,6 s) wygasa przed FINISHED.
  assert.ok(c.duration-(result.end.at+result.end.duration)>=.6);
  assert.ok(final.nodes.every(n=>!n.status));
});

test('custom timing preserves the storyboard and all checkpoint snapshots are deterministic',async()=>{
  const {scene,m}=await subject();
  const custom={...scene,timing:{...scene.timing,subscribe:1.4,travel:.8,transform:.6,receivedHold:.4,gap:.8,terminal:.7}};
  m['reference-scenes'].configureOperator(custom);
  const c=m.engine.compileScene(custom),points=[0,...c.stops.map(s=>s.time),...c.events.map(e=>e.at),c.duration];
  const source=c.plan.records.get('source-map'),result=c.plan.records.get('map-observer');
  close(c.stops[1].time-result.start,1.4+custom.timing.laneReveal);close(c.duration-source.end.at,.7+custom.timing.settle);
  for(const time of points) {
    const frame=JSON.stringify(c.snapshot(time));c.snapshot(c.duration);c.snapshot(0);
    assert.equal(JSON.stringify(c.snapshot(time)),frame);
  }
  assert.deepEqual(history(c.snapshot(c.duration)),['2','4','6']);
});

test('.subscribe() A shows while the subscription travels upstream, not in the code and not at stops',async()=>{
  const {compiled:c}=await subject(),shown=t=>Array.from(c.snapshot(t).callouts||[],k=>k.text+' '+k.label);
  const down=c.plan.records.get('map-observer'),up=c.plan.records.get('source-map');
  assert.deepEqual(shown(down.start),['.subscribe() A']);assert.deepEqual(shown(up.start+up.connectDuration/2),['.subscribe() A']);
  for(const stop of c.stops)assert.deepEqual(shown(stop.time),[],stop.id);
  assert.doesNotMatch(c.snapshot(down.start).code,/subscribe/);
});

// Wyświetlany kod: HTML z <wbr> jako punktami łamania, bez zmiany treści.
const shownCode=element=>element.innerHTML.replace(/<span[^>]*aria-hidden="true"[^>]*>[^]*?<\/span>/g,'').replace(/<\/?span[^>]*>/g,'').replace(/<wbr>/g,'').replace(/&gt;/g,'>').replace(/&lt;/g,'<').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&');
test('manual first delivery, pause, AUTO, backwards and reset restore the displayed code and receiver history',async()=>{
  const {scene}=await subject(),h=await playbackHarness(),{player,controller,elements}=h.create({scene});
  const ready=JSON.stringify(player.snapshot);
  for(let i=0;i<3;i++) {
    controller.next();h.advance(6000);
    assert.equal(player.time,player.stops[i].time);assert.equal(player.state,'paused');assert.equal(h.frames.size,0);
    assert.equal(shownCode(elements.get('.rx-code')),player.snapshot.code);
    assert.match(elements.get('.rx-code').innerHTML,player.snapshot.code.includes(').')?/\)<wbr>\./:/^/);
  }
  assert.deepEqual(history(player.snapshot),['2']);
  controller.next();assert.equal(controller.mode,'auto');h.advance(500);
  controller.toggle();const paused=JSON.stringify(player.snapshot);h.advance(2000);assert.equal(JSON.stringify(player.snapshot),paused);
  controller.toggle();h.advance(30000);assert.equal(player.state,'finished');assert.equal(h.frames.size,0);
  assert.deepEqual(history(player.snapshot),['2','4','6']);
  controller.previous();assert.deepEqual(history(player.snapshot),['2']);
  controller.previous();assert.deepEqual(history(player.snapshot),[]);assert.doesNotMatch(shownCode(elements.get('.rx-code')),/subscribe/);
  controller.previous();assert.doesNotMatch(shownCode(elements.get('.rx-code')),/subscribe/);
  controller.previous();assert.equal(JSON.stringify(player.snapshot),ready);
  for(const time of [0,...player.stops.map(s=>s.time),player.duration]) {
    controller.seek(time);controller.reset();assert.equal(player.state,'ready');assert.equal(h.frames.size,0);
    assert.equal(JSON.stringify(player.snapshot),ready);assert.equal(controller.mode,'auto');
  }
  controller.setMode('manual');controller.next();h.advance(100);controller.toggle();const time=player.time;
  controller.toggle();h.advance(1000);assert.ok(time<player.stops[0].time);assert.equal(player.time,player.stops[0].time);
});

test('Reveal keys and native fragments operate the real slide and ordinary slides recover native navigation',async()=>{
  const {scene}=await subject(),h=await playbackHarness(),{deck,stage,ordinary,bindings}=revealMock();
  stage.markers=Array.from({length:4},(_,index)=>({index,visible:false,closest(s){return s==='section'?stage:s==='.rx-fragment-steps'?stage.markers:null;}}));
  const {player,controller}=h.create({scene,controls:{stageOptions:{onNavigate:d=>deck.navigation.push(d)}}});
  const adapter=h.install(deck,{getController:s=>s===stage?controller:null});adapter.refresh();
  for(let i=0;i<3;i++){deck.press(39);deck.press(39);assert.equal(player.time,player.stops[i].time);assert.equal(deck.fragmentIndex,i);}
  assert.deepEqual(history(player.snapshot),['2']);assert.equal(controller.mode,'manual');
  deck.navigateFragment(3);assert.equal(controller.mode,'auto');h.advance(30000);
  assert.equal(player.state,'finished');assert.equal(deck.fragmentIndex,3);
  deck.press(37);assert.equal(player.time,player.stops[2].time);assert.deepEqual(history(player.snapshot),['2']);
  controller.reset();deck.navigateFragment(0);assert.equal(player.isPlaying,true);deck.press(32);assert.equal(player.isPlaying,false);
  controller.suspend('slide');deck.show(ordinary);assert.equal(bindings.size,0);deck.press(39);assert.equal(deck.navigation.at(-1),'native:39');
  deck.show(stage);controller.resume('slide');assert.equal(player.isPlaying,false);adapter.destroy();
});

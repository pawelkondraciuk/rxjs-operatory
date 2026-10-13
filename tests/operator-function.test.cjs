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
  assert.doesNotMatch(m.renderer.renderScene(subscribed),/Subscriber|wykonanie #1/);
  assert.equal(subscribed.panels.length,1);
  for(const frame of [ready,pipeline,subscribed]) {
    assert.deepEqual(history(frame),[]);assert.equal(frame.tokens.length,0);
    assert.ok(frame.nodes.every(n=>!n.active&&!n.showProgress));
  }
  assert.ok(ready.edges.every(e=>!e.visible));assert.ok(pipeline.edges.every(e=>!e.visible));
  assert.ok(subscribed.edges.every(e=>e.visible&&e.phase==='subscribed'));
  const plain=m.catalog.scenes.find(s=>s.id==='19-share');
  assert.equal(m.engine.compileScene(plain).snapshot(0).code,plain.code);
});

test('subscribe travels backwards slowly and next waits for both connections',async()=>{
  const {compiled:c,scene}=await subject();
  const downstream=c.plan.records.get('map-observer'),upstream=c.plan.records.get('source-map');
  close(upstream.start,downstream.start+downstream.connectDuration);
  close(c.stops[1].time-downstream.start,scene.timing.subscribe);
  const duringDownstream=c.snapshot(downstream.start+downstream.connectDuration/2);
  assert.equal(duringDownstream.edges.find(e=>e.id==='source-map').visible,false);
  close(duringDownstream.edges.find(e=>e.id==='map-observer').offset,-.5);
  const first=c.events.find(e=>e.type==='source-next'&&e.edge==='source-map');
  assert.ok(first.at>c.stops[1].time);
});

test('one travelling value becomes a short transformation then one result, with synchronous logical time',async()=>{
  const {compiled:c,m,scene}=await subject();
  const inputs=c.plan.records.get('source-map').events,outputs=c.plan.records.get('map-observer').events;
  assert.equal(inputs.length,3);assert.equal(outputs.length,3);
  for(let i=0;i<inputs.length;i++) {
    const input=inputs[i],output=outputs[i];
    close(input.arrival-input.at,scene.timing.travel);
    close(output.at-input.arrival,scene.timing.transform);
    close(output.arrival-output.at,scene.timing.travel);
    const incoming=c.snapshot((input.at+input.arrival)/2),transform=c.snapshot((input.arrival+output.at)/2),outgoing=c.snapshot((output.at+output.arrival)/2);
    assert.deepEqual(Array.from(incoming.tokens,t=>t.value),[String(i+1)]);
    assert.equal(transform.tokens.length,0);
    assert.equal(transform.nodes.find(n=>n.id==='map').transform,`${i+1} → ${(i+1)*2}`);
    const node=transform.nodes.find(n=>n.id==='map');
    const rendered=m.renderer.renderScene(transform);
    const resultY=Number(rendered.match(/<text[^>]*y="([^"]+)"[^>]*data-transformation="true"/)[1]);
    assert.ok(resultY>node.y+node.h/2);
    assert.match(m.renderer.renderScene(transform),/data-transformation="true"/);
    assert.deepEqual(Array.from(outgoing.tokens,t=>t.value),[String((i+1)*2)]);
    assert.equal(c.snapshot(output.at-1e-6).nodes.find(n=>n.id==='map').transform,`${i+1} → ${(i+1)*2}`);
    assert.equal(c.snapshot(output.at).nodes.find(n=>n.id==='map').transform,undefined);
    assert.doesNotMatch(m.renderer.renderScene(outgoing),/data-transformation/);
    assert.deepEqual(history(c.snapshot(output.arrival-1e-6)),['2','4','6'].slice(0,i));
    assert.deepEqual(history(c.snapshot(output.arrival)),['2','4','6'].slice(0,i+1));
  }
  for(const event of c.events.filter(e=>['source-next','deliver-next','operator-transform','stream-complete'].includes(e.type)))assert.equal(event.logicalAt,0);
  for(const time of [0,...c.events.flatMap(e=>[e.at-1e-6,e.at,e.at+1e-6]),c.duration]) {
    const frame=c.snapshot(time);
    assert.ok(frame.tokens.length<=1);assert.equal(frame.histories.length,1);assert.equal(frame.panels.length,1);
    assert.ok(frame.nodes.every(n=>!n.showProgress));
  }
});

test('tiles share switchMap geometry, the receiver box is shorter and the transient result stays underneath',async()=>{
  const {compiled:c,m,scene}=await subject();
  const switchScene=m.catalog.scenes.find(s=>s.id==='11-switchmap'),reference=m.engine.compileScene(switchScene).snapshot(0);
  const current=c.snapshot(0),shape=n=>[n.x,n.y,n.w,n.h];
  for(const [id,referenceId] of [['source','source'],['map','op'],['observer','observer']]) {
    assert.deepEqual(shape(current.nodes.find(n=>n.id===id)),shape(reference.nodes.find(n=>n.id===referenceId)));
  }
  const receiver=current.nodes.find(n=>n.id==='observer'),box=current.panels[0],tray=current.histories[0];
  assert.equal(box.x,receiver.x-receiver.w/2);assert.equal(box.w,receiver.w);assert.equal(box.h,receiver.h);
  assert.equal(tray.x,receiver.x);assert.equal(tray.lines,1);assert.equal(tray.y,box.y+box.h/2);
  const finalSvg=m.renderer.renderScene(c.snapshot(c.duration));
  const received=Array.from(finalSvg.matchAll(/<g data-token="received"[^>]*><rect x="([^"]+)" y="([^"]+)" width="([^"]+)" height="([^"]+)"[^]*?<text[^>]*>([^<]*)<\/text><\/g>/g),match=>({x:Number(match[1]),y:Number(match[2]),w:Number(match[3]),h:Number(match[4]),value:match[5]}));
  assert.deepEqual(received.map(t=>t.value),['2','4','6']);assert.equal(new Set(received.map(t=>t.y)).size,1);
  for(const token of received){assert.ok(token.x>=box.x&&token.x+token.w<=box.x+box.w);assert.ok(token.y>=box.y&&token.y+token.h<=box.y+box.h);}
  const node=current.nodes.find(n=>n.id==='map');assert.equal(node.labelOffset,undefined);assert.equal(node.x,current.width/2);
  assert.ok(scene.timing.subscribe>=3);assert.ok(scene.timing.travel>=1);assert.ok(scene.timing.transform>=1);
  const first=c.snapshot(c.stops.at(-1).time);assert.equal(first.nodes.find(n=>n.id==='map').transform,undefined);
  assert.equal(first.nodes.find(n=>n.id==='map').active,false);
  assert.deepEqual(history(first),['2']);
});

test('receiver box and connector appear only on first delivery and disappear after rewind or reset',async()=>{
  const {compiled:c,scene,m}=await subject();
  const first=c.plan.records.get('map-observer').events[0];
  for(const time of [0,c.stops[1].time,first.at,(first.at+first.arrival)/2,first.arrival-1e-6]){
    const frame=c.snapshot(time),svg=m.renderer.renderScene(frame);
    assert.equal(frame.panels[0].visible,false);assert.deepEqual(history(frame),[]);
    assert.doesNotMatch(svg,/stroke-dasharray="6 5"/);
    if(time===0)assert.doesNotMatch(svg,/<rect[^>]*rx="12"/);
  }
  for(const time of [first.arrival,c.stops[2].time,c.duration]){
    const frame=c.snapshot(time),svg=m.renderer.renderScene(frame);
    assert.equal(frame.panels[0].visible,true);assert.ok(history(frame).length>=1);
    assert.match(svg,/<rect[^>]*rx="12"/);assert.match(svg,/stroke-dasharray="6 5"/);
  }
  const h=await playbackHarness(),{player,controller,elements}=h.create({scene});
  controller.finish();assert.match(elements.get('.rx-stage').innerHTML,/<rect[^>]*rx="12"/);
  controller.previous();assert.deepEqual(history(player.snapshot),['2']);
  controller.previous();assert.deepEqual(history(player.snapshot),[]);
  assert.equal(player.snapshot.panels[0].visible,false);
  assert.doesNotMatch(elements.get('.rx-stage').innerHTML,/stroke-dasharray="6 5"/);
  controller.reset();assert.equal(player.snapshot.panels[0].visible,false);
  controller.seek(first.arrival);assert.equal(player.snapshot.panels[0].visible,true);
});

test('complete follows the last result, has its own style and ends both edges exactly at FINISHED',async()=>{
  const {compiled:c,scene,m}=await subject();
  const result=c.plan.records.get('map-observer'),source=c.plan.records.get('source-map');
  assert.ok(source.end.at>result.events.at(-1).arrival);
  close(result.end.at,source.end.at+source.end.duration);
  close(c.duration-source.end.at,scene.timing.terminal);
  const during=c.snapshot(source.end.at+source.end.duration/2);
  assert.equal(during.edges.find(e=>e.id==='source-map').phase,'complete');
  assert.equal(during.edges.find(e=>e.id==='source-map').color,'#087438');
  assert.equal(during.nodes.find(n=>n.id==='source').notification,'complete');
  assert.equal(during.nodes.find(n=>n.id==='map').notification,null);
  assert.equal(during.nodes.find(n=>n.id==='observer').notification,null);
  const forwarded=c.snapshot(result.end.at);
  assert.equal(forwarded.nodes.find(n=>n.id==='map').notification,'complete');
  assert.equal(forwarded.nodes.find(n=>n.id==='observer').notification,null);
  const final=c.snapshot(c.duration);
  assert.deepEqual(history(final),['2','4','6']);assert.equal(final.tokens.length,0);
  assert.ok(final.edges.every(e=>e.done&&!e.visible));
  assert.ok(final.nodes.filter(n=>['source','map','observer'].includes(n.id)).every(n=>n.notification==='complete'));
  assert.ok(final.nodes.filter(n=>n.id.includes('-')).every(n=>n.notification===null));
  const titles=Array.from(m.renderer.renderScene(final).matchAll(/<g data-node="(?:source|map|observer)"[^]*?<text x="[^"]+" y="([^"]+)"/g),match=>Number(match[1]));
  assert.equal(titles.length,3);assert.equal(new Set(titles).size,1);
  assert.match(m.renderer.renderScene(final),/✓ complete/);
  assert.doesNotMatch(m.renderer.renderScene(final),/data-work-progress|data-transformation/);
  assert.equal(final.nodes.find(n=>n.id==='map').transform,undefined);
  assert.equal(final.nodes.find(n=>n.id==='map').active,false);
});

test('custom timing preserves the storyboard and all checkpoint snapshots are deterministic',async()=>{
  const {scene,m}=await subject();
  const custom={...scene,timing:{...scene.timing,subscribe:1.4,travel:.8,transform:.6,receivedHold:.4,gap:.8,terminal:.7}};
  m['reference-scenes'].configureOperator(custom);
  const c=m.engine.compileScene(custom),points=[0,...c.stops.map(s=>s.time),...c.events.map(e=>e.at),c.duration];
  const source=c.plan.records.get('source-map'),result=c.plan.records.get('map-observer');
  close(c.stops[1].time-result.start,1.4);close(c.duration-source.end.at,.7);
  for(const time of points) {
    const frame=JSON.stringify(c.snapshot(time));c.snapshot(c.duration);c.snapshot(0);
    assert.equal(JSON.stringify(c.snapshot(time)),frame);
  }
  assert.deepEqual(history(c.snapshot(c.duration)),['2','4','6']);
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

const {test}=require('node:test');
const assert=require('node:assert/strict');
const {modules,playbackHarness,revealMock}=require('./v2-harness.cjs');
async function fixture(format='16:9') {
  const m=await modules(['scene-config','engine','renderer','checkpoint-notes']);
  const scene=m['scene-config'].configureScene({id:'12-query-zrodlo',format});
  return {m,scene,c:m.engine.compileScene(scene),compile:m.engine.compileScene,render:m.renderer.renderScene};
}
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} ≈ ${b}`);
const history=(f,id)=>f.histories.find(h=>h.anchor===id).values.at(-1)?.value;
const codeText=f=>f.codeView.map(line=>line.filter(part=>part.opacity>0).map(part=>part.text).join('')).filter(Boolean).join('\n');

test('READY shows only fromEvent, the empty input and two receivers; map and share enter in separate steps',async()=>{
  const {scene,c}=await fixture(),ready=c.snapshot(0);
  assert.equal(codeText(ready),"const query$ = fromEvent(inputEl, 'input')");
  assert.deepEqual(Array.from(ready.nodes.filter(n=>n.visible),n=>n.id),['source','A','B']);
  assert.equal(ready.readouts[0].value,'');assert.equal(ready.tokens.length,0);
  assert.ok(ready.nodes.every(n=>!n.socketDots.length));assert.ok(ready.edges.every(e=>!e.visible));
  const map=c.snapshot(scene.playback.stops[0].time),share=c.snapshot(scene.playback.stops[1].time);
  assert.equal(codeText(map),"const query$ = fromEvent(inputEl, 'input').pipe(\n  map(event => (event.target as HTMLInputElement).value.trim())\n);");
  assert.equal(map.nodes.find(n=>n.id==='map').visible,true);assert.equal(map.nodes.find(n=>n.id==='share').visible,false);
  assert.equal(codeText(share),scene.code);assert.equal(share.nodes.find(n=>n.id==='share').visible,true);
  for(const f of [map,share]){assert.equal(f.tokens.length,0);assert.ok(f.edges.every(e=>!e.visible));assert.equal(f.readouts[0].value,'');}
  const subscriptions=Array.from(c.events.filter(e=>e.type==='subscribe'),e=>[e.edge,e.at]).sort((a,b)=>a[1]-b[1]);
  assert.deepEqual(subscriptions.map(e=>e[0]),['share-A','map-share','source-map','share-B']);
  assert.ok(subscriptions[0][1]>scene.playback.stops[1].time);
  assert.ok(c.events.filter(e=>e.type==='connected').every(e=>e.at<scene.live.start));
  assert.ok(scene.querySourceInputs[0].at>scene.live.start);
});

test('input types angular, erases every letter, emits the empty string and repeats without resubscribing',async()=>{
  const {scene,c}=await fixture(),input=scene.querySourceInputs;
  assert.deepEqual(Array.from(input.slice(0,15),v=>v.value),['a','an','ang','angu','angul','angula','angular','angula','angul','angu','ang','an','a','','a']);
  assert.equal(c.snapshot(0).readouts[0].value,'');
  for(const value of input.slice(0,15))assert.equal(c.snapshot(value.at+.001).readouts[0].value,value.value);
  assert.equal(c.events.filter(e=>e.type==='subscribe').length,4,'one shared upstream through map, two downstream subscriptions');
  assert.equal(c.events.filter(e=>e.type==='subscribe'&&e.edge==='source-map').length,1);
  assert.equal(c.events.some(e=>['inner-create','stream-error','stream-complete','inner-unsubscribe'].includes(e.type)),false);
  assert.equal(c.snapshot(25).executions.length,0);
  assert.equal(c.snapshot(25).metrics.length,0);
});

test('map transforms the input event into text; share delivers identical notifications to both receivers',async()=>{
  const {scene,c}=await fixture();
  for(const input of scene.querySourceInputs.slice(0,14)) {
    const matching=(type,edge)=>c.events.find(e=>e.type===type&&e.edge===edge&&Math.abs(e.logicalAt-input.logicalAt)<1e-7);
    const event=matching('source-next','source-map'),mapped=matching('source-next','map-share');
    const a=matching('deliver-next','share-A'),b=matching('deliver-next','share-B');
    assert.equal(event.value,'{…}');assert.equal(mapped.value,input.value||'""');
    assert.equal(a.value,mapped.value);assert.equal(b.value,mapped.value);near(a.at,b.at);
    const transformed=c.snapshot(input.arrival+.75*.6).tokens.find(t=>t.phase==='transform');
    assert.equal(transformed.value,mapped.value);
    const split=c.snapshot(mapped.at+.6+.6*.7).tokens.filter(t=>t.phase==='split-out');
    assert.equal(split.length,2);assert.equal(split[0].value,split[1].value);assert.equal(split[0].color,split[1].color);
    const before=c.snapshot(a.at-.001),after=c.snapshot(a.at+.001);
    assert.equal(history(before,'A'),history(before,'B'));assert.equal(history(after,'A'),mapped.value);assert.equal(history(after,'B'),mapped.value);
  }
});

test('common lane tiles, ports, input, names and complete values fit both formats with deterministic seeking',async()=>{
  for(const format of ['4:3','16:9']) {
    const {scene,c,render}=await fixture(format),initial=c.snapshot(0);
    const geometry=f=>Array.from(f.nodes,n=>[n.id,n.x,n.top,n.w]);
    assert.equal(scene.playerClass,'rx-flat-tiles rx-query-source');
    for(const time of [0,1.7,3.4,5,scene.playback.stillTime,18,21.3,24.2,30]) {
      const f=c.snapshot(time),svg=render(f);
      assert.deepEqual(geometry(f),geometry(initial));
      for(const n of f.nodes) {
        assert.ok(n.x-n.w/2>=0&&n.x+n.w/2<=f.width,n.id);
        assert.ok(n.top>=0&&n.top+n.h<=f.height,n.id);
        assert.ok(n.defH>0&&n.rowH>0,'same header/runtime structure');
      }
      assert.doesNotMatch(svg,/NaN|Infinity|HTTP GET|data-inner-work|data-execution-row/);
      assert.match(svg,/data-readout="query-input"/);assert.match(svg,/podgląd query/);assert.match(svg,/wyszukiwarka/);
      assert.equal(render(c.snapshot(time)),svg);
    }
    const still=c.snapshot(scene.playback.stillTime);
    assert.equal(still.readouts[0].value,'angular');assert.equal(history(still,'A'),'angular');assert.equal(history(still,'B'),'angular');
    assert.match(render(still),/>angular<\/text>/,'full value is preserved');
  }
});

test('moving windows preserve typing, deliveries and colours with bounded event counts',async()=>{
  const {scene,compile,render}=await fixture();
  const a=compile(scene.live.variant(scene,{from:80,to:112})),b=compile(scene.live.variant(scene,{from:86,to:118}));
  for(const time of [86,90,95,100,110])assert.equal(render(a.snapshot(time)),render(b.snapshot(time)),String(time));
  const long=compile(scene.live.variant(scene,{from:1396,to:1428}));
  assert.ok(long.events.length<650);assert.doesNotMatch(render(long.snapshot(1400)),/NaN|Infinity/);
});

test('text badges grow with the value, keep a fixed font and stay inside receiver tiles during replacement',async()=>{
  const attr=(attributes,name)=>Number(attributes.match(new RegExp(`\\b${name}="([^"]+)"`))[1]);
  const badges=svg=>Array.from(svg.matchAll(/<g data-token="received"[^>]*><rect data-value-shape="pill"([^>]*)\/><text([^>]*)>([^<]*)<\/text><\/g>/g),
    m=>({x:attr(m[1],'x'),width:attr(m[1],'width'),font:attr(m[2],'font-size'),value:m[3]}));
  for(const format of ['4:3','16:9']) {
    const {scene,c,render}=await fixture(format);
    const first=c.events.find(e=>e.type==='deliver-next'&&e.edge==='share-A');
    const short=badges(render(c.snapshot(first.at+.35))),long=badges(render(c.snapshot(scene.playback.stillTime)));
    assert.equal(short.length,2);assert.equal(long.length,2);
    assert.ok(short.every(b=>b.value==='a'));assert.ok(long.every(b=>b.value==='angular'));
    assert.ok(long[0].width>short[0].width);assert.equal(long[0].font,short[0].font);assert.equal(long[0].font,30);
    for(let time=first.at;time<27;time+=.1)for(const badge of badges(render(c.snapshot(time)))) {
      assert.equal(badge.font,30);assert.ok(badge.x>=900&&badge.x+badge.width<=1220);
    }
  }
});

test('three manual steps reveal map/share and connect subscriptions, then live controls pause, navigate and reset',async()=>{
  const {scene,m}=await fixture(),h=await playbackHarness(),{deck,stage}=revealMock();
  const {player,controller}=h.create({scene,controls:{stageOptions:{onNavigate:d=>deck.navigation.push(d)}}});
  const binding=h.install(deck,{getController:()=>controller});binding.refresh();
  assert.equal(player.live.autoplay,false);h.advance(1000);assert.equal(player.time,0);assert.equal(h.frames.size,0);
  deck.press(39);h.advance(800);near(player.time,scene.playback.stops[0].time);assert.equal(player.isPlaying,false);assert.equal(deck.fragmentIndex,0);
  deck.press(39);h.advance(800);near(player.time,scene.playback.stops[1].time);assert.equal(player.isPlaying,false);assert.equal(deck.fragmentIndex,1);
  deck.press(39);h.advance(4500);assert.ok(player.time>5);assert.equal(player.isPlaying,true);assert.equal(deck.fragmentIndex,2);
  deck.press(32);const frozen=player.time;h.advance(1000);assert.equal(player.time,frozen);
  deck.press(32);h.advance(500);assert.ok(player.time>frozen);assert.equal(h.frames.size,1);
  deck.press(39);deck.press(34);assert.deepEqual(deck.navigation,[1,1]);
  deck.press(37);near(player.time,scene.playback.stops[1].time);assert.equal(player.isPlaying,false);assert.equal(deck.fragmentIndex,1);
  controller.reset();assert.equal(player.time,0);assert.equal(player.isPlaying,false);
  controller.suspend('slide');player.cleanup();controller.reset();assert.equal(h.frames.size,0);assert.equal(player.snapshot.readouts[0].value,'');
  controller.resume('slide');controller.toggle();h.advance(80000);assert.ok(player.time>79);assert.equal(h.frames.size,1);
  m['checkpoint-notes'].showNotesPreviewFrame(stage,player);
  near(player.time,scene.playback.stillTime);assert.equal(h.frames.size,0);assert.equal(history(player.snapshot,'A'),'angular');
  binding.destroy();
});

test('fast next completes each reveal before starting the following step, including the short subscription stage',async()=>{
  const {scene}=await fixture(),h=await playbackHarness(),navigation=[];
  const {player,controller}=h.create({scene,controls:{stageOptions:{onNavigate:d=>navigation.push(d)}}});
  controller.next();h.advance(100);controller.next();near(player.time,scene.playback.stops[0].time);assert.equal(player.isPlaying,false);
  controller.next();h.advance(100);controller.next();near(player.time,scene.playback.stops[1].time);assert.equal(player.isPlaying,false);
  controller.next();h.advance(100);controller.next();near(player.time,scene.live.start);assert.equal(player.isPlaying,true);
  assert.equal(player.snapshot.tokens.length,0);controller.next();assert.deepEqual(navigation,[1]);
});

test('exit cleanup finishes unsubscribe without RAF, drops in-flight values and reset restores the unconnected READY',async()=>{
  const {scene}=await fixture();
  for(const time of [0,.3,.8,1.3,1.6,5,15]) {
    const h=await playbackHarness(),{player,controller}=h.create({scene});
    player.seek(time);player.playContinuously();h.advance(100);
    controller.suspend('slide');player.cleanup();
    assert.equal(h.frames.size,0);assert.equal(player.isPlaying,false);assert.equal(player.live.state,'closed');
    assert.ok(player.snapshot.edges.every(e=>e.phase==='unsubscribe'&&e.done));assert.equal(player.snapshot.tokens.length,0);
    assert.ok(player.snapshot.nodes.every(n=>!(n.socketDots||[]).length));
    assert.ok(player.snapshot.nodes.every(n=>!n.active));
    assert.ok(player.snapshot.nodes.flatMap(n=>n.laneStates||[]).every(l=>l.state==='cancelled'));
    controller.reset();controller.resume('slide');
    assert.equal(player.time,0);assert.equal(player.isPlaying,false);assert.equal(h.frames.size,0);
    assert.equal(player.snapshot.readouts[0].value,'');assert.ok(player.snapshot.edges.every(e=>!e.visible));
    assert.equal(codeText(player.snapshot),"const query$ = fromEvent(inputEl, 'input')");
  }
});

test('code uses the player syntax and source/map/share marks with matching tile activity',async()=>{
  const {scene}=await fixture(),h=await playbackHarness(),{player,elements}=h.create({scene});
  assert.equal(scene.code,"const query$ = fromEvent(inputEl, 'input').pipe(\n  map(event => (event.target as HTMLInputElement).value.trim()),\n  share()\n);");
  for(const [time,id,node] of [[3,'source','source'],[3.8,'map','map'],[4.9,'share','share']]) {
    player.seek(time);const html=elements.get('.rx-code').innerHTML;
    assert.match(html,new RegExp(`rx-code-active[^>]*data-mark="${id}"`));
    assert.equal(player.snapshot.nodes.find(n=>n.id===node).active,true);
    assert.match(html,/rx-tok-src">fromEvent/);assert.match(html,/rx-tok-src">query\$/);
    assert.match(html,/rx-tok-op">map/);assert.match(html,/rx-tok-op">share/);
    assert.equal(html.replace(/<[^>]+>/g,'').replace(/&gt;/g,'>').replace(/&lt;/g,'<').replace(/&#39;/g,"'"),scene.code);
  }
});

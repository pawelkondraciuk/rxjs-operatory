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
    const geometry=f=>Array.from(f.nodes,n=>[n.id,n.x,n.y,n.w,n.h]);
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

test('existing live controls pause, reset, navigate immediately and show angular for print and Notes',async()=>{
  const {scene,m}=await fixture(),h=await playbackHarness(),{deck,stage}=revealMock();stage.markers=[];
  const {player,controller}=h.create({scene,controls:{stageOptions:{onNavigate:d=>deck.navigation.push(d)}}});
  const binding=h.install(deck,{getController:()=>controller});binding.refresh();
  assert.equal(player.live.autoplay,true);controller.toggle();h.advance(5000);assert.ok(player.time>4.9);
  deck.press(32);const frozen=player.time;h.advance(1000);assert.equal(player.time,frozen);
  deck.press(32);h.advance(500);assert.ok(player.time>frozen);assert.equal(h.frames.size,1);
  deck.press(39);deck.press(34);deck.press(37);assert.deepEqual(deck.navigation,[1,1,-1]);assert.equal(deck.fragmentIndex,-1);
  controller.reset();assert.equal(player.time,0);assert.equal(player.isPlaying,true);
  controller.suspend('slide');controller.reset();assert.equal(h.frames.size,0);assert.equal(player.snapshot.readouts[0].value,'');
  controller.resume('slide');controller.toggle();h.advance(80000);assert.ok(player.time>79);assert.equal(h.frames.size,1);
  m['checkpoint-notes'].showNotesPreviewFrame(stage,player);
  near(player.time,scene.playback.stillTime);assert.equal(h.frames.size,0);assert.equal(history(player.snapshot,'A'),'angular');
  binding.destroy();
});

test('code uses the player syntax and source/map/share marks with matching tile activity',async()=>{
  const {scene}=await fixture(),h=await playbackHarness(),{player,elements}=h.create({scene});
  for(const [time,id,node] of [[1,'source','source'],[1.8,'map','map'],[2.9,'share','share']]) {
    player.seek(time);const html=elements.get('.rx-code').innerHTML;
    assert.match(html,new RegExp(`rx-code-active[^>]*data-mark="${id}"`));
    assert.equal(player.snapshot.nodes.find(n=>n.id===node).active,true);
    assert.match(html,/rx-tok-src">fromEvent/);assert.match(html,/rx-tok-src">query\$/);
    assert.match(html,/rx-tok-op">map/);assert.match(html,/rx-tok-op">share/);assert.match(html,/rx-tok-type">HTMLInputElement/);
    assert.equal(html.replace(/<[^>]+>/g,'').replace(/&gt;/g,'>').replace(/&lt;/g,'<').replace(/&#39;/g,"'"),scene.code);
  }
});

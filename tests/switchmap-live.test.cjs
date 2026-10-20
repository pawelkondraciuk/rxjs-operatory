const {test}=require('node:test');
const assert=require('node:assert/strict');
const {modules,playbackHarness,revealMock}=require('./v2-harness.cjs');
async function fixture(format='4:3') {
  const m=await modules(['scene-config','engine','renderer','reference-scenes','checkpoint-notes']);
  const scene=m['scene-config'].configureScene({id:'12a-switchmap-live',format});
  const compile=scene=>m.engine.compileScene(scene),c=compile(scene);
  return {m,scene,c,compile,render:m.renderer.renderScene};
}
const metrics=f=>Array.from(f.metrics,m=>m.value);
const rows=f=>f.innerWorkPanels[0].rows;

test('continuous query input cancels each HTTP before starting the next, without results or complete',async()=>{
  const {scene,c}=await fixture();
  assert.equal(scene.code,'query$.pipe(\n  switchMap(query => httpGet(url(query)))\n)');
  assert.equal(c.stops.length,0);
  assert.deepEqual(metrics(c.snapshot(0)),[0,0,0]);
  assert.deepEqual(metrics(c.snapshot(1.2)),[1,1,1]);
  assert.deepEqual(metrics(c.snapshot(2.3)),[2,1,0]);
  assert.deepEqual(metrics(c.snapshot(2.8)),[2,2,1]);
  assert.equal(c.events.some(e=>['inner-next','stream-complete','stream-error'].includes(e.type)),false);
  for(let i=0;i<10;i++) {
    const run=scene.switchMapLiveRuns[i],next=scene.switchMapLiveRuns[i+1];
    const end=c.events.find(e=>e.type==='disconnected'&&e.edge==='inner-'+run.index);
    assert.ok(Math.abs(end.at-next.born)<1e-7);
    assert.equal(rows(c.snapshot(run.connected+.1)).at(-1).value,run.value);
  }
  const fifth=c.snapshot(scene.playback.stillTime);
  assert.deepEqual(Array.from(rows(fifth),r=>r.id),['#3','#4','#5']);
  assert.deepEqual(Array.from(rows(fifth),r=>r.state),['cancelled','cancelled','active']);
  assert.deepEqual(metrics(fifth),[5,5,1]);
  const sixth=c.snapshot(8.4);
  assert.equal(rows(sixth).at(-1).value,'r');
  assert.equal(rows(sixth).at(-1).id,'#6');
  assert.deepEqual(metrics(sixth),[6,6,1]);
});

test('three-row eviction never overlaps rows, preserves full queries and fits both formats',async()=>{
  for(const format of ['4:3','16:9']) {
    const {c,render}=await fixture(format);
    for(let t=0;t<=20;t+=.025) {
      const f=c.snapshot(t),p=f.innerWorkPanels[0],visible=rows(f);
      assert.ok(visible.length<=3);
      assert.ok(metrics(f)[2]<=1);
      for(let i=0;i<visible.length;i++) {
        assert.ok(visible[i].y>=p.dividerY,`${format}: ${t}`);
        assert.ok(visible[i].y+p.headerH+p.rowHeight<=f.height);
        if(i)assert.ok(visible[i].y-visible[i-1].y>=p.headerH+p.rowHeight-1e-7);
      }
    }
    for(const t of [4.7,4.9,5.05,5.2,7.3,8.4]) {
      const f=c.snapshot(t),svg=render(f),reduced=render(f,{reducedMotion:true});
      assert.ok((svg.match(/data-inner-work="/g)||[]).length<=3);
      assert.ok((reduced.match(/data-inner-work="/g)||[]).length<=3);
      assert.doesNotMatch(svg,/NaN|Infinity/);
      assert.equal(render(c.snapshot(t)),svg,'seeking is deterministic');
    }
    const html=render(c.snapshot(7.3));
    assert.match(html,/data-inner-ball="react"[^]*?>react<\/text>/);
    assert.match(html,/anulowane/);assert.match(html,/w trakcie/);assert.match(html,/× odłączono/);
    assert.match(html,/data-readout="query-input"/);
  }
});

test('compilation windows keep global counts and IDs with bounded model size and identical frames',async()=>{
  const {scene,compile,render}=await fixture();
  const variant=scene.live.variant;
  const a=compile(variant(scene,{from:14,to:44})),b=compile(variant(scene,{from:20,to:50}));
  assert.equal(render(a.snapshot(23)),render(b.snapshot(23)));
  const longScene=variant(scene,{from:1396,to:1426}),long=compile(longScene),f=long.snapshot(1400);
  assert.ok(longScene.switchMapLiveRuns.length<30);
  assert.ok(long.events.length<250);
  assert.ok(rows(f).every(r=>Number(r.id.slice(1))>990));
  assert.deepEqual(metrics(f),[1000,1000,1]);
  assert.doesNotMatch(render(f),/NaN|Infinity|inner #…/);
});

test('live playback navigates immediately, pauses, resets and provides a still frame without cancelling',async()=>{
  const {scene}=await fixture(),h=await playbackHarness(),navigation=[];
  const {player,controller}=h.create({scene,controls:{stageOptions:{onNavigate:d=>navigation.push(d)}}});
  assert.equal(player.live.autoplay,true);
  controller.toggle();h.advance(3200);
  assert.ok(player.time>3);
  assert.equal(h.frames.size,1);
  controller.next();controller.previous();
  assert.deepEqual(navigation,[1,-1]);
  controller.toggle();const time=player.time;h.advance(1500);assert.equal(player.time,time);
  controller.toggle();h.advance(500);assert.ok(player.time>time);
  controller.suspend('environment');h.advance(1000);assert.equal(h.frames.size,0);
  controller.resume('environment');assert.equal(h.frames.size,1);
  controller.suspend('slide');controller.reset();assert.equal(h.frames.size,0);
  assert.equal(player.time,0);
  controller.resume('slide');controller.toggle();h.advance(2000);
  controller.reset();assert.equal(player.time,0);assert.equal(player.isPlaying,true);
  player.finish();assert.equal(player.time,scene.playback.stillTime);assert.equal(player.isPlaying,false);
  assert.deepEqual(metrics(player.snapshot),[5,5,1]);
  assert.equal(player.snapshot.innerWorkPanels[0].rows.at(-1).state,'active');
});

test('Reveal uses no stage fragment for direct navigation; Notes selects the representative still',async()=>{
  const {scene,m}=await fixture(),h=await playbackHarness(),{deck,stage}=revealMock();stage.markers=[];
  const {player,controller}=h.create({scene,controls:{stageOptions:{onNavigate:d=>deck.navigation.push(d)}}});
  const binding=h.install(deck,{getController:()=>controller});binding.refresh();
  deck.press(39);deck.press(34);deck.press(37);assert.deepEqual(deck.navigation,[1,1,-1]);
  assert.equal(deck.fragmentIndex,-1);
  m['checkpoint-notes'].showNotesPreviewFrame(stage,player);
  assert.equal(player.time,scene.playback.stillTime);assert.equal(h.frames.size,0);
  binding.destroy();
});

test('code tokens coexist with operator and HTTP highlights throughout a live window',async()=>{
  const {scene}=await fixture(),h=await playbackHarness(),{player,elements}=h.create({scene});
  player.seek(2.3);
  let html=elements.get('.rx-code').innerHTML;
  assert.match(html,/rx-tok-src">query\$/);
  assert.match(html,/data-mark="switch"[^]*?rx-tok-op">switchMap/);
  assert.match(html,/data-mark="http"[^]*?rx-tok-src">httpGet/);
  assert.match(html,/rx-code-active[^>]*data-mark="switch"/);
  player.seek(2.9);html=elements.get('.rx-code').innerHTML;
  assert.match(html,/rx-code-active[^>]*data-mark="http"/);
  assert.equal(html.replace(/<[^>]+>/g,'').replace(/&gt;/g,'>'),scene.code);
});

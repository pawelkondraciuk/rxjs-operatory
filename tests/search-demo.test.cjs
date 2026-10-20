const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {modules,playbackHarness,revealMock}=require('./v2-harness.cjs');
async function fixture(format='16:9') {
  const m=await modules(['scene-config','search-demo','engine','renderer','checkpoint-notes']);
  const scene=m['scene-config'].configureScene({id:'12-intro-wyszukiwarka',format});
  const compiled=m.engine.compileScene(scene);
  return {scene,compiled,m,timeline:m['search-demo'].searchDemoTimeline(),panel:time=>compiled.snapshot(time).searchPanels[0]};
}

test('search types and erases four three-letter examples, updating results after 300 ms of silence',async()=>{
  const {timeline,compiled,panel}=await fixture();
  assert.deepEqual(Array.from(timeline.inputs,input=>input.query),[
    'r','re','rea','re','r','','a','an','ang','an','a','','v','vu','vue','vu','v','','s','sv','sve','sv','s','',
  ]);
  assert.equal(panel(0).query,'');assert.equal(panel(0).results.length,0);
  assert.deepEqual(Array.from(timeline.responses,response=>response.query),['rea','ang','vue','sve']);
  for(const response of timeline.responses) {
    const input=timeline.inputs.findLast(input=>input.at<response.at);
    assert.ok(Math.abs(response.at-input.at-.3)<1e-7);
    const before=panel(response.at-.001),after=panel(response.at+.2);
    assert.notDeepEqual(before.results.map(r=>r.label),after.results.map(r=>r.label));
    assert.equal(after.results.length,5);assert.equal(after.dropdownOpacity,1);
    for(const result of after.results) {
      assert.equal(result.matches.length,1);
      const {start,end}=result.matches[0];
      assert.equal(result.label.slice(start,end).toLowerCase(),response.query);
    }
  }
  assert.equal(panel(timeline.responses[0].at+.2).results[1].matches[0].start,1,'Preact matches inside its name');
  assert.equal(panel(timeline.responses[1].at+.2).results[4].matches[0].start,2,'RxAngular matches inside its name');
  assert.equal(compiled.events.filter(event=>event.type==='search-results'&&event.at<timeline.duration).length,4);
  assert.equal(compiled.events.some(event=>event.type==='subscribe'),false);
});

test('backspace shortens highlights immediately; empty input fades out the dropdown until a new response',async()=>{
  const {timeline,panel,m,compiled}=await fixture();
  for(const input of timeline.inputs.filter(input=>input.deleting)) {
    const before=panel(input.at-.001),after=panel(input.at+.001);
    assert.deepEqual(after.results.map(r=>r.label),before.results.map(r=>r.label));
    assert.equal(after.results.length,5);
    for(const result of after.results) {
      if(input.query) {
        assert.equal(result.matches.length,1);
        const {start,end}=result.matches[0];
        assert.equal(result.label.slice(start,end).toLowerCase(),input.query);
      }else assert.equal(result.matches.length,0);
    }
    if(input.query==='') {
      assert.ok(after.dropdownOpacity>0&&after.dropdownOpacity<1,'fade begins on clearing');
      assert.equal(panel(input.at+.2).dropdownOpacity,0);
      assert.doesNotMatch(m.renderer.renderScene(compiled.snapshot(input.at+.2)),/data-search-dropdown/);
      const nextResponse=timeline.responses.find(response=>response.at>input.at);
      if(nextResponse)assert.equal(panel(nextResponse.at-.001).dropdownOpacity,0,'old list does not reappear while typing');
    }else assert.equal(after.dropdownOpacity,1);
  }
});

test('autoplay repeats through bounded windows; arrows navigate, Space pauses, R restarts and F freezes the preview',async()=>{
  const {scene,m}=await fixture(),h=await playbackHarness(),{deck,stage}=revealMock();stage.markers=[];
  const {player,controller}=h.create({scene,controls:{stageOptions:{onNavigate:direction=>deck.navigation.push(direction)}}});
  const binding=h.install(deck,{getController:()=>controller});binding.refresh();
  assert.equal(player.live.autoplay,true);assert.equal(scene.playback.navigation,'slide');
  assert.equal(player.stops.length,0);
  controller.toggle();h.advance(1100);
  assert.equal(player.snapshot.searchPanels[0].query,'rea');assert.equal(player.snapshot.searchPanels[0].results.length,5);
  assert.equal(player.isPlaying,true);assert.equal(controller.mode,'manual');
  deck.press(32);const paused=player.time;h.advance(1000);assert.equal(player.time,paused);assert.equal(h.frames.size,0);
  deck.press(32);h.advance(80000);assert.ok(player.time>80);assert.equal(player.isPlaying,true);assert.equal(h.frames.size,1);
  deck.press(39);deck.press(34);deck.press(37);assert.deepEqual(deck.navigation,[1,1,-1]);
  controller.reset();assert.equal(player.time,0);assert.equal(player.isPlaying,true);
  deck.press(70);assert.equal(player.time,scene.playback.stillTime);assert.equal(player.isPlaying,false);assert.equal(h.frames.size,0);
  assert.equal(player.snapshot.searchPanels[0].query,'sve');assert.equal(player.snapshot.searchPanels[0].results.length,5);
  controller.suspend('slide');controller.reset();assert.equal(player.time,0);assert.equal(h.frames.size,0);
  m['checkpoint-notes'].showNotesPreviewFrame(stage,player);
  assert.equal(player.time,scene.playback.stillTime);assert.equal(player.snapshot.searchPanels[0].dropdownOpacity,1);assert.equal(h.frames.size,0);
  binding.destroy();
});

test('shared renderer fits the large panel and five results in both formats with deterministic looping snapshots',async()=>{
  for(const format of ['4:3','16:9']) {
    const {compiled,timeline,m,panel}=await fixture(format);
    const times=[0,...timeline.inputs.map(input=>input.at+.001),...timeline.responses.map(response=>response.at+.2),timeline.duration];
    const frames=times.map(time=>m.renderer.renderScene(compiled.snapshot(time)));
    for(let index=times.length-1;index>=0;index--) {
      const frame=compiled.snapshot(times[index]),p=panel(times[index]),svg=m.renderer.renderScene(frame);
      assert.equal(svg,frames[index]);
      assert.ok(p.x>=0&&p.x+p.w<=frame.width);assert.ok(p.y>=0&&p.y+p.h+7<=frame.height);
      assert.equal(frame.nodes.length,0);assert.equal(frame.edges.length,0);assert.equal(frame.code,'');
      assert.doesNotMatch(svg,/NaN|Infinity|query\$|HTTP GET|data-node=|<input|contenteditable/);
      assert.equal((svg.match(/data-search-result=/g)||[]).length,p.dropdownOpacity>0?p.results.length:0);
      if(p.results.length)assert.equal(p.results.length,5);
    }
    assert.match(m.renderer.renderScene(compiled.snapshot(timeline.responses[0].at+.2)),/P<tspan[^>]*>rea<\/tspan>ct/);
  }
  const {scene,m,timeline}=await fixture();
  const compile=m.engine.compileScene,variant=m['search-demo'].searchDemoVariant;
  const a=compile(variant(scene,{from:80,to:112})),b=compile(variant(scene,{from:86,to:118}));
  for(const time of [86,90,95,100,110])assert.equal(m.renderer.renderScene(a.snapshot(time)),m.renderer.renderScene(b.snapshot(time)));
  for(const time of [1.2,3.1,5.2,10.2,13.2,15.8]) {
    const original=a.snapshot(time).searchPanels[0],repeated=b.snapshot(time+timeline.duration*6).searchPanels[0];
    assert.equal(original.query,repeated.query);
    assert.deepEqual(original.results,repeated.results);
    assert.ok(Math.abs(original.dropdownOpacity-repeated.dropdownOpacity)<1e-9);
  }
  assert.ok(compile(variant(scene,{from:1396,to:1428})).events.length<100);
  const html=fs.readFileSync('index.html','utf8').match(/<section id="12-intro-wyszukiwarka"[\s\S]*?<\/section>/)[0];
  assert.match(html,/data-animation="12-intro-wyszukiwarka"/);
  assert.doesNotMatch(html,/<pre|<code|rx-search-block|rx-search-steps/);
});

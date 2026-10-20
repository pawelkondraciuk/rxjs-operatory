const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {modules,playbackHarness,revealMock}=require('./v2-harness.cjs');
async function fixture(format='4:3') {
  const m=await modules(['scene-config','engine','renderer','checkpoint-notes']);
  const scene=m['scene-config'].configureScene({id:'12b-debounce-switchmap',format});
  const compile=s=>m.engine.compileScene(s),c=compile(scene);
  return {m,scene,c,compile,render:m.renderer.renderScene};
}
const metrics=f=>Array.from(f.metrics,m=>m.value);
const rows=f=>f.innerWorkPanels[0].rows;
const timer=f=>f.nodes.find(n=>n.id==='debounce').laneStates[0].timer;
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} ≈ ${b}`);

test('subscribe travels left through the complete pipeline; typing resets 300 ms and creates no early HTTP',async()=>{
  const {scene,c}=await fixture(),run=scene.debounceSearchRuns[0],initial=c.snapshot(0);
  assert.deepEqual(metrics(initial),[0,0,0]);
  assert.equal(initial.readouts[0].value,'');
  assert.equal(rows(initial).length,0);
  assert.equal(c.stops.length,0);
  const subscribed=c.events.filter(e=>e.type==='subscribe'&&!e.edge.startsWith('inner'));
  assert.deepEqual(Array.from(subscribed,e=>e.edge),['op-observer','debounce-op','source-debounce']);
  assert.deepEqual(Array.from(subscribed,e=>e.at).sort((a,b)=>a-b),[.3,.8,1.3]);
  assert.ok(c.events.find(e=>e.type==='connected'&&e.edge==='source-debounce').at<run.input[0].at);
  for(let i=0;i<run.input.length;i++) {
    const v=run.input[i],f=c.snapshot(v.arrival+1e-6);
    assert.equal(f.readouts[0].value,v.value);
    assert.equal(timer(f).active,true);assert.equal(timer(f).text,'300 ms');near(timer(f).progress,1e-6/1.5);
    assert.deepEqual(metrics(f),[i+1,0,0]);assert.equal(rows(f).length,0);
    if(i) {
      near(v.at-run.input[i-1].at,.5);near(v.logicalAt-run.input[i-1].logicalAt,.1);
      assert.ok(timer(c.snapshot(v.arrival-.001)).progress>.3,'timer advanced before reset');
    }
  }
  const last=run.input.at(-1);
  near(run.output.logicalAt-last.logicalAt,.3);near(run.output.at-last.arrival,1.5);
  near(timer(c.snapshot(run.output.at-.001)).progress,1-.001/1.5);
  assert.equal(timer(c.snapshot(run.output.at+.001)).active,false);
  assert.equal(c.events.filter(e=>e.type==='source-next'&&e.edge==='debounce-op'&&e.at<=run.output.at+.001).length,1);
  assert.equal(c.events.filter(e=>e.type==='inner-create'&&e.at<run.output.arrival).length,0);
  assert.equal(c.events.filter(e=>e.type==='inner-subscribe'&&e.at<run.output.arrival).length,0);
});

test('silence releases repeated queries again; each inner succeeds without completing S1',async()=>{
  const {scene,c}=await fixture(),runs=scene.debounceSearchRuns;
  assert.deepEqual(Array.from(runs.slice(0,5),r=>r.value),['rea','rea','react','react','rea']);
  for(const run of runs.slice(0,4)) {
    const start=c.events.find(e=>e.type==='inner-subscribe'&&e.edge==='inner-'+run.index);
    near(start.at,run.connected);assert.ok(start.at>run.output.arrival);
    assert.equal(c.snapshot(run.output.at+.001).readouts[0].value,run.value);
    assert.ok(c.snapshot(run.connected+1).innerWorkPanels[0].rows.at(-1).stages[0].progress>0);
    const result=c.snapshot(run.completed+.001);
    assert.equal(rows(result).at(-1).state,'completed');
    assert.equal(rows(result).at(-1).receiver.state,'completed');
    const h=result.histories.find(h=>h.anchor==='observer');
    assert.equal(h.values.at(-1).value,run.value);
    assert.equal(result.nodes.find(n=>n.id==='observer').laneStates[0].state,'running');
    assert.equal(timer(result).active,false);
    assert.equal(metrics(result)[2],0);
  }
  const still=c.snapshot(scene.playback.stillTime);
  assert.deepEqual(metrics(still),[5,2,0]);
  assert.deepEqual(Array.from(rows(still),r=>[r.id,r.value,r.state]),[['#1','rea','completed'],['#2','rea','completed']]);
  assert.equal(still.readouts[0].value,'rea');
  assert.equal(c.events.some(e=>e.type==='stream-complete'&&!e.edge.startsWith('inner-')),false);
  assert.equal(c.events.some(e=>['inner-unsubscribe','stream-error'].includes(e.type)),false);
  assert.equal(c.events.filter(e=>e.type==='deliver-next'&&e.edge==='op-observer'&&e.at<=scene.playback.stillTime).length,2);
});

test('main geometry stays fixed; input, timer and three real HTTP rows fit both formats',async()=>{
  for(const format of ['4:3','16:9']) {
    const {scene,c,render}=await fixture(format),initial=c.snapshot(0);
    const geometry=f=>Array.from(f.nodes.filter(n=>['source','debounce','op','observer'].includes(n.id)),n=>[n.id,n.x,n.y,n.w,n.h]);
    for(let t=0;t<32;t+=.1) {
      const f=c.snapshot(t),p=f.innerWorkPanels[0],visible=rows(f);
      assert.deepEqual(geometry(f),geometry(initial));assert.ok(visible.length<=3);
      assert.ok(metrics(f)[2]<=1);
      visible.forEach((r,i)=>{
        assert.ok(r.y>=p.dividerY);assert.ok(r.y+p.headerH+p.rowHeight<=f.height);
        if(i)assert.ok(r.y-visible[i-1].y>=p.headerH+p.rowHeight-1e-7);
      });
    }
    const previous=(await fixture(format)).m['scene-config'].configureScene({id:'12a-switchmap-live',format});
    const prev=c.snapshot(0).readouts[0],old=previous.graph(previous).readouts[0];
    for(const key of ['id','w','h','font','fill','stroke','cursor'])assert.equal(prev[key],old[key],key);
    for(const t of [0,3.7,4.5,6.5,9.4,scene.playback.stillTime,28.4,31]) {
      const f=c.snapshot(t),svg=render(f);
      assert.doesNotMatch(svg,/NaN|Infinity|POMINIĘTE|anulowane|inner #…/);
      assert.match(svg,/data-readout="query-input"/);
      assert.ok((svg.match(/data-inner-work="/g)||[]).length<=3);
      assert.equal(svg,render(c.snapshot(t)),'deterministic seeking');
      assert.doesNotMatch(render(f,{reducedMotion:true}),/NaN|Infinity/);
    }
  }
});

test('window shifts preserve counters, timer, history and global IDs with bounded model size',async()=>{
  const {scene,compile,render}=await fixture(),variant=scene.live.variant;
  const a=compile(variant(scene,{from:40,to:72})),b=compile(variant(scene,{from:46,to:78}));
  for(const t of [46,50,54,60])assert.equal(render(a.snapshot(t)),render(b.snapshot(t)),String(t));
  const oldSize=variant(scene,{from:40,to:72}),long=variant(scene,{from:1396,to:1428}),c=compile(long),f=c.snapshot(1400);
  assert.ok(long.debounceSearchRuns.length<=oldSize.debounceSearchRuns.length+1);
  assert.ok(c.events.length<250);assert.ok(metrics(f)[0]>400);assert.ok(metrics(f)[1]>200);
  assert.ok(rows(f).every(r=>Number(r.id.slice(1))>190));
  const h=await playbackHarness(),{player,controller}=h.create({scene});
  controller.toggle();h.advance(80000);assert.ok(player.time>79,'does not loop or finish at first window');
  assert.equal(h.frames.size,1);assert.ok(metrics(player.snapshot)[1]>10);
});

test('live navigation, pause, restart, reentry and Notes use existing controls',async()=>{
  const {scene,m}=await fixture(),h=await playbackHarness(),{deck,stage}=revealMock();stage.markers=[];
  const {player,controller}=h.create({scene,controls:{stageOptions:{onNavigate:d=>deck.navigation.push(d)}}});
  assert.equal(player.live.autoplay,true);
  const binding=h.install(deck,{getController:()=>controller});binding.refresh();
  controller.toggle();h.advance(4400);assert.ok(player.time>4);assert.equal(h.frames.size,1);
  deck.press(32);const frozen=player.time;h.advance(1000);assert.equal(player.time,frozen);
  deck.press(32);h.advance(1000);assert.ok(player.time>frozen);
  deck.press(39);deck.press(34);deck.press(37);assert.deepEqual(deck.navigation,[1,1,-1]);assert.equal(deck.fragmentIndex,-1);
  controller.suspend('environment');h.advance(1000);assert.equal(h.frames.size,0);
  controller.resume('environment');assert.equal(h.frames.size,1);
  controller.reset();assert.equal(player.time,0);assert.equal(player.isPlaying,true);
  controller.suspend('slide');controller.reset();assert.equal(h.frames.size,0);
  assert.deepEqual(metrics(player.snapshot),[0,0,0]);assert.equal(player.snapshot.readouts[0].value,'');
  controller.resume('slide');controller.toggle();h.advance(1000);assert.equal(h.frames.size,1);
  m['checkpoint-notes'].showNotesPreviewFrame(stage,player);
  near(player.time,scene.playback.stillTime);assert.equal(h.frames.size,0);
  assert.deepEqual(metrics(player.snapshot),[5,2,0]);
  binding.destroy();
});

test('three code lines retain syntax, semantic marks and matching activity',async()=>{
  const {scene}=await fixture(),h=await playbackHarness(),{player,elements}=h.create({scene});
  assert.equal(scene.code.split('\n').length,3);assert.ok(scene.code.endsWith('))))'));
  for(const [time,mark,node] of [[2.4,'query','source'],[4,'debounce','debounce'],[5.4,'debounce','debounce'],
    [5.7,'switch','op'],[6.5,'http',null],[8.7,'switch','op']]) {
    player.seek(time);const html=elements.get('.rx-code').innerHTML;
    assert.match(html,new RegExp('rx-code-active[^>]*data-mark="'+mark+'"'));
    assert.match(html,/rx-tok-src">query\$/);assert.match(html,/rx-tok-op">debounceTime/);
    assert.match(html,/rx-tok-op">switchMap/);assert.match(html,/rx-tok-src">httpGet/);assert.match(html,/rx-tok-param">query/);
    assert.equal(html.replace(/<[^>]+>/g,'').replace(/&gt;/g,'>'),scene.code);
    if(node)assert.equal(player.snapshot.nodes.find(n=>n.id===node).active,true);
  }
  const html=fs.readFileSync('index.html','utf8');
  const notes=html.match(/<section id="12b-debounce-switchmap"[^]*?<\/section>/)[0];
  assert.match(notes,/5×/);assert.match(notes,/HTTP #2/);assert.match(notes,/po debounceTime, przed switchMap/);
});

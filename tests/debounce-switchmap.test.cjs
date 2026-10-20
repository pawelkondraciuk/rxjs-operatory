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
const lane=(f,id)=>f.nodes.find(n=>n.id===id).laneStates[0];
const timer=f=>lane(f,'debounce')?.timer;
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} ≈ ${b}`);

test('subscription travels left; input resets 300 ms; only silence creates HTTP',async()=>{
  const {scene,c}=await fixture(),runs=scene.debounceSearchRuns.slice(0,6),initial=c.snapshot(0);
  assert.deepEqual(metrics(initial),[0,0,0]);assert.equal(initial.readouts[0].value,'');assert.equal(rows(initial).length,0);
  const subscribed=c.events.filter(e=>e.type==='subscribe'&&!e.edge.startsWith('inner'));
  assert.deepEqual(Array.from(subscribed,e=>e.edge),['op-observer','debounce-op','source-debounce']);
  assert.deepEqual(Array.from(subscribed,e=>e.at).sort((a,b)=>a-b),[.3,.8,1.3]);
  assert.deepEqual(metrics(c.snapshot(c.stops[0].time)),[0,0,0]);assert.equal(timer(c.snapshot(1.95)).text,'');
  let emitted=0;
  for(const run of runs) {
    for(let i=0;i<run.input.length;i++) {
      const v=run.input[i],f=c.snapshot(v.arrival+1e-6);
      assert.equal(f.readouts[0].value,v.value);assert.equal(timer(f).active,true);
      assert.equal(timer(f).text,'300 ms');near(timer(f).progress,1e-6/1.5);assert.equal(metrics(f)[0],++emitted);
      if(i) {
        near(v.at-run.input[i-1].at,.5);near(v.logicalAt-run.input[i-1].logicalAt,.1);
        assert.ok(timer(c.snapshot(v.arrival-.001)).progress>.3,'timer advanced before reset');
      }
    }
    const last=run.input.at(-1);
    near(run.output.logicalAt-last.logicalAt,.3);near(run.output.at-last.arrival,1.5);
    near(timer(c.snapshot(run.output.at-.001)).progress,1-.001/1.5);
    assert.equal(timer(c.snapshot(run.output.at+.001)).active,false);assert.equal(timer(c.snapshot(run.output.at+.001)).text,'');
    assert.equal(c.events.filter(e=>e.type==='inner-create'&&e.at<run.output.arrival).length,run.index);
  }
  assert.equal(emitted,14);
  assert.deepEqual(Array.from(runs,r=>Array.from(r.input,v=>v.value)),[['r','re','rea'],['reac','react'],['reac','rea'],['re','r'],['a','an','ang'],['an','a']]);
  assert.deepEqual(Array.from(c.events.filter(e=>e.type==='source-next'&&e.edge==='debounce-op').slice(0,6),e=>e.value),['rea','react','rea','r','ang','a']);
  assert.ok(c.events.some(e=>e.type==='inner-subscribe'&&e.edge==='inner-1'));
});

test('typing during HTTP #1 does not cancel it; only the debounced react makes switchMap unsubscribe it and start HTTP #2',async()=>{
  const {scene,c}=await fixture(),[first,second]=scene.debounceSearchRuns,stop=id=>c.stops.find(s=>s.id===id).time;
  assert.equal(first.value,'rea');assert.equal(second.value,'react');assert.equal(first.cancelled,true);
  // Postój typing: react wpisane i w pamięci debounce, timer odlicza, HTTP #1 nadal trwa.
  const typing=c.snapshot(stop('typing'));
  assert.equal(typing.readouts[0].value,'react');assert.equal(timer(typing).active,true);assert.equal(lane(typing,'debounce').memory.value,'react');
  assert.deepEqual(Array.from(rows(typing),r=>[r.id,r.value,r.state]),[['#1','rea','active']]);
  assert.ok(rows(typing)[0].stages[0].progress>.2&&rows(typing)[0].stages[0].progress<.8);
  assert.deepEqual(metrics(typing),[5,1,1]);
  // Każdy klawisz przed emisją z debounceTime: HTTP #1 nadal aktywny.
  for(const v of second.input)assert.equal(rows(c.snapshot(v.arrival+.01))[0].state,'active',v.value);
  const unsubscribe=c.events.find(e=>e.type==='inner-unsubscribe'&&e.edge==='inner-0');
  const arrived=c.events.find(e=>e.type==='deliver-next'&&e.edge==='debounce-op'&&e.value==='react');
  near(unsubscribe.at,arrived.at);
  assert.ok(c.events.find(e=>e.type==='inner-create'&&e.node==='inner1').at>=unsubscribe.at+.4-1e-9,'nowy inner po unsubscribe');
  assert.equal(c.events.some(e=>['inner-next','stream-complete'].includes(e.type)&&e.edge==='inner-0'),false,'anulowany HTTP bez wyniku i complete');
  const switched=c.snapshot(stop('switched'));
  assert.deepEqual(Array.from(rows(switched),r=>[r.id,r.value,r.state]),[['#1','rea','cancelled'],['#2','react','active']]);
  assert.equal(rows(switched)[0].receiver.state,'cancelled');assert.ok(rows(switched)[0].stages[0].progress<1);
  assert.deepEqual(metrics(switched),[5,2,1]);
  const done=c.snapshot(stop('complete-2'));
  assert.equal(rows(done)[1].state,'completed');assert.equal(done.histories.find(h=>h.anchor==='observer').values.at(-1).value,'[#2]');
  assert.equal(lane(done,'observer').state,'running');
});

test('successful HTTP requests complete while the main subscription keeps running; typing overlaps work',async()=>{
  const {scene,c}=await fixture(),runs=scene.debounceSearchRuns;
  for(let i=1;i<6;i++) {
    const run=runs[i],next=runs[i+1];near(next.input[0].at,run.connected+1);
    const f=c.snapshot(next.input[0].arrival+.001);
    assert.equal(f.executionCounts.active,1);assert.equal(f.executions.find(e=>e.id===run.id).state,'running');
    assert.ok(run.completed<next.output.at,'inner complete before next debounce release');
    const finished=c.snapshot(run.completed+.15);
    assert.equal(timer(finished).active,true);
    assert.equal(rows(finished).find(r=>r.id===run.id).state,'completed');
    assert.equal(rows(finished).find(r=>r.id===run.id).receiver.state,'completed');
    assert.equal(finished.histories.find(h=>h.anchor==='observer').values.at(-1).value,'['+run.id+']');
    assert.equal(lane(finished,'observer').state,'running');
    const pulse=rows(c.snapshot(run.complete+.1)).find(r=>r.id===run.id).wires[0].pulse;
    assert.equal(pulse.color,'#26804E');
  }
  assert.equal(c.events.some(e=>['stream-error','http-error','input-unobserved'].includes(e.type)),false);
  assert.equal(c.events.some(e=>e.type==='stream-complete'&&!e.edge.startsWith('inner-')),false);
  // Jedyne unsubscribe innera to anulowanie długiego rea przez react (w każdym cyklu).
  for(const r of [...c.plan.records.values()].filter(r=>r.gateWork)){
    const run=runs.find(x=>'inner-'+x.index===r.id);
    assert.equal(r.end.kind,run.cancelled?'unsubscribe':'complete',r.id);
    if(run.cancelled)assert.equal(run.value,'rea');
  }
  const still=c.snapshot(scene.playback.stillTime);
  assert.deepEqual(metrics(still),[9,3,0]);assert.equal(still.readouts[0].value,'r');
  assert.deepEqual(Array.from(rows(still),r=>[r.id,r.value,r.state]),[['#1','rea','cancelled'],['#2','react','completed'],['#3','rea','completed']]);
  assert.equal(timer(still).active,true);assert.equal(lane(still,'debounce').memory.value,'r');
  assert.equal(still.histories.find(h=>h.anchor==='observer').values.at(-1).value,'[#3]');
});

test('geometry and labels: three real rows, no S1 at the receiver, no idle dash; both formats rewind deterministically',async()=>{
  for(const format of ['4:3','16:9']) {
    const {scene,c,render,compile,m}=await fixture(format),initial=c.snapshot(0);
    const geometry=f=>Array.from(f.nodes.filter(n=>['source','debounce','op','observer'].includes(n.id)),n=>[n.id,n.x,n.y,n.w,n.h]);
    for(let t=0;t<c.duration;t+=.1) {
      const f=c.snapshot(t),p=f.innerWorkPanels[0],visible=rows(f);
      assert.deepEqual(geometry(f),geometry(initial));assert.ok(visible.length<=3);assert.ok(metrics(f)[2]<=1);
      if(timer(f)&&!timer(f).active)assert.equal(timer(f).text,'');
      visible.forEach((r,i)=>{
        assert.ok(r.y>=p.dividerY);assert.ok(r.y+p.headerH+p.rowHeight<=f.height);
        if(i)assert.ok(r.y-visible[i-1].y>=p.headerH+p.rowHeight-1e-7);
      });
    }
    const previous=m['scene-config'].configureScene({id:'12a-switchmap-live',format});
    const input=initial.readouts[0],old=previous.graph(previous).readouts[0];
    for(const key of ['id','w','h','font','fill','stroke','cursor'])assert.equal(input[key],old[key],key);
    for(const t of [0,...c.stops.map(s=>s.time),scene.playback.stillTime,31].reverse()) {
      const f=c.snapshot(t),svg=render(f);assert.doesNotMatch(svg,/NaN|Infinity|POMINIĘTE|inner #…|>S1<|>—</);
      assert.equal(f.nodes.find(n=>n.id==='observer').inbox.label,'');
      assert.match(svg,/data-readout="query-input"/);assert.ok((svg.match(/data-inner-work="/g)||[]).length<=3);
      assert.equal(svg,render(compile(scene).snapshot(t)));
      assert.doesNotMatch(render(f,{reducedMotion:true}),/NaN|Infinity|>S1<|>—</);
    }
  }
});

test('bounded live windows keep global query, HTTP IDs, metrics and history through repeat boundaries',async()=>{
  const {scene,compile,render}=await fixture(),variant=scene.live.variant;
  const a=compile(variant(scene,{from:40,to:72})),b=compile(variant(scene,{from:46,to:78}));
  for(const t of [46,50,54,60,65])assert.equal(render(a.snapshot(t)),render(b.snapshot(t)),String(t));
  const broad=compile(variant(scene,{from:0,to:120})),small=compile(variant(scene,{from:80,to:120}));
  for(const t of [80,90,103,115]) {
    assert.deepEqual(metrics(small.snapshot(t)),metrics(broad.snapshot(t)));
    assert.equal(small.snapshot(t).readouts[0].value,broad.snapshot(t).readouts[0].value);
    assert.deepEqual(Array.from(rows(small.snapshot(t)),r=>[r.id,r.value,r.state]),Array.from(rows(broad.snapshot(t)),r=>[r.id,r.value,r.state]));
  }
  const old=variant(scene,{from:1396,to:1428}),c=compile(old),f=c.snapshot(1400);
  assert.ok(old.debounceSearchRuns.length<16);assert.ok(c.events.length<350);
  assert.ok(metrics(f)[0]>700);assert.ok(metrics(f)[1]>250);assert.ok(rows(f).every(r=>Number(r.id.slice(1))>250));
  assert.equal(c.events.some(e=>e.type==='stream-error'),false);
  for(const e of c.events.filter(e=>e.type==='inner-unsubscribe'))assert.equal(old.debounceSearchRuns.find(r=>'inner-'+r.index===e.edge).value,'rea');
  for(const run of old.debounceSearchRuns.filter(r=>r.connected<=1400&&!r.cancelled)) {
    assert.equal(c.events.find(e=>e.type==='inner-next'&&e.execution===run.id).value,'['+run.id+']');
  }
});

test('manual stages end at the third emission; live runs without stopping and right immediately navigates',async()=>{
  const {scene,c,m}=await fixture(),h=await playbackHarness(),{deck,stage}=revealMock();stage.markers=[];
  const {player,controller}=h.create({scene,controls:{stageOptions:{onNavigate:d=>deck.navigation.push(d)}}});
  assert.equal(player.live.autoplay,false);assert.equal(player.isPlaying,false);assert.equal(controller.mode,'manual');
  const binding=h.install(deck,{getController:()=>controller});binding.refresh();
  assert.deepEqual(Array.from(c.stops,s=>s.id),['subscribed','buffered','request-1','typing','switched','complete-2','request-3']);
  near(c.stops.at(-1).time,scene.live.start);
  for(const stop of c.stops.slice(0,-1)) {
    deck.press(39);h.advance(100);assert.equal(player.isPlaying,true);
    deck.press(39);near(player.time,stop.time);assert.equal(player.isPlaying,false);
    assert.equal(h.frames.size,0);assert.deepEqual(deck.navigation,[]);
    h.advance(1000);near(player.time,stop.time);
  }
  deck.press(39);h.advance(200);assert.equal(player.isPlaying,true);assert.ok(player.time<scene.live.start);
  deck.press(39);near(player.time,scene.live.start);assert.equal(player.isPlaying,true);assert.deepEqual(deck.navigation,[]);
  h.advance(60000);assert.ok(player.time>70);assert.equal(player.isPlaying,true);assert.equal(h.frames.size,1);
  assert.ok(metrics(player.snapshot)[1]>12);
  deck.press(32);const paused=player.time;h.advance(1000);near(player.time,paused);
  deck.press(39);deck.press(34);assert.deepEqual(deck.navigation,[1,1]);
  deck.press(37);near(player.time,c.stops.at(-2).time);assert.equal(player.isPlaying,false);
  deck.press(39);h.advance(2000);assert.ok(player.time>scene.live.start);assert.equal(player.isPlaying,true);
  controller.suspend('environment');assert.equal(h.frames.size,0);controller.resume('environment');assert.equal(h.frames.size,1);
  controller.suspend('slide');controller.reset();controller.resume('slide');
  assert.equal(player.time,0);assert.equal(player.isPlaying,false);assert.deepEqual(metrics(player.snapshot),[0,0,0]);
  controller.next();h.advance(100);controller.reset();assert.equal(player.time,0);assert.equal(h.frames.size,0);
  m['checkpoint-notes'].showNotesPreviewFrame(stage,player);near(player.time,scene.playback.stillTime);
  assert.equal(h.frames.size,0);assert.deepEqual(metrics(player.snapshot),[9,3,0]);
  deck.press(39);assert.deepEqual(deck.navigation,[1,1,1]);binding.destroy();
});

test('AUTO passes through the intro and keeps running; still preview and reset remain stable',async()=>{
  const {scene}=await fixture(),h=await playbackHarness(),{player,controller}=h.create({scene});
  controller.setMode('auto');h.advance(45000);assert.ok(player.time>44);assert.equal(player.isPlaying,true);
  const n=metrics(player.snapshot)[1];h.advance(6000);assert.ok(metrics(player.snapshot)[1]>n);
  assert.equal(h.frames.size,1);controller.finish();near(player.time,scene.playback.stillTime);assert.equal(h.frames.size,0);
  assert.deepEqual(metrics(player.snapshot),[9,3,0]);controller.reset();assert.equal(player.time,0);assert.equal(h.frames.size,0);
});

test('three code lines retain syntax and simultaneous highlights; notes describe only the intro and live',async()=>{
  const {scene,c}=await fixture(),h=await playbackHarness(),{player,elements}=h.create({scene});
  assert.equal(scene.code.split('\n').length,3);assert.ok(scene.code.endsWith('))))'));
  for(const [time,mark,node] of [[2.4,'query','source'],[4,'debounce','debounce'],[5.4,'debounce','debounce'],
    [5.7,'switch','op'],[6.5,'http',null],[10,'switch','op'],[8.05,'debounce','debounce']]) {
    player.seek(time);const html=elements.get('.rx-code').innerHTML;
    assert.match(html,new RegExp('rx-code-active[^>]*data-mark="'+mark+'"'));
    assert.match(html,/rx-tok-src">query\$/);assert.match(html,/rx-tok-op">debounceTime/);assert.match(html,/rx-tok-op">switchMap/);
    assert.match(html,/rx-tok-src">httpGet/);assert.match(html,/rx-tok-param">query/);
    assert.equal(html.replace(/<[^>]+>/g,'').replace(/&gt;/g,'>'),scene.code);
    if(node)assert.equal(player.snapshot.nodes.find(n=>n.id===node).active,true);
    if(time===8.05)assert.match(html,/rx-code-active[^>]*data-mark="http"/);
  }
  const section=fs.readFileSync('index.html','utf8').match(/<section id="12b-debounce-switchmap"[^]*?<\/section>/)[0];
  assert.match(section,/class="animation-slide rx-debounce-search-slide"/);assert.doesNotMatch(section,/rx-slide-navigation/);
  for(const key of ['ready',...Array.from(c.stops,s=>s.id),'finished'])assert.ok(section.includes(`data-checkpoint="${key}"`),key);
  assert.doesNotMatch(section,/failed-input|HTTP #6.*bł|Wolniejszy HTTP|data-checkpoint="cancel/);
  assert.match(section,/5×/);assert.match(section,/po debounceTime, przed switchMap/);
});

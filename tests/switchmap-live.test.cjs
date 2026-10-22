const {slideNotes}=require('./slide-notes.cjs');
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {modules,playbackHarness,revealMock}=require('./v2-harness.cjs');
async function fixture(format='4:3') {
  const m=await modules(['scene-config','engine','renderer','reference-scenes','checkpoint-notes']);
  const scene=m['scene-config'].configureScene({id:'12a-switchmap-live',format});
  const compile=scene=>m.engine.compileScene(scene),c=compile(scene);
  return {m,scene,c,compile,render:m.renderer.renderScene};
}
const metrics=f=>Array.from(f.metrics,m=>m.value);
const rows=f=>f.innerWorkPanels[0].rows;
const code=f=>f.codeView.map(line=>line.map(part=>part.text).join('')).join('\n');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} ≈ ${b}`);

test('READY asks for the operator; the reveal changes code and tile together without starting any HTTP',async()=>{
  const {scene,c,render}=await fixture(),ready=c.snapshot(0),reveal=c.snapshot(scene.playback.startOnNext);
  assert.equal(scene.title,'Wybór operatora');
  assert.equal(code(ready),'query$.pipe(\n           (query => httpGet(url(query)))\n)');
  assert.equal(ready.code,code(ready));assert.equal(ready.nodes.find(n=>n.id==='op').label,'');
  assert.equal(ready.codeView[1][1].text.trim(),'');assert.ok(ready.codeView[1][1].mark.bg);
  assert.equal(ready.readouts[0].value,'');assert.deepEqual(metrics(ready),[0,0,0]);
  assert.equal(rows(ready).length,0);assert.equal(ready.tokens.length,0);
  assert.doesNotMatch(render(ready),/switchMap|>S1<|>\?</);
  assert.ok(ready.nodes.filter(n=>['source','op','observer'].includes(n.id)).every(n=>n.laneRows.length===1));
  assert.equal(code(reveal),'query$.pipe(\n  switchMap(query => httpGet(url(query)))\n)');
  assert.equal(reveal.code,code(reveal));assert.equal(reveal.nodes.find(n=>n.id==='op').label,'switchMap');
  assert.equal(reveal.codeView[1][1].active,true);assert.deepEqual(metrics(reveal),[0,0,0]);
  assert.deepEqual(Array.from(c.stops,s=>s.id),['revealed','finished']);
});

test('three queries cancel r/re and complete rea, delivering its result before inner complete without closing the outer pipeline',async()=>{
  const {scene,c}=await fixture(),runs=scene.switchMapLiveRuns;
  assert.equal(scene.live,undefined);
  assert.deepEqual(Array.from(runs,r=>[r.value,r.cancelled]),[['r',true],['re',true],['rea',false]]);
  assert.equal(c.events.filter(e=>e.type==='source-next'&&e.edge==='source-op').length,3);
  for(const run of runs) {
    const edge='inner-'+run.index,next=runs[run.index+1];
    const started=c.events.find(e=>e.type==='inner-subscribe'&&e.edge===edge);
    const end=c.events.find(e=>e.type==='disconnected'&&e.edge===edge);
    near(started.at,run.connected);near(end.at,run.completed);
    const active=c.snapshot(run.connected+.1);
    assert.equal(rows(active).at(-1).value,run.value);assert.equal(metrics(active)[2],1);
    if(run.cancelled) {
      near(end.at,next.born);
      assert.ok(c.events.some(e=>e.type==='inner-unsubscribe'&&e.edge===edge));
      assert.equal(c.events.some(e=>['inner-next','deliver-next','stream-complete'].includes(e.type)&&e.edge===edge),false);
      const cancelled=rows(c.snapshot(run.completed+.01)).find(r=>r.id===run.id);
      assert.equal(cancelled.state,'cancelled');assert.equal(cancelled.receiver.state,'cancelled');
      assert.ok(cancelled.stages[0].progress<1);
    } else {
      const delivered=c.events.find(e=>e.type==='deliver-next'&&e.edge==='op-observer'&&e.value==='['+run.id+']'&&Math.abs(e.at-run.received)<1e-7);
      assert.ok(delivered);assert.ok(delivered.at<end.at);
      const before=c.snapshot(run.received-.001),after=c.snapshot(run.completed+.001);
      assert.equal(before.histories[0].values.some(v=>Math.abs(v.arrival-run.received)<1e-7),false);
      assert.equal(after.histories[0].values.at(-1).value,'['+run.id+']');
      assert.equal(rows(after).at(-1).receiver.value,'['+run.id+']');
      assert.equal(rows(after).at(-1).state,'completed');
      assert.equal(rows(after).at(-1).receiver.state,'completed');assert.equal(metrics(after)[2],0);
      assert.equal(after.nodes.find(n=>n.id==='observer').laneStates[0].state,'running');
    }
  }
  assert.equal(c.events.some(e=>e.type==='stream-complete'&&!e.edge.startsWith('inner-')),false);
  assert.equal(c.events.some(e=>e.type==='disconnected'&&!e.edge.startsWith('inner-')),false);
  assert.equal(c.events.some(e=>e.type==='stream-error'),false);
  near(c.duration,Math.max(runs[2].received,runs[2].completed)+.2);
  near(c.duration,scene.playback.stillTime);
  const still=c.snapshot(scene.playback.stillTime);
  assert.deepEqual(Array.from(rows(still),r=>[r.id,r.value,r.state]),[['#1','r','cancelled'],['#2','re','cancelled'],['#3','rea','completed']]);
  assert.deepEqual(metrics(still),[3,3,0]);assert.equal(still.histories[0].values.at(-1).value,'[#3]');assert.equal(still.readouts[0].value,'rea');
});

test('the QA repeating model still types and deletes rea, then ang, and keeps request IDs growing',async()=>{
  const {scene,compile,m}=await fixture(),long=m['reference-scenes'].switchMapLiveVariant(scene,{from:0,to:80}),c=compile(long),runs=long.switchMapLiveRuns;
  const cycle=['r','re','rea','re','r','a','an','ang','an','a'];
  assert.deepEqual(Array.from(runs.slice(0,22),r=>r.value),[...cycle,...cycle,'r','re']);
  runs.slice(0,22).forEach((run,i)=>{
    assert.equal(run.id,'#'+(i+1));assert.equal(c.snapshot(run.emitted+.001).readouts[0].value,run.value);
    assert.equal(metrics(c.snapshot(run.emitted+.001))[0],i+1);
    assert.ok(!i||run.value!==runs[i-1].value,'no duplicate at the cycle boundary');
  });
});

test('three visible executions preserve ordering, full queries and stable main geometry in both formats',async()=>{
  for(const format of ['4:3','16:9']) {
    const {scene,c,render}=await fixture(format);
    const geometry=f=>Array.from(f.nodes.filter(n=>['source','op','observer'].includes(n.id)),n=>[n.id,n.x,n.y,n.w,n.h]);
    for(let t=0;t<=c.duration;t+=.025) {
      const f=c.snapshot(t),p=f.innerWorkPanels[0],visible=rows(f);
      assert.deepEqual(geometry(f),geometry(c.snapshot(0)));assert.ok(visible.length<=3);
      assert.ok(metrics(f)[2]<=1);
      for(let i=0;i<visible.length;i++) {
        assert.ok(visible[i].y>=p.dividerY,`${format}: ${t}`);
        assert.ok(visible[i].y+p.headerH+p.rowHeight<=f.height);
        if(i) {
          assert.ok(visible[i].y-visible[i-1].y>=p.headerH+p.rowHeight-1e-7);
          assert.ok(Number(visible[i].id.slice(1))>Number(visible[i-1].id.slice(1)));
        }
      }
    }
    for(const t of [0,.3,1.8,2.7,3.6,5.6,6.55,scene.playback.stillTime]) {
      const f=c.snapshot(t),svg=render(f),reduced=render(f,{reducedMotion:true});
      assert.ok((svg.match(/data-inner-work="/g)||[]).length<=3);
      assert.ok((reduced.match(/data-inner-work="/g)||[]).length<=3);
      assert.doesNotMatch(svg,/NaN|Infinity/);assert.equal(render(c.snapshot(t)),svg,'seeking is deterministic');
    }
    const html=render(c.snapshot(scene.playback.stillTime));
    assert.match(html,/data-inner-ball="rea"[^]*?>rea<\/text>/);
    assert.match(html,/anulowane/);assert.doesNotMatch(html,/w trakcie/);assert.match(html,/✓ complete/);
    assert.match(html,/data-readout="query-input"/);assert.match(html,/>wyniki<\/text>/);assert.doesNotMatch(html,/>S1</);
  }
});

test('QA moving compilation windows keep results, counts and IDs with a bounded model',async()=>{
  const {scene,compile,render,m}=await fixture(),variant=m['reference-scenes'].switchMapLiveVariant;
  const a=compile(variant(scene,{from:14,to:44})),b=compile(variant(scene,{from:20,to:50}));
  for(const t of [23,29,35,40])assert.equal(render(a.snapshot(t)),render(b.snapshot(t)),String(t));
  const longScene=variant(scene,{from:1396,to:1426}),long=compile(longScene),f=long.snapshot(1400);
  assert.ok(longScene.switchMapLiveRuns.length<25);assert.ok(long.events.length<300);
  assert.ok(rows(f).every(r=>Number(r.id.slice(1))>560));
  assert.deepEqual(metrics(f),[570,570,1]);
  assert.equal(f.histories[0].values.at(-1).value,'[#568]');
  assert.equal(rows(f).find(r=>r.id==='#568').receiver.value,'[#568]');assert.doesNotMatch(render(f),/NaN|Infinity|inner #…/);
});

test('first next starts three queries and automatically holds the result in manual and AUTO modes in both formats',async()=>{
  for(const format of ['4:3','16:9'])for(const mode of ['manual','auto']) {
    const {scene}=await fixture(format),h=await playbackHarness(),navigation=[];
    const {player,controller}=h.create({scene,controls:{stageOptions:{mode,onNavigate:d=>navigation.push(d)}}});
    h.advance(2000);assert.equal(player.time,0);assert.equal(h.frames.size,0);
    controller.next();assert.equal(player.time,scene.playback.startOnNext);assert.equal(player.isPlaying,true);
    assert.equal(player.snapshot.nodes.find(n=>n.id==='op').label,'switchMap');assert.equal(controller.mode,mode);
    h.advance(3200);assert.ok(player.time>3);assert.equal(h.frames.size,1);
    controller.toggle();const time=player.time;h.advance(1500);assert.equal(player.time,time);
    controller.toggle();h.advance(500);assert.ok(player.time>time);
    controller.suspend('environment');h.advance(1000);assert.equal(h.frames.size,0);
    controller.resume('environment');assert.equal(h.frames.size,1);
    h.advance(10000);assert.equal(player.state,'finished');assert.equal(h.frames.size,0);
    assert.equal(player.time,scene.playback.stillTime);assert.deepEqual(metrics(player.snapshot),[3,3,0]);
    assert.deepEqual(navigation,[]);
    const final=JSON.stringify(player.snapshot);h.advance(90000);assert.equal(JSON.stringify(player.snapshot),final);
    controller.toggle();assert.equal(player.state,'finished');assert.equal(h.frames.size,0);
    controller.next();controller.previous();assert.deepEqual(navigation,[1,-1]);
    controller.suspend('slide');controller.reset();controller.resume('slide');
    assert.equal(player.time,0);assert.equal(player.isPlaying,false);assert.equal(h.frames.size,0);
    assert.equal(player.snapshot.nodes.find(n=>n.id==='op').label,'');
    controller.toggle();assert.equal(player.time,scene.playback.startOnNext);h.advance(2000);
    controller.reset();assert.equal(player.time,0);assert.equal(player.isPlaying,false);
    player.finish();assert.equal(player.state,'finished');assert.deepEqual(metrics(player.snapshot),[3,3,0]);
  }
});

test('next during playback or pause shows the final three-query result before allowing navigation',async()=>{
  for(const paused of [false,true]) {
    const {scene}=await fixture(),h=await playbackHarness(),navigation=[];
    const {player,controller}=h.create({scene,controls:{stageOptions:{onNavigate:d=>navigation.push(d)}}});
    controller.next();if(paused){h.advance(1500);controller.toggle();}
    controller.next();assert.equal(player.state,'finished');assert.deepEqual(navigation,[]);
    assert.equal(player.time,scene.playback.stillTime);assert.deepEqual(metrics(player.snapshot),[3,3,0]);
    assert.equal(h.frames.size,0);controller.next();assert.deepEqual(navigation,[1]);
  }
});

test('Reveal fragments, pilot, Notes and restored hashes use the reveal and finished frames without a second RAF',async()=>{
  const {scene,m}=await fixture(),h=await playbackHarness(),{deck,stage}=revealMock();stage.markers=stage.markers.slice(0,2);
  const {player,controller}=h.create({scene,controls:{stageOptions:{onNavigate:d=>deck.navigation.push(d)}}});
  const binding=h.install(deck,{getController:()=>controller});binding.refresh();
  deck.navigateFragment(0);assert.equal(player.isPlaying,true);assert.equal(deck.fragmentIndex,0);
  assert.equal(player.time,scene.playback.startOnNext);assert.deepEqual(deck.navigation,[]);
  deck.navigateFragment(1);assert.equal(player.state,'finished');assert.equal(deck.fragmentIndex,1);
  assert.deepEqual(deck.navigation,[]);assert.equal(h.frames.size,0);
  deck.press(34);deck.press(37);assert.deepEqual(deck.navigation,[1,-1]);
  controller.reset();assert.equal(deck.fragmentIndex,-1);assert.equal(h.frames.size,0);
  deck.press(34);assert.equal(player.isPlaying,true);assert.equal(deck.fragmentIndex,0);
  deck.press(39);assert.equal(player.state,'finished');assert.equal(deck.fragmentIndex,1);
  controller.seekCheckpoint(scene.playback.startOnNext);assert.equal(player.isPlaying,false);
  assert.equal(player.snapshot.nodes.find(n=>n.id==='op').label,'switchMap');assert.equal(h.frames.size,0);
  controller.seekCheckpoint(scene.playback.stillTime);assert.equal(player.state,'finished');assert.equal(deck.fragmentIndex,1);
  controller.reset();deck.press(34);h.advance(10000);
  assert.equal(player.state,'finished');assert.equal(deck.fragmentIndex,1);assert.deepEqual(deck.navigation,[1,-1]);
  m['checkpoint-notes'].showNotesPreviewFrame(stage,player);
  assert.equal(player.time,scene.playback.stillTime);assert.equal(h.frames.size,0);
  assert.deepEqual(metrics(player.snapshot),[3,3,0]);
  binding.destroy();
});

test('code replacement keeps syntax colouring, strong switchMap emphasis and the reserved name width',async()=>{
  const {scene}=await fixture(),h=await playbackHarness(),{player,elements}=h.create({scene});
  let html=elements.get('.rx-code').innerHTML;
  assert.doesNotMatch(html,/switchMap|rx-code-active[^>]*data-mark="switch"/);
  assert.equal(player.snapshot.codeView[1][1].text.trim(),'');
  assert.match(html,/data-mark="switch"/);
  player.seek(scene.playback.startOnNext);html=elements.get('.rx-code').innerHTML;
  assert.match(html,/rx-tok-src">query\$/);assert.match(html,/data-mark="switch"[^]*?rx-tok-op">switchMap/);
  assert.match(html,/data-mark="http"[^]*?rx-tok-src">httpGet/);
  assert.match(html,/rx-code-active[^>]*data-mark="switch"/);
  player.seek(scene.switchMapLiveRuns[1].connected+.2);html=elements.get('.rx-code').innerHTML;
  assert.match(html,/rx-code-active[^>]*data-mark="http"/);
  assert.equal(html.replace(/<[^>]+>/g,'').replace(/&gt;/g,'>'),player.snapshot.code);
  const css=fs.readFileSync('animations/reveal.css','utf8');
  assert.match(css,/rx-operator-choice \[data-mark="switch"\][^}]*width:9ch/);
  const section=fs.readFileSync('index.html','utf8').split('<section id="12a-switchmap-live"')[1].split('</section>')[0];
   const notes=slideNotes('12a-switchmap-live');assert.match(notes,/Trzy requesty, jeden wynik/);assert.match(notes,/Aktualność ≠ ograniczenie częstotliwości/);
});


test('search HTTP responses identify their execution inside the array and input badges reuse the query$ style without shrinking long text',async()=>{
  for(const format of ['4:3','16:9']) {
    const {m,compile,render}=await fixture(format);
    const source=m['scene-config'].configureScene({id:'12-query-zrodlo',format});
    const reference=compile(source).snapshot(source.playback.stillTime).ball;
    for(const id of ['12a-switchmap-live','12b-debounce-switchmap']) {
      const scene=m['scene-config'].configureScene({id,format}),c=compile(scene);
      const ready=c.snapshot(0);
      for(const key of ['shape','r','font'])assert.equal(ready.ball[key],reference[key],id+': '+key);
      for(const event of c.events.filter(e=>e.type==='source-next')) {
        if(event.edge==='op-observer'||event.edge.startsWith('inner-'))assert.match(event.value,/^\[#\d+\]$/);
      }
      const runs=scene.switchMapLiveRuns||scene.debounceSearchRuns;
      const run=id==='12a-switchmap-live'?runs[2]:runs.find(r=>r.value==='ang');
      if(id==='12b-debounce-switchmap') {
        const sample=run.input.at(-1).arrival+.6;
        assert.ok(sample<c.duration);
        const f=c.snapshot(sample),node=f.nodes.find(n=>n.id==='debounce'),memory=node.laneStates[0].memory;
        const memoryLeft=memory.x-Math.max(f.ball.r*2,memory.value.length*f.ball.font*.6+28)/2;
        const timerX=node.x-node.w/2+node.laneTimer.textInset*f.textScale;
        const timerWidth=node.laneStates[0].timer.text.length*.74*22*f.textScale;
        assert.ok(timerX+timerWidth<memoryLeft,'the timer fits before the longest query badge');
        assert.equal(node.laneStates[0].label,'','no subscriber label behind the countdown');
      }
      const f=c.snapshot(run.connected+.5),panel=f.innerWorkPanels[0],svg=render(f);
      assert.equal(panel.ball.shape,'pill');assert.equal(panel.ball.font,reference.font);
      const row=panel.rows.find(r=>r.id===run.id);
      assert.equal(row.value,run.value);
      const width=Math.max(panel.ball.r*2,run.value.length*panel.ball.font*.6+28);
      assert.ok(panel.ballX+width/2<panel.stageXs[0],'query badge fits before HTTP');
      assert.ok(panel.idX+panel.idW<panel.ballX-width/2,'ID fits before query badge');
      const badge=svg.split('data-inner-ball="'+run.value+'"')[1].split('</g>')[0];
      assert.match(badge,/data-value-shape="pill"/);assert.doesNotMatch(badge,/<circle/);
      assert.match(badge,new RegExp('font-size="30"[^>]*>'+run.value+'<'));
      const success=runs.find(r=>!r.cancelled),received=c.snapshot(success.completed+.01);
      assert.equal(received.histories[0].values.at(-1).value,'['+success.id+']');
      assert.equal(received.innerWorkPanels[0].rows.find(r=>r.id===success.id).receiver.value,'['+success.id+']');
      const inputEvent=c.events.find(e=>e.type==='source-next'&&e.edge.startsWith('source-')&&e.value===run.value);
      const travelling=render(c.snapshot(inputEvent.at+.1)).split('data-value-on="'+inputEvent.edge+'"')[1].split('</g>')[0];
      assert.match(travelling,/data-value-shape="pill"/);assert.match(travelling,/font-size="30"/);
    }
  }
});

const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {modules,playbackHarness,revealMock}=require('./v2-harness.cjs');
const id='11a-distinct-switchmap';
async function fixture(format='4:3') {
 const m=await modules(['catalog','scene-config','engine','renderer','checkpoint-notes']);
 const scene=m['scene-config'].configureScene({...m.catalog.scenes.find(s=>s.id===id),format});
 return {m,scene,c:m.engine.compileScene(scene),render:m.renderer.renderScene};
}
const stop=(c,id)=>c.stops.find(s=>s.id===id).time;
const frame=(c,id)=>c.snapshot(stop(c,id));
const metrics=f=>Array.from(f.metrics,m=>m.value);
const node=(f,id)=>f.nodes.find(n=>n.id===id);
const lane=(f,id)=>node(f,id).laneStates[0];
const rows=f=>f.innerWorkPanels[0].rows;
const code=f=>f.codeView.map(line=>line.filter(p=>p.opacity>0).map(p=>p.text).join('')).filter(line=>line.trim()).join('\n');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} ≈ ${b}`);
const inputs=['r','re','rea','re','rea'];
const stopIds=['first','duplicate','successes','request-error','error'];

test('READY immediately includes the complete distinct pipeline and code; manual stops separate results, duplicate, request and error',async()=>{
 const {scene,c,render}=await fixture(),initial=c.snapshot(0);
 assert.equal(scene.title,'distinctUntilChanged — znowu to samo?');
 assert.equal(scene.phases,undefined);
 assert.deepEqual(Array.from(c.stops,s=>[s.id,s.autoPause]),stopIds.map(id=>[id,true]));
 assert.equal(initial.readouts[0].value,'');assert.equal(rows(initial).length,0);
 assert.equal(node(initial,'distinct').visible,true);assert.equal(node(initial,'distinct').opacity,1);
 assert.equal(code(initial),'query$.pipe(\n  debounceTime(300),\n  distinctUntilChanged(),\n  switchMap(query => httpGet(url(query)))\n)');
 assert.ok(initial.codeView.flat().every(part=>part.opacity===1));
 assert.match(render(initial),/>distinctUntil<.*>Changed</);
 assert.deepEqual(Array.from(c.plan.records.keys()).filter(id=>!id.startsWith('inner')),
  ['source-debounce','debounce-distinct','distinct-op','op-observer']);
 const observed=c.events.filter(e=>e.type==='source-next'&&e.edge==='source-debounce');
 assert.deepEqual(Array.from(observed.slice(0,5),e=>e.value),inputs);
 const out=c.events.filter(e=>e.type==='source-next'&&e.edge==='debounce-distinct');
 assert.deepEqual(Array.from(out.slice(0,2),e=>e.value),['rea','rea']);
 for(let i=0;i<2;i++)near(out[i].logicalAt-observed[i?4:2].logicalAt,.3);
 for(let i=1;i<3;i++)near(observed[i].at-observed[i-1].at,.5);
 near(observed[4].at-observed[3].at,.5);
 assert.deepEqual(metrics(initial),[0,0,0,0,0,'nieuruchomiona']);
});

test('distinct rejects a duplicate, then three different queries each deliver a result and complete before the next-click error',async()=>{
 const {scene,c,render}=await fixture(),successes=frame(c,'successes');
 assert.deepEqual(metrics(successes),[13,13,4,3,0,'aktywna']);
 assert.equal(lane(successes,'distinct').memory.value,'vue');
 assert.deepEqual(Array.from(rows(successes),r=>[r.id,r.value,r.state,r.receiver.state]),
  [['#1','rea','completed','completed'],['#2','ang','completed','completed'],['#3','vue','completed','completed']]);
 const reject=c.events.find(e=>e.type==='distinct-reject'),duplicate=c.snapshot(reject.at+.25);
 assert.equal(duplicate.tokens.find(t=>t.phase==='reject').value,'rea');
 assert.match(render(duplicate),/data-callout="duplikat"/);assert.equal(duplicate.executionCounts.started,1);
 const events=c.events.filter(e=>e.at<=stop(c,'successes'));
 assert.deepEqual(Array.from(events.filter(e=>e.type==='source-next'&&e.edge==='distinct-op'),e=>e.value),['rea','ang','vue']);
 assert.deepEqual(Array.from(events.filter(e=>e.type==='inner-next'),e=>e.value),['[#1]','[#2]','[#3]']);
 assert.equal(events.filter(e=>e.type==='stream-complete'&&e.edge.startsWith('inner')).length,3);
 assert.equal(events.some(e=>e.type==='inner-unsubscribe'||e.type==='stream-error'),false);
 assert.equal(events.some(e=>e.type==='source-next'&&e.value==='react'),false);
 assert.ok(c.events.find(e=>e.type==='inner-subscribe'&&e.execution==='#4').at>stop(c,'successes'));
 assert.equal(scene.live,undefined);
 const observedValues=Array.from(c.events.filter(e=>e.type==='source-next'&&e.edge==='source-debounce'),e=>e.value);
 assert.ok(observedValues.slice(0,-6).every(v=>v.length<=3));
 assert.deepEqual(observedValues.slice(-6),['','r','re','rea','reac','react']);
});

test('error 500 travels HTTP → switchMap → receiver before full upstream teardown; no complete or response',async()=>{
 const {c,render}=await fixture(),records=c.plan.records;
 const events=c.events,at=(type,edge)=>events.find(e=>e.type===type&&e.edge===edge).at;
 const http=records.get('inner3-op'),result=records.get('op-observer');
 assert.equal(http.end.kind,'error');assert.equal(result.end.kind,'error');
 assert.equal(events.find(e=>e.type==='http-error').status,500);
 assert.ok(at('stream-error','inner3-op')>stop(c,'successes'));
 assert.ok(at('stream-error','op-observer')>=at('disconnected','inner3-op'));
 assert.ok(at('inner-unsubscribe','distinct-op')>=at('disconnected','op-observer'));
 assert.ok(at('inner-unsubscribe','debounce-distinct')>=at('disconnected','distinct-op'));
 assert.ok(at('inner-unsubscribe','source-debounce')>=at('disconnected','debounce-distinct'));
 assert.equal(events.some(e=>(e.type==='stream-complete'||e.type==='inner-next')&&e.edge==='inner3-op'),false);
 assert.equal(events.some(e=>e.type==='stream-complete'&&!e.edge.startsWith('inner')),false);
 assert.equal(events.filter(e=>e.type==='deliver-next'&&e.edge==='op-observer').length,3);
 const httpPulse=c.snapshot(at('stream-error','inner3-op')+.2);
 assert.equal(rows(httpPulse).at(-1).stages[0].state,'errored');
 assert.equal(rows(httpPulse).at(-1).wires[0].pulse.color,'#C54848');assert.match(render(httpPulse),/>error 500</);
 const relay=c.snapshot(at('stream-error','op-observer')+.2);
 assert.equal(relay.edges.find(e=>e.id==='op-observer').pulse.color,'#C54848');
 const end=c.snapshot(c.duration);
 assert.equal(rows(end).at(-1).receiver.state,'errored');
 for(const n of ['source','debounce','distinct'])assert.equal(lane(end,n).state,'cancelled',n);
 for(const n of ['op','observer'])assert.equal(lane(end,n).state,'error',n);
 assert.ok(node(end,'observer').laneTerminalText.offsetY<-node(end,'observer').rowH/2,'error label above the retained result');
 assert.equal(rows(end).at(-1).state,'errored');assert.equal(rows(end).at(-1).value,'react');
 assert.match(render(end),/! error/);
 const failed=render(end).split('data-inner-work="#4"')[1];assert.doesNotMatch(failed,/✓ complete/);
 assert.equal(end.histories[0].values.at(-1).value,'[#3]');
});

test('after detach UI erases react and types angular; only UI count grows, no RxJS events, timer, HTTP or results',async()=>{
 const {c,render}=await fixture(),events=c.events;
 const detached=events.find(e=>e.type==='disconnected'&&e.edge==='source-debounce').at;
 const ui=events.filter(e=>e.type==='input-change'&&!e.observed);
 assert.deepEqual(Array.from(ui,e=>e.value),['reac','rea','re','r','','a','an','ang','angu','angul','angula','angular']);
 assert.ok(ui[0].at>detached);
 assert.equal(events.filter(e=>e.at>detached&&!['input-change'].includes(e.type)).length,0);
 for(let i=0;i<ui.length;i++) {
  const f=c.snapshot(ui[i].at+.01);
  assert.equal(f.readouts[0].value,ui[i].value);assert.deepEqual(metrics(f),[20+i,19,5,4,0,'zakończona błędem']);
  assert.equal(f.tokens.length,0);assert.equal(lane(f,'debounce').timer.active,false);
  assert.equal(f.executionCounts.started,4);assert.equal(rows(f).length,3);assert.equal(f.histories[0].values.at(-1).value,'[#3]');
  assert.doesNotMatch(render(f),/data-lane-timer="|data-callout=/);
 }
 assert.equal(c.snapshot(c.duration).caption,'Jeden nieobsłużony błąd HTTP zakończył całą wyszukiwarkę.');
});

test('MANUAL and AUTO pause at each semantic step; fast next cannot skip error or post-error typing',async()=>{
 for(const mode of ['manual','auto']) {
  const {scene}=await fixture(),h=await playbackHarness(),navigation=[];
  const {player,controller}=h.create({scene,controls:{stageOptions:{onNavigate:d=>navigation.push(d)}}});
  if(mode==='auto')controller.setMode('auto');else controller.next();
  for(const id of stopIds) {
   h.advance(60000);
   near(player.time,player.stops.find(s=>s.id===id).time);assert.equal(player.isPlaying,false);
   const frozen=JSON.stringify(player.snapshot),time=player.time;
   h.advance(300000);assert.equal(player.time,time);assert.equal(JSON.stringify(player.snapshot),frozen);assert.equal(h.frames.size,0);
   assert.deepEqual(navigation,[]);
   const f=player.snapshot;
   if(id==='first')assert.deepEqual(metrics(f),[3,3,1,1,0,'aktywna']);
   if(id==='duplicate')assert.deepEqual(metrics(f),[5,5,2,1,0,'aktywna']);
   if(id==='successes')assert.deepEqual(metrics(f),[13,13,4,3,0,'aktywna']);
   if(id==='request-error'){
    assert.deepEqual(metrics(f),[19,19,5,4,1,'aktywna']);assert.equal(rows(f).at(-1).state,'active');
   }
   if(id==='error'){
    assert.deepEqual(metrics(f),[19,19,5,4,0,'zakończona błędem']);assert.equal(f.readouts[0].value,'react');
    assert.equal(lane(f,'source').state,'cancelled');assert.equal(lane(f,'observer').state,'error');
   }
   controller.next();
  }
  h.advance(60000);assert.equal(player.state,'finished');assert.equal(player.snapshot.readouts[0].value,'angular');
  assert.deepEqual(navigation,[]);
  controller.previous();near(player.time,player.stops.at(-1).time);assert.equal(player.snapshot.readouts[0].value,'react');
  controller.reset();assert.equal(player.time,0);assert.equal(player.isPlaying,false);assert.equal(h.frames.size,0);
  // Każde dwa szybkie kliki: odtwórz etap, dokończ wyłącznie ten etap — bez nawigacji.
  for(const stop of player.stops){controller.next();controller.next();near(player.time,stop.time);assert.equal(player.isPlaying,false);assert.deepEqual(navigation,[]);}
  controller.next();controller.next();assert.equal(player.state,'finished');assert.equal(player.snapshot.readouts[0].value,'angular');
  controller.next();assert.deepEqual(navigation,[1]);
  controller.reset();controller.next();h.advance(100);controller.suspend('slide');h.advance(5000);assert.equal(player.isPlaying,false);
  controller.reset();assert.equal(player.time,0);assert.equal(h.frames.size,0);
 }
});

test('Reveal keyboard and native fragments keep the error step on the same slide before final typing and navigation',async()=>{
 for(const via of ['keyboard','fragment']){
  const {scene,c}=await fixture(),h=await playbackHarness(),navigation=[];
  const {player,controller}=h.create({scene,controls:{stageOptions:{onNavigate:d=>navigation.push(d)}}});
  const {deck,stage}=revealMock();
  stage.markers=Array.from({length:c.stops.length+1},(_,index)=>({index,visible:false,
   closest(s){return s==='section'?stage:s==='.rx-fragment-steps'?stage.markers:null;}}));
  const bridge=h.install(deck,{getController:()=>controller});bridge.refresh();
  // Widoczne markery są stanem Reveal; mock zapisuje argument navigateFragment po callbackach.
  const next=()=>via==='keyboard'?deck.press(39):deck.navigateFragment(stage.markers.filter(m=>m.visible).length);
  for(let i=0;i<c.stops.length;i++){
   next();h.advance(50);next();near(player.time,c.stops[i].time);assert.equal(stage.markers.filter(m=>m.visible).length,i+1);
   assert.deepEqual(navigation,[]);
  }
  assert.equal(player.snapshot.readouts[0].value,'react');assert.equal(lane(player.snapshot,'source').state,'cancelled');
  next();h.advance(50);next();assert.equal(player.state,'finished');assert.equal(player.snapshot.readouts[0].value,'angular');
  assert.deepEqual(navigation,[]);deck.press(39);assert.deepEqual(navigation,[1]);
  controller.reset();assert.equal(player.time,0);assert.equal(deck.fragmentIndex,-1);
  for(const s of c.stops){bridge.restore(()=>controller.seekCheckpoint(s.time));near(player.time,s.time);assert.equal(player.isPlaying,false);}
 }
});

test('stable compact geometry, old input styling, code marks and notes, deterministic rewind in both formats',async()=>{
 for(const format of ['4:3','16:9']) {
  const {scene,c,render,m}=await fixture(format),old=m['scene-config'].configureScene({id:'12b-debounce-switchmap',format});
  const previous=m.engine.compileScene(old).snapshot(0),initial=c.snapshot(0);
  for(const key of ['id','h','font','fill','stroke','cursor'])assert.equal(initial.readouts[0][key],previous.readouts[0][key],key);
  const geometry=f=>Array.from(f.nodes.filter(n=>['source','debounce','op','observer'].includes(n.id)),n=>[n.id,n.x,n.y,n.w,n.h]);
  for(let t=0;t<=c.duration;t+=.15) {
   const f=c.snapshot(t),p=f.innerWorkPanels[0];assert.deepEqual(geometry(f),geometry(initial));assert.ok(rows(f).length<=3);
   for(const r of rows(f))assert.ok(r.y>=p.dividerY&&r.y+p.headerH+p.rowHeight<=f.height);
  }
  for(const t of [0,...c.stops.map(s=>s.time),c.duration].reverse()) {
   const f=c.snapshot(t),svg=render(f);
   assert.equal(svg,render(m.engine.compileScene(scene).snapshot(t)));
   assert.doesNotMatch(svg,/NaN|Infinity|>S1<|data-inner-placeholder/);
   assert.doesNotMatch(render(f,{reducedMotion:true}),/NaN|Infinity|>S1</);
  }
  assert.match(render(initial),/>distinctUntil<.*>Changed</);
  const h=await playbackHarness(),{player,elements}=h.create({scene});
  player.seek(stop(c,'successes'));const html=elements.get('.rx-code').innerHTML;
  for(const word of ['query$','httpGet'])assert.ok(html.includes('rx-tok-src">'+word));
  for(const word of ['debounceTime','distinctUntilChanged','switchMap'])assert.ok(html.includes('rx-tok-op">'+word));
  assert.match(html,/data-mark="distinct"/);assert.match(html,/data-mark="http"/);
  const active=c.snapshot(7.9).codeView.flat().filter(p=>p.active).map(p=>p.mark.id);
  assert.ok(active.includes('switch'));
 }
 const template=fs.readFileSync('index.html','utf8').match(/<template data-checkpoint-notes="11a-distinct-switchmap">([\s\S]*?)<\/template>/)[1];
 assert.deepEqual([...template.matchAll(/data-checkpoint="([^"]+)"/g)].map(m=>m[1]),['ready',...stopIds,'finished']);
 assert.match(template,/500/);assert.match(template,/31 zmian inputa/);
});

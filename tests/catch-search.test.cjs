const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {modules,playbackHarness,revealMock}=require('./v2-harness.cjs');
const id='11b-catcherror-search';
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
const code=f=>f.codeView.map(line=>line.filter(p=>p.opacity>0).map(p=>p.text).join('')).join('\n');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} ≈ ${b}`);
const at=(c,type,edge,value)=>c.events.find(e=>e.type===type&&e.edge===edge&&(value===undefined||e.value===value)).at;
const stopIds=['request','error','fallback','success'];
const mainEdges=['source-debounce','debounce-distinct','distinct-op','op-observer'];
const exactCode='query$.pipe(\n  debounceTime(300),\n  distinctUntilChanged(),\n  switchMap(query =>\n'+
 '    httpGet(url(query)).pipe(\n      catchError(() => of([]))\n    )\n  )\n)';

test('READY: complete code with inner catchError, all blocks visible, empty input, no subscription or request',async()=>{
 const {scene,c,render}=await fixture(),initial=c.snapshot(0);
 assert.equal(scene.title,'catchError — wyszukiwarka działa dalej');
 assert.equal(code(initial),exactCode);
 assert.ok(initial.codeView.flat().every(part=>part.opacity===1));
 const text=scene.code;
 assert.ok(text.indexOf('distinctUntilChanged()')<text.indexOf('switchMap('));
 assert.ok(text.indexOf('httpGet(url(query)).pipe(')<text.indexOf('catchError(() => of([]))'));
 assert.ok(text.indexOf('catchError')<text.lastIndexOf('  )\n)'),'catchError inside switchMap');
 assert.doesNotMatch(text,/http\.get|\/api\/search|retry/);
 assert.deepEqual(Array.from(c.stops,s=>[s.id,s.autoPause]),stopIds.map(id=>[id,true]));
 assert.equal(initial.readouts[0].value,'');assert.equal(rows(initial).length,0);
 assert.deepEqual(metrics(initial),[0,0,0,0,0,'nieuruchomiona']);
 assert.equal(initial.executionCounts.started,0);
 for(const id of ['source','debounce','distinct','op','observer','def-source','def-catch'])assert.equal(node(initial,id).visible,true,id);
 const svg=render(initial);
 assert.match(svg,/>catchError</);assert.match(svg,/>HTTP GET</);assert.match(svg,/>distinctUntil<.*>Changed</);
 assert.equal(initial.edges.filter(e=>mainEdges.includes(e.id)&&e.phase!=='idle'&&e.visible).length,0);
 assert.deepEqual(Array.from(c.plan.records.keys()),[...mainEdges.slice(0,3),'op-observer','inner0-catch0','catch0-op','inner1-catch1','catch1-op']);
});

test('first click: subscribe right-to-left, react passes debounce and distinct, HTTP #1 subscribes through catchError and errors 500',async()=>{
 const {c,render}=await fixture(),events=c.events;
 const subscribes=['op-observer','distinct-op','debounce-distinct','source-debounce'].map(e=>at(c,'subscribe',e));
 assert.deepEqual([...subscribes].sort((a,b)=>a-b),subscribes);
 const typed=Array.from(events.filter(e=>e.type==='source-next'&&e.edge==='source-debounce'&&e.at<stop(c,'error')),e=>e.value);
 assert.deepEqual(typed,['r','re','rea','reac','react']);
 assert.ok(subscribes.at(-1)<events.find(e=>e.type==='source-next'&&e.edge==='source-debounce').at);
 const out=events.filter(e=>e.type==='source-next'&&e.edge==='debounce-distinct');
 assert.deepEqual(Array.from(out,e=>e.value),['react','angular']);
 near(out[0].logicalAt-events.find(e=>e.type==='source-next'&&e.value==='react').logicalAt,.3);
 assert.ok(at(c,'subscribe','catch0-op')<at(c,'subscribe','inner0-catch0'),'switchMap subscribes catchError first');
 assert.ok(at(c,'inner-subscribe','inner0-catch0')<at(c,'stream-error','inner0-catch0'));
 assert.equal(events.find(e=>e.type==='http-error').status,500);
 near(stop(c,'error'),at(c,'disconnected','inner0-catch0'));
 const f=frame(c,'error'),row=rows(f)[0];
 assert.deepEqual([row.id,row.value,row.stages[0].state,row.stages[1].state],['#1','react','errored','active']);
 assert.equal(row.stages[1].fallback?.opacity??0,0,'fallback not started yet');
 assert.equal(row.receiver.value,undefined);
 assert.deepEqual(metrics(f),[5,1,1,1,0,'aktywna']);
 for(const n of ['source','debounce','distinct','op','observer'])assert.equal(lane(f,n).state,'running',n);
 assert.equal(f.histories[0].values.length,0);
 const svg=render(f);assert.match(svg,/>error 500</);assert.doesNotMatch(svg,/! error/);
 const pulse=c.snapshot(at(c,'stream-error','inner0-catch0')+.2);
 assert.equal(rows(pulse)[0].wires[0].pulse.color,'#C54848');
 assert.equal(events.some(e=>['stream-complete','inner-next'].includes(e.type)&&e.edge==='inner0-catch0'),false);
});

test('fallback: of([]) emits [] through switchMap to S1, completes only the inner; HTTP #1 stays error 500',async()=>{
 const {c,render}=await fixture(),events=c.events;
 const fb=c.snapshot(stop(c,'error')+.5);assert.equal(rows(fb)[0].stages[1].fallback.label,'of([])');
 assert.ok(at(c,'inner-next','catch0-op','[]')>stop(c,'error'));
 assert.ok(at(c,'deliver-next','op-observer','[]')<at(c,'stream-complete','catch0-op'));
 const f=frame(c,'fallback'),row=rows(f)[0];
 assert.deepEqual([row.stages[0].state,row.stages[1].state,row.receiver.state,row.receiver.value],['errored','completed','completed','[]']);
 assert.deepEqual(Array.from(f.histories[0].values,v=>v.value),['[]']);
 assert.deepEqual(metrics(f),[5,1,1,1,0,'aktywna']);
 for(const n of ['source','debounce','distinct','op','observer'])assert.equal(lane(f,n).state,'running',n);
 const svg=render(f);assert.match(svg,/>error 500</);
 assert.match(svg.split('data-inner-receiver="#1"')[1],/✓ complete/);
 assert.equal(Array.from(events.filter(e=>e.at<=stop(c,'fallback')&&e.type==='stream-complete'),e=>e.edge).join(),'catch0-op');
});

test('second search: erase react, type angular, HTTP #2 succeeds through catchError; outer never errors, completes or detaches',async()=>{
 const {c,render}=await fixture(),events=c.events,from=stop(c,'fallback');
 const typed=Array.from(events.filter(e=>e.type==='source-next'&&e.edge==='source-debounce'&&e.at>from),e=>e.value);
 assert.deepEqual(typed,['reac','rea','re','r','','a','an','ang','angu','angul','angula','angular']);
 assert.deepEqual(Array.from(events.filter(e=>e.type==='source-next'&&e.edge==='distinct-op'),e=>e.value),['react','angular']);
 assert.equal(events.filter(e=>e.type==='inner-create'&&e.node.startsWith('inner')).length,2);
 assert.deepEqual(Array.from(events.filter(e=>e.type==='inner-next'),e=>[e.edge,e.value]),
  [['catch0-op','[]'],['inner1-catch1','[#2]'],['catch1-op','[#2]']]);
 assert.ok(at(c,'deliver-next','inner1-catch1')<at(c,'inner-next','catch1-op'));
 assert.ok(at(c,'deliver-next','catch1-op')<at(c,'disconnected','catch1-op'));
 assert.deepEqual(Array.from(events.filter(e=>e.type==='deliver-next'&&e.edge==='op-observer'),e=>e.value),['[]','[#2]']);
 assert.equal(Array.from(events.filter(e=>e.type==='stream-error'),e=>e.edge).join(),'inner0-catch0');
 for(const edge of mainEdges)assert.equal(events.some(e=>e.edge===edge&&['stream-complete','stream-error','inner-unsubscribe','disconnected'].includes(e.type)),false,edge);
 assert.equal(events.some(e=>e.type==='inner-unsubscribe'),false);
 const end=frame(c,'success');near(stop(c,'success'),c.duration);
 assert.deepEqual(Array.from(rows(end),r=>[r.id,r.value,...r.stages.map(s=>s.state),r.receiver.state,r.receiver.value]),
  [['#1','react','errored','completed','completed','[]'],['#2','angular','completed','completed','completed','[#2]']]);
 assert.equal(end.readouts[0].value,'angular');
 assert.deepEqual(metrics(end),[17,2,2,1,0,'aktywna']);
 assert.equal(end.histories[0].values.at(-1).value,'[#2]');
 for(const n of ['source','debounce','distinct','op','observer'])assert.equal(lane(end,n).state,'running',n);
 assert.equal(end.caption,'Błąd jednego requestu nie musi kończyć całego strumienia.');
 const svg=render(end);assert.match(svg.split('data-inner-work="#1"')[1].split('data-inner-work="#2"')[0],/>error 500</);
 assert.doesNotMatch(svg,/! error|NaN|Infinity/);
});

test('MANUAL and AUTO stop at request, error, fallback and success; long pauses frozen, fast next finishes only the stage',async()=>{
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
   if(id!=='success')controller.next();
  }
  controller.next();assert.deepEqual(navigation,[1]);
  controller.previous();near(player.time,player.stops.at(-2).time);
  controller.reset();assert.equal(player.time,0);assert.equal(player.isPlaying,false);assert.equal(h.frames.size,0);
  assert.equal(player.snapshot.readouts[0].value,'');
  for(const s of player.stops){controller.next();controller.next();near(player.time,s.time);assert.equal(player.isPlaying,false);}
  assert.deepEqual(navigation,[1]);controller.next();assert.deepEqual(navigation,[1,1]);
  controller.reset();controller.next();h.advance(100);controller.suspend('slide');h.advance(5000);assert.equal(player.isPlaying,false);
  controller.reset();assert.equal(player.time,0);assert.equal(h.frames.size,0);
 }
});

test('Reveal keyboard and fragments keep stages on the slide; restore seeks each checkpoint',async()=>{
 for(const via of ['keyboard','fragment']){
  const {scene,c}=await fixture(),h=await playbackHarness(),navigation=[];
  const {player,controller}=h.create({scene,controls:{stageOptions:{onNavigate:d=>navigation.push(d)}}});
  const {deck,stage}=revealMock();
  stage.markers=Array.from({length:c.stops.length+1},(_,index)=>({index,visible:false,
   closest(s){return s==='section'?stage:s==='.rx-fragment-steps'?stage.markers:null;}}));
  const bridge=h.install(deck,{getController:()=>controller});bridge.refresh();
  const next=()=>via==='keyboard'?deck.press(39):deck.navigateFragment(stage.markers.filter(m=>m.visible).length);
  // Ostatni postój jest końcem sceny (jak complete-b w 20-sharereplay): mock fragmentów sprawdza postoje przed nim.
  const count=via==='keyboard'?c.stops.length:c.stops.length-1;
  for(let i=0;i<count;i++){
   next();h.advance(50);next();near(player.time,c.stops[i].time);
   assert.equal(stage.markers.filter(m=>m.visible).length,i+1+(i===c.stops.length-1?1:0));
   assert.deepEqual(navigation,[]);
  }
  if(via==='keyboard'){assert.equal(player.state,'finished');deck.press(39);assert.deepEqual(navigation,[1]);}
  controller.reset();assert.equal(player.time,0);assert.equal(deck.fragmentIndex,-1);
  for(const s of c.stops){bridge.restore(()=>controller.seekCheckpoint(s.time));near(player.time,s.time);assert.equal(player.isPlaying,false);}
 }
});

test('same top geometry and input as distinct, stable rows, syntax marks, notes and deterministic rewind in both formats',async()=>{
 for(const format of ['4:3','16:9']) {
  const {scene,c,render,m}=await fixture(format);
  const distinct=m.engine.compileScene(m['scene-config'].configureScene({...m.catalog.scenes.find(s=>s.id==='11a-distinct-switchmap'),format}));
  const initial=c.snapshot(0),previous=distinct.snapshot(0);
  const top=['source','debounce','distinct','op','observer'];
  const geometry=f=>Array.from(f.nodes.filter(n=>top.includes(n.id)),n=>[n.id,n.x,n.y,n.w,n.h,n.fill,n.label]);
  assert.deepEqual(geometry(initial),geometry(previous));
  for(const key of ['x','y','w','h','font','fill','stroke','cursor'])assert.equal(initial.readouts[0][key],previous.readouts[0][key],key);
  assert.equal(initial.textScale,previous.textScale);assert.equal(initial.width,previous.width);
  const p0=initial.innerWorkPanels[0],d0=previous.innerWorkPanels[0];
  for(const key of ['rowsTop','rowStep','rowHeight','headerH','dividerY'])assert.equal(p0[key],d0[key],key);
  assert.deepEqual(Array.from(p0.columns,c=>c.label),['HTTP GET','catchError']);
  for(let t=0;t<=c.duration;t+=.15) {
   const f=c.snapshot(t),p=f.innerWorkPanels[0];assert.deepEqual(geometry(f),geometry(initial));assert.ok(rows(f).length<=2);
   for(const r of rows(f))assert.ok(r.y>=p.dividerY&&r.y+p.headerH+p.rowHeight<=f.height);
  }
  for(const t of [0,...c.stops.map(s=>s.time)].reverse()) {
   const f=c.snapshot(t),svg=render(f);
   assert.equal(svg,render(m.engine.compileScene(scene).snapshot(t)));
   assert.doesNotMatch(svg,/NaN|Infinity|>S1<|data-inner-placeholder/);
   assert.doesNotMatch(render(f,{reducedMotion:true}),/NaN|Infinity|>S1</);
  }
  const h=await playbackHarness(),{player,elements}=h.create({scene});
  player.seek(stop(c,'fallback'));const html=elements.get('.rx-code').innerHTML;
  for(const word of ['query$','httpGet'])assert.ok(html.includes('rx-tok-src">'+word),word);
  for(const word of ['debounceTime','distinctUntilChanged','switchMap','catchError'])assert.ok(html.includes('rx-tok-op">'+word),word);
  for(const mark of ['query','debounce','distinct','switch','http','catch'])assert.match(html,new RegExp(`data-mark="${mark}"`));
  const active=t=>c.snapshot(t).codeView.flat().filter(p=>p.active).map(p=>p.mark.id);
  assert.ok(active(stop(c,'error')).includes('catch'));
  assert.ok(active(at(c,'deliver-next','inner1-catch1')+.1).includes('catch'));
 }
 const template=fs.readFileSync('index.html','utf8').match(/<template data-checkpoint-notes="11b-catcherror-search">([\s\S]*?)<\/template>/)[1];
 assert.deepEqual([...template.matchAll(/data-checkpoint="([^"]+)"/g)].map(m=>m[1]),['ready',...stopIds,'finished']);
 assert.match(template,/Tym razem przechwycimy błąd wewnątrz switchMap/);
 assert.match(template,/błąd trafia do catchError, a nie do głównego odbiorcy/);
 assert.match(template,/nie straciliśmy subskrypcji/);
 assert.match(template,/To zasługa umieszczenia catchError wewnątrz switchMap/);
});

test('placed directly after distinctUntilChanged in MAIN',async()=>{
 const {m}=await fixture(),order=m['scene-config'].mainOrder;
 assert.equal(order[order.indexOf('11a-distinct-switchmap')+1],id);
 assert.match(fs.readFileSync('index.html','utf8'),/<section id="11b-catcherror-search"[^>]*data-animation="11b-catcherror-search"/);
});

test('request stop: HTTP #1 for react is running before the error; error stop comes before of([]) with a visible pause',async()=>{
 for(const format of ['4:3','16:9']){
  const {c}=await fixture(format),f=frame(c,'request'),r=rows(f)[0];
  assert.equal(r.value,'react');assert.equal(r.stages[0].state,'active');
  assert.ok(r.stages[0].progress>.1&&r.stages[0].progress<.9,'request trwa');
  assert.deepEqual(metrics(f),[5,1,1,0,1,'aktywna']);
  assert.ok(mainEdges.every(id=>f.edges.find(e=>e.id===id).phase==='subscribed'));
  const e=frame(c,'error');assert.equal(rows(e)[0].stages[0].state,'errored');assert.equal(rows(e)[0].stages[1].state,'active');
  assert.ok(at(c,'inner-next','catch0-op')-stop(c,'error')>=.9,'pauza przed of([])');
  assert.ok(mainEdges.every(id=>e.edges.find(x=>x.id===id).phase==='subscribed'),'switchMap nadal podłączony');
 }
});

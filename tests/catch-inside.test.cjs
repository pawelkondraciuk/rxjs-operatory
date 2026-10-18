const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {modules}=require('./v2-harness.cjs');
// b04-catcherror-2: catchError wewnątrz switchMap w wyglądzie MAIN switchMap. Góra klik$ → switchMap → S1, dół
// dolna część z etapami HTTP GET → catchError. Błąd A zostaje w inner A, of([]) emituje [], klik B działa dalej.
async function deck(format='4:3'){
 const m=await modules(['catalog','scene-config','engine','renderer']);
 const configure=(id,extra)=>m['scene-config'].configureScene({...m.catalog.scenes.find(s=>s.id===id),...extra,format});
 const scene=configure('b04-catcherror',{catchInside:true,id:'b04-catcherror-2',rendererId:'b04-catcherror'});
 const switchMap=configure('11-switchmap',{id:'11-switchmap',rendererId:'11-switchmap'});
 return {scene,c:m.engine.compileScene(scene),sw:m.engine.compileScene(switchMap),render:m.renderer.renderScene};
}
const at=(c,type,edge,value)=>c.events.find(e=>e.type===type&&e.edge===edge&&(value===undefined||e.value===value)).at;
const received=f=>Array.from(f.histories.find(h=>h.anchor==='observer').values,v=>v.value);
const rows=f=>f.innerWorkPanels[0].rows;
const row=(f,id)=>rows(f).find(r=>r.id===id);
const top=f=>f.nodes.filter(n=>['source','op','observer'].includes(n.id));

test('catchError inside: the top pipeline is the MAIN switchMap pipeline with one S1 lane',async()=>{
 for(const format of ['4:3','16:9']){
  const {c,sw}=await deck(format),f=c.snapshot(c.duration),s=sw.snapshot(sw.duration);
  const shape=frame=>JSON.stringify(top(frame).map(n=>[n.id,n.x,n.w,n.y-n.h/2,n.defH,n.rowH,n.headerFill,n.runtimeFill]));
  assert.equal(shape(f),shape(s),format);
  assert.deepEqual(Array.from(top(f),n=>n.label),['klik$','switchMap','']);
  const panel=f.innerWorkPanels[0];
  assert.deepEqual(Array.from(panel.columns,col=>col.label),['HTTP GET','catchError']);
  assert.equal(panel.frameless,true);assert.equal(panel.label,undefined,'bez dużego napisu nad pracami');
  // Każde inner to instancja jak w 09–12: HTTP GET → catchError → inbox w jednym rzędzie; podział między górą a pierwszym slotem.
  assert.equal(panel.instances,true,format);
  assert.ok(panel.dividerY>Math.max(...top(f).map(n=>n.y+n.h/2))&&panel.dividerY<panel.rowsTop,format);
  assert.equal(panel.stageXs[1]-(panel.stageXs[0]+panel.stageWs[0]),panel.stageGap);
  assert.equal(panel.receiverX,panel.stageXs[1]+panel.stageWs[1]+panel.stageGap,'subscriber za catchError, za tym samym odstępem');
  assert.equal(panel.stageXs[0],panel.stagesLeft);assert.equal(panel.receiverX+panel.receiverW,1210,'subscriber pod odbiorcą głównym');
  assert.deepEqual(Array.from(rows(f),r=>r.id+' · '+r.value),['#1 · A','#2 · B']);
 }
});

test('catchError inside: HTTP A error reaches only its catchError; of([]) emits [] and inner A completes',async()=>{
 const {c}=await deck();
 const http=c.plan.records.get('inner0-catch0'),handler=c.plan.records.get('catch0-op');
 assert.equal(http.end.kind,'error');assert.equal(handler.end.kind,'complete');
 assert.deepEqual(Array.from(handler.events,e=>e.value),['[]']);
 assert.ok(!c.events.some(e=>e.type==='stream-error'&&!e.edge.startsWith('inner0')),'błąd tylko na odcinku HTTP A');
 const caught=at(c,'disconnected','inner0-catch0');
 const error=c.snapshot(caught);
 assert.deepEqual(Array.from(row(error,'#1').stages,s=>s.state),['errored','active']);
 assert.deepEqual(received(error),[]);
 const pulse=c.snapshot(caught-.4);
 assert.equal(row(pulse,'#1').wires[0].pulse.color,'#C54848','czerwony impuls error do catchError');
 const fallback=c.snapshot(caught+.5);
 assert.equal(row(fallback,'#1').stages[1].fallback.label,'of([])');
 const delivered=at(c,'deliver-next','op-observer','[]');
 assert.deepEqual(received(c.snapshot(delivered-.001)),[]);assert.deepEqual(received(c.snapshot(delivered)),['[]']);
 const done=c.snapshot(at(c,'disconnected','catch0-op')+.1);
 assert.equal(row(done,'#1').state,'completed');assert.equal(row(done,'#1').stages[1].fallback,undefined);
 // Outer pozostaje aktywny: S1 bez complete/error, kable klik$ i S1 bez terminala.
 for(const edge of ['source-op','op-observer'])assert.equal(c.plan.records.get(edge).end,null,edge);
 assert.ok(done.nodes.filter(n=>n.laneStates?.length).every(n=>n.laneStates.every(l=>l.state==='running')));
});

test('catchError inside: the next click B starts a new HTTP whose result reaches S1; S1 stays active',async()=>{
 const {c}=await deck(),end=c.snapshot(c.duration);
 assert.ok(at(c,'source-next','source-op','B')>at(c,'disconnected','catch0-op'),'B po zakończeniu inner A');
 assert.equal(c.plan.records.get('inner1-catch1').end.kind,'complete');
 assert.deepEqual(received(end),['[]','B']);
 assert.deepEqual(Array.from(row(end,'#2').stages,s=>s.state),['completed','completed']);
 assert.deepEqual(Array.from(row(end,'#1').stages,s=>s.state),['errored','completed']);
 assert.equal(end.executionCounts.started,2);
 assert.ok(end.nodes.filter(n=>n.laneStates?.length).every(n=>n.laneStates.every(l=>l.state==='running')),'outer nie kończy się');
 assert.equal(row(c.snapshot(at(c,'source-next','source-op','B')-.01),'#2'),undefined,'#2 dopiero po kliknięciu B');
});

test('catchError inside: checkpoints follow the narration and speaker notes, and rewind is deterministic',async()=>{
 const {c,render}=await deck(),ids=['subscribe','click-a','request','error','fallback','click-b'];
 assert.deepEqual(Array.from(c.stops,s=>s.id),ids);
 const f=Object.fromEntries(c.stops.map(s=>[s.id,c.snapshot(s.time)]));
 assert.equal(rows(c.snapshot(0)).length,0);
 assert.equal(rows(f.subscribe).length,0);assert.ok(f.subscribe.nodes.find(n=>n.id==='observer').laneStates.length);
 assert.equal(row(f['click-a'],'#1').stages[0].state,'active');
 assert.ok(row(f.request,'#1').stages[0].progress>.2&&row(f.request,'#1').stages[0].progress<1);
 assert.equal(row(f.error,'#1').stages[0].state,'errored');
 assert.deepEqual(received(f.fallback),['[]']);assert.equal(row(f.fallback,'#1').state,'completed');
 assert.equal(row(f['click-b'],'#2').stages[0].state,'active');
 const html=fs.readFileSync('index.html','utf8');
 const template=html.match(/<template data-checkpoint-notes="b04-catcherror-2">([\s\S]*?)<\/template>/)[1];
 assert.deepEqual([...template.matchAll(/data-checkpoint="([^"]+)"/g)].map(m=>m[1]),['ready',...ids,'finished']);
 for(const time of [0,...c.stops.map(s=>s.time),c.duration]){
  const frame=JSON.stringify(c.snapshot(time));c.snapshot(c.duration);c.snapshot(0);
  assert.equal(JSON.stringify(c.snapshot(time)),frame);
  assert.doesNotMatch(render(c.snapshot(time)),/NaN|Infinity|="undefined"/);
 }
});

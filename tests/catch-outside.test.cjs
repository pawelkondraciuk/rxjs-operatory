const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {modules}=require('./v2-harness.cjs');
// b04-catcherror: catchError za switchMap w tym samym wyglądzie co catchError wewnątrz. Góra klik$ → switchMap → catchError → S1,
// w dolnej części instancja HTTP GET → inbox. Błąd A przechodzi przez switchMap, catchError odłącza klik$,
// subskrybuje of([]) ([] i complete do S1), a klik B nie uruchamia HTTP.
async function deck(format='4:3'){
 const m=await modules(['catalog','scene-config','engine','renderer']);
 const configure=(id,extra)=>m['scene-config'].configureScene({...m.catalog.scenes.find(s=>s.id===id),...extra,format});
 const scene=configure('b04-catcherror',{catchInside:false,id:'b04-catcherror',rendererId:'b04-catcherror'});
 const inside=configure('b04-catcherror',{catchInside:true,id:'b04-catcherror-2',rendererId:'b04-catcherror'});
 return {scene,c:m.engine.compileScene(scene),inside:m.engine.compileScene(inside),render:m.renderer.renderScene};
}
const at=(c,type,edge,value)=>c.events.find(e=>e.type===type&&e.edge===edge&&(value===undefined||e.value===value)).at;
const received=f=>Array.from(f.histories.find(h=>h.anchor==='observer').values,v=>v.value);
const row=f=>f.innerWorkPanels[0].rows[0];
const lane=(f,id)=>f.nodes.find(n=>n.id===id).laneStates[0];
const top=f=>f.nodes.filter(n=>['source','op','catch','observer'].includes(n.id));

test('catchError outside: four-tile top pipeline on one port axis and an HTTP GET → inbox instance below',async()=>{
 for(const format of ['4:3','16:9']){
  const {scene,c,inside,render}=await deck(format),f=c.snapshot(c.duration),g=inside.snapshot(inside.duration);
  assert.equal(scene.title,'catchError na zewnątrz');
  assert.deepEqual(Array.from(top(f),n=>n.label),['klik$','switchMap','catchError','']);
  // Ten sam design co wewnątrz: nagłówki, tło wierszy, wysokości, odbiorca S1 i paleta kabli.
  const look=n=>JSON.stringify([n.y-n.h/2,n.defH,n.rowH,n.headerFill,n.runtimeFill]);
  for(const id of ['source','op','observer'])assert.equal(look(f.nodes.find(n=>n.id===id)),look(g.nodes.find(n=>n.id===id)),format+' '+id);
  assert.equal(look(f.nodes.find(n=>n.id==='catch')),look(g.nodes.find(n=>n.id==='op')),format);
  const ys=f.edges.filter(e=>e.subscriber).flatMap(e=>e.points.map(p=>p[1]));
  assert.equal(new Set(ys).size,1,'wszystkie porty na wspólnej osi Y');
  assert.ok(f.edges.filter(e=>e.subscriber).every(e=>e.subscriber==='S1'));
  const panel=f.innerWorkPanels[0];
  assert.equal(panel.instances,true);assert.equal(panel.label,undefined,'bez dużego napisu nad pracami');assert.equal(panel.frameless,true);
  assert.deepEqual(Array.from(panel.columns,col=>col.label),['HTTP GET']);
  assert.deepEqual(Array.from(panel.rows,r=>r.id+' · '+r.value),['#1 · A']);
  const svg=render(f);
  assert.equal((svg.match(/data-inner-header=/g)||[]).length,1);assert.equal((svg.match(/data-inner-receiver=/g)||[]).length,1);
  assert.match(svg,/>inner #1</);assert.doesNotMatch(svg,/data-inner-name|>#1 · A</);
  assert.doesNotMatch(svg,/data-inner-header="catch"|data-panel-box/);
  assert.equal(c.snapshot(0).innerWorkPanels[0].rows.length,0,'READY: pusty panel prac');
 }
});

test('catchError outside: HTTP A errors (no complete), the error crosses switchMap into catchError and never reaches S1',async()=>{
 const {c}=await deck();
 const http=c.plan.records.get('inner0-op'),forward=c.plan.records.get('op-catch'),result=c.plan.records.get('catch-observer');
 assert.equal(http.end.kind,'error');assert.equal(forward.end.kind,'error');assert.equal(result.end.kind,'complete');
 assert.ok(!c.events.some(e=>e.type==='stream-complete'&&e.edge==='inner0-op'),'HTTP A bez complete');
 assert.ok(at(c,'stream-error','op-catch')>=at(c,'disconnected','inner0-op'),'błąd przechodzi przez inbox i switchMap');
 const pulse=c.snapshot(at(c,'stream-error','inner0-op')+.4);
 assert.equal(row(pulse).wires[0].pulse.color,'#C54848');assert.equal(row(pulse).stages[0].state,'errored');
 const relay=c.snapshot(at(c,'stream-error','op-catch')+.4);
 assert.equal(relay.edges.find(e=>e.id==='op-catch').pulse.color,'#C54848','czerwony impuls switchMap → catchError');
 assert.equal(row(relay).receiver.state,'errored');
 for(const t of [at(c,'disconnected','op-catch'),c.duration])assert.equal(lane(c.snapshot(t),'observer').state==='error',false);
});

test('catchError outside: teardown detaches klik$ and switchMap (grey, no complete), then of([]) emits [] and completes into S1',async()=>{
 const {c,render}=await deck();
 const source=c.plan.records.get('source-op');
 assert.equal(source.end.kind,'unsubscribe');assert.ok(source.cancelPulse);
 assert.ok(source.end.at>=at(c,'disconnected','op-catch'),'teardown po dotarciu błędu do catchError');
 const caught=c.snapshot(at(c,'disconnected','source-op')+.1);
 assert.equal(lane(caught,'source').state,'cancelled');assert.equal(lane(caught,'op').state,'cancelled');
 assert.equal(lane(caught,'catch').state,'running');assert.equal(lane(caught,'observer').state,'running');
 assert.equal(caught.nodes.find(n=>n.id==='op').workState==='errored',false);
 assert.deepEqual(received(caught),[]);
 // Chwilowe of([]) w wierszu catchError, zanim [] wyjdzie do S1.
 const sent=at(c,'source-next','catch-observer','[]'),fallback=c.snapshot(sent-.05);
 assert.equal(lane(fallback,'catch').fallback.label,'of([])');assert.match(render(fallback),/data-lane-fallback="of\(\[\]\)"/);
 assert.equal(lane(caught,'catch').fallback,undefined);
 const delivered=at(c,'deliver-next','catch-observer','[]');
 assert.deepEqual(received(c.snapshot(delivered-.001)),[]);assert.deepEqual(received(c.snapshot(delivered)),['[]']);
 const end=c.snapshot(c.duration);
 assert.equal(lane(end,'catch').state,'completed');assert.equal(lane(end,'observer').state,'completed');
 assert.equal(lane(end,'catch').fallback,undefined);
 for(const id of ['source','op'])assert.equal(lane(end,id).state,'cancelled',id);
 assert.ok(!c.events.some(e=>e.type==='stream-complete'&&['source-op','op-catch'].includes(e.edge)),'klik$ i switchMap bez complete');
});

test('catchError outside: click B appears in the detached klik$, never reaches switchMap and starts no HTTP',async()=>{
 const {c}=await deck(),click=c.events.find(e=>e.type==='source-unobserved');
 assert.equal(click.value,'B');assert.ok(click.at>at(c,'disconnected','catch-observer'));
 assert.ok(!c.events.some(e=>e.edge==='source-op'&&e.value==='B'),'B nie dociera do switchMap');
 assert.ok(!c.events.some(e=>e.type==='inner-create'&&e.node!=='inner0'));
 const shown=c.snapshot(click.at+.5),token=shown.tokens.find(t=>t.phase==='unobserved');
 assert.equal(token.value,'B');assert.equal(token.opacity,1);
 const source=shown.nodes.find(n=>n.id==='source');
 assert.ok(token.x<source.x+source.w/2&&token.x>source.x-source.w/2&&token.y===source.laneStates[0].y);
 const end=c.snapshot(c.duration);
 assert.equal(end.tokens.some(t=>t.phase==='unobserved'),false,'B gaśnie');
 assert.equal(end.executionCounts.started,1);assert.deepEqual(received(end),['[]']);
 assert.equal(end.innerWorkPanels[0].rows.length,1);
});

test('catchError outside: checkpoints follow the narration and speaker notes, code marks and rewind are deterministic',async()=>{
 const {scene,c,render}=await deck(),ids=['error','caught','fallback','click-b'];
 assert.deepEqual(Array.from(c.stops,s=>s.id),ids);
 assert.equal(scene.code,'klik$.pipe(switchMap(id =>\n  httpGet(url(id))), catchError(() => of([])))');
 const f=Object.fromEntries(c.stops.map(s=>[s.id,c.snapshot(s.time)]));
 // Końcowy slajd: pierwsze dalej od razu przechodzi klik A, krótki HTTP i błąd.
 const working=c.snapshot(at(c,'inner-subscribe','inner0-op')+.3);
 assert.equal(lane(working,'observer').state,'running');assert.equal(row(working).stages[0].state,'active');
 assert.ok(row(working).stages[0].progress>0);assert.equal(f.error.executionCounts.started,1);
 assert.ok(at(c,'stream-error','inner0-op')-at(c,'inner-subscribe','inner0-op')<=1.05,'HTTP trwa ok. 1 s');
 assert.ok(c.duration<11,'krótki slajd końcowy');
 assert.equal(row(f.error).stages[0].state,'errored');assert.equal(lane(f.error,'source').state,'running');
 assert.equal(lane(f.caught,'source').state,'cancelled');assert.deepEqual(received(f.caught),[]);
 assert.deepEqual(received(f.fallback),['[]']);assert.equal(lane(f.fallback,'observer').state,'completed');
 assert.ok(f['click-b'].tokens.some(t=>t.phase==='unobserved'&&t.value==='B'));
 const marks=frame=>Array.from(frame.codeView.flat().filter(p=>p.active),p=>p.mark.id);
 assert.deepEqual(marks(working),['http']);
 assert.deepEqual(marks(c.snapshot(at(c,'source-next','catch-observer','[]'))),['catch']);
 const html=fs.readFileSync('index.html','utf8');
 const template=html.match(/<template data-checkpoint-notes="b04-catcherror">([\s\S]*?)<\/template>/)[1];
 assert.deepEqual([...template.matchAll(/data-checkpoint="([^"]+)"/g)].map(m=>m[1]),['ready',...ids,'finished']);
 assert.match(template,/catchError znajduje się na zewnątrz switchMap/);
 for(const time of [0,...c.stops.map(s=>s.time),c.duration]){
  const frame=JSON.stringify(c.snapshot(time));c.snapshot(c.duration);c.snapshot(0);
  assert.equal(JSON.stringify(c.snapshot(time)),frame);
  assert.doesNotMatch(render(c.snapshot(time)),/NaN|Infinity|="undefined"/);
 }
});

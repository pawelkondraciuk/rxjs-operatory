const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');

async function loadAll(){
 const context=vm.createContext({}),cache=new Map();
 async function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file);
  const m=new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{context,identifier:file});cache.set(file,m);
  await m.link((s,p)=>load(path.resolve(path.dirname(p.identifier),s)));return m;}
 const model=await load('animations/prototype-scenes.js'),engine=await load('animations/engine.js'),render=await load('animations/renderer.js');
 for(const m of [model,engine,render])await m.evaluate();
 return {scenes:model.namespace.prototypeScenes,compile:engine.namespace.compileScene,render:render.namespace.renderScene};
}
const values=c=>Array.from(c.snapshot(c.duration).histories.find(h=>h.anchor==='observer').values,v=>v.value);

test('prototypes preserve shared inputs and derive executions only from subscriptions',async()=>{
 const {scenes,compile}=await loadAll();
 const a=scenes.find(s=>s.id==='prototype-concatMap'),b=scenes.find(s=>s.id==='prototype-switchMap');
 assert.deepEqual(Array.from(a.rows[0].events,v=>[v.at,v.value]),Array.from(b.rows[0].events,v=>[v.at,v.value]));
 const c=compile(a),question=c.snapshot(c.stops.at(-1).time);
 assert.equal(question.executionCounts.started,1);
 assert.equal(question.executionCounts.active,1);
 assert.deepEqual(values(c),['A1','A2','B1','B2','C1','C2','D1','D2']);
 const sw=compile(b),final=sw.snapshot(sw.duration);
 assert.deepEqual(values(sw),['D']);
 assert.equal(final.executionCounts.cancelled,3);
 assert.ok(final.executions.filter(e=>e.state==='cancelled').every(e=>e.progress<1));
});

test('inner HTTP error recovers with fallback and complete while later C executes',async()=>{
 const {scenes,compile}=await loadAll(),c=compile(scenes.find(s=>s.id==='prototype-switch-catch'));
 const error=c.events.find(e=>e.type==='http-error'&&e.execution==='B');
 const handled=c.events.find(e=>e.type==='catch-handle'&&e.execution==='B');
 assert.ok(error.at<handled.at);
 let b=c.snapshot(handled.at+.001).executions.find(e=>e.id==='B');
 assert.equal(b.httpState,'error');assert.equal(b.handledError,true);assert.equal(b.state,'running');
 const final=c.snapshot(c.duration);b=final.executions.find(e=>e.id==='B');
 assert.equal(b.state,'completed');assert.equal(b.httpState,'error');assert.equal(b.handledError,true);
 assert.deepEqual(values(c),['fallback B','C']);
});

test('moving catchError outside concatMap discards waiting C',async()=>{
 const {scenes,compile}=await loadAll();
 const inside=compile(scenes.find(s=>s.id==='prototype-concat-catch-inner'));
 const outside=compile(scenes.find(s=>s.id==='prototype-concat-catch-outer'));
 assert.deepEqual(values(inside),['A','fallback B','C']);
 assert.deepEqual(values(outside),['A','fallback']);
 assert.equal(inside.snapshot(inside.duration).executionCounts.started,3);
 assert.equal(outside.snapshot(outside.duration).executionCounts.started,2);
 assert.equal(outside.snapshot(outside.duration).nodes.find(n=>n.id==='observer').notification,'complete');
 assert.ok(outside.events.some(e=>e.type==='queue-discard'&&e.value==='C'));
 assert.ok(!outside.snapshot(outside.duration).executions.some(e=>e.id==='C'));
});

test('control scenarios suppress cancelled fallbacks, propagate error and accept EMPTY',async()=>{
 const {scenes,compile}=await loadAll();
 const cancelled=compile(scenes.find(s=>s.id==='prototype-cancel-before-error'));
 assert.deepEqual(values(cancelled),['C']);
 assert.ok(!cancelled.events.some(e=>['http-error','catch-handle','fallback-next'].includes(e.type)&&e.execution==='B'));
 const error=compile(scenes.find(s=>s.id==='prototype-uncaught-error'));
 assert.deepEqual(values(error),[]);
 assert.equal(error.snapshot(error.duration).nodes.find(n=>n.id==='observer').notification,'error');
 assert.equal(error.snapshot(error.duration).executionCounts.started,2);
 assert.notEqual(error.snapshot(error.duration).nodes.find(n=>n.id==='source').status,'complete');
 const empty=compile(scenes.find(s=>s.id==='prototype-empty-recovery'));
 assert.deepEqual(values(empty),['C']);
 assert.equal(empty.snapshot(empty.duration).executions.find(e=>e.id==='B').state,'completed');
});

test('all prototype checkpoints and event frames have stable geometry and deterministic rewinds',async()=>{
 const {scenes,compile,render}=await loadAll();
 for(const scene of scenes){
  const c=compile(scene),ready=c.snapshot(0);
  assert.equal(ready.executionCounts.started,0);assert.equal(ready.executions.length,0);
  assert.equal(scene.playback.finish,'hold');
  const times=[0,...c.stops.map(s=>s.time),...c.events.map(e=>e.at),c.duration];
  assert.ok(c.stops.every((s,i)=>s.time>=0&&s.time<=c.duration&&(!i||s.time>c.stops[i-1].time)));
  const geometry=f=>Array.from(f.nodes,n=>[n.id,n.x,n.y,n.w,n.h]);
  for(const t of times){
   const direct=JSON.stringify(c.snapshot(t));c.snapshot(c.duration);c.snapshot(0);
   assert.equal(JSON.stringify(c.snapshot(t)),direct);
   assert.deepEqual(geometry(c.snapshot(t)),geometry(ready));
   assert.doesNotMatch(render(c.snapshot(t)),/NaN|Infinity|="undefined"/);
  }
  // Historia odbiorcy leży w panelu EMISJE pod jego kafelkiem.
  const f=c.snapshot(c.duration),h=f.histories.find(h=>h.anchor==='observer'),n=f.nodes.find(n=>n.id===h.anchor);
  const panel=f.panels.find(p=>p.from?.x===n.x);
  assert.ok(panel.y>n.y+n.h/2&&h.y-22>panel.y&&h.y+22+(h.lines-1)*h.lineStep<panel.y+panel.h);
 }
});

test('concatMap keeps one slot per value: queued, running, then complete',async()=>{
 const {scenes,compile,render}=await loadAll();
 const c=compile(scenes.find(s=>s.id==='prototype-concatMap'));
 const rowsAt=time=>Array.from(render(c.snapshot(time)).matchAll(/data-execution="(\w+)" data-row-type="(\w+)" data-inner-state="(\w+)"[^>]*opacity="([\d.]+)"[^]*?<text[^>]*>([^<]+)<\/text>/g),
  m=>({id:m[1],type:m[2],state:m[3],opacity:Number(m[4]),label:m[5]}));
 const pick=rows=>rows.map(r=>[r.label,r.state]);
 assert.deepEqual(pick(rowsAt(c.stops.find(s=>s.id==='question').time)),[['B (wartość)','queued'],['A$','running']]);
 assert.deepEqual(pick(rowsAt(c.duration)),[['A$','completed'],['B$','completed'],['C$','completed'],['D$','completed']]);
 for(const e of c.events){
  const rows=rowsAt(e.at+.01),ids=new Set(rows.map(r=>r.id));
  assert.ok(ids.size<=4);
  // Ten sam slot pokazuje najwyżej dwa wiersze naraz: przejście „B (wartość)” → B$ podczas fade-in.
  for(const id of ids){const same=rows.filter(r=>r.id===id);assert.ok(same.length===1||same.length===2&&same.some(r=>r.opacity<1),'slot '+id+' @'+e.at);}
 }
});

test('outer catchError keeps discarded C$ row visible after the error',async()=>{
 const {scenes,compile,render}=await loadAll();
 const c=compile(scenes.find(s=>s.id==='prototype-concat-catch-outer'));
 const svg=render(c.snapshot(c.duration));
 assert.match(svg,/data-inner-state="dropped"/);
 assert.match(svg,/× porzucona/);
});

test('prototype bars never stall and emissions leave the operator, not the work row',async()=>{
 const {scenes,compile}=await loadAll();
 const c=compile(scenes.find(s=>s.id==='prototype-concatMap'));
 for(const id of ['A','B']) {
  const start=c.events.find(e=>e.type==='inner-subscribe'&&e.execution===id).at;
  const end=c.events.find(e=>e.type==='stream-complete'&&e.execution===id).at;
  let previous=-1;
  for(let t=start+.05;t<end;t+=.1){
   const row=c.snapshot(t).executions.find(e=>e.id===id);
   assert.equal(row.state,'running');assert.ok(row.progress>previous,id+' stoi w '+t);previous=row.progress;
  }
  const done=c.snapshot(end).executions.find(e=>e.id===id);
  assert.equal(done.state,'completed');assert.equal(done.progress,1);
 }
 const inner=c.plan.records.get('inner0-op').events[0],out=c.plan.records.get('op-observer').events[0];
 assert.ok(inner.arrival-inner.at<.2);
 assert.ok(!c.snapshot((inner.at+inner.arrival)/2).tokens.some(t=>t.edge==='inner0-op'));
 assert.ok(c.snapshot((out.at+out.arrival)/2).tokens.some(t=>t.edge==='op-observer'&&t.value==='A1'));
});

test('emissions stack in one column and received values fill two columns in arrival order',async()=>{
 const {scenes,compile,render}=await loadAll();
 // Środek każdej kapsułki historii: x z prostokąta (x + width/2), y z prostokąta (y + 23).
 const capsules=(svg,from,to)=>Array.from(svg.matchAll(/data-token="received"[^>]*>(?:<title>[^<]*<\/title>)?<rect x="([\d.-]+)" y="([\d.-]+)" width="([\d.]+)"[^]*?<text[^>]*>([^<]+)</g),
  m=>({x:Number(m[1])+Number(m[3])/2,y:Number(m[2])+23,value:m[4]})).filter(c=>c.x>=from&&c.x<=to);
 const merge=compile(scenes.find(s=>s.id==='prototype-mergeMap')),svg=render(merge.snapshot(merge.duration));
 const source=capsules(svg,0,300),received=capsules(svg,900,1240);
 assert.deepEqual(source.map(c=>c.value),['A','B','C','D']);
 assert.equal(new Set(source.map(c=>c.x)).size,1);
 assert.deepEqual(received.map(c=>c.value),['A1','A2','B1','B2','C1','D1','D2','C2']);
 received.forEach((c,i)=>{assert.equal(c.x,received[i%2].x);assert.equal(c.y,received[2*Math.floor(i/2)].y);});
 assert.ok(received[0].x<received[1].x&&received[0].y<received[2].y);
 const sw=compile(scenes.find(s=>s.id==='prototype-switch-catch')),fallback=capsules(render(sw.snapshot(sw.duration)),900,1240);
 // Szeroki fallback B zajmuje całą linię, C ląduje pod nim.
 assert.deepEqual(fallback.map(c=>c.value),['fallback B','C']);
 assert.ok(fallback[1].y>fallback[0].y);
});

test('mergeMap runs inner in parallel and exhaustMap shows skipped inputs without inner',async()=>{
 const {scenes,compile,render}=await loadAll();
 const merge=compile(scenes.find(s=>s.id==='prototype-mergeMap'));
 assert.equal(Math.max(...merge.events.map(e=>merge.snapshot(e.at).executionCounts.active)),3);
 assert.equal(merge.snapshot(merge.duration).executionCounts.completed,4);
 // Odbiór w kolejności dotarcia: C i D się przeplatają, D kończy przed C.
 const received=merge.snapshot(merge.duration).histories.find(h=>h.anchor==='observer').values;
 assert.deepEqual(Array.from(received,v=>v.value),['A1','A2','B1','B2','C1','D1','D2','C2']);
 assert.ok(received.every(v=>v.line===undefined));
 const done=id=>merge.events.find(e=>e.type==='stream-complete'&&e.execution===id).at;
 assert.ok(done('D')<done('C'));
 const exhaust=compile(scenes.find(s=>s.id==='prototype-exhaustMap')),end=exhaust.snapshot(exhaust.duration);
 assert.deepEqual(Array.from(end.executions,e=>e.id+':'+e.node),['A:inner0','D:inner3']);
 assert.equal(end.executionCounts.started,2);
 const svg=render(end);
 assert.equal((svg.match(/data-row-type="ignored"/g)||[]).length,2);
 assert.ok(!/PRACE WEWNĘTRZNE|EMISJE|ODBIÓR|inner\$: HTTP/.test(svg));
});

test('work rows stack from the top of the panel in a fixed four-slot grid',async()=>{
 const {scenes,compile}=await loadAll();
 for(const scene of scenes){
  const panel=compile(scene).snapshot(0).panels.find(p=>p.id==='jobs');
  assert.equal(panel.rowsTop,panel.y+16);
  assert.ok(Math.abs(panel.rowStep-(panel.rowHeight+16))<1e-9,scene.id);
  assert.ok(Math.abs(panel.rowsTop+3*panel.rowStep+panel.rowHeight-(panel.y+panel.h-16))<1e-9,scene.id);
 }
});

test('emitted and received capsules fade in from the moment they appear',async()=>{
 const {scenes,compile,render}=await loadAll();
 const c=compile(scenes.find(s=>s.id==='prototype-concatMap'));
 const opacity=(time,value)=>Number(new RegExp('data-token="received" opacity="([\\d.]+)">(?:<title>[^<]*</title>)?<rect[^>]*/><text[^>]*>'+value+'<').exec(render(c.snapshot(time)))?.[1]);
 const sent=c.plan.records.get('source-op').events.find(v=>v.value==='B'),got=c.plan.records.get('op-observer').events.find(v=>v.value==='A1');
 assert.ok(opacity(sent.at+.1,'B')>0&&opacity(sent.at+.1,'B')<1);
 assert.equal(opacity(sent.at+.4,'B'),1);
 assert.ok(opacity(got.arrival+.1,'A1')<1);
 assert.equal(opacity(got.arrival+.4,'A1'),1);
});

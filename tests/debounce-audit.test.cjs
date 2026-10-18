const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {modules}=require('./v2-harness.cjs');
// 16-czas-cztery (MAIN): dwa potoki jeden pod drugim — zdarzenia$ → debounceTime → S1 i zdarzenia$ → auditTime → S2.
// Te same zdarzenia A 0, B 1, C 2, D 4, E 5 (s scenariusza); timery w wierszach operatorów, czas modelu.
async function deck(format='4:3'){
 const m=await modules(['catalog','scene-config','engine','renderer']);
 const scene=m['scene-config'].configureScene({...m.catalog.scenes.find(s=>s.id==='16-czas-cztery'),seriesIndices:[1,2],format});
 return {scene,c:m.engine.compileScene(scene),render:m.renderer.renderScene};
}
const stop=(c,id)=>c.snapshot(c.stops.find(s=>s.id===id).time);
const lane=(f,id)=>f.nodes.find(n=>n.id===id).laneStates[0];
const received=(f,anchor)=>Array.from(f.histories.find(h=>h.anchor===anchor).values,v=>v.value);

test('two straight pipelines with S1/S2 lanes, aligned columns and no fork or time chart',async()=>{
 for(const format of ['4:3','16:9']){
  const {scene,c,render}=await deck(format),f=c.snapshot(0);
  assert.equal(scene.title,'debounceTime i auditTime: cisza czy okno?');
  assert.equal(scene.code,'zdarzenia$.pipe(debounceTime(3500))\nzdarzenia$.pipe(auditTime(3500))');
  const row=ids=>ids.map(id=>f.nodes.find(n=>n.id===id));
  const [top,bottom]=[row(['src1','deb','obs1']),row(['src2','aud','obs2'])];
  assert.deepEqual(Array.from(top,n=>n.label),['zdarzenia$','debounceTime','']);
  assert.deepEqual(Array.from(bottom,n=>n.label),['zdarzenia$','auditTime','']);
  top.forEach((n,i)=>{assert.equal(n.x,bottom[i].x);assert.equal(n.w,bottom[i].w);assert.ok(bottom[i].y>n.y);});
  assert.ok(bottom.every(n=>n.y+n.h/2<=f.height));
  for(const e of f.edges){assert.equal(new Set(e.points.map(p=>p[1])).size,1,e.id+' prosty przewód');}
  assert.deepEqual(Array.from(f.edges,e=>e.subscriber),['S1','S1','S2','S2']);
  assert.ok(f.nodes.every(n=>!n.laneStates?.length||n.laneStates[0].state==='running'),'S1/S2 aktywne w READY');
  assert.equal(f.tokens.length,0);assert.equal((f.callouts||[]).length,0);
  for(const id of ['deb','aud'])assert.equal(lane(f,id).timer.active,false);
  const svg=render(f);
  assert.doesNotMatch(svg,/data-panel-box|data-hub-link/);
  assert.equal(f.histories.length,2);assert.ok(f.histories.every(h=>h.balls&&h.values.length===0));
 }
});

test('every event reaches both operators at the same moment; outputs C, E (audit) and E (debounce), no complete',async()=>{
 const {c}=await deck(),rec=id=>c.plan.records.get(id);
 const timeline=id=>Array.from(rec(id).events,e=>[e.value,e.logicalAt,e.at,e.arrival,e.color].join());
 assert.deepEqual(timeline('src1-deb'),timeline('src2-aud'));
 assert.deepEqual(Array.from(rec('src1-deb').events,e=>e.value),['A','B','C','D','E']);
 const t0=rec('src1-deb').events[0].logicalAt;
 const out=id=>Array.from(rec(id).events,e=>e.value+'@'+(e.logicalAt-t0).toFixed(1));
 assert.deepEqual(out('aud-obs2'),['C@3.5','E@7.5']);assert.deepEqual(out('deb-obs1'),['E@8.5']);
 assert.ok(Array.from(c.plan.records.values()).every(r=>!r.end),'bez complete');
 const end=c.snapshot(c.duration);
 assert.deepEqual(received(end,'obs1'),['E']);assert.deepEqual(received(end,'obs2'),['C','E']);
 // Ten sam kolor wartości w obu potokach.
 const colour=(id,v)=>rec(id).events.find(e=>e.value===v).color;
 assert.equal(colour('src1-deb','E'),colour('deb-obs1','E'));assert.equal(colour('src2-aud','C'),colour('aud-obs2','C'));
});

test('debounce restarts its lane timer on every value, audit keeps the window; checkpoints match the scenario',async()=>{
 const {c,render}=await deck();
 assert.deepEqual(Array.from(c.stops,s=>s.id),['a','b','c','audit-c','d','e','audit-e']);
 const f=Object.fromEntries(c.stops.map(s=>[s.id,c.snapshot(s.time)]));
 const t=(frame,id)=>lane(frame,id).timer,mem=(frame,id)=>lane(frame,id).memory.value;
 for(const id of ['a','b','c','d','e'])assert.ok(t(f[id],'deb').progress<.2,'debounce od nowa przy '+id);
 assert.ok(t(f.a,'aud').progress<.2);assert.ok(t(f.b,'aud').progress>t(f.a,'aud').progress+.2);
 assert.ok(t(f.c,'aud').progress>t(f.b,'aud').progress+.2,'audit nie resetuje okna');
 assert.ok(t(f.d,'aud').progress<.2,'D otwiera drugie okno');assert.ok(t(f.e,'aud').progress>.25);
 for(const id of ['a','b','c','d','e'])for(const op of ['deb','aud'])assert.equal(mem(f[id],op),id.toUpperCase(),op+' pamięta '+id);
  // Pamięć to jedna zwykła kulka przed portem wyjścia, bez prostokąta i etykiety pamięć.
 for(const id of ['a','b','c','d','e']){
  const svg=render(f[id]),kept=[...svg.matchAll(/<g data-lane-memory="([^"]*)" data-token="memory"><circle cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)"/g)];
  assert.deepEqual(kept.map(m=>m[1]),[id.toUpperCase(),id.toUpperCase()]);assert.doesNotMatch(svg,/pamięć|bufor/);
  for(const [m,op] of kept.map((m,i)=>[m,['deb','aud'][i]])){
   const n=f[id].nodes.find(n=>n.id===op);
   assert.equal(+m[4],f[id].ball.r);assert.ok(+m[2]+ +m[4]<n.x+n.w/2&&+m[2]>n.x);assert.equal(+m[3],n.laneStates[0].y);
  }
 }
 // Nowa wartość dojeżdża przez wiersz do kulki pamięci i dopiero wtedy zastępuje poprzednią.
 const arrivalB=c.events.find(e=>e.type==='deliver-next'&&e.edge==='src1-deb'&&e.value==='B').at,gliding=c.snapshot(arrivalB+.2);
 assert.equal(mem(gliding,'deb'),'A');assert.equal(gliding.tokens.filter(t=>t.phase==='store'&&t.value==='B').length,2);
 // Po emisji kulka opuszcza operator: pamięć pusta, kulka leci do odbiorcy.
 const sent=c.events.find(e=>e.type==='source-next'&&e.edge==='aud-obs2'&&e.value==='C').at,leaving=c.snapshot(sent+.3);
 assert.equal(mem(leaving,'aud'),undefined);assert.equal(mem(leaving,'deb'),'C');
 assert.ok(leaving.tokens.some(t=>t.edge==='aud-obs2'&&t.value==='C'));
 assert.match(t(f.c,'deb').text,/^cisza: \d,\d s$/);assert.match(t(f.c,'aud').text,/^okno: \d,\d s$/);
 assert.deepEqual(received(f.c,'obs1'),[]);assert.deepEqual(received(f.c,'obs2'),[]);
 assert.deepEqual(received(f['audit-c'],'obs2'),['C']);assert.deepEqual(received(f['audit-c'],'obs1'),[]);
 assert.equal(t(f['audit-c'],'aud').active,false);assert.equal(t(f['audit-c'],'deb').active,true);
 assert.deepEqual(received(f['audit-e'],'obs2'),['C','E']);assert.deepEqual(received(f['audit-e'],'obs1'),[]);
 assert.equal(t(f['audit-e'],'deb').active,true);
 // Overlay next(X) · czas tylko przy emisji; wartości docierają do obu operatorów razem.
 assert.deepEqual(Array.from(f.c.callouts,c=>c.text),['next(C) · 2,0 s']);
 assert.equal((f['audit-c'].callouts||[]).length,0);
 const travel=c.snapshot(c.events.find(e=>e.type==='source-next'&&e.value==='C').at+.3).tokens;
 assert.equal(travel.length,2);assert.equal(travel[0].x,travel[1].x);
 // Timer stoi podczas przelotu (czas modelu) i płynie między zdarzeniami.
 const flight=c.events.find(e=>e.type==='source-next'&&e.edge==='src2-aud'&&e.value==='B');
 assert.equal(t(c.snapshot(flight.at+.1),'aud').progress,t(c.snapshot(flight.at+.6),'aud').progress);
 assert.doesNotMatch(render(f.c),/NaN|Infinity|="undefined"/);
});

test('speaker notes follow the checkpoints; rewind and reset restore values and timers in both formats',async()=>{
 const html=fs.readFileSync('index.html','utf8');
 const template=html.match(/<template data-checkpoint-notes="16-czas-cztery">([\s\S]*?)<\/template>/)[1];
 assert.deepEqual([...template.matchAll(/data-checkpoint="([^"]+)"/g)].map(m=>m[1]),['ready','a','b','c','audit-c','d','e','audit-e','finished']);
 for(const format of ['4:3','16:9']){
  const {c,render}=await deck(format);
  for(const time of [0,...c.stops.map(s=>s.time),c.duration]){
   const frame=JSON.stringify(c.snapshot(time));c.snapshot(c.duration);c.snapshot(0);
   assert.equal(JSON.stringify(c.snapshot(time)),frame);
   assert.doesNotMatch(render(c.snapshot(time)),/NaN|Infinity|="undefined"/);
  }
 }
});

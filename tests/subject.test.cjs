const {test}=require('node:test');
const assert=require('node:assert/strict');
const {modules,playbackHarness}=require('./v2-harness.cjs');
const values=(frame,anchor)=>Array.from(frame.histories.find(h=>h.anchor===anchor).values,v=>v.value);
async function subject(){
  const m=await modules(['catalog','scene-config','engine','renderer']);
  const base=m.catalog.scenes.find(s=>s.id==='05-zrodla');
  const scene=m['scene-config'].configureScene({...base,id:'05-zrodla-3',rendererId:'05-zrodla',sourceExample:2,
    title:'Subject: odbierasz od chwili subskrypcji',code:'subject$.subscribe(observer)',duration:20});
  return {scene,base,m,compiled:m.engine.compileScene(scene)};
}

test('Subject shows both empty histories in READY and emits A without any subscription',async()=>{
  const {compiled:c}=await subject(),ready=c.snapshot(0);
  assert.equal(ready.panels.length,2);assert.equal(ready.histories.length,2);
  assert.deepEqual(values(ready,'source'),[]);assert.deepEqual(values(ready,'sink'),[]);
  assert.ok(ready.nodes.every(n=>n.visible));assert.ok(ready.edges.every(e=>!e.visible));
  const emitted=c.snapshot(c.stops[0].time);
  assert.equal(c.stops[0].id,'unobserved');assert.deepEqual(values(emitted,'source'),['A']);
  assert.deepEqual(values(emitted,'sink'),[]);assert.ok(emitted.edges.every(e=>!e.visible));
  assert.ok(emitted.tokens.some(t=>t.value==='A'&&t.phase==='unobserved'));
  assert.equal(c.events.filter(e=>e.type==='source-next'&&e.node==='source'&&e.value==='A').length,1);
  assert.equal(c.events.some(e=>e.type==='deliver-next'&&e.value==='A'),false);
});

test('late subscription does not replay A and B appears in emission history before arriving at the receiver',async()=>{
  const {compiled:c}=await subject(),connected=c.snapshot(c.stops[1].time);
  assert.equal(c.stops[1].id,'subscribed');assert.deepEqual(values(connected,'source'),['A']);
  assert.deepEqual(values(connected,'sink'),[]);
  assert.ok(connected.edges.every(e=>e.visible&&e.phase==='subscribed'));
  const b=c.plan.records.get('source-sink').events.find(e=>e.value==='B');
  const travelling=c.snapshot((b.at+b.arrival)/2);
  assert.deepEqual(values(travelling,'source'),['A','B']);assert.deepEqual(values(travelling,'sink'),[]);
  assert.deepEqual(values(c.snapshot(b.arrival-1e-6),'sink'),[]);
  assert.deepEqual(values(c.snapshot(b.arrival),'sink'),['B']);
  const first=c.snapshot(c.stops[2].time);
  assert.equal(c.stops[2].id,'first');assert.deepEqual(values(first,'source'),['A','B']);assert.deepEqual(values(first,'sink'),['B']);
});

test('final histories show exactly three emissions and two receipts without ending Subject',async()=>{
  const {compiled:c,m}=await subject(),final=c.snapshot(c.duration);
  assert.deepEqual(values(final,'source'),['A','B','C']);assert.deepEqual(values(final,'sink'),['B','C']);
  assert.match(final.caption,/Wyemitowane: 3.*Odebrane: 2/);
  assert.ok(final.nodes.every(n=>n.notification===null&&!n.showProgress));
  assert.ok(final.edges.every(e=>e.visible&&e.phase==='subscribed'));
  assert.equal(c.events.some(e=>e.type==='stream-complete'||e.type==='inner-unsubscribe'),false);
  const svg=m.renderer.renderScene(final);assert.doesNotMatch(svg,/NaN|Infinity|data-work-progress/);
  for(const history of final.histories){
    const panel=final.panels.find(p=>history.x>=p.x&&history.x<=p.x+p.w);
    assert.ok(history.y-23>=panel.y);assert.ok(history.y+2*history.lineStep+23<=panel.y+panel.h);
  }
});

test('explicit emission history uses source departure times and is deterministic after rewinding',async()=>{
  const {compiled:c}=await subject();
  const final=c.snapshot(c.duration),source=final.histories.find(h=>h.anchor==='source');
  for(const value of source.values){
    const event=c.events.find(e=>e.type==='source-next'&&e.node==='source'&&e.value===value.value);
    assert.equal(value.shownAt,event.at);
  }
  for(const time of [0,...c.stops.map(s=>s.time),...c.events.map(e=>e.at),c.duration]){
    const expected=JSON.stringify(c.snapshot(time));c.snapshot(c.duration);c.snapshot(0);
    assert.equal(JSON.stringify(c.snapshot(time)),expected);
  }
});

test('Subject playback holds the comparison and seeking backwards clears the receiver',async()=>{
  const {scene}=await subject(),h=await playbackHarness(),{player}=h.create({scene});
  player.seek(player.stops[0].time);const beforeSubscription=JSON.stringify(player.snapshot);
  player.seek(player.stops.at(-1).time);player.playContinuously();h.advance(30000);
  assert.equal(player.state,'finished');assert.equal(h.frames.size,0);
  assert.deepEqual(values(player.snapshot,'source'),['A','B','C']);assert.deepEqual(values(player.snapshot,'sink'),['B','C']);
  player.seek(player.stops[0].time);assert.equal(JSON.stringify(player.snapshot),beforeSubscription);
  player.seek(0);assert.deepEqual(values(player.snapshot,'source'),[]);assert.deepEqual(values(player.snapshot,'sink'),[]);
});

test('Subject in 4:3: large tiles, boxes underneath appear on first emission/receipt, one centred group',async()=>{
  const m=await modules(['catalog','scene-config','engine','renderer']);
  const base=m.catalog.scenes.find(s=>s.id==='05-zrodla');
  const scene=m['scene-config'].configureScene({...base,id:'05-zrodla-3',rendererId:'05-zrodla',sourceExample:2,format:'4:3',
    title:'Subject: odbierasz od chwili subskrypcji',code:'subject$.subscribe(observer)',duration:20});
  const c=m.engine.compileScene(scene),f=c.snapshot(c.duration);
  assert.equal(f.height,612);assert.equal(f.textScale,1.8);
  assert.ok(f.nodes.every(n=>n.h>=170&&n.w>=400),'większe kafelki');
  for(const [id,panel] of [['source',f.panels[0]],['sink',f.panels[1]]]){
    const n=f.nodes.find(x=>x.id===id);
    assert.equal(panel.x+panel.w/2,n.x);assert.equal(panel.w,n.w);assert.ok(panel.y>n.y+n.h/2,'box pod kafelkiem');
  }
  const top=Math.min(...f.nodes.map(n=>n.y-n.h/2)),bottom=Math.max(...f.panels.map(p=>p.y+p.h));
  assert.ok(Math.abs((top+bottom)/2-f.height/2)<2);
  const left=Math.min(...f.panels.map(p=>p.x)),right=Math.max(...f.panels.map(p=>p.x+p.w));
  assert.ok(Math.abs((left+right)/2-f.width/2)<2);
  assert.deepEqual(values(f,'source'),['A','B','C']);assert.deepEqual(values(f,'sink'),['B','C']);
  assert.ok(f.histories.every(h=>h.lines===1),'wartości w jednym rzędzie');
  // Boxy pojawiają się przy pierwszej emisji (A) i pierwszym odbiorze (B), a nie od READY.
  const emitA=c.events.find(e=>e.type==='source-next'&&e.node==='source'&&e.value==='A');
  const deliverB=c.events.find(e=>e.type==='deliver-next'&&e.edge==='source-sink'&&e.value==='B');
  const ready=c.snapshot(0),beforeB=c.snapshot(deliverB.at-.01),afterB=c.snapshot(deliverB.at);
  assert.deepEqual(Array.from(ready.panels,p=>p.visible),[false,false]);
  assert.deepEqual(Array.from(c.snapshot(emitA.at).panels,p=>p.visible),[true,false]);
  assert.deepEqual(Array.from(beforeB.panels,p=>p.visible),[true,false]);assert.deepEqual(Array.from(afterB.panels,p=>p.visible),[true,true]);
  // A nie leci obok Subject: pojawia się tylko w boxie emisji.
  assert.ok(c.snapshot(c.stops[0].time).tokens.every(t=>t.phase!=='unobserved'));
  const svg=m.renderer.renderScene(ready);assert.doesNotMatch(svg,/<rect[^>]*fill="#f1eee7"/,'READY bez boxów');
});

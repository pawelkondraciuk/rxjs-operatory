const {test}=require('node:test'),assert=require('node:assert/strict');
const {modules,playbackHarness}=require('./v2-harness.cjs');
const id='x02-combinelatest-withlatestfrom';

async function deck(format='4:3'){
 const m=await modules(['reference-scenes','engine','renderer']);
 const scene={id,format,codeSyntax:true};
 m['reference-scenes'].configureCombineLatestWithLatestFrom(scene);
 scene.playback={...scene.playback,controller:'stages'};
 const c=m.engine.compileScene(scene);
 return {m,scene,c,render:m.renderer.renderScene};
}
const stop=(c,id)=>c.snapshot(c.stops.find(s=>s.id===id).time);
const values=(f,anchor)=>Array.from(f.histories.find(h=>h.anchor===anchor)?.values||[],v=>v.value);
const memories=(f,id)=>Object.fromEntries((f.nodes.find(n=>n.id===id).memoryBalls||[]).map(m=>[m.id,m.value]));

test('one 4-tile diagram has two independent inputs, one combineLatest and one full S1 receiver',async()=>{
 for(const format of ['4:3','16:9']){
  const {scene,c,render}=await deck(format),f=c.snapshot(0),node=nodeId=>f.nodes.find(n=>n.id===nodeId);
  assert.equal(scene.title,'combineLatest — ostatnie wartości z wielu źródeł');
  assert.equal(scene.code,'combineLatest([userId$, language$])');
  assert.equal(scene.playback.controller,'stages');
  assert.deepEqual(Array.from(c.stops,s=>s.id),['subscribed','user-42','language-pl','language-en','user-43','summary']);
  assert.equal(f.nodes.length,4);assert.equal(f.edges.length,3);
  assert.deepEqual([node('user-source').label,node('language-source').label],['userId$','language$']);
  assert.equal(node('user-source').x,node('language-source').x);
  assert.ok(node('language-source').y>node('user-source').y);
  assert.equal(node('combine-op').label,'combineLatest');
  assert.equal(node('combine-op').defH,node('user-source').defH,'nagłówki mają wspólną wysokość');
  assert.equal(node('s1').h,node('user-source').rowH,'S1 ma jeden standardowy lane');
  const rows=node('combine-op').laneRows;
  assert.deepEqual(Array.from(rows,r=>r.subscriber),['U1','U2','S1']);
  assert.ok(node('combine-op').h<360,'operator nie ma nadmiarowej pustej przestrzeni');
  for(const [sourceId,edgeId,index] of [['user-source','user-combine',0],['language-source','language-combine',1]]) {
    const source=node(sourceId),y=rows[index].top+rows[index].h/2,edge=f.edges.find(e=>e.id===edgeId);
    assert.equal(source.top+source.defH+source.rowH/2,y);
    assert.equal(edge.points[0][1],y);assert.equal(edge.points.at(-1)[1],y);
    assert.equal(node('combine-op').memoryBalls[index].y,y);
    assert.ok(node('combine-op').memoryBalls[index].x>node('combine-op').x);
  }
  assert.ok(node('user-source').y+node('user-source').h/2<node('language-source').y-node('language-source').h/2);
  assert.equal(node('s1').y,rows[2].top+rows[2].h/2);
  const history=f.histories.find(h=>h.anchor==='s1'),pairWidth=history.pair.partWidth*2+36;
  assert.equal(history.columns,3);
  assert.ok(history.columnStep>=pairWidth,'pary i nawiasy nie nachodzą na siebie');
  assert.ok(history.x-pairWidth/2>node('s1').x-node('s1').w/2+100,'historia omija inbox i S1');
  assert.ok(history.x+2*history.columnStep+pairWidth/2<node('s1').x+node('s1').w/2,'trzy pary mieszczą się w S1');
  assert.deepEqual(memories(f,'combine-op'),{user:undefined,language:undefined});
  assert.deepEqual(values(f,'s1'),[]);
  assert.ok(f.edges.every(e=>e.visible===false),'READY nie pokazuje połączeń');
  assert.ok(f.nodes.every(n=>n.y-n.h/2>=0&&n.y+n.h/2<=f.height),format);
  assert.ok(f.edges.every(e=>new Set(e.points.map(p=>p[1])).size===1),'trzy przewody są poziome');
  const svg=render(f);
  assert.equal((svg.match(/data-memory-slot=/g)||[]).length,2);
  assert.match(svg,/id:<\/text>/);assert.match(svg,/lang:<\/text>/);
  assert.match(svg,/>S1<\/text>/,'odbiorca ma oznaczenie także w READY');
  assert.doesNotMatch(svg,/data-panel-box|NaN|Infinity|="undefined"/);
 }
});

test('S1 subscription reaches combineLatest before both input subscriptions',async()=>{
 const {c}=await deck(),records=c.plan.records;
 assert.equal(records.get('combine-s1').start,.45);
 assert.equal(records.get('user-combine').start,1.25);
 assert.equal(records.get('language-combine').start,1.25);
 const f=stop(c,'subscribed');
 assert.ok(f.edges.every(e=>e.phase==='subscribed'&&e.progress===1&&e.visible));
 assert.deepEqual(memories(f,'combine-op'),{user:undefined,language:undefined});
 assert.deepEqual(values(f,'s1'),[]);
});

test('memory and S1 history follow combineLatest semantics at every checkpoint',async()=>{
 const {c}=await deck(),f=Object.fromEntries(c.stops.map(s=>[s.id,c.snapshot(s.time)]));
 assert.deepEqual(memories(f['user-42'],'combine-op'),{user:'42',language:undefined});
 assert.deepEqual(values(f['user-42'],'s1'),[],'samo 42 nie emituje wyniku');
 assert.deepEqual(memories(f['language-pl'],'combine-op'),{user:'42',language:'PL'});
 assert.deepEqual(values(f['language-pl'],'s1'),['[42, PL]']);
 assert.deepEqual(memories(f['language-en'],'combine-op'),{user:'42',language:'EN'});
 assert.deepEqual(values(f['language-en'],'s1'),['[42, PL]','[42, EN]']);
 assert.deepEqual(memories(f['user-43'],'combine-op'),{user:'43',language:'EN'});
 assert.deepEqual(values(f['user-43'],'s1'),['[42, PL]','[42, EN]','[43, EN]']);
 assert.deepEqual(memories(f.summary,'combine-op'),{user:'43',language:'EN'});
 assert.ok(Array.from(c.plan.records.values()).every(r=>!r.end),'bez complete, error i unsubscribe');
});

test('source colors remain fixed and every output is one compact two-color pair',async()=>{
 const {c,render}=await deck(),user=Array.from(c.plan.records.get('user-combine').events),language=Array.from(c.plan.records.get('language-combine').events);
 assert.deepEqual([...new Set(user.map(v=>v.color))],['#B85D05']);
 assert.deepEqual([...new Set(language.map(v=>v.color))],['#087FAD']);
 const output=Array.from(c.plan.records.get('combine-s1').events);
 assert.deepEqual(output.map(v=>v.value),['[42, PL]','[42, EN]','[43, EN]']);
 const travelling=render(c.snapshot(8.5));
 assert.match(travelling,/data-result-pair="\[42, PL\]"/);
 assert.match(travelling,/#B85D05/);assert.match(travelling,/#087FAD/);
 const final=render(stop(c,'summary'));
 assert.equal((final.match(/data-result-pair=/g)||[]).length,3);
 assert.equal((final.match(/data-token="received"/g)||[]).length,3);
 assert.doesNotMatch(final,/withLatestFrom|S2|data-panel-box/);
});

test('input value is stored before the corresponding output leaves combineLatest',async()=>{
 const {c}=await deck(),pl=c.events.find(e=>e.type==='deliver-next'&&e.edge==='language-combine'&&e.value==='PL').at;
 const storing=c.snapshot(pl+.2),stored=c.snapshot(pl+.45);
 assert.equal(memories(storing,'combine-op').language,undefined);
 assert.ok(storing.tokens.some(t=>t.edge==='language-combine'&&t.phase==='store'&&t.value==='PL'));
 assert.equal(memories(stored,'combine-op').language,'PL');
 const emitted=c.events.find(e=>e.type==='source-next'&&e.edge==='combine-s1'&&e.value==='[42, PL]');
 assert.ok(emitted.at>pl+.4);
});

test('QA model manual/auto rewind remains correct',async()=>{
 const {scene}=await deck(),h=await playbackHarness(),{player,controller}=h.create({scene});
 assert.equal(player.state,'ready');controller.next();h.advance(4000);
 assert.equal(controller.state.checkpointIndex,1);assert.equal(player.isPlaying,false);
 controller.next();h.advance(5000);assert.equal(controller.state.checkpointIndex,2);
 const saved=JSON.stringify(player.snapshot);controller.previous();assert.equal(controller.state.checkpointIndex,1);
 controller.next();h.advance(5000);assert.equal(JSON.stringify(player.snapshot),saved);
 controller.reset();assert.equal(player.state,'ready');assert.equal(player.time,0);
 for(let i=0;i<player.stops.length;i++){controller.next();h.advance(20000);}
 const final=JSON.stringify(player.snapshot);controller.previous();controller.next();h.advance(20000);
 assert.equal(JSON.stringify(player.snapshot),final);
 controller.reset();player.playContinuously();h.advance(30000);
 assert.equal(player.state,'finished');assert.deepEqual(values(player.snapshot,'s1'),['[42, PL]','[42, EN]','[43, EN]']);

});

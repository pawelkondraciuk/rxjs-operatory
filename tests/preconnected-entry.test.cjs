const {test}=require('node:test'),assert=require('node:assert/strict');
const {modules,playbackHarness}=require('./v2-harness.cjs');
const cases={
 '12b-debounce-switchmap':['source-debounce','debounce-op','op-observer'],
 '11a-distinct-switchmap':['source-debounce','debounce-distinct','distinct-op','op-observer'],
 '11b-catcherror-search':['source-debounce','debounce-distinct','distinct-op','op-observer'],
 'b04-catcherror':['source-op','op-catch','catch-observer'],
 'x03-retry-backoff':['source-retry-1','retry-observer'],
};
test('five scenes enter with a complete main subscription, no subscribe pulse, and only retry has an initial HTTP',async()=>{
 const m=await modules(['catalog','scene-config','engine']);
 for(const format of ['4:3','16:9'])for(const [id,ids]of Object.entries(cases)){
  const scene=m['scene-config'].configureScene({...m.catalog.scenes.find(s=>s.id===id),id,format});
  const c=m.engine.compileScene(scene),f=c.snapshot(0);
  assert.equal(f.executionCounts.started,id==='x03-retry-backoff'?1:0,id);
  assert.equal(f.tokens.length,0,id);
  for(const edge of ids){
   const e=f.edges.find(e=>e.id===edge);assert.ok(e.visible&&e.phase==='subscribed',id+' '+edge);
   assert.ok(c.events.find(e=>e.type==='subscribe'&&e.edge===edge).at<0);
   assert.ok(c.events.find(e=>['connected','inner-subscribe'].includes(e.type)&&e.edge===edge).at<=0);
  }
  for(const record of c.plan.records.values())if(!ids.includes(record.id))assert.ok(record.start>0,id+' future subscription '+record.id);
  if(id==='x03-retry-backoff'){
   const row=f.nodes.find(n=>n.id==='source').executionRows[0];assert.equal(row.id,'#1');assert.equal(row.progress,0);
  }else if(f.innerWorkPanels)assert.equal(f.innerWorkPanels[0].rows.length,0,id);
  const h=await playbackHarness(),{player,controller}=h.create({scene});
  if(controller){controller.next();h.advance(100);controller.reset();}else{player.play();h.advance(100);player.seek(0);}
  assert.equal(player.time,0);assert.equal(player.isPlaying,false);
  assert.equal(JSON.stringify(player.snapshot),JSON.stringify(f),id+' reset');
 }
});

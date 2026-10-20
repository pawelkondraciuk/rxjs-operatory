const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {modules}=require('./v2-harness.cjs');
// 20-sharereplay (share): HTTP GET → share() → A/B w wyglądzie torów. A uruchamia HTTP #1, które kończy się
// przed subskrypcją B; share() resetuje się po complete, więc B uruchamia HTTP #2 tej samej definicji.
async function late(format='4:3'){
 const m=await modules(['catalog','scene-config','engine','renderer']);
 const base=m.catalog.scenes.find(s=>s.id==='20-sharereplay');
 const scene=m['scene-config'].configureScene({...base,...base.variants.without,variants:undefined,
  id:'20-sharereplay',rendererId:'20-sharereplay',comparisonMode:'without',format});
 return {scene,c:m.engine.compileScene(scene),render:m.renderer.renderScene};
}
const at=(c,type,edge)=>c.events.find(e=>e.type===type&&e.edge===edge).at;
const balls=(f,id)=>Array.from(f.histories.find(h=>h.anchor===id).values,v=>v.value);
const lane=(f,node,label)=>f.nodes.find(n=>n.id===node).laneStates.find(l=>l.label===label);

test('late share: one HTTP definition, two executions in lanes #1 and #2',async()=>{
 const {scene,c}=await late(),end=c.snapshot(c.duration);
 assert.equal(scene.code,'http$.pipe(share())');
 assert.doesNotMatch(scene.code,/subscribe/);
 assert.deepEqual(Array.from(end.nodes,n=>n.id),['http','share','A','B']);
 assert.equal(end.nodes.filter(n=>n.label==='HTTP GET').length,1);
 assert.deepEqual(Array.from(end.nodes.find(n=>n.id==='http').laneRows,r=>r.subscriber),['U1','U2']);
 assert.equal(lane(end,'http','#1').state,'completed');assert.equal(lane(end,'http','#2').state,'completed');
 assert.equal(lane(end,'http','#1').color,'#7457D9');assert.equal(lane(end,'http','#2').color,'#D8840F');
 assert.deepEqual(balls(end,'A'),['42']);assert.deepEqual(balls(end,'B'),['42']);
 assert.equal(end.executionCounts.started,2);assert.equal(end.metrics[0].value,2);
 // Kolor kulki należy do wykonania i odbiorcy: #1 → A fioletowa, #2 → B pomarańczowa, na całej drodze.
 const colours=edge=>Array.from(c.plan.records.get(edge).events,e=>e.color);
 for(const [up,out,fill] of [['http-share','share-A','#cbbff2'],['http-share-2','share-B','#f3d09d']]){
  assert.deepEqual(colours(up),[fill]);assert.deepEqual(colours(out),[fill]);
 }
 assert.deepEqual(Array.from(end.histories,h=>h.values[0].color),['#cbbff2','#f3d09d']);
 assert.equal(end.ball.textFill,undefined);
});

test('late share: B subscribes only after HTTP #1 completed and starts HTTP #2',async()=>{
 const {c}=await late();
 const completeA=at(c,'disconnected','share-A'),subscribeB=at(c,'subscribe','share-B');
 assert.ok(at(c,'deliver-next','share-A')<at(c,'stream-complete','http-share'),'next przed complete');
 assert.ok(completeA<subscribeB,'B dopiero po complete A');
 assert.equal(c.events.find(e=>e.type==='node-create'&&e.node==='B').at>completeA,true);
 // Brak odtworzenia: B nie dostaje nic przed odpowiedzią HTTP #2.
 const second=at(c,'deliver-next','http-share-2');
 assert.deepEqual(balls(c.snapshot(second-.001),'B'),[]);
 assert.ok(c.events.filter(e=>e.type==='deliver-next'&&e.edge==='share-B').every(e=>e.at>second));
 // Licznik: 0 przed A, 1 po subskrypcji A i po complete, 2 dopiero po subskrypcji B; next go nie zmienia.
 const count=t=>c.snapshot(t).metrics[0].value;
 assert.equal(count(at(c,'connected','http-share')-.001),0);
 assert.equal(count(at(c,'connected','http-share')+.001),1);
 assert.equal(count(completeA+.5),1);
 assert.equal(count(at(c,'connected','http-share-2')-.001),1);
 assert.equal(count(at(c,'connected','http-share-2')+.001),2);
 assert.equal(count(at(c,'deliver-next','share-B')+.1),2);
});

test('late share: two quick steps (A done, then B with HTTP #2) match the speaker notes',async()=>{
 const {scene,c}=await late(),ids=['complete-a','complete-b'];
 assert.deepEqual(Array.from(c.stops,s=>s.id),ids);
 // Drugi krok kończy scenę: po nim „dalej” zmienia slajd, bez osobnego etapu AUTO.
 assert.equal(c.stops[1].time,c.duration);
 const ready=c.snapshot(0);
 assert.deepEqual(Array.from(ready.nodes.filter(n=>n.visible),n=>n.id),['http','share']);
 assert.ok(ready.nodes.every(n=>!(n.laneRows||[]).length));
 assert.deepEqual(Array.from(ready.metrics,m=>[m.label,m.value]),[['Requesty HTTP',0],['Aktywne',0]]);
 // Krótki request: odpowiedź 1 s czasu modelu po subskrypcji, complete chwilę po odbiorze.
 for(const [up,out] of [['http-share','share-A'],['http-share-2','share-B']]){
  assert.ok(at(c,'source-next',up)-at(c,'connected',up)<=1.05,up+' szybka odpowiedź');
  assert.ok(at(c,'disconnected',out)-at(c,'deliver-next',out)<=2.5,out+' complete zaraz po wartości');
 }
 const f=Object.fromEntries(c.stops.map(s=>[s.id,c.snapshot(s.time)]));
 const a=f['complete-a'];
 assert.equal(lane(a,'http','#1').state,'completed');assert.equal(lane(a,'share','A').state,'completed');
 assert.deepEqual(balls(a,'A'),['42']);assert.equal(a.nodes.find(n=>n.id==='B').visible,false);
 assert.equal(a.edges.find(e=>e.id==='http-share').done,true,'zakończone połączenie A nie jest aktywne');
 assert.deepEqual(Array.from(a.metrics,m=>m.value),[1,0]);
 const b=f['complete-b'];
 assert.equal(lane(b,'http','#2').state,'completed');assert.equal(lane(b,'share','B').state,'completed');
 assert.deepEqual(balls(b,'B'),['42']);assert.deepEqual(Array.from(b.metrics,m=>m.value),[2,0]);
 assert.equal(b.caption,'A kończy się poprawnie. Późny odbiorca B uruchamia nową subskrypcję upstream, więc powstaje HTTP #2.');
 for(const frame of Object.values(f))assert.equal(frame.tokens.length,0,'postój bez lecącej kulki');
 // Zielony status ✓ complete przy obu odbiorcach po dotarciu impulsu.
 for(const id of ['A','B'])assert.equal(scene.graph(scene).nodes.find(n=>n.id===id).laneTerminalText,true);
 // Request #2 jest podpisany jako nowy, w kolorze B; aktywne = 1 w trakcie każdego requestu.
 const during=c.snapshot(at(c,'connected','http-share-2')+.5);
 const callout=during.callouts.find(x=>x.opacity>0&&x.label==='#2');
 assert.equal(callout.text,'nowy request HTTP');assert.equal(callout.color,'#D8840F');
 assert.deepEqual(Array.from(during.metrics,m=>m.value),[2,1]);
 const html=fs.readFileSync('index.html','utf8');
 assert.doesNotMatch(html,/<template data-checkpoint-notes="20-sharereplay">/,'old standalone share is QA only');
});

test('late share: ports share Y per lane, geometry is fixed and rewind is deterministic in both formats',async()=>{
 for(const format of ['4:3','16:9']){
  const {c,render}=await late(format),end=c.snapshot(c.duration);
  for(const [lane,receiver,upstream] of [['A','A','U1'],['B','B','U2']]){
   const ys=end.nodes.flatMap(n=>(n.socketDots||[]).filter(d=>[receiver,upstream].includes(d.subscriber)).map(d=>d.y));
   assert.equal(new Set(ys).size,1,format+' '+lane);
   const http=end.nodes.find(n=>n.id==='http').laneStates.find(l=>l.subscriber===upstream);
   assert.equal(http.y,ys[0],format+' '+lane+' HTTP');
  }
  const shape=f=>JSON.stringify(f.nodes.map(n=>[n.id,n.x,n.w,n.y-n.h/2]));
  for(const s of c.stops)assert.equal(shape(c.snapshot(s.time)),shape(end),format);
  for(const n of end.nodes)assert.ok(n.y+n.h/2<=end.height&&n.x+n.w/2<=end.width,format+' '+n.id);
  assert.doesNotMatch(render(end),/NaN|Infinity|="undefined"/);
  const before=JSON.stringify(c.snapshot(c.stops[0].time));c.snapshot(c.duration);c.snapshot(0);
  assert.equal(JSON.stringify(c.snapshot(c.stops[0].time)),before);
 }
});

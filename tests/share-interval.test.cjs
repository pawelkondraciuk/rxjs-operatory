const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {modules,playbackHarness,revealMock}=require('./v2-harness.cjs');
// 04a-dwa-tory-3: share + interval — odpowiednik Subject + interval (05-zrodla-4). Każde „dalej” wywołuje jedno
// subX.unsubscribe(): A i B kończą się na share() (interval emituje dalej), odejście C (ostatniego) sprawia, że share()
// sam odłącza upstream: × biegnie dalej do interval. Bez complete.
async function scene(format='4:3'){
 const m=await modules(['catalog','scene-config','engine','renderer']);
 const s=m['scene-config'].configureScene({...m.catalog.scenes.find(x=>x.id==='04a-dwa-tory'),id:'04a-dwa-tory-3',rendererId:'04a-dwa-tory',lanesMode:'share-interval',format});
 return {scene:s,render:m.renderer.renderScene,compile:m.engine.compileScene};
}
async function live(format,controls){
 const {scene:s,render}=await scene(format),h=await playbackHarness(),{player,controller,elements}=h.create({scene:s,controls});
 return {scene:s,render,h,player,controller,svg:()=>elements.get('.rx-stage').innerHTML};
}
const node=(f,id)=>f.nodes.find(n=>n.id===id);
const lane=(f,id,sub)=>node(f,id).laneStates.find(l=>l.subscriber===sub);
const edge=(f,id)=>f.edges.find(e=>e.id===id);
const last=(f,id)=>f.histories.find(h=>h.anchor===id).values.at(-1)?.value;
const metric=(f,label)=>f.metrics.find(m=>m.label===label).value;
const receivers=['A','B','C'];

test('READY: interval(1000).pipe(share()) already connected to A/B/C, same layout as Subject + interval',async()=>{
 for(const format of ['4:3','16:9']){
  const {scene:s,compile}=await scene(format),c=compile(s),f=c.snapshot(0);
  assert.equal(s.title,'share() — kto odłączy źródło?');
  assert.equal(s.code,'const shared$ = interval(1000).pipe(share());');
  assert.doesNotMatch(s.code,/subscribe|connection|Subject/);
  assert.equal(s.playback.controller,'stages');assert.deepEqual(Array.from(c.stops,x=>x.id),['unsub-a','unsub-b','unsub-c']);
  assert.deepEqual(Array.from(f.nodes,n=>n.id),['interval','share','A','B','C']);
  assert.equal(node(f,'share').label,'share()');
  assert.equal(lane(f,'interval','U').state,'running');assert.equal(edge(f,'interval-share').progress,1);
  for(const id of receivers){assert.equal(lane(f,'share',id).state,'running');assert.equal(edge(f,'share-'+id).progress,1);}
  assert.ok(c.events.filter(e=>e.type==='connected').every(e=>e.at<0),'subskrypcje zestawione przed READY');
  assert.equal(metric(f,'Odbiorcy share()'),3);assert.equal(metric(f,'Emisje interval'),0);
  assert.ok(f.nodes.every(n=>n.y+n.h/2<=f.height),format+': mieści się w ramce');
 }
});

test('three steps: A and B end on share() while interval keeps emitting; C (last) makes share() unsubscribe from interval',async()=>{
 for(const format of ['4:3','16:9']){
  const navigation=[];
  const {player,controller,h,render}=await live(format,{stageOptions:{onNavigate:d=>navigation.push(d)}});
  controller.toggle();h.advance(4000);
  controller.next();assert.equal(player.live.stage,1);assert.equal(player.live.busy,true);
  h.advance(200);
  assert.deepEqual(Array.from(player.snapshot.callouts,c=>c.text+' '+c.label),['subA.unsubscribe() A']);
  h.advance(3000);let f=player.snapshot;
  assert.equal(player.live.busy,false);
  assert.equal(lane(f,'share','A').state,'cancelled');assert.equal(lane(f,'share','B').state,'running');
  assert.equal(edge(f,'interval-share').phase,'subscribed');assert.ok(!edge(f,'interval-share').cancel,'A kończy się na share()');
  // B: drugi krok. Po nim interval nadal emituje do C, a scena czeka (pytanie o ostatniego odbiorcę).
  controller.next();assert.equal(player.live.stage,2);
  h.advance(200);assert.deepEqual(Array.from(player.snapshot.callouts,c=>c.text+' '+c.label),['subB.unsubscribe() B']);
  h.advance(3000);f=player.snapshot;
  assert.equal(lane(f,'share','B').state,'cancelled');assert.equal(lane(f,'share','C').state,'running');
  assert.equal(lane(f,'interval','U').state,'running','C nadal słucha — interval pracuje');
  const waiting=metric(f,'Emisje interval');h.advance(3000);
  assert.ok(metric(player.snapshot,'Emisje interval')>waiting,'źródło nie zatrzymuje się przed odejściem C');
  assert.equal(lane(player.snapshot,'interval','U').state,'running');assert.equal(player.live.stage,2);
  // C: × od C do share(), potem dalej od share() do interval.
  controller.next();assert.equal(player.live.stage,3);
  const called=player.time,before=metric(player.snapshot,'Emisje interval');
  h.advance(200);assert.deepEqual(Array.from(player.snapshot.callouts,c=>c.text+' '+c.label),['subC.unsubscribe() C']);
  const xs=[];
  for(let i=0;i<60;i++){h.advance(50);const e=edge(player.snapshot,'interval-share');if(e.cancel)xs.push(e.cancel.x);}
  assert.ok(xs.length>3,'pocisk × na połączeniu interval → share()');
  assert.ok(xs.every((x,i)=>i===0||x<xs[i-1]),'pocisk jedzie w lewo, do interval');
  h.advance(1500);f=player.snapshot;
  assert.equal(lane(f,'interval','U').state,'cancelled');assert.equal(edge(f,'interval-share').phase,'unsubscribe');
  assert.deepEqual(receivers.map(id=>lane(f,id,id).state),['cancelled','cancelled','cancelled']);
  const [a,b,c]=receivers.map(id=>Number(last(f,id)));
  assert.ok(b>a&&c>b,'odbiorcy odchodzący później dostali więcej wartości');
  const stopped=metric(f,'Emisje interval');assert.ok(stopped<=before+1&&stopped<=Math.ceil(called-.5)+1,'bez emisji po odejściu C');
  assert.equal(metric(f,'Odbiorcy share()'),0);
  // Bez complete i bez ręcznego connection: share() świeci w kodzie, gdy sam odłącza upstream.
  assert.ok(f.nodes.every(n=>n.notification===null));assert.doesNotMatch(render(f),/✓ complete|#26804E/);
  assert.ok(!f.edges.some(e=>e.phase==='complete'));
  assert.ok(!c_some(player,'connection.unsubscribe()'));
  assert.equal(player.state,'finished');assert.match(f.caption,/interval zatrzymany przez share\(\)/);
  h.advance(5000);assert.equal(metric(player.snapshot,'Emisje interval'),stopped);assert.equal(h.frames.size,0);
  controller.next();assert.deepEqual(navigation,[1],format);
  // ← cofa ostatni krok: C znowu odbiera, interval emituje; A i B pozostają odłączone.
  controller.previous();assert.equal(player.live.stage,2);h.advance(3000);
  assert.equal(lane(player.snapshot,'interval','U').state,'running');assert.ok(metric(player.snapshot,'Emisje interval')>stopped);
  assert.deepEqual(receivers.map(id=>lane(player.snapshot,'share',id).state),['cancelled','cancelled','running']);
  controller.previous();controller.previous();assert.equal(player.live.stage,0);h.advance(3000);
  assert.deepEqual(receivers.map(id=>lane(player.snapshot,'share',id).state),['running','running','running']);
  controller.suspend('slide');controller.reset();assert.equal(player.live.stage,0);assert.equal(h.frames.size,0);
 }
});
function c_some(player,text){return (player.snapshot.callouts||[]).some(c=>c.text===text);}

test('code mark share() is active only while share() unsubscribes from interval',async()=>{
 const {scene:s,compile}=await scene(),v=s.live.variant(s,{from:0,to:30,closedAt:s.live.defaultClose,actions:s.live.defaults}),c=compile(v);
 const mark=t=>c.snapshot(t).codeView[0].find(p=>p.mark?.id==='share').active;
 const ev=(type,edge)=>c.events.find(e=>e.type===type&&e.edge===edge).at;
 assert.equal(mark(ev('inner-unsubscribe','share-A')+.2),false);
 assert.equal(mark((ev('disconnected','share-C')+ev('disconnected','interval-share'))/2),true);
 assert.ok(ev('inner-unsubscribe','interval-share')>=ev('disconnected','share-C')-1e-9,'share() odłącza upstream po dotarciu × od C');
 assert.equal(c.events.filter(e=>e.type==='stream-complete').length,0);
 for(const format of ['4:3','16:9']){
  const {scene:x,compile:cx,render}=await scene(format),vv=x.live.variant(x,{from:0,to:30,closedAt:x.live.defaultClose,actions:x.live.defaults}),cc=cx(vv);
  for(const time of [0,...cc.stops.map(st=>st.time),cc.duration]){
   const frame=JSON.stringify(cc.snapshot(time));cc.snapshot(cc.duration);cc.snapshot(0);
   assert.equal(JSON.stringify(cc.snapshot(time)),frame);
   assert.doesNotMatch(render(cc.snapshot(time)),/NaN|Infinity|="undefined"/);
  }
 }
});

test('Reveal fragments, restore and print: stable frames, interval stopped by share() without complete',async()=>{
 const {scene:s}=await scene('4:3'),h=await playbackHarness(),{deck,stage}=revealMock();
 stage.markers=Array.from({length:4},(_,index)=>({index,visible:false,closest(x){return x==='section'?stage:x==='.rx-fragment-steps'?stage.markers:null;}}));
 const {player,controller}=h.create({scene:s,controls:{stageOptions:{onNavigate:d=>deck.navigation.push(d)}}});
 const adapter=h.install(deck,{getController:x=>x===stage?controller:null});adapter.refresh();
 controller.toggle();h.advance(2000);assert.equal(deck.fragmentIndex,-1);
 for(let i=0;i<3;i++){deck.press(39);h.advance(800);assert.equal(deck.fragmentIndex,i);assert.equal(player.live.stage,i+1);h.advance(3500);}
 h.advance(3000);assert.equal(player.state,'finished');assert.equal(deck.fragmentIndex,3);
 deck.press(39);assert.deepEqual(deck.navigation,[1]);adapter.destroy();
 const restored=await live('4:3');const time=restored.player.stops.find(x=>x.id==='unsub-c').time;
 restored.controller.seekCheckpoint(time);
 assert.equal(restored.player.live.stage,3);
 assert.deepEqual(receivers.map(id=>lane(restored.player.snapshot,id,id).state),['cancelled','cancelled','cancelled']);
 assert.equal(lane(restored.player.snapshot,'interval','U').state,'cancelled');
 const printed=await live('4:3');printed.player.finish();
 const p=printed.player.snapshot;
 assert.equal(printed.player.state,'finished');
 assert.deepEqual(receivers.map(id=>lane(p,id,id).state),['cancelled','cancelled','cancelled']);
 assert.equal(lane(p,'interval','U').state,'cancelled');assert.equal(edge(p,'interval-share').color,'#808890');
 assert.equal(metric(p,'Emisje interval'),9);assert.ok(!p.callouts?.length);
 assert.ok(p.nodes.every(n=>n.notification===null));
});

test('speaker notes template covers every checkpoint, asks before the last unsubscribe and hands over to shareReplay',async()=>{
 const {scene:s}=await scene();
 const html=fs.readFileSync('index.html','utf8');
 const source=html.match(/<template data-checkpoint-notes="04a-dwa-tory-3">([\s\S]*?)<\/template>/)[1];
 const ids=Array.from(source.matchAll(/data-checkpoint="([^"]+)"/g),x=>x[1]);
 assert.deepEqual(ids,['ready',...s.playback.stops.map(x=>x.id),'finished']);
 const note=id=>source.match(new RegExp(`data-checkpoint="${id}">([\\s\\S]*?)</div>`))[1];
 assert.match(note('ready'),/interval\(1000\)\.pipe\(share\(\)\)/);
 assert.match(note('unsub-b'),/Czy źródło będzie dalej emitować, jeśli odejdzie ostatni odbiorca\?/);
 assert.match(note('unsub-c'),/share\(\) sam odłącza upstream/);
 assert.match(note('finished'),/Share umie odłączyć źródło, kiedy ostatni odbiorca odchodzi[\s\S]*Prawo: shareReplay\(1\)/);
});

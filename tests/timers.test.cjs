const {test}=require('node:test'),assert=require('node:assert/strict');
const {modules,playbackHarness,revealMock}=require('./v2-harness.cjs');
// Wariant 05-zrodla: interval(1000) na żywo. interval jest cold — każdy odbiorca ma własne wykonanie od 0.
// Etapy: READY (interval i A) → subscribe A → emisje → B dołącza (własne 0, 1, 2…) → unsubscribe A → unsubscribe B.
async function interval(format){
 const m=await modules(['catalog','scene-config','engine','renderer']);
 const base=m.catalog.scenes.find(s=>s.id==='05-zrodla');
 const scene=m['scene-config'].configureScene({...base,rendererId:'05-zrodla',sourceExample:0,...(format?{format}:{})});
 return {scene,render:m.renderer.renderScene};
}
const values=(frame,id)=>Array.from(frame.histories.find(h=>h.anchor===id)?.values||[],v=>v.value);
const lane=(frame,id)=>frame.nodes.find(n=>n.id===id)?.laneStates?.[0];
const sourceLanes=frame=>Array.from(frame.nodes.find(n=>n.id==='interval').laneStates,l=>`${l.subscriber}:${l.state}`);
const metric=(frame,label)=>frame.metrics.find(m=>m.label===label).value;
const shown=frame=>Array.from(frame.callouts||[],c=>`${c.text} ${c.label}`);
const stopTime=(player,id)=>player.stops.find(s=>s.id===id).time;
async function live(format,controls={}){
 const {scene,render}=await interval(format),h=await playbackHarness(),{player,controller,elements}=h.create({scene,controls});
 return {scene,render,h,player,controller,elements,svg:()=>elements.get('.rx-stage').innerHTML};
}
// READY → postój subscribed (migawka .subscribe() A) → dalej uruchamia emisje A.
function toEmissions({controller,h,player}){
 controller.next();h.advance(3000);assert.equal(player.time,stopTime(player,'subscribed'));
 controller.next();h.advance(400);
}

test('READY: interval and receiver A (inbox, letter) are visible; nothing is subscribed or emitted',async()=>{
 const {scene,player,h,svg}=await live('4:3');
 assert.equal(scene.code,'interval(1000)');assert.doesNotMatch(scene.code,/subscribe/);
 assert.equal(scene.playback.controller,'stages');assert.equal(player.state,'ready');
 assert.deepEqual(Array.from(player.stops,s=>s.id),['subscribed','live','join-b','unsub-a','unsub-b']);
 const f=player.snapshot;
 assert.deepEqual(Array.from(f.nodes,n=>n.id),['interval','A']);
 assert.equal(f.nodes.find(n=>n.id==='interval').label,'interval');
 assert.equal(f.nodes.find(n=>n.id==='A').opacity,1);
 assert.match(svg(),/data-node="A"[^]*data-icon="inbox"[^]*>A<\/text>/);
 assert.deepEqual(sourceLanes(f),[]);assert.ok(f.edges.every(e=>!e.visible));
 assert.deepEqual(values(f,'A'),[]);assert.equal(metric(f,'Wykonania interval'),0);assert.equal(metric(f,'Emisje A'),0);
 h.advance(5000);assert.equal(player.time,0,'bez „dalej” nic nie rusza');
});

test('subscribe stops with .subscribe() A visible; the next step starts endless emissions of A only',async()=>{
 const {player,controller,h}=await live('4:3');
 controller.next();h.advance(3000);
 let f=player.snapshot;
 assert.equal(player.live.state,'idle');assert.equal(controller.state.checkpointIndex,1);
 assert.match(f.code,/interval\(1000\)\.subscribe\(render\)/);
 assert.deepEqual(shown(f),['.subscribe() A']);assert.equal(f.callouts[0].opacity,1);
 assert.deepEqual(sourceLanes(f),['A:running']);assert.deepEqual(values(f,'A'),[]);assert.equal(metric(f,'Wykonania interval'),1);
 h.advance(3000);assert.equal(player.time,stopTime(player,'subscribed'),'emisje dopiero po „dalej”');
 controller.next();h.advance(600);
 assert.ok(!shown(player.snapshot).length,'migawka gaśnie, gdy ruszają emisje');assert.equal(player.live.state,'running');
 h.advance(5000);f=player.snapshot;
 assert.deepEqual(values(f,'A').slice(0,3),['0','1','2']);assert.ok(metric(f,'Emisje A')>=4);
 // Bez akcji emisje trwają bez końca, z ograniczoną historią i stałą geometrią.
 const geometry=JSON.stringify(player.snapshot.nodes.map(n=>[n.x,n.y,n.w,n.h]));
 h.advance(30000);
 assert.equal(player.state,'playing');assert.ok(metric(player.snapshot,'Emisje A')>=35);
 assert.ok(player.snapshot.histories[0].values.length<=4);
 assert.equal(JSON.stringify(player.snapshot.nodes.map(n=>[n.x,n.y,n.w,n.h])),geometry);
 assert.ok(!player.snapshot.nodes.some(n=>n.id==='B'),'B pojawia się dopiero przy swojej akcji');
});

test('B joins: appears, subscribes and gets its own execution from 0 while A keeps counting',async()=>{
 const {player,controller,h}=await live('4:3');
 toEmissions({player,controller,h});h.advance(4000);
 const before=metric(player.snapshot,'Emisje A');
 controller.next();assert.equal(player.live.stage,1);
 h.advance(200);
 let f=player.snapshot;
 assert.ok(f.nodes.find(n=>n.id==='B').opacity>0,'B pojawia się');assert.deepEqual(shown(f),['.subscribe() B']);
 h.advance(4000);f=player.snapshot;
 assert.deepEqual(sourceLanes(f),['A:running','B:running'],'dwa wykonania interval');
 assert.equal(values(f,'B')[0],'0','B zaczyna od 0');assert.ok(metric(f,'Emisje A')>before+2);
 assert.ok(Number(values(f,'A').at(-1))>Number(values(f,'B').at(-1))+2,'A ma własny, wyższy licznik');
 assert.equal(metric(f,'Wykonania interval'),2);assert.deepEqual(shown(f),[],'migawka B gaśnie, gdy B zaczyna emitować');
 const lanes=f.nodes.find(n=>n.id==='interval').laneStates;
 assert.ok(lanes[1].y>lanes[0].y,'wiersz B pod wierszem A');
});

test('B gets its first value sooner than A and .subscribe() B fades out once B starts emitting',async()=>{
 const {scene}=await interval('4:3'),{engine}=await modules(['engine']);
 const variant=scene.live.variant(scene,{from:0,to:scene.live.window,closedAt:null,actions:[6]});
 const compiled=engine.compileScene(variant),at=(type,edge,value)=>compiled.events.find(e=>e.type===type&&e.edge===edge&&(value===undefined||e.value===value)).at;
 const connectedB=at('connected','interval-B'),firstB=at('source-next','interval-B','0');
 const connectedA=at('connected','interval-A'),firstA=at('source-next','interval-A','0');
 assert.ok(Math.abs(firstB-connectedB-.6)<1e-6,'B: pierwsza wartość 0,6 s po zestawieniu');
 assert.ok(firstA-connectedA>1.4,'A bez zmian: emit + period');
 const calloutsAt=time=>Array.from(compiled.snapshot(time).callouts||[],c=>`${c.text} ${c.label}:${c.opacity>0}`);
 assert.deepEqual(calloutsAt(firstB-.1),['.subscribe() B:true'],'migawka do startu emisji');
 assert.deepEqual(calloutsAt(firstB+.35).filter(c=>c.endsWith('true')),[],'po starcie emisji migawka zgaszona');
 assert.ok(variant.liveBusyUntil[0]>=firstB+.3-1e-9,'akcja B trwa do wygaszenia migawki');
});

test('unsubscribe A then B: grey × pulses, each execution stops separately, no complete; then the slide navigates',async()=>{
 const navigation=[];
 const {player,controller,h,svg,render}=await live('4:3',{stageOptions:{onNavigate:d=>navigation.push(d)}});
 toEmissions({player,controller,h});h.advance(3000);controller.next();h.advance(4000);
 controller.next();assert.equal(player.live.stage,2);
 // Migawka B znika w chwili akcji, nowa wchodzi bez nakładania.
 assert.deepEqual(shown(player.snapshot),[]);h.advance(300);
 assert.deepEqual(shown(player.snapshot),['.unsubscribe() A']);
 h.advance(600);assert.ok(player.snapshot.edges.find(e=>e.id==='interval-A').cancel,'pocisk × A w drodze');
 assert.match(svg(),/data-cancel="interval-A"[^]*?×/);
 h.advance(2000);let f=player.snapshot;
 assert.deepEqual(sourceLanes(f),['A:cancelled','B:running']);assert.equal(metric(f,'Wykonania interval'),1);
 const lastA=values(f,'A').at(-1),countA=metric(f,'Emisje A');
 h.advance(3000);f=player.snapshot;
 assert.equal(values(f,'A').at(-1),lastA,'A nic już nie dostaje');assert.equal(metric(f,'Emisje A'),countA);
 assert.ok(metric(f,'Emisje B')>0);assert.deepEqual(shown(f),['.unsubscribe() A'],'migawka A zostaje do następnej akcji');
 controller.next();assert.equal(player.live.stage,3);h.advance(6000);
 f=player.snapshot;
 assert.equal(player.state,'finished');assert.deepEqual(sourceLanes(f),['A:cancelled','B:cancelled']);
 assert.equal(metric(f,'Wykonania interval'),0);assert.deepEqual(shown(f),['.unsubscribe() B'],'ostatnia migawka zostaje do końca');
 assert.ok(f.nodes.every(n=>n.notification===null));assert.doesNotMatch(render(f),/>✓ complete<|#26804E/);
 assert.equal((render(f).match(/data-lane-terminal="cancelled"[^>]*>×</g)||[]).length,2,'× przy A i B');
 assert.equal(h.frames.size,0,'brak zegara po zatrzymaniu obu wykonań');
 assert.deepEqual(navigation,[]);controller.next();assert.deepEqual(navigation,[1]);
});

test('rewinding: undo the last action, then back through emissions, subscribe and READY; re-entry starts from zero',async()=>{
 const navigation=[];
 const {player,controller,h}=await live('4:3',{stageOptions:{onNavigate:d=>navigation.push(d)}});
 toEmissions({player,controller,h});h.advance(2000);controller.next();h.advance(3000);controller.next();h.advance(3000);
 controller.previous();assert.equal(player.live.stage,1);assert.deepEqual(sourceLanes(player.snapshot),['A:running','B:running']);
 controller.previous();assert.equal(player.live.stage,0);assert.ok(!player.snapshot.nodes.some(n=>n.id==='B'),'B znika');
 controller.previous();assert.equal(player.time,stopTime(player,'subscribed'));assert.equal(player.live.state,'idle');assert.equal(player.isPlaying,false);
 assert.deepEqual(values(player.snapshot,'A'),[]);
 controller.previous();assert.equal(player.state,'ready');
 controller.previous();assert.deepEqual(navigation,[-1]);
 // Wyjście ze slajdu: suspend + reset (jak w main.js) — po powrocie READY, nic nie odtwarza się samo.
 toEmissions({player,controller,h});h.advance(3000);controller.suspend('slide');controller.reset();
 assert.equal(player.state,'ready');assert.equal(h.frames.size,0);
 controller.resume('slide');assert.equal(player.isPlaying,false);h.advance(3000);assert.equal(player.time,0);
 toEmissions({player,controller,h});h.advance(2000);assert.deepEqual(values(player.snapshot,'A'),['0'],'licznik od zera');
});

test('quick repeated next finishes each step; AUTO and pause never subscribe B or unsubscribe by themselves',async()=>{
 const {player,controller,h}=await live('16:9');
 controller.next();controller.next();assert.equal(player.time,stopTime(player,'subscribed'));assert.equal(player.isPlaying,false);
 controller.next();controller.next();assert.equal(player.live.state,'running');assert.equal(player.time,player.live.start);
 assert.equal(player.live.stage,0,'drugie „dalej” tylko dochodzi do emisji');
 controller.next();assert.equal(player.live.stage,1,'kolejne „dalej” to akcja B');
 controller.next();assert.equal(player.live.stage,1,'w trakcie zestawiania B „dalej” tylko kończy animację');
 assert.equal(h.frames.size,1,'jeden RAF');
 controller.setMode('auto');h.advance(20000);assert.equal(player.live.stage,1);assert.equal(player.isPlaying,true);
 controller.toggle();const paused=player.time;h.advance(3000);assert.equal(player.time,paused);
 controller.toggle();h.advance(500);assert.ok(player.time>paused);assert.equal(player.live.stage,1);
});

test('Reveal fragments follow the stages; FINISHED/print shows both executions cancelled',async()=>{
 const {scene}=await interval('4:3'),h=await playbackHarness(),{deck,stage,bindings}=revealMock();
 stage.markers=Array.from({length:6},(_,index)=>({index,visible:false,closest(s){return s==='section'?stage:s==='.rx-fragment-steps'?stage.markers:null;}}));
 const {player,controller}=h.create({scene,controls:{stageOptions:{onNavigate:d=>deck.navigation.push(d)}}});
 const adapter=h.install(deck,{getController:s=>s===stage?controller:null});adapter.refresh();
 deck.press(39);h.advance(3000);assert.equal(deck.fragmentIndex,0);
 deck.press(39);h.advance(2000);assert.equal(deck.fragmentIndex,1);assert.equal(player.live.state,'running');
 deck.press(39);h.advance(3000);assert.equal(deck.fragmentIndex,2);
 deck.press(39);h.advance(3000);assert.equal(deck.fragmentIndex,3);
 deck.press(39);h.advance(6000);assert.equal(player.state,'finished');assert.equal(deck.fragmentIndex,5);
 deck.press(39);assert.deepEqual(deck.navigation,[1]);
 assert.ok(bindings.size>0);adapter.destroy();
 const printed=await live('4:3');printed.player.finish();
 const f=printed.player.snapshot;
 assert.equal(printed.player.state,'finished');assert.deepEqual(sourceLanes(f),['A:cancelled','B:cancelled']);
 assert.equal(values(f,'B').length>0,true);assert.ok(!f.edges.some(e=>e.cancel));
 // „Pokaż wynik” w trakcie emisji wykonuje pozostałe akcje i kończy oba wykonania.
 const running=await live('4:3');toEmissions(running);running.h.advance(5000);running.controller.finish();
 assert.equal(running.player.state,'finished');assert.deepEqual(sourceLanes(running.player.snapshot),['A:cancelled','B:cancelled']);
});

test('lane look in both formats: interval 340/420 with two execution rows, receivers 910/400, balls inside rows',async()=>{
 for(const format of ['4:3','16:9']){
  const {player,controller,h,svg}=await live(format);
  toEmissions({player,controller,h});h.advance(2000);controller.next();h.advance(5000);
  const f=player.snapshot,source=f.nodes.find(n=>n.id==='interval');
  assert.equal(f.textScale,1.42);assert.equal(source.label,'interval');assert.equal(source.fill,'#8FC9D4');
  assert.deepEqual([source.x,source.w],[340,420]);
  for(const id of ['A','B']){
   const n=f.nodes.find(x=>x.id===id),h0=f.histories.find(x=>x.anchor===id);
   assert.deepEqual([n.x,n.w],[910,400]);assert.equal(h0.y,lane(f,id).y);assert.equal(h0.max,3);
   assert.ok(h0.x+2*(2*f.ball.r+h0.gap)+f.ball.r<n.x+n.w/2,'trzy kulki mieszczą się w wierszu');
  }
  assert.ok(f.callouts.every(c=>c.y<source.y-source.h/2),'migawki nad diagramem');
  assert.ok(source.y+source.h/2<=f.height);
  assert.equal(f.panels.length,0);assert.doesNotMatch(svg(),/NaN|Infinity|timer/);
 }
});

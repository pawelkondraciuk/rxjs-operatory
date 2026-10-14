const {test}=require('node:test'),assert=require('node:assert/strict');
const {modules,playbackHarness,revealMock}=require('./v2-harness.cjs');
// Wariant 05-zrodla: interval(1000) na żywo — emisje bez końca, aż do ręcznego unsubscribe.
async function interval(format){
 const m=await modules(['catalog','scene-config','engine','renderer']);
 const base=m.catalog.scenes.find(s=>s.id==='05-zrodla');
 const scene=m['scene-config'].configureScene({...base,rendererId:'05-zrodla',sourceExample:0,...(format?{format}:{})});
 return {scene,render:m.renderer.renderScene};
}
const values=frame=>Array.from(frame.histories[0].values,v=>v.value);
const lane=(frame,id)=>frame.nodes.find(n=>n.id===id).laneStates?.[0];
const delivered=(frame,from=0)=>values(frame).slice(from);
async function live(format){
 const {scene,render}=await interval(format),h=await playbackHarness(),{player,controller,elements}=h.create({scene});
 return {scene,render,h,player,controller,elements,svg:()=>elements.get('.rx-stage').innerHTML};
}

test('READY shows only the definition: no receiver, no lane, no emissions',async()=>{
 const {scene,player,h}=await live('4:3');
 assert.equal(scene.code,'interval(1000)');assert.doesNotMatch(scene.code,/timer|subscribe/);
 assert.equal(scene.playback.controller,'stages');assert.equal(player.state,'ready');
 const f=player.snapshot;
 assert.deepEqual(Array.from(f.nodes,n=>n.id),['interval','observer']);
 assert.equal(f.nodes.find(n=>n.id==='observer').opacity,0);
 assert.deepEqual(Array.from(f.nodes.find(n=>n.id==='interval').laneRows),[]);
 assert.ok(f.edges.every(e=>!e.visible));assert.deepEqual(values(f),[]);assert.equal(f.metrics[0].value,0);
 h.advance(5000);assert.equal(player.time,0,'bez „dalej” nic nie rusza');
});

test('first next subscribes A; interval then emits 0, 1, 2… every second without stopping on checkpoints',async()=>{
 const {player,controller,h,svg}=await live('4:3');
 controller.next();h.advance(1300);
 const f=player.snapshot;
 assert.equal(lane(f,'interval').state,'running');assert.equal(lane(f,'observer').state,'running');
 assert.equal(f.edges[0].phase,'subscribed');assert.equal(player.live.state,'running');
 // Po 5 s emisji: 0–4 dotarły, licznik nadal działa.
 h.advance(5800);
 assert.deepEqual(delivered(player.snapshot,-3),['2','3','4']);assert.equal(player.snapshot.metrics[0].value,5);
 assert.equal(player.state,'playing');
 // Po 30 s: nadal działa, najwyżej 3 widoczne kulki (+1 wypadająca), stała geometria.
 const geometry=JSON.stringify(player.snapshot.nodes.map(n=>[n.x,n.y,n.w,n.h]));
 h.advance(30000);
 assert.equal(player.state,'playing');assert.ok(player.snapshot.metrics[0].value>=35);
 assert.ok(player.snapshot.histories[0].values.length<=4);
 assert.ok((svg().match(/data-token="received"/g)||[]).length<=4);
 assert.equal(JSON.stringify(player.snapshot.nodes.map(n=>[n.x,n.y,n.w,n.h])),geometry);
 const shown=delivered(player.snapshot,-3).map(Number);
 assert.deepEqual(shown,[shown[0],shown[0]+1,shown[0]+2]);
 assert.ok(player.snapshot.plan===undefined);
});

test('next during emissions starts .unsubscribe(): grey × pulse travels left, lanes cancel, no complete, no later next',async()=>{
 const {player,controller,h,svg,render}=await live('4:3');
 controller.next();h.advance(7300);
 const before=player.snapshot.metrics[0].value;
 controller.next();assert.equal(player.live.state,'closed');
 // Wartość już wysłana dociera; po niej rusza unsubscribe, bez nowych emisji.
 // next w 7,3 s: wartość wysłana w 7,1 s dociera w 7,9 s, dopiero wtedy rusza pocisk unsubscribe.
 h.advance(400);assert.ok(!player.snapshot.edges[0].cancel,'najpierw dociera wysłana wartość');
 h.advance(300);
 const travelling=player.snapshot;
 assert.ok(travelling.edges[0].cancel,'pocisk × w drodze');
 assert.match(svg(),/data-cancel="interval-observer"[^]*?×/);assert.match(svg(),/data-cancel-trail/);
 assert.equal(lane(travelling,'observer').state,'cancelled');assert.equal(lane(travelling,'interval').state,'running');
 assert.ok(travelling.callouts.some(c=>c.text==='.unsubscribe()'&&c.y>travelling.nodes.find(n=>n.id==='observer').y));
 const xs=[];for(let i=0;i<6;i++){const e=player.snapshot.edges[0];if(e.cancel)xs.push(e.cancel.x);h.advance(150);}
 assert.ok(xs.length>=2&&xs.every((x,i)=>!i||x<xs[i-1]),'pocisk jedzie w lewo');
 h.advance(3000);
 const end=player.snapshot;
 assert.equal(player.state,'finished');assert.equal(controller.state.state,'finished');
 assert.equal(lane(end,'interval').state,'cancelled');assert.equal(lane(end,'observer').state,'cancelled');
 assert.equal(end.edges[0].phase,'unsubscribe');assert.equal(end.edges[0].color,'#808890');
 assert.ok(end.nodes.every(n=>n.notification===null));assert.doesNotMatch(render(end),/>✓ complete<|#26804E/);
 assert.ok(end.metrics[0].value<=before+1);
 const count=end.metrics[0].value;assert.equal(Number(values(end).at(-1)),count-1,'ostatnia emisja dotarła przed unsubscribe');
 h.advance(10000);assert.equal(player.snapshot.metrics[0].value,count);assert.equal(h.frames.size,0,'brak zegara po anulowaniu');
});

test('third next navigates away; rewinding steps back; re-entry reset starts from zero',async()=>{
 const navigation=[];
 const {scene}=await interval('4:3'),h=await playbackHarness();
 const {player,controller}=h.create({scene,controls:{stageOptions:{onNavigate:d=>navigation.push(d)}}});
 controller.next();h.advance(4300);controller.next();h.advance(4000);
 assert.equal(player.state,'finished');assert.deepEqual(navigation,[]);
 controller.next();assert.deepEqual(navigation,[1]);
 // ← z anulowanego wraca do emisji od zera, kolejne ← do READY.
 controller.previous();assert.equal(player.live.state,'running');assert.equal(player.isPlaying,true);
 assert.deepEqual(values(player.snapshot),[]);
 h.advance(2500);assert.deepEqual(values(player.snapshot),['0']);
 controller.previous();assert.equal(player.state,'ready');assert.equal(player.live.state,'idle');
 controller.previous();assert.deepEqual(navigation,[1,-1]);
 // Wyjście ze slajdu: suspend + reset (jak w main.js) — po powrocie READY, nic nie odtwarza się samo.
 controller.next();h.advance(6000);controller.suspend('slide');controller.reset();
 assert.equal(player.state,'ready');assert.equal(h.frames.size,0);
 controller.resume('slide');assert.equal(player.isPlaying,false);h.advance(3000);assert.equal(player.time,0);
 controller.next();h.advance(3000);assert.deepEqual(values(player.snapshot),['0'],'licznik od zera');
});

test('quick repeated next never doubles the execution; AUTO and pause never unsubscribe by themselves',async()=>{
 const {player,controller,h}=await live('16:9');
 controller.next();controller.next();assert.equal(player.live.state,'running');assert.equal(player.time,player.live.start);
 assert.equal(h.frames.size,1,'jeden RAF');
 controller.setMode('auto');h.advance(20000);assert.equal(player.live.state,'running');assert.equal(player.isPlaying,true);
 controller.toggle();const paused=player.time;h.advance(3000);assert.equal(player.time,paused);
 controller.toggle();h.advance(500);assert.ok(player.time>paused);assert.equal(player.live.state,'running');
 controller.next();controller.next();assert.equal(player.state,'finished');
});

test('Reveal fragments follow the three stages and FINISHED/print shows a cancelled, still frame',async()=>{
 const {scene}=await interval('4:3'),h=await playbackHarness(),{deck,stage,bindings}=revealMock();
 stage.markers=stage.markers.slice(0,2);
 const {player,controller}=h.create({scene,controls:{stageOptions:{onNavigate:d=>deck.navigation.push(d)}}});
 const adapter=h.install(deck,{getController:s=>s===stage?controller:null});adapter.refresh();
 deck.press(39);h.advance(3000);assert.equal(deck.fragmentIndex,0);assert.equal(player.live.state,'running');
 deck.press(39);h.advance(4000);assert.equal(deck.fragmentIndex,1);assert.equal(player.state,'finished');
 deck.press(39);assert.deepEqual(deck.navigation,[1]);
 assert.ok(bindings.size>0);adapter.destroy();
 const printed=(await live('4:3'));printed.player.finish();
 const f=printed.player.snapshot;
 assert.equal(printed.player.state,'finished');assert.equal(lane(f,'observer').state,'cancelled');
 assert.deepEqual(values(f),['0','1','2']);assert.ok(!f.edges[0].cancel);
 // „Pokaż wynik” w trakcie emisji kończy bieżące wykonanie, nie cofa do umownej chwili.
 const running=await live('4:3');running.controller.next();running.h.advance(12000);
 const count=running.player.snapshot.metrics[0].value;running.controller.finish();
 assert.equal(running.player.state,'finished');assert.ok(running.player.snapshot.metrics[0].value>=count);
 assert.ok(Number(values(running.player.snapshot).at(-1))>=count-1);
});

test('lane look in both formats: one row interval(1000) → A, balls inside the receiver row, .subscribe() above',async()=>{
 for(const format of ['4:3','16:9']){
  const {player,controller,h,svg}=await live(format);
  controller.next();h.advance(400);
  const f=player.snapshot,source=f.nodes.find(n=>n.id==='interval'),receiver=f.nodes.find(n=>n.id==='observer');
  assert.equal(f.textScale,1.42);assert.equal(source.label,'interval(1000)');assert.equal(source.fill,'#8FC9D4');
  assert.deepEqual(Array.from(f.callouts,c=>c.text),['.subscribe()']);assert.ok(f.callouts[0].y<source.y-source.h/2);
  h.advance(6000);
  const g=player.snapshot,h0=g.histories[0];
  assert.equal(h0.y,lane(g,'observer').y);assert.equal(lane(g,'interval').y,h0.y);
  assert.ok(h0.x+2*(2*g.ball.r+h0.gap)+g.ball.r<receiver.x+receiver.w/2,'trzy kulki mieszczą się w wierszu');
  assert.equal(g.panels.length,0);assert.doesNotMatch(svg(),/NaN|Infinity|timer/);
 }
});

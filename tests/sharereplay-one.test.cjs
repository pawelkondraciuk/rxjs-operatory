const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {modules,playbackHarness}=require('./v2-harness.cjs');
// 20a-sharereplay-interval (MAIN, przed shareReplay z refCount: true na HTTP): interval(1000).pipe(shareReplay(1)) → A/B
// w wyglądzie 20-sharereplay-2 (kieszeń „bufor”, rozdzielenie w wierszu, odtworzenie z kieszeni). Scena na żywo:
// pierwsze „dalej” — A subskrybuje i ruszają emisje bez przerwy; potem akcje subA.unsubscribe(), B, subB.unsubscribe().
// Bez odbiorców wartości i tak wjeżdżają do bufora; interval nigdy nie jest odłączany. Bez complete.
const id='20a-sharereplay-interval';

async function scene(format='4:3'){
 const m=await modules(['catalog','scene-config','engine','renderer']);
 const s=m['scene-config'].configureScene({...m.catalog.scenes.find(x=>x.id===id),format});
 return {scene:s,compile:m.engine.compileScene,render:m.renderer.renderScene};
}
async function live(format,controls){
 const {scene:s,render}=await scene(format),h=await playbackHarness(),{player,controller}=h.create({scene:s,controls});
 return {scene:s,render,h,player,controller};
}
const metric=(f,label)=>f.metrics.find(x=>x.label===label).value;
const values=(f,anchor)=>Array.from(f.histories.find(h=>h.anchor===anchor)?.values||[],v=>v.value);
const node=(f,id)=>f.nodes.find(n=>n.id===id);
const lane=(f,id,sub)=>node(f,id)?.laneStates.find(l=>l.subscriber===sub);
const buffer=f=>Array.from(node(f,'replay').bufferPocket?.values||[],v=>v.value);

test('READY: definitions only, empty buffer pocket; same look as shareReplay on HTTP',async()=>{
 const {scene:s,compile,render}=await scene(),c=compile(s),f=c.snapshot(0);
 assert.equal(s.title,'shareReplay(1): kto zatrzyma interval?');
 assert.equal(s.code,'interval(1000).pipe(\n  shareReplay(1))');
 assert.equal(s.playback.controller,'stages');assert.ok(s.live&&!s.live.autoplay);
 assert.deepEqual(Array.from(s.playback.stops,x=>x.id),['subscribed-a','unsub-a','subscribed-b','unsub-b']);
 assert.equal(s.playback.stops[0].time,s.live.start,'krok 1 to start emisji, bez postoju przed nim');
 assert.deepEqual(Array.from(f.nodes.filter(n=>n.visible&&n.opacity>0),n=>n.label),['interval(1000)','shareReplay(1)']);
 assert.ok(f.edges.every(e=>!e.visible));assert.deepEqual(buffer(f),[]);
 assert.deepEqual([metric(f,'Odbiorcy'),metric(f,'Upstream')],[0,0]);
 // Wygląd jak 20-sharereplay-2: kieszeń bufora, kolumny 202/577/995, ten sam renderer bufora.
 const {scene:ref,compile:cr}=await (async()=>{const m=await modules(['catalog','scene-config','engine']);
  const base=m.catalog.scenes.find(x=>x.id==='20-sharereplay');
  return {scene:m['scene-config'].configureScene({...base,...base.variants.shared,variants:undefined,id:'20-sharereplay-2',rendererId:'20-sharereplay',comparisonMode:'shared',format:'4:3'}),compile:m.engine.compileScene};})();
 const rf=cr(ref).snapshot(0);
 for(const [a,b] of [['interval','http'],['replay','replay']])for(const key of ['x','w'])assert.equal(node(f,a)[key],node(rf,b)[key],a+'.'+key);
 assert.match(render(f),/data-buffer=/);
});

test('one step starts everything: A subscribes, upstream connects, emissions run without pausing at stops',async()=>{
 const {player,controller,h}=await live('4:3');
 controller.next();h.advance(1000);
 assert.deepEqual(Array.from(player.snapshot.callouts,x=>x.text+' '+x.label),['.subscribe() A']);
 h.advance(7000);let f=player.snapshot;
 assert.equal(player.live.state,'running');assert.equal(player.isPlaying,true,'bez postoju po starcie emisji');
 assert.ok(values(f,'A').length>=2);assert.deepEqual([metric(f,'Odbiorcy'),metric(f,'Upstream')],[1,1]);
 assert.equal(buffer(f).length,1,'bufor trzyma ostatnią wartość');
 const before=values(f,'A').at(-1);h.advance(3000);
 assert.ok(Number(values(player.snapshot,'A').at(-1))>Number(before),'interval emituje dalej bez klikania');
 // Rozdzielenie: jedna kulka do A, druga do kieszeni bufora.
 let seen=new Set();for(let i=0;i<40;i++){h.advance(50);for(const t of player.snapshot.tokens)seen.add(t.phase);}
 assert.ok(seen.has('split-out')&&seen.has('buffer-in'),[...seen].join());
});

test('unsubscribe A: × ends on shareReplay(1); with zero receivers values still go into the buffer',async()=>{
 const {player,controller,h}=await live('4:3');
 controller.next();h.advance(6000);controller.next();assert.equal(player.live.stage,1);
 h.advance(3000);let f=player.snapshot;
 assert.equal(lane(f,'A','A').state,'cancelled');assert.equal(lane(f,'interval','U1').state,'running');
 assert.deepEqual([metric(f,'Odbiorcy'),metric(f,'Upstream')],[0,1]);
 const lastA=values(f,'A').at(-1),stored=buffer(f)[0];
 const phases=new Set();for(let i=0;i<80;i++){h.advance(50);for(const t of player.snapshot.tokens)phases.add(t.phase);}
 f=player.snapshot;
 assert.equal(values(f,'A').at(-1),lastA,'A nic już nie dostaje');
 assert.ok(Number(buffer(f)[0])>Number(stored),'bufor aktualizuje się bez odbiorców');
 assert.ok(phases.has('buffer-in')&&!phases.has('split-out'),'wartość bez odbiorców wjeżdża tylko do bufora');
 assert.ok(!f.edges.some(e=>e.id==='interval-replay'&&e.cancel),'upstream nie jest odłączany');
});

test('B subscribes later: first the buffered value comes out of the pocket, then live values; no second upstream',async()=>{
 const {player,controller,h}=await live('4:3');
 controller.next();h.advance(6000);controller.next();h.advance(4000);
 controller.next();assert.equal(player.live.stage,2);assert.equal(player.live.busy,true);
 const phases=new Set();let buffered;
 for(let i=0;i<80;i++){h.advance(50);const tokens=player.snapshot.tokens;
  for(const t of tokens)phases.add(t.phase);
  const replay=tokens.find(t=>t.phase==='replay');if(replay&&buffered===undefined){buffered=replay.value;assert.equal(buffer(player.snapshot)[0],replay.value,'kulka z kieszeni = zawartość bufora');}}
 let f=player.snapshot;
 assert.ok(phases.has('replay'),'kulka wyjeżdża z kieszeni bufora');
 assert.equal(values(f,'B')[0],buffered,'B najpierw dostaje wartość z bufora');
 h.advance(4000);f=player.snapshot;
 assert.ok(values(f,'B').length>=2&&Number(values(f,'B').at(-1))>Number(buffered),'potem kolejne na żywo');
 assert.deepEqual([metric(f,'Odbiorcy'),metric(f,'Upstream')],[1,1]);
 assert.equal(node(f,'interval').laneStates.length,1,'jedno połączenie upstream');
});

test('unsubscribe B: zero receivers again, interval keeps running; next step navigates; left undoes actions',async()=>{
 const navigation=[];
 const {player,controller,h,render}=await live('4:3',{stageOptions:{onNavigate:d=>navigation.push(d)}});
 controller.next();h.advance(6000);controller.next();h.advance(4000);controller.next();h.advance(5000);
 controller.next();assert.equal(player.live.stage,3);h.advance(3000);
 let f=player.snapshot;
 assert.equal(lane(f,'B','B').state,'cancelled');assert.equal(lane(f,'interval','U1').state,'running');
 assert.deepEqual([metric(f,'Odbiorcy'),metric(f,'Upstream')],[0,1]);
 const stored=buffer(f)[0];h.advance(4000);
 assert.ok(Number(buffer(player.snapshot)[0])>Number(stored),'interval nadal pracuje');
 assert.equal(player.isPlaying,true);
 assert.doesNotMatch(render(player.snapshot),/✓ complete|NaN|Infinity/);
 controller.next();assert.deepEqual(navigation,[1]);
 controller.previous();assert.equal(player.live.stage,2);h.advance(2000);
 assert.equal(lane(player.snapshot,'B','B').state,'running','cofnięcie przywraca B');
 controller.suspend('slide');controller.reset();assert.equal(player.live.stage,0);assert.equal(player.time,0);
});

test('print and restore: stable frames with defaults; deterministic snapshots in both formats',async()=>{
 for(const format of ['4:3','16:9']){
  const {scene:s,compile,render}=await scene(format);
  const v=s.live.variant(s,{from:0,to:s.live.window,closedAt:s.live.defaultClose,actions:s.live.defaults}),c=compile(v);
  for(const time of [0,...s.playback.stops.map(x=>x.time),c.duration]){
   const f=c.snapshot(time),frame=JSON.stringify(f);
   for(const n of f.nodes.filter(n=>n.visible))assert.ok(n.y-n.h/2>=-1&&n.y+n.h/2<=f.height+1,format+' '+n.id);
   const pocket=node(f,'replay').bufferPocket;if(pocket)assert.ok(pocket.y+pocket.h/2<=f.height,format+' bufor w ramce');
   c.snapshot(c.duration);c.snapshot(0);assert.equal(JSON.stringify(c.snapshot(time)),frame);
   assert.doesNotMatch(render(f),/NaN|Infinity|="undefined"/);
  }
  const end=c.snapshot(c.duration);
  assert.deepEqual(['A','B'].map(x=>lane(end,x,x).state),['cancelled','cancelled']);
  assert.equal(lane(end,'interval','U1').state,'running');assert.equal(c.events.some(e=>e.type==='stream-complete'),false);
  assert.equal(c.events.some(e=>e.edge==='interval-replay'&&e.type==='inner-unsubscribe'),false);
 }
 const restored=await live('4:3');
 restored.controller.seekCheckpoint(restored.player.stops.find(x=>x.id==='subscribed-b').time);
 assert.equal(restored.player.live.stage,2);assert.ok(values(restored.player.snapshot,'B').length>=1);
 const printed=await live('4:3');printed.player.finish();
 assert.equal(printed.player.state,'finished');assert.equal(printed.player.live.stage,3);
});

test('placed between share() late receiver and shareReplay refCount: true; notes cover every checkpoint',async()=>{
 const {scene:s}=await scene(),{mainOrder}=(await modules(['scene-config']))['scene-config'];
 const i=mainOrder.indexOf(id);
 assert.deepEqual([mainOrder[i-1],mainOrder[i+1]],['20-sharereplay','20-sharereplay-2']);
 const html=fs.readFileSync('index.html','utf8');
 const source=html.match(new RegExp(`<template data-checkpoint-notes="${id}">([\\s\\S]*?)</template>`))[1];
 assert.deepEqual(Array.from(source.matchAll(/data-checkpoint="([^"]+)"/g),x=>x[1]),['ready',...s.playback.stops.map(x=>x.id),'finished']);
 assert.match(source,/refCount: false/);assert.match(source,/refCount: true/);assert.match(source,/cały czas/);
});

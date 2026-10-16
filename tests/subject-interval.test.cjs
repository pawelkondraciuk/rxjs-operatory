const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {modules,playbackHarness,revealMock}=require('./v2-harness.cjs');
// 05-zrodla-4: Subject + interval — odbiorcy A/B/C odchodzą kolejno, connection (interval → Subject) zostaje.
async function scene(format='4:3'){
 const m=await modules(['catalog','scene-config','engine','renderer']);
 const s=m['scene-config'].configureScene({...m.catalog.scenes.find(x=>x.id==='05-zrodla'),id:'05-zrodla-4',rendererId:'05-zrodla',sourceExample:3,format});
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

test('READY: code, already connected interval → Subject → A/B/C, no subscribe animation',async()=>{
 const {scene:s,compile}=await scene(),c=compile(s),f=c.snapshot(0);
 assert.equal(s.title,'Subject — kto odłączy źródło?');
 assert.equal(s.code,'const subject$ = new Subject<number>();\nconst connection = interval(1000).subscribe(subject$);');
 assert.doesNotMatch(s.code,/subA|unsubscribe|share/);
 assert.equal(s.playback.controller,'stages');assert.deepEqual(Array.from(c.stops,x=>x.id),['unsub-a','unsub-b','unsub-c','source']);
 assert.deepEqual(Array.from(f.nodes,n=>n.id),['interval','subject','A','B','C']);
 assert.equal(node(f,'interval').label,'interval(1000)');assert.equal(node(f,'subject').label,'Subject');
 assert.equal(lane(f,'interval','U').state,'running');
 for(const id of receivers){
  assert.equal(lane(f,'subject',id).state,'running');assert.equal(lane(f,id,id).state,'running');
  assert.equal(edge(f,'subject-'+id).progress,1);assert.equal(edge(f,'subject-'+id).visible,true);
 }
 assert.equal(edge(f,'interval-subject').progress,1);
 assert.ok(c.events.filter(e=>e.type==='connected').every(e=>e.at<0),'subskrypcje zestawione przed READY');
 assert.ok(node(f,'subject').laneRows.every(r=>r.growth===1));
 assert.equal(metric(f,'Odbiorcy Subject'),3);assert.equal(metric(f,'Emisje interval'),0);
});

test('lane geometry: one interval lane, three Subject lanes aligned with compact receivers, colours A/B/C',async()=>{
 for(const format of ['4:3','16:9']){
  const {scene:s,compile,render}=await scene(format),f=compile(s).snapshot(3);
  assert.equal(f.textScale,1.42);
  const subject=node(f,'subject'),rows=subject.laneRows;
  assert.equal(rows.length,3);assert.equal(node(f,'interval').laneRows.length,1);
  for(const id of receivers){
   assert.equal(lane(f,'subject',id).y,lane(f,id,id).y,id);
   assert.equal(f.histories.find(h=>h.anchor===id).y,lane(f,id,id).y);
   const e=edge(f,'subject-'+id);assert.equal(e.points[0][1],e.points.at(-1)[1],'poziomy kabel '+id);
  }
  assert.equal(lane(f,'interval','U').y,lane(f,'subject','A').y,'connection prosto w wiersz A');
  assert.deepEqual(receivers.map(id=>lane(f,id,id).color),['#7457D9','#D8840F','#2F7ED8']);
  assert.ok(f.nodes.every(n=>n.x-n.w/2>=0&&n.x+n.w/2<=f.width&&(n.y+n.h/2)<=f.height),format);
  assert.equal(f.panels.length,0);assert.doesNotMatch(render(f),/NaN|Infinity|legend|legenda/);
 }
});

test('emissions run every second without stopping; each receiver shows its latest value',async()=>{
 const {player,controller,h,svg}=await live('4:3');
 controller.toggle();assert.equal(player.isPlaying,true);
 h.advance(5000);
 const f=player.snapshot;
 assert.equal(metric(f,'Emisje interval'),5);
 for(const id of receivers)assert.equal(last(f,id),'2',id);
 h.advance(40000);
 assert.equal(player.isPlaying,true);assert.ok(metric(player.snapshot,'Emisje interval')>=45);
 assert.ok(player.snapshot.histories.every(x=>x.values.length<=2));
 assert.ok((svg().match(/data-token="received"/g)||[]).length<=6);
 assert.equal(h.frames.size,1,'jeden RAF');
});

test('A, B, C unsubscribe one by one: grey × to Subject only, others keep receiving, interval never stops, no complete',async()=>{
 const {player,controller,h,svg,render}=await live('4:3');
 controller.toggle();h.advance(4000);
 controller.next();assert.equal(player.live.stage,1);
 h.advance(200);
 assert.deepEqual(Array.from(player.snapshot.callouts,c=>c.text+' '+c.label),['subA.unsubscribe() A']);
 h.advance(1100);
 const pulse=player.snapshot;
 assert.ok(edge(pulse,'subject-A').cancel,'pocisk × w drodze');assert.match(svg(),/data-cancel="subject-A"/);
 h.advance(1500);
 let f=player.snapshot;
 assert.equal(lane(f,'subject','A').state,'cancelled');assert.equal(lane(f,'A','A').state,'cancelled');
 assert.equal(edge(f,'subject-A').color,'#808890');assert.equal(edge(f,'interval-subject').phase,'subscribed');
 assert.equal(edge(f,'interval-subject').color,'#238F83');assert.ok(!edge(f,'interval-subject').cancel);
 const frozenA=last(f,'A'),bBefore=last(f,'B');
 h.advance(3000);f=player.snapshot;
 assert.equal(last(f,'A'),frozenA,'A nie dostaje nowych wartości');assert.notEqual(last(f,'B'),bBefore);assert.equal(last(f,'B'),last(f,'C'));
 assert.equal(metric(f,'Odbiorcy Subject'),2);
 controller.next();h.advance(3500);controller.next();h.advance(3500);
 f=player.snapshot;assert.equal(player.live.stage,3);
 for(const id of receivers){assert.equal(lane(f,'subject',id).state,'cancelled');assert.equal(edge(f,'subject-'+id).phase,'unsubscribe');}
 assert.equal(metric(f,'Odbiorcy Subject'),0);
 const finals=receivers.map(id=>last(f,id)),count=metric(f,'Emisje interval');
 assert.ok(finals.every(Boolean));
 // Źródło pracuje dalej: wartości docierają do Subject i tam gasną, odbiorcy zachowują ostatnie liczby.
 let drop=false;
 for(let i=0;i<20;i++){h.advance(100);if(player.snapshot.tokens.some(t=>t.phase==='drop'&&t.opacity<1))drop=true;}
 assert.ok(drop,'kulka gaśnie w Subject');assert.match(svg(),/data-token="drop"[^>]*opacity=/);
 h.advance(5000);f=player.snapshot;
 assert.ok(metric(f,'Emisje interval')>=count+6,'licznik interval rośnie');
 assert.deepEqual(receivers.map(id=>last(f,id)),finals);
 assert.ok(!f.tokens.some(t=>t.phase==='split-out'),'brak rozsyłania bez odbiorców');
 assert.equal(lane(f,'interval','U').state,'running');assert.equal(edge(f,'interval-subject').phase,'subscribed');
 assert.ok(f.nodes.every(n=>n.notification===null));assert.doesNotMatch(render(f),/✓ complete|#26804E/);
 assert.ok(player.snapshot.edges.every(e=>e.id==='interval-subject'||e.phase==='unsubscribe'));
 // Każde unsubscribe kończy się na Subject: żadne zdarzenie nie dotyczy połączenia interval → Subject.
 assert.ok(!player.snapshot.callouts?.length);
});

test('stage 4 highlights connection; next then navigates; previous undoes the last action; re-entry starts fresh',async()=>{
 const navigation=[];
 const {player,controller,h}=await live('4:3',{stageOptions:{onNavigate:d=>navigation.push(d)}});
 controller.toggle();h.advance(2000);
 for(let i=0;i<3;i++){controller.next();h.advance(3000);}
 const code=()=>player.snapshot.codeView[1].find(part=>part.mark?.id==='connection');
 assert.equal(code().active,false);
 controller.next();assert.equal(player.live.stage,4);h.advance(200);
 assert.equal(code().active,true);assert.match(player.snapshot.caption,/interval nadal emituje/);
 assert.equal(player.isPlaying,true);assert.deepEqual(navigation,[]);
 h.advance(20000);assert.equal(player.isPlaying,true);assert.equal(player.state,'playing');
 controller.next();assert.deepEqual(navigation,[1]);
 // ← cofa kolejne akcje: C znowu odbiera.
 controller.previous();controller.previous();assert.equal(player.live.stage,2);assert.equal(player.isPlaying,true);
 h.advance(3000);assert.equal(lane(player.snapshot,'C','C').state,'running');
 const c=player.snapshot.histories.find(x=>x.anchor==='C').values.at(-1).arrival;assert.ok(c>player.time-1.5,'C dostaje bieżące wartości');
 controller.previous();controller.previous();assert.equal(player.live.stage,0);
 controller.previous();assert.deepEqual(navigation,[1,-1]);
 // Wyjście ze slajdu (main.js): suspend + reset — brak zegara; po powrocie stan początkowy.
 controller.next();h.advance(1500);controller.next();
 controller.suspend('slide');controller.reset();
 assert.equal(player.state,'ready');assert.equal(player.live.stage,0);assert.equal(h.frames.size,0);
 h.advance(3000);assert.equal(player.time,0);
 controller.resume('slide');assert.equal(player.isPlaying,false);
 controller.toggle();h.advance(2000);
 assert.ok(receivers.every(id=>lane(player.snapshot,id,id).state==='running'));
});

test('quick next only finishes the running unsubscribe; AUTO and pause never unsubscribe; one RAF',async()=>{
 const {player,controller,h}=await live('16:9');
 controller.next();assert.equal(player.isPlaying,true);assert.equal(player.live.stage,0,'z READY dalej tylko uruchamia');
 h.advance(3000);
 controller.next();controller.next();assert.equal(player.live.stage,1,'drugie dalej kończy animację A');
 assert.equal(player.live.busy,false);assert.equal(h.frames.size,1);
 assert.equal(lane(player.snapshot,'A','A').state,'cancelled');
 controller.setMode('auto');h.advance(15000);assert.equal(player.live.stage,1);
 controller.toggle();const paused=player.time;h.advance(2000);assert.equal(player.time,paused);
 controller.next();assert.equal(player.live.stage,2);assert.equal(player.isPlaying,true);assert.equal(h.frames.size,1);
});

test('Reveal fragments and checkpoint notes follow stages; restore and print give stable frames without complete',async()=>{
 const {scene:s}=await scene('4:3'),h=await playbackHarness(),{deck,stage}=revealMock();
 stage.markers=Array.from({length:5},(_,index)=>({index,visible:false,closest(x){return x==='section'?stage:x==='.rx-fragment-steps'?stage.markers:null;}}));
 const {player,controller}=h.create({scene:s,controls:{stageOptions:{onNavigate:d=>deck.navigation.push(d)}}});
 const adapter=h.install(deck,{getController:x=>x===stage?controller:null});adapter.refresh();
 controller.toggle();h.advance(2000);assert.equal(deck.fragmentIndex,-1);
 for(let i=0;i<4;i++){deck.press(39);h.advance(3000);assert.equal(deck.fragmentIndex,i);}
 deck.press(39);assert.deepEqual(deck.navigation,[1]);
 deck.press(37);assert.equal(deck.fragmentIndex,2);adapter.destroy();
 // Hash / podgląd Notes: znacznik unsub-b odtwarza A i B odłączonych, C nadal odbiera.
 const restored=await live('4:3');const time=restored.player.stops.find(x=>x.id==='unsub-b').time;
 restored.controller.seekCheckpoint(time);
 assert.equal(restored.player.live.stage,2);assert.equal(restored.controller.state.checkpointIndex,2);
 const r=restored.player.snapshot;
 assert.deepEqual(receivers.map(id=>lane(r,id,id).state),['cancelled','cancelled','running']);
 assert.ok(!r.callouts?.length,'stabilny kadr bez migawki');
 const printed=await live('4:3');printed.player.finish();
 const p=printed.player.snapshot;
 assert.equal(printed.player.state,'finished');assert.equal(printed.controller.state.state,'finished');
 assert.deepEqual(receivers.map(id=>lane(p,id,id).state),['cancelled','cancelled','cancelled']);
 assert.equal(lane(p,'interval','U').state,'running');assert.equal(metric(p,'Odbiorcy Subject'),0);
 assert.ok(p.codeView[1].find(x=>x.mark?.id==='connection').active);assert.ok(!p.callouts?.length);
 assert.ok(p.nodes.every(n=>n.notification===null));
 printed.h.advance(5000);assert.equal(printed.h.frames.size,0);assert.equal(printed.player.state,'finished');
});

test('speaker notes template covers every checkpoint with the planned narration',async()=>{
 const html=fs.readFileSync('index.html','utf8');
 const source=html.match(/<template data-checkpoint-notes="05-zrodla-4">([\s\S]*?)<\/template>/)[1];
 const ids=Array.from(source.matchAll(/data-checkpoint="([^"]+)"/g),x=>x[1]);
 assert.deepEqual(ids,['ready','unsub-a','unsub-b','unsub-c','source','finished']);
 assert.match(source,/zamiast HTTP wykorzystamy dobrze już znany interval/);
 assert.match(source,/Teraz odłączamy ostatniego\. I jak myślicie, co powinno się wydarzyć ze źródłem\?/);
 assert.match(source,/connection\.unsubscribe\(\)/);assert.match(source,/A gdyby RxJS robił to za nas\?/);
});

const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {modules,playbackHarness,revealMock}=require('./v2-harness.cjs');
// 05-zrodla-4: Subject + interval — odbiorcy A/B/C odchodzą kolejno, connection (interval → Subject) zostaje,
// dopóki ostatnie „dalej” nie wywoła connection.unsubscribe() (bez complete Subjecta).
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
 assert.equal(s.playback.controller,'stages');assert.deepEqual(Array.from(c.stops,x=>x.id),['unsub-a','unsub-b','unsub-c','source','connection']);
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

test('stage 4 highlights connection and emissions never stop on their own; previous undoes the last action; re-entry starts fresh',async()=>{
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
 assert.equal(lane(player.snapshot,'interval','U').state,'running');assert.deepEqual(navigation,[]);
 // ← cofa kolejne akcje: C znowu odbiera.
 controller.previous();controller.previous();assert.equal(player.live.stage,2);assert.equal(player.isPlaying,true);
 h.advance(3000);assert.equal(lane(player.snapshot,'C','C').state,'running');
 const c=player.snapshot.histories.find(x=>x.anchor==='C').values.at(-1).arrival;assert.ok(c>player.time-1.5,'C dostaje bieżące wartości');
 controller.previous();controller.previous();assert.equal(player.live.stage,0);
 controller.previous();assert.deepEqual(navigation,[-1]);
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
 stage.markers=Array.from({length:6},(_,index)=>({index,visible:false,closest(x){return x==='section'?stage:x==='.rx-fragment-steps'?stage.markers:null;}}));
 const {player,controller}=h.create({scene:s,controls:{stageOptions:{onNavigate:d=>deck.navigation.push(d)}}});
 const adapter=h.install(deck,{getController:x=>x===stage?controller:null});adapter.refresh();
 controller.toggle();h.advance(2000);assert.equal(deck.fragmentIndex,-1);
 for(let i=0;i<4;i++){deck.press(39);h.advance(3000);assert.equal(deck.fragmentIndex,i);}
 deck.press(39);assert.equal(deck.fragmentIndex,4);assert.equal(player.live.stage,5);
 // Po connection.unsubscribe() scena dochodzi do FINISHED (marker handoff), kolejne prawo zmienia slajd.
 h.advance(3000);assert.equal(player.state,'finished');assert.equal(deck.fragmentIndex,5);
 deck.press(39);assert.deepEqual(deck.navigation,[1]);
 deck.press(37);assert.equal(deck.fragmentIndex,3);assert.equal(player.live.stage,4);assert.equal(player.isPlaying,true);adapter.destroy();
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
 assert.equal(lane(p,'interval','U').state,'cancelled');assert.equal(edge(p,'interval-subject').color,'#808890');
 assert.equal(metric(p,'Odbiorcy Subject'),0);assert.equal(metric(p,'Emisje interval'),15);
 assert.ok(p.codeView[1].find(x=>x.mark?.id==='connection').active);assert.ok(!p.callouts?.length);
 assert.ok(p.nodes.every(n=>n.notification===null));
 printed.h.advance(5000);assert.equal(printed.h.frames.size,0);assert.equal(printed.player.state,'finished');
});

test('speaker notes template covers every checkpoint with the planned narration',async()=>{
 const html=fs.readFileSync('index.html','utf8');
 const source=html.match(/<template data-checkpoint-notes="05-zrodla-4">([\s\S]*?)<\/template>/)[1];
 const ids=Array.from(source.matchAll(/data-checkpoint="([^"]+)"/g),x=>x[1]);
 assert.deepEqual(ids,['ready','unsub-a','unsub-b','unsub-c','source','connection','finished']);
 const note=id=>source.match(new RegExp(`data-checkpoint="${id}">([\\s\\S]*?)</div>`))[1];
 assert.match(note('ready'),/Zamiast HTTP bierzemy dobrze już znany interval/);
 assert.match(note('unsub-b'),/B również się odłącza\. C nadal otrzymuje wartości\. Ale czy obecność C w ogóle ma wpływ na działanie źródła\?/);
 assert.doesNotMatch(note('unsub-b'),/bo mamy jeszcze trzeciego odbiorcę/);
 assert.match(note('unsub-c'),/Teraz odłączamy ostatniego\. I jak myślicie, co powinno się wydarzyć ze źródłem\?/);
 assert.match(note('source'),/Wszyscy odbiorcy już się odłączyli\. Ale zobaczcie — interval nadal emituje wartości\. Subject ciągle je odbiera, chociaż nikogo już nimi nie powiadamia\./);
 assert.match(note('connection'),/Bo mamy jeszcze jedną subskrypcję, którą sami stworzyliśmy\. To połączenie interval z Subjectem\. I dopiero teraz ręcznie je odłączamy\./);
 assert.match(note('finished'),/W Subject wszyscy się odłączyli, ale interval nadal pracował[\s\S]*Do zarządzania źródłem wrócimy przy share\(\)[\s\S]*Prawo: „Jakie znasz operatory RxJS\?”/);
});

test('last next: connection.unsubscribe() — grey × from Subject to interval, interval cancelled, no more emissions, Subject without complete',async()=>{
 for(const format of ['4:3','16:9']){
  const navigation=[];
  const {player,controller,h,svg,render}=await live(format,{stageOptions:{onNavigate:d=>navigation.push(d)}});
  controller.toggle();h.advance(2000);
  for(let i=0;i<4;i++){controller.next();h.advance(3000);}
  assert.equal(player.live.stage,4);
  const code=()=>player.snapshot.codeView[1].find(part=>part.mark?.id==='connection');
  controller.next();assert.equal(player.live.stage,5);assert.equal(player.live.busy,true);assert.deepEqual(navigation,[]);
  const called=player.time,before=metric(player.snapshot,'Emisje interval');
  h.advance(150);
  let f=player.snapshot;
  const callout=f.callouts.find(c=>c.text==='connection.unsubscribe()');
  assert.ok(callout,'migawka connection.unsubscribe()');assert.equal(callout.label,'#1');assert.equal(callout.color,'#238F83');
  const inter=node(f,'interval'),subj=node(f,'subject');
  assert.ok(callout.x>inter.x&&callout.x<subj.x,'migawka nad połączeniem interval → Subject');
  assert.equal(code().active,true);assert.match(f.caption,/connection\.unsubscribe\(\)/);
  // Impuls × jedzie od Subject w lewo do interval.
  const xs=[];
  for(let i=0;i<30;i++){h.advance(50);const e=edge(player.snapshot,'interval-subject');if(e.cancel)xs.push(e.cancel.x);}
  assert.ok(xs.length>3,'pocisk × na połączeniu');
  assert.ok(xs.every((x,i)=>i===0||x<xs[i-1]),'pocisk jedzie w lewo');
  assert.ok(xs[0]<=subj.x-subj.w/2+1&&xs.at(-1)>=inter.x+inter.w/2-40);
  h.advance(1500);f=player.snapshot;
  assert.equal(lane(f,'interval','U').state,'cancelled');assert.equal(edge(f,'interval-subject').phase,'unsubscribe');
  assert.equal(edge(f,'interval-subject').color,'#808890');assert.ok(edge(f,'interval-subject').opacity<1);
  assert.ok(!f.tokens.some(t=>t.phase==='travel'),'brak kulek w drodze');
  const stopped=metric(f,'Emisje interval');assert.ok(stopped<=before+1,'najwyżej już wysłana wartość');
  assert.ok(stopped<=Math.ceil(called-.5)+1);
  // Subject zostaje otwarty: bez complete, bez nowych wierszy, A/B/C nadal odłączeni.
  assert.ok(f.nodes.every(n=>n.notification===null));assert.doesNotMatch(render(f),/✓ complete|#26804E/);
  assert.ok(!f.edges.some(e=>e.phase==='complete'));
  assert.deepEqual(receivers.map(id=>lane(f,id,id).state),['cancelled','cancelled','cancelled']);
  assert.equal(node(f,'subject').laneRows.length,3);
  assert.equal(player.state,'finished');assert.match(f.caption,/Subject nadal otwarty/);
  assert.match(svg(),/data-row-state="cancelled"/);
  h.advance(10000);assert.equal(metric(player.snapshot,'Emisje interval'),stopped);assert.equal(h.frames.size,0);
  assert.equal(player.time,player.duration);
  controller.next();assert.deepEqual(navigation,[1],format);
  // ← cofa connection.unsubscribe(): interval znowu emituje bez końca.
  controller.previous();assert.equal(player.live.stage,4);assert.equal(player.isPlaying,true);
  h.advance(4000);f=player.snapshot;
  assert.equal(lane(f,'interval','U').state,'running');assert.ok(metric(f,'Emisje interval')>stopped);assert.equal(player.duration,player.duration);
  assert.ok(!f.callouts?.some(c=>c.text==='connection.unsubscribe()'));
  // Wyjście ze slajdu sprząta wykonanie, także bez końcowego kroku.
  controller.suspend('slide');controller.reset();assert.equal(player.live.stage,0);assert.equal(h.frames.size,0);
 }
});

test('quick next during connection.unsubscribe() finishes the animation first; F gives a still stopped frame',async()=>{
 const navigation=[];
 const {player,controller,h}=await live('4:3',{stageOptions:{onNavigate:d=>navigation.push(d)}});
 controller.toggle();h.advance(2000);
 for(let i=0;i<4;i++){controller.next();h.advance(3000);}
 controller.next();h.advance(100);controller.next();
 assert.equal(player.live.busy,false);assert.deepEqual(navigation,[]);
 assert.equal(lane(player.snapshot,'interval','U').state,'cancelled');
 h.advance(2000);assert.equal(player.state,'finished');controller.next();assert.deepEqual(navigation,[1]);
 const stopped=await live('4:3');
 stopped.controller.toggle();stopped.h.advance(2000);
 for(let i=0;i<5;i++){stopped.controller.next();stopped.h.advance(i<4?3000:200);}
 stopped.controller.finish();
 const f=stopped.player.snapshot;
 assert.equal(stopped.player.state,'finished');assert.equal(lane(f,'interval','U').state,'cancelled');
 assert.ok(!f.callouts?.length,'kadr po migawce');assert.ok(f.nodes.every(n=>n.notification===null));
});

test('hash / Notes restore of the connection checkpoint gives the stopped interval',async()=>{
 const {player,controller}=await live('4:3'),time=player.stops.find(x=>x.id==='connection').time;
 controller.seekCheckpoint(time);
 assert.equal(player.live.stage,5);assert.equal(controller.state.checkpointIndex,5);
 const f=player.snapshot;
 assert.equal(lane(f,'interval','U').state,'cancelled');assert.ok(!f.callouts?.length,'stabilny kadr bez migawki');
 assert.ok(f.nodes.every(n=>n.notification===null));assert.ok(player.time<=player.duration);
});

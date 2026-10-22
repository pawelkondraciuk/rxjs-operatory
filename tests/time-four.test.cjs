const {slideNotes}=require('./slide-notes.cjs');
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {modules,playbackHarness}=require('./v2-harness.cjs');
// 16-czas-cztery: trzy rundy (debounce/throttle, audit/throttle, trailing-only throttle/sample) na jednym slajdzie, każda od zera
// z pętlą ABC · DEF w rundach 1–2 i jednorazowym ABC · DE w rundzie 3. Dwa wiersze source$ → operator(300) → odbiorca, gotowe
// subskrypcje, bez complete. „Dalej” w trakcie emisji przechodzi do wyczyszczonej kolejnej pary.
const id='16-czas-cztery';

async function deck(format='4:3'){
 class Slide{constructor(id){this.id=id;this.dataset={animation:id};this.heading={};this.player={setAttribute(){}};}
  querySelector(s){return s==='h2'?this.heading:this.player;}cloneNode(){return new Slide(this.id);}after(){}}
 const slides=[...fs.readFileSync('index.html','utf8').matchAll(/data-animation="([^"]+)"/g)].map(m=>new Slide(m[1]));
 const m=await modules(['catalog','presentation','engine','renderer','code-syntax','scene-config','reference-scenes'],{document:{querySelectorAll:()=>slides}});
 const scene=m.presentation.prepareSlides(m.catalog.scenes,{format}).get(id),c=m.engine.compileScene(scene);
 return {m,scene,c,render:m.renderer.renderScene};
}
const at=(c,id)=>c.stops.find(s=>s.id===id).time;
const phaseStart=(c,name)=>c.plan.phases.find(p=>p.name===name).offset;
const received=(f,anchor)=>Array.from(f.histories.find(h=>h.anchor===anchor).values,v=>v.value).join('');
const node=(f,id)=>f.nodes.find(n=>n.id===id);
const lane=(f,id)=>node(f,id).laneStates[0];

test('ABC · DEF repeats every 1200 ms; RxJS 7.8.2 outputs of all four operators per cycle',async()=>{
 const {m}=await deck(),r=m['reference-scenes'];
 assert.equal(Array.from(r.timeFourCycle,v=>v.value+'@'+v.ms).join(' '),'A@100 B@180 C@260 D@720 E@820 F@940');
 assert.ok(r.timeFourInputs.length>=60,'wiele cykli — praktycznie bez końca');
 r.timeFourInputs.forEach((v,i)=>{const base=r.timeFourCycle[i%6];assert.equal(v.value,base.value);assert.equal(v.ms,base.ms+Math.floor(i/6)*1200);});
 const out=kind=>Array.from(r.timeFourOutputs(kind,r.timeFourCycle,300,1200),v=>v.value+'@'+v.ms).join(' ');
 assert.equal(out('debounce'),'C@560 F@1240');
 assert.equal(out('throttle'),'A@100 D@720');
 assert.equal(out('audit'),'C@400 F@1020');
 assert.equal(out('sample'),'C@300 E@900 F@1200');
 // W pętli wzorzec powtarza się co cykl.
 const pattern=kind=>Array.from(r.timeFourOutputs(kind),v=>v.value).join('');
 assert.ok(pattern('debounce').startsWith('CFCFCF'));assert.ok(pattern('throttle').startsWith('ADADAD'));
 assert.ok(pattern('audit').startsWith('CFCFCF'));assert.ok(pattern('sample').startsWith('CEFCEFCEF'));
});

test('trailing-only and sample emit C/E at distinct times; trailing reopens only after an emission',async()=>{
 const {m,c}=await deck(),r=m['reference-scenes'];
 const out=(kind,input=r.timeFourTrailingInputs)=>Array.from(r.timeFourOutputs(kind,input,300,1850),v=>v.value+'@'+v.ms).join(' ');
 assert.equal(Array.from(r.timeFourTrailingInputs,v=>v.value+'@'+v.ms).join(' '),'A@350 B@450 C@550 D@1000 E@1100');
 assert.equal(out('throttle-trailing'),'C@650 E@1300');assert.equal(out('sample'),'C@600 E@1200');
 const burst=[['A',50],['B',250],['C',400],['D',600],['E',1000]].map(([value,ms])=>({value,ms}));
 assert.equal(out('throttle-trailing',burst),'B@350 D@650 E@1300');
 assert.equal(out('audit',burst),'B@350 D@700 E@1300');
 const phase=c.plan.phases[2],model=ms=>.6+ms/100;
 for(const [edge,expected] of [['op1-obs1',[['C',600],['E',1200]]],['op2-obs2',[['C',650],['E',1300]]]]){
  const events=phase.plan.records.get(edge).events;
  assert.deepEqual(Array.from(events,e=>[e.value,e.logicalAt]),expected.map(([v,ms])=>[v,model(ms)]));
 }
 const f=c.snapshot(phase.offset+.2),svg=m.renderer.renderScene(f);
 assert.equal(node(f,'op2').subLabel,'leading: false, trailing: true');
 assert.match(svg,/data-sub-label="leading: false, trailing: true"/);
 for(const time of [0,.05,.2,.45]){
  const frame=c.snapshot(phase.offset+time),sample=node(frame,'op1');
  assert.equal(sample.opacity,1,'sample widoczny od razu');
  assert.equal(sample.offsetY,undefined,'sample pozostaje na swoim miejscu');
  assert.ok(frame.edges.every(e=>e.visible&&e.opacity===1),'gotowe połączenia od początku rundy');
 }
 assert.doesNotMatch(svg,/>S[12]</);
});

test('three rounds keep the retained operator in place; round 2 fades in audit and round 3 shows sample immediately',async()=>{
 for(const format of ['4:3','16:9']){
  const {scene,c}=await deck(format);
  assert.equal(scene.title,'Cztery operatory, jeden strumień');
  assert.deepEqual(Array.from(c.plan.phases,p=>p.name),['debounce-throttle','throttle-audit','throttle-trailing-sample']);
  const labels=[],codes=[];
  for(const phase of c.plan.phases){
   const f=c.snapshot(phase.offset+.6);
   labels.push(['op1','op2'].map(id=>node(f,id).label).join(' | '));codes.push(f.code);
   assert.deepEqual(Array.from(f.nodes,n=>n.id),['src1','op1','obs1','src2','op2','obs2']);
   assert.ok(f.nodes.every(n=>!n.laneStates?.length||n.laneStates[0].state==='running'),phase.name+' aktywne tory');
  }
  assert.deepEqual(labels,['debounceTime(300) | throttleTime(300)','auditTime(300) | throttleTime(300)','sampleTime(300) | throttleTime(300)']);
  assert.deepEqual(codes,['source$.pipe(debounceTime(300))\nsource$.pipe(throttleTime(300))',
   'source$.pipe(auditTime(300))\nsource$.pipe(throttleTime(300))','source$.pipe(sampleTime(300))\nsource$.pipe(throttleTime(300, asyncScheduler,\n  { leading: false, trailing: true }))']);
  // Nowy operator rundy jest od razu widoczny na miejscu usuniętego, z gotowymi połączeniami; zachowany wiersz bez zmian.
  for(const [name,kept] of [['throttle-audit','2'],['throttle-trailing-sample','2']]){
   const t0=phaseStart(c,name);
   for(const at of [0,.15,.45]){const f=c.snapshot(t0+at);
    assert.ok(f.nodes.every(n=>n.opacity===1&&!n.offsetY),name+' bez fade-in');assert.ok(f.edges.every(e=>e.visible&&e.opacity===1),name+' gotowe połączenia');}
   const before=c.snapshot(t0-.01),after=c.snapshot(t0+.01);
   for(const id of ['op'+kept,'src1','src2','obs1','obs2'])for(const key of ['x','y','w','h'])assert.equal(node(after,id)[key],node(before,id)[key],id);
  }
 }
});

test('every round starts clean and repeats the identical source; no complete, error or unsubscribe',async()=>{
 const {c}=await deck();
 // Ten sam scenariusz w czasie modelu w każdej rundzie; w obrębie rundy oba wiersze dostają wartości w tych samych klatkach.
 const model=phase=>Array.from(phase.plan.records.get('src1-op1').events,e=>e.value+'@'+e.logicalAt.toFixed(4)).join(' ');
 const frames=(phase,edge)=>Array.from(phase.plan.records.get(edge).events,e=>[e.value,e.at.toFixed(6),e.arrival.toFixed(6)].join()).join(';');
 const first=model(c.plan.phases[0]);
 for(const phase of c.plan.phases){
  if(phase!==c.plan.phases[2])assert.equal(model(phase),first,phase.name);
  assert.equal(frames(phase,'src1-op1'),frames(phase,'src2-op2'),phase.name);
  const values=Array.from(phase.plan.records.get('src2-op2').events,e=>e.value).join('');
  if(phase===c.plan.phases[2])assert.equal(values,'ABCDE');else assert.ok(values.startsWith('ABCDEFABCDEF'));
  for(const record of phase.plan.records.values())assert.ok(!record.end,phase.name+' bez terminali');
  const f=c.snapshot(phase.offset);
  assert.equal(f.tokens.length,0);assert.ok(f.histories.every(h=>h.values.length===0));
  assert.ok(f.nodes.filter(n=>n.laneTimer).every(n=>!n.laneStates[0].memory?.value));
  assert.deepEqual(Array.from(f.metrics,m=>m.value),[0,0]);
  assert.equal(lane(f,'src1').progress,undefined,'źródło bez paska postępu');
 }
 assert.ok(c.events.every(e=>!['stream-complete','stream-error','inner-unsubscribe'].includes(e.type)));
});

test('rounds loop until next; stops show the cleared next pair; receivers keep the operators’ patterns',async()=>{
 const {c,scene,render}=await deck();
 assert.deepEqual(Array.from(c.stops,s=>s.id),['round-2','round-3','summary']);
 assert.deepEqual(Array.from(c.stops,s=>Boolean(s.autoPause)),[true,true,false]);assert.equal(at(c,'summary'),c.duration);
 for(const [stop,phase] of [['round-2','throttle-audit'],['round-3','throttle-trailing-sample']]){
  const f=c.snapshot(at(c,stop));
  assert.equal(f.phase,phase);assert.ok(f.histories.every(h=>h.values.length===0),stop+' czysty stan');
  assert.equal(f.tokens.length,0);assert.ok(f.nodes.every(n=>n.opacity===1));
 }
 // Każda runda emituje długo (ponad 2 minuty) — prowadzący decyduje, kiedy przejść dalej.
 for(const phase of c.plan.phases.slice(0,2))assert.ok(phase.duration>120,phase.name);
 assert.ok(c.plan.phases[2].duration<20,'runda 3 jest jednorazowa');
 const shown=(f,anchor)=>received(f,anchor).slice(-4);
 const expected={'debounce-throttle':['CF','AD'],'throttle-audit':['CF','AD']};
 for(const phase of c.plan.phases.slice(0,2)){
  const f=c.snapshot(phase.offset+40);
  // Kolejność cykliczna (początek okna zależy od chwili): każda kolejna kulka to następna wartość cyklu.
  const cyclic=(got,cycle)=>got.length===4&&[...got].every((v,i)=>!i||cycle[(cycle.indexOf(got[i-1])+1)%cycle.length]===v);
  expected[phase.name].forEach((cycle,i)=>assert.ok(cyclic(shown(f,'obs'+(i+1)),cycle),`${phase.name} obs${i+1}: ${shown(f,'obs'+(i+1))}`));
  assert.equal(f.caption,{'debounce-throttle':'Debounce czeka na ciszę. Throttle bierze pierwszą wartość z okna.',
   'throttle-audit':'Throttle bierze pierwszą. Audit oddaje ostatnią z okna.'}[phase.name]);
  assert.ok(Array.from({length:16},(_,i)=>c.snapshot(phase.offset+40+i/2)).filter(x=>x.tokens.some(k=>k.edge?.startsWith('src'))).length>4,'emisje trwają');
  // Odbiorca pokazuje najwyżej pięć ostatnich kulek.
  assert.ok((render(c.snapshot(phase.offset+100)).match(/data-token="received"/g)||[]).length<=12,"po pięć kulek na odbiorcę (+1 wygasająca)");
 }
 // Ten sam kolor wartości w obu wierszach i rundach.
 const colours=new Set(c.plan.phases.flatMap(p=>[...p.plan.records.values()].flatMap(r=>r.events.filter(e=>e.value==='C').map(e=>e.color))));
 assert.equal(colours.size,1);
 assert.equal(scene.playback.controller,'stages');
});

test('timers: debounce restarts, throttle blocks and drops, audit keeps its window, sample ticks without inputs',async()=>{
 const {c}=await deck(),[r1,r2,r3]=c.plan.phases;
 const arrival=(phase,edge,value)=>phase.offset+phase.plan.records.get(edge).events.find(e=>e.value===value).arrival;
 const timer=(t,id)=>lane(c.snapshot(t),id).timer;
 // Runda 1: po C debounce liczy od nowa, throttle trzyma blokadę z A i gasi C na porcie wejścia.
 const cAt=arrival(r1,'src1-op1','C');
 assert.ok(timer(cAt+.05,'op1').progress<.1);assert.ok(timer(cAt+.05,'op2').progress>.3);
 assert.match(timer(cAt+.05,'op1').text,/^cisza: \d+ ms$/);assert.match(timer(cAt+.05,'op2').text,/^blokada: \d+ ms$/);
 assert.equal(lane(c.snapshot(cAt+.05),'op2').memory,undefined,'throttle nic nie zapamiętuje');
 assert.ok(c.snapshot(cAt+.2).tokens.some(t=>t.phase==='drop'&&t.value==='C'));
 // throttle przepuszcza A przez wiersz (bez pamięci), bez opóźniania emisji w czasie modelu.
 const aOut=r1.plan.records.get('op2-obs2').events[0];
 assert.equal(aOut.value,'A');assert.equal(aOut.logicalAt,r1.plan.records.get('src2-op2').events[0].logicalAt);
 assert.ok(c.snapshot(r1.offset+aOut.at-.2).tokens.some(t=>t.phase==='transform'&&t.value==='A'));
 // Runda 2: audit nie przesuwa okna przy B i C; zapamiętuje ostatnią.
 const bAt=arrival(r2,'src1-op1','B'),cAt2=arrival(r2,'src1-op1','C');
 assert.ok(timer(cAt2+.5,'op1').progress>timer(bAt+.5,'op1').progress+.15);
 assert.equal(lane(c.snapshot(cAt2+.5),'op1').memory.value,'C');
 // Runda 3: sample tyka stale; trailing-only po C otwiera puste okno do 950 ms, potem czeka na D.
 const model=ms=>r3.offset+.6+ms/100;
 // Źródło rusza dopiero po pierwszym takcie: sample już tyka (pusty takt 300 ms), throttle nie odlicza, brak kulek.
 for(const ms of [100,250]){const f=c.snapshot(model(ms));
  assert.equal(lane(f,'op1').timer.active,true,'sample tyka przed danymi');assert.equal(lane(f,'op2').timer.active,false,'throttle czeka na zdarzenie');
  assert.equal(f.tokens.length,0,'brak emisji przed '+ms);}
 const empty=lane(c.snapshot(model(800)),'op1');
 assert.equal(empty.timer.active,true);assert.ok(empty.timer.progress>.6&&empty.timer.progress<.7);assert.equal(empty.memory.value,undefined);
 assert.match(empty.timer.text,/^takt: \d+ ms$/);
 assert.equal(timer(model(800),'op2').active,true,'puste okno po emisji trailing C');
 assert.equal(timer(model(975),'op2').active,false,'po pustym oknie throttle czeka na zdarzenie');
 assert.equal(timer(model(975),'op1').active,true,'sample nadal odlicza');
 assert.equal(timer(model(1020),'op2').active,true,'D uruchamia nowe okno');
 assert.ok(timer(model(1020),'op2').progress<.1);
 assert.equal(timer(model(1400),'op2').active,true,'po E następne puste okno');
 assert.equal(timer(model(1650),'op2').active,false,'po drugim pustym oknie throttle stoi');
 assert.equal(timer(model(1650),'op1').active,true);
 assert.equal(lane(c.snapshot(c.duration),'op1').timer.active,true,'sample działa w końcowym kadrze');
 assert.equal(lane(c.snapshot(c.duration),'op2').timer.active,false);

});

test('timers keep running while values fly: illustration time is model time',async()=>{
 const {c}=await deck();
 for(const phase of c.plan.phases){
  assert.equal(phase.plan.logicalTime(5),5,phase.name);
  const arrivals=['src1-op1','src2-op2'].flatMap(edge=>phase.plan.records.get(edge).events.map(e=>phase.offset+e.arrival));
  let checked=0;
  for(let t=phase.offset+.05;t<phase.offset+phase.duration-.2;t+=.1){
   const f=c.snapshot(t),flying=f.tokens.some(k=>k.phase==='travel');
   if(!flying||arrivals.some(a=>a>t-1e-6&&a<=t+.1+1e-6))continue;
   for(const id of ['op1','op2']){
    const a=lane(f,id).timer,b=lane(c.snapshot(t+.1),id).timer;
    if(!a.active||!b.active||b.progress<a.progress)continue;
    assert.ok(Math.abs(b.progress-a.progress-.1/node(f,id).laneTimer.period)<1e-6,`${phase.name} ${id} @${t.toFixed(2)}: timer płynie podczas przelotu`);checked++;
   }
  }
  assert.ok(checked>5,phase.name);
 }
});

test('geometry: aligned rows fit both formats, five received balls stay inside the receiver, no NaN',async()=>{
 for(const format of ['4:3','16:9']){
  const {c,render}=await deck(format);
  for(const time of [0,...c.stops.map(s=>s.time),...c.plan.phases.map(p=>p.offset+.2)]){
   const f=c.snapshot(time);
   for(const n of f.nodes){assert.ok(n.x-n.w/2>=0&&n.x+n.w/2<=f.width,n.id);assert.ok(n.y-n.h/2>=0&&n.y+n.h/2<=f.height,n.id);}
   ['src','op','obs'].forEach(kind=>{const [a,b]=[node(f,kind+'1'),node(f,kind+'2')];assert.equal(a.x,b.x);assert.equal(a.w,b.w);assert.ok(b.y>a.y);});
   for(const e of f.edges)assert.equal(new Set(e.points.map(p=>p[1])).size,1,e.id);
   const svg=render(f);assert.doesNotMatch(svg,/NaN|Infinity|="undefined"/);
  }
  const end=c.snapshot(c.duration),receiver=node(end,'obs2'),tray=end.histories.find(h=>h.anchor==='obs2');
  const r=tray.ball.r,last=tray.x+4*(2*r+tray.gap);
  assert.equal(tray.max,5);assert.ok(tray.x-r>receiver.x-receiver.w/2+40);assert.ok(last+r<receiver.x+receiver.w/2);
  assert.ok(tray.ball.font>=30);
 }
});

test('MANUAL: one next clears and starts the next pair; left resets it; AUTO waits on each pair; rewind and reset are deterministic',async()=>{
 const {scene,c}=await deck(),h=await playbackHarness(),{player,controller}=h.create({scene});
 controller.next();h.advance(20000);assert.equal(player.isPlaying,true,'runda 1 emituje');assert.ok(player.time>15);
 // Jedno „dalej”: czysta para 2 i od razu emisje, bez dodatkowego kliknięcia.
 controller.next();assert.equal(player.time,phaseStart(c,'throttle-audit'));assert.equal(player.isPlaying,true);
 assert.equal(player.snapshot.phase,'throttle-audit');assert.ok(player.snapshot.histories.every(v=>v.values.length===0));
 h.advance(10000);assert.equal(player.isPlaying,true);assert.ok(player.snapshot.histories.some(v=>v.values.length>0));
 // Lewo resetuje parę 2 do czystego stanu (pauza), kolejne dalej ją znowu uruchamia.
 controller.previous();assert.equal(player.time,at(c,'round-2'));assert.equal(player.isPlaying,false);
 assert.ok(player.snapshot.histories.every(v=>v.values.length===0),'reset pary 2');
 controller.next();h.advance(10000);assert.equal(player.isPlaying,true);assert.equal(player.snapshot.phase,'throttle-audit');
 assert.ok(player.snapshot.histories.some(v=>v.values.length>0));
 controller.next();assert.equal(player.time,phaseStart(c,'throttle-trailing-sample'));assert.equal(player.isPlaying,true);
 h.advance(10000);assert.equal(player.isPlaying,true,'runda 3 emituje po tym samym kliknięciu');
 assert.equal(controller.mode,'manual','para 3 bez przełączania w AUTO');
 controller.toggle();const paused=player.time,framePaused=JSON.stringify(player.snapshot);h.advance(5000);
 assert.equal(player.time,paused);assert.equal(JSON.stringify(player.snapshot),framePaused,'pauza zatrzymuje timery i emisje');
 controller.toggle();h.advance(20000);assert.equal(player.state,'finished','runda 3 kończy się sama');
 assert.equal(received(player.snapshot,'obs1'),'CE');assert.equal(received(player.snapshot,'obs2'),'CE');
 controller.previous();assert.equal(player.time,at(c,'round-3'));
 controller.previous();assert.equal(player.time,at(c,'round-2'));
 controller.reset();assert.equal(player.time,0);assert.equal(player.state,'ready');assert.equal(h.frames.size,0);
 assert.equal(player.resetOnExit,true);
 // Zapauzowana runda 1: dalej też przechodzi do pary 2 i od razu ją odtwarza.
 const pausedRun=await playbackHarness(),pr=pausedRun.create({scene});
 pr.controller.next();pausedRun.advance(8000);pr.controller.toggle();assert.equal(pr.player.isPlaying,false);
 pr.controller.next();assert.equal(pr.player.time,phaseStart(c,'throttle-audit'));assert.equal(pr.player.isPlaying,true);
 const auto=await playbackHarness(),run=auto.create({scene});
 run.controller.setMode('auto');auto.advance(200000);
 assert.equal(run.player.time,at(c,'round-2'),'AUTO czeka na parze 2');
 run.controller.next();auto.advance(200000);assert.equal(run.player.time,at(c,'round-3'),'AUTO czeka na parze 3');
 for(const time of [0,5,...c.stops.map(s=>s.time),c.duration]){
  const frame=JSON.stringify(c.snapshot(time));c.snapshot(c.duration);c.snapshot(0);
  assert.equal(JSON.stringify(c.snapshot(time)),frame);
 }
});

test('placed after retry and before statistics, with per-checkpoint notes',async()=>{
 const {m,scene}=await deck(),main=Array.from(m['scene-config'].mainOrder);
 assert.deepEqual(main.slice(main.indexOf('x03-retry-backoff'),main.indexOf('x03-retry-backoff')+3),['x03-retry-backoff',id,'24-rxjs-liczby']);
 assert.equal(scene.group,'main');
 const html=fs.readFileSync('index.html','utf8'),section=html.match(/<section id="16-czas-cztery"[\s\S]*?<\/section>/)[0];
 assert.ok(html.indexOf('id="x03-retry-backoff"')<html.indexOf('id="16-czas-cztery"'));
 assert.ok(html.indexOf('id="16-czas-cztery"')<html.indexOf('id="24-rxjs-liczby"'));
 assert.match(section,/<h2>Cztery operatory, jeden strumień<\/h2>/);
 const notes=slideNotes('16-czas-cztery');assert.match(notes,/debounce: ostatnia po ciszy/);assert.match(notes,/sample: własny zegar/);assert.match(notes,/Te same wartości, inne chwile/);
});

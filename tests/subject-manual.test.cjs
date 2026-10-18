const {test}=require('node:test');
const assert=require('node:assert/strict');
const {modules,playbackHarness}=require('./v2-harness.cjs');
const values=(frame,id)=>Array.from(frame.histories.find(h=>h.anchor===id).values,v=>v.value);
const node=(frame,id)=>frame.nodes.find(n=>n.id===id);
const lanes=(frame,id)=>Array.from(node(frame,id).laneStates,l=>`${l.role}:${l.subscriber}:${l.state}`);
const metric=(frame,label)=>frame.metrics.find(m=>m.label===label).value;
const shown=frame=>Array.from(frame.callouts||[],x=>x.text);
const stopIds=['subscribed-a','next-1','subscribed-b','next-2','complete'];
const receivers=['A','B'];
const colors={A:'#7457D9',B:'#D8840F'};
async function manual(format='4:3'){
 const m=await modules(['catalog','scene-config','engine','renderer']);
 const scene=m['scene-config'].configureScene({...m.catalog.scenes.find(s=>s.id==='05-zrodla'),
  id:'05-zrodla-5',rendererId:'05-zrodla',sourceExample:4,format});
 const c=m.engine.compileScene(scene);
 const ev=(type,edge,value)=>c.events.find(e=>e.type===type&&(!edge||e.edge===edge)&&(value===undefined||e.value===value)).at;
 return {scene,m,c,ev,render:m.renderer.renderScene,at:id=>c.stops.find(s=>s.id===id).time};
}

test('READY: only new Subject<number>() and the Subject tile; receivers A/B do not exist yet',async()=>{
 const {scene,c,render}=await manual(),ready=c.snapshot(0),svg=render(ready);
 assert.equal(scene.title,'Subject — ręczna emisja');
 assert.equal(scene.code,'const subject$ = new Subject<number>();');
 assert.doesNotMatch(scene.code,/subscribe|next|error|complete|http|User|connection/);
 assert.equal(node(ready,'subject').label,'Subject<number>');
 assert.deepEqual(Array.from(c.stops,s=>s.id),stopIds);
 assert.equal(scene.playback.controller,'stages');
 assert.equal(node(ready,'subject').visible,true);
 assert.deepEqual(lanes(ready,'subject'),[],'pusty kafelek Subject');
 for(const id of receivers)assert.equal(node(ready,id).visible,false,id+' jeszcze nie istnieje');
 assert.doesNotMatch(svg,/data-node="A"|data-node="B"|data-field|data-icon="inbox"/,'bez pustych prostokątów odbiorców');
 assert.ok(Array.from(c.plan.records.values()).every(r=>r.a.id==='subject'),'Subject bez wejścia (connection)');
 assert.equal(ready.tokens.length,0);assert.equal((ready.callouts||[]).length,0);
 assert.ok(ready.edges.every(e=>!e.visible));
 assert.equal(metric(ready,'Odbiorcy'),0);assert.equal(metric(ready,'Emisje next'),0);
 assert.doesNotMatch(svg,/NaN|Infinity|data-lane-terminal/);
});

test('A subscribes and receives next(1) alone; B does not exist yet',async()=>{
 const {c,ev,at}=await manual();
 const start=ev('subscribe','subject-A'),connected=ev('connected','subject-A');
 const appearing=c.snapshot(start-.15);
 assert.ok(node(appearing,'A').visible&&node(appearing,'A').opacity<1,'A pojawia się tuż przed subscribe');
 const f=c.snapshot((start+connected)/2);
 assert.deepEqual(shown(f),['subject$.subscribe(observerA)']);assert.equal(f.callouts[0].label,'A');
 const cable=f.edges.find(e=>e.id==='subject-A');
 assert.ok(cable.visible&&cable.progress>0&&cable.progress<1&&cable.offset<0,'kabel rośnie od A do Subjecta');
 const a=c.snapshot(at('subscribed-a'));
 assert.deepEqual(lanes(a,'subject'),['operator:A:running']);assert.deepEqual(lanes(a,'A'),['receiver:A:running']);
 assert.deepEqual(values(a,'A'),[]);assert.equal(metric(a,'Odbiorcy'),1);
 const call=ev('manual-next',null,'1'),inside=c.snapshot(call+.5),hub=node(inside,'subject');
 assert.deepEqual(shown(inside),['subject$.next(1)']);assert.equal(inside.callouts[0].label,'');
 assert.equal(inside.tokens.length,1);assert.equal(inside.tokens[0].value,'1');assert.equal(inside.tokens[0].phase,'emit');
 assert.equal(inside.tokens[0].y,hub.laneStates[0].y,'kulka 1 czeka w wierszu A');
 assert.ok(Math.abs(inside.tokens[0].x-hub.x)<1e-6);
 assert.deepEqual(Array.from(c.plan.records.get('subject-A').events,e=>e.value),['1','2']);
 assert.deepEqual(Array.from(c.plan.records.get('subject-B').events,e=>e.value),['2'],'B nie dostaje 1');
 const stop=c.snapshot(at('next-1'));
 assert.deepEqual(values(stop,'A'),['1']);
 assert.equal(node(stop,'B').visible,false,'B jeszcze nie istnieje');
 assert.ok(!stop.edges.find(e=>e.id==='subject-B').visible);
 assert.equal(metric(stop,'Emisje next'),1);assert.equal(metric(stop,'Odbiorcy'),1);
});

test('B subscribes late: the stop asks about the earlier 1, and B never receives it',async()=>{
 const {c,ev,at}=await manual();
 const start=ev('subscribe','subject-B'),connected=ev('connected','subject-B');
 assert.ok(start>ev('deliver-next','subject-A','1'),'B subskrybuje po dotarciu 1 do A');
 assert.equal(node(c.snapshot(at('next-1')),'B').visible,false);
 const f=c.snapshot((start+connected)/2);
 assert.deepEqual(shown(f),['subject$.subscribe(observerB)']);assert.equal(f.callouts[0].label,'B');
 const stop=c.snapshot(at('subscribed-b'));
 assert.ok(at('subscribed-b')>connected&&at('subscribed-b')<ev('manual-next',null,'2'),'pytanie przed next(2)');
 assert.deepEqual(lanes(stop,'subject'),['operator:A:running','operator:B:running']);
 assert.deepEqual(values(stop,'A'),['1'],'A zachowuje historię');
 assert.deepEqual(values(stop,'B'),[],'B bez wcześniejszej 1');
 assert.equal(stop.tokens.length,0,'nic nie leci do B');
 assert.match(c.stops.find(s=>s.id==='subscribed-b').caption,/Czy dostanie wcześniejszą 1\?/);
 assert.equal(c.events.some(e=>e.edge==='subject-B'&&['source-next','deliver-next'].includes(e.type)&&e.value==='1'),false);
 assert.equal(metric(stop,'Odbiorcy'),2);assert.equal(metric(stop,'Emisje next'),1);
});

test('next(2) reaches both current subscribers: A has 1, 2 and B only 2',async()=>{
 const {c,ev,at,render}=await manual();
 const call=ev('manual-next',null,'2'),inside=c.snapshot(call+.5),hub=node(inside,'subject');
 assert.deepEqual(shown(inside),['subject$.next(2)']);
 assert.equal(inside.tokens.length,1);assert.equal(inside.tokens[0].value,'2');
 assert.ok(inside.tokens[0].y>hub.laneStates[0].y&&inside.tokens[0].y<hub.laneStates[1].y,'kulka 2 między wierszami A i B');
 assert.ok(inside.codeView.flat().find(p=>p.mark?.id==='subject').active,'Subject świeci przy ręcznym next');
 const outs=receivers.map(id=>c.plan.records.get('subject-'+id).events.find(e=>e.value==='2'));
 assert.ok(outs.every(o=>o.at===outs[0].at&&o.arrival===outs[0].arrival&&o.logicalAt===call&&o.color===outs[0].color),'jedna emisja, wspólny czas i kolor');
 const flying=c.snapshot((outs[0].at+outs[0].arrival)/2);
 assert.deepEqual(Array.from(flying.tokens,t=>t.edge).sort(),['subject-A','subject-B']);
 const stop=c.snapshot(at('next-2'));
 assert.deepEqual(values(stop,'A'),['1','2']);assert.deepEqual(values(stop,'B'),['2']);
 assert.equal(metric(stop,'Emisje next'),2);assert.equal(metric(stop,'Odbiorcy'),2);
 assert.ok(stop.nodes.every(n=>n.laneStates.every(l=>l.state==='running')),'subskrypcje nadal trwają');
 assert.equal(c.events.filter(e=>e.type==='source-next').length,3,'1 do A, 2 do A i B');
 assert.doesNotMatch(render(stop),/NaN|Infinity|data-lane-terminal/);
});

test('complete: a green pulse from Subject closes both subscriptions; no error, unsubscribe or extra next',async()=>{
 const {c,ev,at,render}=await manual();
 const call=ev('manual-complete'),sent=receivers.map(id=>ev('stream-complete','subject-'+id)),arrived=receivers.map(id=>ev('disconnected','subject-'+id));
 assert.ok(call>at('next-2')&&sent.every(t=>t>call));
 assert.equal(c.events.filter(e=>e.type==='stream-complete').length,2,'complete do A i B');
 assert.ok(c.events.filter(e=>e.type==='disconnected').every(e=>e.kind==='complete'));
 assert.equal(c.events.some(e=>['stream-error','inner-unsubscribe'].includes(e.type)),false,'bez error i unsubscribe');
 assert.equal(c.events.filter(e=>e.type==='manual-next').length,2,'bez next(3)');
 const before=c.snapshot(call+.3);
 assert.deepEqual(shown(before),['subject$.complete()']);
 assert.equal(before.callouts[0].label,'');assert.equal(before.callouts[0].color,'#087438','zielona migawka');
 assert.ok(before.codeView.flat().find(p=>p.mark?.id==='subject').active,'Subject świeci przy complete');
 const pulse=c.snapshot((sent[0]+arrived[0])/2);
 for(const id of receivers){
  const edge=pulse.edges.find(e=>e.id==='subject-'+id);
  assert.equal(edge.phase,'complete');assert.equal(edge.pulse.color,'#26804E','zielony impuls downstream');
 }
 assert.deepEqual(lanes(pulse,'subject'),['operator:A:completed','operator:B:completed'],'Subject zakończony przy wysłaniu');
 for(const id of receivers)assert.deepEqual(lanes(pulse,id),[`receiver:${id}:running`],'odbiorca dopiero po dotarciu');
 assert.equal(pulse.tokens.length,0,'complete nie jest kulką');
 const stop=c.snapshot(at('complete')),svg=render(stop);
 for(const id of receivers){
  assert.deepEqual(lanes(stop,id),[`receiver:${id}:completed`]);
  assert.deepEqual(values(stop,id),id==='A'?['1','2']:['2'],id+' zachowuje wartości');
 }
 assert.equal((svg.match(/data-row-state="completed"/g)||[]).length,4,'cztery wiersze w stanie complete');
 assert.equal((svg.match(/data-lane-terminal="completed"[^>]*>✓ complete</g)||[]).length,2,'✓ complete tylko przy A i B');
 const subjectSvg=svg.slice(svg.indexOf('data-node="subject"'),svg.indexOf('data-node="A"'));
 assert.doesNotMatch(subjectSvg,/data-lane-terminal/,'lane’y Subjecta bez tekstu complete');
 assert.equal((subjectSvg.match(/data-row-state="completed"/g)||[]).length,2,'lane’y Subjecta jasnozielone');
 assert.doesNotMatch(render(c.snapshot(arrived[0]-.01)),/data-lane-terminal/,'status dopiero po dotarciu impulsu');
 assert.doesNotMatch(svg,/data-row-state="(error|cancelled)"|data-lane-terminal="error"/);
 assert.equal(metric(stop,'Odbiorcy'),0);assert.equal(metric(stop,'Emisje next'),2);
 assert.deepEqual(shown(stop),['subject$.complete()'],'migawka widoczna na postoju');
 const end=c.snapshot(c.duration);
 assert.equal((end.callouts||[]).length,0);
 assert.match(end.caption,/A: 1, 2, complete\. B: 2, complete[\s\S]*nie dostaje historii/);
 assert.ok(end.edges.every(e=>e.done&&!e.pulse));
 assert.doesNotMatch(render(end),/NaN|Infinity/);
});

test('layout keeps Subject → A/B on horizontal lanes inside the diagram in both formats',async()=>{
 for(const format of ['4:3','16:9']){
  const {c}=await manual(format);
  for(const time of [0,...c.stops.map(s=>s.time),c.duration]){
   const f=c.snapshot(time);
   for(const n of f.nodes){
    assert.ok(n.socketDots.every(d=>d.color===colors[d.subscriber]));
    assert.ok(n.y-n.h/2>=0&&n.y+n.h/2<=f.height);
   }
   for(const e of f.edges)assert.ok(e.points.every(p=>p[1]===e.points[0][1]),e.id+' poziomo');
   for(const x of f.callouts||[]){
    const width=(Array.from(x.text).length*.6+.9)*x.size;
    assert.ok(x.x-width/2>=0&&x.x+width/2<=f.width,`${format}: ${x.text} mieści się w jednej linii`);
    assert.ok(x.y+x.size*.78<node(f,'subject').y-node(f,'subject').h/2,'migawka nad diagramem');
   }
  }
 }
});

test('checkpoint notes follow the new order: question at B, answer at next(2), hot summary before the operator slide',async()=>{
 const {c}=await manual();
 const html=require('node:fs').readFileSync('index.html','utf8');
 const source=html.match(/<template data-checkpoint-notes="05-zrodla-5">([\s\S]*?)<\/template>/)[1];
 const notes=Object.fromEntries([...source.matchAll(/<div data-checkpoint="([^"]+)">([\s\S]*?)<\/div>/g)].map(([,id,text])=>[id,text]));
 assert.deepEqual(Object.keys(notes),['ready',...Array.from(c.stops,s=>s.id),'finished']);
 assert.match(notes.ready,/Interval sam produkował kolejne liczby\. A co, jeśli chcielibyśmy sami decydować, kiedy pojawi się następna wartość\?/);
 assert.match(notes['subscribed-b'],/Teraz pojawia się drugi odbiorca\. Jak myślicie, czy dostanie jedynkę, którą Subject wyemitował wcześniej\?/);
 assert.doesNotMatch(notes['subscribed-b'],/Subject nie odtwarza/,'pytanie bez odpowiedzi');
 assert.match(notes['next-2'],/Nie\. Subject nie odtwarza wcześniejszych wartości\. B dostaje dopiero dwójkę, podczas gdy A otrzymał zarówno jedynkę, jak i dwójkę/);
 assert.match(notes.complete,/Complete trafia do wszystkich odbiorców i zamyka ich subskrypcje/);
 assert.match(notes.finished,/Subject jest przykładem hot Observable — rozsyła emisje do aktualnych subskrybentów\. Nowy odbiorca nie dostaje historii\. Do różnicy między hot i cold jeszcze wrócimy[\s\S]*Prawo: Operator to funkcja/);
 assert.doesNotMatch(source,/error\(|next\(3\)|BehaviorSubject|ReplaySubject|shareReplay/);
});

test('all checkpoints rewind deterministically; going back removes B and never shows its history before subscribe',async()=>{
 const {scene,c,ev}=await manual();
 const times=[0,...c.stops.map(s=>s.time),ev('stream-complete','subject-A')+.3,c.duration];
 for(const time of times){const expected=JSON.stringify(c.snapshot(time));c.snapshot(c.duration);c.snapshot(0);assert.equal(JSON.stringify(c.snapshot(time)),expected);}
 const subscribeB=ev('subscribe','subject-B')-.3;
 for(let t=0;t<subscribeB;t+=.1){const f=c.snapshot(t);assert.equal(node(f,'B').visible,false);assert.deepEqual(values(f,'B'),[]);}
 const h=await playbackHarness(),{player,controller}=h.create({scene});
 for(const stop of player.stops){controller.next();h.advance(30000);assert.equal(player.time,stop.time);assert.equal(player.isPlaying,false);}
 controller.next();h.advance(30000);assert.equal(player.state,'finished');assert.equal(h.frames.size,0);
 assert.deepEqual(values(player.snapshot,'A'),['1','2']);assert.deepEqual(values(player.snapshot,'B'),['2']);
 for(const id of receivers)assert.deepEqual(lanes(player.snapshot,id),[`receiver:${id}:completed`]);
 controller.previous();assert.equal(player.time,player.stops.at(-1).time);
 controller.previous();assert.equal(player.time,player.stops.at(-2).time);
 assert.ok(player.snapshot.nodes.every(n=>n.laneStates.every(l=>l.state==='running')),'cofnięcie przed complete przywraca aktywne subskrypcje');
 controller.previous();assert.equal(player.time,player.stops.at(-3).time);
 assert.deepEqual(values(player.snapshot,'A'),['1']);assert.deepEqual(values(player.snapshot,'B'),[]);
 controller.previous();assert.equal(player.time,player.stops.at(-4).time);
 assert.equal(node(player.snapshot,'B').visible,false,'B znika po cofnięciu przed jego subscribe');
 assert.deepEqual(values(player.snapshot,'A'),['1']);
 controller.reset();assert.equal(player.time,0);assert.equal(player.snapshot.tokens.length,0);
 assert.ok(receivers.every(id=>!node(player.snapshot,id).visible));
 controller.setMode('manual');controller.setMode('auto');h.advance(30000);assert.equal(player.state,'finished');
});

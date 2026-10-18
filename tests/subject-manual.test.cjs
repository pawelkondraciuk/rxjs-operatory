const {test}=require('node:test');
const assert=require('node:assert/strict');
const {modules,playbackHarness}=require('./v2-harness.cjs');
const values=(frame,id)=>Array.from(frame.histories.find(h=>h.anchor===id).values,v=>v.value);
const node=(frame,id)=>frame.nodes.find(n=>n.id===id);
const lanes=(frame,id)=>Array.from(node(frame,id).laneStates,l=>`${l.role}:${l.subscriber}:${l.state}`);
const metric=(frame,label)=>frame.metrics.find(m=>m.label===label).value;
const shown=frame=>Array.from(frame.callouts||[],x=>x.text);
const stopIds=['subscribed-a','subscribed-b','next-1','next-2','error','next-after-error'];
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

test('READY: only new Subject<number>(), an empty Subject tile and two unsubscribed receivers A/B',async()=>{
 const {scene,c,render}=await manual(),ready=c.snapshot(0);
 assert.equal(scene.title,'Subject — ręczna emisja');
 assert.equal(scene.code,'const subject$ = new Subject<number>();');
 assert.doesNotMatch(scene.code,/subscribe|next|error|http|User/);
 assert.deepEqual(Array.from(c.stops,s=>s.id),stopIds);
 assert.equal(scene.playback.controller,'stages');
 assert.equal(node(ready,'subject').visible,true);
 assert.deepEqual(lanes(ready,'subject'),[],'pusty kafelek Subject');
 assert.deepEqual(Array.from(ready.nodes,n=>n.id),['subject','A','B'],'bez HTTP i bez trzeciego odbiorcy');
 assert.equal(ready.tokens.length,0);assert.equal((ready.callouts||[]).length,0);
 assert.ok(ready.edges.every(e=>!e.visible));
 assert.equal(metric(ready,'Odbiorcy'),0);assert.equal(metric(ready,'Emisje next'),0);
 assert.doesNotMatch(render(ready),/NaN|Infinity|data-lane-terminal/);
});

test('A and B subscribe (with next and error handlers) one after another, before the first next',async()=>{
 const {c,ev,at}=await manual();
 const starts=receivers.map(id=>ev('subscribe','subject-'+id)),connected=receivers.map(id=>ev('connected','subject-'+id));
 assert.ok(starts[0]>0&&connected[0]<at('subscribed-a')&&at('subscribed-a')<starts[1],'A zestawione przed subscribe B');
 assert.ok(connected[1]<at('subscribed-b')&&at('subscribed-b')<ev('manual-next',null,'1'),'obie subskrypcje przed pierwszym next');
 receivers.forEach((id,i)=>{
  const f=c.snapshot((starts[i]+connected[i])/2);
  assert.deepEqual(shown(f),[`const sub${id} = subject$.subscribe({ next, error })`]);
  assert.equal(f.callouts[0].label,id,'badge toru');
 });
 const cable=c.snapshot((starts[0]+connected[0])/2).edges.find(e=>e.id==='subject-A');
 assert.ok(cable.visible&&cable.progress>0&&cable.progress<1&&cable.offset<0,'kabel rośnie od odbiorcy do Subjecta');
 const a=c.snapshot(at('subscribed-a'));
 assert.deepEqual(lanes(a,'subject'),['operator:A:running']);
 assert.equal(metric(a,'Odbiorcy'),1);
 const b=c.snapshot(at('subscribed-b'));
 assert.deepEqual(lanes(b,'subject'),['operator:A:running','operator:B:running']);
 for(const id of receivers)assert.deepEqual(lanes(b,id),[`receiver:${id}:running`]);
 assert.ok(b.histories.every(h=>!h.values.length),'inboxy puste');
 assert.equal(metric(b,'Odbiorcy'),2);assert.equal(metric(b,'Emisje next'),0);
 assert.equal(c.events.some(e=>e.type==='source-next'&&e.at<=at('subscribed-b')),false,'Subject niczego nie emituje');
});

test('next(1) and next(2): each call is one ball in Subject split into two identical notifications for A and B',async()=>{
 const {c,ev,at,render}=await manual();
 for(const [i,value] of ['1','2'].entries()){
  const call=ev('manual-next',null,value),inside=c.snapshot(call+.5);
  assert.deepEqual(shown(inside),[`subject$.next(${value})`]);
  assert.equal(inside.callouts[0].label,'','bez badge’a toru');
  const [ball]=inside.tokens,hub=node(inside,'subject');
  assert.equal(inside.tokens.length,1);assert.equal(ball.value,value);assert.equal(ball.phase,'emit');
  assert.ok(Math.abs(ball.x-hub.x)<1e-6&&ball.y>hub.y-hub.h/2&&ball.y<hub.y+hub.h/2,'kulka w środku Subject');
  assert.ok(inside.codeView.flat().find(p=>p.mark?.id==='subject').active,'Subject świeci przy ręcznym next');
  const outs=receivers.map(id=>c.plan.records.get('subject-'+id).events[i]);
  assert.ok(outs.every(o=>o.value===value&&o.at===outs[0].at&&o.arrival===outs[0].arrival&&o.logicalAt===call&&o.color===outs[0].color),'jedna emisja, wspólny czas i kolor');
  const flying=c.snapshot((outs[0].at+outs[0].arrival)/2);
  assert.deepEqual(Array.from(flying.tokens,t=>t.edge).sort(),['subject-A','subject-B']);
  assert.equal(new Set(flying.tokens.map(t=>t.x)).size,1,'jednocześnie');
  const stop=c.snapshot(at('next-'+value));
  for(const id of receivers)assert.deepEqual(values(stop,id),['1','2'].slice(0,i+1),id);
  assert.equal(metric(stop,'Emisje next'),i+1);assert.equal(metric(stop,'Odbiorcy'),2);
  assert.ok(stop.nodes.every(n=>n.laneStates.every(l=>l.state==='running')),'subskrypcje nadal trwają');
  assert.doesNotMatch(render(stop),/NaN|Infinity|data-lane-terminal/);
 }
 assert.equal(c.events.filter(e=>e.type==='source-next').length,4,'dwie emisje × dwóch odbiorców');
});

test('error: a red terminal pulse from Subject ends both subscriptions with error, without complete, unsubscribe or a value',async()=>{
 const {c,ev,at,render}=await manual();
 const call=ev('manual-error'),sent=receivers.map(id=>ev('stream-error','subject-'+id)),arrived=receivers.map(id=>ev('disconnected','subject-'+id));
 assert.ok(call>at('next-2')&&sent.every(t=>t>call));
 assert.equal(c.events.filter(e=>e.type==='stream-error').length,2,'error do A i B');
 assert.ok(c.events.filter(e=>e.type==='disconnected').every(e=>e.kind==='error'));
 assert.equal(c.events.some(e=>['stream-complete','inner-unsubscribe'].includes(e.type)),false,'bez complete i unsubscribe');
 const before=c.snapshot(call+.3);
 assert.deepEqual(shown(before),["subject$.error(new Error('Boom'))"]);
 assert.equal(before.callouts[0].label,'');assert.equal(before.callouts[0].color,'#B51E2E','czerwona migawka');
 assert.ok(before.codeView.flat().find(p=>p.mark?.id==='subject').active,'Subject świeci przy error');
 const pulse=c.snapshot((sent[0]+arrived[0])/2);
 for(const id of receivers){
  const edge=pulse.edges.find(e=>e.id==='subject-'+id);
  assert.equal(edge.phase,'error');assert.equal(edge.pulse.color,'#C54848','czerwony impuls downstream');
 }
 assert.deepEqual(lanes(pulse,'subject'),['operator:A:error','operator:B:error'],'Subject zakończony błędem przy wysłaniu');
 for(const id of receivers)assert.deepEqual(lanes(pulse,id),[`receiver:${id}:running`],'odbiorca dopiero po dotarciu');
 assert.equal(pulse.tokens.length,0,'error nie jest kulką next');
 const stop=c.snapshot(at('error')),svg=render(stop);
 for(const id of receivers){
  assert.deepEqual(lanes(stop,id),[`receiver:${id}:error`]);
  assert.deepEqual(values(stop,id),['1','2'],id+' zachowuje wartości');
 }
 assert.equal((svg.match(/data-row-state="error"/g)||[]).length,4,'cztery wiersze w stanie błędu');
 assert.equal((svg.match(/data-lane-terminal="error"[^>]*>× error</g)||[]).length,4,'stan opisany tekstem');
 assert.doesNotMatch(svg,/data-row-state="(completed|cancelled)"|data-lane-terminal="completed"/);
 assert.equal(metric(stop,'Odbiorcy'),0);assert.equal(metric(stop,'Emisje next'),2);
 assert.deepEqual(shown(stop),["subject$.error(new Error('Boom'))"],'migawka widoczna na postoju');
});

test('next(3) after error: a grey, fading call with no emission, no new lanes and no subscriptions',async()=>{
 const {c,ev,at,render}=await manual();
 const call=ev('manual-next',null,'3'),stop=c.snapshot(at('next-after-error'));
 assert.ok(call>ev('disconnected','subject-B'));
 assert.equal(c.events.some(e=>['source-next','deliver-next','value-travel'].includes(e.type)&&e.value==='3'),false,'brak emisji 3');
 assert.equal(c.events.some(e=>e.type==='subscribe'&&e.at>call),false,'brak nowych subskrypcji');
 assert.deepEqual(shown(stop),['subject$.next(3)']);
 assert.equal(stop.callouts[0].color,'#808890','szara migawka bez skutku');
 assert.equal(stop.tokens.length,0);
 assert.equal(stop.codeView.flat().find(p=>p.mark?.id==='subject').active,false,'Subject już nie rozsyła');
 for(const id of receivers){assert.deepEqual(values(stop,id),['1','2']);assert.deepEqual(lanes(stop,id),[`receiver:${id}:error`]);}
 assert.deepEqual(lanes(stop,'subject'),['operator:A:error','operator:B:error']);
 assert.equal(metric(stop,'Emisje next'),2);
 const end=c.snapshot(c.duration);
 assert.equal((end.callouts||[]).length,0,'migawka next(3) gaśnie');
 assert.match(end.caption,/A i B: 1, 2, error[\s\S]*next\(3\) nie dotarło/);
 assert.equal(JSON.stringify(Array.from(end.nodes,n=>n.laneStates)),JSON.stringify(Array.from(stop.nodes,n=>n.laneStates)),'bez dodatkowych torów');
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

test('checkpoint notes follow the stops, introduce error as the third notification and lead to the operator slide',async()=>{
 const {c}=await manual();
 const html=require('node:fs').readFileSync('index.html','utf8');
 const source=html.match(/<template data-checkpoint-notes="05-zrodla-5">([\s\S]*?)<\/template>/)[1];
 const notes=Object.fromEntries([...source.matchAll(/<div data-checkpoint="([^"]+)">([\s\S]*?)<\/div>/g)].map(([,id,text])=>[id,text]));
 assert.deepEqual(Object.keys(notes),['ready',...Array.from(c.stops,s=>s.id),'finished']);
 assert.match(notes.ready,/Możemy wykorzystać Subject\.[\s\S]*Subject&lt;number&gt;[\s\S]*error: err =&gt; console\.error\('A', err\)/);
 assert.match(notes['next-1'],/A i B dostają tę samą wartość/);
 assert.match(notes.error,/Observable może też zakończyć się błędem\. Subject pozwala nam ręcznie wywołać error, podobnie jak wcześniej next\. Zwróćcie uwagę: obaj odbiorcy dostają informację o błędzie i ich subskrypcje się kończą\./);
 assert.match(notes['next-after-error'],/Spróbujmy jeszcze wysłać trójkę\. Nic się nie dzieje\. Error zakończył tego Subjecta/);
 assert.match(notes.finished,/trzy rodzaje powiadomień: next, complete i error[\s\S]*unsubscribe, które jest rezygnacją z subskrypcji[\s\S]*błąd pojedynczego requestu nie zakończył całego nasłuchiwania[\s\S]*Prawo: Operator to funkcja/);
});

test('all checkpoints rewind deterministically; manual stops, AUTO finish, previous and reset restore Subject state',async()=>{
 const {scene,c,ev}=await manual();
 const times=[0,...c.stops.map(s=>s.time),ev('stream-error','subject-A')+.3,c.duration];
 for(const time of times){const expected=JSON.stringify(c.snapshot(time));c.snapshot(c.duration);c.snapshot(0);assert.equal(JSON.stringify(c.snapshot(time)),expected);}
 const h=await playbackHarness(),{player,controller}=h.create({scene});
 for(const stop of player.stops){controller.next();h.advance(30000);assert.equal(player.time,stop.time);assert.equal(player.isPlaying,false);}
 controller.next();h.advance(30000);assert.equal(player.state,'finished');assert.equal(h.frames.size,0);
 for(const id of receivers){assert.deepEqual(values(player.snapshot,id),['1','2']);assert.deepEqual(lanes(player.snapshot,id),[`receiver:${id}:error`]);}
 controller.previous();assert.equal(player.time,player.stops.at(-1).time);
 controller.previous();assert.equal(player.time,player.stops.at(-2).time);
 controller.previous();assert.equal(player.time,player.stops.at(-3).time);
 assert.ok(player.snapshot.nodes.every(n=>n.laneStates.every(l=>l.state==='running')),'cofnięcie przed error przywraca aktywne subskrypcje');
 for(const id of receivers)assert.deepEqual(values(player.snapshot,id),['1','2']);
 controller.previous();
 for(const id of receivers)assert.deepEqual(values(player.snapshot,id),['1']);
 controller.reset();assert.equal(player.time,0);assert.equal(player.snapshot.tokens.length,0);
 controller.setMode('manual');controller.setMode('auto');h.advance(30000);assert.equal(player.state,'finished');
});

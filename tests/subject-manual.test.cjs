const {test}=require('node:test');
const assert=require('node:assert/strict');
const {modules,playbackHarness}=require('./v2-harness.cjs');
const values=(frame,id)=>Array.from(frame.histories.find(h=>h.anchor===id).values,v=>v.value);
const node=(frame,id)=>frame.nodes.find(n=>n.id===id);
const lanes=(frame,id)=>Array.from(node(frame,id).laneStates,l=>`${l.role}:${l.subscriber}:${l.state}`);
const fieldOf=(svg,id)=>svg.slice(svg.indexOf(`data-field="${id}"`),svg.indexOf('</g>',svg.indexOf(`data-field="${id}"`)));
const stopIds=['subscribed','next','multicast','received'];
const fields=[['A','user.firstName','Paweł'],['B','user.lastName','Kondraciuk'],['C','user.city','Białystok']];
const colors={A:'#7457D9',B:'#D8840F',C:'#2F7ED8'};
async function manual(format='4:3',sourceExample=4){
 const m=await modules(['catalog','scene-config','engine','renderer']);
 const scene=m['scene-config'].configureScene({...m.catalog.scenes.find(s=>s.id==='05-zrodla'),
  id:sourceExample===4?'05-zrodla-5':'05-zrodla-3',rendererId:'05-zrodla',sourceExample,format});
 const c=m.engine.compileScene(scene);
 const ev=(type,edge)=>c.events.find(e=>e.type===type&&e.edge===edge).at;
 return {scene,m,c,ev,render:m.renderer.renderScene,at:id=>c.stops.find(s=>s.id===id).time};
}

test('READY: only new Subject<User>(), an empty Subject tile and three empty fields; nothing subscribes or emits yet',async()=>{
 const {scene,c,render}=await manual(),ready=c.snapshot(0);
 assert.equal(scene.title,'Subject — ręczna emisja');
 assert.equal(scene.code,'const subject$ = new Subject<User>();');
 assert.doesNotMatch(scene.code,/subscribe|next|http|firstName/);
 assert.deepEqual(Array.from(c.stops,s=>s.id),stopIds);
 assert.equal(scene.playback.controller,'stages');
 assert.equal(node(ready,'subject').visible,true);
 assert.deepEqual(lanes(ready,'subject'),[],'pusty kafelek Subject');
 assert.equal(ready.nodes.some(n=>n.id==='http'),false,'bez HTTP GET');
 assert.equal(ready.tokens.length,0);assert.equal((ready.callouts||[]).length,0);
 assert.ok(ready.edges.every(e=>!e.visible));
 assert.equal(ready.metrics.find(m=>m.label==='Odbiorcy').value,0);
 assert.equal(ready.metrics.find(m=>m.label==='Wywołania next').value,0);
 const svg=render(ready);
 for(const [id,label] of fields){
  assert.match(fieldOf(svg,id),/data-field-state="empty"/);
  assert.match(fieldOf(svg,id),new RegExp(`>${label.replace('.','\\.')}</text>`));
 }
});

test('subscribed: A, B and C subscribe one after another; impulses run from the fields to Subject, inboxes stay empty',async()=>{
 const {c,ev,at,render}=await manual();
 const starts=['A','B','C'].map(id=>ev('subscribe','subject-'+id)),connected=['A','B','C'].map(id=>ev('connected','subject-'+id));
 assert.ok(starts[0]>0&&connected[0]<=starts[1]&&connected[1]<=starts[2],'kolejno, bez nakładania');
 const shown=t=>Array.from(c.snapshot(t).callouts||[],x=>x.text+' '+x.label);
 ['A','B','C'].forEach((id,i)=>assert.deepEqual(shown((starts[i]+connected[i])/2),['.subscribe() '+id]));
 const cable=c.snapshot((starts[0]+connected[0])/2).edges.find(e=>e.id==='subject-A');
 assert.ok(cable.visible&&cable.progress>0&&cable.progress<1&&cable.offset<0,'kabel rośnie od pola w lewo, do Subjecta');
 const stop=c.snapshot(at('subscribed'));
 assert.ok(at('subscribed')>connected[2]);
 assert.deepEqual(lanes(stop,'subject'),['operator:A:running','operator:B:running','operator:C:running'],'trzy wiersze wykonań');
 for(const [id] of fields)assert.deepEqual(lanes(stop,id),[`receiver:${id}:running`]);
 assert.ok(stop.histories.every(h=>!h.values.length),'inboxy puste');
 assert.equal(stop.tokens.length,0);assert.equal((stop.callouts||[]).length,0);
 assert.equal(c.events.some(e=>e.type==='source-next'&&e.at<=at('subscribed')),false,'Subject niczego nie emituje');
 assert.equal(stop.metrics.find(m=>m.label==='Odbiorcy').value,3);
 assert.equal(stop.metrics.find(m=>m.label==='Wywołania next').value,0);
 for(const [id] of fields)assert.match(fieldOf(render(stop),id),/data-field-state="empty"/);
});

test('next: one subject$.next(user) call puts a single User ball inside Subject; the call fits on one line',async()=>{
 const {c,at,render}=await manual(),stop=c.snapshot(at('next'));
 assert.equal(c.events.filter(e=>e.type==='manual-next').length,1,'jedno wywołanie next');
 assert.deepEqual(Array.from(stop.callouts,x=>x.text),['subject$.next(user)']);
 const callout=stop.callouts[0];
 assert.equal(callout.opacity,1);assert.equal(callout.label,'','bez badge’a toru');
 assert.doesNotMatch(callout.text,/\n|firstName/);
 const width=(Array.from(callout.text).length*.6+.9)*callout.size;
 assert.ok(callout.x-width/2>=0&&callout.x+width/2<=stop.width,'migawka w jednej linii mieści się w diagramie');
 assert.ok(callout.y+callout.size*.78<node(stop,'subject').y-node(stop,'subject').h/2,'migawka nad diagramem');
 assert.equal(stop.tokens.length,1);
 const [ball]=stop.tokens,hub=node(stop,'subject');
 assert.equal(ball.value,'{…}');assert.equal(ball.phase,'emit');assert.equal(ball.opacity,1);
 assert.ok(Math.abs(ball.x-hub.x)<1e-6&&ball.y>hub.y-hub.h/2&&ball.y<hub.y+hub.h/2,'kulka w środku Subject');
 assert.ok(stop.edges.every(e=>e.visible&&e.progress===1),'połączenia bez zmian');
 assert.ok(stop.histories.every(h=>!h.values.length));
 assert.equal(stop.metrics.find(m=>m.label==='Wywołania next').value,1);
 assert.ok(stop.codeView.flat().find(p=>p.mark?.id==='subject').active,'Subject świeci przy ręcznym next');
 assert.match(render(stop),/data-callout="subject\$\.next\(user\)" data-callout-lane=""/);
 assert.doesNotMatch(render(stop),/NaN|Infinity/);
});

test('multicast: one emission splits into three identical User balls that travel together along the existing lanes',async()=>{
 const {c,at,render}=await manual();
 const outs=['A','B','C'].map(id=>c.plan.records.get('subject-'+id).events);
 assert.ok(outs.every(o=>o.length===1),'po jednym powiadomieniu na odbiorcę');
 const [a]=outs[0];
 assert.ok(outs.every(([o])=>o.at===a.at&&o.arrival===a.arrival&&o.logicalAt===a.logicalAt),'jedna emisja, wspólny czas');
 assert.ok(outs.every(([o])=>o.value==='{…}'&&o.color===a.color),'identyczne kulki User');
 assert.equal(c.events.filter(e=>e.type==='source-next').length,3);
 const split=c.snapshot(a.at-.2);
 assert.equal(split.tokens.length,3);assert.ok(split.tokens.every(t=>t.phase==='split-out'&&t.value==='{…}'));
 assert.equal(new Set(split.tokens.map(t=>t.y)).size,3);
 const stop=c.snapshot(at('multicast'));
 assert.deepEqual(Array.from(stop.tokens,t=>t.edge).sort(),['subject-A','subject-B','subject-C']);
 assert.equal(new Set(stop.tokens.map(t=>t.x)).size,1,'jednocześnie');
 assert.ok(stop.tokens.every(t=>t.value==='{…}'&&t.color===a.color));
 assert.ok(stop.histories.every(h=>!h.values.length),'jeszcze nie dotarły');
 for(const e of stop.edges)assert.equal(e.color,colors[e.subscriber],'kolory torów bez zmian');
 assert.doesNotMatch(render(stop),/data-split-guide|data-hub-link|NaN|Infinity/);
});

test('received: every field gets the whole User and shows its own property; Subject stays active without complete',async()=>{
 const {c,at,render}=await manual();
 const stop=c.snapshot(at('received')),svg=render(stop);
 for(const [id,,value] of fields){
  assert.deepEqual(values(stop,id),['{…}'],id+': cały obiekt User');
  assert.match(fieldOf(svg,id),new RegExp(`data-field-value="${value}" opacity="1.000"`));
 }
 assert.equal((stop.callouts||[]).length,0,'migawka next znika po dotarciu');
 assert.equal(c.events.some(e=>['stream-complete','stream-error','inner-unsubscribe','disconnected'].includes(e.type)),false,'bez complete i unsubscribe');
 const end=c.snapshot(c.duration),endSvg=render(end);
 assert.ok(end.nodes.every(n=>n.laneStates.every(l=>l.state==='running')),'odbiorcy nadal zasubskrybowani');
 assert.ok(end.edges.every(e=>e.visible&&!e.done&&!e.pulse));
 for(const [id,,value] of fields)assert.match(fieldOf(endSvg,id),new RegExp(`data-field-value="${value}"`));
 assert.equal(end.metrics.find(m=>m.label==='Odbiorcy').value,3);
 assert.equal(end.metrics.find(m=>m.label==='Wywołania next').value,1);
 assert.match(end.caption,/Jedna emisja, trzech odbiorców[\s\S]*bez complete/);
});

test('the manual slide uses the Subject + HTTP design: same fields, lanes, ball and Subject tile at the HTTP column, in both formats',async()=>{
 for(const format of ['4:3','16:9']){
  const {c}=await manual(format),http=(await manual(format,2)).c;
  const end=c.snapshot(c.duration),next=http.snapshot(http.duration);
  const subject=node(end,'subject'),httpSubject=node(next,'subject'),httpTile=node(next,'http');
  assert.equal(subject.x,httpTile.x,'Subject w miejscu HTTP GET z następnego slajdu');
  for(const key of ['w','top','defH','rowH','fill','rx'])assert.equal(subject[key],httpSubject[key],`${format} Subject.${key}`);
  for(const [id] of fields){
   for(const key of ['x','y','w','h','fill'])assert.equal(node(end,id)[key],node(next,id)[key],`${format} ${id}.${key}`);
   const tray=f=>JSON.stringify({...f.histories.find(h=>h.anchor===id),values:[]});
   assert.equal(tray(end),tray(next),id+': pole jak na Subject + HTTP');
   assert.equal(subject.laneStates.find(l=>l.subscriber===id).y,httpSubject.laneStates.find(l=>l.subscriber===id).y);
  }
  assert.equal(JSON.stringify(end.ball),JSON.stringify(next.ball));
  assert.equal(end.width,next.width);assert.equal(end.height,next.height);assert.equal(end.textScale,next.textScale);
  const value=http.plan.records.get('subject-A').events[0];
  assert.equal(c.plan.records.get('subject-A').events[0].color,value.color,'kulka User w kolorze z następnego slajdu');
  for(const time of [0,...c.stops.map(s=>s.time),c.duration]){
   const f=c.snapshot(time);
   for(const n of f.nodes){
    assert.ok(n.socketDots.every(d=>d.color===colors[d.subscriber]));
    assert.ok(n.laneRows?.every(r=>r.color===colors[r.subscriber]&&!r.stripe)??true);
    assert.ok(n.y-n.h/2>=0&&n.y+n.h/2<=f.height);
   }
   for(const e of f.edges)assert.ok(e.points.every(p=>p[1]===e.points[0][1]),e.id+' poziomo');
  }
 }
});

test('checkpoint notes follow the stops and end with the question leading to HTTP',async()=>{
 const {c}=await manual();
 const html=require('node:fs').readFileSync('index.html','utf8');
 const source=html.match(/<template data-checkpoint-notes="05-zrodla-5">([\s\S]*?)<\/template>/)[1];
 const notes=Object.fromEntries([...source.matchAll(/<div data-checkpoint="([^"]+)">([\s\S]*?)<\/div>/g)].map(([,id,text])=>[id,text]));
 assert.deepEqual(Object.keys(notes),['ready',...Array.from(c.stops,s=>s.id),'finished']);
 assert.match(notes.ready,/same dostarczały nam wartości[\s\S]*Możemy wykorzystać Subject\./);
 assert.match(notes.subscribed,/Wszystkie subskrybują ten sam Subject\./);
 assert.match(notes.next,/ręcznie wywołujemy next[\s\S]*robimy to tylko raz\./);
 assert.match(notes.multicast,/Każdy otrzymuje cały obiekt User\./);
 assert.match(notes.received,/jeden pokazuje imię, drugi nazwisko, trzeci miasto\./);
 assert.match(notes.finished,/jeden obiekt, jedną emisję i trzech odbiorców[\s\S]*Co jeśli chcielibyśmy pobrać ten obiekt z HTTP\?/);
});

test('all checkpoints rewind deterministically; manual stops, AUTO finish, previous and reset',async()=>{
 const {scene,c}=await manual();
 const times=[0,...c.stops.map(s=>s.time),5.8,6.3,c.duration];
 for(const time of times){const expected=JSON.stringify(c.snapshot(time));c.snapshot(c.duration);c.snapshot(0);assert.equal(JSON.stringify(c.snapshot(time)),expected);}
 const h=await playbackHarness(),{player,controller}=h.create({scene});
 for(const stop of player.stops){controller.next();h.advance(30000);assert.equal(player.time,stop.time);assert.equal(player.isPlaying,false);}
 controller.next();h.advance(30000);assert.equal(player.state,'finished');assert.equal(h.frames.size,0);
 for(const [id] of fields)assert.deepEqual(values(player.snapshot,id),['{…}']);
 controller.previous();assert.equal(player.time,player.stops.at(-1).time);
 controller.previous();assert.equal(player.time,player.stops.at(-2).time);
 assert.ok(player.snapshot.histories.every(hh=>!hh.values.length),'cofnięcie przed dotarcie czyści pola');
 controller.reset();assert.equal(player.time,0);assert.equal(player.snapshot.tokens.length,0);
 controller.setMode('manual');controller.setMode('auto');h.advance(30000);assert.equal(player.state,'finished');
});

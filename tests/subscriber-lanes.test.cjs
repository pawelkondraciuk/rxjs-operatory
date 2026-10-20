const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {modules,playbackHarness}=require('./v2-harness.cjs');

// mode: wymuszony lanesMode na kopii sceny (share-unsub — share za map z unsubscribe A; nie jest już slajdem MAIN,
// ale ścieżka lanesGraph nadal obsługuje scenariusze shareScenario).
async function lanes(format='4:3',id='04a-dwa-tory',mode){
 class Slide{
  constructor(id){this.id=id;this.dataset={animation:id};this.heading={};this.player={setAttribute(){}};}
  querySelector(s){return s==='h2'?this.heading:this.player;}
  cloneNode(){return new Slide(this.id);}
  after(){}
 }
 const slides=[...fs.readFileSync('index.html','utf8').matchAll(/data-animation="([^"]+)"/g)].map(m=>new Slide(m[1]));
 const m=await modules(['catalog','presentation','engine','renderer','reference-scenes'],{document:{querySelectorAll:()=>slides}});
 let scene=m.presentation.prepareSlides(m.catalog.scenes,{format}).get(id);
 if(mode){scene={...scene,lanesMode:mode};m['reference-scenes'].configureLanes(scene);}
 const c=m.engine.compileScene(scene);
 return {c,scene,render:m.renderer.renderScene,at:id=>c.stops.find(s=>s.id===id).time};
}
const node=(frame,id)=>frame.nodes.find(n=>n.id===id);
const dots=(frame,id)=>Array.from(node(frame,id).socketDots,d=>d.side+d.subscriber).sort();
const lanesOf=(frame,id)=>Array.from(node(frame,id).laneStates,l=>`${l.role}:${l.subscriber}:${l.state}`);

const shareUnsub=(format='4:3')=>lanes(format,'04a-dwa-tory-2','share-unsub');
const fieldOf=(svg,id)=>svg.slice(svg.indexOf(`data-field="${id}"`),svg.indexOf('</g>',svg.indexOf(`data-field="${id}"`)));

test('cold READY is unchanged: one HTTP GET header, three empty fields, no lanes, ports or receivers marks',async()=>{
 const {c,render}=await lanes();
 const ready=c.snapshot(0),svg0=render(ready);
 assert.deepEqual(dots(ready,'http'),[]);assert.equal(node(ready,'http').laneStates.length,0);
 assert.equal(node(ready,'http').h,node(ready,'http').defH,'sam nagłówek HTTP GET');
 assert.deepEqual(Array.from(ready.nodes,n=>n.id),['http','A','B','C'],'bez map ani osobnych Observable pól');
 for(const id of ['A','B','C']){
  assert.equal(node(ready,id).visible,true,id+': pole widoku istnieje od READY');
  assert.deepEqual(dots(ready,id),[],id+': bez portu');assert.equal(node(ready,id).laneStates.length,0,id+': bez litery toru');
 }
 for(const [id,label] of [['A','user.firstName'],['B','user.lastName'],['C','user.city']]){
  assert.match(fieldOf(svg0,id),new RegExp(`data-field-state="empty"[\\s\\S]*>${label.replace('.','\\.')}</text>`),id+': etykieta pola');
  assert.match(fieldOf(svg0,id),/data-field-slot="empty"/,id+': puste miejsce na wartość');
 }
 assert.ok(ready.edges.every(e=>!e.visible));
 assert.deepEqual(Array.from(ready.metrics,m=>m.label+' '+m.value),['Observable 1','Requesty HTTP 0']);
});

test('cold: A, B and C subscribe one after another and start three parallel HTTP requests',async()=>{
 const {c,at}=await lanes();
 const ev=(type,edge)=>c.events.find(e=>e.type===type&&e.edge===edge);
 // Subskrypcje kolejno, co 0,25 s czasu modelu; każde subscribe uruchamia osobne HTTP.
 assert.deepEqual(['A','B','C'].map(id=>ev('subscribe','http-'+id).logicalAt),[1,1.25,1.5]);
 assert.ok(ev('subscribe','http-B').at>ev('subscribe','http-A').at&&ev('subscribe','http-C').at>ev('subscribe','http-B').at,'nie jednocześnie');
 const firstConnected=ev('connected','http-A').at;
 assert.equal(c.snapshot(firstConnected+.05).metrics.find(m=>m.label==='Requesty HTTP').value,1,'licznik rośnie po zestawieniu subskrypcji');
 assert.deepEqual(lanesOf(c.snapshot(firstConnected+.05),'http'),['work:A:running'],'wiersz powstaje dopiero z subskrypcją');
 const requests=c.snapshot(at('requests'));
 assert.equal(c.stops[0].id,'requests');
 assert.deepEqual(lanesOf(requests,'http'),['work:A:running','work:B:running','work:C:running'],'trzy requesty jednocześnie');
 assert.deepEqual(dots(requests,'http'),['outA','outB','outC']);
 const [a,b,cc]=node(requests,'http').laneStates;
 assert.ok(a.progress>b.progress&&b.progress>cc.progress&&cc.progress>0,'osobne wykonania mają osobny postęp');
 assert.equal(requests.metrics.find(m=>m.label==='Requesty HTTP').value,3);
 assert.ok(at('requests')<ev('source-next','http-A').at,'postój przed pierwszą odpowiedzią');
});

test('cold: no errors — every execution emits the whole User once, then complete',async()=>{
 const {c}=await lanes();
 assert.equal(c.events.filter(e=>e.type==='stream-error').length,0,'bez error');
 for(const id of ['A','B','C']){
  assert.deepEqual(Array.from(c.plan.records.get('http-'+id).events,e=>e.value),['{…}'],id+': cały obiekt, jedno next');
  assert.ok(c.events.some(e=>e.type==='stream-complete'&&e.edge==='http-'+id),id+': complete');
 }
 assert.equal(c.events.filter(e=>e.type==='source-next').length,3,'trzy odpowiedzi');
});

test('cold received: all three fields show their property before any complete arrives',async()=>{
 const {c,at,render}=await lanes();
 const ev=(type,edge)=>c.events.find(e=>e.type===type&&e.edge===edge).at;
 assert.deepEqual(Array.from(c.stops,s=>s.id),['requests','received','complete']);
 const fly=(ev('source-next','http-C')+ev('deliver-next','http-C'))/2;
 assert.deepEqual(Array.from(c.snapshot(fly).tokens,t=>t.value+':'+t.edge),['{…}:http-C'],'kulka niesie symbol obiektu');
 const stop=c.snapshot(at('received')),svg=render(stop);
 assert.ok(at('received')<ev('stream-complete','http-A'),'przed pierwszym complete');
 assert.deepEqual(lanesOf(stop,'http'),['work:A:running','work:B:running','work:C:running']);
 for(const [id,value] of [['A','Paweł'],['B','Kondraciuk'],['C','Białystok']])
  assert.match(fieldOf(svg,id),new RegExp(`data-field-value="${value}" opacity="1.000"`),id+': '+value);
 assert.doesNotMatch(svg,/data-lane-terminal/,'bez statusów zakończenia');
 assert.deepEqual(Array.from(stop.histories,h=>Array.from(h.values,v=>v.value+':'+v.color)),
  [['{…}:#cbbff2'],['{…}:#f3d09d'],['{…}:#bcd6f5']],'obiekt w kolorze swojego wykonania');
 const arrival=ev('deliver-next','http-A');
 assert.match(fieldOf(render(c.snapshot(arrival+.15)),'A'),/data-field-value="Paweł" opacity="0.500"/,'wartość wchodzi fade-in 0,3 s');
});

test('cold complete: green pulses complete A, B and C; fields keep their values',async()=>{
 const {c,at,render}=await lanes();
 const ev=(type,edge)=>c.events.find(e=>e.type===type&&e.edge===edge).at;
 const sent=ev('stream-complete','http-B');
 assert.equal(c.snapshot(sent+.3).edges.find(e=>e.id==='http-B').pulse.color,'#26804E','complete przebiega zielonym impulsem');
 const stop=c.snapshot(at('complete')),svg=render(stop);
 assert.deepEqual(lanesOf(stop,'http'),['work:A:completed','work:B:completed','work:C:completed']);
 for(const id of ['A','B','C'])assert.deepEqual(lanesOf(stop,id),[`receiver:${id}:completed`]);
 for(const value of ['Paweł','Kondraciuk','Białystok'])assert.match(svg,new RegExp(`data-field-value="${value}"`));
 assert.doesNotMatch(svg,/data-field-error/);
});

test('cold final state: three lanes under one header, all complete, counter 3 started requests',async()=>{
 const {c,render}=await lanes();
 const edge=(f,id)=>f.edges.find(e=>e.id===id),end=c.snapshot(c.duration),svg=render(end);
 assert.deepEqual(lanesOf(end,'http'),['work:A:completed','work:B:completed','work:C:completed']);
 assert.equal(node(end,'http').laneRows.length,3);
 for(const id of ['A','B','C']){
  assert.equal(node(end,id).fill,node(c.snapshot(0),id).fill,'kafelek pola nie zmienia koloru');
  assert.ok(edge(end,'http-'+id).opacity<=.35&&!edge(end,'http-'+id).pulse,'kabel zostaje jako przygaszona historia');
  assert.match(svg,new RegExp(`<title>${id} · ✓ complete</title>`));
 }
 assert.equal(node(end,'http').fill,node(c.snapshot(0),'http').fill,'nagłówek definicji bez zmian');
 assert.equal(end.metrics.find(m=>m.label==='Requesty HTTP').value,3);
 assert.match(end.caption,/trzy wykonania/);
 assert.doesNotMatch(svg,/data-phase="error"/);
});

test('code shows only the user$ definition, without subscribe or field operators',async()=>{
 const {c,at}=await lanes();
 const view=t=>Array.from(c.snapshot(t).codeView,line=>Array.from(line,part=>({...part})));
 for(const t of [0,...c.stops.map(s=>s.time),c.duration])
  assert.equal(view(t).map(line=>line.map(p=>p.text).join('')).join('\n'),"const user$ = httpGet<User>('/api/users/42');");
 assert.deepEqual(view(0).flat().filter(p=>p.mark).map(p=>p.mark.id),['http']);
 assert.doesNotMatch(c.snapshot(0).code,/map|pluck|subscribe|catchError/);
 const ev=(type,edge)=>c.events.find(e=>e.type===type&&e.edge===edge).at;
 const http=t=>view(t).flat().find(p=>p.mark?.id==='http').active;
 assert.equal(http(at('requests')),false);assert.equal(http(at('received')),false);
 assert.equal(http((ev('source-next','http-C')+ev('deliver-next','http-C'))/2),true,'httpGet świeci, gdy odpowiedź wylatuje');
});

test('cold: a transient .subscribe() overlay per field, from the receiver subscribing until the impulse reaches HTTP',async()=>{
 const {c,at,render}=await lanes();
 const ev=(type,edge)=>c.events.find(e=>e.type===type&&e.edge===edge).at;
 const shown=t=>Array.from(c.snapshot(t).callouts||[],x=>x.text+' '+x.label);
 assert.deepEqual(shown(0),[],'same definicje: brak napisu');
 for(const id of ['A','B','C']){
  const start=ev('subscribe','http-'+id),arrived=ev('connected','http-'+id);
  assert.deepEqual(shown((start+arrived)/2),['.subscribe() '+id],'napis podczas impulsu '+id);
  assert.ok(!shown(arrived+.31).includes('.subscribe() '+id),'znika po dotarciu impulsu do HTTP');
 }
 for(const s of c.stops)assert.deepEqual(shown(s.time),[],s.id);
 const mid=(ev('subscribe','http-C')+ev('connected','http-C'))/2,callout=c.snapshot(mid).callouts[0];
 assert.equal(callout.color,'#2F7ED8');
 assert.match(render(c.snapshot(mid)),/data-callout="\.subscribe\(\)" data-callout-lane="C"/);
});

test('cold: rewinding checkpoints removes and restores executions deterministically',async()=>{
 const {c,at,render}=await lanes();
 const times=[0,...c.stops.map(s=>s.time),c.duration];
 for(const time of times){const expected=render(c.snapshot(time));c.snapshot(c.duration);c.snapshot(0);assert.equal(render(c.snapshot(time)),expected);}
 assert.deepEqual(lanesOf(c.snapshot(at('requests')),'B'),['receiver:B:running'],'cofnięcie przed odpowiedź przywraca B');
 assert.match(fieldOf(render(c.snapshot(at('requests'))),'B'),/data-field-state="empty"/);
 assert.equal(node(c.snapshot(0),'http').laneStates.length,0,'READY bez wykonań');
});

test('callouts also support a manual .unsubscribe() during the cancel animation (mechanism check on a copy of the share scene)',async()=>{
 const fs2=require('node:fs');
 class Slide{constructor(id){this.id=id;this.dataset={animation:id};this.heading={};this.player={setAttribute(){}};}querySelector(s){return s==='h2'?this.heading:this.player;}cloneNode(){return new Slide(this.id);}after(){}}
 const slides=[...fs2.readFileSync('index.html','utf8').matchAll(/data-animation="([^"]+)"/g)].map(m=>new Slide(m[1]));
 const m=await require('./v2-harness.cjs').modules(['catalog','presentation','engine','reference-scenes'],{document:{querySelectorAll:()=>slides}});
 const scene={...m.presentation.prepareSlides(m.catalog.scenes,{format:'4:3'}).get('04a-dwa-tory-2'),lanesMode:'share-unsub'};
 m['reference-scenes'].configureLanes(scene);
 const graph=scene.graph(scene);
 const copy={...scene,graph:{...graph,callouts:[{text:'.unsubscribe()',subscriber:'A',y:60,
  from:{type:'inner-unsubscribe',edge:'share-A'},to:{type:'disconnected',edge:'share-A'}}]}};
 const c=m.engine.compileScene(copy),ev=(type,edge)=>c.events.find(e=>e.type===type&&e.edge===edge).at;
 const from=ev('inner-unsubscribe','share-A'),to=ev('disconnected','share-A');
 assert.equal(c.snapshot((from+to)/2).callouts[0].text,'.unsubscribe()');
 assert.equal((c.snapshot(to+.31).callouts||[]).length,0,'znika po animacji anulowania');
 assert.equal(c.snapshot(ev('stream-complete','share-B')+.1).callouts?.length||0,0,'complete B bez napisu');
});

const shareStops=['share-added','subscribed-a','joined-b','joined-c','multicast','complete'];
test('share(): READY has HTTP GET and three empty fields; the first step reveals share() and .pipe(share()) without a request',async()=>{
 for(const format of ['4:3','16:9']){
  const {c,at,render}=await lanes(format,'04a-dwa-tory-2');
  assert.deepEqual(Array.from(c.stops,s=>s.id),shareStops);
  const ready=c.snapshot(0);
  assert.deepEqual(Array.from(ready.nodes.filter(n=>n.opacity>0),n=>n.id),['http','A','B','C'],'READY: HTTP GET i trzy pola, bez share()');
  assert.ok(!ready.nodes.some(n=>n.id==='map'),'bez map');
  assert.equal(node(ready,'share').opacity,0);
  assert.ok(ready.nodes.every(n=>!(n.laneRows||[]).length||n.id==='A'||n.id==='B'||n.id==='C'),'bez execution lanes');
  assert.equal(node(ready,'http').laneRows.length,0);assert.equal(node(ready,'share').laneRows.length,0);
  assert.ok(ready.edges.every(e=>!e.visible),'bez połączeń');assert.equal(ready.tokens.length,0);
  assert.equal(ready.metrics.find(m=>m.label==='Requesty HTTP').value,0);assert.equal(ready.metrics.find(m=>m.label==='Odbiorcy').value,0);
  const svg=render(ready);
  for(const [id,label] of [['A','user.firstName'],['B','user.lastName'],['C','user.city']]){
   assert.match(fieldOf(svg,id),/data-field-state="empty"/);assert.match(fieldOf(svg,id),new RegExp(`>${label.replace('.','\\.')}</text>`));
  }
  const added=c.snapshot(at('share-added'));
  assert.equal(node(added,'share').opacity,1,'share() pojawia się w pierwszym kroku');
  assert.equal(node(added,'share').laneRows.length,0);assert.equal(node(added,'http').laneRows.length,0);
  assert.ok(added.edges.every(e=>!e.visible),'nadal bez subskrypcji');
  assert.equal(added.executionCounts.started,0);
  assert.ok(c.events.filter(e=>e.type==='subscribe').every(e=>e.at>at('share-added')),'definicja nie subskrybuje');
  for(const n of added.nodes){const r=node(ready,n.id);for(const key of ['x','top','w'])assert.equal(n[key],r[key],`${format} ${n.id}.${key} stały`);}
 }
});

test('share(): A starts the only request #1, B joins the running share() (manual pause), C joins later; one User and complete reach all three',async()=>{
 for(const format of ['4:3','16:9']){
  const {c,at,render}=await lanes(format,'04a-dwa-tory-2');
  const ev=(type,edge)=>c.events.find(e=>e.type===type&&e.edge===edge)?.at;
  const a=c.snapshot(at('subscribed-a'));
  assert.deepEqual(lanesOf(a,'http'),['work:U1:running']);assert.deepEqual(lanesOf(a,'share'),['operator:A:running']);
  assert.equal(node(a,'http').laneStates[0].label,'#1');
  assert.ok(ev('connected','share-A')<=ev('subscribe','http-share'),'impuls A biegnie przez share() do HTTP');
  assert.equal(a.metrics.find(m=>m.label==='Requesty HTTP').value,1);
  // Najważniejszy kadr: A i B aktywni, C nie, HTTP #1 nadal pracuje — jedno wykonanie upstream.
  const b=c.snapshot(at('joined-b')),progress=f=>node(f,'http').laneStates[0].progress;
  assert.deepEqual(lanesOf(b,'share'),['operator:A:running','operator:B:running']);
  assert.deepEqual(lanesOf(b,'http'),['work:U1:running'],'B nie dodaje wiersza HTTP');
  assert.ok(progress(b)>progress(a)&&progress(b)<.7,'ten sam request trwa, postęp widoczny');
  assert.equal(b.edges.find(e=>e.id==='share-C').visible,false,'C jeszcze nie subskrybuje');
  assert.deepEqual(dots(b,'share'),['inU1','outA','outB']);
  assert.equal(b.executionCounts.started,1);assert.equal(b.executionCounts.active,1);
  assert.equal(b.metrics.find(m=>m.label==='Odbiorcy').value,2);
  assert.ok(ev('connected','share-B')<at('joined-b')&&at('joined-b')<ev('subscribe','share-C'),'postój po dotarciu B, przed subscribe C');
  assert.equal(c.events.filter(e=>e.type==='subscribe'&&e.edge==='http-share').length,1,'B i C nie subskrybują HTTP');
  const j=c.snapshot(at('joined-c'));
  assert.deepEqual(lanesOf(j,'http'),['work:U1:running']);assert.ok(progress(j)>progress(b)&&progress(j)<1);
  assert.deepEqual(lanesOf(j,'share'),['operator:A:running','operator:B:running','operator:C:running']);
  assert.deepEqual(Array.from(node(j,'share').laneRows,r=>r.subscriber+':'+r.stripe),['A:#7457D9','B:#7457D9','C:#7457D9'],'lewy pasek = kolor wspólnego upstreamu');
  assert.deepEqual(dots(j,'share'),['inU1','outA','outB','outC'],'jedno wejście, osobne wyjścia');
  assert.ok(ev('connected','share-C')<ev('source-next','http-share'),'C dołącza przed emisją HTTP');
  assert.equal(j.metrics.find(m=>m.label==='Requesty HTTP').value,1);assert.equal(j.metrics.find(m=>m.label==='Odbiorcy').value,3);
  const port=(f,side,id)=>node(f,'share').socketDots.find(d=>d.side===side&&d.subscriber===id).y;
  assert.equal(port(j,'in','U1'),port(a,'in','U1'));assert.equal(port(j,'out','A'),port(a,'out','A'));assert.equal(port(j,'out','B'),port(b,'out','B'));
  // Jedna kulka User wchodzi do share(), trzy identyczne wychodzą jednocześnie.
  assert.equal(c.events.filter(e=>e.type==='source-next'&&e.node==='http').length,1,'jedna emisja HTTP');
  assert.equal(ev('source-next','share-A'),ev('source-next','share-C'),'wspólny wylot');
  const mid=ev('source-next','share-A')+.3,balls=c.snapshot(mid).tokens.filter(t=>t.value==='{…}');
  assert.equal(balls.length,3);assert.equal(new Set(balls.map(t=>t.color)).size,1,'ten sam kolor');
  assert.equal(new Set(balls.map(t=>t.x.toFixed(6))).size,1,'jadą równo');
  const m=c.snapshot(at('multicast'));
  assert.deepEqual(Array.from(m.histories,h=>h.anchor+':'+Array.from(h.values,v=>v.value).join()),['A:{…}','B:{…}','C:{…}']);
  const svg=render(m);
  assert.match(fieldOf(svg,'A'),/Paweł/);assert.match(fieldOf(svg,'B'),/Kondraciuk/);assert.match(fieldOf(svg,'C'),/Białystok/);
  const done=c.snapshot(at('complete'));
  for(const id of ['http','share','A','B','C'])assert.ok(node(done,id).laneStates.every(l=>l.state==='completed'),id+': completed');
  assert.ok(['http-share','share-A','share-B','share-C'].every(e=>ev('stream-complete',e)!==undefined),'complete dociera do A, B i C');
  assert.equal(c.events.filter(e=>e.type==='inner-unsubscribe').length,0,'bez unsubscribe');
  const doneSvg=render(done);
  assert.equal((doneSvg.match(/data-lane-terminal="completed"[^>]*>✓ complete</g)||[]).length,3,'✓ complete przy A, B i C');
  assert.doesNotMatch(render(c.snapshot(ev('disconnected','share-A')-.01)),/data-lane-terminal/,'status po dotarciu impulsu');
  const end=c.snapshot(c.duration);
  assert.equal(end.metrics.find(m=>m.label==='Requesty HTTP').value,1);assert.equal(node(end,'http').laneRows.length,1);
  assert.ok(end.nodes.every(n=>n.y+n.h/2<=end.height),format+': mieści się w ramce');
  for(const id of ['A','B','C'])assert.ok(end.edges.find(e=>e.id==='share-'+id).points.every(p=>p[1]===node(end,id).y),'połączenia poziome');
  // Te same pola i ta sama geometria co Cold i Subject + HTTP.
  const cold=(await lanes(format)).c.snapshot(0);
  for(const id of ['A','B','C']){assert.equal(node(end,id).x,node(cold,id).x);assert.equal(node(end,id).y,node(cold,id).y);}
  // Cofanie: wcześniejszy kadr jest deterministyczny, nie zna przyszłości i nigdy nie ma drugiego requestu.
  for(const time of [0,...c.stops.map(s=>s.time),c.duration]){
   const expected=JSON.stringify(c.snapshot(time));c.snapshot(c.duration);c.snapshot(0);assert.equal(JSON.stringify(c.snapshot(time)),expected);
   assert.ok(c.snapshot(time).executionCounts.started<=1);
  }
  const back=c.snapshot(at('joined-b'));
  assert.deepEqual(Array.from(back.histories,h=>h.values.length),[0,0,0]);assert.deepEqual(lanesOf(back,'share'),lanesOf(b,'share'));
 }
});

test('share(): MANUAL holds joined-b indefinitely without finishing HTTP; AUTO keeps A → B → C → User → complete; reset returns to READY',async()=>{
 const {scene,c}=await lanes('4:3','04a-dwa-tory-2');
 const h=await playbackHarness(),{player,controller}=h.create({scene});
 const order=[];
 for(const stop of player.stops){controller.next();h.advance(30000);assert.equal(player.time,stop.time);assert.equal(player.isPlaying,false);order.push(stop.id);
  if(stop.id==='joined-b'){
   const frame=JSON.stringify(player.snapshot);h.advance(120000);
   assert.equal(JSON.stringify(player.snapshot),frame,'długa pauza nie zmienia kadru');
   assert.equal(player.snapshot.nodes.find(n=>n.id==='http').laneStates[0].state,'running','HTTP #1 nadal trwa');
  }}
 assert.deepEqual(order,shareStops);
 controller.next();h.advance(30000);assert.equal(player.state,'finished');assert.equal(h.frames.size,0);
 controller.previous();assert.equal(player.time,player.stops.at(-1).time);
 controller.reset();assert.equal(player.time,0);assert.equal(player.snapshot.executionCounts.started,0);
 controller.setMode('manual');controller.setMode('auto');h.advance(30000);assert.equal(player.state,'finished');
 assert.equal(player.snapshot.executionCounts.started,1,'AUTO: nadal jeden request');
 const ev=(type,edge)=>c.events.find(e=>e.type===type&&e.edge===edge).at;
 assert.ok(ev('connected','share-A')<ev('connected','share-B')&&ev('connected','share-B')<ev('connected','share-C')
  &&ev('connected','share-C')<ev('source-next','http-share')&&ev('deliver-next','share-C')<ev('stream-complete','http-share'));
});

test('share(): code grows from user$ = httpGet<User>(...) to .pipe(share()) with marks; transient .subscribe() A to HTTP, B and C only to share()',async()=>{
 const {c,at,scene}=await lanes('4:3','04a-dwa-tory-2');
 const text=(frame,visible)=>Array.from(frame.codeView,line=>Array.from(line).filter(p=>!visible||p.opacity>0).map(p=>p.text).join('')).join('\n');
 assert.equal(text(c.snapshot(0)),"const user$ = httpGet<User>('/api/users/42');\n  .pipe(share());",'miejsce na obie linie od READY');
 assert.equal(text(c.snapshot(0),true),"const user$ = httpGet<User>('/api/users/42');\n",'READY: sama definicja user$');
 assert.equal(text(c.snapshot(at('share-added')),true),"const user$ = httpGet<User>('/api/users/42')\n  .pipe(share());",'średnik gaśnie, dochodzi .pipe(share())');
 assert.match(scene.playerClass,/rx-code-steps/,'układ kodu jak w Subject + HTTP');
 const marks=Array.from(c.snapshot(0).codeView).flat().filter(p=>p.mark);
 assert.deepEqual(marks.map(p=>p.mark.id),['http','share']);
 assert.deepEqual({...marks[0].mark},{id:'http',bg:'rgba(143,201,212,.4)',line:'#4fa5b5'});
 assert.deepEqual({...marks[1].mark},{id:'share',bg:'rgba(216,179,230,.45)',line:'#b384c6'});
 const ev=(type,edge)=>c.events.find(e=>e.type===type&&e.edge===edge).at,shown=t=>Array.from(c.snapshot(t).callouts||[],x=>x.text+' '+x.label);
 const active=t=>Array.from(c.snapshot(t).codeView).flat().filter(p=>p.active).map(p=>p.mark.id);
 assert.deepEqual(active((ev('source-next','http-share')+ev('deliver-next','http-share'))/2),['http']);
 assert.deepEqual(active((ev('deliver-next','http-share')+ev('source-next','share-A'))/2),['share']);
 assert.deepEqual(shown((ev('subscribe','share-A')+ev('connected','http-share'))/2),['.subscribe() A']);
 assert.deepEqual(shown((ev('subscribe','share-B')+ev('connected','share-B'))/2),['.subscribe() B']);
 assert.deepEqual(shown((ev('subscribe','share-C')+ev('connected','share-C'))/2),['.subscribe() C']);
 for(let t=0;t<c.duration;t+=.05)assert.ok(shown(t).length<=1,'napisy subscribe nie nakładają się');
 for(const id of shareStops)assert.deepEqual(shown(at(id)),[]);
});

test('share(): checkpoint notes for READY, every manual stop and the handoff',async()=>{
 const {c}=await lanes('4:3','04a-dwa-tory-2');
 const html=fs.readFileSync('index.html','utf8');
 const source=html.match(/<template data-checkpoint-notes="04a-dwa-tory-2">([\s\S]*?)<\/template>/)[1];
 const notes=Object.fromEntries([...source.matchAll(/<div data-checkpoint="([^"]+)">([\s\S]*?)<\/div>/g)].map(([,id,text])=>[id,text]));
 assert.deepEqual(Object.keys(notes),['ready',...Array.from(c.stops,s=>s.id),'finished']);
 assert.match(notes.ready,/Ten sam przykład co w Cold/);
 assert.match(notes['share-added'],/\.pipe\(share\(\)\)[\s\S]*nadal tylko definicja/);
 assert.match(notes['subscribed-a'],/Share automatycznie subskrybuje HTTP i uruchamia request/);
 assert.match(notes['joined-b'],/B dołącza do istniejącego share\. Nie subskrybujemy ponownie HTTP\. Obaj odbiorcy korzystają z tego samego wykonania/);
 assert.match(notes['joined-c'],/wszystkie trzy subskrypcje kończą się na share\. HTTP nadal wykonuje się tylko raz/);
 assert.match(notes.multicast,/ten sam obiekt do wszystkich trzech odbiorców, dokładnie tak jak wcześniej Subject/);
 assert.match(notes.complete,/Jeden request zamiast trzech/);
 assert.match(notes.finished,/Share współdzieli request automatycznie[\s\S]*A co, jeśli ktoś zasubskrybuje po zakończeniu requestu\?[\s\S]*Prawo: share — późny odbiorca/);
});

test('tiles grow: a fixed definition part, then one execution row per subscription reaching the tile',async()=>{
 const {c,at}=await lanes();
 const tile=(t,id)=>node(c.snapshot(t),id),http0=tile(0,'http');
 assert.equal(http0.h,http0.defH,'READY: sama definicja');assert.equal(http0.laneRows.length,0);
 const top=http0.y-http0.h/2;
 for(const id of ['requests','received','complete']){
  const http=tile(at(id),'http');
  assert.ok(Math.abs(http.y-http.h/2-top)<1e-9,'góra kafelka stoi');
 }
 assert.deepEqual(Array.from(tile(at('requests'),'http').laneRows,r=>r.subscriber),['A','B','C']);
 assert.equal(tile(c.duration,'http').h,http0.defH+3*http0.rowH,'wiersze zostają po zakończeniu');
 const subscribe=c.events.find(e=>e.type==='subscribe'&&e.edge==='http-A').at,connected=c.events.find(e=>e.type==='connected'&&e.edge==='http-A').at;
 assert.equal(tile(subscribe+.1,'http').laneRows.length,0,'kafelek nie rośnie przed pojawieniem się wykonania');
 const growing=tile(connected-.1,'http');
 assert.ok(growing.laneRows.length===1&&growing.laneRows[0].growth<1&&growing.laneStates.length===0,'wiersz rozszerza kafelek tuż przed dotarciem subscribe');
 assert.equal(tile(connected,'http').laneRows[0].growth,1);
 const share=await shareUnsub();
 const end=share.c.snapshot(share.c.duration);
 assert.equal(node(end,'http').laneRows.length,1,'share: jeden wiersz w HTTP');
 assert.equal(node(end,'map').laneRows.length,1);
 assert.deepEqual(Array.from(node(end,'share').laneRows,r=>r.subscriber),['A','B']);
});

test('producer progress is the row background moving forward, then the row turns complete',async()=>{
 const {c,at,render}=await lanes();
 const fill=(t,id)=>{const svg=render(c.snapshot(t)),part=svg.slice(svg.indexOf('data-node="http"'),svg.indexOf('data-node="A"'));
  return part.match(new RegExp(`data-lane="${id}"[^>]*>(?:<title>[^<]*</title>)<rect data-work-fill="([^"]+)" x="[^"]+" y="[^"]+" width="([^"]+)"`));};
 const connected=c.events.find(e=>e.type==='connected'&&e.edge==='http-A').at;
 const early=fill(connected+.5,'A'),later=fill(at('requests'),'A');
 assert.ok(early&&later,'pasek jest tłem wiersza');
 assert.ok(Number(later[2])>Number(early[2]),'tło przesuwa się do przodu');
 const completeA=c.events.find(e=>e.type==='stream-complete'&&e.edge==='http-A').at;
 assert.equal(fill(completeA+.05,'A'),null,'po complete wiersz przejmuje zieleń');
 assert.ok(fill(completeA+.05,'C'),'C nadal czeka na swoje complete');
 // Wymiary pod projektor: przy 1024×768 (≈0,787 px na jednostkę) nagłówek ~62 px, wiersz ~70 px, pipeline ~90% szerokości.
 const end=c.snapshot(c.duration),http=node(end,'http'),receiver=node(end,'A'),px=v=>v*.787;
 assert.ok(Math.abs(px(http.defH)-62)<2&&Math.abs(px(http.rowH)-70)<2,'nagłówek i wiersz jak w pozostałych torach');
 assert.ok(Math.abs(px(end.ball.r*2)-53.5)<2,'kulka mieści symbol obiektu');
 const span=(receiver.x+receiver.w/2-(http.x-http.w/2))/end.width;
 assert.ok(span>=.88&&span<=.92,'pipeline zajmuje ~90% szerokości: '+span);
});

test('share(): A unsubscribes while B stays — A greys (stripe too), B keeps the purple upstream, the result splits only to B',async()=>{
 const {c,at,render}=await shareUnsub();
 const edge=(f,id)=>f.edges.find(e=>e.id===id);
 const cancelled=c.snapshot(at('cancelled'));
 assert.deepEqual(lanesOf(cancelled,'share'),['operator:A:cancelled','operator:B:running']);
 assert.deepEqual(lanesOf(cancelled,'A'),['receiver:A:cancelled']);
 assert.deepEqual(lanesOf(cancelled,'http'),['work:U1:running'],'wspólny request trwa dla B');
 assert.equal(edge(cancelled,'share-A').phase,'unsubscribe');assert.equal(edge(cancelled,'share-A').color,'#808890');
 assert.equal(edge(cancelled,'http-map').color,'#7457D9','upstream nadal fioletowy');
 const svg=render(cancelled),share=svg.slice(svg.indexOf('data-node="share"'),svg.indexOf('data-node="A"'));
 assert.match(share,/data-lane-row="A" data-row-state="cancelled"[^>]*><rect[^>]*\/><rect[^>]*fill="#808890"/,'lewy pasek A szary');
 assert.match(share,/data-lane-row="B" data-row-state="running"[^>]*><rect[^>]*\/><rect[^>]*fill="#7457D9"/,'lewy pasek B fioletowy');
 const unsubscribedAt=c.events.find(e=>e.type==='inner-unsubscribe'&&e.edge==='share-A').at;
 for(let t=unsubscribedAt;t<at('cancelled');t+=.1)assert.equal(edge(c.snapshot(t),'share-A').pulse,undefined,'unsubscribe bez impulsu');
 const ev=(type,e)=>c.events.find(x=>x.type===type&&x.edge===e).at,arrival=ev('deliver-next','map-share'),departure=ev('source-next','share-B');
 assert.deepEqual(Array.from(c.snapshot(arrival+(departure-arrival)*.8).tokens.filter(x=>x.phase==='split-out'),x=>x.color),['#f3d09d'],'tylko kulka dla B');
 const end=c.snapshot(c.duration);
 assert.deepEqual(Array.from(end.histories,h=>h.values.length),[0,1],'odpowiedź tylko dla B');
 assert.deepEqual(lanesOf(end,'B'),['receiver:B:completed']);assert.deepEqual(lanesOf(end,'A'),['receiver:A:cancelled']);
 assert.equal(cancelled.metrics.find(m=>m.label==='Requesty HTTP').value,1);
});

test('share scenarios: C joins the running upstream; the last unsubscribe cancels HTTP; a new Subscriber starts a new session in its colour',async()=>{
 const fs2=require('node:fs');
 class Slide{constructor(id){this.id=id;this.dataset={animation:id};this.heading={};this.player={setAttribute(){}};}querySelector(s){return s==='h2'?this.heading:this.player;}cloneNode(){return new Slide(this.id);}after(){}}
 const slides=[...fs2.readFileSync('index.html','utf8').matchAll(/data-animation="([^"]+)"/g)].map(m=>new Slide(m[1]));
 const m=await require('./v2-harness.cjs').modules(['catalog','presentation','engine','reference-scenes'],{document:{querySelectorAll:()=>slides}});
 const base=m.presentation.prepareSlides(m.catalog.scenes,{format:'4:3'}).get('04a-dwa-tory-2');
 const compile=scenario=>{const scene={...base,shareScenario:scenario};m['reference-scenes'].configureLanes(scene);return m.engine.compileScene(scene);};
 const ev=(c,type,edge)=>c.events.find(e=>e.type===type&&e.edge===edge)?.at;
 // C dołącza po odejściu A, B nadal aktywny
 let c=compile([{id:'A',start:1,unsub:3.5},{id:'B',start:2},{id:'C',start:4}]);
 let f=c.snapshot(ev(c,'connected','share-C')+.4);
 assert.deepEqual(lanesOf(f,'http'),['work:U1:running'],'C nie tworzy nowego upstreamu');
 assert.deepEqual(Array.from(node(f,'share').laneRows,r=>r.subscriber+':'+r.stripe),['A:#7457D9','B:#7457D9','C:#7457D9']);
 assert.ok(!c.events.some(e=>e.type==='subscribe'&&e.edge==='http-map'&&e.at>ev(c,'subscribe','share-C')));
 const http=node(f,'http');assert.equal(http.y-http.h/2,node(c.snapshot(0),'http').y-node(c.snapshot(0),'http').h/2,'HTTP nie przesuwa się');
 const arr=ev(c,'deliver-next','map-share'),dep=ev(c,'source-next','share-B');
 assert.deepEqual(Array.from(c.snapshot(arr+(dep-arr)*.8).tokens.filter(x=>x.phase==='split-out'),x=>x.color),['#f3d09d','#bcd6f5'],'kulki dla B i C, nie dla A');
 assert.equal(c.snapshot(c.duration).metrics.find(m=>m.label==='Requesty HTTP').value,1);
 // ostatni odchodzi → anulowanie upstreamu, bez complete; potem C otwiera nową sesję w swoim kolorze
 c=compile([{id:'A',start:1,unsub:3},{id:'B',start:2,unsub:3.5},{id:'C',start:5}]);
 const cancelledAt=ev(c,'disconnected','http-map')+.1;f=c.snapshot(cancelledAt);
 const up=node(f,'http').laneStates[0];
 assert.ok(up.subscriber==='U1'&&up.state==='cancelled'&&up.progress<1,'HTTP anulowany z niedokończonym postępem');
 assert.equal(c.events.filter(e=>e.type==='stream-complete'&&['http-map','map-share'].includes(e.edge)).length,0,'unsubscribe nie pokazuje complete');
 assert.deepEqual(Array.from(c.snapshot(ev(c,'inner-unsubscribe','share-B')+.4).callouts,x=>x.text+' '+x.label),['.unsubscribe() B']);
 const end=c.snapshot(c.duration);
 assert.equal(end.edges.find(e=>e.id==='http-map-2').color,'#2F7ED8','nowa sesja w kolorze C');
 assert.deepEqual(lanesOf(end,'http'),['work:U1:cancelled','work:U2:completed']);
 assert.equal(end.metrics.find(m=>m.label==='Requesty HTTP').value,2);
 assert.deepEqual(Array.from(end.histories,h=>h.values.length),[0,0,1]);
});

test('cold: compact field receivers on the lanes in both formats; map transform stays in the share variant',async()=>{
 for(const format of ['4:3','16:9']){
  const {c,at,render}=await lanes(format);
  const end=c.snapshot(c.duration),http=node(end,'http');
  ['A','B','C'].forEach((id,slot)=>{
   const r=node(end,id),laneY=http.top+http.defH+(slot+.5)*http.rowH;
   assert.equal(r.y,laneY,format+' '+id+': pole na wysokości toru');
   assert.ok(r.h<=http.rowH&&r.defH===0,'pole bez nagłówka, wysokości wiersza');
   assert.ok(end.edges.find(e=>e.id==='http-'+id).points.every(p=>p[1]===laneY),'połączenie poziome');
  });
  assert.ok(end.nodes.every(n=>n.y+n.h/2<=end.height),format+': mieści się w ramce');
  const svg=render(c.snapshot(at('complete')));
  assert.match(svg,/data-icon="inbox"/);
  assert.doesNotMatch(svg,/data-token="received"/,'pole pokazuje właściwość, nie kulkę');
  const sent=c.events.find(e=>e.type==='source-next'&&e.edge==='http-A').at;
  assert.equal(node(c.snapshot(sent),'http').laneStates[0].progress,1,'postęp HTTP kończy się z odpowiedzią');
 }
 const {c}=await shareUnsub(),map=node(c.snapshot(c.duration),'map');
 const arrival=c.events.find(e=>e.type==='deliver-next'&&e.edge==='http-map').at,departure=c.events.find(e=>e.type==='source-next'&&e.edge==='map-share').at;
 assert.ok(departure-arrival>=1,'kulka zatrzymuje się w map');
 const ballAt=t=>c.snapshot(t).tokens.find(t=>t.phase==='transform');
 assert.equal(ballAt(arrival+(departure-arrival)*.4).value,'21');assert.equal(ballAt(arrival+(departure-arrival)*.6).value,'42');
 assert.equal(ballAt(arrival+(departure-arrival)*.5).x,map.x,'zatrzymanie na środku map');
});

test('receiver history keeps at most three latest balls at a constant size',async()=>{
 const m=await require('./v2-harness.cjs').modules(['renderer']);
 const values=['1','2','3','4','5'].map((value,i)=>({value,color:'a',shownAt:i}));
 const frame={width:400,height:100,title:'t',caption:'',time:10,nodes:[],edges:[],tokens:[],panels:[],cards:[],ball:{r:20,font:24},
  histories:[{anchor:'A',x:50,y:50,balls:true,max:3,gap:6,values}]};
 const svg=m.renderer.renderScene(frame),radii=[...svg.matchAll(/data-token="received"[^>]*><circle[^>]* r="([^"]+)"/g)].map(x=>x[1]);
 assert.deepEqual(radii,['20','20','20']);
 assert.deepEqual([...svg.matchAll(/>(\d)<\/text>/g)].map(x=>x[1]),['3','4','5']);
});

test('share slides use the cold look: pipeline code, transient subscribe/unsubscribe overlays, balls and compact receivers',async()=>{
 for(const id of ['share-unsub']){
  const {c,at}=await shareUnsub();
  const code=Array.from(c.snapshot(0).codeView,line=>Array.from(line,p=>p.text).join('')).join('\n');
  assert.equal(code,'httpGet<number>(url)\n  .pipe(map(x => x * 2), share())',id+': sam pipeline, łamany przed .pipe');
  const marks=Array.from(c.snapshot(0).codeView).flat().filter(p=>p.mark).map(p=>p.mark.id);
  assert.deepEqual(marks,['http','map','share']);
  const shown=t=>Array.from(c.snapshot(t).callouts||[],x=>x.text+' '+x.label);
  const ev=(type,edge)=>c.events.find(e=>e.type===type&&e.edge===edge).at;
  assert.deepEqual(shown((ev('subscribe','share-A')+ev('connected','http-map'))/2),['.subscribe() A'],'A: impuls do HTTP');
  assert.deepEqual(shown((ev('subscribe','share-B')+ev('connected','share-B'))/2),['.subscribe() B'],'B: impuls tylko do share');
  assert.deepEqual(shown(at('first')),[]);assert.deepEqual(shown(at('second')),[]);
  const end=c.snapshot(c.duration);
  assert.ok(end.ball&&end.nodes.find(n=>n.id==='A').inbox,'kulki i kompaktowy odbiorca');
  const map=end.nodes.find(n=>n.id==='map');
  for(const r of ['A','B'].map(x=>end.nodes.find(n=>n.id===x)))
   assert.ok(end.edges.find(e=>e.id==='share-'+r.id).points.every(p=>p[1]===r.y),'połączenia poziome');
  assert.equal(map.laneRows.length,1,'jeden wspólny wiersz map');
  assert.deepEqual(Array.from(c.snapshot(0).metrics,m=>m.label),['Pipeline','Requesty HTTP','Odbiorcy share']);
  for(let t=0;t<c.duration;t+=.05)assert.ok(!shown(t).some(x=>x.startsWith('.unsubscribe'))||id==='share-unsub','unsubscribe tylko przy ręcznym wywołaniu');
 }
 const {c,at}=await shareUnsub();
 const ev=(type,edge)=>c.events.find(e=>e.type===type&&e.edge===edge).at;
 assert.deepEqual(Array.from(c.snapshot(at('question')).callouts,x=>x.text+' '+x.label),['.unsubscribe() A']);
 assert.equal((c.snapshot(at('cancelled')).callouts||[]).length,0,'po animacji anulowania napis znika');
 assert.equal((c.snapshot(ev('stream-complete','share-B')+.1).callouts||[]).length,0,'complete bez napisu');
});

test('cold has checkpoint notes for READY, each manual stop and the handoff to interval',async()=>{
 const {c}=await lanes();
 const html=fs.readFileSync('index.html','utf8');
 const source=html.match(/<template data-checkpoint-notes="04a-dwa-tory">([\s\S]*?)<\/template>/)[1];
 const notes=Object.fromEntries([...source.matchAll(/<div data-checkpoint="([^"]+)">([\s\S]*?)<\/div>/g)].map(([,id,text])=>[id,text]));
 assert.deepEqual(Object.keys(notes),['ready',...Array.from(c.stops,s=>s.id),'finished']);
 assert.match(notes.ready,/Wyobraźmy sobie widok aplikacji\. W jednym miejscu wyświetlamy imię użytkownika, w drugim nazwisko, a w trzecim miasto\./);
 assert.match(notes.requests,/Mamy jedną definicję user\$\. Ale każde z tych miejsc niezależnie ją subskrybuje\. I co się dzieje\? Powstają trzy osobne requesty\./);
 assert.match(notes.received,/Każdy request wraca osobno\./);
 assert.doesNotMatch(notes.received,/complete docierają/,'odbiór przed complete');
 assert.match(notes.complete,/Każde wykonanie kończy się własnym complete\./);
 assert.match(notes.finished,/Czy naprawdę musimy wykonywać trzy requesty\?[\s\S]*Prawo: interval/);
 assert.doesNotMatch(source,/catchError/,'obsługa błędów pozostaje na późniejsze slajdy');
});

test('cold statuses at the fields: A, B and C ✓ complete, each only after its terminal pulse',async()=>{
 for(const format of ['4:3','16:9']){
  const {c,at,render}=await lanes(format);
  const ev=(type,edge)=>c.events.find(e=>e.type===type&&e.edge===edge).at;
  // Fragment SVG kafelka odbiorcy: od jego <g data-node> do następnego kafelka albo pól widoku.
  const nodeSvg=(svg,id)=>{const from=svg.indexOf(`data-node="${id}"`),rest=svg.slice(from+1),next=rest.search(/data-node="|data-field="/);return svg.slice(from,from+1+next);};
  const statusOf=(svg,id)=>nodeSvg(svg,id).match(/data-lane-terminal="(\w+)"[^>]*>([^<]*)</);
  const end=render(c.snapshot(c.duration));
  assert.deepEqual(['A','B','C'].map(id=>statusOf(end,id)?.slice(1,3).join(':')),['completed:✓ complete','completed:✓ complete','completed:✓ complete']);
  const httpSvg=end.slice(end.indexOf('data-node="http"'),end.indexOf('data-node="A"'));
  assert.doesNotMatch(httpSvg,/data-lane-terminal/,'HTTP GET bez tekstu statusu');
  assert.equal((end.match(/data-lane-terminal/g)||[]).length,3);
  assert.doesNotMatch(render(c.snapshot(at('received'))),/data-lane-terminal/,'received: przed complete');
  assert.equal(statusOf(render(c.snapshot(ev('disconnected','http-A')-.01)),'A'),null);
  // Status w linii wartości, po prawej od niej (bez nachodzenia); za długa „Kondraciuk” przenosi go do linii etykiety.
  for(const [id,value,label] of [['A','Paweł'],['B','Kondraciuk','user.lastName'],['C','Białystok']]){
   const field=c.snapshot(c.duration).histories.find(h=>h.anchor===id);
   const tag=nodeSvg(end,id).match(/<text x="([\d.]+)" y="([\d.]+)" font-size="([\d.]+)"[^>]*data-lane-terminal/);
   const left=Number(tag[1])-10*.56*Number(tag[3]);
   if(label){
    assert.ok(Math.abs(Number(tag[2])-(field.y-16*1.42))<1e-6,format+' '+id+': linia etykiety');
    assert.ok(field.x+label.length*.6*16*1.42<left,format+' '+id+': status za etykietą');
   }else{
    assert.ok(Math.abs(Number(tag[2])-(field.y+14*1.42))<1e-6,format+' '+id+': linia wartości');
    assert.ok(field.x+value.length*.52*22*1.42<left,format+' '+id+': status za wartością');
   }
  }
 }
});

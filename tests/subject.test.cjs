const {test}=require('node:test');
const assert=require('node:assert/strict');
const {modules,playbackHarness}=require('./v2-harness.cjs');
const values=(frame,id)=>Array.from(frame.histories.find(h=>h.anchor===id).values,v=>v.value);
const node=(frame,id)=>frame.nodes.find(n=>n.id===id);
const lanes=(frame,id)=>Array.from(node(frame,id).laneStates,l=>`${l.role}:${l.subscriber}:${l.state}`);
const fieldOf=(svg,id)=>svg.slice(svg.indexOf(`data-field="${id}"`),svg.indexOf('</g>',svg.indexOf(`data-field="${id}"`)));
const stopIds=['connect-http','request','received','multicast','complete'];
const fields=[['A','user.firstName','Paweł'],['B','user.lastName','Kondraciuk'],['C','user.city','Białystok']];
const snapshotText="http.get<User>('/api/users/42').subscribe(subject$)";
async function subject(format='4:3'){
 const m=await modules(['catalog','scene-config','engine','renderer']);
 const scene=m['scene-config'].configureScene({...m.catalog.scenes.find(s=>s.id==='05-zrodla'),
  id:'05-zrodla-3',rendererId:'05-zrodla',sourceExample:2,format});
 const c=m.engine.compileScene(scene);
 const ev=(type,edge)=>c.events.find(e=>e.type===type&&e.edge===edge).at;
 return {scene,m,c,ev,render:m.renderer.renderScene,at:id=>c.stops.find(s=>s.id===id).time};
}

test('READY: A/B/C already subscribe to Subject, fields are empty, HTTP is not connected; code shows only the Subject',async()=>{
 const {scene,c,ev,render}=await subject(),ready=c.snapshot(0);
 assert.equal(scene.code,'const subject$ = new Subject<User>();');
 assert.doesNotMatch(scene.code,/subscribe|http|map|share/);
 assert.deepEqual(Array.from(c.stops,s=>s.id),stopIds);
 assert.equal(node(ready,'subject').visible,true);
 assert.equal(node(ready,'http').opacity,0,'HTTP GET pojawia się dopiero w etapie connect-http');
 assert.deepEqual(lanes(ready,'subject'),['operator:A:running','operator:B:running','operator:C:running']);
 assert.ok(node(ready,'subject').laneStates.every(l=>l.opacity===1),'wiersze Subject w pełni widoczne od READY');
 assert.ok(node(ready,'subject').laneRows.every(r=>r.growth===1));
 for(const [id] of fields){
  assert.deepEqual(lanes(ready,id),[`receiver:${id}:running`]);
  const edge=ready.edges.find(e=>e.id==='subject-'+id);
  assert.ok(edge.visible&&edge.progress===1,'subskrypcja '+id+' zestawiona przed READY');
 }
 assert.equal(ready.edges.find(e=>e.id==='http-subject').visible,false);
 assert.equal(ready.metrics.find(m=>m.label==='Requesty HTTP').value,0);
 assert.equal(ready.metrics.find(m=>m.label==='Odbiorcy').value,3);
 assert.equal((ready.callouts||[]).length,0);
 const svg=render(ready);
 for(const [id,label] of fields){
  assert.match(fieldOf(svg,id),/data-field-state="empty"/);
  assert.match(fieldOf(svg,id),new RegExp(`>${label.replace('.','\\.')}</text>`));
 }
 // Subskrypcje A/B/C nie są animowane w trakcie slajdu.
 assert.ok(['A','B','C'].every(id=>ev('connected','subject-'+id)<0));
 assert.equal(c.events.filter(e=>e.type==='subscribe'&&e.at>=0).length,1,'jedyne subscribe w slajdzie to HTTP');
});

test('connect-http: the HTTP header appears, the real-syntax snapshot shows and the subscribe impulse runs from Subject to HTTP',async()=>{
 const {c,ev,at,render}=await subject();
 const born=c.events.find(e=>e.type==='node-create'&&e.node==='http').at,start=ev('subscribe','http-subject'),connected=ev('connected','http-subject');
 assert.ok(born>0&&node(c.snapshot(start),'http').opacity===1,'nagłówek HTTP wchodzi przed impulsem');
 const shown=t=>Array.from(c.snapshot(t).callouts||[],x=>x.text+' '+x.label);
 assert.deepEqual(shown((start+connected)/2),[snapshotText+' #1']);
 const stop=c.snapshot(at('connect-http'));
 assert.deepEqual(shown(at('connect-http')),[snapshotText+' #1'],'migawka widoczna na postoju');
 assert.equal(stop.callouts[0].opacity,1);
 assert.deepEqual(shown(at('request')),[],'migawka znika w drodze do request');
 const cable=c.snapshot((start+connected)/2).edges.find(e=>e.id==='http-subject');
 assert.ok(cable.visible&&cable.progress>0&&cable.progress<1&&cable.offset<0,'kabel rośnie od Subjecta w lewo');
 assert.deepEqual(lanes(stop,'http'),['work:U:running'],'jeden tor HTTP');
 assert.equal(node(stop,'http').laneRows.length,1);
 assert.equal(node(stop,'http').laneStates[0].label,'#1');
 assert.equal(stop.metrics.find(m=>m.label==='Requesty HTTP').value,1);
 assert.equal(c.snapshot(connected-1e-6).executionCounts.started,0,'licznik rośnie po zestawieniu subskrypcji HTTP');
 const svg=render(stop);
 assert.match(svg,/data-callout="http\.get&lt;User&gt;\(&#39;\/api\/users\/42&#39;\)\.subscribe\(subject\$\)"|data-callout="http\.get&lt;User&gt;\('\/api\/users\/42'\)\.subscribe\(subject\$\)"/);
 const callout=stop.callouts[0],width=(Array.from(callout.text).length*.6+.32+1.15+.9)*callout.size;
 assert.ok(callout.x-width/2>=0&&callout.x+width/2<=stop.width,'migawka mieści się w szerokości diagramu');
 assert.ok(callout.y+callout.size*.78<node(stop,'subject').y-node(stop,'subject').h/2,'migawka nad diagramem');
});

test('request: one HTTP execution makes progress while A/B/C wait',async()=>{
 const {c,at}=await subject(),f=c.snapshot(at('request'));
 assert.ok(node(f,'http').laneStates[0].progress>.3&&node(f,'http').laneStates[0].progress<.7);
 assert.equal(f.executionCounts.started,1);assert.equal(f.executionCounts.active,1);
 assert.deepEqual(lanes(f,'subject'),['operator:A:running','operator:B:running','operator:C:running']);
 assert.ok(f.histories.every(h=>!h.values.length));
 assert.equal(c.events.filter(e=>e.type==='subscribe'&&e.edge==='http-subject').length,1);
 assert.equal(c.plan.records.size,4,'jedno połączenie HTTP i trzy wyjścia Subject');
});

test('one User from HTTP reaches Subject, then splits into three identical next notifications of one colour',async()=>{
 const {c,at,render}=await subject();
 assert.equal(c.events.filter(e=>e.type==='source-next'&&e.node==='http').length,1,'jedna emisja źródła');
 const input=c.plan.records.get('http-subject').events[0];
 const outs=['A','B','C'].map(id=>c.plan.records.get('subject-'+id).events[0]);
 assert.ok(outs.every(o=>o.at===outs[0].at&&o.arrival===outs[0].arrival),'trzy powiadomienia jednocześnie');
 assert.ok(outs.every(o=>o.value==='{…}'&&o.color===input.color),'kulki tej samej emisji mają wspólny kolor');
 const received=c.snapshot(at('received'));
 assert.equal(received.tokens.length,1);assert.equal(received.tokens[0].phase,'split-in');assert.equal(received.tokens[0].value,'{…}');
 const hub=node(received,'subject');assert.ok(received.tokens[0].x<=hub.x-hub.w/2+1e-6,'kulka na porcie wejściowym Subject');
 assert.equal(received.tokens[0].y,hub.laneStates.find(l=>l.subscriber==='A').y,'wejście upstreamu na wysokości wiersza A');
 const cable=received.edges.find(e=>e.id==='http-subject');
 assert.ok(cable.points.every(p=>p[1]===cable.points[0][1]),'prosty kabel HTTP → Subject, bez załamania');
 assert.ok(received.histories.every(h=>!h.values.length));
 const split=c.snapshot(input.arrival+(outs[0].at-input.arrival)*.7);
 assert.equal(split.tokens.length,3);assert.ok(split.tokens.every(t=>t.phase==='split-out'&&t.color===input.color));
 assert.equal(new Set(split.tokens.map(t=>t.y)).size,3);
 const flying=c.snapshot((outs[0].at+outs[0].arrival)/2);
 assert.deepEqual(Array.from(flying.tokens,t=>t.edge).sort(),['subject-A','subject-B','subject-C']);
 const multicast=c.snapshot(at('multicast')),svg=render(multicast);
 for(const [id,,value] of fields){
  assert.deepEqual(values(multicast,id),['{…}'],id+': cały obiekt');
  assert.match(fieldOf(svg,id),new RegExp(`data-field-value="${value}" opacity="1.000"`));
 }
 assert.ok(multicast.codeView.flat().find(p=>p.mark?.id==='subject').active===false);
 assert.ok(c.snapshot(input.arrival+.1).codeView.flat().find(p=>p.mark?.id==='subject').active,'Subject świeci podczas rozsyłania');
 assert.doesNotMatch(render(split),/data-split-guide|data-hub-link|NaN|Infinity/);
});

test('complete goes from HTTP to Subject, then to all three receivers; fields keep their values, the counter stays at 1',async()=>{
 const {c,at,render}=await subject();
 const upstream=c.plan.records.get('http-subject'),outs=['A','B','C'].map(id=>c.plan.records.get('subject-'+id));
 assert.ok(upstream.end.kind==='complete'&&upstream.end.at>outs[0].events[0].arrival);
 assert.ok(outs.every(o=>o.end.kind==='complete'&&o.end.at===upstream.end.at+upstream.end.duration),'Subject przekazuje complete po jego dotarciu');
 const pulse=c.snapshot(upstream.end.at+.3).edges.find(e=>e.id==='http-subject').pulse;
 assert.equal(pulse.color,'#26804E','zielony impuls do Subjecta');
 assert.deepEqual(lanes(c.snapshot(upstream.end.at),'http'),['work:U:completed']);
 assert.ok(node(c.snapshot(upstream.end.at),'subject').laneStates.every(l=>l.state==='running'));
 assert.ok(node(c.snapshot(outs[0].end.at),'subject').laneStates.every(l=>l.state==='completed'));
 const done=c.snapshot(at('complete'));
 assert.ok(done.nodes.every(n=>n.laneStates.every(l=>l.state==='completed')));
 assert.equal(done.executionCounts.started,1);assert.equal(done.executionCounts.completed,1);
 assert.equal(done.metrics.find(m=>m.label==='Requesty HTTP').value,1);
 const end=c.snapshot(c.duration),svg=render(end);
 for(const [id,,value] of fields)assert.match(fieldOf(svg,id),new RegExp(`data-field-value="${value}"`),'pole zachowuje wartość');
 assert.ok(end.edges.every(e=>e.done&&!e.pulse));
 assert.match(end.caption,/jeden request zamiast trzech/);
 assert.equal(c.events.some(e=>e.type==='inner-unsubscribe'),false,'bez unsubscribe');
});

test('Subject keeps lane colours, horizontal receiver connections and the Cold field geometry in both formats',async()=>{
 const cold=await (async format=>{
  const fs=require('node:fs');
  class Slide{constructor(id){this.id=id;this.dataset={animation:id};this.heading={};this.player={setAttribute(){}};}querySelector(s){return s==='h2'?this.heading:this.player;}cloneNode(){return new Slide(this.id);}after(){}}
  const slides=[...fs.readFileSync('index.html','utf8').matchAll(/data-animation="([^"]+)"/g)].map(m=>new Slide(m[1]));
  const m=await modules(['catalog','presentation','engine'],{document:{querySelectorAll:()=>slides}});
  return format=>m.engine.compileScene(m.presentation.prepareSlides(m.catalog.scenes,{format}).get('04a-dwa-tory'));
 })();
 for(const format of ['4:3','16:9']){
  const {c,at}=await subject(format),end=c.snapshot(c.duration),coldEnd=cold(format).snapshot(cold(format).duration);
  const colors={A:'#7457D9',B:'#D8840F',C:'#2F7ED8',U:'#238F83'};
  for(const time of [0,at('request'),at('multicast'),c.duration]){
   const f=c.snapshot(time);
   for(const n of f.nodes){
    assert.ok(n.socketDots.every(d=>d.color===colors[d.subscriber]));
    assert.ok(n.laneRows?.every(r=>r.color===colors[r.subscriber]&&!r.stripe)??true);
    assert.equal(n.x,node(end,n.id).x);assert.equal(n.w,node(end,n.id).w);assert.equal(n.top,node(end,n.id).top);
    if(n.visible)assert.ok(n.y-n.h/2>=0&&n.y+n.h/2<=f.height);
   }
   for(const e of f.edges){assert.equal(e.color,colors[e.subscriber]);assert.ok(e.points.every(p=>p[1]===e.points[0][1]),e.id+' poziomo');}
  }
  for(const [id] of fields){
   const lane=node(end,'subject').laneStates.find(l=>l.subscriber===id),field=node(end,id),coldField=node(coldEnd,id);
   assert.equal(field.laneStates[0].y,lane.y);
   for(const key of ['x','y','w','h','fill'])assert.equal(field[key],coldField[key],`${format} ${id}.${key} jak na Cold`);
   const tray=f=>JSON.stringify({...f.histories.find(h=>h.anchor===id),values:[]});
   assert.equal(tray(end),tray(coldEnd),id+': pole jak na Cold');
  }
  assert.equal(JSON.stringify(end.ball),JSON.stringify(coldEnd.ball));
 }
});

test('all Subject checkpoints and split frames rewind deterministically; manual and AUTO finish and reset',async()=>{
 const {scene,c}=await subject();
 const times=[0,...c.stops.map(s=>s.time),7.8,8.6,c.duration];
 for(const time of times){const expected=JSON.stringify(c.snapshot(time));c.snapshot(c.duration);c.snapshot(0);assert.equal(JSON.stringify(c.snapshot(time)),expected);}
 const h=await playbackHarness(),{player,controller}=h.create({scene});
 for(const stop of player.stops){controller.next();h.advance(30000);assert.equal(player.time,stop.time);assert.equal(player.isPlaying,false);}
 controller.next();h.advance(30000);assert.equal(player.state,'finished');assert.equal(h.frames.size,0);
 controller.previous();assert.equal(player.time,player.stops.at(-1).time);
 controller.reset();assert.equal(player.time,0);assert.equal(player.snapshot.executionCounts.started,0);
 controller.setMode('manual');controller.setMode('auto');h.advance(30000);assert.equal(player.state,'finished');
 for(const [id] of fields)assert.deepEqual(values(player.snapshot,id),['{…}']);
});

test('Subject checkpoint notes follow the stops and end with the question about who keeps the upstream connection',async()=>{
 const {c}=await subject();
 const html=require('node:fs').readFileSync('index.html','utf8');
 const source=html.match(/<template data-checkpoint-notes="05-zrodla-3">([\s\S]*?)<\/template>/)[1];
 const notes=Object.fromEntries([...source.matchAll(/<div data-checkpoint="([^"]+)">([\s\S]*?)<\/div>/g)].map(([,id,text])=>[id,text]));
 assert.deepEqual(Object.keys(notes),['ready',...Array.from(c.stops,s=>s.id),'finished']);
 assert.match(notes.ready,/Zamiast ręcznie wywoływać next, pobierzmy ten obiekt z HTTP[\s\S]*trzy identyczne requesty[\s\S]*ci sami trzej odbiorcy/);
 assert.match(notes['connect-http'],/Jest również Observerem/);
 assert.match(notes.request,/jeden request, niezależnie od liczby odbiorców Subjecta/);
 assert.match(notes.received,/HTTP emituje go do Subjecta/);
 assert.match(notes.multicast,/wyświetla tylko potrzebne pole/);
 assert.match(notes.complete,/Subject przekazuje complete wszystkim odbiorcom/);
 assert.match(notes.finished,/zamiast trzech requestów mamy jeden[\s\S]*Czy RxJS może zrobić to za nas\?/);
});

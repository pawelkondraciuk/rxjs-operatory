const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {modules}=require('./v2-harness.cjs');

async function lanes(format='4:3',id='04a-dwa-tory'){
 class Slide{
  constructor(id){this.id=id;this.dataset={animation:id};this.heading={};this.player={setAttribute(){}};}
  querySelector(s){return s==='h2'?this.heading:this.player;}
  cloneNode(){return new Slide(this.id);}
  after(){}
 }
 const slides=[...fs.readFileSync('index.html','utf8').matchAll(/data-animation="([^"]+)"/g)].map(m=>new Slide(m[1]));
 const m=await modules(['catalog','presentation','engine','renderer'],{document:{querySelectorAll:()=>slides}});
 const c=m.engine.compileScene(m.presentation.prepareSlides(m.catalog.scenes,{format}).get(id));
 return {c,render:m.renderer.renderScene,at:id=>c.stops.find(s=>s.id===id).time};
}
const node=(frame,id)=>frame.nodes.find(n=>n.id===id);
const dots=(frame,id)=>Array.from(node(frame,id).socketDots,d=>d.side+d.subscriber).sort();
const lanesOf=(frame,id)=>Array.from(node(frame,id).laneStates,l=>`${l.role}:${l.subscriber}:${l.state}`);

test('cold: one definition, a lane per subscriber through HTTP, map and receiver',async()=>{
 const {c,at}=await lanes();
 const ready=c.snapshot(0);
 assert.deepEqual(dots(ready,'http'),[]);assert.equal(node(ready,'http').laneStates.length,0);
 assert.equal(node(ready,'A').visible,false);
 const subscribing=c.events.find(e=>e.type==='subscribe'&&e.edge==='map-A').at+.4;
 assert.deepEqual(dots(c.snapshot(subscribing),'map'),[],'gniazdo map dopiero po dotarciu subscribe');
 assert.deepEqual(lanesOf(c.snapshot(subscribing),'A'),['receiver:A:running']);
 const first=c.snapshot(at('first'));
 assert.deepEqual(dots(first,'map'),['inA','outA']);
 assert.deepEqual(dots(first,'http'),['outA']);
 assert.deepEqual(lanesOf(first,'http'),['work:A:running']);
 assert.deepEqual(lanesOf(first,'map'),['operator:A:running'],'map ma własną subskrypcję toru A');
 const second=c.snapshot(at('second'));
 assert.deepEqual(lanesOf(second,'http'),['work:A:running','work:B:running'],'cold: dwa requesty');
 assert.deepEqual(lanesOf(second,'map'),['operator:A:running','operator:B:running']);
 const [a,b]=node(second,'http').laneStates;
 assert.ok(a.progress>b.progress,'osobne wykonania mają osobny postęp');
 assert.notEqual(a.y,b.y);
});

test('lanes finish independently and the receiver definition keeps its colour',async()=>{
 const {c,at,render}=await lanes();
 const done=c.snapshot(at('done'));
 assert.deepEqual(lanesOf(done,'http'),['work:A:completed','work:B:running']);
 assert.deepEqual(lanesOf(done,'map'),['operator:A:completed','operator:B:running']);
 assert.deepEqual(lanesOf(done,'A'),['receiver:A:completed']);assert.deepEqual(lanesOf(done,'B'),['receiver:B:running']);
 assert.equal(node(done,'http').laneStates[0].progress,1);assert.ok(node(done,'http').laneStates[1].progress<1);
 assert.ok(dots(done,'map').includes('inB')&&dots(done,'map').includes('outB'));
 const receiverA=node(done,'A');
 assert.equal(receiverA.notification,'complete');assert.equal(receiverA.fill,node(c.snapshot(at('first')),'A').fill,'kafelek odbiorcy nie zmienia koloru');
 assert.equal(receiverA.status,'');
 const end=c.snapshot(c.duration);
 for(const id of ['http','map','A','B'])assert.ok(node(end,id).socketDots.every(d=>Math.abs(d.opacity-.35)<1e-9),id+': gniazda zakończonego toru są przygaszone');
 const edge=(f,id)=>f.edges.find(e=>e.id===id);
 assert.ok(edge(done,'map-A').visible&&edge(done,'map-A').opacity<=.35,'kabel A zostaje jako przygaszona historia');
 assert.equal(edge(done,'map-A').color,'#7457D9','w kolorze toru, nie zielony');
 assert.ok(edge(done,'map-B').opacity===1&&edge(done,'map-B').phase==='subscribed','kabel B aktywny');
 assert.ok(end.edges.every(e=>e.visible&&e.opacity<=.35&&!e.pulse),'po końcu obie historie przygaszone, bez impulsów');
 const sent=c.events.find(e=>e.type==='stream-complete'&&e.edge==='http-map-A').at;
 const pulse=edge(c.snapshot(sent+.3),'http-map-A').pulse;
 assert.equal(pulse.color,'#26804E','complete przebiega zielonym impulsem');assert.ok(pulse.at>0&&pulse.at<1);
 assert.equal(node(c.snapshot(sent+.3),'map').laneStates[0].state,'running','map zmienia stan dopiero po dotarciu complete');
 assert.ok(['http','map','A','B'].every(id=>node(end,id).laneStates.every(l=>l.state==='completed')));
 assert.deepEqual(Array.from(end.histories,h=>Array.from(h.values,v=>v.value)),[['42'],['42']]);
 const svg=render(done);
 assert.match(svg,/data-lane="B" data-lane-role="work" data-lane-state="running"/);
 assert.match(svg,/data-lane="A" data-lane-role="operator" data-lane-state="completed"/);
 assert.match(svg,/<title>A · ✓ complete<\/title>/,'stan toru ma tekst');
 const mapDone=svg.slice(svg.indexOf('data-node="map"'),svg.indexOf('data-node="A"'));
 assert.deepEqual([...mapDone.matchAll(/data-row-state="(\w+)"/g)].map(m=>m[1]),['completed','running'],'zielony tylko wiersz A');
 assert.match(mapDone,/data-row-state="completed"[^>]*><rect[^>]+fill="#DDF1E1"/);
 assert.doesNotMatch(svg,/data-row-flash/,'postój nie łapie rozbłysku');
 const doneAt=c.events.find(e=>e.type==='stream-complete'&&e.edge==='map-A').at;
 assert.match(render(c.snapshot(doneAt+.2)),/data-row-flash="completed"/,'complete podkreśla krótki rozbłysk');
 const receiverDone=svg.slice(svg.indexOf('data-node="A"'),svg.indexOf('data-node="B"'));
 assert.match(receiverDone,/data-row-state="completed"/);
 assert.equal(node(done,'map').fill,node(c.snapshot(0),'map').fill,'nagłówek definicji map bez zmian');
 assert.match(svg,/data-socket="out" data-subscriber="B"/);
 assert.match(svg,/data-connection="map-A" data-phase="complete"[^>]*opacity="0.35"/,"kabel A jako przygaszona historia");
 const second=render(c.snapshot(at('second')));
 assert.doesNotMatch(second,/data-lane-icon=/,'stan wiersza niesie tło, bez ikon');
 assert.doesNotMatch(second,/data-row-state="running"[^>]*><rect[^>]+fill="#DDF1E1"/);
 const mapRows=second.slice(second.indexOf('data-node="map"'),second.indexOf('data-node="A"'));
 assert.deepEqual([...mapRows.matchAll(/data-row-state="(\w+)"/g)].map(m=>m[1]),['running','running']);
 assert.match(second,/<title>A · podłączony, czeka na next<\/title>/);
 assert.equal(render(c.snapshot(at('second'))),render(c.snapshot(at('second'))),'deterministyczna klatka');
});

test('code shows only the pipeline definition, coloured like its blocks',async()=>{
 const {c,at}=await lanes();
 const view=t=>Array.from(c.snapshot(t).codeView,line=>Array.from(line,part=>({...part})));
 for(const t of [0,at('first'),at('second'),c.duration]){
  const v=view(t);
  assert.equal(v.map(line=>line.map(p=>p.text).join('')).join('\n'),'http.get<number>(url).pipe(map(x => x * 2))','bez linii subscribe');
 }
 const marks=Object.fromEntries(view(0).flat().filter(p=>p.mark).map(p=>[p.mark.id,p]));
 assert.deepEqual(Object.keys(marks).sort(),['http','map']);
 const arrival=c.events.find(e=>e.type==='deliver-next'&&e.edge==='http-map-A').at,departure=c.events.find(e=>e.type==='source-next'&&e.edge==='map-A').at;
 assert.ok(view((arrival+departure)/2).flat().find(p=>p.mark?.id==='map').active,'map świeci podczas przekształcenia');
 assert.deepEqual(Array.from(c.snapshot(0).metrics,m=>m.label),['Pipeline','Requesty HTTP']);
});

test('cold: a transient .subscribe() overlay per lane, from the receiver appearing until the impulse reaches HTTP',async()=>{
 const {c,at,render}=await lanes();
 const ev=(type,edge)=>c.events.find(e=>e.type===type&&e.edge===edge).at;
 const shown=t=>Array.from(c.snapshot(t).callouts||[],x=>x.text+' '+x.label);
 assert.deepEqual(shown(0),[],'same definicje: brak napisu');
 for(const id of ['A','B']){
  const start=ev('subscribe','map-'+id),arrived=ev('connected','http-map-'+id);
  assert.deepEqual(shown((start+arrived)/2),['.subscribe() '+id],'napis podczas impulsu '+id);
  assert.ok(arrived-start+.3>=1.5,'napis widoczny wystarczająco długo');
  assert.deepEqual(shown(arrived+.31),[],'znika po dotarciu impulsu do HTTP, nie czeka na request');
  assert.equal(c.snapshot(arrived+.31).nodes.find(n=>n.id==='http').laneStates.find(l=>l.subscriber===id).state,'running');
 }
 assert.deepEqual(shown(at('first')),[]);assert.deepEqual(shown(at('second')),[]);
 assert.deepEqual(shown(at('question')),['.subscribe() B']);
 const callout=c.snapshot(at('question')).callouts[0];
 assert.equal(callout.color,'#D8840F');
 for(let t=0;t<=c.duration;t+=.05)assert.ok(!shown(t).some(x=>x.startsWith('.unsubscribe')),'complete nie pokazuje unsubscribe');
 const svg=render(c.snapshot(at('question')));
 assert.match(svg,/data-callout="\.subscribe\(\)" data-callout-lane="B"/);
 const map=c.snapshot(at('question')).nodes.find(n=>n.id==='map');
 assert.ok(callout.y+45*.78<map.y-map.h/2,'napis nad pipeline\'em, niczego nie zasłania');
 assert.equal(render(c.snapshot(at('question'))),render(c.snapshot(at('question'))),'deterministycznie');
});

test('callouts also support a manual .unsubscribe() during the cancel animation (mechanism check on a copy of the share scene)',async()=>{
 const fs2=require('node:fs');
 class Slide{constructor(id){this.id=id;this.dataset={animation:id};this.heading={};this.player={setAttribute(){}};}querySelector(s){return s==='h2'?this.heading:this.player;}cloneNode(){return new Slide(this.id);}after(){}}
 const slides=[...fs2.readFileSync('index.html','utf8').matchAll(/data-animation="([^"]+)"/g)].map(m=>new Slide(m[1]));
 const m=await require('./v2-harness.cjs').modules(['catalog','presentation','engine'],{document:{querySelectorAll:()=>slides}});
 const scene=m.presentation.prepareSlides(m.catalog.scenes,{format:'4:3'}).get('04a-dwa-tory-3');
 const graph=scene.graph(scene);
 const copy={...scene,graph:{...graph,callouts:[{text:'.unsubscribe()',subscriber:'A',y:60,
  from:{type:'inner-unsubscribe',edge:'share-A'},to:{type:'disconnected',edge:'share-A'}}]}};
 const c=m.engine.compileScene(copy),ev=(type,edge)=>c.events.find(e=>e.type===type&&e.edge===edge).at;
 const from=ev('inner-unsubscribe','share-A'),to=ev('disconnected','share-A');
 assert.equal(c.snapshot((from+to)/2).callouts[0].text,'.unsubscribe()');
 assert.equal((c.snapshot(to+.31).callouts||[]).length,0,'znika po animacji anulowania');
 assert.equal(c.snapshot(ev('stream-complete','share-B')+.1).callouts?.length||0,0,'complete B bez napisu');
});

test('share() after map: one lane through HTTP and map, a hub fork to A and B, one response for both',async()=>{
 const {c,at,render}=await lanes('4:3','04a-dwa-tory-2');
 const second=c.snapshot(at('second'));
 assert.deepEqual(lanesOf(second,'http'),['work:S:running'],'jeden request');
 assert.deepEqual(lanesOf(second,'map'),['operator:S:running'],'jedno map');
 assert.deepEqual(lanesOf(second,'share'),['operator:A:running','operator:B:running'],'dwa wejścia downstream');
 assert.deepEqual(dots(second,'share'),['inS','outA','outB'],'jedno połączenie upstream');
 assert.equal(second.metrics.find(m=>m.label==='requesty HTTP').value,1);
 const question=c.snapshot(at('question'));
 assert.deepEqual(lanesOf(question,'http'),['work:S:running'],'pytanie nie pokazuje drugiego requestu');
 assert.equal(node(question,'B').visible,true);
 const svg=render(second);
 assert.match(svg,/data-hub-link="S-A"/);assert.match(svg,/data-hub-link="S-B"/);
 const end=c.snapshot(c.duration);
 assert.deepEqual(lanesOf(end,'A'),['receiver:A:completed']);assert.deepEqual(lanesOf(end,'B'),['receiver:B:completed']);
 const received=Array.from(end.histories,h=>Array.from(h.values,v=>v.value+':'+v.color));
 assert.deepEqual(received[0],received[1],'A i B dostają tę samą wartość w kolorze producenta');
 assert.match(c.snapshot(0).code,/share\(\)\)$/);
});

test('tiles grow: a fixed definition part, then one execution row per subscription reaching the tile',async()=>{
 const {c,at}=await lanes();
 const tile=(t,id)=>node(c.snapshot(t),id),http0=tile(0,'http');
 assert.equal(http0.h,http0.defH,'READY: sama definicja');assert.equal(http0.laneRows.length,0);
 const top=http0.y-http0.h/2;
 for(const id of ['first','second','done']){
  const http=tile(at(id),'http');
  assert.ok(Math.abs(http.y-http.h/2-top)<1e-9,'góra kafelka stoi');
 }
 assert.equal(tile(at('first'),'http').laneRows.length,1);assert.equal(tile(at('first'),'map').h,http0.defH+http0.rowH);
 assert.deepEqual(Array.from(tile(at('second'),'map').laneRows,r=>r.subscriber),['A','B']);
 assert.equal(tile(c.duration,'http').h,http0.defH+2*http0.rowH,'wiersze zostają po zakończeniu');
 const mapSubscribe=c.events.find(e=>e.type==='subscribe'&&e.edge==='map-A').at,mapConnected=c.events.find(e=>e.type==='connected'&&e.edge==='map-A').at;
 assert.equal(tile(mapSubscribe+.1,'map').laneRows.length,0,'kafelek nie rośnie przed pojawieniem się wykonania');
 const growing=tile(mapConnected-.1,'map');
 assert.ok(growing.laneRows.length===1&&growing.laneRows[0].growth<1&&growing.laneStates.length===0,'wiersz rozszerza kafelek tuż przed dotarciem subscribe');
 assert.equal(tile(mapConnected,'map').laneRows[0].growth,1);
 const share=await lanes('4:3','04a-dwa-tory-2');
 const end=share.c.snapshot(share.c.duration);
 assert.equal(node(end,'http').laneRows.length,1,'share: jeden wiersz w HTTP');
 assert.equal(node(end,'map').laneRows.length,1);
 assert.deepEqual(Array.from(node(end,'share').laneRows,r=>r.subscriber),['A','B']);
});

test('producer progress is the row background moving forward, then the row turns complete',async()=>{
 const {c,at,render}=await lanes();
 const fill=(t,id)=>{const svg=render(c.snapshot(t)),part=svg.slice(svg.indexOf('data-node="http"'),svg.indexOf('data-node="map"'));
  return part.match(new RegExp(`data-lane="${id}"[^>]*>(?:<title>[^<]*</title>)<rect data-work-fill="([^"]+)" x="[^"]+" y="[^"]+" width="([^"]+)"`));};
 const early=fill(at('first'),'A'),later=fill(at('question'),'A');
 assert.ok(early&&later,'pasek jest tłem wiersza');
 assert.ok(Number(later[2])>Number(early[2]),'tło przesuwa się do przodu');
 assert.equal(fill(at('done'),'A'),null,'po complete wiersz przejmuje zieleń');
 assert.ok(fill(at('done'),'B'),'tor B nadal pokazuje postęp');
 // Wymiary pod projektor: przy 1024×768 (≈0,787 px na jednostkę) nagłówek ~52 px, wiersz ~54 px, pipeline 85–90% szerokości.
 const end=c.snapshot(c.duration),http=node(end,'http'),receiver=node(end,'A'),px=v=>v*.787;
 assert.ok(Math.abs(px(http.defH)-62)<2&&Math.abs(px(http.rowH)-70)<2,'nagłówek +20%, wiersz +30%');
 assert.ok(Math.abs(px(end.ball.r*2)-46)<2,'kulka 46 px');
 const span=(receiver.x+receiver.w/2-(http.x-http.w/2))/end.width;
 assert.ok(span>=.88&&span<=.92,'pipeline zajmuje ~90% szerokości: '+span);
 const map=node(end,'map');
 assert.ok(Math.abs((map.x-map.w/2)-(http.x+http.w/2)-((receiver.x-receiver.w/2)-(map.x+map.w/2)))<1e-9,'równe odstępy');
});

test('share(): A unsubscribes while B stays — grey row and cable without a pulse, shared upstream keeps running',async()=>{
 const {c,at,render}=await lanes('4:3','04a-dwa-tory-3');
 const edge=(f,id)=>f.edges.find(e=>e.id===id);
 const cancelled=c.snapshot(at('cancelled'));
 assert.deepEqual(lanesOf(cancelled,'share'),['operator:A:cancelled','operator:B:running']);
 assert.deepEqual(lanesOf(cancelled,'A'),['receiver:A:cancelled']);
 assert.deepEqual(lanesOf(cancelled,'http'),['work:S:running'],'wspólny request trwa dla B');
 assert.equal(edge(cancelled,'share-A').phase,'unsubscribe');assert.equal(edge(cancelled,'share-A').color,'#808890');
 const unsubscribedAt=c.events.find(e=>e.type==='inner-unsubscribe'&&e.edge==='share-A').at;
 for(let t=unsubscribedAt;t<at('cancelled');t+=.1)assert.equal(edge(c.snapshot(t),'share-A').pulse,undefined,'unsubscribe bez impulsu');
 assert.equal(node(c.snapshot(unsubscribedAt+.1),'share').laneStates[0].state,'running','share odłącza A po dotarciu unsubscribe');
 const end=c.snapshot(c.duration);
 assert.deepEqual(Array.from(end.histories,h=>h.values.length),[0,1],'odpowiedź tylko dla B');
 assert.deepEqual(lanesOf(end,'B'),['receiver:B:completed']);assert.deepEqual(lanesOf(end,'A'),['receiver:A:cancelled']);
 assert.match(render(cancelled),/data-lane-row="A" data-row-state="cancelled"/);
 assert.equal(cancelled.metrics.find(m=>m.label==='requesty HTTP').value,1);
});

test('cold: compact receivers on the lanes, value balls, transform inside map and HTTP wait ending with the response',async()=>{
 for(const format of ['4:3','16:9']){
  const {c,at,render}=await lanes(format);
  const end=c.snapshot(c.duration),map=node(end,'map');
  for(const id of ['A','B']){
   const r=node(end,id),slot=id==='A'?0:1,laneY=map.top+map.defH+(slot+.5)*map.rowH;
   assert.equal(r.y,laneY,format+' '+id+': odbiorca na wysokości toru');
   assert.ok(r.h<=map.rowH&&r.defH===0,'odbiorca bez nagłówka, wysokości wiersza');
   const e=end.edges.find(e=>e.id==='map-'+id);
   assert.ok(e.points.every(p=>p[1]===laneY),'połączenie poziome');
  }
  const svg=render(c.snapshot(at('done')));
  assert.match(svg,/data-icon="inbox"/);
  assert.match(svg,/<circle cx="[^"]+" cy="[^"]+" r="[^"]+"[^>]*\/><text[^>]*>42<\/text>/,'wartość jako kulka');
  const arrival=c.events.find(e=>e.type==='deliver-next'&&e.edge==='http-map-A').at,departure=c.events.find(e=>e.type==='source-next'&&e.edge==='map-A').at;
  assert.ok(departure-arrival>=1,'kulka zatrzymuje się w map');
  const ballAt=t=>c.snapshot(t).tokens.find(t=>t.phase==='transform');
  assert.equal(ballAt(arrival+(departure-arrival)*.4).value,'21');assert.equal(ballAt(arrival+(departure-arrival)*.6).value,'42');
  assert.equal(ballAt(arrival+(departure-arrival)*.5).x,map.x,'zatrzymanie na środku map');
  const sent=c.events.find(e=>e.type==='source-next'&&e.edge==='http-map-A').at;
  assert.equal(node(c.snapshot(sent),'http').laneStates[0].progress,1,'postęp HTTP kończy się z odpowiedzią');
 }
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

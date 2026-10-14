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
 assert.deepEqual(Array.from(end.histories,h=>Array.from(h.values,v=>v.value)),[['widok'],['widok']]);
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

test('code adds each subscribe when it happens, so B visibly joins later',async()=>{
 const {c,at}=await lanes();
 assert.equal(c.snapshot(0).code,'const data$ = http.get(url).pipe(map(f))');
 assert.equal(c.snapshot(at('first')).code.split('\n')[1],'data$.subscribe(A)');
 const subscribeB=c.events.find(e=>e.type==='subscribe'&&e.edge==='map-B').at;
 assert.equal(c.snapshot(subscribeB+.3).code.split('\n')[1],'data$.subscribe(A); data$.subscribe(B)');
 assert.ok(c.snapshot(at('question')).codeReveal.opacity<1,'B dopisuje się dopiero przy swoim subscribe');
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
 const http=node(c.snapshot(c.duration),'http');
 assert.ok(http.rowH<=64&&http.defH<=84,'smukłe wiersze');
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

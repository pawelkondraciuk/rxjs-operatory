const {test}=require('node:test'),assert=require('node:assert/strict');
const {modules}=require('./v2-harness.cjs');
// Wariant 05-zrodla-2: HTTP → Odbiorca, box odbioru pod odbiorcą, praca tylko w kafelku HTTP.
async function http(format){
 const m=await modules(['catalog','scene-config','engine','renderer']);
 const base=m.catalog.scenes.find(s=>s.id==='05-zrodla');
 const scene=m['scene-config'].configureScene({...base,id:'05-zrodla-2',rendererId:'05-zrodla',sourceExample:1,...(format?{format}:{})});
 return {scene,c:m.engine.compileScene(scene),render:m.renderer.renderScene};
}
const node=(frame,id)=>frame.nodes.find(n=>n.id===id);
const values=frame=>Array.from(frame.histories[0].values,v=>v.value);
const lane=(frame,id)=>node(frame,id).laneStates?.[0];

test('only the HTTP row works; the receiver row gets the response, then both complete',async()=>{
 const {scene,c}=await http();
 assert.equal(scene.code,"http.get('/api/data')");
 assert.deepEqual(Array.from(c.stops,s=>s.id),['receiver','subscribed','response','first']);
 // Na postoju subscribed subskrypcja jest zestawiona, ale request jeszcze nie ruszył.
 const subscribed=c.snapshot(c.stops[1].time);
 assert.equal(lane(subscribed,'http').role,'work');assert.equal(lane(subscribed,'http').state,'running');
 assert.equal(lane(subscribed,'http').progress,0);
 assert.equal(lane(subscribed,'observer').role,'receiver');assert.equal(lane(subscribed,'observer').progress,undefined);
 const work=c.snapshot((c.stops[1].time+c.stops[2].time)/2);
 assert.ok(lane(work,'http').progress>.2&&lane(work,'http').progress<.9);
 assert.deepEqual(values(work),[]);
 // Postęp requestu kończy się z odpowiedzią; complete przychodzi po niej.
 const sent=c.events.find(e=>e.type==='source-next'&&e.node==='http'),after=c.snapshot(sent.at+.1);
 assert.equal(lane(after,'http').progress,1);assert.equal(lane(after,'http').state,'running');
 const end=c.snapshot(c.duration);
 assert.deepEqual(values(end),['dane']);
 assert.equal(lane(end,'http').state,'completed');assert.equal(lane(end,'observer').state,'completed');
 assert.ok(end.nodes.every(n=>!n.showProgress));
});

test('stages: receiver, subscribe, emitted value, delivery, then complete in AUTO',async()=>{
 const {c,render}=await http('4:3'),at=id=>c.snapshot(c.stops.find(s=>s.id===id).time);
 const receiver=at('receiver');
 assert.equal(node(receiver,'observer').visible,true);assert.ok(receiver.edges.every(e=>!e.visible));
 assert.doesNotMatch(receiver.code,/subscribe/);assert.deepEqual(Array.from(node(receiver,'http').laneStates),[]);
 // Odbiorca przed subscribe ma już ikonę inbox i literę A; przy subscribe nie miga.
 // Pełne krycie: ikona i litera poza wierszem odbiorcy albo w wierszu po jego fade-in.
 const solid=f=>{const svg=render(f),node=svg.slice(svg.indexOf('data-node="observer"')).split('<g data-callout')[0];
  const lane=node.match(/<g data-lane="A" data-lane-role="receiver"[^>]*opacity="([\d.]+)"/),own=lane?node.slice(0,lane.index):node;
  return /data-icon="inbox"[\s\S]*>A<\/text>/.test(own)||Number(lane?.[1])>=1;};
 assert.ok(solid(receiver),'odbiorca od pojawienia się ma ikonę inbox i literę A');
 const sub=c.events.find(e=>e.type==='subscribe');
 for(const t of [sub.at,sub.at+.1,sub.at+.2,sub.at+.4])assert.ok(solid(c.snapshot(t)),String(t));
 assert.match(at('subscribed').code,/subscribe\(render\)/);
 // Odpowiedź już wyleciała z HTTP, ale jeszcze nie dotarła.
 const response=at('response');
 assert.deepEqual(Array.from(response.tokens,t=>t.value),['dane']);assert.deepEqual(values(response),[]);
 const first=at('first');assert.deepEqual(values(first),['dane']);
 assert.equal(node(first,'observer').notification,null);assert.equal(node(first,'http').notification,null);
 assert.ok(c.events.find(e=>e.type==='stream-complete').at>c.stops.at(-1).time,'complete dopiero po ostatnim postoju');
});

test('lane layout: centred HTTP GET → receiver A with the full response ball, shared look in both formats',async()=>{
 for(const format of ['4:3','16:9']){
  const {c,render}=await http(format),f=c.snapshot(c.duration),http_=node(f,'http'),observer=node(f,'observer');
  assert.equal(f.height,format==='4:3'?612:460);assert.equal(f.textScale,1.42);assert.equal(f.panels.length,0);
  assert.equal(http_.label,'HTTP GET');assert.equal(http_.fill,'#8FC9D4');
  assert.equal(lane(f,'http').y,lane(f,'observer').y);
  const top=Math.min(...f.nodes.map(n=>n.y-n.h/2)),bottom=Math.max(...f.nodes.map(n=>n.y+n.h/2));
  assert.ok(Math.abs((top+bottom)/2-f.height/2)<2,'wyśrodkowane w pionie');
  const left=Math.min(...f.nodes.map(n=>n.x-n.w/2)),right=Math.max(...f.nodes.map(n=>n.x+n.w/2));
  assert.ok(Math.abs((left+right)/2-f.width/2)<2,'wyśrodkowane w poziomie');
  const svg=render(f);
  assert.match(svg,/>dane<\/text>/,'pełna etykieta „dane” w kulce');
  assert.ok(f.histories[0].balls&&f.histories[0].x<observer.x+observer.w/2);
  assert.doesNotMatch(svg,/rx="12"/);
  // Jedyny tekst complete: status przy odbiorcy A, nie w kafelku HTTP GET.
  assert.equal((svg.match(/data-lane-terminal="completed"[^>]*>✓ complete</g)||[]).length,1);
  assert.ok(svg.indexOf('data-lane-terminal')>svg.indexOf('data-node="observer"'),'status w wierszu odbiorcy');
 }
 const {c}=await http('4:3'),arrived=c.events.find(e=>e.type==='deliver-next'&&e.edge==='http-observer');
 assert.deepEqual(values(c.snapshot(arrived.at-.01)),[]);assert.deepEqual(values(c.snapshot(arrived.at)),['dane']);
 // Rozbłysk complete wygasa przed FINISHED.
 const complete=c.plan.records.get('http-observer').end;
 assert.ok(c.duration-(complete.at+complete.duration)>=.6);
});

test('definition is idle before subscribe; rewind hides subscriber and code',async()=>{
 const {c}=await http();const ready=c.snapshot(0);
 assert.equal(node(ready,'http').visible,true);assert.equal(node(ready,'observer').visible,false);
 assert.deepEqual(Array.from(node(ready,'http').laneRows),[]);assert.deepEqual(Array.from(node(ready,'http').laneStates),[]);
 assert.ok(ready.edges.every(e=>!e.visible));
 assert.doesNotMatch(ready.code,/subscribe/);
 const subscribe=c.events.find(e=>e.type==='subscribe'),connected=c.events.find(e=>e.type==='connected');
 assert.match(c.snapshot(subscribe.at).code,/subscribe\(render\)/);
 assert.deepEqual(Array.from(node(c.snapshot((subscribe.at+connected.at)/2),'http').laneStates),[]);
 c.snapshot(c.duration);assert.deepEqual(c.snapshot(0),ready);
});

test('.subscribe() A stays on the subscribed stop and fades when the request starts',async()=>{
 const {c}=await http('4:3'),shown=t=>Array.from(c.snapshot(t).callouts||[],k=>k.text+' '+k.label);
 const sub=c.events.find(e=>e.type==='subscribe'&&e.edge==='http-observer');
 assert.deepEqual(shown(sub.at),['.subscribe() A']);assert.deepEqual(shown(0),[]);
 for(const stop of c.stops)assert.deepEqual(shown(stop.time),stop.id==='subscribed'?['.subscribe() A']:[],stop.id);
 const subscribed=c.stops.find(s=>s.id==='subscribed').time;
 assert.equal(c.snapshot(subscribed).callouts[0].opacity,1);
 // Gdy rusza postęp requestu, migawka gaśnie.
 const moving=c.snapshot(subscribed+.6);
 assert.ok(lane(moving,'http').progress>0);assert.ok((moving.callouts?.[0]?.opacity??0)<1);
});

test('speaker notes: one template entry per stage, from definition to complete',async()=>{
 const {c}=await http('4:3'),html=require('node:fs').readFileSync('index.html','utf8');
 const template=html.match(/<template data-checkpoint-notes="05-zrodla-2">([\s\S]*?)<\/template>/)[1];
 assert.deepEqual([...template.matchAll(/data-checkpoint="([^"]+)"/g)].map(m=>m[1]),['ready',...c.stops.map(s=>s.id),'finished']);
 const note=id=>template.match(new RegExp(`data-checkpoint="${id}">([\\s\\S]*?)</div>`))[1];
 assert.match(note('ready'),/wyłącznie definicja/);assert.doesNotMatch(note('receiver'),/\.subscribe\(render\)/);
 assert.match(note('subscribed'),/\.subscribe\(\) A/);assert.match(note('response'),/wyleciała z HTTP/);
 assert.doesNotMatch(note('first'),/✓ complete/);assert.match(note('finished'),/✓ complete/);assert.match(note('finished'),/interval/);
});

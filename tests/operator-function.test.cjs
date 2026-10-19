const {test}=require('node:test');
const assert=require('node:assert/strict');
const {modules,playbackHarness,revealMock}=require('./v2-harness.cjs');
const history=frame=>Array.from(frame.histories[0].values,v=>v.value);
const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-8,`${actual} != ${expected}`);
const stopIds=['pipeline','arrived','mapped','received','complete'];
const definition="httpGet<User>('/api/users/42')";
const piped=definition+'\n.pipe(map(user => `${user.firstName} ${user.lastName}`))';
async function subject() {
  const m=await modules(['catalog','engine','renderer','reference-scenes']);
  const scene=m.catalog.scenes.find(s=>s.id==='04-operator');
  return {scene,compiled:m.engine.compileScene(scene),m};
}
const lane=(frame,id)=>frame.nodes.find(n=>n.id===id).laneStates.find(l=>l.subscriber==='A');
const requests=frame=>frame.metrics.find(m=>m.label==='Requesty HTTP').value;
const stop=(c,id)=>c.stops.find(s=>s.id===id).time;
const fieldOf=svg=>svg.slice(svg.indexOf('data-field="observer"'),svg.indexOf('</g>',svg.indexOf('data-field="observer"')));

// Kod jako linie fragmentów: tekst i krycie każdej linii (druga linia ma zarezerwowane miejsce od READY).
const line=(frame,i)=>frame.codeView[i].map(p=>p.text).join('');
const lineOpacity=(frame,i)=>Math.min(...frame.codeView[i].map(p=>p.opacity));
const markOf=(frame,id)=>frame.codeView.flat().find(p=>p.mark?.id===id);
test('READY shows the httpGet<User> definition and receiver A; pipe and map fade in together without starting HTTP',async()=>{
  const {scene,compiled:c,m,render=m.renderer.renderScene}=await subject();
  assert.deepEqual(Array.from(m.catalog.scenes.filter(s=>s.playback.controller==='stages'),s=>s.id),['04-operator']);
  assert.deepEqual(Array.from(c.stops,s=>s.id),stopIds);
  const ready=c.snapshot(0),pipeline=c.snapshot(stop(c,'pipeline')),arrived=c.snapshot(stop(c,'arrived'));
  assert.equal(scene.code,piped);
  assert.equal(line(ready,0),definition);assert.equal(lineOpacity(ready,0),1);
  assert.equal(line(ready,1),'.pipe(map(user => `${user.firstName} ${user.lastName}`))');assert.equal(lineOpacity(ready,1),0);
  assert.equal(lineOpacity(pipeline,1),1);
  assert.doesNotMatch(piped,/of\(|subscribe|x \* 2/);
  assert.equal(ready.nodes.find(n=>n.id==='source').label,'HTTP GET');
  assert.equal(ready.nodes.find(n=>n.id==='map').visible,false);
  assert.equal(pipeline.nodes.find(n=>n.id==='map').visible,true);
  const fading=c.snapshot(scene.timing.handoff+.15);
  close(lineOpacity(fading,1),.5);close(fading.nodes.find(n=>n.id==='map').opacity,.5);
  // Odbiorca A od READY: ikona inbox, litera A i puste pole fullName.
  const readySvg=render(ready),receiverSvg=readySvg.slice(readySvg.indexOf('data-node="observer"'));
  assert.equal(ready.nodes.find(n=>n.id==='observer').visible,true);
  assert.match(receiverSvg,/data-icon="inbox"[^]*>A<\/text>/);assert.match(fieldOf(readySvg),/>fullName<\/text>/);
  for(const frame of [ready,pipeline]) {
    assert.ok(frame.edges.every(e=>!e.visible));
    assert.equal(requests(frame),0,'pipe nie uruchamia HTTP');
    assert.equal(frame.tokens.length,0);assert.deepEqual(history(frame),[]);
  }
  assert.match(c.stops[0].caption,/pipe/);
  assert.ok(arrived.edges.every(e=>e.visible&&e.phase==='subscribed'&&e.subscriber==='A'));
  assert.equal(arrived.panels.length,0,'bez dolnej sekcji inner');
});

test('code colours httpGet and map like the other lane slides; each lights up while its part works',async()=>{
  const {compiled:c}=await subject();
  assert.deepEqual(JSON.parse(JSON.stringify(markOf(c.snapshot(0),'http').mark)),{id:'http',bg:'rgba(143,201,212,.4)',line:'#4fa5b5'});
  assert.deepEqual(JSON.parse(JSON.stringify(markOf(c.snapshot(0),'map').mark)),{id:'map',bg:'rgba(216,179,230,.45)',line:'#b384c6'});
  const sent=c.events.find(e=>e.type==='source-next'&&e.edge==='source-map').at;
  const flying=c.snapshot(sent+.2);assert.ok(markOf(flying,'http').active);assert.ok(!markOf(flying,'map').active);
  const mapped=c.snapshot(stop(c,'mapped'));assert.ok(markOf(mapped,'map').active);assert.ok(!markOf(mapped,'http').active);
  const done=c.snapshot(stop(c,'received'));assert.ok(!markOf(done,'map').active&&!markOf(done,'http').active);
});

test('subscribe A travels through map to HTTP and starts exactly one request',async()=>{
  const {compiled:c}=await subject();
  const downstream=c.plan.records.get('map-observer'),upstream=c.plan.records.get('source-map');
  close(upstream.start,downstream.start+downstream.connectDuration);
  // subscribe rusza zaraz po postoju pipeline (ten sam etap co request i emisja do map).
  assert.ok(downstream.start-.3>=stop(c,'pipeline')&&downstream.start-stop(c,'pipeline')<.5);
  const shown=t=>Array.from(c.snapshot(t).callouts||[],k=>k.text+' '+k.label);
  assert.deepEqual(shown(downstream.start),['.subscribe() A']);
  for(const s of c.stops)assert.deepEqual(shown(s.time),[],s.id);
  assert.equal(c.snapshot(downstream.start).nodes.find(n=>n.id==='source').laneRows.length,0);
  const frame=c.snapshot(upstream.start+upstream.connectDuration+.6);
  assert.equal(frame.nodes.find(n=>n.id==='source').laneRows[0].growth,1);
  assert.equal(requests(frame),1);
  assert.ok(lane(frame,'source').progress>0&&lane(frame,'source').progress<.5,'request trwa');
  assert.equal(c.events.filter(e=>e.type==='subscribe'&&e.edge==='source-map').length,1);
  assert.equal(requests(c.snapshot(c.duration)),1,'dokładnie jeden request');
});

test('HTTP emits one User object; map turns it into one string in the same logical moment',async()=>{
  const {compiled:c,scene}=await subject();
  const inputs=c.plan.records.get('source-map').events,outputs=c.plan.records.get('map-observer').events;
  assert.deepEqual(Array.from(inputs,e=>e.value),['{…}']);assert.deepEqual(Array.from(outputs,e=>e.value),['"…"']);
  const [input]=inputs,[output]=outputs;
  assert.equal(output.logicalAt,input.logicalAt,'projekcja synchroniczna');
  close(output.at-input.arrival,scene.timing.transform);
  // Postój arrived: User dotarł do portu map i jeszcze nie jest przekształcony.
  const arrived=c.snapshot(stop(c,'arrived')),port=arrived.nodes.find(n=>n.id==='map');
  assert.deepEqual(Array.from(arrived.tokens,t=>t.value),['{…}']);
  assert.ok(Math.abs(arrived.tokens[0].x-(port.x-port.w/2))<1,'kulka User na wejściu map');
  assert.equal(lane(arrived,'source').progress,1,'request zakończony odpowiedzią');
  const mapped=c.snapshot(stop(c,'mapped')),map=mapped.nodes.find(n=>n.id==='map');
  assert.deepEqual(Array.from(mapped.tokens,t=>[t.phase,t.value]),[['transform','"…"']]);
  assert.ok(Math.abs(mapped.tokens[0].x-map.x)<1e-6,'kulka stoi w środku map');
  const before=c.snapshot(input.arrival+(output.at-input.arrival)*.4);
  assert.deepEqual(Array.from(before.tokens,t=>t.value),['{…}']);
  assert.equal(c.events.filter(e=>e.type==='source-next').length,2,'jedna wartość HTTP i jeden wynik map');
  assert.equal(c.events.some(e=>e.type==='subscribe'&&e.at>c.plan.records.get('source-map').start),false,'map nie tworzy nowej subskrypcji');
});

test('A receives one string shown in full, then complete passes through map with ✓ complete only at A',async()=>{
  const {compiled:c,m}=await subject();
  const output=c.plan.records.get('map-observer').events[0];
  assert.deepEqual(history(c.snapshot(output.arrival-1e-6)),[]);
  const received=c.snapshot(stop(c,'received')),svg=m.renderer.renderScene(received);
  assert.deepEqual(history(received),['"…"']);
  assert.match(fieldOf(svg),/data-field-value="Paweł Kondraciuk" opacity="1.000"/);
  assert.match(fieldOf(svg),/>fullName<\/text>/);
  assert.ok(['source','map','observer'].every(id=>lane(received,id).state==='running'),'complete jeszcze nie przyszło');
  const source=c.plan.records.get('source-map'),result=c.plan.records.get('map-observer');
  assert.ok(source.end.at>output.arrival);
  close(result.end.at,source.end.at+source.end.duration);
  const during=c.snapshot(source.end.at+source.end.duration/2);
  assert.equal(during.edges.find(e=>e.id==='source-map').pulse.color,'#26804E');
  assert.equal(lane(during,'source').state,'completed');assert.equal(lane(during,'observer').state,'running');
  const done=c.snapshot(stop(c,'complete'));
  assert.ok(['source','map','observer'].every(id=>lane(done,id).state==='completed'));
  assert.ok(c.events.every(e=>!['stream-error','inner-unsubscribe'].includes(e.type)));
  const final=c.snapshot(c.duration);
  assert.ok(final.edges.every(e=>e.done&&!e.pulse));assert.equal(final.tokens.length,0);
  assert.ok(c.duration-(result.end.at+result.end.duration)>=.6,'rozbłysk wygasa przed FINISHED');
  assert.match(final.caption,/Jeden request, jeden User, jeden string/);
  const finalSvg=m.renderer.renderScene(final);
  assert.match(finalSvg,/data-field-value="Paweł Kondraciuk"/);
  // Jeden status ✓ complete — przy odbiorcy A; HTTP GET i map mają tylko zielone tło wiersza.
  assert.equal((finalSvg.match(/data-lane-terminal="completed"[^>]*>✓ complete</g)||[]).length,1);
  assert.ok(finalSvg.indexOf('data-lane-terminal')>finalSvg.indexOf('data-node="observer"'));
  assert.equal((finalSvg.match(/data-row-state="completed"/g)||[]).length,3,'zielone wiersze HTTP GET, map i A');
  assert.doesNotMatch(m.renderer.renderScene(c.snapshot(result.end.at+result.end.duration-.01)),/data-lane-terminal/,'status dopiero po dotarciu impulsu');
  assert.doesNotMatch(finalSvg,/>S1</,'pojedyncza subskrypcja oznaczona jako A');
});

test('lane geometry: HTTP GET → map → A in one centred row in both formats, with readable result',async()=>{
  const {m}=await subject();
  for(const format of ['4:3','16:9']){
    const scene={...m.catalog.scenes.find(s=>s.id==='04-operator'),format};
    m['reference-scenes'].configureOperator(scene);
    const c=m.engine.compileScene(scene),final=c.snapshot(c.duration);
    const nodes=['source','map','observer'].map(id=>final.nodes.find(n=>n.id===id));
    const y=lane(final,'source').y;
    for(const id of ['map','observer'])assert.equal(lane(final,id).y,y);
    assert.ok(final.edges.every(e=>e.points.every(p=>p[1]===y)));
    const left=Math.min(...nodes.map(n=>n.x-n.w/2)),right=Math.max(...nodes.map(n=>n.x+n.w/2));
    assert.ok(Math.abs((left+right)/2-final.width/2)<2,'wyśrodkowane w poziomie');
    assert.equal(nodes[0].fill,'#8FC9D4');assert.equal(nodes[1].fill,'#D8B3E6');
    const field=final.histories[0],receiver=nodes[2],width=Array.from('Paweł Kondraciuk').length*.6*22*final.textScale;
    assert.ok(field.x>receiver.x-receiver.w/2&&field.x+width<receiver.x+receiver.w/2,format+': pełny wynik mieści się w A');
    assert.doesNotMatch(m.renderer.renderScene(final),/NaN|Infinity/);
  }
});

test('custom timing preserves the storyboard and all checkpoint snapshots are deterministic',async()=>{
  const {scene,m}=await subject();
  const custom={...scene,timing:{...scene.timing,subscribe:1.4,request:1.2,travel:.8,transform:.6,receivedHold:.4,terminal:.7}};
  m['reference-scenes'].configureOperator(custom);
  const c=m.engine.compileScene(custom),points=[0,...c.stops.map(s=>s.time),...c.events.map(e=>e.at),c.duration];
  close(stop(c,'arrived'),c.plan.records.get('source-map').events[0].arrival);
  for(let i=1;i<c.stops.length;i++)assert.ok(c.stops[i].time>c.stops[i-1].time);
  for(const time of points) {
    const frame=JSON.stringify(c.snapshot(time));c.snapshot(c.duration);c.snapshot(0);
    assert.equal(JSON.stringify(c.snapshot(time)),frame);
  }
  assert.deepEqual(history(c.snapshot(c.duration)),['"…"']);
});

test('checkpoint notes follow the stops and lead from map to Subject + HTTP with the raw user$',async()=>{
  const {compiled:c}=await subject();
  const html=require('node:fs').readFileSync('index.html','utf8');
  const source=html.match(/<template data-checkpoint-notes="04-operator">([\s\S]*?)<\/template>/)[1];
  const notes=Object.fromEntries([...source.matchAll(/<div data-checkpoint="([^"]+)">([\s\S]*?)<\/div>/g)].map(([,id,text])=>[id,text]));
  assert.deepEqual(Object.keys(notes),['ready',...Array.from(c.stops,s=>s.id),'finished']);
  assert.match(notes.ready,/pobieramy dane użytkownika z HTTP[\s\S]*pełnego imienia i nazwiska/);
  assert.match(notes.mapped,/synchronicznie ją przekształca[\s\S]*każdej kolejnej emisji/);
  assert.match(notes.received,/jeden request[\s\S]*jeden string\. To nadal jedno wykonanie Observable/);
  assert.match(notes.complete,/complete przechodzi dalej do odbiorcy/);
  assert.match(notes.finished,/trzy niezależne elementy interfejsu[\s\S]*Prawo: Subject \+ HTTP[\s\S]*surowego user\$/);
});

// Wyświetlany kod: HTML z <wbr> jako punktami łamania, bez zmiany treści.
const shownCode=element=>element.innerHTML.replace(/<span[^>]*aria-hidden="true"[^>]*>[^]*?<\/span>/g,'').replace(/<\/?span[^>]*>/g,'').replace(/<wbr>/g,'').replace(/&gt;/g,'>').replace(/&lt;/g,'<').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&');
test('manual stops, AUTO, backwards and reset restore the displayed code and the A result',async()=>{
  const {scene}=await subject(),h=await playbackHarness(),{player,controller,elements}=h.create({scene});
  const ready=JSON.stringify(player.snapshot);
  for(let i=0;i<player.stops.length;i++) {
    controller.next();h.advance(30000);
    assert.equal(player.time,player.stops[i].time);assert.equal(player.state,'paused');assert.equal(h.frames.size,0);
    assert.equal(shownCode(elements.get('.rx-code')),player.snapshot.code);
  }
  assert.deepEqual(history(player.snapshot),['"…"']);
  controller.next();assert.equal(controller.mode,'auto');h.advance(30000);
  assert.equal(player.state,'finished');assert.equal(h.frames.size,0);
  controller.previous();assert.equal(player.time,player.stops.at(-1).time);
  controller.previous();controller.previous();assert.deepEqual(history(player.snapshot),[]);
  for(let i=0;i<4;i++)controller.previous();
  assert.equal(JSON.stringify(player.snapshot),ready);
  for(const time of [0,...player.stops.map(s=>s.time),player.duration]) {
    controller.seek(time);controller.reset();assert.equal(player.state,'ready');assert.equal(h.frames.size,0);
    assert.equal(JSON.stringify(player.snapshot),ready);
  }
});

test('Reveal keys and native fragments operate the real slide and ordinary slides recover native navigation',async()=>{
  const {scene}=await subject(),h=await playbackHarness(),{deck,stage,ordinary,bindings}=revealMock();
  const count=scene.playback.stops.length;
  stage.markers=Array.from({length:count+1},(_,index)=>({index,visible:false,closest(s){return s==='section'?stage:s==='.rx-fragment-steps'?stage.markers:null;}}));
  const {player,controller}=h.create({scene,controls:{stageOptions:{onNavigate:d=>deck.navigation.push(d)}}});
  const adapter=h.install(deck,{getController:s=>s===stage?controller:null});adapter.refresh();
  for(let i=0;i<count;i++){deck.press(39);deck.press(39);assert.equal(player.time,player.stops[i].time);assert.equal(deck.fragmentIndex,i);}
  assert.deepEqual(history(player.snapshot),['"…"']);assert.equal(controller.mode,'manual');
  deck.navigateFragment(count);assert.equal(controller.mode,'auto');h.advance(30000);
  assert.equal(player.state,'finished');assert.equal(deck.fragmentIndex,count);
  deck.press(37);assert.equal(player.time,player.stops.at(-1).time);
  controller.suspend('slide');deck.show(ordinary);assert.equal(bindings.size,0);deck.press(39);assert.equal(deck.navigation.at(-1),'native:39');
  deck.show(stage);controller.resume('slide');assert.equal(player.isPlaying,false);adapter.destroy();
});

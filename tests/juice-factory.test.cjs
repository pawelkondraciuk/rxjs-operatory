const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {modules,playbackHarness}=require('./v2-harness.cjs');
const id='01a-fabryka-soku';
async function fixture(format='4:3') {
  const m=await modules(['scene-config','juice-factory','engine','renderer']);
  const scene=m['scene-config'].configureScene({id,title:'',code:'',rows:[],captions:[],duration:1,format});
  return {m,scene,compiled:m.engine.compileScene(scene)};
}
const plain=value=>JSON.parse(JSON.stringify(value));
const stopTime=(compiled,stopId)=>compiled.stops.find(stop=>stop.id===stopId).time;
const items=(compiled,time)=>compiled.snapshot(time).illustrations;
const byId=(list,itemId)=>list.find(item=>item.id===itemId);
const visible=(list,itemId)=>(byId(list,itemId)?.opacity??1)>0;
const fruits=list=>list.filter(item=>['apple','pear','glass'].includes(item.asset));

test('fabryka: jabłko, gruszka, jabłko; gruszka trafia do skrzynki, odbiorca dostaje dokładnie dwie szklanki',async()=>{
  const {m,compiled}=await fixture();
  assert.deepEqual(plain(m['juice-factory'].juiceFruits),['apple','pear','apple']);
  const ready=items(compiled,0);
  assert.equal(fruits(ready).length,0,'READY bez owoców');
  for(const label of ['label-source','label-gate','label-juicer','label-operators','label-receiver','punchline-0'])
    assert.equal(visible(ready,label),false,label);
  // Kolejność wejścia na taśmę: najpierw jabłko, potem gruszka, potem jabłko.
  const order=[];
  for(let time=0;time<=compiled.duration;time+=.05)
    for(const item of fruits(items(compiled,time)))if(!order.some(entry=>entry.id===item.id))order.push({id:item.id,asset:item.asset});
  assert.deepEqual(plain(order),[{id:'fruit-0',asset:'apple'},{id:'fruit-1',asset:'pear'},{id:'fruit-2',asset:'apple'}]);
  const final=items(compiled,compiled.duration),layout=m['juice-factory'].juiceLayout({format:'4:3'});
  const bin=byId(final,'bin'),table=byId(final,'receiver');
  assert.equal(byId(final,'fruit-1').asset,'pear');
  assert.ok(Math.abs(byId(final,'fruit-1').x-bin.x)<bin.w/2&&byId(final,'fruit-1').y>layout.beltY,'gruszka w skrzynce pod taśmą');
  const glasses=final.filter(item=>item.asset==='glass');
  assert.equal(glasses.length,2);
  for(const glass of glasses)assert.ok(Math.abs(glass.x-table.x)<table.w/2,'szklanka na stole odbiorcy');
  // Gruszka nigdy nie zmienia się w sok, a szklanka pojawia się dopiero za wyciskarką.
  for(let time=0;time<=compiled.duration;time+=.05) {
    const list=items(compiled,time),juicer=byId(list,'juicer');
    assert.notEqual(byId(list,'fruit-1')?.asset,'glass');
    for(const glass of list.filter(item=>item.asset==='glass'))assert.ok(glass.x>juicer.x,`szklanka za wyciskarką @${time}`);
  }
});

test('postoje: źródło, bramka, wyciskarka; podpisy odsłaniają się po kolei, puenta na końcu',async()=>{
  for(const format of ['4:3','16:9']) {
    const {m,compiled}=await fixture(format);
    assert.deepEqual(plain(compiled.stops.map(stop=>stop.id)),['source','gate','juicer']);
    assert.ok(compiled.stops.every(stop=>stop.autoPause));
    const source=items(compiled,stopTime(compiled,'source'));
    assert.deepEqual(plain(fruits(source).map(item=>item.asset)),['apple','pear','apple']);
    assert.ok(visible(source,'label-source')&&!visible(source,'label-gate'));
    const gate=items(compiled,stopTime(compiled,'gate')),gateX=byId(gate,'gate').x,juicerX=byId(gate,'juicer').x;
    assert.ok(byId(gate,'fruit-1').y>byId(gate,'belt').y,'gruszka zjechała z taśmy');
    for(const apple of ['fruit-0','fruit-2'].map(key=>byId(gate,key))) {
      assert.equal(apple.asset,'apple');
      assert.ok(apple.x>gateX&&apple.x<juicerX-75,'jabłko między bramką a wyciskarką');
    }
    assert.ok(visible(gate,'label-gate')&&!visible(gate,'label-juicer'));
    const juicer=items(compiled,stopTime(compiled,'juicer')),receiver=byId(juicer,'receiver');
    assert.deepEqual(plain(['fruit-0','fruit-2'].map(key=>byId(juicer,key).asset)),['glass','glass']);
    for(const glass of ['fruit-0','fruit-2'].map(key=>byId(juicer,key)))assert.ok(glass.x<receiver.x-receiver.w/2,'szklanki jeszcze na taśmie');
    assert.ok(visible(juicer,'label-juicer')&&visible(juicer,'label-operators')&&!visible(juicer,'label-receiver')&&!visible(juicer,'punchline-0'));
    const final=items(compiled,compiled.duration);
    for(const label of ['label-receiver','punchline-0','punchline-1'])assert.equal(byId(final,label).opacity,1,label);
    assert.equal([byId(final,'punchline-0').text,byId(final,'punchline-1').text].join(' '),m['juice-factory'].juicePunchline);
    const svg=m.renderer.renderScene(compiled.snapshot(compiled.duration));
    for(const text of ['Źródło','Tylko jabłka','Zamień na sok','Operatory','Odbiorca','kiedy się pojawi.'])assert.ok(svg.includes(text),text);
    assert.doesNotMatch(svg,/NaN|Infinity|data-node=/);
    assert.equal(compiled.snapshot(stopTime(compiled,'gate')).caption,'Wybierasz, co Cię interesuje: gruszka zjeżdża na bok.');
    assert.equal(compiled.snapshot(compiled.duration).caption,'Odbiorca dostaje gotowy wynik.');
  }
});

test('układ mieści się w ramce obu formatów; puenta pod skrzynką i napisami',async()=>{
  for(const format of ['4:3','16:9']) {
    const {m,compiled}=await fixture(format);
    const layout=m['juice-factory'].juiceLayout({format});
    for(const time of [0,...compiled.stops.map(stop=>stop.time),compiled.duration]) {
      const frame=compiled.snapshot(time);
      assert.equal(frame.height,format==='4:3'?690:530);
      for(const item of frame.illustrations) {
        assert.ok(item.x>=0&&item.x<=frame.width,`${format} ${item.id} x`);
        assert.ok(item.y>=0&&item.y<=frame.height,`${format} ${item.id} y`);
      }
      assert.equal(new Set(frame.illustrations.map(item=>item.id)).size,frame.illustrations.length);
    }
    const final=items(compiled,compiled.duration),punch=byId(final,'punchline-0'),bin=byId(final,'bin');
    assert.ok(punch.y-punch.font*.6>bin.y+bin.h/2,`${format}: puenta pod skrzynką`);
    assert.ok(byId(final,'punchline-1').y+punch.font*.6<=layout.height,`${format}: puenta w ramce`);
    assert.ok(punch.text.length*punch.font*.5<1200,`${format}: puenta mieści się w szerokości`);
    assert.ok(byId(final,'label-operators').y-byId(final,'label-operators').font*.6>=0,`${format}: Operatory w ramce`);
  }
});

test('ograniczony ruch pokazuje koniec bieżącego etapu; snapshoty są deterministyczne',async()=>{
  const {m,compiled}=await fixture();
  const render=(time,options)=>m.renderer.renderScene(compiled.snapshot(time),options);
  assert.equal(render(1.8,{reducedMotion:true}),render(stopTime(compiled,'source'),{reducedMotion:true}));
  assert.equal(render(8.5,{reducedMotion:true}),render(stopTime(compiled,'juicer'),{reducedMotion:true}));
  assert.notEqual(render(1.8),render(stopTime(compiled,'source')));
  assert.match(render(12,{reducedMotion:true}),/kiedy się pojawi\./);
  assert.equal(render(0,{reducedMotion:true}).replace(' data-reduced-motion="true"',''),render(0));
  assert.equal(render(5.2),render(5.2));
  assert.deepEqual(plain(compiled.snapshot(9.1)),plain(compiled.snapshot(9.1)));
});

test('MANUAL i AUTO zatrzymują się po każdym etapie; szybkie dalej kończy etap; cofanie i reset',async()=>{
  const {scene,compiled}=await fixture();
  const h=await playbackHarness(),navigation=[];
  const {player,controller}=h.create({scene,controls:{stageOptions:{onNavigate:direction=>navigation.push(direction)}}});
  const times=compiled.stops.map(stop=>stop.time);
  for(const time of times){controller.next();h.advance(6000);assert.ok(Math.abs(player.time-time)<1e-6,`stop ${time}`);assert.equal(player.isPlaying,false);}
  controller.next();h.advance(6000);assert.equal(player.state,'finished');
  controller.next();assert.deepEqual(plain(navigation),[1]);
  controller.previous();assert.ok(Math.abs(player.time-times[2])<1e-6);
  controller.previous();assert.ok(Math.abs(player.time-times[1])<1e-6);
  controller.reset();assert.equal(player.time,0);assert.equal(player.isPlaying,false);
  controller.next();h.advance(300);assert.ok(player.isPlaying);controller.next();
  assert.ok(Math.abs(player.time-times[0])<1e-6);assert.equal(player.isPlaying,false);
  controller.setMode('manual');controller.reset();controller.setMode('auto');h.advance(6000);
  assert.ok(Math.abs(player.time-times[0])<1e-6);assert.equal(player.isPlaying,false);
  for(const time of times.slice(1)){controller.next();h.advance(6000);assert.ok(Math.abs(player.time-time)<1e-6);}
  controller.next();h.advance(6000);assert.equal(player.state,'finished');
});

test('HTML: slajd między tytułem a Rx marbles, notatki per checkpoint i pierwsze miejsce w MAIN',async()=>{
  const {m,compiled}=await fixture();
  const html=fs.readFileSync('index.html','utf8');
  const section=html.match(/<section id="01a-fabryka-soku"[\s\S]*?<\/section>/)[0];
  assert.match(section,/data-animation="01a-fabryka-soku"/);
  assert.match(section,/<h2>RxJS — o co w tym chodzi\?<\/h2>/);
  const notes=[...section.matchAll(/data-checkpoint="([^"]+)"/g)].map(match=>match[1]);
  assert.deepEqual(plain(notes),['ready',...compiled.stops.map(stop=>stop.id),'finished']);
  assert.match(section,/A teraz klasyczne diagramy RxJS/);
  const marbles=html.match(/<section id="01b-rx-marbles"[\s\S]*?<\/section>/)[0];
  assert.match(marbles,/A teraz zamiast jabłka — odpowiedź z serwera/);
  assert.doesNotMatch(marbles,/<h2|fragment|data-animation/);
  assert.doesNotMatch(section,/<pre|<code/);
  assert.ok(html.indexOf('id="tytul"')<html.indexOf('id="01a-fabryka-soku"'));
  assert.ok(html.indexOf('id="01a-fabryka-soku"')<html.indexOf('id="01b-rx-marbles"'));
  assert.ok(html.indexOf('id="01b-rx-marbles"')<html.indexOf('id="02-znane-operatory"'));
  assert.deepEqual(plain(m['scene-config'].mainOrder.slice(0,3)),['01a-fabryka-soku','01b-rx-marbles','05-zrodla-2']);
});

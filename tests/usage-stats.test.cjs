const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {modules,playbackHarness}=require('./v2-harness.cjs');
const id='24-rxjs-liczby';
async function fixture(format='4:3') {
  const m=await modules(['scene-config','usage-stats','engine','renderer']);
  const scene=m['scene-config'].configureScene({id,title:'',code:'',rows:[],captions:[],duration:1,format});
  return {m,scene,compiled:m.engine.compileScene(scene)};
}
const plain=value=>JSON.parse(JSON.stringify(value));
const stopTime=(compiled,stopId)=>compiled.stops.find(stop=>stop.id===stopId).time;

test('dokładne dane zestawienia: cztery *Map, suma 1793 i trzy ciekawostki',async()=>{
  const {m,compiled}=await fixture();
  const data=m['usage-stats'];
  assert.deepEqual(plain(data.usageMapOperators.map(row=>[row.label,row.count,row.share])),
    [['concatMap',96,5.4],['mergeMap',251,14.0],['switchMap',1418,79.1],['exhaustMap',28,1.6]]);
  assert.equal(data.usageMapOperators.reduce((sum,row)=>sum+row.count,0),data.usageMapTotal);
  assert.equal(data.usageMapTotal,1793);
  for(const row of data.usageMapOperators)assert.equal(+(row.count/1793*100).toFixed(1),row.share,row.label);
  assert.deepEqual(plain(data.usageFacts.map(fact=>[fact.value,fact.label,fact.note])),
    [['4282','map()','„Najczęściej używany”'],['3,7×','shareReplay vs share','„926 kontra 252”'],['1','concatAll()','„Tylko jedno wywołanie!”']]);
  assert.equal((926/252).toFixed(1),'3.7');
  const svg=m.renderer.renderScene(compiled.snapshot(compiled.duration));
  for(const value of ['79,1%','14,0%','5,4%','1,6%','1418 wywołań','251 wywołań','96 wywołań','28 wywołań','Cztery Map. Jeden zdecydowany zwycięzca.'])
    assert.ok(svg.includes(value),value);
  assert.equal((svg.match(/data-bar="/g)||[]).length,4);
  assert.equal(compiled.snapshot(0).caption,'Źródło: analiza wybranego zbioru kodu RxJS · liczba wywołań w kodzie, nie wykonań w runtime');
});

test('checkpointy: pytanie bez wyników, ranking, potem kolejne ciekawostki; paski proporcjonalne do udziałów',async()=>{
  for(const format of ['4:3','16:9']) {
    const {m,compiled}=await fixture(format);
    assert.deepEqual(plain(compiled.stops.map(stop=>stop.id)),['ranking','map','share-replay','concat-all']);
    assert.ok(compiled.stops.every(stop=>stop.autoPause));
    assert.ok(compiled.duration>stopTime(compiled,'concat-all'));
    const svgAt=time=>m.renderer.renderScene(compiled.snapshot(time));
    const ready=svgAt(0);
    const presentationOrder=['concatMap','mergeMap','switchMap','exhaustMap'];
    const barOrder=svg=>[...svg.matchAll(/data-bar="([^"]+)"/g)].map(match=>match[1]);
    assert.deepEqual(barOrder(ready),presentationOrder);
    assert.doesNotMatch(ready,/data-bar-fill|data-bar-values|data-big-stat|>79,1%<|>1418 wywołań</);
    const ranking=svgAt(stopTime(compiled,'ranking'));
    assert.deepEqual(barOrder(ranking),presentationOrder);
    assert.match(ranking,/data-bar-values/);assert.doesNotMatch(ranking,/data-big-stat/);
    const chart=compiled.snapshot(stopTime(compiled,'ranking')).barCharts[0];
    assert.equal(chart.progress,1);
    const widths=[...ranking.matchAll(/data-bar-fill="true" x="[\d.]+" y="[\d.]+" width="([\d.]+)"/g)].map(match=>+match[1]);
    assert.equal(widths.length,4);
    chart.rows.forEach((row,index)=>assert.ok(Math.abs(widths[index]-chart.barW*row.share/100)<1e-3,row.label));
    const widthByOperator=Object.fromEntries(chart.rows.map((row,index)=>[row.label,widths[index]]));
    assert.ok(widthByOperator.switchMap>widthByOperator.mergeMap*5);
    const mid=compiled.snapshot(.4).barCharts[0];assert.ok(mid.progress>0&&mid.progress<1);
    const expected={map:['map'],'share-replay':['map','share-replay'],'concat-all':['map','share-replay','concat-all']};
    for(const [stop,visible] of Object.entries(expected)) {
      const frame=compiled.snapshot(stopTime(compiled,stop));
      assert.deepEqual(plain(frame.bigStats.filter(stat=>stat.opacity===1).map(stat=>stat.id)),visible,stop);
      assert.deepEqual(plain(frame.bigStats.filter(stat=>stat.opacity>0).map(stat=>stat.id)),visible,stop);
    }
    assert.equal(svgAt(compiled.duration),svgAt(stopTime(compiled,'concat-all')));
    // Elementy mieszczą się w viewBox: wiersze nad statystykami, tekst w szerokości.
    const frame=compiled.snapshot(compiled.duration),bars=frame.barCharts[0];
    const lastRow=bars.rowTop+3*bars.rowStep+bars.barH/2;
    for(const stat of frame.bigStats) {
      assert.ok(stat.y-stat.size/2>lastRow+20,'statystyki pod wykresem');
      assert.ok(stat.y+stat.size*.68+44+20<=frame.height,'opis mieści się w ramce');
      assert.ok(stat.label.length*30*.6<1240/3-20&&stat.note.length*27*.55<1240/3-20,stat.id);
    }
    assert.ok(bars.barX+bars.barW<bars.percentX-120&&bars.percentX<bars.countX-160&&bars.countX<=frame.width-20);
    assert.ok(bars.labelX-'exhaustMap'.length*34*.6>=20);
    assert.doesNotMatch(svgAt(compiled.duration),/NaN|Infinity|data-node=/);
  }
});

test('ograniczony ruch odsłania od razu; snapshoty są deterministyczne',async()=>{
  const {m,compiled}=await fixture();
  const reduced=m.renderer.renderScene(compiled.snapshot(.2),{reducedMotion:true});
  assert.match(reduced,/data-progress="1"/);
  assert.equal(m.renderer.renderScene(compiled.snapshot(1.1)),m.renderer.renderScene(compiled.snapshot(1.1)));
});

test('MANUAL i AUTO zatrzymują się po każdym odsłonięciu; szybkie dalej kończy etap; cofanie i reset',async()=>{
  const {scene,compiled}=await fixture();
  const h=await playbackHarness(),navigation=[];
  const {player,controller}=h.create({scene,controls:{stageOptions:{onNavigate:direction=>navigation.push(direction)}}});
  const times=compiled.stops.map(stop=>stop.time);
  for(const time of times){controller.next();h.advance(3000);assert.ok(Math.abs(player.time-time)<1e-6,`stop ${time}`);assert.equal(player.isPlaying,false);}
  controller.next();h.advance(3000);assert.equal(player.state,'finished');
  controller.next();assert.deepEqual(plain(navigation),[1]);
  controller.previous();assert.ok(Math.abs(player.time-times[3])<1e-6);
  controller.previous();assert.ok(Math.abs(player.time-times[2])<1e-6);
  controller.reset();assert.equal(player.time,0);assert.equal(player.isPlaying,false);
  // Szybkie dalej w trakcie animacji kończy tylko bieżący etap.
  controller.next();h.advance(100);assert.ok(player.isPlaying);controller.next();
  assert.ok(Math.abs(player.time-times[0])<1e-6);assert.equal(player.isPlaying,false);
  // AUTO: po każdym odsłonięciu czeka na pilota, finał wymaga jeszcze jednego dalej.
  // Po ostatnim pytaniu MANUAL przechodzi w AUTO (wspólny kontroler); wymuszamy start od MANUAL.
  controller.setMode('manual');controller.reset();controller.setMode('auto');h.advance(3000);
  assert.ok(Math.abs(player.time-times[0])<1e-6);assert.equal(player.isPlaying,false);
  for(const time of times.slice(1)){controller.next();h.advance(3000);assert.ok(Math.abs(player.time-time)<1e-6);}
  controller.next();h.advance(3000);assert.equal(player.state,'finished');
});

test('HTML, notatki per checkpoint i miejsce przed podsumowaniem',async()=>{
  const {m,compiled}=await fixture();
  const html=fs.readFileSync('index.html','utf8');
  const section=html.match(/<section id="24-rxjs-liczby"[\s\S]*?<\/section>/)[0];
  assert.match(section,/data-animation="24-rxjs-liczby"/);
  assert.match(section,/<h2>RxJS w prawdziwym kodzie — kto wygrywa\?<\/h2>/);
  const notes=[...section.matchAll(/data-checkpoint="([^"]+)"/g)].map(match=>match[1]);
  assert.deepEqual(plain(notes),['ready',...compiled.stops.map(stop=>stop.id),'finished']);
  assert.match(section,/którego z czterech Map używa się najczęściej/);
  assert.match(section,/To co, zagadamy do tych operatorów\?/);
  assert.ok(html.indexOf('id="x03-retry-backoff"')<html.indexOf('id="24-rxjs-liczby"'));
  assert.ok(html.indexOf('id="24-rxjs-liczby"')<html.indexOf('id="25-podsumowanie"'));
  const order=m['scene-config'].mainOrder;
  assert.deepEqual(plain(order.slice(-4)),['x03-retry-backoff','24-rxjs-liczby','25-podsumowanie','pytania']);
});

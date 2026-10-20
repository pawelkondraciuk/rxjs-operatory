import { configureFlatten, configureSubject, configureSubjectInterval, configureSubjectManual, configureInterval, configureHttp, configureLanes, configureShareLate, configureShareReplayLate, configureCatchInside, configureCatchOutside, configureDistinctSwitch, configureDebounceAudit, configureShareReplayOne, configureShareReplayRefCount, configureCombineLatestWithLatestFrom, configureRetryBackoff, configureDefer } from './reference-scenes.js';

// Końcowe ID po rozwinięciu wariantów; otwarcie do tytułu pozostaje w kolejności HTML.
export const mainOrder = [
  // Slajdy techniczne: HTTP (subscribe/next/complete) z kodem źródłowym httpGet (05b-http-kod) i Cold (jedna definicja,
  // trzy wykonania), interval (cold: osobne wykonanie każdego odbiorcy, unsubscribe), Subject (ręczne next i complete), Subject + HTTP, Subject + interval.
  // Potem pytanie o znane operatory, operator, kod myMap, pytanie o share oraz historia share HTTP → share + interval → późny odbiorca.
  '05-zrodla-2','05b-http-kod','04a-dwa-tory','05-zrodla','05-zrodla-5','05-zrodla-3','05-zrodla-4','02-znane-operatory','04-operator','04b-map-kod','03-a-share','04a-dwa-tory-2','04a-dwa-tory-3',
  // Cztery *Map obok siebie, potem distinctUntilChanged przed switchMap.
  '20-sharereplay','20a-sharereplay-interval','20b-sharereplay-refcount','20-sharereplay-2','08-map-strumienie','09-concatmap','10-mergemap','11-switchmap','12-exhaustmap','11a-distinct-switchmap',
  'b04-catcherror','b04-catcherror-2','16-czas-cztery','25-podsumowanie','pytania',
];
export const extraOrder = [
  'x02-combinelatest-withlatestfrom',
  'x03-retry-backoff',
  'x04-defer',
];
export const extraIds = new Set(extraOrder);
const stagedIds = new Set(['20a-sharereplay-interval','20b-sharereplay-refcount','x02-combinelatest-withlatestfrom','x03-retry-backoff','x04-defer','04-operator','04a-dwa-tory-2','04a-dwa-tory-3','05-zrodla','05-zrodla-2','05-zrodla-3','05-zrodla-4','05-zrodla-5','20-sharereplay','20-sharereplay-2']);

// Sceny z finish:hold kończą się ok. 2 s po ostatnim zdarzeniu modelu, żeby AUTO nie stało długo.
const trimmedTails = new Set(['20-sharereplay']);
function trimTail(scene) {
  const times=[...scene.rows.flatMap(r=>[...r.events.map(e=>e.at),
    ...r.spans.filter(p=>!['state','subscription'].includes(p.kind)).map(p=>p.end),...(r.completeAt===undefined?[]:[r.completeAt])]),
    ...(scene.captions||[]).map(([at])=>at)];
  scene.duration=Math.min(scene.duration,Math.max(...times)+2);
}

// Applies AFTER variants are resolved, so a variant never inherits stale stop times.
export function configureScene(scene) {
  const id=scene.rendererId||scene.id;
  if(['09-concatmap','10-mergemap','12-exhaustmap'].includes(id))configureFlatten(scene,{
    '09-concatmap':'concatMap','10-mergemap':'mergeMap','12-exhaustmap':'exhaustMap'}[id]);
  // distinctUntilChanged przed switchMap: A, A, B, B, A → 3 requesty (osobny slajd po switchMap).
  if(id==='11a-distinct-switchmap')configureDistinctSwitch(scene);
  // debounceTime i auditTime (MAIN): dwa potoki z timerami w wierszach operatorów.
  if(scene.id==='16-czas-cztery')configureDebounceAudit(scene);
  // Oba warianty catchError w wyglądzie MAIN switchMap: wewnątrz (-2) i na zewnątrz (za switchMap).
  if(id==='b04-catcherror')(scene.catchInside?configureCatchInside:configureCatchOutside)(scene);
  if(id==='05-zrodla'&&scene.sourceExample===0)configureInterval(scene);
  if(id==='05-zrodla'&&scene.sourceExample===1)configureHttp(scene);
  if(id==='04a-dwa-tory')configureLanes(scene);
  if(id==='05-zrodla'&&scene.sourceExample===2)configureSubject(scene);
  // Subject + interval: odbiorcy odchodzą, connection z interval zostaje (scena na żywo z akcjami).
  if(id==='05-zrodla'&&scene.sourceExample===3)configureSubjectInterval(scene);
  // Subject — ręczna emisja: next(1), next(2) i complete do A/B; po interval i przed Subject + HTTP.
  if(id==='05-zrodla'&&scene.sourceExample===4)configureSubjectManual(scene);
  // shareReplay(1) na interval (MAIN, przed shareReplay z refCount: true): A i B odchodzą, interval pracuje dalej.
  if(id==='20a-sharereplay-interval')configureShareReplayOne(scene);
  // shareReplay z refCount: true na interval: pauza animacji i B z bufora, A/B odchodzą (reset bufora), C od zera (#2).
  if(id==='20b-sharereplay-refcount')configureShareReplayRefCount(scene);
  // combineLatest: dwa źródła, dwa sloty ostatnich wartości i jeden strumień wynikowy (EXTRAS).
  if(id==='x02-combinelatest-withlatestfrom')configureCombineLatestWithLatestFrom(scene);
  // retry({ count, delay }) z trzema ponowieniami i exponential backoff 1/2/4 s (EXTRAS).
  if(id==='x03-retry-backoff')configureRetryBackoff(scene);
  // defer: from(loadUser()) wywołuje funkcję od razu, defer(() => loadUser()) — przy każdej subskrypcji (EXTRAS).
  if(id==='x04-defer')configureDefer(scene);
  // Kolorowanie składni kodu na wszystkich slajdach (wspólny renderer kodu w playerze); scena może je wyłączyć (codeSyntax:false).
  scene.codeSyntax??=true;
  scene.group=extraIds.has(scene.id)?'bonus':'main';
  if(trimmedTails.has(id))trimTail(scene);
  if(id==='20-sharereplay'){
    scene.playerLayout='expanded';
    scene.metrics=[{label:'requesty',count:'started'}];
  }
  // Oba warianty 20 mają wygląd torów: share (HTTP GET → share() → A/B) i shareReplay z kieszenią bufora.
  if(scene.id==='20-sharereplay')configureShareLate(scene);
  if(scene.id==='20-sharereplay-2')configureShareReplayLate(scene);
  if(scene.flattenLayout||scene.playback?.stops){
    if(stagedIds.has(scene.id))scene.playback={...scene.playback,controller:'stages'};
    return scene;
  }
  const question={
    '20-sharereplay':10,
  }[id];
  const first={
      '20-sharereplay':{id:'first',modelTime:6,caption:'Pierwsze HTTP wyemitowało odpowiedź i zakończyło się.'},
    }[id];
  if(question!==undefined)scene.playback={entry:'manual',finish:'hold',afterLastManualStop:'start-auto',stops:[
    ...(first?[first]:[]),
    // Pytanie nie może pokazywać odpowiedzi. 20: tuż przed wylotem wartości z bufora shareReplay.
    {id:'question',...({
      '20-sharereplay':{event:{type:'connected',edge:'hub-receiver1'},offset:-.001},
    }[id]||{modelTime:question}),caption:{
      '20-sharereplay':'B dołączył po complete. Nowe HTTP czy zachowany bufor?',
    }[id]},
  ]};
  else scene.playback={entry:'auto',finish:scene.group==='bonus'?'loop':'hold'};
  if(stagedIds.has(scene.id))scene.playback={...scene.playback,controller:'stages'};
  return scene;
}

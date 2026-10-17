import { configureFlatten, configureConcurrency, flattenGraph, configureFlattenPlayback, configureSubject, configureSubjectInterval, configureSubjectManual, configureInterval, configureHttp, configureLanes, configureShareLate, configureShareReplayLate, configureCatchInside, configureCatchOutside, configureDistinctSwitch, configureDebounceAudit } from './reference-scenes.js';

// Końcowe ID po rozwinięciu wariantów; otwarcie pozostaje w kolejności HTML.
export const mainOrder = [
  // Cold → Subject (ręcznie, HTTP) → share HTTP → Subject + interval → share + interval → późny odbiorca share/shareReplay.
  '05-zrodla-2','05-zrodla','04-operator','04a-dwa-tory','05-zrodla-5','05-zrodla-3','04a-dwa-tory-2','05-zrodla-4','04a-dwa-tory-3',
  // Cztery *Map obok siebie, potem distinctUntilChanged przed switchMap.
  '20-sharereplay','20-sharereplay-2','08-map-strumienie','09-concatmap','10-mergemap','11-switchmap','12-exhaustmap','11a-distinct-switchmap',
  'b04-catcherror-2','b04-catcherror','16-czas-cztery','25-podsumowanie','pytania',
];
export const extraOrder = [
  // Dogrywka przy braku pytań: trzy slajdy, około 4–6 minut.
  '12a-complete','12a-complete-2','13-limit',
  // Drugi profil distinctUntilChanged (42/43, bez anulowań) — duplikat 11a w MAIN, zachowany jako materiał do pytań.
  '14-distinct',
  '06-subskrypcja','b01-defer','b02-first-take','b02-first-take-2','b05-finalize','b05-finalize-2','b05-finalize-3',
  '06a-cold-hot-2','19-share','18-async','18-async-2','21-share-miejsce','21-share-miejsce-2',
  '21a-share-pozycja','21a-share-pozycja-2','22-refcount','22-refcount-2',
  '15-debounce-audit','16-czas-cztery-2','16-czas-cztery-3','16-czas-cztery-4','b03-buffertime','17-latest',
  'b06-forkjoin','b07-zip','b08-merge','b09-pairwise',
  '23-angular-alias','24-signals','26-resolver-problem','27-resolver-microtask','28-resolver-batch',
];
export const extraIds = new Set(extraOrder);
const stagedIds = new Set(['04-operator','04a-dwa-tory-3','05-zrodla','05-zrodla-2','05-zrodla-3','05-zrodla-4','05-zrodla-5','20-sharereplay','20-sharereplay-2']);

// Sceny z finish:hold kończą się ok. 2 s po ostatnim zdarzeniu modelu, żeby AUTO nie stało długo
// przed FINISHED (każde „dalej” w bezruchu tylko kończy animację). 22-refcount celowo pokazuje ciszę.
const trimmedTails = new Set(['06-subskrypcja','12a-complete','13-limit','18-async','20-sharereplay']);
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
  if(id==='12a-complete'){
    scene.jobs=scene.jobs.map(job=>({...job,dur:6}));
    scene.rows=scene.rows.map(row=>({...row,spans:row.spans.map(span=>['work','cancel'].includes(span.kind)?{...span,duration:6}:span)}));
    scene.graph=flattenGraph;configureFlattenPlayback(scene);
  }
  if(id==='13-limit')configureConcurrency(scene);
  // distinctUntilChanged przed switchMap: A, A, B, B, A → 3 requesty (osobny slajd po switchMap).
  if(id==='11a-distinct-switchmap')configureDistinctSwitch(scene);
  // 14-distinct w wyglądzie switchMap: 42, 42, 43, 43, 42 → 3 requesty, powtórzenia gasną przed switchMap.
  if(id==='14-distinct')configureDistinctSwitch(scene);
  // debounceTime i auditTime (MAIN): dwa potoki z timerami w wierszach operatorów; warianty -2…-4 w EXTRAS bez zmian.
  if(scene.id==='16-czas-cztery')configureDebounceAudit(scene);
  // Oba warianty catchError w wyglądzie MAIN switchMap: wewnątrz (-2) i na zewnątrz (za switchMap).
  if(id==='b04-catcherror')(scene.catchInside?configureCatchInside:configureCatchOutside)(scene);
  if(id==='05-zrodla'&&scene.sourceExample===0)configureInterval(scene);
  if(id==='05-zrodla'&&scene.sourceExample===1)configureHttp(scene);
  if(id==='04a-dwa-tory')configureLanes(scene);
  if(id==='05-zrodla'&&scene.sourceExample===2)configureSubject(scene);
  // Subject + interval: odbiorcy odchodzą, connection z interval zostaje (scena na żywo z akcjami).
  if(id==='05-zrodla'&&scene.sourceExample===3)configureSubjectInterval(scene);
  // Subject — ręczna emisja: jedno subject$.next(user) do tych samych pól A/B/C, przed Subject + HTTP.
  if(id==='05-zrodla'&&scene.sourceExample===4)configureSubjectManual(scene);
  scene.group=extraIds.has(scene.id)?'bonus':'main';
  if(trimmedTails.has(id))trimTail(scene);
  if(id==='20-sharereplay'){
    scene.playerLayout='expanded';
    scene.metrics=[{label:'requesty',count:'started'}];
  }
  // Oba warianty 20 mają wygląd torów: share (HTTP GET → share() → A/B) i shareReplay z kieszenią bufora.
  if(scene.id==='20-sharereplay')configureShareLate(scene);
  if(scene.id==='20-sharereplay-2')configureShareReplayLate(scene);
  // Zachowany hot w EXTRAS: płaskie kafelki jak w 04a i 08–12.
  if(id==='06a-cold-hot-2')scene.playerClass=[scene.playerClass,'rx-flat-tiles'].filter(Boolean).join(' ');
  if(scene.flattenLayout||scene.playback?.stops){
    if(stagedIds.has(scene.id))scene.playback={...scene.playback,controller:'stages'};
    return scene;
  }
  const question={
    '06-subskrypcja':6,'06a-cold-hot-2':6,'18-async':1,
    '20-sharereplay':10,'22-refcount':10,
    '15-debounce-audit':5,
  }[id];
  const first={
      '06a-cold-hot-2':{id:'first',modelTime:0,caption:'A subskrybuje. B jeszcze nie słucha.'},
      '20-sharereplay':{id:'first',modelTime:6,caption:'Pierwsze HTTP wyemitowało odpowiedź i zakończyło się.'},
      '22-refcount':{id:'first',modelTime:2,caption:'Dwa widoki korzystają z aktywnego timera.'},
    }[id];
  if(question!==undefined)scene.playback={entry:'manual',finish:'hold',afterLastManualStop:'start-auto',stops:[
    ...(first?[first]:[]),
    // Pytanie nie może pokazywać odpowiedzi. 20: tuż przed wylotem wartości z bufora shareReplay.
    {id:'question',...({
      '20-sharereplay':{event:{type:'connected',edge:'hub-receiver1'},offset:-.001},
    }[id]||{modelTime:question}),caption:{
      '06-subskrypcja':'Dopiero subscribe uruchomiło HTTP. Deklaracja nie wykonała requestu.',
      '06a-cold-hot-2':'B dołączył. Czy dostanie wcześniejsze wartości, czy kolejne emisje wspólnego timera?',
      '18-async':'A i B subskrybują ten sam user$. Ile requestów uruchomili?',
      '20-sharereplay':'B dołączył po complete. Nowe HTTP czy zachowany bufor?',
      '22-refcount':'Odbiorców: 0. Czy źródło nadal pracuje?',
      '15-debounce-audit':'Throttle: A. Sample: C. Audit: D. Dlaczego debounce nadal czeka?',
    }[id]},
  ]};
  else scene.playback={entry:'auto',finish:scene.group==='bonus'?'loop':'hold'};
  if(stagedIds.has(scene.id))scene.playback={...scene.playback,controller:'stages'};
  return scene;
}

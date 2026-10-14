import { configureFlatten, configureConcurrency, flattenGraph, configureFlattenPlayback, configureSubject, configureTimers, configureHttp, configureLanes } from './reference-scenes.js';
import { configureCatch } from './catch-scenes.js';

// Końcowe ID po rozwinięciu wariantów; otwarcie pozostaje w kolejności HTML.
export const mainOrder = [
  '05-zrodla-2','05-zrodla','04-operator','04a-dwa-tory','04a-dwa-tory-2','04a-dwa-tory-3','06a-cold-hot','07-hot-cold','05-zrodla-3','07-hot-cold-2',
  '20-sharereplay','20-sharereplay-2','08-map-strumienie','09-concatmap','10-mergemap','11-switchmap','12-exhaustmap',
  'b04-catcherror','b04-catcherror-2','14-distinct','16-czas-cztery','25-podsumowanie','pytania',
];
export const extraOrder = [
  // Dogrywka przy braku pytań: trzy slajdy, około 4–6 minut.
  '12a-complete','12a-complete-2','13-limit',
  '06-subskrypcja','b01-defer','b02-first-take','b02-first-take-2','b05-finalize','b05-finalize-2','b05-finalize-3',
  '06a-cold-hot-2','19-share','18-async','18-async-2','21-share-miejsce','21-share-miejsce-2',
  '21a-share-pozycja','21a-share-pozycja-2','22-refcount','22-refcount-2',
  '15-debounce-audit','16-czas-cztery-2','16-czas-cztery-3','16-czas-cztery-4','b03-buffertime','17-latest',
  'b06-forkjoin','b07-zip','b08-merge','b09-pairwise',
  '23-angular-alias','24-signals','26-resolver-problem','27-resolver-microtask','28-resolver-batch',
];
export const extraIds = new Set(extraOrder);
const stagedIds = new Set(['04-operator','05-zrodla','05-zrodla-2','05-zrodla-3','06a-cold-hot',
  '07-hot-cold','07-hot-cold-2','20-sharereplay','20-sharereplay-2']);

// Sceny z finish:hold kończą się ok. 2 s po ostatnim zdarzeniu modelu, żeby AUTO nie stało długo
// przed FINISHED (każde „dalej” w bezruchu tylko kończy animację). 22-refcount celowo pokazuje ciszę.
const trimmedTails = new Set(['06-subskrypcja','07-hot-cold','12a-complete','13-limit','14-distinct','18-async','20-sharereplay']);
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
  if(id==='b04-catcherror')configureCatch(scene);
  if(id==='05-zrodla'&&scene.sourceExample===0)configureTimers(scene);
  if(id==='05-zrodla'&&scene.sourceExample===1)configureHttp(scene);
  if(id==='04a-dwa-tory')configureLanes(scene);
  if(id==='05-zrodla'&&scene.sourceExample===2)configureSubject(scene);
  scene.group=extraIds.has(scene.id)?'bonus':'main';
  if(trimmedTails.has(id))trimTail(scene);
  if(id==='07-hot-cold'||id==='20-sharereplay'||id==='06a-cold-hot'&&scene.comparisonMode!=='shared'){
    scene.playerLayout='expanded';
    scene.metrics=[{label:id==='06a-cold-hot'?'wykonania':'requesty',count:'started'}];
  }
  if(scene.flattenLayout||scene.playback?.stops){
    if(stagedIds.has(scene.id))scene.playback={...scene.playback,controller:'stages'};
    return scene;
  }
  if(id==='16-czas-cztery'&&scene.group==='main'){
    scene.playerLayout='expanded';
    scene.playback={entry:'manual',finish:'hold',afterLastManualStop:'start-auto',stops:[
      {id:'question',modelTime:3.9,caption:'Wejście nadal emituje. Który operator pokaże wynik przed ciszą?'},
      {id:'audit',event:{type:'deliver-next',edge:'op2-sink2',value:'D'},offset:.35,caption:'auditTime wyemitował D na końcu okna. debounceTime nadal czeka'},
      {id:'debounce',event:{type:'deliver-next',edge:'op1-sink1',value:'G'},offset:.35,caption:'Po 3,5 s ciszy debounceTime wyemitował G. Nowe H właśnie wychodzi ze źródła i znów zaczyna odliczanie'},
    ]};
    return scene;
  }
  const question={
    '06-subskrypcja':6,'06a-cold-hot':6,'07-hot-cold':2,'18-async':1,
    '20-sharereplay':10,'22-refcount':10,
    '14-distinct':5,'15-debounce-audit':5,
  }[id];
  const first={
      '07-hot-cold':{id:'first',modelTime:0,caption:'Pierwszy odbiorca subskrybuje.'},
      '06a-cold-hot':{id:'first',modelTime:0,caption:'A subskrybuje. B jeszcze nie słucha.'},
      '20-sharereplay':{id:'first',modelTime:6,caption:'Pierwsze HTTP wyemitowało odpowiedź i zakończyło się.'},
      '22-refcount':{id:'first',modelTime:2,caption:'Dwa widoki korzystają z aktywnego timera.'},
    }[id];
  if(question!==undefined)scene.playback={entry:'manual',finish:'hold',afterLastManualStop:'start-auto',stops:[
    ...(first?[first]:[]),
    // Pytanie nie może pokazywać odpowiedzi. 20: tuż przed wylotem wartości z bufora shareReplay.
    // 14: tuż przed dotarciem drugiego A do operatorów, zanim widać drugi request i liczniki.
    {id:'question',...({
      '20-sharereplay':{event:{type:'connected',edge:'hub-receiver1'},offset:-.001},
      '14-distinct':{event:{type:'deliver-next',edge:'source-distinct',value:'A',logicalAt:4},offset:-.001},
    }[id]||{modelTime:question}),caption:{
      '06-subskrypcja':'Dopiero subscribe uruchomiło HTTP. Deklaracja nie wykonała requestu.',
      '06a-cold-hot':'B dołączył. Czy dostanie własny timer, czy wspólne kolejne wartości?',
      '07-hot-cold':'Obaj odbiorcy już subskrybują. Ile wykonań HTTP?',
      '18-async':'A i B subskrybują ten sam user$. Ile requestów uruchomili?',
      '20-sharereplay':'B dołączył po complete. Nowe HTTP czy zachowany bufor?',
      '22-refcount':'Odbiorców: 0. Czy źródło nadal pracuje?',
      '14-distinct':'Znowu A. Czy powtórzone ID uruchomi nowe HTTP w obu potokach?',
      '15-debounce-audit':'Throttle: A. Sample: C. Audit: D. Dlaczego debounce nadal czeka?',
    }[id]},
  ]};
  else scene.playback={entry:'auto',finish:scene.group==='bonus'?'loop':'hold'};
  if(stagedIds.has(scene.id))scene.playback={...scene.playback,controller:'stages'};
  return scene;
}

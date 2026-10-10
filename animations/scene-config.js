import { configureFlatten, configureConcurrency, flattenGraph } from './reference-scenes.js';
import { configureCatch } from './catch-scenes.js';

export const extraIds = new Set(['b01-defer','b02-first-take','b03-buffertime','b05-finalize','b06-forkjoin','b07-zip','b08-merge','b09-pairwise',
  '12a-complete','13-limit','16-czas-cztery','17-latest','19-share','21-share-miejsce','21a-share-pozycja','23-angular-alias','24-signals']);

// Applies AFTER variants are resolved, so a variant never inherits stale stop times.
export function configureScene(scene) {
  const id=scene.rendererId||scene.id;
  if(['09-concatmap','10-mergemap','12-exhaustmap'].includes(id))configureFlatten(scene,{
    '09-concatmap':'concatMap','10-mergemap':'mergeMap','12-exhaustmap':'exhaustMap'}[id]);
  if(id==='12a-complete')scene.graph=flattenGraph;
  if(id==='13-limit')configureConcurrency(scene);
  if(id==='b04-catcherror')configureCatch(scene);
  scene.group=extraIds.has(id)?'bonus':'main';
  if(scene.playback?.stops)return scene;
  const question={
    '05-zrodla':scene.sourceExample===2?12:scene.sourceExample===1?1:2,
    '06-subskrypcja':6,'06a-cold-hot':6,'07-hot-cold':3,'18-async':1,
    '20-sharereplay':10,'22-refcount':10,
    '14-distinct':5,'15-debounce-audit':5,
  }[id];
  const first={'05-zrodla':scene.sourceExample===0?{id:'subscribe',event:{type:'connected',edge:'source-sink'},caption:'Subscribe połączyło źródło i odbiorcę. Teraz czekamy na pierwszy next.'}:null,
      '07-hot-cold':{id:'first',modelTime:1,caption:'Pierwszy odbiorca subskrybuje.'},
      '06a-cold-hot':{id:'first',modelTime:0,caption:'A subskrybuje. B jeszcze nie słucha.'},
      '20-sharereplay':{id:'first',modelTime:6,caption:'Pierwsze HTTP wyemitowało odpowiedź i zakończyło się.'},
      '22-refcount':{id:'first',modelTime:2,caption:'Dwa widoki korzystają z aktywnego timera.'},
    }[id];
  if(question!==undefined)scene.playback={entry:'manual',finish:'hold',afterLastManualStop:'start-auto',stops:[
    ...(first?[first]:[]),
    {id:'question',modelTime:question,caption:{
      '05-zrodla':scene.sourceExample===2?'B dotarło. Wcześniejsze A nie wraca.':'Pierwszy krok gotowy. Dalej uruchamia resztę pokazu.',
      '06-subskrypcja':'Dopiero subscribe uruchomiło HTTP. Deklaracja nie wykonała requestu.',
      '06a-cold-hot':'B dołączył. Czy dostanie własny timer, czy wspólne kolejne wartości?',
      '07-hot-cold':'Obaj odbiorcy już subskrybują. Ile wykonań HTTP?',
      '18-async':'A i B subskrybują ten sam user$. Ile requestów uruchomili?',
      '20-sharereplay':'B dołączył po complete. Nowe HTTP czy zachowany bufor?',
      '22-refcount':'Odbiorców: 0. Czy źródło nadal pracuje?',
      '14-distinct':'Powtórzone ID: czy trzeba uruchomić nowe HTTP?',
      '15-debounce-audit':'Throttle: A. Sample: C. Audit: D. Dlaczego debounce nadal czeka?',
    }[id]},
  ]};
  else scene.playback={entry:'auto',finish:scene.group==='bonus'?'loop':'hold'};
  return scene;
}

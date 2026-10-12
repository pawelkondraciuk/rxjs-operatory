import { configureFlatten, flattenGraph } from './reference-scenes.js';

// Adapter rodziny przygotowuje jawne dane. Silnik i renderer nie znają operatora.
const value = (at, v, color = 'a', execution) => ({at, value:v, color, kind:'value', ...(execution ? {execution} : {})});
const row = (label, events = [], spans = [], extra = {}) => ({label,events,spans,...extra});
const span = (start,end,label,kind='work',duration=end-start) => ({start,end,label,kind,duration});
const counts = [{label:'uruchomione',count:'started'},{label:'aktywne',count:'active'}];
const stages = stops => ({controller:'stages',entry:'manual',finish:'hold',afterLastManualStop:'start-auto',stops});
// Tempo jak w obecnych slajdach (domyślny planFlow); stałe służą tylko przesunięciom postojów i czasowi HTTP.
const timing = {terminal:.8,http:1.5};
// Postój po dotarciu wartości czeka, aż jej wiersz w panelu prac skończy fade-in.
const rowFade = .35;
function basic(mode) {
  const scene = {id:'prototype-'+mode,title:mode+' — te same A/B/C/D'};
  configureFlatten(scene,mode);
  scene.rows.at(-1).events = scene.rows.at(-1).events.map(e=>({...e,execution:e.value[0]}));
  // Postoje po dotarciu wartości czekają na fade-in wiersza kolejki. switchMap pyta, zanim A zostanie anulowane,
  // a exhaustMap, zanim pokaże odpowiedź „pominięte”.
  Object.assign(scene,{group:'qa',graph:flattenGraph,metrics:counts,
    playback:stages(scene.playback.stops),
    notes:{
      concatMap:'B/C/D czekają jako wartości. Projekcja tworzy inner dopiero po complete poprzednika.',
      switchMap:'Nowe wejście odsubskrybowuje poprzedni inner przed uruchomieniem następnego. ABORT dotyczy klienta.',
      mergeMap:'Każda wartość od razu uruchamia własny inner. Prace trwają równolegle, wyniki mogą się przeplatać.',
      exhaustMap:'Gdy A$ trwa, B i C są pominięte i nie tworzą inner. D przychodzi po complete A$ i uruchamia D$.',
    }[mode]});
  return scene;
}

// Parametry adaptera opisują rodzinę; gotowy graf nie wymaga wyjątków w rendererze.
function httpExample(id, mode, catchScope, {cancelBeforeError=false,empty=false}={}) {
  const input = (mode==='concatMap'?[.8,1.25,1.7]:cancelBeforeError?[.8,1.25,1.9]:[.8,1.25,4])
    .map((at,i)=>({at,value:'ABC'[i],color:['a','b','c'][i],dur:timing.http}));
  let available=0, failedAt=null;
  const jobs = input.map((v,i)=>{
    const start = mode==='concatMap'?Math.max(v.at,available):v.at;
    const errorAt = v.value==='B'?start+v.dur:null;
    const cancelled = mode==='switchMap' && input[i+1] && input[i+1].at<start+v.dur;
    const recovered = errorAt!==null && catchScope==='inner' && !cancelled;
    const end = cancelled?input[i+1].at:recovered?errorAt+(empty ? .3 : .6):start+v.dur;
    const errored = errorAt!==null && !cancelled && !recovered;
    const job = {...v,start,end,cancelled:Boolean(cancelled),recovered,errored,errorAt};
    available=end;
    if(errored)failedAt=end;
    return job;
  }).filter(j=>failedAt===null||j.start<=failedAt);
  // Przy błędzie outer w concatMap C pozostaje porzuconą wartością, bez inner C.
  const discarded = mode==='concatMap' && catchScope!=='inner';
  const activeJobs = discarded?jobs.filter(j=>j.value!=='C'):jobs;
  const result = [];
  const rows = [row('wejście',input.map(v=>value(v.at,v.value,v.color)),[],{completeAt:mode==='concatMap'?6.1:4.2})];
  for (const job of activeJobs) {
    const emissions = job.cancelled||job.errored?[]:job.recovered?(empty?[]:[value(job.errorAt+.3,'fallback B',job.color,job.value)]):
      [value(job.end-.2,job.value,job.color,job.value)];
    result.push(...emissions);
    rows.push(row(job.value+'$',emissions,[
      ...(job.start>job.at?[span(job.at,job.start,job.value,'queue')]:[]),
      span(job.start,job.end,job.value,job.cancelled?'cancel':job.errored?'error':'work',job.dur),
    ],job.cancelled||job.errored?{}:{completeAt:job.end}));
  }
  const b = activeJobs.find(j=>j.value==='B');
  const outerError = b.errored && catchScope==='outer';
  // Nieobsłużony error odsubskrybowuje źródło: nie dochodzi ono do własnego complete.
  if(b.errored)delete rows[0].completeAt;
  if(outerError)result.push(value(b.end+.3,'fallback','b'));
  result.sort((a,b)=>a.at-b.at);
  const completeAt = outerError?b.end+.6:catchScope==='none'&&b.errored?undefined:
    Math.max(rows[0].completeAt,...activeJobs.map(j=>j.end));
  rows.push(row('wynik',result,[],completeAt===undefined?{}:{completeAt}));
  const timeline = [
    {at:b.errorAt,type:'http-error',execution:'B',caption:'HTTP B zgłasza błąd.'},
    ...(catchScope==='inner'?[
      {at:b.errorAt,type:'execution-focus',execution:'B'},
      {at:b.errorAt+.15,type:'catch-handle',execution:'B',caption:'catchError przechwytuje błąd HTTP wewnątrz inner.'},
      ...(!empty?[{at:b.errorAt+.3,type:'fallback-next',execution:'B',value:'fallback B',caption:'Fallback B jest wartością; inner zakończy się complete.'}]:[]),
      {at:b.end+.1,type:'execution-focus',execution:null},
    ]:catchScope==='outer'?[{at:b.errorAt+.15,type:'catch-handle',node:'catch',caption:'Zewnętrzny catchError zastępuje zakończony błędem łańcuch.'}]:[]),
  ];
  const resultEnd = catchScope==='none'&&b.errored?{at:b.end,kind:'error'}:
    {at:completeAt,kind:'complete'};
  const scene = {
    id,title:cancelBeforeError?'switchMap — anulowanie B przed błędem':mode+' + '+(catchScope==='inner'?(empty?'catchError → EMPTY':'catchError wewnątrz'):
      catchScope==='outer'?'catchError na zewnątrz':'bez catchError'),
    group:'qa',playerLayout:'expanded',operatorName:mode,http:true,catchScope,jobs:activeJobs,discardedSlot:discarded,rows,
    duration:Math.max(completeAt||b.end,...input.map(v=>v.at),b.errorAt+.7)+1,
    graph:flattenGraph,metrics:counts,timeline,resultEnd,
    sourceEnd:b.errored?{at:b.end,kind:'unsubscribe'}:{at:rows[0].completeAt,kind:'complete'},
    innerResultEnd:{at:b.end,kind:'error'},
    code:catchScope==='inner'?`source$.pipe(${mode}(id => http$(id).pipe(catchError(() => ${empty?'EMPTY':"of('fallback B')"}))))`:
      catchScope==='outer'?`source$.pipe(${mode}(http$), catchError(() => of('fallback')))`:`source$.pipe(${mode}(http$))`,
    captions:[[0,catchScope==='inner'?'Każda wartość uruchamia HTTP z własnym catchError. Na razie nic nie działa.':'Każda wartość uruchamia HTTP. Na razie nic nie działa.'],
      [input[0].at,'A uruchamia pierwszą subskrypcję inner.'],
      [input[1].at,mode==='concatMap'?'B oczekuje jako wartość; nie uruchamia HTTP.':'B odsubskrybowuje A przed uruchomieniem swojego HTTP.'],
      [b.errorAt,cancelBeforeError?'B zostało anulowane: jego późny błąd i fallback są zablokowane.':
        catchScope==='inner'?'Błąd HTTP jest obsługiwany wewnątrz B$.':'Błąd B kończy pierwotny łańcuch.'],
      [completeAt||b.end,cancelBeforeError?'B anulowane przed błędem: bez fallbacku. Wynik C, complete.':outerError?'A, fallback, complete. Oczekujące C porzucone.':
        catchScope==='none'?'Error dociera do odbiorcy. C nie tworzy inner.':empty?'B$ zakończyło się bez wartości. C dało wynik; odbiorca complete.':'Obsłużony HTTP error nie staje się terminalnym błędem inner.']],
    notes:catchScope==='inner'?'Pytanie: czy błąd HTTP B kończy całe source$? Rozdziel HTTP error, catchError, fallback i complete B$.':
      'Pytanie: co stanie się z oczekującym C? of(fallback) zastępuje cały pierwotny łańcuch i kończy wynik.',
  };
  scene.playback = stages([
    {id:'subscribe',modelTime:.3,caption:'Odbiorca subskrybuje główny potok.'},
    {id:'active-a',event:{type:'inner-subscribe',node:'inner0'},offset:.05,caption:'A$ jest aktywne.'},
    {id:'input-b',event:{type:'deliver-next',edge:'source-op',value:'B'},...(mode==='concatMap'?{offset:rowFade}:{}),caption:mode==='concatMap'?'B czeka jako wartość.':'B dotarło, A jeszcze widać przed anulowaniem.'},
    ...(!cancelBeforeError?[{id:'http-error',event:{type:'http-error',execution:'B'},caption:'HTTP B zgłosiło błąd.'},
      ...(catchScope==='inner'?[{id:'handled',event:{type:'catch-handle',execution:'B'},caption:'Błąd przechwycony wewnątrz inner.'},
        ...(!empty?[{id:'fallback',event:{type:'deliver-next',edge:'op-observer',value:'fallback B'},caption:'Fallback B dotarł do odbiorcy; B$ jeszcze trwa.'}]:[]),
        {id:'inner-complete',event:{type:'stream-complete',edge:'inner1-op'},offset:.4,caption:empty?'B$ complete bez emisji.':'B$ complete po fallbacku; źródło nadal działa.'}]:catchScope==='outer'?[
        {id:'handled',event:{type:'catch-handle',node:'catch'},caption:'Zewnętrzny catchError zastępuje pierwotny łańcuch.'},
        {id:'fallback',event:{type:'deliver-next',edge:'catch-observer',value:'fallback'},caption:'Odbiorca ma fallback, C nie tworzy inner.'},
        {id:'result-complete',event:{type:'stream-complete',edge:'catch-observer'},offset:timing.terminal+.01,caption:'Wynik complete; C porzucone.'}
      ]:[])]:[]),
  ]);
  const resultCaption=scene.captions.pop()[1];
  scene.timeline.push({type:'result-summary',event:{type:resultEnd.kind==='error'?'stream-error':'stream-complete',edge:outerError?'catch-observer':'op-observer'},offset:timing.terminal+.01,caption:resultCaption});
  if(discarded) {
    const oldGraph=scene.graph;
    scene.graph=s=>{
      const g=oldGraph(s);
      g.nodes.push({id:'queued-c',panel:'jobs',slot:activeJobs.length,workRow:true,x:620,y:300,w:488,h:42,label:'C (wartość)',color:'muted',dropped:true,
        createdBy:{edge:'source-op',value:'C'},detail:t=>t<b.end?'w kolejce':'porzucona'});
      g.timeline.push({at:b.end,type:'queue-discard',node:'op',value:'C',caption:'Kolejka C zostaje porzucona.'});
      return g;
    };
  }
  return scene;
}

export const prototypeScenes = [
  basic('concatMap'),basic('switchMap'),basic('mergeMap'),basic('exhaustMap'),
  httpExample('prototype-switch-catch','switchMap','inner'),
  httpExample('prototype-concat-catch-inner','concatMap','inner'),
  httpExample('prototype-concat-catch-outer','concatMap','outer'),
  httpExample('prototype-cancel-before-error','switchMap','inner',{cancelBeforeError:true}),
  httpExample('prototype-uncaught-error','switchMap','none'),
  httpExample('prototype-empty-recovery','switchMap','inner',{empty:true}),
];

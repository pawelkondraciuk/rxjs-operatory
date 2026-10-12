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
// Układ prototypów: trzy kolumny. Pod źródłem EMISJE, pod wyśrodkowanym operatorem PRACE WEWNĘTRZNE,
// pod odbiorcą ODBIÓR. Panele mają odstęp od kafelków i od dołu; wiersze zajmują stałe sloty na całej wysokości.
const frame = {height:400,tileY:46,tileH:60,panelY:112,panelBottom:372,panelW:520,sideW:200,sourceX:140,opX:620,observerX:1100,catchX:860};

function prototypeGraph(scene) {
  const graph = flattenGraph(scene);
  const outerCatch = scene.catchScope === 'outer';
  const opX = frame.opX;
  // Panele są bez napisów; to, że praca jest HTTP, mówi podpis na dole.
  const slots = scene.jobs.length + (scene.discardedSlot ? 1 : 0);
  const rowsTop = frame.panelY + 16, rowsBottom = frame.panelBottom - 16, gap = 16;
  // Stała siatka czterech slotów od góry: mniej prac układa się jedna pod drugą, bez rozciągania odstępów.
  const grid = Math.max(4,slots), rowHeight = (rowsBottom-rowsTop-(grid-1)*gap)/grid, rowStep = rowHeight+gap;
  Object.assign(graph,{height:frame.height,queue:null,illustratedWork:true});
  const tile = {y:frame.tileY,h:frame.tileH};
  graph.nodes.forEach(n => {
    // Etykieta źródła jak w kodzie przykładu (source$ albo id$).
    if (n.id === 'source') Object.assign(n,tile,{x:frame.sourceX,w:180,label:scene.code.split('.')[0],statusInside:true});
    if (n.id === 'op') Object.assign(n,tile,{x:opX,w:220});
    if (n.id === 'observer') Object.assign(n,tile,{x:frame.observerX,w:180,statusInside:true});
    if (!n.workRow) return;
    // Każda wartość ma własny slot: „B (wartość)” w kolejce, potem B$ w tym samym miejscu.
    const [, kind, index] = /^(queued|inner|ignored)(\d+)$/.exec(n.id) || [];
    if (!kind) return;
    const job = scene.jobs[Number(index)];
    Object.assign(n,{panel:'jobs',slot:Number(index),execution:job.value});
    if (kind === 'queued' || kind === 'ignored') delete n.instant;
  });
  // Emisje źródła po kolei w jednej kolumnie, odbiór po kolei w dwóch kolumnach (kolejność dotarcia).
  const lines = {y:rowsTop+rowHeight/2,w:frame.sideW-24,lines:4,lineStep:rowStep};
  graph.trays = [{anchor:'source',x:frame.sourceX,columns:1,...lines},{anchor:'observer',x:frame.observerX,columns:2,...lines}];
  const resultRow = scene.rows.at(-1);
  const source = graph.edges.find(e => e.from === 'source');
  source.logicalEnd = scene.sourceEnd || {at:scene.rows[0].completeAt,kind:'complete'};
  const output = graph.edges.find(e => e.from === 'op' && e.to === 'observer');
  output.logicalEnd = scene.resultEnd || {at:resultRow.completeAt,kind:'complete'};
  if (outerCatch) {
    graph.nodes.push({id:'catch',...tile,x:frame.catchX,w:170,label:'catchError',color:'op',ready:true});
    output.from = 'catch';
    output.logicalEnd = {at:resultRow.completeAt,kind:'complete'};
    graph.edges.push({from:'op',to:'catch',events:resultRow.events.filter(e=>e.value!=='fallback'),
      logicalStart:.3,logicalEnd:scene.innerResultEnd});
  }
  // Indeks pracy jest indeksem wejścia (jak w flattenGraph), także gdy exhaustMap pominął część wartości.
  graph.executions = [...scene.jobs.entries()].filter(([,j])=>!j.ignored).map(([i,j])=>({
    id:j.value,node:'inner'+i,edge:'inner'+i+'-op',panel:'jobs',value:j.value,
    label:j.value+'$',duration:j.dur,handlerLabel:scene.catchScope==='inner'?'catchError':undefined,
  }));
  for (const edge of graph.edges) {
    if (edge.from.startsWith('inner')) {
      const job = scene.jobs[Number(edge.from.slice(5))];
      edge.events = edge.events.map(e=>({...e,execution:job.value}));
      // Wynik inner nie leci widocznie z wiersza: krótki, niewidoczny powrót i emisja z operatora.
      edge.travel = .15;
      edge.logicalEnd = {at:job.end,kind:job.cancelled?'unsubscribe':job.errored?'error':'complete'};
    }
  }
  const panelH = frame.panelBottom-frame.panelY, below = x => ({x,y:frame.tileY+frame.tileH/2});
  const side = x => ({x:x-frame.sideW/2,y:frame.panelY,w:frame.sideW,h:panelH,from:below(x)});
  graph.panels = [
    side(frame.sourceX),
    {id:'jobs',x:opX-frame.panelW/2,y:frame.panelY,w:frame.panelW,h:panelH,from:below(opX),slots,rowsTop,rowStep,rowHeight},
    side(frame.observerX),
  ];
  graph.timeline = [...(graph.timeline||[]),...(scene.timeline||[])];
  return graph;
}

// mergeMap: A i B jak w innych strategiach, ale C pracuje dłużej, a D krócej. Emisje C i D się przeplatają,
// D kończy przed C, więc odbiór dostaje A1 A2 B1 B2 C1 D1 D2 C2.
function overlapTail(scene) {
  const tail = {C:{dur:1.9,offsets:[.65,1.65]},D:{dur:.9,offsets:[.35,.65]}};
  for (const [i,job] of scene.jobs.entries()) {
    const plan = tail[job.value];
    if (!plan) continue;
    Object.assign(job,{dur:plan.dur,end:job.start+plan.dur});
    Object.assign(scene.rows[i+1],{
      events:plan.offsets.map((offset,k)=>value(job.start+offset,job.value+(k+1),job.color)),
      spans:[span(job.start,job.end,job.value,'work',plan.dur)],completeAt:job.end});
  }
  const end = Math.max(...scene.jobs.map(j=>j.end));
  Object.assign(scene.rows.at(-1),{events:scene.rows.slice(1,-1).flatMap(r=>r.events).sort((a,b)=>a.at-b.at),completeAt:end});
  scene.duration = end+1.2;
  scene.captions.at(-1)[0] = end;
  scene.captions.splice(-1,0,[3.05,'D1 dotarło przed C2: mergeMap nie zachowuje kolejności wejść.']);
}

function basic(mode) {
  const scene = {id:'prototype-'+mode,title:mode+' — te same A/B/C/D'};
  configureFlatten(scene,mode);
  if (mode === 'mergeMap') overlapTail(scene);
  scene.rows.at(-1).events = scene.rows.at(-1).events.map(e=>({...e,execution:e.value[0]}));
  // Postoje po dotarciu wartości czekają na fade-in wiersza kolejki. switchMap pyta, zanim A zostanie anulowane,
  // a exhaustMap, zanim pokaże odpowiedź „pominięte”.
  const settled=stop=>stop.id==='first'||stop.id==='question'&&mode==='concatMap'?{...stop,offset:rowFade}:stop;
  Object.assign(scene,{group:'qa',graph:prototypeGraph,metrics:counts,
    playback:stages(scene.playback.stops.map(settled)),
    notes:{
      concatMap:'B/C/D czekają jako wartości. Projekcja tworzy inner dopiero po complete poprzednika.',
      switchMap:'Nowe wejście odsubskrybowuje poprzedni inner przed uruchomieniem następnego. ABORT dotyczy klienta.',
      mergeMap:'Każda wartość od razu uruchamia własny inner. Prace trwają równolegle, wyniki mogą się przeplatać.',
      exhaustMap:'Gdy A$ trwa, B i C są pominięte i nie tworzą inner. D przychodzi po complete A$ i uruchamia D$.',
    }[mode]});
  const resultCaption=scene.captions.pop()[1];
  scene.timeline=[{type:'result-summary',event:{type:'stream-complete',edge:'op-observer'},offset:timing.terminal+.01,caption:resultCaption}];
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
    group:'qa',operatorName:mode,http:true,catchScope,jobs:activeJobs,discardedSlot:discarded,rows,
    duration:Math.max(completeAt||b.end,...input.map(v=>v.at),b.errorAt+.7)+1,
    graph:prototypeGraph,metrics:counts,timeline,resultEnd,
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

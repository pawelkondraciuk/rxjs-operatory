// Presety są wyłącznie danymi dla wspólnych Node / Edge / Token / History.
const E=(at,value,color='a')=>({at,value,color,kind:'value'});
const R=(label,events=[],spans=[],extra={})=>({label,events,spans,...extra});
const B=(start,end,label,kind='work',extra={})=>({start,end,label,kind,...extra});
const manual=stops=>({entry:'manual',stops,afterLastManualStop:'start-auto',finish:'hold'});

// Wszystkie next i complete mają logicalAt: 0: of emituje synchronicznie.
// Poniższe czasy wyłącznie rozciągają ilustrację, bez wykonywania kodu przykładu.
function mapSequence(scene) {
  const timing={pipeline:.2,handoff:.05,subscribe:3.2,travel:1.2,transform:1.4,receivedHold:.5,gap:.7,terminal:1.2,...scene.timing};
  for(const [key,value] of Object.entries(timing)) {
    if(!Number.isFinite(value)||value<=0)throw new Error(`${scene.id}: nieprawidłowy czas ilustracji ${key}`);
  }
  const seconds=value=>Math.round(value*1e9)/1e9;
  const subscribe=seconds(timing.pipeline+timing.handoff),connected=seconds(subscribe+timing.subscribe);
  let departure=seconds(connected+timing.handoff);
  const values=[1,2,3].map(value=>{
    const arrival=seconds(departure+timing.travel),output=seconds(arrival+timing.transform);
    const received=seconds(output+timing.travel),held=seconds(received+timing.receivedHold);
    const item={value:String(value),result:String(value*2),departure,arrival,output,received,held};
    departure=seconds(held+timing.gap);
    return item;
  });
  const complete=values.at(-1).held,duration=seconds(complete+timing.terminal);
  return {timing,seconds,pipeline:timing.pipeline,subscribe,connected,values,complete,duration};
}

export function configureOperator(scene) {
  const sequence=mapSequence(scene),{timing,pipeline,subscribe,connected,values,duration}=sequence;
  const example='of(1, 2, 3).pipe(map(x => x * 2))';
  // Na początku prezentacji nie mówimy o subskrypcji ani o momencie startu pracy.
  const pipelineCaption='map stoi między źródłem a odbiorcą';
  const subscribeCaption='Łączymy źródło, map i odbiorcę';
  const firstCaption='Źródło emituje 1. map przekształca ją w 2, a odbiorca otrzymuje wynik';
  // Na początku prezentacji nie wprowadzamy subscribe w kodzie; ekran pokazuje tylko pipe z map.
  Object.assign(scene,{graph:mapGraph,timing,playerLayout:'function',duration,code:example,
    rows:[R('Źródło',values.map(v=>E(0,v.value)),[],{completeAt:0}),
      R('map',values.map(v=>E(0,v.result,'op')),[],{completeAt:0}),
      R('Odbiorca',values.map(v=>E(0,v.result,'op')),[],{completeAt:0})],
    captions:[[0,'Źródło, operator i odbiorca'],[timing.handoff,pipelineCaption],
      [subscribe,subscribeCaption],...values.flatMap(v=>[
        [v.departure,`Źródło emituje ${v.value}. Wartość płynie do map`],
        [v.arrival,`map przekształca ${v.value} w ${v.result}. Projekcja działa synchronicznie`],
        [v.received,v.value==='1'?firstCaption:`Odbiorca otrzymuje ${v.result} i zachowuje wcześniejsze wartości`],
      ]),[sequence.complete,'Źródło wysyła complete. Sygnał przechodzi przez map do odbiorcy'],
      [duration,'Operator przekształcił trzy wartości. Po complete strumień zakończył pracę']],
    playback:{...manual([
      {id:'pipeline',time:pipeline,caption:pipelineCaption},
      {id:'subscribed',time:connected,caption:subscribeCaption},
      {id:'first',time:values[0].held,caption:firstCaption},
    ]),controller:'stages'},metrics:[],
  });
}

export function mapGraph(scene) {
  const {timing,seconds,subscribe,values,complete,duration}=mapSequence(scene),frame=frameFor(scene),layout=frame.operator;
  const halfSubscribe=timing.subscribe/2,halfTerminal=timing.terminal/2;
  const tile={y:layout.tileY,h:layout.tileH};
  const nodes=[
    {id:'source',x:layout.sourceX,...tile,w:layout.sideW,label:'Źródło',statusInside:true,terminalEdge:'source-map',ready:true,color:'source'},
    {id:'map',x:layout.opX,...tile,w:layout.mapW,label:'map(x => x * 2)',statusInside:true,terminalEdge:'map-observer',ready:true,color:'op'},
    {id:'observer',x:layout.observerX,...tile,w:layout.observerW??layout.sideW,label:'Odbiorca',statusInside:true,ready:true,color:'http'},
  ];
  // Box i kafelek odbiorcy mają te same wymiary; trzy wartości mieszczą się w jednym rzędzie.
  const observer=nodes.find(n=>n.id==='observer');
  const receiverBox={x:observer.x-observer.w/2,y:layout.boxY,w:observer.w,h:layout.boxH??observer.h,shownAt:values[0].received,
    from:{x:observer.x,y:observer.y+observer.h/2}};
  return {layout:'fixed',formatAware:true,width:1240,height:frame.height,nodes,
    ...(layout.textScale?{textScale:layout.textScale,labelScale:layout.labelScale}:{}),
    edges:[{from:'source',to:'map',logicalStart:0},{from:'map',to:'observer',logicalStart:0}],
    panels:[receiverBox],
    trays:[{anchor:'observer',x:observer.x,y:receiverBox.y+receiverBox.h/2,w:receiverBox.w-4,lines:1}],
    schedule:{
      'source-map':{start:seconds(subscribe+halfSubscribe),connectDuration:halfSubscribe,
        end:{at:complete,logicalAt:0,kind:'complete',duration:seconds(complete+halfTerminal)-complete},
        events:values.map(v=>({...E(v.departure,v.value),logicalAt:0,arrival:v.arrival,phase:'to-map'}))},
      'map-observer':{start:subscribe,connectDuration:halfSubscribe,
        end:{at:seconds(complete+halfTerminal),logicalAt:0,kind:'complete',duration:duration-seconds(complete+halfTerminal)},
        events:values.map(v=>({...E(v.output,v.result,'op'),logicalAt:0,arrival:v.received,phase:'to-observer'}))},
    },
    activities:[...values.map(v=>({node:'source',at:v.departure,until:v.departure+timing.handoff})),
      ...values.map(v=>({node:'observer',at:v.received,until:v.held}))],
    transforms:values.map(v=>({node:'map',at:v.arrival,until:v.output,logicalAt:0,label:`${v.value} → ${v.result}`})),
  };
}

// Wariant timer/interval: timer(2000) emituje 0 i kończy się complete. interval(2000) emituje 0, 1, 2 i sam się nie kończy,
// więc odbiorca ręcznie robi unsubscribe (7 s): kabel się odłącza, bez complete. Trzy wartości mieszczą się w boxie.
export function configureTimers(scene) {
  const ticks=[2,4,6].map((at,i)=>E(at,String(i),'source')),stop=7;
  const once=[E(2,'0','source')];
  Object.assign(scene,{graph:timersGraph,playerLayout:'function',duration:8,unsubscribeAt:stop,
    title:'timer i interval: jedna wartość czy strumień?',code:'timer(2000) / interval(2000)',
    // Odbiorca timera dostaje ✓ complete dopiero po dotarciu sygnału (terminal krawędzi), nie z completeAt wiersza.
    rows:[R('timer(2000)',once,[],{completeAt:2}),R('Odbiorca timer',once),
      R('interval(2000)',ticks),R('Odbiorca interval',ticks)],
    captions:[[0,'Dwa źródła: timer(2000) i interval(2000)'],[2,'Po 2 s oba źródła emitują 0'],
      [4,'interval emituje kolejną wartość. timer już się zakończył'],
      [stop,'Odbiorca robi unsubscribe. interval przestaje emitować, bez complete']],
    metrics:[],
    playback:manual([
      {id:'first',event:{type:'deliver-next',edge:'interval-intervalSink',value:'0'},offset:.35,caption:'Po 2 s oba źródła emitują 0'},
      {id:'question',event:{type:'disconnected',edge:'timer-timerSink'},caption:'timer(2000) zakończył się po jednej wartości. Czy interval też się zakończy?'},
      {id:'third',event:{type:'deliver-next',edge:'interval-intervalSink',value:'2'},offset:.35,caption:'interval wysłał 0, 1, 2 i działa dalej. Sam się nie zakończy'},
      {id:'unsubscribed',event:{type:'disconnected',edge:'interval-intervalSink'},caption:'Odbiorca robi unsubscribe. interval przestaje emitować, bez complete'},
    ]),
  });
}

export function timersGraph(scene) {
  const frame=frameFor(scene),layout=frame.timers,tile={h:layout.tileH,ready:true,statusInside:true};
  // 4:3 ma własne kolumny i wyższy box; 16:9 zachowuje dotychczasowe położenia.
  const source=layout.source||{x:190,w:320},sink=layout.sink||{x:640,w:260},box=layout.box||{x:1015,w:370},boxH=layout.boxH||layout.tileH;
  const nodes=[],panels=[],trays=[];
  const stopped=t=>t>=scene.unsubscribeAt;
  [['timer','timerSink','timer(2000)','po 2 s'],['interval','intervalSink','interval(2000)',t=>stopped(t)?'zatrzymany':'co 2 s']].forEach(([id,sinkId,label,detail],i)=>{
    const y=layout.rows[i];
    nodes.push({id,...tile,x:source.x,y,w:source.w,label,detail,ri:i*2,color:'source',terminalEdge:id+'-'+sinkId},
      {id:sinkId,...tile,x:sink.x,y,w:sink.w,label:'Odbiorca',ri:i*2+1,color:'http',...(i?{detail:t=>stopped(t)?'unsubscribe':undefined}:{})});
    // Box odbiorów na prawo od odbiorcy, w tym samym rzędzie; łącznik jest poziomy.
    // 4:3: box pojawia się przy pierwszym odbiorze w tym rzędzie.
    panels.push({x:box.x-box.w/2,y:y-boxH/2,w:box.w,h:boxH,from:{x:sink.x+sink.w/2,y},
      ...(layout.showOnFirst?{showOn:{type:'deliver-next',edge:id+'-'+sinkId,value:'0'}}:{})});
    // 4:3: jeden wyśrodkowany rząd (0, 1, 2 mieszczą się bez wielokropka przy skali 1,8).
    trays.push({anchor:sinkId,x:box.x,y,w:box.w-24,...(layout.showOnFirst?{lines:1}:{})});
  });
  return {layout:'fixed',formatAware:true,width:1240,height:frame.height,nodes,panels,trays,
    ...(layout.textScale?{textScale:layout.textScale,labelScale:layout.labelScale}:{}),
    edges:[{from:'timer',to:'timerSink',events:scene.rows[0].events,logicalStart:0},
      {from:'interval',to:'intervalSink',events:scene.rows[2].events,logicalStart:0,logicalEnd:{at:scene.unsubscribeAt,kind:'unsubscribe'}}]};
}

// Wariant HTTP: subskrypcja uruchamia request (praca tylko w kafelku HTTP), odpowiedź „dane” trafia do boxu pod odbiorcą,
// potem complete. Odbiorca ma własny wiersz bez pracy, więc nie pokazuje paska ani „praca trwa”.
export function configureHttp(scene) {
  const response=[E(7,'dane','http')];
  Object.assign(scene,{graph:httpGraph,playerLayout:'function',duration:9,
    title:'HTTP: odpowiedź i complete',code:"http.get('/api/data')",
    rows:[R('HTTP',response,[B(1,7,'request')],{completeAt:7}),R('Odbiorca',response)],
    captions:[[0,'HTTP i odbiorca'],[1,'Subskrypcja uruchamia HTTP'],[7,'Odpowiedź, a następnie complete']],
    metrics:[],
    playback:manual([{id:'request',modelTime:4,caption:'Request w toku. Odbiorca czeka na odpowiedź'}]),
  });
}

export function httpGraph(scene) {
  const frame=frameFor(scene),layout=frame.http,tile={y:layout.tileY,h:layout.tileH,ready:true,statusInside:true};
  const nodes=[
    // Między wysłaniem odpowiedzi a sygnałem complete kafelek nie udaje jeszcze zakończenia.
    {id:'http',x:layout.httpX??320,...tile,w:layout.httpW??320,label:'HTTP',ri:0,work:true,terminalEdge:'http-observer',detail:t=>t>=7?'odpowiedź wysłana':undefined},
    {id:'observer',x:layout.observerX??940,...tile,w:layout.observerW??280,label:'Odbiorca',ri:1,color:'http'},
  ];
  const observer=nodes[1];
  // 4:3: box odbioru pojawia się, gdy „dane” dotrą do odbiorcy.
  const box={x:observer.x-observer.w/2,y:layout.boxY,w:observer.w,h:layout.boxH??layout.tileH,from:{x:observer.x,y:observer.y+observer.h/2},
    ...(layout.showOnFirst?{showOn:{type:'deliver-next',edge:'http-observer',value:'dane'}}:{})};
  return {layout:'fixed',formatAware:true,width:1240,height:frame.height,nodes,panels:[box],
    ...(layout.textScale?{textScale:layout.textScale,labelScale:layout.labelScale}:{}),
    trays:[{anchor:'observer',x:observer.x,y:box.y+box.h/2,w:box.w-4,lines:1}],
    edges:[{from:'http',to:'observer',events:scene.rows[0].events}]};
}

// Wariant Subject: emisja może nastąpić także bez podłączonego odbiorcy.
export function configureSubject(scene) {
  // Zwarte tempo: A po 1 s bez odbiorcy, subskrypcja w 2,5 s, B w 4 s, C w 5,5 s.
  const at={a:1,subscribe:2.5,b:4,c:5.5},received=[E(at.b,'B','b'),E(at.c,'C','c')];
  const emitted=[E(at.a,'A'),...received];
  // Subskrypcja w tym przykładzie pozostaje aktywna; nie demonstrujemy unsubscribe.
  scene.rows=scene.rows.map((row,i)=>i===2?R(row.label,emitted):i===3?R(row.label,received):row);
  Object.assign(scene,{graph:subjectGraph,playerLayout:'expanded',metrics:[],subscribeAt:at.subscribe,duration:at.c+1,
    captions:[[0,'Subject może emitować także bez subskrypcji'],
      [at.a,'Subject emituje A. Nie ma jeszcze odbiorcy'],
      [at.subscribe,'Odbiorca dołącza do Subject. Wcześniejsze A nie jest odtwarzane'],
      [at.b,'Subject emituje B do aktywnego odbiorcy'],[at.c,'Subject emituje C do aktywnego odbiorcy']],
    playback:manual([
      {id:'unobserved',event:{type:'source-next',node:'source',value:emitted[0].value},offset:.35,
        caption:'A wyemitowane bez subskrypcji: jedna emisja, zero odebranych wartości'},
      {id:'subscribed',event:{type:'connected',edge:'source-sink'},
        caption:'Odbiorca subskrybuje. Wcześniejsze A nie wraca'},
      {id:'first',event:{type:'deliver-next',edge:'source-sink',value:'B'},offset:.35,
        caption:'Odbiorca dostał B. Emisje: A, B; odbiór: tylko B'},
    ]),
  });
}

export function subjectGraph(scene) {
  const emitted=scene.rows[2].events,first=emitted[0],frame=frameFor(scene),big=frame.subject;
  // 4:3: duże kafelki i boxy, które pojawiają się przy pierwszej emisji / pierwszym odbiorze; A nie leci obok Subject.
  // 16:9: dotychczasowe kolumny z historią w trzech liniach.
  const sourceX=big?big.sourceX:frame.sourceX,sinkX=big?big.sinkX:frame.observerX;
  const tileY=big?big.tileY:frame.tileY,tileH=big?big.tileH:frame.tileH,tileW=big?big.tileW:200;
  const tile={y:tileY,h:tileH,w:tileW,ready:true,statusInside:true};
  const subscribeAt=scene.subscribeAt;
  const box=(x,showOn)=>big?{x:x-tileW/2,y:big.boxY,w:tileW,h:big.boxH,from:{x,y:tileY+tileH/2},showOn}:
    {x:x-frame.sideW/2,y:frame.panelY,w:frame.sideW,h:frame.columnH,from:{x,y:tileY+tileH/2}};
  // Box 4:3 ma jeden rząd wartości (trzy kapsułki mieszczą się w 280 px), 16:9 trzy linie w kolumnie.
  const history=big?{y:big.boxY+big.boxH/2,w:tileW-4,lines:1}:
    {y:frame.panelY+frame.historyTop,w:frame.sideW-24,columns:1,lines:3,lineStep:frame.historyStep};
  return {layout:'fixed',formatAware:true,width:1240,height:frame.height,
    ...(big?{textScale:big.textScale,labelScale:big.labelScale}:{}),
    nodes:[{id:'source',x:sourceX,...tile,label:'Subject',ri:2,color:'source',detail:t=>t<subscribeAt?'0 odbiorców':'1 odbiorca'},
      {id:'sink',x:sinkX,...tile,label:'Odbiorca',ri:3,color:'http',detail:t=>t<subscribeAt?'nie subskrybuje':'subskrybuje'}],
    edges:[{id:'source-sink',from:'source',to:'sink',logicalStart:subscribeAt,events:scene.rows[3].events}],
    panels:[box(sourceX,{type:'source-next',node:'source',value:first.value}),box(sinkX,{type:'deliver-next',edge:'source-sink',value:'B'})],
    trays:[{anchor:'source',x:sourceX,...history,events:emitted,modelTime:true},
      {anchor:'sink',x:sinkX,...history}],
    tokens:big?[]:[{...first,at:first.at,until:first.at+.6,modelTime:true,x:frame.sourceX+140,y:tileY,phase:'unobserved'}],
    timeline:[{at:first.at,type:'source-next',node:'source',value:first.value},
      {type:'subject-summary',event:{type:'deliver-next',edge:'source-sink',value:'C'},offset:.35,
        caption:'Wyemitowane: 3 (A, B, C). Odebrane: 2 (B, C). Zwykły Subject nie odtwarza A'}],
  };
}

function buildFlattenGraph(scene) {
  const all=scene.operatorName==='concatAll',sourceY=50,operatorX=all?780:720;
  const nodes=[
    {id:'source',x:125,y:sourceY,w:190,h:64,label:scene.http?'id$':'source$',ri:0,color:'source',ready:true},
    {id:'op',x:operatorX,y:sourceY,w:220,h:64,label:scene.operatorName,ri:null,color:'op',ready:true},
    {id:'observer',x:1100,y:sourceY,w:240,h:64,label:'Odbiorca',ri:scene.rows.length-1,ready:true,
      detail:t=>scene.outerCompleteAt!==undefined&&t>=scene.outerCompleteAt&&t<scene.rows.at(-1).completeAt?'czeka na inner':undefined},
  ];
  const edges=[],trays=[{anchor:'observer',x:1100,y:sourceY+95,w:242}];
  if(all) {
    nodes.push({id:'projection',x:395,y:sourceY,w:220,h:64,label:'map → Observable',ri:1,color:'op',ready:true});
    edges.push({from:'source',to:'projection',events:scene.rows[0].events,logicalStart:.3},
      {from:'projection',to:'op',events:scene.rows[1].events,logicalStart:.3});
  } else edges.push({from:'source',to:'op',events:scene.rows[0].events,logicalStart:.3});
  for(const [i,job] of scene.jobs.entries()) {
    const ri=i+(all?2:1),y=(scene.jobs.length>4?158:166)+i*(scene.jobs.length>4?38:48),h=scene.jobs.length>4?32:42;
    const workRow={x:595,y,w:560,h,workRow:true};
    if(job.ignored) {
      // To etykieta pominiętego wejścia, nie utworzony inner Observable.
      nodes.push({...workRow,id:'ignored'+i,label:job.value+' (wejście)',color:'muted',detail:'pominięte',instant:true,createdBy:{edge:'source-op',value:job.value}});
      continue;
    }
    if(!all&&job.start>job.at)nodes.push({...workRow,id:'queued'+i,label:job.value+' (wartość)',color:'muted',detail:'w kolejce',
      instant:true,createdBy:{edge:'source-op',value:job.value},until:job.start});
    nodes.push({...workRow,id:'inner'+i,label:(scene.http?'HTTP ':'')+job.value+(scene.http?'':'$'),ri,inner:true,
      born:job.start,createdBy:all?{edge:'source-projection',value:job.value}:undefined,ready:false,cancelLabel:'anulowana · ABORT (klient)'});
    edges.push({from:'inner'+i,to:'op',events:scene.rows[ri].events,workRow:ri,gateWork:true,internal:true,logicalStart:job.start,
      points:[[315,y],[275-i*14,y],[275-i*14,100],[operatorX,100],[operatorX,82]]});
  }
  edges.push({from:'op',to:'observer',events:scene.rows.at(-1).events,logicalStart:.3,logicalEnd:{at:scene.rows.at(-1).completeAt,kind:'complete'}});
  return {layout:'fixed',width:1240,height:380,nodes,edges,trays,
    panels:[{x:300,y:110,w:590,h:229,label:'PRACE WEWNĘTRZNE',from:{x:operatorX,y:82}}],
    queue:t=>`Kolejka ${all?'Observable':'wartości'}: [${scene.jobs.filter(j=>!j.ignored&&j.at<=t&&t<j.start).map(j=>j.value+(all?'$':'')).join(', ')}]`,
    timeline:scene.jobs.filter(j=>j.ignored).map(j=>({at:j.at,type:'ignore-next',node:'op',value:j.value})),
  };
}

// Wspólny układ rodziny flatteningu: trzy kolumny. Pod źródłem EMISJE, pod wyśrodkowanym operatorem PRACE WEWNĘTRZNE,
// pod odbiorcą ODBIÓR. Panele mają odstęp od kafelków i od dołu; wiersze zajmują stałe sloty na całej wysokości.
// 4:3 ma własny profil: wyższa ramka, kafelki i sloty; poziomy układ (szerokość 1240) jest wspólny.
// Scena bez formatu (testy, prototypy) zachowuje geometrię 16:9.
const horizontal = {panelW:520,sideW:220,sourceX:140,opX:620,observerX:1100,catchX:860};
const frames = {
  '16:9': {...horizontal,timers:{tileH:86,rows:[130,330]},http:{tileY:170,tileH:86,boxY:250},operator:{tileY:50,tileH:76,sourceX:140,opX:620,observerX:1100,sideW:200,mapW:240,boxY:148},height:460,tileY:50,tileH:76,panelY:148,panelBottom:440,columnH:210,historyTop:41,historyStep:60},
  // 04 w 4:3: trzy duże kafelki i box odbioru pod odbiorcą; cała grupa (130 + 50 + 130) na środku ramki 612.
  // 05 (timer/interval) w 4:3: dwa rzędy po 130 px wyśrodkowane w ramce 612, większy tekst jak w 04.
  // 05-2 (HTTP) w 4:3: kafelki i box pod odbiorcą jak w 04, grupa wyśrodkowana w pionie i poziomie.
  '4:3': {...horizontal,timers:{tileH:170,rows:[181,431],boxH:150,source:{x:210,w:360},sink:{x:630,w:280},box:{x:1040,w:340},showOnFirst:true,textScale:1.8,labelScale:2.2},http:{tileY:201,tileH:170,boxY:346,boxH:150,httpX:300,httpW:400,observerX:940,observerW:400,showOnFirst:true,textScale:1.8,labelScale:2.2},subject:{sourceX:300,sinkX:940,tileY:201,tileH:170,tileW:400,boxY:346,boxH:150,textScale:1.8,labelScale:2.2},operator:{tileY:201,tileH:170,sourceX:160,opX:590,observerX:1050,sideW:260,observerW:320,mapW:380,boxY:346,boxH:150,textScale:1.8,labelScale:2.2},height:612,tileY:60,tileH:96,panelY:172,panelBottom:592,columnH:300,historyTop:56,historyStep:84},
};
const frameFor = scene => frames[scene.format==='4:3'?'4:3':'16:9'];

export function flattenGraph(scene) {
  const graph = buildFlattenGraph(scene), frame = frameFor(scene);
  const outerCatch = scene.catchScope === 'outer';
  const panelX = frame.opX;
  const paired = scene.operatorName === 'concatAll';
  const opX = paired ? panelX+(frame.panelW-240)/2 : panelX;
  // Panele są bez napisów; to, że praca jest HTTP, mówi podpis na dole.
  const slots = scene.jobs.length + (scene.discardedSlot ? 1 : 0);
  const rowsTop = frame.panelY + 16, rowsBottom = frame.panelBottom - 16, gap = 20;
  // Stała siatka czterech slotów od góry: mniej prac układa się jedna pod drugą, bez rozciągania odstępów.
  const grid = Math.max(4,slots), rowHeight = (rowsBottom-rowsTop-(grid-1)*gap)/grid, rowStep = rowHeight+gap;
  Object.assign(graph,{height:frame.height,formatAware:true,queue:null,illustratedWork:true});
  const tile = {y:frame.tileY,h:frame.tileH};
  graph.nodes.forEach(n => {
    // Etykieta źródła jak w kodzie przykładu (source$ albo id$).
    if (n.id === 'source') Object.assign(n,tile,{x:frame.sourceX,w:200,label:scene.code.startsWith('id$.')?'id$':'source$',statusInside:true});
    if (n.id === 'op') Object.assign(n,tile,{x:opX,w:240});
    if (n.id === 'projection') Object.assign(n,tile,{x:panelX-(frame.panelW-240)/2,w:240,label:'map',statusInside:true});
    if (n.id === 'observer') Object.assign(n,tile,{x:frame.observerX,w:200,statusInside:true});
    if (!n.workRow) return;
    // Każda wartość ma własny slot: „B (wartość)” w kolejce, potem B$ w tym samym miejscu.
    const [, kind, index] = /^(queued|inner|ignored)(\d+)$/.exec(n.id) || [];
    if (!kind) return;
    const job = scene.jobs[Number(index)];
    Object.assign(n,{x:panelX,y:rowsTop+Number(index)*rowStep+rowHeight/2,w:frame.panelW-32,h:rowHeight});
    Object.assign(n,{panel:'jobs',slot:Number(index),execution:job.value});
    if (kind === 'queued' || kind === 'ignored') delete n.instant;
    if (kind === 'inner') n.label=job.value+'$';
  });
  // Emisje źródła po kolei w jednej kolumnie, odbiór po kolei w dwóch kolumnach (kolejność dotarcia).
  const lines = {y:rowsTop+rowHeight/2,w:frame.sideW-24,lines:grid,lineStep:rowStep};
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
  // Źródło i operatory pokazują własny terminal, nie zakończenie odbiorcy.
  for(const node of graph.nodes) {
    if(['source','projection','op','catch'].includes(node.id)) {
      const output=graph.edges.find(edge=>edge.from===node.id&&!edge.internal);
      node.terminalEdge=output.id||output.from+'-'+output.to;
    }
  }
  // Indeks pracy jest indeksem wejścia (jak w flattenGraph), także gdy exhaustMap pominął część wartości.
  graph.executions = [...scene.jobs.entries()].filter(([,j])=>!j.ignored).map(([i,j])=>({
    id:j.value,node:'inner'+i,edge:'inner'+i+'-op',panel:'jobs',value:j.value,
    label:j.value+'$',duration:j.dur??j.end-j.start,handlerLabel:scene.catchScope==='inner'?'catchError':undefined,
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
    {id:'jobs',x:panelX-frame.panelW/2,y:frame.panelY,w:frame.panelW,h:panelH,from:below(opX),slots,rowsTop,rowStep,rowHeight},
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
      events:plan.offsets.map((offset,k)=>E(job.start+offset,job.value+(k+1),job.color)),
      spans:[B(job.start,job.end,job.value,'work',{duration:plan.dur})],completeAt:job.end});
  }
  const end = Math.max(...scene.jobs.map(j=>j.end));
  Object.assign(scene.rows.at(-1),{events:scene.rows.slice(1,-1).flatMap(r=>r.events).sort((a,b)=>a.at-b.at),completeAt:end});
  scene.duration = end+1.2;
  scene.captions.at(-1)[0] = end;
  scene.timeline=[{type:'reception-order',event:{type:'deliver-next',edge:'op-observer',value:'D1'},caption:'D1 dotarło przed C2: mergeMap nie zachowuje kolejności wejść.'}];
}

export function configureFlatten(scene,mode) {
  const all=mode==='concatAll';
  // Wspólne wejście i potencjalny czas pracy dla czterech strategii.
  const input=(all?[1,1.2,1.4]:[1,1.45,1.9,2.7]).map((at,i)=>({at,value:'ABCD'[i],dur:1.2,color:['a','b','c','a'][i]}));
  let end=0;
  const jobs=input.map((v,i)=>{
    if(mode==='exhaustMap'&&v.at<end)return {...v,ignored:true};
    const start=mode==='concatMap'||all?Math.max(v.at,end):v.at,natural=start+v.dur;
    end=mode==='switchMap'&&input[i+1]?Math.min(natural,input[i+1].at):natural;
    return {...v,start,end,cancelled:end<natural};
  });
  const result=[],rows=[R('wejście',input.map(v=>E(v.at,v.value,v.color)),[],{completeAt:3})];
  if(all)rows.push(R('map',input.map(v=>E(v.at,v.value+'$',v.color)),[],{completeAt:3}));
  for(const job of jobs) {
    const ev=job.ignored?[]:(mode==='switchMap'?[1.1]:[.65,1.05]).filter(offset=>job.start+offset<job.end).map((offset,i)=>E(job.start+offset,job.value+(mode==='switchMap'?'':i+1),job.color));
    result.push(...ev);
    rows.push(R(job.value+'$',ev,job.ignored?[]:[...(job.start>job.at?[B(job.at,job.start,job.value+(all?'$':''),'queue')]:[]),
      B(job.start,job.end,job.value,job.cancelled?'cancel':'work',{duration:job.dur})],{completeAt:job.ignored||job.cancelled?undefined:job.end}));
  }
  result.sort((a,b)=>a.at-b.at);
  const completed=Math.max(3,...jobs.filter(j=>!j.ignored).map(j=>j.end));
  rows.push(R('wynik',result,[],{completeAt:completed}));
  const question=all?'A$ pracuje; B$ i C$ już istnieją. Ile requestów uruchomiono?':mode==='switchMap'?'B dotarło podczas HTTP A. Co stanie się z aktywnym requestem?':mode==='concatMap'?'B dotarło podczas A$. Czy B czeka jako wartość?':mode==='mergeMap'?'B dotarło podczas A$. Czy uruchomimy drugą pracę?':'B dotarło podczas A$. Czy powstanie B$?';
  const incoming=all?'projection-op':'source-op';
  Object.assign(scene,{rows,jobs,operatorName:mode,http:mode==='switchMap',graph:flattenGraph,duration:completed+1.2,
    code:all?'source$.pipe(map(id => request$(id)), concatAll())':mode==='switchMap'?'id$.pipe(switchMap(id => http.get(`/api/users/${id}`)))':`source$.pipe(${mode}(makeInner$))`,
    captions:[[0,all?'map tworzy zimne Observable; concatAll subskrybuje po kolei.':mode==='mergeMap'?'Te same A/B/C/D: C pracuje dłużej, D krócej — kolejność wyników może się zmienić.':mode==='switchMap'?'Każde wejście uruchamia HTTP; nowe ID odłącza poprzednią subskrypcję.':'Te same A, B, C, D i czas pracy: 1,2 s od subskrypcji.'],
      [1,'A uruchamia pierwszą pracę.'],[1.45,question],[1.9,all?'B$ i C$ czekają bez pracy HTTP.':mode==='switchMap'?'Unsubscribe przerywa klienta; dopiero potem rusza nowe HTTP.':mode==='exhaustMap'?'B i C pominięte. Ich inner nie powstają.':'Strategia operatora określa kolejkę lub współbieżność.'],
      [2.7,mode==='exhaustMap'?'A$ skończyło się. D może uruchomić nowy inner.':'Wartości z aktywnych inner trafiają do odbiorcy.'],[completed,'Outer i wymagane inner zakończyły się. Wynik: complete.']],
    playback:manual([
      {id:'subscribe',modelTime:.3,caption:'Subskrypcja łączy odbiorcę z operatorem i źródłem.'},
      {id:'first',event:{type:'deliver-next',edge:incoming,value:all?'A$':'A'},caption:all?'map utworzył A$. Teraz concatAll może go subskrybować.':'A dotarło do operatora.'},
      {id:'active',event:{type:'inner-subscribe',node:'inner0'},offset:.05,caption:'Pierwszy inner jest aktywny; jego praca dopiero trwa.'},
      {id:'question',...(all?{modelTime:1.4}:{event:{type:'deliver-next',edge:incoming,value:'B'}}),caption:question},
    ]),metrics:[{label:'uruchomione',value:t=>jobs.filter(j=>!j.ignored&&j.start<=t).length},{label:'aktywne',value:t=>jobs.filter(j=>!j.ignored&&j.start<=t&&t<j.end).length}],
  });
  if(mode==='mergeMap')overlapTail(scene);
  configureFlattenPlayback(scene);
}

export function configureFlattenPlayback(scene) {
  const mode=scene.operatorName;
  scene.flattenLayout=true;
  scene.playerLayout='expanded';
  scene.metrics=[{label:'uruchomione',count:'started'},{label:'aktywne',count:'active'}];
  if(scene.playback?.stops)scene.playback={...scene.playback,finish:'hold',stops:scene.playback.stops.map(stop=>
    stop.id==='first'||stop.id==='question'&&mode==='concatMap'?{...stop,offset:.35}:stop)};
  else scene.playback={entry:'auto',finish:'hold'};
  const final=scene.captions.at(-1);
  if(final?.[0]===scene.rows.at(-1).completeAt)scene.captions=scene.captions.slice(0,-1);
  scene.timeline=[...(scene.timeline||[]),{type:'result-summary',event:{type:'stream-complete',edge:'op-observer'},offset:.81,caption:final?.[1]||'Ostatni inner zakończony. Wynik: complete.'}];
}

export function configureReferences(scenes) {
  configureOperator(scenes.find(s=>s.id==='04-operator'));
  configureFlatten(scenes.find(s=>s.id==='08-map-strumienie'),'concatAll');
  configureFlatten(scenes.find(s=>s.id==='11-switchmap'),'switchMap');
  const share=scenes.find(s=>s.id==='19-share');
  share.graph=s=>({layout:'fixed',width:1240,height:340,
    nodes:[{id:'http',x:170,y:140,label:'HTTP',ri:2,work:true,ready:true},{id:'share',x:590,y:140,label:'share()',color:'op',ready:true},
      {id:'a',x:1070,y:75,label:'Odbiorca A',ri:0,ready:true},{id:'b',x:1070,y:235,label:'Odbiorca B',ri:1,ready:true}],
    edges:[{from:'http',to:'share',events:s.rows[2].events},{from:'share',to:'a',events:s.rows[0].events.filter(e=>e.value==='dane')},{from:'share',to:'b',events:s.rows[1].events.filter(e=>e.value==='dane')}],
    trays:[{anchor:'a',x:1070,y:155,w:230},{anchor:'b',x:1070,y:315,w:230}]});
  share.duration=9;
  share.playback=manual([{id:'first',modelTime:1,caption:'A uruchamia jedno HTTP.'},{id:'question',modelTime:3,caption:'B dołączył, gdy HTTP nadal trwa. Czy potrzebny jest drugi request?'}]);
}

export function configureConcurrency(scene) {
  const jobs=scene.rows.map(r=>{
    const work=r.spans.find(p=>p.kind==='work');
    return {value:r.label,at:Math.min(...r.spans.map(p=>p.start)),start:work.start,end:work.end,dur:work.end-work.start};
  });
  const end=Math.max(...jobs.map(j=>j.end)),result=scene.rows.flatMap(r=>r.events).sort((a,b)=>a.at-b.at);
  scene.rows=[R('source$',jobs.map(j=>E(j.at,j.value)),[],{completeAt:5}),
    ...scene.rows.map((r,i)=>({...r,completeAt:jobs[i].end})),R('wynik',result,[],{completeAt:end})];
  Object.assign(scene,{jobs,operatorName:'mergeMap · limit 3',outerCompleteAt:5,graph:flattenGraph});
  configureFlattenPlayback(scene);
  scene.metrics=[{label:'aktywne / 3',count:'active'},{label:'w kolejce',value:t=>jobs.filter(j=>j.at<=t&&t<j.start).length}];
}

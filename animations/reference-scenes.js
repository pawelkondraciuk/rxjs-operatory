import { createInnerWorkPanel } from './inner-work-panel.js';
// Presety są wyłącznie danymi dla wspólnych Node / Edge / Token / History.
const E=(at,value,color='a')=>({at,value,color,kind:'value'});
const R=(label,events=[],spans=[],extra={})=>({label,events,spans,...extra});
const B=(start,end,label,kind='work',extra={})=>({start,end,label,kind,...extra});
const manual=stops=>({entry:'manual',stops,afterLastManualStop:'start-auto',finish:'hold'});

// Wszystkie next i complete mają logicalAt: 0: of emituje synchronicznie.
// Poniższe czasy wyłącznie rozciągają ilustrację, bez wykonywania kodu przykładu.
function mapSequence(scene) {
  const timing={pipeline:.65,handoff:.05,subscribe:3.2,travel:1.2,transform:1.4,receivedHold:.5,gap:.7,terminal:1.2,settle:.8,reveal:.3,laneReveal:.35,...scene.timing};
  for(const [key,value] of Object.entries(timing)) {
    if(!Number.isFinite(value)||value<=0)throw new Error(`${scene.id}: nieprawidłowy czas ilustracji ${key}`);
  }
  const seconds=value=>Math.round(value*1e9)/1e9;
  // Odbiorca (wiersz wykonania) pojawia się po etapie pipeline; subscribe rusza, gdy jest w pełni widoczny.
  const born=seconds(timing.pipeline+timing.handoff),subscribe=seconds(born+timing.reveal),connected=seconds(subscribe+timing.subscribe);
  // laneReveal: wiersz źródła (litera, port) wchodzi po zestawieniu subskrypcji; postój subscribed czeka na niego.
  const subscribed=seconds(connected+timing.laneReveal);
  let departure=seconds(subscribed+timing.handoff);
  const values=[1,2,3].map(value=>{
    const arrival=seconds(departure+timing.travel),output=seconds(arrival+timing.transform);
    const received=seconds(output+timing.travel),held=seconds(received+timing.receivedHold);
    const item={value:String(value),result:String(value*2),departure,arrival,output,received,held};
    departure=seconds(held+timing.gap);
    return item;
  });
  // settle: cisza po dotarciu complete, żeby rozbłysk wierszy wygasł przed FINISHED.
  const complete=values.at(-1).held,finished=seconds(complete+timing.terminal),duration=seconds(finished+timing.settle);
  return {timing,seconds,pipeline:timing.pipeline,born,subscribe,connected,subscribed,values,complete,finished,duration};
}

export function configureOperator(scene) {
  const sequence=mapSequence(scene),{timing,pipeline,subscribe,subscribed,values,duration}=sequence;
  const example='of(1, 2, 3)';
  // Pipe składa definicję; subskrypcja tworzy wykonanie.
  const pipelineCaption='pipe składa definicję. map podwoi każdą emitowaną wartość';
  const subscribeCaption='subscribe łączy odbiorcę ze źródłem i uruchamia wykonanie';
  const firstCaption='Źródło emituje 1. map przekształca ją w 2, a odbiorca otrzymuje wynik';
  // Kod pokazuje definicję, a osobny etap ilustruje subskrypcję.
  Object.assign(scene,{graph:mapGraph,timing,playerLayout:'function',duration,code:example,ink:'#26323B',playerClass:'rx-flat-tiles',
    codeFrames:[{at:timing.handoff,code:example+'\n.pipe(map(x => x * 2))',fadeIn:.3}],
    rows:[R('Źródło',values.map(v=>E(0,v.value)),[],{completeAt:0}),
      R('map',values.map(v=>E(0,v.result,'op')),[],{completeAt:0}),
      R('Odbiorca',values.map(v=>E(0,v.result,'op')),[],{completeAt:0})],
    captions:[[0,'of(1, 2, 3) definiuje źródło trzech kolejnych wartości'],[timing.handoff,pipelineCaption],
      [subscribe,subscribeCaption],...values.flatMap(v=>[
        [v.departure,`Źródło emituje ${v.value}. Wartość płynie do map`],
        [v.arrival,`map przekształca ${v.value} w ${v.result}. Projekcja działa synchronicznie`],
        [v.received,v.value==='1'?firstCaption:`Odbiorca otrzymuje ${v.result} i zachowuje wcześniejsze wartości`],
      ]),[sequence.complete,'Źródło wysyła complete. Sygnał przechodzi przez map do odbiorcy'],
      [sequence.finished,'map podwoił trzy wartości. Complete zakończyło to wykonanie']],
    playback:{...manual([
      {id:'pipeline',time:pipeline,caption:pipelineCaption},
      {id:'subscribed',time:subscribed,caption:subscribeCaption},
      {id:'first',time:values[0].held,caption:firstCaption},
    ]),controller:'stages'},metrics:[],
  });
}

// Wygląd torów jak w 04a: of(1, 2, 3) → map → odbiorca A w jednym rzędzie. Kulka wjeżdża do map, staje
// i zmienia wartość; odebrane wyniki zostają kulkami w wierszu odbiorcy. Czasy z mapSequence (schedule).
export function mapGraph(scene) {
  const {timing,seconds,born,subscribe,values,complete,finished}=mapSequence(scene);
  const halfSubscribe=timing.subscribe/2,halfTerminal=timing.terminal/2,fill=laneSubscribers.A.fill;
  const top=scene.format==='4:3'?222:146,y=laneRowY(top,0),receiver={x:995,w:366,y};
  const nodes=[
    {id:'source',x:217,w:310,label:'of(1, 2, 3)',terminalEdge:'source-map',...laneTile('source',top,{A:0},1)},
    {id:'map',x:592,w:280,label:'map',color:'op',transformBalls:true,terminalEdge:'map-observer',...laneTile('operator',top,{A:0},1,{ready:false,born:timing.handoff})},
    laneReceiver('observer','A',receiver,{ready:false,born}),
  ];
  return {layout:'fixed',formatAware:true,width:1240,height:scene.format==='4:3'?612:460,...laneGraphLook(),
    subscribers:{A:laneSubscribers.A},nodes,
    edges:[{from:'source',to:'map',logicalStart:0,subscriber:'A'},{from:'map',to:'observer',logicalStart:0,subscriber:'A'}],
    trays:[laneTray('observer',receiver,3)],
    callouts:[subscribeCallout('A','map-observer','source-map',{y:top/2})],
    schedule:{
      'source-map':{start:seconds(subscribe+halfSubscribe),connectDuration:halfSubscribe,
        end:{at:complete,logicalAt:0,kind:'complete',duration:seconds(complete+halfTerminal)-complete},
        events:values.map(v=>({...E(v.departure,v.value,fill),logicalAt:0,arrival:v.arrival,phase:'to-map'}))},
      'map-observer':{start:subscribe,connectDuration:halfSubscribe,
        end:{at:seconds(complete+halfTerminal),logicalAt:0,kind:'complete',duration:finished-seconds(complete+halfTerminal)},
        events:values.map(v=>({...E(v.output,v.result,fill),logicalAt:0,arrival:v.received,phase:'to-observer'}))},
    },
  };
}

// Tory wykonania: nagłówek kafelka to definicja, wiersze pod nim to wykonania w kolorach subskrypcji.
// cold: HTTP GET → map → A/B, dwa niezależne tory przez cały pipeline. share: HTTP GET → map → share() → A/B,
// jeden wspólny turkusowy tor S do share (jeden request, jedno map), dalej osobne wiersze A i B.
// share-unsub: jak share, ale A robi unsubscribe przed odpowiedzią — share zostaje podłączony dla B.
// color — kabel, gniazdo, czoło postępu, pasek wiersza; fill — kapsułki wartości; progress — tło postępu źródła.
// ink i tint: ciemniejszy tekst i delikatne tło chwilowego napisu toru (kontrast na projektorze).
const laneSubscribers={A:{color:'#7457D9',fill:'#cbbff2',progress:'#c4b6f0',ink:'#4f35b0',tint:'#f0ecfc'},
  B:{color:'#D8840F',fill:'#f3d09d',progress:'#f0c88c',ink:'#8f5100',tint:'#fdf1e0'},
  C:{color:'#2F7ED8',fill:'#bcd6f5',progress:'#b0cdf0',ink:'#1f5ca6',tint:'#e8f1fc'}};

// share(): scenariusz to lista Subscriberów {id, start, unsub?} (czas modelu). Pierwsza subskrypcja przy braku aktywnego
// upstreamu otwiera sesję (jeden request, odpowiedź po requestTime); kolejni dołączają do niej. Odejście ostatniego
// aktywnego przed odpowiedzią anuluje upstream (HTTP ABORT, bez complete). Nowa subskrypcja po końcu sesji otwiera następną.
// Sesja k ma tor U{k} w kolorze Subscribera, który ją uruchomił — kolor wykonania, nie właściciela (zarządza nim share).
export function shareSessions(subscribers,requestTime=4) {
  const subs=subscribers.map((sub,slot)=>({...sub,slot})),sessions=[];
  const timeline=subs.flatMap(sub=>[{at:sub.start,type:'sub',sub},...(sub.unsub===undefined?[]:[{at:sub.unsub,type:'unsub',sub}])])
    .sort((a,b)=>a.at-b.at||(a.type==='unsub'?-1:1));
  let current=null;
  for(const {at,type,sub} of timeline) {
    if(type==='sub') {
      if(!current||at>=current.end){current={index:sessions.length+1,start:at,initiator:sub.id,response:at+requestTime,end:at+requestTime,active:0};sessions.push(current);}
      sub.session=current;current.active++;
    } else if(at<sub.session.response&&sub.session.cancelAt===undefined) {
      sub.unsubAt=at;
      if(--sub.session.active===0){sub.session.cancelAt=at;sub.session.end=at;sub.cancelsUpstream=true;if(current===sub.session)current=null;}
    }
  }
  for(const sub of subs)sub.receives=sub.unsubAt===undefined&&sub.session.cancelAt===undefined;
  return {subs,sessions,end:Math.max(...sessions.map(s=>s.end))};
}
const upstreamEdge=(kind,k)=>(kind==='http'?'http-map':'map-share')+(k>1?`-${k}`:'');
const laneTiles={source:{headerFill:'#8FC9D4',runtimeFill:'#cde7ec'},operator:{headerFill:'#D8B3E6',runtimeFill:'#eddcf4'},
  receiver:{headerFill:'#EAE4F7',runtimeFill:'#f6f3fc'}};
// Wspólny wygląd torów (04a, 04, 05, 05-2): wymiary liczone dla 1024×768 i wspólne dla obu formatów.
// Nagłówek kafelka to definicja, wiersz pod nim — wykonanie; odbiorca to wiersz z ikoną inbox i kulkami wartości.
const laneLook={defH:79,rowH:89,ball:{r:29,font:35.5},icon:28,portRadius:11.4,laneWire:5,rx:7.6,textScale:1.42,labelScale:1.56,ballGap:10};
const laneGraphLook=()=>({portRadius:laneLook.portRadius,laneWire:laneLook.laneWire,ball:laneLook.ball,
  textScale:laneLook.textScale,labelScale:laneLook.labelScale});
const laneRowY=(top,slot)=>top+laneLook.defH+(slot+.5)*laneLook.rowH;
// Kafelek rośnie o wiersz, gdy subscribe do niego dociera; rows rezerwuje pełną wysokość. Nagłówek definicji
// nie przejmuje koloru complete/error (terminalBadge) — stan niesie wiersz wykonania.
function laneTile(kind,top,slots,rows,extra={}) {
  const h=laneLook.defH+rows*laneLook.rowH;
  return {top,defH:laneLook.defH,rowH:laneLook.rowH,laneSlots:slots,growRows:true,y:top+h/2,h,ready:true,detail:'',rx:laneLook.rx,
    terminalBadge:true,...laneTiles[kind],...extra};
}
// Odbiorca: kompaktowy wiersz (pasek toru, inbox, litera, kulki wartości), 3 px odstępu od sąsiada.
const laneInbox=()=>{const k=laneLook.textScale;return {size:laneLook.icon,left:6*k+12,font:24*k};};
function laneReceiver(id,subscriber,{x,w,y},extra={}) {
  const gap=3;
  return {id,x,y,w,h:laneLook.rowH-2*gap,top:y-laneLook.rowH/2+gap,defH:0,rowH:laneLook.rowH-2*gap,
    laneSlots:{[subscriber]:0},...laneTiles.receiver,label:'',subscriber,terminalBadge:true,detail:'',inbox:laneInbox(),rx:laneLook.rx,...extra};
}
// Chwilowy napis zdarzenia (.subscribe() / .unsubscribe()) z badge'em toru; from/to to selektory zdarzeń jak w postojach.
const laneEvent=(type,edge,offset)=>({type,edge,...(offset?{offset}:{})});
const laneCallout=(text,subscriber,from,to,pos)=>({text,subscriber,size:45,...pos,from,to});
// .subscribe() od pojawienia się odbiorcy (0,3 s przed subscribe) do zestawienia połączenia ze źródłem.
const subscribeCallout=(subscriber,edge,source,pos)=>laneCallout('.subscribe()',subscriber,laneEvent('subscribe',edge,-.3),laneEvent('connected',source),pos);
function laneTray(anchor,{x,w,y},max,ball=laneLook.ball) {
  const k=laneLook.textScale,inbox=laneInbox();
  return {anchor,x:x-w/2+inbox.left+laneLook.icon+8*k+22*k+12+ball.r,y,balls:true,max,gap:laneLook.ballGap};
}
// Kod torów: stale tylko definicja pipeline'u (bez nazwy data$), fragmenty w kolorach klocków; fragment świeci,
// gdy jego klocek pracuje (HTTP — odpowiedź wylatuje, map — przekształcenie, share — rozdzielenie wartości).
function laneCodeLines(shared,plan) {
  const mark=(id,bg,line)=>({id,bg,line}),op=['rgba(216,179,230,.45)','#b384c6'];
  const http=mark('http','rgba(143,201,212,.4)','#4fa5b5'),map=mark('map',...op),share=mark('share',...op);
  const during=(from,to)=>({from,to}),ev=(type,edge)=>({type,edge});
  // share: wyróżnienia dla sesji, które dostarczyły odpowiedź, i Subscriberów, którzy ją dostali (zależne od scenariusza).
  const sessions=shared?plan.sessions.filter(session=>session.cancelAt===undefined):[];
  const response=shared?sessions.map(session=>during(ev('source-next',upstreamEdge('http',session.index)),ev('deliver-next',upstreamEdge('http',session.index)))):
    ['-A','-B'].map(id=>during(ev('source-next',`http-map${id}`),ev('deliver-next',`http-map${id}`)));
  const transform=shared?sessions.map(session=>during(ev('deliver-next',upstreamEdge('http',session.index)),ev('source-next',upstreamEdge('map',session.index)))):
    ['-A','-B'].map(id=>during(ev('deliver-next',`http-map${id}`),ev('source-next',`map${id}`)));
  const split=shared?sessions.flatMap(session=>{const sub=plan.subs.find(x=>x.session===session&&x.receives);
    return sub?[during(ev('deliver-next',upstreamEdge('map',session.index)),ev('source-next',`share-${sub.id}`))]:[];}):[];
  // share ma dłuższy pipe, więc łamie się świadomie przed .pipe (bez przypadkowego zawijania w środku wywołania).
  const lines=shared?[[{text:'http.get<number>(url)',mark:http,active:response}],
    [{text:'  .pipe('},{text:'map(x => x * 2)',mark:map,active:transform},{text:', '},
      {text:'share()',mark:share,active:split},{text:')'}]]:
    [[{text:'http.get<number>(url)',mark:http,active:response},{text:'.pipe('},{text:'map(x => x * 2)',mark:map,active:transform},{text:')'}]];
  return {codeLines:lines,code:lines.map(line=>line.map(part=>part.text).join('')).join('\n'),codeFrames:[],playerClass:'rx-lanes rx-flat-tiles'};
}
// Slajdy: -2 — A w 1 s, B w 3 s, jedna odpowiedź w 5 s dla obu; -3 — dodatkowo A robi unsubscribe w 4 s.
const defaultShareScenario=unsub=>[{id:'A',start:1,...(unsub?{unsub:4}:{})},{id:'B',start:3}];
export function configureLanes(scene) {
  const mode=scene.lanesMode||'cold',shared=mode!=='cold',unsub=mode==='share-unsub';
  const a=laneSubscribers.A.fill,b=laneSubscribers.B.fill;
  const plan=shared?shareSessions(scene.shareScenario||defaultShareScenario(unsub)):null;
  const lastB=shared?plan.end:7;
  Object.assign(scene,{graph:lanesGraph,playerLayout:'function',duration:lastB+2,ink:'#26323B',...laneCodeLines(shared,plan),
    // Dłuższa transformacja — kulka zatrzymuje się w map i zmienia 21 → 42.
    timing:{subscribe:shared?2.4:1.6,travel:1,transform:1.4,terminal:.8,gap:.5},
    rows:shared?[...plan.sessions.map(session=>R(`HTTP ${session.index}`,session.cancelAt===undefined?[E(session.response,'21',laneSubscribers[session.initiator].fill)]:[],
        [B(session.start,session.end,'request',session.cancelAt===undefined?'work':'cancel')],session.cancelAt===undefined?{completeAt:session.response}:{})),
      ...plan.subs.map(sub=>R(`Odbiorca ${sub.id}`,sub.receives?[E(sub.session.response,'42',laneSubscribers[sub.id].fill)]:[],[],sub.receives?{completeAt:sub.session.response}:{}))]:
      [R('HTTP A',[E(5,'21',a)],[B(1,5,'request A')],{completeAt:5}),
      R('HTTP B',[E(7,'21',b)],[B(3,7,'request B')],{completeAt:7}),
      R('Odbiorca A',[E(5,'42',a)],[],{completeAt:5}),R('Odbiorca B',[E(7,'42',b)],[],{completeAt:7})],
    captions:unsub?[[0,'share() za map: HTTP GET → map → share(). Nic jeszcze nie działa'],
      [1,'A subskrybuje share. share podpina się raz: przez map do HTTP, startuje jeden request'],
      [3,'2 s później B subskrybuje share. Upstream zostaje jeden'],
      [4,'A robi unsubscribe. share odłącza tylko A — B nadal słucha, więc request trwa'],
      [5,'HTTP zwraca 21, map daje 42. Odpowiedź dociera tylko do B']]:
      shared?[[0,'share() za map: HTTP GET → map → share(). Nic jeszcze nie działa'],
      [1,'A subskrybuje share. share podpina się raz: przez map do HTTP, startuje jeden request'],
      [3,'2 s później B subskrybuje share. Dostaje własny wiersz, upstream zostaje jeden'],
      [5,'Jedna odpowiedź 21, jedno map → 42. share rozsyła ten sam wynik do A i B, potem complete obu']]:
      [[0,'Cold: jedna definicja HTTP GET → map. Nic jeszcze nie działa'],
      [1,'A subskrybuje. Subskrypcja biegnie przez map do HTTP i startuje request A'],
      [3,'2 s później B subskrybuje tę samą definicję. Cold: drugi tor przez map i drugi request'],
      [5,'Request A zwraca 21. map na torze A zmienia je w 42, A dostaje wynik i complete. Tor B trwa'],
      [7,'Tor B kończy się osobno. Jedna definicja, dwa wykonania']],
    metrics:[{label:'Pipeline',value:()=>1},{label:'Requesty HTTP',value:t=>shared?plan.sessions.filter(session=>t>=session.start).length:(t>=1)+(t>=3)},
      ...(shared?[{label:'Odbiorcy share',value:t=>plan.subs.filter(sub=>t>=sub.start&&t<(sub.unsubAt??sub.session.end)).length}]:[])],
    playback:manual(unsub?[
      {id:'first',event:{type:'connected',edge:'http-map'},offset:.35,caption:'A subskrybuje: share podpina się przez map do HTTP, startuje jeden request'},
      {id:'second',event:{type:'connected',edge:'share-B'},offset:.35,caption:'B ma własny wiersz w share. HTTP i map nadal mają jeden wspólny tor'},
      {id:'question',event:{type:'inner-unsubscribe',edge:'share-A'},caption:'A robi unsubscribe. Czy request HTTP zostanie przerwany?'},
      {id:'cancelled',event:{type:'disconnected',edge:'share-A'},offset:.35,caption:'share odłącza tylko A. B nadal słucha, więc wspólny request trwa'},
      {id:'done',event:{type:'deliver-next',edge:'share-B'},offset:.35,caption:'Odpowiedź dociera tylko do B'},
    ]:shared?[
      {id:'first',event:{type:'connected',edge:'http-map'},offset:.35,caption:'A subskrybuje: share podpina się przez map do HTTP, startuje jeden request'},
      {id:'question',event:{type:'subscribe',edge:'share-B'},caption:'2 s później B subskrybuje ten sam pipeline ze share(). Czy powstanie drugi request?'},
      {id:'second',event:{type:'connected',edge:'share-B'},offset:.35,caption:'B ma własny wiersz w share. HTTP i map nadal mają jeden wspólny tor'},
      {id:'done',event:{type:'deliver-next',edge:'share-B'},offset:.35,caption:'Jedna odpowiedź, map raz. share rozsyła ten sam wynik do A i B'},
    ]:[
      {id:'first',event:{type:'connected',edge:'http-map-A'},offset:.35,caption:'A subskrybuje: map podpina się do HTTP i startuje request A'},
      {id:'question',event:{type:'subscribe',edge:'map-B'},caption:'2 s później B subskrybuje ten sam pipeline. Co stanie się z HTTP?'},
      {id:'second',event:{type:'connected',edge:'http-map-B'},offset:.35,caption:'Drugi tor: osobny request B. Wspólna jest tylko definicja'},
      {id:'done',event:{type:'disconnected',edge:'map-A'},offset:.75,caption:'Tor A zakończony w HTTP, map i u odbiorcy. Tor B trwa dalej'},
    ]),
  });
  // Własny scenariusz share (np. kontrola A/B/C) nie ma postojów ani podpisów slajdu — tylko AUTO.
  if(scene.shareScenario)Object.assign(scene,{captions:[],playback:{entry:'auto',finish:'hold'}});
}

// Wymiary dla projektora, liczone dla 1024×768 (≈0,787 px ekranu na jednostkę viewBox, czyli ×1,27):
// nagłówek ~62 px, wiersz ~70 px, kulka ~46 px (wartość ~28 px), port 18, kabel 4, narożnik 6; nagłówek ~32 px,
// litera ~27 px, inbox ~22 px (drugorzędny). Pipeline zajmuje ~90% szerokości, odstępy są równe, połączenia poziome.
// Wysokość całości (256) mieści się w obu formatach, więc wymiary są wspólne. share ma cztery kolumny, więc klocki
// są węższe (odbiorca mieści dwie kulki — share dostarcza jedną odpowiedź).
export function lanesGraph(scene) {
  const tall=scene.format==='4:3',mode=scene.lanesMode||'cold',shared=mode!=='cold',unsub=mode==='share-unsub';
  const g={top:tall?178:102,...laneLook,
    ...(shared?{httpX:187,httpW:250,mapX:477,mapW:180,shareX:752,shareW:220,recvX:1057,recvW:240,maxBalls:2}:
      {httpX:217,httpW:310,mapX:592,mapW:280,recvX:995,recvW:366,maxBalls:3})};
  const rowY=slot=>laneRowY(g.top,slot),grow=(kind,slots,rows)=>laneTile(kind,g.top,slots,rows);
  const complete=end=>({at:end,kind:'complete'}),fill=id=>laneSubscribers[id].fill;
  const upstreamTile=kind=>shared?grow(kind,Object.fromEntries(plan.sessions.map((session,i)=>[`U${session.index}`,i])),plan.sessions.length):
    grow(kind,{A:0,B:1},2);
  const lane=(id,start,end)=>[
    {id:`http-map-${id}`,from:'http',to:'map',subscriber:id,logicalStart:start,logicalEnd:complete(end),events:[E(end,'21',fill(id))]},
    {id:`map-${id}`,from:'map',to:id,subscriber:id,logicalStart:start,logicalEnd:complete(end),events:[E(end,'42',fill(id))]}];
  // share: tor upstreamu sesji (U1, U2…) w kolorze inicjatora przez HTTP i map; w share kulka rozdziela się na
  // osobne powiadomienia next w kolorach aktywnych Subscriberów (hold: czas rozdzielenia w kafelku).
  const plan=shared?shareSessions(scene.shareScenario||defaultShareScenario(unsub)):null;
  const subIds=shared?plan.subs.map(sub=>sub.id):['A','B'];
  const subscribers={...laneSubscribers,...Object.fromEntries((plan?.sessions||[]).map(session=>
    [`U${session.index}`,{...laneSubscribers[session.initiator],label:''}]))};
  const sharedEdges=shared?[...plan.sessions.flatMap(session=>{
      const id=`U${session.index}`,end=session.cancelAt===undefined?complete(session.response):{at:session.cancelAt,kind:'unsubscribe'};
      const value=v=>session.cancelAt===undefined?[E(session.response,v,subscribers[id].fill)]:[];
      return [{id:upstreamEdge('http',session.index),from:'http',to:'map',subscriber:id,logicalStart:session.start,logicalEnd:end,workUntil:session.response,events:value('21')},
        {id:upstreamEdge('map',session.index),from:'map',to:'share',subscriber:id,logicalStart:session.start,logicalEnd:end,events:value('42')}];
    }),...plan.subs.map(sub=>({id:`share-${sub.id}`,from:'share',to:sub.id,subscriber:sub.id,logicalStart:sub.start,hold:1.2,
      logicalEnd:sub.unsubAt===undefined?complete(sub.session.response):{at:sub.unsubAt,kind:'unsubscribe'},
      events:sub.receives?[E(sub.session.response,'42',fill(sub.id))]:[]}))]:[];
  const receiver=(id,slot)=>laneReceiver(id,id,{x:g.recvX,w:g.recvW,y:rowY(slot)},shared?{rowTint:true}:{});
  // Chwilowy napis zdarzenia: .subscribe() od pojawienia się odbiorcy (0,3 s przed subscribe) do dotarcia impulsu
  // do źródła (cold: HTTP; share: A do HTTP, B tylko do share, bo upstream już działa). Ręczne .unsubscribe()
  // trwa od wywołania do końca animacji anulowania. Pas nad pipeline'em jest pusty, więc napis niczego nie zasłania.
  const callout=(text,id,from,to)=>laneCallout(text,id,from,to,{y:g.top/2}),ev=laneEvent;
  // share: subscribe inicjatora trwa do dotarcia impulsu do HTTP, kolejnych — tylko do share; unsubscribe ostatniego
  // aktywnego trwa, aż anulowanie dotrze do HTTP.
  const callouts=shared?plan.subs.flatMap(sub=>[
    callout('.subscribe()',sub.id,ev('subscribe',`share-${sub.id}`,-.3),
      sub.session.initiator===sub.id&&sub.session.start===sub.start?ev('connected',upstreamEdge('http',sub.session.index)):ev('connected',`share-${sub.id}`)),
    ...(sub.unsubAt===undefined?[]:[callout('.unsubscribe()',sub.id,ev('inner-unsubscribe',`share-${sub.id}`,-.3),
      sub.cancelsUpstream?ev('disconnected',upstreamEdge('http',sub.session.index)):ev('disconnected',`share-${sub.id}`))])]):
    ['A','B'].map(id=>callout('.subscribe()',id,ev('subscribe',`map-${id}`,-.3),ev('connected',`http-map-${id}`)));
  return {layout:'fixed',formatAware:true,width:1240,height:tall?612:460,...laneGraphLook(),
    subscribers,
    nodes:[{id:'http',x:g.httpX,w:g.httpW,label:'HTTP GET',workLanes:true,progressUntilNext:true,...upstreamTile('source')},
      {id:'map',x:g.mapX,w:g.mapW,label:'map',color:'op',transformBalls:true,...upstreamTile('operator')},
      // share: wiersz na Subscribera (w dół, w kolejności dołączania); wejście sesji trafia na wiersz jej inicjatora.
      ...(shared?[{id:'share',x:g.shareX,w:g.shareW,label:'share()',color:'op',splitBalls:true,splitAt:.5,hubFan:false,rowTint:true,
        ...grow('operator',{...Object.fromEntries(plan.subs.map(sub=>[sub.id,sub.slot])),
          ...Object.fromEntries(plan.sessions.map(session=>[`U${session.index}`,plan.subs.find(sub=>sub.id===session.initiator).slot]))},plan.subs.length)}]:[]),
      ...subIds.map((id,slot)=>receiver(id,slot))],
    edges:shared?sharedEdges:[...lane('A',1,5),...lane('B',3,7)],
    trays:subIds.map((id,slot)=>laneTray(id,{x:g.recvX,w:g.recvW,y:rowY(slot)},g.maxBalls)),
    callouts,
  };
}

// interval(1000): emisje bez końca, aż do ręcznego unsubscribe. Scena jest „na żywo”: model jest analityczny
// (emisja co 1 s od zestawionej subskrypcji), a player kompiluje go dla przesuwanego okna czasu (scene.live).
// Bez unsubscribe scena trwa do końca okna; .unsubscribe() wybiera chwilę rezygnacji i kończy scenę.
const intervalTiming={subscribe:.3,connect:.8,period:1,travel:.8,cancel:.8,settle:.8,window:30,keep:5,demoClose:4.95};
export function configureInterval(scene) {
  const t=intervalTiming,start=t.subscribe+t.connect;
  Object.assign(scene,{graph:intervalGraph,playerLayout:'function',ink:'#26323B',playerClass:'rx-flat-tiles',
    title:'interval: strumień bez końca',code:'interval(1000)',
    rows:[R('interval(1000)'),R('Odbiorca A')],
    // window/keep: długość i zapas okna kompilacji (s); defaultClose: rezygnacja dla druku i „pokaż wynik”.
    live:{start,window:t.window,keep:t.keep,margin:2,defaultClose:t.demoClose,variant:intervalVariant},
    playback:{entry:'manual',finish:'hold',live:true,stops:[
      {id:'live',time:start,caption:'interval emituje co sekundę: 0, 1, 2… Sam się nie kończy'}]},
  });
  Object.assign(scene,intervalVariant(scene,{from:0,to:t.window,closedAt:null}));
}

// Wariant sceny dla okna [from, to] i opcjonalnej chwili rezygnacji closedAt (czas ilustracji).
// Wartość wysłana przed rezygnacją dociera do odbiorcy; dopiero potem rusza unsubscribe, a późniejsze emisje nie istnieją.
function intervalVariant(scene,{from,to,closedAt}) {
  const t=intervalTiming,start=scene.live.start,emitAt=k=>start+t.period*(k+1);
  const closed=closedAt!==null&&closedAt!==undefined;
  const last=closed?Math.ceil((closedAt-start)/t.period)-2:Infinity;
  const unsubscribeAt=closed?Math.max(closedAt,last>=0?emitAt(last)+t.travel:closedAt):null;
  const kFrom=Math.max(0,Math.floor((from-start)/t.period)-1),kTo=Math.min(last,Math.floor((to-start)/t.period));
  const emitted=time=>Math.min(last+1,Math.max(0,Math.floor((time-start)/t.period)));
  return {...scene,intervalPlan:{start,kFrom,kTo,unsubscribeAt},
    duration:closed?unsubscribeAt+t.cancel+t.settle:to,
    metrics:[{label:'emisje',value:emitted}],
    captions:[[0,'interval(1000) to definicja. Bez subscribe nic nie emituje'],
      [t.subscribe,'.subscribe() tworzy wykonanie A i łączy je z interval'],
      ...(closed?[[unsubscribeAt,'.unsubscribe() A: rezygnacja biegnie od odbiorcy do interval'],
        [unsubscribeAt+t.cancel,'interval przestał emitować. Bez complete — to rezygnacja odbiorcy, nie koniec strumienia']]:[])]};
}

export function intervalGraph(scene) {
  const t=intervalTiming,{kFrom,kTo,unsubscribeAt}=scene.intervalPlan,start=scene.live.start;
  const top=scene.format==='4:3'?222:146,receiver={x:910,w:400,y:laneRowY(top,0)},fill=laneSubscribers.A.fill;
  const events=[];
  for(let k=kFrom;k<=kTo;k++){const at=start+t.period*(k+1);events.push({...E(at,String(k),fill),logicalAt:at,arrival:at+t.travel});}
  const edge='interval-observer',closed=unsubscribeAt!==null;
  // .unsubscribe() zaczyna się przy odbiorcy (pod jego wierszem), nie w pasie nagłówków.
  const below={x:receiver.x,y:receiver.y+laneLook.rowH/2+48};
  return {layout:'fixed',formatAware:true,width:1240,height:scene.format==='4:3'?612:460,...laneGraphLook(),
    subscribers:{A:laneSubscribers.A},
    nodes:[{id:'interval',x:340,w:420,label:'interval(1000)',...laneTile('source',top,{A:0},1)},
      laneReceiver('observer','A',receiver,{ready:false,born:0})],
    trays:[laneTray('observer',receiver,3)],
    callouts:[subscribeCallout('A',edge,edge,{y:top/2}),
      ...(closed?[laneCallout('.unsubscribe()','A',laneEvent('inner-unsubscribe',edge),laneEvent('disconnected',edge),below)]:[])],
    edges:[{id:edge,from:'interval',to:'observer',subscriber:'A',logicalStart:t.subscribe,cancelPulse:true,events:[]}],
    schedule:{[edge]:{start:t.subscribe,connectDuration:t.connect,events,
      ...(closed?{end:{at:unsubscribeAt,logicalAt:unsubscribeAt,kind:'unsubscribe',duration:t.cancel}}:{})}}};
}

// Wariant HTTP: subskrypcja uruchamia request (praca tylko w kafelku HTTP), odpowiedź „dane” trafia do boxu pod odbiorcą,
// potem complete. Odbiorca ma własny wiersz bez pracy, więc nie pokazuje paska ani „praca trwa”.
export function configureHttp(scene) {
  const response=[E(7,'dane','http')];
  // 9,9 s: complete dociera w 9,1 s, rozbłysk wiersza odbiorcy wygasa przed FINISHED.
  Object.assign(scene,{graph:httpGraph,playerLayout:'function',duration:9.9,ink:'#26323B',playerClass:'rx-flat-tiles',
    title:'HTTP: od definicji do wykonania',code:"http.get('/api/data')",
    // .subscribe(render) dopisuje się z tym samym fade-in co odbiorca (born:1).
    codeFrames:[{at:1,code:"http.get('/api/data').subscribe(render)",fadeIn:.3}],
    rows:[R('HTTP',response,[B(2.1,7,'request')],{completeAt:7}),R('Odbiorca',response)],
    captions:[[0,'Definicja HTTP jest gotowa. Request jeszcze nie istnieje'],[1,'subscribe tworzy odbiorcę i łączy go ze źródłem'],[2.1,'Dopiero subskrypcja uruchamia request'],[7.8,'Odbiorca dostał dane. Za chwilę nadejdzie complete'],[9.2,'Complete kończy to wykonanie HTTP']],
    metrics:[],
    playback:manual([{id:'request',event:{type:'connected',edge:'http-observer'},offset:.35,caption:'Subskrypcja dotarła do HTTP. Request ruszył'},
      {id:'first',event:{type:'deliver-next',edge:'http-observer',value:'dane'},offset:.35,caption:'Odbiorca dostał dane; complete jeszcze nie dotarło'}]),
  });
}

// Wygląd torów: HTTP GET (definicja) → odbiorca A, który pojawia się razem z .subscribe(render). Request to postęp
// w wierszu HTTP od zestawionej subskrypcji do odpowiedzi; „dane” zostają kulką w wierszu odbiorcy, potem complete.
export function httpGraph(scene) {
  const top=scene.format==='4:3'?222:146,receiver={x:910,w:400,y:laneRowY(top,0)};
  // Większa kulka mieści pełne „dane”.
  const ball={r:34,font:26},fill=laneSubscribers.A.fill;
  return {layout:'fixed',formatAware:true,width:1240,height:scene.format==='4:3'?612:460,...laneGraphLook(),ball,
    subscribers:{A:laneSubscribers.A},
    nodes:[{id:'http',x:340,w:420,label:'HTTP GET',workLanes:true,progressUntilNext:true,terminalEdge:'http-observer',...laneTile('source',top,{A:0},1)},
      laneReceiver('observer','A',receiver,{ready:false,born:1})],
    trays:[laneTray('observer',receiver,1,ball)],
    callouts:[subscribeCallout('A','http-observer','http-observer',{y:top/2})],
    edges:[{from:'http',to:'observer',subscriber:'A',events:scene.rows[0].events,logicalStart:1.3}],
    schedule:{'http-observer':{start:1.3,connectDuration:.8,events:[{...scene.rows[0].events[0],color:fill,arrival:7.8}],end:{at:8.3,logicalAt:7,kind:'complete',duration:.8}}}};
}

// Ręczny multicast HTTP w stylu torów 04a: subskrypcje A/B dodają wiersze Subject,
// ale nie tworzą ani nie zarządzają osobnym połączeniem z HTTP.
export function configureSubject(scene) {
  const at={a:1,b:2,http:3,next:7,complete:8},value=E(at.next,'42','#087FAD');
  const ev=(type,edge,offset=0)=>({type,edge,...(offset?{offset}:{})});
  const active=(from,to)=>[{from,to}];
  const subjectMark={id:'subject',bg:'rgba(216,179,230,.45)',line:'#b384c6'};
  const httpMark={id:'http',bg:'rgba(143,201,212,.4)',line:'#238F83'};
  const manualStart=ev('manual-connect','http-subject');
  const lines=[
    [{text:'const subject$ = new Subject<number>();',mark:subjectMark}],
    [{text:'subject$.subscribe(v => renderA(v));',mark:{id:'subscribe-a',bg:laneSubscribers.A.tint,line:laneSubscribers.A.color},
      active:active(ev('subscribe','subject-A',-.3),ev('connected','subject-A'))}],
    [{text:'subject$.subscribe(v => renderB(v));',mark:{id:'subscribe-b',bg:laneSubscribers.B.tint,line:laneSubscribers.B.color},
      active:active(ev('subscribe','subject-B',-.3),ev('connected','subject-B'))}],
    [{text:'http.get<number>(url)',mark:httpMark,active:active(manualStart,ev('source-next','http-subject'))},
      {text:'.subscribe('},{text:'subject$',mark:{...subjectMark,id:'subject-observer'},active:active(manualStart,ev('connected','http-subject'))},{text:');'}],
  ];
  Object.assign(scene,{graph:subjectGraph,subjectTimes:at,playerLayout:'expanded',duration:10,
    rows:[R('HTTP GET',[value],[B(at.http,at.next,'request')],{completeAt:at.complete}),
      R('Odbiorca A',[value],[],{completeAt:at.complete}),R('Odbiorca B',[value],[],{completeAt:at.complete})],
    metrics:[{label:'Requesty HTTP',count:'started'}],ink:'#26323B',playerClass:'rx-flat-tiles rx-subject-http',
    timing:{subscribe:.8,travel:1,terminal:.8,gap:.5},
    title:'Subject: ręczny multicast HTTP',code:lines.map(line=>line.map(part=>part.text).join('')).join('\n'),codeLines:lines,codeFrames:[],
    captions:[[0,'Subject: ręcznie łączymy jedno HTTP z wieloma odbiorcami']],
    playback:manual([
      {id:'subscribed-a',event:ev('connected','subject-A'),offset:.35,caption:'A subskrybuje Subject. HTTP jeszcze nie działa'},
      {id:'subscribed-b',event:ev('connected','subject-B'),offset:.35,caption:'Dwóch odbiorców Subjecta. Nadal zero requestów HTTP'},
      {id:'connect-http',event:manualStart,caption:'Przekazujemy Subject jako Observer: http.get<number>(url).subscribe(subject$)'},
      {id:'request',event:ev('connected','http-subject'),offset:.35,caption:'Osobna subskrypcja uruchomiła jeden request HTTP'},
      {id:'received',event:ev('deliver-next','http-subject'),offset:.35,caption:'Subject odbiera jedną wartość 42 z HTTP'},
      {id:'multicast',event:ev('deliver-next','subject-B'),offset:.35,caption:'Jedna emisja HTTP, dwa powiadomienia next. A i B otrzymali 42'},
      {id:'complete',event:ev('disconnected','subject-B'),offset:.8,caption:'HTTP zakończone. Subject przekazał complete obu odbiorcom'},
    ]),
  });
}

export function subjectGraph(scene) {
  const tall=scene.format==='4:3',top=tall?110:72,at=scene.subjectTimes;
  const receivers=['A','B'].map((id,slot)=>({id,at:{x:995,w:366,y:laneRowY(top,slot)}}));
  const end={at:at.complete,kind:'complete'},value=scene.rows[0].events;
  return {layout:'fixed',formatAware:true,width:1240,height:tall?500:372,...laneGraphLook(),ball:{...laneLook.ball,textFill:'#fff'},
    subscribers:{A:laneSubscribers.A,B:laneSubscribers.B,U:{color:'#238F83',fill:'#238F83',label:''}},
    nodes:[{id:'http',x:217,w:310,label:'HTTP GET',workLanes:true,progressUntilNext:true,...laneTile('source',top,{U:0},1)},
      {id:'subject',x:592,w:280,label:'Subject',splitBalls:true,splitAt:.5,splitGuides:false,upstreamStripe:false,hubFan:false,
        ...laneTile('operator',top,{U:0,A:0,B:1},2)},
      ...receivers.map(r=>laneReceiver(r.id,r.id,r.at,{ready:false}))],
    edges:[{id:'http-subject',from:'http',to:'subject',subscriber:'U',logicalStart:at.http,fixedStart:true,logicalEnd:end,events:value},
      ...receivers.map(r=>({id:'subject-'+r.id,from:'subject',to:r.id,subscriber:r.id,logicalStart:r.id==='A'?at.a:at.b,
        logicalEnd:end,hold:1.2,events:value}))],
    executions:[{id:'request',node:'http',edge:'http-subject',duration:at.next-at.http}],
    trays:receivers.map(r=>laneTray(r.id,r.at,1)),
    callouts:receivers.map(r=>subscribeCallout(r.id,'subject-'+r.id,'subject-'+r.id,{x:850,y:top/2})),
    timeline:[{type:'manual-connect',edge:'http-subject',event:{type:'subscribe',edge:'http-subject'},offset:-.35},
      {type:'subject-summary',event:{type:'disconnected',edge:'subject-B'},offset:1,
        caption:'Subject nie buforuje. Upstream podłączamy i odłączamy ręcznie; share() zarządza nim za nas'}],
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
      // concatAll: wpis kolejki powstaje, gdy utworzone przez map Observable dotrze do concatAll.
      born:job.start,createdBy:all?{edge:'projection-op',value:job.value+'$'}:undefined,ready:false,cancelLabel:'anulowana · ABORT (klient)'});
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
const httpWorkSlides=new Set(['08-map-strumienie','09-concatmap','10-mergemap','11-switchmap','12-exhaustmap']);
const frames = {
  '16:9': {...horizontal,height:460,tileY:50,tileH:76,panelY:148,panelBottom:440,columnH:210,historyTop:41,historyStep:60},
  '4:3': {...horizontal,height:612,tileY:60,tileH:96,panelY:172,panelBottom:592,columnH:300,historyTop:56,historyStep:84},
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
  if (httpWorkSlides.has(scene.id)) configureHttpWorkPanel(graph,scene,frame);
  return graph;
}

// Główny tor S1 nad lokalnymi requestami. Prototypy i dodatki zachowują swoje modele.
function configureHttpWorkPanel(graph,scene,frame) {
  const large=scene.format==='4:3',top=large?28:10,defH=large?70:56,rowH=large?74:64;
  const all=scene.operatorName==='concatAll';
  const laneY=top+defH+rowH/2;
  const main={color:'#7457D9',fill:'#D9CFF5',ink:'#513A9A',label:'S1'};
  Object.assign(graph,{subscribers:{S1:main},laneWire:5,portRadius:11,ball:{r:25,font:29,textFill:'#fff'},
    ...(large?{textScale:1.4,labelScale:1.6}:{})});
  const tiles=all?[['source',145,190,'#8FC9D4'],['projection',400,230,'#D8B3E6'],['op',677.5,235,'#D8B3E6']]:
    [['source',205,310,'#8FC9D4'],['op',600,310,'#D8B3E6']];
  for(const [id,x,w,headerFill] of tiles) {
    Object.assign(graph.nodes.find(n=>n.id===id),{x,w,top,defH,rowH,laneSlots:{S1:0},growRows:true,
      y:top+(defH+rowH)/2,h:defH+rowH,headerFill,runtimeFill:'#EDE6F8',terminalBadge:true,detail:'',statusInside:false,rx:7});
  }
  if(all)graph.nodes.find(n=>n.id==='projection').transformBalls=true;
  const receiver=graph.nodes.find(n=>n.id==='observer');
  Object.assign(receiver,{x:1025,w:370,y:laneY,h:rowH,top:laneY-rowH/2,defH:0,rowH,laneSlots:{S1:0},
    label:'',detail:'',labelOffset:0,ready:false,born:.3,subscriber:'S1',headerFill:'#EAE4F7',runtimeFill:'#EDE6F8',
    terminalBadge:true,statusInside:false,inbox:{size:25,left:16,font:30},rx:7});
  for(const edge of graph.edges.filter(e=>!e.internal))edge.subscriber='S1';
  graph.trays=[{anchor:'observer',x:970,y:laneY,w:270,balls:true,max:4,gap:8,ball:{r:29.5,font:34.2,textFill:'#fff'}}];
  const works=scene.jobs.map((job,i)=>({id:'#'+(i+1),slot:i,value:job.value,color:['#6D4CD3','#B85D05','#087FAD','#B73770'][i%4],
    node:'inner'+i,edge:'inner'+i+'-op',queuedNode:graph.nodes.some(n=>n.id==='queued'+i)?'queued'+i:undefined,
    ...(all?{value:job.value+'$',queueObservable:true,queueLabel:'W KOLEJCE · Observable'}:{}),
    ...(job.ignored?{ignoredNode:'ignored'+i}:{}),
    duration:job.dur??job.end-job.start,stages:[{column:'source',edge:'inner'+i+'-op',progress:true}]}));
  // Kafelek prac stoi pod źródłem i operatorem (lewa krawędź źródła – prawa krawędź operatora), z nagłówkiem
  // i wierszami tej samej wysokości co u góry; porty i kabel wyniku jak w głównym torze.
  const source=graph.nodes.find(n=>n.id==='source'),op=graph.nodes.find(n=>n.id==='op');
  const panel=createInnerWorkPanel({works,height:frame.height,large,headerH:defH,rowH,
    tileLeft:source.x-source.w/2,tileRight:op.x+op.w/2,
    columns:[{id:'source',label:'HTTP GET',fill:'#8FC9D4',runtime:'#E3F0F3'}]});
  Object.assign(panel,{ballText:'#fff',portRadius:11,wire:5,ball:graph.ball});
  graph.panels=[panel];
  for(const node of graph.nodes.filter(n=>n.workRow))Object.assign(node,{x:panel.x+panel.w/2,
    y:panel.rowsTop+node.slot*panel.rowHeight+panel.rowHeight/2,w:panel.w-32,h:panel.rowHeight});
  // Subscribe inner trwa tyle co jeden krok głównego toru (0,8 s), nie cały łańcuch.
  for(const edge of graph.edges.filter(e=>e.from.startsWith('inner')))Object.assign(edge,{travel:1,connect:.8});
  const byValue=new Map(scene.jobs.flatMap((job,i)=>[[job.value,works[i].color],[job.value+'$',works[i].color]]));
  const emitted=new Map(graph.edges.filter(e=>e.from.startsWith('inner')).flatMap(e=>e.events.map(v=>
    [JSON.stringify([v.at,v.value]),byValue.get(v.execution)])));
  for(const edge of graph.edges)edge.events=edge.events.map(e=>({...e,
    color:byValue.get(e.execution)||emitted.get(JSON.stringify([e.at,e.value]))||byValue.get(e.value)||e.color}));
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
      events:httpWorkSlides.has(scene.id)?[E(job.end,job.value,job.color)]:plan.offsets.map((offset,k)=>E(job.start+offset,job.value+(k+1),job.color)),
      spans:[B(job.start,job.end,job.value,'work',{duration:plan.dur})],completeAt:job.end});
  }
  const end = Math.max(...scene.jobs.map(j=>j.end));
  Object.assign(scene.rows.at(-1),{events:scene.rows.slice(1,-1).flatMap(r=>r.events).sort((a,b)=>a.at-b.at),completeAt:end});
  scene.duration = end+1.2;
  scene.captions.at(-1)[0] = end;
  scene.timeline=[httpWorkSlides.has(scene.id)?
    {type:'reception-order',event:{type:'deliver-next',edge:'op-observer',value:'D'},caption:'D dotarło przed C: mergeMap nie zachowuje kolejności wejść.'}:
    {type:'reception-order',event:{type:'deliver-next',edge:'op-observer',value:'D1'},caption:'D1 dotarło przed C2: mergeMap nie zachowuje kolejności wejść.'}];
}

export function configureFlatten(scene,mode) {
  const all=mode==='concatAll',httpWork=httpWorkSlides.has(scene.id),concatHttp=scene.id==='09-concatmap'&&mode==='concatMap';
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
    const ev=httpWork?(job.ignored||job.cancelled?[]:[E(job.end,job.value,job.color)]):job.ignored?[]:(mode==='switchMap'?[1.1]:[.65,1.05]).filter(offset=>job.start+offset<job.end).map((offset,i)=>E(job.start+offset,job.value+(mode==='switchMap'?'':i+1),job.color));
    result.push(...ev);
    rows.push(R(job.value+'$',ev,job.ignored?[]:[...(job.start>job.at?[B(job.at,job.start,job.value+(all?'$':''),'queue')]:[]),
      B(job.start,job.end,job.value,job.cancelled?'cancel':'work',{duration:job.dur})],{completeAt:job.ignored||job.cancelled?undefined:job.end}));
  }
  result.sort((a,b)=>a.at-b.at);
  const completed=Math.max(3,...jobs.filter(j=>!j.ignored).map(j=>j.end));
  rows.push(R('wynik',result,[],{completeAt:completed}));
  const question=all?'A$ pracuje; B$ i C$ już istnieją. Ile requestów uruchomiono?':mode==='switchMap'?'B dotarło podczas HTTP A. Co stanie się z aktywnym requestem?':mode==='concatMap'?'B dotarło podczas A$. Czy B czeka jako wartość?':mode==='mergeMap'?'B dotarło podczas A$. Czy uruchomimy drugą pracę?':'B dotarło podczas A$. Czy powstanie B$?';
  const incoming=all?'projection-op':'source-op';
  Object.assign(scene,{rows,jobs,operatorName:mode,http:httpWork||mode==='switchMap',graph:flattenGraph,duration:completed+1.2,
    // Tempo ilustracji jak w 04a (cold HTTP): krok subscribe 0,8 s, przelot 1 s, przekształcenie w map 1,4 s, terminal 0,8 s.
    ...(httpWork?{playerClass:'rx-flat-tiles',timing:{subscribe:all?2.4:1.6,travel:1,transform:1.4,terminal:.8,gap:.5}}:{}),
    code:httpWork?(all?'source$.pipe(map(id => http.get(url(id))), concatAll())':`${mode==='switchMap'?'id$':'source$'}.pipe(${mode}(id => http.get(url(id))))`):all?'source$.pipe(map(id => request$(id)), concatAll())':mode==='switchMap'?'id$.pipe(switchMap(id => http.get(`/api/users/${id}`)))':`source$.pipe(${mode}(makeInner$))`,
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
  if(concatHttp) {
    scene.captions[0][1]='Każde ID uruchamia jeden HTTP: jedna odpowiedź i complete. Kolejka czeka przed projekcją.';
    scene.playback.stops.find(s=>s.id==='active').caption='Pierwszy HTTP jest aktywny; po odpowiedzi zakończy się i zwolni miejsce.';
  }
  if(httpWork&&all)scene.captions[1][1]='map tworzy A$; samo utworzenie Observable nie uruchamia HTTP.';
  if(httpWork&&!concatHttp)scene.playback.stops.find(s=>s.id==='active').caption='Pierwszy HTTP jest aktywny; każda odpowiedź oznacza jedną wartość i complete.';
  if(mode==='mergeMap')overlapTail(scene);
  configureFlattenPlayback(scene);
}

export function configureFlattenPlayback(scene) {
  const mode=scene.operatorName;
  scene.flattenLayout=true;
  scene.playerLayout='expanded';
  scene.metrics=[{label:'uruchomione',count:'started'},{label:'aktywne',count:'active'}];
  if(scene.playback?.stops)scene.playback={...scene.playback,finish:'hold',stops:scene.playback.stops.map(stop=>
    stop.id==='first'||stop.id==='question'&&['concatMap','concatAll'].includes(mode)?{...stop,offset:.35}:stop)};
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

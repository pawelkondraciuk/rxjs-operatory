import { createInnerWorkPanel } from './inner-work-panel.js';
// Presety są wyłącznie danymi dla wspólnych Node / Edge / Token / History.
const E=(at,value,color='a')=>({at,value,color,kind:'value'});
const R=(label,events=[],spans=[],extra={})=>({label,events,spans,...extra});
const B=(start,end,label,kind='work',extra={})=>({start,end,label,kind,...extra});
const manual=stops=>({entry:'manual',stops,afterLastManualStop:'start-auto',finish:'hold'});

// Operator to funkcja (04-operator): httpGet<User>('/api/users/42').pipe(map(user => `${…} ${…}`)). httpGet to nasz
// klient HTTP (nie RxJS): po subskrypcji uruchamia jeden request, emituje jeden obiekt User i complete. map synchronicznie
// zamienia User w string „Paweł Kondraciuk” — wejście i wynik projekcji mają wspólne logicalAt. Czasy (schedule)
// wyłącznie rozciągają ilustrację; ten sam obiekt User co na Cold i Subject + HTTP wraca na share + HTTP po pytaniu „A share?”.
function mapSequence(scene) {
  const timing={pipeline:.65,handoff:.05,subscribe:1,request:2.6,travel:1.4,transform:2,receivedHold:.5,gap:.3,terminal:1.6,settle:1,
    reveal:.3,laneReveal:.35,...scene.timing};
  for(const [key,value] of Object.entries(timing)) {
    if(!Number.isFinite(value)||value<=0)throw new Error(`${scene.id}: nieprawidłowy czas ilustracji ${key}`);
  }
  const seconds=value=>Math.round(value*1e9)/1e9;
  // subscribe rusza krótko po etapie pipeline (handoff + reveal); odbiorca jest widoczny od READY.
  const born=seconds(timing.pipeline+timing.handoff),subscribe=seconds(born+timing.reveal),connected=seconds(subscribe+timing.subscribe);
  // laneReveal: wiersz HTTP (litera, port, początek postępu) wchodzi po zestawieniu subskrypcji; postój subscribed czeka na niego.
  const subscribed=seconds(connected+timing.laneReveal);
  // Request trwa od zestawienia subskrypcji do odpowiedzi; jedna wartość User, potem complete.
  const response=seconds(subscribed+timing.request),arrival=seconds(response+timing.travel),output=seconds(arrival+timing.transform);
  const received=seconds(output+timing.travel),held=seconds(received+timing.receivedHold);
  // settle: cisza po dotarciu complete, żeby rozbłysk wierszy wygasł przed FINISHED.
  const complete=seconds(held+timing.gap),finished=seconds(complete+timing.terminal),duration=seconds(finished+timing.settle);
  return {timing,seconds,pipeline:timing.pipeline,born,subscribe,connected,subscribed,
    value:{response,arrival,output,received,held},complete,finished,duration};
}
// Kulki: „{…}” — cały obiekt User (jak na Cold), „"…"” — string po projekcji; pełny wynik pokazuje pole odbiorcy.
const operatorBalls={user:'{…}',text:'"…"'};

export function configureOperator(scene) {
  const sequence=mapSequence(scene),{timing,pipeline,value,complete,finished,duration}=sequence;
  const fill=laneSubscribers.A.fill,example="httpGet<User>('/api/users/42')";
  const captions={
    pipeline:'pipe składa definicję: map zamieni User na imię i nazwisko. HTTP nadal nie działa',
    arrived:'subscribe A uruchomił jeden request. HTTP wyemitował User — wartość dotarła do map',
    mapped:'map synchronicznie zamienia User w string „Paweł Kondraciuk”',
    received:'A dostaje jeden string: Paweł Kondraciuk',
    complete:'HTTP wysyła complete. map przekazuje je dalej do A',
  };
  // Wyróżnienia kodu jak na torach 04a i Subject + HTTP: httpGet turkusowo (od wysłania odpowiedzi do dotarcia do map),
  // map fioletowo (podczas przekształcenia). Druga linia pojawia się (fade-in) razem z kafelkiem map; pipe nie uruchamia HTTP.
  const ev=(type,edge)=>({type,edge}),shown={type:'node-create',node:'map'};
  const http={id:'http',bg:'rgba(143,201,212,.4)',line:'#4fa5b5'},map={id:'map',bg:'rgba(216,179,230,.45)',line:'#b384c6'};
  const lines=[[{text:example,mark:http,active:[{from:ev('source-next','source-map'),to:ev('deliver-next','source-map')}]}],
    [{text:'.pipe(',show:shown},{text:'map(user => `${user.firstName} ${user.lastName}`)',mark:map,show:shown,
      active:[{from:ev('deliver-next','source-map'),to:ev('source-next','map-observer')}]},{text:')',show:shown}]];
  Object.assign(scene,{graph:mapGraph,timing,playerLayout:'function',duration,ink:'#26323B',playerClass:'rx-flat-tiles rx-two-lines',
    code:lines.map(line=>line.map(part=>part.text).join('')).join('\n'),codeLines:lines,codeFrames:[],
    rows:[R('HTTP GET',[E(value.response,operatorBalls.user,fill)],[B(sequence.connected,value.response,'request')],{completeAt:complete}),
      R('map',[E(value.response,operatorBalls.text,fill)],[],{completeAt:complete}),
      R('Odbiorca A',[E(value.response,operatorBalls.text,fill)],[],{completeAt:complete})],
    captions:[[0,"httpGet<User>('/api/users/42') to tylko definicja. Request jeszcze nie istnieje"],
      [sequence.seconds(finished+.6),'Jeden request, jeden User, jeden string. complete zakończył wykonanie']],
    metrics:[{label:'Requesty HTTP',count:'started'}],
    playback:{...manual([
      {id:'pipeline',time:pipeline,caption:captions.pipeline},
      // Jeden etap: subscribe A przez map do HTTP, request i emisja User aż do portu map.
      {id:'arrived',time:value.arrival,caption:captions.arrived},
      // Kulka stoi na środku wiersza map i ma już nową wartość (zmiana w połowie projekcji).
      {id:'mapped',time:sequence.seconds(value.arrival+timing.transform*.62),caption:captions.mapped},
      {id:'received',time:value.held,caption:captions.received},
      {id:'complete',time:sequence.seconds(finished+.35),caption:captions.complete},
    ]),controller:'stages'},
  });
}

// Wygląd torów jak w 04a: HTTP GET → map → A w jednym rzędzie (ta sama pojedyncza subskrypcja A co w HTTP i interval).
// Kulka User wjeżdża do map, staje i zmienia się w string; A pokazuje pełny wynik w polu widoku i ✓ complete.
export function mapGraph(scene) {
  const {timing,seconds,subscribe,value,complete,finished}=mapSequence(scene);
  const halfSubscribe=timing.subscribe/2,halfTerminal=timing.terminal/2,fill=laneSubscribers.A.fill;
  const top=scene.format==='4:3'?222:146,y=laneRowY(top,0),receiver={x:960,w:480,y};
  // Kolumny wyśrodkowane (40…1200): HTTP GET, map i szerszy odbiorca, który mieści pełne „Paweł Kondraciuk”.
  const nodes=[
    {id:'source',x:170,w:260,label:'HTTP GET',workLanes:true,progressUntilNext:true,terminalEdge:'source-map',...laneTile('source',top,{A:0},1)},
    {id:'map',x:510,w:240,label:'map',color:'op',transformBalls:true,terminalEdge:'map-observer',...laneTile('operator',top,{A:0},1,{ready:false,born:timing.handoff})},
    // Odbiorca A z ikoną inbox, literą i polem fullName widoczny od READY (jak HTTP GET).
    laneReceiver('observer','A',receiver,{ready:true,laneTerminalText:true,inbox:{...laneInbox(),ready:true}}),
  ];
  // Pole wyniku za inboxem i literą A (jak pola Cold): nazwa wyniku w monospace, po dotarciu — pełny string.
  const k=laneLook.textScale,inbox=laneInbox(),fieldLeft=receiver.x-receiver.w/2+inbox.left+laneLook.icon+8*k+22*k+16;
  const travelResponse=seconds(subscribe+halfSubscribe);
  return {layout:'fixed',formatAware:true,width:1240,height:scene.format==='4:3'?612:460,...laneGraphLook(),ball:viewFieldBall,
    subscribers:{A:laneSubscribers.A},nodes,
    // Wywołanie subscribe to jedna chwila modelu dla całego łańcucha; harmonogram rozciąga tylko ilustrację.
    edges:[{from:'source',to:'map',logicalStart:subscribe,subscriber:'A'},{from:'map',to:'observer',logicalStart:subscribe,subscriber:'A'}],
    trays:[{anchor:'observer',x:fieldLeft,y,w:receiver.x+receiver.w/2-14-fieldLeft,field:{label:'fullName',value:`${coldUser.firstName} ${coldUser.lastName}`}}],
    callouts:[subscribeCallout('A','map-observer','source-map',{y:top/2})],
    executions:[{id:'request',node:'source',edge:'source-map',duration:value.response-travelResponse}],
    schedule:{
      'source-map':{start:travelResponse,connectDuration:halfSubscribe,
        end:{at:complete,logicalAt:complete,kind:'complete',duration:halfTerminal},
        events:[{...E(value.response,operatorBalls.user,fill),arrival:value.arrival}]},
      'map-observer':{start:subscribe,connectDuration:halfSubscribe,
        end:{at:seconds(complete+halfTerminal),logicalAt:complete,kind:'complete',duration:finished-seconds(complete+halfTerminal)},
        // Projekcja jest synchroniczna: wynik ma logicalAt wejścia (odpowiedzi HTTP).
        events:[{...E(value.output,operatorBalls.text,fill),logicalAt:value.response,arrival:value.received}]},
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
// Kod torów share: stale tylko definicja pipeline'u (bez nazwy data$), fragmenty w kolorach klocków; fragment świeci,
// gdy jego klocek pracuje (HTTP — odpowiedź wylatuje, map — przekształcenie, share — rozdzielenie wartości).
function laneCodeLines(plan) {
  const mark=(id,bg,line)=>({id,bg,line}),op=['rgba(216,179,230,.45)','#b384c6'];
  const http=mark('http','rgba(143,201,212,.4)','#4fa5b5'),map=mark('map',...op),share=mark('share',...op);
  const during=(from,to)=>({from,to}),ev=(type,edge)=>({type,edge});
  // Wyróżnienia dla sesji, które dostarczyły odpowiedź, i Subscriberów, którzy ją dostali (zależne od scenariusza).
  const sessions=plan.sessions.filter(session=>session.cancelAt===undefined);
  const response=sessions.map(session=>during(ev('source-next',upstreamEdge('http',session.index)),ev('deliver-next',upstreamEdge('http',session.index))));
  const transform=sessions.map(session=>during(ev('deliver-next',upstreamEdge('http',session.index)),ev('source-next',upstreamEdge('map',session.index))));
  const split=sessions.flatMap(session=>{const sub=plan.subs.find(x=>x.session===session&&x.receives);
    return sub?[during(ev('deliver-next',upstreamEdge('map',session.index)),ev('source-next',`share-${sub.id}`))]:[];});
  // Pipe łamie się świadomie przed .pipe (bez przypadkowego zawijania w środku wywołania).
  const lines=[[{text:'httpGet<number>(url)',mark:http,active:response}],
    [{text:'  .pipe('},{text:'map(x => x * 2)',mark:map,active:transform},{text:', '},
      {text:'share()',mark:share,active:split},{text:')'}]];
  return {codeLines:lines,code:lines.map(line=>line.map(part=>part.text).join('')).join('\n'),codeFrames:[],playerClass:'rx-lanes rx-flat-tiles'};
}
// Cold (04a-dwa-tory): trzy pola widoku potrzebują danych tego samego użytkownika. Każde subskrybuje ten sam zimny
// user$ (kolejno, co 0,25 s czasu modelu), więc powstają trzy niezależne, identyczne requesty, które trwają jednocześnie.
// HTTP B kończy się błędem (error w 2,8 s), gdy A i C nadal pracują: bez User i bez complete; pole B pokazuje „Błąd”.
// A i C emitują cały obiekt User — kulka „{…}”, bez rozbijania na pola; odbiorca wyświetla tylko swoją właściwość.
// complete 1 s po next (jak w Subject i share), żeby odbiór i zakończenie były osobnymi etapami.
const coldUser={firstName:'Paweł',lastName:'Kondraciuk',city:'Białystok'},coldUserSymbol='{…}';
const coldFields=[{id:'A',key:'firstName',start:1},{id:'B',key:'lastName',start:1.25},{id:'C',key:'city',start:1.5}]
  .map((f,slot)=>({...f,slot,edge:`http-${f.id}`,label:`user.${f.key}`,value:coldUser[f.key],response:f.start+3,complete:f.start+4}));
// Scenariusz Cold: wykonanie B kończy się błędem przed odpowiedziami A i C (pozostałe slajdy używają coldFields bez zmian).
const coldErrors={B:2.8},coldFieldError='Błąd';
const coldOutcome=f=>coldErrors[f.id]===undefined?{kind:'complete',at:f.complete}:{kind:'error',at:coldErrors[f.id]};
// Pola widoku A/B/C wspólne dla Cold i Subject: ta sama kolumna (x/w 960/436), wiersze na torach, etykieta właściwości
// i miejsce na wartość (tray.field). Kulka obiektu ma ten sam rozmiar na obu slajdach.
const viewFieldBall={r:34,font:26};
function viewFields(top,extra={},fields=coldFields) {
  const g={x:960,w:436},pos=f=>({x:g.x,w:g.w,y:laneRowY(top,f.slot)}),k=laneLook.textScale,inbox=laneInbox();
  const fieldLeft=g.x-g.w/2+inbox.left+laneLook.icon+8*k+22*k+16;
  return {left:g.x-g.w/2,
    nodes:fields.map(f=>laneReceiver(f.id,f.id,pos(f),{ready:true,...extra})),
    trays:fields.map(f=>({anchor:f.id,x:fieldLeft,y:pos(f).y,w:g.x+g.w/2-14-fieldLeft,field:{label:f.label,value:f.value}}))};
}
function configureColdFields(scene) {
  const ev=(type,edge)=>({type,edge}),during=(from,to)=>({from,to}),user=f=>E(f.response,coldUserSymbol,laneSubscribers[f.id].fill);
  const http={id:'http',bg:'rgba(143,201,212,.4)',line:'#4fa5b5'},last=coldFields.at(-1);
  const ok=coldFields.filter(f=>coldOutcome(f).kind==='complete'),failed=coldFields.filter(f=>coldOutcome(f).kind==='error');
  // Jedna definicja; httpGet świeci, gdy któreś udane wykonanie wysyła odpowiedź.
  const lines=[[{text:'const user$ = '},{text:"httpGet<User>('/api/users/42')",mark:http,
    active:ok.map(f=>during(ev('source-next',f.edge),ev('deliver-next',f.edge)))},{text:';'}]];
  Object.assign(scene,{graph:coldFieldsGraph,playerLayout:'function',duration:last.complete+2,ink:'#26323B',
    codeLines:lines,code:lines[0].map(part=>part.text).join(''),codeFrames:[],playerClass:'rx-lanes rx-flat-tiles',
    // Jeden przeskok (odbiorca → HTTP), więc subscribe trwa 1,2 s zamiast 1,6 s przez map.
    timing:{subscribe:1.2,travel:1,transform:1.4,terminal:.8,gap:.5},
    rows:[...coldFields.map((f,i)=>{const end=coldOutcome(f);
        return R(`HTTP #${i+1}`,end.kind==='error'?[]:[user(f)],[B(f.start,end.kind==='error'?end.at:f.response,'request',end.kind==='error'?'error':'work')],
          end.kind==='error'?{}:{completeAt:f.complete});}),
      ...coldFields.map(f=>R(`Pole ${f.label}`,coldOutcome(f).kind==='error'?[]:[user(f)],[],coldOutcome(f).kind==='error'?{}:{completeAt:f.complete}))],
    captions:[[0,'Jedna definicja user$. Trzy pola widoku czekają na dane. Nic jeszcze nie działa'],
      [coldFields[0].start,'A (user.firstName) subskrybuje user$ i uruchamia HTTP #1'],
      [coldFields[1].start,'B (user.lastName) subskrybuje ten sam user$ i uruchamia HTTP #2'],
      [coldFields[2].start,'C (user.city) robi to samo: HTTP #3. Trzy requesty trwają jednocześnie'],
      [ok[0].response,'A dostaje cały obiekt User i pokazuje imię'],
      [ok.at(-1).response,'C dostaje cały obiekt User i pokazuje miasto']],
    metrics:[{label:'Observable',value:()=>1},{label:'Requesty HTTP',count:'started'}],
    playback:manual([
      {id:'requests',event:ev('connected',last.edge),offset:.35,caption:'A, B i C subskrybują ten sam user$. Trzy requesty HTTP trwają jednocześnie'},
      // Pytanie: błąd B dotarł do pola, A i C nadal pracują — czy też się zatrzymają?
      {id:'error',event:ev('disconnected',failed[0].edge),offset:.35,caption:'HTTP #2 kończy się błędem. Czy pozostałe requesty też się zatrzymają?'},
      {id:'answer',event:ev('disconnected',ok.at(-1).edge),offset:.5,caption:'Nie: A i C kończą się poprawnie — User i complete. Każde wykonanie ma własny cykl życia'},
    ]),
  });
}

// Wymiary jak w pozostałych torach (laneLook, wspólne dla 4:3 i 16:9 poza top). Bez map są dwie kolumny: HTTP GET
// z trzema wierszami wykonań i trzy kompaktowe pola widoku. Pole: pasek toru, inbox, litera, etykieta właściwości
// (monospace) i miejsce na wartość — puste do dotarcia User, potem wybrana właściwość (tray.field).
export function coldFieldsGraph(scene) {
  const tall=scene.format==='4:3',top=tall?178:102,g={httpX:272,httpW:420,recvX:960},fields=viewFields(top);
  return {layout:'fixed',formatAware:true,width:1240,height:tall?612:460,...laneGraphLook(),
    // Kulka jak „dane” w HTTP 05-zrodla-2 (r 34/font 26); symbol obiektu „{…}” z marginesem od brzegu.
    ball:viewFieldBall,
    subscribers:{A:laneSubscribers.A,B:laneSubscribers.B,C:laneSubscribers.C},
    nodes:[{id:'http',x:g.httpX,w:g.httpW,label:'HTTP GET',workLanes:true,progressUntilNext:true,
      ...laneTile('source',top,Object.fromEntries(coldFields.map(f=>[f.id,f.slot])),coldFields.length)},
      // Pola widoku istnieją od READY (puste); litera i inbox wykonania pojawiają się z subscribe. Status zakończenia
      // (✓ complete / ! error) tylko przy polach Cold — pozostałe slajdy z viewFields bez zmian.
      ...fields.nodes.map(n=>({...n,laneTerminalText:true}))],
    // Wykonanie z błędem: bez next i complete, tylko error; postęp liczony do spodziewanej odpowiedzi (workUntil),
    // więc w chwili błędu pasek staje w połowie, jak w A i C, zamiast dobiegać do końca.
    edges:coldFields.map(f=>{const end=coldOutcome(f);
      return {id:f.edge,from:'http',to:f.id,subscriber:f.id,logicalStart:f.start,logicalEnd:end,
        ...(end.kind==='error'?{events:[],workUntil:f.response}:{events:[E(f.response,coldUserSymbol,laneSubscribers[f.id].fill)]})};}),
    executions:coldFields.map((f,i)=>({id:`http-${i+1}`,node:'http',edge:f.edge,
      duration:(coldOutcome(f).kind==='error'?coldOutcome(f).at:f.response)-f.start})),
    // Pole z błędem pokazuje „Błąd” w miejscu placeholdera (field.error), pozostałe — swoją właściwość User.
    trays:fields.trays.map(t=>coldErrors[t.anchor]===undefined?t:{...t,field:{...t.field,error:coldFieldError}}),
    // .subscribe() nad kolumną pól, od subscribe do dotarcia impulsu do HTTP. Pola są widoczne od READY, więc
    // bez wyprzedzenia 0,3 s — napis B nie pojawia się jeszcze na postoju first.
    callouts:coldFields.map(f=>laneCallout('.subscribe()',f.id,laneEvent('subscribe',f.edge),laneEvent('connected',f.edge),{x:g.recvX,y:top/2})),
    timeline:[{type:'cold-summary',event:{type:'disconnected',edge:coldFields.at(-1).edge},offset:1,
      caption:'Jedna definicja, trzy wykonania i trzy identyczne requesty — każde z własnym zakończeniem'}],
  };
}

// Slajdy: -2 — A w 1 s, B w 3 s, jedna odpowiedź w 5 s dla obu; -3 — dodatkowo A robi unsubscribe w 4 s.
const defaultShareScenario=unsub=>[{id:'A',start:1,...(unsub?{unsub:4}:{})},{id:'B',start:3}];
export function configureLanes(scene) {
  if((scene.lanesMode||'cold')==='cold')return configureColdFields(scene);
  if(scene.lanesMode==='share'&&!scene.shareScenario)return configureShareFields(scene);
  if(scene.lanesMode==='share-interval'&&!scene.shareScenario)return configureShareInterval(scene);
  const unsub=scene.lanesMode==='share-unsub',plan=shareSessions(scene.shareScenario||defaultShareScenario(unsub));
  Object.assign(scene,{graph:lanesGraph,playerLayout:'function',duration:plan.end+2,ink:'#26323B',...laneCodeLines(plan),
    // Dłuższa transformacja — kulka zatrzymuje się w map i zmienia 21 → 42.
    timing:{subscribe:2.4,travel:1,transform:1.4,terminal:.8,gap:.5},
    rows:[...plan.sessions.map(session=>R(`HTTP ${session.index}`,session.cancelAt===undefined?[E(session.response,'21',laneSubscribers[session.initiator].fill)]:[],
        [B(session.start,session.end,'request',session.cancelAt===undefined?'work':'cancel')],session.cancelAt===undefined?{completeAt:session.response}:{})),
      ...plan.subs.map(sub=>R(`Odbiorca ${sub.id}`,sub.receives?[E(sub.session.response,'42',laneSubscribers[sub.id].fill)]:[],[],sub.receives?{completeAt:sub.session.response}:{}))],
    captions:unsub?[[0,'share() za map: HTTP GET → map → share(). Nic jeszcze nie działa'],
      [1,'A subskrybuje share. share podpina się raz: przez map do HTTP, startuje jeden request'],
      [3,'2 s później B subskrybuje share. Upstream zostaje jeden'],
      [4,'A robi unsubscribe. share odłącza tylko A — B nadal słucha, więc request trwa'],
      [5,'HTTP zwraca 21, map daje 42. Odpowiedź dociera tylko do B']]:
      [[0,'share() za map: HTTP GET → map → share(). Nic jeszcze nie działa'],
      [1,'A subskrybuje share. share podpina się raz: przez map do HTTP, startuje jeden request'],
      [3,'2 s później B subskrybuje share. Dostaje własny wiersz, upstream zostaje jeden'],
      [5,'Jedna odpowiedź 21, jedno map → 42. share rozsyła ten sam wynik do A i B, potem complete obu']],
    metrics:[{label:'Pipeline',value:()=>1},{label:'Requesty HTTP',value:t=>plan.sessions.filter(session=>t>=session.start).length},
      {label:'Odbiorcy share',value:t=>plan.subs.filter(sub=>t>=sub.start&&t<(sub.unsubAt??sub.session.end)).length}],
    playback:manual(unsub?[
      {id:'first',event:{type:'connected',edge:'http-map'},offset:.35,caption:'A subskrybuje: share podpina się przez map do HTTP, startuje jeden request'},
      {id:'second',event:{type:'connected',edge:'share-B'},offset:.35,caption:'B ma własny wiersz w share. HTTP i map nadal mają jeden wspólny tor'},
      {id:'question',event:{type:'inner-unsubscribe',edge:'share-A'},caption:'A robi unsubscribe. Czy request HTTP zostanie przerwany?'},
      {id:'cancelled',event:{type:'disconnected',edge:'share-A'},offset:.35,caption:'share odłącza tylko A. B nadal słucha, więc wspólny request trwa'},
      {id:'done',event:{type:'deliver-next',edge:'share-B'},offset:.35,caption:'Odpowiedź dociera tylko do B'},
    ]:[
      {id:'first',event:{type:'connected',edge:'http-map'},offset:.35,caption:'A subskrybuje: share podpina się przez map do HTTP, startuje jeden request'},
      {id:'question',event:{type:'subscribe',edge:'share-B'},caption:'2 s później B subskrybuje ten sam pipeline ze share(). Czy powstanie drugi request?'},
      {id:'second',event:{type:'connected',edge:'share-B'},offset:.35,caption:'B ma własny wiersz w share. HTTP i map nadal mają jeden wspólny tor'},
      {id:'done',event:{type:'deliver-next',edge:'share-B'},offset:.35,caption:'Jedna odpowiedź, map raz. share rozsyła ten sam wynik do A i B'},
    ]),
  });
  // Własny scenariusz share (np. kontrola A/B/C) nie ma postojów ani podpisów slajdu — tylko AUTO.
  if(scene.shareScenario)Object.assign(scene,{captions:[],playback:{entry:'auto',finish:'hold'}});
}

// share() (04a-dwa-tory-2): kontynuacja Cold → Subject. Ten sam wygląd i narracja co Subject + HTTP (kolumny 177/517,
// pola widoku A/B/C z Cold), ale bez ręcznego podłączania. READY: definicja user$ (nagłówek HTTP GET) i trzy puste pola;
// pierwszy krok dopisuje .pipe(share()) i ujawnia kafelek share(). Pierwszy Subscriber A przez share() uruchamia jedyne
// HTTP (tor #1 w kolorze A — wykonanie zainicjowane przez A, zarządzane przez share); B, a potem C dołączają w trakcie
// requestu i ich subskrypcje kończą się na share(). Jedna kulka User rozdziela się na porcie share() na trzy identyczne
// powiadomienia next (kolor wspólnego wykonania), jedno complete trafia do A, B i C. Bez map, unsubscribe i ponownego
// requestu. Jawny harmonogram (czas ilustracji = czas modelu), jak w Subject + HTTP.
// link 0,5 s na odcinek: od operatorów subskrypcja nie wymaga już tłumaczenia, więc animacje są krótsze.
const shareFieldTimes={born:.3,defined:.6,a:1.3,b:3,c:4.3,link:.5,response:7,travel:1,hold:1.2,complete:11.2,terminal:.8};
const shareFields=coldFields.map(f=>({...f,edge:'share-'+f.id,start:shareFieldTimes[f.id.toLowerCase()]}));
function configureShareFields(scene) {
  const t=shareFieldTimes,ev=(type,edge)=>({type,edge}),during=(from,to)=>({from,to});
  const upstreamStart=t.a+t.link,arrival=t.response+t.travel,split=arrival+t.hold,delivered=split+t.travel;
  const upstreamEnd=t.complete+t.terminal,downstreamEnd=upstreamEnd+t.terminal;
  const at={...t,upstreamStart,arrival,split,delivered,upstreamEnd,downstreamEnd,duration:downstreamEnd+2.2};
  const http={id:'http',bg:'rgba(143,201,212,.4)',line:'#4fa5b5'},share={id:'share',bg:'rgba(216,179,230,.45)',line:'#b384c6'};
  const value=E(at.response,coldUserSymbol,laneSubscribers.A.fill),defined={type:'node-create',node:'share'};
  // Kod rośnie jak w Subject + HTTP: READY — sama definicja user$ ze średnikiem; z kafelkiem share() średnik gaśnie,
  // a w zarezerwowanej drugiej linii pojawia się .pipe(share()). httpGet świeci podczas odpowiedzi, share() — przy
  // rozesłaniu next i complete (jak Subject).
  const lines=[[{text:'const user$ = '},{text:"httpGet<User>('/api/users/42')",mark:http,
      active:[during(ev('source-next','http-share'),ev('deliver-next','http-share'))]},{text:';',hide:defined}],
    [{text:'  .pipe(',show:defined},{text:'share()',mark:share,show:defined,active:[during(ev('deliver-next','http-share'),ev('source-next','share-A')),
      during(ev('disconnected','http-share'),ev('disconnected','share-A'))]},{text:');',show:defined}]];
  Object.assign(scene,{graph:shareFieldsGraph,shareFieldTimes:at,playerLayout:'function',duration:at.duration,ink:'#26323B',
    title:'share(): jedno HTTP, trzech odbiorców',playerClass:'rx-lanes rx-flat-tiles rx-code-steps',
    code:lines.map(line=>line.map(part=>part.text).join('')).join('\n'),codeLines:lines,codeFrames:[],
    rows:[R('HTTP #1',[value],[B(upstreamStart,at.response,'request')],{completeAt:at.complete}),
      ...shareFields.map(f=>R(`Pole ${f.label}`,[{...value,at:split}],[],{completeAt:upstreamEnd}))],
    captions:[[0,'user$ = httpGet(...): jedna definicja. Trzy pola czekają. Nic jeszcze nie działa'],
      [at.born,'.pipe(share()) dodaje operator. Nadal nic nie działa'],
      [at.a,'A subskrybuje. share() sam podłącza się do HTTP i uruchamia jeden request'],
      [at.b,'B dołącza do share(). HTTP nadal wykonuje jeden request'],
      [at.c,'C też dołącza do share(). Nadal jeden request'],
      [at.response,'HTTP emituje jeden obiekt User. share() rozsyła go do A, B i C'],
      [at.complete,'complete przechodzi przez share() do A, B i C']],
    // Odbiorcy share(): subskrypcje zestawione (dotarły do share()).
    metrics:[{label:'Odbiorcy',value:time=>shareFields.filter(f=>time>=f.start+at.link).length},{label:'Requesty HTTP',count:'started'}],
    playback:manual([
      {id:'share-added',event:defined,offset:at.defined,caption:'.pipe(share()): operator stoi między HTTP a polami. Nadal brak subskrypcji i requestu'},
      {id:'subscribed-a',event:ev('connected','http-share'),offset:.35,caption:'A subskrybuje. share() podłącza się do HTTP i uruchamia request #1'},
      // Najważniejszy kadr: A i B aktywni, C jeszcze nie, HTTP #1 nadal pracuje — jedno wykonanie upstream.
      {id:'joined-b',event:ev('connected','share-B'),offset:.35,caption:'B dołącza do istniejącego share(). HTTP #1 trwa dalej — bez nowego requestu'},
      {id:'joined-c',event:ev('connected','share-C'),offset:.35,caption:'C też dołącza do share(). Trzech odbiorców, nadal jeden request'},
      {id:'multicast',event:ev('deliver-next','share-C'),offset:.35,caption:'HTTP emituje jeden obiekt User. share() rozsyła go do A, B i C'},
      {id:'complete',event:ev('disconnected','share-C'),offset:.8,caption:'complete dociera przez share() do A, B i C. Jeden request, trzech odbiorców'},
    ]),
  });
}

export function shareFieldsGraph(scene) {
  const tall=scene.format==='4:3',top=tall?178:102,at=scene.shareFieldTimes;
  // Kolumny jak w Subject + HTTP: HTTP GET 177/230, share() 517/230 (w miejscu Subject), pola A/B/C 960/436.
  // Pola istnieją od READY (puste, jak na Cold); wiersze share() rosną, gdy subskrypcja dociera do kafelka.
  const g={httpX:177,httpW:230,shareX:517,shareW:230},fields=viewFields(top,{},shareFields);
  const complete=(end,logicalAt=end)=>({at:end,logicalAt,kind:'complete',duration:at.terminal});
  const value={value:coldUserSymbol,color:laneSubscribers.A.fill};
  return {layout:'fixed',formatAware:true,width:1240,height:tall?612:460,...laneGraphLook(),ball:viewFieldBall,
    // U1: wspólne wykonanie HTTP w kolorze A, który je uruchomił (konwencja share); B ma w share() lewy pasek tego koloru.
    subscribers:{A:laneSubscribers.A,B:laneSubscribers.B,C:laneSubscribers.C,U1:{...laneSubscribers.A,label:'#1'}},
    nodes:[{id:'http',x:g.httpX,w:g.httpW,label:'HTTP GET',workLanes:true,progressUntilNext:true,...laneTile('source',top,{U1:0},1)},
      // share() pojawia się w pierwszym kroku (razem z .pipe(share())); geometria zarezerwowana od READY.
      // Wejście upstreamu na wysokości wiersza A (prosty kabel z #1); splitAt:0 — kulka rozdziela się na porcie wejściowym.
      {id:'share',x:g.shareX,w:g.shareW,label:'share()',color:'op',splitBalls:true,splitAt:0,splitGuides:false,hubFan:false,
        ...laneTile('operator',top,{U1:0,...Object.fromEntries(shareFields.map(f=>[f.id,f.slot]))},shareFields.length),ready:false,born:at.born},
      // Status ✓ complete przy polach po dotarciu zielonego impulsu (jak na Cold).
      ...fields.nodes.map(n=>({...n,laneTerminalText:true}))],
    // logicalStart upstreamu = chwila subscribe A: inicjator dołącza wtedy, gdy share() otwiera wykonanie #1 (lewy pasek
    // wiersza A w kolorze upstreamu, jak B i C); harmonogram ilustracji startuje po dotarciu A do share().
    edges:[{id:'http-share',from:'http',to:'share',subscriber:'U1',logicalStart:at.a,fixedStart:true,logicalEnd:complete(at.complete)},
      ...shareFields.map(f=>({id:f.edge,from:'share',to:f.id,subscriber:f.id,logicalStart:f.start,fixedStart:true,logicalEnd:complete(at.upstreamEnd)}))],
    // A: subscribe do share(), po zestawieniu share() subskrybuje HTTP (jedyne wykonanie). B i C kończą się na share().
    // Trzy powiadomienia jednej emisji: wspólny czas i kolor — wychodzą z share() jednocześnie.
    schedule:{'http-share':{start:at.upstreamStart,connectDuration:at.link,events:[{...value,at:at.response,arrival:at.arrival}],end:complete(at.complete)},
      ...Object.fromEntries(shareFields.map(f=>[f.edge,{start:f.start,connectDuration:at.link,
        events:[{...value,at:at.split,arrival:at.delivered,logicalAt:at.response}],end:complete(at.upstreamEnd)}]))},
    executions:[{id:'http-1',node:'http',edge:'http-share',duration:at.response-at.upstreamStart}],
    trays:fields.trays,
    // .subscribe() A trwa do dotarcia impulsu do HTTP, B i C — tylko do share() (upstream już działa). Pola są widoczne
    // od READY, więc napis startuje razem z subscribe (jak na Cold).
    callouts:[laneCallout('.subscribe()','A',laneEvent('subscribe','share-A'),laneEvent('connected','http-share'),{x:960,y:top/2}),
      ...shareFields.slice(1).map(f=>laneCallout('.subscribe()',f.id,laneEvent('subscribe',f.edge),laneEvent('connected',f.edge),{x:960,y:top/2}))],
    timeline:[{type:'share-summary',event:{type:'disconnected',edge:'share-C'},offset:1,
      caption:'Jeden request, trzech odbiorców. Bez ręcznego podłączania Subjecta do HTTP'}],
  };
}

// Wymiary dla projektora, liczone dla 1024×768 (≈0,787 px ekranu na jednostkę viewBox, czyli ×1,27):
// nagłówek ~62 px, wiersz ~70 px, kulka ~46 px (wartość ~28 px), port 18, kabel 4, narożnik 6; nagłówek ~32 px,
// litera ~27 px, inbox ~22 px (drugorzędny). Pipeline zajmuje ~90% szerokości, odstępy są równe, połączenia poziome.
// Wysokość całości mieści się w obu formatach, więc wymiary są wspólne. share ma cztery kolumny, więc klocki
// są węższe (odbiorca mieści dwie kulki — share dostarcza jedną odpowiedź).
export function lanesGraph(scene) {
  const tall=scene.format==='4:3',unsub=scene.lanesMode==='share-unsub';
  const g={top:tall?178:102,...laneLook,httpX:187,httpW:250,mapX:477,mapW:180,shareX:752,shareW:220,recvX:1057,recvW:240,maxBalls:2};
  const rowY=slot=>laneRowY(g.top,slot),grow=(kind,slots,rows)=>laneTile(kind,g.top,slots,rows);
  const complete=end=>({at:end,kind:'complete'}),fill=id=>laneSubscribers[id].fill;
  const upstreamTile=kind=>grow(kind,Object.fromEntries(plan.sessions.map((session,i)=>[`U${session.index}`,i])),plan.sessions.length);
  // Tor upstreamu sesji (U1, U2…) w kolorze inicjatora przez HTTP i map; w share kulka rozdziela się na
  // osobne powiadomienia next w kolorach aktywnych Subscriberów (hold: czas rozdzielenia w kafelku).
  const plan=shareSessions(scene.shareScenario||defaultShareScenario(unsub));
  const subIds=plan.subs.map(sub=>sub.id);
  const subscribers={...laneSubscribers,...Object.fromEntries(plan.sessions.map(session=>
    [`U${session.index}`,{...laneSubscribers[session.initiator],label:''}]))};
  const edges=[...plan.sessions.flatMap(session=>{
      const id=`U${session.index}`,end=session.cancelAt===undefined?complete(session.response):{at:session.cancelAt,kind:'unsubscribe'};
      const value=v=>session.cancelAt===undefined?[E(session.response,v,subscribers[id].fill)]:[];
      return [{id:upstreamEdge('http',session.index),from:'http',to:'map',subscriber:id,logicalStart:session.start,logicalEnd:end,workUntil:session.response,events:value('21')},
        {id:upstreamEdge('map',session.index),from:'map',to:'share',subscriber:id,logicalStart:session.start,logicalEnd:end,events:value('42')}];
    }),...plan.subs.map(sub=>({id:`share-${sub.id}`,from:'share',to:sub.id,subscriber:sub.id,logicalStart:sub.start,hold:1.2,
      logicalEnd:sub.unsubAt===undefined?complete(sub.session.response):{at:sub.unsubAt,kind:'unsubscribe'},
      events:sub.receives?[E(sub.session.response,'42',fill(sub.id))]:[]}))];
  const receiver=(id,slot)=>laneReceiver(id,id,{x:g.recvX,w:g.recvW,y:rowY(slot)},{rowTint:true});
  // Chwilowy napis zdarzenia: .subscribe() od pojawienia się odbiorcy (0,3 s przed subscribe) do dotarcia impulsu
  // do źródła (A do HTTP, B tylko do share, bo upstream już działa). Ręczne .unsubscribe() trwa od wywołania
  // do końca animacji anulowania. Pas nad pipeline'em jest pusty, więc napis niczego nie zasłania.
  const callout=(text,id,from,to)=>laneCallout(text,id,from,to,{y:g.top/2}),ev=laneEvent;
  // Subscribe inicjatora trwa do dotarcia impulsu do HTTP, kolejnych — tylko do share; unsubscribe ostatniego
  // aktywnego trwa, aż anulowanie dotrze do HTTP.
  const callouts=plan.subs.flatMap(sub=>[
    callout('.subscribe()',sub.id,ev('subscribe',`share-${sub.id}`,-.3),
      sub.session.initiator===sub.id&&sub.session.start===sub.start?ev('connected',upstreamEdge('http',sub.session.index)):ev('connected',`share-${sub.id}`)),
    ...(sub.unsubAt===undefined?[]:[callout('.unsubscribe()',sub.id,ev('inner-unsubscribe',`share-${sub.id}`,-.3),
      sub.cancelsUpstream?ev('disconnected',upstreamEdge('http',sub.session.index)):ev('disconnected',`share-${sub.id}`))])]);
  return {layout:'fixed',formatAware:true,width:1240,height:tall?612:460,...laneGraphLook(),
    subscribers,
    nodes:[{id:'http',x:g.httpX,w:g.httpW,label:'HTTP GET',workLanes:true,progressUntilNext:true,...upstreamTile('source')},
      {id:'map',x:g.mapX,w:g.mapW,label:'map',color:'op',transformBalls:true,...upstreamTile('operator')},
      // Wiersz na Subscribera (w dół, w kolejności dołączania); wejście sesji trafia na wiersz jej inicjatora.
      {id:'share',x:g.shareX,w:g.shareW,label:'share()',color:'op',splitBalls:true,splitAt:.5,hubFan:false,rowTint:true,
        ...grow('operator',{...Object.fromEntries(plan.subs.map(sub=>[sub.id,sub.slot])),
          ...Object.fromEntries(plan.sessions.map(session=>[`U${session.index}`,plan.subs.find(sub=>sub.id===session.initiator).slot]))},plan.subs.length)},
      ...subIds.map((id,slot)=>receiver(id,slot))],
    edges,
    trays:subIds.map((id,slot)=>laneTray(id,{x:g.recvX,w:g.recvW,y:rowY(slot)},g.maxBalls)),
    callouts,
  };
}

// share() i późny odbiorca (20-sharereplay): HTTP GET → share() → A/B w wyglądzie torów, kolumny jak cold.
// Dwa krótkie kroki: A uruchamia HTTP #1, które niemal od razu emituje 42 i kończy się; share() resetuje się po complete
// (resetOnComplete: true). B subskrybuje dopiero potem i uruchamia HTTP #2 — jedna definicja, dwa wykonania (tory #1 i #2
// w kolorach inicjatorów). Kulka 42 ma kolor wykonania i odbiorcy (A fioletowa, B pomarańczowa), jak w share 04a i Subject.
const shareLateTimes={a:.6,responseA:1.6,completeA:2.1,b:3.1,responseB:4.1,completeB:4.6,end:6.2};
const shareLateSummary='A kończy się poprawnie. Późny odbiorca B uruchamia nową subskrypcję upstream, więc powstaje HTTP #2.';
const shareLateRuns=at=>[{id:'A',slot:0,lane:'U1',upstream:'http-share',start:at.a,response:at.responseA,end:at.completeA},
  {id:'B',slot:1,lane:'U2',upstream:'http-share-2',start:at.b,response:at.responseB,end:at.completeB}];
export function configureShareLate(scene) {
  const at=shareLateTimes,runs=shareLateRuns(at),value=r=>E(r.response,'42',laneSubscribers[r.id].fill);
  const ev=(type,edge)=>({type,edge}),during=(from,to)=>({from,to});
  const http={id:'http',bg:'rgba(143,201,212,.4)',line:'#4fa5b5'},share={id:'share',bg:'rgba(216,179,230,.45)',line:'#b384c6'};
  // HTTP świeci od wysłania odpowiedzi do jej dotarcia do share, share() — podczas przekazania wartości odbiorcy.
  const lines=[[{text:'http$',mark:http,active:runs.map(r=>during(ev('source-next',r.upstream),ev('deliver-next',r.upstream)))},
    {text:'.pipe('},{text:'share()',mark:share,active:runs.map(r=>during(ev('deliver-next',r.upstream),ev('source-next','share-'+r.id)))},{text:')'}]];
  Object.assign(scene,{graph:shareLateGraph,shareLateTimes:at,playerLayout:'function',duration:at.end,ink:'#26323B',
    playerClass:'rx-lanes rx-flat-tiles',code:'http$.pipe(share())',codeLines:lines,codeFrames:[],
    timing:{subscribe:1,travel:1,transform:1.4,terminal:.8,gap:.5},
    rows:[...runs.map((r,i)=>R(`HTTP #${i+1}`,[value(r)],[B(r.start,r.response,'request')],{completeAt:r.end})),
      ...runs.map(r=>R(`Odbiorca ${r.id}`,[value(r)],[],{completeAt:r.end}))],
    captions:[[0,'http$.pipe(share()): jedna definicja HTTP. Nic jeszcze nie działa'],
      [at.a,'A subskrybuje. share() podpina się do HTTP i uruchamia request #1'],
      [at.responseA,'HTTP #1 zwraca 42. share() przekazuje je do A, potem complete'],
      [at.b,'B subskrybuje po complete. share() nie pamięta 42 i uruchamia request #2'],
      [at.responseB,'HTTP #2 zwraca nowe 42 dla B, potem complete']],
    metrics:[{label:'Requesty HTTP',count:'started'},{label:'Aktywne',count:'active'}],
    // Dwa kroki: A kończy się (HTTP #1, 42, complete), potem B uruchamia HTTP #2. Drugi postój wypada na końcu sceny,
    // więc kolejne „dalej” zmienia slajd (bez dodatkowego etapu AUTO).
    playback:manual([
      {id:'complete-a',event:ev('disconnected','share-A'),offset:.8,caption:'A dostał 42 i complete. HTTP #1 zakończone, share() się zresetował'},
      {id:'complete-b',modelTime:at.end,caption:shareLateSummary},
    ]),
  });
}

export function shareLateGraph(scene) {
  const tall=scene.format==='4:3',top=tall?178:102,runs=shareLateRuns(scene.shareLateTimes);
  const g={httpX:217,httpW:310,shareX:592,shareW:280,recvX:995,recvW:366},at=r=>({x:g.recvX,w:g.recvW,y:laneRowY(top,r.slot)});
  const complete=end=>({at:end,kind:'complete'}),value=r=>[E(r.response,'42',laneSubscribers[r.id].fill)];
  return {layout:'fixed',formatAware:true,width:1240,height:tall?612:460,...laneGraphLook(),
    // U1/U2: wykonania HTTP w kolorach odbiorców, którzy je uruchomili; wiersz HTTP nosi numer wykonania.
    subscribers:{A:laneSubscribers.A,B:laneSubscribers.B,U1:{...laneSubscribers.A,label:'#1'},U2:{...laneSubscribers.B,label:'#2'}},
    nodes:[{id:'http',x:g.httpX,w:g.httpW,label:'HTTP GET',workLanes:true,progressUntilNext:true,...laneTile('source',top,{U1:0,U2:1},2)},
      {id:'share',x:g.shareX,w:g.shareW,label:'share()',color:'op',splitBalls:true,splitAt:.5,splitGuides:false,hubFan:false,rowTint:true,
        ...laneTile('operator',top,{U1:0,A:0,U2:1,B:1},2)},
      ...runs.map(r=>laneReceiver(r.id,r.id,at(r),{rowTint:true,laneTerminalText:true}))],
    edges:runs.flatMap(r=>[
      {id:r.upstream,from:'http',to:'share',subscriber:r.lane,logicalStart:r.start,logicalEnd:complete(r.end),events:value(r)},
      {id:'share-'+r.id,from:'share',to:r.id,subscriber:r.id,logicalStart:r.start,logicalEnd:complete(r.end),hold:.6,events:value(r)}]),
    executions:runs.map((r,i)=>({id:`http-${i+1}`,node:'http',edge:r.upstream,duration:r.response-r.start})),
    trays:runs.map(r=>laneTray(r.id,at(r),1)),
    // .subscribe() nad kolumną odbiorców, do dotarcia impulsu do HTTP (każdy odbiorca uruchamia własne wykonanie);
    // potem nad HTTP GET numer requestu tego odbiorcy (#1 dla A, nowy #2 dla B) do wysłania odpowiedzi.
    callouts:runs.flatMap((r,i)=>[subscribeCallout(r.id,'share-'+r.id,r.upstream,{x:g.recvX,y:top/2}),
      {...laneCallout(i?'nowy request HTTP':'request HTTP',r.id,laneEvent('connected',r.upstream),laneEvent('source-next',r.upstream,.4),
        {x:(g.httpX+g.shareX)/2,y:top/2}),label:`#${i+1}`}]),
    timeline:[{type:'share-summary',event:{type:'disconnected',edge:'share-B'},offset:.6,
      caption:shareLateSummary}],
  };
}

// shareReplay({ bufferSize: 1, refCount: true }) i późny odbiorca (20-sharereplay-2): HTTP GET → shareReplay(1) → A/B.
// A uruchamia jedyne wykonanie HTTP (#1); 42 trafia do A i równolegle do kieszeni bufora pod operatorem. Po complete
// bufor zostaje (refCount nie czyści wyniku zakończonego źródła). B subskrybuje później: bez toru HTTP, kulka wyjeżdża
// z bufora (replayHold) do B, potem complete. Kolory kulek jak w share z późnym odbiorcą: wykonanie #1/A fioletowa, B pomarańczowa.
const shareReplayTimes={a:1,response:5,complete:6,b:7};
export function configureShareReplayLate(scene) {
  const at=shareReplayTimes,ev=(type,edge)=>({type,edge}),during=(from,to)=>({from,to});
  const a=E(at.response,'42',laneSubscribers.A.fill),b=E(at.b,'42',laneSubscribers.B.fill);
  const http={id:'http',bg:'rgba(143,201,212,.4)',line:'#4fa5b5'},op={id:'share-replay',bg:'rgba(216,179,230,.45)',line:'#b384c6'};
  // Kod łamany przed shareReplay; HTTP świeci podczas odpowiedzi, shareReplay — przy rozesłaniu i zapisie oraz przy odtworzeniu dla B.
  const lines=[[{text:'http$',mark:http,active:[during(ev('source-next','http-replay'),ev('deliver-next','http-replay'))]},{text:'.pipe('}],
    [{text:'  '},{text:'shareReplay({ bufferSize: 1, refCount: true })',mark:op,
      active:[during(ev('deliver-next','http-replay'),ev('source-next','replay-A')),during(ev('connected','replay-B'),ev('source-next','replay-B'))]},{text:')'}]];
  Object.assign(scene,{graph:shareReplayLateGraph,shareReplayTimes:at,playerLayout:'function',duration:at.b+2,ink:'#26323B',
    playerClass:'rx-flat-tiles',code:lines.map(line=>line.map(part=>part.text).join('')).join('\n'),codeLines:lines,codeFrames:[],
    timing:{subscribe:1,travel:1,transform:1.4,terminal:.8,gap:.5},
    rows:[R('HTTP #1',[a],[B(at.a,at.response,'request')],{completeAt:at.complete}),
      R('Odbiorca A',[a],[],{completeAt:at.complete}),R('Odbiorca B',[b],[],{completeAt:at.b})],
    captions:[[0,'shareReplay(1): jedna definicja HTTP i pusty bufor. Nic jeszcze nie działa'],
      [at.a,'A subskrybuje. shareReplay(1) uruchamia jedno wykonanie HTTP'],
      [at.response,'HTTP zwraca 42. shareReplay(1) przekazuje je do A i zapisuje w buforze'],
      [at.b,'B subskrybuje po complete. Bez nowego HTTP: 42 wychodzi z bufora']],
    metrics:[{label:'Requesty HTTP',count:'started'}],
    playback:manual([
      {id:'subscribed-a',event:ev('connected','http-replay'),offset:.35,caption:'A subskrybuje. shareReplay(1) uruchamia jedno HTTP'},
      {id:'request',event:ev('connected','http-replay'),offset:2,caption:'Request trwa. Bufor shareReplay(1) jest jeszcze pusty'},
      {id:'stored',event:ev('deliver-next','replay-A'),offset:.35,caption:'HTTP zwraca 42: A dostaje wartość, a bufor ją zapamiętuje'},
      {id:'complete-a',event:ev('disconnected','replay-A'),offset:.8,caption:'HTTP zakończone. Bufor nadal zawiera 42'},
      {id:'subscribed-b',event:ev('connected','replay-B'),offset:.35,caption:'B subskrybuje po complete. Nie powstaje nowe HTTP'},
      {id:'replayed',event:ev('disconnected','replay-B'),offset:.8,caption:'B dostał 42 prosto z bufora, a potem complete'},
    ]),
  });
}

export function shareReplayLateGraph(scene) {
  const tall=scene.format==='4:3',top=tall?178:102,at=scene.shareReplayTimes;
  // Operator szerszy niż w cold (330), żeby etykieta shareReplay(1) mieściła się w jednej linii; odbiorcy jak na innych slajdach.
  const g={httpX:202,httpW:280,opX:577,opW:330,recvX:995,recvW:366};
  const receivers=['A','B'].map((id,slot)=>({id,slot,pos:{x:g.recvX,w:g.recvW,y:laneRowY(top,slot)}}));
  const complete=end=>({at:end,kind:'complete'});
  return {layout:'fixed',formatAware:true,width:1240,height:tall?612:460,...laneGraphLook(),
    subscribers:{A:laneSubscribers.A,B:laneSubscribers.B,U1:{...laneSubscribers.A,label:'#1'}},
    nodes:[{id:'http',x:g.httpX,w:g.httpW,label:'HTTP GET',workLanes:true,progressUntilNext:true,...laneTile('source',top,{U1:0},1)},
      // buffer: kieszeń pod kafelkiem; splitAt .5 — kulka staje w wierszu A i rozgałęzia się do A i do bufora.
      {id:'replay',x:g.opX,w:g.opW,label:'shareReplay(1)',color:'op',splitBalls:true,splitAt:.5,splitGuides:false,hubFan:false,rowTint:true,
        buffer:{size:1,label:'bufor'},...laneTile('operator',top,{U1:0,A:0,B:1},2)},
      ...receivers.map(r=>laneReceiver(r.id,r.id,r.pos,{rowTint:true}))],
    edges:[{id:'http-replay',from:'http',to:'replay',subscriber:'U1',logicalStart:at.a,logicalEnd:complete(at.complete),events:scene.rows[0].events},
      {id:'replay-A',from:'replay',to:'A',subscriber:'A',logicalStart:at.a,logicalEnd:complete(at.complete),hold:1.2,events:scene.rows[1].events},
      // B: odtworzenie z bufora w chwili subskrypcji (replayHold — wyjęcie z kieszeni) i complete zakończonego źródła.
      {id:'replay-B',from:'replay',to:'B',subscriber:'B',logicalStart:at.b,logicalEnd:complete(at.b),connect:.5,replayHold:1.2,events:scene.rows[2].events}],
    executions:[{id:'http-1',node:'http',edge:'http-replay',duration:at.response-at.a}],
    trays:receivers.map(r=>laneTray(r.id,r.pos,1)),
    callouts:[subscribeCallout('A','replay-A','http-replay',{x:g.recvX,y:top/2}),
      subscribeCallout('B','replay-B','replay-B',{x:g.recvX,y:top/2})],
    timeline:[{type:'replay-summary',event:{type:'disconnected',edge:'replay-B'},offset:1,
      caption:'Jeden request, dwóch odbiorców. Późny B dostał wynik z bufora shareReplay(1)'}],
  };
}

// interval(1000): emisje bez końca, aż do ręcznego unsubscribe. interval jest cold: każda subskrypcja to osobne
// wykonanie z własnym licznikiem od 0. Scena „na żywo” z akcjami (scene.live.actions): model analityczny w czasie
// ilustracji, player kompiluje go dla przesuwanego okna i wykonanych akcji.
// Etapy: READY (interval i odbiorca A) → subscribe A (postój subscribed z migawką) → emisje A bez końca → akcja B:
// B pojawia się i subskrybuje, dostaje własne 0, 1, 2… (drugi wiersz interval) → akcja unsubscribe A → akcja
// unsubscribe B; po niej scena jest skończona. Migawki stoją w jednym miejscu nad diagramem: .subscribe() A do startu
// emisji, .subscribe() B do pierwszej emisji B, kolejne do następnej akcji, ostatnia do końca.
// joinFirst: B dostaje pierwszą wartość wcześniej niż A (connected + 0,6 s zamiast emit + period), żeby nie czekać.
const intervalTiming={subscribe:1.3,connect:.8,emit:.5,joinFirst:.6,reveal:.3,period:1,travel:.8,cancel:.8,calloutHold:.4,stopTail:1,
  window:30,keep:5,margin:2,actionGap:1.5,settle:2.8,defaults:[6,11,15],defaultClose:19};
const intervalActions=['B','unsub-A','unsub-B'];
export function configureInterval(scene) {
  const t=intervalTiming,connected=t.subscribe+t.connect,start=connected+t.emit;
  Object.assign(scene,{graph:intervalGraph,playerLayout:'function',ink:'#26323B',playerClass:'rx-flat-tiles',
    title:'interval: strumień bez końca',code:'interval(1000)',
    // .subscribe(render) dopisuje się razem z migawką .subscribe() A (0,3 s przed subscribe), jak na HTTP.
    codeFrames:[{event:{type:'subscribe',edge:'interval-A'},offset:-.3,code:'interval(1000).subscribe(render)',fadeIn:.3}],
    rows:[R('interval'),R('Odbiorca A'),R('Odbiorca B')],
    // defaults: umowne chwile akcji (druk, hash, podgląd Notes); defaultClose: zamrożenie po nich.
    live:{start,window:t.window,keep:t.keep,margin:t.margin,defaultClose:t.defaultClose,actions:intervalActions,defaults:t.defaults,
      actionGap:t.actionGap,settle:t.settle,variant:intervalVariant},
    // subscribed i live poprzedzają akcje (zwykłe etapy przed live.start); kolejne postoje to stabilne kadry akcji.
    playback:{entry:'manual',finish:'hold',live:true,stops:[
      {id:'subscribed',time:connected+.35,caption:'.subscribe() dotarło do interval. Emisje jeszcze nie ruszyły'},
      {id:'live',time:start,caption:'interval emituje co sekundę: 0, 1, 2… Sam się nie kończy'},
      ...intervalActions.map((id,i)=>({id:{B:'join-b','unsub-A':'unsub-a','unsub-B':'unsub-b'}[id],time:t.defaults[i]+t.settle}))]},
  });
  Object.assign(scene,intervalVariant(scene,{from:0,to:t.window,closedAt:null,actions:[]}));
}

// Wariant sceny dla okna [from, to], wykonanych akcji (czasy ilustracji w kolejności live.actions) i opcjonalnego
// zamrożenia closedAt. Wykonanie X emituje k w start+(k+1)·period; przy unsubscribe wartość już wysłana dociera,
// potem rusza impuls × (cancel), późniejsze emisje nie istnieją. Po odejściu obu odbiorców scena jest skończona.
function intervalVariant(scene,{from,to,closedAt,actions=[]}) {
  const t=intervalTiming,closed=closedAt!==null&&closedAt!==undefined;
  // first: od zestawienia subskrypcji do pierwszej emisji.
  const execution=(id,subscribe,unsubCall,first=t.emit+t.period)=>{
    const start=subscribe+t.connect+first-t.period,emitAt=k=>start+t.period*(k+1);
    const last=unsubCall===undefined?Infinity:Math.ceil((unsubCall-start)/t.period)-2;
    const unsubscribeAt=unsubCall===undefined?null:Math.max(unsubCall,last>=0?emitAt(last)+t.travel:unsubCall);
    return {id,subscribe,start,emitAt,last,calledAt:unsubCall,unsubscribeAt,doneAt:unsubscribeAt===null?null:unsubscribeAt+t.cancel+t.calloutHold};
  };
  const [joinB,unsubA,unsubB]=actions;
  const runs=[execution('A',t.subscribe,unsubA),...(joinB===undefined?[]:[execution('B',joinB+t.reveal,unsubB,t.joinFirst)])];
  const finished=runs.length===2&&runs.every(r=>r.unsubscribeAt!==null);
  const finite=finished?Math.max(...runs.map(r=>r.doneAt))+t.stopTail:Infinity,end=closed?Math.min(closedAt,finite):Math.min(to,finite);
  for(const r of runs){
    r.kFrom=Math.max(0,Math.floor((from-r.start)/t.period)-3);
    r.kTo=Math.min(r.last,Math.floor((end-r.start)/t.period)-1);
    if(r.unsubscribeAt===null)r.last=r.kTo;
  }
  const emitted=r=>time=>Math.max(0,Math.min(r.kTo+1,Math.floor((time-r.start)/t.period)));
  const active=time=>runs.filter(r=>time>=r.subscribe+t.connect&&(r.unsubscribeAt===null||time<r.unsubscribeAt+t.cancel)).length;
  const runB=runs[1];
  return {...scene,intervalPlan:{runs,actions,end},
    duration:closed?Math.min(closedAt,finite):Math.min(to,finite),
    // Akcja „trwa” do końca swojej animacji: pierwsza emisja B i wygaszenie migawki (0,3 s) albo dotarcie × do interval.
    liveBusyUntil:[runB?runB.subscribe+t.connect+t.joinFirst+.3:joinB,runs[0].doneAt??unsubA,runB?.doneAt??unsubB],
    metrics:[{label:'Wykonania interval',value:active},{label:'Emisje A',value:emitted(runs[0])},
      {label:'Emisje B',value:runB?emitted(runB):()=>0}],
    captions:[[0,'interval(1000) to definicja. Bez subscribe nic nie emituje'],
      [t.subscribe,'.subscribe() tworzy wykonanie A i łączy je z interval'],[runs[0].start,'interval emituje co sekundę: 0, 1, 2… Sam się nie kończy'],
      ...(runB?[[runB.subscribe,'B subskrybuje: interval jest cold — B dostaje własne wykonanie od 0']]:[]),
      ...runs.filter(r=>r.unsubscribeAt!==null).flatMap(r=>[[r.unsubscribeAt,`.unsubscribe() ${r.id}: rezygnacja biegnie od ${r.id} do interval`],
        [r.unsubscribeAt+t.cancel,r===runs[0]&&runB&&runB.unsubscribeAt===null?'Wykonanie A zatrzymane. B nadal odbiera swoje wartości':
          `Wykonanie ${r.id} zatrzymane. Bez complete — to rezygnacja odbiorcy, nie koniec strumienia`]])]};
}

export function intervalGraph(scene) {
  const t=intervalTiming,{runs,end}=scene.intervalPlan;
  // Wymiary kafelków jak na Subject — ręczna emisja: interval 340/420 (dwa wiersze wykonań), odbiorcy 910/400.
  const top=scene.format==='4:3'?178:102,pos=r=>({x:910,w:400,y:laneRowY(top,r.id==='A'?0:1)}),fill=id=>laneSubscribers[id].fill;
  const edge=r=>'interval-'+r.id,range=(a,b)=>Array.from({length:Math.max(0,b-a+1)},(_,i)=>a+i);
  // Migawki w jednym miejscu (x środek, y top/2), kolejno: .subscribe() A (do startu emisji), .subscribe() B (do
  // pierwszej emisji B), .unsubscribe() A, .unsubscribe() B; unsubscribe do następnej akcji, ostatnia do końca sceny.
  const events=[{text:'.subscribe()',run:runs[0],from:laneEvent('subscribe',edge(runs[0]),-.3),until:laneEvent('connected',edge(runs[0]),t.emit)},
    ...(runs[1]?[{text:'.subscribe()',run:runs[1],from:laneEvent('subscribe',edge(runs[1]),-.3),until:laneEvent('connected',edge(runs[1]),t.joinFirst)}]:[]),
    ...runs.filter(r=>r.unsubscribeAt!==null).sort((a,b)=>a.calledAt-b.calledAt).map(r=>({text:'.unsubscribe()',run:r,from:{type:'unsubscribe-call',edge:edge(r)}}))];
  // Poprzednia migawka znika (fade 0,3 s kończy się) dokładnie w chwili następnej akcji — bez nakładania tekstów.
  const callouts=events.map((e,i)=>laneCallout(e.text,e.run.id,e.from,e.until??(events[i+1]?{...events[i+1].from,offset:(events[i+1].from.offset||0)-.3}:{...e.from,offset:Infinity}),{y:top/2}));
  return {layout:'fixed',formatAware:true,width:1240,height:scene.format==='4:3'?612:460,...laneGraphLook(),
    subscribers:{A:laneSubscribers.A,B:laneSubscribers.B},
    nodes:[{id:'interval',x:340,w:420,label:'interval',...laneTile('source',top,{A:0,B:1},2)},
      // A widoczny od READY (ikona inbox i litera), B pojawia się przy swojej akcji, tuż przed subscribe.
      // Status unsubscribe przy odbiorcy po dotarciu × do interval (bez complete): sam „×”, bo wiersz mieści trzy kulki.
      ...runs.map(r=>laneReceiver(r.id,r.id,pos(r),{...(r.id==='A'?{ready:true}:{ready:false,born:r.subscribe-t.reveal}),
        laneTerminalText:{cancelled:'×'},inbox:{...laneInbox(),ready:true}}))],
    trays:runs.map(r=>laneTray(r.id,pos(r),3)),
    callouts,
    edges:runs.map(r=>({id:edge(r),from:'interval',to:r.id,subscriber:r.id,logicalStart:r.subscribe,cancelPulse:true,events:[]})),
    schedule:Object.fromEntries(runs.map(r=>[edge(r),{start:r.subscribe,connectDuration:t.connect,
      events:range(r.kFrom,r.kTo).map(k=>({...E(r.emitAt(k),String(k),fill(r.id)),logicalAt:r.emitAt(k),arrival:r.emitAt(k)+t.travel})),
      ...(r.unsubscribeAt===null?{}:{end:{at:r.unsubscribeAt,logicalAt:r.unsubscribeAt,kind:'unsubscribe',duration:t.cancel}})}])),
    timeline:runs.filter(r=>r.unsubscribeAt!==null).map(r=>({type:'unsubscribe-call',edge:edge(r),at:r.calledAt})),
  };
}

// Wariant HTTP: etapy definicja → odbiorca → subscribe → request i emisja → dotarcie → complete. Subskrypcja dociera
// do HTTP i staje (migawka .subscribe() A widoczna na postoju); request rusza dopiero w następnym etapie (workStart).
// Praca tylko w kafelku HTTP; odbiorca ma własny wiersz bez pracy, więc nie pokazuje paska ani „praca trwa”.
// Czas ilustracji = czas modelu (schedule): born — odbiorca, subscribe/connect — impuls do HTTP, work — start requestu,
// next — wylot odpowiedzi, travel — przelot, complete — wysłanie complete (terminal 0,8 s).
const httpTimes={born:.3,subscribe:1.3,connect:.8,work:2.6,next:5.6,travel:1.4,complete:7.6,terminal:.8,duration:9.2};
export function configureHttp(scene) {
  const at=httpTimes,ev=(type,offset)=>({type,edge:'http-observer',...(offset?{offset}:{})});
  const response=[E(at.next,'dane','http')],arrival=at.next+at.travel,completed=at.complete+at.terminal;
  // 9,2 s: complete dociera w 8,4 s, rozbłysk wiersza odbiorcy wygasa przed FINISHED.
  Object.assign(scene,{graph:httpGraph,httpTimes:at,playerLayout:'function',duration:at.duration,ink:'#26323B',playerClass:'rx-flat-tiles',
    title:'HTTP: od definicji do wykonania',code:"httpGet('/api/data')",
    // .subscribe(render) dopisuje się razem z migawką .subscribe() A (0,3 s przed subscribe).
    codeFrames:[{event:ev('subscribe'),offset:-.3,code:"httpGet('/api/data').subscribe(render)",fadeIn:.3}],
    rows:[R('HTTP',response,[B(at.work,at.next,'request')],{completeAt:at.next}),R('Odbiorca',response)],
    captions:[[0,'Definicja HTTP jest gotowa. Request jeszcze nie istnieje'],[at.born,'Odbiorca A jest gotowy, ale nic go nie łączy z HTTP'],
      [at.subscribe,'.subscribe() łączy odbiorcę A z HTTP'],[at.work,'Dopiero subskrypcja uruchamia request'],[at.next,'HTTP emituje odpowiedź'],
      [arrival,'Odbiorca dostał dane. Za chwilę nadejdzie complete'],[completed,'Complete kończy to wykonanie HTTP']],
    metrics:[],
    playback:manual([{id:'receiver',event:{type:'node-create',node:'observer'},offset:.6,caption:'Odbiorca A czeka. Bez subscribe nie ma requestu'},
      {id:'subscribed',event:ev('connected'),offset:.35,caption:'.subscribe() dotarło do HTTP. Request jeszcze nie ruszył'},
      {id:'response',event:{type:'source-next',edge:'http-observer',value:'dane'},offset:.3,caption:'Request zakończony. HTTP emituje dane'},
      {id:'first',event:{type:'deliver-next',edge:'http-observer',value:'dane'},offset:.35,caption:'Odbiorca dostał dane; complete jeszcze nie dotarło'}]),
  });
}

// Wygląd torów: HTTP GET (definicja) → odbiorca A, który pojawia się w osobnym etapie przed subscribe. Request to postęp
// w wierszu HTTP od workStart do odpowiedzi; „dane” zostają kulką w wierszu odbiorcy, potem complete.
export function httpGraph(scene) {
  const at=scene.httpTimes,top=scene.format==='4:3'?222:146,receiver={x:910,w:400,y:laneRowY(top,0)};
  // Większa kulka mieści pełne „dane”.
  const ball={r:34,font:26},fill=laneSubscribers.A.fill,edge='http-observer';
  return {layout:'fixed',formatAware:true,width:1240,height:scene.format==='4:3'?612:460,...laneGraphLook(),ball,
    subscribers:{A:laneSubscribers.A},
    nodes:[{id:'http',x:340,w:420,label:'HTTP GET',workLanes:true,progressUntilNext:true,terminalEdge:edge,...laneTile('source',top,{A:0},1)},
      // Status zakończenia (✓ complete) przy odbiorcy, po dotarciu zielonego impulsu; HTTP GET bez napisu.
      // Odbiorca pojawia się przed subscribe już z ikoną inbox i literą A (inbox.ready).
      laneReceiver('observer','A',receiver,{ready:false,born:at.born,laneTerminalText:true,inbox:{...laneInbox(),ready:true}})],
    trays:[laneTray('observer',receiver,1,ball)],
    // Migawka zostaje na postoju subscribed i gaśnie, gdy rusza request.
    callouts:[laneCallout('.subscribe()','A',laneEvent('subscribe',edge,-.3),laneEvent('connected',edge,at.work-at.subscribe-at.connect),{y:top/2})],
    edges:[{from:'http',to:'observer',subscriber:'A',events:scene.rows[0].events,logicalStart:at.subscribe}],
    schedule:{[edge]:{start:at.subscribe,connectDuration:at.connect,workStart:at.work,
      events:[{...scene.rows[0].events[0],color:fill,arrival:at.next+at.travel}],
      end:{at:at.complete,logicalAt:at.next,kind:'complete',duration:at.terminal}}}};
}

// Subject (05-zrodla-3): kontynuacja Cold — te same pola widoku A/B/C, ale jeden HTTP zasila je przez Subject.
// READY: A/B/C są już subskrybentami Subject (subskrypcje zestawione przed t = 0, bez powtarzania animacji).
// Kod rośnie etapami: najpierw sam Subject, potem definicja http$ (nagłówek HTTP GET bez wykonania), na końcu osobna
// linia http$.subscribe(subject$) — subskrybujemy HTTP, przekazując Subject jako Observer (tor U, #1); dopiero ona
// uruchamia jedyny request. Subskrypcje A/B/C nim nie zarządzają.
// Jedno next z HTTP → trzy powiadomienia Subject w tym samym kolorze emisji; jedno complete kończy Subject i odbiorców.
// Jawny harmonogram ilustracji (schedule) zamiast planFlow: tylko on pozwala zacząć od już zestawionych subskrypcji.
const subjectUpstream={color:'#238F83',fill:'#b4e0d9',progress:'#abdbd3',label:'#1',ink:'#17695f',tint:'#e6f4f1'};
// born — definicja http$ (nagłówek HTTP GET i druga linia kodu), connect — linia http$.subscribe(subject$), subscribe —
// impuls od Subjecta do HTTP po fade-in tej linii.
// Request 2,2 s (od connected 2,1 do next 4,3) bez osobnego postoju — progress przechodzi płynnie do rozesłania.
const subjectTimes={born:.3,defined:.6,connect:1,subscribe:1.3,link:.8,next:4.3,travel:1,hold:1.2,complete:8.5,terminal:.8,duration:12.3};
export function configureSubject(scene) {
  const at=subjectTimes,ev=(type,edge,offset=0)=>({type,edge,...(offset?{offset}:{})});
  const connected=at.subscribe+at.link,arrival=at.next+at.travel,split=arrival+at.hold,delivered=split+at.travel;
  const upstreamEnd=at.complete+at.terminal,downstreamEnd=upstreamEnd+at.terminal;
  // Wyróżnienia jak na share(): Subject (operator) fioletowo, httpGet turkusowo; .subscribe(subject$) bez stałego tła,
  // chwilowo w kolorze toru U — od pojawienia się linii do chwili po zestawieniu subskrypcji HTTP (widoczne na postoju).
  const subjectMark={id:'subject',bg:'rgba(216,179,230,.45)',line:'#b384c6'},httpMark={id:'http',bg:'rgba(143,201,212,.4)',line:'#4fa5b5'};
  const subscribeMark={id:'subscribe',bg:'rgba(35,143,131,.16)',line:subjectUpstream.color,quiet:true};
  const defined={type:'node-create',node:'http'},connect={type:'manual-connect',edge:'http-subject'};
  // Miejsce na wszystkie linie jest zarezerwowane od READY (show: fade-in 0,3 s); pusta linia oddziela definicje od wywołania.
  const lines=[[{text:'const subject$ = '},{text:'new Subject<User>()',mark:subjectMark,
      active:[{from:ev('deliver-next','http-subject'),to:ev('source-next','subject-A')},{from:ev('disconnected','http-subject'),to:ev('disconnected','subject-A')}]},{text:';'}],
    [{text:'const http$ = ',show:defined},{text:"httpGet<User>('/api/users/42')",mark:httpMark,show:defined,
      active:[{from:ev('source-next','http-subject'),to:ev('deliver-next','http-subject')}]},{text:';',show:defined}],
    [],
    [{text:'http$',show:connect},{text:'.subscribe(subject$)',mark:subscribeMark,show:connect,
      active:[{from:connect,to:ev('connected','http-subject',1)}]},{text:';',show:connect}]];
  const value=E(at.next,coldUserSymbol,subjectUpstream.fill);
  Object.assign(scene,{graph:subjectGraph,subjectTimes:{...at,connected,arrival,split,delivered,upstreamEnd,downstreamEnd},
    playerLayout:'function',duration:at.duration,ink:'#26323B',playerClass:'rx-lanes rx-flat-tiles rx-code-steps',
    title:'Subject: ręczny multicast HTTP',code:lines.map(line=>line.map(part=>part.text).join('')).join('\n'),codeLines:lines,codeFrames:[],
    rows:[R('HTTP GET',[value],[B(at.subscribe,at.next,'request')],{completeAt:at.complete}),
      ...coldFields.map(f=>R(`Pole ${f.label}`,[{...value,at:split}],[],{completeAt:upstreamEnd}))],
    metrics:[{label:'Odbiorcy',value:()=>coldFields.length},{label:'Requesty HTTP',count:'started'}],
    captions:[[0,'Ci sami trzej odbiorcy subskrybują Subject. HTTP jeszcze nie jest podłączony'],
      [at.born,'const http$ = httpGet(...) to tylko definicja. Request jeszcze nie istnieje'],
      [at.connect,'http$.subscribe(subject$): subskrybujemy HTTP, a Subject jest Observerem']],
    playback:manual([
      {id:'defined',event:defined,offset:at.defined,caption:'Definicja http$: nagłówek HTTP GET bez wykonania. Request jeszcze nie istnieje'},
      {id:'connect-http',event:ev('connected','http-subject'),offset:.35,caption:'Subject jest Observerem: http$.subscribe(subject$) podłącza HTTP'},
      // Jeden etap: request, odpowiedź i dotarcie User do Subjecta; postój, gdy Subject rozdzielił go na trzy kulki przy portach A/B/C.
      {id:'multicast',event:ev('source-next','subject-A'),offset:-.05,caption:'Jeden request, jeden obiekt User. Subject rozsyła go do A, B i C'},
      // Kolejny etap: kulki dolatują do pól, potem complete z HTTP przez Subject do wszystkich odbiorców.
      {id:'complete',event:ev('disconnected','subject-C'),offset:.8,caption:'Pola wypełnione. Subject przekazał complete wszystkim odbiorcom'},
    ]),
  });
}

export function subjectGraph(scene) {
  const tall=scene.format==='4:3',top=tall?178:102,at=scene.subjectTimes,fields=viewFields(top);
  // Dwie kolumny przed polami (te same co na Cold): HTTP GET i Subject, równe odstępy 110 (mieszczą kulkę obiektu w locie).
  const g={httpX:177,httpW:230,subjectX:517,subjectW:230};
  const complete=(end,logicalAt=end)=>({at:end,logicalAt,kind:'complete',duration:at.terminal});
  const value={value:coldUserSymbol,color:subjectUpstream.fill};
  // Subskrypcje A/B/C zestawione przed READY: start −2, połączenie 0,8 s — w t = 0 wiersze i porty są w pełni widoczne.
  const preconnected={start:-2,connectDuration:.8};
  return {layout:'fixed',formatAware:true,width:1240,height:tall?612:460,...laneGraphLook(),ball:viewFieldBall,
    subscribers:{A:laneSubscribers.A,B:laneSubscribers.B,C:laneSubscribers.C,U:subjectUpstream},
    // HTTP GET pojawia się razem z definicją http$ (sam nagłówek; wiersz wykonania rośnie dopiero z subskrypcją).
    // Wejście upstreamu trafia w wiersz A Subject (prosty kabel
    // z wiersza #1 HTTP); splitAt:0 — kulka rozdziela się na porcie wejściowym, nie stoi w wierszu A.
    nodes:[{id:'http',x:g.httpX,w:g.httpW,label:'HTTP GET',workLanes:true,progressUntilNext:true,
      ...laneTile('source',top,{U:0},1),ready:false,born:at.born},
      {id:'subject',x:g.subjectX,w:g.subjectW,label:'Subject',splitBalls:true,splitAt:0,splitGuides:false,upstreamStripe:false,hubFan:false,
        ...laneTile('operator',top,{U:0,...Object.fromEntries(coldFields.map(f=>[f.id,f.slot]))},coldFields.length)},
      ...fields.nodes],
    edges:[{id:'http-subject',from:'http',to:'subject',subscriber:'U',logicalStart:at.subscribe,fixedStart:true,logicalEnd:complete(at.complete)},
      ...coldFields.map(f=>({id:'subject-'+f.id,from:'subject',to:f.id,subscriber:f.id,logicalStart:-2,logicalEnd:complete(at.upstreamEnd)}))],
    schedule:{'http-subject':{start:at.subscribe,connectDuration:at.link,events:[{...value,at:at.next,arrival:at.arrival}],end:complete(at.complete)},
      ...Object.fromEntries(coldFields.map(f=>['subject-'+f.id,{...preconnected,
        events:[{...value,at:at.split,arrival:at.delivered,logicalAt:at.next}],end:complete(at.upstreamEnd)}]))},
    executions:[{id:'request',node:'http',edge:'http-subject',duration:at.next-at.subscribe}],
    trays:fields.trays,
    // manual-connect: chwila pojawienia się linii http$.subscribe(subject$) w kodzie (bez migawki nad diagramem).
    timeline:[{type:'manual-connect',edge:'http-subject',event:{type:'subscribe',edge:'http-subject'},offset:at.connect-at.subscribe},
      {type:'subject-summary',event:{type:'disconnected',edge:'subject-C'},offset:1.1,
        caption:'Ten sam widok co na Cold, ale jeden request zamiast trzech. Upstream podłączyliśmy ręcznie'}],
  };
}

// Subject — ręczna emisja (05-zrodla-5): po interval (wiele next, unsubscribe), przed ręcznym multicastem HTTP.
// Subject jest hot: READY to sam kafelek Subject<number>; A subskrybuje i dostaje next(1),
// dopiero potem pojawia się B — bez wcześniejszej 1 (brak historii). next(2) trafia do A i B, complete() zamyka obie
// subskrypcje (bez unsubscribe). Odbiorca pojawia się (fade-in) tuż przed swoim subscribe. Subject nie ma upstreamu ani connection.
// Wygląd torów i wymiary kafelków jak interval (05-zrodla): Subject x/w 340/420, kompaktowi odbiorcy 910/400 z kulkami
// wartości. Kod to stale tylko definicja Subjecta; subscribe, next i complete są migawkami: subscribe i next widoczne do
// postoju, gasną w następnym etapie; complete() zostaje do końca. Jawny harmonogram: czas ilustracji = czas modelu.
// next(1) trafia tylko do A (B jeszcze nie istnieje); B subskrybuje między next(1) i next(2).
// Etapy: subscribe A → next(1): kulka czeka w Subjecie (emit-1) → dotarcie do A → subscribe B → next(2): kulka ze środka
// rozchodzi się do portów A i B i staje (emit-2) → dotarcie do A i B → complete().
// emitStop: postój emit-1 po fade-in kulki (przed ruchem do portu); calloutTail: migawka gaśnie tuż po wznowieniu.
const subjectManualTimes={subscribe:[.6,5.8],reveal:.3,link:1,next:[2.3,7.5],hold:1.2,travel:1.4,complete:10.8,completeDelay:.6,terminal:1.2,
  emitStop:.5,calloutTail:.1,summary:13.6,duration:14.6};
const subjectManualReceivers=[{id:'A',slot:0},{id:'B',slot:1}];
// Odbiorcy emisji: ci, których subskrypcja jest zestawiona przed wywołaniem next.
const subjectManualTargets=(at,call)=>subjectManualReceivers.filter((r,i)=>at.subscribe[i]+at.link<=call);
// Migawka complete() w zieleni zakończenia; bez własnego toru.
const subjectCompleteCall={color:'#087438',fill:'#DDF1E1',ink:'#0B5A2E',tint:'#E8F5EC'};
export function configureSubjectManual(scene) {
  const at=subjectManualTimes,ev=(type,edge,extra={})=>({type,edge,...extra});
  const nexts=at.next.map((call,i)=>({value:String(i+1),call,split:call+at.hold,delivered:call+at.hold+at.travel,
    targets:subjectManualTargets(at,call).map(r=>r.id)}));
  const completeAt=at.complete+at.completeDelay,completeArrival=completeAt+at.terminal,fill=subjectUpstream.fill;
  const subjectMark={id:'subject',bg:'rgba(216,179,230,.45)',line:'#b384c6'};
  // Stały kod: wyłącznie definicja Subject; świeci od ręcznego next do wyjścia powiadomień i od complete() do jego wysłania.
  const lines=[[{text:'const subject$ = '},{text:'new Subject<number>()',mark:subjectMark,
    active:[...nexts.map(n=>({from:{type:'manual-next',value:n.value},to:ev('source-next','subject-'+n.targets[0],{value:n.value})})),
      {from:{type:'manual-complete'},to:ev('stream-complete','subject-A')}]},{text:';'}]];
  Object.assign(scene,{graph:subjectManualGraph,subjectManualTimes:{...at,nexts,completeAt,completeArrival},
    playerLayout:'function',duration:at.duration,ink:'#26323B',playerClass:'rx-lanes rx-flat-tiles',
    title:'Subject — ręczna emisja',code:lines[0].map(part=>part.text).join(''),codeLines:lines,codeFrames:[],
    rows:[R('Subject',nexts.map(n=>E(n.call,n.value,fill)),[],{completeAt:at.complete}),
      ...subjectManualReceivers.map(r=>R('Odbiorca '+r.id,nexts.filter(n=>n.targets.includes(r.id)).map(n=>E(n.split,n.value,fill)),[],{completeAt:at.complete}))],
    // Odbiorcy: zestawione i jeszcze niezakończone subskrypcje (complete zamyka obie). Emisje next: ręczne wywołania next.
    metrics:[{label:'Odbiorcy',value:t=>t>=completeArrival?0:at.subscribe.filter(start=>t>=start+at.link).length},
      {label:'Emisje next',value:t=>nexts.filter(n=>t>=n.call).length}],
    captions:[[0,'new Subject<number>(): Subject nie ma jeszcze odbiorców i niczego nie emituje']],
    playback:manual([
      {id:'subscribed-a',event:ev('connected','subject-A'),offset:.35,caption:'A subskrybuje Subject i czeka na wartości'},
      {id:'emit-1',event:{type:'manual-next',value:'1'},offset:at.emitStop,caption:'subject$.next(1): Subject ma wartość 1 do rozesłania'},
      {id:'next-1',event:ev('deliver-next','subject-A',{value:'1'}),offset:.35,caption:'subject$.next(1): A dostaje 1. B jeszcze nie istnieje'},
      // Pytanie: B już subskrybuje — czy dostanie wcześniejszą 1? Odpowiedź (brak 1) widać dopiero przy next(2).
      {id:'subscribed-b',event:ev('connected','subject-B'),offset:.35,caption:'B subskrybuje Subject. Czy dostanie wcześniejszą 1?'},
      {id:'emit-2',event:ev('source-next','subject-A',{value:'2'}),caption:'subject$.next(2): Subject rozsyła 2 do wszystkich aktualnych odbiorców — A i B'},
      {id:'next-2',event:ev('deliver-next','subject-B',{value:'2'}),offset:.35,caption:'subject$.next(2): A i B dostają 2. B nie dostał 1 — Subject nie odtwarza historii'},
      {id:'complete',event:ev('disconnected','subject-B'),offset:.5,caption:'subject$.complete(): A i B dostają complete. Obie subskrypcje są zamknięte'},
    ]),
  });
}

export function subjectManualGraph(scene) {
  const tall=scene.format==='4:3',top=tall?178:102,at=scene.subjectManualTimes;
  // Wymiary kafelków jak na interval (05-zrodla): źródło 340/420, odbiorca 910/400.
  const g={subjectX:340,subjectW:420,recvX:910,recvW:400},pos=r=>({x:g.recvX,w:g.recvW,y:laneRowY(top,r.slot)});
  // Kulka liczby jak w Subject + interval; wartości w kolorze emisji Subjecta (fill toru #1 z sąsiednich slajdów).
  const ball={r:34,font:30},fill=subjectUpstream.fill;
  // complete: terminalna notyfikacja — zielony impuls od Subjecta do każdego odbiorcy, bez kulki i bez unsubscribe.
  const complete={at:at.completeAt,logicalAt:at.complete,kind:'complete',duration:at.terminal};
  const call=(text,subscriber,from,to)=>({...laneCallout(text,subscriber,from,to,{x:620,y:top/2}),size:34,label:''});
  return {layout:'fixed',formatAware:true,width:1240,height:tall?612:460,...laneGraphLook(),ball,
    subscribers:{A:laneSubscribers.A,B:laneSubscribers.B,U:subjectUpstream,C:subjectCompleteCall},
    nodes:[{id:'subject',x:g.subjectX,w:g.subjectW,label:'Subject',splitBalls:true,splitGuides:false,upstreamStripe:false,hubFan:false,
        emits:at.nexts.map(n=>({value:n.value,color:fill,at:n.call})),
        ...laneTile('operator',top,Object.fromEntries(subjectManualReceivers.map(r=>[r.id,r.slot])),subjectManualReceivers.length)},
      // Odbiorca nie istnieje przed swoim subscribe: pojawia się (fade-in) tuż przed nim, bez pustego prostokąta w READY.
      ...subjectManualReceivers.map((r,i)=>laneReceiver(r.id,r.id,pos(r),{ready:false,born:at.subscribe[i]-at.reveal,laneTerminalText:true}))],
    edges:subjectManualReceivers.map((r,i)=>({id:'subject-'+r.id,from:'subject',to:r.id,subscriber:r.id,logicalStart:at.subscribe[i],
      logicalEnd:{at:at.complete,kind:'complete'}})),
    // Powiadomienia emisji tylko do aktualnych subskrybentów: wspólne logicalAt (wywołanie next), ten sam kolor i wylot.
    schedule:Object.fromEntries(subjectManualReceivers.map((r,i)=>['subject-'+r.id,{start:at.subscribe[i],connectDuration:at.link,
      events:at.nexts.filter(n=>n.targets.includes(r.id)).map(n=>({value:n.value,color:fill,at:n.split,arrival:n.delivered,logicalAt:n.call})),end:complete}])),
    trays:subjectManualReceivers.map(r=>laneTray(r.id,pos(r),2,ball)),
    // Migawki w jednym miejscu nad diagramem, kolejno: subscribe (litera toru), next(1), next(2) (bez badge'a)
    // i complete() (zieleń zakończenia). subscribe i next zostają na swoim postoju (subscribed-X, emit-N) i gasną tuż po
    // wznowieniu; complete() zostaje do końca sceny.
    callouts:[...subjectManualReceivers.map(r=>({...call(`subject$.subscribe(observer${r.id})`,r.id,
        laneEvent('subscribe','subject-'+r.id),laneEvent('connected','subject-'+r.id,.35+at.calloutTail)),label:r.id})),
      // Postój emisji: przy jednym odbiorcy kulka czeka w Subjecie (emit-1), przy kilku — staje na portach po rozejściu (emit-2).
      ...at.nexts.map(n=>call(`subject$.next(${n.value})`,'U',{type:'manual-next',value:n.value},n.targets.length>1?
        {type:'source-next',edge:'subject-'+n.targets[0],value:n.value,offset:at.calloutTail}:{type:'manual-next',value:n.value,offset:at.emitStop+at.calloutTail})),
      call('subject$.complete()','C',{type:'manual-complete'},laneEvent('disconnected','subject-B',Infinity))],
    timeline:[...at.nexts.map(n=>({type:'manual-next',value:n.value,at:n.call})),{type:'manual-complete',at:at.complete},
      {type:'subject-manual-summary',at:at.summary,caption:'A: 1, 2, complete. B: 2, complete. Subject jest hot — późny odbiorca nie dostaje historii'}],
  };
}

// Subject i interval (05-zrodla-4): kto odłączy źródło? interval(1000) → Subject → A/B/C, wygląd jak Subject + HTTP.
// READY: wszystkie subskrypcje zestawione przed t = 0 — także connection (tor #1: interval → Subject) — i interval
// od razu emituje. Scena na żywo z akcjami (scene.live.actions): kolejne „dalej” wywołują subA/subB/subC.unsubscribe()
// (odłącza się wyłącznie Subject → X; szary impuls × kończy się na Subject), akcja source niczego nie wywołuje —
// wyróżnia w kodzie connection. Wartości bez odbiorców docierają do Subject i tam gasną (dropBalls); interval
// pracuje bez końca. Ostatnia akcja (connection) to connection.unsubscribe(): szary impuls × biegnie od Subject do
// interval, tor #1 szarzeje, nowych emisji nie ma. Subject nie dostaje complete — zostaje otwarty.
const subjectIntervalTiming={first:.5,period:1,travel:.8,hold:.4,cancel:.8,calloutHold:.4,stopTail:1,window:30,keep:5,margin:2,
  settle:2.8,actionGap:1.5};
const subjectIntervalReceivers=[{id:'A',slot:0},{id:'B',slot:1},{id:'C',slot:2}];
// Dwa huby tej samej sceny: Subject (ręczne connection, akcje source i connection) i share() (bez ręcznego połączenia —
// gdy odchodzi ostatni odbiorca, share() sam odłącza upstream; impuls × C biegnie przez share() aż do interval).
// sequence: jedna akcja wywołuje subA/subB/subC.unsubscribe() po kolei co sequence s (okres interval), więc każdy
// kolejny odbiorca dostaje jeszcze jedną wartość.
const intervalHubs={
  subject:{label:'Subject',title:'Subject — kto odłączy źródło?',actions:['A','B','C','source','connection'],defaults:[3,6,9,12,15],
    defaultClose:17.9,playerClass:'rx-lanes rx-flat-tiles rx-two-lines',receiversLabel:'Odbiorcy Subject'},
  share:{label:'share()',title:'share() — kto odłączy źródło?',actions:['unsub-all'],defaults:[3],sequence:1,
    defaultClose:8.5,playerClass:'rx-lanes rx-flat-tiles',receiversLabel:'Odbiorcy share()'},
};
const intervalHubOf=scene=>scene.intervalHub||'subject';
export function configureSubjectInterval(scene,kind='subject') {
  const t=subjectIntervalTiming,hub=intervalHubs[kind];
  // Postoje to stabilne kadry akcji na umownej osi (defaults): znaczniki Reveal, notatki, hash i podgląd Notes.
  // Na żywo kontroler liczy etap z liczby wykonanych akcji, nie z czasu.
  const tail=hub.sequence?hub.sequence*(subjectIntervalReceivers.length-1):0;
  const settled=hub.defaults.map((at,i)=>at+tail+({source:.5,connection:2.2}[hub.actions[i]]??t.settle));
  Object.assign(scene,{intervalHub:kind,graph:subjectIntervalGraph,playerLayout:'function',ink:'#26323B',playerClass:hub.playerClass,
    title:hub.title,
    rows:[R('interval(1000)'),...subjectIntervalReceivers.map(r=>R('Odbiorca '+r.id))],
    live:{start:0,window:t.window,keep:t.keep,margin:t.margin,defaultClose:hub.defaultClose,actions:hub.actions,defaults:hub.defaults,
      actionGap:t.actionGap,settle:t.settle,autoplay:true,variant:subjectIntervalVariant},
    playback:{entry:'manual',finish:'hold',live:true,stops:hub.actions.map((id,i)=>({id:{A:'unsub-a',B:'unsub-b',C:'unsub-c'}[id]??id,time:settled[i]}))},
  });
  Object.assign(scene,subjectIntervalVariant(scene,{from:0,to:t.window,closedAt:null,actions:[]}));
}
// share + interval (04a-dwa-tory-3): odpowiednik Subject + interval z interval(1000).pipe(share()).
export const configureShareInterval=scene=>configureSubjectInterval(scene,'share');

// Wariant dla okna [from, to], wykonanych akcji (czasy ilustracji, w kolejności live.actions) i opcjonalnego
// zamrożenia closedAt (druk, „pokaż wynik”: skończona scena bez nowych emisji, źródło nadal bez complete).
// Odbiorca dostaje wartości, które dotarły do huba przed jego unsubscribe; potem rusza impuls ×.
// Zatrzymanie upstreamu w chwili u (Subject: connection.unsubscribe(), share: unsubscribe ostatniego odbiorcy):
// interval nie emituje od u; wartość już wysłana dociera do huba (gaśnie), potem impuls × biegnie do interval —
// w share dopiero, gdy × ostatniego odbiorcy dotrze do share(). Scena staje się skończona (stopTail po migawce).
function subjectIntervalVariant(scene,{from,to,closedAt,actions=[]}) {
  const t=subjectIntervalTiming,kind=intervalHubOf(scene),hub=intervalHubs[kind],share=kind==='share',closed=closedAt!==null&&closedAt!==undefined;
  // calls: chwile subX.unsubscribe() odbiorców A, B, C (sequence rozwija jedną akcję w trzy kolejne wywołania).
  const calls=hub.sequence?(actions.length?subjectIntervalReceivers.map((_,i)=>actions[0]+i*hub.sequence):[]):actions;
  const emitAt=k=>t.first+t.period*k,arrival=k=>emitAt(k)+t.travel,split=k=>arrival(k)+t.hold,delivered=k=>split(k)+t.travel;
  const stopCalledAt=share?(calls.length>=subjectIntervalReceivers.length?Math.max(...calls.slice(0,subjectIntervalReceivers.length)):undefined)
    :actions[hub.actions.indexOf('connection')];
  const kLast=stopCalledAt===undefined?Infinity:Math.ceil((stopCalledAt-t.first)/t.period)-1;
  const kTo0=Math.min(Math.floor(((closed?closedAt:to)-t.first)/t.period),kLast);
  const receivers=subjectIntervalReceivers.map((r,i)=>{
    const at=calls[i];
    if(at===undefined)return {...r,kMax:kTo0,unsubscribeAt:null};
    const kMax=Math.min(kTo0,Math.ceil((at-t.first-t.travel)/t.period)-1);
    const unsubscribeAt=Math.max(at,kMax>=0?delivered(kMax):at);
    return {...r,kMax,calledAt:at,unsubscribeAt,doneAt:unsubscribeAt+t.cancel+t.calloutHold};
  });
  const lastOut=share&&stopCalledAt!==undefined?receivers.reduce((a,b)=>b.unsubscribeAt>a.unsubscribeAt?b:a):null;
  const connection=stopCalledAt===undefined?null:(()=>{
    const floor=share?lastOut.unsubscribeAt+t.cancel:stopCalledAt,unsubscribeAt=Math.max(floor,kLast>=0?arrival(kLast):floor);
    return {kLast,calledAt:stopCalledAt,unsubscribeAt,doneAt:unsubscribeAt+t.cancel+t.calloutHold};
  })();
  const finite=connection?connection.doneAt+t.stopTail:Infinity,end=closed?closedAt:Math.min(to,finite);
  const kFrom=Math.max(0,Math.floor((from-t.first)/t.period)-3),kTo=Math.min(Math.floor((end-t.first)/t.period),kLast);
  for(const r of receivers)if(r.unsubscribeAt===null)r.kMax=kTo;
  const sourceAt=actions[hub.actions.indexOf('source')];
  const emitted=time=>Math.max(0,Math.min(kTo+1,Math.floor((time-t.first)/t.period)+1));
  const hubMark={id:kind,bg:'rgba(216,179,230,.45)',line:'#b384c6'};
  // Subject: connection bez stałego wyróżnienia; świeci od etapu source (źródło pracuje bez odbiorców).
  // share: share() świeci, gdy sam odłącza upstream (× ostatniego odbiorcy dotarł do share() → interval zatrzymany).
  const connectionMark={id:'connection',bg:'rgba(35,143,131,.16)',line:subjectUpstream.color,quiet:true};
  const lines=share?[[{text:'const shared$ = interval(1000).pipe('},{text:'share()',mark:hubMark,
      active:connection?[{from:{type:'disconnected',edge:'share-'+lastOut.id},to:{type:'disconnected',edge:'interval-share'}}]:[]},{text:');'}]]
    :[[{text:'const subject$ = '},{text:'new Subject<number>()',mark:hubMark},{text:';'}],
      [{text:'const connection = '},{text:'interval(1000).subscribe(subject$)',mark:connectionMark,
        active:sourceAt===undefined?[]:[{from:{type:'connection-focus'},to:{type:'connection-focus-end'}}]},{text:';'}]];
  const unsubscribed=receivers.filter(r=>r.unsubscribeAt!==null);
  const leaving=share?{A:'A, B i C odłączają się po kolei. Dopóki ktoś słucha, share() subskrybuje interval'}:{A:'A się odłącza. B i C nadal odbierają',B:'B się odłącza. Odbiera już tylko C',
    C:'Odłącza się ostatni odbiorca. Co stanie się z interval?'};
  return {...scene,subjectIntervalPlan:{kFrom,kTo,receivers,sourceAt,connection,end},
    duration:closed?closedAt:Math.min(to,finite),
    liveBusyUntil:hub.actions.map((id,i)=>id==='connection'||hub.sequence||lastOut?.id===id?connection?.doneAt:receivers.find(r=>r.id===id)?.doneAt??actions[i]),
    code:lines.map(line=>line.map(part=>part.text).join('')).join('\n'),codeLines:lines,codeFrames:[],
    metrics:[{label:'Emisje interval',value:emitted},
      {label:hub.receiversLabel,value:time=>receivers.length-unsubscribed.filter(r=>time>=r.unsubscribeAt).length}],
    captions:[[0,`interval emituje co sekundę. ${hub.label} rozsyła każdą wartość do A, B i C`],
      ...unsubscribed.filter(r=>leaving[r.id]).map(r=>[r.calledAt,leaving[r.id]]),
      ...(sourceAt===undefined?[]:[[sourceAt,'interval nadal emituje do Subject. connection pozostaje aktywne']]),
      ...(connection&&!share?[[connection.calledAt,'connection.unsubscribe(): odłączamy interval od Subjecta'],
        [connection.doneAt,'interval zatrzymany. Subject nadal otwarty — bez complete']]:[]),
      ...(connection&&share?[[connection.unsubscribeAt,'Nikt już nie słucha: share() sam odłącza interval'],
        [connection.doneAt,'interval zatrzymany przez share(). Bez complete i bez ręcznego connection']]:[])]};
}

export function subjectIntervalGraph(scene) {
  const tall=scene.format==='4:3',top=tall?178:102,t=subjectIntervalTiming,{kFrom,kTo,receivers,sourceAt,connection,end}=scene.subjectIntervalPlan;
  const kind=intervalHubOf(scene),hubId=kind,share=kind==='share',upstream='interval-'+hubId;
  // Kolumny: interval(1000) mieści etykietę w jednej linii, hub (Subject/share()) jak na slajdzie HTTP, kompaktowi odbiorcy; odstępy 110.
  const g={sourceX:212,sourceW:310,subjectX:592,subjectW:230,recvX:1000,recvW:366};
  const pos=r=>({x:g.recvX,w:g.recvW,y:laneRowY(top,r.slot)});
  // Kulka liczby mieści trzy cyfry; wartości mają kolor emisji (fill toru #1) jak w Subject + HTTP.
  const ball={r:34,font:30},fill=subjectUpstream.fill,emitAt=k=>t.first+t.period*k;
  const value=(k,at,arrival)=>({value:String(k),color:fill,at,arrival,logicalAt:emitAt(k)});
  const range=(a,b)=>Array.from({length:Math.max(0,b-a+1)},(_,i)=>a+i);
  const preconnected={start:-2,connectDuration:.8};
  // Ostatnia kulka odbiorcy stoi w wolnej części wiersza; poprzednia odjeżdża w lewo, nie zasłaniając litery.
  const trayX=g.recvX+g.recvW/2-143;
  return {layout:'fixed',formatAware:true,width:1240,height:tall?612:460,...laneGraphLook(),ball,
    subscribers:{A:laneSubscribers.A,B:laneSubscribers.B,C:laneSubscribers.C,U:subjectUpstream},
    nodes:[{id:'interval',x:g.sourceX,w:g.sourceW,label:'interval(1000)',...laneTile('source',top,{U:0},1)},
      {id:hubId,x:g.subjectX,w:g.subjectW,label:intervalHubs[kind].label,...(share?{color:'op'}:{}),splitBalls:true,splitAt:0,splitGuides:false,upstreamStripe:false,hubFan:false,
        dropBalls:true,...laneTile('operator',top,{U:0,...Object.fromEntries(receivers.map(r=>[r.id,r.slot]))},receivers.length)},
      ...receivers.map(r=>laneReceiver(r.id,r.id,pos(r),{ready:true}))],
    edges:[{id:upstream,from:'interval',to:hubId,subscriber:'U',logicalStart:-2,cancelPulse:true},
      ...receivers.map(r=>({id:hubId+'-'+r.id,from:hubId,to:r.id,subscriber:r.id,logicalStart:-2,cancelPulse:true}))],
    schedule:{[upstream]:{...preconnected,events:range(kFrom,kTo).map(k=>value(k,emitAt(k),emitAt(k)+t.travel)),
      // Zatrzymanie upstreamu: wyłącznie unsubscribe połączenia (impuls × od huba do interval), nigdy complete.
      ...(connection?{end:{at:connection.unsubscribeAt,logicalAt:connection.unsubscribeAt,kind:'unsubscribe',duration:t.cancel}}:{})},
      ...Object.fromEntries(receivers.map(r=>[hubId+'-'+r.id,{...preconnected,
        // Także ostatnie wartości sprzed okna: odłączony odbiorca zachowuje ostatnią odebraną liczbę.
        events:range(Math.max(0,Math.min(kFrom,r.kMax-1)),r.kMax).map(k=>{const split=emitAt(k)+t.travel+t.hold;return value(k,split,split+t.travel);}),
        ...(r.unsubscribeAt===null?{}:{end:{at:r.unsubscribeAt,logicalAt:r.unsubscribeAt,kind:'unsubscribe',duration:t.cancel}})}]))},
    trays:receivers.map(r=>({...laneTray(r.id,pos(r),1,ball),x:trayX})),
    // subX.unsubscribe() w miejscu nagłówka kolumny odbiorców (odbiorcy nie mają nagłówka), z literą i kolorem toru:
    // od wywołania do chwili po dotarciu impulsu × do huba; w sekwencji (share) najpóźniej do wywołania następnego
    // (fade kończy się w tej chwili), żeby migawki się nie nakładały.
    callouts:[...receivers.filter(r=>r.unsubscribeAt!==null).map((r,i,all)=>{
      const next=all[i+1],until=intervalHubs[kind].sequence&&next&&next.calledAt<r.unsubscribeAt+t.cancel+t.calloutHold
        ?{type:'unsubscribe-call',edge:hubId+'-'+next.id,offset:-.3}:laneEvent('disconnected',hubId+'-'+r.id,t.calloutHold);
      return {...laneCallout(`sub${r.id}.unsubscribe()`,r.id,{type:'unsubscribe-call',edge:hubId+'-'+r.id},until,{x:g.recvX,y:top+laneLook.defH/2}),size:34};}),
      // connection.unsubscribe() nad połączeniem interval → Subject, z etykietą toru #1 (share() robi to sam, bez migawki).
      ...(connection&&!share?[{...laneCallout('connection.unsubscribe()','U',{type:'unsubscribe-call',edge:upstream},
        laneEvent('disconnected',upstream,t.calloutHold),{x:(g.sourceX+g.sourceW/2+g.subjectX-g.subjectW/2)/2,y:top/2}),size:34,label:'#1'}]:[])],
    timeline:[...receivers.filter(r=>r.unsubscribeAt!==null).map(r=>({type:'unsubscribe-call',edge:hubId+'-'+r.id,at:r.calledAt})),
      ...(connection&&!share?[{type:'unsubscribe-call',edge:upstream,at:connection.calledAt}]:[]),
      ...(sourceAt===undefined?[]:[{type:'connection-focus',at:sourceAt},{type:'connection-focus-end',at:end+1}])],
  };
}

// Czasy animacji pomocniczych grafu shareReplay(1) na interval: zapis do pamięci, impuls ×, wygaszenie migawki.
const shareReplayIntervalTiming={store:.4,cancel:.8,calloutHold:.4};
// shareReplay(1) na interval (MAIN 20a-sharereplay-interval, przed shareReplay z refCount: true na HTTP): interval(1000)
// → shareReplay(1) z kulką pamięci w nagłówku → A/B, cztery kroki. A subskrybuje i dostaje 0, 1, 2 → subA.unsubscribe() (× kończy się na shareReplay, bufor dalej
// się aktualizuje: 3) → B subskrybuje, dostaje 3 z bufora i 4 na żywo → subB.unsubscribe(): znów zero odbiorców,
// a interval nadal pracuje (bufor 5, potem AUTO 6 i 7). shareReplay(1) = refCount: false — nikt nie zatrzyma źródła.
const shareReplayOnePlan={
  subscribeA:.6,connectedA:1.1,upstreamStart:1.1,upstreamConnected:1.6,unsubscribeCall:7.5,unsubscribeA:7.6,
  disconnectedA:8.4,subscribeB:10,connectedB:10.5,unsubscribeCallB:13.3,unsubscribeB:13.4,disconnectedB:14.2,
  upstream:[
    {value:'0',at:2,arrival:2.7},{value:'1',at:3.5,arrival:4.2},{value:'2',at:5,arrival:5.7},
    {value:'3',at:8.2,arrival:8.9},{value:'4',at:10.6,arrival:11.3},{value:'5',at:13.7,arrival:14.4},
    {value:'6',at:15.2,arrival:15.9},{value:'7',at:16.7,arrival:17.4},
  ],
  a:[{value:'0',at:3.1,arrival:3.9},{value:'1',at:4.6,arrival:5.4},{value:'2',at:6.1,arrival:6.9}],
  // 3 to replay z bufora (zapisane bez odbiorców), 4 — emisja na żywo.
  b:[{value:'3',at:10.9,arrival:11.7,logicalAt:10.5},{value:'4',at:12,arrival:12.8,logicalAt:10.6}],
  duration:18.5,
};
export function configureShareReplayOne(scene) {
  const p=shareReplayOnePlan,intervalMark={id:'interval',bg:'rgba(143,201,212,.4)',line:'#4fa5b5'};
  const shareMark={id:'share',bg:'rgba(216,179,230,.45)',line:'#b384c6'};
  // shareReplay(1) świeci, gdy po odejściu ostatniego odbiorcy nadal zapisuje wartości interval.
  const lines=[[{text:'const shared$ = '},{text:'interval',mark:intervalMark},{text:'(1000).pipe('},
    {text:'shareReplay(1)',mark:shareMark,active:[{from:{type:'refcount-focus'},to:{type:'refcount-focus-end'}},
      {from:{type:'refcount-focus-2'},to:{type:'refcount-focus-end-2'}}]},{text:');'}]];
  const live=(t,from,to)=>t>=from&&(to===undefined||t<to)?1:0;
  Object.assign(scene,{graph:shareReplayIntervalGraph,playerLayout:'function',ink:'#26323B',playerClass:'rx-lanes rx-flat-tiles rx-two-lines',
    title:'shareReplay(1): kto zatrzyma interval?',duration:p.duration,shareReplayPlan:p,
    code:lines.map(line=>line.map(part=>part.text).join('')).join('\n'),codeLines:lines,codeFrames:[],
    rows:[R('interval(1000)'),R('shareReplay(1)'),R('Odbiorca A'),R('Odbiorca B')],
    metrics:[{label:'Odbiorcy',value:t=>live(t,p.connectedA,p.disconnectedA)+live(t,p.connectedB,p.disconnectedB)},
      {label:'Upstream',value:t=>live(t,p.upstreamConnected)}],
    captions:[[0,'interval(1000).pipe(shareReplay(1)): definicja, pusty bufor. Nic jeszcze nie działa'],
      [p.subscribeA,'A subskrybuje. shareReplay(1) podłącza się do interval'],
      [p.upstream[0].at,'interval emituje 0, 1, 2. shareReplay(1) zapamiętuje ostatnią wartość'],
      [p.unsubscribeCall,'A się odłącza. Impuls × kończy się na shareReplay(1)'],
      [p.upstream[3].at,'Zero odbiorców, a interval nadal emituje. Bufor: 3'],
      [p.subscribeB,'B subskrybuje: najpierw 3 z bufora, potem 4 na żywo'],
      [p.unsubscribeCallB,'B się odłącza. Znowu zero odbiorców'],
      [p.upstream[5].at,'interval nadal pracuje: shareReplay(1) nigdy nie odłącza źródła'],
      [p.upstream[7].arrival+.4,'Zero odbiorców, bufor: 7. shareReplay(1) nie zatrzyma interval — refCount: false']],
    playback:manual([
      {id:'subscribed-a',time:7.25,caption:'A podłączony, interval emituje. A dostał 0, 1, 2; bufor: 2'},
      {id:'unsub-a',time:9.5,caption:'A odłączony. Odbiorcy: 0, Upstream: 1 — interval emituje dalej, bufor: 3'},
      {id:'subscribed-b',time:13.15,caption:'B dostał 3 z bufora, a potem 4 na żywo z tego samego interval'},
      {id:'unsub-b',time:15,caption:'B odłączony. Odbiorcy: 0, a interval nadal pracuje — bufor: 5'},
    ]),
  });
}

export function shareReplayIntervalGraph(scene) {
  const tall=scene.format==='4:3',top=tall?178:102,t=shareReplayIntervalTiming,p=scene.shareReplayPlan;
  // Kolumny: interval(1000), shareReplay(1) z lokalną pamięcią w nagłówku oraz odbiorcy A/B.
  // Upstream ma pustą etykietę: na tym slajdzie nie pokazujemy numerowanego wykonania #1.
  const g={sourceX:205,sourceW:310,hubX:600,hubW:330,recvX:1020,recvW:350};
  const receivers=[{id:'A',slot:0,born:p.subscribeA-.3},{id:'B',slot:1,born:p.subscribeB-.3}];
  const pos=r=>({x:g.recvX,w:g.recvW,y:laneRowY(top,r.slot)}),fill=subjectUpstream.fill;
  const values=events=>events.map(e=>({...e,color:fill,logicalAt:e.logicalAt??e.at}));
  const callout=(text,subscriber,from,to)=>({...laneCallout(text,subscriber,from,to,{x:620,y:top/2}),size:34});
  return {layout:'fixed',formatAware:true,width:1240,height:tall?612:460,...laneGraphLook(),
    subscribers:{A:laneSubscribers.A,B:laneSubscribers.B,U:{...subjectUpstream,label:''}},
    nodes:[{id:'interval',x:g.sourceX,w:g.sourceW,label:'interval(1000)',...laneTile('source',top,{U:0},1)},
      {id:'share',x:g.hubX,w:g.hubW,label:'shareReplay(1)',labelX:g.hubX-40,labelSize:31,color:'op',
        replayMemory:{header:true,x:g.hubX+118,y:top+laneLook.defH/2},hubFan:false,
        ...laneTile('operator',top,{U:0,A:0,B:1},2)},
      ...receivers.map(r=>laneReceiver(r.id,r.id,pos(r),{ready:false,born:r.born,laneTerminalText:{cancelled:'×'}}))],
    edges:[{id:'interval-share',from:'interval',to:'share',subscriber:'U',logicalStart:p.upstreamStart,fixedStart:true},
      {id:'share-A',from:'share',to:'A',subscriber:'A',logicalStart:p.subscribeA,cancelPulse:true},
      {id:'share-B',from:'share',to:'B',subscriber:'B',logicalStart:p.subscribeB,fixedStart:true,cancelPulse:true}],
    schedule:{
      'interval-share':{start:p.upstreamStart,connectDuration:p.upstreamConnected-p.upstreamStart,events:values(p.upstream)},
      'share-A':{start:p.subscribeA,connectDuration:p.connectedA-p.subscribeA,events:values(p.a),
        end:{at:p.unsubscribeA,logicalAt:p.unsubscribeA,kind:'unsubscribe',duration:t.cancel}},
      'share-B':{start:p.subscribeB,connectDuration:p.connectedB-p.subscribeB,events:values(p.b),
        end:{at:p.unsubscribeB,logicalAt:p.unsubscribeB,kind:'unsubscribe',duration:t.cancel}},
    },
    trays:receivers.map(r=>laneTray(r.id,pos(r),3)),
    callouts:[callout('const subA = shared$.subscribe(…)','A',laneEvent('subscribe','share-A'),laneEvent('connected','interval-share')),
      callout('subA.unsubscribe()','A',{type:'unsubscribe-call',edge:'share-A'},laneEvent('disconnected','share-A',t.calloutHold)),
      callout('const subB = shared$.subscribe(…)','B',laneEvent('subscribe','share-B',-.3),laneEvent('connected','share-B',.4)),
      callout('subB.unsubscribe()','B',{type:'unsubscribe-call',edge:'share-B'},laneEvent('disconnected','share-B',t.calloutHold))],
    timeline:[{type:'unsubscribe-call',edge:'share-A',at:p.unsubscribeCall},
      {type:'refcount-focus',at:p.disconnectedA},{type:'refcount-focus-end',at:p.subscribeB},
      {type:'unsubscribe-call',edge:'share-B',at:p.unsubscribeCallB},
      {type:'refcount-focus-2',at:p.disconnectedB},{type:'refcount-focus-end-2',at:p.duration+1}],
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
      // concatAll: inner ujawnia się po dotarciu Observable utworzonego przez map.
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
export const frameFor = scene => frames[scene.format==='4:3'?'4:3':'16:9'];

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
  // Główny tor S1 zestawiony przed READY: scena nie powtarza animacji subskrypcji (porównanie 10–12).
  if (scene.preconnected) for (const edge of graph.edges.filter(e=>!e.internal)) edge.preconnected=true;
  return graph;
}

// Główny tor S1 nad lokalnymi requestami. Prototypy i dodatki zachowują swoje modele.
// Opcjonalne columns/stages/edge pozwalają dodać kolejne etapy wiersza (np. HTTP GET → catchError); domyślnie jeden etap HTTP GET.
// tiles nadpisuje górne kafelki [id,x,w,nagłówek] (np. klik$ → switchMap → catchError). Dół to panel instancji.
export function configureHttpWorkPanel(graph,scene,frame,{columns=[{id:'source',label:'HTTP GET',fill:'#8FC9D4',runtime:'#E3F0F3'}],
  stages=i=>[{column:'source',edge:'inner'+i+'-op',progress:true}],edge=i=>'inner'+i+'-op',tiles:customTiles}={}) {
  const large=scene.format==='4:3',top=large?28:10,defH=large?70:56,rowH=large?74:64;
  const all=scene.operatorName==='concatAll';
  const laneY=top+defH+rowH/2;
  const main={color:'#7457D9',fill:'#D9CFF5',ink:'#513A9A',label:'S1'};
  Object.assign(graph,{subscribers:{S1:main},laneWire:5,portRadius:11,ball:{r:25,font:29,textFill:'#fff'},
    ...(large?{textScale:1.4,labelScale:1.6}:{})});
  const tiles=customTiles||(all?[['source',145,190,'#8FC9D4'],['projection',400,230,'#D8B3E6'],['op',677.5,235,'#D8B3E6']]:
    [['source',205,310,'#8FC9D4'],['op',600,310,'#D8B3E6']]);
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
    node:'inner'+i,edge:edge(i),queuedNode:graph.nodes.some(n=>n.id==='queued'+i)?'queued'+i:undefined,
    ...(all?{value:job.value+'$',...(scene.jobs.length>1?{queueObservable:true,queueLabel:'W KOLEJCE · Observable'}:{})}:{}),
    ...(job.ignored?{ignoredNode:'ignored'+i}:{}),
    // Wejście z decide: wiersz pokazuje „?” od dotarcia do operatora aż do reakcji.
    ...(scene.rows[0].events.some(e=>e.value===job.value&&e.decide)?{input:{edge:all?'projection-op':'source-op',value:job.value}}:{}),
    duration:job.dur??job.end-job.start,stages:stages(i)}));
  // Dół: każde uruchomione inner to pełny pipeline (#n → kulka → HTTP GET → … → inner subscriber); trzy sloty
  // we wspólnych kolumnach panelu, niezależnych od kafelków u góry.
  const panel=createInnerWorkPanel({works,height:frame.height,large,columns});
  Object.assign(panel,{ballText:'#fff',portRadius:11,wire:5,ball:large?graph.ball:{r:20,font:23},
    // Teardown anulowanego inner jako szary impuls × (switchMap); tempo paska do decyzji operatora (09–12).
    cancelPulse:true,pace:true});
  graph.panels=[panel];
  for(const node of graph.nodes.filter(n=>n.workRow))Object.assign(node,{x:panel.x+panel.w/2,
    y:panel.rowsTop+node.slot*panel.rowStep+panel.headerH+panel.rowHeight/2,w:panel.w-32,h:panel.rowHeight});
  // Subscribe inner trwa tyle co jeden krok głównego toru (0,5 s), nie cały łańcuch.
  for(const edge of graph.edges.filter(e=>e.internal))Object.assign(edge,{travel:1,connect:.5});
  const byValue=new Map(scene.jobs.flatMap((job,i)=>[[job.value,works[i].color],[job.value+'$',works[i].color]]));
  const emitted=new Map(graph.edges.filter(e=>e.internal).flatMap(e=>e.events.map(v=>
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

// MAIN 09–12 porównują jeden problem: A uruchamia długi HTTP, B przychodzi w połowie jego pracy, C dopiero po
// zakończeniu A. Dane, kolory i tempo są identyczne; zmienia się tylko operator. B po dotarciu do operatora czeka
// (decide, czas ilustracji) na pytanie, zanim operator pokaże reakcję.
const comparisonSlides=new Set(['09-concatmap','10-mergemap','11-switchmap','12-exhaustmap']);
const comparison={input:[{at:.6,value:'A',dur:3},{at:2.1,value:'B',dur:1.2},{at:5.2,value:'C',dur:1.2}],sourceComplete:5.6,decide:.6};

export function configureFlatten(scene,mode) {
  const all=mode==='concatAll',httpWork=httpWorkSlides.has(scene.id),compare=comparisonSlides.has(scene.id)&&!all;
  const intro=httpWork&&all;
  const concatHttp=scene.id==='09-concatmap'&&mode==='concatMap'&&!compare;
  // Wspólne wejście i potencjalny czas pracy dla czterech strategii.
  const input=compare?comparison.input.map((v,i)=>({...v,color:['a','b','c'][i]})):
    (intro?[1]:all?[1,1.2,1.4]:[1,1.45,1.9,2.7]).map((at,i)=>({at,value:'ABCD'[i],dur:1.2,color:['a','b','c','a'][i]}));
  let end=0;
  const jobs=input.map((v,i)=>{
    if(mode==='exhaustMap'&&v.at<end)return {...v,ignored:true};
    const start=mode==='concatMap'||all?Math.max(v.at,end):v.at,natural=start+v.dur;
    end=mode==='switchMap'&&input[i+1]?Math.min(natural,input[i+1].at):natural;
    return {...v,start,end,cancelled:end<natural};
  });
  const result=[],rows=[R('wejście',input.map(v=>({...E(v.at,v.value,v.color),...(compare&&v.value==='B'?{decide:comparison.decide}:{})})),[],
    {completeAt:compare?comparison.sourceComplete:3})];
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
    // Tempo ilustracji: krok subscribe 0,5 s (od operatorów szybciej niż w 04a), przelot 1 s, przekształcenie w map 1,4 s, terminal 0,8 s.
    ...(httpWork?{playerClass:'rx-flat-tiles',timing:{subscribe:all?1.5:1,travel:1,transform:1.4,terminal:.8,gap:.5}}:{}),
    code:httpWork?(all?'id$.pipe(map(id => httpGet(url(id))), concatAll())':`id$.pipe(${mode}(id => httpGet(url(id))))`):all?'source$.pipe(map(id => request$(id)), concatAll())':mode==='switchMap'?'id$.pipe(switchMap(id => httpGet(`/api/users/${id}`)))':`source$.pipe(${mode}(makeInner$))`,
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
  if(compare)configureComparison(scene,mode);
  else if(mode==='mergeMap')overlapTail(scene);
  if(intro) {
    configureConcatAllIntro(scene);
  }
  configureFlattenPlayback(scene);
  if(intro) {
    scene.metrics=[{label:'Innery uruchomione',count:'started'},{label:'Aktywne',count:'active'}];
    scene.timeline=[]; // Podsumowanie jest ostatnim ręcznym checkpointem, bez dodatkowego etapu AUTO.
  }
}

// Jeden główny tor, dwa kolejne HTTP. Harmonogram rozdziela pojawienie się definicji innera,
// subscribe, next i complete na ręczne kroki, bez zmiany synchronicznej semantyki map.
function configureConcatAllIntro(scene) {
  const timing={subscribe:.4,travel:.6,transform:.6,request:.8,terminal:.4,reveal:.3,hold:.2};
  const seconds=value=>Math.round(value*1e9)/1e9;
  const after=(at,...delays)=>seconds(at+delays.reduce((sum,value)=>sum+value,0));
  const sequence=emitted=>{
    const arrived=after(emitted,timing.travel),mapped=after(arrived,timing.transform),created=after(mapped,timing.travel);
    const subscribe=after(created,timing.reveal,timing.hold),connected=after(subscribe,timing.subscribe);
    const response=after(connected,timing.request),innerReceived=after(response,timing.travel),received=after(innerReceived,timing.travel);
    const complete=after(received,timing.reveal,timing.hold),completed=after(complete,timing.terminal);
    return {emitted,arrived,mapped,created,subscribe,connected,response,innerReceived,received,complete,completed};
  };
  const subscribed=after(.3,3*timing.subscribe),a=sequence(after(subscribed,.3));
  const b=sequence(after(a.completed,.45)),sourceComplete=after(b.completed,.55);
  const duration=after(sourceComplete,3*timing.terminal,.35),outerComplete=5.5;
  const jobs=[{at:1,value:'A',color:'a'},{at:4,value:'B',color:'b'}].map(v=>({...v,start:v.at,end:v.at+timing.request,dur:timing.request}));
  const results=jobs.map(job=>E(job.end,job.value,job.color));
  const rows=[R('wejście',jobs.map(job=>E(job.at,job.value,job.color)),[],{completeAt:outerComplete}),
    R('map',jobs.map(job=>E(job.at,job.value+'$',job.color)),[],{completeAt:outerComplete}),
    ...jobs.map((job,i)=>R(job.value+'$',[results[i]],[B(job.start,job.end,job.value,'work',{duration:job.dur})],{completeAt:job.end})),
    R('wynik',results,[],{completeAt:outerComplete})];
  const summary='map tworzy Observable. concatAll subskrybuje je po kolei i przekazuje wyniki do S1.';
  Object.assign(scene,{rows,jobs,duration,timing,
    graph:concatAllIntroGraph,
    concatAllIntro:{timing,a,b,sourceComplete,outerComplete},
    captions:[[0,'map może zwrócić Observable. Prześledźmy dwie wartości i dwa kolejne requesty HTTP.'],[duration,summary]],
    playback:{entry:'manual',finish:'hold',stops:[
      {id:'subscribe',event:{type:'connected',edge:'source-projection'},offset:.15,
        caption:'S1 subskrybuje id$ przez concatAll i map. HTTP jeszcze nie działa.'},
      {id:'first',event:{type:'deliver-next',edge:'source-projection',value:'A'},offset:.05,
        caption:'A dotarło do map. Projekcja zwróci zimne Observable HTTP.'},
      {id:'created',event:{type:'inner-create',node:'inner0'},offset:.35,
        caption:'A$ dotarło do concatAll. HTTP GET i inner #1 są gotowe, ale request jeszcze nie działa.'},
      {id:'active',event:{type:'inner-subscribe',node:'inner0'},
        caption:'Inner #1 subskrybuje HTTP GET. Rozpoczyna się pierwszy request.'},
      {id:'received',event:{type:'deliver-next',edge:'op-observer',value:'A'},offset:.35,
        caption:'HTTP przekazuje A do inner #1, a concatAll do S1. HTTP nie wysłał jeszcze complete.'},
      {id:'complete-a',event:{type:'disconnected',edge:'inner0-op'},offset:.15,
        caption:'HTTP #1 zakończony. Główna subskrypcja nadal czeka na kolejne wartości źródła.'},
      {id:'complete-b',event:{type:'disconnected',edge:'inner1-op'},offset:.15,
        caption:'B → B$ → drugi request HTTP → B do S1 → complete inner #2. Oba wyniki są u odbiorcy.'},
      {id:'complete',time:duration,caption:summary},
    ]},timeline:[]});
}

function concatAllIntroGraph(scene) {
  const graph=flattenGraph(scene),{timing,a,b,sourceComplete,outerComplete}=scene.concatAllIntro;
  const end=(at,logicalAt)=>({at,logicalAt,kind:'complete',duration:timing.terminal});
  const next=(at,arrival,logicalAt,value,color)=>({at,arrival,logicalAt,value,color});
  const colors=graph.panels[0].works.map(work=>work.color);
  graph.schedule={
    'source-projection':{start:1.1,connectDuration:timing.subscribe,end:end(sourceComplete,outerComplete),
      events:[a,b].map((p,i)=>next(p.emitted,p.arrived,scene.jobs[i].at,scene.jobs[i].value,colors[i]))},
    'projection-op':{start:.7,connectDuration:timing.subscribe,end:end(sourceComplete+timing.terminal,outerComplete),
      events:[a,b].map((p,i)=>next(p.mapped,p.created,scene.jobs[i].at,scene.jobs[i].value+'$',colors[i]))},
    'op-observer':{start:.3,connectDuration:timing.subscribe,end:end(sourceComplete+2*timing.terminal,outerComplete),
      events:[a,b].map((p,i)=>next(p.innerReceived,p.received,scene.jobs[i].end,scene.jobs[i].value,colors[i]))},
    ...Object.fromEntries([a,b].map((p,i)=>['inner'+i+'-op',{
      start:p.subscribe,connectDuration:timing.subscribe,end:end(p.complete,scene.jobs[i].end),
      events:[next(p.response,p.innerReceived,scene.jobs[i].end,scene.jobs[i].value,colors[i])],
    }])),
  };
  const receiver=graph.nodes.find(node=>node.id==='observer');
  Object.assign(receiver,{ready:true,inbox:{...receiver.inbox,ready:true}});
  // schedule używa czasu ilustracji: lokalny stan pracy węzła ma te same granice co jego połączenie.
  for(const [i,p] of [a,b].entries()) {
    const job=scene.jobs[i];
    graph.nodes.find(node=>node.id==='inner'+i).lifecycleRow={...scene.rows[i+2],
      spans:[B(p.connected,p.complete,job.value,'work')],completeAt:p.complete};
  }
  // Nie ma kolejki: B nadchodzi dopiero po complete A. Utworzone A$ czeka tylko na ilustrację subscribe.
  for(const work of graph.panels[0].works)delete work.queueObservable;
  return graph;
}

// Podpisy i postoje porównania. concatMap pokazuje pełną subskrypcję S1; pozostałe trzy zaczynają od zestawionego S1
// (preconnected) i jednym „dalej” dochodzą do tego samego pytania. Odpowiedź zawsze wymaga kolejnego „dalej”.
function configureComparison(scene,mode) {
  const first=mode==='concatMap',question='A wciąż pracuje. Przychodzi B. Co teraz?';
  const ev=(type,extra)=>({type,...extra}),arrivedB=ev('deliver-next',{edge:'source-op',value:'B'});
  const answer={
    concatMap:{id:'answer',event:arrivedB,offset:comparison.decide+.4,caption:'concatMap: B czeka w kolejce. Projekcja B nie została wywołana'},
    mergeMap:{id:'answer',event:ev('inner-subscribe',{node:'inner1'}),offset:.05,caption:'mergeMap: projekcja B i drugi HTTP równolegle z A'},
    switchMap:{id:'answer',event:ev('disconnected',{edge:'inner0-op'}),offset:.35,caption:'switchMap: unsubscribe inner A — anulowane, bez complete. S1 działa dalej'},
    exhaustMap:{id:'answer',event:arrivedB,offset:comparison.decide+.4,caption:'exhaustMap: B pominięte. Bez projekcji, bez HTTP, bez kolejki'},
  }[mode];
  Object.assign(scene,{preconnected:!first,code:`id$.pipe(${mode}(id => httpGet(url(id))))`,
    captions:[[0,first?'Projekcja zwraca Observable; concatMap decyduje, kiedy go zasubskrybować.':`Ten sam problem, inny operator: S1 już subskrybuje id$ przez ${mode}.`],
      [comparison.input[0].at,'A: projekcja tworzy inner, HTTP A startuje.'],
      [comparison.input[1].at,question],
      [comparison.input[2].at,{concatMap:'C przychodzi, gdy nic nie czeka: od razu nowy HTTP.',mergeMap:'C uruchamia kolejny HTTP.',
        switchMap:'C uruchamia nowy HTTP; nic nie trzeba anulować.',exhaustMap:'A skończone: exhaustMap przyjmuje C i uruchamia nowy HTTP.'}[mode]],
      [scene.rows.at(-1).completeAt,'id$ i wszystkie inner zakończone. Wynik: complete.']],
    playback:manual([
      ...(first?[
        {id:'subscribe',modelTime:.3,caption:'.subscribe(): S1 subskrybuje concatMap, a concatMap — id$.'},
        {id:'first',event:ev('deliver-next',{edge:'source-op',value:'A'}),caption:'A dotarło do concatMap. Projekcja: id => httpGet(url(A))'},
        {id:'active',event:ev('inner-subscribe',{node:'inner0'}),offset:.05,caption:'concatMap subskrybuje inner A: HTTP A startuje.'}]:[]),
      {id:'question',event:arrivedB,offset:.35,caption:question},
      answer,
      ...(mode==='switchMap'?[{id:'started',event:ev('inner-subscribe',{node:'inner1'}),offset:.05,caption:'Projekcja B: nowy inner i nowy HTTP. Wynik B trafi do S1'}]:[]),
    ]),
  });
  const after={concatMap:'A complete: dopiero teraz projekcja B i HTTP B.',mergeMap:'B wróciło przed A: wyniki w kolejności odpowiedzi.',
    switchMap:'Wynik B trafia do S1. Anulowane A nie wysłało complete.',exhaustMap:'A kończy się normalnie. B nie wraca — exhaustMap nie ma kolejki.'}[mode];
  const selector={concatMap:ev('inner-subscribe',{node:'inner1'}),mergeMap:ev('deliver-next',{edge:'op-observer',value:'B'}),
    switchMap:ev('deliver-next',{edge:'op-observer',value:'B'}),exhaustMap:ev('deliver-next',{edge:'op-observer',value:'A'})}[mode];
  // Podpis odpowiedzi pojawia się razem z reakcją operatora (koniec decide), nie dopiero na postoju.
  scene.timeline=[{type:'operator-decision',event:arrivedB,offset:comparison.decide,caption:answer.caption},
    {type:'comparison-after',event:selector,caption:after}];
}

export function configureFlattenPlayback(scene) {
  const mode=scene.operatorName;
  scene.flattenLayout=true;
  scene.playerLayout='expanded';
  scene.metrics=[{label:'uruchomione',count:'started'},{label:'aktywne',count:'active'}];
  if(scene.playback?.stops)scene.playback={...scene.playback,finish:'hold',stops:scene.playback.stops.map(stop=>
    stop.id==='first'||stop.id==='question'&&['concatMap','concatAll'].includes(mode)?{...stop,offset:stop.offset??.35}:stop)};
  else scene.playback={entry:'auto',finish:'hold'};
  const final=scene.captions.at(-1);
  if(final?.[0]===scene.rows.at(-1).completeAt)scene.captions=scene.captions.slice(0,-1);
  scene.timeline=[...(scene.timeline||[]),{type:'result-summary',event:{type:'stream-complete',edge:'op-observer'},offset:.81,caption:final?.[1]||'Ostatni inner zakończony. Wynik: complete.'}];
}

export function configureReferences(scenes) {
  configureOperator(scenes.find(s=>s.id==='04-operator'));
  configureFlatten(scenes.find(s=>s.id==='08-map-strumienie'),'concatAll');
  configureFlatten(scenes.find(s=>s.id==='11-switchmap'),'switchMap');
}

// catchError wewnątrz (b04-catcherror-2) w wyglądzie MAIN switchMap: góra klik$ → switchMap → S1, w dolnej części
// z etapami HTTP GET → catchError w każdym wierszu. Błąd HTTP A kończy tylko etap HTTP (czerwony impuls do catchError);
// catchError pokazuje chwilowe of([]), emituje [] i kończy inner A complete. Outer (klik$, switchMap, S1) nie kończy się,
// więc klik B uruchamia nowy HTTP z poprawnym wynikiem. [] wychodzi 0,5 s, a complete 1 s modelu po błędzie (jak
// next/complete w Subject), żeby błąd, fallback i zakończenie były osobno widoczne.
const insideTimes={subscribe:.3,a:1,error:4,fallback:4.5,doneA:5,b:6.5,response:9};
export function configureCatchInside(scene) {
  const at=insideTimes;
  const jobs=[{value:'A',at:at.a,start:at.a,end:at.doneA,dur:at.error-at.a},{value:'B',at:at.b,start:at.b,end:at.response,dur:at.response-at.b}];
  const fallback=E(at.fallback,'[]'),response=E(at.response,'B','b');
  const ev=(type,edge,extra={})=>({type,edge,...extra}),during=(from,to)=>({from,to});
  const op={id:'switch',bg:'rgba(216,179,230,.45)',line:'#b384c6'},http={id:'http',bg:'rgba(143,201,212,.4)',line:'#4fa5b5'};
  // Kod w dwóch liniach (pełny przykład z wcięciami nie mieści się nad diagramem); fragmenty świecą, gdy pracują.
  const lines=[[{text:'klik$.pipe('},{text:'switchMap',mark:op,active:jobs.map((job,i)=>during(ev('deliver-next','source-op',{value:job.value}),ev('inner-subscribe',`inner${i}-catch${i}`)))},{text:'(id =>'}],
    [{text:'  '},{text:'httpGet(url(id))',mark:http,active:[during(ev('inner-subscribe','inner0-catch0'),ev('stream-error','inner0-catch0')),
      during(ev('inner-subscribe','inner1-catch1'),ev('inner-next','inner1-catch1'))]},
      {text:'.pipe('},{text:'catchError(() => of([]))',mark:{...op,id:'catch'},active:[during(ev('disconnected','inner0-catch0'),ev('inner-next','catch0-op'))]},{text:')))'}]];
  Object.assign(scene,{jobs,operatorName:'switchMap',catchTimes:at,graph:catchInsideGraph,duration:at.response+1.5,
    title:'catchError wewnątrz',playerLayout:'expanded',playerClass:'rx-flat-tiles rx-catch-inside',
    timing:{subscribe:1,travel:1,transform:1.4,terminal:.8,gap:.5},
    code:lines.map(line=>line.map(part=>part.text).join('')).join('\n'),codeLines:lines,codeFrames:[],
    rows:[R('klik$',jobs.map(job=>E(job.at,job.value,job.value==='A'?'a':'b'))),
      R('HTTP A',[],[{start:at.a,end:at.error,label:'HTTP A',kind:'error',color:'http'}]),
      R('catchError A',[fallback],[],{completeAt:at.doneA}),
      R('HTTP B',[response],[{start:at.b,end:at.response,label:'HTTP B',kind:'work',color:'http'}],{completeAt:at.response}),
      R('catchError B',[response],[],{completeAt:at.response}),
      R('wynik',[fallback,response])],
    captions:[[0,'catchError wewnątrz switchMap: każdy HTTP ma własną obsługę błędu'],
      [at.a,'Klik A: switchMap uruchamia pierwszy HTTP'],
      [at.error,'HTTP A: error. Błąd trafia tylko do catchError tego requestu'],
      [at.fallback,'catchError subskrybuje of([]): pusta tablica trafia do S1'],
      [at.doneA,'Inner A kończy się complete. klik$ i S1 nadal działają'],
      [at.b,'Klik B: switchMap uruchamia nowy HTTP'],
      [at.response,'HTTP B zwraca wynik B. S1 nadal czeka na kolejne kliknięcia']],
    metrics:[{label:'requesty HTTP',count:'started'},{label:'aktywne',count:'active'}],
    playback:{entry:'manual',finish:'hold',afterLastManualStop:'start-auto',stops:[
      {id:'subscribe',modelTime:at.subscribe,caption:'S1 subskrybuje klik$ przez switchMap. Czekamy na kliknięcia'},
      {id:'click-a',event:ev('inner-subscribe','inner0-catch0'),offset:.05,caption:'Klik A: switchMap tworzy inner #1 i uruchamia HTTP'},
      {id:'request',event:ev('inner-subscribe','inner0-catch0'),offset:1.5,caption:'HTTP A pracuje. catchError stoi wewnątrz tego requestu'},
      {id:'error',event:ev('disconnected','inner0-catch0'),caption:'HTTP A: error dotarł do catchError. Do S1 nic nie poszło'},
      {id:'fallback',event:ev('disconnected','catch0-op'),offset:.35,caption:'catchError: of([]) wyemitowało []. Inner A complete, outer działa dalej'},
      {id:'click-b',event:ev('inner-subscribe','inner1-catch1'),offset:.05,caption:'Klik B: nowy inner #2 i nowy HTTP'},
    ]},
  });
}

function catchInsideGraph(scene) {
  const frame=frameFor(scene),at=scene.catchTimes,[clicks,,catchA,httpB,catchB,result]=scene.rows;
  const nodes=[{id:'source',label:'klik$',color:'source',ready:true},{id:'op',label:'switchMap',color:'op',ready:true},
    {id:'observer',label:'',ready:true},
    // Wiersz pracy: HTTP i catchError to dwa etapy tego samego inner; pozycje nadaje configureHttpWorkPanel.
    ...scene.jobs.flatMap((job,i)=>['inner','catch'].map(kind=>({id:kind+i,label:kind==='inner'?'HTTP '+job.value:'catchError',
      inner:true,workRow:true,panel:'jobs',slot:i,ready:false,born:job.start})))];
  const tag=(events,job)=>events.map(e=>({...e,execution:job.value}));
  const edges=[{from:'source',to:'op',events:clicks.events,logicalStart:at.subscribe},
    {from:'op',to:'observer',events:result.events,logicalStart:at.subscribe},
    // A: HTTP kończy się błędem tylko na odcinku HTTP → catchError; catchError emituje [] i kończy inner complete.
    {id:'inner0-catch0',from:'inner0',to:'catch0',events:[],logicalStart:at.a,logicalEnd:{at:at.error,kind:'error'},gateWork:true,internal:true},
    {id:'catch0-op',from:'catch0',to:'op',events:tag(catchA.events,scene.jobs[0]),logicalStart:at.a,logicalEnd:{at:at.doneA,kind:'complete'},gateWork:true,internal:true},
    {id:'inner1-catch1',from:'inner1',to:'catch1',events:tag(httpB.events,scene.jobs[1]),logicalStart:at.b,logicalEnd:{at:at.response,kind:'complete'},gateWork:true,internal:true},
    {id:'catch1-op',from:'catch1',to:'op',events:tag(catchB.events,scene.jobs[1]),logicalStart:at.b,logicalEnd:{at:at.response,kind:'complete'},gateWork:true,internal:true}];
  const graph={layout:'fixed',formatAware:true,width:1240,height:frame.height,illustratedWork:true,nodes,edges,
    executions:scene.jobs.map((job,i)=>({id:job.value,node:'inner'+i,edge:`inner${i}-catch${i}`,panel:'jobs',value:job.value,label:'HTTP '+job.value,duration:job.dur})),
    timeline:[{type:'catch-summary',event:{type:'disconnected',edge:'catch1-op'},offset:.5,
      caption:'Błąd A obsłużony lokalnie: drugie kliknięcie działa, outer nadal aktywny'}]};
  configureHttpWorkPanel(graph,scene,frame,{
    columns:[{id:'source',label:'HTTP GET',fill:'#8FC9D4',runtime:'#E3F0F3'},{id:'catch',label:'catchError',fill:'#D8B3E6',runtime:'#F1E7F6'}],
    stages:i=>[{column:'source',edge:`inner${i}-catch${i}`,progress:true},
      {column:'catch',edge:`catch${i}-op`,handles:{edge:`inner${i}-catch${i}`,label:'of([])'}}],
    edge:i=>`catch${i}-op`});
  return graph;
}

// catchError na zewnątrz (b04-catcherror) w tym samym wyglądzie co wewnątrz: góra klik$ → switchMap → catchError → S1,
// w dolnej części instancja HTTP GET → inbox. Ten sam klik A i ten sam błąd HTTP, ale wewnątrz nie ma catchError:
// error przechodzi przez inbox inner i switchMap do zewnętrznego catchError. catchError odłącza pierwotny strumień
// (teardown switchMap i klik$, szary impuls ×, bez complete), dopiero potem subskrybuje of([]): [] i complete trafiają do S1.
// Klik B pojawia się w odłączonym klik$ i gaśnie: nie dociera do switchMap, nie ma projekcji ani HTTP.
const outsideTimes={subscribe:.3,a:1,error:4,teardown:4.2,fallback:5.5,done:6,b:7.3};
export function configureCatchOutside(scene) {
  const at=outsideTimes;
  const jobs=[{value:'A',at:at.a,start:at.a,end:at.error,dur:at.error-at.a,errored:true}];
  const fallback=E(at.fallback,'[]','#7457D9');
  const ev=(type,edge,extra={})=>({type,edge,...extra}),during=(from,to)=>({from,to});
  const op={id:'switch',bg:'rgba(216,179,230,.45)',line:'#b384c6'},http={id:'http',bg:'rgba(143,201,212,.4)',line:'#4fa5b5'};
  // Te same dwie linie co wewnątrz; zmienia się tylko miejsce catchError (za switchMap zamiast w .pipe HTTP).
  const lines=[[{text:'klik$.pipe('},{text:'switchMap',mark:op,active:[during(ev('deliver-next','source-op',{value:'A'}),ev('inner-subscribe','inner0-op'))]},{text:'(id =>'}],
    [{text:'  '},{text:'httpGet(url(id))',mark:http,active:[during(ev('inner-subscribe','inner0-op'),ev('stream-error','inner0-op'))]},
      {text:'), '},{text:'catchError(() => of([]))',mark:{...op,id:'catch'},active:[during(ev('disconnected','op-catch'),ev('disconnected','catch-observer'))]},{text:')'}]];
  Object.assign(scene,{jobs,operatorName:'switchMap',catchTimes:at,graph:catchOutsideGraph,duration:at.b+2.5,
    title:'catchError na zewnątrz',playerLayout:'expanded',playerClass:'rx-flat-tiles rx-catch-inside',
    timing:{subscribe:1.5,travel:1,transform:1.4,terminal:.8,gap:.5},
    code:lines.map(line=>line.map(part=>part.text).join('')).join('\n'),codeLines:lines,codeFrames:[],
    rows:[R('klik$',[E(at.a,'A')]),
      R('HTTP A',[],[{start:at.a,end:at.error,label:'HTTP A',kind:'error',color:'http'}]),
      R('wynik',[fallback],[],{completeAt:at.done})],
    captions:[[0,'catchError za switchMap: jedna obsługa błędu dla całego strumienia'],
      [at.a,'Klik A: switchMap uruchamia HTTP — tak samo jak wcześniej'],
      [at.error,'HTTP A: error. Wewnątrz nie ma catchError — błąd idzie przez switchMap'],
      [at.teardown,'catchError odłącza pierwotny strumień: teardown switchMap i klik$'],
      [at.fallback,'catchError subskrybuje of([]): pusta tablica trafia do S1'],
      [at.done,'of([]) kończy się: S1 dostaje complete. Wynikowy strumień zakończony']],
    metrics:[{label:'requesty HTTP',count:'started'},{label:'aktywne',count:'active'}],
    playback:{entry:'manual',finish:'hold',afterLastManualStop:'start-auto',stops:[
      {id:'click-a',event:ev('inner-subscribe','inner0-op'),offset:.5,caption:'Klik A: switchMap tworzy inner #1 i uruchamia HTTP'},
      {id:'error',event:ev('disconnected','op-catch'),offset:.1,caption:'HTTP A: error przeszedł przez switchMap do zewnętrznego catchError'},
      {id:'caught',event:ev('disconnected','source-op'),offset:.35,caption:'catchError przechwycił błąd i odłączył klik$. Do S1 nie dotarł error'},
      {id:'fallback',event:ev('disconnected','catch-observer'),offset:.35,caption:'catchError subskrybował of([]): S1 dostał [] i complete'},
      {id:'click-b',event:{type:'source-unobserved',node:'source'},offset:.6,caption:'Klik B: klik$ nie ma już subskrypcji. Brak projekcji i HTTP'},
    ]},
  });
}

function catchOutsideGraph(scene) {
  const frame=frameFor(scene),at=scene.catchTimes,[clicks,,result]=scene.rows,job=scene.jobs[0];
  const nodes=[{id:'source',label:'klik$',color:'source',ready:true},{id:'op',label:'switchMap',color:'op',ready:true},
    // Pełnoprawny operator górnego potoku: pokazuje chwilowe of([]) po teardown i własne complete.
    {id:'catch',label:'catchError',color:'op',ready:true,terminalEdge:'catch-observer',
      laneFallback:{label:'of([])',from:{type:'disconnected',edge:'source-op',offset:.4},to:{type:'disconnected',edge:'catch-observer'}}},
    {id:'observer',label:'',ready:true},
    {id:'inner0',label:'HTTP A',inner:true,workRow:true,panel:'jobs',slot:0,ready:false,born:job.start}];
  const edges=[
    // Teardown po błędzie: catchError odłącza switchMap, a switchMap — klik$ (szary impuls ×, bez complete).
    {from:'source',to:'op',events:clicks.events,logicalStart:at.subscribe,logicalEnd:{at:at.teardown,kind:'unsubscribe'},cancelPulse:true},
    {from:'op',to:'catch',events:[],logicalStart:at.subscribe,logicalEnd:{at:at.error,kind:'error'}},
    {from:'catch',to:'observer',events:result.events,logicalStart:at.subscribe,logicalEnd:{at:at.done,kind:'complete'}},
    {id:'inner0-op',from:'inner0',to:'op',events:[],logicalStart:at.a,logicalEnd:{at:at.error,kind:'error'},gateWork:true,internal:true}];
  const graph={layout:'fixed',formatAware:true,width:1240,height:frame.height,illustratedWork:true,nodes,edges,
    executions:[{id:job.value,node:'inner0',edge:'inner0-op',panel:'jobs',value:job.value,label:'HTTP '+job.value,duration:job.dur}],
    timeline:[{at:at.b,type:'source-unobserved',node:'source',value:'B'},
      {type:'catch-summary',event:{type:'source-unobserved',node:'source'},offset:1.8,
        caption:'Błąd A zastąpił cały strumień: of([]) i complete. Kolejne kliknięcia nie uruchamiają HTTP'}]};
  // Cztery kafelki u góry jak map + concatAll: klik$, switchMap, catchError i S1 na tej samej osi portów.
  configureHttpWorkPanel(graph,scene,frame,{
    tiles:[['source',145,190,'#8FC9D4'],['op',400,230,'#D8B3E6'],['catch',677.5,235,'#D8B3E6']]});
  // Odłączony klik$ nadal może emitować: B pojawia się w jego wierszu przy porcie wyjścia i gaśnie bez kabla do switchMap.
  const source=nodes[0];
  graph.tokens=[{at:at.b,until:at.b+1.4,modelTime:true,fade:true,value:'B',color:'#B85D05',phase:'unobserved',
    x:source.x+source.w/2-graph.ball.r-18,y:source.top+source.defH+source.rowH/2}];
  // switchMap nie kończy się czerwienią w górnym torze: jego pierwotne wykonanie zamyka teardown.
  nodes[1].teardownEdge='source-op';
  return graph;
}

// distinctUntilChanged + switchMap: jeden potok źródło → distinctUntilChanged → switchMap → S1, w dolnej części
// z instancjami HTTP GET → inbox jak w 09–12. distinctUntilChanged pamięta ostatnią przepuszczoną wartość (memory.ball: sama
// kulka w wierszu, jak pamięć debounceTime/auditTime),
// powtórzenie wjeżdża do wiersza, czeka (decide) i gaśnie — bez kabla dalej, bez nowego HTTP i bez anulowania.
// 11a-distinct-switchmap — S1 zestawione przed READY, A, A, B, B, A: B i drugie A anulują trwające HTTP (switchMap).
const distinctProfiles={
  '11a-distinct-switchmap':{
    input:[{at:.6,value:'A'},{at:3,value:'A',dup:true},{at:4.2,value:'B'},{at:5.4,value:'B',dup:true},{at:6.6,value:'A'}],
    colors:{A:'#6D4CD3',B:'#B85D05'},decide:1.2,durations:[4.4,3,1.5],preconnected:true,
    source:'id$',url:'url(id)',title:'distinctUntilChanged — czy coś się zmieniło?',inputsLabel:'wejścia',
    captions:jobs=>[[0,'S1 już subskrybuje. distinctUntilChanged pamięta tylko ostatnią przepuszczoną wartość'],
      [jobs[0].at,'A: brak poprzedniej wartości — przechodzi i zostaje w pamięci. switchMap uruchamia HTTP A'],
      [jobs[1].at,'B ≠ A — przechodzi i zastępuje A w pamięci. switchMap anuluje HTTP A i uruchamia HTTP B'],
      [jobs[2].at,'A ≠ B — przechodzi. Porównanie z ostatnią wartością, nie z całą historią'],
      [jobs.at(-1).end,'HTTP A zwraca wynik do S1 i kończy się complete. S1 czeka na kolejne ID']],
    stops:({ev,arrived,dups,decide})=>[
      {id:'first',event:ev('source-next',{edge:'source-distinct',logicalAt:dups[0].at}),offset:-.4,caption:'A przeszło i zostało w pamięci operatora. switchMap uruchomił HTTP A'},
      {id:'question',event:arrived(dups[0].at),offset:.6,caption:'HTTP A trwa, a znowu przychodzi A. Czy switchMap anuluje request i uruchomi go ponownie?'},
      {id:'answer',event:arrived(dups[0].at),offset:decide+.6,caption:'A === A — odrzucone w distinctUntilChanged. HTTP A pracuje dalej'},
      {id:'switched',event:ev('inner-subscribe',{edge:'inner1-op'}),offset:.3,caption:'B ≠ A — w pamięci jest teraz B. switchMap anulował HTTP A i uruchomił HTTP B'},
      {id:'repeat-b',event:arrived(dups[1].at),offset:decide+.6,caption:'B === B — odrzucone. HTTP B bez restartu'},
      {id:'again-a',event:ev('inner-subscribe',{edge:'inner2-op'}),offset:.3,caption:'A ≠ B — przechodzi. HTTP B anulowany, startuje HTTP #3 · A'}],
    reject:v=>`${v.value} === ${v.value} — odrzucone. HTTP ${v.value} pracuje dalej`,
    summary:'5 wejść, 3 requesty: A, B, A. distinctUntilChanged odrzuca tylko kolejne powtórzenia'},
};
export function configureDistinctSwitch(scene,profileId=scene.id) {
  const profile=distinctProfiles[profileId],distinctInput=profile.input,colors=profile.colors,decide=profile.decide;
  const passed=distinctInput.filter(v=>!v.dup),dups=distinctInput.filter(v=>v.dup),durations=profile.durations;
  const jobs=passed.map((v,i)=>{
    const next=passed[i+1],natural=v.at+durations[i],end=next?Math.min(natural,next.at):natural;
    return {value:v.value,at:v.at,start:v.at,end,dur:durations[i],cancelled:end<natural};
  });
  const last=jobs.at(-1);
  const ev=(type,extra)=>({type,...extra}),during=(from,to)=>({from,to}),arrived=at=>ev('deliver-next',{edge:'source-distinct',logicalAt:at});
  const op={id:'switch',bg:'rgba(216,179,230,.45)',line:'#b384c6'},http={id:'http',bg:'rgba(143,201,212,.4)',line:'#4fa5b5'};
  // Kod w dwóch liniach (jak catchError); fragmenty świecą, gdy dany operator albo request pracuje.
  const lines=[[{text:profile.source+'.pipe('},{text:'distinctUntilChanged()',mark:{...op,id:'distinct'},active:distinctInput.map(v=>during(arrived(v.at),
      v.dup?{...arrived(v.at),offset:decide}:ev('source-next',{edge:'distinct-op',logicalAt:v.at})))},{text:','}],
    [{text:'  '},{text:'switchMap',mark:op,active:jobs.map((job,i)=>during(ev('deliver-next',{edge:'distinct-op',logicalAt:job.at}),ev('inner-subscribe',{edge:`inner${i}-op`})))},
      {text:'(id => '},{text:`httpGet(${profile.url})`,mark:http,active:jobs.map((job,i)=>during(ev('inner-subscribe',{edge:`inner${i}-op`}),
        ev(job.cancelled?'inner-unsubscribe':'inner-next',{edge:`inner${i}-op`})))},{text:'))'}]];
  // Wynik S1: każde niezanulowane HTTP zwraca swoją wartość.
  const results=jobs.filter(job=>!job.cancelled);
  Object.assign(scene,{jobs,operatorName:'switchMap',distinctInput,distinctColors:colors,distinctDecide:decide,
    distinctReject:profile.reject,distinctSummary:profile.summary,subscribeAt:profile.subscribeAt??.1,
    graph:distinctSwitchGraph,duration:last.end+1.4,preconnected:profile.preconnected,
    title:profile.title,playerLayout:'expanded',playerClass:'rx-flat-tiles rx-catch-inside',
    timing:{subscribe:1.5,travel:1,transform:1.4,terminal:.8,gap:.5},
    code:lines.map(line=>line.map(part=>part.text).join('')).join('\n'),codeLines:lines,codeFrames:[],
    rows:[R(profile.source,distinctInput.map(v=>E(v.at,v.value,colors[v.value]))),
      R('distinctUntilChanged',passed.map(v=>E(v.at,v.value,colors[v.value]))),
      ...jobs.map(job=>R('HTTP '+job.value,job.cancelled?[]:[E(job.end,job.value,colors[job.value])],
        [B(job.start,job.end,job.value,job.cancelled?'cancel':'work',{duration:job.dur})],{completeAt:job.cancelled?undefined:job.end})),
      R('wynik',results.map(job=>E(job.end,job.value,colors[job.value])))],
    captions:profile.captions(jobs),
    metrics:[{label:profile.inputsLabel,value:t=>distinctInput.filter(v=>v.at<=t).length},{label:'requesty HTTP',count:'started'},{label:'aktywne',count:'active'}],
    playback:{entry:'manual',finish:'hold',afterLastManualStop:'start-auto',stops:profile.stops({ev,arrived,dups,decide})},
  });
}

function distinctSwitchGraph(scene) {
  const frame=frameFor(scene),[input,passed]=scene.rows,result=scene.rows.at(-1),decide=scene.distinctDecide,colors=scene.distinctColors;
  const subscribeAt=scene.subscribeAt;
  // Numer wykonania HTTP trwającego w chwili odrzucenia (napis „HTTP #k pracuje dalej”).
  const runningJob=at=>'#'+(scene.jobs.findLastIndex(job=>job.start<=at)+1);
  const nodes=[{id:'source',label:scene.rows[0].label,color:'source',ready:true},
    // Pamięć (kulka ostatniej przepuszczonej wartości) i odrzucenie powtórzeń w wierszu S1 operatora; przepuszczona kulka
    // przejeżdża przez wiersz (hold).
    {id:'distinct',label:'distinctUntilChanged',color:'op',ready:true,memory:{label:'prev',ball:true},rejectBalls:true,rejectAt:.42,transformBalls:true},
    {id:'op',label:'switchMap',color:'op',ready:true},{id:'observer',label:'',ready:true},
    ...scene.jobs.map((job,i)=>({id:'inner'+i,label:'HTTP '+job.value,inner:true,workRow:true,panel:'jobs',slot:i,ready:false,born:job.start}))];
  const edges=[
    {from:'source',to:'distinct',events:input.events.map(e=>scene.distinctInput.find(v=>v.at===e.at).dup?{...e,decide}:e),logicalStart:subscribeAt,logicalEnd:null},
    {from:'distinct',to:'op',events:passed.events,logicalStart:subscribeAt,logicalEnd:null,hold:1},
    {from:'op',to:'observer',events:result.events,logicalStart:subscribeAt,logicalEnd:null},
    ...scene.jobs.map((job,i)=>({id:`inner${i}-op`,from:'inner'+i,to:'op',events:scene.rows[2+i].events.map(e=>({...e,execution:'#'+(i+1)})),
      logicalStart:job.start,logicalEnd:{at:job.end,kind:job.cancelled?'unsubscribe':'complete'},gateWork:true,internal:true}))];
  const graph={layout:'fixed',formatAware:true,width:1240,height:frame.height,illustratedWork:true,nodes,edges,
    executions:scene.jobs.map((job,i)=>({id:'#'+(i+1),node:'inner'+i,edge:`inner${i}-op`,panel:'jobs',value:job.value,label:'HTTP '+job.value,duration:job.dur})),
    timeline:[
      ...scene.distinctInput.filter(v=>v.dup).map(v=>({type:'distinct-reject',event:{type:'deliver-next',edge:'source-distinct',logicalAt:v.at},offset:decide,
        caption:scene.distinctReject(v,runningJob(v.at))})),
      {type:'distinct-summary',event:{type:'deliver-next',edge:'op-observer'},last:true,offset:1.2,caption:scene.distinctSummary}]};
  // Cztery kafelki na wspólnej osi portów; kompaktowy odbiorca S1 mieści jedną kulkę wyniku.
  configureHttpWorkPanel(graph,scene,frame,{
    tiles:[['source',178,300,'#8FC9D4'],['distinct',568,400,'#D8B3E6'],['op',905.5,195,'#D8B3E6']]});
  const receiver=nodes.find(n=>n.id==='observer');
  Object.assign(receiver,{x:1127.5,w:169});
  Object.assign(graph.trays[0],{x:1168,w:60,max:1});
  // Kolor należy do wartości: wszystkie wykonania tej samej wartości mają ten sam kolor.
  for(const edge of graph.edges)edge.events=edge.events.map(e=>({...e,color:colors[e.value]||e.color}));
  for(const work of graph.panels[0].works)work.color=colors[work.value];
  // Postęp HTTP w czasie modelu: stoi podczas przelotów i pytania, przy anulowaniu zostaje na ułamku modelu.
  graph.panels[0].modelProgress=true;
  if(scene.preconnected)for(const edge of graph.edges.filter(e=>!e.internal))edge.preconnected=true;
  return graph;
}

// debounceTime i auditTime (MAIN 16-czas-cztery): dwa proste potoki jeden pod drugim — zdarzenia$ → debounceTime → S1
// i zdarzenia$ → auditTime → S2. Kafelek zdarzenia$ jest powtórzony dla czytelności, ale obie subskrypcje dostają te same
// emisje w tych samych chwilach (jedna lista zdarzeń, dwie krawędzie). Timery żyją w wierszach operatorów (laneTimer,
// czas modelu): debounce zaczyna od nowa przy każdym wejściu, audit nie przesuwa końca okna. Bez complete źródła.
const timeInputs=[{at:0,value:'A'},{at:1,value:'B'},{at:2,value:'C'},{at:4,value:'D'},{at:5,value:'E'}];
// timeStart: czas modelu sceny = czas scenariusza + 0,6 s, żeby READY nie zaczynał od lecącego A; napisy pokazują czas scenariusza.
const timeColors={A:'#6D4CD3',B:'#B85D05',C:'#087FAD',D:'#B73770',E:'#0F766E'},timePeriod=3.5,timeStart=.6;
const seconds=at=>at.toFixed(1).replace('.',',')+' s';
export function configureDebounceAudit(scene) {
  const ev=(value,color=timeColors[value])=>E(0,value,color);
  const input=timeInputs.map(v=>({...ev(v.value),at:v.at+timeStart}));
  // Emisje wynikają z modelu: debounce po 3,5 s ciszy od ostatniego wejścia, audit na końcu okna otwartego pierwszym wejściem.
  const debounce=[{...input.at(-1),at:input.at(-1).at+timePeriod}];
  const audit=[];let open=null;
  for(const v of input){
    if(open&&v.at>=open.end){audit.push({...open.last,at:open.end});open=null;}
    if(!open)open={end:v.at+timePeriod};
    open.last=v;
  }
  if(open)audit.push({...open.last,at:open.end});
  const op={id:'debounce',bg:'rgba(216,179,230,.45)',line:'#b384c6'};
  const deliver=(edge,value)=>({type:'deliver-next',edge,value}),emit=(edge,value)=>({type:'source-next',edge,value});
  // Kod w dwóch liniach; operator świeci, gdy jego timer pracuje.
  const lines=[[{text:'zdarzenia$.pipe('},{text:'debounceTime(3500)',mark:op,active:[{from:deliver('src1-deb','A'),to:emit('deb-obs1',debounce[0].value)}]},{text:')'}],
    [{text:'zdarzenia$.pipe('},{text:'auditTime(3500)',mark:{...op,id:'audit'},active:audit.map((v,i)=>({from:deliver('src2-aud',i?input.find(x=>x.at>=audit[i-1].at).value:'A'),to:emit('aud-obs2',v.value)}))},{text:')'}]];
  const at=v=>deliver('src1-deb',v);
  Object.assign(scene,{graph:debounceAuditGraph,timeInput:input,timeOutputs:{debounce,audit},duration:debounce[0].at+1.5,preconnected:true,
    title:'debounceTime i auditTime: cisza czy okno?',playerLayout:'expanded',playerClass:'rx-flat-tiles rx-catch-inside',
    timing:{subscribe:1.6,travel:1,transform:1.4,terminal:.8,gap:.5},
    code:lines.map(line=>line.map(part=>part.text).join('')).join('\n'),codeLines:lines,codeFrames:[],
    rows:[R('zdarzenia$',input),R('debounceTime',debounce),R('auditTime',audit)],
    captions:[[0,'Te same zdarzenia trafiają do obu operatorów. Okres: 3,5 s']],
    metrics:[{label:'S1 · debounce',value:t=>debounce.filter(v=>v.at<t).length},{label:'S2 · audit',value:t=>audit.filter(v=>v.at<t).length}],
    // Postoje przy wejściach: +0,5 s, gdy wartość dojechała już do kulki pamięci (storeMove 0,4 s).
    playback:{entry:'manual',finish:'hold',afterLastManualStop:'start-auto',stops:[
      {id:'a',event:at('A'),offset:.5,caption:'A: debounce zaczyna liczyć ciszę, audit otwiera okno 3,5 s'},
      {id:'b',event:at('B'),offset:.5,caption:'B: debounce od nowa. Audit zapamiętuje B — okno trwa dalej'},
      {id:'c',event:at('C'),offset:.5,caption:'C: debounce znowu od nowa, audit nadal w pierwszym oknie. Który operator wyemituje pierwszy?'},
      {id:'audit-c',event:deliver('aud-obs2',audit[0].value),offset:.35,caption:'3,5 s: koniec okna — auditTime emituje C do S2. debounceTime nadal czeka'},
      {id:'d',event:at('D'),offset:.5,caption:'D: debounce od nowa, audit otwiera drugie okno (do 7,5 s)'},
      {id:'e',event:at('E'),offset:.5,caption:'E: debounce od nowa, audit tylko podmienia wartość — okno kończy się w 7,5 s'},
      {id:'audit-e',event:deliver('aud-obs2',audit[1].value),offset:.35,caption:'7,5 s: koniec drugiego okna — S2 dostaje E. debounceTime nadal czeka na ciszę'},
    ]},
  });
}

function debounceAuditGraph(scene) {
  const frame=frameFor(scene),large=scene.format==='4:3',defH=large?70:56,rowH=large?74:64;
  const tops=large?[90,360]:[50,270],lane=top=>top+defH+rowH/2;
  const subscribers={S1:{color:'#7457D9',fill:'#D9CFF5',ink:'#513A9A',label:'S1'},S2:{color:'#C2610C',fill:'#F6D9BC',ink:'#8A4507',label:'S2'},
    N:{color:'#2A8C9A',ink:'#1F5F68',tint:'#EEF8FA'}};
  const runtime={S1:'#EDE6F8',S2:'#FBEEE2'};
  const tile=(id,label,x,w,top,subscriber,headerFill,extra={})=>({id,label,x,w,top,defH,rowH,laneSlots:{[subscriber]:0},growRows:true,ready:true,
    y:top+(defH+rowH)/2,h:defH+rowH,headerFill,runtimeFill:runtime[subscriber],terminalBadge:true,detail:'',statusInside:false,rx:7,...extra});
  const receiver=(id,top,subscriber)=>({id,label:'',x:1055,w:314,y:lane(top),h:rowH,top:lane(top)-rowH/2,defH:0,rowH,laneSlots:{[subscriber]:0},
    labelOffset:0,ready:true,subscriber,headerFill:'#EAE4F7',runtimeFill:runtime[subscriber],terminalBadge:true,detail:'',statusInside:false,
    inbox:{size:25,left:16,font:30},rx:7});
  const pipelines=[['deb','debounceTime','S1','debounce','cisza'],['aud','auditTime','S2','audit','okno']];
  const nodes=pipelines.flatMap(([op,label,subscriber,kind,timerLabel],i)=>[
    tile('src'+(i+1),'zdarzenia$',138,220,tops[i],subscriber,'#8FC9D4'),
    tile(op,label,573,560,tops[i],subscriber,'#D8B3E6',{laneTimer:{kind,period:timePeriod,label:timerLabel,ball:true}}),
    receiver('obs'+(i+1),tops[i],subscriber)]);
  const out=scene.timeOutputs;
  const edges=[['src1','deb',scene.timeInput,'S1'],['deb','obs1',out.debounce,'S1'],['src2','aud',scene.timeInput,'S2'],['aud','obs2',out.audit,'S2']]
    .map(([from,to,events,subscriber])=>({from,to,events:events.map(e=>({...e})),subscriber,logicalStart:0,logicalEnd:null,preconnected:true}));
  // Chwilowy napis next(X) · czas między potokami: ta sama emisja dla obu subskrypcji.
  const calloutY=(tops[0]+defH+rowH+tops[1])/2;
  const callouts=scene.timeInput.map(v=>({text:`next(${v.value}) · ${seconds(v.at-timeStart)}`,subscriber:'N',label:'',x:330,y:calloutY,size:34,
    from:{type:'source-next',edge:'src1-deb',value:v.value},to:{type:'deliver-next',edge:'src1-deb',value:v.value,offset:.5}}));
  const tray=(anchor,top)=>({anchor,x:1055-157+130,y:lane(top),w:170,balls:true,max:2,gap:8,ball:{r:29.5,font:34.2,textFill:'#fff'}});
  return {layout:'fixed',formatAware:true,width:1240,height:frame.height,nodes,edges,subscribers,laneWire:5,portRadius:11,
    ball:{r:25,font:29,textFill:'#fff'},...(large?{textScale:1.4,labelScale:1.6}:{}),
    trays:[tray('obs1',tops[0]),tray('obs2',tops[1])],callouts,
    timeline:[{type:'time-summary',event:{type:'deliver-next',edge:'deb-obs1'},offset:.35,
      caption:'8,5 s: 3,5 s ciszy — debounceTime emituje E do S1. S1: E · S2: C, E'}]};
}

// retry z exponential backoff (EXTRAS): jedna subskrypcja A, cztery kolejne subskrypcje tego samego cold HTTP.
// Trzy błędy kończą się na retry; okna 1/2/4 s są częścią jednego deterministycznego zegara sceny.
// Odliczanie można pominąć („dalej” kończy etap) — scena pokazuje kolejność, a nie mierzy prawdziwy czas.
export function configureRetryBackoff(scene) {
  const windows=[{start:4.9,end:5.9,seconds:1},{start:9.5,end:11.5,seconds:2},{start:15.1,end:19.1,seconds:4}];
  const attempts=[
    {start:1.3,connected:2.1,end:4.1,kind:'error'},
    {start:5.9,connected:6.7,end:8.7,kind:'error'},
    {start:11.5,connected:12.3,end:14.3,kind:'error'},
    {start:19.1,connected:19.9,next:21.9,end:22.9,kind:'complete'},
  ];
  const ev=(type,edge,offset=0)=>({type,edge,...(offset?{offset}:{})}),during=(from,to)=>({from,to});
  const httpMark={id:'retry-http',bg:'rgba(143,201,212,.4)',line:'#4fa5b5'};
  const retryMark={id:'retry-op',bg:'rgba(216,179,230,.4)',line:'#a36ab7'};
  const timerMark={id:'retry-timer',bg:'rgba(216,179,230,.3)',line:'#805095'};
  const httpActive=attempts.map((_,i)=>during(ev('connected',`source-retry-${i+1}`),
    ev(i<3?'stream-error':'stream-complete',`source-retry-${i+1}`)));
  const retryActive=[...windows.map((_,i)=>during(ev('stream-error',`source-retry-${i+1}`),ev('subscribe',`source-retry-${i+2}`))),
    during(ev('deliver-next','source-retry-4'),ev('disconnected','retry-observer'))];
  // Trzy linie (rx-two-lines: 36/24 px): pełna konfiguracja retry z RxJS 7, bez skracania wzoru backoff.
  const lines=[
    [{text:'httpGet',mark:httpMark,active:httpActive},{text:"<User>('/api/users/42').pipe("}],
    [{text:'  '},{text:'retry',mark:retryMark,active:retryActive},{text:'({ count: 3, delay: (_error, retryCount) =>'}],
    [{text:'    '},{text:'timer',mark:timerMark,active:windows.map((_,i)=>retryActive[i])},{text:'(1000 * 2 ** (retryCount - 1)) }));'}],
  ];
  const code=lines.map(line=>line.map(part=>part.text).join('')).join('\n');
  Object.assign(scene,{title:'retry — nie udało się? Spróbuj później',graph:retryBackoffGraph,playerLayout:'function',
    playerClass:'rx-lanes rx-flat-tiles rx-two-lines',duration:26,ink:'#26323B',code,codeLines:lines,codeFrames:[],
    retryPlan:{windows,attempts},
    rows:[...attempts.map((attempt,i)=>R(`#${i+1} · HTTP GET`,i===3?[E(attempt.next,coldUserSymbol,'a')]:[],
      [B(attempt.connected,attempt.end,'request',attempt.kind==='error'?'error':'work')],attempt.kind==='complete'?{completeAt:attempt.end}:{})),
      R('A',[E(22.8,coldUserSymbol,'a')],[],{completeAt:23.7})],
    captions:[[0,'Definicja Observable. Request jeszcze nie istnieje'],[1.3,'A subskrybuje raz; retry subskrybuje źródło HTTP'],
      [4.9,'Błąd #1 przechwycony. A nadal czeka. Backoff: 1 s'],[9.5,'Błąd #2 przechwycony. Backoff rośnie z 1 s do 2 s'],
      [15.1,'Błąd #3 przechwycony. Teraz czekamy 4 s'],[19.1,'Po 4 s retry uruchamia czwarte wykonanie HTTP'],
      [24.5,'Czwarty request: User i complete. A nie dostał pośrednich błędów'],
      [25.35,'#1 error → 1 s · #2 error → 2 s · #3 error → 4 s · #4 User + complete']],
    metrics:[{label:'Requesty HTTP',count:'started'},{label:'Aktywne',count:'active'}],
    playback:{entry:'manual',finish:'hold',afterLastManualStop:'start-auto',controller:'stages',resetOnExit:true,stops:[
        {id:'request-1',time:2.45,caption:'A subskrybuje. Powstaje HTTP #1 — pierwszy request jest natychmiastowy'},
        {id:'error-1',time:4.9,caption:'HTTP #1: error. retry go przechwytuje; A nie dostaje błędu'},
        {id:'request-2',time:7.05,caption:'Po pełnej 1 sekundzie retry ponownie subskrybuje źródło: HTTP #2'},
        {id:'error-2',time:9.5,caption:'HTTP #2: error. Poprzednio 1 s, teraz backoff wynosi 2 s'},
        {id:'request-3',time:12.65,caption:'Po pełnych 2 sekundach powstaje HTTP #3'},
        {id:'error-3',time:15.1,caption:'1, 2, 4 sekundy. Ile czekalibyśmy przy następnym ponowieniu?'},
        {id:'request-4',time:20.25,caption:'Odpowiedź: 8 sekund, gdyby pozwalał limit. Tutaj po 4 s rusza HTTP #4'},
        {id:'success',time:24.85,caption:'HTTP #4 wysyła User i complete. A otrzymuje dokładnie next(User) → complete'},
        {id:'summary',time:25.35,caption:'count: 3 = maksymalnie trzy ponowienia, czyli cztery requesty HTTP łącznie'},
      ]},
  });
}

// Wygląd torów (laneTile/laneReceiver/laneTray, kolumny jak shareReplay(1) na interval). Stos czterech wykonań HTTP musi zmieścić się pod
// nagłówkiem, więc 16:9 ma niższe wiersze (66) i mniejszą kulkę; 4:3 zachowuje wymiary torów 79/89.
function retryBackoffGraph(scene) {
  const tall=scene.format==='4:3',top=tall?150:96,defH=tall?laneLook.defH:62,rowH=tall?laneLook.rowH:66;
  const size={defH,rowH},y=top+defH+rowH/2,ball=tall?viewFieldBall:{r:27,font:21},color=laneSubscribers.A.color;
  const receiver={x:1030,w:340,y},attempts=scene.retryPlan.attempts;
  const nodes=[{id:'source',x:200,w:300,label:'HTTP GET',...laneTile('source',top,{A:0},0,{...size,growRows:false,workLanes:true,
      progressUntilNext:true,y:top+defH/2,h:defH,executionStack:{items:attempts.map((_,i)=>({id:`#${i+1}`,edge:`source-retry-${i+1}`,color})),shiftDuration:.4}})},
    {id:'retry',x:600,w:360,label:'retry',...laneTile('operator',top,{A:0},1,{...size,y:top+(defH+rowH)/2,h:defH+rowH,
      laneTimer:{kind:'countdown',label:'czekam',windows:scene.retryPlan.windows}})},
    laneReceiver('observer','A',receiver,{ready:false,born:.2,laneTerminalText:true,h:rowH-6,top:y-rowH/2+3,rowH:rowH-6})];
  const edges=[],schedule={};
  attempts.forEach((attempt,i)=>{
    const id=`source-retry-${i+1}`,events=i===3?[{...E(attempt.next,coldUserSymbol,laneSubscribers.A.fill),arrival:22.7}]:[];
    edges.push({id,from:'source',to:'retry',subscriber:'A',retryAttempt:true,hideAfterTerminal:true,logicalStart:attempt.start,
      logicalEnd:{at:attempt.end,kind:attempt.kind}});
    schedule[id]={start:attempt.start,connectDuration:.8,events,
      end:{at:attempt.end,logicalAt:attempt.end,kind:attempt.kind,duration:.8}};
  });
  edges.push({id:'retry-observer',from:'retry',to:'observer',subscriber:'A',logicalStart:.5,logicalEnd:{at:23.7,kind:'complete'}});
  schedule['retry-observer']={start:.5,connectDuration:.8,events:[{...E(22.8,coldUserSymbol,laneSubscribers.A.fill),arrival:23.6}],
    end:{at:23.7,logicalAt:23.7,kind:'complete',duration:.8}};
  return {layout:'fixed',formatAware:true,width:1240,height:tall?612:460,...laneGraphLook(),ball,
    nodes,edges,schedule,trays:[laneTray('observer',receiver,1,ball)],subscribers:{A:laneSubscribers.A},
    executions:attempts.map((attempt,i)=>({id:`http-${i+1}`,node:'source',edge:`source-retry-${i+1}`,
      value:`#${i+1}`,label:`HTTP #${i+1}`,duration:attempt.end-attempt.start}))};
}

// defer (czwarty EXTRAS): kiedy naprawdę wywołuje się funkcja? Jeden diagram w dwóch fazach (scene.phases).
// from(loadUser()): loadUser() wykonuje się przy tworzeniu Observable — HTTP #1 trwa już w READY (ownExecutions,
// bez subskrypcji), A i B obserwują ten sam Promise i dostają ten sam User. defer(() => loadUser()): definicja nic
// nie uruchamia; każda subskrypcja wywołuje fabrykę, więc A i B mają własne Promise i równoległe HTTP #1/#2.
// Faza defer zaczyna od pustego diagramu: żadne wykonanie ani licznik nie przechodzi z fazy from.
const deferPromise={color:'#2C8A9C',fill:'#bfe2e9',progress:'#bfe2e9',ink:'#1d6573',tint:'#e6f3f6',label:'#1'};
const deferFields=coldFields.slice(0,2);
const deferTimes={
  from:{call:-.6,httpStart:-1,subscribe:{A:1,B:3.5},resolve:7.4,hold:1,travel:1.4,complete:10.4,duration:12.2},
  defer:{born:.1,subscribe:{A:1.5,B:3.9},response:{A:7.5,B:11.4},travel:1.4,completeDelay:.6,summary:15,duration:15.6},
  link:.8,terminal:.8,reveal:.3,callout:1.6,
};
export function configureDefer(scene) {
  const t=deferTimes,f=t.from,d=t.defer,ev=(type,edge,offset)=>({type,edge,...(offset?{offset}:{})}),during=(from,to)=>({from,to});
  const http={id:'load-user',bg:'rgba(143,201,212,.4)',line:'#4fa5b5'},defer={id:'defer',bg:'rgba(216,179,230,.45)',line:'#b384c6'};
  const settled=f.resolve+f.hold,delivered=settled+f.travel,fromDone=f.complete+t.link;
  const done=id=>d.response[id]+d.travel+d.completeDelay,connected=id=>d.subscribe[id]+t.link;
  const fromLines=[[{text:'const user$ = from('},{text:'loadUser()',mark:http,active:[during({type:'load-user-call'},{type:'promise-settled'})]},{text:');'}]];
  const shown={type:'node-create',node:'defer'};
  const deferLines=[[{text:'const user$ = ',show:shown},{text:'defer',mark:defer,show:shown,
      active:['A','B'].map(id=>during(ev('connected','defer-'+id),ev('connected','defer-'+id,t.callout)))},
    {text:'(() => ',show:shown},{text:'loadUser()',mark:http,show:shown,active:['A','B'].map(id=>during(ev('connected','defer-'+id),ev('source-next','defer-'+id)))},
    {text:');',show:shown}]];
  const text=lines=>lines.map(line=>line.map(part=>part.text).join('')).join('\n');
  const user=(at,color)=>E(at,coldUserSymbol,color);
  Object.assign(scene,{title:'defer — nie wywołuj mnie jeszcze',playerLayout:'function',playerClass:'rx-lanes rx-flat-tiles',ink:'#26323B',
    deferTimes:{...t,fromDone,settled,delivered},duration:f.duration+d.duration,checkpoints:[],
    code:text(fromLines),codeLines:fromLines,codeFrames:[],
    rows:[R('HTTP #1 · from',[user(f.resolve,deferPromise.fill)],[B(f.httpStart,f.resolve,'request')],{completeAt:f.resolve}),
      ...['A','B'].map(id=>R(`HTTP · defer ${id}`,[user(d.response[id],laneSubscribers[id].fill)],[B(connected(id),d.response[id],'request')],{completeAt:done(id)}))],
    phases:[
      {name:'from',duration:f.duration,graph:deferFromGraph,code:text(fromLines),codeLines:fromLines,codeFrames:[],
        rows:[R('HTTP #1',[user(f.resolve,deferPromise.fill)],[B(f.httpStart,f.resolve,'request')],{completeAt:f.resolve}),
          ...['A','B'].map(id=>R('Odbiorca '+id,[user(settled,deferPromise.fill)],[],{completeAt:f.complete}))],
        captions:[[0,'from(loadUser()): loadUser() już się wykonało. HTTP #1 trwa, choć nikt nie subskrybuje'],
          [f.subscribe.A,'A subskrybuje i obserwuje istniejący Promise. Bez nowego requestu'],
          [f.subscribe.B,'B subskrybuje ten sam Observable — i ten sam Promise'],
          [f.resolve,'Promise rozwiązany: from emituje ten sam User do A i B']],
        metrics:[{label:'Wywołania loadUser()',value:()=>1},{label:'Requesty HTTP',value:()=>1}]},
      {name:'defer',duration:d.duration,graph:deferFactoryGraph,code:text(deferLines),codeLines:deferLines,codeFrames:[],
        rows:['A','B'].map(id=>R(`HTTP · ${id}`,[user(d.response[id],laneSubscribers[id].fill)],[B(connected(id),d.response[id],'request')],{completeAt:done(id)})),
        captions:[[0,'defer(() => loadUser()): sama definicja. Funkcja nie została wywołana'],
          [d.subscribe.A,'A subskrybuje: dopiero teraz defer wywołuje loadUser() — Promise A i HTTP #1'],
          [d.subscribe.B,'B subskrybuje: defer wywołuje loadUser() drugi raz — Promise B i HTTP #2'],
          [d.response.A,'HTTP #1 kończy się: A dostaje User i complete. HTTP #2 nadal trwa'],
          [d.response.B,'HTTP #2 kończy się: B dostaje User i complete']],
        metrics:[{label:'Wywołania loadUser()',value:time=>['A','B'].filter(id=>time>=connected(id)).length},{label:'Requesty HTTP',count:'started'}]},
    ],
    playback:{entry:'manual',finish:'hold',afterLastManualStop:'start-auto',controller:'stages',resetOnExit:true,stops:[
      {id:'from-a',scenePhase:'from',event:ev('connected','from-A'),offset:.35,caption:'A subskrybuje istniejący Promise. Nadal jeden request HTTP'},
      {id:'from-b',scenePhase:'from',event:ev('connected','from-B'),offset:.35,caption:'B subskrybuje ten sam Observable. loadUser() nie wykonuje się ponownie'},
      // AUTO też tu staje: wynik from, zanim diagram przejdzie do defer.
      {id:'from-complete',scenePhase:'from',event:ev('disconnected','from-B'),offset:.5,autoPause:true,
        caption:'A i B: ten sam User i complete. loadUser() — 1 wywołanie, HTTP — 1 request'},
      {id:'defer-definition',scenePhase:'defer',event:shown,offset:.6,autoPause:true,
        caption:'defer(() => loadUser()): tylko definicja. Brak Promise, HTTP i odbiorców'},
      {id:'defer-a',scenePhase:'defer',event:ev('connected','defer-A'),offset:.6,caption:'A subskrybuje: defer wywołuje loadUser(). Powstaje Promise A i HTTP #1'},
      {id:'defer-b',scenePhase:'defer',event:ev('connected','defer-B'),offset:.6,caption:'B subskrybuje: drugie wywołanie loadUser(). HTTP #1 i HTTP #2 trwają równolegle'},
      {id:'defer-a-complete',scenePhase:'defer',event:ev('disconnected','defer-A'),offset:.35,caption:'HTTP #1 rozwiązuje Promise A: A dostaje User i complete. B nadal czeka'},
      {id:'defer-b-complete',scenePhase:'defer',event:ev('disconnected','defer-B'),offset:.35,caption:'HTTP #2 rozwiązuje Promise B: B dostaje User i complete'},
      {id:'summary',scenePhase:'defer',event:{type:'defer-summary'},caption:'from: 1 wywołanie, 1 HTTP · defer: 2 wywołania, 2 HTTP — po jednym na subskrypcję'},
    ]},
  });
}

// Wspólny wygląd obu faz: kafelek źródła 302/500 (miejsce na etykietę defer(() => loadUser()) i wiersz wykonania),
// pełnowymiarowe pola A/B 960/436 jak na Cold. Odbiorca pojawia się tuż przed swoim subscribe.
function deferLayout(scene,slots) {
  const tall=scene.format==='4:3',top=tall?178:102,fields=deferFields.map(f=>({...f,slot:slots[f.id]}));
  const view=viewFields(top,{ready:false,laneTerminalText:true},fields);
  return {top,tile:{x:302,w:500},view,
    base:{layout:'fixed',formatAware:true,width:1240,height:tall?612:460,...laneGraphLook(),ball:viewFieldBall}};
}
function deferFromGraph(scene) {
  const t=scene.deferTimes,f=t.from,{top,tile,view,base}=deferLayout(scene,{A:1,B:2});
  const value={value:coldUserSymbol,color:deferPromise.fill,logicalAt:f.resolve};
  const complete={at:f.complete,logicalAt:f.complete,kind:'complete',duration:t.link};
  const ids=['A','B'];
  return {...base,subscribers:{A:laneSubscribers.A,B:laneSubscribers.B,P:deferPromise},
    // HTTP #1 to wiersz wykonania rozpoczętego przy tworzeniu Observable (bez kabla i subskrypcji); A i B to wiersze
    // subskrypcji, które tylko obserwują Promise. Rozwiązanie Promise: jedna kulka z wiersza #1 do portów A i B.
    nodes:[{id:'source',...tile,label:'from(loadUser())',splitBalls:true,splitGuides:false,upstreamStripe:false,hubFan:false,
        ownExecutions:[{id:'HTTP #1',slot:0,color:deferPromise.color,start:f.httpStart,settle:f.resolve,end:{at:f.resolve,kind:'complete'},
          status:{running:'pending',completed:'✓ resolved'}}],
        emits:[{at:f.resolve,value:coldUserSymbol,color:deferPromise.fill,slot:0}],
        ...laneTile('source',top,{A:1,B:2},3)},
      ...view.nodes.map(n=>({...n,born:f.subscribe[n.id]-t.reveal}))],
    edges:ids.map(id=>({id:'from-'+id,from:'source',to:id,subscriber:id,logicalStart:f.subscribe[id],fixedStart:true,logicalEnd:{at:f.complete,kind:'complete'}})),
    schedule:Object.fromEntries(ids.map(id=>['from-'+id,{start:f.subscribe[id],connectDuration:t.link,
      events:[{...value,at:t.settled,arrival:t.delivered}],end:complete}])),
    trays:view.trays,
    callouts:[{...laneCallout('loadUser()','P',{type:'load-user-call'},laneEvent('subscribe','from-A',-.3),{x:tile.x,y:top/2}),label:'#1'},
      ...ids.map(id=>laneCallout('.subscribe()',id,laneEvent('subscribe','from-'+id),laneEvent('connected','from-'+id),{x:960,y:top/2}))],
    timeline:[{type:'load-user-call',at:f.call},{type:'promise-settled',at:f.resolve}],
  };
}
function deferFactoryGraph(scene) {
  const t=scene.deferTimes,d=t.defer,{top,tile,view,base}=deferLayout(scene,{A:0,B:1}),ids=['A','B'];
  const complete=id=>{const at=d.response[id]+d.travel+d.completeDelay;return {at,logicalAt:at,kind:'complete',duration:t.link};};
  return {...base,subscribers:{A:laneSubscribers.A,B:laneSubscribers.B},
    // Każda subskrypcja wywołuje fabrykę: wiersz A/B to własne wykonanie HTTP (#1/#2), postęp od zestawienia do odpowiedzi.
    nodes:[{id:'defer',...tile,label:'defer(() => loadUser())',workLanes:true,progressUntilNext:true,
        ...laneTile('source',top,{A:0,B:1},2),ready:false,born:d.born},
      ...view.nodes.map(n=>({...n,born:d.subscribe[n.id]-t.reveal}))],
    edges:ids.map(id=>({id:'defer-'+id,from:'defer',to:id,subscriber:id,logicalStart:d.subscribe[id],fixedStart:true,logicalEnd:complete(id)})),
    schedule:Object.fromEntries(ids.map(id=>['defer-'+id,{start:d.subscribe[id],connectDuration:t.link,
      events:[{value:coldUserSymbol,color:laneSubscribers[id].fill,at:d.response[id],arrival:d.response[id]+d.travel}],end:complete(id)}])),
    executions:ids.map((id,i)=>({id:`http-${i+1}`,node:'defer',edge:'defer-'+id,duration:d.response[id]-d.subscribe[id]})),
    trays:view.trays,
    callouts:ids.flatMap((id,i)=>[laneCallout('.subscribe()',id,laneEvent('subscribe','defer-'+id),laneEvent('connected','defer-'+id),{x:960,y:top/2}),
      {...laneCallout('loadUser()',id,laneEvent('connected','defer-'+id),laneEvent('connected','defer-'+id,t.callout),{x:tile.x,y:top/2}),label:`#${i+1}`}]),
    timeline:[{type:'defer-summary',at:d.summary,caption:'from(loadUser()): 1 wywołanie, 1 HTTP · defer(() => loadUser()): 2 wywołania, 2 HTTP'}],
  };
}

// combineLatest (drugi EXTRAS): dwa kontrolowane źródła i lokalny stan jednego wykonania operatora.
// Każde wejście ma stały kolor, a wynik zachowuje oba kolory jako jedna, dwuczęściowa para.
const latestColors={user:'#B85D05',language:'#087FAD'};
export function configureCombineLatestWithLatestFrom(scene) {
  const input={
    user:[{value:'42',color:latestColors.user,at:3.2,arrival:4.2,logicalAt:3.2},
      {value:'43',color:latestColors.user,at:12.2,arrival:13.2,logicalAt:12.2}],
    language:[{value:'PL',color:latestColors.language,at:6.2,arrival:7.2,logicalAt:6.2},
      {value:'EN',color:latestColors.language,at:9.4,arrival:10.4,logicalAt:9.4}],
  };
  const combine=[{value:'[42, PL]',color:latestColors.language,at:8,arrival:9,logicalAt:6.2},
    {value:'[42, EN]',color:latestColors.language,at:11.2,arrival:12.2,logicalAt:9.4},
    {value:'[43, EN]',color:latestColors.user,at:14,arrival:15,logicalAt:12.2}];
  const combineMark={id:'combine-latest',bg:'rgba(216,179,230,.45)',line:'#b384c6'};
  const lines=[[{text:'combineLatest',mark:combineMark},{text:'([userId$, language$])'}]];
  Object.assign(scene,{title:'combineLatest — ostatnie wartości z wielu źródeł',graph:combineLatestWithLatestFromGraph,
    playerLayout:'expanded',playerClass:'rx-flat-tiles rx-combinelatest',duration:16.1,
    latestPlan:{input,combine},
    code:'combineLatest([userId$, language$])',codeLines:lines,codeFrames:[],
    rows:[R('userId$',input.user),R('language$',input.language),R('combineLatest',combine)],
    captions:[[0,'Dwa źródła. combineLatest czeka na pierwszą wartość z każdego z nich']],
    metrics:[{label:'Wyniki S1',value:t=>combine.filter(v=>v.arrival<=t).length}],
    playback:{entry:'manual',finish:'hold',afterLastManualStop:'start-auto',stops:[
      {id:'subscribed',time:2.65,caption:'S1 subskrybuje wynik, a combineLatest podłącza oba źródła'},
      {id:'user-42',time:4.85,caption:'Zapamiętane ID: 42. Brak języka, więc S1 nadal nic nie dostaje'},
      {id:'language-pl',time:9.25,caption:'Oba sloty są pełne. Pierwszy wynik: [42, PL]'},
      {id:'language-en',time:12.45,caption:'Zmienił się tylko język. Ostatnie ID wystarcza do wyniku [42, EN]'},
      {id:'user-43',time:15.25,caption:'Nowe ID łączy się z ostatnim językiem: [43, EN]'},
      {id:'summary',time:15.8,caption:'Po pierwszych wartościach każda emisja dowolnego źródła tworzy aktualną parę'},
    ]},
  });
}

function combineLatestWithLatestFromGraph(scene) {
  const large=scene.format==='4:3',height=large?612:460,sourceX=130,sourceW=215,opX=485,opW=310,receiverX=950,receiverW=540;
  const top=large?90:50,defH=large?40:34,sourceDefH=defH,rowH=large?74:64,inputH=sourceDefH+rowH+4;
  const userY=top+defH+inputH/2,languageY=userY+inputH,outputY=top+defH+2*inputH+rowH/2;
  const ball=large?{r:25,font:29,textFill:'#fff'}:{r:23,font:25,textFill:'#fff'};
  const pair={partWidth:40,height:46,font:23,textFill:'#fff'};
  const subscribers={U1:{color:latestColors.user,fill:'#F6D9BC',ink:'#7C4008',label:''},
    U2:{color:latestColors.language,fill:'#D5ECF5',ink:'#075C7D',label:''},
    S1:{color:'#7457D9',fill:'#D9CFF5',ink:'#513A9A',label:'S1'}};
  const row=(subscriber,y,h,tint)=>({subscriber,top:y-h/2,h,growth:1,color:subscribers[subscriber].color,tint});
  // Stałe pasy są widoczne w READY; subscribe aktywuje porty bez zmiany geometrii.
  const source=(id,label,y,subscriber)=>({id,label,x:sourceX,w:sourceW,top:y-sourceDefH-rowH/2,defH:sourceDefH,rowH,
    laneSlots:{[subscriber]:0},y:y-sourceDefH/2,h:sourceDefH+rowH,ready:true,
    labelOffset:-rowH/2,labelSize:large?32:29,
    laneRows:[row(subscriber,y,rowH,subscriber==='U1'?'#FAEBDD':'#E4F3F8')],
    headerFill:'#8FC9D4',runtimeFill:subscriber==='U1'?'#FAEBDD':'#E4F3F8',terminalBadge:true,detail:'',statusInside:false,rx:7});
  const operatorH=defH+2*inputH+rowH;
  const nodes=[source('user-source','userId$',userY,'U1'),source('language-source','language$',languageY,'U2'),
    {id:'combine-op',label:'combineLatest',x:opX,w:opW,top,defH,y:top+operatorH/2,h:operatorH,ready:true,color:'op',
      headerFill:'#D8B3E6',runtimeFill:'#F3EDF8',terminalBadge:true,detail:'',statusInside:false,rx:7,
      labelOffset:-operatorH/2+defH/2,labelSize:large?32:29,hubFan:false,
      laneRows:[row('U1',userY,inputH,'#FAEBDD'),row('U2',languageY,inputH,'#E4F3F8'),{...row('S1',outputY,rowH,'#EDE6F8'),label:'S1'}],
      inputMemories:[
        {id:'user',label:'id',empty:'—',edge:'user-combine',x:opX+opW/2-ball.r-18,y:userY,ball},
        {id:'language',label:'lang',empty:'—',edge:'language-combine',x:opX+opW/2-ball.r-18,y:languageY,ball},
      ]},
    {id:'s1',label:'',x:receiverX,w:receiverW,y:outputY,h:rowH,top:outputY-rowH/2,defH:0,rowH,
      laneSlots:{S1:0},ready:true,subscriber:'S1',headerFill:'#EAE4F7',runtimeFill:'#EDE6F8',terminalBadge:true,
      detail:'',statusInside:false,inbox:{size:25,left:16,font:30,ready:true,label:'S1'},rx:7}];
  const edges=[
    {id:'user-combine',from:'user-source',to:'combine-op',subscriber:'U1',points:[[sourceX+sourceW/2,userY],[opX-opW/2,userY]]},
    {id:'language-combine',from:'language-source',to:'combine-op',subscriber:'U2',points:[[sourceX+sourceW/2,languageY],[opX-opW/2,languageY]]},
    {id:'combine-s1',from:'combine-op',to:'s1',subscriber:'S1',points:[[opX+opW/2,outputY],[receiverX-receiverW/2,outputY]]},
  ];
  const schedule={
    'combine-s1':{start:.45,connectDuration:.8,events:scene.latestPlan.combine.map(v=>({...v}))},
    'user-combine':{start:1.25,connectDuration:.8,events:scene.latestPlan.input.user.map(v=>({...v}))},
    'language-combine':{start:1.25,connectDuration:.8,events:scene.latestPlan.input.language.map(v=>({...v}))},
  };
  const trays=[{anchor:'s1',x:receiverX-receiverW/2+170,y:outputY,w:receiverW-130,lines:1,columns:3,columnStep:130,pairs:true,pair}];
  const valueParts=Object.fromEntries(scene.latestPlan.combine.map(v=>[v.value,[
    {value:v.value.match(/\[(\d+)/)[1],color:latestColors.user},
    {value:v.value.match(/, ([A-Z]+)/)[1],color:latestColors.language},
  ]]));
  return {layout:'fixed',formatAware:true,width:1240,height,nodes,edges,trays,schedule,subscribers,laneWire:5,portRadius:11,
    ball:{...ball,pair,valueParts},
    ...(large?{textScale:1.25,labelScale:1.4}:{}),timeline:[{type:'latest-summary',at:15.8,
      caption:'Stan: id 43, lang EN · S1: [42, PL], [42, EN], [43, EN]'}]};
}

// Modele symulacji z dostarczonej paczki rxjs-animacje (RxJS 7.8.2).

"use strict";
import { configureReferences } from './reference-scenes.js';
const D=[];
const E=(at,value,color="a",kind="value")=>({at,value,color,kind});
const B=(start,end,label,color="http",kind="work")=>({start,end,label,color,kind});
const R=(label,events=[],spans=[],extra={})=>({label,events,spans,...extra});
function add(id,title,code,duration,rows,captions,notes,extra={}){
 D.push({id,title,code,duration,rows,captions,notes,group:"main",...extra});
}
const cards=(id,title,items,captions,notes,duration=16,extra={})=>add(id,title,"",duration,[],captions,notes,{kind:"cards",items:items.map((label,i)=>({label,at:1+i*2.3,color:["source","op","http","b"][i%4]})),...extra});
cards("01-tytul","RxJS — operatory, które znasz, ale bałeś się zagadać",["Kiedy?","Ile naraz?","Co pominąć?","Co współdzielić?"],[[0,""],[3,"Znane nazwy. Konkretne decyzje o pracy."],[12,"Jedno zdarzenie może uruchomić znacznie więcej, niż myślisz."]],"Otwarcie. Zapowiedz decyzje o pracy, kolejności i współdzieleniu. Tytuł można pozostawić jako statyczny slajd.",14);
add("04-operator","Operator to funkcja","",1,[],[],"");
add("04a-dwa-tory","Cold: jedna definicja, trzy wykonania","",1,[],[],"");
add("20a-sharereplay-interval","shareReplay(1): kto zatrzyma interval?","",1,[],[],"");
add("20b-sharereplay-refcount","shareReplay z refCount: kiedy znika bufor?","",1,[],[],"");
add("x02-combinelatest-withlatestfrom","combineLatest — ostatnie wartości z wielu źródeł","",1,[],[],"",{group:"bonus"});
add("x03-retry-backoff","retry — nie udało się? Spróbuj później","",1,[],[],"",{group:"bonus"});
add("x04-defer","defer — nie wywołuj mnie jeszcze","",1,[],[],"",{group:"bonus"});
add("05-zrodla","Skąd płyną wartości?","timer · HTTP · Subject",20,[
 R("timer",[E(2,"0","source"),E(6,"1","source"),E(10,"2","source"),E(14,"3","source")]),
 R("HTTP",[E(7,"dane","http")],[B(1,7,"request")],{completeAt:7}),
 R("Subject.next",[E(4,"A"),E(12,"B","b"),E(16,"C","c")]),
 R("odbiorca Subject",[E(12,"B","b"),E(16,"C","c")],[B(8,18,"subskrypcja","source","subscription")])
],[[0,"Wartości mogą pochodzić z timera, HTTP albo ręcznego next()."],[4,"Subject emituje A. Odbiorca jeszcze nie słucha."],[8,"Odbiorca subskrybuje zwykły Subject."],[12,"Odbiera B. Wcześniejszego A nie dostaje."]],"To zwykły Subject, bez replay. Timer i HTTP są osobnymi przykładami źródeł. Odbiorca Subject subskrybuje dopiero w 8. sekundzie.");

// Model pojedynczego innera i postoje nadaje configureReferences.
add("08-map-strumienie","A jeśli wartością jest Observable?","id$.pipe(map(id => httpGet(url(id))), concatAll())",1,[],[],"map tworzy Observable. concatAll subskrybuje go i przepuszcza jego wynik dalej.");
function mapping(mode){
 const input=[{at:1,value:"A",dur:6,color:"a"},{at:4,value:"B",dur:6,color:"b"},{at:7.2,value:"C",dur:6,color:"c"}];
 let end=0;
 const jobs=input.map((item,i)=>{
   if(mode==="concatMap"){const start=Math.max(item.at,end);end=start+item.dur;return {...item,start,end};}
   if(mode==="exhaustMap"){if(item.at<end)return {...item,ignored:true};end=item.at+item.dur;return {...item,start:item.at,end};}
   const start=item.at;
   const natural=start+item.dur;
   const finish=mode==="switchMap"&&input[i+1]?Math.min(natural,input[i+1].at):natural;
   return {...item,start,end:finish,cancelled:finish<natural};
 });
 const out=[];
 jobs.forEach(job=>{if(job.ignored)return;[1.5,3.5,5.5].forEach((offset,i)=>{if(job.start+offset<job.end)out.push(E(job.start+offset,job.value+(i+1),job.color));});});
 out.sort((a,b)=>a.at-b.at);
 return {input,jobs,out};
}
["concatMap","mergeMap","switchMap","exhaustMap"].forEach((mode,i)=>{
 const m=mapping(mode);
 const descriptions={
 concatMap:["Po kolei","B i C czekają na zakończenie poprzedniej pracy.","Każde wejście zostaje obsłużone, ale kolejka zwiększa opóźnienie."],
 mergeMap:["Równocześnie","B zaczyna bez czekania na A.","Wyniki przeplatają się. Domyślnie brak limitu współbieżności."],
 switchMap:["Najnowsza subskrypcja","Nowe wejście odsubskrybowuje poprzedni strumień wewnętrzny.","Odsubskrybowanie nie cofa operacji już wykonanej na serwerze."],
 exhaustMap:["Jestem zajęty","B przychodzi podczas A i zostaje pominięte.","C przychodzi po zakończeniu A, więc może wystartować."]
 };
 const rows=[R("wejście",m.input.map(x=>E(x.at,x.value,x.color)))];
 m.jobs.forEach(job=>{
  const spans=job.ignored?[]:[...(job.start>job.at?[B(job.at,job.start,"czeka","muted","queue")]:[]),B(job.start,job.end,job.value+"$",job.color,job.cancelled?"cancel":"work")];
  const ev=job.ignored?[E(job.at,"pomiń","muted","ignored")]:m.out.filter(e=>e.value.startsWith(job.value));
  rows.push(R(job.value+"$",ev,spans,{completeAt:job.ignored||job.cancelled?undefined:job.end}));
 });
 rows.push(R("wynik",m.out,[],{showCount:true}));
 add(String(i+9).padStart(2,"0")+"-"+mode.toLowerCase(),mode+" — "+descriptions[mode][0],"id$.pipe("+mode+"(makeInner$))",22,rows,[[0,"Te same wejścia i te same zimne źródła wewnętrzne."],[4,descriptions[mode][1]],[14,descriptions[mode][2]]],descriptions[mode].join(" ")+" Czas każdego źródła liczymy od jego subskrypcji. Emisje po odsubskrybowaniu nie trafiają do wyniku.",{jobs:m.jobs,metrics:[{label:"uruchomione",value:t=>m.jobs.filter(j=>!j.ignored&&j.start<=t).length},{label:"aktywne",value:t=>m.jobs.filter(j=>!j.ignored&&j.start<=t&&j.end>t).length},{label:"w kolejce",value:t=>m.jobs.filter(j=>!j.ignored&&j.at<=t&&j.start>t).length}]});
});
// Model, graf i postoje distinctUntilChanged: configureDistinctSwitch (reference-scenes.js).
add("11a-distinct-switchmap","distinctUntilChanged — czy coś się zmieniło?","",1,[],[],"");
add("12-query-zrodlo","Źródło: skąd bierze się query$?","",1,[],[],"");
add("12a-switchmap-live","switchMap — nowe zapytanie anuluje poprzednie","",1,[],[],"");
add("12b-debounce-switchmap","debounceTime — czekamy na ciszę","",1,[],[],"");
add("16-czas-cztery","debounceTime i auditTime: cisza czy okno?","",1,[],[],"");
add("20-sharereplay","Co dostaje spóźniony odbiorca?","share() vs shareReplay({ bufferSize: 1, refCount: true })",22,[
 R("subskrypcje",[E(1,"A+","a"),E(10,"B+","b")]),
 R("share · HTTP",[E(6,"dane","http"),E(15,"dane","http")],[B(1,6,"HTTP #1"),B(10,15,"HTTP #2")]),
 R("share · odbiorca B",[E(15,"dane","b")]),
 R("replay · HTTP",[E(6,"dane","http")],[B(1,6,"HTTP #1")]),
 R("replay · odbiorca B",[E(10,"dane","b")])
],[[0,"HTTP kończy się odpowiedzią w 6. sekundzie."],[6,"shareReplay zachowuje wynik zakończonego źródła."],[10,"B dołącza: share uruchamia nowe HTTP, shareReplay odtwarza bufor."],[16,"refCount: true nie usuwa automatycznie wyniku po poprawnym complete."]],"Semantyka RxJS 7.8.2. Domyślny share resetuje po complete; shareReplay ma resetOnComplete=false. To nie jest pełna strategia cache z odświeżaniem.",{metrics:[{label:"HTTP · share",value:t=>(t>=1?1:0)+(t>=10?1:0)},{label:"HTTP · replay",value:t=>t>=1?1:0}]});
cards("25-podsumowanie","Cztery pytania przed kolejnym pipe",["Czy trzeba?","Kiedy zacząć?","Co z poprzednią pracą?","Czy można współdzielić?"],[[0,""],[3,"distinctUntilChanged"],[6,"debounceTime / auditTime"],[8,"concatMap / mergeMap / switchMap / exhaustMap"],[11,"share / shareReplay"]],"Zakończ pytaniami, które publiczność może zastosować we własnym kodzie. Przywróć tytułową analogię znajomości operatorów.",16);
// Lifecycle-focused diagrams: variants share the same playback clock.
const revise=(id,extra)=>Object.assign(D.find(s=>s.id===id),extra);
const lateRows=replay=>[
 R("HTTP #1",[E(6,"dane","http")],[B(1,6,"HTTP #1","http")],{completeAt:6}),
 replay?R("brak kolejnego HTTP"):R("HTTP #2",[E(15,"dane","http")],[B(10,15,"HTTP #2","http")],{completeAt:15}),
 R("A",[E(6,"dane","a")],[B(1,6,"słucha","a","subscription")],{completeAt:6}),
 R("B",[E(replay?10:15,"dane","b")],[B(10,replay?10.1:15,"słucha","b","subscription")],{completeAt:replay?10:15})
];
revise("20-sharereplay",{
 diagram:"late",title:"B przychodzi po odpowiedzi. Co dostanie?",rows:lateRows(false),compareLabels:["share()","shareReplay(1)"],
 notes:"Źródło HTTP kończy się odpowiedzią w 6 s. Widok A znika w 8 s; B pojawia się w 10 s. Domyślny share resetuje po complete, więc B uruchamia nowy request. shareReplay({bufferSize:1,refCount:true}) zachowuje wynik poprawnie zakończonego źródła i odtwarza go dla B. RefCount true nie usuwa automatycznie tego zakończonego cache. Wersja RxJS 7.8.2.",
 variants:{
 without:{rows:lateRows(false),code:"http$.pipe(share())",captions:[[0,"Najpierw A. B jeszcze nie istnieje."],[1,"A subskrybuje i uruchamia HTTP."],[6,"A dostaje dane. HTTP i share kończą to wykonanie."],[8,"Widok A znika."],[10,"Pojawia się B. Bufora brak → nowy HTTP."],[15,"Dopiero nowa odpowiedź trafia do B."]],metrics:[{label:"requesty",value:t=>(t>=1?1:0)+(t>=10?1:0)}]},
 shared:{rows:lateRows(true),code:"http$.pipe(shareReplay({bufferSize: 1, refCount: true}))",captions:[[0,"Najpierw A. B jeszcze nie istnieje."],[1,"A uruchamia HTTP."],[6,"Odpowiedź zostaje w buforze po complete HTTP."],[8,"Widok A znika. Bufor nadal istnieje."],[10,"B dostaje zapamiętane dane od razu. Bez nowego HTTP."]],metrics:[{label:"requesty",value:t=>t>=1?1:0},{label:"wartości w buforze",value:t=>t>=6?1:0}]}
 }
});
revise("11-switchmap",{
 captions:[[0,"A$ powstanie dopiero po pierwszej emisji id$."],[1,"A$ zaczyna pracować."],[2.5,"Pierwsza wartość A1 trafia do wyniku."],[4,"Nowe B: unsubscribe A$ → subscribe B$."],[5.5,"Teraz wartości emituje B$. A$ już nie pracuje."],[7.2,"Nowe C przerywa B$ i uruchamia C$."],[13.2,"C$ kończy się. Przerwane A$ i B$ nie wracają."]],
 notes:"Projection switchMap jest wywoływana po emisji id$. Każda nowa wartość najpierw odsubskrybowuje poprzedni inner, a potem uruchamia nowy. W naszym źródle teardown zatrzymuje emisje. Unsubscribe HTTP może anulować żądanie po stronie klienta, ale nie cofa wykonanych już zmian na serwerze."
});
for(const scene of D)if(scene.variants)Object.assign(scene,scene.variants.without);
// Model, graf i postoje powstają w configureCatchInside/configureCatchOutside (reference-scenes.js).
add("b04-catcherror","Jeden błąd. Czy następny klik zadziała?","catchError wewnątrz vs za switchMap",12,[],[],
 "Oba warianty zwracają of([]), które emituje i kończy się. Catch wewnątrz dotyczy błędu inner Observable. Nie sugeruj, że każdy zewnętrzny catchError zawsze kończy wynik.");
configureReferences(D);
D.forEach(scene=>{
 scene.playback ||= {entry:'auto',finish:'loop'};
 const points=new Set([0,scene.duration]);
 (scene.captions||[]).forEach(c=>points.add(c[0]));
 if(scene.kind==="cards")scene.items.forEach(item=>points.add(Math.min(scene.duration,item.at+.5)));
 else scene.rows.forEach(row=>{row.events.forEach(e=>points.add(Math.min(scene.duration,e.at+.2)));row.spans.forEach(s=>points.add(Math.min(scene.duration,s.end+.2)));});
 scene.checkpoints=[...points].filter(v=>Number.isFinite(v)&&v>=0&&v<=scene.duration).sort((a,b)=>a-b).filter((v,i,a)=>i===0||v-a[i-1]>.45);
 if(scene.checkpoints[scene.checkpoints.length-1]!==scene.duration)scene.checkpoints.push(scene.duration);
});
export { D as scenes };

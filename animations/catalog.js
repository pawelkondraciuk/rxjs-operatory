// Modele symulacji z dostarczonej paczki rxjs-animacje (RxJS 7.8.2).

"use strict";
import { configureReferences } from './reference-scenes.js';
import { resolverScenes } from './resolver-scenes.js';
const D=[];
const E=(at,value,color="a",kind="value")=>({at,value,color,kind});
const B=(start,end,label,color="http",kind="work")=>({start,end,label,color,kind});
const R=(label,events=[],spans=[],extra={})=>({label,events,spans,...extra});
function add(id,title,code,duration,rows,captions,notes,extra={}){
 D.push({id,title,code,duration,rows,captions,notes,group:"main",...extra});
}
const count=(events,t)=>events.filter(e=>e.at<=t&&e.kind!=="complete"&&e.kind!=="error").length;
const cards=(id,title,items,captions,notes,duration=16,extra={})=>add(id,title,"",duration,[],captions,notes,{kind:"cards",items:items.map((label,i)=>({label,at:1+i*2.3,color:["source","op","http","b"][i%4]})),...extra});
cards("01-tytul","RxJS — operatory, które znasz, ale bałeś się zagadać",["Kiedy?","Ile naraz?","Co pominąć?","Co współdzielić?"],[[0,""],[3,"Znane nazwy. Konkretne decyzje o pracy."],[12,"Jedno zdarzenie może uruchomić znacznie więcej, niż myślisz."]],"Otwarcie. Zapowiedz decyzje o pracy, kolejności i współdzieleniu. Tytuł można pozostawić jako statyczny slajd.",14);
add("04-operator","Operator to funkcja","const sub = source$.pipe(map(x => x * 10)).subscribe(observer)",24,[
 R("Źródło",[E(5,"1"),E(9,"2"),E(13,"3"),E(21,"4")]),
 R("map",[E(6.5,"10","op"),E(10.5,"20","op"),E(14.5,"30","op")]),
 R("Odbiorca",[E(7.5,"10","http"),E(11.5,"20","http"),E(15.5,"30","http")])
],[[0,"Trzy klocki. Jeszcze bez subskrypcji."],[1,"subscribe() łączy źródło, map i odbiorcę."],[4,"Połączenie gotowe. Czekamy na wartość."],[5,"Źródło emituje 1. Wartość płynie do map."],[6,"1 trafia do map. Mnożymy przez 10."],[6.5,"Dopiero teraz 10 rusza do odbiorcy."],[7.5,"Odbiorca dostaje 10."],[9,"Kolejna wartość: 2."],[10,"map przekształca 2 w 20."],[10.5,"20 płynie dalej."],[11.5,"Odbiorca dostaje 20."],[13,"Źródło emituje 3."],[14,"map przekształca 3 w 30."],[14.5,"30 płynie do odbiorcy."],[15.5,"Odbiorca ma 10, 20 i 30."],[18,"unsubscribe() usuwa połączenie."],[20,"Klocki znów są rozłączone."],[21,"Źródło emituje 4. Zamknięta subskrypcja jej nie odbiera."]],"Subskrypcję pokazujemy prostymi czarnymi kreskami: najpierw wydłuża się połączenie od odbiorcy do map, następnie od map do źródła. Przy unsubscribe kreski skracają się i znikają. Wartość dociera do map, zostaje przekształcona i dopiero potem biegnie dalej. Ruch i pauza przy map są zwolnieniem ilustracji: map wykonuje się synchronicznie. unsubscribe odłącza tego odbiorcę, nie zamyka źródła.",{
 fragmentSteps:[0,4,6.25,7.5,10.25,11.5,14.25,15.5,20,22],
 flow:{subscribeAt:1,connectedAt:4,unsubscribeAt:18,disconnectedAt:20,travel:1,transform:.5},
 steps:[0,1,1.75,2.5,3.25,4,5,5.5,6,6.5,7,7.5,9,9.5,10,10.5,11,11.5,13,13.5,14,14.5,15,15.5,18,18.5,19,19.5,20,21,21.5,22.5,24]
});
add("05-zrodla","Skąd płyną wartości?","timer · HTTP · Subject",20,[
 R("timer",[E(2,"0","source"),E(6,"1","source"),E(10,"2","source"),E(14,"3","source")]),
 R("HTTP",[E(7,"dane","http")],[B(1,7,"request")],{completeAt:7}),
 R("Subject.next",[E(4,"A"),E(12,"B","b")]),
 R("odbiorca Subject",[E(12,"B","b")],[B(8,18,"subskrypcja","source","subscription")])
],[[0,"Wartości mogą pochodzić z timera, HTTP albo ręcznego next()."],[4,"Subject emituje A. Odbiorca jeszcze nie słucha."],[8,"Odbiorca subskrybuje zwykły Subject."],[12,"Odbiera B. Wcześniejszego A nie dostaje."]],"To zwykły Subject, bez replay. Timer i HTTP są osobnymi przykładami źródeł. Odbiorca Subject subskrybuje dopiero w 8. sekundzie.");
add("06-subskrypcja","Co uruchamia pracę?","const data$ = http.get('/api/data')",18,[
 R("kod",[E(1,"utwórz","source"),E(6,"subscribe","b")]),
 R("HTTP",[E(12,"dane","http")],[B(6,12,"request")],{completeAt:12}),
 R("odbiorca",[E(12,"dane","b")],[],{completeAt:12})
],[[0,"Budujemy Observable HTTP."],[1,"Samo utworzenie tego Observable nie wysyła żądania."],[6,"Subskrypcja uruchamia request."],[12,"Odpowiedź, a następnie complete."]],"Przykład dotyczy zimnego Observable z Angular HttpClient. Nie generalizuj leniwości na już uruchomiony Promise.");
const shareWithoutRows=[
 R("HTTP #1",[E(7,"dane","a")],[B(1,7,"request A","a")],{completeAt:7}),
 R("HTTP #2",[E(9,"dane","b")],[B(3,9,"request B","b")],{completeAt:9}),
 R("odbiorca A",[E(7,"dane","a")],[B(1,7,"słucha","a","subscription")],{completeAt:7}),
 R("odbiorca B",[E(9,"dane","b")],[B(3,9,"słucha","b","subscription")],{completeAt:9})
];
const shareSharedRows=[
 R("wspólne HTTP",[E(7,"dane","http")],[B(1,7,"wspólny request","http")],{completeAt:7}),
 R("brak drugiego requestu"),
 R("odbiorca A",[E(7,"dane","a")],[B(1,7,"słucha","a","subscription")],{completeAt:7}),
 R("odbiorca B",[E(7,"dane","b")],[B(3,7,"słucha","b","subscription")],{completeAt:7})
];
const shareWithoutCaptions=[[0,"Ten sam Observable HTTP. Dwóch odbiorców."],[1,"A subskrybuje — rusza pierwszy request."],[3,"B subskrybuje — rusza drugi request."],[7,"A ma odpowiedź. Request B nadal trwa."],[9,"Dwie subskrypcje uruchomiły dwa requesty."]];
const shareSharedCaptions=[[0,"Obaj odbiorcy używają tej samej instancji data$ z share()."],[1,"A subskrybuje — rusza wspólny request."],[3,"B dołącza do trwającego wykonania."],[7,"Jedna odpowiedź trafia do A i B."],[9,"Dwie subskrypcje współdzieliły jeden request."]];
add("07-hot-cold","Dwie subskrypcje — bez share czy z share?","const data$ = http.get('/api/data')",21,shareWithoutRows,shareWithoutCaptions,"Porównaj warianty na kolejnych slajdach. A subskrybuje w 1 s, B w 3 s. Każdy request trwa 6 s od uruchomienia. Bez share każdy odbiorca uruchamia własne zimne wykonanie. Z share obaj korzystają z tej samej instancji data$ i nakładających się subskrypcji; B dołącza przed odpowiedzią w 7 s. Zwykły share nie przechowuje wyniku dla spóźnionego odbiorcy i domyślnie resetuje po complete.",{
 metrics:[{label:"uruchomione requesty",value:t=>(t>=1?1:0)+(t>=3?1:0)}],
 variants:{
  without:{rows:shareWithoutRows,captions:shareWithoutCaptions,code:"const data$ = http.get('/api/data')",metrics:[{label:"uruchomione requesty",value:t=>(t>=1?1:0)+(t>=3?1:0)}]},
  shared:{rows:shareSharedRows,captions:shareSharedCaptions,code:"const data$ = http.get('/api/data').pipe(share())",metrics:[{label:"uruchomione requesty",value:t=>t>=1?1:0}]}
 }
});
add("08-map-strumienie","A jeśli wartością jest Observable?","map(id => request$(id)) → concatAll()",22,[
 R("wejście",[E(1,"a"),E(4,"b","b")]),
 R("po map",[E(1,"A$"),E(4,"B$","b")]),
 R("A$ · subskrypcja",[E(3,"A1"),E(5,"A2")],[B(1,7,"A$","a")],{completeAt:7}),
 R("B$ · subskrypcja",[E(9,"B1","b"),E(11,"B2","b")],[B(4,7,"czeka","muted","queue"),B(7,13,"B$","b")],{completeAt:13}),
 R("concatAll · wynik",[E(3,"A1"),E(5,"A2"),E(9,"B1","b"),E(11,"B2","b")])
],[[0,"map zwraca Observable. Sam go nie subskrybuje."],[1,"concatAll subskrybuje zimne A$."],[4,"B$ już istnieje, ale jeszcze czeka na subskrypcję."],[7,"A$ kończy się. Dopiero teraz startuje B$."],[13,"map + concatAll prowadzi do idei concatMap."]],"Rozróżnij zwykłe wartości a, b od referencji A$, B$. Zimne źródła wewnętrzne rozpoczynają emisje przy subskrypcji.");
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
 add(String(i+9).padStart(2,"0")+"-"+mode.toLowerCase(),mode+" — "+descriptions[mode][0],"source$.pipe("+mode+"(makeInner$))",22,rows,[[0,"Te same wejścia i te same zimne źródła wewnętrzne."],[4,descriptions[mode][1]],[14,descriptions[mode][2]]],descriptions[mode].join(" ")+" Czas każdego źródła liczymy od jego subskrypcji. Emisje po odsubskrybowaniu nie trafiają do wyniku.",{jobs:m.jobs,metrics:[{label:"uruchomione",value:t=>m.jobs.filter(j=>!j.ignored&&j.start<=t).length},{label:"aktywne",value:t=>m.jobs.filter(j=>!j.ignored&&j.start<=t&&j.end>t).length},{label:"w kolejce",value:t=>m.jobs.filter(j=>!j.ignored&&j.at<=t&&j.start>t).length}]});
});
const limited=[{at:1,start:1,end:7,v:"A",color:"a"},{at:2,start:2,end:8,v:"B",color:"b"},{at:3,start:3,end:9,v:"C",color:"c"},{at:4,start:7,end:13,v:"D",color:"a"},{at:5,start:8,end:14,v:"E",color:"b"}];
add("13-limit","100 zadań. Ile naraz?","mergeMap(request$, 3)",20,limited.map(j=>R(j.v,[E(j.end,j.v+" ✓",j.color)],[...(j.start>j.at?[B(j.at,j.start,"kolejka","muted","queue")]:[]),B(j.start,j.end,"HTTP",j.color)],{completeAt:j.end})),[[0,"W przykładzie pięć zadań i limit trzech aktywnych requestów."],[4,"Trzy requesty pracują. D i E czekają."],[7,"A zwalnia miejsce. Rusza D."],[14,"Limit dotyczy współbieżności, a nie liczby requestów na sekundę."]],"Limit ogranicza liczbę aktywnych subskrypcji wewnętrznych. Dalsze wejścia są buforowane, więc limit nie jest pełnym mechanizmem backpressure.",{metrics:[{label:"aktywne / 3",value:t=>limited.filter(j=>j.start<=t&&j.end>t).length},{label:"w kolejce",value:t=>limited.filter(j=>j.at<=t&&j.start>t).length}]});
const distinctIn=[E(1,"A"),E(4,"A"),E(7,"B","b"),E(10,"B","b"),E(13,"A")];
const distinctOut=distinctIn.filter((e,i,a)=>i===0||e.value!==a[i-1].value);
add("14-distinct","Czy ten sam identyfikator wymaga kolejnego HTTP?","map(x => x.id) → distinctUntilChanged() → mergeMap(http)",20,[
 R("wejście",distinctIn),
 R("HTTP · bez filtra",distinctIn.map(e=>E(e.at+2.5,e.value,e.color)),distinctIn.map(e=>B(e.at+.5,e.at+2.5,"GET "+e.value,"http"))),
 R("distinctUntilChanged",distinctOut),
 R("HTTP · z filtrem",distinctOut.map(e=>E(e.at+2.5,e.value,e.color)),distinctOut.map(e=>B(e.at+.5,e.at+2.5,"GET "+e.value,"http")))
],[[0,"Te same wartości A, A, B, B, A w obu potokach."],[4,"Drugie A nie uruchamia HTTP w filtrowanym potoku."],[10,"Drugie B również zostaje pominięte."],[13,"A po B jest zmianą — przechodzi ponownie."],[16,"5 → 3 żądania. Filtrujemy przed kosztowną operacją."]],"Porównanie z ostatnią przepuszczoną wartością; domyślnie ===. Identyfikator jest prymitywem. To nie jest globalne usuwanie duplikatów.",{metrics:[{label:"HTTP bez filtra",value:t=>distinctIn.filter(e=>e.at+.5<=t).length},{label:"HTTP z filtrem",value:t=>distinctOut.filter(e=>e.at+.5<=t).length}]});
const timeInput=[1,2,3,4,6,7.2,8.3,12,13,18].map((t,i)=>E(t,String.fromCharCode(65+i),i<4?"a":i<7?"b":"c"));
const period=3.5;
const debounce=timeInput.filter((e,i,a)=>!a[i+1]||a[i+1].at-e.at>=period).map(e=>({...e,at:e.at+period}));
const audit=[],auditWindows=[];let k=0;
while(k<timeInput.length){const start=timeInput[k].at,end=start+period;let latest=timeInput[k++];while(k<timeInput.length&&timeInput[k].at<end)latest=timeInput[k++];audit.push({...latest,at:end});auditWindows.push(B(start,end,"okno","muted","window"));}
const throttle=[],throttleWindows=[];let until=-Infinity;
timeInput.forEach(e=>{if(e.at>=until){throttle.push(e);until=e.at+period;throttleWindows.push(B(e.at,until,"blokada","muted","window"));}});
const sample=[];let lastTick=0;
for(let tick=period;tick<24;tick+=period){const fresh=timeInput.filter(e=>e.at>lastTick&&e.at<=tick);if(fresh.length)sample.push({...fresh[fresh.length-1],at:tick});lastTick=tick;}
add("15-debounce-audit","Czekać na ciszę czy aktualizować w trakcie?","debounceTime(3500) / auditTime(3500) / throttleTime(3500) / sampleTime(3500)",24,[
 R("wejście",timeInput),
 R("debounceTime",debounce,[],{ticks:timeInput.map(e=>e.at+period),showCount:true}),
 R("auditTime",audit,auditWindows,{showCount:true}),
 R("throttleTime",throttle,throttleWindows,{showCount:true}),
 R("sampleTime",sample,[],{ticks:[3.5,7,10.5,14,17.5,21],showCount:true})
],[[0,"Wspólne wejście. Okno 3,5 s dla każdego operatora."],[1,"Throttle przepuszcza A i przez 3,5 s pomija kolejne wartości."],[3.5,"Sample emituje C w stałym rytmie od subskrypcji."],[4,"Zdarzenia wciąż przychodzą. Debounce przesuwa moment emisji."],[4.5,"Audit emituje D po zamknięciu pierwszego okna."],[11.8,"Dopiero po ciszy debounce emituje G."],[17.5,"Sample: brak nowych wartości od poprzedniego taktu, więc brak emisji."],[21.5,"Debounce: cisza. Audit: koniec okna. Throttle: początek. Sample: stały takt."]],"Przykład trwającego źródła, bez complete i error podczas pokazu. W aplikacji czasy często będą krótsze. Audit otwiera okno zdarzeniem, a debounce czeka na ciszę. Throttle przepuszcza pierwszą wartość i pomija kolejne przez 3,5 s (domyślnie leading: true, trailing: false). Sample odlicza takty od subskrypcji i emituje tylko wtedy, gdy od poprzedniego taktu przyszła nowa wartość. Pomijamy zdarzenia dokładnie na granicach okien.");
add("16-czas-cztery","Cztery sposoby ograniczania emisji","okno 3,5 s · throttle: leading=true, trailing=false",24,[
 R("wejście",timeInput),R("debounceTime",debounce,[],{showCount:true}),R("auditTime",audit,auditWindows,{showCount:true}),R("throttleTime",throttle,throttleWindows,{showCount:true}),R("sampleTime",sample,[],{ticks:[3.5,7,10.5,14,17.5,21],showCount:true})
],[[0,"Wspólne wejście. Różne momenty emisji."],[3.5,"Sample działa w stałym rytmie liczonym od subskrypcji."],[4.5,"Audit zamyka okno otwarte pierwszą wartością."],[11.8,"Debounce emituje po przerwie w zdarzeniach."],[17.5,"Sample nie powtarza wartości, gdy od poprzedniego taktu nic nie przyszło."],[22,"Throttle w tej konfiguracji przepuszcza pierwszą wartość okna."]],"Wszystkie źródła pozostają aktywne. Sample nie jest replay co takt. Używamy domyślnych opcji throttleTime. Nie porównujemy wartości pojawiających się dokładnie w chwili końca okna.");
const filters=[E(1,"F1","b"),E(8,"F2","b"),E(15,"F3","b")],clicks=[E(4,"K1"),E(12,"K2")];
add("17-latest","Kto ma prawo uruchomić pracę?","klik$.pipe(withLatestFrom(filtry$))",21,[
 R("filtry$",filters),R("klik$",clicks),
 R("withLatestFrom",[E(4,"K1/F1","op"),E(12,"K2/F2","op")],[],{showCount:true}),
 R("combineLatest",[E(4,"K1/F1","http"),E(8,"K1/F2","http"),E(12,"K2/F2","http"),E(15,"K2/F3","http")],[],{showCount:true})
],[[0,"Filtry dostarczają kontekst. Klik jest akcją."],[4,"Pierwszy klik: oba warianty mogą wyemitować wynik."],[8,"Zmiana filtra uruchamia tylko combineLatest."],[12,"Drugi klik uruchamia oba warianty."],[16,"withLatestFrom: akcja steruje. combineLatest: każdy składnik może wyzwalać."]],"Oba warianty potrzebują pierwszych wartości odpowiednich źródeł. withLatestFrom subskrybuje także źródła pomocnicze; nie odkłada ich subskrypcji do kliknięcia.");
add("18-async","Jeden user$. Dwa requesty?","{{ user$ | async }} … {{ user$ | async }}",18,[
 R("async · A",[E(1,"sub A","a"),E(7,"dane","a")],[B(1,7,"HTTP #1","http")]),
 R("async · B",[E(2,"sub B","b"),E(8,"dane","b")],[B(2,8,"HTTP #2","http")])
],[[0,"Dwie niezależne instancje async subskrybują ten sam zimny Observable HTTP."],[2,"Ten sam obiekt Observable może wykonać pracę dwa razy."],[9,"Dwie subskrypcje → dwa requesty."]],"Przykład Angular HttpClient bez współdzielenia. To nie są dwie referencje do wyniku jednego async, lecz dwie odrębne instancje pipe.",{metrics:[{label:"requesty",value:t=>(t>=1?1:0)+(t>=2?1:0)}]});
add("19-share","share — wspólne wykonanie","http$.pipe(share())",18,[
 R("odbiorca A",[E(1,"sub A","a"),E(7,"dane","a")],[B(1,7,"słucha","a","subscription")],{completeAt:7}),
 R("odbiorca B",[E(3,"sub B","b"),E(7,"dane","b")],[B(3,7,"słucha","b","subscription")],{completeAt:7}),
 R("wspólne HTTP",[E(7,"dane","http")],[B(1,7,"jedno HTTP","http")],{completeAt:7})
],[[0,"Obaj odbiorcy używają tej samej instancji współdzielonego strumienia."],[3,"B dołącza przed odpowiedzią HTTP."],[7,"Jedna odpowiedź trafia do A i B."],[11,"share() domyślnie resetuje stan po complete."]],"A i B mają nakładające się subskrypcje. share() nie gwarantuje jednego wykonania na zawsze ani cache dla późniejszych odbiorców.",{metrics:[{label:"requesty",value:t=>t>=1?1:0}]});
add("20-sharereplay","Co dostaje spóźniony odbiorca?","share() vs shareReplay({ bufferSize: 1, refCount: true })",22,[
 R("subskrypcje",[E(1,"A+","a"),E(10,"B+","b")]),
 R("share · HTTP",[E(6,"dane","http"),E(15,"dane","http")],[B(1,6,"HTTP #1"),B(10,15,"HTTP #2")]),
 R("share · odbiorca B",[E(15,"dane","b")]),
 R("replay · HTTP",[E(6,"dane","http")],[B(1,6,"HTTP #1")]),
 R("replay · odbiorca B",[E(10,"dane","b")])
],[[0,"HTTP kończy się odpowiedzią w 6. sekundzie."],[6,"shareReplay zachowuje wynik zakończonego źródła."],[10,"B dołącza: share uruchamia nowe HTTP, shareReplay odtwarza bufor."],[16,"refCount: true nie usuwa automatycznie wyniku po poprawnym complete."]],"Semantyka RxJS 7.8.2. Domyślny share resetuje po complete; shareReplay ma resetOnComplete=false. To nie jest pełna strategia cache z odświeżaniem.",{metrics:[{label:"HTTP · share",value:t=>(t>=1?1:0)+(t>=10?1:0)},{label:"HTTP · replay",value:t=>t>=1?1:0}]});
const calculations=[2,7,12];
add("21-share-miejsce","Gdzie postawić share?","map(expensive) → share()  /  share() → map(expensive)",19,[
 R("wspólne wejście",calculations.map((t,i)=>E(t,String(i+1),"source"))),
 R("map → share",calculations.map((t,i)=>E(t,String(i+1),"op")),calculations.map(t=>B(t,t+1.5,"1× map","op"))),
 R("share → map · A",calculations.map((t,i)=>E(t,String(i+1),"a")),calculations.map(t=>B(t,t+1.5,"map A","op"))),
 R("share → map · B",calculations.map((t,i)=>E(t,String(i+1),"b")),calculations.map(t=>B(t,t+1.5,"map B","op")))
],[[0,"Dwóch aktywnych odbiorców w obu wariantach."],[2,"Operacja przed share wykonuje się raz na emisję."],[7,"Operacja za share wykonuje się osobno dla każdego odbiorcy."],[14,"Położenie granicy współdzielenia zmienia liczbę obliczeń."]],"Paski czasu przy map są ilustracją kosztu, nie asynchroniczną zmianą semantyki map. Obaj odbiorcy subskrybują przed pierwszą emisją.",{metrics:[{label:"map przed share",value:t=>calculations.filter(at=>at<=t).length},{label:"map za share",value:t=>2*calculations.filter(at=>at<=t).length}]});
add("22-refcount","Wszyscy wyszli. Co dalej?","shareReplay({ bufferSize: 1, refCount: true / false })",23,[
 R("odbiorca A",[E(1,"+","a"),E(6,"−","a")],[B(1,6,"słucha","a","subscription")]),
 R("odbiorca B",[E(2,"+","b"),E(10,"−","b")],[B(2,10,"słucha","b","subscription")]),
 R("refCount: true",[E(3,"0"),E(6,"1"),E(9,"2")],[B(1,10,"źródło działa","b","cancel")]),
 R("refCount: false",[3,6,9,12,15,18,21].map((at,i)=>E(at,String(i))),[B(1,23,"źródło działa","http")])
],[[0,"Źródło jest długotrwałe i nie kończy się samo."],[6,"A odchodzi. B nadal potrzebuje źródła."],[10,"Odchodzi ostatni odbiorca."],[12,"true odłącza źródło. false pozwala mu pracować dalej."],[21,"To inny przypadek niż zakończony request HTTP."]],"Model trwającego źródła z poprawnym teardown. Zera odbiorców nie należy utożsamiać z complete. Dalsze emisje wariantu false nie mają już odbiorców UI.");
add("23-angular-alias","Jeden wynik w kilku miejscach widoku","@if (user$ | async; as user) { … user … user … }",18,[
 R("jeden async",[E(1,"sub","source"),E(6,"user","b")],[B(1,6,"HTTP")],{completeAt:6}),
 R("miejsce w UI · A",[E(6,"user","a")]),
 R("miejsce w UI · B",[E(6,"user","b")]),
 R("miejsce w UI · C",[E(6,"user","c")])
],[[0,"Jedna instancja async odbiera wynik."],[6,"Alias user jest używany w kilku miejscach szablonu."],[10,"Wspólny wynik w jednym widoku można udostępnić bez kolejnych subskrypcji."]],"To alternatywa dla wielu async w jednym zakresie szablonu. Dla niezależnych odbiorców nadal może być potrzebne współdzielenie. user jest w przykładzie obiektem.",{metrics:[{label:"subskrypcje HTTP",value:t=>t>=1?1:0}]});
add("24-signals","A co z signals?","const user = toSignal(user$)",19,[
 R("toSignal",[E(1,"utwórz","source")]),
 R("HTTP",[E(6,"dane","http")],[B(1,6,"request")],{completeAt:6}),
 R("signal",[],[B(1,6,"undefined","muted","state"),B(6,19,"dane","b","state")]),
 R("odczyty user()",[E(8,"dane","b"),E(12,"dane","b"),E(16,"dane","b")])
],[[0,"Tworzymy jeden signal z Observable."],[1,"toSignal subskrybuje od razu."],[6,"Signal przechowuje aktualną wartość."],[12,"Kolejne odczyty tego samego signala nie tworzą kolejnych subskrypcji."],[17,"RxJS steruje pracą. Signal udostępnia aktualny stan."]],"Twórz toSignal raz i używaj wyniku. Przykład bez initialValue, więc przed pierwszą emisją jest undefined. Domyślne sprzątanie subskrypcji wiąże się z kontekstem zniszczenia.",{metrics:[{label:"requesty",value:t=>t>=1?1:0},{label:"odczyty signala",value:t=>[8,12,16].filter(at=>at<=t).length}]});
cards("25-podsumowanie","Cztery pytania przed kolejnym pipe",["Czy trzeba?","Kiedy zacząć?","Co z poprzednią pracą?","Czy można współdzielić?"],[[0,""],[3,"distinctUntilChanged"],[6,"debounceTime / auditTime"],[8,"concatMap / mergeMap / switchMap / exhaustMap"],[11,"share / shareReplay"]],"Zakończ pytaniami, które publiczność może zastosować we własnym kodzie. Przywróć tytułową analogię znajomości operatorów.",16);
// Lifecycle-focused diagrams: variants share the same playback clock.
const revise=(id,extra)=>Object.assign(D.find(s=>s.id===id),extra);
const subRows=(shared)=>[
 R(shared?"wspólne HTTP":"HTTP A",[E(7,"user","a")],[B(1,7,"HTTP","http")],{completeAt:7}),
 shared?R("bez drugiego HTTP"):R("HTTP B",[E(7,"user","b")],[B(1,7,"HTTP","http")],{completeAt:7}),
 R("imię | async",[E(7,"user","a")],[B(1,7,"subskrypcja","a","subscription")],{completeAt:7}),
 R("avatar | async",[E(7,"user","b")],[B(1,7,"subskrypcja","b","subscription")],{completeAt:7})
];
revise("18-async",{
 diagram:"async",title:"Jeden user$. Dwie instancje async.",rows:subRows(false),
 captions:[[0,"Oba miejsca w szablonie korzystają z tego samego user$."],[1,"Każdy async subskrybuje. Bez współdzielenia startują dwa HTTP."],[7,"Oba requesty zwracają dane użytkownika."]],
 notes:"AsyncPipe subskrybuje i sprząta własną subskrypcję; nie dodaje share ani shareReplay. Pokazujemy dwie niezależne instancje pipe, np. (user$ | async)?.name i (user$ | async)?.avatar. Obie subskrybują przed odpowiedzią HTTP. share musi być zastosowany raz do wspólnej instancji user$. Jeden async z aliasem user w szablonie to inny, także przydatny sposób udostępnienia wyniku.",
 variants:{
 without:{rows:subRows(false),code:"user$ = http.get('/api/user')",captions:[[0,"imię | async oraz avatar | async — dwie instancje pipe."],[1,"Dwie strzałki subscribe → dwa wykonania HTTP."],[7,"Ten sam adres API został wywołany dwa razy."]],metrics:[{label:"requesty HTTP",value:t=>t>=1?2:0}]},
 shared:{rows:subRows(true),code:"user$ = http.get('/api/user').pipe(share())",captions:[[0,"Oba async używają tej samej instancji user$ z share()."],[1,"Dwie subskrypcje → jedno wspólne wykonanie HTTP."],[7,"Jedna odpowiedź trafia do obu miejsc w widoku."]],metrics:[{label:"requesty HTTP",value:t=>t>=1?1:0}]}
 }
});
const coldRows=[
 R("timer A",[1,4,7,10,13,16,19].map((at,i)=>E(at,String(i),"a")),[B(0,30,"timer A","a")]),
 R("timer B",[7,10,13,16,19].map((at,i)=>E(at,String(i),"b")),[B(6,30,"timer B","b")]),
 R("A",[1,4,7,10,13,16,19].map((at,i)=>E(at,String(i),"a")),[B(0,30,"sub A","a","subscription")]),
 R("B",[7,10,13,16,19].map((at,i)=>E(at,String(i),"b")),[B(6,30,"sub B","b","subscription")])
];
const hotRows=[
 R("wspólny timer",[1,4,7,10,13,16,19].map((at,i)=>E(at,String(i),"source")),[B(0,30,"producent","source")]),
 R("bez drugiego timera"),
 R("A",[1,4,7,10,13,16,19].map((at,i)=>E(at,String(i),"a")),[B(0,30,"sub A","a","subscription")]),
 R("B",[7,10,13,16,19].map((at,i)=>E(at,String(i+2),"b")),[B(6,30,"sub B","b","subscription")])
];
add("06a-cold-hot","Cold vs hot — skąd B zaczyna liczyć?","cold: własny timer przy subscribe",22,coldRows,[[0,"A słucha od początku. B dołączy później."],[6,"B dołącza. Cold: powstaje jego własny timer."],[7,"B zaczyna od 0. Timer A jest już przy 2."],[19,"Cold: każde subscribe tworzy własnego producenta."]],"Cold: każdy odbiorca uruchamia własny timer; A subskrybuje w 0 s, B w 6 s, pierwszy tick następuje po 1 s. Hot: jeden timer powstaje niezależnie od odbiorców i nadaje przez zwykły Subject. B subskrybuje w 6 s, więc odbiera 2 w 7 s. Nie odtwarzamy wcześniejszych wartości i nie utożsamiamy hot z replay.",{
 diagram:"coldhot",compareLabels:["Cold","Hot"],
 variants:{
  without:{rows:coldRows,code:"cold: timer(1000, 3000) dla każdej subskrypcji",captions:[[0,"A subskrybuje. Jego timer zaczyna liczyć."],[6,"B subskrybuje — powstaje drugi timer."],[7,"A dostaje 2, a B swoje pierwsze 0."],[19,"Każdy odbiorca ma własne wykonanie."]],metrics:[{label:"producenci",value:t=>1+(t>=6?1:0)}]},
  shared:{rows:hotRows,code:"hot: jeden timer → Subject → A i B",captions:[[0,"Jeden producent nadaje przez Subject."],[6,"B dołącza do istniejącego strumienia."],[7,"A i B dostają 2. B nie otrzymuje wcześniejszych 0 i 1."],[19,"Wspólny producent. Bez odtwarzania historii."]],metrics:[{label:"producenci",value:t=>1}]}
 }
});
const completeVariant=mode=>{
 const jobs=mode==="concatMap"?[{at:1,start:1,end:7,value:"A",color:"a"},{at:4,start:7,end:13,value:"B",color:"b"}]:[{at:1,start:1,end:4,value:"A",color:"a",cancelled:true},{at:4,start:4,end:10,value:"B",color:"b"}];
 const out=jobs.flatMap(j=>[1.5,3.5,5.5].filter(d=>j.start+d<j.end).map((d,i)=>E(j.start+d,j.value+(i+1),j.color))).sort((a,b)=>a.at-b.at);
 const end=mode==="concatMap"?13:10;
 const rows=[R("source$",[E(1,"A"),E(4,"B","b")],[],{completeAt:5})];
 jobs.forEach(j=>rows.push(R(j.value+"$",out.filter(e=>e.value.startsWith(j.value)),[...(j.start>j.at?[B(j.at,j.start,"czeka","muted","queue")]:[]),B(j.start,j.end,j.value+"$",j.color,j.cancelled?"cancel":"work")],{completeAt:j.cancelled?undefined:j.end})));
 rows.push(R("wynik",out,[],{completeAt:end}));
 return {jobs,rows,operatorName:mode,outerCompleteAt:5,code:"source$.pipe("+mode+"(makeInner$))",captions:[[0,"source$ wyemituje A i B, a potem complete."],[4,mode==="concatMap"?"B czeka jako wartość w kolejce.":"B przerywa A i rozpoczyna własne wykonanie."],[5,"source$: complete. Wynik nadal czeka na pracę wewnętrzną."],[7,mode==="concatMap"?"A skończone. Mimo complete źródła uruchamia się B$.":"B$ nadal pracuje po complete źródła."],[end,"Ostatnia praca zakończona → dopiero teraz wynik: complete."]],metrics:[{label:"source$",value:t=>t>=5?"complete":"aktywny"},{label:"wynik",value:t=>t>=end?"complete":"aktywny"}]};
};
const cv=completeVariant("concatMap");
add("12a-complete","source$: complete. Czy wynik też kończy? ",cv.code,18,cv.rows,cv.captions,"Complete źródła zewnętrznego nie odsubskrybowuje automatycznie aktywnego inner. concatMap obsługuje jeszcze wartości w kolejce i czeka na wszystkie inner; switchMap czeka na aktualny inner. Gdy inner nigdy się nie kończy, wynik może nadal nie emitować complete. Nie należy mylić complete źródła z unsubscribe całego potoku.",{...cv,compareLabels:["concatMap","switchMap"],variants:{without:cv,shared:completeVariant("switchMap")}});
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
const placement=D.find(s=>s.id==="21-share-miejsce");
D.push({...placement,id:"21a-share-pozycja",title:"Czy expensive jest przed share?",diagram:"placement"});
const costIn=[E(3,"A"),E(8,"B","b"),E(13,"C","c")];
const costRows=shared=>[
 R("Subject",costIn),
 R("map A",costIn,costIn.map(e=>B(e.at,e.at+.9,"koszt","op"))),
 shared?R("bez drugiego map"):R("map B",costIn,costIn.map(e=>B(e.at,e.at+.9,"koszt","op"))),
 R("odbiorca A",costIn),R("odbiorca B",costIn)
];
revise("21-share-miejsce",{
 diagram:"expensive",title:"map(expensive) — raz czy dla każdego?",rows:costRows(false),duration:19,
 notes:"Źródłem jest jeden Subject. Dwóch odbiorców subskrybuje przed pierwszą emisją. Bez share mają dwa wykonania map(expensive) na każde next. share umieszczone za map współdzieli także kosztowne obliczenie i przekazuje ten sam wynik obu odbiorcom. Podświetlenie przez 0,9 s symbolizuje koszt, nie opóźnienie map. Callback map pozostaje synchroniczny.",
 variants:{
 without:{rows:costRows(false),code:"subject$.pipe(map(expensive))",captions:[[0,"Dwa subscribe. Dwa osobne wykonania map."],[3,"Jedno A → expensive(A) liczone dwa razy."],[8,"B ponownie uruchamia oba map."],[13,"Trzy emisje × dwóch odbiorców = sześć obliczeń."]],metrics:[{label:"wywołania expensive",value:t=>2*costIn.filter(e=>e.at<=t).length}]},
 shared:{rows:costRows(true),code:"subject$.pipe(map(expensive), share())",captions:[[0,"Współdzielimy potok za map(expensive)."],[3,"expensive(A) liczone raz. Ten sam wynik trafia do A i B."],[8,"Kolejna emisja → jedno obliczenie dla obu odbiorców."],[13,"Trzy emisje = trzy obliczenia."]],metrics:[{label:"wywołania expensive",value:t=>costIn.filter(e=>e.at<=t).length}]}
 }
});
const leakEvents=[3,6,9,12,15,18,21].map((at,i)=>E(at,String(i),"source"));
const leakRows=ref=>[
 R("interval",leakEvents.filter(e=>!ref||e.at<10),[B(1,ref?10:30,"działa","source",ref?"cancel":"work")]),
 R("A",leakEvents.filter(e=>e.at<7),[B(1,7,"widok A","a","subscription")]),
 R("B",leakEvents.filter(e=>e.at<10),[B(2,10,"widok B","b","subscription")])
];
revise("22-refcount",{
 diagram:"refcount",title:"Widok zniknął. Dlaczego timer nadal działa?",rows:leakRows(false),compareLabels:["refCount: false","refCount: true"],
 notes:"Przykład interval, które nie kończy się samo, z poprawnym teardown. A znika w 7 s, B w 10 s; oba async odsubskrybowują. Przy refCount:false shareReplay nadal utrzymuje subskrypcję źródła, więc timer pracuje bez odbiorców. To ryzyko niechcianego zatrzymania zasobów i wycieku, a nie dowód liniowego wzrostu pamięci: bufferSize wynosi 1. Przy true ostatnie unsubscribe rozłącza źródło. Skończone HTTP i jego cache to inna sytuacja.",
 variants:{
 without:{rows:leakRows(false),code:"interval(3000).pipe(shareReplay({bufferSize: 1, refCount: false}))",captions:[[0,"Długotrwałe źródło. Dwa widoki używają async."],[7,"Widok A znika i odsubskrybowuje."],[10,"Ostatni widok znika. Odbiorców: 0."],[12,"Timer nadal emituje — nikt nie potrzebuje tych wartości."],[18,"Pozostawiona subskrypcja trzyma zasoby. Potencjalny wyciek."]],metrics:[{label:"odbiorcy",value:t=>(t>=1&&t<7?1:0)+(t>=2&&t<10?1:0)},{label:"emisje bez odbiorców",value:t=>leakEvents.filter(e=>e.at>=10&&e.at<=t).length}]},
 shared:{rows:leakRows(true),code:"interval(3000).pipe(shareReplay({bufferSize: 1, refCount: true}))",captions:[[0,"Źródło pracuje, dopóki ktoś potrzebuje wyniku."],[7,"A znika. B nadal słucha."],[10,"B znika. Ostatnie unsubscribe odłącza źródło."],[12,"Timer zatrzymany. Nie ma dalszej pracy."]],metrics:[{label:"odbiorcy",value:t=>(t>=1&&t<7?1:0)+(t>=2&&t<10?1:0)},{label:"emisje bez odbiorców",value:t=>0}]}
 }
});
revise("11-switchmap",{
 captions:[[0,"A$ powstanie dopiero po pierwszej emisji source$."],[1,"A$ zaczyna pracować."],[2.5,"Pierwsza wartość A1 trafia do wyniku."],[4,"Nowe B: unsubscribe A$ → subscribe B$."],[5.5,"Teraz wartości emituje B$. A$ już nie pracuje."],[7.2,"Nowe C przerywa B$ i uruchamia C$."],[13.2,"C$ kończy się. Przerwane A$ i B$ nie wracają."]],
 notes:"Projection switchMap jest wywoływana po emisji source$. Każda nowa wartość najpierw odsubskrybowuje poprzedni inner, a potem uruchamia nowy. W naszym źródle teardown zatrzymuje emisje. Unsubscribe HTTP może anulować żądanie po stronie klienta, ale nie cofa wykonanych już zmian na serwerze."
});
for(const scene of D)if(scene.variants)Object.assign(scene,scene.variants.without);
for(const [id,after] of [["06a-cold-hot","06-subskrypcja"],["12a-complete","12-exhaustmap"],["21a-share-pozycja","21-share-miejsce"]]){
 const item=D.splice(D.findIndex(s=>s.id===id),1)[0];
 D.splice(D.findIndex(s=>s.id===after)+1,0,item);
}
const bonus={group:"bonus"};
add("b01-defer","Kiedy odczytujesz wartość?","of(token) vs defer(() => of(token))",19,[
 R("zmienna token",[E(1,"A"),E(9,"B","b")]),
 R("budowanie of",[E(2,"of(A)","op")]),
 R("budowanie defer",[E(2,"fabryka","op")]),
 R("of(token)",[E(12,"A")],[B(2,12,"przechowane A","muted","state")]),
 R("defer(...)",[E(12,"B","b")],[B(12,15,"fabryka przy sub","b","state")])
],[[0,"token ma początkowo wartość A."],[2,"of(token) przechwytuje argument teraz; defer zachowuje fabrykę."],[9,"token zmienia się na B."],[12,"Subskrybujemy oba: of emituje A, defer odczytuje B."]],"defer jest funkcją tworzącą Observable. Każda subskrypcja wywołuje fabrykę. Przykład izoluje czas odczytu zmiennej, nie czas odpowiedzi HTTP.",bonus);
add("b02-first-take","first() i take(1) — to samo?","wariant z wartością oraz źródło EMPTY",20,[
 R("take(1) · wartość",[E(3,"A")],[],{completeAt:3}),
 R("first() · wartość",[E(3,"A")],[],{completeAt:3}),
 R("take(1) · pusto",[],[],{completeAt:11}),
 R("first() · pusto",[E(11,"EmptyError","error","error")])
],[[0,"Najpierw źródło emituje wartość."],[3,"Oba przekazują A i kończą wynik."],[9,"Teraz osobny przykład: źródło kończy się bez wartości."],[11,"take(1): complete. first(): EmptyError."]],"first bez wartości domyślnej. Gdy źródło milczy i nie kończy się, oba czekają. null jest wartością. Wiersze są niezależnymi przykładami.",bonus);
const batchInput=[E(2,"A"),E(3,"B"),E(5,"C"),E(9,"D","b"),E(10,"E","b"),E(17,"F","c")];
add("b03-buffertime","Potrzebuję wszystkich zdarzeń — w paczkach","bufferTime(6000) → filter(xs => xs.length > 0) → HTTP",24,[
 R("zdarzenia",batchInput),
 R("bufferTime",[E(6,"ABC"),E(12,"DE","b"),E(18,"F","c")],[B(0,6,"paczka 1","muted","window"),B(6,12,"paczka 2","muted","window"),B(12,18,"paczka 3","muted","window")]),
 R("HTTP · paczki",[E(8.5,"✓","a"),E(14.5,"✓","b"),E(20.5,"✓","c")],[B(6.5,8.5,"ABC"),B(12.5,14.5,"DE"),B(18.5,20.5,"F")])
],[[0,"API w tym przykładzie przyjmuje paczki zdarzeń."],[6,"Pierwsze trzy wartości trafiają do jednego requestu."],[12,"Druga paczka zachowuje D i E."],[21,"6 zdarzeń, 3 requesty. Żadne zdarzenie nie zostało pominięte."]],"Zwykłe nienakładające się okna bufferTime. Odfiltruj puste paczki. Potrzebny jest endpoint obsługujący paczki; trzeba osobno zaprojektować błędy i powtórki.",{...bonus,metrics:[{label:"zdarzenia",value:t=>count(batchInput,t)},{label:"requesty zbiorcze",value:t=>[6.5,12.5,18.5].filter(at=>at<=t).length}]});
add("b04-catcherror","Jeden błąd. Czy następny klik zadziała?","catchError wewnątrz vs za switchMap",22,[
 R("zapytania",[E(2,"A"),E(8,"B","b"),E(14,"C","c")]),
 R("catch na zewnątrz",[E(4.5,"[]","muted")],[B(2,4,"HTTP A","error","error")],{completeAt:5}),
 R("catch wewnątrz",[E(4.5,"[]","muted"),E(10,"B","b"),E(16,"C","c")],[B(2,4,"HTTP A","error","error"),B(8,10,"HTTP B","b"),B(14,16,"HTTP C","c")])
],[[0,"Obsługa błędu zwraca of([]) w obu wariantach."],[4,"Pierwszy request kończy się błędem."],[5,"Catch za switchMap zastępuje cały potok i kończy go po []."],[8,"Catch wewnątrz pozwala nadal słuchać zapytań."],[16,"B i C działają w wariancie obsługującym błąd pojedynczego requestu."]],"Oba warianty zwracają of([]), które emituje i kończy się. Catch wewnątrz dotyczy błędu inner Observable. Nie sugeruj, że każdy zewnętrzny catchError zawsze kończy wynik.",bonus);
add("b05-finalize","Sprzątanie także po odsubskrybowaniu","request$.pipe(finalize(cleanup))",22,[
 R("complete",[E(6,"cleanup","b")],[B(1,6,"request","b")],{completeAt:6}),
 R("error",[E(12,"cleanup","b")],[B(7,12,"request","error","error")]),
 R("unsubscribe",[E(18,"cleanup","b")],[B(13,18,"request","http","cancel")])
],[[0,"Trzy niezależne operacje z finalize(cleanup)."],[6,"Complete → finalize."],[12,"Error → finalize."],[18,"Odsubskrybowanie → finalize, mimo braku complete."]],"finalize sprząta dany zakres subskrypcji. Przy wielu równoległych requestach jedna wspólna flaga loading może wymagać licznika.",bonus);
add("b06-forkjoin","Czekam na komplet zakończonych żądań","forkJoin({ user: user$, roles: roles$, settings: settings$ })",20,[
 R("user$",[E(6,"U","a")],[B(1,6,"HTTP","a")],{completeAt:6}),
 R("roles$",[E(12,"R","b")],[B(1,12,"HTTP","b")],{completeAt:12}),
 R("settings$",[E(9,"S","c")],[B(1,9,"HTTP","c")],{completeAt:9}),
 R("forkJoin",[E(12,"U/R/S","op")],[],{completeAt:12})
],[[0,"Trzy niezależne żądania startują razem."],[6,"Pierwszy wynik już jest, ale forkJoin nadal czeka."],[12,"Wszystkie wyemitowały i zakończyły się — jeden wspólny wynik."],[16,"Trwające bez końca źródło nie pozwoli zebrać takiego kompletu."]],"Każde wejście musi wyemitować co najmniej raz i poprawnie się zakończyć. W RxJS 7.8.2 wejście kończące się bez wartości daje zakończenie bez wyniku. Błąd przerywa całość.",bonus);
add("b07-zip","Pierwsze z pierwszym. Drugie z drugim.","zip(fast$, slow$)",20,[
 R("fast$",[E(1,"A1"),E(2.5,"A2"),E(4,"A3")]),
 R("slow$",[E(7,"B1","b"),E(11,"B2","b"),E(15,"B3","b")]),
 R("zip",[E(7,"A1/B1","op"),E(11,"A2/B2","op"),E(15,"A3/B3","op")])
],[[0,"Zip dopasowuje indeks emisji, a nie identyfikator obiektu."],[4,"Szybkie źródło ma już trzy wartości w buforze."],[7,"Pierwsza wartość z drugiego źródła tworzy pierwszą parę."],[15,"Każda wartość zostaje użyta w odpowiadającej jej parze."]],"Przy nierównym tempie źródeł bufor może rosnąć. Źródła są tu skończonymi przykładami zdarzeń, a ich complete pominięto dla czytelności.",{...bonus,metrics:[{label:"czeka w fast$",value:t=>[1,2.5,4].filter(at=>at<=t).length-[7,11,15].filter(at=>at<=t).length}]});
add("b08-merge","Kilka powodów do odświeżenia","merge(button$, timer$, saved$)",19,[
 R("przycisk",[E(2,"klik","a"),E(13,"klik","a")]),
 R("timer",[E(6,"tick","b")]),
 R("zapis",[E(10,"saved","c")]),
 R("merge",[E(2,"klik","a"),E(6,"tick","b"),E(10,"saved","c"),E(13,"klik","a")])
],[[0,"Kilka źródeł może wyzwalać ten sam proces."],[6,"Merge przekazuje zdarzenia w chwili ich nadejścia."],[14,"Nie tworzy par ani zestawu najnowszych wartości."]],"merge łączy emisje istniejących strumieni. mergeMap dodatkowo mapuje wartości na strumienie wewnętrzne. W przykładzie źródła nie kończą się podczas animacji.",bonus);
add("b09-pairwise","Co zmieniło się od poprzedniej wartości?","position$.pipe(pairwise())",20,[
 R("pozycja",[E(2,"10"),E(6,"15"),E(10,"12"),E(14,"20")]),
 R("pairwise",[E(6,"10→15","op"),E(10,"15→12","op"),E(14,"12→20","op")]),
 R("różnica",[E(6,"+5","b"),E(10,"−3","c"),E(14,"+8","b")])
],[[0,"Pierwsza wartość zostaje zapamiętana."],[6,"Pierwsza para powstaje dopiero przy drugiej emisji."],[10,"Z pary można wyliczyć kierunek i wielkość zmiany."],[15,"Bez ręcznego przechowywania previousValue poza potokiem."]],"pairwise emituje nakładające się pary kolejnych wartości. Przy obiektach mutowanych w miejscu nadal trzeba uważać na współdzielone referencje.",bonus);
configureReferences(D);
D.push(...resolverScenes());
D.forEach(scene=>{
 scene.playback ||= {entry:'auto',finish:'loop'};
 const points=new Set([0,scene.duration]);
 (scene.captions||[]).forEach(c=>points.add(c[0]));
 if(scene.kind==="cards")scene.items.forEach(item=>points.add(Math.min(scene.duration,item.at+.5)));
 else scene.rows.forEach(row=>{row.events.forEach(e=>points.add(Math.min(scene.duration,e.at+.2)));row.spans.forEach(s=>points.add(Math.min(scene.duration,s.end+.2)));});
 scene.checkpoints=[...points].filter(v=>Number.isFinite(v)&&v>=0&&v<=scene.duration).sort((a,b)=>a-b).filter((v,i,a)=>i===0||v-a[i-1]>.45);
 if(scene.checkpoints[scene.checkpoints.length-1]!==scene.duration)scene.checkpoints.push(scene.duration);
 if(scene.id==="04-operator")scene.checkpoints=scene.steps;
});
export { D as scenes };

import { planResolver, planEnrichment } from './resolver.js';

const E=(at,value,color='a')=>({at,value,color,kind:'value'});
const R=(label,events=[],spans=[],extra={})=>({label,events,spans,...extra});
const node=(id,x,y,label,extra={})=>({id,x,y,label,w:230,h:64,ready:true,...extra});
const manual=stops=>({entry:'manual',stops,finish:'hold',afterLastManualStop:'start-auto'});
const base=(id,title,code,rows,captions,graph,playback,duration)=>({id,title,code,rows,captions,graph,playback,duration,group:'main',checkpoints:[],notes:''});

export function resolverScenes() {
  const enrichment=planEnrichment(),plan=planResolver();
  const problem=base('26-resolver-problem','100 elementów. Skąd wziąć ownerFullName?',
    "items.forEach(item => getOrEnqueue(item.ownerId))",[
      R('HTTP', [E(1,'100 items')],[{start:.3,end:1,kind:'work'}],{completeAt:1}),
    ],[[0,'GET /api/items dostarcza ownerId, ale bez ownerFullName.'],[1,'forEach pyta resolver. Cache hit daje wynik; miss trafia do pending.'],[3,'Wiele elementów może potrzebować tego samego ownerId.']],
    {layout:'fixed',width:1240,height:340,nodes:[node('items',130,170,'GET /api/items',{ri:0,work:true}),node('each',455,170,'getOrEnqueue'),
      node('cache',790,65,'cache hit: X'),node('pending',790,250,'pending: A, B, C'),node('store',1100,65,'store')],
      edges:[{from:'items',to:'each',events:[E(1,'100 items')]},{from:'each',to:'cache',events:[E(1,'X')]},
        {from:'each',to:'pending',events:[E(1,'A'),E(1,'B'),E(1,'A'),E(1,'C')]},{from:'cache',to:'store',events:[E(1,'summary X')]}],
      trays:[],timeline:enrichment.events.filter(e=>e.type.startsWith('cache'))},
    manual([{id:'items',event:{type:'deliver-next',edge:'items-each'},caption:'100 elementów, brak pełnych nazw właścicieli. Jak uniknąć 100 HTTP?'}]),4);

  // Harmonogram ma fazy prezentacji przy jednym modelowym t=1.
  const micro=base('27-resolver-microtask','Jedna pętla, jeden microtask',
    'getOrEnqueue(id) → Promise.resolve().then(flushQueue)',[],[[0,'Pierwszy brakujący ownerId planuje jeden microtask.'],[2,'A, B, A, C trafiają synchronicznie do pending.'],
      [5,'Bieżący kod synchroniczny dobiegł końca. Teraz uruchamia się microtask.'],[7,'resolveMany dostaje unikalne A, B, C. Fizyczny HTTP ma osobny bufor.']],
    {layout:'fixed',width:1240,height:340,nodes:[node('items',150,155,'items.forEach'),node('pending',530,155,'pending Set'),
      node('microtask',940,155,'microtask → resolveMany',{w:360})],
      edges:[{from:'items',to:'pending'},{from:'pending',to:'microtask'}],trays:[{anchor:'pending',x:530,y:260,w:320,deduplicate:true}],
      schedule:{'items-pending':{start:.2,end:null,events:['A','B','A','C'].map((value,i)=>({at:1+i*.7,arrival:1.6+i*.7,value,logicalAt:1}))},
        'pending-microtask':{start:.2,end:null,events:[{at:5,arrival:6,value:'A,B,C',logicalAt:1}]}},
      timeline:[{type:'microtask-schedule',at:1,node:'microtask',caption:'Pierwszy miss: planujemy microtask. Pętla nadal działa.'},
        {type:'sync-end',at:4,node:'items'},{type:'microtask-flush',at:5,node:'microtask',value:enrichment.ids.join(',')}],
      queue:t=>t<1?'pending: []':t<1.7?'pending: [A]':t<3.1?'pending: [A, B]':t<5?'pending: [A, B, C]':'pending opróżnione → resolveMany([A, B, C])'},
    manual([{id:'scheduled',time:1.6,caption:'Jeden microtask jest zaplanowany. Pętla nadal dopisuje ID.'},
      {id:'question',time:4,caption:'Koniec kodu synchronicznego; pending: A, B, C. Kiedy wykona się flush?'}]),8);
  micro.metrics=[{label:'microtaski',value:t=>t>=1?enrichment.microtasks:0}];

  const batch=plan.batches[0];
  const rows=[R('requestSubject'),R('buffer',[],[{start:0,end:.25,kind:'window'}]),
    R('HTTP',[E(batch.end,'A…E')],[{start:batch.at,end:batch.end,kind:'work'}],{completeAt:batch.end}),
    ...plan.results.map(r=>R('forkJoin '+r.index,[E(r.at,r.ids.join(','))],[],{completeAt:r.at}))];
  const global=base('28-resolver-batch','Wspólna kolejka HTTP, własny komplet wyników',
    'bufferTime(250, null, maxBatchSize) → dedupe → mergeMap(httpFetch)',rows,
    [[0,'Długowieczna subskrypcja otwiera okno 250 ms. maxBatchSize = 10.'],[.05,'resolveMany([A,B,C]) zgłasza pierwsze ID.'],
      [.09,'resolveMany([C,D,E]) dołącza do C w in-flight. D i E trafiają do kolejki.'],[.25,'Koniec okna: A, B, C, D, E tworzą jeden fizyczny HTTP.'],
      [.65,'Wyniki wracają do resolve(id). Każdy forkJoin otrzymuje swój komplet.'],[1,'Mapy wyników uzupełniają store; widoki reagują.']],
    {layout:'fixed',width:1240,height:360,
      nodes:[node('call0',130,55,'resolveMany A,B,C',{w:245}),node('call1',130,270,'resolveMany C,D,E',{w:245}),
        node('resolve',425,170,'cache / in-flight',{w:245}),node('buffer',730,170,'bufferTime 250 ms',{w:245,ri:1}),
        node('http',1050,170,'HTTP batch',{ri:2,work:true}),node('result0',730,40,'forkJoin → Map A,B,C',{w:300,ri:3}),
        node('result1',730,280,'forkJoin → Map C,D,E',{w:300,ri:4})],
      edges:[{from:'call0',to:'resolve',events:[E(.05,'A,B,C')]},{from:'call1',to:'resolve',events:[E(.09,'C,D,E')]},
        {from:'resolve',to:'buffer',events:plan.events.filter(e=>e.type==='queue-add').map(e=>E(e.at,e.value))},
        {from:'buffer',to:'http',events:[E(.25,'A…E')],fixedStart:true,logicalStart:0,logicalEnd:{at:1.1,kind:'unsubscribe'}},
        {from:'http',to:'result0',events:rows[3].events,gateWork:true,points:[[1165,170],[1200,170],[1200,40],[880,40]]},
        {from:'http',to:'result1',events:rows[4].events,gateWork:true,points:[[1165,170],[1200,170],[1200,280],[880,280]]}],
      trays:[],timeline:plan.events.filter(e=>['buffer-open','buffer-close','flush','cache-hit','cache-miss','in-flight-hit','store-update','inner-unsubscribe'].includes(e.type)),
    },manual([{id:'question',modelTime:.09,caption:'Dwa resolveMany; C współdzielone przez in-flight. Czy microtask wysłał już HTTP?'}]),1.2);
  global.metrics=[{label:'fizyczne HTTP',value:t=>plan.batches.filter(b=>b.at<=t).length},{label:'komplety w store',value:t=>plan.results.filter(r=>r.at<=t).length}];
  return [problem,micro,global];
}

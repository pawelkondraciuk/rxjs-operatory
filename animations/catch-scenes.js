// Dwa zakresy catchError; dane dla wspólnego kompilatora i renderera.
const next=(at,value,color='a')=>({at,value,color,kind:'value'});
const row=(label,events=[],spans=[],extra={})=>({label,events,spans,...extra});

export function configureCatch(scene) {
  const inside=scene.catchInside;
  const fallback=next(4.5,'[]','op'),response=next(10,'B','b');
  const input=[next(2,'A'),next(8,'B','b')];
  const failure={at:4,value:'error',color:'error',kind:'error'};
  scene.rows=[
    row('klik$',input),
    row('HTTP A',[failure],[{start:2,end:4,label:'HTTP A',kind:'error',color:'http'}]),
    row('po catchError A',[fallback],[],{completeAt:5}),
    row('HTTP B',[response],[{start:8,end:10,label:'HTTP B',kind:'work',color:'http'}],{completeAt:10}),
    row('po catchError B',[response],[],{completeAt:10}),
    row('wynik',inside?[fallback,response]:[fallback],[],inside?{}:{completeAt:5}),
  ];
  scene.duration=12;
  scene.checkpoints=[0,2,4,4.5,5,8,10,12];
  scene.title=inside?'catchError wewnątrz':'catchError na zewnątrz';
  scene.code=inside?'klik$.pipe(switchMap(() => http$.pipe(catchError(() => of([])))))':
    'klik$.pipe(switchMap(() => http$), catchError(() => of([])))';
  scene.graph=catchGraph;
  scene.captions=[
    [0,inside?'Każde HTTP ma własny catchError.':'catchError obejmuje cały potok za switchMap.'],
    [2,'Klik A tworzy pierwszą subskrypcję zimnego HTTP.'],
    [4,inside?'HTTP A: error. Obsługujemy błąd tylko tej pracy.':'HTTP A: error. Błąd dociera przez switchMap do catchError.'],
    [4.5,'catchError subskrybuje of([]). Odbiorca otrzymuje pustą tablicę.'],
    [5,inside?'Kończy się tylko inner A. Nadal słuchamy kliknięć.':'of([]) kończy się. Cały wynik: complete; klik$ jest odłączony.'],
    [8,inside?'Klik B uruchamia HTTP B. Potok nadal działa.':'Klik B nadal występuje, ale odłączony potok nie uruchamia HTTP B.'],
    [10,inside?'HTTP B daje wynik B. Odbiorca nadal czeka na kolejne kliknięcia.':'Wynik pozostaje zakończony po []. Kolejne kliknięcia nie uruchamiają HTTP.'],
  ];
  scene.metrics=[{label:'requesty HTTP',value:t=>Number(t>=2)+Number(inside&&t>=8)}];
  scene.playback={entry:'manual',finish:'hold',afterLastManualStop:'start-auto',stops:[
    {id:'first',event:{type:'inner-subscribe',node:'http-a'},offset:.05,caption:'HTTP A pracuje. Zwróć uwagę, gdzie znajduje się catchError.'},
    {id:'error',modelTime:4,caption:inside?'Błąd pozostaje w inner A. catchError zastąpi go przez of([]).':'Błąd przeszedł przez switchMap. catchError zastąpi cały potok przez of([]).'},
    {id:'question',modelTime:5,caption:inside?'Odbiorca dostał []. Zakończył się tylko inner A. Co zrobi klik B?':'Odbiorca dostał [] i complete. Co zrobi klik B?'},
  ]};
}

function catchGraph(scene) {
  const inside=scene.catchInside,top=60,opX=430;
  const nodes=[
    {id:'clicks',x:115,y:top,w:200,h:68,label:'klik$',ri:0,color:'source',ready:true,
      detail:t=>!inside&&t>=8?'B: brak subskrypcji':'np. przycisk'},
    {id:'switch',x:opX,y:top,w:230,h:68,label:'switchMap',color:'op',ready:true,
      lifecycleRow:inside?undefined:row('switchMap',[{at:4,value:'error',kind:'error'}]),
      detail:t=>t>=5?(inside?'słucha kliknięć':'odłączony od klik$'):undefined},
    {id:'observer',x:1110,y:top,w:240,h:108,label:'Odbiorca',labelOffset:-20,ri:5,ready:true,
      detail:t=>inside&&t>=5?'nadal subskrybuje':undefined},
  ];
  const edges=[{from:'clicks',to:'switch',events:inside?scene.rows[0].events:[scene.rows[0].events[0]],
    logicalStart:0,logicalEnd:inside?null:{at:4,kind:'unsubscribe'}}];
  const trays=[{anchor:'observer',x:1110,y:85,w:210}];
  const panel={x:290,y:157,w:680,h:225,label:inside?'PRACE WEWNĘTRZNE · catchError w każdym HTTP':'PRACA WEWNĘTRZNA · błąd wychodzi do switchMap',from:{x:535,y:94}};
  if(!inside) {
    nodes.push({id:'catch-outer',x:775,y:top,w:230,h:68,label:'catchError',ri:2,color:'op',ready:true,
      detail:t=>t>=4.5?'of([]) · complete':'() => of([])'});
    edges.push({from:'switch',to:'catch-outer',events:[],logicalStart:0,logicalEnd:{at:4,kind:'error'}},
      {from:'catch-outer',to:'observer',events:scene.rows[5].events,logicalStart:0,logicalEnd:{at:5,kind:'complete'}});
  } else edges.push({from:'switch',to:'observer',events:scene.rows[5].events,logicalStart:0,logicalEnd:null});

  for(const [i,letter] of (inside?['A','B']:['A']).entries()) {
    const y=220+i*100,id='http-'+letter.toLowerCase(),start=i?8:2,ri=i?3:1;
    nodes.push({id,x:435,y,w:220,h:58,label:'HTTP '+letter,ri,inner:true,work:true,born:start,
      createdBy:{edge:'clicks-switch',value:letter}});
    if(inside) {
      const caught='catch-'+letter.toLowerCase(),result='result-'+letter.toLowerCase();
      nodes.push({id:caught,x:710,y,w:210,h:58,label:'catchError',ri:ri+1,color:'op',born:start,
        createdBy:{edge:'clicks-switch',value:letter},detail:t=>!i&&t>=4.5?'of([])':'() => of([])'},
        {id:result,x:890,y,w:90,h:58,label:'',ri:ri+1,born:start,createdBy:{edge:'clicks-switch',value:letter}});
      edges.push({from:id,to:caught,events:i?scene.rows[ri].events:[],logicalStart:start,gateWork:true},
        {from:caught,to:result,events:scene.rows[ri+1].events,logicalStart:start,gateWork:true},
        {from:result,to:'switch',events:scene.rows[ri+1].events,logicalStart:start,gateWork:true,internal:true});
      trays.push({anchor:result,x:890,y,w:78});
    } else edges.push({from:id,to:'switch',events:[],logicalStart:start,gateWork:true,
      points:[[325,y],[260,y],[260,115],[opX,115],[opX,94]]});
  }
  return {layout:'fixed',width:1240,height:400,nodes,edges,trays,panels:[panel],
    timeline:inside?[]:[{at:8,type:'source-next',node:'clicks',value:'B'},
      {at:8,type:'ignore-next',node:'switch',value:'B',reason:'no-subscription'}],
    tokens:inside?[]:[{at:8,until:13,modelTime:true,value:'B',color:'b',x:115,y:145,phase:'unobserved'}],
  };
}

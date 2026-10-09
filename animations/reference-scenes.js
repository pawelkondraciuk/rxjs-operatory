// Presety są wyłącznie danymi dla wspólnych Node / Edge / Token / History.
const E=(at,value,color='a')=>({at,value,color,kind:'value'});
const R=(label,events=[],spans=[],extra={})=>({label,events,spans,...extra});
const B=(start,end,label,kind='work',extra={})=>({start,end,label,kind,...extra});
const manual=stops=>({entry:'manual',stops,afterLastManualStop:'start-auto',finish:'hold'});

export function mapGraph(scene) {
  const input=scene.rows[0].events.filter(e=>e.at<18);
  const nodes=[
    {id:'source',x:155,y:150,w:230,h:80,label:'Źródło',ready:true,color:'source'},
    {id:'map',x:590,y:150,w:300,h:80,label:'map(x ⇒ x × 10)',ready:true,color:'op'},
    {id:'observer',x:1080,y:184,w:260,h:148,label:'Odbiorca',labelOffset:-34,ready:true,color:'http'},
  ];
  return {layout:'fixed',width:1240,height:340,nodes,
    edges:[{from:'source',to:'map',points:[[270,150],[440,150]]},{from:'map',to:'observer',points:[[740,150],[950,150]]}],
    trays:[{anchor:'observer',x:1080,y:220,w:240}],
    schedule:{
      'source-map':{start:2.5,connectDuration:1.5,end:{at:19,kind:'unsubscribe',duration:1},events:input.map(e=>({...e,logicalAt:e.at,at:e.at+.35,arrival:e.at+1,phase:'to-map'}))},
      'map-observer':{start:1,connectDuration:1.5,end:{at:18,kind:'unsubscribe',duration:1},events:input.map(e=>({...e,value:String(Number(e.value)*10),at:e.at+1.5,arrival:e.at+2.5,phase:'to-observer',color:'op'}))},
    },
    activities:[...scene.rows[0].events.map(e=>({node:'source',at:e.at,until:e.at+.35})),...input.map(e=>({node:'observer',at:e.at+2.5,until:e.at+3}))],
    transforms:input.map(e=>({node:'map',at:e.at+1,until:e.at+1.5,label:`${e.value} × 10 = ${Number(e.value)*10}`})),
    tokens:[...scene.rows[0].events.map(e=>({...e,until:e.at+(e.at>=18?1.5:.35),x:155,y:80,phase:e.at>=18?'unobserved':'emitting'})),
      ...input.map(e=>({...e,at:e.at+1,until:e.at+1.5,x:590,y:80,phase:'in-map'}))],
  };
}

export function flattenGraph(scene) {
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
    captions:[[0,all?'map tworzy zimne Observable; concatAll subskrybuje po kolei.':'Te same A, B, C, D i czas pracy: 1,2 s od subskrypcji.'],
      [1,'A uruchamia pierwszą pracę.'],[1.45,question],[1.9,all?'B$ i C$ czekają bez pracy HTTP.':mode==='switchMap'?'Unsubscribe przerywa klienta; dopiero potem rusza nowe HTTP.':mode==='exhaustMap'?'B i C pominięte. Ich inner nie powstają.':'Strategia operatora określa kolejkę lub współbieżność.'],
      [2.7,mode==='exhaustMap'?'A$ skończyło się. D może uruchomić nowy inner.':'Wartości z aktywnych inner trafiają do odbiorcy.'],[completed,'Outer i wymagane inner zakończyły się. Wynik: complete.']],
    playback:manual([
      {id:'subscribe',modelTime:.3,caption:'Subskrypcja łączy odbiorcę z operatorem i źródłem.'},
      {id:'first',event:{type:'deliver-next',edge:incoming,value:all?'A$':'A'},caption:all?'map utworzył A$. Teraz concatAll może go subskrybować.':'A dotarło do operatora.'},
      {id:'active',event:{type:'inner-subscribe',node:'inner0'},offset:.05,caption:'Pierwszy inner jest aktywny; jego praca dopiero trwa.'},
      {id:'question',...(all?{modelTime:1.4}:{event:{type:'deliver-next',edge:incoming,value:'B'}}),caption:question},
    ]),metrics:[{label:'uruchomione',value:t=>jobs.filter(j=>!j.ignored&&j.start<=t).length},{label:'aktywne',value:t=>jobs.filter(j=>!j.ignored&&j.start<=t&&t<j.end).length}],
  });
}

export function configureReferences(scenes) {
  const map=scenes.find(s=>s.id==='04-operator');
  map.graph=mapGraph;
  map.playback=manual([{id:'subscribe',time:4},{id:'input',time:6,caption:'1 dotarło do map.'},
    {id:'transform',time:6.25,caption:'1 × 10 = 10. Callback map jest synchroniczny.'},{id:'first',time:7.5,caption:'Odbiorca ma 10. Dalej: automatyczny pokaz 2 i 3.'}]);
  delete map.fragmentSteps;
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
    return {value:r.label,at:Math.min(...r.spans.map(p=>p.start)),start:work.start,end:work.end};
  });
  const end=Math.max(...jobs.map(j=>j.end)),result=scene.rows.flatMap(r=>r.events).sort((a,b)=>a.at-b.at);
  scene.rows=[R('source$',jobs.map(j=>E(j.at,j.value)),[],{completeAt:5}),
    ...scene.rows.map((r,i)=>({...r,completeAt:jobs[i].end})),R('wynik',result,[],{completeAt:end})];
  Object.assign(scene,{jobs,operatorName:'mergeMap · limit 3',outerCompleteAt:5,graph:flattenGraph});
}

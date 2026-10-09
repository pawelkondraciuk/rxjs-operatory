// Adapter danych rows do wspólnego grafu. Nie renderuje ani nie steruje czasem.
export function catalogGraph(s) {
 const W=1240,H=(s.rendererId||s.id)==='13-limit'?420:360,nodes=[],edges=[],trays=[];
 const row=i=>s.rows[i]||{events:[],spans:[],label:""};
 const values=i=>row(i).events.filter(e=>e.kind!=="ignored"&&e.kind!=="error"&&!/^(sub|subscribe|utwórz|A\+|B\+|[+−]$)/i.test(String(e.value)));
 const node=(id,x,y,label,color="op",ri=null,extra={})=>{const n={id,x,y,w:190,h:70,label,color,ri,...extra};nodes.push(n);return n;};
 const edge=(a,b,events=[],extra={})=>edges.push({a,b,events,...extra});
 const tray=(ri,x,y,w=400,label="")=>trays.push({ri,x,y,w,label});
 const caseId=s.rendererId||s.id;
 if(s.diagram==="async"||caseId==="07-hot-cold"||s.diagram==="coldhot"){
  const shared=s.comparisonMode==="shared",coldhot=s.diagram==="coldhot",angular=s.diagram==="async";
  const source=node("observable",550,70,coldhot?(shared?"jeden producent":"timer$"):(angular?"jeden user$":"jeden data$"),"source",null,{w:300});
  source.label=coldhot?(shared?"jeden producent":"timer$"):source.label;
  const jobs=[];
  [0,1].forEach(j=>{
   if(shared&&j===1)return;
   const x=shared?550:j?825:275,ri=j;
   const birth=coldhot?(j?6:0):j?(angular?1:3):1;
   jobs.push(node("work"+j,x,235,coldhot?(shared?"wspólny timer":"timer "+["A","B"][j]):shared?"wspólne HTTP":"HTTP "+["A","B"][j],shared?"http":j?"b":"a",ri,{w:230,work:true,born:birth}));
   edge(source,jobs[j],[],{born:birth});
  });
  const hub=shared?node("hub",550,370,coldhot?"Subject":"share()","op",null,{w:240}):null;
  if(hub&&jobs[0])edge(jobs[0],hub,values(0));
  [2,3].forEach((ri,j)=>{
   const x=j?825:275,start=coldhot?(j?6:0):j?(angular?1:3):1;
   const sink=node("receiver"+j,x,510,angular?["imię | async","avatar | async"][j]:"Odbiorca "+["A","B"][j],j?"b":"a",ri,{w:250,born:start});
   const target=shared?hub:jobs[j];
   edge(target,sink,values(ri),{born:start});
   const targetX=target.x+(j?target.w/2:-target.w/2);
   const side=j?1015:85;
   edge(sink,target,[{at:start,value:"sub",color:j?"b":"a"}],{dashed:true,born:start,label:"subscribe",points:[[x+(j?125:-125),510],[side,510],[side,target.y],[targetX,target.y]]});
   tray(ri,x,615,420,"");
  });
 }else if(s.diagram==="late"){
  const replay=s.comparisonMode==="shared";
  const src=node("observable",550,65,"HTTP Observable","source",null,{w:300});
  const first=node("http1",300,235,"HTTP #1","http",0,{w:240,work:true,born:1});
  edge(src,first,[],{born:1});
  let second=null;
  if(!replay){second=node("http2",800,235,"HTTP #2","http",1,{w:240,work:true,born:10});edge(src,second,[],{born:10});}
  const hub=node("hub",550,385,replay?"shareReplay(1)":"share()","op",null,{w:285,detail:t=>replay&&t>=6?"bufor: dane":t>=6&&t<10?"brak bufora":undefined});
  edge(first,hub,values(0));
  if(second)edge(second,hub,values(1));
  [2,3].forEach((ri,j)=>{
   const start=j?10:1,x=j?850:250;
   const sink=node("receiver"+j,x,510,"Widok "+["A","B"][j],j?"b":"a",ri,{w:230,born:start,disabled:t=>!j&&t>=8,detail:t=>!j&&t>=8?"widok zniknął":undefined});
   edge(hub,sink,values(ri),{born:start,disabled:t=>!j&&t>=8});
   edge(sink,hub,[{at:start,value:"sub",color:j?"b":"a"}],{born:start,dashed:true,until:j?16:8,label:j?"B dołącza":"subscribe",points:[[x+(j?115:-115),510],[j?1040:60,510],[j?1040:60,385],[550+(j?142:-142),385]]});
   tray(ri,x,615,410,"");
  });
 }else if(s.diagram==="expensive"){
  const shared=s.comparisonMode==="shared";
  const source=node("source",550,75,"Subject.next","source",0,{w:280});
  const maps=[];
  [0,1].forEach(j=>{
   if(shared&&j)return;
   const n=node("map"+j,shared?550:j?825:275,240,"map(expensive)","op",j+1,{w:280,work:true});
   maps.push(n);edge(source,n,values(0));
  });
  const hub=shared?node("hub",550,385,"share()","op",null,{w:220}):null;
  if(hub)edge(maps[0],hub,values(1));
  [3,4].forEach((ri,j)=>{
   const sink=node("receiver"+j,j?825:275,515,"Odbiorca "+["A","B"][j],j?"b":"a",ri,{w:240});
   edge(shared?hub:maps[j],sink,values(ri));tray(ri,j?825:275,615,420,"");
  });
 }else if(s.diagram==="refcount"){
  const ref=s.comparisonMode==="shared";
  const src=node("timer",550,100,"interval","source",0,{w:260,work:true,born:1,detail:t=>t>=10?(ref?"zatrzymany":"nadal emituje!"):undefined});
  const op=node("hub",550,295,"shareReplay(1)","op",null,{w:300,detail:"refCount: "+(ref?"true":"false")});
  edge(src,op,values(0),{born:1,until:ref?10:undefined});
  [1,2].forEach((ri,j)=>{
   const x=j?825:275,start=j?2:1,end=j?10:7;
   const sink=node("view"+j,x,480,"Widok "+["A","B"][j],j?"b":"a",ri,{w:250,born:start,disabled:t=>t>=end,detail:t=>t>=end?"zniszczony · unsubscribe":undefined});
   edge(op,sink,values(ri),{born:start,until:end});
   tray(ri,x,575,400,"");
  });
 }else if(caseId==="14-distinct"){
  const source=node("source",550,70,"id$","source",0);
  const plain=node("plain",260,235,"bez filtra","muted",null,{w:240});
  const distinct=node("distinct",835,235,"distinctUntilChanged","op",2,{w:300});
  edge(source,plain,values(0));edge(source,distinct,values(0));
  const a=node("http-a",260,410,"HTTP","http",1,{work:true,w:220});
  const b=node("http-b",835,410,"HTTP","http",3,{work:true,w:220});
  edge(plain,a,row(1).spans.map(p=>({at:p.start,value:p.label.replace("GET ",""),color:"a"})));
  edge(distinct,b,row(3).spans.map(p=>({at:p.start,value:p.label.replace("GET ",""),color:"b"})));
  tray(1,260,555,450,"Odpowiedzi · bez filtra");tray(3,835,555,450,"Odpowiedzi · z filtrem");
 }else if(caseId==="15-debounce-audit"||caseId==="16-czas-cztery"){
  const source=node("source",550,65,"zdarzenia$","source",0);
  const indices=s.seriesIndices||s.rows.slice(1).map((_,i)=>i+1),space=1040/indices.length;
  for(const [j,i] of indices.entries()){
   const x=30+space*(j+.5),r=row(i);
   const op=node("op"+i,x,280,r.label,"op",i,{w:Math.min(240,space-20),timer:true,
    detail:r.label==='sampleTime'?t=>'takt za '+(3.5-(t%3.5)).toFixed(1)+' s':r.label==='debounceTime'?t=>{
     const latest=values(0).filter(e=>e.at<=t).at(-1);
     return latest&&t<latest.at+3.5?'cisza: '+(latest.at+3.5-t).toFixed(1)+' s':undefined;
    }:undefined});
   edge(source,op,values(0));
   const sink=node("sink"+i,x,465,"Odbiorca","http",null,{w:Math.min(190,space-26)});
   edge(op,sink,values(i));tray(i,x,575,space-22,"Wynik");
  }
  if(indices.length>2){
   // Cztery porównania: historia mieści się w odbiorcy, status pod operatorem.
   Object.assign(source,{x:150,y:170,w:240,h:70,ready:true});
   indices.forEach((i,j)=>{
    const y=35+j*86;
    Object.assign(nodes.find(n=>n.id==='op'+i),{x:510,y,w:280,h:50,ready:true});
    Object.assign(nodes.find(n=>n.id==='sink'+i),{x:990,y:y+10,w:420,h:86,labelOffset:-26,ready:true});
    Object.assign(trays[j],{anchor:'sink'+i,x:990,y:y+28,w:370,label:''});
   });
   return {nodes,edges,trays,width:W,height:H,layout:'fixed'};
  }
 }else if(caseId==="17-latest"){
  const filters=node("filters",260,65,"filtry$","b",0);
  const clicks=node("clicks",835,65,"klik$","source",1);
  [2,3].forEach((ri,j)=>{
   const x=j?835:260,op=node("op"+j,x,290,row(ri).label,"op",ri,{w:290});
   edge(filters,op,values(0));edge(clicks,op,values(1));
   const sink=node("sink"+j,x,465,"Odbiorca","http");
   edge(op,sink,values(ri));tray(ri,x,575,470);
  });
 }else if(caseId==="13-limit"){
  const op=node("op",125,300,"mergeMap","op",null,{w:195,detail:"limit: 3"});
  s.rows.forEach((r,i)=>{
   const n=node("job"+i,390+i*150,130,r.label,["a","b","c","a","b"][i],i,{w:115,inner:true,born:Math.min(...r.spans.map(p=>p.start))});
   edge(n,op,values(i),{workRow:i,gateWork:true});
  });
  const sink=node("sink",550,470,"Odbiorca","http");
  edge(op,sink,s.rows.flatMap(r=>r.events));tray(s.rows.map((_,i)=>i),550,585,860);
 }else if(caseId==="23-angular-alias"){
  const http=node("http",180,280,"HTTP","source",0,{work:true});
  const op=node("async",520,280,"async · alias user","op",null,{w:260});
  edge(http,op,values(0));
  [1,2,3].forEach((ri,j)=>{
   const n=node("ui"+j,885,100+j*210,"UI · "+["A","B","C"][j],"http",ri);
   edge(op,n,values(ri));
  });
 }else if(caseId==="24-signals"){
  const http=node("http",160,265,"HTTP","source",1,{work:true});
  const op=node("signal",545,265,"toSignal","op",2,{w:260});
  const ui=node("ui",930,265,"user()","http",3,{w:170});
  edge(http,op,values(1));edge(op,ui,values(3));
  tray(3,550,520,700,"Odczytana wartość");
 }else if(caseId==="06-subskrypcja"){
  const http=node('http',200,200,'HTTP','source',1,{work:true,born:6});
  const sink=node('sink',900,200,'Odbiorca','http',2,{ready:true});
  edge(http,sink,values(2),{born:6});tray(2,900,300,400);
 }else if(caseId==="05-zrodla"){
  const i=s.sourceExample??0,ri=i===2?3:i;
  const source=node('source',200,220,['timer','HTTP','Subject'][i],'source',i,{work:i===1});
  const sink=node('sink',850,220,'Odbiorca','http',ri,{born:i===2?8:0});
  edge(source,sink,values(ri));tray(ri,850,340,500);
 }else if((caseId==="21-share-miejsce"||s.diagram==="placement")){
  const source=node('source',100,250,'Subject','source',0);
  const hub=node('share',550,250,'share()','op');
  if(s.mapAfterShare){
   edge(source,hub,values(0));
   [2,3].forEach((ri,j)=>{
    const map=node('map'+j,800,100+j*230,'map(expensive)','op',ri,{work:true});
    const sink=node('sink'+j,1000,100+j*230,'Odbiorca '+['A','B'][j],'http');
    edge(hub,map,values(0));edge(map,sink,values(ri));tray(ri,1000,210+j*230,260);
   });
  }else{
   const map=node('map',300,250,'map(expensive)','op',1,{work:true});
   edge(source,map,values(0));edge(map,hub,values(1));
   [0,1].forEach(j=>{const sink=node('sink'+j,1000,100+j*230,'Odbiorca '+['A','B'][j],'http');edge(hub,sink,values(1));tray(1,1000,210+j*230,260);});
  }
 }else if(caseId==='b04-catcherror'){
  const source=node('queries',150,230,'klik$','source',0);
  const op=node('catch',550,230,s.catchInside?'switchMap + catch wewnątrz':'switchMap + catch za nim','op');
  const ri=s.catchInside?2:1;
  const sink=node('sink',1000,230,'Odbiorca','http',ri);
  edge(source,op,values(0).filter(e=>s.catchInside||e.at<5),{until:s.catchInside?undefined:5});
  edge(op,sink,values(ri));tray(ri,1000,350,420);
  row(ri).spans.forEach((span,i)=>{
   const failed=span.kind==='error';
   const requestRow={events:failed?[{at:span.end,kind:'error',value:'error'}]:[],spans:[span],completeAt:failed?undefined:span.end};
   const http=node('request'+i,220,80+i*125,span.label,'http',null,{work:true,born:span.start,lifecycleRow:requestRow});
   edge(http,op,failed?[]:[{at:span.end,value:span.label.replace('HTTP ','')}]);
  });
 }else if(caseId==="b01-defer"){
  const token=node("token",550,65,"token","source",0,{detail:t=>t<9?"A":"B"});
  [3,4].forEach((ri,j)=>{
   const x=j?815:275;
   const op=node("op"+j,x,285,j?"defer(() => of(token))":"of(token)","op",ri,{w:350});
   edge(token,op,[],{dashed:true});
   const sink=node("sink"+j,x,460,"Odbiorca","http");
   edge(op,sink,values(ri));tray(ri,x,575,450);
  });
 }else if(caseId==="b09-pairwise"){
  const source=node("position",170,230,"pozycja$","source",0);
  const pair=node("pair",530,230,"pairwise()","op",1,{w:240});
  const delta=node("delta",900,230,"map · różnica","op",2,{w:240});
  edge(source,pair,values(0));edge(pair,delta,values(1));
  tray(1,330,485,470,"Kolejne pary");tray(2,830,485,470,"Różnica");
 }else if(caseId==='b03-buffertime'){
  const source=node('source',100,200,'zdarzenia','source',0);
  const buffer=node('buffer',380,200,'bufferTime','op',1,{timer:true});
  const http=node('http',700,200,'HTTP · paczka','http',2,{work:true});
  const sink=node('sink',1000,200,'Odbiorca','http');
  edge(source,buffer,values(0));edge(buffer,http,values(1));
  edge(http,sink,values(2),{gateWork:true});tray(2,1000,300,260);
 }else if(["b06-forkjoin","b07-zip","b08-merge"].includes(caseId)){
  const srcCount=s.rows.length-1;
  const outIndex=s.rows.length-1;
  const op=node("op",550,320,{ "b06-forkjoin":"forkJoin","b07-zip":"zip","b08-merge":"merge"}[caseId],"op",null,{w:280});
  for(let i=0;i<srcCount;i++){
   const n=node("src"+i,110+(i+.5)*880/srcCount,90,row(i).label,["a","b","c"][i%3],i,{w:Math.min(260,800/srcCount),work:row(i).spans.length>0});
   edge(n,op,values(i));
  }
  const sink=node("sink",550,475,"Odbiorca","http",null,{w:260});
  edge(op,sink,values(outIndex));tray(outIndex,550,585,880);
 }else{
  // Independent examples retain their own producer; no invented dependency between rows.
  const columns=s.rows.length>4?3:2,spacing=1040/columns,rows=Math.ceil(s.rows.length/columns);
  s.rows.forEach((r,i)=>{
   const x=30+spacing*(i%columns+.5),y=85+Math.floor(i/columns)*(510/rows);
   const n=node("case"+i,x,y,caseId==='b05-finalize'?'HTTP':r.label,/HTTP/.test(r.label)?"http":i===0?"source":"op",i,{w:Math.min(spacing-30,330),work:r.spans.some(p=>!['subscription','state','queue'].includes(p.kind))});
   const sink=node("sink"+i,x,y+115,"Odbiorca","muted",null,{w:150,h:50});
   edge(n,sink,values(i));tray(i,x,y+188,spacing-35,"");
  });
 }
 // Deklaracja Observable jest w kodzie nad diagramem; klocki pokazują wykonanie.
 const definition=nodes.find(n=>n.id==='observable');
 if(definition)nodes.splice(nodes.indexOf(definition),1);
 // READY pokazuje uczestników potoku; wykonania zimnych źródeł pojawiają się przy subscribe.
 nodes.forEach(n=>{if(!n.work&&!n.inner)n.ready=true;});
 return {nodes, edges:edges.filter(e=>e.a!==definition&&e.b!==definition), trays, width:W, height:H};

}

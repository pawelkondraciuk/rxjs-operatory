// Statystyki wywołań operatorów z zestawienia rxjs-usage (liczba wywołań w kodzie, nie wykonań w runtime).
// Dane są stałe; udziały są zaokrąglone tak jak w zestawieniu, więc ich suma nie musi wynosić 100%.
export const usageMapOperators = [
  {label:'concatMap',count:96,share:5.4,fill:'#FFC15C',ink:'#A85304'},
  {label:'mergeMap',count:251,share:14.0,fill:'#8CD0DA',ink:'#0B6F8F'},
  {label:'switchMap',count:1418,share:79.1,fill:'#9D86E6',ink:'#5B3FC4'},
  {label:'exhaustMap',count:28,share:1.6,fill:'#8FD3A5',ink:'#087438'},
];
export const usageMapTotal = 1793;
export const usageFacts = [
  {id:'map',value:'4282',label:'map()',note:'„Najczęściej używany”',ink:'#5B3FC4'},
  {id:'share-replay',value:'3,7×',label:'shareReplay vs share',note:'„926 kontra 252”',ink:'#8E4FA8'},
  {id:'concat-all',value:'1',label:'concatAll()',note:'„Tylko jedno wywołanie!”',ink:'#A85304'},
];
export const usageCaption = 'Źródło: analiza wybranego zbioru kodu RxJS · liczba wywołań w kodzie, nie wykonań w runtime';
// Czas ilustracji: paski rosną 0,6 s, każda ciekawostka pojawia się 0,3 s; po każdym odsłonięciu postój (także w AUTO).
export const usageTiming = {bars:.1,grow:.6,ranking:.9,fact:.3,factGap:.5,tail:.2};
const round = time => Math.round(time*1e6)/1e6;
const factAt = index => round(usageTiming.ranking+.05+index*usageTiming.factGap);
const factStop = index => round(usageTiming.ranking+(index+1)*usageTiming.factGap);

export function usageStatsGraph(scene) {
  const wide=scene.format!=='4:3',height=wide?530:690;
  const rowTop=wide?96:132,rowStep=wide?64:82,barH=wide?40:48,statsY=wide?392:520;
  return {layout:'fixed',formatAware:true,width:1240,height,nodes:[],edges:[],trays:[],
    barCharts:[{id:'map-family',title:'Cztery Map. Jeden zdecydowany zwycięzca.',titleY:wide?40:52,
      labelX:262,barX:290,barW:600,percentX:1020,countX:1210,rowTop,rowStep,barH,
      from:usageTiming.bars,duration:usageTiming.grow,valuesFrom:usageTiming.bars+.3,valuesDuration:.3,
      rows:usageMapOperators.map(row=>({...row,percent:row.share.toFixed(1).replace('.',',')+'%',calls:`${row.count} wywołań`}))}],
    bigStats:usageFacts.map((fact,index)=>({...fact,x:1240/6*(1+2*index),y:statsY,size:wide?92:112,
      at:factAt(index),duration:usageTiming.fact})),
  };
}

export function configureUsageStats(scene) {
  const stops=[{id:'ranking',time:usageTiming.ranking,autoPause:true,caption:usageCaption},
    ...usageFacts.map((fact,index)=>({id:fact.id,time:factStop(index),autoPause:true,caption:usageCaption}))];
  Object.assign(scene,{
    title:'RxJS w prawdziwym kodzie — kto wygrywa?',code:'',codeSyntax:false,rows:[],metrics:[],
    duration:round(stops.at(-1).time+usageTiming.tail),captions:[[0,usageCaption]],
    playerLayout:'expanded',playerClass:'rx-usage-stats',
    playback:{controller:'stages',entry:'manual',finish:'hold',resetOnExit:true,stops},
  });
  scene.graph=usageStatsGraph(scene);
  return scene;
}

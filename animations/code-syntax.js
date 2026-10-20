// Subtelne kolorowanie składni kodu przykładów (scene.codeSyntax; configureScene włącza je dla wszystkich slajdów).
// To osobna warstwa od pastelowych wyróżnień fragmentów (codeLines.mark): tokeny dostają kolor tekstu, wyróżnienia nadal tło i podkreślenie — obie współistnieją.
// Zwraca rodzaj tokenu dla każdego znaku całego kodu (null — zwykła składnia), więc granice fragmentów nie mają znaczenia.
const operators=new Set(['map','concatMap','mergeMap','switchMap','exhaustMap','concatAll','mergeAll','switchAll','exhaustAll',
  'catchError','retry','distinctUntilChanged','debounceTime','auditTime','throttleTime','sampleTime','filter','take','first','finalize',
  'share','shareReplay','of','from','interval','timer','forkJoin','zip','merge','combineLatest','pairwise','bufferTime','defer',
  'withLatestFrom']);
const keywords=new Set(['const','let','var','new','return','function','async','await','as']);
const identifier=/[A-Za-z_$][\w$]*/g;

export function codeTokens(code) {
  const kinds=new Array(code.length).fill(null),strings=[];
  const mark=(from,to,kind)=>{for(let i=from;i<to;i++)kinds[i]=kind;};
  for(const m of code.matchAll(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g)) {
    mark(m.index,m.index+m[0].length,'str');strings.push([m.index,m.index+m[0].length]);
  }
  const inString=i=>strings.some(([a,b])=>i>=a&&i<b);
  // Parametry funkcji strzałkowych (id => …, (a, b) => …) i ich użycia poza literałami.
  const params=new Set();
  for(const m of code.matchAll(/\(([^()]*)\)\s*=>|([A-Za-z_$][\w$]*)\s*=>/g)) {
    if(inString(m.index))continue;
    for(const name of (m[1]??m[2]).split(',').map(p=>p.trim().split(/[\s:=]/)[0]).filter(Boolean))params.add(name);
  }
  for(const m of code.matchAll(identifier)) {
    const i=m.index,word=m[0],end=i+word.length;
    if(inString(i))continue;
    const property=code[i-1]==='.',call=/^\s*\(/.test(code.slice(end));
    // Pipe szablonu Angulara (user$ | async) — jak operator, nie słowo kluczowe.
    const templatePipe=/\|\s*$/.test(code.slice(Math.max(0,i-3),i));
    const kind=templatePipe?'op':keywords.has(word)?'kw':
      code[i-1]==='<'&&code[end]==='>'||!property&&/\bas\s+$/.test(code.slice(0,i))?'type':
      !property&&call&&operators.has(word)?'op':
      word.endsWith('$')||!property&&(word==='httpGet'||word==='fromEvent'&&call)?'src':
      !property&&params.has(word)?'param':null;
    if(kind)mark(i,end,kind);
  }
  return kinds;
}

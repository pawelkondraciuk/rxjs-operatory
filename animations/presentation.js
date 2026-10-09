import { configureScene } from './scene-config.js';
// Każdy wariant jest osobnym slajdem, dostępnym przyciskiem pilota „dalej”.
export function prepareSlides(scenes) {
  const byId = new Map(scenes.map(scene => [scene.id, scene]));
  const titles = {
    '06a-cold-hot': ['Cold: własny timer dla każdego', 'Hot: dołączasz do działającego źródła'],
    '07-hot-cold': ['Bez share: dwie subskrypcje, dwa HTTP', 'Z share: dwie subskrypcje, jedno HTTP'],
    '12a-complete': ['concatMap: complete czeka na kolejkę', 'switchMap: complete czeka na ostatni inner'],
    '18-async': ['Dwa async: dwa wykonania HTTP', 'Dwa async z share: jedno wykonanie HTTP'],
    '20-sharereplay': ['share: późny odbiorca uruchamia HTTP', 'shareReplay: późny odbiorca dostaje wynik'],
    '21-share-miejsce': ['Bez share: obliczenia dla każdego odbiorcy', 'map przed share: jedno wspólne obliczenie'],
    '22-refcount': ['refCount: false — timer działa po odejściu', 'refCount: true — ostatni odbiorca odłącza źródło'],
  };
  for (const slide of [...document.querySelectorAll('[data-animation]')]) {
    const original = byId.get(slide.dataset.animation);
    if (!original) continue;
    let variants;
    if (original.variants) {
      variants = ['without', 'shared'].map((mode, i) => ({
        ...original, ...original.variants[mode], variants: undefined,
        comparisonMode: mode, title: titles[original.id][i],
      }));
    } else if (original.id === '05-zrodla') {
      variants = [0,1,2].map(i => ({ ...original, sourceExample:i, duration:i===1?11:20,
        title:['timer: wartości w czasie','HTTP: odpowiedź i complete','Subject: odbierasz od chwili subskrypcji'][i],
        code:['timer(2000, 4000)','http.get(\'/api/data\')','subject$.subscribe(observer)'][i],
        captions:[[[0,'Timer emituje kolejne wartości do odbiorcy.'],[14,'Źródło pozostaje aktywne.']],[[0,'Subskrypcja uruchamia HTTP.'],[7,'Odpowiedź, a następnie complete.']],[[0,'Subject nie przechowuje historii.'],[4,'A zostało wyemitowane bez tego odbiorcy.'],[8,'Odbiorca subskrybuje.'],[12,'Dostaje B; wcześniejsze A do niego nie wraca.']]][i],
      }));
    } else if (original.id === '21a-share-pozycja') {
      variants = [false,true].map(after => ({ ...original, mapAfterShare:after,
        title:after?'map za share: osobne obliczenia':'map przed share: wspólne obliczenie',
        code:after?'subject$.pipe(share(), map(expensive))':'subject$.pipe(map(expensive), share())',
        captions:[[0,'Dwóch odbiorców subskrybuje przed pierwszą emisją.'],[2,after?'Każdy odbiorca wykonuje własne map(expensive).':'Wynik jednego map(expensive) trafia do obu odbiorców.']],
        metrics:[original.metrics[after?1:0]],
      }));
    } else if (original.id === 'b04-catcherror') {
      variants = [false,true].map(inside => ({ ...original, catchInside:inside,
        title:inside?'catchError wewnątrz: kolejne zapytania działają':'catchError na zewnątrz: potok kończy się po []',
        code:inside?'switchMap(id => http$(id).pipe(catchError(() => of([]))))':'switchMap(http$), catchError(() => of([]))',
        captions:[[0,'Kliknięcia uruchamiają żądania HTTP.'],[4,'HTTP A: error. Obsługa błędu zwraca [].'],[5,inside?'Kończy się tylko pojedyncze żądanie. Nadal słuchamy kliknięć.':'Zastąpiony potok emituje [] i complete.'],[8,inside?'Kolejny klik uruchamia HTTP B.':'Kolejny klik nie trafia do zakończonego potoku.']],
      }));
    } else if (original.id === '16-czas-cztery') {
      variants = [1, 2, 3, 4].map(i => ({ ...original, seriesIndices: [i],
        title: ['','debounceTime: czekamy na ciszę','auditTime: ostatnia wartość okna','throttleTime: pierwsza wartość okna','sampleTime: odczyt w stałym rytmie'][i],
        code: `${original.rows[i].label}(3500)`,
        captions: [[0, ['','Każde zdarzenie odlicza 3,5 s od nowa.','Pierwsze zdarzenie otwiera okno 3,5 s.','Pierwsza wartość przechodzi. Następne w oknie pomijamy.','Co 3,5 s pobieramy najnowszą wartość, jeśli pojawiła się nowa.'][i]], [12, ['','Emisja następuje dopiero po 3,5 s ciszy.','Na końcu okna emitujemy ostatnią otrzymaną wartość.','Domyślnie: leading = true, trailing = false.','Brak nowych zdarzeń oznacza brak kolejnej emisji.'][i]]],
      }));
    } else if (original.id === 'b02-first-take') {
      variants = [[0, 1], [2, 3]].map((indices, i) => ({ ...original, duration:8, rows: indices.map(j => {
        const r=original.rows[j],shift=i?8:0;
        return {...r,completeAt:r.completeAt===undefined?undefined:r.completeAt-shift,events:r.events.map(e=>({...e,at:e.at-shift}))};
      }),
        title: i ? 'Puste źródło: take(1) kończy, first() zgłasza błąd' : 'Pierwsza wartość: take(1) i first()',
        code: i ? 'EMPTY.pipe(take(1)) / EMPTY.pipe(first())' : "of('A').pipe(take(1)) / of('A').pipe(first())",
        captions: i ? [[0,'Źródło kończy się bez żadnej wartości.'],[3,'take(1): complete. first(): EmptyError.']] : [[0,'Źródło wyemituje A.'],[3,'Oba operatory przekazują A, a następnie complete.']],
      }));
    } else if (original.id === 'b05-finalize') {
      variants = original.rows.map(r => {
        const shift=r.spans[0].start-1;
        return { ...original, duration:10,
          rows:[{...r,events:[],completeAt:r.completeAt===undefined?undefined:r.completeAt-shift,spans:r.spans.map(p=>({...p,start:p.start-shift,end:p.end-shift}))}],
          title:`finalize po ${r.label}`,
          captions:[[0,`Zakończenie przez ${r.label}.`],[6,'Sprzątanie uruchamia się również w tym przypadku.']],
          metrics:[{label:'finalize',value:t=>t>=6?'cleanup()':'czeka'}],
        };
      });
    } else variants = [original];

    let previous = slide;
    variants.forEach((variant, i) => {
      const target = i ? slide.cloneNode(true) : slide;
      const id = i ? `${original.id}-${i + 1}` : original.id;
      const scene = configureScene({ ...variant, id, rendererId: original.id });
      byId.set(id, scene);
      target.id = id;
      target.dataset.animation = id;
      target.querySelector('h2').textContent = scene.title;
      target.querySelector('.rx-player').setAttribute('aria-label', scene.title);
      if (i) previous.after(target);
      previous = target;
    });
  }
  return byId;
}

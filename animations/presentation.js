import { configureScene, mainOrder, extraOrder, extraIds } from './scene-config.js';
// Każdy wariant jest osobnym slajdem, dostępnym przyciskiem pilota „dalej”.
// format ('4:3' | '16:9') trafia do sceny, żeby grafy mogły dobrać wysokość ramki.
export function prepareSlides(scenes, { format = '4:3' } = {}) {
  const byId = new Map(scenes.map(scene => [scene.id, scene]));
  const titles = {
    '20-sharereplay': ['share: późny odbiorca uruchamia HTTP', 'shareReplay: późny odbiorca dostaje wynik'],
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
      // Warianty 0 (interval na żywo), 1 (HTTP), 2 (Subject + HTTP), 3 (Subject + interval) i 4 (Subject — ręczna emisja)
      // konfiguruje configureScene.
      variants = [0,1,2,3,4].map(i => ({ ...original, sourceExample:i, duration:i===1?11:20,
        title:['interval: strumień bez końca','HTTP: odpowiedź i complete','Subject: odbierasz od chwili subskrypcji','Subject — kto odłączy źródło?','Subject — ręczna emisja'][i],
        code:['interval(1000)','httpGet(\'/api/data\')','subject$.subscribe(observer)','',''][i],
        captions:[[],[],[[0,'Subject może emitować bez odbiorcy.'],[4,'A bez subskrypcji.'],[8,'Odbiorca subskrybuje.'],[12,'Dostaje B.'],[16,'Dostaje C. Trzy emisje, dwa odbiory.']],[],[]][i],
      }));
    } else if (original.id === '04a-dwa-tory') {
      // Tory wykonania: cold (trzy pola widoku, trzy requesty user$), share() (HTTP GET → share() → A/B/C, jeden request)
      // i share + interval (odpowiednik Subject + interval: ostatni odbiorca odłącza źródło).
      variants = ['cold', 'share', 'share-interval'].map(mode => ({ ...original, lanesMode: mode,
        title: { cold: 'Cold: jedna definicja, trzy wykonania', share: 'share(): jedno HTTP, trzech odbiorców',
          'share-interval': 'share() — kto odłączy źródło?' }[mode] }));
    } else if (original.id === 'b04-catcherror') {
      variants = [false,true].map(inside => ({ ...original, catchInside:inside }));
    } else variants = [original];

    let previous = slide;
    variants.forEach((variant, i) => {
      const target = i ? slide.cloneNode(true) : slide;
      const id = i ? `${original.id}-${i + 1}` : original.id;
      const scene = configureScene({ ...variant, id, rendererId: original.id, format });
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

// Wywołuj po prepareSlides: jedna bazowa sekcja może mieć warianty w obu ścieżkach.
export function arrangeSlides(sceneById, { extras = false, printMode = false, requestedId = '' } = {}) {
  const container = document.querySelector('.reveal .slides');
  const includeExtras = extras || printMode || extraIds.has(requestedId);
  const slides = new Map([...container.querySelectorAll('section[id]')].map(slide => [slide.id, slide]));
  for (const id of [...mainOrder, ...extraOrder]) {
    const slide = slides.get(id);
    if (!slide) continue;
    const bonus = extraIds.has(id);
    const back = slide.querySelector('.extras-back');
    if (bonus) {
      slide.setAttribute('data-extras', '');
      if (!includeExtras) { slide.remove(); continue; }
      if (!back) {
        const link = document.createElement('a');
        link.className = 'extras-back';
        link.href = './#/pytania';
        link.textContent = 'Powrót do pytań';
        slide.append(link);
      }
    } else {
      slide.removeAttribute('data-extras');
      back?.remove();
    }
    container.append(slide);
    const scene = sceneById.get(id);
    if (scene) scene.group = bonus ? 'bonus' : 'main';
  }
  return { extras: includeExtras };
}

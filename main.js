import 'reveal.js/reset.css';
import 'reveal.js/reveal.css';
import 'reveal.js/theme/white.css'; // Jasny i czytelny motyw bazowy
import './custom.css'; // Nasza czcionka, gradient i powiększone style pod projektor
import 'reveal.js/plugin/highlight/monokai.css'; // Motyw kolorowania składni

import Reveal from 'reveal.js';
import Markdown from 'reveal.js/plugin/markdown';
import Highlight from 'reveal.js/plugin/highlight';
import Notes from 'reveal.js/plugin/notes';
import { scenes } from './animations/catalog.js';
import { createPlayer } from './animations/player.js';
import './animations/reveal.css';
import { prepareSlides, arrangeSlides } from './animations/presentation.js';
import { compileScene } from './animations/engine.js';
import { installRevealStages } from './animations/reveal-stages.js';
import { installAutoFinishGuard } from './animations/reveal-auto-finish.js';
import { installSpeakerPreview } from './animations/speaker-preview.js';
import { prepareCheckpointNotes, installCheckpointNotesReceiver, installNotesKeyBridge, installNotesMirror, isNotesPreview, showNotesPreviewFrame } from './animations/checkpoint-notes.js';
import { FORMATS, formatFromSearch, withFormat, toggledFormatUrl } from './animations/format.js';
import { prepareCodeWalk } from './animations/code-walk.js';

const params = new URLSearchParams(location.search);
const printMode = params.has('print-pdf');
// Ramki podglądu w oknie Notes (bieżący i następny slajd) pokazują nieruchomy kadr checkpointu:
// bez własnego RAF, autoplay i korekt fragmentów, które plugin Notes odsyłałby do głównego okna.
const notesPreview = isNotesPreview();
// Domyślnie projektor 4:3; ?ratio=16:9 (lub klawisz W) przełącza na ekran panoramiczny.
const format = formatFromSearch(location.search);
document.documentElement.dataset.ratio = format.replace(':', '-');
// Najpierw warianty otrzymują stabilne ID; dopiero potem wybieramy ścieżkę.
const requestedParts = location.hash.slice(2).split('/');
const requestedId = requestedParts[0];
const requestedFragment = Number(requestedParts[/^\d+$/.test(requestedId) ? 2 : 1]);
const sceneById = prepareSlides(scenes, { format });
const route = arrangeSlides(sceneById, { extras: params.has('extras'), printMode, requestedId });
// Kod źródłowy krok po kroku: okno kodu budowane przed inicjalizacją Reveal (etapy to zwykłe fragmenty).
document.querySelectorAll('[data-code-walk]').forEach(prepareCodeWalk);
// Bezpośredni hash dodatku ma taki sam URL ścieżki jak wejście przez menu.
// Usunięcie query przy powrocie powoduje przeładowanie i przywraca sam MAIN.
if (route.extras && !params.has('extras') && !printMode) {
  const url = new URL(location.href);
  url.searchParams.set('extras', '');
  history.replaceState(history.state, '', url);
}
// Obejmuje również linki powrotne utworzone przy podziale wariantów.
document.querySelectorAll('a[href^="?"], a[href^="./"]').forEach(link => {
  link.setAttribute('href', withFormat(link.getAttribute('href'), format));
});

const deck = new Reveal({
  plugins: [Markdown, Highlight, Notes],
  hash: true,
  fragmentInURL: true,
  slideNumber: true,
  // Wspólna szerokość 1280; wysokość 960 (4:3) albo 720 (16:9).
  ...FORMATS[format],
  margin: 0.05,
  minScale: 0.2,
  maxScale: 2.0,
  view: 'slide',
  navigationMode: 'linear',
  // Podgląd nie nawiguje sam (strzałki Reveal); klawisze idą do głównego okna przez installNotesKeyBridge.
  ...(notesPreview ? { controls: false } : {}),
});

installSpeakerPreview(deck);
// Główne okno udostępnia gotowe kadry odtwarzaczy ramce current-slide okna Notes.
const notesMirror = installNotesMirror(deck);

const players = new Map();
let activePlayer;
let activeSlide;
let restoringSlide = false;
const slideStates = new Map();
function stateFor(slide = deck.getCurrentSlide()) {
  if (!slideStates.has(slide)) slideStates.set(slide, {
    mode: sceneById.get(slide?.dataset.animation)?.playback?.entry || 'auto',
    visited: false, fragmentIndex: -1, wasPlaying: true,
  });
  return slideStates.get(slide);
}

// Etapy są fragmentami Reveal, tak samo jak zdjęcia na wcześniejszych slajdach.
// Każda scena deklaruje semantyczne postoje; ostatni fragment uruchamia AUTO.
const stopsBySlide = new Map();
const steppedSlides = printMode ? [] : [...document.querySelectorAll('[data-animation]')].filter(slide => sceneById.get(slide.dataset.animation)?.playback?.stops?.length || sceneById.get(slide.dataset.animation)?.playback?.controller === 'stages');
for (const slide of steppedSlides) {
  const scene = sceneById.get(slide.dataset.animation);
  const stops = compileScene(scene).stops;
  stopsBySlide.set(slide, stops);
  slide.classList.add('rx-stepped');
  const markers = document.createElement('div');
  markers.className = 'rx-fragment-steps';
  markers.setAttribute('aria-hidden', 'true');
  markers.innerHTML = stops.map((stop, index) => `<span class="rx-step fragment" data-fragment-index="${index}" data-time="${stop.time}" data-stop="${stop.id}"></span>`).join('');
  if (scene.playback.controller === 'stages' || scene.playback.afterLastManualStop === 'start-auto') markers.innerHTML += `<span class="rx-step fragment" data-fragment-index="${stops.length}" data-time="${stops.at(-1)?.time || 0}" data-handoff="true"></span>`;
  slide.append(markers);
  const button = document.createElement('button');
  button.className = 'rx-step-mode';
  button.type = 'button';
  button.title = 'Zmień tryb animacji (M)';
  button.addEventListener('click', toggleMode);
  slide.append(button);
}
// Szablony notatek są wybierane po rozwinięciu wariantów i utworzeniu markerów.
for (const slide of document.querySelectorAll('[data-animation]')) prepareCheckpointNotes(slide, { printMode });

function isStaged(slide = deck.getCurrentSlide()) { return sceneById.get(slide?.dataset.animation)?.playback?.controller === 'stages'; }
function isStepped(slide = deck.getCurrentSlide()) { return slide?.classList.contains('rx-stepped'); }
function fragmentTime(slide = deck.getCurrentSlide()) {
  // Przy powrocie Reveal oznacza fragmenty jako visible przed current-fragment.
  return Number([...(slide?.querySelectorAll('.rx-fragment-steps .visible') || [])].at(-1)?.dataset.time || 0);
}
function updateMode(slide) {
  const animationMode = stateFor(slide).mode;
  slide.querySelector('.rx-step-mode').textContent = animationMode === 'auto' ? 'Automatyczny · M' : 'Ręczny · M';
  slide.querySelectorAll('.rx-step').forEach(fragment => {
    // Postoje ręczne ustępują w AUTO fragmentowi końcowego wyniku.
    fragment.classList.toggle('fragment', isStaged(slide) || animationMode === 'manual');
    if (animationMode === 'auto' && !isStaged(slide)) fragment.classList.remove('visible', 'current-fragment');
  });
}
function setMode(mode) {
  const slide = deck.getCurrentSlide();
  if (activePlayer?.controller) { activePlayer.controller.setMode(mode); return; }
  const time = activePlayer?.time || 0;
  stateFor(slide).mode = mode;
  updateMode(slide);
  deck.sync();
  autoFinish.sync(slide);
  if (!isStepped()) return;
  if (mode === 'auto') activePlayer?.playContinuously();
  else {
    const points = [0, ...stopsBySlide.get(slide).map(stop => stop.time)];
    const index = points.findLastIndex(point => point <= time);
    deck.navigateFragment(index - 1);
    activePlayer?.seek(points[Math.max(0, index)]);
  }
}
function toggleMode() { setMode(stateFor().mode === 'manual' ? 'auto' : 'manual'); }
function resetAnimation() {
  if (activePlayer?.controller) { activePlayer.controller.reset(); return; }
  if (isStepped() && stateFor().mode === 'manual') { deck.navigateFragment(-1); activePlayer?.seek(0); }
  else activePlayer?.reset();
}
function stepAnimation(direction) {
  if (activePlayer?.controller) { if (direction > 0) activePlayer.controller.next(); else activePlayer.controller.previous(); return; }
  if (isStepped() || stateFor().mode === 'auto') { if (direction > 0) deck.next(); else deck.prev(); }
  else activePlayer?.step(direction);
}
function toggleAnimation() { if (activePlayer?.controller) { if (activePlayer.controller.mode === 'manual') activePlayer.controller.setMode('auto'); else activePlayer.controller.toggle(); return; } if (isStepped() && stateFor().mode === 'manual') setMode('auto'); else activePlayer?.toggle(); }
steppedSlides.forEach(updateMode);
// Tytuły animacji są duże (4:3: 64 px), ale długi tytuł zmniejszamy tak, by został w jednej linii obok przycisku trybu.
function fitTitles() {
  const context = document.createElement('canvas').getContext('2d');
  document.querySelectorAll('.animation-slide h2').forEach(title => {
    title.style.fontSize = '';
    const style = getComputedStyle(title), size = parseFloat(style.fontSize);
    const room = FORMATS[format].width - (title.closest('.rx-stepped') ? 230 : 0) - 8;
    context.font = `${style.fontWeight} ${size}px ${style.fontFamily}`;
    const width = context.measureText(title.textContent).width;
    if (width > room) title.style.fontSize = Math.max(44, Math.floor(size * room / width)) + 'px';
  });
}
if (format === '4:3') fitTitles();
const autoFinish = installAutoFinishGuard(deck, {
  slides: printMode ? [] : [...document.querySelectorAll('[data-animation]')].filter(slide => {
    const scene = sceneById.get(slide.dataset.animation);
    return scene && !isStaged(slide) && scene.playback?.entry !== 'static';
  }),
  getPlayer: slide => players.get(slide),
  getMode: slide => stateFor(slide).mode,
  isEnabled: () => !printMode && !notesPreview,
});

function playerFor(slide) {
  if (!slide?.dataset.animation) return;
  if (!players.has(slide)) {
    const scene = sceneById.get(slide.dataset.animation);
    if (!scene) throw new Error(`Nieznana animacja: ${slide.dataset.animation}`);
    players.set(slide, createPlayer(slide.querySelector('.rx-player'), scene, isStaged(slide) ? {
      stageOptions: {
        onNavigate: direction => direction > 0 ? deck.next({ skipFragments: true }) : deck.prev({ skipFragments: true }),
        onChange: state => { if (stateFor(slide).mode !== state.mode) { stateFor(slide).mode = state.mode; updateMode(slide); } },
      },
    } : isStepped(slide) ? {
      step: stepAnimation, reset: resetAnimation, toggle: toggleAnimation,
    } : { step: stepAnimation }));
    autoFinish.observe(slide, players.get(slide));
    if (!notesPreview) players.get(slide).subscribe(() => notesMirror.notify(slide));
  }
  return players.get(slide);
}

// Ramka current-slide kopiuje kadr głównego okna (ta sama animacja), upcoming i brak lustra — nieruchomy checkpoint.
function showPreviewFrame(slide) {
  showNotesPreviewFrame(slide, playerFor(slide), { still: stateFor(slide).mode === 'static' });
  notesMirror.pull?.();
}

function activate(slide) {
  if (notesPreview) {
    activeSlide = slide;
    activePlayer = playerFor(slide);
    activePlayer?.hideControls();
    showPreviewFrame(slide);
    return;
  }
  suspendedPlaying = false;
  if (activeSlide && activePlayer) stateFor(activeSlide).wasPlaying = activePlayer.isPlaying;
  if (activePlayer?.controller) activePlayer.controller.suspend('slide'); else activePlayer?.pause();
  // Scena na żywo (interval) po wyjściu zatrzymuje wykonanie i wraca do READY; nie wznawia się po powrocie.
  // Ponowna aktywacja tego samego slajdu (np. przy inicjalizacji Reveal) nie jest wyjściem.
  if ((activePlayer?.live || activePlayer?.resetOnExit) && activeSlide !== slide) activePlayer.controller.reset();
  activePlayer?.hideControls();
  activeSlide = slide;
  activePlayer = playerFor(slide);
  activePlayer?.hideControls();
  const state = stateFor(slide);
  if (printMode) activePlayer?.finish();
  else if (activePlayer?.controller) {
    // Odtwórz stabilny checkpoint z hasha przed synchronizacją fragmentów stages.
    const requestedSlide = requestedId === slide.id || deck.getSlides()[Number(requestedId)] === slide;
    if (!state.visited && requestedSlide && Number.isInteger(requestedFragment) && requestedFragment >= 0) {
      const marker = slide.querySelectorAll('.rx-step')[requestedFragment];
      if (marker) activePlayer.controller.seekCheckpoint(Number(marker.dataset.time), marker.dataset.handoff === 'true');
    }
    const blocked = deck.isOverview() || deck.isPaused() || document.hidden;
    if (blocked) activePlayer.controller.suspend('environment');
    else {
      activePlayer.controller.resume('environment'); activePlayer.controller.resume('slide');
      if (!state.visited && state.mode === 'auto' && activePlayer.state !== 'finished') activePlayer.controller.next();
      autoplayLive();
    }
  }
  else if (isStepped(slide) && state.mode === 'manual') {
    if (state.visited) {
      restoringSlide = true;
      deck.navigateFragment(state.fragmentIndex);
      restoringSlide = false;
    } else state.fragmentIndex = slide.querySelectorAll('.rx-step.visible').length - 1;
    activePlayer?.seek(fragmentTime(slide));
  } else if (state.mode !== 'static' && !deck.isOverview() && !deck.isPaused() && !document.hidden && state.wasPlaying) {
    activePlayer?.play();
  }
  state.visited = true;
  autoFinish.sync(slide);
}

// Scena na żywo z autoplay (Subject + interval) startuje już działająca: emisje ruszają przy wejściu na slajd.
function autoplayLive() {
  if (activePlayer?.live?.autoplay && !activePlayer.isPlaying && activePlayer.state !== 'finished') activePlayer.controller.toggle();
}
let suspendedPlaying = false;
function suspend() { if (notesPreview) return; if (activePlayer?.controller) { activePlayer.controller.suspend('environment'); return; } suspendedPlaying ||= Boolean(activePlayer?.isPlaying); activePlayer?.pause(); }
function resume() {
  if (!printMode && !notesPreview && !deck.isOverview() && !deck.isPaused() && !document.hidden) {
    if (activePlayer?.controller) { activePlayer.controller.resume('environment'); if (activePlayer.state === 'ready') autoplayLive(); return; }
    if (suspendedPlaying) {
      if (isStepped() && stateFor().mode === 'manual') activePlayer?.playTo(fragmentTime());
      else if (activePlayer?.state !== 'finished') activePlayer?.play();
    }
    suspendedPlaying = false;
  }
}

deck.on('fragmentshown', event => {
  if (notesPreview) { if (event.fragment.closest('.rx-fragment-steps')) showPreviewFrame(event.fragment.closest('section')); return; }
  if (isStaged() || printMode || restoringSlide || stateFor().mode !== 'manual' || !event.fragment.closest('.rx-fragment-steps') || event.fragment.closest('section') !== activeSlide) return;
  if (activePlayer?.finishStep()) {
    // Reveal już odsłoniło kolejny fragment. Zatrzymaj bieżący etap i oddaj mu fragment.
    restoringSlide = true;
    try { deck.navigateFragment(stateFor().fragmentIndex); }
    finally { restoringSlide = false; }
    return;
  }
  stateFor().fragmentIndex = activeSlide.querySelectorAll('.rx-step.visible').length - 1;
  if (event.fragment.dataset.handoff === 'true') { setMode('auto'); return; }
  playerFor(deck.getCurrentSlide())?.playTo(fragmentTime());
});
deck.on('fragmenthidden', event => {
  if (notesPreview) { if (event.fragment.closest('.rx-fragment-steps')) showPreviewFrame(event.fragment.closest('section')); return; }
  if (isStaged() || printMode || restoringSlide || stateFor().mode !== 'manual' || !event.fragment.closest('.rx-fragment-steps') || event.fragment.closest('section') !== activeSlide) return;
  stateFor().fragmentIndex = activeSlide.querySelectorAll('.rx-step.visible').length - 1;
  playerFor(deck.getCurrentSlide())?.seek(fragmentTime());
});

deck.on('slidechanged', event => activate(event.currentSlide));
deck.on('overviewshown', () => {
  suspend();
  document.querySelectorAll('[data-animation]').forEach(playerFor);
});
deck.on('paused', suspend);
deck.on('resumed', resume);
deck.on('overviewhidden', resume);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) suspend();
  else resume();
});
const animationAction = action => () => {
  if (!deck.isOverview() && !deck.isPaused()) action(activePlayer);
};
deck.addKeyBinding({ keyCode: 65, key: 'A', description: 'Animacja: automat / pauza' }, animationAction(toggleAnimation));
deck.addKeyBinding({ keyCode: 77, key: 'M', description: 'Animacja: tryb ręczny / automatyczny' }, animationAction(() => { if (isStepped()) toggleMode(); }));
deck.addKeyBinding({ keyCode: 219, key: '[', description: 'Animacja: poprzedni krok' }, animationAction(() => stepAnimation(-1)));
deck.addKeyBinding({ keyCode: 221, key: ']', description: 'Animacja: następny krok' }, animationAction(() => stepAnimation(1)));
deck.addKeyBinding({ keyCode: 82, key: 'R', description: 'Animacja: od początku' }, animationAction(resetAnimation));
deck.addKeyBinding({ keyCode: 85, key: 'U', description: 'Pokaż / ukryj sterowanie animacją' }, animationAction(player => player?.toggleControls()));
// Format zmienia wymiary sceny i grafów, więc wymaga przeładowania; hash zachowuje slajd i fragment.
if (!printMode) deck.addKeyBinding({ keyCode: 87, key: 'W', description: 'Format 4:3 / 16:9 (przeładowanie)' }, () => {
  const url = new URL(location.href);
  url.hash = deck.getSlidePath(); // Także przed opóźnionym zapisem URL przez Reveal.
  location.replace(toggledFormatUrl(url.href));
});

const stageReveal = installRevealStages(deck, {
  getController: slide => players.get(slide)?.controller,
  getPlayer: slide => stateFor(slide).mode === 'static' ? null : players.get(slide),
  getManualTarget: slide => isStepped(slide) && stateFor(slide).mode === 'manual' ? fragmentTime(slide) : null,
  isEnabled: () => !printMode && !notesPreview,
});
installCheckpointNotesReceiver(deck, stageReveal, { getPlayer: playerFor });
installNotesKeyBridge(deck);

// Po użyciu suwaka pilot nadal zmienia slajdy, zamiast przesuwać suwak.
document.addEventListener('keydown', event => {
  if (!event.target.closest?.('.rx-toolbar, .rx-step-mode') || !['ArrowLeft','ArrowRight','PageUp','PageDown','u','U'].includes(event.key)) return;
  event.preventDefault();
  event.stopPropagation();
  event.target.blur();
  if (event.key.toLowerCase() === 'u') activePlayer?.toggleControls();
  else if (event.key === 'ArrowLeft' || event.key === 'PageUp') { if (activePlayer?.controller) activePlayer.controller.previous(); else deck.prev(); }
  else { if (activePlayer?.controller) activePlayer.controller.next(); else deck.next(); }
}, true);

// PDF otrzymuje kompletny, nieruchomy kadr każdej animacji.
if (printMode) {
  document.querySelectorAll('[data-animation]').forEach(slide => {
    playerFor(slide).finish();
  });
}
// Strzałki Reveal mają stały rozmiar w pikselach ekranu i nachodzą na prawy dół skalowanego slajdu (liczniki animacji).
// Stopka odtwarzacza dostaje prawy margines równy tej części slajdu, którą zasłaniają; bez strzałek (druk, podgląd Notes) — 0.
function reserveControls() {
  const slides = document.querySelector('.reveal .slides').getBoundingClientRect();
  const arrows = [...document.querySelectorAll('.reveal .controls :is(.navigate-left, .navigate-right)')]
    .filter(button => button.offsetParent && getComputedStyle(button).display !== 'none').map(button => button.getBoundingClientRect().left);
  const scale = slides.width / FORMATS[format].width, overlap = arrows.length ? slides.right - Math.min(...arrows) : 0;
  document.documentElement.style.setProperty('--rx-controls-reserve', `${overlap > 0 ? Math.ceil(overlap / scale + 12) : 0}px`);
}
deck.on('resize', reserveControls);
deck.initialize().then(() => { activate(deck.getCurrentSlide()); stageReveal.refresh(); reserveControls(); });

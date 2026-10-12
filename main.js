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
import { prepareSlides } from './animations/presentation.js';
import { compileScene } from './animations/engine.js';
import { installRevealStages } from './animations/reveal-stages.js';
import { installAutoFinishGuard } from './animations/reveal-auto-finish.js';
import { installSpeakerPreview } from './animations/speaker-preview.js';

const params = new URLSearchParams(location.search);
const printMode = params.has('print-pdf');
// Menu i istniejące bezpośrednie linki otwierają dodatki świadomie.
// Zwykła nawigacja głównej ścieżki kończy się na pytaniach.
const requestedId = location.hash.slice(2).split('/')[0];
const extras = [...document.querySelectorAll('[data-extras]')];
const extraLink = extras.some(slide => requestedId === slide.id || requestedId.startsWith(slide.id + '-'));
if (!params.has('extras') && !printMode && !extraLink) extras.forEach(slide => slide.remove());
const sceneById = prepareSlides(scenes);

const deck = new Reveal({
  plugins: [Markdown, Highlight, Notes],
  hash: true,
  slideNumber: true,
  // Zoptymalizowane wymiary pod projektory panoramiczne (16:9)
  width: 1280,
  height: 720,
  margin: 0.05,
  minScale: 0.2,
  maxScale: 2.0,
  view: 'slide',
  navigationMode: 'linear',
});

installSpeakerPreview(deck);

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
const autoFinish = installAutoFinishGuard(deck, {
  slides: printMode ? [] : [...document.querySelectorAll('[data-animation]')].filter(slide => {
    const scene = sceneById.get(slide.dataset.animation);
    return scene && !isStaged(slide) && scene.playback?.entry !== 'static';
  }),
  getPlayer: slide => players.get(slide),
  getMode: slide => stateFor(slide).mode,
  isEnabled: () => !printMode,
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
  }
  return players.get(slide);
}

function activate(slide) {
  suspendedPlaying = false;
  if (activeSlide && activePlayer) stateFor(activeSlide).wasPlaying = activePlayer.isPlaying;
  if (activePlayer?.controller) activePlayer.controller.suspend('slide'); else activePlayer?.pause();
  activePlayer?.hideControls();
  activeSlide = slide;
  activePlayer = playerFor(slide);
  activePlayer?.hideControls();
  const state = stateFor(slide);
  if (printMode) activePlayer?.finish();
  else if (activePlayer?.controller) {
    const blocked = deck.isOverview() || deck.isPaused() || document.hidden;
    if (blocked) activePlayer.controller.suspend('environment');
    else {
      activePlayer.controller.resume('environment'); activePlayer.controller.resume('slide');
      if (!state.visited && state.mode === 'auto') activePlayer.controller.next();
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

let suspendedPlaying = false;
function suspend() { if (activePlayer?.controller) { activePlayer.controller.suspend('environment'); return; } suspendedPlaying ||= Boolean(activePlayer?.isPlaying); activePlayer?.pause(); }
function resume() {
  if (!printMode && !deck.isOverview() && !deck.isPaused() && !document.hidden) {
    if (activePlayer?.controller) { activePlayer.controller.resume('environment'); return; }
    if (suspendedPlaying) {
      if (isStepped() && stateFor().mode === 'manual') activePlayer?.playTo(fragmentTime());
      else if (activePlayer?.state !== 'finished') activePlayer?.play();
    }
    suspendedPlaying = false;
  }
}

deck.on('fragmentshown', event => {
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

const stageReveal = installRevealStages(deck, { getController: slide => players.get(slide)?.controller, isEnabled: () => !printMode });

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
deck.initialize().then(() => { activate(deck.getCurrentSlide()); stageReveal.refresh(); });

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

const sceneById = prepareSlides(scenes);
const printMode = new URLSearchParams(location.search).has('print-pdf');

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

const players = new Map();
let activePlayer;
let activeSlide;
let restoringSlide = false;
const slideStates = new Map();
function stateFor(slide = deck.getCurrentSlide()) {
  if (!slideStates.has(slide)) slideStates.set(slide, {
    mode: sceneById.get(slide?.dataset.animation)?.fragmentSteps ? 'manual' : 'auto',
    visited: false, fragmentIndex: -1, wasPlaying: true,
  });
  return slideStates.get(slide);
}

// Etapy są fragmentami Reveal, tak samo jak zdjęcia na wcześniejszych slajdach.
// Nowe slajdy można dołączać, określając ich fragmentSteps w katalogu.
const steppedSlides = printMode ? [] : [...document.querySelectorAll('[data-animation]')].filter(slide => sceneById.get(slide.dataset.animation)?.fragmentSteps);
for (const slide of steppedSlides) {
  const points = sceneById.get(slide.dataset.animation).fragmentSteps;
  slide.classList.add('rx-stepped');
  const markers = document.createElement('div');
  markers.className = 'rx-fragment-steps';
  markers.setAttribute('aria-hidden', 'true');
  markers.innerHTML = points.slice(1).map((time, index) => `<span class="rx-step fragment" data-fragment-index="${index}" data-time="${time}"></span>`).join('');
  slide.append(markers);
  const button = document.createElement('button');
  button.className = 'rx-step-mode';
  button.type = 'button';
  button.title = 'Zmień tryb animacji (M)';
  button.addEventListener('click', toggleMode);
  slide.append(button);
}
function isStepped(slide = deck.getCurrentSlide()) { return slide?.classList.contains('rx-stepped'); }
function fragmentTime(slide = deck.getCurrentSlide()) {
  // Przy powrocie Reveal oznacza fragmenty jako visible przed current-fragment.
  return Number([...(slide?.querySelectorAll('.rx-fragment-steps .visible') || [])].at(-1)?.dataset.time || 0);
}
function updateMode(slide) {
  const animationMode = stateFor(slide).mode;
  slide.querySelector('.rx-step-mode').textContent = animationMode === 'auto' ? 'Automatyczny · M' : 'Ręczny · M';
  slide.querySelectorAll('.rx-step').forEach(fragment => {
    // Bez fragmentów natywna nawigacja Reveal przechodzi między slajdami.
    fragment.classList.toggle('fragment', animationMode === 'manual');
    if (animationMode === 'auto') fragment.classList.remove('visible', 'current-fragment');
  });
}
function setMode(mode) {
  const slide = deck.getCurrentSlide();
  const time = activePlayer?.time || 0;
  stateFor(slide).mode = mode;
  updateMode(slide);
  deck.sync();
  if (!isStepped()) return;
  if (mode === 'auto') activePlayer?.playContinuously();
  else {
    const points = sceneById.get(deck.getCurrentSlide().dataset.animation).fragmentSteps;
    const index = points.findLastIndex(point => point <= time);
    deck.navigateFragment(index - 1);
    activePlayer?.seek(points[Math.max(0, index)]);
  }
}
function toggleMode() { setMode(stateFor().mode === 'manual' ? 'auto' : 'manual'); }
function resetAnimation() {
  if (isStepped() && stateFor().mode === 'manual') { deck.navigateFragment(-1); activePlayer?.seek(0); }
  else activePlayer?.reset();
}
function stepAnimation(direction) {
  if (isStepped()) { if (direction > 0) deck.next(); else deck.prev(); }
  else activePlayer?.step(direction);
}
function toggleAnimation() { if (isStepped()) toggleMode(); else activePlayer?.toggle(); }
steppedSlides.forEach(updateMode);

function playerFor(slide) {
  if (!slide?.dataset.animation) return;
  if (!players.has(slide)) {
    const scene = sceneById.get(slide.dataset.animation);
    if (!scene) throw new Error(`Nieznana animacja: ${slide.dataset.animation}`);
    players.set(slide, createPlayer(slide.querySelector('.rx-player'), scene, isStepped(slide) ? {
      step: stepAnimation, reset: resetAnimation, toggle: toggleAnimation,
      onStop: time => {
        if (slide === deck.getCurrentSlide() && stateFor(slide).mode === 'manual' && time === scene.fragmentSteps.at(-1)) setMode('auto');
      },
    } : {}));
  }
  return players.get(slide);
}

function activate(slide) {
  if (activeSlide && activePlayer) stateFor(activeSlide).wasPlaying = activePlayer.isPlaying;
  activePlayer?.pause();
  activePlayer?.hideControls();
  activeSlide = slide;
  activePlayer = playerFor(slide);
  activePlayer?.hideControls();
  const state = stateFor(slide);
  if (printMode) activePlayer?.finish();
  else if (isStepped(slide) && state.mode === 'manual') {
    if (state.visited) {
      restoringSlide = true;
      deck.navigateFragment(state.fragmentIndex);
      restoringSlide = false;
    } else state.fragmentIndex = slide.querySelectorAll('.rx-step.visible').length - 1;
    activePlayer?.seek(fragmentTime(slide));
  } else if (!deck.isOverview() && !deck.isPaused() && !document.hidden && state.wasPlaying) {
    activePlayer?.play();
  }
  state.visited = true;
}

function resume() {
  if (!printMode && !deck.isOverview() && !deck.isPaused() && !document.hidden) {
    if (isStepped() && stateFor().mode === 'manual') activePlayer?.playTo(fragmentTime());
    else activePlayer?.play();
  }
}

deck.on('fragmentshown', event => {
  if (printMode || restoringSlide || stateFor().mode !== 'manual' || !event.fragment.closest('.rx-fragment-steps') || event.fragment.closest('section') !== activeSlide) return;
  stateFor().fragmentIndex = activeSlide.querySelectorAll('.rx-step.visible').length - 1;
  playerFor(deck.getCurrentSlide())?.playTo(fragmentTime());
});
deck.on('fragmenthidden', event => {
  if (printMode || restoringSlide || stateFor().mode !== 'manual' || !event.fragment.closest('.rx-fragment-steps') || event.fragment.closest('section') !== activeSlide) return;
  stateFor().fragmentIndex = activeSlide.querySelectorAll('.rx-step.visible').length - 1;
  playerFor(deck.getCurrentSlide())?.seek(fragmentTime());
});

deck.on('slidechanged', event => activate(event.currentSlide));
deck.on('overviewshown', () => {
  activePlayer?.pause();
  document.querySelectorAll('[data-animation]').forEach(playerFor);
});
deck.on('paused', () => activePlayer?.pause());
deck.on('resumed', resume);
deck.on('overviewhidden', resume);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) activePlayer?.pause();
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

// Po użyciu suwaka pilot nadal zmienia slajdy, zamiast przesuwać suwak.
document.addEventListener('keydown', event => {
  if (!event.target.closest?.('.rx-toolbar, .rx-step-mode') || !['ArrowLeft','ArrowRight','PageUp','PageDown','u','U'].includes(event.key)) return;
  event.preventDefault();
  event.stopPropagation();
  event.target.blur();
  if (event.key.toLowerCase() === 'u') activePlayer?.toggleControls();
  else if (event.key === 'ArrowLeft' || event.key === 'PageUp') deck.prev();
  else deck.next();
}, true);

// PDF otrzymuje kompletny, nieruchomy kadr każdej animacji.
if (printMode) {
  document.querySelectorAll('[data-animation]').forEach(slide => {
    playerFor(slide).finish();
  });
}
deck.initialize().then(() => activate(deck.getCurrentSlide()));

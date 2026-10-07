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
});

const players = new Map();
const sceneById = new Map(scenes.map(scene => [scene.id, scene]));
let activePlayer;

function playerFor(slide) {
  if (!slide?.dataset.animation) return;
  if (!players.has(slide)) {
    const scene = sceneById.get(slide.dataset.animation);
    if (!scene) throw new Error(`Nieznana animacja: ${slide.dataset.animation}`);
    players.set(slide, createPlayer(slide.querySelector('.rx-player'), scene));
  }
  return players.get(slide);
}

function activate(slide) {
  activePlayer?.pause();
  activePlayer = playerFor(slide);
}

deck.on('slidechanged', event => activate(event.currentSlide));
deck.on('overviewshown', () => {
  activePlayer?.pause();
  document.querySelectorAll('[data-animation]').forEach(playerFor);
});
deck.on('paused', () => activePlayer?.pause());
document.addEventListener('visibilitychange', () => {
  if (document.hidden) activePlayer?.pause();
});
const animationAction = action => () => {
  if (!deck.isOverview() && !deck.isPaused()) action(activePlayer);
};
deck.addKeyBinding({ keyCode: 65, key: 'A', description: 'Animacja: odtwórz / pauza' }, animationAction(player => player?.toggle()));
deck.addKeyBinding({ keyCode: 219, key: '[', description: 'Animacja: poprzedni krok' }, animationAction(player => player?.step(-1)));
deck.addKeyBinding({ keyCode: 221, key: ']', description: 'Animacja: następny krok' }, animationAction(player => player?.step(1)));
deck.addKeyBinding({ keyCode: 82, key: 'R', description: 'Animacja: od początku' }, animationAction(player => player?.reset()));

// PDF otrzymuje kompletny, nieruchomy kadr każdej animacji.
if (new URLSearchParams(location.search).has('print-pdf')) {
  document.querySelectorAll('[data-animation]').forEach(slide => {
    playerFor(slide).seek(sceneById.get(slide.dataset.animation).duration);
  });
}
deck.initialize().then(() => activate(deck.getCurrentSlide()));

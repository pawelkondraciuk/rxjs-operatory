const test = require('node:test');
const assert = require('node:assert/strict');
const { modules, playbackHarness } = require('./v2-harness.cjs');

async function setup({ mode = 'auto', enabled = true } = {}) {
  function element() {
    const classes = new Set();
    return { dataset: {}, children: [], setAttribute() {}, append(child) { this.children.push(child); },
      classList: { contains: c => classes.has(c), remove: (...cs) => cs.forEach(c => classes.delete(c)),
        toggle(c, on) { if (on) classes.add(c); else classes.delete(c); } } };
  }
  const { 'reveal-auto-finish': module } = await modules(['reveal-auto-finish'], { document: { createElement: element } });
  const slide = element(), other = element(), listeners = new Map();
  let navigation = 0, finishCalls = 0;
  const deck = { current: slide, syncing: 0, overview: false,
    on(type, fn) { if (!listeners.has(type)) listeners.set(type, []); listeners.get(type).push(fn); },
    emit(type, event) { for (const fn of listeners.get(type) || []) fn(event); },
    getCurrentSlide() { return this.current; }, isOverview() { return this.overview; }, isPaused() { return false; }, sync() {},
    navigateFragment(index) { const visible = index >= 0; if (marker.classList.contains('visible') === visible) return;
      marker.classList.toggle('visible', visible); this.emit(visible ? 'fragmentshown' : 'fragmenthidden', { fragment: marker }); },
    next() { if (this.current === slide && marker.classList.contains('fragment') && !marker.classList.contains('visible')) this.navigateFragment(0); else navigation++; },
    prev(options) { assert.equal(options.skipFragments, true); navigation--; },
  };
  const subscribers = new Set();
  const player = { state: 'playing', subscribe(fn) { subscribers.add(fn); return () => subscribers.delete(fn); },
    finish() { finishCalls++; this.state = 'paused'; notify(); this.state = 'finished'; notify(); } };
  function notify() { for (const fn of subscribers) fn(); }
  const guard = module.installAutoFinishGuard(deck, { slides: [slide], getPlayer: () => player, getMode: () => mode, isEnabled: () => enabled });
  const marker = slide.children[0].children[0];
  guard.observe(slide, player);
  return { deck, slide, other, player, marker, guard, notify, setMode(m) { mode = m; guard.sync(); },
    get navigation() { return navigation; }, get finishCalls() { return finishCalls; } };
}

test('native forward first freezes AUTO, then navigates, also when paused or looping', async () => {
  for (const state of ['playing', 'paused']) {
    const h = await setup(); h.player.state = state;
    h.deck.next(); assert.equal(h.player.state, 'finished'); assert.equal(h.finishCalls, 1); assert.equal(h.navigation, 0);
    h.deck.next(); assert.equal(h.navigation, 1);
  }
});
test('natural finish and seeking to the result enable navigation; restart rearms the guard', async () => {
  const h = await setup(); h.player.state = 'finished'; h.notify();
  assert.equal(h.finishCalls, 0); h.deck.next(); assert.equal(h.navigation, 1);
  h.player.state = 'playing'; h.notify(); h.deck.next(); assert.equal(h.finishCalls, 1); assert.equal(h.navigation, 1);
});
test('MANUAL, ordinary slides and print mode keep native navigation', async () => {
  for (const options of [{ mode: 'manual' }, { enabled: false }]) {
    const h = await setup(options); h.deck.next(); assert.equal(h.finishCalls, 0); assert.equal(h.navigation, 1);
  }
  const h = await setup(); h.deck.current = h.other; h.deck.next(); assert.equal(h.navigation, 1); assert.equal(h.finishCalls, 0);
});
test('mode changes and returning to FINISHED synchronize the marker without finishing again', async () => {
  const h = await setup(); h.setMode('manual'); assert.equal(h.marker.classList.contains('fragment'), false);
  h.setMode('auto'); h.deck.next(); h.deck.current = h.other; h.notify();
  h.deck.current = h.slide; h.guard.sync(); h.deck.next(); assert.equal(h.navigation, 1); assert.equal(h.finishCalls, 1);
  h.deck.navigateFragment(-1); assert.equal(h.navigation, 0);
});
test('player navigation button remains enabled at FINISHED when Reveal owns stepping', async () => {
  const harness = await playbackHarness(); let calls = 0;
  const h = harness.create({ playback: { controller: undefined, entry: 'auto', finish: 'hold' }, controls: { step: () => calls++ } });
  h.player.finish(); const button = h.elements.get('.rx-next');
  assert.equal(button.disabled, false); button.listeners.click(); assert.equal(calls, 1); assert.equal(harness.frames.size, 0);
});

test('Reveal restoring a fragment from a hash does not act like a left navigation', async () => {
  const h = await setup(); h.player.finish();
  h.deck.emit('beforeslidechange', { currentSlide: h.slide });
  h.deck.navigateFragment(-1); assert.equal(h.navigation, 0);
  await Promise.resolve();
  assert.equal(h.marker.classList.contains('visible'), true);
  h.deck.next(); assert.equal(h.navigation, 1);
});
test('overview defers fragment synchronization until normal presentation resumes', async () => {
  const h = await setup(); h.deck.overview = true;
  h.player.state = 'finished'; h.notify(); assert.equal(h.marker.classList.contains('visible'), false);
  h.deck.overview = false; h.deck.emit('overviewhidden');
  assert.equal(h.marker.classList.contains('visible'), true); assert.equal(h.finishCalls, 0);
});

test('slider rounding at the endpoint still produces exact FINISHED without RAF', async () => {
  const harness = await playbackHarness();
  const h = harness.create({ playback: { controller: undefined, entry: 'auto', finish: 'hold' } });
  const slider = h.elements.get('input'); slider.value = String(h.player.duration - 1e-12); slider.listeners.input();
  assert.equal(h.player.state, 'finished'); assert.equal(h.player.time, h.player.duration); assert.equal(harness.frames.size, 0);
});

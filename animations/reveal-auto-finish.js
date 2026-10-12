// Jeden fragment zatrzymuje natywną nawigację Reveal na wyniku AUTO.
// Player nadal prowadzi jedyny zegar; fragment jedynie wywołuje finish().
export function installAutoFinishGuard(deck, { slides, getPlayer, getMode, isEnabled = () => true }) {
  const markers = new Map();
  const subscriptions = new Map();
  let syncing = false, changingSlide = false;
  for (const slide of slides) {
    const container = document.createElement('div');
    container.className = 'rx-fragment-steps';
    container.setAttribute('aria-hidden', 'true');
    const marker = document.createElement('span');
    marker.className = 'rx-auto-finish';
    marker.dataset.fragmentIndex = '0';
    container.append(marker);
    slide.append(container);
    markers.set(slide, marker);
  }
  function sync(slide = deck.getCurrentSlide()) {
    const marker = markers.get(slide);
    if (!marker) return;
    const enabled = isEnabled() && getMode(slide) === 'auto';
    if (marker.classList.contains('fragment') !== enabled) {
      marker.classList.toggle('fragment', enabled);
      marker.classList.remove('visible', 'current-fragment');
      deck.sync();
    }
    if (!enabled || slide !== deck.getCurrentSlide() || deck.isOverview() || deck.isPaused()) return;
    const finished = getPlayer(slide)?.state === 'finished';
    if (marker.classList.contains('visible') === finished) return;
    syncing = true;
    try { deck.navigateFragment(finished ? 0 : -1); }
    finally { syncing = false; }
  }
  function observe(slide, player) {
    if (!markers.has(slide) || subscriptions.has(slide)) return;
    subscriptions.set(slide, player.subscribe(() => sync(slide)));
    sync(slide);
  }
  function shown(event) {
    const slide = deck.getCurrentSlide();
    if (syncing || event.fragment !== markers.get(slide) || !isEnabled() || getMode(slide) !== 'auto') return;
    syncing = true;
    try { getPlayer(slide)?.finish(); }
    finally { syncing = false; }
    sync(slide);
  }
  function hidden(event) {
    const slide = deck.getCurrentSlide();
    if (syncing || changingSlide || event.fragment !== markers.get(slide) || !isEnabled() || getMode(slide) !== 'auto') return;
    // Lewo w AUTO zachowuje dotychczasowy powrót do poprzedniego slajdu.
    deck.prev({ skipFragments: true });
  }
  deck.on('fragmentshown', shown);
  deck.on('fragmenthidden', hidden);
  deck.on('beforeslidechange', () => {
    // Reveal przy zmianie slajdu może przywrócić fragment hasha. To nie jest naciśnięcie lewo.
    changingSlide = true;
    Promise.resolve().then(() => { changingSlide = false; sync(); });
  });
  for (const event of ['slidechanged', 'overviewhidden', 'resumed']) deck.on(event, () => sync());
  return { sync, observe };
}

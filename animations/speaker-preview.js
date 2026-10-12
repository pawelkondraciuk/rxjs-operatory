// Rozszerzenie wyłącznie ramki „Upcoming” w standardowym oknie Notes.
// Tytuł wskazuje kolejny slajd, niezależnie od fragmentów bieżącego slajdu.
export function installSpeakerPreview(deck, view = window) {
  const frame = view.frameElement;
  if (frame?.parentElement?.id !== 'upcoming-slide') return;
  const host = frame.parentElement, doc = host.ownerDocument;
  const storageKey = 'rxjs-speaker-preview';
  host.querySelectorAll('.rx-speaker-title-card, .rx-speaker-preview-setting').forEach(element => element.remove());
  if (!doc.getElementById('rx-speaker-preview-style')) {
    const style = doc.createElement('style');
    style.id = 'rx-speaker-preview-style';
    style.textContent = `
      #upcoming-slide iframe.rx-hidden-preview { visibility:hidden; }
      .rx-speaker-title-card { position:absolute; inset:6px; z-index:3;
        display:flex; flex-direction:column; align-items:center; justify-content:center;
        box-sizing:border-box; padding:44px 24px 52px; background:#fff; color:#222;
        border:1px solid #ddd; container-type:inline-size; text-align:center; }
      .rx-speaker-title-card[hidden] { display:none; }
      .rx-speaker-title-card .rx-next-label { position:absolute; top:12px; left:14px;
        font-size:13px; color:#666; text-transform:uppercase; }
      .rx-speaker-title-card .rx-next-title { width:100%; margin:0;
        font:700 clamp(28px,12cqw,88px)/1.12 Helvetica,Arial,sans-serif;
        overflow-wrap:anywhere; text-wrap:balance; }
      .rx-speaker-title-card .rx-next-subtitle { margin:14px 0 0;
        font:400 clamp(16px,4cqw,24px)/1.3 Helvetica,Arial,sans-serif; color:#666; }
      .rx-speaker-preview-setting { position:absolute; right:14px; bottom:14px; z-index:4;
        padding:5px 8px; background:#fff; border:1px solid #ddd; border-radius:5px;
        font:14px Helvetica,Arial,sans-serif; color:#333; }
      .rx-speaker-preview-setting select { font:inherit; margin-left:6px; }
    `;
    doc.head.append(style);
  }
  const card = doc.createElement('div');
  card.className = 'rx-speaker-title-card';
  card.innerHTML = '<span class="rx-next-label">Następny slajd</span><h2 class="rx-next-title"></h2><p class="rx-next-subtitle"></p>';
  const setting = doc.createElement('label');
  setting.className = 'rx-speaker-preview-setting';
  setting.innerHTML = 'Podgląd<select aria-label="Podgląd następnego slajdu"><option value="title">Tytuł</option><option value="slide">Slajd</option></select>';
  host.append(card, setting);
  const select = setting.querySelector('select');
  let mode = 'title';
  try { if (view.localStorage.getItem(storageKey) === 'slide') mode = 'slide'; } catch {}
  function applyMode() {
    select.value = mode;
    card.hidden = mode === 'slide';
    frame.classList.toggle('rx-hidden-preview', mode === 'title');
  }
  select.addEventListener('change', () => {
    mode = select.value;
    applyMode();
    try { view.localStorage.setItem(storageKey, mode); } catch {}
  });
  function render(state) {
    const current = deck.getSlide(state.indexh, state.indexv);
    const slides = deck.getSlides(), index = slides.indexOf(current);
    if (index < 0) return;
    const next = slides[index + 1];
    const heading = next?.querySelector('h1, h2, h3')?.textContent.replace(/\s+/g, ' ').trim();
    const fullTitle = next ? next.dataset.speakerTitle || heading || next.id || 'Następny slajd' : 'Koniec prezentacji';
    const [title, ...subtitle] = fullTitle.split(/\s+[—–]\s+/);
    card.querySelector('.rx-next-title').textContent = title;
    card.querySelector('.rx-next-subtitle').textContent = subtitle.join(' — ');
  }
  view.addEventListener('message', event => {
    if (event.source !== view.parent || event.origin !== view.location.origin) return;
    let data;
    try { data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data; } catch { return; }
    if (data?.method === 'setState' && data.args?.[0]) render(data.args[0]);
  });
  deck.on('ready', () => render(deck.getState()));
  applyMode();
}

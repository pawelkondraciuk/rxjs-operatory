// Format sceny Reveal. Projektor 4:3 jest domyślny; ?ratio=16:9 przywraca ekran panoramiczny.
// Szerokość jest wspólna, więc diagramy SVG mieszczą się w obu formatach.
export const FORMATS = {
  '4:3': { width: 1280, height: 960 },
  '16:9': { width: 1280, height: 720 },
};

const queryParts = search => search.replace(/^\?/, '').split('&').filter(Boolean);
const isRatio = part => part.split('=')[0] === 'ratio';

export function formatFromSearch(search = '') {
  const ratio = queryParts(search).filter(isRatio).map(part => decodeURIComponent(part.slice(6))).at(-1);
  return /^16[:x-]9$/i.test(ratio || '') ? '16:9' : '4:3';
}

function setFormat(search, format) {
  const parts = queryParts(search).filter(part => !isRatio(part));
  if (format === '16:9') parts.push('ratio=16:9');
  return parts.length ? `?${parts.join('&')}` : '';
}

// Linki wewnętrzne (?extras#/id, ./#/pytania) zachowują wybrany format.
export function withFormat(href, format) {
  const hashAt = href.indexOf('#');
  const beforeHash = hashAt < 0 ? href : href.slice(0, hashAt);
  const hash = hashAt < 0 ? '' : href.slice(hashAt);
  const queryAt = beforeHash.indexOf('?');
  const path = queryAt < 0 ? beforeHash : beforeHash.slice(0, queryAt);
  const search = queryAt < 0 ? '' : beforeHash.slice(queryAt);
  return `${path}${setFormat(search, format)}${hash}` || './';
}

// Klawisz W: ten sam slajd i fragment w drugim formacie.
export function toggledFormatUrl(href) {
  const url = new URL(href);
  const next = formatFromSearch(url.search) === '16:9' ? '4:3' : '16:9';
  return `${url.origin}${url.pathname}${setFormat(url.search, next)}${url.hash}`;
}

// Wysokość viewBox diagramu w 4:3 dla układu odtwarzacza (CSS: 552 lub 632 px przy szerokości 1280).
// Brak wpisu (16:9 albo scena bez formatu) zachowuje dotychczasową geometrię grafu.
export const GRAPH_HEIGHT = { '4:3': { default: 535, expanded: 612, function: 612 } };
// Tekst i kapsułki w diagramach 4:3 są większe; szerokość sceny pozostaje 1280.
export const TEXT_SCALE = { '4:3': 1.15 };
export const graphHeightFor = scene => GRAPH_HEIGHT[scene.format]?.[scene.playerLayout || 'default'];
export const textScaleFor = scene => TEXT_SCALE[scene.format] || 1;
// Etykiety kafelków (źródło, operator, odbiorca) mogą być jeszcze większe, gdy mieszczą się w szerokości.
export const LABEL_SCALE = { '4:3': 1.3 };
export const labelScaleFor = scene => LABEL_SCALE[scene.format] || textScaleFor(scene);

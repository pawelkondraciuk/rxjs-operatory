// Rysunkowe assety SVG dla ogólnego prymitywu graph.illustrations (opt-in).
// Każdy asset rysuje się w lokalnym układzie: środek w (0,0), rozmiar w jednostkach viewBox.
// Parametry (w, phase, arm, signal, press, cheer, …) wylicza model sceny w snapshot; tu tylko rysujemy.
// Bez importów: renderer ładuje ten moduł razem z primitives.js, a harness testów linkuje moduły współbieżnie.
const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const ink = '#26323B';
const line = `stroke="${ink}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"`;
const thin = `stroke="${ink}" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"`;
const n = value => +(+value).toFixed(2);
const serif = "'Palatino Linotype','Book Antiqua',Palatino,Georgia,'Times New Roman','Liberation Serif',serif";
const mono = 'Consolas,ui-monospace,monospace';

function apple({ size = 64 }) {
  const r = size / 2;
  return `<path d="M0 ${n(-r * .62)} C ${n(r * .55)} ${n(-r * 1.05)} ${n(r * 1.12)} ${n(-r * .55)} ${n(r * .98)} ${n(r * .12)} ` +
    `C ${n(r * .88)} ${n(r * .78)} ${n(r * .42)} ${n(r * 1.02)} 0 ${n(r * .82)} C ${n(-r * .42)} ${n(r * 1.02)} ${n(-r * .88)} ${n(r * .78)} ${n(-r * .98)} ${n(r * .12)} ` +
    `C ${n(-r * 1.12)} ${n(-r * .55)} ${n(-r * .55)} ${n(-r * 1.05)} 0 ${n(-r * .62)} Z" fill="#F4877C" ${line}/>` +
    `<path d="M${n(-r * .5)} ${n(-r * .2)} q ${n(r * .1)} ${n(-r * .3)} ${n(r * .35)} ${n(-r * .32)}" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".7"/>` +
    `<path d="M0 ${n(-r * .62)} q ${n(r * .05)} ${n(-r * .3)} ${n(r * .22)} ${n(-r * .45)}" fill="none" stroke="#7A4B2A" stroke-width="5" stroke-linecap="round"/>` +
    `<path d="M${n(r * .1)} ${n(-r * .82)} q ${n(r * .4)} ${n(-r * .4)} ${n(r * .72)} ${n(-r * .1)} q ${n(-r * .35)} ${n(r * .35)} ${n(-r * .72)} ${n(r * .1)} Z" fill="#8FD3A5" ${thin}/>`;
}

function pear({ size = 64 }) {
  const r = size / 2;
  return `<path d="M0 ${n(-r * 1.05)} C ${n(r * .38)} ${n(-r * 1.05)} ${n(r * .42)} ${n(-r * .45)} ${n(r * .55)} ${n(-r * .15)} ` +
    `C ${n(r * 1.02)} ${n(r * .25)} ${n(r * .95)} ${n(r * 1)} 0 ${n(r * 1)} C ${n(-r * .95)} ${n(r * 1)} ${n(-r * 1.02)} ${n(r * .25)} ${n(-r * .55)} ${n(-r * .15)} ` +
    `C ${n(-r * .42)} ${n(-r * .45)} ${n(-r * .38)} ${n(-r * 1.05)} 0 ${n(-r * 1.05)} Z" fill="#D7E37E" ${line}/>` +
    `<path d="M${n(-r * .48)} ${n(r * .2)} q ${n(r * .02)} ${n(r * .4)} ${n(r * .3)} ${n(r * .55)}" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".7"/>` +
    `<path d="M0 ${n(-r * 1.05)} q ${n(-r * .05)} ${n(-r * .25)} ${n(r * .15)} ${n(-r * .4)}" fill="none" stroke="#7A4B2A" stroke-width="5" stroke-linecap="round"/>`;
}

// Szklanka soku: szerszy wylot, pomarańczowy sok, słomka.
function glass({ size = 68 }) {
  const h = size, top = h * .38, bottom = h * .3;
  return `<path d="M${n(top * .45)} ${n(-h * .62)} l ${n(top * .3)} ${n(-h * .28)}" fill="none" stroke="#7457D9" stroke-width="6" stroke-linecap="round"/>` +
    `<path d="M${n(-top)} ${n(-h / 2)} L ${n(top)} ${n(-h / 2)} L ${n(bottom)} ${n(h / 2)} L ${n(-bottom)} ${n(h / 2)} Z" fill="#FFF8EC" ${line}/>` +
    `<path d="M${n(-top * .9)} ${n(-h * .22)} L ${n(top * .9)} ${n(-h * .22)} L ${n(bottom * .92)} ${n(h * .44)} L ${n(-bottom * .92)} ${n(h * .44)} Z" fill="#FFC15C"/>` +
    `<path d="M${n(-top * .9)} ${n(-h * .22)} L ${n(top * .9)} ${n(-h * .22)}" stroke="#E89A24" stroke-width="3"/>` +
    `<path d="M${n(-top * .55)} ${n(-h * .1)} L ${n(-bottom * .6)} ${n(h * .3)}" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".75"/>`;
}

// Podajnik: skrzynia z owocami i otworem przy prawym dole (wylot na taśmę).
function feeder({ w = 170, h = 220 }) {
  const x = -w / 2, y = -h / 2;
  return `<path d="M${n(x - 14)} ${n(y)} L ${n(x + w + 14)} ${n(y)} L ${n(x + w)} ${n(y + h * .35)} L ${n(x)} ${n(y + h * .35)} Z" fill="#B0A0E6" ${line}/>` +
    `<circle cx="${n(-w * .22)}" cy="${n(y - 8)}" r="22" fill="#F4877C" ${thin}/><circle cx="${n(w * .12)}" cy="${n(y - 12)}" r="20" fill="#D7E37E" ${thin}/>` +
    `<circle cx="${n(w * .36)}" cy="${n(y - 4)}" r="18" fill="#F4877C" ${thin}/>` +
    `<path d="M${n(x - 14)} ${n(y)} L ${n(x + w + 14)} ${n(y)}" ${line}/>` +
    `<rect x="${n(x)}" y="${n(y + h * .35)}" width="${n(w)}" height="${n(h * .65)}" rx="12" fill="#CFC5F0" ${line}/>` +
    `<rect x="${n(x + w - 50)}" y="${n(h / 2 - 104)}" width="50" height="98" rx="8" fill="#5B4A8F" ${thin}/>` +
    `<circle cx="${n(x + 34)}" cy="${n(y + h * .55)}" r="10" fill="#fff" ${thin}/><circle cx="${n(x + 64)}" cy="${n(y + h * .55)}" r="10" fill="#fff" ${thin}/>`;
}

// Taśma: pas z przesuwającymi się kreskami i obracającymi się rolkami (phase = przebyta droga).
function belt({ w = 900, h = 30, phase = 0, roller = 13, legs = [] }) {
  const x = -w / 2, step = 120, spin = phase / roller * 180 / Math.PI;
  let svg = legs.map(lx => `<path d="M${n(lx - 14)} ${n(h / 2 + 4)} L ${n(lx - 22)} ${n(h / 2 + 64)} M${n(lx + 14)} ${n(h / 2 + 4)} L ${n(lx + 22)} ${n(h / 2 + 64)}" ${line}/>`).join('');
  svg += `<rect x="${n(x)}" y="${n(-h / 2)}" width="${n(w)}" height="${n(h)}" rx="${n(h / 2)}" fill="#5E6B77" ${line}/>`;
  svg += `<path d="M${n(x + h / 2)} ${n(-h / 2 + 5)} L ${n(x + w - h / 2)} ${n(-h / 2 + 5)}" stroke="#ECE6DA" stroke-width="4" stroke-dasharray="26 22" stroke-dashoffset="${n(-phase)}"/>`;
  for (let rx = x + h / 2; rx <= x + w - h / 2 + 1; rx += step) {
    svg += `<g transform="translate(${n(rx)} 0) rotate(${n(spin % 360)})"><circle r="${roller}" fill="#ECE6DA" ${thin}/>` +
      `<path d="M${-roller + 4} 0 L ${roller - 4} 0" stroke="${ink}" stroke-width="3" stroke-linecap="round"/></g>`;
  }
  return svg;
}

// Bramka: łuk nad taśmą, tabliczka z jabłkiem i ramię spychające (arm 0..1). signal: pass | reject | ''.
function gate({ h = 150, w = 120, arm = 0, signal = '' }) {
  const posts = `<rect x="${n(-w / 2 - 12)}" y="${n(-h)}" width="20" height="${n(h)}" rx="6" fill="#E7B5F1" ${line}/>` +
    `<rect x="${n(w / 2 - 8)}" y="${n(-h)}" width="20" height="${n(h)}" rx="6" fill="#E7B5F1" ${line}/>` +
    `<rect x="${n(-w / 2 - 22)}" y="${n(-h - 30)}" width="${n(w + 44)}" height="44" rx="14" fill="#E7B5F1" ${line}/>`;
  const lamp = signal === 'pass' ? '#3FB56B' : signal === 'reject' ? '#D9534F' : '#FFF8EC';
  const mark = signal === 'reject'
    ? `<path d="M-9 ${n(-h - 17)} l 18 18 M9 ${n(-h - 17)} l -18 18" stroke="#fff" stroke-width="5" stroke-linecap="round"/>`
    : signal === 'pass' ? `<path d="M-10 ${n(-h - 8)} l 7 8 l 13 -16" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>` : '';
  const sign = `<g transform="translate(${n(-w * .18)} ${n(-h - 8)}) scale(.62)">${apple({ size: 52 })}</g>` +
    `<circle cx="${n(w * .26)}" cy="${n(-h - 8)}" r="15" fill="${lamp}" ${thin}/>${mark}`;
  // Ramię spoczywa wzdłuż lewego słupka; przy odrzuceniu opada na taśmę i spycha owoc.
  const angle = -90 + 112 * arm;
  const paddle = `<g transform="translate(${n(-w / 2 - 2)} ${n(-h * .6)}) rotate(${n(angle)})">` +
    `<rect x="0" y="-8" width="${n(h * .56)}" height="16" rx="8" fill="#B384C6" ${thin}/><circle r="10" fill="#fff" ${thin}/></g>`;
  return posts + paddle + sign;
}

// Skrzynka na odrzucone owoce (pod taśmą).
function bin({ w = 150, h = 90 }) {
  const x = -w / 2, y = -h / 2;
  return `<path d="M${n(x)} ${n(y)} L ${n(x + w)} ${n(y)} L ${n(x + w - 12)} ${n(y + h)} L ${n(x + 12)} ${n(y + h)} Z" fill="#E7D3B0" ${line}/>` +
    `<path d="M${n(x + 8)} ${n(y + h * .38)} L ${n(x + w - 8)} ${n(y + h * .38)} M${n(x + 10)} ${n(y + h * .7)} L ${n(x + w - 10)} ${n(y + h * .7)}" ${thin}/>`;
}

// Wyciskarka: korpus z tunelem nad taśmą i tłok na górze (press 0..1).
function juicer({ w = 150, h = 150, press = 0 }) {
  const x = -w / 2, top = -h, drop = 12 * press;
  return `<rect x="-14" y="${n(top - 26 + drop)}" width="28" height="40" rx="6" fill="#ECE6DA" ${line}/>` +
    `<rect x="-40" y="${n(top - 40 + drop)}" width="80" height="20" rx="8" fill="#9D86E6" ${line}/>` +
    `<rect x="${n(x)}" y="${n(top)}" width="${n(w)}" height="${n(h - 6)}" rx="18" fill="#E7B5F1" ${line}/>` +
    `<rect x="${n(x + 16)}" y="${n(top + 20)}" width="${n(w - 32)}" height="48" rx="10" fill="#FFF8EC" ${thin}/>` +
    `<rect x="${n(x + 22)}" y="${n(top + 46 - 20 * press)}" width="${n(w - 44)}" height="${n(16 + 20 * press)}" rx="6" fill="#FFC15C"/>` +
    `<circle cx="${n(x + 30)}" cy="${n(top + 92)}" r="10" fill="#fff" ${thin}/><circle cx="${n(x + 58)}" cy="${n(top + 92)}" r="10" fill="#3FB56B" ${thin}/>`;
}

// Odbiorca: postać za stołem (stół na wysokości taśmy); cheer 0..1 unosi ręce i poszerza uśmiech.
function receiver({ w = 150, cheer = 0 }) {
  // Ręce: w spoczynku opuszczone, przy cheer = 1 uniesione.
  const hx = 58 + 6 * cheer, hy = -34 - 116 * cheer;
  return `<path d="M-30 -78 L ${n(-hx)} ${n(hy)} M30 -78 L ${n(hx)} ${n(hy)}" stroke="${ink}" stroke-width="9" stroke-linecap="round"/>` +
    `<path d="M-38 -24 L -38 -82 Q 0 -104 38 -82 L 38 -24 Z" fill="#8CD0DA" ${line}/>` +
    `<circle cx="0" cy="-128" r="34" fill="#FCE3C8" ${line}/>` +
    `<circle cx="-12" cy="-134" r="4.5" fill="${ink}"/><circle cx="12" cy="-134" r="4.5" fill="${ink}"/>` +
    `<path d="M${n(-12 - 4 * cheer)} -116 Q 0 ${n(-108 + 6 * cheer)} ${n(12 + 4 * cheer)} -116" fill="none" stroke="${ink}" stroke-width="4" stroke-linecap="round"/>` +
    `<path d="M-30 -150 Q 0 -176 30 -150 Q 10 -160 -30 -150 Z" fill="#7A4B2A" ${thin}/>` +
    `<rect x="${n(-w / 2)}" y="-22" width="${n(w)}" height="20" rx="6" fill="#E7D3B0" ${line}/>` +
    `<path d="M${n(-w / 2 + 16)} -2 L ${n(-w / 2 + 16)} 60 M${n(w / 2 - 16)} -2 L ${n(w / 2 - 16)} 60" ${line}/>`;
}

// Klamra nad kilkoma maszynami (szerokość w).
function bracket({ w = 400 }) {
  return `<path d="M${n(-w / 2)} 18 Q ${n(-w / 2)} 0 ${n(-w / 2 + 18)} 0 L -14 0 Q 0 0 0 -9 Q 0 0 14 0 L ${n(w / 2 - 18)} 0 Q ${n(w / 2)} 0 ${n(w / 2)} 18" fill="none" stroke="#805095" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function label({ text = '', font = 32, ink: color = ink, family = 'sans', weight = 700, italic = false, anchor = 'middle' }) {
  const face = family === 'serif' ? serif : family === 'mono' ? mono : 'inherit';
  return `<text x="0" y="0" font-size="${n(font)}" text-anchor="${anchor}" dominant-baseline="middle" style="font-family:${face};font-weight:${weight};${italic ? 'font-style:italic;' : ''}fill:${color}">${esc(text)}</text>`;
}

const assets = { apple, pear, glass, feeder, belt, gate, bin, juicer, receiver, bracket, label };

export function illustration(item) {
  const draw = assets[item.asset];
  if (!draw) throw new Error(`Nieznany asset ilustracji: ${item.asset}`);
  const opacity = item.opacity ?? 1;
  if (opacity <= 0) return '';
  const transform = `translate(${n(item.x)} ${n(item.y)})${item.rotate ? ` rotate(${n(item.rotate)})` : ''}${item.scale !== undefined && item.scale !== 1 ? ` scale(${n(item.scale)})` : ''}`;
  return `<g data-illustration="${esc(item.id)}" data-asset="${esc(item.asset)}" transform="${transform}"${opacity < 1 ? ` opacity="${n(opacity)}"` : ''}>${draw(item)}</g>`;
}

// Intro dla początkujących (01a-fabryka-soku): rysunkowa fabryka soku na taśmociągu, bez kodu.
// Podajnik (źródło) → bramka „tylko jabłka” (filter) → wyciskarka (map) → odbiorca ze szklankami.
// Cały ruch wynika z jednej drogi taśmy d(t): owoce trzymają odstępy, a przy postoju taśmy wszystko stoi.
// Czas jest wyłącznie ilustracyjny — to nie jest model buforowania ani asynchronicznej pracy operatorów.
import { clamp } from './primitives.js';

export const juiceFruits = ['apple', 'pear', 'apple'];
export const juicePunchline = 'Opisujesz, co zrobić z kolejną wartością, kiedy się pojawi.';
// Cztery etapy taśmy (czas ilustracji, droga w jednostkach viewBox) i chwile odsłonięcia podpisów.
export const juiceStages = [
  { id: 'source', from: .2, to: 3.4, d0: 0, d1: 250 },
  { id: 'gate', from: 3.7, to: 6.7, d0: 250, d1: 540 },
  { id: 'juicer', from: 7, to: 10.6, d0: 540, d1: 935 },
  { id: 'receiver', from: 10.9, to: 12.9, d0: 935, d1: 1215 },
];
export const juiceLabels = { source: .3, gate: 3.75, juicer: 7.05, operators: 9.9, receiver: 10.95, punchline: 12.9 };
export const juiceTiming = { fade: .4, stopGap: .2, tail: .6 };
const round = time => Math.round(time * 1e6) / 1e6;
const ease = u => u * u * (3 - 2 * u);
const X = { start: 110, spacing: 100, gate: 390, juicerIn: 700, juicerMid: 750, juicerOut: 800, beltStart: 150, beltEnd: 1090 };
const slots = [1188, 1124];

export function beltAt(time) {
  let d = 0;
  for (const stage of juiceStages) if (time >= stage.from) d = stage.d0 + (stage.d1 - stage.d0) * ease(clamp((time - stage.from) / (stage.to - stage.from)));
  return d;
}
// Kadr dla ograniczonego ruchu: rozpoczęty etap od razu w stanie końcowym, podpisy w pełni widoczne.
export function juiceStillTime(time) {
  const started = juiceStages.filter(stage => time >= stage.from).at(-1);
  if (!started) return time;
  const last = started === juiceStages.at(-1);
  return Math.max(time, last ? juiceLabels.punchline + juiceTiming.fade : started.to);
}

export function juiceLayout(scene) {
  const wide = scene.format !== '4:3';
  const height = wide ? 530 : 690, beltY = wide ? 304 : 370;
  return { wide, height, beltY, beltTop: beltY - 15, labelY: beltY - 214, bracketY: beltY - 246, operatorsY: beltY - 278,
    underY: beltY + (wide ? 92 : 96), binY: beltY + (wide ? 66 : 82), binH: wide ? 70 : 90,
    punchY: beltY + (wide ? 166 : 222), punchFont: wide ? 32 : 40, punchStep: wide ? 38 : 52 };
}

// Stan wszystkich rysunków w chwili time (czysta funkcja; cofanie nie wymaga poprzednich klatek).
export function juiceFactoryItems(scene, time) {
  const L = juiceLayout(scene), d = beltAt(time), fade = at => clamp((time - at) / juiceTiming.fade);
  const fruitY = L.beltTop - 32, glassY = L.beltTop - 36, items = [];
  const positions = juiceFruits.map((kind, i) => ({ kind, i, x: X.start + d - i * X.spacing, born: d > i * X.spacing }));
  const pear = positions[1], pearU = clamp((pear.x - X.gate) / 120);
  const apples = positions.filter(p => p.kind === 'apple');
  const inJuicer = apples.some(p => p.x > X.juicerIn - 20 && p.x < X.juicerOut + 20);
  const nearGate = (p, before, after) => p.born && p.x > X.gate - before && p.x < X.gate + after;
  const signal = nearGate(pear, 70, 40) && pearU < 1 ? 'reject' : apples.some(p => nearGate(p, 50, 40)) ? 'pass' : '';
  const arm = pear.born ? clamp((pear.x - (X.gate - 70)) / 60) * (1 - clamp((pear.x - (X.gate + 60)) / 60)) : 0;
  const onTable = apples.filter((p, j) => p.x >= slots[j]).length;
  const cheer = clamp(onTable / 2 + (onTable ? .1 * Math.sin(time * 6) : 0));

  items.push({ id: 'bin', asset: 'bin', x: X.gate + 80, y: L.binY, w: 150, h: L.binH });
  items.push({ id: 'belt', asset: 'belt', x: (X.beltStart + X.beltEnd) / 2, y: L.beltY, w: X.beltEnd - X.beltStart, h: 30, phase: d,
    legs: [-400, 0, 400] });
  // Bramka i odbiorca stoją za owocami (owoc przejeżdża pod łukiem); podajnik i wyciskarka przykrywają owoc.
  items.push({ id: 'gate', asset: 'gate', x: X.gate, y: L.beltTop, h: 150, w: 110, arm, signal });
  // Odbiorca stoi za stołem; szklanki stają przed nim.
  items.push({ id: 'receiver', asset: 'receiver', x: 1160, y: L.beltTop + 22, w: 150, cheer });
  for (const p of positions) {
    if (!p.born) continue;
    if (p.kind === 'pear' && p.x >= X.gate) {
      // Gruszka zjeżdża z taśmy do skrzynki (łuk w dół), dalej leży w skrzynce.
      items.push({ id: 'fruit-1', asset: 'pear', x: X.gate + 80 * pearU, y: fruitY + (L.binY - 6 - fruitY) * pearU * pearU, rotate: 80 * pearU, size: 64 });
      continue;
    }
    if (p.kind === 'pear') { items.push({ id: 'fruit-1', asset: 'pear', x: p.x, y: fruitY, size: 64 }); continue; }
    const slot = slots[apples.indexOf(p)];
    if (p.x > X.juicerMid) items.push({ id: `fruit-${p.i}`, asset: 'glass', x: Math.min(p.x, slot), y: glassY, size: 68 });
    else items.push({ id: `fruit-${p.i}`, asset: 'apple', x: p.x, y: fruitY, size: 64 });
  }
  // Maszyny rysowane na owocach: owoc znika w podajniku i w tunelu wyciskarki.
  items.push({ id: 'feeder', asset: 'feeder', x: 92, y: L.beltY - 70, w: 150, h: 200 });
  items.push({ id: 'juicer', asset: 'juicer', x: X.juicerMid, y: L.beltTop + 22, w: 150, h: 150,
    press: inJuicer ? .5 + .5 * Math.sin(time * 14) : 0, rotate: inJuicer ? 1.6 * Math.sin(time * 31) : 0 });
  // Napisy: role w fabryce, potem nazwy z RxJS dopiero w notatkach prelegenta.
  const text = (id, x, y, value, at, extra = {}) => items.push({ id, asset: 'label', x, y, text: value, opacity: fade(at), font: 34, ...extra });
  text('label-source', 92, L.underY, 'Źródło', juiceLabels.source, { ink: '#5B3FC4' });
  text('label-gate', X.gate, L.labelY, 'Tylko jabłka', juiceLabels.gate, { font: 30, ink: '#805095' });
  text('label-juicer', X.juicerMid, L.labelY, 'Zamień na sok', juiceLabels.juicer, { font: 30, ink: '#805095' });
  items.push({ id: 'bracket', asset: 'bracket', x: (X.gate + X.juicerMid) / 2, y: L.bracketY, w: X.juicerMid - X.gate + 220, opacity: fade(juiceLabels.operators) });
  text('label-operators', (X.gate + X.juicerMid) / 2, L.operatorsY, 'Operatory', juiceLabels.operators, { ink: '#805095' });
  text('label-receiver', 1160, L.underY, 'Odbiorca', juiceLabels.receiver, { ink: '#0B6F8F' });
  const [first, second] = ['Opisujesz, co zrobić z kolejną wartością,', 'kiedy się pojawi.'];
  for (const [i, value] of [first, second].entries())
    text(`punchline-${i}`, 620, L.punchY + i * L.punchStep, value, juiceLabels.punchline,
      { font: L.punchFont, family: 'serif', weight: 700, italic: true, ink: '#26323B' });
  return items;
}

export function juiceFactoryGraph(scene) {
  const L = juiceLayout(scene);
  return { layout: 'fixed', formatAware: true, width: 1240, height: L.height, nodes: [], edges: [], trays: [],
    illustrations: time => juiceFactoryItems(scene, time), illustrationStill: juiceStillTime };
}

export const juiceCaptions = [
  [0, 'Mała fabryka: podajnik, taśma, dwie maszyny i odbiorca.'],
  [juiceStages[0].from, 'Wartości pojawiają się w czasie — jedna po drugiej.'],
  [juiceStages[1].from, 'Wybierasz, co Cię interesuje: gruszka zjeżdża na bok.'],
  [juiceStages[2].from, 'Przekształcasz wartości: jedno jabłko → jedna szklanka soku.'],
  [juiceStages[3].from, 'Odbiorca dostaje gotowy wynik.'],
];

export function configureJuiceFactory(scene) {
  const stops = juiceStages.slice(0, 3).map(stage => ({ id: stage.id, time: round(stage.to + juiceTiming.stopGap), autoPause: true }));
  Object.assign(scene, {
    title: 'RxJS — o co w tym chodzi?', code: '', codeSyntax: false, rows: [], metrics: [],
    duration: round(juiceLabels.punchline + juiceTiming.fade + juiceTiming.tail), captions: juiceCaptions,
    playerLayout: 'expanded', playerClass: 'rx-juice-factory',
    playback: { controller: 'stages', entry: 'manual', finish: 'hold', resetOnExit: true, stops },
  });
  scene.graph = juiceFactoryGraph(scene);
  return scene;
}

// Osobny przebieg wyłącznie dla slajdu 04-operator.
// Czas oznacza tempo ilustracji, nie opóźnienie synchronicznego map.
export function renderOperator(scene, time) {
  const { subscribeAt, connectedAt, unsubscribeAt, disconnectedAt, travel, transform } = scene.flow;
  const clamp = value => Math.max(0, Math.min(1, value));
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
  const text = (x, y, value, size = 24, attributes = '') => `<text x="${x}" y="${y}" font-size="${size}" text-anchor="middle" dominant-baseline="middle" ${attributes}>${escape(value)}</text>`;
  const incoming = [[255, 300], [410, 300]];
  const outgoing = [[690, 300], [840, 300]];
  const segments = [incoming, outgoing];
  const length = segments.reduce((sum, [start, end]) => sum + end[0] - start[0], 0);
  const at = (route, fraction) => {
    const position = clamp(fraction) * (route.length - 1);
    const index = Math.min(route.length - 2, Math.floor(position));
    return route[index].map((value, axis) => value + (route[index + 1][axis] - value) * (position - index));
  };
  const progress = time < unsubscribeAt
    ? clamp((time - subscribeAt) / (connectedAt - subscribeAt))
    : 1 - clamp((time - unsubscribeAt) / (disconnectedAt - unsubscribeAt));
  const connected = time >= connectedAt && time < unsubscribeAt;
  const emissionDuration = Math.min(.35, travel / 2);
  const emitting = scene.rows[0].events.some(event => time >= event.at && time < event.at + emissionDuration);
  const transforming = scene.rows[0].events.find(event => time >= event.at + travel && time < event.at + travel + transform && event.at < unsubscribeAt);
  const receiving = scene.rows[2].events.some(event => time >= event.at && time < event.at + .5);
  const received = scene.rows[2].events.filter(event => event.at <= time);
  let svg = `<svg viewBox="0 130 1100 400" role="img" aria-label="Źródło, map i odbiorca. ${connected ? 'Aktywna subskrypcja.' : progress > 0 ? 'Zmiana połączenia.' : 'Brak połączenia.'}">`;

  // Proste paski wydłużają się kolejno przy subscribe i cofają przy unsubscribe.
  // Animujemy rzeczywiste końce odcinków, bez nieruchomej linii pod spodem.
  let remaining = progress * length;
  for (const [start, end] of (time < unsubscribeAt ? [...segments].reverse() : segments)) {
    const visibleLength = Math.max(0, Math.min(end[0] - start[0], remaining));
    if (visibleLength > 0) {
      const x1 = time < unsubscribeAt ? end[0] - visibleLength : start[0];
      const x2 = time < unsubscribeAt ? end[0] : start[0] + visibleLength;
      svg += `<line data-subscription="true" data-progress="${progress}" x1="${x1}" y1="${start[1]}" x2="${x2}" y2="${end[1]}" stroke="#111" stroke-width="6"/>`;
    }
    remaining -= end[0] - start[0];
  }
  if (time >= subscribeAt && time < connectedAt) svg += text(550, 175, 'subscribe()', 30);
  else if (connected) svg += text(550, 175, 'Subskrypcja aktywna', 24);
  else if (time >= unsubscribeAt && time < disconnectedAt) svg += text(550, 175, 'unsubscribe()', 30);
  else if (time >= disconnectedAt) svg += text(550, 175, 'Subskrypcja zamknięta', 24);

  const blocks = [
    { id: 'source', x: 160, width: 190, label: 'Źródło', fill: '#8cd0da' },
    { id: 'map', x: 550, width: 280, label: 'map(x ⇒ x × 10)', fill: '#e7b5f1' },
    { id: 'observer', x: 960, width: 240, label: 'Odbiorca', fill: '#b0a0e6' },
  ];
  for (const block of blocks) {
    const highlight = { source: emitting, map: transforming, observer: receiving }[block.id];
    const isObserver = block.id === 'observer';
    svg += `<g data-node="${block.id}" data-active="${Boolean(highlight)}"><rect x="${block.x - block.width / 2}" y="260" width="${block.width}" height="${isObserver ? 134 : 80}" rx="5" fill="${block.fill}" stroke="${highlight ? '#805095' : 'none'}" stroke-width="4"/>${text(block.x, isObserver ? 290 : 300, block.label, 26)}`;
    if (isObserver) svg += `<path d="M842 318 H1078 V389 Q1078 392 1075 392 H845 Q842 392 842 389 Z" fill="#d4ccf1"/>`;
    svg += '</g>';
  }
  const token = (position, value, phase, color) => `<g data-token="${phase}"><circle cx="${position[0]}" cy="${position[1]}" r="25" fill="${color}" stroke="#fff" stroke-width="3"/>${text(position[0], position[1] + 1, value, 25)}</g>`;
  for (const event of scene.rows[0].events) {
    const age = time - event.at;
    if (age < 0) continue;
    if (event.at >= unsubscribeAt) {
      if (age < 1.5) svg += `<g opacity="${1 - age / 1.5}">${token([160, 225 - age * 35], event.value, 'unobserved', '#ffc15c')}</g>`;
      continue;
    }
    if (age < emissionDuration) svg += token([160, 225], event.value, 'emitting', '#ffc15c');
    else if (age < travel) svg += token(at(incoming, (age - emissionDuration) / (travel - emissionDuration)), event.value, 'to-map', '#ffc15c');
    else if (age < travel + transform) {
      svg += token([550, 225], event.value, 'in-map', '#ffc15c');
      svg += text(550, 385, `${event.value} × 10 = ${Number(event.value) * 10}`, 30, 'data-transformation="true"');
    }
    else if (age < 2 * travel + transform) svg += token(at(outgoing, (age - travel - transform) / travel), Number(event.value) * 10, 'to-observer', '#e7b5f1');
  }
  if (!received.length) svg += text(960, 355, 'Czeka na wartości', 20);
  received.forEach((event, i) => { svg += token([890 + i * 70, 355], event.value, 'received', '#c9c0ff'); });
  return svg + '</svg>';
}

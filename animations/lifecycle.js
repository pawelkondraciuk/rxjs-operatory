export const palette = {
  source: '#8cd0da', observer: '#b0a0e6', work: '#ffc15c',
  complete: '#087438', error: '#b51e2e', wire: '#111',
};

// A i B są rolami na danym połączeniu. Czas ruchu służy wyłącznie ilustracji.
export const transitionDuration = 0.8;
export function terminal(row) {
  if (!row) return null;
  const candidates = [
    ...(row.completeAt === undefined ? [] : [{ at: row.completeAt, kind: 'complete' }]),
    ...row.events.filter(e => e.kind === 'error').map(e => ({ at: e.at, kind: 'error' })),
    ...row.spans.filter(p => p.kind === 'cancel' || p.kind === 'subscription').map(p => ({ at: p.end, kind: 'unsubscribe' })),
  ];
  // Błąd pracy wewnętrznej nie musi kończyć całego potoku z catchError.
  if (row.completeAt === undefined && row.events.every(e => e.value === 'cleanup')) {
    candidates.push(...row.spans.filter(p => p.kind === 'error').map(p => ({ at: p.end, kind: 'error' })));
  }
  return candidates.sort((a, b) => a.at - b.at || (a.kind === 'unsubscribe' ? 1 : -1))[0] || null;
}

export function connectionState(time, start, end, events = []) {
  const clamp = n => Math.max(0, Math.min(1, n));
  if (time < start) return { offset: 1, color: palette.wire, phase: 'waiting' };
  const lastValueAt = end ? Math.max(-Infinity,...events.filter(e => e.at <= end.at && e.kind !== 'error').map(e=>e.at)) : -Infinity;
  const finishAt = end ? Math.max(end.at, end.kind === 'unsubscribe' ? end.at : lastValueAt + transitionDuration) : Infinity;
  if (end && time >= finishAt) {
    const progress = clamp((time - finishAt) / transitionDuration);
    return { offset: end.kind === 'unsubscribe' ? progress : -progress,
      color: palette[end.kind] || palette.wire, phase: end.kind, done: progress === 1 };
  }
  return { offset: -(1 - clamp((time - start) / transitionDuration)), color: palette.wire, phase: 'subscribed' };
}

// Układ poziomy wykorzystuje szerokość ekranu zamiast pomniejszać pionowy diagram.
export function layoutDiagram(nodes, edges, trays, width = 1240, height = 460) {
  const links = edges.filter(e => !e.dashed);
  const anchors = trays.map(q => {
    const candidates = nodes.filter(n => n.ri === q.ri || n.output || !links.some(e=>e.a===n));
    return (candidates.length ? candidates : nodes).slice().sort((a,b) =>
      Math.hypot(a.x-q.x,a.y+100-q.y) - Math.hypot(b.x-q.x,b.y+100-q.y))[0];
  });
  const ranks = new Map(nodes.map(n => [n, 0]));
  for (let i=0;i<nodes.length;i++) {
    let changed = false;
    links.forEach(e => {
      const next = ranks.get(e.a)+1;
      if (ranks.get(e.b)<next) { ranks.set(e.b,next); changed=true; }
    });
    if (!changed) break;
  }
  const depth = Math.max(...ranks.values(), 0)+1;
  const pitch = (width-40)/depth;
  for (let rank=0;rank<depth;rank++) {
    const column = nodes.filter(n => ranks.get(n) === rank).sort((a,b) => a.y-b.y || a.x-b.x);
    const step = (height-40)/Math.max(column.length,1);
    column.forEach((n,i) => {
      n.x = 20+pitch*(rank+.5);
      n.y = 15+step*(i+.5)-20;
      n.w = Math.min(pitch-75, depth===1?680:310);
      n.h = column.length>3?54:76;
    });
  }
  trays.forEach((q,i) => {
    const n=anchors[i];
    q.anchor=n.id;
    q.x=n.x;q.y=n.y+n.h/2+77;q.w=Math.min(pitch-40,400);
    q.label='';
  });
  return links;
}

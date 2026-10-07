const fs = require('fs');
const source = fs.readFileSync('C:/Users/Pawel/Downloads/Wklejony tekst.txt', 'utf8');
const ids = new Map();
for (const card of source.split('<div class="x14vqqas x1nb4dca x1q0q8m5 xso031l xsag5q8">')) {
  const text = card.replace(/<[^>]+>/g, ' ');
  if (!/(?:meet\.js|JavaScript).*Bia[łl]ystok/i.test(text) || /workshop|Coding Dojo/i.test(text)) continue;
  const num = text.match(/#(\d+)\b/);
  const id = card.match(/facebook\.com\/events\/(\d+)\//);
  if (num && id) ids.set(Number(num[1]), id[1]);
}
ids.set(50, '757606302359904');
ids.set(54, '283272561257605');
if (ids.size !== 62) throw new Error(`Expected 62 events, got ${ids.size}`);
let html = fs.readFileSync('index.html', 'utf8');
let count = 0;
html = html.replace(/(<li class="tl-[^>]+aria-label="([^"]+)"[^>]*>)(<span class="tl-num">#(\d+)<\/span>[^<]+)(<\/li>)/g, (all, start, label, content, num, end) => {
  const id = ids.get(Number(num));
  if (!id) return all;
  count++;
  return `${start}<a href="https://www.facebook.com/events/${id}/" target="_blank" rel="noopener noreferrer" aria-label="${label}">${content}</a>${end}`;
});
if (count !== 62) throw new Error(`Expected 62 links, got ${count}`);
fs.writeFileSync('index.html', html);
console.log(`Added ${count} event links, including #50 and #54.`);

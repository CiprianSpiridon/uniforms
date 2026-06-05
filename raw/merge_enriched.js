/* Merge the enrich-products workflow output into the approved data files.
 * Keeps cross-sell rail metadata (appliesTo/gating) and swaps in real, image-rich products.
 * Uniforms -> sample-products.json with year ranges inferred from product names. */
const fs = require('fs');
const path = require('path');
const OUT = path.join(__dirname, '..', 'data');
const src = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')).result;

const railData = {};
src.rails.filter(Boolean).forEach((r) => (railData[r.key] = r.items));

const cleanTag = (t) => (!t || /%|\boff\b|sale/i.test(t)) ? null : t;
const mapItem = (it) => ({
  name: it.name.replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim(),
  brand: it.brand || null,
  priceAed: it.priceAed,
  originalPriceAed: it.originalPriceAed || null,
  discountPct: it.discountPct || null,
  image: it.image || null,
  url: it.url && it.url.startsWith('http') ? it.url : ('https://www.mumzworld.com' + (it.url || '')),
  rating: it.rating || null,
  reviews: it.reviews || null,
  tag: cleanTag(it.tag)
});

// ---- cross-sell.json : keep metadata, swap items ----
const cs = JSON.parse(fs.readFileSync(path.join(OUT, 'cross-sell.json'), 'utf8'));
cs.rails.forEach((rail) => {
  if (railData[rail.key]) rail.items = railData[rail.key].map(mapItem);
});
cs.note = cs.note.replace('Demo items are real Mumzworld SKUs', 'Items are real Mumzworld SKUs (scraped with images, prices, discounts & ratings)');
fs.writeFileSync(path.join(OUT, 'cross-sell.json'), JSON.stringify(cs, null, 2) + '\n');

// ---- sample-products.json : enriched uniforms ----
const ORDER = ['FS1','FS2','Y1','Y2','Y3','Y4','Y5','Y6','Y7','Y8','Y9','Y10','Y11','Y12','Y13'];
const idx = (tok) => {
  tok = tok.toUpperCase().replace(/YEAR|Y/g, '').replace(/\s/g, '');
  return -1;
};
function parseYears(name) {
  const N = name.toUpperCase();
  const m = N.match(/(FS\s?\d|YEAR\s?\d{1,2}|Y\s?\d{1,2})\s*[-/]\s*(FS\s?\d|YEAR\s?\d{1,2}|Y?\s?\d{1,2})/);
  if (!m) return [];
  const norm = (t, prevIsY) => {
    t = t.toUpperCase().replace(/\s/g, '');
    if (t.startsWith('FS')) return 'FS' + t.replace(/\D/g, '');
    const n = t.replace(/\D/g, '');
    return 'Y' + n;
  };
  let a = norm(m[1]);
  let b = m[2].toUpperCase().replace(/\s/g, '');
  b = b.startsWith('FS') ? 'FS' + b.replace(/\D/g, '') : 'Y' + b.replace(/\D/g, '');
  const ia = ORDER.indexOf(a), ib = ORDER.indexOf(b);
  if (ia === -1 || ib === -1) return [];
  return ORDER.slice(Math.min(ia, ib), Math.max(ia, ib) + 1);
}
const genderOf = (name, g) => {
  if (g && /BOYS|GIRLS|UNISEX/i.test(g)) return g.toUpperCase();
  const N = name.toUpperCase();
  if (/\bGIRLS?\b|BLOUSE|PINAFORE|SKORT|SKIRT/.test(N)) return 'GIRLS';
  if (/\bBOYS?\b/.test(N)) return 'BOYS';
  return 'UNISEX';
};
const typeOf = (name, t) => {
  if (t && /CORE|PE|WINTER/i.test(t)) return t.toUpperCase().includes('PE') ? 'PE' : t.toUpperCase().includes('WINTER') ? 'WINTER UNIFORM' : 'CORE UNIFORM';
  const N = name.toUpperCase();
  if (/\bPE\b|TRACK|SPORT/.test(N)) return 'PE';
  if (/WINTER|JACKET|FLEECE|SWEAT/.test(N)) return 'WINTER UNIFORM';
  return 'CORE UNIFORM';
};
const uni = (src.uniforms ? src.uniforms.items : []).map((it) => {
  const name = it.name.replace(/\s+/g, ' ').trim();
  return {
    name, sku: it.sku || '',
    priceAed: it.priceAed,
    uniformType: typeOf(name, it.uniformType),
    gender: genderOf(name, it.gender),
    years: parseYears(name),
    url: it.url || 'https://www.threadsme.com/al-basma-british-school-abu-dhabi.html',
    image: it.image || null
  };
});
fs.writeFileSync(path.join(OUT, 'sample-products.json'), JSON.stringify({
  source: 'Al Basma British School page (real listing data, scraped with images)',
  note: 'Representative uniform products used to populate the demo grid; years[] inferred from product name ranges (empty = all years).',
  count: uni.length, products: uni
}, null, 2) + '\n');

console.log('cross-sell rails:', cs.rails.map((r) => r.key + '(' + r.items.length + ')').join(', '));
console.log('uniforms:', uni.length, '| with images:', uni.filter((u) => u.image).length);
uni.forEach((u) => console.log('  -', u.gender, u.uniformType, '['+u.years.join(',')+']', u.name));

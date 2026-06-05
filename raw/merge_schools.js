/* Merge scraped per-school uniform catalogues -> data/uniforms-by-school.json
 * Infers uniformType / gender / years from each product name (same heuristics as the demo set).
 * Usage: node raw/merge_schools.js <workflow-output.json> */
const fs = require('fs');
const path = require('path');
const OUT = path.join(__dirname, '..', 'data');
const src = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const schoolsArr = (src.result && src.result.schools) || src.schools || [];

const ORDER = ['FS1', 'FS2', 'Y1', 'Y2', 'Y3', 'Y4', 'Y5', 'Y6', 'Y7', 'Y8', 'Y9', 'Y10', 'Y11', 'Y12', 'Y13'];
// Map a single stage token (PRE KG / KG / KG2 / FS1 / GR3 / GRADE 3 / Y3 / bare number) to an ORDER index.
function tokIdx(tok) {
  tok = String(tok).toUpperCase().replace(/\s|-/g, '');
  if (/^PREKG/.test(tok)) return 0;          // Pre-KG -> FS1
  if (/^KG2/.test(tok)) return 1;            // KG2 -> FS2
  if (/^KG/.test(tok)) return 0;             // KG/KG1 -> FS1
  if (/^FS2/.test(tok)) return 1;
  if (/^FS1/.test(tok)) return 0;
  const m = tok.match(/(?:GRADE|GR|YEAR|Y)?(\d{1,2})/);
  if (m) { const i = ORDER.indexOf('Y' + (+m[1])); return i; }
  return -1;
}
const TOK = '(PRE\\s*-?\\s*KG|KG\\d?|FS\\s?\\d|GRADE\\s?\\d{1,2}|GR\\s?\\d{1,2}|YEAR\\s?\\d{1,2}|Y\\s?\\d{1,2})';
function parseYears(name) {
  const N = String(name).toUpperCase();
  const m = N.match(new RegExp(TOK + '\\s*[-/]\\s*(PRE\\s*-?\\s*KG|KG\\d?|FS\\s?\\d|GRADE\\s?\\d{1,2}|GR\\s?\\d{1,2}|YEAR\\s?\\d{1,2}|Y?\\s?\\d{1,2})'));
  if (m) {
    const ia = tokIdx(m[1]); const ib = tokIdx(/^\d+$/.test(m[2].trim()) ? 'Y' + m[2].trim() : m[2]);
    if (ia !== -1 && ib !== -1) return ORDER.slice(Math.min(ia, ib), Math.max(ia, ib) + 1);
  }
  // single stage mentions -> foundation only
  if (/PRE\s*-?\s*KG|(^|[^A-Z])KG([^A-Z0-9]|$)/.test(N)) return ['FS1', 'FS2'];
  return [];
}
const genderOf = (name) => { const N = String(name).toUpperCase(); if (/\bGIRLS?\b|BLOUSE|PINAFORE|SKORT|SKIRT|DRESS/.test(N)) return 'GIRLS'; if (/\bBOYS?\b/.test(N)) return 'BOYS'; return 'UNISEX'; };
const typeOf = (name) => { const N = String(name).toUpperCase(); if (/\bPE\b|TRACK|SPORT|HOUSE/.test(N)) return 'PE'; if (/WINTER|JACKET|FLEECE|SWEAT|CARDIGAN|JUMPER|PULLOVER|COAT/.test(N)) return 'WINTER UNIFORM'; return 'CORE UNIFORM'; };
const cleanImg = (im) => { if (!im) return null; if (im.startsWith('http')) return im; if (im.startsWith('/')) return 'https://www.threadsme.com' + im; return im; };
const num = (p) => { if (typeof p === 'number') return p; if (!p) return null; const n = parseFloat(String(p).replace(/[^0-9.]/g, '')); return isNaN(n) ? null : n; };

// Start from existing data so re-scrapes are additive.
let bySchool = {};
const existingPath = path.join(OUT, 'uniforms-by-school.json');
if (fs.existsSync(existingPath)) { try { bySchool = JSON.parse(fs.readFileSync(existingPath, 'utf8')).bySchool || {}; } catch (e) {} }
schoolsArr.forEach((s) => {
  const prods = (s.products || []).map((p) => ({
    name: String(p.name).replace(/\s+/g, ' ').trim(),
    priceAed: num(p.priceAed != null ? p.priceAed : p.price),
    image: cleanImg(p.image),
    url: p.url || null,
    uniformType: typeOf(p.name),
    gender: genderOf(p.name),
    years: parseYears(p.name)
  })).filter((p) => p.name && p.name.length > 1);
  bySchool[s.slug] = prods;
});
const totalProducts = Object.values(bySchool).reduce((t, v) => t + v.length, 0);
const schoolsWith = Object.values(bySchool).filter((v) => v.length).length;

fs.writeFileSync(path.join(OUT, 'uniforms-by-school.json'), JSON.stringify({
  source: 'threadsme.com per-school pages (scraped)',
  extractedAt: '2026-06-05',
  schoolsWithProducts: schoolsWith,
  totalProducts,
  bySchool
}, null, 2) + '\n');

console.log('schools scraped:', schoolsArr.length, '| with products:', schoolsWith, '| total products:', totalProducts);
const sizes = Object.entries(bySchool).map(([k, v]) => k + ':' + v.length).sort((a, b) => b.split(':')[1] - a.split(':')[1]);
console.log('top:', sizes.slice(0, 8).join(', '));
console.log('empty:', Object.entries(bySchool).filter(([, v]) => !v.length).map(([k]) => k).join(', ') || 'none');

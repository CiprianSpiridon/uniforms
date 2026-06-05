const fs = require('fs');
const o = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const lenses = o.result;
const all = [];
lenses.forEach((L) => {
  console.log('\n===== ' + L.lens.toUpperCase() + ' =====');
  if (L.scores) console.log('scores:', JSON.stringify(L.scores));
  console.log('verdict:', (L.verdict || '').slice(0, 400));
  (L.issues || []).forEach((i) => all.push({ lens: L.lens, ...i }));
});
const order = { P0: 0, P1: 1, P2: 2 };
all.sort((a, b) => (order[a.severity] ?? 9) - (order[b.severity] ?? 9));
console.log('\n\n########## ALL ISSUES (' + all.length + ') by severity ##########');
all.forEach((i) => {
  console.log(`\n[${i.severity}] (${i.device || '?'}/${i.lens}) ${i.where}`);
  console.log('  problem: ' + (i.problem || '').slice(0, 300));
  console.log('  fix: ' + (i.fix || '').slice(0, 240));
});
const cnt = all.reduce((m, i) => ((m[i.severity] = (m[i.severity] || 0) + 1), m), {});
console.log('\nCOUNT:', JSON.stringify(cnt));

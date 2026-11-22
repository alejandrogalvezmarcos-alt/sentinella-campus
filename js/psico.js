// Generadors de psicotècnics: cada crida torna una pregunta nova
import { rnd, pick, shuffle, sample, numOptions, round, esc } from './util.js';
import { t, L, getLang } from './i18n.js';

const mk = (cat, prompt, options, answer, extra = {}) => {
  // options: array de html; answer: índex de la correcta abans de barrejar
  const idx = shuffle(options.map((_, i) => i));
  return { cat, prompt, options: idx.map((i) => options[i]), answer: idx.indexOf(answer), ...extra };
};
const fromValues = (cat, prompt, ans, opts, extra) => {
  const list = opts.map(String); const a = list.indexOf(String(ans));
  return { cat, prompt, options: list, answer: a, ...extra };
};
const fmtN = (n) => (Number.isInteger(n) ? String(n) : String(round(n, 2)).replace('.', getLang() === 'en' ? '.' : ','));

// ───────── NUMÈRICA ─────────
function genSeries() {
  const type = pick(['arith', 'geom', 'inc', 'alt', 'sq', 'fib', 'muladd', 'ops']);
  let seq = [], next, exp;
  if (type === 'arith') { const a = rnd(2, 60), d = pick([-9, -7, -6, -4, -3, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 15]); seq = Array.from({ length: 6 }, (_, i) => a + d * i); next = a + d * 6; exp = `${d > 0 ? '+' : ''}${d}`; }
  else if (type === 'geom') { const a = rnd(1, 6), r = pick([2, 2, 3]); seq = Array.from({ length: 5 }, (_, i) => a * r ** i); next = a * r ** 5; exp = `×${r}`; }
  else if (type === 'inc') { const a = rnd(1, 30), d = rnd(1, 5), k = pick([1, 2, 3]); seq = [a]; let s = d; for (let i = 0; i < 5; i++) { seq.push(seq.at(-1) + s); s += k; } next = seq.at(-1) + s; exp = `+${d}, +${d + k}, +${d + 2 * k}… (+${k})`; }
  else if (type === 'alt') { const a = rnd(1, 20), b = rnd(20, 60), d1 = pick([2, 3, 4, 5]), d2 = pick([-3, -2, 3, 5, 6]); for (let i = 0; i < 4; i++) { seq.push(a + d1 * i); seq.push(b + d2 * i); } seq = seq.slice(0, 7); next = b + d2 * 3; exp = `${a}, ${a + d1}… (+${d1}) / ${b}, ${b + d2}… (${d2 > 0 ? '+' : ''}${d2})`; }
  else if (type === 'sq') { const s = rnd(1, 6), c = pick([0, 0, 1, -1, 2, 3]); seq = Array.from({ length: 5 }, (_, i) => (s + i) ** 2 + c); next = (s + 5) ** 2 + c; exp = `n² ${c ? (c > 0 ? '+' : '') + c : ''}`.trim(); }
  else if (type === 'fib') { const a = rnd(1, 6), b = rnd(2, 8); seq = [a, b]; while (seq.length < 7) seq.push(seq.at(-1) + seq.at(-2)); next = seq.at(-1) + seq.at(-2); exp = 'aₙ = aₙ₋₁ + aₙ₋₂'; }
  else if (type === 'muladd') { const a = rnd(1, 5), m = 2, c = pick([1, -1, 2, 3]); seq = [a]; while (seq.length < 5) seq.push(seq.at(-1) * m + c); next = seq.at(-1) * m + c; exp = `×${m} ${c > 0 ? '+' : ''}${c}`; }
  else { const a = rnd(2, 9), p = pick([2, 3, 4, 5]), m = pick([2, 3]); seq = [a]; for (let i = 0; seq.length < 6; i++) seq.push(i % 2 === 0 ? seq.at(-1) + p : seq.at(-1) * m); next = seq.length % 2 === 1 ? seq.at(-1) + p : seq.at(-1) * m; exp = `+${p}, ×${m}, +${p}, ×${m}…`; }
  const spread = Math.abs(next) > 100 ? [-10, 10, 20, -20, 5, -5] : [1, -1, 2, -2, 3, 4, -3];
  const opts = numOptions(next, spread);
  return fromValues('series', t('p_series'), next, opts, { visual: `<div class="seq">${seq.map((n) => `<span>${n}</span>`).join('')}<span class="q">?</span></div>`, explain: exp });
}

function genCalc() {
  const type = pick(['mul', 'pct', 'div', 'frac', 'mix', 'dec']);
  let txt, ans, exp = '';
  if (type === 'mul') { const a = rnd(12, 98), b = rnd(3, 9); txt = `${a} × ${b}`; ans = a * b; }
  else if (type === 'pct') { const p = pick([5, 10, 12, 15, 20, 25, 30, 40, 75]), n = pick([40, 60, 80, 120, 160, 200, 240, 360, 420, 500, 640, 800]); txt = L([`${p}% de ${n}`, `${p}% de ${n}`, `${p}% of ${n}`]); ans = (p * n) / 100; exp = `${n} × ${p}/100`; }
  else if (type === 'div') { const b = rnd(3, 12), r = rnd(6, 40); txt = `${b * r} ÷ ${b}`; ans = r; }
  else if (type === 'frac') { const d = pick([3, 4, 5, 6, 8]), nn = rnd(1, d - 1), m = d * rnd(3, 15); txt = L([`${nn}/${d} de ${m}`, `${nn}/${d} de ${m}`, `${nn}/${d} of ${m}`]); ans = (m / d) * nn; exp = `${m} ÷ ${d} × ${nn}`; }
  else if (type === 'mix') { const a = rnd(2, 12), b = rnd(2, 12), c = rnd(5, 60); txt = `${a} × ${b} + ${c}`; ans = a * b + c; }
  else { const a = rnd(11, 99) / 10, b = rnd(11, 99) / 10; txt = `${fmtN(a)} + ${fmtN(b)}`; ans = round(a + b, 1); }
  const spread = Number.isInteger(ans) ? [1, -1, 2, 10, -10, 5] : [0.1, -0.1, 1, -1, 0.2];
  const opts = numOptions(ans, spread).map(fmtN);
  return fromValues('calc', `<span class="big-op">${txt} = ?</span>`, fmtN(ans), opts, { explain: exp });
}

function genProb() {
  const type = pick(['price', 'speed', 'workers', 'discount', 'avg', 'mix']);
  let txt, ans, unit = '';
  if (type === 'price') { const n = rnd(2, 6), p = rnd(3, 12) * 0.5 * n, m = rnd(7, 15); const u = p / n; txt = L([`Si ${n} bolígrafs costen ${fmtN(p)} €, quant costen ${m}?`, `Si ${n} bolígrafos cuestan ${fmtN(p)} €, ¿cuánto cuestan ${m}?`, `If ${n} pens cost €${fmtN(p)}, how much do ${m} cost?`]); ans = round(u * m, 2); unit = ' €'; }
  else if (type === 'speed') { const v = pick([60, 72, 80, 90, 100, 120]), h = pick([0.5, 1.5, 2, 2.5, 3]); txt = L([`Una patrulla circula a ${v} km/h durant ${fmtN(h)} hores. Quants km recorre?`, `Una patrulla circula a ${v} km/h durante ${fmtN(h)} horas. ¿Cuántos km recorre?`, `A patrol car drives at ${v} km/h for ${fmtN(h)} hours. How many km does it cover?`]); ans = v * h; unit = ' km'; }
  else if (type === 'workers') { const a = pick([2, 3, 4, 6]), d = pick([6, 8, 9, 12]), b = pick([1, 2, 3, 4, 6, 8, 12].filter((x) => x !== a && (a * d) % x === 0)); txt = L([`${a} agents revisen un arxiu en ${d} hores. Quantes hores trigarien ${b} agents?`, `${a} agentes revisan un archivo en ${d} horas. ¿Cuántas horas tardarían ${b} agentes?`, `${a} officers review an archive in ${d} hours. How many hours would ${b} officers take?`]); ans = (a * d) / b; unit = ' h'; }
  else if (type === 'discount') { const p = pick([40, 60, 80, 120, 150, 200, 250]), d = pick([10, 15, 20, 25, 30, 40]); txt = L([`Un article de ${p} € té un ${d}% de descompte. Quin és el preu final?`, `Un artículo de ${p} € tiene un ${d}% de descuento. ¿Cuál es el precio final?`, `An item costing €${p} has a ${d}% discount. What is the final price?`]); ans = round(p * (1 - d / 100), 2); unit = ' €'; }
  else if (type === 'avg') { const xs = Array.from({ length: 4 }, () => rnd(4, 10)); const target = rnd(6, 9); const s = xs.reduce((a, b) => a + b, 0); ans = target * 5 - s; if (ans < 0 || ans > 10) return genProb(); txt = L([`Notes: ${xs.join(', ')}. Quina nota cal al 5è examen per fer mitjana de ${target}?`, `Notas: ${xs.join(', ')}. ¿Qué nota hace falta en el 5º examen para tener media de ${target}?`, `Marks: ${xs.join(', ')}. What mark is needed in the 5th exam to average ${target}?`]); }
  else { const tot = pick([24, 30, 36, 40, 48, 60]), f = pick([[1, 3], [1, 4], [2, 3], [3, 4], [1, 6]]); txt = L([`En una promoció de ${tot} alumnes, ${f[0]}/${f[1]} són dones. Quants homes hi ha?`, `En una promoción de ${tot} alumnos, ${f[0]}/${f[1]} son mujeres. ¿Cuántos hombres hay?`, `In a class of ${tot} trainees, ${f[0]}/${f[1]} are women. How many men are there?`]); ans = tot - (tot / f[1]) * f[0]; if (!Number.isInteger(ans)) return genProb(); }
  const spread = ans > 50 ? [10, -10, 5, -5, 20] : [1, -1, 2, -2, 0.5, 3];
  const opts = numOptions(ans, spread).filter((x) => x >= 0);
  while (opts.length < 4) opts.push(ans + opts.length * 3);
  return fromValues('prob', txt, fmtN(ans) + unit, shuffle(opts.slice(0, 4)).map((x) => fmtN(x) + unit));
}

// ───────── LLETRES ─────────
const AB = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
function genLetters() {
  const type = pick(['const', 'alt', 'inc', 'back']);
  let i = rnd(0, 25), steps = [], seq = [];
  if (type === 'const') { const s = rnd(2, 4); steps = [s]; }
  else if (type === 'alt') { steps = [rnd(1, 3), rnd(3, 5)]; }
  else if (type === 'inc') { steps = 'inc'; }
  else { steps = [-rnd(2, 3)]; }
  let s = 1;
  seq.push(AB[i]);
  for (let k = 0; k < 5; k++) {
    const st = steps === 'inc' ? s++ : steps[k % steps.length];
    i = (i + st + 26) % 26; seq.push(AB[i]);
  }
  const ansStep = steps === 'inc' ? s : steps[5 % steps.length];
  const ansI = (i + ansStep + 26) % 26;
  const ans = AB[ansI];
  const ds = shuffle([1, -1, 2, -2, 3]).slice(0, 3).map((d) => AB[(ansI + d + 26) % 26]);
  const exp = steps === 'inc' ? '+1, +2, +3, +4…' : steps.map((x) => (x > 0 ? '+' : '') + x).join(', ');
  return fromValues('letters', t('p_letters'), ans, shuffle([ans, ...ds]), { visual: `<div class="seq">${seq.slice(0, 6).map((n) => `<span>${n}</span>`).join('')}<span class="q">?</span></div>`, explain: exp });
}

// ───────── FIGURES (abstracte) ─────────
function fig(f, size = 74) {
  const c = 40, r = 22;
  const pts = Array.from({ length: f.n }, (_, i) => { const a = (Math.PI * 2 * i) / f.n - Math.PI / 2; return `${(c + r * Math.cos(a)).toFixed(1)},${(c + r * Math.sin(a)).toFixed(1)}`; }).join(' ');
  const corners = [[10, 10], [70, 10], [70, 70], [10, 70]];
  const [dx, dy] = corners[f.dot % 4];
  const na = (f.needle * Math.PI) / 180;
  const dots = Array.from({ length: f.k }, (_, i) => `<circle cx="${40 - (f.k - 1) * 4 + i * 8}" cy="76" r="2.3" fill="currentColor"/>`).join('');
  return `<svg class="fig" viewBox="0 0 80 82" width="${size}" height="${size}"><polygon points="${pts}" fill="${f.fill ? 'var(--fig-fill)' : 'none'}" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/>${f.needle >= 0 ? `<line x1="40" y1="40" x2="${(40 + 15 * Math.cos(na)).toFixed(1)}" y2="${(40 + 15 * Math.sin(na)).toFixed(1)}" stroke="var(--accent2)" stroke-width="3" stroke-linecap="round"/><circle cx="40" cy="40" r="2.5" fill="var(--accent2)"/>` : ''}<circle cx="${dx}" cy="${dy}" r="5" fill="var(--accent)"/>${dots}</svg>`;
}
const figKey = (f) => `${f.n}|${f.fill}|${f.dot % 4}|${f.k}|${f.needle}`;

function genFigSeq() {
  const rules = sample(['n', 'fill', 'dot', 'k', 'needle'], rnd(2, 3));
  const base = { n: rnd(3, 4), fill: rnd(0, 1), dot: rnd(0, 3), k: rnd(1, 2), needle: pick([0, 90, 180, 270]) };
  const dNeedle = pick([45, 90, -90]);
  const at = (i) => ({
    n: rules.includes('n') ? base.n + i : base.n,
    fill: rules.includes('fill') ? (base.fill + i) % 2 : base.fill,
    dot: rules.includes('dot') ? (base.dot + i) % 4 : base.dot,
    k: rules.includes('k') ? ((base.k - 1 + i) % 4) + 1 : base.k,
    needle: rules.includes('needle') ? (((base.needle + dNeedle * i) % 360) + 360) % 360 : base.needle,
  });
  const ans = at(4);
  const seen = new Set([figKey(ans)]);
  const ds = [];
  const muts = shuffle([
    (f) => ({ ...f, n: f.n + 1 }), (f) => ({ ...f, n: Math.max(3, f.n - 1) }), (f) => ({ ...f, fill: 1 - f.fill }),
    (f) => ({ ...f, dot: f.dot + 1 }), (f) => ({ ...f, dot: f.dot + 2 }), (f) => ({ ...f, k: (f.k % 4) + 1 }),
    (f) => ({ ...f, needle: (f.needle + 90) % 360 }), (f) => ({ ...f, needle: (f.needle + 180) % 360 }),
  ]);
  for (const m of muts) { const d = m(ans); const k = figKey(d); if (!seen.has(k) && d.n <= 8) { seen.add(k); ds.push(d); } if (ds.length === 3) break; }
  const opts = [ans, ...ds].map((f) => fig(f, 84));
  const ruleNames = { n: L(['costats +1', 'lados +1', 'sides +1']), fill: L(['farciment alterna', 'relleno alterna', 'fill alternates']), dot: L(['el punt gira en sentit horari', 'el punto gira en sentido horario', 'dot moves clockwise']), k: L(['un punt més a sota', 'un punto más abajo', 'one more dot below']), needle: L([`l'agulla gira ${dNeedle}°`, `la aguja gira ${dNeedle}°`, `needle turns ${dNeedle}°`]) };
  return mk('figseq', t('p_figseq'), opts, 0, { visual: `<div class="figrow">${[0, 1, 2, 3].map((i) => fig(at(i), 64)).join('')}<span class="q">?</span></div>`, explain: rules.map((r) => ruleNames[r]).join(' · '), optClass: 'opt-fig' });
}

function genFigOdd() {
  const rule = pick(['parity', 'dots']);
  const figs = [];
  const used = new Set();
  while (figs.length < 3) {
    const n = rnd(3, 7);
    const f = { n, fill: rule === 'parity' ? (n % 2 === 0 ? 1 : 0) : rnd(0, 1), dot: rnd(0, 3), k: rule === 'dots' ? n - 2 : rnd(1, 4), needle: -1 };
    if (f.k > 5) continue;
    const key = figKey(f); if (used.has(key)) continue; used.add(key); figs.push(f);
  }
  let odd;
  do {
    const n = rnd(3, 7);
    odd = rule === 'parity' ? { n, fill: n % 2 === 0 ? 0 : 1, dot: rnd(0, 3), k: rnd(1, 4), needle: -1 } : { n, fill: rnd(0, 1), dot: rnd(0, 3), k: pick([n - 1, n - 3, n].filter((x) => x >= 1 && x <= 5)), needle: -1 };
  } while (used.has(figKey(odd)));
  const explain = rule === 'parity' ? L(['Les figures amb nombre parell de costats són plenes i les senars, buides.', 'Las figuras con número par de lados están rellenas y las impares, vacías.', 'Figures with an even number of sides are filled; odd ones are empty.']) : L(['El nombre de punts de sota és igual al nombre de costats menys 2.', 'El número de puntos de abajo es igual al número de lados menos 2.', 'The number of dots below equals the number of sides minus 2.']);
  const opts = [odd, ...figs].map((f) => fig(f, 84));
  return mk('figodd', t('p_figodd'), opts, 0, { explain, optClass: 'opt-fig' });
}

// ───────── ESPACIAL ─────────
const norm = (cells) => { const mx = Math.min(...cells.map((c) => c[0])), my = Math.min(...cells.map((c) => c[1])); return cells.map(([x, y]) => [x - mx, y - my]).sort((a, b) => a[0] - b[0] || a[1] - b[1]); };
const key = (cells) => norm(cells).map((c) => c.join(',')).join(';');
const rot = (cells) => cells.map(([x, y]) => [-y, x]);
const mir = (cells) => cells.map(([x, y]) => [-x, y]);
const rots = (cells) => { const r = [cells]; for (let i = 0; i < 3; i++) r.push(rot(r.at(-1))); return r; };

function polyomino(n) {
  const cells = [[0, 0]]; const has = (x, y) => cells.some((c) => c[0] === x && c[1] === y);
  while (cells.length < n) {
    const [x, y] = pick(cells); const [dx, dy] = pick([[1, 0], [-1, 0], [0, 1], [0, -1]]);
    if (!has(x + dx, y + dy) && Math.abs(x + dx) < 3 && Math.abs(y + dy) < 3) cells.push([x + dx, y + dy]);
  }
  return cells;
}
function gridSvg(cells, size = 84, mark = null) {
  const c = norm(cells); const w = Math.max(...c.map((p) => p[0])) + 1, h = Math.max(...c.map((p) => p[1])) + 1; const u = 14, m = Math.max(w, h);
  const ox = ((m - w) * u) / 2, oy = ((m - h) * u) / 2;
  return `<svg class="fig" viewBox="-3 -3 ${m * u + 6} ${m * u + 6}" width="${size}" height="${size}">${c.map(([x, y], i) => `<rect x="${ox + x * u}" y="${oy + y * u}" width="${u}" height="${u}" rx="2" fill="${mark !== null && i === mark ? 'var(--accent)' : 'var(--fig-fill)'}" stroke="currentColor" stroke-width="1.6"/>`).join('')}</svg>`;
}
function genRotate() {
  let shape, ok = false;
  for (let tries = 0; tries < 50 && !ok; tries++) {
    shape = polyomino(rnd(5, 7));
    const rk = new Set(rots(shape).map(key));
    ok = rots(mir(shape)).every((s) => !rk.has(key(s)));
  }
  const correct = pick(rots(shape).slice(1));
  const mirrors = []; const seen = new Set([key(correct)]);
  for (const s of shuffle(rots(mir(shape)))) { const k = key(s); if (!seen.has(k)) { seen.add(k); mirrors.push(s); } if (mirrors.length === 3) break; }
  while (mirrors.length < 3) { const s = rot(polyomino(6)); if (!seen.has(key(s))) { seen.add(key(s)); mirrors.push(s); } }
  return mk('rotate', t('p_rotate'), [correct, ...mirrors].map((s) => gridSvg(s)), 0, { visual: `<div class="model"><small>${t('model')}</small>${gridSvg(shape, 96)}</div>`, explain: L(['Les altres opcions són la figura reflectida (com en un mirall).', 'Las otras opciones son la figura reflejada (como en un espejo).', 'The other options are the mirrored figure.']), optClass: 'opt-fig' });
}

function cubesSvg(h) {
  const a = 18, cx = Math.cos(Math.PI / 6) * a, sy = a / 2;
  const n = h.length, m = h[0].length; const cubes = [];
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) for (let z = 0; z < h[i][j]; z++) cubes.push([i, j, z]);
  cubes.sort((p, q) => p[0] + p[1] - (q[0] + q[1]) || p[2] - q[2]);
  const pt = (i, j, z) => [(j - i) * cx, (i + j) * sy - z * a];
  let out = '';
  for (const [i, j, z] of cubes) {
    const [x, y] = pt(i, j, z);
    const top = `${x},${y - a} ${x + cx},${y - a + sy} ${x},${y - a + 2 * sy} ${x - cx},${y - a + sy}`;
    const left = `${x - cx},${y - a + sy} ${x},${y - a + 2 * sy} ${x},${y + 2 * sy} ${x - cx},${y + sy}`;
    const right = `${x + cx},${y - a + sy} ${x},${y - a + 2 * sy} ${x},${y + 2 * sy} ${x + cx},${y + sy}`;
    const st = 'stroke="var(--cube-line)" stroke-width="1.2" stroke-linejoin="round"';
    out += `<polygon points="${top}" fill="var(--cube-top)" ${st}/><polygon points="${left}" fill="var(--cube-left)" ${st}/><polygon points="${right}" fill="var(--cube-right)" ${st}/>`;
  }
  const W = (n + m) * cx + 10, top = -4 * a - 10, H = (n + m) * sy + 4 * a + 20;
  return `<svg class="cubes" viewBox="${-n * cx - 5} ${top} ${W} ${H}" width="230" height="${Math.round((230 * H) / W)}">${out}</svg>`;
}
function genCubes() {
  const n = rnd(3, 4), m = rnd(3, 4);
  const h = Array.from({ length: n }, () => Array.from({ length: m }, () => rnd(0, 4)));
  h[0][0] = Math.max(h[0][0], 2);
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) { if (i > 0) h[i][j] = Math.min(h[i][j], h[i - 1][j]); if (j > 0) h[i][j] = Math.min(h[i][j], h[i][j - 1]); }
  const total = h.flat().reduce((a, b) => a + b, 0);
  if (total < 6) return genCubes();
  return fromValues('cubes', t('p_cubes'), total, numOptions(total, [1, -1, 2, -2, 3, -3]), { visual: `<div class="vcenter">${cubesSvg(h)}</div>`, explain: L(['Suma les columnes:', 'Suma las columnas:', 'Add up the columns:']) + ' ' + h.map((r) => r.join('+')).join(' + ') });
}

// ───────── PERCEPTIVA ─────────
const SIM = { '0': 'O', O: '0', '1': 'I', I: '1', '8': 'B', B: '8', '5': 'S', S: '5', '6': 'G', G: '6', '2': 'Z', Z: '2', M: 'N', N: 'M', E: 'F', F: 'E', P: 'R', R: 'P', '3': '8', '7': '1', C: 'G', U: 'V', V: 'U', K: 'X', X: 'K' };
function code() { const ch = '0123456789ABCDEFGHKLMNPRSTUVXZ'; let s = ''; for (let i = 0; i < 8; i++) s += ch[rnd(0, ch.length - 1)]; return s.slice(0, 3) + '-' + s.slice(3); }
function genCodes() {
  const same = rnd(0, 5); const rows = [];
  for (let i = 0; i < 5; i++) {
    const a = code(); let b = a;
    if (i >= same) { const idx = pick([0, 1, 2, 4, 5, 6, 7, 8]); const c = a[idx]; b = a.slice(0, idx) + (SIM[c] || (c === 'A' ? '4' : 'A')) + a.slice(idx + 1); }
    rows.push([a, b]);
  }
  const rs = shuffle(rows);
  const opts = numOptions(same, [1, -1, 2, -2, 3]).filter((x) => x >= 0 && x <= 5);
  const all = [...new Set([same, ...opts, 0, 1, 2, 3, 4, 5])].slice(0, 4).sort((a, b) => a - b);
  return fromValues('codes', t('p_codes'), same, all, { visual: `<div class="codes">${rs.map(([a, b]) => `<div><code>${a}</code><span>↔</span><code>${b}</code></div>`).join('')}</div>` });
}
function genSymbols() {
  const set = pick([['b', 'd', 'p', 'q'], ['◐', '◑', '◒', '◓'], ['▲', '►', '▼', '◄'], ['E', 'F', 'B', 'R'], ['6', '9', '8', '0']]);
  const target = pick(set); const cells = Array.from({ length: 60 }, () => pick(set));
  const cnt = cells.filter((c) => c === target).length;
  return fromValues('symbols', t('p_symbols', { s: `<b class="sym">${esc(target)}</b>` }), cnt, numOptions(cnt, [1, -1, 2, -2, 3]), { visual: `<div class="symgrid">${cells.map((c) => `<span>${esc(c)}</span>`).join('')}</div>` });
}

// ───────── MEMÒRIA I ATENCIÓ ─────────
const CONS = 'BCDFGHJKLMNPRSTVWXYZ';
const plate = () => `${String(rnd(0, 9999)).padStart(4, '0')} ${Array.from({ length: 3 }, () => CONS[rnd(0, CONS.length - 1)]).join('')}`;
function tweak(p) { const i = pick([0, 1, 2, 3, 5, 6, 7]); const ch = p[i]; const r = /\d/.test(ch) ? String((+ch + rnd(1, 8)) % 10) : CONS[(CONS.indexOf(ch) + rnd(1, 5)) % CONS.length]; return p.slice(0, i) + r + p.slice(i + 1); }
function genPlates() {
  const list = Array.from({ length: rnd(4, 5) }, plate); const ans = pick(list);
  const ds = new Set(); while (ds.size < 3) { const d = tweak(pick(list)); if (!list.includes(d)) ds.add(d); }
  const pl = (p) => `<span class="plate"><i>E</i>${p}</span>`;
  return mk('plates', t('p_plates'), [ans, ...ds].map(pl), 0, { memo: { html: `<p class="memo-title">${t('p_plates_mem')}</p><div class="plates">${list.map(pl).join('')}</div>`, seconds: 10 }, optClass: 'opt-plate' });
}
function genDigits() {
  const d = rnd(0, 9); let s = ''; for (let i = 0; i < 50; i++) s += rnd(0, 9);
  const cnt = [...s].filter((c) => +c === d).length;
  return fromValues('digits', t('p_digits', { d: `<b class="sym">${d}</b>` }), cnt, numOptions(cnt, [1, -1, 2, -2]), { visual: `<div class="digits">${s.match(/.{1,5}/g).join(' ')}</div>` });
}

// ───────── VERBAL ─────────
const VB = {
  ca: {
    syn: [['ràpid', 'veloç'], ['començar', 'iniciar'], ['ajudar', 'auxiliar'], ['enorme', 'gegantí'], ['valent', 'coratjós'], ['tranquil', 'serè'], ['antic', 'vell'], ['perill', 'risc'], ['acabar', 'finalitzar'], ['bonic', 'formós'], ['enfadat', 'enutjat'], ['honrat', 'íntegre'], ['eficaç', 'efectiu'], ['indicar', 'assenyalar'], ['evitar', 'eludir'], ['augmentar', 'incrementar'], ['detenir', 'arrestar'], ['vigilar', 'custodiar'], ['prova', 'evidència'], ['ordre', 'manament'], ['astut', 'murri'], ['pobre', 'necessitat'], ['càstig', 'sanció'], ['discutir', 'debatre'], ['brut', 'impur']],
    ant: [['ràpid', 'lent'], ['obrir', 'tancar'], ['valent', 'covard'], ['augmentar', 'disminuir'], ['acceptar', 'rebutjar'], ['abundant', 'escàs'], ['permetre', 'prohibir'], ['culpable', 'innocent'], ['generós', 'gasiu'], ['entrada', 'sortida'], ['públic', 'privat'], ['avançar', 'retrocedir'], ['fràgil', 'resistent'], ['humil', 'arrogant'], ['concret', 'abstracte'], ['simple', 'complex'], ['victòria', 'derrota'], ['amic', 'enemic'], ['construir', 'destruir'], ['ple', 'buit'], ['oblidar', 'recordar'], ['dur', 'tou']],
    an: [['metge', 'hospital', 'mestre', 'escola'], ['ocell', 'niu', 'abella', 'rusc'], ['dia', 'sol', 'nit', 'lluna'], ['pintor', 'pinzell', 'escriptor', 'ploma'], ['peix', 'aigua', 'ocell', 'aire'], ['calor', 'estiu', 'fred', 'hivern'], ['ull', 'veure', 'orella', 'sentir'], ['jutge', 'sentència', 'metge', 'diagnòstic'], ['gos', 'lladrar', 'gat', 'miolar'], ['mà', 'guant', 'peu', 'mitjó'], ['setmana', 'dia', 'any', 'mes'], ['poeta', 'poema', 'compositor', 'simfonia'], ['llibre', 'biblioteca', 'quadre', 'museu']],
    odd: [['poma', 'pera', 'préssec', 'cirera', 'plàtan'], ['martell', 'tornavís', 'serra', 'alicates', 'llima'], ['violí', 'piano', 'flauta', 'guitarra', 'trompeta'], ['fuster', 'lampista', 'paleta', 'pintor', 'ferrer'], ['cor', 'fetge', 'pulmó', 'ronyó', 'estómac'], ['cotxe', 'camió', 'moto', 'furgoneta', 'autobús'], ['pi', 'roure', 'alzina', 'faig', 'avet'], ['Girona', 'Lleida', 'Tarragona', 'Barcelona', 'Tortosa']],
  },
  es: {
    syn: [['rápido', 'veloz'], ['empezar', 'iniciar'], ['ayudar', 'auxiliar'], ['enorme', 'gigantesco'], ['valiente', 'osado'], ['tranquilo', 'sereno'], ['antiguo', 'viejo'], ['peligro', 'riesgo'], ['acabar', 'finalizar'], ['bonito', 'hermoso'], ['enfadado', 'enojado'], ['honrado', 'íntegro'], ['eficaz', 'efectivo'], ['indicar', 'señalar'], ['evitar', 'eludir'], ['aumentar', 'incrementar'], ['detener', 'arrestar'], ['vigilar', 'custodiar'], ['prueba', 'evidencia'], ['orden', 'mandato'], ['astuto', 'sagaz'], ['pobre', 'necesitado'], ['castigo', 'sanción'], ['discutir', 'debatir'], ['sucio', 'impuro']],
    ant: [['rápido', 'lento'], ['abrir', 'cerrar'], ['valiente', 'cobarde'], ['aumentar', 'disminuir'], ['aceptar', 'rechazar'], ['abundante', 'escaso'], ['permitir', 'prohibir'], ['culpable', 'inocente'], ['generoso', 'tacaño'], ['entrada', 'salida'], ['público', 'privado'], ['avanzar', 'retroceder'], ['frágil', 'resistente'], ['humilde', 'arrogante'], ['concreto', 'abstracto'], ['simple', 'complejo'], ['victoria', 'derrota'], ['amigo', 'enemigo'], ['construir', 'destruir'], ['lleno', 'vacío'], ['olvidar', 'recordar'], ['duro', 'blando']],
    an: [['médico', 'hospital', 'maestro', 'escuela'], ['pájaro', 'nido', 'abeja', 'colmena'], ['día', 'sol', 'noche', 'luna'], ['pintor', 'pincel', 'escritor', 'pluma'], ['pez', 'agua', 'pájaro', 'aire'], ['calor', 'verano', 'frío', 'invierno'], ['ojo', 'ver', 'oído', 'oír'], ['juez', 'sentencia', 'médico', 'diagnóstico'], ['perro', 'ladrar', 'gato', 'maullar'], ['mano', 'guante', 'pie', 'calcetín'], ['semana', 'día', 'año', 'mes'], ['poeta', 'poema', 'compositor', 'sinfonía'], ['libro', 'biblioteca', 'cuadro', 'museo']],
    odd: [['manzana', 'pera', 'melocotón', 'cereza', 'plátano'], ['martillo', 'destornillador', 'sierra', 'alicates', 'lima'], ['violín', 'piano', 'flauta', 'guitarra', 'trompeta'], ['carpintero', 'fontanero', 'albañil', 'pintor', 'herrero'], ['corazón', 'hígado', 'pulmón', 'riñón', 'estómago'], ['coche', 'camión', 'moto', 'furgoneta', 'autobús'], ['pino', 'roble', 'encina', 'haya', 'abeto'], ['Girona', 'Lleida', 'Tarragona', 'Barcelona', 'Tortosa']],
  },
  en: {
    syn: [['fast', 'quick'], ['begin', 'start'], ['help', 'assist'], ['huge', 'enormous'], ['brave', 'courageous'], ['calm', 'serene'], ['ancient', 'old'], ['danger', 'risk'], ['finish', 'complete'], ['pretty', 'beautiful'], ['angry', 'furious'], ['honest', 'upright'], ['effective', 'efficient'], ['indicate', 'point out'], ['avoid', 'evade'], ['increase', 'raise'], ['detain', 'arrest'], ['guard', 'watch'], ['proof', 'evidence'], ['order', 'command'], ['clever', 'shrewd'], ['poor', 'needy'], ['punishment', 'penalty'], ['argue', 'debate'], ['dirty', 'filthy']],
    ant: [['fast', 'slow'], ['open', 'close'], ['brave', 'cowardly'], ['increase', 'decrease'], ['accept', 'reject'], ['plentiful', 'scarce'], ['allow', 'forbid'], ['guilty', 'innocent'], ['generous', 'stingy'], ['entrance', 'exit'], ['public', 'private'], ['advance', 'retreat'], ['fragile', 'sturdy'], ['humble', 'arrogant'], ['concrete', 'abstract'], ['simple', 'complex'], ['victory', 'defeat'], ['friend', 'enemy'], ['build', 'destroy'], ['full', 'empty'], ['forget', 'remember'], ['hard', 'soft']],
    an: [['doctor', 'hospital', 'teacher', 'school'], ['bird', 'nest', 'bee', 'hive'], ['day', 'sun', 'night', 'moon'], ['painter', 'brush', 'writer', 'pen'], ['fish', 'water', 'bird', 'air'], ['heat', 'summer', 'cold', 'winter'], ['eye', 'see', 'ear', 'hear'], ['judge', 'sentence', 'doctor', 'diagnosis'], ['dog', 'bark', 'cat', 'meow'], ['hand', 'glove', 'foot', 'sock'], ['week', 'day', 'year', 'month'], ['poet', 'poem', 'composer', 'symphony'], ['book', 'library', 'painting', 'museum']],
    odd: [['apple', 'pear', 'peach', 'cherry', 'banana'], ['hammer', 'screwdriver', 'saw', 'pliers', 'file'], ['violin', 'piano', 'flute', 'guitar', 'trumpet'], ['carpenter', 'plumber', 'bricklayer', 'painter', 'blacksmith'], ['heart', 'liver', 'lung', 'kidney', 'stomach'], ['car', 'truck', 'motorbike', 'van', 'bus'], ['pine', 'oak', 'holm oak', 'beech', 'fir'], ['Girona', 'Lleida', 'Tarragona', 'Barcelona', 'Tortosa']],
  },
};
const vb = () => VB[getLang()] || VB.ca;
function genSynAnt(kind) {
  const bank = vb()[kind]; const [w, a] = pick(bank);
  const others = shuffle(bank.filter((p) => p[0] !== w).flat()).filter((x) => x !== w && x !== a);
  const opts = [a, ...others.slice(0, 3)];
  return mk(kind === 'syn' ? 'syn' : 'ant', t(kind === 'syn' ? 'p_syn' : 'p_ant', { w: `<b>${esc(w)}</b>` }), opts.map(esc), 0);
}
function genAnalog() {
  const bank = vb().an; const [a, b, c, d] = pick(bank);
  const pool = shuffle([...new Set(bank.flat())]).filter((x) => ![a, b, c, d].includes(x));
  return mk('analog', t('p_analog', { a: `<b>${esc(a)}</b>`, b: `<b>${esc(b)}</b>`, c: `<b>${esc(c)}</b>` }), [d, ...pool.slice(0, 3)].map(esc), 0);
}
function genOddWord() {
  const bank = vb().odd; const [A, B] = sample(bank, 2);
  const words = sample(A, 3); const intr = pick(B);
  return mk('oddword', t('p_oddword'), [intr, ...words].map(esc), 0);
}

export const CATS = [
  { id: 'series', g: 'num', icon: 'hash', gen: genSeries },
  { id: 'calc', g: 'num', icon: 'bolt', gen: genCalc },
  { id: 'prob', g: 'num', icon: 'target', gen: genProb },
  { id: 'letters', g: 'abs', icon: 'type', gen: genLetters },
  { id: 'figseq', g: 'abs', icon: 'puzzle', gen: genFigSeq },
  { id: 'figodd', g: 'abs', icon: 'sparkles', gen: genFigOdd },
  { id: 'rotate', g: 'esp', icon: 'rotate', gen: genRotate },
  { id: 'cubes', g: 'esp', icon: 'cube', gen: genCubes },
  { id: 'codes', g: 'per', icon: 'eye', gen: genCodes },
  { id: 'symbols', g: 'per', icon: 'list', gen: genSymbols },
  { id: 'plates', g: 'mem', icon: 'memory', gen: genPlates },
  { id: 'digits', g: 'mem', icon: 'target', gen: genDigits },
  { id: 'syn', g: 'ver', icon: 'book', gen: () => genSynAnt('syn') },
  { id: 'ant', g: 'ver', icon: 'refresh', gen: () => genSynAnt('ant') },
  { id: 'analog', g: 'ver', icon: 'layers', gen: genAnalog },
  { id: 'oddword', g: 'ver', icon: 'x', gen: genOddWord },
];
export const GROUPS = [
  { id: 'num', color: '#fcc601' }, { id: 'abs', color: '#4f8fd6' }, { id: 'esp', color: '#ef8834' },
  { id: 'per', color: '#ffef23' }, { id: 'ver', color: '#e3352e' }, { id: 'mem', color: '#1b75ba' },
];
export const catById = (id) => CATS.find((c) => c.id === id);

export function genQuestion(catId) { const c = catById(catId); const q = c.gen(); q.cat = c.id; q.group = c.g; return q; }

// Test barrejat: repartiment semblant a l'examen (5 aptituds + memòria/atenció)
export function genMixed(n) {
  const groups = ['num', 'abs', 'esp', 'per', 'ver', 'mem'];
  const out = [];
  for (let i = 0; i < n; i++) { const g = groups[i % groups.length]; const c = pick(CATS.filter((x) => x.g === g)); out.push(genQuestion(c.id)); }
  return shuffle(out);
}

// Comptes locals i progrés (localStorage). Preparat per substituir-lo per un backend (Supabase/Firebase).
import { uid, sha256, dayKey, rnd, pick } from './util.js';

const K = { users: 'snt.users', sess: 'snt.session', data: (id) => `snt.data.${id}`, prefs: 'snt.prefs' };
const read = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* emmagatzematge ple o bloquejat */ } };

export const prefs = () => read(K.prefs, {});
export const setPrefs = (p) => write(K.prefs, { ...prefs(), ...p });

const blank = (profile) => ({ profile, results: [], mistakes: [], studied: {}, notes: {}, marks: [], plan: null, planDone: {}, xp: 0, days: {}, answered: 0 });

let cur = null;
export const me = () => cur;

export async function register({ name, email, password, sex, examDate, lang }) {
  const users = read(K.users, []);
  email = email.trim().toLowerCase();
  if (users.some((u) => u.email === email)) throw new Error('taken');
  const id = uid(); const salt = uid();
  users.push({ id, email, salt, hash: await sha256(salt + password) });
  write(K.users, users);
  const d = blank({ id, name: name.trim(), email, sex, examDate: examDate || '', lang, created: Date.now() });
  write(K.data(id), d); write(K.sess, id); cur = d; return d;
}
export async function login(email, password) {
  const u = read(K.users, []).find((x) => x.email === email.trim().toLowerCase());
  if (!u || u.hash !== (await sha256(u.salt + password))) throw new Error('login');
  write(K.sess, u.id); cur = read(K.data(u.id), null); return cur;
}
export function restore() { const id = read(K.sess, null); cur = id ? read(K.data(id), null) : null; return cur; }
export function logout() { localStorage.removeItem(K.sess); cur = null; }
export function save() { if (cur) write(K.data(cur.profile.id), cur); }
export function update(fn) { if (!cur) return; fn(cur); save(); }
export function deleteAccount() {
  if (!cur) return; const id = cur.profile.id;
  write(K.users, read(K.users, []).filter((u) => u.id !== id));
  localStorage.removeItem(K.data(id)); logout();
}
export function resetProgress() { update((d) => { Object.assign(d, blank(d.profile)); }); }
export function importData(obj) {
  if (!obj?.profile || !Array.isArray(obj.results)) throw new Error('bad');
  update((d) => { Object.assign(d, blank(d.profile), obj, { profile: { ...obj.profile, id: d.profile.id, email: d.profile.email } }); });
}

// ───────── Progrés, XP i rangs ─────────
export const RANKS = [
  ['Mosso/a', 0], ['Caporal', 400], ['Sergent', 1200], ['Sotsinspector/a', 2500], ['Inspector/a', 4500], ['Intendent', 7000], ['Comissari/ària', 10000], ['Major', 15000],
];
export function rankOf(xp) {
  let i = 0; while (i + 1 < RANKS.length && xp >= RANKS[i + 1][1]) i++;
  const next = RANKS[i + 1];
  return { i, name: RANKS[i][0], next: next?.[0], pct: next ? (xp - RANKS[i][1]) / (next[1] - RANKS[i][1]) : 1, toNext: next ? next[1] - xp : 0 };
}
export function streak(d = cur) {
  if (!d) return 0; let s = 0; const day = new Date();
  if (!d.days[dayKey(day)]) day.setDate(day.getDate() - 1);
  while (d.days[dayKey(day)]) { s++; day.setDate(day.getDate() - 1); }
  return s;
}
export function addResult(r) {
  let gained = 0;
  update((d) => {
    gained = r.correct * 10 + 20;
    d.results.unshift({ id: uid(), ts: Date.now(), ...r });
    d.xp += gained; d.answered += r.n;
    const k = dayKey(); d.days[k] = (d.days[k] || 0) + 1;
  });
  return gained;
}

// Compte de demostració amb historial d'exemple
export async function demo() {
  const email = 'demo@campus.local';
  const users = read(K.users, []);
  if (users.some((u) => u.email === email)) return login(email, 'demo1234');
  const exam = new Date(); exam.setDate(exam.getDate() + 86);
  const d = await register({ name: 'Laia', email, password: 'demo1234', sex: 'f', examDate: dayKey(exam), lang: undefined });
  const cats = ['series', 'calc', 'prob', 'letters', 'figseq', 'figodd', 'rotate', 'cubes', 'codes', 'symbols', 'plates', 'digits', 'syn', 'ant', 'analog', 'oddword'];
  const groupOf = { series: 'num', calc: 'num', prob: 'num', letters: 'abs', figseq: 'abs', figodd: 'abs', rotate: 'esp', cubes: 'esp', codes: 'per', symbols: 'per', plates: 'mem', digits: 'mem', syn: 'ver', ant: 'ver', analog: 'ver', oddword: 'ver' };
  const now = Date.now();
  for (let i = 24; i >= 0; i--) {
    const ts = now - i * 86400000 * 1.4 - rnd(0, 36e5 * 5);
    const kind = i % 6 === 0 ? 'test' : 'psico';
    const n = kind === 'test' ? 15 : 20;
    const skill = 0.5 + (24 - i) / 24 * 0.3;
    const correct = Math.min(n, Math.round(n * (skill + (Math.random() - 0.5) * 0.15)));
    const wrong = Math.max(0, n - correct - rnd(0, 2)); const blankN = n - correct - wrong;
    const perCat = {};
    if (kind === 'psico') { for (let q = 0; q < n; q++) { const c = pick(cats); perCat[c] = perCat[c] || { c: 0, n: 0, g: groupOf[c] }; perCat[c].n++; if (q < correct) perCat[c].c++; } }
    const score = kind === 'test' ? Math.max(0, (correct - wrong / 4) / n * 10) : correct / n * 10;
    d.results.unshift({ id: uid(), ts, kind, lk: kind === 'test' ? 'random_test' : 'mixed', label: kind === 'test' ? 'Test aleatori' : 'Psicotècnic barrejat', n, correct, wrong, blank: blankN, score, dur: rnd(400, 900), perCat });
    d.xp += correct * 10 + 20; d.answered += n; d.days[dayKey(new Date(ts))] = 1;
  }
  d.results.sort((a, b) => b.ts - a.ts);
  for (let i = 0; i < 4; i++) d.days[dayKey(new Date(now - i * 86400000))] = 1;
  d.marks = [
    { ts: now - 40 * 864e5, circuit: 23.4, press: 14, navette: 5 },
    { ts: now - 25 * 864e5, circuit: 22.6, press: 17, navette: 6 },
    { ts: now - 10 * 864e5, circuit: 21.9, press: 20, navette: 6.5 },
    { ts: now - 2 * 864e5, circuit: 21.2, press: 22, navette: 7 },
  ];
  d.studied = { A1: true, A2: true, A3: true, B1: true, B2: true, C4: true };
  save();
  return d;
}

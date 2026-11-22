// Comptes i progrés. Dos modes:
//  · local  → localStorage (demos i quan no hi ha núvol configurat)
//  · núvol  → Supabase (comptes compartits entre dispositius i panell docent real)
import { uid, sha256, dayKey, rnd, pick } from './util.js';
import { CONFIG } from './config.js';

const K = { users: 'snt.users', sess: 'snt.session', data: (id) => `snt.data.${id}`, prefs: 'snt.prefs' };
const read = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* emmagatzematge ple o bloquejat */ } };

export const prefs = () => read(K.prefs, {});
export const setPrefs = (p) => write(K.prefs, { ...prefs(), ...p });

const blank = (profile) => ({ profile, results: [], mistakes: [], studied: {}, notes: {}, marks: [], plan: null, planDone: {}, xp: 0, days: {}, answered: 0 });

let cur = null;
let sb = null; // client de Supabase
export const me = () => cur;
export const cloud = () => !!sb;
export const isAdmin = () => cur?.profile.role === 'admin';
export const isDocent = () => ['docent', 'admin'].includes(cur?.profile.role);
export const ROLES = ['alumne', 'docent', 'admin'];

// Super admin local (només en aquest dispositiu). Al codi només hi ha el hash, mai la contrasenya.
export const ADMIN_EMAIL = 'admin@sentinella.local';
const ADMIN = { id: 'superadmin', email: ADMIN_EMAIL, salt: 'a1pha5ent1nella', hash: 'f96743230a4f74f9949aae0940a4689d3bd0aaeda17544ed161eab3e85c05d2b' };
function ensureAdmin() {
  const users = read(K.users, []);
  if (!users.some((u) => u.id === ADMIN.id)) { users.unshift(ADMIN); write(K.users, users); }
  if (!read(K.data(ADMIN.id), null)) write(K.data(ADMIN.id), blank({ id: ADMIN.id, name: 'Super admin', email: ADMIN.email, sex: 'm', examDate: '', role: 'admin', created: Date.now(), src: 'local' }));
}

// ───────── Inici ─────────
export async function init() {
  ensureAdmin();
  if (CONFIG.supabaseUrl && CONFIG.supabaseAnonKey) {
    try {
      const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm');
      sb = createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey);
    } catch { sb = null; }
  }
  return restore();
}
async function restore() {
  const s = read(K.sess, null);
  const localId = typeof s === 'string' ? s : s?.local ? s.id : null;
  if (localId) { cur = read(K.data(localId), null); if (cur) cur.profile.src = 'local'; return cur; }
  if (sb) { const { data } = await sb.auth.getSession(); if (data.session) return loadRemote(data.session.user); }
  cur = null; return null;
}

// ───────── Núvol ─────────
async function loadRemote(user) {
  const [{ data: prof }, { data: row }] = await Promise.all([
    sb.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    sb.from('user_data').select('data').eq('id', user.id).maybeSingle(),
  ]);
  const p = { id: user.id, email: user.email, name: prof?.name || user.user_metadata?.name || '', sex: prof?.sex || 'm', examDate: prof?.exam_date || '', lang: prof?.lang, role: prof?.role || 'alumne', created: Date.parse(prof?.created_at) || Date.now(), src: 'cloud' };
  const d = row?.data?.results ? row.data : blank(p);
  d.profile = { ...d.profile, ...p, theme: d.profile?.theme };
  cur = d; write(K.data(user.id), d); write(K.sess, { id: user.id, local: false });
  return cur;
}
let pushT = null;
function pushRemote() {
  clearTimeout(pushT);
  pushT = setTimeout(async () => {
    if (!sb || !cur || cur.profile.src !== 'cloud') return;
    const p = cur.profile;
    await sb.from('user_data').upsert({ id: p.id, data: cur, updated_at: new Date().toISOString() });
    await sb.from('profiles').update({ name: p.name, sex: p.sex, exam_date: p.examDate || null, lang: p.lang }).eq('id', p.id);
  }, 800);
}

// ───────── Comptes ─────────
export async function register({ name, email, password, sex, examDate, lang }) {
  email = email.trim().toLowerCase();
  if (sb) {
    const { data, error } = await sb.auth.signUp({ email, password, options: { data: { name: name.trim(), sex, exam_date: examDate || '', lang } } });
    if (error) throw new Error(/registered|exists/i.test(error.message) ? 'taken' : error.message);
    if (!data.session) throw new Error('confirm');
    return loadRemote(data.user);
  }
  return registerLocal({ name, email, password, sex, examDate, lang });
}
async function registerLocal({ name, email, password, sex, examDate, lang, role = 'alumne', demo = false }) {
  const users = read(K.users, []);
  if (users.some((u) => u.email === email)) throw new Error('taken');
  const id = uid(); const salt = uid();
  users.push({ id, email, salt, hash: await sha256(salt + password) });
  write(K.users, users);
  const d = blank({ id, name: name.trim(), email, sex, examDate: examDate || '', lang, role, demo, created: Date.now(), src: 'local' });
  write(K.data(id), d); return d;
}
export async function login(email, password) {
  email = email.trim().toLowerCase();
  if (email === 'admin') email = ADMIN_EMAIL;
  const u = read(K.users, []).find((x) => x.email === email);
  if (u) {
    if (u.hash !== (await sha256(u.salt + password))) throw new Error('login');
    return useLocal(u.id);
  }
  if (sb) {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw new Error(/confirm/i.test(error.message) ? 'confirm' : 'login');
    return loadRemote(data.user);
  }
  throw new Error('login');
}
function useLocal(id) { write(K.sess, { id, local: true }); cur = read(K.data(id), null); if (cur) cur.profile.src = 'local'; return cur; }
export async function logout() { const src = cur?.profile.src; localStorage.removeItem(K.sess); cur = null; if (sb && src === 'cloud') await sb.auth.signOut(); }
export function save() { if (!cur) return; write(K.data(cur.profile.id), cur); if (cur.profile.src === 'cloud') pushRemote(); }
export function update(fn) { if (!cur) return; fn(cur); save(); }
export async function deleteAccount() {
  if (!cur) return; const id = cur.profile.id;
  if (cur.profile.src === 'cloud') await sb.from('user_data').delete().eq('id', id);
  write(K.users, read(K.users, []).filter((u) => u.id !== id));
  localStorage.removeItem(K.data(id)); await logout();
}
export function resetProgress() { update((d) => { Object.assign(d, blank(d.profile)); }); }
export function importData(obj) {
  if (!obj?.profile || !Array.isArray(obj.results)) throw new Error('bad');
  update((d) => { Object.assign(d, blank(d.profile), obj, { profile: { ...obj.profile, id: d.profile.id, email: d.profile.email, role: d.profile.role, src: d.profile.src } }); });
}

// ───────── Panell docent ─────────
export async function listStudents() {
  if (cur?.profile.src === 'cloud' && sb) {
    const { data, error } = await sb.from('profiles').select('id,email,name,sex,exam_date,role,created_at,user_data(data,updated_at)').eq('role', 'alumne');
    if (error) throw error;
    return data.map((p) => {
      const ud = Array.isArray(p.user_data) ? p.user_data[0] : p.user_data;
      const d = ud?.data?.results ? ud.data : blank({});
      d.profile = { ...d.profile, id: p.id, email: p.email, name: p.name, sex: p.sex, examDate: p.exam_date || '', role: p.role };
      return d;
    });
  }
  return read(K.users, []).map((u) => read(K.data(u.id), null)).filter((d) => d && (d.profile.role || 'alumne') === 'alumne');
}

// ───────── Super admin: usuaris i rols ─────────
const adminCloud = () => cur?.profile.src === 'cloud' && sb;
export async function listUsers() {
  if (adminCloud()) {
    const { data, error } = await sb.from('profiles').select('id,email,name,role,created_at,user_data(updated_at)').order('created_at');
    if (error) throw error;
    return data.map((p) => { const ud = Array.isArray(p.user_data) ? p.user_data[0] : p.user_data; return { id: p.id, email: p.email, name: p.name, role: p.role, created: Date.parse(p.created_at), last: ud ? Date.parse(ud.updated_at) : null, src: 'cloud' }; });
  }
  return read(K.users, []).map((u) => { const d = read(K.data(u.id), null); if (!d) return null; return { id: u.id, email: u.email, name: d.profile.name, role: d.profile.role || 'alumne', created: d.profile.created, last: d.results?.[0]?.ts || null, demo: !!d.profile.demo, tests: d.results?.length || 0, src: 'local', protected: u.id === ADMIN.id }; }).filter(Boolean);
}
export async function setRole(id, role) {
  if (!ROLES.includes(role) || id === ADMIN.id) return;
  if (adminCloud()) { const { error } = await sb.from('profiles').update({ role }).eq('id', id); if (error) throw error; return; }
  const d = read(K.data(id), null); if (d) { d.profile.role = role; write(K.data(id), d); }
}
export async function removeUser(id) {
  if (id === ADMIN.id || id === cur?.profile.id) return;
  if (adminCloud()) { const { error } = await sb.from('user_data').delete().eq('id', id); if (error) throw error; return; }
  write(K.users, read(K.users, []).filter((u) => u.id !== id)); localStorage.removeItem(K.data(id));
}
export async function createLocalUser({ name, email, password, role }) {
  const d = await registerLocal({ name, email: email.trim().toLowerCase(), password, sex: 'm', role });
  return d;
}
export async function changeAdminPassword(oldPw, newPw) {
  const users = read(K.users, []); const u = users.find((x) => x.id === cur?.profile.id);
  if (!u || u.hash !== (await sha256(u.salt + oldPw))) throw new Error('login');
  u.salt = uid(); u.hash = await sha256(u.salt + newPw); write(K.users, users);
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

// ───────── Demos (sempre locals) ─────────
const CATS = ['series', 'calc', 'prob', 'letters', 'figseq', 'figodd', 'rotate', 'cubes', 'codes', 'symbols', 'plates', 'digits', 'syn', 'ant', 'analog', 'oddword'];
const GROUP_OF = { series: 'num', calc: 'num', prob: 'num', letters: 'abs', figseq: 'abs', figodd: 'abs', rotate: 'esp', cubes: 'esp', codes: 'per', symbols: 'per', plates: 'mem', digits: 'mem', syn: 'ver', ant: 'ver', analog: 'ver', oddword: 'ver' };
function seed(d, { skill = 0.55, gain = 0.3, tests = 25, lastDays = 0, every = 1.4, fis = 1 } = {}) {
  const now = Date.now(); const sex = d.profile.sex;
  for (let i = tests - 1; i >= 0; i--) {
    const ts = now - (lastDays + i * every) * 864e5 - rnd(0, 36e5 * 5);
    const kind = i % 6 === 0 ? 'test' : 'psico'; const n = kind === 'test' ? 15 : 20;
    const sk = Math.min(0.97, skill + ((tests - i) / tests) * gain);
    const correct = Math.max(0, Math.min(n, Math.round(n * (sk + (Math.random() - 0.5) * 0.15))));
    const wrong = Math.max(0, n - correct - rnd(0, 2)); const blankN = n - correct - wrong;
    const perCat = {};
    if (kind === 'psico') for (let q = 0; q < n; q++) { const c = pick(CATS); perCat[c] = perCat[c] || { c: 0, n: 0, g: GROUP_OF[c] }; perCat[c].n++; if (q < correct) perCat[c].c++; }
    const score = kind === 'test' ? Math.max(0, ((correct - wrong / 4) / n) * 10) : (correct / n) * 10;
    d.results.push({ id: uid(), ts, kind, lk: kind === 'test' ? 'random_test' : 'mixed', label: kind === 'test' ? 'Test aleatori' : 'Psicotècnic barrejat', n, correct, wrong, blank: blankN, score, dur: rnd(400, 900), perCat });
    d.xp += correct * 10 + 20; d.answered += n; d.days[dayKey(new Date(ts))] = 1;
  }
  d.results.sort((a, b) => b.ts - a.ts);
  const base = sex === 'f' ? { circuit: 23.6, press: 13, navette: 4.5 } : { circuit: 20.6, press: 26, navette: 7 };
  d.marks = [40, 25, 10, 2].map((ago, i) => ({ ts: now - (ago + lastDays) * 864e5, circuit: Math.round((base.circuit - fis * i * 0.6) * 10) / 10, press: Math.round(base.press + fis * i * 2.5), navette: base.navette + Math.round(fis * i) * 0.5 }));
  return d;
}
export async function demo() {
  const email = 'demo@campus.local';
  const u = read(K.users, []).find((x) => x.email === email);
  if (u) return useLocal(u.id);
  const exam = new Date(); exam.setDate(exam.getDate() + 86);
  const d = await registerLocal({ name: 'Laia', email, password: uid(), sex: 'f', examDate: dayKey(exam), demo: true });
  seed(d);
  for (let i = 0; i < 4; i++) d.days[dayKey(new Date(Date.now() - i * 864e5))] = 1;
  d.studied = { A1: true, A2: true, A3: true, B1: true, B2: true, C4: true };
  write(K.data(d.profile.id), d);
  return useLocal(d.profile.id);
}
// Docent de demostració amb una classe d'exemple
export async function demoDocent() {
  const email = 'docent@campus.local';
  const u = read(K.users, []).find((x) => x.email === email);
  if (u) return useLocal(u.id);
  await demo().then(() => { cur = null; });
  const exam = new Date(); exam.setDate(exam.getDate() + 86); const ex = dayKey(exam);
  const people = [
    ['Marc', 'm', { skill: 0.62, gain: 0.25, fis: 1.2 }], ['Núria', 'f', { skill: 0.7, gain: 0.2, fis: 1.5 }], ['Pol', 'm', { skill: 0.38, gain: 0.12, tests: 9, lastDays: 11, every: 3, fis: 0.3 }],
    ['Aina', 'f', { skill: 0.55, gain: 0.3, fis: 1 }], ['Jordi', 'm', { skill: 0.45, gain: 0.15, tests: 14, every: 2, fis: 0.6 }], ['Marta', 'f', { skill: 0.66, gain: 0.28, tests: 30, every: 1, fis: 1.3 }],
    ['Ismael', 'm', { skill: 0.5, gain: 0.2, tests: 6, lastDays: 16, every: 4, fis: 0.2 }], ['Clara', 'f', { skill: 0.6, gain: 0.25, tests: 20, fis: 0.9 }],
  ];
  for (const [name, sex, o] of people) {
    const d = await registerLocal({ name, email: `${name.toLowerCase()}@demo.local`.normalize('NFD').replace(/[̀-ͯ]/g, ''), password: uid(), sex, examDate: ex, demo: true });
    seed(d, o);
    d.studied = Object.fromEntries(['A1', 'A2', 'A3', 'A4', 'A5', 'B1', 'B2', 'B3', 'B4', 'C1', 'C4', 'C5'].filter(() => Math.random() < o.skill).map((k) => [k, true]));
    write(K.data(d.profile.id), d);
  }
  const doc = await registerLocal({ name: 'Docent demo', email, password: uid(), sex: 'f', role: 'docent', demo: true });
  return useLocal(doc.profile.id);
}

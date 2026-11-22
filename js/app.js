import { $, $$, esc, icon, toast, confetti, shuffle, sample, fmtTime, fmtDate, fmtNum, dayKey, clamp } from './util.js';
import { t, L, setLang, getLang, LANGS } from './i18n.js';
import * as store from './store.js';
import { TEMARI, QUESTIONS, ALL_TEMES, temaById } from './content.js';
import { CATS, GROUPS, catById, genQuestion, genMixed } from './psico.js';
import { BAREMS, LOAD, points, finalMark, buildPlan, dayName, Navette } from './fitness.js';
import { ring, radar, lineChart, bar } from './charts.js';

const BRAND = 'Sentinella';
const app = $('#app');
let cleanup = null;
let RUN = null; // test en curs
let LAST = null; // darrer resultat
let SIMP1 = null; // resultat de la part 1 del simulacre

// ───────── Preferències: idioma i tema ─────────
function detectLang() { const n = (navigator.language || 'ca').slice(0, 2); return ['ca', 'es', 'en'].includes(n) ? n : 'ca'; }
function applyPrefs() {
  const p = store.prefs(); const u = store.me();
  setLang(u?.profile.lang || p.lang || detectLang());
  document.documentElement.dataset.theme = u?.profile.theme || p.theme || 'dark';
}
function setLanguage(l) { store.setPrefs({ lang: l }); if (store.me()) store.update((d) => { d.profile.lang = l; }); applyPrefs(); render(); }
function toggleTheme() {
  const nt = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  store.setPrefs({ theme: nt }); if (store.me()) store.update((d) => { d.profile.theme = nt; }); applyPrefs(); render();
}

// ───────── Router ─────────
const parse = () => { const h = location.hash.replace(/^#\/?/, ''); const [path, qs] = h.split('?'); const [name, arg] = path.split('/'); return { name: name || '', arg, q: new URLSearchParams(qs || '') }; };
const go = (h) => { if (location.hash === h) render(); else location.hash = h; };
const PUBLIC = ['', 'login', 'register'];

function render() {
  cleanup?.(); cleanup = null;
  applyPrefs();
  const r = parse(); const u = store.me();
  if (!u && !PUBLIC.includes(r.name)) return go('#/login');
  if (u && PUBLIC.includes(r.name)) return go('#/campus');
  const v = (VIEWS[r.name] || VIEWS.campus)(r);
  app.innerHTML = u && !v.bare ? shell(r.name, v.html) : v.html;
  cleanup = v.mount?.() || null;
  if (!v.keepScroll) window.scrollTo(0, 0);
}
addEventListener('hashchange', render);

// ───────── Marc comú ─────────
let LOGO_N = 0;
const logo = (s = 34, id = `lgo${LOGO_N++}`) => `<svg width="${s}" height="${s}" viewBox="0 0 48 48" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#22d3ee"/><stop offset=".55" stop-color="#3b82f6"/><stop offset="1" stop-color="#8b5cf6"/></linearGradient></defs><path d="M24 3 6 9v13c0 11 7.6 19.6 18 23 10.4-3.4 18-12 18-23V9z" fill="url(#${id})"/><path d="M24 12l3.2 6.6 7.2 1-5.2 5 1.3 7.2L24 28.4l-6.5 3.4 1.3-7.2-5.2-5 7.2-1z" fill="#fff"/></svg>`;
const brand = () => `<a class="brand" href="#/" aria-label="${BRAND} by Formacions Alpha"><img class="brand-logo" src="assets/alpha.png" alt="Formacions Alpha"><span><b>${BRAND}</b><small>by Alpha <em>· ${t('brand_sub')}</em></small></span></a>`;
const langSwitch = () => `<div class="seg langs">${LANGS.map(([k]) => `<button data-act="lang" data-v="${k}" class="${getLang() === k ? 'on' : ''}">${k.toUpperCase()}</button>`).join('')}</div>`;
const themeBtn = () => `<button class="icon-btn" data-act="theme" aria-label="${t('theme')}">${icon(document.documentElement.dataset.theme === 'dark' ? 'sun' : 'moon')}</button>`;

const NAV = [['campus', 'home', 'nav_home'], ['psico', 'brain', 'nav_psico'], ['tests', 'book', 'nav_tests'], ['sim', 'timer', 'nav_sim'], ['temari', 'layers', 'nav_temari'], ['fisic', 'dumbbell', 'nav_fisic'], ['hist', 'history', 'nav_hist'], ['perfil', 'user', 'nav_profile']];
const NAV_DOC = ['docent', 'users', 'nav_docent'];
const NAV_ADMIN = ['admin', 'shield', 'nav_admin'];

function shell(active, html) {
  const u = store.me(); const rk = store.rankOf(u.xp); const doc = store.isDocent();
  const map = { tema: 'temari', result: 'tests' };
  const act = map[active] || active;
  const adm = store.isAdmin();
  const nav = adm ? [NAV_ADMIN, NAV_DOC, ...NAV] : doc ? [NAV_DOC, ...NAV] : NAV;
  const mob = adm ? ['admin', 'docent', 'campus', 'psico', 'perfil'] : doc ? ['docent', 'campus', 'psico', 'fisic', 'perfil'] : ['campus', 'psico', 'tests', 'fisic', 'perfil'];
  return `<div class="layout">
    <aside class="side">
      ${brand()}
      <nav>${nav.map(([k, ic, lab]) => `<a href="#/${k}" class="${act === k ? 'on' : ''}">${icon(ic)}<span>${t(lab)}</span></a>`).join('')}</nav>
      <div class="side-foot">
        <div class="me"><div class="avatar">${esc(u.profile.name[0] || '?')}</div><div><b>${esc(u.profile.name)}</b><small>${adm ? t('role_admin') : doc ? t('role_docent') : `${rk.name} · ${u.xp} XP`}</small></div></div>
        <button class="btn ghost sm" data-act="logout">${icon('logout', 16)} ${t('logout')}</button>
        <small class="credit">${t('credit')}</small>
      </div>
    </aside>
    <div class="main">
      <header class="top">
        <div class="top-brand">${brand()}</div>
        <div class="top-right">${langSwitch()}${themeBtn()}</div>
      </header>
      <main class="content">${html}</main>
    </div>
    <nav class="tabbar">${mob.map((k) => { const n = nav.find((x) => x[0] === k); return `<a href="#/${k}" class="${act === k ? 'on' : ''}">${icon(n[1], 22)}<span>${t(k === 'fisic' ? 'nav_fis_short' : n[2])}</span></a>`; }).join('')}</nav>
  </div>`;
}
const pageHead = (title, sub, extra = '') => `<div class="page-head"><div><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ''}</div>${extra}</div>`;

// ───────── Modal ─────────
function modal(html, onMount) {
  const m = document.createElement('div'); m.className = 'modal';
  m.innerHTML = `<div class="modal-bg" data-close></div><div class="sheet">${html}</div>`;
  document.body.appendChild(m); requestAnimationFrame(() => m.classList.add('show'));
  const close = () => { m.classList.remove('show'); setTimeout(() => m.remove(), 250); };
  m.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) close(); });
  onMount?.(m, close);
  return close;
}

// ───────── Equip docent ─────────
const TEAM = [{ name: 'Carmen Entrena', role: ['Equip docent · Creadora de Sentinella', 'Equipo docente · Creadora de Sentinella', 'Teaching team · Creator of Sentinella'], bio: ['Llicenciada en Dret per una universitat pública catalana. Mossa d\'Esquadra des de 2009.', 'Licenciada en Derecho por una universidad pública catalana. Mossa d\'Esquadra desde 2009.', 'Law graduate from a Catalan public university. Mossos d\'Esquadra officer since 2009.'], tags: [['Temari jurídic', 'Temario jurídico', 'Legal syllabus'], ['Entrevista', 'Entrevista', 'Interview'], ['Experiència al cos', 'Experiencia en el cuerpo', 'Police experience']] }];
const teamCard = (m, compact = false) => `<div class="team ${compact ? 'compact' : ''}"><div class="team-av">${esc(m.name[0])}</div><div><span class="kicker">${L(m.role)}</span><h3>${esc(m.name)}</h3><p>${L(m.bio)}</p>${compact ? '' : `<div class="chips">${m.tags.map((x) => `<span class="chip">${L(x)}</span>`).join('')}</div>`}</div></div>`;

// ═════════ LANDING ═════════
function landing() {
  const nQ = QUESTIONS.length;
  const phases = [1, 2, 3, 4, 5, 6].map((i) => `<li><span class="ph-n">${i}</span><div><b>${t('ph' + i)}</b><small>${t('ph' + i + 'd')}</small></div></li>`).join('');
  const feats = [['brain', '#fcc601'], ['book', '#4f8fd6'], ['timer', '#e3352e'], ['run', '#ef8834'], ['chart', '#ffef23'], ['globe', '#1b75ba']].map(([ic, c], i) => `<div class="feat reveal" style="--c:${c}"><div class="feat-ic">${icon(ic, 24)}</div><h3>${t(`f${i + 1}_t`)}</h3><p>${t(`f${i + 1}_d`)}</p></div>`).join('');
  const sampleFig = genQuestion('figseq');
  return { bare: true, html: `
  <div class="landing">
    <header class="lnav">${brand()}<div class="top-right">${langSwitch()}${themeBtn()}<a class="btn ghost sm hide-sm" href="#/login">${t('cta_login')}</a></div></header>
    <section class="hero">
      <div class="hero-txt">
        <span class="pill">${icon('shield', 16)} ${t('hero_kicker')}</span>
        <h1>${t('hero_title')}</h1>
        <p class="hero-sub-h">${t('hero_h2')}</p>
        <p>${t('hero_sub')}</p>
        <div class="cta-row">
          <a class="btn primary lg" href="#/register">${t('cta_register')} ${icon('arrow', 18)}</a>
          <button class="btn glass lg" data-act="demo">${icon('play', 16)} ${t('cta_demo')}</button>
        </div>
        <div class="stats">
          <div><b data-count="${CATS.length}">${CATS.length}</b><small>${t('stat1')}</small></div>
          <div><b data-count="${nQ}">${nQ}</b><small>${t('stat2')}</small></div>
          <div><b>20</b><small>${t('stat3')}</small></div>
          <div><b>3</b><small>${t('stat4')}</small></div>
        </div>
      </div>
      <div class="hero-vis">
        <div class="phone">
          <div class="phone-notch"></div>
          <div class="ph-screen">
            <div class="ph-card grad-card"><small>${t('rank')}</small><b>Caporal</b><div class="bar"><i style="width:68%"></i></div><small>${icon('flame', 14)} 12 ${t('streak')}</small></div>
            <div class="ph-card"><small>${t('c_figseq')}</small><div class="ph-figs">${sampleFig.visual}</div></div>
            <div class="ph-row"><div class="ph-card mini">${ring(0.78, { size: 64, stroke: 7, label: '7,8' })}<small>${t('score')}</small></div><div class="ph-card mini">${ring(0.6, { size: 64, stroke: 7, color: '#ef8834', label: '6,5' })}<small>${t('t_navette')}</small></div></div>
          </div>
        </div>
        <div class="float f1">${icon('check', 16)} +120 XP</div>
        <div class="float f2">${icon('timer', 16)} 34:12</div>
      </div>
    </section>
    <div class="marquee" aria-hidden="true"><div>${[0, 1].map(() => [t('nav_psico'), t('nav_temari'), t('nav_sim'), t('nav_fisic'), 'Mossos d\'Esquadra', 'Mollet del Vallès'].map((x) => `<span>${esc(x)}</span>`).join('')).join('')}</div></div>
    <section class="sec"><div class="feats">${feats}</div></section>
    <section class="sec phases reveal"><h2>${t('phases_t')}</h2><p class="muted">${t('phases_s')}</p><ol class="ph-list">${phases}</ol></section>
    <section class="sec alpha-sec reveal"><img class="alpha-big" src="assets/alpha.png" alt="Formacions Alpha" loading="lazy"><div><span class="kicker">by Formacions Alpha</span><h2>${t('alpha_t')}</h2><p class="muted">${t('alpha_d')}</p><a class="btn glass" href="https://oposicionsalpha.com/" target="_blank" rel="noopener">oposicionsalpha.com ${icon('arrow', 16)}</a></div></section>
    <section class="sec reveal"><h2>${L(['L\'equip docent', 'El equipo docente', 'Teaching team'])}</h2>${TEAM.map((m) => teamCard(m)).join('')}</section>
    <section class="sec cta-final reveal"><h2>${L(['Cap a la plaça.', 'Rumbo a la plaza.', 'Go get your badge.'])}</h2><div class="cta-row center"><a class="btn primary lg" href="#/register">${t('cta_register')}</a><button class="btn glass lg" data-act="demo">${t('cta_demo')}</button><button class="btn glass lg" data-act="demo-doc">${icon('users', 16)} ${t('cta_demo_doc')}</button></div></section>
    <footer class="foot"><p>${t('disclaimer')}</p><p class="credit-foot">${t('credit')}</p><p class="muted">© ${new Date().getFullYear()} ${BRAND} by Formacions Alpha · Mollet del Vallès</p></footer>
  </div>`,
  mount() {
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && e.target.classList.add('in')), { threshold: 0.15 });
    $$('.reveal').forEach((el) => io.observe(el));
    return () => io.disconnect();
  } };
}

// ═════════ AUTH ═════════
function authView(kind) {
  const reg = kind === 'register';
  return { bare: true, html: `
  <div class="auth">
    <div class="auth-side"><div>${brand()}<h2>${t('hero_title')}</h2><p>${t('hero_sub')}</p></div><img class="alpha-big" src="assets/alpha.png" alt="Formacions Alpha"></div>
    <div class="auth-box">
      <div class="auth-top">${langSwitch()}${themeBtn()}</div>
      <h1>${reg ? t('register_t') : t('login_t')}</h1>
      <form id="authf" class="form" novalidate>
        ${reg ? `<label>${t('name')}<input name="name" autocomplete="given-name" required></label>` : ''}
        <label>${t('email')}<input name="email" type="email" autocomplete="email" required></label>
        <label>${t('password')}<input name="password" type="password" autocomplete="${reg ? 'new-password' : 'current-password'}" required minlength="6"></label>
        ${reg ? `<div class="grid2"><label>${t('sex')}<select name="sex"><option value="m">${t('male')}</option><option value="f">${t('female')}</option></select></label><label>${t('exam_date')}<input name="examDate" type="date"></label></div>` : ''}
        <p class="err" id="err"></p>
        <button class="btn primary block lg" type="submit">${reg ? t('cta_register') : t('start')} ${icon('arrow', 18)}</button>
      </form>
      <button class="btn glass block" data-act="demo">${icon('play', 16)} ${t('cta_demo')}</button>
      <button class="btn ghost block" data-act="demo-doc">${icon('users', 16)} ${t('cta_demo_doc')}</button>
      <p class="muted center">${reg ? t('have_account') : t('no_account')} <a href="#/${reg ? 'login' : 'register'}">${reg ? t('cta_login') : t('cta_register')}</a></p>
      <p class="note">${icon(store.cloud() ? 'cloud' : 'lock', 14)} ${t(store.cloud() ? 'cloud_note' : 'local_note')}</p>
      <p class="credit center">${t('credit')}</p>
    </div>
  </div>`,
  mount() {
    $('#authf').addEventListener('submit', async (e) => {
      e.preventDefault(); const f = Object.fromEntries(new FormData(e.target)); const err = $('#err');
      if (!f.email || !f.password || (reg && !f.name)) return (err.textContent = t('err_fill'));
      if (reg && f.password.length < 6) return (err.textContent = t('err_pw'));
      try {
        if (reg) { await store.register({ ...f, lang: getLang() }); toast(t('welcome', { name: f.name })); }
        else await store.login(f.email, f.password);
        go('#/campus');
      } catch (x) { err.textContent = x.message === 'taken' ? t('err_taken') : x.message === 'confirm' ? t('err_confirm') : x.message === 'login' ? t('err_login') : x.message; }
    });
  } };
}

// ═════════ DASHBOARD ═════════
function groupStats(d) {
  const acc = {}; for (const g of GROUPS) acc[g.id] = { c: 0, n: 0 };
  for (const r of d.results) for (const k in r.perCat || {}) { const pc = r.perCat[k]; const g = pc.g || catById(k)?.g; if (acc[g]) { acc[g].c += pc.c; acc[g].n += pc.n; } }
  return acc;
}
function daysTo(date) { if (!date) return null; const ms = new Date(date + 'T09:00:00') - new Date(); return Math.ceil(ms / 864e5); }

function campus() {
  const d = store.me(); const p = d.profile; const rk = store.rankOf(d.xp); const st = store.streak(d);
  const dt = daysTo(p.examDate);
  const res = d.results; const avg = res.length ? res.reduce((a, r) => a + r.score, 0) / res.length : 0;
  const totC = res.reduce((a, r) => a + r.correct, 0), totN = res.reduce((a, r) => a + r.n, 0);
  const gs = groupStats(d);
  const weekAgo = Date.now() - 7 * 864e5; const wk = res.filter((r) => r.ts > weekAgo).length;
  const lastMarks = d.marks.at(-1); const fm = lastMarks ? finalMark(lastMarks, p.sex) : null;
  const todayIdx = (new Date().getDay() + 6) % 7;
  let today = null;
  if (d.plan) { const w = Math.min(d.plan.weeks.length - 1, Math.floor((Date.now() - d.plan.created) / (7 * 864e5))); today = { w, s: d.plan.weeks[w].sessions[todayIdx] }; }
  const quick = [['q_psico', 'brain', '#fcc601', 'quick-psico'], ['q_test', 'book', '#4f8fd6', 'quick-test'], ['q_sim', 'timer', '#e3352e', 'go-sim'], ['q_navette', 'run', '#ef8834', 'go-navette']];
  const pts = res.slice(0, 20).reverse().map((r) => ({ x: r.ts, y: r.score, t: `${r.label}: ${fmtNum(r.score, 1, getLang())}` }));
  return { html: `
    <section class="hello grad-card">
      <div class="hello-l">
        <span class="kicker">${fmtDate(Date.now(), getLang())}</span>
        <h1>${t('hello', { name: esc(p.name) })} 👋</h1>
        <p>${t('hello_sub')}</p>
        <div class="rank"><div class="rank-badge">${icon('award', 20)}</div><div class="rank-txt"><b>${rk.name}</b><small>${d.xp} XP${rk.next ? ' · ' + t('next_rank', { r: rk.next }) : ''}</small>${bar(rk.pct, '#fff')}</div></div>
      </div>
      <div class="hello-r">
        <div class="kpi-big">${icon('flame', 26)}<b>${st}</b><small>${t('streak')}</small></div>
        <div class="kpi-big">${icon('calendar', 26)}${dt != null && dt >= 0 ? `<b>${dt}</b><small>${t('days')} ${t('countdown')}</small>` : `<a href="#/perfil" class="small-link">${t('set_date')}</a>`}</div>
      </div>
    </section>
    <h2 class="sec-t">${t('quick')}</h2>
    <div class="quick">${quick.map(([k, ic, c, act]) => `<button class="qcard" style="--c:${c}" data-act="${act}"><span class="qic">${icon(ic, 24)}</span><b>${t(k)}</b><small>${t(k + '_d')}</small>${icon('arrow', 18, 'qarrow')}</button>`).join('')}</div>
    <div class="kpis">
      <div class="kpi"><small>${t('tests_done')}</small><b>${res.length}</b></div>
      <div class="kpi"><small>${t('avg_score')}</small><b>${fmtNum(avg, 1, getLang())}</b></div>
      <div class="kpi"><small>${t('q_answered')}</small><b>${d.answered}</b></div>
      <div class="kpi"><small>${t('accuracy')}</small><b>${totN ? Math.round((totC / totN) * 100) : 0}%</b></div>
    </div>
    <div class="grid-dash">
      <div class="card">
        <div class="card-h"><h3>${t('aptitudes')}</h3><a href="#/psico" class="small-link">${t('nav_psico')} ${icon('arrow', 14)}</a></div>
        ${radar(GROUPS.map((g) => t('g_' + g.id)), GROUPS.map((g) => (gs[g.id].n ? gs[g.id].c / gs[g.id].n : null)), { colors: GROUPS.map((g) => g.color) })}
      </div>
      <div class="card">
        <div class="card-h"><h3>${t('evolution')}</h3><a href="#/hist" class="small-link">${t('nav_hist')} ${icon('arrow', 14)}</a></div>
        ${pts.length > 1 ? lineChart([{ color: 'var(--accent)', points: pts }], { refs: [{ y: 5, label: '5' }] }) : `<p class="empty">${t('no_tests')}</p>`}
        <div class="goal"><div><b>${t('week_goal')}</b><small>${t('week_goal_d', { n: wk, g: 5 })}</small></div>${bar(wk / 5, 'var(--ok)')}</div>
      </div>
      <div class="card">
        <div class="card-h"><h3>${t('phys_status')}</h3><a href="#/fisic" class="small-link">${t('nav_fisic')} ${icon('arrow', 14)}</a></div>
        ${fm ? `<div class="rings3">${['circuit', 'press', 'navette'].map((k, i) => `<div>${ring(fm.ps[i] / 10, { size: 84, stroke: 9, color: ['#fcc601', '#e3352e', '#ef8834'][i], label: fm.ps[i] })}<small>${t('t_' + k)}</small></div>`).join('')}</div><div class="final-row"><span>${t('final_mark')}: <b>${fmtNum(fm.avg, 2, getLang())}</b></span><span class="tag ${fm.pass ? 'ok' : 'bad'}">${fm.pass ? t('pass') : t('fail')}</span></div>` : `<p class="empty">${t('phys_empty')}</p><a class="btn sm primary" href="#/fisic">${t('tab_calc')}</a>`}
      </div>
      <div class="card">
        <div class="card-h"><h3>${t('today_train')}</h3><span class="chip">${dayName(todayIdx)}</span></div>
        ${today ? `<div class="session s-${today.s.type}"><b>${L(today.s.title)}</b><p>${L(today.s.detail)}</p><small>${t('week')} ${today.w + 1} · ${t('phase_' + d.plan.weeks[today.w].phase)}</small></div><a class="small-link" href="#/fisic?tab=plan">${t('tab_plan')} ${icon('arrow', 14)}</a>` : `<p class="empty">${L(['Genera el teu pla setmanal segons la data de l\'examen.', 'Genera tu plan semanal según la fecha del examen.', 'Build your weekly plan based on your exam date.'])}</p><a class="btn sm primary" href="#/fisic?tab=plan">${t('plan_gen')}</a>`}
      </div>
      <div class="card span2">
        <div class="card-h"><h3>${t('recent')}</h3></div>
        ${res.length ? `<div class="list">${res.slice(0, 5).map(histRow).join('')}</div>` : `<p class="empty">${t('no_tests')}</p>`}
      </div>
      <div class="card">${teamCard(TEAM[0], true)}<p class="muted small">${L(['Dubtes del temari o de l\'entrevista? Pregunta-li a classe.', '¿Dudas del temario o de la entrevista? Pregúntale en clase.', 'Questions about the syllabus or the interview? Ask her in class.'])}</p></div>
    </div>` };
}
function histRow(r) {
  const ic = r.kind === 'psico' ? 'brain' : r.kind === 'sim' ? 'timer' : 'book';
  const c = r.score >= (r.min || 5) ? 'ok' : 'bad';
  return `<div class="hrow"><span class="hic k-${r.kind}">${icon(ic, 18)}</span><div class="hmid"><b>${esc(r.lk ? t(r.lk) : r.label)}</b><small>${fmtDate(r.ts, getLang())} · ${r.correct}/${r.n} · ${fmtTime(r.dur || 0)}</small></div><span class="score ${c}">${fmtNum(r.score, 1, getLang())}</span></div>`;
}

// ═════════ PSICOTÈCNICS ═════════
function psico() {
  const d = store.me(); const gs = groupStats(d);
  return { html: `${pageHead(t('psico_t'), t('psico_s'))}
    <button class="hero-tile" data-act="psico-cfg" data-cat="mixed"><div><span class="kicker">${icon('sparkles', 14)} 80 ${t('questions')} · 35 ${t('min')}</span><h2>${t('mixed')}</h2><p>${t('mixed_d')}</p></div><span class="btn primary">${t('start')} ${icon('arrow', 16)}</span></button>
    ${GROUPS.map((g) => `<section class="grp"><div class="grp-h"><span class="dot" style="background:${g.color}"></span><h2>${t('g_' + g.id)}</h2>${gs[g.id].n ? `<span class="chip">${Math.round((gs[g.id].c / gs[g.id].n) * 100)}% ${t('accuracy').toLowerCase()}</span>` : ''}</div>
      <div class="cats">${CATS.filter((c) => c.g === g.id).map((c) => `<button class="cat" style="--c:${g.color}" data-act="psico-cfg" data-cat="${c.id}"><span class="cat-ic">${icon(c.icon, 22)}</span><b>${t('c_' + c.id)}</b><small>${t('c_' + c.id + '_d')}</small></button>`).join('')}</div></section>`).join('')}` };
}
function psicoCfg(cat) {
  const isMixed = cat === 'mixed';
  const counts = isMixed ? [20, 40, 80] : [10, 20, 30];
  modal(`<div class="sheet-h"><h2>${isMixed ? t('mixed') : t('c_' + cat)}</h2><button class="icon-btn" data-close>${icon('x')}</button></div>
    <p class="muted">${isMixed ? t('mixed_d') : t('c_' + cat + '_d')}</p>
    <label class="lab">${t('n_questions')}</label><div class="seg wide" id="cnt">${counts.map((n, i) => `<button class="${i === (isMixed ? 2 : 1) ? 'on' : ''}" data-v="${n}">${n}</button>`).join('')}</div>
    <label class="lab">${t('mode')}</label>
    <div class="modes" id="mode"><button class="mode ${isMixed ? '' : 'on'}" data-v="train">${icon('sparkles')}<b>${t('mode_train')}</b><small>${t('mode_train_d')}</small></button><button class="mode ${isMixed ? 'on' : ''}" data-v="exam">${icon('timer')}<b>${t('mode_exam')}</b><small>${t('mode_exam_d')}</small></button></div>
    <button class="btn primary block lg" id="go">${t('start')} ${icon('arrow', 18)}</button>`, (m, close) => {
    const pickSeg = (id) => $$(`#${id} button`, m).forEach((b) => b.addEventListener('click', () => { $$(`#${id} button`, m).forEach((x) => x.classList.remove('on')); b.classList.add('on'); }));
    pickSeg('cnt'); pickSeg('mode');
    $('#go', m).addEventListener('click', () => {
      const n = +$('#cnt .on', m).dataset.v; const mode = $('#mode .on', m).dataset.v;
      close();
      const qs = isMixed ? genMixed(n) : Array.from({ length: n }, () => genQuestion(cat));
      startRun({ kind: 'psico', lk: isMixed ? 'mixed' : 'c_' + cat, label: isMixed ? t('mixed') : t('c_' + cat), qs, mode, penalty: false, limit: mode === 'exam' ? Math.round(n * 26.25) : 0, regen: { type: 'psico', cat, n, mode } });
    });
  });
}

// ═════════ TESTS DE CONEIXEMENTS ═════════
const kq = (q) => { const perm = shuffle([0, 1, 2, 3]); return { kq: q.id, cat: q.tema, group: q.tema[0], perm, answer: perm.indexOf(0) }; };
const qById = (id) => QUESTIONS.find((q) => q.id === id);
function startKnowledge(kind, arg) {
  let pool, label, n, limit = 0, mode = 'train';
  if (kind === 'tema') { pool = QUESTIONS.filter((q) => q.tema === arg); label = `${arg} · ${L(temaById(arg).title)}`; n = pool.length; }
  else if (kind === 'ambit') { pool = QUESTIONS.filter((q) => q.tema[0] === arg); label = `${t('ambit')} ${arg}`; n = Math.min(15, pool.length); }
  else if (kind === 'random') { pool = QUESTIONS; label = t('random_test'); n = 15; }
  else if (kind === 'official') { pool = QUESTIONS; label = t('official_test'); n = 30; limit = 35 * 60; mode = 'exam'; }
  else { pool = store.me().mistakes.map(qById).filter(Boolean); label = t('mistakes'); n = pool.length; }
  if (!pool.length) return toast(t('mistakes_empty'), 'info');
  startRun({ kind: 'test', lk: { random: 'random_test', official: 'official_test', mistakes: 'mistakes' }[kind], label, qs: sample(pool, n).map(kq), mode, penalty: true, limit, min: kind === 'official' ? 4 : 5, regen: { type: 'test', kind, arg } });
}
function tests() {
  const d = store.me(); const mist = d.mistakes.length;
  const byTema = {}; for (const q of QUESTIONS) byTema[q.tema] = (byTema[q.tema] || 0) + 1;
  return { html: `${pageHead(t('tests_t'), t('tests_s'))}
    <div class="quick">
      <button class="qcard" style="--c:#e3352e" data-act="ktest" data-k="official"><span class="qic">${icon('timer', 24)}</span><b>${t('official_test')}</b><small>${t('official_test_d')}</small>${icon('arrow', 18, 'qarrow')}</button>
      <button class="qcard" style="--c:#fcc601" data-act="ktest" data-k="random"><span class="qic">${icon('refresh', 24)}</span><b>${t('random_test')}</b><small>${t('random_test_d')}</small>${icon('arrow', 18, 'qarrow')}</button>
      <button class="qcard" style="--c:#1b75ba" data-act="ktest" data-k="mistakes"><span class="qic">${icon('flag', 24)}</span><b>${t('mistakes')}</b><small>${mist ? t('mistakes_d', { n: mist }) : t('mistakes_empty')}</small>${icon('arrow', 18, 'qarrow')}</button>
    </div>
    ${TEMARI.filter((a) => a.id !== 'D').map((a) => `<section class="grp"><div class="grp-h"><span class="dot" style="background:${a.color}"></span><h2>${t('ambit')} ${a.id} · ${L(a.name)}</h2><button class="chip btnchip" data-act="ktest" data-k="ambit" data-a="${a.id}">${icon('play', 12)} ${t('all')}</button></div>
      <div class="temes">${a.temes.map((tm) => `<button class="tema-card" style="--c:${a.color}" data-act="ktest" data-k="tema" data-a="${tm.id}"><span class="tnum">${tm.id}</span><b>${L(tm.title)}</b><small>${t('n_q_bank', { n: byTema[tm.id] || 0 })}</small></button>`).join('')}</div></section>`).join('')}` };
}

// ═════════ SIMULACRE ═════════
function sim(r) {
  if (r.q.get('between') && SIMP1) {
    return { html: `<div class="center-page"><div class="card big-card">${ring(SIMP1.score / 10, { size: 140, stroke: 14, label: fmtNum(SIMP1.score, 2, getLang()), sub: t('sim_p1') })}<p>${t('sim_between')}</p><button class="btn primary lg" data-act="sim-p2">${t('sim_p2')} ${icon('arrow', 18)}</button></div></div>` };
  }
  return { html: `${pageHead(t('sim_t'), t('sim_s'))}
    <div class="sim-parts">
      <div class="card sim-part"><span class="sim-n">1</span><h3>${t('sim_p1')}</h3><ul><li>30 ${t('questions')}</li><li>35 ${t('min')}</li><li>−1/4</li><li>${t('min_req', { n: 4 })}</li></ul></div>
      <div class="card sim-part"><span class="sim-n">2</span><h3>${t('sim_p2')}</h3><ul><li>80 ${t('questions')}</li><li>35 ${t('min')}</li><li>${L(['Sense penalització', 'Sin penalización', 'No penalty'])}</li><li>${t('min_req', { n: 5 })}</li></ul></div>
    </div>
    <button class="btn primary lg" data-act="sim-start">${icon('play', 16)} ${t('sim_go')}</button>
    <p class="note">${t('penalty_note')}<br>${t('nopenalty_note')}</p>` };
}

// ═════════ RUNNER ═════════
function startRun(cfg) {
  RUN = { ...cfg, i: 0, ans: Array(cfg.qs.length).fill(null), shown: Array(cfg.qs.length).fill(false), memoSeen: {}, started: Date.now() };
  go('#/run');
}
function qView(q) {
  if (q.kq) { const raw = qById(q.kq); return { prompt: esc(L(raw.q)), options: q.perm.map((k) => esc(L(raw.o[k]))), explain: raw.e ? L(raw.e) : '', chip: `${raw.tema} · ${L(temaById(raw.tema).title)}`, color: TEMARI.find((a) => a.id === raw.tema[0]).color }; }
  return { ...q, chip: t('c_' + q.cat), color: GROUPS.find((g) => g.id === q.group)?.color };
}
function runView() {
  if (!RUN) return (setTimeout(() => go('#/campus')), { html: '' });
  const r = RUN; const n = r.qs.length; const q = r.qs[r.i]; const v = qView(q);
  const train = r.mode === 'train';
  const answered = r.ans.filter((a) => a != null).length;
  const top = `<div class="run-top"><button class="icon-btn" data-act="run-quit" aria-label="${t('close')}">${icon('x')}</button><div class="run-title"><b>${esc(r.label)}</b><small>${t('q_of', { i: r.i + 1, n })}</small></div>${r.limit ? `<div class="timer" id="timer">${icon('clock', 16)} <span>--:--</span></div>` : `<div class="timer soft" id="timer">${icon('clock', 16)} <span>00:00</span></div>`}</div><div class="run-prog"><i style="width:${((train ? r.i : answered) / n) * 100}%"></i></div>`;
  if (q.memo && !r.memoSeen[r.i]) {
    return { bare: true, html: `<div class="run">${top}<div class="qwrap"><div class="qcard-run memo"><span class="qchip" style="--c:${v.color}">${v.chip}</span>${q.memo.html}<div class="memo-bar"><i id="memobar"></i></div><button class="btn primary lg" data-act="memo-ready">${t('ready')}</button></div></div></div>`, mount() { const s = Date.now(); const T = q.memo.seconds * 1000; const id = setInterval(() => { const p = (Date.now() - s) / T; const b = $('#memobar'); if (b) b.style.width = Math.min(100, p * 100) + '%'; if (p >= 1) { clearInterval(id); r.memoSeen[r.i] = true; render(); } }, 50); const tm = mountTimer(); return () => { clearInterval(id); tm(); }; } };
  }
  const sel = r.ans[r.i]; const shown = train && r.shown[r.i];
  const opts = v.options.map((o, k) => {
    let cls = '';
    if (shown) cls = k === q.answer ? 'ok' : k === sel ? 'bad' : 'dim';
    else if (sel === k) cls = 'sel';
    return `<button class="opt ${v.optClass || ''} ${cls}" data-act="answer" data-k="${k}" ${shown ? 'disabled' : ''}><span class="opt-l">${'ABCD'[k]}</span><span class="opt-c">${o}</span></button>`;
  }).join('');
  const exp = shown ? `<div class="explain ${sel === q.answer ? 'ok' : 'bad'}">${icon(sel === q.answer ? 'check' : 'x', 18)}<div><b>${sel === q.answer ? L(['Correcte!', '¡Correcto!', 'Correct!']) : sel == null ? t('no_answer') : L(['Incorrecte', 'Incorrecto', 'Wrong'])}</b>${v.explain ? `<p>${esc(v.explain)}</p>` : ''}</div></div>` : '';
  const nav = train
    ? `<div class="run-nav">${shown ? `<button class="btn primary lg grow" data-act="${r.i + 1 < n ? 'next' : 'finish'}">${r.i + 1 < n ? t('next') : t('finish')} ${icon('arrow', 18)}</button>` : `<button class="btn ghost" data-act="skip">${t('skip')}</button><button class="btn ghost" data-act="finish-ask">${t('end_test')}</button>`}</div>`
    : `<div class="run-nav"><button class="btn ghost" data-act="prev" ${r.i === 0 ? 'disabled' : ''}>${icon('back', 18)}</button><button class="btn ghost grid-btn" data-act="grid">${answered}/${n}</button>${r.i + 1 < n ? `<button class="btn primary grow" data-act="next">${t('next')} ${icon('arrow', 18)}</button>` : ''}<button class="btn ${r.i + 1 < n ? 'ghost' : 'primary grow'}" data-act="finish-ask">${t('finish')}</button></div>`;
  return { bare: true, keepScroll: false, html: `<div class="run">${top}<div class="qwrap"><div class="qcard-run" key="${r.i}"><span class="qchip" style="--c:${v.color}">${v.chip}</span><h2 class="qtext">${v.prompt}</h2>${v.visual || ''}<div class="opts ${v.optClass ? 'opts-grid' : ''}">${opts}</div>${exp}</div></div>${nav}</div>`, mount: mountTimer };
}
function mountTimer() {
  if (!RUN) return null;
  const tick = () => {
    if (!RUN) return; const el = $('#timer span'); const el2 = $('#timer');
    const el0 = (Date.now() - RUN.started) / 1000;
    if (RUN.limit) { const left = RUN.limit - el0; if (el) el.textContent = fmtTime(left); el2?.classList.toggle('warn', left < 120); if (left <= 0) { toast(t('time_up'), 'info'); finishRun(); } }
    else if (el) el.textContent = fmtTime(el0);
  };
  tick(); const id = setInterval(tick, 500);
  const key = (e) => {
    if (!RUN || e.target.closest('input,textarea')) return;
    const k = { a: 0, b: 1, c: 2, d: 3, 1: 0, 2: 1, 3: 2, 4: 3 }[e.key.toLowerCase()];
    if (k != null) $$('.opt')[k]?.click();
    else if (e.key === 'ArrowRight' || e.key === 'Enter') $('[data-act="next"]')?.click();
    else if (e.key === 'ArrowLeft') $('[data-act="prev"]')?.click();
  };
  addEventListener('keydown', key);
  return () => { clearInterval(id); removeEventListener('keydown', key); };
}
function finishRun() {
  const r = RUN; if (!r) return; RUN = null;
  const n = r.qs.length; let c = 0, w = 0, b = 0; const perCat = {};
  r.qs.forEach((q, i) => { const a = r.ans[i]; const pc = (perCat[q.cat] ||= { c: 0, n: 0, g: q.kq ? undefined : q.group }); pc.n++; if (a == null) b++; else if (a === q.answer) { c++; pc.c++; } else w++; });
  const score = r.penalty ? Math.max(0, ((c - w / 4) / n) * 10) : (c / n) * 10;
  const dur = Math.round((Date.now() - r.started) / 1000);
  // errades de coneixements
  if (r.kind === 'test' || r.sim) store.update((d) => { const set = new Set(d.mistakes); r.qs.forEach((q, i) => { if (!q.kq) return; if (r.ans[i] === q.answer) set.delete(q.kq); else set.add(q.kq); }); d.mistakes = [...set]; });
  const part = { c, w, b, n, score, dur, perCat };
  if (r.sim === 1) { SIMP1 = { ...part, qs: r.qs, ans: r.ans }; return go('#/sim?between=1'); }
  const before = new Set(badges(store.me()).filter((x) => x.ok).map((x) => x.k));
  let result;
  if (r.sim === 2) {
    const p1 = SIMP1; SIMP1 = null;
    const pass = p1.score >= 4 && score >= 5;
    result = { kind: 'sim', lk: 'sim_t', label: t('sim_t'), n: p1.n + n, correct: p1.c + c, wrong: p1.w + w, blank: p1.b + b, score: (p1.score + score) / 2, dur: p1.dur + dur, perCat, parts: [{ score: p1.score, c: p1.c, n: p1.n, min: 4 }, { score, c, n, min: 5 }], pass, min: 5 };
    LAST = { result, qs: [...p1.qs, ...r.qs], ans: [...p1.ans, ...r.ans], regen: r.regen };
  } else {
    result = { kind: r.kind, lk: r.lk, label: r.label, n, correct: c, wrong: w, blank: b, score, dur, perCat, penalty: r.penalty, min: r.min || 5, pass: score >= (r.min || 5) };
    LAST = { result, qs: r.qs, ans: r.ans, regen: r.regen };
  }
  LAST.xp = store.addResult(result);
  LAST.newBadges = badges(store.me()).filter((x) => x.ok && !before.has(x.k));
  go('#/result');
}
function resultView(r) {
  if (!LAST) return (setTimeout(() => go('#/campus')), { html: '' });
  const R = LAST.result; const showReview = r.q.get('review');
  const pass = R.pass;
  const cats = Object.entries(R.perCat || {});
  const head = `<div class="result-hero ${pass ? 'pass' : 'fail'}">
    ${ring(R.score / 10, { size: 170, stroke: 16, color: pass ? 'var(--ok)' : 'var(--bad)', label: fmtNum(R.score, 2, getLang()), sub: t('score') })}
    <div><span class="tag ${pass ? 'ok' : 'bad'} lg">${pass ? t('pass') : t('fail')}</span><h1>${esc(R.label)}</h1><p class="muted">${R.kind === 'psico' ? t('nopenalty_note') : R.kind === 'sim' ? '' : t('penalty_note')}</p><span class="xp-pill">${icon('sparkles', 16)} ${t('xp_gain', { n: LAST.xp })}</span></div></div>`;
  const tiles = `<div class="kpis"><div class="kpi ok"><small>${t('correct')}</small><b>${R.correct}</b></div><div class="kpi bad"><small>${t('wrong')}</small><b>${R.wrong}</b></div><div class="kpi"><small>${t('blank')}</small><b>${R.blank}</b></div><div class="kpi"><small>${t('time')}</small><b>${fmtTime(R.dur)}</b></div></div>`;
  const parts = R.parts ? `<div class="sim-parts">${R.parts.map((p, i) => `<div class="card sim-part"><span class="sim-n">${i + 1}</span><h3>${t(i ? 'sim_p2' : 'sim_p1')}</h3>${ring(p.score / 10, { size: 100, stroke: 10, color: p.score >= p.min ? 'var(--ok)' : 'var(--bad)', label: fmtNum(p.score, 2, getLang()) })}<p>${p.c}/${p.n} · ${t('min_req', { n: p.min })}</p></div>`).join('')}</div>` : '';
  const catHtml = cats.length > 1 ? `<div class="card"><h3>${t('by_cat')}</h3>${cats.map(([k, v]) => `<div class="cat-row"><span>${v.g ? t('c_' + k) : `${k} · ${L(temaById(k)?.title || k)}`}</span><b>${v.c}/${v.n}</b>${bar(v.c / v.n, v.c / v.n >= 0.5 ? 'var(--ok)' : 'var(--bad)')}</div>`).join('')}</div>` : '';
  const review = showReview ? `<div class="review">${LAST.qs.map((q, i) => { const v = qView(q); const a = LAST.ans[i]; return `<div class="card rev ${a === q.answer ? 'ok' : a == null ? '' : 'bad'}"><span class="qchip" style="--c:${v.color}">${i + 1} · ${v.chip}</span><div class="qtext sm">${v.prompt}</div>${v.visual || (q.memo ? q.memo.html : '')}<div class="opts ${v.optClass ? 'opts-grid' : ''} small">${v.options.map((o, k) => `<div class="opt ${v.optClass || ''} ${k === q.answer ? 'ok' : k === a ? 'bad' : 'dim'}"><span class="opt-l">${'ABCD'[k]}</span><span class="opt-c">${o}</span></div>`).join('')}</div>${v.explain ? `<p class="muted small">${esc(v.explain)}</p>` : ''}</div>`; }).join('')}</div>` : '';
  return { html: `${head}${tiles}${parts}${catHtml}
    <div class="cta-row"><a class="btn primary" href="#/result?review=1">${icon('eye', 16)} ${t('review')}</a><button class="btn glass" data-act="retry">${icon('refresh', 16)} ${t('retry')}</button><a class="btn ghost" href="#/campus">${t('nav_home')}</a></div>${review}`,
  mount() { if (!showReview) { if (pass) confetti(); for (const b of LAST.newBadges || []) toast(`${t('badges')}: ${b.name}`, 'info'); LAST.newBadges = []; } } };
}

// ═════════ TEMARI ═════════
function temari() {
  const d = store.me(); const tot = ALL_TEMES.length; const st = Object.keys(d.studied).filter((k) => d.studied[k]).length;
  return { html: `${pageHead(t('temari_t'), t('temari_s'), `<div class="head-ring">${ring(st / tot, { size: 74, stroke: 8, label: `${st}/${tot}` })}<small>${t('studied_n', { n: st, t: tot })}</small></div>`)}
    ${TEMARI.map((a) => `<section class="grp"><div class="grp-h"><span class="dot" style="background:${a.color}"></span><h2>${t('ambit')} ${a.id} · ${L(a.name)}</h2></div><div class="temes">${a.temes.map((tm) => `<a class="tema-card ${d.studied[tm.id] ? 'done' : ''}" style="--c:${a.color}" href="#/tema/${tm.id}"><span class="tnum">${tm.id}</span><b>${L(tm.title)}</b>${d.studied[tm.id] ? `<small class="ok-txt">${icon('check', 14)} ${t('studied')}</small>` : `<small>${tm.points.length} ${t('key_points').toLowerCase()}</small>`}</a>`).join('')}</div></section>`).join('')}
    <p class="note">${icon('book', 14)} ${t('official_src')}: <a href="https://dsp.interior.gencat.cat/handle/20.500.14007/3365" target="_blank" rel="noopener">Guia d'estudi (ISPC)</a> · <a href="https://mossos.gencat.cat" target="_blank" rel="noopener">mossos.gencat.cat</a></p>` };
}
function tema(r) {
  const tm = temaById(r.arg); if (!tm) return temari();
  const d = store.me(); const nq = QUESTIONS.filter((q) => q.tema === tm.id).length;
  return { html: `<a class="back" href="#/temari">${icon('back', 16)} ${t('temari_t')}</a>
    <div class="tema-hero" style="--c:${tm.color}"><span class="tnum big">${tm.id}</span><div><span class="kicker">${t('ambit')} ${tm.ambit}</span><h1>${L(tm.title)}</h1></div></div>
    <div class="grid-2">
      <div class="card"><h3>${t('key_points')}</h3><ol class="points">${tm.points.map((p) => `<li>${esc(L(p))}</li>`).join('')}</ol>
        <div class="cta-row"><button class="btn ${d.studied[tm.id] ? 'ok-btn' : 'glass'}" data-act="studied" data-t="${tm.id}">${icon('check', 16)} ${d.studied[tm.id] ? t('studied') : t('mark_studied')}</button>${nq ? `<button class="btn primary" data-act="ktest" data-k="tema" data-a="${tm.id}">${icon('play', 14)} ${t('test_tema')} (${nq})</button>` : ''}</div></div>
      <div class="card"><h3>${icon('note', 18)} ${t('my_notes')}</h3><textarea id="notes" rows="12" placeholder="${t('notes_ph')}">${esc(d.notes[tm.id] || '')}</textarea><small class="muted" id="nsaved"></small></div>
    </div>`,
  mount() { let to; const ta = $('#notes'); ta.addEventListener('input', () => { clearTimeout(to); to = setTimeout(() => { store.update((d2) => { d2.notes[tm.id] = ta.value; }); $('#nsaved').textContent = '✓ ' + t('notes_saved'); }, 500); }); return () => clearTimeout(to); } };
}

// ═════════ FÍSIC ═════════
let NAV_ENGINE = null;
function fisic(r) {
  const d = store.me(); const tab = r.q.get('tab') || 'calc'; const sex = r.q.get('sex') || d.profile.sex || 'm';
  const tabs = ['calc', 'plan', 'tools', 'log', 'barems'];
  const head = `${pageHead(t('fis_t'), t('fis_s'), `<div class="seg">${['m', 'f'].map((s) => `<a href="#/fisic?tab=${tab}&sex=${s}" class="${sex === s ? 'on' : ''}">${t(s === 'm' ? 'male' : 'female')}</a>`).join('')}</div>`)}
    <div class="tabs">${tabs.map((k) => `<a href="#/fisic?tab=${k}&sex=${sex}" class="${tab === k ? 'on' : ''}">${t('tab_' + k)}</a>`).join('')}</div>`;
  const ld = LOAD[sex]; const last = d.marks.at(-1) || {};
  const tests3 = [['circuit', 'u_sec', 0.1, 'circuit_d', { kg: ld.sack }, '#fcc601'], ['press', 'u_reps', 1, 'press_d', { kg: ld.press }, '#e3352e'], ['navette', 'u_pal', 0.5, 'navette_d', {}, '#ef8834']];
  let body = '', mount = null;
  if (tab === 'calc') {
    body = `<div class="calc">${tests3.map(([k, u, step, dk, vars, c]) => `<div class="card ptest" style="--c:${c}"><div class="ptest-h"><span class="qic">${icon(k === 'navette' ? 'run' : k === 'press' ? 'dumbbell' : 'bolt', 22)}</span><div><h3>${t('t_' + k)}</h3><small>${t(dk, vars)}</small></div></div><label class="big-input"><input type="number" inputmode="decimal" step="${step}" min="0" data-mark="${k}" value="${last[k] ?? ''}" placeholder="–"><span>${t(u)}</span></label><div class="pts" id="pt-${k}"></div></div>`).join('')}</div>
      <div class="card final-card"><div id="fring"></div><div><h3>${t('final_mark')}</h3><p class="muted">${t('min_note')}</p><button class="btn primary" data-act="save-marks" data-sex="${sex}">${icon('check', 16)} ${t('save_marks')}</button></div></div>`;
    mount = () => {
      const upd = () => {
        const m = {}; $$('[data-mark]').forEach((i) => { m[i.dataset.mark] = i.value === '' ? null : +i.value; });
        for (const k of ['circuit', 'press', 'navette']) { const p = points(k, m[k], sex); $('#pt-' + k).innerHTML = p == null ? '' : `<b class="${p >= 5 ? 'ok-txt' : p >= 1 ? 'warn-txt' : 'bad-txt'}">${p}</b> ${t('points').toLowerCase()} ${bar(p / 10, p >= 5 ? 'var(--ok)' : p >= 1 ? 'var(--warn)' : 'var(--bad)')}`; }
        const fm = finalMark(m, sex);
        $('#fring').innerHTML = ring((fm.avg ?? 0) / 10, { size: 130, stroke: 13, color: fm.pass ? 'var(--ok)' : fm.pass === false ? 'var(--bad)' : 'var(--accent)', label: fm.avg == null ? '–' : fmtNum(fm.avg, 2, getLang()), sub: fm.pass == null ? '' : fm.pass ? t('pass') : t('fail') });
      };
      $$('[data-mark]').forEach((i) => i.addEventListener('input', upd)); upd();
    };
  } else if (tab === 'plan') {
    const dt = daysTo(d.profile.examDate); const wDef = dt ? clamp(Math.floor(dt / 7), 4, 24) : 12;
    const plan = d.plan; const curW = plan ? Math.min(plan.weeks.length - 1, Math.floor((Date.now() - plan.created) / (7 * 864e5))) : 0;
    const todayIdx = (new Date().getDay() + 6) % 7;
    body = `<div class="card plan-cfg"><label>${t('plan_level')}<select id="lvl">${[1, 2, 3].map((l) => `<option value="${l}" ${plan?.level == l ? 'selected' : ''}>${t('lvl' + l)}</option>`).join('')}</select></label><label>${t('plan_weeks')}<input id="wks" type="number" min="4" max="24" value="${plan?.weeks.length || wDef}"></label><button class="btn primary" data-act="gen-plan" data-sex="${sex}">${icon('sparkles', 16)} ${t('plan_gen')}</button></div>
      ${plan ? plan.weeks.map((w, wi) => `<details class="week ${wi === curW ? 'cur' : ''}" ${wi === curW ? 'open' : ''}><summary><b>${t('week')} ${w.week}</b><span class="chip ph-${w.phase}">${t('phase_' + w.phase)}</span><span class="wdone">${w.sessions.filter((_, si) => d.planDone[`${wi}-${si}`]).length}/7</span></summary><div class="sessions">${w.sessions.map((s, si) => `<label class="session s-${s.type} ${wi === curW && si === todayIdx ? 'today' : ''}"><input type="checkbox" data-done="${wi}-${si}" ${d.planDone[`${wi}-${si}`] ? 'checked' : ''}><div><small>${dayName(si)}${wi === curW && si === todayIdx ? ' · ' + t('today') : ''}</small><b>${L(s.title)}</b><p>${L(s.detail)}</p></div></label>`).join('')}</div></details>`).join('') : ''}`;
    mount = () => { $$('[data-done]').forEach((c) => c.addEventListener('change', () => { store.update((d2) => { d2.planDone[c.dataset.done] = c.checked; }); if (c.checked) toast('+1 💪'); })); };
  } else if (tab === 'tools') {
    body = `<div class="tools">
      <div class="card tool" id="tnav"><div class="tool-h"><span class="qic" style="--c:#ef8834">${icon('run', 22)}</span><div><h3>${t('tool_navette')}</h3><small>${t('tool_navette_d')}</small></div></div>
        <div class="nav-disp"><div class="nav-big"><small>${t('palier')}</small><b id="nv-pal">0</b></div><div class="nav-stats"><div><small>${t('speed')}</small><b id="nv-spd">8,5 km/h</b></div><div><small>${t('shuttle')}</small><b id="nv-sh">0/7</b></div></div><div class="nav-track"><i id="nv-runner"></i></div><div class="nav-count" id="nv-cd"></div></div>
        <div class="cta-row"><button class="btn primary" id="nv-go">${icon('play', 16)} ${t('start')}</button><button class="btn ghost" id="nv-stop" disabled>${icon('pause', 16)} ${t('stop')}</button><button class="btn glass" id="nv-save" disabled>${t('save_result')}</button></div><p class="note">${icon('volume', 14)} ${t('sound_on')}</p></div>
      <div class="card tool"><div class="tool-h"><span class="qic" style="--c:#e3352e">${icon('dumbbell', 22)}</span><div><h3>${t('tool_press')}</h3><small>${t('tool_press_d')} (${ld.press} kg)</small></div></div>
        <button class="tap" id="pr-tap" disabled><b id="pr-n">0</b><small>${t('reps')}</small></button><div class="pr-time" id="pr-t">00:45</div>
        <div class="cta-row"><button class="btn primary" id="pr-go">${icon('play', 16)} ${t('start')}</button><button class="btn ghost" id="pr-reset">${t('reset')}</button><button class="btn glass" id="pr-save" disabled>${t('save_result')}</button></div></div>
      <div class="card tool"><div class="tool-h"><span class="qic" style="--c:#fcc601">${icon('timer', 22)}</span><div><h3>${t('tool_chrono')}</h3><small>${t('tool_chrono_d')}</small></div></div>
        <div class="chrono" id="ch-t">0,0</div><div class="cta-row"><button class="btn primary" id="ch-go">${icon('play', 16)} ${t('start')}</button><button class="btn ghost" id="ch-reset">${t('reset')}</button></div><ol class="laps" id="ch-laps"></ol></div>
    </div>`;
    mount = () => mountTools(sex);
  } else if (tab === 'log') {
    const ms = d.marks;
    body = ms.length ? `<div class="grid-3">${tests3.map(([k, u, , , , c]) => { const tb = BAREMS[sex][k]; const vals = ms.map((m) => m[k]).filter((v) => v != null); const lo = Math.min(...vals, tb[0], tb[9]), hi = Math.max(...vals, tb[0], tb[9]); const pad = (hi - lo) * 0.15; const last2 = ms.at(-1)[k]; return `<div class="card"><div class="card-h"><h3>${t('t_' + k)}</h3><span class="chip">${last2 ?? '–'} ${t(u).split(' ')[0]}</span></div>${lineChart([{ color: c, points: ms.filter((m) => m[k] != null).map((m) => ({ x: m.ts, y: m[k], t: `${fmtDate(m.ts, getLang())}: ${m[k]}` })) }], { min: lo - pad, max: hi + pad, invert: k === 'circuit', refs: [{ y: tb[4], label: '5', color: 'var(--warn)' }, { y: tb[9], label: '10', color: 'var(--ok)' }], height: 220 })}<p class="muted small">${t('points')}: <b>${points(k, last2, sex) ?? '–'}</b>/10</p></div>`; }).join('')}</div>
      <div class="card"><h3>${t('log_t')}</h3><div class="list">${[...ms].reverse().map((m, i) => { const fm = finalMark(m, sex); return `<div class="hrow"><span class="hic k-fis">${icon('dumbbell', 18)}</span><div class="hmid"><b>${fmtDate(m.ts, getLang())}</b><small>${t('t_circuit')} ${m.circuit ?? '–'} s · ${t('t_press')} ${m.press ?? '–'} · ${t('t_navette')} ${m.navette ?? '–'}</small></div>${fm.avg != null ? `<span class="score ${fm.pass ? 'ok' : 'bad'}">${fmtNum(fm.avg, 1, getLang())}</span>` : ''}<button class="icon-btn sm" data-act="del-mark" data-i="${ms.length - 1 - i}" aria-label="${t('del')}">${icon('trash', 16)}</button></div>`; }).join('')}</div></div>` : `<div class="card"><p class="empty">${t('log_empty')}</p></div>`;
  } else {
    const tb = BAREMS[sex];
    body = `<div class="card"><div class="table-wrap"><table class="barem"><thead><tr><th>${t('points')}</th><th>${t('t_circuit')}<small>${t('u_sec')}</small></th><th>${t('t_press')}<small>${t('u_reps')}</small></th><th>${t('t_navette')}<small>${t('u_pal')}</small></th></tr></thead><tbody>${[9, 8, 7, 6, 5, 4, 3, 2, 1, 0].map((i) => { const mine = (k) => points(k, last[k], sex) === i + 1; return `<tr class="${i >= 4 ? 'pass-row' : ''}"><td><b>${i + 1}</b></td><td class="${mine('circuit') ? 'mine' : ''}">${i === 9 ? '≤ ' : ''}${fmtNum(tb.circuit[i], 1, getLang())}</td><td class="${mine('press') ? 'mine' : ''}">${i === 9 ? '≥ ' : ''}${tb.press[i]}</td><td class="${mine('navette') ? 'mine' : ''}">${i === 9 ? '≥ ' : ''}${fmtNum(tb.navette[i], 1, getLang())}</td></tr>`; }).join('')}<tr class="zero"><td>0</td><td>&gt; ${fmtNum(tb.circuit[0], 1, getLang())}</td><td>&lt; ${tb.press[0]}</td><td>&lt; ${fmtNum(tb.navette[0], 1, getLang())}</td></tr></tbody></table></div><p class="note">${t('barems_src')}</p></div>
      <div class="grid-3">${tests3.map(([k, , , dk, vars, c]) => `<div class="card ptest" style="--c:${c}"><h3>${t('t_' + k)}</h3><p class="muted">${t(dk, vars)}</p></div>`).join('')}</div>`;
  }
  return { html: head + body, mount };
}
function mountTools(sex) {
  // Course navette
  const upd = (s) => {
    $('#nv-pal').textContent = fmtNum(s.palier, 1, getLang()); $('#nv-spd').textContent = `${fmtNum(s.speed, 1, getLang())} km/h`; $('#nv-sh').textContent = `${s.shuttle}/${s.per}`;
    $('#nv-cd').textContent = s.countdown ? s.countdown : '';
    const runner = $('#nv-runner'); const dir = s.total % 2 === 0; runner.style.left = `${(dir ? s.progress : 1 - s.progress) * 100}%`;
  };
  NAV_ENGINE?.stop(); NAV_ENGINE = new Navette(upd); let navRes = null;
  $('#nv-go').onclick = () => { NAV_ENGINE.start(); $('#nv-go').disabled = true; $('#nv-stop').disabled = false; $('#nv-save').disabled = true; };
  $('#nv-stop').onclick = () => { navRes = NAV_ENGINE.stop(); $('#nv-go').disabled = false; $('#nv-stop').disabled = true; $('#nv-save').disabled = !(navRes > 0); };
  $('#nv-save').onclick = () => saveMark({ navette: navRes });
  // Press
  let prN = 0, prEnd = 0, prId = null;
  const prT = () => { const left = Math.max(0, (prEnd - Date.now()) / 1000); $('#pr-t').textContent = fmtTime(Math.ceil(left)); if (left <= 0) { clearInterval(prId); prId = null; $('#pr-tap').disabled = true; $('#pr-save').disabled = false; navigator.vibrate?.(400); } };
  $('#pr-go').onclick = () => { prN = 0; $('#pr-n').textContent = 0; prEnd = Date.now() + 45000; $('#pr-tap').disabled = false; $('#pr-save').disabled = true; clearInterval(prId); prId = setInterval(prT, 200); prT(); };
  $('#pr-tap').onclick = () => { prN++; $('#pr-n').textContent = prN; navigator.vibrate?.(20); const b = $('#pr-tap'); b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); };
  $('#pr-reset').onclick = () => { clearInterval(prId); prId = null; prN = 0; $('#pr-n').textContent = 0; $('#pr-t').textContent = '00:45'; $('#pr-tap').disabled = true; };
  $('#pr-save').onclick = () => saveMark({ press: prN });
  // Cronòmetre
  let chS = 0, chId = null, laps = [];
  const chFmt = (ms) => fmtNum(Math.floor(ms / 100) / 10, 1, getLang()).replace(/^(\d+)$/, `$1${getLang() === 'en' ? '.0' : ',0'}`);
  $('#ch-go').onclick = () => {
    if (chId) { clearInterval(chId); chId = null; const v = Math.floor((Date.now() - chS) / 100) / 10; laps.push(v); $('#ch-go').innerHTML = `${icon('play', 16)} ${t('start')}`; drawLaps(); }
    else { chS = Date.now(); chId = setInterval(() => { $('#ch-t').textContent = chFmt(Date.now() - chS); }, 50); $('#ch-go').innerHTML = `${icon('pause', 16)} ${t('stop')}`; }
  };
  $('#ch-reset').onclick = () => { clearInterval(chId); chId = null; laps = []; $('#ch-t').textContent = '0,0'; $('#ch-go').innerHTML = `${icon('play', 16)} ${t('start')}`; drawLaps(); };
  const drawLaps = () => { const best = Math.min(...laps); $('#ch-laps').innerHTML = laps.map((v, i) => `<li class="${v === best ? 'best' : ''}"><span>${t('lap')} ${i + 1}</span><b>${fmtNum(v, 1, getLang())} s</b><small>${points('circuit', v, sex)} ${t('points').toLowerCase()}</small>${v === best ? `<button class="btn sm glass" data-act="save-lap" data-v="${v}">${t('save_result')}</button>` : ''}</li>`).join(''); };
  return () => { NAV_ENGINE?.stop(); NAV_ENGINE = null; clearInterval(prId); clearInterval(chId); };
}
function saveMark(part) {
  store.update((d) => { const last = d.marks.at(-1); const today = last && dayKey(new Date(last.ts)) === dayKey(); if (today) Object.assign(last, part, { ts: Date.now() }); else d.marks.push({ ts: Date.now(), circuit: null, press: null, navette: null, ...(last ? { circuit: last.circuit, press: last.press, navette: last.navette } : {}), ...part }); });
  toast(t('marks_saved'));
}

// ═════════ HISTORIAL ═════════
function hist(r) {
  const d = store.me(); const f = r.q.get('f') || 'all';
  const list = d.results.filter((x) => f === 'all' || x.kind === f);
  const pts = [...list].reverse().map((x) => ({ x: x.ts, y: x.score, t: `${x.label}: ${fmtNum(x.score, 1, getLang())}` }));
  return { html: `${pageHead(t('hist_t'), t('hist_s'))}
    <div class="tabs">${[['all', 'all'], ['psico', 'f_psico'], ['test', 'f_test'], ['sim', 'f_sim']].map(([k, l]) => `<a href="#/hist?f=${k}" class="${f === k ? 'on' : ''}">${t(l)}</a>`).join('')}</div>
    ${pts.length > 1 ? `<div class="card"><h3>${t('evolution')}</h3>${lineChart([{ color: 'var(--accent)', points: pts }], { refs: [{ y: 5, label: '5' }], height: 220 })}</div>` : ''}
    <div class="card">${list.length ? `<div class="list">${list.map((x) => `<div class="hrow-wrap">${histRow(x)}<button class="icon-btn sm" data-act="del-res" data-id="${x.id}" aria-label="${t('del')}">${icon('trash', 16)}</button></div>`).join('')}</div>` : `<p class="empty">${t('empty_hist')}</p>`}</div>` };
}

// ═════════ PERFIL ═════════
function badges(d) {
  const r = d.results; const fm = d.marks.at(-1) ? finalMark(d.marks.at(-1), d.profile.sex) : null;
  return [
    ['b_first', 'star', r.length >= 1], ['b_ten', 'trophy', r.length >= 10], ['b_streak', 'flame', store.streak(d) >= 7], ['b_perfect', 'target', r.some((x) => x.correct === x.n && x.n >= 10)],
    ['b_sim', 'timer', r.some((x) => x.kind === 'sim' && x.pass)], ['b_apte', 'dumbbell', !!fm?.pass], ['b_100', 'check', d.answered >= 100], ['b_1000', 'award', d.answered >= 1000],
  ].map(([k, ic, ok]) => ({ k, icon: ic, ok, name: t(k) }));
}
// ═════════ PANELL DOCENT ═════════
function studentStats(d) {
  const r = d.results || []; const now = Date.now();
  const avg = r.length ? r.reduce((a, x) => a + x.score, 0) / r.length : null;
  const kr = r.filter((x) => x.kind === 'test'); const know = kr.length ? kr.reduce((a, x) => a + x.score, 0) / kr.length : null;
  const gs = groupStats(d); let c = 0, n = 0; for (const g in gs) { c += gs[g].c; n += gs[g].n; }
  const lastMark = d.marks?.at(-1); const fis = lastMark ? finalMark(lastMark, d.profile.sex || 'm') : null;
  const last = r[0]?.ts || null; const idle = last ? Math.floor((now - last) / 864e5) : null;
  const risk = [];
  if (idle == null || idle > 7) risk.push(t('risk_idle'));
  if (avg != null && avg < 5) risk.push(t('risk_score'));
  if (fis && fis.pass === false) risk.push(t('risk_fis'));
  return { d, name: d.profile.name || d.profile.email, email: d.profile.email, tests: r.length, avg, know, psico: n ? c / n : null, gs, fis, last, idle, streak: store.streak(d), studied: Object.values(d.studied || {}).filter(Boolean).length, risk, examDays: daysTo(d.profile.examDate) };
}
const relDay = (idle) => (idle == null ? t('doc_never') : idle === 0 ? t('today') : L([`fa ${idle} d`, `hace ${idle} d`, `${idle} d ago`]));
let DOC_ROWS = [];
function docent() {
  if (!store.isDocent()) return campus();
  return { html: `${pageHead(t('doc_t'), t('doc_s'), `<span class="chip">${icon(store.cloud() && store.me().profile.src === 'cloud' ? 'cloud' : 'lock', 14)} ${store.me().profile.src === 'cloud' ? t('doc_cloud') : t('doc_local')}</span>`)}
    <div id="docbox"><div class="card"><p class="empty">…</p></div></div>`,
  mount() {
    let alive = true;
    store.listStudents().then((list) => { if (!alive) return; DOC_ROWS = list.map(studentStats); drawDocent(); }).catch((e) => { $('#docbox').innerHTML = `<div class="card"><p class="err">${esc(e.message || e)}</p></div>`; });
    return () => { alive = false; };
  } };
}
function drawDocent(q = '', sort = 'risk') {
  const box = $('#docbox'); if (!box) return;
  const rows = DOC_ROWS;
  if (!rows.length) { box.innerHTML = `<div class="card"><p class="empty">${t('doc_empty')}</p></div>`; return; }
  const active = rows.filter((s) => s.idle != null && s.idle <= 7).length;
  const avgs = rows.filter((s) => s.avg != null); const classAvg = avgs.length ? avgs.reduce((a, s) => a + s.avg, 0) / avgs.length : 0;
  const withFis = rows.filter((s) => s.fis); const fisOk = withFis.filter((s) => s.fis.pass).length;
  const agg = {}; for (const g of GROUPS) agg[g.id] = { c: 0, n: 0 }; for (const s of rows) for (const g in s.gs) { if (agg[g]) { agg[g].c += s.gs[g].c; agg[g].n += s.gs[g].n; } }
  const risk = rows.filter((s) => s.risk.length).sort((a, b) => b.risk.length - a.risk.length);
  const sorters = { risk: (a, b) => b.risk.length - a.risk.length || (a.avg ?? 0) - (b.avg ?? 0), name: (a, b) => a.name.localeCompare(b.name), avg: (a, b) => (b.avg ?? -1) - (a.avg ?? -1), last: (a, b) => (a.idle ?? 999) - (b.idle ?? 999) };
  const ql = q.trim().toLowerCase();
  const list = rows.filter((s) => !ql || s.name.toLowerCase().includes(ql) || (s.email || '').toLowerCase().includes(ql)).sort(sorters[sort]);
  const n1 = (v) => (v == null ? '–' : fmtNum(v, 1, getLang()));
  box.innerHTML = `
    <div class="kpis"><div class="kpi"><small>${t('doc_students')}</small><b>${rows.length}</b></div><div class="kpi"><small>${t('doc_active')}</small><b>${active}</b></div><div class="kpi"><small>${t('avg_score')}</small><b>${n1(classAvg)}</b></div><div class="kpi"><small>${t('doc_fis_ok')}</small><b>${withFis.length ? Math.round((fisOk / withFis.length) * 100) + '%' : '–'}</b></div></div>
    <div class="grid-2">
      <div class="card"><div class="card-h"><h3>${t('doc_class_apt')}</h3></div>${radar(GROUPS.map((g) => t('g_' + g.id)), GROUPS.map((g) => (agg[g.id].n ? agg[g.id].c / agg[g.id].n : null)), { colors: GROUPS.map((g) => g.color) })}</div>
      <div class="card"><div class="card-h"><h3>${icon('alert', 18)} ${t('doc_risk')}</h3><span class="chip">${risk.length}</span></div>${risk.length ? `<div class="list">${risk.slice(0, 8).map((s) => `<button class="hrow rowbtn" data-st="${esc(s.d.profile.id)}"><span class="avatar sm">${esc(s.name[0] || '?')}</span><div class="hmid"><b>${esc(s.name)}</b><small>${s.risk.join(' · ')}</small></div><span class="score ${s.avg != null && s.avg >= 5 ? 'ok' : 'bad'}">${n1(s.avg)}</span></button>`).join('')}</div>` : `<p class="empty">${t('doc_risk_empty')}</p>`}</div>
    </div>
    <div class="card">
      <div class="doc-tools"><label class="search">${icon('search', 16)}<input id="dq" placeholder="${t('doc_search')}" value="${esc(q)}"></label><select id="dsort">${[['risk', 'doc_sort_risk'], ['name', 'name'], ['avg', 'avg_score'], ['last', 'doc_last']].map(([k, l]) => `<option value="${k}" ${sort === k ? 'selected' : ''}>${t(l)}</option>`).join('')}</select><button class="btn glass sm" data-act="doc-csv">${icon('download', 16)} CSV</button></div>
      <div class="table-wrap"><table class="dtable"><thead><tr><th>${t('name')}</th><th>${t('doc_last')}</th><th>${t('tests_done')}</th><th>${t('avg_score')}</th><th>${t('nav_psico')}</th><th>${t('doc_know')}</th><th>${t('nav_fis_short')}</th><th>${t('temari_t')}</th></tr></thead>
      <tbody>${list.map((s) => `<tr data-st="${esc(s.d.profile.id)}" class="rowbtn"><td><div class="who"><span class="avatar sm">${esc(s.name[0] || '?')}</span><div><b>${esc(s.name)}</b><small>${esc(s.email || '')}</small></div></div></td><td class="${s.idle == null || s.idle > 7 ? 'bad-txt' : ''}">${relDay(s.idle)}</td><td>${s.tests}</td><td><span class="score ${s.avg != null && s.avg >= 5 ? 'ok' : 'bad'}">${n1(s.avg)}</span></td><td>${s.psico == null ? '–' : Math.round(s.psico * 100) + '%'}</td><td>${n1(s.know)}</td><td>${s.fis ? `<span class="tag ${s.fis.pass ? 'ok' : 'bad'}">${fmtNum(s.fis.avg, 1, getLang())}</span>` : '–'}</td><td>${s.studied}/${ALL_TEMES.length}</td></tr>`).join('')}</tbody></table></div>
    </div>`;
  $('#dq').addEventListener('input', (e) => { const pos = e.target.selectionStart; drawDocent(e.target.value, $('#dsort').value); const i = $('#dq'); i.focus(); i.setSelectionRange(pos, pos); });
  $('#dsort').addEventListener('change', (e) => drawDocent($('#dq').value, e.target.value));
  $$('[data-st]', box).forEach((el) => el.addEventListener('click', () => studentModal(DOC_ROWS.find((s) => s.d.profile.id === el.dataset.st))));
}
function studentModal(s) {
  if (!s) return; const d = s.d;
  const pts = d.results.slice(0, 20).reverse().map((r) => ({ x: r.ts, y: r.score, t: `${r.lk ? t(r.lk) : r.label}: ${fmtNum(r.score, 1, getLang())}` }));
  modal(`<div class="sheet-h"><div class="who"><span class="avatar">${esc(s.name[0] || '?')}</span><div><h2>${esc(s.name)}</h2><small>${esc(s.email || '')}${s.examDays != null && s.examDays >= 0 ? ` · ${s.examDays} ${t('days')} ${t('countdown')}` : ''}</small></div></div><button class="icon-btn" data-close>${icon('x')}</button></div>
    ${s.risk.length ? `<div class="chips risk">${s.risk.map((x) => `<span class="chip">${icon('alert', 12)} ${x}</span>`).join('')}</div>` : ''}
    <div class="kpis k3"><div class="kpi"><small>${t('avg_score')}</small><b>${s.avg == null ? '–' : fmtNum(s.avg, 1, getLang())}</b></div><div class="kpi"><small>${t('tests_done')}</small><b>${s.tests}</b></div><div class="kpi"><small>${t('streak')}</small><b>${s.streak}</b></div></div>
    ${radar(GROUPS.map((g) => t('g_' + g.id)), GROUPS.map((g) => (s.gs[g.id].n ? s.gs[g.id].c / s.gs[g.id].n : null)), { size: 240, colors: GROUPS.map((g) => g.color) })}
    ${pts.length > 1 ? `<h3>${t('evolution')}</h3>${lineChart([{ color: 'var(--accent)', points: pts }], { refs: [{ y: 5, label: '5' }], height: 180 })}` : ''}
    ${s.fis ? `<h3>${t('phys_status')}</h3><div class="rings3">${['circuit', 'press', 'navette'].map((k, i) => `<div>${ring(s.fis.ps[i] / 10, { size: 70, stroke: 8, color: ['#fcc601', '#e3352e', '#ef8834'][i], label: s.fis.ps[i] })}<small>${t('t_' + k)}</small></div>`).join('')}</div>` : ''}
    <h3>${t('recent')}</h3><div class="list">${d.results.slice(0, 6).map(histRow).join('') || `<p class="empty">${t('no_tests')}</p>`}</div>`);
}
function docCsv() {
  const head = ['nom', 'correu', 'tests', 'nota_mitjana', 'psicotecnics_pct', 'coneixements', 'fisica', 'fisica_apte', 'temes_estudiats', 'ultima_activitat', 'alertes'];
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = DOC_ROWS.map((s) => [s.name, s.email, s.tests, s.avg?.toFixed(2), s.psico != null ? Math.round(s.psico * 100) : '', s.know?.toFixed(2), s.fis?.avg?.toFixed(2), s.fis ? (s.fis.pass ? 'si' : 'no') : '', s.studied, s.last ? new Date(s.last).toISOString().slice(0, 10) : '', s.risk.join(' / ')].map(q).join(','));
  const blob = new Blob(['﻿' + [head.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `sentinella-alumnes-${dayKey()}.csv`; a.click(); URL.revokeObjectURL(a.href);
}

// ═════════ SUPER ADMIN ═════════
function adminView() {
  if (!store.isAdmin()) return campus();
  const cloudMode = store.me().profile.src === 'cloud';
  return { html: `${pageHead(t('adm_t'), t('adm_s'), `<span class="chip">${icon(cloudMode ? 'cloud' : 'lock', 14)} ${cloudMode ? t('doc_cloud') : t('doc_local')}</span>`)}
    <div id="admbox"><div class="card"><p class="empty">…</p></div></div>
    <div class="grid-2">
      ${cloudMode ? `<div class="card"><h3>${t('adm_create')}</h3><p class="muted">${t('adm_cloud_note')}</p></div>` : `<div class="card"><h3>${icon('plus', 18)} ${t('adm_create')}</h3><p class="muted small">${t('adm_create_d')}</p>
        <form id="newu" class="form" novalidate><label>${t('name')}<input name="name" required></label><label>${t('email')}<input name="email" type="email" required></label>
        <div class="grid2"><label>${t('password')}<input name="password" type="password" minlength="6" autocomplete="new-password" required></label><label>${t('adm_role')}<select name="role">${store.ROLES.map((r) => `<option value="${r}">${t('role_' + r)}</option>`).join('')}</select></label></div>
        <p class="err" id="nerr"></p><button class="btn primary">${icon('plus', 16)} ${t('adm_create')}</button></form></div>`}
      <div class="card">${cloudMode ? '' : `<h3>${icon('lock', 18)} ${t('adm_pw')}</h3>
        <form id="apw" class="form" novalidate><label>${t('adm_pw_old')}<input name="old" type="password" autocomplete="current-password"></label><label>${t('adm_pw_new')}<input name="nw" type="password" minlength="6" autocomplete="new-password"></label><p class="err" id="perr"></p><button class="btn glass">${t('save')}</button></form>`}
        <h3>${icon('trash', 18)} ${t('adm_del_demo')}</h3><p class="muted small">${t('adm_del_demo_d')}</p><button class="btn danger" data-act="adm-del-demo">${t('adm_del_demo')}</button></div>
    </div>`,
  mount() {
    let alive = true;
    const load = () => store.listUsers().then((u) => { if (alive) drawAdmin(u); }).catch((e) => { $('#admbox').innerHTML = `<div class="card"><p class="err">${esc(e.message || e)}</p></div>`; });
    load(); ADMIN_RELOAD = load;
    $('#newu')?.addEventListener('submit', async (e) => {
      e.preventDefault(); const f = Object.fromEntries(new FormData(e.target)); const err = $('#nerr');
      if (!f.name || !f.email || !f.password) return (err.textContent = t('err_fill'));
      if (f.password.length < 6) return (err.textContent = t('err_pw'));
      try { await store.createLocalUser(f); e.target.reset(); err.textContent = ''; toast(t('adm_created')); load(); } catch (x) { err.textContent = x.message === 'taken' ? t('err_taken') : x.message; }
    });
    $('#apw')?.addEventListener('submit', async (e) => {
      e.preventDefault(); const f = Object.fromEntries(new FormData(e.target)); const err = $('#perr');
      if (!f.nw || f.nw.length < 6) return (err.textContent = t('err_pw'));
      try { await store.changeAdminPassword(f.old, f.nw); e.target.reset(); err.textContent = ''; toast(t('adm_pw_ok')); } catch { err.textContent = t('err_login'); }
    });
    return () => { alive = false; ADMIN_RELOAD = null; };
  } };
}
let ADMIN_RELOAD = null;
function drawAdmin(users) {
  const box = $('#admbox'); if (!box) return;
  const by = (r) => users.filter((u) => u.role === r).length;
  const meId = store.me().profile.id;
  box.innerHTML = `<div class="kpis"><div class="kpi"><small>${t('adm_users')}</small><b>${users.length}</b></div><div class="kpi"><small>${t('role_alumne')}</small><b>${by('alumne')}</b></div><div class="kpi"><small>${t('role_docent')}</small><b>${by('docent')}</b></div><div class="kpi"><small>${t('role_admin')}</small><b>${by('admin')}</b></div></div>
    <div class="card"><div class="table-wrap"><table class="dtable"><thead><tr><th>${t('name')}</th><th>${t('adm_role')}</th><th>${t('doc_last')}</th><th>${t('tests_done')}</th><th></th></tr></thead><tbody>
    ${users.map((u) => { const locked = u.protected || u.id === meId; return `<tr><td><div class="who"><span class="avatar sm">${esc((u.name || u.email || '?')[0])}</span><div><b>${esc(u.name || '—')}${u.demo ? ' <span class="chip">demo</span>' : ''}</b><small>${esc(u.email || '')}</small></div></div></td>
      <td><select data-role="${esc(u.id)}" ${locked ? 'disabled' : ''}>${store.ROLES.map((r) => `<option value="${r}" ${u.role === r ? 'selected' : ''}>${t('role_' + r)}</option>`).join('')}</select></td>
      <td>${relDay(u.last ? Math.floor((Date.now() - u.last) / 864e5) : null)}</td><td>${u.tests ?? '–'}</td>
      <td>${locked ? `<span class="chip">${icon('lock', 12)} ${t('adm_protected')}</span>` : `<button class="icon-btn sm" data-act="adm-del" data-id="${esc(u.id)}" aria-label="${t('del')}">${icon('trash', 16)}</button>`}</td></tr>`; }).join('')}
    </tbody></table></div></div>`;
  $$('[data-role]', box).forEach((s) => s.addEventListener('change', async () => { try { await store.setRole(s.dataset.role, s.value); toast(t('profile_saved')); ADMIN_RELOAD?.(); } catch (e) { toast(e.message || 'Error', 'err'); } }));
}

function perfil() {
  const d = store.me(); const p = d.profile; const rk = store.rankOf(d.xp);
  return { html: `${pageHead(t('prof_t'), '')}
    <div class="grid-2">
      <div class="card"><div class="prof-top"><div class="avatar xl">${esc(p.name[0] || '?')}</div><div><h2>${esc(p.name)}</h2><p class="muted">${esc(p.email)}</p><span class="chip">${icon('award', 14)} ${rk.name} · ${d.xp} XP</span></div></div>
        <form id="pf" class="form"><label>${t('name')}<input name="name" value="${esc(p.name)}"></label>
        <div class="grid2"><label>${t('sex')}<select name="sex"><option value="m" ${p.sex === 'm' ? 'selected' : ''}>${t('male')}</option><option value="f" ${p.sex === 'f' ? 'selected' : ''}>${t('female')}</option></select></label><label>${t('exam_date')}<input type="date" name="examDate" value="${esc(p.examDate || '')}"></label></div>
        <div class="grid2"><label>${t('language')}<select name="lang">${LANGS.map(([k, n]) => `<option value="${k}" ${getLang() === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label><label>${t('theme')}<select name="theme"><option value="dark" ${document.documentElement.dataset.theme === 'dark' ? 'selected' : ''}>${t('dark')}</option><option value="light" ${document.documentElement.dataset.theme === 'light' ? 'selected' : ''}>${t('light')}</option></select></label></div>
        <button class="btn primary">${t('save')}</button></form></div>
      <div class="card"><h3>${t('badges')}</h3><div class="badges">${badges(d).map((b) => `<div class="badge ${b.ok ? 'on' : ''}">${icon(b.icon, 24)}<small>${b.name}</small></div>`).join('')}</div>
        <h3>${t('data')}</h3><p class="note">${icon('lock', 14)} ${t('local_note')}</p>
        <div class="cta-row"><button class="btn glass" data-act="export">${icon('download', 16)} ${t('export')}</button><label class="btn glass">${icon('upload', 16)} ${t('import')}<input type="file" accept="application/json" id="imp" hidden></label></div>
        <div class="cta-row"><button class="btn ghost" data-act="reset-prog">${icon('refresh', 16)} ${t('reset_prog')}</button><button class="btn danger" data-act="del-acc">${icon('trash', 16)} ${t('delete_acc')}</button></div>
        <button class="btn ghost block" data-act="logout">${icon('logout', 16)} ${t('logout')}</button>
        <button class="btn glass block hidden" id="inst" data-act="install">${icon('download', 16)} ${t('install')}</button></div>
    </div>`,
  mount() {
    $('#pf').addEventListener('submit', (e) => { e.preventDefault(); const f = Object.fromEntries(new FormData(e.target)); store.update((d2) => { Object.assign(d2.profile, { name: f.name.trim() || d2.profile.name, sex: f.sex, examDate: f.examDate, lang: f.lang, theme: f.theme }); }); store.setPrefs({ lang: f.lang, theme: f.theme }); toast(t('profile_saved')); render(); });
    $('#imp').addEventListener('change', async (e) => { try { store.importData(JSON.parse(await e.target.files[0].text())); toast(t('imported')); render(); } catch { toast('JSON ✗', 'err'); } });
    if (deferredInstall) $('#inst').classList.remove('hidden');
  } };
}

const VIEWS = { admin: adminView, docent, '': landing, login: () => authView('login'), register: () => authView('register'), campus, psico, tests, sim, run: runView, result: resultView, temari, tema, fisic, hist, perfil };

// ───────── Accions (delegació d'esdeveniments) ─────────
const ACT = {
  lang: (el) => setLanguage(el.dataset.v),
  theme: toggleTheme,
  logout: async () => { await store.logout(); go('#/'); },
  'doc-csv': docCsv,
  'adm-del': async (el) => { if (confirm(t('confirm_del'))) { await store.removeUser(el.dataset.id); toast('✓'); ADMIN_RELOAD?.(); } },
  'adm-del-demo': async () => { if (!confirm(t('confirm_del'))) return; const us = await store.listUsers(); for (const u of us) if (u.demo) await store.removeUser(u.id); toast('✓'); ADMIN_RELOAD?.(); },
  'demo-doc': async () => { await store.demoDocent(); toast(t('welcome', { name: t('role_docent') })); go('#/docent'); },
  demo: async () => { await store.demo(); toast(t('welcome', { name: 'Laia' })); go('#/campus'); },
  'psico-cfg': (el) => psicoCfg(el.dataset.cat),
  'quick-psico': () => startRun({ kind: 'psico', lk: 'q_psico', label: t('q_psico'), qs: genMixed(20), mode: 'train', penalty: false, limit: 0, regen: { type: 'psico', cat: 'mixed', n: 20, mode: 'train' } }),
  'quick-test': () => startKnowledge('random'),
  'go-sim': () => go('#/sim'),
  'go-navette': () => go('#/fisic?tab=tools'),
  ktest: (el) => startKnowledge(el.dataset.k, el.dataset.a),
  'sim-start': () => { SIMP1 = null; startRun({ kind: 'test', sim: 1, label: t('sim_p1'), qs: sample(QUESTIONS, 30).map(kq), mode: 'exam', penalty: true, limit: 35 * 60, min: 4, regen: { type: 'sim' } }); },
  'sim-p2': () => startRun({ kind: 'psico', sim: 2, label: t('sim_p2'), qs: genMixed(80), mode: 'exam', penalty: false, limit: 35 * 60, min: 5, regen: { type: 'sim' } }),
  answer: (el) => {
    const r = RUN; if (!r) return; const k = +el.dataset.k;
    if (r.mode === 'train') { if (r.shown[r.i]) return; r.ans[r.i] = k; r.shown[r.i] = true; navigator.vibrate?.(k === r.qs[r.i].answer ? 15 : [30, 40, 30]); }
    else { r.ans[r.i] = r.ans[r.i] === k ? null : k; }
    render();
  },
  next: () => { if (RUN && RUN.i + 1 < RUN.qs.length) { RUN.i++; render(); } },
  prev: () => { if (RUN && RUN.i > 0) { RUN.i--; render(); } },
  skip: () => { if (!RUN) return; RUN.shown[RUN.i] = true; render(); },
  'memo-ready': () => { if (RUN) { RUN.memoSeen[RUN.i] = true; render(); } },
  finish: () => finishRun(),
  'finish-ask': () => modal(`<h2>${t('end_test')}</h2><p class="muted">${t('confirm_end')}</p><div class="cta-row"><button class="btn primary" id="yes">${t('finish')}</button><button class="btn ghost" data-close>${t('cancel')}</button></div>`, (m, close) => { $('#yes', m).onclick = () => { close(); finishRun(); }; }),
  'run-quit': () => modal(`<h2>${t('close')}?</h2><p class="muted">${L(['Si surts ara, el test no es desarà.', 'Si sales ahora, el test no se guardará.', 'If you leave now, the test won\'t be saved.'])}</p><div class="cta-row"><button class="btn danger" id="yes">${t('close')}</button><button class="btn ghost" data-close>${t('cancel')}</button></div>`, (m, close) => { $('#yes', m).onclick = () => { close(); RUN = null; SIMP1 = null; go('#/campus'); }; }),
  grid: () => { const r = RUN; modal(`<div class="sheet-h"><h2>${r.ans.filter((a) => a != null).length}/${r.qs.length}</h2><button class="icon-btn" data-close>${icon('x')}</button></div><div class="qgrid">${r.qs.map((_, i) => `<button class="${r.ans[i] != null ? 'done' : ''} ${i === r.i ? 'cur' : ''}" data-j="${i}">${i + 1}</button>`).join('')}</div>`, (m, close) => { $$('[data-j]', m).forEach((b) => (b.onclick = () => { close(); r.i = +b.dataset.j; render(); })); }); },
  retry: () => {
    const g = LAST?.regen; if (!g) return;
    if (g.type === 'sim') return go('#/sim');
    if (g.type === 'test') return startKnowledge(g.kind, g.arg);
    const qs = g.cat === 'mixed' ? genMixed(g.n) : Array.from({ length: g.n }, () => genQuestion(g.cat));
    startRun({ kind: 'psico', lk: LAST.result.lk, label: LAST.result.label, qs, mode: g.mode, penalty: false, limit: g.mode === 'exam' ? Math.round(g.n * 26.25) : 0, regen: g });
  },
  studied: (el) => { store.update((d) => { d.studied[el.dataset.t] = !d.studied[el.dataset.t]; }); render(); },
  'save-marks': (el) => { const m = {}; $$('[data-mark]').forEach((i) => { m[i.dataset.mark] = i.value === '' ? null : +i.value; }); store.update((d) => d.marks.push({ ts: Date.now(), ...m })); toast(t('marks_saved')); const fm = finalMark(m, el.dataset.sex); if (fm.pass) confetti(); },
  'save-lap': (el) => saveMark({ circuit: +el.dataset.v }),
  'del-mark': (el) => { if (confirm(t('confirm_del'))) { store.update((d) => d.marks.splice(+el.dataset.i, 1)); render(); } },
  'gen-plan': (el) => { const lv = +$('#lvl').value, w = +$('#wks').value || 12; store.update((d) => { d.plan = { level: lv, created: Date.now() - ((new Date().getDay() + 6) % 7) * 864e5, weeks: buildPlan(w, lv, el.dataset.sex) }; d.planDone = {}; }); toast('✓'); render(); },
  'del-res': (el) => { if (confirm(t('confirm_del'))) { store.update((d) => { d.results = d.results.filter((x) => x.id !== el.dataset.id); }); render(); } },
  export: () => { const blob = new Blob([JSON.stringify(store.me(), null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `sentinella-${dayKey()}.json`; a.click(); URL.revokeObjectURL(a.href); },
  'reset-prog': () => { if (confirm(t('confirm_del'))) { store.resetProgress(); render(); } },
  'del-acc': async () => { if (confirm(t('confirm_del'))) { await store.deleteAccount(); go('#/'); } },
  install: async () => { if (deferredInstall) { deferredInstall.prompt(); deferredInstall = null; } },
};
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const fn = ACT[el.dataset.act]; if (!fn) return;
  if (el.tagName !== 'INPUT') e.preventDefault();
  fn(el, e);
});

// ───────── PWA ─────────
let deferredInstall = null;
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredInstall = e; });
if ('serviceWorker' in navigator && !['localhost', '127.0.0.1'].includes(location.hostname)) navigator.serviceWorker.register('sw.js').catch(() => {});

// ───────── Inici ─────────
store.init().then(render, render);

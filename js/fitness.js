// Proves físiques: barems, càlcul de nota, pla d'entrenament i motor de la course navette
import { L } from './i18n.js';

// Barems convocatòria 46/26 (DOGC 9681), segons fonts de preparació. Índex 0 = 1 punt … índex 9 = 10 punts.
export const BAREMS = {
  m: { circuit: [21.5, 20.4, 19.9, 19.4, 18.9, 18.4, 17.8, 17.3, 16.8, 16.3], press: [24, 27, 28, 30, 31, 33, 34, 36, 39, 42], navette: [6.5, 7.5, 8, 8.5, 9, 9.5, 10.5, 11, 12, 12.5] },
  f: { circuit: [25.5, 24.4, 23.7, 23.0, 22.3, 21.6, 20.9, 20.2, 19.5, 18.9], press: [10, 13, 16, 18, 20, 22, 24, 27, 30, 34], navette: [3.5, 4.5, 5, 6, 6.5, 7, 7.5, 8, 9, 10] },
};
export const LOAD = { m: { press: 40, sack: 20, hurdle: 90 }, f: { press: 25, sack: 15, hurdle: 80 } };

export function points(test, value, sex = 'm') {
  if (value === '' || value == null || Number.isNaN(+value)) return null;
  const tb = BAREMS[sex][test]; const v = +value; let p = 0;
  for (let i = 0; i < 10; i++) {
    if (test === 'circuit' ? v <= tb[i] : v >= tb[i]) p = i + 1;
  }
  return p;
}
export function finalMark(marks, sex) {
  const ps = ['circuit', 'press', 'navette'].map((k) => points(k, marks?.[k], sex));
  if (ps.some((p) => p === null)) return { ps, avg: null, pass: null };
  const avg = ps.reduce((a, b) => a + b, 0) / 3;
  return { ps, avg, pass: ps.every((p) => p >= 1) && avg >= 5 };
}

// ───────── Pla d'entrenament ─────────
const DAYS = [['Dl', 'Lu', 'Mon'], ['Dt', 'Ma', 'Tue'], ['Dc', 'Mi', 'Wed'], ['Dj', 'Ju', 'Thu'], ['Dv', 'Vi', 'Fri'], ['Ds', 'Sá', 'Sat'], ['Dg', 'Do', 'Sun']];
export const dayName = (i) => L(DAYS[i]);

export function buildPlan(weeks, level, sex) {
  weeks = Math.max(4, Math.min(24, weeks | 0));
  const lv = level; // 1..3
  const kg = LOAD[sex].press;
  const plan = [];
  for (let w = 0; w < weeks; w++) {
    const r = w / weeks;
    const phase = w === weeks - 1 ? 'taper' : r < 0.3 ? 'base' : r < 0.65 ? 'build' : 'peak';
    const prog = Math.min(1, (w + 1) / (weeks - 1));
    const runMin = Math.round(20 + 10 * lv + 15 * prog);
    const intervals = 4 + lv + Math.round(4 * prog);
    const sets = phase === 'base' ? 4 : phase === 'build' ? 5 : 6;
    const pctLoad = Math.round((phase === 'base' ? 55 : phase === 'build' ? 70 : 85) + 3 * lv);
    const s = [];
    s.push({ type: 'navette', title: ['Resistència aeròbica', 'Resistencia aeróbica', 'Aerobic endurance'],
      detail: phase === 'taper' ? ['20 min de carrera suau + 4 progressius de 80 m', '20 min de carrera suave + 4 progresivos de 80 m', '20 min easy run + 4 × 80 m strides'] : [`${runMin} min de carrera contínua a ritme còmode (pots parlar)`, `${runMin} min de carrera continua a ritmo cómodo (puedes hablar)`, `${runMin} min continuous run at an easy, conversational pace`] });
    s.push({ type: 'press', title: ['Força: press de banca', 'Fuerza: press de banca', 'Strength: bench press'],
      detail: phase === 'base' ? [`${sets} sèries × 12 reps al ${pctLoad}% de ${kg} kg + flexions i fons de tríceps`, `${sets} series × 12 reps al ${pctLoad}% de ${kg} kg + flexiones y fondos de tríceps`, `${sets} sets × 12 reps at ${pctLoad}% of ${kg} kg + push-ups and triceps dips`] : [`${sets} sèries de 30 s al màxim de reps amb ${kg} kg (descans 2 min) + tècnica: barra al pit i colzes estesos`, `${sets} series de 30 s al máximo de reps con ${kg} kg (descanso 2 min) + técnica: barra al pecho y codos extendidos`, `${sets} sets of 30 s max reps with ${kg} kg (2 min rest) + technique: bar to chest, full lockout`] });
    s.push({ type: 'circuit', title: ['Agilitat i coordinació', 'Agilidad y coordinación', 'Agility and coordination'],
      detail: phase === 'base' ? ['Escala de coordinació, tombarelles a la màrfega, salts de tanques baixes: 3 blocs × 6 min', 'Escalera de coordinación, volteretas en colchoneta, saltos de vallas bajas: 3 bloques × 6 min', 'Agility ladder, forward rolls on a mat, low hurdle jumps: 3 blocks × 6 min'] : [`${3 + lv} intents de circuit complet cronometrat (sac de ${LOAD[sex].sack} kg), descans 3 min`, `${3 + lv} intentos de circuito completo cronometrado (saco de ${LOAD[sex].sack} kg), descanso 3 min`, `${3 + lv} full timed circuit attempts (${LOAD[sex].sack} kg sack), 3 min rest`] });
    s.push({ type: 'navette', title: ['Intervals de llançadora', 'Intervalos de lanzadera', 'Shuttle intervals'],
      detail: [`${intervals} × 1 min a ritme de palier objectiu, recuperació 1 min. Gir amb un peu darrere la línia.`, `${intervals} × 1 min a ritmo de palier objetivo, recuperación 1 min. Giro con un pie detrás de la línea.`, `${intervals} × 1 min at target-stage pace, 1 min recovery. Turn with one foot behind the line.`] });
    s.push({ type: 'press', title: ['Força general i core', 'Fuerza general y core', 'General strength and core'],
      detail: ['Esquat, rem, planxes i press militar: 4 × 10. Mobilitat d\'espatlles.', 'Sentadilla, remo, planchas y press militar: 4 × 10. Movilidad de hombros.', 'Squats, rows, planks and overhead press: 4 × 10. Shoulder mobility.'] });
    s.push(phase === 'peak' || phase === 'taper'
      ? { type: 'sim', title: ['Simulacre de les 3 proves', 'Simulacro de las 3 pruebas', 'Mock of the 3 tests'], detail: ['Circuit + press + course navette, amb el mateix ordre i descansos que el dia de la prova. Registra les marques!', 'Circuito + press + course navette, con el mismo orden y descansos que el día de la prueba. ¡Registra las marcas!', 'Circuit + press + beep test, same order and rests as on test day. Log your results!'] }
      : { type: 'navette', title: ['Tirada llarga', 'Tirada larga', 'Long run'], detail: [`${runMin + 10} min suaus o bicicleta`, `${runMin + 10} min suaves o bicicleta`, `${runMin + 10} min easy or cycling`] });
    s.push({ type: 'rest', title: ['Descans actiu', 'Descanso activo', 'Active rest'], detail: ['Caminar, estiraments i mobilitat.', 'Caminar, estiramientos y movilidad.', 'Walking, stretching and mobility.'] });
    plan.push({ week: w + 1, phase, sessions: s });
  }
  return plan;
}

// ───────── Course navette (protocol de Léger, 20 m) ─────────
export const navSpeed = (stage) => 8.5 + 0.5 * (stage - 1);
export const shuttleTime = (stage) => 20 / (navSpeed(stage) / 3.6);
export const shuttlesIn = (stage) => Math.round(60 / shuttleTime(stage));

export class Navette {
  constructor(onUpdate) { this.onUpdate = onUpdate; this.running = false; this.ctx = null; }
  beep(freq = 880, dur = 0.12, when = 0) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = 'square'; o.frequency.value = freq;
    const t0 = this.ctx.currentTime + when;
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.35, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(this.ctx.destination); o.start(t0); o.stop(t0 + dur + 0.02);
  }
  async start() {
    this.ctx = this.ctx || new (window.AudioContext || window.webkitAudioContext)();
    await this.ctx.resume();
    try { this.lock = await navigator.wakeLock?.request('screen'); } catch { /* opcional */ }
    this.running = true; this.stage = 1; this.shuttle = 0; this.total = 0;
    this.startAt = performance.now() + 3000; // compte enrere de 3 s
    this.next = this.startAt; this.countdown = 3;
    [0, 1, 2].forEach((i) => this.beep(660, 0.1, i));
    this.beep(1200, 0.25, 3);
    this.loop();
  }
  loop() {
    if (!this.running) return;
    const now = performance.now();
    if (now < this.startAt) { this.countdown = Math.ceil((this.startAt - now) / 1000); }
    else {
      this.countdown = 0;
      while (now >= this.next) {
        if (this.next > this.startAt) {
          this.shuttle++; this.total++;
          if (this.shuttle >= shuttlesIn(this.stage)) { this.stage++; this.shuttle = 0; this.beep(1000, 0.1); this.beep(1000, 0.1, 0.18); this.beep(1300, 0.18, 0.36); }
          else this.beep(880, 0.14);
        }
        this.next += shuttleTime(this.stage) * 1000;
      }
    }
    const into = this.countdown ? 0 : 1 - (this.next - now) / (shuttleTime(this.stage) * 1000);
    this.onUpdate?.({ stage: this.stage, shuttle: this.shuttle, per: shuttlesIn(this.stage), total: this.total, speed: navSpeed(this.stage), progress: Math.max(0, Math.min(1, into)), countdown: this.countdown, palier: this.palier() });
    this.raf = requestAnimationFrame(() => this.loop());
  }
  palier() { const half = this.shuttle >= shuttlesIn(this.stage) / 2 ? 0.5 : 0; return this.stage - 1 + half; }
  stop() { this.running = false; cancelAnimationFrame(this.raf); this.lock?.release?.(); this.lock = null; return this.palier(); }
}

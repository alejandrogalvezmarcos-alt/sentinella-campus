// Gràfics SVG lleugers (sense dependències)
import { esc } from './util.js';

export function ring(pct, { size = 120, stroke = 12, color = 'var(--accent)', track = 'var(--track)', label = '', sub = '' } = {}) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, p = Math.max(0, Math.min(1, pct || 0));
  return `<div class="ring" style="width:${size}px;height:${size}px"><svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${track}" stroke-width="${stroke}"/><circle class="ring-bar" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - p)}" transform="rotate(-90 ${size / 2} ${size / 2})" style="--c:${c}"/></svg><div class="ring-in"><b>${label}</b>${sub ? `<small>${sub}</small>` : ''}</div></div>`;
}

export function radar(labels, values, { size = 280, colors = [] } = {}) {
  const n = labels.length, cx = size / 2, cy = size / 2, R = size / 2 - 46;
  const pt = (i, v) => { const a = (Math.PI * 2 * i) / n - Math.PI / 2; return [cx + R * v * Math.cos(a), cy + R * v * Math.sin(a)]; };
  let grid = '';
  for (const lv of [0.25, 0.5, 0.75, 1]) grid += `<polygon points="${labels.map((_, i) => pt(i, lv).join(',')).join(' ')}" fill="none" stroke="var(--line)" stroke-width="1"/>`;
  const axes = labels.map((_, i) => `<line x1="${cx}" y1="${cy}" x2="${pt(i, 1)[0]}" y2="${pt(i, 1)[1]}" stroke="var(--line)"/>`).join('');
  const poly = values.map((v, i) => pt(i, Math.max(0.04, v ?? 0)).join(',')).join(' ');
  const dots = values.map((v, i) => { const [x, y] = pt(i, Math.max(0.04, v ?? 0)); return `<circle cx="${x}" cy="${y}" r="4.5" fill="${colors[i] || 'var(--accent)'}" stroke="var(--card)" stroke-width="2"/>`; }).join('');
  const labs = labels.map((l, i) => { const [x, y] = pt(i, 1.22); const v = values[i]; return `<text x="${x}" y="${y - 6}" text-anchor="middle" class="rlab">${esc(l)}</text><text x="${x}" y="${y + 9}" text-anchor="middle" class="rval">${v == null ? '–' : Math.round(v * 100) + '%'}</text>`; }).join('');
  return `<svg class="radar" viewBox="0 0 ${size} ${size}" width="100%" style="max-width:${size + 40}px">${grid}${axes}<polygon class="radar-area" points="${poly}"/>${dots}${labs}</svg>`;
}

export function lineChart(series, { height = 200, min = 0, max = 10, refs = [], yFmt = (v) => v, invert = false } = {}) {
  // series: [{ color, points:[{x,y}] }]
  const W = 640, H = height, pl = 36, pr = 14, pt = 14, pb = 26;
  const all = series.flatMap((s) => s.points);
  if (!all.length) return '';
  const xs = all.map((p) => p.x); let x0 = Math.min(...xs), x1 = Math.max(...xs); if (x0 === x1) { x0 -= 1; x1 += 1; }
  const X = (x) => pl + ((x - x0) / (x1 - x0)) * (W - pl - pr);
  const Y = (y) => { const f = (y - min) / (max - min); return pt + (invert ? f : 1 - f) * (H - pt - pb); };
  let g = '';
  for (let i = 0; i <= 4; i++) { const v = min + ((max - min) * i) / 4; g += `<line x1="${pl}" x2="${W - pr}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)" stroke-dasharray="${i ? '3 4' : ''}"/><text x="${pl - 6}" y="${Y(v) + 4}" text-anchor="end" class="axis">${yFmt(Math.round(v * 10) / 10)}</text>`; }
  for (const r of refs) g += `<line x1="${pl}" x2="${W - pr}" y1="${Y(r.y)}" y2="${Y(r.y)}" stroke="${r.color || 'var(--ok)'}" stroke-width="1.5" stroke-dasharray="6 5"/><text x="${W - pr}" y="${Y(r.y) - 5}" text-anchor="end" class="axis" fill="${r.color || 'var(--ok)'}">${esc(r.label)}</text>`;
  const lines = series.map((s, si) => {
    const pts = [...s.points].sort((a, b) => a.x - b.x);
    const d = pts.map((p, i) => `${i ? 'L' : 'M'}${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join(' ');
    const area = `${d} L${X(pts.at(-1).x).toFixed(1)},${H - pb} L${X(pts[0].x).toFixed(1)},${H - pb} Z`;
    return `<defs><linearGradient id="lg${si}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${s.color}" stop-opacity=".28"/><stop offset="1" stop-color="${s.color}" stop-opacity="0"/></linearGradient></defs>${series.length === 1 ? `<path d="${area}" fill="url(#lg${si})"/>` : ''}<path class="draw" d="${d}" fill="none" stroke="${s.color}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>${pts.map((p) => `<circle cx="${X(p.x).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="3.4" fill="${s.color}" stroke="var(--card)" stroke-width="1.5"><title>${esc(p.t || p.y)}</title></circle>`).join('')}`;
  }).join('');
  return `<svg class="line" viewBox="0 0 ${W} ${H}" width="100%">${g}${lines}</svg>`;
}

export function bar(pct, color = 'var(--accent)') {
  return `<div class="bar"><i style="width:${Math.round(Math.max(0, Math.min(1, pct)) * 100)}%;background:${color}"></i></div>`;
}

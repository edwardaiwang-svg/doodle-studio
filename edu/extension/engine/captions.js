// Caption cues from display text, timed by the spoken text's measured char times (port of engine/captions.py).
//
// `spoken` and `display` share the same clause punctuation sequence (validated), so clause k of the display text is
// timed by clause k of the spoken text. Cues group whole clauses and must fit in <= 2 balanced lines at 70 px.
// `measure(text) → px` is the caption font's width (canvas in the browser; an estimate in unit tests).

export const SIZE = 70;
export const MAX_W = 1760;
const EN_PUNCT = /[,.;:?!](?=\s|$|["”’)])|—/g;
const EN_WEAK = new Set(['a', 'an', 'the', 'of', 'to', 'and', 'or', 'in', 'on', 'at', 'for', 'by', 'with', 'from', 'as',
  'that', 'is', 'was', 'his', 'her', 'its', 'their', 'my', 'our', 'your', 'but', 'if', 'than']);

function clauseSpans(text) {
  const spans = [];
  let start = 0;
  for (const m of text.matchAll(EN_PUNCT)) {
    const end = m.index + m[0].length;
    spans.push([start, end]);
    start = end;
  }
  if (text.slice(start).trim()) spans.push([start, text.length]);
  return spans;
}

const units = (text) => text.match(/\S+\s*/g) || [];

/** Up to 2 balanced lines, or null when the text cannot fit in two lines. */
export function balancedLines(text, measure) {
  text = text.trim();
  if (measure(text) <= MAX_W) return [text];
  const us = units(text);
  let best = null;
  for (let k = 1; k < us.length; k++) {
    const a = us.slice(0, k).join('').trim();
    const b = us.slice(k).join('').trim();
    const wa = measure(a);
    const wb = measure(b);
    if (wa > MAX_W || wb > MAX_W) continue;
    let penalty = Math.abs(wa - wb);
    const aw = a.split(/\s+/);
    const last = aw.length ? aw[aw.length - 1].toLowerCase().replace(/^[,.;:]+|[,.;:]+$/g, '') : '';
    if (EN_WEAK.has(last)) penalty += 400;
    if (b.split(/\s+/).length <= 2) penalty += 600;
    if (!best || penalty < best[0]) best = [penalty, [a, b]];
  }
  return best ? best[1] : null;
}

const fits = (text, measure) => balancedLines(text, measure) !== null;

/** Split one over-long clause into pieces that each fit two lines. */
export function splitLong(text, measure) {
  const pieces = [];
  let cur = '';
  for (const u of units(text)) {
    if (cur && !fits(cur + u, measure)) {
      pieces.push(cur);
      cur = u;
    } else {
      cur += u;
    }
  }
  if (cur.trim()) pieces.push(cur);
  return pieces;
}

/** charTime(pos) -> seconds from beat start. Returns [[start, end, text]]. */
export function cuesForBeat(spoken, display, charTime, speechEnd, measure) {
  const sd = clauseSpans(display);
  let ss = clauseSpans(spoken);
  if (sd.length !== ss.length) {                   // proportional fallback (the validator prevents this)
    ss = sd.map(([a, b]) => [Math.round(a * spoken.length / display.length), Math.round(b * spoken.length / display.length)]);
  }
  const atoms = [];
  sd.forEach(([da, db], i) => {
    const [sa, sb] = ss[i];
    const dtext = display.slice(da, db);
    const pieces = fits(dtext, measure) ? [dtext] : splitLong(dtext, measure);
    let off = 0;
    for (const p of pieces) {
      atoms.push([p, sa + (off / Math.max(1, dtext.length)) * (sb - sa)]);
      off += p.length;
    }
  });
  const target = 80;
  const minimum = 26;
  const cues = [];
  let cur = '';
  let curPos = null;
  for (const [text, pos] of atoms) {
    const trial = cur + text;
    if (cur && (!fits(trial, measure) || (cur.trim().length >= minimum && trial.trim().length > target))) {
      cues.push([curPos, cur]);
      cur = text;
      curPos = pos;
    } else {
      if (!cur) curPos = pos;
      cur = trial;
    }
  }
  if (cur.trim()) cues.push([curPos, cur]);
  if (cues.length >= 2 && cues[cues.length - 1][1].trim().length < minimum
      && fits(cues[cues.length - 2][1] + cues[cues.length - 1][1], measure)) {
    const [p, t] = cues[cues.length - 2];
    cues.splice(cues.length - 2, 2, [p, t + cues[cues.length - 1][1]]);
  }
  const out = cues.map(([pos, text], i) => [i === 0 ? 0 : Math.max(0, charTime(Math.trunc(pos)) - 0.05), null, text.trim()]);
  for (let i = 0; i < out.length; i++) {
    out[i][1] = i + 1 < out.length ? out[i + 1][0] : speechEnd;
    if (out[i][1] <= out[i][0]) out[i][1] = out[i][0] + 0.4;
  }
  return out;
}

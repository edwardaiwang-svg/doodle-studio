// Timeline layout (port of engine/timeline.py). Given each beat's measured clip length and per-character speech
// times, place beats on the master clock, insert chapter gaps, take reading holds and transition time, then derive
// captions, chapters, music intervals and the end card. `pauses` (beat id -> seconds, from pacing) add silence after a
// beat so the narration waits for the drawing hand; a takeaway beat starts TAKE_PREROLL after the beat before it.
import { cuesForBeat } from './captions.js';
import { normalizeStoryboard } from './storyboard.js';

export const FPS = 30;
export const CHAPTER_GAP = 0.6;
export const TRANSITION = 2.8;
export const END_CARD = 5.0;
export const ZOOM_IN = 0.9;
export const AGENDA_CARD = 2.6;
export const TAKE_PREROLL = 2.0;
const r4 = (x) => Math.round(x * 1e4) / 1e4;

export function takeHold(beat) {
  const head = beat.take?.headline?.en || '';
  return Math.max(3.0, head.split(/\s+/).filter(Boolean).length / 3.0);
}

/** clips[id] = { speech: seconds incl. the gap after it, charTimes: [...] }; pauses[id] = silence after that beat. */
export function layout(episode, clips, pauses = {}, measure = null) {
  episode = normalizeStoryboard(episode);
  const beats = episode.beats;
  const chapters = Object.fromEntries(episode.chapters.map((c) => [c.id, c]));
  let cursor = 0;
  const outBeats = {};
  const order = [];
  const transitions = [];
  const capts = [];
  const nCards = episode.chapters.filter((c) => c.kind === 'section').length;
  let agendaStart = null;
  beats.forEach((beat, i) => {
    const clip = clips[beat.id];
    const take = beat.kind === 'take' && chapters[beat.chapter].kind === 'section';
    const prep = cursor;
    const start = cursor + (take ? TAKE_PREROLL : 0);
    const speechEnd = start + clip.speech;
    let end = speechEnd + Number(pauses[beat.id] || 0);
    const nxt = beats[i + 1] || null;
    const chapterChange = nxt !== null && nxt.chapter !== beat.chapter;
    const info = { start: r4(start), speech_end: r4(speechEnd), char_times: clip.charTimes };
    if (take) {
      info.prep = r4(prep);
      const holdEnd = end + takeHold(beat);
      const tEnd = holdEnd + TRANSITION;
      transitions.push({ section: beat.chapter, take_beat: beat.id, speech_end: r4(end), hold_end: r4(holdEnd), end: r4(tEnd),
        next: nxt ? nxt.chapter : null });
      end = tEnd;
    } else if (chapterChange) {
      end += CHAPTER_GAP;
    }
    if (chapters[beat.chapter].kind === 'agenda') {
      agendaStart = agendaStart === null ? start : agendaStart;
      if (chapterChange) end = Math.max(end, agendaStart + 1.4 + AGENDA_CARD * nCards + CHAPTER_GAP);   // wait for the cards
    }
    info.end = r4(end);
    outBeats[beat.id] = info;
    order.push(beat.id);
    if (measure) {
      const ct = clip.charTimes;
      const charTime = (pos) => (ct.length ? ct[Math.min(Math.max(pos, 0), ct.length - 1)] : 0);
      for (const [a, b, text] of cuesForBeat(beat.spoken.en, beat.display.en, charTime, clip.speech - 0.15, measure)) {
        capts.push({ start: r4(start + a), end: r4(start + b), text });
      }
    }
    cursor = end;
  });
  let duration = cursor + END_CARD;
  duration = Math.round((Math.ceil(duration * FPS) / FPS) * 1e6) / 1e6;
  const chaps = episode.chapters.map((c) => {
    const ids = beats.filter((b) => b.chapter === c.id).map((b) => b.id);
    const label = (c.label?.en || '').trim();
    const title = (c.title?.en || '').trim();
    return { id: c.id, start: outBeats[ids[0]].start, end: outBeats[ids[ids.length - 1]].end,
      title: !['intro', 'outro', 'agenda'].includes(c.kind) && label && title && title.toLowerCase() !== label.toLowerCase()
        ? `${label} · ${title}` : (label || title) };
  });
  const music = [];
  for (const beat of beats) if (beat.music) music.push([outBeats[beat.id].start, outBeats[beat.id].end]);
  for (const tr of transitions) music.push([tr.hold_end, tr.end]);
  music.push([duration - END_CARD, duration]);
  music.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const merged = [];
  for (const [a, b] of music) {
    if (merged.length && a <= merged[merged.length - 1][1] + 1.0) merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], b);
    else merged.push([a, b]);
  }
  return { language: 'en', fps: FPS, duration, beats: outBeats, beat_order: order, captions: capts, chapters: chaps,
    transitions, pauses: Object.fromEntries(Object.entries(pauses).filter(([, v]) => v).map(([k, v]) => [k, Math.round(Number(v) * 1000) / 1000])),
    music: merged.map(([a, b]) => ({ start: r4(a), end: r4(b) })), end_card: { start: r4(duration - END_CARD), end: duration } };
}

/** Reading-rate estimate for previews and tests (~2.45 words/s). */
export function syntheticClips(episode) {
  const clips = {};
  for (const beat of episode.beats) {
    const text = beat.spoken.en;
    const seconds = Math.max(2.0, text.split(/\s+/).filter(Boolean).length / 2.45);
    const n = text.length;
    clips[beat.id] = { speech: seconds + 0.45, charTimes: Array.from({ length: n }, (_, k) => Math.round(seconds * k / Math.max(1, n) * 1000) / 1000) };
  }
  return clips;
}

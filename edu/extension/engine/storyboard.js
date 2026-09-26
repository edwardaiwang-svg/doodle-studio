// Storyboard defaults: fill in what the renderer derives (numbers, colours, narrator) (port of engine/storyboard.py).
export const KINDS = new Set(['intro', 'agenda', 'section', 'board', 'outro']);
export const COLOR_CYCLE = ['orange', 'blue', 'green', 'purple', 'red', 'teal'];

export function normalizeStoryboard(episode) {
  const ep = structuredClone(episode);
  ep.narrator ??= 'narrator';
  let number = 0;
  for (const ch of ep.chapters) {
    if (!KINDS.has(ch.kind)) throw new Error(`chapter ${ch.id}: kind ${ch.kind} is not one of ${[...KINDS].join(', ')}`);
    if (ch.kind === 'section') {
      number += 1;
      ch.number ??= number;
      ch.color ??= COLOR_CYCLE[(number - 1) % COLOR_CYCLE.length];
    }
  }
  return ep;
}

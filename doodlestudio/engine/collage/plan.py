"""When each sentence is on screen, and which sentences share a stage (the collage's shots).

A stage is one background that several sentences build on: a phone filling with messages, a brand reveal, the
how-it-works cards, the minimum-players board, the use-case grid, the end card. Sentences come from each beat's
`direction` annotations (director/annotate.py); a beat without them is one sticker sentence. Times come from the
narration: a display offset is mapped to the spoken text, then to the voice's per-character times.
"""
from __future__ import annotations

from dataclasses import dataclass, field

from ...numbers import normalize

STAGE_OF = {
    'chat_pileup': 'chat', 'chaos': 'chat', 'brand_reveal': 'brand', 'step_card': 'how', 'share_link': 'how',
    'rsvp': 'how', 'threshold': 'threshold', 'use_case_grid': 'uses', 'brand_endcard': 'end', 'sticker_row': 'stickers',
}
FOLLOWS = {'feature_chips'}         # scenes that add to whatever stage is showing
BACKGROUND = {'chat': 'cream', 'brand': 'sky', 'how': 'sky', 'threshold': 'sky', 'uses': 'grid', 'end': 'sky',
              'stickers': 'cream'}
LEAD = .25                          # a stage appears this long before its first sentence is said
LOUD_ENTRANCES = {'brand', 'end'}


@dataclass
class Sentence:
    beat: str
    i: int
    text: str
    role: str
    scene: str
    energy: int
    emphasis: str
    span: tuple[int, int]
    start: float
    end: float


@dataclass
class Stage:
    kind: str
    background: str
    start: float
    end: float
    transition: str                 # into this stage: none | slide | torn
    sentences: list[Sentence] = field(default_factory=list)


def word_time(beat: dict, info: dict, lang: str, offset: int) -> float:
    """When the character at ``offset`` of the beat's display text is heard."""
    ct = info.get('char_times') or []
    if not ct:
        return info['start']
    pos = normalize(beat['display'][lang], lang).to_spoken(offset)
    return info['start'] + ct[max(0, min(pos, len(ct) - 1))]


def sentences(board: dict, tl: dict, lang: str) -> list[Sentence]:
    out = []
    for beat in board['beats']:
        info = tl['beats'].get(beat['id'])
        if info is None:
            continue
        text = beat['display'][lang]
        notes = beat.get('direction') or [{'i': 0, 'span': [0, len(text)], 'role': 'none', 'scene': 'sticker_row',
                                           'energy': 1, 'emphasis': ''}]
        for n in notes:
            a, b = n['span']
            out.append(Sentence(beat['id'], n['i'], text[a:b], n.get('role', 'none'), n.get('scene', 'sticker_row'),
                                int(n.get('energy', 1)), n.get('emphasis', ''), (a, b),
                                word_time(beat, info, lang, a), 0.))
    for k, s in enumerate(out):                # a sentence lasts until the next one is heard
        s.end = out[k + 1].start if k + 1 < len(out) else tl['duration']
    return out


def stages(said: list[Sentence], tl: dict) -> list[Stage]:
    out: list[Stage] = []
    for s in said:
        joins = s.scene in FOLLOWS or (s.role == 'tagline' and s.scene == 'sticker_row')   # a tagline is written
        kind = out[-1].kind if joins and out else STAGE_OF.get(s.scene, 'stickers')          # on the current stage
        if out and out[-1].kind == kind and kind != 'stickers':
            out[-1].sentences.append(s)
            continue
        start = max(0., s.start - LEAD) if out else 0.
        entrance = 'none' if not out else 'torn' if kind in LOUD_ENTRANCES or s.energy >= 2 else 'slide'
        if out:
            out[-1].end = start
        out.append(Stage(kind, BACKGROUND.get(kind, 'cream'), start, tl['duration'], entrance, [s]))
    return out

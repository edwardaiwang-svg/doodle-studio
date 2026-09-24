"""Rules every rendered video must keep, whatever the director planned.

Built on synthetic (reading-rate) timing, so no voice model is needed.
"""
from pathlib import Path

import numpy as np
import pytest

from doodlestudio import ingest, script
from doodlestudio.director.rules import RulesDirector
from doodlestudio.engine import auto_scenes as auto
from doodlestudio.engine import ink, render
from doodlestudio.engine import timeline as tl
from doodlestudio.engine.board import COL, STALE

FIX = Path(__file__).parent / 'fixtures'


@pytest.fixture(scope='module', params=['printing_press.md', 'photosynthesis.txt', 'sleep_zh.md'])
def prod(request, tmp_path_factory):
    board = script.build(ingest.read(FIX / request.param))
    lang = board['lang']
    board = RulesDirector(lang).direct(board)
    timing = tl.layout(board, lang, tl.synthetic_clips(board, lang))
    return render.Production(board, timing, lang, tmp_path_factory.mktemp('project'))


def board_frames(prod):
    for i in range(int(prod.tl['duration'] * render.FPS)):
        t = i / render.FPS
        if prod.mode_at(t)[0] == 'board':
            yield t


def test_camera_never_jumps_or_goes_back(prod):
    cam = prod.camera
    prev = None
    for t in board_frames(prod):
        L = cam.at(t)
        if prev is not None and t - prev[0] < 1.5 / render.FPS:
            assert abs(L - prev[1]) < 200, f'camera jumps {prev[1] / COL:.2f} -> {L / COL:.2f} columns at {t:.2f}s'
        prev = (t, L)
    backwards = [(round(t0, 2), a / COL, b / COL) for t0, a, b, kind in cam._segments() if kind == 'pan' and b < a]
    assert not backwards, backwards


def test_every_stroke_is_drawn_on_screen(prod):
    for e in prod.els:
        if e.fixed or not e.hand:
            continue
        for t in (e.start + .01, e.end - .01):
            if prod.mode_at(t)[0] != 'board':
                continue
            L = prod.camera.at(t)
            assert L - 2 <= e.x and e.x + e.w <= L + render.SIZE[0] + 2, \
                f'{e.group} drawn off screen at {t:.2f}s (x {e.x:.0f}..{e.x + e.w:.0f}, view {L:.0f})'


def test_drawings_start_near_their_words(prod):
    for e in prod.els:
        if e.fixed or e.essential or e.after is not None:
            continue
        first = min(x.start for x in prod.els if x.group == e.group)
        if e.start == first:
            assert e.start - e.trigger <= STALE + 1e-6, f'{e.group} starts {e.start - e.trigger:.1f}s after its words'


def test_takeaway_notes_are_finished_before_they_fly(prod):
    for tr in prod.tl['transitions']:
        note = prod.notes[tr['section']]
        for e in note['els']:
            if not e.skipped:
                assert e.end <= tr['hold_end'] - render.NOTE_READ + 1e-6, (tr['section'], e.end, tr['hold_end'])
        assert all(not e.skipped for e in note['els'] if e.essential)


def test_check_marks_avoid_card_text(prod):
    checks = [e for e in prod.ctx.elements if e.fixed and e.hand and e.drawing.size[0] == e.drawing.size[1]
              and e.drawing.size[0] in (150, 120, 96, 90, 72, 60)]
    assert len(checks) == len(prod.tl['transitions'])
    text = [b for card in prod.cards.values() for b in map(auto.ink_bbox, card['els']) if b]
    for c in checks:
        x0, y0, x1, y1 = c.bbox()
        assert not any(x0 < b[2] and b[0] < x1 and y0 < b[3] and b[1] < y1 for b in text), c.bbox()


def test_end_card_is_written_in_time(prod):
    end = prod.tl['end_card']
    card = [e for e in prod.els if e.group == 'endcard']
    assert card and all(isinstance(e.drawing, (ink.TextDrawing, ink.PathDrawing)) for e in card)
    assert all(end['start'] <= e.start and e.end <= end['end'] - .4 for e in card)


def test_numbers_are_written_stroke_by_stroke():
    td = ink.TextDrawing(['in 1455 the press'], 'en', 76)
    f = ink.hand_font('en', 76)
    pad = 6

    def arrivals(a, b):
        x0, x1 = int(pad + f.getlength('in 1455 the press'[:a])), int(pad + f.getlength('in 1455 the press'[:b]))
        region = td.arrival[:, x0:x1][td.alpha[:, x0:x1] > 64]
        return region[np.isfinite(region)]
    word, digits, after = arrivals(0, 2), arrivals(3, 7), arrivals(8, 17)
    assert digits.min() > word.max(), 'the number appears before the words in front of it'
    assert digits.max() < after.min(), 'the number is finished after the words behind it'
    assert digits.max() - digits.min() > .15 * td.duration, 'the number appears all at once'


def test_unlabelled_timeline_runs_the_whole_card(tmp_path):
    board = script.build(ingest.read(FIX / 'printing_press.md'))
    beat = next(b for b in board['beats'] if b['kind'] == 'narration')
    beat['visuals'] = [{'id': 'tl1', 'type': 'lanes', 'title': {'en': 'Timeline'}, 'lanes': [{'label': {'en': ''},
                        'events': [{'pos': 0, 'display': {'en': '1450'}, 'label': {'en': 'Gutenberg'}},
                                   {'pos': 1, 'display': {'en': '1517'}, 'label': {'en': 'Luther'}}]}]}]
    timing = tl.layout(board, 'en', tl.synthetic_clips(board, 'en'))
    prod = render.Production(board, timing, 'en', tmp_path)
    page = [e for e in prod.ctx.elements if e.group == 'tl1']
    band = next(e for e in page if e.w > 1500 and e.h > 200)     # the lane's card
    arrow = next(e for e in page if e.w > 1000 and e.h == 44)     # the time line
    assert arrow.x - band.x < 60, (band.x, arrow.x)
    assert arrow.x + arrow.w > band.x + band.w - 60

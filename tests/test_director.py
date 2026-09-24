from pathlib import Path

import pytest

from doodlestudio import ingest, script
from doodlestudio.director.rules import RulesDirector
from doodlestudio.director.validate import validate

FIX = Path(__file__).parent / 'fixtures'


@pytest.fixture(scope='module', params=['printing_press.md', 'photosynthesis.txt', 'sleep_zh.md'])
def directed(request):
    board = script.build(ingest.read(FIX / request.param))
    return RulesDirector(board['lang']).direct(board)


def test_rules_output_validates(directed):
    report = validate(directed)
    assert report['ok'], report['errors']


def test_every_content_beat_has_a_visual(directed):
    kinds = {c['id']: c['kind'] for c in directed['chapters']}
    content = [b for b in directed['beats'] if b['kind'] in ('narration', 'closing') and kinds[b['chapter']] != 'intro']
    bare = [b['id'] for b in content if not b['visuals']]
    assert len(bare) <= len(content) // 4, bare


def test_validator_catches_bad_triggers_and_doodles():
    board = script.build(ingest.read(FIX / 'photosynthesis.txt'))
    beat = next(b for b in board['beats'] if b['kind'] == 'narration')
    beat['visuals'] = [{'id': 'x1', 'type': 'cluster', 'items': [{'doodle': 'no_such_doodle'}],
                        'trigger': {'en': 'words nobody says'}}]
    errors = validate(board)['errors']
    assert any('not in the spoken text' in e for e in errors) and any('not found' in e for e in errors)


# ---------------------------------------------------------------- meaning rules
def _picks(name):
    board = script.build(ingest.read(FIX / name))
    board = RulesDirector(board['lang']).direct(board)
    return board, [((it.get('label') or {}).get(board['lang']), it['doodle'])
                   for b in board['beats'] for v in b['visuals'] if v['type'] == 'cluster' for it in v['items']]


def test_words_are_drawn_in_the_sense_the_script_uses():
    _, picks = _picks('printing_press.md')
    assert ('Press', 'newspaper') not in picks                 # a press from wine making is not a newspaper
    assert all(d != 'candlestick_phone' for _, d in picks)     # "older inventions" is not a 1900s telephone
    assert all(d != 'brainstorm_board' for _, d in picks)      # a 1450s workshop is not a sticky-note meeting
    _, picks = _picks('sky_blue.md')
    wrong = {'fl_waving_hand', 'fl_candle', 'fl_light_blue_heart', 'fl_horizontal_traffic_light', 'airplane',
             'fl_police_car_light', 'fl_cityscape_at_dusk'}
    assert not wrong & {d for _, d in picks}, picks            # light waves, not hands, lamps or planes
    _, picks = _picks('photosynthesis.txt')
    assert all(d != 'thought_bubble' for _, d in picks)        # leaves reflect light; they don't think


def test_a_word_keeps_its_first_picture():
    _, picks = _picks('sky_blue.md')
    seen = {}
    for label, d in picks:
        if label:
            assert seen.setdefault(label.lower(), d) == d, (label, seen[label.lower()], d)


def test_idioms_generic_words_and_numbers_get_no_picture():
    director = RulesDirector('en')
    board = script.build(ingest.read(FIX / 'printing_press.md'))
    director.direct(board)
    chapter = next(c['id'] for c in board['chapters'] if c['kind'] == 'section')
    hits = director._concepts("Luther's pamphlets spread in a matter of weeks, and several older inventions helped.",
                              [], chapter)
    assert not {h.phrase.lower() for h in hits if h.phrase} & {'matter', 'inventions', 'invention'}


def test_timeline_labels_say_who_or_what():
    board, _ = _picks('printing_press.md')
    lanes = next(v for b in board['beats'] for v in b['visuals'] if v['type'] == 'lanes')
    labels = {e['display']['en']: e['label']['en'] for e in lanes['lanes'][0]['events']}
    assert labels == {'1450': 'Johannes Gutenberg', '1500': 'Printing presses', '1517': 'Martin Luther'}


@pytest.mark.parametrize('sentence, date, label', [
    ('Around 1450, Johannes Gutenberg, a goldsmith in Mainz, combined older inventions.', '1450', 'Johannes Gutenberg'),
    ('By 1500, printing presses were running in more than 250 European cities.', '1500', 'Printing presses'),
    ("In 1517, Martin Luther's arguments spread across Germany in a matter of weeks.", '1517', 'Martin Luther'),
    ('Before the 1450s, every book in Europe was copied by hand.', '1450s', 'Books copied by hand'),
])
def test_event_label(sentence, date, label):
    assert RulesDirector('en')._event_label(sentence, date) == label


def test_event_label_zh():
    label = RulesDirector('zh')._event_label('1911年，辛亥革命推翻了清朝。', '1911')
    assert label and '1911' not in label and '年' not in label, label

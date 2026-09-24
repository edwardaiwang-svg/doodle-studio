import re
from pathlib import Path

import pytest

from doodlestudio import ingest, script
from doodlestudio.engine import timeline

FIX = Path(__file__).parent / 'fixtures'
EN_PUNCT = re.compile(r'[,.;:?!](?=\s|$|["”’)])|—')
ZH_PUNCT = re.compile(r'[，。；：？！、—]')


@pytest.fixture(params=['printing_press.md', 'photosynthesis.txt', 'sleep_zh.md'])
def board(request):
    return script.build(ingest.read(FIX / request.param))


def test_structure(board):
    kinds = [c['kind'] for c in board['chapters']]
    assert kinds[0] == 'intro' and kinds[-1] == 'outro'
    sections = [c for c in board['chapters'] if c['kind'] == 'section']
    assert 2 <= len(sections) <= script.MAX_SECTIONS and 'agenda' in kinds
    agenda_beats = [b for b in board['beats'] if b['chapter'] == 'agenda']
    assert len(agenda_beats) == len(sections)
    for s in sections:
        beats = [b for b in board['beats'] if b['chapter'] == s['id']]
        assert beats[-1]['kind'] == 'take' and beats[-1]['take']['headline'][board['lang']]
    ids = [b['id'] for b in board['beats']]
    assert len(ids) == len(set(ids))
    order = [b['chapter'] for b in board['beats']]
    assert [c['id'] for c in board['chapters']] == list(dict.fromkeys(order))


def test_spoken_text(board):
    lang = board['lang']
    punct = EN_PUNCT if lang == 'en' else ZH_PUNCT
    hi = (script.EN_BEAT if lang == 'en' else script.ZH_BEAT)[2]
    for b in board['beats']:
        spoken, display = b['spoken'][lang], b['display'][lang]
        assert not re.search(r'\d', spoken), spoken
        assert punct.findall(spoken) == punct.findall(display)
        assert script.size(display, lang) <= hi
        assert not re.search(r'[?？!！][.。]', display), display


def test_timeline_accepts_skeleton(board):
    tl = timeline.layout(board, board['lang'], timeline.synthetic_clips(board, board['lang']))
    assert len(tl['transitions']) == sum(c['kind'] == 'section' for c in board['chapters'])
    assert tl['captions'] and tl['duration'] > 30


def test_markdown_and_plain_text_parsing():
    doc = ingest.read('# Title\n\nIntro text here.\n\n## A\n\nFirst **bold** [link](http://x) para.\n\n- item one\n- item two\n\n## B\n\nSecond.')
    assert doc.title == 'Title' and doc.preamble == ['Intro text here.']
    assert [s.heading for s in doc.sections] == ['A', 'B']
    assert doc.sections[0].paragraphs == ['First bold link para.', 'item one', 'item two']
    assert ingest.read('只有一段中文文本，没有标题。').lang == 'zh'

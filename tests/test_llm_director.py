"""LLM director with recorded answers: good visuals are used, bad ones fall back to the rules draft."""
import copy
from pathlib import Path

import pytest

from doodlestudio import ingest, script
from doodlestudio.director.llm.director import LLMDirector
from doodlestudio.director.llm.providers import ProviderError, Usage
from doodlestudio.director.validate import validate

FIX = Path(__file__).parent / 'fixtures'


class Recorded:
    """Answers per section title (or raises), like a provider would."""
    name, model = 'recorded', 'gpt-6-luna'

    def __init__(self, answers):
        self.answers, self.payloads = answers, []

    def direct_section(self, payload, usage: Usage):
        self.payloads.append(payload)
        usage.add(self.model, 3000, 1500)
        answer = self.answers.get(payload['section_title'])
        if isinstance(answer, Exception):
            raise answer
        if answer is None:
            return {'section_title': '', 'hook': '', 'takeaway': '', 'beats': []}
        return answer(payload) if callable(answer) else answer


@pytest.fixture()
def board():
    return script.build(ingest.read(FIX / 'printing_press.md'))


def _beat(payload, n=0):
    return payload['beats'][n]


def good_section(payload):
    b0 = _beat(payload)
    cand = b0['candidates'][0]['id']
    return {'section_title': 'Gutenberg builds a machine', 'hook': 'Metal letters, fast', 'takeaway': 'Printing got fast and cheap',
            'beats': [{'beat_id': b0['beat_id'], 'visuals': [
                {'type': 'cluster', 'relation': 'none', 'items': [{'doodle': cand, 'label': 'Gutenberg', 'trigger': 'Johannes Gutenberg'}]},
                {'type': 'stat', 'value': '1450', 'label': 'invented', 'doodle': '', 'trigger': 'Around 1450'},
            ]}]}


def bad_section(payload):
    b0 = _beat(payload)
    return {'section_title': 'x' * 80, 'hook': '', 'takeaway': 'It sold 999 million copies',
            'beats': [{'beat_id': b0['beat_id'], 'visuals': [
                {'type': 'cluster', 'relation': 'none', 'items': [{'doodle': 'unicorn_rainbow', 'label': '', 'trigger': 'x'}]},
                {'type': 'stat', 'value': '42 million', 'label': 'invented', 'doodle': '', 'trigger': 'nothing'},
                {'type': 'quote', 'text': 'Printing is the best invention ever', 'who': 'Nobody', 'trigger': ''},
            ]}]}


def test_good_answers_are_used_and_mapped_to_spoken_text(board):
    rec = Recorded({'One machine, one idea': good_section})
    report = LLMDirector(rec, 'en').direct(board)
    s1 = next(c for c in board['chapters'] if c['id'] == 's1')
    assert s1['title']['en'] == 'Gutenberg builds a machine' and s1['hook']['en'] == 'Metal letters, fast'
    first = next(b for b in board['beats'] if b['chapter'] == 's1')
    kinds = [v['type'] for v in first['visuals']]
    assert kinds == ['cluster', 'stat']
    assert first['visuals'][1]['trigger']['en'] == 'Around fourteen fifty'       # display phrase -> spoken words
    take = next(b for b in board['beats'] if b['chapter'] == 's1' and b['kind'] == 'take')
    assert take['take']['headline']['en'] == 'Printing got fast and cheap'
    assert validate(board)['ok'] and report['usage'].calls == 5 and report['usage'].cost_usd > 0


def test_bad_answers_fall_back_to_the_rules_draft(board):
    draft = LLMDirector(Recorded({}), 'en')
    reference = copy.deepcopy(board)
    draft.rules.direct(reference)
    rec = Recorded({'One machine, one idea': bad_section, 'Books everywhere': ProviderError('rate limited')})
    report = LLMDirector(rec, 'en').direct(board)
    first = next(b for b in board['beats'] if b['chapter'] == 's1')
    ref_first = next(b for b in reference['beats'] if b['chapter'] == 's1')
    assert first['visuals'] == ref_first['visuals']                          # every visual rejected -> draft kept
    s1 = next(c for c in board['chapters'] if c['id'] == 's1')
    assert s1['title']['en'] == 'One machine, one idea'                       # too-long title rejected
    take = next(b for b in board['beats'] if b['chapter'] == 's1' and b['kind'] == 'take')
    assert '999' not in take['take']['headline']['en']                       # invented number rejected
    notes = ' '.join(report['notes'])
    assert 'was not offered' in notes and 'not in the text' in notes and 'rate limited' in notes
    assert validate(board)['ok']


def test_payload_offers_candidates_and_budget(board):
    rec = Recorded({})
    LLMDirector(rec, 'en').direct(board)
    beat = rec.payloads[1]['beats'][0]
    assert beat['candidates'] and all('id' in c and 'desc' in c for c in beat['candidates'])
    assert beat['visual_budget'] >= 1 and 'narrator_think' in rec.payloads[1]['narrator_poses']

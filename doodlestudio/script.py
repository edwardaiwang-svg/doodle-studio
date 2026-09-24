"""Document -> storyboard skeleton: chapters and beats with display and spoken text.

Structure: intro (title board) -> preamble board (if any) -> agenda -> numbered
sections, each ending in a takeaway beat -> outro. Visuals are added later by a
director (rules or LLM); this module only decides what is said and where.
"""
from __future__ import annotations

import re

from .ingest import Document, Section
from .numbers import normalize

EN_BEAT = (15, 35, 55)          # min / target / max words per beat
ZH_BEAT = (30, 70, 110)         # min / target / max CJK characters per beat
MAX_SECTIONS = 8
CONCLUSION = re.compile(r'^(conclusion|summary|final thoughts|wrap[- ]?up|key takeaways|takeaways|in closing|'
                        r'结语|总结|结论|小结|最后)\b', re.I)
TEXT = {
    'en': {'intro': 'Today: {title}', 'agenda_first': "Here's what we'll cover. First: {t}",
           'agenda_mid': ['Second: {t}', 'Third: {t}', 'Fourth: {t}', 'Fifth: {t}', 'Sixth: {t}', 'Seventh: {t}'],
           'agenda_last': 'And finally: {t}', 'label': 'Part {n}', 'closing': 'Thanks for watching!',
           'intro_label': 'Intro', 'outro_label': 'Wrap-up', 'agenda_label': "What we'll cover"},
    'zh': {'intro': '今天的主题：{title}', 'agenda_first': '本期我们聊{n}件事。第一，{t}',
           'agenda_mid': ['第二，{t}', '第三，{t}', '第四，{t}', '第五，{t}', '第六，{t}', '第七，{t}'],
           'agenda_last': '最后，{t}', 'label': '第{n}部分', 'closing': '感谢收看！',
           'intro_label': '开场', 'outro_label': '总结', 'agenda_label': '本期内容'},
}
ZH_NUM = '零一二三四五六七八九十'


def size(text: str, lang: str) -> int:
    return len(text.split()) if lang == 'en' else len(re.findall(r'[一-鿿]', text))


def sentences(paragraph: str, lang: str) -> list[str]:
    if lang == 'zh':
        parts = re.findall(r'[^。！？!?]+[。！？!?]+[”’」』）)]*|[^。！？!?]+$', paragraph)
    else:
        protected = re.sub(r'\b(Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|vs|etc|e\.g|i\.e|U\.S|U\.K|No)\.', lambda m: m.group(0).replace('.', '\0'),
                           paragraph)
        parts, start = [], 0
        for m in re.finditer(r'[.!?]+[”’")\]]*(?=\s+[“"(\[]?[A-Z0-9])', protected):
            parts.append(protected[start:m.end()])
            start = m.end()
        parts = [p.replace('\0', '.') for p in parts + [protected[start:]]]
    return [p.strip() for p in parts if p.strip()]


def _split_long(sentence: str, lang: str, limit: int) -> list[str]:
    """Split one over-long sentence at the clause mark nearest its middle (recursively)."""
    if size(sentence, lang) <= limit:
        return [sentence]
    marks = [m.end() for m in re.finditer(r'[,;:](?=\s)|—' if lang == 'en' else r'[，；：、]', sentence)]
    if not marks:
        return [sentence]
    mid = len(sentence) / 2
    cut = min(marks, key=lambda k: abs(k - mid))
    return _split_long(sentence[:cut].strip(), lang, limit) + _split_long(sentence[cut:].strip(), lang, limit)


def beats_of(paragraphs: list[str], lang: str) -> list[str]:
    """Group sentences into beats of about the target size; paragraphs never share a beat."""
    lo, target, hi = EN_BEAT if lang == 'en' else ZH_BEAT
    joiner = ' ' if lang == 'en' else ''
    out = []
    for para in paragraphs:
        chunks, cur = [], []
        for unit in (u for s in sentences(para, lang) for u in _split_long(s, lang, hi)):
            if cur and (size(joiner.join(cur + [unit]), lang) > hi or size(joiner.join(cur), lang) >= target):
                chunks.append(cur)
                cur = []
            cur.append(unit)
        if cur:
            if chunks and size(joiner.join(cur), lang) < lo and size(joiner.join(chunks[-1] + cur), lang) <= hi:
                chunks[-1] += cur                       # a short tail joins the previous beat
            else:
                chunks.append(cur)
        out += [joiner.join(c) for c in chunks]
    return out


def _balanced_sections(paragraphs: list[str], lang: str) -> list[Section]:
    """No usable headings: cut the paragraphs into 2–6 sections of similar length."""
    total = sum(size(p, lang) for p in paragraphs)
    k = max(2, min(6, round(total / (220 if lang == 'en' else 420)), len(paragraphs)))
    if len(paragraphs) < 2:
        return [Section('', paragraphs)]
    sections, cur, acc = [], [], 0
    for i, p in enumerate(paragraphs):
        cur.append(p)
        acc += size(p, lang)
        remaining = len(paragraphs) - i - 1
        if acc >= total * (len(sections) + 1) / k and remaining >= k - len(sections) - 1 and len(sections) < k - 1:
            sections.append(Section('', cur))
            cur = []
    if cur:
        sections.append(Section('', cur))
    return sections


def _short_title(text: str, lang: str) -> str:
    first = sentences(text, lang)[0] if text else ''
    if lang == 'zh':
        clause = re.split(r'[，。！？；：]', first)[0]
        return clause if len(clause) <= 14 else clause[:13] + '…'
    words = re.sub(r'[.!?]+$', '', first).split()
    return ' '.join(words) if len(words) <= 7 else ' '.join(words[:6]) + '…'


def _merge_to(sections: list[Section], limit: int, lang: str) -> list[Section]:
    sections = list(sections)
    while len(sections) > limit:
        sizes = [sum(size(p, lang) for p in s.paragraphs) for s in sections]
        i = min(range(len(sections) - 1), key=lambda k: sizes[k] + sizes[k + 1])
        a, b = sections[i], sections[i + 1]
        sections[i:i + 2] = [Section(a.heading or b.heading, a.paragraphs + b.paragraphs)]
    return sections


def headline(beat_text: str, fallback: str, lang: str) -> str:
    """Takeaway note text: the shortest complete sentence of the beat that fits a note, else the section title."""
    cap = 14 if lang == 'en' else 28
    floor = 4 if lang == 'en' else 8
    fits = [s for s in sentences(beat_text, lang) if floor <= size(s, lang) <= cap]
    return min(fits, key=lambda s: size(s, lang)) if fits else fallback


def sentence_of(text: str, lang: str) -> str:
    """A heading used as a spoken sentence: keep a question mark, otherwise end with a full stop."""
    text = text.strip().rstrip('.。:：;；,，')
    if text.endswith(('?', '？', '!', '！')):
        return text
    return text + ('.' if lang == 'en' else '。')


def build(doc: Document) -> dict:
    lang, T = doc.lang, TEXT[doc.lang]
    sections = [s for s in doc.sections if s.paragraphs]
    preamble = list(doc.preamble)
    if len(sections) < 2:                       # no usable headings: split the text evenly
        body = preamble + [p for s in sections for p in s.paragraphs]
        preamble, sections = [], _balanced_sections(body, lang)
    outro_paras = []
    if len(sections) >= 3 and CONCLUSION.match(sections[-1].heading.strip()):
        outro_paras = sections.pop().paragraphs
    sections = _merge_to(sections, MAX_SECTIONS, lang)
    for s in sections:
        s.heading = s.heading.strip() or _short_title(s.paragraphs[0], lang)

    chapters, beats = [], []

    def beat(chapter, kind, display, **extra):
        n = normalize(display, lang)
        beats.append({'id': f'b{len(beats) + 1:03d}', 'chapter': chapter, 'kind': kind,
                      'display': {lang: display}, 'spoken': {lang: n.spoken}, 'visuals': [], **extra})
        return beats[-1]

    chapters.append({'id': 'intro', 'kind': 'intro', 'label': {lang: doc.title}, 'title': {lang: ''}})
    beat('intro', 'title', T['intro'].format(title=sentence_of(doc.title, lang)), music=True)
    if preamble:
        chapters.append({'id': 'preamble', 'kind': 'board', 'label': {lang: T['intro_label']}, 'title': {lang: ''}})
        for text in beats_of(preamble, lang):
            beat('preamble', 'narration', text)
    multi = len(sections) >= 2
    if multi:
        chapters.append({'id': 'agenda', 'kind': 'agenda', 'label': {lang: T['agenda_label']}, 'title': {lang: ''}})
        for k, s in enumerate(sections):
            t = sentence_of(s.heading, lang)
            text = (T['agenda_first'].format(t=t, n=ZH_NUM[len(sections)] if len(sections) <= 10 else len(sections))
                    if k == 0 else T['agenda_last'].format(t=t) if k == len(sections) - 1
                    else T['agenda_mid'][min(k - 1, len(T['agenda_mid']) - 1)].format(t=t))
            beat('agenda', 'agenda', text, music=True)
    for k, s in enumerate(sections, 1):
        cid = f's{k}'
        chapters.append({'id': cid, 'kind': 'section' if multi else 'board', 'label': {lang: T['label'].format(n=k)},
                         'title': {lang: s.heading}})
        texts = beats_of(s.paragraphs, lang)
        for i, text in enumerate(texts):
            if multi and i == len(texts) - 1 and len(texts) > 1:
                beat(cid, 'take', text, take={'headline': {lang: headline(text, s.heading, lang)}})
            else:
                beat(cid, 'narration', text)
    chapters.append({'id': 'outro', 'kind': 'outro', 'label': {lang: T['outro_label']}, 'title': {lang: ''}})
    for text in beats_of(outro_paras, lang):
        beat('outro', 'narration', text)
    beat('outro', 'closing', T['closing'], music=True)
    return {'version': 1, 'lang': lang, 'title': {lang: doc.title}, 'narrator': 'narrator',
            'chapters': chapters, 'beats': beats}

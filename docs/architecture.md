# Architecture

```
doodlestudio/
  ingest.py        .txt / .md / .docx / pasted text → title, preamble, sections (headings)
  numbers.py       display → spoken text ("$3.8bn" → "three point eight billion dollars"; "30%" → "百分之三十"), with a position map
  script.py        document → storyboard skeleton: intro, agenda, sections (each ending in a takeaway), outro; ~35-word beats
  director/
    match.py       doodle search: keyword hits (plural-aware, rarity-weighted) + bge-small embeddings (bundled vectors)
    rules.py       offline director: quotes, definitions, numbers, timelines, questions, concept doodles, narrator poses
    validate.py    the gate every storyboard passes (structure, parity, triggers, doodles)
    llm/           schema + system prompt (shared with the server), providers (Doodle Cloud, OpenAI, Anthropic, compatible), checker
  voice.py         Kokoro via kokoro-onnx; per-beat clips cached by hash; character timing from phoneme durations
  audio/mix.py     narration master at -18 LUFS, SRT/VTT captions, CC0 music bed ducked under speech
  engine/          the renderer: a camera over an endless paper strip
    ink.py           drawing primitives: SVG outline tracing, glyph-skeleton handwriting, the hand, fonts
    board.py         layout (3 columns × 2 rows per screen), one-hand scheduler with bounded catch-up, camera
    scenes.py        slot visuals (cluster, quote, glossary, stat, emphasis) and page loading
    pages_*.py       charts (bars, coins, grid100, lanes, range, calendar, dial, flow, split, ladder, levels, zones, table)
    auto_scenes.py   title board, agenda cards, section openers, takeaway notes, pins, checks, circles
    timeline.py      places beats on the clock: chapter gaps, takeaway reading holds, transitions, captions, music windows
    render.py        modes (board, zoom, pull back, fly, agenda, stock, end card) → frames → ffmpeg; --workers N segments
  package.py       mux with chapters, encoded QA (decode, frame count, audio correlation, chapters), thumbnail, files
  pipeline.py      project folder orchestration; cli.py (`doodle`); studio/ (local server + single-page app + window)
```

## Timing

Each beat's clip comes with the time at which every character is heard. Clause punctuation, which is identical in the display and spoken text, anchors each clause. Within a clause, letters map proportionally onto the phonemes Kokoro reports. Against Whisper word timestamps, this lands within about 0.12–0.2 s on average.

`timeline.layout` turns clip lengths into absolute times, captions, chapter marks and music windows. The renderer places each drawing no earlier than its trigger, and one hand draws one thing at a time. When drawings pile up, the scheduler speeds a group up to at most 2× rather than falling behind indefinitely. It lets the viewer read a chart before the camera pans on.

The scheduler (`engine/board.py`) keeps these rules in every video, whatever the director planned; `tests/test_render_rules.py` checks them:

- **Nothing appears without the hand.** Numbers are written stroke by stroke like words. A takeaway note flies to the agenda exactly as far as the hand has written it, and the note is always finished a second before it flies.
- **The camera never jumps.** It pans smoothly from wherever it is, leaves a page only after the hand has finished there, and never returns to a page it has left.
- **Late is skipped, not drawn.** A visual that cannot start within 3 seconds of its words is left out, and the render warnings list it. Decorations, such as the doodles beside a takeaway note, are drawn only if they finish in time.

## Rendering

The board is an endless strip of 640 px columns, and a screen shows three of them. Slot visuals fill cells column by column. Pages take a fresh screen, and an anchor spanning the page makes the camera align to it. Nothing is ever cut at the frame edge while the camera is at rest.

Frames are composited with Pillow (paper, drawings in progress, the hand, captions) and streamed to FFmpeg. With `--workers N`, the frame range is split into N segments rendered by separate processes and joined without re-encoding.

## Offline director

`director/rules.py` plans every beat without a network, so its rules decide most of what a video shows. A doodle is drawn for a word only in the sense the script uses:

- the picture must belong to the section's subject, unless the words name exactly what it shows (and an emoji must be the very thing named: an emoji called "light blue heart" is a heart, never "light");
- when a word could mean several pictures, the one that fits the sentence best with the word itself hidden wins;
- a word keeps the picture it got first, and is left undrawn rather than given a second-best meaning;
- idioms ("a matter of weeks"), generic words ("inventions"), numbers and phenomena drawn as objects ("blue light" as a lamp) get no picture, and a compound such as "global warming" is one idea.

Timeline labels say who or what each dated clause is about: a named person or group first, else the clause's subject ("By 1500, printing presses were running" gives "Printing presses"). A date after "before" or "until" is not an event.

## AI director

The rules director always runs first; its plan is both the draft and the fallback. An LLM then plans one section at a time from:

- the beat texts;
- a rules draft;
- about 12 candidate doodles per beat, found by the matcher.

The answer is constrained to a JSON schema and checked by code. A beat whose answer fails any check keeps its draft.

Doodle Cloud (a separate, private service) runs the same contract on the server. That way the model keys never ship in the app, and quotas and costs are enforced in one place.

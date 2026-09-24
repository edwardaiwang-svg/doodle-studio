# Third-party notices

Doodle Studio's own code is MIT-licensed. Its original doodles, narrator character and drawing hand are CC BY 4.0. The components below keep their own licences.

## Bundled with the app

| Component | Where | Licence |
|---|---|---|
| Microsoft Fluent Emoji (converted to outlined SVG) | `assets/doodles/fluent/` | MIT, © Microsoft Corporation; see `fluent/LICENSE` and `fluent/NOTICE.md` |
| Unicode CLDR annotations (Chinese emoji keywords) | `assets/doodles/tags/fluent.json` | Unicode License v3; see `fluent/NOTICE.md` |
| Playpen Sans Bold (static instance) | `assets/fonts/` | SIL OFL 1.1, © The Playpen Sans Project Authors |
| Doodle Kai Medium (a subset of LXGW WenKai, renamed as the OFL Reserved Font Name clause requires) | `assets/fonts/` | SIL OFL 1.1, © LXGW |
| Arimo Bold (static instance) | `assets/fonts/` | SIL OFL 1.1, © The Arimo Project Authors |
| Noto Sans SC Bold | `assets/fonts/` | SIL OFL 1.1, © Adobe / Google |
| Music: *Fresh Focus* and *Natural Vibes* (Kevin MacLeod), *Inventing Flight* (Bryan Teoh) | `assets/music/` | CC0 / public domain, via FreePD.com; see `music/NOTICE.md` |

## Downloaded on first use

| Component | Licence |
|---|---|
| Kokoro-82M voice models, v1.0 and v1.1-zh (hexgrad), ONNX exports by thewh1teagle | Apache-2.0 |
| BAAI bge-small-en-v1.5 and bge-small-zh-v1.5 (doodle search), via fastembed | MIT |

## Python libraries

| Library | Licence |
|---|---|
| kokoro-onnx | MIT |
| onnxruntime | MIT |
| misaki (Chinese G2P) | Apache-2.0 |
| espeak-ng (through espeakng-loader / phonemizer) | GPL-3.0 |
| fastembed | Apache-2.0 |
| jieba | MIT |
| num2words | LGPL-2.1 |
| cn2an | MIT |
| Pillow | MIT-CMU |
| NumPy and SciPy | BSD-3-Clause |
| resvg-py | MIT |
| svgelements | MIT |
| fontTools | MIT |
| imageio-ffmpeg (bundles FFmpeg) | BSD-2-Clause / LGPL |
| platformdirs | MIT |
| defusedxml | PSF |
| pywebview | BSD-3-Clause |
| keyring | MIT |
| openai | Apache-2.0 |
| anthropic | MIT |

espeak-ng is GPL-3.0. It is loaded as a separate shared library to turn English text into phonemes, and it keeps its own licence and source availability. The packaged apps include its unmodified library and data. Source: https://github.com/espeak-ng/espeak-ng.

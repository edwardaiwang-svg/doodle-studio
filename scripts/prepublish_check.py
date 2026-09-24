"""Run before every public push: no private names, personal paths, emails or API keys in the repository.

  python scripts/prepublish_check.py        (exit 1 and a list of hits if anything is found)

Terms are matched case-insensitively; key patterns by their exact shape.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKIP_DIRS = {'.git', '.venv', 'private_presets', 'node_modules', 'dist', 'build', 'projects', '__pycache__', '.pytest_cache'}
BINARY = {'.png', '.jpg', '.jpeg', '.mp4', '.mp3', '.wav', '.ttf', '.otf', '.npz', '.icns', '.ico', '.gif', '.onnx', '.bin'}
PRIVATE = ['benjamin', 'franklin', 'applovin', 'foroughi', 'rieder', 'sehgal', 'hermes', 'benlin', 'ben lin', '/users/',
           'aij820917', '819987@', 'smccd', 'franklinmfo', 'edward.ai.wang', 'edwardaiwang@', 'discord', 'podcast-digest']
KEYS = [r'sk-[A-Za-z0-9_-]{20,}', r'sk-ant-[A-Za-z0-9_-]+', r'AKIA[0-9A-Z]{16}', r'ghp_[A-Za-z0-9]{30,}',
        r'xox[abp]-[A-Za-z0-9-]+', r'-----BEGIN [A-Z ]*PRIVATE KEY-----', r'AIza[0-9A-Za-z_-]{35}', r're_[A-Za-z0-9]{24,}']
terms = re.compile('|'.join(re.escape(t) for t in PRIVATE), re.I)
keys = re.compile('|'.join(KEYS))
print(f'$ scan {ROOT} (case-insensitive terms: {", ".join(PRIVATE)}; key patterns: {len(KEYS)})')
hits = 0
for path in sorted(ROOT.rglob('*')):
    if not path.is_file() or SKIP_DIRS & set(path.relative_to(ROOT).parts) or path.suffix.lower() in BINARY:
        continue
    if path.name == 'prepublish_check.py':
        continue
    try:
        text = path.read_text(encoding='utf-8')
    except UnicodeDecodeError:
        continue
    for n, line in enumerate(text.splitlines(), 1):
        for m in (terms.search(line), keys.search(line)):
            if m:
                hits += 1
                print(f'{path.relative_to(ROOT)}:{n}: {m.group(0)!r}  {line.strip()[:120]}')
print(f'{hits} hit(s)')
sys.exit(1 if hits else 0)

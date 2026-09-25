import json

from doodlestudio.director.llm import cloud


def test_requests_carry_the_app_signature(monkeypatch):
    """Cloudflare answers 403 (error 1010) to Python's default "Python-urllib" signature."""
    seen = {}

    class Reply:
        def __enter__(self):
            return self

        def __exit__(self, *exc):
            return False

        def read(self):
            return json.dumps({'ok': True}).encode()

    def urlopen(req, timeout):
        seen['ua'] = req.get_header('User-agent')
        return Reply()

    monkeypatch.setattr(cloud, 'URL', 'https://api.example.org')
    monkeypatch.setattr(cloud.urllib.request, 'urlopen', urlopen)
    cloud.signup('someone@example.org')
    assert seen['ua'].startswith('DoodleStudio')

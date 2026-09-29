"""HTTPS for the voice download and Doodle Cloud: the system's certificates plus certifi's.

The packaged Mac app's OpenSSL looks for certificates in a folder only the build machine has,
so without certifi's bundle every HTTPS call there failed with CERTIFICATE_VERIFY_FAILED.
"""
from __future__ import annotations

import ssl
import urllib.request
from functools import cache

import certifi


@cache
def _context() -> ssl.SSLContext:
    context = ssl.create_default_context()      # keeps the system store (Windows, Linux, a school's own certificate)
    context.load_verify_locations(certifi.where())
    return context


def urlopen(request, **kwargs):
    return urllib.request.urlopen(request, context=_context(), **kwargs)

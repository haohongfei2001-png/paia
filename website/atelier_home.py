"""Owner-requested Atelier V9 homepage. Interior routes keep their existing owners.

The checked-in templates are paired, fictional, browser-local examples.
No content store, model endpoint, account connection or permission is created.
"""
from pathlib import Path

DIRECTORY = Path(__file__).with_name('atelier')

def render(lang: str) -> str:
    if lang not in ('en', 'zh'):
        raise ValueError('Unsupported homepage language')
    document = (DIRECTORY / f'home.{lang}.html').read_text(encoding='utf-8')
    if 'data-atelier-version="9"' not in document:
        raise ValueError('Missing reviewed homepage release marker')
    return document

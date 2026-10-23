"""Owner-requested Atelier V11 homepage. Interior routes keep their existing owners.

The checked-in templates are paired, fictional, browser-local examples.
No content store, model endpoint, account connection or permission is created.
"""
from pathlib import Path

DIRECTORY = Path(__file__).with_name('atelier')

def render(lang: str) -> str:
    if lang not in ('en', 'zh'):
        raise ValueError('Unsupported homepage language')
    document = (DIRECTORY / f'home.{lang}.html').read_text(encoding='utf-8')
    if 'data-atelier-version="11"' not in document:
        raise ValueError('Missing reviewed homepage release marker')
    return document


def render_demo(lang: str) -> str:
    if lang not in ("en","zh"):
        raise ValueError("Unsupported example language")
    return (DIRECTORY / f"demo.{lang}.html").read_text(encoding="utf-8")

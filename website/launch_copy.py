"""Exact bilingual publication copy; no runtime or sample-data rewriting."""
from pathlib import Path
import json
_DATA = json.loads(Path(__file__).with_name('launch_copy.json').read_text())
_COPY = {(r['source_zh'], r['source_en']):(r['zh'], r['en']) for r in _DATA['replacements']}

def product_copy(zh, en, english=False):
    return _COPY.get((zh,en),(zh,en))[int(english)]

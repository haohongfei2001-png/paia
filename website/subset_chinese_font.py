#!/usr/bin/env python3
"""Build/check PAIA's small, self-hosted Noto Sans SC variable WOFF2.

Only local generated pages and their active CSS/JS dependencies are read.
The original upstream TTF stays outside the website checkout and delivery ZIP.
"""
from __future__ import annotations

import argparse
from hashlib import sha256
from html import unescape
from html.parser import HTMLParser
from io import BytesIO
import json
from pathlib import Path
import re
import unicodedata
from urllib.parse import unquote, urljoin, urlsplit

ROOT = Path(__file__).resolve().parents[1]
TYPE = ROOT / 'assets/website/type'
FONT = TYPE / 'noto-sans-sc-paia.woff2'
MANIFEST = TYPE / 'noto-sans-sc-paia.json'
LICENSE = TYPE / 'NOTO-SANS-SC-OFL.txt'
UPSTREAM_COMMIT = '2894aab31764f10f29c421bdfd2340d3b382d384'
UPSTREAM_URL = ('https://raw.githubusercontent.com/google/fonts/' + UPSTREAM_COMMIT +
                '/ofl/notosanssc/NotoSansSC%5Bwght%5D.ttf')
UPSTREAM_SHA256 = 'a3041811a78c361b1de50f953c805e0244951c21c5bd412f7232ef0d899af0da'
BASE = 'https://inputarchive.com'


class Dependencies(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.paths: set[str] = set()

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'script' and attrs.get('src'):
            self.paths.add(attrs['src'])
        elif tag == 'link' and 'stylesheet' in attrs.get('rel', '').split() and attrs.get('href'):
            self.paths.add(attrs['href'])


def site_path(value: str, base: str = '/') -> Path:
    url = urlsplit(urljoin(BASE + base, value))
    if url.scheme not in {'http', 'https'} or url.netloc != 'inputarchive.com':
        raise ValueError('External text dependency must be made local first: ' + value)
    path = (ROOT / unquote(url.path).lstrip('/')).resolve()
    if not path.is_relative_to(ROOT) or not path.is_file():
        raise FileNotFoundError('Missing local text dependency: ' + value)
    return path


def text_corpus(extra: list[Path]) -> tuple[set[int], list[str]]:
    generated = (ROOT / 'website/generated-paths.txt').read_text(encoding='utf-8').splitlines()
    pages = [name.strip() for name in generated if name.strip().endswith('.html')]
    if len(pages) != 57:
        raise ValueError(f'Expected 57 website routes, found {len(pages)}')
    paths: set[Path] = set()
    for name in pages:
        path = site_path('/' + name)
        paths.add(path)
        parser = Dependencies()
        parser.feed(path.read_text(encoding='utf-8'))
        for value in parser.paths:
            paths.add(site_path(value, '/' + name))
    paths.update(path.expanduser().resolve() for path in extra)
    characters = set(range(0x20, 0x7f)) | {0xa0}
    for path in sorted(paths):
        text = unescape(path.read_text(encoding='utf-8'))
        # Include runtime strings written with Unicode escapes as well as
        # literal Chinese. These matches add glyphs; they never execute code.
        escaped = re.findall(r'\\u\{([0-9a-fA-F]{1,6})\}|\\u([0-9a-fA-F]{4})', text)
        text += ''.join(chr(int(a or b, 16)) for a, b in escaped
                        if int(a or b, 16) <= 0x10ffff)
        characters.update(ord(char) for char in text
                          if unicodedata.category(char) not in {'Cc', 'Cf', 'Cs'})
    names = [path.relative_to(ROOT).as_posix() if path.is_relative_to(ROOT) else str(path)
             for path in sorted(paths)]
    return characters, names


def is_han(code: int) -> bool:
    return (0x3400 <= code <= 0x4dbf or 0x4e00 <= code <= 0x9fff or
            0xf900 <= code <= 0xfaff or 0x20000 <= code <= 0x323af)


def code_label(code: int) -> str:
    return f'U+{code:04X} {chr(code)}'


def check_font(extra: list[Path]) -> dict:
    from fontTools.ttLib import TTFont
    characters, names = text_corpus(extra)
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    with TTFont(FONT) as font:
        coverage = set(font.getBestCmap())
        fallback = set(manifest.get('unsupported_codepoints', []))
        missing = sorted(characters - coverage - fallback)
        if missing:
            raise ValueError('Font subset needs rebuilding; missing ' +
                             ', '.join(code_label(code) for code in missing))
        if 'fvar' not in font or [(a.axisTag, a.minValue, a.maxValue) for a in font['fvar'].axes] != [('wght', 100.0, 900.0)]:
            raise ValueError('The variable weight axis was not preserved')
        if LICENSE.read_text(encoding='utf-8').strip() not in font['name'].getDebugName(13):
            raise ValueError('Full OFL license missing from the embedded font metadata')
    result = {'font': str(FONT.relative_to(ROOT)), 'bytes': FONT.stat().st_size,
              'source_files_checked': len(names), 'required_codepoints': len(characters),
              'missing_codepoints': 0, 'variable_weight': '100–900',
              'explicit_fallback': [code_label(code) for code in sorted(characters & fallback)]}
    return result


def build_font(source: Path, extra: list[Path], max_bytes: int) -> dict:
    import fontTools
    from fontTools import subset
    from fontTools.ttLib import TTFont
    source = source.expanduser().resolve()
    if source.is_relative_to(ROOT):
        raise ValueError('Keep the full upstream TTF outside the source checkout')
    if sha256(source.read_bytes()).hexdigest() != UPSTREAM_SHA256:
        raise ValueError('Upstream font SHA-256 does not match the pinned official version')
    characters, names = text_corpus(extra)
    font = TTFont(source, recalcTimestamp=False)
    supported = set(font.getBestCmap())
    unsupported = sorted(characters - supported)
    missing_han = [code for code in unsupported if is_han(code)]
    if missing_han:
        raise ValueError('Upstream font lacks required Han characters: ' +
                         ', '.join(code_label(code) for code in missing_han))
    options = subset.Options()
    options.name_IDs = ['*']
    options.name_languages = ['*']
    options.name_legacy = True
    options.layout_features = ['*']
    options.notdef_glyph = True
    options.notdef_outline = True
    options.recommended_glyphs = True
    worker = subset.Subsetter(options=options)
    worker.populate(unicodes=characters & supported)
    worker.subset(font)
    # The single-file preview embeds the font without a neighbouring OFL file.
    # Keep the entire unchanged license inside its name table as well as on disk.
    license_text = LICENSE.read_text(encoding='utf-8').strip()
    font['name'].setName(license_text, 13, 3, 1, 0x409)
    font['name'].setName(license_text, 13, 0, 4, 0)
    font.flavor = 'woff2'
    buffer = BytesIO()
    font.save(buffer)
    font.close()
    binary = buffer.getvalue()
    if len(binary) > max_bytes:
        raise ValueError(f'Subset is {len(binary):,} bytes; budget is {max_bytes:,}. '
                         'Review the corpus or use explicit font shards; do not ship the full font.')
    with TTFont(BytesIO(binary)) as verified:
        coverage = set(verified.getBestCmap())
        if not (characters & supported).issubset(coverage):
            raise ValueError('Subset roundtrip lost required characters')
        axes = [{'tag': axis.axisTag, 'min': axis.minValue, 'default': axis.defaultValue,
                 'max': axis.maxValue} for axis in verified['fvar'].axes]
    FONT.write_bytes(binary)
    report = {
        'family': 'Noto Sans SC', 'subset_file': FONT.name,
        'upstream_url': UPSTREAM_URL, 'upstream_commit': UPSTREAM_COMMIT,
        'upstream_sha256': UPSTREAM_SHA256, 'upstream_bytes': source.stat().st_size,
        'license': LICENSE.name, 'license_embedded_in_name_table': True,
        'subset_sha256': sha256(binary).hexdigest(), 'subset_bytes': len(binary),
        'fonttools_version': fontTools.__version__,
        'axes': axes, 'input_files': names, 'required_codepoints': len(characters),
        'subset_codepoints': len(coverage), 'han_codepoints': sum(is_han(c) for c in coverage),
        'unsupported_codepoints': unsupported,
        'fallback_note': 'User-entered characters outside this content subset use the CSS system-font fallback.'
    }
    MANIFEST.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    return check_font(extra)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, help='Pinned upstream TTF kept outside this checkout')
    parser.add_argument('--extra-text', type=Path, action='append', default=[],
                        help='Include a new source/text file before its generated page is built')
    parser.add_argument('--max-bytes', type=int, default=1_000_000)
    parser.add_argument('--check', action='store_true', help='Check current text coverage without the full TTF')
    args = parser.parse_args()
    if not args.check and not args.source:
        parser.error('--source is required when building; --check needs only the included WOFF2')
    try:
        report = check_font(args.extra_text) if args.check else build_font(args.source, args.extra_text, args.max_bytes)
    except ImportError as error:
        raise SystemExit('Font build/check requires fontTools; WOFF2 also requires Brotli. '
                         'Install fonttools[woff] in your development environment. ' + str(error)) from error
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()

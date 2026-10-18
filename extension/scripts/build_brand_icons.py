#!/usr/bin/env python3
"""Verify or restore the owner-approved mailbox icons without resampling.

The final package has distinct optical sizes. Copy their exact bytes rather than
shrinking one Desktop image or upscaling a 64px source. --check writes nothing.
This is maintenance tooling, never an extension runtime dependency.
"""
import argparse
import hashlib
import json
from pathlib import Path
import struct
import sys

ROOT = Path(__file__).resolve().parents[2]
PROVENANCE = ROOT / 'extension/icons/brand-icons-provenance.json'
SOURCE_ROOT = 'design/brand/mailbox-final-20261018'
SIZES = (16, 32, 48, 128)
SOURCE_SIZES = (16, 32, 48, 64, 128)
BRAND_ID = 'PAIA-MAILBOX-FINAL-20261018'


def validate_png(data, expected, label):
    if data[:8] != b'\x89PNG\r\n\x1a\n' or data[12:16] != b'IHDR':
        raise ValueError(f'{label}: expected a PNG image')
    if list(struct.unpack('>II', data[16:24])) != expected['dimensions']:
        raise ValueError(f'{label}: dimensions differ from the approved record')
    if hashlib.sha256(data).hexdigest() != expected['sha256']:
        raise ValueError(f'{label}: SHA-256 differs from the approved record')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Verify approved bytes without writing.')
    args = parser.parse_args()
    record = json.loads(PROVENANCE.read_text(encoding='utf-8'))
    authority_path = SOURCE_ROOT + '/manifest.json'
    if record['schema_version'] != 2 or record['brand_id'] != BRAND_ID or record['authority_manifest'] != authority_path:
        raise ValueError('Unexpected mailbox adoption authority')
    authority = json.loads((ROOT / authority_path).read_text(encoding='utf-8'))
    if authority['brand_id'] != BRAND_ID:
        raise ValueError('Mailbox authority identity differs')
    sources = record['sources']
    expected_sources = {f'{SOURCE_ROOT}/png/paia-{s}.png' for s in SOURCE_SIZES}
    if set(sources) != expected_sources:
        raise ValueError('Exactly the five approved optical sources are required')
    source_bytes = {}
    for size in SOURCE_SIZES:
        path = f'{SOURCE_ROOT}/png/paia-{size}.png'
        entry = sources[path]
        if entry != authority['sources'][path] or entry['dimensions'] != [size, size]:
            raise ValueError(f'{path}: source differs from the independent adoption record')
        data = (ROOT / path).read_bytes()
        validate_png(data, entry, path)
        source_bytes[path] = data

    expected_icons = {f'extension/icons/icon{s}.png': s for s in SIZES}
    expected_ui = {f'extension/ui/assets/paia-logo-{s}.png': s for s in (32, 64)}
    if set(record['outputs']) != set(expected_icons) or set(record['ui_outputs']) != set(expected_ui):
        raise ValueError('Exactly four action icons and two existing UI marks are required')
    outputs = {}
    for path, size in {**expected_icons, **expected_ui}.items():
        entry = {**record['outputs'], **record['ui_outputs']}[path]
        expected_source = f'{SOURCE_ROOT}/png/paia-{size}.png'
        approved = authority['targets'][path]
        if entry['source'] != expected_source or entry['dimensions'] != [size, size]:
            raise ValueError(f'{path}: incorrect optical source or dimensions')
        if any(entry[k] != approved[k] for k in ('source', 'dimensions', 'sha256')):
            raise ValueError(f'{path}: output differs from the adoption record')
        data = source_bytes[expected_source]
        validate_png(data, entry, path)
        if args.check:
            validate_png((ROOT / path).read_bytes(), entry, path)
        outputs[path] = data

    # Every source and output is validated before any write is attempted.
    if not args.check:
        for path, data in outputs.items():
            (ROOT / path).write_bytes(data)
    print('PASS: five approved optical sources, four action icons and two UI marks match.' if args.check else
          'Restored all six runtime brand images from exact approved optical sources.')


if __name__ == '__main__':
    try:
        main()
    except (OSError, ValueError, KeyError, TypeError, struct.error) as error:
        print(f'Brand icon verification failed: {error}', file=sys.stderr)
        sys.exit(1)

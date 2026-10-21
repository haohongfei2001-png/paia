#!/usr/bin/env python3
"""Verify or restore the owner-approved soft-blue P icons without resampling.

App canvases, compact toolbar symbols and application UI marks have distinct
approved sources. Copy exact bytes for each role and size. --check writes nothing.
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
SOURCE_ROOT = 'design/brand/soft-blue-p-20261021'
SIZES = (16, 32, 48, 128)
SOURCE_ROLES = {'app-icon': SIZES, 'ui-symbol': SIZES, 'symbol': (32, 64)}
BRAND_ID = 'PAIA-OPEN-P-SOFT-BLUE-20261021'


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
    if record['schema_version'] != 3 or record['brand_id'] != BRAND_ID or record['authority_manifest'] != authority_path:
        raise ValueError('Unexpected soft-blue P adoption authority')
    authority = json.loads((ROOT / authority_path).read_text(encoding='utf-8'))
    if authority['schema_version'] != 3 or authority['brand_id'] != BRAND_ID:
        raise ValueError('Soft-blue P authority identity differs')
    sources = record['sources']
    expected_sources = {f'{SOURCE_ROOT}/png/{role}-{size}.png': size
                        for role, sizes in SOURCE_ROLES.items() for size in sizes}
    if set(sources) != set(expected_sources):
        raise ValueError('Exactly ten approved sources across the three roles are required')
    source_bytes = {}
    for path, size in expected_sources.items():
        entry = sources[path]
        if entry != authority['sources'][path] or entry['dimensions'] != [size, size]:
            raise ValueError(f'{path}: source differs from the independent adoption record')
        data = (ROOT / path).read_bytes()
        validate_png(data, entry, path)
        source_bytes[path] = data

    expected_groups = {
        'outputs': {f'extension/icons/icon{s}.png': ('app-icon', s) for s in SIZES},
        'action_outputs': {f'extension/icons/action{s}.png': ('ui-symbol', s) for s in SIZES},
        'ui_outputs': {f'extension/ui/assets/paia-logo-{s}.png': ('symbol', s) for s in (32, 64)},
    }
    for group, expected in expected_groups.items():
        if set(record[group]) != set(expected):
            raise ValueError('Exactly four app icons, four toolbar icons and two UI marks are required')
    outputs = {}
    for group, expected in expected_groups.items():
        for path, (role, size) in expected.items():
            entry = record[group][path]
            expected_source = f'{SOURCE_ROOT}/png/{role}-{size}.png'
            approved = authority['targets'][path]
            if entry['source'] != expected_source or entry['dimensions'] != [size, size]:
                raise ValueError(f'{path}: incorrect role, source or dimensions')
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
    print('PASS: ten approved sources, four app icons, four toolbar icons and two UI marks match.' if args.check else
          'Restored all ten runtime brand images from exact approved role and size sources.')


if __name__ == '__main__':
    try:
        main()
    except (OSError, ValueError, KeyError, TypeError, struct.error) as error:
        print(f'Brand icon verification failed: {error}', file=sys.stderr)
        sys.exit(1)

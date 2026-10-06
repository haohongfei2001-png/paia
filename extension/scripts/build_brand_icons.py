#!/usr/bin/env python3
"""Reproduce the approved compact PAIA brand icons; never redesign the artwork.

Run from any directory with Python 3 and Pillow 12.3.0 already installed:
    python3 extension/scripts/build_brand_icons.py

The committed source/output hashes are a review boundary. --check needs only
Python's standard library and validates the frozen bytes without rewriting them.
Pillow is a maintenance tool only, not a packaged extension dependency.
"""

import argparse
import hashlib
import io
import json
from pathlib import Path
import struct
import sys


ROOT = Path(__file__).resolve().parents[2]
PROVENANCE = ROOT / 'extension/icons/brand-icons-provenance.json'
SIZES = (16, 32, 48, 128)


def validate_png(data, expected, label):
    if data[:8] != b'\x89PNG\r\n\x1a\n' or data[12:16] != b'IHDR':
        raise ValueError(f'{label}: expected a PNG image')
    if list(struct.unpack('>II', data[16:24])) != expected['dimensions']:
        raise ValueError(f'{label}: dimensions differ from the approved record')
    if hashlib.sha256(data).hexdigest() != expected['sha256']:
        raise ValueError(f'{label}: SHA-256 differs from the approved record')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Verify frozen assets; do not write files or require Pillow.')
    args = parser.parse_args()
    record = json.loads(PROVENANCE.read_text())
    sources = record['sources']
    expected_sources = {f'extension/ui/assets/paia-logo-{size}.png' for size in (32, 64)}
    if set(sources) != expected_sources:
        raise ValueError('Only the two existing Desktop brand assets may be used')
    source_bytes = {}
    for path, source_record in sources.items():
        source_bytes[path] = (ROOT / path).read_bytes()
        validate_png(source_bytes[path], source_record, path)
    source_lock = json.loads((ROOT / record['desktop_asset_manifest']).read_text())
    if source_lock['included_icon']['sha256'] != sources['extension/ui/assets/paia-logo-32.png']['sha256']:
        raise ValueError('32px source does not match the existing Desktop brand lock')

    output_paths = [f'extension/icons/icon{size}.png' for size in SIZES]
    if set(record['outputs']) != set(output_paths):
        raise ValueError('Provenance must describe exactly the four extension icons')
    for size, path in zip(SIZES, output_paths):
        if record['outputs'][path]['dimensions'] != [size, size]:
            raise ValueError(f'{path}: the declared size must match its filename')
        expected_source = f'extension/ui/assets/paia-logo-{32 if size <= 32 else 64}.png'
        if record['outputs'][path]['source'] != expected_source:
            raise ValueError(f'{path}: unexpected source asset')

    if args.check:
        for path in output_paths:
            validate_png((ROOT / path).read_bytes(), record['outputs'][path], path)
        print('PASS: approved source and all four frozen extension icons match.')
        return

    import PIL
    from PIL import Image

    if PIL.__version__ != record['generation']['pillow_version']:
        raise ValueError(f"Regeneration requires Pillow {record['generation']['pillow_version']}; found {PIL.__version__}")
    outputs = {}
    for size, path in zip(SIZES, output_paths):
        source = source_bytes[record['outputs'][path]['source']]
        if size == 32:
            data = source  # Keep the approved default-size Desktop asset byte-exact.
        else:
            with Image.open(io.BytesIO(source)) as image:
                image = image.convert('RGB').resize((size, size), Image.Resampling.LANCZOS)
                encoded = io.BytesIO()
                image.save(encoded, format='PNG', optimize=False, compress_level=9)
                data = encoded.getvalue()
        validate_png(data, record['outputs'][path], path)
        outputs[path] = data
    # Validate every generated result before replacing any committed asset.
    for path, data in outputs.items():
        (ROOT / path).write_bytes(data)
    print('Wrote the four approved extension brand icons with matching hashes.')


if __name__ == '__main__':
    try:
        main()
    except (OSError, ValueError, KeyError, ImportError) as error:
        print(f'Brand icon verification failed: {error}', file=sys.stderr)
        sys.exit(1)

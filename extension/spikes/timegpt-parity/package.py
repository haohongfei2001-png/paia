#!/usr/bin/env python3
"""Explicit standalone allowlist; never packages Archive or existing exports."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import json
root = Path(__file__).resolve().parent
version = json.loads((root / 'manifest.json').read_text())['version']
files = ['manifest.json', 'contract.js', 'interceptor.js', 'dom-adapter.js', 'content.js',
         'README.md', 'PRODUCT_SPEC.md', 'PRIVACY.md', 'TEST_PLAN.md', 'COMPARISON.md', 'RESULTS.md']
target = root.parents[1] / 'outputs' / f'TimeGPT-Parity-Spike-v{version}.zip'
if target.exists():
    raise RuntimeError('Refusing to replace an existing delivery ZIP')
with ZipFile(target, 'w', ZIP_DEFLATED) as z:
    for name in files:
        path = root / name
        if path.is_symlink():
            raise RuntimeError('No symlinks in delivery')
        z.write(path, 'TimeGPT-Parity-Spike/' + name)
print(f'Packaged {len(files)} files: {target}')

#!/usr/bin/env python3
"""Package only reviewed extension assets and public docs, never user exports."""
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile
import json, os, shutil, subprocess
from package_assets import release_files

root = Path(__file__).resolve().parents[1]
node = os.environ.get('PAIA_NODE') or shutil.which('node')
if not node or subprocess.run([node, str(root/'scripts/compatibility-gate.mjs')]).returncode:
    raise SystemExit('Formal candidate blocked: real Chrome verification and current full test/audit report required')
version = json.loads((root / 'manifest.json').read_text())['version']
target = root / 'outputs' / f'Personal-AI-Input-Archive-v{version}.zip'
target.parent.mkdir(exist_ok=True)
files = release_files(root)
with ZipFile(target, 'w', ZIP_DEFLATED) as archive:
    for path in files:
        if path.is_symlink():
            raise RuntimeError('Do not package symbolic links')
        archive.write(path, Path('Personal-AI-Input-Archive') / path.relative_to(root))
print(f'Packaged {len(files)} files: {target.name}')

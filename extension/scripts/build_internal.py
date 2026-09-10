#!/usr/bin/env python3
"""Build an explicitly labeled internal candidate, without changing release sources."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import hashlib
import json
import os
import shutil
import subprocess
import sys

try:
    from .package_assets import release_files
except ImportError:
    from package_assets import release_files

ROOT = Path(__file__).resolve().parents[1]


def build_internal(source, target):
    source, target = Path(source).resolve(), Path(target).resolve()
    if target == source or target.is_relative_to(source / 'ui'):
        raise RuntimeError('Internal destination must be separate from release resources')
    files = release_files(source)
    target.mkdir(parents=True, exist_ok=True)
    if any(target.iterdir()):
        raise RuntimeError('Internal destination must be empty')
    for p in files:
        out = target / p.relative_to(source)
        out.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(p, out)
    popup = target / 'ui/popup.html'
    html = popup.read_text()
    if html.count('<html lang="zh-CN">') != 1 or html.count('</main>') != 1 or html.count('</head>') != 1:
        raise RuntimeError('Unexpected popup structure')
    html = html.replace('<html lang="zh-CN">', '<html lang="zh-CN" data-paia-development="reload-v1">')
    html = html.replace('</head>', '  <script src="development-reload.js" defer></script>\n</head>')
    html = html.replace('</main>', '''  <section aria-label="Development controls">
      <p class="subtle">Internal development build · 重载后请重新打开档案并刷新 ChatGPT 页面。</p>
      <button id="development-reload" class="secondary" type="button">Reload development extension</button>
    </section>
  </main>''')
    popup.write_text(html)
    shutil.copyfile(ROOT / 'development/reload/popup-reload.js', target / 'ui/development-reload.js')
    manifest_path = target / 'manifest.json'
    manifest = json.loads(manifest_path.read_text())
    manifest['version_name'] = manifest['version'] + ' internal development-reload'
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    return target


def main():
    node = os.environ.get('PAIA_NODE') or shutil.which('node')
    # This creates an internal candidate, never a formal release ZIP.
    check = "import {ready} from './scripts/compatibility-gate.mjs';await ready({requireRealChrome:false});"
    if not node or subprocess.run([node, '--input-type=module', '-e', check], cwd=ROOT).returncode:
        raise SystemExit('Internal candidate requires current full automatic tests and audit')
    version = json.loads((ROOT / 'manifest.json').read_text())['version']
    target = ROOT / 'outputs' / ('PAIA-v' + version + '-internal-candidate')
    build_internal(ROOT, target)
    archive = ROOT / 'outputs' / ('Personal-AI-Input-Archive-v' + version + '-internal-candidate.zip')
    with ZipFile(archive, 'w', ZIP_DEFLATED) as z:
        for p in sorted(target.rglob('*')):
            if p.is_file():
                z.write(p, Path(target.name) / p.relative_to(target))
    with ZipFile(archive) as z:
        for p in target.rglob('*'):
            if p.is_file():
                assert z.read(str(Path(target.name) / p.relative_to(target))) == p.read_bytes()
    digest = hashlib.sha256(archive.read_bytes()).hexdigest()
    archive.with_suffix('.zip.sha256').write_text(digest + '  ' + archive.name + '\n')
    print('INTERNAL_CANDIDATE_READY ' + archive.name)
    print('SHA256 ' + digest)


if __name__ == '__main__':
    main()

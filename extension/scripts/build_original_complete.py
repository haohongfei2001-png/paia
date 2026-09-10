"""Package the approved Original Organizer checkpoint; never runs or deploys it."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import hashlib
import json
import shutil
import subprocess
import sys
from build_internal import build_internal
from package_assets import release_files
import check_package

ROOT = Path(__file__).resolve().parents[1]
NAME = 'PAIA-v0.7.2b-original-organizer-complete'
LABEL = 'v0.7.2b Original Organizer Complete'

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def package(output):
    output = Path(output).resolve()
    if output == ROOT or any(output == ROOT / name for name in ('ui', 'core', 'background')):
        raise ValueError('Output must be an artifact directory')
    output.mkdir(parents=True, exist_ok=True)
    revision = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
    artifacts = []
    for kind in ('internal', 'release'):
        target = output / (NAME + '-' + kind)
        if target.exists():
            raise ValueError('Refuse to overwrite existing artifact: ' + str(target))
        if kind == 'internal':
            build_internal(ROOT, target)
        else:
            target.mkdir()
            for source in release_files(ROOT):
                dest = target / source.relative_to(ROOT)
                dest.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(source, dest)
        manifest_path = target / 'manifest.json'
        manifest = json.loads(manifest_path.read_text())
        manifest['version_name'] = LABEL + (' internal' if kind == 'internal' else '')
        manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
        if kind == 'release':
            page = target / 'ui/archive.html'
            page.write_text(page.read_text().replace(LABEL + ' internal', LABEL))
            check_package.ROOT = target
            check_package.ERRORS.clear()
            check_package.CHECKS = 0
            if check_package.main():
                raise RuntimeError('Release package audit failed')
        files = sorted(p for p in target.rglob('*') if p.is_file())
        assert not any(p.parts[-1].startswith('test') or 'fixtures' in p.parts or 'node_modules' in p.parts for p in files)
        assert (target / 'ui/development-reload.js').exists() == (kind == 'internal')
        for source in release_files(ROOT):
            relative = source.relative_to(ROOT)
            if str(relative) in ('manifest.json', 'ui/popup.html', 'ui/archive.html'):
                continue
            assert (target / relative).read_bytes() == source.read_bytes(), str(relative)
        hashes = {str(p.relative_to(target)): digest(p) for p in files}
        archive = Path(str(target) + '.zip')
        with ZipFile(archive, 'w', ZIP_DEFLATED) as zipfile:
            for p in files:
                zipfile.write(p, Path(target.name) / p.relative_to(target))
        with ZipFile(archive) as zipfile:
            assert zipfile.testzip() is None
            assert len(zipfile.namelist()) == len(files)
            for p in files:
                assert zipfile.read(str(Path(target.name) / p.relative_to(target))) == p.read_bytes()
        sha = digest(archive)
        Path(str(archive) + '.sha256').write_text(sha + '  ' + archive.name + '\n')
        artifacts.append({'kind':kind, 'directory':str(target), 'zip':str(archive), 'zipSha256':sha, 'files':hashes})
    report = {'checkpoint':revision, 'version':manifest['version'], 'artifacts':artifacts,
              'releaseScope':'Release structure only. Internal session credential prototype; not a public commercial credential architecture.'}
    (output / (NAME + '-artifacts.json')).write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({k:[{x:a[x] for x in ('kind','directory','zip','zipSha256')} for a in artifacts] for k in ['artifacts']},indent=2))

if __name__ == '__main__':
    if len(sys.argv) != 2:
        raise SystemExit('Usage: python3 scripts/build_original_complete.py OUTPUT_DIRECTORY')
    package(sys.argv[1])

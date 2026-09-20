#!/usr/bin/env python3
"""Build the current PAIA release from the GitHub working tree.

Unlike historical acceptance packagers, this command does not require archived
local `work/` receipts. Those receipts document past releases; current source
packaging is validated from the files that are actually emitted.
"""
from pathlib import Path
import fcntl
import hashlib
import json
import shutil
import sys

from build_daily_use import build_release
from package_assets import release_files
import check_package
from check_release_product import check_release

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = ROOT / 'work' / 'current-release'


def source_fingerprint():
    digest = hashlib.sha256()
    dependencies = [Path(__file__).resolve(), ROOT / 'scripts' / 'build_daily_use.py', ROOT / 'scripts' / 'package_assets.py']
    paths = sorted({path.resolve() for path in [*release_files(ROOT), *dependencies]}, key=lambda path: str(path.relative_to(ROOT)))
    for path in paths:
        relative = str(path.relative_to(ROOT)).encode('utf-8')
        digest.update(relative + b'\0' + path.read_bytes() + b'\0')
    return digest.hexdigest()


def audit_output(output):
    check_package.ROOT = output
    check_package.ERRORS.clear()
    check_package.CHECKS = 0
    if check_package.main() != 0:
        raise SystemExit('Current release failed package guardrails')
    check_release(output)


def summary(output, *, reused):
    manifest = json.loads((output / 'manifest.json').read_text(encoding='utf-8'))
    files = sum(1 for path in output.rglob('*') if path.is_file())
    return {
        'output': str(output),
        'version': manifest.get('version'),
        'versionName': manifest.get('version_name'),
        'files': files,
        'reused': reused,
    }


def main():
    output = Path(sys.argv[1]).expanduser().resolve() if len(sys.argv) > 1 else DEFAULT_OUTPUT.resolve()
    if output == ROOT or output.is_relative_to(ROOT / 'core') or output.is_relative_to(ROOT / 'ui'):
        raise SystemExit('Refusing unsafe release output path')
    output.parent.mkdir(parents=True, exist_ok=True)
    lock_path = output.parent / f'.{output.name}.lock'
    marker_path = output.parent / f'.{output.name}.source-fingerprint'
    fingerprint = source_fingerprint()

    with lock_path.open('a+', encoding='utf-8') as lock:
        fcntl.flock(lock.fileno(), fcntl.LOCK_EX)
        reusable = output.is_dir() and marker_path.is_file() and marker_path.read_text(encoding='utf-8').strip() == fingerprint
        if reusable:
            audit_output(output)
            print(json.dumps(summary(output, reused=True), ensure_ascii=False, indent=2))
            return

        marker_path.unlink(missing_ok=True)
        if output.exists():
            shutil.rmtree(output)
        try:
            build_release(ROOT, output)
            audit_output(output)
        except Exception:
            marker_path.unlink(missing_ok=True)
            raise
        marker_path.write_text(fingerprint + '\n', encoding='utf-8')
        print(json.dumps(summary(output, reused=False), ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()

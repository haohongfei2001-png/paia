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
import os
import sys
import tempfile

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


def output_fingerprint(output):
    """Include the emitted inventory, so source identity cannot bless extra files."""
    digest = hashlib.sha256()
    for path in sorted(output.rglob('*')):
        if path.is_symlink():
            return None
        if path.is_file():
            digest.update(str(path.relative_to(output)).encode('utf-8') + b'\0')
            digest.update(path.read_bytes() + b'\0')
    return digest.hexdigest()


def preserve_output(output):
    # A mutated cache may contain files we did not write. Preserve it in full;
    # never delete it to recover a generated release.
    previous = Path(tempfile.mkdtemp(prefix=f'.{output.name}.preserved-', dir=output.parent))
    os.replace(output, previous / output.name)
    return previous / output.name


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
    requested = Path(sys.argv[1]).expanduser() if len(sys.argv) > 1 else DEFAULT_OUTPUT
    if requested.is_symlink():
        raise SystemExit('Refusing symlink release output')
    output = requested.resolve()
    if ROOT.is_relative_to(output) or (output.is_relative_to(ROOT) and not output.is_relative_to(ROOT / 'work')):
        raise SystemExit('Refusing unsafe release output path')
    if output.exists() and not output.is_dir():
        raise SystemExit('Refusing non-directory release output')
    output.parent.mkdir(parents=True, exist_ok=True)
    lock_path = output.parent / f'.{output.name}.lock'
    marker_path = output.parent / f'.{output.name}.source-fingerprint'
    inventory_path = output.parent / f'.{output.name}.output-fingerprint'
    with lock_path.open('a+', encoding='utf-8') as lock:
        fcntl.flock(lock.fileno(), fcntl.LOCK_EX)
        fingerprint = source_fingerprint()
        reusable = (output.is_dir() and not output.is_symlink() and marker_path.is_file()
                    and marker_path.read_text(encoding='utf-8').strip() == fingerprint
                    and inventory_path.is_file()
                    and inventory_path.read_text(encoding='utf-8').strip() == output_fingerprint(output))
        if reusable:
            audit_output(output)
            if source_fingerprint() != fingerprint or output_fingerprint(output) != inventory_path.read_text(encoding='utf-8').strip():
                raise SystemExit('Source or output changed during release audit; retry after edits settle')
            print(json.dumps(summary(output, reused=True), ensure_ascii=False, indent=2))
            return

        if output.is_symlink():
            raise SystemExit('Refusing symlink release output')
        stage = Path(tempfile.mkdtemp(prefix=f'.{output.name}.building-', dir=output.parent))
        try:
            build_release(ROOT, stage)
            audit_output(stage)
            emitted = output_fingerprint(stage)
            if emitted is None:
                raise SystemExit('Refusing symlink release asset')
            if source_fingerprint() != fingerprint:
                raise SystemExit('Source changed during release build; retry after edits settle')
            if output.exists():
                print('Preserved previous release: ' + str(preserve_output(output)), file=sys.stderr)
            os.replace(stage, output)
        except BaseException:
            print('Unpublished build retained: ' + str(stage), file=sys.stderr)
            raise
        marker_path.write_text(fingerprint + '\n', encoding='utf-8')
        inventory_path.write_text(emitted + '\n', encoding='utf-8')
        print(json.dumps(summary(output, reused=False), ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()

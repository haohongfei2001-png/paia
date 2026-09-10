#!/usr/bin/env python3
"""Build the current PAIA release from the GitHub working tree.

Unlike historical acceptance packagers, this command does not require archived
local `work/` receipts. Those receipts document past releases; current source
packaging is validated from the files that are actually emitted.
"""
from pathlib import Path
import json
import shutil
import sys

from build_daily_use import build_release
import check_package
from check_release_product import check_release

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = ROOT / 'work' / 'current-release'


def main():
    output = Path(sys.argv[1]).expanduser().resolve() if len(sys.argv) > 1 else DEFAULT_OUTPUT.resolve()
    if output == ROOT or output.is_relative_to(ROOT / 'core') or output.is_relative_to(ROOT / 'ui'):
        raise SystemExit('Refusing unsafe release output path')
    if output.exists():
        shutil.rmtree(output)
    output.parent.mkdir(parents=True, exist_ok=True)

    build_release(ROOT, output)

    check_package.ROOT = output
    check_package.ERRORS.clear()
    check_package.CHECKS = 0
    if check_package.main() != 0:
        raise SystemExit('Current release failed package guardrails')
    check_release(output)

    manifest = json.loads((output / 'manifest.json').read_text(encoding='utf-8'))
    files = sum(1 for path in output.rglob('*') if path.is_file())
    print(json.dumps({
        'output': str(output),
        'version': manifest.get('version'),
        'versionName': manifest.get('version_name'),
        'files': files,
    }, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()

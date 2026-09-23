#!/usr/bin/env python3
"""Conservative package-to-package preflight before a PAIA consumer update.

This checks declared package compatibility and the actual installed/candidate
extension IDs supplied by the caller. It never installs, publishes or touches
user data. A successful result does not replace browser migration or backup
certification for a changed storage model.
"""
import argparse
import json
import re
import sys
from pathlib import Path

SCHEMA_FILES = (
    'core/idb-repository.js',
    'core/backup-format.js',
    'core/recovery-draft.js',
)
ID_PATTERN = re.compile(r'[a-p]{32}\Z')
VERSION_PATTERN = re.compile(r'(?:0|[1-9]\d*)(?:\.(?:0|[1-9]\d*)){0,3}\Z')


def version(value):
    if not isinstance(value, str) or not VERSION_PATTERN.fullmatch(value):
        raise ValueError('Invalid Chrome extension version.')
    parts = tuple(map(int, value.split('.')))
    return parts + (0,) * (4 - len(parts))


def read_manifest(directory):
    root = Path(directory).resolve()
    manifest = json.loads((root / 'manifest.json').read_text(encoding='utf-8'))
    if manifest.get('manifest_version') != 3:
        raise ValueError('Only Manifest V3 packages are supported.')
    return root, manifest


def package_files(root):
    files = {}
    for path in root.rglob('*'):
        if path.is_symlink():
            raise ValueError('Audited packages cannot contain symlinks.')
        if path.is_file():
            files[str(path.relative_to(root))] = path
    return files


def preflight(previous, candidate, installed_id, candidate_id):
    old_root, old = read_manifest(previous)
    new_root, new = read_manifest(candidate)
    if not ID_PATTERN.fullmatch(installed_id) or not ID_PATTERN.fullmatch(candidate_id):
        raise ValueError('Both extension IDs must be actual 32-character Chrome IDs.')
    if installed_id != candidate_id:
        raise ValueError('Extension ID changed: local archive cannot be assumed to follow this update.')
    if version(new.get('version')) <= version(old.get('version')):
        raise ValueError('Candidate version must increase strictly.')
    for field in ('name', 'permissions', 'optional_permissions', 'host_permissions',
                  'content_security_policy', 'incognito', 'content_scripts'):
        if old.get(field) != new.get(field):
            raise ValueError(f'{field} changed; this bounded update preflight cannot certify it.')
    if old.get('key') and old.get('key') != new.get('key'):
        raise ValueError('Manifest public key changed; identity needs separate review.')
    if version(new.get('minimum_chrome_version', '0')) > version(old.get('minimum_chrome_version', '0')):
        raise ValueError('Minimum Chrome version rose; existing users may silently stop receiving updates.')
    old_core = {str(path.relative_to(old_root)) for path in (old_root / 'core').rglob('*') if path.is_file()}
    new_core = {str(path.relative_to(new_root)) for path in (new_root / 'core').rglob('*') if path.is_file()}
    if old_core != new_core:
        raise ValueError('Core runtime file set changed; run migration and recovery certification before update.')
    if not set(SCHEMA_FILES).issubset(old_core):
        raise ValueError('Required storage and recovery contract files are missing from both packages.')
    for relative in sorted(old_core):
        if (old_root / relative).read_bytes() != (new_root / relative).read_bytes():
            raise ValueError(f'{relative} changed; run migration and recovery certification before update.')
    return {'result': 'PACKAGE_PREFLIGHT_PASS', 'from': old['version'], 'to': new['version'],
            'identity': installed_id, 'core_runtime': 'byte_for_byte_unchanged',
            'browser_migration': 'NOT_CERTIFIED', 'publication': 'NOT_PERFORMED'}


def preflight_recovery(current, known_good, reissued, installed_id, candidate_id):
    """Validate a prior audited package reissued at a higher Chrome version.

    This only proves package/data compatibility. The caller still needs an
    authorized same-ID distribution channel and browser certification.
    """
    current_root, current_manifest = read_manifest(current)
    good_root, good_manifest = read_manifest(known_good)
    reissued_root, reissued_manifest = read_manifest(reissued)
    if version(good_manifest.get('version')) >= version(current_manifest.get('version')):
        raise ValueError('Known-good recovery package must precede the current version.')
    good_without_version = {key: value for key, value in good_manifest.items() if key != 'version'}
    reissued_without_version = {key: value for key, value in reissued_manifest.items() if key != 'version'}
    if good_without_version != reissued_without_version:
        raise ValueError('Reissued package manifest differs from known-good code beyond version.')
    good_files = package_files(good_root)
    reissued_files = package_files(reissued_root)
    if good_files.keys() != reissued_files.keys():
        raise ValueError('Reissued package file set differs from known-good code.')
    for relative in sorted(good_files.keys() - {'manifest.json'}):
        if good_files[relative].read_bytes() != reissued_files[relative].read_bytes():
            raise ValueError(f'Reissued package changed known-good file: {relative}.')
    result = preflight(current_root, reissued_root, installed_id, candidate_id)
    return {**result, 'result': 'RECOVERY_PREFLIGHT_PASS',
            'known_good_version': good_manifest['version'],
            'reissued_code': 'byte_for_byte_known_good_except_manifest_version',
            'rollback_installed': 'NOT_PERFORMED'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--previous', required=True, help='previous audited release package directory')
    parser.add_argument('--candidate', required=True, help='candidate audited release package directory')
    parser.add_argument('--installed-id', required=True, help='ID read from the existing installed extension')
    parser.add_argument('--candidate-id', required=True, help='ID read from the candidate installed extension')
    parser.add_argument('--known-good', help='prior audited package reissued as a compatible higher-version recovery candidate')
    args = parser.parse_args()
    try:
        result = (preflight_recovery(args.previous, args.known_good, args.candidate, args.installed_id, args.candidate_id)
                  if args.known_good else preflight(args.previous, args.candidate, args.installed_id, args.candidate_id))
        print(json.dumps(result, ensure_ascii=False))
    except (ValueError, OSError, json.JSONDecodeError) as error:
        print(f'PACKAGE_PREFLIGHT_BLOCKED: {error}', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

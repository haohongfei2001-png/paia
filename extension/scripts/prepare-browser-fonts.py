#!/usr/bin/env python3
"""Optional deb-byte cache; native APT still resolves, authenticates and installs.

Only plan/install are callable. Cache metadata is never an authority. A fresh
signed index and the native resolver determine the exact archive set each run.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shlex
import shutil
import stat
import subprocess
from urllib.parse import unquote, urlsplit

PACKAGES = ['fonts-wqy-zenhei', 'fonts-noto-cjk']
POLICY = 'paia-browser-font-debs-v1'


def run(args):
    return subprocess.check_output(args, text=True, env={**os.environ, 'LC_ALL': 'C'})


def records(text):
    for block in text.strip().split('\n\n'):
        fields = {}
        for line in block.splitlines():
            if line and not line[0].isspace() and ': ' in line:
                key, value = line.split(': ', 1)
                fields[key] = value
        yield fields


def apt_options(state):
    return [part for option in [
        'Dir::State::lists='+str(state/'lists'),
        'Dir::Cache::archives='+str(state/'archives'),
        'Dir::Cache::pkgcache=', 'Dir::Cache::srcpkgcache=',
        'APT::Update::Error-Mode=any', 'APT::Get::AllowUnauthenticated=false',
        'Acquire::AllowInsecureRepositories=false',
        'Acquire::AllowDowngradeToInsecureRepositories=false',
        'Acquire::Retries=0',
    ] for part in ['-o', option]]


def identity():
    image = {key: os.environ[key] for key in ['ImageOS', 'ImageVersion']}
    if not all(image.values()):
        raise ValueError('Hosted image identity missing')
    return {**image, 'os': Path('/etc/os-release').read_text(),
            'architecture': run(['dpkg', '--print-architecture']).strip()}


def resolve_archives(uris, available, architecture):
    metadata = list(records(available))
    result = []
    for line in uris.splitlines():
        if not line.startswith("'"):
            continue
        parts = shlex.split(line)
        if len(parts) != 4:
            raise ValueError('Unexpected native APT URI record')
        uri, filename, size, _native_hash = parts
        if (not re.fullmatch(r'[A-Za-z0-9%+._:~-]+\.deb', filename)
                or filename.startswith('.') or urlsplit(uri).scheme not in ['https', 'http']):
            raise ValueError('Unsafe native archive locator')
        matches = []
        for row in metadata:
            if row.get('Filename') and unquote(urlsplit(uri).path).endswith('/'+unquote(row['Filename'])):
                value = {key: row.get(key) for key in ['Package', 'Version', 'Architecture', 'Size', 'SHA256']}
                if value not in matches:
                    matches.append(value)
        if len(matches) != 1:
            raise ValueError('Native archive lacks unique current signed metadata')
        row = matches[0]
        if (row['Architecture'] not in [architecture, 'all'] or not row['Package'] or not row['Version']
                or row['Size'] != size or not re.fullmatch(r'[a-fA-F0-9]{64}', row['SHA256'] or '')):
            raise ValueError('Invalid signed archive metadata')
        result.append({'filename': filename, 'uri': uri, **row, 'Size': int(size)})
    if len({row['filename'] for row in result}) != len(result):
        raise ValueError('Duplicate native archive filename')
    return sorted(result, key=lambda row: row['filename'])


def key_for(plan):
    return POLICY+'-'+hashlib.sha256(json.dumps(plan, sort_keys=True, separators=(',', ':')).encode()).hexdigest()


def output(**values):
    path = os.environ.get('GITHUB_OUTPUT')
    if path:
        with open(path, 'a') as handle:
            for key, value in values.items():
                handle.write(f'{key}={value}\n')


def plan(state):
    # Never reuse stale lists or cache-generated metadata, including after failure.
    state.mkdir(parents=True, exist_ok=False)
    for name in ['lists', 'archives']:
        (state/name).mkdir()
    options = apt_options(state)
    print(run(['sudo', 'apt-get', *options, 'update']), end='')
    uris = run(['sudo', 'apt-get', *options, '--print-uris', '--download-only', '-y',
                '--no-install-recommends', 'install', *PACKAGES])
    available = run(['apt-cache', *options, 'dumpavail'])
    host = identity()
    value = {'policy': POLICY, 'requested': PACKAGES, 'host': host,
             'archives': resolve_archives(uris, available, host['architecture'])}
    (state/'plan.json').write_text(json.dumps(value, indent=2)+'\n')
    (state/'resolver.txt').write_text(uris)
    output(key=key_for(value), count=len(value['archives']))
    return value


def verify(directory, archives, *, apt_owned=False):
    if directory.is_symlink() or not directory.is_dir():
        raise ValueError('Archive directory missing or symbolic')
    expected = {row['filename'] for row in archives}
    names = {path.name for path in directory.iterdir()}
    if apt_owned:
        names -= {'lock', 'partial'}  # native APT files, never accepted in a cache
    if names != expected:
        raise ValueError('Missing or extra archive')
    for row in archives:
        path = directory/row['filename']
        info = path.lstat()
        if not stat.S_ISREG(info.st_mode) or info.st_nlink != 1 or info.st_size != row['Size']:
            raise ValueError('Archive type/link/size mismatch')
        with path.open('rb') as handle:
            digest = hashlib.file_digest(handle, 'sha256').hexdigest()
        if digest.lower() != row['SHA256'].lower():
            raise ValueError('Archive hash mismatch')
        control = next(records(run(['dpkg-deb', '--field', str(path)])))
        if any(control.get(key) != row[key] for key in ['Package', 'Version', 'Architecture']):
            raise ValueError('Archive package/version/architecture mismatch')


def copy_archives(source, target, archives):
    target.mkdir(parents=True, exist_ok=True)
    for row in archives:
        # Target is our fresh staging directory, never a system cache directory.
        with (target/row['filename']).open('xb') as dest, (source/row['filename']).open('rb') as src:
            shutil.copyfileobj(src, dest)


def install(state, cache, matched_key):
    value = json.loads((state/'plan.json').read_text())
    if value['policy'] != POLICY or value['requested'] != PACKAGES or value['host'] != identity():
        raise ValueError('Prepared image or policy changed')
    archives, staging = value['archives'], state/'archives'
    hit, cache_ready = False, False
    safe_cache_parent = not cache.parent.is_symlink()
    if archives and safe_cache_parent and matched_key == key_for(value):
        try:
            verify(cache, archives)
            copy_archives(cache, staging, archives)
            verify(staging, archives, apt_owned=True)
            hit = True
        except (OSError, ValueError, subprocess.SubprocessError) as error:
            print('Font byte cache miss:', error)
    if archives and not hit:
        # Exactly one original signed acquisition; failures are fatal, no loop.
        print(run(['sudo', 'apt-get', *apt_options(state), '--download-only', '-y',
                   '--no-install-recommends', 'install', *PACKAGES]), end='')
        verify(staging, archives, apt_owned=True)
    # Prepare only verified bytes for a possible trusted-main save. Same path for
    # restore/save (cache versions include path); retain a bad local restore as
    # evidence, never delete/overwrite an existing remote cache entry.
    if archives and not hit and safe_cache_parent:
        try:
            if cache.exists() or cache.is_symlink():
                cache.rename(state/'rejected-cache')
            copy_archives(staging, cache, archives)
            verify(cache, archives)
            cache_ready = True
        except (OSError, ValueError, subprocess.SubprocessError) as error:
            print('Optional font cache save preparation unavailable:', error)
    # Native APT rechecks dependencies/authentication; no network or fallback on
    # installation/configuration failure. Even a zero-download plan installs.
    print(run(['sudo', 'apt-get', *apt_options(state), '--no-download', '-y',
               '--no-install-recommends', 'install', *PACKAGES]), end='')
    output(cache_ready=str(cache_ready).lower(), cache_hit=str(hit).lower())
    return hit


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('phase', choices=['plan', 'install'])
    parser.add_argument('--state', required=True, type=Path)
    parser.add_argument('--cache', type=Path)
    args = parser.parse_args()
    state = args.state.absolute()
    if args.phase == 'plan':
        plan(state)
    else:
        if not args.cache:
            parser.error('install requires --cache')
        install(state, args.cache.absolute(), os.environ.get('PAIA_FONT_CACHE_MATCHED_KEY', ''))

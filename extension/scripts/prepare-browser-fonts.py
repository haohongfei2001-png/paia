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
POLICY = 'paia-browser-font-debs-v2'


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
        'Acquire::AllowWeakRepositories=false',
        'Acquire::AllowDowngradeToInsecureRepositories=false',
        'Acquire::ForceHash=SHA256', 'Acquire::Check-Date=true',
        'Acquire::Check-Valid-Until=true',
        'Acquire::Retries=0',
    ] for part in ['-o', option]]


def checked_configuration(dump, sources):
    """Reject unsupported inherited trust overrides; never repair host config."""
    values, entries = {}, []
    for line in dump.splitlines():
        match = re.fullmatch(r'([^\s]+) "(.*)";', line)
        if not match or match[1] in values and not match[1].endswith('::'):
            raise ValueError('Unsupported APT configuration encoding')
        values[match[1]] = match[2]
        entries.append((match[1], match[2]))
    defaults = {'Dir': '/', 'Dir::Etc': 'etc/apt',
                'Dir::Etc::sourcelist': 'sources.list', 'Dir::Etc::sourceparts': 'sources.list.d',
                'Dir::Etc::trusted': 'trusted.gpg', 'Dir::Etc::trustedparts': 'trusted.gpg.d'}
    for key, value in defaults.items():
        if values.get(key) != value:
            raise ValueError('Unsupported APT source/trust configuration path')
    deny_true = {'trusted', 'allow-insecure', 'allow-weak', 'allow-downgrade-to-insecure',
                 'allowunauthenticated', 'allowinsecurerepositories', 'allowweakrepositories',
                 'allowdowngradetoinsecurerepositories'}
    require_true = {'check-date', 'check-valid-until', 'verify-peer', 'verify-host'}
    for key, value in entries:
        lower, segments = key.lower(), set(key.lower().split('::'))
        if lower.startswith(('binary::apt-get::', 'binary::apt-cache::', 'apt::key::', 'apt::gpgv::', 'gpgv::', 'acquire::gpgv::')):
            raise ValueError('Unsupported command-specific or signature override')
        if not lower.startswith('dir::') and segments & deny_true and value.lower() not in ['false', 'no', '0', '']:
            raise ValueError('Insecure APT trust override')
        if segments & require_true and value.lower() not in ['true', 'yes', '1', '']:
            raise ValueError('Disabled APT validity verification')
        if 'forcehash' in segments and value not in ['SHA256', '']:
            raise ValueError('Weak APT hash override')
        if ('min-validtime' in segments and value not in ['0', '']) or ('max-futuretime' in segments and value not in ['0', '10', '']):
            raise ValueError('Unsupported APT validity extension')
    for name, content in sources.items():
        if name.endswith('.list'):
            for line in content.splitlines():
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                match = re.fullmatch(r'deb(?:-src)?\s+(?:\[([^\]]*)\]\s+)?(\S+)\s+.+', line)
                if not match:
                    raise ValueError('Unsupported one-line APT source')
                for option in (match[1] or '').split():
                    key, sep, value = option.partition('=')
                    if not sep or not value or key not in ['arch', 'arch+', 'arch-', 'signed-by']:
                        raise ValueError('Unsupported APT source option')
                if urlsplit(match[2]).scheme not in ['http', 'https'] or urlsplit(match[2]).username:
                    raise ValueError('Unsupported APT source URI')
        else:
            # Deb822 continuation lines (including inline Signed-By keys) cannot
            # introduce another field. Unknown fields are refused, not ignored.
            allowed = {'Types', 'URIs', 'Suites', 'Components', 'Architectures',
                       'Architectures-Add', 'Architectures-Remove', 'Signed-By', 'Enabled'}
            for block in content.strip().split('\n\n'):
                seen = set()
                for line in block.splitlines():
                    if not line or line.startswith('#') or line[0].isspace():
                        continue
                    key, sep, value = line.partition(':')
                    if not sep or key not in allowed or key in seen:
                        raise ValueError('Unsupported Deb822 source field')
                    seen.add(key)
                    if key == 'URIs' and any(urlsplit(uri).scheme not in ['http', 'https'] or urlsplit(uri).username for uri in value.split()):
                        raise ValueError('Unsupported APT source URI')
    return hashlib.sha256(json.dumps({'config': entries, 'sources': sources}, sort_keys=True).encode()).hexdigest()


def source_files():
    directory = Path('/etc/apt')
    files = [directory/'sources.list', *(directory/'sources.list.d').glob('*.list'),
             *(directory/'sources.list.d').glob('*.sources')]
    sources = {str(path): path.read_text() for path in files if path.exists()}
    if not sources:
        raise ValueError('No supported APT sources')
    return sources


def configuration(state):
    if os.environ.get('APT_CONFIG'):
        raise ValueError('APT_CONFIG override is unsupported')
    options = apt_options(state)
    user = run(['apt-config', *options, 'dump'])
    root = run(['sudo', 'apt-config', *options, 'dump'])
    if user != root:
        raise ValueError('APT user/root configuration differs')
    return checked_configuration(root, source_files())


def checked_state(state):
    root = Path(os.environ['RUNNER_TEMP']).resolve(strict=True)
    if state.is_symlink() or state.parent.resolve(strict=True) != root:
        raise ValueError('Font state must be a direct job-temp child')


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
        uri, filename, size, native_hash = parts
        if not re.fullmatch(r'SHA256:[a-fA-F0-9]{64}', native_hash):
            raise ValueError('Native resolver lacks strong SHA256')
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
                or row['Size'] != size or not re.fullmatch(r'[a-fA-F0-9]{64}', row['SHA256'] or '')
                or row['SHA256'].lower() != native_hash[7:].lower()):
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
    checked_state(state)
    state.mkdir(parents=True, exist_ok=False)
    for name in ['lists', 'archives']:
        (state/name).mkdir()
    options = apt_options(state)
    config = configuration(state)
    print(run(['sudo', 'apt-get', *options, 'update']), end='')
    uris = run(['sudo', 'apt-get', *options, '--print-uris', '--download-only', '-y',
                '--no-install-recommends', 'install', *PACKAGES])
    available = run(['sudo', 'apt-cache', *options, 'dumpavail'])
    host = identity()
    if configuration(state) != config:
        raise ValueError('APT configuration changed while resolving')
    value = {'policy': POLICY, 'requested': PACKAGES, 'host': host, 'configuration': config,
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
    checked_state(state)
    value = json.loads((state/'plan.json').read_text())
    if (value['policy'] != POLICY or value['requested'] != PACKAGES or value['host'] != identity()
            or value['configuration'] != configuration(state)):
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
        # APT may reuse same-size files. Preserve any rejected job-local staging
        # bytes and acquire into a new directory; never touch system archives.
        if staging.is_symlink() or not staging.is_dir() or state.is_symlink():
            raise ValueError('Unsafe job-local APT staging')
        staging.rename(state/'rejected-archives')
        staging.mkdir()
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

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
POLICY = 'paia-browser-font-debs-v3'


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


# Reviewed native defaults: APT 2.8.1 pkgInitConfig, Ubuntu24 runner source.
# Unknown algorithm policies stay unsupported; no generic APT::Key permission.
KEY_DEFAULTS = {
    'apt::key::assert-pubkey-algo': '>=rsa2048,ed25519,ed448,nistp256,nistp384,nistp512,brainpoolP256r1,brainpoolP320r1,brainpoolP384r1,brainpoolP512r1,secp256k1',
    'apt::key::assert-pubkey-algo::next': '>=rsa2048,ed25519,ed448,nistp256,nistp384,nistp512',
    'apt::key::assert-pubkey-algo::future': '>=rsa3072,ed25519,ed448',
}
MIRROR_PATH = '/etc/apt/apt-mirrors.txt'
MIRROR_URI = 'mirror+file:'+MIRROR_PATH


def remote_uri(uri):
    parsed = urlsplit(uri)
    if (parsed.scheme not in ['http', 'https'] or not parsed.hostname
            or parsed.username is not None or parsed.password is not None
            or '%' in parsed.netloc or parsed.fragment or parsed.query or '\\' in uri
            or any(c.isspace() or ord(c) < 32 for c in uri)):
        raise ValueError('Unsupported APT source URI')
    return parsed


def checked_mirror(content):
    found = False
    for raw in content.splitlines():
        line = raw.strip()
        if not line or line.startswith('#'):
            continue
        # Native mirror files separate optional tags with whitespace. Only the
        # runner's existing priority tag is supported, never a new route.
        uri, *tags = line.split()
        remote_uri(uri)
        if len(tags) > 1 or any(not re.fullmatch(r'priority:[1-9][0-9]{0,9}', tag)
                               or int(tag.split(':')[1]) > 4294967295 for tag in tags):
            raise ValueError('Unsupported mirror label')
        found = True
    if not found:
        raise ValueError('Empty mirror manifest')


def checked_uri(uri, sources, *, archive=False):
    if any(c.isspace() or ord(c) < 32 for c in uri):
        raise ValueError('Invalid URI whitespace')
    if urlsplit(uri).scheme != 'mirror+file':
        return remote_uri(uri)
    suffix = uri[len(MIRROR_URI):] if uri.startswith(MIRROR_URI) else None
    if suffix is None or (suffix != '' and not archive):
        raise ValueError('Unsupported mirror manifest path')
    if archive and (not suffix or not suffix.startswith('/')
                    or any(part in ['', '.', '..'] for part in unquote(suffix)[1:].split('/'))
                    or '?' in uri or '#' in uri or '\\' in uri):
        raise ValueError('Unsafe mirror archive path')
    if MIRROR_PATH not in sources:
        raise ValueError('Mirror manifest was not audited')
    checked_mirror(sources[MIRROR_PATH])
    return urlsplit(uri)


def deb822(text):
    fields, key = {}, None
    for raw in [*text.splitlines(), '']:
        if not raw.strip():
            if fields:
                yield fields
            fields, key = {}, None
        elif raw.lstrip().startswith('#'):
            continue
        elif raw[0].isspace():
            if key is None:
                raise ValueError('Orphan Deb822 continuation')
            fields[key] += '\n'+raw.strip()
        else:
            key, sep, value = raw.partition(':')
            key = key.lower()
            if not sep or key in fields:
                raise ValueError('Unsupported Deb822 source field')
            fields[key] = value.strip()


def signed_by(value):
    # APT performs key authentication. Here validate complete field syntax;
    # never skip continuation bytes that could carry another effective token.
    lines = value.splitlines()
    if lines and lines[0] == '-----BEGIN PGP PUBLIC KEY BLOCK-----':
        if len(lines) < 3 or lines[-1] != '-----END PGP PUBLIC KEY BLOCK-----' or any(
                not re.fullmatch(r'[A-Za-z0-9+/=]+|\.', line) for line in lines[1:-1]):
            raise ValueError('Unsupported inline signing key')
    elif not value.split() or any(not (re.fullmatch(r'/[A-Za-z0-9_./+-]+', token)
                                      and '..' not in token.split('/')
                                      or re.fullmatch(r'[a-fA-F0-9]{40}!?', token)) for token in value.split()):
        raise ValueError('Unsupported Signed-By token')


def checked_configuration(dump, sources):
    """Reject unsupported inherited trust overrides; never repair host config."""
    values, entries = {}, []
    for line in dump.splitlines():
        match = re.fullmatch(r'([^\s]+) "(.*)";', line)
        if not match:
            raise ValueError('Unsupported APT configuration encoding')
        key, value = unquote(match[1]).lower(), unquote(match[2])
        if key in values and not key.endswith('::'):
            raise ValueError('Duplicate APT configuration key')
        values[key] = value
        entries.append((key, value))
    defaults = {'dir': '/', 'dir::etc': 'etc/apt',
                'dir::etc::sourcelist': 'sources.list', 'dir::etc::sourceparts': 'sources.list.d',
                'dir::etc::trusted': 'trusted.gpg', 'dir::etc::trustedparts': 'trusted.gpg.d',
                'dir::etc::main': 'apt.conf', 'dir::etc::parts': 'apt.conf.d'}
    for key, value in defaults.items():
        if values.get(key) != value:
            raise ValueError('Unsupported APT source/trust configuration path')
    if values.get('rootdir', '') not in ['', '/']:
        raise ValueError('Unsupported APT RootDir')
    deny_true = {'trusted', 'allow-insecure', 'allow-weak', 'allow-downgrade-to-insecure',
                 'allowunauthenticated', 'allowinsecurerepositories', 'allowweakrepositories',
                 'allowdowngradetoinsecurerepositories'}
    require_true = {'check-date', 'check-valid-until', 'verify-peer', 'verify-host'}
    for key, value in entries:
        segments = set(key.split('::'))
        if key in KEY_DEFAULTS:
            if value != KEY_DEFAULTS[key]:
                raise ValueError('Unsupported public-key algorithm policy')
            continue
        if key == 'apt::key':
            if value != '':
                raise ValueError('Unsupported key namespace value')
            continue
        if key.startswith(('binary::apt-get::', 'binary::apt-cache::', 'binary::apt-config::',
                           'apt::key::', 'apt::gpgv::', 'gpgv::', 'acquire::gpgv::')):
            raise ValueError('Unsupported command-specific or signature override')
        if not key.startswith('dir::') and segments & deny_true and value.lower() not in ['false', 'no', '0', '']:
            raise ValueError('Insecure APT trust override')
        if segments & require_true and value.lower() not in ['true', 'yes', '1', '']:
            raise ValueError('Disabled APT validity verification')
        if 'forcehash' in segments and value not in ['SHA256', '']:
            raise ValueError('Weak APT hash override')
        if ('min-validtime' in segments and value not in ['0', '']) or ('max-futuretime' in segments and value not in ['0', '10', '']):
            raise ValueError('Unsupported APT validity extension')
    for name, content in sources.items():
        if name == MIRROR_PATH:
            checked_mirror(content)
        elif name.endswith('.list'):
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
                    if key == 'signed-by':
                        signed_by(value.replace(',', ' '))
                checked_uri(match[2], sources)
        elif name.endswith('.sources'):
            allowed = {'types', 'uris', 'suites', 'components', 'architectures',
                       'architectures-add', 'architectures-remove', 'signed-by', 'enabled'}
            for fields in deb822(content):
                if not fields.keys() <= allowed or not {'types', 'uris', 'suites'} <= fields.keys():
                    raise ValueError('Unsupported Deb822 source field')
                if not fields['uris'].split():
                    raise ValueError('Empty Deb822 URIs')
                for uri in fields['uris'].split():
                    checked_uri(uri, sources)
                if 'signed-by' in fields:
                    signed_by(fields['signed-by'])
        else:
            raise ValueError('Unsupported source file')
    return hashlib.sha256(json.dumps({'config': entries, 'sources': sources}, sort_keys=True).encode()).hexdigest()


def read_regular(path):
    # Fixed root-owned paths only. Refuse links at every component, including
    # parent escapes, and validate the opened descriptor rather than stat alone.
    if not path.is_absolute() or path.resolve(strict=True) != path:
        raise ValueError('Symbolic or escaped APT configuration file')
    before = path.lstat()
    if not stat.S_ISREG(before.st_mode):
        raise ValueError('Unsupported APT configuration file type')
    with os.fdopen(os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK), 'rb') as handle:
        info = os.fstat(handle.fileno())
        if (not stat.S_ISREG(info.st_mode) or info.st_nlink != 1
                or (info.st_dev, info.st_ino) != (before.st_dev, before.st_ino)):
            raise ValueError('Unsupported APT configuration file type')
        return handle.read().decode('utf-8')


def source_files():
    directory = Path('/etc/apt')
    files = [directory/'sources.list', *(directory/'sources.list.d').glob('*.list'),
             *(directory/'sources.list.d').glob('*.sources')]
    sources = {str(path): read_regular(path) for path in sorted(files) if path.exists() or path.is_symlink()}
    if not sources:
        raise ValueError('No supported APT sources')
    if any('mirror+file:' in content for content in sources.values()):
        sources[MIRROR_PATH] = read_regular(Path(MIRROR_PATH))
    return sources


def configuration_files():
    directory = Path('/etc/apt')
    parts = directory/'apt.conf.d'
    if parts.resolve(strict=True) != parts:
        raise ValueError('Symbolic APT configuration directory')
    paths = [directory/'apt.conf', *sorted(parts.iterdir())]
    # Audit the complete fixed directory conservatively, including ignored
    # fragments. Unknown includes/clears or command overrides are unsupported.
    return {str(path): read_regular(path) for path in paths if path.exists() or path.is_symlink()}


def checked_fragments(fragments):
    for content in fragments.values():
        # Preserve quoted tokens while ignoring native C/C++ comments. A word
        # such as "binary" in a comment must not reject an otherwise safe host.
        tokens = re.findall(r'"(?:[^"\\]|\\.)*"|/\*.*?\*/|//[^\n]*|[^\s{};"/]+|/', content, re.DOTALL)
        active = [token.strip('"').lower() for token in tokens
                  if not token.startswith(('//', '/*'))]
        if any('\\' in token or token == 'binary' or token.startswith('binary::')
               or token.startswith('#') for token in active):
            raise ValueError('Unsupported command-specific APT fragment or include')
    return fragments


def configuration(state):
    if os.environ.get('APT_CONFIG'):
        raise ValueError('APT_CONFIG override is unsupported')
    fragments = checked_fragments(configuration_files())
    options = apt_options(state)
    # Force full dump formatting: inherited apt-config formatting cannot hide
    # command-specific keys. Original fragments above guard the apt-config
    # subtree that native BinarySpecificConfiguration moves before dumping.
    dump_options = ['-o', 'APT::Config::Dump::EmptyValue=true', '-o',
                    'APT::Config::Dump::Format=%F "%V";%n']
    user = run(['apt-config', *options, *dump_options, 'dump'])
    root = run(['sudo', 'apt-config', *options, *dump_options, 'dump'])
    if user != root:
        raise ValueError('APT user/root configuration differs')
    digest = checked_configuration(root, source_files())
    if checked_fragments(configuration_files()) != fragments:
        raise ValueError('APT fragments changed during audit')
    return hashlib.sha256(json.dumps([digest, fragments], sort_keys=True).encode()).hexdigest()


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


def resolve_archives(uris, available, architecture, sources=None):
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
                or filename.startswith('.')):
            raise ValueError('Unsafe native archive locator')
        checked_uri(uri, sources or {}, archive=True)
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
             'archives': resolve_archives(uris, available, host['architecture'], source_files())}
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

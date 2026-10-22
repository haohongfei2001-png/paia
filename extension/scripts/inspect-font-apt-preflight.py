#!/usr/bin/env python3
"""Read only native Ubuntu configuration; no APT update, resolution or install."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import platform
import re
import subprocess
import sys

BASE = 'af5ed6b529886250526a12665f7d4530e5b42bfa'
EXPECTED = '8a8390e2a6e1a4d80c219a2cfc22f296e5e5fe92ab77c7c08b8b542b8c9034b8'
ROOT = Path(__file__).resolve().parents[2]
LIMIT = 1024 * 1024
REPORT = {'schema': 1, 'helper_commit': BASE, 'helper_sha256': EXPECTED,
          'checks': {}, 'files': [], 'commands': {},
          'not_run': ['apt-update', 'resolver', 'font-download', 'install',
                      'cache-service', 'browser', 'Full', 'model']}
INPUTS = {}


def fingerprint(data):
    return {'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}


def safe(value):
    return value if re.fullmatch(r'[A-Za-z0-9_.:+() /=-]{1,160}', value) else 'REDACTED'


def error_code(error):
    result = {'status': 'REJECT', 'error_class': type(error).__name__}
    trace = error.__traceback__
    while trace:
        if trace.tb_frame.f_code.co_filename == str(ROOT/'extension/scripts/prepare-browser-fonts.py'):
            result['helper_line'] = trace.tb_lineno
        trace = trace.tb_next
    return result


def check(name, callback):
    try:
        value = callback()
        REPORT['checks'][name] = {'status': 'PASS'}
        return value
    except Exception as error:
        REPORT['checks'][name] = error_code(error)
        return None


def command(name, args):
    def capture():
        done = subprocess.run(args, stdin=subprocess.DEVNULL, capture_output=True,
                              timeout=45, env={'PATH': '/usr/sbin:/usr/bin:/sbin:/bin', 'LC_ALL': 'C'})
        REPORT['commands'][name] = {'exit_code': done.returncode,
                                   'stdout': fingerprint(done.stdout), 'stderr': fingerprint(done.stderr)}
        if done.returncode or len(done.stdout) > LIMIT or len(done.stderr) > LIMIT:
            raise ValueError('Native read failed or exceeded bound')
        return done.stdout.decode()
    return check('command:'+name, capture)


def read_input(helper, path):
    if path.name in {'auth.conf', 'auth.conf.d'} or not re.fullmatch(r'[A-Za-z0-9_.+-]+', path.name):
        raise ValueError('Outside approved filename set')
    content = helper.read_regular(path)
    data = content.encode()
    if len(data) > LIMIT or sum(len(v.encode()) for v in INPUTS.values()) + len(data) > 8 * LIMIT:
        raise ValueError('Input exceeded bound')
    INPUTS[str(path)] = content
    REPORT['files'].append({'path': str(path), **fingerprint(data),
                            'ordinary_hash_comment_lines': sum(
                                bool(re.match(r'^\s*#(?!include\b|clear\b|x-apt-configure-index\b)', line))
                                for line in content.splitlines())})
    return content


def collect(helper, fragments):
    root = Path('/etc/apt')
    part = root/('apt.conf.d' if fragments else 'sources.list.d')
    if part.resolve(strict=True) != part:
        raise ValueError('Symbolic directory')
    paths = ([root/'apt.conf', *sorted(part.iterdir())] if fragments else
             [root/'sources.list', *sorted(part.glob('*.list')), *sorted(part.glob('*.sources'))])
    result = {}
    for path in paths:
        if path.exists() or path.is_symlink():
            content = check('read:'+str(path), lambda p=path: read_input(helper, p))
            if content is not None:
                result[str(path)] = content
    if not fragments and any('mirror+file:' in content for content in result.values()):
        path = Path(helper.MIRROR_PATH)
        content = check('read:'+str(path), lambda: read_input(helper, path))
        if content is not None:
            result[str(path)] = content
    return result


def native_read_guard(helper, fragments, sources):
    # Conservative observation-only boundary, NOT another APT parser. Reject
    # even commented/quoted mentions of include or directory overrides rather
    # than risk native APT reading outside the fixed approved file set.
    if fragments is None or not sources or any(
            row['status'] != 'PASS' for name, row in REPORT['checks'].items()
            if name.startswith(('read:', 'collect-'))):
        REPORT['native_read_guard_reason'] = 'INCOMPLETE_FIXED_INPUTS'
        raise ValueError('Incomplete fixed-file observation')
    for content in fragments.values():
        if '\\' in content:
            REPORT['native_read_guard_reason'] = 'ESCAPED_FRAGMENT_UNSUPPORTED'
            raise ValueError('Escaped fragment is ambiguous')
        if re.search(r'#\s*(?:include|clear|x-apt-configure-index)\b|\b(?:rootdir|dir)\b',
                     content, re.IGNORECASE):
            REPORT['native_read_guard_reason'] = 'INCLUDE_OR_DIRECTORY_TOKEN_PRESENT'
            raise ValueError('Ambiguous native configuration read scope')
    for name, before in INPUTS.items():
        if helper.read_regular(Path(name)) != before:
            REPORT['native_read_guard_reason'] = 'FIXED_INPUT_CHANGED'
            raise ValueError('Input changed before native observation')
    REPORT['native_read_guard_reason'] = 'FIXED_READ_SCOPE_CHECKED'
    return True


def main():
    temp = Path(os.environ['RUNNER_TEMP']).resolve(strict=True)
    out = temp/'paia-font-readonly-preflight'
    out.mkdir(mode=0o700, exist_ok=False)
    try:
        REPORT['run'] = {k: safe(os.environ.get(k, '')) for k in [
            'GITHUB_SHA', 'GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT', 'ImageOS', 'ImageVersion']}
        REPORT['machine'] = safe(platform.machine())
        if os.environ.get('APT_CONFIG') or os.environ.get('GITHUB_RUN_ATTEMPT') != '1':
            raise ValueError('Unsupported override or retry')
        parent = command('parent', ['git', '-C', str(ROOT), 'rev-parse', 'HEAD^'])
        if parent is None or parent.strip() != BASE:
            raise ValueError('Wrong frozen parent')
        path = ROOT/'extension/scripts/prepare-browser-fonts.py'
        if fingerprint(path.read_bytes())['sha256'] != EXPECTED:
            raise ValueError('Wrong frozen helper bytes')
        spec = importlib.util.spec_from_file_location('frozen_font_helper', path)
        helper = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(helper)
        REPORT['versions'] = {'python': safe(platform.python_version())}
        for name, args in [('apt', ['/usr/bin/dpkg-query', '-W', 'apt']),
                           ('dpkg', ['/usr/bin/dpkg', '--version'])]:
            result = command(name+'-version', args)
            REPORT['versions'][name] = safe(' '.join(result.splitlines()[0].split())) if result else 'UNAVAILABLE'
        release = Path('/etc/os-release').read_bytes()
        REPORT['os_release'] = fingerprint(release)
        REPORT['os'] = {k: safe(v.strip('"')) for line in release.decode().splitlines()
                        if '=' in line for k, v in [line.split('=', 1)]
                        if k in {'ID', 'VERSION_ID', 'VERSION_CODENAME'}}
        fragments = check('collect-fragments', lambda: collect(helper, True))
        sources = check('collect-sources', lambda: collect(helper, False))
        # Scope guard is independent of the helper policy under observation.
        # Capture native inputs before its pure checks. No plan()/install().
        opts = helper.apt_options(temp/'paia-font-readonly-state-not-created')
        opts += ['-o', 'APT::Config::Dump::EmptyValue=true',
                 '-o', 'APT::Config::Dump::Format=%F "%V";%n']
        safe_native = check('native-read-scope', lambda: native_read_guard(helper, fragments, sources))
        user = root = None
        if safe_native:
            user = command('user-dump', ['/usr/bin/apt-config', *opts, 'dump'])
            root = command('root-dump', ['/usr/bin/sudo', '-n', '/usr/bin/apt-config', *opts, 'dump'])
        if user is not None and root is not None:
            REPORT['checks']['user-root-equality'] = {'status': 'PASS' if user == root else 'REJECT'}
        if fragments is not None:
            for name, content in fragments.items():
                check('fragment:'+name, lambda n=name, c=content: helper.checked_fragments({n: c}))
            check('all-fragments', lambda: helper.checked_fragments(fragments))
        if sources is not None:
            if helper.MIRROR_PATH in sources:
                check('mirror-manifest', lambda: helper.checked_mirror(sources[helper.MIRROR_PATH]))
            for name, content in sources.items():
                if name.endswith('.sources'):
                    check('deb822:'+name, lambda c=content: list(helper.deb822(c)))
            if root is not None:
                check('effective-configuration-and-sources', lambda: helper.checked_configuration(root, sources))
        for name, before in INPUTS.items():
            def unchanged(n=name, b=before):
                if helper.read_regular(Path(n)) != b:
                    raise ValueError('Input changed')
            check('unchanged:'+name, unchanged)
        REPORT['observation_complete'] = bool(safe_native and user is not None and root is not None)
    except Exception as error:
        REPORT['fatal'] = error_code(error)
        REPORT['observation_complete'] = False
    REPORT['outcome'] = ('INCOMPLETE' if not REPORT['observation_complete'] else
                         'OBSERVED_INCOMPATIBLE' if any(r['status'] == 'REJECT' for r in REPORT['checks'].values())
                         else 'OBSERVED_COMPATIBLE')
    data = (json.dumps(REPORT, sort_keys=True, indent=2)+'\n').encode()
    if len(data) > LIMIT:
        raise RuntimeError('Summary exceeded bound')
    (out/'summary.json').write_bytes(data)
    print(data.decode(), end='')  # Only reviewed metadata, never raw inputs/errors.
    return 0 if REPORT['observation_complete'] else 1


if __name__ == '__main__':
    sys.dont_write_bytecode = True
    sys.exit(main())


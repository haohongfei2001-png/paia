#!/usr/bin/env python3
"""One bounded native font qualification; not a browser or Full run."""
import ast
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import signal
import subprocess
import sys
import time

BASE = 'a20509de1b89d016f29c9981340ec517c0fd4bfa'
EXPECTED = '3713f58ed8d3e48f12c72c2aae1a08d119180c50c34a5e5cf7afd61ee4e2d510'
ROOT = Path(__file__).resolve().parents[2]
LIMIT = 1024 * 1024
START = time.monotonic()
DEADLINE = START + 1000
REPORT = {'schema': 1, 'helper_commit': BASE, 'helper_sha256': EXPECTED,
          'outcome': 'INCOMPLETE', 'stages': [],
          'not_run': ['cache-service', 'browser', 'Full', 'model']}
OUT = None
PUBLIC_ERRORS = set()


def fingerprint(data):
    return {'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}


def publish():
    data = (json.dumps(REPORT, sort_keys=True, indent=2) + '\n').encode()
    if len(data) > LIMIT:
        raise RuntimeError('Summary exceeded bound')
    (OUT / 'summary.json').write_bytes(data)


def native(name, args, *, max_seconds=None):
    row = {'stage': name, 'status': 'RUNNING'}
    REPORT['stages'].append(row)
    publish()
    began = time.monotonic()
    allowance = DEADLINE - began
    if max_seconds is not None:
        allowance = min(allowance, max_seconds)
    if allowance <= 0:
        row['status'] = 'TIMEOUT'
        raise TimeoutError('Job execution budget exhausted')
    env = {**os.environ, 'LC_ALL': 'C'}
    # No remote cache lookup and no action-output side channel.
    env.pop('GITHUB_OUTPUT', None)
    env.pop('PAIA_FONT_CACHE_MATCHED_KEY', None)
    try:
        process = subprocess.Popen(args, stdin=subprocess.DEVNULL, stdout=subprocess.PIPE,
                                   stderr=subprocess.PIPE, env=env, start_new_session=True)
        stdout, stderr = process.communicate(timeout=allowance)
    except subprocess.TimeoutExpired:
        # The isolated session contains only this phase and its native children.
        # Ask the whole group to terminate, then bound the cleanup wait.
        os.killpg(process.pid, signal.SIGTERM)
        try:
            process.communicate(timeout=10)
        except subprocess.TimeoutExpired:
            os.killpg(process.pid, signal.SIGKILL)
            process.communicate(timeout=10)
        row['status'] = 'TIMEOUT'
        row['seconds'] = round(time.monotonic() - began, 3)
        publish()
        raise
    row.update(exit_code=process.returncode, stdout=fingerprint(stdout),
               stderr=fingerprint(stderr), seconds=round(time.monotonic()-began, 3))
    row['status'] = 'PASS' if process.returncode == 0 else 'FAIL'
    if process.returncode:
        # Never publish raw native output, arguments, environment or tracebacks.
        lines = stderr.decode('utf-8', errors='replace').splitlines()
        for line in lines:
            match = re.fullmatch(r'ValueError: (.*)', line)
            if match and match[1] in PUBLIC_ERRORS:
                row['reason'] = match[1]
            match = re.search(r'prepare-browser-fonts\.py", line ([0-9]+)', line)
            if match:
                row['helper_line'] = int(match[1])
        publish()
        raise RuntimeError('Native stage failed')
    publish()
    return stdout


def main():
    global OUT
    temp = Path(os.environ['RUNNER_TEMP']).resolve(strict=True)
    OUT = temp / 'paia-font-native-validation'
    OUT.mkdir(mode=0o700, exist_ok=False)
    try:
        REPORT['run'] = {key: value for key in [
            'GITHUB_SHA', 'GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT', 'ImageOS', 'ImageVersion']
            if re.fullmatch(r'[A-Za-z0-9_.-]{1,100}', value := os.environ.get(key, ''))}
        if os.environ.get('APT_CONFIG') or os.environ.get('GITHUB_RUN_ATTEMPT') != '1':
            raise ValueError('Unsupported override or repeated attempt')
        if native('parent', ['git', '-C', str(ROOT), 'rev-parse', 'HEAD^'], max_seconds=30).decode().strip() != BASE:
            raise ValueError('Wrong frozen parent')
        path = ROOT / 'extension/scripts/prepare-browser-fonts.py'
        data = path.read_bytes()
        if fingerprint(data)['sha256'] != EXPECTED:
            raise ValueError('Wrong frozen helper')
        parsed = ast.parse(data)
        for node in ast.walk(parsed):
            if isinstance(node, ast.Raise) and isinstance(node.exc, ast.Call) and node.exc.args:
                arg = node.exc.args[0]
                if isinstance(arg, ast.Constant) and isinstance(arg.value, str):
                    PUBLIC_ERRORS.add(arg.value)
        spec = importlib.util.spec_from_file_location('frozen_font_helper', path)
        helper = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(helper)
        state = temp / 'paia-font-native-state'
        cache = temp / 'paia-font-native-cache' / 'debs'
        warm = temp / 'paia-font-native-warm-copy'
        if any(p.exists() or p.is_symlink() for p in [state, cache.parent, warm]):
            raise ValueError('Expected fresh job-local directories')
        # Execute the exact reviewed helper once per phase, without policy edits.
        native('signed-plan', [sys.executable, str(path), 'plan', '--state', str(state)])
        plan_data = (state / 'plan.json').read_bytes()
        plan = json.loads(plan_data)
        REPORT['plan'] = {**fingerprint(plan_data), 'policy': plan['policy'],
                          'archive_count': len(plan['archives']),
                          'archive_bytes': sum(row['Size'] for row in plan['archives']),
                          'configuration_sha256': plan['configuration']}
        publish()
        cache.parent.mkdir(mode=0o700)
        native('cold-install', [sys.executable, str(path), 'install', '--state', str(state),
                               '--cache', str(cache)])
        glyphs = native('fc-list-zh', ['fc-list', ':lang=zh'], max_seconds=30)
        if not glyphs.strip():
            raise ValueError('Original Chinese glyph check failed')
        for index, family in enumerate(['Noto Serif CJK SC', 'Noto Sans CJK SC', 'WenQuanYi Zen Hei']):
            match = native('fc-match-' + str(index + 1),
                           ['fc-match', '--format', '%{family}: %{file}\n', family], max_seconds=30)
            if family not in [part.strip() for part in match.decode().split(': ', 1)[0].split(',')]:
                raise ValueError('Requested font family did not match')
        native('installed-font-versions', ['dpkg-query', '-W',
               '-f=${Package} ${Version} ${Architecture}\n', *helper.PACKAGES], max_seconds=30)
        if plan['archives']:
            # Local byte reuse only; not an Actions cache hit or second installation.
            def controlled_verify(args):
                if args[:2] != ['dpkg-deb', '--field']:
                    raise ValueError('Unexpected warm-verification command')
                return native('warm-deb-control', args, max_seconds=30).decode()
            helper.run = controlled_verify
            helper.verify(cache, plan['archives'])
            warm.mkdir(mode=0o700)
            helper.copy_archives(cache, warm, plan['archives'])
            helper.verify(warm, plan['archives'])
            REPORT['local_byte_reuse'] = 'VERIFIED_COPY_ONLY'
        else:
            REPORT['local_byte_reuse'] = 'NOT_APPLICABLE_ZERO_DOWNLOAD_PLAN'
        REPORT['outcome'] = 'NATIVE_FONT_VALIDATED'
    except Exception as error:
        REPORT['outcome'] = 'FAILED'
        REPORT['failure'] = {'class': type(error).__name__}
        if str(error) in PUBLIC_ERRORS or str(error) in {
                'Unsupported override or repeated attempt', 'Wrong frozen parent',
                'Wrong frozen helper', 'Expected fresh job-local directories',
                'Requested font family did not match',
                'Original Chinese glyph check failed', 'Native stage failed',
                'Unexpected warm-verification command', 'Job execution budget exhausted'}:
            REPORT['failure']['reason'] = str(error)
    REPORT['seconds'] = round(time.monotonic() - START, 3)
    publish()
    print((OUT / 'summary.json').read_text(), end='')
    return 0 if REPORT['outcome'] == 'NATIVE_FONT_VALIDATED' else 1


if __name__ == '__main__':
    sys.dont_write_bytecode = True
    sys.exit(main())


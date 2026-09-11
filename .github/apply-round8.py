from pathlib import Path
import base64, gzip, os, subprocess, sys

ROOT = Path(__file__).resolve().parents[1]
if os.environ.get('GITHUB_REF_NAME') != 'round8/shared-working-context':
    raise SystemExit('Round 8 bootstrap refuses to run on another branch.')

parts = sorted((ROOT / '.github').glob('round8-payload.*'))
if not parts:
    raise SystemExit('Round 8 patch payload is missing.')
encoded = ''.join(p.read_text(encoding='utf-8').strip() for p in parts)
try:
    patch = gzip.decompress(base64.b64decode(encoded, validate=True))
except Exception as exc:
    raise SystemExit(f'Round 8 patch payload is invalid: {exc}')

proc = subprocess.run(
    ['patch', '-p1', '--batch', '--forward'],
    cwd=ROOT / 'extension', input=patch, stdout=sys.stdout.buffer,
    stderr=sys.stderr.buffer,
)
if proc.returncode:
    raise SystemExit(proc.returncode)

print('Applied Round 8 candidate. Bootstrap files will be removed by the workflow before publishing the code commit.')

from pathlib import Path
import base64, gzip, os, subprocess, sys

ROOT = Path(__file__).resolve().parents[1]
if os.environ.get('GITHUB_REF_NAME') != 'round8/shared-working-context':
    raise SystemExit('Round 8 bootstrap refuses to run on another branch.')

parts = sorted((ROOT / '.github').glob('round8-patch.part*'))
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

workflow = ROOT / '.github' / 'workflows' / 'round8-shared-context.yml'
text = workflow.read_text(encoding='utf-8')
old = 'permissions:\n  contents: write\n'
new = 'permissions:\n  contents: read\n'
if text.count(old) != 1:
    raise SystemExit('Round 8 workflow permission guard changed; refusing to guess.')
workflow.write_text(text.replace(old, new, 1), encoding='utf-8')
print('Applied Round 8 candidate and reduced subsequent CI permissions to contents:read.')

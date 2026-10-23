from pathlib import Path
import hashlib, json, subprocess, sys, time

root = Path(__file__).resolve().parents[2]
out = Path(__file__).resolve().parent
node = root / 'work/node22-official-20261023/node-v22.23.3-darwin-arm64/bin/node'
label = sys.argv[1]
if not label.replace('-', '').isalnum():
    raise SystemExit('invalid evidence label')
files = sys.argv[2:] or [
    'tests/canonical-generation-publication.test.mjs',
    'tests/canonical-generation-checkpoint-stage.test.mjs',
    'tests/canonical-generation-owner-restore.test.mjs',
    'tests/browser-native-sync-group-checkpoint-restore.test.mjs',
]
def vector():
    paths = sorted((root / 'extension/core').rglob('*.js'))
    paths += [root / 'extension' / name for name in files]
    return {str(path.relative_to(root)): hashlib.sha256(path.read_bytes()).hexdigest() for path in paths}
log = out / (label + '.tap')
receipt = out / (label + '.json')
if log.exists() or receipt.exists():
    raise SystemExit('evidence exists; refuse overwrite')
command = [str(node), '--test', '--test-concurrency=1', *files]
record = {'node': subprocess.check_output([str(node), '--version'], text=True).strip(),
          'command': command, 'cwd': str(root / 'extension'), 'before': vector()}
start = time.monotonic_ns()
with log.open('xb') as stream:
    process = subprocess.run(command, cwd=root / 'extension', stdout=stream, stderr=subprocess.STDOUT)
record.update(exitCode=process.returncode, wallMs=(time.monotonic_ns()-start)/1e6, after=vector())
record['sourceUnchanged'] = record['before'] == record['after']
receipt.write_text(json.dumps(record, indent=2)+'\n')
print(json.dumps({k:record[k] for k in ['exitCode','wallMs','sourceUnchanged']}))
raise SystemExit(process.returncode)

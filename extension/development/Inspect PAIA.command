#!/bin/zsh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SOURCE_DIR="$SCRIPT_DIR/readonly-gate"
CONFIG_FILE="$HOME/Library/Application Support/PAIA Development/runtime-path"

fail() {
  echo
  echo "PAIA read-only check stopped: $1"
  echo
  read "?Press Return to close..."
  exit 1
}

runtime_is_paia() {
  local runtime="$1"
  [[ -f "$runtime/manifest.json" ]] || return 1
  python3 - "$runtime/manifest.json" <<'PY' >/dev/null 2>&1
import json, sys
m=json.load(open(sys.argv[1], encoding='utf-8'))
assert m.get('manifest_version') == 3
assert m.get('name') == 'Personal AI Input Archive'
PY
}

[[ -f "$SOURCE_DIR/index.html" && -f "$SOURCE_DIR/gate.js" && -f "$SOURCE_DIR/gate.css" ]] || fail "The read-only gate files are missing from this GitHub clone."

if ! RESULT="$(python3 - "$CONFIG_FILE" <<'PY'
from pathlib import Path
import json
import sys

cache_file = Path(sys.argv[1]).expanduser()
cached = None
try:
    if cache_file.is_file():
        cached = str(Path(cache_file.read_text(encoding='utf-8').strip()).expanduser().resolve())
except Exception:
    cached = None

base = Path.home() / 'Library' / 'Application Support' / 'Google' / 'Chrome'
records = {}
for filename in ('Preferences', 'Secure Preferences'):
    for pref in base.glob(f'*/{filename}'):
        try:
            data = json.loads(pref.read_text(encoding='utf-8'))
        except Exception:
            continue
        settings = data.get('extensions', {}).get('settings', {})
        if not isinstance(settings, dict):
            continue
        for extension_id, entry in settings.items():
            if not isinstance(entry, dict):
                continue
            raw_path = entry.get('path')
            if not isinstance(raw_path, str) or not raw_path:
                continue
            path = Path(raw_path).expanduser()
            if not path.is_absolute():
                continue
            try:
                resolved = str(path.resolve())
                manifest = json.loads((path / 'manifest.json').read_text(encoding='utf-8'))
            except Exception:
                continue
            if manifest.get('manifest_version') != 3 or manifest.get('name') != 'Personal AI Input Archive':
                continue
            key = (extension_id, resolved)
            row = records.setdefault(key, {'id': extension_id, 'path': resolved, 'profiles': set(), 'enabled': False})
            row['profiles'].add(pref.parent.name)
            row['enabled'] = row['enabled'] or (entry.get('state') == 1 and not (entry.get('disable_reasons') or []))

candidates = list(records.values())
chosen = None
if cached:
    same = [r for r in candidates if r['path'] == cached]
    enabled = [r for r in same if r['enabled']]
    if len(enabled) == 1:
        chosen = enabled[0]
    elif len(same) == 1:
        chosen = same[0]
if chosen is None:
    enabled = [r for r in candidates if r['enabled']]
    if len(enabled) == 1:
        chosen = enabled[0]
    elif len(candidates) == 1:
        chosen = candidates[0]

if chosen is None:
    if candidates:
        print('Could not uniquely identify the Chrome-loaded PAIA extension:', file=sys.stderr)
        for r in sorted(candidates, key=lambda x: (x['path'], x['id'])):
            print(f"  - {r['path']}  [{r['id']}; {'enabled' if r['enabled'] else 'not enabled'}; profiles={','.join(sorted(r['profiles']))}]", file=sys.stderr)
    else:
        print('No Chrome-loaded unpacked PAIA extension was found.', file=sys.stderr)
    raise SystemExit(2)

print(chosen['id'])
print(chosen['path'])
PY
)"; then
  fail "Chrome did not expose one unique existing PAIA runtime. Do not reinstall or load another copy."
fi

EXTENSION_ID="$(printf '%s\n' "$RESULT" | sed -n '1p')"
RUNTIME="$(printf '%s\n' "$RESULT" | sed -n '2p')"
[[ -n "$EXTENSION_ID" && -n "$RUNTIME" ]] || fail "The existing PAIA runtime could not be identified."
runtime_is_paia "$RUNTIME" || fail "The detected path is not the existing PAIA runtime."

GATE_DIR="$RUNTIME/__paia_readonly_gate"
mkdir -p "$GATE_DIR"
rsync -a --delete "$SOURCE_DIR/" "$GATE_DIR/"

URL="chrome-extension://$EXTENSION_ID/__paia_readonly_gate/index.html"
echo
echo "Opening the PAIA read-only database check..."
echo "This does not reload the extension, install Round 8, or modify IndexedDB."
echo "Runtime: $RUNTIME"
open -a "Google Chrome" "$URL" >/dev/null 2>&1 || fail "Google Chrome could not open the read-only check page."
echo
echo "In Chrome, wait for 'Read-only check complete', then click 'Copy check result'."
echo "Send the copied PAIA_READONLY_DIAGNOSTIC line back to ChatGPT."
echo
sleep 2

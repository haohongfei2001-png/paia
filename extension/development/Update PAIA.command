#!/bin/zsh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
EXTENSION_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_DIR="$(cd "$EXTENSION_DIR/.." && pwd)"
CONFIG_DIR="$HOME/Library/Application Support/PAIA Development"
CONFIG_FILE="$CONFIG_DIR/runtime-path"
BACKUP_ROOT="$CONFIG_DIR/runtime-backups"

fail() {
  echo
  echo "PAIA update stopped: $1"
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

# Chrome persists the source path for unpacked extensions in profile preferences.
# Read only extension metadata and emit a path only when PAIA can be identified
# uniquely. No browsing history, cookies, archive data, or extension storage is read.
detect_chrome_runtime() {
  python3 <<'PY'
from pathlib import Path
import json
import sys

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
            manifest_path = path / 'manifest.json'
            try:
                manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
            except Exception:
                continue
            if manifest.get('manifest_version') != 3 or manifest.get('name') != 'Personal AI Input Archive':
                continue
            key = str(path.resolve())
            rec = records.setdefault(key, {
                'path': key,
                'ids': set(),
                'profiles': set(),
                'enabled': False,
                'version': manifest.get('version', 'unknown'),
            })
            rec['ids'].add(extension_id)
            rec['profiles'].add(pref.parent.name)
            disable_reasons = entry.get('disable_reasons') or []
            rec['enabled'] = rec['enabled'] or (entry.get('state') == 1 and not disable_reasons)

candidates = list(records.values())
enabled = [r for r in candidates if r['enabled']]

chosen = None
if len(enabled) == 1:
    chosen = enabled[0]
elif len(candidates) == 1:
    chosen = candidates[0]

if chosen:
    print(chosen['path'])
    raise SystemExit(0)

if candidates:
    print('Chrome contains multiple PAIA unpacked runtime candidates:', file=sys.stderr)
    for rec in sorted(candidates, key=lambda r: r['path']):
        status = 'enabled' if rec['enabled'] else 'not enabled'
        profiles = ','.join(sorted(rec['profiles']))
        print(f"  - {rec['path']}  [v{rec['version']}; {status}; profile={profiles}]", file=sys.stderr)
else:
    print('No PAIA unpacked runtime path was found in Chrome profile preferences.', file=sys.stderr)
raise SystemExit(1)
PY
}

choose_runtime() {
  local selected
  selected="$(osascript <<'APPLESCRIPT'
try
  POSIX path of (choose folder with prompt "Automatic detection could not identify one unique PAIA runtime. Select the exact existing PAIA folder Chrome already uses; manifest.json must be directly inside it. Do not choose the new GitHub extension folder.")
on error number -128
  return ""
end try
APPLESCRIPT
)"
  [[ -n "$selected" ]] || fail "No runtime folder selected."
  printf '%s' "${selected%/}"
}

mkdir -p "$CONFIG_DIR" "$BACKUP_ROOT"

# GitHub main is authoritative. GitHub Desktop owns network sync because its
# network/proxy path may differ from the system git used by this .command file.
if [[ -n "$(git -C "$REPO_DIR" status --porcelain --untracked-files=no)" ]]; then
  fail "This GitHub clone has uncommitted tracked changes. Commit/revert them before updating the runtime."
fi

BRANCH="$(git -C "$REPO_DIR" branch --show-current)"
[[ "$BRANCH" == "main" ]] || fail "This updater must run from the main branch. Switch to main in GitHub Desktop first."

LOCAL_HEAD="$(git -C "$REPO_DIR" rev-parse HEAD)"
ORIGIN_HEAD="$(git -C "$REPO_DIR" rev-parse refs/remotes/origin/main 2>/dev/null || true)"
[[ -n "$ORIGIN_HEAD" ]] || fail "origin/main is not available locally. Open GitHub Desktop, Fetch/Pull origin, then run this updater again."
[[ "$LOCAL_HEAD" == "$ORIGIN_HEAD" ]] || fail "This clone is not synchronized with origin/main. Open GitHub Desktop, Fetch/Pull origin until it shows no pending Pull/Push, then run this updater again."

echo "Using GitHub Desktop-synchronized main: $LOCAL_HEAD"

RUNTIME=""

# Prefer a previously verified runtime path. Otherwise ask Chrome's own profile
# metadata which unpacked PAIA directory it has loaded.
if [[ -f "$CONFIG_FILE" ]]; then
  CACHED_RUNTIME="$(cat "$CONFIG_FILE")"
  if runtime_is_paia "$CACHED_RUNTIME"; then
    RUNTIME="$CACHED_RUNTIME"
    echo "Using previously verified PAIA runtime: $RUNTIME"
  fi
fi

if [[ -z "$RUNTIME" ]]; then
  echo "Detecting the PAIA folder currently loaded by Chrome..."
  if DETECTED_RUNTIME="$(detect_chrome_runtime)"; then
    RUNTIME="$DETECTED_RUNTIME"
    echo "Detected Chrome-loaded PAIA runtime: $RUNTIME"
  else
    echo "Automatic detection was not unique; manual selection is required."
    RUNTIME="$(choose_runtime)"
  fi
fi

runtime_is_paia "$RUNTIME" || fail "The selected/detected folder is not a valid PAIA runtime with manifest.json at its top level."

# Never deploy into the source tree itself.
case "$RUNTIME" in
  "$REPO_DIR"|"$REPO_DIR"/*) fail "Runtime folder must be the existing Chrome-loaded folder, not the GitHub repository." ;;
esac

printf '%s\n' "$RUNTIME" > "$CONFIG_FILE"

TMP="$(mktemp -d "${TMPDIR:-/tmp}/paia-update.XXXXXX")"
trap 'rm -rf "$TMP"' EXIT
RELEASE="$TMP/release"

echo "Building and checking current release..."
python3 "$EXTENSION_DIR/scripts/build_current_release.py" "$RELEASE"

STAMP="$(date '+%Y%m%d-%H%M%S')"
BACKUP="$BACKUP_ROOT/$STAMP"
mkdir -p "$BACKUP"
echo "Backing up current runtime code..."
rsync -a "$RUNTIME/" "$BACKUP/"

echo "Deploying current GitHub release to the existing Chrome path..."
rsync -a --delete "$RELEASE/" "$RUNTIME/"

if ! diff -qr "$RELEASE" "$RUNTIME" >/dev/null; then
  echo "Verification failed; restoring the previous runtime code..."
  rsync -a --delete "$BACKUP/" "$RUNTIME/"
  fail "Deployment verification failed. The previous runtime was restored."
fi

VERSION="$(python3 - "$RUNTIME/manifest.json" <<'PY'
import json, sys
m=json.load(open(sys.argv[1], encoding='utf-8'))
print(m.get('version','unknown'))
PY
)"

echo
echo "PAIA runtime updated successfully to v$VERSION."
echo "Runtime path: $RUNTIME"
echo "Backup: $BACKUP"
echo "Next: in chrome://extensions, click Reload on the existing PAIA extension. Do not remove it."
open -a "Google Chrome" "chrome://extensions/" >/dev/null 2>&1 || true
echo
read "?Press Return to close..."

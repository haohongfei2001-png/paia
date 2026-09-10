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

choose_runtime() {
  local selected
  selected="$(osascript <<'APPLESCRIPT'
try
  POSIX path of (choose folder with prompt "Select the existing PAIA unpacked extension folder that Chrome already uses. Do not choose the new GitHub extension folder.")
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
if [[ -f "$CONFIG_FILE" ]]; then
  RUNTIME="$(cat "$CONFIG_FILE")"
else
  RUNTIME="$(choose_runtime)"
fi

[[ -f "$RUNTIME/manifest.json" ]] || {
  RUNTIME="$(choose_runtime)"
  [[ -f "$RUNTIME/manifest.json" ]] || fail "The selected folder does not contain manifest.json."
}

# Never deploy into the source tree itself.
case "$RUNTIME" in
  "$REPO_DIR"|"$REPO_DIR"/*) fail "Runtime folder must be the existing Chrome-loaded folder, not the GitHub repository." ;;
esac

python3 - "$RUNTIME/manifest.json" <<'PY' || fail "The selected folder is not a PAIA runtime."
import json, sys
m=json.load(open(sys.argv[1], encoding='utf-8'))
assert m.get('manifest_version') == 3
assert m.get('name') == 'Personal AI Input Archive'
PY

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

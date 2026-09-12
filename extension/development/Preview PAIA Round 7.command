#!/bin/zsh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SOURCE="$SCRIPT_DIR/Update PAIA.command"
TMP="$SCRIPT_DIR/.preview-round7-$$.command"
TARGET_BRANCH="round7/evolution-recomposition"

[[ -f "$SOURCE" ]] || { echo "Missing Update PAIA.command"; read "?Press Return to close..."; exit 1; }

python3 - "$SOURCE" "$TMP" "$TARGET_BRANCH" <<'PY'
from pathlib import Path
import sys

source=Path(sys.argv[1]).read_text(encoding='utf-8')
out=Path(sys.argv[2])
branch=sys.argv[3]

old='[[ "$BRANCH" == "main" ]] || fail "This updater must run from the main branch. Switch to main in GitHub Desktop first."'
new=f'[[ "$BRANCH" == "{branch}" ]] || fail "This preview updater must run from {branch}. Switch to that branch in GitHub Desktop first."'
if old not in source:
    raise SystemExit('Updater branch guard changed; preview helper refuses to guess.')
source=source.replace(old,new,1)
source=source.replace('refs/remotes/origin/main',f'refs/remotes/origin/{branch}')
source=source.replace('origin/main',f'origin/{branch}')
source=source.replace('Using GitHub Desktop-synchronized main:',f'Using GitHub Desktop-synchronized {branch}:')
source=source.replace('GitHub main is authoritative.','Round 7 preview deployment uses an isolated candidate branch; main remains authoritative.')
out.write_text(source,encoding='utf-8')
PY

chmod +x "$TMP"
cleanup(){ rm -f "$TMP"; }
trap cleanup EXIT INT TERM

printf '\nPAIA Round 7 preview\n'
printf 'This deploys validated program files into the SAME Chrome-loaded PAIA runtime path.\n'
printf 'It does not uninstall the extension or move its Chrome-managed IndexedDB.\n\n'

"$TMP"

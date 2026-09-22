#!/bin/zsh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
EXTENSION_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_DIR="$(cd "$EXTENSION_DIR/.." && pwd)"
SOURCE_DIR="$SCRIPT_DIR/cpr00-project-probe"
CONFIG_FILE="$HOME/Library/Application Support/PAIA Development/runtime-path"

fail(){ echo; echo "PAIA CPR-00 Project discovery stopped: $1"; echo; read "?Press Return to close..."; exit 1; }

runtime_is_paia(){
  [[ -f "$1/manifest.json" ]] || return 1
  python3 - "$1/manifest.json" <<'PY' >/dev/null 2>&1
import json,sys
m=json.load(open(sys.argv[1],encoding='utf-8'))
assert m.get('manifest_version')==3
assert m.get('name')=='Personal AI Input Archive'
PY
}

detect_runtime(){
  python3 - "$CONFIG_FILE" <<'PY'
from pathlib import Path
import json,sys
cache=Path(sys.argv[1]).expanduser()
cached=None
try:
    if cache.is_file(): cached=str(Path(cache.read_text(encoding='utf-8').strip()).expanduser().resolve())
except Exception: pass
base=Path.home()/'Library'/'Application Support'/'Google'/'Chrome'
rows={}
for filename in ('Preferences','Secure Preferences'):
    for pref in base.glob(f'*/{filename}'):
        try:data=json.loads(pref.read_text(encoding='utf-8'))
        except Exception:continue
        settings=data.get('extensions',{}).get('settings',{})
        if not isinstance(settings,dict):continue
        for extension_id,entry in settings.items():
            if not isinstance(entry,dict):continue
            raw=entry.get('path')
            if not isinstance(raw,str) or not raw:continue
            p=Path(raw).expanduser()
            if not p.is_absolute():continue
            try:
                resolved=str(p.resolve())
                manifest=json.loads((p/'manifest.json').read_text(encoding='utf-8'))
            except Exception:continue
            if manifest.get('manifest_version')!=3 or manifest.get('name')!='Personal AI Input Archive':continue
            row=rows.setdefault((extension_id,resolved),{'id':extension_id,'path':resolved,'enabled':False})
            row['enabled']=row['enabled'] or (entry.get('state')==1 and not (entry.get('disable_reasons') or []))
candidates=list(rows.values());chosen=None
if cached:
    same=[r for r in candidates if r['path']==cached];enabled=[r for r in same if r['enabled']]
    if len(enabled)==1:chosen=enabled[0]
    elif len(same)==1:chosen=same[0]
if chosen is None:
    enabled=[r for r in candidates if r['enabled']]
    if len(enabled)==1:chosen=enabled[0]
    elif len(candidates)==1:chosen=candidates[0]
if chosen is None: raise SystemExit(2)
print(chosen['id']);print(chosen['path'])
PY
}

[[ -f "$SOURCE_DIR/index.html" && -f "$SOURCE_DIR/gate.js" && -f "$SOURCE_DIR/probe-core.js" ]] || fail "CPR-00 helper files are missing."
[[ -z "$(git -C "$REPO_DIR" status --porcelain --untracked-files=no)" ]] || fail "The PAIA clone has tracked local changes."
[[ "$(git -C "$REPO_DIR" branch --show-current)" == "main" ]] || fail "Switch the PAIA clone to main first."
LOCAL_HEAD="$(git -C "$REPO_DIR" rev-parse HEAD)"
ORIGIN_HEAD="$(git -C "$REPO_DIR" rev-parse refs/remotes/origin/main 2>/dev/null || true)"
[[ -n "$ORIGIN_HEAD" && "$LOCAL_HEAD" == "$ORIGIN_HEAD" ]] || fail "Pull origin/main until the clone is synchronized."

if ! RESULT="$(detect_runtime)"; then fail "Chrome does not expose one unique existing PAIA runtime."; fi
EXTENSION_ID="$(printf '%s\n' "$RESULT" | sed -n '1p')"
RUNTIME="$(printf '%s\n' "$RESULT" | sed -n '2p')"
runtime_is_paia "$RUNTIME" || fail "Detected runtime is not PAIA."

TMP="$(mktemp -d "/tmp/paia-cpr00.XXXXXX")"
trap 'rm -rf "$TMP"' EXIT
RELEASE="$TMP/release"
python3 "$EXTENSION_DIR/scripts/build_current_release.py" "$RELEASE" >/dev/null

CHECK_JSON="$TMP/runtime-check.json"
python3 - "$RELEASE" "$RUNTIME" "$LOCAL_HEAD" > "$CHECK_JSON" <<'PY'
from pathlib import Path
import hashlib,json,sys
release=Path(sys.argv[1]);runtime=Path(sys.argv[2]);head=sys.argv[3]
def files(root):
    out={}
    for p in root.rglob('*'):
        if not p.is_file():continue
        rel=p.relative_to(root)
        if rel.parts and rel.parts[0].startswith('__paia_'):continue
        if rel.name=='.DS_Store':continue
        out[str(rel)]=p
    return out
def digest(rows):
    h=hashlib.sha256()
    for rel,p in sorted(rows.items()):
        h.update(rel.encode());h.update(b'\0');h.update(p.read_bytes())
    return h.hexdigest()
a,b=files(release),files(runtime)
same=set(a)==set(b) and all(a[k].read_bytes()==b[k].read_bytes() for k in a.keys()&b.keys())
manifest=json.loads((release/'manifest.json').read_text(encoding='utf-8'))
print(json.dumps({'sourceHead':head,'runtimeParity':same,'manifestVersion':manifest.get('version'),'releaseDigest':digest(a)},separators=(',',':')))
PY

GATE_DIR="$RUNTIME/__paia_cpr00_project_probe"
mkdir -p "$GATE_DIR"
rsync -a --delete "$SOURCE_DIR/" "$GATE_DIR/"
python3 - "$CHECK_JSON" "$GATE_DIR/runtime-check.js" <<'PY'
from pathlib import Path
import json,sys
data=json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
Path(sys.argv[2]).write_text('globalThis.PAIA_CPR00_RUNTIME_CHECK='+json.dumps(data,separators=(',',':'))+';\n',encoding='utf-8')
PY

URL="chrome-extension://$EXTENSION_ID/__paia_cpr00_project_probe/index.html"
open -a "Google Chrome" "$URL" >/dev/null 2>&1 || fail "Google Chrome could not open the CPR-00 helper."
echo
echo "CPR-00 Project discovery helper opened in Chrome."
echo "It is read-only and does not modify ChatGPT Projects or PAIA archive data."
echo

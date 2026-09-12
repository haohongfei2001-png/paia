#!/bin/zsh
set -euo pipefail

PACKAGE="${1:-}"
PROFILE="${2:-${PAIA_NOTARY_KEYCHAIN_PROFILE:-}}"

if [[ -z "$PACKAGE" || ! -f "$PACKAGE" ]]; then
  echo "usage: $0 <Developer-ID-signed.pkg> [notarytool-keychain-profile]" >&2
  exit 2
fi
if [[ -z "$PROFILE" ]]; then
  echo "notarytool keychain profile is required as arg 2 or PAIA_NOTARY_KEYCHAIN_PROFILE" >&2
  exit 2
fi
for tool in xcrun pkgutil spctl python3; do
  command -v "$tool" >/dev/null || { echo "missing required tool: $tool" >&2; exit 3; }
done

SIGNATURE="$(/usr/sbin/pkgutil --check-signature "$PACKAGE" 2>&1)" || { printf '%s\n' "$SIGNATURE" >&2; exit 4; }
printf '%s\n' "$SIGNATURE" | grep -Fq 'Developer ID Installer' || { echo "package is not signed with a Developer ID Installer identity" >&2; exit 4; }

WORK="$(mktemp -d "${TMPDIR:-/tmp}/paia-secure-store-notary.XXXXXX")"
trap 'rm -rf "$WORK"' EXIT
RESULT="$WORK/notary-result.json"

/usr/bin/xcrun notarytool submit "$PACKAGE" --keychain-profile "$PROFILE" --wait --output-format json > "$RESULT"
SUBMISSION_ID="$(/usr/bin/python3 - "$RESULT" <<'PY'
import json, sys
row=json.load(open(sys.argv[1],encoding='utf-8'))
if row.get('status') != 'Accepted':
    raise SystemExit('notarization was not accepted: '+str(row.get('status')))
submission=row.get('id')
if not isinstance(submission,str) or not submission:
    raise SystemExit('notarytool returned no submission id')
print(submission)
PY
)"

/usr/bin/xcrun stapler staple "$PACKAGE"
/usr/bin/xcrun stapler validate "$PACKAGE"
/usr/sbin/spctl -a -vv -t install "$PACKAGE"

EVIDENCE="${PACKAGE%.pkg}.notarization.json"
METADATA="${PACKAGE%.pkg}.json"
/usr/bin/python3 - "$EVIDENCE" "$METADATA" "$PACKAGE" "$SUBMISSION_ID" <<'PY'
import json, pathlib, sys
out, metadata_path, package, submission = sys.argv[1:]
evidence={
  "schemaVersion": 1,
  "package": pathlib.Path(package).name,
  "submissionId": submission,
  "status": "Accepted",
  "stapled": True,
  "gatekeeperAccepted": True,
}
out_path=pathlib.Path(out)
tmp=out_path.with_name(out_path.name+'.new')
tmp.write_text(json.dumps(evidence,indent=2)+"\n",encoding='utf-8')
tmp.replace(out_path)

meta_path=pathlib.Path(metadata_path)
if meta_path.exists():
    metadata=json.loads(meta_path.read_text(encoding='utf-8'))
    if metadata.get('schemaVersion') != 1 or metadata.get('signingMode') != 'developer-id':
        raise SystemExit('build metadata is not a Developer ID production build')
    metadata['notarized']=True
    metadata['notarizationSubmissionId']=submission
    metadata['gatekeeperAccepted']=True
    meta_tmp=meta_path.with_name(meta_path.name+'.new')
    meta_tmp.write_text(json.dumps(metadata,indent=2)+"\n",encoding='utf-8')
    meta_tmp.replace(meta_path)
PY

printf 'Notarized and stapled: %s\n' "$PACKAGE"
printf 'Evidence: %s\n' "$EVIDENCE"
if [[ -f "$METADATA" ]]; then
  printf 'Updated metadata: %s\n' "$METADATA"
fi

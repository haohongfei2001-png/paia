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
/usr/bin/python3 - "$EVIDENCE" "$PACKAGE" "$SUBMISSION_ID" <<'PY'
import json, pathlib, sys
out, package, submission = sys.argv[1:]
payload={
  "schemaVersion": 1,
  "package": pathlib.Path(package).name,
  "submissionId": submission,
  "status": "Accepted",
  "stapled": True,
  "gatekeeperAccepted": True,
}
pathlib.Path(out).write_text(json.dumps(payload,indent=2)+"\n",encoding='utf-8')
PY

printf 'Notarized and stapled: %s\n' "$PACKAGE"
printf 'Evidence: %s\n' "$EVIDENCE"

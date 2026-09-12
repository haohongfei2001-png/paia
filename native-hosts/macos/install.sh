#!/bin/zsh
set -euo pipefail

HOST_NAME="com.paia.secure_store"
DEPLOYMENT_TARGET="13.0"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
EXTENSION_ID="${1:-}"
ARCH="$(uname -m)"

if [[ ! "$EXTENSION_ID" =~ '^[a-p]{32}$' ]]; then
  echo "usage: $0 <32-character Chrome extension id>" >&2
  exit 2
fi
if [[ "$ARCH" != "arm64" && "$ARCH" != "x86_64" ]]; then
  echo "unsupported macOS architecture: $ARCH" >&2
  exit 3
fi

INSTALL_ROOT="$HOME/Library/Application Support/PAIA/SecureStore"
HOST_DIR="$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"
BINARY="$INSTALL_ROOT/paia-secure-store"
MANIFEST="$HOST_DIR/$HOST_NAME.json"
TMP_BINARY="$INSTALL_ROOT/.paia-secure-store.new.$$"
trap 'rm -f "$TMP_BINARY"' EXIT

mkdir -p "$INSTALL_ROOT" "$HOST_DIR"
/usr/bin/xcrun --find swiftc >/dev/null
/usr/bin/xcrun swiftc -O -target "$ARCH-apple-macos$DEPLOYMENT_TARGET" -framework Security \
  "$SCRIPT_DIR/paia-secure-store.swift" -o "$TMP_BINARY"
/usr/bin/codesign --force --sign - --options runtime --timestamp=none "$TMP_BINARY"
/usr/bin/codesign --verify --strict --verbose=2 "$TMP_BINARY"
chmod 700 "$TMP_BINARY"
mv -f "$TMP_BINARY" "$BINARY"

python3 - "$BINARY" "$MANIFEST" "$EXTENSION_ID" <<'PY'
import json, pathlib, sys
binary, manifest, extension_id = sys.argv[1:]
payload = {
    "name": "com.paia.secure_store",
    "description": "PAIA macOS secure key persistence host",
    "path": binary,
    "type": "stdio",
    "allowed_origins": [f"chrome-extension://{extension_id}/"],
}
path = pathlib.Path(manifest)
tmp = path.with_name(path.name + ".new")
tmp.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
tmp.chmod(0o600)
tmp.replace(path)
PY

echo "Installed $HOST_NAME for Chrome extension $EXTENSION_ID"
echo "Native host: $BINARY"
echo "Manifest: $MANIFEST"
echo "Next: node '$SCRIPT_DIR/verify-physical.mjs' '$BINARY' --require-enclave"

#!/bin/zsh
set -euo pipefail

HOST_NAME="com.paia.secure_store"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
EXTENSION_ID="${1:-}"

if [[ ! "$EXTENSION_ID" =~ '^[a-p]{32}$' ]]; then
  echo "usage: $0 <32-character Chrome extension id>" >&2
  exit 2
fi

INSTALL_ROOT="$HOME/Library/Application Support/PAIA/SecureStore"
HOST_DIR="$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"
BINARY="$INSTALL_ROOT/paia-secure-store"
MANIFEST="$HOST_DIR/$HOST_NAME.json"

mkdir -p "$INSTALL_ROOT" "$HOST_DIR"
/usr/bin/xcrun --find swiftc >/dev/null
/usr/bin/xcrun swiftc -O -framework Security "$SCRIPT_DIR/paia-secure-store.swift" -o "$BINARY"
chmod 700 "$BINARY"

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
path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
path.chmod(0o600)
PY

echo "Installed $HOST_NAME for Chrome extension $EXTENSION_ID"
echo "Native host: $BINARY"
echo "Manifest: $MANIFEST"

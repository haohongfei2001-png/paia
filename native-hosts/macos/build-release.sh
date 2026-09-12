#!/bin/zsh
set -euo pipefail

HOST_NAME="com.paia.secure_store"
PACKAGE_ID="com.paia.secure-store"
DEPLOYMENT_TARGET="13.0"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
EXTENSION_ID="${1:-}"
OUTPUT_DIR="${2:-}"
MODE="${3:-}"
VERSION="${PAIA_SECURE_STORE_VERSION:-1.0.0}"
APP_IDENTITY="${PAIA_DEVELOPER_ID_APPLICATION:-}"
INSTALLER_IDENTITY="${PAIA_DEVELOPER_ID_INSTALLER:-}"

if [[ ! "$EXTENSION_ID" =~ '^[a-p]{32}$' ]]; then
  echo "usage: $0 <32-character Chrome extension id> <output-dir> [--ci-adhoc]" >&2
  exit 2
fi
if [[ -z "$OUTPUT_DIR" ]]; then
  echo "output directory is required" >&2
  exit 2
fi
if [[ ! "$VERSION" =~ '^[0-9]+([.][0-9]+){1,3}$' ]]; then
  echo "PAIA_SECURE_STORE_VERSION must be a dotted numeric version" >&2
  exit 2
fi
if [[ -n "$MODE" && "$MODE" != "--ci-adhoc" ]]; then
  echo "third argument may only be --ci-adhoc" >&2
  exit 2
fi
if [[ "$MODE" != "--ci-adhoc" && ( -z "$APP_IDENTITY" || -z "$INSTALLER_IDENTITY" ) ]]; then
  echo "production release requires PAIA_DEVELOPER_ID_APPLICATION and PAIA_DEVELOPER_ID_INSTALLER" >&2
  exit 5
fi

for tool in xcrun lipo codesign pkgbuild pkgutil python3 shasum; do
  command -v "$tool" >/dev/null || { echo "missing required tool: $tool" >&2; exit 3; }
done

OUTPUT_DIR="$(mkdir -p "$OUTPUT_DIR" && cd "$OUTPUT_DIR" && pwd)"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/paia-secure-store-release.XXXXXX")"
trap 'rm -rf "$WORK"' EXIT
STAGE="$WORK/root"
HOST_PATH="/Library/Application Support/PAIA/SecureStore/paia-secure-store"
MANIFEST_PATH="/Library/Google/Chrome/NativeMessagingHosts/$HOST_NAME.json"
BINARY="$STAGE$HOST_PATH"
MANIFEST="$STAGE$MANIFEST_PATH"
PACKAGE="$OUTPUT_DIR/PAIA-SecureStore-$VERSION.pkg"
METADATA="$OUTPUT_DIR/PAIA-SecureStore-$VERSION.json"
CHECKSUM="$PACKAGE.sha256"

mkdir -p "${BINARY:h}" "${MANIFEST:h}"

for arch in arm64 x86_64; do
  /usr/bin/xcrun swiftc -O -target "$arch-apple-macos$DEPLOYMENT_TARGET" -framework Security \
    "$SCRIPT_DIR/paia-secure-store.swift" -o "$WORK/paia-secure-store-$arch"
done
/usr/bin/lipo -create "$WORK/paia-secure-store-arm64" "$WORK/paia-secure-store-x86_64" -output "$BINARY"
chmod 755 "$BINARY"
ARCHS="$(/usr/bin/lipo -archs "$BINARY")"
[[ "$ARCHS" == *arm64* && "$ARCHS" == *x86_64* ]] || { echo "universal binary build failed: $ARCHS" >&2; exit 4; }

if [[ "$MODE" == "--ci-adhoc" ]]; then
  /usr/bin/codesign --force --sign - --options runtime --timestamp=none "$BINARY"
  SIGNING_MODE="adhoc-ci"
else
  /usr/bin/codesign --force --sign "$APP_IDENTITY" --options runtime --timestamp "$BINARY"
  SIGNING_MODE="developer-id"
fi

/usr/bin/codesign --verify --strict --verbose=2 "$BINARY"
/usr/bin/codesign -dv --verbose=4 "$BINARY" 2>&1 | grep -q 'runtime' || { echo "hardened runtime flag missing" >&2; exit 6; }

/usr/bin/python3 - "$BINARY" "$MANIFEST" "$EXTENSION_ID" <<'PY'
import json, pathlib, sys
binary, manifest, extension_id = sys.argv[1:]
payload = {
    "name": "com.paia.secure_store",
    "description": "PAIA macOS secure key persistence host",
    "path": "/Library/Application Support/PAIA/SecureStore/paia-secure-store",
    "type": "stdio",
    "allowed_origins": [f"chrome-extension://{extension_id}/"],
}
path = pathlib.Path(manifest)
path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
path.chmod(0o644)
PY

if [[ "$MODE" == "--ci-adhoc" ]]; then
  /usr/bin/pkgbuild --root "$STAGE" --identifier "$PACKAGE_ID" --version "$VERSION" --install-location / --ownership recommended "$PACKAGE"
else
  /usr/bin/pkgbuild --root "$STAGE" --identifier "$PACKAGE_ID" --version "$VERSION" --install-location / --ownership recommended \
    --sign "$INSTALLER_IDENTITY" "$PACKAGE"
  /usr/sbin/pkgutil --check-signature "$PACKAGE" >/dev/null
fi

PAYLOAD_FILES="$(/usr/sbin/pkgutil --payload-files "$PACKAGE")"
printf '%s\n' "$PAYLOAD_FILES" | grep -Fq 'Library/Application Support/PAIA/SecureStore/paia-secure-store' || { echo "package is missing native host" >&2; exit 7; }
printf '%s\n' "$PAYLOAD_FILES" | grep -Fq "Library/Google/Chrome/NativeMessagingHosts/$HOST_NAME.json" || { echo "package is missing Chrome native-host manifest" >&2; exit 7; }

/usr/bin/shasum -a 256 "$PACKAGE" | awk '{print $1}' > "$CHECKSUM"
/usr/bin/python3 - "$METADATA" "$VERSION" "$EXTENSION_ID" "$SIGNING_MODE" "$ARCHS" "$DEPLOYMENT_TARGET" <<'PY'
import json, pathlib, sys
path, version, extension_id, signing_mode, archs, deployment_target = sys.argv[1:]
payload = {
    "schemaVersion": 1,
    "product": "PAIA Secure Store",
    "version": version,
    "hostName": "com.paia.secure_store",
    "extensionId": extension_id,
    "architectures": archs.split(),
    "minimumMacOS": deployment_target,
    "signingMode": signing_mode,
    "notarized": False,
}
pathlib.Path(path).write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
PY

printf 'Built %s\n' "$PACKAGE"
printf 'Metadata %s\n' "$METADATA"
printf 'SHA-256 %s\n' "$CHECKSUM"
if [[ "$MODE" == "--ci-adhoc" ]]; then
  echo "CI artifact only: ad-hoc binary + unsigned installer package; never distribute this build."
else
  echo "Developer ID signed package created. It is not release-ready until notarize-release.sh succeeds."
fi

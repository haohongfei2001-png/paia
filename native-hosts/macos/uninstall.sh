#!/bin/zsh
set -euo pipefail

HOST_NAME="com.paia.secure_store"
MODE="${1:-user}"

remove_empty_dir(){
  local path="$1"
  [[ -d "$path" ]] && rmdir "$path" 2>/dev/null || true
}

if [[ "$MODE" == "user" || "$MODE" == "--user" ]]; then
  INSTALL_ROOT="$HOME/Library/Application Support/PAIA/SecureStore"
  HOST_DIR="$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"
  rm -f "$HOST_DIR/$HOST_NAME.json"
  rm -f "$INSTALL_ROOT/paia-secure-store"
  remove_empty_dir "$INSTALL_ROOT"
  echo "Removed the user-level PAIA native host registration and binary."
elif [[ "$MODE" == "--system" ]]; then
  if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
    exec /usr/bin/sudo "$0" --system
  fi
  INSTALL_ROOT="/Library/Application Support/PAIA/SecureStore"
  HOST_DIR="/Library/Google/Chrome/NativeMessagingHosts"
  rm -f "$HOST_DIR/$HOST_NAME.json"
  rm -f "$INSTALL_ROOT/paia-secure-store"
  remove_empty_dir "$INSTALL_ROOT"
  /usr/sbin/pkgutil --forget com.paia.secure-store >/dev/null 2>&1 || true
  echo "Removed the system-level PAIA native host registration, binary and package receipt."
else
  echo "usage: $0 [user|--user|--system]" >&2
  exit 2
fi

echo "This filesystem uninstaller does not enumerate or erase PAIA Keychain/Secure Enclave secrets."
echo "Secret deletion must remain an explicit device-removal operation, not a blind uninstall side effect."

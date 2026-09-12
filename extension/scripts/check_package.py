#!/usr/bin/env python3
"""Offline package guardrails; inspect source only, never Chrome or user data.

This deliberately conservative static audit is a regression check, not proof of
browser compatibility or the absence of every possible obfuscated behavior.
"""

from html.parser import HTMLParser
import json
from pathlib import Path
import re
import sys
from urllib.parse import unquote, urlsplit


ROOT = Path(__file__).resolve().parents[1]
ERRORS = []
CHECKS = 0
RUNTIME_DIRS = ("adapter", "content", "background", "core", "ui", "icons", "assets")


def require(condition, message):
    global CHECKS
    CHECKS += 1
    if not condition:
        ERRORS.append(message)


def local_reference(reference, owner, label):
    """Validate packaged paths without opening any path outside this project."""
    if not isinstance(reference, str) or not reference:
        require(False, f"{label}: missing local resource path")
        return
    parsed = urlsplit(reference)
    require(not parsed.scheme and not parsed.netloc and not reference.startswith("//"),
            f"{label}: resource must be local: {reference}")
    if parsed.scheme or parsed.netloc:
        return
    candidate = (owner.parent / unquote(parsed.path)).resolve()
    require(candidate.is_relative_to(ROOT), f"{label}: path escapes extension package")
    if candidate.is_relative_to(ROOT):
        require(candidate.is_file(), f"{label}: missing resource {reference}")


def icon_references(value, owner, label):
    if isinstance(value, str):
        local_reference(value, owner, label)
    elif isinstance(value, dict):
        for size, reference in value.items():
            local_reference(reference, owner, f"{label}[{size}]")
    elif value is not None:
        require(False, f"{label}: invalid icon declaration")


def audit_manifest():
    path = ROOT / "manifest.json"
    require(path.is_file(), "manifest.json is missing")
    if not path.is_file():
        return
    for required in ("ui/archive.html", "ui/popup.html"):
        local_reference(required, path, "Required product entry point")
    try:
        manifest = json.loads(path.read_text(encoding="utf-8"))
    except (ValueError, OSError):
        require(False, "manifest.json is not valid readable JSON")
        return
    require(manifest.get("manifest_version") == 3, "Manifest must be version 3")
    require(manifest.get("permissions") == ["storage"], "Only the storage API permission is allowed")
    require(manifest.get("host_permissions") in (None, ["https://api.deepseek.com/*"]),
            "DeepSeek host permission must be the sole exact approved origin")
    for key in ("optional_host_permissions", "optional_permissions",
                "externally_connectable", "web_accessible_resources", "sandbox",
                "update_url", "devtools_page", "chrome_url_overrides"):
        require(not manifest.get(key), f"Unexpected manifest capability: {key}")
    minimum_version = str(manifest.get("minimum_chrome_version", "0"))
    major_version = minimum_version.split(".")[0]
    require(major_version.isdigit() and int(major_version) >= 114,
            "minimum_chrome_version must be at least 114")
    background = manifest.get("background", {})
    require(background.get("type") == "module", "Background must use a packaged ES module")
    local_reference(background.get("service_worker"), path, "background.service_worker")
    action = manifest.get("action", {})
    local_reference(action.get("default_popup"), path, "action.default_popup")
    icon_references(action.get("default_icon"), path, "action.default_icon")
    icon_references(manifest.get("icons"), path, "icons")
    if manifest.get("options_page"):
        local_reference(manifest["options_page"], path, "options_page")
    if manifest.get("options_ui"):
        local_reference(manifest["options_ui"].get("page"), path, "options_ui.page")
    scripts = manifest.get("content_scripts", [])
    require(bool(scripts), "At least one packaged content script is required")
    for index, script in enumerate(scripts):
        label = f"content_scripts[{index}]"
        require(script.get("matches") == ["https://chatgpt.com/*"],
                f"{label}: matches must be exactly https://chatgpt.com/*")
        require(script.get("world", "ISOLATED") == "ISOLATED" or (script.get("world") == "MAIN" and script.get("run_at") == "document_start" and script.get("js") == ["adapter/response-parser.js", "adapter/json-fingerprint.js", "adapter/history-contract.js", "content/response-observer.js"]), f"{label}: only reviewed passive observer may use MAIN")
        require(script.get("all_frames", False) is False, f"{label}: top-level frame only")
        require(script.get("match_about_blank", False) is False, f"{label}: about:blank injection forbidden")
        require(script.get("match_origin_as_fallback", False) is False,
                f"{label}: origin fallback injection forbidden")
        for resource_type in ("js", "css"):
            for reference in script.get(resource_type, []):
                local_reference(reference, path, f"{label}.{resource_type}")
    csp = manifest.get("content_security_policy", {}).get("extension_pages", "")
    directives = {}
    for rule in csp.split(";"):
        parts = rule.split()
        if parts:
            require(parts[0] not in directives, f"Duplicate CSP directive: {parts[0]}")
            directives[parts[0]] = parts[1:]
    require(directives.get("default-src") in (["'self'"], ["'none'"]),
            "CSP default-src must be self or none")
    for name, expected in {
        "script-src": ["'self'"],
        "connect-src": ["https://api.deepseek.com"], "object-src": ["'none'"],
        "base-uri": ["'none'"], "form-action": ["'none'"],
    }.items():
        require(directives.get(name) == expected, f"CSP must declare {name} {' '.join(expected)}")
    for name, values in directives.items():
        require(all(value in {"'self'", "'none'", "data:", "blob:", "https://api.deepseek.com"} for value in values),
                f"CSP {name}: unsafe or remote source")


FORBIDDEN_JS = {
    "network API": r"\b(?:fetch|XMLHttpRequest|WebSocket|WebTransport|EventSource|sendBeacon|RTCPeerConnection)\s*\(",
    "network request property": r"\b(?:navigator\s*\.\s*sendBeacon|window\s*\.\s*open)\b",
    "remote or injected script loader": r"\b(?:importScripts|eval|Function)\s*\(",
    "credential, history or unrelated privileged API": r"\bchrome\s*\.\s*(?:cookies|history|webRequest|webNavigation|debugger|identity|browsingData|scripting)\b",
    "native messaging": r"\b(?:connectNative|sendNativeMessage)\s*\(",
    "website storage or nonlocal extension storage": r"\b(?:localStorage|sessionStorage|cookieStore)\b|\bchrome\s*\.\s*storage\s*\.\s*(?:sync|session|managed)\b",
    "cookie access": r"\bdocument\s*\.\s*cookie\b",
    "credentials API": r"\bnavigator\s*\.\s*credentials\b|\b(?:PasswordCredential|Credential)\s*\(",
    "clipboard access": r"\bnavigator\s*\.\s*clipboard\b|\b(?:ClipboardItem|ClipboardEvent)\s*\(|\bexecCommand\s*\(",
    "local file access": r"\b(?:FileReader|showOpenFilePicker|showSaveFilePicker|showDirectoryPicker|requestFileSystem|webkitRequestFileSystem|resolveLocalFileSystemURL)\b|\bfile://",
    "system keychain": r"\b(?:keychain|keytar)\b",
    "keyboard listener": r"(?:addEventListener\s*\(\s*['\"](?:keydown|keyup|keypress)['\"]|\.onkey(?:down|up|press)\s*=)",
    "logging": r"\bconsole\s*(?:\.|\[)",
    "dynamic HTML": r"\b(?:innerHTML|outerHTML|insertAdjacentHTML|createContextualFragment)\b|\bdocument\s*\.\s*(?:write|writeln)\s*\(",
    "unsafe document parsing": r"\bDOMParser\s*\(",
    "external source map": r"sourceMappingURL\s*=\s*(?:https?:)?//",
}


def audit_js(path, text):
    for label, pattern in FORBIDDEN_JS.items():
        scanned = text
        if label == "network API" and path == ROOT / "core/organizer/deepseek.js":
            # This provider may call only its literal, CSP-constrained HTTPS origin.
            scanned = scanned.replace("this.fetchImpl(", "APPROVED_DEEPSEEK_FETCH(")
        if label == "website storage or nonlocal extension storage" and path in {ROOT / "core/organizer/deepseek.js", ROOT / "background/service-worker.js"}:
            # Credentials, budget binding and transient Memory grants use trusted session storage.
            scanned = scanned.replace("chrome.storage.session", "APPROVED_SESSION_CREDENTIAL_STORAGE")
        if label == "clipboard access" and path == ROOT / "ui/reading-actions.js":
            # Narrow explicit copy only; reads and other clipboard APIs remain prohibited.
            scanned = scanned.replace("navigator.clipboard.writeText(text)", "EXPLICIT_READING_COPY(text)")
        if label == "clipboard access" and path == ROOT / "ui/memory.js":
            # Explicit preview Copy only; clipboard reads and other APIs remain forbidden.
            scanned = scanned.replace("navigator.clipboard.writeText(result.text)", "EXPLICIT_MEMORY_CONTEXT_COPY(result.text)")
        if label == "keyboard listener" and path in (ROOT / "ui/library.js", ROOT / "ui/library-entry-editor.js"):
            # Approved document-session undo shortcuts, scoped to the extension editor root.
            scanned = scanned.replace("root.addEventListener('keydown',", "SCOPED_EDITOR_SHORTCUT(")
        if label == "keyboard listener" and path == ROOT / "ui/ai-presentation.js":
            scanned = scanned.replace("root.addEventListener('keydown',", "SCOPED_AI_EDITOR_SHORTCUT(")
        if label == "keyboard listener" and path == ROOT / "ui/search-experience.js":
            scanned = scanned.replace("input.addEventListener('keydown',", "SCOPED_SEARCH_INPUT(").replace("results.addEventListener('keydown',", "SCOPED_SEARCH_RESULTS(")
        if label == "keyboard listener" and path == ROOT / "ui/archive.js":
            scanned = scanned.replace("document.addEventListener('keydown',", "TRUSTED_ARCHIVE_FIND_ESCAPE(")
        if label == "keyboard listener" and path == ROOT / "ui/thoughts.js":
            scanned = scanned.replace("menu.addEventListener('keydown',", "SCOPED_LIBRARY_MENU_ESCAPE(")
        match = re.search(pattern, scanned, re.I if label == "system keychain" else 0)
        line = text.count("\n", 0, match.start()) + 1 if match else 0
        require(not match, f"{path.relative_to(ROOT)}:{line}: forbidden {label}")
    for match in re.finditer(r"['\"`](https?://[^'\"`\s]+)", text):
        parsed = urlsplit(match.group(1))
        require(parsed.scheme == "https" and parsed.netloc in {"chatgpt.com", "api.deepseek.com"} and (parsed.netloc != "api.deepseek.com" or path == ROOT / "core/organizer/deepseek.js"),
                f"{path.relative_to(ROOT)}: unexpected remote URL literal")
    for match in re.finditer(r"\b(?:chrome\s*\.\s*)?runtime\s*\.\s*getURL\s*\(\s*['\"]([^'\"]+)['\"]\s*\)", text):
        local_reference(match.group(1), ROOT / "manifest.json",
                        f"{path.relative_to(ROOT)} runtime.getURL")
    # Static ES module imports/exports must resolve to packaged files. Never run
    # the code during this audit; synthetic tests exercise its behavior separately.
    for match in re.finditer(r"(?:\bfrom\s*|\bimport\s*)['\"]([^'\"]+)['\"]", text):
        local_reference(match.group(1), path, f"{path.relative_to(ROOT)} import")
    for match in re.finditer(r"\bimport\s*\(\s*['\"]([^'\"]+)['\"]\s*\)", text):
        local_reference(match.group(1), path, f"{path.relative_to(ROOT)} dynamic import")
    require(not re.search(r"\bimport\s*\(\s*[^'\"\s]", text),
            f"{path.relative_to(ROOT)}: nonliteral dynamic import")


class PackageHTML(HTMLParser):
    def __init__(self, path):
        super().__init__()
        self.path = path
        self.in_inline_script = False

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        for name, value in attrs.items():
            require(not name.lower().startswith("on"),
                    f"{self.path.relative_to(ROOT)}: inline event handler {name}")
            require(not (value or "").strip().lower().startswith("javascript:"),
                    f"{self.path.relative_to(ROOT)}: javascript URL")
        require(not (tag == "input" and ((attrs.get("type", "").lower() == "password" and not (self.path == ROOT / "ui/archive.html" and attrs.get("id") == "deepseek-api-key" and attrs.get("autocomplete") == "off")) or (attrs.get("type", "").lower() == "file" and not (self.path == ROOT / "ui/archive.html" and ((attrs.get("id") == "history-file" and attrs.get("accept") == ".zip,.json,application/zip,application/json") or (attrs.get("id") == "backup-file" and attrs.get("accept") == ".paia-backup,.jsonl,application/x-ndjson")))))),
                f"{self.path.relative_to(ROOT)}: file/password input forbidden")
        require(tag not in {"iframe", "object", "embed"},
                f"{self.path.relative_to(ROOT)}: embedded browsing context forbidden")
        require(not (tag == "meta" and attrs.get("http-equiv", "").lower() == "refresh"),
                f"{self.path.relative_to(ROOT)}: meta refresh forbidden")
        for name in ("src", "poster", "data"):
            if attrs.get(name):
                local_reference(attrs[name], self.path, f"{self.path.relative_to(ROOT)} {tag}.{name}")
        if tag in {"link", "use", "image"} and attrs.get("href"):
            local_reference(attrs["href"], self.path, f"{self.path.relative_to(ROOT)} {tag}.href")
        if attrs.get("srcset"):
            for source in attrs["srcset"].split(","):
                local_reference(source.strip().split()[0], self.path,
                                f"{self.path.relative_to(ROOT)} srcset")
        if tag == "script":
            self.in_inline_script = not attrs.get("src")
        if tag == "style":
            require(False, f"{self.path.relative_to(ROOT)}: keep styles in packaged CSS files")

    def handle_endtag(self, tag):
        if tag == "script":
            self.in_inline_script = False

    def handle_data(self, data):
        if self.in_inline_script and data.strip():
            require(False, f"{self.path.relative_to(ROOT)}: inline JavaScript forbidden")


def audit_resources():
    paths = set()
    for dirname in RUNTIME_DIRS:
        directory = ROOT / dirname
        if directory.exists():
            paths.update(path for path in directory.rglob("*") if path.is_file())
    paths.update(path for path in ROOT.iterdir() if path.suffix in {".js", ".mjs", ".html", ".css", ".svg"})
    require(bool(paths), "No runtime resources found")
    for path in sorted(paths):
        require(path.resolve().is_relative_to(ROOT), f"{path.relative_to(ROOT)}: symlink escapes package")
        if not path.resolve().is_relative_to(ROOT):
            continue
        if path.suffix not in {".js", ".mjs", ".html", ".css", ".svg"}:
            continue
        text = path.read_text(encoding="utf-8")
        if path.suffix in {".js", ".mjs"}:
            audit_js(path, text)
        elif path.suffix in {".html", ".svg"}:
            parser = PackageHTML(path)
            parser.feed(text)
            parser.close()
        if path.suffix in {".css", ".svg"}:
            for match in re.finditer(r"url\(\s*['\"]?([^)'\"]+)['\"]?\s*\)", text):
                reference = match.group(1).strip()
                if reference.startswith("#"):
                    continue
                local_reference(reference, path, f"{path.relative_to(ROOT)} CSS URL")
            require(not re.search(r"@import\b", text, re.I),
                    f"{path.relative_to(ROOT)}: CSS imports forbidden")
    return len(paths)


def main():
    audit_manifest()
    count = audit_resources()
    if ERRORS:
        print(f"FAIL: {len(ERRORS)} package guardrail issue(s), {CHECKS} checks")
        for error in ERRORS:
            print(f"- {error}")
        return 1
    print(f"PASS: {CHECKS} package guardrails across {count} runtime resources")
    print("Static audit only; actual logged-in Chrome verification requires separate recorded evidence.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

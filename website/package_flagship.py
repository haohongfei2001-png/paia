#!/usr/bin/env python3
"""Package the generated PAIA site as an offline HTML and a website-only ZIP.

The production site is read, never rewritten. No network or third-party Python
packages are used. All active page dependencies are discovered from the HTML.
"""
from __future__ import annotations

import argparse
import base64
import hashlib
from html.parser import HTMLParser
import json
import mimetypes
from pathlib import Path, PurePosixPath
import re
from urllib.parse import unquote, urljoin, urlsplit
import zipfile


ROOT = Path(__file__).resolve().parents[1]
SITE_ORIGIN = "https://inputarchive.com"
CONTACT_SCRIPT = "/assets/website/flagship-contact.js"
CSS_URL = re.compile(r"url\(\s*(['\"]?)(.*?)\1\s*\)", re.I | re.S)
CSS_IMPORT = re.compile(r"@import\b", re.I)
ASSET_TAGS = {
    "img": ("src", "srcset"),
    "source": ("src", "srcset"),
    "video": ("src", "poster"),
    "audio": ("src",),
    "input": ("src",),
}


def local_path(value: str, base: str) -> str | None:
    """Resolve a site dependency; reject remote fetches and path traversal."""
    value = value.strip()
    if not value or value.startswith(("data:", "blob:", "#")):
        return None
    url = urlsplit(urljoin(SITE_ORIGIN + base, value))
    if url.scheme not in {"http", "https"} or url.netloc != "inputarchive.com":
        raise ValueError(f"Offline dependency is not local: {value!r} in {base}")
    decoded = unquote(url.path)
    if "\\" in decoded or any(p == ".." for p in PurePosixPath(decoded).parts):
        raise ValueError(f"Unsafe dependency path: {decoded}")
    path = "/" + decoded.lstrip("/")
    resolved = (ROOT / path.lstrip("/")).resolve()
    if not resolved.is_relative_to(ROOT.resolve()) or not resolved.is_file():
        raise FileNotFoundError(f"Missing site dependency: {path}")
    return path


def srcset_values(value: str) -> list[str]:
    # Current generated pages do not use data-URI srcsets. Avoid silently
    # splitting a data URI at its comma if a future template introduces one.
    if value.strip().startswith("data:"):
        return []
    return [piece.strip().split()[0] for piece in value.split(",") if piece.strip()]


class DependencyParser(HTMLParser):
    def __init__(self, page: str):
        super().__init__(convert_charrefs=True)
        self.page = page
        self.styles: set[str] = set()
        self.scripts: set[str] = set()
        self.assets: set[str] = set()

    def add(self, value: str, target: set[str]) -> None:
        path = local_path(value, self.page)
        if path:
            target.add(path)

    def handle_starttag(self, tag: str, attributes: list[tuple[str, str | None]]) -> None:
        a = {key: value or "" for key, value in attributes}
        if tag == "script" and a.get("src"):
            path = local_path(a["src"], self.page)
            if path and path != CONTACT_SCRIPT:
                self.scripts.add(path)
        elif tag == "link" and a.get("href"):
            rel = set(a.get("rel", "").lower().split())
            if "stylesheet" in rel:
                self.add(a["href"], self.styles)
            elif rel & {"icon", "apple-touch-icon", "mask-icon"}:
                self.add(a["href"], self.assets)
            elif "preload" in rel and a.get("as") in {"font", "image"}:
                self.add(a["href"], self.assets)
        for attribute in ASSET_TAGS.get(tag, ()):
            if a.get(attribute):
                values = srcset_values(a[attribute]) if attribute == "srcset" else [a[attribute]]
                for value in values:
                    self.add(value, self.assets)
        if a.get("style"):
            for match in CSS_URL.finditer(a["style"]):
                self.add(match[2], self.assets)
        if tag == "meta" and a.get("property") in {"og:image", "twitter:image"} and a.get("content"):
            self.add(a["content"], self.assets)


def embedded_asset(path: str) -> str:
    raw = (ROOT / path.lstrip("/")).read_bytes()
    mime = {".ttf": "font/ttf", ".woff2": "font/woff2", ".woff": "font/woff"}.get(
        Path(path).suffix.lower(), mimetypes.guess_type(path)[0] or "application/octet-stream"
    )
    return f"data:{mime};base64," + base64.b64encode(raw).decode("ascii")


def collect_payload() -> tuple[dict, list[str]]:
    manifest = ROOT / "website/generated-paths.txt"
    paths = [line.strip() for line in manifest.read_text(encoding="utf-8").splitlines() if line.strip()]
    page_paths = sorted(path for path in paths if path.endswith(".html"))
    if len(page_paths) != 57:
        raise ValueError(f"Expected the complete 57-route site, found {len(page_paths)} HTML files")
    pages: dict[str, str] = {}
    styles: set[str] = set()
    scripts: set[str] = set()
    assets: set[str] = set()
    for relative in page_paths:
        path = local_path("/" + relative, "/")
        assert path is not None
        source = (ROOT / relative).read_text(encoding="utf-8")
        parser = DependencyParser(path)
        parser.feed(source)
        pages[path] = source
        styles.update(parser.styles)
        scripts.update(parser.scripts)
        assets.update(parser.assets)
    css: dict[str, str] = {}
    for path in sorted(styles):
        source = (ROOT / path.lstrip("/")).read_text(encoding="utf-8")
        if CSS_IMPORT.search(source):
            raise ValueError(f"Flatten CSS @import before packaging: {path}")

        def normalize_url(match: re.Match) -> str:
            dependency = local_path(match[2], path)
            if dependency:
                assets.add(dependency)
                return 'url("' + dependency + '")'
            return match[0]

        css[path] = CSS_URL.sub(normalize_url, source)
    payload = {
        "version": 1,
        "defaultRoute": "/zh/index.html",
        "pages": pages,
        "styles": css,
        "scripts": {path: (ROOT / path.lstrip("/")).read_text(encoding="utf-8") for path in sorted(scripts)},
        "assets": {path: embedded_asset(path) for path in sorted(assets)},
    }
    return payload, paths


BRIDGE = r"""
(() => {
  'use strict';
  const info = __PAIA_BRIDGE_INFO__;
  const zh = document.documentElement.lang.startsWith('zh');
  const t = (z, e) => zh ? z : e;
  let applyingAnchor = false;
  const send = (type, detail = {}) => parent.postMessage(
    { ...detail, type, token: info.token, route: info.route }, info.parentIsFile ? '*' : info.parentOrigin
  );
  const localDestination = raw => {
    try {
      const url = new URL(raw, info.base + info.route);
      if (url.origin !== info.base) return null;
      return { path: url.pathname, search: url.search, anchor: url.hash.slice(1) };
    } catch { return null; }
  };
  const requestNavigation = destination => send('paia-offline:navigate', destination);
  const applyAnchor = anchor => {
    let id;
    try { id = decodeURIComponent(anchor || ''); } catch { id = anchor || ''; }
    applyingAnchor = true;
    if (document.body.dataset.page === 'demo.html' && ['archive', 'thought', 'context'].includes(id)) {
      const tab = document.querySelector('[data-workspace] [data-space="' + id + '"]');
      if (tab && tab.getAttribute('aria-selected') !== 'true') tab.click();
      const stage = document.querySelector('.demo-stage');
      if (stage) stage.scrollIntoView({ behavior: 'instant', block: 'start' });
    } else if (id) {
      const target = document.getElementById(id);
      if (target) {
        target.scrollIntoView({ behavior: 'instant', block: 'start' });
        if (target.hasAttribute('tabindex')) target.focus({ preventScroll: true });
      }
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
    applyingAnchor = false;
  };
  window.addEventListener('message', event => {
    const data = event.data;
    if (event.source !== parent || (!info.parentIsFile && event.origin !== info.parentOrigin) || !data ||
        data.token !== info.token || data.route !== info.route || data.type !== 'paia-offline:anchor' ||
        typeof data.anchor !== 'string') return;
    applyAnchor(data.anchor);
  });
  const validateOfflineForm = form => {
    if (!(form instanceof HTMLFormElement)) return;
    let result = form.querySelector('[data-offline-form-result]');
    if (result) result.textContent = '';
    if (!form.reportValidity()) return;
    if (!result) {
      result = document.createElement('p');
      result.className = 'pf-form-result';
      result.dataset.offlineFormResult = '';
      result.setAttribute('role', 'status');
      form.append(result);
    }
    result.textContent = t('填写格式有效。离线预览不会发送留言。', 'The form is valid. This offline preview does not send messages.');
  };
  document.addEventListener('click', event => {
    if (applyingAnchor || event.defaultPrevented || event.button !== 0) return;
    const validate = event.target.closest && event.target.closest('[data-offline-validate]');
    if (validate) {
      event.preventDefault();
      validateOfflineForm(validate.closest('form'));
      return;
    }
    const link = event.target.closest && event.target.closest('a[href]');
    if (link) {
      if (link.hasAttribute('download')) return;
      const destination = localDestination(link.getAttribute('href'));
      if (!destination) return;
      // Modified clicks and target=_blank still work as ordinary new-tab links
      // in this file, rather than accidentally opening the production website.
      event.preventDefault();
      if (event.metaKey || event.ctrlKey || event.shiftKey || link.target === '_blank') {
        const address = new URL(info.previewURL);
        address.hash = '#' + destination.path + destination.search + (destination.anchor ? '#' + destination.anchor : '');
        window.open(address.href, '_blank', 'noopener');
      } else {
        requestNavigation(destination);
      }
      return;
    }
    const tab = event.target.closest && event.target.closest('[data-space]');
    if (tab && document.body.dataset.page === 'demo.html') {
      requestNavigation({ path: info.route, search: '', anchor: tab.dataset.space });
    }
  });
  document.addEventListener('submit', event => {
    event.preventDefault();
    validateOfflineForm(event.target);
  }, true);
  const ready = () => {
    send('paia-offline:ready');
    // Embedded font loading can change paragraph height. Reapply the initial
    // anchor once fonts settle; ordinary same-page navigation is immediate.
    if (document.fonts && info.initialAnchor) {
      document.fonts.ready.then(() => {
        requestAnimationFrame(() => applyAnchor(info.initialAnchor));
      });
    }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready, { once: true });
  else ready();
})();
"""


RUNTIME = r"""
(() => {
  'use strict';
  const packageData = JSON.parse(document.getElementById('paia-offline-data').textContent);
  const bridgeSource = JSON.parse(document.getElementById('paia-offline-bridge').textContent);
  const frame = document.getElementById('paia-preview');
  const errorBox = document.getElementById('paia-error');
  const base = 'https://inputarchive.com';
  const parentOrigin = location.origin;
  const parentIsFile = location.protocol === 'file:';
  let activeRoute = '';
  let activeToken = '';
  let ready = false;
  let currentState;
  const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  const bytes64 = source => {
    const bytes = new TextEncoder().encode(source);
    const chunks = [];
    for (let i = 0; i < bytes.length; i += 8192) chunks.push(String.fromCharCode(...bytes.subarray(i, i + 8192)));
    return btoa(chunks.join(''));
  };
  const dataURI = (type, source) => 'data:' + type + ';base64,' + bytes64(source);
  const pathOf = (value, route) => {
    const url = new URL(value, base + route);
    return url.origin === base ? decodeURIComponent(url.pathname) : null;
  };
  const asset = (value, route) => {
    if (!value || /^(data:|blob:|#)/i.test(value)) return value;
    const path = pathOf(value, route);
    if (path && own(packageData.assets, path)) return packageData.assets[path];
    throw new Error('Missing embedded asset: ' + value);
  };
  const cssURLs = source => source.replace(/url\(\s*(['"]?)(.*?)\1\s*\)/gi,
    (match, quote, value) => /^(data:|blob:|#)/i.test(value) ? match : 'url("' + asset(value, '/') + '")');
  const styles = Object.fromEntries(Object.entries(packageData.styles).map(([path, source]) => [path, dataURI('text/css', cssURLs(source))]));
  const scripts = Object.fromEntries(Object.entries(packageData.scripts).map(([path, source]) => [path, dataURI('text/javascript', source)]));
  const normalize = path => {
    try { path = decodeURIComponent(path); } catch { return '/zh/404.html'; }
    if (!path.startsWith('/')) path = '/' + path;
    if (path === '/en' || path === '/zh') path += '/';
    if (path.endsWith('/')) path += 'index.html';
    return own(packageData.pages, path) ? path : (path.startsWith('/zh/') ? '/zh/404.html' : '/404.html');
  };
  const readState = () => {
    const raw = location.hash.slice(1);
    if (!raw || !raw.startsWith('/')) return { route: packageData.defaultRoute, search: '', anchor: '' };
    try {
      const url = new URL(raw, base);
      return { route: normalize(url.pathname), search: url.search, anchor: url.hash.slice(1) };
    } catch { return { route: packageData.defaultRoute, search: '', anchor: '' }; }
  };
  const hashFor = state => {
    const path = state.route.endsWith('/index.html') ? state.route.slice(0, -10) : state.route;
    return '#' + path + (state.search || '') + (state.anchor ? '#' + state.anchor : '');
  };
  const sendAnchor = () => {
    if (!ready) return;
    frame.contentWindow.postMessage({ type: 'paia-offline:anchor', token: activeToken,
      route: activeRoute, anchor: currentState.anchor }, parentIsFile ? '*' : parentOrigin);
  };
  const token = () => {
    const values = new Uint32Array(4);
    crypto.getRandomValues(values);
    return Array.from(values, value => value.toString(16).padStart(8, '0')).join('');
  };
  const offlineForms = doc => {
    const zh = doc.documentElement.lang.startsWith('zh');
    const t = (z, e) => zh ? z : e;
    for (const form of doc.querySelectorAll('form')) {
      form.removeAttribute('action');
      form.removeAttribute('target');
      form.removeAttribute('onsubmit');
      const notice = doc.createElement('p');
      notice.className = 'pf-form-result';
      notice.dataset.offlineFormNotice = '';
      notice.textContent = t('离线预览，不会发送留言。可以检查填写格式。', 'Offline preview. Messages will not be sent. You can check the form fields.');
      form.prepend(notice);
      const consent = form.querySelector('.consent span');
      if (consent) consent.textContent = t('我已了解：离线预览仅检查表单，不会发送内容。', 'I understand that this preview only checks the form and does not send its contents.');
      const privacy = form.querySelector('#form-privacy');
      if (privacy) privacy.textContent = t('这份离线预览不会上传表单内容。', 'This offline preview does not upload the form contents.');
      for (const field of form.querySelectorAll('input[type="hidden"][name^="_"]')) field.remove();
      const submit = form.querySelector('[type="submit"]');
      if (submit) {
        // Without allow-forms, browsers may block submission before firing
        // submit. A plain button can still run native field validation safely.
        submit.type = 'button';
        submit.dataset.offlineValidate = '';
        submit.textContent = t('检查表单（不发送）', 'Check form (no sending)');
      }
      for (const paragraph of form.querySelectorAll('p.small')) {
        if (paragraph !== privacy && /FormSubmit|服务接收|Service acceptance/.test(paragraph.textContent))
          paragraph.textContent = t('此处仅演示联系表单的填写与校验。', 'This example demonstrates form entry and validation only.');
      }
    }
  };
  const buildDocument = state => {
    const doc = new DOMParser().parseFromString(packageData.pages[state.route], 'text/html');
    for (const element of doc.querySelectorAll('base,meta[http-equiv="Content-Security-Policy"]')) element.remove();
    const csp = doc.createElement('meta');
    csp.httpEquiv = 'Content-Security-Policy';
    csp.content = "default-src 'none'; script-src data: 'unsafe-inline'; style-src data: 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'; object-src 'none'";
    doc.head.prepend(csp);
    for (const link of doc.querySelectorAll('link[href]')) {
      const rel = (link.getAttribute('rel') || '').toLowerCase().split(/\s+/);
      if (rel.some(value => ['preconnect', 'dns-prefetch', 'prefetch', 'prerender', 'modulepreload'].includes(value))) { link.remove(); continue; }
      const path = pathOf(link.getAttribute('href'), state.route);
      if (rel.includes('stylesheet')) {
        if (!path || !own(styles, path)) throw new Error('Missing embedded style: ' + path);
        link.href = styles[path];
      } else if (rel.some(value => ['icon', 'apple-touch-icon', 'mask-icon', 'preload'].includes(value))) {
        if (path && own(packageData.assets, path)) link.href = packageData.assets[path];
        else link.remove();
      }
    }
    for (const script of doc.querySelectorAll('script[src]')) {
      const path = pathOf(script.getAttribute('src'), state.route);
      if (path === '/assets/website/flagship-contact.js') { script.remove(); continue; }
      if (!path || !own(scripts, path)) throw new Error('Missing embedded script: ' + path);
      script.src = scripts[path];
    }
    for (const element of doc.querySelectorAll('img[src],source[src],video[src],audio[src],input[src]'))
      element.setAttribute('src', asset(element.getAttribute('src'), state.route));
    for (const element of doc.querySelectorAll('[poster]')) element.setAttribute('poster', asset(element.getAttribute('poster'), state.route));
    for (const element of doc.querySelectorAll('[srcset]')) {
      const value = element.getAttribute('srcset');
      if (!value.trim().startsWith('data:')) element.setAttribute('srcset', value.split(',').map(part => {
        const pieces = part.trim().split(/\s+/); pieces[0] = asset(pieces[0], state.route); return pieces.join(' ');
      }).join(', '));
    }
    for (const element of doc.querySelectorAll('[style]')) element.setAttribute('style', cssURLs(element.getAttribute('style')));
    for (const meta of doc.querySelectorAll('meta[property="og:image"],meta[name="twitter:image"]')) {
      if (meta.content) meta.content = asset(meta.content, state.route);
    }
    for (const link of doc.querySelectorAll('a[href]')) {
      const value = link.getAttribute('href');
      if (/^https?:/i.test(value) && new URL(value).origin !== base) {
        link.target = '_blank'; link.rel = 'noopener noreferrer';
      }
    }
    offlineForms(doc);
    const bridge = doc.createElement('script');
    bridge.defer = true;
    bridge.src = dataURI('text/javascript', bridgeSource.replace('__PAIA_BRIDGE_INFO__', JSON.stringify({
      token: activeToken, route: state.route, base, parentOrigin, parentIsFile, initialAnchor: state.anchor,
      previewURL: location.href.split('#')[0]
    })));
    doc.head.append(bridge);
    document.title = doc.title + ' · 离线预览';
    document.documentElement.lang = doc.documentElement.lang;
    frame.title = doc.title;
    const favicon = document.getElementById('paia-favicon');
    const icon = doc.querySelector('link[rel="icon"]');
    if (icon) favicon.href = icon.href;
    return '<!doctype html>\n' + doc.documentElement.outerHTML;
  };
  const render = () => {
    currentState = readState();
    if (activeRoute === currentState.route) { sendAnchor(); return; }
    try {
      ready = false;
      activeRoute = currentState.route;
      activeToken = token();
      frame.srcdoc = buildDocument(currentState);
      errorBox.hidden = true;
    } catch (error) {
      errorBox.hidden = false;
      errorBox.textContent = '无法打开离线预览 / Unable to open preview: ' + error.message;
      console.error(error);
    }
  };
  window.addEventListener('message', event => {
    const data = event.data;
    if (event.source !== frame.contentWindow || (!parentIsFile && event.origin !== parentOrigin) || !data ||
        data.token !== activeToken || data.route !== activeRoute) return;
    if (data.type === 'paia-offline:ready') { ready = true; sendAnchor(); return; }
    if (data.type !== 'paia-offline:navigate' || typeof data.path !== 'string' ||
        typeof data.search !== 'string' || typeof data.anchor !== 'string') return;
    const next = { route: normalize(data.path), search: data.search, anchor: data.anchor };
    const nextHash = hashFor(next);
    if (location.hash === nextHash) { currentState = next; sendAnchor(); }
    else location.hash = nextHash;
  });
  window.addEventListener('hashchange', render);
  if (!location.hash || !location.hash.startsWith('#/')) history.replaceState(null, '', '#/zh/');
  render();
})();
"""


def safe_json(value: object) -> str:
    # JSON is placed in a raw-text <script> element. Escaping '<' also prevents
    # literal </script> in route text, source JS, or future explanatory copy.
    return json.dumps(value, ensure_ascii=False, separators=(",", ":")).replace("<", "\\u003c").replace("\u2028", "\\u2028").replace("\u2029", "\\u2029")


def preview_html(payload: dict) -> str:
    return """<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>PAIA · 离线预览</title><link id="paia-favicon" rel="icon"><style>
html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#fff;color:#292632;font-family:system-ui,sans-serif}
#paia-preview{display:block;width:100%;height:100vh;height:100dvh;border:0}
#paia-error{position:fixed;inset:20px;padding:24px;background:#fff;border:1px solid #d9d2e1;border-radius:12px;white-space:pre-wrap}
noscript{display:block;padding:40px;line-height:1.8}
</style></head><body><iframe id="paia-preview" title="PAIA 官网离线预览" sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"></iframe><p id="paia-error" role="alert" hidden></p><noscript>请在浏览器中启用 JavaScript，以浏览这份完整的离线网站。 / Enable JavaScript to browse this complete offline website.</noscript>
<script type="application/json" id="paia-offline-data">""" + safe_json(payload) + """</script>
<script type="application/json" id="paia-offline-bridge">""" + safe_json(BRIDGE) + """</script>
<script>""" + RUNTIME.replace("</script", "<\\/script") + """</script></body></html>
"""


SOURCE_README = """# PAIA website source

This package contains the maintainable website sources, website assets and all
57 generated routes (19 English root routes, their /en aliases and 19 Chinese
routes), plus robots.txt and sitemap.xml. It excludes the extension, repository
history, private research, old screenshot receipts, caches and the embedded HTML.

## Open the site

With Python 3.10 or later, open a terminal in this extracted directory:

    python3 -m http.server 4173

Then open http://localhost:4173/zh/ (Chinese) or http://localhost:4173/ (English).
Stop the server with Ctrl+C. This source package preserves the production contact
implementation. The separate PAIA-Preview.html is the offline review artifact;
its contact form never submits.

## Edit and rebuild

    python3 website/build.py
    python3 website/flagship_tests.py --static-only
    python3 website/package_flagship.py --output-dir ../paia-delivery

Edit the Python templates and website assets, not the generated HTML. See
website/README.md and website/OFFLINE_PREVIEW.md for the source and packaging map.
The package script only reads the website and writes its delivery directory.
"""


def source_files(generated: list[str]) -> list[Path]:
    files: set[Path] = set()
    for directory in (ROOT / "website", ROOT / "assets/website"):
        for path in directory.rglob("*"):
            relative = path.relative_to(ROOT)
            if any(part in {"receipts", "__pycache__", ".DS_Store", ".pytest_cache"} for part in relative.parts):
                continue
            if not path.is_file() or path.suffix in {".pyc", ".pyo"}:
                continue
            if path.is_symlink():
                raise ValueError(f"Resolve source symlink before packaging: {relative}")
            files.add(path)
    for relative in generated:
        path = ROOT / relative
        if not path.is_file():
            raise FileNotFoundError(relative)
        files.add(path)
    return sorted(files, key=lambda path: path.relative_to(ROOT).as_posix())


def package(output_dir: Path, check_generated: bool = True) -> dict:
    if check_generated:
        # This check is read-only: a parallel edit must be built by its owner.
        from flagship_site import build_site
        build_site(check=True)
    payload, generated = collect_payload()
    output_dir = output_dir.expanduser().resolve()
    if output_dir == ROOT or output_dir.is_relative_to(ROOT):
        raise ValueError("Use a delivery directory outside the source checkout")
    output_dir.mkdir(parents=True, exist_ok=True)
    preview = output_dir / "PAIA-Preview.html"
    preview.write_text(preview_html(payload), encoding="utf-8")
    archive = output_dir / "PAIA-Website-Source.zip"
    files = source_files(generated)
    with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=7) as zipped:
        zipped.writestr("START-HERE.md", SOURCE_README)
        for path in files:
            zipped.write(path, path.relative_to(ROOT).as_posix())
    report = {
        "preview": str(preview),
        "source_archive": str(archive),
        "routes": len(payload["pages"]),
        "embedded_styles": list(payload["styles"]),
        "embedded_scripts": list(payload["scripts"]),
        "embedded_assets": list(payload["assets"]),
        "preview_bytes": preview.stat().st_size,
        "source_archive_bytes": archive.stat().st_size,
        "source_files": len(files) + 1,
        "preview_sha256": hashlib.sha256(preview.read_bytes()).hexdigest(),
        "source_sha256": hashlib.sha256(archive.read_bytes()).hexdigest(),
        "checks": {"generated_source_current": check_generated, "dependencies_present": True, "html_route_count": 57},
        "browser_verification": "Not performed by the packager. Verify the generated file in a browser.",
    }
    (output_dir / "packaging-report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", type=Path, default=ROOT.parent / "paia-delivery")
    parser.add_argument("--skip-generation-check", action="store_true", help="Package existing generated pages while their owner is editing; not for final delivery")
    args = parser.parse_args()
    print(json.dumps(package(args.output_dir, not args.skip_generation_check), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

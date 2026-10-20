"""Restore only the exact owner-approved 2026-10-21 brand substitutions.

The existing presentation fixture remains the authority for every other byte,
including page content, footer, closing artwork and floating controls. New asset
bytes are separately checked by asset-lock.json and the adopted brand manifest.
"""

_FROZEN_ROUTES = (
    '404.html', 'about.html', 'article-beliefs.html', 'article-context.html',
    'article-reuse.html', 'beta.html', 'blog.html', 'contact.html', 'demo.html',
    'download.html', 'help.html', 'how-it-works.html', 'principles.html',
    'privacy-policy.html', 'status.html', 'terms.html', 'thanks.html', 'use-cases.html',
)
_FROZEN_HTML = frozenset(prefix + route for prefix in ('', 'en/', 'zh/') for route in _FROZEN_ROUTES)

_OLD_ICONS = b'''<link rel="icon" href="/assets/website/brand/paia-icon-v1.png" type="image/png">
<link rel="apple-touch-icon" href="/assets/website/brand/paia-icon-v1.png">'''
_NEW_ICONS = b'''<link rel="icon" href="/assets/website/brand/paia-favicon-soft-blue-32.png" type="image/png" sizes="32x32">
<link rel="icon" href="/assets/website/brand/paia-favicon-soft-blue.svg" type="image/svg+xml" sizes="any">
<link rel="apple-touch-icon" href="/assets/website/brand/paia-app-soft-blue-180.png" sizes="180x180">'''
_HEADER_MARK = '<img class="header-brand-mark" src="/assets/website/brand/paia-symbol-soft-blue.svg" width="32" height="32" alt="" aria-hidden="true">'

_OLD_SITE_CONTEXT = b'''.wordmark:hover {
  color:var(--ink)
}
.small-wordmark {'''
_NEW_SITE_CONTEXT = b'''.wordmark:hover {
  color:var(--ink)
}
.site-header .wordmark {
  gap:.2em
}
.site-header .header-brand-mark {
  display:block;
  width:1em;
  height:1em;
  flex:none
}
.small-wordmark {'''

_OLD_PREVIEW_MARK = b'''.pv-brand-symbol {
  width:32px;
  height:32px;
  background:url('/assets/website/brand/paia-icon-v1.png') center/contain no-repeat
}'''
_NEW_PREVIEW_MARK = b'''.pv-brand-symbol {
  width:32px;
  height:32px;
  background:url('/assets/website/brand/paia-symbol-soft-blue.svg') center/contain no-repeat
}'''


def _restore_once(data, approved, original, name, label):
    count = data.count(approved)
    if count != 1:
        raise AssertionError(f'{name}: exact approved {label} must occur once; found {count}')
    if original in data:
        raise AssertionError(f'{name}: legacy {label} unexpectedly accompanies the approved replacement')
    return data.replace(approved, original, 1)


def restore_approved_brand(name, data):
    """Normalize the bounded adoption only, before the unchanged fixture hash."""
    if name == 'assets/website/site.css':
        return _restore_once(data, _NEW_SITE_CONTEXT, _OLD_SITE_CONTEXT, name, 'header-only CSS')
    if name == 'assets/website/product-experience.css':
        return _restore_once(data, _NEW_PREVIEW_MARK, _OLD_PREVIEW_MARK, name, 'preview mark URL')
    if name not in _FROZEN_HTML:
        return data

    data = _restore_once(data, _NEW_ICONS, _OLD_ICONS, name, 'favicon and touch-icon links')
    prefix, label = ('/zh/', 'PAIA 首页') if name.startswith('zh/') else ('/', 'PAIA home')
    original = f'<div class="brand-lockup"><a class="wordmark" href="{prefix}" aria-label="{label}">PAIA</a></div>'
    approved = original.replace('>PAIA</a>', '>' + _HEADER_MARK + 'PAIA</a>')
    data = _restore_once(data, approved.encode(), original.encode(), name, 'header brand link')
    for asset, version in [('site.css', '20261009b')] + ([('product-experience.css', '20261009a')] if name.endswith('/demo.html') or name == 'demo.html' else []):
        original = f'<link rel="stylesheet" href="/assets/website/{asset}?v={version}">'.encode()
        approved = f'<link rel="stylesheet" href="/assets/website/{asset}?v=20261021brand">'.encode()
        data = _restore_once(data, approved, original, name, asset + ' cache version')
    return data

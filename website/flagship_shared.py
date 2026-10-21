"""Shared website language, routes and accessible line icons."""

def text(lang, zh, en):
    return zh if lang == 'zh' else en

def href(lang, page='index.html'):
    return ('/zh/' if lang == 'zh' else '/') + ('' if page == 'index.html' else page)

def icon(name, cls='icon'):
    paths = {
        'archive': '<rect x="4" y="5" width="16" height="15" rx="3"/><path d="M8 5V3m8 2V3M8 10h8m-8 4h5"/>',
        'thought': '<path d="M4 5.5C7 4.5 9 5 12 7c3-2 5-2.5 8-1.5v14C17 18.5 15 19 12 21c-3-2-5-2.5-8-1.5zM12 7v14"/>',
        'context': '<rect x="4" y="4" width="6" height="6" rx="1.5"/><rect x="14" y="4" width="6" height="6" rx="1.5"/><rect x="4" y="14" width="6" height="6" rx="1.5"/><rect x="14" y="14" width="6" height="6" rx="1.5"/>',
        'arrow': '<path d="M5 12h14m-5-5 5 5-5 5"/>',
        'search': '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>',
        'close': '<path d="m6 6 12 12M6 18 18 6"/>',
        'check': '<path d="m5 12 4 4 10-10"/>',
        'edit': '<path d="m14 4 6 6M4 20l5-1L20 8a2 2 0 0 0-4-4L5 15z"/>',
        'source': '<path d="M9 5H5v14h14v-4M12 4h8v8m0-8L9 15"/>',
        'menu': '<path d="M4 8h16M4 16h16"/>',
        'plus': '<path d="M12 5v14M5 12h14"/>',
        'person': '<circle cx="12" cy="8" r="3.5"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/>',
        'rules': '<path d="M5 6h14M5 12h14M5 18h14"/><circle cx="9" cy="6" r="2" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="2" fill="currentColor" stroke="none"/><circle cx="9" cy="18" r="2" fill="currentColor" stroke="none"/>',
        'now': '<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>',
        'return': '<path d="M8 6 3 11l5 5M3 11h11a6 6 0 0 1 6 6v2"/>',
        'play': '<path d="m9 5 11 7-11 7z"/>',
    }
    return f'<svg class="{cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{paths[name]}</svg>'

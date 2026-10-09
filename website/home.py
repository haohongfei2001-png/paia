"""PAIA product-led website, aligned with the current product visual system.
All examples are fictional. This module does not implement extension capabilities.
"""
from html import escape

def icon(name, cls='art-icon'):
    paths = {
        'collect': '<path d="M15 9h34v43H15zM23 20h18M23 29h18M23 38h10"/><path d="M9 18v39h33"/>',
        'connect': '<rect x="10" y="10" width="18" height="18" rx="3"/><rect x="36" y="10" width="18" height="18" rx="3"/><rect x="10" y="36" width="18" height="18" rx="3"/><rect x="36" y="36" width="18" height="18" rx="3"/>',
        'reuse': '<path d="M14 24a20 20 0 0 1 35-6l5 6M54 11v13H41M50 40a20 20 0 0 1-35 6l-5-6M10 53V40h13"/>',
        'note': '<path d="M16 7h23l9 9v41H16zM39 7v12h9M23 28h18M23 36h18M23 44h12"/>',
        'search': '<circle cx="27" cy="27" r="14"/><path d="m38 38 14 14"/>',
        'arrow': '<path d="M12 32h38M36 18l14 14-14 14"/>',
        'down': '<path d="m17 25 15 15 15-15"/>',
        'topic': '<circle cx="18" cy="32" r="10"/><circle cx="45" cy="13" r="6"/><circle cx="45" cy="51" r="6"/><path d="m26 26 14-10M26 38l14 10"/>',
        'shield': '<path d="m32 7 20 8v17c0 12-10 20-20 25-10-5-20-13-20-25V15zM23 32l6 6 13-15"/>',
        'mark': '<path d="M12 54 29 10h8L20 54zM33 33h9l12 21H44z" fill="currentColor" stroke="none"/>',
    }
    return f'<svg class="{cls}" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{paths[name]}</svg>'

def render(t, a, button, statusmini):
    from product_hero import render_hero
    from flagship_home import render as render_home_story
    return render_hero(t, a, button, icon) + render_home_story(t, a, button, icon)

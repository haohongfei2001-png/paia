"""Visual harmony guards; original wording, geometry and behavior stay authoritative.

This adds material/hierarchy checks to the existing browser suite. It does not
replace the full text, privacy, input, keyboard, or native-wheel assertions.
"""
from pathlib import Path
import hashlib
import re

BASE_SHA = 'bb7a19f48984cc6dacca30b5e57a3aff47aa393b'
MARKER = '/* HARMONY_20261013'
BASE_SOURCE_DIGEST = '8acb1fedec356a2ab16739d0c050a205ee55ec4c100131c89810d30250df4799'
BASE_LAUNCH_SHA256 = '57436bd817b2da4bd397ff5b5c157e496174fefc088082a95d98f261b2661865'


def protected_paths(root):
    paths = (root / 'website/generated-paths.txt').read_text().splitlines()
    # Every pre-existing runtime script and non-publication style remains exact.
    paths += [p.relative_to(root).as_posix() for p in (root / 'assets/website').glob('*.js')]
    paths += [p.relative_to(root).as_posix() for p in (root / 'assets/website').glob('*.css') if p.name != 'launch.css']
    paths += ['website/' + name for name in (
        'build.py', 'home.py', 'product_hero.py', 'core.py', 'art_direction.py',
        'scroll_story.py', 'topic_preview.py', 'prompt_preview.py',
        'product_sections.py', 'product_pages.py', 'pages.py',
        'launch_pages.py', 'launch_copy.py', 'launch_manifest.json',
        'launch_baseline.json', 'launch_invariants.json')]
    return sorted(set(paths))


def source_digest(root):
    records = [name + ':' + hashlib.sha256((root / name).read_bytes()).hexdigest() for name in protected_paths(root)]
    return hashlib.sha256('\n'.join(records).encode()).hexdigest()


def verify_static_harmony(root, check):
    if any(f'data-atelier-version="{v}"' in (root/'index.html').read_text() for v in (9,10,11,12,13,16,17)):
        # The owner replaced only the homepage; all prior assets and interior
        # outputs remain locked to the exact main checkpoint in this manifest.
        from atelier_checks import verify_static
        verify_static(root, check)
    elif 'data-home-mode="presentation"' in (root/'index.html').read_text():
        # Presentation intentionally replaces homepage trial controls. All
        # other delivered pages, demo controllers and original visual sheets
        # remain byte-locked to the approved pre-presentation baseline.
        from presentation_checks import verify_static_presentation
        verify_static_presentation(root,check)
    else:
        check(source_digest(root) == BASE_SOURCE_DIGEST,
              'harmony: all generated copy, privacy directories, original assets/scripts and renderers remain exact')
    style = (root / 'assets/website/launch.css').read_text()
    check(style.count(MARKER) == 1, 'harmony: one scoped visual layer')
    previous, finish = style.split(MARKER, 1)
    # One blank separator belongs to the appended block, not the source prefix.
    check(hashlib.sha256(previous[:-1].encode()).hexdigest() == BASE_LAUNCH_SHA256,
          'harmony: original publication/editorial layer preserved byte for byte')
    for token in ('@import', 'url(', '@font-face', '--story-runway:', '--story-view:', 'pc-palette-wrap', 'data-context-text'):
        check(token not in finish, 'harmony: no new dependency or geometry/data override: ' + token)
    # Unlike the old blanket selector ban, this allows the specifically approved
    # light finish while still forbidding geometry changes to the reading sheet.
    allowed = {'background', 'border-color', 'box-shadow', 'opacity', 'animation', 'display'}
    blocks = re.findall(r'([^{}]+)\{([^{}]*)\}', re.sub(r'/\*.*?\*/', '', finish, flags=re.S))
    sheet_blocks = 0
    for selector, content in blocks:
        if 'ad-thought-expanded' not in selector:
            continue
        properties = {x.split(':', 1)[0].strip() for x in content.split(';') if ':' in x}
        check(properties <= allowed, 'harmony: same-frame sheet has appearance-only declarations')
        if 'display' in properties:
            check('::after' in selector and '.ad-thought-expanded,' not in selector,
                  'harmony: only a decorative pseudo-layer may be hidden')
        sheet_blocks += 1
    check(sheet_blocks >= 5, 'harmony: normal, organized and accessibility surfaces covered')
    check('harmony-light-settle' in finish and 'infinite' not in finish,
          'harmony: a finite light accent, not continuous glow')
    check('prefers-reduced-motion:reduce' in finish and 'forced-colors:active' in finish,
          'harmony: both motion and contrast alternatives are explicit')


def verify_harmony(page, check, label='site'):
    def test(ok, text):
        check(ok, label + ': harmony ' + text)
    page_name = page.locator('body').get_attribute('data-page')
    test(page.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--harmony-paper').trim().length>0"),
         'shared surface hierarchy is loaded with the original stylesheet')
    if page_name != 'index.html':
        return
    forced = page.evaluate("matchMedia('(forced-colors:active)').matches")
    backing = page.locator('.hero-stack i').evaluate_all("es=>es.filter(e=>getComputedStyle(e).display!=='none').length")
    test(backing <= 1, 'opening has at most one supporting plane')
    if not forced:
        test(page.locator('.optical-sheet').evaluate("e=>getComputedStyle(e).boxShadow==='none' && parseFloat(getComputedStyle(e).borderTopWidth)===0"),
             'ambient light is not another framed slab')
        test(page.locator('.hero-product-glass').evaluate("e=>getComputedStyle(e).backdropFilter.includes('blur(')"),
             'product preview retains its glass identity')
        shadows = [page.locator(sel).first.evaluate('e=>getComputedStyle(e).boxShadow') for sel in (
            '.pc-record', '.pc-context-card', '.ad-prompt-scroll .ad-host')]
        test(len(set(shadows)) == 1, 'paper, directory and neutral host share a quiet contact shadow')
        test(page.locator('.ad-prompt-scroll .ad-host').evaluate("e=>getComputedStyle(e).backgroundColor==='rgb(255, 255, 255)'"),
             'ChatGPT-like host stays neutral white')
    test(page.locator('[data-context-overview] textarea,[data-context-overview] [data-context-text]').count() == 0,
         'Context remains a directory, not a body preview')
    test(page.locator('[data-context-card]').count() == 4, 'all four independent Context directories remain')
    test(page.locator('.pc-thought').evaluate_all("es=>es.every(e=>getComputedStyle(e).boxShadow==='none')"),
         'continuous reading is not turned into individual glass cards')
    test(page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'), 'normal viewport has no horizontal page overflow')

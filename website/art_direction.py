"""Homepage-only compositions assembled from the existing, unchanged copy.

This module moves exact HTML fragments; it does not maintain a second copy deck,
product model or interaction owner. The standalone example is untouched.
"""
from dataclasses import dataclass, field
from html.parser import HTMLParser

VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}

@dataclass
class Element:
    tag: str
    attrs: dict
    start: int
    opening_end: int
    end: int = 0
    closing_start: int = 0
    children: list = field(default_factory=list)

class Fragments(HTMLParser):
    """Locate balanced element ranges without serializing their original bytes."""
    def __init__(self, source):
        super().__init__(convert_charrefs=False)
        self.source, self.elements, self.stack = source, [], []
        self.starts = [0]
        for i, c in enumerate(source):
            if c == '\n': self.starts.append(i + 1)
        self.feed(source)
        if self.stack: raise ValueError('Unclosed homepage fragments')
    def position(self):
        line, column = self.getpos()
        return self.starts[line - 1] + column
    def handle_starttag(self, tag, attrs):
        start = self.position()
        node = Element(tag, dict(attrs), start, start + len(self.get_starttag_text()))
        if self.stack: self.stack[-1].children.append(node)
        self.elements.append(node)
        if tag in VOID: node.end = node.closing_start = node.opening_end
        else: self.stack.append(node)
    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID:
            node = self.stack.pop(); node.end = node.closing_start = node.opening_end
    def handle_endtag(self, tag):
        if not self.stack or self.stack[-1].tag != tag:
            raise ValueError(f'Unbalanced closing tag: {tag}')
        node = self.stack.pop(); node.closing_start = self.position()
        node.end = self.source.index('>', node.closing_start) + 1
    def one(self, cls=None, attr=None):
        matches = [n for n in self.elements if (cls is None or cls in n.attrs.get('class', '').split()) and (attr is None or attr in n.attrs)]
        if len(matches) != 1: raise ValueError(f'Expected one {cls or attr}, got {len(matches)}')
        return matches[0]
    def outer(self, node): return self.source[node.start:node.end]
    def inner(self, node): return self.source[node.opening_end:node.closing_start]
    def opened(self, node): return self.source[node.start:node.opening_end]
    def swap(self, node, value): return self.source[:node.start] + value + self.source[node.end:]

def recompose(source, t):
    """The existing four sections remain the sole content and behavior source."""
    d = Fragments(source)
    source = d.swap(d.one('pc-nav'), '')
    source = source.replace('class="paia-core"', 'class="paia-core art-directed art-refined"', 1)

    # A working folio, not a second whole-application screenshot. The original
    # location chrome remains available in a small, explicitly opened disclosure.
    d = Fragments(source); section = d.one('pc-review'); s = Fragments(d.outer(section))
    primary = s.outer(s.one('pc-primary-nav')); sidebar = s.outer(s.one('pc-sidebar'))
    modified = s.source.replace(primary, '', 1).replace(sidebar, '', 1)
    modified = modified.replace('rows="2" maxlength="1500"', 'rows="1" maxlength="1500"')
    loc = f'<details class="ad-location"><summary>{t("位置", "Location")} <span aria-hidden="true">⌄</span></summary><div class="ad-location-map">{primary}{sidebar}</div></details>'
    # Keep the disclosure outside the reader-tools flex row so opened controls
    # cannot resize or obscure the continuous document unexpectedly.
    x = Fragments(modified); reader = x.one('pc-reader')
    modified = x.swap(reader, x.opened(reader) + loc + x.inner(reader) + '</div>')
    x = Fragments(modified)
    proof = x.outer(x.one('pc-version-chip'))
    modified = modified.replace(proof, '', 1)
    x = Fragments(modified)
    heading = x.one('pc-heading')
    modified = x.swap(heading, x.outer(heading) + '<div class="ad-archive-proof">' + proof + '</div>')
    source = d.swap(section, modified)

    # An editorial spread: continuous reading occupies the broad left page;
    # the existing title and prose form its right-hand margin.
    d = Fragments(source); section = d.one('pc-topics'); s = Fragments(d.outer(section))
    heading = s.outer(s.one('pc-heading')); stage = s.outer(s.one('pc-topic-stage')); foot = s.outer(s.one('pc-section-foot'))
    # A catalogue spread uses the actual topic headings and Section links as
    # its visual subject, not another miniaturized application screenshot.
    q = Fragments(stage)
    toolbar = q.outer(q.one('pc-topic-toolbar'))
    stage = q.opened(q.elements[0]) + '<div class="ad-library-editorial">' + heading + '</div><div class="ad-library-content">' + q.inner(q.elements[0]) + '</div></div>'
    topic_symbols = {
        'product': '<path d="M12 14h30v32H12zM18 10h30v32M19 23h16M19 30h16M19 37h10"/>',
        'writing': '<path d="M15 10h24l9 9v30H15zM39 10v11h9M23 30h16M23 38h12"/><path d="m11 44 5 5"/>',
        'learning': '<path d="M30 17c-6-5-14-6-23-4v33c9-2 17-1 23 4 6-5 14-6 23-4V13c-9-2-17-1-23 4Z M30 17v33M14 23l9 2M14 30l9 2M37 25l9-2M37 32l9-2"/>',
    }
    for key, paths in topic_symbols.items():
        needle = f'data-topic-block="{key}">'
        stage = stage.replace(needle, needle + f'<svg class="ad-topic-symbol" viewBox="0 0 60 60" fill="none" stroke="currentColor" stroke-width="1" aria-hidden="true">{paths}</svg>', 1)
    source = d.swap(section, s.opened(s.elements[0]) + '<div class="ad-reading-spread">' + stage + foot + '</div></section>')

    # A full-width demonstration field, with the two collapsed silhouettes
    # alongside the actual expandable narrow board, rather than a row of cards.
    d = Fragments(source); section = d.one('pc-prompts'); s = Fragments(d.outer(section))
    copy = s.one('pc-prompt-copy'); body = s.outer(s.one('pc-body-copy')); mechanics = s.outer(s.one('pc-prompt-mechanics')); plan = s.outer(s.one('pc-plan-note'))
    title = s.inner(copy).replace(body, '', 1).replace(mechanics, '', 1).replace(plan, '', 1)
    answer = s.outer(s.one('pc-answer')); palette = s.outer(s.one('pc-palette-wrap')); composer = s.outer(s.one('pc-composer')); suggestion = s.outer(s.one('pc-suggestion-wrap'))
    capsule = f'<button type="button" class="ad-capsule" data-ad-capsule aria-controls="pc-prompt-card" aria-expanded="false" hidden disabled><i class="paia-orb" aria-hidden="true"></i><span data-ad-capsule-text></span><span aria-hidden="true">⌃</span></button>'
    q = Fragments(palette); shell = q.elements[0]
    palette = q.opened(shell) + capsule + q.inner(shell) + '</div>'
    shape_label = t('展示形态', 'Display shape')
    shapes = f'''<div class="ad-shapes" role="group" aria-label="{shape_label}">
<button type="button" class="ad-shape ad-shape-orb" data-ad-shape="orb" aria-pressed="false" disabled><span class="ad-shape-object"><i class="paia-orb" aria-hidden="true"></i></span><span>{t('悬浮球', 'Floating orb')}</span></button>
<button type="button" class="ad-shape ad-shape-capsule" data-ad-shape="capsule" aria-pressed="false" disabled><span class="ad-shape-object"><span class="ad-capsule-sample" aria-hidden="true"><i class="paia-orb"></i><span data-ad-specimen-text></span><span>⌃</span></span></span><span>{t('悬浮胶囊', 'Floating capsule')}</span></button>
<button type="button" class="ad-shape ad-shape-board" data-ad-shape="board" aria-pressed="true" disabled><span class="ad-shape-object"><svg viewBox="0 0 72 44" fill="none" aria-hidden="true"><rect x="1" y="1" width="70" height="42" rx="10"/><path d="M14 13h44M14 22h34M14 31h39"/></svg></span><span>{t('悬浮板', 'Floating board')}</span></button>
</div>'''
    field = '<div class="ad-prompt-field"><div class="ad-prompt-display">' + shapes + '<div class="pc-prompt-scene ad-host" data-ad-host data-open="true" data-collapsed="orb">' + answer + palette + composer + '</div></div>' + suggestion + '</div>'
    composed = s.opened(s.elements[0]) + '<div class="wrap pc-split">' + field + '<div class="pc-prompt-copy ad-prompt-heading">' + title + body + mechanics + plan + '</div></div></section>'
    source = d.swap(section, composed)

    # Four independent cards flank the unchanged editorial text, with no
    # nested faux desktop window. Opening a card still uses the original detail.
    d = Fragments(source); section = d.one('pc-context'); s = Fragments(d.outer(section))
    heading = s.outer(s.one('pc-heading')); workspace = s.one('pc-context-workspace'); bar = s.outer(s.one('pc-context-bar')); connection = s.outer(s.one('pc-context-connection'))
    inside = s.inner(workspace).replace(bar, '', 1).replace(connection, '', 1)
    composed = s.source.replace(heading, '', 1)
    card_symbols = {
        'info':'<circle cx="20" cy="13" r="5"/><path d="M10 32v-3a10 10 0 0 1 20 0v3"/>',
        'rules':'<path d="M8 12h24M8 20h24M8 28h24"/><circle cx="16" cy="12" r="3" fill="var(--ad-card,#fff)"/><circle cx="26" cy="20" r="3" fill="var(--ad-card,#fff)"/><circle cx="14" cy="28" r="3" fill="var(--ad-card,#fff)"/>',
        'now':'<circle cx="20" cy="20" r="12"/><path d="M20 12v9l6 4"/>',
        'inputs':'<path d="M20 12c-4-3-8-3-13-2v21c5-1 9-1 13 2 4-3 8-3 13-2V10c-5-1-9-1-13 2Zm0 0v21"/>',
    }
    for key, paths in card_symbols.items():
        needle = f'data-context-card="{key}">'
        inside = inside.replace(needle, needle + f'<svg class="ad-card-symbol" viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{paths}</svg>', 1)
    new_workspace = s.opened(workspace) + '<div class="ad-context-field"><div class="ad-context-copy">' + heading + '</div><div class="ad-card-deck">' + bar + inside + connection + '</div></div></div>'
    composed = composed.replace(s.outer(workspace), new_workspace, 1)
    source = d.swap(section, composed)
    # Validate all balanced boundaries after assembly; original text bytes are
    # independently compared in art_direction_checks.py, not inferred here.
    headings = Fragments(source)
    for node in reversed(headings.elements):
        if node.tag == 'h2' and node.attrs.get('id') in {'pc-review-title','pc-topics-title','pc-prompts-title','pc-context-title'}:
            literal = headings.inner(node)
            if '<br>' in literal:
                a, b = literal.split('<br>', 1)
                replacement = headings.opened(node) + a + '<br><span class="ad-title-tail">' + b + '</span></h2>'
                source = source[:node.start] + replacement + source[node.end:]
    Fragments(source)
    return source

"""Homepage-only layout adjustment of the live site. Existing prose is not rewritten.
The standalone Demo, hero, product models, source data and permissions stay owned
by their original modules. New text is limited to requested display-state labels.
"""
import re
from html import escape


def apply_home_layout(html, t):
    html = html.replace('class="paia-core"', 'class="paia-core layout-adjusted"', 1)
    html, count = re.subn(r'<nav class="pc-nav wrap".*?</nav>\n', '', html, count=1, flags=re.S)
    assert count == 1

    # Remove the repeated full application's two navigation rails, not the hero.
    # Keep the actual editable Reader and every source record, at readable size.
    html, count = re.subn(r'<nav class="pc-primary-nav".*?</nav><aside class="pc-sidebar">.*?</aside>', '', html, count=1, flags=re.S)
    assert count == 1

    # Move existing access explanations beside the Context workspace instead of
    # placing another copy block above the entire graphic. No permission changes.
    access = re.search(r'<aside class="pc-access pc-access-four">.*?</aside>', html, re.S)
    assert access
    access_markup = access.group(0).replace('<aside ', '<div ', 1).replace('</aside>', '</div>')
    html = html[:access.start()] + html[access.end():]
    context_start = html.index('<section class="pc-section pc-context"')
    stage_start = html.index('<div class="pc-context-stage', context_start)
    heading_end = html.rfind('</div>', context_start, stage_start)
    html = html[:heading_end] + access_markup + html[heading_end:]

    # Three *alternative* states of the same companion. This is a website
    # selector, not automatic Orb -> Capsule -> Board activation or a new setting.
    options = [('orb', t('悬浮球', 'Orb')), ('capsule', t('悬浮胶囊', 'Capsule')), ('board', t('悬浮板', 'Board'))]
    selectors = '<div class="layout-state-picker" role="group" aria-label="'+t('切换示例展示形态','Choose an example display state')+'">'
    for key, label in options:
        selectors += f'<button type="button" data-surface-view="{key}" aria-pressed="{str(key == "board").lower()}" disabled><span class="layout-state-icon is-{key}" aria-hidden="true"></span><span>{label}</span></button>'
    selectors += '</div>'
    selectors += '<div class="layout-chat-host" data-surface-state="board">'
    start = '<div class="pc-prompt-scene pc-reveal">'
    assert start in html
    html = html.replace(start, start + selectors, 1)

    capsule = '<button type="button" class="layout-capsule" data-surface-capsule aria-expanded="false" aria-controls="pc-prompt-card" hidden disabled><i class="paia-orb" aria-hidden="true"></i><span>'+escape(t('结合我的实际约束重新分析。','Re-evaluate this using my actual constraints.'))+'</span></button>'
    marker = '<div class="pc-palette" id="pc-prompt-card">'
    assert marker in html
    html = html.replace(marker, capsule + marker, 1)

    # The existing reply-suggestion demo remains separate from display modes.
    begin = html.index('<div class="pc-suggestion-wrap">')
    end = html.index('<div class="pc-composer">', begin)
    suggestions = html[begin:end]
    html = html[:begin] + html[end:]
    boundary = '</div></div></div>\n</div></section>'
    begin = html.index('<div class="pc-prompt-scene')
    end = html.index(boundary, begin)
    html = html[:end] + html[end:].replace(boundary, '</div></div></div>'+suggestions+'</div>\n</div></section>', 1)
    return html

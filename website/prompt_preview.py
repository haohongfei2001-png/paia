"""Prompt Surface: quiet rows, contextual management and a separate suggestion.
All controls operate on fictional, ephemeral webpage content only.
"""
from html import escape


def prompt_section(t, ctl):
    prompts = [
        t('结合我的实际约束重新分析。', 'Re-evaluate this using my actual constraints.'),
        t('给出最强的反例和遗漏变量。', 'Give the strongest counterexample and missing variables.'),
        t('把结论转成三个具体的下一步。', 'Turn the conclusion into three specific next steps.'),
    ]
    rows = []
    for i, value in enumerate(prompts):
        rows.append(f'''<div class="pc-prompt-row" data-prompt-row="{i}">
{ctl(escape(value), f'data-prompt-pick="{i}"', 'pc-prompt-pick')}
{ctl('···', f'data-prompt-manage="{i}" aria-expanded="false" aria-controls="pc-prompt-manage-{i}" aria-label="{t("管理这条提示词", "Manage this prompt")}"', 'pc-row-menu')}
<div class="pc-prompt-management" id="pc-prompt-manage-{i}" hidden><div class="pc-prompt-rank"><span data-rank>{i+1:02d}</span><span class="pc-grip" aria-hidden="true">⠿</span></div><div class="pc-prompt-wording"><label class="visually-hidden" for="pc-prompt-{i}">{t('编辑常用提示词', 'Edit frequent prompt')} {i+1}</label><textarea id="pc-prompt-{i}" data-prompt-text rows="2" maxlength="350" disabled>{escape(value)}</textarea></div><div class="pc-prompt-actions">{ctl('↑', 'data-move="-1" aria-label="' + t('上移提示词', 'Move prompt up') + '"', 'pc-tiny')}{ctl('↓', 'data-move="1" aria-label="' + t('下移提示词', 'Move prompt down') + '"', 'pc-tiny')}{ctl(t('固定', 'Pin'), 'data-pin aria-pressed="false" aria-label="' + t('固定提示词', 'Pin prompt') + '"', 'pc-pin')}{ctl('↗', 'data-insert aria-label="' + t('填入示例输入框', 'Insert into example composer') + '"', 'pc-insert')}</div></div></div>''')
    return f'''<section class="pc-section pc-prompts" id="prompt-reuse" aria-labelledby="pc-prompts-title"><div class="wrap pc-split">
<div class="pc-prompt-copy"><p class="eyebrow">03 / PERSONAL PROMPTS</p><h2 id="pc-prompts-title">{t('好用的表达，<br>随手再用。', 'Your best prompts.<br>Always within reach.')}</h2><p class="pc-body-copy">{t('那些反复帮到你的表达，不必再从旧对话里翻找。打开轻透的小面板，点一行填入；需要时再修改、排序或固定。什么时候发送，始终由你决定。', 'Keep the phrases that help you close at hand. Open the light, translucent panel and choose a line to fill the composer. Edit, reorder or pin it when needed. You always decide when to send.')}</p>
<div class="pc-prompt-mechanics"><div><span>01</span><strong>{t('轻轻展开', 'Open when you need it')}</strong></div><div><span>02</span><strong>{t('保留自己的说法', 'Keep your own wording')}</strong></div><div><span>03</span><strong>{t('填入后，自己发送', 'Insert, then choose to send')}</strong></div></div>
<p class="pc-plan-note"><span>{t('可选本地建议', 'OPTIONAL LOCAL SUGGESTIONS')}</span>{t('主动开启后，PAIA 可参考刚完成的回复，找到适合接着用的已有提示词。本页只有预设示例，不读取真实对话。', 'After you enable it, PAIA can use the latest reply locally to suggest a saved prompt. This page uses only a preset and reads no real conversation.')}</p></div>
<div class="pc-prompt-scene pc-reveal"><div class="pc-answer"><div class="pc-window-bar"><span class="pc-dot"></span><span>{t('对话示意', 'EXAMPLE CONVERSATION')}</span><span aria-hidden="true">↗</span></div><div class="pc-answer-body"><span class="pc-ai-glyph" aria-hidden="true">✳</span><p>{t('先比较两个方向：帮助创作者找回已有素材，或继续增加生成能力。下一步，可以按你的约束做取舍。', 'Compare two directions: helping creators recover existing material, or adding generation features. Next, weigh them against your constraints.')}</p><span class="pc-answer-end">{t('回答结束', 'Response complete')} <i aria-hidden="true"></i></span></div></div>
<div class="pc-palette-wrap">{ctl('<i class="paia-orb" aria-hidden="true"></i>', 'data-prompt-toggle aria-expanded="true" aria-controls="pc-prompt-card" aria-label="' + t('开关个人提示词面板', 'Toggle the personal prompt panel') + '"', 'pc-orb-button')}
<div class="pc-palette" id="pc-prompt-card"><div data-prompt-list>{''.join(rows)}</div></div>
<p class="pc-prompt-caption"><span class="pc-local-tag">{t('个人提示词 · 示例', 'PERSONAL PROMPTS · EXAMPLE')}</span><span>{t('点一行填入 · ··· 修改或整理', 'Choose a line to insert · ··· to manage')}</span></p></div>
<div class="pc-suggestion-wrap"><div class="pc-suggestion-head"><span>{t('回复后的建议 · 预设示意', 'AFTER THE REPLY · PRESET')}</span>{ctl(t('显示建议', 'Show suggestion'), 'data-suggestion-toggle aria-expanded="false" aria-controls="pc-local-suggestion"', 'pc-quiet')}</div><div class="pc-suggestion" id="pc-local-suggestion" hidden>{ctl(escape(prompts[0]), 'data-suggestion', 'pc-suggestion-button')}</div></div>
<div class="pc-composer"><label for="pc-composer">{t('下一条输入', 'YOUR NEXT INPUT')}</label><textarea id="pc-composer" rows="2" maxlength="1000" placeholder="{t('点一条常用表达，填入这里…', 'Choose a prompt to insert here…')}" disabled></textarea><div><span data-prompt-status role="status">{t('只填入，不自动发送', 'Inserts only. Never sends automatically.')}</span><span class="pc-send-decoration" aria-hidden="true">↑</span></div></div></div>
</div></section>'''

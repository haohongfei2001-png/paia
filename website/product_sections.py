"""Approved consumer capabilities, illustrated with page-local fictional data.

The four Context cards are independent. These controls are an illustration, not
an issuer of product permissions or a connection to personal material.
"""


def context_section(t, a, ctl, sample):
    cards = [
        ('info', t('我的信息', 'My Information'),
         t('你希望 AI 了解的背景。', 'Background you want AI to know.'),
         ('我在自学，也用短文检验自己是否真正理解。', 'I study on my own and use short articles to test my understanding.')),
        ('rules', t('我的规则', 'My Rules'),
         t('你希望它如何回应。', 'How you want it to respond.'),
         ('先给结论，再说明依据；不确定的地方请说清楚。', 'Lead with the conclusion, then the evidence. Say when something is uncertain.')),
        ('now', t('我的现在', 'My Now'),
         t('眼下在做什么，哪些条件变了。', 'What you are working on, and what has changed.'),
         ('正在把两周的学习观察写成文章，只讨论自己的经历。', 'I am turning two weeks of learning observations into an article about my own experience.')),
    ]
    def capsule(key, title, attr='data-card-allow'):
        label = (f'<span class="pc-topic-name">{title}</span><span data-topic-access-state>{t("仅自己", "Only me")}</span>' if attr == 'data-topic-allow' else t('仅自己', 'Only me'))
        return ctl(label, f'{attr}="{key}" aria-pressed="false" aria-label="{t("切换访问", "Toggle access")} — {title} {t("（示例）", "(example)")}"', 'pc-card-permission')
    manual = ''.join(f'''<article class="pc-context-card" data-context-card="{key}">
<button type="button" class="pc-card-open" data-card-open="{key}" disabled><strong>{title}</strong><span class="pc-card-description">{description}</span><span data-card-count="{key}">{t('1 条内容', '1 item')}</span></button>
{capsule(key, title)}</article>''' for key, title, description, value in cards)
    details = ''.join(f'''<section class="pc-context-detail" data-card-detail="{key}" hidden aria-labelledby="pc-detail-{key}">
{ctl(t('返回四卡概览', 'Back to the four cards'), 'data-context-back', 'pc-quiet')}
<h3 id="pc-detail-{key}" tabindex="-1">{title}</h3><p>{description}</p>
<div data-context-entry="{key}"><label class="visually-hidden" for="pc-context-{key}">{t('编辑', 'Edit')} {title} {t('示例', 'example')}</label>
<textarea id="pc-context-{key}" data-context-text="{key}" rows="5" maxlength="700" disabled>{sample(*value)}</textarea>
<small>{t('修改只保留在本页。计划中的自动维护会尊重你的修改和删除。', 'Edits stay on this page. Planned automatic maintenance will respect your edits and removals.')}</small>
{ctl(t('删除这条示例内容', 'Remove this example item'), f'data-context-remove="{key}"', 'pc-quiet')}</div>
<div data-context-empty="{key}" hidden><p>{t('这张卡片已没有内容。', 'This card has no items.')}</p>{ctl(t('撤销删除', 'Undo removal'), f'data-context-undo="{key}"', 'pc-control')}</div></section>''' for key, title, description, value in cards)
    return f'''<section class="pc-section pc-context" id="personal-context" aria-labelledby="pc-context-title"><div class="wrap">
<div class="pc-heading"><div><p class="eyebrow">04 / AI CONTEXT</p><h2 id="pc-context-title">{t('让 AI 更懂你，<br>边界由你定义。', 'More understanding.<br>On your terms.')}</h2></div>
<div class="pc-intro"><p>{t('用四张卡片管理背景、规则、近况和开放的主题。连接可用后，获准的 AI 将按需读取，不必每次整理一份材料。你随时可以修改内容、暂停访问或撤回允许。', 'Manage your background, rules, current work and open topics in four cards. Once connections are available, an authorized AI will read what it needs within your permissions. Edit the content, pause access or withdraw permission whenever you choose.')}</p>
<span class="pc-instruction">{t('试着只开放一张卡片或一个主题。', 'Try allowing just one card or topic.')} <span aria-hidden="true">↙</span></span></div></div>
<div class="pc-context-stage pc-context-four pc-reveal" data-demo-permissions="default-off">
<div class="pc-context-workspace"><header class="pc-context-bar"><span class="pc-app-name">PAIA <span>/ AI CONTEXT</span></span>{ctl(t('AI 访问：关', 'AI access: off'), 'data-context-global aria-pressed="false"', 'pc-master-permission')}</header>
<div class="pc-context-grid" data-context-overview>{manual}
<article class="pc-context-card" data-context-card="inputs"><button type="button" class="pc-card-open" data-card-open="inputs" disabled><strong>{t('我的输入', 'My Inputs')}</strong><span class="pc-card-description">{t('允许深入读取的个人主题。', 'Personal topics open for in-depth reading.')}</span><span data-topic-count>{t('尚未开放主题', 'No topics open')}</span></button>{capsule('inputs', t('我的输入', 'My Inputs'))}</article>
</div>{details}
<section class="pc-context-detail" data-card-detail="inputs" hidden aria-labelledby="pc-detail-inputs">{ctl(t('返回四卡概览', 'Back to the four cards'), 'data-context-back', 'pc-quiet')}<h3 id="pc-detail-inputs" tabindex="-1">{t('我的输入', 'My Inputs')}</h3>
<p>{t('逐个决定哪些主题可以深入读取。', 'Decide which topics can be read in depth.')}</p>
<div class="pc-topic-permissions">{capsule('product', t('学过以后，留下什么', 'What stays after learning'), 'data-topic-allow')}{capsule('writing', t('写作习惯', 'Writing practice'), 'data-topic-allow')}</div>
<p class="pc-access-help">{t('新主题默认关闭。关闭输入卡或暂停全局访问，都会保留这里的选择。', 'New topics start closed. Closing My Inputs or pausing global access keeps these choices.')}</p></section>
<p class="pc-context-connection">{t('默认全部关闭 · 没有真实 AI 连接', 'All scopes start off · No real AI connection')}</p></div>
<div class="pc-access pc-access-four"><span class="pc-local-tag">{t('连接体验 · 规划中', 'CONNECTIONS · PLANNED')}</span>
<h3>{t('允许什么，<br>一目了然。', 'A clear view<br>of what is allowed.')}</h3>
<p class="pc-access-help">{t('和真实首次使用一样，示例也默认全部关闭。试着只开放“我的输入”中的学习主题，看看实际范围。', 'Like first use in the product, this example starts with every scope off. Try allowing just the learning topic within My Inputs and inspect the scope.')}</p>
<div class="pc-context-preview" data-context-preview aria-live="polite" role="region" tabindex="0" aria-label="{t('当前允许范围预览','Current allowed scope preview')}"><p>{t('没有内容在允许范围内。', 'No content is in the allowed scope.')}</p></div>
<div class="pc-access-bottom"><span data-access-state role="status">{t('尚未开放 · 未连接 AI', 'Nothing allowed · No AI connected')}</span>
{ctl(t('暂停全部', 'Pause all'), 'data-context-pause', 'pc-control')}
{ctl(t('撤回全部允许', 'Withdraw all permissions'), 'data-context-clear', 'pc-quiet')}</div>
<p class="pc-access-boundary">{t('AI 连接尚未开放。本页不连接、不发送内容。', 'Real connections are not available yet. This page never connects or sends.')}</p>
<details class="pc-scope-details"><summary>{t('关闭一个主题会怎样？', 'What happens when you close a topic?')}</summary><p>{t('这个主题不再开放。其他卡片中独立保存的内容仍按各自的开关管理。撤回会阻止之后的读取，不能收回已经送达外部 AI 的内容。', 'That topic leaves the allowed scope. Items saved independently in other cards keep their own controls. Revoking access stops future reads; it cannot recall content already delivered to an external AI.')}</p></details>
</div></div>
<div class="pc-section-foot"><span>{t('我的信息 / 我的规则 / 我的现在 / 我的输入', 'MY INFORMATION / MY RULES / MY NOW / MY INPUTS')}</span><p>{t('未开放的主题不会被读取，也不会转而读取整个输入档案。', 'Closed topics stay closed. Access does not fall back to your entire Input Archive.')}</p></div>
</div></section>'''


def sync_section(t, a):
    return f'''<section class="pc-sync wrap" aria-labelledby="pc-sync-title">
<div><p class="eyebrow">{t('本地优先 · 同步规划', 'LOCAL FIRST · SYNC PLANNED')}</p><h2 id="pc-sync-title">{t('换一台设备，<br>继续自己的积累。', 'Your archive.<br>Room to carry on.')}</h2></div>
<div><p>{t('日常保存、查找、编辑和提示词复用在本地完成。计划中的可选同步会使用你自己的浏览器云账号，让同一生态的新设备恢复已成功同步的资料。', 'Everyday capture, search, editing and prompt reuse work locally. Planned optional sync will use your own browser cloud account to restore successfully synced material on a new device in the same ecosystem.')}</p>
<dl class="pc-sync-mapping"><div><dt>Chrome</dt><dd>Google Drive</dd></div><div><dt>Edge</dt><dd>OneDrive</dd></div><div><dt>Safari</dt><dd>iCloud</dd></div></dl>
<p class="pc-sync-note">{t('由你主动开启；真实云同步仍在开发。不同浏览器生态之间不会自动互通。', 'You choose whether to enable it. Cloud sync is still in development; different browser ecosystems will not sync with one another automatically.')}</p>{a('principles.html',t('了解数据与权限', 'Data and permissions'), 'text-link')}</div></section>'''

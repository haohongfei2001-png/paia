"""Owner-selected editorial website. Original fictional text; no generated photography.
The collage is a website illustration, not an extension screenshot or AI inference.
"""
from html import escape


def icon(name):
    paths = {
        'record': '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8M14 3l5 5h-5V3ZM8 9h3M8 13h5M8 17h3"/><circle cx="17" cy="16" r="4"/><path d="m20 19 3 3"/>',
        'relation': '<circle cx="6" cy="12" r="3"/><circle cx="19" cy="5" r="3"/><circle cx="19" cy="19" r="3"/><path d="m9 10 7-4M9 14l7 4"/>',
        'reuse': '<path d="M10 4H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-5M13 3h8v8M21 3 10 14"/>',
        'control': '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3" fill="white"/><circle cx="16" cy="17" r="3" fill="white"/>',
    }
    return '<svg class="line-icon" viewBox="0 0 26 26" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+paths[name]+'</svg>'


def render(t, a, button, statusmini):
    # One example deliberately reused across the hero, below-fold journey, and full demo.
    data = [
        ('a', '08.12', t('产品方向', 'A first direction'), t('我在做一款给独立创作者的工具。第一版只解决素材找回，不做内容生成。', 'I’m building a tool for independent creators. The first version should help recover existing material, not generate content.')),
        ('b', '09.03', t('目标用户', 'What matters'), t('目标用户已经有持续的创作项目。他们需要接上已有的积累，而不是更多从零开始的建议。', 'The users already have ongoing creative projects. They need to build on what they have, not get more advice that starts from zero.')),
        ('c', '09.15', t('实现边界', 'A considered choice'), t('先验证用户是否能更快找回素材。暂不做多人协作。', 'First test whether users can recover material faster. Leave collaboration out for now.')),
    ]
    cards=''.join(f'''<article class="expression expression-{key}"><div class="expression-meta"><span class="source-mark" aria-hidden="true">↳</span><span>ChatGPT <small>{date} / 2026</small></span></div><h3>{title}</h3><p>{escape(text)}</p></article>''' for key,date,title,text in data)
    fragment_choices=''.join(f'''<label class="context-choice"><input type="checkbox" disabled data-context-item="{key}" {'checked' if key!='c' else ''}><span><span class="choice-title">{title}</span><span class="choice-detail">{date} · {t('已保存的表达', 'Saved expression')}</span><span class="choice-body">{escape(text)}</span></span><span class="choice-tick" aria-hidden="true">✓</span></label>''' for key,date,title,text in data)
    fragments=''.join(f'''<p class="context-fragment" data-fragment="{key}" {'hidden' if key=='c' else ''}><span>{title}</span>{escape(text)}</p>''' for key,_,title,text in data)
    timeline=''.join(f'<article class="journey-entry"><time>{date}</time><div><h3>{title}</h3><p>{escape(text)}</p></div></article>' for _,date,title,text in data)
    return f'''
<section class="editorial-hero wrap">
  <div class="hero-copy">
    <p class="eyebrow">{t('过去的表达，下一步的起点。','PAST CONVERSATIONS.<br>A MORE CONTINUOUS YOU.')}</p>
    <h1>{t('说过的，<br>成为下一步的<em>起点。</em>','Turn what you’ve <br>said into <em>what’s next.</em>')}</h1>
    <p class="hero-description">{t('PAIA 留住你向 AI 表达过的想法。找回来，理解和修改，再用于新的对话——让思考继续，而不是从头再来。','PAIA keeps what you’ve said to AI, so you can find it, make sense of it, edit it, and use it again. Your thinking continues, instead of starting over.')}</p>
    <div class="actions">{button('beta.html',t('申请内测','Get early access'))}{a('demo.html','<span class="example-arrow" aria-hidden="true">↗</span>'+t('看看怎样使用','Explore an example'),'example-link')}</div>
    <p class="hero-availability">{t('桌面 Chrome 扩展 · ChatGPT 网页版 · 邀请制测试','Desktop Chrome extension · ChatGPT Web · Private beta')}</p>
  </div>
  <figure class="thought-collage" aria-label="{t('不同会话的表达，成为可重新使用的材料','Expressions from separate conversations become material you can use again')}">
    <div class="collage-canvas">
      <div class="editorial-sheet sheet-one" aria-hidden="true"><span>AN IDEA,<br>STILL IN<br>THE MAKING.</span><div class="sheet-lines"></div><small>12 AUG — 15 SEP<br>ONE ONGOING PROJECT</small></div>
      <div class="editorial-sheet sheet-two" aria-hidden="true"><span>Keep the thought.<br>Leave room<br>for another.</span><div class="sheet-register">↗</div></div>
      <svg class="collage-connections" viewBox="0 0 680 560" fill="none" aria-hidden="true"><g stroke="currentColor" stroke-width=".85"><path d="M171 194C171 260 243 210 313 285"/><path d="M533 122C567 122 571 174 522 217"/><path d="M551 338C598 357 599 415 525 447"/><path d="M261 435C340 435 271 388 333 362"/><path d="M96 69C147 68 159 81 159 103"/></g><g fill="currentColor"><circle cx="96" cy="69" r="2"/><circle cx="159" cy="103" r="2"/><circle cx="525" cy="447" r="2"/></g></svg>
      <span class="collage-caption caption-top">{t('不同的会话<br>持续的思考','IDEAS EVOLVE.<br>KEEP THE CONTEXT.')}</span>
      {cards}
      <article class="context-editorial"><span class="mini-wordmark">PAIA</span><p class="context-kicker">{t('同一个项目，不同时间的表达','ONE PROJECT. DIFFERENT MOMENTS.')}</p><h2>{t('不只是记录。<br>是可以接着用的材料。','Not just a history. <br>A place to build from.')}</h2><p>{t('项目的方向、目标用户、已经确定的边界。放在一起看，再选择下一次需要的部分。','Your direction. Your intended users. The boundaries you’ve already set. Revisit them together, then choose what to take forward.')}</p><div class="editorial-card-foot"><span class="overlap-mark" aria-hidden="true"><i></i><i></i><i></i></span><span>{t('你的表达，仍然属于你','Your words. Still yours.')}</span></div></article>
      <span class="collage-caption caption-bottom">{t('从过去的想法<br>到下一步','A PAST THOUGHT.<br>A NEW BEGINNING.')}</span>
    </div>
    <figcaption>{t('能力示意 · 虚构表达，非扩展截图','Illustrative example · fictional expressions, not an app screenshot')}</figcaption>
  </figure>
</section>

<section class="value-section wrap" aria-labelledby="value-title">
  <h2 class="eyebrow" id="value-title">{t('不止于聊天历史。<br>为思考多留一点空间。','MORE THAN AN AI HISTORY.<br>MORE ROOM TO THINK.')}</h2>
  <div class="value-grid">
    <article>{icon('record')}<h3>{t('找回以前的想法','Find the thought again')}</h3><p>{t('不用猜它在哪个窗口。从熟悉的会话、主题或关键词，回到当时的内容。','Return to something you said, without guessing which chat it was in. Find it by conversation, topic, or keyword.')}</p></article>
    <article>{icon('relation')}<h3>{t('放在一起，看得更清楚','See it in context')}</h3><p>{t('围绕同一件事，重看不同时间的表达。保留疑问与转折，不被一个摘要定义。','Bring related expressions together over time. Keep the questions and changes of mind, not just a flattened summary.')}</p></article>
    <article>{icon('reuse')}<h3>{t('让过去继续有用','Put it to new use')}</h3><p>{t('修改、挑选和组合自己仍然认可的部分，为下一次 AI 讨论提供上下文。','Revise and select what is still relevant. Give your next AI conversation a starting point that is actually yours.')}</p></article>
    <aside class="value-aside"><span class="eyebrow">{t('由你拥有，也由你选择。','YOUR WORDS.<br>YOUR TERMS.')}</span><p>{t('为你保留。<br>不是默认向 AI 开放。','Kept for you. <br>Not automatically <br>open to AI.')}</p>{a('principles.html',t('了解数据与控制','About your data')+' ↗','text-link')}</aside>
  </div>
</section>

<section class="journey-section wrap" id="how" aria-labelledby="how-title">
  <div class="section-heading"><div><p class="eyebrow">{t('HOW IT WORKS / 不必增加一种习惯','HOW IT WORKS / NO NEW HABIT REQUIRED')}</p><h2 id="how-title">{t('想法不只属于<br>一个聊天窗口。','A thought doesn’t belong<br>to just one conversation.')}</h2></div><p>{t('从你已经写下的表达开始。按会话找回，围绕主题理解，或者直接为下一次任务选择材料。你不需要先整理完整个档案。','Start with the words you already write. Revisit a conversation, explore a topic, or take material straight into a new task. Organizing everything is not a prerequisite.')}</p></div>
  <div class="product-stage" data-context-stage>
    <div class="stage-tabs" role="tablist" aria-label="{t('探索 PAIA 能力','Explore how PAIA works')}">
      <button disabled id="flow-tab-0" role="tab" aria-selected="false" aria-controls="flow-panel-0" tabindex="-1"><span>01</span>{t('留下与找回','Keep & revisit')}</button>
      <button disabled id="flow-tab-1" role="tab" aria-selected="false" aria-controls="flow-panel-1" tabindex="-1"><span>02</span>{t('放在一起理解','See the connections')}</button>
      <button disabled id="flow-tab-2" role="tab" aria-selected="true" aria-controls="flow-panel-2" tabindex="0"><span>03</span>{t('选择本次上下文','Choose the context')}</button>
    </div>
    <noscript><p class="notice">{t('下方为静态示例。开启 JavaScript 后可以切换步骤与选择材料。','This is a static example. Enable JavaScript to change steps and select material.')}</p></noscript>
    <section class="flow-panel" id="flow-panel-0" role="tabpanel" aria-labelledby="flow-tab-0" tabindex="0" hidden><div class="timeline">{timeline}</div><div class="stage-explainer"><span class="eyebrow">INPUT ARCHIVE</span><h3>{t('照常表达。<br>多一份自己的记录。','Keep talking.<br>Keep a record of your own.')}</h3><p>{t('经你同意，在支持的 ChatGPT 页面保存符合条件的已发送输入。可以按会话和关键词找回，也可以编辑工作文字。','With your consent, PAIA captures eligible sent inputs on supported ChatGPT pages. Find them by conversation or keyword, then edit the working text.')}</p><p class="small">{t('不自动采集 Temporary Chat。补录打开的会话不等于完整导入整个账户。','Temporary Chats are not automatically captured. Reopening a chat does not import your whole account.')}</p></div></section>
    <section class="flow-panel" id="flow-panel-1" role="tabpanel" aria-labelledby="flow-tab-1" tabindex="0" hidden><div class="timeline"><p class="topic-title">{t('创作工具 · 一段持续的探索','A creator tool · an ongoing exploration')}</p>{timeline}</div><div class="stage-explainer"><span class="eyebrow">THOUGHT LIBRARY</span><h3>{t('同一件事。<br>不同时间的你。','One subject.<br>More than one moment.')}</h3><p>{t('跨会话的相关表达可以放进同一个主题。可选 AI 整理提供另一种组织方式，原话、你的修改和 AI 结果保持区分。','Bring related expressions into a topic across conversations. Optional AI organization offers another way to see the material; original text, your edits, and AI output stay distinct.')}</p><p class="small">{t('示例主题已预先编排。这个页面没有进行自动分类或 AI 推断。','This example topic is pre-arranged. This page does not run automatic classification or AI inference.')}</p></div></section>
    <section class="flow-panel" id="flow-panel-2" role="tabpanel" aria-labelledby="flow-tab-2" tabindex="0">
      <div class="material-panel"><span class="eyebrow">{t('这次带上什么，由你决定','WHAT GOES IN IS UP TO YOU')}</span><h3>{t('只选这次需要的。','Only what belongs in this task.')}</h3><p class="panel-instruction">{t('试着选中或移除一条材料。','Try including or removing a piece of context.')}</p><div class="context-choices">{fragment_choices}</div><span class="selection-total" role="status" aria-live="polite" data-selection-count>{t('已选择 2 / 3 项','2 of 3 selected')}</span></div>
      <div class="context-panel"><div class="panel-heading"><span>AI Context</span><span class="private-badge">{t('尚未对外发送','Not sent to AI')}</span></div><div class="context-task"><span class="micro">{t('下一次任务','YOUR NEXT TASK')}</span><p>{t('评估第一版的产品范围，指出应该保留和暂缓的部分。','Review the first version: what should we keep, and what can wait?')}</p></div><div class="context-content" tabindex="0" role="region" aria-label="{t('选中的示例上下文','Selected example context')}">{fragments}<p class="context-empty" data-context-empty hidden>{t('没有选中材料。你的其他内容不会自动补进来。','Nothing selected. Other material will not be added automatically.')}</p></div><div class="context-ready"><span>{t('选择 → 审阅 → 复制或导出','Select → review → copy or export')}</span>{a('demo.html',t('体验完整示例','Try the full example')+' ↗')}</div></div>
    </section>
    <div class="stage-bottom"><span>{t('交互能力示意 · 合成数据','Interactive illustration · fictional data')}</span><span>{t('没有上传 · 没有 AI 调用','No uploads · no AI calls')}</span></div>
  </div>
</section>

<section class="use-section wrap" id="uses" aria-labelledby="uses-title">
  <div class="section-heading"><div><p class="eyebrow">{t('FOR THE THINGS YOU KEEP COMING BACK TO','FOR THE THINGS YOU KEEP COMING BACK TO')}</p><h2 id="uses-title">{t('不是更多从零开始的建议。<br>是接着往下想。','Less starting over.<br>More thinking things through.')}</h2></div><p>{t('持续的项目，反复推敲的选择，尚未解决的问题。它们不会随着聊天窗口关闭而结束。','An ongoing project. A decision you are still weighing. A question you haven’t answered yet. They don’t end when a chat does.')}</p></div>
  <div class="use-grid"><article><span class="use-number">01 / PROJECTS</span><h3>{t('接着推进项目','Pick up the project')}</h3><p>{t('把已经确定的方向与边界带到新窗口，不再重复交代所有背景。','Bring the direction and constraints you have already settled into a new chat, instead of briefing it from the beginning.')}</p><div class="use-detail">{t('你的背景 + 已做决定','Your background + decisions made')}</div></article><article><span class="use-number">02 / RESEARCH</span><h3>{t('沿着问题继续探索','Follow the question')}</h3><p>{t('找回以前的假设与疑问，把仍然相关的材料留给下一次深入讨论。','Recover an earlier hypothesis or an unresolved question. Keep what is still relevant for the next discussion.')}</p><div class="use-detail">{t('先前假设 + 新的问题','Earlier hypotheses + new questions')}</div></article><article><span class="use-number">03 / DECISIONS</span><h3>{t('让建议接近真实的你','Make room for your judgment')}</h3><p>{t('自己决定过去哪些取舍仍然有效，不把每一句历史表达当成永久的个人标签。','Decide which past preferences still hold. A sentence you once wrote does not have to become a permanent label.')}</p><div class="use-detail">{t('当前偏好 + 选择边界','Current priorities + considered trade-offs')}</div></article></div>
</section>

<section class="ownership-zone" aria-labelledby="ownership-title"><div class="wrap ownership-layout"><div><p class="eyebrow">{t('YOUR CONTEXT. YOUR CHOICE.','YOUR CONTEXT. YOUR CHOICE.')}</p><h2 id="ownership-title">{t('先属于你。<br>再用于 AI。','Yours first.<br><em>AI comes second.</em>')}</h2><p>{t('这是你理解自己表达的地方，不是默认向所有 AI 开放的数据源。保存内容，与授权使用内容，是两件事。','A place to understand your own words, not a feed of personal data automatically open to every AI. Keeping something and sharing it are different decisions.')}</p>{a('principles.html',t('了解隐私与控制','Read our approach to privacy')+' ↗','text-link')}</div><div class="ownership-principles"><article><span>01</span><div><h3>{t('本地优先','Local first')}</h3><p>{t('核心档案默认保存在你的设备上。外部 AI 处理有独立的范围与授权。','Your core archive stays on your device by default. External AI processing has a separate scope and permission.')}</p></div></article><article><span>02</span><div><h3>{t('保持原话与修改的区别','Your words stay recognizable')}</h3><p>{t('历史来源、工作修改和 AI 结果不混为一谈。整理结构，不替你发明观点。','Original records, working edits, and AI output are not interchangeable. Organization must not invent your beliefs.')}</p></div></article><article><span>03</span><div><h3>{t('可以带走，也可以离开','Free to take it with you')}</h3><p>{t('通过开放导出带走内容。你主动交给外部系统的副本，PAIA 无法远程收回。','Open exports let you keep your material outside PAIA. Copies you give to another system cannot be remotely recalled.')}</p></div></article></div></div></section>

<section class="questions-section wrap" aria-labelledby="questions-title"><div><p class="eyebrow">{t('A FEW THINGS WORTH KNOWING','A FEW THINGS WORTH KNOWING')}</p><h2 id="questions-title">{t('在开始之前。','Before you begin.')}</h2></div><div class="questions">
<details><summary>{t('已经有聊天历史，为什么还需要 PAIA？','Why PAIA when I already have chat history?')}</summary><p>{t('PAIA 并不是另一个聊天客户端。它让你保留一份独立的、可编辑的长期表达记录，跨会话查看同一个主题，再把选中的部分用于下一次 AI 任务。聊天历史是入口，不是这里的全部价值。','PAIA is not another chat client. It gives you a separate, editable record of your own expressions, a way to revisit topics across conversations, and control over what you reuse in the next task. Chat history is the starting point, not the whole experience.')}</p></details>
<details><summary>{t('PAIA 会让 AI 自动记住我的所有信息吗？','Does PAIA make an AI remember everything about me?')}</summary><p>{t('不会。PAIA 不会默认把完整档案开放给 AI。当前复用方式是选择材料、审阅上下文，再复制或导出；外部 AI 直接读取连接器仍属于未来方向。','No. Your whole archive is not automatically open to AI. The current reuse path is to select material, review the context, then copy or export it. Direct external-AI access is a future direction, not an available connection.')}</p></details>
<details><summary>{t('现在可以在哪些平台使用？','Where can I use it today?')}</summary><p>{t('当前是用于 ChatGPT 网页版的桌面 Chrome 扩展，处于邀请制测试。移动端、iOS 快速记录、更多信息来源和跨设备能力属于未来方向，并未在此宣布上线。','PAIA is an invite-only desktop Chrome extension for ChatGPT Web. Mobile and iOS capture, more sources, and cross-device capabilities are future directions, not announced releases.')}</p></details>
<details><summary>{t('我的重要资料可以只保存在 PAIA 吗？','Should PAIA be my only backup?')}</summary><p>{t('不应该。测试版本仍在迭代，重要资料请保留独立备份。真实来源兼容、签名分发和部分真实数据验证仍有未完成项，详情见当前状态。','No. The beta is still evolving; keep independent backups of important material. Live-source compatibility, signed distribution, and some real-data verification remain unfinished. Read the current status before joining.')}</p>{a('status.html',t('查看当前状态','See the current status')+' ↗','text-link')}</details>
</div></section>
<section class="invitation wrap"><div><p class="eyebrow">PAIA / PRIVATE BETA</p><h2>{t('你的下一步，<br>可以从积累开始。','For whatever<br><em>you think of next.</em>')}</h2><p>{t('从你已经在说的话开始，不必再经营一个知识库。','Start with the words you already write.<br>Not another knowledge base to maintain.')}</p></div><div class="invitation-action">{button('beta.html',t('申请内测','Get early access'))}{statusmini()}{a('status.html',t('看看当前支持什么','See what is available today')+' ↗','text-link')}</div></section>
'''

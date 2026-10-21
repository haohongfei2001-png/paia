"""A continuous, fictional expression demonstrates the website's product story.

This is a local website example. Editing a working expression never changes its
source, grants an AI permission, or calls a service.
"""
from html import escape
from flagship_shared import text, href, icon
from flagship_personal_ui import prompts, context_cards


def home(lang):
    t = lambda zh, en: text(lang, zh, en)
    original = t('我想写写离开家后的生活。\n但不知道从哪里开始。', 'I want to write about leaving home.\nBut I do not know where to begin.')
    working = t('我想从搬家那天写起。\n先记下门关上的声音。', 'I want to start with moving day.\nThe sound of the door closing.')
    return f'''
<div class="continuation-home" data-continuation>
  <section class="opening wrap" aria-labelledby="opening-title">
    <div class="opening-top"><p class="overline">PERSONAL AI INPUT ARCHIVE</p><p class="opening-category">{t('留给自己的表达空间', 'A space for your own expression')}</p></div>
    <h1 id="opening-title"><span>{t('你说过的，', 'Your words.')}</span><span>{t('还有下文。', 'Still becoming.')}</span></h1>
    <div class="expression-study" aria-label="{t('一段表达的下文，交互示例', 'An expression continued, interactive example')}">

      <div class="expression-original">
        <div class="expression-caption"><span>{t('当时，你在对话里写下', 'Then, in your conversation')}</span><span>Input Archive</span></div>
        <blockquote data-continuation-original>{escape(original)}</blockquote>
        <div class="source-caption"><span class="source-stamp">{icon('archive')} ChatGPT</span><span>{t('已发送的输入 · 原话保留', 'Sent input · Original preserved')}</span></div>
      </div>
      <div class="expression-current">
        <div class="expression-caption"><span>{t('现在，你在 PAIA 里的工作文字', 'Now, your working text in PAIA')}</span><button class="study-edit" type="button" data-continuation-edit aria-controls="continuation-edit">{icon('edit')}{t('改写这段话', 'Make it your own')}</button></div>
        <p class="current-words" data-continuation-working>{escape(working)}</p>
        <div class="continuation-editor" id="continuation-edit" data-continuation-form role="group" aria-label="{t('改写示例表达', 'Edit the sample expression')}" hidden>
          <label class="sr-only" for="continuation-text">{t('这段表达的工作文字', 'Working text for this expression')}</label>
          <textarea id="continuation-text" data-continuation-text rows="3" maxlength="1500" required>{escape(working)}</textarea>
          <div class="actions"><button class="button button-small" type="button" data-continuation-save>{t('保留修改', 'Keep edit')}</button><button type="button" class="quiet-button" data-continuation-cancel>{t('取消', 'Cancel')}</button></div>
        </div>
        <p class="study-status" data-continuation-status role="status">{t('想法可以改变。原话不被覆盖。', 'Your thinking can change. Your original stays.')}</p>
      </div>
      <p class="study-footnote">{t('虚构示例 · 可以编辑试试，修改只在本页，刷新即重置。', 'Fictional example · Try an edit. Changes stay in this page and reset on reload.')}</p>
    </div>
    <div class="opening-footer"><p class="opening-definition">{t('把散落在 AI 对话里的表达，留回自己这里。<br>找回原话，接着想，也由你决定 AI 能读到什么。', 'Keep your side of the AI conversation.<br>Find your words, keep thinking, and choose what AI can read.')}</p><div class="opening-actions"><a class="button" href="{href(lang, 'demo.html')}">{t('体验 PAIA', 'Explore PAIA')}{icon('arrow')}</a><a class="opening-next" href="#continue">{t('接着往下看', 'See what comes next')}<span aria-hidden="true">↓</span></a></div></div>
  </section>

  <section class="ownership wrap" id="continue" aria-labelledby="ownership-title">
    <div class="section-index"><span>01</span><span>{t('属于你的那一半', 'Your side of the conversation')}</span></div>
    <div class="ownership-statement"><h2 id="ownership-title">{t('你写下的，<br>不只是问题。', 'You put more into a chat<br>than a question.')}</h2><p>{t('背景、偏好、犹豫，还有正在成形的想法。<br>PAIA 从你已发送的文字开始，保留原话和来处，<br class="desktop-break">让它们成为可以找回、修改和继续使用的积累。', 'The background, the preferences, the hesitation. The ideas taking shape. PAIA begins with the words you send, keeping their source so you can find them, rework them and carry them forward.')}</p></div>
    <div class="capture-facts"><span>{icon('check')}{t('主动开启保存', 'Capture when you opt in')}</span><span>{icon('check')}{t('只收录已发送的用户文字', 'Only your sent words')}</span><a class="text-link" href="{href(lang,'how-it-works.html')}">{t('了解如何保存', 'How capture works')}{icon('arrow')}</a></div>
  </section>

  <section class="ongoing" aria-labelledby="ongoing-title">
    <div class="wrap">
      <div class="section-index"><span>02</span><span>Thought Library</span></div>
      <div class="ongoing-heading"><h2 id="ongoing-title">{t('换了一个对话。<br>还是你的那件事。', 'Another conversation.<br>The same thread of thought.')}</h2><p>{t('关于写作，你已经想过很多次。<br>把散落的表达放进同一个主题，<br>读到改变，也给没想完的地方留个位置。', 'You have returned to this writing more than once. Bring those expressions into one topic. See what has changed, and leave room for what is still unfinished.')}</p></div>
      <div class="reading-spread">
        <aside class="reading-margin"><span class="reading-topic-label">{t('个人主题', 'Personal topic')}</span><h3>{t('用自己的<br>语言写作', 'Writing in<br>my own voice')}</h3><span class="reading-section-name">{t('章节 · 从哪里开始', 'Section · Where to begin')}</span><a class="text-link" href="{href(lang,'demo.html')}#thought">{t('打开思想库示例', 'Explore Thought Library')}{icon('arrow')}</a></aside>
        <div class="reading-pages">
          <div class="reading-entry current"><div class="reading-annotation"><span>{t('你刚刚留下的工作文字', 'Your current working text')}</span><span>01</span></div><p data-continuation-echo>{escape(working)}</p></div>
          <div class="reading-entry"><div class="reading-annotation"><span>{t('另一次对话里的想法', 'From another conversation')}</span><span>02</span></div><p>{t('我不想把每件事都写成结论。<br>有些犹豫，也值得留下。', 'I do not want everything to become a conclusion.<br>Some of the hesitation is worth keeping.')}</p><span class="reading-continuity">{t('不同的表达，同一个还在继续的主题。', 'Different expressions. One continuing topic.')}</span></div>
        </div>
      </div>
      <div class="ongoing-foot"><span>{t('示例阅读 · 保留来源，不替你生成观点', 'Illustrative reading · Sources preserved, no beliefs generated')}</span><a href="{href(lang,'use-cases.html')}">{t('也可以是项目、问题或一次选择', 'For a project, a question, or a choice')}{icon('arrow')}</a></div>
    </div>
  </section>

  <section class="reuse-story wrap" aria-labelledby="reuse-title">
    <div class="reuse-product">{prompts(lang,'home-prompt')}</div>
    <div class="reuse-copy"><div class="section-index"><span>03</span><span>Prompt Reuse</span></div><h2 id="reuse-title">{t('这句话好用。<br>下一次，还用它。', 'You found the words.<br>Keep them within reach.')}</h2><p>{t('比如，“给我一个不同的角度。”<br>把自己用得顺手的提示词留在输入框旁。<br>点一下填入，接着写，发送仍由你。', '“Give me a different perspective.” Keep a useful prompt beside the composer. Pick it, keep writing, and send when you are ready.')}</p><p class="reuse-invitation"><span aria-hidden="true">↖</span>{t('点开小入口，选一句试试。你的草稿会保留。', 'Open the small control and pick a line. Your draft stays.')}</p><a class="text-link" href="{href(lang,'article-reuse.html')}">{t('为什么是自己的提示词', 'Why your own prompts matter')}{icon('arrow')}</a></div>
  </section>

  <section class="permission-story wrap" aria-labelledby="permission-title">
    <div class="section-index"><span>04</span><span>AI Context</span></div>
    <div class="permission-heading"><h2 id="permission-title">{t('留在自己这里。<br>开放你选择的部分。', 'Keep a place of your own.<br>Open only what you choose.')}</h2><p>{t('你可以让 AI 知道自己正在写作，<br>而不把所有表达都交出去。<br>背景、规则、近况与个人主题，分别决定。', 'Let AI know what you are working on without opening every expression. Choose your background, rules, current work and personal topics separately.')}</p></div>
    <div class="permission-interaction">{context_cards(lang,'home-context')}</div>
    <div class="permission-notes"><p>{t('这是权限交互示例，不连接真实 AI。打开或编辑卡片不等于开放读取；总访问、卡片与主题分别控制。', 'This is a permission example, with no live AI connection. Viewing or editing does not grant access. Main access, cards and topics are controlled separately.')}</p><a class="text-link" href="{href(lang,'principles.html')}">{t('数据与权限，讲清楚', 'Data and permissions, explained')}{icon('arrow')}</a></div>
  </section>

  <section class="origin-note" aria-labelledby="origin-note-title"><div class="wrap origin-note-inner"><figure><img src="/assets/website/brand/paia-logo-v1.webp" width="480" height="480" loading="lazy" decoding="async" alt="{t('创作者原作：女孩、手中的信与旧信箱', 'The original drawing: a girl, a letter, and an old mailbox')}"><figcaption>{t('PAIA 的起点 · 创作者原作', 'Where PAIA began · The creator’s original drawing')}</figcaption></figure><div class="origin-note-copy"><p class="overline">{t('关于表达，也关于未完成', 'ON EXPRESSION, AND THE UNFINISHED')}</p><h2 id="origin-note-title">{t('有些话，<br>值得为自己留下。', 'Some words are worth<br>keeping for yourself.')}</h2><p>{t('一个女孩，和一只旧信箱。<br>我们不知道她是否曾经投递。', 'A girl and an old mailbox.<br>We do not know whether she ever posted anything.')}</p><a class="text-link" href="{href(lang,'about.html')}">{t('读 PAIA 的故事', 'Read PAIA’s story')}{icon('arrow')}</a></div></div></section>

  <section class="next-page wrap"><div><span class="overline">{t('从你已经写下的开始', 'START WITH WHAT IS ALREADY YOURS')}</span><h2>{t('下一句，由你。', 'The next words are yours.')}</h2></div><div class="next-page-actions"><a class="button" href="{href(lang,'demo.html')}">{t('打开交互演示', 'Open the interactive demo')}{icon('arrow')}</a><a class="text-link" href="{href(lang,'download.html')}">{t('查看获取方式', 'How to get PAIA')}</a></div></section>
</div>'''

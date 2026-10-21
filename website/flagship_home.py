"""Public, in-memory product examples. No connection to an archive or AI."""
from html import escape
from flagship_shared import text, href, icon
from flagship_ui import workspace
from flagship_personal_ui import prompts, context_cards


def home(lang):
    t = lambda zh, en: text(lang, zh, en)
    original = t('我不想让文字听起来更像“一个正确的答案”。\n有些犹豫，也是我真正想说的一部分。', 'I do not want my writing to sound more like “the right answer.”\nSome of the hesitation is part of what I actually mean.')
    working = t('我想从搬家那天写起。\n先记下门关上的声音。\n有些感受，还没有找到合适的词。', 'I want to begin with moving day.\nThe sound of the door closing.\nSome feelings do not have the right words yet.')
    scene = workspace(lang, 'home', False, compact=True).replace('class="workspace ', 'class="workspace hero-workspace ')
    scene = scene.replace('<span class="sample-tag">' + t('示例资料', 'Sample material') + '</span>', f'<a class="scene-expand" href="{href(lang,"demo.html")}" aria-label="{t("展开完整交互演示","Open the complete interactive demo")}">{icon("source")}<span>{t("完整演示","Full demo")}</span></a>')
    scene = scene.replace('<section class="workspace-panel archive-panel"', '<div class="source-edge" aria-hidden="true"><span>ChatGPT</span><span>' + t('已发送的表达', 'Your sent expression') + '</span><span data-reader-source-date>10.10.2026</span></div><section class="workspace-panel archive-panel"', 1)
    return f'''
<div class="personal-home" data-continuation>
  <section class="personal-opening" aria-labelledby="opening-title">
    <div class="opening-atmosphere" aria-hidden="true"></div>
    <div class="opening-composition wrap"><div class="opening-message">
      <h1 id="opening-title">{t('写给 AI 的，<br>也留给自己。', 'Your side of<br>the conversation.')}</h1>
      <p>{t('一个属于你的 AI 输入档案。<br>找回说过的话，接着想，再决定给 AI 看什么。', 'A personal archive of what you say to AI.<br>Find your words, keep thinking, and choose what AI can read.')}</p>
      <div class="opening-actions"><a class="button" href="{href(lang,'demo.html')}">{t('亲自试一试','Try PAIA')}{icon('arrow')}</a><a class="opening-link" href="#your-space">{t('看看它如何工作','See how it works')}</a></div>
    </div>
    <div class="personal-stage">
      {scene}
      <div class="stage-caption"><span class="stage-invitation">{t('这是可操作的示例。选一段话，或切换一个空间。', 'A working example. Pick an expression or open another space.')}</span><span>{t('虚构资料 · 不连接个人档案', 'Fictional material · No personal archive connection')}</span></div>
    </div></div>
  </section>

  <section class="reason-to-return wrap" id="your-space" aria-labelledby="reason-title">
    <h2 id="reason-title">{t('每一次认真表达，<br>都不必从头来过。', 'You have already<br>put thought into this.')}</h2>
    <p>{t('你向 AI 交代的背景、问过的问题、推翻的想法，<br class="desktop-break">不只是一次对话的上下文。它们也是你自己的积累。<br class="desktop-break">PAIA 让这些表达，有一个属于你的去处。', 'The background you explain. The questions you ask. The ideas you reconsider. They are more than context for a chat. They are your own body of thought. PAIA gives them a place of their own.')}</p>
  </section>

  <section class="return-section wrap" aria-labelledby="return-title">
    <div class="return-copy"><h2 id="return-title">{t('回到那句<br>具体的话。', 'Back to the words<br>you actually wrote.')}</h2><p>{t('输入档案保存已发送的用户文字和来源。按记得的关键词找回来，连着当时的上下文，重新读一遍。', 'Input Archive keeps your sent words and their source. Search for a word you remember and read it in the context of that conversation.')}</p><p>{t('想法变了，就修改工作文字。<br>当时的原话，仍然在。', 'Changed your mind? Edit the working text.<br>The original stays.')}</p><a class="text-link" href="{href(lang,'demo.html')}#archive">{t('打开输入档案','Explore Input Archive')}{icon('arrow')}</a><div class="capture-note">{icon('check')}<span>{t('主动开启保存后收录，只保存已发送的用户文字。', 'Capture is opt-in, and keeps only your sent words.')}</span></div></div>
    <div class="return-object">
      <div class="return-object-ground" aria-hidden="true"></div>
      <div class="expression-sheet">
        <div class="sheet-heading"><span>{icon('archive')}{t('把想法说清楚', 'Finding my own words')}</span><span>{t('工作文字','Working text')}</span></div>
        <p class="current-words" data-continuation-working>{escape(working)}</p>
        <div class="continuation-editor" id="continuation-edit" data-continuation-form role="group" aria-label="{t('编辑这段示例','Edit this example')}" hidden><label class="sr-only" for="continuation-text">{t('这段表达的工作文字','Working text for this expression')}</label><textarea id="continuation-text" data-continuation-text rows="4" maxlength="1500">{escape(working)}</textarea><div class="actions"><button class="button button-small" type="button" data-continuation-save>{t('保留修改','Keep edit')}</button><button class="quiet-button" type="button" data-continuation-cancel>{t('取消','Cancel')}</button></div></div>
        <button class="sheet-edit" type="button" data-continuation-edit aria-controls="continuation-edit">{icon('edit')}{t('试着改写','Try an edit')}</button>
        <details class="sheet-source"><summary>{icon('source')}<span>{t('核对原始来源','Check the original source')}</span>{icon('chevron')}</summary><div><span class="source-meta">ChatGPT · {t('2026 年 10 月 10 日','10 October 2026')}</span><p data-continuation-original>{escape(original)}</p></div></details>
        <p class="study-status" data-continuation-status role="status">{t('原始来源单独保留，不随工作文字改变。', 'The original source stays separate from your edits.')}</p>
      </div>
      <p class="object-caption">{t('可编辑的虚构示例，修改仅留在本页。','An editable fictional example. Changes stay in this page.')}</p>
    </div>
  </section>

  <section class="thought-landscape" aria-labelledby="thought-title">
    <div class="wrap thought-landscape-inner">
      <div class="thought-heading"><h2 id="thought-title">{t('一件事，<br>可以慢慢想。','A thought can take<br>more than one conversation.')}</h2><div><p>{t('思想库把不同对话里的表达，放回你自己的主题。<br class="desktop-break">关于创作，关于生活，关于一直没想完的那个问题。', 'Thought Library brings expressions from different conversations into your own topics. A project. A practice. A question you keep coming back to.')}</p><a class="text-link" href="{href(lang,'demo.html')}#thought">{t('走进思想库','Explore Thought Library')}{icon('arrow')}</a></div></div>
      <div class="thought-landscape-stage">
        <div class="topic-folio topic-folio-back" aria-hidden="true"><span>{t('做一个值得用的产品','Making something worth using')}</span><i></i><i></i></div>
        <div class="topic-folio topic-folio-middle" aria-hidden="true"><span>{t('生活里的选择','Choices in life')}</span><i></i><i></i></div>
        <div class="topic-folio topic-folio-front">
          <div class="folio-topic"><div>{icon('thought')}<span>Thought Library</span></div><h3>{t('用自己的<br>语言写作','Writing in<br>my own voice')}</h3><span class="folio-section">{t('从哪里开始','Where to begin')}</span><a href="{href(lang,'demo.html')}#thought" class="folio-link">{t('浏览思想库','Browse Thought Library')}{icon('arrow')}</a></div>
          <div class="folio-reading"><div class="folio-reading-heading"><span>{t('章节阅读','Section reading')}</span>{icon('source')}</div><p data-continuation-echo>{escape(working)}</p><div class="folio-second"><span>{t('另一次对话里','From another conversation')}</span><p>{t('想不起的细节，可以先空着。<br>不必为了完整而补上。','I can leave the details I do not remember open.<br>I do not need to fill them in for completeness.')}</p></div><p class="folio-note">{t('来自不同对话，仍然保留各自的来源。','Different conversations, with their sources intact.')}</p></div>
        </div>
      </div>
      <div class="thought-landscape-caption"><p>{t('主题由你命名，内容由你排列。<br>未完成、矛盾和改变，都可以留下。','Name your topics. Arrange your material.<br>Leave room for uncertainty, contradiction and change.')}</p><span>{t('虚构的主题阅读示例','Illustrative topic reading')}</span></div>
    </div>
  </section>

  <section class="reuse-section wrap" aria-labelledby="reuse-title">
    <div class="reuse-window">{prompts(lang,'home-prompt')}</div>
    <div class="reuse-description"><h2 id="reuse-title">{t('用得顺手的话，<br>就在手边。','Keep the words<br>that work for you.')}</h2><p>{t('“先检查我的前提。”<br>“换一个角度想想。”<br>你自己的提示词，留在输入框旁。', '“Check my assumptions first.”<br>“Give me another perspective.”<br>Your own prompts, right beside the composer.')}</p><p>{t('点开轻巧的入口，选一句填入。<br>你的草稿会保留，什么时候发送，由你。','Open the small control and pick a phrase.<br>Your draft stays. You decide when to send.')}</p><a class="text-link" href="{href(lang,'demo.html')}#prompts">{t('体验 Prompt Reuse','Try Prompt Reuse')}{icon('arrow')}</a></div>
  </section>

  <section class="context-landscape" aria-labelledby="permission-title"><div class="wrap">
    <div class="context-heading"><h2 id="permission-title">{t('让 AI 了解你。<br>多少，由你。','A little more context.<br>Exactly as much as you choose.')}</h2><p>{t('背景、回应方式、眼下在做的事，以及你选择的主题。<br class="desktop-break">在 AI Context 里，分别管理。保存到自己这里，<br class="desktop-break">不意味着把全部档案交给 AI。','Your background, how you want a response, what is happening now, and the topics you choose. Manage each in AI Context. Keeping an archive does not open it all to AI.')}</p></div>
    <div class="context-island">{context_cards(lang,'home-context')}</div>
    <div class="context-foot"><p>{t('查看和编辑不会授权读取。这里是本页交互示例，不连接真实 AI。','Viewing and editing do not grant access. This page is an interactive example, with no live AI connection.')}</p><a class="text-link" href="{href(lang,'principles.html')}">{t('了解数据与权限','Data and permissions')}{icon('arrow')}</a></div>
  </div></section>

  <section class="origin-visit wrap" aria-labelledby="origin-title"><div class="origin-visit-copy"><h2 id="origin-title">{t('有些表达，<br>没有一个确定的结尾。','Some expressions<br>have no certain ending.')}</h2><p>{t('一个女孩，和一只旧信箱。<br>她靠近，又走远。我们不知道她是否投递过，<br>也不知道她原本想说什么。','A girl and an old mailbox.<br>She comes close, then moves on. We do not know whether she posted anything, or what she meant to say.')}</p><a class="text-link" href="{href(lang,'about.html')}">{t('PAIA 从这里开始','Where PAIA began')}{icon('arrow')}</a></div><figure><img src="/assets/website/brand/paia-logo-v1.webp" width="480" height="480" loading="lazy" decoding="async" alt="{t('创作者原作：女孩、手中的信与旧信箱','The creator’s original drawing: a girl, a letter and an old mailbox')}"><figcaption>{t('PAIA 起源原作','The original drawing behind PAIA')}</figcaption></figure></section>

  <section class="home-invitation"><div class="wrap"><img src="/assets/website/brand/paia-symbol-soft-blue.svg" width="48" height="48" alt=""><h2>{t('从你已经写下的，继续。','Begin with what is already yours.')}</h2><p>{t('一个留给自己的空间。','A place to come back to.')}</p><div class="actions"><a class="button" href="{href(lang,'demo.html')}">{t('打开交互演示','Open the interactive demo')}{icon('arrow')}</a><a class="text-link" href="{href(lang,'download.html')}">{t('查看获取方式','Get PAIA')}</a></div></div></section>
</div>'''

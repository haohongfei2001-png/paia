(() => {
  const root = document.querySelector('[data-paia-demo]');
  if (!root) return;

  const stage = root.querySelector('[data-demo-stage]');
  const titleNode = root.querySelector('[data-demo-section-title]');
  const toast = root.querySelector('[data-demo-toast]');
  const resetButton = root.querySelector('[data-demo-reset]');
  const navButtons = Array.from(root.querySelectorAll('[data-demo-nav]'));

  const lang = () => document.documentElement.dataset.language === 'zh' ? 'zh' : 'en';
  const escapeHtml = (value = '') => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const copy = {
    zh: {
      interactive: '交互演示',
      localDemo: '演示数据 · 完全在浏览器本地运行',
      reset: '重置演示',
      inputArchive: 'Input Archive',
      thoughtLibrary: 'Thought Library',
      aiContext: 'AI Context',
      settings: '设置',
      local: 'LOCAL',
      archiveTitle: '你说过的话，先成为自己的档案。',
      archiveBody: '按真实会话阅读。点开一个窗口，正文可以直接修改。',
      sync: '同步',
      synced: '已同步',
      syncDone: '已同步 · 2 条新输入 · 现有内容未重新处理',
      upToDate: '已是最新状态',
      demoWorkspace: '演示空间',
      inputs: '条输入',
      conversations: '个会话',
      lightFilter: '轻度过滤',
      openConversation: '打开会话',
      archiveCard1: '产品研究与决策',
      archiveCard1Summary: '关于长期工具、信息归档与产品边界的持续思考。',
      archiveCard2: '阅读与研究笔记',
      archiveCard2Summary: '记录阅读时真正想留下的判断，而不是完整摘抄。',
      archiveCard3: '旅行计划',
      archiveCard3Summary: '零散计划、偏好与后来改变过的决定。',
      archiveCardMeta1: '8 条输入 · 最近更新 9 月 8 日',
      archiveCardMeta2: '6 条输入 · 最近更新 9 月 6 日',
      archiveCardMeta3: '5 条输入 · 最近更新 8 月 30 日',
      backArchive: '返回 Input Archive',
      archiveReadHint: '点击正文即可编辑。修改会保留在演示状态，并影响依赖它的 Thought Library。',
      oldest: '时间正序',
      newest: '时间倒序',
      edited: '由你修改',
      saved: '已在本地保存 · 用户修改优先于自动处理',
      sent: '原始发送',
      captured: '抓取',
      sentUnknown: '未知 · 原始时间不可可靠恢复',
      remove: '移除这条输入',
      removed: '已移除 · 后续同步不会让它重新出现',
      undo: '撤销',
      restored: '已恢复',
      recovered: '历史补录',
      thoughtTitle: '不是另一份聊天记录，而是长期主题。',
      thoughtBody: '主题来自多个会话。默认仍然是你的表达，AI 整理只是一层可关闭的理解。',
      sources: '来源',
      sourceEntries: '条来源',
      openTopic: '打开主题',
      topicLearning: '长期学习系统',
      topicLearningSummary: '从“收集更多”逐渐转向“让过去的信息重新可读”。',
      topicProduct: '产品研究',
      topicProductSummary: '围绕产品边界、默认值和长期使用行为形成的判断。',
      topicReading: '阅读与研究',
      topicReadingSummary: '什么值得留下、怎样减少无效积累，以及怎样回看。',
      topicWriting: '写作与创作',
      topicWritingSummary: '记录表达习惯、结构选择和长期创作方向。',
      backTopics: '返回主题',
      sourceView: '原始表达',
      aiOrganize: 'AI 整理',
      aiDerived: 'AI 派生',
      aiOff: '关闭',
      aiOn: '开启',
      oneSourceChanged: '1 条来源已由你修改',
      derivedFrom: '基于 {n} 条来源',
      viewSources: '查看来源',
      hideSources: '收起来源',
      currentUnderstanding: '当前理解',
      derivedSummary: '过去几个月里，重点从“尽量收集更多资料”逐渐转向“让旧信息更容易重新找到、阅读和形成判断”。系统本身应该减少整理负担，而不是制造新的维护工作。',
      sourceStillHere: '原始表达仍然保留在下面，AI 整理不会覆盖它。',
      contextTitle: '完整档案，不等于 AI 能看到的内容。',
      contextBody: '默认没有任何主题被授权。只为当前问题选择必要来源。',
      externalAccess: '允许外部 AI 使用上下文',
      accessOff: '关闭',
      accessOn: '已开启',
      accessEnabled: '外部 AI 授权已开启 · 当前仍未选择任何来源',
      accessDisabled: '外部 AI 授权已关闭 · 已清空本次上下文',
      yourArchive: '你的档案',
      thisContext: '本次上下文',
      topics: '个主题',
      sourcesSelected: '条来源',
      demoData: '演示数据',
      currentQuestion: '当前问题',
      question: '我应该怎样重新设计长期学习系统，让过去的信息更容易被重新阅读？',
      chooseTopics: '选择允许用于本次问题的主题',
      includedByYou: '由你授权',
      excludedByYou: '由你排除',
      notIncluded: '未授权',
      contextPreview: 'Context Preview',
      nothingSelected: '还没有内容进入本次上下文。完整档案仍留在本地。',
      previewLearning1: '真正的问题不是积累，而是如何重新阅读过去的信息。',
      previewLearning2: '减少持续的手动整理，把注意力留给阅读和判断。',
      previewReading: '只保留未来仍可能需要回看的判断，而不是保存全部摘抄。',
      previewWorkflow: '同步应该优先处理变化，而不是反复处理全部历史内容。',
      copyContext: '复制上下文',
      copied: '已复制 · 没有内容被自动发送给任何 AI',
      prepared: '上下文已在本地准备 · 没有内容被发送',
      nothingLeaves: '在你主动复制或导出之前，没有档案内容离开这里。',
      settingsTitle: '自动化应该有明确边界。',
      settingsBody: '稳定规则交给程序；只有真正需要语义判断的地方才交给 AI。',
      smartFilter: '智能过滤',
      off: '关闭',
      light: '轻度',
      strong: '强度较高',
      recommended: '推荐',
      lightRule: '只过滤高置信度的纯对话控制信息。',
      uncertaintyRule: '不确定时，保留。',
      filterChanged: '过滤设置已立即应用',
      captureScope: '当前抓取范围',
      capturedLabel: '收录',
      notCapturedLabel: '不收录',
      capturedItems: '已经发送的用户输入',
      notCapturedItems: '草稿 · 键盘输入 · AI 回复 · Temporary Chat',
      precedence: '用户优先级',
      precedenceBody: '你修改或移除的内容，不会被后续过滤、同步或 AI 整理静默覆盖。',
      tryHint: '可以试着打开一个会话、改一句话，或进入 AI Context。这里不会使用你的真实数据。'
    },
    en: {
      interactive: 'Interactive demo',
      localDemo: 'Demo data · runs entirely in your browser',
      reset: 'Reset demo',
      inputArchive: 'Input Archive',
      thoughtLibrary: 'Thought Library',
      aiContext: 'AI Context',
      settings: 'Settings',
      local: 'LOCAL',
      archiveTitle: 'What you said becomes your own archive first.',
      archiveBody: 'Read by real conversation. Open one and edit the text directly.',
      sync: 'Sync',
      synced: 'Synced',
      syncDone: 'Synced · 2 new inputs · existing material was not reprocessed',
      upToDate: 'Already up to date',
      demoWorkspace: 'Demo workspace',
      inputs: 'inputs',
      conversations: 'conversations',
      lightFilter: 'Light filter',
      openConversation: 'Open conversation',
      archiveCard1: 'Product research & decisions',
      archiveCard1Summary: 'Ongoing thinking about long-term tools, archives, and product boundaries.',
      archiveCard2: 'Reading & research notes',
      archiveCard2Summary: 'Judgments worth keeping from reading, rather than full excerpts.',
      archiveCard3: 'Travel planning',
      archiveCard3Summary: 'Scattered plans, preferences, and decisions that changed over time.',
      archiveCardMeta1: '8 inputs · updated Sep 8',
      archiveCardMeta2: '6 inputs · updated Sep 6',
      archiveCardMeta3: '5 inputs · updated Aug 30',
      backArchive: 'Back to Input Archive',
      archiveReadHint: 'Click the text to edit it. Changes stay in the demo state and propagate to the Thought Library that depends on it.',
      oldest: 'Oldest first',
      newest: 'Newest first',
      edited: 'Edited by you',
      saved: 'Saved locally · your edit takes priority over automatic processing',
      sent: 'Sent',
      captured: 'Captured',
      sentUnknown: 'Unknown · original time could not be recovered reliably',
      remove: 'Remove this input',
      removed: 'Removed · it will not return on a later sync',
      undo: 'Undo',
      restored: 'Restored',
      recovered: 'Recovered history',
      thoughtTitle: 'Not another chat history. Long-term topics.',
      thoughtBody: 'Topics combine multiple conversations. Your source expression remains the default; AI organization is only a removable interpretation layer.',
      sources: 'sources',
      sourceEntries: 'source entries',
      openTopic: 'Open topic',
      topicLearning: 'Long-term learning system',
      topicLearningSummary: 'A shift from “collect more” toward making old material readable again.',
      topicProduct: 'Product research',
      topicProductSummary: 'Judgments about boundaries, defaults, and long-term behavior.',
      topicReading: 'Reading & research',
      topicReadingSummary: 'What is worth keeping, how to reduce accumulation, and how to revisit it.',
      topicWriting: 'Writing & creation',
      topicWritingSummary: 'Expression habits, structural choices, and long-term creative direction.',
      backTopics: 'Back to topics',
      sourceView: 'Source view',
      aiOrganize: 'AI Organize',
      aiDerived: 'AI-derived',
      aiOff: 'Off',
      aiOn: 'On',
      oneSourceChanged: '1 source was edited by you',
      derivedFrom: 'Based on {n} source entries',
      viewSources: 'View sources',
      hideSources: 'Hide sources',
      currentUnderstanding: 'Current understanding',
      derivedSummary: 'Over the past few months, the priority has shifted from “collect as much as possible” toward making old material easier to find, read, and turn into judgment. The system should reduce organization work rather than create another maintenance burden.',
      sourceStillHere: 'The source view remains below. AI organization never overwrites it.',
      contextTitle: 'Your full archive is not what AI gets to see.',
      contextBody: 'Nothing is authorized by default. Choose only the sources needed for the current question.',
      externalAccess: 'Allow external AI to use context',
      accessOff: 'Off',
      accessOn: 'On',
      accessEnabled: 'External AI access is enabled · no sources are selected yet',
      accessDisabled: 'External AI access is off · this request context was cleared',
      yourArchive: 'Your archive',
      thisContext: 'This context',
      topics: 'topics',
      sourcesSelected: 'sources',
      demoData: 'Demo data',
      currentQuestion: 'Current question',
      question: 'How should I redesign my long-term learning system so older material is easier to revisit?',
      chooseTopics: 'Choose topics allowed for this question',
      includedByYou: 'Included by you',
      excludedByYou: 'Excluded by you',
      notIncluded: 'Not included',
      contextPreview: 'Context Preview',
      nothingSelected: 'Nothing has entered this request context. Your full archive remains local.',
      previewLearning1: 'The real problem is not accumulation, but how to reread information from the past.',
      previewLearning2: 'Reduce constant manual organization so more attention can go to reading and judgment.',
      previewReading: 'Keep the judgments that may still matter later instead of preserving every excerpt.',
      previewWorkflow: 'Sync should process what changed rather than repeatedly processing the entire history.',
      copyContext: 'Copy context',
      copied: 'Copied · nothing was automatically sent to any AI',
      prepared: 'Context prepared locally · nothing was sent',
      nothingLeaves: 'Nothing leaves the archive until you explicitly copy or export it.',
      settingsTitle: 'Automation should have a clear boundary.',
      settingsBody: 'Stable rules belong to software. AI is reserved for work that genuinely needs semantic judgment.',
      smartFilter: 'Smart Filter',
      off: 'Off',
      light: 'Light',
      strong: 'Stronger',
      recommended: 'Recommended',
      lightRule: 'Filter only high-confidence conversational control noise.',
      uncertaintyRule: 'When uncertain, keep it.',
      filterChanged: 'Filter setting applied immediately',
      captureScope: 'Current capture scope',
      capturedLabel: 'Captured',
      notCapturedLabel: 'Not captured',
      capturedItems: 'User inputs that were actually sent',
      notCapturedItems: 'Drafts · keystrokes · AI replies · Temporary Chat',
      precedence: 'User precedence',
      precedenceBody: 'What you edit or remove is never silently overwritten by later filtering, sync, or AI organization.',
      tryHint: 'Try opening a conversation, editing a sentence, or visiting AI Context. No personal data is used here.'
    }
  };

  const entries = {
    e1: {
      sent: 'Sep 7 · 22:14', captured: 'Sep 10 · 03:41', sort: 1,
      zh: '最近我越来越觉得，积累资料不是问题，真正的问题是很难重新找到和阅读以前的东西。',
      en: 'I increasingly feel that collecting material is not the problem. The real problem is finding and rereading older material.'
    },
    e2: {
      sent: 'Sep 8 · 01:03', captured: 'Sep 10 · 03:42', sort: 2,
      zh: '我不希望再做一个需要不断整理的系统，它应该减少维护本身，把注意力留给阅读和判断。',
      en: 'I do not want another system that constantly needs organizing. It should reduce maintenance and leave attention for reading and judgment.'
    },
    e3: {
      sent: null, captured: 'Sep 10 · 03:43', sort: 3,
      zh: '旧内容如果无法可靠恢复原始发送时间，就应该明确标成未知，而不是拿抓取时间代替。',
      en: 'If the original sent time of older material cannot be recovered reliably, it should be marked unknown rather than replaced with capture time.'
    }
  };

  const makeState = () => ({
    screen: 'archive',
    archiveView: 'home',
    thoughtView: 'home',
    aiOrganized: false,
    sourcesOpen: false,
    externalAccess: false,
    contextSelected: new Set(),
    contextExcluded: new Set(),
    filter: 'light',
    order: 'asc',
    synced: false,
    archiveCount: 2418,
    removed: new Set(),
    edited: { zh: {}, en: {} }
  });

  let state = makeState();
  let toastTimer = null;
  let toastAction = null;

  const t = () => copy[lang()];
  const entryText = (id) => state.edited[lang()][id] ?? entries[id][lang()];
  const activeEntries = () => Object.keys(entries).filter((id) => !state.removed.has(id));
  const learningSourceCount = () => 12 - (state.removed.has('e2') ? 1 : 0);
  const hasEditedSource = () => Boolean(state.edited.zh.e1 || state.edited.en.e1 || state.edited.zh.e2 || state.edited.en.e2);

  const setTop = (name) => {
    if (titleNode) titleNode.textContent = name;
    navButtons.forEach((button) => {
      const active = button.dataset.demoNav === state.screen;
      button.classList.toggle('is-active', active);
      if (active) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
  };

  const showToast = (message, actionLabel = '', action = null) => {
    if (!toast) return;
    window.clearTimeout(toastTimer);
    toastAction = action;
    toast.innerHTML = `<span>${escapeHtml(message)}</span>${actionLabel ? `<button type="button" data-demo-toast-action>${escapeHtml(actionLabel)}</button>` : ''}`;
    toast.classList.add('is-visible');
    if (actionLabel) {
      toast.querySelector('[data-demo-toast-action]')?.addEventListener('click', () => {
        const fn = toastAction;
        toastAction = null;
        toast.classList.remove('is-visible');
        if (fn) fn();
      });
    }
    toastTimer = window.setTimeout(() => {
      toast.classList.remove('is-visible');
      toastAction = null;
    }, actionLabel ? 5600 : 3200);
  };

  const trashIcon = () => `
    <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 6.5h8m-6-2h4m-7 2 .7 9h8.6l.7-9M8 9v4.5m4-4.5v4.5" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  const renderArchiveHome = () => {
    const c = t();
    stage.innerHTML = `
      <div class="demo-page-head">
        <div><span class="demo-kicker">Input Archive</span><h3>${c.archiveTitle}</h3><p>${c.archiveBody}</p></div>
        <button class="demo-secondary" type="button" data-demo-sync>${state.synced ? c.synced : c.sync}</button>
      </div>
      <div class="demo-stat-line">
        <span>${c.demoWorkspace}</span><span>${state.archiveCount.toLocaleString()} ${c.inputs}</span><span>3 ${c.conversations}</span><span>${c.lightFilter}</span>
      </div>
      <div class="demo-conversation-grid">
        ${[
          ['research', c.archiveCard1, c.archiveCard1Summary, c.archiveCardMeta1],
          ['reading', c.archiveCard2, c.archiveCard2Summary, c.archiveCardMeta2],
          ['travel', c.archiveCard3, c.archiveCard3Summary, c.archiveCardMeta3]
        ].map(([id, title, summary, meta]) => `
          <button class="demo-conversation-card" type="button" data-demo-conversation="${id}">
            <span class="demo-card-title">${escapeHtml(title)}</span>
            <span class="demo-card-summary">${escapeHtml(summary)}</span>
            <span class="demo-card-meta">${escapeHtml(meta)} <b>${c.openConversation} →</b></span>
          </button>`).join('')}
      </div>`;

    stage.querySelector('[data-demo-sync]')?.addEventListener('click', () => {
      if (!state.synced) {
        state.synced = true;
        state.archiveCount += 2;
        render();
        showToast(c.syncDone);
      } else showToast(c.upToDate);
    });

    stage.querySelectorAll('[data-demo-conversation]').forEach((button) => {
      button.addEventListener('click', () => {
        state.archiveView = 'conversation';
        state.currentConversation = button.dataset.demoConversation;
        render();
      });
    });
  };

  const renderEntry = (id) => {
    const c = t();
    const entry = entries[id];
    const edited = Boolean(state.edited[lang()][id]);
    const timeLabel = entry.sent || c.recovered;
    return `
      <article class="demo-entry" data-demo-entry="${id}">
        <div class="demo-entry-head">
          <button type="button" class="demo-time" data-demo-time aria-expanded="false">${escapeHtml(timeLabel)}</button>
          <div class="demo-entry-actions">
            ${edited ? `<span class="demo-state demo-state-you">${c.edited}</span>` : `<span class="demo-state demo-state-source">Source</span>`}
            <button type="button" class="demo-icon-button" data-demo-remove aria-label="${escapeHtml(c.remove)}">${trashIcon()}</button>
          </div>
        </div>
        <div class="demo-time-detail" data-demo-time-detail hidden>
          <span><b>${c.sent}</b>${entry.sent ? escapeHtml(entry.sent) : escapeHtml(c.sentUnknown)}</span>
          <span><b>${c.captured}</b>${escapeHtml(entry.captured)}</span>
        </div>
        <p class="demo-editable" contenteditable="true" spellcheck="false" data-demo-editable>${escapeHtml(entryText(id))}</p>
      </article>`;
  };

  const renderConversation = () => {
    const c = t();
    const title = state.currentConversation === 'reading' ? c.archiveCard2 : state.currentConversation === 'travel' ? c.archiveCard3 : c.archiveCard1;
    const ids = activeEntries().sort((a, b) => state.order === 'asc' ? entries[a].sort - entries[b].sort : entries[b].sort - entries[a].sort);
    stage.innerHTML = `
      <div class="demo-page-head demo-page-head-compact">
        <div>
          <button class="demo-back" type="button" data-demo-back-archive>← ${c.backArchive}</button>
          <h3>${escapeHtml(title)}</h3>
          <p>${c.archiveReadHint}</p>
        </div>
        <button class="demo-secondary" type="button" data-demo-order>${state.order === 'asc' ? c.oldest : c.newest}</button>
      </div>
      <div class="demo-document">
        ${ids.map(renderEntry).join('')}
      </div>`;

    stage.querySelector('[data-demo-back-archive]')?.addEventListener('click', () => {
      state.archiveView = 'home';
      render();
    });
    stage.querySelector('[data-demo-order]')?.addEventListener('click', () => {
      state.order = state.order === 'asc' ? 'desc' : 'asc';
      render();
    });
    stage.querySelectorAll('[data-demo-entry]').forEach((article) => {
      const id = article.dataset.demoEntry;
      const timeButton = article.querySelector('[data-demo-time]');
      const timeDetail = article.querySelector('[data-demo-time-detail]');
      timeButton?.addEventListener('click', () => {
        const open = timeButton.getAttribute('aria-expanded') === 'true';
        timeButton.setAttribute('aria-expanded', String(!open));
        timeDetail.hidden = open;
      });
      article.querySelector('[data-demo-remove]')?.addEventListener('click', () => {
        state.removed.add(id);
        render();
        showToast(c.removed, c.undo, () => {
          state.removed.delete(id);
          render();
          showToast(c.restored);
        });
      });
      const editable = article.querySelector('[data-demo-editable]');
      editable?.addEventListener('blur', () => {
        const next = editable.textContent.trim();
        if (!next || next === entryText(id)) return;
        state.edited[lang()][id] = next;
        showToast(c.saved);
        render();
      });
      editable?.addEventListener('keydown', (event) => {
        if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') editable.blur();
      });
    });
  };

  const topicCards = () => {
    const c = t();
    return [
      ['learning', c.topicLearning, c.topicLearningSummary, learningSourceCount()],
      ['product', c.topicProduct, c.topicProductSummary, 9],
      ['reading', c.topicReading, c.topicReadingSummary, 7],
      ['writing', c.topicWriting, c.topicWritingSummary, 5]
    ];
  };

  const renderThoughtHome = () => {
    const c = t();
    stage.innerHTML = `
      <div class="demo-page-head">
        <div><span class="demo-kicker">Thought Library</span><h3>${c.thoughtTitle}</h3><p>${c.thoughtBody}</p></div>
      </div>
      <div class="demo-topic-grid">
        ${topicCards().map(([id, title, summary, count]) => `
          <button class="demo-topic-card" type="button" data-demo-topic="${id}">
            <span class="demo-topic-count">${count} ${c.sources}</span>
            <span class="demo-card-title">${escapeHtml(title)}</span>
            <span class="demo-card-summary">${escapeHtml(summary)}</span>
            <span class="demo-card-meta"><b>${c.openTopic} →</b></span>
          </button>`).join('')}
      </div>`;

    stage.querySelectorAll('[data-demo-topic]').forEach((button) => {
      button.addEventListener('click', () => {
        state.thoughtView = 'topic';
        state.currentTopic = button.dataset.demoTopic;
        state.aiOrganized = false;
        state.sourcesOpen = false;
        render();
      });
    });
  };

  const renderSourceBlock = (id) => {
    const c = t();
    if (state.removed.has(id)) return '';
    const entry = entries[id];
    const edited = Boolean(state.edited[lang()][id]);
    return `
      <article class="demo-source-block">
        <div><span class="demo-state ${edited ? 'demo-state-you' : 'demo-state-source'}">${edited ? c.edited : 'Source'}</span><span>${entry.sent || c.recovered}</span></div>
        <p>${escapeHtml(entryText(id))}</p>
      </article>`;
  };

  const renderThoughtTopic = () => {
    const c = t();
    const count = learningSourceCount();
    stage.innerHTML = `
      <div class="demo-page-head demo-page-head-compact">
        <div>
          <button class="demo-back" type="button" data-demo-back-topics>← ${c.backTopics}</button>
          <h3>${c.topicLearning}</h3>
          <div class="demo-inline-meta"><span class="demo-state demo-state-source">${c.sourceView}</span><span>${count} ${c.sourceEntries}</span>${hasEditedSource() ? `<span class="demo-state demo-state-you">${c.oneSourceChanged}</span>` : ''}</div>
        </div>
        <button class="demo-ai-toggle ${state.aiOrganized ? 'is-on' : ''}" type="button" data-demo-ai-toggle aria-pressed="${state.aiOrganized}"><span>${c.aiOrganize}</span><i><b></b></i><em>${state.aiOrganized ? c.aiOn : c.aiOff}</em></button>
      </div>
      ${state.aiOrganized ? `
        <section class="demo-derived-card">
          <div class="demo-derived-meta"><span class="demo-state demo-state-ai">${c.aiDerived}</span><span>${c.derivedFrom.replace('{n}', count)}</span><button type="button" data-demo-view-sources>${state.sourcesOpen ? c.hideSources : c.viewSources}</button></div>
          <h4>${c.currentUnderstanding}</h4>
          <p>${c.derivedSummary}</p>
          ${state.sourcesOpen ? `<div class="demo-source-list"><span>ChatGPT · Sep 7</span><span>ChatGPT · Sep 8</span><span>ChatGPT · ${c.recovered}</span></div>` : ''}
        </section>
        <p class="demo-source-continuity">${c.sourceStillHere}</p>` : ''}
      <div class="demo-source-stack">
        ${renderSourceBlock('e1')}
        ${renderSourceBlock('e2')}
        ${renderSourceBlock('e3')}
      </div>`;

    stage.querySelector('[data-demo-back-topics]')?.addEventListener('click', () => {
      state.thoughtView = 'home';
      render();
    });
    stage.querySelector('[data-demo-ai-toggle]')?.addEventListener('click', () => {
      state.aiOrganized = !state.aiOrganized;
      state.sourcesOpen = false;
      render();
    });
    stage.querySelector('[data-demo-view-sources]')?.addEventListener('click', () => {
      state.sourcesOpen = !state.sourcesOpen;
      render();
    });
  };

  const contextTopics = () => [
    { id: 'learning', title: t().topicLearning, sources: state.removed.has('e2') ? 1 : 2 },
    { id: 'reading', title: t().topicReading, sources: 1 },
    { id: 'workflow', title: lang() === 'zh' ? '工作流' : 'Workflows', sources: 1 }
  ];

  const selectedSourceCount = () => contextTopics().reduce((sum, topic) => sum + (state.contextSelected.has(topic.id) ? topic.sources : 0), 0);

  const renderContext = () => {
    const c = t();
    const count = selectedSourceCount();
    const previews = [];
    if (state.contextSelected.has('learning')) {
      previews.push(c.previewLearning1);
      if (!state.removed.has('e2')) previews.push(c.previewLearning2);
    }
    if (state.contextSelected.has('reading')) previews.push(c.previewReading);
    if (state.contextSelected.has('workflow')) previews.push(c.previewWorkflow);

    stage.innerHTML = `
      <div class="demo-page-head">
        <div><span class="demo-kicker">AI Context</span><h3>${c.contextTitle}</h3><p>${c.contextBody}</p></div>
        <button class="demo-access-toggle ${state.externalAccess ? 'is-on' : ''}" type="button" data-demo-access aria-pressed="${state.externalAccess}"><span>${c.externalAccess}</span><i><b></b></i><em>${state.externalAccess ? c.accessOn : c.accessOff}</em></button>
      </div>
      <div class="demo-context-math">
        <div><span>${c.yourArchive}</span><strong>${state.archiveCount.toLocaleString()}</strong><small>${c.inputs} · 36 ${c.topics} · ${c.demoData}</small></div>
        <span class="demo-context-arrow">→</span>
        <div class="is-context"><span>${c.thisContext}</span><strong>${count}</strong><small>${c.sourcesSelected}</small></div>
      </div>
      <div class="demo-question"><span>${c.currentQuestion}</span><p>${c.question}</p></div>
      <section class="demo-context-picker ${state.externalAccess ? '' : 'is-disabled'}">
        <h4>${c.chooseTopics}</h4>
        ${contextTopics().map((topic) => {
          const checked = state.contextSelected.has(topic.id);
          const excluded = state.contextExcluded.has(topic.id) && !checked;
          const status = checked ? c.includedByYou : excluded ? c.excludedByYou : c.notIncluded;
          return `<label class="demo-context-row">
            <input type="checkbox" data-demo-context-topic="${topic.id}" ${checked ? 'checked' : ''} ${state.externalAccess ? '' : 'disabled'} />
            <span><b>${escapeHtml(topic.title)}</b><small>${topic.sources} ${c.sources}</small></span>
            <em class="${checked ? 'is-included' : excluded ? 'is-excluded' : ''}">${status}</em>
          </label>`;
        }).join('')}
      </section>
      <section class="demo-preview">
        <div class="demo-preview-head"><h4>${c.contextPreview}</h4><span>${c.local}</span></div>
        ${previews.length ? previews.map((text, index) => `<article><span class="demo-state demo-state-source">Source ${index + 1}</span><p>${escapeHtml(text)}</p></article>`).join('') : `<p class="demo-empty-preview">${c.nothingSelected}</p>`}
      </section>
      <div class="demo-context-actions">
        <button class="demo-primary" type="button" data-demo-copy-context ${count ? '' : 'disabled'}>${c.copyContext}</button>
        <span>${c.nothingLeaves}</span>
      </div>`;

    stage.querySelector('[data-demo-access]')?.addEventListener('click', () => {
      state.externalAccess = !state.externalAccess;
      if (!state.externalAccess) state.contextSelected.clear();
      render();
      showToast(state.externalAccess ? c.accessEnabled : c.accessDisabled);
    });
    stage.querySelectorAll('[data-demo-context-topic]').forEach((input) => {
      input.addEventListener('change', () => {
        const id = input.dataset.demoContextTopic;
        if (input.checked) {
          state.contextSelected.add(id);
          state.contextExcluded.delete(id);
        } else {
          state.contextSelected.delete(id);
          state.contextExcluded.add(id);
        }
        render();
      });
    });
    stage.querySelector('[data-demo-copy-context]')?.addEventListener('click', async () => {
      const text = previews.join('\n\n');
      try {
        await navigator.clipboard.writeText(text);
        showToast(c.copied);
      } catch (_) {
        showToast(c.prepared);
      }
    });
  };

  const renderSettings = () => {
    const c = t();
    stage.innerHTML = `
      <div class="demo-page-head">
        <div><span class="demo-kicker">Settings</span><h3>${c.settingsTitle}</h3><p>${c.settingsBody}</p></div>
      </div>
      <section class="demo-settings-section">
        <div class="demo-settings-heading"><div><h4>${c.smartFilter}</h4><p>${c.lightRule} <strong>${c.uncertaintyRule}</strong></p></div><span>${c.recommended}</span></div>
        <div class="demo-segmented" role="group" aria-label="${escapeHtml(c.smartFilter)}">
          ${[['off', c.off], ['light', c.light], ['strong', c.strong]].map(([id, label]) => `<button type="button" data-demo-filter="${id}" aria-pressed="${state.filter === id}" class="${state.filter === id ? 'is-active' : ''}">${label}${id === 'light' ? `<small>${c.recommended}</small>` : ''}</button>`).join('')}
        </div>
      </section>
      <section class="demo-settings-section">
        <h4>${c.captureScope}</h4>
        <div class="demo-scope-row is-positive"><span>${c.capturedLabel}</span><p>${c.capturedItems}</p></div>
        <div class="demo-scope-row"><span>${c.notCapturedLabel}</span><p>${c.notCapturedItems}</p></div>
      </section>
      <section class="demo-settings-section">
        <h4>${c.precedence}</h4>
        <p class="demo-precedence">${c.precedenceBody}</p>
      </section>`;

    stage.querySelectorAll('[data-demo-filter]').forEach((button) => {
      button.addEventListener('click', () => {
        state.filter = button.dataset.demoFilter;
        render();
        showToast(c.filterChanged);
      });
    });
  };

  const render = () => {
    const c = t();
    if (!stage) return;

    if (state.screen === 'archive') {
      setTop(c.inputArchive);
      if (state.archiveView === 'conversation') renderConversation();
      else renderArchiveHome();
    } else if (state.screen === 'thoughts') {
      setTop(c.thoughtLibrary);
      if (state.thoughtView === 'topic') renderThoughtTopic();
      else renderThoughtHome();
    } else if (state.screen === 'context') {
      setTop(c.aiContext);
      renderContext();
    } else {
      setTop(c.settings);
      renderSettings();
    }

    root.querySelector('[data-demo-local-label]')?.replaceChildren(document.createTextNode(c.localDemo));
    root.querySelector('[data-demo-interactive-label]')?.replaceChildren(document.createTextNode(c.interactive));
    if (resetButton) resetButton.textContent = c.reset;
    root.querySelector('[data-demo-hint]')?.replaceChildren(document.createTextNode(c.tryHint));
    root.querySelectorAll('[data-demo-nav="archive"] span').forEach((node) => { node.textContent = c.inputArchive; });
    root.querySelectorAll('[data-demo-nav="thoughts"] span').forEach((node) => { node.textContent = c.thoughtLibrary; });
    root.querySelectorAll('[data-demo-nav="context"] span').forEach((node) => { node.textContent = c.aiContext; });
    root.querySelectorAll('[data-demo-nav="settings"] span').forEach((node) => { node.textContent = c.settings; });
  };

  navButtons.forEach((button) => {
    button.addEventListener('click', () => {
      state.screen = button.dataset.demoNav;
      render();
    });
  });

  resetButton?.addEventListener('click', () => {
    state = makeState();
    render();
  });

  root.addEventListener('keydown', (event) => {
    if (!event.target.matches('[data-demo-nav]')) return;
    const index = navButtons.indexOf(event.target);
    if (index < 0) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      event.preventDefault();
      navButtons[(index + 1) % navButtons.length].focus();
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      event.preventDefault();
      navButtons[(index - 1 + navButtons.length) % navButtons.length].focus();
    }
  });

  window.addEventListener('paia:languagechange', render);
  render();
})();

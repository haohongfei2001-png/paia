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
      interactive: '交互演示', localDemo: '演示数据 · 完全在浏览器本地运行', reset: '重置演示',
      inputArchive: 'Input Archive', thoughtLibrary: 'Thought Library', aiContext: 'AI Context', settings: '设置', local: 'LOCAL',
      archiveTitle: '你说过的话，先成为自己的档案。', archiveBody: '按真实会话阅读。点开一个窗口，正文可以直接修改。',
      sync: '同步', synced: '已同步', syncDone: '已同步 · 2 条新输入已加入 · 现有内容未重新处理', upToDate: '已是最新状态',
      demoWorkspace: '演示空间', inputs: '条输入', conversations: '个会话', currentFilter: '当前过滤', openConversation: '打开会话',
      backArchive: '返回 Input Archive', archiveReadHint: '点击正文即可编辑。修改只保存在当前语言的演示状态，并会影响依赖它的 Thought Library。',
      oldest: '时间正序', newest: '时间倒序', edited: '由你修改', saved: '已在本地保存 · 用户修改优先于自动处理',
      sent: '原始发送', captured: '抓取', sentUnknown: '未知 · 原始时间不可可靠恢复', remove: '移除这条输入',
      removed: '已移除 · 后续同步不会让它重新出现', undo: '撤销', restored: '已恢复', recovered: '历史补录',
      thoughtTitle: '不是另一份聊天记录，而是长期主题。', thoughtBody: '主题来自多个会话。默认仍然是你的表达，AI 整理只是一层可关闭的理解。',
      sources: '来源', sourceEntries: '条来源', openTopic: '打开主题', backTopics: '返回主题', sourceView: '原始表达',
      aiOrganize: 'AI 整理', aiDerived: 'AI 派生', aiOff: '关闭', aiOn: '开启', editedSources: '条来源已由你修改',
      derivedFrom: '基于 {n} 条来源', viewSources: '查看来源', hideSources: '收起来源', currentUnderstanding: '当前理解',
      sourceStillHere: '原始表达仍然保留在下面，AI 整理不会覆盖它。',
      contextTitle: '完整档案，不等于 AI 能看到的内容。', contextBody: '默认没有任何主题被授权。只为当前问题选择必要来源。',
      externalAccess: '允许外部 AI 使用上下文', accessOff: '关闭', accessOn: '已开启',
      accessEnabled: '外部 AI 授权已开启 · 当前仍未选择任何来源', accessDisabled: '外部 AI 授权已关闭 · 已清空本次上下文',
      yourArchive: '你的档案', thisContext: '本次上下文', topics: '个主题', sourcesSelected: '条来源', demoData: '演示数据',
      currentQuestion: '当前问题', question: '我应该怎样重新设计长期学习系统，让过去的信息更容易被重新阅读？',
      chooseTopics: '选择允许用于本次问题的主题', relevantSources: '条相关来源', includedByYou: '由你授权', excludedByYou: '由你排除', notIncluded: '未授权',
      contextPreview: 'Context Preview', nothingSelected: '还没有内容进入本次上下文。完整档案仍留在本地。',
      copyContext: '复制上下文', copied: '已复制 · 没有内容被自动发送给任何 AI', prepared: '上下文已在本地准备 · 没有内容被发送',
      nothingLeaves: '在你主动复制或导出之前，没有档案内容离开这里。',
      settingsTitle: '自动化应该有明确边界。', settingsBody: '稳定规则交给程序；只有真正需要语义判断的地方才交给 AI。',
      smartFilter: '智能过滤', off: '关闭', light: '轻度', strong: '强度较高', recommended: '推荐',
      lightRule: '轻度只过滤高置信度的纯对话控制信息。', uncertaintyRule: '不确定时，保留。', filterChanged: '过滤设置已立即应用',
      filterResult: '当前 Input Archive：{visible} 条可见 · {hidden} 条被过滤',
      captureScope: '当前抓取范围', capturedLabel: '收录', notCapturedLabel: '不收录', capturedItems: '已经发送的用户输入',
      notCapturedItems: '草稿 · 键盘输入 · AI 回复 · Temporary Chat', precedence: '用户优先级',
      precedenceBody: '你修改或移除的内容，不会被后续过滤、同步或 AI 整理静默覆盖。',
      tryHint: '可以试着打开不同会话、修改一句话、切换过滤，或进入 AI Context。这里不会使用你的真实数据。',
      source: 'Source', filterOff: '关闭', filterLight: '轻度', filterStrong: '强度较高', updated: '最近更新'
    },
    en: {
      interactive: 'Interactive demo', localDemo: 'Demo data · runs entirely in your browser', reset: 'Reset demo',
      inputArchive: 'Input Archive', thoughtLibrary: 'Thought Library', aiContext: 'AI Context', settings: 'Settings', local: 'LOCAL',
      archiveTitle: 'What you said becomes your own archive first.', archiveBody: 'Read by real conversation. Open one and edit the text directly.',
      sync: 'Sync', synced: 'Synced', syncDone: 'Synced · 2 new inputs added · existing material was not reprocessed', upToDate: 'Already up to date',
      demoWorkspace: 'Demo workspace', inputs: 'inputs', conversations: 'conversations', currentFilter: 'Filter', openConversation: 'Open conversation',
      backArchive: 'Back to Input Archive', archiveReadHint: 'Click the text to edit it. Changes stay in the demo state for this language and propagate to the Thought Library that depends on it.',
      oldest: 'Oldest first', newest: 'Newest first', edited: 'Edited by you', saved: 'Saved locally · your edit takes priority over automatic processing',
      sent: 'Sent', captured: 'Captured', sentUnknown: 'Unknown · original time could not be recovered reliably', remove: 'Remove this input',
      removed: 'Removed · it will not return on a later sync', undo: 'Undo', restored: 'Restored', recovered: 'Recovered history',
      thoughtTitle: 'Not another chat history. Long-term topics.', thoughtBody: 'Topics combine multiple conversations. Your source expression remains the default; AI organization is only a removable interpretation layer.',
      sources: 'sources', sourceEntries: 'source entries', openTopic: 'Open topic', backTopics: 'Back to topics', sourceView: 'Source view',
      aiOrganize: 'AI Organize', aiDerived: 'AI-derived', aiOff: 'Off', aiOn: 'On', editedSources: 'sources edited by you',
      derivedFrom: 'Based on {n} source entries', viewSources: 'View sources', hideSources: 'Hide sources', currentUnderstanding: 'Current understanding',
      sourceStillHere: 'The source view remains below. AI organization never overwrites it.',
      contextTitle: 'Your full archive is not what AI gets to see.', contextBody: 'Nothing is authorized by default. Choose only the sources needed for the current question.',
      externalAccess: 'Allow external AI to use context', accessOff: 'Off', accessOn: 'On',
      accessEnabled: 'External AI access is enabled · no sources are selected yet', accessDisabled: 'External AI access is off · this request context was cleared',
      yourArchive: 'Your archive', thisContext: 'This context', topics: 'topics', sourcesSelected: 'sources', demoData: 'Demo data',
      currentQuestion: 'Current question', question: 'How should I redesign my long-term learning system so older material is easier to revisit?',
      chooseTopics: 'Choose topics allowed for this question', relevantSources: 'relevant sources', includedByYou: 'Included by you', excludedByYou: 'Excluded by you', notIncluded: 'Not included',
      contextPreview: 'Context Preview', nothingSelected: 'Nothing has entered this request context. Your full archive remains local.',
      copyContext: 'Copy context', copied: 'Copied · nothing was automatically sent to any AI', prepared: 'Context prepared locally · nothing was sent',
      nothingLeaves: 'Nothing leaves the archive until you explicitly copy or export it.',
      settingsTitle: 'Automation should have a clear boundary.', settingsBody: 'Stable rules belong to software. AI is reserved for work that genuinely needs semantic judgment.',
      smartFilter: 'Smart Filter', off: 'Off', light: 'Light', strong: 'Stronger', recommended: 'Recommended',
      lightRule: 'Light filters only high-confidence conversational control noise.', uncertaintyRule: 'When uncertain, keep it.', filterChanged: 'Filter setting applied immediately',
      filterResult: 'Input Archive now: {visible} visible · {hidden} filtered',
      captureScope: 'Current capture scope', capturedLabel: 'Captured', notCapturedLabel: 'Not captured', capturedItems: 'User inputs that were actually sent',
      notCapturedItems: 'Drafts · keystrokes · AI replies · Temporary Chat', precedence: 'User precedence',
      precedenceBody: 'What you edit or remove is never silently overwritten by later filtering, sync, or AI organization.',
      tryHint: 'Try different conversations, edit a sentence, change the filter, or visit AI Context. No personal data is used here.',
      source: 'Source', filterOff: 'Off', filterLight: 'Light', filterStrong: 'Stronger', updated: 'updated'
    }
  };

  const conversations = {
    research: {
      title: { zh: '产品研究与决策', en: 'Product research & decisions' },
      summary: { zh: '关于长期工具、信息归档与产品边界的持续思考。', en: 'Ongoing thinking about long-term tools, archives, and product boundaries.' }
    },
    reading: {
      title: { zh: '阅读与研究笔记', en: 'Reading & research notes' },
      summary: { zh: '记录阅读时真正想留下的判断，而不是完整摘抄。', en: 'Judgments worth keeping from reading, rather than full excerpts.' }
    },
    travel: {
      title: { zh: '旅行计划', en: 'Travel planning' },
      summary: { zh: '零散计划、偏好与后来改变过的决定。', en: 'Scattered plans, preferences, and decisions that changed over time.' }
    }
  };

  const entries = {
    r1: { conversation: 'research', topics: ['learning','product'], filter: 'keep', sent: 'Sep 7 · 22:14', captured: 'Sep 10 · 03:41', sort: 101, zh: '最近我越来越觉得，积累资料不是问题，真正的问题是很难重新找到和阅读以前的东西。', en: 'I increasingly feel that collecting material is not the problem. The real problem is finding and rereading older material.' },
    r2: { conversation: 'research', topics: ['product'], filter: 'keep', sent: 'Sep 8 · 01:03', captured: 'Sep 10 · 03:42', sort: 102, zh: '产品的默认值比设置页更能表达立场，尤其是涉及隐私和 AI 权限的时候。', en: 'Product defaults express a position more clearly than settings pages, especially around privacy and AI access.' },
    r3: { conversation: 'research', topics: ['product'], filter: 'keep', sent: 'Sep 8 · 09:26', captured: 'Sep 10 · 03:42', sort: 103, zh: '我希望系统看起来像长期工具，而不是一个需要持续维护的新项目。', en: 'I want the system to feel like a long-term tool, not another project that needs constant maintenance.' },
    r4: { conversation: 'research', topics: ['learning'], filter: 'keep', sent: 'Sep 8 · 13:40', captured: 'Sep 10 · 03:42', sort: 104, zh: '长期信息真正有价值的部分，是几年后仍然能重新找到当时为什么这样判断。', en: 'The value of long-term information is being able to recover why a judgment was made years later.' },
    r5: { conversation: 'research', topics: ['product'], filter: 'keep', sent: 'Sep 8 · 16:18', captured: 'Sep 10 · 03:42', sort: 105, zh: '如果一个功能需要解释很多遍才能显得有价值，它可能还没有找到正确的产品形态。', en: 'If a feature needs repeated explanation to seem valuable, it may not yet have found the right product form.' },
    r6: { conversation: 'research', topics: ['learning'], filter: 'keep', sent: null, captured: 'Sep 10 · 03:43', sort: 106, zh: '旧内容如果无法可靠恢复原始发送时间，就应该明确标成未知，而不是拿抓取时间代替。', en: 'If an original sent time cannot be recovered reliably, it should be marked unknown rather than replaced with capture time.' },
    r7: { conversation: 'research', topics: ['product'], filter: 'keep', sent: 'Sep 8 · 20:31', captured: 'Sep 10 · 03:43', sort: 107, zh: 'AI 可以参与语义判断，但不应该因此拿走用户对最终状态的控制。', en: 'AI can help with semantic judgment without taking control of the final state away from the user.' },
    r8: { conversation: 'research', topics: ['learning'], filter: 'uncertain', sent: 'Sep 8 · 23:05', captured: 'Sep 10 · 03:43', sort: 108, zh: '也许以后可以把回看本身做成一种固定习惯，但我还没有想清楚频率。', en: 'Maybe revisiting could become a regular habit later, though I have not decided on the right frequency.' },
    rc1: { conversation: 'research', topics: [], filter: 'control', sent: 'Sep 8 · 23:11', captured: 'Sep 10 · 03:43', sort: 109, zh: '继续。', en: 'Continue.' },

    d1: { conversation: 'reading', topics: ['reading','learning'], filter: 'keep', sent: 'Sep 3 · 21:10', captured: 'Sep 10 · 03:44', sort: 201, zh: '阅读时真正值得留下来的不是每一段摘抄，而是那些以后还可能改变判断的东西。', en: 'What is worth keeping from reading is not every excerpt, but the material that may still change a future judgment.' },
    d2: { conversation: 'reading', topics: ['reading'], filter: 'keep', sent: 'Sep 4 · 00:28', captured: 'Sep 10 · 03:44', sort: 202, zh: '如果收藏越来越多却从不回看，收藏本身就变成了另一种遗忘。', en: 'If saved material keeps growing but is never revisited, collecting becomes another form of forgetting.' },
    d3: { conversation: 'reading', topics: ['reading'], filter: 'keep', sent: 'Sep 4 · 19:42', captured: 'Sep 10 · 03:44', sort: 203, zh: '做笔记时应该尽量保留我当时的措辞，因为语气本身也记录了判断的确定程度。', en: 'Notes should preserve my wording where possible because tone also records how certain the judgment felt.' },
    d4: { conversation: 'reading', topics: ['learning'], filter: 'keep', sent: 'Sep 5 · 10:16', captured: 'Sep 10 · 03:44', sort: 204, zh: '比起继续增加输入，我现在更需要一个能让我重新进入旧思路的阅读入口。', en: 'More input matters less to me now than a reading path that lets me re-enter older lines of thought.' },
    d5: { conversation: 'reading', topics: ['reading'], filter: 'keep', sent: 'Sep 5 · 23:54', captured: 'Sep 10 · 03:45', sort: 205, zh: '摘要适合找方向，但重要内容最终还是要能回到来源。', en: 'Summaries are useful for orientation, but important material still needs a path back to its source.' },
    d6: { conversation: 'reading', topics: ['reading'], filter: 'uncertain', sent: 'Sep 6 · 08:30', captured: 'Sep 10 · 03:45', sort: 206, zh: '这一篇我可能还会再读一次，先留着。', en: 'I may read this one again, so keep it for now.' },
    dc1: { conversation: 'reading', topics: [], filter: 'control', sent: 'Sep 6 · 08:32', captured: 'Sep 10 · 03:45', sort: 207, zh: '详细一点。', en: 'More detail.' },

    t1: { conversation: 'travel', topics: ['travel'], filter: 'keep', sent: 'Aug 27 · 12:05', captured: 'Sep 10 · 03:46', sort: 301, zh: '旅行时我更看重步行方便和安静，景点数量不是第一优先级。', en: 'When traveling I care more about walkability and quiet than maximizing the number of sights.' },
    t2: { conversation: 'travel', topics: ['travel'], filter: 'keep', sent: 'Aug 27 · 20:44', captured: 'Sep 10 · 03:46', sort: 302, zh: '酒店如果离主要活动区太远，即使便宜很多也会增加每天的决策成本。', en: 'A hotel far from the main area adds daily decision cost even if it is much cheaper.' },
    t3: { conversation: 'travel', topics: ['travel'], filter: 'keep', sent: 'Aug 28 · 09:20', captured: 'Sep 10 · 03:46', sort: 303, zh: '我不想把行程排满，最好每天只固定一两个真正重要的点。', en: 'I do not want a packed itinerary; one or two genuinely important anchors per day is enough.' },
    t4: { conversation: 'travel', topics: ['travel'], filter: 'keep', sent: 'Aug 29 · 18:13', captured: 'Sep 10 · 03:46', sort: 304, zh: '如果天气变化，宁愿调整计划，也不要为了完成清单硬走原来的路线。', en: 'If the weather changes, I would rather adapt the plan than force the original checklist.' },
    t5: { conversation: 'travel', topics: ['travel'], filter: 'keep', sent: 'Aug 30 · 11:31', captured: 'Sep 10 · 03:46', sort: 305, zh: '最后还是决定住在更靠中心的位置，把通勤时间换成更自由的晚上。', en: 'I ended up choosing the more central stay, trading commute time for freer evenings.' },

    s1: { conversation: 'research', topics: ['learning','product'], filter: 'keep', sent: 'Sep 10 · 06:42', captured: 'Sep 10 · 06:43', sort: 110, syncedOnly: true, zh: '同步应该只处理变化，不需要为了两条新输入重新跑一遍全部历史。', en: 'Sync should process only what changed; two new inputs should not require reprocessing the entire history.' },
    s2: { conversation: 'reading', topics: ['reading','learning'], filter: 'keep', sent: 'Sep 10 · 06:46', captured: 'Sep 10 · 06:47', sort: 208, syncedOnly: true, zh: '新的阅读记录加入后，旧的主题结构应该保持稳定，只更新真正受影响的部分。', en: 'When new reading material arrives, the existing topic structure should stay stable and only affected parts should update.' }
  };

  const topicDefs = {
    learning: {
      title: { zh: '长期学习系统', en: 'Long-term learning system' },
      summary: { zh: '从“收集更多”逐渐转向“让过去的信息重新可读”。', en: 'A shift from “collect more” toward making old material readable again.' },
      derived: { zh: '重点已经从继续增加资料，转向让旧信息能够重新进入阅读和判断。时间、来源与修改状态必须稳定，系统本身则应尽量减少维护负担。', en: 'The priority has shifted from collecting more material toward making older information re-enter reading and judgment. Time, source, and edit state need to stay stable while the system minimizes maintenance.' }
    },
    product: {
      title: { zh: '产品研究', en: 'Product research' },
      summary: { zh: '围绕默认值、产品边界与长期使用行为形成的判断。', en: 'Judgments about defaults, product boundaries, and long-term behavior.' },
      derived: { zh: '产品价值不应该依赖不断解释功能，而应通过默认值和稳定行为自然体现。AI 可以参与判断，但用户对数据状态和授权边界保留最终控制。', en: 'Product value should be visible through defaults and stable behavior rather than repeated feature explanation. AI can assist judgment while users retain final control over data state and authorization boundaries.' }
    },
    reading: {
      title: { zh: '阅读与研究', en: 'Reading & research' },
      summary: { zh: '什么值得留下、怎样减少无效积累，以及怎样回看。', en: 'What is worth keeping, how to reduce accumulation, and how to revisit it.' },
      derived: { zh: '阅读系统的重点不是保存更多摘抄，而是保留未来仍可能影响判断的内容，并且始终能够从摘要回到来源和当时的措辞。', en: 'A reading system should not maximize saved excerpts. It should preserve material that may still affect future judgment and always provide a path from summary back to source wording.' }
    },
    travel: {
      title: { zh: '旅行与偏好', en: 'Travel & preferences' },
      summary: { zh: '把零散计划组织成长期可复用的偏好，而不是一次性行程。', en: 'Turn scattered plans into reusable preferences rather than a one-off itinerary.' },
      derived: { zh: '旅行偏好相当稳定：优先步行便利、安静和留白，不追求景点数量；位置与可调整性通常比最低价格和固定清单更重要。', en: 'Travel preferences are fairly stable: walkability, quiet, and spare time matter more than maximizing sights; location and adaptability usually matter more than the lowest price or a fixed checklist.' }
    }
  };

  const contextDefs = {
    learning: ['r1','d4'],
    reading: ['d1','d5'],
    product: ['r2','r7']
  };

  const makeState = () => ({
    screen: 'archive', archiveView: 'home', currentConversation: 'research', thoughtView: 'home', currentTopic: 'learning',
    aiOrganized: false, sourcesOpen: false, externalAccess: false, contextSelected: new Set(), contextExcluded: new Set(),
    filter: 'light', order: 'asc', synced: false, removed: new Set(), edited: { zh: {}, en: {} }
  });

  let state = makeState();
  let toastTimer = null;
  let toastAction = null;

  const t = () => copy[lang()];
  const loc = (obj) => obj?.[lang()] || '';
  const entryText = (id) => state.edited[lang()][id] ?? entries[id][lang()];
  const entryExists = (id) => !entries[id].syncedOnly || state.synced;
  const passesFilter = (entry) => {
    if (state.filter === 'off') return true;
    if (state.filter === 'light') return entry.filter !== 'control';
    return entry.filter === 'keep';
  };
  const isVisible = (id) => entryExists(id) && !state.removed.has(id) && passesFilter(entries[id]);
  const visibleIds = () => Object.keys(entries).filter(isVisible);
  const visibleForConversation = (conversationId) => visibleIds().filter((id) => entries[id].conversation === conversationId);
  const existingCount = () => Object.keys(entries).filter(entryExists).length - state.removed.size;
  const hiddenByFilterCount = () => Object.keys(entries).filter((id) => entryExists(id) && !state.removed.has(id) && !passesFilter(entries[id])).length;
  const visibleCount = () => visibleIds().length;
  const topicSourceIds = (topicId) => visibleIds().filter((id) => entries[id].topics.includes(topicId));
  const editedInCurrentLanguage = (id) => Object.prototype.hasOwnProperty.call(state.edited[lang()], id);
  const topicEditedCount = (topicId) => topicSourceIds(topicId).filter(editedInCurrentLanguage).length;
  const filterLabel = () => state.filter === 'off' ? t().filterOff : state.filter === 'strong' ? t().filterStrong : t().filterLight;
  const contextIdsFor = (topicId) => (contextDefs[topicId] || []).filter(isVisible);
  const selectedContextIds = () => [...state.contextSelected].flatMap(contextIdsFor);
  const resetStageScroll = () => requestAnimationFrame(() => { if (stage) stage.scrollTop = 0; });

  const setTop = (name) => {
    if (titleNode) titleNode.textContent = name;
    navButtons.forEach((button) => {
      const active = button.dataset.demoNav === state.screen;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-current', active ? 'page' : 'false');
      button.tabIndex = active ? 0 : -1;
    });
  };

  const showToast = (message, actionLabel = '', action = null) => {
    if (!toast) return;
    window.clearTimeout(toastTimer);
    toastAction = action;
    toast.innerHTML = `<span>${escapeHtml(message)}</span>${actionLabel ? `<button type="button" data-demo-toast-action>${escapeHtml(actionLabel)}</button>` : ''}`;
    toast.classList.add('is-visible');
    if (actionLabel) toast.querySelector('[data-demo-toast-action]')?.addEventListener('click', () => {
      const fn = toastAction; toastAction = null; toast.classList.remove('is-visible'); if (fn) fn();
    });
    toastTimer = window.setTimeout(() => { toast.classList.remove('is-visible'); toastAction = null; }, actionLabel ? 5600 : 3200);
  };

  const trashIcon = () => '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 6.5h8m-6-2h4m-7 2 .7 9h8.6l.7-9M8 9v4.5m4-4.5v4.5" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  const cardMeta = (conversationId) => {
    const count = visibleForConversation(conversationId).length;
    const latest = state.synced && (conversationId === 'research' || conversationId === 'reading')
      ? (lang() === 'zh' ? '9 月 10 日' : 'Sep 10')
      : conversationId === 'research' ? (lang() === 'zh' ? '9 月 8 日' : 'Sep 8')
      : conversationId === 'reading' ? (lang() === 'zh' ? '9 月 6 日' : 'Sep 6')
      : (lang() === 'zh' ? '8 月 30 日' : 'Aug 30');
    return lang() === 'zh' ? `${count} 条输入 · ${t().updated} ${latest}` : `${count} inputs · ${t().updated} ${latest}`;
  };

  const renderArchiveHome = () => {
    const c = t();
    stage.innerHTML = `
      <div class="demo-page-head">
        <div><span class="demo-kicker">Input Archive</span><h3>${c.archiveTitle}</h3><p>${c.archiveBody}</p></div>
        <button class="demo-secondary" type="button" data-demo-sync>${state.synced ? c.synced : c.sync}</button>
      </div>
      <div class="demo-stat-line"><span>${c.demoWorkspace}</span><span>${visibleCount()} ${c.inputs}</span><span>3 ${c.conversations}</span><span>${c.currentFilter} · ${filterLabel()}</span></div>
      <div class="demo-conversation-grid">
        ${Object.entries(conversations).map(([id, item]) => `
          <button class="demo-conversation-card" type="button" data-demo-conversation="${id}">
            <span class="demo-card-title">${escapeHtml(loc(item.title))}</span>
            <span class="demo-card-summary">${escapeHtml(loc(item.summary))}</span>
            <span class="demo-card-meta">${escapeHtml(cardMeta(id))}<b>${c.openConversation} →</b></span>
          </button>`).join('')}
      </div>`;

    stage.querySelector('[data-demo-sync]')?.addEventListener('click', () => {
      if (state.synced) return showToast(c.upToDate);
      state.synced = true;
      render();
      showToast(c.syncDone);
    });
    stage.querySelectorAll('[data-demo-conversation]').forEach((button) => button.addEventListener('click', () => {
      state.archiveView = 'conversation'; state.currentConversation = button.dataset.demoConversation; render(true);
    }));
  };

  const renderEntry = (id) => {
    const c = t();
    const entry = entries[id];
    const edited = editedInCurrentLanguage(id);
    return `<article class="demo-entry" data-demo-entry="${id}">
      <div class="demo-entry-head">
        <button type="button" class="demo-time" data-demo-time aria-expanded="false">${escapeHtml(entry.sent || c.recovered)}</button>
        <div class="demo-entry-actions"><span class="demo-state ${edited ? 'demo-state-you' : 'demo-state-source'}">${edited ? c.edited : c.source}</span><button type="button" class="demo-icon-button" data-demo-remove aria-label="${escapeHtml(c.remove)}">${trashIcon()}</button></div>
      </div>
      <div class="demo-time-detail" data-demo-time-detail hidden><span><b>${c.sent}</b>${entry.sent ? escapeHtml(entry.sent) : escapeHtml(c.sentUnknown)}</span><span><b>${c.captured}</b>${escapeHtml(entry.captured)}</span></div>
      <p class="demo-editable" contenteditable="true" spellcheck="false" data-demo-editable>${escapeHtml(entryText(id))}</p>
    </article>`;
  };

  const renderConversation = () => {
    const c = t();
    const ids = visibleForConversation(state.currentConversation).sort((a,b) => state.order === 'asc' ? entries[a].sort - entries[b].sort : entries[b].sort - entries[a].sort);
    stage.innerHTML = `
      <div class="demo-page-head demo-page-head-compact"><div><button class="demo-back" type="button" data-demo-back-archive>← ${c.backArchive}</button><h3>${escapeHtml(loc(conversations[state.currentConversation].title))}</h3><p>${c.archiveReadHint}</p></div><button class="demo-secondary" type="button" data-demo-order>${state.order === 'asc' ? c.oldest : c.newest}</button></div>
      <div class="demo-document">${ids.map(renderEntry).join('')}</div>`;

    stage.querySelector('[data-demo-back-archive]')?.addEventListener('click', () => { state.archiveView = 'home'; render(true); });
    stage.querySelector('[data-demo-order]')?.addEventListener('click', () => { state.order = state.order === 'asc' ? 'desc' : 'asc'; render(true); });
    stage.querySelectorAll('[data-demo-entry]').forEach((article) => {
      const id = article.dataset.demoEntry;
      const timeButton = article.querySelector('[data-demo-time]');
      const timeDetail = article.querySelector('[data-demo-time-detail]');
      timeButton?.addEventListener('click', () => { const open = timeButton.getAttribute('aria-expanded') === 'true'; timeButton.setAttribute('aria-expanded', String(!open)); timeDetail.hidden = open; });
      article.querySelector('[data-demo-remove]')?.addEventListener('click', () => {
        state.removed.add(id); render(); showToast(c.removed, c.undo, () => { state.removed.delete(id); render(); showToast(c.restored); });
      });
      const editable = article.querySelector('[data-demo-editable]');
      editable?.addEventListener('blur', () => {
        const next = editable.textContent.trim();
        if (!next || next === entryText(id)) return;
        state.edited[lang()][id] = next; render(); showToast(c.saved);
      });
      editable?.addEventListener('keydown', (event) => { if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') editable.blur(); });
    });
  };

  const renderThoughtHome = () => {
    const c = t();
    stage.innerHTML = `<div class="demo-page-head"><div><span class="demo-kicker">Thought Library</span><h3>${c.thoughtTitle}</h3><p>${c.thoughtBody}</p></div></div>
      <div class="demo-topic-grid">${Object.entries(topicDefs).map(([id, topic]) => {
        const count = topicSourceIds(id).length;
        return `<button class="demo-topic-card" type="button" data-demo-topic="${id}"><span class="demo-topic-count">${count} ${c.sources}</span><span class="demo-card-title">${escapeHtml(loc(topic.title))}</span><span class="demo-card-summary">${escapeHtml(loc(topic.summary))}</span><span class="demo-card-meta"><b>${c.openTopic} →</b></span></button>`;
      }).join('')}</div>`;
    stage.querySelectorAll('[data-demo-topic]').forEach((button) => button.addEventListener('click', () => {
      state.thoughtView = 'topic'; state.currentTopic = button.dataset.demoTopic; state.aiOrganized = false; state.sourcesOpen = false; render(true);
    }));
  };

  const renderSourceBlock = (id) => {
    const c = t();
    const entry = entries[id];
    const edited = editedInCurrentLanguage(id);
    return `<article class="demo-source-block"><div><span class="demo-state ${edited ? 'demo-state-you' : 'demo-state-source'}">${edited ? c.edited : c.source}</span><span>${escapeHtml(loc(conversations[entry.conversation].title))}</span><span>${escapeHtml(entry.sent || c.recovered)}</span></div><p>${escapeHtml(entryText(id))}</p></article>`;
  };

  const renderThoughtTopic = () => {
    const c = t();
    const topic = topicDefs[state.currentTopic];
    const ids = topicSourceIds(state.currentTopic);
    const editedCount = topicEditedCount(state.currentTopic);
    stage.innerHTML = `
      <div class="demo-page-head demo-page-head-compact">
        <div><button class="demo-back" type="button" data-demo-back-topics>← ${c.backTopics}</button><h3>${escapeHtml(loc(topic.title))}</h3><div class="demo-inline-meta"><span class="demo-state demo-state-source">${c.sourceView}</span><span>${ids.length} ${c.sourceEntries}</span>${editedCount ? `<span class="demo-state demo-state-you">${editedCount} ${c.editedSources}</span>` : ''}</div></div>
        <button class="demo-ai-toggle ${state.aiOrganized ? 'is-on' : ''}" type="button" data-demo-ai-toggle aria-pressed="${state.aiOrganized}"><span>${c.aiOrganize}</span><i><b></b></i><em>${state.aiOrganized ? c.aiOn : c.aiOff}</em></button>
      </div>
      ${state.aiOrganized ? `<section class="demo-derived-card"><div class="demo-derived-meta"><span class="demo-state demo-state-ai">${c.aiDerived}</span><span>${c.derivedFrom.replace('{n}', ids.length)}</span><button type="button" data-demo-view-sources>${state.sourcesOpen ? c.hideSources : c.viewSources}</button></div><h4>${c.currentUnderstanding}</h4><p>${escapeHtml(loc(topic.derived))}</p>${state.sourcesOpen ? `<div class="demo-source-list">${ids.map((id) => `<span>${escapeHtml(loc(conversations[entries[id].conversation].title))} · ${escapeHtml(entries[id].sent || c.recovered)}</span>`).join('')}</div>` : ''}</section><p class="demo-source-continuity">${c.sourceStillHere}</p>` : ''}
      <div class="demo-source-stack">${ids.map(renderSourceBlock).join('')}</div>`;

    stage.querySelector('[data-demo-back-topics]')?.addEventListener('click', () => { state.thoughtView = 'home'; render(true); });
    stage.querySelector('[data-demo-ai-toggle]')?.addEventListener('click', () => { state.aiOrganized = !state.aiOrganized; state.sourcesOpen = false; render(); });
    stage.querySelector('[data-demo-view-sources]')?.addEventListener('click', () => { state.sourcesOpen = !state.sourcesOpen; render(); });
  };

  const contextTopics = () => ['learning','reading','product'].map((id) => ({ id, title: loc(topicDefs[id].title), sources: contextIdsFor(id).length }));
  const renderContext = () => {
    const c = t();
    const selectedIds = selectedContextIds();
    stage.innerHTML = `
      <div class="demo-page-head"><div><span class="demo-kicker">AI Context</span><h3>${c.contextTitle}</h3><p>${c.contextBody}</p></div><button class="demo-access-toggle ${state.externalAccess ? 'is-on' : ''}" type="button" data-demo-access aria-pressed="${state.externalAccess}"><span>${c.externalAccess}</span><i><b></b></i><em>${state.externalAccess ? c.accessOn : c.accessOff}</em></button></div>
      <div class="demo-context-math"><div><span>${c.yourArchive}</span><strong>${visibleCount()}</strong><small>${c.inputs} · 4 ${c.topics} · ${c.demoData}</small></div><span class="demo-context-arrow">→</span><div class="is-context"><span>${c.thisContext}</span><strong>${selectedIds.length}</strong><small>${c.sourcesSelected}</small></div></div>
      <div class="demo-question"><span>${c.currentQuestion}</span><p>${c.question}</p></div>
      <section class="demo-context-picker ${state.externalAccess ? '' : 'is-disabled'}"><h4>${c.chooseTopics}</h4>${contextTopics().map((topic) => {
        const checked = state.contextSelected.has(topic.id); const excluded = state.contextExcluded.has(topic.id) && !checked;
        const status = checked ? c.includedByYou : excluded ? c.excludedByYou : c.notIncluded;
        return `<label class="demo-context-row"><input type="checkbox" data-demo-context-topic="${topic.id}" ${checked ? 'checked' : ''} ${state.externalAccess ? '' : 'disabled'} /><span><b>${escapeHtml(topic.title)}</b><small>${topic.sources} ${c.relevantSources}</small></span><em class="${checked ? 'is-included' : excluded ? 'is-excluded' : ''}">${status}</em></label>`;
      }).join('')}</section>
      <section class="demo-preview"><div class="demo-preview-head"><h4>${c.contextPreview}</h4><span>${c.local}</span></div>${selectedIds.length ? selectedIds.map((id) => `<article><span class="demo-state demo-state-source">${c.source}</span><small>${escapeHtml(loc(conversations[entries[id].conversation].title))} · ${escapeHtml(entries[id].sent || c.recovered)}</small><p>${escapeHtml(entryText(id))}</p></article>`).join('') : `<p class="demo-empty-preview">${c.nothingSelected}</p>`}</section>
      <div class="demo-context-actions"><button class="demo-primary" type="button" data-demo-copy-context ${selectedIds.length ? '' : 'disabled'}>${c.copyContext}</button><span>${c.nothingLeaves}</span></div>`;

    stage.querySelector('[data-demo-access]')?.addEventListener('click', () => {
      state.externalAccess = !state.externalAccess;
      if (!state.externalAccess) { state.contextSelected.clear(); state.contextExcluded.clear(); }
      render(); showToast(state.externalAccess ? c.accessEnabled : c.accessDisabled);
    });
    stage.querySelectorAll('[data-demo-context-topic]').forEach((input) => input.addEventListener('change', () => {
      const id = input.dataset.demoContextTopic;
      if (input.checked) { state.contextSelected.add(id); state.contextExcluded.delete(id); }
      else { state.contextSelected.delete(id); state.contextExcluded.add(id); }
      render();
    }));
    stage.querySelector('[data-demo-copy-context]')?.addEventListener('click', async () => {
      const text = selectedIds.map(entryText).join('\n\n');
      try { await navigator.clipboard.writeText(text); showToast(c.copied); } catch (_) { showToast(c.prepared); }
    });
  };

  const renderSettings = () => {
    const c = t();
    stage.innerHTML = `<div class="demo-page-head"><div><span class="demo-kicker">Settings</span><h3>${c.settingsTitle}</h3><p>${c.settingsBody}</p></div></div>
      <section class="demo-settings-section"><div class="demo-settings-heading"><div><h4>${c.smartFilter}</h4><p>${c.lightRule} <strong>${c.uncertaintyRule}</strong></p></div><span>${c.recommended}</span></div>
        <div class="demo-segmented" role="group" aria-label="${escapeHtml(c.smartFilter)}">${[['off',c.off],['light',c.light],['strong',c.strong]].map(([id,label]) => `<button type="button" data-demo-filter="${id}" aria-pressed="${state.filter === id}" class="${state.filter === id ? 'is-active' : ''}">${label}</button>`).join('')}</div>
        <p class="demo-filter-result">${c.filterResult.replace('{visible}', visibleCount()).replace('{hidden}', hiddenByFilterCount())}</p>
      </section>
      <section class="demo-settings-section"><h4>${c.captureScope}</h4><div class="demo-scope-row is-positive"><span>${c.capturedLabel}</span><p>${c.capturedItems}</p></div><div class="demo-scope-row"><span>${c.notCapturedLabel}</span><p>${c.notCapturedItems}</p></div></section>
      <section class="demo-settings-section"><h4>${c.precedence}</h4><p class="demo-precedence">${c.precedenceBody}</p></section>`;

    stage.querySelectorAll('[data-demo-filter]').forEach((button) => button.addEventListener('click', () => {
      state.filter = button.dataset.demoFilter;
      state.contextSelected.forEach((id) => { if (!contextIdsFor(id).length) state.contextSelected.delete(id); });
      render(); showToast(c.filterChanged);
    }));
  };

  const render = (resetScroll = false) => {
    const c = t();
    if (!stage) return;
    if (state.screen === 'archive') { setTop(c.inputArchive); state.archiveView === 'conversation' ? renderConversation() : renderArchiveHome(); }
    else if (state.screen === 'thoughts') { setTop(c.thoughtLibrary); state.thoughtView === 'topic' ? renderThoughtTopic() : renderThoughtHome(); }
    else if (state.screen === 'context') { setTop(c.aiContext); renderContext(); }
    else { setTop(c.settings); renderSettings(); }

    root.querySelector('[data-demo-local-label]')?.replaceChildren(document.createTextNode(c.localDemo));
    root.querySelector('[data-demo-interactive-label]')?.replaceChildren(document.createTextNode(c.interactive));
    if (resetButton) resetButton.textContent = c.reset;
    root.querySelector('[data-demo-hint]')?.replaceChildren(document.createTextNode(c.tryHint));
    root.querySelectorAll('[data-demo-nav="archive"] span').forEach((node) => { node.textContent = c.inputArchive; });
    root.querySelectorAll('[data-demo-nav="thoughts"] span').forEach((node) => { node.textContent = c.thoughtLibrary; });
    root.querySelectorAll('[data-demo-nav="context"] span').forEach((node) => { node.textContent = c.aiContext; });
    root.querySelectorAll('[data-demo-nav="settings"] span').forEach((node) => { node.textContent = c.settings; });
    if (resetScroll) resetStageScroll();
  };

  navButtons.forEach((button) => button.addEventListener('click', () => { state.screen = button.dataset.demoNav; render(true); }));
  resetButton?.addEventListener('click', () => { state = makeState(); render(true); showToast(lang() === 'zh' ? '演示已重置' : 'Demo reset'); });

  root.addEventListener('keydown', (event) => {
    if (!event.target.matches('[data-demo-nav]')) return;
    const index = navButtons.indexOf(event.target);
    if (index < 0) return;
    const forward = event.key === 'ArrowDown' || event.key === 'ArrowRight';
    const backward = event.key === 'ArrowUp' || event.key === 'ArrowLeft';
    if (!forward && !backward) return;
    event.preventDefault();
    const next = forward ? (index + 1) % navButtons.length : (index - 1 + navButtons.length) % navButtons.length;
    navButtons[next].focus(); navButtons[next].click();
  });

  window.addEventListener('paia:languagechange', () => render(false));
  render(true);
})();
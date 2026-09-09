(() => {
  const STORAGE_KEY = 'paia-language';

  const copy = {
    zh: {
      meta: {
        home: {
          title: 'PAIA — Personal AI Input Archive',
          description: 'PAIA 是一个本地优先的个人 AI 输入档案与思想库：保存、整理，并重新阅读你在 AI 中表达过的信息和想法。'
        },
        principles: {
          title: 'PAIA 产品判断 — Personal AI Input Archive',
          description: 'PAIA 的核心产品判断：以用户输入为中心、原话优先、AI Context 显式授权，以及受约束的自动化。'
        },
        about: {
          title: '关于 PAIA — Personal AI Input Archive',
          description: 'PAIA 是一个由个人从 0 到 1 设计并持续迭代的本地优先个人 AI 输入档案与思想库项目。'
        }
      },
      common: {
        navProduct: '产品',
        navPrinciples: '产品判断',
        navPrivacy: '隐私',
        navAbout: '关于项目',
        homeAria: 'PAIA 首页',
        navAria: '页面导航',
        switchLabel: 'EN',
        switchTitle: 'Switch to English',
        backHome: '返回首页',
        backProductHome: '← 返回产品首页'
      },
      home: {
        heroSubtitle: '保存、整理，并重新阅读你在 AI 中表达过的信息和想法。',
        heroStart: '从问题开始',
        problemTitle: 'AI 记住了对话，<br />但用户自己的信息仍然散落其中。',
        problemP1: '长期使用 ChatGPT 等 AI 后，事实、判断、偏好、决定和想法会分散在大量聊天窗口里。聊天历史适合继续对话，却并不天然适合重新阅读自己。',
        problemP2: 'PAIA 不试图成为另一个聊天客户端。它把注意力重新放回用户自己的输入：先保存，再组织，最后只在用户明确允许时把必要内容提供给未来 AI。',
        problemCaption: '聊天负责交流，PAIA 负责把用户自己的内容沉淀下来。',
        problemAlt: '从分散聊天到 PAIA 用户输入档案的产品问题示意图',
        productTitle: '从输入档案，到思想，再到可授权的上下文。',
        inputSmall: '我说过什么',
        thoughtSmall: '我一路怎么想',
        contextSmall: '我愿意让 AI 知道什么',
        inputTitle: '先保存用户真正说过的话。',
        inputP: '输入按真实会话沉淀为连续档案。用户可以搜索、编辑和回看，但来源事实与用户后续工作保持分离。',
        inputLi1: '连续阅读，而不是重新模拟聊天',
        inputLi2: '用户编辑不会被后续同步静默覆盖',
        inputLi3: '来源、时间与版本保持可追溯',
        inputHomeCaption: 'Input Archive 首页 · 按真实会话持续沉淀',
        inputReadCaption: '连续文档式阅读 · 原话、时间与来源保持可追溯',
        inputHomeAlt: 'PAIA Input Archive 首页脱敏演示界面',
        inputReadAlt: 'PAIA Input Archive 阅读页脱敏演示界面',
        thoughtTitle: '把聊天窗口里的碎片，重新变成长期思想。',
        thoughtP: 'Thought Library 不按照聊天窗口组织，而是把跨会话内容聚合为长期 Topic。默认视图尽量忠实于原始表达，AI 整理只作为可切换的派生层。',
        thoughtLi1: 'Topic 是长期主题，而不是一句话一个标签',
        thoughtLi2: '原话层始终存在，AI 不覆盖用户思想',
        thoughtLi3: '阅读优先，系统处理状态尽量退到后台',
        thoughtHomeCaption: 'Thought Library · 搜索、AI 整理与长期 Topic',
        faithfulMode: '原始思路历程',
        aiMode: 'AI 整理',
        faithfulCaption: '保留用户自己的语言、时间与思考过程',
        aiCaption: '向下继续阅读，内容逐渐转化为更清晰的 AI 综合视图',
        thoughtHomeAlt: 'PAIA Thought Library 首页脱敏演示界面',
        faithfulAria: 'PAIA Thought Library 原始思路历程视图，AI 整理关闭',
        aiAria: 'PAIA Thought Library AI 整理后的完整主题阅读视图，AI 整理开启',
        contextTitle: '不是让 AI 随时读取一切，而是让用户决定它能知道什么。',
        contextP: 'AI Context 建立在 Thought Library 之上。授权、排除、检索和上下文预算都先在本地完成；真正复制或导出上下文，需要用户明确操作。',
        contextLi1: '默认不授权，拒绝与排除优先',
        contextLi2: '本地检索与 Context Preview',
        contextLi3: '来源可追溯，可随时撤销',
        contextCaption: '授权范围、当前问题与 Context Preview 在发送前可见',
        contextAlt: 'PAIA AI Context 脱敏演示界面',
        privacyP1: '当前产品以 Chrome Extension 形式运行，核心数据默认保存在本机。历史补全、检索、备份和多数组织逻辑优先在本地完成。',
        privacyP2: '涉及 AI 的动作采用明确的用户控制与最小数据边界。这个公开展示网站本身不连接 PAIA 数据，也不设置分析脚本或跟踪器。',
        privacyCaption: '保存、检索与外部使用之间存在明确授权边界。',
        privacyAlt: 'PAIA 本地数据、授权门与外部 AI 的隐私边界示意图',
        closingTitle: '你和 AI 的长期对话，<br />首先应该属于你自己。',
        closingP: 'PAIA 保存你说过的话，重新组织你一路形成的思想。只有你明确选择的部分，才会成为 AI 的上下文。',
        betaButton: '申请加入 Private Beta',
        privacyLink: '查看隐私原则',
        closingAlt: 'PAIA 私人档案沉淀为思想，并只把用户选择的一小部分作为 AI Context 输出'
      },
      principles: {
        heroSubtitle: '这些判断定义了 PAIA 与普通 AI 历史工具之间的边界。',
        title: '四个决定，定义了 PAIA 与普通 AI 历史工具的差异。',
        d1Title: '为什么以用户输入为中心？',
        d1Body: 'AI 回复会随模型和场景变化，而用户自己的事实、判断和想法才是更稳定的长期资产。PAIA 首先保存“我说过什么”。',
        d2Title: '为什么先原话，再 AI 整理？',
        d2Body: '总结提高效率，但也会损失语气、过程和不确定性。默认层保持 source-faithful，AI 只提供可关闭的派生理解。',
        d3Title: '为什么 AI Context 必须显式授权？',
        d3Body: '个人信息系统不应默认把整个数据库交给模型。上下文应当最小、可解释、可撤销，并始终服从用户的授权边界。',
        d4Title: '为什么不把所有能力都自动化？',
        d4Body: 'PAIA 把确定性规则、用户工作和 AI 推理分开：程序负责稳定边界，用户保留最终控制，AI 只处理真正需要语义判断的部分。目标不是“AI 做得越多越好”，而是让每一层承担最适合它的职责。',
        caption: '四项判断共同决定 PAIA 的产品边界。',
        alt: 'PAIA 四项核心产品判断示意图'
      },
      about: {
        heroSubtitle: 'PAIA 由个人从 0 到 1 设计并持续迭代。',
        body: 'PAIA 由个人从 0 到 1 设计并持续迭代：从用户问题、信息架构、交互与 AI 能力边界，到使用 Codex 协同完成 Chrome Extension 落地、测试和真实环境验证。',
        role: '独立产品设计 / AI 协同开发',
        note: '本页中的产品界面为基于当前实际产品结构制作的脱敏演示图，用于公开展示产品逻辑与交互，不包含真实用户数据。',
        caption: '产品定义 → 信息架构 → AI 能力边界 → 落地与验证',
        alt: 'PAIA 项目中产品定义、信息架构、AI 能力边界与落地验证的职责范围'
      }
    },
    en: {
      meta: {
        home: {
          title: 'PAIA — Personal AI Input Archive',
          description: 'PAIA is a local-first personal AI input archive and thought library for preserving, organizing, and revisiting what you have expressed to AI.'
        },
        principles: {
          title: 'PAIA Principles — Personal AI Input Archive',
          description: 'The product principles behind PAIA: user-input first, source-faithful by default, explicit AI Context authorization, and constrained automation.'
        },
        about: {
          title: 'About PAIA — Personal AI Input Archive',
          description: 'PAIA is an independently designed, local-first personal AI input archive and thought library built from 0 to 1 and continuously iterated.'
        }
      },
      common: {
        navProduct: 'Product',
        navPrinciples: 'Principles',
        navPrivacy: 'Privacy',
        navAbout: 'About',
        homeAria: 'PAIA home',
        navAria: 'Page navigation',
        switchLabel: '中文',
        switchTitle: '切换到中文',
        backHome: 'Back home',
        backProductHome: '← Back to product home'
      },
      home: {
        heroSubtitle: 'Preserve, organize, and revisit what you have expressed to AI.',
        heroStart: 'Start with the problem',
        problemTitle: 'AI remembers the conversation.<br />Your own information is still scattered across it.',
        problemP1: 'After long-term use of ChatGPT and other AI tools, facts, judgments, preferences, decisions, and ideas become fragmented across countless chat windows. Chat history is good for continuing a conversation, but not naturally designed for rereading yourself.',
        problemP2: 'PAIA is not another chat client. It shifts attention back to the user’s own inputs: preserve them first, organize them over time, and only provide the necessary context to future AI when the user explicitly chooses to do so.',
        problemCaption: 'Chat handles the conversation. PAIA preserves what belongs to the user.',
        problemAlt: 'Product problem map showing scattered AI chats becoming a PAIA user-input archive',
        productTitle: 'From input archive, to thought, to context you explicitly authorize.',
        inputSmall: 'What I said',
        thoughtSmall: 'How my thinking evolved',
        contextSmall: 'What I choose to let AI know',
        inputTitle: 'Preserve what the user actually said first.',
        inputP: 'Inputs are preserved as continuous records tied to their real conversations. Users can search, edit, and revisit them, while source records remain separate from later user work.',
        inputLi1: 'Continuous reading instead of recreating a chat interface',
        inputLi2: 'User edits are never silently overwritten by later syncs',
        inputLi3: 'Source, time, and version remain traceable',
        inputHomeCaption: 'Input Archive home · continuously preserved by real conversation',
        inputReadCaption: 'Continuous document reading · wording, time, and source stay traceable',
        inputHomeAlt: 'Privacy-safe demo of the PAIA Input Archive home',
        inputReadAlt: 'Privacy-safe demo of the PAIA Input Archive reading view',
        thoughtTitle: 'Turn fragments from chat windows back into long-term thought.',
        thoughtP: 'Thought Library is organized around long-term topics rather than chat windows. Cross-conversation material is grouped into durable themes. The default view stays as faithful as possible to the user’s original expression; AI organization is a switchable derived layer.',
        thoughtLi1: 'A Topic is a long-term theme, not a label for one sentence',
        thoughtLi2: 'The source-faithful layer always remains; AI never overwrites the user’s thought',
        thoughtLi3: 'Reading comes first; processing state stays in the background',
        thoughtHomeCaption: 'Thought Library · search, AI organization, and long-term Topics',
        faithfulMode: 'Source-faithful journey',
        aiMode: 'AI Organized',
        faithfulCaption: 'Preserve the user’s own language, timing, and thinking process',
        aiCaption: 'Continue reading as the material gradually resolves into a clearer AI-organized view',
        thoughtHomeAlt: 'Privacy-safe demo of the PAIA Thought Library home',
        faithfulAria: 'PAIA Thought Library source-faithful journey view with AI organization off',
        aiAria: 'PAIA Thought Library full AI-organized topic view with AI organization on',
        contextTitle: 'Do not let AI read everything by default. Let the user decide what it can know.',
        contextP: 'AI Context is built on top of Thought Library. Authorization, exclusion, retrieval, and context budgeting happen locally first; actually copying or exporting context requires an explicit user action.',
        contextLi1: 'No authorization by default; denial and exclusion take priority',
        contextLi2: 'Local retrieval and Context Preview',
        contextLi3: 'Traceable sources with revocable access',
        contextCaption: 'Authorization scope, current question, and Context Preview are visible before sending',
        contextAlt: 'Privacy-safe demo of PAIA AI Context',
        privacyP1: 'The current product runs as a Chrome Extension, with core data stored on the user’s device by default. History backfill, retrieval, backup, and most organizational logic are local-first.',
        privacyP2: 'AI-related actions use explicit user control and minimal data boundaries. This public showcase site does not connect to PAIA data and includes no analytics scripts or trackers.',
        privacyCaption: 'A clear authorization boundary separates storage, retrieval, and external use.',
        privacyAlt: 'Diagram of PAIA local data, authorization gate, and external AI privacy boundary',
        closingTitle: 'Your long-term conversations with AI<br />should belong to you first.',
        closingP: 'PAIA preserves what you said and reorganizes the thinking you formed over time. Only the parts you explicitly choose become context for AI.',
        betaButton: 'Request Private Beta access',
        privacyLink: 'View privacy principles',
        closingAlt: 'PAIA turns a private archive into long-term thought and exports only user-selected material as AI Context'
      },
      principles: {
        heroSubtitle: 'These decisions define the boundary between PAIA and ordinary AI history tools.',
        title: 'Four decisions define what makes PAIA different from ordinary AI history tools.',
        d1Title: 'Why center the product on user inputs?',
        d1Body: 'AI responses change with models and situations. The user’s own facts, judgments, and ideas are the more stable long-term asset. PAIA starts by preserving what I said.',
        d2Title: 'Why source-faithful first, then AI organization?',
        d2Body: 'Summaries improve efficiency, but they also remove tone, process, and uncertainty. The default layer stays source-faithful; AI only provides a derived understanding that can be turned off.',
        d3Title: 'Why must AI Context require explicit authorization?',
        d3Body: 'A personal information system should not hand the entire database to a model by default. Context should be minimal, explainable, revocable, and always subordinate to the user’s authorization boundary.',
        d4Title: 'Why not automate everything?',
        d4Body: 'PAIA separates deterministic rules, user work, and AI reasoning. Software enforces stable boundaries, the user retains final control, and AI is used only where semantic judgment is genuinely needed. The goal is not “more AI,” but the right responsibility at each layer.',
        caption: 'Together, these four decisions define PAIA’s product boundary.',
        alt: 'Diagram of PAIA’s four core product decisions'
      },
      about: {
        heroSubtitle: 'PAIA is independently designed from 0 to 1 and continuously iterated.',
        body: 'PAIA is independently designed and continuously iterated from 0 to 1: from the user problem, information architecture, interaction design, and AI capability boundaries to using Codex to help implement, test, and validate the Chrome Extension in real environments.',
        role: 'Independent Product Design / AI-assisted Development',
        note: 'The product interfaces shown on this site are privacy-safe demo visuals based on the current product structure. They are used to communicate product logic and interaction design and contain no real user data.',
        caption: 'Product definition → information architecture → AI boundaries → implementation & validation',
        alt: 'Scope of responsibility across product definition, information architecture, AI capability boundaries, implementation, and validation in PAIA'
      }
    }
  };

  const getPath = (obj, path) => path.split('.').reduce((value, key) => value && value[key], obj);

  const normalize = (value) => {
    if (!value) return null;
    const lower = String(value).toLowerCase();
    if (lower === 'zh' || lower.startsWith('zh-')) return 'zh';
    if (lower === 'en' || lower.startsWith('en-')) return 'en';
    return null;
  };

  const detectLanguage = () => {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = normalize(params.get('lang'));
    if (fromQuery) return fromQuery;

    const stored = normalize(window.localStorage.getItem(STORAGE_KEY));
    if (stored) return stored;

    const preferred = Array.isArray(navigator.languages) && navigator.languages.length
      ? navigator.languages
      : [navigator.language || Intl.DateTimeFormat().resolvedOptions().locale || 'en'];

    return preferred.some((language) => normalize(language) === 'zh') ? 'zh' : 'en';
  };

  const setMeta = (lang) => {
    const page = document.body.dataset.page || 'home';
    const meta = copy[lang].meta[page] || copy[lang].meta.home;
    document.title = meta.title;

    const description = document.querySelector('meta[name="description"]');
    if (description) description.setAttribute('content', meta.description);

    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription) ogDescription.setAttribute('content', meta.description);
  };

  const applyLanguage = (lang, persist = false) => {
    const selected = normalize(lang) || 'en';
    const dictionary = copy[selected];

    document.documentElement.lang = selected === 'zh' ? 'zh-CN' : 'en';
    document.documentElement.dataset.language = selected;

    document.querySelectorAll('[data-i18n]').forEach((element) => {
      const value = getPath(dictionary, element.dataset.i18n);
      if (value != null) element.textContent = value;
    });

    document.querySelectorAll('[data-i18n-html]').forEach((element) => {
      const value = getPath(dictionary, element.dataset.i18nHtml);
      if (value != null) element.innerHTML = value;
    });

    document.querySelectorAll('[data-i18n-alt]').forEach((element) => {
      const value = getPath(dictionary, element.dataset.i18nAlt);
      if (value != null) element.setAttribute('alt', value);
    });

    document.querySelectorAll('[data-i18n-aria]').forEach((element) => {
      const value = getPath(dictionary, element.dataset.i18nAria);
      if (value != null) element.setAttribute('aria-label', value);
    });

    document.querySelectorAll('[data-language-toggle]').forEach((button) => {
      button.textContent = dictionary.common.switchLabel;
      button.setAttribute('aria-label', dictionary.common.switchTitle);
      button.setAttribute('title', dictionary.common.switchTitle);
    });

    setMeta(selected);

    if (persist) window.localStorage.setItem(STORAGE_KEY, selected);
    window.dispatchEvent(new CustomEvent('paia:languagechange', { detail: { language: selected } }));
  };

  const init = () => {
    applyLanguage(detectLanguage(), false);

    document.querySelectorAll('[data-language-toggle]').forEach((button) => {
      button.addEventListener('click', () => {
        const current = document.documentElement.dataset.language || detectLanguage();
        applyLanguage(current === 'zh' ? 'en' : 'zh', true);
      });
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();

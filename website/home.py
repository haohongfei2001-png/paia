"""PAIA v3 public homepage: Fragments become Context.

Website-only narrative using fictional/synthetic text. No archive access, remote
images, analytics, AI calls, or claims that future connectors/mobile are live.
"""
from html import escape


def render(t, a, button, statusmini):
    fragments = [
        ("question", "FEB 11", t("问题", "QUESTION"),
         t("我是不是又在新的窗口里，重复解释同一件事？",
           "Why am I explaining the same thing again in a new chat?")),
        ("decision", "MAR 04", t("决定", "DECISION"),
         t("第一版先解决找回与复用，不做内容生成。",
           "Start with retrieval and reuse. Generation can wait.")),
        ("revision", "JUN 18", t("修正", "REVISION"),
         t("用户发过的话，不一定等于用户长期相信的观点。",
           "Something I sent is not automatically something I believe.")),
        ("boundary", "SEP 12", t("边界", "BOUNDARY"),
         t("来源、我的修改、AI 整理，要保持区分。",
           "Keep source, my edits, and AI organization distinct.")),
        ("context", "SEP 26", t("本次上下文", "THIS TIME"),
         t("只带上这次任务真正需要的部分。",
           "Bring forward only what this task actually needs.")),
    ]
    fragment_html = "".join(
        f'''<button class="v3-fragment v3-fragment-{ident}" type="button"
        data-v3-fragment data-fragment-key="{ident}" aria-pressed="{'true' if ident in {'decision','boundary','context'} else 'false'}">
          <span class="v3-fragment-meta"><time>{date}</time><span>{kind}</span></span>
          <span class="v3-fragment-copy">{escape(text)}</span>
          <span class="v3-fragment-state" aria-hidden="true">+</span>
        </button>'''
        for ident, date, kind, text in fragments
    )
    timeline = [
        ("01", t("一次表达", "AN EXPRESSION"), t("提出问题、给出背景、做出判断。", "A question, a background, a judgment.")),
        ("02", t("后来修改", "A REVISION"), t("今天的工作版本，不冒充昨天的原话。", "Today's working version does not rewrite yesterday.")),
        ("03", t("形成脉络", "A THREAD"), t("跨会话看见同一件事如何延续。", "See how one subject continues across conversations.")),
        ("04", t("再次使用", "A NEW TASK"), t("按这次任务选择，而不是把全部历史交出去。", "Choose for this task, rather than release the whole history.")),
    ]
    timeline_html = "".join(
        f'''<article class="v3-time-event" data-reveal>
          <span class="v3-time-index">{num}</span><span class="v3-time-kicker">{label}</span>
          <p>{copy}</p>
        </article>''' for num, label, copy in timeline
    )
    scenarios = [
        ("01", t("长期项目", "LONG PROJECTS"),
         t("换了会话，仍然保留已经做过的决定和限制。", "A new chat can still begin after the decisions you already made."),
         t("带上：背景 / 决定 / 边界", "BRING FORWARD: BACKGROUND / DECISIONS / CONSTRAINTS")),
        ("02", t("研究与学习", "RESEARCH"),
         t("找回以前的假设、问题和修正，沿着它继续，而不是重新检索自己。", "Recover earlier questions, hypotheses and revisions instead of researching your own past again."),
         t("带上：问题 / 假设 / 修正", "BRING FORWARD: QUESTIONS / HYPOTHESES / REVISIONS")),
        ("03", t("反复决策", "DECISIONS"),
         t("以前的偏好可以被看见，但由现在的你决定哪些仍然有效。", "Past preferences remain visible, but the present you decides what still applies."),
         t("带上：当前偏好 / 取舍 / 例外", "BRING FORWARD: CURRENT PREFERENCES / TRADE-OFFS / EXCEPTIONS")),
    ]
    scenario_html = "".join(
        f'''<article class="v3-scenario" data-reveal>
          <span class="v3-scenario-number">{num}</span>
          <div><p class="v3-scenario-label">{label}</p><h3>{copy}</h3></div>
          <p class="v3-scenario-carry">{carry}</p>
        </article>''' for num, label, copy, carry in scenarios
    )
    return f'''
<section class="v3-home">
  <section class="v3-hero wrap" aria-labelledby="v3-title">
    <div class="v3-hero-copy" data-reveal>
      <p class="v3-kicker">{t("PERSONAL CONTEXT / PRIVATE BETA", "PERSONAL CONTEXT / PRIVATE BETA")}</p>
      <h1 id="v3-title">{t("说过的话，<br>不该随对话过期。", "Your thinking shouldn’t<br>expire with the chat.")}</h1>
      <p class="v3-deck">{t(
        "PAIA 留下你在 AI 中已经自然产生的表达、判断与问题。以后可以找回、修改、重新理解，再由你决定哪些成为下一次 AI 的上下文。",
        "PAIA keeps the expressions, decisions and questions you already produce with AI. Revisit them, revise them, understand them again—and decide what becomes context for what comes next."
      )}</p>
      <div class="v3-actions">
        {button("beta.html", t("申请内测","Get early access"), "button v3-primary")}
        {a("demo.html", t("体验真实能力边界 ↗","Explore the working demo ↗"), "v3-text-link")}
      </div>
      <p class="v3-availability">{t("桌面 Chrome · ChatGPT 网页版 · 邀请制测试", "Desktop Chrome · ChatGPT Web · Invite-only beta")}</p>
    </div>

    <div class="v3-field" data-v3-context data-language="{t("zh","en")}" data-reveal>
      <div class="v3-field-axis" aria-hidden="true"><span>PAST</span><i></i><span>NOW</span><i></i><span>NEXT</span></div>
      <p class="v3-field-note">{t("点按片段，决定这一次带上什么。", "Tap fragments. Decide what goes forward this time.")}</p>
      <div class="v3-fragment-plane">
        {fragment_html}
        <svg class="v3-traces" viewBox="0 0 760 520" preserveAspectRatio="none" aria-hidden="true">
          <path d="M105 95 C230 70 250 220 390 210 S560 120 690 165"/>
          <path d="M120 315 C250 345 330 280 420 300 S545 395 670 335"/>
          <path d="M270 420 C330 350 430 390 505 320 S585 240 690 250"/>
        </svg>
      </div>
      <div class="v3-context-frame" aria-live="polite">
        <div class="v3-context-frame-head">
          <span>{t("THIS TIME / CONTEXT", "THIS TIME / CONTEXT")}</span>
          <strong data-v3-count>3 / 5</strong>
        </div>
        <div class="v3-context-list" data-v3-list></div>
        <p>{t("没有发送给任何 AI。只是本页内的交互示意。", "Nothing has been sent to any AI. This is an in-page illustration only.")}</p>
      </div>
      <p class="v3-synthetic">{t("合成文本 · 非私人数据 · 无网络调用", "SYNTHETIC TEXT · NO PRIVATE DATA · NO NETWORK CALL")}</p>
    </div>
  </section>

  <section class="v3-continuity wrap" id="how">
    <div class="v3-section-lead" data-reveal>
      <p class="v3-kicker">01 / CONTINUITY</p>
      <h2>{t("一次对话是一个时刻。<br>思考不是。", "A conversation is a moment.<br>Your thinking isn’t.")}</h2>
      <p>{t(
        "PAIA 不把你的长期表达压成一个永远正确的个人档案。它保留时间、来源和修改之间的区别，让不同阶段的你可以同时存在。",
        "PAIA does not compress your long-term expression into one permanently correct profile. It keeps time, source and revision distinct, so different moments of your thinking can coexist."
      )}</p>
    </div>
    <div class="v3-time-rail" aria-label="{t("从表达至再次使用的时间脉络","A timeline from expression to reuse")}">
      <div class="v3-time-line" aria-hidden="true"></div>
      {timeline_html}
    </div>
  </section>

  <section class="v3-selection">
    <div class="wrap v3-selection-grid">
      <div class="v3-selection-copy" data-reveal>
        <p class="v3-kicker">02 / SELECTION</p>
        <h2>{t("Context 是一次选择。<br>不是永久画像。", "Context is a choice.<br>Not a permanent profile.")}</h2>
        <p>{t(
          "算法可以帮助找相关材料，但不能替代你明确选中的内容。准备 Context 时，选择、审阅、修改，然后才复制或导出。",
          "Retrieval can suggest relevant material, but it should not replace what you explicitly chose. Prepare context by selecting, reviewing and editing—then copy or export."
        )}</p>
        {a("demo.html", t("用虚构项目实际试一遍 ↗","Try the exact flow with fictional data ↗"), "v3-text-link")}
      </div>
      <div class="v3-selection-composition" data-reveal>
        <div class="v3-selection-cloud" aria-hidden="true">
          <span class="faint">{t("一个旧想法","an old idea")}</span>
          <span>{t("已经做过的决定","a decision already made")}</span>
          <span class="faint">{t("一次随手假设","a passing hypothesis")}</span>
          <span>{t("仍然有效的限制","a constraint that still applies")}</span>
          <span class="faint">{t("三个月前的偏好","a preference from three months ago")}</span>
          <span>{t("这次任务的问题","the question for this task")}</span>
        </div>
        <div class="v3-choice-boundary">
          <span class="corner tl"></span><span class="corner tr"></span><span class="corner bl"></span><span class="corner br"></span>
          <p class="v3-choice-label">{t("YOU CHOOSE THE BOUNDARY", "YOU CHOOSE THE BOUNDARY")}</p>
          <strong>{t("这次，只需要三件事。", "This time, three things are enough.")}</strong>
          <ul>
            <li>{t("✓ 已确认的产品方向", "✓ confirmed product direction")}</li>
            <li>{t("✓ 仍然有效的约束", "✓ constraint that still applies")}</li>
            <li>{t("✓ 当前要回答的问题", "✓ question to answer now")}</li>
          </ul>
        </div>
      </div>
    </div>
  </section>

  <section class="v3-ownership wrap">
    <div class="v3-section-lead" data-reveal>
      <p class="v3-kicker">03 / OWNERSHIP</p>
      <h2>{t("先属于你。<br>再用于 AI。", "Yours first.<br>Useful to AI second.")}</h2>
    </div>
    <div class="v3-boundary-map" data-reveal>
      <div class="v3-boundary-cell"><span>01</span><strong>{t("LOCAL", "LOCAL")}</strong><p>{t("普通阅读、编辑、词面搜索与 Context 准备尽可能在设备本地完成。", "Ordinary reading, editing, lexical search and context preparation stay local where possible.")}</p></div>
      <div class="v3-boundary-arrow" aria-hidden="true">→</div>
      <div class="v3-boundary-cell"><span>02</span><strong>{t("SELECT", "SELECT")}</strong><p>{t("保存，不等于授权。过滤、删除、主题归属和给 AI 使用是不同的动作。", "Saved is not shared. Filtering, deletion, topic membership and AI permission are different actions.")}</p></div>
      <div class="v3-boundary-arrow" aria-hidden="true">→</div>
      <div class="v3-boundary-cell"><span>03</span><strong>{t("PREVIEW", "PREVIEW")}</strong><p>{t("看清这次准备的完整文字，修改后再决定下一步。", "See the exact material prepared for this task and revise it before release.")}</p></div>
      <div class="v3-boundary-arrow" aria-hidden="true">→</div>
      <div class="v3-boundary-cell"><span>04</span><strong>{t("COPY / EXPORT", "COPY / EXPORT")}</strong><p>{t("当前复用通过复制或导出。真实外部 AI 读取连接器仍是未来方向。", "Reuse today happens through copy or export. A real external-AI reader connector remains future direction.")}</p></div>
    </div>
    <div class="v3-ownership-note" data-reveal>
      <p>{t(
        "来源事实、你的工作版本、AI 整理结果保持区分。今天的修改，不会被冒充成你过去说过的话。",
        "Source facts, your working version and AI organization stay distinct. An edit you make today does not become something you supposedly said in the past."
      )}</p>
      {a("principles.html", t("查看完整的数据与授权边界 ↗","Read the full data and permission boundaries ↗"), "v3-text-link")}
    </div>
  </section>

  <section class="v3-scenarios wrap">
    <div class="v3-section-lead" data-reveal>
      <p class="v3-kicker">04 / REUSE</p>
      <h2>{t("少重复一次。<br>多往前一步。", "Repeat less.<br>Begin further ahead.")}</h2>
    </div>
    <div class="v3-scenario-list">{scenario_html}</div>
  </section>

  <section class="v3-now">
    <div class="wrap v3-now-grid">
      <div data-reveal>
        <p class="v3-kicker">CURRENT / PRIVATE BETA</p>
        <h2>{t("现在能做的，<br>和还没做的，都说清楚。", "What exists now.<br>And what still doesn’t.")}</h2>
      </div>
      <div class="v3-now-copy" data-reveal>
        <p>{t(
          "当前是桌面 Chrome 扩展，围绕 ChatGPT 网页版。采集、找回、编辑、主题与手动 Context 复用已有实现；真实环境、签名分发、私人官方历史导出等仍有验证缺口。",
          "Today PAIA is a desktop Chrome extension built around ChatGPT Web. Capture, retrieval, editing, topics and manual context reuse are implemented; live-environment, signed-distribution and private official-export evidence still have gaps."
        )}</p>
        <p class="v3-future">{t(
          "iOS、更多来源、语义检索、直接外部 AI Connector：方向明确，但不是当前上线能力。",
          "iOS, more sources, semantic retrieval and a direct external-AI connector are directions—not current release claims."
        )}</p>
        {a("status.html", t("查看当前能力状态 ↗","See the current capability status ↗"), "v3-text-link")}
      </div>
    </div>
  </section>

  <section class="v3-final wrap" data-reveal>
    <p class="v3-kicker">PAIA / PERSONAL CONTEXT</p>
    <div>
      <h2>{t("下一次，<br>从你的积累开始。", "Next time,<br>start from what you already built.")}</h2>
      <div class="v3-actions">
        {button("beta.html", t("申请 Private Beta","Get early access"), "button v3-primary")}
        {a("demo.html", t("先体验示例 ↗","Explore the demo first ↗"), "v3-text-link")}
      </div>
    </div>
  </section>
</section>
'''

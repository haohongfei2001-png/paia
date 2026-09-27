"""Complete public destinations. Authored copy; no invented users or results."""
from home import icon

def render_pages(t,a,button,invitation):
    def intro(kicker,title,body=''):
        return f'<section class="page-intro wrap"><p class="eyebrow">{kicker}</p><h1>{title}</h1>{f"<p class=\"lead\">{body}</p>" if body else ""}</section>'
    def paper(label,body):
        return f'<div class="mini-paper"><span>{label}</span>{body}</div>'
    def spread(title,body,visual,link=''):
        return f'<section class="feature-spread"><div class="feature-copy"><h2>{title}</h2><p>{body}</p>{link}</div><div class="feature-visual">{visual}</div></section>'
    pages=[]
    how=intro(t('如何使用','How it works'),t('从一次表达，<br>到可复用的上下文。','From what you say<br>to context you can use.'),t('不用重新经营一个知识库。从你已经在进行的 AI 对话开始。','Start with the AI conversations you already have, not another knowledge base to maintain.'))
    steps=[
      (t('留下你对 AI 说的话。','Keep what you tell AI.'),t('在桌面 Chrome 中，经你同意后保存支持的 ChatGPT 用户输入。历史导入是另外的主动操作；不是静默扫描你的整个账户。','With your consent, PAIA saves supported ChatGPT user inputs in desktop Chrome. History import is a separate action—not a silent scan of your account.'),paper('ChatGPT',t('“第一版应该帮助创作者找回素材，而不是生成更多内容。”','“The first release should help creators find material, not generate more.”'))),
      (t('让相关表达相遇。','Connect the relevant pieces.'),t('用搜索找回材料，将相关表达放在同一个主题里。不同会话不再意味着从头解释同一个问题。','Find material through search and bring related expressions into a topic. Separate conversations no longer have to mean separate starting points.'),paper(t('产品方向','Product direction'),t('先解决已有素材的找回。','Start with existing material.'))+paper(t('目标用户','Audience'),t('已经在持续创作的人。','People with an ongoing creative practice.'))),
      (t('由你决定当前版本。','Make the context yours.'),t('修改工作文字，保留来源以便核对。AI 整理由你主动启动，输出需要检查，不是对你立场的最终判断。','Edit the working text while keeping its source available to check. AI organization is optional and user-initiated; its output is not a final judgment about you.'),paper(t('原始表达','Original input'),t('“先看看哪些功能可能有价值。”','“Explore which features could be useful.”'))+paper(t('当前工作版本','Working version'),t('“先验证素材找回，暂不做多人协作。”','“Validate retrieval first. Leave collaboration out.”'))),
      (t('把所需材料交给下一次 AI。','Take it into your next AI task.'),t('明确选择材料，预览完整上下文，再复制或导出。此时不会自动发送给其他 AI，未选中的材料也不会悄悄加入。','Select the material, review the complete context, then copy or export. This does not automatically send it to another AI or silently add unselected material.'),paper(t('这次的任务','This task'),t('评估第一版范围。<br>目标：找回已有素材。<br>用户：独立创作者。<br>暂缓：多人协作。','Review the first release.<br>Goal: recover existing material.<br>Audience: independent creators.<br>Later: collaboration.')))
    ]
    how+='<div class="wrap">'+''.join(spread(h,p,v) for h,p,v in steps)+'</div>'+invitation()
    pages.append(('how-it-works.html',t('PAIA — 如何使用','PAIA — How it works'),t('了解输入如何成为你控制的 AI 上下文。','See how inputs become AI context you control.'),how))
    use=intro(t('使用场景','Use cases'),t('长期在做的事，<br>不该反复从零开始。','For work that lasts<br>beyond one conversation.'),t('项目、研究、决策。让下一次 AI 任务接上已经想清楚的部分。','Projects, research and decisions. Give your next AI task the context you have already worked out.'))
    cases=[
       (t('继续一个项目。','Continue a project.'),t('找回既定目标、用户和边界，再讨论下一版。先前否定的方案不必反复解释。','Recover the goal, audience and boundaries before discussing the next version. You should not have to explain rejected options again.'),paper(t('带上','Bring forward'),t('目标、用户、范围、已确认的决定。','Goal, audience, scope and confirmed decisions.'))+paper(t('新的任务','Next task'),t('“在这些边界内，评估下一版。”','“Review the next version within these boundaries.”'))),
       (t('接上一个研究问题。','Build on a research question.'),t('把先前的问题、假设和未解之处找回来。保留引用与自己的判断之间的区别。','Recover earlier questions, assumptions and open problems. Keep quoted material distinct from your own conclusions.'),paper(t('先前留下的问题','Earlier question'),t('这个结论依赖哪些假设？','Which assumptions does this conclusion depend on?'))+paper(t('新的任务','Next task'),t('“只讨论这些假设改变后会发生什么。”','“Focus on what changes when these assumptions change.”'))),
       (t('更新一次重要选择。','Revisit a decision.'),t('比较当时的限制和现在的新信息。过去的表达是有时间背景的材料，不是永久不变的个人画像。','Compare earlier constraints with new information. Past expressions are evidence from a point in time, not a permanent profile.'),paper(t('之前的约束','Earlier constraints'),t('地点、工作内容与学习空间。','Location, day-to-day work and room to learn.'))+paper(t('新的任务','Next task'),t('“结合更新后的约束，重新比较这两个选项。”','“Compare these two options using the updated constraints.”')))
    ]
    use+='<div class="wrap">'+''.join(spread(h,p,v,a('demo.html',t('体验示例','Explore an example'),'text-link')) for h,p,v in cases)+'</div>'+invitation()
    pages.append(('use-cases.html',t('PAIA — 使用场景','PAIA — Use cases'),t('让长期项目、研究与决策接上已有积累。','Carry existing context into projects, research and decisions.'),use))
    articles=[
      ('context','collect',t('聊天历史，不等于任务上下文。','A chat history is not task context.'),t('档案保留发生过什么；上下文决定这一次需要什么。','An archive keeps what happened. Context selects what this task needs.'),[
        (t('记录与选择是两回事。','Keeping and choosing are different.'),t('一段完整对话里可能同时有问题、尝试、引用和后来被放弃的方向。把所有内容原样交给下一次 AI，并不等于给了它正确的背景。','One conversation can contain questions, experiments, quotations and directions you later abandon. Giving all of it to your next AI task is not the same as giving that task the right background.')),
        (t('从这一次任务开始。','Start with the current task.'),t('先说明你现在要完成什么，再找出影响结果的目标、约束和决定。具体选中的材料，应当可以检查和修改；来源也应该能够核对。','First state what you are trying to do. Then choose the goals, constraints and decisions that affect the answer. The selected material should be inspectable and editable, with its source available to check.')),
        (t('让积累变得可用。','Make past work usable.'),t('PAIA 的方向不是让你花更多时间阅读旧聊天，而是让已经产生的表达再次进入工作。保存是起点；由你掌握的复用才是目的。','PAIA is not designed to make you spend more time reading old chats. It is designed to bring expressions you have already created back into use. Saving is the starting point; reuse under your control is the purpose.'))]),
      ('beliefs','connect',t('发给 AI 的，不一定是你的观点。','Not every input is a belief.'),t('引用、试探和任务指令，都需要保留各自的语境。','Quotations, experiments and instructions need their own context.'),[
        (t('输入里有多种声音。','An input can contain several voices.'),t('你可能把一份岗位说明、一段待改写文字或一个假设发给 AI。这能证明你发送过这些文字，但不能证明每句话都是你的长期立场。','You might send AI a job description, a draft to rewrite or a hypothetical argument. The record establishes that you sent those words. It does not establish that every sentence is a lasting belief.')),
        (t('不要把推断变成事实。','Do not turn an inference into a fact.'),t('整理结果应该能够回到来源，区分引用与自述，承认尚不确定的地方。AI 可以帮助重组材料，但不应该替你发明个人观点。','An organized result should point back to its sources, distinguish quotations from self-expression and leave uncertainty visible. AI can help restructure material; it should not invent a position for you.')),
        (t('当前选择比旧记录更重要。','The current choice still belongs to you.'),t('过去说过的话可以被保留，也可以在当前任务里不再适用。PAIA 让你检查、修改和排除材料，而不是把历史当成对未来行为的授权。','Past words can be preserved without remaining relevant to every future task. PAIA is intended to let you inspect, revise and exclude material—not treat historical instructions as permission for new actions.'))]),
      ('reuse','reuse',t('下一次 Prompt，应该带上什么？','What belongs in your next prompt?'),t('足够的背景，明确的任务，不必带上全部历史。','Enough background. A clear task. Not the entire archive.'),[
        (t('带上会改变答案的内容。','Include what changes the answer.'),t('项目的目标、实际用户、不能跨越的边界，以及已经做出的决定，通常比一整段往返讨论更容易被检查。先把它们写清楚。','A project’s goal, intended users, hard boundaries and existing decisions are often easier to review than an entire back-and-forth discussion. Make those explicit first.')),
        (t('更新已经变化的部分。','Update what has changed.'),t('旧约束不应因为被保存就一直有效。修改当前工作版本，保留原始来源以便核对，再检查这次上下文中是否还混入过时的判断。','A saved constraint does not stay valid forever. Update the working version while retaining the source for comparison, then check whether the new context still contains an outdated assumption.')),
        (t('发送之前，看见完整内容。','See the complete material before sharing.'),t('选择之后仍然需要预览。确认包含了什么、排除了什么，以及有没有不应发给外部系统的内容。复制和导出由你触发；之后的外部副本无法由 PAIA 收回。','Selection should be followed by a preview. Check what is included, what is excluded and whether any material should stay out of an external system. You initiate copying or exporting; PAIA cannot recall a copy you later share elsewhere.'))])
    ]
    blog=intro(t('产品文章','Product notes'),t('关于个人 AI 上下文，<br>几个必须讲清的问题。','A few things worth<br>getting right about AI context.'))
    blog+='<div class="journal-list wrap">'+''.join(a('article-'+slug+'.html',icon(ico)+f'<div><h2>{title}</h2><p>{summary}</p></div>'+icon('arrow','mini-icon'),'journal-item') for slug,ico,title,summary,_ in articles)+'</div>'
    pages.append(('blog.html',t('PAIA — 产品文章','PAIA — Product notes'),t('关于上下文、个人表达与复用的产品思考。','Product notes on personal expression, context and reuse.'),blog))
    for slug,ico,title,summary,sections in articles:
        body=intro(t('产品文章','Product notes'),title,summary)
        body+='<article class="essay prose wrap">'+''.join(f'<section><h2>{h}</h2><p>{p}</p></section>' for h,p in sections)+f'<nav class="essay-nav">{a("blog.html",t("返回文章","Back to notes"),"text-link")}{a("demo.html",t("体验上下文示例","Try the context example"),"text-link")}</nav></article>'
        pages.append(('article-'+slug+'.html','PAIA — '+title,summary,body))
    return pages

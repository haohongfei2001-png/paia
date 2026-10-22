"""Entirely fictional, bilingual examples. No real user archive or testimonial.

Each record is a user's sent expression. Dates, conversation identities, source
text and thematic placement are explicit; no generated belief is substituted.
"""
CASES = [
    {
        'id':'project', 'label':('独立项目','An independent project'),
        'title':('做一个报价工具','Building a quoting tool'),
        'question':('为什么当时决定不做项目管理？','Why did I decide not to build project management?'),
        'next':('有人建议加项目看板。先找回我当时为何没做，再判断这次有没有新的理由。','Someone suggested adding a project board. Recover why I ruled it out before deciding whether anything has changed.'),
        'outcome':('不用重开一轮功能清单。先带着已经想过的边界，判断新建议。','Do not start another feature brainstorm. Evaluate the new suggestion against the boundaries you already worked out.'),
        'groups':[('need',('要解决的问题','The problem to solve')),('limits',('明确不做什么','What not to build')),('open',('仍在试的交互','An interaction to test'))],
        'quote':'p3',
        'records':[
            ('p1','2026-03-05',('最初的产品想法','The first product idea'),'need',('我想做一个报价工具。先别列功能，我还没想清楚：难的是算价格，还是把服务范围说清楚？','I want to build a quoting tool. Before listing features, I need to understand the problem: calculating a price, or agreeing on what it covers?')),
            ('p2','2026-04-16',('访谈后的复盘','Reflecting on interviews'),'need',('这次聊下来，反复改需求比报价慢更值得追问。下一轮先问清楚：他们怎样约定修改次数？','After these conversations, changing requirements seem more worth investigating than slow quoting. Next, ask how people agree on revision limits.')),
            ('p3','2026-05-08',('第一版的边界','Defining the first release'),'limits',('第一版只做一页报价：交付物、时间和修改次数。不要客户管理，也不要做成另一个项目管理工具。','The first release is one quote: deliverables, timing and revision limits. No client management. Do not turn it into another project management tool.')),
            ('p4','2026-06-21',('重新讨论估价','Revisiting price estimates'),'limits',('自动估价先放下。同样叫一个页面，工作量可能完全不同。我宁可让人自己填，也不想给出没有依据的价格。','Put automatic estimates aside. Two things called a page may take very different amounts of work. Let people enter a price rather than invent one.')),
            ('p5','2026-08-11',('试用后的反思','Reflecting on a trial'),'open',('原来想填完信息再预览，现在想反过来：先看到报价单，边看边补。是否更好，还需要试。','I planned to show a preview after every field was filled. Now I want to show the quote first and fill it in as you go. That still needs testing.')),
            ('p6','2026-09-24',('接下来的验证','Choosing the next test'),'need',('这轮只看双方能否说清哪些修改算额外工作。有人问看板，不等于这就是现在该做的。','This round should test whether both sides can agree which changes cost extra. A request for a board does not make it the next thing to build.')),
        ],
    },
    {
        'id':'research','label':('研究判断','A research question'),
        'title':('提醒，真的让人更专注吗？','Do reminders actually help people focus?'),
        'question':('哪些是观察，哪些还只是我的假设？','Which parts are observations, and which are still hypotheses?'),
        'next':('沿着原来的限制重新设计实验。不要把“更多点击”直接当作“更专注”。','Redesign the experiment using the limitations we identified. Do not treat more clicks as better focus.'),
        'outcome':('把未验证的条件一起带回来，而不是只保留一个看上去漂亮的结论。','Bring back the untested conditions, not just a conclusion that sounds convincing.'),
        'groups':[('hypothesis',('从一个猜想开始','Starting with a hypothesis')),('limits',('证据的边界','The limits of the evidence')),('next',('下一次怎么验证','What to test next'))],
        'quote':'r4',
        'records':[
            ('r1','2026-02-12',('问题的起点','Framing the question'),'hypothesis',('我想研究提醒是否有助于专注。先别把这个问题写成“提醒能提高效率”，我现在只有一个猜想。','I want to study whether reminders help with focus. Do not turn that into “reminders improve productivity.” For now, it is only a hypothesis.')),
            ('r2','2026-03-03',('读完文献之后','After reviewing the literature'),'hypothesis',('有人说提醒有用，也有人觉得它打断思路。先把提醒的时机、任务种类和使用者分开，不急着合成一个结论。','Some people find reminders useful; others find them disruptive. Separate timing, task type and the people using them before drawing one conclusion.')),
            ('r3','2026-04-20',('试验设计','Planning a pilot'),'next',('不能让喜欢提醒的人都在实验组。否则看到的差异，可能来自本来的习惯，而不是提醒本身。','Do not put everyone who likes reminders in the treatment group. A difference could reflect their existing habits rather than the reminders.')),
            ('r4','2026-06-09',('结果该怎样解释','Interpreting the results'),'limits',('点击次数增加，只能说明响应更多，不能直接说明更专注。我还需要独立的任务完成指标。','More clicks show more responses, not necessarily better focus. I still need an independent measure of task completion.')),
            ('r5','2026-07-14',('没有被回答的问题','What remains unanswered'),'limits',('这次只看了刚开始使用的几天。新鲜感过去以后还会不会有用，我不能从现有结果里回答。','We only looked at the first few days. These results cannot tell me whether the effect lasts after the novelty wears off.')),
            ('r6','2026-09-02',('下一轮实验','The next experiment'),'next',('下一轮先延长观察，再比较不同任务。暂时保留“对某些人、某些时候可能有用”，不要写成普遍有效。','Next, observe for longer and compare task types. Keep the possibility that it helps some people at some times; do not claim a universal effect.')),
        ],
    },
    {
        'id':'career','label':('职业方向','A career decision'),
        'title':('下一份工作，真正想要什么','What I want from my next role'),
        'question':('我改变了什么，又始终在意什么？','What has changed, and what still matters to me?'),
        'next':('这份岗位说可以做创新。结合我之前的取舍，列出面试里必须问清楚的问题，不急着替我选。','This role promises room to innovate. Use my earlier trade-offs to identify what I need to ask in the interview, rather than choosing for me.'),
        'outcome':('新岗位出现时，不再只拿职位名称比较，而是找回自己反复在意的工作内容。','When a new role appears, compare the work against what has kept mattering to you—not just its title.'),
        'groups':[('start',('底线和变化','Priorities and changes')),('change',('真正投入的工作','Work worth doing')),('keep',('对新机会的提问','Questions for a new role'))],
        'quote':'c4',
        'records':[
            ('c1','2026-01-18',('第一次比较方向','Comparing directions'),'start',('我一直把管理岗当作下一步，但还没有想清楚：我想要的是职位变化，还是更大的创作空间？','I have treated management as the next step without asking whether I want a new title or more room to create.')),
            ('c2','2026-03-11',('做完一个项目之后','After finishing a project'),'change',('这次最投入的不是排期和协调，而是把模糊需求变成能试用的东西。这一点先记下来。','The part I cared about most was turning a vague need into something people could try, not scheduling and coordination. Keep that distinction.')),
            ('c3','2026-04-27',('重新理解职责','Rethinking responsibilities'),'change',('不是不愿意协调。为了把自己的方案做出来，我愿意；如果工作只剩下协调，我可能不会喜欢。','I am willing to coordinate when it helps bring a design to life. I probably would not enjoy a role that consisted only of coordination.')),
            ('c4','2026-06-05',('看完岗位以后','After reading job descriptions'),'keep',('不要因为岗位叫“创新”就加分。我想确认：谁定义问题，我能否参与方案，以及能不能看到用户反馈。','Do not favor a role just because it says “innovation.” Ask who defines the problem, whether I shape the solution, and whether I see user feedback.')),
            ('c5','2026-07-22',('一次面试的复盘','Reflecting on an interview'),'start',('待遇还是底线，不是可以忽略的条件。但达到底线以后，我想把实际工作内容放在头衔前面。','Pay is still a minimum requirement, not something to ignore. Once that is met, I want the actual work to matter more than the title.')),
            ('c6','2026-09-16',('比较新的机会','Considering another opportunity'),'keep',('这家公司说可以参与从零到一。先问一个真实项目里我会负责哪一段，再判断是不是我想要的工作。','This team says I could help build something from scratch. Ask which part I would own on a real project before deciding whether it is right for me.')),
        ],
    },
]

def localized(lang):
    n=0 if lang=='zh' else 1
    output=[]
    for case in CASES:
        item={k:(v[n] if isinstance(v,tuple) else v) for k,v in case.items() if k not in ('records','groups')}
        item['groups']=[{'id':key,'title':title[n]} for key,title in case['groups']]
        item['records']=[{'id':key,'date':date,'conversation':conversation[n],'group':group,'text':text[n]} for key,date,conversation,group,text in case['records']]
        output.append(item)
    return output

# Selected original expressions reused by the independent full demo. The demo
# keeps its existing data and permission controllers; only synthetic copy changes.
def sample_mapping(lang):
    n=0 if lang=='zh' else 1
    p=CASES[0];r=CASES[1];c=CASES[2]
    entries=p['records']
    pairs=[
        (('产品的第一步','A product’s first step'),p['title']),
        (('第一版应该做什么','What belongs in v1'),('第一版的边界','Defining the first release')),
        (('产品探索','Product exploration'),('独立项目','Independent project')),
        (('探索方向','Exploring a direction'),('问题与范围','Problem and scope')),
        (('判断与取舍','Decisions and trade-offs'),('取舍与验证','Trade-offs and tests')),
        (('先比较素材找回和内容生成，看看创作者更需要什么。','Compare material retrieval with content generation. Find out what creators need most.'),entries[2][4]),
        (('第一版只解决一个反复发生的问题，不做多人协作。','Solve one recurring problem in the first release. Leave collaboration for later.'),('修改次数不是越少越好。我要让双方提前知道包括哪些修改，哪些情况需要另谈。','Fewer revisions are not automatically better. Both sides need to know what is included and which changes require another agreement.')),
        (('判断标准不是功能多少，而是下一次任务能否接上这次积累。','Success is not more features. It is whether the next task can build on this one.'),('先别补进度、开票和客户管理。用一张报价单验证：范围能否说得足够清楚。','Do not add progress tracking, invoicing or client management yet. Use one quote to test whether the scope can be made clear enough.')),
        (('保留这个取舍：先找回，再决定是否创造更多。','Keep this trade-off: recover first, then decide whether to create more.'),entries[5][4]),
        (('写作习惯','Writing practice'),r['title']),
        (('先说清楚','Making the point'),('假设与证据','Hypotheses and evidence')),
        (('修改与取舍','Editing and choosing'),('仍待验证','Still untested')),
        (('先把想说明的事情说清楚，再决定是否需要修饰。','Make the point clear first. Decide afterward whether it needs embellishment.'),r['records'][3][4]),
        (('每次修改，保留真正影响判断的细节。','Keep the details that actually change the judgment when editing.'),r['records'][4][4]),
        (('学习与理解','Learning and understanding'),c['title']),
        (('从问题开始','Start with a question'),('真正投入的工作','Work that matters')),
        (('形成自己的解释','Find your own explanation'),('怎样判断机会','Evaluating a role')),
        (('把还没有想明白的问题留下来，下次从这里继续。','Keep the questions that are still unresolved. Begin here next time.'),c['records'][1][4]),
        (('能用自己的话解释，才算理解了一步。','Being able to explain it in my own words is one step toward understanding.'),c['records'][3][4]),
        (('我在为独立创作者设计一款工具。','I am designing a tool for independent creators.'),('我在做一款面向自由职业者的报价工具。','I am building a quoting tool for freelancers.')),
        (('本周验证第一版范围，先考虑已有素材的找回。','This week I am validating the first release, starting with material retrieval.'),('本周验证报价单能否说清修改的范围，暂不增加项目看板。','This week I am testing whether the quote makes revision limits clear. A project board can wait.')),
        (('先比较两个方向：帮助创作者找回已有素材，或继续增加生成功能。下一步，可以按你的约束做取舍。','Compare two directions: helping creators recover existing material, or adding generation features. Next, weigh them against your constraints.'),('这个示例围绕报价工具。先核对已有的范围决定，再考虑新功能。','This example concerns a quoting tool. Check the existing scope decisions before considering another feature.')),
    ]
    return {old[n]:new[n] for old,new in pairs}

DEMO_READING={
 'zh':{
  'balanced':'这组表达把第一版限制在交付物、时间和修改次数，明确不做客户或项目管理。修改次数并非越少越好，关键是双方提前理解范围。后来的验证仍围绕哪些修改算额外工作，而不是因为有人提出看板就扩大产品。',
  'concise':'先让双方说清报价与修改范围。不做客户管理、项目看板、进度或开票；是否增加功能，不能只看有没有人提出。'},
 'en':{
  'balanced':'These expressions limit the first release to deliverables, timing and revision limits, excluding client and project management. Fewer revisions are not the goal: mutual understanding of the scope is. The later test still concerns changes that cost extra, rather than adding a board just because someone requests it.',
  'concise':'Clarify the quote and revision scope. Do not add client management, boards, progress tracking or invoicing simply because someone asks.'}
}

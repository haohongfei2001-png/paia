"""Shared fictional human inputs. No AI response or private archive is used.

All dates, wording and provenance are illustrative. The case proves preservation
of a writing question and an evidence limit, not that a model follows them.
"""
EXPRESSIONS = [
    ('a', '12 AUG', '09:42',
     '我想写的不是怎样读更多书，而是读完以后，能不能用自己的话解释清楚。',
     'I don’t want to write about reading more books. I want to ask whether I can explain an idea in my own words after reading.',
     '怎样知道自己学会了', 'How do I know I have learned it?'),
    ('b', '26 AUG', '11:18',
     '先别把“看懂了”写成“学会了”。我一离开例子就说不清，这个区别要留下。',
     'Don’t equate following an example with learning it. Without the example, I still can’t explain the idea. Keep that distinction.',
     '怎样知道自己学会了', 'How do I know I have learned it?'),
    ('c', '10 SEP', '18:03',
     '我只做过两周的尝试。这篇文章可以讲我的经历，不能说这种方法对所有人有效。',
     'I only tried this for two weeks. The article can describe my experience, but it cannot claim the method works for everyone.',
     '怎样知道自己学会了', 'How do I know I have learned it?'),
    ('note', '24 SEP', '10:26',
     '开头从一个具体问题写起：昨天读懂的东西，今天为什么讲不出来？先别列工具清单。',
     'Start with a concrete question: why can’t I explain today what I understood yesterday? Don’t begin with a list of tools.',
     '从学习记录到文章提纲', 'From learning notes to an article outline'),
]


def title(t):
    return t('学过以后，留下什么', 'What stays after learning')


def records(t):
    return [(key, time, t(zh, en)) for key, date, time, zh, en, szh, sen in EXPRESSIONS[:3]]


def date_label(t, date):
    return t({'12 AUG':'8 月 12 日', '26 AUG':'8 月 26 日', '10 SEP':'9 月 10 日', '24 SEP':'9 月 24 日'}.get(date,date), date)


def inputs(t):
    return [dict(id=key, date=date_label(t,date), time=time, text=t(zh,en), source=t(szh,sen))
            for key,date,time,zh,en,szh,sen in EXPRESSIONS]


def prompts(t):
    return [t('保留原话中的限制条件。', 'Keep the original conditions.'),
            t('不要把个人经历写成普遍结论。', 'Don’t generalize my experience.'),
            t('先问清楚，再补充内容。', 'Ask before filling in gaps.')]


def current_task(t):
    return t('帮我列一篇自学方法文章的提纲。', 'Help me outline an article about learning on my own.')


def sections(t):
    return [t('真正想讨论的问题','The question I want to explore'),
            t('写作时保留的边界','Limits to keep in the article')]


def preset_reading(t):
    return {
        'original': t('保留上方原话。整理只改变阅读呈现，不覆盖你的文字或主题组织。', 'Keep the words above. Organization changes the reading view, never your words or topic structure.'),
        'balanced': t('文章关注的不是读了多少，而是能否独立解释。“看懂例子”和“学会”仍有区别。材料来自两周个人尝试，不推为普遍方法；开头用昨天读懂、今天讲不清的具体问题，不先列工具。', 'The article asks whether I can explain an idea independently, not how much I read. Following an example is different from learning. This is a two-week personal experiment, not a universal method. Begin with the question of understanding yesterday but being unable to explain today, not with a tool list.'),
        'concise': t('围绕“能否独立解释”写个人经历，保留看懂与学会的区别，以及两周尝试的证据边界；不用工具清单开头。', 'Write about explaining ideas independently, keeping the distinction between following and learning and the limits of a two-week personal experiment. Don’t lead with tools.')
    }

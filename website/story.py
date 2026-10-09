"""One public, entirely fictional example. These are the person's inputs, not AI replies."""
EXPRESSIONS = [
    ('a', '12 AUG', '09:42', '不要写成标准菜谱。妈妈说的“差不多”，也要留下。', 'Don’t turn it into a standard recipe. Keep Mum’s words—even “about this much.”', '给家人的食谱 · 最初的想法', 'Our family cookbook · The first idea'),
    ('b', '26 AUG', '11:18', '先做六道家常菜。每个周末只整理一道，不用一次写完。', 'Start with six family recipes. Work on one each weekend; it doesn’t need to be finished at once.', '给家人的食谱 · 最初的想法', 'Our family cookbook · The first idea'),
    ('c', '10 SEP', '18:03', '这本书不只是教人做饭。我想让家人翻开时，还能听见她的声音。', 'This book isn’t only about cooking. I want the family to hear her voice when they open it.', '给家人的食谱 · 最初的想法', 'Our family cookbook · The first idea'),
    ('note', '24 SEP', '10:26', '每道菜前，留一小段她常说的话。不确定的细节，下次问她，不要补写。', 'Start each recipe with something she always says. Ask her about uncertain details next time; don’t invent them.', '第一道菜怎么写', 'Writing the first recipe'),
]

def title(t):
    return t('给家人的食谱', 'Our family cookbook')

def records(t):
    return [(key, time, t(zh, en)) for key, date, time, zh, en, szh, sen in EXPRESSIONS[:3]]

def date_label(t, date):
    return t({"12 AUG":"8 月 12 日","26 AUG":"8 月 26 日","10 SEP":"9 月 10 日","24 SEP":"9 月 24 日"}.get(date,date), date)

def inputs(t):
    return [dict(id=key, date=date_label(t,date), time=time, text=t(zh,en), source=t(szh,sen)) for key,date,time,zh,en,szh,sen in EXPRESSIONS]

def prompts(t):
    return [t('保留她原来的说法。', 'Keep her own words.'), t('先做六道家常菜。', 'Keep it to six recipes.'), t('每个周末整理一道。', 'One recipe each weekend.')]

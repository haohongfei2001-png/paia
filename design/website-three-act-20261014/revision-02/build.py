"""Design revision only: original opening/closing, a page-sized continuous canvas.
No production writes. Original expressions and directory privacy are preserved.
Run against a checked-out fb90d440 website; portable output never embeds fonts.
"""
from pathlib import Path
from bs4 import BeautifulSoup
from html import escape as e
from urllib.parse import urlsplit
import base64, mimetypes, re, hashlib, json, os
BASE=Path(os.environ.get('PAIA_SOURCE','/Users/hhf/Documents/Codex/PAIA-Website-Presentation-20261013'))
OUT=Path(__file__).resolve().parent
SHA='fb90d4406dfdacf6873dd0d0dadb7bf00b13b177'

def icon(kind):
 paths={
 'archive':'<path d="M8 5h16v21H8zM4 9v21h16M12 11h8M12 17h8M12 23h4"/>',
 'thought':'<path d="M5 8h19v22H5zM10 3h19v22M10 14h9M10 20h9"/>',
 'info':'<circle cx="16" cy="11" r="5"/><path d="M6 29v-3a10 10 0 0 1 20 0v3"/>',
 'rules':'<path d="M4 8h24M4 16h24M4 24h24"/><circle cx="11" cy="8" r="3" fill="white"/><circle cx="23" cy="16" r="3" fill="white"/><circle cx="13" cy="24" r="3" fill="white"/>',
 'now':'<circle cx="16" cy="16" r="12"/><path d="M16 8v9l6 4"/>',
 'inputs':'<path d="M16 8C11 5 6 5 2 7v21c4-2 9-2 14 1 5-3 10-3 14-1V7c-4-2-9-2-14 1Zm0 0v21"/>',
 'lock':'<rect x="7" y="14" width="18" height="15" rx="3"/><path d="M11 14V9a5 5 0 0 1 10 0v5M16 20v3"/>'}
 return '<svg class="oc-icon" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+paths[kind]+'</svg>'

def inline_asset(url):
 f=BASE/url.lstrip('/').split('?')[0]
 if f.suffix.lower() in ('.woff2','.woff','.ttf','.otf'):return 'https://inputarchive.com'+url
 return 'data:'+(mimetypes.guess_type(f.name)[0] or 'application/octet-stream')+';base64,'+base64.b64encode(f.read_bytes()).decode() if f.is_file() else 'https://inputarchive.com'+url

record={}
for locale,relative in [('zh','zh/index.html'),('en','index.html')]:
 t=lambda a,b:a if locale=='zh' else b
 source=BeautifulSoup((BASE/relative).read_text(),'html.parser')
 hero=source.select_one('[data-product-hero]');closing=source.select_one('.core-close')
 originals=[n.get_text(' ',strip=True) for n in source.select('[data-story-original] .ad-story-entry p')]
 origins=[n.get_text(' ',strip=True) for n in source.select('[data-story-original] .ad-story-provenance')]
 prompts=[n.get_text(' ',strip=True) for n in source.select('.pc-prompt-pick')]
 assert len(originals)==4 and len(prompts)==3
 dates=['12 AUG · 09:42','26 AUG · 11:18','10 SEP · 18:03','24 SEP · 10:26']
 titles={};bodycopy={}
 for key,selector in [('archive','.pc-review'),('thought','.pc-topics'),('prompt','.pc-prompts'),('context','.pc-context')]:
  section=source.select_one(selector)
  titles[key]=section.select_one('h2').decode_contents()
  bodycopy[key]=section.select_one('.pc-intro p,.pc-body-copy').decode_contents()
 topic=t('产品的第一步','A product’s first step')
 names=[t('我的信息','My information'),t('我的规则','My rules'),t('我的现在','My now'),t('我的输入','My inputs')]
 descriptions=[t('你希望 AI 了解的背景。','Background you want AI to know.'),t('你希望它如何回应。','How you want it to respond.'),t('眼下在做什么，哪些条件变了。','What you are working on, and what has changed.'),t('允许深入读取的个人主题。','Personal topics open for in-depth reading.')]
 def original_rows(cls='oc-entry'):
  return ''.join(f'<article class="{cls}"><time>{dates[i]}</time><p>{e(v)}</p><small>{e(origins[i])}</small></article>' for i,v in enumerate(originals))
 organized=f'''<section class="oc-chapter"><span>01</span><h4>{t('探索方向','Exploring a direction')}</h4><p>{e(originals[0])}</p><p>{e(originals[1])}</p><small>12 AUG / 26 AUG · ChatGPT</small></section><section class="oc-chapter"><span>02</span><h4>{t('判断与取舍','Decisions and trade-offs')}</h4><p>{e(originals[2])}</p><p class="oc-decision">{e(originals[3])}</p><small>10 SEP / 24 SEP · ChatGPT</small></section>'''
 directories=''.join(f'<div class="oc-directory" data-directory="{key}">{icon(key)}<h3>{name}</h3><p>{description}</p><span>{t("由你决定读取范围","You set the reading scope")}</span></div>' for key,name,description in zip(['info','rules','now','inputs'],names,descriptions))
 topics=[(topic,t('探索方向','Exploring a direction'),t('判断与取舍','Decisions and trade-offs')),(t('写作习惯','Writing practice'),t('先说清楚','Making the point'),t('修改与取舍','Editing and choosing')),(t('学习与理解','Learning and understanding'),t('从问题开始','Start with a question'),t('形成自己的解释','Find your own explanation'))]
 cards=''.join(f'<article class="oc-topic-card"><div>{icon("thought" if i==0 else "inputs")}<span>0{i+1}</span></div><h3>{title}</h3><p>{sub1}<br>{sub2}</p></article>' for i,(title,sub1,sub2) in enumerate(topics))
 copies=''.join(f'<div class="oc-board-row"><span>{e(v)}</span><span aria-hidden="true">···</span></div>' for v in prompts)
 answer=source.select_one('.pc-answer-body p').get_text(' ',strip=True)
 canvas=f'''<article class="open-canvas" id="product-story" aria-label="{t('PAIA 的完整积累','Your work, connected in PAIA')}">
<section class="oc-archive oc-wide" id="archive"><header class="oc-intro"><div><p class="oc-kicker">INPUT ARCHIVE</p><h2>{titles['archive']}</h2></div><p class="oc-standfirst">{bodycopy['archive']}</p></header>
<div class="oc-timeflow">{''.join(f'<article><time>{dates[i]}</time><p>{e(originals[i])}</p><small>ChatGPT · {e(topic)}</small></article>' for i in range(3))}</div><div class="oc-archive-foot"><span>{t('原始来源，仍然保留。','The original source stays intact.')}</span><span>2026.08 — 2026.09</span></div></section>
<section class="oc-library" id="topics"><header class="oc-intro oc-wide"><div><p class="oc-kicker">THOUGHT LIBRARY</p><h2>{titles['thought']}</h2></div><p class="oc-standfirst">{bodycopy['thought']}</p></header><div class="oc-topic-row oc-wide">{cards}</div>
<div class="oc-reading-run" id="original"><div class="oc-reading-pin"><div class="oc-journal"><header class="oc-journal-head"><div><span>12 AUG — 24 SEP 2026</span><h3>{topic}</h3></div><div class="oc-reading-state"><span class="oc-state-original">{t('原话优先','Original words')}</span><span class="oc-state-organized">✦ {t('AI 整理','AI organization')}</span></div></header><div class="oc-journal-pages"><div class="oc-original">{original_rows()}</div><div class="oc-organized">{organized}</div></div><footer>{t('4 条原话 · 2 个对话 · 原始来源保留','4 expressions · 2 conversations · sources retained')}</footer><div class="oc-journal-sheen" aria-hidden="true"></div></div></div></div></section>
<section class="oc-reuse" id="reuse"><header class="oc-intro oc-wide"><div><p class="oc-kicker">PERSONAL PROMPTS</p><h2>{titles['prompt']}</h2></div><p class="oc-standfirst">{bodycopy['prompt']}</p></header><div class="oc-chat-run"><div class="oc-chat-pin"><div class="oc-chat oc-wide"><header><span>ChatGPT <small>⌄</small></span><span aria-hidden="true">↗</span></header><div class="oc-chat-dialog"><span class="oc-user">{t('第一版应该做什么','What belongs in v1')}</span><p>{e(answer)}</p><div class="oc-chat-tools" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="5" y="7" width="13" height="14" rx="2"/><path d="M9 3h10a2 2 0 0 1 2 2v11"/></svg><svg viewBox="0 0 24 24"><path d="M8 20H4V9h4m0 11h10l3-10h-8V3l-5 7z"/></svg><svg viewBox="0 0 24 24"><path d="M8 4H4v11h4M8 4h10l3 10h-8v7l-5-7z"/></svg></div></div>
<div class="oc-companion"><div class="oc-capsule-bg"></div><p class="oc-capsule-text">{e(prompts[0])}</p><div class="oc-board">{copies}</div><div class="oc-orb" aria-hidden="true"></div></div><div class="oc-composer"><p class="oc-composer-placeholder">{t('下一条输入','Your next input')}</p><p class="oc-composer-text">{e(prompts[0])}</p><div><small>{t('只填入，不自动发送','Inserts only. Never sends automatically.')}</small><span aria-hidden="true">↑</span></div></div></div></div></div></section>
<section class="oc-context oc-wide" id="context"><header class="oc-intro"><div><p class="oc-kicker">AI CONTEXT</p><h2>{titles['context']}</h2></div><p class="oc-standfirst">{bodycopy['context']}</p></header><div class="oc-directories">{directories}</div><div class="oc-context-note">{icon('lock')}<p>{t('未开放的主题不会被读取，也不会转而读取整个输入档案。','Closed topics stay closed. Access does not fall back to your entire Input Archive.')}</p></div></section>
<section class="oc-overview" id="overview"><div class="oc-wide"><header><span class="oc-wordmark">PAIA</span><div><h2>{t('三个空间，<br>同一份积累。','Three spaces.<br>One continuity.')}</h2><p>{t('表达有来源。思考有来处。下一次，有起点。','Words with a source. Ideas with a history. A place to begin again.')}</p></div></header>
<div class="oc-overview-grid"><section class="oc-map-archive"><p class="oc-map-label">INPUT ARCHIVE</p><h3>{t('原话、时间、来源。','Words. Time. Source.')}</h3><div class="oc-map-entries">{''.join(f'<div><time>{dates[i].split(" · ")[0]}</time><p>{e(originals[i])}</p></div>' for i in range(2))}</div></section>
<section class="oc-map-thought"><p class="oc-map-label">THOUGHT LIBRARY</p><h3>{topic}</h3><div class="oc-map-chapters"><p><span>01</span>{t('探索方向','Exploring a direction')}</p><p><span>02</span>{t('判断与取舍','Decisions and trade-offs')}</p></div><p class="oc-map-decision">{e(originals[3])}</p></section>
<section class="oc-map-context"><p class="oc-map-label">AI CONTEXT</p><div class="oc-map-directories">{''.join(f'<div>{icon(key)}<span>{name}</span></div>' for key,name in zip(['info','rules','now','inputs'],names))}</div></section>
<section class="oc-map-prompt"><div><p class="oc-map-label">PERSONAL PROMPTS</p><h3>{t('好的表达，再用一次。','Good words. Ready again.')}</h3></div><div class="oc-map-capsule"><span class="oc-orb" aria-hidden="true"></span><p>{e(prompts[0])}</p></div></section></div>
<footer><span>{icon('lock')}{t('本地优先 · 按需同步','Local first · Sync by choice')}</span><span>{t('你的输入，始终属于你。','Your inputs stay yours.')}</span></footer></div></section></article>'''
 original_hero=str(hero);original_closing=str(closing)
 full=BeautifulSoup(str(source),'html.parser')
 full.title.string=t('PAIA — 连续空间设计 · 修订 02','PAIA — Open-canvas design · Revision 02')
 for tag in full.select('script[src],link[rel=stylesheet],link[rel=canonical],link[rel=alternate],meta[property^="og:"],meta[name^="twitter:"]'):tag.decompose()
 full.head.append(BeautifulSoup('<meta name="robots" content="noindex,nofollow">','html.parser'))
 css='\n'.join(re.sub(r'url\([\'"]?(/[^\'"\)]+)[\'"]?\)',lambda m:'url("'+inline_asset(m[1])+'")',(BASE/urlsplit(el['href']).path.lstrip('/')).read_text()) for el in source.select('link[rel=stylesheet]'))
 style=full.new_tag('style');style.string=css+'\n'+(OUT/'open-canvas.css').read_text();full.head.append(style)
 main=full.select_one('main');main.clear()
 for part in (hero,BeautifulSoup(canvas,'html.parser'),closing):main.append(part)
 for tag in full.select('[src^="/assets/"],link[href^="/assets/"]'):
  attr='src' if tag.has_attr('src') else 'href';tag[attr]=inline_asset(tag[attr])
 for anchor in full.select('a[href^="#"]'):
  anchor['href']={'#input-library':'#product-story','#prompt-reuse':'#reuse'}.get(anchor['href'],anchor['href'])
 for anchor in full.select('a[href^="/"]'):
  anchor['href']=('prototype-en.html' if locale=='zh' else 'prototype.html') if 'language' in anchor.get('class',[]) else 'https://inputarchive.com'+anchor['href']
 full.body['data-open-canvas']='design'
 for script_source in [(BASE/'assets/website/site.js').read_text(),(OUT/'open-canvas.js').read_text()]:
  script=full.new_tag('script');script.string=script_source;full.body.append(script)
 target=OUT/('prototype.html' if locale=='zh' else 'prototype-en.html');target.write_text(str(full))
 record[locale]={'baseline':SHA,'expressions':originals,'hero_text':BeautifulSoup(original_hero,'html.parser').get_text(),'closing_text':BeautifulSoup(original_closing,'html.parser').get_text(),'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'context':'directory labels only; no private bodies'}
 print(locale,target,flush=True)
(OUT/'source-record.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n')

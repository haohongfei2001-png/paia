"""PAIA design-artifact authoring tool. Produces static artboards, never website runtime.
Python 3.11+, Pillow; optional Chromium/Playwright for proof PNGs.
All geometry is in CSS px; rendered text remains editable in the SVG.
"""
from pathlib import Path
from PIL import Image, ImageEnhance, ImageFont
from html import escape
from html.parser import HTMLParser
import base64, hashlib, io, json, math, re, subprocess, sys, urllib.request
from functools import lru_cache

ROOT=Path(sys.argv[1] if len(sys.argv)>1 else 'design/website-editorial-v1')
for d in ['artboards','previews','assets','specs','copy']:(ROOT/d).mkdir(parents=True,exist_ok=True)
BASE='29222dcab9328eb567db813d77e9cddd486fecb4'
INK='#171c19'; BODY='#616969'; MUTED='#707975'; LINE='#dfe2dc'; PAPER='#fdfdfb'; GREEN='#343e35'; PALE='#f2f3ee'
PHOTOS={
'coast':{'author':'Gunel','source':'https://unsplash.com/photos/a-view-of-the-ocean-from-the-top-of-a-cliff-zg3WkjhieRA','url':'https://images.unsplash.com/photo-1634681974664-d46e36f5c578?fm=jpg&q=90&w=1800'},
'architecture':{'author':'Grant Lemons','source':'https://unsplash.com/photos/white-concrete-building-jTCLppdwSEc','url':'https://images.unsplash.com/photo-1459767129954-1b1c1f9b9ace?fm=jpg&q=90&w=1800'},
'light':{'author':'Milad Fakurian','source':'https://unsplash.com/photos/plant-shadow-on-white-wall-Tc_4PdN-Fq0','url':'https://images.unsplash.com/photo-1600172454284-934feca24ccd?fm=jpg&q=90&w=1800'}}
COPY={'en':{},'zh':{}}; INDEX=[]; FONT_RECORD={}; ASSET_RECORD={}; LANG='en'
def text(en,zh=None):
    key='copy-'+hashlib.sha256(en.encode()).hexdigest()[:12]
    COPY['en'][key]=en; COPY['zh'][key]=zh if zh is not None else en
    return (zh if LANG=='zh' and zh is not None else en),key

@lru_cache(maxsize=256)
def font(size,serif=False,italic=False,zh=False):
    family=('Noto Serif CJK SC' if serif else 'Noto Sans CJK SC') if zh else ('EB Garamond 12' if serif else 'Inter')
    pattern=family+(':style=Italic' if italic else ':style=Regular')
    path=subprocess.check_output(['fc-match','-f','%{file}',pattern],text=True).strip()
    FONT_RECORD[pattern]={'family':family,'file_basename':Path(path).name,'sha256':hashlib.sha256(Path(path).read_bytes()).hexdigest(),'font_files_not_distributed':True}
    return ImageFont.truetype(path,round(size*10)),family

def measure(s,size,serif=False,italic=False):
    f,_=font(size,serif,italic,LANG=='zh');return f.getlength(s)/10

def wrap(s,width,size,serif=False,italic=False):
    out=[]
    for para in s.split('\n'):
        if not para:out.append('');continue
        words=list(para) if LANG=='zh' else para.split(' ')
        sep='' if LANG=='zh' else ' ';line=''
        for word in words:
            trial=line+sep+word if line else word
            if line and measure(trial,size,serif,italic)>width:out.append(line);line=word
            else:line=trial
        if line:out.append(line)
    return out

class Board:
    def __init__(self,name,w=1440,h=2000):
        self.name=name;self.w=w;self.h=h;self.parts=[];self.nodes=[];self.count=0
        self.defs=['<filter id="paper-shadow" x="-45%" y="-35%" width="195%" height="200%"><feDropShadow dx="0" dy="15" stdDeviation="19" flood-color="#232e24" flood-opacity=".13"/></filter>',
        '<filter id="source-shadow" x="-40%" y="-35%" width="180%" height="185%"><feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#283127" flood-opacity=".09"/></filter>',
        '<filter id="photo-shadow" x="-35%" y="-30%" width="170%" height="175%"><feDropShadow dx="0" dy="10" stdDeviation="15" flood-color="#283127" flood-opacity=".12"/></filter>']
        self.rect(0,0,w,h,PAPER,role='background')
    def node(self,kind,**kw):
        self.count+=1; nid=f'{self.name}.{self.count:03d}'
        self.nodes.append({'id':nid,'kind':kind,'paint_order':self.count,**kw});return nid
    def rect(self,x,y,w,h,fill='none',stroke=None,r=0,shadow=None,role='surface',rotate=0):
        nid=self.node('rect',x=x,y=y,width=w,height=h,fill=fill,stroke=stroke,radius=r,shadow=shadow,rotation=rotate,role=role)
        filt=f' filter="url(#{shadow})"' if shadow else ''
        tr=f' transform="rotate({rotate} {x+w/2} {y+h/2})"' if rotate else ''
        st=f' stroke="{stroke}" stroke-width=".8"' if stroke else ''
        self.parts.append(f'<rect id="{nid}" x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fill}"{st}{filt}{tr}/>')
    def line(self,x1,y1,x2,y2,stroke=LINE,width=1):
        nid=self.node('line',x1=x1,y1=y1,x2=x2,y2=y2,stroke=stroke,stroke_width=width)
        self.parts.append(f'<path id="{nid}" d="M{x1} {y1} L{x2} {y2}" fill="none" stroke="{stroke}" stroke-width="{width}"/>')
    def curve(self,d,stroke='#969e98',width=.8):
        nid=self.node('connector',path=d,stroke=stroke,stroke_width=width)
        self.parts.append(f'<path id="{nid}" d="{d}" fill="none" stroke="{stroke}" stroke-width="{width}"/>')
    def dot(self,x,y,r=2,fill='#8d9690'):
        self.node('dot',x=x,y=y,radius=r,fill=fill);self.parts.append(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}"/>')
    def txt(self,x,y,en,zh=None,size=18,width=None,serif=False,italic=False,color=INK,lh=None,tracking=0,role='text',align='start'):
        italic=italic and LANG!='zh'
        s,key=text(en,zh);ls=wrap(s,width,size,serif,italic) if width else s.split('\n');lh=lh or size*(1.65 if LANG=='zh' and not serif else 1.45 if not serif else 1.08)
        _,family=font(size,serif,italic,LANG=='zh');nid=self.node('text',x=x,y=y,width=width,font_family=family,font_size=size,font_style='italic' if italic else 'normal',line_height=lh,letter_spacing=tracking,color=color,lines=ls,copy_id=key,role=role,anchor=align)
        spans=''.join(f'<tspan x="{x}" y="{y+size*.83+i*lh:.2f}">{escape(line)}</tspan>' for i,line in enumerate(ls))
        self.parts.append(f'<text id="{nid}" font-family="{family}" font-size="{size}" font-weight="400" font-style="{"italic" if italic else "normal"}" letter-spacing="{tracking}" text-anchor="{align}" fill="{color}">{spans}</text>')
        return len(ls)*lh
    def label(self,x,y,en,zh=None):return self.txt(x,y,en,zh,size=9.5,lh=16,tracking=2.4,color=MUTED,role='decorative-annotation')
    def photo(self,name,x,y,w,h,rotate=0,arch=False,position=(.5,.5),shadow=True):
        file=ROOT/'assets'/f'{name}.jpg'
        if not file.exists():file=ROOT/'assets'/f'{name}.png'
        im=Image.open(file).convert('RGB');iw,ih=im.size;ratio=max(w/iw,h/ih);cropw=w/ratio;croph=h/ratio
        left=(iw-cropw)*position[0];top=(ih-croph)*position[1]
        crop=im.crop((left,top,left+cropw,top+croph));crop.thumbnail((min(1400,int(w*2)),min(1800,int(h*2))));buf=io.BytesIO();crop.save(buf,'JPEG',quality=86,optimize=True)
        data=base64.b64encode(buf.getvalue()).decode();nid=self.node('photograph',asset=name,x=x,y=y,width=w,height=h,rotation=rotate,crop_xywh=[round(left,2),round(top,2),round(cropw,2),round(croph,2)],position=position,arch=arch)
        clip=f'clip-{self.count}'; shape=f'<path d="M{x} {y+h}V{y+w/2}a{w/2} {w/2} 0 0 1 {w} 0V{y+h}Z"/>' if arch else f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="1"/>'
        self.defs.append(f'<clipPath id="{clip}">{shape}</clipPath>')
        filt=' filter="url(#photo-shadow)"' if shadow else ''
        self.parts.append(f'<g transform="rotate({rotate} {x+w/2} {y+h/2})"{filt}><image x="{x}" y="{y}" width="{w}" height="{h}" clip-path="url(#{clip})" href="data:image/jpeg;base64,{data}"/></g>')
    def button(self,x,y,en='Get early access',zh='申请内测',w=208,h=56,primary=True):
        self.rect(x,y,w,h,GREEN if primary else PAPER,stroke=GREEN,r=h/2,role='button')
        self.txt(x+24,y+(h-(13 if h<=42 else 15.5))/2,en,zh,size=13 if h<=42 else 15.5,color=PAPER if primary else GREEN,role='button-label')
        self.curve(f'M{x+w-39} {y+h/2}h14m-5 -5 5 5-5 5',PAPER if primary else GREEN,1.2)
    def card(self,x,y,w,h,title,body,zh_title=None,zh_body=None,meta='Illustrative material',big=False):
        self.rect(x,y,w,h,'#fcfcfa',LINE,6,'paper-shadow' if big else 'source-shadow',role='context-paper' if big else 'source-paper')
        self.txt(x+23,y+20,'λ' if big else '◌',size=26 if big else 24,serif=True,color=GREEN)
        self.txt(x+54,y+24,title,zh_title,size=13 if not big else 16,serif=big)
        self.txt(x+54,y+45,'Example' if w<200 else meta,'示例' if w<200 else '示例材料',size=10.5,color=MUTED)
        self.txt(x+24,y+80 if big else y+68,body,zh_body,size=14 if big else 12.5,width=w-48,lh=20 if big else 18,color='#424c47')
        if big:
            self.line(x+24,y+h-51,x+w-24,y+h-51)
            self.txt(x+24,y+h-34,'3 selected moments','已选择 3 条材料',size=10.5,color=MUTED)
            self.txt(x+w-33,y+h-39,'›',size=23,serif=True,color=MUTED)
    def save(self):
        svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="{self.w}" height="{self.h}" viewBox="0 0 {self.w} {self.h}"><title>PAIA — {self.name} — design only</title><desc>Static authored design specification. Fictional examples; not implemented UI or product evidence.</desc><defs>'+''.join(self.defs)+'</defs>'+''.join(self.parts)+'</svg>'
        path=ROOT/'artboards'/f'{self.name}.svg';path.write_text(svg)
        (ROOT/'specs'/f'{self.name}.geometry.json').write_text(json.dumps({'frame':self.name,'width':self.w,'height':self.h,'units':'CSS px','locale':LANG,'nodes':self.nodes},ensure_ascii=False,indent=2))
        INDEX.append({'frame':self.name,'width':self.w,'height':self.h,'locale':LANG,'svg':'artboards/'+path.name,'preview':'previews/'+self.name+'.png','node_count':len(self.nodes)})

def header(b,m=False,active='Home'):
    b.txt(24 if m else 76,22 if m else 20,'PAIA',size=34 if m else 43,serif=True,tracking=1.2)
    if m:
        b.button(203,22,'Join beta','申请内测',w=127,h=39);b.line(350,34,369,34,INK);b.line(350,43,369,43,INK);return
    b.line(181,25,181,57)
    b.txt(197,29,'Your AI context,\nfor what’s next.','你的 AI 上下文，\n也是下一步的起点。',size=12.5,lh=17,color=MUTED)
    for x,label,zh in [(475,'Home','首页'),(553,'How it works','使用方式'),(687,'Use cases','使用场景'),(799,'Our story','我们的故事'),(909,'Journal','手记')]:
        b.txt(x,34,label,zh,size=13)
        if label==active:b.line(x,54,x+measure(label,13),54,'#808981',1.4)
    b.button(1192,18,w=176,h=42)

def footer(b,y,m=False):
    margin=24 if m else 76;right=b.w-margin;b.line(margin,y,right,y)
    b.txt(margin,y+38,'PAIA',size=43 if not m else 36,serif=True,tracking=1.2)
    b.txt(margin,y+99,'Your thinking has a longer tomorrow.','让你的思考，拥有更长的明天。',size=15,width=340,color=BODY)
    groups=[('Explore','探索',[('How it works','使用方式'),('Use cases','使用场景'),('Explore an example','体验示例')]),('Perspectives','观点',[('Our story','我们的故事'),('Journal','手记'),('Get early access','申请内测')]),('Trust','信任',[('Your data','你的数据'),('Current status','当前状态'),('Privacy · Terms','隐私 · 条款'),('Contact','联系')])]
    for i,(en,zh,links) in enumerate(groups):
        xx=margin+(i%2)*180 if m else 710+i*230;yy=y+176+(i//2)*176 if m else y+45
        b.label(xx,yy,en.upper(),zh)
        for j,(a,z) in enumerate(links):b.txt(xx,yy+38+j*29,a,z,size=12.5,color=BODY)
    bottom=y+(570 if m else 244);b.line(margin,bottom,right,bottom)
    b.txt(margin,bottom+25,'© 2026 PAIA · Private beta','© 2026 PAIA · 内测阶段',size=10.5,color=MUTED)
    b.txt(right,bottom+25,'EN   /   中文',size=11,color=MUTED,align='end')
    b.txt(margin,bottom+52,'Photography credits · Illustrative material, not a live archive','摄影署名 · 所有材料均为示例，并非真实档案',size=9.5,color=MUTED)

def hero_collage(b,m=False,offset=0):
    if m:
        b.photo('coast',163,535+offset,143,202,-3)
        b.photo('light',279,769+offset,87,161,3)
        b.curve(f'M116 {679+offset}C116 {730+offset} 175 {682+offset} 197 {738+offset}')
        b.curve(f'M302 {688+offset}C309 {715+offset} 275 {715+offset} 282 {741+offset}')
        b.card(24,584+offset,154,121,'Earlier','I want work with more room for creative thinking.','曾经的问题','我想做一份更能发挥创造力的工作。')
        b.card(235,604+offset,131,108,'Later','Autonomy matters, too.','后来的记录','自主性也很重要。')
        b.card(34,826+offset,132,116,'Note','Keep learning.','新的想法','持续学习，也持续创造。')
        b.card(137,725+offset,221,224,'PAIA','Selected words for a more considered next conversation.','PAIA','选出有关的原话，让下一次对话从更清楚的地方开始。',big=True)
        b.label(26,545+offset,'IDEAS EVOLVE','想法在延续')
        b.txt(24,977+offset,'Illustrative composition · You choose the material.','示意构图 · 由你选择材料。',size=10.5,color=MUTED)
        return
    b.rect(807,105+offset,198,252,PALE,shadow='photo-shadow',rotate=-2)
    b.photo('coast',807,208+offset,198,147,-2)
    b.txt(913,123+offset,'A more\nconsidered\npath.','更从容的\n下一步。',size=22,serif=True,italic=True,lh=25)
    b.photo('architecture',700,431+offset,160,220,-2)
    b.photo('light',1135,426+offset,179,206,-4)
    for d in [f'M733 {333+offset}C756 {389+offset} 847 {343+offset} 874 {396+offset}',f'M839 {266+offset}C933 {266+offset} 938 {265+offset} 1035 {265+offset}',f'M1108 {395+offset}C1136 {390+offset} 1138 {352+offset} 1133 {291+offset}',f'M1106 {402+offset}C1149 {403+offset} 1171 {421+offset} 1197 {434+offset}',f'M690 {127+offset}C722 {135+offset} 729 {156+offset} 733 {183+offset}',f'M1246 {241+offset}C1283 {239+offset} 1273 {162+offset} 1284 {147+offset}']:b.curve(d)
    for p in [(733,333),(874,396),(1035,265),(1133,291),(1197,434),(690,127),(733,183),(1246,241),(1284,147)]:b.dot(p[0],p[1]+offset)
    b.card(624,189+offset,212,142,'ChatGPT','I’m exploring a career shift into more human-centred work.','ChatGPT','我正在考虑转向更以人为中心的工作。')
    b.card(1039,165+offset,202,123,'Selected note','I value creativity, autonomy and real-world impact.','选中的记录','我重视创造力、自主性和真实的影响。')
    b.card(1208,297+offset,164,111,'A later question','What do I want to carry forward?','后来的问题','哪些想法值得带到下一步？')
    b.card(650,395+offset,198,139,'Another conversation','Help me think through a studio versus a company.','另一次对话','帮我比较个人工作室与加入公司的取舍。')
    b.card(874,307+offset,232,269,'PAIA','A few selected words about creative freedom, meaningful work and learning — ready to revisit and reuse.','PAIA','选出关于创作自由、有意义的工作和持续学习的原话，重新查看，并用于下一次对话。',big=True)
    b.label(640,121+offset,'IDEAS\nEVOLVE','想法在延续')
    b.label(1297,134+offset,'KEY THEMES\nEMERGE','主题逐渐清晰')
    b.label(596,598+offset,'DIFFERENT\nPERSPECTIVES.\nRICHER CONTEXT.','不同视角\n更完整的语境')
    b.label(1330,597+offset,'CONTEXT\nOPENS\nPOSSIBILITY.','语境带来\n新的可能')
    b.txt(952,670+offset,'Illustrative material · Not a connected archive','示例材料 · 并未连接真实档案',size=10.5,color=MUTED)

def icon(b,x,y,kind):
    if kind==0:
        b.curve(f'M{x+4} {y+2}h17a5 5 0 0 1 5 5v19m-9 8H{x+4}a4 4 0 0 1-4-4V{y+6}a4 4 0 0 1 4-4m2 9h14m-14 6h10',INK,1.3);b.curve(f'M{x+31} {y+33}l-6-6',INK,1.3);b.parts.append(f'<circle cx="{x+22}" cy="{y+24}" r="6" fill="none" stroke="{INK}" stroke-width="1.3"/>')
    elif kind==1:
        b.line(x+9,y+18,x+26,y+5,INK,1.3);b.line(x+9,y+18,x+26,y+31,INK,1.3)
        for dx,dy in [(7,18),(28,4),(28,32)]:b.parts.append(f'<circle cx="{x+dx}" cy="{y+dy}" r="5" fill="{PAPER}" stroke="{INK}" stroke-width="1.3"/>')
    else:b.curve(f'M{x+2} {y+31}l14-14m-2-8 18-7-5 19-5-8-8-4m1 12-7 11-6-4 7-11',INK,1.3)

def home(m=False):
    b=Board(f'home-{LANG}-'+('390' if m else '1440'),390 if m else 1440,8280 if m else 6500);header(b,m)
    if m:
        b.label(24,111,'PAST CONVERSATIONS.\nA MORE CONTINUOUS YOU.','过去的对话，\n更连贯的自己。')
        b.txt(24,174,'Turn what you’ve\nsaid into\nwhat’s next.','让你说过的话，\n成为下一步\n的起点。',size=47,serif=True,lh=49)
        b.txt(24,345,'Capture, revisit, edit and reuse what you say to AI — so your thinking goes further.','留下、回看、编辑并复用你对 AI 说过的话，让思考继续向前。',size=16,width=331,lh=25,color=BODY)
        b.button(24,455,w=193,h=52);b.txt(24,524,'Chrome · ChatGPT · Private beta','Chrome · ChatGPT · 内测中',size=10.5,color=MUTED)
        hero_collage(b,True)
        feats=[('See your full picture','看见更完整的自己','Find the words you would otherwise leave behind.','找回那些原本会留在旧对话里的话。'),('Find a thread worth keeping','找出值得延续的脉络','Bring related expressions together without rewriting the past.','把相关表达放在一起，不改写过去。'),('Put it to new use','让它再次有用','Edit, choose and carry the useful parts into what comes next.','编辑、选择，把有用的部分带到下一步。')]
        for i,(title,zt,body,zb) in enumerate(feats):
            yy=1070+i*167;b.line(24,yy-28,366,yy-28);icon(b,27,yy+8,i);th=b.txt(88,yy,title,zt,size=26,serif=True,width=276);b.txt(88,yy+th+17,body,zb,size=14,width=263,color=BODY)
        b.rect(24,1590,342,228,PALE);b.photo('light',267,1590,99,228,arch=True,shadow=False)
        b.label(45,1619,'A QUIETER KIND OF PROGRESS','安静地，继续向前')
        b.txt(46,1681,'What you keep today\ncan change what\ncomes next.','今天留下的话，\n也许会改变\n下一步。',size=29,serif=True,lh=32)
        b.label(24,1928,'01 / A LONGER THREAD','01 / 更长的脉络')
        b.txt(24,1971,'Not another place\nto start over.','不必在每个窗口，\n重新开始。',size=43,serif=True,lh=47)
        b.txt(24,2090,'A conversation ends. A project, question or decision often doesn’t. Keep a readable working archive, with a way back to the original.','对话会结束，但项目、问题和选择往往还在继续。保留一份可以阅读和编辑的档案，也保留回到原话的路径。',size=16,width=332,color=BODY)
        b.photo('architecture',24,2265,247,281,-2)
        b.card(126,2420,240,176,'The original stays','Today’s edits do not pretend to be yesterday’s words.','原话仍在','今天的修改，不会冒充昨天说过的话。')
        b.label(24,2726,'02 / FROM THEN TO NEXT','02 / 从当时，到下一步')
        b.txt(24,2770,'A little continuity.\nA different start.','多一点连贯，\n下一次就不同。',size=43,serif=True,lh=47)
        for i,(title,zt,desc,zd) in enumerate(STEPS):
            yy=2920+i*260;b.label(24,yy,f'0{i+1}',f'0{i+1}');b.txt(75,yy-4,title,zt,size=31,serif=True);b.txt(75,yy+51,desc,zd,size=15,width=278,color=BODY)
            b.line(24,yy+223,366,yy+223)
        b.label(24,4050,'03 / WHAT STAYS WITH YOU','03 / 那些持续思考的事')
        b.txt(24,4093,'For the questions\nthat stay with you.','为那些一直\n萦绕心头的问题。',size=42,serif=True,lh=46)
        for i,case in enumerate(CASES):
            yy=4245+i*355;x=24 if i%2==0 else 77;b.photo(['coast','architecture','light'][i],x,yy,289,180,(-1 if i%2==0 else 1));b.txt(x,yy+207,case['label'][0],case['label'][1],size=29,serif=True);b.txt(x,yy+251,case['short'][0],case['short'][1],size=14,width=281,color=BODY)
        b.label(24,5402,'04 / YOUR WORDS, YOUR CONTROL','04 / 原话与你的决定')
        b.txt(24,5443,'Keep the original.\nChoose what travels.','保留原话。\n决定什么被带走。',size=41,serif=True,lh=46)
        b.photo('light',123,5583,243,271,arch=True)
        b.card(24,5741,251,193,'Selected context','Only the material you deliberately choose belongs in the next step.','已选择的上下文','只有你明确选中的材料，才进入这一次复用。')
        b.txt(24,6010,'Local-first is the starting point. Optional external AI is a separate, explicit choice. Copies you send elsewhere cannot be recalled by PAIA.','本地优先是起点。外部 AI 处理需要单独、明确的操作。已经发送到外部的副本，PAIA 无法收回。',size=16,width=332,color=BODY)
        b.label(24,6350,'A FEW THINGS WORTH KNOWING','一些值得了解的事')
        for i,(q,zq,a,za) in enumerate(FAQ[:5]):
            yy=6410+i*96;b.line(24,yy,366,yy);b.txt(24,yy+25,q,zq,size=15,width=299);b.txt(350,yy+25,'+',size=20,color=MUTED)
        b.txt(24,7035,'Your thinking has\na longer tomorrow.','让你的思考，\n拥有更长的明天。',size=43,serif=True,lh=47)
        b.txt(24,7160,'Start with the words you already have.','从你已经说过的话开始。',size=16,width=331,color=BODY);b.button(24,7220)
        b.txt(24,7303,'Invitation-only beta. No instant-install promise.','邀请制内测，并非立即安装。',size=11,color=MUTED)
        footer(b,7590,True);b.save();return
    b.label(76,211,'PAST CONVERSATIONS.\nA MORE CONTINUOUS YOU.','过去的对话，\n更连贯的自己。')
    b.txt(76,291,'Turn what you’ve','让你说过的话，',size=64,serif=True,lh=65)
    b.txt(76,357,'said into','成为',size=64,serif=True)
    b.txt(302 if LANG=='en' else 210,357,'what’s next.','下一步的起点。',size=64,serif=True,italic=True)
    b.txt(76,452,'A personal archive for what you say to AI. Capture, revisit, understand, edit and reuse your words — so your thinking goes further.','为你对 AI 说过的话，留一份个人档案。回看、理解、编辑和复用，让思考继续向前。',size=17,width=470,lh=25,color=BODY)
    b.button(76,561);b.txt(351,582,'Explore an example','体验示例',size=13.5,color=BODY);b.line(351,604,481,604,'#a2aaa2')
    b.txt(76,641,'Chrome · Consented ChatGPT capture · Private beta','Chrome · 经同意捕获 ChatGPT 输入 · 内测阶段',size=11,color=MUTED)
    hero_collage(b)
    b.line(76,715,1368,715);b.label(76,758,'MORE THAN A HISTORY.\nA CLEARER START.','不止于历史，\n也是更清楚的起点。')
    values=[('See your full picture','看见更完整的自己','Bring your past expressions back into view. Find the thinking that still matters.','重新看到过去的表达，找回仍然重要的思考。'),('Find a deeper thread','找出更深的脉络','Revisit related words across conversations, without inventing a new version of you.','跨越对话回看相关表达，不为你编造另一个自己。'),('Put it to new use','让它再次有用','Edit, adapt and carry selected words into new conversations, projects and possibilities.','编辑、调整，把选中的原话带进新的对话、项目和可能。')]
    for i,(tt,tz,bb,bz) in enumerate(values):
        x=[76,396,710][i];icon(b,x,826,i);b.txt(x,886,tt,tz,size=25,serif=True);b.txt(x,928,bb,bz,size=14,width=234,lh=21,color=BODY)
        if i<2:b.line(x+274,827,x+274,978)
    b.rect(1000,747,368,249,PALE);b.photo('light',1241,747,127,249,arch=True,shadow=False)
    b.label(1027,778,'A QUIETER KIND OF PROGRESS','安静地，继续向前')
    b.txt(1027,854,'What you keep today\ncan change what\ncomes next.','今天留下的话，\n也许会改变\n下一步。',size=28,serif=True,lh=31)
    b.line(76,1020,1368,1020);b.label(76,1049,'YOUR THINKING HAS A LONGER TOMORROW.','让你的思考，拥有更长的明天。')
    b.label(76,1207,'01 / A LONGER THREAD','01 / 更长的脉络')
    b.photo('architecture',118,1310,301,379,-3)
    b.card(263,1478,306,207,'The original stays','Today’s edits do not pretend to be yesterday’s words.','原话仍在','今天的修改，不会冒充昨天说过的话。')
    b.label(92,1725,'WHAT WAS SAID.\nWHAT MATTERS NOW.','当时说过的话，\n此刻重要的事。')
    b.txt(708,1258,'Not another place\nto start over.','不必在每个窗口，\n重新开始。',size=59,serif=True,lh=62)
    b.txt(710,1441,'A conversation ends. A project, question or decision often doesn’t.','对话会结束，但项目、问题和选择往往还在继续。',size=23,serif=True,width=491,lh=30)
    b.txt(710,1542,'PAIA gives your own words a readable working archive. Revisit a thread, change the wording, follow the source and choose what is useful for the next step. Organizing is optional. Starting from nothing is, too.','PAIA 为你自己的话提供一份可阅读、可编辑的档案。回看脉络、调整文字、核对来源，再选择下一步真正需要的内容。整理是可选的，重新从零开始也是。',size=17,width=482,lh=27,color=BODY)
    b.txt(710,1691,'See how it works  →','了解使用方式  →',size=14,color=GREEN)
    b.line(76,1857,1368,1857);b.label(76,1902,'02 / FROM THEN TO NEXT','02 / 从当时，到下一步')
    b.txt(76,1960,'A little continuity.\nA different start.','多一点连贯，\n下一次就不同。',size=59,serif=True,lh=62)
    for i,(title,zt,desc,zd) in enumerate(STEPS):
        yy=2165+i*109;b.label(76,yy+2,f'0{i+1}',f'0{i+1}');b.txt(124,yy,title,zt,size=28,serif=True);b.txt(124,yy+44,desc,zd,size=13.5,width=330,lh=20,color=BODY)
    b.photo('coast',823,1950,307,319,2)
    b.card(586,2205,299,211,'An earlier question','How can I make room for meaningful, creative work?','过去的问题','怎样为有意义的创作腾出空间？')
    b.card(962,2175,325,214,'Working version','A clearer question, edited by you. The original remains available.','工作版本','由你编辑成更清晰的问题，原话仍然可查。')
    b.curve('M889 2351C921 2427 975 2389 1008 2443');b.dot(1008,2443)
    b.card(784,2442,390,236,'Selected context','For this conversation: my question, my current constraints, and the words I choose to keep.','已选择的上下文','为这一次对话，选出我的问题、当前约束，以及值得保留的原话。',big=True)
    b.txt(594,2710,'Illustrated workflow, not a live product screenshot. Explore the working example  →','流程示意，并非真实产品截图。体验交互示例  →',size=11,color=MUTED)
    b.label(76,2896,'03 / WHAT STAYS WITH YOU','03 / 那些持续思考的事')
    b.txt(76,2950,'For the questions\nthat stay with you.','为那些一直\n萦绕心头的问题。',size=61,serif=True,lh=64)
    b.photo('coast',76,3160,367,432,-1)
    b.txt(105,3530,'A more considered path.','更从容的下一步。',size=29,serif=True,italic=True,color=PAPER)
    b.label(549,3100,'01 / ONGOING PROJECTS','01 / 长期项目')
    b.txt(547,3143,'Pick up the thread.','接上原来的脉络。',size=38,serif=True)
    b.txt(550,3216,CASES[0]['short'][0],CASES[0]['short'][1],size=16,width=333,color=BODY)
    b.txt(550,3310,'Follow this example  →','查看这个例子  →',size=13.5,color=GREEN)
    b.label(1023,3227,'02 / CAREER & DECISIONS','02 / 职业与选择')
    b.txt(1021,3270,'See what changed.','看见变化。',size=36,serif=True,width=315)
    b.txt(1023,3341,CASES[1]['short'][0],CASES[1]['short'][1],size=16,width=307,color=BODY)
    b.label(549,3496,'03 / RESEARCH & LEARNING','03 / 研究与学习')
    b.txt(547,3537,'Keep your questions.','留下你的问题。',size=38,serif=True)
    b.txt(550,3610,CASES[2]['short'][0],CASES[2]['short'][1],size=16,width=467,color=BODY)
    b.rect(0,3840,1440,643,PALE)
    b.label(76,3896,'04 / A WORKING ARCHIVE','04 / 一份可继续工作的档案')
    b.txt(382,3945,'Your words.\nIn a form you can work with.','你的原话，\n也能继续修改、继续使用。',size=57,serif=True,lh=61)
    comps=[('THE ORIGINAL','原始记录','What you actually sent.','你当时真正发送的内容。','Kept as a traceable source, not silently rewritten.','作为可核对的来源保留，不被悄悄改写。'),('YOUR WORKING VERSION','你的工作版本','What you want to keep now.','你现在想保留的表达。','Readable, editable and clearly different from the past.','可以阅读、编辑，也明确区别于过去。'),('YOUR NEXT CONTEXT','下一次的上下文','What you choose to carry.','你选择带走的内容。','Selected words, reviewed for the task in front of you.','围绕眼前的任务，审阅并选择有关的原话。')]
    for i,(a,za,c,zc,d,zd) in enumerate(comps):
        x=76+i*439;b.label(x,4180,a,za);b.txt(x,4225,c,zc,size=28,serif=True,width=365);b.txt(x,4290,d,zd,size=15,width=325,color=BODY)
        if i<2:b.line(x+390,4180,x+390,4370,'#d5d9d0')
    b.label(76,4627,'05 / YOUR WORDS, YOUR CONTROL','05 / 原话与你的决定')
    b.photo('light',126,4712,390,412,arch=True)
    b.card(339,4910,335,218,'Selected context','Only the material you deliberately choose belongs in the next step.','已选择的上下文','只有你明确选中的材料，才进入这一次复用。')
    b.txt(866,4705,'Keep the original.\nChoose what travels.','保留原话。\n决定什么被带走。',size=49,serif=True,lh=55)
    b.txt(869,4864,'Local-first is the starting point. Reading, editing and local search do not need your archive to become someone else’s database.','本地优先是起点。阅读、编辑和本地搜索，不需要先把档案变成别人的数据库。',size=16.5,width=433,color=BODY)
    b.txt(869,4976,'Optional external AI is a separate, explicit choice. Copies you send elsewhere cannot be recalled by PAIA.','外部 AI 处理需要单独、明确的操作。已经发送到外部的副本，PAIA 无法收回。',size=15,width=422,color=BODY)
    b.txt(869,5082,'Read the practical boundaries  →','了解具体的数据边界  →',size=13.5,color=GREEN)
    b.line(76,5280,1368,5280);b.label(76,5326,'A FEW THINGS WORTH KNOWING','一些值得了解的事')
    b.txt(76,5381,'Good questions.\nClear answers.','好的问题，\n清楚地回答。',size=49,serif=True,lh=55)
    for i,(q,zq,a,za) in enumerate(FAQ[:5]):
        yy=5330+i*83;b.line(650,yy,1368,yy);b.txt(650,yy+27,q,zq,size=16,width=650);b.txt(1349,yy+23,'+',size=22,color=MUTED)
    b.txt(650,5770,'All questions  →','查看全部问题  →',size=13.5,color=GREEN)
    b.txt(76,5860,'Your thinking has\na longer tomorrow.','让你的思考，\n拥有更长的明天。',size=62,serif=True,lh=66)
    b.txt(76,6020,'Start with the words you already have.','从你已经说过的话开始。',size=17,color=BODY);b.button(76,6073)
    b.photo('coast',1041,5840,252,293,-3)
    b.rect(873,5990,290,121,'#fcfcf8',LINE,3,'source-shadow',rotate=2)
    b.txt(909,6017,'Pick up where\nyour thinking left off.','从思考停下的地方，\n接着往前。',size=27,serif=True,italic=True,lh=29)
    footer(b,6190);b.save()

STEPS=[('Capture','留下','Start with what you already say to AI.','从你已经对 AI 说过的话开始。'),('Revisit','回看','Find the words, the source and the thread.','找回原话、来源与思考的脉络。'),('Understand','理解','Read, edit or organize. AI is optional.','阅读、编辑或整理，AI 只是可选的增强。'),('Reuse','复用','Choose the useful parts for what comes next.','选出有用的部分，带到下一步。')]
CASES=[
{'id':'projects','label':('Ongoing projects','长期项目'),'title':('Pick up the thread.\nNot all the pieces.','接上原来的脉络，\n不必重新拼凑。'),'short':('Return to a project with the decisions, constraints and open questions you already worked through.','重回项目时，带上已经讨论过的决定、约束和未解的问题。'),'question':('What did we decide — and why?','当时决定了什么，为什么？'),'before':('Three conversations, one product idea. The early problem statement is in one window; the scope decision is in another.','一个产品想法，分散在三个对话里。最初的问题在一个窗口，范围的取舍在另一个。'),'after':('Revisit the relevant words, update the working brief and carry only the current constraints into your next session.','回看相关原话，更新工作简报，只把当前约束带进下一次对话。')},
{'id':'career','label':('Career & decisions','职业与选择'),'title':('See what changed.\nKeep what matters.','看见变化，\n留下真正重要的事。'),'short':('Look back at the trade-offs you have described, without treating every question as a permanent belief.','回看你曾描述的取舍，不把每一个问题都当成不变的信念。'),'question':('What do I want from the next step?','下一步，我真正想要什么？'),'before':('A job description, an uncertain question and a personal preference can look similar inside a chat history. They are not the same evidence.','岗位描述、尚未确定的问题和个人偏好，在聊天历史里可能看起来相似，但它们并不是同一种证据。'),'after':('Keep their origins visible. Compare the words you wrote at different times and choose what still describes your situation.','保留它们的来源。比较不同时候的表达，选出仍然符合当前处境的内容。')},
{'id':'research','label':('Research & learning','研究与学习'),'title':('The answer moves on.\nYour questions can, too.','答案会向前，\n你的问题也可以。'),'short':('Recover the question behind a useful explanation, then continue from a clearer starting point.','找回一段有用解释背后的问题，从更清晰的起点继续。'),'question':('What was I trying to understand?','我当时究竟想理解什么？'),'before':('A promising hypothesis gets refined over several sessions. A copied quotation is useful, but it is not automatically your own position.','一个有价值的假设，在几次对话中逐步清晰。引用的材料可能有用，但不会自动成为你的立场。'),'after':('Revisit the actual question, edit your working notes and select the relevant material for the next explanation or investigation.','回看实际的问题，编辑工作笔记，再为下一次解释或研究选择有关材料。')}
]
FAQ=[
('What does PAIA keep?','PAIA 保存什么？','PAIA focuses on your own submitted inputs and the provenance needed to revisit them. It is not a promise to copy every assistant reply or every file.','PAIA 主要保存你已发送的输入，以及回看所需的来源信息；这并不意味着复制全部 AI 回复或所有文件。'),
('Do I need to organize everything?','我需要把所有内容都整理好吗？','No. Reading, finding, editing and copying useful words should already be valuable. Topics and optional AI organization are ways to go further, not admission requirements.','不需要。阅读、找回、编辑和复制有用的话，本身就应该有价值。主题与可选的 AI 整理是增强能力，不是使用前提。'),
('Does everything get sent to AI?','全部档案都会被发送给 AI 吗？','No. Ordinary archive use is local-first. Optional external AI processing and context reuse are separate, explicit actions with their own boundaries.','不会。普通档案使用以本地为先。外部 AI 处理和上下文复用是分别授权、明确触发的操作。'),
('Which platforms can I use today?','现在可以在哪些平台上使用？','The current invitation-only beta is a Chrome extension with consented ChatGPT input capture. Other providers, mobile apps and an external AI-reader connector are not promised as available installations.','当前邀请制内测为 Chrome 扩展，可在同意后捕获 ChatGPT 输入。其他平台、移动应用和外部 AI 读取连接器，不作为现在已可安装的能力承诺。'),
('Why use this alongside chat history?','有了聊天历史，为什么还需要它？','PAIA is a separate working layer for your own words: revisit, edit, trace the original and select what to reuse. It can help even when you use only one AI product.','PAIA 为你自己的话提供一个独立的工作层：回看、编辑、核对原话，再选择复用哪些内容。只使用一个 AI 产品，也可能有这样的需要。'),
('Can I change the wording?','我可以修改文字吗？','You can work with an editable version without making today’s changes look like yesterday’s original expression. The original and the working version have different roles.','可以编辑工作版本，而不让今天的修改冒充昨天的原始表达。原始记录和工作版本承担不同职责。'),
('Is this a backup of my entire AI account?','这是整个 AI 账号的备份吗？','No. Capture, supported history import and PAIA backup have different scopes. The beta does not promise complete recovery of an external AI account.','不是。捕获、受支持的历史导入和 PAIA 备份各有范围；内测产品不承诺完整恢复外部 AI 账号。'),
('Does local-first mean no network traffic?','本地优先意味着完全不联网吗？','No. The website is hosted online, the beta application uses a disclosed forwarding service, and optional external AI has a separate network boundary. Local-first is not an encryption certification.','不意味着。官网需要在线托管，申请内测使用已说明的转发服务，外部 AI 也有独立的联网边界。本地优先并不是加密认证。'),
('Is a copied passage one of my beliefs?','我复制发送的文字，就是我的观点吗？','Not necessarily. It might be a quotation, a job description, a draft, a question or a role-play. PAIA should preserve that distinction instead of inventing a personal profile.','不一定。它可能是引用、岗位描述、草稿、问题或角色扮演。PAIA 应保留这种区别，而不是据此编造个人画像。'),
('Can PAIA recall something I sent elsewhere?','发给外部的内容，还能收回吗？','No. PAIA can stop future access that it controls, but cannot recall a copy you have already sent to another system or exported.','不能。PAIA 可以停止由它控制的后续提供，但不能收回已经发送到外部系统或导出的副本。'),
('Is the website example my actual archive?','官网示例展示的是我的真实档案吗？','No. It uses fictional material. It does not connect to your archive or run a live AI model. Refreshing clears temporary example changes.','不是。示例使用虚构材料，不连接你的档案，也不调用实时 AI 模型。刷新会清除临时修改。'),
('How do I get access?','怎样获得使用资格？','Apply for the invitation-only private beta. Submitting a form is not an installation, admission decision or verified email-delivery receipt.','申请邀请制内测。提交表单不代表已安装、已被录取，也不代表已核验邮件送达。')]

ARTICLES=[
{'id':'context','title':('A conversation is a moment.\nContext is a practice.','对话是一个时刻，\n语境是一种持续的工作。'),'dek':('Why keeping your words is only the beginning.','为什么留下原话，只是开始。'),'paras':[
('A useful conversation can still be difficult to return to. You remember that something became clearer, but not the exact wording, the constraint you added halfway through, or which of several windows held the decision. The conversation happened. The continuity did not arrive automatically.','一次有用的对话，仍然可能很难重新接上。你记得某件事变清楚了，却不记得准确的说法、中途补充的约束，或到底在哪个窗口做了决定。对话确实发生过，连贯却没有自动到来。'),
('That gap is where we place PAIA. Not in front of every conversation, asking you to prepare a perfect brief. Not above your words, deciding who you are. Beside them: a working place to find an earlier expression, see where it came from and decide whether it still belongs in the next step.','PAIA 想填补的，是这段空隙。它不在每次对话前要求你准备完美的简报，也不凌驾于你的表达之上，替你决定你是谁。它在原话旁边，提供一个工作空间：找回曾经的表达，看清来源，再决定它是否适合下一步。'),
('Keeping everything is not the same as using something well. A long archive may contain questions you no longer have, quotations you never agreed with, and plans that were deliberately abandoned. Bringing all of it into a new task can obscure the very context you were trying to recover.','保存一切，不等于善用某一部分。长期档案里可能有已经不再困扰你的问题、你从未认同的引文，以及被主动放弃的计划。把它们全部带进新任务，反而可能淹没你真正想找回的语境。'),
('Selection matters. So does the ability to revise. You may want the original record to remain intact while making today’s working explanation shorter and clearer. These are compatible needs when the source and the working version do not pretend to be the same thing.','选择很重要，修改的能力也同样重要。你可能希望原始记录保持完整，同时让今天的工作说明更短、更清楚。只要来源和工作版本不冒充彼此，这两种需要就并不矛盾。'),
('In this model, context is not a secret profile that a system accumulates about you. It is material you can inspect and deliberately bring to a particular question. The useful amount may be three sentences rather than three years. The relevant version may be the one you edited this morning.','在这样的理解里，上下文不是系统暗中积累的个人画像，而是你可以查看，并有意带到某个具体问题里的材料。真正有用的可能是三句话，而不是三年的记录；真正相关的可能是你今天早上修改过的版本。'),
('PAIA starts with expressions you already produce in AI conversations. Its ambition is continuity without a maintenance habit: less reconstruction, more room to continue. Capture, revisit, understand, reuse. Not a compulsory sequence, but a set of ways to make past thinking available when it becomes useful again.','PAIA 从你已经在 AI 对话中产生的表达开始。它希望带来不依赖维护习惯的连贯：少一点重建，多一点继续。留下、回看、理解、复用，不是一条必须走完的流程，而是在过去的思考再次有用时，让它可以被找到。')
]},
{'id':'beliefs','title':('Your words aren’t always\nyour beliefs.','你发送的文字，\n不总是你的信念。'),'dek':('A careful archive needs more than a user label.','一份谨慎的档案，不能只看发送者标签。'),'paras':[
('Imagine sending an AI a job description and asking whether the role is a good fit. The words are in your message. The employer’s requirements are not suddenly your ambitions. A system that preserves the message has recorded a fact. A system that turns every line into your preference has made a different, unsupported move.','设想你把岗位描述发给 AI，请它判断是否适合自己。那些文字出现在你的消息里，但雇主的要求不会因此变成你的志向。保存消息，记录的是一个事实；把每句话都转成你的偏好，则是另一个缺乏依据的动作。'),
('The same problem appears with quotations, counterarguments, role-play, translation and drafts written for someone else. Even a sentence you wrote entirely yourself may be a hypothesis, not a conclusion. Its meaning depends on the question you were exploring.','引文、反方论证、角色扮演、翻译和为别人写的草稿，都存在同样的问题。即使一句话完全由你自己写成，它也可能是假设，而不是结论。它的意义取决于当时正在探索的问题。'),
('This is why PAIA treats an original expression and an interpretation of that expression as different things. The source can tell you what was sent. A topic can help bring related material together. An AI-organized presentation may make it easier to read. None of these should silently become a new personal truth.','因此，PAIA 区分原始表达与对表达的解释。来源可以告诉你当时发了什么，主题可以帮助聚合相关材料，AI 整理后的呈现也许更方便阅读。但它们都不应悄悄成为新的个人真值。'),
('Good organization leaves room for uncertainty. It should allow you to inspect evidence, correct wording and exclude something without having to fight a confident story about yourself. A note that says “I am considering this” should not become “I have decided this.”','好的整理应该给不确定性留下位置。你应当能查看证据、修改文字、排除某条内容，而不必对抗一个信心十足的个人叙事。“我正在考虑”不应该被改写成“我已经决定”。'),
('This distinction becomes especially important when material is reused. Context for a new task needs relevance, but it also needs the right role for each passage. A quotation remains a quotation. An earlier plan can be identified as an earlier plan. A current preference can be selected because you have deliberately confirmed it.','当材料被再次使用时，这个区别尤其重要。新任务的上下文既需要相关性，也需要每段文字保持正确的角色。引用仍然是引用，旧计划可以被标明是旧计划，当前偏好则可以因为你明确确认而被选中。'),
('The aim is not to make your archive timid. It is to make it trustworthy enough to work with: useful structure, visible origins and the last word left with you.','目的不是让档案畏首畏尾，而是让它值得信任、可以继续使用：结构有用，来源可见，而最后的判断仍然属于你。')
]},
{'id':'edits','title':('Keep the original.\nKeep thinking.','保留原话，\n也继续思考。'),'dek':('A record of the past does not have to freeze the present.','记录过去，并不意味着把现在凝固。'),'paras':[
('You may recognize an old idea and immediately want to improve the wording. A sentence was too long. A constraint is no longer relevant. A rough question deserves a clearer shape. Making the archive useful means allowing this kind of work, not treating every saved word as untouchable.','你可能刚认出一个旧想法，就想改进它的表达：句子太长，某个约束已经不再适用，粗略的问题值得写得更清楚。让档案有用，就要允许这样的工作，而不是把每个保存下来的字都视为不可触碰。'),
('At the same time, the past should not be silently rewritten. If you compare how your thinking changed, today’s polished version cannot stand in for what you actually wrote last month. A working archive has to meet both needs.','与此同时，过去不应该被悄悄改写。在比较思考如何变化时，今天润色过的版本不能冒充上个月真正写下的内容。一份工作档案，必须同时满足这两种需要。'),
('PAIA distinguishes the original source from the editable working version. The source provides a way back to what happened. The working version gives you a place to make the material readable and useful now. Neither needs to pretend to be the other.','PAIA 区分原始来源和可编辑的工作版本。来源提供回到当时事实的路径，工作版本则让你把材料整理成现在可读、可用的样子。它们无需冒充彼此。'),
('Optional AI assistance adds another layer, not another owner. A clearer presentation can be helpful, but it must remain distinguishable from source material and human edits. An automatic update should not quietly discard the work you have already done.','可选的 AI 辅助增加的是一个层次，而不是另一个主人。更清晰的呈现可能有帮助，但它必须区别于来源材料和人工修改。自动更新不应该悄悄丢掉你已经完成的工作。'),
('When it is time to reuse something, the useful version depends on the task. You may need the original quotation, a current working summary or a few selected passages. Previewing the material is part of the choice, not an obstacle to getting it out of the archive.','到了复用的时候，哪个版本有用，取决于具体任务。你可能需要原始引文、当前的工作总结，或几段选中的材料。预览内容是选择的一部分，而不是把它从档案取出的障碍。'),
('Continuity does not mean never changing your mind. It means having a readable relationship between what you said then, what you think now and what you choose to do next.','连贯，不意味着永远不改变主意。它意味着：当时说过的话、此刻的想法、以及下一步的选择之间，存在一条可以看懂的联系。')
]}
]

# Secondary pages are individually composed folios, not a common card-grid shell.
def intro(b,m,kicker,title,dek,photo='light',active=''):
    header(b,m,active)
    x=24 if m else 76;w=342 if m else 714
    b.label(x,112 if m else 148,*kicker)
    hh=b.txt(x,159 if m else 214,*title,size=44 if m else 67,serif=True,lh=49 if m else 70,width=w)
    dy=(159 if m else 214)+hh+30
    dh=b.txt(x,dy,*dek,size=16 if m else 19,width=335 if m else 532,color=BODY)
    if not m:
        b.photo(photo,1032,150,258,355,-3,arch=photo=='light');b.label(946,536,'A LONGER\nTOMORROW.','更长的\n明天。')
    return dy+dh+70

def close(b,y,m=False):
    x=24 if m else 76;b.line(x,y,b.w-x,y)
    b.txt(x,y+48,'Take the next step\nwith a little more context.','带上更多语境，\n迈出下一步。',size=38 if m else 48,serif=True,lh=43 if m else 53,width=330 if m else 800)
    b.button(x,y+(172 if m else 183));footer(b,y+(302 if m else 300),m)
    b.h=y+(992 if m else 610);b.nodes[0]['height']=b.h;b.parts[0]=re.sub(r'height="[0-9]+"',f'height="{b.h}"',b.parts[0])

def folio_chapter(b,y,num,title,body,photo,m=False,reverse=False):
    if m:
        b.label(24,y,num);th=b.txt(24,y+42,*title,size=36,serif=True,width=337,lh=42)
        hh=b.txt(24,y+68+th,*body,size=16,width=331,color=BODY)
        py=y+103+th+hh;b.photo(photo,24 if not reverse else 79,py,287,250,-2 if not reverse else 2)
        return py+327
    x=76 if not reverse else 788;px=860 if not reverse else 120
    b.label(x,y+18,num);hh=b.txt(x,y+63,*title,size=47,serif=True,width=556,lh=52)
    b.txt(x,y+93+hh,*body,size=17,width=492,color=BODY)
    b.photo(photo,px,y,353,401,2 if reverse else -2)
    b.curve(f'M{px+32} {y+430}C{px+190} {y+474} {px+279} {y+397} {px+334} {y+465}')
    return y+532

def how(m=False):
    b=Board(f'how-it-works-{LANG}-'+('390' if m else '1440'),390 if m else 1440,4000)
    yy=intro(b,m,('HOW IT WORKS','使用方式'),('Your words,\nfrom then to next.','你的原话，\n从当时到下一步。'),('Four ways to continue. No daily organizing ritual required.','四种继续向前的方式，不需要每天维护一套整理习惯。'),'coast','How it works')
    if not m:yy=699
    bodies=[('After you consent, supported ChatGPT inputs can enter your local archive. Capture is not permission for external AI processing, and it is not a promise to copy your entire account.','在你同意后，受支持的 ChatGPT 输入可以进入本地档案。允许捕获，不等于授权外部 AI 处理，也不代表复制整个账号。'),('Return to an expression through reading or search. Keep enough source context to understand why the words were there. You can work with the text without losing the distinction from its original.','通过阅读或搜索回到一段表达。保留足够的来源语境，理解这些话为什么出现在那里。你可以编辑文字，同时保持它与原话的区别。'),('Bring useful expressions together in a topic. Read them as they are, or explicitly request optional AI organization. A new presentation is not a new personal truth, and your edits remain yours.','把有用的表达放进主题。直接阅读原文，或明确请求可选的 AI 整理。新的呈现不等于新的个人真值，你的修改仍由你掌握。'),('Select material for the question in front of you. Review what is included, then copy or export it. Changing the selection should invalidate an old preview rather than quietly reuse stale context.','为眼前的问题选择材料。审阅包含的内容，再复制或导出。改变选择后，旧预览应当失效，而不是悄悄复用过时的上下文。')]
    for i,(title,zt,_,_) in enumerate(STEPS):yy=folio_chapter(b,yy,f'0{i+1} / {title.upper()}',(title,zt),bodies[i],['architecture','light','coast','light'][i],m,i%2==1)
    close(b,yy+25,m);b.save()

def cases(m=False):
    b=Board(f'use-cases-{LANG}-'+('390' if m else '1440'),390 if m else 1440,4000)
    yy=intro(b,m,('USE CASES','使用场景'),('For the work\nthat continues.','为那些持续\n向前的工作。'),('Projects, decisions and questions rarely fit inside a single conversation.','项目、选择和问题，很少能装进一次对话。'),'architecture','Use cases')
    yy=max(yy,694) if not m else yy
    for i,c in enumerate(CASES):
        yy=folio_chapter(b,yy,f'0{i+1} / '+c['label'][0].upper(),c['title'],c['short'],['architecture','coast','light'][i],m,i%2==1)
    close(b,yy,m);b.save()

def case_detail(c,m=False):
    b=Board(f'case-{c["id"]}-{LANG}-'+('390' if m else '1440'),390 if m else 1440,3400)
    yy=intro(b,m,tuple(t.upper() if i==0 else t for i,t in enumerate(c['label'])),c['title'],c['short'],['architecture','coast','light'][CASES.index(c)],'Use cases')
    yy=max(yy,730) if not m else yy
    yy=folio_chapter(b,yy,'01 / THE QUESTION',c['question'],c['before'],'light',m)
    yy=folio_chapter(b,yy,'02 / A MORE USEFUL START',('Bring what still matters.','带上仍然重要的部分。'),c['after'],'coast',m,True)
    x=24 if m else 76;b.label(x,yy,'ILLUSTRATIVE SCENARIO','虚构场景示例');b.txt(x,yy+45,'No automatic profile. No made-up certainty.\nThe next context remains your choice.','不自动生成个人画像，也不编造确定性。\n下一次的上下文，仍由你选择。',size=34 if m else 45,serif=True,width=331 if m else 1090,lh=41 if m else 53)
    close(b,yy+270,m);b.save()

def story(m=False):
    b=Board(f'our-story-{LANG}-'+('390' if m else '1440'),390 if m else 1440,3900)
    yy=intro(b,m,('OUR STORY','我们的故事'),('A longer life\nfor your thinking.','让你的思考，\n拥有更长的生命。'),('PAIA begins with a simple gap: we say more to AI, but it can still be difficult to return to our own words.','PAIA 从一个简单的落差开始：我们对 AI 说得越来越多，却仍然很难重新回到自己的表达。'),'coast','Our story')
    yy=max(yy,753) if not m else yy
    chapters=[(('Not more to maintain.\nMore to continue.','不是更多维护，\n而是更好地继续。'),('We are building a personal input, thought and context system around expressions you already produce. The archive should be useful before you have organized a single topic.','我们围绕你已经产生的表达，构建个人输入、思想与上下文系统。在你还没有整理任何主题之前，档案就应该有用。')),(('Yours, before it is\nuseful to anyone else.','先属于你，\n再对其他系统有用。'),('Readable for a person and useful to an AI are not competing goals. A source you can inspect, a working version you can edit and a selection you can control are the foundations of both.','为人可读与为 AI 可用，并不互相排斥。可核对的来源、可编辑的工作版本和可控制的选择，是两者共同的基础。')),(('An intention,\nnot an inflated promise.','一个方向，\n不是夸大的承诺。'),('PAIA is independently developed and in private beta. Some ambitions are further away than the current build. We separate what is available, what remains under development and what still needs real-world evidence.','PAIA 由独立开发者构建，目前处于内测阶段。某些愿景仍然比当前版本走得更远。我们区分已经可用、仍在开发，以及还需要真实使用证据的部分。'))]
    for i,(title,body) in enumerate(chapters):yy=folio_chapter(b,yy,f'0{i+1} / A DESIGN PRINCIPLE',title,body,['architecture','light','coast'][i],m,i%2==1)
    close(b,yy,m);b.save()

def journal(m=False):
    b=Board(f'journal-{LANG}-'+('390' if m else '1440'),390 if m else 1440,3300)
    header(b,m,'Journal');x=24 if m else 76;b.label(x,119 if m else 152,'PAIA / FIELD NOTES','PAIA / 手记')
    b.txt(x,175 if m else 207,'Thinking,\ncontinued.','思考，\n继续。',size=57 if m else 102,serif=True,lh=60 if m else 99)
    b.txt(x,332 if m else 449,'On expression, context and the things worth keeping.','关于表达、语境，以及值得留下的事。',size=16 if m else 19,width=334 if m else 688,color=BODY)
    if m:
        yy=450
        for i,a in enumerate(ARTICLES):
            b.photo(['coast','light','architecture'][i],24 if i%2==0 else 75,yy,291,226,-2 if i%2==0 else 1)
            b.label(24,yy+263,f'NOTE 0{i+1} / PERSPECTIVE','手记 / 观点')
            hh=b.txt(24,yy+303,*a['title'],size=34,serif=True,width=336,lh=39);b.txt(24,yy+327+hh,*a['dek'],size=15,width=329,color=BODY);yy+=hh+442
    else:
        b.photo('coast',77,610,632,521,-2)
        b.label(807,640,'NOTE 01 / PERSPECTIVE','手记 01 / 观点')
        b.txt(804,703,*ARTICLES[0]['title'],size=45,serif=True,width=507,lh=52)
        b.txt(807,919,*ARTICLES[0]['dek'],size=18,width=443,color=BODY);b.txt(807,1007,'Read the essay  →','阅读文章  →',size=14,color=GREEN)
        for i,a in enumerate(ARTICLES[1:]):
            yy=1288+i*240;b.line(76,yy,1368,yy);b.label(76,yy+47,f'NOTE 0{i+2}','手记')
            b.txt(287,yy+43,*a['title'],size=36,serif=True,width=709,lh=41);b.photo(['light','architecture'][i],1162,yy+31,162,160,1 if i else -2)
        yy=1810
    close(b,yy+65,m);b.save()

def article(a,m=False):
    b=Board(f'article-{a["id"]}-{LANG}-'+('390' if m else '1440'),390 if m else 1440,4300)
    header(b,m,'Journal');x=24 if m else 287;b.label(x,121 if m else 157,'PAIA / FIELD NOTES / PERSPECTIVE','PAIA / 手记 / 观点')
    hh=b.txt(x,172 if m else 220,*a['title'],size=43 if m else 64,serif=True,width=337 if m else 905,lh=48 if m else 69)
    yy=(172 if m else 220)+hh+34;b.txt(x,yy,*a['dek'],size=18 if m else 22,width=334 if m else 784,color=BODY)
    b.txt(x,yy+74,'PAIA · Editorial draft for publication review','PAIA · 待审阅的文章草稿',size=11,color=MUTED)
    py=yy+130;b.photo(['coast','light','architecture'][ARTICLES.index(a)],x,py,342 if m else 866,235 if m else 389,-.6)
    yy=py+(294 if m else 462)
    if not m:b.label(76,yy,'A NOTE ON\nCONTINUITY.','关于\n连贯的一则手记。')
    for i,(en,zh) in enumerate(a['paras']):
        hh=b.txt(x,yy,en,zh,size=17 if m else 19,width=336 if m else 690,lh=29 if m else 32,color='#37433b');yy+=hh+31
        if i==2:
            b.line(x,yy+20,x+80,yy+20,'#a0a99e');hh=b.txt(x,yy+62,'The useful amount may be\nthree sentences, not three years.','真正有用的，\n可能是三句话，而不是三年。',size=35 if m else 43,serif=True,italic=True,width=337 if m else 701,lh=43 if m else 51);yy+=hh+136
    b.txt(x,yy+26,'A product perspective, not a claim of released capability.','这是产品观点，不代表相关能力均已发布。',size=11,width=335 if m else 740,color=MUTED)
    close(b,yy+127,m);b.save()

def principles(m=False):
    b=Board(f'your-data-{LANG}-'+('390' if m else '1440'),390 if m else 1440,4300)
    yy=intro(b,m,('YOUR WORDS / YOUR CONTROL','你的原话 / 你的决定'),('Yours, before\nanything else.','首先，\n属于你。'),('Useful context starts with a source you can inspect and a choice you can understand.','有用的上下文，始于可以核对的来源与可以理解的选择。'),'light')
    yy=max(yy,721) if not m else yy
    blocks=[(('The original is not\na working draft.','原始记录，\n不是工作草稿。'),('Original records, working edits and AI-produced presentations have distinct roles. Editing the working text does not make the new wording a historical original.','原始记录、工作修改和 AI 生成的呈现承担不同职责。编辑工作文字，不会让新文字变成历史原话。')),(('Saving is not\nsending.','保存，\n不等于发送。'),('Capture, optional AI processing and reuse are separate choices. The whole archive is not sent to a model simply because it exists.','捕获、可选的 AI 处理和复用，是分别作出的选择。档案不会仅仅因为存在，就被全部发送给模型。')),(('Local-first.\nNot a magic shield.','本地优先，\n不是万能护盾。'),('Local storage does not replace your device security or your own backup decisions. The website, the beta form and optional AI calls each have stated network boundaries.','本地存储不能替代设备安全和备份决策。官网、内测申请表和可选的 AI 调用，各自有明确的联网边界。')),(('A clear way out.','清楚地带走。'),('Review the material before you copy or export it. PAIA cannot recall external copies. Data deletion, reading visibility and AI authorization are different actions, not interchangeable toggles.','在复制或导出之前审阅材料。PAIA 无法收回外部副本。删除数据、调整阅读可见性和授权 AI，是不同的操作，不是可以互相替代的开关。'))]
    for i,(title,body) in enumerate(blocks):yy=folio_chapter(b,yy,f'0{i+1} / A PRACTICAL BOUNDARY',title,body,['architecture','coast','light','architecture'][i],m,i%2==1)
    close(b,yy,m);b.save()

def faq_page(m=False):
    b=Board(f'faq-{LANG}-'+('390' if m else '1440'),390 if m else 1440,4400)
    yy=intro(b,m,('QUESTIONS / ANSWERS','问题 / 回答'),('A few things\nworth knowing.','一些\n值得了解的事。'),('What PAIA keeps, what you control, and what the beta does not promise.','PAIA 保存什么、你可以控制什么，以及内测阶段不作哪些承诺。'),'architecture')
    yy=max(yy,705) if not m else yy;x=24 if m else 584;ww=336 if m else 733
    if not m:
        b.label(76,yy,'IN THIS PAGE','本页内容')
        for i,(a,z) in enumerate([('Capture & history','捕获与历史'),('Working with words','使用你的原话'),('Privacy & control','隐私与控制'),('Access & status','使用资格与状态')]):b.txt(76,yy+45+i*41,a,z,size=15,color=BODY)
    for q,zq,a,za in FAQ:
        b.line(x,yy,b.w-(24 if m else 76),yy);hh=b.txt(x,yy+27,q,zq,size=25 if m else 29,serif=True,width=ww,lh=33 if m else 36)
        hh2=b.txt(x,yy+54+hh,a,za,size=15 if m else 17,width=ww-8,color=BODY);yy+=hh+hh2+101
    footer(b,yy+30,m);b.h=yy+(730 if m else 353);b.nodes[0]['height']=b.h;b.parts[0]=re.sub(r'height="[0-9]+"',f'height="{b.h}"',b.parts[0]);b.save()

def beta(m=False):
    b=Board(f'beta-{LANG}-'+('390' if m else '1440'),390 if m else 1440,2020 if m else 1600);header(b,m)
    x=24 if m else 76;b.label(x,119 if m else 159,'PRIVATE BETA / AN INVITATION','内测 / 一份邀请')
    hh=b.txt(x,171 if m else 219,'A little more continuity.\nA place to begin.','多一点连贯，\n从这里开始。',size=42 if m else 59,serif=True,width=334 if m else 630,lh=47 if m else 63)
    yy=(171 if m else 219)+hh+35
    b.txt(x,yy,'PAIA is an invitation-only Chrome extension beta. Apply to help shape a more useful relationship with your own words.','PAIA 目前是邀请制 Chrome 扩展内测。申请参与，一起探索怎样更好地使用自己的表达。',size=16 if m else 18,width=334 if m else 529,color=BODY)
    if not m:
        b.photo('architecture',120,503,281,354,-3);b.card(328,676,281,172,'A longer tomorrow','Start with a real question you keep returning to.','更长的明天','从一个你不断回到的真实问题开始。')
    fx=24 if m else 837;fy=505 if m else 215;fw=342 if m else 455
    b.txt(fx,fy,'Request an invitation','申请内测邀请',size=32,serif=True);fy+=74
    for en,zh,placeholder,pzh,hh in [('Email *','邮箱 *','you@example.com','you@example.com',53),('What would you like to return to?','你最想重新接上的是什么？','An ongoing project, a question, a decision…','一个长期项目、一个问题、一次选择……',118)]:
        b.txt(fx,fy,en,zh,size=13.5,color=BODY);fy+=30;b.rect(fx,fy,fw,hh,PAPER,'#b8c0b6',3);b.txt(fx+16,fy+17,placeholder,pzh,size=14,width=fw-32,color=MUTED);fy+=hh+29
    b.txt(fx,fy,'The second field is optional. Do not include private archive text or sensitive information.','第二项为选填。请勿填写私人档案正文或敏感信息。',size=12,width=fw,color=MUTED);fy+=85
    b.rect(fx,fy+2,18,18,PAPER,'#8d978e',2)
    consent='I agree that FormSubmit forwards the information I enter to the PAIA project contact for beta recruitment and contact.'
    cz='我同意由 FormSubmit 将填写的信息转发给 PAIA 项目联系人，用于内测招募与联系。'
    hh=b.txt(fx+32,fy,consent,cz,size=12.5,width=fw-37,lh=20,color=BODY);fy+=hh+32
    b.button(fx,fy,'Request an invitation','申请内测邀请',w=233);fy+=82
    b.txt(fx,fy,'Submitting is not admission or a verified delivery receipt. Privacy policy  →','提交不代表获得资格，也不代表已经核验送达。隐私说明  →',size=11.5,width=fw,color=MUTED)
    b.txt(x,1270 if m else 951,'CURRENT SCOPE','当前范围',size=11,tracking=2,color=MUTED)
    b.txt(x,1310 if m else 994,'Chrome + consented ChatGPT input capture.\nNo mobile installation or universal-AI integration promised.','Chrome + 经同意捕获 ChatGPT 输入。\n不承诺移动端安装或接入全部 AI 平台。',size=15,width=334 if m else 1080,color=BODY)
    footer(b,1410 if m else 1210,m);b.h=2125 if m else 1530;b.nodes[0]['height']=b.h;b.parts[0]=re.sub(r'height="[0-9]+"',f'height="{b.h}"',b.parts[0]);b.save()

def status(m=False):
    b=Board(f'status-{LANG}-'+('390' if m else '1440'),390 if m else 1440,2500)
    yy=intro(b,m,('CURRENT STATUS / PRIVATE BETA','当前状态 / 内测阶段'),('An honest picture\nof where PAIA is.','清楚地看见，\nPAIA 现在走到了哪里。'),('A design intention, an implemented feature and a release are not the same thing.','设计意图、已经实现的功能和正式发布，不是同一件事。'),'architecture')
    yy=max(yy,720) if not m else yy
    rows=[('Invitation-only Chrome beta','邀请制 Chrome 内测','Current access model','当前使用方式'),('Consented ChatGPT input capture','经同意捕获 ChatGPT 输入','Current beta scope','当前内测范围'),('Readable, editable archive; local search','可阅读、编辑的档案与本地搜索','Integrated beta capability','已集成的内测能力'),('Topics and optional AI organization','主题与可选的 AI 整理','Evolving in active development','仍在持续开发与改进'),('Explicit context preparation, copy and export','明确选择上下文、复制与导出','Scoped beta capability','有明确边界的内测能力'),('Mobile apps, general sync, universal providers','移动应用、通用同步、全部 AI 平台','Not available as promised installations','不作为已可安装能力承诺'),('Signed public distribution and current-live coverage','签名公开分发与当前线上平台覆盖','Do not infer certification from this website','不能根据官网推断已通过认证')]
    for title,zt,st,zs in rows:
        x=24 if m else 76;b.line(x,yy,b.w-x,yy)
        hh=b.txt(x,yy+29,title,zt,size=24 if m else 28,serif=True,width=337 if m else 760)
        b.txt(x if m else 1010,yy+hh+46 if m else yy+37,st,zs,size=13,width=334 if m else 330,color=BODY);yy+=hh+120 if m else 113
    b.txt(24 if m else 76,yy+33,'This page is a capability summary, not a live uptime dashboard. Revalidate against the current release before publishing.','这是一页能力说明，不是实时运行状态面板。正式发布前，必须根据当前版本重新核实。',size=12,width=331 if m else 1040,color=MUTED)
    close(b,yy+171,m);b.save()

def demo(m=False):
    b=Board(f'example-{LANG}-'+('390' if m else '1440'),390 if m else 1440,2700)
    yy=intro(b,m,('AN EXAMPLE / NOT YOUR ARCHIVE','示例 / 并非你的档案'),('Choose the words.\nChange the starting point.','选择有关的原话，\n换一个起点。'),('Fictional material. No archive connection. No live AI. Changes live only in this page.','虚构材料，不连接档案，不调用实时 AI。修改仅存在于当前页面。'),'coast')
    yy=max(yy,730) if not m else yy
    if m:
        for i,(a,z) in enumerate([('My earlier question','我曾经的问题'),('A current constraint','当前的约束'),('A quotation — not my belief','引用，不是我的立场')]):
            b.card(24,yy,342,161,a,'Select this material for the current task.',z,'选择这条材料，用于眼前的任务。');b.rect(324,yy+22,18,18,PAPER,'#748171',2);yy+=191
        b.card(24,yy+32,342,224,'Selected context','A preview uses only the material you selected. Editing a source or changing the task makes an older preview stale.','选中的上下文','预览只使用已选择的材料。修改来源或改变任务后，旧预览失效。',big=True);yy+=324
    else:
        for i,(a,z) in enumerate([('My earlier question','我曾经的问题'),('A current constraint','当前的约束'),('A quotation — not my belief','引用，不是我的立场')]):
            b.card(76,yy+i*181,481,153,a,'Select this material for the current task.',z,'选择这条材料，用于眼前的任务。');b.rect(512,yy+i*181+22,18,18,PAPER,'#748171',2)
        b.curve(f'M585 {yy+182}C654 {yy+194} 648 {yy+285} 722 {yy+286}')
        b.card(747,yy+84,545,337,'Selected context','A preview uses only the material you selected. Editing a source or changing the task makes an older preview stale. Review first; then copy or export.','选中的上下文','预览只使用已选择的材料。修改来源或改变任务后，旧预览失效。先审阅，再复制或导出。',big=True);yy+=665
    x=24 if m else 76;b.txt(x,yy,'Nothing selected means nothing is added.','没有选择，就不会悄悄添加。',size=31 if m else 43,serif=True,width=333 if m else 1130)
    b.txt(x,yy+104,'This is the public demonstration surface, not a redesign of the extension. Its existing original/working distinction, safe text handling and explicit copy/export behavior must be retained.','这是官网演示区域，不是扩展内部界面的重新设计。原始记录与工作版本的区别、安全的文本处理，以及明确触发的复制与导出，必须保留。',size=15,width=333 if m else 995,color=BODY)
    close(b,yy+311,m);b.save()

class Extract(HTMLParser):
    def __init__(self):super().__init__();self.inmain=0;self.buf=[];self.skip=0
    def handle_starttag(self,tag,attrs):
        if tag=='main':self.inmain=1
        if tag in ['script','style']:self.skip+=1
        if self.inmain and tag in ['h1','h2','h3','p','li']:self.buf.append('\n')
    def handle_endtag(self,tag):
        if tag=='main':self.inmain=0
        if tag in ['script','style']:self.skip=max(0,self.skip-1)
        if self.inmain and tag in ['h1','h2','h3','p','li']:self.buf.append('\n')
    def handle_data(self,data):
        if self.inmain and not self.skip:self.buf.append(data)

def legal(kind,m=False):
    src=ROOT/'copy'/f'{kind}.baseline.en.txt';source=src.read_text() if src.exists() else 'Legal text must be transcribed verbatim from the pinned baseline. No new policy commitments.'
    zsrc=ROOT/'copy'/f'{kind}.baseline.zh.txt';zs=zsrc.read_text() if zsrc.exists() else source
    paras=[p.strip() for p in source.split('\n') if p.strip()];zparas=[p.strip() for p in zs.split('\n') if p.strip()]
    title=('Privacy policy','隐私政策') if kind=='privacy-policy' else ('Terms of use','使用条款')
    b=Board(f'{kind}-{LANG}-'+('390' if m else '1440'),390 if m else 1440,4000);header(b,m);x=24 if m else 504
    b.label(24 if m else 76,121 if m else 151,'PAIA / LEGAL','PAIA / 法律说明')
    b.txt(x,186 if m else 216,*title,size=48 if m else 66,serif=True,width=337 if m else 784)
    yy=313 if m else 384
    b.txt(x,yy,'Policy substance and dates retained from the existing public page.','保留现有公开页面的政策内容与日期。',size=12,width=332 if m else 691,color=MUTED);yy+=94
    if not m:
        b.label(76,yy,'ON THIS PAGE','本页内容');b.txt(76,yy+50,'Principles\nData use\nYour control\nContact','原则\n数据使用\n你的控制\n联系',size=15,lh=39,color=BODY)
    actual=zparas if LANG=='zh' else paras
    for p in actual:
        if p==title[0] or p==title[1]:continue
        heading=bool(re.match(r'^\d+[.、\s]',p)) and len(p)<100
        hh=b.txt(x,yy,p,size=27 if heading else 16,serif=heading,width=334 if m else 702,lh=36 if heading else 27,color=INK if heading else BODY);yy+=hh+(27 if heading else 28)
    footer(b,yy+70,m);b.h=yy+(770 if m else 402);b.nodes[0]['height']=b.h;b.parts[0]=re.sub(r'height="[0-9]+"',f'height="{b.h}"',b.parts[0]);b.save()

def small_page(kind,m=False):
    b=Board(f'{kind}-{LANG}-'+('390' if m else '1440'),390 if m else 1440,1560 if m else 1170);header(b,m)
    x=24 if m else 76
    if kind=='thanks':
        kicker=('AFTER YOUR REQUEST','提交之后');title=('A request is a beginning.','申请，是一个开始。');body=('The form service may have received your request. This page does not verify email delivery or confirm admission to the beta. You can contact the project if you need to check or correct your application.','表单服务可能已经收到请求，但此页面不核验邮件送达，也不确认你已获得内测资格。需要核实或修改申请时，可以联系项目方。')
    else:kicker=('404 / A THREAD NOT FOUND','404 / 没有找到这条脉络');title=('This page\nisn’t here.','这一页，\n不在这里。');body=('The address may have changed. Your next starting point is still here.','地址可能已经改变，但你仍然可以从这里重新开始。')
    b.label(x,150 if m else 219,*kicker);hh=b.txt(x,207 if m else 281,*title,size=48 if m else 79,serif=True,width=335 if m else 826,lh=53 if m else 85)
    yy=(207 if m else 281)+hh+42;hh=b.txt(x,yy,*body,size=16 if m else 18,width=333 if m else 622,color=BODY);b.button(x,yy+hh+40,'Back to PAIA','返回 PAIA',w=187)
    if not m:b.photo('light',1068,238,224,348,arch=True)
    footer(b,847 if m else 802,m);b.save()

def states(m=False):
    b=Board(f'interaction-states-{LANG}-'+('390' if m else '1440'),390 if m else 1440,3430 if m else 3030);x=24 if m else 76
    b.label(x,42,'PAIA / INTERACTION SPECIMENS','PAIA / 交互状态')
    b.txt(x,99,'The quiet details\nare part of the design.','安静的细节，\n也是设计的一部分。',size=43 if m else 65,serif=True,lh=48 if m else 69,width=342 if m else 1200)
    yy=277
    specimens=[('01 / REST, HOVER, KEYBOARD FOCUS','01 / 常态、悬停、键盘焦点'),('02 / NAVIGATION, OPEN','02 / 展开的导航'),('03 / FAQ, OPEN','03 / 展开的问答'),('04 / FORM, NEEDS ATTENTION','04 / 需要处理的表单'),('05 / NOTHING SELECTED','05 / 未选择材料'),('06 / CHANGED MATERIAL, STALE PREVIEW','06 / 材料改变，预览失效'),('07 / COPY NOT AVAILABLE','07 / 无法完成复制'),('08 / IMAGE FAILURE & REDUCED MOTION','08 / 图片加载失败与减少动态效果')]
    for i,(lab,zlab) in enumerate(specimens):
        b.label(x,yy,lab,zlab)
        if i==0:
            b.button(x,yy+49);b.rect(x-5,yy+44,218,66,'none','#536b54',33)
            b.txt(x,yy+142,'2 px focus ring, 4 px offset. Hover lifts 2 px; no geometry shift.','2 px 焦点环，4 px 间距。悬停上移 2 px，不改变布局。',size=13,width=334 if m else 1030,color=BODY)
        elif i==1:
            b.txt(x,yy+43,'Home    /    How it works    /    Use cases\nOur story    /    Journal    /    Your data','首页 / 使用方式 / 使用场景\n我们的故事 / 手记 / 你的数据',size=22 if m else 30,serif=True,width=333 if m else 1131,lh=39);b.txt(x,yy+154,'Escape closes; focus returns to the menu control. No off-screen links.','Esc 关闭，焦点回到菜单按钮；不保留屏幕外的可聚焦链接。',size=12,width=332 if m else 1130,color=BODY)
        elif i==2:
            b.txt(x,yy+43,FAQ[2][0],FAQ[2][1],size=27,serif=True,width=332 if m else 1100);b.txt(x,yy+95,FAQ[2][2],FAQ[2][3],size=14,width=332 if m else 940,color=BODY)
        elif i==3:
            b.rect(x,yy+47,334 if m else 470,54,PAPER,'#8c5748',3);b.txt(x+15,yy+64,'Please enter a valid email address.','请输入有效的邮箱地址。',size=14,color='#854d40');b.txt(x,yy+126,'Keep the text entered. Focus the error summary. Never auto-submit consent.','保留已输入内容，聚焦错误摘要，不自动勾选或提交同意项。',size=13,width=334 if m else 1050,color=BODY)
        else:
            data=[('Select material to prepare context.','选择材料后，才能准备上下文。','No automatic replacement. Preview and copy are unavailable.','不自动补入其他材料。预览和复制均不可用。'),('This preview is out of date.','这份预览已经过时。','Review the updated selection before copying. Keep the previous text visibly marked, not silently actionable.','复制前审阅更新后的选择；旧文本应明确标示失效，不能悄悄继续使用。'),('Copy was not completed.','未完成复制。','The text remains selectable. Offer manual copying without pretending success.','文字仍可选中。提供手动复制方式，不假装已经成功。'),('The composition remains.','构图仍然完整。','Use the pinned local fallback image, not a blank grid cell. Reduced motion shows the final composition immediately.','使用已固定的本地备用图，而非空白格子。减少动态效果时立即呈现最终构图。')][i-4]
            b.txt(x,yy+50,data[0],data[1],size=28 if m else 35,serif=True,width=333 if m else 1110,lh=37);b.txt(x,yy+133,data[2],data[3],size=13,width=333 if m else 1060,color=BODY)
        yy+=365 if m else 330;b.line(x,yy-25,b.w-x,yy-25)
    b.save()

def social():
    b=Board(f'social-{LANG}-1200x630',1200,630);b.txt(60,44,'PAIA',size=48,serif=True);b.label(60,130,'YOUR THINKING, CONTINUED.','你的思考，继续向前。');b.txt(60,213,'Turn what you’ve said\ninto what’s next.','让你说过的话，\n成为下一步的起点。',size=66,serif=True,lh=72,width=792);b.txt(60,423,'Your personal AI input, thought and context system.','你的个人 AI 输入、思想与上下文系统。',size=18,width=625,color=BODY);b.photo('light',926,106,214,384,arch=True);b.label(60,558,'INPUTARCHIVE.COM / PRIVATE BETA','INPUTARCHIVE.COM / 内测');b.save()


def credits(m=False):
    b=Board(f'credits-{LANG}-'+('390' if m else '1440'),390 if m else 1440,2500)
    yy=intro(b,m,('PHOTOGRAPHY / ACKNOWLEDGEMENTS','摄影 / 鸣谢'),('A sense of place.','一些真实的景物。'),('Photographs are part of the composition, not interchangeable decoration.','摄影是构图的一部分，不是可以任意替换的装饰。'),'light')
    yy=max(yy,723) if not m else yy
    for i,(name,info) in enumerate(PHOTOS.items()):
        x=24 if m else 76;b.photo(name,x,yy,210 if m else 253,220 if m else 237,-1 if i%2==0 else 1)
        tx=x if m else 496;ty=yy+261 if m else yy+25
        b.label(tx,ty,'PHOTOGRAPH / '+str(i+1),'摄影 / '+str(i+1))
        b.txt(tx,ty+41,info['author'],size=36,serif=True,width=332 if m else 630)
        b.txt(tx,ty+97,'From Unsplash · View original  →','来自 Unsplash · 查看原图  →',size=14,width=332 if m else 600,color=BODY)
        yy+=443 if m else 331
    b.txt(24 if m else 76,yy+12,'Images are used under the Unsplash License. The selected compositions use fixed crops and a muted grade. The original design reference is credited separately as an owner-provided reference, not as photography with a verified source.','图片按 Unsplash 许可使用，并采用固定裁切与低饱和度调色。原始设计参考另行标注为用户提供的参考，不冒称其摄影来源已核实。',size=14,width=332 if m else 1080,color=BODY)
    footer(b,yy+194,m);b.h=yy+(904 if m else 526);b.nodes[0]['height']=b.h;b.parts[0]=re.sub(r'height="[0-9]+"',f'height="{b.h}"',b.parts[0]);b.save()

def assets(fetch=False):
    for name,info in PHOTOS.items():
        f=ROOT/'assets'/f'{name}.jpg'
        if fetch:
            raw=urllib.request.urlopen(info['url'],timeout=60).read();im=Image.open(io.BytesIO(raw)).convert('RGB')
            im=ImageEnhance.Color(im).enhance(.28);im=ImageEnhance.Contrast(im).enhance(.88);im=ImageEnhance.Brightness(im).enhance(1.06)
            im=Image.blend(im,Image.new('RGB',im.size,'#e7e9dd'),.065);im.thumbnail((1600,2000));im.save(f,'JPEG',quality=91,optimize=True)
            fallback=im.copy();fallback.thumbnail((420,600));fallback.save(ROOT/'assets'/f'{name}-fallback.jpg','JPEG',quality=78,optimize=True)
            ASSET_RECORD[name]={**info,'license':'Unsplash License','license_url':'https://unsplash.com/license','verified_on':'2026-09-26','original_download_sha256':hashlib.sha256(raw).hexdigest(),'file':f'assets/{name}.jpg','sha256':hashlib.sha256(f.read_bytes()).hexdigest(),'size':im.size,'grade':{'saturation':.28,'contrast':.88,'brightness':1.06,'paper_overlay':'#e7e9dd','overlay_alpha':.065},'note':'Fixed replacement for the owner reference photographic category; not claimed to be the exact original photograph. Self-host in future implementation; do not hotlink.'}
    if fetch:
        for kind in ['privacy-policy','terms']:
            for locale in ['en','zh']:
                p=('zh/' if locale=='zh' else '')+kind+'.html'
                url=f'https://raw.githubusercontent.com/haohongfei2001-png/paia/{BASE}/{p}'
                raw=urllib.request.urlopen(url,timeout=40).read().decode();parser=Extract();parser.feed(raw);s='\n'.join(p.strip() for p in ''.join(parser.buf).split('\n') if p.strip())
                (ROOT/'copy'/f'{kind}.baseline.{locale}.txt').write_text(s)
                ASSET_RECORD[f'{kind}.{locale}']={'source':url,'source_sha256':hashlib.sha256(raw.encode()).hexdigest(),'text_sha256':hashlib.sha256(s.encode()).hexdigest(),'role':'existing policy text, unchanged substance; no new legal promises'}
    (ROOT/'assets'/'manifest.json').write_text(json.dumps(ASSET_RECORD,indent=2,ensure_ascii=False))

if __name__=='__main__':
    assets('--fetch' in sys.argv)
    for LANG in ['en','zh']:
        for m in [False,True]:
            home(m);how(m);cases(m)
            for c in CASES:case_detail(c,m)
            story(m);journal(m)
            for a in ARTICLES:article(a,m)
            principles(m);faq_page(m);beta(m);status(m);demo(m);credits(m)
            for kind in ['privacy-policy','terms']:legal(kind,m)
            for kind in ['thanks','404']:small_page(kind,m)
            states(m)
        social()
    (ROOT/'specs'/'frames.json').write_text(json.dumps(INDEX,ensure_ascii=False,indent=2))
    (ROOT/'specs'/'font-lock.json').write_text(json.dumps(FONT_RECORD,ensure_ascii=False,indent=2))
    for lang in ['en','zh']:(ROOT/'copy'/f'website.{lang}.json').write_text(json.dumps(COPY[lang],ensure_ascii=False,indent=2))
    (ROOT/'copy'/'articles.json').write_text(json.dumps(ARTICLES,ensure_ascii=False,indent=2))
    print(f'Authored {len(INDEX)} static SVG artboards; no website runtime changed.')

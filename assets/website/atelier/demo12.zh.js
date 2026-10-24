(() => {
  'use strict';
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const {themes, originals}={"themes": {"product": {"title": "做一个自己的产品", "chapters": [{"name": "为什么开始", "source": "product-idea"}, {"name": "第一步", "source": "product-first"}, {"name": "我的原则", "source": "product-principle"}]}, "writing": {"title": "写作与表达", "chapters": [{"name": "最初的打算", "source": "writing-start"}, {"name": "试过之后", "source": "writing-voice"}, {"name": "还想继续", "source": "writing-read"}]}, "travel": {"title": "下一次旅行", "chapters": [{"name": "先留一点空白", "source": "travel-space"}, {"name": "慢一点的选择", "source": "travel-slow"}, {"name": "不安排的下午", "source": "travel-afternoon"}]}}, "originals": [{"id": "product-idea", "theme": "product", "title": "一次灵感", "date": "09.04", "time": "22:14", "text": "我想做一个自己每天也会用的产品。每次跟 AI 聊完，里面有些话其实是我想了很久才说清楚的。以后再遇到相似的问题，不想从头开始。\n\n先从自己的真实需要出发，把一个小问题做得足够好。"}, {"id": "product-first", "theme": "product", "title": "产品的第一步", "date": "09.12", "time": "10:32", "text": "先解决一个真实发生的问题。第一步不是把功能做多，而是让一个人愿意再用一次。\n\n我最常做的，是找到之前说过的话，改一改，继续用。先把这几步连起来，其他的可以慢慢来。"}, {"id": "product-return", "theme": "product", "title": "重新打开时，接得上", "date": "09.18", "time": "21:06", "text": "今天试了第一版。做完第一步之后，我发现最需要的不是更多功能，而是重新打开它的时候，能很快接上上次的想法。\n\n留住当时的判断，应该比再写一遍完整的背景更有帮助。"}, {"id": "product-principle", "theme": "product", "title": "关于简单的一次取舍", "date": "09.20", "time": "18:40", "text": "少一点打扰，多一点真正有用。常用动作应该能直接发生，低频的整理放在需要时才打开的位置。\n\n我不是想让产品少做事情，而是不想让正在做事的人，一直被界面打断。"}, {"id": "writing-start", "theme": "writing", "title": "最初的打算", "date": "09.09", "time": "20:14", "text": "我想每周，写一篇完整的长文。"}, {"id": "writing-voice", "theme": "writing", "title": "试过之后", "date": "09.17", "time": "09:26", "text": "试了两次，还是想从一个具体的观察写起。"}, {"id": "writing-read", "theme": "writing", "title": "还想继续", "date": "09.25", "time": "22:10", "text": "先把观察留下来，暂时不急着提炼成观点。"}, {"id": "travel-space", "theme": "travel", "title": "给旅行留一点空白", "date": "09.06", "time": "18:12", "text": "这次旅行不想列很长的打卡清单。想找一个能慢慢走路的地方，最好有海，也有可以坐很久的小店。\n\n不需要每天都安排景点，给临时改变主意留一点时间。"}, {"id": "travel-slow", "theme": "travel", "title": "一次慢一点的旅行", "date": "09.20", "time": "12:43", "text": "看了几条路线，我还是更想在一个城市多住几天。早上出门时不用赶车，应该会是完全不同的感觉。\n\n这次旅行的预算，先放在住宿和交通上。"}, {"id": "travel-afternoon", "theme": "travel", "title": "不安排的那个下午", "date": "09.28", "time": "19:08", "text": "留一个下午，没有安排，在喜欢的街道慢慢走。这次旅行不是要看更多地方，是想真正感受这段时间。\n\n只先订第一晚的住处，剩下的时间留给临时发现的地方。"}]};
  const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
  const jump=s=>$(s)?.scrollIntoView({behavior:reduced?'auto':'smooth',block:'start'});
  let toastTimer, isComposing=false;
  function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('is-visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('is-visible'),2800);}
  document.addEventListener('compositionstart',()=>{isComposing=true;});
  document.addEventListener('compositionend',()=>{isComposing=false;});
  function canNavigate(){if(!isComposing)return true;toast('请先完成正在输入的文字。');return false;}
  function animate(el){if(!el||reduced)return;el.classList.remove('v8-is-changing');void el.offsetWidth;el.classList.add('v8-is-changing');}
  const byId=new Map(originals.map(o=>[o.id,o]));
  const working=new Map(), thoughtEdits=new Map(), additions=new Map();
  const sectionKey=(t,c)=>`${t}:${c}`;
  const thoughtKey=(t,c,id)=>`${t}:${c}:${id}`;
  const inputText=id=>working.has(id)?working.get(id):(byId.get(id)?.text??'');
  const thoughtText=(t,c,id)=>thoughtEdits.has(thoughtKey(t,c,id))?thoughtEdits.get(thoughtKey(t,c,id)):inputText(id);
  function records(t,c,order='desc'){
    const ids=[themes[t].chapters[c].source];
    if(t==='product'&&c===1)ids.push('product-return');
    return ids.map(id=>byId.get(id)).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)*(order==='desc'?-1:1));
  }
  function dateText(o,year=false){const [m,d]=o.date.split('.').map(Number);return `${year?'2026年':''}${m}月${d}日 ${o.time}`;}
  const gallery={theme:location.hash==='#thought-library'?'writing':'product',section:location.hash==='#thought-library'?0:1,organized:false,order:'desc'};
  const hero={theme:'product',section:1,organized:false,order:'desc',view:'reader'};
  const changed=(t,c)=>records(t,c).some(o=>working.has(o.id)||thoughtEdits.has(thoughtKey(t,c,o.id)))||Boolean(additions.get(sectionKey(t,c)));
  function topicCard(t,channel,active){return `<article class="v8-topic-card${active?' is-current':''}"><button type="button" class="v8-topic-title" data-library="${channel}" data-topic="${t}">${esc(themes[t].title)}</button><nav aria-label="${esc(themes[t].title)}的章节">${themes[t].chapters.map((c,i)=>`<button type="button" data-library="${channel}" data-topic="${t}" data-section="${i}">${esc(c.name)}</button>`).join('')}</nav></article>`;}
  function rawProse(t,c,channel,order='desc',readonly=false){return records(t,c,order).map((o,i)=>`<article class="v8-entry"><time datetime="2026-${o.date.replace('.','-')}T${o.time}">${dateText(o,i===0)}</time><div class="v8-entry-body" ${readonly?'':'contenteditable="plaintext-only" role="textbox" aria-multiline="true"'} aria-label="${esc(themes[t].chapters[c].name)}，${dateText(o)}" data-edit-layer="thought" data-edit-id="${o.id}" data-edit-theme="${t}" data-edit-section="${c}" data-edit-channel="${channel}">${esc(thoughtText(t,c,o.id))}</div></article>`).join('');}
  function organizedProse(t,c){
    if(changed(t,c))return `<p class="v8-ai-note">内容已修改，预置整理已失效。本演示不调用 AI；关闭开关即可继续修改。</p>${rawProse(t,c,'readonly','desc',true)}${additions.get(sectionKey(t,c))?`<div class="v8-writing-end">${esc(additions.get(sectionKey(t,c)))}</div>`:''}`;

    if(t==='product'&&c===1)return '<span class="v8-ai-label">AI 整理 · 预置效果</span><h5>先把常用的几步连起来</h5><div class="v8-ai-block">9月12日，我想先解决一个真实发生的问题：找到之前说过的话，改一改，继续用。第一步不是把功能做多，而是让一个人愿意再用一次；其他的可以慢慢来。</div><h5>试用后，更在意接得上</h5><div class="v8-ai-block">9月18日试了第一版之后，我发现最需要的不是更多功能，而是重新打开时，能很快接上上次的想法。留住当时的判断，应该比再写一遍完整的背景更有帮助。</div>';
    return '<span class="v8-ai-label">AI 整理 · 预置效果</span>'+records(t,c,'asc').map(o=>`<h5>${esc(themes[t].chapters[c].name)}</h5><div class="v8-ai-block">${esc(inputText(o.id))}</div>`).join('');
  }
  function renderGallery(){
    const t=gallery.theme,c=gallery.section;
    $('#topic-grid').innerHTML=Object.keys(themes).map(k=>topicCard(k,'gallery',k===t)).join('');
    $('#topic-title').textContent=themes[t].title;
    $('#section-title').textContent=themes[t].chapters[c].name;
    $('#section-nav').innerHTML=themes[t].chapters.map((ch,i)=>`<button type="button" data-library="gallery" data-topic="${t}" data-section="${i}" aria-current="${i===c}">${esc(ch.name)}</button>`).join('');
    $('#topic-prose').innerHTML=gallery.organized?organizedProse(t,c):rawProse(t,c,'gallery',gallery.order);
    $('#organize-gallery').setAttribute('aria-checked',String(gallery.organized));
    const order=$('[data-order="gallery"]');order.textContent=gallery.order==='desc'?'最新在前 ↓':'最早在前 ↑';order.hidden=gallery.organized||records(t,c).length<2;
    const end=$('#writing-end');end.textContent=additions.get(sectionKey(t,c))??'';end.hidden=gallery.organized;
    $('#topic-edit-state').textContent='';
  }
  function chooseSection(channel,t,c){if(!canNavigate()||!themes[t])return;const state=gallery;
    state.theme=t;state.section=Number.isInteger(c)&&themes[t].chapters[c]?c:0;state.view='reader';state.organized=false;
    renderGallery();
    animate($('#topic-prose'));const focus=$('#section-title');focus.tabIndex=-1;focus.focus({preventScroll:true});if(innerWidth<=640)$('#topic-reader').scrollIntoView({behavior:reduced?'auto':'smooth',block:'start'});
  }
  document.addEventListener('click',e=>{
    const topic=e.target.closest('[data-library][data-topic]');if(topic){chooseSection(topic.dataset.library,topic.dataset.topic,topic.hasAttribute('data-section')?Number(topic.dataset.section):undefined);return;}
    const org=e.target.closest('#organize-gallery,#organize-hero');if(org&&canNavigate()){const isHero=org.id==='organize-hero',state=isHero?hero:gallery;state.organized=!state.organized;renderGallery();animate($('#topic-prose'));}
    const order=e.target.closest('[data-order]');if(order&&canNavigate()){const state=order.dataset.order==='hero'?hero:gallery;state.order=state.order==='desc'?'asc':'desc';renderGallery();}
  });
  document.addEventListener('input',e=>{
    const el=e.target;
    if(el.matches('[data-edit-layer="thought"][contenteditable]')){
      thoughtEdits.set(thoughtKey(el.dataset.editTheme,el.dataset.editSection,el.dataset.editId),el.innerText);
      const label=el.dataset.editChannel==='hero'?$('#hero-edit-state'):$('#topic-edit-state');if(label)label.textContent='已修改 · 仅本页';
    }
    if(el=== $('#writing-end')){additions.set(sectionKey(gallery.theme,gallery.section),el.innerText);$('#topic-edit-state').textContent='已修改 · 仅本页';}
    if(el.matches('[data-hero-add]')){additions.set(sectionKey(hero.theme,hero.section),el.innerText);$('#hero-edit-state').textContent='已修改 · 仅本页';}
    if(el.matches('[data-edit-layer="input"]')){working.set(el.dataset.editId,el.innerText);const label=$('.v8-edit-state',el.closest('.v8-archive-document'));if(label)label.textContent='已修改 · 仅本页';}
    if(el.closest('.v8-edit-example'))$('.v8-edit-example-status').textContent='已修改 · 仅本页';
  });
  // Archive searches actual editable inputs. A fresh primary entry leaves its reading pane empty.
  const largeArchive={query:'',selected:null},heroArchive={query:'',selected:null};
  const matches=q=>originals.filter(o=>!q||inputText(o.id).toLocaleLowerCase().includes(q.toLocaleLowerCase()));
  function snippet(id,q){const text=inputText(id).replace(/\s+/g,' ');const at=q?text.toLocaleLowerCase().indexOf(q.toLocaleLowerCase()):0;const start=Math.max(0,at-18);const chunk=(start?'…':'')+text.slice(start,start+78)+(text.length>start+78?'…':'');if(!q)return esc(chunk);const pieces=chunk.split(new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'ig'));const terms=chunk.match(new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'ig'))||[];return pieces.map((p,i)=>esc(p)+(terms[i]?`<mark>${esc(terms[i])}</mark>`:'')).join('');}
  function archiveDocument(id,channel){const o=byId.get(id);if(!o)return '';
    return `<div class="v8-archive-document"><header class="v8-archive-head"><h3>${esc(o.title)}</h3><div class="v8-archive-actions"><button type="button" class="v8-archive-copy" data-copy-input="${id}">复制</button></div></header><div class="v8-archive-prose"><article class="v8-entry"><time datetime="2026-${o.date.replace('.','-')}T${o.time}">${dateText(o,true)}</time><div class="v8-entry-body" contenteditable="plaintext-only" role="textbox" aria-label="${esc(o.title)}的输入内容" aria-multiline="true" data-edit-layer="input" data-edit-id="${id}" data-edit-channel="${channel}">${esc(inputText(id))}</div></article></div><span class="v8-edit-state" role="status"></span></div>`;
  }
  function renderLargeArchive(){
    const state=largeArchive,found=matches(state.query);
    $('#ax-result-count').textContent=state.query?(found.length?'搜索结果':'没有找到匹配的输入'):'全部对话';
    $('#ax-results').innerHTML=found.length?found.map(o=>`<button type="button" class="ax-result ${state.selected===o.id?'is-active':''}" data-archive-target="${o.id}" data-archive-channel="large" aria-pressed="${state.selected===o.id}"><strong>${state.query?snippet(o.id,state.query):esc(o.title)}</strong><p>${esc(o.title)} · ${dateText(o)}</p></button>`).join(''):'<p class="v8-search-empty">换一个词再试试。</p>';
    $('#ax-reading').innerHTML=state.selected?archiveDocument(state.selected,'large'):'';
    $('#archive-empty').hidden=Boolean(state.selected);
    if(!state.query){$('#ax-results').innerHTML=Object.keys(themes).map(t=>`<details class="d11-project"><summary>${esc(themes[t].title)}</summary>${originals.filter(o=>o.theme===t).map(o=>`<button class="ax-result" type="button" data-archive-target="${o.id}" data-archive-channel="large"><strong>${esc(o.title)}</strong></button>`).join('')}</details>`).join('');}
  }
  $('#ax-query').addEventListener('input',e=>{if(e.isComposing)return;largeArchive.query=e.target.value.trim();largeArchive.selected=null;renderLargeArchive();});
  $('#ax-query').addEventListener('compositionend',e=>{largeArchive.query=e.target.value.trim();largeArchive.selected=null;renderLargeArchive();});
  // An explicit suggestion is a query, never implicit selection or a tour.
  $$('[data-example-query]').forEach(button=>button.addEventListener('click',()=>{
    if(!canNavigate())return;
    const query=$('#ax-query');query.value=button.dataset.exampleQuery;
    largeArchive.query=query.value;largeArchive.selected=null;renderLargeArchive();
    query.focus({preventScroll:true});
  }));
  $('#ax-clear').addEventListener('click',()=>{if(!canNavigate())return;largeArchive.query='';largeArchive.selected=null;$('#ax-query').value='';renderLargeArchive();$('#ax-query').focus({preventScroll:true});});
  document.addEventListener('click',e=>{
    const row=e.target.closest('[data-archive-target]');if(row&&canNavigate()){
      if(row.dataset.archiveChannel==='hero'){heroArchive.selected=row.dataset.archiveTarget;$('#pd-archive-reader').innerHTML=archiveDocument(heroArchive.selected,'hero');}
      else{largeArchive.selected=row.dataset.archiveTarget;renderLargeArchive();const focus=$('#ax-reading h3');focus.tabIndex=-1;focus.focus({preventScroll:true});if(innerWidth<=640)$('#ax-reading').scrollIntoView({behavior:reduced?'auto':'smooth',block:'start'});}
    }
    const copy=e.target.closest('[data-copy-input]');if(copy){const text=inputText(copy.dataset.copyInput);
      if(navigator.clipboard?.writeText)navigator.clipboard.writeText(text).then(()=>toast('已复制。'),()=>toast('浏览器不允许自动复制，请选中文字后复制。'));
      else toast('请选中文字后复制。');
    }
  });
  // The four Context cards retain their established appearance; they are permissions, not a one-off packet.
  const permissionKeys=['information','rules','now','inputs'];
  const permissionNames=['我的信息','我的规则','我的现在','我的输入'];
  const permissions=[false,false,false,false];let master=false;
  const topicPermissions={product:false,writing:false,travel:false};
  const details={
    information:[{label:'个人背景',text:'我正在尝试做自己的软件产品。'},{label:'长期兴趣',text:'我喜欢自然的表达，也喜欢观察工具怎样帮助人做事。'}],
    rules:[{label:'回答的方式',text:'先说结论，再解释原因。发现我的前提有问题，请直接指出。'},{label:'表达偏好',text:'用自然、具体的语言。少些套话，不要把我的表达改成另一种声音。'}],
    now:[{label:'正在推进的事',text:'正在打磨第一个产品版本。先把常用体验做顺，再扩展功能。'},{label:'最近的变化',text:'比起增加功能，现在更关注重新打开时能否接上之前的想法。'}]
  };
  const dialog=$('#context-dialog'),dialogBody=$('#context-dialog-body');
  let contextFocus=null,contextKey=null,contextFilter='all',contextTopic=null,contextSection=0;
  const permissionLabel=i=>!permissions[i]?'暂不开放':!master?'已选择 · 已暂停':'已选择 · 未连接';
  function syncPermissions(){
    $$('.context-switch').forEach((b,i)=>{b.setAttribute('aria-checked',String(permissions[i]));$('.context-access',b.closest('.context-card')).textContent=permissionLabel(i);});
    $$('[data-pd-toggle]').forEach(b=>{const i=permissionKeys.indexOf(b.dataset.pdToggle);b.setAttribute('aria-checked',String(permissions[i]));b.closest('.pd-context-card').classList.toggle('pd-is-enabled',permissions[i]);$('[data-pd-toggle-label]',b.closest('.pd-context-card')).textContent=permissionLabel(i);});
    $$('[data-ctx-master]').forEach(b=>b.setAttribute('aria-checked',String(master)));
    $('#context-status-text').textContent=master?'访问开关已开启；本演示未连接 AI，不开放数据。':permissions.some(Boolean)?'访问已暂停，各项选择保留。':'默认关闭。内容和访问权限，分别由你决定。';
    $$('[data-topic-permission]').forEach(b=>{b.setAttribute('aria-checked',String(topicPermissions[b.dataset.topicPermission]));});
  }
  function renderContext(){
    if(contextKey==='connection'){dialogBody.innerHTML='<p class="v8-connection-explanation">这里还没有连接 AI。</p><p class="v8-connection-detail">这是独立的官网交互示例，不建立真实连接，也不会把本页内容发送出去。</p>';return;}
    if(contextKey==='inputs'){
      if(contextTopic){
        const t=contextTopic,c=contextSection;
        dialogBody.innerHTML=`<button type="button" class="v8-ctx-back" data-ctx-back>← 返回主题</button><h3 class="v8-ctx-topic-heading">${esc(themes[t].title)}</h3><nav class="v8-ctx-chapters" aria-label="查看主题章节">${themes[t].chapters.map((ch,i)=>`<button type="button" data-ctx-section="${i}" aria-current="${i===c}">${esc(ch.name)}</button>`).join('')}</nav><div class="v8-ctx-readonly">${rawProse(t,c,'context','desc',true)}</div>`;
      }else{
        const topics=Object.keys(themes).filter(t=>contextFilter==='all'||topicPermissions[t]);
        dialogBody.innerHTML=`<div class="v8-ctx-filters" role="group" aria-label="主题范围"><button type="button" data-ctx-filter="all" aria-pressed="${contextFilter==='all'}">全部</button><button type="button" data-ctx-filter="selected" aria-pressed="${contextFilter==='selected'}">已选</button></div><div class="v8-ctx-topics">${topics.length?topics.map(t=>`<div class="v8-ctx-topic-row"><button type="button" data-ctx-topic="${t}">${esc(themes[t].title)} <span aria-hidden="true">↗</span></button><button class="v8-master" type="button" role="switch" aria-label="选择主题：${esc(themes[t].title)}" data-topic-permission="${t}" aria-checked="${topicPermissions[t]}"><i></i></button></div>`).join(''):'<p class="v8-search-empty">尚未选择主题。</p>'}</div><p class="v8-ctx-scope-note">主题选择不会自动开启「我的输入」或总访问开关。</p>`;
      }
    }else dialogBody.innerHTML=details[contextKey].map((item,i)=>`<section class="v8-ctx-group" id="ctx-group-${i}"><h3>${esc(item.label)}</h3><div contenteditable="plaintext-only" role="textbox" aria-multiline="true" aria-label="编辑${esc(item.label)}" data-ctx-edit="${i}">${esc(item.text)}</div></section>`).join('')+'<span class="v8-edit-state" id="ctx-edit-state" role="status"></span>';
  }
  function openContext(k,group){if(!canNavigate())return;contextFocus=document.activeElement;contextKey=k;contextFilter='all';contextTopic=null;contextSection=0;
    $('#context-dialog-title').textContent=k==='connection'?'AI 连接':permissionNames[permissionKeys.indexOf(k)];
    if(k==='inputs'&&Number.isInteger(group)){contextTopic=['product','writing'][group]??null;}
    renderContext();dialog.showModal();
    if(k!=='inputs'&&k!=='connection'&&Number.isInteger(group))$('#ctx-group-'+group)?.scrollIntoView({block:'nearest'});
  }
  $$('.context-switch').forEach((b,i)=>b.addEventListener('click',()=>{permissions[i]=!permissions[i];syncPermissions();}));
  $$('[data-pd-toggle]').forEach(b=>b.addEventListener('click',()=>{const i=permissionKeys.indexOf(b.dataset.pdToggle);permissions[i]=!permissions[i];syncPermissions();}));
  $$('[data-ctx-master]').forEach(b=>b.addEventListener('click',()=>{master=!master;syncPermissions();}));
  $$('[data-ctx-open]').forEach(b=>b.addEventListener('click',()=>openContext(b.dataset.ctxOpen,b.hasAttribute('data-ctx-group')?Number(b.dataset.ctxGroup):undefined)));
  $$('[data-ctx-connection]').forEach(b=>b.addEventListener('click',()=>openContext('connection')));
  function closeContext(){if(!canNavigate())return;dialogBody.replaceChildren();dialog.close();}
  $('[data-close-context]').addEventListener('click',closeContext);
  dialog.addEventListener('cancel',e=>{e.preventDefault();closeContext();});
  // The active modal owns Escape even after its focused content is replaced.
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&dialog.open&&!e.isComposing){e.preventDefault();e.stopImmediatePropagation();closeContext();}},{capture:true});
  dialog.addEventListener('close',()=>{dialogBody.replaceChildren();contextFocus?.focus?.({preventScroll:true});});
  dialog.addEventListener('input',e=>{if(e.target.matches('[data-ctx-edit]')){details[contextKey][Number(e.target.dataset.ctxEdit)].text=e.target.innerText;$('#ctx-edit-state').textContent='已修改 · 仅本页';}});
  dialog.addEventListener('click',e=>{
    const filter=e.target.closest('[data-ctx-filter]');if(filter){contextFilter=filter.dataset.ctxFilter;renderContext();return;}
    const topic=e.target.closest('[data-ctx-topic]');if(topic){contextTopic=topic.dataset.ctxTopic;contextSection=0;renderContext();return;}
    if(e.target.closest('[data-ctx-back]')){contextTopic=null;renderContext();return;}
    const section=e.target.closest('[data-ctx-section]');if(section){contextSection=Number(section.dataset.ctxSection);renderContext();return;}
    const permission=e.target.closest('[data-topic-permission]');if(permission){const t=permission.dataset.topicPermission;topicPermissions[t]=!topicPermissions[t];syncPermissions();if(contextFilter==='selected')renderContext();return;}
    if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeContext();}
  });
 let floatData=['请先给出结论，再解释原因。','发现我的前提有问题，请直接指出。','保留我的原意，用更自然的语言表达。','先比较不同方案，再说明取舍。','给出一个具体的例子。','把可以执行的下一步写清楚。'].map((text,i)=>({id:'phrase-'+i,text,revision:1,hidden:false,pinned:false}));
 const draft=$('#prompt-draft');let selection=0,composing=false;
 const remember=()=>{selection=draft.selectionEnd;};
 ['select','keyup','pointerup','blur'].forEach(event=>draft.addEventListener(event,remember));
 draft.addEventListener('input',()=>{selection=draft.selectionEnd;});
 draft.addEventListener('compositionstart',()=>composing=true);draft.addEventListener('compositionend',()=>{composing=false;remember();});
 const adapter={list:()=>floatData,recommendation:()=>floatData[0]?.id,
  async insert(snapshot){const item=floatData.find(x=>x.id===snapshot.id);if(composing)return {ok:false,reason:'请先完成当前输入。'};if(!item||item.hidden||item.text!==snapshot.text||item.revision!==snapshot.revision)return{ok:false,reason:'这段表达已改变，请重新选择。'};
   const p=Math.min(selection,draft.value.length);const prefix=p>0&&!/\s$/.test(draft.value.slice(0,p))?'\n':'';draft.setRangeText(prefix+item.text,p,p,'end');draft.focus({preventScroll:true});draft.dispatchEvent(new Event('input',{bubbles:true}));return{ok:true};},
  async save(e){const old=floatData.find(v=>v.id===e.id);if(e.split){floatData=floatData.filter(v=>v.id!==e.id);e.parts.forEach((text,i)=>floatData.push({id:'part-'+Date.now()+'-'+i,text,revision:1,hidden:false,pinned:false}));}else if(e.isNew){floatData.push({id:'new-'+Date.now(),text:e.draft,revision:1,hidden:false,pinned:false});}else if(old){old.text=e.draft;old.revision++;}return {ok:true};},
  async mutate(action,id){const i=floatData.findIndex(x=>x.id===id),v=floatData[i];if(!v)return {ok:false,reason:'表达已不可用。'};if(action==='pin')v.pinned=!v.pinned;if(action==='hide')v.hidden=!v.hidden;if(action==='restore')v.hidden=false;if(action==='delete-confirm')floatData.splice(i,1);if(action==='up'||action==='down'){const j=i+(action==='up'?-1:1);if(j>=0&&j<floatData.length)[floatData[i],floatData[j]]=[floatData[j],floatData[i]];}return {ok:true};},
  open(){jump('#input-library');}
 };
 const floating=new window.PaiaRefinement.Surface($('#r3-host'),$('#r3-composer'),adapter,{mode:'board'});
 floating.previous='collapsed';
 $$('[data-r3-mode]').forEach(b=>b.addEventListener('click',()=>{floating.setMode(b.dataset.r3Mode);syncFloat();}));
 function syncFloat(){$$('[data-r3-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.r3Mode===floating.mode)));}
 new MutationObserver(syncFloat).observe(floating.root,{attributes:true,attributeFilter:['data-mode']});
 $$('.r3-glyph-placeholder').forEach((el,i)=>{const glyph=document.createElement('span');glyph.innerHTML=window.PaiaRefinement.glyph('hero-r3-'+i);el.append(glyph);});
 $$('[data-jump-reuse]').forEach(b=>b.addEventListener('click',()=>{floating.setMode('board');jump('#prompt-reuse');}));

  const header=$('#site-header');let tick=false;addEventListener('scroll',()=>{if(!tick){requestAnimationFrame(()=>{header.classList.toggle('is-scrolled',scrollY>80);tick=false;});tick=true;}},{passive:true});
  const mb=$('.menu-toggle'),mn=$('#mobile-nav');const closeMenu=()=>{mn.hidden=true;mb.setAttribute('aria-expanded','false');mb.setAttribute('aria-label','打开导航');};mb.addEventListener('click',()=>{const open=mb.getAttribute('aria-expanded')!=='true';mb.setAttribute('aria-expanded',String(open));mb.setAttribute('aria-label',open?'关闭导航':'打开导航');mn.hidden=!open;});$$('#mobile-nav a').forEach(a=>a.addEventListener('click',closeMenu));addEventListener('keydown',e=>{if(e.key==='Escape'&&!mn.hidden){closeMenu();mb.focus({preventScroll:true});}});

  renderGallery();renderLargeArchive();syncPermissions();document.body.dataset.atelierReady='true';
})();

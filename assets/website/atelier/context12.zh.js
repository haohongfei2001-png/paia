(() => {'use strict';const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>Array.from(r.querySelectorAll(s));const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));let isComposing=false;document.addEventListener('compositionstart',()=>isComposing=true);document.addEventListener('compositionend',()=>isComposing=false);const canNavigate=()=>!isComposing;const {themes, originals}={"themes": {"product": {"title": "做一个自己的产品", "chapters": [{"name": "为什么开始", "source": "product-idea"}, {"name": "第一步", "source": "product-first"}, {"name": "我的原则", "source": "product-principle"}]}, "writing": {"title": "写作与表达", "chapters": [{"name": "最初的打算", "source": "writing-start"}, {"name": "试过之后", "source": "writing-voice"}, {"name": "还想继续", "source": "writing-read"}]}, "travel": {"title": "下一次旅行", "chapters": [{"name": "先留一点空白", "source": "travel-space"}, {"name": "慢一点的选择", "source": "travel-slow"}, {"name": "不安排的下午", "source": "travel-afternoon"}]}}, "originals": [{"id": "product-idea", "theme": "product", "title": "一次灵感", "date": "09.04", "time": "22:14", "text": "我想做一个自己每天也会用的产品。每次跟 AI 聊完，里面有些话其实是我想了很久才说清楚的。以后再遇到相似的问题，不想从头开始。\n\n先从自己的真实需要出发，把一个小问题做得足够好。"}, {"id": "product-first", "theme": "product", "title": "产品的第一步", "date": "09.12", "time": "10:32", "text": "先解决一个真实发生的问题。第一步不是把功能做多，而是让一个人愿意再用一次。\n\n我最常做的，是找到之前说过的话，改一改，继续用。先把这几步连起来，其他的可以慢慢来。"}, {"id": "product-return", "theme": "product", "title": "重新打开时，接得上", "date": "09.18", "time": "21:06", "text": "今天试了第一版。做完第一步之后，我发现最需要的不是更多功能，而是重新打开它的时候，能很快接上上次的想法。\n\n留住当时的判断，应该比再写一遍完整的背景更有帮助。"}, {"id": "product-principle", "theme": "product", "title": "关于简单的一次取舍", "date": "09.20", "time": "18:40", "text": "少一点打扰，多一点真正有用。常用动作应该能直接发生，低频的整理放在需要时才打开的位置。\n\n我不是想让产品少做事情，而是不想让正在做事的人，一直被界面打断。"}, {"id": "writing-start", "theme": "writing", "title": "最初的打算", "date": "09.09", "time": "20:14", "text": "我想每周，写一篇完整的长文。"}, {"id": "writing-voice", "theme": "writing", "title": "试过之后", "date": "09.17", "time": "09:26", "text": "试了两次，还是想从一个具体的观察写起。"}, {"id": "writing-read", "theme": "writing", "title": "还想继续", "date": "09.25", "time": "22:10", "text": "先把观察留下来，暂时不急着提炼成观点。"}, {"id": "travel-space", "theme": "travel", "title": "给旅行留一点空白", "date": "09.06", "time": "18:12", "text": "这次旅行不想列很长的打卡清单。想找一个能慢慢走路的地方，最好有海，也有可以坐很久的小店。\n\n不需要每天都安排景点，给临时改变主意留一点时间。"}, {"id": "travel-slow", "theme": "travel", "title": "一次慢一点的旅行", "date": "09.20", "time": "12:43", "text": "看了几条路线，我还是更想在一个城市多住几天。早上出门时不用赶车，应该会是完全不同的感觉。\n\n这次旅行的预算，先放在住宿和交通上。"}, {"id": "travel-afternoon", "theme": "travel", "title": "不安排的那个下午", "date": "09.28", "time": "19:08", "text": "留一个下午，没有安排，在喜欢的街道慢慢走。这次旅行不是要看更多地方，是想真正感受这段时间。\n\n只先订第一晚的住处，剩下的时间留给临时发现的地方。"}]};
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
  function rawProse(t,c,channel,order='desc',readonly=false){return records(t,c,order).map((o,i)=>`<article class="v8-entry"><time datetime="2026-${o.date.replace('.','-')}T${o.time}">${dateText(o,i===0)}</time><div class="v8-entry-body" ${readonly?'':'contenteditable="plaintext-only" role="textbox" aria-multiline="true"'} aria-label="${esc(themes[t].chapters[c].name)}，${dateText(o)}" data-edit-layer="thought" data-edit-id="${o.id}" data-edit-theme="${t}" data-edit-section="${c}" data-edit-channel="${channel}">${esc(thoughtText(t,c,o.id))}</div></article>`).join('');}
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

syncPermissions();})();

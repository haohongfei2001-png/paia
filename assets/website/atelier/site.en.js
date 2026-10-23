(() => {
  'use strict';
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const {themes, originals}={"themes": {"product": {"title": "A product of my own", "chapters": [{"name": "Why I started", "source": "product-idea"}, {"name": "The first step", "source": "product-first"}, {"name": "My principles", "source": "product-principle"}]}, "writing": {"title": "Writing in my own voice", "chapters": [{"name": "What I want to say", "source": "writing-start"}, {"name": "Keep my voice", "source": "writing-voice"}, {"name": "Read it once more", "source": "writing-read"}]}, "travel": {"title": "The next journey", "chapters": [{"name": "Leave some room", "source": "travel-space"}, {"name": "A slower choice", "source": "travel-slow"}, {"name": "An unplanned afternoon", "source": "travel-afternoon"}]}}, "originals": [{"id": "product-idea", "theme": "product", "title": "An idea to begin with", "date": "09.04", "time": "22:14", "text": "I want to make something I would use every day. After talking with AI, some of what I said took a long time to think through. When a similar question comes up, I do not want to start over.\n\nStart with a real need of my own, and make one small thing work well."}, {"id": "product-first", "theme": "product", "title": "The first product step", "date": "09.12", "time": "10:32", "text": "Start with a real, recurring problem. The first step is not to add more features, but to make something one person wants to use again.\n\nWhat I do most is find something I said before, change it a little, and use it again. Connect those steps first. The rest can wait."}, {"id": "product-return", "theme": "product", "title": "Pick up where I left off", "date": "09.18", "time": "21:06", "text": "I tried the first version today. After the first step, I realized I needed fewer new features and a quicker way to pick up my last train of thought.\n\nKeeping the reasoning from that moment seems more useful than writing all the background again."}, {"id": "product-principle", "theme": "product", "title": "A choice about simplicity", "date": "09.20", "time": "18:40", "text": "Less interruption, more genuine usefulness. Everyday actions should happen directly. Less frequent organization belongs somewhere I can open when I need it.\n\nI do not want the product to do less. I want the interface to stop interrupting the person doing something."}, {"id": "writing-start", "theme": "writing", "title": "Find the sentence that matters", "date": "09.09", "time": "20:14", "text": "By the third paragraph, I realized there was really only one sentence I wanted to say. Next time I will put that sentence first, then decide which explanations matter.\n\nFinish the draft today; come back to revise tomorrow. Separating writing and editing seems easier."}, {"id": "writing-voice", "theme": "writing", "title": "Keep my own expression", "date": "09.17", "time": "09:26", "text": "Please do not turn my writing into somebody else’s work. Remove repetitions, but keep the slightly awkward expressions that are mine.\n\nHelp me find what is unclear. Keep the language natural rather than replacing it with professional-sounding phrases."}, {"id": "writing-read", "theme": "writing", "title": "Read it aloud, then revise", "date": "09.25", "time": "22:10", "text": "Reading aloud helps. When I need to stop and find the subject, I split the sentence. Good writing should be easy to follow.\n\nWhen an adjective is not precise enough, replace it with something that actually happened."}, {"id": "travel-space", "theme": "travel", "title": "Leave a little room", "date": "09.06", "time": "18:12", "text": "I do not want a long checklist of sights for this trip. I want somewhere I can walk slowly, ideally by the sea, with little places to sit for a while.\n\nThere need not be a sight planned every day. Leave time to change my mind."}, {"id": "travel-slow", "theme": "travel", "title": "A slower kind of trip", "date": "09.20", "time": "12:43", "text": "After comparing routes, I would still rather spend more days in one city. Leaving in the morning without having to catch a train should feel very different.\n\nAccommodation and transport come first in the budget for this trip."}, {"id": "travel-afternoon", "theme": "travel", "title": "The unplanned afternoon", "date": "09.28", "time": "19:08", "text": "Leave an afternoon unplanned, and walk slowly through streets I like. This trip is not about seeing more places; it is about really being there.\n\nBook only the first night first. Leave the rest for places I discover along the way."}]};
  const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
  const jump=s=>$(s)?.scrollIntoView({behavior:reduced?'auto':'smooth',block:'start'});
  let toastTimer, isComposing=false;
  function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('is-visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('is-visible'),2800);}
  document.addEventListener('compositionstart',()=>{isComposing=true;});
  document.addEventListener('compositionend',()=>{isComposing=false;});
  function canNavigate(){if(!isComposing)return true;toast('Finish composing the current text first.');return false;}
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
  function dateText(o,year=false){const [m,d]=o.date.split('.').map(Number);const month=['January','February','March','April','May','June','July','August','September','October','November','December'][m-1];return `${month} ${d}${year?', 2026':''} ${o.time}`;}
  const gallery={theme:'product',section:1,organized:false,order:'desc'};
  const hero={theme:'product',section:1,organized:false,order:'desc',view:'reader'};
  const changed=(t,c)=>records(t,c).some(o=>working.has(o.id)||thoughtEdits.has(thoughtKey(t,c,o.id)))||Boolean(additions.get(sectionKey(t,c)));
  function topicCard(t,channel,active){return `<article class="v8-topic-card${active?' is-current':''}"><button type="button" class="v8-topic-title" data-library="${channel}" data-topic="${t}">${esc(themes[t].title)}</button><nav aria-label="${esc(themes[t].title)} chapters">${themes[t].chapters.map((c,i)=>`<button type="button" data-library="${channel}" data-topic="${t}" data-section="${i}">${esc(c.name)}</button>`).join('')}</nav></article>`;}
  function rawProse(t,c,channel,order='desc',readonly=false){return records(t,c,order).map((o,i)=>`<article class="v8-entry"><time datetime="2026-${o.date.replace('.','-')}T${o.time}">${dateText(o,i===0)}</time><div class="v8-entry-body" ${readonly?'':'contenteditable="plaintext-only" role="textbox" aria-multiline="true"'} aria-label="${esc(themes[t].chapters[c].name)}，${dateText(o)}" data-edit-layer="thought" data-edit-id="${o.id}" data-edit-theme="${t}" data-edit-section="${c}" data-edit-channel="${channel}">${esc(thoughtText(t,c,o.id))}</div></article>`).join('');}
  function organizedProse(t,c){
    if(changed(t,c))return `<p class="v8-ai-note">Your edits have made the preset out of date. This example does not call AI. Switch it off to continue editing.</p>${rawProse(t,c,'readonly','desc',true)}${additions.get(sectionKey(t,c))?`<div class="v8-writing-end">${esc(additions.get(sectionKey(t,c)))}</div>`:''}`;
    if(t==='writing'&&c===1)return '<span class="v8-ai-label">AI organize · Preset example</span><h5>Make the unclear parts clear</h5><div class="v8-ai-block">When revising, remove repetition and help me find what is still unclear.</div><h5>Keep the expressions that are mine</h5><div class="v8-ai-block">Do not turn my writing into somebody else’s work. Keep the slightly awkward expressions that are mine.\n\nKeep the language natural rather than replacing it with professional-sounding phrases.</div>';
    if(t==='product'&&c===1)return '<span class="v8-ai-label">AI organize · Preset example</span><h5>Connect the steps I use most</h5><div class="v8-ai-block">On September 12, I wanted to solve a recurring problem: find something I said before, change it, and use it again. The first step was not more features, but something one person would use again. The rest could wait.</div><h5>After trying it, continuity matters more</h5><div class="v8-ai-block">After trying the first version on September 18, I needed fewer new features and a quicker way to pick up my last train of thought. Keeping that reasoning seems more useful than writing all the background again.</div>';
    return '<span class="v8-ai-label">AI organize · Preset example</span>'+records(t,c,'asc').map(o=>`<h5>${esc(themes[t].chapters[c].name)}</h5><div class="v8-ai-block">${esc(inputText(o.id))}</div>`).join('');
  }
  function renderGallery(){
    const t=gallery.theme,c=gallery.section;
    $('#topic-grid').innerHTML=Object.keys(themes).map(k=>topicCard(k,'gallery',k===t)).join('');
    $('#topic-title').textContent=themes[t].title;
    $('#section-title').textContent=themes[t].chapters[c].name;
    $('#section-nav').innerHTML=themes[t].chapters.map((ch,i)=>`<button type="button" data-library="gallery" data-topic="${t}" data-section="${i}" aria-current="${i===c}">${esc(ch.name)}</button>`).join('');
    $('#topic-prose').innerHTML=gallery.organized?organizedProse(t,c):rawProse(t,c,'gallery',gallery.order);
    $('#organize-gallery').setAttribute('aria-checked',String(gallery.organized));
    const order=$('[data-order="gallery"]');order.textContent=gallery.order==='desc'?'Newest first ↓':'Oldest first ↑';order.hidden=gallery.organized||records(t,c).length<2;
    const end=$('#writing-end');end.textContent=additions.get(sectionKey(t,c))??'';end.hidden=gallery.organized;
    $('#topic-edit-state').textContent='';
  }
  function renderHero(){
    const host=$('#hero-library');
    if(hero.view==='overview'){host.innerHTML=`<div class="v8-topic-grid">${Object.keys(themes).map(k=>topicCard(k,'hero',false)).join('')}</div>`;return;}
    const t=hero.theme,c=hero.section;
    host.innerHTML=`<button type="button" class="v8-hero-back" data-library-back>← Back to your library</button><div class="v8-hero-reader-head"><h4>${esc(themes[t].title)}</h4><div class="v8-reader-actions">${records(t,c).length>1&&!hero.organized?`<button class="v8-order" type="button" data-order="hero">${hero.order==='desc'?'Newest first ↓':'Oldest first ↑'}</button>`:''}<button type="button" class="v8-organize" id="organize-hero" role="switch" aria-checked="${hero.organized}"><span aria-hidden="true">✧</span> AI organize <i aria-hidden="true"></i></button></div></div><nav class="v8-hero-chapters" aria-label="Topic chapters">${themes[t].chapters.map((ch,i)=>`<button type="button" data-library="hero" data-topic="${t}" data-section="${i}" aria-current="${i===c}">${esc(ch.name)}</button>`).join('')}</nav><div class="v8-hero-prose">${hero.organized?organizedProse(t,c):rawProse(t,c,'hero',hero.order)}</div>${!hero.organized?`<div class="v8-writing-end" contenteditable="plaintext-only" role="textbox" aria-multiline="true" aria-label="Add a thought to the example topic" data-hero-add data-placeholder="Add a new thought…">${esc(additions.get(sectionKey(t,c))??'')}</div>`:''}<span class="v8-edit-state" id="hero-edit-state" role="status"></span>`;
  }
  function chooseSection(channel,t,c){if(!canNavigate()||!themes[t])return;const state=channel==='hero'?hero:gallery;
    state.theme=t;state.section=Number.isInteger(c)&&themes[t].chapters[c]?c:0;state.view='reader';state.organized=false;
    (channel==='hero'?renderHero:renderGallery)();
    animate(channel==='hero'?$('#hero-library'):$('#topic-prose'));
  }
  document.addEventListener('click',e=>{
    const topic=e.target.closest('[data-library][data-topic]');if(topic){chooseSection(topic.dataset.library,topic.dataset.topic,topic.hasAttribute('data-section')?Number(topic.dataset.section):undefined);return;}
    if(e.target.closest('[data-library-back]')&&canNavigate()){hero.view='overview';renderHero();}
    const org=e.target.closest('#organize-gallery,#organize-hero');if(org&&canNavigate()){const isHero=org.id==='organize-hero',state=isHero?hero:gallery;state.organized=!state.organized;(isHero?renderHero:renderGallery)();animate(isHero?$('#hero-library'):$('#topic-prose'));}
    const order=e.target.closest('[data-order]');if(order&&canNavigate()){const state=order.dataset.order==='hero'?hero:gallery;state.order=state.order==='desc'?'asc':'desc';(order.dataset.order==='hero'?renderHero:renderGallery)();}
  });
  document.addEventListener('input',e=>{
    const el=e.target;
    if(el.matches('[data-edit-layer="thought"][contenteditable]')){
      thoughtEdits.set(thoughtKey(el.dataset.editTheme,el.dataset.editSection,el.dataset.editId),el.innerText);
      const label=el.dataset.editChannel==='hero'?$('#hero-edit-state'):$('#topic-edit-state');if(label)label.textContent='Edited · This page only';
    }
    if(el=== $('#writing-end')){additions.set(sectionKey(gallery.theme,gallery.section),el.innerText);$('#topic-edit-state').textContent='Edited · This page only';}
    if(el.matches('[data-hero-add]')){additions.set(sectionKey(hero.theme,hero.section),el.innerText);$('#hero-edit-state').textContent='Edited · This page only';}
    if(el.matches('[data-edit-layer="input"]')){working.set(el.dataset.editId,el.innerText);const label=$('.v8-edit-state',el.closest('.v8-archive-document'));if(label)label.textContent='Edited · This page only';}
    if(el.closest('.v8-edit-example'))$('.v8-edit-example-status').textContent='Edited · This page only';
  });
  // Archive searches actual editable inputs. A fresh primary entry leaves its reading pane empty.
  const largeArchive={query:'The first step',selected:'product-first'},heroArchive={query:'',selected:null};
  const matches=q=>originals.filter(o=>!q||inputText(o.id).toLocaleLowerCase().includes(q.toLocaleLowerCase()));
  function snippet(id,q){const text=inputText(id).replace(/\s+/g,' ');const at=q?text.toLocaleLowerCase().indexOf(q.toLocaleLowerCase()):0;const start=Math.max(0,at-18);const chunk=(start?'…':'')+text.slice(start,start+78)+(text.length>start+78?'…':'');if(!q)return esc(chunk);const pieces=chunk.split(new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'ig'));const terms=chunk.match(new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'ig'))||[];return pieces.map((p,i)=>esc(p)+(terms[i]?`<mark>${esc(terms[i])}</mark>`:'')).join('');}
  function archiveDocument(id,channel){const o=byId.get(id);if(!o)return '';
    return `<div class="v8-archive-document"><header class="v8-archive-head"><h3>${esc(o.title)}</h3><div class="v8-archive-actions"><button type="button" class="v8-archive-copy" data-copy-input="${id}">Copy</button></div></header><div class="v8-archive-prose"><article class="v8-entry"><time datetime="2026-${o.date.replace('.','-')}T${o.time}">${dateText(o,true)}</time><div class="v8-entry-body" contenteditable="plaintext-only" role="textbox" aria-label="${esc(o.title)} inputs" aria-multiline="true" data-edit-layer="input" data-edit-id="${id}" data-edit-channel="${channel}">${esc(inputText(id))}</div></article></div><span class="v8-edit-state" role="status"></span></div>`;
  }
  function renderLargeArchive(){
    const state=largeArchive,found=matches(state.query);
    $('#ax-result-count').textContent=state.query?(found.length?'Search results':'No matching inputs'):'All conversations';
    $('#ax-results').innerHTML=found.length?found.map(o=>`<button type="button" class="ax-result ${state.selected===o.id?'is-active':''}" data-archive-target="${o.id}" data-archive-channel="large" aria-pressed="${state.selected===o.id}"><strong>${state.query?snippet(o.id,state.query):esc(o.title)}</strong><p>${esc(o.title)} · ${dateText(o)}</p></button>`).join(''):'<p class="v8-search-empty">Try another word.</p>';
    $('#ax-reading').innerHTML=state.selected?archiveDocument(state.selected,'large'):'';
  }
  function renderHeroArchive(){
    const q=heroArchive.query,found=matches(q);
    $('#pd-archive-list').innerHTML=q?found.map(o=>`<button class="pd-archive-item ${heroArchive.selected===o.id?'pd-is-active':''}" type="button" data-archive-target="${o.id}" data-archive-channel="hero"><strong>${snippet(o.id,q)}</strong><small>${esc(o.title)} · ${dateText(o)}</small></button>`).join('')||'<p class="v8-search-empty">No matching inputs.</p>':Object.keys(themes).map((t,i)=>`<details class="v8-project"><summary>${['Product exploration','Writing practice','Travel plans'][i]}</summary>${originals.filter(o=>o.theme===t).map(o=>`<button class="pd-archive-item" type="button" data-archive-target="${o.id}" data-archive-channel="hero"><strong>${esc(o.title)}</strong></button>`).join('')}</details>`).join('');
    $('#pd-search-message').textContent=q?(found.length?`${found.length} inputs found`:'No matching inputs'):'';
    $('#pd-archive-reader').innerHTML=heroArchive.selected?archiveDocument(heroArchive.selected,'hero'):'';
  }
  $('#ax-query').addEventListener('input',e=>{if(e.isComposing)return;largeArchive.query=e.target.value.trim();largeArchive.selected=null;renderLargeArchive();});
  $('#ax-query').addEventListener('compositionend',e=>{largeArchive.query=e.target.value.trim();largeArchive.selected=null;renderLargeArchive();});
  $('#ax-clear').addEventListener('click',()=>{if(!canNavigate())return;largeArchive.query='';largeArchive.selected=null;$('#ax-query').value='';renderLargeArchive();$('#ax-query').focus({preventScroll:true});});
  $('#pd-search-input').addEventListener('input',e=>{if(e.isComposing)return;heroArchive.query=e.target.value.trim();heroArchive.selected=null;renderHeroArchive();});
  $('#pd-search-input').addEventListener('compositionend',e=>{heroArchive.query=e.target.value.trim();heroArchive.selected=null;renderHeroArchive();});
  document.addEventListener('click',e=>{
    const row=e.target.closest('[data-archive-target]');if(row&&canNavigate()){
      if(row.dataset.archiveChannel==='hero'){heroArchive.selected=row.dataset.archiveTarget;$('#pd-archive-reader').innerHTML=archiveDocument(heroArchive.selected,'hero');}
      else{largeArchive.selected=row.dataset.archiveTarget;renderLargeArchive();}
    }
    const copy=e.target.closest('[data-copy-input]');if(copy){const text=inputText(copy.dataset.copyInput);
      if(navigator.clipboard?.writeText)navigator.clipboard.writeText(text).then(()=>toast('Copied.'),()=>toast('Your browser blocked automatic copying. Select the text to copy it.'));
      else toast('Select the text to copy it.');
    }
  });
  // The four Context cards retain their established appearance; they are permissions, not a one-off packet.
  const permissionKeys=['information','rules','now','inputs'];
  const permissionNames=['My information','My rules','My now','My inputs'];
  const permissions=[false,false,false,false];let master=false;
  const topicPermissions={product:false,writing:false,travel:false};
  const details={
    information:[{label:'Personal background',text:'I am trying to make my own software product.'},{label:'Long-term interests',text:'I like natural language, and noticing how tools help people get things done.'}],
    rules:[{label:'How to respond',text:'Give the conclusion first, then explain why. Point out a mistaken premise directly.'},{label:'Expression preferences',text:'Use natural, specific language. Avoid stock phrases, and keep my own voice.'}],
    now:[{label:'Work in progress',text:'Refining the first version. Make everyday actions feel right before adding features.'},{label:'Recent changes',text:'I care more about picking up my earlier thinking than adding features right now.'}]
  };
  const dialog=$('#context-dialog'),dialogBody=$('#context-dialog-body');
  let contextFocus=null,contextKey=null,contextFilter='all',contextTopic=null,contextSection=0;
  const permissionLabel=i=>!permissions[i]?'Access off':!master?'Chosen · Paused':'Chosen · Not connected';
  function syncPermissions(){
    $$('.context-switch').forEach((b,i)=>{b.setAttribute('aria-checked',String(permissions[i]));$('.context-access',b.closest('.context-card')).textContent=permissionLabel(i);});
    $$('[data-pd-toggle]').forEach(b=>{const i=permissionKeys.indexOf(b.dataset.pdToggle);b.setAttribute('aria-checked',String(permissions[i]));b.closest('.pd-context-card').classList.toggle('pd-is-enabled',permissions[i]);$('[data-pd-toggle-label]',b.closest('.pd-context-card')).textContent=permissionLabel(i);});
    $$('[data-ctx-master]').forEach(b=>b.setAttribute('aria-checked',String(master)));
    $('#context-status-text').textContent=master?'Access is selected. This example has no AI connection and shares no data.':permissions.some(Boolean)?'Access is paused. Individual choices are retained.':'Off by default. Content and access are separate choices.';
    $$('[data-topic-permission]').forEach(b=>{b.setAttribute('aria-checked',String(topicPermissions[b.dataset.topicPermission]));});
  }
  function renderContext(){
    if(contextKey==='connection'){dialogBody.innerHTML='<p class="v8-connection-explanation">No AI is connected here.</p><p class="v8-connection-detail">This independent website example does not establish a real connection or send page content anywhere.</p>';return;}
    if(contextKey==='inputs'){
      if(contextTopic){
        const t=contextTopic,c=contextSection;
        dialogBody.innerHTML=`<button type="button" class="v8-ctx-back" data-ctx-back>← Back to topics</button><h3 class="v8-ctx-topic-heading">${esc(themes[t].title)}</h3><nav class="v8-ctx-chapters" aria-label="View topic chapters">${themes[t].chapters.map((ch,i)=>`<button type="button" data-ctx-section="${i}" aria-current="${i===c}">${esc(ch.name)}</button>`).join('')}</nav><div class="v8-ctx-readonly">${rawProse(t,c,'context','desc',true)}</div>`;
      }else{
        const topics=Object.keys(themes).filter(t=>contextFilter==='all'||topicPermissions[t]);
        dialogBody.innerHTML=`<div class="v8-ctx-filters" role="group" aria-label="Topic access"><button type="button" data-ctx-filter="all" aria-pressed="${contextFilter==='all'}">All</button><button type="button" data-ctx-filter="selected" aria-pressed="${contextFilter==='selected'}">Selected</button></div><div class="v8-ctx-topics">${topics.length?topics.map(t=>`<div class="v8-ctx-topic-row"><button type="button" data-ctx-topic="${t}">${esc(themes[t].title)} <span aria-hidden="true">↗</span></button><button class="v8-master" type="button" role="switch" aria-label="Choose topic: ${esc(themes[t].title)}" data-topic-permission="${t}" aria-checked="${topicPermissions[t]}"><i></i></button></div>`).join(''):'<p class="v8-search-empty">No topics selected.</p>'}</div><p class="v8-ctx-scope-note">Selecting a topic does not turn on My inputs or overall access.</p>`;
      }
    }else dialogBody.innerHTML=details[contextKey].map((item,i)=>`<section class="v8-ctx-group" id="ctx-group-${i}"><h3>${esc(item.label)}</h3><div contenteditable="plaintext-only" role="textbox" aria-multiline="true" aria-label="Edit ${esc(item.label)}" data-ctx-edit="${i}">${esc(item.text)}</div></section>`).join('')+'<span class="v8-edit-state" id="ctx-edit-state" role="status"></span>';
  }
  function openContext(k,group){if(!canNavigate())return;contextFocus=document.activeElement;contextKey=k;contextFilter='all';contextTopic=null;contextSection=0;
    $('#context-dialog-title').textContent=k==='connection'?'AI Connections':permissionNames[permissionKeys.indexOf(k)];
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
  dialog.addEventListener('input',e=>{if(e.target.matches('[data-ctx-edit]')){details[contextKey][Number(e.target.dataset.ctxEdit)].text=e.target.innerText;$('#ctx-edit-state').textContent='Edited · This page only';}});
  dialog.addEventListener('click',e=>{
    const filter=e.target.closest('[data-ctx-filter]');if(filter){contextFilter=filter.dataset.ctxFilter;renderContext();return;}
    const topic=e.target.closest('[data-ctx-topic]');if(topic){contextTopic=topic.dataset.ctxTopic;contextSection=0;renderContext();return;}
    if(e.target.closest('[data-ctx-back]')){contextTopic=null;renderContext();return;}
    const section=e.target.closest('[data-ctx-section]');if(section){contextSection=Number(section.dataset.ctxSection);renderContext();return;}
    const permission=e.target.closest('[data-topic-permission]');if(permission){const t=permission.dataset.topicPermission;topicPermissions[t]=!topicPermissions[t];syncPermissions();if(contextFilter==='selected')renderContext();return;}
    if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeContext();}
  });
  // Primary spaces have one identity, not an extra headline band.
  function activateTab(key){if(!['archive','thought','context'].includes(key)||!canNavigate())return;
    $$('[data-pd-tab]').forEach(b=>{const active=b.dataset.pdTab===key;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;b.classList.toggle('pd-is-active',active);});
    $$('.pd-panel').forEach(p=>p.hidden=p.id!=='pd-panel-'+key);
    if(key==='archive'){heroArchive.query='';heroArchive.selected=null;$('#pd-search-input').value='';renderHeroArchive();}
    if(key==='thought'){hero.view='overview';renderHero();}
    $('#pd-status-hint').textContent='Fictional content · This page only';
  }
  $$('[data-pd-tab]').forEach(b=>b.addEventListener('click',()=>activateTab(b.dataset.pdTab)));
   // Exact inherited R3 glyph + geometry + interactions, with a local-only adapter.
 let floatData=['Give the conclusion first, then explain why.','Point out a mistaken premise directly.','Keep my meaning, using more natural language.','Compare the options, then explain the trade-offs.','Give a concrete example.','Make the actionable next step clear.'].map((text,i)=>({id:'phrase-'+i,text,revision:1,hidden:false,pinned:false}));
 const draft=$('#prompt-draft');let selection=0,composing=false;
 const remember=()=>{selection=draft.selectionEnd;};
 ['select','keyup','pointerup','blur'].forEach(event=>draft.addEventListener(event,remember));
 draft.addEventListener('input',()=>{selection=draft.selectionEnd;});
 draft.addEventListener('compositionstart',()=>composing=true);draft.addEventListener('compositionend',()=>{composing=false;remember();});
 const adapter={list:()=>floatData,recommendation:()=>floatData[0]?.id,
  async insert(snapshot){const item=floatData.find(x=>x.id===snapshot.id);if(composing)return {ok:false,reason:'Finish the current composition first.'};if(!item||item.hidden||item.text!==snapshot.text||item.revision!==snapshot.revision)return{ok:false,reason:'This expression has changed. Select it again.'};
   const p=Math.min(selection,draft.value.length);const prefix=p>0&&!/\s$/.test(draft.value.slice(0,p))?'\n':'';draft.setRangeText(prefix+item.text,p,p,'end');draft.focus({preventScroll:true});draft.dispatchEvent(new Event('input',{bubbles:true}));return{ok:true};},
  async save(e){const old=floatData.find(v=>v.id===e.id);if(e.split){floatData=floatData.filter(v=>v.id!==e.id);e.parts.forEach((text,i)=>floatData.push({id:'part-'+Date.now()+'-'+i,text,revision:1,hidden:false,pinned:false}));}else if(e.isNew){floatData.push({id:'new-'+Date.now(),text:e.draft,revision:1,hidden:false,pinned:false});}else if(old){old.text=e.draft;old.revision++;}return {ok:true};},
  async mutate(action,id){const i=floatData.findIndex(x=>x.id===id),v=floatData[i];if(!v)return {ok:false,reason:'This expression is no longer available.'};if(action==='pin')v.pinned=!v.pinned;if(action==='hide')v.hidden=!v.hidden;if(action==='restore')v.hidden=false;if(action==='delete-confirm')floatData.splice(i,1);if(action==='up'||action==='down'){const j=i+(action==='up'?-1:1);if(j>=0&&j<floatData.length)[floatData[i],floatData[j]]=[floatData[j],floatData[i]];}return {ok:true};},
  open(){activateTab('archive');jump('#product');}
 };
 const floating=new window.PaiaRefinement.Surface($('#r3-host'),$('#r3-composer'),adapter,{mode:'board'});
 floating.previous='collapsed';
 $$('[data-r3-mode]').forEach(b=>b.addEventListener('click',()=>{floating.setMode(b.dataset.r3Mode);syncFloat();}));
 function syncFloat(){$$('[data-r3-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.r3Mode===floating.mode)));}
 new MutationObserver(syncFloat).observe(floating.root,{attributes:true,attributeFilter:['data-mode']});
 $$('.r3-glyph-placeholder').forEach((el,i)=>{const glyph=document.createElement('span');glyph.innerHTML=window.PaiaRefinement.glyph('hero-r3-'+i);el.append(glyph);});
 $$('[data-jump-reuse]').forEach(b=>b.addEventListener('click',()=>{floating.setMode('board');jump('#reuse');}));

   const useData=[
  {key:'product',label:'FROM AN IDEA TO YOUR NEXT STEP',title:'What became clear before<br>is where you begin next.',description:'Product direction, feedback, the choices you keep weighing. Keep your own judgments from each conversation, so the next decision has somewhere to begin.',aLabel:'An idea',a:'I want to make something<br>I would use every day.',bLabel:'A judgment',b:'Useful matters more than looking complete.',next:'Make the core experience genuinely useful.'},
  {key:'writing',label:'FIND YOUR OWN VOICE',title:'A good sentence comes and goes.<br>Your voice stays.',description:'Things you have not quite found the words for, styles you have tried, views becoming clearer. Bring them into one topic, and your writing gains a thread of its own.',aLabel:'A preference',a:'Saying something specific<br>matters more than a beautiful word.',bLabel:'A discovery',b:'Good writing reads like an honest conversation.',next:'Make this piece sound more like me.'},
  {key:'travel',label:'A LITTLE MORE ROOM TO THINK',title:'Your life<br>deserves a little thought, too.',description:'From the next trip to a new habit, keep the preferences and choices you have thought through. Next time, there is no need to explain your life from the start.',aLabel:'A wish',a:'A trip need not be a rush.<br>Leave some time for chance.',bLabel:'A preference',b:'I would rather walk slowly than complete a busy itinerary.',next:'Leave one weekend afternoon unplanned.'}
 ];let currentUse=0;
 $$('[data-use]').forEach(b=>b.addEventListener('click',()=>{currentUse=Number(b.dataset.use);const d=useData[currentUse];$$('[data-use]').forEach(el=>{el.setAttribute('aria-selected',String(el===b));el.tabIndex=el===b?0:-1;});$('#use-panel').setAttribute('aria-labelledby',b.id);$('#use-label').textContent=d.label;$('#use-title').innerHTML=d.title;$('#use-description').textContent=d.description;$('#use-note-a span').textContent=d.aLabel;$('#use-note-a p').innerHTML=d.a;$('#use-note-b span').textContent=d.bLabel;$('#use-note-b p').textContent=d.b;$('#use-next p').textContent=d.next;}));

  const useLink=$('#use-panel .text-arrow');if(useLink){useLink.removeAttribute('data-demo-tab');useLink.addEventListener('click',e=>{e.preventDefault();chooseSection('gallery',useData[currentUse].key,0);jump('#thoughts');});}
  $$('[data-demo-tab]').forEach(b=>b.addEventListener('click',()=>{activateTab(b.dataset.demoTab||'thought');jump('#product');}));
  $$('[role=tablist]').forEach(list=>list.addEventListener('keydown',e=>{if(!['ArrowRight','ArrowLeft','ArrowDown','ArrowUp','Home','End'].includes(e.key))return;const tabs=$$('[role=tab]',list);const index=tabs.indexOf(document.activeElement);if(index<0)return;e.preventDefault();const n=e.key==='Home'?0:e.key==='End'?tabs.length-1:(index+(['ArrowRight','ArrowDown'].includes(e.key)?1:tabs.length-1))%tabs.length;tabs[n].focus({preventScroll:true});tabs[n].click();}));
  const header=$('#site-header');let tick=false;addEventListener('scroll',()=>{if(!tick){requestAnimationFrame(()=>{header.classList.toggle('is-scrolled',scrollY>80);tick=false;});tick=true;}},{passive:true});
  const mb=$('.menu-toggle'),mn=$('#mobile-nav');const closeMenu=()=>{mn.hidden=true;mb.setAttribute('aria-expanded','false');mb.setAttribute('aria-label','Open navigation');};mb.addEventListener('click',()=>{const open=mb.getAttribute('aria-expanded')!=='true';mb.setAttribute('aria-expanded',String(open));mb.setAttribute('aria-label',open?'Close navigation':'Open navigation');mn.hidden=!open;});$$('#mobile-nav a').forEach(a=>a.addEventListener('click',closeMenu));addEventListener('keydown',e=>{if(e.key==='Escape'&&!mn.hidden){closeMenu();mb.focus({preventScroll:true});}});
  if(!reduced&&'IntersectionObserver'in window){document.documentElement.classList.add('js-motion');const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target);}}),{threshold:.03,rootMargin:'0px 0px 50px 0px'});$$('.reveal').forEach(el=>observer.observe(el));}
  const tour=$('#tour-dialog');let step=0,tourFocus=null;const tourData=[
    {label:'01 · Find again',quote:'“The first step is not more features.”',explanation:'Find a past expression from one word you remember. Open it and edit directly.',target:'#archive'},
    {label:'02 · Your library',quote:'Your words begin to form a thread of their own.',explanation:'Explore your expressions by topic and chapter. Try the preset AI organization example inside a topic.',target:'#thoughts'},
    {label:'03 · Carry on',quote:'Good wording, right where you will use it next.',explanation:'Choose a saved expression to add to your current draft. Existing text stays. Sending is still your decision.',target:'#reuse'}
  ];
  function renderTour(){const d=tourData[step];$('#tour-step-label').textContent=d.label;$('#tour-quote').textContent=d.quote;$('#tour-explanation').textContent=d.explanation;$$('[data-tour-step]').forEach((b,i)=>{b.setAttribute('aria-pressed',String(i===step));b.classList.toggle('is-active',i===step);});$('#tour-prev').disabled=step===0;$('#tour-next').textContent='Try it ↗';}
  $$('[data-open-tour]').forEach(b=>b.addEventListener('click',()=>{tourFocus=b;step=0;renderTour();tour.showModal();}));$('.dialog-close',tour).addEventListener('click',()=>tour.close());tour.addEventListener('close',()=>tourFocus?.focus?.({preventScroll:true}));
  $$('[data-tour-step]').forEach(b=>b.addEventListener('click',()=>{step=Number(b.dataset.tourStep);renderTour();}));$('#tour-prev').addEventListener('click',()=>{step=Math.max(0,step-1);renderTour();});$('#tour-next').addEventListener('click',()=>{tour.close();jump(tourData[step].target);});
  renderGallery();renderHero();renderLargeArchive();renderHeroArchive();syncPermissions();renderTour();document.body.dataset.atelierReady="true";
})();

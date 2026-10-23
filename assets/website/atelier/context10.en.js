(() => {'use strict';const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>Array.from(r.querySelectorAll(s));const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));let isComposing=false;document.addEventListener('compositionstart',()=>isComposing=true);document.addEventListener('compositionend',()=>isComposing=false);const canNavigate=()=>!isComposing;const {themes, originals}={"themes": {"product": {"title": "A product of my own", "chapters": [{"name": "Why I started", "source": "product-idea"}, {"name": "The first step", "source": "product-first"}, {"name": "My principles", "source": "product-principle"}]}, "writing": {"title": "Writing in my own voice", "chapters": [{"name": "What I want to say", "source": "writing-start"}, {"name": "Keep my voice", "source": "writing-voice"}, {"name": "Read it once more", "source": "writing-read"}]}, "travel": {"title": "The next journey", "chapters": [{"name": "Leave some room", "source": "travel-space"}, {"name": "A slower choice", "source": "travel-slow"}, {"name": "An unplanned afternoon", "source": "travel-afternoon"}]}}, "originals": [{"id": "product-idea", "theme": "product", "title": "An idea to begin with", "date": "09.04", "time": "22:14", "text": "I want to make something I would use every day. After talking with AI, some of what I said took a long time to think through. When a similar question comes up, I do not want to start over.\n\nStart with a real need of my own, and make one small thing work well."}, {"id": "product-first", "theme": "product", "title": "The first product step", "date": "09.12", "time": "10:32", "text": "Start with a real, recurring problem. The first step is not to add more features, but to make something one person wants to use again.\n\nWhat I do most is find something I said before, change it a little, and use it again. Connect those steps first. The rest can wait."}, {"id": "product-return", "theme": "product", "title": "Pick up where I left off", "date": "09.18", "time": "21:06", "text": "I tried the first version today. After the first step, I realized I needed fewer new features and a quicker way to pick up my last train of thought.\n\nKeeping the reasoning from that moment seems more useful than writing all the background again."}, {"id": "product-principle", "theme": "product", "title": "A choice about simplicity", "date": "09.20", "time": "18:40", "text": "Less interruption, more genuine usefulness. Everyday actions should happen directly. Less frequent organization belongs somewhere I can open when I need it.\n\nI do not want the product to do less. I want the interface to stop interrupting the person doing something."}, {"id": "writing-start", "theme": "writing", "title": "Find the sentence that matters", "date": "09.09", "time": "20:14", "text": "By the third paragraph, I realized there was really only one sentence I wanted to say. Next time I will put that sentence first, then decide which explanations matter.\n\nFinish the draft today; come back to revise tomorrow. Separating writing and editing seems easier."}, {"id": "writing-voice", "theme": "writing", "title": "Keep my own expression", "date": "09.17", "time": "09:26", "text": "Please do not turn my writing into somebody else’s work. Remove repetitions, but keep the slightly awkward expressions that are mine.\n\nHelp me find what is unclear. Keep the language natural rather than replacing it with professional-sounding phrases."}, {"id": "writing-read", "theme": "writing", "title": "Read it aloud, then revise", "date": "09.25", "time": "22:10", "text": "Reading aloud helps. When I need to stop and find the subject, I split the sentence. Good writing should be easy to follow.\n\nWhen an adjective is not precise enough, replace it with something that actually happened."}, {"id": "travel-space", "theme": "travel", "title": "Leave a little room", "date": "09.06", "time": "18:12", "text": "I do not want a long checklist of sights for this trip. I want somewhere I can walk slowly, ideally by the sea, with little places to sit for a while.\n\nThere need not be a sight planned every day. Leave time to change my mind."}, {"id": "travel-slow", "theme": "travel", "title": "A slower kind of trip", "date": "09.20", "time": "12:43", "text": "After comparing routes, I would still rather spend more days in one city. Leaving in the morning without having to catch a train should feel very different.\n\nAccommodation and transport come first in the budget for this trip."}, {"id": "travel-afternoon", "theme": "travel", "title": "The unplanned afternoon", "date": "09.28", "time": "19:08", "text": "Leave an afternoon unplanned, and walk slowly through streets I like. This trip is not about seeing more places; it is about really being there.\n\nBook only the first night first. Leave the rest for places I discover along the way."}]};
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
  function rawProse(t,c,channel,order='desc',readonly=false){return records(t,c,order).map((o,i)=>`<article class="v8-entry"><time datetime="2026-${o.date.replace('.','-')}T${o.time}">${dateText(o,i===0)}</time><div class="v8-entry-body" ${readonly?'':'contenteditable="plaintext-only" role="textbox" aria-multiline="true"'} aria-label="${esc(themes[t].chapters[c].name)}，${dateText(o)}" data-edit-layer="thought" data-edit-id="${o.id}" data-edit-theme="${t}" data-edit-section="${c}" data-edit-channel="${channel}">${esc(thoughtText(t,c,o.id))}</div></article>`).join('');}
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

syncPermissions();})();

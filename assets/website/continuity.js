/* Deterministic, page-local examples. No archive, model, storage or send API. */
(() => {
  'use strict';
  if (document.body.dataset.siteRevision !== 'continuity-v2') return;
  const root = document.querySelector('[data-continuity="v2"]');
  if (!root) return;
  const zh = document.documentElement.lang.startsWith('zh');
  const text = (cn, en) => zh ? cn : en;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const arrive = el => {
    if (!reduced.matches && el.animate) el.animate([{opacity:.45,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],{duration:260,easing:'cubic-bezier(.2,.7,.3,1)'});
  };
  root.querySelectorAll('button:disabled,input:disabled,textarea:disabled').forEach(e => {e.disabled = false;});
  const narrowAtStart = matchMedia('(max-width:640px)').matches;
  if (narrowAtStart) {
    root.querySelector('.ct-hero-change').open = false;
    root.querySelectorAll('[data-case-panel]').forEach(panel => panel.querySelectorAll('[data-chapter]').forEach((section,i) => {section.open = i === 0;}));
  }
  const heroButtons = [...root.querySelectorAll('[data-hero-view]')];
  heroButtons.forEach(button => button.addEventListener('click', () => {
    const key = button.dataset.heroView;
    heroButtons.forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    root.querySelectorAll('[data-hero-panel]').forEach(panel => {
      panel.hidden = panel.dataset.heroPanel !== key;
      if (!panel.hidden) arrive(panel);
    });
  }));

  const search = root.querySelector('#ct-search-input');
  const searchRecords = [...root.querySelectorAll('[data-search-record]')];
  const sourceTexts = new Map(searchRecords.map(e => [e,e.querySelector('[data-search-text]').textContent]));
  function searchWords() {
    const needle = search.value.trim().toLocaleLowerCase();
    let count = 0;
    for (const record of searchRecords) {
      const source = sourceTexts.get(record), content = record.querySelector('[data-search-text]');
      const start = needle ? source.toLocaleLowerCase().indexOf(needle) : -1;
      const matches = !needle || start >= 0;
      record.hidden = !matches;
      content.replaceChildren();
      if (needle && start >= 0) {
        const mark = document.createElement('mark');mark.textContent = source.slice(start,start+needle.length);
        content.append(document.createTextNode(source.slice(0,start)),mark,document.createTextNode(source.slice(start+needle.length)));
      } else content.textContent = source;
      if (matches) count++;
    }
    root.querySelector('.ct-search-empty').hidden = count !== 0;
    root.querySelector('[data-search-status]').textContent = text(`${count} 条匹配 · 仅在 6 条示例原话中查找`,`${count} ${count===1?'match':'matches'} · Searching 6 sample expressions`);
  }
  search.addEventListener('input', searchWords);
  search.addEventListener('keydown', e => {if(e.key === 'Escape'){search.value='';searchWords();}});
  root.querySelector('[data-search-clear]').addEventListener('click', () => {search.value='';searchWords();search.focus({preventScroll:true});});
  searchWords();

  const tabs = [...root.querySelectorAll('[data-case-select]')];
  const panels = [...root.querySelectorAll('[data-case-panel]')];
  const validCases = new Set(tabs.map(b => b.dataset.caseSelect));
  function chooseCase(key, focus = false, updateUrl = true) {
    if (!validCases.has(key)) return;
    tabs.forEach(b => {
      const selected = b.dataset.caseSelect === key;
      b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1;
      if (selected && focus) b.focus({preventScroll:true});
    });
    panels.forEach(panel => {panel.hidden = panel.dataset.casePanel !== key;if(!panel.hidden)arrive(panel);});
    if (updateUrl) {
      const url = new URL(window.location.href);
      url.searchParams.set('case',key);
      history.replaceState(null,'',url.pathname+url.search+url.hash);
      const language = document.querySelector('.header-actions .language');
      if (language) {const target=new URL(language.href);target.searchParams.set('case',key);target.hash='thought-library';language.href=target.pathname+target.search+target.hash;}
    }
  }
  tabs.forEach((tab,i) => {
    tab.addEventListener('click', () => chooseCase(tab.dataset.caseSelect));
    tab.addEventListener('keydown', e => {
      const destinations={ArrowRight:(i+1)%tabs.length,ArrowLeft:(i+tabs.length-1)%tabs.length,Home:0,End:tabs.length-1};
      if (Object.hasOwn(destinations,e.key)) {e.preventDefault();chooseCase(tabs[destinations[e.key]].dataset.caseSelect,true);}
    });
  });
  const initialCase = new URL(window.location.href).searchParams.get('case');
  if (validCases.has(initialCase)) chooseCase(initialCase,false,true);
  panels.forEach(panel => {
    const grouped=panel.querySelector('[data-grouped]'),chronological=panel.querySelector('[data-chronological]');
    const entries=[...panel.querySelectorAll('[data-record-id]')];
    const parents=new Map(entries.map(e=>[e,e.parentElement]));
    const ordered=[...entries].sort((a,b)=>a.querySelector('time').dateTime.localeCompare(b.querySelector('time').dateTime));
    const buttons=[...panel.querySelectorAll('[data-reading-mode]')];
    buttons.forEach(button => button.addEventListener('click', () => {
      const time=button.dataset.readingMode==='time';
      if(time)ordered.forEach(e=>chronological.append(e));
      else entries.forEach(e=>parents.get(e).append(e));
      grouped.hidden=time;chronological.hidden=!time;
      buttons.forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
      arrive(time?chronological:grouped);
    }));
  });

  const draft=root.querySelector('#ct-draft'), board=root.querySelector('#ct-prompt-board');
  const toggle=root.querySelector('[data-prompt-toggle-v2]'),reset=root.querySelector('[data-draft-reset]');
  const status=root.querySelector('[data-draft-status]');
  const initialDraft=draft.value,initialStatus=status.textContent;
  let composing=false,caret=initialDraft.length;
  const remember=()=>{caret=draft.selectionEnd??draft.value.length;};
  ['select','input','keyup','click','blur'].forEach(event=>draft.addEventListener(event,remember));
  draft.addEventListener('compositionstart',()=>{composing=true;});
  draft.addEventListener('compositionend',()=>{composing=false;remember();});
  function insert(phrase) {
    if(composing){status.textContent=text('请先完成正在输入的文字。','Finish composing the current text first.');return;}
    const current=draft.value,at=Math.min(Math.max(0,caret),current.length),before=current.slice(0,at),after=current.slice(at);
    const addition=(before&&!/\s$/.test(before)?'\n':'')+phrase+(after&&!/^\s/.test(after)?'\n':'');
    if(current.length+addition.length>draft.maxLength){status.textContent=text('示例已接近长度上限，原有草稿没有改变。','The sample is near its limit. Your draft has not changed.');return;}
    // Insertion follows the selection; it never replaces selected text.
    draft.setRangeText(addition,at,at,'end');caret=at+addition.length;
    draft.focus({preventScroll:true});draft.setSelectionRange(caret,caret);
    draft.dispatchEvent(new Event('input',{bubbles:true}));
    status.textContent=text('已填入。原有草稿保留，没有发送。','Inserted. The existing draft is intact. Nothing was sent.');
    return true;
  }
  root.querySelectorAll('[data-phrase]').forEach(button=>button.addEventListener('click',()=>insert(button.querySelector('span').textContent)));
  root.querySelector('[data-quote-insert]').addEventListener('click',()=>{
    const inserted=insert(text('之前的原话（2026.05.08）：\n','Earlier expression (8 May 2026):\n')+root.querySelector('[data-kept-quote]').textContent);
    if(inserted){const box=draft.getBoundingClientRect();if(box.top<100||box.bottom>innerHeight-30)draft.scrollIntoView({block:'center',behavior:reduced.matches?'instant':'smooth'});}
  });
  toggle.addEventListener('click',()=>{board.hidden=!board.hidden;toggle.setAttribute('aria-expanded',String(!board.hidden));if(!board.hidden)arrive(board);});
  reset.addEventListener('click',()=>{if(composing)return;draft.value=initialDraft;caret=initialDraft.length;status.textContent=initialStatus;board.hidden=false;toggle.setAttribute('aria-expanded','true');});
  const motionState=()=>document.body.classList.toggle('hp-static',reduced.matches);
  reduced.addEventListener('change',motionState);motionState();
  document.body.classList.add('hp-ready','ct-ready');
})();

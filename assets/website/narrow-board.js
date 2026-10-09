/* Website-only NIB v4 illustration. Fictional data, no storage, AI, capture or send. */
(() => {
  'use strict';
  const root = document.querySelector('[data-narrow-board]');
  if (!root) return;
  const zh = root.dataset.locale === 'zh';
  const t = (cn,en) => zh ? cn : en;
  const $ = s => root.querySelector(s);
  const all = s => [...root.querySelectorAll(s)];
  const card = $('#pc-prompt-card'), toggle = $('[data-prompt-toggle]');
  const composer = $('#pc-composer'), list = $('[data-prompt-list]');
  const fixture = JSON.parse($('[data-nb-fixture]').textContent);
  const saved = new Map(all('[data-prompt-row]').map(row => [row.dataset.promptRow, row.querySelector('textarea').value]));
  let mode = 'candidates', from = 'candidates', opener = null, inspected = null;
  let editing = null, selection = null, point = null, composing = false, searchComposing = false;
  let frame = 0, dragging = null;
  all('[disabled]').forEach(el => { el.disabled = false; });
  const status = message => { $('[data-nb-status]').textContent = message; };
  function valueOf(ref) {
    if (ref.kind === 'prompt') return saved.get(ref.id) ?? '';
    const field = document.querySelector(`[data-working="${CSS.escape(ref.id)}"]`);
    return field ? field.value : (fixture.find(row => row.id === ref.id)?.text ?? '');
  }
  function dirty() { return editing && editing.querySelector('textarea').value !== saved.get(editing.dataset.promptRow); }
  function blockedEdit() {
    if (!dirty()) return false;
    status(t('请先保存或放弃修改。文字仍留在这里。','Save or discard your edits first. Your wording is still here.'));
    return true;
  }
  function geometry() {
    frame = 0;
    const host = root.getBoundingClientRect(), head = $('.nb-native-head').getBoundingClientRect();
    const input = $('.nb-composer').getBoundingClientRect();
    root.style.setProperty('--nb-width', `${Math.max(0, Math.min(innerWidth <= 400 ? 322 : 336, root.clientWidth - 32))}px`);
    $('.nb-anchor').style.bottom = `${Math.max(12, host.bottom - input.top + 12)}px`;
    const room = input.top - head.bottom - 24 - $('.nb-toggle-line').offsetHeight - 8;
    const usable = room >= 120;
    root.dataset.layoutAvailable = String(usable);
    card.style.maxHeight = `${Math.max(0,room)}px`;
    $('[data-nb-layout-notice]').hidden = card.hidden || usable;
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(geometry); }
  new ResizeObserver(schedule).observe(root);
  new ResizeObserver(schedule).observe($('.nb-composer'));
  addEventListener('resize',schedule,{passive:true});
  document.fonts.ready.then(schedule);
  function fitComposer() {
    composer.style.height = 'auto';
    composer.style.height = `${Math.min(Math.max(composer.scrollHeight + 2,66),200)}px`;
    schedule();
  }
  const remember = () => { point = {position:composer.selectionEnd,draft:composer.value}; };
  ['focus','input','select','keyup','pointerup','blur'].forEach(type => composer.addEventListener(type,remember));
  composer.addEventListener('input',fitComposer);
  composer.addEventListener('compositionstart',() => { composing = true; });
  composer.addEventListener('compositionend',() => { composing = false; remember(); fitComposer(); });
  function insert(value,ref=null) {
    if (composing) { status(t('请先完成当前输入。','Finish the current composition first.')); return false; }
    if (ref && valueOf(ref) !== inspected?.text) { status(t('这条内容已改变。请返回后重新核对。','This input changed. Go back and inspect it again.')); return false; }
    if (!value.trim()) return false;
    const draft = composer.value;
    const position = point?.draft === draft ? Math.min(point.position,draft.length) : draft.length;
    const before = draft.slice(0,position), after = draft.slice(position);
    const inserted = before + (before ? '\n\n' : '') + value;
    const next = inserted + (after ? '\n\n' : '') + after;
    if (next.length > composer.maxLength) { status(t('超过本页输入框的 1000 字符上限。未截断或改动草稿。','This exceeds the demo composer’s 1,000-character limit. Your draft was not changed or truncated.')); return false; }
    composer.value = next;
    fitComposer(); composer.focus({preventScroll:true}); composer.setSelectionRange(inserted.length,inserted.length); remember();
    const message = t('已填入本页输入框 · 没有发送','Inserted in this page’s composer · Not sent');
    $('[data-prompt-status]').textContent = message; status(message);
    return true;
  }
  function show(next,focus=null) {
    mode = next; root.dataset.mode = editing ? 'edit' : next;
    all('[data-nb-view]').forEach(view => { view.hidden = view.dataset.nbView !== next; });
    $('[data-nb-back]').hidden = next === 'candidates' && !editing;
    $('[data-nb-search-open]').hidden = next !== 'candidates' || Boolean(editing);
    $('[data-nb-label]').textContent = editing ? t('编辑常用输入','Edit frequent input') : next === 'search' ? t('搜索输入档案','Search input archive') : next === 'check' ? t('核对原话','Inspect the wording') : t('常用输入','Frequent inputs');
    schedule(); if (focus) focus.focus({preventScroll:true});
  }
  function setOpen(open) {
    if (!open && blockedEdit()) return;
    card.hidden = !open; toggle.setAttribute('aria-expanded',String(open));
    $('.nb-open-label').textContent = open ? t('自己选择，自己发送','You choose. You send.') : t('点开，用上自己的原话','Open your own words');
    if (!open) toggle.focus({preventScroll:true});
    geometry();
  }
  toggle.addEventListener('click',() => setOpen(card.hidden));
  function inspect(ref,origin,returnMode=mode) {
    if (blockedEdit()) return;
    if (editing) finishEdit(false);
    const body = valueOf(ref);
    if (!body) { status(t('这条示例已没有内容。','This example has no content.')); return; }
    from = returnMode === 'check' ? 'candidates' : returnMode; opener = origin; inspected = {...ref,text:body}; selection = null;
    $('[data-nb-check-body]').textContent = body;
    const source = ref.kind === 'input' ? fixture.find(row => row.id === ref.id) : null;
    $('[data-nb-source]').textContent = source ? `${source.date} · ChatGPT · ${source.source}` : t('自己的常用表达 · 可手动修改','Your frequent wording · Manually editable');
    setOpen(true); show('check',$('[data-nb-check-body]')); syncSelection();
    status(t('先核对完整内容，再决定使用全文或一段。','Inspect the full wording, then use all of it or a selected passage.'));
  }
  function needsInspection(label,value) {
    return label.scrollWidth > label.clientWidth + 1 || /[\r\n\t]| {2,}/.test(value) || value !== value.trim();
  }
  function pick(ref,button) {
    const value = valueOf(ref), label = button.querySelector('[data-prompt-label]') || button.querySelector('span');
    if (label.textContent !== value) {
      inspect(ref,button);
      status(t('这条内容已变化。请核对当前全文后再使用。','This wording changed. Inspect the current full text before using it.'));
      return;
    }
    if (needsInspection(label,value)) inspect(ref,button); else insert(value);
  }
  function syncSelection() {
    all('[data-nb-insert-selection],[data-nb-copy-selection]').forEach(button => { button.disabled = !selection; button.hidden = !selection; });
    schedule();
  }
  document.addEventListener('selectionchange',() => {
    if (mode !== 'check' || !inspected) return;
    const selected = getSelection(), body = $('[data-nb-check-body]');
    if (!selected?.rangeCount || selected.isCollapsed) return;
    const range = selected.getRangeAt(0);
    if (!body.contains(range.startContainer) || !body.contains(range.endContainer)) return;
    const prefix = range.cloneRange(); prefix.selectNodeContents(body); prefix.setEnd(range.startContainer,range.startOffset);
    const start = prefix.toString().length, end = start + range.toString().length;
    if (inspected.text.slice(start,end) === range.toString()) selection = {start,end};
    syncSelection();
  });
  function inspectedValue(partial) {
    if (!inspected || valueOf(inspected) !== inspected.text) { status(t('内容已改变，请重新核对。','The wording changed; inspect it again.')); return null; }
    if (partial && !selection) return null;
    return partial ? inspected.text.slice(selection.start,selection.end) : inspected.text;
  }
  function useInspection(partial) { const value = inspectedValue(partial); if (value !== null) insert(value,inspected); }
  $('[data-nb-insert-full]').addEventListener('click',() => useInspection(false));
  $('[data-nb-insert-selection]').addEventListener('click',() => useInspection(true));
  async function copy(partial) {
    const value = inspectedValue(partial); if (value === null) return;
    try { if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable'); await navigator.clipboard.writeText(value); status(t('已复制原话，没有附加标题或来源。','Wording copied, without an added title or source.')); }
    catch { status(t('未能复制。请在上方选择原话，手动复制。','Copy failed. Select the wording above and copy it manually.')); }
  }
  $('[data-nb-copy-full]').addEventListener('click',() => copy(false));
  $('[data-nb-copy-selection]').addEventListener('click',() => copy(true));
  function search() {
    const query = $('[data-nb-query]').value.trim().normalize('NFKC').toLocaleLowerCase();
    const results = $('[data-nb-results]'); results.replaceChildren();
    for (const row of fixture) {
      const ref = {kind:'input',id:row.id}, value = valueOf(ref);
      if (!value.normalize('NFKC').toLocaleLowerCase().includes(query)) continue;
      const button = document.createElement('button'), label = document.createElement('span');
      button.type = 'button'; button.className = 'nb-result'; button.dataset.nbResult = row.id; label.textContent = value; button.append(label);
      button.addEventListener('click',() => pick(ref,button)); results.append(button);
    }
    $('[data-nb-empty]').hidden = results.children.length !== 0;
    status(t(`本页 ${results.children.length} 条匹配 · 非实时档案`,`This page: ${results.children.length} matches · Not a live archive`)); schedule();
  }
  $('[data-nb-search-open]').addEventListener('click',() => { if (blockedEdit()) return; search(); show('search',$('[data-nb-query]')); });
  $('[data-nb-query]').addEventListener('compositionstart',() => { searchComposing = true; });
  $('[data-nb-query]').addEventListener('compositionend',() => { searchComposing = false; search(); });
  $('[data-nb-query]').addEventListener('input',() => { if (!searchComposing) search(); });
  function finishEdit(save) {
    if (!editing) return;
    const row = editing, field = row.querySelector('textarea'), key = row.dataset.promptRow;
    if (save && !field.value.trim()) { status(t('请保留至少一句内容，或放弃修改。','Keep some wording, or discard your changes.')); return; }
    if (save) saved.set(key,field.value); else field.value = saved.get(key);
    row.querySelector('[data-prompt-label]').textContent = saved.get(key);
    row.querySelector('.pc-prompt-management').hidden = true; row.querySelector('[data-prompt-manage]').setAttribute('aria-expanded','false');
    row.classList.remove('is-editing'); editing = null; show('candidates',row.querySelector('[data-prompt-manage]'));
    status(save ? t('常用表达已在本页修改；没有改动档案原话。','Frequent wording updated on this page; archived inputs were not changed.') : t('已放弃这次修改。','Changes discarded.'));
  }
  function back() {
    if (editing) { if (!blockedEdit()) finishEdit(false); return; }
    if (mode === 'check') { const id = inspected?.id; inspected = null; selection = null; if (from === 'search') search(); const target = from === 'search' && id ? root.querySelector(`[data-nb-result="${CSS.escape(id)}"]`) : null; show(from,opener?.isConnected ? opener : (target || (from === 'search' ? $('[data-nb-query]') : $('[data-prompt-pick]')))); }
    else if (mode === 'search') show('candidates',$('[data-nb-search-open]'));
    else setOpen(false);
  }
  $('[data-nb-back]').addEventListener('click',back);
  function rank() {
    const rows = [...list.children];
    rows.forEach((row,i) => {
      row.querySelector('[data-rank]').textContent = String(i+1).padStart(2,'0');
      row.querySelector('[data-move="-1"]').disabled = !i || rows[i-1].classList.contains('is-pinned') !== row.classList.contains('is-pinned');
      row.querySelector('[data-move="1"]').disabled = i === rows.length-1 || rows[i+1].classList.contains('is-pinned') !== row.classList.contains('is-pinned');
    }); schedule();
  }
  all('[data-prompt-row]').forEach(row => {
    const key = row.dataset.promptRow, field = row.querySelector('textarea'), manage = row.querySelector('[data-prompt-manage]');
    row.querySelector('[data-prompt-pick]').addEventListener('click',event => pick({kind:'prompt',id:key},event.currentTarget));
    manage.addEventListener('click',() => {
      if (blockedEdit()) return;
      if (editing) finishEdit(false);
      editing = row; field.value = saved.get(key); row.classList.add('is-editing'); row.querySelector('.pc-prompt-management').hidden = false;
      manage.setAttribute('aria-expanded','true'); show('candidates',field);
    });
    field.addEventListener('input',() => { status(t('本页未保存修改。','Unsaved changes on this page.')); schedule(); });
    row.querySelector('[data-edit-save]').addEventListener('click',() => finishEdit(true));
    row.querySelector('[data-edit-cancel]').addEventListener('click',() => finishEdit(false));
    row.querySelector('[data-insert]').addEventListener('click',() => { if (!blockedEdit()) insert(saved.get(key)); });
    row.querySelector('[data-pin]').addEventListener('click',event => {
      const pinned = row.classList.toggle('is-pinned'), control = event.currentTarget;
      control.setAttribute('aria-pressed',String(pinned)); control.textContent = pinned ? t('已固定','Pinned') : t('固定','Pin');
      control.setAttribute('aria-label',pinned ? t('取消固定提示词','Unpin prompt') : t('固定提示词','Pin prompt'));
      [...list.children].sort((a,b)=>Number(b.classList.contains('is-pinned'))-Number(a.classList.contains('is-pinned'))).forEach(item=>list.append(item)); rank(); control.focus({preventScroll:true});
    });
    row.querySelectorAll('[data-move]').forEach(control => control.addEventListener('click',() => {
      const delta = Number(control.dataset.move), other = delta < 0 ? row.previousElementSibling : row.nextElementSibling;
      if (!other || other.classList.contains('is-pinned') !== row.classList.contains('is-pinned')) return;
      if (delta < 0) list.insertBefore(row,other); else list.insertBefore(other,row);
      rank(); (control.disabled ? row.querySelector('[data-insert]') : control).focus({preventScroll:true});
    }));
    const grip = row.querySelector('.pc-grip'); grip.draggable = true;
    grip.addEventListener('dragstart',event => { dragging = row; event.dataTransfer.setData('text/plain',key); });
    row.addEventListener('dragover',event => { if (dragging && dragging !== row && dragging.classList.contains('is-pinned') === row.classList.contains('is-pinned')) event.preventDefault(); });
    row.addEventListener('drop',event => {
      if (!dragging || dragging === row || dragging.classList.contains('is-pinned') !== row.classList.contains('is-pinned')) return;
      event.preventDefault(); list.insertBefore(dragging,event.clientY > row.getBoundingClientRect().top + row.offsetHeight/2 ? row.nextElementSibling : row); dragging = null; rank();
    }); grip.addEventListener('dragend',() => { dragging = null; });
  });
  card.addEventListener('keydown',event => {
    if (event.isComposing || searchComposing || composing) return;
    if (event.key === 'Escape') { event.preventDefault(); back(); return; }
    if (editing || mode === 'check') return;
    const picks = [...card.querySelectorAll('[data-prompt-pick], [data-nb-result]')].filter(el => el.getClientRects().length);
    if (event.target === $('[data-nb-query]') && event.key === 'Enter' && picks.length) { event.preventDefault(); picks[0].focus(); return; }
    if (!picks.includes(event.target)) return;
    const index = picks.indexOf(event.target);
    let next = null;
    if (event.key === 'ArrowDown') next = (index+1)%picks.length;
    if (event.key === 'ArrowUp') next = (index+picks.length-1)%picks.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = picks.length-1;
    if (next !== null) { event.preventDefault(); picks[next].focus(); }
  });
  document.querySelectorAll('[data-story-reuse]').forEach(link => link.addEventListener('click',() => {
    inspect({kind:'input',id:link.dataset.storyReuse},link,'candidates');
  }));
  const layoutClose = document.createElement('button'); layoutClose.type = 'button'; layoutClose.className = 'pc-quiet';
  layoutClose.textContent = t('收起浮板','Close the board'); layoutClose.addEventListener('click',() => setOpen(false)); $('[data-nb-layout-notice]').append(layoutClose);
  rank(); syncSelection(); fitComposer(); show('candidates');
})();

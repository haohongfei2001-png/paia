/* Ephemeral website examples. No archive, model, storage or permission APIs. */
(() => {
  'use strict';
  const zh = document.documentElement.lang.startsWith('zh');
  const t = (z, e) => zh ? z : e;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const promptLimit = 150;
  const graphemeSegmenter = typeof Intl.Segmenter === 'function'
    ? new Intl.Segmenter(undefined, {granularity:'grapheme'}) : null;
  // Code-point counting is a conservative fallback when grapheme segmentation
  // is unavailable. Never silently truncate or rewrite a visitor's expression.
  const characterCount = value => graphemeSegmenter
    ? [...graphemeSegmenter.segment(value)].length : [...value].length;
  const node = (tag, className, text) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  };
  const action = (label, dataName, value, className = 'quiet-button') => {
    const button = node('button', className, label);
    button.type = 'button';
    button.dataset[dataName] = value;
    return button;
  };
  const decorateDialog = (dialog, closeButton, restoreFocus) => {
    closeButton.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right ||
          event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    });
    dialog.addEventListener('close', () => restoreFocus()?.focus({preventScroll:true}));
  };

  for (const root of $$('[data-context]')) {
    const writingExample = root.dataset.persona === 'writing';
    // Editing/removing content never mutates these independent permission bits.
    const state = {global:false, info:false, rules:false, now:false, inputs:false, product:false, writing:false};
    const titles = {info:t('我的信息','My Information'),rules:t('我的规则','My Rules'),now:t('我的现在','My Now'),inputs:t('我的输入','My Inputs')};
    const items = {
      info:{text:writingExample ? t('我习惯用写作，慢慢想清楚自己的经历。','I use writing to make sense of my experiences.') : t('我正在探索一个个人软件产品。','I am exploring an idea for a personal software product.'), removed:false},
      rules:{text:t('先检查我的前提。保留不确定性。用具体的例子说明。','Check my assumptions. Keep the uncertainty. Use concrete examples.'), removed:false},
      now:{text:writingExample ? t('我正在写一篇关于离开家的随笔，想从搬家那天的细节开始。','I am writing a piece about leaving home, starting with details from moving day.') : t('这周先把核心体验做清楚，再决定增加哪些功能。','This week, clarify the core experience before deciding what to add.'), removed:false},
    };
    // References to the two existing sample topics. No copied or generated body.
    const topics = [
      {id:'product', label:t('做一个值得用的产品','Making something worth using')},
      {id:'writing', label:t('用自己的语言写作','Writing in my own voice')},
    ];
    const dialog = $('[data-context-dialog]', root);
    const feedback = $('[data-context-edit-status]', root);
    let opener = null;
    const update = () => {
      $('[data-context-global]', root).setAttribute('aria-checked', String(state.global));
      $$('[data-context-scope]', root).forEach(button => {
        const key = button.dataset.contextScope;
        button.setAttribute('aria-checked', String(state[key]));
        const card = button.closest('[data-card]');
        card.dataset.allowed = String(state[key]);
        const empty = items[key] && (items[key].removed || !items[key].text.trim());
        $('[data-card-status]', card).textContent = empty
          ? t('暂无内容','No content')
          : state[key]
            ? (state.global ? t('范围已选择','Scope selected') : t('已选择 · 总访问关闭','Selected · Main access off'))
            : t('未开放','Closed');
      });
      $$('[data-topic-allow]', root).forEach(button => {
        const key = button.dataset.topicAllow;
        button.setAttribute('aria-checked', String(state[key]));
        const row = button.closest('[data-topic-reference]');
        $('[data-topic-status]', row).textContent = state[key]
          ? (state.global && state.inputs ? t('已选择','Selected') : t('已选择 · 上级关闭','Selected · Parent access off'))
          : t('未开放','Closed');
      });
      const readable = Object.keys(items).filter(key => state[key] && !items[key].removed && items[key].text.trim()).length;
      const readableTopics = state.inputs ? topics.filter(topic => state[topic.id]).length : 0;
      $('[data-context-status]', root).textContent = !state.global
        ? t('总访问已关闭。卡片与主题的选择仍会保留在本页。','Main access is off. Card and topic choices remain in this page.')
        : readable + readableTopics === 0
          ? t('总访问已打开，尚未选择可读内容。这个演示没有连接 AI。','Main access is on; no readable content is selected. This example has no AI connection.')
          : t(`本页已选择 ${readable} 张内容卡片、${readableTopics} 个主题。没有连接 AI，也没有发送资料。`, `${readable} content cards and ${readableTopics} topics selected here. No AI connection; nothing is sent.`);
    };
    const renderDetail = key => {
      const detail = $('[data-context-detail]', root);
      detail.replaceChildren();
      if (key === 'inputs') {
        detail.append(node('p','context-detail-intro', t('选择已有的个人主题。开放主题不会打开总访问或卡片权限。','Choose from existing personal topics. Selecting a topic does not open main or card access.')));
        for (const topic of topics) {
          const row = node('div','topic-permission');
          row.dataset.topicReference = topic.id;
          const text = node('div','topic-reference-copy');
          text.append(node('strong','',topic.label));
          const status = node('span');
          status.dataset.topicStatus = '';
          text.append(status);
          const toggle = action('', 'topicAllow', topic.id, 'switch small-switch');
          toggle.setAttribute('role','switch');
          toggle.setAttribute('aria-label',t('开放主题：','Open topic: ')+topic.label);
          toggle.setAttribute('aria-checked',String(state[topic.id]));
          toggle.append(node('span'));
          toggle.addEventListener('click',()=>{state[topic.id]=!state[topic.id];update();});
          row.append(text,toggle);
          detail.append(row);
        }
        update();
        return;
      }
      const item = items[key];
      const entry = node('div','context-edit-entry');
      entry.dataset.contextEntry = key;
      entry.hidden = item.removed;
      const label = node('label','context-field-label',t('内容','Content'));
      const field = node('textarea','context-edit-field');
      field.id = `${dialog.id}-text-${key}`;
      field.dataset.contextText = key;
      field.rows = 4;
      field.maxLength = 1500;
      field.value = item.text;
      label.htmlFor = field.id;
      field.addEventListener('input',()=>{
        item.text=field.value;
        feedback.textContent=t('修改已保留在本页。读取权限未改变。','Edit kept in this page. Access is unchanged.');
        update();
      });
      const remove = action(t('删除内容','Delete content'),'contextRemove',key,'quiet-button personal-remove');
      remove.addEventListener('click',()=>{
        item.removed=true;
        renderDetail(key);
        update();
        feedback.textContent=t('内容已删除，读取开关未改变。可以撤销。','Content deleted. Access switches are unchanged. You can undo.');
        $(`[data-context-undo="${key}"]`,root).focus({preventScroll:true});
      });
      entry.append(label,field,remove);
      const empty = node('div','context-empty');
      empty.dataset.contextEmpty=key;
      empty.hidden=!item.removed;
      empty.append(node('p','',t('这张卡片暂无内容。','There is no content in this card.')));
      const undo = action(t('撤销删除','Undo deletion'),'contextUndo',key);
      undo.addEventListener('click',()=>{
        item.removed=false;
        renderDetail(key);
        update();
        feedback.textContent=t('内容已恢复。读取权限未改变。','Content restored. Access is unchanged.');
        $(`[data-context-text="${key}"]`,root).focus({preventScroll:true});
      });
      empty.append(undo);
      detail.append(entry,empty);
    };
    $('[data-context-global]', root).addEventListener('click',()=>{state.global=!state.global;update();});
    $$('[data-context-scope]', root).forEach(button=>button.addEventListener('click',()=>{
      state[button.dataset.contextScope]=!state[button.dataset.contextScope];update();
    }));
    $$('[data-context-open]', root).forEach(button=>button.addEventListener('click',()=>{
      opener=button;
      const key=button.dataset.contextOpen;
      $('[data-context-title]',root).textContent=titles[key];
      feedback.textContent='';
      renderDetail(key);
      dialog.showModal();
    }));
    decorateDialog(dialog,$('[data-context-close]',root),()=>opener?.isConnected?opener:null);
    dialog.addEventListener('close',()=>{$('[data-context-detail]',root).replaceChildren();feedback.textContent='';});
    update();
  }

  for (const root of $$('[data-prompt-demo]')) {
    const composer=$('[data-composer]',root);
    const initialDraft=composer.value;
    const toggle=$('[data-prompt-toggle]',root);
    const board=$('[data-prompt-board]',root);
    const list=$('[data-prompt-list]',root);
    const capsule=$('.prompt-capsule',root);
    const search=$('[data-prompt-search]',root);
    const status=$('[data-prompt-status]',root);
    const manager=$('[data-prompt-manager]',root);
    const managerList=$('[data-prompt-manager-list]',root);
    const managerStatus=$('[data-prompt-manager-status]',root);
    const undo=$('[data-prompt-undo]',root);
    const originals=$$('[data-prompt-id]',list).map((button,index)=>({id:button.dataset.promptId,text:button.dataset.promptPick,pinned:false,hidden:false,order:index}));
    let items=originals.map(item=>({...item}));
    let insertionPoint={position:composer.value.length,draft:composer.value};
    let composing=false;
    let blockedPointerPick=null;
    let editing=null;
    let editDraft='';
    let opener=null;
    const history=[];
    const remember=()=>{insertionPoint={position:composer.selectionEnd,draft:composer.value};};
    for(const event of ['focus','input','select','keyup','pointerup','click','blur']) composer.addEventListener(event,remember);
    composer.addEventListener('compositionstart',()=>{composing=true;});
    composer.addEventListener('compositionend',()=>{composing=false;remember();});
    const ordered=()=>items.filter(item=>!item.hidden).sort((a,b)=>Number(b.pinned)-Number(a.pinned)||a.order-b.order);
    const itemById=id=>items.find(item=>item.id===id);
    const setOpen=open=>{
      board.hidden=!open;
      capsule.hidden=open||!ordered().length;
      toggle.setAttribute('aria-expanded',String(open));
      toggle.setAttribute('aria-label',open?t('收起个人提示词','Close personal prompts'):t('打开个人提示词','Open personal prompts'));
    };
    const filter=()=>{
      const q=search.value.trim().toLocaleLowerCase();
      let found=0;
      $$('[data-prompt-pick]',list).forEach(button=>{
        button.hidden=!button.textContent.toLocaleLowerCase().includes(q);
        if(!button.hidden)found++;
      });
      const empty=$('[data-prompt-empty]',root);
      empty.hidden=found>0;
      empty.textContent=ordered().length?t('没有找到，换个词试试。','No match. Try a different word.'):t('暂无提示词，可以在管理中撤销隐藏。','No prompts. Undo a hidden item in management.');
    };
    const renderBoard=()=>{
      const active=ordered();
      list.replaceChildren();
      for(const item of active){
        const button=action(item.text,'promptPick',item.text,'');
        button.dataset.promptId=item.id;
        button.dataset.pinned=String(item.pinned);
        button.setAttribute('aria-label',item.text+(item.pinned?t('，已固定',', pinned'):''));
        list.append(button);
      }
      const suggestion=active.find(item=>item.id===capsule.dataset.promptId)||active[0];
      if(suggestion){
        capsule.dataset.promptId=suggestion.id;
        capsule.dataset.promptPick=suggestion.text;
        capsule.textContent=suggestion.text;
      }
      capsule.hidden=!board.hidden||!suggestion;
      filter();
    };
    const insert=button=>{
      if(composing||blockedPointerPick===button){
        blockedPointerPick=null;
        status.textContent=t('先完成当前输入，再填入提示词。','Finish composing your text before inserting a prompt.');
        return;
      }
      const item=itemById(button.dataset.promptId);
      if(!item||item.hidden||!item.text.trim())return;
      if(characterCount(item.text)>promptLimit){
        status.textContent=t('这句超过 150 个字符，请先在管理中缩短。','This phrase exceeds 150 characters. Shorten it in management first.');
        return;
      }
      const draft=composer.value;
      const at=insertionPoint?.draft===draft?Math.max(0,Math.min(insertionPoint.position,draft.length)):draft.length;
      const before=draft.slice(0,at),after=draft.slice(at);
      const lead=before?'\n\n':'',trail=after?'\n\n':'';
      composer.setRangeText(lead+item.text+trail,at,at,'end');
      const caret=at+lead.length+item.text.length;
      composer.focus({preventScroll:true});
      composer.setSelectionRange(caret,caret);
      composer.dispatchEvent(new Event('input',{bubbles:true}));
      remember();
      status.textContent=t('已填入本页输入框。草稿保留，没有发送。','Inserted here. Your draft is intact. Nothing was sent.');
      // Insertion changes neither panel state nor prompt order.
    };
    root.addEventListener('pointerdown',event=>{
      const pick=event.target.closest('[data-prompt-pick]');
      if(!pick||!root.contains(pick))return;
      blockedPointerPick=composing?pick:null;
      if(composing)event.preventDefault();
    });
    root.addEventListener('click',event=>{
      const pick=event.target.closest('[data-prompt-pick]');
      if(pick&&root.contains(pick))insert(pick);
    });
    toggle.addEventListener('click',()=>setOpen(board.hidden));
    root.addEventListener('keydown',event=>{
      if(event.key!=='Escape'||event.isComposing||manager.open)return;
      if(!board.hidden){event.preventDefault();setOpen(false);toggle.focus({preventScroll:true});}
    });
    search.addEventListener('input',filter);

    const renderManager=(focusSelector=null)=>{
      managerList.replaceChildren();
      const active=ordered();
      if(!active.length)managerList.append(node('p','prompt-manager-empty',t('列表空了。你可以撤销刚才的隐藏。','The list is empty. You can undo the last hidden item.')));
      active.forEach((item,index)=>{
        const row=node('div','prompt-manager-row');
        row.dataset.promptManagerRow=item.id;
        if(editing===item.id){
          const label=node('label','context-field-label',t('提示词内容','Prompt text'));
          const field=node('textarea','prompt-manager-field');
          field.id=`${manager.id}-edit-${item.id}`;
          field.dataset.promptText=item.id;
          field.rows=3;field.value=editDraft;
          label.htmlFor=field.id;
          field.addEventListener('input',()=>{editDraft=field.value;field.removeAttribute('aria-invalid');});
          const actions=node('div','prompt-editor-actions');
          actions.append(action(t('保留修改','Keep edit'),'promptSave',item.id,'button button-small'),action(t('取消','Cancel'),'promptCancel',item.id));
          row.append(label,field,actions);
        }else{
          const edit=action(item.text,'promptEdit',item.id,'prompt-manager-expression');
          edit.setAttribute('aria-label',t('编辑提示词：','Edit prompt: ')+item.text);
          row.append(edit);
        }
        const controls=node('div','prompt-manager-actions');
        const pin=action(item.pinned?t('已固定','Pinned'):t('固定到前面','Pin to top'),'promptPin',item.id);
        pin.setAttribute('aria-pressed',String(item.pinned));
        pin.setAttribute('aria-label',(item.pinned?t('取消固定：','Unpin: '):t('固定提示词：','Pin: '))+item.text);
        const up=action('↑','promptUp',item.id,'quiet-button prompt-order-button');
        up.setAttribute('aria-label',t('上移提示词','Move prompt up'));
        up.disabled=index===0||active[index-1].pinned!==item.pinned;
        const down=action('↓','promptDown',item.id,'quiet-button prompt-order-button');
        down.setAttribute('aria-label',t('下移提示词','Move prompt down'));
        down.disabled=index===active.length-1||active[index+1].pinned!==item.pinned;
        const hide=action(t('隐藏','Hide'),'promptHide',item.id,'quiet-button personal-remove');
        controls.append(pin,up,down,hide);
        row.append(controls);
        managerList.append(row);
      });
      undo.hidden=!history.length;
      if(focusSelector)$(focusSelector,manager)?.focus({preventScroll:true});
    };
    manager.addEventListener('click',event=>{
      const button=event.target.closest('button');
      if(!button||!manager.contains(button))return;
      const data=button.dataset;
      const id=data.promptEdit||data.promptSave||data.promptCancel||data.promptPin||data.promptHide||data.promptUp||data.promptDown;
      if(!id)return;
      const item=itemById(id);
      if(!item)return;
      if(data.promptEdit){
        if(editing&&editing!==id){
          managerStatus.textContent=t('先保留或取消当前修改。','Keep or cancel the current edit first.');
          $(`[data-prompt-text="${editing}"]`,manager)?.focus();return;
        }
        editing=id;editDraft=item.text;renderManager(`[data-prompt-text="${id}"]`);return;
      }
      if(data.promptSave){
        if(!editDraft.trim()){
          managerStatus.textContent=t('先写下一句提示词。','Write a prompt before keeping it.');
          $(`[data-prompt-text="${id}"]`,manager)?.focus();return;
        }
        const length=characterCount(editDraft);
        if(length>promptLimit){
          managerStatus.textContent=t(`请保持在 150 个字符以内。当前 ${length} 个，修改后再保存。`, `Keep the phrase within 150 characters. It currently has ${length}; shorten it before saving.`);
          const field=$(`[data-prompt-text="${id}"]`,manager);
          field?.setAttribute('aria-invalid','true');field?.focus();return;
        }
        item.text=editDraft;editing=null;editDraft='';renderBoard();renderManager(`[data-prompt-edit="${id}"]`);
        managerStatus.textContent=t('修改已保留在本页。','Edit kept in this page.');return;
      }
      if(data.promptCancel){editing=null;editDraft='';renderManager(`[data-prompt-edit="${id}"]`);managerStatus.textContent=t('已取消这次修改。','Edit cancelled.');return;}
      if(data.promptHide){
        history.push({id:item.id,order:item.order,pinned:item.pinned});
        item.hidden=true;
        if(editing===id){editing=null;editDraft='';}
        renderBoard();renderManager();undo.focus({preventScroll:true});
        managerStatus.textContent=t('已从列表隐藏，可以撤销。','Hidden from the list. You can undo.');return;
      }
      if(data.promptPin){
        item.pinned=!item.pinned;
        renderBoard();renderManager(`[data-prompt-pin="${id}"]`);
        managerStatus.textContent=item.pinned?t('已固定在未固定的提示词前面。','Pinned above unpinned prompts.'):t('已取消固定。','Unpinned.');return;
      }
      if(data.promptUp||data.promptDown){
        const active=ordered(),index=active.findIndex(p=>p.id===id),other=active[index+(data.promptUp?-1:1)];
        if(!other||other.pinned!==item.pinned)return;
        [item.order,other.order]=[other.order,item.order];
        renderBoard();renderManager(`[data-prompt-edit="${id}"]`);
        managerStatus.textContent=t('顺序已更新。','Order updated.');
      }
    });
    undo.addEventListener('click',()=>{
      const previous=history.pop();
      if(!previous)return;
      const item=itemById(previous.id);
      item.hidden=false;item.order=previous.order;item.pinned=previous.pinned;
      renderBoard();renderManager(`[data-prompt-edit="${item.id}"]`);
      managerStatus.textContent=t('提示词已恢复。','Prompt restored.');
    });
    $('[data-prompt-manage]',root).addEventListener('click',event=>{
      opener=event.currentTarget;managerStatus.textContent='';renderManager();manager.showModal();
      if(editing)$(`[data-prompt-text="${editing}"]`,manager)?.focus({preventScroll:true});
    });
    decorateDialog(manager,$('[data-prompt-manager-close]',root),()=>opener?.isConnected?opener:toggle);
    // Closing/reopening preserves the in-progress edit. Only explicit cancel,
    // keep, hide of that item, or resetting the example changes that draft.
    $('[data-prompt-reset]',root).addEventListener('click',()=>{
      items=originals.map(item=>({...item}));history.length=0;editing=null;editDraft='';
      composer.value=initialDraft;composer.setSelectionRange(initialDraft.length,initialDraft.length);remember();
      search.value='';capsule.dataset.promptId='p0';renderBoard();setOpen(false);
      status.textContent=t('示例已重置。只填入，不自动发送。','Sample reset. Fills the composer, never sends.');
    });
    renderBoard();
  }
})();

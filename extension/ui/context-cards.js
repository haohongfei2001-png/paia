import {request,element} from './common.js';
import {createIcon} from './icons.js';
import {PlainTextSurface,AutosaveSession,RevisionSession,UndoJournal} from './editor-primitives.js';
import {RecoveryDraftSession} from './recovery-draft.js';
import {ContextCommitSession} from './context-commit.js';
import {ContextTopicInputs} from './context-topics.js';
import {copyReadingText} from './reading-actions.js';

const copy=(zh,en)=>document.documentElement.lang==='en'?en:zh;
const names={info:['我的信息','My Information'],rules:['我的规则','My Rules'],now:['我的现在','My Now'],inputs:['我的输入','My Inputs']};
const routes={...names,connections:['已连接的 AI','Connected AI']};
const label=key=>copy(...routes[key]);
const editable=card=>['info','rules','now'].includes(card);
const itemCopy={info:{add:['＋ 添加信息','＋ Add information'],placeholder:['写下一条信息…','Write some information…'],section:['补充信息','Additional information']},rules:{add:['＋ 添加规则','＋ Add rule'],placeholder:['写下一条规则…','Write a rule…'],section:['工作方式','Ways of working']},now:{add:['＋ 添加当前状态','＋ Add current focus'],placeholder:['写下当前的重点…','Write your current focus…'],section:['阶段重点','Current priorities']}};
const button=(text,fn,className='')=>{const b=element('button',className,text);b.type='button';b.onclick=fn;return b;};

export class ContextItemEditor {
 constructor(page,item,{fresh=false}={}){
  this.page=page;this.epoch=page.snapshot.epoch;this.id=item.id;this.saved=structuredClone(item);this.local=item.body;this.fresh=fresh;this.saving=null;this.conflicted=false;this.failed=false;this.revision=new RevisionSession();this.commit=new ContextCommitSession();this.journal=new UndoJournal();
  this.root=element('div','context-item');this.root.dataset.item=this.id;
  this.field=element('div','item-text',item.body);this.field.contentEditable='plaintext-only';this.field.setAttribute('role','textbox');this.field.setAttribute('aria-multiline','true');this.field.setAttribute('aria-label',label(item.card||page.card||'info'));this.field.dataset.placeholder=copy(...itemCopy[item.card||page.card||'info'].placeholder);this.field.spellcheck=false;
  this.feedback=element('div','item-feedback');this.feedback.setAttribute('role','status');
  this.menu=element('details','item-menu');const summary=element('summary');summary.setAttribute('aria-label',copy('此条内容的更多操作','More item actions'));summary.append(createIcon('more'));
  const actions=element('div','menu-items');actions.append(button(copy('复制','Copy'),()=>void this.copyBody()),button(copy('查看依据','View basis'),()=>{this.reorderSelection=null;this.menu.open=false;let basis=this.root.querySelector('.item-evidence');if(basis)basis.remove();else{basis=element('p','item-evidence',copy('由你添加，人工修改始终保留。','Added by you. Your edits are protected.'));this.root.append(basis);}}),button(copy('撤销上次修改','Undo last edit'),()=>void this.undo()),button(copy('删除','Delete'),()=>void page.remove(this),'danger'));this.moveUp=button(copy('上移','Move up'),()=>void page.reorder(this,'up'));this.moveDown=button(copy('下移','Move down'),()=>void page.reorder(this,'down'));actions.append(this.moveUp,this.moveDown);this.moveTargets=[];for(const target of ['info','rules','now'])if(target!==this.saved.card){const control=button(copy(`移动到${label(target)}`,`Move to ${label(target)}`),()=>void page.move(this,target));control.setAttribute('data-move-target',target);this.moveTargets.push(control);actions.append(control);}this.menu.append(summary,actions);summary.addEventListener('pointerdown',()=>this.captureReorderSelection());this.menu.addEventListener('keydown',e=>{this.page.cancelReorderIntent?.();if(e.target===summary&&(e.key==='Enter'||e.key===' ')&&!this.reorderSelection)this.captureReorderSelection();if(e.key==='Escape'){this.reorderSelection=null;e.preventDefault();this.menu.open=false;summary.focus();}});
  this.copyFeedback=element('div','item-copy-feedback');this.copyFeedback.setAttribute('role','status');
  this.root.append(this.field,this.menu,this.feedback,this.copyFeedback);
  this.autosave=new AutosaveSession(()=>void this.flush());
  this.surface=new PlainTextSurface(this.field,{start:()=>{this.reorderSelection=null;this.copyEpoch=(this.copyEpoch||0)+1;this.copyFeedback.replaceChildren();this.autosave.cancel();if(!this.failed&&!this.conflicted&&!this.saving)this.feedback.replaceChildren();},end:()=>this.changed(),input:()=>this.changed(),leave:()=>void this.flush()});
  this.recovery=new RecoveryDraftSession({kind:'context_item',ownerId:this.id,epoch:page.snapshot.epoch});
  this.field.addEventListener('keydown',e=>{this.page.cancelReorderIntent?.();if(e.key==='Tab'&&!e.shiftKey)this.captureReorderSelection();if(this.composing||e.isComposing||e.keyCode===229)return;if((e.metaKey||e.ctrlKey)&&e.key==='Enter'){e.preventDefault();void this.flush();}if(e.key==='Escape'){e.preventDefault();void this.flush().then(ok=>{if(ok)this.field.blur();});}});
  if(!fresh)void this.recover();
 }
 get composing(){return this.surface.composing;}
 get recoveryPending(){return this.recovery.pending||!!this.discarding||!!this.draftClearFailed;}
 dirty(){return this.local!==this.saved.body||this.fresh&&!!this.local.trim()||!!this.commit.pending||!!this.saving;}
 collect(){const text=this.field.innerText;this.local=this.fresh&&!this.saving&&!this.commit.pending&&!text.trim()?'':text;}
 operation(){return this.revision.attempt({kind:'put',epoch:this.epoch,itemId:this.id,expectedRevision:this.saved.revision,body:this.local,section:this.saved.section,card:this.saved.card||'info'});}
 changed(){this.reorderSelection=null;this.copyEpoch=(this.copyEpoch||0)+1;this.copyFeedback.replaceChildren();this.collect();this.feedback.replaceChildren();this.failed=false;if(this.fresh&&!this.local.trim()&&!this.saving&&!this.commit.pending){this.revision.last=null;void this.clearDraft();return;}if(!this.dirty()){this.revision.last=null;void this.clearDraft();return;}if(this.local.trim()||this.commit.pending||this.saving){const change=this.operation();void this.recovery.protect({type:'PAIA_CONTEXT_CARDS_CHANGE',change},change.operationId).catch(()=>{});}this.autosave.schedule();this.page.applySearch();}
 async clearDraft(){
  this.discardRequested={token:this.recovery.currentToken};if(this.discarding)return this.discarding;
  this.discarding=(async()=>{try{while(this.discardRequested){const {token}=this.discardRequested;this.discardRequested=null;await this.recovery.discard(token);}this.draftClearFailed=false;return true;}catch{this.draftClearFailed=true;this.feedbackFailure();return false;}finally{this.discarding=null;}})();return this.discarding;
 }
 async recover(){try{const draft=await this.recovery.load();if(!draft||this.dirty()||this.composing)return;this.recovery.currentToken=draft.token;const c=draft.operation.change;if((c.card??'info')!==(this.saved.card||'info'))return;if(c.body===this.saved.body){await this.recovery.clear(draft.token);return;}this.local=c.body;this.field.textContent=c.body;this.conflicted=c.expectedRevision!==this.saved.revision;this.feedback.textContent=copy('已恢复未保存文字，请核对后重试。','Unsaved text recovered. Review it, then retry.');this.feedback.append(button(copy('重试','Retry'),()=>void this.flush(true)));this.page.applySearch();}catch{}}
 feedbackFailure(conflict=false){const kind=(conflict?'conflict':'failed')+':'+document.documentElement.lang;if(this.feedback.dataset.kind===kind&&this.feedback.childElementCount)return;this.feedback.dataset.kind=kind;this.feedback.className='item-feedback error';this.feedback.replaceChildren(element('span','',conflict?copy('其他页面已修改或删除这条内容，当前文字已保留。','This item changed elsewhere. Your text is retained.'):copy('未保存，文字已保留。','Not saved. Your text is retained.')));if(conflict){this.feedback.append(button(copy('保留为新条目','Keep as new item'),()=>void this.page.keepConflict(this)),button(copy('查看已保存内容','View saved content'),()=>void this.page.discardConflict(this)));}else this.feedback.append(button(copy('重试','Retry'),()=>void this.flush(true)));}
 async flush(retry=false){
  if(this.composing)return false;if(this.discarding&&!await this.discarding)return false;if(this.draftClearFailed&&!await this.clearDraft())return false;if(this.saving){await this.saving;return !this.failed&&!this.conflicted&&!this.dirty();}this.collect();if(!this.dirty())return true;if(this.conflicted){this.feedbackFailure(true);return false;}if(this.failed&&!retry)return false;
  if(!this.local.trim()&&!this.commit.pending){if(this.fresh){this.local='';return true;}this.failed=true;this.feedbackFailure();return false;}
  this.autosave.cancel();this.feedback.className='item-feedback';this.feedback.textContent=copy('正在保存…','Saving…');
  this.saving=(async()=>{try{
   const change=this.operation(),before=this.saved.body,ack=await this.commit.save(change);
   if(!ack.result.ok){this.conflicted=true;this.feedbackFailure(true);return false;}
   if(ack.result.itemId!==this.id||ack.result.lifecycle!=='active'||!Number.isSafeInteger(ack.result.revision))throw Error('SAVE_OUTCOME_UNKNOWN');
   if(ack.change.operationId===this.undoOperationId){this.journal.undo.pop();this.undoOperationId=null;}else if(before!==ack.change.body&&before.trim())this.journal.record({body:before});
   this.saved={...this.saved,body:ack.change.body,revision:ack.result.revision};this.fresh=false;this.failed=false;
   await this.recovery.discard(ack.change.operationId).catch(()=>{});
   this.feedback.textContent=!this.composing&&this.field.innerText===ack.change.body?copy('已保存','Saved'):copy('还有修改未保存','Newer changes are not saved yet');
   return true;
  }catch(error){this.failed=true;if(error?.code==='CONTEXT_INVALIDATED'){this.conflicted=true;this.feedbackFailure(true);}else this.feedbackFailure();return false;}finally{this.saving=null;}})();
  const ok=await this.saving;if(ok&&this.dirty())return this.flush();if(ok)this.page.clearLeaveNotice?.();this.page.applySearch?.();return ok;
 }
 receive(item,epoch=this.epoch){if(epoch===this.epoch&&item&&item.revision<this.saved.revision)return;if(epoch!==this.epoch){if(this.dirty()||this.composing||this.saving){this.conflicted=true;this.feedbackFailure(true);return;}this.epoch=epoch;this.recovery=new RecoveryDraftSession({kind:'context_item',ownerId:this.id,epoch});}if(this.saving)return;if(!item||item.revision!==this.saved.revision){if(this.dirty()||this.composing){this.conflicted=true;this.feedbackFailure(true);return;}if(item){this.saved=structuredClone(item);this.local=item.body;if(this.field.innerText!==item.body)this.field.textContent=item.body;this.feedback.replaceChildren();}}}
 captureReorderSelection(){
  const selection=globalThis.getSelection?.();this.reorderSelection=null;
  if(this.composing||!selection?.rangeCount||selection.isCollapsed||!this.field.contains(selection.anchorNode)||!this.field.contains(selection.focusNode))return;
  this.reorderSelection={anchor:selection.anchorNode,anchorOffset:selection.anchorOffset,focus:selection.focusNode,focusOffset:selection.focusOffset,body:this.field.innerText,editEpoch:this.copyEpoch||0,epoch:this.epoch,generation:this.page.openGeneration};
 }
 restoreReorderSelection(range){
  if(!range||this.disposed||this.composing||!this.page.active||this.page.editors.get(this.id)!==this||this.epoch!==range.epoch||this.page.openGeneration!==range.generation||this.field.innerText!==range.body||(this.copyEpoch||0)!==range.editEpoch||!this.field.contains(range.anchor)||!this.field.contains(range.focus))return;
  globalThis.getSelection?.()?.setBaseAndExtent?.(range.anchor,range.anchorOffset,range.focus,range.focusOffset);
 }
 async copyBody(){
  this.reorderSelection=null;const live=()=>!this.disposed&&this.page.active&&this.page.editors.get(this.id)===this;
  if(!live()||this.copying)return false;
  if(this.composing){this.copyFeedback.textContent=copy('请先完成输入，再复制。','Finish composing before copying.');return false;}
  // Copy the visible draft, including failed saves; this gesture is not a save
  // or an AI-readable-scope export. Never reveal a stale fallback dialog.
  const text=this.field.innerText,opened=this.page.openGeneration,copyEpoch=this.copyEpoch||0;
  this.menu.open=false;this.copying=true;this.copyFeedback.replaceChildren();
  try{
   const copied=await copyReadingText(text,{fallback:false});
   if(!live()||opened!==this.page.openGeneration||copyEpoch!==(this.copyEpoch||0)||this.composing||this.field.innerText!==text)return false;
   this.copyFeedback.textContent=copied?copy('已复制当前文字。','Current text copied.'):copy('未能复制。文字仍保留，可选中后使用系统复制。','Could not copy. Text is retained; select it and use system copy.');
   return copied===true;
  }finally{this.copying=false;}
 }
 async undo(){this.reorderSelection=null;this.menu.open=false;if(!await this.flush())return;const prior=this.journal.undo.at(-1);if(!prior||!prior.body.trim())return;this.local=prior.body;this.field.textContent=prior.body;this.changed();this.undoOperationId=this.operation().operationId;await this.flush(true);this.field.focus();}
 dispose(){this.disposed=true;this.copyFeedback.replaceChildren();this.autosave.dispose();this.surface.dispose();}
}

export class ContextCardsPage {
 constructor({host,onNavigate}){this.host=host;this.onNavigate=onNavigate;this.card=null;this.snapshot=null;this.inputs=null;this.editors=new Map();this.journal=new UndoJournal();this.accessCommit=new ContextCommitSession();this.deleteCommit=new ContextCommitSession();this.reorderCommit=new ContextCommitSession();this.moveCommit=new ContextCommitSession();this.movePreparing=false;this.lastMove=null;this.busy=false;this.active=false;this.readGeneration=0;this.openGeneration=0;this.searchQuery='';this.searchGeneration=0;this.searchComposing=false;document.addEventListener('paia:preferences-applied',()=>{if(this.active&&editable(this.card)&&this.page){this.localizeEditable();this.paintAccess();}});}
 async open(card=null){
  card=routes[card]?card:null;const generation=++this.openGeneration,rebuild=!this.active||!this.page||this.renderedCard!==card;this.active=true;this.card=card;
  await this.refresh({rebuild});if(generation!==this.openGeneration||!this.active||this.card!==card)return;
  if(this.page)this.page.inert=false;if(rebuild&&!this.page?.contains(document.activeElement))this.host.querySelector('h1')?.focus({preventScroll:true});
  if(rebuild&&this.page&&editable(card))await this.recoverNew(generation);
 }
 async refresh({rebuild=false,force=false}={}){
  if(this.busy&&!force)return;
  const generation=++this.readGeneration;
  try{const snapshot=await request('PAIA_CONTEXT_CARDS_SNAPSHOT',this.card?{}:{mode:'home'});if(generation!==this.readGeneration||!this.active)return;this.snapshot=snapshot;
   if(rebuild||!this.page||this.renderedCard!==this.card){this.render();if(this.inputs)await this.inputs.refresh();return;}
   this.localizeEditable();this.paintAccess();
   if(!this.card){for(const [k,count]of Object.entries(snapshot.counts)){const node=this.host.querySelector(`[data-count="${k}"]`);if(node)node.textContent=k==='inputs'?this.inputCount():`${count} ${copy('项','items')}`;}const summary=this.host.querySelector('.input-summary');if(summary)this.paintInputSummary(summary);}
   else if(editable(this.card)){
    for(const [id,editor]of this.editors){const item=snapshot.items.find(x=>x.id===id&&x.card===this.card);editor.outsideCard=snapshot.items.some(x=>x.id===id&&x.card!==this.card);editor.receive(item,snapshot.epoch);if(!item&&!editor.fresh&&!editor.dirty()&&!editor.composing&&!editor.saving&&!editor.commit.pending&&!editor.recoveryPending){editor.dispose();editor.root.remove();this.editors.delete(id);}}
    for(const item of snapshot.items)if(item.card===this.card&&!this.editors.has(item.id))this.mountItem(item);
    this.orderItems();this.paintEmpty();
   }else if(this.inputs){this.inputs.setAccess(snapshot.access);await this.inputs.refresh();}
  }catch{if(generation!==this.readGeneration||!this.active)return;if(rebuild||!this.page||this.renderedCard!==this.card)this.renderLoadFailure();else this.notice(copy('读取失败，当前文字仍保留。','Could not refresh. Your current text is retained.'));}
 }
 finishNavigation(){
  if(!this.page?.inert)return;
  ++this.readGeneration;++this.openGeneration;this.renderLoadFailure();
  this.host.querySelector('h1')?.focus({preventScroll:true});
 }
 renderLoadFailure(){
  // Navigation reached this method only after the shared leave guard succeeded.
  // Do not expose an outgoing card's editors under a failed destination route.
  this.inputs?.close();this.inputs=null;for(const editor of this.editors.values())editor.dispose();this.editors.clear();
  this.searchForm=null;this.searchQuery='';++this.searchGeneration;this.page=null;this.renderedCard=null;this.content=null;this.empty=null;this.add=null;this.globalNote=null;this.message=null;
  const panel=element('section','context-page context-load-failed');
  if(this.card){const back=button('',()=>void this.onNavigate(null),'context-back');back.append(createIcon('back'),element('span','',copy('AI 上下文','AI Context')));panel.append(back);}
  const header=element('header','context-head'),title=element('h1','',this.card?label(this.card):copy('AI 上下文','AI Context'));title.tabIndex=-1;header.append(title);
  const failure=element('p','empty-detail',copy('暂时无法读取本机上下文。','Local Context could not be loaded.'));failure.setAttribute('role','status');
  panel.append(header,failure,button(copy('重试','Retry'),()=>void this.open(this.card),'standard-button'));this.host.replaceChildren(panel);
 }
 access(key){const b=button('',()=>void this.toggle(key),'context-access'+(key==='global'?' global':''));b.dataset.key=key;return b;}
 inputCount(){const value=this.snapshot.topicChoices;return !value?copy('0 个主题开放','0 topics open'):!value.available?copy('主题选择暂不可用','Topic choices unavailable'):`${value.selectedCount} ${copy('个主题已选择','topics selected')}`;}
 inputDescription(){const value=this.snapshot.topicChoices;return value&&!value.available?copy('暂时无法读取主题选择，已有设置仍保留。','Topic choices cannot be read right now. Existing settings are retained.'):value?.available&&value.selectedCount?copy('主题选择已保留，外部读取目前不可用。','Topic choices are retained. External reading is unavailable.'):copy('还没有开放的主题','No open topics yet');}
 paintInputSummary(node){const value=this.snapshot.topicChoices;if(value?.available&&value.selectedNames?.length){node.replaceChildren(element('span','',value.selectedNames.join(' · ')));if(value.remainingSelectedCount)node.append(element('span','more-topics',` +${value.remainingSelectedCount}`));}else node.textContent=this.inputDescription();}
 paintAccess(){for(const b of this.host.querySelectorAll('.context-access')){const key=b.dataset.key,value=this.snapshot.access[key],paused=key!=='global'&&value.enabled&&!this.snapshot.access.global.enabled;b.dataset.on=String(value.enabled);b.dataset.paused=String(paused);b.setAttribute('aria-pressed',String(value.enabled));b.setAttribute('aria-label',(key==='global'?copy('AI 访问','AI access'):label(key))+': '+(value.enabled?copy('已开放','Enabled'):copy('仅自己','Only me')));b.title=copy('仅保存开放设置；外部 AI 连接尚不可用。','Saves access preferences only. External AI connections are unavailable.');b.replaceChildren(element('span','state-dot'),element('span','',key==='global'?copy('AI 访问 · ','AI access · ')+(value.enabled?copy('开','On'):copy('关','Off')):value.enabled?(paused?copy('已开放','Enabled'):copy('AI 可读','AI readable')):copy('仅自己','Only me')));b.disabled=this.busy;}
  if(this.globalNote&&this.card!=='connections'){this.globalNote.hidden=!!this.inputs||this.snapshot.access.global.enabled;this.globalNote.textContent=Object.values(this.snapshot.access).some(x=>x.enabled)?copy('AI 访问已暂停，开放设置已保留。','AI access is paused. Your choices are retained.'):copy('AI 访问尚未开启。','AI access is off.');}}
 render(){
  this.inputs?.close();this.inputs=null;this.renderedCard=this.card;this.searchQuery='';++this.searchGeneration;this.searchComposing=false;this.searchForm=null;for(const editor of this.editors.values())editor.dispose();this.editors.clear();this.page=element('section','context-page'+(this.card?' context-detail':''));this.host.replaceChildren(this.page);
  if(this.card){const back=button('',()=>void this.onNavigate(null),'context-back');back.append(createIcon('back'),element('span','',copy('AI 上下文','AI Context')));this.page.append(back);}
  const head=element('header','context-head'),title=element('h1','',this.card?label(this.card):copy('AI 上下文','AI Context'));title.tabIndex=-1;head.append(title);if(this.card!=='connections')head.append(this.access(this.card||'global'));this.page.append(head);
  if(editable(this.card))this.page.append(element('p','maintenance',copy('人工修改始终保留；自动补充目前不可用。','Your edits are protected. Automatic updates are unavailable.')));
  this.globalNote=element('p','global-note');this.page.append(this.globalNote);
  this.message=element('div','context-notice');this.message.setAttribute('role','status');
  if(!this.card){
   const grid=element('div','context-cards');for(const k of Object.keys(names)){const card=element('article','context-card');card.dataset.card=k;const h=element('h2','card-title',label(k)),summary=element('p','card-summary'+(k==='inputs'?' input-summary':''));if(k==='inputs')this.paintInputSummary(summary);else summary.hidden=true;const footer=element('div','card-footer'),count=element('span','',k==='inputs'?this.inputCount():`${this.snapshot.counts[k]} ${copy('项','items')}`);count.dataset.count=k;footer.append(count,createIcon('forward'));const link=element('a','card-link');link.href='#';link.setAttribute('aria-label',copy('打开','Open ')+label(k));link.onclick=e=>{e.preventDefault();void this.onNavigate(k);};card.append(h,this.access(k),summary,footer,link);grid.append(card);}this.page.append(grid);
   const connections=button('',()=>void this.onNavigate('connections'),'connections-link');connections.append(element('span','',copy('已连接的 AI','Connected AI')),element('span','connection-number',String(this.snapshot.connections)),createIcon('chevron-right'));this.page.append(connections);
  }else if(editable(this.card)){
   this.renderSearch();this.content=element('div','detail-content');this.empty=element('p','empty-detail',copy('还没有内容，可以先写一条。','No content yet. Write something to start.'));this.add=button(copy(...itemCopy[this.card].add),()=>void this.addItem(),'add-item');this.content.append(this.empty,this.add);this.page.append(this.content);for(const item of this.snapshot.items)if(item.card===this.card)this.mountItem(item);this.orderItems();this.paintEmpty();
  }else if(this.card==='inputs'&&this.snapshot.capabilities.inputs){
   this.inputs=new ContextTopicInputs({host:this.page,access:this.snapshot.access});
  }else if(this.card==='connections'){
   this.page.append(element('p','empty-detail',copy('还没有连接的 AI。','No AI is connected.')),element('p','quiet-footnote',copy('外部连接目前不可用。开放设置只保存在本机，不会发送内容。','External connections are unavailable. Access preferences stay on this device; no content is sent.')));
  }else this.page.append(element('p','empty-detail',copy('此页目前不可用。开放设置已保存在本机，不会向外部提供内容。','This page is not available yet. Access preferences are saved locally; no content is shared.')));
  this.page.append(this.message);this.paintAccess();
 }
 mountItem(item,options){
  const order=id=>this.snapshot.items.find(row=>row.id===id)?.order??Number.MAX_SAFE_INTEGER,targetOrder=item.order??Number.MAX_SAFE_INTEGER;
  let group=[...this.content.querySelectorAll('.context-section')].find(x=>x.dataset.section===item.section);
  if(!group){group=element('section','context-section');group.dataset.section=item.section;group.append(element('h2','',item.section));const following=[...this.content.querySelectorAll('.context-section')].find(section=>Math.min(...[...section.querySelectorAll('.context-item')].map(node=>order(node.dataset.item)))>targetOrder);this.content.insertBefore(group,following||this.add);}
  const editor=new ContextItemEditor(this,item,options),following=[...group.querySelectorAll('.context-item')].find(node=>order(node.dataset.item)>targetOrder);this.editors.set(item.id,editor);group.insertBefore(editor.root,following||null);return editor;
 }
 groupItems(editor){return (this.snapshot?.items||[]).filter(item=>item.card===editor.saved.card&&item.section===editor.saved.section&&item.lifecycle==='active').sort((a,b)=>a.order-b.order);}
 paintReorder(){for(const editor of this.editors.values()){for(const control of editor.moveTargets||[])control.disabled=this.busy||this.movePreparing||!!this.moveCommit.pending||editor.fresh||editor.outsideCard;const group=this.groupItems(editor),index=group.findIndex(item=>item.id===editor.id);for(const [control,offset]of [[editor.moveUp,-1],[editor.moveDown,1]]){const adjacent=group[index+offset];control.disabled=this.busy||!!this.reorderCommit.pending||editor.fresh||index<0||!adjacent||new Set(group.map(item=>item.order)).size!==group.length;}}}
 orderItems(){
  // Relocate the existing node only: no body replacement, new editor or draft.
  const focus=document.activeElement,selection=globalThis.getSelection?.(),range=selection?.rangeCount&&this.content?.contains(selection.anchorNode)&&this.content?.contains(selection.focusNode)?{anchor:selection.anchorNode,anchorOffset:selection.anchorOffset,focus:selection.focusNode,focusOffset:selection.focusOffset}:null;
  for(const group of this.content?.querySelectorAll('.context-section')||[]){const ordered=[...this.editors.values()].filter(editor=>editor.root.parentElement===group&&!editor.fresh).sort((a,b)=>(a.saved.order??0)-(b.saved.order??0));if(ordered.some(editor=>editor.dirty()||editor.composing||editor.saving||editor.conflicted))continue;const current=[...group.querySelectorAll('.context-item')];for(let index=0;index<ordered.length;index++){const node=ordered[index].root;if(current[index]===node)continue;group.insertBefore(node,current[index]||null);current.splice(current.indexOf(node),1);current.splice(index,0,node);}}
  if(focus&&this.page?.contains(focus)&&document.activeElement!==focus)focus.focus({preventScroll:true});
  if(range&&this.content?.contains(range.anchor)&&this.content?.contains(range.focus))selection.setBaseAndExtent?.(range.anchor,range.anchorOffset,range.focus,range.focusOffset);
  this.paintReorder();
 }
 async reorder(editor,direction){
  const range=editor.reorderSelection;editor.reorderSelection=null;
  const generation=this.openGeneration,card=this.card,live=()=>this.active&&this.openGeneration===generation&&this.card===card&&this.editors.get(editor.id)===editor;
  if(this.reorderPreparing||this.busy||this.reorderCommit.pending||!live()||!['up','down'].includes(direction))return false;
  this.reorderPreparing=true;let ownsBusy=false;
  // This gesture may survive an asynchronous ACK, but later user intent wins.
  // The menu default can leave focus on body; a new pointer/key gesture or
  // focus in another control invalidates restoration, even without an edit.
  const intent=new AbortController(),inside=()=>!document.activeElement||document.activeElement===document.body||editor.root.contains(document.activeElement);let restoreIntent=inside();
  const cancelIntent=()=>{restoreIntent=false;};this.cancelReorderIntent=cancelIntent;document.addEventListener('pointerdown',cancelIntent,{capture:true,signal:intent.signal});document.addEventListener('focusin',event=>{if(!editor.root.contains(event.target))cancelIntent();},{capture:true,signal:intent.signal});
  try{
  if(!await this.flush()||!live())return false;
  // Refresh after flush: edits may have advanced revisions or created Items.
  const beforeRead=this.readGeneration,beforeSnapshot=this.snapshot;await this.refresh();if(!live()||this.readGeneration!==beforeRead+1||this.snapshot===beforeSnapshot)return false;
  if([...this.editors.values()].some(item=>item.dirty()||item.composing||item.saving||item.conflicted))return false;
  const group=this.groupItems(editor),index=group.findIndex(item=>item.id===editor.id),item=group[index],adjacent=group[index+(direction==='up'?-1:1)];
  if(!item||!adjacent||new Set(group.map(current=>current.order)).size!==group.length)return false;
  editor.menu.open=false;this.busy=true;ownsBusy=true;this.paintReorder();

  const ack=await this.reorderCommit.save({kind:'reorder',operationId:crypto.randomUUID(),epoch:this.snapshot.epoch,itemId:item.id,expectedRevision:item.revision,adjacentId:adjacent.id,adjacentRevision:adjacent.revision,direction,card:item.card,section:item.section});
   if(!live())return false;
   if(!ack.result.ok){await this.refresh({force:true});this.notice(copy('顺序已在其他页面改变，请核对后重试。','Order changed elsewhere. Review it, then retry.'));return false;}
   if(ack.change.kind!=='reorder'||ack.result.itemId!==item.id||ack.result.adjacentId!==adjacent.id||ack.result.revision!==item.revision+1||ack.result.adjacentRevision!==adjacent.revision+1)throw Error('SAVE_OUTCOME_UNKNOWN');
   const previous=this.snapshot;await this.refresh({force:true});if(!live())return false;if(this.snapshot===previous){this.notice(copy('顺序已保存，但列表刷新失败。请重试读取。','Order was saved, but the list could not refresh. Retry reading.'));this.message?.append(button(copy('重新读取','Retry reading'),()=>void this.refresh()));return true;}this.notice(copy('已保存顺序。','Order saved.'));if(restoreIntent&&inside()){editor.menu.querySelector('summary')?.focus({preventScroll:true});editor.restoreReorderSelection(range);}return true;
  }catch{if(live())this.unconfirmed(copy('顺序尚未确认，请核对上次操作。','Order is unconfirmed. Check the previous operation.'));return false;}finally{intent.abort();if(this.cancelReorderIntent===cancelIntent)this.cancelReorderIntent=null;this.reorderPreparing=false;if(ownsBusy)this.busy=false;if(live())this.paintReorder();}
 }
 // Update only presentation labels. Never replace an editable body or its
 // saved/user-authored section, selection, composition or recovery session.
 localizeEditable(){
  if(!editable(this.card)||!this.page)return;
  this.localizeSearch();
  const set=(node,text)=>{if(node&&node.textContent!==text)node.textContent=text;};
  set(this.page.querySelector('h1'),label(this.card));
  set(this.page.querySelector('.context-back')?.querySelector('span'),copy('AI 上下文','AI Context'));
  set(this.page.querySelector('.maintenance'),copy('人工修改始终保留；自动补充目前不可用。','Your edits are protected. Automatic updates are unavailable.'));
  set(this.empty,copy('还没有内容，可以先写一条。','No content yet. Write something to start.'));set(this.add,copy(...itemCopy[this.card].add));
  for(const editor of this.editors.values()){
   const card=editor.saved.card||this.card;
   editor.field.setAttribute('aria-label',label(card));editor.field.dataset.placeholder=copy(...itemCopy[card].placeholder);
   editor.menu.querySelector('summary')?.setAttribute('aria-label',copy('此条内容的更多操作','More item actions'));
   const actions=editor.menu.querySelectorAll('button');
   for(const [index,pair]of [['复制','Copy'],['查看依据','View basis'],['撤销上次修改','Undo last edit'],['删除','Delete']].entries())set(actions[index],copy(...pair));
   for(const control of editor.moveTargets||[]){const target=control.getAttribute('data-move-target');set(control,copy(`移动到${label(target)}`,`Move to ${label(target)}`));}set(editor.moveUp,copy('上移','Move up'));set(editor.moveDown,copy('下移','Move down'));
   set(editor.root.querySelector('.item-evidence'),copy('由你添加，人工修改始终保留。','Added by you. Your edits are protected.'));
  }
 }
 renderSearch(){
  this.searchForm=element('form','context-search');this.searchField=element('input');this.searchField.type='search';this.searchField.autocomplete='off';this.searchField.spellcheck=false;
  this.searchSubmit=button('',()=>{},'context-search-submit');this.searchSubmit.type='submit';
  this.searchClear=button('',()=>{if(this.searchComposing)return;this.searchField.value='';void this.search('');},'context-search-clear');
  this.searchStatus=element('p','context-search-status');this.searchStatus.setAttribute('role','status');
  this.searchField.addEventListener('compositionstart',()=>{this.searchComposing=true;});this.searchField.addEventListener('compositionend',()=>{this.searchComposing=false;});
  this.searchForm.addEventListener('submit',event=>{event.preventDefault();if(!this.searchComposing&&!event.isComposing)void this.search(this.searchField.value);});
  this.searchForm.append(this.searchField,this.searchSubmit,this.searchClear);this.page.append(this.searchForm,this.searchStatus);this.localizeSearch();
 }
 localizeSearch(){
  if(!this.searchForm)return;this.searchField.setAttribute('aria-label',copy('搜索当前卡片','Search this card'));this.searchField.placeholder=copy('搜索当前卡片','Search this card');this.searchSubmit.textContent=copy('搜索','Search');this.searchClear.textContent=copy('清空','Clear');
 }
 async search(query){
  if(!this.active||!editable(this.card)||this.busy||this.searchComposing)return false;
  const generation=++this.searchGeneration,opened=this.openGeneration,card=this.card;
  if(!await this.flush()){if(this.active&&opened===this.openGeneration&&generation===this.searchGeneration)this.searchBlockedNotice=this.notice(copy('请先完成并保存当前编辑，搜索不会丢弃文字。','Finish and save the current edit first. Search will not discard text.'));return false;}
  if(!this.active||opened!==this.openGeneration||card!==this.card||generation!==this.searchGeneration)return false;
  this.searchBlockedNotice?.remove();this.searchBlockedNotice=null;
  this.searchQuery=String(query??'');this.applySearch();return true;
 }
 applySearch(){
  if(!this.searchForm||!this.active||!editable(this.card))return;
  const query=this.searchQuery.toLowerCase(),filtering=query.length>0;let matches=0,retained=0;
  for(const editor of this.editors.values()){
   const match=!editor.outsideCard&&(!filtering||editor.local.toLowerCase().includes(query)||editor.saved.section.toLowerCase().includes(query));
   // Filtering never retires or hides an outstanding human editor/recovery.
   const protectedEdit=editor.fresh||editor.dirty()||editor.composing||editor.conflicted||editor.recoveryPending||document.activeElement===editor.field;
   editor.root.hidden=!match&&!protectedEdit;if(match)matches++;else if(protectedEdit)retained++;
  }
  for(const group of this.content?.querySelectorAll('.context-section')||[])group.hidden=![...group.querySelectorAll('.context-item')].some(node=>!node.hidden);
  this.searchClear.hidden=!filtering&&!this.searchField.value;
  this.searchStatus.textContent=!filtering?'':matches?copy(`找到 ${matches} 条匹配内容。`,`Found ${matches} matching items.`):copy('当前卡片没有匹配内容。','No matches in this card.');
  if(filtering&&retained)this.searchStatus.textContent+=' '+copy('正在编辑或未完成的内容仍保留显示。','Active or unfinished edits remain visible.');
 }
 paintEmpty(){if(this.empty)this.empty.hidden=this.editors.size>0;for(const group of this.content?.querySelectorAll('.context-section')||[])if(!group.querySelector('.context-item'))group.remove();this.applySearch();this.paintReorder();}
 notice(text,undo=false){const node=element('span','',text);this.message?.replaceChildren(node);if(undo)this.message.append(button(copy('撤销','Undo'),()=>void this.undoDelete()));return node;}
 moveNotice(text){this.notice(text);if(this.lastMove){const undo=button(copy('撤销移动','Undo move'),()=>void this.undoMove());undo.setAttribute('data-context-move-undo','');this.message?.append(undo);}}
 async undoMove(){const prior=this.lastMove;if(!prior)return false;return this.move(null,prior.fromCard,prior);}
 async move(editor,target,undo=null){
  if(this.busy||this.reorderPreparing||this.movePreparing||this.moveCommit.pending||!this.active||!editable(this.card)||editor?.fresh)return false;
  const generation=this.openGeneration,card=this.card,live=()=>this.active&&this.openGeneration===generation&&this.card===card;
  this.movePreparing=true;let ownsBusy=false;
  try{
   if(!await this.flush()||!live())return false;
   const previous=this.snapshot;await this.refresh({force:true});if(!live()||this.snapshot===previous)return false;
   const id=undo?.itemId||editor.id,item=this.snapshot.items.find(x=>x.id===id);
   if(!item||item.card===target||undo&&(item.revision!==undo.revision||item.card!==undo.toCard)||editor&&(this.editors.get(id)!==editor||editor.dirty()||editor.composing||editor.conflicted||editor.commit.pending))return false;
   const from=item.card,access=Object.fromEntries(['global',from,target].map(key=>[key,{...this.snapshot.access[key]}]));
   const state=key=>access[key].enabled?copy('已开放','enabled'):copy('已关闭','disabled');
   const text=copy(`将此条目从${label(from)}移动到${label(target)}？\n总开关：${state('global')}；来源卡：${state(from)}；目标卡：${state(target)}。\n条目将遵循目标卡当前权限；不会更改任何开放设置。总开关关闭时，所选分类保留但不会开放给 AI。`,`Move this item from ${label(from)} to ${label(target)}?\nGlobal: ${state('global')}; source card: ${state(from)}; target card: ${state(target)}.\nThe item will follow the target card's current permissions. Access settings will not change. When global access is off, the category choice is saved without making it available to AI.`);
   if(!window.confirm(text)||!live())return false;
   if(editor&&(editor.dirty()||editor.composing||editor.conflicted||editor.commit.pending))return false;
   this.busy=true;ownsBusy=true;
   const change={kind:'move',operationId:crypto.randomUUID(),epoch:this.snapshot.epoch,itemId:id,expectedRevision:item.revision,fromCard:from,toCard:target,expectedAccess:access,...(undo?{undoOf:undo.operationId}:{})};
   const ack=await this.moveCommit.save(change);if(!live())return false;
   if(!ack.result.ok){this.notice(copy('内容或权限已变化。未移动，请重新确认。','Content or permissions changed. Nothing moved; confirm again.'));await this.refresh({force:true});return false;}
   this.acceptMove(ack.change,ack.result);editor&&(editor.menu.open=false);
   const before=this.snapshot;await this.refresh({force:true});if(!live())return false;
   this.moveNotice(this.snapshot===before?copy('移动已保存，但列表刷新失败。','Move saved, but the list could not refresh.'):copy('移动已保存。','Move saved.'));
   if(this.snapshot===before)this.message?.append(button(copy('重新读取','Retry reading'),()=>void this.refresh()));return true;
  }catch{if(live())this.unconfirmed(copy('移动尚未确认，请核对上次操作。','Move is unconfirmed. Check the previous operation.'));return false;}
  finally{this.movePreparing=false;if(ownsBusy)this.busy=false;if(live())this.paintReorder();}
 }
 acceptMove(change,result){if(change.kind!=='move'||result.kind!=='move'||result.itemId!==change.itemId||result.fromCard!==change.fromCard||result.toCard!==change.toCard||result.revision!==change.expectedRevision+1)throw Error('SAVE_OUTCOME_UNKNOWN');this.lastMove=change.undoOf?null:{operationId:change.operationId,itemId:result.itemId,revision:result.revision,fromCard:result.fromCard,toCard:result.toCard};}
 async toggle(key){if(this.busy)return;this.busy=true;this.paintAccess();try{const current=this.snapshot.access[key],ack=await this.accessCommit.save({kind:'access',operationId:crypto.randomUUID(),epoch:this.snapshot.epoch,key,enabled:!current.enabled,expectedRevision:current.revision});if(!ack.result.ok||ack.change.kind!=='access'||ack.result.key!==key||ack.change.key!==key)throw Error('conflict');await this.refresh({force:true});}catch{this.unconfirmed(copy('开放设置尚未确认，请核对上次操作。','Access preference is unconfirmed. Check the previous operation.'));}finally{this.busy=false;this.paintAccess();}}
 async recoverNew(generation=this.openGeneration){
  const card=this.card;try{const drafts=await request('PAIA_CONTEXT_CARDS_DRAFTS');if(!this.active||generation!==this.openGeneration||this.card!==card||!editable(card))return;
   for(const draft of drafts){const c=draft.operation.change;if((c.card??'info')!==card||c.expectedRevision!==0||this.editors.has(c.itemId))continue;const editor=this.mountItem({id:c.itemId,body:'',section:c.section,revision:0,card,lifecycle:'active'},{fresh:true});editor.recovery.currentToken=draft.token;editor.local=c.body;editor.field.textContent=c.body;editor.feedback.textContent=copy('已恢复未保存文字。','Unsaved text recovered.');editor.feedback.append(button(copy('重试','Retry'),()=>void editor.flush(true)));}this.paintEmpty();
  }catch{}
 }
 async addItem(body=''){if(this.busy||!await this.flush())return;const existing=[...this.editors.values()].find(x=>x.fresh&&!x.local.trim());if(existing){existing.field.focus();return;}const editor=this.mountItem({id:crypto.randomUUID(),body,section:copy(...itemCopy[this.card].section),revision:0,card:this.card,lifecycle:'active'},{fresh:true});this.paintEmpty();editor.field.focus();editor.field.scrollIntoView({block:'nearest'});if(body)editor.changed();}
 async remove(editor){
  editor.reorderSelection=null;
  if(this.busy||editor.composing)return;
  for(const other of this.editors.values())if(other!==editor&&!await other.flush())return;
  if(editor.saving||editor.commit.pending)await editor.flush(true);
  if(editor.saving||editor.commit.pending||editor.conflicted)return;
  if(editor.local.trim()&&editor.dirty()&&!await editor.flush())return;
  editor.menu.open=false;if(editor.fresh){if(!await editor.clearDraft())return;editor.dispose();editor.root.remove();this.editors.delete(editor.id);this.paintEmpty();return;}this.busy=true;try{const ack=await this.deleteCommit.save({kind:'delete',operationId:crypto.randomUUID(),epoch:this.snapshot.epoch,itemId:editor.id,expectedRevision:editor.saved.revision});if(!ack.result.ok){editor.conflicted=true;editor.feedbackFailure(true);return;}if(ack.change.kind!=='delete'||ack.change.itemId!==editor.id||ack.result.itemId!==editor.id||ack.result.lifecycle!=='removed')throw Error('SAVE_OUTCOME_UNKNOWN');await editor.recovery.clear().catch(()=>{});editor.dispose();editor.root.remove();this.editors.delete(editor.id);this.journal.record({itemId:ack.result.itemId,revision:ack.result.revision,deletedBy:ack.result.deletedBy});await this.refresh({force:true});this.notice(copy('已删除，不会自动加回。','Deleted. It will not be automatically restored.'),true);this.add.focus();}catch{this.unconfirmed(copy('删除尚未确认，请核对上次操作。','Deletion is unconfirmed. Check the previous operation.'));}finally{this.busy=false;}}
 async undoDelete(){if(this.busy)return;const prior=this.journal.undo.at(-1);if(!prior)return;this.busy=true;try{const ack=await this.deleteCommit.save({kind:'restore',operationId:crypto.randomUUID(),epoch:this.snapshot.epoch,itemId:prior.itemId,expectedRevision:prior.revision,deletedBy:prior.deletedBy});if(!ack.result.ok||ack.change.kind!=='restore'||ack.result.itemId!==prior.itemId||ack.result.lifecycle!=='active')throw Error('conflict');this.journal.undo.pop();await this.refresh({force:true});this.notice(copy('已撤销删除。','Deletion undone.'));this.editors.get(prior.itemId)?.field.focus();}catch{this.unconfirmed(copy('撤销尚未保存，请核对上次操作。','Undo has not been saved. Check the previous operation.'));}finally{this.busy=false;}}
 async keepConflict(editor){
  if(this.busy||editor.composing)return;const text=editor.local;if(!text.trim())return;
  // Commit the replacement independently before touching the original draft.
  // Another editor's failed save cannot destroy this human-authored text.
  let replacement=editor.replacement;
  if(!replacement||!this.editors.has(replacement.id)){replacement=this.mountItem({id:crypto.randomUUID(),body:'',section:editor.saved.section,revision:0,card:editor.saved.card||this.card||'info',lifecycle:'active'},{fresh:true});editor.replacement=replacement;}
  replacement.local=text;replacement.field.textContent=text;replacement.changed();this.paintEmpty();
  if(!await replacement.flush(true)){this.notice(copy('新条目尚未保存，原文字与新草稿均保留。','The new item is not saved. Both drafts are retained.'));return;}
  if(editor.local!==text||editor.composing)return;
  if(!await editor.clearDraft()||editor.local!==text||editor.composing)return;
  editor.dispose();editor.root.remove();this.editors.delete(editor.id);await this.refresh();this.clearLeaveNotice();replacement.field.focus();
 }
 async discardConflict(editor){if(!window.confirm(copy('放弃此处未保存的修改，查看已保存内容？','Discard this unsaved draft and show saved content?')))return false;const text=editor.local;if(!await editor.clearDraft()||editor.local!==text||editor.composing)return false;editor.dispose();editor.root.remove();this.editors.delete(editor.id);await this.refresh();this.clearLeaveNotice();return true;}
 clearLeaveNotice(){if(this.leaveBlocked&&[...this.editors.values()].every(e=>!e.dirty()&&!e.saving&&!e.composing&&!e.conflicted)){this.leaveBlocked=false;this.message?.replaceChildren();}}
 async flush(){if(this.moveCommit?.pending||this.reorderCommit.pending||this.busy||this.inputs?.busy||this.inputs?.pending)return false;let ok=true;for(const editor of this.editors.values())if(!await editor.flush())ok=false;
  // An earlier editor can receive newer text while a later commit is awaited.
  return ok&&!this.busy&&!this.inputs?.busy&&!this.inputs?.pending&&[...this.editors.values()].every(editor=>{if(!editor.composing)editor.collect();return !editor.dirty()&&!editor.saving&&!editor.composing&&!editor.conflicted&&!editor.recoveryPending;});
 }
 unconfirmed(text){this.notice(text);if(this.accessCommit.pending||this.deleteCommit.pending||this.reorderCommit.pending||this.moveCommit?.pending)this.message?.append(button(copy('核对上次操作','Check previous operation'),()=>void this.reconcilePending()));}
 async reconcilePending(){
  if(this.busy)return false;const commit=this.accessCommit.pending?this.accessCommit:this.deleteCommit.pending?this.deleteCommit:this.reorderCommit.pending?this.reorderCommit:this.moveCommit;if(!commit.pending)return true;this.busy=true;
  try{const {change,result}=await commit.save(commit.pending.change);if(!result.ok){this.notice(copy('上次操作与当前版本冲突，未改写内容。','The previous operation conflicted with the current version.'));await this.refresh({force:true});return true;}
   if(change.kind==='move')this.acceptMove(change,result);
   if(change.kind==='delete')this.journal.record({itemId:result.itemId,revision:result.revision,deletedBy:result.deletedBy});
   if(change.kind==='restore'&&this.journal.undo.at(-1)?.itemId===result.itemId)this.journal.undo.pop();
   const previous=this.snapshot;await this.refresh({force:true});if(change.kind==='move'){this.moveNotice(this.snapshot===previous?copy('移动已保存，但列表刷新失败。','Move saved, but the list could not refresh.'):copy('移动已确认。','Move confirmed.'));if(this.snapshot===previous)this.message?.append(button(copy('重新读取','Retry reading'),()=>void this.refresh()));return true;}if(change.kind==='reorder'&&this.snapshot===previous){this.notice(copy('顺序已保存，但列表刷新失败。请重试读取。','Order was saved, but the list could not refresh. Retry reading.'));this.message?.append(button(copy('重新读取','Retry reading'),()=>void this.refresh()));return true;}this.notice(copy('上次操作已确认。','The previous operation is confirmed.'),change.kind==='delete');return true;
  }catch{this.unconfirmed(copy('上次操作仍未确认，请稍后重试。','The previous operation is still unconfirmed. Retry later.'));return false;}finally{this.busy=false;this.paintAccess();this.paintReorder();}
 }
 async leave(){if(this.movePreparing)return false;if(this.inputs?.busy||this.inputs?.pending){this.inputs.unconfirmed();return false;}if(this.accessCommit.pending||this.deleteCommit.pending||this.reorderCommit.pending||this.moveCommit?.pending){this.unconfirmed(copy('请先核对尚未确认的操作。','Check the unconfirmed operation before leaving.'));return false;}if(!await this.flush()){if(this.inputs?.busy||this.inputs?.pending){this.inputs.unconfirmed();return false;}this.leaveBlocked=true;this.notice(copy('文字尚未保存，已保留在当前页。','Unsaved text is retained on this page.'));return false;}if(this.inputs&&!this.inputs.leave())return false;++this.readGeneration;++this.openGeneration;if(this.page)this.page.inert=true;return true;}
 close(){this.searchQuery='';this.searchForm=null;++this.searchGeneration;this.active=false;++this.readGeneration;++this.openGeneration;this.renderedCard=this.card;this.inputs?.close();this.inputs=null;for(const editor of this.editors.values())editor.dispose();this.editors.clear();this.page=null;}
}

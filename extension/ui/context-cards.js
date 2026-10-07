import {request,element} from './common.js';
import {createIcon} from './icons.js';
import {PlainTextSurface,AutosaveSession,RevisionSession,UndoJournal} from './editor-primitives.js';
import {RecoveryDraftSession} from './recovery-draft.js';
import {ContextCommitSession} from './context-commit.js';
import {ContextTopicInputs} from './context-topics.js';

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
  const actions=element('div','menu-items');actions.append(button(copy('查看依据','View basis'),()=>{this.menu.open=false;let basis=this.root.querySelector('.item-evidence');if(basis)basis.remove();else{basis=element('p','item-evidence',copy('由你添加，人工修改始终保留。','Added by you. Your edits are protected.'));this.root.append(basis);}}),button(copy('撤销上次修改','Undo last edit'),()=>void this.undo()),button(copy('删除','Delete'),()=>void page.remove(this),'danger'));this.menu.append(summary,actions);this.menu.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();this.menu.open=false;summary.focus();}});
  this.root.append(this.field,this.menu,this.feedback);
  this.autosave=new AutosaveSession(()=>void this.flush());
  this.surface=new PlainTextSurface(this.field,{start:()=>this.autosave.cancel(),end:()=>this.changed(),input:()=>this.changed(),leave:()=>void this.flush()});
  this.recovery=new RecoveryDraftSession({kind:'context_item',ownerId:this.id,epoch:page.snapshot.epoch});
  this.field.addEventListener('keydown',e=>{if(this.composing||e.isComposing||e.keyCode===229)return;if((e.metaKey||e.ctrlKey)&&e.key==='Enter'){e.preventDefault();void this.flush();}if(e.key==='Escape'){e.preventDefault();void this.flush().then(ok=>{if(ok)this.field.blur();});}});
  if(!fresh)void this.recover();
 }
 get composing(){return this.surface.composing;}
 get recoveryPending(){return this.recovery.pending||!!this.discarding||!!this.draftClearFailed;}
 dirty(){return this.local!==this.saved.body||this.fresh&&!!this.local.trim()||!!this.commit.pending||!!this.saving;}
 collect(){const text=this.field.innerText;this.local=this.fresh&&!this.saving&&!this.commit.pending&&!text.trim()?'':text;}
 operation(){return this.revision.attempt({kind:'put',epoch:this.epoch,itemId:this.id,expectedRevision:this.saved.revision,body:this.local,section:this.saved.section,card:this.saved.card||'info'});}
 changed(){this.collect();this.feedback.replaceChildren();this.failed=false;if(this.fresh&&!this.local.trim()&&!this.saving&&!this.commit.pending){this.revision.last=null;void this.clearDraft();return;}if(!this.dirty()){this.revision.last=null;void this.clearDraft();return;}if(this.local.trim()||this.commit.pending||this.saving){const change=this.operation();void this.recovery.protect({type:'PAIA_CONTEXT_CARDS_CHANGE',change},change.operationId).catch(()=>{});}this.autosave.schedule();}
 async clearDraft(){
  this.discardRequested={token:this.recovery.currentToken};if(this.discarding)return this.discarding;
  this.discarding=(async()=>{try{while(this.discardRequested){const {token}=this.discardRequested;this.discardRequested=null;await this.recovery.discard(token);}this.draftClearFailed=false;return true;}catch{this.draftClearFailed=true;this.feedbackFailure();return false;}finally{this.discarding=null;}})();return this.discarding;
 }
 async recover(){try{const draft=await this.recovery.load();if(!draft||this.dirty()||this.composing)return;this.recovery.currentToken=draft.token;const c=draft.operation.change;if((c.card??'info')!==(this.saved.card||'info'))return;if(c.body===this.saved.body){await this.recovery.clear(draft.token);return;}this.local=c.body;this.field.textContent=c.body;this.conflicted=c.expectedRevision!==this.saved.revision;this.feedback.textContent=copy('已恢复未保存文字，请核对后重试。','Unsaved text recovered. Review it, then retry.');this.feedback.append(button(copy('重试','Retry'),()=>void this.flush(true)));}catch{}}
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
   await this.recovery.clear(ack.change.operationId).catch(()=>{});
   this.feedback.textContent=this.local===ack.change.body?copy('已保存','Saved'):copy('还有修改未保存','Newer changes are not saved yet');
   return true;
  }catch(error){this.failed=true;if(error?.code==='CONTEXT_INVALIDATED'){this.conflicted=true;this.feedbackFailure(true);}else this.feedbackFailure();return false;}finally{this.saving=null;}})();
  const ok=await this.saving;if(ok&&this.dirty())return this.flush();if(ok)this.page.clearLeaveNotice?.();return ok;
 }
 receive(item,epoch=this.epoch){if(epoch!==this.epoch){if(this.dirty()||this.composing||this.saving){this.conflicted=true;this.feedbackFailure(true);return;}this.epoch=epoch;this.recovery=new RecoveryDraftSession({kind:'context_item',ownerId:this.id,epoch});}if(this.saving)return;if(!item||item.revision!==this.saved.revision){if(this.dirty()||this.composing){this.conflicted=true;this.feedbackFailure(true);return;}if(item){this.saved=structuredClone(item);this.local=item.body;this.field.textContent=item.body;this.feedback.replaceChildren();}}}
 async undo(){this.menu.open=false;if(!await this.flush())return;const prior=this.journal.undo.at(-1);if(!prior||!prior.body.trim())return;this.local=prior.body;this.field.textContent=prior.body;this.changed();this.undoOperationId=this.operation().operationId;await this.flush(true);this.field.focus();}
 dispose(){this.autosave.dispose();this.surface.dispose();}
}

export class ContextCardsPage {
 constructor({host,onNavigate}){this.host=host;this.onNavigate=onNavigate;this.card=null;this.snapshot=null;this.inputs=null;this.editors=new Map();this.journal=new UndoJournal();this.accessCommit=new ContextCommitSession();this.deleteCommit=new ContextCommitSession();this.busy=false;this.active=false;this.readGeneration=0;this.openGeneration=0;}
 async open(card=null){
  card=routes[card]?card:null;const generation=++this.openGeneration,rebuild=!this.active||!this.page||this.renderedCard!==card;this.active=true;this.card=card;
  await this.refresh({rebuild});if(generation!==this.openGeneration||!this.active||this.card!==card)return;
  if(this.page)this.page.inert=false;if(rebuild&&!this.page?.contains(document.activeElement))this.host.querySelector('h1')?.focus({preventScroll:true});
  if(rebuild&&this.page&&editable(card))await this.recoverNew(generation);
 }
 async refresh({rebuild=false,force=false}={}){
  if(this.busy&&!force)return;
  const generation=++this.readGeneration;
  try{const snapshot=await request('PAIA_CONTEXT_CARDS_SNAPSHOT');if(generation!==this.readGeneration||!this.active)return;this.snapshot=snapshot;
   if(rebuild||!this.page||this.renderedCard!==this.card){this.render();if(this.inputs)await this.inputs.refresh();return;}
   this.paintAccess();
   if(!this.card){for(const [k,count]of Object.entries(snapshot.counts)){const node=this.host.querySelector(`[data-count="${k}"]`);if(node)node.textContent=k==='inputs'?this.inputCount():`${count} ${copy('项','items')}`;}const summary=this.host.querySelector('.input-summary');if(summary)summary.textContent=this.inputDescription();}
   else if(editable(this.card)){
    for(const [id,editor]of this.editors){const item=snapshot.items.find(x=>x.id===id);editor.receive(item,snapshot.epoch);if(!item&&!editor.fresh&&!editor.dirty()&&!editor.composing&&!editor.saving){editor.dispose();editor.root.remove();this.editors.delete(id);}}
    for(const item of snapshot.items)if(item.card===this.card&&!this.editors.has(item.id))this.mountItem(item);
    this.paintEmpty();
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
  this.page=null;this.renderedCard=null;this.content=null;this.empty=null;this.add=null;this.globalNote=null;this.message=null;
  const panel=element('section','context-page context-load-failed');
  if(this.card){const back=button('',()=>void this.onNavigate(null),'context-back');back.append(createIcon('back'),element('span','',copy('AI 上下文','AI Context')));panel.append(back);}
  const header=element('header','context-head'),title=element('h1','',this.card?label(this.card):copy('AI 上下文','AI Context'));title.tabIndex=-1;header.append(title);
  const failure=element('p','empty-detail',copy('暂时无法读取本机上下文。','Local Context could not be loaded.'));failure.setAttribute('role','status');
  panel.append(header,failure,button(copy('重试','Retry'),()=>void this.open(this.card),'standard-button'));this.host.replaceChildren(panel);
 }
 access(key){const b=button('',()=>void this.toggle(key),'context-access'+(key==='global'?' global':''));b.dataset.key=key;return b;}
 inputCount(){const value=this.snapshot.topicChoices;return !value?copy('0 个主题开放','0 topics open'):!value.available?copy('主题选择暂不可用','Topic choices unavailable'):`${value.selectedCount} ${copy('个主题已选择','topics selected')}`;}
 inputDescription(){const value=this.snapshot.topicChoices;return value&&!value.available?copy('暂时无法读取主题选择，已有设置仍保留。','Topic choices cannot be read right now. Existing settings are retained.'):value?.available&&value.selectedCount?copy('主题选择已保留，外部读取目前不可用。','Topic choices are retained. External reading is unavailable.'):copy('还没有开放的主题','No open topics yet');}
 paintAccess(){for(const b of this.host.querySelectorAll('.context-access')){const key=b.dataset.key,value=this.snapshot.access[key],paused=key!=='global'&&value.enabled&&!this.snapshot.access.global.enabled;b.dataset.on=String(value.enabled);b.dataset.paused=String(paused);b.setAttribute('aria-pressed',String(value.enabled));b.setAttribute('aria-label',(key==='global'?copy('AI 访问','AI access'):label(key))+': '+(value.enabled?copy('已开放','Enabled'):copy('仅自己','Only me')));b.title=copy('仅保存开放设置；外部 AI 连接尚不可用。','Saves access preferences only. External AI connections are unavailable.');b.replaceChildren(element('span','state-dot'),element('span','',key==='global'?copy('AI 访问 · ','AI access · ')+(value.enabled?copy('开','On'):copy('关','Off')):value.enabled?(paused?copy('已开放','Enabled'):copy('AI 可读','AI readable')):copy('仅自己','Only me')));b.disabled=this.busy;}
  if(this.globalNote&&this.card!=='connections'){this.globalNote.hidden=!!this.inputs||this.snapshot.access.global.enabled;this.globalNote.textContent=Object.values(this.snapshot.access).some(x=>x.enabled)?copy('AI 访问已暂停，开放设置已保留。','AI access is paused. Your choices are retained.'):copy('AI 访问尚未开启。','AI access is off.');}}
 render(){
  this.inputs?.close();this.inputs=null;this.renderedCard=this.card;for(const editor of this.editors.values())editor.dispose();this.editors.clear();this.page=element('section','context-page'+(this.card?' context-detail':''));this.host.replaceChildren(this.page);
  if(this.card){const back=button('',()=>void this.onNavigate(null),'context-back');back.append(createIcon('back'),element('span','',copy('AI 上下文','AI Context')));this.page.append(back);}
  const head=element('header','context-head'),title=element('h1','',this.card?label(this.card):copy('AI 上下文','AI Context'));title.tabIndex=-1;head.append(title);if(this.card!=='connections')head.append(this.access(this.card||'global'));this.page.append(head);
  if(editable(this.card))this.page.append(element('p','maintenance',copy('人工修改始终保留；自动补充目前不可用。','Your edits are protected. Automatic updates are unavailable.')));
  this.globalNote=element('p','global-note');this.page.append(this.globalNote);
  this.message=element('div','context-notice');this.message.setAttribute('role','status');
  if(!this.card){
   const grid=element('div','context-cards');for(const k of Object.keys(names)){const card=element('article','context-card');card.dataset.card=k;const h=element('h2','card-title',label(k)),summary=element('p','card-summary'+(k==='inputs'?' input-summary':''));const descriptions={info:['基本信息 · 背景 · 经历\n语言 · 长期习惯','Background · Experience\nLanguage · Lasting habits'],rules:['回答方式 · 语言 · 表达偏好\n工作方式','Responses · Language · Preferences\nWays of working'],now:['当前项目 · 当前目标\n最近关注','Current projects · Goals\nRecent focus']};summary.textContent=k==='inputs'?this.inputDescription():copy(...descriptions[k]);const footer=element('div','card-footer'),count=element('span','',k==='inputs'?this.inputCount():`${this.snapshot.counts[k]} ${copy('项','items')}`);count.dataset.count=k;footer.append(count,createIcon('forward'));const link=element('a','card-link');link.href='#';link.setAttribute('aria-label',copy('打开','Open ')+label(k));link.onclick=e=>{e.preventDefault();void this.onNavigate(k);};card.append(h,this.access(k),summary,footer,link);grid.append(card);}this.page.append(grid);
   const connections=button('',()=>void this.onNavigate('connections'),'connections-link');connections.append(element('span','',copy('已连接的 AI','Connected AI')),element('span','connection-number',String(this.snapshot.connections)),createIcon('chevron-right'));this.page.append(connections);
  }else if(editable(this.card)){
   this.content=element('div','detail-content');this.empty=element('p','empty-detail',copy('还没有内容，可以先写一条。','No content yet. Write something to start.'));this.add=button(copy(...itemCopy[this.card].add),()=>void this.addItem(),'add-item');this.content.append(this.empty,this.add);this.page.append(this.content);for(const item of this.snapshot.items)if(item.card===this.card)this.mountItem(item);this.paintEmpty();
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
 paintEmpty(){if(this.empty)this.empty.hidden=this.editors.size>0;for(const group of this.content?.querySelectorAll('.context-section')||[])if(!group.querySelector('.context-item'))group.remove();}
 notice(text,undo=false){this.message?.replaceChildren(element('span','',text));if(undo)this.message.append(button(copy('撤销','Undo'),()=>void this.undoDelete()));}
 async toggle(key){if(this.busy)return;this.busy=true;this.paintAccess();try{const current=this.snapshot.access[key],ack=await this.accessCommit.save({kind:'access',operationId:crypto.randomUUID(),epoch:this.snapshot.epoch,key,enabled:!current.enabled,expectedRevision:current.revision});if(!ack.result.ok||ack.change.kind!=='access'||ack.result.key!==key||ack.change.key!==key)throw Error('conflict');await this.refresh({force:true});}catch{this.unconfirmed(copy('开放设置尚未确认，请核对上次操作。','Access preference is unconfirmed. Check the previous operation.'));}finally{this.busy=false;this.paintAccess();}}
 async recoverNew(generation=this.openGeneration){
  const card=this.card;try{const drafts=await request('PAIA_CONTEXT_CARDS_DRAFTS');if(!this.active||generation!==this.openGeneration||this.card!==card||!editable(card))return;
   for(const draft of drafts){const c=draft.operation.change;if((c.card??'info')!==card||c.expectedRevision!==0||this.editors.has(c.itemId))continue;const editor=this.mountItem({id:c.itemId,body:'',section:c.section,revision:0,card,lifecycle:'active'},{fresh:true});editor.recovery.currentToken=draft.token;editor.local=c.body;editor.field.textContent=c.body;editor.feedback.textContent=copy('已恢复未保存文字。','Unsaved text recovered.');editor.feedback.append(button(copy('重试','Retry'),()=>void editor.flush(true)));}this.paintEmpty();
  }catch{}
 }
 async addItem(body=''){if(this.busy||!await this.flush())return;const existing=[...this.editors.values()].find(x=>x.fresh&&!x.local.trim());if(existing){existing.field.focus();return;}const editor=this.mountItem({id:crypto.randomUUID(),body,section:copy(...itemCopy[this.card].section),revision:0,card:this.card,lifecycle:'active'},{fresh:true});this.paintEmpty();editor.field.focus();editor.field.scrollIntoView({block:'nearest'});if(body)editor.changed();}
 async remove(editor){
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
 async flush(){if(this.busy||this.inputs?.busy||this.inputs?.pending)return false;let ok=true;for(const editor of this.editors.values())if(!await editor.flush())ok=false;
  // An earlier editor can receive newer text while a later commit is awaited.
  return ok&&!this.busy&&!this.inputs?.busy&&!this.inputs?.pending&&[...this.editors.values()].every(editor=>{if(!editor.composing)editor.collect();return !editor.dirty()&&!editor.saving&&!editor.composing&&!editor.conflicted&&!editor.recoveryPending;});
 }
 unconfirmed(text){this.notice(text);if(this.accessCommit.pending||this.deleteCommit.pending)this.message?.append(button(copy('核对上次操作','Check previous operation'),()=>void this.reconcilePending()));}
 async reconcilePending(){
  if(this.busy)return false;const commit=this.accessCommit.pending?this.accessCommit:this.deleteCommit;if(!commit.pending)return true;this.busy=true;
  try{const {change,result}=await commit.save(commit.pending.change);if(!result.ok){this.notice(copy('上次操作与当前版本冲突，未改写内容。','The previous operation conflicted with the current version.'));await this.refresh({force:true});return true;}
   if(change.kind==='delete')this.journal.record({itemId:result.itemId,revision:result.revision,deletedBy:result.deletedBy});
   if(change.kind==='restore'&&this.journal.undo.at(-1)?.itemId===result.itemId)this.journal.undo.pop();
   await this.refresh({force:true});this.notice(copy('上次操作已确认。','The previous operation is confirmed.'),change.kind==='delete');return true;
  }catch{this.unconfirmed(copy('上次操作仍未确认，请稍后重试。','The previous operation is still unconfirmed. Retry later.'));return false;}finally{this.busy=false;this.paintAccess();}
 }
 async leave(){if(this.inputs?.busy||this.inputs?.pending){this.inputs.unconfirmed();return false;}if(this.accessCommit.pending||this.deleteCommit.pending){this.unconfirmed(copy('请先核对尚未确认的操作。','Check the unconfirmed operation before leaving.'));return false;}if(!await this.flush()){if(this.inputs?.busy||this.inputs?.pending){this.inputs.unconfirmed();return false;}this.leaveBlocked=true;this.notice(copy('文字尚未保存，已保留在当前页。','Unsaved text is retained on this page.'));return false;}if(this.inputs&&!this.inputs.leave())return false;++this.readGeneration;++this.openGeneration;if(this.page)this.page.inert=true;return true;}
 close(){this.active=false;++this.readGeneration;++this.openGeneration;this.renderedCard=this.card;this.inputs?.close();this.inputs=null;for(const editor of this.editors.values())editor.dispose();this.editors.clear();this.page=null;}
}

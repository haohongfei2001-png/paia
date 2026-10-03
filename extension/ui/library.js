import {editableText,editableTextSnapshot,NativeLineBreakTracker} from './editable-text.js';
import {PlainTextSurface,AutosaveSession,UndoJournal,RevisionSession} from './editor-primitives.js';
import {WorkingInputSaveSession} from './working-input-save.js';
import {RecoveryDraftSession} from './recovery-draft.js';
import {request} from './common.js';
import {validateRemovalEdit} from '../core/archive-removal.js';
const value=b=>({libraryText:b.libraryText,note:b.note,excluded:b.excluded});
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export class DocumentEditor {
 constructor(root,state,doc,onStatus,onChange,onRecovered=()=>{},onInvalidated=()=>{}){
  this.root=root;this.nativeLines=new NativeLineBreakTracker();root.tabIndex=-1;this.id=doc.id;this.onStatus=onStatus;this.onChange=onChange;this.onRecovered=onRecovered;this.onInvalidated=onInvalidated;this.savedTitle=doc.userTitle;this.title=doc.userTitle;this.titleRevision=doc.titleRevision;this.originalTitle=doc.originalConversationTitle;this.entries=new Map();this.journal=new UndoJournal();this.revisions=new RevisionSession();this.saveSession=new WorkingInputSaveSession();this.autosave=new AutosaveSession(()=>void this.flush(),{delay:500});this.undoStack=[];this.redoStack=[];this.composing=false;this.saving=false;this.failed=false;this.disposed=false;
  const recoverySources=new Set();for(const b of state.library.blocks.filter(b=>b.documentId===doc.id)){this.entries.set(b.id,{saved:value(b),local:value(b),revision:b.revision,signature:b.provenanceSignature,original:state.records.find(r=>r.id===b.originalTextReference)?.originalText??'',lastNonempty:value(b),sources:[...new Set([b.sourceRecordId,...(b.provenance||[]).map(p=>p.sourceRecordId)].filter(Boolean))]});if(b.sourceRecordId)recoverySources.add(b.sourceRecordId);for(const p of b.provenance||[])if(p.sourceRecordId)recoverySources.add(p.sourceRecordId);}this.recovery=new RecoveryDraftSession({epoch:state.recoveryEpoch,kind:'document',ownerId:this.id,sourceRecordIds:[...recoverySources]});this.recoveryFailed=false;
  this.controller=new AbortController();const options={signal:this.controller.signal};
  this.surface=new PlainTextSurface(root,{start:event=>{this.composing=true;this.autosave.cancel();void this.protectComposition(event);},end:()=>{this.composing=false;this.collect();if(!this.dirty()&&!this.saveSession.pending&&this.compositionToken)void this.recovery.clear(this.compositionToken).catch(()=>{});this.compositionToken=null;if(this.deferredState){const incoming=this.deferredState;this.deferredState=null;this.deferredEffect=this.receive(incoming);}},input:event=>{this.nativeLines.input(this.nativeField(event),event,document.getSelection());this.collect();},leave:()=>{this.collect();void this.flush();}});
  root.addEventListener('beforeinput',e=>this.beforeInput(e),options);
  // Shortcuts are scoped to this extension document editor, never a ChatGPT page.
  root.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&!e.altKey&&e.key.toLowerCase()==='z'){e.preventDefault();void this.history(e.shiftKey);}else if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='y'){e.preventDefault();void this.history(true);}},options);
  this.onStatus('已保存到本机');this.recoveryReady=this.restoreRecovery();
 }
 get undoStack(){return this.journal.undo;}
 set undoStack(v){this.journal.undo=v;}
 get redoStack(){return this.journal.redo;}
 set redoStack(v){this.journal.redo=v;}
 absorb(page){
  const records=new Map(page.records.map(r=>[r.id,r]));
  for(const b of page.library.blocks.filter(b=>b.documentId===this.id&&page.pageItemIds.includes(b.id))){
   if(this.entries.has(b.id))continue;
   const sources=[...new Set([b.sourceRecordId,...(b.provenance||[]).map(p=>p.sourceRecordId)].filter(Boolean))];
   this.entries.set(b.id,{saved:value(b),local:value(b),revision:b.revision,signature:b.provenanceSignature,original:records.get(b.originalTextReference)?.originalText??'',lastNonempty:value(b),sources});
   this.recovery.sourceRecordIds=[...new Set([...this.recovery.sourceRecordIds,...sources])];
  }
 }
 compact(visibleIds,limit=600){
  const command=this.saveSession.pending?.edit;const visible=new Set([...visibleIds,...(command?.removeScope?.members||command?.blocks||[]).map(b=>b.id)]),referenced=()=>new Set([...this.undoStack,...this.redoStack].flatMap(p=>p.map(x=>x.id)).filter(id=>id!=='title'));
  let history=referenced();
  while(new Set([...visible,...history]).size>limit&&(this.undoStack.length||this.redoStack.length)){
   if(this.undoStack.length)this.undoStack.shift();else this.redoStack.shift();
   history=referenced();
  }
  for(const [id,e] of this.entries)if(!visible.has(id)&&!history.has(id)&&equal(e.local,e.saved))this.entries.delete(id);
  this.recovery.sourceRecordIds=[...new Set([...this.entries.values()].flatMap(e=>e.sources||[]))];
 }
 nativeField(event){const field=event.target?.closest?.('[data-edit-id]');return field&&this.root.contains(field)?field:null;}
 field(id){return [...this.root.querySelectorAll('[data-edit-id]')].find(el=>el.dataset.editId===id);}
 text(e){return e.local.libraryText??e.original;}
 dirty(){return this.title!==this.savedTitle||[...this.entries.values()].some(e=>!equal(e.local,e.saved));}
 collect(){if(this.composing||this.disposed)return;const changes=[];const title=this.root.querySelector('#document-title');const entered=title.innerText.replace(/\n/g,'').slice(0,300);const desired=entered===(this.originalTitle||'独立整理文档')&&this.title===''?'':entered;if(desired!==this.title)changes.push({id:'title',after:desired});for(const [id,e]of this.entries){const el=this.field(id);if(!el||e.local.excluded)continue;const text=editableText(el);if(text!==this.text(e))changes.push({id,after:{...e.local,libraryText:text}});}if(changes.length)this.change(changes);}
 change(changes,record=true){const patches=[];for(const {id,after}of changes){const before=id==='title'?this.title:{...this.entries.get(id).local};if(equal(before,after))continue;patches.push({id,before,after});if(id==='title')this.title=after;else{const e=this.entries.get(id);e.local={...after};if(this.text(e).length)e.lastNonempty={...e.local};}}
  if(!patches.length)return;if(record){this.journal.record(patches);}if(!this.saveSession.unresolved){this.failed=false;if(!this.conflicted)this.onStatus('正在保存…');this.autosave.schedule();}void this.protectRecovery();this.onChange();
 }
 // Pin the actual composing Input through the existing recovery owner before
 // another page can admit deletion. No composing keystrokes are collected.
 async protectComposition(event){
  const id=event.target.closest?.('[data-edit-id]')?.dataset.editId,e=this.entries.get(id);
  let edit=this.buildEdit();
  if(!edit&&e)edit=this.revisions.attempt({documentId:this.id,blocks:[{id,expectedRevision:e.revision,...e.saved}]});
  if(!edit&&event.target.id==='document-title')edit=this.revisions.attempt({documentId:this.id,blocks:[],title:this.savedTitle,expectedTitleRevision:this.titleRevision});
  if(!edit)return;
  this.compositionToken=edit.operationId;await this.protectRecovery(edit);
 }
 async history(redo=false){if(this.composing)return;this.collect();const from=redo?this.redoStack:this.undoStack,to=redo?this.undoStack:this.redoStack;if(!from.length)return;const patches=from.pop();this.change(patches.map(p=>({id:p.id,after:redo?p.after:p.before})),false);to.push(patches);this.paint();await this.flush();}
 async exclude(id,excluded){if(this.composing)return false;this.collect();if(!await this.flush())return false;const e=this.entries.get(id);if(!e)return false;this.change([{id,after:{...e.local,excluded}}]);this.paint();this.root.focus();return this.flush();}
 note(id,text){const e=this.entries.get(id);if(e)this.change([{id,after:{...e.local,note:text}}]);}
 paint(){const title=this.root.querySelector('#document-title');if(title&&title.innerText!==(this.title||this.originalTitle||'独立整理文档'))title.textContent=this.title||this.originalTitle||'独立整理文档';for(const [id,e]of this.entries){const el=this.field(id);if(el){if(editableText(el)!==this.text(e)){this.nativeLines.clear(el);el.textContent=this.text(e);}el.closest('.library-block').hidden=e.saved.excluded;}}this.onChange();}
 replaceWholeInput(event,field,selection,range){
  if(event.type!=='beforeinput'||!event.isTrusted||!event.cancelable||event.defaultPrevented||event.inputType!=='insertText'||typeof event.data!=='string'||this.disposed||this.composing||event.isComposing||this.removalLocks||!selection?.rangeCount||selection.isCollapsed||!field.isContentEditable||field!==this.nativeField(event))return false;
  const id=field.dataset.editId,entry=this.entries.get(id);if(!entry||entry.local.excluded||!field.contains(range.startContainer)||!field.contains(range.endContainer))return false;
  const snapshot=editableTextSnapshot(field);if(snapshot.offset(range.startContainer,range.startOffset)!==0||snapshot.offset(range.endContainer,range.endOffset)!==snapshot.text.length)return false;
  // The author explicitly replaces this complete Working Input. Use the same
  // journal/recovery/save owner as every other edit; do not infer text by
  // deleting a browser-generated leading BR after Chromium's replacement.
  this.collect();event.preventDefault();this.change([{id,after:{...entry.local,libraryText:event.data}}]);
  this.nativeLines.clear(field);field.textContent=event.data;
  const caret=field.firstChild||field,offset=field.firstChild?event.data.length:0;selection.setBaseAndExtent(caret,offset,caret,offset);
  // Notify existing Reader listeners. Collect sees the same model value, so
  // this synthetic notification cannot create a second journal/save operation.
  field.dispatchEvent(new Event('input',{bubbles:true}));return true;
 }
 beforeInput(event){
  const selection=document.getSelection();this.nativeLines?.before(this.nativeField(event),event,selection);
  if(event.inputType==='historyUndo'||event.inputType==='historyRedo'){event.preventDefault();void this.history(event.inputType==='historyRedo');return;}
  if(this.composing||event.isComposing||!selection?.rangeCount||selection.isCollapsed)return;
  const range=selection.getRangeAt(0);if(!this.root.contains(range.startContainer)||!this.root.contains(range.endContainer))return;
  const fields=[...this.root.querySelectorAll('[data-edit-id]')].filter(el=>!el.closest('.library-block').hidden&&range.intersectsNode(el));
  if(fields.length>=2){event.preventDefault();this.onStatus('不能跨输入修改，请逐条编辑；所选文字仍可复制。','boundary');return;}
  if(fields.length===1)this.replaceWholeInput(event,fields[0],selection,range);
 }
 buildEdit(){
  const pending=this.saveSession.pending?.edit;
  if(pending?.removeScope)return pending;
  if(!this.dirty()&&!pending)return null;
  if(pending?.restoreRevisionId&&pending.blocks.every(b=>equal(this.entries.get(b.id)?.local,value(b)))&&(pending.title===undefined||this.title===pending.title))return pending;
  const pendingBlocks=new Map((pending?.blocks||[]).map(b=>[b.id,b]));
  const blocks=[...this.entries].filter(([id,e])=>!equal(e.local,e.saved)||(pendingBlocks.has(id)&&!equal(e.local,value(pendingBlocks.get(id))))).map(([id,e])=>({id,expectedRevision:e.revision,...e.local}));
  const title=this.title!==this.savedTitle||(pending?.title!==undefined&&this.title!==pending.title)?this.title:undefined;
  if(!blocks.length&&title===undefined)return null;
  return this.revisions.attempt({documentId:this.id,blocks,...(title===undefined?{}:{title,expectedTitleRevision:this.titleRevision})});
 }
 async protectRecovery(edit=this.buildEdit()){
  if(!edit)return true;
  const pending=this.saveSession.pending?.edit;
  if(pending){const comparable=({...request})=>{delete request.operationId;return request;};if(equal(comparable(edit),comparable(pending)))edit=pending;}
  const operation={type:'EDIT_DOCUMENT',edit,...(pending?.restoreRevisionId||pending?.removeScope?{pendingRequest:JSON.stringify(pending)}:{})};
  try{await this.recovery.protect(operation,edit.operationId);this.recoveryFailed=false;return true;}catch{this.recoveryFailed=true;return false;}
 }
 applyRecovery(edit){if(edit?.title!==undefined)this.title=edit.title;for(const b of edit?.blocks||[]){const e=this.entries.get(b.id);if(e)e.local={libraryText:b.libraryText,note:b.note,excluded:b.excluded};}this.paint();}
 acknowledge(edit){
  if(edit.removeScope){
   const ids=new Set(edit.removeScope.members.map(ref=>ref.id));
   this.undoStack=this.undoStack.filter(patches=>!patches.some(p=>ids.has(p.id)));this.redoStack=this.redoStack.filter(patches=>!patches.some(p=>ids.has(p.id)));
   for(const ref of edit.removeScope.members){const e=this.entries.get(ref.id);if(!e)continue;e.saved={...e.saved,excluded:true};e.local={...e.local,excluded:true};e.revision=ref.expectedRevision+1;const field=this.field(ref.id);if(field)field.closest('.library-block').hidden=true;}
   this.lockRemoval(false);this.onChange?.();return;
  }
  for(const b of edit.blocks){const e=this.entries.get(b.id);if(!e)continue;e.saved={libraryText:b.libraryText,note:b.note,excluded:b.excluded};e.revision=b.expectedRevision+1;const field=this.field(b.id);if(field)field.closest('.library-block').hidden=e.saved.excluded;}
  if(edit.title!==undefined){this.savedTitle=edit.title;this.titleRevision=edit.expectedTitleRevision+1;}
 }
 async admitRecoveryInputs(edits){
  for(const id of new Set(edits.flatMap(edit=>(edit?.blocks||[]).map(b=>b.id)))){
   if(this.entries.has(id))continue;
   const b=await request('GET_INPUT',{id});if(b.documentId!==this.id)throw Object.assign(Error('Invalid recovery owner'),{code:'INVALID_REQUEST'});
   const p=await request('PAIA_ARCHIVE_ORIGINAL_PAGE',{page:{target:{kind:'input',ref:id},limit:100}});
   if(p.availability!=='available'||p.nextCursor)throw Object.assign(Error('Unavailable recovery source'),{code:'INVALID_REQUEST'});
   this.absorb({records:p.records,library:{blocks:[b]},pageItemIds:[id]});
  }
 }
 lockRemoval(locked){
  if(locked){if(this.removalLocks)return;this.removalLocks=new Map();for(const field of this.root?.querySelectorAll?.('[contenteditable]')||[]){this.removalLocks.set(field,field.getAttribute('contenteditable'));field.setAttribute('contenteditable','false');}this.root?.setAttribute?.('aria-busy','true');}
  else{for(const [field,attribute]of this.removalLocks||[])if(field.isConnected){if(attribute===null)field.removeAttribute('contenteditable');else field.setAttribute('contenteditable',attribute);}this.removalLocks=null;this.root?.removeAttribute?.('aria-busy');}
 }
 async removalConflict(edit){
  try{await this.recovery.clear(edit.operationId);}
  catch(error){await this.saveSession.stage(edit,this.recovery.epoch,'not_committed');throw error;}
  this.lockRemoval(false);this.failed=false;this.conflicted=false;
  this.onStatus('范围或版本已变化，尚未移出。请重新核对。','conflict');return false;
 }
 async removePrepared(prepared){
  await this.recoveryReady;
  if(this.disposed||this.composing||this.saving||this.failed||this.conflicted||this.saveSession.pending)return false;
  this.collect();if(this.dirty())return false;const edit=prepared?.edit;try{validateRemovalEdit(edit);}catch{return false;}
  if(edit.documentId!==this.id||edit.removeScope.members.some(ref=>this.entries.has(ref.id)&&this.entries.get(ref.id).revision!==ref.expectedRevision))return false;
  await this.saveSession.stage(edit,this.recovery.epoch);this.lockRemoval(true);this.onStatus('正在保存…');return this.flush();
 }
 async restorePrepared(prepared){
  if(this.disposed||this.composing||this.saving||this.failed||this.conflicted||this.saveSession.pending)return false;
  this.collect();if(this.dirty())return false;
  const edit=prepared?.edit;if(edit?.documentId!==this.id||!edit.restoreRevisionId)return false;
  if(prepared.input)this.absorb({records:prepared.records,library:{blocks:[prepared.input]},pageItemIds:[prepared.input.id]});
  if(edit.title!==undefined&&edit.expectedTitleRevision!==this.titleRevision||edit.blocks.some(b=>this.entries.get(b.id)?.revision!==b.expectedRevision))return false;
  await this.saveSession.stage(edit,this.recovery.epoch);
  this.applyRecovery(edit);this.onStatus('正在保存…');return this.flush();
 }
 async restoreRecovery(){
  let draft;try{draft=await this.recovery.load();}catch{return false;}if(!draft)return false;
  const operation=draft.operation,edit=operation?.edit;let pending;
  try{if(operation?.pendingRequest!==undefined){if(typeof operation.pendingRequest!=='string'||operation.pendingRequest.length>800000)throw Error('Invalid recovery request');pending=JSON.parse(operation.pendingRequest);}}catch{await this.recovery.clear(draft.token).catch(()=>{});return false;}
  if(operation?.type!=='EDIT_DOCUMENT'||edit?.documentId!==this.id||pending&&(pending.documentId!==this.id||!pending.restoreRevisionId&&!pending.removeScope)){await this.recovery.clear(draft.token).catch(()=>{});return false;}
  try{
   if(edit.removeScope)validateRemovalEdit(edit);if(pending?.removeScope)validateRemovalEdit(pending);
   await this.admitRecoveryInputs([edit,pending]);
   if(pending){await this.saveSession.stage(pending,this.recovery.epoch,'unknown');this.applyRecovery(edit);if(pending.removeScope)this.lockRemoval(true);}
   const acknowledged=await this.saveSession.save(pending||edit,this.recovery.epoch),result=acknowledged.result;
   if(result?.conflict&&acknowledged.edit.removeScope)return await this.removalConflict(acknowledged.edit);
   if(result?.conflict){this.applyRecovery(edit);this.failed=true;this.conflicted=true;this.onStatus('检测到上次未完成的修改，但已保存版本同时发生变化。草稿已恢复到页面，未自动覆盖。','conflict');return false;}
   if(pending){this.acknowledge(acknowledged.edit);if(this.dirty()){await this.protectRecovery();queueMicrotask(()=>void this.flush());return true;}}
   await this.recovery.clear(draft.token).catch(()=>{});this.onStatus('已恢复上次未完成的修改');queueMicrotask(()=>this.onRecovered());return true;
  }catch(error){
   if(error?.code==='INVALID_REQUEST'){this.saveSession.pending=null;this.lockRemoval(false);await this.recovery.clear(draft.token).catch(()=>{});return false;}
   this.applyRecovery(edit);this.failed=true;
   this.onStatus(error?.code==='SAVE_OUTCOME_UNKNOWN'?'保存结果暂时无法确认。上次未完成的草稿已恢复，请核对保存结果。':'检测到上次未完成的修改。草稿仍保存在本机，可在连接恢复后重试。',error?.code==='SAVE_OUTCOME_UNKNOWN'?'unknown':'error');return false;
  }
 }
 get recoveryPending(){return !!this.recovery?.pending;}
 async flush(){
  this.autosave.cancel();
  if(this.disposed||this.composing||this.failed||this.conflicted)return false;
  if(this.saving){await this.pending;return this.dirty()||this.saveSession.pending?this.flush():!this.failed;}
  if(!this.dirty()&&!this.saveSession.pending)return true;
  const edit=this.saveSession.pending?.edit||this.buildEdit();this.saving=true;
  this.pending=(async()=>{
   await this.protectRecovery(this.buildEdit()||edit);
   try{
    const acknowledged=await this.saveSession.save(edit,this.recovery.epoch),result=acknowledged.result;
    if(result.conflict){if(acknowledged.edit.removeScope)return await this.removalConflict(acknowledged.edit);this.failed=true;this.conflicted=true;this.onStatus('其他页面或来源发生变化。当前修改尚未保存。','conflict');return false;}
    this.acknowledge(acknowledged.edit);
    this.onStatus(this.dirty()?'正在保存…':'已保存到本机');
    void this.recovery.clear(acknowledged.edit.operationId).catch(()=>{});return true;
   }catch(error){
    this.failed=true;
    if(error?.code==='SAVE_OUTCOME_UNKNOWN')this.onStatus(this.recoveryFailed?'保存结果暂时无法确认；恢复草稿也未能写入。请保持此页打开，核对结果或复制文字。':'保存结果暂时无法确认。内容和恢复草稿保留在本机，请核对保存结果。','unknown');
    else this.onStatus(this.recoveryFailed?'尚未保存；恢复草稿也未能写入。请保持此页打开并重试或复制文字。':'尚未保存，内容仍在这里；恢复草稿已保存在本机。','error');
    return false;
   }finally{this.saving=false;if(this.deferredState){const incoming=this.deferredState;this.deferredState=null;this.deferredEffect=this.receive(incoming);}}
  })();
  const ok=await this.pending;if(ok&&this.dirty())return this.flush();return ok;
 }
 // Only physical absence proved by the tracked-ID read clears a pinned
 // projection. An excluded, filtered, omitted or moved Input is different.
 clearUnavailable(state){
  const ids=new Set((state.unavailableTrackedInputIds||[]).filter(id=>this.entries.has(id)&&!state.library.blocks.some(b=>b.id===id)));
  if(!ids.size)return false;
  const active=globalThis.document?.activeElement,keepActive=active&&this.root?.contains(active)&&![...ids].some(id=>this.field(id)?.contains(active)),top=keepActive?active.getBoundingClientRect?.().top:null;
  for(const id of ids){const e=this.entries.get(id),field=this.field(id),section=field?.closest('.library-block');e.original='';if(field)field.textContent='';section?.replaceChildren();section?.remove();this.entries.delete(id);}
  this.undoStack=this.undoStack.map(patches=>patches.filter(p=>!ids.has(p.id))).filter(patches=>patches.length);
  this.redoStack=this.redoStack.map(patches=>patches.filter(p=>!ids.has(p.id))).filter(patches=>patches.length);
  this.recovery.sourceRecordIds=[...new Set([...this.entries.values()].flatMap(e=>e.sources||[]))];
  this.onInvalidated?.([...ids]);this.onChange?.();
  if(top!==null&&top!==undefined&&active.isConnected){const delta=active.getBoundingClientRect().top-top;if(delta)window.scrollBy(0,delta);}
  return true;
 }
 receive(state){const cleared=this.clearUnavailable(state);if(this.saving||this.composing){this.deferredState=state;return cleared?{removed:true}:undefined;}const doc=state.conversations.find(d=>d.id===this.id);let invalid=false;for(const [id,e]of this.entries){const b=state.library.blocks.find(b=>b.id===id);if(!b||b.provenanceSignature!==e.signature){invalid=true;break;}}
  if(invalid){if(this.dirty()){this.failed=true;this.conflicted=true;this.onStatus('来源或记录已变化，当前输入修改尚未保存。请保留当前文字后重新打开。','conflict');return;}this.autosave.cancel();this.undoStack=[];this.redoStack=[];const carry=[];let conflict=false;for(const [id,e]of this.entries){const b=state.library.blocks.find(b=>b.id===id);if(b&&b.provenanceSignature===e.signature&&!equal(e.local,e.saved)){carry.push({id,after:{...e.local}});if(b.revision!==e.revision)conflict=true;}}if(doc&&this.title!==this.savedTitle){carry.push({id:'title',after:this.title});if(doc.titleRevision!==this.titleRevision)conflict=true;}return {rebuild:true,carry,conflict,removed:true};}
  if(this.saveSession.unresolved){this.deferredState=state;return;}
  const current=state.library.blocks.filter(b=>b.documentId===this.id);const newContent=current.some(b=>!this.entries.has(b.id));
  if(!doc)return;if(doc.titleRevision>this.titleRevision){if(this.title!==this.savedTitle||document.activeElement===this.root.querySelector('#document-title')){this.failed=true;this.conflicted=true;this.onStatus('其他页面已修改标题，当前修改尚未保存。','conflict');}else{this.title=this.savedTitle=doc.userTitle;this.titleRevision=doc.titleRevision;this.root.querySelector('#document-title').textContent=doc.userTitle||this.originalTitle||'独立整理文档';}}
  for(const [id,e]of this.entries){const b=state.library.blocks.find(b=>b.id===id);if(b.revision>e.revision){if(!equal(e.local,e.saved)||document.activeElement===this.field(id)){this.failed=true;this.conflicted=true;this.onStatus('其他页面已修改正文，当前修改尚未保存。','conflict');}else{e.local=e.saved=value(b);e.revision=b.revision;const el=this.field(id);if(el){el.textContent=this.text(e);el.closest('.library-block').hidden=e.local.excluded;}this.undoStack=[];this.redoStack=[];}}}if(!this.dirty()&&!this.root.contains(document.activeElement))this.paint();return newContent?{newContent:true}:cleared?{removed:true}:undefined;
 }
 exportHistory(){const undo=structuredClone(this.undoStack),redo=structuredClone(this.redoStack);const ids=()=>[...new Set([...undo,...redo].flatMap(p=>p.map(x=>x.id)).filter(id=>id!=='title'))];while(ids().length>900){if(undo.length)undo.shift();else redo.shift();}return {undo,redo,ids:ids(),revisions:Object.fromEntries(ids().map(id=>[id,{revision:this.entries.get(id).revision,signature:this.entries.get(id).signature}])),titleRevision:this.titleRevision};}
 importHistory(saved){if(saved.titleRevision!==this.titleRevision||saved.ids.some(id=>{const e=this.entries.get(id),prior=saved.revisions[id];return !e||e.revision!==prior.revision||e.signature!==prior.signature;}))return;this.undoStack=saved.undo;this.redoStack=saved.redo;}
 dispose(){this.disposed=true;for(const field of this.root.querySelectorAll('[data-edit-id]'))this.nativeLines.clear(field);this.autosave.dispose();this.surface.dispose();this.controller.abort();this.undoStack=[];this.redoStack=[];this.entries.clear();}
}

// Thought editing is scoped to the trusted extension document, never ChatGPT.
export class ThoughtEditor {
 constructor(root,row,categories,onStatus){
  this.root=root;this.id=row.id;this.revision=row.revision;this.onStatus=onStatus;this.undoStack=[];this.redoStack=[];this.saving=false;this.failed=false;this.composing=false;this.disposed=false;
  this.saved=this.fromRow(row,categories);this.local=structuredClone(this.saved);this.controller=new AbortController();const options={signal:this.controller.signal};
  root.addEventListener('input',()=>{if(!this.composing)this.collect();},options);
  root.addEventListener('compositionstart',()=>{this.composing=true;clearTimeout(this.timer);},options);
  root.addEventListener('compositionend',()=>{this.composing=false;this.collect();},options);
  root.addEventListener('focusout',()=>{if(!this.composing){this.collect();void this.flush();}},options);
  root.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&!e.altKey&&e.key.toLowerCase()==='z'){e.preventDefault();void this.history(e.shiftKey);}},options);
  root.addEventListener('beforeinput',e=>{if(e.inputType==='historyUndo'||e.inputType==='historyRedo'){e.preventDefault();void this.history(e.inputType==='historyRedo');}},options);
  this.paint();this.onStatus('已保存到本机');
 }
 fromRow(row,categories){return {title:row.title,thoughtText:row.thoughtText,note:row.note,topics:row.topics.map(id=>categories.find(c=>c.id===id)?.name||id.split(':').slice(1).join(':')),types:row.types.map(id=>categories.find(c=>c.id===id)?.name||id.split(':').slice(1).join(':'))};}
 dirty(){return !equal(this.saved,this.local);}
 collect(){const value={};for(const el of this.root.querySelectorAll('[data-thought-field]')){const key=el.dataset.thoughtField,text=el.matches('input,textarea')?el.value:el.textContent===''?'':el.innerText;value[key]=['topics','types'].includes(key)?text.split(/[,，]/).map(s=>s.trim()).filter(Boolean):text;}if(!equal(value,this.local)){this.undoStack.push(structuredClone(this.local));this.redoStack=[];while(this.undoStack.length>50||JSON.stringify(this.undoStack).length>2000000)this.undoStack.shift();this.local=value;this.failed=false;this.onStatus('正在保存…');clearTimeout(this.timer);this.timer=setTimeout(()=>void this.flush(),750);}}
 paint(){for(const el of this.root.querySelectorAll('[data-thought-field]')){const value=this.local[el.dataset.thoughtField],text=Array.isArray(value)?value.join(', '):value;if(el.matches('input,textarea'))el.value=text;else el.textContent=text;}}
 async history(redo=false){if(this.composing)return;this.collect();const from=redo?this.redoStack:this.undoStack,to=redo?this.undoStack:this.redoStack;if(!from.length)return;to.push(structuredClone(this.local));this.local=from.pop();this.paint();await this.flush();}
 async flush(){clearTimeout(this.timer);if(this.disposed||this.composing||this.conflicted||this.failed)return false;if(this.saving){await this.pending;return this.dirty()?this.flush():true;}if(!this.dirty())return true;this.saving=true;const changes=structuredClone(this.local),edit={id:this.id,expectedRevision:this.revision,changes};const signature=JSON.stringify(edit);if(this.lastAttempt?.signature!==signature)this.lastAttempt={signature,operationId:crypto.randomUUID()};edit.operationId=this.lastAttempt.operationId;
  this.pending=(async()=>{try{const result=await request('EDIT_THOUGHT',{edit});if(result.conflict){this.conflicted=true;this.onStatus('其他页面或来源发生变化，当前 Thought 修改尚未保存。','conflict');return false;}this.saved=changes;this.revision=result.revision;this.onStatus(this.dirty()?'正在保存…':'已保存到本机');return true;}catch{this.failed=true;this.onStatus('尚未保存。当前修改保留在页面，可重试。','error');return false;}finally{this.saving=false;}})();const ok=await this.pending;if(ok&&this.dirty())return this.flush();return ok;
 }
 receive(row,categories){if(this.saving)return;if(row.revision>this.revision){this.undoStack=[];this.redoStack=[];if(this.dirty()){this.conflicted=true;this.onStatus('其他页面或来源发生变化，当前 Thought 修改尚未保存。','conflict');}else{this.revision=row.revision;this.saved=this.fromRow(row,categories);this.local=structuredClone(this.saved);this.paint();}}}
 dispose(){this.disposed=true;clearTimeout(this.timer);this.controller.abort();this.undoStack=[];this.redoStack=[];}
}

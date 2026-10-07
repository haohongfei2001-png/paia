import {TopicWorkspacePresentation} from './topic-workspace-presentation.js';
import {PersonalTopicRoot} from './personal-topic-root.js';
import {resolveTopicRootTarget} from './topic-root-target.js';
import {canRetainRootMetadata} from './topic-root-slots.js';
import {ContinuousRootReader} from './continuous-root-reader.js';
import {expressionYear,expressionCaption} from './topic-expression.js';
import {topicRootCaption} from './topic-root.js';
import {thoughtCopy as tc,watchThoughtCopy} from './thought-copy.js';
import {recomposeMemory,stopMemoryRecomposition} from './memory-recomposition.js';
import {copyReadingText} from './reading-actions.js';
import {boundedLocalRead,libraryReadFailureText} from './optional-library-status.js';
import {reconcile,placeChildren} from './retained-dom.js';
import {isComposing} from './session-lifecycle.js';
import {revisionPreview} from './revision-preview.js';
import {beginLoading,showLocalFailure,setProductState,productAction,announce} from './product-state.js';
import {highlightText,highlightReading,wireSearchKeyboard,wireContinuousKeyboard} from './search-experience.js';
import {AIReadingEditor} from './ai-presentation.js';
import {ContinuousCollection,continuousItemKey} from './continuous-collection.js';
import {ContinuousTopicReader} from './continuous-topic-reader.js';
import {request,element} from './common.js';
import {LibraryEntryEditor} from './library-entry-editor.js';
import {AutosaveSession,RevisionSession,textOf} from './editor-primitives.js';
import {RecoveryDraftSession} from './recovery-draft.js';
import {setIconLabel,setIconOnly} from './icons.js';
const $=id=>document.getElementById(id),op=()=>crypto.randomUUID();
const button=(label,run)=>{const b=element('button','',label);b.type='button';b.addEventListener('click',()=>void Promise.resolve().then(run).catch(()=>showLocalFailure()));return b;};
const editable=(tag,field,value,label)=>{const e=element(tag,'',value);e.contentEditable='plaintext-only';e.dataset[field[0]]=field[1];e.setAttribute('aria-label',label);return e;};
// Menus are scoped to trusted Library UI; native details keeps Tab/Enter access.
const actionMenu=(label,items)=>{const menu=element('details','library-actions'),trigger=element('summary'),panel=element('div','library-action-list');setIconOnly(trigger,'more',label);trigger.setAttribute('role','button');trigger.setAttribute('aria-expanded','false');menu.append(trigger,panel);for(const [text,run]of items){const b=button(text,()=>{menu.open=false;trigger.focus({preventScroll:true});return run();});panel.append(b);}menu.addEventListener('toggle',()=>{trigger.setAttribute('aria-expanded',String(menu.open));if(menu.open)for(const other of document.querySelectorAll('.library-actions[open]'))if(other!==menu)other.open=false;});menu.addEventListener('keydown',event=>{if(event.key==='Escape'&&menu.open){event.preventDefault();event.stopPropagation();menu.open=false;trigger.focus({preventScroll:true});}});menu.addEventListener('focusout',event=>{if(event.relatedTarget&&!menu.contains(event.relatedTarget))menu.open=false;});return menu;};
const revisionLabel=r=>r.reason==='edit'&&r.kind==='topic'&&r.fieldMask?.includes('name')?'主题重命名':r.reason==='edit'&&r.kind==='section'?'章节重命名':({edit:'用户编辑',user_edit:'用户编辑',create:'创建',ai_update:'AI 更新',refresh:'AI 更新',delete:'删除',restore:'恢复',rename:'重命名',merge:'合并',reorder:'调整顺序',place:'添加到主题',unplace:'移出主题',pin:'置顶',update:'更新'}[r.reason]||(r.actor==='ai'?'AI 整理':'用户操作'));
const stale=e=>e.archiveChanged?tc('档案有更新 · 查看'):e.thoughtEditedAt?tc('已在思想库编辑'):e.freshness==='stale'?(e.integrity==='partial'||e.integrity==='detached'?'部分来源已移除':'来源已更新'):'';
export class MetadataEditor {
 constructor(root,row,kind,onStatus){this.root=root;this.row=row;this.kind=kind;this.editIntent=0;this.disposed=false;this.onStatus=(...args)=>{if(!this.disposed)onStatus(...args);};this.fields=kind==='topic'?['name','summary']:['title'];this.saved=Object.fromEntries(this.fields.map(f=>[f,row[f]]));this.local={...this.saved};this.revisions=new RevisionSession();this.recovery=new RecoveryDraftSession({epoch:row.recoveryEpoch,kind:kind==='topic'?'topic_metadata':'section_metadata',ownerId:kind==='topic'?row.id:row.topicId+':'+row.sectionId});this.recoveryFailed=false;this.autosave=new AutosaveSession(()=>void this.flush());this.controller=new AbortController();const o={signal:this.controller.signal};root.addEventListener('compositionstart',()=>{this.noteEditIntent();this.composing=true;this.autosave.cancel();},o);root.addEventListener('compositionend',()=>{this.composing=false;this.collect();},o);root.addEventListener('input',()=>{this.noteEditIntent();if(!this.composing)this.collect();},o);root.addEventListener('focusout',()=>{if(!this.composing){this.collect();void this.flush();}},o);this.recoveryReady=this.restoreRecovery();}
 noteEditIntent(){this.editIntent++;if(this.recoveryAttempt){this.recoveryAttempt=null;this.recoveryUnacknowledged=false;this.revisions.last=null;}}
 paint(){if(this.disposed||this.composing)return;for(const field of this.fields){const node=this.root.querySelector(`[data-meta-field="${field}"]`);if(!node)continue;const value=this.local[field]??'';if(node.matches('input,textarea,select')){if(node.value!==value)node.value=value;}else if(node.textContent!==value)node.textContent=value;if(field==='summary'&&this.local[field]!==this.saved[field]){const note=node.closest?.('[data-topic-note-editor]');if(note)note.hidden=false;}}}
 dirty(){return this.fields.some(f=>this.saved[f]!==this.local[f]);}
 collect(){if(this.disposed||this.composing)return;for(const f of this.fields){const e=this.root.querySelector(`[data-meta-field="${f}"]`);if(e)this.local[f]=textOf(e);}if(this.dirty()){if(!this.conflicted){this.failed=false;this.autosave.schedule();this.onStatus('正在保存…');}void this.protectRecovery();}}
 buildEdit(){if(!this.dirty())return null;const changes=Object.fromEntries(this.fields.filter(f=>this.local[f]!==this.saved[f]).map(f=>[f,this.local[f]]));const base=this.kind==='topic'?{id:this.row.id,expectedRevision:this.conflicted&&Number.isInteger(this.conflictBaseRevision)?this.conflictBaseRevision:this.row.revision,changes}:{topicId:this.row.topicId,sectionId:this.row.sectionId,expectedRevision:this.row.revision,title:changes.title};if(this.recoveryAttempt?.signature===JSON.stringify(base))return structuredClone(this.recoveryAttempt.edit);return this.revisions.attempt(base);}
 async protectRecovery(edit=this.buildEdit()){if(!edit)return true;try{await this.recovery.protect({type:this.kind==='topic'?'EDIT_LIBRARY_TOPIC':'EDIT_LIBRARY_SECTION',edit},edit.operationId);this.recoveryFailed=false;return true;}catch{this.recoveryFailed=true;return false;}}
 async restoreRecovery(){
  let draft;try{draft=await this.recovery.load();}catch{return false;}if(this.disposed||!draft||this.composing||this.dirty())return false;this.recoveryToken=draft.token;
  const operation=draft.operation,edit=operation?.edit,type=this.kind==='topic'?'EDIT_LIBRARY_TOPIC':'EDIT_LIBRARY_SECTION';if(operation?.type!==type){await this.recovery.clear(draft.token).catch(()=>{});return false;}
  const changes=this.kind==='topic'?edit.changes:{title:edit.title},before={...this.local},intent=this.editIntent,token=this.recovery.currentToken,base=this.kind==='topic'?{id:edit.id,expectedRevision:edit.expectedRevision,changes:Object.fromEntries(this.fields.filter(field=>Object.hasOwn(changes,field)).map(field=>[field,changes[field]]))}:{topicId:edit.topicId,sectionId:edit.sectionId,expectedRevision:edit.expectedRevision,title:edit.title};this.revisions.last={signature:JSON.stringify(base),operationId:edit.operationId};this.recoveryAttempt={signature:JSON.stringify(base),edit:structuredClone(edit)};this.recoveryUnacknowledged=true;
  const restoreLocal=()=>{if(this.disposed||this.editIntent!==intent||this.recovery.currentToken!==token)return;for(const [field,value]of Object.entries(changes))if(this.local[field]===before[field]&&!this.composing)this.local[field]=value;this.paint();};
  try{
   const result=await request(type,{edit});if(this.disposed)return false;this.recoveryUnacknowledged=false;if(result?.conflict){this.conflictBaseRevision=edit.expectedRevision;restoreLocal();this.conflicted=true;this.onStatus('检测到上次未完成的标题或说明修改，但已保存版本同时变化。草稿已保留，未自动覆盖。','conflict');return false;}
   if(result.revision<this.row.revision){await this.recovery.clear(draft.token).catch(()=>{});this.onStatus('上次修改已保存；当前显示更新的版本。');return true;}
   Object.assign(this.saved,changes);this.row.revision=result.revision;restoreLocal();await this.recovery.clear(draft.token).catch(()=>{});if(this.disposed)return false;
   if(this.dirty()&&!this.composing){this.autosave.schedule();void this.protectRecovery();}
   this.onStatus(this.dirty()?'上次修改已恢复，当前新草稿仍保留。':'已恢复上次未完成的标题或说明修改');return true;
  }catch(error){
   if(this.disposed)return false;if(error?.code==='INVALID_REQUEST'){this.recoveryUnacknowledged=false;await this.recovery.clear(draft.token).catch(()=>{});return false;}
   restoreLocal();this.failed=true;this.onStatus('检测到上次未完成的标题或说明修改。草稿仍保留，可重试或复制。','error');return false;
  }finally{if(!this.disposed&&!this.recoveryUnacknowledged&&this.incoming){const next=this.incoming;this.incoming=null;this.receive(next);}}
 }
 get recoveryPending(){return !!this.recovery?.pending;}
 async flush(){this.autosave.cancel();if(this.composing||this.failed||this.conflicted)return false;if(this.saving){await this.pending;return this.dirty()?this.flush():true;}if(!this.dirty())return true;const edit=this.buildEdit(),changes=this.kind==='topic'?edit.changes:{title:edit.title};await this.protectRecovery(edit);this.saving=true;this.pending=(async()=>{try{const r=await request(this.kind==='topic'?'EDIT_LIBRARY_TOPIC':'EDIT_LIBRARY_SECTION',{edit});if(r.conflict){this.recoveryUnacknowledged=false;this.conflicted=true;this.onStatus('标题或组织已在其他页面更新，当前草稿尚未保存。','conflict');return false;}Object.assign(this.saved,changes);this.row.revision=r.revision;this.recoveryUnacknowledged=false;this.onStatus('已保存到本机');void this.recovery.clear(edit.operationId);return true;}catch{this.failed=true;this.onStatus(this.recoveryFailed?'尚未保存，恢复草稿也未能写入。请保持此页打开并重试。':'尚未保存，标题草稿已保存在本机，可重试。','error');return false;}finally{this.saving=false;if(this.incoming){const next=this.incoming;this.incoming=null;this.receive(next);}}})();const ok=await this.pending;return ok&&this.dirty()?this.flush():ok;}
 receive(row){if(this.saving||this.composing||this.recoveryUnacknowledged){this.incoming=row;return;}if(row.revision<=this.row.revision)return;for(const f of this.fields){if(row[f]!==this.saved[f]&&(this.local[f]!==this.saved[f]||this.root.contains(document.activeElement))){this.conflicted=true;this.onStatus('标题已在其他页面更新，当前草稿保留。','conflict');return;}}for(const f of this.fields){if(this.local[f]===this.saved[f]){this.local[f]=row[f];const el=this.root.querySelector(`[data-meta-field="${f}"]`);if(el){if(el.matches('input,textarea,select'))el.value=row[f];else if(el.textContent!==row[f])el.textContent=row[f];}}this.saved[f]=row[f];}this.row=row;}
 dispose(){this.disposed=true;this.editIntent++;this.autosave.dispose();this.controller.abort();}
}
class DocumentSession {
 constructor(entry,metadata){this.entry=entry;this.metadata=metadata;}
 collect(){this.entry.collect();this.metadata.forEach(m=>m.collect());}
 dirty(){return this.entry.dirty()||this.metadata.some(m=>m.dirty());}
 protectedSectionIds(){const ids=new Set(),active=document.activeElement;for(const m of this.metadata){if(m.kind!=='section')continue;if(m.dirty()||m.composing||m.saving||m.failed||m.conflicted||m.root.contains(active))ids.add(m.row.sectionId);}return ids;}
 releaseMetadata(keepSectionIds=new Set()){const protectedIds=this.protectedSectionIds(),keep=[];for(const m of this.metadata){if(m.kind==='topic'||keepSectionIds.has(m.row.sectionId)||protectedIds.has(m.row.sectionId)){keep.push(m);continue;}m.dispose();}this.metadata.splice(0,this.metadata.length,...keep);}
 get saving(){return this.entry.saving||this.metadata.some(m=>m.saving);}
 get recoveryPending(){return this.entry.recoveryPending||this.metadata.some(m=>m.recoveryPending);}
 set failed(v){this.entry.failed=v;this.metadata.forEach(m=>m.failed=v);}
 async flush(){for(const m of this.metadata)if(!await m.flush())return false;return this.entry.flush();}
 dispose(){this.entry.dispose();this.metadata.forEach(m=>m.dispose());}
}
import {TopicTimeline} from './topic-timeline.js';
import {TopicTimelinePositions} from './topic-timeline-window.js';
import {TopicAIViewSession} from '../core/topic-ai-view-session.js';
import {renderAICandidateComparison} from './ai-candidate.js';
// One Topic controller owns root, Content, Years and saved AI view composition.
export class TopicController {
 constructor({onStatus,onOpen,onInput,onSettings}){
  this.onSettings=onSettings||(()=>{});this.onStatus=onStatus;this.onOpen=onOpen;this.onInput=onInput;this.id=null;this.cursor=null;this.editor=null;this.mode='stable';this.view='original';this.readingSort='asc';this.topicProviderKey=null;this.rootProviderKey=null;this.serial=0;this.pages=[];this.aiTopics=new Map();this.statusEpoch=0;this.statusReadSerial=0;this.statusUnavailable=['ai'];this.homeCollection=null;this.unplacedCollection=null;this.homeDesiredCount=40;this.homeRestoring=false;this.topicReader=null;this.topicReaderInstalled=false;this.topicNavigationAnchor=null;this.topicNavigationSection=null;this.topicResetFromStart=false;
  this.personalRoot=new PersonalTopicRoot($('thought-list'),{open:(topicId,sectionId)=>this.openRootTarget(topicId,sectionId)});this.homeDesiredCount=Math.max(40,this.personalRoot.slots.extent());
  document.addEventListener('paia:topic-root-target',event=>{const target=event.detail;if(target?.topicId===this.id)void this.openRootTarget(target.topicId,target.sectionId);});
  this.readRetry=button('重试读取思想库',()=>this.refresh());this.readRetry.id='library-read-retry';this.readRetry.hidden=true;$('error').after(this.readRetry);
  const changeAIView=productAction(view=>this.switchView(view,{restoreFocus:true}));
  $('ai-presentation-toggle').addEventListener('change',event=>changeAIView(event.currentTarget.checked?'ai':'original'));
  $('topic-source-scope').addEventListener('change',productAction(()=>this.changeTopicSourceScope()));
  $('thought-source-scope').addEventListener('change',productAction(()=>this.changeRootSourceScope()));
  $('topic-search').addEventListener('input',()=>{this.serial++;clearTimeout(this.topicSearchTimer);this.topicSearchTimer=setTimeout(productAction(()=>this.searchTopic()),180);});
  for(const b of $('topic-time-order').querySelectorAll('button'))b.addEventListener('click',productAction(()=>{if(b.dataset.readingStart)$('topic-time-jumps').open=false;return this.changeReadingSort(b.dataset.readingSort||b.dataset.readingStart,{fromStart:!!b.dataset.readingStart});}));
  $('ai-revision-history').addEventListener('click',productAction(()=>this.aiRevisions()));
  wireSearchKeyboard($('thought-search'),$('thought-list'),{onScrollIntent:()=>this.cancelHomeFocusScroll(),selector:'a:not([hidden]),button:not(:disabled)'});$('thought-search').addEventListener('input',()=>this.searchRoot());$('thought-search').addEventListener('focus',()=>this.beginHomeFocusScroll());window.addEventListener('wheel',event=>{this.cancelHomeFocusScroll();this.topicRestoreInput(event);},{passive:true});window.addEventListener('touchstart',event=>{this.cancelHomeFocusScroll();this.topicRestoreInput(event);},{passive:true});
  $('library-unplaced').addEventListener('click',productAction(()=>this.unplaced()));$('create-entry').addEventListener('click',productAction(()=>this.createEntry()));
  document.addEventListener('click',event=>{for(const menu of document.querySelectorAll('.library-actions[open]'))if(!menu.contains(event.target))menu.open=false;});
  const readingHistory=redo=>this.view==='ai'?this.aiEditor?.history(redo):this.editor?.entry.history(redo);
  $('library-undo').addEventListener('click',()=>void readingHistory(false));$('library-redo').addEventListener('click',()=>void readingHistory(true));
  this.ensureTopicContinuous();
  $('library-removed-topics').addEventListener('click',productAction(()=>this.removedTopics()));$('library-removed').addEventListener('click',productAction(()=>this.removed()));$('library-rebuild-search').addEventListener('click',productAction(()=>this.checked('REBUILD_LIBRARY_SEARCH').then(()=>{$('library-maintenance-status').textContent='已请求更新本地搜索索引；搜索时会显示进度。';})));
  $('topic-menu').append(actionMenu('主题操作',[["管理结构",()=>this.manageSections()],[tc("主题说明"),()=>this.editTopicCue()],["合并主题",()=>this.mergeTopic()],["重命名",()=>this.renameTopic(this.id)],["删除主题",()=>this.deleteTopic(this.id)]]));$('topic-menu').querySelector('button').id='topic-structure';$('topic-menu').querySelectorAll('button')[2].id='topic-merge';
 const homeMenu=actionMenu(tc('思想库更多'),[[tc('添加主题'),()=>this.createTopic()],[tc('单独写下的想法'),()=>{const container=$('library-unplaced').parentElement;container.hidden=false;return this.unplaced();}]]);$('thought-home-tools').append(homeMenu,button(tc('接着写'),()=>this.createStandalone()));
 $('thought-empty-settings').removeAttribute('data-view');$('thought-empty-settings').textContent=tc('添加主题');$('thought-empty-settings').onclick=()=>this.createTopic();$('thought-empty').querySelector('p').textContent=tc('先留下几段表达，主题可以慢慢形成。');
 $('create-entry').textContent=tc('补充今天的想法');$('library-unplaced').textContent=tc('单独写下的想法');
 watchThoughtCopy();
 document.addEventListener('paia:preferences-applied',()=>{this.syncReadingControls();if(this.thoughtRootVisible()&&this.homePage)this.paintHome(this.homePage.page,this.homePage.query,false);if(this.id&&this.originalMode==='content')for(const node of this.originalPane?.querySelectorAll('[data-entry-id]')||[]){const item=this.document?.items?.find(x=>x.entry.id===node.dataset.entryId),caption=node.querySelector('.entry-sent-time');if(item&&caption)caption.textContent=expressionCaption(item.entry,document.documentElement.lang);}});
 this.homePositions=new Map();this.topicLastScrollY=scrollY||0;this.topicScrollDirection=null;window.addEventListener('scroll',()=>{const y=scrollY||0;if(this.homeRestoring||this.topicRestoring()||!this.id&&this.homeFocusScrolling){this.topicLastScrollY=y;this.topicScrollDirection=null;return;}if(y!==this.topicLastScrollY)this.topicScrollDirection=y<this.topicLastScrollY?'previous':'next';this.topicLastScrollY=y;if(!this.id&&this.thoughtRootVisible())this.rememberHomeAnchor();if(!this.id&&y<=4&&this.homeCollection?.windowStart>0)void this.shiftHomeWindow('previous');if(y<=4&&this.topicContinuousVisible()&&this.topicReader?.windowStart>0)void this.shiftTopicWindow('previous');this.schedulePosition();},{passive:true});document.addEventListener('visibilitychange',()=>this.schedulePosition());this.layout='list';void request('GET_THOUGHT_LAYOUT').then(r=>{this.layout=r.layout;this.applyLayout();}).catch(()=>{});
 $('library-dialog-close').addEventListener('click',productAction(()=>this.requestCloseDialog()));$('library-dialog').addEventListener('cancel',e=>{e.preventDefault();void this.requestCloseDialog();});
  this.aiViewSession=new TopicAIViewSession();this.viewPreferenceChosen=true;this.ensureAITopicStatus();this.originalMode='content';this.timelinePositions=new TopicTimelinePositions();this.contentPositions=new TopicTimelinePositions();this.installOriginalTabs();this.timelineLocale=document.documentElement.lang;document.addEventListener('paia:preferences-applied',()=>{const locale=document.documentElement.lang;if(locale===this.timelineLocale)return;this.timelineLocale=locale;this.syncOriginalTabs();if(this.id&&this.view==='original'&&this.originalMode==='years')void this.refresh();});
 }
 enableDesktopPresentation(){if(!this.desktopPresentation)this.desktopPresentation=new TopicWorkspacePresentation(this);else this.desktopPresentation.sync();return this.desktopPresentation;}
 applyLayout(){$('thought-list').classList.remove('topic-compact-list');$('thought-list').classList.add('personal-topic-grid');}
 thoughtRootVisible(){return !$('thought-panel').hidden&&!this.id&&!$('thought-collection').hidden;}
 ensureContinuousRoot(){if(this.continuousInstalled)return;this.continuousInstalled=true;wireContinuousKeyboard($('thought-continuous-sentinel'),()=>this.loadHomeNext());wireContinuousKeyboard($('unplaced-continuous-sentinel'),()=>this.loadUnplacedNext());$('thought-continuous-retry').addEventListener('click',()=>void this.loadHomeNext());$('unplaced-continuous-retry').addEventListener('click',()=>void this.loadUnplacedNext());if('IntersectionObserver'in window){this.continuousObserver=new IntersectionObserver(entries=>{if(!$('thought-panel').hidden)for(const entry of entries){if(!entry.isIntersecting)continue;if(entry.target.id==='thought-continuous-sentinel'&&this.thoughtRootVisible())void this.loadHomeNext({explicit:false});if(entry.target.id==='unplaced-continuous-sentinel'&&!this.id&&!$('library-unplaced-list').hidden)void this.loadUnplacedNext();}},{rootMargin:'600px 0px'});this.continuousObserver.observe($('thought-continuous-sentinel'));this.continuousObserver.observe($('unplaced-continuous-sentinel'));}}
 topicContinuousVisible(){return this.originalMode!=='years'&&!!this.id&&this.view==='original'&&!$('thought-document').hidden;}
 ensureTopicContinuous(){if(this.topicReaderInstalled)return;this.topicReaderInstalled=true;
  wireContinuousKeyboard($('topic-continuous-after'),()=>this.loadTopicContinuous('next'));wireContinuousKeyboard($('topic-continuous-before'),()=>this.loadTopicContinuous('previous'));
  $('topic-continuous-after-retry').addEventListener('click',()=>void this.loadTopicContinuous('next'));$('topic-continuous-before-retry').addEventListener('click',()=>void this.loadTopicContinuous('previous'));
  if('IntersectionObserver'in window){this.topicContinuousObserver=new IntersectionObserver(entries=>{if(!this.topicContinuousVisible())return;for(const entry of entries){if(!entry.isIntersecting)continue;if(entry.target.id==='topic-continuous-after')void this.loadTopicContinuous('next',{explicit:false});if(entry.target.id==='topic-continuous-before')void this.loadTopicContinuous('previous',{explicit:false});}},{rootMargin:'800px 0px'});this.topicContinuousObserver.observe($('topic-continuous-after'));this.topicContinuousObserver.observe($('topic-continuous-before'));
   this.topicWindowObserver=new IntersectionObserver(entries=>{if(!this.topicContinuousVisible()||this.topicRestoring()||this.topicWindowShifting||!this.topicScrollDirection)return;const reader=this.topicReader;if(!reader)return;const start=reader.windowStart,end=start+reader.windowSize;for(const entry of entries){if(!entry.isIntersecting)continue;const from=Number(entry.target.dataset.topicWindowFrom),to=Number(entry.target.dataset.topicWindowTo);let direction=null;if(this.topicScrollDirection==='previous'&&Number.isInteger(to)&&to<start)direction='previous';else if(this.topicScrollDirection==='next'&&Number.isInteger(from)&&from>=end)direction='next';if(direction){void this.shiftTopicWindow(direction);break;}}},{rootMargin:'700px 0px'});
  }
 }
 observeTopicWindowSpacers(){const observer=this.topicWindowObserver;if(!observer)return;observer.disconnect();for(const node of this.originalPane?.querySelectorAll?.('.topic-window-spacer')||[])observer.observe(node);}
 async shiftTopicWindow(direction){const reader=this.topicReader;if(this.topicRestoring()||this.topicWindowShifting||!reader||!this.topicContinuousVisible())return;if(direction==='previous')this.topicAutoForward=false;const jumpStart=direction==='previous'&&(scrollY||0)<=4,changed=jumpStart?reader.moveWindowToStart():reader.shiftWindow(direction);if(!changed)return;this.topicWindowShifting=true;const anchor=jumpStart?null:this.topicAnchor();try{const serial=this.serial;await this.renderTopicReader(anchor);if(serial===this.serial&&reader===this.topicReader&&reader.stale)await this.resetTopicReader({anchorId:anchor?.id||null,restoreAnchor:anchor,expectedSerial:serial});}finally{this.topicWindowShifting=false;}}
 // A saved window owns restoration through the queued layout scroll events.
 // Explicit reading input cancels only this restoration, never normal paging.
 beginTopicRestore(reader,serial){this.cancelTopicRestore();const restore={reader,serial,intent:this.openIntent,cancelled:false};this.topicRestore=restore;this.topicScrollDirection=null;return restore;}
 topicRestoring(){const restore=this.topicRestore;if(!restore||restore.cancelled)return false;if(restore.reader!==this.topicReader||restore.serial!==this.serial||restore.intent!==this.openIntent){this.cancelTopicRestore(restore);return false;}return true;}
 cancelTopicRestore(restore=this.topicRestore){if(!restore)return;restore.cancelled=true;if(this.topicRestore===restore){this.topicRestore=null;this.topicScrollDirection=null;this.topicLastScrollY=scrollY||0;if(restore.reader===this.topicReader&&restore.serial===this.serial&&restore.intent===this.openIntent&&this.topicContinuousObserver)for(const id of ['topic-continuous-before','topic-continuous-after']){this.topicContinuousObserver.unobserve($(id));this.topicContinuousObserver.observe($(id));}}}
 finishTopicRestore(restore){requestAnimationFrame(()=>requestAnimationFrame(()=>this.cancelTopicRestore(restore)));}
 interruptTopicRestore(){if(!this.topicRestoring())return;this.topicRestoreInputEpoch=(this.topicRestoreInputEpoch||0)+1;this.cancelTopicRestore();}
 topicRestoreInput(event){if(event.isTrusted===false||event.defaultPrevented||event.isComposing)return;if(event.type==='keydown'&&(!['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(event.key)||event.altKey||event.ctrlKey||event.metaKey||event.target?.closest?.('input,textarea,select,[contenteditable]')))return;this.interruptTopicRestore();}
 createTopicReader({anchorId=null,sectionId=null,timeEdge=null}={}){const topicId=this.id,sort=this.readingSort,providerKey=this.topicProviderKey,query=$('topic-search').value.trim(),reader=new ContinuousTopicReader({pins:()=>this.editor?.entry.protectedIds?.()||new Set(),load:options=>request('TOPIC_DOCUMENT_PAGE',{options:{topicId,sort,query,providerKey,chronology:'expression',expectedReadGeneration:options.expectedReadGeneration,cursor:options.cursor,direction:options.direction,anchorId:options.anchorId,sectionId:options.sectionId,sectionCursor:options.sectionCursor,timeEdge:options.timeEdge,limit:40}})});reader.reset({topicId,sort,query,anchorId,sectionId,timeEdge});this.topicAutoForward=true;return reader;}
 topicAnchor(){return this.topicReader?.captureAnchor(this.originalPane||$('topic-body'))||null;}
 async checkAllTracked(serial=this.serial){if(!this.editor?.entry)return true;const ids=[...this.editor.entry.entries.keys()];for(let i=0;i<ids.length;i+=100){const result=await request('GET_LIBRARY_TRACKED_ENTRIES',{options:{ids:ids.slice(i,i+100)}});if(serial!==this.serial)return false;await this.editor.entry.checkTracked(result||[]);}return serial===this.serial;}
 topicPageFromReader(){const reader=this.topicReader,state=reader?.state(),meta=reader?.pageMeta||{};if(!reader||!state)return null;const pins=this.editor?.entry.protectedIds?.()||new Set(),layout=reader.layout(pins),items=layout.filter(x=>x.kind==='item').map(x=>x.item);return {...meta,topic:meta.topic||this.topic,sections:[...reader.sections.values()],items,windowLayout:layout,nextCursor:state.nextCursor,previousCursor:state.previousCursor,sectionCursor:state.sectionCursor,query:reader.query,sort:reader.sort,matchCount:meta.matchCount};}
 updateTopicContinuous(){const reader=this.topicReader,state=reader?.state();for(const id of ['topic-continuous-before','topic-continuous-after'])$(id).hidden=!this.topicContinuousVisible();if(!state||!this.topicContinuousVisible())return;
  const before=$('topic-continuous-before'),after=$('topic-continuous-after');$('topic-continuous-before-retry').hidden=!state.errorPrevious;$('topic-continuous-after-retry').hidden=!state.errorNext;before.dataset.terminal=String(!!state.terminalPrevious);after.dataset.terminal=String(!!state.terminalNext);
  $('topic-continuous-before-status').textContent=state.loadingPrevious?'正在载入更早内容…':state.errorPrevious?'更早内容加载中断；当前文字与草稿已保留。':state.terminalPrevious?'已到主题开头':'向上滚动继续加载';
  $('topic-continuous-after-status').textContent=state.protectionBlocked?'暂缓继续加载：请先保存或完成当前编辑，文字与选择仍保留。':state.loadingNext?'正在继续载入…':state.errorNext?'加载中断；当前文字与草稿已保留。':state.indexing?'正在准备主题索引…':state.terminalNext?'已到主题末尾':'向下滚动继续加载';
  this.desktopPresentation?.sync();
  clearTimeout(this.topicContinuousTimer);if(state.indexing&&!state.loadingNext&&!state.errorNext)this.topicContinuousTimer=setTimeout(()=>{if(this.topicContinuousVisible())void this.loadTopicContinuous('next');},250);
 }
 async renderTopicReader(anchor=null,restore=null){const reader=this.topicReader,serial=this.serial,windowRevision=reader?.windowRevision;if(!reader)return false;const ready=await reader.hydrateWindow();if(reader!==this.topicReader||serial!==this.serial||windowRevision!==reader.windowRevision)return false;if(!ready){this.updateTopicContinuous();return false;}const page=this.topicPageFromReader();if(!page?.topic)return false;this.topic=page.topic;this.document=page;this.renderDocument(page);this.topicReader.measure(this.originalPane);this.originalPane.dataset.retainedBodies=String(this.topicReader.items.filter(item=>!item.unloaded).length);this.originalPane.dataset.loadedExtent=String(this.topicReader.items.length);if(anchor&&(!restore||!restore.cancelled&&this.topicRestore===restore))this.topicReader.restoreAnchor(this.originalPane,anchor);this.observeTopicWindowSpacers();this.updateTopicContinuous();return true;}
 async resetTopicReader({anchorId=null,sectionId=null,timeEdge=null,restoreAnchor=null,saved=null,expectedSerial=this.serial}={}){
  this.cancelTopicRestore();const reader=this.createTopicReader({anchorId,sectionId,timeEdge}),restored=!!saved&&reader.restore(saved);this.topicReader=reader;let restore=restored?this.beginTopicRestore(reader,expectedSerial):null,completed=false;
  try{
   await reader.initial();if(expectedSerial!==this.serial||reader!==this.topicReader)return {...reader.state(),stale:true};
   if(reader.stale){this.cancelTopicRestore(restore);restore=null;if(reader.anchorUnavailable){anchorId=null;this.onStatus('原位置已变化，从主题开头继续。');}reader.reset({topicId:this.id,sort:this.readingSort,query:$('topic-search').value.trim(),anchorId,sectionId,timeEdge});await reader.initial();if(expectedSerial!==this.serial||reader!==this.topicReader)return {...reader.state(),stale:true};}
   const state=reader.state();if(state.errorNext&&!state.items.length)throw state.errorNext;await this.renderTopicReader(restoreAnchor,restore);if(expectedSerial!==this.serial||reader!==this.topicReader)return {...reader.state(),stale:true};void this.loadRemainingTopicSections(reader);completed=!reader.hydrationError&&!reader.stale;return state;
  }finally{if(restore){if(completed&&this.topicRestore===restore)this.finishTopicRestore(restore);else this.cancelTopicRestore(restore);}}
 }
 async loadTopicContinuous(direction,{explicit=true}={}){if(explicit)this.interruptTopicRestore();else if(this.topicRestoring())return;const reader=this.topicReader;if(!explicit&&(reader?.errorNext||reader?.hydrationError||reader?.errorPrevious||reader?.protectionBlocked||direction==='next'&&this.topicAutoForward===false))return;if(explicit)this.topicAutoForward=direction!=='previous';if(!reader||!this.topicContinuousVisible()||direction==='next'&&reader.loadingNext||direction==='previous'&&reader.loadingPrevious)return;const serial=this.serial,anchor=this.topicAnchor();if(!await this.checkAllTracked(serial)||serial!==this.serial||reader!==this.topicReader)return;if(reader.hydrationError){if(explicit)await this.renderTopicReader(anchor);else this.updateTopicContinuous();return;}const priorRevision=reader.bodyRevision;await (direction==='previous'?reader.previous():reader.next());if(serial!==this.serial||reader!==this.topicReader)return;if(reader.stale){await this.resetTopicReader({anchorId:anchor?.id||reader.items[0]?.entry?.id||null,restoreAnchor:anchor,expectedSerial:serial});return;}if(reader.bodyRevision!==priorRevision||reader.errorNext||reader.errorPrevious||reader.indexing||reader.protectionBlocked)await this.renderTopicReader(anchor);else this.updateTopicContinuous();}
 async loadRemainingTopicSections(reader=this.topicReader){if(!reader||reader!==this.topicReader)return;let cursor=reader.sectionCursor,seen=new Set();while(cursor&&reader===this.topicReader){const key=JSON.stringify(cursor);if(seen.has(key))break;seen.add(key);let page;try{page=await request('GET_LIBRARY_TOPIC_SECTIONS',{options:{topicId:this.id,cursor,limit:100}});}catch{return;}if(reader!==this.topicReader||page.cursorInvalid)return;reader.addSections(page.items||[]);cursor=page.nextCursor;reader.sectionCursor=cursor;}if(reader===this.topicReader)this.renderSectionNav(this.topicPageFromReader());}
 async navigateTopicSection(sectionId,{isCurrent=()=>true}={}){if(!isCurrent()||!this.id||this.view!=='original')return;await this.checkAllTracked();if(!isCurrent())return;await this.resetTopicReader({sectionId});if(!isCurrent())return;const node=[...this.originalPane.querySelectorAll('[data-section-id]')].find(n=>n.dataset.sectionId===sectionId)||this.originalPane.querySelector('[data-entry-id]');node?.scrollIntoView({block:'start'});node?.querySelector('h2')?.focus({preventScroll:true});}
 async topicSectionRows(){if(this.topicReader)await this.loadRemainingTopicSections(this.topicReader);return [...(this.topicReader?.sections?.values?.()||[])].filter(s=>s.lifecycle==='active'&&!s.redirectTo);}
 saveHomePosition(key,value){this.homePositions.delete(key);this.homePositions.set(key,value);while(this.homePositions.size>21){const oldest=[...this.homePositions.keys()].find(k=>k!=='home');this.homePositions.delete(oldest);}}
 captureHomeAnchor(){if(this.id)return null;const node=[...$('thought-list').querySelectorAll('[data-root-key]')].find(x=>{const r=x.getBoundingClientRect();return r.bottom>120&&r.top<(globalThis.innerHeight||Infinity);});return node?{key:node.dataset.rootKey,id:node.querySelector('[data-topic-id]')?.dataset.topicId||null,top:node.getBoundingClientRect().top,focusRef:this.personalRoot.focusRef()}:null;}
 beginHomeFocusScroll(){const token=this.homeFocusToken=(this.homeFocusToken||0)+1;this.homeFocusScrolling=true;requestAnimationFrame(()=>requestAnimationFrame(()=>{if(this.homeFocusToken===token)this.homeFocusScrolling=false;}));}
 cancelHomeFocusScroll(){this.homeFocusToken=(this.homeFocusToken||0)+1;this.homeFocusScrolling=false;}
 rememberHomeAnchor(anchor=this.captureHomeAnchor()){const r=this.homeCollection;if(anchor&&r&&!r.query&&r.keys?.has(anchor.key))this.homeReadingPosition={scope:r.scope,authority:r.authority,anchor:{key:anchor.key,id:anchor.id||null,top:anchor.top}};}
 previousHomeAnchor(){const r=this.homeCollection,p=this.homeReadingPosition;return r&&p&&p.scope===r.scope&&p.authority===r.authority&&r.keys.has(p.anchor.key)?p.anchor:null;}
 restoreHomeAnchor(anchor){if(!anchor)return;const collection=this.homeCollection,serial=this.serial,token=this.homeRestoreToken=(this.homeRestoreToken||0)+1,finish=()=>{if(this.homeRestoreToken===token){this.homeRestoring=false;this.topicScrollDirection=null;}};this.homeRestoring=true;requestAnimationFrame(()=>{if(token!==this.homeRestoreToken)return;if(this.id||collection!==this.homeCollection||serial!==this.serial){finish();return;}const node=[...$('thought-list').querySelectorAll('[data-root-key]')].find(x=>x.dataset.rootKey===anchor.key||anchor.id&&x.querySelector('[data-topic-id]')?.dataset.topicId===anchor.id);if(node){this.rememberHomeAnchor(anchor);if(anchor.focusRef)this.personalRoot.restoreFocus(anchor.focusRef);else if(anchor.focus)(node.matches('button,a')?node:node.querySelector('a,button'))?.focus({preventScroll:true});scrollBy(0,node.getBoundingClientRect().top-anchor.top);}requestAnimationFrame(finish);});}
 rootPins(){const keys=new Set(),root=$('thought-list'),active=document.activeElement,selection=getSelection();for(const node of root.querySelectorAll('[data-root-key]')){if(node.contains(active)||node.querySelector('details[open]')||selection?.rangeCount&&!selection.isCollapsed&&selection.getRangeAt(0).intersectsNode(node))keys.add(node.dataset.rootKey);}return keys;}
 resetHomeCollection(){clearTimeout(this.continuousTimer);this.homeWindowShift=null;this.homeWindowShifting=false;this.homePage=null;this.homeHydrationAnchor=null;this.homeWindowReveal=null;this.homeCollection?.releaseBodies?.();this.homeCollection=null;this.homeDesiredCount=Math.max(40,this.personalRoot.slots.extent());this.homeRestoring=false;}
 invalidateHomeSnapshot({cause}={}){
  this.invalidateTimeline?.();this.rootPreSearch=null;this.rootBaseCollection?.releaseBodies();this.rootBaseCollection=null;
  this.unplacedCollection=null;
  const unplaced=$('library-unplaced-list'),unplacedExpanded=!unplaced.hidden;
  unplaced.replaceChildren($('unplaced-continuous-sentinel'));
  if(unplacedExpanded)void this.unplaced().catch(()=>this.onStatus(tc('内容暂未能读取，请重试。')));
  const saved=this.homePositions.get('home');
  if(saved?.collection){this.homeDesiredCount=Math.max(this.homeDesiredCount||40,saved.collection.items?.length||0,40);delete saved.collection;}
  if(this.thoughtRootVisible())this.rootInvalidationAnchor=this.captureHomeAnchor();
  this.homeDesiredCount=Math.max(this.homeDesiredCount||40,this.homeCollection?.items?.length||0,40);
  this.rootCueEpoch=(this.rootCueEpoch||0)+1;if(this.homeCollection)this.homeCollection.reset({scope:this.homeCollection.scope,query:this.homeCollection.query});this.homeCollection=null;this.homePage=null;this.homeReadingPosition=null;this.homeWindowShift=null;this.homeWindowShifting=false;
  // Metadata/cues are transient, including hidden rows and protected menu pins.
  // Drop every derived body before a fresh read can fail.
  if(!canRetainRootMetadata(cause)||$('thought-search').value.trim())this.clearHomeRows();
  if(!canRetainRootMetadata(cause))for(const node of document.querySelectorAll('.topic-root-section-anchor'))node.remove();
 }
 clearHomeRows(){this.homePage=null;this.personalRoot.clear();}
 homeCollectionScope(query){return this.rootProviderKey?JSON.stringify(['source',this.rootProviderKey,query?'search':'root']):query?'search':'root';}
 createHomeCollection(query){const scope=this.homeCollectionScope(query),providerKey=this.rootProviderKey;return new ContinuousRootReader({scope,query,windowSize:Number.MAX_SAFE_INTEGER,pins:()=>this.rootPins(),load:async({cursor,authority})=>{
  if(query)return request('GET_LIBRARY_ROOT_SEARCH',{options:{query,cursor,authority,limit:40}});
  let page=await request('GET_LIBRARY_ROOT_PROJECTION',{options:{cursor,limit:40,sectionLimit:4}});
  if(page.unavailable&&page.reason==='foundation_not_ready'){await request('GET_LIBRARY_FOUNDATION_STATUS');page=await request('GET_LIBRARY_ROOT_PROJECTION',{options:{cursor,limit:40,sectionLimit:4}});}
  return page;
 }});}
 homePageState(state){const layout=this.homeCollection.layout();return {...(state.pageMeta||{}),items:layout.filter(x=>x.kind==='item').map(x=>x.item),windowLayout:layout,nextCursor:state.cursor,complete:state.terminal,coverage:state.coverage};}
 updateHomeContinuous(state){const sentinel=$('thought-continuous-sentinel'),status=$('thought-continuous-status'),retry=$('thought-continuous-retry');sentinel.dataset.terminal=String(!!state.terminal);sentinel.hidden=state.terminal===true&&state.complete===true&&Array.isArray(state.items)&&state.items.length===0&&!state.loading&&!state.error&&!state.stale&&!state.protectionBlocked&&!state.pageMeta?.indexing&&state.coverage?.complete!==false;retry.hidden=!state.error;status.textContent=tc(state.protectionBlocked?'请先关闭当前菜单或完成选择，再继续浏览。':state.loading?'正在继续载入…':state.error?'加载中断；当前列表已保留。':state.terminal?'已到列表末尾':state.pageMeta?.indexing?'搜索索引更新中…':state.coverage?.complete===false?'正在准备思想列表…':'向下滚动继续加载');clearTimeout(this.continuousTimer);if(!state.terminal&&!state.error&&!state.cursor&&(state.pageMeta?.indexing||state.coverage?.complete===false))this.continuousTimer=setTimeout(()=>{if(this.thoughtRootVisible())void this.loadHomeNext({explicit:false});},250);}
 async renderHomeReader(anchor=null){const collection=this.homeCollection,serial=this.serial,revision=collection?.windowRevision;if(!collection)return false;this.homePage=null;const ready=await collection.hydrateWindow();if(collection!==this.homeCollection||serial!==this.serial)return false;if(collection.stale){this.clearHomeRows();this.rootInvalidationAnchor=anchor;void this.refresh();return false;}if(revision!==collection.windowRevision)return false;if(this.homeWindowReveal?.collection===collection&&this.homeWindowReveal.revision===revision)anchor=this.homeWindowReveal.anchor;if(!ready){this.homeHydrationAnchor=anchor;this.updateHomeContinuous(collection.state());return false;}this.homeHydrationAnchor=null;this.homeWindowReveal=null;const query=$('thought-search').value.trim(),page=this.homePageState(collection.state());this.homePage={page,query,key:this.readKey()};this.paintHome(page,query,false);this.updateHomeContinuous(collection.state());if(anchor)this.restoreHomeAnchor(anchor);else this.rememberHomeAnchor();return true;}
 async loadHomeNext({explicit=true}={}){const collection=this.homeCollection;if(!this.thoughtRootVisible()||!collection||collection.loading||collection.hydration||!explicit&&collection.error)return;if(collection.errorKind==='hydrate'&&!collection.stale){await this.renderHomeReader(this.homeHydrationAnchor||this.captureHomeAnchor());if(collection!==this.homeCollection||!this.thoughtRootVisible()||collection.error)return;}if(collection.terminal)return;const anchor=this.captureHomeAnchor(),state=await collection.loadNext();if(collection!==this.homeCollection||this.id)return;if(state.stale){this.rootInvalidationAnchor=anchor;await this.refresh();return;}if(state.error){this.updateHomeContinuous(state);return;}this.homeDesiredCount=Math.max(this.homeDesiredCount,state.items.length,40);await this.renderHomeReader(anchor);}
 async shiftHomeWindow(direction,{reveal=false}={}){const collection=this.homeCollection;if(!this.thoughtRootVisible()||!collection||collection.loading)return;const rememberReveal=()=>{const index=direction==='previous'?collection.windowStart:Math.min(collection.items.length-1,collection.windowStart+collection.windowSize-1),anchor={key:collection.items[index].key,top:140,focus:true};this.homeHydrationAnchor=anchor;this.homeWindowReveal={collection,revision:collection.windowRevision,anchor};return anchor;};if(this.homeWindowShift?.collection===collection||collection.hydration||collection.error){if(reveal&&collection.items.length)rememberReveal();return;}let anchor=this.captureHomeAnchor();const jumpStart=!reveal&&direction==='previous'&&(globalThis.scrollY||0)<=4,changed=jumpStart?collection.around(collection.items[0]?.key):collection.shiftWindow(direction);if(!changed)return;if(reveal)anchor=rememberReveal();const shift={collection};this.homeWindowShift=shift;this.homeWindowShifting=true;try{await this.renderHomeReader(anchor);}finally{if(this.homeWindowShift===shift){this.homeWindowShift=null;this.homeWindowShifting=false;}}}
 observeHomeWindow(){
  if(!this.homeWindowObserver&&'IntersectionObserver'in window)this.homeWindowObserver=new IntersectionObserver(entries=>{if(!this.thoughtRootVisible()||this.homeRestoring||this.homeWindowShift?.collection===this.homeCollection||this.homeFocusScrolling||!this.topicScrollDirection)return;const reader=this.homeCollection;if(!reader||reader.hydration)return;for(const entry of entries){if(!entry.isIntersecting)continue;const before=Number(entry.target.dataset.rootWindowTo)<reader.windowStart;if(before&&this.topicScrollDirection==='previous')void this.shiftHomeWindow('previous');else if(!before&&this.topicScrollDirection==='next')void this.shiftHomeWindow('next');}},{rootMargin:'500px 0px'});
  this.homeWindowObserver?.disconnect();for(const node of $('thought-list').querySelectorAll('[data-root-window-from]'))this.homeWindowObserver?.observe(node);
 }
 searchRoot(){
  const query=$('thought-search').value.trim(),prior=this.homeCollection?.query||'';
  if(query&&!prior&&this.homeCollection){this.rootBaseCollection=this.homeCollection;this.rootPreSearch={providerKey:null,snapshot:this.homeCollection.snapshot(),items:[...(this.homePage?.page?.items||[])],complete:this.homeCollection.terminal,anchor:this.captureHomeAnchor()||this.previousHomeAnchor(),scroll:scrollY};this.rootBaseCollection.releaseBodies();this.homeCollection=null;}
  this.serial++;this.cursor=null;if(this.homeCollection)this.homeCollection.releaseBodies();this.homeCollection=null;this.homePage=null;
  if(!query){const saved=this.rootBaseCollection?.snapshot()||this.rootPreSearch?.snapshot;if(saved){this.homeCollection=this.createHomeCollection('');this.homeCollection.restore(saved);this.homeDesiredCount=Math.max(40,saved.items.length);}this.rootBaseCollection=null;this.rootInvalidationAnchor=this.rootPreSearch?.anchor||null;if(this.rootPreSearch?.items)this.personalRoot?.render(this.rootPreSearch.items,{complete:this.rootPreSearch.complete});this.homeRestoring=true;this.preserveHomeRefresh=true;this.rootPreSearch=null;}
  clearTimeout(this.searchTimer);this.searchTimer=setTimeout(()=>void this.refresh(),180);
 }
 async loadRootSearchBase(){
  if(!this.rootBaseCollection)this.rootBaseCollection=this.createHomeCollection('');
  const collection=this.rootBaseCollection;if(this.rootBaseLoading===collection)return;this.rootBaseLoading=collection;
  try{
   do{
    if(!this.thoughtRootVisible()||!$('thought-search').value.trim()||collection!==this.rootBaseCollection)return;
    if(!collection.terminal&&!collection.loading)await collection.loadNext();
    if(!this.thoughtRootVisible()||!$('thought-search').value.trim()||collection!==this.rootBaseCollection)return;
    if(collection.stale){this.rootBaseCollection=null;this.rootPreSearch={...(this.rootPreSearch||{}),items:[],complete:false};this.personalRoot.clear();this.onStatus('主题目录已变化，请重试读取。','read_error');return;}
    if(collection.error){this.onStatus('主题目录尚未读完，已显示的位置保留；请重试。','read_error');return;}
    const hydrated=await collection.hydrateWindow();if(!this.thoughtRootVisible()||!$('thought-search').value.trim()||collection!==this.rootBaseCollection)return;if(!hydrated||collection.stale||collection.error){if(collection.stale){this.rootBaseCollection=null;this.rootPreSearch={...(this.rootPreSearch||{}),items:[],complete:false};this.personalRoot.clear();}this.onStatus('主题目录尚未重新核对，请重试；原有位置仍保留。','read_error');return;}
    this.rootPreSearch={...(this.rootPreSearch||{}),items:collection.layout().filter(x=>x.kind==='item').map(x=>x.item),complete:collection.terminal};
    const query=$('thought-search').value.trim();if(this.homePage?.query===query)this.paintRootSearch(this.homePage.page,query);else this.personalRoot.render(this.rootPreSearch.items,{complete:collection.terminal});
    if(collection.terminal)return;await new Promise(resolve=>setTimeout(resolve,0));
   }while(collection===this.rootBaseCollection);
  }finally{if(this.rootBaseLoading===collection)this.rootBaseLoading=null;}
 }
 async reverseSetting(){let box=$('thought-reverse-edit');if(!box){const host=document.querySelector('.ux-settings-group[data-group="advanced"]');if(!host)return;const label=element('label','setting');box=element('input');box.type='checkbox';box.id='thought-reverse-edit';label.append(box,document.createTextNode(tc('同时修改档案中的对应完整内容')));host.append(label,element('p','muted',tc('仅对仍与档案完整对应的内容生效；已改写、选段和 AI 稿不反向修改。')));box.onchange=async()=>{const previous=!box.checked;box.disabled=true;try{await request('SET_THOUGHT_REVERSE_EDIT',{enabled:box.checked});}catch{box.checked=previous;this.onStatus('设置尚未保存，已恢复原值。','error');}finally{box.disabled=false;}};}box.disabled=true;try{box.checked=(await request('GET_THOUGHT_REVERSE_EDIT')).enabled;const status=await request('GET_LIBRARY_FOUNDATION_STATUS'),migration=status.bindingMigration;let summary=$('thought-binding-migration');if(!summary){summary=element('p','muted');summary.id='thought-binding-migration';box.parentElement.after(summary);}summary.textContent=migration?.complete?'旧版引用迁移已完成 · 跟随 '+migration.input+' · 独立 '+migration.thought:'旧版引用正在迁移；现有文字按安全规则保留。';}finally{box.disabled=false;}}
 schedulePosition(){clearTimeout(this.positionTimer);if(!this.id||this.view!=='original'||document.hidden||document.querySelector('dialog[open]'))return;this.positionTimer=setTimeout(()=>void this.rememberPosition(),3000);}
 async rememberPosition(){if(!this.id||document.hidden||this.editor?.dirty()||this.editor?.saving||isComposing(this.editor)||document.querySelector('dialog[open]'))return;const el=[...$('topic-body').querySelectorAll('[data-entry-field="body"]')].find(n=>n.getBoundingClientRect().bottom>140&&n.getBoundingClientRect().top<innerHeight);if(!el)return;const id=el.closest('[data-entry-id]').dataset.entryId,row=this.editor?.entry.entries.get(id);if(!row)return;let offset=0;const range=document.caretRangeFromPoint?.(Math.max(20,el.getBoundingClientRect().left+4),Math.max(140,el.getBoundingClientRect().top+8));if(range&&el.contains(range.startContainer)){const before=range.cloneRange();before.selectNodeContents(el);before.setEnd(range.startContainer,range.startOffset);offset=before.toString().length;}await request('THOUGHT_POSITION',{position:{topicId:this.id,entryId:id,revision:row.revision,offset,sort:this.readingSort,expanded:[]}});await request('RECORD_TOPIC_READ',{id:this.id});}
 async restorePosition(anchor){if(anchor?.nearby)announce(tc('原位置已移除，从附近继续。'));if(!anchor?.entryId)return;const el=[...$('topic-body').querySelectorAll('[data-entry-id]')].find(n=>n.dataset.entryId===anchor.entryId)?.querySelector('[data-entry-field="body"]');if(!el)return;const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let n,offset=anchor.offset;while(n=walker.nextNode()){if(offset<=n.length){const r=document.createRange();r.setStart(n,offset);r.collapse(true);scrollBy(0,r.getBoundingClientRect().top-140);break;}offset-=n.length;}}
 clearActionFeedback(){$('ai-update-feedback')?.replaceChildren();}
 rootAction(method,...args){return()=>this[method](...args);}
 async openRootTarget(topicId,sectionId=null){
  const claim=this.openIntent=(this.openIntent||0)+1,serial=this.serial,epoch=this.statusEpoch;
  const current=()=>claim===this.openIntent&&serial===this.serial&&epoch===this.statusEpoch&&!$('thought-panel').hidden;
  let valid=false;try{valid=await resolveTopicRootTarget({topicId,sectionId},options=>request('GET_LIBRARY_SECTION_PROJECTION',{options}));}catch{if(current())this.onStatus('暂时无法核对这个主题或分区，请重试。','read_error');return;}
  if(!current())return;
  if(!valid){this.onStatus('这个主题或分区已不可用，请重新读取思想库。','read_error');return;}
  try{
  if(sectionId){this.requestedTopicView='original';if(this.id===topicId&&this.view!=='original'){await this.switchView('original');if(claim!==this.openIntent)return;}}
  const intent=await this.open(topicId),active=()=>intent!==undefined&&intent===this.openIntent&&this.id===topicId&&!$('thought-panel').hidden;
  if(!active()||!sectionId)return;
  await this.focusSection(sectionId,{isCurrent:active});if(!active())return;
  let cursor=null,section=null;
  do{const page=await request('GET_LIBRARY_SECTION_PROJECTION',{options:{topicId,cursor,limit:100}});if(!active())return;if(page.cursorInvalid||page.unavailable||page.topic?.id!==topicId)break;section=page.items.find(value=>value.id===sectionId&&(!value.sourceUnavailable||value.titleProtected===true));if(section||!page.nextCursor)break;cursor=page.nextCursor;}while(cursor);
  if(!section){this.onStatus('这个分区已变化，请重新读取主题。','read_error');return;}
  const entry=[...this.originalPane.querySelectorAll('[data-entry-id][data-section-id]')].find(node=>node.dataset.sectionId===sectionId);
  for(const prior of this.originalPane.querySelectorAll('.topic-root-section-anchor'))prior.remove();
  if(section.title){const anchor=element('section','topic-root-section-anchor'),heading=element('h2','',section.title);anchor.dataset.sectionId=sectionId;heading.tabIndex=-1;anchor.append(heading);if(entry)entry.before(anchor);else this.originalPane.append(anchor);anchor.scrollIntoView({block:'start'});heading.focus({preventScroll:true});}
  else if(entry)entry.scrollIntoView({block:'start'});
  }catch{if(this.id===topicId&&!$('thought-panel').hidden)this.onStatus('这个分区暂时无法读取，请重试；已保存内容仍保留。','read_error');}
 }
 async mergeRootTopic(id){await this.open(id);if(this.id===id)await this.mergeTopic();}
 paintHome(base,query,poll=true){
  const page={...base,items:[...base.items]};
  if(query){this.paintRootSearch(page,query);return;}
  this.personalRoot.render(page.items,{complete:page.complete===true});
  $('library-search-status').textContent=page.coverage?.complete===false?'继续向下读取全部主题。':'';
  setProductState($('thought-collection'),page.items.length?'ready':page.complete?'empty':'loading');
  $('thought-empty').hidden=page.items.length>0||!page.complete;
  $('thought-empty-settings').textContent=tc('添加主题');$('thought-empty-settings').onclick=()=>this.createTopic();
 }
 paintRootSearch(page,query){
  // Search uses the existing bounded lexical owner; presentation never creates
  // a second directory or changes the established Topic addresses.
  const prior=this.rootPreSearch;
  if(prior?.items)this.personalRoot.render(prior.items,{complete:prior.complete});
  const matches=new Set(page.items.flatMap(item=>(item.paths||[item]).map(path=>path.topicId||item.topicId)).filter(Boolean));
  this.personalRoot.search(page.items,query,{open:(item,path)=>this.openSearchResult(item,path)});
  $('library-search-status').textContent=page.indexing?'搜索索引正在准备，匹配尚未完整。':page.complete?(matches.size?'匹配的主题已保留在原位置。':page.items.some(item=>item.kind==='entry'&&!item.paths?.length)?'匹配位于单独写下的内容，可从更多操作打开。':'当前没有匹配内容。'):'继续读取其余匹配；主题位置保持不变。';
  $('thought-empty').hidden=true;
 }

 async aiRevisions(){if(!await this.leave())return;const result=await request('GET_AI_PRESENTATION_REVISIONS',{options:{topicId:this.id}});this.closeDialog();$('library-dialog-title').textContent='AI整理版本';const list=$('library-dialog-content');for(const r of [...result.items].reverse()){const section=element('section','revision-row'),detail=element('details');section.append(element('p','',`${new Date(r.at).toLocaleString()} · ${r.actor==='ai'?'AI 更新':'用户编辑'}`));detail.append(element('summary','','查看此版本'),element('pre','',[r.after.blockSummary,r.after.currentView,...['keyInformation','preferences','decisions','judgments','openQuestions','possibleEvolution'].flatMap(f=>r.after[f].map(x=>x.text))].filter(Boolean).join('\n\n')));section.append(detail);list.append(section);}if(!result.items.length)list.append(element('p','muted','尚无可查看版本。'));$('library-dialog').showModal();await this.refresh();}
 async togglePin(){await this.mutate(async()=>{const t=await request('GET_LIBRARY_TOPIC',{id:this.id});await this.checked('EDIT_LIBRARY_TOPIC',{edit:{id:t.id,expectedRevision:t.revision,changes:{pinned:t.pinKey!==0},operationId:op()}});});}
 async requestCloseDialog(){this.dialogOpenIntent=(this.dialogOpenIntent||0)+1;const active=this.dialogEditor;if(active){active.collect();if(!await active.flush()&&(active.dirty()||isComposing(active))&&!window.confirm('当前草稿尚未保存。关闭会放弃这些修改，已保存内容不会改变。仍要关闭？'))return;if(this.dialogEditor===active){active.dispose();this.dialogEditor=null;}}this.closeDialog();if(!this.id)await this.refresh();}
 closeDialog(){$('library-dialog-content').inert=false;this.dialogResolve?.(null);this.dialogResolve=null;$('library-dialog').close();$('standalone-revisions').hidden=true;$('library-form').replaceChildren();$('library-dialog-content').replaceChildren();}
 form(title,fields){this.closeDialog();$('library-dialog-title').textContent=title;const form=$('library-form');const controls={};for(const f of fields){const label=element('label','',f.label);const input=element(f.options?'select':f.multiline?'textarea':'input');input.name=f.key;input.setAttribute('aria-label',f.label);if(f.options)for(const [value,text]of f.options){const option=element('option','',text);option.value=value;input.append(option);}if(f.value!==undefined)input.value=f.value;input.required=!!f.required;label.append(input);form.append(label);controls[f.key]=input;}const submit=element('button','','确定');submit.type='submit';form.append(submit);$('library-dialog').showModal();return new Promise(resolve=>{this.dialogResolve=resolve;form.onsubmit=e=>{e.preventDefault();const data=Object.fromEntries(Object.entries(controls).map(([k,v])=>[k,v.value]));this.dialogResolve=null;this.closeDialog();resolve(data);};});}
 async checked(type,data={}){try{const r=await request(type,data);if(r?.conflict){this.onStatus('内容或组织已更新，请重读后再试。','conflict');throw Object.assign(new Error('CONFLICT'),{handled:true});}return r;}catch(e){if(e.handled)throw e;this.onStatus('操作尚未完成，当前内容保留。请重试。','error');throw e;}}
 setBusy(value){for(const b of document.querySelectorAll('#topic-toolbar button,#topic-body button'))b.disabled=value;}
 async mutate(run){if(this.mutating)return;const wasHome=!this.id;this.mutating=true;this.setBusy(true);if(!await this.leave()){this.mutating=false;this.setBusy(false);return;}try{await run();this.cursor=null;this.pages=[];this.onStatus('更改已保存到本机');return true;}catch{showLocalFailure();return false;}finally{this.mutating=false;this.history=null;if(wasHome)this.resetHomeCollection();await this.refresh();this.setBusy(false);}}
 readFailure(){clearTimeout(this.refreshTimer);this.readFailed=true;this.readRetry.hidden=false;const retained=this.snapshotKey===this.readKey()&&(this.id?$('topic-body').children.length>0:$('thought-list').children.length>0);if(!retained&&!this.id)$('thought-empty').hidden=true;this.onStatus(libraryReadFailureText(retained),'read_error');}
 organizerSettingsVisible(){const panel=$('settings-panel'),group=$('ux-settings-ai-group');return !!panel&&!panel.hidden&&!!group&&!group.hidden;}
 queueOptionalStatus(){
  // Reuse the existing bounded local reads; opening Settings is not AI authorization.
  if(this.organizerSettingsVisible()){void this.updateViewStatus({strict:false,isCurrent:()=>this.organizerSettingsVisible()}).catch(()=>{});return;}
  if(this.view==='original'&&!this.aiPending&&!this.originalPending&&!this.boundedPending&&this.boundedState?.state!=='running'){return;}
  const epoch=this.statusEpoch,route=this.id,key=this.readKey(),beforeView=this.view,beforeSort=this.readingSort;
  const current=()=>epoch===this.statusEpoch&&route===this.id&&key===this.readKey()&&!this.readFailed&&!$('thought-panel').hidden;
  const reportFailure=this.searching||this.boundedState?.state==='running';void this.updateViewStatus({strict:false,isCurrent:current,reportFailure}).then(()=>{
   if(epoch!==this.statusEpoch||route!==this.id||this.readFailed||$('thought-panel').hidden)return;
   if(beforeView!==this.view||beforeSort!==this.readingSort){void this.refresh();return;}
   if(current()&&!this.id&&this.homePage?.key===key)this.paintHome(this.homePage.page,this.homePage.query,false);
  }).catch(()=>{});
  if(!this.id&&!this.rootProviderKey)void this.updateUnplaced(current);if(!this.id&&this.rootProviderKey)$('library-unplaced').parentElement.hidden=true;
 }

 async flushEditors(){for(const active of [this.editor,this.aiEditor,this.dialogEditor]){active?.collect?.();if(active&&!await active.flush()&&active.dirty())return false;}return true;}
 async refresh(){if(!this.id&&this.homeCollection&&!this.preserveHomeRefresh){this.homeDesiredCount=Math.max(40,this.homeDesiredCount||0,this.personalRoot.slots.extent(),this.homeCollection.items.length);this.homeCollection.releaseBodies();this.homePage=null;this.homeCollection=null;}this.preserveHomeRefresh=false;const key=this.readKey(),active=this.refreshRun;if(active&&active.key===key){active.queued=true;return active.promise;}const run={key,queued:false,promise:null};run.promise=(async()=>{do{run.queued=false;await this.refreshOnce();}while(run.queued&&run.key===this.readKey());})();this.refreshRun=run;try{return await run.promise;}finally{if(this.refreshRun===run)this.refreshRun=null;}}
 async refreshOnce(){
  const token=Symbol(),epoch=this.statusEpoch;this.loadToken=token;this.searching=!this.id&&!!$('thought-search').value.trim();
  const key=this.readKey(),host=this.id?$('thought-document'):$('thought-collection');
  const done=this.snapshotKey===key?()=>{}:beginLoading(host,this.id?'正在读取主题内容…':'正在读取思想库…');
  try{
   const read=await this.readRefresh();
   if(read!==true||this.loadToken!==token||epoch!==this.statusEpoch){done();return;}
   this.snapshotKey=this.readKey();this.snapshotRoute=this.id||'home';if(!this.id)this.homeLoaded=true;
   for(const id of ['topic-body','topic-heading'])$(id).inert=false;
   highlightReading(this.id?$('topic-body'):null,this.id?$('topic-search').value:'');
   done(host.dataset.state==='empty'?'empty':'ready');this.readRetry.hidden=true;
   if(this.readFailed){this.readFailed=false;this.onStatus('');}
   if(this.view!=='ai'||!this.id)this.queueOptionalStatus();
  }catch{done('failed');if(this.loadToken===token&&epoch===this.statusEpoch)this.readFailure();}
  finally{if(this.loadToken===token)this.searching=false;}
 }
 async reloadStructure(){if(!await this.leave())return;this.cursor=null;this.pages=[];await this.refresh();}
 ensurePanes(){if(!this.originalPane||!this.originalPane.isConnected){this.originalPane=element('div');this.originalPane.id='original-reading-body';this.aiPane=element('div');this.aiPane.id='ai-reading-body';$('topic-body').replaceChildren(this.originalPane,this.aiPane);this.aiSignature=undefined;}}
 renderDocument(page){
  this.ensurePanes();this.originalPane.hidden=false;this.aiPane.hidden=true;
  const heading=$('topic-heading'),body=this.originalPane,metadata=this.editor?.metadata||[],pins=this.editor?.entry.protectedIds?.()||new Set();
  if(!this.editor){heading.replaceChildren(...this.topicHeading(page.topic));metadata.push(new MetadataEditor(heading,page.topic,'topic',this.onStatus));}
  const existing=new Map([...body.querySelectorAll('[data-entry-id]')].map(node=>[node.dataset.entryId,node])),sections=new Map((page.sections||[]).map(section=>[section.sectionId,section]));
  const groups=new Map(),ordered=[],groupFor=year=>{
   year=String(year);if(groups.has(year))return groups.get(year);
   let node=[...body.children].find(node=>node.dataset.expressionYear===String(year));
   if(!node){node=element('section','topic-section topic-expression-year'+(year==='unknown'?' topic-unknown-time':''));node.dataset.expressionYear=String(year);const top=element('header','section-heading'),title=element('h2');title.tabIndex=-1;top.append(title);node.append(top);}
   node.firstElementChild.firstElementChild.textContent=year==='unknown'?(document.documentElement.lang==='en'?'Expression time unknown':'时间未知'):String(year);
   const group={node,children:[node.firstElementChild]};groups.set(year,group);ordered.push(node);return group;
  };
  const spacer=part=>{const node=element('div','topic-window-spacer');node.setAttribute('aria-hidden','true');node.dataset.topicWindowFrom=String(part.from);node.dataset.topicWindowTo=String(part.to);node.style.height=Math.max(1,Math.round(part.height||1))+'px';return node;};
  let current=null;
  for(const part of page.windowLayout||page.items.map(item=>({kind:'item',item}))){
   if(part.kind==='spacer'){const gap=spacer(part);if(current)current.children.push(gap);else ordered.push(gap);continue;}
   const item=part.item,entry=item.entry,prior=existing.get(entry.id),year=pins.has(entry.id)&&prior?.dataset.expressionYear?prior.dataset.expressionYear:expressionYear(entry);current=groupFor(year);
   const retain=prior&&(!entry.large||!prior.querySelector('[data-entry-field="body"]')||pins.has(entry.id)),node=retain?prior:this.entryNode(item);node.dataset.expressionYear=String(year);node.dataset.sectionId=item.placement.sectionId;
   const sent=node.querySelector('.entry-sent-time');if(sent)sent.textContent=expressionCaption(entry,document.documentElement.lang);
   const staleLabel=node.querySelector('.entry-stale');if(staleLabel){staleLabel.textContent=stale(entry);staleLabel.onclick=()=>this.actions.compare(entry.id);}
   let origin=node.querySelector('.topic-origin-section');const section=sections.get(item.placement.sectionId);
   if(section&&(!section.isDefault||year==='unknown')){if(!origin){origin=element('p','topic-origin-section muted');node.prepend(origin);}origin.textContent=(year==='unknown'?'所属章节：':'')+(section.title||'正文');}else origin?.remove();
   current.children.push(node);
  }
  // Protected nodes stay in their current year and retain native editor identity.
  for(const [id,node]of existing)if(pins.has(id)&&![...groups.values()].some(group=>group.children.includes(node))){const group=groupFor(node.dataset.expressionYear||'unknown');group.children.push(node);}
  for(const group of groups.values())placeChildren(group.node,group.children);
  placeChildren(body,ordered);
  const rows=page.items.filter(item=>!item.entry.large).map(item=>item.entry);
  if(this.editor){this.editor.entry.addRows(rows);this.editor.entry.releaseRows(new Set(rows.map(row=>row.id)));this.editor.entry.receive(rows);}
  else{const entry=new LibraryEntryEditor(body,rows,this.onStatus,()=>this.refresh());entry.importHistory(this.history);this.editor=new DocumentSession(entry,metadata);}
  this.applyLayout();this.renderSectionNav(page);if(this.desktopAppearance&&!this.desktopPresentation)this.enableDesktopPresentation();else this.desktopPresentation?.sync();
 }
 syncReadingControls(){const b=$('topic-order-toggle');if(!b)return;const asc=this.readingSort==='asc',en=document.documentElement.lang==='en',label=asc?(en?'Oldest first':'最早在前'):(en?'Newest first':'最新在前');b.dataset.readingSort=asc?'desc':'asc';setIconLabel(b,asc?'sort-up':'sort-down',label);b.setAttribute('aria-label',label);}
 async changeReadingSort(sort,{fromStart=false,timeEdge=null}={}){
  if(!this.id||this.view!=='original'||!['asc','desc'].includes(sort)||this.readingSortBusy)return;
  if(fromStart&&this.topicProviderKey)return;
  const topicId=this.id,anchor=fromStart?null:this.topicAnchor(),controls=$('topic-time-order'),buttons=[...controls.querySelectorAll('button')];
  this.readingSortBusy=true;controls.setAttribute('aria-busy','true');buttons.forEach(b=>b.disabled=true);
  try{
   if(!await this.flushEditors()||this.id!==topicId||this.view!=='original')return;
   try{await request('SET_ORGANIZER_CONTROLS',{changes:{readingSort:sort}});}
   catch{showLocalFailure('时间排序偏好尚未保存，阅读位置保持不变。请重试。');return;}
   if(this.id!==topicId||this.view!=='original')return;
   this.sortPreferenceChosen=true;this.readingSort=sort;this.topicNavigationAnchor=anchor?{entryId:anchor.id,top:anchor.top}:null;
   if(fromStart){this.topicResetFromStart=true;this.topicNavigationSection=null;this.resumeAnchor=null;this.topicTimeEdge=timeEdge||(sort==='asc'?'earliest':'latest');$('topic-search').value='';}
   this.cursor=null;this.pages=[];await this.refresh();
   if(fromStart&&this.id===topicId&&this.view==='original'&&!this.readFailed){
    const first=this.originalPane?.querySelector('[data-entry-id]');
    if(first){first.tabIndex=-1;first.scrollIntoView({block:'start',behavior:'instant'});first.focus({preventScroll:true});}
    if(this.topicReader?.pageMeta?.timeEdgeUnavailable)this.onStatus('这些记录的时间尚不明确，已回到原话开头。');
   }
  }finally{this.readingSortBusy=false;controls.removeAttribute('aria-busy');buttons.forEach(b=>b.disabled=!!this.topicProviderKey&&!!b.dataset.readingStart);this.syncReadingControls();}
 }
 async updateSourceOptions(serial,root,{cursor=null,keys=[],generation=null}={}){
  const timer=root?'rootSourceOptionsTimer':'topicSourceOptionsTimer';clearTimeout(this[timer]);
  const topicId=this.id,currentRoute=()=>serial===this.serial&&topicId===this.id&&(root?!this.id:this.id&&this.view==='original');
  if(!currentRoute())return;
  const select=$(root?'thought-source-scope':'topic-source-scope');
  select.setAttribute('aria-busy','true');
  const later=state=>{this[timer]=setTimeout(()=>{if(currentRoute())void this.updateSourceOptions(serial,root,state);},40);};
  let page;try{page=await request('PAIA_ARCHIVE_NAV_PAGE',{page:{groupKind:'providers',limit:40,mode:'paia',...(cursor?{cursor}:{})}});}catch{if(currentRoute())select.setAttribute('aria-busy','false');return;}
  if(!currentRoute())return;
  // The first bounded request advances the disposable index and can contain
  // no options. Only a complete, same-generation page is source membership.
  if(page.coverage?.state!=='complete'||page.cursorInvalid||(generation&&generation!==page.generation)){later({});return;}
  const found=[...new Set([...keys,...(page.items||[]).map(x=>x.providerKey).filter(key=>typeof key==='string'&&key)])];
  if(page.nextCursor){later({cursor:page.nextCursor,keys:found,generation:page.generation});return;}
  const current=root?this.rootProviderKey:this.topicProviderKey;if(current&&!found.includes(current))found.push(current);
  const desired=['',...found],existing=[...select.options].map(x=>x.value);
  if(JSON.stringify(existing)!==JSON.stringify(desired))select.replaceChildren(...desired.map(key=>{const option=element('option','',key?({chatgpt:'ChatGPT',claude:'Claude'})[key]||key:tc('全部来源（含独立写下的内容）'));option.value=key;return option;}));
  select.value=current||'';select.setAttribute('aria-busy','false');
 }
 updateTopicSourceOptions(serial=this.serial,state={}){return this.updateSourceOptions(serial,false,state);}
 updateRootSourceOptions(serial=this.serial,state={}){return this.updateSourceOptions(serial,true,state);}
 async changeRootSourceScope(next=$('thought-source-scope').value||null){
  if(this.id||next===this.rootProviderKey)return;
  this.serial++;this.statusEpoch++;this.rootPreSearch=null;this.rootProviderKey=next;this.resetHomeCollection();this.homePage=null;this.homeSignature=null;this.snapshotKey=null;
  $('library-unplaced-list').hidden=true;$('library-unplaced').setAttribute('aria-expanded','false');
  await this.refresh();
 }
 async changeTopicSourceScope(){
  const select=$('topic-source-scope'),next=select.value||null,previous=this.topicProviderKey;if(next===previous)return;
  select.disabled=true;
  try{
   if(!await this.leave()){select.value=previous||'';return;}
   this.topicProviderKey=next;this.topicReader=null;this.topicResetFromStart=true;this.resumeAnchor=null;this.topicNavigationAnchor=null;this.topicNavigationSection=null;this.topicTimeEdge=null;this.snapshotKey=null;
   this.originalPane?.replaceChildren();await this.refresh();
  }finally{select.disabled=false;}
 }
 filterAIReading(){const needle=$('topic-search').value.trim().normalize('NFKC').toLocaleLowerCase();let count=0;for(const section of $('topic-body').querySelectorAll('.ai-overview, .evolution-stage')){section.hidden=!!needle&&!section.textContent.normalize('NFKC').toLocaleLowerCase().includes(needle);if(!section.hidden)count++;}$('topic-search-count').textContent=needle?`${count} 个匹配章节`:'';this.renderSectionNav();highlightReading($('topic-body'),$('topic-search').value);}
 async focusSection(id,{isCurrent=()=>true}={}){if(!isCurrent())return;let node=[...$('topic-body').querySelectorAll('.topic-section')].find(n=>n.dataset.sectionId===id);if(!node&&this.view==='original'){await this.navigateTopicSection(id,{isCurrent});if(!isCurrent())return;node=[...$('topic-body').querySelectorAll('.topic-section')].find(n=>n.dataset.sectionId===id);}node?.scrollIntoView({block:'start'});node?.querySelector('h2')?.focus();}
 renderSectionNav(page=null){const nav=$('topic-section-nav');const sections=page?(page.sections||[]).map(s=>({id:s.sectionId,title:s.title||'正文'})):[...$('topic-body').querySelectorAll('.ai-overview:not([hidden]), .evolution-stage:not([hidden])')].map((s,i)=>({id:'ai-'+i,title:s.querySelector('h2').textContent,node:s}));if((page?.overview?.unknownCount??page?.coverage?.unknownTimeCount)&&!this.topicProviderKey)sections.push({id:null,title:'时间未知',timeGroup:'unknown'});const signature=JSON.stringify(sections.map(s=>[s.id,s.title,s.timeGroup]));$('topic-outline').hidden=!(page?.overview?.unknownCount??page?.coverage?.unknownTimeCount)&&sections.length<4&&$('topic-body').scrollHeight<innerHeight*3;if(nav.dataset.signature===signature)return;nav.dataset.signature=signature;nav.replaceChildren();nav.hidden=false;for(const section of sections){const b=button(section.title,async()=>{if(section.timeGroup==='unknown'){if(!await this.flushEditors())return;await this.changeReadingSort(this.readingSort,{fromStart:true,timeEdge:'unknown'});$('topic-outline').open=false;const unknown=this.originalPane?.querySelector('.topic-unknown-time');unknown?.scrollIntoView({block:'start'});unknown?.querySelector('h2')?.focus({preventScroll:true});return;}let node=section.node||[...$('topic-body').querySelectorAll('.topic-section')].find(n=>n.dataset.sectionId===section.id);if(page&&!node&&this.view==='original'){await this.navigateTopicSection(section.id);node=[...$('topic-body').querySelectorAll('.topic-section')].find(n=>n.dataset.sectionId===section.id);}$('topic-outline').open=false;node?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});});if(section.timeGroup)b.dataset.timeGroup=section.timeGroup;nav.append(b);}}
 entryNode(item){const e=item.entry,node=element('div','library-entry');node.dataset.entryId=e.id;if(e.large){node.append(element('p','muted','长内容单独载入，完整正文不会截断保存。'),button('读取完整内容',()=>this.loadLargeEntry(item,node)));return node;}
  const prose=editable('div',['entryField','body'],e.body,tc('内容正文'));prose.className='entry-prose';prose.contentEditable='false';prose.dataset.placeholder='写下内容…';const meta=element('div','entry-meta');const type=element('select');type.dataset.entryField='type';type.setAttribute('aria-label','内容类型');for(const [value,text]of Object.entries({fact:'事实',event:'事件',preference:'偏好',decision:'决定',judgment:'判断',idea:'想法',goal_plan:'目标与计划',reflection:'反思',creation:'创作'})){const o=element('option','',text);o.value=value;type.append(o);}type.value=e.type;meta.append(type,button(stale(e),()=>this.actions.compare(e.id)));meta.lastElementChild.className='entry-stale';let selectedThought=null;const actions=actionMenu('内容操作',[[tc('加入所选文字'),async()=>{if(!selectedThought){this.onStatus(tc('请先在这条思想中选择文字。'));return;}if(!await this.flushEditors())return;const current=await request('GET_LIBRARY_ENTRY',{id:e.id});if(current.body.slice(selectedThought.start,selectedThought.end)!==selectedThought.text){this.onStatus(tc('这段内容已变化，请重新确认。'));return;}await this.actions.add({kind:'thought',id:e.id,expectedRevision:current.revision,span:{start:selectedThought.start,end:selectedThought.end}},selectedThought.text);} ],[tc('查看当时记录'),()=>this.actions.compare(e.id,{source:true})],[tc('查看档案当前文字'),()=>this.actions.compare(e.id)],[tc('复制当前文字'),async()=>{if(!await this.flushEditors())return;const current=await request('GET_LIBRARY_ENTRY',{id:e.id});if(current.lifecycle!=='active'||current.staleReasons?.includes('source_purged'))return;return copyReadingText(current.body);}],['来源',()=>{provenance.hidden=false;provenance.open=true;}],['备注',()=>{note.hidden=false;note.open=true;field.focus();}],...(!item.standalone?[['版本历史',()=>this.revisions('library_entry',e.id,e.id)]]:[]),...([['add','添加到主题'],['section','移动到章节'],['up','向上移动'],['down','向下移动'],['removeTopic','从此主题移出'],['delete','删除内容'],['placementVersions','位置与成员版本']].filter(([key])=>item.placement?.topicId||['add','delete'].includes(key)).map(([key,label])=>[label,()=>this.entryActions(e.id,item.placement,key)]))]);const rememberSelection=()=>{const selection=getSelection(),range=selection?.rangeCount?selection.getRangeAt(0):null;if(!range||range.collapsed||!prose.contains(range.startContainer)||!prose.contains(range.endContainer))return;const before=range.cloneRange();before.selectNodeContents(prose);before.setEnd(range.startContainer,range.startOffset);selectedThought={start:before.toString().length,end:before.toString().length+range.toString().length,text:range.toString()};};actions.addEventListener('pointerdown',rememberSelection);actions.addEventListener('focusin',rememberSelection);meta.append(actions);
  const note=element('details','entry-note');note.hidden=true;note.addEventListener('toggle',()=>{if(!note.open)note.hidden=true;});note.append(element('summary','','备注'));const field=element('textarea');field.dataset.entryField='note';field.value=e.note;field.setAttribute('aria-label','内容备注');note.append(field);
  const provenance=element('details','entry-provenance');provenance.hidden=true;provenance.append(element('summary','','来源'));const detail=element('div');provenance.append(detail);provenance.addEventListener('toggle',productAction(async()=>{detail.replaceChildren();if(!provenance.open){provenance.hidden=true;return;}const r=await request('GET_LIBRARY_PROVENANCE',{id:e.id});if(!provenance.open)return;detail.append(element('p','',r.count?`主要来源 ${r.primary} · 补充来源 ${r.supporting} · 辅助上下文 ${r.contextOnly??r.items.filter(x=>x.role==='context_only').length}`:r.userCreated?'用户创建的独立内容':'原有来源已不可用，保留独立整理内容'));if(r.items.some(x=>x.role==='context_only'))detail.append(element('p','muted','辅助上下文帮助理解当时的表达，不作为这条内容的直接依据。'));for(const source of r.items){const role=({primary:'主要来源',supporting:'补充来源',context_only:'辅助上下文'})[source.role]||'来源作用未确认';const row=element('p','',role+' · '+(({resolvable:'来源可查看',version_unavailable:'来源已更新；引用的旧版本已不可用',removed:'来源已移除',unavailable:'来源不可用'})[source.availability]||'来源状态未确认'));row.dataset.evidenceRole=source.role;if(source.inputId)row.append(button('查看输入',()=>this.onInput(source.inputId)));const advanced=element('details','source-technical');advanced.append(element('summary','','高级详情'),element('p','',`引用版本 ${source.usedVersion}${source.currentVersion===null?'':' / 当前版本 '+source.currentVersion}`));detail.append(row,advanced);}}));
  const binding=element('p','thought-binding-status',e.bodyBinding==='input'&&e.reverseEditEnabled?tc('同时修改档案'):e.thoughtEditedAt?tc('已在思想库编辑'):'');node.append(binding);
  const validTime=value=>value&&Number.isFinite(Date.parse(value)),label=validTime(e.sourceSentAt)?'发送于 '+new Date(e.sourceSentAt).toLocaleString():validTime(e.capturedAt)?'记录于 '+new Date(e.capturedAt).toLocaleString():e.provenanceType==='user_created'&&validTime(e.createdAt)?'写于 '+new Date(e.createdAt).toLocaleString():'时间未知';const sent=element('p','entry-sent-time',e.expressionTime?expressionCaption(e,document.documentElement.lang):e.timeBasis==='unknown'?'时间未知':label);node.append(sent,prose,meta,note,provenance);return node;
 }
 async loadLargeEntry(item,node){
  const owner=this.editor,reader=this.topicReader,topicId=this.id,view=this.view,serial=this.serial,current=()=>owner===this.editor&&reader===this.topicReader&&topicId===this.id&&view===this.view&&serial===this.serial&&node.isConnected;
  if(!owner||!node.isConnected)return;const row=await request('GET_LIBRARY_ENTRY',{id:item.entry.id});if(!current())return;
  if(row.id!==item.entry.id||row.revision!==item.entry.revision){this.onStatus('内容刚有变化，请重新核对后读取。');void this.refresh();return;}
  let descriptor=item;
  if(reader){const page=await reader.load({topicId,sort:reader.sort,query:reader.query,anchorId:row.id,cursor:null,direction:'next',expectedReadGeneration:reader.coverage?.activeGeneration||null});if(!current())return;descriptor=page.items?.find(x=>x.entry.id===row.id);if(page.cursorInvalid||page.indexing||!descriptor||descriptor.entry.revision!==row.revision){this.onStatus('内容或表达时间刚有变化，请重新核对。');void this.refresh();return;}}
  const full={...descriptor,entry:{...row,expressionTime:descriptor.entry.expressionTime,timeBasis:descriptor.entry.timeBasis,effectiveTime:descriptor.entry.effectiveTime}};if(reader){const index=reader.index.get(row.id);if(!Number.isInteger(index))return;reader.items[index]=full;reader.bodyRevision++;}if(this.document){this.document.items=this.document.items.map(item=>item.entry.id===row.id?full:item);this.document.windowLayout=this.document.windowLayout?.map(part=>part.kind==='item'&&part.item.entry.id===row.id?{...part,item:full}:part);}const replacement=this.entryNode(full);node.replaceWith(replacement);owner.entry.addRows([full.entry]);replacement.querySelector?.('[data-entry-field="body"]')?.focus({preventScroll:true});reader?.trimBodies();
 }
 topicHeading(topic){
  const title=editable('h1',['metaField','name'],topic.name,'主题标题'),note=element('section','topic-note-editor');note.id='topic-note-editor';note.dataset.topicNoteEditor='true';note.hidden=true;
  const label=element('label','',tc('你写的主题说明')),field=element('textarea');field.dataset.metaField='summary';field.value=topic.summary||'';field.setAttribute('aria-label',tc('你写的主题说明'));label.append(field);
  note.append(label,button(tc('重试保存说明'),()=>this.retryTopicNote()),button(tc('核对说明版本'),()=>this.compareTopicNote()),button(tc('复制说明'),()=>copyReadingText(this.topicMetadata()?.local.summary||'')),button(tc('收起说明'),async()=>{const owner=this.topicMetadata();if(!owner||isComposing(owner))return;owner.collect();if(await owner.flush()||!owner.dirty())note.hidden=true;}));
  return [title,note];
 }
 topicMetadata(){return this.editor?.metadata.find(owner=>owner.kind==='topic');}
 async editTopicCue(){
  if(!this.id)return;const id=this.id;if(this.view!=='original')await this.switchView('original');if(this.id!==id)return;if(this.originalMode==='years')await this.switchOriginalMode('content');if(this.id!==id)return;
  const owner=this.topicMetadata();if(!owner||isComposing(owner))return;await owner.recoveryReady;if(this.id!==id||owner!==this.topicMetadata()||isComposing(owner))return;
  const note=$('topic-note-editor');if(!note)return;owner.paint();note.hidden=false;note.querySelector('textarea')?.focus({preventScroll:true});note.scrollIntoView({block:'nearest'});
 }
 async retryTopicNote(){const owner=this.topicMetadata();if(!owner||isComposing(owner))return;owner.collect();if(owner.conflicted)return this.compareTopicNote();owner.failed=false;await owner.flush();}
 async compareTopicNote(){
  const owner=this.topicMetadata(),id=this.id;if(!owner||isComposing(owner))return;owner.collect();const draft={...owner.local},intent=owner.editIntent,token=owner.recovery.currentToken,valid=()=>!owner.disposed&&id===this.id&&owner===this.topicMetadata()&&!isComposing(owner)&&owner.editIntent===intent&&owner.recovery.currentToken===token&&JSON.stringify(owner.local)===JSON.stringify(draft),fresh=await request('GET_LIBRARY_TOPIC',{id});if(!valid())return;
  const choice=this.form(tc('核对说明版本'),[{key:'decision',label:tc('请选择要保留的版本'),required:true,options:[['',tc('请选择')],['current',tc('保留已保存版本')],['mine',tc('使用我的草稿')]]}]);
  const content=$('library-dialog-content');for(const [label,values]of [[tc('已保存版本'),fresh],[tc('我的草稿'),draft]])content.append(element('h3','',label),element('pre','topic-note-compare',[values.name,values.summary].join('\n\n')));
  const decision=await choice;if(!decision||!valid())return;
  const current=await request('GET_LIBRARY_TOPIC',{id});if(!valid())return;if(JSON.stringify([current.revision,current.name,current.summary,current.recoveryEpoch])!==JSON.stringify([fresh.revision,fresh.name,fresh.summary,fresh.recoveryEpoch])){this.onStatus('内容刚有更新，请重新核对说明版本。','conflict');return;}
  if(decision.decision==='current'){await owner.recovery.clear(token||owner.recoveryToken);if(!valid())return;}
  owner.row=fresh;owner.saved=Object.fromEntries(owner.fields.map(field=>[field,fresh[field]]));owner.local=decision.decision==='current'?{...owner.saved}:draft;owner.failed=false;owner.conflicted=false;owner.conflictBaseRevision=null;owner.recoveryAttempt=null;owner.recoveryUnacknowledged=false;owner.paint();
  if(decision.decision==='mine')await owner.flush();
 }
 async createTopic(){const value=await this.form(tc('新建主题'),[{key:'name',label:'主题名称',required:true}]);if(!value)return;try{const r=await this.checked('CREATE_LIBRARY_TOPIC',{topic:{...value,operationId:op()}});await this.open(r.id);}catch{}}
 async createEntry(){return this.actions.compose({topicId:this.id||undefined});}
 async manageSections(){
  if(!this.id||!await this.flushEditors())return;const topicId=this.id,sections=await this.topicSectionRows();if(this.id!==topicId)return;
  this.closeDialog();$('library-dialog-title').textContent='管理主题结构';const host=$('library-dialog-content');
  host.append(element('p','muted','章节与手动顺序仍保留；内容阅读按真实表达时间排列。'),button('新建章节',()=>this.createSection()));
  for(const section of sections){const row=element('section','topic-structure-row');row.append(element('h3','',section.title||'正文'));for(const [action,label]of [['rename','重命名'],['merge','合并章节'],['up','向上移动'],['down','向下移动'],['revisions','章节版本历史']])row.append(button(label,()=>{this.closeDialog();return this.sectionActions(section,action);}));host.append(row);}
  $('library-dialog').showModal();
 }
 async createSection(){const v=await this.form('新建章节',[{key:'title',label:'章节名称'}]);if(!v)return;await this.mutate(async()=>{const t=await request('GET_LIBRARY_TOPIC',{id:this.id});await this.checked('CREATE_LIBRARY_SECTION',{section:{topicId:t.id,expectedTopicRevision:t.organizationRevision,title:v.title,operationId:op()}});});}
 async topics(){let cursor=null,rows=[];do{const p=await request('LIBRARY_INDEX_PAGE',{options:{mode:'all',cursor,limit:100}});rows.push(...p.items);cursor=p.nextCursor;}while(cursor&&rows.length<1000);return rows;}
 async mergeSuggestions(){if(!await this.leave())return;this.closeDialog();$('library-dialog-title').textContent='可能相关的主题';const list=$('library-dialog-content'),result=await request('GET_LIBRARY_MERGE_SUGGESTIONS');list.append(element('p','muted','这些主题可能在讨论同一件事。只有你选择合并后才会改变组织，内容原文保持独立。'));
 for(const item of result.items){const row=element('section','merge-suggestion');row.append(element('p','',item.sourceName+' → '+item.targetName),button('合并到“'+item.targetName+'”',async()=>{this.closeDialog();await this.mutate(async()=>{const source=await request('GET_LIBRARY_TOPIC',{id:item.sourceId}),target=await request('GET_LIBRARY_TOPIC',{id:item.targetId}),r=await this.checked('START_LIBRARY_LAYOUT',{layout:{kind:'topic_merge',topicId:source.id,survivorId:target.id,expectedTopicRevision:source.organizationRevision,expectedSurvivorRevision:target.organizationRevision,operationId:op()}});await this.waitLayout(r.jobId);this.id=target.id;});}),button('保持分开',async()=>{await request('KEEP_LIBRARY_TOPICS_SEPARATE',{options:{sourceId:item.sourceId,targetId:item.targetId}});row.replaceChildren(element('p','muted','已记住：这两个主题保持分开。'));}));list.append(row);}if(!result.items.length)list.append(element('p','muted','暂未发现需要合并的主题。'));const renames=await request('GET_LIBRARY_RENAME_SUGGESTIONS');for(const item of renames.items){const row=element('section','merge-suggestion');row.append(element('p','','名称建议：'+item.name+' → '+item.suggestedName),button('使用建议名称',async()=>{await this.checked('EDIT_LIBRARY_TOPIC',{edit:{id:item.topicId,expectedRevision:item.revision,changes:{name:item.suggestedName},operationId:op()}});row.replaceChildren(element('p','muted','已按你的确认更新主题名称。'));await this.refresh();}),button('自己命名',()=>this.renameTopic(item.topicId)));list.append(row);}$('library-dialog').showModal();}
 async pinGridTopic(id){const topic=await request('GET_LIBRARY_TOPIC',{id});await this.checked('EDIT_LIBRARY_TOPIC',{edit:{id,expectedRevision:topic.revision,changes:{pinned:topic.pinKey!==0},operationId:op()}});await this.refresh();}
 async renameTopic(id){const topic=await request('GET_LIBRARY_TOPIC',{id}),value=await this.form('主题名称',[{key:'name',label:'主题名称',value:topic.name,required:true}]);if(!value)return;await this.mutate(()=>this.checked('EDIT_LIBRARY_TOPIC',{edit:{id,expectedRevision:topic.revision,changes:{name:value.name},operationId:op()}}));}
 async deleteTopic(id){const topic=await request('GET_LIBRARY_TOPIC',{id}),choice=this.form('删除“'+topic.name+'”',[{key:'confirm',label:'删除范围',options:[['container','仅删除主题容器，保留所有内容']]}]);$('library-dialog-content').append(element('p','muted','内容正文、原始来源和版本不会删除。只属于此主题的内容会出现在“未归入主题”，也可从 Settings 恢复主题。'));$('library-form').querySelector('button[type=submit]').textContent='删除主题';if(!await choice)return;await this.mutate(async()=>{await this.checked('REMOVE_LIBRARY_TOPIC',{edit:{id,expectedRevision:topic.revision,operationId:op()}});if(this.id===id){this.id=null;this.onOpen();}});}
 async removedTopics(){const result=await request('GET_LIBRARY_REMOVED_TOPICS'),list=$('library-management-list');list.replaceChildren(element('p','muted','删除主题只移除组织容器，内容仍保留。'));for(const topic of result.items){const row=element('p','',topic.name);row.append(button('恢复主题',async()=>{await this.checked('RESTORE_LIBRARY_TOPIC',{edit:{id:topic.id,expectedRevision:topic.revision,operationId:op()}});await this.removedTopics();await this.refresh();}),button('版本历史',()=>this.revisions('topic',topic.id,topic.id)));list.append(row);}if(!result.items.length)list.append(element('p','muted','没有已删除的主题。'));}
 async mergeTopic(){const topics=(await this.topics()).filter(t=>t.id!==this.id);if(!topics.length){this.onStatus('先创建另一个主题，再选择保留的主题。');return;}const value=await this.form('合并主题 · 选择保留的主题',[{key:'survivorId',label:'保留主题',options:topics.map(t=>[t.id,t.name])}]);if(!value)return;await this.mutate(async()=>{const source=await request('GET_LIBRARY_TOPIC',{id:this.id}),target=await request('GET_LIBRARY_TOPIC',{id:value.survivorId});const r=await this.checked('START_LIBRARY_LAYOUT',{layout:{kind:'topic_merge',topicId:source.id,survivorId:target.id,expectedTopicRevision:source.organizationRevision,expectedSurvivorRevision:target.organizationRevision,operationId:op()}});await this.waitLayout(r.jobId);this.id=target.id;});}
 async waitLayout(id){for(;;){const r=await request('GET_LIBRARY_LAYOUT',{id});if(r.state==='complete')return;if(r.state==='paused'){this.onStatus('组织准备已暂停，当前文档保留，可重试。','error');throw new Error('LAYOUT_PAUSED');}this.onStatus('正在整理文档顺序…');await new Promise(resolve=>setTimeout(resolve,200));}}
 async sectionActions(section,action=null){const options=[['rename','重命名'],['merge','合并到另一章节'],['up','向上移动'],['down','向下移动'],['revisions','版本历史']];const value=action?{action}:await this.form('章节操作',[{key:'action',label:'操作',options}]);if(!value)return;if(value.action==='revisions')return this.revisions('section',section.sectionId,this.id);if(value.action==='rename'){const name=await this.form('章节名称',[{key:'title',label:'章节名称',value:section.title}]);if(name)await this.mutate(()=>this.checked('EDIT_LIBRARY_SECTION',{edit:{topicId:this.id,sectionId:section.sectionId,expectedRevision:section.revision,title:name.title,operationId:op()}}));return;}
  const sections=await this.topicSectionRows();let other;if(value.action==='merge'){const v=await this.form('合并章节',[{key:'targetSectionId',label:'保留章节',options:sections.filter(s=>s.sectionId!==section.sectionId).map(s=>[s.sectionId,s.title||'正文'])}]);if(!v)return;other=v.targetSectionId;}else{const adjacent=await request('GET_LIBRARY_TOPIC_ADJACENCY',{options:{topicId:this.id,kind:'section',id:section.sectionId,direction:value.action==='up'?'up':'down'}});other=adjacent.id;if(!other){announce(value.action==='up'?'已经是第一个章节。':'已经是最后一个章节。');return;}}
  await this.mutate(async()=>{const t=await request('GET_LIBRARY_TOPIC',{id:this.id});const r=await this.checked('START_LIBRARY_LAYOUT',{layout:{kind:value.action==='merge'?'section_merge':'section_order',topicId:this.id,sectionId:section.sectionId,targetSectionId:other,expectedTopicRevision:t.organizationRevision,operationId:op()}});await this.waitLayout(r.jobId);});
 }
 async entryActions(id,placement,action=null){if(this.dialogEditor){this.dialogEditor.collect();if(!await this.dialogEditor.flush())return;this.dialogEditor.dispose();this.dialogEditor=null;}const v=action?{action}:await this.form('内容操作',[{key:'action',label:'操作',options:[['add','添加到主题'],['section','移动到章节'],['up','向上移动'],['down','向下移动'],['removeTopic','从此主题移出'],['delete','删除内容'],['placementVersions','位置与成员版本']].filter(([key])=>placement?.topicId||['add','delete'].includes(key))}]);if(!v)return;if(v.action==='placementVersions')return this.revisions('placement',placement.id,this.id);
  let targetTopic=this.id,sectionId=placement?.sectionId;if(v.action==='add'){if(!await this.flushEditors())return;const row=await request('GET_LIBRARY_ENTRY',{id});return this.actions.add({kind:'thought',id,expectedRevision:row.revision},row.body);}if(v.action==='section'){const sections=await this.topicSectionRows(),value=await this.form('移动到章节',[{key:'id',label:'章节',options:sections.map(s=>[s.sectionId,s.title||'正文'])}]);if(!value)return;sectionId=value.id;}
  const changed=await this.mutate(async()=>{const e=await request('GET_LIBRARY_ENTRY',{id});if(v.action==='delete'){await this.checked('REMOVE_LIBRARY_ENTRY',{edit:{id,expectedRevision:e.revision,operationId:op()}});return;}const t=await request('GET_LIBRARY_TOPIC',{id:targetTopic});if(v.action==='up'||v.action==='down'){const adjacent=await request('GET_LIBRARY_TOPIC_ADJACENCY',{options:{topicId:this.id,kind:'entry',id,sectionId:placement.sectionId,direction:v.action==='up'?'up':'down'}});if(!adjacent.id){announce(v.action==='up'?'已经是本章节第一条。':'已经是本章节最后一条。');return;}const result=await this.checked('REORDER_LIBRARY_ENTRY',{placement:{topicId:this.id,entryId:id,otherEntryId:adjacent.id,expectedTopicRevision:t.organizationRevision,operationId:op()}});if(result.jobId)await this.waitLayout(result.jobId);this.onStatus('手动顺序已保存；当前阅读仍按时间排列。');return;}const paths=await request('GET_LIBRARY_PATHS',{id}),old=paths.find(p=>p.topicId===targetTopic)?.placement;await this.checked('PLACE_LIBRARY_ENTRY',{placement:{entryId:id,topicId:targetTopic,...(sectionId?{sectionId}:{}),expectedEntryRevision:e.revision,expectedTopicRevision:t.organizationRevision,...(old?{expectedPlacementRevision:old.revision}:{}),remove:v.action==='removeTopic',operationId:op()}});});if(v.action==='delete'&&changed){if(this.dialogEntryId===id)this.closeDialog();const host=announce('内容已移入“已删除内容”，原始来源保留。');host?.append(button('撤销',async()=>{const row=await request('GET_LIBRARY_ENTRY',{id});await this.checked('RESTORE_LIBRARY_ENTRY',{edit:{id,expectedRevision:row.revision,operationId:op()}});await this.refresh();announce('内容已恢复。');}));}
 }
 async createStandalone(){return this.actions.compose();}
 async updateUnplaced(isCurrent=()=>true){
  const attempt=this.unplacedAttempt=(this.unplacedAttempt||0)+1,seen=new Set();let cursor=null;
  for(let pages=0;pages<20;pages++){
   const result=await boundedLocalRead(()=>request('GET_LIBRARY_UNPLACED',{options:{cursor}}));
   if(attempt!==this.unplacedAttempt||!isCurrent())return;
   if(!result.ok||!Array.isArray(result.value?.items)){$('library-unplaced').parentElement.hidden=true;return;}
   const page=result.value;if(page.items.length){$('library-unplaced').parentElement.hidden=false;return;}
   cursor=page.nextCursor;if(!cursor){$('library-unplaced').parentElement.hidden=true;return;}
   const key=JSON.stringify(cursor);if(seen.has(key))break;seen.add(key);
  }
  if(isCurrent())$('library-unplaced').parentElement.hidden=true;
 }
 createUnplacedCollection(){return new ContinuousCollection({scope:'unplaced',keyOf:e=>e.id,load:({cursor})=>request('GET_LIBRARY_UNPLACED',{options:{cursor,limit:40}})});}
 renderUnplaced(state){const list=$('library-unplaced-list'),sentinel=$('unplaced-continuous-sentinel'),nodes=[];for(const e of state.items){const b=button(e.snippet||'空内容',()=>this.openStandalone(e.id));b.dataset.unplacedId=e.id;nodes.push(b);}if(state.terminal&&!state.items.length)nodes.push(element('p','muted','暂时没有未归入主题的内容。'));list.replaceChildren(...nodes,sentinel);this.updateUnplacedContinuous(state);}
 updateUnplacedContinuous(state){const sentinel=$('unplaced-continuous-sentinel'),status=$('unplaced-continuous-status'),retry=$('unplaced-continuous-retry');sentinel.dataset.terminal=String(!!state.terminal);retry.hidden=!state.error;status.textContent=state.loading?'正在继续载入…':state.error?'加载中断；当前列表已保留。':state.terminal?'已到列表末尾':'向下滚动继续加载';if(this.continuousObserver&&!state.terminal){this.continuousObserver.unobserve(sentinel);this.continuousObserver.observe(sentinel);}}
 async loadUnplacedNext(){const collection=this.unplacedCollection;if($('thought-panel').hidden||this.id||!collection||collection.loading||collection.terminal||$('library-unplaced-list').hidden)return;const state=await collection.loadNext();if(collection!==this.unplacedCollection)return;this.renderUnplaced(state);}
 async unplaced(){const list=$('library-unplaced-list'),trigger=$('library-unplaced');trigger.parentElement.hidden=false;if(!list.hidden&&this.unplacedCollection){list.hidden=true;trigger.setAttribute('aria-expanded','false');return;}list.hidden=false;trigger.setAttribute('aria-expanded','true');this.unplacedCollection=this.unplacedCollection||this.createUnplacedCollection();const collection=this.unplacedCollection,state=await collection.loadUntil({minItems:1,maxLoads:20});if(collection!==this.unplacedCollection)return;this.renderUnplaced(state);}
 async removed(cursor=null){const result=await request('GET_LIBRARY_REMOVED',{options:{cursor}}),list=$('library-management-list');if(!cursor)list.replaceChildren();for(const e of result.items){const row=element('p','',e.body.slice(0,80)||'空内容');row.append(button('恢复内容',async()=>{await this.checked('RESTORE_LIBRARY_ENTRY',{edit:{id:e.id,expectedRevision:e.revision,operationId:op()}});await this.removed();await this.refresh();}),button('版本',()=>this.revisions('library_entry',e.id,e.id)));list.append(row);}if(!list.children.length)list.append(element('p','muted','没有已删除的内容。'));if(result.nextCursor)list.append(button('更多已删除内容',()=>this.removed(result.nextCursor)));}
 async revisions(kind='topic',id=this.id,documentId=this.id){if(this.dialogEditor){this.dialogEditor.collect();if(!await this.dialogEditor.flush())return;this.dialogEditor.dispose();this.dialogEditor=null;}if(this.editor){this.editor.collect();if(!await this.editor.flush())return;}this.closeDialog();$('library-dialog-title').textContent='版本历史';const list=$('library-dialog-content');const load=async cursor=>{const result=await request('GET_REVISIONS',{options:{kind,entityId:id,documentId,cursor,limit:50}});for(const r of result.items.filter(x=>x.entityId===id)){const row=element('section','revision-row');row.append(element('p','',`${new Date(r.at).toLocaleString()} · ${r.actor==='ai'?'AI':'用户'} · ${revisionLabel(r)} ${r.important?'· 重要版本':''}`));const detail=element('details');detail.append(element('summary','','查看变化'),element('pre','','操作前\n'+revisionPreview(r.before,r.kind)+'\n\n操作后\n'+revisionPreview(r.after,r.kind)));row.append(detail);for(const side of ['before','after'].filter(side=>r[side]!==null))row.append(button(side==='before'?'恢复操作前':'恢复此版本',async()=>{await this.restoreRevision(r,side);this.closeDialog();}));list.append(row);}if(result.nextCursor)list.append(button('更多版本',()=>load(result.nextCursor)));};await load(null);$('library-dialog').showModal();}
 async restoreRevision(r,side){await this.mutate(async()=>{if(r.kind==='library_entry'){const e=await request('GET_LIBRARY_ENTRY',{id:r.entityId});await this.checked('RESTORE_REVISION',{restore:{id:r.id,side,expectedRevision:e.revision,operationId:op()}});}else{const topic=await request('GET_LIBRARY_TOPIC',{id:r.documentId||r.entityId});if(r.kind==='placement'){const value=r[side]||r.after,p=await request('GET_LIBRARY_PLACEMENT',{topicId:topic.id,entryId:value.entryId}),e=await request('GET_LIBRARY_ENTRY',{id:value.entryId});await this.checked('RESTORE_REVISION',{restore:{id:r.id,side,expectedRevision:p.revision,expectedEntryRevision:e.revision,expectedTopicRevision:topic.organizationRevision,operationId:op()}});}else if(r.kind==='topic')await this.checked('RESTORE_REVISION',{restore:{id:r.id,side,expectedRevision:topic.revision,operationId:op()}});else if(r.kind==='section'){const page=await request('TOPIC_DOCUMENT_PAGE',{options:{topicId:topic.id}}),section=page.sections.find(s=>s.sectionId===r.entityId);if(section)await this.checked('RESTORE_REVISION',{restore:{id:r.id,side,expectedRevision:section.revision,operationId:op()}});}}});}
 async focusEntry(id,{isCurrent=()=>true}={}){if(!isCurrent())return;const node=[...$('topic-body').querySelectorAll('[data-entry-id]')].find(n=>n.dataset.entryId===id);if(node){node.scrollIntoView({block:'center'});node.querySelector('[data-entry-field="body"]')?.focus();}else await this.openStandalone(id,{isCurrent});}
 dialogStatus(text,kind){
  this.onStatus(text,kind);const root=$('library-dialog-content');root.querySelector('#standalone-save-feedback')?.remove();if(!kind)return;
  const feedback=element('div','local-save-feedback');feedback.id='standalone-save-feedback';feedback.setAttribute('role','status');feedback.append(element('p','',text+' 当前草稿仍保留在此弹窗。'));
  if(!this.dialogEditor?.conflicted)feedback.append(button('重试本地保存',async()=>{const active=this.dialogEditor;if(active){active.failed=false;await active.flush();}}));
  feedback.append(button('重新读取已保存版本',async()=>{const active=this.dialogEditor;if(!active)return;if((active.dirty()||isComposing(active))&&!window.confirm('放弃当前尚未保存的草稿，重新读取已保存版本？'))return;await this.openStandalone(this.dialogEntryId,{discard:true});}));root.prepend(feedback);
 }
 async openStandalone(id,{discard=false,isCurrent=()=>true}={}){
  if(!isCurrent())return;
  const intent=this.dialogOpenIntent=(this.dialogOpenIntent||0)+1,active=this.dialogEditor,root=$('library-dialog-content');
  if(active){active.collect();if(!discard&&!await active.flush())return;root.inert=true;}
  try{const e=await request('GET_LIBRARY_ENTRY',{id});if(intent!==this.dialogOpenIntent||!isCurrent())return;
   if(active&&this.dialogEditor===active){active.dispose();this.dialogEditor=null;}this.closeDialog();this.dialogEntryId=id;$('library-dialog-title').textContent='内容';$('standalone-revisions').hidden=false;$('standalone-revisions').onclick=productAction(()=>this.revisions('library_entry',e.id,e.id));root.append(this.entryNode({entry:e,placement:{sectionId:null},standalone:true}));this.dialogEditor=new LibraryEntryEditor(root,[e],(text,kind)=>this.dialogStatus(text,kind));$('library-dialog').showModal();
  }catch(error){if(active&&intent===this.dialogOpenIntent)this.dialogStatus('内容尚未读完，请重试；已保存内容没有改变。','error');else throw error;}
  finally{if(intent===this.dialogOpenIntent)root.inert=false;}
 }
 contentReadKey(){return JSON.stringify([this.id,this.view,this.readingSort,this.topicProviderKey,this.rootProviderKey,this.cursor,this.id?$('topic-search').value.trim():$('thought-search').value.trim()]);}
 async openContentSearchResult(item,path=item.paths?.[0]||item){
  const before=this.openIntent;
  if(item.aiField&&this.view!=='ai'){await this.switchView('ai');if(before!==this.openIntent)return;}
  if(!path.topicId){const current=()=>this.id===null&&before===this.openIntent;await this.openStandalone(item.entryId,{isCurrent:current});return;}
  const intent=await this.open(path.topicId);
  const current=()=>intent!==undefined&&intent===this.openIntent&&this.id===path.topicId;
  if(!current())return;
  if(path.sectionId){await this.focusSection(path.sectionId,{isCurrent:current});if(!current())return;}
  if(item.entryId){await this.focusEntry(item.entryId,{isCurrent:current});if(!current())return;}
  if(item.aiField)$('topic-body').querySelector('[data-ai-field='+item.aiField+']')?.focus();
 }
 async searchContent(){
  if(this.view==='ai'){this.filterAIReading();return;}
  if([this.editor,this.aiEditor,this.dialogEditor].some(isComposing)||!await this.flushEditors())return;
  const query=$('topic-search').value.trim(),prior=this.topicReader?.query||'',anchor=this.topicAnchor();
  if(query&&!prior&&this.topicReader)this.contentPreSearch={topicId:this.id,providerKey:this.topicProviderKey,sort:this.readingSort,snapshot:this.topicReader.snapshot(anchor),anchor};
  const before=this.contentPreSearch;
  if(!query&&prior&&before?.topicId===this.id&&before.providerKey===this.topicProviderKey&&before.sort===this.readingSort){this.contentResume=before.snapshot;this.topicReader=null;this.topicNavigationAnchor=before.anchor?{entryId:before.anchor.id,top:before.anchor.top}:null;this.topicResetFromStart=false;this.contentPreSearch=null;}
  else{this.topicResetFromStart=true;this.topicNavigationAnchor=null;}
  this.cursor=null;this.pages=[];await this.refresh();
 }
 async readViewStatus({strict=true,isCurrent=()=>true,reportFailure=false}={}){
  const attempt=++this.statusReadSerial,epoch=this.statusEpoch;
  const [saved,preferences]=await Promise.all([
   boundedLocalRead(()=>request('GET_AI_PRESENTATION_STATUS',{options:this.id?{topicId:this.id}:{summaryOnly:true}})),
   boundedLocalRead(()=>request('GET_ORGANIZER_CONTROLS'))
  ]);
  if(attempt!==this.statusReadSerial||epoch!==this.statusEpoch||!isCurrent()){if(strict)throw {code:'MESSAGE_CHANNEL_INTERRUPTED'};return null;}
  const available=saved.ok&&Array.isArray(saved.value?.topics),state=available?saved.value:{topics:[],pendingTopics:0,nextTopic:null,runtime:null};
  this.statusUnavailable=available?[]:['ai'];
  const controls=preferences.ok?preferences.value||{}:{};this.controls=controls;
  if(preferences.ok&&!this.preferencesLoaded&&!this.editor?.dirty()&&!this.aiEditor?.dirty()&&!isComposing(this.editor)&&!isComposing(this.aiEditor)){
   if(!this.sortPreferenceChosen&&['asc','desc'].includes(controls.readingSort))this.readingSort=controls.readingSort;
   if(!this.viewPreferenceChosen&&!this.pendingView&&['original','ai'].includes(controls.libraryView))this.view=controls.libraryView;
   this.preferencesLoaded=true;
  }
  this.aiState=this.id?state:{...state,topics:[]};this.aiTopics=new Map((this.id?state.topics:[]).map(t=>[t.topicId,t]));
  $('ai-presentation-toggle').checked=(this.pendingView||this.view)==='ai';$('ai-presentation-toggle').disabled=!!this.pendingView;$('thought-list').classList.toggle('ai-mode',this.view==='ai');
  if(!available&&reportFailure)this.onStatus('后台消息通道暂时中断；当前内容保留。','error');
  if(strict&&!available)throw {code:'MESSAGE_CHANNEL_INTERRUPTED'};return available?state:null;
 }
 async readContentRefresh(){if(this.mutating)return false;const serial=++this.serial,rootCueEpoch=this.rootCueEpoch||0;$('thought-home-tools').hidden=!!this.id;$('thought-collection').hidden=!!this.id;$('revision-history').hidden=!this.id;$('thought-document').hidden=!this.id;
  if(!this.id){
   this.ensureContinuousRoot();this.rootProviderKey=null;const query=$('thought-search').value.trim(),scope=this.homeCollectionScope(query);$('thought-source-scope').value='';if(query&&this.personalRoot)void this.loadRootSearchBase();
   if(!this.homeCollection||this.homeCollection.scope!==scope||this.homeCollection.query!==query)this.homeCollection=this.createHomeCollection(query);
   let state=this.homeCollection.state();if(!state.items.length&&!state.terminal)state=await this.homeCollection.loadUntil({minItems:this.homeDesiredCount||40,maxLoads:30});
   if(serial!==this.serial||rootCueEpoch!==(this.rootCueEpoch||0))return false;
   if(state.stale){this.clearHomeRows();const replacement=this.createHomeCollection(query);this.homeCollection=replacement;state=await replacement.loadUntil({minItems:this.homeDesiredCount||40,maxLoads:30});if(replacement!==this.homeCollection||serial!==this.serial||rootCueEpoch!==(this.rootCueEpoch||0))return false;}if(state.error){this.updateHomeContinuous(state);throw state.error;}
   const anchor=this.rootInvalidationAnchor;if(anchor?.key&&!this.homeCollection.items.slice(this.homeCollection.windowStart,this.homeCollection.windowStart+this.homeCollection.windowSize).some(item=>item.key===anchor.key))this.homeCollection.around(anchor.key);this.rootInvalidationAnchor=null;this.homeRestoring=false;
   return this.renderHomeReader(anchor);
  }
  $('ai-topic-tools').hidden=true;$('topic-source-scope-label').hidden=this.view==='ai';$('topic-source-scope').value=this.topicProviderKey||'';if(this.view==='original')void this.updateTopicSourceOptions(serial);for(const b of $('topic-time-order').querySelectorAll('[data-reading-start]'))b.disabled=!!this.topicProviderKey;$('topic-time-order').hidden=this.view==='ai';$('topic-search-count').textContent='';this.syncReadingControls();
  this.ensurePanes();const knownPresentation=this.view==='ai'&&this.aiTopics.get(this.id)?.presentation;this.originalPane.hidden=this.view==='ai'?!!knownPresentation:false;this.aiPane.hidden=this.view!=='ai';
  if(this.view==='ai'){
   const stateRead=this.updateViewStatus({strict:false,isCurrent:()=>serial===this.serial});
   const topic=this.topic||await request('GET_LIBRARY_TOPIC',{id:this.id});if(serial!==this.serial)return false;
   const state=await stateRead;if(serial!==this.serial)return false;if(!state)throw {code:'MESSAGE_CHANNEL_INTERRUPTED'};
   if(!$('topic-heading').children.length)$('topic-heading').append(element('h1','',topic.name));
   if(this.editor&&!await this.checkAllTracked(serial))return false;
   const cached=this.aiTopics.get(this.id)?.presentation;this.originalPane.hidden=!!cached;this.aiPane.hidden=false;$('topic-toolbar').hidden=false;$('create-entry').hidden=true;$('topic-continuous-before').hidden=true;$('topic-continuous-after').hidden=true;
   if(this.aiEditor){await this.aiEditor.refreshEvidence?.();if(serial!==this.serial)return false;}
   if(this.aiEditor&&cached&&(this.aiEditor.dirty()||this.aiEditor.saving||this.aiEditor.row.revision>=cached.revision)){this.filterAIReading();return true;}
   const signature=JSON.stringify(cached||this.aiTopics.get(this.id)?.userDraft||null);if(!cached&&this.aiSignature===signature){this.filterAIReading();return true;}
   this.aiEditor?.dispose();this.aiEditor=null;this.aiSignature=signature;this.aiPane.replaceChildren();
   if(!cached){const draft=this.aiTopics.get(this.id)?.userDraft;if(draft){const box=element('section','ai-user-draft');box.append(element('h2','','保留的人工整理'));for(const item of draft.fields)box.append(element('h3','',item.label),element('p','entry-prose',item.text));box.append(button('保留为独立内容',async()=>{await this.checked('RECOVER_AI_PRESENTATION_DRAFT',{options:{topicId:this.id,expectedRevision:draft.revision,operationId:op()}});await this.refresh();}));this.aiPane.append(box);}else this.aiPane.append(element('p','muted','AI 服务尚未上线。尚无已保存的 AI整理。'));this.renderSectionNav();return true;}
   this.aiEditor=new AIReadingEditor(this.aiPane,cached,id=>this.openStandalone(id),this.onStatus);const activeEditor=this.aiEditor;void activeEditor.ready.then(()=>{if(this.aiEditor===activeEditor&&!activeEditor.disposed)this.filterAIReading();}).catch(()=>{});this.filterAIReading();return true;
  }
  $('create-entry').hidden=false;$('topic-toolbar').hidden=false;
  const visible=this.topicAnchor(),navigationAnchor=this.topicNavigationAnchor,resetFromStart=this.topicResetFromStart,anchorId=resetFromStart?null:(navigationAnchor?.entryId||this.resumeAnchor?.entryId||visible?.id||null),sectionId=this.topicNavigationSection||null,restoreAnchor=resetFromStart?null:(navigationAnchor?.entryId?{id:navigationAnchor.entryId,top:navigationAnchor.top}:visible);this.topicResetFromStart=false;this.topicNavigationAnchor=null;this.topicNavigationSection=null;const timeEdge=this.topicTimeEdge||null;this.topicTimeEdge=null;
  if(!await this.checkAllTracked(serial)||serial!==this.serial)return false;
  const saved=!resetFromStart&&!sectionId&&!timeEdge?(this.topicReader?.snapshot(visible)||this.contentResume):null;this.contentResume=null;
  const state=await this.resetTopicReader({anchorId,sectionId,timeEdge,restoreAnchor,saved,expectedSerial:serial});if(serial!==this.serial||state.stale)return false;
  const query=$('topic-search').value.trim();$('topic-search-count').textContent=query||this.topicProviderKey?`${state.items.length}${state.terminalNext&&state.terminalPrevious?'':'+'} 条${query?'匹配':'当前来源'}内容`:'';
  if(this.editor&&this.document){for(const m of this.editor.metadata){const row=m.kind==='topic'?this.document.topic:this.document.sections.find(s=>s.sectionId===m.row.sectionId);if(row)m.receive(row);}this.editor.entry.receive(this.document.items.filter(x=>!x.entry.large).map(x=>x.entry));}
  return true;

 }
 async leaveEditors(){this.cancelTopicRestore();this.dialogOpenIntent=(this.dialogOpenIntent||0)+1;clearTimeout(this.positionTimer);stopMemoryRecomposition();this.serial++;this.statusEpoch++;this.statusReadSerial++;this.loadToken=null;this.readRetry.hidden=true;clearTimeout(this.refreshTimer);clearTimeout(this.updateTimer);clearTimeout(this.topicSearchTimer);clearTimeout(this.searchTimer);for(const key of ['aiEditor','dialogEditor','editor']){const active=this[key];if(!active)continue;active.collect?.();if(!await active.flush()&&active.dirty())return false;if(this[key]===active){active.dispose();this[key]=null;if(key==='dialogEditor')this.closeDialog();}}if(this.view==='ai')this.originalPane?.replaceChildren();else{this.aiPane?.replaceChildren();this.aiSignature=undefined;}for(const id of ['topic-body','topic-heading'])$(id).inert=true;if(this.desktopPresentation){this.desktopPresentation.dispose();this.desktopPresentation=null;}return true;}
 installOriginalTabs(){
  const tabs=element('div','topic-original-tabs');tabs.id='topic-original-tabs';tabs.setAttribute('role','group');tabs.setAttribute('aria-label','Topic reading view');
  for(const [mode,zh,english]of [['content','内容','Content'],['years','这些年','Through the years']]){const b=element('button','',document.documentElement.lang==='en'?english:zh);b.type='button';b.dataset.topicView=mode;b.addEventListener('click',()=>void this.switchOriginalMode(mode));tabs.append(b);}
  $('topic-reading-controls').before(tabs);
 }
 syncOriginalTabs(){const tabs=$('topic-original-tabs');if(!tabs)return;tabs.hidden=!this.id||this.view!=='original';for(const b of tabs.querySelectorAll('button')){b.setAttribute('aria-pressed',String(b.dataset.topicView===this.originalMode));b.textContent=document.documentElement.lang==='en'?(b.dataset.topicView==='years'?'Through the years':'Content'):(b.dataset.topicView==='years'?'这些年':'内容');}}
 rememberContent(){if(this.id&&this.view==='original'&&this.originalMode==='content'&&this.topicReader){this.contentPositions.save(this.id,{providerKey:this.topicProviderKey,sort:this.readingSort,snapshot:this.topicReader.snapshot(this.topicAnchor()),preSearch:this.contentPreSearch});}}
 restoreContent(id){const saved=this.contentPositions.get(id);if(saved?.providerKey===this.topicProviderKey&&saved.sort===this.readingSort){this.contentResume=saved.snapshot;this.contentPreSearch=saved.preSearch||null;}}
 rememberTimeline(){if(this.id&&this.view==='original'&&this.originalMode==='years'&&this.topicTimeline?.visible())this.timelinePositions.save(this.id,{...this.topicTimeline.snapshot(),mode:'years',providerKey:this.topicProviderKey,sort:this.readingSort});}
 invalidateTimeline(){this.contentResume=null;this.contentPreSearch=null;this.contentPositions?.rows.clear();this.timelinePositions?.invalidate();if(this.topicTimeline?.visible()){const saved=this.topicTimeline.invalidate();if(this.id)this.timelinePositions.save(this.id,{...saved,position:null,anchor:null,mode:'years',providerKey:this.topicProviderKey,sort:this.readingSort});}}
 async switchOriginalMode(mode){
  if(!this.id||this.view!=='original'||!['content','years'].includes(mode))return;
  const intent=this.presentationIntent=(this.presentationIntent||0)+1;if(mode===this.originalMode)return;
  const id=this.id;if([this.editor,this.aiEditor,this.dialogEditor].some(isComposing)||!await this.flushEditors()||id!==this.id||this.view!=='original'||intent!==this.presentationIntent)return;
  if(this.originalMode==='content')this.rememberContent();if(this.originalMode==='content')this.contentPosition={topicId:id,anchor:this.topicAnchor(),query:$('topic-search').value,scroll:scrollY};else this.rememberTimeline();
  this.editor?.dispose();this.editor=null;this.topicReader=null;this.document=null;this.originalPane?.replaceChildren();this.topicTimeline?.dispose();this.originalMode=mode;this.desktopPresentation?.sync();
  if(mode==='content'){this.restoreContent(id);const saved=this.contentPosition?.topicId===id?this.contentPosition:null;$('topic-search').value=saved?.query||'';if(saved?.anchor)this.topicNavigationAnchor={entryId:saved.anchor.id,top:saved.anchor.top};this.timelinePositions.save(id,{...(this.timelinePositions.get(id)||{}),mode:'content'});}
  else $('topic-search').value=this.timelinePositions.get(id)?.query||'';
  await this.refresh();if(intent!==this.presentationIntent||id!==this.id)return;this.syncOriginalTabs();$('topic-original-tabs').querySelector(`[data-topic-view="${mode}"]`)?.focus({preventScroll:true});
 }
 readKey(){return this.contentReadKey()+':'+(this.originalMode||'content');}
 async readYears(){
  const serial=++this.serial,id=this.id;this.document=null;this.ensurePanes();this.originalPane.hidden=true;this.aiPane.hidden=true;
  $('thought-home-tools').hidden=true;$('thought-collection').hidden=true;$('thought-document').hidden=false;$('revision-history').hidden=false;$('topic-toolbar').hidden=false;$('create-entry').hidden=false;
  $('topic-continuous-before').hidden=true;$('topic-continuous-after').hidden=true;$('topic-outline').hidden=true;$('topic-time-order').hidden=false;$('topic-source-scope-label').hidden=false;$('topic-search-count').textContent='';
  $('topic-source-scope').value=this.topicProviderKey||'';void this.updateTopicSourceOptions(serial);this.syncReadingControls();
  const topic=await request('GET_LIBRARY_TOPIC',{id});if(serial!==this.serial||id!==this.id)return false;this.topic=topic;$('topic-heading').replaceChildren(element('h1','',topic.name));
  let saved=this.topicTimeline?.visible()?this.topicTimeline.snapshot():this.timelinePositions.get(id);
  if(saved?.providerKey!==undefined&&saved.providerKey!==this.topicProviderKey||saved?.sort&&saved.sort!==this.readingSort)saved={...saved,position:null,anchor:null};
  if(!this.topicTimeline||!this.topicTimeline.host.isConnected){const host=element('div','topic-timeline');host.id='topic-timeline';$('topic-body').append(host);this.topicTimeline=new TopicTimeline({host,onStatus:this.onStatus,onQueryReset:()=>{$('topic-search').value='';$('topic-search-count').textContent='';}});}
  this.topicTimeline.host.hidden=false;await this.topicTimeline.open({topicId:id,providerKey:this.topicProviderKey,sort:this.readingSort,saved,query:$('topic-search').value.trim()});
  return serial===this.serial&&id===this.id;
 }
 async openSearchResult(item,path=item.paths?.[0]||item){if(path.topicId){const saved=this.timelinePositions.get(path.topicId)||{};this.timelinePositions.save(path.topicId,{...saved,mode:'content'});if(this.id===path.topicId&&this.originalMode==='years')await this.switchOriginalMode('content');}return this.openContentSearchResult(item,path);}
 async searchTopic(){if(this.id&&this.view==='original'&&this.originalMode==='years'&&this.topicTimeline){await this.topicTimeline.changeQuery($('topic-search').value.trim());return;}return this.searchContent();}
 rememberView(){this.rememberContent();if(this.id){const anchor=this.view==='original'?this.topicAnchor():null;this.aiViewSession.remember(this.id,this.view,{scroll:Math.max(0,scrollY||0),cursor:this.cursor,pages:this.pages,query:$('topic-search').value||'',anchor});}}
 ensureAITopicStatus(){let host=$('ai-topic-status');if(host)return host;host=element('section','ai-topic-status');host.id='ai-topic-status';host.setAttribute('role','status');host.setAttribute('aria-live','polite');host.hidden=true;const row=$('topic-heading')?.closest('.topic-title-row');if(row)row.after(host);else $('thought-document')?.prepend(host);return host;}
 renderAITopicStatus(state=null,selected=this.id?this.aiTopics.get(this.id):null){
  const host=this.ensureAITopicStatus();host.hidden=!this.id||this.view!=='ai';
  if(host.hidden){host.textContent='';delete host.dataset.state;return;}
  host.dataset.state='service-unavailable';
  host.textContent='AI 服务尚未上线。'+(this.statusUnavailable?.includes('ai')?'已保存内容状态暂时无法确认，请重试读取。':selected?.presentation?'已保存的整理仍可阅读、编辑和查看历史。':'已有内容保留，不会自动生成或覆盖。');
 }
 async switchView(view,{restoreFocus=null}={}){
  if(!['original','ai'].includes(view))return;const transition=this.presentationIntent=(this.presentationIntent||0)+1;if(!this.id){this.requestedTopicView=view;return;}if(this.viewSwitchPromise){await this.viewSwitchPromise;if(transition!==this.presentationIntent)return;return this.switchView(view,{restoreFocus});}if(view===this.view)return;
  const toggle=$('ai-presentation-toggle'),topicId=this.id,previous=this.view,shouldRestoreFocus=restoreFocus===null?document.activeElement===toggle:restoreFocus===true;this.rememberView();this.pendingView=view;toggle.checked=view==='ai';toggle.disabled=true;
  const change=(async()=>{if([this.editor,this.aiEditor,this.dialogEditor].some(isComposing)||!await this.flushEditors()||transition!==this.presentationIntent||topicId!==this.id)return;this.rememberTimeline();this.topicTimeline?.dispose();this.aiViewSession.setView(topicId,view);const target=this.aiViewSession.position(topicId,view),apply=async()=>{if(this.id!==topicId)return;this.clearActionFeedback();this.view=view;if(view==='original')this.restoreContent(topicId);this.cursor=target?.cursor??null;this.pages=target?.pages||[];$('topic-search').value=target?.query||'';if(view==='original'&&target?.anchor)this.topicNavigationAnchor={entryId:target.anchor.id,top:target.anchor.top};await this.refresh();if(this.id!==topicId)return;if(view==='original'&&target?.anchor)this.topicReader?.restoreAnchor(this.originalPane,target.anchor);else if(Number.isFinite(target?.scroll))scrollTo(0,target.scroll);};if(this.aiTopics.get(topicId)?.presentation)await recomposeMemory($('topic-body'),apply);else await apply();})();
  this.viewSwitchPromise=change;try{await change;}catch(error){this.aiViewSession.setView(topicId,previous);if(this.id===topicId){this.view=previous;await this.refresh().catch(()=>{});}throw error;}finally{this.viewSwitchPromise=null;this.pendingView=null;toggle.checked=this.view==='ai';toggle.disabled=false;if(shouldRestoreFocus&&this.id===topicId)toggle.focus({preventScroll:true});}
 }
 async updateViewStatus(options={}){const state=await this.readViewStatus(options),selected=this.id&&this.aiTopics.get(this.id);this.renderAITopicStatus(state,selected);if(this.id&&this.view==='ai'&&this.originalPane&&this.aiPane){this.originalPane.hidden=!!selected?.presentation;this.aiPane.hidden=false;}return state;}
 renderCandidate(row){
  if(!this.aiPane)return;
  renderAICandidateComparison(this.aiPane,{candidate:row?.candidate,current:row?.presentation,onEvidence:id=>this.openStandalone(id)});
 }
 async readRefresh(){
  this.syncOriginalTabs();if(this.id&&this.view==='original'&&this.originalMode==='years'){const result=await this.readYears();if(result&&this.desktopAppearance)this.enableDesktopPresentation();return result;}if(this.topicTimeline)this.topicTimeline.host.hidden=true;
  const token=this.loadToken,epoch=this.statusEpoch,topicId=this.id,result=await this.readContentRefresh();
  if(token!==this.loadToken||epoch!==this.statusEpoch||topicId!==this.id)return false;
  if(result!==true||!this.id||this.view!=='ai'){this.renderAITopicStatus(null,null);return result;}
  // Leaving disposes this composition; a successful AI reopen needs the same
  // existing controls restored just as Original and Years already do.
  if(this.desktopAppearance)this.enableDesktopPresentation();
  const row=this.aiTopics.get(this.id);if(!row?.presentation){this.originalPane.hidden=false;this.aiPane.hidden=false;}this.renderCandidate(row);return result;
 }
 async leave(){this.rememberTimeline();this.rememberView();const keepOriginal=this.view==='ai'&&this.aiPending&&!this.aiTopics.get(this.id)?.presentation;if(!keepOriginal){const ok=await this.leaveEditors();if(ok)this.topicTimeline?.dispose();return ok;}this.view='original';try{return await this.leaveEditors();}finally{this.view='ai';}}
 async open(id){
  this.rememberView();const currentAnchor=this.id&&this.view==='original'?this.topicAnchor():null;
  this.saveHomePosition(this.id||'home',{scroll:scrollY,cursor:this.cursor,pages:this.pages,query:this.id?$('topic-search').value:$('thought-search').value,sort:this.readingSort,providerKey:this.topicProviderKey,rootProviderKey:this.rootProviderKey,...(currentAnchor?{anchor:currentAnchor}:{}),...(!this.id&&this.homeCollection?{collection:this.homeCollection.snapshot(),rootAnchor:this.captureHomeAnchor()}: {})});
  const intent=this.openIntent=(this.openIntent||0)+1;if(!await this.leave()||intent!==this.openIntent)return;this.clearActionFeedback();
  const changed=this.id!==id;if(changed){if(!this.id){this.homeCollection?.releaseBodies();this.homePage=null;$('thought-list').replaceChildren();}this.topicTimeline?.dispose();this.topicTimeline=null;this.originalMode=this.timelinePositions.get(id)?.mode||'content';this.snapshotRoute=null;this.homeSignature=null;$('topic-body').replaceChildren();$('topic-heading').replaceChildren();this.originalPane=null;this.aiPane=null;this.aiSignature=undefined;this.document=null;this.topic=null;this.topicReader=null;const requested=this.requestedTopicView;this.requestedTopicView=null;this.view=id?(requested||this.aiViewSession.view(id)):'original';if(id&&requested)this.aiViewSession.setView(id,requested);}
  this.id=id;if(!id){this.aiTopics.clear();if(this.aiState)this.aiState={...this.aiState,topics:[]};}this.topicProviderKey=this.homePositions.get(id||'home')?.providerKey||null;$('ai-presentation-toggle').checked=this.view==='ai';$('ai-presentation-toggle').disabled=!!this.pendingView;$('thought-list').classList.toggle('ai-mode',this.view==='ai');this.onOpen();
  const session=id?this.aiViewSession.position(id,this.view):null,saved=this.homePositions.get(id||'home'),sessionAnchor=this.view==='original'?(session?.anchor||saved?.anchor||null):null,sameSessionResume=!!id&&this.view==='original'&&!!(session||saved)&&(!saved?.sort||saved.sort===this.readingSort),readPosition=()=>id&&this.view==='original'?request('THOUGHT_POSITION',{position:{topicId:id}}).catch(()=>null):Promise.resolve(null);
  if(id&&this.view==='original'&&!sameSessionResume){this.resumeAnchor=await readPosition();if(intent!==this.openIntent)return;if(this.resumeAnchor?.sort)this.readingSort=this.resumeAnchor.sort;}else this.resumeAnchor=null;if(!this.resumeAnchor&&saved?.sort)this.readingSort=saved.sort;
  $('topic-search').value=id?(session?.query??saved?.query??''):'';if(!id){this.rootProviderKey=saved?.rootProviderKey||null;if(saved){$('thought-search').value=saved.query||'';this.rootInvalidationAnchor=saved.rootAnchor||null;if(saved.collection){this.homeCollection=this.createHomeCollection(saved.query||'');this.homeCollection.restore(saved.collection,{scope:this.homeCollectionScope(saved.query||''),query:saved.query||''});this.homeDesiredCount=Math.max(40,saved.collection.items.length);this.homeRestoring=true;this.preserveHomeRefresh=true;this.rootInvalidationAnchor=saved.rootAnchor||null;}}}this.cursor=id?(session?.cursor??saved?.cursor??null):null;this.pages=session?.pages||saved?.pages||[];this.history=null;if(sessionAnchor)this.topicNavigationAnchor={entryId:sessionAnchor.id,top:sessionAnchor.top};
  if(id&&this.view==='original')this.restoreContent(id);const restoreInputEpoch=this.topicRestoreInputEpoch||0;await this.refresh();if(intent!==this.openIntent)return;this.onOpen();
  if((this.topicRestoreInputEpoch||0)===restoreInputEpoch){if(!(this.view==='original'&&sessionAnchor))scrollTo(0,session?.scroll??saved?.scroll??0);else this.topicReader?.restoreAnchor(this.originalPane,sessionAnchor);}
  if(id&&this.view==='original'&&sameSessionResume){void readPosition().then(async anchor=>{if(intent!==this.openIntent||this.id!==id||this.view!=='original')return;if(anchor?.sort&&anchor.sort!==this.readingSort){this.readingSort=anchor.sort;this.cursor=null;this.pages=[];this.resumeAnchor=anchor;this.topicNavigationAnchor=sessionAnchor?{entryId:sessionAnchor.id,top:sessionAnchor.top}:null;await this.refresh();if(intent!==this.openIntent||this.id!==id||this.view!=='original')return;}if(!sessionAnchor)await this.restorePosition(anchor);this.resumeAnchor=null;if(intent===this.openIntent&&this.id===id&&this.view==='original')this.schedulePosition();});}
  else if(id&&this.view==='original'&&this.resumeAnchor){await this.restorePosition(this.resumeAnchor);this.resumeAnchor=null;this.schedulePosition();}
  if(intent===this.openIntent)return intent;
 }
}

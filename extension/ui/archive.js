import {ContextCardsPage} from './context-cards.js';
import './archive-icons.js';
import {InputRecoveryPresentation,recoveredInputInvalidated} from './input-recovery-presentation.js';
import {setIconLabel,setIconOnly} from './icons.js';
import {closeDesktopAppearancePreview} from './desktop-appearance-preview.js';
import {ScopeSearch} from './components/scope-search.js';
import {DocumentSearchSessions} from './document-search-sessions.js';
import {appendWorkingRevision} from './working-history.js';
import {safeOffset} from '../core/reader-state.js';
import {OriginalSurface} from './original-surface.js';
import {ReadingModalHost} from './reading-modal.js';
import {readDocumentSearchWindow,resetDocumentSearchPage} from './document-search-page.js';
import {refreshCaptureTimes,readerTimestamp} from './capture-time-view.js';
import {captureHealthText} from './common.js';
import {presentSettingsStatus} from './settings-preferences.js';
import {thoughtCopy as tc} from './thought-copy.js';
import {TopicActions} from './topic-actions.js';
import {ReaderExperience,confirmReaderAction,readerCopy} from './reader-experience.js';
import {selectionMatchesBody} from './reader-selection.js';
import {AppShellController} from './app-shell.js';
import {ArchiveNavigator,navigatorInvalidationMessage} from './archive-navigator.js';
import {revisitPage} from './revisit.js';
import {copyReadingText} from './reading-actions.js';
import {MemoryPanel} from './memory.js';
import {beginLoading,setProductState,showLocalFailure,productAction} from './product-state.js';
import {wireScopeSearchKeyboard,highlightReading,revealSearchResult} from './search-experience.js';
import {IntegrityPanel} from './integrity.js';
import {installSaveLifecycle} from './session-lifecycle.js';
import {pruneRecoveryDrafts} from './recovery-draft.js';
import {InputReview} from './review.js';
import {findInputPage} from './input-search.js';
import {OnboardingUI} from './onboarding.js';
import {BackupPanel} from './backup.js';
import {SmartFilterUI} from './smart-filter.js';
import {TopicController as ThoughtWorkspace} from './topic-workspace.js';
import {initHistoryCompletion} from './history-completion.js';
import {DocumentEditor} from './library.js';
import {workspaceDocuments,archiveRows} from '../core/workspace.js';
import {documentBlocks} from '../core/library.js';
import {request,element,dateLabel,enabledLabel,diagnosticText,sizeLabel,statusLabel} from './common.js';
import {recoveryGuidance} from './recovery-guidance.js';
document.getElementById('app-version').textContent='v'+chrome.runtime.getManifest().version;
const $=id=>document.getElementById(id);
const readingModals=new ReadingModalHost([$('info-dialog'),$('revision-dialog')],{clear:dialog=>$(dialog.id==='info-dialog'?'info-content':'revision-list').replaceChildren()});
const originals=new OriginalSurface({dialog:$('info-dialog'),content:$('info-content'),host:readingModals,read:page=>request('PAIA_ARCHIVE_ORIGINAL_PAGE',{page})});
const names={revisit:'回来看看',library:'Input Archive',thoughts:'Thought Library',archive:'Source Records',memory:'AI Context',settings:'Settings',excluded:'待确认与已移除输入',legacy:'Legacy Data Migration'};
const review=new InputReview({navigate:(...args)=>navigate(...args),refresh:()=>refresh()});
const backupPanel=new BackupPanel();
void pruneRecoveryDrafts().catch(()=>{});
const integrityPanel=new IntegrityPanel();
const onboarding=new OnboardingUI({refresh:()=>refresh(),history:()=>historyPanel.open()});
let returnTo=null,sourceFocusId=null,navigatorDetailFocus=null,saveFeedbackTimer=null,noticeTimer=null,noticeRemaining=0,noticeStarted=0;const routeStates=new Map();
const READER_PAGE_LIMIT=40;
let state,view='library',documentId=null,query='',searchProject=null,editor=null,serial=0,menuId=null,readingInvoker=null,infoIds=[];let showFilteredCurrent=false;let partHistory=null;const documentHistories=new Map();let readerStream=null;let inputSortSnapshot=null;let readingSnapshot=null,contextInputId=null;
const smartFilter=new SmartFilterUI({onError:error,onContext:(doc,id,searchArrival)=>navigate('library',doc,id,{searchArrival})});
const thoughts=new ThoughtWorkspace({onStatus:status,onSettings:()=>navigate('settings'),onOpen:()=>{render();routes.commit();},onInput:async id=>{const b=await request('GET_INPUT',{id});await navigate('library',b.documentId,id);}});
const contextCards=new ContextCardsPage({host:$('memory-panel'),onNavigate:card=>navigate('memory',null,null,{contextCard:card})});
const memory=new MemoryPanel({contextDisabled:true,onHome:()=>navigate('thoughts'),onMemory:()=>navigate('memory'),onThought:async(topicId,entryId)=>{await navigate('thoughts');if(thoughts.view==='ai')await thoughts.switchView('original');await thoughts.open(topicId);if(entryId)await thoughts.focusEntry(entryId);},onInput:async inputId=>{const b=await request('GET_INPUT',{id:inputId});await navigate('library',b.documentId,inputId);}});
let shellRouteReady=false,navigationInFlight=0;
const reader=new ReaderExperience({read:()=>({view,documentId,editor,state}),notify,menu:(...args)=>openMenu(...args),reload:()=>refresh()});
const inputRecovery=new InputRecoveryPresentation({host:document.querySelector('.workspace'),compare:$('reload-document'),read:()=>({view,documentId,editor,state})});
const archiveNavigator=new ArchiveNavigator({onOpenWindow:id=>navigate(view,id),onSourceDetail:(subject,trigger)=>showNavigatorSourceDetail(subject,trigger),onProjectSearch:async(projectRef,title)=>{if(view!=='library'||documentId){const opened=await navigate('library');if(!opened)return;}searchProject={ref:projectRef,title};archiveNavigator.sourceScope=projectRef.providerKey;archiveNavigator.sourceSelect.value=projectRef.providerKey;archiveNavigator.lastPaintSignature=null;archiveNavigator.paint();pageCursor=null;pageHistory=[];updateSearchProjectScope();scopeSearch.input.focus();void refresh();},onStatus:text=>status(text),onScopeChange:()=>{searchProject=null;updateSearchProjectScope();pageCursor=null;pageHistory=[];void refresh();},onRouteChange:()=>{if(shellRouteReady&&!navigationInFlight&&view===archiveNavigator.view&&documentId===archiveNavigator.selectedDocumentId)routes.commit({replace:true});}});
function updateSearchProjectScope(){const chip=$('search-project-scope');chip.hidden=!searchProject||view!=='library';if(searchProject)chip.textContent='Project：'+searchProject.title+' · 清除范围';}
$('search-project-scope').addEventListener('click',()=>{searchProject=null;updateSearchProjectScope();pageCursor=null;pageHistory=[];void refresh();});
const topicActions=new TopicActions({flush:async()=>{if(view==='thoughts')return thoughts.flushEditors();editor?.collect();return editor?editor.flush():true;},notify,onThought:id=>thoughts.openStandalone(id),onTopic:id=>thoughts.open(id)});thoughts.actions=topicActions;thoughts.desktopAppearance=true;

topicActions.onAdded=(topicId)=>{$('notice').append(Object.assign(element('button','',tc('查看')),{onclick:async()=>{await navigate('thoughts');await thoughts.open(topicId);}}));};
topicActions.onCreated=id=>{$('notice').append(Object.assign(element('button','',tc('查看')),{onclick:async()=>{await navigate('thoughts');await thoughts.openStandalone(id);}}));};
async function selectedInputOwner(id,selection){
 const owner=editor;owner?.collect();if(!owner)return null;
 const before=owner.entries.get(id);if(!before||selection&&!selectionMatchesBody(selection,owner.text(before))){notify('文字刚有变化，请重新选择。');return null;}
 if(!await owner.flush()||owner!==editor)return null;
 const entry=owner.entries.get(id);if(!entry||selection&&!selectionMatchesBody(selection,owner.text(entry))){notify('文字刚有变化，请重新选择。');return null;}
 return {entry,body:owner.text(entry)};
}
async function addInputToTopic(id,selection){const current=await selectedInputOwner(id,selection);if(!current)return;const span=selection?.input?.span;await topicActions.add({kind:'input',id,expectedRevision:current.entry.revision,...(span?{span}:{})},selection?selection.text:current.body);}
const addSelected=element('button','',tc('加入主题'));addSelected.dataset.singleInput='true';addSelected.addEventListener('pointerdown',e=>e.preventDefault());addSelected.onclick=()=>{const selection=reader.selected;if(selection?.input)void addInputToTopic(selection.input.id,selection);};reader.toolbar.append(addSelected);
const selectMore=element('button','',readerCopy('更多','More'));selectMore.dataset.singleInput='true';selectMore.addEventListener('pointerdown',e=>e.preventDefault());selectMore.addEventListener('click',()=>{const selection=reader.selected;if(!selection?.input)return;const rect=selection.range.getBoundingClientRect();reader.dismissSelection({restore:false});openMenu(selection.input.id,rect.left,rect.bottom);});reader.toolbar.append(selectMore);
document.addEventListener('paia:open-thought',async e=>{const {topicId,entryId,aiField}=e.detail||{};await navigate('thoughts',null,null,{topicId:topicId||null});if(aiField&&thoughts.view!=='ai')await thoughts.switchView('ai');if(entryId){if(topicId)await thoughts.focusEntry(entryId);else await thoughts.openStandalone(entryId);}});
const scopeSearch=new ScopeSearch({host:$('scope-search-host'),onInput:()=>void onArchiveSearchInput()});
const readerScopeSearch=new ScopeSearch({host:$('reader-scope-search-host'),id:'reader-scope-search',onInput:()=>onReaderSearchInput()});
let archiveSearchIntent=0;
function onArchiveSearchInput() {
 const intent=++archiveSearchIntent,nextQuery=scopeSearch.input.value;
 if(documentId){
  clearTimeout(inputSearchTimer);const expectedDocument=documentId,expectedView=view;
  inputSearchTimer=setTimeout(async()=>{if(intent!==archiveSearchIntent||documentId!==expectedDocument||view!==expectedView)return;const opened=await navigate(expectedView,null,null,{searchQuery:nextQuery,resetArchiveSearch:true});if(intent===archiveSearchIntent&&!opened)scopeSearch.input.value=query;},120);
  return;
 }
 serial++;query=nextQuery;for(const id of ['search-date-start','search-date-end']){if(!query.trim())$(id).value='';$(id).disabled=!query.trim();}pageCursor=null;pageHistory=[];routes.commit({replace:true});clearTimeout(inputSearchTimer);if(!query.trim()){void refresh();return;}inputSearchTimer=setTimeout(()=>void refresh(),120);
}
function onReaderSearchInput() {if(view!=='library'||!documentId)return;const current=documentSearchState();if(!current.query.trim()&&readerScopeSearch.input.value.trim())current.savedAnchor=reader.capture();current.query=readerScopeSearch.input.value;routes.commit({replace:true});resetDocumentSearchPage(current);current.stale=false;++documentSearchIntent;clearTimeout(documentSearchTimer);renderDocumentSearch();if(current.query.trim())documentSearchTimer=setTimeout(()=>void runDocumentSearch({reset:true}),180);}
function presentScopeSearch(){
 const active=state?.settings?.consentVersion===1,readerScope=active&&view==='library'&&!!documentId,archiveScope=active&&['library','archive','excluded'].includes(view);
 const archiveHint=view==='excluded'?readerCopy('搜索已移除内容','Search removed Inputs'):view==='library'&&searchProject?readerCopy('搜索此项目档案','Search this Project archive'):['library','archive'].includes(view)&&archiveNavigator.sourceScope?readerCopy('搜索此来源档案','Search this Source archive'):readerCopy('搜索全部档案','Search all archives');
 scopeSearch.present({scope:archiveScope?'archive':null,owner:view,label:archiveHint,query,placeholder:archiveHint});
 readerScopeSearch.present({scope:readerScope?'reader':null,owner:documentId,label:readerCopy('在当前聊天窗口中查找','Find in this conversation'),query:readerScope?documentSearchState().query:'',placeholder:readerCopy('在此对话中查找','Find in this conversation')});
}
const appShell=new AppShellController();
archiveNavigator.beforeLayout=()=>appShell.presentArchiveComposition();
const routes=appShell.connect({navigate:(...args)=>navigate(...args),current:()=>({view,documentId,topicId:view==='thoughts'?thoughts.id:null,contextCard:view==='memory'?contextCards.card:null,contextInputId,returnTo,sourcePath:archiveNavigator.state.selectedPath,sourceScope:archiveNavigator.sourceScope,searchQuery:view==='library'&&documentId?documentSearchState().query:query,sort:inputSortSnapshot,anchor:reader.capture()}),captureNavigator:()=>archiveNavigator.navigationSnapshot(),restoreNavigator:snapshot=>archiveNavigator.restoreNavigation(snapshot)});
const positions=new Map(),queries=new Map();
const documentSearchStates=new DocumentSearchSessions();let documentSearchIntent=0,documentSearchTimer=null;
function documentSearchState(id=documentId){return documentSearchStates.get(id);}
async function openDocumentSearchItem(current,item){
 const id=documentId,searchQuery=current.query,inputId=item?.id;if(!id||!inputId)return;
 current.activeInputId=inputId;const opened=await navigate('library',id,inputId);
 if(opened&&documentId===id){const restored=documentSearchState(id);restored.query=searchQuery;readerScopeSearch.input.value=searchQuery;renderDocumentSearch();revealSearchResult(inputId,searchQuery);}
}
function renderDocumentSearch(){
 const tools=$('document-search-tools'),input=readerScopeSearch.input,close=$('document-search-close'),results=$('document-search-results'),statusNode=$('document-search-status'),retrySearch=$('document-search-retry'),paging=$('document-search-pagination'),steps=$('document-search-steps'),previousMatch=$('document-search-match-previous'),nextMatch=$('document-search-match-next'),previousSearch=$('document-search-previous'),nextSearch=$('document-search-next'),active=view==='library'&&!!documentId;
 tools.hidden=!active;if(!active){retrySearch.hidden=true;highlightReading($('document-body'),'');return;}
 const current=documentSearchState();input.placeholder=readerCopy('在此对话中查找','Find in this conversation');input.setAttribute('aria-label',readerCopy('在当前聊天窗口中查找','Find in this conversation'));tools.setAttribute('aria-label',readerCopy('当前聊天窗口搜索','Current conversation search'));
 if(document.activeElement!==input&&input.value!==current.query)input.value=current.query;
 results.replaceChildren();const needle=current.query.trim();close.hidden=!needle;
 if(!needle){tools.hidden=true;results.hidden=true;paging.hidden=true;steps.hidden=true;retrySearch.hidden=true;statusNode.textContent='';highlightReading($('document-body'),'');return;}
 results.hidden=false;
 retrySearch.hidden=!current.error&&!current.unsaved;
 for(const item of current.items){const hit=element('button','document-search-hit');hit.type='button';hit.dataset.inputId=item.id;hit.setAttribute('aria-current',String(current.activeInputId===item.id));hit.append(element('strong','',item.title||readerCopy('当前聊天窗口','Current conversation')),element('p','',item.snippet||''),element('small','',item.sourceSentAt?day(item.sourceSentAt):tc('发送时间未知')));hit.addEventListener('click',()=>void openDocumentSearchItem(current,item).catch(()=>showLocalFailure()));results.append(hit);}
 previousSearch.hidden=!current.history.length;nextSearch.hidden=!current.nextCursor;paging.hidden=!current.history.length&&!current.nextCursor;
 const activeIndex=current.items.findIndex(item=>item.id===current.activeInputId);steps.hidden=!current.items.length;previousMatch.disabled=current.loading||!current.items.length||activeIndex<=0&&!current.history.length;nextMatch.disabled=current.loading||!current.items.length||activeIndex>=current.items.length-1&&!current.nextCursor;
 if(current.loading||current.stale)statusNode.textContent=readerCopy('正在当前聊天窗口中查找…','Searching this conversation…');
 else if(current.unsaved)statusNode.textContent=readerCopy('请先完成并保存当前输入修改，再查找。文字仍保留在这里。','Finish and save the current Input edit before searching. Your text remains here.');
  else if(current.error)statusNode.textContent=readerCopy(recoveryGuidance('INDEX_UNAVAILABLE').detail,'Search is temporarily unavailable. Your saved conversation remains readable; retrying will not delete or rebuild your archive.');
 else if(current.indexing)statusNode.textContent=readerCopy('搜索索引尚未完整；当前结果可能不全，请稍后重试。','Search indexing is incomplete; results may be partial. Retry shortly.');
 else if(!current.items.length)statusNode.textContent=readerCopy('当前聊天窗口没有匹配输入。','No matching input in this conversation.');
 else statusNode.textContent=readerCopy(`本页 ${current.items.length} 条匹配输入${current.nextCursor?' · 还有更多':''}${activeIndex>=0?` · 已定位 ${activeIndex+1}/${current.items.length}`:''}`,`${current.items.length} matching inputs on this page${current.nextCursor?' · more available':''}${activeIndex>=0?` · at ${activeIndex+1}/${current.items.length}`:''}`);
 highlightReading($('document-body'),current.query);
}
function invalidateDocumentSearch(){
 ++documentSearchIntent;clearTimeout(documentSearchTimer);documentSearchTimer=null;
 documentSearchStates.invalidate();
 if(view==='library'&&documentId){renderDocumentSearch();scheduleDocumentSearch();}else{$('document-search-results').replaceChildren();$('document-search-status').textContent='';$('document-search-tools').hidden=true;}
}
function scheduleDocumentSearch(){
 const current=documentSearchState();if(view!=='library'||!documentId||!current.stale||!current.query.trim()||documentSearchTimer!==null)return;
 documentSearchTimer=setTimeout(()=>{documentSearchTimer=null;void runDocumentSearch();},180);
}
async function runDocumentSearch({reset=false}={}){
 if(view!=='library'||!documentId)return;
 clearTimeout(documentSearchTimer);documentSearchTimer=null;
 const id=documentId,input=readerScopeSearch.input,current=documentSearchState(id),nextQuery=input.value.trim();
 if(current.query!==nextQuery){current.query=nextQuery;reset=true;}
 if(reset)resetDocumentSearchPage(current);
 current.error=false;current.unsaved=false;current.stale=false;
 if(!nextQuery){++documentSearchIntent;current.loading=false;renderDocumentSearch();return;}
 const intent=++documentSearchIntent,isCurrent=()=>intent===documentSearchIntent&&id===documentId&&view==='library';
 current.loading=true;renderDocumentSearch();
 try{
  const active=editor;if(active){active.collect();if(!await active.flush()){if(isCurrent()){current.items=[];current.nextCursor=null;current.unsaved=true;}return;}}
  if(!isCurrent())return;
  const result=await readDocumentSearchWindow({cursor:current.cursor,generation:current.generation,history:[...current.history],isCurrent,onRestart:()=>{resetDocumentSearchPage(current,{keepActive:true});current.loading=true;renderDocumentSearch();},read:cursor=>request('SEARCH_INPUTS',{options:{universal:true,paged:true,query:nextQuery,mode:'current',documentId:id,topicId:null,source:'',dateFrom:'',to:'',types:['input'],includeRemoved:false,includeFiltered:showFilteredCurrent,cursor,limit:40}})});
  if(!result||!isCurrent())return;const {page}=result;
  current.cursor=result.cursor;current.history=result.history;current.items=page.items||[];current.nextCursor=page.nextCursor??null;current.generation=page.generation;
  current.complete=page.complete===true;current.indexing=page.indexing===true;
 }catch{if(!isCurrent())return;resetDocumentSearchPage(current,{keepActive:true});current.error=true;}
 finally{if(isCurrent()){current.loading=false;renderDocumentSearch();}}
}
$('document-search-retry').addEventListener('click',()=>{void runDocumentSearch();});
async function stepDocumentSearch(direction){
 const current=documentSearchState(),at=current.items.findIndex(item=>item.id===current.activeInputId);if(current.loading||!current.items.length)return;
 let index=direction==='next'?at+1:at-1;
 if(index<0&&current.history.length){current.cursor=current.history.pop()??null;current.activeInputId=null;await runDocumentSearch();index=current.items.length-1;}
 else if(index>=current.items.length&&current.nextCursor){current.history.push(current.cursor);current.cursor=current.nextCursor;current.activeInputId=null;await runDocumentSearch();index=0;}
 if(current.error||index<0||index>=current.items.length)return;
 await openDocumentSearchItem(current,current.items[index]);
}
$('document-search-match-previous').addEventListener('click',()=>void stepDocumentSearch('previous').catch(()=>showLocalFailure()));
$('document-search-match-next').addEventListener('click',()=>void stepDocumentSearch('next').catch(()=>showLocalFailure()));
$('document-search-close').addEventListener('click',()=>void (async()=>{
 const id=documentId,current=documentSearchState(),anchor=current.savedAnchor;current.savedAnchor=null;current.query='';current.items=[];current.activeInputId=null;current.cursor=null;current.history=[];current.nextCursor=null;readerScopeSearch.input.value='';++documentSearchIntent;renderDocumentSearch();routes.commit({replace:true});
 if(anchor&&id===documentId)await navigate('library',id,anchor.inputId,{anchor});
})().catch(()=>showLocalFailure()));
let pageCursor=null,pageHistory=[];const pager=element('nav','pagination');const previous=element('button','','上一部分'),next=element('button','','下一部分');pager.append(previous,next);$('document-panel').after(pager);previous.addEventListener('click',async()=>{if(!await leave(true))return;pageCursor=pageHistory.pop()??null;await refresh();});next.addEventListener('click',async()=>{if(!state.nextCursor||!await leave(true))return;pageHistory.push(pageCursor);pageCursor=state.nextCursor;await refresh();});
const recovery=element('button','','从迁移安全备份重试');recovery.id='recover-migration';recovery.hidden=true;$('error').after(recovery);recovery.addEventListener('click',async()=>{recovery.disabled=true;await command('RECOVER_MIGRATION');recovery.disabled=false;});
const migrationSummary=element('p');migrationSummary.id='migration-summary';migrationSummary.hidden=true;$('settings-panel').append(migrationSummary);
const day=t=>t?new Date(t).toLocaleDateString('zh-CN',{year:'numeric',month:'long',day:'numeric'}):tc('发送时间未知');
const time=t=>t?new Date(t).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit',...(state.preferences.timeDisplay==='date_and_seconds'?{second:'2-digit'}:{}),hour12:false}):'时间未知';
const inputStamp=t=>readerTimestamp(t,{day,time,unknown:tc('发送时间未知')});
function error(message){setProductState($('error'),'failed');$('error').textContent=message;$('error').hidden=false;}
function status(text,kind){clearTimeout(saveFeedbackTimer);if(kind==='boundary'){notify(text);return;}if(view==='thoughts'&&!kind)text='';setProductState($('save-status'),kind?'failed':text.includes('正在保存')?'saving':text.includes('已保存')?'saved':'ready');if(editor?.saving&&!kind)queueMicrotask(()=>void refresh());$('save-status').textContent=text;$('retry').hidden=!['error','unknown'].includes(kind);$('retry').textContent=kind==='unknown'?readerCopy('核对保存结果','Check save result'):readerCopy('重试保存','Retry save');$('reload-document').hidden=!['conflict','removed'].includes(kind);if(kind==='conflict'&&['library','thoughts'].includes(view))$('reload-document').textContent=readerCopy('查看两份文字','Compare both versions');if(kind)error(text);else $('error').hidden=true;if(!kind&&text.includes('已保存'))saveFeedbackTimer=setTimeout(()=>{if($('save-status').textContent===text)$('save-status').textContent='';},1500);inputRecovery.sync();}
function pauseNotice(){if(noticeTimer!==null){clearTimeout(noticeTimer);noticeTimer=null;noticeRemaining=Math.max(0,noticeRemaining-(performance.now()-noticeStarted));}}
function resumeNotice(){const notice=$('notice');if(notice.hidden||notice.matches(':hover')||notice.contains(document.activeElement)||noticeTimer!==null)return;noticeStarted=performance.now();noticeTimer=setTimeout(()=>{noticeTimer=null;notice.hidden=true;},noticeRemaining);}
function notify(text){pauseNotice();$('notice').textContent=text;$('notice').hidden=!text;noticeRemaining=6000;if(text)resumeNotice();}
$('notice').addEventListener('pointerenter',pauseNotice);$('notice').addEventListener('focusin',pauseNotice);$('notice').addEventListener('pointerleave',resumeNotice);$('notice').addEventListener('focusout',()=>queueMicrotask(resumeNotice));
async function command(type,payload={}){try{const result=await request(type,payload);await refresh();if(!result?.conflict)notify('更改已保存到本机。');return result;}catch{error('这次操作未能完成。请重试；尚未保存的修改会留在当前页面。');return null;}}
function counts(){for(const page of $('document-body').querySelectorAll(':scope > .reader-page')){let heading=null,visible=false;for(const row of page.children){if(row.matches('h3')){if(heading)heading.hidden=!visible;heading=row;visible=false;}else if(!row.hidden)visible=true;}if(heading)heading.hidden=!visible;}inputRecovery.sync();}
async function leave(preserve=false){if(!topicActions.leave())return false;if(view==='memory'&&!await contextCards.leave())return false;serial++;if(view==='thoughts'&&!await thoughts.leave())return false;if(!preserve)partHistory=null;const active=editor;if(active){active.collect();if(!await active.flush())return false;if(editor===active){reader.unmount();positions.set(view+documentId,window.scrollY);if(preserve)partHistory=active.exportHistory();else{const history=active.exportHistory();documentHistories.delete(active.id);documentHistories.set(active.id,history);if(documentHistories.size>5)documentHistories.delete(documentHistories.keys().next().value);}active.dispose();editor=null;readerStream=null;$('document-page').inert=true;}}routeStates.set(view+':'+(view==='memory'?contextCards.card||'home':documentId||''),{query,cursor:pageCursor,pages:[...pageHistory],scroll:window.scrollY});return true;}
let navigationIntent=0,inputSearchInProgress=false,releaseStartupNavigation;
const startupNavigation=new Promise(resolve=>{releaseStartupNavigation=resolve;});
async function navigate(next,id=null,contextId=null,options={}){if(!options.keepAppearancePreview&&!closeDesktopAppearancePreview())return false;let intent=null;navigationInFlight++;try{if(!options.restore)await startupNavigation;
 intent=++navigationIntent;scopeSearch.input.disabled=true;readerScopeSearch.input.disabled=true;++documentSearchIntent;clearTimeout(documentSearchTimer);documentSearchTimer=null;for(const current of documentSearchStates.values())if(current.loading){current.loading=false;current.stale=true;}clearTimeout(inputSearchTimer);const origin=view;
 if(!await leave()||intent!==navigationIntent)return false;
 documentSearchStates.park();$('document-search-results').replaceChildren();$('document-search-status').textContent='';$('document-search-tools').hidden=true;readingModals.close();
 if(origin==='revisit')await revisitPage.leave({toReader:!!id||next==='thoughts'});
 else if(returnTo==='revisit'&&next!=='revisit'&&!id)await revisitPage.leave();
 if(intent!==navigationIntent)return false;
 // Primary Archive is a fresh entry; Back/history keep the existing session.
 // Commit this reset only after the shared leave/save/IME boundary accepts.
 if(next==='library'&&!id&&options.freshArchiveEntry===true){
  options={...options,searchQuery:'',resetArchiveSearch:true};
  searchProject=null;archiveNavigator.sourceScope=null;archiveNavigator.sourceSelect.value='';
  archiveNavigator.state.select(null);archiveNavigator.lastPaintSignature=null;
  for(const field of ['search-date-start','search-date-end'])$(field).value='';
 }
 inputSortSnapshot=null;readingSnapshot=null;let pendingAnchor=options.anchor||null;
 if(next==='library'&&id&&!options.resetReadingPosition&&(!contextId||options.history||options.restore)&&!pendingAnchor){try{pendingAnchor=await request('PAIA_READER_RESOLVE',{documentId:id});}catch{notify('继续位置暂时无法读取，档案仍可打开。');}}
 if(intent!==navigationIntent)return false;contextInputId=pendingAnchor?.inputId||contextId||null;if(options.sort==='asc'||options.sort==='desc')inputSortSnapshot=options.sort;else if(pendingAnchor)inputSortSnapshot=pendingAnchor.sort;
 queries.set(view,query);if(next==='library'&&!id&&options.freshArchiveEntry===true)queries.set('library','');if(next==='excluded'&&view!=='excluded'){review.enter(view);$('review-result').hidden=true;}
 if(view!==next){thoughts.clearActionFeedback();}
 if(view==='memory'&&next!=='memory')closeContextDesignView();
 showFilteredCurrent=next==='library'&&id?(typeof options.showFiltered==='boolean'?options.showFiltered:next===view&&id===documentId&&showFilteredCurrent):false;
 returnTo=options.returnTo||(id&&origin==='revisit'?'revisit':id?origin:null);view=next;documentId=id;menuId=null;if(next==='memory')contextCards.card=options.contextCard||null;
 if(!id&&['library','archive'].includes(next)){$('document-title').textContent='';$('document-subtitle').textContent='';$('document-body').replaceChildren();}
 if(next==='library'&&id&&options.searchQuery!==undefined){const search=documentSearchState(id);if(search.query!==options.searchQuery){search.query=options.searchQuery;resetDocumentSearchPage(search);search.stale=!!search.query.trim();}}
 const saved=routeStates.get(next+':'+(next==='memory'?contextCards.card||'home':id||'')),freshArchiveSearch=!id&&options.resetArchiveSearch===true;pageCursor=!id&&!freshArchiveSearch?saved?.cursor??null:null;pageHistory=!id&&!freshArchiveSearch?saved?.pages||[]:[];query=id?queries.get(view)??'':options.searchQuery??saved?.query??queries.get(view)??'';if(!documentId)scopeSearch.input.value=query;for(const id of ['search-date-start','search-date-end'])$(id).disabled=!query.trim();
 notify('');$('context-menu').hidden=true;const loaded=beginLoading(document.querySelector('.workspace'),'正在读取本机内容…');try{const openedThought=view==='thoughts'&&options.topicId!==undefined;if(openedThought)await thoughts.open(options.topicId);if(!openedThought)await refresh();if(view==='revisit')await revisitPage.show();}finally{loaded();}
 if(intent!==navigationIntent)return false;
 if(id&&contextInputId){const field=[...$('document-body').querySelectorAll('[data-edit-id]')].find(el=>el.dataset.editId===contextInputId);if(field){reader.expand(field);field.scrollIntoView({block:'center'});}}
 else window.scrollTo(0,next==='library'&&!id&&options.freshArchiveEntry===true?0:saved?.scroll||0);
 if(pendingAnchor)await reader.restore(pendingAnchor);if(intent!==navigationIntent)return false;if(options.searchQuery!==undefined)highlightReading($('document-body'),options.searchQuery);reader.schedule();routes.commit();
 if(next==='library'&&id&&contextId&&options.searchArrival){
  const arrival=options.searchArrival,current=()=>intent===navigationIntent&&view==='library'&&documentId===id;
  revealSearchResult(contextId,arrival.query,{isCurrent:current,onMissingMatch:()=>{if(current()&&arrival.bodyMatched)notify(readerCopy('匹配已变化，已定位到当前输入。','The match has changed. Showing the current Input.'));}});
 }
 return true;
 }finally{navigationInFlight--;if(intent===navigationIntent){if(view==='memory')contextCards.finishNavigation();scopeSearch.input.disabled=false;readerScopeSearch.input.disabled=false;}}
}
function showCollection(){if(state.searchResults){smartFilter.renderResults(state.searchResults,query);return;}$('empty-list').textContent=view==='library'?'还没有捕获到输入。打开普通 ChatGPT 聊天，或补全历史输入。':view==='excluded'?'没有需要确认或恢复的输入。':'还没有保存原始来源。';const docs=state.documents||[],list=$('document-list'),signature=JSON.stringify([view,docs.map(d=>[d.id,d.userTitle,d.originalConversationTitle,d.sourceConversationId,d.firstSourceSentAt,d.lastSourceSentAt,d.messageCount,d.unknownCount])]),stable=list.dataset.collectionSignature===signature&&!list.querySelector('.search-input')&&list.querySelectorAll('.conversation-document').length===docs.length;$('result-count').textContent=`${docs.length} 个聊天窗口`;if(!stable){list.replaceChildren();list.dataset.collectionSignature=signature;for(const d of docs){const b=element('button','conversation-document');b.dataset.documentId=d.id;b.append(element('strong','',d.userTitle||d.originalConversationTitle||'独立整理文档'),element('span','summary',view==='archive'?'原始来源 · 只读':d.sourceConversationId?'连续输入文档':'独立整理文档'),element('small','',`${d.firstSourceSentAt?day(d.firstSourceSentAt)+(d.lastSourceSentAt!==d.firstSourceSentAt?' — '+day(d.lastSourceSentAt):''):tc('发送时间未知')} · ${d.messageCount} 条${view==='archive'?'原始':'收录'}输入${!d.messageCount?' · 独立整理内容':''}${d.unknownCount&&d.firstSourceSentAt?' · 部分时间待补全':''}`));b.addEventListener('click',()=>{positions.set(view,window.scrollY);void navigate(view,d.id);});list.append(b);}}$('empty-list').hidden=docs.length>0;$('empty-sync').hidden=docs.length>0||!['library','archive'].includes(view);}
function appendDocumentPage(page){const doc=page.conversations.find(d=>d.id===documentId);if(!doc)return null;const editable=view==='library',rows=view==='archive'?archiveRows(page,doc.id):documentBlocks(page,doc.id,view==='excluded'),pageBody=element('div','reader-page'),body=$('document-body');let previous=null;
 for(const b of (page.pageItemIds?page.pageItemIds.map(id=>rows.find(b=>b.id===id)).filter(Boolean):rows)){const date=day(b.sourceSentAt);if(date!==previous){pageBody.append(element('h3','document-day',date));previous=date;}const section=element('section',view==='archive'?'archive-block':'library-block');section.dataset.recordId=view==='archive'?b.id:b.sourceRecordId||'';section.dataset.blockId=b.id;
 const stamp=element('p','block-time',inputStamp(b.sourceSentAt));stamp.hidden=false;section.append(stamp);
 const prose=element('div',view==='archive'?'original-prose':editable?'library-prose':'excluded-prose',view==='archive'?b.originalText:b.text);prose.tabIndex=0;prose.dataset.itemId=b.id;prose.setAttribute('aria-label',view==='archive'?'原始输入（只读）':editable?'Input 正文':'已排除正文');if(editable){prose.setAttribute('contenteditable','plaintext-only');prose.dataset.editId=b.id;}
 section.append(prose);if(view==='excluded')section.append(review.actions(b,doc));if(b.branchStatus&&view==='excluded')section.append(element('span','source-detached','导入分支待确认'));if(b.note)section.append(element('p','block-note',b.note));if(view!=='archive'&&!b.provenance.length)section.append(element('span','source-detached','来源已删除，整理文本保留'));prose.addEventListener('contextmenu',event=>{event.preventDefault();openMenu(b.id,event.clientX,event.clientY);});section.addEventListener('focusin',()=>{menuId=b.id;});pageBody.append(section);}
 body.append(pageBody);return pageBody;
}
function readerVisibleIds(){return [...$('document-body').querySelectorAll('.library-block')].map(row=>row.dataset.blockId);}
function readerCanEvict(page){const focus=document.activeElement,selection=getSelection();return !page.contains(focus)&&!(selection?.rangeCount&&page.contains(selection.anchorNode));}
function readerWindowGuard(direction,composing=false){const guard=$('reader-window-guard');guard.hidden=false;guard.dataset.direction=direction;$('reader-window-guard-message').textContent=composing?readerCopy('先完成当前输入法输入，再保存并继续。','Finish composing text before saving and continuing.'):readerCopy('当前输入或选区仍在上一段。保存后可继续阅读。','An edit or selection remains in the previous range. Save before continuing.');}
async function loadReaderPage(direction){
 const stream=readerStream,active=editor;if(!stream||stream.loading||!active||active.removalLocks||view!=='library'||documentId!==stream.documentId)return;if(active.composing){readerWindowGuard(direction,true);return;}
 const backward=direction==='back',index=backward?stream.first-1:stream.last+1;
 let cursor=backward?stream.cursors[index]:stream.cursors[index]??stream.endCursor;
 if(index<0||cursor===undefined||cursor===null&&!backward&&stream.last>=stream.highWater&&stream.endCursor===null)return;
 const pages=[...$('document-body').querySelectorAll(':scope > .reader-page')];
 if(pages.length>=2&&!readerCanEvict(backward?pages.at(-1):pages[0])){readerWindowGuard(direction);return;}$('reader-window-guard').hidden=true;
 stream.loading=true;let loaded=false;
 try{
  active.collect();if(active.dirty()&&!await active.flush())return;
  if(stream!==readerStream||active!==editor||active.removalLocks)return;
  let page,guard=0;
  do{
   page=await request('GET_PAGE',{page:{view:'library',documentId:stream.documentId,cursor,limit:READER_PAGE_LIMIT,readingSnapshot:stream.snapshot,sort:stream.sort,includeFiltered:stream.includeFiltered,trackedBlockIds:[...active.entries.keys()]}});
   if(stream!==readerStream||active!==editor||active.removalLocks)return;
   if(backward||page.pageItemIds.length||!page.nextCursor)break;
   cursor=page.nextCursor;
  }while(++guard<30);
  if(!page?.pageItemIds.length){if(!backward)stream.endCursor=page?.nextCursor??null;return;}
  active.absorb(page);
  const container=appendDocumentPage(page);if(!container)return;
  reader.mountRows(container);
  if(backward){const scroll=window.scrollY;$('document-body').prepend(container);stream.first=index;window.scrollTo(0,scroll+container.getBoundingClientRect().height);}
  else{stream.cursors[index]=cursor;stream.last=index;stream.highWater=Math.max(stream.highWater,index);stream.endCursor=page.nextCursor;}
  const mounted=[...$('document-body').querySelectorAll(':scope > .reader-page')];
  if(mounted.length>2){const removed=backward?mounted.at(-1):mounted[0],height=removed.getBoundingClientRect().height,scroll=window.scrollY;removed.remove();if(backward)stream.last--;else{stream.first++;window.scrollTo(0,Math.max(0,scroll-height));}}
  const blocks=new Map([...state.library.blocks,...page.library.blocks].map(row=>[row.id,row]));
  state.library.blocks=[...blocks.values()];state.records=[...new Map([...state.records,...page.records].map(row=>[row.id,row])).values()];
  const visible=readerVisibleIds();active.compact(visible);state.library.blocks=state.library.blocks.filter(row=>active.entries.has(row.id));state.pageItemIds=visible;
  loaded=true;renderDocumentSearch();scheduleDocumentSearch();reader.schedule();
 }catch{if(stream===readerStream)notify('下一段暂时无法读取，请稍后继续滚动重试。');}
 finally{stream.loading=false;if(loaded&&stream===readerStream)requestAnimationFrame(()=>{if(stream!==readerStream)return;const bounds=$('document-body').getBoundingClientRect();if(bounds.bottom<innerHeight+700)void loadReaderPage('forward');else if(bounds.top>-700&&stream.first>0)void loadReaderPage('back');});}
}
$('reader-window-guard-continue').addEventListener('click',async()=>{const guard=$('reader-window-guard'),direction=guard.dataset.direction,active=editor;if(guard.hidden||!active)return;if(active.composing){readerWindowGuard(direction,true);return;}active.collect();if(!await active.flush()){readerWindowGuard(direction);return;}document.activeElement?.blur();getSelection()?.removeAllRanges();guard.hidden=true;void loadReaderPage(direction);});
window.addEventListener('scroll',()=>{const stream=readerStream;if(!stream||stream.loading||view!=='library')return;const body=$('document-body'),bounds=body.getBoundingClientRect();if(bounds.bottom<innerHeight+700)void loadReaderPage('forward');else if(bounds.top>-700&&stream.first>0)void loadReaderPage('back');},{passive:true});
function paintDocumentRange(doc){
 const first=new Date(doc?.firstSourceSentAt||''),last=new Date(doc?.lastSourceSentAt||'');
 const known=Number.isFinite(first.getTime())&&Number.isFinite(last.getTime());
 const range=known?(first.getFullYear()===last.getFullYear()?String(first.getFullYear()):`${first.getFullYear()}—${last.getFullYear()}`):tc('发送时间未知');
 $('document-subtitle').textContent=range+' · '+(view==='archive'?readerCopy('原始来源 · 只读','Original source · read only'):readerCopy('我的输入','My inputs'));
}
function renderDocument(){$('reader-window-guard').hidden=true;$('document-page').inert=false;const doc=state.conversations.find(d=>d.id===documentId);if(!doc){documentId=null;render();return;}
 $('document-title').textContent=doc.userTitle||doc.originalConversationTitle||'独立整理文档';$('document-title').removeAttribute('contenteditable');$('document-title').setAttribute('aria-label','文档标题');const editable=view==='library';if(editable)$('document-title').setAttribute('contenteditable','plaintext-only');
 paintDocumentRange(doc);const body=$('document-body');body.replaceChildren();appendDocumentPage(state);
 $('input-time-order').hidden=view!=='library';const inputOrder=state.readingSort==='desc'?'desc':'asc',inputToggle=$('input-time-toggle');inputToggle.dataset.currentSort=inputOrder;inputToggle.setAttribute('aria-pressed',String(inputOrder==='desc'));setIconLabel(inputToggle,inputOrder==='desc'?'sort-down':'sort-up',inputOrder==='desc'?readerCopy('倒序 · 最新在前','Descending · newest first'):readerCopy('正序 · 最早在前','Ascending · oldest first'));inputToggle.setAttribute('aria-label',inputOrder==='desc'?readerCopy('输入时间顺序：倒序，最新在前。点击切换为正序。','Input time order: descending, newest first. Switch to ascending.'):readerCopy('输入时间顺序：正序，最早在前。点击切换为倒序。','Input time order: ascending, oldest first. Switch to descending.'));
 $('document-page').classList.toggle('standard',state.preferences.timeEmphasis==='standard');if(editable){editor=new DocumentEditor($('document-page'),state,doc,status,counts,()=>{notify('已恢复上次未完成的修改。');void refresh();},ids=>reader.invalidateInputs(ids));const history=partHistory||documentHistories.get(doc.id);if(history)editor.importHistory(history);partHistory=null;documentHistories.delete(doc.id);readerStream={documentId,sort:state.readingSort,snapshot:state.readingSnapshot,includeFiltered:showFilteredCurrent,cursors:[pageCursor],first:0,last:0,highWater:0,endCursor:state.nextCursor,loading:false};reader.mount();requestAnimationFrame(()=>{if(readerStream?.documentId===documentId&&$('document-body').getBoundingClientRect().bottom<innerHeight+700)void loadReaderPage('forward');});}else status(view==='archive'?'原文只读':'已移除 · 可恢复显示');renderDocumentSearch();scheduleDocumentSearch();
}
function settings(){presentSettingsStatus(state);void thoughts.reverseSetting();const p=state.preferences;$('time-display').value=p.timeDisplay;$('time-emphasis').value=p.timeEmphasis;$('legacy-entry').hidden=!state.stats.hidden&&!state.stats.trash;$('enabled-state').textContent=enabledLabel(state.settings);$('toggle-capture').textContent=state.settings.enabled?'暂停收录':'恢复收录';$('storage-usage').textContent=`数据保存在本机 · 存储空间由 Chrome 管理`;if($('capture-foundation-health'))$('capture-foundation-health').textContent=captureHealthText(state.diagnostics);}
function legacy(){const list=$('legacy-list');list.replaceChildren();for(const r of state.records.filter(r=>r.hidden||r.deletedAt)){const row=element('section','legacy-row');row.append(element('strong','',r.chatTitle),element('pre','',r.originalText));for(const [label,include]of [['保留原文并恢复到 Input Archive',true],['保留原文，继续排除输入',false]]){const b=element('button','',label);b.addEventListener('click',()=>void command('RESOLVE_LEGACY',{id:r.id,include}));row.append(b);}list.append(row);}if(!list.children.length&&!state.nextCursor){view='settings';render();notify('旧版本数据已处理完成。');}}
function nextButtonState(){next.disabled=!state.nextCursor;}
function render(){if(!state)return;presentScopeSearch();updateSearchProjectScope();const trail=$('page-breadcrumb');trail.hidden=['memory','revisit'].includes(view)||view==='library'&&!documentId||view==='thoughts'&&!thoughts.id||view==='excluded';trail.textContent=view==='thoughts'?tc('思想库 / 主题阅读'):documentId?names[view]+' / 阅读':view==='legacy'?'Settings / 旧数据迁移':'Input Archive / '+names[view];const consented=state.settings.consentVersion===1;$('consent-panel').hidden=consented;$('enable-consent').disabled=false;routes.present({consented});review.paint(view);const thoughtTopicOpen=view==='thoughts'&&!!thoughts.id;$('library-view-switch').hidden=!consented||!thoughtTopicOpen;document.querySelector('.workspace-header').classList.toggle('thought-header',view==='thoughts');$('view-title').textContent=appShell.viewLabel(view)||names[view];$('view-title').hidden=view==='revisit'||['library','archive'].includes(view)||!!documentId||view==='thoughts'&&!!thoughts.id;const presentationHost=thoughtTopicOpen?$('topic-presentation'):document.querySelector('.workspace-header');if($('library-view-switch').parentElement!==presentationHost)presentationHost.append($('library-view-switch'));$('back').hidden=view==='revisit'||!documentId&&['library','thoughts','excluded'].includes(view);$('document-menu').hidden=!documentId;$('revision-history').hidden=view==='thoughts'?!thoughts.id:true;setIconLabel($('back'),'back',(view==='thoughts'?tc('‹ 返回思想库'):documentId?'返回聊天窗口':view==='legacy'?'返回设置':'返回输入档案').replace(/^‹\s*/,''),{labelClass:'archive-back-label'});if(view==='thoughts'){$('back').hidden=!thoughts.id;}$('revisit-open').hidden=true;$('archive-root-overflow').hidden=!consented||!['library','archive'].includes(view);if(!['library','archive'].includes(view))$('archive-root-overflow').open=false;$('archive-search-date-scope').hidden=view!=='library'||!query.trim();$('archive-search-filter-scope').hidden=view!=='library'||!query.trim();onboarding.paint(state,{home:view==='settings'});if(!consented)return;if(documentId){if(!editor)renderDocument();else if(view==='library'){paintDocumentRange(state.conversations.find(d=>d.id===documentId));refreshCaptureTimes($('document-body'),documentBlocks(state,documentId,false),{day,time:inputStamp});}}else if(['library','archive','excluded'].includes(view))showCollection();else if(view==='settings'){settings();}else if(view==='legacy')legacy();void archiveNavigator.sync({view,documentId,query,consented});if(!documentId&&!(view==='thoughts'&&thoughts.id))status('');inputRecovery.sync();}
let latestRefresh=null;
// An awaited refresh owns completion only after the latest applicable read has
// rendered. A superseded request may still resolve later; it cannot release a
// navigation, sort, or saved-position restore before its replacement renders.
function refresh(){
 const previous=latestRefresh;let supersede;const run={superseded:new Promise(resolve=>{supersede=resolve;}),supersede};latestRefresh=run;run.done=refreshPage();previous?.supersede();
 return waitForRefresh(run);
}
async function waitForRefresh(run){for(;;){await Promise.race([run.done,run.superseded]);if(run===latestRefresh)return;run=latestRefresh;}}
async function refreshPage(){const seq=++serial,trackedAtStart=editor?new Set(editor.entries.keys()):null;inputSearchInProgress=false;try{const searchRoot=!documentId&&view==='library'&&query.trim();const next=await request('GET_PAGE',{page:{view:searchRoot||['thoughts','memory','revisit'].includes(view)?'settings':view,query:searchRoot?'':query,documentId,...(!documentId&&['library','archive'].includes(view)&&archiveNavigator.sourceScope?{providerKey:archiveNavigator.sourceScope}:{}),cursor:searchRoot?null:pageCursor,limit:documentId&&view==='library'?READER_PAGE_LIMIT:100,...(documentId&&view==='library'?{readingSnapshot,contextInputId,sort:inputSortSnapshot,includeFiltered:showFilteredCurrent}:{}),trackedBlockIds:editor?[...editor.entries.keys()]:partHistory?.ids||documentHistories.get(documentId)?.ids||[]}});if(seq!==serial)return;if(trackedAtStart&&editor&&[...editor.entries.keys()].some(id=>!trackedAtStart.has(id)&&!next.library.blocks.some(b=>b.id===id)))return refresh();if(searchRoot){inputSearchInProgress=true;next.searchResults=await findInputPage({query,ranked:true,cursor:pageCursor,read:options=>request('SEARCH_INPUTS',{options:{...options,includeFiltered:$('search-include-filtered').checked,dateFrom:$('search-date-start').value,dateTo:$('search-date-end').value,...(searchProject?{projectRef:searchProject.ref}:{}),...(archiveNavigator.sourceScope?{providerKey:archiveNavigator.sourceScope}:{})}}),isCurrent:()=>seq===serial,onProgress:()=>{$('result-count').textContent='正在继续搜索本机输入…';$('document-list').setAttribute('aria-busy','true');}});if(!next.searchResults)return;$('document-list').setAttribute('aria-busy','false');next.nextCursor=next.searchResults.nextCursor;}if(seq!==serial)return;if(documentId&&view==='library'){readingSnapshot=next.readingSnapshot;inputSortSnapshot=next.readingSort;if(next.contextUnavailable){contextInputId=null;notify('原位置已不可用，从附近继续。');}}recovery.hidden=true;if(!state&&next.settings.consentVersion===1){state=next;render();}if(!documentId)await onboarding.load();if(seq!==serial)return;state=next;if(documentId&&view==='library'&&!editor&&!state.pageItemIds.length&&state.nextCursor){pageCursor=state.nextCursor;return refresh();}pager.hidden=!documentId&&['library','archive'].includes(view)&&!query.trim()||view==='library'&&!!documentId||!state.nextCursor&&!pageHistory.length;previous.disabled=!pageHistory.length;nextButtonState();if($('info-dialog').open&&$('info-dialog').dataset.readingSurface!=='original'&&infoIds.some(id=>!state.records.some(r=>r.id===id))){$('info-dialog').close();$('info-content').replaceChildren();infoIds=[];}if(editor){const effect=editor.deferredEffect||editor.receive(state);editor.deferredEffect=null;if(effect?.newContent&&!editor.newContentNotified){editor.newContentNotified=true;notify('有新内容');const load=element('button','','查看新内容');load.id='reader-load-new';load.onclick=async()=>{const anchor=reader.capture(),intent=navigationIntent;if(!await leave(true)||intent!==navigationIntent)return;await refresh();if(intent===navigationIntent)await reader.restore(anchor);};$('notice').append(load);}if(effect?.rebuild){editor.dispose();editor=null;renderDocument();if(editor&&effect.carry?.length){editor.change(effect.carry,false);editor.paint();if(effect.conflict){editor.conflicted=true;status('其他页面已修改这些内容，当前草稿尚未保存。','conflict');}}if(effect.removed)notify('原位置已移除，从附近继续。');}}render();void smartFilter.home(view==='library'&&!documentId&&!query.trim()&&state.settings.consentVersion===1);if(view==='thoughts')await thoughts.refresh();if(view==='memory')await contextCards.open(contextCards.card);if(view==='settings'){await memory.perform(()=>memory.refreshSettings());await historyPanel.latest();await smartFilter.settings();const m=await request('GET_MIGRATION_STATUS');migrationSummary.textContent=m.phase==='active'&&m.verified&&m.recoveryVerified?`存储升级已验证：逐字段一致 · 恢复验证通过 · 迁移时 ${m.recordCount} 条原文 / ${m.blockCount} 条 Input 内容。升级后不支持直接降级到 v0.4.1。`:'存储升级状态待验证';}}catch{if(seq!==serial)return;error('无法读取本机档案，请重试。');try{const m=await request('GET_MIGRATION_STATUS');if(seq!==serial)return;recovery.hidden=!['copying','verified'].includes(m.phase);}catch{if(seq===serial)recovery.hidden=true;}}finally{if(seq===serial)inputSearchInProgress=false;}}
function openMenu(id,x,y){menuId=id;readingInvoker=document.activeElement;const menu=$('context-menu');menu.setAttribute('aria-label',view==='archive'?'这条来源记录的操作':'这条输入的操作');menu.replaceChildren();const add=(label,fn,danger=false)=>{const b=element('button',danger?'danger':'',label);b.setAttribute('role','menuitem');b.addEventListener('click',()=>{menu.hidden=true;productAction(fn)();});menu.append(b);};
 if(view==='library'){add('复制这条输入',async()=>{editor?.collect();const entry=editor?.entries.get(id);if(entry)await copyReadingText(editor.text(entry));});add(tc('加入主题'),()=>addInputToTopic(id));add(tc('接着写'),()=>topicActions.compose({inputId:id,quote:editor?.text(editor.entries.get(id))||''}));add('记住这里',()=>reader.remember());add(tc('查看原始内容'),()=>info(id));add('版本历史',()=>showRevisions(false,id));add('不主动回顾这条',async()=>{await request('PAIA_READER_CONFIGURE',{change:{kind:'input',id,excluded:true}});document.dispatchEvent(new Event('paia:reader-policy'));notify('这条及其派生预览将不再主动回顾。');});add('撤销',()=>editor?.history());add('重做',()=>editor?.history(true));}if(view==='archive')add('查看来源 / 记录信息…',()=>info(id));
 if(view!=='archive'){const b=state.library.blocks.find(b=>b.id===id);add(view==='excluded'?'恢复显示':'从档案移除',async()=>{if(view==='excluded'){if(b?.branchStatus)await request('IMPORT_RESOLVE_BRANCH',{payload:{id,expectedRevision:b.revision,operationId:crypto.randomUUID()}});else await command('EXCLUDE_LIBRARY',{id,excluded:false});await navigate('excluded',documentId);}else{if(!editor||!await editor.exclude(id,true)){notify('移除尚未保存，请先完成并保存当前输入修改。');return;}notify('已从档案移除，可撤销或从已移除内容恢复。');const undo=element('button','','撤销');undo.addEventListener('click',()=>{void editor?.history();notify('');});$('notice').append(undo);}});}
 else{add('定位到 Input Archive',()=>navigate('library',documentId));add('永久删除并忽略此来源…',async()=>{await purgeSource(id);},true);}
 menu.hidden=false;menu.style.left=Math.max(12,Math.min(x,window.innerWidth-300))+'px';menu.style.top=Math.max(12,Math.min(y,window.innerHeight-menu.offsetHeight-12))+'px';menu.querySelector('button')?.focus();}
function openDocumentMenu(){
 if(!documentId)return;readingInvoker=$('document-menu');
 const id=documentId,menu=$('context-menu');menuId=null;menu.replaceChildren();menu.setAttribute('aria-label','当前文档操作');
 const add=(label,work)=>{const action=element('button','',label);action.setAttribute('role','menuitem');action.onclick=()=>{menu.hidden=true;if(documentId===id)productAction(work)();};menu.append(action);};
 if(view==='library'){
  add(tc('查看原始内容'),()=>{navigatorDetailFocus=$('document-menu');sourceFocusId=null;return originals.open({kind:'conversation',ref:id},$('document-menu'));});
  add(tc('查看修改历史'),()=>showRevisions());
  add(readerCopy('移出整段对话…','Remove entire conversation…'),()=>removeConversation(id));
  add('不主动回顾这个对话',async()=>{await request('PAIA_READER_CONFIGURE',{change:{kind:'document',id,excluded:true}});document.dispatchEvent(new Event('paia:reader-policy'));notify('这个对话将不再主动回顾。');});
  add('会话收录设置',()=>captureScope());
  const doc=state.conversations?.find(d=>d.id===id);
  if(doc?.sourceConversationId)add('来源变化',()=>showNavigatorSourceDetail({kind:'conversation',conversationRef:{platform:doc.platform,sourceConversationId:doc.sourceConversationId}},$('document-menu')));
  add('撤销',()=>editor?.history());add('重做',()=>editor?.history(true));
 }else if(view==='archive')add('定位到 Input Archive',()=>navigate('library',id));
 else add('文档版本历史',()=>showRevisions());
 const bounds=$('document-menu').getBoundingClientRect();menu.hidden=false;
 menu.style.left=Math.max(12,Math.min(bounds.left,window.innerWidth-300))+'px';menu.style.top=Math.max(12,Math.min(bounds.bottom,window.innerHeight-menu.offsetHeight-12))+'px';menu.querySelector('button')?.focus();
}
async function openSourceRecord(recordId){const source=state.records.find(r=>r.id===recordId);if(!source)return;let cursor=null;do{const p=await request('GET_PAGE',{page:{view:'archive',limit:100,cursor}}),doc=p.documents.find(d=>d.sourceConversationId===source.chatId&&d.platform===source.platform);if(doc){await navigate('archive',doc.id);while(state.nextCursor&&!state.pageItemIds.includes(recordId)){pageHistory.push(pageCursor);pageCursor=state.nextCursor;await refresh();}[...$('document-body').children].find(el=>el.dataset.recordId===recordId)?.scrollIntoView({block:'center'});return;}cursor=p.nextCursor;}while(cursor);error('此来源已不可用，整理内容保留。');}
let removalBusy=false;
async function removeConversation(id){
 const active=editor,intent=navigationIntent;
 if(removalBusy||view!=='library'||documentId!==id||!active)return;
 if(active.composing){notify(readerCopy('请先完成当前文字输入，再核对移出范围。','Finish composing before reviewing removal.'));return;}
 removalBusy=true;
 try{
  await active.recoveryReady;if(editor!==active||navigationIntent!==intent||documentId!==id)return;
  active.collect();if(!await active.flush()){notify(readerCopy('请先完成并保存当前修改。','Finish saving the current edits first.'));return;}
  const prepared=await request('PAIA_ARCHIVE_PREPARE_REMOVAL',{removal:{target:{kind:'conversation',ref:id}}});
  if(editor!==active||navigationIntent!==intent||documentId!==id)return;
  const summary=element('section','reader-removal-scope'),doc=state.conversations.find(d=>d.id===id);
  summary.append(element('h3','',doc?.userTitle||doc?.originalConversationTitle||readerCopy('当前对话','Current conversation')),element('p','',readerCopy(`完整范围：${prepared.inputCount} 条 Input，包含当前屏幕之外的内容。`,`Complete scope: ${prepared.inputCount} Inputs, including material outside this view.`)),element('p','muted',readerCopy(`已移出 ${prepared.alreadyRemovedCount} · 分支 ${prepared.branchCount} · 过滤 ${prepared.filteredCount}`,`Already removed ${prepared.alreadyRemovedCount} · Branch ${prepared.branchCount} · Filtered ${prepared.filteredCount}`)));
  if(!await confirmReaderAction({target:prepared.target,invoker:$('document-menu'),title:readerCopy('移出整段对话','Remove entire conversation'),text:readerCopy('从 Input Archive 移出这段对话的全部现有输入。原始来源、工作文字和修改历史保留，可通过单条修改历史恢复。这不是永久删除，也不会更改今后的收录设置。','Remove all current Inputs in this conversation from Input Archive. Source, Working text and history remain; permitted individual history restores stay available. This is reversible removal and does not change future capture settings.'),confirm:readerCopy('确认移出整段对话','Confirm entire conversation removal'),content:summary}))return;
  if(editor!==active||navigationIntent!==intent||documentId!==id)return;
  if(!await active.removePrepared(prepared)){notify(readerCopy('移出尚未确认，请核对保存状态或重新查看范围。','Removal is not acknowledged; check save status or review the scope again.'));return;}
  notify(readerCopy('已移出整段对话，来源与修改历史保留。','Entire conversation removed; Source and history remain.'));await navigate('library');
 }catch(error){notify(statusLabel(error?.code||'REMOVAL_SCOPE_UNAVAILABLE'));}
 finally{removalBusy=false;}
}
async function showNavigatorSourceDetail(subject,trigger){
 navigatorDetailFocus=trigger||null;sourceFocusId=null;
 const isCurrent=readingModals.open($('info-dialog'),{trigger});$('info-dialog').dataset.readingSurface='source-detail';
 const container=$('info-content');container.replaceChildren();$('info-dialog').querySelector('h2').textContent=subject.kind==='project'?tc('来源 Project 详情'):tc('来源窗口详情');
 try{
  const detail=await request('PAIA_ARCHIVE_SOURCE_DETAIL',{subject});if(!isCurrent())return;const current=detail.current;
  if(!current)container.append(element('p','',tc('尚无已确认的来源关系记录。')));
  else if(subject.kind==='conversation'){
   const relation=current.membership?.state==='project'?tc('当前归属 Project'):current.membership?.state==='unassigned'?tc('当前明确未归属 Project'):tc('当前 Project 归属未知');
   container.append(element('p','',relation),element('p','muted',current.lastKnownSourceProject?.name?tc('最后已知 Project：')+current.lastKnownSourceProject.name:tc('没有可显示的 Project 名称')),element('p','muted',tc('来源状态：')+(current.sourceStatus||'unknown')),element('p','muted',current.lastObservedAt?tc('最后观察：')+dateLabel(current.lastObservedAt):tc('最后观察时间未知')));
  }else container.append(element('p','',current.currentName||tc('未命名 Project')),element('p','muted',tc('来源状态：')+(current.sourceStatus||'unknown')),element('p','muted',current.lastObservedAt?tc('最后观察：')+dateLabel(current.lastObservedAt):tc('最后观察时间未知')));
  const history=element('section','source-relationship-history');history.append(element('h3','',tc('关系历史')));
  if(!detail.history.length)history.append(element('p','muted',tc('还没有关系变化记录。')));
  for(const row of [...detail.history].reverse()){
   const item=element('div','source-relationship-event'),summary=element('p','',dateLabel(row.observedAt)+' · '+row.change.join(' / '));
   let value='';
   if(subject.kind==='conversation')value=row.after?.membership?.state==='project'?(row.after?.lastKnownSourceProject?.name||tc('Project')):row.after?.membership?.state==='unassigned'?tc('未归属 Project'):tc('归属未知');
   else value=row.after?.currentName||row.after?.sourceStatus||'';
   item.append(summary,element('p','muted',value));history.append(item);
  }
  if(detail.hasMore)history.append(element('p','muted',tc('这里只显示最近可读取的一批关系历史；完整事实仍保存在本机。')));
  container.append(history,element('p','muted',tc('这些是来源关系事实，不会重写当时原文或你的工作文字。')));
 }catch{if(!isCurrent())return;container.append(element('p','',tc('来源关系暂时无法读取；当前档案与 Reader 不受影响。')));}
 if(!$('info-dialog').open)readingModals.open($('info-dialog'),{trigger:document.activeElement});
}
function info(id){sourceFocusId=id;
 if(view==='library'){navigatorDetailFocus=readingInvoker;return originals.open({kind:'input',ref:id},navigatorDetailFocus);}
 readingModals.open($('info-dialog'),{trigger:readingInvoker});$('info-dialog').dataset.readingSurface='source-maintenance';
 const container=$('info-content');container.replaceChildren();const block=view==='archive'?null:state.library.blocks.find(b=>b.id===id),records=block?block.provenance.map(p=>state.records.find(r=>r.id===p.sourceRecordId)).filter(Boolean):state.records.filter(r=>r.id===id);infoIds=records.map(r=>r.id);
 $('info-dialog').querySelector('h2').textContent=tc('查看当时记录');
 for(const r of records){container.append(element('p','',r.chatTitle),element('p','muted',r.sourceSentAt?'发送于 '+dateLabel(r.sourceSentAt):tc('发送时间未知')),element('pre','source-original',r.originalText),element('p','muted','缺少当时引用的内容时，PAIA 不猜测或补写 AI 回复。'));
  if(/^https:\/\/chatgpt\.com\/c\/[-A-Za-z0-9_]+$/.test(r.chatUrl||'')){const link=element('a','','打开原对话');link.href=r.chatUrl;link.target='_blank';link.rel='noopener noreferrer';container.append(link);}else container.append(element('p','muted','来源不可跳转'));
  const details=element('details'),summary=element('summary','','时间与来源详情'),c=r.timeCandidates||{},evidence=element('pre','',`DOM candidate: ${c.dom?'present':'absent'}\nresponse candidate: ${c.response?'present':'absent'}\nagreement: ${c.agreement||'unknown'}\nsourceSentAt: ${r.sourceSentAt?.slice(0,10)||'null'}\ntimeSource: ${r.timeSource}\ntimeConfidence: ${r.timeConfidence}`);evidence.id='source-time-summary';details.append(summary,evidence,element('p','',`捕获于 ${dateLabel(r.capturedAt)}${r.importedAt?' · 导入于 '+dateLabel(r.importedAt):''}`));container.append(details);
  const purge=element('button','danger','永久删除来源…');purge.onclick=()=>void purgeSource(r.id);container.append(purge);
 }
 if(block&&editor?.entries.has(id)){const comparison=element('details'),label=element('summary','','对照当前工作文字');comparison.append(label,element('pre','reader-working-comparison',editor.text(editor.entries.get(id))));container.append(comparison);}
 if(block&&view==='library'){const versions=element('button','','查看工作版本');versions.type='button';versions.addEventListener('click',()=>{$('info-dialog').close();void showRevisions(false,id).catch(()=>error('版本历史暂时不可用，请重试。'));});container.append(versions);}
 if(!records.length)container.append(element('p','','当时来源已不可用。'));
 if(block){const label=element('label','','用户备注'),note=element('textarea');note.value=editor?.entries.get(id)?.local.note??block.note;note.setAttribute('aria-label','用户备注');note.readOnly=view!=='library';if(editor)note.addEventListener('input',()=>{void smartFilter.protectUserEdit(id);editor.note(id,note.value);});label.append(note);container.append(label);}
 if(!$('info-dialog').open)readingModals.open($('info-dialog'),{trigger:document.activeElement});
}
for(const b of document.querySelectorAll('[data-view]'))b.addEventListener('click',()=>void navigate(b.dataset.view,null,null,b.dataset.view==='library'?{freshArchiveEntry:true}:{}));$('back').addEventListener('click',()=>{if(view==='thoughts'&&returnTo!=='revisit')void thoughts.open(null);else void navigate(returnTo|| (documentId?view:view==='legacy'?'settings':'library'));});let inputSearchTimer;scopeSearch.input.addEventListener('compositionstart',()=>{archiveSearchIntent++;clearTimeout(inputSearchTimer);});wireScopeSearchKeyboard(scopeSearch.input,[{results:$('document-list'),revealOnClick:false,active:()=>!documentId&&['library','archive','excluded'].includes(view)}]);wireScopeSearchKeyboard(readerScopeSearch.input,[{results:$('document-search-results'),active:()=>view==='library'&&!!documentId}]);for(const id of ['search-date-start','search-date-end'])$(id).addEventListener('change',()=>{if(view==='library'&&query.trim())void onArchiveSearchInput();});$('search-include-filtered').addEventListener('change',()=>{if(view==='library'&&query.trim())void onArchiveSearchInput();});$('document-search-next').addEventListener('click',()=>{const current=documentSearchState();if(current.loading||!current.nextCursor)return;current.history.push(current.cursor);current.cursor=current.nextCursor;void runDocumentSearch();});$('document-search-previous').addEventListener('click',()=>{const current=documentSearchState();if(current.loading||!current.history.length)return;current.cursor=current.history.pop()??null;void runDocumentSearch();});$('consent-check').addEventListener('change',()=>{$('enable-consent').disabled=false;});$('enable-consent').addEventListener('click',()=>{$('consent-check').checked=true;void command('CONSENT',{accepted:true});});$('manage-excluded').addEventListener('click',()=>void navigate('excluded'));$('legacy-entry').addEventListener('click',()=>void navigate('legacy'));$('toggle-capture').addEventListener('click',()=>void command('SET_ENABLED',{enabled:!state.settings.enabled}));for(const [id,key]of [['time-display','timeDisplay'],['time-emphasis','timeEmphasis']])$(id).addEventListener('change',()=>void command('UPDATE_PREFERENCES',{changes:{[key]:$(id).value}}));$('retry').addEventListener('click',()=>{const active=view==='thoughts'?(thoughts.dialogEditor||thoughts.aiEditor||thoughts.editor):editor;if(active){active.failed=false;void active.flush();}});$('reload-document').addEventListener('click',async()=>{if(view==='thoughts'){if(thoughts.aiEditor){if(thoughts.aiEditor.dirty()&&!window.confirm('放弃当前尚未保存的 AI整理修改，重新读取已保存版本？'))return;thoughts.aiEditor.dispose();thoughts.aiEditor=null;await thoughts.refresh();return;}if(thoughts.dialogEditor?.conflicted){await compareThoughtConflict(thoughts.dialogEditor);return;}if(thoughts.dialogEditor){if(thoughts.dialogEditor.dirty()&&!window.confirm('放弃当前尚未保存的修改，重新读取已保存版本？'))return;thoughts.dialogEditor.dispose();thoughts.dialogEditor=null;await thoughts.openStandalone(thoughts.dialogEntryId);return;}if(thoughts.editor?.entry?.conflicted){await compareThoughtConflict(thoughts.editor.entry);return;}if(thoughts.editor?.dirty()&&!window.confirm('放弃当前尚未保存的修改，重新读取已保存版本？'))return;thoughts.editor?.dispose();thoughts.editor=null;await thoughts.refresh();return;}await compareInputConflict();});$('close-info').addEventListener('click',()=>{$('info-dialog').close();$('info-content').replaceChildren();infoIds=[];void editor?.flush();});$('document-menu').addEventListener('click',openDocumentMenu);document.addEventListener('pointerdown',e=>{if(!$('context-menu').contains(e.target)&&e.target!==$('document-menu'))$('context-menu').hidden=true;});
$('archive-root-history').addEventListener('click',()=>{archiveRootOverflow.open=false;archiveRootSummary.focus({preventScroll:true});void historyPanel.open();});
const archiveRootOverflow=$('archive-root-overflow'),archiveRootSummary=archiveRootOverflow.querySelector('summary');
setIconOnly(archiveRootSummary,'more');
archiveRootOverflow.addEventListener('toggle',()=>archiveRootSummary.setAttribute('aria-expanded',String(archiveRootOverflow.open)));

installSaveLifecycle(()=>[editor,thoughts.editor,thoughts.dialogEditor,thoughts.aiEditor,...contextCards.editors.values()]);chrome.runtime.onMessage.addListener(m=>{if(m.type==='PAIA_CONTEXT_CARDS_CHANGED'&&view==='memory')void contextCards.refresh();});chrome.storage.onChanged.addListener((changes,area)=>{if(area!=='local'||!Object.keys(changes).some(k=>['settings','paia-settings'].includes(k)))return;void refresh();});document.addEventListener('paia:navigator-refresh',()=>archiveNavigator.invalidate());chrome.runtime.onMessage.addListener(m=>{if(navigatorInvalidationMessage(m))archiveNavigator.invalidate();});chrome.runtime.onMessage.addListener(m=>{if(m.type==='ARCHIVE_CHANGED'){if(!['UPDATE_PREFERENCES','SET_ORGANIZER_CONTROLS'].includes(m.cause))document.querySelector('dialog[data-removal-target][open]')?.close();if(!['UPDATE_PREFERENCES','SET_ORGANIZER_CONTROLS'].includes(m.cause))readingModals.close();if(m.cause&&!['UPDATE_PREFERENCES','SET_ORGANIZER_CONTROLS'].includes(m.cause))thoughts.invalidateHomeSnapshot({cause:m.cause});if(m.cause==='RECORD_TOPIC_READ'){if(view==='thoughts'&&!thoughts.id)void thoughts.refresh();return;}if(['UPDATE_PREFERENCES','SET_ORGANIZER_CONTROLS'].includes(m.cause))return;smartFilter.changed();invalidateDocumentSearch();if(!m.cause)return;$('revision-dialog').close();$('revision-list').replaceChildren();if(view==='thoughts')void thoughts.refresh();else if(view==='memory'){void refresh();}else{memory.invalidate();void refresh();}}});const historyPanel=initHistoryCompletion({beforeOpen:()=>leave(true),onChange:()=>void refresh(),onRead:async()=>{try{const page=await request('GET_PAGE',{page:{view:'library',limit:1}});await navigate('library',page.recentCapturedDocument?.id||null);}catch{notify('已保存的输入仍保留，请从档案中打开。');}},onNavigate:async next=>{const origin=view;await navigate(next);if(next==='excluded'){review.enter(origin,true);review.paint(view);}}});
function revisionText(value,kind){if(kind==='title')return value.title||'使用来源标题';const text=kind==='thought'?value.thoughtText:value.libraryText??'未编辑的来源内容（通过查看来源阅读）';return text+(value.note?'\n备注：'+value.note:'')+(kind==='input'?'\n'+(value.excluded?'已从 Input Archive 移除':'保留在 Input Archive'):'');}
let revisionCursor=null,revisionContext=null;
async function purgeSource(id){
 const refused=async()=>{readingModals.close();await confirmReaderAction({presentation:'purge-blocked',title:tc('暂不能永久删除'),text:tc('这条来源包含经过人工改写的派生内容，或无法确定其删除边界。删除边界尚未确定。没有删除任何材料，也没有清除恢复草稿。'),confirm:readerCopy('关闭','Close')});};
 let preview;try{preview=await request('PAIA_ARCHIVE_SOURCE_PURGE_PREFLIGHT',{id});}catch{error(tc('暂时无法核对删除范围。没有删除任何材料。'));return;}
 if(preview.state==='owner_gate_required'){await refused();return;}
 if(preview.state!=='unambiguous'){error(tc('暂时无法完整核对删除范围。没有删除任何材料。'));return;}
 const active=editor;if(active){active.collect();if(!await active.flush()){notify(tc('请先完成并保存当前输入修改，再删除来源。'));return;}}
 if(!await confirmReaderAction({title:tc('永久删除来源'),text:tc('永久删除此来源的原文、全部快照与相关可恢复历史，并阻止再次收录。提交前会再次核对人工内容和恢复草稿；边界不明确时不会删除。无法撤销，也不能删除外部平台或已导出的副本。'),confirm:tc('永久删除，无法撤销'),danger:true}))return;
 try{await request('PURGE_SOURCE',{id,confirm:true});readingModals.close();infoIds=[];await refresh();notify(tc('来源已永久删除，相关历史不能恢复原始数据。'));}
 catch(e){if(e.code==='SOURCE_PURGE_OWNER_GATE'){await refused();return;}error(tc('暂时无法完成永久删除。请重新核对删除范围。'));}
}
async function showRevisionOwners(){
 const id=documentId,dialog=$('revision-dialog'),list=$('revision-list');dialog.querySelector('h2').textContent=tc('当前 Conversation · 修改历史');list.replaceChildren();$('revision-more').hidden=true;
 const current=readingModals.open(dialog,{trigger:readingInvoker,target:{kind:'conversation',ref:id}}),label=element('label','',tc('选择要查看修改历史的 Input')),select=element('select'),more=element('button','',tc('加载更多 Input')),feedback=element('p','muted');select.setAttribute('aria-label',tc('修改历史的 Input'));select.append(new Option(tc('选择 Input…'),''),new Option(tc('Conversation 标题修改'),'__title__'));label.append(select);list.append(element('p','muted',tc('每条 Input 有各自的工作版本；不是 Conversation 的原子历史。')),label,more,feedback);
 let cursor=null,generation=null,scope='library',busy=false;
 const load=async()=>{if(busy||!current())return;busy=true;more.disabled=true;try{
  const page=await request('GET_PAGE',{page:{view:scope,documentId:id,cursor,limit:40,...(generation===null?{}:{expectedGeneration:generation})}});if(!current())return;generation=page.dataGeneration;
  for(const inputId of page.pageItemIds){const b=page.library.blocks.find(b=>b.id===inputId);if(!b)continue;const text=b.libraryText??page.records.find(r=>r.id===b.originalTextReference)?.originalText??'来源已不可用';select.append(new Option(text.slice(0,safeOffset(text,100))+(text.length>100?'…':'')+(b.excluded?' · 已移除':''),b.id));}
  cursor=page.nextCursor;if(!cursor&&scope==='library'){scope='excluded';cursor=null;}else if(!cursor)more.hidden=true;
  feedback.textContent=select.options.length>1?tc('请选择一条 Input。'):tc('尚无可选择的 Input。');
 }catch{if(current()){feedback.textContent=tc('Input 范围已变化或暂时无法读取，请关闭后重新查看。');more.hidden=true;}}
 finally{busy=false;more.disabled=false;}};
 select.onchange=()=>{if(current()&&select.value)void showRevisions(false,select.value==='__title__'?id:select.value,select.value==='__title__'?'title':'input').catch(()=>error('版本历史暂时不可用，请重试。'));};more.onclick=()=>void load();await load();
}
async function showRevisions(more=false,entityId=null,kind='input'){const route=navigationIntent;const active=view==='thoughts'?(thoughts.dialogEditor||thoughts.aiEditor||thoughts.editor):editor;if(active){active.collect();if(!await active.flush())return;}if(route!==navigationIntent)return;if(!more&&!entityId&&view==='library')return showRevisionOwners();if(!more){revisionCursor=null;revisionContext={documentId:view==='thoughts'?thoughts.id:documentId,...(entityId?{kind,entityId}:{})};$('revision-list').replaceChildren();}if(!revisionContext.documentId)return;const modal=$('revision-dialog');if(view==='library')modal.querySelector('h2').textContent=tc(kind==='title'?'Conversation 标题 · 修改历史':'所选 Input · 修改历史');if(!more)readingModals.open(modal,{trigger:readingInvoker,target:revisionContext});const modalToken=readingModals.active?.token;const current=()=>route===navigationIntent&&modal.open&&readingModals.active?.token===modalToken;const result=await request('GET_REVISIONS',{options:{...revisionContext,cursor:revisionCursor,limit:50}});if(!current())return;revisionCursor=result.nextCursor;$('revision-more').hidden=!revisionCursor;const reasons={migration:'迁移初始版本',baseline:'初始版本',edit:tc('编辑'),title_edit:'标题编辑',major_edit:'重大编辑',remove:'整条删除',restore:'恢复',ai_update:'AI 更新'};for(const entry of result.items.sort((a,b)=>b.sequence-a.sequence)){if(view==='library'&&['input','title'].includes(entry.kind)){
 appendWorkingRevision({container:$('revision-list'),entry,tc,dateLabel,isCurrent:current,onError:error,
  read:revision=>request('PAIA_ARCHIVE_PREPARE_REVISION',{revision}),
  restore:async prepared=>{if(!current()||!editor)return false;const ok=await editor.restorePrepared(prepared);if(ok){readingModals.close();await refresh();notify(tc('已恢复，并建立新的版本。'));}return ok;}});continue;
 }const row=element('section','revision-row');row.append(element('p','',dateLabel(entry.at)+' · '+(reasons[entry.reason]||tc('编辑'))+(entry.important?' · 重要版本':'')));const preview=element('details'),summary=element('summary','','查看变化');preview.append(summary,element('pre','','操作前\n'+revisionText(entry.before,entry.kind)+'\n\n操作后\n'+revisionText(entry.after,entry.kind)));row.append(preview);for(const [label,side]of [['恢复操作前','before'],['恢复此版本','after']]){const restore=element('button','',label);restore.addEventListener('click',async()=>{let expectedRevision;if(entry.kind==='input')expectedRevision=(await request('GET_INPUT',{id:entry.entityId})).revision;else if(entry.kind==='thought')expectedRevision=(await request('GET_THOUGHT',{id:entry.entityId})).revision;else expectedRevision=(await request('GET_PAGE',{page:{view:'library',documentId:entry.entityId}})).conversations[0]?.titleRevision;if(!await confirmReaderAction({title:'恢复这个工作版本',text:'恢复会建立今天的新版本。请核对选中的文字。',confirm:'恢复这个工作版本',content:element('pre','reader-version-preview',revisionText(entry[side],entry.kind)+(entry.kind==='input'&&entry[side].libraryText===null?'\n\n'+(state.records.find(r=>r.id===state.library.blocks.find(b=>b.id===entry.entityId)?.originalTextReference)?.originalText||'当时来源已不可用'):''))}))return;const result=await command('RESTORE_REVISION',{restore:{id:entry.id,side,expectedRevision,operationId:crypto.randomUUID()}});if(result?.ok){editor?.dispose();editor=null;thoughts.editor?.dispose();thoughts.editor=null;$('revision-dialog').close();await refresh();notify('已恢复，并建立新的版本。');}else if(result?.conflict)error('版本已变化，请重新查看后再恢复。');});row.append(restore);}$('revision-list').append(row);}if(!$('revision-list').children.length)$('revision-list').append(element('p','muted','尚无可恢复版本。'));if(!$('revision-dialog').open)readingModals.open($('revision-dialog'),{trigger:document.activeElement});}
$('revision-history').addEventListener('click',()=>{if(view==='thoughts')void (thoughts.view==='ai'?thoughts.aiRevisions():thoughts.revisions());else void showRevisions();});$('revision-more').addEventListener('click',()=>void showRevisions(true));$('close-revisions').addEventListener('click',()=>{$('revision-dialog').close();$('revision-list').replaceChildren();});$('prune-revisions').addEventListener('click',async()=>{if(await command('PRUNE_REVISIONS'))notify('保留策略之外的版本已清理，最近 20 个重要版本继续保留。');});
appShell.mount();
const initialLoad=beginLoading(document.querySelector('.workspace'),'正在打开本机档案…');await refresh();initialLoad();try{await routes.restore();}finally{shellRouteReady=true;releaseStartupNavigation();}setInterval(()=>{if(view!=='thoughts'&&!backupPanel.busy&&!inputSearchInProgress&&!thoughts.searching)void refresh();},15000);

$('input-time-toggle').addEventListener('click',async()=>{const toggle=$('input-time-toggle'),current=toggle.dataset.currentSort==='desc'?'desc':'asc',next=current==='asc'?'desc':'asc',anchor=reader.capture(),intent=navigationIntent;if(!await leave(true)||intent!==navigationIntent)return;try{await request('SET_ORGANIZER_CONTROLS',{changes:{inputReadingSort:next}});if(intent!==navigationIntent)return;inputSortSnapshot=next;routes.commit({replace:true,anchor:anchor?{...anchor,sort:next}:null});pageCursor=null;pageHistory=[];readingSnapshot=null;contextInputId=anchor?.inputId||null;await refresh();if(intent!==navigationIntent)return;await reader.restore(anchor);reader.schedule();}catch{if(intent!==navigationIntent)return;await refresh();if(intent!==navigationIntent)return;await reader.restore(anchor);reader.schedule();error('排序偏好尚未保存，已恢复原来的显示。请重试。');}});

function currentSurfaceSearch(){
 if(view==='memory')return null;
 if(view==='thoughts')return thoughts.id?$('topic-search'):$('thought-search');
 if(documentId)return view==='library'?readerScopeSearch.input:null;
 if(['library','archive','excluded'].includes(view))return scopeSearch.input;
 return null;
}
function focusCurrentSurfaceSearch(){const input=currentSurfaceSearch();if(!input||input.disabled||!input.getClientRects().length)return false;input.focus();input.select?.();return true;}
function isTextEntry(target){return !!target&&(target.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(target.tagName));}
// Search-focus shortcuts stay page-scoped. Settings deliberately falls through to native browser behavior.
document.addEventListener('keydown',event=>{
 if(event.isComposing||event.keyCode===229||editor?.composing)return;
 if(view==='thoughts'&&!document.querySelector('dialog[open]'))thoughts.topicRestoreInput(event);
 if(archiveNavigator.handleKeydown(event))return;
 if(event.altKey&&event.key.toLowerCase()==='s'&&!document.querySelector('dialog[open]')&&reader.focusSelection()){event.preventDefault();return;}
 if(archiveRootOverflow.contains(event.target)&&!event.target.closest('select,input,textarea')&&['ArrowDown','ArrowUp','Home','End'].includes(event.key)){
  event.preventDefault();archiveRootOverflow.open=true;const actions=[...archiveRootOverflow.querySelectorAll('.archive-root-overflow-actions button:not(:disabled)')],at=actions.indexOf(document.activeElement);
  const next=event.key==='Home'?0:event.key==='End'?actions.length-1:event.key==='ArrowUp'?at<0?actions.length-1:(at+actions.length-1)%actions.length:(at+1)%actions.length;
  actions[next]?.focus({preventScroll:true});return;
 }
 const command=(event.metaKey||event.ctrlKey)&&!event.altKey&&!event.shiftKey,key=event.key.toLowerCase(),dialogOpen=!!document.querySelector('dialog[open]');
 if(command&&['k','f'].includes(key)&&!dialogOpen&&(!isTextEntry(event.target)||event.target===currentSurfaceSearch())&&focusCurrentSurfaceSearch()){event.preventDefault();return;}
 if(event.key==='/'&&!event.metaKey&&!event.ctrlKey&&!event.altKey&&!event.shiftKey&&!dialogOpen&&!isTextEntry(event.target)&&focusCurrentSurfaceSearch()){event.preventDefault();return;}
 if(event.key==='Escape'&&event.target===readerScopeSearch.input&&view==='library'&&documentId&&documentSearchState().query.trim()){event.preventDefault();$('document-search-close').click();return;}
 if(event.key==='Escape'&&archiveRootOverflow.open&&archiveRootOverflow.contains(event.target)){archiveRootOverflow.open=false;archiveRootSummary.focus({preventScroll:true});event.preventDefault();return;}
 if(event.key==='Escape'&&!$('context-menu').hidden){$('context-menu').hidden=true;$('document-menu').focus();event.preventDefault();return;}
 if(event.key==='Escape'&&!dialogOpen&&!reader.toolbar.hidden){reader.dismissSelection();event.preventDefault();}
});
for(const dialog of document.querySelectorAll('dialog')){const heading=dialog.querySelector('h2');if(heading){if(!heading.id)heading.id=dialog.id+'-heading';dialog.setAttribute('aria-labelledby',heading.id);}dialog.addEventListener('close',()=>{if(dialog.open)return;if(dialog.id==='revision-dialog'){$('revision-list').replaceChildren();revisionCursor=null;revisionContext=null;}if(dialog.id==='info-dialog'){const field=[...$('document-body').querySelectorAll('[data-item-id]')].find(el=>el.dataset.itemId===sourceFocusId);if(navigatorDetailFocus?.isConnected)navigatorDetailFocus.focus({preventScroll:true});else field?.focus({preventScroll:true});navigatorDetailFocus=null;$('info-content').replaceChildren();infoIds=[];void editor?.flush();}});}
async function captureScope(){
 const doc=state.conversations.find(d=>d.id===documentId);if(!doc?.sourceConversationId){notify('这个文档没有可验证的来源对话。');return;}
 const current=await request('PAIA_READER_POLICY'),excluded=current.capture.excludedChats.includes('chatgpt:'+doc.sourceConversationId);
 if(!await confirmReaderAction({title:excluded?'恢复收录此对话':'不收录此对话',text:excluded?'恢复后可能补录该对话中已经显示的用户输入。':'只停止这个来源对话今后的自动收录。已经保存的档案保留；历史导入仍由你单独确认。',confirm:excluded?'恢复收录':'停止收录'}))return;
 await request('PAIA_READER_CAPTURE_SCOPE',{options:{documentId,excluded:!excluded}});notify(excluded?'已恢复此对话的收录。':'已停止收录此对话，已保存内容保留。');
}
async function compareThoughtConflict(active){
 active.collect();
 if(active.surface.composing){notify('请先完成当前文字输入，再比较版本。');return;}
 const fields=['body','note','type'],labels={body:'正文',note:'备注',type:'类型'},dirty=[...active.entries].filter(([,entry])=>fields.some(field=>entry.local[field]!==entry.saved[field]));
 if(!dirty.length){notify('没有待比较的未保存文字。');return;}
 const content=element('div','reader-conflict-comparison'),bases=[];
 try{
  for(const [id,entry] of dirty){
   const remote=await request('GET_LIBRARY_ENTRY',{id});
   const oldSources=[...(entry.sourceRecordIds||[])].sort(),newSources=[...(remote.sourceRecordIds||[])].sort();
   if(remote.lifecycle!=='active'||remote.staleReasons?.includes('source_purged')||JSON.stringify(oldSources)!==JSON.stringify(newSources)){
    notify('内容来源已变化，草稿保持原样；请复制当前文字后重新打开。');return;
   }
   bases.push({id,remote});
   for(const field of fields)if(entry.local[field]!==entry.saved[field]){
    content.append(element('h3','',labels[field]+' · 当前草稿'),element('pre','',entry.local[field]??''),element('h3','',labels[field]+' · 本机已保存'),element('pre','',remote[field]??''));
   }
  }
 }catch{notify('读取已保存版本失败；当前草稿保持原样。');return;}
 if(!await confirmReaderAction({title:'查看两份文字',text:'核对后才会以本机新版为基准保存当前草稿；若版本再次变化，仍会拒绝覆盖。',confirm:'保存当前草稿',content}))return;
 if(!active.rebaseConflict(bases.map(({remote})=>remote))){
  notify('已保存版本再次变化或来源不可用；当前草稿保持原样。');return;
 }
 await active.flush();
}
async function compareInputConflict(){
 if(!editor)return;const active=editor,ownerDocumentId=documentId;active.collect();const recovered=!!active.recoveryConflict,presented=recovered&&inputRecovery.owner===active;if(presented&&!inputRecovery.beginComparison(active))return;
 try{
 const remote=await request('GET_PAGE',{page:{view:'library',documentId,trackedBlockIds:[...active.entries.keys()],limit:100}}),content=element('div','reader-conflict-comparison');
 if(active!==editor||active.disposed||documentId!==ownerDocumentId)return;
 if(recoveredInputInvalidated(active,state)||recoveredInputInvalidated(active,remote)){notify('来源已移除或发生变化，请保留当前文字后重新打开。');return;}
 const bases=new Map();let valid=true;
 for(const [id,e]of active.entries){if(JSON.stringify(e.local)===JSON.stringify(e.saved))continue;const b=remote.library.blocks.find(x=>x.id===id);if(!b||b.excluded||b.provenanceSignature!==e.signature){valid=false;continue;}bases.set(id,b);const source=remote.records.find(r=>r.id===b.originalTextReference);content.append(element('h3','','当前未保存的文字'),element('pre','',active.text(e)),element('h3','','本机已保存的文字'),element('pre','',b.libraryText??source?.originalText??''));if(active.recoveryConflict&&e.local.note!==b.note)content.append(element('h3','','当前备注'),element('pre','',e.local.note),element('h3','','本机备注'),element('pre','',b.note));if(active.recoveryConflict&&e.local.excluded!==b.excluded)content.append(element('h3','','当前显示状态'),element('p','',e.local.excluded?'已移出档案':'在档案中显示'),element('h3','','本机显示状态'),element('p','',b.excluded?'已移出档案':'在档案中显示'));}
 if(!valid){notify('来源已移除或发生变化，请保留当前文字后重新打开。');return;}
 const doc=remote.conversations.find(x=>x.id===documentId);if(!doc)return;if(active.title!==active.savedTitle)content.append(element('h3','','当前标题'),element('p','',active.title),element('h3','','本机标题'),element('p','',doc.userTitle||doc.originalConversationTitle));
 if(presented)inputRecovery.watchComparison(active,content);
 const accepted=await confirmReaderAction({title:'查看两份文字',text:'核对后可继续编辑当前草稿。再次保存仍会检查本机版本；不会自动覆盖另一份。',confirm:'以本机新版为基准继续编辑',content,...(presented?{invoker:inputRecovery.compare}:{})});inputRecovery.releaseComparison(content);if(!accepted)return;
 if(active!==editor||active.disposed||documentId!==ownerDocumentId||recoveredInputInvalidated(active,state)||[...bases.keys()].some(id=>!active.entries.has(id))){notify('内容已不可用，请重新打开核对。');return;}
 for(const [id,b]of bases){const e=active.entries.get(id);e.saved={libraryText:b.libraryText,note:b.note,excluded:b.excluded};e.revision=b.revision;}
 active.savedTitle=doc.userTitle;active.titleRevision=doc.titleRevision;active.failed=false;active.conflicted=false;active.revisions.last=null;status('尚未保存，核对后可重试保存。','error');
 }catch(error){if(!recovered)throw error;if(active===editor&&!active.disposed)notify('读取已保存版本失败；当前草稿保持原样。');}
 finally{if(presented)inputRecovery.endComparison(active);}
}
document.addEventListener('paia:open-topic',async event=>{for(let i=0;i<100&&view!=='thoughts';i++)await new Promise(r=>setTimeout(r,25));if(view==='thoughts'){await thoughts.open(event.detail.topicId);returnTo='revisit';routes.commit();}});

document.addEventListener('paia:flush-reader',async e=>{editor?.collect();e.detail.done(!editor||await editor.flush());});

// Explicit opt-in appearance preview; default navigation never enters it.
export async function openDesktopAppearancePreview(options){
 const {openDesktopAppearancePreview:open}=await import('./desktop-appearance-preview.js');
 return open({thoughts,actions:topicActions,navigate},options);
}




function closeContextDesignView(){contextCards.close();}
function renderContextDesignView(){}
document.addEventListener('paia:context-unavailable',()=>notify('AI Context 目前不可用。已有资料与权限记录仍保留。'));

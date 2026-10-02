import {isComposing} from './session-lifecycle.js';
import {TopicTimeline} from './topic-timeline.js';
import {TopicTimelinePositions} from './topic-timeline-window.js';
import {ThoughtWorkspace as BaseThoughtWorkspace} from './thoughts-base.js';
import {recomposeMemory} from './memory-recomposition.js';
import {request,element} from './common.js';
import {TopicAIViewSession} from '../core/topic-ai-view-session.js';
import {firstAIGenerationPanel} from './ai-first-generation.js';
import {aiTopicStatusModel} from './ai-presentation.js';
import {aiCandidateKey,renderAICandidateComparison} from './ai-candidate.js';

const $=id=>document.getElementById(id);

export class ThoughtWorkspace extends BaseThoughtWorkspace{
 constructor(options){super(options);this.aiViewSession=new TopicAIViewSession();this.viewPreferenceChosen=true;this.aiCandidateChoices=new Map();this.ensureAITopicStatus();this.originalMode='content';this.timelinePositions=new TopicTimelinePositions();this.contentPositions=new TopicTimelinePositions();this.installOriginalTabs();this.timelineLocale=document.documentElement.lang;document.addEventListener('paia:preferences-applied',()=>{const locale=document.documentElement.lang;if(locale===this.timelineLocale)return;this.timelineLocale=locale;this.syncOriginalTabs();if(this.id&&this.view==='original'&&this.originalMode==='years')void this.refresh();});}
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
  this.editor?.dispose();this.editor=null;this.topicReader=null;this.document=null;this.originalPane?.replaceChildren();this.topicTimeline?.dispose();this.originalMode=mode;
  if(mode==='content'){this.restoreContent(id);const saved=this.contentPosition?.topicId===id?this.contentPosition:null;$('topic-search').value=saved?.query||'';if(saved?.anchor)this.topicNavigationAnchor={entryId:saved.anchor.id,top:saved.anchor.top};this.timelinePositions.save(id,{...(this.timelinePositions.get(id)||{}),mode:'content'});}
  else $('topic-search').value=this.timelinePositions.get(id)?.query||'';
  await this.refresh();if(intent!==this.presentationIntent||id!==this.id)return;this.syncOriginalTabs();$('topic-original-tabs').querySelector(`[data-topic-view="${mode}"]`)?.focus({preventScroll:true});
 }
 readKey(){return super.readKey()+':'+(this.originalMode||'content');}
 async readYears(){
  const serial=++this.serial,id=this.id;this.document=null;this.ensurePanes();this.originalPane.hidden=true;this.aiPane.hidden=true;
  $('thought-home-tools').hidden=true;$('thought-collection').hidden=true;$('thought-document').hidden=false;$('revision-history').hidden=false;$('topic-toolbar').hidden=false;$('create-entry').hidden=false;
  $('topic-continuous-before').hidden=true;$('topic-continuous-after').hidden=true;$('topic-outline').hidden=true;$('topic-time-order').hidden=false;$('topic-source-scope-label').hidden=false;$('topic-search-count').textContent='';
  $('topic-source-scope').value=this.topicProviderKey||'';void this.updateTopicSourceOptions(serial);for(const b of $('topic-time-order').querySelectorAll('[data-reading-sort]'))b.setAttribute('aria-pressed',String(b.dataset.readingSort===this.readingSort));
  const topic=await request('GET_LIBRARY_TOPIC',{id});if(serial!==this.serial||id!==this.id)return false;this.topic=topic;$('topic-heading').replaceChildren(element('h1','',topic.name));
  let saved=this.topicTimeline?.visible()?this.topicTimeline.snapshot():this.timelinePositions.get(id);
  if(saved?.providerKey!==undefined&&saved.providerKey!==this.topicProviderKey||saved?.sort&&saved.sort!==this.readingSort)saved={...saved,position:null,anchor:null};
  if(!this.topicTimeline||!this.topicTimeline.host.isConnected){const host=element('div','topic-timeline');host.id='topic-timeline';$('topic-body').append(host);this.topicTimeline=new TopicTimeline({host,onStatus:this.onStatus,onQueryReset:()=>{$('topic-search').value='';$('topic-search-count').textContent='';}});}
  this.topicTimeline.host.hidden=false;await this.topicTimeline.open({topicId:id,providerKey:this.topicProviderKey,sort:this.readingSort,saved,query:$('topic-search').value.trim()});
  return serial===this.serial&&id===this.id;
 }
 async openSearchResult(item,path=item.paths?.[0]||item){if(path.topicId){const saved=this.timelinePositions.get(path.topicId)||{};this.timelinePositions.save(path.topicId,{...saved,mode:'content'});if(this.id===path.topicId&&this.originalMode==='years')await this.switchOriginalMode('content');}return super.openSearchResult(item,path);}
 async searchTopic(){if(this.id&&this.view==='original'&&this.originalMode==='years'&&this.topicTimeline){await this.topicTimeline.changeQuery($('topic-search').value.trim());return;}return super.searchTopic();}
 rememberView(){this.rememberContent();if(this.id){const anchor=this.view==='original'?this.topicAnchor():null;this.aiViewSession.remember(this.id,this.view,{scroll:Math.max(0,scrollY||0),cursor:this.cursor,pages:this.pages,query:$('topic-search').value||'',anchor});}}
 ensureAITopicStatus(){let host=$('ai-topic-status');if(host)return host;host=element('section','ai-topic-status');host.id='ai-topic-status';host.setAttribute('role','status');host.setAttribute('aria-live','polite');host.hidden=true;const row=$('topic-heading')?.closest('.topic-title-row');if(row)row.after(host);else $('thought-document')?.prepend(host);return host;}
 renderAITopicStatus(state=null,selected=this.id?this.aiTopics.get(this.id):null){const host=this.ensureAITopicStatus(),model=aiTopicStatusModel({view:this.view,hasTopic:!!this.id,aiPending:!!this.aiPending&&this.aiPendingTopicId===this.id,statusUnavailable:this.statusUnavailable?.includes('ai'),runtime:state?.runtime??this.aiState?.runtime??null,selected});if(!model){host.hidden=true;host.textContent='';delete host.dataset.state;return;}host.dataset.state=model.state;host.textContent=model.text;host.hidden=false;}
 async switchView(view,{restoreFocus=null}={}){
  if(!['original','ai'].includes(view))return;const transition=this.presentationIntent=(this.presentationIntent||0)+1;if(!this.id){this.requestedTopicView=view;return;}if(this.viewSwitchPromise){await this.viewSwitchPromise;if(transition!==this.presentationIntent)return;return this.switchView(view,{restoreFocus});}if(view===this.view)return;
  const toggle=$('ai-presentation-toggle'),topicId=this.id,previous=this.view,shouldRestoreFocus=restoreFocus===null?document.activeElement===toggle:restoreFocus===true;this.rememberView();this.pendingView=view;toggle.checked=view==='ai';toggle.disabled=true;
  const change=(async()=>{if([this.editor,this.aiEditor,this.dialogEditor].some(isComposing)||!await this.flushEditors()||transition!==this.presentationIntent||topicId!==this.id)return;this.rememberTimeline();this.topicTimeline?.dispose();this.aiViewSession.setView(topicId,view);const target=this.aiViewSession.position(topicId,view),apply=async()=>{if(this.id!==topicId)return;this.clearActionFeedback();this.view=view;if(view==='original')this.restoreContent(topicId);this.cursor=target?.cursor??null;this.pages=target?.pages||[];$('topic-search').value=target?.query||'';if(view==='original'&&target?.anchor)this.topicNavigationAnchor={entryId:target.anchor.id,top:target.anchor.top};await this.refresh();if(this.id!==topicId)return;if(view==='original'&&target?.anchor)this.topicReader?.restoreAnchor(this.originalPane,target.anchor);else if(Number.isFinite(target?.scroll))scrollTo(0,target.scroll);};if(this.aiTopics.get(topicId)?.presentation)await recomposeMemory($('topic-body'),apply);else await apply();})();
  this.viewSwitchPromise=change;try{await change;}catch(error){this.aiViewSession.setView(topicId,previous);if(this.id===topicId){this.view=previous;await this.refresh().catch(()=>{});}throw error;}finally{this.viewSwitchPromise=null;this.pendingView=null;toggle.checked=this.view==='ai';toggle.disabled=false;if(shouldRestoreFocus&&this.id===topicId)toggle.focus({preventScroll:true});}
 }
 async updateViewStatus(options={}){const state=await super.updateViewStatus(options),selected=this.id&&this.aiTopics.get(this.id);this.renderAITopicStatus(state,selected);if(this.id&&this.view==='ai'&&this.originalPane&&this.aiPane){this.originalPane.hidden=!!selected?.presentation;this.aiPane.hidden=false;}if(this.id&&this.view==='ai'&&!selected?.presentation)$('ai-library-update').hidden=true;return state;}
 firstGenerationCount(){const raw=Number(this.document?.topic?.visibleEntryCount??this.document?.items?.length??this.aiTopics.get(this.id)?.pendingEntryCount??0);return Number.isFinite(raw)&&raw>0?Math.min(8,Math.floor(raw)):8;}
 async confirmFirstGeneration(topicId){
  if(!topicId||this.id!==topicId||this.view!=='ai'||this.aiPending||this.originalPending||this.boundedPending)return;if(this.aiTopics.get(topicId)?.presentation){await this.refresh();return;}
  const count=this.firstGenerationCount(),name=this.topic?.name||this.document?.topic?.name||'当前主题',choice=await this.form('生成 AI整理',[{key:'approval',label:`仅整理“${name}” · 最多 ${count} 段当前材料 · DeepSeek`,required:true,options:[['','请选择'],['confirm','确认本次生成']]}]);
  if(choice?.approval!=='confirm'||this.id!==topicId||this.view!=='ai')return;await this.previewAIUpdate();
 }
 candidateState(row){const key=aiCandidateKey(row?.candidate);if(!key)return null;let state=this.aiCandidateChoices.get(row.topicId);if(!state||state.key!==key){state={key,values:{}};this.aiCandidateChoices.set(row.topicId,state);}return state;}
 renderCandidate(row){
  if(!this.aiPane||!row?.presentation||!row?.candidate){this.aiPane?.querySelector('[data-ai-candidate]')?.remove();return;}
  const state=this.candidateState(row);renderAICandidateComparison(this.aiPane,{candidate:row.candidate,current:row.presentation,choices:state.values,onChoice:(field,decision)=>{state.values[field]=decision;this.renderCandidate(row);},onSave:()=>this.saveCandidate(row.topicId,state.key),onRefresh:()=>this.previewAIUpdate()});
 }
 async saveCandidate(topicId,key){
  if(this.id!==topicId||this.view!=='ai')return;if(this.aiEditor){this.aiEditor.collect();if(!await this.aiEditor.flush())return;}
  await this.updateViewStatus({strict:false});const row=this.aiTopics.get(topicId),state=this.aiCandidateChoices.get(topicId);if(!row?.candidate||!state||state.key!==key||aiCandidateKey(row.candidate)!==key||row.candidate.stale){this.onStatus('内容刚有更新，请重新核对后再保存。','conflict');this.renderCandidate(row);return;}
  if(row.candidate.changedFields.some(field=>!['adopt','keep'].includes(state.values[field])))return;
  try{await request('EDIT_AI_PRESENTATION',{edit:{topicId,expectedRevision:row.presentation.revision,expectedCandidateKey:key,candidateDecisions:{...state.values},operationId:crypto.randomUUID()}});this.aiCandidateChoices.delete(topicId);this.onStatus('已保存这些选择 · 未采用的部分保持原样');await this.refresh();}
  catch(error){await this.updateViewStatus({strict:false}).catch(()=>{});this.onStatus(error?.code==='STALE_BASE'?'内容刚有更新，请重新核对后再保存。':'候选尚未保存，当前稿和选择仍保留。',error?.code==='STALE_BASE'?'conflict':'error');this.renderCandidate(this.aiTopics.get(topicId));}
 }
 async readRefresh(){this.syncOriginalTabs();if(this.id&&this.view==='original'&&this.originalMode==='years')return this.readYears();if(this.topicTimeline)this.topicTimeline.host.hidden=true;const result=await super.readRefresh();if(result!==true||!this.id||this.view!=='ai'){this.renderAITopicStatus(null,null);return result;}const row=this.aiTopics.get(this.id);if(!row?.presentation){this.originalPane.hidden=false;this.aiPane.hidden=false;const first=this.aiPane.querySelector('[data-ai-first-generation]');if(this.aiPending)first?.remove();else if(!row?.userDraft&&!first)this.aiPane.replaceChildren(firstAIGenerationPanel({topicName:this.topic?.name||this.document?.topic?.name||'当前主题',count:this.firstGenerationCount(),onGenerate:()=>this.confirmFirstGeneration(this.id)}));}else this.renderCandidate(row);return result;}
 async leave(){this.rememberTimeline();this.rememberView();const keepOriginal=this.view==='ai'&&this.aiPending&&!this.aiTopics.get(this.id)?.presentation;if(!keepOriginal){const ok=await super.leave();if(ok)this.topicTimeline?.dispose();return ok;}this.view='original';try{return await super.leave();}finally{this.view='ai';}}
 async open(id){
  this.rememberView();const currentAnchor=this.id&&this.view==='original'?this.topicAnchor():null;
  this.homePositions.set(this.id||'home',{scroll:scrollY,cursor:this.cursor,pages:this.pages,query:this.id?$('topic-search').value:$('thought-search').value,sort:this.readingSort,providerKey:this.topicProviderKey,rootProviderKey:this.rootProviderKey,...(currentAnchor?{anchor:currentAnchor}:{}),...(!this.id&&this.homeCollection?{collection:this.homeCollection.snapshot()}: {})});
  const intent=this.openIntent=(this.openIntent||0)+1;if(!await this.leave()||intent!==this.openIntent)return;this.clearActionFeedback();
  const changed=this.id!==id;if(changed){this.topicTimeline?.dispose();this.topicTimeline=null;this.originalMode=this.timelinePositions.get(id)?.mode||'content';this.snapshotRoute=null;this.homeSignature=null;$('topic-body').replaceChildren();$('topic-heading').replaceChildren();this.originalPane=null;this.aiPane=null;this.aiSignature=undefined;this.document=null;this.topic=null;this.topicReader=null;const requested=this.requestedTopicView;this.requestedTopicView=null;this.view=id?(requested||this.aiViewSession.view(id)):'original';if(id&&requested)this.aiViewSession.setView(id,requested);}
  this.id=id;this.topicProviderKey=this.homePositions.get(id||'home')?.providerKey||null;$('ai-presentation-toggle').checked=this.view==='ai';$('ai-presentation-toggle').disabled=!!this.pendingView;$('thought-list').classList.toggle('ai-mode',this.view==='ai');if(this.view!=='ai')$('ai-library-update').hidden=true;this.onOpen();
  const session=id?this.aiViewSession.position(id,this.view):null,saved=this.homePositions.get(id||'home'),sessionAnchor=this.view==='original'?(session?.anchor||saved?.anchor||null):null,sameSessionResume=!!id&&this.view==='original'&&!!(session||saved)&&(!saved?.sort||saved.sort===this.readingSort),readPosition=()=>id&&this.view==='original'?request('THOUGHT_POSITION',{position:{topicId:id}}).catch(()=>null):Promise.resolve(null);
  if(id&&this.view==='original'&&!sameSessionResume){this.resumeAnchor=await readPosition();if(intent!==this.openIntent)return;if(this.resumeAnchor?.sort)this.readingSort=this.resumeAnchor.sort;}else this.resumeAnchor=null;if(!this.resumeAnchor&&saved?.sort)this.readingSort=saved.sort;
  $('topic-search').value=id?(session?.query??saved?.query??''):'';if(!id){this.rootProviderKey=saved?.rootProviderKey||null;if(saved){$('thought-search').value=saved.query||'';if(saved.collection){this.homeCollection=this.createHomeCollection(saved.query||'');this.homeCollection.restore(saved.collection,{scope:this.homeCollectionScope(saved.query||''),query:saved.query||''});this.homeRestoring=true;this.preserveHomeRefresh=true;}}}this.cursor=id?(session?.cursor??saved?.cursor??null):null;this.pages=session?.pages||saved?.pages||[];this.history=null;if(sessionAnchor)this.topicNavigationAnchor={entryId:sessionAnchor.id,top:sessionAnchor.top};
  if(id&&this.view==='original')this.restoreContent(id);await this.refresh();if(intent!==this.openIntent)return;this.onOpen();
  if(!(this.view==='original'&&sessionAnchor))scrollTo(0,session?.scroll??saved?.scroll??0);else this.topicReader?.restoreAnchor(this.originalPane,sessionAnchor);
  if(id&&this.view==='original'&&sameSessionResume){void readPosition().then(async anchor=>{if(intent!==this.openIntent||this.id!==id||this.view!=='original')return;if(anchor?.sort&&anchor.sort!==this.readingSort){this.readingSort=anchor.sort;this.cursor=null;this.pages=[];this.resumeAnchor=anchor;this.topicNavigationAnchor=sessionAnchor?{entryId:sessionAnchor.id,top:sessionAnchor.top}:null;await this.refresh();if(intent!==this.openIntent||this.id!==id||this.view!=='original')return;}if(!sessionAnchor)await this.restorePosition(anchor);this.resumeAnchor=null;if(intent===this.openIntent&&this.id===id&&this.view==='original')this.schedulePosition();});}
  else if(id&&this.view==='original'&&this.resumeAnchor){await this.restorePosition(this.resumeAnchor);this.resumeAnchor=null;this.schedulePosition();}
  if(intent===this.openIntent)return intent;
 }
}

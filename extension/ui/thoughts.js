import {ThoughtWorkspace as BaseThoughtWorkspace} from './thoughts-base.js';
import {recomposeMemory} from './memory-recomposition.js';
import {request,element} from './common.js';
import {TopicAIViewSession} from '../core/topic-ai-view-session.js';
import {firstAIGenerationPanel} from './ai-first-generation.js';
import {aiTopicStatusModel} from './ai-presentation.js';
import {aiCandidateKey,renderAICandidateComparison} from './ai-candidate.js';

const $=id=>document.getElementById(id);

export class ThoughtWorkspace extends BaseThoughtWorkspace{
 constructor(options){super(options);this.aiViewSession=new TopicAIViewSession();this.viewPreferenceChosen=true;this.aiCandidateChoices=new Map();this.ensureAITopicStatus();}
 rememberView(){if(this.id)this.aiViewSession.remember(this.id,this.view,{scroll:Math.max(0,scrollY||0),cursor:this.cursor,pages:this.pages,query:$('topic-search').value||''});}
 ensureAITopicStatus(){let host=$('ai-topic-status');if(host)return host;host=element('section','ai-topic-status');host.id='ai-topic-status';host.setAttribute('role','status');host.setAttribute('aria-live','polite');host.hidden=true;const row=$('topic-heading')?.closest('.topic-title-row');if(row)row.after(host);else $('thought-document')?.prepend(host);return host;}
 renderAITopicStatus(state=null,selected=this.id?this.aiTopics.get(this.id):null){const host=this.ensureAITopicStatus(),model=aiTopicStatusModel({view:this.view,hasTopic:!!this.id,aiPending:!!this.aiPending,statusUnavailable:this.statusUnavailable?.includes('ai'),runtime:state?.runtime??this.aiState?.runtime??null,selected});if(!model){host.hidden=true;host.textContent='';delete host.dataset.state;return;}host.dataset.state=model.state;host.textContent=model.text;host.hidden=false;}
 async switchView(view){
  if(!['original','ai'].includes(view))return;if(!this.id){this.requestedTopicView=view;return;}if(this.viewSwitchPromise){await this.viewSwitchPromise;return this.switchView(view);}if(view===this.view)return;
  const topicId=this.id,previous=this.view,restoreFocus=document.activeElement===$('ai-presentation-toggle');this.rememberView();this.pendingView=view;$('ai-presentation-toggle').checked=view==='ai';$('ai-presentation-toggle').disabled=true;
  const change=(async()=>{if(!await this.flushEditors())return;this.aiViewSession.setView(topicId,view);const target=this.aiViewSession.position(topicId,view),apply=async()=>{if(this.id!==topicId)return;this.clearActionFeedback();this.view=view;this.cursor=target?.cursor??null;this.pages=target?.pages||[];$('topic-search').value=target?.query||'';await this.refresh();if(this.id===topicId&&Number.isFinite(target?.scroll))scrollTo(0,target.scroll);};if(this.aiTopics.get(topicId)?.presentation)await recomposeMemory(document.querySelector('.workspace'),apply);else await apply();})();
  this.viewSwitchPromise=change;try{await change;}catch(error){this.aiViewSession.setView(topicId,previous);if(this.id===topicId){this.view=previous;await this.refresh().catch(()=>{});}throw error;}finally{this.viewSwitchPromise=null;this.pendingView=null;$('ai-presentation-toggle').checked=this.view==='ai';$('ai-presentation-toggle').disabled=false;if(restoreFocus&&this.id===topicId)$('ai-presentation-toggle').focus({preventScroll:true});}
 }
 async updateViewStatus(options={}){const state=await super.updateViewStatus(options),selected=this.id&&this.aiTopics.get(this.id);this.renderAITopicStatus(state,selected);if(this.id&&this.view==='ai'&&!selected?.presentation)$('ai-library-update').hidden=true;return state;}
 async previewAIUpdate(){const topicId=this.id,pending=super.previewAIUpdate();queueMicrotask(()=>{if(topicId&&this.id===topicId&&this.aiPending){this.aiPane?.querySelector('[data-ai-first-generation]')?.remove();if(this.view==='ai')this.renderAITopicStatus(this.aiState,this.aiTopics.get(this.id));this.queueOptionalStatus();}});return pending;}
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
  try{await request('EDIT_AI_PRESENTATION',{edit:{topicId,expectedRevision:row.presentation.revision,candidateDecisions:{...state.values},operationId:crypto.randomUUID()}});this.aiCandidateChoices.delete(topicId);this.onStatus('已保存这些选择 · 未采用的部分保持原样');await this.refresh();}
  catch(error){await this.updateViewStatus({strict:false}).catch(()=>{});this.onStatus(error?.code==='STALE_BASE'?'内容刚有更新，请重新核对后再保存。':'候选尚未保存，当前稿和选择仍保留。',error?.code==='STALE_BASE'?'conflict':'error');this.renderCandidate(this.aiTopics.get(topicId));}
 }
 async readRefresh(){const result=await super.readRefresh();if(result!==true||!this.id||this.view!=='ai'){this.renderAITopicStatus(null,null);return result;}const row=this.aiTopics.get(this.id);if(!row?.presentation){this.originalPane.hidden=false;this.aiPane.hidden=false;if(!row?.userDraft&&!this.aiPane.querySelector('[data-ai-first-generation]'))this.aiPane.replaceChildren(firstAIGenerationPanel({topicName:this.topic?.name||this.document?.topic?.name||'当前主题',count:this.firstGenerationCount(),onGenerate:()=>this.confirmFirstGeneration(this.id)}));}else this.renderCandidate(row);return result;}
 async leave(){this.rememberView();const keepOriginal=this.view==='ai'&&this.aiPending&&!this.aiTopics.get(this.id)?.presentation;if(!keepOriginal)return super.leave();this.view='original';try{return await super.leave();}finally{this.view='ai';}}
 async open(id){
  this.rememberView();this.homePositions.set(this.id||'home',{scroll:scrollY,cursor:this.cursor,pages:this.pages,query:this.id?$('topic-search').value:$('thought-search').value,sort:this.readingSort});const intent=this.openIntent=(this.openIntent||0)+1;if(!await this.leave()||intent!==this.openIntent)return;this.clearActionFeedback();
  const changed=this.id!==id;if(changed){this.snapshotRoute=null;this.homeSignature=null;$('topic-body').replaceChildren();$('topic-heading').replaceChildren();this.originalPane=null;this.aiPane=null;this.aiSignature=undefined;this.document=null;this.topic=null;const requested=this.requestedTopicView;this.requestedTopicView=null;this.view=id?(requested||this.aiViewSession.view(id)):'original';if(id&&requested)this.aiViewSession.setView(id,requested);}
  this.id=id;$('ai-presentation-toggle').checked=this.view==='ai';$('ai-presentation-toggle').disabled=!!this.pendingView;$('thought-list').classList.toggle('ai-mode',this.view==='ai');if(this.view!=='ai')$('ai-library-update').hidden=true;this.onOpen();const session=id?this.aiViewSession.position(id,this.view):null,saved=this.homePositions.get(id||'home');this.resumeAnchor=id&&this.view==='original'&&!session?await request('THOUGHT_POSITION',{position:{topicId:id}}).catch(()=>null):null;if(intent!==this.openIntent)return;if(this.resumeAnchor?.sort)this.readingSort=this.resumeAnchor.sort;else if(saved?.sort)this.readingSort=saved.sort;
  $('topic-search').value=id?(session?.query??saved?.query??''):'';if(!id&&saved)$('thought-search').value=saved.query;this.cursor=session?.cursor??saved?.cursor??null;this.pages=session?.pages||saved?.pages||[];this.history=null;await this.refresh();if(intent!==this.openIntent)return;this.onOpen();scrollTo(0,session?.scroll??saved?.scroll??0);if(id&&this.view==='original'&&this.resumeAnchor){await this.restorePosition(this.resumeAnchor);this.resumeAnchor=null;this.schedulePosition();}
 }
}

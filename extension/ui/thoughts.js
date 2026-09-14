import {ThoughtWorkspace as BaseThoughtWorkspace} from './thoughts-base.js';
import {recomposeMemory} from './memory-recomposition.js';
import {request} from './common.js';
import {TopicAIViewSession} from '../core/topic-ai-view-session.js';
import {firstAIGenerationPanel} from './ai-first-generation.js';

const $=id=>document.getElementById(id);

export class ThoughtWorkspace extends BaseThoughtWorkspace{
 constructor(options){super(options);this.aiViewSession=new TopicAIViewSession();this.viewPreferenceChosen=true;}
 rememberView(){if(this.id)this.aiViewSession.remember(this.id,this.view,{scroll:Math.max(0,scrollY||0),cursor:this.cursor,pages:this.pages,query:$('topic-search').value||''});}
 async switchView(view){
  if(!['original','ai'].includes(view))return;if(!this.id){this.requestedTopicView=view;return;}if(this.viewSwitchPromise){await this.viewSwitchPromise;return this.switchView(view);}if(view===this.view)return;
  const topicId=this.id,previous=this.view,restoreFocus=document.activeElement===$('ai-presentation-toggle');this.rememberView();this.pendingView=view;$('ai-presentation-toggle').checked=view==='ai';$('ai-presentation-toggle').disabled=true;
  const change=(async()=>{if(!await this.flushEditors())return;this.aiViewSession.setView(topicId,view);const target=this.aiViewSession.position(topicId,view),apply=async()=>{if(this.id!==topicId)return;this.clearActionFeedback();this.view=view;this.cursor=target?.cursor??null;this.pages=target?.pages||[];$('topic-search').value=target?.query||'';await this.refresh();if(this.id===topicId&&Number.isFinite(target?.scroll))scrollTo(0,target.scroll);};if(this.aiTopics.get(topicId)?.presentation)await recomposeMemory(document.querySelector('.workspace'),apply);else await apply();})();
  this.viewSwitchPromise=change;try{await change;}catch(error){this.aiViewSession.setView(topicId,previous);if(this.id===topicId){this.view=previous;await this.refresh().catch(()=>{});}throw error;}finally{this.viewSwitchPromise=null;this.pendingView=null;$('ai-presentation-toggle').checked=this.view==='ai';$('ai-presentation-toggle').disabled=false;if(restoreFocus&&this.id===topicId)$('ai-presentation-toggle').focus({preventScroll:true});}
 }
 async updateViewStatus(options={}){const state=await super.updateViewStatus(options),selected=this.id&&state?.topics?.find(row=>row.topicId===this.id);if(this.id&&this.view==='ai'&&!selected?.presentation)$('ai-library-update').hidden=true;return state;}
 firstGenerationCount(){const raw=Number(this.document?.topic?.visibleEntryCount??this.document?.items?.length??this.aiTopics.get(this.id)?.pendingEntryCount??0);return Number.isFinite(raw)&&raw>0?Math.min(8,Math.floor(raw)):8;}
 async confirmFirstGeneration(topicId){
  if(!topicId||this.id!==topicId||this.view!=='ai'||this.aiPending||this.originalPending||this.boundedPending)return;if(this.aiTopics.get(topicId)?.presentation){await this.refresh();return;}
  const count=this.firstGenerationCount(),name=this.topic?.name||this.document?.topic?.name||'当前主题',choice=await this.form('生成 AI整理',[{key:'approval',label:`仅整理“${name}” · 最多 ${count} 段当前材料 · DeepSeek`,required:true,options:[['','请选择'],['confirm','确认本次生成']]}]);
  if(choice?.approval!=='confirm'||this.id!==topicId||this.view!=='ai')return;await super.previewAIUpdate();
 }
 async readRefresh(){const result=await super.readRefresh();if(result!==true||!this.id||this.view!=='ai')return result;const row=this.aiTopics.get(this.id);if(!row?.presentation){this.originalPane.hidden=false;this.aiPane.hidden=false;if(!row?.userDraft&&!this.aiPane.querySelector('[data-ai-first-generation]'))this.aiPane.replaceChildren(firstAIGenerationPanel({topicName:this.topic?.name||this.document?.topic?.name||'当前主题',count:this.firstGenerationCount(),onGenerate:()=>this.confirmFirstGeneration(this.id)}));}return result;}
 async leave(){this.rememberView();const keepOriginal=this.view==='ai'&&this.aiPending&&!this.aiTopics.get(this.id)?.presentation;if(!keepOriginal)return super.leave();this.view='original';try{return await super.leave();}finally{this.view='ai';}}
 async open(id){
  this.rememberView();this.homePositions.set(this.id||'home',{scroll:scrollY,cursor:this.cursor,pages:this.pages,query:this.id?$('topic-search').value:$('thought-search').value,sort:this.readingSort});const intent=this.openIntent=(this.openIntent||0)+1;if(!await this.leave()||intent!==this.openIntent)return;this.clearActionFeedback();
  const changed=this.id!==id;if(changed){this.snapshotRoute=null;this.homeSignature=null;$('topic-body').replaceChildren();$('topic-heading').replaceChildren();this.originalPane=null;this.aiPane=null;this.aiSignature=undefined;this.document=null;this.topic=null;const requested=this.requestedTopicView;this.requestedTopicView=null;this.view=id?(requested||this.aiViewSession.view(id)):'original';if(id&&requested)this.aiViewSession.setView(id,requested);}
  this.id=id;$('ai-presentation-toggle').checked=this.view==='ai';$('ai-presentation-toggle').disabled=!!this.pendingView;$('thought-list').classList.toggle('ai-mode',this.view==='ai');if(this.view!=='ai')$('ai-library-update').hidden=true;this.onOpen();const session=id?this.aiViewSession.position(id,this.view):null,saved=this.homePositions.get(id||'home');this.resumeAnchor=id&&this.view==='original'&&!session?await request('THOUGHT_POSITION',{position:{topicId:id}}).catch(()=>null):null;if(intent!==this.openIntent)return;if(this.resumeAnchor?.sort)this.readingSort=this.resumeAnchor.sort;else if(saved?.sort)this.readingSort=saved.sort;
  $('topic-search').value=id?(session?.query??saved?.query??''):'';if(!id&&saved)$('thought-search').value=saved.query;this.cursor=session?.cursor??saved?.cursor??null;this.pages=session?.pages||saved?.pages||[];this.history=null;await this.refresh();if(intent!==this.openIntent)return;this.onOpen();scrollTo(0,session?.scroll??saved?.scroll??0);if(id&&this.view==='original'&&this.resumeAnchor){await this.restorePosition(this.resumeAnchor);this.resumeAnchor=null;this.schedulePosition();}
 }
}

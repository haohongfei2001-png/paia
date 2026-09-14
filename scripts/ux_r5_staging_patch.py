from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected one match, found {count}: {old[:120]!r}")
    p.write_text(text.replace(old, new, 1))


p = "extension/ui/thoughts.js"
replace_once(p,
             "import {AIReadingEditor} from './ai-presentation.js';",
             "import {AIReadingEditor} from './ai-presentation.js';\nimport {firstAIGenerationPanel,renderAICandidateComparison} from './ai-candidate.js';")
replace_once(p,
             "this.pages=[];this.aiTopics=new Map();this.statusEpoch=0;",
             "this.pages=[];this.aiTopics=new Map();this.topicViews=new Map();this.statusEpoch=0;")
replace_once(p,
             "if(this.view==='ai')this.originalPane?.replaceChildren();else{this.aiPane?.replaceChildren();this.aiSignature=undefined;}",
             "if(this.view==='ai'){if(!(this.aiPending&&!this.aiTopics.get(this.id)?.presentation))this.originalPane?.replaceChildren();}else{this.aiPane?.replaceChildren();this.aiSignature=undefined;}")
replace_once(p,
             "this.id=id;this.onOpen();this.resumeAnchor=id?await request('THOUGHT_POSITION',{position:{topicId:id}}).catch(()=>null):null;",
             "if(this.id!==id)this.view=id?(this.topicViews.get(id)||'original'):'original';this.id=id;this.onOpen();this.resumeAnchor=id?await request('THOUGHT_POSITION',{position:{topicId:id}}).catch(()=>null):null;")

old = """ async switchView(view){
  if(!['original','ai'].includes(view))return;
  if(this.viewSwitchPromise){await this.viewSwitchPromise;return this.switchView(view);}
  if(view===this.view)return;
  this.pendingView=view;$('ai-presentation-toggle').checked=view==='ai';$('ai-presentation-toggle').disabled=true;
  const change=(async()=>{
   if(!await this.flushEditors())return;
   try{await request('SET_ORGANIZER_CONTROLS',{changes:{libraryView:view}});}catch{if(this.originalPane&&this.aiPane){this.originalPane.hidden=this.view==='ai';this.aiPane.hidden=this.view!=='ai';}await this.refresh();showLocalFailure('阅读模式偏好尚未保存，已恢复原来的显示。请重试，不会调用 AI。');return;}
   await recomposeMemory(document.querySelector('.workspace'),async()=>{this.clearActionFeedback();this.viewPreferenceChosen=true;this.view=view;this.cursor=null;this.pages=[];await this.refresh();});
  })();
  this.viewSwitchPromise=change;
  try{await change;}finally{this.viewSwitchPromise=null;this.pendingView=null;$('ai-presentation-toggle').checked=this.view==='ai';$('ai-presentation-toggle').disabled=false;}
 }
"""
new = """ async switchView(view){
  if(!this.id||!['original','ai'].includes(view))return;
  if(this.viewSwitchPromise){await this.viewSwitchPromise;return this.switchView(view);}
  if(view===this.view)return;
  const topicId=this.id;this.pendingView=view;$('ai-presentation-toggle').checked=view==='ai';$('ai-presentation-toggle').disabled=true;
  const change=(async()=>{
   if(!await this.flushEditors())return;
   this.topicViews.set(topicId,view);
   await recomposeMemory(document.querySelector('.workspace'),async()=>{if(this.id!==topicId)return;this.clearActionFeedback();this.view=view;this.cursor=null;this.pages=[];await this.refresh();});
  })();
  this.viewSwitchPromise=change;
  try{await change;}finally{this.viewSwitchPromise=null;this.pendingView=null;$('ai-presentation-toggle').checked=this.view==='ai';$('ai-presentation-toggle').disabled=false;}
 }
"""
replace_once(p, old, new)
replace_once(p,
             "   if(!this.viewPreferenceChosen&&!this.pendingView&&['original','ai'].includes(controls.libraryView))this.view=controls.libraryView;\n",
             "")
replace_once(p,
             "selected=this.id?state.topics.find(t=>t.topicId===this.id):state.nextTopic,hasDelta=this.id?selected?.pending:state.pendingTopics>0;",
             "selected=this.id?state.topics.find(t=>t.topicId===this.id):state.nextTopic,hasDelta=this.id?selected?.pending:state.pendingTopics>0,hasPresentation=!!selected?.presentation;")
replace_once(p,
             "$('ai-library-update').hidden=!this.id||this.view!=='ai'||!hasDelta||!$('ai-library-retry').hidden;",
             "$('ai-library-update').hidden=!this.id||this.view!=='ai'||!hasDelta||!hasPresentation||!$('ai-library-retry').hidden;")
replace_once(p,
             "if(path.topicId){if(item.aiField&&this.view!=='ai')await this.switchView('ai');await this.open(path.topicId);if(path.sectionId)",
             "if(path.topicId){await this.open(path.topicId);if(item.aiField&&this.view!=='ai')await this.switchView('ai');if(path.sectionId)")

old = """   const cached=this.aiTopics.get(this.id)?.presentation;$('topic-toolbar').hidden=false;$('create-entry').hidden=true;$('topic-next').hidden=true;$('topic-previous').hidden=true;$('topic-sections-more').hidden=true;
   if(this.aiEditor){await this.aiEditor.refreshEvidence?.();if(serial!==this.serial)return false;}
   if(this.aiEditor&&cached&&(this.aiEditor.dirty()||this.aiEditor.saving||this.aiEditor.row.revision>=cached.revision)){this.filterAIReading();return true;}
   const signature=JSON.stringify(cached||this.aiTopics.get(this.id)?.userDraft||null);if(!cached&&this.aiSignature===signature){this.filterAIReading();return true;}
   this.aiEditor?.dispose();this.aiEditor=null;this.aiSignature=signature;this.aiPane.replaceChildren();
   if(!cached){const draft=this.aiTopics.get(this.id)?.userDraft;if(draft){const box=element('section','ai-user-draft');box.append(element('h2','','保留的人工整理'));for(const item of draft.fields)box.append(element('h3','',item.label),element('p','entry-prose',item.text));box.append(button('保留为独立内容',async()=>{await this.checked('RECOVER_AI_PRESENTATION_DRAFT',{options:{topicId:this.id,expectedRevision:draft.revision,operationId:op()}});await this.refresh();}));this.aiPane.append(box);}else this.aiPane.append(element('p','muted','尚无 AI整理。可按需点击“更新 AI整理”。'));this.renderSectionNav();return true;}
   this.aiEditor=new AIReadingEditor(this.aiPane,cached,id=>this.openStandalone(id),this.onStatus);const activeEditor=this.aiEditor;void activeEditor.ready.then(()=>{if(this.aiEditor===activeEditor&&!activeEditor.disposed)this.filterAIReading();}).catch(()=>{});this.filterAIReading();return true;
"""
new = """   const topicState=this.aiTopics.get(this.id),cached=topicState?.presentation,candidate=topicState?.candidate;$('topic-toolbar').hidden=false;$('create-entry').hidden=true;$('topic-next').hidden=true;$('topic-previous').hidden=true;$('topic-sections-more').hidden=true;
   if(this.aiEditor){await this.aiEditor.refreshEvidence?.();if(serial!==this.serial)return false;}
   if(this.aiEditor&&cached&&(this.aiEditor.dirty()||this.aiEditor.saving||this.aiEditor.row.revision>=cached.revision)){this.renderAICandidate(candidate,cached);this.filterAIReading();return true;}
   const signature=JSON.stringify([cached||topicState?.userDraft||null,candidate||null]);if(!cached&&this.aiSignature===signature){this.originalPane.hidden=false;this.aiPane.hidden=false;this.filterAIReading();return true;}
   this.aiEditor?.dispose();this.aiEditor=null;this.aiSignature=signature;this.aiPane.replaceChildren();
   if(!cached){this.originalPane.hidden=false;this.aiPane.hidden=false;const draft=topicState?.userDraft;if(draft){const box=element('section','ai-user-draft');box.append(element('h2','','保留的人工整理'));for(const item of draft.fields)box.append(element('h3','',item.label),element('p','entry-prose',item.text));box.append(button('保留为独立内容',async()=>{await this.checked('RECOVER_AI_PRESENTATION_DRAFT',{options:{topicId:this.id,expectedRevision:draft.revision,operationId:op()}});await this.refresh();}));this.aiPane.append(box);}else this.aiPane.append(firstAIGenerationPanel(()=>this.previewAIUpdate(),{maxInputs:8}));this.renderSectionNav();return true;}
   this.aiEditor=new AIReadingEditor(this.aiPane,cached,id=>this.openStandalone(id),this.onStatus);const activeEditor=this.aiEditor;void activeEditor.ready.then(()=>{if(this.aiEditor===activeEditor&&!activeEditor.disposed)this.filterAIReading();}).catch(()=>{});this.renderAICandidate(candidate,cached);this.filterAIReading();return true;
"""
replace_once(p, old, new)
replace_once(p,
             " ensurePanes(){if(!this.originalPane||!this.originalPane.isConnected){this.originalPane=element('div');this.originalPane.id='original-reading-body';this.aiPane=element('div');this.aiPane.id='ai-reading-body';$('topic-body').replaceChildren(this.originalPane,this.aiPane);this.aiSignature=undefined;}}\n",
             " ensurePanes(){if(!this.originalPane||!this.originalPane.isConnected){this.originalPane=element('div');this.originalPane.id='original-reading-body';this.aiPane=element('div');this.aiPane.id='ai-reading-body';$('topic-body').replaceChildren(this.originalPane,this.aiPane);this.aiSignature=undefined;}}\n renderAICandidate(candidate,current){return renderAICandidateComparison(this.aiPane,{candidate,current,onDecision:async decision=>{const topicId=this.id,row=this.aiTopics.get(topicId)?.presentation;if(!topicId||!row)return;await this.checked('EDIT_AI_PRESENTATION',{edit:{topicId,expectedRevision:row.revision,candidateDecision:decision,operationId:op()}});await this.refresh();}});}\n")

p = "extension/core/backup-service.js"
replace_once(p,
             "import {isStoredAIPresentation} from './organizer/ai-contract.js';",
             "import {isStoredAIPresentation} from './organizer/ai-contract.js';\nimport {validAIPresentationCandidate} from './organizer/ai-candidate.js';")
old = """if(row.id.startsWith('aiPresentation:')){const evidence=new Set(row.evidenceEntryIds||[]);if(!evidence.size||!isStoredAIPresentation(row,evidence)||!await t.get('topics',row.topicId))return null;for(const id of evidence){const entry=await t.get('thoughts',id);if(!entry||!await this.project(t,'entries',entry))return null;}}value={id:row.id,data:row};"""
new = """if(row.id.startsWith('aiPresentation:')){const evidence=new Set(row.evidenceEntryIds||[]);if(!evidence.size||!isStoredAIPresentation(row,evidence)||!await t.get('topics',row.topicId))return null;for(const id of evidence){const entry=await t.get('thoughts',id);if(!entry||!await this.project(t,'entries',entry))return null;}if(row.candidate){const candidateEvidence=new Set(row.candidate.proposal?.evidenceEntryIds||[]),allowed=new Set([...evidence,...candidateEvidence]);let candidateSafe=validAIPresentationCandidate(row.candidate,allowed);if(candidateSafe)for(const id of candidateEvidence){const entry=await t.get('thoughts',id);if(!entry||!await this.project(t,'entries',entry)){candidateSafe=false;break;}}if(!candidateSafe){row={...row};delete row.candidate;}}}value={id:row.id,data:row};"""
replace_once(p, old, new)
old = """if(row.id.startsWith('aiPresentation:')){const p=row.data;required(topics.has(p.topicId)&&Array.isArray(p.evidenceEntryIds)&&p.evidenceEntryIds.length>0&&isStoredAIPresentation(p,new Set(entries.keys())));}}"""
new = """if(row.id.startsWith('aiPresentation:')){const p=row.data,allowed=new Set(entries.keys());required(topics.has(p.topicId)&&Array.isArray(p.evidenceEntryIds)&&p.evidenceEntryIds.length>0&&isStoredAIPresentation(p,allowed));if(p.candidate)required(validAIPresentationCandidate(p.candidate,allowed));}}"""
replace_once(p, old, new)

p = "extension/tests/ai-product-v080.test.mjs"
old = """assert.equal((await f.ai.wake(action())).completed,true);p=(await aiPresentationStatus(f.s)).topics[0].presentation;assert.equal(p.currentView,'人工维护的理解');assert.equal(p.blockSummary,'人工摘要');const revisions=(await aiPresentationRevisions(f.s,{topicId:id})).items;assert.deepEqual(revisions.map(x=>x.actor),['ai','user','user','ai']);assert.equal(f.count(),2);"""
new = """assert.equal((await f.ai.wake(action())).completed,true);const state=(await aiPresentationStatus(f.s)).topics[0];p=state.presentation;assert.equal(p.currentView,'人工维护的理解');assert.equal(p.blockSummary,'人工摘要');assert.ok(state.candidate);assert.equal(state.candidate.stale,false);const revisions=(await aiPresentationRevisions(f.s,{topicId:id})).items;assert.deepEqual(revisions.map(x=>x.actor),['ai','user','user']);assert.equal(f.count(),2);"""
replace_once(p, old, new)

p = "extension/ui/thought-reader.css"
css = Path(p).read_text()
marker = "/* UX-R5 AI update comparison */"
if marker not in css:
    css += """

/* UX-R5 AI update comparison */
.ai-first-generation,.ai-update-candidate{max-width:760px;margin:18px auto;padding:18px;border:1px solid var(--line,#d9d9d9);border-radius:14px;background:var(--surface,#fff)}
.ai-candidate-field{padding:14px 0;border-top:1px solid var(--line,#e5e5e5)}
.ai-candidate-compare{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px}
.ai-candidate-version{min-width:0;padding:12px;border-radius:10px;background:var(--surface-subtle,#f7f7f7)}
.ai-candidate-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
@media(max-width:799px){.ai-candidate-compare{grid-template-columns:1fr}.ai-first-generation,.ai-update-candidate{margin:12px 0;padding:14px}}
@media(prefers-reduced-motion:reduce){.ai-first-generation,.ai-update-candidate{scroll-behavior:auto}}
"""
    Path(p).write_text(css)

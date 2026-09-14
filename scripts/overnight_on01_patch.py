from pathlib import Path


def replace_once(path, old, new):
    p=Path(path); text=p.read_text(); count=text.count(old)
    if count!=1: raise SystemExit(f'{path}: expected one match, found {count}: {old[:120]!r}')
    p.write_text(text.replace(old,new,1))

p='extension/ui/thoughts.js'
replace_once(p,
  'this.pages=[];this.aiTopics=new Map();this.statusEpoch=0;',
  'this.pages=[];this.aiTopics=new Map();this.topicViews=new Map();this.statusEpoch=0;')
replace_once(p,
  "if(this.view==='ai')this.originalPane?.replaceChildren();else{this.aiPane?.replaceChildren();this.aiSignature=undefined;}",
  "if(this.view==='ai'){if(!(this.aiPending&&!this.aiTopics.get(this.id)?.presentation))this.originalPane?.replaceChildren();}else{this.aiPane?.replaceChildren();this.aiSignature=undefined;}")
replace_once(p,
  "this.id=id;this.onOpen();this.resumeAnchor=id?await request('THOUGHT_POSITION',{position:{topicId:id}}).catch(()=>null):null;",
  "if(this.id!==id)this.view=id?(this.topicViews.get(id)||'original'):'original';this.id=id;this.onOpen();this.resumeAnchor=id?await request('THOUGHT_POSITION',{position:{topicId:id}}).catch(()=>null):null;")
old=""" async switchView(view){
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
new=""" async switchView(view){
  if(!this.id||!['original','ai'].includes(view))return;
  if(this.viewSwitchPromise){await this.viewSwitchPromise;return this.switchView(view);}
  if(view===this.view)return;
  const topicId=this.id,active=document.activeElement,hadToggleFocus=active?.id==='ai-presentation-toggle';this.pendingView=view;$('ai-presentation-toggle').checked=view==='ai';$('ai-presentation-toggle').disabled=true;
  const change=(async()=>{
   if(!await this.flushEditors())return;
   this.topicViews.set(topicId,view);
   await recomposeMemory(document.querySelector('.workspace'),async()=>{if(this.id!==topicId)return;this.clearActionFeedback();this.view=view;this.cursor=null;this.pages=[];await this.refresh();});
  })();
  this.viewSwitchPromise=change;
  try{await change;}finally{this.viewSwitchPromise=null;this.pendingView=null;$('ai-presentation-toggle').checked=this.view==='ai';$('ai-presentation-toggle').disabled=false;if(hadToggleFocus)$('ai-presentation-toggle').focus({preventScroll:true});}
 }
"""
replace_once(p,old,new)
replace_once(p,
  "   if(!this.viewPreferenceChosen&&!this.pendingView&&['original','ai'].includes(controls.libraryView))this.view=controls.libraryView;\n",
  '')
replace_once(p,
  "selected=this.id?state.topics.find(t=>t.topicId===this.id):state.nextTopic,hasDelta=this.id?selected?.pending:state.pendingTopics>0;",
  "selected=this.id?state.topics.find(t=>t.topicId===this.id):state.nextTopic,hasDelta=this.id?selected?.pending:state.pendingTopics>0,hasPresentation=!!selected?.presentation;")
replace_once(p,
  "$('ai-presentation-toggle').checked=(this.pendingView||this.view)==='ai';$('ai-presentation-toggle').disabled=!!this.pendingView;$('thought-list').classList.toggle('ai-mode',this.view==='ai');$('ai-library-update').hidden=!this.id||this.view!=='ai'||!hasDelta||!$('ai-library-retry').hidden;$('ai-library-update').disabled=active||!hasDelta;$('ai-library-update').textContent=this.aiPending?'正在整理…':'更新 AI整理';$('ai-library-retry').disabled=active;",
  "$('ai-presentation-toggle').checked=(this.pendingView||this.view)==='ai';$('ai-presentation-toggle').disabled=!!this.pendingView;$('thought-list').classList.toggle('ai-mode',this.view==='ai');$('ai-library-update').hidden=!this.id||this.view!=='ai'||!hasDelta||!hasPresentation||!$('ai-library-retry').hidden;$('ai-library-update').disabled=active||!hasDelta||!hasPresentation;$('ai-library-update').textContent=this.aiPending?'正在整理…':'更新 AI整理';$('ai-library-retry').disabled=active;")
replace_once(p,
  "if(path.topicId){if(item.aiField&&this.view!=='ai')await this.switchView('ai');await this.open(path.topicId);if(path.sectionId)",
  "if(path.topicId){await this.open(path.topicId);if(item.aiField&&this.view!=='ai')await this.switchView('ai');if(path.sectionId)")
old="""   const cached=this.aiTopics.get(this.id)?.presentation;$('topic-toolbar').hidden=false;$('create-entry').hidden=true;$('topic-next').hidden=true;$('topic-previous').hidden=true;$('topic-sections-more').hidden=true;
   if(this.aiEditor){await this.aiEditor.refreshEvidence?.();if(serial!==this.serial)return false;}
   if(this.aiEditor&&cached&&(this.aiEditor.dirty()||this.aiEditor.saving||this.aiEditor.row.revision>=cached.revision)){this.filterAIReading();return true;}
   const signature=JSON.stringify(cached||this.aiTopics.get(this.id)?.userDraft||null);if(!cached&&this.aiSignature===signature){this.filterAIReading();return true;}
   this.aiEditor?.dispose();this.aiEditor=null;this.aiSignature=signature;this.aiPane.replaceChildren();
   if(!cached){const draft=this.aiTopics.get(this.id)?.userDraft;if(draft){const box=element('section','ai-user-draft');box.append(element('h2','','保留的人工整理'));for(const item of draft.fields)box.append(element('h3','',item.label),element('p','entry-prose',item.text));box.append(button('保留为独立内容',async()=>{await this.checked('RECOVER_AI_PRESENTATION_DRAFT',{options:{topicId:this.id,expectedRevision:draft.revision,operationId:op()}});await this.refresh();}));this.aiPane.append(box);}else this.aiPane.append(element('p','muted','尚无 AI整理。可按需点击“更新 AI整理”。'));this.renderSectionNav();return true;}
   this.aiEditor=new AIReadingEditor(this.aiPane,cached,id=>this.openStandalone(id),this.onStatus);const activeEditor=this.aiEditor;void activeEditor.ready.then(()=>{if(this.aiEditor===activeEditor&&!activeEditor.disposed)this.filterAIReading();}).catch(()=>{});this.filterAIReading();return true;
"""
new="""   const topicState=this.aiTopics.get(this.id),cached=topicState?.presentation;$('topic-toolbar').hidden=false;$('create-entry').hidden=true;$('topic-next').hidden=true;$('topic-previous').hidden=true;$('topic-sections-more').hidden=true;
   if(this.aiEditor){await this.aiEditor.refreshEvidence?.();if(serial!==this.serial)return false;}
   if(this.aiEditor&&cached&&(this.aiEditor.dirty()||this.aiEditor.saving||this.aiEditor.row.revision>=cached.revision)){this.filterAIReading();return true;}
   const signature=JSON.stringify(cached||topicState?.userDraft||null);if(!cached&&this.aiSignature===signature){this.originalPane.hidden=false;this.aiPane.hidden=false;this.filterAIReading();return true;}
   this.aiEditor?.dispose();this.aiEditor=null;this.aiSignature=signature;this.aiPane.replaceChildren();
   if(!cached){this.originalPane.hidden=false;this.aiPane.hidden=false;const draft=topicState?.userDraft;if(draft){const box=element('section','ai-user-draft');box.append(element('h2','','保留的人工整理'));for(const item of draft.fields)box.append(element('h3','',item.label),element('p','entry-prose',item.text));box.append(button('保留为独立内容',async()=>{await this.checked('RECOVER_AI_PRESENTATION_DRAFT',{options:{topicId:this.id,expectedRevision:draft.revision,operationId:op()}});await this.refresh();}));this.aiPane.append(box);}else{const box=element('section','ai-first-generation');box.dataset.aiFirstGeneration='true';box.append(element('h2','','第一次整理'),element('p','', '生成后会形成这个主题的 AI 整理视图。它不会改动原话，也不会替代你修改过的内容。'),element('p','muted','切换视图本身不会联网。只有下一步明确授权后，才会把本主题有限材料发送给已配置的 DeepSeek；本次最多 1 个主题、1 次请求。'),button('生成 AI整理',()=>this.startBounded('ai')));this.aiPane.append(box);}this.renderSectionNav();return true;}
   this.aiEditor=new AIReadingEditor(this.aiPane,cached,id=>this.openStandalone(id),this.onStatus);const activeEditor=this.aiEditor;void activeEditor.ready.then(()=>{if(this.aiEditor===activeEditor&&!activeEditor.disposed)this.filterAIReading();}).catch(()=>{});this.filterAIReading();return true;
"""
replace_once(p,old,new)

p='extension/ui/thought-reader.css'
text=Path(p).read_text(); marker='/* UX-R5 ON-01 first generation */'
if marker not in text:
    text += """

/* UX-R5 ON-01 first generation */
.ai-first-generation{max-width:760px;margin:18px auto;padding:18px;border:1px solid var(--line,#d9d9d9);border-radius:14px;background:var(--surface,#fff)}
.ai-first-generation>button{margin-top:10px}
@media(max-width:799px){.ai-first-generation{margin:12px 0;padding:14px}}
@media(prefers-reduced-motion:reduce){.ai-first-generation{scroll-behavior:auto}}
"""
    Path(p).write_text(text)

p='.github/workflows/paia-certification.yml'
text=Path(p).read_text()
text=text.replace('UX-R1 shell, UX-R2 Reader and UX-R3 Thought and UX-R4 reuse plus current core product journeys','UX-R1 shell through UX-R5 ON-01 plus current core product journeys',1)
needle='          tests/ux-r4-search-reuse-chrome-e2e.test.mjs\n'
if needle not in text: raise SystemExit('workflow anchor missing')
text=text.replace(needle,needle+'          tests/ux-r5-ai-organize-chrome-e2e.test.mjs\n',1)
anchor="""      - name: Upload UX-R4 visual and browser evidence
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: ux-r4-evidence-${{ github.sha }}
          path: extension/work/ux-r4
          if-no-files-found: warn
"""
if anchor not in text: raise SystemExit('artifact anchor missing')
addition=anchor+"""      - name: Upload UX-R5 ON-01 visual and browser evidence
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: ux-r5-on01-evidence-${{ github.sha }}
          path: extension/work/ux-r5
          if-no-files-found: warn
"""
text=text.replace(anchor,addition,1)
Path(p).write_text(text)

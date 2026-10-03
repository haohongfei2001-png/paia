import {hashText} from '../core/dedupe.js';
import {thoughtCopy as tc} from './thought-copy.js';
import {request,element} from './common.js';
import {copyReadingText} from './reading-actions.js';
const op=()=>crypto.randomUUID();
const creationResult=result=>{if(!result||typeof result.id!=='string'||!result.id.length||result.id.length>200){const error=Error('UNAVAILABLE');error.code='UNAVAILABLE';throw error;}return result;};
const uncertainResult=error=>['MESSAGE_CHANNEL_INTERRUPTED','UNAVAILABLE','TIMEOUT','WORKER_INTERRUPTED'].includes(error?.code);
const button=(text,run)=>{const b=element('button','',text);b.type='button';b.onclick=()=>void run();return b;};
export class TopicActions {
 constructor({flush,notify,onThought,onTopic,enterCompose=null,exitCompose=null}){Object.assign(this,{flush,notify,onThought,onTopic,enterCompose,exitCompose});this.dialog=element('dialog','topic-action-dialog');this.dialog.id='topic-action-dialog';this.dialog.setAttribute('aria-labelledby','topic-action-title');document.body.append(this.dialog);this.dialog.addEventListener('cancel',e=>{e.preventDefault();this.close();});this.dialog.addEventListener('paia:request-close',e=>{e.preventDefault();this.close();});window.addEventListener('beforeunload',e=>{if(this.draft?.value.trim()){e.preventDefault();e.returnValue='';}});chrome.runtime.onMessage.addListener(m=>{if(m.type==='ARCHIVE_CHANGED'&&this.pendingCompose?.materialBound&&['PURGE_SOURCE','PURGE_RECORD','PAIA_BACKUP_RESTORE','REMOVE_LIBRARY_ENTRY','REMOVE_LIBRARY_TOPIC'].includes(m.cause))this.beginOpen();if(m.type==='ARCHIVE_CHANGED'&&this.quotePreview&&!['UPDATE_PREFERENCES','SET_ORGANIZER_CONTROLS','RECORD_TOPIC_READ','SET_THOUGHT_REVERSE_EDIT'].includes(m.cause)){this.quotePreview.remove();this.quotePreview=null;}if(m.type==='ARCHIVE_CHANGED'&&this.comparing&&!['UPDATE_PREFERENCES','RECORD_TOPIC_READ','SET_ORGANIZER_CONTROLS','SET_THOUGHT_REVERSE_EDIT'].includes(m.cause)){this.dialog.replaceChildren(element('p','',tc('内容已变化，请重新打开核对。')),button(tc('关闭'),()=>this.close()));this.comparing=false;}});}
 beginOpen(){return this.openIntent=(this.openIntent||0)+1;}
 currentSurface(owner){return !!owner&&this.surface===owner;}
 pendingComposeIs(id){return !!id&&this.pendingCompose?.id===id&&this.pendingCompose.intent===this.openIntent;}
 composeSessionIs(id){return this.pendingComposeIs(id)||!!id&&this.surface?.workspace===true&&this.surface.sessionId===id;}
 leave({composeId=null}={}){
  if(!this.surface&&this.pendingComposeIs(composeId))return true;
  if(!this.surface&&!this.dialog.open){this.pendingCompose=null;this.beginOpen();return true;}
  return this.dismiss(this.surface?.closing===true);
 }
 canClose(force,owner){
  if(owner&&owner!==this.surface)return false;
  return force||!this.draft?.value.trim()||confirm(tc('文字尚未保存。放弃这份草稿？取消可保留在此继续写。'));
 }
 close(force=false,owner=this.surface){
  if(owner?.workspace&&owner.closing)return false;
  if(!this.canClose(force,owner))return false;
  if(!owner?.workspace)return this.dismiss(true,owner);
  owner.closing=true;owner.content.inert=true;
  void Promise.resolve().then(()=>this.exitCompose(owner.sessionId)).then(ok=>{if(ok===false&&this.currentSurface(owner)){owner.closing=false;owner.content.inert=false;this.draft?.focus();}}).catch(()=>{if(this.currentSurface(owner)){owner.closing=false;owner.content.inert=false;owner.feedback.textContent=tc('暂时无法返回，文字仍保留在这里。');this.draft?.focus();}});
  return true;
 }
 dismiss(force=false,owner=this.surface){
  if(!this.canClose(force,owner))return false;
  this.beginOpen();this.pendingCompose=null;const trigger=owner?.trigger||this.trigger;this.surface=null;this.draft=null;this.composeSession=null;this.quotePreview=null;this.comparing=false;
  if(owner?.workspace)owner.host.replaceChildren();else{this.dialog.close();this.dialog.replaceChildren();trigger?.focus({preventScroll:true});}return true;
 }
 mountSurface(title,{host=this.dialog,workspace=false,sessionId=null,trigger=document.activeElement}={}){
  this.trigger=trigger;const head=element('header'),heading=element(workspace?'h1':'h2','',title);heading.id=workspace?'thought-compose-title':'topic-action-title';this.feedback=element('p','topic-action-feedback');this.feedback.setAttribute('role','status');this.content=element('div','topic-action-content');
  const owner={host,workspace,sessionId,content:this.content,feedback:this.feedback,trigger,pendingChoices:0,submitPending:false,closing:false};this.surface=owner;
  head.append(heading);if(!workspace)head.append(button(tc('关闭'),()=>this.close(false,owner)));host.replaceChildren(head,owner.content,owner.feedback);if(!workspace)this.dialog.showModal();return owner;
 }
 open(title){if(this.surface?.workspace||!this.close())return false;this.mountSurface(title);return true;}
 async topicChoices(host,initial,{owner=this.surface,selected=new Set(initial?[initial]:[])}={}){
  const current=()=>this.currentSurface(owner),search=element('input'),list=element('div','topic-choice-list');if(!current())return selected;
  search.type='search';search.placeholder=tc('搜索主题');search.setAttribute('aria-label',tc('搜索主题'));host.append(search,list);let cursor=null,rows=[],busy=false,serial=0;
  const paint=()=>{if(!current())return;list.replaceChildren();for(const topic of rows.filter(topic=>topic.name.toLocaleLowerCase().includes(search.value.toLocaleLowerCase()))){const label=element('label'),box=element('input');box.type='checkbox';box.checked=selected.has(topic.id);box.onchange=()=>{if(!current()||owner.submitPending){box.checked=selected.has(topic.id);return;}box.checked?selected.add(topic.id):selected.delete(topic.id);owner.onChoiceChange?.(selected,rows);};label.append(box,document.createTextNode(topic.name));list.append(label);}if(cursor)list.append(button(tc('加载更多主题'),load));if(!rows.length)list.append(element('p','muted',tc('还没有主题，可以新建一个。')));owner.onChoiceChange?.(selected,rows);};
  const load=async()=>{if(busy||!current())return;busy=true;const intent=++serial;try{const page=await request('LIBRARY_INDEX_PAGE',{options:{mode:'stable',cursor,limit:40}});if(!current()||intent!==serial)return;rows.push(...page.items);cursor=page.nextCursor;paint();}catch{if(current()){owner.feedback.textContent=tc('主题暂未读完，请重试。');list.append(button(tc('重试读取主题'),load));}}finally{busy=false;}};
  search.oninput=paint;await load();if(!current())return selected;
  const create=button(tc('新建主题'),()=>{
   if(!current()||owner.submitPending)return;
   const input=element('input');input.setAttribute('aria-label',tc('新主题名称'));let creation=null,creating=false,unresolved=false,counted=false;
   const save=button(tc('创建主题'),async()=>{
    if(creating||!current()||owner.submitPending||!unresolved&&!input.value.trim())return;
    creating=true;save.disabled=true;input.readOnly=true;if(!counted){owner.pendingChoices++;counted=true;}owner.onChoicePending?.();
    try{if(!unresolved&&(!creation||creation.name!==input.value))creation={name:input.value,operationId:op()};const topic=creationResult(await request('CREATE_LIBRARY_TOPIC',{topic:creation}));unresolved=false;if(!current())return;rows.push({...topic,name:creation.name});selected.add(topic.id);input.remove();save.remove();paint();}
    catch(error){unresolved=unresolved||uncertainResult(error);if(current()){owner.feedback.textContent=tc(unresolved?'主题保存结果尚未确认，请重试核对。':'主题未保存，请重试。');save.disabled=false;}}
    finally{creating=false;if(!unresolved&&counted){owner.pendingChoices--;counted=false;}if(current()){input.readOnly=unresolved;owner.onChoicePending?.();}}
   });host.append(input,save);input.focus();
  });host.append(create);search.focus();return selected;
 }
 async add(selection,body){
  const intent=this.beginOpen();if(!await this.flush()||intent!==this.openIntent)return;if(!this.open(tc('加入主题')))return;
  const owner=this.surface;owner.content.append(element('p','muted',selection.span?tc('所选文字'):tc('整条输入 / 思想')),element('pre','topic-selection-preview',body));const selected=await this.topicChoices(owner.content,undefined,{owner}),requestIntent={...selection};if(!this.currentSurface(owner))return;
  let attempt=null,uncertain=false;
  const submit=button(tc('加入'),async()=>{
   if(!this.currentSurface(owner)||submit.disabled||owner.pendingChoices||owner.submitPending)return;
   if(!uncertain&&!selected.size){owner.feedback.textContent=tc('请选择至少一个主题。');return;}
   submit.disabled=true;owner.submitPending=true;owner.content.inert=true;
   try{
    const topicIds=[...selected];if(!uncertain&&(!attempt||JSON.stringify(attempt.topicIds)!==JSON.stringify(topicIds)))attempt={...requestIntent,operationId:op(),topicIds};
    const submitted=attempt,result=await request('ADD_TO_TOPICS',{selection:submitted});
    if(result?.conflict){uncertain=false;if(this.currentSurface(owner))owner.feedback.textContent=tc('这段内容已变化，请重新确认。');return;}
    creationResult(result);uncertain=false;attempt=null;
    const unchanged=selected.size===submitted.topicIds.length&&submitted.topicIds.every(id=>selected.has(id));
    if(unchanged)this.close(true,owner);else if(this.currentSurface(owner))owner.feedback.textContent=tc('先前选择已加入主题。这里的新选择仍未提交。');
    this.notify(tc('已加入主题'));this.onAdded?.(submitted.topicIds[0],result.id);
   }catch(error){uncertain=uncertain||uncertainResult(error);if(this.currentSurface(owner))owner.feedback.textContent=tc(uncertain?'加入结果尚未确认，请重试核对先前选择。':'尚未加入，选择和范围仍在这里。请重试。');}
   finally{owner.submitPending=false;if(this.currentSurface(owner)){owner.content.inert=false;submit.disabled=owner.pendingChoices>0;}}
  });owner.onChoicePending=()=>{if(this.currentSurface(owner))submit.disabled=owner.submitPending||owner.pendingChoices>0;};owner.content.append(submit);
 }
 async compose({topicId,topicName='',inputId,quote='',relatedThought=null,isCurrent=()=>true}={}){
  if(this.surface?.workspace){this.draft?.focus();return;}
  const opening=this.beginOpen();if(!await this.flush()||!isCurrent()||opening!==this.openIntent)return;
  if(this.enterCompose){
   if(!this.close())return;const prepared={id:op(),intent:this.openIntent,trigger:document.activeElement,materialBound:!!(inputId||quote||relatedThought)};this.pendingCompose=prepared;
   let host;try{host=await this.enterCompose(prepared.id);}catch{if(this.pendingCompose===prepared)this.pendingCompose=null;return;}
   if(!host||this.pendingCompose!==prepared||!this.pendingComposeIs(prepared.id)){if(this.pendingCompose===prepared)this.pendingCompose=null;return;}
   this.pendingCompose=null;this.mountSurface(tc('写下想法'),{host,workspace:true,sessionId:prepared.id,trigger:prepared.trigger});
  }else if(!this.open(tc('补充今天的想法')))return;
  const intro=element('p','muted',tc(this.surface.workspace?'写下此刻的想法，不改写过去的输入。':'这会保存为今天的新想法，不修改以前的内容。'));if(this.surface.workspace)intro.className='muted thought-compose-intro';this.content.append(intro);
  if(quote){const detail=element('details');detail.append(element('summary','',tc('回应的文字')),element('pre','topic-selection-preview',quote));this.content.append(detail);this.quotePreview=detail;}
  let relate=null;
  if(relatedThought){const label=element('label','thought-response-choice');relate=element('input');relate.type='checkbox';relate.setAttribute('aria-label',tc('记录与这条内容的回应关系'));label.append(relate,document.createTextNode(tc('记录与这条内容的回应关系（可不选）')));this.content.append(label,element('p','muted',tc('只记录你选择的关系；新想法独立保存，不改写这条内容。')));}
  const draft=element('textarea','thought-draft');draft.setAttribute('aria-label',tc('今天的新想法'));draft.placeholder=tc('接着写…');this.content.append(draft);this.draft=draft;
  const owner=this.surface,session={draft,feedback:owner.feedback,attempt:null,acknowledged:null,pending:false,uncertain:false,composing:false};this.composeSession=session;
  const current=()=>this.currentSurface(owner)&&this.composeSession===session&&this.draft===draft&&draft.isConnected;
  draft.addEventListener('compositionstart',()=>session.composing=true);draft.addEventListener('compositionend',()=>session.composing=false);
  const destination=element('p','muted thought-compose-destination',topicId?tc('保存到当前主题'):tc('暂不加入主题'));this.content.append(destination);
  let selected=topicId?new Set([topicId]):new Set();
  if(owner.workspace){const names=new Map(topicId&&topicName?[[topicId,topicName]]:[]);owner.onChoiceChange=(chosen,rows=[])=>{if(!current())return;for(const row of rows)names.set(row.id,row.name);destination.textContent=!chosen.size?tc('暂不加入主题'):chosen.size>1?tc('已选择多个主题，保存前请保留一个。'):names.has([...chosen][0])?tc('主题')+'：'+names.get([...chosen][0]):tc('已选择一个主题');};owner.onChoiceChange(selected);}
  const choices=element('details');choices.append(element('summary','',tc('选择主题（可不选）')));const host=element('div');choices.append(host);this.content.append(choices);
  choices.addEventListener('toggle',()=>{if(choices.open&&!choices.dataset.loaded){choices.dataset.loaded='true';void this.topicChoices(host,topicId,{owner,selected});}});
  const submit=button(tc('保存想法'),async()=>{
   if(session.pending||session.composing||!current()||owner.pendingChoices||owner.closing)return;
   // An uncertain acknowledgement is reconciled with its original payload;
   // newer text is never silently substituted into that idempotent request.
   if(!session.uncertain){
    if(!draft.value.trim()){session.feedback.textContent=tc('先写下一点内容。');return;}
    if(selected.size>1){session.feedback.textContent=tc('新想法先选一个主题；保存后可加入更多主题。');return;}
   }
   session.pending=true;owner.submitPending=true;choices.inert=true;if(relate)relate.disabled=true;submit.disabled=true;
   try{
    if(!session.uncertain||!session.attempt){
     const body=draft.value,selectedTopic=[...selected][0],relation=relate?.checked?{id:relatedThought.id,expectedRevision:relatedThought.revision,expectedBodySha256:await hashText(relatedThought.body)}:undefined;
     if(!current())return;
     const acknowledged=session.acknowledged;
     if(acknowledged&&acknowledged.body===body&&acknowledged.topicId===selectedTopic&&JSON.stringify(acknowledged.relation)===JSON.stringify(relation)){if(!session.composing&&draft.value===body&&selected.size<2&&[...selected][0]===selectedTopic&&!!relate?.checked===!!relation)this.close(true,owner);return;}
     if(!session.attempt||session.attempt.body!==body||session.attempt.topicId!==selectedTopic||JSON.stringify(session.attempt.relation)!==JSON.stringify(relation))session.attempt={operationId:op(),body,...(inputId?{inputId}:{}),...(selectedTopic?{topicId:selectedTopic}:{}),...(relation?{relation}:{})};
    }
    const submitted=session.attempt,result=await request('CONTINUE_THINKING',{thought:submitted});
    if(result?.conflict){session.uncertain=false;if(result.relatedChanged){if(current())session.feedback.textContent=tc('回应的内容刚有变化；新想法尚未保存，文字仍在这里。取消关联可独立保存，或重新打开原内容核对。');return;}throw Error('CONFLICT');}
    creationResult(result);session.acknowledged=submitted;session.attempt=null;session.uncertain=false;
    if(current()){
     const unchanged=!session.composing&&draft.value===submitted.body&&selected.size<2&&[...selected][0]===submitted.topicId&&!!relate?.checked===!!submitted.relation;
     if(unchanged)this.close(true,owner);
     else session.feedback.textContent=tc('先前提交已保存。这里的新文字或选择尚未保存，仍保留在此。');
    }
    this.notify(tc('已保存新想法'));this.onCreated?.(result.id);
   }catch(error){
    session.uncertain=session.uncertain||uncertainResult(error);
    if(current())session.feedback.textContent=tc(session.uncertain?'保存结果尚未确认，文字保留。再次保存会先核对上次提交。':'尚未保存，文字仍在这里。可以重试或复制。');
   }finally{session.pending=false;owner.submitPending=false;if(current()){choices.inert=false;if(relate)relate.disabled=false;submit.disabled=owner.pendingChoices>0;}}
  });
  owner.onChoicePending=()=>{if(current())submit.disabled=session.pending||owner.pendingChoices>0;};
  draft.onkeydown=event=>{if((event.ctrlKey||event.metaKey)&&event.key==='Enter'&&!event.isComposing){event.preventDefault();submit.click();}};
  const copy=button(tc('复制当前文字'),()=>copyReadingText(draft.value)),cancel=button(tc('取消'),()=>this.close(false,owner));
  if(owner.workspace){this.content.insertBefore(destination,draft);this.content.insertBefore(choices,draft);choices.className='thought-compose-topics';submit.className='thought-compose-save';copy.className='thought-compose-copy';const actions=element('div','thought-compose-actions');actions.append(submit,cancel,copy);this.content.append(actions);}else this.content.append(submit,copy,cancel);
  draft.focus();
 }
 async inspectRelations(id){
  const intent=this.beginOpen();if(!await this.flush()||intent!==this.openIntent)return;const result=await request('COMPARE_THOUGHT_INPUT',{id});if(intent!==this.openIntent||!this.open(tc('想法关联')))return;
  const owner=this.surface;this.comparing=true;owner.content.append(element('p','muted',tc('这里只显示你明确选择的关系，不自动判断观点变化。')));if(!result.relations?.length)owner.content.append(element('p','',tc('这条想法没有记录回应关系。')));
  for(const relation of result.relations||[]){const row=element('section','thought-relation');row.append(element('h3','',tc('回应的内容')));if(relation.state==='current'){row.append(element('pre','topic-selection-preview',relation.body),button(tc('查看关联内容'),()=>{if(!this.currentSurface(owner))return;this.close(true,owner);this.onThought(relation.id);}));}else row.append(element('p','muted',tc(relation.state==='changed'?'关联内容已变化，请重新核对；不把当前文字当作当时版本。':'关联内容已不可用；这条独立想法仍保留。')));owner.content.append(row);}
 }
 async compare(id,{source=false}={}){
  const intent=this.beginOpen();if(!await this.flush()||intent!==this.openIntent)return;const result=await request('COMPARE_THOUGHT_INPUT',{id});if(intent!==this.openIntent||!this.open(source?tc('查看当时记录'):tc('查看档案当前文字')))return;
  const owner=this.surface;this.comparing=true;
  if(source){for(const item of result.sources||[])owner.content.append(element('p','muted',item.sourceSentAt?new Date(item.sourceSentAt).toLocaleString():tc('发送时间未知')),element('pre','topic-selection-preview',item.body));if(!result.sources?.length)owner.content.append(element('p','',tc('当时记录已不可用。')));return;}
  owner.content.append(element('h3','',tc('这条思想')),element('pre','topic-selection-preview',result.entry.thoughtText),element('h3','',tc('档案当前文字')),element('pre','topic-selection-preview',result.input?.body||tc('当前档案不可用')),button(tc('保留我的修改'),()=>this.close(true,owner)));
  if(result.input)owner.content.append(button(tc('恢复为档案当前文字'),async()=>{if(!this.currentSurface(owner)||!confirm(tc('用已展示的档案当前文字替换这条思想，并保留人工旧版？')))return;try{const saved=await request('RESTORE_THOUGHT_INPUT',{edit:{id,operationId:op(),expectedRevision:result.entry.revision,expectedInputRevision:result.input.revision}});if(saved.conflict){if(this.currentSurface(owner))owner.feedback.textContent=tc('档案刚有更新，请核对后再保存。');return;}this.close(true,owner);this.notify(tc('已恢复为档案当前文字，并保留旧版本。'));}catch{if(this.currentSurface(owner))owner.feedback.textContent=tc('恢复尚未完成，请重试。');}}));
 }
}

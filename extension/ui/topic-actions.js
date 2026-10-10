import {thoughtCopy as tc} from './thought-copy.js';
import {request,element} from './common.js';
import {copyReadingText} from './reading-actions.js';
import {createThoughtComposeNodes,mountThoughtComposePresentation,composeCopy} from './thought-compose-presentation.js';
import {setIconLabel} from './icons.js';
const op=()=>crypto.randomUUID();
const creationResult=result=>{if(!result||typeof result.id!=='string'||!result.id.length||result.id.length>200){const error=Error('UNAVAILABLE');error.code='UNAVAILABLE';throw error;}return result;};
const uncertainResult=error=>['MESSAGE_CHANNEL_INTERRUPTED','UNAVAILABLE','TIMEOUT','WORKER_INTERRUPTED'].includes(error?.code);
const button=(text,run,icon)=>{const b=element('button','',text);if(icon)setIconLabel(b,icon,text);b.type='button';b.onclick=()=>void run();return b;};
export class TopicActions {
 constructor({flush,notify,onThought,onTopic}){Object.assign(this,{flush,notify,onThought,onTopic});this.dialog=element('dialog','topic-action-dialog');this.dialog.id='topic-action-dialog';this.dialog.setAttribute('aria-labelledby','topic-action-title');document.body.append(this.dialog);this.dialog.addEventListener('cancel',e=>{e.preventDefault();this.close();});this.dialog.addEventListener('paia:request-close',e=>{e.preventDefault();this.close();});window.addEventListener('beforeunload',e=>{if(this.draft?.value.trim()){e.preventDefault();e.returnValue='';}});chrome.runtime.onMessage.addListener(m=>{if(m.type==='ARCHIVE_CHANGED'&&this.quotePreview&&!['UPDATE_PREFERENCES','SET_ORGANIZER_CONTROLS','RECORD_TOPIC_READ','SET_THOUGHT_REVERSE_EDIT'].includes(m.cause)){this.quotePreview.remove();this.quotePreview=null;}if(m.type==='ARCHIVE_CHANGED'&&this.comparing&&!['UPDATE_PREFERENCES','RECORD_TOPIC_READ','SET_ORGANIZER_CONTROLS','SET_THOUGHT_REVERSE_EDIT'].includes(m.cause)){this.dialog.replaceChildren(element('p','',tc('内容已变化，请重新打开核对。')),button(tc('关闭'),()=>this.close(),'close'));this.comparing=false;}});}
 beginOpen(){return this.openIntent=(this.openIntent||0)+1;}
 currentSurface(owner){return !!owner&&this.surface===owner;}
 leave(){if(!this.surface){this.beginOpen();return true;}return this.close();}
 close(force=false,owner=this.surface){
  if(owner&&owner!==this.surface)return false;
  if(!force&&(this.composeSession?.composing||this.composeSession?.pending))return false;
  if(!force&&this.draft?.value.trim()&&!confirm(tc('文字尚未保存。放弃这份草稿？取消可保留在此继续写。')))return false;
  this.beginOpen();const trigger=owner?.trigger||this.trigger;this.surface=null;this.draft=null;this.composeSession=null;this.quotePreview=null;this.comparing=false;if(owner?.workspacePreview||owner?.workspace)owner.content.remove();else{this.dialog.close();this.dialog.replaceChildren();}if(owner?.workspace)this.onWorkspaceChange?.();trigger?.focus({preventScroll:true});return true;
 }
 open(title){
  if(!this.close())return false;
  this.trigger=document.activeElement;const head=element('header'),heading=element('h2','',title);heading.id='topic-action-title';this.feedback=element('p','topic-action-feedback');this.feedback.setAttribute('role','status');this.content=element('div','topic-action-content');
  const owner={content:this.content,feedback:this.feedback,trigger:this.trigger,pendingChoices:0,submitPending:false};this.surface=owner;
  head.append(heading,button(tc('关闭'),()=>this.close(false,owner),'close'));this.dialog.append(head,owner.content,owner.feedback);this.dialog.showModal();return true;
 }
 openComposePreview(host,workspace=false){
  if(!host?.isConnected||host.tagName==='DIALOG'||host.getAttribute?.('role')==='dialog')throw new TypeError('Compose preview requires a connected ordinary workspace host.');
  if(!this.close())return false;
  this.trigger=document.activeElement;this.content=element('section','thought-compose-workspace');this.feedback=element('p','topic-action-feedback');this.feedback.setAttribute('role','status');
  this.surface={content:this.content,feedback:this.feedback,trigger:this.trigger,pendingChoices:0,submitPending:false,workspacePreview:!workspace,workspace};host.append(this.content);if(workspace)this.onWorkspaceChange?.();return true;
 }
 async topicChoices(host,initial,{owner=this.surface,selected=new Set(initial?[initial]:[]),select=null,onChange=()=>{}}={}){
  const current=()=>this.currentSurface(owner),search=element('input'),list=element('div','topic-choice-list');if(!current())return selected;
  search.type='search';search.placeholder=tc('搜索主题');search.setAttribute('aria-label',tc('搜索主题'));host.append(search,list);let cursor=null,rows=[],busy=false,serial=0;
  const paintSelect=()=>{if(!select)return;const none=element('option','',tc('暂不加入主题'));none.value='';select.replaceChildren(none);for(const topic of rows){const option=element('option','',topic.name);option.value=topic.id;select.append(option);}for(const id of selected)if(!rows.some(topic=>topic.id===id)){const option=element('option','',tc('保存到当前主题'));option.value=id;select.append(option);}select.value=[...selected][0]||'';};
  const paint=()=>{if(!current())return;onChange(rows.find(topic=>selected.size===1&&selected.has(topic.id)));paintSelect();list.replaceChildren();for(const topic of rows.filter(topic=>topic.name.toLocaleLowerCase().includes(search.value.toLocaleLowerCase()))){const label=element('label'),box=element('input');box.type='checkbox';box.checked=selected.has(topic.id);box.onchange=()=>{if(!current()||owner.submitPending){box.checked=selected.has(topic.id);return;}if(select&&box.checked)selected.clear();box.checked?selected.add(topic.id):selected.delete(topic.id);onChange();if(select)paint();};label.append(box,document.createTextNode(topic.name));list.append(label);}if(cursor)list.append(button(tc('加载更多主题'),load));if(!rows.length)list.append(element('p','muted',tc('还没有主题，可以新建一个。')));};
  const load=async()=>{if(busy||!current())return;busy=true;const intent=++serial;try{const page=await request('LIBRARY_INDEX_PAGE',{options:{mode:'stable',cursor,limit:40}});if(!current()||intent!==serial)return;rows.push(...page.items);cursor=page.nextCursor;paint();}catch{if(current()){owner.feedback.textContent=tc('主题暂未读完，请重试。');list.append(button(tc('重试读取主题'),load));}}finally{busy=false;}};
  if(select){paintSelect();select.onchange=()=>{if(!current()||owner.submitPending){paintSelect();return;}const id=select.value;if(id&&!rows.some(topic=>topic.id===id)&&!selected.has(id)){paintSelect();return;}selected.clear();if(id)selected.add(id);paint();};}
  search.oninput=paint;await load();if(!current())return selected;
  const create=button(tc('新建主题'),()=>{
   if(!current()||owner.submitPending||owner.workspacePreview)return;
   const input=element('input');input.setAttribute('aria-label',tc('新主题名称'));let creation=null,creating=false,unresolved=false,counted=false;
   const save=button(tc('创建主题'),async()=>{
    if(creating||!current()||owner.submitPending||!unresolved&&!input.value.trim())return;
    creating=true;save.disabled=true;input.readOnly=true;if(!counted){owner.pendingChoices++;counted=true;}owner.onChoicePending?.();
    try{if(!unresolved&&(!creation||creation.name!==input.value))creation={name:input.value,operationId:op()};const topic=creationResult(await request('CREATE_LIBRARY_TOPIC',{topic:creation}));unresolved=false;if(!current())return;rows.push({...topic,name:creation.name});selected.add(topic.id);input.remove();save.remove();paint();}
    catch(error){unresolved=unresolved||uncertainResult(error);if(current()){owner.feedback.textContent=tc(unresolved?'主题保存结果尚未确认，请重试核对。':'主题未保存，请重试。');save.disabled=false;}}
    finally{creating=false;if(!unresolved&&counted){owner.pendingChoices--;counted=false;}if(current()){input.readOnly=unresolved;owner.onChoicePending?.();}}
   });host.append(input,save);input.focus();
  });host.append(create);if(owner.workspacePreview){create.disabled=true;const note=element('p','thought-compose-choice-note',composeCopy('外观预览不能创建主题；已有主题仍可选择。'));note.id='thought-compose-choice-note';create.setAttribute('aria-describedby',note.id);host.append(note);}else search.focus();return selected;
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
 async compose({topicId,sectionId,inputId,quote='',isCurrent=()=>true,workspacePreview=null,workspace=this.workspaceHost?{host:this.workspaceHost}:null}={}){
  if(!workspacePreview&&!workspace&&this.composePresentation)return this.composePresentation({topicId,sectionId,inputId,quote,isCurrent});
  const opening=this.beginOpen();if((!workspacePreview&&!await this.flush())||!isCurrent()||opening!==this.openIntent)return;
  if(!(workspacePreview||workspace?this.openComposePreview((workspacePreview||workspace).host,!!workspace&&!workspacePreview):this.open(tc('补充今天的想法'))))return;
  const nodes=createThoughtComposeNodes({topicId,quote}),{draft,choices,choiceHost:host}=nodes;this.draft=draft;this.quotePreview=nodes.quotePreview;
  const owner=this.surface,session={draft,feedback:owner.feedback,attempt:null,acknowledged:null,pending:false,uncertain:false,composing:false};this.composeSession=session;
  const current=()=>isCurrent()&&this.currentSurface(owner)&&this.composeSession===session&&this.draft===draft&&draft.isConnected;
  draft.addEventListener('compositionstart',()=>session.composing=true);draft.addEventListener('compositionend',()=>session.composing=false);
  let selected=topicId?new Set([topicId]):new Set(),destinationSection=sectionId,topicContext=null;
  const choiceChanged=topic=>{if(topicContext)topicContext.textContent=topic?.name||(selected.size?tc('保存到当前主题'):tc('暂不加入主题')); if(selected.size!==1||!selected.has(topicId))destinationSection=undefined;nodes.destination.textContent=destinationSection?(document.documentElement.lang==='en'?'Save to the selected section':'保存到所选章节'):tc(selected.size?'保存到当前主题':'暂不加入主题');};choiceChanged();
  choices.addEventListener('toggle',()=>{if(choices.open&&!choices.dataset.loaded){choices.dataset.loaded='true';void this.topicChoices(host,topicId,{owner,selected,onChange:choiceChanged});}});
  const submit=button(tc('保存想法'),async()=>{
   if(owner.workspacePreview||session.pending||session.composing||!current()||owner.pendingChoices)return;
   // An uncertain acknowledgement is reconciled with its original payload;
   // newer text is never silently substituted into that idempotent request.
   if(!session.uncertain){
    if(!draft.value.trim()){session.feedback.textContent=tc('先写下一点内容。');return;}
    if(selected.size>1){session.feedback.textContent=tc('新想法先选一个主题；保存后可加入更多主题。');return;}
   }
   session.pending=true;owner.submitPending=true;choices.inert=true;submit.disabled=true;
   try{
    if(!session.uncertain||!session.attempt){
     const body=draft.value,selectedTopic=[...selected][0],selectedSection=selectedTopic===topicId?destinationSection:undefined;
     if(!current())return;
     const acknowledged=session.acknowledged;
     if(acknowledged&&acknowledged.body===body&&acknowledged.topicId===selectedTopic&&acknowledged.sectionId===selectedSection){if(!session.composing&&draft.value===body&&selected.size<2&&[...selected][0]===selectedTopic&&(selectedTopic===topicId?destinationSection:undefined)===selectedSection)this.close(true,owner);return;}
     if(!session.attempt||session.attempt.body!==body||session.attempt.topicId!==selectedTopic||session.attempt.sectionId!==selectedSection)session.attempt={operationId:op(),body,...(inputId?{inputId}:{}),...(selectedTopic?{topicId:selectedTopic}:{}),...(selectedSection?{sectionId:selectedSection}:{})};
    }
    const submitted=session.attempt,result=await request('CONTINUE_THINKING',{thought:submitted});
    if(result?.conflict){session.uncertain=false;throw Error('CONFLICT');}
    creationResult(result);session.acknowledged=submitted;session.attempt=null;session.uncertain=false;
    if(current()){
     const unchanged=!session.composing&&draft.value===submitted.body&&selected.size<2&&[...selected][0]===submitted.topicId&&([...selected][0]===topicId?destinationSection:undefined)===submitted.sectionId;
     if(unchanged)this.close(true,owner);
     else session.feedback.textContent=tc('先前提交已保存。这里的新文字或选择尚未保存，仍保留在此。');
    }
    this.notify(tc('已保存新想法'));this.onCreated?.(result.id);
   }catch(error){
    session.uncertain=session.uncertain||uncertainResult(error);
    if(current())session.feedback.textContent=tc(session.uncertain?'保存结果尚未确认，文字保留。再次保存会先核对上次提交。':'尚未保存，文字仍在这里。可以重试或复制。');
   }finally{session.pending=false;owner.submitPending=false;if(current()){choices.inert=false;submit.disabled=owner.pendingChoices>0;}}
  });
  owner.onChoicePending=()=>{if(current())submit.disabled=owner.workspacePreview||session.pending||owner.pendingChoices>0;};
  draft.onkeydown=event=>{if((event.ctrlKey||event.metaKey)&&event.key==='Enter'&&!event.isComposing){event.preventDefault();submit.click();}};
  const copy=button(tc('复制当前文字'),()=>{if(current())return copyReadingText(draft.value);}),cancel=button(tc('取消'),()=>{if(!owner.workspacePreview)this.close(false,owner);});
  const presentation=mountThoughtComposePresentation({content:owner.content,feedback:owner.feedback,nodes,submit,copy,cancel,workspacePreview:!!workspacePreview,workspace:!!workspace});
  topicContext=presentation.context;choiceChanged();
  if(workspacePreview||workspace){choices.dataset.loaded='true';await this.topicChoices(host,topicId,{owner,selected,select:presentation.topicSelect,onChange:choiceChanged});}
  if(current()&&!workspacePreview)draft.focus();
 }
 async compare(id,{source=false}={}){
  const intent=this.beginOpen();if(!await this.flush()||intent!==this.openIntent)return;const result=await request('COMPARE_THOUGHT_INPUT',{id});if(intent!==this.openIntent||!this.open(source?tc('查看当时记录'):tc('查看档案当前文字')))return;
  const owner=this.surface;this.comparing=true;
  if(source){for(const item of result.sources||[])owner.content.append(element('p','muted',item.sourceSentAt?new Date(item.sourceSentAt).toLocaleString():tc('发送时间未知')),element('pre','topic-selection-preview',item.body));if(!result.sources?.length)owner.content.append(element('p','',tc('当时记录已不可用。')));return;}
  owner.content.append(element('h3','',tc('这条思想')),element('pre','topic-selection-preview',result.entry.thoughtText),element('h3','',tc('档案当前文字')),element('pre','topic-selection-preview',result.input?.body||tc('当前档案不可用')),button(tc('保留我的修改'),()=>this.close(true,owner)));
  if(result.input)owner.content.append(button(tc('恢复为档案当前文字'),async()=>{if(!this.currentSurface(owner)||!confirm(tc('用已展示的档案当前文字替换这条思想，并保留人工旧版？')))return;try{const saved=await request('RESTORE_THOUGHT_INPUT',{edit:{id,operationId:op(),expectedRevision:result.entry.revision,expectedInputRevision:result.input.revision}});if(saved.conflict){if(this.currentSurface(owner))owner.feedback.textContent=tc('档案刚有更新，请核对后再保存。');return;}this.close(true,owner);this.notify(tc('已恢复为档案当前文字，并保留旧版本。'));}catch{if(this.currentSurface(owner))owner.feedback.textContent=tc('恢复尚未完成，请重试。');}}));
 }
}

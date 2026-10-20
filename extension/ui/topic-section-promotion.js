import {request,element} from './common.js';
import {isComposing} from './session-lifecycle.js';
import {announce,showLocalFailure,setProductState} from './product-state.js';
import {thoughtCopy as tc} from './thought-copy.js';
const TYPE='PAIA_LIBRARY_SECTION_PROMOTION';
const proposalReasons=Object.freeze({direct_naming:'已有内容直接命名了独立主题。',direct_inputs:'已有输入直接支持独立主题。',independent_goal:'已有内容包含独立目标。',separate_reuse:'已有内容具有独立复用价值。'});
const call=(command,payload={})=>request(TYPE,{command,...payload});
const reference=value=>typeof value==='string'&&value.length>=1&&value.length<=200;
const button=(text,run)=>{const node=element('button','',text);node.type='button';node.addEventListener('click',()=>void Promise.resolve().then(run).catch(()=>showLocalFailure()));return node;};

// One ephemeral request per source Section. An uncertain confirmation is kept
// until the original durable result or signed work resolves it, never renamed
// or retried with a newly generated operation id.
export async function promoteTopicSection(workspace,section){
 if(workspace.sectionActionPending)return;
 const topicId=workspace.id,intent=workspace.openIntent,presentation=workspace.presentationIntent;
 const current=()=>workspace.id===topicId&&workspace.view==='original'&&workspace.openIntent===intent&&workspace.presentationIntent===presentation;
 const guard=()=>{if(!current()||[workspace.editor,workspace.aiEditor,workspace.dialogEditor].some(isComposing))throw Error('TOPIC_SECTION_ROUTE_CHANGED');};
 if(!topicId||!current()||[workspace.editor,workspace.aiEditor,workspace.dialogEditor].some(isComposing))return;
 const attempts=workspace.sectionPromotionAttempts??=new Map(),key=topicId+':'+section.sectionId;
 if(!attempts.has(key)&&attempts.size>=8){
  const released=[...attempts].find(([,request])=>request.uncertain===false&&request.token===null);
  if(released)attempts.delete(released[0]);else{workspace.onStatus(tc('已有待核对的章节提升，请先核对原请求。'));return;}
 }
 workspace.sectionActionPending=true;workspace.syncSectionActionControls();let draft=attempts.get(key);
 try{
  if(!await workspace.flushEditors())return;guard();
  if(!draft?.uncertain){
   const rows=await workspace.topicSectionRows();guard();const actual=rows.find(row=>row.sectionId===section.sectionId);
   if(!actual||actual.revision!==section.revision||actual.layoutGeneration!==section.layoutGeneration)throw Error('TOPIC_SECTION_CHANGED');
   const offered=await call('proposal',{request:{topicId,sectionId:section.sectionId}});let prepared;
   if(offered?.state==='pending'){
    if(!reference(offered.operationId)||offered.operationId.length<8)throw Error('INVALID_PROMOTION_RECOVERY');draft={kind:'ai',name:'',operationId:offered.operationId,uncertain:true,token:null};attempts.set(key,draft);guard();
   }else{
   if(offered?.state==='prepared'){
    draft={kind:'ai',name:offered.preview?.name,operationId:offered.operationId,uncertain:false,token:offered.token};attempts.set(key,draft);prepared=offered;guard();
   }else{
    guard();if(offered?.state!=='none')throw Error('INVALID_PROMOTION_PROPOSAL');
    const values=await workspace.form(tc('提升为独立主题'),[{key:'name',label:tc('新主题名称'),value:draft?.kind==='ai'?actual.title??'':draft?.name??actual.title??'',required:true,maxLength:300}],{submitLabel:tc('预览完整移动范围'),closeLabel:tc('取消')});guard();if(!values)return;
    draft={kind:'manual',name:values.name,operationId:crypto.randomUUID(),uncertain:false,token:null};attempts.set(key,draft);
    prepared=await call('prepare',{request:{topicId,sectionId:section.sectionId,selection:'whole_section',name:draft.name,operationId:draft.operationId}});draft.token=prepared.token;guard();
   }
   draft.preview=prepared.preview;const preview=prepared.preview;
   if(!reference(draft.operationId)||draft.operationId.length<8||!reference(draft.token)||typeof draft.name!=='string'||!draft.name.trim()||prepared.operationId!==draft.operationId||preview?.name!==draft.name||preview.sourceTopicId!==topicId||preview.sourceSectionId!==section.sectionId||preview.wholeSection!==true||preview.selectedCount!==preview.entryIds?.length||!preview.selectedCount)throw Error('INVALID_PROMOTION_PREVIEW');
   if(draft.kind==='ai'&&!Object.hasOwn(proposalReasons,preview.reason))throw Error('INVALID_PROMOTION_REASON');
   const labels=[];
   // Every actual placement id comes from the original full Section owner,
   // including offscreen entries. Titles are qualified through the old reader.
   for(const id of preview.entryIds){const entry=await request('GET_LIBRARY_ENTRY',{id});guard();labels.push(entry.title||entry.body?.slice(0,80)||tc('完整内容'));}
   const confirm=workspace.form(tc('确认提升章节'),[],{submitLabel:tc('确认移动并创建主题'),closeLabel:tc('取消')});
   const host=document.getElementById('library-dialog-content');
   host.append(element('p','',tc('新主题：')+preview.name),element('p','',tc('完整内容的位置数量：')+preview.selectedCount+'。 '+tc('正文和来源保持原样，父主题与旧章节位置保留，新主题的外部访问关闭。')));
   if(draft.kind==='ai')host.append(element('p','',tc('AI 提议，确认后才会移动。')),element('p','',tc('提议依据：')+tc(proposalReasons[preview.reason])));
   const list=element('ol');for(const label of labels)list.append(element('li','',label));host.append(list);
   const form=document.getElementById('library-form'),parent=form.parentElement;
   parent.insertBefore(host,form);
   let confirmed;try{confirmed=await confirm;}finally{parent.insertBefore(host,form.nextSibling);}
   guard();
   if(!confirmed){await call('cancel',{token:draft.token});attempts.delete(key);return;}
   }
  }
  let result;
  const saved=await workspace.mutate(async()=>{
   guard();
   if(draft.uncertain&&!draft.checkpointPending){result=await call(draft.kind==='ai'?'proposal_result':'result',{operationId:draft.operationId});guard();if(!['committed','unwritten'].includes(result.state))result=await call(draft.kind==='ai'?'proposal_resume':'resume',{operationId:draft.operationId});}
   else{draft.uncertain=true;draft.checkpointPending=false;try{result=await call('confirm',{token:draft.token,confirmed:true});}catch(error){if(error.phase==='promotion_checkpoint_pending')draft.checkpointPending=true;if(error.phase==='promotion_not_confirmed'||error.code==='BNS_GROUP_OWNER_UNSUPPORTED'){draft.uncertain=false;draft.token=null;if(draft.kind==='ai')attempts.delete(key);}throw error;}}
   guard();if(!['committed','unwritten'].includes(result?.state)||result.operationId!==draft.operationId||result.state==='unwritten'&&(draft.kind!=='ai'||result.sourceTopicId!==topicId||result.sourceSectionId!==section.sectionId||!reference(result.checkpointToken)))throw Error('UNCONFIRMED_PROMOTION');
   attempts.delete(key);
  });
  if(saved&&result?.state==='unwritten'&&current()){
   announce(tc('已核对原请求，确认未写入。'));
   try{await call('acknowledge',{token:result.checkpointToken});}catch{/* Keep the original durable history until its exact acknowledgment succeeds. */}
  }else if(saved&&result&&current()){
   const notice=announce((draft.name?tc('已创建新主题：')+draft.name+'。 ':'')+tc('已移动的位置数量：')+result.entryIds.length+'。 '+tc('正文保持原样。'));
   notice?.append(button(tc('打开新主题'),()=>workspace.openRootTarget(result.id,null)),button(tc('撤销这次移动'),async()=>{
    if(!current())return;const undoOperation=draft.undoOperation??=crypto.randomUUID();
    const changed=await workspace.mutate(async()=>{guard();const undone=await call('restore',{request:{historyOperationId:result.historyOperationId,side:'before',operationId:undoOperation}});guard();if(undone?.state!=='committed')throw Error('UNCONFIRMED_PROMOTION_RESTORE');});
    if(changed&&current())announce(tc('已按原位置历史撤销移动。正文保持原样。'));
   }));
   if(result.checkpointToken&&current())try{await call('acknowledge',{token:result.checkpointToken});}catch{/* The original committed result stays true; its unresolved locator is retained. */}
  }else if(current()&&draft.uncertain){workspace.onStatus(tc('提升结果尚未确认。再次选择此章节的提升操作会先核对原请求，不会创建第二个主题。'));const notice=announce(tc('提升结果尚未确认，请核对原请求。'));setProductState(notice,'partial');notice?.append(button(tc('核对提升结果'),()=>promoteTopicSection(workspace,section)));}else if(current()){const message=tc('确认未写入，名称仍保留。再次选择提升可重新预览。');workspace.onStatus(message,'error');setProductState(announce(message),'failed');}
 }catch(error){
  if(draft?.token&&!draft.uncertain)try{await call('cancel',{token:draft.token});attempts.delete(key);}catch{}
  if(current())workspace.onStatus(error?.code==='BNS_GROUP_OWNER_UNSUPPORTED'?tc('已配置的同步暂不支持这次结构操作，尚未开始确认或写入。'):draft?.uncertain?tc('提升结果尚未确认，请通过同一章节操作核对原请求。'):tc('提升未完成，当前正文和章节保持原样。'),'error');
 }finally{workspace.sectionActionPending=false;workspace.syncSectionActionControls();}
}

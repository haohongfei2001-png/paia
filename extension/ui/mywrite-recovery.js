import {MyWriteDraftError} from '../core/mywrite-draft.js';

// Detached explicit discovery only. The owning entrypoint must protect its
// current unsaved editor before accepting the metadata-only handoff.
export function createMyWriteRecovery({document,store,topics=[],onChoose}){
 if(!document?.createElement||!store?.list||!store?.review||typeof onChoose!=='function'||
    !Array.isArray(topics)||topics.some(t=>!t||typeof t.label!=='string'||
     !/^[A-Za-z0-9._:-]{1,128}$/.test(t.id))||new Set(topics.map(t=>t.id)).size!==topics.length)
  throw new MyWriteDraftError('MYWRITE_INVALID');
 const topicLabels=new Map(topics.map(t=>[t.id,t.label]));
 const element=document.createElement('section');element.className='mywrite-recovery';
 element.setAttribute('aria-label','找回本地草稿');
 const heading=document.createElement('h2');heading.textContent='找回本地草稿';
 const refresh=document.createElement('button');refresh.type='button';refresh.textContent='查找本地草稿';
 const rows=document.createElement('ul');rows.setAttribute('aria-label','已保存草稿');
 const more=document.createElement('button');more.type='button';more.textContent='更多本地草稿';more.hidden=true;
 const status=document.createElement('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 status.textContent='查找已保存的本地草稿。当前编辑的正文会保留。';
 element.append(heading,refresh,rows,more,status);
 let closed=false,pending=false,generation=0,after=null;
 const listeners=[],rowListeners=[];
 const on=(node,type,handler,list=listeners)=>{node.addEventListener(type,handler);list.push([node,type,handler]);};
 const clearRows=()=>{for(const [node,type,handler]of rowListeners)node.removeEventListener(type,handler);rowListeners.length=0;rows.replaceChildren();};
 const render=message=>{
  if(closed)return;if(message)status.textContent=message;
  more.hidden=after===null;more.disabled=pending;
  for(const button of rows.querySelectorAll('button'))button.disabled=pending;
 };
 const refuse=error=>{
  const code=error instanceof MyWriteDraftError?error.code:'MYWRITE_UNAVAILABLE';
  render(code==='MYWRITE_CONFLICT'||code==='MYWRITE_DELETED'?
   '这份草稿已经更改或删除。当前正文会保留，请重新查找。':
   code==='MYWRITE_CORRUPT'?'本地草稿无法核对。当前正文和已保存草稿会保留。':
   '本地草稿暂不可用。当前正文和已保存草稿会保留，可重新查找。');
 };
 const choose=async metadata=>{
  if(closed||pending)return;
  const token=++generation;pending=true;render('正在核对所选草稿…');
  try{
   const snapshot=await store.review(metadata.id,metadata.revision);
   if(closed||generation!==token)return;
   const reference=Object.freeze({id:snapshot.id,revision:snapshot.revision,
    createdAt:snapshot.createdAt,updatedAt:snapshot.updatedAt,topicId:snapshot.topicId});
   // Only explicit trusted selection reaches the owner. No body, Source/Input
   // promotion or implicit replacement of its current composer is performed.
   const accepted=await onChoose(reference);
   if(closed||generation!==token)return;
   render(accepted===true?'所选本地草稿已恢复。':'当前正文会保留。请先保存或保留正文，再选择草稿。');
  }catch(error){if(!closed&&generation===token)refuse(error);}
  finally{if(!closed&&generation===token){pending=false;render();}}
 };
 const append=metadata=>{
  const row=document.createElement('li'),button=document.createElement('button');
  button.type='button';
  const created=new Date(metadata.createdAt);
  const stamp=Number.isFinite(created.getTime())?created.toISOString():'时间暂不可显示';
  const label=metadata.topicId===null?'未选择 Topic':topicLabels.get(metadata.topicId)||'已保存的 Topic';
  button.textContent='恢复草稿 · '+stamp+' · '+label;
  on(button,'click',event=>{if(event.isTrusted)void choose(metadata);},rowListeners);
  row.append(button);rows.append(row);
 };
 const page=async reset=>{
  if(closed||(!reset&&(pending||after===null)))return;
  const token=++generation,anchor=reset?null:after;
  pending=true;render('正在查找已保存草稿…');
  if(reset){after=null;clearRows();}
  try{
   const result=await store.list({limit:20,after:anchor});
   if(closed||generation!==token)return;
   for(const metadata of result.items)append(metadata);
   after=result.after;render(rows.children.length?'选择要恢复的草稿。当前正文会保留。':'没有已保存的本地草稿。');
  }catch(error){if(!closed&&generation===token)refuse(error);}
  finally{if(!closed&&generation===token){pending=false;render();}}
 };
 on(refresh,'click',event=>{if(event.isTrusted)void page(true);});
 on(more,'click',event=>{if(event.isTrusted)void page(false);});
 return Object.freeze({element,dispose(){
  if(closed)return;closed=true;generation++;
  for(const [node,type,handler]of listeners)node.removeEventListener(type,handler);
  listeners.length=0;clearRows();topicLabels.clear();after=null;
  element.replaceChildren();element.remove();
 }});
}

import {MyWriteDraftError} from '../core/mywrite-draft.js';

// Detached UI over the shared local journal. A future entrypoint must admit
// its own platform/lifecycle and canonical manual-intake gates before use.
export function createMyWriteComposer({document,store,draftId,topics=[]}){
 if(!document?.createElement||!store?.read||!store?.save||!store?.review||
    !/^[A-Za-z0-9._:-]{1,128}$/.test(draftId)||
    !Array.isArray(topics)||topics.some(t=>!t||typeof t.label!=='string'||
     !/^[A-Za-z0-9._:-]{1,128}$/.test(t.id))||new Set(topics.map(t=>t.id)).size!==topics.length)
  throw new MyWriteDraftError('MYWRITE_INVALID');
 const element=document.createElement('section');
 element.className='mywrite-composer';element.setAttribute('aria-label','MyWrite 本地草稿');
 element.style.cssText='display:flex;flex-direction:column;gap:12px;max-width:680px;padding:16px;background:Canvas;color:CanvasText';
 const heading=document.createElement('h2');heading.textContent='写下想法';
 const label=document.createElement('label');label.textContent='正文';
 const body=document.createElement('textarea');
 body.rows=12;body.setAttribute('aria-label','草稿正文');
 body.style.cssText='box-sizing:border-box;width:100%;min-height:220px;resize:vertical;font:inherit';
 label.append(body);
 const topicLabel=document.createElement('label');topicLabel.textContent='Topic（可选）';
 const topic=document.createElement('select');topic.setAttribute('aria-label','草稿 Topic');
 const none=document.createElement('option');none.value='';none.textContent='暂不选择';topic.append(none);
 for(const item of topics){const option=document.createElement('option');option.value=item.id;option.textContent=item.label;topic.append(option);}
 topicLabel.append(topic);
 const actions=document.createElement('div');actions.style.cssText='display:flex;flex-wrap:wrap;gap:8px';
 const button=text=>{const node=document.createElement('button');node.type='button';node.textContent=text;actions.append(node);return node;};
 const save=button('保存本地草稿'),review=button('查看完整草稿'),fork=button('保留正文并另存新草稿');
 const status=document.createElement('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const preview=document.createElement('section');preview.hidden=true;preview.setAttribute('aria-label','完整草稿预览');
 const previewText=document.createElement('textarea');previewText.readOnly=true;previewText.rows=12;
 previewText.setAttribute('aria-label','完整草稿正文');previewText.style.cssText=body.style.cssText;
 const close=document.createElement('button');close.type='button';close.textContent='关闭预览';
 preview.append(previewText,close);element.append(heading,label,topicLabel,actions,status,preview);
 let closed=false,loaded=false,pending=false,blocked=false,composition=false,generation=0;
 let currentId=draftId,ack=null,dirty=false,retry=null,reviewSnapshot=null;
 const listeners=[];
 const on=(node,type,handler)=>{node.addEventListener(type,handler);listeners.push([node,type,handler]);};
 const uuid=()=>document.defaultView.crypto.randomUUID();
 const closePreview=()=>{preview.hidden=true;previewText.value='';reviewSnapshot=null;};
 const render=message=>{
  if(closed)return;
  if(message!==undefined)status.textContent=message;
  save.disabled=!loaded||pending||blocked||composition||!dirty;
  review.disabled=!loaded||pending||blocked||composition||dirty||!ack;
  fork.hidden=!blocked;fork.disabled=!loaded||pending||composition;
 };
 const messages={
  MYWRITE_STORAGE_FULL:'本地空间不足。正文仍在这里；腾出空间后可重试保存。',
  MYWRITE_CONFLICT:'另一窗口已修改草稿。你的正文仍在这里；可另存为新草稿。',
  MYWRITE_DELETED:'这份草稿已被删除。你的正文仍在这里；可另存为新草稿。',
  MYWRITE_INVALID:'完整正文无法保存。请保留正文并检查长度或 Topic。',
  MYWRITE_CORRUPT:'本地草稿无法核对。你的正文仍在这里；可另存为新草稿。',
  MYWRITE_UNAVAILABLE:'本地保存暂不可用。正文仍在这里；可重试。',
  MYWRITE_CLOSED:'本地保存暂不可用。正文仍在这里。',
  MYWRITE_LIMIT:'草稿版本无法继续保存。正文仍在这里；可另存为新草稿。',
  MYWRITE_INVALID_TIME:'保存时间暂不可用。正文仍在这里；可重试。'
 };
 const refused=error=>{
  const code=error instanceof MyWriteDraftError?error.code:'MYWRITE_UNAVAILABLE';
  if(['MYWRITE_CONFLICT','MYWRITE_DELETED','MYWRITE_CORRUPT','MYWRITE_LIMIT'].includes(code))blocked=true;
  render(messages[code]||messages.MYWRITE_UNAVAILABLE);
 };
 const changed=event=>{
  if(closed||!event.isTrusted)return;
  generation++;dirty=true;closePreview();
  render('正文尚未保存。');
 };
 on(body,'input',changed);on(topic,'change',changed);
 on(body,'compositionstart',event=>{if(event.isTrusted&&!closed){composition=true;generation++;closePreview();render('正在输入，完成后可保存。');}});
 on(body,'compositionend',event=>{if(event.isTrusted&&!closed){composition=false;render(dirty?'正文尚未保存。':'本地草稿已保存。');}});
 // Blur never manufactures a compositionend or saves an uncertain draft.
 const persist=async fresh=>{
  if(closed||!loaded||pending||composition||(!fresh&&(!dirty||blocked)))return;
  closePreview();pending=true;
  const token=++generation,text=body.value,topicId=topic.value||null;
  if(fresh){currentId='draft:'+uuid();ack=null;retry=null;blocked=false;}
  render('正在保存完整草稿…');
  try{
   // Changed typing cannot discard an unacknowledged operation. Resolve its
   // complete committed identity before choosing the next CAS baseline. This
   // read occurs only on the next explicit save; it never replays old text.
   if(retry&&(retry.text!==text||retry.topicId!==topicId)){
    const uncertain=retry,row=await store.read(currentId);
    if(closed)return;
    if(row?.lifecycle==='deleted')throw new MyWriteDraftError('MYWRITE_DELETED');
    const committed=row?.lastWriteId===uncertain.operationId&&
     row.baseRevision===uncertain.expectedRevision&&row.text===uncertain.text&&
     row.topicId===uncertain.topicId;
    const unchanged=(row?.revision||0)===uncertain.expectedRevision&&
     (!ack||JSON.stringify(row)===JSON.stringify(ack));
    if(!committed&&!unchanged)throw new MyWriteDraftError('MYWRITE_CONFLICT');
    ack=row;retry=null;
   }
   if(closed)return;
   const command=retry&&retry.text===text&&retry.topicId===topicId?retry:{
    id:currentId,expectedRevision:ack?.revision||0,text,topicId,operationId:'save:'+uuid()
   };
   retry=command;
   const row=await store.save(command);
   if(closed)return;
   ack=row;retry=null;dirty=body.value!==row.text||(topic.value||null)!==row.topicId||generation!==token;
   render(dirty?'已保存刚才的完整草稿；当前更改尚未保存。':'本地草稿已保存。');
  }catch(error){if(!closed)refused(error);}
  finally{pending=false;render();}
 };
 on(save,'click',event=>{if(event.isTrusted)void persist(false);});
 on(fork,'click',event=>{if(event.isTrusted)void persist(true);});
 on(review,'click',async event=>{
  if(!event.isTrusted||closed||review.disabled)return;
  const token=++generation;pending=true;render('正在核对完整草稿…');
  try{
   const snapshot=await store.review(currentId,ack.revision);
   if(closed||generation!==token||dirty||composition)return;
   reviewSnapshot=snapshot;previewText.value=snapshot.text;preview.hidden=false;
   const created=new Date(snapshot.createdAt);
   render('完整本地草稿。创建时间：'+(Number.isFinite(created.getTime())?created.toISOString():'暂不可显示')+'。');
   previewText.focus();
  }catch(error){if(!closed&&generation===token)refused(error);}
  finally{pending=false;render();}
 });
 on(close,'click',event=>{if(event.isTrusted&&!closed){generation++;closePreview();render();body.focus();}});
 render('正在读取本地草稿；你可以开始输入。');
 const ready=(async()=>{
  const token=generation;
  try{
   const row=await store.read(currentId);
   if(closed)return;
   loaded=true;
   if(row?.lifecycle==='deleted'){blocked=true;render(messages.MYWRITE_DELETED);return;}
   ack=row;
   if(generation!==token){blocked=Boolean(row);render(blocked?
    '已有草稿已保留；当前输入未被替换。可另存为新草稿。':'正文尚未保存。');return;}
   if(row){
    body.value=row.text;
    if(row.topicId!==null&&!topics.some(t=>t.id===row.topicId)){
     const retained=document.createElement('option');retained.value=row.topicId;retained.textContent='已保存的 Topic';topic.append(retained);
    }
    topic.value=row.topicId||'';
   }
   render(row?'本地草稿已恢复。':'开始写作，完成后保存本地草稿。');
  }catch(error){if(!closed){loaded=true;blocked=true;refused(error);}}
 })();
 return Object.freeze({element,ready,canReplace(){
  return !closed&&loaded&&!pending&&!composition&&!dirty&&!retry&&!blocked;
 },getDraftReference(){
  return closed||!ack?null:Object.freeze({id:ack.id,revision:ack.revision});
 },dispose(){
  if(closed)return;closed=true;generation++;
  for(const [node,type,handler]of listeners)node.removeEventListener(type,handler);
  listeners.length=0;closePreview();body.value='';topic.replaceChildren();ack=retry=reviewSnapshot=null;
  element.replaceChildren();element.remove();
 }});
}

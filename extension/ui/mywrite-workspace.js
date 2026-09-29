import {createMyWriteVoicePanel} from './mywrite-voice-review.js';
import {MyWriteDraftError} from '../core/mywrite-draft.js';
import {createMyWriteComposer} from './mywrite-composer.js';
import {createMyWriteRecovery} from './mywrite-recovery.js';

// Shared local write/recovery owner, independent of platform/account/Source
// activation. The caller owns the store lifetime and the initial draft identity.
export function createMyWriteWorkspace({document,store,draftId,topics=[],voiceFlow=null}){
 if(!document?.createElement||!store?.read||!store?.save||!store?.review||!store?.list||
    !Array.isArray(topics))throw new MyWriteDraftError('MYWRITE_INVALID');
 const labels=topics.map(item=>Object.freeze({id:item?.id,label:item?.label}));
 let composer=createMyWriteComposer({document,store,draftId,topics:labels});
 const element=document.createElement('section');element.className='mywrite-workspace';
 element.setAttribute('aria-label','MyWrite 本地写作');
 element.style.cssText='display:flex;flex-direction:column;gap:12px;width:100%;min-width:0;box-sizing:border-box;background:Canvas;color:CanvasText';
 const style=document.createElement('style');
 style.textContent='.mywrite-workspace .mywrite-composer{box-sizing:border-box;width:100%;min-width:0}.mywrite-workspace button,.mywrite-workspace select{font:inherit;max-width:100%;box-sizing:border-box}.mywrite-workspace li{overflow-wrap:anywhere}';
 const create=document.createElement('button');create.type='button';create.textContent='新建本地草稿';
 const status=document.createElement('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const host=document.createElement('div');host.className='mywrite-workspace-editor';host.append(composer.element);
 const voice=voiceFlow===null?null:createMyWriteVoicePanel({document,flow:voiceFlow,
  onReviewedText:text=>composer.appendReviewedVoice(text)});
 let closed=false,pending=false,generation=0,candidate=null;
 const render=message=>{if(closed)return;if(message)status.textContent=message;create.disabled=pending;};
 const protectedWork=()=>render('当前正文会保留。请先保存，再新建或恢复草稿。');
 const switchTo=async(id,revision)=>{
  if(closed||pending)return false;
  const prior=composer;
  if(!prior.canReplace()||(voice&&!voice.canLeave())){protectedWork();return false;}
  const token=++generation;pending=true;render('正在核对本地草稿…');
  let next=null;
  try{
   next=createMyWriteComposer({document,store,draftId:id,topics:labels,expectedRevision:revision});
   candidate=next;
   const result=await next.ready;
   if(closed||generation!==token)return false;
   if(!result?.ok)throw new MyWriteDraftError(result?.code||'MYWRITE_UNAVAILABLE');
   // Keep the old editor alive while the complete selected body is read.
   // New typing, save/IME activity or disposal cannot be erased by its reply.
   if(composer!==prior||!prior.canReplace()){protectedWork();return false;}
   const reference=next.getDraftReference();
   if(!next.canReplace()||(revision===0?reference!==null:
      reference?.id!==id||reference.revision!==revision))
    throw new MyWriteDraftError('MYWRITE_CONFLICT');
   host.replaceChildren(next.element);
   composer=next;candidate=null;next=null;prior.dispose();
   render(revision===0?'新草稿已打开。完成后保存本地草稿。':'所选本地草稿已恢复。');
   const editor=composer.element.querySelector('textarea');editor?.focus();
   return true;
  }catch(error){
   if(!closed&&generation===token)render(error instanceof MyWriteDraftError&&
    ['MYWRITE_CONFLICT','MYWRITE_DELETED'].includes(error.code)?
    '所选草稿已经更改或删除。当前正文会保留，请重新查找。':
    '本地草稿暂不可用。当前正文会保留，可重试。');
   throw error;
  }finally{
   next?.dispose();
   if(candidate===next)candidate=null;
   if(!closed&&generation===token){pending=false;render();}
  }
 };
 const recover=createMyWriteRecovery({document,store,topics:labels,onChoose:reference=>switchTo(reference.id,reference.revision)});
 const newDraft=async event=>{
  if(!event.isTrusted||closed||pending)return;
  if(!composer.canReplace()||(voice&&!voice.canLeave())){protectedWork();return;}
  try{await switchTo('draft:'+document.defaultView.crypto.randomUUID(),0);}
  catch(error){
   if(!closed)render(error instanceof MyWriteDraftError&&error.code==='MYWRITE_CONFLICT'?
    '新草稿身份无法核对。当前正文会保留，可重新新建。':
    '本地草稿暂不可用。当前正文会保留，可重试。');
  }
 };
 create.addEventListener('click',newDraft);
 element.append(style,create,host,...(voice?[voice.element]:[]),recover.element,status);
 const ready=composer.ready;
 return Object.freeze({element,ready,canReplace:()=>!closed&&!pending&&composer.canReplace()&&(!voice||voice.canLeave()),
  getDraftReference:()=>closed?null:composer.getDraftReference(),dispose(){
   if(closed)return;closed=true;generation++;
   create.removeEventListener('click',newDraft);
   candidate?.dispose();candidate=null;voice?.dispose();recover.dispose();composer.dispose();labels.length=0;
   status.textContent='';element.replaceChildren();element.remove();
  }});
}

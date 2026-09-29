// Detached human review in the target document. No provider/page transport is
// registered. A trusted invoker must already own the saved-template reader.
import {createPromptInputSession} from './prompt-input-session.js';
import {createPromptInsertionController} from './prompt-insertion-controller.js';
import {copyReadingText} from './reading-actions.js';
import {planPromptDraftInsertion,PromptDraftInsertionError} from '../core/prompt-draft-insertion.js';

const messages={
 PROMPT_STALE:'模板已更新。请重新选择当前模板。',
 PROMPT_UNAVAILABLE:'模板已不可用。请重新选择。',
 PROMPT_INSERT_STALE:'草稿或确认已变化。请关闭后重新确认。',
 PROMPT_TARGET_UNSUPPORTED:'此输入框暂不支持插入。可复制完整正文后手动粘贴。',
 PROMPT_TARGET_UNAVAILABLE:'输入框当前不可用。可复制完整正文后手动粘贴。',
 PROMPT_COMPOSING:'输入法尚未结束。请关闭窗口，完成输入后再确认。',
 PROMPT_COMPOSITION_UNKNOWN:'请关闭窗口，完成输入后再确认。',
 PROMPT_INPUT_NORMALIZATION:'输入框会改变正文换行。请复制完整正文后手动粘贴。',
 PROMPT_INSERT_LIMIT:'完整正文超出输入框限制。可复制完整正文后手动粘贴。',
 CONSENT_REQUIRED:'请先同意本机归档，再读取模板。',
 FORBIDDEN:'此读取尚未获准。',
};
const fail=code=>{throw new PromptDraftInsertionError(code);};
function selected(value){
 if(!value||typeof value!=='object')fail('PROMPT_INSERT_INVALID');
 const ds=Object.getOwnPropertyDescriptors(value);
 if(Reflect.ownKeys(ds).length!==2||!ds.id||!ds.expectedRevision
  ||Reflect.ownKeys(ds).some(k=>typeof k!=='string'||!Object.hasOwn(ds[k],'value')||!ds[k].enumerable)
  ||typeof ds.id.value!=='string'||!ds.id.value.length
  ||!Number.isSafeInteger(ds.expectedRevision.value)||ds.expectedRevision.value<1)fail('PROMPT_INSERT_INVALID');
 return Object.freeze({id:ds.id.value,expectedRevision:ds.expectedRevision.value});
}
function fullSaved(row,selection){
 if(!row||typeof row!=='object')fail('PROMPT_INSERT_INVALID');
 const ds=Object.getOwnPropertyDescriptors(row),out={};
 for(const k of ['kind','id','revision','lifecycle','text']){
  if(!ds[k]||!Object.hasOwn(ds[k],'value')||!ds[k].enumerable)fail('PROMPT_INSERT_INVALID');
  out[k]=ds[k].value;
 }
 if(out.kind!=='template'||out.lifecycle!=='active'||out.id!==selection.id
  ||out.revision!==selection.expectedRevision)fail('PROMPT_STALE');
 planPromptDraftInsertion({mode:'append',text:out.text,draft:'',expectedDraft:''});
 return out.text;
}
function errorCode(error){
 try{const ds=Object.getOwnPropertyDescriptor(error,'code');
  if(ds&&Object.hasOwn(ds,'value')&&typeof ds.value==='string'&&Object.hasOwn(messages,ds.value))return ds.value;
 }catch{/* No foreign message/body/accessor is read. */}
 return 'UNAVAILABLE';
}
export function createPromptInsertionReview({target,trigger,selection,readTemplate}){
 const document=target?.ownerDocument,window=document?.defaultView;
 if(!window||window.top!==window||document!==globalThis.document||window!==globalThis.window
  ||trigger?.ownerDocument!==document
  ||typeof readTemplate!=='function')fail('PROMPT_INSERT_INVALID');
 const current=selected(selection);
 const make=(tag,text)=>{const node=document.createElement(tag);if(text)node.textContent=text;return node;};
 const dialog=make('dialog');dialog.className='prompt-insertion-review';
 const title=make('h2','插入 Prompt'),help=make('p','只写入当前输入框；发送由你在原页面完成。');
 const preview=make('textarea');preview.readOnly=true;preview.rows=12;preview.setAttribute('aria-label','完整模板正文');
 const draft=make('textarea');draft.readOnly=true;draft.rows=6;draft.setAttribute('aria-label','当前草稿全文');
 const status=make('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const confirmation=make('input');confirmation.type='checkbox';
 const label=make('label','我确认替换此输入框中的整个现有草稿');label.prepend(confirmation);
 const append=make('button','追加到当前草稿'),replace=make('button','替换整个草稿'),
  copy=make('button','复制完整正文'),close=make('button','取消');
 for(const button of [append,replace,copy,close])button.type='button';
 dialog.append(title,help,make('h3','完整模板正文'),preview,make('h3','当前草稿全文'),draft,status,label,append,replace,copy,close);
 document.body.append(dialog);
 let disposed=false,serial=0,busy=false,controller=null,token=null,complete='',inputSession=null;
 // Keep one target tracker for the review lifetime, including close/reopen.
 // A modal or an unavailable preparation cannot erase an unfinished IME.
 // Creating this tracker reads no draft and grants no template read or write.
 try{inputSession=createPromptInputSession(target);}
 catch(error){if(errorCode(error)!=='PROMPT_TARGET_UNSUPPORTED')throw error;}
 function scopedSession(){
  let closed=false,pending=null;
  return Object.freeze({
   prepare(text){
    if(closed)fail('PROMPT_INSERT_STALE');
    pending?.cancel();pending=inputSession.prepare(text);return pending;
   },
   dispose(){if(closed)return;closed=true;pending?.cancel();pending=null;}
  });
 }
 const say=text=>{status.textContent=text;};
 const controls=()=>{
  append.disabled=busy||!token;replace.disabled=busy||!token||!confirmation.checked;
  copy.disabled=busy||!complete;confirmation.disabled=busy||!token;
 };
 const clear=()=>{
  serial++;controller?.dispose();controller=null;token=null;complete='';
  preview.value='';draft.value='';confirmation.checked=false;busy=false;say('');controls();
 };
 function shut(){
  if(!dialog.open)return;clear();dialog.close();if(trigger.isConnected)trigger.focus({preventScroll:true});
 }
 const trusted=event=>event instanceof window.Event&&event.isTrusted;
 function report(error){const code=errorCode(error);say(messages[code]||'结果尚未确认。请重新读取模板；未自动重试。');}
 async function open(event){
  if(disposed||dialog.open||!trigger.isConnected||!trusted(event)||event.currentTarget!==trigger)return false;
  clear();const generation=serial;busy=true;controls();say('正在读取完整模板…');
  let candidate='';
  try{
   // The already-installed tracker observes the invoker's focus change.
   // Unsupported targets keep the full-copy path without any draft read.
   if(inputSession){
    const session=scopedSession();
    controller=createPromptInsertionController({session,readTemplate:async selection=>{
     const row=await readTemplate(selection),text=fullSaved(row,selection);
     if(generation===serial&&dialog.open)candidate=text;
     return row;
    }});
   }
   dialog.showModal();
   if(controller){
    try{
     token=await controller.prepare(current);
     if(generation!==serial||!dialog.open)return false;
     complete=candidate;
     const value=Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value');
     draft.value=value.get.call(target);
     say('确认完整正文和当前草稿。默认追加；替换需要明确勾选。');
    }catch(error){
     if(generation!==serial||!dialog.open)return false;
     complete=candidate;token=null;controller.dispose();controller=null;report(error);
    }
   }else{
    const text=fullSaved(await readTemplate(current),current);
    if(generation!==serial||!dialog.open)return false;
    complete=text;say(messages.PROMPT_TARGET_UNSUPPORTED);
   }
   preview.value=complete;return !!complete;
  }catch(error){
   if(generation===serial&&dialog.open){complete='';preview.value='';draft.value='';report(error);}
   return false;
  }finally{if(generation===serial){busy=false;controls();}}
 }
 async function commit(event,mode){
  if(!trusted(event)||busy||!token||(mode==='replace'&&!confirmation.checked))return;
  const generation=serial,prepared=token;busy=true;controls();say('正在核对当前模板与草稿…');
  try{
   await prepared.commit(mode==='replace'?{mode,replaceConfirmed:true}:{mode});
   if(generation!==serial||!dialog.open)return;
   // Exactly one DOM write. Never click/send/Enter or replay an unknown result.
   token=null;controller?.dispose();controller=null;complete='';preview.value='';draft.value='';
   confirmation.checked=false;say('完整正文已写入草稿。请回到原页面检查并由你发送。');
  }catch(error){if(generation===serial&&dialog.open){token=null;report(error);}}
  finally{if(generation===serial){busy=false;controls();}}
 }
 async function manualCopy(event){
  if(!trusted(event)||busy||!complete)return;
  const generation=serial;token?.cancel();token=null;busy=true;controls();say('正在核对完整模板…');
  try{
   const text=fullSaved(await readTemplate(current),current);
   if(generation!==serial||!dialog.open)return;
   const copied=await copyReadingText(text);
   if(generation===serial&&dialog.open)say(copied?'完整正文已复制。请由你粘贴。':'请在复制窗口选择完整正文，再使用系统复制。');
  }catch(error){if(generation===serial&&dialog.open){complete='';preview.value='';draft.value='';report(error);}}
  finally{if(generation===serial){busy=false;controls();}}
 }
 append.addEventListener('click',event=>void commit(event,'append'));
 replace.addEventListener('click',event=>void commit(event,'replace'));
 copy.addEventListener('click',event=>void manualCopy(event));
 confirmation.addEventListener('change',controls);
 close.addEventListener('click',shut);
 dialog.addEventListener('cancel',event=>{event.preventDefault();shut();});
 dialog.addEventListener('close',()=>{if(!dialog.open)clear();});
 controls();
 return Object.freeze({
  open,close:shut,
  dispose(){if(disposed)return;disposed=true;clear();inputSession?.dispose();inputSession=null;if(dialog.open)dialog.close();dialog.remove();}
 });
}

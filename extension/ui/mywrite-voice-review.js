import {MyWriteVoiceError} from '../core/mywrite-voice-review.js';

// Detached review surface. The owning platform injects capture/transcription
// into the flow and explicitly accepts full corrected text into its editor.
export function createMyWriteVoicePanel({document,flow,onReviewedText}={}){
 if(!document?.createElement||!flow?.start||!flow?.stop||!flow?.cancel||
    !flow?.accept||!flow?.state||!flow?.dispose||typeof onReviewedText!=='function')
  throw new MyWriteVoiceError('MYWRITE_VOICE_INVALID');
 const element=document.createElement('section');element.className='mywrite-voice-review';
 element.setAttribute('aria-label','语音想法审阅');
 element.style.cssText='display:flex;flex-direction:column;gap:8px;min-width:0;max-width:680px';
 const heading=document.createElement('h2');heading.textContent='语音想法';
 const actions=document.createElement('div');actions.style.cssText='display:flex;flex-wrap:wrap;gap:8px';
 const button=label=>{const node=document.createElement('button');node.type='button';node.textContent=label;actions.append(node);return node;};
 const start=button('开始录音'),stop=button('停止并转写'),cancel=button('取消录音或审阅');
 const review=document.createElement('label');review.textContent='核对并修改完整转写';
 const body=document.createElement('textarea');body.rows=12;body.setAttribute('aria-label','完整语音转写');
 body.style.cssText='box-sizing:border-box;width:100%;min-height:220px;resize:vertical;font:inherit';
 review.append(body);review.hidden=true;
 const apply=button('将核对后的全文加入草稿');
 const status=document.createElement('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 element.append(heading,actions,review,status);
 let closed=false,pending=false,token=0,reviewGeneration=null,retained=null;
 const listeners=[];
 const on=(node,type,handler)=>{node.addEventListener(type,handler);listeners.push([node,type,handler]);};
 const redraw=message=>{
  if(closed)return;
  if(message!==undefined)status.textContent=message;
  const phase=flow.state().phase;
  start.disabled=pending||phase!=='idle'||retained!==null;
  stop.disabled=pending||phase!=='recording';
  cancel.disabled=phase==='idle'&&!pending&&retained===null;
  apply.disabled=pending||(phase!=='review'&&retained===null);
  review.hidden=phase!=='review'&&retained===null;
 };
 const refuse=error=>{
  const code=error instanceof MyWriteVoiceError?error.code:'MYWRITE_VOICE_UNAVAILABLE';
  redraw(code==='MYWRITE_VOICE_TRANSCRIPT_INVALID'?'全文不可用；转写与更正均已保留，请检查长度。':
   code==='MYWRITE_VOICE_TRANSCRIPTION_FAILED'?'转写失败。请取消后重试；不会自动保存。':
   code==='MYWRITE_VOICE_CANCELLED'?'录音已取消；不会保存。':
   '录音暂不可用。不会自动保存。');
 };
 on(start,'click',event=>{if(!event.isTrusted||closed||start.disabled)return;
  const mine=++token;pending=true;redraw('正在启动录音…');
  void flow.start().then(()=>{
   if(closed||mine!==token)return;redraw('正在录音。完成后请停止并核对全文。');
  }).catch(error=>{if(!closed&&mine===token)refuse(error);}).finally(()=>{
   if(!closed&&mine===token){pending=false;redraw();}
  });
 });
 on(stop,'click',event=>{if(!event.isTrusted||closed||stop.disabled)return;
  const mine=++token;pending=true;redraw('正在转写；请核对完整结果。');
  void flow.stop().then(result=>{
   if(closed||mine!==token)return;
   reviewGeneration=result.generation;body.value=result.text;
   redraw('请修改并核对完整转写。仅显式加入草稿，不会自动保存。');body.focus();
  }).catch(error=>{if(!closed&&mine===token)refuse(error);}).finally(()=>{
   if(!closed&&mine===token){pending=false;redraw();}
  });
 });
 on(cancel,'click',event=>{if(!event.isTrusted||closed||cancel.disabled)return;
  const mine=++token;pending=false;reviewGeneration=null;retained=null;body.value='';
  redraw('正在取消录音或审阅…');
  void flow.cancel().then(()=>{if(!closed&&mine===token)redraw('已取消；不会保存。');})
   .catch(error=>{if(!closed&&mine===token)refuse(error);});
 });
 on(apply,'click',event=>{if(!event.isTrusted||closed||apply.disabled)return;
  try{
   if(retained===null)retained=flow.accept({generation:reviewGeneration,text:body.value});
   // The callback is synchronous and returns true only after the owning editor
   // has retained the exact full text. Refusal leaves it visible for retry.
   if(onReviewedText(retained)!==true){
    redraw('当前草稿暂不能接收全文；转写仍在这里，请保留后重试。');return;
   }
   retained=null;reviewGeneration=null;body.value='';
   redraw('核对后的全文已加入草稿。请显式保存本地草稿。');
  }catch(error){refuse(error);}
 });
 redraw('显式开始录音。不会后台监听或自动保存。');
 async function interrupt(reason){
  if(closed)throw new MyWriteVoiceError('MYWRITE_VOICE_DISPOSED');
  if(!['background','lock','call','offline','microphone_denied'].includes(reason))
   throw new MyWriteVoiceError('MYWRITE_VOICE_INVALID');
  if(retained!==null||flow.state().phase==='review'){
   redraw('录音已中断；完整转写仍在这里，请核对后显式加入草稿。');
   return Object.freeze({action:'review_retained'});
  }
  if(flow.state().phase==='idle')return Object.freeze({action:'idle'});
  const mine=++token;pending=false;reviewGeneration=null;body.value='';
  try{await flow.cancel();
   if(!closed&&mine===token)redraw('录音已中断；不会转写或自动保存。');
   return Object.freeze({action:'capture_cancelled'});
  }catch(error){if(!closed&&mine===token)refuse(error);throw new MyWriteVoiceError('MYWRITE_VOICE_UNAVAILABLE');}
 }
 return Object.freeze({element,interrupt,canLeave:()=>!closed&&!pending&&retained===null&&flow.state().phase==='idle',dispose(){
  if(closed)return;closed=true;token++;
  for(const [node,type,handler]of listeners)node.removeEventListener(type,handler);
  listeners.length=0;reviewGeneration=null;retained=null;body.value='';
  void flow.dispose();element.replaceChildren();element.remove();
 }});
}

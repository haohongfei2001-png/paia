// Explicit user-initiated text copying only. Never reads the clipboard.
export async function copyReadingText(text,{fallback=true,signal=null,isCurrent=()=>true}={}){
 if(typeof text!=='string')return;
 const current=()=>!signal?.aborted&&isCurrent();if(!current())return false;
 try{await navigator.clipboard.writeText(text);return current();}
 catch{
  if(!fallback||!current())return false;
  const dialog=document.createElement('dialog');dialog.className='reading-copy-dialog';
  const title=document.createElement('h2');title.textContent='复制内容';
  const help=document.createElement('p');help.textContent='浏览器未允许直接复制。选中文字后使用系统复制。';
  const body=document.createElement('textarea');body.value=text;body.readOnly=true;body.setAttribute('aria-label','待复制正文');
  const close=document.createElement('button');close.type='button';close.textContent='完成';const cleanup=()=>{body.value='';signal?.removeEventListener('abort',cleanup);if(dialog.open)dialog.close();dialog.remove();};close.addEventListener('click',cleanup);dialog.addEventListener('close',cleanup,{once:true});signal?.addEventListener('abort',cleanup,{once:true});dialog.append(title,help,body,close);document.body.append(dialog);dialog.showModal();body.focus();body.select();return false;
 }
}
// At most one button-owned copy/fallback stays live. This retires UI work only:
// a clipboard write already handed to the browser cannot be recalled.
let cancelReadingButtonCopy=null;
export function readingCopyButton(readText,onError=()=>{}){
 const button=document.createElement('button');button.type='button';button.className='reading-copy';button.textContent='复制';button.setAttribute('aria-label','复制整条正文');
 const mounted=()=>button.isConnected&&!document.hidden&&!button.closest('[hidden],[inert],dialog:not([open])');
 button.addEventListener('click',async()=>{
  if(button.disabled||!mounted())return;
  cancelReadingButtonCopy?.();
  const controller=new AbortController(),current=()=>!controller.signal.aborted&&mounted();let observer,timer;
  const cancel=()=>{
   if(controller.signal.aborted)return;
   controller.abort();observer?.disconnect();clearTimeout(timer);
   document.removeEventListener?.('visibilitychange',check);globalThis.removeEventListener?.('pagehide',cancel);
   if(cancelReadingButtonCopy===cancel)cancelReadingButtonCopy=null;
   button.disabled=false;button.textContent='复制';
  };
  const check=()=>{if(!current())cancel();};
  cancelReadingButtonCopy=cancel;
  document.addEventListener?.('visibilitychange',check);globalThis.addEventListener?.('pagehide',cancel);
  if(typeof MutationObserver==='function'){
   observer=new MutationObserver(check);
   observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','inert','open']});
  }
  button.disabled=true;
  try{
   const text=await readText();if(!current()){cancel();return;}
   const copied=await copyReadingText(text,{signal:controller.signal,isCurrent:current});
   if(!current()){cancel();return;}
   if(copied){button.textContent='已复制';timer=setTimeout(cancel,1200);}
   // A denied current copy can leave the original manual-copy dialog open.
   // Keep its signal until departure/new copy so its retained text is erased.
  }catch{if(current())onError('内容尚未读完，未复制旧文本。请重试。','error');cancel();}
  finally{if(!controller.signal.aborted)button.disabled=false;}
 });return button;
}

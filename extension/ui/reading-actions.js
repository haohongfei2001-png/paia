// Explicit user-initiated text copying only. Never reads the clipboard.
export async function copyReadingText(text){
 if(typeof text!=='string')return;
 try{await navigator.clipboard.writeText(text);return true;}
 catch{
  const dialog=document.createElement('dialog');dialog.className='reading-copy-dialog';
  const title=document.createElement('h2');title.textContent='复制内容';
  const help=document.createElement('p');help.textContent='浏览器未允许直接复制。选中文字后使用系统复制。';
  const body=document.createElement('textarea');body.value=text;body.readOnly=true;body.setAttribute('aria-label','待复制正文');
  const close=document.createElement('button');close.type='button';close.textContent='完成';close.addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>dialog.remove(),{once:true});dialog.append(title,help,body,close);document.body.append(dialog);dialog.showModal();body.focus();body.select();return false;
 }
}
export function readingCopyButton(readText,onError=()=>{}){
 const button=document.createElement('button');button.type='button';button.className='reading-copy';button.textContent='复制';button.setAttribute('aria-label','复制整条正文');
 button.addEventListener('click',async()=>{button.disabled=true;try{const text=await readText(),copied=await copyReadingText(text);if(copied){button.textContent='已复制';setTimeout(()=>{if(button.isConnected)button.textContent='复制';},1200);}}catch{onError('内容尚未读完，未复制旧文本。请重试。','error');}finally{button.disabled=false;}});return button;
}

import {request,element} from './common.js';
const copy=(zh,en)=>document.documentElement.lang==='en'?en:zh;
// Compatibility is restrictive-only. The existing trusted flag is the sole
// authority; stopping it never flushes, rewrites or discards an editor draft.
export function mountReverseEditOptOut(host,entry,{send=request,pauseDrafts=()=>{}}={}){
 if(entry?.reverseEditEnabled!==true)return null;
 const control=element('button','thought-reverse-edit-disable',copy('停止同时修改档案','Stop also editing Archive'));
 control.type='button';control.dataset.reverseEditDisable='true';control.dataset.reverseEditInput=String(entry.bodyBinding==='input');let stopping=false;
 const feedback=element('span','thought-reverse-edit-feedback');feedback.setAttribute('role','status');
 control.addEventListener('pointerdown',event=>{event.preventDefault();pauseDrafts();});
 control.addEventListener('focus',()=>pauseDrafts());
 // Native keyboard focus into this restrictive action must not first trigger
 // the entry owner's normal blur-save against the still-enabled flag.
 const row=host.closest?.('[data-entry-id]')||host;
 row.addEventListener('focusout',event=>{if(event.relatedTarget===control||event.target===control&&stopping)event.stopPropagation();});
 control.addEventListener('click',async()=>{
  if(control.disabled)return;stopping=true;pauseDrafts();control.disabled=true;
  feedback.textContent=copy('正在停止…','Stopping…');
  try{
   const result=await send('SET_THOUGHT_REVERSE_EDIT',{enabled:false});
   if(result?.enabled!==false)throw Error('REVERSE_EDIT_NOT_CONFIRMED');
   for(const other of document.querySelectorAll('[data-reverse-edit-disable]')){other.disabled=true;other.textContent=copy('已停止同时修改档案','Archive linkage stopped');const binding=other.closest?.('[data-entry-id]')?.querySelector('.thought-binding-status');if(binding&&other.dataset.reverseEditInput==='true')binding.textContent=copy('此后只修改思想','Future edits change only the Thought');}
   entry.reverseEditEnabled=false;
   feedback.textContent=copy('此后的编辑只修改思想。当前草稿与已有文字保留。','Future edits change only the Thought. Current drafts and saved text are kept.');
  }catch{control.disabled=false;feedback.textContent=copy('未确认停止，原设置仍可能有效。草稿保留，请重试。','Stopping was not confirmed; the previous setting may still apply. Your draft is kept. Retry.');}finally{stopping=false;}
 });
 host.append(control,feedback);return control;
}

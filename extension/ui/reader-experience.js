import {request,element} from './common.js';
import {copyReadingText} from './reading-actions.js';
import {safeOffset} from '../core/reader-state.js';
export const readerCopy=(zh,en)=>document.documentElement.lang==='en'?en:zh;
const $=id=>document.getElementById(id);
export function confirmReaderAction({title,text,confirm='确认',danger=false,content=null}){
 const prior=document.activeElement,dialog=element('dialog','reader-confirm'),heading=element('h2','',title),body=element('p','',text),cancel=element('button','',readerCopy('取消','Cancel')),ok=element('button',danger?'danger':'primary',confirm);
 heading.id='reader-confirm-title';dialog.setAttribute('aria-labelledby',heading.id);cancel.autofocus=true;dialog.append(heading,body);if(content)dialog.append(content);dialog.append(cancel,ok);document.body.append(dialog);
 return new Promise(resolve=>{let accepted=false;cancel.onclick=()=>dialog.close();ok.onclick=()=>{accepted=true;dialog.close();};dialog.addEventListener('close',()=>{dialog.remove();prior?.isConnected&&prior.focus({preventScroll:true});resolve(accepted);},{once:true});dialog.showModal();cancel.focus();});
}
function offsetAt(el){
 const selection=document.getSelection();if(selection?.rangeCount&&el.contains(selection.anchorNode)){const r=document.createRange();r.selectNodeContents(el);try{r.setEnd(selection.anchorNode,selection.anchorOffset);return r.toString().length;}catch{}}
 const rect=el.getBoundingClientRect(),y=Math.min(innerHeight-20,Math.max(100,rect.top+8)),x=Math.max(20,rect.left+8);
 const point=document.caretPositionFromPoint?.(x,y),range=!point&&document.caretRangeFromPoint?.(x,y),node=point?.offsetNode||range?.startContainer,offset=point?.offset??range?.startOffset;
 if(node&&el.contains(node)){const r=document.createRange();r.selectNodeContents(el);r.setEnd(node,offset);return r.toString().length;}return 0;
}
function textPoint(el,offset){const walk=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let node;while((node=walk.nextNode())){if(offset<=node.length)return {node,offset};offset-=node.length;}return {node:el,offset:el.childNodes.length};}
export class ReaderExperience {
 constructor({read,notify,menu,reload}){
  this.read=read;this.notify=notify;this.menu=menu;this.reload=reload;this.timer=null;this.expanded=new Set();this.active=false;this.lastInput=null;
  this.onScroll=()=>this.schedule();window.addEventListener('scroll',this.onScroll,{passive:true});document.addEventListener('visibilitychange',()=>{if(document.hidden)this.cancel();else this.schedule();});
  $('document-body').addEventListener('focusin',e=>{const el=e.target.closest('[data-edit-id]');if(el){this.lastInput=el.dataset.editId;this.expand(el);}});
  $('document-body').addEventListener('input',()=>this.schedule());
  document.addEventListener('selectionchange',()=>this.selection());
  this.onResize=()=>{if(!this.active)return;const mobile=matchMedia('(max-width: 799px)').matches;for(const el of $('document-page').querySelectorAll('[contenteditable]'))if(el!==document.activeElement&&!this.read().editor?.composing)el.contentEditable=mobile?'false':'plaintext-only';};window.addEventListener('resize',this.onResize);
  this.toolbar=element('div','reader-selection');this.toolbar.hidden=true;this.toolbar.setAttribute('role','toolbar');this.toolbar.setAttribute('aria-label',readerCopy('所选文字','Selected text'));const copy=element('button','',readerCopy('复制所选文字','Copy selection'));copy.addEventListener('pointerdown',e=>e.preventDefault());copy.addEventListener('click',()=>void copyReadingText(this.selectedText));this.toolbar.append(copy);$('document-panel').append(this.toolbar);
  const recovery=element('button','',readerCopy('复制当前文字','Copy current text'));recovery.id='reader-copy-buffer';recovery.hidden=true;recovery.addEventListener('click',()=>{const {editor}=this.read();if(!editor)return;editor.collect();void copyReadingText([...editor.entries.values()].filter(e=>!e.local.excluded).map(e=>editor.text(e)).join('\n\n'));});$('retry').after(recovery);
  new MutationObserver(()=>{recovery.hidden=$('retry').hidden&&$('reload-document').hidden;}).observe($('save-status'),{childList:true,subtree:true});
 }
 cancel(){clearTimeout(this.timer);this.timer=null;}
 schedule(){this.cancel();const {editor,view,documentId}=this.read();if(!this.active||view!=='library'||!documentId||!editor||document.hidden||document.querySelector('dialog[open]'))return;this.timer=setTimeout(()=>void this.remember(false),3000);}
 capture(){
  const {editor,view,documentId,state}=this.read();if(view!=='library'||!editor||!documentId)return null;
  const fields=[...$('document-body').querySelectorAll('[data-edit-id]')].filter(el=>!el.closest('.library-block').hidden&&el.getBoundingClientRect().bottom>100&&el.getBoundingClientRect().top<innerHeight);
  const focused=fields.find(el=>el===document.activeElement),field=focused||fields[0];if(!field)return null;const e=editor.entries.get(field.dataset.editId);if(!e||e.local.excluded)return null;
  return {documentId,inputId:field.dataset.editId,revision:e.revision,offset:safeOffset(editor.text(e),offsetAt(field)),sort:state.readingSort||'asc',expanded:[...this.expanded].slice(-100)};
 }
 async remember(explicit=true){
  if(document.hidden&&!explicit)return false;const {editor}=this.read();if(!editor||editor.composing)return false;
  const anchor=this.capture();if(!anchor)return false;
  if(editor.dirty()){if(!explicit)return false;if(!await editor.flush())return false;anchor.revision=editor.entries.get(anchor.inputId)?.revision??anchor.revision;}
  try{const result=await request('PAIA_READER_SAVE',{anchor});if(explicit)this.notify(result.saved?readerCopy('已记住这里。','Reading position saved.'):readerCopy('内容刚有变化，请再记一次。','The content changed. Save this position again.'));if(result.saved)document.dispatchEvent(new Event('paia:reading-saved'));return result.saved;}catch{if(explicit)this.notify(readerCopy('阅读位置尚未保存，正文仍在这里。','Reading position was not saved; your text is still here.'));return false;}
 }
 async restore(anchor){
  if(!anchor)return;const field=[...$('document-body').querySelectorAll('[data-edit-id]')].find(el=>el.dataset.editId===anchor.inputId);if(!field)return;
  this.expanded=new Set(anchor.expanded||[]);for(const el of $('document-body').querySelectorAll('[data-edit-id]'))if(this.expanded.has(el.dataset.editId))this.expand(el);this.expand(field);const p=textPoint(field,anchor.offset||0),r=document.createRange();r.setStart(p.node,p.offset);r.collapse(true);const rect=r.getBoundingClientRect();
  if(rect.height||rect.width)window.scrollBy(0,rect.top-140);else field.scrollIntoView({block:'center'});
  if(anchor.nearby)this.notify(readerCopy('原位置已移除，从附近继续。','The original position was removed. Continuing nearby.'));
 }
 mount(){
  this.active=true;const {view,editor}=this.read();if(view!=='library'||!editor){this.active=false;return;}
  const mobile=matchMedia('(max-width: 799px)').matches,body=$('document-body');
  $('document-title').contentEditable=mobile?'false':'plaintext-only';$('reader-title-edit')?.remove();const titleEdit=element('button','reader-mobile-title-edit',readerCopy('编辑标题','Edit title'));titleEdit.id='reader-title-edit';titleEdit.onclick=async()=>{const title=$('document-title');if(title.contentEditable==='false'){title.contentEditable='plaintext-only';titleEdit.textContent=readerCopy('完成','Done');title.focus();}else{editor.collect();if(!await editor.flush())return;title.contentEditable='false';titleEdit.textContent=readerCopy('编辑标题','Edit title');title.blur();}};$('document-title').after(titleEdit);
  this.mountRows(body);
  if(!body.querySelector('.library-block')){const empty=element('p','reader-empty',readerCopy('这篇暂时没有显示内容，可在设置中查看最近收起或已移除的内容。','This document has no visible inputs. Hidden and removed items are available in Settings.'));body.append(empty);}
  this.schedule();
 }
 mountRows(body){
  const {editor}=this.read(),mobile=matchMedia('(max-width: 799px)').matches;
  for(const section of body.querySelectorAll('.library-block')){
   const prose=section.querySelector('.library-prose');if(!prose)continue;prose.contentEditable=mobile?'false':'plaintext-only';
   const actions=element('div','reader-margin-actions'),more=element('button','reader-more','···');more.setAttribute('aria-label',readerCopy('这条输入的更多操作','More actions for this input'));more.onclick=()=>{this.lastInput=section.dataset.blockId;const r=more.getBoundingClientRect();this.menu(section.dataset.blockId,r.left,r.bottom);};
   actions.append(more);section.append(actions);
   const edit=element('button','reader-mobile-edit',readerCopy('编辑','Edit'));edit.onclick=async()=>{
    if(prose.contentEditable!=='false'){editor.collect();if(!await editor.flush())return;prose.contentEditable='false';edit.textContent=readerCopy('编辑','Edit');prose.blur();}
    else{this.expand(prose);prose.contentEditable='plaintext-only';edit.textContent=readerCopy('完成','Done');prose.focus();}
   };actions.append(edit);
   if(!this.expanded.has(prose.dataset.editId)&&prose.getBoundingClientRect().height>innerHeight*1.5){const expand=element('button','reader-expand',readerCopy(`展开全文 · 约 ${[...prose.innerText].length} 字`,`Expand full text · ${[...prose.innerText].length} characters`));prose.classList.add('reader-collapsed');expand.onclick=()=>this.expand(prose);section.append(expand);}
  }
 }
 expand(prose){this.expanded.add(prose.dataset.editId);prose.classList.remove('reader-collapsed');prose.closest('.library-block')?.querySelector('.reader-expand')?.remove();}
 unmount(){this.cancel();this.active=false;this.toolbar.hidden=true;}
 selection(){
  const selection=document.getSelection();const range=selection?.rangeCount?selection.getRangeAt(0):null;
  if(!this.active||!range||selection.isCollapsed||!$('document-body').contains(range.commonAncestorContainer)){this.toolbar.hidden=true;return;}
  this.selectedText=selection.toString();this.toolbar.hidden=!this.selectedText;
 }
}

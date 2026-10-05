import {element} from './common.js';
import {copyReadingText} from './reading-actions.js';
const copy=(zh,en)=>document.documentElement.lang==='en'?en:zh;

// Only identifiers are retained by restoreRecovery. Read the current editor;
// never keep another draft body or revision base in this presentation.
export function recoveredInputFields(owner,state=null){
 const recovered=owner?.recoveryConflict;
 if(!recovered||owner.disposed||!owner.conflicted||owner.id!==recovered.documentId||state?.recoveryEpoch&&state.recoveryEpoch!==owner.recovery?.epoch)return [];
 const fields=[];
 if(recovered.title&&owner.title!==owner.savedTitle)fields.push({id:'title',kind:'title',text:owner.title});
 let position=0;
 for(const id of recovered.inputIds){
  const entry=owner.entries.get(id),current=state?.library?.blocks?.find(block=>block.id===id);
  if(!entry||state?.unavailableTrackedInputIds?.includes(id)||Number.isInteger(current?.recoveryPurgeRevision)&&current.recoveryPurgeRevision>entry.revision)continue;
  position++;
  if(entry.local.libraryText!==entry.saved.libraryText&&(entry.local.libraryText!==null||!current||current.provenanceSignature===entry.signature))fields.push({id:id+':body',kind:'body',position,text:owner.text(entry)});
  if(entry.local.note!==entry.saved.note)fields.push({id:id+':note',kind:'note',position,text:entry.local.note});
  if(entry.local.excluded!==entry.saved.excluded)fields.push({id:id+':visibility',kind:'visibility',position,excluded:entry.local.excluded});
 }
 return fields;
}
// Check both current and returned page metadata around asynchronous comparison.
// Other dirty Inputs can have been collected before the recovery read finished.
export function recoveredInputInvalidated(owner,state){
 if(!owner?.recoveryConflict||!state)return false;
 if(state.recoveryEpoch&&state.recoveryEpoch!==owner.recovery?.epoch)return true;
 const ids=new Set([...owner.recoveryConflict.inputIds,...[...owner.entries].filter(([,entry])=>['libraryText','note','excluded'].some(field=>entry.local[field]!==entry.saved[field])).map(([id])=>id)]);
 return [...ids].some(id=>{const entry=owner.entries.get(id),current=state.library?.blocks?.find(block=>block.id===id);return !entry||state.unavailableTrackedInputIds?.includes(id)||current&&(current.provenanceSignature!==entry.signature||Number.isInteger(current.recoveryPurgeRevision)&&current.recoveryPurgeRevision>entry.revision);});
}
function fieldLabel(field,total){
 if(field.kind==='title')return copy('标题','Title');
 const label=field.kind==='note'?copy('备注','Note'):field.kind==='visibility'?copy('显示状态','Visibility'):copy('正文','Body');
 return total>1?label+' · '+field.position:label;
}
const fieldText=field=>field.kind==='visibility'?(field.excluded?copy('已移出档案','Removed from archive'):copy('在档案中显示','Visible in archive')):field.text;
export function recoveredInputCopy(fields){return fields.map(field=>fields.length===1&&field.kind==='body'?fieldText(field):fieldLabel(field,fields.length)+'\n'+fieldText(field)).join('\n\n');}

// No navigation, recovery, save, rebase or clear lives here. The original button
// and listener remain the only comparison entry; busy state is presentation-only.
export class InputRecoveryPresentation{
 constructor({host,compare,read}){
  this.read=read;this.compare=compare;this.copyIntent=0;this.home={parent:compare.parentNode,next:compare.nextSibling};
  this.root=element('section');this.root.id='input-recovery-presentation';this.root.hidden=true;this.root.setAttribute('aria-labelledby','input-recovery-title');
  const column=element('div','input-recovery-column'),header=element('header');
  this.heading=element('h1');this.heading.id='input-recovery-title';this.heading.tabIndex=-1;this.subtitle=element('p','input-recovery-subtitle');header.append(this.heading,this.subtitle);
  this.warning=element('section','input-recovery-warning');this.warning.setAttribute('role','alert');this.warningHeading=element('h2');this.warningText=element('p');this.warningText.id='input-recovery-warning-text';this.warning.append(this.warningHeading,this.warningText);
  const draft=element('section','input-recovery-draft');this.label=element('h2');this.fields=element('div');this.fields.id='input-recovery-fields';draft.append(this.label,this.fields);
  const footer=element('footer','input-recovery-footer');this.note=element('p');this.note.id='input-recovery-note';this.actions=element('div','input-recovery-actions');this.copyButton=element('button');this.copyButton.type='button';this.copyButton.id='input-recovery-copy';
  this.copyButton.addEventListener('click',()=>void this.copyDraft());this.actions.append(this.copyButton);footer.append(this.note,this.actions);column.append(header,this.warning,draft,footer);this.root.append(column);host.append(this.root);
  document.addEventListener('paia:preferences-applied',()=>this.sync());
 }
 current(){const {view,documentId,editor}=this.read();return view==='library'&&documentId===editor?.id&&!editor.disposed?editor:null;}
 async copyDraft(){
  const owner=this.current();if(owner!==this.owner)return;const fields=recoveredInputFields(owner,this.read().state);this.sync();if(!fields.length||owner!==this.owner)return;
  const text=recoveredInputCopy(fields),intent=++this.copyIntent,copied=await copyReadingText(text,{fallback:false});
  if(intent!==this.copyIntent||owner!==this.current()||owner!==this.owner||recoveredInputCopy(recoveredInputFields(owner,this.read().state))!==text)return;
  this.copyButton.textContent=copied?copy('已复制','Copied'):copy('未能复制，请选择文字复制','Copy failed; select the text to copy');
 }
 beginComparison(owner){if(owner!==this.owner||this.compareOwner)return false;this.compareOwner=owner;this.compare.disabled=true;return true;}
 endComparison(owner){if(this.compareOwner!==owner)return;this.compareOwner=null;if(this.owner===owner)this.compare.disabled=this.compareCopy.disabled;}
 watchComparison(owner,content){
  if(owner!==this.owner)return;this.comparison={owner,content};
  // Keep the logical busy guard, but let the original modal close handler
  // return focus to this exact button before its promise settles.
  this.compare.disabled=this.compareCopy.disabled;
 }
 releaseComparison(content){if(this.comparison?.content===content)this.comparison=null;}
 sync(){
  const owner=this.current(),comparison=this.comparison;
  if(comparison&&(comparison.owner!==owner||comparison.owner.disposed||recoveredInputInvalidated(comparison.owner,this.read().state))){const dialog=comparison.content.closest('dialog');this.comparison=null;comparison.content.replaceChildren();dialog?.close();}
  if(owner?.recoveryConflict&&!owner.conflicted)owner.recoveryConflict=null;
  const fields=recoveredInputFields(owner,this.read().state);
  if(!fields.length||owner.composing){this.hide();return;}
  const entered=this.owner!==owner;
  if(entered){this.hide();this.owner=owner;this.scroll=window.scrollY;this.wasInert=owner.root.inert;owner.root.inert=true;this.compareCopy={text:this.compare.textContent,description:this.compare.getAttribute('aria-describedby'),primary:this.compare.classList.contains('primary'),disabled:this.compare.disabled};}
  this.root.hidden=false;document.body.classList.add('input-recovery-active');if(this.compare.parentNode!==this.actions)this.actions.append(this.compare);
  this.compare.hidden=false;this.compare.disabled=this.compareOwner===owner&&!this.comparison||this.compareCopy.disabled;this.compare.classList.add('primary');this.compare.setAttribute('aria-describedby','input-recovery-warning-text input-recovery-note');
  this.heading.textContent=copy('恢复未完成的修改','Recover unfinished changes');this.subtitle.textContent=copy('只处理当前真实可用的数据。','Only current, available data is shown.');this.warningHeading.textContent=copy('有一段尚未完成的修改','There are unfinished changes');this.warningText.textContent=copy('已保存版本同时发生变化。先比较，再决定如何继续。','The saved version also changed. Compare before deciding how to continue.');
  this.label.textContent=copy('恢复的本机草稿','Recovered local draft');this.note.textContent=copy('不会自动覆盖已保存内容','Saved content will not be overwritten automatically');this.copyButton.textContent=copy('复制草稿','Copy draft');this.compare.textContent=copy('比较并继续','Compare and continue');
  const previous=new Map([...this.fields.children].map(node=>[node.dataset.fieldId,node]));let index=0;
  for(const field of fields){
   let node=previous.get(field.id);previous.delete(field.id);if(!node){node=element('section','input-recovery-field');node.dataset.fieldId=field.id;node.append(element('h3'),element('pre'));}
   const label=node.firstElementChild,body=node.lastElementChild;label.hidden=fields.length===1&&field.kind==='body';label.textContent=fieldLabel(field,fields.length);const text=fieldText(field);if(body.textContent!==text)body.textContent=text;body.dataset.empty=String(text==='');body.setAttribute('aria-label',fieldLabel(field,fields.length));
   if(this.fields.children[index]!==node)this.fields.insertBefore(node,this.fields.children[index]||null);index++;
  }
  for(const node of previous.values())node.remove();if(entered){window.scrollTo(0,0);if(!document.querySelector('dialog[open]'))this.heading.focus({preventScroll:true});}
 }
 hide(){
  const owner=this.owner;this.copyIntent++;if(!owner){this.root.hidden=true;this.fields.replaceChildren();return;}
  const focused=this.root.contains(document.activeElement);this.home.parent.insertBefore(this.compare,this.home.next?.parentNode===this.home.parent?this.home.next:null);
  this.compareOwner=null;this.compare.disabled=this.compareCopy.disabled;this.compare.textContent=this.compareCopy.text;this.compare.classList.toggle('primary',this.compareCopy.primary);if(this.compareCopy.description===null)this.compare.removeAttribute('aria-describedby');else this.compare.setAttribute('aria-describedby',this.compareCopy.description);
  this.root.hidden=true;this.fields.replaceChildren();document.body.classList.remove('input-recovery-active');this.owner=null;
  if(!owner.disposed&&owner.root.isConnected){owner.root.inert=this.wasInert;window.scrollTo(0,this.scroll);if(focused&&!owner.root.inert)owner.root.focus({preventScroll:true});}
 }
}

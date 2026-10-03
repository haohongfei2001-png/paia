import {editableTextSnapshot} from './editable-text.js';
import {safeOffset} from '../core/reader-state.js';

// Logical refs only; never retain a detached DOM Range or a copy of the body.
export function captureReaderFocus(root,{active=document.activeElement,selection=document.getSelection(),fallbackInputId=null}={}){
 if(active?.id==='document-title')return {kind:'title'};
 const field=active?.closest?.('[data-edit-id]');
 if(field&&root.contains(field)){
  const snapshot=editableTextSnapshot(field),a=snapshot.offset(selection?.anchorNode,selection?.anchorOffset),f=snapshot.offset(selection?.focusNode,selection?.focusOffset);
  return {kind:'body',inputId:field.dataset.editId,...(a!==null&&f!==null?{anchorOffset:a,focusOffset:f}:{})};
 }
 const more=active?.closest?.('.reader-more'),id=more?.closest('.library-block')?.dataset.blockId||fallbackInputId;
 return id?{kind:'more',inputId:id}:null;
}

export function restoreReaderFocus(root,focus,editor){
 if(!focus||!editor)return false;
 if(focus.kind==='title'){const title=root.ownerDocument.getElementById('document-title');title?.focus({preventScroll:true});return !!title;}
 const field=[...root.querySelectorAll('[data-edit-id]')].find(node=>node.dataset.editId===focus.inputId),entry=editor.entries.get(focus.inputId);
 if(!field||!entry||entry.local.excluded)return false;
 if(focus.kind==='more'){const more=field.closest('.library-block')?.querySelector('.reader-more');more?.focus({preventScroll:true});return !!more;}
 field.focus({preventScroll:true});const snapshot=editableTextSnapshot(field),body=editor.text(entry);
 if(!Number.isInteger(focus.anchorOffset)||!Number.isInteger(focus.focusOffset))return true;
 const anchor=snapshot.point(safeOffset(body,focus.anchorOffset)),end=snapshot.point(safeOffset(body,focus.focusOffset));
 if(anchor&&end)root.ownerDocument.getSelection().setBaseAndExtent(anchor.node,anchor.offset,end.node,end.offset);
 return true;
}

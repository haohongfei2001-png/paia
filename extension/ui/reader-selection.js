import {editableTextSnapshot} from './editable-text.js';
// Ephemeral DOM selection, never persisted or substituted for a trusted ref.
export function captureReaderSelection(root,selection){
 if(!selection?.rangeCount||selection.isCollapsed)return null;
 const range=selection.getRangeAt(0);if(!root.contains(range.commonAncestorContainer))return null;
 const text=selection.toString();if(!text)return null;
 const node=range.startContainer,field=(node.nodeType===1?node:node.parentElement)?.closest('[data-edit-id]');
 if(!field||!field.contains(range.endContainer))return {text,range:range.cloneRange(),input:null};
 const snapshot=editableTextSnapshot(field),start=snapshot.offset(range.startContainer,range.startOffset),end=snapshot.offset(range.endContainer,range.endOffset);
 if(start===null||end===null||end<=start)return {text,range:range.cloneRange(),input:null};
 return {text:snapshot.text.slice(start,end),range:range.cloneRange(),input:{id:field.dataset.editId,span:{start,end},body:snapshot.text}};
}
export function selectionMatchesBody(selection,body){
 const input=selection?.input;if(!input||typeof body!=='string')return false;
 return body===input.body&&body.slice(input.span.start,input.span.end)===selection.text;
}

// CSS-pixel placement against the actual (possibly pinch-zoomed) viewport.
// Presentation only: never changes the native range or its admitted Input ref.
export function readerToolbarPosition(rect,size,viewport){
 const margin=16,gap=8,left=viewport.left||0,top=viewport.top||0;
 const right=left+viewport.width,bottom=top+viewport.height;
 const clamp=(n,min,max)=>Math.max(min,Math.min(Math.max(min,max),n));
 const x=clamp((rect.left+rect.right-size.width)/2,left+margin,right-size.width-margin);
 const below=rect.bottom+gap,above=rect.top-size.height-gap;
 const y=below+size.height<=bottom-margin?below:above>=top+margin?above:clamp(below,top+margin,bottom-size.height-margin);
 return {left:x,top:clamp(y,top+margin,bottom-size.height-margin)};
}
export function sameReaderSelection(a,b){
 if(!a||!b||a.text!==b.text)return false;
 return ['startContainer','endContainer','startOffset','endOffset'].every(key=>a.range[key]===b.range[key]);
}

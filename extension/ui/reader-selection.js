// Ephemeral DOM selection, never persisted or substituted for a trusted ref.
export function captureReaderSelection(root,selection){
 if(!selection?.rangeCount||selection.isCollapsed)return null;
 const range=selection.getRangeAt(0);if(!root.contains(range.commonAncestorContainer))return null;
 const text=selection.toString();if(!text)return null;
 const node=range.startContainer,field=(node.nodeType===1?node:node.parentElement)?.closest('[data-edit-id]');
 if(!field||!field.contains(range.endContainer))return {text,range:range.cloneRange(),input:null};
 const before=range.cloneRange();before.selectNodeContents(field);before.setEnd(range.startContainer,range.startOffset);
 const start=before.toString().length;
 return {text,range:range.cloneRange(),input:{id:field.dataset.editId,span:{start,end:start+text.length},body:field.textContent}};
}
export function selectionMatchesBody(selection,body){
 const input=selection?.input;if(!input||typeof body!=='string')return false;
 return body===input.body&&body.slice(input.span.start,input.span.end)===selection.text;
}

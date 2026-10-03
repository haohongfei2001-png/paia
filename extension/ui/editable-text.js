// Read native plaintext-only editing DOM without changing its nodes, selection,
// undo stack or whitespace. innerText adds layout-derived breaks around an empty
// DIV/BR line; those are not additional characters the person entered.
const blocks=new Set(['DIV','P']);
const inline=new Set(['SPAN','MARK','B','I','U','STRONG','EM']);
const children=node=>Array.from(node.childNodes||[]);
const tag=node=>String(node.nodeName||node.tagName||'').toUpperCase();
const text=node=>node.data??node.nodeValue??node.textContent??'';
// Only DocumentEditor's matched native input events can establish this ephemeral
// provenance. It is never inferred from whitespace, focus or a saved body.
// Full replacement clears prior markers and can prove at most one residue.
// A later native line break may independently prove one terminal character.
const nativeMarkers=new WeakMap(),markerLimit=2;
const textNodes=root=>{const nodes=[];const visit=node=>{if(node.nodeType===3)nodes.push(node);else for(const child of children(node))visit(child);};visit(root);return nodes;};
const terminalNode=node=>{if(node.nodeType===3)return text(node)?node:null;if(node.nodeType!==1)return null;for(const child of children(node).reverse()){const last=terminalNode(child);if(last)return last;}return blocks.has(tag(node))||tag(node)==='BR'?node:null;};
function readSnapshot(root,preview=null){
 const supported=(node,inInline=false)=>children(node).every(child=>child.nodeType===3||child.nodeType===8||child.nodeType===1&&(!inInline&&blocks.has(tag(child))||inline.has(tag(child))||tag(child)==='BR')&&supported(child,inInline||inline.has(tag(child))));
 if(!root?.childNodes||!supported(root)){if(root)nativeMarkers.delete(root);return {text:root?.textContent===''?'':root?.innerText??root?.textContent??'',offset:()=>null,point:()=>null};}
 const nodes=new Set(textNodes(root)),markers=[];
 for(const record of preview||nativeMarkers.get(root)||[]){
  const {range,node,parent,kind}=record;
  if(markers.length===markerLimit||node?.nodeType!==3||range.startContainer!==node||range.endContainer!==node||node.parentNode!==parent||!nodes.has(node)||range.endOffset!==range.startOffset+1||range.endOffset!==text(node).length||text(node).slice(range.startOffset,range.endOffset)!=='\n'||kind==='terminal'&&terminalNode(root)!==node)continue;
  if(!markers.some(prior=>prior.node===node&&prior.range.startOffset===range.startOffset))markers.push(record);
 }
 if(!preview){if(markers.length)nativeMarkers.set(root,markers);else nativeMarkers.delete(root);}
 const authored=node=>{const marker=markers.find(record=>record.node===node);return marker?text(node).slice(0,marker.range.startOffset):text(node);};
 const meaningful=node=>node.nodeType===3?authored(node)!=='':node.nodeType===1&&(blocks.has(tag(node))||tag(node)==='BR'||children(node).some(meaningful));
 const boundaries=new WeakMap(),starts=new WeakMap(),runs=[],anchors=new Map(),parts=[];let length=0;
 const append=value=>{parts.push(value);length+=value.length;};
 const visit=parent=>{
  const nodes=children(parent),visible=nodes.filter(meaningful),points=[length];let prior=false,priorBlock=false,priorBR=false;
  for(let i=0;i<nodes.length;i++){
   const child=nodes[i],name=tag(child),block=child.nodeType===1&&blocks.has(name);
   if(!meaningful(child)){if(child.nodeType===3){starts.set(child,length);runs.push({node:child,start:length,end:length});}points.push(length);continue;}
   // A direct BR already supplies the boundary before the next browser line.
   // This is structural accounting, not a trim of literal text-node newlines.
   if(prior&&(block||priorBlock)&&!priorBR)append('\n');
   if(child.nodeType===3){starts.set(child,length);runs.push({node:child,start:length,end:length+authored(child).length});append(authored(child));}
   else if(name==='BR'){
    // Chrome's sole BR in an empty line, or final BR after another BR,
    // is its caret placeholder. Every other explicit BR is a real newline.
    const lineContainer=parent===root||blocks.has(tag(parent)),placeholder=lineContainer&&(visible.length===1||child===visible.at(-1)&&tag(visible.at(-2))==='BR');
    boundaries.set(child,[length]);if(!placeholder)append('\n');
   }else visit(child);
   prior=true;priorBlock=block;priorBR=name==='BR';points.push(length);
  }
  boundaries.set(parent,points);points.forEach((at,offset)=>{if(!anchors.has(at))anchors.set(at,{node:parent,offset});});
 };
 visit(root);
 return {text:parts.join(''),offset(node,index){
  if(!Number.isInteger(index)||index<0)return null;
  if(node?.nodeType===3){const start=starts.get(node);return start!==undefined&&index<=text(node).length?start+Math.min(index,authored(node).length):null;}
  const points=boundaries.get(node);return points&&index<points.length?points[index]:null;
 },point(index){
  if(!Number.isInteger(index)||index<0||index>length)return null;
  for(const run of runs)if(index>=run.start&&index<=run.end)return {node:run.node,offset:index-run.start};
  return anchors.get(index)||null;
 }};
}
export const editableTextSnapshot=root=>readSnapshot(root);
export const editableText=root=>editableTextSnapshot(root).text;

// Blink InsertLineBreakCommand creates an extra terminal LF Text node for the
// caret, then places the caret at that node's start. Recognize only that proven
// beforeinput→input delta; ordinary, pasted and reloaded LF remain untouched.
export class NativeLineBreakTracker {
 constructor({createRange=node=>node.ownerDocument.createRange()}={}){this.pending=new WeakMap();this.createRange=createRange;}
 before(root,event,selection){
  if(!root)return;this.pending.delete(root);
  if(!event.isTrusted||event.defaultPrevented||event.isComposing||!selection?.rangeCount)return;
  const range=selection.getRangeAt(0),snapshot=editableTextSnapshot(root),start=snapshot.offset(range.startContainer,range.startOffset),end=snapshot.offset(range.endContainer,range.endOffset);
  if(start===null||end===null||end<start)return;
  const newline=['insertLineBreak','insertParagraph'].includes(event.inputType),replacement=event.inputType==='insertText'&&typeof event.data==='string'&&start===0&&end===snapshot.text.length;
  if(!newline&&!replacement)return;
  const old=replacement?(nativeMarkers.get(root)||[]).filter(record=>range.isPointInRange?.(record.node,record.range.startOffset)&&range.isPointInRange?.(record.node,record.range.endOffset)):[];
  this.pending.set(root,{inputType:event.inputType,replacement,data:event.data,expected:replacement?event.data:snapshot.text.slice(0,start)+'\n'+snapshot.text.slice(end),nodes:new WeakSet(textNodes(root)),old});
 }
 input(root,event,selection){
  if(!root)return;const prior=this.pending.get(root);this.pending.delete(root);
  if(!prior||!event.isTrusted||event.defaultPrevented||event.isComposing||event.inputType!==prior.inputType)return;
  // Complete replacement supersedes any old sentinel provenance, even when
  // Chrome reuses its Text node. Only a matching payload can prove a new one.
  if(prior.replacement){
   nativeMarkers.delete(root);if(event.data!==prior.data&&event.data!==null)return;
   // Chrome can retain the already-proved LF before newly inserted empty
   // blocks and omit data on its input events. Only that exact old character,
   // selected by the full replacement, can be re-proved as residue.
   if(prior.old.length&&selection?.isCollapsed){
    const raw=editableTextSnapshot(root),matches=[];
    if(raw.text.length===prior.expected.length+1)for(const old of prior.old){
     const candidate={...old,parent:old.node.parentNode,kind:'residue'},without=readSnapshot(root,[candidate]);
     if(without.text===prior.expected&&without.offset(selection.anchorNode,selection.anchorOffset)===prior.expected.length&&without.offset(selection.focusNode,selection.focusOffset)===prior.expected.length)matches.push(candidate);
    }
    if(matches.length){if(matches.length===1)nativeMarkers.set(root,matches);return;}
   }
   if(event.data!==prior.data)return;
  }
  if(!selection?.isCollapsed)return;
  const node=terminalNode(root),offset=node?.nodeType===3?text(node).length-1:-1;
  if(offset<0||text(node)[offset]!=='\n'||!prior.replacement&&(offset!==0||prior.nodes.has(node)))return;
  const snapshot=editableTextSnapshot(root),at=snapshot.offset(node,offset);if(at===null)return;
  const caretBefore=prior.replacement?snapshot.offset(selection.anchorNode,selection.anchorOffset)===at&&snapshot.offset(selection.focusNode,selection.focusOffset)===at:selection.anchorNode===node&&selection.anchorOffset===offset&&selection.focusNode===node&&selection.focusOffset===offset;
  if(caretBefore&&snapshot.text===prior.expected+'\n'&&at===prior.expected.length){const markers=nativeMarkers.get(root)||[];if(markers.length>=markerLimit||markers.some(record=>record.node===node&&record.range.startOffset===offset))return;const range=this.createRange(node);range.setStart(node,offset);range.setEnd(node,offset+1);nativeMarkers.set(root,[...markers,{range,node,parent:node.parentNode,kind:'terminal'}]);}
 }
 clear(root){if(root){this.pending.delete(root);nativeMarkers.delete(root);}}
}

// Tab-local authorship, never a recovery storage format. Unknown edits are
// withheld rather than treating a changed AI field/list as entirely human.
const size=piece=>piece.end===undefined?piece.length:piece.end-piece.start;
function slice(pieces,start,end){const out=[];let offset=0;for(const piece of pieces){const a=Math.max(start-offset,0),b=Math.min(end-offset,size(piece));if(a<b)out.push(piece.end===undefined?{...piece,length:b-a,...(piece.text===undefined?{}:{text:piece.text.slice(a,b)})}:{start:piece.start+a,end:piece.start+b});offset+=size(piece);}return out;}
function difference(before,after){let start=0,suffix=0;while(start<before.length&&start<after.length&&before[start]===after[start])start++;while(suffix<before.length-start&&suffix<after.length-start&&before[before.length-1-suffix]===after[after.length-1-suffix])suffix++;return {start,end:before.length-suffix,text:after.slice(start,after.length-suffix)};}
export class AIHumanDelta {
 constructor(text){this.base=text;this.text=text;this.pieces=text?[{start:0,end:text.length}]:[];this.intent=null;}
 beforeInput(event,node){
  this.intent=null;const type=event?.inputType||'';
  if(!/^(insertText|insertReplacementText|insertFromPaste|insertCompositionText|insertLineBreak|insertParagraph|delete\w+)$/.test(type))return;
  const data=typeof event.data==='string'?event.data:type==='insertLineBreak'||type==='insertParagraph'?'\n':type.startsWith('delete')?'':event.dataTransfer?.getData?.('text/plain');
  if(typeof data!=='string')return;
  // Offset mapping is only admitted if the resulting splice exactly matches
  // the subsequent rendered text. Multiline/IME ambiguity stays unverified.
  try{const target=event.getTargetRanges?.()[0],selection=node.ownerDocument?.getSelection?.()||document.getSelection?.(),range=target||selection?.rangeCount&&selection.getRangeAt(0);if(!range||!node.contains(range.startContainer)||!node.contains(range.endContainer))return;const before=document.createRange();before.selectNodeContents(node);before.setEnd(range.startContainer,range.startOffset);const through=document.createRange();through.selectNodeContents(node);through.setEnd(range.endContainer,range.endOffset);this.intent={start:before.toString().length,end:through.toString().length,text:data};}catch{}
 }
 update(after,event){
  if(after===this.text){this.intent=null;return;}
  let change=difference(this.text,after),verified=false;
  const intent=this.intent;this.intent=null;
  if(intent&&this.text.slice(0,intent.start)+intent.text+this.text.slice(intent.end)===after){change=intent;verified=true;}
  else if(event&&/^(insertText|insertReplacementText|insertCompositionText)$/.test(event.inputType)&&typeof event.data==='string'){
   // InputEvent data is human insertion evidence. An unavailable target range
   // does not authorize any unchanged substring around that exact insertion.
   const data=event.data,removed=this.text.length+data.length-after.length,start=data?after.lastIndexOf(data,change.start):change.start;
   if(start>=0&&removed>=0&&start+removed<=this.text.length&&this.text.slice(0,start)+data+this.text.slice(start+removed)===after){change={start,end:start+removed,text:data};verified=true;}
  }else if(after===''||event?.inputType?.startsWith('delete')&&change.text==='')verified=true;
  this.pieces=[...slice(this.pieces,0,change.start),...(change.text?[verified?{text:change.text,length:change.text.length}:{length:change.text.length}]:[]),...slice(this.pieces,change.end,this.text.length)];this.text=after;
 }
 commit(text){
  if(text===this.base)return;
  if(text===this.text){this.base=text;this.pieces=text?[{start:0,end:text.length}]:[];return;}
  // A sent older value may ACK while a later input is local. Preserve only
  // already verified inserted spans; ambiguous rebasing cannot expose prose.
  const diff=difference(text,this.text),end=this.text.length-(text.length-diff.end),middle=slice(this.pieces,diff.start,end).map(p=>p.text===undefined?{length:size(p)}:p);
  this.base=text;this.pieces=[...(diff.start?[{start:0,end:diff.start}]:[]),...middle,...(diff.end<text.length?[{start:diff.end,end:text.length}]:[])];
 }
 snapshot(){
  if(this.text===this.base)return null;
  const changes=[];let cursor=0,pending=null;
  const gap=()=>pending??={at:cursor,deleteCount:0,insertions:[],unverified:false};
  for(const piece of this.pieces){
   if(piece.end!==undefined){if(piece.start>cursor)gap().deleteCount+=piece.start-cursor;if(pending){changes.push(pending);pending=null;}cursor=piece.end;}
   else if(piece.text!==undefined)gap().insertions.push(piece.text);else gap().unverified=true;
  }
  if(cursor<this.base.length)gap().deleteCount+=this.base.length-cursor;if(pending)changes.push(pending);
  return {clear:this.text==='',changes};
 }
}
export function humanDeltaText(deltas){return deltas.map(({label,index,clear,changes})=>{
 const title=label+(index===null?'':' · 第 '+(index+1)+' 条');
 if(clear)return title+'：清空此项（不包含旧内容）';
 return title+'\n'+changes.map(change=>[
  `位置 ${change.at}（UTF-16）${change.deleteCount?'，删除/替换 '+change.deleteCount+' 个字符':''}`,
  ...change.insertions,
  ...(change.unverified?['部分修改无法确认文本来源，未显示或复制。']:[])
 ].join('\n')).join('\n');
}).join('\n\n');}

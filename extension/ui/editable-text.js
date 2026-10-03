// Read native plaintext-only editing DOM without changing its nodes, selection,
// undo stack or whitespace. innerText adds layout-derived breaks around an empty
// DIV/BR line; those are not additional characters the person entered.
const blocks=new Set(['DIV','P']);
const inline=new Set(['SPAN','MARK','B','I','U','STRONG','EM']);
const children=node=>Array.from(node.childNodes||[]);
const tag=node=>String(node.nodeName||node.tagName||'').toUpperCase();
const text=node=>node.data??node.nodeValue??node.textContent??'';
const meaningful=node=>node.nodeType===3?text(node)!=='':node.nodeType===1&&(blocks.has(tag(node))||tag(node)==='BR'||children(node).some(meaningful));
export function editableTextSnapshot(root){
 const supported=(node,inInline=false)=>children(node).every(child=>child.nodeType===3||child.nodeType===8||child.nodeType===1&&(!inInline&&blocks.has(tag(child))||inline.has(tag(child))||tag(child)==='BR')&&supported(child,inInline||inline.has(tag(child))));
 if(!root?.childNodes||!supported(root))return {text:root?.textContent===''?'':root?.innerText??root?.textContent??'',offset:()=>null,point:()=>null};
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
   if(child.nodeType===3){starts.set(child,length);runs.push({node:child,start:length,end:length+text(child).length});append(text(child));}
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
  if(node?.nodeType===3){const start=starts.get(node);return start!==undefined&&index<=text(node).length?start+index:null;}
  const points=boundaries.get(node);return points&&index<points.length?points[index]:null;
 },point(index){
  if(!Number.isInteger(index)||index<0||index>length)return null;
  for(const run of runs)if(index>=run.start&&index<=run.end)return {node:run.node,offset:index-run.start};
  return anchors.get(index)||null;
 }};
}
export const editableText=root=>editableTextSnapshot(root).text;

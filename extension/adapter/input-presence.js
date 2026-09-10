/* Optional, bounded presence evidence for an already validated canonical user message.
 * Never reads text, attribute payloads, URLs, filenames, image bytes or assistant content. */
(() => {
 'use strict';
 const unknown=()=>({version:1,attachment:'unknown',reference:'unknown',confidence:'unknown'});
 function collect(root,container){
  try{
   const turn=root.closest('article[data-testid^="conversation-turn-"]');
   if(!turn||!turn.contains(container))return unknown();
   let attachment='absent',reference='absent',count=0;
   const walker=root.ownerDocument.createTreeWalker(turn,1);let node=walker.currentNode;
   do{
    if(++count>256)return unknown();
    if(node.matches('[data-message-author-role]')&&node!==root)return unknown();
    if(node.matches('iframe,object,embed,[contenteditable]:not([contenteditable="false"]),textarea,input:not([type="file"])'))return unknown();
    // A positive marker is enough to keep. Do not traverse its contents.
    if(node.matches('img,picture,video,audio,canvas,input[type="file"],[data-testid*="attachment"],[data-testid*="file"],[data-testid*="image"]'))return {version:1,attachment:'present',reference:'unknown',confidence:'verified'};
    if(node.matches('a,pre,code,table,[data-testid*="reference"],[data-testid*="citation"]'))return {version:1,attachment:'unknown',reference:'present',confidence:'verified'};
    // Unclassified content outside the canonical text leaf cannot prove text-only.
    // Inspect node types only, never text-node data or labels.
    if(!container.contains(node)&&!node.contains(container)&&[...node.childNodes].some(child=>child.nodeType===3))return unknown();
   }while((node=walker.nextNode()));
   return {version:1,attachment,reference,confidence:'verified'};
  }catch{return unknown();}
 }
 globalThis.PAIAInputPresence=Object.freeze({collect});
})();

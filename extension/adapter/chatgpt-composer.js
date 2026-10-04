/* Provider-specific, isolated-world insertion. No page library or archive API. */
(() => {
 'use strict';
 const LIMIT=200000;
 class ChatGPTComposerAdapter{
  constructor({document=globalThis.document,location=globalThis.location}={}){
   this.document=document;this.location=location;this.saved=null;this.composing=new WeakSet();this.busy=false;this.attempts=new Map();
   this.listeners=[];
   for(const event of ['selectionchange','pointerup','focusout'])this.listen(event,()=>this.remember());
   this.listen('compositionstart',e=>{const node=this.find();if(node?.contains(e.target)){this.composing.add(node);this.saved=null;}});
   this.listen('compositionend',e=>{const node=this.find();if(node?.contains(e.target)){this.composing.delete(node);this.remember();}});
   this.listen('input',()=>this.remember());
  }
  listen(event,fn){this.document.addEventListener(event,fn,true);this.listeners.push([event,fn]);}
  dispose(){for(const [event,fn]of this.listeners)this.document.removeEventListener(event,fn,true);this.saved=null;this.attempts.clear();}
  find(){
   if(this.location.origin!=='https://chatgpt.com')return null;
   const nodes=[...this.document.querySelectorAll('#prompt-textarea.ProseMirror[contenteditable="true"]')].filter(n=>n.isConnected&&n.getClientRects().length&&!n.closest('[data-message-author-role], [hidden], [inert], [aria-hidden="true"]')&&n.getAttribute('aria-disabled')!=='true');
   return nodes.length===1?nodes[0]:null;
  }
  model(node){
   if(!node||node.querySelector('[contenteditable="false"], img, iframe, button, input, textarea'))return null;
   let text='',points=[];
   const point=(n,o)=>{points[text.length]={node:n,offset:o};};
   const walk=n=>{
    if(n.nodeType===3){for(let i=0;i<n.data.length;i++){point(n,i);text+=n.data[i];}point(n,n.data.length);return true;}
    if(n.nodeType!==1)return false;
    if(n.tagName==='BR'){
     // ProseMirror's terminal break is a caret placeholder, not a draft character.
     if(n===n.parentNode.lastChild)return true;
     point(n.parentNode,[...n.parentNode.childNodes].indexOf(n));text+='\n';point(n.parentNode,[...n.parentNode.childNodes].indexOf(n)+1);return true;
    }
    if(!['P','DIV','SPAN','STRONG','EM','B','I','U','S'].includes(n.tagName))return false;
    if(!n.childNodes.length)point(n,0);
    for(const child of n.childNodes)if(!walk(child))return false;return true;
   };
   const children=[...node.childNodes];point(node,0);
   for(let i=0;i<children.length;i++){
    const child=children[i];if(i>0&&child.nodeType===1&&['P','DIV'].includes(child.tagName)){text+='\n';point(child,0);}
    if(!walk(child))return null;
   }
   if(text.length>LIMIT)return null;
   return {text,points};
  }
  offset(model,node,offset){
   const wanted=this.document.createRange();try{wanted.setStart(node,offset);wanted.collapse(true);}catch{return null;}
   let result=0;
   for(let i=0;i<model.points.length;i++){
    const p=model.points[i];if(!p)continue;const r=this.document.createRange();r.setStart(p.node,p.offset);r.collapse(true);
    if(r.compareBoundaryPoints(0,wanted)>0)break;result=i;
   }return result;
  }
  current(node,model){
   const selection=this.document.getSelection();if(!selection?.rangeCount)return null;
   const r=selection.getRangeAt(0);if(!node.contains(r.startContainer)||!node.contains(r.endContainer))return null;
   return this.offset(model,r.endContainer,r.endOffset);
  }
  remember(){
   const node=this.find();if(!node||this.composing.has(node))return;
   const model=this.model(node);if(!model)return;
   const offset=this.current(node,model);if(offset===null)return;
   this.saved={node,url:this.location.href,text:model.text,offset};
  }
  place(node,model,offset){
   const p=model.points[offset];if(!p)return false;
   const r=this.document.createRange();r.setStart(p.node,p.offset);r.collapse(true);
   const selection=this.document.getSelection();selection.removeAllRanges();selection.addRange(r);return true;
  }
  async insert({text,operationId,url}){
   if(typeof operationId!=='string'||!/^[a-f0-9-]{36}$/.test(operationId)||typeof text!=='string'||!text.trim()||text.length>LIMIT||text.includes('\r'))return {status:'failed',reason:'invalid_request'};
   if(this.attempts.has(operationId))return this.attempts.get(operationId);
   const result=await this.once(text,url);this.attempts.set(operationId,result);
   // No eviction/replay ambiguity in a page lifetime; fail closed at the bound.
   return result;
  }
  async once(text,url){
   if(this.busy)return {status:'failed',reason:'busy'};
   if(this.attempts.size>=500)return {status:'failed',reason:'reload_required'};
   const node=this.find();if(!node||url!==this.location.href)return {status:'failed',reason:'composer_unavailable'};
   if(this.composing.has(node))return {status:'failed',reason:'composition_active'};
   const before=this.model(node);if(!before)return {status:'failed',reason:'unsupported_composer'};
   let offset=this.current(node,before),strategy='caret';
   if(offset===null&&this.saved?.node===node&&this.saved.url===url&&this.saved.text===before.text)offset=this.saved.offset;
   if(offset===null){offset=before.text.length;strategy='append';}
   const insertion=(strategy==='append'&&before.text&&!before.text.endsWith('\n')?'\n':'')+text;
   const expected=before.text.slice(0,offset)+insertion+before.text.slice(offset);
   if(expected.length>LIMIT)return {status:'failed',reason:'draft_too_large'};
   this.busy=true;let observed=false,attempted=false;
   const input=e=>{if(e.isTrusted&&node.contains(e.target)&&e.inputType==='insertText')observed=true;};
   node.addEventListener('input',input,true);
   try{
    node.focus({preventScroll:true});
    if(this.find()!==node||this.composing.has(node)||this.model(node)?.text!==before.text||!this.place(node,before,offset))return {status:'failed',reason:'draft_changed'};
    attempted=true;
    // Chromium's native editing transaction supplies trusted input and lets
    // ProseMirror's DOM observer reconcile its own editor state. Never set HTML.
    const accepted=this.document.execCommand('insertText',false,insertion);
    await new Promise(resolve=>setTimeout(resolve,0));
    await new Promise(resolve=>setTimeout(resolve,32));
    const after=this.model(node);
    if(this.find()===node&&this.location.href===url&&accepted&&observed&&after?.text===expected&&this.document.activeElement===node&&this.current(node,after)===offset+insertion.length){this.remember();return {status:'inserted',verified:true,strategy};}
    if(this.find()===node&&after?.text===before.text&&!accepted)return {status:'failed',reason:'insertion_rejected'};
    return {status:'uncertain',reason:'readback_unconfirmed'};
   }catch{return {status:attempted?'uncertain':'failed',reason:attempted?'readback_unconfirmed':'insertion_unavailable'};}
   finally{node.removeEventListener('input',input,true);this.busy=false;}
  }
 }
 globalThis.PAIAChatGPTComposerAdapter=ChatGPTComposerAdapter;
})();

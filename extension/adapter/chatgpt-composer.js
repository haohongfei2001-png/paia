/* Provider-specific, isolated-world insertion. No page library or archive API. */
(() => {
 'use strict';
 const LIMIT=200000;
 const NativePromise=Promise,apply=Reflect.apply,originalThen=Promise.prototype.then,originalResolve=Promise.resolve;
 const originalSetTimeout=globalThis.setTimeout,originalClearTimeout=globalThis.clearTimeout;
 const originalClock=globalThis.performance,originalNow=originalClock?.now;
 const monotonic=()=>typeof originalNow==='function'?apply(originalNow,originalClock,[]):NaN;
 const observe=(promise,yes,no)=>apply(originalThen,promise,[yes,no]);
 const resolved=value=>apply(originalResolve,NativePromise,[value]);
 const selectionReply=(held=false)=>({version:1,held});
 const notifySelection=state=>{state.selectionHold?.check?.();};
 const selectionBinding=(state,message)=>state.protocolActive&&state.receiver&&state.ownerToken===message.ownerToken&&state.ownerDomain===message.domainDigest&&canonical(state.receiver)===canonical(message.receiver);
 const selectionIdentity=(state,hold)=>!state.documentRetired&&state.document===globalThis.document&&state.location===globalThis.location&&state.location.href===hold.url&&globalThis.chrome?.runtime===state.runtime&&state.runtime.id===state.runtimeId&&state.runtime.sendMessage===state.runtimeSend&&state.runtime.onMessage===state.runtimeMessages&&state.runtimeMessages.addListener===state.runtimeAdd&&selectionBinding(state,hold.binding);
 const selectionLive=(state,hold)=>{
  if(state.selectionHold!==hold||hold.invalid)return false;
  const now=monotonic();if(!Number.isFinite(now)||now<hold.started||now>=hold.deadline||!selectionIdentity(state,hold)){hold.invalid=true;return false;}
  return true;
 };
 const selectionQuiet=state=>!state.selectionPending.size&&!state.registration;
 const selectionTerminal=state=>!state.legacyAttempted;
 const selectionProof=(state,hold)=>({version:1,profile:'original-empty-inventory-v1',held:true,challenge:hold.binding.challenge,receiver:copy(state.receiver),ownerToken:state.ownerToken,domainDigest:state.ownerDomain,remainingMs:Math.max(0,hold.deadline-monotonic())});
 function documentSelection(state,message){
  const type=message.type,valid=exact(message,['type','version','receiver','ownerToken','domainDigest','challenge'])&&message.version===1&&validReceiver(message.receiver)&&UUID.test(message.ownerToken)&&HASH.test(message.domainDigest)&&UUID.test(message.challenge);
  if(!valid)return resolved(selectionReply());
  const hold=state.selectionHold;
  // Compare only the immutable binding; wire type differs across the three calls.
  const binding={receiver:copy(message.receiver),ownerToken:message.ownerToken,domainDigest:message.domainDigest,challenge:message.challenge};
  const sameHold=hold&&canonical(hold.binding)===canonical(binding);
  if(type==='PAIA_PROMPT_INSERTION_DOCUMENT_RELEASE'){
   if(!sameHold)return resolved({version:1,released:false});
   hold.invalid=true;hold.finish?.(selectionReply());state.selectionHold=null;return resolved({version:1,released:true,challenge:binding.challenge});
  }
  if(type==='PAIA_PROMPT_INSERTION_DOCUMENT_FENCE'){
   if(!sameHold||!hold.ready||!selectionLive(state,hold)||!selectionQuiet(state)||!selectionTerminal(state)||state.admissionSerial!==hold.serial){if(sameHold)hold.invalid=true;return resolved(selectionReply());}
   return resolved(selectionProof(state,hold));
  }
  if(hold||!selectionBinding(state,binding)||state.legacyAttempted||state.selectionChallenges.size>=128||state.selectionChallenges.has(binding.challenge)||state.admissionClosed)return resolved(selectionReply());
  const started=monotonic();if(!Number.isFinite(started)||state.admissionSerial>=Number.MAX_SAFE_INTEGER)return resolved(selectionReply());
  const next={binding,started,deadline:started+30000,url:state.location.href,invalid:false,ready:false,serial:++state.admissionSerial};
  state.selectionChallenges.add(binding.challenge);state.selectionHold=next;
  return new NativePromise(resolve=>{
   let done=false,timer;next.finish=value=>{if(done)return;done=true;if(timer!==undefined&&typeof originalClearTimeout==='function')apply(originalClearTimeout,globalThis,[timer]);next.check=null;resolve(value);};
   next.check=()=>{if(!selectionLive(state,next)){next.finish(selectionReply());return;}if(!selectionQuiet(state))return;if(!selectionTerminal(state)){next.invalid=true;next.finish(selectionReply());return;}next.serial=state.admissionSerial;next.ready=true;next.finish(selectionProof(state,next));};
   timer=apply(originalSetTimeout,globalThis,[()=>{next.invalid=true;next.finish(selectionReply());},30000]);next.check();
  });
 }

 // This original document inventory does not replace main's legacy insertion
 // algorithm. Any legacy attempt permanently excludes this document from the
 // empty-inventory profile, including after adapter disposal/reconstruction.
 const slot=Symbol.for('paia.original-composer.document-inventory.v1');
 if(globalThis[slot]){globalThis.PAIAChatGPTComposerAdapter=globalThis[slot];return;}
 const unknownPredecessor=globalThis.PAIAChatGPTComposerAdapter!==undefined;
 const documents=new WeakMap();
 const VERSION=1,UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/,HASH=/^[a-f0-9]{64}$/;
 const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Reflect.ownKeys(value).length===keys.length&&keys.every(key=>Object.hasOwn(Object.getOwnPropertyDescriptor(value,key)??{},'value'));
 const ordered=(value,depth=0)=>{
  if(depth>24)throw Error('invalid insertion binding');
  if(value===null||typeof value==='string'||typeof value==='boolean'||typeof value==='number'&&Number.isFinite(value))return value;
  if(Array.isArray(value))return value.map(item=>ordered(item,depth+1));
  if(value&&typeof value==='object'&&Object.prototype.toString.call(value)==='[object Object]'){
   const out={};for(const key of Object.keys(value).sort()){
    if(['__proto__','constructor','prototype'].includes(key)||!Object.hasOwn(Object.getOwnPropertyDescriptor(value,key),'value'))throw Error('invalid insertion binding');
    out[key]=ordered(value[key],depth+1);
   }return out;
  }
  throw Error('invalid insertion binding');
 };
 const canonical=value=>JSON.stringify(ordered(value));
 const copy=value=>JSON.parse(canonical(value));
 const validReceiver=value=>exact(value,['tabId','windowId','documentId','nonce'])&&Number.isSafeInteger(value.tabId)&&value.tabId>=0&&Number.isSafeInteger(value.windowId)&&value.windowId>=0&&typeof value.documentId==='string'&&value.documentId.length>0&&value.documentId.length<=128&&UUID.test(value.nonce);

 async function registered(state,recoveryToken){
  if(state.registration&&state.registrationToken!==recoveryToken)throw Error('receiver registration busy');
  if(!state.registration){state.registrationToken=recoveryToken;state.registration=(async()=>{
   const reply=await apply(state.runtimeSend,state.runtime,[{type:'PAIA_PROMPT_INSERTION_RECEIVER_REGISTER',version:VERSION,nonce:state.nonce,recoveryToken}]);
   const result=reply?.ok===true?reply.data:null;
   if(result?.registered!==true||result.version!==VERSION||!UUID.test(result.ownerToken)||result.recoveryToken!==recoveryToken||!HASH.test(result.domainDigest)||!validReceiver(result.receiver)||result.receiver.nonce!==state.nonce)throw Error('receiver unavailable');
   if(state.ownerToken===result.ownerToken&&state.ownerDomain!==null&&state.ownerDomain!==result.domainDigest)throw Error('receiver source changed');
   if(state.ownerToken!==null&&state.ownerToken!==result.ownerToken){if(state.admissionSerial>=Number.MAX_SAFE_INTEGER){state.admissionClosed=true;throw Error('receiver unavailable');}state.admissionSerial++;}
   state.receiver=copy(result.receiver);state.ownerToken=result.ownerToken;state.ownerDomain=result.domainDigest;state.protocolActive=true;
  })().finally(()=>{state.registration=null;state.registrationToken=null;notifySelection(state);});}
  return state.registration;
 }
 function receiverRuntime(state){
  const api=globalThis.chrome?.runtime;if(!api?.onMessage?.addListener||typeof api.sendMessage!=='function'||typeof globalThis.crypto?.randomUUID!=='function')return;
  state.runtime=api;state.runtimeId=api.id;state.runtimeSend=api.sendMessage;state.runtimeMessages=api.onMessage;state.runtimeAdd=api.onMessage.addListener;state.nonce=globalThis.crypto.randomUUID();
  api.onMessage.addListener((message,sender,reply)=>{
   if(sender.id!==state.runtimeId||sender.tab)return;
   if(['PAIA_PROMPT_INSERTION_DOCUMENT_HOLD','PAIA_PROMPT_INSERTION_DOCUMENT_FENCE','PAIA_PROMPT_INSERTION_DOCUMENT_RELEASE'].includes(message?.type)){
    observe(documentSelection(state,message),reply,()=>reply(selectionReply()));return true;
   }
   if(message?.type==='PAIA_PROMPT_INSERTION_RECEIVER_PROBE'){
    if(state.selectionHold||state.legacyAttempted||state.documentRetired||state.admissionClosed||!exact(message,['type','version','recoveryToken'])||message.version!==VERSION||!UUID.test(message.recoveryToken)){reply(null);return;}
    registered(state,message.recoveryToken).then(()=>{
     if(state.selectionHold||state.legacyAttempted||state.documentRetired||!selectionQuiet(state)){reply(null);return;}
     reply({version:VERSION,nonce:state.nonce,profile:'original-empty-inventory-v1'});
    },()=>reply(null));return true;
   }
  });
 }
 function stateFor(document,location){
  let state=documents.get(document);if(!state){
   state={document,location,selectionHold:null,selectionPending:new Set(),selectionChallenges:new Set(),legacyAttempted:unknownPredecessor,documentRetired:false,protocolActive:false,admissionSerial:0,admissionClosed:false,receiver:null,ownerToken:null,ownerDomain:null,registration:null,registrationToken:null,nonce:null};
   documents.set(document,state);document.defaultView?.addEventListener('pagehide',()=>{state.documentRetired=true;if(state.selectionHold){state.selectionHold.invalid=true;notifySelection(state);}});receiverRuntime(state);
  }return state;
 }
 function legacyWork(state,operation){
  if(state.documentRetired)return resolved({status:'failed',reason:'document_retired'});
  if(state.selectionHold)return resolved({status:'failed',reason:'document_selection_held'});
  state.legacyAttempted=true;const token=Object.freeze(Object.create(null));state.selectionPending.add(token);
  let value;try{value=operation();}catch(error){state.selectionPending.delete(token);notifySelection(state);throw error;}
  const pending=resolved(value);observe(pending,()=>{state.selectionPending.delete(token);notifySelection(state);},()=>{state.selectionPending.delete(token);notifySelection(state);});return pending;
 }

 class ChatGPTComposerAdapter{
  #selection;
  constructor({document=globalThis.document,location=globalThis.location}={}){
   this.#selection=stateFor(document,location);
   this.document=document;this.location=location;this.saved=null;this.composing=new WeakSet();this.busy=false;this.attempts=new Map();
   this.listeners=[];
   for(const event of ['selectionchange','pointerup','focusout'])this.listen(event,()=>this.remember());
   this.listen('compositionstart',e=>{const node=this.find();if(node?.contains(e.target)){this.composing.add(node);this.saved=null;}});
   this.listen('compositionend',e=>{const node=this.find();if(node?.contains(e.target)){this.composing.delete(node);this.remember();}});
   this.listen('input',e=>{
    // Chromium may commit/cancel IME on cross-origin frame blur without a final
    // compositionend on the old editor. Only subsequent native plain typing
    // proves composition has ended; page-script events cannot clear the fence.
    const node=this.find();
    if(node?.contains(e.target)&&e.isTrusted&&e.isComposing===false&&e.inputType==='insertText')this.composing.delete(node);
    this.remember();
   });
  }
  listen(event,fn){this.document.addEventListener(event,fn,true);this.listeners.push([event,fn]);}
  dispose(){for(const [event,fn]of this.listeners)this.document.removeEventListener(event,fn,true);this.saved=null;this.attempts.clear();}
  discover(){
   // Explicit ChatGPT signatures only. Never rank or fall back to arbitrary editors.
   if(this.location.origin!=='https://chatgpt.com')return {node:null,status:'composer_unrecognized'};
   const selector='#prompt-textarea.ProseMirror[contenteditable="true"], form[data-chatgpt-composer] .ProseMirror[contenteditable="true"], form[data-chatgpt-composer] [data-composer-markdown][contenteditable="true"][role="textbox"]';
   const candidates=[...this.document.querySelectorAll(selector)];
   if(candidates.length>16)return {node:null,status:'composer_ambiguous'};
   const excluded='[data-message-author-role], [data-message-id], [data-testid^="conversation-turn"], [data-turn="user"], [data-turn="assistant"], article, [hidden], [inert], [aria-hidden="true"], [aria-disabled="true"], [aria-readonly="true"], [disabled], [readonly]';
   const nodes=candidates.filter(node=>{
    if(!node.isConnected||!node.isContentEditable||node.closest(excluded)||!node.getClientRects().length)return false;
    const rect=node.getBoundingClientRect();if(rect.width<=0||rect.height<=0)return false;
    let ancestor=node,depth=0;
    for(;ancestor&&depth<64;ancestor=ancestor.parentElement,depth++){
     const style=this.document.defaultView.getComputedStyle(ancestor);
     if(style.display==='none'||style.visibility==='hidden'||style.visibility==='collapse'||style.contentVisibility==='hidden'||Number(style.opacity)===0)return false;
    }
    return !ancestor;
   });
   return nodes.length===1?{node:nodes[0],status:'visible'}:{node:null,status:nodes.length?'composer_ambiguous':'composer_unrecognized'};
  }
  find(){return this.discover().node;}
  model(node){
   if(!node||node.querySelector('[contenteditable="false"], img, iframe, button, input, textarea'))return null;
   let text='',points=[];
   const point=(n,o)=>{points[text.length]={node:n,offset:o};};
   const walk=n=>{
    if(n.nodeType===3){for(let i=0;i<n.data.length;i++){point(n,i);text+=n.data[i];}point(n,n.data.length);return true;}
    if(n.nodeType!==1)return false;
    if(n.tagName==='BR'){
     // ProseMirror's terminal break is a caret placeholder, not a draft character.
     if(n.classList.contains('ProseMirror-trailingBreak')){point(n.parentNode,[...n.parentNode.childNodes].indexOf(n));return true;}
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
  insert(request){return legacyWork(this.#selection,()=>this.#insertOriginal(request));}
  async #insertOriginal({text,operationId,url,guard}){
   if(typeof operationId!=='string'||!/^[a-f0-9-]{36}$/.test(operationId)||typeof text!=='string'||!text.trim()||text.length>LIMIT||text.includes('\r'))return {status:'failed',reason:'invalid_request'};
   if(this.attempts.has(operationId))return {...await this.attempts.get(operationId),replayed:true};
   // Cache the pending attempt as well as its result; never evict and replay.
   if(this.attempts.size>=500)return {status:'failed',reason:'reload_required'};
   const pending=this.once(text,url,guard);this.attempts.set(operationId,pending);return pending;
  }
  once(text,url,guard){return legacyWork(this.#selection,()=>this.#onceOriginal(text,url,guard));}
  async #onceOriginal(text,url,guard){
   if(this.busy)return {status:'failed',reason:'busy'};
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
    if(this.location.href!==url||guard&&!guard()||this.find()!==node||this.composing.has(node)||this.model(node)?.text!==before.text||!this.place(node,before,offset))return {status:'failed',reason:'draft_changed'};
    if(this.location.href!==url||guard&&!guard())return {status:'failed',reason:'draft_changed'};
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
 Object.defineProperty(globalThis,slot,{value:ChatGPTComposerAdapter,writable:false,configurable:false});
 globalThis.PAIAChatGPTComposerAdapter=ChatGPTComposerAdapter;
})();

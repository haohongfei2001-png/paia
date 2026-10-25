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
 const selectionQuiet=state=>!state.selectionPending.size&&!state.registration&&![...state.receipts.values()].some(entry=>entry.active||entry.publishing);
 const selectionTerminal=state=>!state.attempts.size&&![...state.receipts.values()].some(entry=>!entry.nativeTerminal||!entry.ack||entry.ack.outcome==='unknown');
 const selectionProof=(state,hold)=>({version:1,profile:'receipt-only-v1',held:true,challenge:hold.binding.challenge,receiver:copy(state.receiver),ownerToken:state.ownerToken,domainDigest:state.ownerDomain,remainingMs:Math.max(0,hold.deadline-monotonic())});
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
  if(hold||!selectionBinding(state,binding)||state.attempts.size||state.selectionChallenges.size>=128||state.selectionChallenges.has(binding.challenge)||state.admissionClosed)return resolved(selectionReply());
  const started=monotonic();if(!Number.isFinite(started)||state.admissionSerial>=Number.MAX_SAFE_INTEGER)return resolved(selectionReply());
  const next={binding,started,deadline:started+30000,url:state.location.href,invalid:false,ready:false,serial:++state.admissionSerial};
  state.selectionChallenges.add(binding.challenge);state.selectionHold=next;
  return new NativePromise(resolve=>{
   let done=false,timer;next.finish=value=>{if(done)return;done=true;if(timer!==undefined&&typeof originalClearTimeout==='function')apply(originalClearTimeout,globalThis,[timer]);next.check=null;resolve(value);};
   next.check=()=>{if(!selectionLive(state,next)){next.finish(selectionReply());return;}if(!selectionQuiet(state))return;if(!selectionTerminal(state)){next.invalid=true;next.finish(selectionReply());return;}next.serial=state.admissionSerial;next.ready=true;next.finish(selectionProof(state,next));};
   timer=apply(originalSetTimeout,globalThis,[()=>{next.invalid=true;next.finish(selectionReply());},30000]);next.check();
  });
 }

 // Manifest and Release use classic scripts in one top-document isolated world.
 // Keep the original physical boundary even if independently loaded lane bundles
 // evaluate this adapter again. Page JavaScript cannot reach this isolated slot.
 const slot=Symbol.for('paia.original-composer.document-inventory.v1');
 if(globalThis[slot]){globalThis.PAIAChatGPTComposerAdapter=globalThis[slot];return;}
 const inventory={documents:new WeakMap(),proofs:new WeakMap()};
 const messageTypes={manual:'PAIA_PROMPT_INSERT_SELECTED',assist:'PAIA_PROMPT_ASSIST_INSERT',next:'PAIA_PROMPT_NEXT_INSERT'};
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
 const retirementFor=(state,domainDigest)=>{
  let retired=state.retirements.get(domainDigest);
  if(!retired&&state.retirements.size>=16){
   // A clean summary is only a rejection cache, never positive authority.
   // Every uncached wire operation still requires the live original owner.
   const clean=[...state.retirements.keys()].find(domain=>![...state.receipts.values()].some(entry=>entry.domainDigest===domain));
   if(clean!==undefined&&state.admissionSerial<Number.MAX_SAFE_INTEGER){state.retirements.delete(clean);state.admissionSerial++;}
  }
  if(!retired&&state.retirements.size<16){retired={floor:0,intervals:[],overflow:0};state.retirements.set(domainDigest,retired);}
  return retired;
 };
 const retiredEnvelope=(state,envelope)=>{const retired=retirementFor(state,envelope.domainDigest);return !retired||retired.overflow>retired.floor||envelope.epoch<=retired.floor||retired.intervals.some(([start,end])=>start<=envelope.epoch&&envelope.epoch<=end);};
 const reclaimRetired=(state,entry)=>{
  const ack=entry.ack;if(!entry.nativeTerminal||!ack||ack.outcome==='unknown'||entry.active||entry.publishing||state.receipts.get(entry.operationId)!==entry)return;
  if(entry.retirementConfirmed||entry.acknowledged){if(state.admissionSerial>=Number.MAX_SAFE_INTEGER){state.admissionClosed=true;return;}state.admissionSerial++;state.receiptBytes-=entry.bytes;state.receipts.delete(entry.operationId);}
 };
 const retireEpoch=(state,domainDigest,receiptEpoch,epoch,settledClaimIds,retiredEpochFloor)=>{
  const retired=retirementFor(state,domainDigest);if(!retired)return false;
  retired.floor=Math.max(retired.floor,retiredEpochFloor);
  const retained=retired.intervals.filter(([,end])=>end>retired.floor).map(([start,end])=>[Math.max(start,retired.floor+1),end]);
  const ranges=[...retained,...(epoch>retired.floor?[[epoch,epoch]]:[])].sort((a,b)=>a[0]-b[0]),merged=[];
  for(const range of ranges){const last=merged.at(-1);if(last&&range[0]<=last[1]+1)last[1]=Math.max(last[1],range[1]);else merged.push([...range]);}
  while(merged[0]?.[0]===retired.floor+1)retired.floor=merged.shift()[1];
  if(merged.length<=128)retired.intervals=merged;
  else{retired.intervals=retained;retired.overflow=Math.max(retired.overflow,epoch);}
  for(const [id,entry]of state.receipts){
   const ack=entry.ack;if(!ack||ack.outcome==='unknown'||ack.envelope.domainDigest!==domainDigest)continue;
   const exactEpoch=ack.envelope.receiptEpoch===receiptEpoch&&ack.envelope.epoch===epoch;
   if(entry.acknowledged&&(exactEpoch||ack.envelope.epoch<=retired.floor)||exactEpoch&&settledClaimIds.includes(ack.envelope.claimId)){entry.retirementConfirmed=true;reclaimRetired(state,entry);}
  }
  return true;
 };
 const validReceiver=value=>exact(value,['tabId','windowId','documentId','nonce'])&&Number.isSafeInteger(value.tabId)&&value.tabId>=0&&Number.isSafeInteger(value.windowId)&&value.windowId>=0&&typeof value.documentId==='string'&&value.documentId.length>0&&value.documentId.length<=128&&UUID.test(value.nonce);
 const validEnvelope=value=>exact(value,['version','claimId','actionId','operationId','receiptEpoch','epoch','lane','receiver','domainDigest','sourceDigest','authorizationDigest','initiatorDigest','digest'])&&value.version===VERSION&&UUID.test(value.claimId)&&UUID.test(value.actionId)&&UUID.test(value.operationId)&&UUID.test(value.receiptEpoch)&&Number.isSafeInteger(value.epoch)&&value.epoch>0&&['manual','assist','next'].includes(value.lane)&&validReceiver(value.receiver)&&['domainDigest','sourceDigest','authorizationDigest','initiatorDigest','digest'].every(key=>HASH.test(value[key]));
 const rpc=async message=>{const result=await globalThis.chrome.runtime.sendMessage(message);return result?.ok===true?result.data:null;};
 function publishAck(state,entry){
  if(!entry.ack||entry.publishing||entry.acknowledged&&entry.recoveredOwnerToken===state.ownerToken)return;
  const ownerToken=state.ownerToken,ack=copy(entry.ack);
  entry.publishing=rpc({type:'PAIA_PROMPT_INSERTION_ACK',ack}).then(value=>{
   if(!entry.nativeTerminal||canonical(entry.ack)!==canonical(ack))return;
   if(exact(value,['settled'])&&value.settled===true){entry.acknowledged=true;entry.recoveredOwnerToken=ownerToken;}
   // This is a cache-only retirement response, explicitly NOT settlement. Only
   // this entry's own private native terminal proof may consume it.
   if(exact(value,['settled','retired'])&&value.settled===false&&value.retired===true){entry.retirementConfirmed=true;entry.recoveredOwnerToken=ownerToken;}
  },()=>{}).finally(()=>{
   entry.publishing=null;reclaimRetired(state,entry);notifySelection(state);
  });
 }
 function validRetirementSummary(value){
  if(!exact(value,['domainDigest','retiredEpochFloor','retiredRanges'])||!HASH.test(value.domainDigest)||!Number.isSafeInteger(value.retiredEpochFloor)||value.retiredEpochFloor<0||!Array.isArray(value.retiredRanges)||value.retiredRanges.length>500)return false;
  let end=value.retiredEpochFloor;for(const range of value.retiredRanges){if(!exact(range,['start','end'])||!Number.isSafeInteger(range.start)||!Number.isSafeInteger(range.end)||range.start<=end||range.end<range.start)return false;end=range.end;}return true;
 }
 function reclaimSummary(state,summary){
  const entries=[...state.receipts.values()].filter(entry=>entry.nativeTerminal&&entry.acknowledged&&entry.domainDigest===summary.domainDigest).sort((a,b)=>a.ack.envelope.epoch-b.ack.envelope.epoch);
  let index=0;for(const entry of entries){const epoch=entry.ack.envelope.epoch;while(index<summary.retiredRanges.length&&summary.retiredRanges[index].end<epoch)index++;const range=summary.retiredRanges[index];
   if(epoch<=summary.retiredEpochFloor||range&&range.start<=epoch&&epoch<=range.end){entry.retirementConfirmed=true;reclaimRetired(state,entry);}
  }
 }
 async function reconcile(state,ownerToken,recoveryToken){
  if(state.reconciledEvents.has(recoveryToken))return;
  // The original owner rotates its token after at most500 actions, plus one
  // initial recovery event. This is a rejection cache, not an insertion count.
  if(state.reconciledEvents.size>=501)throw Error('receiver recovery capacity');
  state.reconciledEvents.add(recoveryToken);
  const domainDigest=state.ownerDomain;
  const entries=[...state.receipts.values()].filter(entry=>entry.nativeTerminal&&entry.domainDigest===domainDigest&&!entry.active&&!entry.publishing&&entry.recoveredOwnerToken!==ownerToken).slice(0,16);
  if(!entries.length)return;
  const pending=rpc({type:'PAIA_PROMPT_INSERTION_RECONCILE',version:VERSION,ownerToken,recoveryToken,acks:entries.map(entry=>copy(entry.ack))});
  for(const entry of entries)entry.publishing=pending;
  try{
   const result=await pending;
   if(state.ownerToken!==ownerToken||state.ownerDomain!==domainDigest||state.recoveryToken!==recoveryToken||!exact(result,['ownerToken','recoveryToken','results','retirementSummary'])||result.ownerToken!==ownerToken||result.recoveryToken!==recoveryToken||!validRetirementSummary(result.retirementSummary)||result.retirementSummary.domainDigest!==domainDigest||!Array.isArray(result.results)||result.results.length!==entries.length)return;
   const byId=new Map(entries.map(entry=>[entry.ack.envelope.claimId,entry]));
   for(const value of result.results){
    if(!(exact(value,['claimId','settled'])&&typeof value.settled==='boolean'||exact(value,['claimId','settled','retired'])&&value.settled===false&&value.retired===true)||!byId.has(value.claimId))return;
    byId.delete(value.claimId);
   }
   if(byId.size)return;
   for(const value of result.results){const entry=entries.find(item=>item.ack.envelope.claimId===value.claimId);if(value.settled){entry.acknowledged=true;entry.recoveredOwnerToken=ownerToken;}else if(value.retired){entry.retirementConfirmed=true;entry.recoveredOwnerToken=ownerToken;}}
   reclaimSummary(state,result.retirementSummary);
  }catch{/* This event has one bounded batch, never an automatic retry queue. */}
  finally{for(const entry of entries){if(entry.publishing===pending)entry.publishing=null;reclaimRetired(state,entry);notifySelection(state);}}
 }
 async function registered(state,recoveryToken=null){
  if(state.registration&&state.registrationToken!==recoveryToken)throw Error('receiver registration busy');
  if(!state.registration){state.registrationToken=recoveryToken;state.registration=(async()=>{
   const result=await rpc({type:'PAIA_PROMPT_INSERTION_RECEIVER_REGISTER',version:VERSION,nonce:state.nonce,...(recoveryToken===null?{}:{recoveryToken})});
   if(result?.registered!==true||result.version!==VERSION||!UUID.test(result.ownerToken)||!UUID.test(result.recoveryToken)||recoveryToken!==null&&result.recoveryToken!==recoveryToken||!HASH.test(result.domainDigest)||!validReceiver(result.receiver)||result.receiver.nonce!==state.nonce)throw Error('receiver unavailable');
   if(state.ownerToken===result.ownerToken&&state.ownerDomain!==null&&state.ownerDomain!==result.domainDigest)throw Error('receiver source changed');
   if(state.ownerToken!==null&&state.ownerToken!==result.ownerToken){if(state.admissionSerial>=Number.MAX_SAFE_INTEGER){state.admissionClosed=true;throw Error('receiver unavailable');}state.admissionSerial++;state.reconciledEvents.clear();}
   state.receiver=copy(result.receiver);state.ownerToken=result.ownerToken;state.ownerDomain=result.domainDigest;state.recoveryToken=result.recoveryToken;state.protocolActive=true;
   // One bounded reconciliation batch per genuine original recovery event. Unprocessed
   // remainder remains evidence, not a new loop or a completeness claim.
   await reconcile(state,result.ownerToken,result.recoveryToken);
   return state.receiver;
  })().finally(()=>{state.registration=null;state.registrationToken=null;notifySelection(state);});}
  return state.registration;
 }
 function receiverRuntime(state){
  const api=globalThis.chrome?.runtime;if(!api?.onMessage?.addListener||!globalThis.crypto?.subtle)return;
  state.runtime=api;state.runtimeId=api.id;state.runtimeSend=api.sendMessage;state.runtimeMessages=api.onMessage;state.runtimeAdd=api.onMessage.addListener;
  state.nonce=globalThis.crypto.randomUUID();
  api.onMessage.addListener((message,sender,reply)=>{
   if(sender.id!==state.runtimeId||sender.tab)return;
   if(['PAIA_PROMPT_INSERTION_DOCUMENT_HOLD','PAIA_PROMPT_INSERTION_DOCUMENT_FENCE','PAIA_PROMPT_INSERTION_DOCUMENT_RELEASE'].includes(message?.type)){
    observe(documentSelection(state,message),reply,()=>reply(selectionReply()));return true;
   }
   if(message?.type==='PAIA_PROMPT_INSERTION_RECEIVER_PROBE'){
    if(state.selectionHold){reply(null);return;}
    if(!exact(message,['type','version','recoveryToken'])||message.version!==VERSION||!UUID.test(message.recoveryToken)){reply(null);return;}
    registered(state,message.recoveryToken).then(()=>reply({version:VERSION,nonce:state.nonce,profile:'receipt-only-v1'}),()=>reply(null));return true;
   }
   if(message?.type==='PAIA_PROMPT_INSERTION_EPOCH_RETIRE'){
    if(!exact(message,['type','version','domainDigest','receiptEpoch','epoch','settledClaimIds','retiredEpochFloor'])||message.version!==VERSION||!HASH.test(message.domainDigest)||!UUID.test(message.receiptEpoch)||!Array.isArray(message.settledClaimIds)||message.settledClaimIds.length>500||message.settledClaimIds.some(id=>!UUID.test(id))||new Set(message.settledClaimIds).size!==message.settledClaimIds.length||!Number.isSafeInteger(message.epoch)||message.epoch<1||!Number.isSafeInteger(message.retiredEpochFloor)||message.retiredEpochFloor<0){reply({retired:false});return;}
    reply({retired:retireEpoch(state,message.domainDigest,message.receiptEpoch,message.epoch,message.settledClaimIds,message.retiredEpochFloor)});return;
   }
   if(message?.type==='PAIA_PROMPT_INSERTION_RECEIPT_READ'){
    if(!exact(message,['type','version','envelope'])||message.version!==VERSION||!validEnvelope(message.envelope)){reply(null);return;}
    const entry=state.receipts.get(message.envelope.operationId);
    reply(entry?.envelopeKey===canonical(message.envelope)&&entry.ack?copy(entry.ack):null);return;
   }
  });
 }
 const stateFor=(document,location)=>{
  let state=inventory.documents.get(document);
  if(!state){state={document,location,selectionHold:null,selectionPending:new Set(),selectionChallenges:new Set(),documentRetired:false,saved:null,composing:new WeakSet(),busy:false,attempts:new Map(),receipts:new Map(),receiptBytes:0,protocolActive:false,admissionSerial:0,admissionClosed:false,retirements:new Map(),receiver:null,ownerToken:null,ownerDomain:null,recoveryToken:null,reconciledEvents:new Set(),registration:null,registrationToken:null,nonce:null};inventory.documents.set(document,state);document.defaultView?.addEventListener('pagehide',()=>{state.documentRetired=true;if(state.selectionHold){state.selectionHold.invalid=true;notifySelection(state);}});receiverRuntime(state);}
  return state;
 };
 const proven=(result,proof)=>{inventory.proofs.set(result,proof);return result;};
 class ChatGPTComposerAdapter{
  #state;
  constructor({document=globalThis.document,location=globalThis.location}={}){
   this.document=document;this.location=location;this.#state=stateFor(document,location);this.composing=this.#state.composing;this.disposed=false;
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
  get saved(){return this.#state.saved;}
  set saved(value){this.#state.saved=value;}
  get busy(){return this.#state.busy;}
  set busy(value){this.#state.busy=value;}
  listen(event,fn){this.document.addEventListener(event,fn,true);this.listeners.push([event,fn]);}
  dispose(){this.disposed=true;for(const [event,fn]of this.listeners)this.document.removeEventListener(event,fn,true);this.listeners=[];}
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
  insert(request){
   const state=this.#state;if(state.documentRetired)return resolved({status:'failed',reason:'document_retired'});if(state.selectionHold)return resolved({status:'failed',reason:'document_selection_held'});
   const token=Object.freeze(Object.create(null)),serial=state.admissionSerial;state.selectionPending.add(token);
   let result;try{result=this.#insertAccepted(request,serial);}catch(error){state.selectionPending.delete(token);notifySelection(state);throw error;}
   const task=resolved(result);observe(task,()=>{state.selectionPending.delete(token);notifySelection(state);},()=>{state.selectionPending.delete(token);notifySelection(state);});return task;
  }
  async #insertAccepted(request,serial){
   const {text,operationId,url,guard,insertionMessage,lane,qualify}=request||{};
   if(typeof operationId!=='string'||!/^[a-f0-9-]{36}$/.test(operationId)||typeof text!=='string'||!text.trim()||text.length>LIMIT||text.includes('\r'))return {status:'failed',reason:'invalid_request'};
   if(insertionMessage?.insertionReceipt||Object.hasOwn(request,'insertionReceipt'))return this.#withReceipt({text,operationId,url,guard,insertionMessage,lane,qualify},serial);
   // This constructor never admits a legacy physical edit. A pre-existing
   // constructor remains untouched and is refused by the worker profile probe.
   return {status:'failed',reason:'page_refresh_required'};
  }
  async #withReceipt({text,operationId,url,guard,insertionMessage,lane,qualify},acceptedSerial){
   const invalid=()=>({status:'failed',reason:'invalid_insertion_receipt'}),state=this.#state;
   let envelope,message,envelopeKey;
   try{
    if(!validEnvelope(insertionMessage?.insertionReceipt))return invalid();
    envelope=copy(insertionMessage.insertionReceipt);message=copy(insertionMessage);delete message.insertionReceipt;
    if(!validEnvelope(envelope)||envelope.operationId!==operationId||envelope.lane!==lane||message.type!==messageTypes[lane]||message.operationId!==operationId||message.text!==text||(message.url??message.binding?.url)!==url||envelope.receiver.nonce!==state.nonce)return invalid();
    envelopeKey=canonical(envelope);
   }catch{return invalid();}
   try{
    const unsigned={...envelope};delete unsigned.digest;
    const bytes=new TextEncoder().encode(canonical({domain:'paia-prompt-insertion-v1',envelope:unsigned,message}));
    if(bytes.length>1024*1024)return invalid();
    const hash=[...new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
    if(hash!==envelope.digest)return invalid();
   }catch{return invalid();}
   if(state.selectionHold||state.admissionSerial!==acceptedSerial||state.admissionClosed||retiredEnvelope(state,envelope))return invalid();
   const previous=state.receipts.get(operationId);
   if(previous){if(previous.envelopeKey!==envelopeKey)return invalid();return {...copy(await previous.pending),replayed:true};}
   if(state.attempts.has(operationId))return {status:'uncertain',reason:'readback_unconfirmed',replayed:true};
   const bytes=new TextEncoder().encode(envelopeKey).length*4+512;
   if(state.receipts.size>=500||state.receiptBytes+bytes>2*1024*1024)return {status:'failed',reason:'insertion_receipt_capacity'};
   const serial=state.admissionSerial,entry={operationId,domainDigest:envelope.domainDigest,envelopeKey,ack:null,nativeTerminal:false,recoveredOwnerToken:null,active:true,retirementConfirmed:false,pending:null,acknowledged:false,publishing:null,bytes};state.receipts.set(operationId,entry);state.receiptBytes+=bytes;
   entry.pending=(async()=>{
    try{
     const receiver=await registered(state,envelope.actionId);
     if(canonical(receiver)!==canonical(envelope.receiver)||state.ownerDomain!==envelope.domainDigest)return invalid();
     const started=globalThis.performance?.now();
     const admission=await rpc({type:'PAIA_PROMPT_INSERTION_QUALIFY',version:VERSION,envelope});
     const remainingMs=admission?.remainingMs;
     const withinBudget=()=>{const now=globalThis.performance?.now();return Number.isFinite(started)&&Number.isFinite(now)&&now>=started&&now-started<remainingMs;};
     if(admission?.qualified!==true||!Number.isFinite(remainingMs)||remainingMs<=0||remainingMs>30000||!withinBudget()||state.admissionClosed||state.admissionSerial!==serial||retiredEnvelope(state,envelope))return invalid();
     // The original lane's final source/permission/reply qualification follows
     // shared admission, so no new asynchronous boundary follows that check.
     const claim={};let eligible=true;
     if(typeof qualify==='function')try{eligible=await qualify()===true;}catch{eligible=false;}
     const result=await this.#once(text,url,()=>!state.selectionHold&&!state.admissionClosed&&state.admissionSerial===serial&&withinBudget()&&!retiredEnvelope(state,envelope)&&(!guard||guard()),claim,eligible&&withinBudget());
     const proof=inventory.proofs.get(result),outcome=proof?.claim===claim?(proof.kind==='inserted'?'inserted':proof.kind==='not_entered'?'not_inserted':'unknown'):'unknown';
     const ack={version:VERSION,envelope,outcome};entry.nativeTerminal=proof?.claim===claim&&['inserted','not_entered'].includes(proof.kind);entry.ack=copy(ack);
     // Publication is evidence-only. Its eventual response cannot update the
     // caller's stale UI, reuse counters, or invoke another physical insertion.
     publishAck(state,entry);
     return {...result,insertionAck:copy(ack)};
    }catch{return {status:'uncertain',reason:'readback_unconfirmed'};}
   })().finally(()=>{entry.active=false;reclaimRetired(state,entry);});
   return copy(await entry.pending);
  }
  async #once(text,url,guard,claim=null,eligible=true){
   const proof=(result,kind)=>proven(result,{kind,claim});
   if(this.#state.documentRetired)return proof({status:'failed',reason:'document_retired'},'not_entered');
   if(!eligible)return proof({status:'failed',reason:'draft_changed'},'not_entered');
   if(this.disposed)return proof({status:'failed',reason:'composer_unavailable'},'not_entered');
   if(this.busy)return proof({status:'failed',reason:'busy'},'not_entered');
   const node=this.find();if(!node||url!==this.location.href)return proof({status:'failed',reason:'composer_unavailable'},'not_entered');
   if(this.composing.has(node))return proof({status:'failed',reason:'composition_active'},'not_entered');
   const before=this.model(node);if(!before)return proof({status:'failed',reason:'unsupported_composer'},'not_entered');
   let offset=this.current(node,before),strategy='caret';
   if(offset===null&&this.saved?.node===node&&this.saved.url===url&&this.saved.text===before.text)offset=this.saved.offset;
   if(offset===null){offset=before.text.length;strategy='append';}
   const insertion=(strategy==='append'&&before.text&&!before.text.endsWith('\n')?'\n':'')+text;
   const expected=before.text.slice(0,offset)+insertion+before.text.slice(offset);
   if(expected.length>LIMIT)return proof({status:'failed',reason:'draft_too_large'},'not_entered');
   this.busy=true;let observed=false,attempted=false;
   const input=e=>{if(e.isTrusted&&node.contains(e.target)&&e.inputType==='insertText')observed=true;};
   node.addEventListener('input',input,true);
   try{
    node.focus({preventScroll:true});
    if(this.location.href!==url||guard&&!guard()||this.find()!==node||this.composing.has(node)||this.model(node)?.text!==before.text||!this.place(node,before,offset))return proof({status:'failed',reason:'draft_changed'},'not_entered');
    if(this.location.href!==url||guard&&!guard())return proof({status:'failed',reason:'draft_changed'},'not_entered');
    // A synchronous focus, selection or caller guard can retire this document.
    // Check after all such callbacks, without an await before native entry.
    if(this.#state.documentRetired)return proof({status:'failed',reason:'document_retired'},'not_entered');
    attempted=true;
    // Chromium's native editing transaction supplies trusted input and lets
    // ProseMirror's DOM observer reconcile its own editor state. Never set HTML.
    const accepted=this.document.execCommand('insertText',false,insertion);
    await new Promise(resolve=>setTimeout(resolve,0));
    await new Promise(resolve=>setTimeout(resolve,32));
    const after=this.model(node);
    if(this.find()===node&&this.location.href===url&&accepted&&observed&&after?.text===expected&&this.document.activeElement===node&&this.current(node,after)===offset+insertion.length){this.remember();return proof({status:'inserted',verified:true,strategy},'inserted');}
    if(this.find()===node&&after?.text===before.text&&!accepted)return proof({status:'failed',reason:'insertion_rejected'},'unknown');
    return proof({status:'uncertain',reason:'readback_unconfirmed'},'unknown');
   }catch{return proof({status:attempted?'uncertain':'failed',reason:attempted?'readback_unconfirmed':'insertion_unavailable'},attempted?'unknown':'not_entered');}
   finally{node.removeEventListener('input',input,true);this.busy=false;}
  }
 }
 Object.defineProperty(globalThis,slot,{value:Object.freeze(ChatGPTComposerAdapter)});
 globalThis.PAIAChatGPTComposerAdapter=ChatGPTComposerAdapter;
})();

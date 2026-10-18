/* Stage 3A is isolated, prospective and ephemeral. No page bridge or body store. */
(() => {
 'use strict';
 globalThis.PAIANextPromptController?.dispose();
 const reader=new globalThis.PAIAChatGPTCurrentReplyAdapter(),composer=new globalThis.PAIAChatGPTComposerAdapter();
 let authorization=null,binding=null,candidate=null,nonce=null,host=null,frame=null,height=160,epoch=0,timer=null,showTimer=null,inserting=false,disposed=false,offered='',lastActivity=0,composing=false,url=location.href,syncEpoch=0;
 const listeners=[],same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 const listen=(node,event,fn,options)=>{node.addEventListener(event,fn,options);listeners.push(()=>node.removeEventListener(event,fn,options));};
 const rpc=async(type,fields={})=>{const r=await chrome.runtime.sendMessage({type:'PAIA_PROMPT_NEXT_'+type,...fields});if(!r?.ok)throw Error('unavailable');return r.data;};
 function hide(){globalThis.PAIAPromptSurface?.offerSuggestion({source:'local',available:false});host=null;frame=null;nonce=null;}
 function invalidate(){const old=candidate;epoch++;candidate=null;binding=null;hide();clearTimeout(timer);clearTimeout(showTimer);if(old)void rpc('INVALIDATE',{id:old}).catch(()=>{});}
 function idle(){const state=globalThis.PAIAPromptSurface?.nextPlacement();return !document.hidden&&!composing&&performance.now()-lastActivity>=800&&!!state&&!state.dragging;}
 function layout(){return !!globalThis.PAIAPromptSurface?.nextPlacement();}
 async function show(){
  if(!candidate||!binding||!authorization||!idle())return {shown:false};const ticket=epoch;
  try{const result=await rpc('PRESENT',{id:candidate});if(ticket!==epoch||!result.safe||!idle())return {shown:false};
   return {shown:globalThis.PAIAPromptSurface?.offerSuggestion({source:'local',available:true})===true};
  }catch{return {shown:false};}
 }
 async function sync(){
  const ticket=++syncEpoch;
  try{const state=await rpc('STATUS');if(disposed||ticket!==syncEpoch)return;
   if(!state.enabled||state.generation!==authorization){invalidate();reader.reset();offered='';authorization=state.enabled?state.generation:null;}
   if(authorization)scan();
  }catch{if(ticket===syncEpoch){authorization=null;invalidate();reader.reset();}}
 }
 function resume(){if(disposed||!candidate||!binding||!authorization)return;clearTimeout(showTimer);const ticket=epoch;showTimer=setTimeout(()=>{if(ticket===epoch)void show();},850);}
 function scan(mutated=false,allowOffer=true){
  if(disposed)return;
  if(location.href!==url){authorization=null;invalidate();reader.reset();offered='';if(allowOffer){url=location.href;void sync();}return;}
  if(!authorization)return;
  const observed=reader.observe(performance.now(),mutated),next=observed.binding||null;
  if(binding&&!same(binding,next)||observed.invalidated&&candidate)invalidate();
  binding=next;
  if(host)layout();
  if(allowOffer)clearTimeout(timer);
  if(!next)return;
  if(!observed.ready){if(allowOffer)timer=setTimeout(()=>scan(),620);return;}
  const key=JSON.stringify(next);if(!allowOffer||offered===key)return;offered=key;
  const snapshot=reader.snapshot();if(!snapshot)return;
  const ticket=epoch,auth=authorization;
  void rpc('OFFER',{binding:next,authorization:auth,snapshot}).then(result=>{
   if(disposed||ticket!==epoch||authorization!==auth||!same(binding,next)||!result.available)return;
   candidate=result.id;
   // A bounded idle check; later host idle events recheck only this candidate.
   resume();
  }).catch(()=>{if(ticket===epoch){authorization=null;invalidate();reader.reset();offered='';void sync();}});
 }
 const replyMutation=records=>{const current=reader.current;return records.some(r=>current&&(r.target===current||current.contains(r.target))||r.type==='childList'&&[...r.addedNodes,...r.removedNodes].some(n=>n.nodeType===1&&n.matches?.('[data-message-author-role],[data-testid^="conversation-turn"],[data-testid="stop-button"],[data-testid="continue-button"]')));};
 const observer=new MutationObserver(records=>{
  if(location.href!==url){scan();return;}
  if(!authorization)return;
  scan(replyMutation(records));
 });
 const observe=()=>observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['data-message-id','data-message-author-role','data-is-streaming','data-testid','hidden','aria-hidden','disabled']});
 if(document.documentElement)observe();else listen(document,'DOMContentLoaded',observe);
 // Only activity timestamps and an IME boolean. Draft text is never collected here.
 for(const event of ['beforeinput','input','keydown','pointerdown'])listen(document,event,e=>{if(composer.find()?.contains(e.target)){lastActivity=performance.now();if(host&&!inserting)hide();resume();}},true);
 listen(document,'compositionstart',e=>{if(composer.find()?.contains(e.target)){composing=true;lastActivity=performance.now();hide();}},true);
 listen(document,'compositionend',()=>{composing=false;lastActivity=performance.now();resume();},true);
 listen(document,'click',e=>{if(e.isTrusted&&e.target.closest?.('[data-testid^="conversation-turn"] button,article button,[data-testid="continue-button"],[data-testid="stop-button"]')){reader.invalidate();invalidate();offered='';}},true);
 listen(window,'pagehide',()=>{authorization=null;invalidate();reader.reset();});listen(window,'popstate',()=>scan());listen(window,'resize',layout);listen(window,'scroll',layout,{passive:true});
 listen(document,'visibilitychange',()=>{if(document.hidden){reader.invalidate();invalidate();}else void sync();});
 const messages=(r,s,reply)=>{
  if(s.id!==chrome.runtime.id||s.tab)return;
  if(r.type==='PAIA_PROMPT_NEXT_AUTH_CHANGED'){authorization=null;invalidate();reader.reset();offered='';void sync();return;}
  if(r.type==='PAIA_PROMPT_NEXT_PROBE'){
   scan(false,false);reply({authorization,binding,candidate,nonce,idle:idle(),dark:globalThis.PAIAPromptSurface?.nextPlacement()?.dark===true});return;
  }
  if(r.type==='PAIA_PROMPT_NEXT_CONSUMED'){
   scan(false,false);
   if(Object.keys(r).length!==5||!['inserted','uncertain'].includes(r.status)||r.id!==candidate||r.authorization!==authorization||!same(r.binding,binding)){reply({retired:false});return;}
   // Leave the observed completion key consumed. No new snapshot or authority.
   epoch++;candidate=null;hide();clearTimeout(timer);clearTimeout(showTimer);globalThis.PAIAPromptSurface?.retireSuggestion({source:'local',status:r.status});reply({retired:true});return;
  }
  if(r.type==='PAIA_PROMPT_NEXT_HIDE'&&r.nonce===nonce){hide();reply({hidden:true});return;}
  if(r.type==='PAIA_PROMPT_NEXT_RESIZE'&&r.nonce===nonce){height=Math.max(44,Math.min(400,r.height));layout();reply({resized:true});return;}
  if(r.type==='PAIA_PROMPT_NEXT_REOPEN'&&r.id===candidate){show(true).then(reply);return true;}
  if(r.type==='PAIA_PROMPT_NEXT_INSERT'){
   const ticket=epoch;
   // Recheck with the worker immediately before the synchronous native edit.
   (async()=>{const state=await rpc('STATUS');if(r.sourceType==='PROMPT_FAMILY'){const qualified=await rpc('PRESENT',{id:r.id});if(!qualified.safe)throw Error('stale_family');}return state;})().then(state=>{
    scan();
    if(ticket!==epoch||!state.enabled||state.generation!==authorization||r.authorization!==authorization||r.id!==candidate||!same(r.binding,binding))return {status:'failed',reason:'stale_candidate'};
    inserting=true;return composer.insert({text:r.text,operationId:r.operationId,url:r.binding.url,guard:()=>{const pending=observer.takeRecords();scan(replyMutation(pending));return ticket===epoch&&r.authorization===authorization&&r.id===candidate&&same(r.binding,binding);}}).finally(()=>{inserting=false;});
   }).then(reply,()=>reply({status:'failed',reason:'permission_revoked'}));return true;
  }
 };
 chrome.runtime.onMessage.addListener(messages);
 const storage=(changes,area)=>{if(area==='local'&&changes.promptNextAutomaticPreferenceV2){authorization=null;invalidate();reader.reset();offered='';void sync();}};
 chrome.storage.onChanged.addListener(storage);
 globalThis.PAIANextPromptController={resume,dispose(){disposed=true;++syncEpoch;authorization=null;invalidate();observer.disconnect();composer.dispose();listeners.forEach(fn=>fn());chrome.runtime.onMessage.removeListener(messages);chrome.storage.onChanged.removeListener(storage);}};
 void sync();
})();

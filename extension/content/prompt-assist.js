/* Explicit Assist only. Prospective metadata observation never uploads a body. */
(() => {
 'use strict';
 function install(){
 globalThis.PAIAAssistPromptController?.dispose();
 let authorization=null,disposed=false,syncEpoch=0,timer=null,url=location.href,controller,readyKey='',contextEpoch=0;
 const rpc=async(type,fields={})=>{const r=await chrome.runtime.sendMessage({type:'PAIA_PROMPT_ASSIST_'+type,...fields});if(!r?.ok)throw Error('unavailable');return r.data;};
 const invalidate=()=>{readyKey='';if(authorization)void rpc('INVALIDATE',{generation:authorization}).catch(()=>{});};
 const reader=new globalThis.PAIAChatGPTCurrentReplyAdapter(),composer=new globalThis.PAIAChatGPTComposerAdapter();
 controller=new globalThis.PAIAAssistResultController({reader,composer,onInvalidated:invalidate});
 function scan(){clearTimeout(timer);if(disposed)return;if(location.href!==url){url=location.href;authorization=null;controller.configure(false);void sync();return;}const state=controller.scan();if(state?.ready&&authorization){const key=JSON.stringify(state.binding);if(key!==readyKey){readyKey=key;void rpc('READY',{generation:authorization}).catch(()=>{});}}if(state?.binding&&!state.ready)timer=setTimeout(scan,620);return state;}
 async function sync(){const ticket=++syncEpoch;try{const state=await rpc('STATUS');if(disposed||ticket!==syncEpoch)return;const next=state.replyAccess&&state.remoteProcessing?state.generation:null;if(next!==authorization){authorization=null;readyKey='';controller.configure(false);authorization=next;controller.configure(!!next);}scan();}catch{if(ticket===syncEpoch){authorization=null;controller.configure(false);}}}
 // The original controller observes reply metadata. This timer only lets its
 // bounded 600 ms stable-completion gate settle; it never asks for a suggestion.
 const observer=new MutationObserver(()=>{scan();});observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['data-is-streaming','data-testid','hidden','aria-hidden']});
 const messages=(r,s,reply)=>{
  if(s.id!==chrome.runtime.id||s.tab)return;
  // This notification only invalidates an outstanding worker qualification.
  // It never enables access, refreshes a reply or authorizes an insertion.
  if(r.type==='PAIA_CONTEXT_CARDS_CHANGED'){++contextEpoch;reply({invalidated:true});return;}
  if(r.type==='PAIA_PROMPT_ASSIST_AUTH_CHANGED'){authorization=null;controller.configure(false);void sync();return;}
  if(r.type==='PAIA_PROMPT_ASSIST_PROBE'){
   if(r.generation!==authorization){reply({ready:false,generation:authorization});void sync();return;}scan();reply({generation:authorization,...controller.probe({snapshot:r.snapshot===true})});return;
  }
  if(r.type==='PAIA_PROMPT_ASSIST_INSERT'){
   const generation=authorization,contextFence=contextEpoch;
   if(!generation||r.generation!==generation){reply({status:'failed',reason:'stale_assist'});return;}
   controller.insert({...r,isCurrent:()=>!disposed&&contextEpoch===contextFence&&authorization===generation&&r.generation===generation,qualify:async()=>{const result=await rpc('QUALIFY',{id:r.id,operationId:r.operationId,generation});return contextEpoch===contextFence&&result.qualified===true&&result.generation===authorization;}}).then(reply,()=>reply({status:'failed',reason:'stale_assist'}));return true;
  }
 };
 const storage=(changes,area)=>{if(area==='session'&&changes.promptAssistAuthorizationV1){authorization=null;controller.configure(false);void sync();}};
 const hidden=()=>{if(document.hidden){reader.invalidate();invalidate();}else void sync();};
 const navigation=()=>scan();
 const pagehide=()=>{invalidate();authorization=null;controller.configure(false);};
 const click=e=>{if(e.isTrusted&&e.target.closest?.('[data-testid^="conversation-turn"] button,article button,[data-testid="continue-button"],[data-testid="stop-button"]')){reader.invalidate();invalidate();}};
 chrome.runtime.onMessage.addListener(messages);chrome.storage.onChanged.addListener(storage);document.addEventListener('visibilitychange',hidden);document.addEventListener('click',click,true);window.addEventListener('popstate',navigation);window.addEventListener('pagehide',pagehide);
 globalThis.PAIAAssistPromptController={dispose(){disposed=true;++syncEpoch;clearTimeout(timer);authorization=null;controller.dispose();observer.disconnect();chrome.runtime.onMessage.removeListener(messages);chrome.storage.onChanged.removeListener(storage);document.removeEventListener('visibilitychange',hidden);document.removeEventListener('click',click,true);window.removeEventListener('popstate',navigation);window.removeEventListener('pagehide',pagehide);}};
 void sync();
 }
 if(document.documentElement)install();else document.addEventListener('DOMContentLoaded',install,{once:true});
})();

/* Only worker-selected text crosses into this isolated world. No DOM bridge. */
(() => {
 'use strict';
 globalThis.PAIAPromptReuseController?.dispose();
 const adapter=new globalThis.PAIAChatGPTComposerAdapter();let releaseActivation=null;
 // A held private-frame activation must never turn into host Send after focus
 // returns. Only trusted auto-repeat for that physical key is consumed. A new
 // non-repeat press proves release even when its keyup stayed in the frame.
 const guardActivation=key=>{
  releaseActivation?.();if(!['Enter',' '].includes(key))return;
  const release=()=>{document.removeEventListener('keydown',down,true);document.removeEventListener('keyup',up,true);window.removeEventListener('blur',release,true);if(releaseActivation===release)releaseActivation=null;};
  const down=e=>{if(!e.isTrusted||e.key!==key)return;if(!e.repeat){release();return;}e.preventDefault();e.stopImmediatePropagation();};
  const up=e=>{if(!e.isTrusted||e.key!==key)return;e.preventDefault();e.stopImmediatePropagation();release();};
  document.addEventListener('keydown',down,true);document.addEventListener('keyup',up,true);window.addEventListener('blur',release,true);releaseActivation=release;
 };
 const listener=(request,sender,reply)=>{
  if(sender.id!==chrome.runtime.id||sender.tab||request?.type!=='PAIA_PROMPT_INSERT_SELECTED')return;
  if(Object.hasOwn(request,'activationKey')&&!['Enter',' '].includes(request.activationKey)){reply({status:'failed',reason:'invalid_request'});return;}
  if(request.activationKey)guardActivation(request.activationKey);
  adapter.insert(request).then(result=>{if(result.status==='failed')releaseActivation?.();reply(result);},()=>reply({status:'uncertain',reason:'readback_unconfirmed'}));return true;
 };
 chrome.runtime.onMessage.addListener(listener);
 globalThis.PAIAPromptReuseController={dispose(){releaseActivation?.();adapter.dispose();chrome.runtime.onMessage.removeListener(listener);}};
})();

/* Only worker-selected text crosses into this isolated world. No DOM bridge. */
(() => {
 'use strict';
 globalThis.PAIAPromptReuseController?.dispose();
 const adapter=new globalThis.PAIAChatGPTComposerAdapter();
 const listener=(request,sender,reply)=>{
  if(sender.id!==chrome.runtime.id||sender.tab||request?.type!=='PAIA_PROMPT_INSERT_SELECTED')return;
  adapter.insert(request).then(reply,()=>reply({status:'uncertain',reason:'readback_unconfirmed'}));return true;
 };
 chrome.runtime.onMessage.addListener(listener);
 globalThis.PAIAPromptReuseController={dispose(){adapter.dispose();chrome.runtime.onMessage.removeListener(listener);}};
})();

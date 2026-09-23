// Page-lifetime flush plus bounded local recovery-draft protection. Recovery drafts are not Source/history truth.
export function isComposing(editor){return !!(editor?.composing||editor?.surface?.composing||editor?.entry?.surface?.composing||editor?.metadata?.some(isComposing));}
export function pendingEditor(editor){return !!editor&&(isComposing(editor)||editor.dirty()||editor.saving||editor.recoveryPending);}
export function installSaveLifecycle(getEditors,{target=window,documentTarget=document}={}){
 const controller=new AbortController(),options={signal:controller.signal};
 const flush=()=>{for(const editor of getEditors().filter(Boolean)){if(isComposing(editor))continue;editor.collect?.();if(editor.dirty()||editor.saving)void editor.flush().catch(()=>{});}};
 target.addEventListener('beforeunload',event=>{const pending=getEditors().some(pendingEditor);flush();if(pending){event.preventDefault();event.returnValue='';}},options);
 documentTarget.addEventListener('visibilitychange',()=>{if(documentTarget.visibilityState==='hidden')flush();},options);
 target.addEventListener('pagehide',flush,options);
 return {flush,dispose:()=>controller.abort()};
}

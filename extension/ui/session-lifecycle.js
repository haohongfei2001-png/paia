// Page-lifetime protection only. No durable shadow drafts or paid requests.
export function isComposing(editor){return !!(editor?.composing||editor?.surface?.composing||editor?.entry?.surface?.composing||editor?.metadata?.some(isComposing));}
export function pendingEditor(editor){return !!editor&&(isComposing(editor)||editor.dirty()||editor.saving);}
export function installSaveLifecycle(getEditors,{target=window,documentTarget=document}={}){
 const controller=new AbortController(),options={signal:controller.signal};
 const flush=()=>{for(const editor of getEditors().filter(Boolean)){if(isComposing(editor))continue;editor.collect?.();if(editor.dirty()||editor.saving)void editor.flush().catch(()=>{});}};
 target.addEventListener('beforeunload',event=>{const pending=getEditors().some(pendingEditor);flush();if(pending){event.preventDefault();event.returnValue='';}},options);
 documentTarget.addEventListener('visibilitychange',()=>{if(documentTarget.visibilityState==='hidden')flush();},options);
 target.addEventListener('pagehide',flush,options);
 return {flush,dispose:()=>controller.abort()};
}

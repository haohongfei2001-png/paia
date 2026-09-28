// Detached CPV1-09.2 native-textarea session. No page/worker bridge is enabled.
// The owning UI must authorize a current saved template and reviewed target;
// session creation does not confer a read grant or a provider-send capability.
import {planPromptDraftInsertion,PromptDraftInsertionError} from '../core/prompt-draft-insertion.js';
const fail=code=>{throw new PromptDraftInsertionError(code);};
function choice(value){
 if(!value||typeof value!=='object'||Array.isArray(value)
  ||![Object.prototype,null].includes(Object.getPrototypeOf(value)))fail('PROMPT_INSERT_INVALID');
 const ds=Object.getOwnPropertyDescriptors(value);
 if(!Object.hasOwn(ds,'mode')||Reflect.ownKeys(ds).some(k=>typeof k!=='string'
  ||!['mode','replaceConfirmed'].includes(k)||!Object.hasOwn(ds[k],'value')||!ds[k].enumerable))fail('PROMPT_INSERT_INVALID');
 return Object.fromEntries(Object.keys(ds).map(k=>[k,ds[k].value]));
}
export function createPromptInputSession(target){
 const document=target?.ownerDocument,window=document?.defaultView;
 if(!window||window.top!==window||!(target instanceof window.HTMLTextAreaElement))fail('PROMPT_TARGET_UNSUPPORTED');
 const prototype=window.HTMLTextAreaElement.prototype,value=Object.getOwnPropertyDescriptor(prototype,'value'),
  maximum=Object.getOwnPropertyDescriptor(prototype,'maxLength').get;
 let disposed=false,revision=0,pending=null,composing=false,compositionKnown=document.activeElement!==target;
 const clock=window.performance.now.bind(window.performance);
 const clear=()=>{if(pending){pending.valid=false;pending.text='';pending.draft='';pending=null;}};
 const changed=()=>{revision++;clear();};
 const input=event=>{if(event.isComposing){composing=true;compositionKnown=true;}changed();};
 const start=()=>{composing=true;compositionKnown=true;changed();};
 const end=()=>{composing=false;compositionKnown=true;changed();};
 const focus=()=>{compositionKnown=true;changed();};
 const blur=()=>{composing=false;compositionKnown=true;changed();};
 const events=[['input',input],['beforeinput',input],['compositionstart',start],['compositionend',end],['focus',focus],['blur',blur]];
 for(const [type,listener]of events)target.addEventListener(type,listener);
 function ready(){
  if(disposed||target.ownerDocument!==document||!target.isConnected||target.hidden
   ||target.matches(':disabled')||target.hasAttribute('readonly')||target.getAttribute('aria-disabled')==='true'
   ||target.getClientRects().length===0)fail('PROMPT_TARGET_UNAVAILABLE');
  if(!compositionKnown)fail('PROMPT_COMPOSITION_UNKNOWN');
  if(composing)fail('PROMPT_COMPOSING');
 }
 return Object.freeze({
  prepare(text){
   // Validate full template before reading any target draft. Trackers must be
   // installed before composition; an already-focused unknown field refuses.
   planPromptDraftInsertion({mode:'append',text,draft:'',expectedDraft:''});
   ready();clear();
   const snapshot={text,draft:value.get.call(target),revision,time:clock(),valid:true};
   pending=snapshot;
   return Object.freeze({
    cancel(){const active=pending===snapshot&&snapshot.valid;if(active)clear();return active;},
    commit(request){
     try{
      const selected=choice(request);ready();
      if(pending!==snapshot||!snapshot.valid||snapshot.revision!==revision
       ||clock()-snapshot.time>30000)fail('PROMPT_INSERT_STALE');
      const draft=value.get.call(target),planned=planPromptDraftInsertion({text:snapshot.text,draft,
       expectedDraft:snapshot.draft,...selected});
      // Native textarea value setters normalize CR/CRLF. Refuse before writing
      // rather than silently changing complete Source/template characters.
      if(planned.text.includes('\r'))fail('PROMPT_INPUT_NORMALIZATION');
      const max=maximum.call(target);if(max>=0&&planned.text.length>max)fail('PROMPT_INSERT_LIMIT');
      const result=Object.freeze({mode:planned.mode,characters:planned.text.length});
      clear();value.set.call(target,planned.text);
      target.dispatchEvent(new window.InputEvent('input',{bubbles:true,inputType:'insertText',data:null}));
      return result;
     }catch(error){if(pending===snapshot)clear();throw error;}
    }
   });
  },
  dispose(){if(disposed)return;disposed=true;clear();for(const [type,listener]of events)target.removeEventListener(type,listener);}
 });
}

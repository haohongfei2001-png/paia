// Invocation-local coordination of an existing trusted saved-template reader
// and target-bound native input session. No page transport or entrypoint here.
import {PromptDraftInsertionError} from '../core/prompt-draft-insertion.js';
const fail=code=>{throw new PromptDraftInsertionError(code);};
const codes=new Set(['PROMPT_INVALID','PROMPT_STALE','PROMPT_UNAVAILABLE','PROMPT_LIMIT',
 'CONSENT_REQUIRED','FORBIDDEN','PROMPT_INSERT_INVALID','PROMPT_INSERT_STALE','PROMPT_INSERT_LIMIT',
 'PROMPT_REPLACE_CONFIRMATION_REQUIRED','PROMPT_TARGET_UNSUPPORTED','PROMPT_TARGET_UNAVAILABLE',
 'PROMPT_COMPOSING','PROMPT_COMPOSITION_UNKNOWN','PROMPT_INPUT_NORMALIZATION']);
function finite(error){
 let code='PROMPT_INSERT_UNAVAILABLE';
 try{const d=Object.getOwnPropertyDescriptor(error,'code');
  if(d&&Object.hasOwn(d,'value')&&typeof d.value==='string'&&codes.has(d.value))code=d.value;
 }catch{/* Foreign error access cannot expose its private exception text. */}
 return new PromptDraftInsertionError(code);
}
function fields(value,required,allowed){
 if(!value||typeof value!=='object'||Array.isArray(value)
  ||![Object.prototype,null].includes(Object.getPrototypeOf(value)))fail('PROMPT_INSERT_INVALID');
 const ds=Object.getOwnPropertyDescriptors(value);
 if(required.some(k=>!Object.hasOwn(ds,k))||Reflect.ownKeys(ds).some(k=>typeof k!=='string'
  ||!allowed.includes(k)||!Object.hasOwn(ds[k],'value')||!ds[k].enumerable))fail('PROMPT_INSERT_INVALID');
 return Object.fromEntries(Object.keys(ds).map(k=>[k,ds[k].value]));
}
function selection(value){
 const result=fields(value,['id','expectedRevision'],['id','expectedRevision']);
 if(typeof result.id!=='string'||!result.id.length||!Number.isSafeInteger(result.expectedRevision)
  ||result.expectedRevision<1)fail('PROMPT_INSERT_INVALID');
 return Object.freeze(result);
}
function choice(value){
 const result=fields(value,['mode'],['mode','replaceConfirmed']);
 if(!['append','replace'].includes(result.mode)
  ||(Object.hasOwn(result,'replaceConfirmed')&&typeof result.replaceConfirmed!=='boolean'))fail('PROMPT_INSERT_INVALID');
 return Object.freeze(result);
}
function saved(row,selected){
 // The existing reader owns row/schema/consent validation. Still refuse malformed
 // identity/body descriptors without invoking a foreign response accessor.
 if(!row||typeof row!=='object')fail('PROMPT_INSERT_INVALID');
 const ds=Object.getOwnPropertyDescriptors(row),out={};
 for(const k of ['kind','id','revision','lifecycle','text']){
  if(!ds[k]||!Object.hasOwn(ds[k],'value')||!ds[k].enumerable)fail('PROMPT_INSERT_INVALID');
  out[k]=ds[k].value;
 }
 if(out.kind!=='template'||out.lifecycle!=='active'||out.id!==selected.id
  ||out.revision!==selected.expectedRevision||typeof out.text!=='string')fail('PROMPT_INSERT_STALE');
 return out.text;
}
export function createPromptInsertionController({readTemplate,session}){
 if(typeof readTemplate!=='function'||typeof session?.prepare!=='function'
  ||typeof session?.dispose!=='function')fail('PROMPT_INSERT_INVALID');
 let disposed=false,pending=null;
 function clear(){
  const current=pending;pending=null;
  if(current){current.text='';current.phase='cancelled';current.token?.cancel();}
 }
 function active(current){if(disposed||pending!==current)fail('PROMPT_INSERT_STALE');}
 return Object.freeze({
  async prepare(value){
   clear();if(disposed)fail('PROMPT_INSERT_STALE');
   const selected=selection(value),current={selected,text:'',token:null,phase:'reading'};pending=current;
   try{
    const row=await readTemplate(selected);active(current);
    current.text=saved(row,selected);current.token=session.prepare(current.text);current.phase='prepared';
    return Object.freeze({
     cancel(){const own=pending===current;if(own)clear();return own;},
     async commit(value){
      try{
       active(current);if(current.phase!=='prepared')fail('PROMPT_INSERT_STALE');
       const selectedChoice=choice(value);current.phase='committing';
       // Exactly one fresh expected-revision read; never automatically retry a
       // read or DOM effect when its result is unknown.
       const row=await readTemplate(current.selected);active(current);
       if(saved(row,current.selected)!==current.text)fail('PROMPT_INSERT_STALE');
       const result=current.token.commit(selectedChoice);clear();return result;
      }catch(error){if(pending===current)clear();throw finite(error);}
     }
    });
   }catch(error){if(pending===current)clear();throw finite(error);}
  },
  dispose(){if(disposed)return;disposed=true;clear();session.dispose();}
 });
}

// CPV1-09.2 detached draft planning only. No DOM, transport, permissions,
// provider requests, clipboard, storage or send action. An owning UI must still
// prove the current saved template, selected target and explicit human gesture.
import {MAX_MESSAGE_LENGTH} from './constants.js';
export class PromptDraftInsertionError extends Error{
 constructor(code='PROMPT_INSERT_INVALID'){super(code);this.code=code;}
}
const fail=code=>{throw new PromptDraftInsertionError(code);};
const required=['mode','text','draft','expectedDraft'],allowed=new Set([...required,'replaceConfirmed']);
function valueCopy(value){
 if(!value||typeof value!=='object'||Array.isArray(value)
  ||![Object.prototype,null].includes(Object.getPrototypeOf(value)))fail('PROMPT_INSERT_INVALID');
 const descriptors=Object.getOwnPropertyDescriptors(value);
 if(required.some(key=>!Object.hasOwn(descriptors,key))||Reflect.ownKeys(descriptors).some(key=>
  typeof key!=='string'||!allowed.has(key)||!Object.hasOwn(descriptors[key],'value')||!descriptors[key].enumerable))
  fail('PROMPT_INSERT_INVALID');
 return Object.fromEntries(Object.keys(descriptors).map(key=>[key,descriptors[key].value]));
}
export function planPromptDraftInsertion(value){
 const request=valueCopy(value),{mode,text,draft,expectedDraft,replaceConfirmed}=request;
 if(!['append','replace'].includes(mode)||typeof text!=='string'||!text.trim()
  ||typeof draft!=='string'||typeof expectedDraft!=='string'
  ||replaceConfirmed!==undefined&&typeof replaceConfirmed!=='boolean')fail('PROMPT_INSERT_INVALID');
 if([text,draft,expectedDraft].some(body=>body.length>MAX_MESSAGE_LENGTH))fail('PROMPT_INSERT_LIMIT');
 // Exact bytes/code units, never search normalization, trim or a clipped preview.
 if(draft!==expectedDraft)fail('PROMPT_INSERT_STALE');
 // Whitespace is still an existing human draft. A pure confirmation flag is
 // not a grant, user gesture or authorization to write a provider's input.
 if(mode==='replace'&&draft.length&&replaceConfirmed!==true)fail('PROMPT_REPLACE_CONFIRMATION_REQUIRED');
 const result=mode==='append'&&draft.length?draft+'\n'+text:text;
 // Use the existing full canonical message limit. Refuse instead of truncating;
 // the product owner can offer its existing complete manual-copy fallback.
 if(result.length>MAX_MESSAGE_LENGTH)fail('PROMPT_INSERT_LIMIT');
 return Object.freeze({mode,text:result});
}

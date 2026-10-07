import {PROMPT_REUSE_ROW,readPromptPreferences} from '../prompt-reuse-preferences.js';
import {projectEntity,validateEntity} from './codecs.js';
import {clone,equal,fail} from './value.js';

// Explicit dependency injection only. The service worker does not construct this
// journal, so this proof cannot enable cloud access or change ordinary saves.
export class PromptSyncJournal {
 constructor(core){this.core=core;}
 async prepare(before,after){
  const old=projectEntity('promptPreferences',before),next=projectEntity('promptPreferences',after);
  const head=await this.core.read('head','promptPreferences',PROMPT_REUSE_ROW);
  if(head?.purged)fail('BNS_ENTITY_PURGED');
  if(head?.revisions.length>1)fail('BNS_CONFLICT_REQUIRES_RESOLUTION');
  if(head){const revision=await this.core.read('revision',head.revisions[0]);if(!equal(revision?.operation.value,old))fail('BNS_OWNER_CHANGED');}
  else if(old.pins.length||old.overrides.length||old.splits.length)fail('BNS_BOOTSTRAP_REQUIRED');
  return this.core.prepare([{type:'promptPreferences',value:next}]);
 }
 async commit(t,prepared){return this.core.commitPrepared(t,prepared,{materialize:false});}
 async bootstrap(){
  const before=await this.core.repository.transaction(false,t=>readPromptPreferences(t),['meta']);
  if(await this.core.read('head','promptPreferences',PROMPT_REUSE_ROW))fail('BNS_BOOTSTRAP_EXISTS');
  const prepared=await this.core.prepare([{type:'promptPreferences',value:projectEntity('promptPreferences',before)}],{actor:'bootstrap'});
  return this.core.commit(prepared,async t=>{if(!equal(await readPromptPreferences(t),before))fail('BNS_OWNER_CHANGED');});
 }
}
export async function materializePrompt(t,{operation,head,origin}){
 if(operation.type!=='promptPreferences')fail('BNS_MATERIALIZER_UNSUPPORTED');
 if(head.purged)fail('BNS_PROMPT_PURGE_SCOPE_UNAVAILABLE');
 const portable=validateEntity(operation.type,operation.value),local=await readPromptPreferences(t);
 const value={...clone(portable),revision:local.revision+1,overrides:portable.overrides.map(item=>({...item,reuseCount:origin==='remote'?0:local.overrides.find(x=>x.id===item.id)?.reuseCount||0}))};
 await t.put('meta',value);
}

import {registerRepositoryFinalReadFence} from '../idb-repository.js';
import {CONTROL_PUBLICATION_REVISION,CONTROL_PUBLICATION_RESERVATION} from '../local-control-publication.js';
import {PROMPT_REUSE_ROW} from '../prompt-reuse-preferences.js';
import {PROMPT_CORRECTION_BINDING_ROW} from './prompt-correction-binding.js';
import {bytes,clone,equal,fail} from './value.js';

// The finite manual merge changes only the existing Context/Prompt owners.
// Capture only the admitted manual owners and their two protocol namespaces.
// Unrelated metadata contributes keys, never bodies. Close this cut after the
// original finalizers; their rebuildable semantic delta prefix may vary.
export async function sealManualMergeTransaction(store,core,t,{started,stage}){
 const database=core.repository.db,rows=[],counts=[];let retained=0;
 const current=()=>{if(core.repository!==store.repository||core.repository.db!==database||performance.now()-started>=30000)fail('BNS_GROUP_RESOURCE_LIMIT');return true;};
 const keep=value=>{retained+=bytes(value).length;if(retained>2*1024*1024)fail('BNS_GROUP_RESOURCE_LIMIT');return clone(value);};
 const metaRanges=[IDBKeyRange.upperBound('aiu:delta:',true),IDBKeyRange.lowerBound('aiu:delta:\uffff',true)];
 const namespaces=[core.prefix+'generation:'+await core.bind(t)+':',stage.prefix+'generation:'+stage.fixedNamespace+':'];
 const named=new Set([CONTROL_PUBLICATION_REVISION,CONTROL_PUBLICATION_RESERVATION,'migration','gate','recovery-restore-epoch','backup-data-generation','context-cards:v1',PROMPT_REUSE_ROW,PROMPT_CORRECTION_BINDING_ROW,'context-topic-access:v1','smart-filter','thought-suppression-key','thought-sequence','revision-sequence','input-delta-sequence','thought-epoch',core.prefix+'active']);
 for(const table of t.tx.objectStoreNames){current();const total=await t.count(table);if(total>4096)fail('BNS_GROUP_RESOURCE_LIMIT');
  if(table!=='meta'){counts.push({table,value:total});continue;}
  const keys=(await t.keys(table,null,undefined,4096)).filter(key=>typeof key!=='string'||!key.startsWith('aiu:delta:'));for(const key of keys){keep(key);current();
   if(named.has(key)||namespaces.some(prefix=>typeof key==='string'&&key.startsWith(prefix))){const value=await t.get(table,key);let expected=value;if(key==='backup-data-generation'&&t.backupChanged)expected={...value,value:value.value+1};rows.push({table,key:keep(key),value:keep(expected)});}
   else{counts.push({table,key:IDBKeyRange.only(key),value:1});}
  }
  for(const key of metaRanges){counts.push({table,key,value:keys.filter(value=>key.includes(value)).length});}
 }
 // A no-op merge does not touch backup data. A real manual materialization
 // relies on the original Repository increment, not a parallel counter write.
 const backup=rows.find(row=>row.table==='meta'&&row.key==='backup-data-generation');if(t.backupChanged&&!backup)fail('BNS_GROUP_COMMIT_UNPROVEN');
 current();registerRepositoryFinalReadFence(core.repository,t,{isCurrent:current,plan:function*(){
  for(const c of counts){const value=yield {method:'count',table:c.table,...(c.key?{key:c.key}:{})};if(value!==c.value)fail('BNS_RESTORE_LOCAL_CHANGED');}
  for(const r of rows){const value=yield {method:'get',table:r.table,key:r.key};if(!equal(value??null,r.value??null))fail('BNS_RESTORE_LOCAL_CHANGED');}
  return true;
 }});
}

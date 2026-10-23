from pathlib import Path
p=Path('extension/core/browser-native-sync/saved-work-bootstrap.js');s=p.read_text();s="import {deltaDescription,observeSemanticChange,planSemanticDeltaWrite,KNOWN_PREFIX,DIRTY_PREFIX,DELTA_COUNTER,HUMAN_FENCE} from '../ai-usage/delta.js';\nimport {measureSourceWorkingPhysicalTree,equalSourceWorkingPhysicalTree} from './source-working-physical.js';\n"+s;s=s.replace("import {ownerVersion} from '../library-search.js';","import {ownerVersion,planSearchQueueLocator} from '../library-search.js';")
s=s.replace("['thoughts',null,null,p.members.length],","['thoughts',null,null,p.members.length+(originalHumanSavedScopePartition(scope,store)?.entries.length||0)],")
s+='''
// A finite existing mixed cut keeps every non-target physical row. Its expected
// delta is constructed BEFORE the original Saved writer from its private plan;
// a post-owner snapshot cannot turn corruption into a new preservation baseline.
const mixedRetentions=new WeakMap();
export async function prepareSavedMixedRetention(store,core,t,scope,edit,stage){
 const human=originalHumanSavedScopePartition(scope,store);if(!human)return null;
 const owner=savedScopes.get(scope),p=edit?savedEdits.get(edit):null;
 if(!owner||owner.store!==store||owner.core!==core||edit&&(!p||p.store!==store||p.core!==core||!p.incoming))fail('BNS_SAVED_WORK_CAPABILITY');
 requireOriginalGroupCheckpointPlan(core,owner.plan);requireRepositoryTransactionScope(store.repository,t);requireRepositoryTransactionDataMethods(store.repository,t);
 const database=store.repository.db,start=Date.now(),tables=new Map();let retained=0;
 const current=()=>{if(store.repository!==core.repository||store.repository.db!==database||Date.now()-start>=30000||retained>limit)fail('BNS_SAVED_WORK_LIMIT');return true;};
 for(const name of t.tx.objectStoreNames){const rows=await readGroupRows(t,name);for(const row of rows){retained+=measureSourceWorkingPhysicalTree(row).B;current();}tables.set(name,new Map(rows.map(row=>[row.id,row])));}
 // This first mixed consumer has no AI jobs to invalidate. It never skips a
 // real job owner or declares its original semantic transition unchanged.
 if(tables.get('organizerJobs')?.size||t.semanticChanges?.size||t.aiUsageBoundaryChanged)fail('BNS_SAVED_WORK_UNSUPPORTED');
 const put=(table,key,row)=>{current();const map=tables.get(table);if(!map)fail('BNS_SAVED_WORK_CAPABILITY');if(row===null)map.delete(key);else{retained+=measureSourceWorkingPhysicalTree(row).B;current();map.set(key,clone(row));}};
 if(p){
  const {view,request}=p,operation=p.prepared.operations[0],meta=tables.get('meta');
  for(const [key,row]of await savedProtocolIntent(t,core,operation,false))put('meta',key,row);
  const markerKey=await core.idIn(t,'savedEditReceipt',request.operationId),physicalKey=await core.idIn(t,'savedPhysical',request.id);
  put('meta',markerKey,{id:markerKey,version:1,requestDigest:p.requestDigest,result:clone(view.result),protocolOperationId:operation.operationId,revisionId:operation.revisionId});
  put('meta',physicalKey,{id:physicalKey,version:1,revisionId:operation.revisionId,wire:savedPhysical(operation.value.after),local:savedPhysical({entry:view.entry,history:view.history})});
  put('meta','thought-sequence',{id:'thought-sequence',value:view.operationReceipt.operationSequence});put('meta','revision-sequence',{id:'revision-sequence',value:view.revisionSequence});put('meta','backup-data-generation',{id:'backup-data-generation',value:p.before.authority.generation+1});
  const prior=tables.get('thoughts').get(request.id),changes=new Map(),oldHistory=tables.get('revisions');
  for(const row of view.history)observeSemanticChange(changes,deltaDescription('revisions',oldHistory.get(row.id)),deltaDescription('revisions',row));
  put('thoughts',request.id,view.entry);put('operationReceipts',request.operationId,view.operationReceipt);
  for(const row of p.before.rows.history)if(!view.history.some(r=>r.id===row.id))put('revisions',row.id,null);for(const row of view.history)put('revisions',row.id,row);
  if(prior.searchVersion!==ownerVersion('entry',view.entry)){const queue=planSearchQueueLocator('entry',view.entry);put('libraryMigrationItems',queue.id,queue);}
  if(t.semanticEnabled){let sequence=meta.get(DELTA_COUNTER)?.value||0,humanChanged=false;
   for(const {before,after}of changes.values()){const planned=planSemanticDeltaWrite(before,after,meta.get(KNOWN_PREFIX+after.key),meta.get(DIRTY_PREFIX+after.key),sequence);if(!planned)continue;sequence=planned.row.sequence;humanChanged||=after.human;put('meta',planned.row.id,planned.row);put('meta',DIRTY_PREFIX+after.key,planned.dirty);}
   if(sequence!==(meta.get(DELTA_COUNTER)?.value||0))put('meta',DELTA_COUNTER,{id:DELTA_COUNTER,value:sequence});if(humanChanged)put('meta',HUMAN_FENCE,{id:HUMAN_FENCE,value:(meta.get(HUMAN_FENCE)?.value||0)+1});
  }
 }
 const cap=Object.freeze({});mixedRetentions.set(cap,{store,core,t,stage,database,tables,current,retained,sealed:false});return cap;
}
export async function sealSavedMixedRetention(store,core,t,cap,stage,intents){
 if(cap===null)return;const p=mixedRetentions.get(cap);if(!p||p.store!==store||p.core!==core||p.t!==t||p.stage!==stage||p.sealed)fail('BNS_SAVED_WORK_CAPABILITY');p.current();
 const restoreKey=await stage.idIn(t,'restore'),mergePrefix=await core.idIn(t,'mergeCommit'),meta=p.tables.get('meta');
 // The original coordinator alone supplies its already-computed durable cursor
 // and optional merge receipt. No arbitrary canonical/system-key override.
 if(!Array.isArray(intents)||intents.length<1||intents.length>2||new Set(intents.map(r=>r.id)).size!==intents.length||!intents.some(r=>r.id===restoreKey))fail('BNS_SAVED_WORK_CAPABILITY');
 for(const row of intents){if(row.id!==restoreKey&&!row.id.startsWith(mergePrefix))fail('BNS_SAVED_WORK_CAPABILITY');p.retained+=measureSourceWorkingPhysicalTree(row).B;if(p.retained>limit)fail('BNS_SAVED_WORK_LIMIT');meta.set(row.id,clone(row));}
 p.sealed=true;registerRepositoryFinalReadFence(store.repository,t,{isCurrent:p.current,plan:function*(){for(const [table,rows]of p.tables){if((yield {method:'count',table})!==rows.size)fail('BNS_SAVED_WORK_CHANGED');for(const [key,row]of rows)if(!equalSourceWorkingPhysicalTree((yield {method:'get',table,key})??null,row))fail('BNS_SAVED_WORK_CHANGED');}return true;}});
}
'''
p.write_text(s)
p=Path('extension/core/browser-native-sync/group-checkpoint.js');s=p.read_text().replace('sealSavedWorkMergeProgress}', 'sealSavedWorkMergeProgress,prepareSavedMixedRetention,sealSavedMixedRetention}');s=s.replace("allowed=new Set(['sourceBootstrapCommit','savedWorkBootstrap','savedWorkSuccessor']);", "allowed=new Set(['sourceBootstrapCommit','savedWorkBootstrap','savedWorkSuccessor','humanLibraryCommit']);")
s=s.replace('    if(operation)await commitSavedWorkEdit(t,prepared,this.store);','    const retention=await prepareSavedMixedRetention(this.store,this.live,t,before,prepared,this.stage);\n    if(operation)await commitSavedWorkEdit(t,prepared,this.store);')
s=s.replace("intents.push({id:await this.stage.idIn(t,'restore'),...next});await sealSavedWorkMergeProgress", "intents.push({id:await this.stage.idIn(t,'restore'),...next});await sealSavedMixedRetention(this.store,this.live,t,retention,this.stage,intents);await sealSavedWorkMergeProgress")
p.write_text(s)

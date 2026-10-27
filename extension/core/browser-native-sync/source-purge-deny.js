// Original deny-only guard shared by canonical staging. This module does not
// install a purge journal, codec, mutation owner or ordinary writer.
import {requireRepositoryTransactionScope,requireRepositoryTransactionDataMethods,registerRepositoryFinalReadFence,registerRepositoryWorkLimit} from '../idb-repository.js';
import {fail} from './value.js';
const prefixRange=p=>IDBKeyRange.bound(p,p+'\uffff',false,true);
export async function requireNoSourcePurgeDeny(core,t){
 const repository=core.repository,prefix=core.prefix+'sourcePurgeDeny:',identity=requireRepositoryTransactionScope(repository,t);
 requireRepositoryTransactionDataMethods(repository,t);
 const current=()=>{if(core.repository!==repository||core.prefix+'sourcePurgeDeny:'!==prefix)fail('BNS_SOURCE_PURGE_RECONCILIATION_REQUIRED');return true;};
 if(identity.mode==='readwrite')registerRepositoryWorkLimit(repository,t);
 if((await t.primaryRangePage('meta',{prefix,limit:1})).rows.length)fail('BNS_SOURCE_PURGE_RECONCILIATION_REQUIRED');current();
 if(identity.mode==='readwrite')registerRepositoryFinalReadFence(repository,t,{isCurrent:current,plan:function*(){
  if((yield {method:'count',table:'meta',key:prefixRange(prefix)})!==0)fail('BNS_SOURCE_PURGE_RECONCILIATION_REQUIRED');return true;
 }});
}

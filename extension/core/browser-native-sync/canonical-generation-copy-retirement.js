import {ArchiveError} from '../constants.js';
import {requireRepositoryTransactionDataMethods,registerRepositoryWorkLimit,registerRepositoryFinalReadFence} from '../idb-repository.js';
import {bytes,digest,equal} from './value.js';
import {chargeGroupPageValue,checkGroupPageBudget} from './group-page-reader.js';

// Fixed original consumer. This helper cannot mint a protected repository
// writer. Publication supplies its private, single-transaction authority only
// after checking an actual committed publication receipt. No caller callback,
// prefix, database deletion or canonical/protocol mutation is accepted.
export const CANONICAL_COPY_RETIREMENT='canonical-generation:copy-retirement:v1';
const PREFIX='canonical-generation:checkpoint:',STATE=PREFIX+'state:v1',ITEM=PREFIX+'item:',PAGE=PREFIX+'page:';
const fail=()=>{throw new ArchiveError('GENERATION_COPY_RETIREMENT_CHANGED');};
const key=(prefix,n)=>prefix+String(n).padStart(8,'0');
const range=prefix=>IDBKeyRange.bound(prefix,prefix+'\uffff',false,true);
const fields=['id','version','identity','publicationId','manifestId','graphDigest','stateDigest','itemTotal','pageTotal','itemsRemoved','pagesRemoved','phase'];
function progress(row,gate){
 if(!row||Object.keys(row).sort().join(',')!==[...fields].sort().join(',')||row.id!==CANONICAL_COPY_RETIREMENT||row.version!==1||!equal(row.identity,gate.identity)||row.publicationId!==gate.publicationId||row.manifestId!==gate.seal.manifestId||row.graphDigest!==gate.seal.graphDigest||!/^[a-f0-9]{64}$/.test(row.stateDigest)||!['retiring','retired'].includes(row.phase))fail();
 for(const k of ['itemTotal','pageTotal','itemsRemoved','pagesRemoved'])if(!Number.isSafeInteger(row[k])||row[k]<0||row[k]>4096)fail();
 if(row.pageTotal!==Math.ceil(row.itemTotal/32)||row.itemsRemoved>row.itemTotal||row.pagesRemoved>row.pageTotal||row.pagesRemoved&&row.itemsRemoved!==row.itemTotal||row.phase==='retired'&&(row.itemsRemoved!==row.itemTotal||row.pagesRemoved!==row.pageTotal))fail();return row;
}
export async function prepareOriginalCopyRetirement(repository,gate,qualification,budget,started){
 checkGroupPageBudget(budget);const before=await repository.transaction(false,async t=>{return {state:await t.get('meta',STATE)??null,progress:await t.get('meta',CANONICAL_COPY_RETIREMENT)??null};},['meta']);chargeGroupPageValue(budget,before);
 if(before.progress)progress(before.progress,gate);
 if(before.progress?.phase==='retired'){if(before.state!==null)fail();return before;}
 const state=before.state;
 if(!state||state.id!==STATE||state.version!==1||state.phase!=='validated'||!Number.isSafeInteger(state.received)||state.received<0||state.received>4096||state.received!==state.manifest?.itemCount||state.pages!==Math.ceil(state.received/32)||state.graphDigest!==gate.seal.graphDigest||state.manifestRef?.id!==gate.seal.manifestId||!equal(state.sourceBase,qualification.sourceBase))fail();
 const stateDigest=await digest(bytes(state));checkGroupPageBudget(budget);
 if(before.progress&&(before.progress.stateDigest!==stateDigest||before.progress.itemTotal!==state.received||before.progress.pageTotal!==state.pages))fail();
 return {...before,initial:{id:CANONICAL_COPY_RETIREMENT,version:1,identity:gate.identity,publicationId:gate.publicationId,manifestId:gate.seal.manifestId,graphDigest:gate.seal.graphDigest,stateDigest,itemTotal:state.received,pageTotal:state.pages,itemsRemoved:0,pagesRemoved:0,phase:'retiring'}};
}
export async function retireOriginalCheckpointCopies(repository,t,prepared,gate,qualification,marker,budget,started){
 checkGroupPageBudget(budget);requireRepositoryTransactionDataMethods(repository,t);registerRepositoryWorkLimit(repository,t,{ms:Math.max(1,Math.floor(30000-(performance.now()-started)))});
 const points=[gate,qualification,marker];for(const row of points)if(!equal(await t.get('meta',row.id)??null,row))fail();
 if(!equal(await t.get('meta',STATE)??null,prepared.state)||!equal(await t.get('meta',CANONICAL_COPY_RETIREMENT)??null,prepared.progress))fail();
 const current=progress(prepared.progress??prepared.initial,gate);
 // Exact native range counts are terminal fences below. The ordinary repository
 // count API counts the whole store when no index is supplied; never mistake
 // that value for a prefix count or scan every remaining body to count it.
 const next={...current},deleted=[];let remaining=32;
 while(next.itemsRemoved<next.itemTotal&&remaining>0){const id=key(ITEM,next.itemsRemoved),row=await t.get('meta',id);if(!row||row.id!==id||Object.keys(row).sort().join(',')!=='id,item')fail();await t.delete('meta',id);deleted.push(id);next.itemsRemoved++;remaining--;}
 while(next.itemsRemoved===next.itemTotal&&next.pagesRemoved<next.pageTotal&&remaining>0){const id=key(PAGE,next.pagesRemoved),row=await t.get('meta',id);if(!row||row.id!==id||row.index!==next.pagesRemoved||row.start!==next.pagesRemoved*32||row.count!==Math.min(32,next.itemTotal-row.start))fail();await t.delete('meta',id);deleted.push(id);next.pagesRemoved++;remaining--;}
 if(next.itemsRemoved===next.itemTotal&&next.pagesRemoved===next.pageTotal&&next.phase!=='retired'){await t.delete('meta',STATE);deleted.push(STATE);next.phase='retired';}
 if(!equal(next,prepared.progress))await t.put('meta',next);
 const expectedItems=next.itemTotal-next.itemsRemoved,expectedPages=next.pageTotal-next.pagesRemoved;
 registerRepositoryFinalReadFence(repository,t,{isCurrent:()=>{checkGroupPageBudget(budget);return true;},plan:function*(){
  for(const row of [...points,next])if(!equal((yield {method:'get',table:'meta',key:row.id})??null,row))fail();
  for(const id of deleted)if((yield {method:'get',table:'meta',key:id})!==undefined)fail();
  for(const [prefix,total]of [[ITEM,expectedItems],[PAGE,expectedPages],[PREFIX,expectedItems+expectedPages+(next.phase==='retired'?0:1)]])if((yield {method:'count',table:'meta',key:range(prefix)})!==total)fail();
  if(next.phase!=='retired'&&!equal((yield {method:'get',table:'meta',key:STATE}),prepared.state))fail();return true;
 }});
 return {state:next.phase,itemsRemoved:next.itemsRemoved,itemTotal:next.itemTotal,pagesRemoved:next.pagesRemoved,pageTotal:next.pageTotal};
}

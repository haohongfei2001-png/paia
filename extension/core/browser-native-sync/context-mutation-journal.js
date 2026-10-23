import {ContextDesiredSyncJournal} from './context-desired-journal.js';
import {readContextCards,requireOriginalContextCardsService} from '../context-cards.js';
import {requireOriginalLibraryDocumentsGenerationMethods} from '../library-documents-owner.js';
import {readableContextItems,fenceContextLineage,releaseContextLineage} from '../context-item-lineage.js';
import {prepareContextMutationDescription} from './context-mutation-codec.js';
import {clone,digest,equal,fail} from './value.js';
const originalJournals=new WeakMap(),localPreparations=new WeakMap();
const legacy={info:'contextItem',rules:'contextRulesItem',now:'contextNowItem'};
function binding(journal,service){
 const bound=originalJournals.get(journal);requireOriginalContextCardsService(service);
 if(!bound||journal.core!==bound.core||service.syncJournal!==journal||service.s!==bound.store||bound.store.repository!==bound.core.repository)fail('BNS_CONTEXT_OWNER_REQUIRED');
 requireOriginalLibraryDocumentsGenerationMethods(bound.store);return bound;
}
export function isOriginalContextMutationJournal(journal,service){try{binding(journal,service);return true;}catch{return false;}}
async function snapshot(t,service){
 const epoch=await service.admitted(t),row=await readContextCards(t),generation=await t.get('meta','backup-data-generation'),gate=await t.get('meta','gate');
 return {epoch,row,generation: generation??null,gate:gate??null};
}
// This capability is minted by the fixed journal only after the real Context
// owner has replayed its command and its current physical/protocol predecessors
// have matched. Core must consume the same private identity, never a cloned DTO.
export function originalContextMutationPreparation(core,capability){
 const p=localPreparations.get(capability);if(!p||p.core!==core)fail('BNS_CONTEXT_OWNER_REQUIRED');binding(p.journal,p.service);
 return {changes:clone(p.changes),description:clone(p.description)};
}
export class ContextMutationSyncJournal extends ContextDesiredSyncJournal{
 #prepared=new WeakMap();
 constructor(core,{store}){super(core);if(store?.repository!==core?.repository)fail('BNS_CONTEXT_OWNER_REQUIRED');requireOriginalLibraryDocumentsGenerationMethods(store);originalJournals.set(this,{core,store});}
 async prepare(before,after,command,owner){
  if(command.kind==='access')return super.prepare(before,after,command);
  const service=owner?.service,{core,store}=binding(this,service);
  if(typeof owner.at!=='string')fail('BNS_CONTEXT_OWNER_REQUIRED');
  const initial=await store.run(()=>store.repository.transaction(false,t=>snapshot(t,service),['meta']));
  if(!equal(initial.row,before)||initial.epoch!==command.epoch)fail('BNS_CONTEXT_OWNER_CHANGED');
  const {description,items}=await prepareContextMutationDescription(before,after,command,owner.at,owner.priorMove??null),changes=[];
  let lineage=null;
  try{
   // Deletion/restore retains its original lineage rather than turning an
   // adopted automatic Item into source-free manual content. An invalidated or
   // no-longer-readable source cannot be exported by taking over its body.
   const automatic=items.filter(item=>item.origin==='automatic');
   if(automatic.some(item=>item.lifecycle==='invalidated'))fail('BNS_CONTEXT_LINEAGE_UNAVAILABLE');
   if(automatic.length){
    const result=await readableContextItems(store,automatic.map(item=>({...clone(item),lifecycle:'active',deletedBy:null})),{epoch:command.epoch,rowSerialized:JSON.stringify(await store.repository.transaction(false,t=>t.get('meta','context-cards:v1'),['meta'])),retainAuthoredCapture:true});
    lineage=result.captured;if(result.automaticEvaluation||result.items.length!==automatic.length)fail('BNS_CONTEXT_LINEAGE_UNAVAILABLE');
   }
   for(const item of items){
    const old=before.items.find(value=>value.id===item.id),head=await core.read('head','contextMutationMember',item.id);let previous=null,parents=[];
    if(head){
     if(head.purged||head.revisions.length!==1)fail('BNS_CONTEXT_CONFLICT_UNSUPPORTED');
     const operation=(await core.read('revision',head.revisions[0]))?.operation;
     if(!old||!equal(operation?.value.item,old))fail('BNS_CONTEXT_OWNER_CHANGED');
     previous={type:'contextMutationMember',entityId:item.id,revisionId:operation.revisionId,digest:await digest(old)};parents=head.revisions;
    }else if(old){
     const type=legacy[old.card],oldHead=await core.read('head',type,item.id);
     if(old.origin!=='manual'||!oldHead||oldHead.purged||oldHead.revisions.length!==1)fail('BNS_CONTEXT_BOOTSTRAP_REQUIRED');
     const operation=(await core.read('revision',oldHead.revisions[0]))?.operation;
     if(!equal(operation?.value,old))fail('BNS_CONTEXT_OWNER_CHANGED');
     previous={type,entityId:item.id,revisionId:operation.revisionId,digest:await digest(old)};
    }
    changes.push({type:'contextMutationMember',value:{id:item.id,logicalCommitId:description.id,previous,item},expectedParents:parents});
   }
   const capability=Object.freeze({});localPreparations.set(capability,{core,journal:this,service,description,changes});
   const prepared=await this.restoreFence.prepare(()=>core.prepareContextMutation(capability));
   if(!equal(await store.run(()=>store.repository.transaction(false,t=>snapshot(t,service),['meta'])),initial))fail('BNS_CONTEXT_OWNER_CHANGED');
   this.#prepared.set(prepared,{service,initial,after:clone(after),lineage});lineage=null;return prepared;
  }finally{releaseContextLineage(lineage);}
 }
 async commit(t,prepared){
  const held=this.#prepared.get(prepared);if(!held)return super.commit(t,prepared);
  const {core}=binding(this,held.service),now=await snapshot(t,held.service);
  try{
   if(now.epoch!==held.initial.epoch||!equal(now.row,held.after)||!equal(now.generation,held.initial.generation)||!equal(now.gate,held.initial.gate))fail('BNS_CONTEXT_OWNER_CHANGED');
   if(held.lineage)await fenceContextLineage(held.service.s,held.lineage,{transaction:t});
   await this.restoreFence.commit(t,prepared);
   const result=await core.commitPrepared(t,prepared,{materialize:false});
   for(const operation of prepared.operations)if(operation.type==='contextMutationMember')await core.recordMaterializedOwner(t,operation,operation.value.item.revision);
   return result;
  }finally{releaseContextLineage(held.lineage);this.#prepared.delete(prepared);}
 }
}

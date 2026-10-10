import {defaults,validatePreferences} from '../workspace.js';
import {ArchiveError} from '../constants.js';
import {JournalRestoreFence} from './prompt-journal.js';
import {CONSUMER_PREFERENCE_KEYS,consumerPreferenceRenderingValue} from './consumer-preference-codec.js';
import {CONSUMER_PUBLICATION_PENDING_ID,requireConsumerPublicationSettled} from './consumer-publication-state.js';
import {clone,equal} from './value.js';
const fail=code=>{throw new ArchiveError(code);};

export const CONSUMER_OWNER_PREFIX='consumer-preference-owner:';
const displayKeys=CONSUMER_PREFERENCE_KEYS.filter(key=>key!=='smartFilter');
const ownerId=key=>CONSUMER_OWNER_PREFIX+key;
const exact=(value,keys)=>value&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
async function currentOwner(t,store,key){
 const row=await t.get('meta',ownerId(key)),rendered=key==='smartFilter'?(await t.get('meta','smart-filter'))?.mode:(await store.control(t)).preferences[key];
 if(row&&(!exact(row,['id','version','revision','intent'])||row.id!==ownerId(key)||row.version!==1||!Number.isSafeInteger(row.revision)||row.revision<1||row.intent?.id!==key||consumerPreferenceRenderingValue(row.intent)!==rendered))fail('BNS_OWNER_CHANGED');
 return {row:row??null,rendered};
}

// Explicit optional original-owner injection. No production worker constructs
// this journal, and it does not create a provider, account or Sync switch.
export class ConsumerPreferenceSyncJournal {
 constructor(core){this.core=core;this.restoreFence=new JournalRestoreFence(core);this.prepared=new WeakMap();}
 async snapshot(t,store,keys){
  if(store.repository!==this.core.repository)fail('BNS_OWNER_CHANGED');await store.qualifyControlPublicationRead(t);await requireConsumerPublicationSettled(t);
  const owners=[];for(const key of keys){const owner=await currentOwner(t,store,key),head=await this.core.get(t,'head','consumerPreference',key);if(head?.purged)fail('BNS_ENTITY_PURGED');if(head?.revisions.length>1)fail('BNS_CONFLICT_REQUIRES_RESOLUTION');
   let operation=null;if(head){operation=(await this.core.get(t,'revision',head.revisions[0]))?.operation;const proof=await this.core.materializedOwner(t,'consumerPreference',key);if(!operation||!owner.row||!equal(operation.value,owner.row.intent)||proof?.ownerRevision!==owner.row.revision||proof.operation.revisionId!==operation.revisionId)fail('BNS_OWNER_CHANGED');}
   else if(owner.row)fail('BNS_OWNER_CHANGED');
   owners.push({key,...owner,head:head??null,operation});
  }
  return {fence:await this.restoreFence.snapshot(t),owners};
 }
 async prepare(store,changes){
  const keys=displayKeys.filter(key=>Object.hasOwn(changes||{},key));if(!keys.length)return null;
  validatePreferences(Object.fromEntries(keys.map(key=>[key,changes[key]])));
  const before=await this.core.transaction(false,t=>this.snapshot(t,store,keys),['meta']);
  for(const owner of before.owners)if(!owner.head&&owner.rendered!==defaults()[owner.key])fail('BNS_BOOTSTRAP_REQUIRED');
  const prepared=await this.restoreFence.prepare(()=>this.core.prepare(keys.map(key=>({type:'consumerPreference',value:{id:key,value:changes[key],explicit:true}}))));this.prepared.set(prepared,before);return prepared;
 }
 async prepareMode(store,mode){
  if(!['light','off'].includes(mode))fail('INVALID_REQUEST');const before=await this.core.transaction(false,t=>this.snapshot(t,store,['smartFilter']),['meta']);if(!before.owners[0].head&&before.owners[0].rendered!=='light')fail('BNS_BOOTSTRAP_REQUIRED');
  const prepared=await this.restoreFence.prepare(()=>this.core.prepare([{type:'consumerPreference',value:{id:'smartFilter',value:mode,explicit:true}}]));this.prepared.set(prepared,before);return prepared;
 }
 async authorize(t,store,prepared){const before=this.prepared.get(prepared);if(!before||!equal(await this.snapshot(t,store,before.owners.map(owner=>owner.key)),before))fail('BNS_OWNER_CHANGED');}
 async commit(t,store,prepared){
  const before=this.prepared.get(prepared);if(!before)fail('BNS_PREPARATION_REQUIRED');await this.restoreFence.commit(t,prepared);
  const binding=await store.controlPublicationBinding(t),namespace=await this.core.bind(t);await requireConsumerPublicationSettled(t);
  await this.core.commitPrepared(t,prepared,{materialize:false});
  for(const operation of prepared.operations){const prior=before.owners.find(owner=>owner.key===operation.entityId);if(!prior)fail('BNS_OWNER_CHANGED');const revision=(prior.row?.revision??0)+1;if(!Number.isSafeInteger(revision))fail('BNS_VALUE_LIMIT');const row={id:ownerId(operation.entityId),version:1,revision,intent:clone(operation.value)};await t.put('meta',row);await this.core.recordMaterializedOwner(t,operation,revision);}
  const pending={id:CONSUMER_PUBLICATION_PENDING_ID,version:1,namespace,databaseId:binding.reservation.databaseId,controlRevision:binding.reservation.revision,nonce:binding.reservation.nonce,operations:prepared.operations.map(operation=>({entityId:operation.entityId,operationId:operation.operationId,revisionId:operation.revisionId}))};await t.put('meta',pending);
 }
 async commitMode(t,store,prepared){
  const before=this.prepared.get(prepared);if(!before||prepared.operations.length!==1||prepared.operations[0].entityId!=='smartFilter')fail('BNS_PREPARATION_REQUIRED');await requireConsumerPublicationSettled(t);await this.restoreFence.commit(t,prepared);await this.core.commitPrepared(t,prepared,{materialize:false});
  const operation=prepared.operations[0],revision=(before.owners[0].row?.revision??0)+1;if(!Number.isSafeInteger(revision)||(await t.get('meta','smart-filter'))?.mode!==operation.value.value)fail('BNS_OWNER_CHANGED');await t.put('meta',{id:ownerId('smartFilter'),version:1,revision,intent:clone(operation.value)});await this.core.recordMaterializedOwner(t,operation,revision);
 }
 async settle(t,store,reservation){
  const pending=await t.get('meta',CONSUMER_PUBLICATION_PENDING_ID);if(!pending)return;
  if(!exact(pending,['id','version','namespace','databaseId','controlRevision','nonce','operations'])||pending.id!==CONSUMER_PUBLICATION_PENDING_ID||pending.version!==1||pending.namespace!==await this.core.bind(t)||pending.databaseId!==store.databaseId||pending.databaseId!==reservation.databaseId||pending.controlRevision!==reservation.revision||pending.nonce!==reservation.nonce||!Array.isArray(pending.operations)||pending.operations.length<1||pending.operations.length>displayKeys.length||new Set(pending.operations.map(ref=>ref.entityId)).size!==pending.operations.length)fail('BNS_CONSUMER_PUBLICATION_PENDING');
  await this.restoreFence.snapshot(t);
  for(const ref of pending.operations){if(!exact(ref,['entityId','operationId','revisionId'])||!displayKeys.includes(ref.entityId))fail('BNS_CONSUMER_PUBLICATION_PENDING');const revision=await this.core.get(t,'revision',ref.revisionId),outbox=await this.core.get(t,'outbox',ref.operationId),head=await this.core.get(t,'head','consumerPreference',ref.entityId),owner=await currentOwner(t,store,ref.entityId),proof=await this.core.materializedOwner(t,'consumerPreference',ref.entityId);if(revision?.operation.operationId!==ref.operationId||revision.operation.type!=='consumerPreference'||revision.operation.entityId!==ref.entityId||outbox?.revisionId!==ref.revisionId||head?.revisions.length!==1||head.revisions[0]!==ref.revisionId||!owner.row||!equal(revision.operation.value,owner.row.intent)||proof?.ownerRevision!==owner.row.revision||proof.operation.revisionId!==ref.revisionId)fail('BNS_CONSUMER_PUBLICATION_PENDING');}
  await t.delete('meta',CONSUMER_PUBLICATION_PENDING_ID);
 }
 async bootstrap(store){return store.run(async()=>{
  const before=await this.core.transaction(false,t=>this.snapshot(t,store,CONSUMER_PREFERENCE_KEYS),['meta']),owners=before.owners.filter(owner=>!owner.head&&owner.rendered!==(owner.key==='smartFilter'?'light':defaults()[owner.key]));if(!owners.length)return {count:0};
  const prepared=await this.restoreFence.prepare(()=>this.core.prepare(owners.map(owner=>({type:'consumerPreference',value:{id:owner.key,value:owner.rendered,explicit:null},expectedParents:[]})),{actor:'bootstrap'}));
  return this.core.transaction(true,async t=>{if(!equal(await this.snapshot(t,store,CONSUMER_PREFERENCE_KEYS),before))fail('BNS_OWNER_CHANGED');await this.restoreFence.commit(t,prepared);await this.core.commitPrepared(t,prepared,{materialize:false});for(const operation of prepared.operations){await t.put('meta',{id:ownerId(operation.entityId),version:1,revision:1,intent:clone(operation.value)});await this.core.recordMaterializedOwner(t,operation,1);}return {count:prepared.operations.length};});
 });}
}

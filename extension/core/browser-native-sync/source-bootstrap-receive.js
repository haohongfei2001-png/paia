import {sourceBootstrapSnapshot,requireAbsent} from './source-bootstrap-journal.js';
import {JournalRestoreFence} from './prompt-journal.js';
import {prepareInitialSourcePlan} from './source-bootstrap-plan.js';
import {CONSENT_VERSION} from '../constants.js';
import {equal,fail} from './value.js';
// Explicit constructor injection only. Generic receive/checkpoint paths refuse
// this family. No account, provider, worker registration or readiness change.
export class SourceBootstrapReceiver{
 constructor(store,core){if(store.repository!==core.repository)fail('BNS_SOURCE_BOOTSTRAP_BINDING');this.store=store;this.core=core;this.fence=new JournalRestoreFence(core);}
 async current(t){const control=await this.store.control(t);if(control.settings.enabled!==true||control.settings.consentVersion!==CONSENT_VERSION)fail('BNS_SOURCE_BOOTSTRAP_PERMISSION');return {fence:await this.fence.snapshot(t),settings:control.settings,generation:(await t.get('meta','backup-data-generation'))?.value||0};}
 async receive(input){
  await this.store.finishFoundation();
  const before=await this.store.run(()=>this.core.transaction(false,t=>this.current(t)));
  const application=await prepareBootstrapApplication(this.store,this.core,input);
  return this.store.run(()=>this.core.transaction(true,async t=>{
   if(!equal(await this.current(t),before))fail('BNS_SOURCE_BOOTSTRAP_CHANGED');
   return applyBootstrapApplication(t,application);
  }));
 }
}

// Trusted grouped-checkpoint seam: cryptographic preparation outside IDB, same
// original domain qualification and writer inside the coordinator transaction.
const applications=new WeakMap();
export async function prepareBootstrapApplication(store,core,input){
 if(store.repository!==core.repository)fail('BNS_SOURCE_BOOTSTRAP_BINDING');
  const prepared=await core.prepareSourceBootstrapReceive(input),v=prepared.descriptor.value,entities=Object.fromEntries(prepared.members.map(op=>[op.value.entityType,op.value.entity]));
  if(Object.keys(entities).length!==6||v.sourceId!==entities.source?.id||v.sourceKey!==entities.source?.sourceKey||v.documentId!==entities.inputDocument?.id||v.inputId!==entities.input?.id||v.baselineId!==entities.baselineRevision?.id)fail('BNS_SOURCE_BOOTSTRAP_INVALID');
  const capability=await prepareInitialSourcePlan(entities);
 const cap=Object.freeze({});applications.set(cap,{store,core,prepared,entities,capability});return cap;
}
export async function applyBootstrapApplication(t,application){
 const a=applications.get(application);if(!a)fail('BNS_PREPARATION_REQUIRED');
 const {store,core,prepared,entities,capability}=a;
 const before=await new SourceBootstrapReceiver(store,core).current(t);
   const snapshot=await sourceBootstrapSnapshot(store,core,t,entities.source),receipt=await core.get(t,'receipt',prepared.descriptor.operationId);
   if(receipt){
    if(receipt.digest!==prepared.descriptor.revisionId)fail('BNS_OPERATION_COLLISION');
    // Exact old ACK may not recreate a deleted/edited Source or a lost baseline.
    // Later legitimate Working edits are not overwritten by bootstrap replay.
    const h=entities.baselineRevision,local=await t.get('revisions',h.id);
    if(!snapshot.record||!equal(snapshot.record.value,entities.source)||!snapshot.input||!snapshot.document||snapshot.sourceTombstone||snapshot.snapshotTombstone||snapshot.removal||snapshot.excluded||!local||!equal(local,{...h,sequence:local.sequence,listKey:[h.entityKey,local.sequence],documentList:[h.documentId,local.sequence]}))fail('BNS_SOURCE_BOOTSTRAP_CHANGED');
    return {state:'duplicate'};
   }
   requireAbsent(snapshot);
   return core.commitSourceBootstrapReceive(t,prepared,async()=>{
    await store.applyInitialSource(t,capability);
    if(!before.fence.marker)await core.put(t,'ownerRecoveryEpoch',[],{version:1,epoch:before.fence.epoch});
   });
}

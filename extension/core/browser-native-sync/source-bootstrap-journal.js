import {captureSourceAppend} from './source-append-journal.js';
import {validateCapture} from '../validation.js';
import {identify} from '../dedupe.js';
import {initialSourceRecord,initialSourceObjects} from '../source-initial.js';
import {applySourceTime} from '../record-time.js';
import {planInputRevision} from '../ia-store.js';
import {CONSENT_VERSION,ADAPTER_VERSION} from '../constants.js';
import {captureIsExcluded} from '../reader-state.js';
import {JournalRestoreFence} from './prompt-journal.js';
import {SOURCE_BOOTSTRAP_TYPES} from './source-bootstrap-codec.js';
import {prepareInitialSourcePlan} from './source-bootstrap-plan.js';
import {clone,equal,fail} from './value.js';
export async function sourceBootstrapSnapshot(store,core,t,r){
 const control=await store.control(t);if(control.settings.enabled!==true||control.settings.consentVersion!==CONSENT_VERSION)fail('BNS_SOURCE_BOOTSTRAP_PERMISSION');
 const fence=await new JournalRestoreFence(core).snapshot(t);
 return {fence,settings:control.settings,generation:(await t.get('meta','backup-data-generation'))?.value||0,sequence:await t.get('meta','sequence'),revision:await t.get('meta','revision-sequence')??null,delta:await t.get('meta','input-delta-sequence')??null,
  record:await t.get('records',r.id)??null,input:await t.get('blocks','block:'+r.id)??null,document:await t.get('documents','document:'+r.id)??null,
  sameSource:await t.count('recordIndex','bySource',r.sourceKey),sameDedupe:await t.count('recordIndex','byDedupe',r.dedupeKey),sameChat:await t.count('documents','byChat','chatgpt:'+r.chatId),
  time:await t.get('times',r.sourceKey)??null,sourceTombstone:await t.get('tombstones','source:'+r.sourceKey)??null,snapshotTombstone:await t.get('tombstones','snapshot:'+r.dedupeKey)??null,removal:await t.get('inputRemovals',r.sourceKey)??null,excluded:await captureIsExcluded(t,r.chatId)};
}
export function requireAbsent(snapshot){if(snapshot.record||snapshot.input||snapshot.document||snapshot.sameSource||snapshot.sameDedupe||snapshot.sameChat||snapshot.time||snapshot.sourceTombstone||snapshot.snapshotTombstone||snapshot.removal||snapshot.excluded)fail('BNS_SOURCE_BOOTSTRAP_UNAVAILABLE');}
export class SourceBootstrapJournal{
 constructor(core){this.core=core;}
 capture(store,request,enrich){
  if(store.repository!==this.core.repository||store.sourceBootstrapJournal!==this||enrich)fail('BNS_SOURCE_BOOTSTRAP_UNSUPPORTED');
  const {chat,messages}=validateCapture(request);if(messages.length!==1)fail('BNS_SOURCE_BOOTSTRAP_UNSUPPORTED');
  return store.run(async()=>{
   // Capture authority in the same first read as dispatch, before any branch
   // can await identity/digest work or rebind to a newer namespace.
   const entry=await this.core.transaction(false,async t=>{const fence=await new JournalRestoreFence(this.core).snapshot(t),control=await store.control(t);return {authority:{fence,settings:control.settings,generation:(await t.get('meta','backup-data-generation'))?.value||0},hasDocument:await t.count('documents','byChat','chatgpt:'+chat.id)};});
   if(entry.hasDocument)return captureSourceAppend(store,this.core,request,entry.authority);
   const entryFence=entry.authority.fence;
   const at=store.clock(),r=initialSourceRecord({id:store.uuid(),chat,message:messages[0],identity:await identify(chat.id,messages[0].sourceMessageId,messages[0].originalText),at});
   const timeState={records:[r],sourceTimes:{}},timeChanged=applySourceTime(timeState,r.sourceKey,messages[0].sourceTime,messages[0].pageOrder,at,[r],messages[0].domTime);
   const first=initialSourceObjects(r),source={...first.document,titleRevision:0};delete source.sourceRecordIds;const working=clone(source);delete working.titleRevision;const input={...first.block,revision:0,provenanceSignature:JSON.stringify(first.block.provenance)};
   const p=await this.core.transaction(false,async t=>{const before=await sourceBootstrapSnapshot(store,this.core,t,r);requireAbsent(before);if(!equal(before.fence,entryFence))fail('BNS_SOURCE_BOOTSTRAP_CHANGED');if(request.epoch!==before.settings.epoch)fail('BNS_SOURCE_BOOTSTRAP_PERMISSION');const snap={libraryText:input.libraryText,note:input.note,excluded:input.excluded,originalTextReference:input.originalTextReference,provenanceSignature:input.provenanceSignature};const baseline=await planInputRevision(t,{kind:'input',entityId:input.id,documentId:input.documentId,before:snap,after:snap,reason:'baseline',important:true,sourceRecordIds:[r.id]},{now:at,uuid:()=>store.uuid()});return {before,baseline:baseline.row};});
   const entities={source:r,timeEvidence:{id:r.sourceKey,value:timeState.sourceTimes[r.sourceKey]??null},inputDocument:{id:source.id,source,working},input,inputState:{id:input.id,documentId:input.documentId,contentRevision:0,removalState:'active',filteringPolicyState:'none',sourceRecordIds:[r.id],deltaSequence:(p.before.delta?.value||0)+1},baselineRevision:p.baseline};
   const capability=await prepareInitialSourcePlan(entities),id=crypto.randomUUID(),prepared=await this.core.prepare(SOURCE_BOOTSTRAP_TYPES.map(type=>({type:'sourceBootstrapMember',expectedParents:[],value:{id:type+':'+entities[type].id,entityType:type,entity:entities[type],logicalCommitId:id,datasetId:this.core.datasetId,deviceId:this.core.deviceId}})),{actor:'bootstrap',sourceBootstrap:{id,sourceId:r.id,sourceKey:r.sourceKey,documentId:input.documentId,inputId:input.id,baselineId:p.baseline.id}});
   const result=await this.core.transaction(true,async t=>{if(!equal(await sourceBootstrapSnapshot(store,this.core,t,r),p.before))fail('BNS_SOURCE_BOOTSTRAP_CHANGED');await store.applyInitialSource(t,capability);if(!equal(await t.get('revisions',p.baseline.id),p.baseline))fail('BNS_SOURCE_BASELINE_INVALID');await this.core.commitPrepared(t,prepared,{materialize:false});const control=await store.control(t);Object.assign(control.diagnostics,{ingestion:{schemaVersion:1,kind:'capture',attempted:1,added:1,duplicates:0,ignored:0,unresolved:0,knownTimes:r.sourceSentAt?1:0,unknownTimes:r.sourceSentAt?0:1},ingestionAt:at,status:'CAPTURING',lastScanAt:at,lastSuccessAt:at,adapterVersion:ADAPTER_VERSION,scanned:1,added:1});await store.saveControl(t,control);if(!p.before.fence.marker)await this.core.put(t,'ownerRecoveryEpoch',[],{version:1,epoch:p.before.fence.epoch});return {added:1,duplicates:0,status:'CAPTURING',timeChanged,settled:[true]};});
   await store.publish();return result;
  });
 }
}

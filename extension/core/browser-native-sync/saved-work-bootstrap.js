import {validateGroupedCheckpointGraph} from './group-checkpoint.js';
import {assertGroupedCheckpointManifest} from './group-checkpoint-manifest.js';
import {protocolObject} from './segments.js';
import {protocolPhysicalId} from './physical-key.js';
import {ownerVersion} from '../library-search.js';
import {readGroupRows} from './group-page-reader.js';
import {requireOriginalGroupCheckpointPlan} from './group-checkpoint-plan.js';
import {readControlPublicationFence,CONTROL_PUBLICATION_REVISION,CONTROL_PUBLICATION_RESERVATION} from '../local-control-publication.js';
import {validateFrozenOperation,acceptSequence} from './core.js';
import {requireOriginalLibraryDocumentsStore} from '../library-documents-owner.js';
import {deriveSavedWorkBootstrap as derive,portableSavedEntry as portableEntry,boundedSavedPayload as bounded,validateSavedWorkPayload} from './saved-work-payload.js';
import {prefix} from '../thought-model.js';
import {checkEvidenceInTransaction,planEvidenceProjection} from '../thought-evidence.js';
import {CONSENT_VERSION} from '../constants.js';
import {requireRepositoryTransactionScope,requireRepositoryTransactionDataMethods,registerRepositoryFinalReadFence} from '../idb-repository.js';
import {readOriginalControlSettings,assertOriginalControlSettingsFacts} from '../indexed-store.js';
import {captureTopicFormationTerminal} from '../topic-formation-terminal.js';
import {initialSourcePlan,verifyInitialSourceWrite} from './source-bootstrap-plan.js';
import {portableSourceLinkedEvidence} from './source-linked-evidence.js';
import {JournalRestoreFence} from './prompt-journal.js';
import {sourceLinkedDescriptor,restoreSourceLinkedEvidence} from './source-linked-evidence.js';
import {clone,equal,identifier,bytes,digest,fail} from './value.js';

// A bounded canonical bootstrap, not a fabricated replay of a lost AI request.
// This first profile proves one original AI baseline followed by one ordinary
// human edit. Retired/coalesced histories and other owners remain unsupported.
const plans=new WeakMap(),publications=new WeakMap(),protocolApplications=new WeakMap(),wireOperations=new WeakSet(),limit=2*1024*1024;
const bad=()=>fail('BNS_SAVED_WORK_UNSUPPORTED');
function binding(store,core){requireOriginalLibraryDocumentsStore(store);if(store.repository!==core.repository)fail('BNS_SAVED_WORK_BINDING');}
async function page(t,name,index,key,max){const p=await t.rangePage(name,index,prefix(key),null,max+1);if(p.next||p.rows.length>max)bad();return p.rows.map(x=>x.value);}
async function ownedRows(t,id){return {entry:await t.get('thoughts',id)??null,history:await page(t,'revisions','byList',['library_entry:'+id],128),provenance:await page(t,'provenance','byOwner',['entry',id],1),dependencies:await page(t,'dependencies','byTarget',['entry',id],1),placements:await t.count('placements','byEntry',prefix([id])),suppressions:await t.count('thoughtSuppressions','byEntry',id)};}
async function authority(store,core,t){
 const c=await store.control(t);if(c.settings.enabled!==true||c.settings.consentVersion!==CONSENT_VERSION)fail('BNS_SAVED_WORK_PERMISSION');
 const publication=await readControlPublicationFence(t);if(publication.reservation||publication.migration?.phase!=='active'||publication.migration.databaseId!==store.databaseId)fail('BNS_SAVED_WORK_PERMISSION');
 const library=await t.get('meta','thought-library');if(library?.sealed||library?.phase!=='active'||library?.verified!==true)bad();
 return {control:readOriginalControlSettings(store,t),roots:await Promise.all(['recovery-restore-epoch','thought-epoch','smart-filter',core.prefix+'active','migration',CONTROL_PUBLICATION_REVISION,CONTROL_PUBLICATION_RESERVATION,'thought-library'].map(async id=>[id,await t.get('meta',id)??null])),fence:await new JournalRestoreFence(core).snapshot(t),settings:c.settings,library,generation:(await t.get('meta','backup-data-generation'))?.value||0,sequence:await t.get('meta','thought-sequence')??null,revision:await t.get('meta','revision-sequence')??null,epoch:(await t.get('meta','thought-epoch'))?.value||0,secret:(await t.get('meta','thought-suppression-key'))?.value};
}
async function sourceProof(core,t,link){
 const h=await core.get(t,'head','sourceBootstrapMember','input:'+link.evidence.inputId);if(h?.purged||h?.revisions?.length!==1)bad();const r=await core.get(t,'revision',h.revisions[0]),o=r?.operation;
 if(r?.redacted||o?.type!=='sourceBootstrapMember'||o.value.entityType!=='input'||o.value.entity.id!==link.evidence.inputId)bad();
 const ch=await core.get(t,'head','sourceBootstrapCommit',o.value.logicalCommitId);if(ch?.purged||ch?.revisions?.length!==1)bad();const cr=await core.get(t,'revision',ch.revisions[0]),d=cr?.operation;
 if(cr?.redacted||d?.type!=='sourceBootstrapCommit'||!equal([d.value.sourceId],link.evidence.sourceRecordIds)||!equal([d.value.sourceKey],link.evidence.sourceIdentityTokens)||!d.value.members.some(ref=>ref.revisionId===o.revisionId&&ref.entityId===o.entityId))bad();return {member:o.revisionId,commit:d.revisionId,rows:[h,r,ch,cr]};
}

export async function captureSavedWorkBootstrap(store,core,id){
 binding(store,core);if(!identifier(id))bad();await store.finishFoundation();const start=Date.now(),before=await store.run(()=>core.transaction(false,async t=>({authority:await authority(store,core,t),rows:await ownedRows(t,id)}))),r=before.rows;
 if(!r.entry||r.provenance.length!==1||r.dependencies.length!==1||r.placements||r.suppressions)bad();
 const link=sourceLinkedDescriptor(r.provenance[0],r.dependencies[0]),payload=bounded({version:1,datasetId:core.datasetId,entry:portableEntry(r.entry),history:r.history,link,generator:clone(r.provenance[0].generator)}),evidence=await restoreSourceLinkedEvidence(store,link.evidence),expected=await derive(payload,evidence,before.authority.secret);
 if(!equal(expected.entry,r.entry)||!equal([expected.provenance],r.provenance)||!equal([expected.dependency],r.dependencies))bad();const proof=await core.transaction(false,t=>sourceProof(core,t,link));
 await core.transaction(false,async t=>{if(Date.now()-start>30000)fail('BNS_SAVED_WORK_LIMIT');await checkEvidenceInTransaction(store,t,evidence);if(!equal(before,{authority:await authority(store,core,t),rows:await ownedRows(t,id)})||!equal(proof,await sourceProof(core,t,link)))fail('BNS_SAVED_WORK_CHANGED');});return payload;
}

async function destination(t,core,id,history,link){
 return {thoughts:await t.count('thoughts'),rows:await ownedRows(t,id),history:await Promise.all(history.map(h=>t.get('revisions',h.id).then(x=>x??null))),provenance:await t.get('provenance',link.provenanceId)??null,dependency:await t.get('dependencies',JSON.stringify([link.evidence.inputId,'entry',id]))??null,tombstones:await t.count('tombstones'),source:await sourceProof(core,t,link),receipt:await core.get(t,'savedWorkBootstrap',id)??null};
}
export async function prepareSavedWorkBootstrap(store,core,input){
 binding(store,core);bounded(input);const payload=clone(input),start=Date.now();if(payload.datasetId!==core.datasetId)fail('BNS_SAVED_WORK_BINDING');
 // Validate the entire finite historical shape before any destination reads.
 // The dummy key proves structure only; real Source/key authority is obtained
 // independently below. No derived row from this dry calculation is retained.
 await validateSavedWorkPayload(payload);
 await store.finishFoundation();const before=await core.transaction(false,async t=>({authority:await authority(store,core,t),destination:await destination(t,core,payload.entry.id,payload.history,payload.link)})),wireDigest=await digest(payload);
 if(before.destination.receipt){if(before.destination.receipt.digest!==wireDigest)fail('BNS_SAVED_WORK_COLLISION');const cap=Object.freeze({});plans.set(cap,{store,core,before,payload,wireDigest,duplicate:true,start});return cap;}
 const d=before.destination;if(d.thoughts||(before.authority.sequence?.value||0)!==0||d.rows.entry||d.rows.history.length||d.rows.provenance.length||d.rows.dependencies.length||d.rows.placements||d.rows.suppressions||d.history.some(Boolean)||d.provenance||d.dependency||d.tombstones)fail('BNS_SAVED_WORK_DESTINATION');
 let retained=bytes(payload).length+bytes(before).length;if(retained>limit)fail('BNS_SAVED_WORK_LIMIT');const current=()=>{if(Date.now()-start>30000)fail('BNS_SAVED_WORK_LIMIT');},facts=await core.transaction(false,t=>captureTopicFormationTerminal(store,t,[payload.link.evidence],{current,retain:value=>{retained+=bytes(value).length;if(retained>limit)fail('BNS_SAVED_WORK_LIMIT');return clone(value);}}));
 const evidence=await restoreSourceLinkedEvidence(store,payload.link.evidence),expected=await derive(payload,evidence,before.authority.secret);const suppressions=await core.transaction(false,async t=>({scope:await t.count('thoughtSuppressions','byScope',evidence[0].scopeToken),exact:await t.count('thoughtSuppressions','byExact',expected.entry.exactSignature)}));if(suppressions.scope||suppressions.exact)fail('BNS_SAVED_WORK_DESTINATION');
 retained+=bytes(expected).length;if(retained>limit)fail('BNS_SAVED_WORK_LIMIT');const history=expected.history.map((h,i)=>({...h,sequence:(before.authority.revision?.value||0)+i+1,listKey:[h.entityKey,(before.authority.revision?.value||0)+i+1],documentList:[h.documentId,(before.authority.revision?.value||0)+i+1]}));
 const cap=Object.freeze({});plans.set(cap,{store,core,before,payload,wireDigest,evidence,facts,expected:{...expected,history},start});return cap;
}

// Only the original Foundation owner calls this seam. The capability is bound
// to this store/repository and immutable preparation, never a caller callback.
export async function requireSavedWorkBootstrap(t,cap,store){
 const p=plans.get(cap);if(!p||p.store!==store||t?.tx?.db!==p.core.repository.db||t.tx.mode!=='readwrite')fail('BNS_SAVED_WORK_CAPABILITY');
 const identity=requireRepositoryTransactionScope(store.repository,t);requireRepositoryTransactionDataMethods(store.repository,t);if(identity.database!==store.repository.db||identity.mode!=='readwrite')fail('BNS_SAVED_WORK_CAPABILITY');
 if(Date.now()-p.start>30000)fail('BNS_SAVED_WORK_LIMIT');
 const currentAuthority=await authority(store,p.core,t);if(!equal(p.before,{authority:currentAuthority,destination:await destination(t,p.core,p.payload.entry.id,p.payload.history,p.payload.link)}))fail('BNS_SAVED_WORK_CHANGED');p.currentControl=currentAuthority.control;
 p.transaction=t;if(p.duplicate)return {duplicate:true,id:p.payload.entry.id};await checkEvidenceInTransaction(store,t,p.evidence);
 if(p.sourceCapability){await verifyInitialSourceWrite(t,p.sourceCapability);p.facts=await captureTopicFormationTerminal(store,t,p.evidence,{current:()=>{if(Date.now()-p.start>30000)fail('BNS_SAVED_WORK_LIMIT');},retain:value=>{p.retained+=bytes(value).length;if(p.retained>limit)fail('BNS_SAVED_WORK_LIMIT');return clone(value);}});await verifyInitialSourceWrite(t,p.sourceCapability);}
 for(const fact of p.facts)if(!equal(fact.project(await t.get(fact.table,fact.key),()=>{}),fact.expected))fail('BNS_SAVED_WORK_CHANGED');
 if(await t.count('thoughtSuppressions','byScope',p.evidence[0].scopeToken)||await t.count('thoughtSuppressions','byExact',p.expected.entry.exactSignature))fail('BNS_SAVED_WORK_DESTINATION');
 return {...clone(p.expected),sequence:Math.max(p.before.authority.sequence?.value||0,p.expected.entry.updatedSequence),revision:p.expected.history.at(-1).sequence};
}
export async function finishSavedWorkBootstrap(t,cap,store){
 const p=plans.get(cap);if(!p||p.store!==store||p.duplicate||p.transaction!==t)fail('BNS_SAVED_WORK_CAPABILITY');const actual=await ownedRows(t,p.payload.entry.id);
 if(!equal(actual,{entry:p.expected.entry,history:p.expected.history,provenance:[p.expected.provenance],dependencies:[p.expected.dependency],placements:0,suppressions:0}))fail('BNS_SAVED_WORK_CHANGED');
 await p.core.put(t,'savedWorkBootstrap',[p.payload.entry.id],{version:1,digest:p.wireDigest});if(!p.before.authority.fence.marker)await p.core.put(t,'ownerRecoveryEpoch',[],{version:1,epoch:p.before.authority.fence.epoch});
 const receiptKey=await p.core.idIn(t,'savedWorkBootstrap',p.payload.entry.id),markerKey=await p.core.idIn(t,'ownerRecoveryEpoch');
 const points=[...p.before.destination.source.rows.map(row=>['meta',row.id,row]),['meta',receiptKey,{id:receiptKey,version:1,digest:p.wireDigest}],['meta',markerKey,{id:markerKey,version:1,epoch:p.before.authority.fence.epoch}],...p.before.authority.roots.map(([id,row])=>['meta',id,p.group&&id===p.core.prefix+'active'?p.group.active:row]),...(p.group?[['meta',p.group.terminal.id,p.group.terminal]]:[]),['meta','thought-sequence',{id:'thought-sequence',value:Math.max(p.before.authority.sequence?.value||0,p.expected.entry.updatedSequence)}],['meta','revision-sequence',{id:'revision-sequence',value:p.expected.history.at(-1).sequence}],['meta','backup-data-generation',{id:'backup-data-generation',value:p.before.authority.generation+1}],['thoughts',p.expected.entry.id,p.expected.entry],['provenance',p.expected.provenance.id,p.expected.provenance],['dependencies',p.expected.dependency.id,p.expected.dependency],...p.expected.history.map(h=>['revisions',h.id,h])];
 const check=()=>{if(Date.now()-p.start>30000)fail('BNS_SAVED_WORK_LIMIT');assertOriginalControlSettingsFacts(store,p.currentControl);return true;};
 registerRepositoryFinalReadFence(store.repository,t,{isCurrent:check,plan:function*(){
  for(const fact of p.facts)if(!equal(fact.project(yield {method:'get',table:fact.table,key:fact.key},check),fact.expected))fail('BNS_SAVED_WORK_CHANGED');
  for(const [table,key,expected]of points)if(!equal((yield {method:'get',table,key})??null,expected))fail('BNS_SAVED_WORK_CHANGED');
  for(const [table,index,key,expected]of [['thoughts',undefined,undefined,1],['provenance','byOwner',prefix(['entry',p.payload.entry.id]),1],['dependencies','byTarget',prefix(['entry',p.payload.entry.id]),1],['revisions','byList',prefix(['library_entry:'+p.payload.entry.id]),2],['placements','byEntry',prefix([p.payload.entry.id]),0],['thoughtSuppressions','byEntry',p.payload.entry.id,0],['thoughtSuppressions','byScope',p.evidence[0].scopeToken,0],['thoughtSuppressions','byExact',p.expected.entry.exactSignature,0],['tombstones',undefined,undefined,0]])if((yield {method:'count',table,...(index?{index,key}:{})})!==expected)fail('BNS_SAVED_WORK_CHANGED');return true;
 }});
 return {state:'bootstrapped',id:p.payload.entry.id};
}
export async function applySavedWorkBootstrap(store,cap){const p=plans.get(cap);if(!p||p.store!==store)fail('BNS_SAVED_WORK_CAPABILITY');return store.foundationWrite(t=>store.applySavedWorkBootstrapInTransaction(t,cap));}

// Consuming finite Source-first preparation. The Source capability is issued by
// the original Source validator; the real transaction still executes that owner
// before this owner. No synthetic source row is installed or used as authority.
export async function prepareSourceSavedWorkBootstrap(store,core,input,sourceCapability,sourceOperations,startedAt=Date.now()){
 binding(store,core);bounded(input);const payload=clone(input),now=Date.now();if(!Number.isSafeInteger(startedAt)||startedAt>now||now-startedAt>30000)fail('BNS_SAVED_WORK_LIMIT');const start=startedAt;await validateSavedWorkPayload(payload);if(payload.datasetId!==core.datasetId)fail('BNS_SAVED_WORK_BINDING');
 const source=initialSourcePlan(sourceCapability),verified=await core.prepareSourceBootstrapReceive(sourceOperations),entities=Object.fromEntries(verified.members.map(op=>[op.value.entityType,op.value.entity]));if(!equal(source,entities))fail('BNS_SAVED_WORK_BINDING');
 const wire=payload.link.evidence,b=source.input;if(b.id!==wire.inputId||b.excluded||b.branchStatus||source.inputState.removalState!=='active'||source.inputState.sourcePurged||source.source.id!==wire.sourceRecordIds[0]||b.provenance.length!==1)fail('BNS_SAVED_WORK_CHANGED');
 await store.finishFoundation();const before=await core.transaction(false,async t=>({authority:await authority(store,core,t),destination:{thoughts:await t.count('thoughts'),rows:await ownedRows(t,payload.entry.id),history:await Promise.all(payload.history.map(h=>t.get('revisions',h.id).then(x=>x??null))),provenance:await t.get('provenance',payload.link.provenanceId)??null,dependency:await t.get('dependencies',JSON.stringify([wire.inputId,'entry',payload.entry.id]))??null,tombstones:await t.count('tombstones'),receipt:await core.get(t,'savedWorkBootstrap',payload.entry.id)??null},sourcePresent:!!await t.get('records',source.source.id)}));
 if(before.sourcePresent){const existing=await prepareSavedWorkBootstrap(store,core,payload);plans.get(existing).start=start;return existing;}delete before.sourcePresent;
 const d=before.destination;if(d.thoughts||(before.authority.sequence?.value||0)!==0||d.rows.entry||d.rows.history.length||d.rows.provenance.length||d.rows.dependencies.length||d.rows.placements||d.rows.suppressions||d.history.some(Boolean)||d.provenance||d.dependency||d.tombstones||d.receipt)fail('BNS_SAVED_WORK_DESTINATION');
 const evidence=[await planEvidenceProjection({inputId:b.id,contentRevision:source.inputState.contentRevision,body:b.libraryText??source.source.originalText,note:b.note||'',sourceRecordIds:[source.source.id],identities:[source.source.sourceKey]},{role:'primary',selectedFields:wire.selectedFields},before.authority.secret,before.authority.epoch)];if(!equal(portableSourceLinkedEvidence(evidence),wire))fail('BNS_SOURCE_LINKED_EVIDENCE_CHANGED');
 const expected=await derive(payload,evidence,before.authority.secret),sourceSequence=(before.authority.revision?.value||0)+1;
 before.authority.revision={id:'revision-sequence',value:sourceSequence};before.authority.fence.marker=true;
 const member=verified.members.find(op=>op.value.entityType==='input'),descriptor=verified.descriptor;before.destination.source=await core.transaction(false,async t=>({member:member.revisionId,commit:descriptor.revisionId,rows:await Promise.all([member,descriptor].flatMap(op=>[core.idIn(t,'head',op.type,op.entityId).then(id=>({id,type:op.type,entityId:op.entityId,revisions:[op.revisionId],purged:false,fence:null})),core.idIn(t,'revision',op.revisionId).then(id=>({id,operation:op,redacted:false}))]))}));
 const history=expected.history.map((h,i)=>({...h,sequence:sourceSequence+i+1,listKey:[h.entityKey,sourceSequence+i+1],documentList:[h.documentId,sourceSequence+i+1]})),retained=bytes(payload).length+bytes(source).length+bytes(sourceOperations).length+bytes(before).length+bytes(expected).length;if(retained>limit)fail('BNS_SAVED_WORK_LIMIT');
 const suppressions=await core.transaction(false,async t=>({scope:await t.count('thoughtSuppressions','byScope',evidence[0].scopeToken),exact:await t.count('thoughtSuppressions','byExact',expected.entry.exactSignature)}));if(suppressions.scope||suppressions.exact)fail('BNS_SAVED_WORK_DESTINATION');
 const cap=Object.freeze({});plans.set(cap,{store,core,before,payload,wireDigest:await digest(payload),evidence,facts:[],expected:{...expected,history},start,sourceCapability,retained});return cap;
}

// This guard can be observed by Core but only the original consuming owner below
// can install its transaction-bound identity. Plain protocol data grants no write.
export function requireSavedWorkProtocolOwner(t,core,operation,origin){
 const binding=protocolApplications.get(t);if(!binding||binding.core!==core||binding.operation!==operation||binding.origin!==origin)fail('BNS_SAVED_WORK_OWNER_REQUIRED');
 requireRepositoryTransactionScope(core.repository,t);requireRepositoryTransactionDataMethods(core.repository,t);
}
export async function prepareSavedWorkProtocol(input){
 if(bytes(input).length>limit)fail('BNS_SAVED_WORK_LIMIT');const operation=await validateFrozenOperation(input);if(operation.type!=='savedWorkBootstrap')fail('BNS_SAVED_WORK_OPERATION');wireOperations.add(operation);return operation;
}
export async function commitSavedWorkProtocol(t,core,cap,operation){
 if(!wireOperations.has(operation))fail('BNS_SAVED_WORK_CAPABILITY');
 const p=plans.get(cap);if(!p||p.core!==core||p.transaction!==t||operation.type!=='savedWorkBootstrap'||operation.datasetId!==core.datasetId||!equal(operation.value,{id:p.payload.entry.id,version:1,payload:p.payload}))fail('BNS_SAVED_WORK_CAPABILITY');
 if(bytes({operation,payload:p.payload,before:p.before,expected:p.expected??null,facts:p.facts?.map(f=>f.expected)??null}).length>limit)fail('BNS_SAVED_WORK_LIMIT');
 const receipt=await core.get(t,'savedWorkBootstrap',p.payload.entry.id);if(receipt?.digest!==p.wireDigest)fail('BNS_SAVED_WORK_CHANGED');
 const intent=await savedProtocolIntent(t,core,operation,false);
 protocolApplications.set(t,{core,operation,origin:'remote'});
 try{const result=await core.applyInTransaction(t,operation,{origin:'remote',materialize:false});if(!['applied','duplicate'].includes(result.state))fail('BNS_SAVED_WORK_OPERATION');await sealSavedProtocol(t,core,intent,p.start);return result;}finally{protocolApplications.delete(t);}
}
async function savedProtocolIntent(t,core,operation,local){
 const {type,entityId,revisionId,operationId,deviceId,sequence}=operation,receipt=await core.get(t,'receipt',operationId),frontier=await core.get(t,'frontier',deviceId),generation=await core.get(t,'generation'),device=deviceId===core.deviceId?await core.get(t,'device',deviceId):null;
 const current=frontier?{frontier:frontier.frontier,ranges:frontier.ranges}:null,next=acceptSequence(current,sequence);
 const values=[['head',[type,entityId],{type,entityId,revisions:[revisionId],purged:false,fence:null}],['revision',[revisionId],{operation,redacted:false}],['receipt',[operationId],{digest:revisionId,deviceId,sequence}],['sequence',[deviceId,String(sequence).padStart(16,'0')],{operationId,digest:revisionId}],['entityRevision',[type,entityId,revisionId],{revisionId}],['frontier',[deviceId],{...next,deviceId}],['generation',[],{value:(generation?.value||0)+(receipt?0:1)}]];
 if(receipt){if(!equal(receipt,{id:receipt.id,digest:revisionId,deviceId,sequence})||!equal(current,next))fail('BNS_SAVED_WORK_OPERATION');}
 else if(await core.get(t,'head',type,entityId)||await core.get(t,'revision',revisionId)||await core.get(t,'sequence',deviceId,String(sequence).padStart(16,'0'))||await core.get(t,'entityRevision',type,entityId,revisionId))fail('BNS_SAVED_WORK_OPERATION');
 if(deviceId===core.deviceId)values.push(['device',[deviceId],{sequence:Math.max(device?.sequence||0,sequence)}]);
 if(local)values.push(['outbox',[operationId],{operationId,revisionId,state:'queued'}]);
 const points=[];for(const [kind,ids,value]of values){const id=await core.idIn(t,kind,...ids);points.push([id,{...value,id}]);}
 for(const [kind,ids]of [['pending',[operationId]],['entityPending',[type,entityId,operationId]],['quarantine',[operationId]]]){const id=await core.idIn(t,kind,...ids);if(await t.get('meta',id))fail('BNS_SAVED_WORK_OPERATION');points.push([id,null]);}
 return points;
}
async function sealSavedProtocol(t,core,points,start){
 for(const [key,row]of points)if(!equal((await t.get('meta',key))??null,row))fail('BNS_SAVED_WORK_OPERATION');
 const current=()=>{if(Date.now()-start>30000)fail('BNS_SAVED_WORK_LIMIT');return true;};registerRepositoryFinalReadFence(core.repository,t,{isCurrent:current,plan:function*(){for(const [key,row]of points)if(!equal((yield {method:'get',table:'meta',key})??null,row))fail('BNS_SAVED_WORK_CHANGED');return true;}});
}
export async function prepareSavedWorkPublication(store,core,id){
 binding(store,core);const start=Date.now(),payload=await captureSavedWorkBootstrap(store,core,id),before=await core.transaction(false,async t=>({authority:await authority(store,core,t),rows:await ownedRows(t,id),source:await sourceProof(core,t,payload.link)}));
 const evidence=await restoreSourceLinkedEvidence(store,payload.link.evidence),expected=await derive(payload,evidence,before.authority.secret);
 if(!equal(before.rows,{entry:expected.entry,history:expected.history,provenance:[expected.provenance],dependencies:[expected.dependency],placements:0,suppressions:0}))fail('BNS_SAVED_WORK_CHANGED');
 let retained=bytes({payload,before,expected}).length;const current=()=>{if(Date.now()-start>30000||retained>limit)fail('BNS_SAVED_WORK_LIMIT');};current();const facts=await core.transaction(false,t=>captureTopicFormationTerminal(store,t,evidence,{current,retain:value=>{retained+=bytes(value).length;current();return clone(value);}}));
 const blocked=await core.transaction(false,async t=>(await t.count('thoughtSuppressions','byScope',evidence[0].scopeToken))+(await t.count('thoughtSuppressions','byExact',expected.entry.exactSignature)));if(blocked)fail('BNS_SAVED_WORK_CHANGED');
 const prepared=await core.prepare([{type:'savedWorkBootstrap',expectedParents:[],value:{id,version:1,payload}}],{actor:'bootstrap'});retained+=bytes(prepared).length;current();const cap=Object.freeze({});publications.set(cap,{store,core,id,payload,before,expected,evidence,facts,prepared,start});return cap;
}
export async function publishSavedWorkBootstrap(store,cap){
 const p=publications.get(cap);if(!p||p.store!==store)fail('BNS_SAVED_WORK_CAPABILITY');const {core,id,before,prepared}=p;
 return store.foundationWrite(async t=>{
  const now=await authority(store,core,t);if(Date.now()-p.start>30000||!equal(before,{authority:now,rows:await ownedRows(t,id),source:await sourceProof(core,t,p.payload.link)}))fail('BNS_SAVED_WORK_CHANGED');await checkEvidenceInTransaction(store,t,p.evidence);
  for(const fact of p.facts)if(!equal(fact.project(await t.get(fact.table,fact.key),()=>{}),fact.expected))fail('BNS_SAVED_WORK_CHANGED');
  const operation=prepared.operations[0],intent=await savedProtocolIntent(t,core,operation,true);protocolApplications.set(t,{core,operation,origin:'local'});try{await core.commitPrepared(t,prepared,{materialize:false});}finally{protocolApplications.delete(t);}
  const points=[...before.source.rows.map(row=>['meta',row.id,row]),...before.authority.roots.map(([id,row])=>['meta',id,row]),['meta','thought-sequence',before.authority.sequence],['meta','revision-sequence',before.authority.revision],['meta','backup-data-generation',{id:'backup-data-generation',value:before.authority.generation}],['thoughts',id,p.expected.entry],['provenance',p.expected.provenance.id,p.expected.provenance],['dependencies',p.expected.dependency.id,p.expected.dependency],...p.expected.history.map(row=>['revisions',row.id,row])];
  const current=()=>{if(Date.now()-p.start>30000)fail('BNS_SAVED_WORK_LIMIT');assertOriginalControlSettingsFacts(store,now.control);return true;};
  registerRepositoryFinalReadFence(store.repository,t,{isCurrent:current,plan:function*(){for(const fact of p.facts)if(!equal(fact.project(yield {method:'get',table:fact.table,key:fact.key},current),fact.expected))fail('BNS_SAVED_WORK_CHANGED');for(const [table,key,row]of points)if(!equal((yield {method:'get',table,key})??null,row))fail('BNS_SAVED_WORK_CHANGED');for(const [table,index,key,n]of [['revisions','byList',prefix(['library_entry:'+id]),2],['provenance','byOwner',prefix(['entry',id]),1],['dependencies','byTarget',prefix(['entry',id]),1],['placements','byEntry',prefix([id]),0],['thoughtSuppressions','byEntry',id,0],['thoughtSuppressions','byScope',p.evidence[0].scopeToken,0],['thoughtSuppressions','byExact',p.expected.entry.exactSignature,0]])if((yield {method:'count',table,index,key})!==n)fail('BNS_SAVED_WORK_CHANGED');return true;}});
  await sealSavedProtocol(t,core,intent,p.start);return clone(operation);
 });
}

// A compiled Source + saved graph owns exactly one terminal replay activation.
// This constructor derives the allowed pointer from the durable validated stage;
// neither a public expected-row parameter nor an unbranded plan can relax roots.
export async function prepareSavedWorkGroupApplication(store,core,plan,stage,state){
 requireOriginalGroupCheckpointPlan(core,plan);const saved=plan.groups.filter(g=>g.type==='savedWorkBootstrap');if(!saved.length)return null;const startedAt=Date.now();state=clone(state);
 if(saved.length!==1||plan.groups.length!==2||core.repository!==stage.repository||core.datasetId!==stage.datasetId||core.fixedNamespace!==state.replayId||state.phase!=='validated'||state.graphDigest!==plan.digest||state.manifest?.datasetId!==core.datasetId||!equal(await stage.read('restore'),state))fail('BNS_SAVED_WORK_CAPABILITY');
 const stageRows=await verifySavedGroupStage(store,core,plan,stage,state);
 const source=plan.groups.find(g=>g.type==='sourceBootstrapCommit');if(!source)fail('BNS_SAVED_WORK_CAPABILITY');
 const operation=await prepareSavedWorkProtocol(saved[0].operations[0]),cap=await prepareSourceSavedWorkBootstrap(store,core,operation.value.payload,source.capability,source.operations,startedAt);
 const p=plans.get(cap);p.group={protocol:[...savedGroupProtocolIntent(core,plan),...stageRows.map(row=>[row.id,row])],plan,stage,state:clone(state),operation,id:saved[0].id,active:{id:core.prefix+'active',namespace:state.replayId,manifestId:state.manifestId,graphDigest:plan.digest},terminal:{...clone(state),phase:'activated'}};
 if(bytes({before:p.before,payload:p.payload,expected:p.expected,stage:p.group.state,protocol:p.group.protocol,plan}).length>limit)fail('BNS_SAVED_WORK_LIMIT');
 return cap;
}
export async function applySavedWorkGroupStep(t,cap,id){
 const p=plans.get(cap);if(!p?.group||p.group.id!==id)fail('BNS_SAVED_WORK_CAPABILITY');requireOriginalGroupCheckpointPlan(p.core,p.group.plan);
 if(!equal(await p.group.stage.get(t,'restore'),p.group.state))fail('BNS_RESTORE_STAGE_CHANGED');
 await p.store.applySavedWorkBootstrapInTransaction(t,cap);await commitSavedWorkProtocol(t,p.core,cap,p.group.operation);
}
export async function sealSavedWorkGroupActivation(t,cap){
 if(cap===null)return;const p=plans.get(cap);if(!p?.group||p.transaction!==t)fail('BNS_SAVED_WORK_CAPABILITY');
 if(!equal(await p.group.stage.get(t,'restore'),p.group.terminal)||!equal(await t.get('meta',p.core.prefix+'active'),p.group.active))fail('BNS_RESTORE_STAGE_CHANGED');
 await sealSavedProtocol(t,p.core,p.group.protocol,p.start);
 const stagePrefix=protocolPhysicalId(p.group.stage.prefix,p.group.stage.fixedNamespace,'groupItem',[]),replayPrefix=p.core.prefix+'generation:'+p.core.fixedNamespace+':',stageRange=IDBKeyRange.bound(stagePrefix,stagePrefix+'\uffff'),replayRange=IDBKeyRange.bound(replayPrefix,replayPrefix+'\uffff'),replayCount=p.group.protocol.filter(([id,row])=>row&&id.startsWith(replayPrefix)).length+2;
 registerRepositoryFinalReadFence(p.store.repository,t,{isCurrent:()=>{if(Date.now()-p.start>30000)fail('BNS_SAVED_WORK_LIMIT');return true;},plan:function*(){if((yield {method:'count',table:'meta',key:stageRange})!==p.group.state.received||(yield {method:'count',table:'meta',key:replayRange})!==replayCount)fail('BNS_RESTORE_STAGE_CHANGED');return true;}});
}

// Keyed scope proof uses the original Source plan and original evidence/key
// derivation. The portable aggregate never supplies a local authority token.
const savedScopes=new WeakMap();
export async function prepareSavedWorkScope(store,core,scope,plan){
 requireOriginalGroupCheckpointPlan(core,plan);binding(store,core);const saved=plan.groups.find(g=>g.type==='savedWorkBootstrap');if(!saved)return;
 const source=initialSourcePlan(plan.groups.find(g=>g.type==='sourceBootstrapCommit').capability),payload=saved.operations[0].value.payload;
 const {secret,epoch}=await core.transaction(false,async t=>({secret:(await t.get('meta','thought-suppression-key'))?.value,epoch:(await t.get('meta','thought-epoch'))?.value||0})),b=source.input,wire=payload.link.evidence;
 const evidence=[await planEvidenceProjection({inputId:b.id,contentRevision:source.inputState.contentRevision,body:b.libraryText??source.source.originalText,note:b.note||'',sourceRecordIds:[source.source.id],identities:[source.source.sourceKey]},{role:'primary',selectedFields:wire.selectedFields},secret,epoch)];
 if(!equal(portableSourceLinkedEvidence(evidence),wire))fail('BNS_SOURCE_LINKED_EVIDENCE_CHANGED');
 const expected=await derive(payload,evidence,secret);savedScopes.set(scope,{store,core,plan,evidence,secret,epoch,expected});
}
const normalizedSavedHistory=rows=>rows.map(row=>({...row,sequence:0,listKey:[row.entityKey,0],documentList:[row.documentId,0]}));
export async function requireSavedWorkScope(store,t,scope){
 const p=savedScopes.get(scope);if(!p||p.store!==store)fail('BNS_SAVED_WORK_CAPABILITY');requireOriginalGroupCheckpointPlan(p.core,p.plan);requireRepositoryTransactionScope(store.repository,t);
 if(!equal((await t.get('meta','thought-suppression-key'))?.value,p.secret)||((await t.get('meta','thought-epoch'))?.value||0)!==p.epoch)fail('BNS_SAVED_WORK_CHANGED');await checkEvidenceInTransaction(store,t,p.evidence);
 const rows=await ownedRows(t,p.expected.entry.id),expected={entry:p.expected.entry,history:p.expected.history,provenance:[p.expected.provenance],dependencies:[p.expected.dependency],placements:0,suppressions:0};
 // Physical history sequence is allocated locally; every semantic field remains exact.
 rows.history=normalizedSavedHistory(rows.history);expected.history=normalizedSavedHistory(expected.history);
 const sequence=(await t.get('meta','thought-sequence'))?.value;if(!Number.isSafeInteger(sequence)||sequence<p.expected.entry.updatedSequence||!equal(rows,expected)||await t.count('thoughts')!==1||await t.count('provenance')!==1||await t.count('dependencies')!==1||await t.count('thoughtSuppressions')||await t.count('placements')||await t.count('librarySearchTerms'))fail('BNS_GROUP_CANONICAL_UNREPRESENTED');
 for(const row of await readGroupRows(t,'libraryMigrationItems'))if(!equal(row,{id:JSON.stringify(['search','entry',p.expected.entry.id]),entityKind:'search',statusKey:0,ownerKind:'entry',ownerId:p.expected.entry.id,version:ownerVersion('entry',p.expected.entry),phase:'delete',offset:0,sourceRecordIds:p.expected.entry.sourceRecordIds??[]}))fail('BNS_GROUP_CANONICAL_UNREPRESENTED');
 return true;
}

// All original replay write intents are derived from the authentic immutable
// graph while the new replay namespace is still empty, not from post-write rows.
function savedGroupProtocolIntent(core,plan){
 const points=[],frontiers=new Map(),key=(kind,...ids)=>protocolPhysicalId(core.prefix,core.fixedNamespace,kind,ids),put=(kind,ids,value)=>{const id=key(kind,...ids);points.push([id,{...value,id}]);};let local=0;
 for(const g of plan.groups)for(const op of g.operations){
  put('revision',[op.revisionId],{operation:op,redacted:false});put('receipt',[op.operationId],{digest:op.revisionId,deviceId:op.deviceId,sequence:op.sequence});put('sequence',[op.deviceId,String(op.sequence).padStart(16,'0')],{operationId:op.operationId,digest:op.revisionId});put('entityRevision',[op.type,op.entityId,op.revisionId],{revisionId:op.revisionId});
  frontiers.set(op.deviceId,acceptSequence(frontiers.get(op.deviceId),op.sequence));if(op.deviceId===core.deviceId)local=Math.max(local,op.sequence);
  for(const [kind,ids]of [['pending',[op.operationId]],['quarantine',[op.operationId]],['entityPending',[op.type,op.entityId,op.operationId]],['outbox',[op.operationId]]])points.push([key(kind,...ids),null]);
 }
 for(const h of plan.heads)put('head',[h.type,h.entityId],h);for(const [deviceId,state]of frontiers)put('frontier',[deviceId],{...state,deviceId});put('generation',[],{value:plan.operationCount});if(local)put('device',[core.deviceId],{sequence:local});return points;
}

async function verifySavedGroupStage(store,core,plan,stage,state){
 assertGroupedCheckpointManifest(state.manifest,{core});
 if(stage.fixedNamespace===core.fixedNamespace||!stage.fixedNamespace||state.manifestRef?.codec!=='identity'||state.received!==state.manifest.itemCount)fail('BNS_RESTORE_STAGE_CHANGED');
 const object=await protocolObject('checkpoint-manifest',bytes(state.manifest));if(object.ref.id!==state.manifestId||!equal(object.ref,state.manifestRef))fail('BNS_OBJECT_INTEGRITY');
 const rows=await stage.transaction(false,t=>readGroupRows(t,'meta',{prefix:protocolPhysicalId(stage.prefix,stage.fixedNamespace,'groupItem',[])}),['meta']);
 if(rows.length!==state.received)fail('BNS_RESTORE_STAGE_CHANGED');let chain='';
 for(let i=0;i<rows.length;i++){const row=rows[i];if(!equal(row,{id:protocolPhysicalId(stage.prefix,stage.fixedNamespace,'groupItem',[String(i).padStart(4,'0')]),item:row.item}))fail('BNS_RESTORE_STAGE_CHANGED');chain=await digest(bytes(chain+'\n'+new TextDecoder().decode(bytes(row.item))));}
 if(chain!==state.manifest.chain||await validateGroupedCheckpointGraph(core,rows.map(row=>row.item),state.manifest,{store})!==plan.digest||!equal(await stage.read('restore'),state))fail('BNS_RESTORE_STAGE_CHANGED');return rows;
}

import {originalHumanSavedApplicationWitness} from './human-library-group.js';
import {originalHumanSavedScopePartition} from './human-library-scope.js';
import {bindHumanReplayEntry} from './human-library-allocation.js';
import {savedEditRequest,normalizeSavedPayload,validateSavedSuccessor,deriveSavedSuccessor,restoreSavedHistoryOrder} from './saved-work-successor-codec.js';
import {humanPlanEntry,prepareSavedEntryEditPlan,humanEntryEditPlan,executeHumanPlanInTransaction} from './human-library-plan.js';
import {hashText} from '../dedupe.js';
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
import {deriveSavedWorkBootstrap as derive,portableSavedEntry as portableEntry,boundedSavedPayload as bounded,validateSavedWorkPayload,validateSavedWorkEnvelope} from './saved-work-payload.js';
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
// This profile proves one original AI baseline followed by a complete bounded
// chain of human edits. Retired/coalesced histories and other owners remain unsupported.
const groups=new WeakMap(),plans=new WeakMap(),publications=new WeakMap(),protocolApplications=new WeakMap(),wireOperations=new WeakSet(),limit=2*1024*1024;
const bad=()=>fail('BNS_SAVED_WORK_UNSUPPORTED');
function binding(store,core){requireOriginalLibraryDocumentsStore(store);if(store.repository!==core.repository)fail('BNS_SAVED_WORK_BINDING');}
async function page(t,name,index,key,max){const rows=[];let after=null;do{const p=await t.rangePage(name,index,prefix(key),after,Math.min(64,max+1-rows.length));rows.push(...p.rows.map(x=>x.value));if(rows.length>max)bad();after=p.next;}while(after!==null);if(await t.count(name,index,prefix(key))!==rows.length)bad();return rows;}
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
 const points=[...p.before.destination.source.rows.map(row=>['meta',row.id,row]),['meta',receiptKey,{id:receiptKey,version:1,digest:p.wireDigest}],['meta',markerKey,{id:markerKey,version:1,epoch:p.before.authority.fence.epoch}],...p.before.authority.roots.map(([id,row])=>['meta',id,p.group&&id===p.core.prefix+'active'?p.group.active:row]),...(p.group?[['meta',p.group.terminal.id,p.group.terminal]]:[]),['meta','thought-sequence',{id:'thought-sequence',value:p.group?.finalSequence??Math.max(p.before.authority.sequence?.value||0,p.expected.entry.updatedSequence)}],['meta','revision-sequence',{id:'revision-sequence',value:p.group?.finalRevision??p.expected.history.at(-1).sequence}],['meta','backup-data-generation',{id:'backup-data-generation',value:p.before.authority.generation+1}],['thoughts',p.expected.entry.id,p.expected.entry],['provenance',p.expected.provenance.id,p.expected.provenance],['dependencies',p.expected.dependency.id,p.expected.dependency],...p.expected.history.map(h=>['revisions',h.id,h])];
 const check=()=>{if(Date.now()-p.start>30000)fail('BNS_SAVED_WORK_LIMIT');assertOriginalControlSettingsFacts(store,p.currentControl);return true;};
 registerRepositoryFinalReadFence(store.repository,t,{isCurrent:check,plan:function*(){
  for(const fact of p.facts)if(!equal(fact.project(yield {method:'get',table:fact.table,key:fact.key},check),fact.expected))fail('BNS_SAVED_WORK_CHANGED');
  for(const [table,key,expected]of points)if(!equal((yield {method:'get',table,key})??null,expected))fail('BNS_SAVED_WORK_CHANGED');
  for(const [table,index,key,expected]of [['thoughts',undefined,undefined,p.group?.entryCount??1],['provenance','byOwner',prefix(['entry',p.payload.entry.id]),1],['dependencies','byTarget',prefix(['entry',p.payload.entry.id]),1],['revisions','byList',prefix(['library_entry:'+p.payload.entry.id]),p.expected.history.length],['placements','byEntry',prefix([p.payload.entry.id]),0],['thoughtSuppressions','byEntry',p.payload.entry.id,0],['thoughtSuppressions','byScope',p.evidence[0].scopeToken,0],['thoughtSuppressions','byExact',p.expected.entry.exactSignature,0],['tombstones',undefined,undefined,0]])if((yield {method:'count',table,...(index?{index,key}:{})})!==expected)fail('BNS_SAVED_WORK_CHANGED');return true;
 }});
 return {state:'bootstrapped',id:p.payload.entry.id};
}
export async function applySavedWorkBootstrap(store,cap){const p=plans.get(cap);if(!p||p.store!==store)fail('BNS_SAVED_WORK_CAPABILITY');return store.foundationWrite(t=>store.applySavedWorkBootstrapInTransaction(t,cap));}

// Consuming finite Source-first preparation. The Source capability is issued by
// the original Source validator; the real transaction still executes that owner
// before this owner. No synthetic source row is installed or used as authority.
async function deriveSavedChain(operations,evidence,secret){
 const anchor=operations[0];if(anchor?.type!=='savedWorkBootstrap')bad();let payload=anchor.value.payload,expected=await derive(payload,evidence,secret),previous=null;
 for(const op of operations.slice(1)){
  if(op.type!=='savedWorkSuccessor'||op.entityId!==anchor.entityId||op.value.anchor!==anchor.revisionId||!equal(op.parents,previous?[previous.revisionId]:[])||!equal(normalizeSavedPayload(op.value.before),normalizeSavedPayload(payload)))bad();
  const next=await deriveSavedSuccessor(op.value,secret);expected={...expected,...next};payload=op.value.after;previous=op;
 }
 expected.history=restoreSavedHistoryOrder(expected.history);return {expected,payload};
}
function savedPlanOperations(core,plan,entityId){requireOriginalGroupCheckpointPlan(core,plan);return plan.groups.filter(g=>['savedWorkBootstrap','savedWorkSuccessor'].includes(g.type)&&g.operations[0].entityId===entityId).map(g=>g.operations[0]);}
async function deriveSavedPlan(core,plan,payload,evidence,secret){const result=await deriveSavedChain(savedPlanOperations(core,plan,payload.entry.id),evidence,secret);if(!equal(result.payload,payload))bad();return result.expected;}

export async function prepareSourceSavedWorkBootstrap(store,core,input,sourceCapability,sourceOperations,startedAt=Date.now(),groupPlan=null){
 binding(store,core);bounded(input);const payload=clone(input),now=Date.now();if(!Number.isSafeInteger(startedAt)||startedAt>now||now-startedAt>30000)fail('BNS_SAVED_WORK_LIMIT');const start=startedAt;if(groupPlan){const ops=savedPlanOperations(core,groupPlan,payload.entry.id);if(!equal(ops.at(-1).type==='savedWorkBootstrap'?ops.at(-1).value.payload:ops.at(-1).value.after,payload))bad();validateSavedWorkEnvelope({id:payload.entry.id,version:1,payload});}else await validateSavedWorkPayload(payload);if(payload.datasetId!==core.datasetId)fail('BNS_SAVED_WORK_BINDING');
 const source=initialSourcePlan(sourceCapability),verified=await core.prepareSourceBootstrapReceive(sourceOperations),entities=Object.fromEntries(verified.members.map(op=>[op.value.entityType,op.value.entity]));if(!equal(source,entities))fail('BNS_SAVED_WORK_BINDING');
 const wire=payload.link.evidence,b=source.input;if(b.id!==wire.inputId||b.excluded||b.branchStatus||source.inputState.removalState!=='active'||source.inputState.sourcePurged||source.source.id!==wire.sourceRecordIds[0]||b.provenance.length!==1)fail('BNS_SAVED_WORK_CHANGED');
 await store.finishFoundation();const before=await core.transaction(false,async t=>({authority:await authority(store,core,t),destination:{thoughts:await t.count('thoughts'),rows:await ownedRows(t,payload.entry.id),history:await Promise.all(payload.history.map(h=>t.get('revisions',h.id).then(x=>x??null))),provenance:await t.get('provenance',payload.link.provenanceId)??null,dependency:await t.get('dependencies',JSON.stringify([wire.inputId,'entry',payload.entry.id]))??null,tombstones:await t.count('tombstones'),receipt:await core.get(t,'savedWorkBootstrap',payload.entry.id)??null},sourcePresent:!!await t.get('records',source.source.id)}));
 if(before.sourcePresent){const existing=await prepareSavedWorkBootstrap(store,core,payload);plans.get(existing).start=start;return existing;}delete before.sourcePresent;
 const d=before.destination;if(d.thoughts||(before.authority.sequence?.value||0)!==0||d.rows.entry||d.rows.history.length||d.rows.provenance.length||d.rows.dependencies.length||d.rows.placements||d.rows.suppressions||d.history.some(Boolean)||d.provenance||d.dependency||d.tombstones||d.receipt)fail('BNS_SAVED_WORK_DESTINATION');
 const evidence=[await planEvidenceProjection({inputId:b.id,contentRevision:source.inputState.contentRevision,body:b.libraryText??source.source.originalText,note:b.note||'',sourceRecordIds:[source.source.id],identities:[source.source.sourceKey]},{role:'primary',selectedFields:wire.selectedFields},before.authority.secret,before.authority.epoch)];if(!equal(portableSourceLinkedEvidence(evidence),wire))fail('BNS_SOURCE_LINKED_EVIDENCE_CHANGED');
 const expected=groupPlan?await deriveSavedPlan(core,groupPlan,payload,evidence,before.authority.secret):await derive(payload,evidence,before.authority.secret),sourceSequence=(before.authority.revision?.value||0)+1;
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
 else if((operation.type==='savedWorkSuccessor'?!equal((await core.get(t,'head',type,entityId))?.revisions??[],operation.parents):await core.get(t,'head',type,entityId))||await core.get(t,'revision',revisionId)||await core.get(t,'sequence',deviceId,String(sequence).padStart(16,'0'))||await core.get(t,'entityRevision',type,entityId,revisionId))fail('BNS_SAVED_WORK_OPERATION');
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
  registerRepositoryFinalReadFence(store.repository,t,{isCurrent:current,plan:function*(){for(const fact of p.facts)if(!equal(fact.project(yield {method:'get',table:fact.table,key:fact.key},current),fact.expected))fail('BNS_SAVED_WORK_CHANGED');for(const [table,key,row]of points)if(!equal((yield {method:'get',table,key})??null,row))fail('BNS_SAVED_WORK_CHANGED');for(const [table,index,key,n]of [['revisions','byList',prefix(['library_entry:'+id]),p.expected.history.length],['provenance','byOwner',prefix(['entry',id]),1],['dependencies','byTarget',prefix(['entry',id]),1],['placements','byEntry',prefix([id]),0],['thoughtSuppressions','byEntry',id,0],['thoughtSuppressions','byScope',p.evidence[0].scopeToken,0],['thoughtSuppressions','byExact',p.expected.entry.exactSignature,0]])if((yield {method:'count',table,index,key})!==n)fail('BNS_SAVED_WORK_CHANGED');return true;}});
  await sealSavedProtocol(t,core,intent,p.start);return clone(operation);
 });
}

// A compiled Source + saved graph owns exactly one terminal replay activation.
// This constructor derives the allowed pointer from the durable validated stage;
// neither a public expected-row parameter nor an unbranded plan can relax roots.
export async function prepareSavedWorkGroupApplication(store,core,plan,stage,state,humanApplication=null){
 requireOriginalGroupCheckpointPlan(core,plan);const saved=plan.groups.filter(g=>g.type==='savedWorkBootstrap');if(!saved.length)return null;const startedAt=Date.now();state=clone(state);const human=plan.groups.some(g=>g.type==='humanLibraryCommit')?originalHumanSavedApplicationWitness(store,core,plan,humanApplication):null;
 if(plan.groups.some(g=>!['sourceBootstrapCommit','savedWorkBootstrap','savedWorkSuccessor','humanLibraryCommit'].includes(g.type))||core.repository!==stage.repository||core.datasetId!==stage.datasetId||core.fixedNamespace!==state.replayId||state.phase!=='validated'||state.graphDigest!==plan.digest||state.manifest?.datasetId!==core.datasetId||!equal(await stage.read('restore'),state))fail('BNS_SAVED_WORK_CAPABILITY');
 const stageRows=await verifySavedGroupStage(store,core,plan,stage,state),source=plan.groups.find(g=>g.type==='sourceBootstrapCommit');if(!source)fail('BNS_SAVED_WORK_CAPABILITY');
 const members=new Map(),historyIds=new Set(),provenanceIds=new Set();let retained=0,baseline=null,sequence=null,revision=null;
 // Every member is prepared against the same actual empty installation before
 // writes. Only this branded complete graph derives intervening owner counters.
 for(const group of saved){const operation=await prepareSavedWorkProtocol(group.operations[0]),chain=savedPlanOperations(core,plan,operation.entityId),last=chain.at(-1),finalPayload=last.type==='savedWorkSuccessor'?last.value.after:operation.value.payload,member=await prepareSourceSavedWorkBootstrap(store,core,finalPayload,source.capability,source.operations,startedAt,plan),p=plans.get(member);
  if(members.has(operation.entityId)||human?.state.thoughts.some(row=>row.id===p.expected.entry.id||row.createdSequence===p.expected.entry.createdSequence))fail('BNS_SAVED_WORK_COLLISION');if(baseline===null){baseline=clone(p.before.authority);sequence=human?human.state.base.sequence:p.before.authority.sequence;revision=human?{id:'revision-sequence',value:(human.state.base.revision?.value||0)+1}:p.before.authority.revision;}else if(!equal(p.before.authority,baseline))fail('BNS_SAVED_WORK_CHANGED');
  for(const row of p.expected.history){if(historyIds.has(row.id)||row.id===initialSourcePlan(source.capability).baselineRevision.id)bad();historyIds.add(row.id);}if(provenanceIds.has(p.expected.provenance.id))bad();provenanceIds.add(p.expected.provenance.id);
  p.before.destination.thoughts=members.size+(human?.state.thoughts.length||0);p.before.authority.sequence=sequence;p.before.authority.revision=revision;
  p.expected.history=p.expected.history.map((row,i)=>({...row,sequence:(revision?.value||0)+i+1,listKey:[row.entityKey,(revision?.value||0)+i+1],documentList:[row.documentId,(revision?.value||0)+i+1]}));
  sequence={id:'thought-sequence',value:Math.max(sequence?.value||0,p.expected.entry.updatedSequence)};revision={id:'revision-sequence',value:p.expected.history.at(-1).sequence};
  p.wireDigest=await digest(operation.value.payload);retained+=bytes({before:p.before,payload:p.payload,expected:p.expected}).length;if(retained>limit)fail('BNS_SAVED_WORK_LIMIT');members.set(operation.entityId,member);
 }
 const mappingRows=new Map();for(const row of human?.mappings||[]){const id=protocolPhysicalId(core.prefix,core.fixedNamespace,'humanMapping',[row.id]);mappingRows.set(id,{...row.after,id});}
 const protocol=[...savedGroupProtocolIntent(core,plan),...mappingRows.entries(),...stageRows.map(row=>[row.id,row])],active={id:core.prefix+'active',namespace:state.replayId,manifestId:state.manifestId,graphDigest:plan.digest},terminal={...clone(state),phase:'activated'};
 retained+=bytes({state,protocol,plan,human}).length;if(retained>limit)fail('BNS_SAVED_WORK_LIMIT');
 for(const member of members.values())plans.get(member).group={plan,stage,state,active,terminal,entryCount:members.size+(human?.state.thoughts.length||0),finalSequence:sequence.value,finalRevision:revision.value};
 const search=human?.search||[];
 const cap=Object.freeze({});groups.set(cap,{store,core,plan,stage,state,active,terminal,protocol,human,search,members,start:startedAt,next:0,applied:new Set()});return cap;
}
export async function applySavedWorkGroupStep(t,cap,id){
 const g=groups.get(cap);if(!g)fail('BNS_SAVED_WORK_CAPABILITY');requireOriginalGroupCheckpointPlan(g.core,g.plan);
 const group=g.plan.groups.find(row=>row.id===id);if(!group||!['savedWorkBootstrap','savedWorkSuccessor'].includes(group.type)||g.applied.has(id))fail('BNS_SAVED_WORK_CAPABILITY');const operation=group.operations[0],member=g.members.get(operation.entityId),p=plans.get(member);if(!p)fail('BNS_SAVED_WORK_CAPABILITY');
 if(!equal(await g.stage.get(t,'restore'),g.state))fail('BNS_RESTORE_STAGE_CHANGED');
 // Canonical retained history is imported once per entity. Immutable typed
 // operations still receive their own original receipts and exact ancestry.
 if(group.type==='savedWorkBootstrap'){if([...g.members.keys()][g.next]!==operation.entityId)fail('BNS_SAVED_WORK_CAPABILITY');await p.store.applySavedWorkBootstrapInTransaction(t,member);g.next++;}
 if(p.transaction!==t)fail('BNS_SAVED_WORK_CAPABILITY');
 protocolApplications.set(t,{core:p.core,operation,origin:'remote'});try{const result=await p.core.applyInTransaction(t,operation,{origin:'remote',materialize:false});if(result.state!=='applied')fail('BNS_SAVED_WORK_OPERATION');}finally{protocolApplications.delete(t);}g.applied.add(id);
}
export async function sealSavedWorkGroupActivation(t,cap){
 if(cap===null)return;const g=groups.get(cap);if(!g||g.next!==g.members.size||g.applied.size!==g.plan.groups.filter(row=>['savedWorkBootstrap','savedWorkSuccessor'].includes(row.type)).length||[...g.members.values()].some(member=>plans.get(member).transaction!==t))fail('BNS_SAVED_WORK_CAPABILITY');
 if(!equal(await g.stage.get(t,'restore'),g.terminal)||!equal(await t.get('meta',g.core.prefix+'active'),g.active))fail('BNS_RESTORE_STAGE_CHANGED');
 await sealSavedProtocol(t,g.core,g.protocol,g.start);
 const stagePrefix=protocolPhysicalId(g.stage.prefix,g.stage.fixedNamespace,'groupItem',[]),replayPrefix=g.core.prefix+'generation:'+g.core.fixedNamespace+':',stageRange=IDBKeyRange.bound(stagePrefix,stagePrefix+'\uffff'),replayRange=IDBKeyRange.bound(replayPrefix,replayPrefix+'\uffff'),replayCount=g.protocol.filter(([id,row])=>row&&id.startsWith(replayPrefix)).length+g.members.size+1;
 registerRepositoryFinalReadFence(g.store.repository,t,{isCurrent:()=>{if(Date.now()-g.start>30000)fail('BNS_SAVED_WORK_LIMIT');return true;},plan:function*(){
  if(g.human){
   // Original Human plans supplied these expectations before either owner ran.
   // Both partitions retain exact rows; whole-table counts close extra writes.
   for(const row of g.search)if(!equal((yield {method:'get',table:'libraryMigrationItems',key:row.id})??null,row))fail('BNS_SAVED_WORK_CHANGED');
   if((yield {method:'count',table:'libraryMigrationItems'})!==g.search.length)fail('BNS_SAVED_WORK_CHANGED');
   for(const table of ['thoughts','revisions','operationReceipts','topics','sections','placements','thoughtSuppressions','provenance','dependencies']){
    const rows=g.human.state[table];for(const row of rows)if(!equal((yield {method:'get',table,key:row.id})??null,row))fail('BNS_SAVED_WORK_CHANGED');
    const extra=table==='thoughts'||table==='provenance'||table==='dependencies'?g.members.size:table==='revisions'?1+[...g.members.values()].reduce((n,cap)=>n+plans.get(cap).expected.history.length,0):0;
    if((yield {method:'count',table})!==rows.length+extra)fail('BNS_SAVED_WORK_CHANGED');
   }
  }
  if((yield {method:'count',table:'meta',key:stageRange})!==g.state.received||(yield {method:'count',table:'meta',key:replayRange})!==replayCount)fail('BNS_RESTORE_STAGE_CHANGED');return true;
 }});
}

// Keyed scope proof uses the original Source plan and original evidence/key
// derivation. The portable aggregate never supplies a local authority token.
const savedScopes=new WeakMap();
export async function prepareSavedWorkScope(store,core,scope,plan){
 requireOriginalGroupCheckpointPlan(core,plan);binding(store,core);const saved=plan.groups.filter(g=>g.type==='savedWorkBootstrap');if(!saved.length)return;
 const source=initialSourcePlan(plan.groups.find(g=>g.type==='sourceBootstrapCommit').capability),{secret,epoch}=await core.transaction(false,async t=>({secret:(await t.get('meta','thought-suppression-key'))?.value,epoch:(await t.get('meta','thought-epoch'))?.value||0})),members=[],ids=new Set(),histories=new Set(),provenance=new Set();let retained=0;
 for(const group of saved){const chain=savedPlanOperations(core,plan,group.operations[0].entityId),last=chain.at(-1),payload=last.type==='savedWorkSuccessor'?last.value.after:group.operations[0].value.payload,b=source.input,wire=payload.link.evidence;
  const evidence=[await planEvidenceProjection({inputId:b.id,contentRevision:source.inputState.contentRevision,body:b.libraryText??source.source.originalText,note:b.note||'',sourceRecordIds:[source.source.id],identities:[source.source.sourceKey]},{role:'primary',selectedFields:wire.selectedFields},secret,epoch)];
  if(!equal(portableSourceLinkedEvidence(evidence),wire))fail('BNS_SOURCE_LINKED_EVIDENCE_CHANGED');const expected=await deriveSavedPlan(core,plan,payload,evidence,secret);
  if(ids.has(expected.entry.id)||provenance.has(expected.provenance.id))bad();ids.add(expected.entry.id);provenance.add(expected.provenance.id);for(const row of expected.history){if(histories.has(row.id)||row.id===source.baselineRevision.id)bad();histories.add(row.id);}
  retained+=bytes({expected,evidence}).length;if(retained>limit)fail('BNS_SAVED_WORK_LIMIT');members.push({evidence,expected,revisionId:last.revisionId});
 }savedScopes.set(scope,{store,core,plan,secret,epoch,members});
}
const normalizedSavedHistory=rows=>rows.map(row=>({...row,sequence:0,listKey:[row.entityKey,0],documentList:[row.documentId,0]}));
export async function requireSavedWorkScope(store,t,scope){
 const p=savedScopes.get(scope);if(!p||p.store!==store)fail('BNS_SAVED_WORK_CAPABILITY');requireOriginalGroupCheckpointPlan(p.core,p.plan);requireRepositoryTransactionScope(store.repository,t);
 if(!equal((await t.get('meta','thought-suppression-key'))?.value,p.secret)||((await t.get('meta','thought-epoch'))?.value||0)!==p.epoch)fail('BNS_SAVED_WORK_CHANGED');
 const human=originalHumanSavedScopePartition(scope,store),humanIds=new Set(human?.entries.map(r=>r.id)||[]);
 const sequence=(await t.get('meta','thought-sequence'))?.value;if(!Number.isSafeInteger(sequence)||await t.count('thoughts')!==p.members.length+humanIds.size||await t.count('provenance')!==p.members.length||await t.count('dependencies')!==p.members.length||await t.count('thoughtSuppressions')||await t.count('placements')||await t.count('librarySearchTerms'))fail('BNS_GROUP_CANONICAL_UNREPRESENTED');
 for(const member of p.members){await checkEvidenceInTransaction(store,t,member.evidence);const e=member.expected,rows=await ownedRows(t,e.entry.id),expected={entry:e.entry,history:e.history,provenance:[e.provenance],dependencies:[e.dependency],placements:0,suppressions:0};
  requireSavedPhysical(await p.core.get(t,'savedPhysical',e.entry.id)??null,member.revisionId,rows,expected);rows.entry=savedSemanticEntry(rows.entry);expected.entry=savedSemanticEntry(expected.entry);
  rows.history=normalizedSavedHistory(rows.history);expected.history=normalizedSavedHistory(expected.history);if(sequence<e.entry.updatedSequence||!equal(rows,expected))fail('BNS_GROUP_CANONICAL_UNREPRESENTED');
 }
 for(const row of await readGroupRows(t,'libraryMigrationItems')){if(humanIds.has(row.ownerId))continue;const e=p.members.find(member=>member.expected.entry.id===row.ownerId)?.expected.entry;if(!e||!equal(row,{id:JSON.stringify(['search','entry',e.id]),entityKind:'search',statusKey:0,ownerKind:'entry',ownerId:e.id,version:ownerVersion('entry',e),phase:'delete',offset:0,sourceRecordIds:e.sourceRecordIds??[]}))fail('BNS_GROUP_CANONICAL_UNREPRESENTED');}
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

// Saved successors use the original human editing owner, but a distinct typed
// wire profile. The ordinary user-created Human codec is never broadened to AI.
const savedEdits=new WeakMap();
export async function prepareSavedWorkEdit(store,core,input){return prepareSavedEdit(store,core,input,null);}
export async function prepareSavedWorkReceive(store,core,input){
 bounded(input);const operation=clone(input);await validateFrozenOperation(operation);if(operation.type!=='savedWorkSuccessor'||operation.datasetId!==core.datasetId)fail('BNS_SAVED_WORK_OPERATION');return prepareSavedEdit(store,core,operation.value.request,operation);
}
async function prepareSavedEdit(store,core,input,incoming){
 binding(store,core);const request=savedEditRequest(input),requestDigest=await hashText(JSON.stringify(request));
 const retry=await core.transaction(false,async t=>({marker:await core.get(t,'savedEditReceipt',request.operationId),domain:await t.get('operationReceipts',request.operationId)}));
 if(retry.marker){if(incoming&&retry.marker.revisionId!==incoming.revisionId)fail('BNS_SAVED_WORK_COLLISION');const original=await core.read('revision',retry.marker.revisionId),op=original?.operation,receipt=await core.read('receipt',retry.marker.protocolOperationId);if(original?.redacted||op?.type!=='savedWorkSuccessor'||op.operationId!==retry.marker.protocolOperationId||!equal(savedEditRequest(op.value.request),request)||retry.marker.requestDigest!==requestDigest||retry.domain?.digest!==requestDigest||!equal(retry.marker.result,retry.domain?.result)||!receipt||!equal(receipt,{id:receipt.id,digest:op.revisionId,deviceId:op.deviceId,sequence:op.sequence}))fail('BNS_SAVED_WORK_COLLISION');return {duplicate:true,result:clone(retry.marker.result)};}
 if(retry.domain)fail('BNS_SAVED_WORK_COLLISION');
 const start=Date.now(),anchorHead=await core.read('head','savedWorkBootstrap',request.id),head=await core.read('head','savedWorkSuccessor',request.id);
 if(anchorHead?.purged||anchorHead?.revisions?.length!==1||head&&(head.purged||head.revisions.length!==1))fail('BNS_SAVED_WORK_CHANGED');
 const anchor=await core.read('revision',anchorHead.revisions[0]),chain=[],seen=new Set();let revision=head?.revisions[0],retainedChain=bytes(anchor).length;
 while(revision){if(seen.has(revision)||chain.length>=128||Date.now()-start>30000)fail('BNS_SAVED_WORK_LIMIT');seen.add(revision);const row=await core.read('revision',revision);if(!row||row.redacted||row.operation?.type!=='savedWorkSuccessor'||row.operation.revisionId!==revision||row.operation.parents.length>1)bad();retainedChain+=bytes(row).length;if(retainedChain>limit)fail('BNS_SAVED_WORK_LIMIT');chain.unshift(row);revision=row.operation.parents[0];}
 const ancestry=[anchor,...chain];for(const row of ancestry){if(!row||row.redacted)bad();await validateFrozenOperation(row.operation);}
 const lineage=await core.transaction(false,async t=>{
  const result=[anchorHead,...(head?[head]:[])];
  for(const row of ancestry){const op=row.operation;for(const [kind,ids,value]of [['receipt',[op.operationId],{digest:op.revisionId,deviceId:op.deviceId,sequence:op.sequence}],['sequence',[op.deviceId,String(op.sequence).padStart(16,'0')],{operationId:op.operationId,digest:op.revisionId}],['entityRevision',[op.type,op.entityId,op.revisionId],{revisionId:op.revisionId}]]){const actual=await core.get(t,kind,...ids);if(!actual||!equal(actual,{id:actual.id,...value}))fail('BNS_SAVED_WORK_CHANGED');result.push(actual);}}
  return result;
 });
 const previous=chain.at(-1)??anchor;if(incoming&&(incoming.value.anchor!==anchor.operation.revisionId||!equal(incoming.parents,head?.revisions??[])))fail('BNS_SAVED_WORK_CONFLICT');const canonical=await core.transaction(false,async t=>({authority:await authority(store,core,t),rows:await ownedRows(t,request.id)}));
 const link=anchor.operation.value.payload.link,evidenceForChain=await restoreSourceLinkedEvidence(store,link.evidence),derived=await deriveSavedChain(ancestry.map(row=>row.operation),evidenceForChain,canonical.authority.secret),r=canonical.rows;
 const expected={entry:derived.expected.entry,history:derived.expected.history,provenance:[derived.expected.provenance],dependencies:[derived.expected.dependency],placements:0,suppressions:0};
 const mapping=await core.read('savedPhysical',request.id)??null;requireSavedPhysical(mapping,previous.operation.revisionId,r,expected);
 if(!equal({...r,entry:savedSemanticEntry(r.entry),history:normalizedSavedHistory(r.history)},{...expected,entry:savedSemanticEntry(expected.entry),history:normalizedSavedHistory(expected.history)}))fail('BNS_SAVED_WORK_CHANGED');
 const payload=bounded({...clone(derived.payload),entry:portableEntry(r.entry),history:r.history});
 if(incoming&&!equal(normalizeSavedPayload(payload),normalizeSavedPayload(incoming.value.before)))fail('BNS_SAVED_WORK_CONFLICT');
 const entry=await humanPlanEntry(store,core);if(incoming)bindHumanReplayEntry(entry,incoming.value.events,incoming.value.allocation);const owner=await prepareSavedEntryEditPlan(store,core,request,entry);if(owner.conflict)return owner;if(owner.duplicate)fail('BNS_SAVED_WORK_COLLISION');
 const view=humanEntryEditPlan(owner),after={...clone(payload),entry:portableEntry(view.entry),history:clone(view.history)},events=view.events,allocation={domainCount:events.filter(e=>e.role==='domain').length,indexGenerationCount:events.filter(e=>e.role==='index-generation').length};
 const value={id:request.id,version:1,anchor:anchor.operation.revisionId,before:payload,after,request,events,allocation,sequenceBefore:entry.sequence?.value||0,revisionBefore:entry.revision?.value||0};await validateSavedSuccessor(value);
 if(incoming&&!equal(normalizeSavedPayload(after),normalizeSavedPayload(incoming.value.after)))fail('BNS_SAVED_WORK_CHANGED');
 const prepared=incoming?{operations:[incoming]}:await core.prepare([{type:'savedWorkSuccessor',expectedParents:head?.revisions||[],value}],{actor:'user'}),before=await core.transaction(false,async t=>({authority:await authority(store,core,t),rows:await ownedRows(t,request.id),source:await sourceProof(core,t,payload.link)}));
 if(!equal(before.rows.entry, {...payload.entry,exactSignature:before.rows.entry.exactSignature})||!equal(before.rows.history,payload.history)||!equal(before.authority.sequence,entry.sequence)||!equal(before.authority.revision,entry.revision))fail('BNS_SAVED_WORK_CHANGED');
 const evidence=await restoreSourceLinkedEvidence(store,payload.link.evidence);let retained=bytes({value,before,prepared,view,ancestry,lineage}).length;
 const current=()=>{if(Date.now()-start>30000||retained>limit)fail('BNS_SAVED_WORK_LIMIT');};current();
 const facts=await core.transaction(false,t=>captureTopicFormationTerminal(store,t,evidence,{current,retain:x=>{retained+=bytes(x).length;current();return clone(x);}}));
 const outgoing=incoming?await core.transaction(false,async t=>{const prefix=await core.idIn(t,'outbox');return {prefix,rows:await readGroupRows(t,'meta',{prefix})};}):null,outbox=outgoing?.rows??null,outboxPrefix=outgoing?.prefix??null;retained+=bytes(outbox).length;current();
 const cap=Object.freeze({});savedEdits.set(cap,{store,core,owner,view,prepared,before,evidence,facts,start,request,requestDigest,anchor,previous,ancestry,lineage,incoming,mapping,outbox,outboxPrefix});return cap;
}
export async function commitSavedWorkEdit(t,cap,store){
 const p=savedEdits.get(cap);if(!p||p.store!==store)fail('BNS_SAVED_WORK_CAPABILITY');const {core,before,view,request}=p;
 requireRepositoryTransactionScope(store.repository,t);requireRepositoryTransactionDataMethods(store.repository,t);
 const now=await authority(store,core,t);if(Date.now()-p.start>30000||!equal(before,{authority:now,rows:await ownedRows(t,request.id),source:await sourceProof(core,t,p.prepared.operations[0].value.before.link)}))fail('BNS_SAVED_WORK_CHANGED');await checkEvidenceInTransaction(store,t,p.evidence);
 for(const fact of p.facts)if(!equal(fact.project(await t.get(fact.table,fact.key),()=>{}),fact.expected))fail('BNS_SAVED_WORK_CHANGED');
 for(const original of p.lineage)if(!equal(await t.get('meta',original.id),original))fail('BNS_SAVED_WORK_CHANGED');
 for(const original of p.ancestry)if(!equal(await core.get(t,'revision',original.operation.revisionId),original))fail('BNS_SAVED_WORK_CHANGED');
 if(p.outbox&&!equal(await readGroupRows(t,'meta',{prefix:p.outboxPrefix}),p.outbox))fail('BNS_SAVED_WORK_CHANGED');
 if(!equal(await core.get(t,'savedPhysical',request.id)??null,p.mapping))fail('BNS_SAVED_WORK_CHANGED');
 const operation=p.prepared.operations[0],intent=await savedProtocolIntent(t,core,operation,!p.incoming);if(p.incoming){const key=await core.idIn(t,'outbox',operation.operationId);if(await t.get('meta',key))fail('BNS_SAVED_WORK_COLLISION');intent.push([key,null]);}
 const result=await executeHumanPlanInTransaction(t,p.owner);
 protocolApplications.set(t,{core,operation,origin:p.incoming?'remote':'local'});try{if(p.incoming){const applied=await core.applyInTransaction(t,operation,{origin:'remote',materialize:false});if(applied.state!=='applied')fail('BNS_SAVED_WORK_OPERATION');}else await core.commitPrepared(t,p.prepared,{materialize:false});}finally{protocolApplications.delete(t);}
 const marker={version:1,requestDigest:p.requestDigest,result:clone(result),protocolOperationId:operation.operationId,revisionId:operation.revisionId},key=await core.idIn(t,'savedEditReceipt',request.operationId);if(await t.get('meta',key))fail('BNS_SAVED_WORK_COLLISION');await core.put(t,'savedEditReceipt',[request.operationId],marker);
 const physical={version:1,revisionId:operation.revisionId,wire:savedPhysical(operation.value.after),local:savedPhysical({entry:view.entry,history:view.history})},physicalKey=await core.idIn(t,'savedPhysical',request.id);await core.put(t,'savedPhysical',[request.id],physical);
 const points=[...(p.outbox??[]).map(row=>['meta',row.id,row]),['meta',physicalKey,{id:physicalKey,...physical}],...before.source.rows.map(row=>['meta',row.id,row]),...before.authority.roots.map(([id,row])=>['meta',id,row]),...new Map([...p.ancestry,...p.lineage].map(row=>[row.id,row])).values()].map(x=>Array.isArray(x)?x:['meta',x.id,x]);
 const previousSuccessorHead=p.lineage.find(row=>row.type==='savedWorkSuccessor'&&Array.isArray(row.revisions));if(previousSuccessorHead){const index=points.findIndex(([table,id])=>table==='meta'&&id===previousSuccessorHead.id);points.splice(index,1);}
 points.push(['meta',key,{...marker,id:key}],['meta','thought-sequence',{id:'thought-sequence',value:view.operationReceipt.operationSequence}],['meta','revision-sequence',{id:'revision-sequence',value:view.revisionSequence}],['meta','backup-data-generation',{id:'backup-data-generation',value:before.authority.generation+1}],['thoughts',view.entry.id,view.entry],['operationReceipts',request.operationId,view.operationReceipt],...before.rows.provenance.map(row=>['provenance',row.id,row]),...before.rows.dependencies.map(row=>['dependencies',row.id,row]),...view.history.map(row=>['revisions',row.id,row]),...before.rows.history.filter(row=>!view.history.some(current=>current.id===row.id)).map(row=>['revisions',row.id,null]));
 const current=()=>{if(Date.now()-p.start>30000)fail('BNS_SAVED_WORK_LIMIT');assertOriginalControlSettingsFacts(store,now.control);return true;};
 registerRepositoryFinalReadFence(store.repository,t,{isCurrent:current,plan:function*(){
  if(p.outbox){const prefix=p.outboxPrefix;if((yield {method:'count',table:'meta',key:IDBKeyRange.bound(prefix,prefix+'\uffff')})!==p.outbox.length)fail('BNS_SAVED_WORK_CHANGED');}
  for(const fact of p.facts)if(!equal(fact.project(yield {method:'get',table:fact.table,key:fact.key},current),fact.expected))fail('BNS_SAVED_WORK_CHANGED');
  for(const [table,key,row]of points)if(!equal((yield {method:'get',table,key})??null,row))fail('BNS_SAVED_WORK_CHANGED');
  for(const [table,index,key,n]of [['revisions','byList',prefix(['library_entry:'+request.id]),view.history.length],['provenance','byOwner',prefix(['entry',request.id]),1],['dependencies','byTarget',prefix(['entry',request.id]),1],['placements','byEntry',prefix([request.id]),0],['thoughtSuppressions','byEntry',request.id,0],['thoughtSuppressions','byScope',p.evidence[0].scopeToken,0],['thoughtSuppressions','byExact',view.entry.exactSignature,0]])if((yield {method:'count',table,index,key})!==n)fail('BNS_SAVED_WORK_CHANGED');return true;
 }});await sealSavedProtocol(t,core,intent,p.start);return result;
}

function savedSemanticEntry(entry){const row=clone(entry);if(row){delete row.updatedSequence;delete row.negativeUpdatedSequence;}return row;}
function savedPhysical(payload){return {updatedSequence:payload.entry.updatedSequence,negativeUpdatedSequence:payload.entry.negativeUpdatedSequence,history:payload.history.map(row=>({id:row.id,sequence:row.sequence,listKey:clone(row.listKey),documentList:clone(row.documentList)}))};}
function requireSavedPhysical(mapping,revisionId,actual,wire){
 if(mapping){if(!equal(mapping,{id:mapping.id,version:1,revisionId,wire:savedPhysical(wire),local:savedPhysical(actual)}))fail('BNS_SAVED_WORK_CHANGED');}
 else if(actual.entry?.updatedSequence!==wire.entry?.updatedSequence||actual.entry?.negativeUpdatedSequence!==wire.entry?.negativeUpdatedSequence)fail('BNS_SAVED_WORK_CHANGED');
}

// Final closure for an existing populated saved cut after a checked incremental
// transition. The private Scope derives every semantic row; raw local physical
// allocation is accepted only through that exact saved mapping.
export async function sealSavedWorkCurrentScope(store,core,t,scope){
 const p=savedScopes.get(scope);if(!p||p.store!==store||p.core!==core)fail('BNS_SAVED_WORK_CAPABILITY');await requireSavedWorkScope(store,t,scope);const database=store.repository.db,started=Date.now(),points=[],counts=[];let retained=0;
 for(const member of p.members){const id=member.expected.entry.id,r=await ownedRows(t,id);for(const [table,rows]of [['thoughts',[r.entry]],['revisions',r.history],['provenance',r.provenance],['dependencies',r.dependencies]])for(const row of rows){retained+=bytes(row).length;if(retained>limit)fail('BNS_SAVED_WORK_LIMIT');points.push([table,row.id,clone(row)]);}const key=await core.idIn(t,'savedPhysical',id);points.push(['meta',key,await t.get('meta',key)??null]);counts.push(['revisions','byList',prefix(['library_entry:'+id]),r.history.length],['provenance','byOwner',prefix(['entry',id]),1],['dependencies','byTarget',prefix(['entry',id]),1]);}
 const current=()=>{if(store.repository!==core.repository||store.repository.db!==database||Date.now()-started>=30000)fail('BNS_SAVED_WORK_LIMIT');return true;},facts=await captureTopicFormationTerminal(store,t,p.members.flatMap(m=>m.evidence),{current,retain:value=>{retained+=bytes(value).length;if(retained>limit)fail('BNS_SAVED_WORK_LIMIT');return clone(value);}});
 counts.push(['placements',null,null,0],['thoughtSuppressions',null,null,0],['librarySearchTerms',null,null,0],['thoughts',null,null,p.members.length],['provenance',null,null,p.members.length],['dependencies',null,null,p.members.length]);registerRepositoryFinalReadFence(store.repository,t,{isCurrent:()=>store.repository===core.repository&&store.repository.db===database&&Date.now()-started<30000,plan:function*(){for(const fact of facts)if(!equal(fact.project(yield {method:'get',table:fact.table,key:fact.key},current),fact.expected))fail('BNS_SAVED_WORK_CHANGED');for(const [table,key,row]of points)if(!equal((yield {method:'get',table,key})??null,row))fail('BNS_SAVED_WORK_CHANGED');for(const [table,index,key,n]of counts)if((yield {method:'count',table,...(index?{index,key}:{})})!==n)fail('BNS_SAVED_WORK_CHANGED');return true;}});
}
// Existing saved-step progress uses the repository's private work meter. The
// legacy manual helper uses public lifetime diagnostics, not a step budget.
export async function sealSavedWorkMergeProgress(store,core,t,stage,started,intents=[]){
 requireRepositoryTransactionScope(store.repository,t);const database=store.repository.db,points=[],counts=[],namespaces=[core.prefix+'generation:'+await core.bind(t)+':',stage.prefix+'generation:'+stage.fixedNamespace+':'];let retained=0;
 const current=()=>{if(store.repository!==core.repository||store.repository.db!==database||performance.now()-started>=30000)fail('BNS_GROUP_RESOURCE_LIMIT');return true;};
 for(const prefix of namespaces){const existing=await readGroupRows(t,'meta',{prefix}),map=new Map(existing.map(row=>[row.id,row]));for(const row of intents)if(row.id.startsWith(prefix))map.set(row.id,clone(row));const rows=[...map.values()];counts.push([prefix,rows.length]);for(const row of rows){retained+=bytes(row).length;if(retained>limit)fail('BNS_GROUP_RESOURCE_LIMIT');points.push([row.id,clone(row)]);}}
 for(const id of ['migration','gate','thought-library','recovery-restore-epoch','thought-epoch','thought-suppression-key','thought-sequence','revision-sequence',CONTROL_PUBLICATION_REVISION,CONTROL_PUBLICATION_RESERVATION,core.prefix+'active','backup-data-generation']){let row=await t.get('meta',id)??null;if(id==='backup-data-generation'&&t.backupChanged){if(!row)fail('BNS_SAVED_WORK_CHANGED');row={...row,value:row.value+1};}points.push([id,clone(row)]);}
 current();registerRepositoryFinalReadFence(store.repository,t,{isCurrent:current,plan:function*(){for(const [id,row]of points)if(!equal((yield {method:'get',table:'meta',key:id})??null,row))fail('BNS_RESTORE_LOCAL_CHANGED');for(const [prefix,n]of counts)if((yield {method:'count',table:'meta',key:IDBKeyRange.bound(prefix,prefix+'\uffff')})!==n)fail('BNS_RESTORE_LOCAL_CHANGED');return true;}});
}

// Readonly partition IDs bound to this exact original Scope and Saved plan.
// The consuming Saved proof still checks every selected row and total counts.
export function originalSavedHumanScopePartition(scope,store){
 const p=savedScopes.get(scope);if(!p)return null;if(p.store!==store)fail('BNS_SAVED_WORK_CAPABILITY');requireOriginalGroupCheckpointPlan(p.core,p.plan);
 return {entries:p.members.map(m=>m.expected.entry.id),provenance:p.members.map(m=>m.expected.provenance.id),dependencies:p.members.map(m=>m.expected.dependency.id)};
}

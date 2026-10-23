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
const plans=new WeakMap(),limit=2*1024*1024;
const bad=()=>fail('BNS_SAVED_WORK_UNSUPPORTED');
function binding(store,core){requireOriginalLibraryDocumentsStore(store);if(store.repository!==core.repository)fail('BNS_SAVED_WORK_BINDING');}
async function page(t,name,index,key,max){const p=await t.rangePage(name,index,prefix(key),null,max+1);if(p.next||p.rows.length>max)bad();return p.rows.map(x=>x.value);}
async function ownedRows(t,id){return {entry:await t.get('thoughts',id)??null,history:await page(t,'revisions','byList',['library_entry:'+id],128),provenance:await page(t,'provenance','byOwner',['entry',id],1),dependencies:await page(t,'dependencies','byTarget',['entry',id],1),placements:await t.count('placements','byEntry',prefix([id])),suppressions:await t.count('thoughtSuppressions','byEntry',id)};}
async function authority(store,core,t){
 const c=await store.control(t);if(c.settings.enabled!==true||c.settings.consentVersion!==CONSENT_VERSION)fail('BNS_SAVED_WORK_PERMISSION');
 const library=await t.get('meta','thought-library');if(library?.sealed)bad();
 return {control:readOriginalControlSettings(store,t),roots:await Promise.all(['recovery-restore-epoch','thought-epoch','smart-filter',core.prefix+'active'].map(async id=>[id,await t.get('meta',id)??null])),fence:await new JournalRestoreFence(core).snapshot(t),settings:c.settings,library,generation:(await t.get('meta','backup-data-generation'))?.value||0,sequence:await t.get('meta','thought-sequence')??null,revision:await t.get('meta','revision-sequence')??null,epoch:(await t.get('meta','thought-epoch'))?.value||0,secret:(await t.get('meta','thought-suppression-key'))?.value};
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
 if(p.duplicate)return {duplicate:true,id:p.payload.entry.id};p.transaction=t;await checkEvidenceInTransaction(store,t,p.evidence);
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
 const points=[...p.before.destination.source.rows.map(row=>['meta',row.id,row]),['meta',receiptKey,{id:receiptKey,version:1,digest:p.wireDigest}],['meta',markerKey,{id:markerKey,version:1,epoch:p.before.authority.fence.epoch}],...p.before.authority.roots.map(([id,row])=>['meta',id,row]),['meta','thought-sequence',{id:'thought-sequence',value:Math.max(p.before.authority.sequence?.value||0,p.expected.entry.updatedSequence)}],['meta','revision-sequence',{id:'revision-sequence',value:p.expected.history.at(-1).sequence}],['meta','backup-data-generation',{id:'backup-data-generation',value:p.before.authority.generation+1}],['thoughts',p.expected.entry.id,p.expected.entry],['provenance',p.expected.provenance.id,p.expected.provenance],['dependencies',p.expected.dependency.id,p.expected.dependency],...p.expected.history.map(h=>['revisions',h.id,h])];
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

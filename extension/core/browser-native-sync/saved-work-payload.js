import {planHumanEntryCreation,planHumanEntryFields,finishHumanEntryFields,planHumanEntryEvidence} from '../thought-store-owner.js';
import {ENTRY_FIELDS,entrySnapshot,validateFields,validateGenerator,keyedHash} from '../thought-model.js';
import {planJournalRevision} from '../thought-journal.js';
import {ownerVersion} from '../library-search.js';
import {validateSourceLinkedDescriptor} from './source-linked-evidence.js';
import {clone,equal,exact,count,identifier,bytes,fail} from './value.js';
const bad=()=>fail('BNS_SAVED_WORK_UNSUPPORTED');
const all=(v,keys)=>exact(v,keys)&&Object.keys(v).length===keys.length;
export const portableSavedEntry=row=>{const value=clone(row);delete value.exactSignature;return value;};
export function boundedSavedPayload(value){if(bytes(value).length>2*1024*1024)fail('BNS_SAVED_WORK_LIMIT');return value;}
export function validateSavedWorkEnvelope(value){
 if(!all(value,['id','version','payload'])||value.version!==1||!identifier(value.id)||value.id!==value.payload?.entry?.id)bad();const payload=value.payload;boundedSavedPayload(payload);
 if(!all(payload,['version','datasetId','entry','history','link','generator'])||payload.version!==1||!identifier(payload.datasetId)||!Array.isArray(payload.history)||payload.history.length!==2)bad();validateSourceLinkedDescriptor(payload.link);validateGenerator(payload.generator);return value;
}
export async function validateSavedWorkPayload(payload){
 validateSavedWorkEnvelope({id:payload?.entry?.id,version:1,payload});
 return deriveSavedWorkBootstrap(payload,[{...clone(payload.link.evidence),scopeToken:'0'.repeat(64),versionToken:'0'.repeat(64),epoch:0}],Array(32).fill(0));
}
function expectedHistory(data,row){
 if(!identifier(row.id)||!count(row.sequence)||row.sequence<1||!Number.isFinite(Date.parse(row.at)))bad();
 const p=planJournalRevision(data,null,row.at);return {...p.row,id:row.id,sequence:row.sequence,listKey:[p.entityKey,row.sequence],documentList:[p.row.documentId,row.sequence]};
}
export async function deriveSavedWorkBootstrap(payload,evidence,secret){
 boundedSavedPayload(payload);if(!all(payload,['version','datasetId','entry','history','link','generator'])||payload.version!==1||!identifier(payload.datasetId)||!Array.isArray(payload.history)||payload.history.length!==2)bad();validateSourceLinkedDescriptor(payload.link);const generator=validateGenerator(payload.generator),r=payload.entry,[baseline,edit]=payload.history;
 if(!r||r.id!==payload.link.id||r.origin!=='ai'||r.lifecycle!=='active'||r.revision!==1||r.formation!=='explicit'||r.bodyBinding!=='thought'||r.provenanceType!=='input_derived'||!count(r.createdSequence)||r.createdSequence<1||!count(r.updatedSequence)||r.updatedSequence<=r.createdSequence||!Number.isFinite(Date.parse(r.createdAt))||!Number.isFinite(Date.parse(r.updatedAt))||Date.parse(r.updatedAt)<Date.parse(r.createdAt)||r.createdAt!==payload.link.at||baseline.id===edit.id||baseline.sequence>=edit.sequence||baseline.operationId===edit.operationId||!identifier(baseline.operationId)||!identifier(edit.operationId))bad();
 const b=baseline.after;if(!b)bad();validateFields({title:b.title,body:b.body,note:b.note,type:b.type,formation:b.formation});if(!b.body.length||b.formation!=='explicit')bad();
 const request={operationId:baseline.operationId,actor:'ai',title:b.title,body:b.body,note:b.note,type:b.type,formation:b.formation},signature=await keyedHash(secret,['body',request.type,request.body]);
 const initial=planHumanEntryCreation(request,{id:r.id,at:r.createdAt,sequence:r.createdSequence,exactSignature:signature,evidence,nonContext:evidence});
 const first=expectedHistory({kind:'library_entry',entityId:r.id,before:entrySnapshot(initial),after:entrySnapshot(initial),fieldMask:ENTRY_FIELDS,actor:'ai',reason:'baseline',important:true,operationId:baseline.operationId,baseRevision:0,afterRevision:0,sourceRecordIds:initial.sourceRecordIds},baseline);
 if(!equal(first,baseline)||Date.parse(baseline.at)<Date.parse(r.createdAt)||!Array.isArray(edit.fieldMask)||!edit.fieldMask.length||new Set(edit.fieldMask).size!==edit.fieldMask.length||edit.fieldMask.some(k=>!ENTRY_FIELDS.includes(k)))bad();
 const changes=Object.fromEntries(edit.fieldMask.map(k=>[k,edit.after?.[k]]));validateFields(changes);
 const nextRequest={id:r.id,expectedRevision:0,operationId:edit.operationId,changes},p=planHumanEntryFields(initial,nextRequest,{at:r.updatedAt});if(!equal(p.fields,edit.fieldMask))bad();
 const next=finishHumanEntryFields(p.row,p.fields,{at:r.updatedAt,sequence:r.updatedSequence,exactSignature:await keyedHash(secret,['body',p.row.type,p.row.thoughtText])});next.searchVersion=ownerVersion('entry',next);
 const second=expectedHistory({kind:'library_entry',entityId:r.id,before:entrySnapshot(initial),after:entrySnapshot(next),fieldMask:p.fields,actor:'user',reason:'edit',important:false,operationId:edit.operationId,baseRevision:0,afterRevision:1,sourceRecordIds:next.sourceRecordIds},edit);
 if(!equal(second,edit)||Date.parse(edit.at)<Date.parse(r.updatedAt)||!equal(portableSavedEntry(next),r)||!p.fields.some(f=>next.protections[f].locked&&next.authorship[f].everHumanConfirmed))bad();
 const pair=planHumanEntryEvidence(request,evidence[0],{id:payload.link.provenanceId,generationId:payload.link.generationId,entryId:r.id,at:payload.link.at,generator});return {entry:next,history:clone(payload.history),...pair};
}


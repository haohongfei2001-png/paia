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
 if(!all(payload,['version','datasetId','entry','history','link','generator'])||payload.version!==1||!identifier(payload.datasetId)||!Array.isArray(payload.history)||payload.history.length<2||payload.history.length>128)bad();validateSourceLinkedDescriptor(payload.link);validateGenerator(payload.generator);return value;
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
 boundedSavedPayload(payload);if(!all(payload,['version','datasetId','entry','history','link','generator'])||payload.version!==1||!identifier(payload.datasetId)||!Array.isArray(payload.history)||payload.history.length<2||payload.history.length>128)bad();validateSourceLinkedDescriptor(payload.link);const generator=validateGenerator(payload.generator),r=payload.entry,[baseline]=payload.history,edits=payload.history.slice(1);
 if(!r||r.id!==payload.link.id||r.origin!=='ai'||r.lifecycle!=='active'||r.revision!==edits.length||r.formation!=='explicit'||r.bodyBinding!=='thought'||r.provenanceType!=='input_derived'||!count(r.createdSequence)||r.createdSequence<1||!count(r.updatedSequence)||r.updatedSequence<=r.createdSequence||!Number.isFinite(Date.parse(r.createdAt))||!Number.isFinite(Date.parse(r.updatedAt))||Date.parse(r.updatedAt)<Date.parse(r.createdAt)||r.createdAt!==payload.link.at||r.updatedSequence<r.createdSequence+edits.length||!identifier(baseline.operationId))bad();
 const b=baseline.after;if(!b)bad();validateFields({title:b.title,body:b.body,note:b.note,type:b.type,formation:b.formation});if(!b.body.length||b.formation!=='explicit')bad();
 const request={operationId:baseline.operationId,actor:'ai',title:b.title,body:b.body,note:b.note,type:b.type,formation:b.formation},signature=await keyedHash(secret,['body',request.type,request.body]);
 const initial=planHumanEntryCreation(request,{id:r.id,at:r.createdAt,sequence:r.createdSequence,exactSignature:signature,evidence,nonContext:evidence});
 const first=expectedHistory({kind:'library_entry',entityId:r.id,before:entrySnapshot(initial),after:entrySnapshot(initial),fieldMask:ENTRY_FIELDS,actor:'ai',reason:'baseline',important:true,operationId:baseline.operationId,baseRevision:0,afterRevision:0,sourceRecordIds:initial.sourceRecordIds},baseline);
 if(!equal(first,baseline)||Date.parse(baseline.at)<Date.parse(r.createdAt))bad();
 const ids=new Set([baseline.id]),operations=new Set([baseline.operationId]);let next=initial,previous=baseline;
 for(let n=0;n<edits.length;n++){
  const edit=edits[n],last=n===edits.length-1;
  if(!identifier(edit.operationId)||ids.has(edit.id)||operations.has(edit.operationId)||previous.sequence>=edit.sequence||Date.parse(previous.at)>Date.parse(edit.at)||!Array.isArray(edit.fieldMask)||!edit.fieldMask.length||new Set(edit.fieldMask).size!==edit.fieldMask.length||edit.fieldMask.some(k=>!ENTRY_FIELDS.includes(k)))bad();
  ids.add(edit.id);operations.add(edit.operationId);
  const changes=Object.fromEntries(edit.fieldMask.map(k=>[k,edit.after?.[k]]));validateFields(changes);
  // Historical rows retain body authorship time, but do not retain every
  // intermediate non-body timestamp or thought sequence. For fields later
  // overwritten, journal.at is only an existence witness for this pure
  // validation step, never an invented durable operation or exported field.
  // A field's final retained authorship and the final Entry time stay exact.
  const retainedTimes=edit.fieldMask.filter(f=>r.authorship?.[f]?.operationId===edit.operationId).map(f=>r.authorship[f].at);
  const at=last?r.updatedAt:edit.fieldMask.includes('body')?edit.after?.bodyAuthorship?.at:retainedTimes[0]??edit.at;
  if(!Number.isFinite(Date.parse(at))||Date.parse(at)<Date.parse(previous.at)||Date.parse(at)>Date.parse(edit.at)||retainedTimes.some(time=>time!==at))bad();
  const before=next,p=planHumanEntryFields(before,{id:r.id,expectedRevision:n,operationId:edit.operationId,changes},{at});if(!equal(p.fields,edit.fieldMask))bad();
  next=finishHumanEntryFields(p.row,p.fields,{at,sequence:last?r.updatedSequence:r.createdSequence+n+1,exactSignature:await keyedHash(secret,['body',p.row.type,p.row.thoughtText])});next.searchVersion=ownerVersion('entry',next);
  const expected=expectedHistory({kind:'library_entry',entityId:r.id,before:entrySnapshot(before),after:entrySnapshot(next),fieldMask:p.fields,actor:'user',reason:'edit',important:false,operationId:edit.operationId,baseRevision:n,afterRevision:n+1,sourceRecordIds:next.sourceRecordIds},edit);
  if(!equal(expected,edit))bad();previous=edit;
 }
 if(!equal(portableSavedEntry(next),r)||!ENTRY_FIELDS.some(f=>next.protections[f].locked&&next.authorship[f].everHumanConfirmed))bad();
 const pair=planHumanEntryEvidence(request,evidence[0],{id:payload.link.provenanceId,generationId:payload.link.generationId,entryId:r.id,at:payload.link.at,generator});return {entry:next,history:clone(payload.history),...pair};
}


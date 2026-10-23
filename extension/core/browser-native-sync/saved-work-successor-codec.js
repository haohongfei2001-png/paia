import {revisionShouldPrune,REVISION_POLICY} from '../ia-store-owner.js';
import {validateSavedWorkEnvelope,portableSavedEntry} from './saved-work-payload.js';
import {planHumanEntryFields,finishHumanEntryFields} from '../thought-store-owner.js';
import {ENTRY_FIELDS,entrySnapshot,validateFields,keyedHash} from '../thought-model.js';
import {planJournalRevision} from '../thought-journal.js';
import {ownerVersion} from '../library-search.js';
import {validateHumanAllocationEvents} from './human-library-allocation.js';
import {clone,equal,exact,count,hash,bytes,fail} from './value.js';
const bad=()=>fail('BNS_SAVED_SUCCESSOR_INVALID');
const all=(v,keys)=>exact(v,keys)&&Object.keys(v).length===keys.length;
// Stable request construction is also used before the original domain receipt
// digest. Canonical transport property ordering cannot change retry identity.
export function savedEditRequest(input){
 if(!exact(input,['id','operationId','expectedRevision','changes','actor','expectedFieldRevisions'])||typeof input.id!=='string'||typeof input.operationId!=='string'||input.operationId.length<8||!count(input.expectedRevision)||input.actor!==undefined&&input.actor!=='user')bad();
 validateFields(input.changes);if(!Object.keys(input.changes).length)bad();
 const r={id:input.id,operationId:input.operationId,expectedRevision:input.expectedRevision,changes:Object.fromEntries(ENTRY_FIELDS.filter(k=>Object.hasOwn(input.changes,k)).map(k=>[k,input.changes[k]]))};
 if(input.actor!==undefined)r.actor=input.actor;
 if(input.expectedFieldRevisions!==undefined){if(!exact(input.expectedFieldRevisions,ENTRY_FIELDS))bad();r.expectedFieldRevisions=Object.fromEntries(ENTRY_FIELDS.filter(k=>Object.hasOwn(input.expectedFieldRevisions,k)).map(k=>{if(!count(input.expectedFieldRevisions[k]))bad();return [k,input.expectedFieldRevisions[k]];}));}
 return r;
}
export function normalizeSavedPayload(payload){const p=clone(payload);p.history=p.history.map(h=>({...h,sequence:0,listKey:[h.entityKey,0],documentList:[h.documentId,0]}));return p;}
export function validateSavedSuccessorEnvelope(v){
 if(bytes(v).length>2*1024*1024||!all(v,['id','version','anchor','before','after','request','events','allocation','sequenceBefore','revisionBefore'])||v.version!==1||!hash(v.anchor)||!count(v.sequenceBefore)||!count(v.revisionBefore))bad();
 validateSavedWorkEnvelope({id:v.id,version:1,payload:v.before});validateSavedWorkEnvelope({id:v.id,version:1,payload:v.after});savedEditRequest(v.request);validateHumanAllocationEvents(v.events,v.allocation);return v;
}
// Canonical wire JSON sorts keys. Restore only the original owner's known
// snapshot insertion order so its JSON-based coalescing predicate is stable.
const ordered=(v,keys)=>Object.fromEntries([...keys.filter(k=>Object.hasOwn(v,k)),...Object.keys(v).filter(k=>!keys.includes(k))].map(k=>[k,v[k]]));
function snapshotOrder(v){const r=ordered(clone(v),['bodyProtection','bodyAuthorship','hasHumanAction','userEdited','title','body','note','type','formation','lifecycle','bodyBinding','workingInputId','bindingRevision','bindingLength','thoughtEditedAt']);if(r.bodyProtection)r.bodyProtection=ordered(r.bodyProtection,['locked','reason','operationId','at']);if(r.bodyAuthorship)r.bodyAuthorship=ordered(r.bodyAuthorship,['actor','everHumanConfirmed','operationId','at']);return r;}
export const restoreSavedHistoryOrder=rows=>rows.map(h=>({...clone(h),before:snapshotOrder(h.before),after:snapshotOrder(h.after)}));
function restoreEntryOrder(v){const r=clone(v);for(const key of Object.keys(r.protections??{}))r.protections[key]=ordered(r.protections[key],['locked','reason','operationId','at']);for(const key of Object.keys(r.authorship??{}))r.authorship[key]=ordered(r.authorship[key],['actor','everHumanConfirmed','operationId','at']);return r;}
// This proves one exact original-owner transition. Authenticity of the first
// state belongs to the strict bootstrap plus the complete typed ancestry.
export async function deriveSavedSuccessor(v,secret=Array(32).fill(0)){
 validateSavedSuccessorEnvelope(v);const before={entry:{...restoreEntryOrder(v.before.entry),exactSignature:await keyedHash(secret,['body',v.before.entry.type,v.before.entry.thoughtText])}},r=savedEditRequest(v.request),events=v.events;
 if(r.id!==v.id||r.expectedRevision!==before.entry.revision||r.expectedFieldRevisions&&Object.keys(r.changes).some(k=>r.expectedFieldRevisions[k]!==before.entry.fieldRevisions[k])||v.sequenceBefore<before.entry.updatedSequence||v.revisionBefore<Math.max(...v.before.history.map(h=>h.sequence))||events.length<3||events[0].kind!=='clock'||events[1].kind!=='clock'||events.some(e=>e.role!=='domain')||events.filter(e=>e.kind==='clock').some((e,i,list)=>i&&Date.parse(e.value)<Date.parse(list[i-1].value)))bad();
 if(!equal(v.before.link,v.after.link)||!equal(v.before.generator,v.after.generator)||v.before.datasetId!==v.after.datasetId)bad();
 const fields=planHumanEntryFields(before.entry,r,{at:events[0].value});if(!fields.fields.length)bad();
 const row=finishHumanEntryFields(fields.row,fields.fields,{at:events[0].value,sequence:v.sequenceBefore+1,exactSignature:await keyedHash(secret,['body',fields.row.type,fields.row.thoughtText])});row.searchVersion=ownerVersion('entry',row);
 const data={kind:'library_entry',entityId:v.id,before:entrySnapshot(before.entry),after:entrySnapshot(row),fieldMask:fields.fields,actor:'user',reason:'edit',important:false,operationId:r.operationId,baseRevision:r.expectedRevision,afterRevision:row.revision,sourceRecordIds:row.sourceRecordIds},planned=planJournalRevision(data,restoreSavedHistoryOrder(v.before.history).at(-1),events[1].value),sequence=v.revisionBefore+1;
 let history;
 if(planned.coalesced){
  if(!equal(v.allocation,{domainCount:3,indexGenerationCount:0})||!equal(events.map(e=>e.kind),['clock','clock','clock']))bad();
  history=[...clone(v.before.history.slice(0,-1)),planned.row];
 }else{
  if(!equal(v.allocation,{domainCount:5,indexGenerationCount:0})||!equal(events.map(e=>e.kind),['clock','clock','uuid','clock','clock']))bad();
  history=[...clone(v.before.history),{...planned.row,id:events[2].value,sequence,listKey:[planned.entityKey,sequence],documentList:[planned.row.documentId,sequence]}];
  const cutoff=Date.parse(events[3].value)-REVISION_POLICY.days*86400000;let important=0;const retired=new Set();for(const h of [...history].reverse()){if(h.important)important++;if(revisionShouldPrune(h,cutoff,important))retired.add(h.id);}history=history.filter(h=>!retired.has(h.id));
 }
 if(!equal(portableSavedEntry(row),v.after.entry)||!equal(history,v.after.history))bad();return {entry:row,history:restoreSavedHistoryOrder(history)};
}
export async function validateSavedSuccessor(v){await deriveSavedSuccessor(v);return v;}

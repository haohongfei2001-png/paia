import {validateCapture} from '../validation.js';
import {ADAPTER_VERSION} from '../constants.js';
import {initialSourceObjects} from '../source-initial.js';
import {applySourceTime} from '../record-time.js';
import {identify} from '../dedupe.js';
import {validateBackupItem} from '../backup-format.js';
import {canonical,clone,exact,equal,identifier,hash,count,fail,plain} from './value.js';
export const SOURCE_BOOTSTRAP_TYPES=Object.freeze(['source','timeEvidence','inputDocument','input','inputState','baselineRevision']);
const fields='id platform chatId chatUrl chatTitle sourceMessageId pageOrder originalText contentHash sourceKey dedupeKey sourceSentAt timeSource timeConfidence conversationOrder capturedAt previousVersionId note editedText hidden deletedAt updatedAt timeCandidates'.split(' ');
const exactAll=(x,keys)=>exact(x,keys)&&Object.keys(x).length===keys.length;
const iso=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString()===x;
export function validateSourceBootstrapMember(value){
 if(!exactAll(value,['id','entityType','entity','logicalCommitId','datasetId','deviceId'])||!SOURCE_BOOTSTRAP_TYPES.includes(value.entityType)||![value.logicalCommitId,value.datasetId,value.deviceId].every(identifier)||!plain(value.entity)||value.id!==value.entityType+':'+value.entity.id)fail('BNS_SOURCE_BOOTSTRAP_INVALID');
 const x=value.entity;
 if(value.entityType==='source'){
  // This checks the existing capture DTO's identity/text limits, not authority.
  // Real consent and current restore/namespace fences remain in each owner.
  let capture;try{capture=validateCapture({adapterVersion:ADAPTER_VERSION,epoch:0,chat:{id:x.chatId,url:x.chatUrl,title:x.chatTitle},messages:[{sourceMessageId:x.sourceMessageId,pageOrder:x.pageOrder,originalText:x.originalText}]});}catch{fail('BNS_SOURCE_BOOTSTRAP_INVALID');}
  if(capture.chat.url!==x.chatUrl||capture.chat.title!==x.chatTitle)fail('BNS_SOURCE_BOOTSTRAP_INVALID');
  if(!exactAll(x,fields)||x.platform!=='chatgpt'||!['id','chatId','sourceMessageId'].every(k=>identifier(x[k]))||!['contentHash','sourceKey','dedupeKey'].every(k=>hash(x[k]))||typeof x.chatTitle!=='string'||typeof x.originalText!=='string'||!count(x.pageOrder)||x.pageOrder<1||x.conversationOrder!==x.pageOrder||!iso(x.capturedAt)||x.updatedAt!==x.capturedAt||x.previousVersionId!==null||x.note!==''||x.editedText!==''||x.hidden!==false||x.deletedAt!==null||!exactAll(x.timeCandidates,['dom','response','agreement'])||typeof x.timeCandidates.dom!=='boolean'||typeof x.timeCandidates.response!=='boolean'||!['unknown','single','agree','conflict'].includes(x.timeCandidates.agreement))fail('BNS_SOURCE_BOOTSTRAP_INVALID');
  validateBackupItem({type:'item',section:'sources',value:x,order:0});
 }else if(value.entityType==='timeEvidence'){
  if(!exactAll(x,['id','value'])||!hash(x.id))fail('BNS_SOURCE_BOOTSTRAP_INVALID');
  if(x.value!==null){const y=x.value;if(!exact(y,['blocked','createTime','candidates','domConflict'])||typeof y.blocked!=='boolean'||!(y.createTime===null||typeof y.createTime==='number'&&Number.isFinite(y.createTime))||!plain(y.candidates)||!exact(y.candidates,['chatgpt_dom','chatgpt_response_create_time'])||Object.hasOwn(y,'domConflict')&&typeof y.domConflict!=='boolean')fail('BNS_SOURCE_BOOTSTRAP_INVALID');
   for(const [key,c]of Object.entries(y.candidates))if(!exactAll(c,['source','timestamp','identity'])||c.source!==key||!iso(c.timestamp)||!exactAll(c.identity,['chatId','sourceMessageId'])||![c.identity.chatId,c.identity.sourceMessageId].every(identifier))fail('BNS_SOURCE_BOOTSTRAP_INVALID');
  }
 }else if(value.entityType==='inputDocument'){
  if(!exactAll(x,['id','source','working'])||x.source?.id!==x.id||x.working?.id!==x.id)fail('BNS_SOURCE_BOOTSTRAP_INVALID');validateBackupItem({type:'item',section:'inputDocuments',value:x.source,working:x.working,order:0});
 }else validateBackupItem({type:'item',section:({input:'inputs',inputState:'inputStates',baselineRevision:'revisions'})[value.entityType],value:x,order:0});
 return value;
}
export function validateSourceBootstrapCommit(v){
 if(!exactAll(v,['id','version','datasetId','deviceId','sourceId','sourceKey','documentId','inputId','baselineId','members'])||v.version!==1||![v.id,v.datasetId,v.deviceId,v.sourceId,v.documentId,v.inputId,v.baselineId].every(identifier)||!hash(v.sourceKey)||!Array.isArray(v.members)||v.members.length!==6)fail('BNS_SOURCE_BOOTSTRAP_INVALID');
 if(v.members.some(x=>!exactAll(x,['type','entityId','revisionId'])||x.type!=='sourceBootstrapMember'||!identifier(x.entityId)||!hash(x.revisionId))||new Set(v.members.map(x=>x.entityId)).size!==6)fail('BNS_SOURCE_BOOTSTRAP_INVALID');return v;
}
// Checks exact internal arbitration, not cryptographic provider authenticity.
export async function validateInitialSourceEntities(entities){
 if(!exactAll(entities,SOURCE_BOOTSTRAP_TYPES))fail('BNS_SOURCE_BOOTSTRAP_INVALID');
 const r=entities.source,ledger=entities.timeEvidence,doc=entities.inputDocument,b=entities.input,m=entities.inputState,h=entities.baselineRevision;
 for(const type of SOURCE_BOOTSTRAP_TYPES)validateSourceBootstrapMember({id:type+':'+entities[type].id,entityType:type,entity:entities[type],logicalCommitId:'validation',datasetId:'validation',deviceId:'validation'});
 const expected=await identify(r.chatId,r.sourceMessageId,r.originalText);if(!equal(expected,{contentHash:r.contentHash,sourceKey:r.sourceKey,dedupeKey:r.dedupeKey}))fail('BNS_SOURCE_DIGEST');
 if(ledger.id!==r.sourceKey)fail('BNS_SOURCE_BOOTSTRAP_INVALID');
 const time=ledger.value,response=time?.candidates.chatgpt_response_create_time;
 if(time&&(time.domConflict===true||time.blocked&&response||time.blocked&&time.createTime!==null||!response&&time.createTime!==null||response&&(!Number.isFinite(time.createTime)||time.createTime<0||!Number.isFinite(time.createTime*1000)||Math.abs(time.createTime*1000)>8640000000000000||new Date(time.createTime*1000).toISOString()!==response.timestamp)||!time.blocked&&!Object.keys(time.candidates).length))fail('BNS_SOURCE_TIME_MISMATCH');
 for(const c of Object.values(ledger.value?.candidates||{}))if(!equal(c.identity,{chatId:r.chatId,sourceMessageId:r.sourceMessageId})||Date.parse(c.timestamp)>Date.parse(r.capturedAt))fail('BNS_SOURCE_BOOTSTRAP_INVALID');
 const copy={...clone(r),sourceSentAt:null,timeSource:'unknown',timeConfidence:'unknown'},state={records:[copy],sourceTimes:ledger.value===null?{}:{[r.sourceKey]:clone(ledger.value)}};delete copy.timeCandidates;
 applySourceTime(state,r.sourceKey,null,r.pageOrder,r.capturedAt,[copy]);if(!equal(copy,r)||!equal(state.sourceTimes[r.sourceKey]??null,ledger.value))fail('BNS_SOURCE_TIME_MISMATCH');
 const initial=initialSourceObjects(r),source={...initial.document,titleRevision:0};delete source.sourceRecordIds;const working=clone(source);delete working.titleRevision;
 const block={...initial.block,revision:0,provenanceSignature:JSON.stringify(initial.block.provenance)};
 if(!equal(doc,{id:source.id,source,working})||!equal(b,block)||!exactAll(m,['id','documentId','contentRevision','removalState','filteringPolicyState','sourceRecordIds','deltaSequence'])||!equal({...m,deltaSequence:0},{id:b.id,documentId:b.documentId,contentRevision:0,removalState:'active',filteringPolicyState:'none',sourceRecordIds:[r.id],deltaSequence:0})||!count(m.deltaSequence)||m.deltaSequence<1)fail('BNS_SOURCE_BOOTSTRAP_INVALID');
 const snap={libraryText:b.libraryText,note:b.note,excluded:b.excluded,originalTextReference:b.originalTextReference,provenanceSignature:b.provenanceSignature};
 if(!exactAll(h,['kind','entityId','documentId','before','after','reason','important','sourceRecordIds','id','entityKey','sequence','windowStartedAt','at','listKey','documentList'])||h.kind!=='input'||h.entityId!==b.id||h.documentId!==b.documentId||h.reason!=='baseline'||h.important!==true||!equal(h.sourceRecordIds,[r.id])||!equal(h.before,snap)||!equal(h.after,snap)||h.entityKey!=='input:'+b.id||!count(h.sequence)||h.sequence<1||h.at!==r.capturedAt||h.windowStartedAt!==h.at||!equal(h.listKey,[h.entityKey,h.sequence])||!equal(h.documentList,[h.documentId,h.sequence]))fail('BNS_SOURCE_BASELINE_INVALID');
 canonical(entities);return entities;
}

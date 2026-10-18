import {captureContextEvidence,fenceContextLineage,releaseContextLineage,validContextMaintenance,lineageExact} from '../context-item-lineage.js';
import {inputProjection} from '../thought-evidence.js';
import {prefix} from '../thought-model.js';
import {MemoryService} from '../memory/service.js';
import {hashText} from '../dedupe.js';
import {CONSENT_VERSION} from '../constants.js';
import {digest,equal,exact,fail,integer,token} from './contracts.js';
import {DIRTY_PREFIX} from './delta.js';

// An ephemeral capability minted only by the existing human Context change
// owner. Neither a request field, arbitrary meta write nor a replayed receipt
// can claim that the original transaction observed unchanged interpretation.
const prepared=new WeakMap();
const semantic=item=>{const {revision,updatedAt,protected:protection,userEdited,...rest}=item;return rest;};
export async function prepareContextProtectionCorrection(before,change,operationDigest){
 if(!token(operationDigest)||change.kind!=='put'||!before||before.origin!=='automatic'||before.lifecycle!=='active'||before.revision!==change.expectedRevision||before.card!==(change.card??'info'))return null;
 const edited=before.body!==change.body||before.section!==change.section;
 const normalized=text=>text.trim().replace(/\s+/g,' ');
 if(edited&&normalized(before.body)===normalized(change.body)&&normalized(before.section)===normalized(change.section))return null;
 if(!edited&&(before.protected!==false||before.userEdited!==false))return null;
 const next=semantic({...before,body:change.body,section:change.section});
 const handle=Object.freeze({});prepared.set(handle,{before:structuredClone(before),next,kind:edited?'text_edit':'protection_only',receiptId:'context:'+change.operationId,receiptDigest:operationDigest,epoch:change.epoch,semanticDigest:await digest(next)});return handle;
}
export async function recordContextProtectionCorrection(t,handle,before,after,receipt){
 const proof=prepared.get(handle);if(!proof)return;prepared.delete(handle);
 if(!equal(proof.before,before)||!equal(proof.next,semantic(after))||after.revision!==before.revision+1||after.protected!==true||after.userEdited!==true)return;
 const key=JSON.stringify(['context_item',after.id]),change=t.semanticChanges?.get(JSON.stringify([key,after.id]));
 if(!change||change.after.revision!==after.revision||proof.kind==='protection_only'&&await t.get('meta',DIRTY_PREFIX+key))return;
 if(receipt.id!==proof.receiptId||receipt.digest!==proof.receiptDigest||receipt.epoch!==proof.epoch||receipt.namespace!=='context-cards'||receipt.schemaVersion!==1||receipt.ownerId!==after.id||receipt.result?.ok!==true||receipt.result.itemId!==after.id||receipt.result.revision!==after.revision||receipt.result.lifecycle!=='active'||receipt.result.deletedBy!==null||!token(receipt.digest))return;
 if(!equal(await t.get('operationReceipts',receipt.id),receipt))return;
 change.after[proof.kind==='protection_only'?'localCorrection':'contextEdit']={version:1,kind:proof.kind,beforeRevision:before.revision,receiptId:receipt.id,receiptDigest:receipt.digest,epoch:receipt.epoch,semanticDigest:proof.semanticDigest,...(proof.kind==='text_edit'?{updatedAt:after.updatedAt}:{})};
}
async function capture(store,t,item){
 const d=item.descriptor,p=d.localCorrection;if(d.kind!=='context_item'||!p)return null;
 try{exact(p,['version','kind','beforeRevision','receiptId','receiptDigest','epoch','semanticDigest']);}catch{return null;}
 if(p.version!==1||p.kind!=='protection_only'||!integer(p.beforeRevision)||p.beforeRevision+1!==d.revision||!token(p.receiptDigest)||!token(p.semanticDigest)||typeof p.receiptId!=='string'||!/^context:[a-f0-9-]{36}$/.test(p.receiptId))return null;
 if((await store.control(t)).settings.consentVersion!==CONSENT_VERSION||((await t.get('meta','recovery-restore-epoch'))?.value??'initial')!==p.epoch)return null;
 const row=await t.get('meta','context-cards:v1'),live=row?.items?.find(x=>x.id===d.entityId),receipt=await t.get('operationReceipts',p.receiptId);
 if(!live||live.origin!=='automatic'||live.lifecycle!=='active'||live.protected!==true||live.userEdited!==true||live.revision!==d.revision||receipt?.namespace!=='context-cards'||receipt.schemaVersion!==1||receipt.ownerId!==live.id||receipt.epoch!==p.epoch||receipt.digest!==p.receiptDigest||!equal(receipt.result,{ok:true,itemId:live.id,revision:live.revision,lifecycle:'active',deletedBy:null}))return null;
 return {item:live,receipt};
}
export async function qualifyContextProtectionCorrections(foundation,items){
 items=items.filter(item=>item.descriptor.kind==='context_item'&&item.descriptor.localCorrection);if(!items.length)return new Map();
 const candidates=await foundation.read(async t=>{const found=[];for(const item of items){const value=await capture(foundation.s,t,item);if(value)found.push({item,value});}return found;});
 const found=new Map();for(const {item,value}of candidates)if(await digest(semantic(value.item))===item.descriptor.localCorrection.semanticDigest)found.set(item.key,value);return found;
}
export async function assertContextProtectionCorrections(store,t,items,captured){
 for(const item of items){const actual=await capture(store,t,item);if(!actual||!equal(actual,captured.get(item.key)))fail('STALE_BASE');}
}


// Finite text-correction mapper. An edited automatic Item never becomes
// source-free human evidence. Its entire original plain body lineage must
// remain current; authored/bound/structural/note/invalidated cases stay pending.
export async function readContextEditMapping(store,t,d){
 const p=d?.contextEdit;if(d?.kind!=='context_item'||d.removed||d.fenceOnly||!p)return null;
 try{exact(p,['version','kind','beforeRevision','receiptId','receiptDigest','epoch','semanticDigest','updatedAt']);}catch{return null;}
 if(p.version!==1||p.kind!=='text_edit'||!integer(p.beforeRevision)||p.beforeRevision<1||typeof p.updatedAt!=='string'||!Number.isFinite(Date.parse(p.updatedAt))||p.beforeRevision+1!==d.revision||!token(p.receiptDigest)||!token(p.semanticDigest)||typeof p.receiptId!=='string'||!/^context:[a-f0-9-]{36}$/.test(p.receiptId))return null;
 if((await store.control(t)).settings.consentVersion!==CONSENT_VERSION||((await t.get('meta','recovery-restore-epoch'))?.value??'initial')!==p.epoch)return null;
 const item=(await t.get('meta','context-cards:v1'))?.items?.find(i=>i.id===d.entityId),receipt=await t.get('operationReceipts',p.receiptId);
 // Match the original ContextCards human receipt contract, including its bounded timestamp.
 if(!lineageExact(receipt,['id','namespace','schemaVersion','ownerId','createdAt','digest','epoch','result'])||receipt.id!==p.receiptId||typeof receipt.createdAt!=='string'||receipt.createdAt.length>64||!Number.isFinite(Date.parse(receipt.createdAt))||!lineageExact(receipt.result,['ok','itemId','revision','lifecycle','deletedBy']))return null;
 if(!item||item.origin!=='automatic'||item.lifecycle!=='active'||!item.protected||!item.userEdited||item.revision!==d.revision||item.updatedAt!==p.updatedAt||!validContextMaintenance(item.maintenance)||item.maintenance.invalidation||item.maintenance.temporal||item.maintenance.provenance.epoch!==p.epoch||receipt?.namespace!=='context-cards'||receipt.schemaVersion!==1||receipt.ownerId!==item.id||receipt.epoch!==p.epoch||receipt.digest!==p.receiptDigest||!equal(receipt.result,{ok:true,itemId:item.id,revision:item.revision,lifecycle:'active',deletedBy:null}))return null;
 const evidence=item.maintenance.provenance.evidence,sources=new Set(),memory=new MemoryService(store);
 if(!evidence.length||evidence.length>16||new Set(evidence.map(e=>e.inputId)).size!==evidence.length||evidence.some(e=>e.kind||e.humanTopic||e.humanSection||!equal(e.selectedFields,['body'])))return null;
 for(const e of evidence){const state=await t.get('inputStates',e.inputId),index=await t.get('blockIndex',e.inputId);
  if(!state||state.removalState!=='active'||state.sourcePurged||state.contentRevision!==e.contentRevision||(state.lastRemovalSequence??0)!==e.expectedRemovalSequence||index?.excluded!==false||!equal([...state.sourceRecordIds].sort(),e.sourceRecordIds)||!await memory.safeSources(t,e.sourceRecordIds))return null;
  for(const id of e.sourceRecordIds)sources.add(id);
 }
 if(sources.size>20)return null;
 return {kind:'contextEdit',itemId:item.id,revision:item.revision,card:item.card,selectedFields:['body','section'],proof:structuredClone(p),associationIds:[...item.maintenance.associationIds],provenance:structuredClone(item.maintenance.provenance),sourceRecordIds:[...sources].sort()};
}
export const contextEditScope=m=>({kind:m.kind,itemId:m.itemId,revision:m.revision,card:m.card,selectedFields:[...m.selectedFields],proof:structuredClone(m.proof),inputIds:m.provenance.evidence.map(e=>e.inputId).sort()});
export const contextEditEvidence=m=>m.provenance.evidence.map(({contentRevision,sourceRecordIds,sourceIdentityTokens,...spec})=>structuredClone(spec));
const editDescriptor=m=>({kind:'context_item',entityId:m.itemId,revision:m.revision,contextEdit:m.proof});
async function editSnapshot(store,t,m){
 if(!equal(await readContextEditMapping(store,t,editDescriptor(m)),m))fail('STALE_BASE');
 const item=(await t.get('meta','context-cards:v1')).items.find(i=>i.id===m.itemId),receipt=await t.get('operationReceipts',m.proof.receiptId),inputs=[],topics=[],memberships=[],sources=[],legacy=[];
 const filter=await t.get('meta','smart-filter');
 for(const e of m.provenance.evidence){const input=await inputProjection(store,t,e.inputId);if(!input||await store.isFiltered(t,input.block,filter))fail('STALE_BASE');inputs.push(input);}
 for(const topicId of [...new Set(m.provenance.evidence.map(e=>e.topicId))].sort()){
  const topic=await t.get('topics',topicId);topics.push(topic);
  const placements=await t.all('placements','byTopicOrder',prefix([topicId,topic.activeLayoutGeneration,0]),17);if(placements.length>16)fail('BUDGET_EXCEEDED');
  const entries=[];for(const p of placements){const e=await t.get('thoughts',p.entryId);if(!e)fail('STALE_BASE');const {thoughtText,title,note,...metadata}=e;entries.push(metadata);}
  memberships.push({placements,entries});
 }
 for(const id of m.sourceRecordIds)sources.push({index:await t.get('recordIndex',id),record:await t.get('records',id)});
 // Original legacy restrictions are part of the final transaction fence too.
 // The reader supplied by the session charges these bounded local reads.
 await t.scanPrimary('meta','memory:',row=>{if(['config','topic','section','entry','input'].includes(row.kind))legacy.push(row);});
 return {item,receipt,inputs,topics,memberships,sources,legacy,filter};
}
export async function captureContextEditMaterial(store,m,{read,signal}){
 const lineage=await captureContextEvidence(store,contextEditEvidence(m),{epoch:m.proof.epoch,signal});
 try{
  if(!equal(lineage.provenance,m.provenance))fail('STALE_BASE');
  const snapshot=await read(async t=>{await fenceContextLineage(store,lineage.captured,{transaction:t});return editSnapshot(store,t,m);});
  if(await digest(semantic(snapshot.item))!==m.proof.semanticDigest)fail('STALE_BASE');
  const fields={body:snapshot.item.body,section:snapshot.item.section},fieldDigests={};for(const [field,text]of Object.entries(fields))fieldDigests[field]=await hashText(text);
  const held={mapping:m,snapshot,lineage:lineage.captured,fields,fieldDigests};await read(t=>assertContextEditMaterial(store,t,held));return held;
 }catch(error){releaseContextLineage(lineage.captured);throw error;}
}
export async function assertContextEditMaterial(store,t,held){
 await fenceContextLineage(store,held.lineage,{transaction:t});
 if(!equal(await editSnapshot(store,t,held.mapping),held.snapshot))fail('STALE_BASE');
}
export function releaseContextEditMaterial(held){releaseContextLineage(held?.lineage);}

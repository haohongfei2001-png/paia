import {ArchiveError,CONSENT_VERSION} from './constants.js';
import {hashText} from './dedupe.js';
import {rootReadAuthority} from './organizer/root-read.js';
import {validContextMaintenance,readableContextItems,contextLineageSourceIds,contextLineageRead,lineageArray,lineageExact} from './context-item-lineage.js';

// Independent bounded Context Items in the existing meta transaction. Manual
// Items remain source-free; automatic Items retain separately checked lineage.
export const CONTEXT_CARDS_ROW='context-cards:v1';
export const CONTEXT_CARDS=['info','rules','now','inputs'];
export const CONTEXT_ITEM_CARDS=Object.freeze(['info','rules','now']);
// Omitted card is the original Info contract. Do not normalize the request
// before hashing: existing operation receipts and recovery drafts keep identity.
const itemCard=change=>change.card??'info';
export const CONTEXT_LIMITS=Object.freeze({items:512,body:8192,bytes:1024*1024});
const fail=code=>{throw new ArchiveError(code||'INVALID_REQUEST');};
const plain=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const exact=(v,keys)=>plain(v)&&Object.keys(v).every(k=>keys.includes(k));
const revision=v=>Number.isSafeInteger(v)&&v>=0;
const uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(v);
const bounded=(v,n)=>typeof v==='string'&&v.length<=n&&!v.includes('\u0000');
const empty=()=>({id:CONTEXT_CARDS_ROW,version:1,sequence:0,access:Object.fromEntries(['global',...CONTEXT_CARDS].map(k=>[k,{enabled:false,revision:0}])),items:[]});
const itemValid=x=>exact(x,['id','card','body','section','revision','order','origin','protected','userEdited','lifecycle','createdAt','updatedAt','deletedBy',...(x?.origin==='automatic'?['maintenance']:[])])&&uuid(x.id)&&CONTEXT_ITEM_CARDS.includes(x.card)&&bounded(x.body,CONTEXT_LIMITS.body)&&bounded(x.section,80)&&revision(x.revision)&&x.revision>0&&revision(x.order)&&(x.origin==='manual'&&x.protected===true&&x.userEdited===true||x.origin==='automatic'&&typeof x.protected==='boolean'&&x.userEdited===x.protected&&validContextMaintenance(x.maintenance))&&['active','removed'].includes(x.lifecycle)&&typeof x.createdAt==='string'&&typeof x.updatedAt==='string'&&(x.deletedBy===null||uuid(x.deletedBy));
export function validContextCards(row){
 return exact(row,['id','version','sequence','access','items'])&&row.id===CONTEXT_CARDS_ROW&&row.version===1&&revision(row.sequence)&&exact(row.access,['global',...CONTEXT_CARDS])&&Object.keys(row.access).length===5&&Object.values(row.access).every(a=>exact(a,['enabled','revision'])&&typeof a.enabled==='boolean'&&revision(a.revision))&&Array.isArray(row.items)&&row.items.length<=CONTEXT_LIMITS.items&&row.items.every(itemValid)&&new Set(row.items.map(x=>x.id)).size===row.items.length&&(()=>{const ids=row.items.flatMap(x=>x.origin==='automatic'?x.maintenance.associationIds:[]);return new Set(ids).size===ids.length;})()&&new TextEncoder().encode(JSON.stringify(row)).length<=CONTEXT_LIMITS.bytes;
}
export function validateContextChange(c,{draft=false}={}){
 if(!exact(c,['kind','operationId','epoch','itemId','expectedRevision','body','section','card','key','enabled','deletedBy'])||!uuid(c.operationId)||!bounded(c.epoch,128)||!c.epoch||!revision(c.expectedRevision))fail();
 const shared=['kind','operationId','epoch','expectedRevision'];
 if(c.kind==='access'){
  if(!exact(c,[...shared,'key','enabled'])||!['global',...CONTEXT_CARDS].includes(c.key)||typeof c.enabled!=='boolean')fail();
 }else{
  if(!uuid(c.itemId))fail();
  if(c.kind==='put'){if(!exact(c,[...shared,'itemId','body','section','card'])||c.card!==undefined&&!CONTEXT_ITEM_CARDS.includes(c.card)||!bounded(c.body,CONTEXT_LIMITS.body)||!draft&&!c.body.trim()||!bounded(c.section,80)||!c.section.trim())fail();}
  else if(c.kind==='delete'){if(!exact(c,[...shared,'itemId']))fail();}
  else if(c.kind==='restore'){if(!exact(c,[...shared,'itemId','deletedBy'])||!uuid(c.deletedBy))fail();}
  else fail('FEATURE_UNAVAILABLE');
 }
 return c;
}
export async function readContextCards(t){const row=await t.get('meta',CONTEXT_CARDS_ROW);if(row&&!validContextCards(row))fail('STORAGE_FAILED');return row||empty();}
function applyContextChange(row,c,clock){
 let result;
   if(c.kind==='access'){
    const value=row.access[c.key];if(value.revision!==c.expectedRevision)return {ok:false,conflict:true,revision:value.revision};
    value.enabled=c.enabled;value.revision++;result={ok:true,key:c.key,revision:value.revision,enabled:value.enabled};
   }else{
    let item=row.items.find(x=>x.id===c.itemId);
    if(c.kind==='put'&&item&&item.card!==itemCard(c))fail();
    if((item?.revision||0)!==c.expectedRevision)return {ok:false,conflict:true,revision:item?.revision||0,lifecycle:item?.lifecycle||'missing'};
    if(c.kind==='put'){
     if(item?.lifecycle==='removed')return {ok:false,conflict:true,revision:item.revision,lifecycle:'removed'};
     if(!item){if(row.items.length>=CONTEXT_LIMITS.items)fail('CONTEXT_LIMIT');item={id:c.itemId,card:itemCard(c),revision:0,order:row.sequence++,origin:'manual',protected:true,userEdited:true,lifecycle:'active',createdAt:clock(),deletedBy:null};row.items.push(item);}
     item.body=c.body;item.section=c.section;
    }else if(c.kind==='delete'){
     if(!item||item.lifecycle!=='active')fail('CONTEXT_INVALIDATED');item.lifecycle='removed';item.deletedBy=c.operationId;
    }else{
     if(!item||item.lifecycle!=='removed'||item.deletedBy!==c.deletedBy)fail('CONTEXT_INVALIDATED');item.lifecycle='active';item.deletedBy=null;
    }
    if(item.origin==='automatic'){item.protected=true;item.userEdited=true;}
    item.revision++;item.updatedAt=clock();result={ok:true,itemId:item.id,revision:item.revision,lifecycle:item.lifecycle,deletedBy:item.deletedBy};
   }
   if(!validContextCards(row))fail('CONTEXT_LIMIT');
 return result;
}
export class ContextCardsService {
 constructor(store,{topicSummary=null,syncJournal=null}={}){this.s=store;this.topicSummary=topicSummary;this.syncJournal=syncJournal;if(syncJournal&&(typeof syncJournal.prepare!=='function'||typeof syncJournal.commit!=='function'))fail();}
 async row(t){return readContextCards(t);}
 async admitted(t,epoch){if((await this.s.control(t)).settings.consentVersion!==CONSENT_VERSION)fail('CONSENT_REQUIRED');const current=(await t.get('meta','recovery-restore-epoch'))?.value||'initial';if(epoch!==undefined&&epoch!==current)fail('CONTEXT_INVALIDATED');return current;}
 async snapshot(){const captured=await this.s.run(()=>this.s.repository.transaction(false,async t=>{const epoch=await this.admitted(t),row=await this.row(t);let topicChoices;
  if(this.topicSummary){try{const value=await this.topicSummary(t,epoch);if(typeof value?.available!=='boolean'||value.externalAllowed!==false||value.available&&(!revision(value.selectedCount)||value.selectedCount>4096))throw Error('TOPICS_UNAVAILABLE');const selectedNames=value.selectedNames??[],remainingSelectedCount=value.remainingSelectedCount??value.selectedCount;if(value.available&&(!Array.isArray(selectedNames)||selectedNames.length>3||Object.keys(selectedNames).length!==selectedNames.length||!selectedNames.every(name=>bounded(name,300)&&name.trim())||!revision(remainingSelectedCount)||selectedNames.length+remainingSelectedCount!==value.selectedCount))throw Error('TOPICS_UNAVAILABLE');topicChoices={available:value.available,selectedCount:value.available?value.selectedCount:null,...(value.available?{selectedNames,remainingSelectedCount}:{}),externalAllowed:false};}catch{topicChoices={available:false,selectedCount:null,externalAllowed:false};}}
  return {rowSerialized:JSON.stringify(await t.get('meta',CONTEXT_CARDS_ROW)),version:1,epoch,access:row.access,items:row.items.filter(x=>x.lifecycle==='active'),counts:Object.fromEntries(CONTEXT_CARDS.map(k=>[k,row.items.filter(x=>x.card===k&&x.lifecycle==='active').length])),capabilities:{info:true,rules:true,now:true,inputs:topicChoices?.available===true,automatic:false,external:false},connections:0,...(topicChoices?{topicChoices}:{})};}));
  const {rowSerialized,...snapshot}=captured;const readable=await readableContextItems(this.s,snapshot.items,{epoch:snapshot.epoch,rowSerialized});snapshot.items=readable.items;snapshot.counts=Object.fromEntries(CONTEXT_CARDS.map(k=>[k,readable.automaticEvaluation&&captured.items.some(x=>x.card===k&&x.origin==='automatic')?null:snapshot.items.filter(x=>x.card===k).length]));if(readable.automaticEvaluation)snapshot.automaticEvaluation=readable.automaticEvaluation;return snapshot;}
 async change(input){
  const c=structuredClone(validateContextChange(input)),digest=await hashText(JSON.stringify(c));
  let staged=null;
  if(this.syncJournal){
   const captured=await this.s.run(()=>this.s.repository.transaction(false,async t=>{await this.admitted(t,c.epoch);return {row:await this.row(t),receipt:await t.get('operationReceipts','context:'+c.operationId)};}));
   if(captured.receipt){const r=captured.receipt;if(r.namespace!=='context-cards'||r.digest!==digest||r.epoch!==c.epoch)fail();return r.result;}
   const before=JSON.stringify(captured.row),at=this.s.clock(),next=structuredClone(captured.row),result=applyContextChange(next,c,()=>at);
   if(!result.ok)return result;
   staged={before,at,prepared:await this.syncJournal.prepare(captured.row,next,c)};
  }
  return this.s.write(async t=>{
   await this.admitted(t,c.epoch);
   const receipt=await t.get('operationReceipts','context:'+c.operationId);
   if(receipt){if(receipt.namespace!=='context-cards'||receipt.digest!==digest||receipt.epoch!==c.epoch)fail();return receipt.result;}
   const row=await this.row(t);
   if(staged&&JSON.stringify(row)!==staged.before)fail('CONTEXT_INVALIDATED');
   const result=applyContextChange(row,c,staged?()=>staged.at:()=>this.s.clock());
   if(!result.ok)return result;
   await t.put('meta',row);
   if(staged)await this.syncJournal.commit(t,staged.prepared);
   // Receipt contains no second body. Only a committed transaction can return it.
   await t.put('operationReceipts',{id:'context:'+c.operationId,namespace:'context-cards',schemaVersion:1,ownerId:c.itemId||c.key,createdAt:this.s.clock(),digest,epoch:c.epoch,result});
   return result;
  });
 }
 async outcome(query){
  if(!exact(query,['operationId','digest','epoch'])||!uuid(query.operationId)||!bounded(query.epoch,128)||!/^[a-f0-9]{64}$/.test(query.digest))fail();
  return this.s.run(()=>this.s.repository.transaction(false,async t=>{await this.admitted(t,query.epoch);const receipt=await t.get('operationReceipts','context:'+query.operationId);if(!receipt)return {state:'not_committed'};if(receipt.namespace!=='context-cards'||receipt.digest!==query.digest||receipt.epoch!==query.epoch)return {state:'unknown'};return {state:'committed',result:receipt.result};}));
 }
 async recoveryCommitted(draft){
  // A lost acknowledgement/clear may leave the exact already-committed edit
  // resident. Prove that historic edit without releasing the draft body or
  // treating a newer canonical revision as its source-authority baseline.
  const change=draft?.operation?.change;
  if(!lineageExact(draft,['version','kind','ownerId','token','epoch','operation','sourceRecordIds','updatedAt','expiresAt'])||draft.version!==1||!lineageExact(draft.operation,['type','change'])||!lineageArray(draft.sourceRecordIds,2000)||!draft.sourceRecordIds.every(id=>bounded(id,512)&&id.length)||!Number.isFinite(draft.updatedAt)||!Number.isFinite(draft.expiresAt)||draft.kind!=='context_item'||draft.operation.type!=='PAIA_CONTEXT_CARDS_CHANGE'||change?.kind!=='put'||draft.ownerId!==change.itemId||draft.token!==change.operationId||draft.epoch!==change.epoch)return false;
  try{validateContextChange(change);}catch{return false;}
  const database=this.s.repository.db,digest=await hashText(JSON.stringify(change));
  return contextLineageRead(this.s,async t=>{
   await this.admitted(t,draft.epoch);const row=await this.row(t),item=row.items.find(x=>x.id===change.itemId),receipt=await t.get('operationReceipts','context:'+change.operationId);
   if(item?.origin!=='automatic'||!item.protected||!item.userEdited||item.card!==itemCard(change)||!lineageExact(receipt,['id','namespace','schemaVersion','ownerId','createdAt','digest','epoch','result'])||receipt.id!=='context:'+change.operationId||receipt.namespace!=='context-cards'||receipt.schemaVersion!==1||receipt.ownerId!==change.itemId||receipt.epoch!==change.epoch||receipt.digest!==digest||typeof receipt.createdAt!=='string'||receipt.createdAt.length>64||!Number.isFinite(Date.parse(receipt.createdAt)))return false;
   const result=receipt.result;
   return lineageExact(result,['ok','itemId','revision','lifecycle','deletedBy'])&&result.ok===true&&result.itemId===change.itemId&&result.revision===change.expectedRevision+1&&result.lifecycle==='active'&&result.deletedBy===null&&item.revision>=result.revision&&(item.revision!==result.revision||item.body===change.body&&item.section===change.section);
  },['meta','operationReceipts'],database).catch(()=>{throw new ArchiveError('UNAVAILABLE');});
 }
 async recoveryBatchFence(expected=null){
  const current=await contextLineageRead(this.s,async t=>{const epoch=await this.admitted(t),row=await this.row(t),control=await this.s.control(t);return {derived:row.items.some(x=>x.origin==='automatic'&&x.lifecycle==='active'),token:JSON.stringify([epoch,await rootReadAuthority(t),control.settings,row.sequence,row.items.map(x=>[x.id,x.revision,x.lifecycle])])};},['meta']);
  if(expected&&(expected.derived||current.derived)&&expected.token!==current.token)fail('CONTEXT_INVALIDATED');return current;
 }
 recoverySources(draft,{stored=false}={}){
  const {kind,ownerId,operation,sourceRecordIds=[]}=draft||{};
  if(kind!=='context_item'||!uuid(ownerId)||!lineageArray(sourceRecordIds,2000)||!sourceRecordIds.every(id=>typeof id==='string'&&id.length>0&&id.length<=512)||!stored&&sourceRecordIds.length||operation?.type!=='PAIA_CONTEXT_CARDS_CHANGE'||operation.change?.kind!=='put'||operation.change.itemId!==ownerId)fail();
  validateContextChange(operation.change,{draft:true});if(operation.change.epoch!==draft.epoch)fail('CONTEXT_INVALIDATED');
  return (async()=>{
   const captured=await this.s.run(()=>this.s.repository.transaction(false,async t=>{await this.admitted(t,draft.epoch);const row=await this.row(t),item=row.items.find(x=>x.id===ownerId);if(item?.lifecycle==='removed'||item&&item.card!==itemCard(operation.change)||!item&&operation.change.expectedRevision!==0)fail('CONTEXT_INVALIDATED');if(item?.origin==='automatic'&&operation.change.expectedRevision!==item.revision)fail('UNAVAILABLE');return {item,rowSerialized:JSON.stringify(await t.get('meta',CONTEXT_CARDS_ROW))};}));
   if(captured.item?.origin!=='automatic'){if(sourceRecordIds.length)fail();return [];}
   let readable;try{readable=await readableContextItems(this.s,[captured.item],{epoch:draft.epoch,rowSerialized:captured.rowSerialized});}catch(error){if(error?.code==='CONTEXT_INVALIDATED')fail('UNAVAILABLE');throw error;}
   // Source uncertainty is not permission to erase unsaved human work. The
   // worker's terminal invalidation catch deliberately excludes UNAVAILABLE.
   if(readable.automaticEvaluation||readable.items.length!==1)fail('UNAVAILABLE');
   const sources=contextLineageSourceIds(captured.item);if(sources.length>2000)fail('CONTEXT_LIMIT');if(stored&&JSON.stringify(sourceRecordIds)!==JSON.stringify(sources))fail('UNAVAILABLE');return sources;
  })();
 }
}

import {ArchiveError,CONSENT_VERSION} from './constants.js';
import {hashText} from './dedupe.js';

// Independent, bounded manual Context. No Source/Input/Thought body is read or
// copied. The existing meta transaction is sufficient: no new database/store.
export const CONTEXT_CARDS_ROW='context-cards:v1';
export const CONTEXT_CARDS=['info','rules','now','inputs'];
export const CONTEXT_LIMITS=Object.freeze({items:512,body:8192,bytes:1024*1024});
const fail=code=>{throw new ArchiveError(code||'INVALID_REQUEST');};
const plain=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const exact=(v,keys)=>plain(v)&&Object.keys(v).every(k=>keys.includes(k));
const revision=v=>Number.isSafeInteger(v)&&v>=0;
const uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(v);
const bounded=(v,n)=>typeof v==='string'&&v.length<=n&&!v.includes('\u0000');
const empty=()=>({id:CONTEXT_CARDS_ROW,version:1,sequence:0,access:Object.fromEntries(['global',...CONTEXT_CARDS].map(k=>[k,{enabled:false,revision:0}])),items:[]});
const itemValid=x=>exact(x,['id','card','body','section','revision','order','origin','protected','userEdited','lifecycle','createdAt','updatedAt','deletedBy'])&&uuid(x.id)&&x.card==='info'&&bounded(x.body,CONTEXT_LIMITS.body)&&bounded(x.section,80)&&revision(x.revision)&&x.revision>0&&revision(x.order)&&x.origin==='manual'&&x.protected===true&&x.userEdited===true&&['active','removed'].includes(x.lifecycle)&&typeof x.createdAt==='string'&&typeof x.updatedAt==='string'&&(x.deletedBy===null||uuid(x.deletedBy));
export function validContextCards(row){
 return exact(row,['id','version','sequence','access','items'])&&row.id===CONTEXT_CARDS_ROW&&row.version===1&&revision(row.sequence)&&exact(row.access,['global',...CONTEXT_CARDS])&&Object.keys(row.access).length===5&&Object.values(row.access).every(a=>exact(a,['enabled','revision'])&&typeof a.enabled==='boolean'&&revision(a.revision))&&Array.isArray(row.items)&&row.items.length<=CONTEXT_LIMITS.items&&row.items.every(itemValid)&&new Set(row.items.map(x=>x.id)).size===row.items.length&&new TextEncoder().encode(JSON.stringify(row)).length<=CONTEXT_LIMITS.bytes;
}
export function validateContextChange(c,{draft=false}={}){
 if(!exact(c,['kind','operationId','epoch','itemId','expectedRevision','body','section','key','enabled','deletedBy'])||!uuid(c.operationId)||!bounded(c.epoch,128)||!c.epoch||!revision(c.expectedRevision))fail();
 const shared=['kind','operationId','epoch','expectedRevision'];
 if(c.kind==='access'){
  if(!exact(c,[...shared,'key','enabled'])||!['global',...CONTEXT_CARDS].includes(c.key)||typeof c.enabled!=='boolean')fail();
 }else{
  if(!uuid(c.itemId))fail();
  if(c.kind==='put'){if(!exact(c,[...shared,'itemId','body','section'])||!bounded(c.body,CONTEXT_LIMITS.body)||!draft&&!c.body.trim()||!bounded(c.section,80)||!c.section.trim())fail();}
  else if(c.kind==='delete'){if(!exact(c,[...shared,'itemId']))fail();}
  else if(c.kind==='restore'){if(!exact(c,[...shared,'itemId','deletedBy'])||!uuid(c.deletedBy))fail();}
  else fail('FEATURE_UNAVAILABLE');
 }
 return c;
}
export class ContextCardsService {
 constructor(store){this.s=store;}
 async row(t){const row=await t.get('meta',CONTEXT_CARDS_ROW);if(row&&!validContextCards(row))fail('STORAGE_FAILED');return row||empty();}
 async admitted(t,epoch){if((await this.s.control(t)).settings.consentVersion!==CONSENT_VERSION)fail('CONSENT_REQUIRED');const current=(await t.get('meta','recovery-restore-epoch'))?.value||'initial';if(epoch!==undefined&&epoch!==current)fail('CONTEXT_INVALIDATED');return current;}
 snapshot(){return this.s.run(()=>this.s.repository.transaction(false,async t=>{const epoch=await this.admitted(t),row=await this.row(t);return {version:1,epoch,access:row.access,items:row.items.filter(x=>x.lifecycle==='active'),counts:Object.fromEntries(CONTEXT_CARDS.map(k=>[k,row.items.filter(x=>x.card===k&&x.lifecycle==='active').length])),capabilities:{info:true,rules:false,now:false,inputs:false,automatic:false,external:false},connections:0};}));}
 async change(input){
  const c=structuredClone(validateContextChange(input)),digest=await hashText(JSON.stringify(c));
  return this.s.write(async t=>{
   await this.admitted(t,c.epoch);
   const receipt=await t.get('operationReceipts','context:'+c.operationId);
   if(receipt){if(receipt.namespace!=='context-cards'||receipt.digest!==digest||receipt.epoch!==c.epoch)fail();return receipt.result;}
   const row=await this.row(t);let result;
   if(c.kind==='access'){
    const value=row.access[c.key];if(value.revision!==c.expectedRevision)return {ok:false,conflict:true,revision:value.revision};
    value.enabled=c.enabled;value.revision++;result={ok:true,key:c.key,revision:value.revision,enabled:value.enabled};
   }else{
    let item=row.items.find(x=>x.id===c.itemId);
    if((item?.revision||0)!==c.expectedRevision)return {ok:false,conflict:true,revision:item?.revision||0,lifecycle:item?.lifecycle||'missing'};
    if(c.kind==='put'){
     if(item?.lifecycle==='removed')return {ok:false,conflict:true,revision:item.revision,lifecycle:'removed'};
     if(!item){if(row.items.length>=CONTEXT_LIMITS.items)fail('CONTEXT_LIMIT');item={id:c.itemId,card:'info',revision:0,order:row.sequence++,origin:'manual',protected:true,userEdited:true,lifecycle:'active',createdAt:this.s.clock(),deletedBy:null};row.items.push(item);}
     item.body=c.body;item.section=c.section;
    }else if(c.kind==='delete'){
     if(!item||item.lifecycle!=='active')fail('CONTEXT_INVALIDATED');item.lifecycle='removed';item.deletedBy=c.operationId;
    }else{
     if(!item||item.lifecycle!=='removed'||item.deletedBy!==c.deletedBy)fail('CONTEXT_INVALIDATED');item.lifecycle='active';item.deletedBy=null;
    }
    item.revision++;item.updatedAt=this.s.clock();result={ok:true,itemId:item.id,revision:item.revision,lifecycle:item.lifecycle,deletedBy:item.deletedBy};
   }
   if(!validContextCards(row))fail('CONTEXT_LIMIT');
   await t.put('meta',row);
   // Receipt contains no second body. Only a committed transaction can return it.
   await t.put('operationReceipts',{id:'context:'+c.operationId,namespace:'context-cards',schemaVersion:1,ownerId:c.itemId||c.key,createdAt:this.s.clock(),digest,epoch:c.epoch,result});
   return result;
  });
 }
 async outcome(query){
  if(!exact(query,['operationId','digest','epoch'])||!uuid(query.operationId)||!bounded(query.epoch,128)||!/^[a-f0-9]{64}$/.test(query.digest))fail();
  return this.s.run(()=>this.s.repository.transaction(false,async t=>{await this.admitted(t,query.epoch);const receipt=await t.get('operationReceipts','context:'+query.operationId);if(!receipt)return {state:'not_committed'};if(receipt.namespace!=='context-cards'||receipt.digest!==query.digest||receipt.epoch!==query.epoch)return {state:'unknown'};return {state:'committed',result:receipt.result};}));
 }
 recoverySources(draft){
  const {kind,ownerId,operation,sourceRecordIds=[]}=draft||{};
  if(kind!=='context_item'||!uuid(ownerId)||!Array.isArray(sourceRecordIds)||sourceRecordIds.length||operation?.type!=='PAIA_CONTEXT_CARDS_CHANGE'||operation.change?.kind!=='put'||operation.change.itemId!==ownerId)fail();
  validateContextChange(operation.change,{draft:true});if(operation.change.epoch!==draft.epoch)fail('CONTEXT_INVALIDATED');
  return this.s.run(()=>this.s.repository.transaction(false,async t=>{await this.admitted(t,draft.epoch);const row=await this.row(t),item=row.items.find(x=>x.id===ownerId);if(item?.lifecycle==='removed'||!item&&operation.change.expectedRevision!==0)fail('CONTEXT_INVALIDATED');return [];}));
 }
}

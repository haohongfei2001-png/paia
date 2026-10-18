import {CONSENT_VERSION} from '../constants.js';
import {digest,equal,exact,fail,integer,token} from './contracts.js';
import {DIRTY_PREFIX} from './delta.js';

// An ephemeral capability minted only by the existing human Context change
// owner. Neither a request field, arbitrary meta write nor a replayed receipt
// can claim that the original transaction observed unchanged interpretation.
const prepared=new WeakMap();
const semantic=item=>{const {revision,updatedAt,protected:protection,userEdited,...rest}=item;return rest;};
export async function prepareContextProtectionCorrection(before,change,operationDigest){
 if(!token(operationDigest)||change.kind!=='put'||!before||before.origin!=='automatic'||before.lifecycle!=='active'||before.protected!==false||before.userEdited!==false||before.revision!==change.expectedRevision||before.card!==(change.card??'info')||before.body!==change.body||before.section!==change.section)return null;
 const handle=Object.freeze({});prepared.set(handle,{before:structuredClone(before),receiptId:'context:'+change.operationId,receiptDigest:operationDigest,epoch:change.epoch,semanticDigest:await digest(semantic(before))});return handle;
}
export async function recordContextProtectionCorrection(t,handle,before,after,receipt){
 const proof=prepared.get(handle);if(!proof)return;prepared.delete(handle);
 if(!equal(proof.before,before)||!equal(semantic(before),semantic(after))||after.revision!==before.revision+1||after.protected!==true||after.userEdited!==true)return;
 const key=JSON.stringify(['context_item',after.id]),change=t.semanticChanges?.get(JSON.stringify([key,after.id]));
 if(!change||change.after.revision!==after.revision||await t.get('meta',DIRTY_PREFIX+key))return;
 if(receipt.id!==proof.receiptId||receipt.digest!==proof.receiptDigest||receipt.epoch!==proof.epoch||receipt.namespace!=='context-cards'||receipt.schemaVersion!==1||receipt.ownerId!==after.id||receipt.result?.ok!==true||receipt.result.itemId!==after.id||receipt.result.revision!==after.revision||receipt.result.lifecycle!=='active'||receipt.result.deletedBy!==null||!token(receipt.digest))return;
 if(!equal(await t.get('operationReceipts',receipt.id),receipt))return;
 change.after.localCorrection={version:1,kind:'protection_only',beforeRevision:before.revision,receiptId:receipt.id,receiptDigest:receipt.digest,epoch:receipt.epoch,semanticDigest:proof.semanticDigest};
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

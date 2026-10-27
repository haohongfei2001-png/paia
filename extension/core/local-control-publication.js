import {CONTROL_PUBLICATION_REVISION,CONTROL_PUBLICATION_RESERVATION} from './local-control-publication-keys.js';
export {CONTROL_PUBLICATION_REVISION,CONTROL_PUBLICATION_RESERVATION} from './local-control-publication-keys.js';
import {chargeOriginalApplicationSelectionScopeOperands,readOriginalApplicationSelectionMetaGroup} from './idb-repository.js';
import {ArchiveError} from './constants.js';
import {hashText} from './dedupe.js';
import {requireConsumerPublicationSettled} from './browser-native-sync/consumer-publication-state.js';

const refuse=code=>{throw new ArchiveError(code);};
const exact=(value,keys)=>value&&Object.getPrototypeOf(value)===Object.prototype&&Reflect.ownKeys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));

// Hash only outside an IndexedDB transaction. The bounded typed representation
// distinguishes undefined, missing fields and signed zero; it is never stored.
export function controlPublicationEncoding(value){
 let nodes=0,characters=0;const seen=new Set();
 const visit=(value,depth)=>{
  if(++nodes>8192||depth>16)refuse('CONTROL_PUBLICATION_LIMIT');
  if(value===undefined)return ['undefined'];if(value===null)return ['null'];
  if(typeof value==='boolean')return ['boolean',value];
  if(typeof value==='number'){if(!Number.isFinite(value))refuse('CONTROL_PUBLICATION_INVALID');return ['number',Object.is(value,-0)?'-0':String(value)];}
  if(typeof value==='string'){characters+=value.length;if(characters>4194304)refuse('CONTROL_PUBLICATION_LIMIT');return ['string',value];}
  if(!value||typeof value!=='object'||![Object.prototype,null,Array.prototype].includes(Object.getPrototypeOf(value))||seen.has(value))refuse('CONTROL_PUBLICATION_INVALID');
  seen.add(value);const descriptors=Object.getOwnPropertyDescriptors(value),keys=Reflect.ownKeys(descriptors);
  if(keys.length>8192||keys.some(key=>typeof key!=='string'||!Object.hasOwn(descriptors[key],'value')))refuse('CONTROL_PUBLICATION_INVALID');
  const entries=[];for(const key of keys.sort()){characters+=key.length;if(characters>4194304)refuse('CONTROL_PUBLICATION_LIMIT');entries.push([key,visit(descriptors[key].value,depth+1)]);}
  return [Array.isArray(value)?'array':'object',entries];
 };
 return JSON.stringify(visit(value,0));
}
export const controlPublicationDigest=value=>hashText(controlPublicationEncoding(value));
export const controlPublicationEqual=(a,b)=>controlPublicationEncoding(a)===controlPublicationEncoding(b);
export function validateControlPublicationStamp(stamp){if(!exact(stamp,['version','revision','nonce'])||stamp.version!==1||!Number.isSafeInteger(stamp.revision)||stamp.revision<1||typeof stamp.nonce!=='string'||!/^[A-Za-z0-9_-]{8,128}$/.test(stamp.nonce))refuse('CONTROL_PUBLICATION_INVALID');return stamp;}
export function controlPublicationRow(control,databaseId,reservation){const controlPublication=validateControlPublicationStamp({version:1,revision:reservation.revision,nonce:reservation.nonce});return {schemaVersion:6,databaseId,...control,controlPublication};}
export async function readControlPublicationFence(t){
 const [revision,reservation]=await readOriginalApplicationSelectionMetaGroup(t,[CONTROL_PUBLICATION_REVISION,CONTROL_PUBLICATION_RESERVATION]);
 if(revision!==undefined&&(!exact(revision,['id','version','revision'])||revision.id!==CONTROL_PUBLICATION_REVISION||revision.version!==1||!Number.isSafeInteger(revision.revision)||revision.revision<1))refuse('CONTROL_PUBLICATION_INVALID');
 if(reservation!==undefined&&(!exact(reservation,['id','version','revision','nonce','databaseId','beforeDigest','afterDigest','fenceDigest'])||reservation.id!==CONTROL_PUBLICATION_RESERVATION||reservation.version!==1||reservation.revision!==revision?.revision||typeof reservation.nonce!=='string'||!/^[A-Za-z0-9_-]{8,128}$/.test(reservation.nonce)||typeof reservation.databaseId!=='string'||reservation.databaseId.length>128||typeof reservation.beforeDigest!=='string'||!/^[a-f0-9]{64}$/.test(reservation.beforeDigest)||!['afterDigest','fenceDigest'].every(key=>reservation[key]===null||typeof reservation[key]==='string'&&/^[a-f0-9]{64}$/.test(reservation[key]))))refuse('CONTROL_PUBLICATION_INVALID');
 // The original validation above precedes accepting any of these requests.
 // The repository helper keeps each real get and the ordinary sequential path.
 const [migration,gate,epoch]=await readOriginalApplicationSelectionMetaGroup(t,['migration','gate','recovery-restore-epoch']);
 return {revision:revision?.revision??0,reservation,migration,gate,epoch};
}
export async function reserveControlPublication(t,before,{nonce,databaseId,beforeDigest}){
 try{await requireConsumerPublicationSettled(t);}catch(error){if(error.code==='BNS_CONSUMER_PUBLICATION_PENDING')refuse(error.code);throw error;}
 const current=await readControlPublicationFence(t);
 if(current.reservation)refuse('CONTROL_PUBLICATION_PENDING');
 chargeOriginalApplicationSelectionScopeOperands(t,[current,before],0);if(!controlPublicationEqual(current,before))refuse('CONTROL_PUBLICATION_CHANGED');
 if(current.revision>=Number.MAX_SAFE_INTEGER)refuse('CONTROL_PUBLICATION_LIMIT');
 if(typeof beforeDigest!=='string'||!/^[a-f0-9]{64}$/.test(beforeDigest))refuse('CONTROL_PUBLICATION_REQUIRED');
 const reservation={id:CONTROL_PUBLICATION_RESERVATION,version:1,revision:current.revision+1,nonce,databaseId,beforeDigest,afterDigest:null,fenceDigest:null};
 await t.put('meta',{id:CONTROL_PUBLICATION_REVISION,version:1,revision:reservation.revision});await t.put('meta',reservation);
 return reservation;
}
export async function requireControlPublicationOwner(t,reservation,expected){
 const current=await readControlPublicationFence(t);
 chargeOriginalApplicationSelectionScopeOperands(t,[current.reservation,reservation,...(expected?[{migration:current.migration,gate:current.gate,epoch:current.epoch},expected]:[])],0);if(!controlPublicationEqual(current.reservation,reservation)||current.revision!==reservation.revision||expected&&!controlPublicationEqual({migration:current.migration,gate:current.gate,epoch:current.epoch},expected))refuse('CONTROL_PUBLICATION_CHANGED');
 return current;
}
export async function renewControlPublication(t,reservation,fences,{nonce,beforeDigest}){
 const current=await requireControlPublicationOwner(t,reservation,fences);if(current.revision>=Number.MAX_SAFE_INTEGER)refuse('CONTROL_PUBLICATION_LIMIT');if(nonce===reservation.nonce||typeof nonce!=='string'||!/^[A-Za-z0-9_-]{8,128}$/.test(nonce)||typeof beforeDigest!=='string'||!/^[a-f0-9]{64}$/.test(beforeDigest))refuse('CONTROL_PUBLICATION_INVALID');
 const next={...reservation,revision:current.revision+1,nonce,beforeDigest,afterDigest:null,fenceDigest:null};await t.put('meta',{id:CONTROL_PUBLICATION_REVISION,version:1,revision:next.revision});await t.put('meta',next);return next;
}

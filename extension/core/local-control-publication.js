import {ArchiveError} from './constants.js';
import {hashText} from './dedupe.js';
import {requireConsumerPublicationSettled} from './browser-native-sync/consumer-publication-state.js';

export const CONTROL_PUBLICATION_REVISION='local-control-publication:revision';
export const CONTROL_PUBLICATION_RESERVATION='local-control-publication:reservation';
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
export async function readControlPublicationFence(t){
 const revision=await t.get('meta',CONTROL_PUBLICATION_REVISION),reservation=await t.get('meta',CONTROL_PUBLICATION_RESERVATION);
 if(revision!==undefined&&(!exact(revision,['id','version','revision'])||revision.id!==CONTROL_PUBLICATION_REVISION||revision.version!==1||!Number.isSafeInteger(revision.revision)||revision.revision<1))refuse('CONTROL_PUBLICATION_INVALID');
 if(reservation!==undefined&&(!exact(reservation,['id','version','revision','nonce','databaseId','afterDigest','fenceDigest'])||reservation.id!==CONTROL_PUBLICATION_RESERVATION||reservation.version!==1||reservation.revision!==revision?.revision||typeof reservation.nonce!=='string'||!/^[A-Za-z0-9_-]{8,128}$/.test(reservation.nonce)||typeof reservation.databaseId!=='string'||reservation.databaseId.length>128||!['afterDigest','fenceDigest'].every(key=>reservation[key]===null||typeof reservation[key]==='string'&&/^[a-f0-9]{64}$/.test(reservation[key]))))refuse('CONTROL_PUBLICATION_INVALID');
 return {revision:revision?.revision??0,reservation,migration:await t.get('meta','migration'),gate:await t.get('meta','gate'),epoch:await t.get('meta','recovery-restore-epoch')};
}
export async function reserveControlPublication(t,before,{nonce,databaseId}){
 await requireConsumerPublicationSettled(t);
 const current=await readControlPublicationFence(t);
 if(current.reservation)refuse('CONTROL_PUBLICATION_PENDING');
 if(!controlPublicationEqual(current,before))refuse('CONTROL_PUBLICATION_CHANGED');
 if(current.revision>=Number.MAX_SAFE_INTEGER)refuse('CONTROL_PUBLICATION_LIMIT');
 const reservation={id:CONTROL_PUBLICATION_RESERVATION,version:1,revision:current.revision+1,nonce,databaseId,afterDigest:null,fenceDigest:null};
 await t.put('meta',{id:CONTROL_PUBLICATION_REVISION,version:1,revision:reservation.revision});await t.put('meta',reservation);
 return reservation;
}
export async function requireControlPublicationOwner(t,reservation,expected){
 const current=await readControlPublicationFence(t);
 if(!controlPublicationEqual(current.reservation,reservation)||current.revision!==reservation.revision||expected&&!controlPublicationEqual({migration:current.migration,gate:current.gate,epoch:current.epoch},expected))refuse('CONTROL_PUBLICATION_CHANGED');
 return current;
}

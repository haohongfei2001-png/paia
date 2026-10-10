import {PROMPT_REUSE_ROW,MAX_PROMPT_TEXT} from '../prompt-reuse-preferences.js';
import {fail} from './value.js';

// A selected physical shape only, never domain validation or a Scope grant.
// The native owner must prepay this phase before descriptors/key vectors and
// call the original validator/projector afterward under the same work ticket.
const refused=()=>fail('BNS_GROUP_CANONICAL_UNREPRESENTED');
function ownData(object,key){
 const descriptor=Object.getOwnPropertyDescriptor(object,key);
 if(!descriptor||!Object.hasOwn(descriptor,'value')||!descriptor.enumerable)refused();
 return descriptor.value;
}
function fields(object,names){
 if(!object||typeof object!=='object'||Array.isArray(object)||![Object.prototype,null].includes(Object.getPrototypeOf(object))||Object.getOwnPropertySymbols(object).length||'toJSON'in object)refused();
 const keys=Object.getOwnPropertyNames(object);if(keys.length!==names.length||!keys.every(key=>names.includes(key)))refused();
}
function dense(array,maximum){
 if(!Array.isArray(array)||Object.getPrototypeOf(array)!==Array.prototype||array.length>maximum||Object.getOwnPropertySymbols(array).length||'toJSON'in array)refused();
 const keys=Object.getOwnPropertyNames(array);if(keys.length!==array.length+1||Object.keys(array).length!==array.length)refused();
 for(let index=0;index<array.length;index++)ownData(array,String(index));
}
const manual=value=>typeof value==='string'&&/^manual:[a-f0-9-]{36}$/.test(value);
export function assertManualPromptCurrentPhysicalShape(row){
 // Original native metering already rejects this pollution at capture entry;
 // repeat before this new synchronous phase, without changing that meter.
 if('value'in Object.prototype)refused();
 fields(row,['id','version','revision','pins','overrides','splits']);
 const id=ownData(row,'id'),version=ownData(row,'version'),revision=ownData(row,'revision');
 if(id!==PROMPT_REUSE_ROW||version!==1||!Number.isSafeInteger(revision)||revision<0)refused();
 const pins=ownData(row,'pins'),overrides=ownData(row,'overrides'),splits=ownData(row,'splits');dense(pins,500);dense(overrides,500);dense(splits,0);
 for(let index=0;index<pins.length;index++)if(!manual(ownData(pins,String(index))))refused();
 for(let index=0;index<overrides.length;index++){
  const item=ownData(overrides,String(index));fields(item,['id','text','hidden','reuseCount']);if('representative'in item)refused();
  const itemId=ownData(item,'id'),text=ownData(item,'text'),hidden=ownData(item,'hidden'),reuseCount=ownData(item,'reuseCount');
  if(!manual(itemId)||typeof text!=='string'||text.length>MAX_PROMPT_TEXT||typeof hidden!=='boolean'||!Number.isSafeInteger(reuseCount)||reuseCount<0||reuseCount>1000000)refused();
 }
 return true;
}

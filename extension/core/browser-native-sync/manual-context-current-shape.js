import {CONTEXT_CARDS_ROW,CONTEXT_LIMITS} from '../context-cards.js';
import {fail} from './value.js';

// Physical manual-only data, not a causal proof, domain validator or grant.
// Not wired to current Scope. A future original native owner must prepay the
// entire selected phase and independently validate the original journal chain.
// Ordinary native structured-clone data only; no Proxy or native-heap claim.
const refused=()=>fail('BNS_GROUP_CANONICAL_UNREPRESENTED');
const cards=['info','rules','now'];
const accessKeys=['global',...cards,'inputs'];
const itemKeys=['id','card','body','section','revision','order','origin','protected','userEdited','lifecycle','createdAt','updatedAt','deletedBy'];
const count=value=>Number.isSafeInteger(value)&&value>=0;
const uuid=value=>typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value);
function ownData(object,key){
 const descriptor=Object.getOwnPropertyDescriptor(object,key);
 if(!descriptor||!Object.hasOwn(descriptor,'value')||!descriptor.enumerable)refused();
 return descriptor.value;
}
function fields(object,names){
 if(!object||typeof object!=='object'||Array.isArray(object)||![Object.prototype,null].includes(Object.getPrototypeOf(object))||Object.getOwnPropertySymbols(object).length||'toJSON'in object)refused();
 const keys=Object.getOwnPropertyNames(object);
 if(keys.length!==names.length||!keys.every(key=>names.includes(key)))refused();
}
function dense(array,maximum){
 if(!Array.isArray(array)||Object.getPrototypeOf(array)!==Array.prototype||array.length>maximum||Object.getOwnPropertySymbols(array).length||'toJSON'in array)refused();
 const keys=Object.getOwnPropertyNames(array);
 if(keys.length!==array.length+1||Object.keys(array).length!==array.length)refused();
 for(let index=0;index<array.length;index++)ownData(array,String(index));
}
export function assertManualContextCurrentPhysicalShape(row){
 if('value'in Object.prototype)refused();
 fields(row,['id','version','sequence','access','items']);
 if(ownData(row,'id')!==CONTEXT_CARDS_ROW||ownData(row,'version')!==1||!count(ownData(row,'sequence')))refused();
 const access=ownData(row,'access');fields(access,accessKeys);
 for(const key of accessKeys){
  const desired=ownData(access,key);fields(desired,['enabled','revision']);
  if(typeof ownData(desired,'enabled')!=='boolean'||!count(ownData(desired,'revision')))refused();
  // Global effective permission is local-only and must remain off. Its local
  // revision is not transformed into a portable desired-state operation.
  if(key==='global'&&ownData(desired,'enabled')!==false)refused();
 }
 const items=ownData(row,'items');dense(items,CONTEXT_LIMITS.items);
 for(let index=0;index<items.length;index++){
  const item=ownData(items,String(index));fields(item,itemKeys);
  if(!uuid(ownData(item,'id'))||!cards.includes(ownData(item,'card'))||ownData(item,'origin')!=='manual'||ownData(item,'protected')!==true||ownData(item,'userEdited')!==true)refused();
  const body=ownData(item,'body'),section=ownData(item,'section'),revision=ownData(item,'revision'),order=ownData(item,'order'),deletedBy=ownData(item,'deletedBy');
  if(typeof body!=='string'||body.length>CONTEXT_LIMITS.body||typeof section!=='string'||section.length>80||!count(revision)||revision<1||!count(order)||!['active','removed'].includes(ownData(item,'lifecycle'))||typeof ownData(item,'createdAt')!=='string'||typeof ownData(item,'updatedAt')!=='string'||deletedBy!==null&&!uuid(deletedBy))refused();
 }
 return true;
}

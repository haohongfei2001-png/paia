import {types} from 'node:util';
import {exactData,snapshotRequest} from './signed-identity.mjs';
import {snapshotResultEvidence} from '../../extension/core/ai-usage/result-finalization.js';

const fail=()=>{throw Object.assign(Error('RESULT_DECLARATION_INVALID'),{code:'RESULT_DECLARATION_INVALID'});};
const text=value=>typeof value==='string'&&value.length>0&&value.length<=200&&value.isWellFormed()&&!/[\u0000-\u001f\u007f]/u.test(value);
function exact(value,keys){if(types.isProxy(value))fail();try{exactData(value,keys);}catch{fail();}}
// Syntax/binding only. Authentication and immutable financial verification are
// server responsibilities; actual domain commit/failure belongs to the client.
export function snapshotResultDeclaration(request,value){
 try{
  if(types.isProxy(request))fail();const r=snapshotRequest(request);
  exact(value,['receiptId','jobId','outcome','children']);
  if(r.childIndex!==0||!text(value.receiptId)||value.jobId!==r.jobId||!['COMMITTED','FAILED'].includes(value.outcome)||
   !Array.isArray(value.children)||types.isProxy(value.children)||Object.getPrototypeOf(value.children)!==Array.prototype)fail();
  const descriptors=Object.getOwnPropertyDescriptors(value.children),length=descriptors.length.value;
  if(length<1||length>4||Reflect.ownKeys(descriptors).length!==length+1)fail();
  const children=[];
  for(let i=0;i<length;i++){
   const d=descriptors[i];if(!d?.enumerable||!Object.hasOwn(d,'value'))fail();
   const child=d.value;exact(child,['operationId','receiptId']);
   if(!text(child.operationId)||!(child.receiptId===null||text(child.receiptId)))fail();
   children.push(Object.freeze({operationId:child.operationId,receiptId:child.receiptId}));
  }
  const result={receiptId:value.receiptId,jobId:value.jobId,outcome:value.outcome,children};
  snapshotResultEvidence(result);return Object.freeze({...result,children:Object.freeze(children)});
 }catch{fail();}
}
export function snapshotResultBundle(input){
 exact(input,['request','principalToken','entitlementToken']);
 if(types.isProxy(input.request)||!['principalToken','entitlementToken'].every(key=>typeof input[key]==='string'&&input[key].length>0&&input[key].length<=8192))fail();
 return Object.freeze({request:snapshotRequest(input.request),principalToken:input.principalToken,entitlementToken:input.entitlementToken});
}

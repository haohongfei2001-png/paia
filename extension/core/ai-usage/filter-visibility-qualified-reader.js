import * as organize from '../../background/organize-processing-policy.js';
import {readAIFilterHistoricalReaderBinding,readAIFilterHistoricalReaderProof,assertAIFilterHistoricalReaderCurrent,assertAIFilterHistoricalReaderFacts} from './filter-visibility-read-session.js';
import {ArchiveError} from '../constants.js';
import {snapshot,freeze} from './qwen-request-data.js';

// No public constructor accepts a DTO, callback or raw transaction. Only an
// original source history lease plus the original consumer admission can reach
// the private raw-reader closure. It returns data only to the Filter owner.
const caps=new WeakMap(),readers=new WeakMap(),encoder=new TextEncoder();
const fail=()=>{throw new ArchiveError('UNAVAILABLE');},need=x=>{if(!x)fail();};
const own=(value,key)=>{const d=Object.getOwnPropertyDescriptor(value??{},key);need(d&&Object.hasOwn(d,'value'));return d.value;};
const optional=(value,key)=>Object.hasOwn(value??{},key)?own(value,key):undefined;
const scalar=value=>{need(value===null||['string','boolean'].includes(typeof value)||typeof value==='number'&&Number.isFinite(value));if(typeof value==='string')need(value.length<=65536);return value;};
const text=value=>{need(typeof value==='string'&&value.length<=4096&&encoder.encode(value).length<=4096);return value;};
const array=(value,max,project)=>{need(Array.isArray(value));const length=own(value,'length');need(Number.isSafeInteger(length)&&length>=0&&length<=max&&Reflect.ownKeys(value).length===length+1);return Array.from({length},(_,i)=>project(own(value,String(i))));};
const pick=(value,keys)=>Object.fromEntries(Reflect.ownKeys(value??{}).filter(k=>keys.includes(k)).map(k=>[k,scalar(own(value,k))]));
const ordered=(original,projected)=>Object.fromEntries(Reflect.ownKeys(original).filter(k=>Object.hasOwn(projected,k)).map(k=>[k,projected[k]]));
const small=value=>snapshot(value,{maxBytes:8192,maxKeys:256,maxDepth:6,maxString:4096});
function sameData(actual,expected,depth=0,budget={keys:0}){
 if(Object.is(actual,expected))return true;if(depth>18||!actual||!expected||typeof actual!=='object'||typeof expected!=='object'||Array.isArray(actual)!==Array.isArray(expected))return false;
 const a=Reflect.ownKeys(actual),e=Reflect.ownKeys(expected);if(a.length!==e.length||(budget.keys+=e.length)>8192)return false;
 return e.every(k=>{const d=Object.getOwnPropertyDescriptor(actual,k);return d&&Object.hasOwn(d,'value')&&sameData(d.value,expected[k],depth+1,budget);});
}
function state(cap,store,consumerReader,inputId){const r=caps.get(cap);need(r&&r.store===store&&r.consumerReader===consumerReader&&r.inputId===inputId&&r.active);return r;}
function facts(r){try{need(r.active);organize.assertOriginalOrganizeFilterAdmissionFacts(r.admission,r.store,r.consumerReader,r.inputId);assertAIFilterHistoricalReaderFacts(r.cap,r.store,r.admission);return true;}catch(error){r.active=false;throw error;}}
function current(r){try{need(r.active);assertAIFilterHistoricalReaderCurrent(r.cap,r.store,r.admission);return facts(r);}catch(error){r.active=false;throw error;}}
export function readAIFilterQualifiedConsumer(cap,store,consumerReader,inputId){
 let r=caps.get(cap);
 if(!r){
  const binding=readAIFilterHistoricalReaderBinding(cap,store),admission=binding.admission,scope=binding.scope;
  organize.assertOriginalOrganizeFilterAdmissionFacts(admission,store,consumerReader,inputId);need(scope.inputId===inputId);
  const selected=organize.readOriginalOrganizeFilterAdmission(admission,store);assertAIFilterHistoricalReaderCurrent(cap,store,admission);
  const proof=readAIFilterHistoricalReaderProof(cap,store,admission),inputs=new Set([...scope.candidateIds,...scope.neighborIds]),sources=new Map(scope.sources.map(x=>[x.recordId,x.sourceKey]));
  r={cap,store,consumerReader,inputId,admission,scope,proof,inputs,sources,active:true,reader:null,settings:selected.settings.settings,sourceIndexes:new Map(),tombstones:new Set(),gets:new Set(),counts:new Set(),reads:0,bytes:0,retained:new Map()};caps.set(cap,r);
  try{current(r);r.reader=organize.originalOrganizeFilterQualifiedReader(admission,store,consumerReader,cap);need(r.reader&&Object.isFrozen(r.reader));readers.set(r.reader,r);current(r);}catch(error){r.active=false;throw error;}
 }
 r=state(cap,store,consumerReader,inputId);current(r);return Object.freeze({reader:r.reader,settings:r.settings});
}
export function assertAIFilterQualifiedConsumerCurrent(cap,store,consumerReader,inputId){return current(state(cap,store,consumerReader,inputId));}
export function assertAIFilterQualifiedConsumerFacts(cap,store,consumerReader,inputId){return facts(state(cap,store,consumerReader,inputId));}
export function assertAIFilterQualifiedConsumerTransaction(reader,repository){const r=readers.get(reader);need(r&&r.reader===reader);organize.assertOriginalOrganizeFilterAdmissionFacts(r.admission,r.store,r.consumerReader,r.inputId);need(own(r.store,'repository')===repository);return current(r);}
function forAdmission(cap,store,admission){const r=caps.get(cap);need(r&&r.store===store&&r.admission===admission);return r;}
const metaFields={migration:['id','phase','databaseId'],'thought-library':['id','phase','schemaVersion','verified','sealed'],'recovery-restore-epoch':['id','value'],gate:['id','enabled','epoch'],'smart-filter':['id','mode','phase','filterVersion','policyVersion','classifierVersion','policyEpoch','decisionSequence']};
function rangeData(range){
 need(range instanceof IDBKeyRange);const result={};
 for(const key of ['lower','upper','lowerOpen','upperOpen']){
  const d=Object.getOwnPropertyDescriptor(range,key);
  if(d){need(Object.hasOwn(d,'value'));result[key]=d.value;}
  else {const original=Object.getOwnPropertyDescriptor(IDBKeyRange.prototype,key);need(original&&typeof original.get==='function');result[key]=original.get.call(range);}
 }
 return result;
}
function countAllowed(r,table,index,range){
 if(table!=='blockIndex'||index!=='byList')return false;const bounds=rangeData(range);if(bounds.lowerOpen||bounds.upperOpen)return false;
 for(const candidate of r.proof.snapshot.items)for(const neighbor of r.proof.neighbors){
  if(candidate.row.documentId!==neighbor.documentId)continue;
  if(sameData(bounds.lower,candidate.position)&&sameData(bounds.upper,neighbor.position)||sameData(bounds.lower,neighbor.position)&&sameData(bounds.upper,candidate.position))return true;
 }return false;
}
function readKey(method,args){if(method==='get')return JSON.stringify([method,...args]);const [table,index,range]=args;return JSON.stringify([method,table,index,rangeData(range)]);}
export function requireAIFilterHistoricalReadRequest(cap,store,admission,method,args){
 const r=forAdmission(cap,store,admission);current(r);need(Array.isArray(args));
 if(method==='get'){
  need(args.length===2);const [table,key]=args;need(typeof table==='string'&&typeof key==='string');
  need(table==='meta'&&Object.hasOwn(metaFields,key)||['blocks','inputStates','filterInputs','blockIndex'].includes(table)&&r.inputs.has(key)||['records','recordIndex'].includes(table)&&r.sources.has(key)||table==='filterIntents'&&[...r.sources.values()].includes(key)||table==='tombstones'&&r.tombstones.has(key));
  r.gets.add(JSON.stringify(args));need(r.gets.size<=93); // Original owner 92, plus the binding's migration metadata key.
 }else{need(method==='count'&&args.length===3&&countAllowed(r,...args));const [table,index,range]=args;r.counts.add(readKey(method,args));need(r.counts.size<=16);}
 // Every request is also charged to the same original action ledger.
 need(++r.reads<=4096);facts(r);
 const safe=method==='get'?[args[0],args[1]]:(()=>{const bounds=rangeData(args[2]);return [args[0],args[1],IDBKeyRange.bound(small(bounds.lower),small(bounds.upper),false,false)];})();
 return Object.freeze({method,args:Object.freeze(safe)});
}
export function projectAIFilterHistoricalRead(cap,store,admission,method,args,value){
 const r=forAdmission(cap,store,admission);try{current(r);let out=value;
 if(method==='count'){need(Number.isSafeInteger(value)&&value>=0);out=value;}
 else if(value!==null&&value!==undefined){
  const [table,key]=args;need(own(value,'id')===key);
  if(table==='meta')out=pick(value,metaFields[key]);
  else if(table==='blocks'){
   const b=own(value,'value');need(own(b,'id')===key);
   const body=pick(b,['id','documentId','originalTextReference','excluded','branchStatus','editedAt','libraryText','note']);
   body.provenance=array(own(b,'provenance'),1,x=>pick(x,['sourceRecordId']));
   for(const field of ['libraryText','note'])if(body[field]!==null&&body[field]!==undefined)text(body[field]);
   if(Object.hasOwn(b,'mergedSourceIds'))body.mergedSourceIds=array(own(b,'mergedSourceIds'),1,x=>{need(typeof x==='string'&&x.length<=200);return x;});
   out={id:key,value:body};
  }else if(table==='inputStates')out=pick(value,['id','contentRevision','lastRemovalSequence','removalState','sourcePurged']);
  else if(table==='records'){const body=own(value,'value');out={id:key,value:{originalText:text(own(body,'originalText'))}};}
  else if(table==='recordIndex'){
   out=pick(value,['id','sourceKey','dedupeKey']);need((out.sourceKey||'legacy:'+key)===r.sources.get(key));const prior=r.sourceIndexes.get(key);if(prior)need(sameData(out,prior));else{r.sourceIndexes.set(key,Object.freeze(out));r.tombstones.add('source:'+out.sourceKey);r.tombstones.add('snapshot:'+out.dedupeKey);}
  }else if(table==='blockIndex'){out=pick(value,['id','excluded']);out.listKey=small(own(value,'listKey'));}
  else if(table==='filterIntents'||table==='tombstones')out={id:key};
  else if(table==='filterInputs'){
   out=pick(value,['id','documentId','authorship','userEdited','filterOverride','evaluationRevision','pendingKey','decision','reasonCode','filterVersion','policyVersion','classifierVersion','basedOnContentRevision','aiOperationId','presenceInvalid','evaluatedAt','failed','decisionSequence','overrideReason','overrideAt']);
   if(Object.hasOwn(value,'presence')){const p=own(value,'presence');out.presence=p===null?null:pick(p,['version','attachment','reference','confidence']);}
   if(Object.hasOwn(value,'aiDecision')){
    const d=own(value,'aiDecision');if(d===null)out.aiDecision=null;else{
     const proof=own(d,'proof');need(sameData(proof,r.proof));
     out.aiDecision={...pick(d,['version','sequence']),policy:pick(own(d,'policy'),['version','qualificationId']),authority:pick(own(d,'authority'),['entitlement','optIn','processing','userRead']),scope:{candidateIds:small(own(own(d,'scope'),'candidateIds')),neighborIds:small(own(own(d,'scope'),'neighborIds'))},proof:r.proof};
    }
   }
   out=ordered(value,out);
  }else fail();
 }
 const serialized=out===undefined?'undefined':JSON.stringify(out),size=encoder.encode(serialized).length,key=readKey(method,args);need(size<=65536);
 const prior=r.retained.get(key);if(prior!==undefined)need(prior===serialized);else{need((r.bytes+=size)<=9*65536);r.retained.set(key,serialized);}
 facts(r);return Object.freeze({value:freeze(out),bytes:size});
 }catch(error){r.active=false;throw error;}
}

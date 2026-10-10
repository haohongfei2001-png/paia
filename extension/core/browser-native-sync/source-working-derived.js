import {recordIndex,blockIndex,sourceCount,chatOf} from '../idb-repository.js';
import {requireOriginalCurrentSourceWorkingGroupScope} from './group-checkpoint-scope.js';
import {measureSourceWorkingPhysicalTree,equalSourceWorkingPhysicalTree} from './source-working-physical.js';
import {fail} from './value.js';

const own=Object.hasOwn,descriptor=Object.getOwnPropertyDescriptor,names=Object.getOwnPropertyNames,array=Array.isArray;
const invalid=()=>fail('BNS_SOURCE_WORKING_PHYSICAL_INVALID');
// Call only after the native caller has prepaid the full meter/comparison and
// original builder frames. This pure check neither opens a read nor mints a cap.
export function assertSourceWorkingSpecialScalars(store,row){
 measureSourceWorkingPhysicalTree(row);
 const visit=(value,path)=>{
  if(value===undefined){if(store!=='recordIndex'||path.length!==1||path[0]!=='legacyChat'||typeof row.sourceKey!=='string'||!row.sourceKey)invalid();return;}
  if(typeof value==='number'&&Object.is(value,-0)){
   if(store!=='documents'||path.length!==2||!['displayKey','libraryDisplay','archiveDisplay','excludedDisplay'].includes(path[0])||path[1]!=='0')invalid();return;
  }
  if(!value||typeof value!=='object')return;
  for(const key of names(value)){if(array(value)&&key==='length')continue;const d=descriptor(value,key);if(!d||!own(d,'value'))invalid();visit(d.value,[...path,key]);}
 };
 visit(row,[]);
}

// Exact formation of the four derived families in the first initial-source
// profile. No callback, supplied expected DTO, JSON normalization or duplicate
// index builder: original Scope and original repository builders supply values.
// Scope identity is not proof that the caller's rows came from native IDB.
export function assertSourceWorkingDerivedRows(core,scope,plan,rows){
 if(arguments.length!==4)invalid();requireOriginalCurrentSourceWorkingGroupScope(core,scope,plan);
 const source=scope.expected.records[0],block=scope.expected.blocks[0],doc=scope.expected.documents[0];
 const count=sourceCount(doc.id,source.sourceKey,[source],[block],source.chatId);
 const document={id:doc.id,chatKey:chatOf(source),sequence:0,displayKey:[-(Date.parse(doc.lastSourceSentAt)||0),doc.id],value:doc};
 for(const view of ['library','archive','excluded'])if(count[view+'Last'])document[view+'Display']=[-(Date.parse(count[view+'Last'][2])||0),doc.id];
 const expected={recordIndex:[recordIndex(source,0)],blockIndex:[blockIndex(block,0,[source])],sourceCounts:[count],documents:[document]};
 for(const name of Object.keys(expected)){
  const d=descriptor(rows,name);if(!d||!own(d,'value')||!array(d.value))invalid();
  measureSourceWorkingPhysicalTree(d.value);measureSourceWorkingPhysicalTree(expected[name]);
  for(const row of d.value)assertSourceWorkingSpecialScalars(name,row);
  if(!equalSourceWorkingPhysicalTree(d.value,expected[name]))fail('BNS_GROUP_CANONICAL_UNREPRESENTED');
 }
}

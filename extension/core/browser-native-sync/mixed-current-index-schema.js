import {LIBRARY_INDEXES} from '../thought-schema.js';
import {sourceWorkingCurrentStores} from './source-working-canonical.js';
import {sourceWorkingCurrentIndexSchema} from './source-working-index-schema.js';
import {fail} from './value.js';

// Complete existing v5 DDL, including empty stores. This is a physical schema
// description, not a new index, canonical representation or native capability.
// Defer the store vector until invocation to preserve the original MV3 cycle.
const additional={
 importEvidence:{bySource:'sourceKey'},importSources:{bySource:'sourceKey'},
 inputRemovals:{byBlock:'blockId'},
 thoughts:{byList:'listKey',bySourceRecord:{path:'sourceRecordIds',multiEntry:true}},
 categories:{byDimension:'dimension'},
 dependencies:{byInput:'inputId',byInputList:'inputList',byThought:'thoughtId'}
};
let schema;
export function mixedCurrentIndexSchema(){
 if(arguments.length)fail('BNS_SOURCE_WORKING_PHYSICAL_INVALID');
 if(schema)return schema;
 const result=Object.create(null);
 for(const name of sourceWorkingCurrentStores()){
  const indices=Object.create(null);
  for(const [index,definition]of Object.entries({...additional[name],...LIBRARY_INDEXES[name]})){
   const spec=typeof definition==='object'&&!Array.isArray(definition)?definition:{path:definition};
   indices[index]=Object.freeze({path:Array.isArray(spec.path)?Object.freeze([...spec.path]):spec.path,unique:spec.unique===true,multiEntry:spec.multiEntry===true});
  }
  // Original Source/IA definitions are reused exactly, never edited to make
  // the mixed profile pass. The original Source-only49 profile stays intact.
  for(const [index,spec]of Object.entries(sourceWorkingCurrentIndexSchema[name]??{}))indices[index]=spec;
  result[name]=Object.freeze(indices);
 }
 return schema=Object.freeze(result);
}
const descriptor=Object.getOwnPropertyDescriptor,own=Object.hasOwn;
function field(row,key){const d=descriptor(row,key);if(!d)return undefined;if(!own(d,'value'))fail('BNS_SOURCE_WORKING_PHYSICAL_INVALID');return d.value;}
export function mixedCurrentPhysicalIndexKey(store,index,row){
 if(arguments.length!==3||typeof store!=='string'||typeof index!=='string')fail('BNS_SOURCE_WORKING_PHYSICAL_INVALID');
 const specs=mixedCurrentIndexSchema();
 if(!own(specs,store)||!own(specs[store],index))fail('BNS_SOURCE_WORKING_PHYSICAL_INVALID');
 const spec=specs[store][index];
 if(Array.isArray(spec.path)){const key=spec.path.map(name=>field(row,name));return key.some(value=>value===undefined)?null:key;}
 const key=field(row,spec.path);return key===undefined?null:key;
}

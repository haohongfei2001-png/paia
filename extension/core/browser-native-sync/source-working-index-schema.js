import {LIBRARY_INDEXES} from '../thought-schema.js';
import {sourceWorkingCurrentNonemptyStores} from './source-working-canonical.js';
import {fail} from './value.js';

// Exact existing physical DDL, not a new index, query, reader or capability.
// Library definitions remain the original shared owner; the base Source/IA
// definitions below are checked against the original repository's actual DDL.
const base={
 recordIndex:{bySource:'sourceKey',byIdentity:['chatKey','sourceMessageId'],byChat:'chatKey',byLegacyChat:'legacyChat',byDedupe:{path:'dedupeKey',unique:true},bySequence:{path:'sequence',unique:true},byList:'listKey',byTrash:'trashKey',byHidden:'hiddenKey',byKnown:['chatKey','visibleKey','known']},
 blockIndex:{byDocument:'documentId',byRecord:{path:'recordIds',multiEntry:true},bySequence:{path:'sequence',unique:true},byTime:['documentId','known','stamp','id'],byExcluded:['documentId','excludedKey'],byAttached:'attachedDocument',byList:'listKey',byKnown:['documentId','excludedKey','known']},
 documents:{byChat:'chatKey',bySequence:{path:'sequence',unique:true},byDisplay:'displayKey',libraryDisplay:'libraryDisplay',archiveDisplay:'archiveDisplay',excludedDisplay:'excludedDisplay'},
 sourceCounts:{byDocument:'documentId',byView:{path:'views',multiEntry:true}},
 inputStates:{byDocument:'documentId'},
 revisions:{byEntity:'entityKey',byDocument:'documentId',byDocumentList:'documentList',bySourceRecord:{path:'sourceRecordIds',multiEntry:true},byList:'listKey'},
 filterInputs:{byDocument:'documentId',byPending:'pendingKey',byFiltered:'filteredKey'},
 invalidations:{byInput:'inputId'}
};
for(const view of ['library','archive','excluded'])for(const edge of ['First','Last'])base.sourceCounts[view+edge]=view+edge;
const specs={};
for(const name of sourceWorkingCurrentNonemptyStores){
 const definitions={...base[name],...LIBRARY_INDEXES[name]},indices={};
 for(const [index,definition]of Object.entries(definitions)){
  const spec=typeof definition==='object'&&!Array.isArray(definition)?definition:{path:definition};
  indices[index]=Object.freeze({path:Array.isArray(spec.path)?Object.freeze([...spec.path]):spec.path,unique:spec.unique===true,multiEntry:spec.multiEntry===true});
 }
 specs[name]=Object.freeze(indices);
}
export const sourceWorkingCurrentIndexSchema=Object.freeze(specs);
const descriptor=Object.getOwnPropertyDescriptor,own=Object.hasOwn;
function field(row,key){const d=descriptor(row,key);if(!d)return undefined;if(!own(d,'value'))fail('BNS_SOURCE_WORKING_PHYSICAL_INVALID');return d.value;}
// Only finite keyPath projection. A null result means the original index has no
// entry for a missing/undefined path; native identity/order/cmp remain the owner.
// Compound key vectors must be paid by the calling native task before creation.
export function sourceWorkingPhysicalIndexKey(store,index,row){
 if(arguments.length!==3||typeof store!=='string'||typeof index!=='string')fail('BNS_SOURCE_WORKING_PHYSICAL_INVALID');
 if(!own(sourceWorkingCurrentIndexSchema,store))fail('BNS_SOURCE_WORKING_PHYSICAL_INVALID');
 const definitions=sourceWorkingCurrentIndexSchema[store],spec=own(definitions,index)?definitions[index]:null;
 if(!spec)fail('BNS_SOURCE_WORKING_PHYSICAL_INVALID');
 if(Array.isArray(spec.path)){const key=spec.path.map(name=>field(row,name));return key.some(value=>value===undefined)?null:key;}
 const key=field(row,spec.path);return key===undefined?null:key;
}

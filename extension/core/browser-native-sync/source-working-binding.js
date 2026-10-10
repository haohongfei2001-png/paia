import {requireOriginalLibraryDocumentsStore} from '../library-documents-owner.js';
import {requireOriginalSourceWorkingCore} from './core.js';
import {assertOriginalSourceBootstrapOwner} from './source-bootstrap-journal.js';
import {assertOriginalFilterIntentOwner} from './filter-intent-journal.js';
import {assertOriginalInputWorkingOwner} from './input-working-journal.js';
import {fail} from './value.js';
const descriptor=Object.getOwnPropertyDescriptor,own=Object.hasOwn;
function data(object,key,optional=false){const d=descriptor(object,key);if(!d){if(optional)return undefined;fail('BNS_SOURCE_WORKING_OWNER_REQUIRED');}if(!own(d,'value'))fail('BNS_SOURCE_WORKING_OWNER_REQUIRED');return d.value;}
// Fixed original-owner readiness only. Neither this body-free binding record nor
// its equality is a native cut, Scope, read, transport or restoration capability.
export function requireSourceWorkingStoreBinding(store,core,previous=null){
 if(arguments.length<2||arguments.length>3)fail('BNS_SOURCE_WORKING_OWNER_REQUIRED');
 requireOriginalLibraryDocumentsStore(store);requireOriginalSourceWorkingCore(core);
 for(const key of ['libraryDocumentMode','loaded','iaLoaded','filterLoaded','foundationLoaded','bindingsLoaded','documentsLoaded'])if(data(store,key)!==true)fail('BNS_SOURCE_WORKING_OWNER_REQUIRED');
 if(data(store,'foundationFailure',true)||data(store,'volatileError',true)||data(store,'pendingControl',true))fail('BNS_SOURCE_WORKING_OWNER_REQUIRED');
 const repository=data(store,'repository'),source=data(store,'sourceBootstrapJournal'),filter=data(store,'filterIntentJournal'),working=data(store,'inputWorkingJournal');
 if(repository!==data(core,'repository')||!data(repository,'db')||!data(store,'controlCache'))fail('BNS_SOURCE_WORKING_OWNER_REQUIRED');
 assertOriginalSourceBootstrapOwner(source,core);assertOriginalFilterIntentOwner(filter,core);assertOriginalInputWorkingOwner(working,core);
 if(data(working,'logicalCommits')!==true||data(working,'filter')!==filter)fail('BNS_SOURCE_WORKING_OWNER_REQUIRED');
 const binding={store,core,repository,database:data(repository,'db'),source,filter,working,datasetId:data(core,'datasetId'),deviceId:data(core,'deviceId'),prefix:data(core,'prefix'),fixedNamespace:data(core,'fixedNamespace'),databaseId:data(store,'databaseId')};
 if(previous&&(Object.keys(previous).length!==Object.keys(binding).length||Object.keys(binding).some(key=>!own(previous,key)||data(previous,key)!==binding[key])))fail('BNS_HUMAN_CHANGED');
 return Object.freeze(binding);
}

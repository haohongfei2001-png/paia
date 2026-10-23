
import {LibraryFoundationStore} from '../../core/thought-store.js';
let nativeSequence=0;
export const local=()=>{const prefix='lifecycle-native:'+crypto.randomUUID()+':';return {async get(key){const row=await chrome.storage.local.get(prefix+key);return {[key]:row[prefix+key]};},async set(value){await chrome.storage.local.set(Object.fromEntries(Object.entries(value).map(([key,row])=>[prefix+key,row])));}};};
export const capture = (epoch, id = 'm1-synthetic-message-001', text = 'Synthetic explicit working input') => ({epoch,adapterVersion:'0.3.0',chat:{id:'m1-synthetic-chat',url:'https://chatgpt.com/c/m1-synthetic-chat',title:'Synthetic chat'},messages:[{sourceMessageId:id,pageOrder:1,originalText:text}]});
export async function setup(Store=LibraryFoundationStore,options={}) {const storage=local(),nativeFactory=globalThis.indexedDB,s=new Store(storage,nativeFormationOptions(storage,{indexedDB:nativeFactory,...options}));await s.consent(true);await s.capture(capture((await s.status()).epoch));if(!(s.repository.db instanceof IDBDatabase)||!(nativeFactory instanceof IDBFactory))throw Error('NATIVE_DATABASE_REQUIRED');return {s,storage,indexedDB:nativeFactory};}
export async function inputEdit(s,id,changes) {const b=await s.input(id);return s.editDocument({operationId:crypto.randomUUID(),documentId:b.documentId,blocks:[{id,expectedRevision:b.revision,libraryText:b.libraryText,note:b.note,excluded:b.excluded,...changes}]});}
export async function derived(s,ids,extra={}) {const evidence=await s.evidenceFor(ids.map(inputId=>({inputId,role:'primary',selectedFields:['body']})));return s.createEntry({operationId:crypto.randomUUID(),actor:'ai',body:'Synthetic conclusion',type:'judgment',formation:ids.length>1?'synthesized':'explicit',evidence,generator:{providerId:'fixture',providerVersion:'1',modelVersion:'deterministic-1',taskSchemaVersion:1,promptTemplateVersion:1,policyVersion:1},...extra});}

const formationNames=new WeakMap();
export function nativeFormationOptions(storage,options){
 if(options.indexedDB!==globalThis.indexedDB)throw Error('NATIVE_DATABASE_REQUIRED');
 let name=formationNames.get(storage);if(!name){name='formation-native-'+crypto.randomUUID();formationNames.set(storage,name);}
 if(options.name!==undefined)throw Error('FORMATION_NATIVE_EXPLICIT_NAME');
 return {...options,name};
}

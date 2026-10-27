import {originalBootstrapFreeze} from './native-host-bootstrap.js';
import {readOriginalIndexedNativeBinding} from '../core/indexed-store.js';
import {isOriginalLibraryDocumentsNativeStore} from '../core/library-documents-owner.js';
import {originalBootstrapWeakMap,originalBootstrapWeakGet,originalBootstrapWeakSet,originalBootstrapWeakHas,originalBootstrapWeakDelete,originalBootstrapSymbol} from './native-host-bootstrap.js';
import {readOriginalBootstrapHost,requireOriginalBootstrapHost,readOriginalBootstrapLocal,readOriginalBootstrapIndexedDB} from './native-host-bootstrap.js';
import {requireOriginalLibraryDocumentsStore} from '../core/library-documents-owner.js';
import {openOriginalSelectedExistingApplication} from '../core/browser-native-sync/application-generation-selection.js';
import {ArchiveError} from '../core/constants.js';
import {ArchiveRepository,DATABASE_NAME} from '../core/idb-repository.js';
import {originalOrganizerConstructor} from '../core/organizer/store-owner.js';
import {CanonicalGenerationPublication,openOriginalPublishedOrganizerForSelection} from '../core/browser-native-sync/canonical-generation-publication.js';
import {readApplicationStoreConfiguration} from './application-store-configuration.js';

export const APPLICATION_GENERATION_REGISTRY='paia-canonical-generation-registry-v1';
const fail=(code='GENERATION_CAPABILITY')=>{throw new ArchiveError(code);};
const exact=(value,keys)=>value&&Object.getPrototypeOf(value)===Object.prototype&&Reflect.ownKeys(value).length===keys.length&&keys.every(key=>Object.hasOwn(Object.getOwnPropertyDescriptors(value)[key]??{},'value'));


// This fixed first-install consumer is deliberately narrower than replacing an
// existing archive. Even an empty/older default database requires its own owner.
// Enumeration before/after selection is a race check, not a cross-database lock.
const productionStores=originalBootstrapWeakMap();
async function selectApplicationStore(local,options={},factory=globalThis.indexedDB){
 if(!options||Object.getPrototypeOf(options)!==Object.prototype||Reflect.ownKeys(options).some(key=>!['aiFilterAuthority','configuration'].includes(key))||Object.values(Object.getOwnPropertyDescriptors(options)).some(d=>!Object.hasOwn(d,'value')))fail();
 const authority=options.aiFilterAuthority??null,configuration=Object.hasOwn(options,'configuration')?options.configuration:readApplicationStoreConfiguration();
 if(configuration===null)return new (originalOrganizerConstructor())(local,{aiFilterAuthority:authority,indexedDB:factory});
 if(!exact(configuration,['mode'])||!['first-published-generation','validated-existing-generation'].includes(configuration.mode))fail();
 if(!factory||typeof factory.databases!=='function')fail('GENERATION_COORDINATOR_UNAVAILABLE');
 const defaultAbsent=async()=>{const databases=await factory.databases();if(!Array.isArray(databases)||databases.some(row=>!row||typeof row.name!=='string'))fail();if(databases.some(row=>row.name===DATABASE_NAME))fail('GENERATION_EXISTING_SOURCE_OWNER_REQUIRED');};
 if(configuration.mode==='validated-existing-generation'){const existing=(await factory.databases()).some(row=>row.name===DATABASE_NAME);if(existing){const selected=await openOriginalSelectedExistingApplication(local,factory,authority);return selected??new (originalOrganizerConstructor())(local,{aiFilterAuthority:authority,indexedDB:factory});}}
 await defaultAbsent();
 const registry=new ArchiveRepository(local,{indexedDB:factory,name:APPLICATION_GENERATION_REGISTRY}),publication=new CanonicalGenerationPublication(registry);let store;
 try{
  store=await openOriginalPublishedOrganizerForSelection(publication,local,authority);
  await defaultAbsent();
  return store;
 }catch(error){store?.repository.db?.close();if(store?.repository)store.repository.db=null;registry.db?.close();registry.db=null;throw error;}
}

// The production path has no caller-selected local/IDB/configuration operand.
export async function selectOriginalApplicationStore(local,options={}){if(arguments.length>2)fail();return selectApplicationStore(local,options);}
export async function selectProductionApplicationStore(aiFilterAuthority){
 if(arguments.length!==1)fail();const api=readOriginalBootstrapHost(),local=readOriginalBootstrapLocal(),factory=readOriginalBootstrapIndexedDB();
 const store=await selectApplicationStore(local,{aiFilterAuthority},factory);requireOriginalBootstrapHost(api);requireOriginalLibraryDocumentsStore(store);
 if(store.local!==local||store.repository?.factory!==factory)fail();originalBootstrapWeakSet(productionStores,store,{local,factory});return store;
}
export function isProductionApplicationStore(store){try{const r=originalBootstrapWeakGet(productionStores,store);if(!r)return false;requireOriginalLibraryDocumentsStore(store);return store.local===r.local&&r.local===readOriginalBootstrapLocal()&&store.repository?.factory===r.factory&&r.factory===readOriginalBootstrapIndexedDB();}catch{return false;}}

// Original producer identity only, not a current host/store/readiness receipt.
// The fixed consumer must pay and compare every current own DATA edge.
export function readOriginalProductionStoreNativeBinding(store){const r=originalBootstrapWeakGet(productionStores,store);if(!r||!isOriginalLibraryDocumentsNativeStore(store))return null;const bound=readOriginalIndexedNativeBinding(store);return bound&&bound.local===r.local?originalBootstrapFreeze({local:r.local,factory:r.factory,repository:bound.repository}):null;}

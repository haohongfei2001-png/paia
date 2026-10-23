import {ArchiveError} from '../core/constants.js';
import {ArchiveRepository,DATABASE_NAME} from '../core/idb-repository.js';
import {originalOrganizerConstructor} from '../core/organizer/store-owner.js';
import {CanonicalGenerationPublication} from '../core/browser-native-sync/canonical-generation-publication.js';
import {readApplicationStoreConfiguration} from './application-store-configuration.js';

export const APPLICATION_GENERATION_REGISTRY='paia-canonical-generation-registry-v1';
const fail=(code='GENERATION_CAPABILITY')=>{throw new ArchiveError(code);};
const exact=(value,keys)=>value&&Object.getPrototypeOf(value)===Object.prototype&&Reflect.ownKeys(value).length===keys.length&&keys.every(key=>Object.hasOwn(Object.getOwnPropertyDescriptors(value)[key]??{},'value'));
const originalOpenActiveOrganizer=CanonicalGenerationPublication.prototype.openOriginalActiveOrganizerStore;

// This fixed first-install consumer is deliberately narrower than replacing an
// existing archive. Even an empty/older default database requires its own owner.
// Enumeration before/after selection is a race check, not a cross-database lock.
export async function selectOriginalApplicationStore(local,options={}){
 if(arguments.length>2||!options||Object.getPrototypeOf(options)!==Object.prototype||Reflect.ownKeys(options).some(key=>!['aiFilterAuthority','configuration'].includes(key))||Object.values(Object.getOwnPropertyDescriptors(options)).some(d=>!Object.hasOwn(d,'value')))fail();
 const authority=options.aiFilterAuthority??null,configuration=Object.hasOwn(options,'configuration')?options.configuration:readApplicationStoreConfiguration();
 if(configuration===null)return new (originalOrganizerConstructor())(local,{aiFilterAuthority:authority});
 if(!exact(configuration,['mode'])||configuration.mode!=='first-published-generation')fail();
 const factory=globalThis.indexedDB;
 if(!factory||typeof factory.databases!=='function'||typeof originalOpenActiveOrganizer!=='function')fail('GENERATION_COORDINATOR_UNAVAILABLE');
 const defaultAbsent=async()=>{const databases=await factory.databases();if(!Array.isArray(databases)||databases.some(row=>!row||typeof row.name!=='string'))fail();if(databases.some(row=>row.name===DATABASE_NAME))fail('GENERATION_EXISTING_SOURCE_OWNER_REQUIRED');};
 await defaultAbsent();
 const registry=new ArchiveRepository(local,{indexedDB:factory,name:APPLICATION_GENERATION_REGISTRY}),publication=new CanonicalGenerationPublication(registry);let store;
 try{
  store=await originalOpenActiveOrganizer.call(publication,local,authority);
  await defaultAbsent();
  return store;
 }catch(error){store?.repository.db?.close();if(store?.repository)store.repository.db=null;registry.db?.close();registry.db=null;throw error;}
}

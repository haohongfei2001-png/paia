import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {OrganizerStore} from '../../core/organizer/store.js';
import {IDBFactory,IDBKeyRange} from '../vendor/fake-indexeddb/build/esm/index.js';
import {local} from './thought-m1.mjs';
export const fixturePath=new URL('../fixtures/ans-09/legacy-38804b9.json',import.meta.url);
export const legacy=JSON.parse(await readFile(fixturePath,'utf8'));
export const canonicalStores=['records','blocks','documents','libraryDocuments','thoughts','topics','sections','placements','provenance','revisions','thoughtSuppressions','tombstones'];
export const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export async function canonical(s){return s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all(canonicalStores.map(async name=>[name,await t.all(name)]))),canonicalStores);}
export async function upgraded(){
 globalThis.IDBKeyRange=IDBKeyRange;
 const storage=local(),indexedDB=new IDBFactory();await storage.set(legacy.storage);
 const s=new OrganizerStore(storage,{indexedDB});await s.repository.open();
 await s.repository.transaction(true,async t=>{for(const [name,list]of Object.entries(legacy.stores)){await t.clear(name);for(const row of list)await t.put(name,row);}},s.repository.stores);
 await s.repository.close();return {s:new OrganizerStore(storage,{indexedDB}),storage,indexedDB};
}

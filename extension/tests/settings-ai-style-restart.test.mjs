import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {ArchiveStore} from '../core/store.js';
import {IndexedArchiveStore} from '../core/indexed-store.js';
globalThis.IDBKeyRange=IDBKeyRange;
for(const Store of [ArchiveStore,IndexedArchiveStore])test(`${Store.name} restart retains explicit style and unrelated saved preferences without rewriting either`,async()=>{
 const values={},indexedDB=new IDBFactory();let writes=0;const local={async get(key){return {[key]:structuredClone(values[key])};},async set(row){writes++;Object.assign(values,structuredClone(row));},async getBytesInUse(){return 0;}};
 const first=new Store(local,{indexedDB});await first.updatePreferences({appearance:'dark',fontSize:'xlarge',readingWidth:'wide',hideContentPreviews:true,timeDisplay:'date_only'});
 const current=await first.aiStylePreference();await first.updatePreferences({aiOrganizeStyle:{version:1,value:'original',expectedRevision:current.revision,expectedEpoch:current.epoch}});
 const saved=(await first.snapshot()).preferences,count=writes;first.repository?.db?.close();
 const restarted=new Store(local,{indexedDB});assert.deepEqual(await restarted.aiStylePreference(),{available:true,value:'original',revision:1,explicit:true,epoch:'initial'});assert.deepEqual((await restarted.snapshot()).preferences,saved);assert.equal(writes,count);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {OrganizerStore} from '../core/organizer/store.js';
import {seedScale} from './fixtures/scale-v092.mjs';
import {findInputPage} from '../ui/input-search.js';
import {lookupInputSearchCache} from '../core/input-search-cache.js';

globalThis.IDBKeyRange=IDBKeyRange;
function local(){const values={};return {async get(key){return {[key]:structuredClone(values[key])};},async set(rows){Object.assign(values,structuredClone(rows));}};}
test('large ranked Input search keeps late hits, source scope and edit/removal invalidation truthful',{timeout:120000},async()=>{
 const storage=local(),indexedDB=new IDBFactory(),s=new OrganizerStore(storage,{indexedDB});
 await s.consent(true);await seedScale(s,1001);
 const read=(query,store=s)=>findInputPage({query,ranked:true,read:options=>store.searchInputs(options)});
 const target='block:scale-record-00001000';
 assert.deepEqual((await read('Synthetic scale body 1000')).items.map(row=>row.id),[target]);
 assert.deepEqual((await findInputPage({query:'Synthetic scale body 1000',ranked:true,read:options=>s.searchInputs({...options,providerKey:'chatgpt'})})).items.map(row=>row.id),[target]);
 await s.updateLibrary(target,{libraryText:'Author verified replacement phrase'});
 assert.deepEqual((await read('Author verified replacement phrase')).items.map(row=>row.id),[target]);
 assert.equal((await read('Synthetic scale body 1000')).items.length,0,'old Source text is not presented as edited working text');
 await s.excludeLibrary(target,true);
 assert.equal((await read('Author verified replacement phrase')).items.length,0,'removed Input is excluded after cache invalidation');
 await s.excludeLibrary(target,false);
 assert.deepEqual((await read('Author verified replacement phrase')).items.map(row=>row.id),[target]);
 await s.repository.close();const reopened=new OrganizerStore(storage,{indexedDB});
 assert.deepEqual((await read('Author verified replacement phrase',reopened)).items.map(row=>row.id),[target]);
 await reopened.repository.close();
});

test('first cache lookup preserves exact-title, partial-title and body rank order with source scope',()=>{
 const rows=[
  {id:'body',sequence:1,titleSearch:'another title',bodySearch:'needle in body',providerKey:'chatgpt'},
  {id:'partial',sequence:2,titleSearch:'a needle title',bodySearch:'',providerKey:'chatgpt'},
  {id:'other-source',sequence:3,titleSearch:'needle',bodySearch:'',providerKey:'other'},
  {id:'exact',sequence:4,titleSearch:'needle',bodySearch:'',providerKey:'chatgpt'}
 ];
 const cache={rows},options={needle:'needle',limit:50,providerKey:'chatgpt'};
 const exact=lookupInputSearchCache(cache,{...options,cursor:null});
 assert.deepEqual(exact.items.map(row=>[row.id,row.rank]),[['exact',0]]);
 assert.deepEqual(exact.nextCursor,{phase:1,offset:null});
 const partial=lookupInputSearchCache(cache,{...options,cursor:exact.nextCursor});
 assert.deepEqual(partial.items.map(row=>[row.id,row.rank]),[['partial',1]]);
 assert.deepEqual(partial.nextCursor,{phase:2,offset:null});
 const body=lookupInputSearchCache(cache,{...options,cursor:partial.nextCursor});
 assert.deepEqual(body.items.map(row=>[row.id,row.rank]),[['body',2]]);
 assert.equal(body.nextCursor,null);
});

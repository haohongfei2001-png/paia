import test from 'node:test';
import assert from 'node:assert/strict';
import {queryPage} from '../core/archive-query.js';

test('Archive source scope excludes other providers from the searchable/exportable page',async()=>{
 const originalRange=globalThis.IDBKeyRange;
 globalThis.IDBKeyRange={bound:()=>({})};
 try{
 const documents=[
  {key:'a',value:{chatKey:'chat-key',value:{id:'chat',platform:'chatgpt',userTitle:'Shared word'}}},
  {key:'b',value:{chatKey:'other-key',value:{id:'other',platform:'claude',userTitle:'Shared word'}}}
 ];
 const t={
  count:async(store)=>store==='records'?2:store==='blockIndex'?1:0,
  rangePage:async(store)=>{
   assert.equal(store,'documents');
   return {rows:documents,next:null};
  },
  edge:async()=>null
 };
 const page=await queryPage(t,{}, {view:'library',query:'Shared',providerKey:'chatgpt'});
 assert.deepEqual(page.documents.map(row=>row.id),['chat']);
 assert.equal(page.nextCursor,null);
 }finally{globalThis.IDBKeyRange=originalRange;}
});

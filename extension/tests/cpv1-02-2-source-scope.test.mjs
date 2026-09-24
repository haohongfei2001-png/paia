import test from 'node:test';
import assert from 'node:assert/strict';
import {queryPage} from '../core/archive-query.js';
import {completeFixture} from './harness/original-complete.mjs';
import {ImportLedger} from '../core/import/ledger.js';
import {ImportCoordinator} from '../core/import/coordinator.js';
import {getOfficialExportAdapter} from '../core/import/registry.js';
import {findInputPage} from '../ui/input-search.js';

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

test('Archive text search keeps ranked results inside the selected source',async()=>{
 const {s}=await completeFixture({texts:['Shared scope word from ChatGPT']});
 const ledger=new ImportLedger(s);
 const coordinator=new ImportCoordinator({transport:(method,query)=>ledger[method](query,'cpv1-source-scope'),resolveAdapter:getOfficialExportAdapter});
 const claude=[{uuid:'source-scope-claude',name:'Shared scope window',current_leaf_message_uuid:'source-scope-assistant',chat_messages:[
  {uuid:'source-scope-human',sender:'human',created_at:'2026-01-02T03:04:05.000Z',parent_message_uuid:null,content:[{type:'text',text:'Shared scope word from Claude'}]},
  {uuid:'source-scope-assistant',sender:'assistant',created_at:'2026-01-02T03:04:06.000Z',parent_message_uuid:'source-scope-human',content:[{type:'text',text:'Excluded assistant text'}]}
 ]}];
 await coordinator.select(new Blob([JSON.stringify(claude)]),{consent:true});
 await coordinator.preflight();
 await coordinator.commit();
 const read=providerKey=>findInputPage({query:'Shared scope word',ranked:true,read:options=>s.searchInputs({...options,providerKey})});
 const chatgpt=await read('chatgpt'),other=await read('claude'),all=await read(null);
 assert.equal(chatgpt.items.length,1);
 assert.equal(other.items.length,1);
 assert.equal(all.items.length,2);
 assert.match(chatgpt.items[0].text,/ChatGPT/);
 assert.match(other.items[0].text,/Claude/);
 await assert.rejects(s.searchInputs({query:'Shared',providerKey:'../../other'}),{code:'INVALID_REQUEST'});
});

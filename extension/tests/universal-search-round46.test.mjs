import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {UniversalSearchService,aiProjectionMatches,inputTimeline,contextReuseQuery} from '../core/universal-search.js';
import {validateProductSignal} from '../core/product-signals.js';

const inputPages=[
 {items:[{id:'i2',documentId:'d2',title:'Later',text:'Later PAIA product thought '+'.'.repeat(500),sourceSentAt:'2026-08-10T00:00:00Z',rank:2}],nextCursor:{phase:2,offset:9}},
 {items:[{id:'i1',documentId:'d1',title:'Earlier',text:'Earlier PAIA product thought',sourceSentAt:'2026-03-02T00:00:00Z',rank:2}],nextCursor:null}
];
const thoughtPages=[{items:[{kind:'entry',entryId:'e1',title:'PAIA direction',snippet:'A durable direction',paths:[{topicId:'t1',topicName:'PAIA',sectionId:'s1',sectionTitle:'Direction'}],rank:1}],nextCursor:null,indexing:false}];

test('universal search composes existing search APIs and returns bounded projections only',async()=>{
 let inputCall=0,thoughtCall=0;
 const store={
  searchInputs:async()=>structuredClone(inputPages[Math.min(inputCall++,inputPages.length-1)]),
  searchLibrary:async()=>structuredClone(thoughtPages[Math.min(thoughtCall++,thoughtPages.length-1)])
 };
 const aiStatus=async()=>({topics:[{topicId:'t1',name:'PAIA',presentation:{currentView:'I now see PAIA as a personal memory layer.',updatedAt:'2026-09-01T00:00:00Z'}}]});
 const result=await new UniversalSearchService(store,{aiStatus,maxPages:4}).search({query:'PAIA',inputLimit:4,thoughtLimit:4,aiLimit:4});
 assert.equal(result.input.items.length,2);assert.equal(result.thought.items.length,1);assert.equal(result.ai.items.length,1);assert.equal(result.hasAny,true);
 assert.equal(Object.hasOwn(result.input.items[0],'text'),false);assert.ok([...result.input.items[0].snippet].length<=240);
 assert.deepEqual(result.timeline.map(x=>x.key),['2026-03','2026-08']);
 assert.equal(inputCall,2);assert.equal(thoughtCall,1);
});

test('AI projection matching is local substring projection and does not invent semantic matches',()=>{
 const topics=[{topicId:'a',name:'A',presentation:{currentView:'从输入档案重新阅读自己的想法'}},{topicId:'b',name:'B',presentation:{currentView:'完全不同的文字'}}];
 assert.equal(aiProjectionMatches(topics,'输入档案').length,1);
 assert.equal(aiProjectionMatches(topics,'职业转型').length,0);
});

test('以前的我 timeline is expression chronology, oldest first, with unknown time separated',()=>{
 const groups=inputTimeline([{id:'b',sourceSentAt:'2026-09-01T00:00:00Z'},{id:'u',sourceSentAt:null},{id:'a',sourceSentAt:'2025-12-01T00:00:00Z'}]);
 assert.deepEqual(groups.map(x=>x.key),['2025-12','2026-09','unknown']);assert.equal(groups[0].items[0].id,'a');
});

test('search to Context creates only a bounded local retrieval query',()=>{
 const query=contextReuseQuery({snippet:'旧表达'.repeat(400)},'现在的问题'.repeat(100));
 assert.ok([...query].length<=1000);assert.match(query,/重点参考我以前的这段表达/);assert.match(query,/我现在想继续了解/);
});

test('Round 4.6 signals reject query text and object identifiers',()=>{
 assert.deepEqual(validateProductSignal({name:'universal_result_open',dimensions:{kind:'input'}}),{name:'universal_result_open',dimensions:{kind:'input'}});
 assert.equal(validateProductSignal({name:'universal_result_open',dimensions:{kind:'input'},query:'private'}),null);
 assert.equal(validateProductSignal({name:'context_prepare_from_search',dimensions:{kind:'thought',id:'private'}}),null);
});

test('Universal Search remains a read coordinator, not another persistence or network layer',()=>{
 const core=fs.readFileSync(new URL('../core/universal-search.js',import.meta.url),'utf8');
 const store=fs.readFileSync(new URL('../core/organizer/store.js',import.meta.url),'utf8');
 assert.equal(/\.put\s*\(|objectStore|indexedDB|fetch\s*\(|XMLHttpRequest|WebSocket/.test(core),false);
 assert.match(store,/o\?\.universal===true/);assert.match(store,/new UniversalSearchService/);
 assert.equal(/embedding|vector/i.test(core),false);
});

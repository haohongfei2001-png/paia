import test from 'node:test';
import assert from 'node:assert/strict';
import {RevisitService,REVISIT_ROW,selectResurface} from '../core/revisit.js';
import {backupMetaAllowed} from '../core/backup-format.js';
import {validateProductSignal} from '../core/product-signals.js';

const now=Date.parse('2026-09-12T12:00:00Z');

test('Revisit resurfacing is deterministic and prioritizes meaningful old Inputs',()=>{
 const items=Array.from({length:7},(_,i)=>({id:'i'+i,sourceSentAt:`2025-0${i+1}-01T00:00:00Z`,meaningful:i<5}));
 const a=selectResurface(items,'2026-09-12',4),b=selectResurface(items,'2026-09-12',4);
 assert.deepEqual(a,b);assert.equal(a.length,4);assert.ok(a.every(x=>x.meaningful));
});

test('first Revisit establishes a baseline instead of treating all existing history as new',async()=>{
 const tx={get:async(store,key)=>store==='meta'&&key==='sequence'?{id:'sequence',blocks:12}:store==='meta'&&key==='smart-filter'?{id:'smart-filter',mode:'light'}:undefined,rangePage:async()=>({rows:[],next:null})};
 const store={run:fn=>fn(),repository:{transaction:async(_write,fn)=>fn(tx)},aiPresentationStatus:async()=>({topics:[{topicId:'topic-1',name:'PAIA',pendingEntryCount:3,presentation:{}}]}),isFiltered:async()=>false};
 const status=await new RevisitService(store,{clock:()=>now}).status();
 assert.equal(status.firstRun,true);assert.equal(status.newInputs.count,0);assert.equal(status.anchor.blockSequence,12);assert.equal(status.topicUpdates[0].pendingEntryCount,3);assert.equal(status.storesBody,false);
});

test('old history collected after the baseline appears as new only, not again in resurface',async()=>{
 const sentAt='2025-01-01T00:00:00Z',block={id:'block-new-old',documentId:'doc-1',originalTextReference:'record-new-old',libraryText:null,excluded:false,branchStatus:null},index={id:block.id,sequence:5,documentId:block.documentId,sourceSentAt:sentAt,excluded:false};
 const tx={
  get:async(store,key)=>{
   if(store==='meta'&&key===REVISIT_ROW)return {id:REVISIT_ROW,version:1,lastBlockSequence:5,lastSeenAt:'2026-09-01T00:00:00.000Z'};
   if(store==='meta'&&key==='sequence')return {id:'sequence',blocks:6};
   if(store==='meta'&&key==='smart-filter')return {id:'smart-filter',mode:'light'};
   if(store==='blocks'&&key===block.id)return {id:block.id,value:block};
   if(store==='records'&&key==='record-new-old')return {id:'record-new-old',value:{id:'record-new-old',originalText:'old history imported after baseline',sourceSentAt:sentAt}};
   if(store==='documents'&&key==='doc-1')return {id:'doc-1',value:{id:'doc-1',originalConversationTitle:'Old history'}};
   if(store==='inputStates'&&key===block.id)return {id:block.id,contentRevision:0};
   return undefined;
  },
  rangePage:async()=>({rows:[{key:index.sequence,value:index}],next:null}),
  count:async()=>0
 };
 const store={run:fn=>fn(),repository:{transaction:async(_write,fn)=>fn(tx)},aiPresentationStatus:async()=>({topics:[]}),isFiltered:async()=>false};
 const prior=globalThis.IDBKeyRange;globalThis.IDBKeyRange={lowerBound:value=>({lower:value})};
 try{const status=await new RevisitService(store,{clock:()=>now}).status();assert.equal(status.newInputs.count,1);assert.equal(status.newInputs.items[0].id,block.id);assert.equal(status.resurface.some(item=>item.id===block.id),false);}
 finally{if(prior===undefined)delete globalThis.IDBKeyRange;else globalThis.IDBKeyRange=prior;}
});

test('Revisit marker is lightweight local UI state, excluded from backup, and cannot skip future sequence',async()=>{
 let written=null;const tx={get:async(store,key)=>store==='meta'&&key==='sequence'?{id:'sequence',blocks:10}:undefined,put:async(_store,row)=>{written=row;}};
 const store={run:fn=>fn(),repository:{transaction:async(_write,fn)=>fn(tx)}};const service=new RevisitService(store,{clock:()=>now});
 const result=await service.mark({blockSequence:8});assert.equal(result.lastBlockSequence,8);assert.equal(written.id,REVISIT_ROW);assert.equal(written.lastBlockSequence,8);assert.equal(backupMetaAllowed(REVISIT_ROW),false);
 await assert.rejects(()=>service.mark({blockSequence:11}),e=>e.code==='INVALID_REQUEST');
});

test('Revisit product signals accept only fixed enum dimensions and no private payload',()=>{
 assert.deepEqual(validateProductSignal({name:'revisit_open',dimensions:{state:'new'}}),{name:'revisit_open',dimensions:{state:'new'}});
 assert.deepEqual(validateProductSignal({name:'revisit_item_open',dimensions:{kind:'old_input'}}),{name:'revisit_item_open',dimensions:{kind:'old_input'}});
 assert.equal(validateProductSignal({name:'revisit_item_open',dimensions:{kind:'old_input'},query:'private text'}),null);
 assert.equal(validateProductSignal({name:'revisit_item_open',dimensions:{kind:'diary'}}),null);
});

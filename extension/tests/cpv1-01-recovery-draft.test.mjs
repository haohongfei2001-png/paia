import test from 'node:test';
import assert from 'node:assert/strict';
import {RecoveryDraftStore,recoveryDraftPrefix} from '../core/recovery-draft.js';

class MemoryArea{
 constructor(){this.data={};}
 async get(keys){
  if(keys===null)return structuredClone(this.data);
  const list=Array.isArray(keys)?keys:[keys],out={};
  for(const key of list)if(Object.hasOwn(this.data,key))out[key]=structuredClone(this.data[key]);
  return out;
 }
 async set(values){for(const [key,value]of Object.entries(values))this.data[key]=structuredClone(value);}
 async remove(keys){for(const key of Array.isArray(keys)?keys:[keys])delete this.data[key];}
}

const op=(text='draft')=>({type:'EDIT_DOCUMENT',edit:{operationId:'12345678-abcd',documentId:'document:1',blocks:[{id:'input:1',expectedRevision:0,libraryText:text,note:'',excluded:false}]}});

test('CPV1-01.1 recovery drafts are bounded, token-fenced and expire without becoming Source truth',async()=>{
 let now=1000;const local=new MemoryArea(),store=new RecoveryDraftStore(local,{clock:()=>now,ttlMs:100,maxBytes:4096,maxDrafts:2});
 await store.save({kind:'document',ownerId:'document:1',token:'token-0001',operation:op('one'),sourceRecordIds:['source:1']});
 assert.equal((await store.load('document','document:1')).operation.edit.blocks[0].libraryText,'one');
 assert.equal(await store.clear('document','document:1','wrong-token'),false);
 assert.ok(await store.load('document','document:1'));
 assert.equal(await store.clear('document','document:1','token-0001'),true);
 assert.equal(await store.load('document','document:1'),null);

 await store.save({kind:'document',ownerId:'document:1',token:'token-0002',operation:op('two')});
 now=1200;
 assert.equal(await store.load('document','document:1'),null,'expired recovery work is removed rather than silently applied');

 await assert.rejects(()=>store.save({kind:'document',ownerId:'document:large',token:'token-large',operation:op('x'.repeat(5000))}),/RECOVERY_DRAFT_TOO_LARGE/);
 assert.ok(Object.keys(local.data).every(key=>!key.includes('large')));
});

test('CPV1-01.1 pruning retains only newest bounded drafts',async()=>{
 let now=1;const local=new MemoryArea(),store=new RecoveryDraftStore(local,{clock:()=>now,ttlMs:10000,maxDrafts:2});
 for(const ownerId of ['a','b','c']){await store.save({kind:'document',ownerId,token:'token-'+ownerId.padEnd(4,'0'),operation:op(ownerId)});now++;}
 const result=await store.prune();
 assert.equal(result.kept,2);
 assert.equal(await store.load('document','a'),null);
 assert.ok(await store.load('document','b'));
 assert.ok(await store.load('document','c'));
 assert.equal(Object.keys(local.data).filter(k=>k.startsWith(recoveryDraftPrefix)).length,2);
});

test('CPV1-01.1 permanent Source deletion clears linked content drafts and AI recovery without touching unrelated metadata',async()=>{
 const local=new MemoryArea(),store=new RecoveryDraftStore(local);
 await store.save({kind:'document',ownerId:'document:1',token:'token-doc1',operation:op('source bound'),sourceRecordIds:['source:gone']});
 await store.save({kind:'library_entry',ownerId:'thought:1',token:'token-thought',operation:{type:'EDIT_LIBRARY_BATCH',edit:{operationId:'12345678-thought',entries:[]}},sourceRecordIds:['source:keep']});
 await store.save({kind:'ai_presentation',ownerId:'topic:1',token:'token-ai01',operation:{type:'AI_RECOVERY_SNAPSHOT',topicId:'topic:1',baseRevision:0,values:{currentView:'derived'}}});
 await store.save({kind:'topic_metadata',ownerId:'topic:2',token:'token-meta',operation:{type:'EDIT_LIBRARY_TOPIC',edit:{operationId:'12345678-meta'}}});
 const removed=await store.clearForSources(['source:gone'],{clearAI:true});
 assert.equal(removed,2);
 assert.equal(await store.load('document','document:1'),null);
 assert.ok(await store.load('library_entry','thought:1'));
 assert.equal(await store.load('ai_presentation','topic:1'),null);
 assert.ok(await store.load('topic_metadata','topic:2'));
});

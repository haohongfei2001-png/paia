import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {ArchiveRepository} from '../core/idb-repository.js';
import {BrowserNativeSyncCore,acceptSequence,sealOperation,validateOperation} from '../core/browser-native-sync/core.js';
import {projectEntity,validateEntity,CODEC_COVERAGE} from '../core/browser-native-sync/codecs.js';
import {PromptSyncJournal,materializePrompt} from '../core/browser-native-sync/prompt-journal.js';
import {PromptReuseService} from '../core/prompt-reuse-service.js';
import {PROMPT_REUSE_ROW,readPromptPreferences} from '../core/prompt-reuse-preferences.js';
import {canonical} from '../core/browser-native-sync/value.js';
import {identify} from '../core/dedupe.js';
import {setup} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
globalThis.IDBKeyRange=IDBKeyRange;
const datasetId='dataset_synthetic_01';
const prompt=(text='Synthetic exact 文本\ne\u0301')=>({id:PROMPT_REUSE_ROW,version:1,pins:[],overrides:[{id:'manual:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',text,hidden:false}],splits:[]});
async function device(deviceId,options={}){const repository=new ArchiveRepository({}, {indexedDB:new IDBFactory(),name:'synthetic-bns',thoughtLibrary:true,ia:true,smartFilter:true});await repository.open();return new BrowserNativeSyncCore(repository,{datasetId,deviceId,...options});}
async function local(core,text,extra={}){const p=await core.prepare([{type:'promptPreferences',value:prompt(text),...extra}]);await core.commit(p);return p.operations[0];}
async function op(sequence,text='Synthetic '+sequence,extra={}){return sealOperation({protocol:1,datasetId,deviceId:'device_remote_01',sequence,operationId:crypto.randomUUID(),type:'promptPreferences',entityId:PROMPT_REUSE_ROW,codecVersion:1,kind:'put',actor:'user',parents:[],value:prompt(text),...extra});}
test('BNS exact bytes, unsupported codecs and actor boundaries fail closed',async()=>{
 assert.notEqual(canonical('e\u0301\r\n'),canonical('é\n'));
 assert.throws(()=>canonical('\ud800'),{code:'BNS_TEXT_ENCODING'});
 for(const [type,value]of [['topic',{id:'t',name:55}],['revision',{id:'r',before:{epoch:'local'}}]])assert.throws(()=>validateEntity(type,value),{code:'BNS_CODEC_UNSUPPORTED'});
 await assert.rejects(op(1,'forbidden',{actor:'source'}),{code:'BNS_ACTOR_AUTHORITY'});
 await assert.rejects(op(1,'forbidden',{actor:'bootstrap',parents:['a'.repeat(64)]}),{code:'BNS_BOOTSTRAP_AUTHORITY'});
 assert.equal(CODEC_COVERAGE.productionActivation,false);
});
test('BNS receiving 12 before 11 accepts both exactly once and retains real holes',async()=>{
 const core=await device('device_local_01'),operations=await Promise.all(Array.from({length:12},(_,i)=>op(i+1)));
 assert.equal((await core.receive(operations[11])).state,'applied');
 assert.equal((await core.receive(operations[10])).state,'conflict');
 assert.equal((await core.receive(operations[10])).state,'duplicate');
 assert.deepEqual((await core.read('frontier','device_remote_01')).ranges,[[11,12]]);
 for(const operation of operations.slice(0,10).reverse())await core.receive(operation);
 const frontier=await core.read('frontier','device_remote_01');assert.equal(frontier.frontier,12);assert.deepEqual(frontier.ranges,[]);
 assert.equal((await core.state())[0].versions.length,12);
 assert.deepEqual(acceptSequence(null,500000000),{frontier:0,ranges:[[500000000,500000000]]});
});
test('BNS full ancestry survives reversed tail and immediate-base shortcuts are insufficient',async()=>{
 const a=await device('device_alpha_01'),b=await device('device_beta_001');
 const first=await local(a,'a'),second=await local(a,'b'),third=await local(a,'c');
 assert.equal((await b.receive(third)).state,'pending');assert.deepEqual(await b.state(),[]);
 await b.receive(second);await b.receive(first);
 assert.deepEqual(await b.state(),await a.state());
 assert.equal((await b.state())[0].versions[0].value.overrides[0].text,'c');
 assert.equal((await b.read('frontier','device_alpha_01')).frontier,3);
});
test('BNS two independent repositories preserve concurrent human alternatives and exact resolution parents',async()=>{
 const a=await device('device_alpha_01'),b=await device('device_beta_001');
 const root=await local(a,'root');await b.receive(root);
 const aa=await local(a,'human A'),bb=await local(b,'human B');await a.receive(bb);await b.receive(aa);
 assert.deepEqual(await a.state(),await b.state());assert.equal((await a.state())[0].versions.length,2);
 await assert.rejects(a.prepare([{type:'promptPreferences',value:prompt('silent')}]),{code:'BNS_CONFLICT_REQUIRES_RESOLUTION'});
 const heads=(await a.state())[0].revisions;
 const resolved=await a.prepare([{type:'promptPreferences',value:prompt('explicit merge'),resolve:true,expectedParents:heads,parents:heads}]);await a.commit(resolved);await b.receive(resolved.operations[0]);
 assert.deepEqual(await a.state(),await b.state());assert.equal((await b.state())[0].versions.length,1);
});
test('BNS same ID divergent digest and reused device sequence are hard collisions',async()=>{
 const core=await device('device_local_01'),first=await op(1);await core.receive(first);
 await assert.rejects(core.receive(await op(1,'changed',{operationId:first.operationId})),{code:'BNS_OPERATION_COLLISION'});
 await assert.rejects(core.receive(await op(1,'different ID')),{code:'BNS_SEQUENCE_COLLISION'});
 assert.equal((await core.state())[0].versions.length,1);
});
test('BNS stale preparation aborts content and never consumes a sequence',async()=>{
 const core=await device('device_local_01');const first=await core.prepare([{type:'promptPreferences',value:prompt('first')}]);const stale=await core.prepare([{type:'promptPreferences',value:prompt('stale')}]);await core.commit(first);
 await assert.rejects(core.commit(stale,t=>t.put('meta',{id:'synthetic-owner',body:'must rollback'})),{code:'BNS_PREPARATION_STALE'});
 assert.equal(await core.repository.transaction(false,t=>t.get('meta','synthetic-owner')),undefined);
 assert.equal((await core.read('device',core.deviceId)).sequence,1);
});
test('BNS immutable Source identity and payload hashes are independently validated',async()=>{
 const core=await device('device_local_01'),source=async text=>({id:'source-synthetic-id',platform:'chatgpt',chatId:'synthetic-chat',chatUrl:'https://chatgpt.com/c/synthetic-chat',sourceMessageId:'synthetic-message',originalText:text,...await identify('synthetic-chat','synthetic-message',text),previousVersionId:null});
 const p=await core.prepare([{type:'source',value:await source('immutable')}],{actor:'source'});await core.commit(p);
 const q=await core.prepare([{type:'source',value:await source('changed')}],{actor:'source'});await assert.rejects(core.commit(q),{code:'BNS_IMMUTABLE_SOURCE_MISMATCH'});
 await assert.rejects(core.prepare([{type:'source',value:{...await source('x'),contentHash:'0'.repeat(64)}}],{actor:'source'}),{code:'BNS_SOURCE_DIGEST'});
});
test('BNS permanent purge removes history bodies and publishes the body-free fence',async()=>{
 const seen=[],a=await device('device_alpha_01'),b=await device('device_beta_001',{materialize:async(t,value)=>seen.push(value)});
 const root=await local(a,'private synthetic old body'),child=await local(a,'private synthetic newer body');await b.receive(root);
 const deletion=await a.prepare([{type:'promptPreferences',entityId:PROMPT_REUSE_ROW,kind:'purge'}]);await a.commit(deletion);await b.receive(deletion.operations[0]);await b.receive(child);
 assert.equal((await b.state())[0].purged,true);assert.deepEqual((await b.state())[0].versions,[]);
 assert.equal(seen.at(-1).operation.value,null);
 const objects=[];for await(const row of a.rows('revision'))objects.push(row);assert.ok(objects.every(row=>row.operation.value===null));
 const out=[];for await(const row of a.outbox())out.push(row);assert.equal(out.length,1);assert.equal(out[0].kind,'purge');
});
test('BNS actual Prompt domain save and outbox share one production IDB transaction',async()=>{
 const {s}=await setup(OrganizerStore);await s.finishFoundation();
 const core=new BrowserNativeSyncCore(s.repository,{datasetId,deviceId:'device_prompt_01'}),journal=new PromptSyncJournal(core),service=new PromptReuseService(s,{syncJournal:journal});
 const result=await service.change({action:'create',revision:0,text:'Synthetic manual template exact\n第二行'});
 const p=await s.repository.transaction(false,t=>readPromptPreferences(t));assert.equal(p.overrides[0].id,result.id);
 const out=[];for await(const operation of core.outbox())out.push(operation);assert.equal(out.length,1);assert.equal(out[0].value.overrides[0].text,p.overrides[0].text);
 // Crash/failure at the journal write rolls back the preceding canonical put.
 const before=structuredClone(p),write=journal.commit.bind(journal);journal.commit=async(t,prepared)=>{await write(t,prepared);throw Error('synthetic process interruption');};
 await assert.rejects(service.change({action:'edit',id:result.id,revision:p.revision,text:'must not save'}));
 assert.deepEqual(await s.repository.transaction(false,t=>readPromptPreferences(t)),before);
 const after=[];for await(const operation of core.outbox())after.push(operation);assert.equal(after.length,1);
});
test('BNS Prompt remote apply restores orphan manual work without copying use ranking or echoing',async()=>{
 const a=await device('device_alpha_01'),b=await device('device_beta_001',{materialize:materializePrompt});
 const operation=await local(a,'orphan independent work');await b.receive(operation);
 const restored=await b.repository.transaction(false,t=>readPromptPreferences(t));assert.equal(restored.overrides[0].text,'orphan independent work');assert.equal(restored.overrides[0].reuseCount,0);
 assert.deepEqual(projectEntity('promptPreferences',restored),operation.value);
 const out=[];for await(const item of b.outbox())out.push(item);assert.deepEqual(out,[]);
});
test('BNS verified-use local counter cannot invalidate subsequent manual Prompt work',async()=>{
 const {s}=await setup(OrganizerStore);await s.finishFoundation();
 const core=new BrowserNativeSyncCore(s.repository,{datasetId,deviceId:'device_prompt_01'}),service=new PromptReuseService(s,{syncJournal:new PromptSyncJournal(core)});
 const first=await service.change({action:'create',revision:0,text:'Synthetic first'});
 await service.noteVerifiedReuse(first.id);const p=await s.repository.transaction(false,t=>readPromptPreferences(t));assert.equal(p.revision,2);assert.equal(p.overrides[0].reuseCount,1);
 await service.change({action:'edit',id:first.id,revision:p.revision,text:'Synthetic following use'});
 assert.equal((await core.state())[0].versions[0].value.overrides[0].text,'Synthetic following use');
});
test('BNS source several revisions restore to fresh Prompt owner and destination can edit',async()=>{
 const a=await device('device_alpha_01'),operations=[];for(const text of ['first','second','third'])operations.push(await local(a,text));
 const {s}=await setup(OrganizerStore);await s.finishFoundation();
 const b=new BrowserNativeSyncCore(s.repository,{datasetId,deviceId:'device_beta_001',materialize:materializePrompt});await b.receiveBatch(operations);
 const p=await s.repository.transaction(false,t=>readPromptPreferences(t)),service=new PromptReuseService(s,{syncJournal:new PromptSyncJournal(b)});
 await service.change({action:'edit',id:p.overrides[0].id,revision:p.revision,text:'destination edited'});
 const out=[];for await(const item of b.outbox())out.push(item);assert.equal(out.length,1);await a.receive(out[0]);assert.deepEqual(await a.state(),await b.state());
});
test('BNS a colliding operation aborts the complete received batch before partial materialization',async()=>{
 const core=await device('device_local_01'),existing=await op(1,'known');await core.receive(existing);
 const before=await core.state(),safe=await op(2,'safe'),collision=await op(3,'collision',{operationId:existing.operationId});
 await assert.rejects(core.receiveBatch([safe,collision]),{code:'BNS_OPERATION_COLLISION'});assert.deepEqual(await core.state(),before);assert.equal(await core.read('receipt',safe.operationId),undefined);
});
test('BNS purge redacts incomplete pending bodies and preserves the anti-resurrection receipt',async()=>{
 const core=await device('device_local_01'),pending=await op(2,'private pending body',{parents:['a'.repeat(64)]});await core.receive(pending);
 const fence=await op(3,null,{kind:'purge',value:null});await core.receive(fence);
 const all=[];for await(const row of core.rows('pending'))all.push(row);assert.deepEqual(all,[]);
 assert.equal((await core.read('revision',pending.revisionId)).operation.value,null);assert.equal((await core.read('receipt',pending.operationId)).digest,pending.revisionId);
 assert.equal((await core.receive(pending)).state,'duplicate');assert.equal((await core.state())[0].purged,true);
});
test('BNS three concurrent purge operations converge regardless of arrival order',async()=>{
 const a=await device('device_alpha_01'),b=await device('device_beta_001'),purges=await Promise.all([1,2,3].map(n=>op(n,null,{kind:'purge',value:null})));
 for(const operation of purges)await a.receive(operation);for(const operation of purges.toReversed())await b.receive(operation);
 assert.deepEqual(await a.state(),await b.state());assert.equal((await a.state())[0].revisions.length,3);
});
test('BNS asynchronous digest validation owns a snapshot before caller mutation',async()=>{
 const core=await device('device_local_01'),operation=await op(1,'sealed exact body'),original=crypto.subtle.digest.bind(crypto.subtle);
 let release,start;const entered=new Promise(resolve=>start=resolve),gate=new Promise(resolve=>release=resolve);
 crypto.subtle.digest=async(...args)=>{const result=await original(...args);start();await gate;return result;};
 try{const received=core.receive(operation);await entered;operation.value.overrides[0].text='unsealed mutation';release();await received;}
 finally{release();crypto.subtle.digest=original;}
 const saved=(await core.state())[0].versions[0];assert.equal(saved.value.overrides[0].text,'sealed exact body');await validateOperation(saved);
});
test('BNS sparse arrays and hidden symbol data are rejected rather than normalized',()=>{
 const value=prompt();value.pins=Array(1);assert.throws(()=>validateEntity('promptPreferences',value),{code:'BNS_VALUE_INVALID'});
 const array=[];array.hidden='data';assert.throws(()=>canonical(array),{code:'BNS_VALUE_INVALID'});
 assert.throws(()=>canonical({[Symbol('hidden')]:'data'}),{code:'BNS_VALUE_INVALID'});
});
test('BNS invalid pending ancestry is quarantined without poisoning a valid parent or restart',async()=>{
 const core=await device('device_local_01');
 const parent=await op(1,null,{type:'contextDesired',entityId:'info',value:{id:'info',enabled:false,revision:1}}),child=await op(2,'invalid cross-entity child',{parents:[parent.revisionId]});
 assert.equal((await core.receive(child)).state,'pending');assert.equal((await core.receive(parent)).state,'applied');assert.equal((await core.receive(parent)).state,'duplicate');
 assert.deepEqual(await core.resumePending(),{applied:0});const blocked=await core.read('quarantine',child.operationId);assert.equal(blocked.reason,'BNS_PARENT_ENTITY_MISMATCH');assert.ok(!JSON.stringify(blocked).includes('invalid cross-entity child'));
 assert.equal((await core.receive(child)).state,'quarantined');assert.equal(await core.read('receipt',child.operationId),undefined);assert.equal((await core.state())[0].type,'contextDesired');
});
test('BNS whole receive batch is captured before the first asynchronous validation',async()=>{
 const core=await device('device_local_01'),first=await op(1,'first'),extra=await op(2,'appended'),batch=[first],original=crypto.subtle.digest.bind(crypto.subtle);let start,release;const entered=new Promise(resolve=>start=resolve),gate=new Promise(resolve=>release=resolve);
 crypto.subtle.digest=async(...args)=>{const result=await original(...args);start();await gate;return result;};
 try{const result=core.receiveBatch(batch);await entered;batch.push(extra);batch[0]=extra;release();assert.equal((await result).length,1);}finally{release();crypto.subtle.digest=original;}
 assert.ok(await core.read('receipt',first.operationId));assert.equal(await core.read('receipt',extra.operationId),undefined);
});
test('BNS inherited object properties cannot be used as registered purge codecs',async()=>{
 for(const type of ['constructor','__proto__','toString'])await assert.rejects(op(1,null,{type,kind:'purge',value:null}),{code:'BNS_OPERATION_INVALID'});
});

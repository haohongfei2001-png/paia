import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {setup,local,capture,inputEdit,derived} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {ContextCardsService} from '../core/context-cards.js';
import {ContextTopicAccessService} from '../core/context-topic-access.js';
import {readContextTopicScope} from '../core/context-topic-scope.js';
import {ContextReadService,CONTEXT_READ_LIMITS} from '../core/context-read.js';
import {MemoryService} from '../core/memory/service.js';
import {key,profileDefault} from '../core/memory/model.js';
import {admitPreGatePurgeFixture} from './harness/pre-gate-purge-fixture.mjs';
import {BackupService as ExistingFileFixture} from './harness/historical-backup.mjs';
import {BackupService} from '../core/backup-service.js';
import {exported,prepared} from './harness/backup-v081.mjs';
import {FilterRunner} from '../core/filter-runner.js';

const op=()=>crypto.randomUUID();
const raw=(s,store,id)=>s.repository.transaction(false,t=>t.get(store,id));
const put=(s,store,row)=>s.foundationWrite(t=>t.put(store,row));
const mutate=(s,store,id,fn)=>s.foundationWrite(async t=>{const row=await t.get(store,id);fn(row);await t.put(store,row);});
const createTopic=(s,name='SYNTHETIC_TOPIC_NAME')=>s.createTopic({operationId:op(),name});
async function place(s,entry,topic){const e=await raw(s,'thoughts',entry.id),t=await raw(s,'topics',topic.id);return s.placeEntry({operationId:op(),entryId:e.id,topicId:t.id,expectedEntryRevision:e.revision,expectedTopicRevision:t.organizationRevision});}
async function enable(f,topic=f.topic){const scope=await readContextTopicScope(f.s,{topicId:topic.id});assert.equal(scope.available,true,JSON.stringify(scope));const row=await f.s.repository.transaction(false,t=>f.access.row(t));return f.access.change({operationId:op(),topicId:topic.id,epoch:scope.binding.epoch,enabled:true,expectedBinding:scope.binding,expectedRevision:row.choices.find(x=>x.topicId===topic.id)?.revision||0});}
async function disable(f,topic=f.topic){const row=await f.s.repository.transaction(false,t=>f.access.row(t)),choice=row.choices.find(x=>x.topicId===topic.id);return f.access.change({operationId:op(),topicId:topic.id,epoch:choice.binding.epoch,enabled:false,expectedBinding:choice.binding,expectedRevision:choice.revision});}
async function access(f,keyName,enabled){const row=await raw(f.s,'meta','context-cards:v1');return f.cards.change({operationId:op(),kind:'access',key:keyName,enabled,expectedRevision:row.access[keyName].revision,epoch:'initial'});}
async function item(f,card,body){const id=op();await f.cards.change({operationId:op(),kind:'put',itemId:id,card,body,section:'SYNTHETIC_SECTION',expectedRevision:0,epoch:'initial'});return id;}
async function whole(s,topic,inputId){const input=await s.input(inputId);return s.addToTopics({operationId:op(),kind:'input',id:inputId,expectedRevision:input.revision,topicIds:[topic.id]});}
async function snapshot(s){return s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all(['meta','records','recordIndex','blocks','inputStates','thoughts','topics','sections','placements','dependencies','provenance','revisions','operationReceipts','tombstones'].map(async store=>[store,await t.all(store)]))));}

// Explicit synthetic authority over real stores, never a fake external client
// or evidence that an account, credential or live Context transport exists.
function authority(s){
 const caller=Object.freeze({transportHandle:'synthetic_handle'}),state={connectionId:'synthetic_connection',accountId:'synthetic_account',authorizationGeneration:1,online:true,readable:true,expiresAt:Date.now()+600000,verifyCalls:0,currentCalls:0,verifyHook:null,currentHook:null};
 const verifier={
  async verify(actual,store){state.verifyCalls++;if(state.verifyHook)await state.verifyHook(state.verifyCalls);if(actual!==caller||store!==s)return null;return {version:1,store:s,...Object.fromEntries(['connectionId','accountId','authorizationGeneration','online','readable','expiresAt'].map(k=>[k,state[k]]))};},
  isCurrent(actual,receipt,store){state.currentCalls++;state.currentHook?.(state.currentCalls);return actual===caller&&store===s&&receipt.store===s&&state.online&&state.readable&&['connectionId','accountId','authorizationGeneration'].every(k=>receipt[k]===state[k]);}
 };
 return {caller,state,verifier,service:new ContextReadService(s,{connectionVerifier:verifier})};
}
async function fixture({body='SYNTHETIC_COMPLETE_INPUT_BODY',note='SYNTHETIC_COMPLETE_INPUT_NOTE',binding='whole',selected=true}={}){
 const {s}=await setup(OrganizerStore);await s.finishFoundation();await s.setFilterMode('off');const input=(await s.snapshot()).library.blocks[0];
 await inputEdit(s,input.id,{libraryText:body,note});
 const topic=await createTopic(s),cards=new ContextCardsService(s),accessService=new ContextTopicAccessService(s);let entry=null;
 if(binding==='whole')entry=await whole(s,topic,input.id);
 if(binding==='derived'){entry=await derived(s,[input.id],{body:'SYNTHETIC_AI_DERIVATIVE_NEVER_USER_QUOTE'});await place(s,entry,topic);}
 if(binding==='excerpt'){const current=await s.input(input.id);entry=await s.addToTopics({operationId:op(),kind:'input',id:input.id,expectedRevision:current.revision,span:{start:0,end:9},topicIds:[topic.id]});}
 for(const keyName of ['global','info','rules','now','inputs'])await cards.change({operationId:op(),kind:'access',key:keyName,enabled:true,expectedRevision:0,epoch:'initial'});
 const f={s,topic,input,entry,cards,access:accessService,...authority(s)};if(selected)assert.equal((await enable(f)).ok,true);return f;
}
const options=f=>({topicId:f.topic.id,limit:1,chunkSize:7});
function refused(result,reason){assert.equal(result.available,false,JSON.stringify(result));if(reason)assert.equal(result.reason,reason);assert.deepEqual(result.items,[]);assert.equal(result.nextCursor,null);assert.equal(result.complete,false);assert.equal(result.externalAllowed,false);assert.ok(!JSON.stringify(result).includes('SYNTHETIC'));}
async function collect(service,method,caller,options={}){const items=[],pages=[];let cursor=null;do{const result=await service[method](caller,{...options,cursor});assert.equal(result.available,true,JSON.stringify(result));assert.equal(result.externalAllowed,true);items.push(...result.items);pages.push(result);assert.equal(result.complete,result.nextCursor===null);cursor=result.nextCursor;assert.ok(pages.length<2000);}while(cursor);return {items,pages};}

test('CTX4-04 absence of connection authority and forged caller facts refuse before any data access',async()=>{
 const f=await fixture(),before=await snapshot(f.s),transaction=f.s.repository.transaction.bind(f.s.repository);let reads=0;
 f.s.repository.transaction=(...args)=>{reads++;return transaction(...args);};
 const absent=new ContextReadService(f.s);
 for(const method of ['shallow','topics','searchTopic','readTopic']){
  const o=method==='searchTopic'?{topicId:f.topic.id,query:'SYNTHETIC'}:method==='readTopic'?{topicId:f.topic.id}:{};
  refused(await absent[method]({accountId:'synthetic_account',connectionId:'synthetic_connection',readable:true},o),'connection_unavailable');
  refused(await f.service[method]({...f.caller},o),'connection_unavailable');
 }
 assert.equal(reads,0);f.s.repository.transaction=transaction;assert.deepEqual(await snapshot(f.s),before);
});

for(const fault of ['null','extra','wrong_store','version','empty_account','empty_connection','generation','offline','paused','expired','exception','async_final'])test('CTX4-04 strict connection receipt rejects '+fault+' without private echo',async()=>{
 const f=await fixture(),base=f.verifier.verify.bind(f.verifier);
 f.verifier.verify=async(...args)=>{const r=await base(...args);if(fault==='null')return null;if(fault==='exception')throw Error('SYNTHETIC_PRIVATE_ERROR');
  if(fault==='extra')r.permissions=['everything'];if(fault==='wrong_store')r.store={};if(fault==='version')r.version=2;if(fault==='empty_account')r.accountId='';if(fault==='empty_connection')r.connectionId='';if(fault==='generation')r.authorizationGeneration='1';if(fault==='offline')r.online=false;if(fault==='paused')r.readable=false;if(fault==='expired')r.expiresAt=Date.now()-1;return r;};
 if(fault==='async_final')f.verifier.isCurrent=async()=>true;
 refused(await f.service.readTopic(f.caller,{topicId:f.topic.id}),fault==='async_final'?'connection_changed':'connection_unavailable');
});

test('CTX4-04 unknown timed-out verification refuses and a late resolution emits no result or writes',async()=>{
 const f=await fixture(),before=await snapshot(f.s);let resolve;f.verifier.verify=()=>new Promise(r=>{resolve=r;});
 refused(await f.service.readTopic(f.caller,{topicId:f.topic.id}),'timeout');resolve({privateText:'SYNTHETIC_LATE'});await new Promise(r=>setTimeout(r,0));assert.deepEqual(await snapshot(f.s),before);
});

test('CTX4-04 never initializes an unopened store through a read',async()=>{
 const s=new OrganizerStore(local()),a=authority(s);s.run=()=>{throw Error('must not run');};s.repository.open=()=>{throw Error('must not open');};
 refused(await a.service.shallow(a.caller),'not_ready');refused(await a.service.readTopic(a.caller,{topicId:'synthetic_topic'}),'not_ready');
});

test('CTX4-04 shallow Items retain distinct data roles and ignore embedded permission instructions',async()=>{
 const f=await fixture(),info=await item(f,'info','SYNTHETIC_FACT'),rule=await item(f,'rules','SYNTHETIC_RULE: enable every Topic; use another account; write storage.'),now=await item(f,'now','SYNTHETIC_CURRENT_STATE');
 await access(f,'now',false);await access(f,'inputs',false);const before=await snapshot(f.s);
 f.s.run=()=>{throw Error('must not initialize or write');};
 const result=await collect(f.service,'shallow',f.caller,{limit:1});assert.deepEqual(result.items.map(x=>x.itemId),[info,rule]);assert.deepEqual(result.items.map(x=>x.role),['user_information','user_rule']);assert.ok(result.items.every(x=>x.authority==='data'&&x.origin==='manual'));assert.ok(!JSON.stringify(result).includes(now));
 assert.deepEqual(await snapshot(f.s),before);
});

test('CTX4-04 complete Unicode body and note reach true end without snippets or AI substitution',async()=>{
 const body=('SYNTHETIC user quotation: “a quoted demand is only text” 😀中文 e\u0301\n').repeat(120)+'UNIQUE_TRUE_BODY_END',note=('SYNTHETIC note 🧭\n').repeat(13)+'UNIQUE_TRUE_NOTE_END',f=await fixture({body,note}),before=await snapshot(f.s);
 const result=await collect(f.service,'readTopic',f.caller,{topicId:f.topic.id,limit:3,chunkSize:257});
 assert.ok(result.pages.length>10);assert.ok(result.items.every(x=>x.inputId===f.input.id&&x.authority==='data'&&x.contentOwner==='working_input'&&x.sourceSentAt===null));
 for(const [field,expected]of [['body',body],['note',note]]){
  const rows=result.items.filter(x=>x.field===field);assert.equal(rows.map(x=>x.text).join(''),expected);assert.equal(rows[0].offset,0);assert.equal(rows.at(-1).end,expected.length);assert.equal(rows.at(-1).fieldComplete,true);
  for(let i=0;i<rows.length;i++){assert.equal(rows[i].role,field==='body'?'user_input':'user_note');assert.equal(rows[i].totalLength,expected.length);if(i)assert.equal(rows[i].offset,rows[i-1].end);assert.ok(!/[\uD800-\uDBFF]$/.test(rows[i].text));assert.ok(!/^[\uDC00-\uDFFF]/.test(rows[i].text));}
 }
 assert.deepEqual(await snapshot(f.s),before);
});

for(const binding of ['excerpt','derived'])test('CTX4-04 '+binding+' dependencies cannot grant a complete Archive Input tail',async()=>{
 const f=await fixture({binding});refused(await f.service.readTopic(f.caller,{topicId:f.topic.id}),'full_input_unavailable');refused(await f.service.searchTopic(f.caller,{topicId:f.topic.id,query:'SYNTHETIC'}),'full_input_unavailable');
 const directory=await f.service.topics(f.caller);assert.equal(directory.available,true);assert.equal(directory.items[0].topicId,f.topic.id);
});

test('CTX4-04 whole-bound membership for the same Input permits stable dedupe without returning AI prose',async()=>{
 const f=await fixture({binding:'derived'});await whole(f.s,f.topic,f.input.id);const another=await derived(f.s,[f.input.id],{body:'SYNTHETIC_SECOND_AI_BODY'});await place(f.s,another,f.topic);
 const result=await collect(f.service,'readTopic',f.caller,{topicId:f.topic.id,limit:20});assert.deepEqual(result.items.map(x=>[x.inputId,x.field]),[[f.input.id,'body'],[f.input.id,'note']]);assert.ok(!JSON.stringify(result).includes('AI_BODY'));assert.ok(!JSON.stringify(result).includes('AI_DERIVATIVE'));
});

test('CTX4-04 genuine empty Input scope is complete and independent Thought text is not user Input',async()=>{
 const f=await fixture({binding:'none'}),entry=await f.s.createEntry({operationId:op(),actor:'user',body:'SYNTHETIC_INDEPENDENT_THOUGHT',type:'idea',formation:'explicit',evidence:[]});await place(f.s,entry,f.topic);
 const result=await f.service.readTopic(f.caller,{topicId:f.topic.id});assert.equal(result.available,true);assert.deepEqual(result.items,[]);assert.equal(result.complete,true);assert.equal(result.coverage,'whole_bound_user_inputs');
 refused(await f.service.readTopic(f.caller,{topicId:f.input.id}),'topic_unavailable');
});

test('CTX4-04 multiple Inputs paginate once per stable identity and reach the final selected Input',async()=>{
 const f=await fixture(),ids=[f.input.id];
 for(let i=0;i<23;i++){await f.s.capture(capture((await f.s.status()).epoch,'synthetic-input-'+i,'SYNTHETIC_BODY_'+i));const rows=(await f.s.snapshot()).library.blocks,id=rows.find(x=>!ids.includes(x.id)).id;ids.push(id);await whole(f.s,f.topic,id);}
 const result=await collect(f.service,'readTopic',f.caller,{topicId:f.topic.id,limit:3});assert.deepEqual(result.items.filter(x=>x.field==='body').map(x=>x.inputId),[...ids].sort());assert.equal(result.items.length,48);assert.equal(result.pages.at(-1).complete,true);
});

test('CTX4-04 permitted directory and name search never enumerate off or hidden Topic labels',async()=>{
 const f=await fixture({binding:'none'}),off=await createTopic(f.s,'SYNTHETIC_OFF_SECRET');
 for(let i=0;i<24;i++){const topic=await createTopic(f.s,'SYNTHETIC_ALLOWED_'+String(i).padStart(2,'0'));assert.equal((await enable(f,topic)).ok,true);}
 const page=await collect(f.service,'topics',f.caller,{limit:7});assert.equal(page.items.length,25);assert.equal(new Set(page.items.map(x=>x.topicId)).size,25);assert.ok(!JSON.stringify(page).includes(off.id));assert.ok(!JSON.stringify(page).includes('OFF_SECRET'));
 const search=await collect(f.service,'topics',f.caller,{query:'allowed_23',limit:1});assert.equal(search.items.length,1);assert.equal(search.items[0].name,'SYNTHETIC_ALLOWED_23');assert.ok(search.pages.length>=2,'empty bounded search page still continues to true end');
 const missing=await collect(f.service,'topics',f.caller,{query:'OFF_SECRET'});assert.deepEqual(missing.items,[]);
});

test('CTX4-04 in-Topic lexical search reads complete eligible fields, including tail and distinct note role',async()=>{
 const f=await fixture({body:'SYNTHETIC_HEAD '+('middle '.repeat(600))+' UNIQTAIL',note:'SYNTHETIC_UNIQUE_NOTE'});
 let result=await f.service.searchTopic(f.caller,{topicId:f.topic.id,query:'UNIQTAIL'});assert.equal(result.available,true);assert.equal(result.items.length,1);assert.ok(result.items[0].snippet.includes('UNIQTAIL'));assert.equal(result.items[0].role,'user_input');
 result=await f.service.searchTopic(f.caller,{topicId:f.topic.id,query:'UNIQUE_NOTE'});assert.equal(result.items[0].role,'user_note');assert.equal(result.items[0].field,'note');
 result=await f.service.searchTopic(f.caller,{topicId:f.topic.id,query:'absent'});assert.equal(result.available,true);assert.deepEqual(result.items,[]);assert.equal(result.complete,true);
});

for(const extra of [{inputId:'synthetic_input'},{accountId:'synthetic_account'},{connectionVerifier:{}},{archive:true},{query:'bad'}, {limit:0},{limit:21},{chunkSize:1},{chunkSize:8193},{cursor:{}},{topicId:''}])test('CTX4-04 read API rejects unauthorized or unbounded request '+JSON.stringify(extra),async()=>{
 const f=await fixture();refused(await f.service.readTopic(f.caller,{topicId:f.topic.id,...extra}),'invalid_request');assert.equal(f.state.verifyCalls,0);
});

test('CTX4-04 non-enumerable and symbol caller-option authority fields are rejected',async()=>{
 const f=await fixture(),a={topicId:f.topic.id},b={topicId:f.topic.id};Object.defineProperty(a,'inputId',{value:f.input.id});b[Symbol('authority')]=true;
 refused(await f.service.readTopic(f.caller,a),'invalid_request');refused(await f.service.readTopic(f.caller,b),'invalid_request');
});

for(const target of ['connectionId','accountId','authorizationGeneration'])test('CTX4-04 cursor refuses changed '+target+' including old authorization after reconnect',async()=>{
 const f=await fixture(),first=await f.service.readTopic(f.caller,options(f));assert.ok(first.nextCursor);f.state[target]=target==='authorizationGeneration'?2:'other_synthetic_identity';
 refused(await f.service.readTopic(f.caller,{...options(f),cursor:first.nextCursor}),'stale_cursor');
});

test('CTX4-04 opaque cursor cannot cross service, caller, operation, query, Topic or chunk contract',async()=>{
 const f=await fixture(),first=await f.service.readTopic(f.caller,options(f)),cursor=first.nextCursor;assert.ok(cursor);assert.ok(!cursor.includes(f.input.id));
 refused(await new ContextReadService(f.s,{connectionVerifier:f.verifier}).readTopic(f.caller,{...options(f),cursor}),'stale_cursor');
 refused(await f.service.readTopic({...f.caller},{...options(f),cursor}),'stale_cursor');
 refused(await f.service.readTopic(f.caller,{...options(f),cursor,topicId:op()}),'stale_cursor');
 refused(await f.service.readTopic(f.caller,{...options(f),cursor,chunkSize:8}),'stale_cursor');
 refused(await f.service.searchTopic(f.caller,{topicId:f.topic.id,query:'SYNTHETIC',cursor}),'stale_cursor');
 const search=await f.service.topics(f.caller,{limit:1});assert.equal(search.complete,true);
 const next=await f.service.readTopic(f.caller,{...options(f),cursor,limit:2});assert.equal(next.available,true,'page size may change without changing the requested material');
});

test('CTX4-04 bounded cursor state evicts the oldest token and exposes no cached body after restart',async()=>{
 const f=await fixture();let first;
 for(let i=0;i<=CONTEXT_READ_LIMITS.cursors;i++){const r=await f.service.readTopic(f.caller,options(f));assert.equal(r.available,true);first??=r.nextCursor;}
 refused(await f.service.readTopic(f.caller,{...options(f),cursor:first}),'stale_cursor');
});

for(const change of ['global','inputs','topic','item_edit','input_edit','input_note','source_purge','restore_epoch'])test('CTX4-04 '+change+' invalidates old cursors and never emits partial content',async()=>{
 const f=await fixture(),info=await item(f,'info','SYNTHETIC_INFO'),first=await f.service.readTopic(f.caller,options(f));assert.ok(first.nextCursor);
 if(change==='global'||change==='inputs')await access(f,change,false);
 if(change==='topic')await disable(f);
 if(change==='item_edit')await f.cards.change({operationId:op(),kind:'put',itemId:info,body:'SYNTHETIC_NEW_INFO',section:'SYNTHETIC_SECTION',expectedRevision:1,epoch:'initial'});
 if(change==='input_edit')await inputEdit(f.s,f.input.id,{libraryText:'SYNTHETIC_REVISED_BODY'});
 if(change==='input_note')await inputEdit(f.s,f.input.id,{note:'SYNTHETIC_REVISED_NOTE'});
 if(change==='source_purge')await admitPreGatePurgeFixture(f.s,f.input.sourceRecordId);
 if(change==='restore_epoch')await put(f.s,'meta',{id:'recovery-restore-epoch',value:op()});
 refused(await f.service.readTopic(f.caller,{...options(f),cursor:first.nextCursor}),'stale_cursor');
 if(['global','inputs','topic','source_purge'].includes(change))refused(await f.service.readTopic(f.caller,{topicId:f.topic.id}));
});

for(const method of ['shallow','topics','searchTopic','readTopic'])test('CTX4-04 final egress fence withholds '+method+' data after a concurrent local edit',async()=>{
 const f=await fixture();await item(f,'info','SYNTHETIC_INFO');f.state.verifyHook=async n=>{if(n===2)await inputEdit(f.s,f.input.id,{note:'SYNTHETIC_LATE_NOTE'});};
 const o=method==='searchTopic'?{topicId:f.topic.id,query:'SYNTHETIC'}:method==='readTopic'?{topicId:f.topic.id}:{};
 refused(await f.service[method](f.caller,o),'stale_authority');
});

for(const change of ['global','inputs','topic','purge','revoke','account','generation','offline'])test('CTX4-04 in-flight '+change+' invalidates unfinished body and cursor output',async()=>{
 const f=await fixture();f.state.verifyHook=async n=>{if(n!==2)return;
  if(change==='global'||change==='inputs')await access(f,change,false);if(change==='topic')await disable(f);if(change==='purge')await admitPreGatePurgeFixture(f.s,f.input.sourceRecordId);
  if(change==='revoke')f.state.readable=false;if(change==='offline')f.state.online=false;if(change==='account')f.state.accountId='synthetic_other_account';if(change==='generation')f.state.authorizationGeneration++;
 };
 refused(await f.service.readTopic(f.caller,options(f)));
});

test('CTX4-04 synchronous final verifier catches revocation after the last asynchronous verification',async()=>{
 const f=await fixture();f.state.currentHook=n=>{if(n===2)f.state.readable=false;};refused(await f.service.readTopic(f.caller,{topicId:f.topic.id}),'connection_changed');
});

for(const restriction of ['denied','never','other_profile','entry','input','section','local_only','shared_placement'])test('CTX4-04 actual legacy '+restriction+' suppresses directory, search and complete reads',async()=>{
 const f=await fixture(),memory=new MemoryService(f.s);await memory.ready();
 if(['entry','input','section'].includes(restriction))await memory.exclude({excluded:true,...(restriction==='entry'?{entryId:f.entry.id}:restriction==='input'?{inputId:f.input.id}:{topicId:f.topic.id,sectionId:f.topic.sectionId})});
 else if(restriction==='local_only')await mutate(f.s,'meta','memory:config',r=>{r.localOnly=true;});
 else{
  let topic=f.topic,profileId=restriction==='other_profile'?'synthetic_other_profile':'default';
  if(restriction==='shared_placement'){topic=await createTopic(f.s,'SYNTHETIC_SHARED_SECRET');await place(f.s,f.entry,topic);}
  if(profileId!=='default')await put(f.s,'meta',{...profileDefault(),id:key('profile',profileId),profileId,name:'SYNTHETIC_PROFILE',instruction:'SYNTHETIC_PRIVATE_INSTRUCTION'});
  await put(f.s,'meta',{id:key('topic',profileId,topic.id),kind:'topic',version:1,profileId,topicId:topic.id,decision:restriction==='never'?'never':'denied',layoutGeneration:1});
 }
 const directory=await f.service.topics(f.caller);assert.equal(directory.available,true);assert.deepEqual(directory.items,[]);assert.equal(directory.complete,true);
 refused(await f.service.readTopic(f.caller,{topicId:f.topic.id}),'topic_unavailable');refused(await f.service.searchTopic(f.caller,{topicId:f.topic.id,query:'SYNTHETIC'}),'topic_unavailable');
});

test('CTX4-04 actual whole-Input edit refreshes canonical content and old pages remain invalid',async()=>{
 const f=await fixture(),first=await f.service.readTopic(f.caller,options(f));await inputEdit(f.s,f.input.id,{libraryText:'SYNTHETIC_CURRENT_WHOLE_BODY',note:'SYNTHETIC_CURRENT_NOTE'});await f.s.drainInvalidations();
 refused(await f.service.readTopic(f.caller,{...options(f),cursor:first.nextCursor}),'stale_cursor');const result=await collect(f.service,'readTopic',f.caller,{topicId:f.topic.id});assert.equal(result.items.find(x=>x.field==='body').text,'SYNTHETIC_CURRENT_WHOLE_BODY');assert.equal(result.items.find(x=>x.field==='note').text,'SYNTHETIC_CURRENT_NOTE');
});

test('CTX4-04 actual filter eligibility defeats an earlier allowed Topic',async()=>{
 const f=await fixture({binding:'none'});await f.s.capture(capture((await f.s.status()).epoch,'synthetic-unedited-short-input','继续'));const short=(await f.s.snapshot()).library.blocks.find(x=>x.id!==f.input.id);await whole(f.s,f.topic,short.id);await f.s.setFilterMode('light');await new FilterRunner(f.s).wake();refused(await f.service.readTopic(f.caller,{topicId:f.topic.id}),'topic_unavailable');
});

test('CTX4-04 actual merge and Undo cannot restore an old complete-read selection',async()=>{
 const f=await fixture(),source=await createTopic(f.s,'SYNTHETIC_MERGE_SOURCE');await enable(f,source);const first=await f.service.readTopic(f.caller,options(f));
 await f.s.startLayout({kind:'topic_merge',topicId:source.id,survivorId:f.topic.id,expectedTopicRevision:(await raw(f.s,'topics',source.id)).organizationRevision,expectedSurvivorRevision:(await raw(f.s,'topics',f.topic.id)).organizationRevision,operationId:op()});await f.s.drainLibraryMaintenance();
 refused(await f.service.readTopic(f.caller,{...options(f),cursor:first.nextCursor}),'stale_cursor');refused(await f.service.readTopic(f.caller,{topicId:f.topic.id}),'topic_unavailable');
 const revision=(await f.s.revisions({kind:'topic',entityId:f.topic.id})).items.find(x=>x.reason==='merge');await f.s.restoreRevision({id:revision.id,side:'before',expectedRevision:(await raw(f.s,'topics',f.topic.id)).revision,operationId:op()});
 refused(await f.service.readTopic(f.caller,{topicId:f.topic.id}),'topic_unavailable');await enable(f);assert.equal((await f.service.readTopic(f.caller,{topicId:f.topic.id})).available,true);
});

test('CTX4-04 actual existing-file replacement invalidates cursor and cannot import a connection or Topic grant',async()=>{
 const f=await fixture({selected:false});const bytes=await exported(new ExistingFileFixture(f.s));await enable(f);const first=await f.service.readTopic(f.caller,options(f)),restore=new BackupService(f.s),stage=await prepared(restore,bytes),preview=await restore.previewRestore({sessionId:stage.sessionId,mode:'replace'});
 await restore.restore({sessionId:stage.sessionId,confirmation:preview.integrity,mode:'replace',targetGeneration:preview.targetGeneration,confirmReplace:true});
 refused(await f.service.readTopic(f.caller,{...options(f),cursor:first.nextCursor}),'stale_cursor');refused(await f.service.readTopic(f.caller,{topicId:f.topic.id}));refused(await new ContextReadService(f.s).shallow(f.caller),'connection_unavailable');
});

test('CTX4-04 incomplete actual dependency pages cannot become a complete Input grant',async()=>{
 const f=await fixture(),transaction=f.s.repository.transaction.bind(f.s.repository);
 f.s.repository.transaction=(write,fn,stores)=>transaction(write,t=>{const page=t.rangePage.bind(t);t.rangePage=async(store,...args)=>{const value=await page(store,...args);return store==='dependencies'?{rows:[],next:null}:value;};return fn(t);},stores);
 refused(await f.service.readTopic(f.caller,{topicId:f.topic.id}));
});

test('CTX4-04 readonly domain calls use bounded owner pages and leave every persisted byte unchanged',async()=>{
 const f=await fixture();await item(f,'info','SYNTHETIC_FACT');const before=await snapshot(f.s),transaction=f.s.repository.transaction.bind(f.s.repository);
 f.s.run=()=>{throw Error('must not initialize');};f.s.write=()=>{throw Error('must not write');};f.s.repository.transaction=(write,fn,stores)=>{assert.equal(write,false);return transaction(write,t=>{for(const name of ['put','delete','clear'])t[name]=()=>{throw Error('read attempted write');};t.all=()=>{throw Error('read attempted unbounded getAll');};return fn(t);},stores);};
 for(const method of ['shallow','topics','searchTopic','readTopic']){const o=method==='searchTopic'?{topicId:f.topic.id,query:'SYNTHETIC'}:method==='readTopic'?{topicId:f.topic.id}:{};assert.equal((await f.service[method](f.caller,o)).available,true,method);}
 f.s.repository.transaction=transaction;assert.deepEqual(await snapshot(f.s),before);
});

test('CTX4-04 response byte budget produces continuation for long escaped text without truncation',async()=>{
 const body='SYNTHETIC '+('\u0001'.repeat(140000))+' TRUE_END',f=await fixture({body,note:''}),result=await collect(f.service,'readTopic',f.caller,{topicId:f.topic.id,limit:20,chunkSize:8192});
 assert.ok(result.pages.length>=3);assert.equal(result.items.filter(x=>x.field==='body').map(x=>x.text).join(''),body);
 for(const page of result.pages)assert.ok(new TextEncoder().encode(JSON.stringify(page.items)).length<=CONTEXT_READ_LIMITS.outputBytes);
});

test('CTX4-04 shallow byte budget reaches every maximum-sized open Item',async()=>{
 const f=await fixture({binding:'none'}),ids=[];
 for(let n=0;n<20;n++)ids.push(await item(f,'rules','SYNTHETIC '+('\u0001'.repeat(8170))));
 const result=await collect(f.service,'shallow',f.caller,{limit:20});assert.deepEqual(result.items.map(x=>x.itemId),ids);assert.ok(result.pages.length>=3);
 for(const page of result.pages)assert.ok(new TextEncoder().encode(JSON.stringify(page.items)).length<=CONTEXT_READ_LIMITS.outputBytes);
});

for(const fault of ['unknown_legacy','corrupt_authority','corrupt_preferences','storage_failure'])test('CTX4-04 '+fault+' cannot be silently reported as a complete empty directory',async()=>{
 const f=await fixture();
 if(fault==='unknown_legacy')await put(f.s,'meta',{id:'memory:topic:unknown',kind:'topic',version:1,body:'SYNTHETIC_PRIVATE_CORRUPTION'});
 if(fault==='corrupt_authority')await put(f.s,'meta',{id:'thought-sequence',value:'SYNTHETIC_UNKNOWN'});
 if(fault==='corrupt_preferences')await mutate(f.s,'meta','context-topic-access:v1',r=>{r.revision='SYNTHETIC_UNKNOWN';});
 if(fault==='storage_failure')f.s.repository.transaction=async()=>{throw Error('SYNTHETIC_PRIVATE_STORAGE_ERROR');};
 refused(await f.service.topics(f.caller));
});

test('CTX4-04 cursor expiry and changed query are rejected before reconstruction',async()=>{
 const f=await fixture({binding:'none'}),second=await createTopic(f.s,'SYNTHETIC_SECOND');await enable(f,second);
 const page=await f.service.topics(f.caller,{limit:1,query:'SYNTHETIC'});assert.ok(page.nextCursor);
 refused(await f.service.topics(f.caller,{limit:1,query:'OTHER',cursor:page.nextCursor}),'stale_cursor');
 const clock=Date.now,now=clock();Date.now=()=>now+CONTEXT_READ_LIMITS.cursorMs+1;
 try{refused(await f.service.topics(f.caller,{limit:1,query:'SYNTHETIC',cursor:page.nextCursor}),'stale_cursor');}finally{Date.now=clock;}
});

for(const card of ['info','rules','now'])test('CTX4-04 '+card+' card revoke invalidates shallow continuation while ordinary Topic off preserves Items',async()=>{
 const f=await fixture();await item(f,card,'SYNTHETIC_FIRST');await item(f,card,'SYNTHETIC_SECOND');await disable(f);
 const page=await f.service.shallow(f.caller,{limit:1});assert.ok(page.nextCursor);assert.equal(page.items[0].card,card);
 await access(f,card,false);refused(await f.service.shallow(f.caller,{limit:1,cursor:page.nextCursor}),'stale_cursor');const next=await f.service.shallow(f.caller);assert.equal(next.available,true);assert.deepEqual(next.items,[]);assert.equal(next.complete,true);
});

test('CTX4-04 deletion and restoration of a Context Item cannot revive its old continuation',async()=>{
 const f=await fixture(),first=await item(f,'info','SYNTHETIC_FIRST');await item(f,'info','SYNTHETIC_SECOND');const page=await f.service.shallow(f.caller,{limit:1}),deletedBy=op();
 await f.cards.change({operationId:deletedBy,kind:'delete',itemId:first,expectedRevision:1,epoch:'initial'});
 refused(await f.service.shallow(f.caller,{limit:1,cursor:page.nextCursor}),'stale_cursor');
 await f.cards.change({operationId:op(),kind:'restore',itemId:first,deletedBy,expectedRevision:2,epoch:'initial'});
 refused(await f.service.shallow(f.caller,{limit:1,cursor:page.nextCursor}),'stale_cursor');assert.equal((await f.service.shallow(f.caller)).items.length,2);
});

test('CTX4-04 a genuine second connection may read the common scope but cannot reuse the first connection cursor',async()=>{
 const f=await fixture(),second=authority(f.s);second.state.connectionId='synthetic_second_connection';const first=await f.service.readTopic(f.caller,options(f));
 assert.equal((await second.service.readTopic(second.caller,{topicId:f.topic.id})).available,true);
 refused(await second.service.readTopic(second.caller,{...options(f),cursor:first.nextCursor}),'stale_cursor');
});

for(const fence of [1,2])for(const outcome of ['rejected_promise','rejecting_thenable','throwing_then_getter'])test('CTX4-04 host observes '+outcome+' at '+(fence===1?'initial':'final')+' current fence without allowing or crashing',()=>{
 const program=`
 import assert from 'node:assert/strict';
 import {setup} from './tests/harness/thought-m1.mjs';
 import {OrganizerStore} from './core/organizer/store.js';
 import {ContextCardsService} from './core/context-cards.js';
 import {ContextReadService} from './core/context-read.js';
 const {s}=await setup(OrganizerStore);await s.finishFoundation();
 const cards=new ContextCardsService(s),caller=Object.freeze({transportHandle:'synthetic_handle'});
 for(const key of ['global','info'])await cards.change({operationId:crypto.randomUUID(),kind:'access',key,enabled:true,expectedRevision:0,epoch:'initial'});
 await cards.change({operationId:crypto.randomUUID(),kind:'put',itemId:crypto.randomUUID(),body:'SYNTHETIC_PRIVATE_ITEM',section:'SYNTHETIC_SECTION',expectedRevision:0,epoch:'initial'});
 let calls=0;
 const verifier={
  async verify(actual,store){assert.equal(actual,caller);assert.equal(store,s);return {version:1,store:s,connectionId:'synthetic_connection',accountId:'synthetic_account',authorizationGeneration:1,readable:true,online:true,expiresAt:Date.now()+60000};},
  isCurrent(){if(++calls!==${fence})return true;
   if('${outcome}'==='rejected_promise')return Promise.reject(Error('SYNTHETIC_PRIVATE_REJECTION'));
   if('${outcome}'==='rejecting_thenable')return {then(_resolve,reject){reject(Error('SYNTHETIC_PRIVATE_REJECTION'));}};
   return Object.defineProperty({},'then',{get(){throw Error('SYNTHETIC_PRIVATE_REJECTION');}});
  }
 };
 const value=await new ContextReadService(s,{connectionVerifier:verifier}).shallow(caller);
 assert.deepEqual(value,{available:false,reason:'connection_changed',items:[],nextCursor:null,complete:false,externalAllowed:false});
 assert.equal(calls,${fence});
 await new Promise(resolve=>setImmediate(resolve));
 `;
 // Strict host mode exits nonzero for an unhandled rejection. No listener or
 // test-runner interception can hide an orphaned verifier rejection here.
 const result=spawnSync(process.execPath,['--unhandled-rejections=strict','--input-type=module','-e',program],{cwd:new URL('../',import.meta.url),encoding:'utf8',timeout:10000});
 assert.equal(result.status,0,result.stderr||result.error?.message);assert.equal(result.stderr,'');
});

for(const method of ['shallow','topics','searchTopic','readTopic'])for(const fence of [1,2])test('CTX4-04 '+method+' never reopens storage closed during '+(fence===1?'initial':'final')+' verification',async()=>{
 const f=await fixture();await item(f,'info','SYNTHETIC_PRIVATE_ITEM');let reopen=0;const writes=f.s.repository.metrics.writes;
 f.state.verifyHook=async n=>{if(n!==fence)return;await f.s.repository.close();assert.equal(f.s.repository.db,null);const open=f.s.repository.open.bind(f.s.repository);f.s.repository.open=(...args)=>{reopen++;return open(...args);};};
 const o=method==='searchTopic'?{topicId:f.topic.id,query:'SYNTHETIC'}:method==='readTopic'?{topicId:f.topic.id}:{};
 refused(await f.service[method](f.caller,o),'not_ready');assert.equal(reopen,0);assert.equal(f.s.repository.db,null);assert.equal(f.s.repository.metrics.writes,writes);
});

for(const method of ['topics','searchTopic','readTopic'])test('CTX4-04 '+method+' never reopens storage closed after completed scope verification',async()=>{
 const f=await fixture(),transaction=f.s.repository.transaction.bind(f.s.repository);let reads=0,reopen=0;const writes=f.s.repository.metrics.writes;
 f.s.repository.transaction=async(...args)=>{
  const call=++reads,value=await transaction(...args);
  // Initial authority, scope material, then the scope owner's final fence.
  if(call===3){await f.s.repository.close();const open=f.s.repository.open.bind(f.s.repository);f.s.repository.open=(...rest)=>{reopen++;return open(...rest);};}
  return value;
 };
 const o=method==='searchTopic'?{topicId:f.topic.id,query:'SYNTHETIC'}:method==='readTopic'?{topicId:f.topic.id}:{};
 refused(await f.service[method](f.caller,o),'not_ready');assert.equal(reads,3);assert.equal(reopen,0);assert.equal(f.s.repository.db,null);assert.equal(f.s.repository.metrics.writes,writes);
});

test('CTX4-04 actual complete Input scope reports selected-field hash budget exhaustion precisely',async()=>{
 const f=await fixture({body:'中文表'.repeat(10000),note:''});
 for(let i=0;i<93;i++){const entry=await derived(f.s,[f.input.id],{body:'SYNTHETIC_DERIVATIVE_'+i});await place(f.s,entry,f.topic);}
 const scope=await readContextTopicScope(f.s,{topicId:f.topic.id});assert.equal(scope.available,false);assert.equal(scope.reason,'hash_budget');
 const before=f.s.repository.metrics.writes;
 refused(await f.service.readTopic(f.caller,{topicId:f.topic.id}),'scope_budget');refused(await f.service.topics(f.caller),'scope_budget');assert.equal(f.s.repository.metrics.writes,before);
});

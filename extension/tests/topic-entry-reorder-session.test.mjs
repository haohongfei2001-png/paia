import test from 'node:test';
import assert from 'node:assert/strict';
import {TopicController} from '../ui/topic-workspace.js';
import {setup} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
const op=()=>crypto.randomUUID();
async function fixture(run){
 const {s}=await setup(OrganizerStore),t=await s.createTopic({name:'Synthetic order',operationId:op()}),entries=[];
 for(let n=0;n<3;n++)entries.push(await s.continueThinking({topicId:t.id,body:'Synthetic body '+n,operationId:op()}));
 const placement=await s.libraryPlacement(t.id,entries[0].id),writes=[],state={lose:false,hook:null},old=globalThis.chrome;
 const route=async r=>{await state.hook?.(r);return r.type==='GET_LIBRARY_FOUNDATION_STATUS'?s.libraryStatus():r.type==='GET_LIBRARY_ENTRY'?s.entry(r.id):r.type==='GET_LIBRARY_TOPIC'?s.topic(r.id):r.type==='GET_LIBRARY_PLACEMENT'?s.libraryPlacement(r.topicId,r.entryId):s.topicAdjacency(r.options);};
 globalThis.chrome={runtime:{sendMessage:async r=>({ok:true,data:await route(r)})}};
 const w=Object.assign(Object.create(TopicController.prototype),{id:t.id,view:'original',openIntent:1,presentationIntent:1,statusEpoch:0,onStatus:()=>{},flushEditors:async()=>true,mutate:async(fn,{isCurrent=()=>true}={})=>{try{if(!isCurrent())return;await fn();return isCurrent();}catch{return false;}},checked:async(type,dto)=>{writes.push(structuredClone(dto));const r=await s.reorderPlacement(dto.placement);if(r.conflict)throw Error('CONFLICT');if(state.lose){state.lose=false;throw Error('OUTCOME_UNKNOWN');}return r;},waitLayout:async()=>{}});
 const positions=()=>Promise.all(entries.map(e=>s.libraryPlacement(t.id,e.id)));
 try{await run({s,w,t,entries,placement,writes,state,positions});}finally{globalThis.chrome=old;}
}
test('lost ACK retries immutable single direction and original neighbor without another swap',()=>fixture(async({s,w,entries,placement,writes,state,positions})=>{
 state.lose=true;await w.entryActions(entries[0].id,placement,'down');const committed=await positions();assert.equal(committed[0].revision,1);await w.entryActions(entries[0].id,placement,'down');assert.deepEqual(await positions(),committed);assert.equal(writes.length,2);assert.deepEqual(writes[1],writes[0]);assert.equal(w.entryReorderAttempts.size,0);
}));
for(const mode of ['read-route','IME','flush','epoch'])test('reorder refuses '+mode,()=>fixture(async({s,w,entries,placement,writes,state,positions})=>{
 const before=await positions();if(mode==='IME')w.editor={composing:true};if(mode==='flush')w.flushEditors=async()=>false;if(mode==='read-route')state.hook=async()=>{w.id='other';w.openIntent++;};if(mode==='epoch'){const checked=w.checked;w.checked=async(...args)=>{await s.repository.transaction(true,t=>t.put('meta',{id:'recovery-restore-epoch',value:'replacement'}));return checked(...args);};}await w.entryActions(entries[0].id,placement,'down');assert.deepEqual(await positions(),before);if(mode!=='epoch')assert.equal(writes.length,0);
}));
test('guarded receipt cannot replay across restore and legacy operation remains accepted',()=>fixture(async({s,t,entries,positions})=>{
 const r={topicId:t.id,entryId:entries[0].id,otherEntryId:entries[1].id,expectedTopicRevision:(await s.topic(t.id)).organizationRevision,expectedRecoveryEpoch:'initial',operationId:op()};const result=await s.reorderPlacement(r);assert.deepEqual(await s.reorderPlacement(r),result);await s.repository.transaction(true,t=>t.put('meta',{id:'recovery-restore-epoch',value:'replacement'}));const before=await positions();await assert.rejects(s.reorderPlacement(r),/BACKUP_CHANGED/);assert.deepEqual(await positions(),before);const {expectedRecoveryEpoch,...legacy}=r;legacy.operationId=op();legacy.expectedTopicRevision=(await s.topic(t.id)).organizationRevision;assert.equal((await s.reorderPlacement(legacy)).id,entries[0].id);
}));
test('guarded journal refuses before delegation and does not write',()=>fixture(async({s,t,entries,positions})=>{const before=await positions();let calls=0;s.humanLibraryJournal={execute(){calls++;}};await assert.rejects(s.reorderPlacement({topicId:t.id,entryId:entries[0].id,otherEntryId:entries[1].id,expectedTopicRevision:(await s.topic(t.id)).organizationRevision,expectedRecoveryEpoch:'initial',operationId:op()}),/BNS_HUMAN_UNSUPPORTED_MUTATION/);assert.equal(calls,0);assert.deepEqual(await positions(),before);}));

test('duplicate activation coalesces before the first read and late committed ACK cannot take over route',()=>fixture(async({w,state,entries,placement,writes})=>{
 let release,entered;const seen=new Promise(r=>entered=r);w.flushEditors=()=>{entered();return new Promise(r=>release=r);};const first=w.entryActions(entries[0].id,placement,'down');await seen;await w.entryActions(entries[0].id,placement,'down');assert.equal(writes.length,0);const checked=w.checked;w.checked=async(...args)=>{const result=await checked(...args);w.id='other';w.openIntent++;return result;};release(true);await first;assert.equal(writes.length,1);assert.equal(w.id,'other');assert.equal(w.entryReorderAttempts.size,1);
}));
test('tied ranks retain original layout owner and guarded immutable receipt',()=>fixture(async({s,t,entries,positions})=>{
 const [a,b]=await positions();await s.repository.transaction(true,async tx=>{const row=await tx.get('placements',b.id);row.rank=a.rank;await tx.put('placements',row);});
 const r={topicId:t.id,entryId:entries[0].id,otherEntryId:entries[1].id,expectedTopicRevision:(await s.topic(t.id)).organizationRevision,expectedRecoveryEpoch:'initial',operationId:op()};const result=await s.reorderPlacement(r);assert.ok(result.jobId);assert.deepEqual(await s.reorderPlacement(r),result);for(let n=0;n<40&&(await s.layoutStatus(result.jobId)).state!=='complete';n++)await s.processLibraryMaintenance();assert.equal((await s.layoutStatus(result.jobId)).state,'complete');assert.deepEqual(await s.reorderPlacement(r),result);
}));
test('layout wait stops on route loss and preserves honest paused outcome',()=>fixture(async({w})=>{
 let calls=0;chrome.runtime.sendMessage=async()=>{calls++;return {ok:true,data:{state:'running'}};};await assert.rejects(TopicController.prototype.waitLayout.call(w,'job',()=>false,{stopWhenStale:true}),/LAYOUT_ROUTE_CHANGED/);assert.equal(calls,0);
 chrome.runtime.sendMessage=async()=>({ok:true,data:{state:'paused'}});await assert.rejects(TopicController.prototype.waitLayout.call(w,'job'),/LAYOUT_PAUSED/);
}));
for(const tied of [false,true])test('epoch changes after prior receipt read before '+(tied?'layout':'swap')+' transaction refuse zero mutation',()=>fixture(async({s,t,entries,positions})=>{
 if(tied){const [a,b]=await positions();await s.repository.transaction(true,async tx=>{const row=await tx.get('placements',b.id);row.rank=a.rank;await tx.put('placements',row);});}
 const before=await positions(),r={topicId:t.id,entryId:entries[0].id,otherEntryId:entries[1].id,expectedTopicRevision:(await s.topic(t.id)).organizationRevision,expectedRecoveryEpoch:'initial',operationId:op()},operation=s.operation.bind(s);s.operation=async(...args)=>{await s.repository.transaction(true,t=>t.put('meta',{id:'recovery-restore-epoch',value:'replacement'}));return operation(...args);};await assert.rejects(s.reorderPlacement(r),/BACKUP_CHANGED/);assert.deepEqual(await positions(),before);assert.equal((await s.topic(t.id)).layoutJobId,undefined);assert.equal(await s.priorOperation(r),null);
}));

for(const external of [false,true])test('real mutate own departure '+(external?'plus external leave refuses':'permits exactly one swap'),()=>fixture(async({w,entries,placement,writes,state})=>{
 const old=globalThis.document;globalThis.document={getElementById:()=>({hidden:false,querySelector:()=>null})};
 w.mutate=TopicController.prototype.mutate;w.setBusy=()=>{};w.cancelTopicRestore=()=>{};w.readRetry={hidden:true};w.leave=()=>TopicController.prototype.leaveEditors.call(w);w.refresh=async()=>{};w.readKey=()=>w.id;
 if(external)state.hook=async r=>{if(r.type==='GET_LIBRARY_TOPIC_ADJACENCY')w.statusEpoch++;};
 try{await w.entryActions(entries[0].id,placement,'down');assert.equal(writes.length,external?0:1);assert.equal(w.entryReorderPending,false);}finally{globalThis.document=old;}
}));

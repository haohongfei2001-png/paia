import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,op,rows,raw,topic} from './harness/topic-02.mjs';
import {TopicLifecycleService} from '../core/topic-lifecycle.js';
import {OrganizerStore} from '../core/organizer/store.js';
import {MemoryService} from '../core/memory/service.js';
import {key,policy,profileDefault,validateMemoryRow} from '../core/memory/model.js';
import {BackupService} from '../core/backup-service.js';
import {BackupService as FixtureBackup} from './harness/historical-backup.mjs';
import {exported,prepared} from './harness/backup-v081.mjs';

test('TOPIC-02 dormancy and reactivation keep the exact ID, body, layout, human fields and grants across restart',async()=>{
 const f=await fixture(),a=await topic(f.s,'Human name'),entry=await f.s.createEntry({actor:'user',body:'One independently authored body',type:'idea',formation:'explicit',evidence:[],operationId:op()});await f.s.placeEntry({entryId:entry.id,topicId:a.id,expectedEntryRevision:0,expectedTopicRevision:(await f.s.topic(a.id)).organizationRevision,operationId:op()});const row=await raw(f.s,'topics',a.id),before=await Promise.all(['thoughts','placements','sections'].map(name=>rows(f.s,name))),auth=(await rows(f.s,'meta')).filter(r=>/context|memory|passport/i.test(r.id));
 const service=new TopicLifecycleService(f.s,f.serviceOptions),request={id:a.id,to:'dormant',expectedRevision:row.revision,operationId:op(),scope:f.scope},dormant=await service.change(request);assert.equal(dormant.id,a.id);assert.equal(dormant.lifecycle,'dormant');assert.equal((await f.s.libraryIndexPage()).items.length,0);
 await f.s.repository.close();const s=new OrganizerStore(f.storage,{indexedDB:f.indexedDB}),restart=new TopicLifecycleService(s,f.serviceOptions);assert.deepEqual(await restart.change(request),dormant);const active=await restart.change({id:a.id,to:'active',expectedRevision:dormant.revision,operationId:op(),scope:f.scope});assert.equal(active.id,a.id);assert.equal((await s.topic(a.id)).name,row.name);assert.deepEqual((await s.topic(a.id)).protections,row.protections);assert.equal((await s.topic(a.id)).activeLayoutGeneration,row.activeLayoutGeneration);assert.deepEqual(await Promise.all(['thoughts','placements','sections'].map(name=>rows(s,name))),before);assert.deepEqual((await rows(s,'meta')).filter(r=>/context|memory|passport/i.test(r.id)),auth);assert.equal((await rows(s,'topics')).length,1);
});
test('TOPIC-02 pin, keep, restored lifecycle, removed and redirected identities reject automatic transitions',async()=>{
 for(const protection of ['pin','keep','lifecycle','removed','redirect']){
  const f=await fixture(),a=await topic(f.s),b=await topic(f.s,'Destination');
  if(protection==='removed')await f.s.removeTopic({id:a.id,expectedRevision:0,operationId:op()});else await f.s.foundationWrite(async t=>{const row=await t.get('topics',a.id);if(protection==='pin')row.pinKey=0;else if(protection==='redirect'){row.redirectTo=b.id;row.lifecycle='merged';}else row.protections[protection]={locked:true,reason:'user_edit'};await t.put('topics',row);});
  const before=await rows(f.s,'topics');await assert.rejects(new TopicLifecycleService(f.s,f.serviceOptions).change({id:a.id,to:'dormant',expectedRevision:(await raw(f.s,'topics',a.id)).revision,operationId:op(),scope:f.scope}));assert.deepEqual(await rows(f.s,'topics'),before);
 }
});
test('TOPIC-02 lifecycle stale CAS, preflight authority race and failed journal leave old usable state',async()=>{
 const f=await fixture(),a=await topic(f.s),service=new TopicLifecycleService(f.s,f.serviceOptions),request={id:a.id,to:'dormant',expectedRevision:1,operationId:op(),scope:f.scope};assert.deepEqual(await service.change(request),{conflict:true});
 const original=f.s.operation.bind(f.s);f.s.operation=async(...args)=>{await f.s.foundationWrite(t=>t.put('meta',{id:'recovery-restore-epoch',value:op()}));return original(...args);};await assert.rejects(service.change({...request,expectedRevision:0,operationId:op()}));assert.equal((await f.s.topic(a.id)).lifecycle,'active');f.s.operation=original;
 const write=f.s.foundationWrite.bind(f.s);f.s.foundationWrite=fn=>write(async t=>{const put=t.put.bind(t);t.put=async(name,row,...rest)=>{if(name==='revisions'&&row.reason==='activity')throw Error('synthetic journal failure');return put(name,row,...rest);};return fn(t);});await assert.rejects(service.change({...request,expectedRevision:0,operationId:op()}));f.s.foundationWrite=write;assert.equal((await f.s.topic(a.id)).lifecycle,'active');assert.equal((await f.s.topic(a.id)).revision,0);
});
test('TOPIC-02 allowed Inputs cannot authorize a denied Topic lifecycle mutation',async()=>{
 const f=await fixture(),a=await topic(f.s),before=await rows(f.s,'topics'),service=new TopicLifecycleService(f.s,{resolveProcessing:async(_t,r)=>({allowed:!r.topicIds.includes(a.id),epoch:'unchanged-fixture-epoch',inputIds:[...r.inputIds],topicIds:[...r.topicIds]})});await assert.rejects(service.change({id:a.id,to:'dormant',expectedRevision:0,operationId:op(),scope:f.scope}));assert.deepEqual(await rows(f.s,'topics'),before);
});

async function restrictedActivity(){
 const f=await fixture(),a=await topic(f.s,'Synthetic restricted activity'),b=await topic(f.s,'Synthetic allowed activity');
 let entry=await f.s.createEntry({actor:'user',body:'One synthetic shared body',type:'idea',formation:'explicit',evidence:[],operationId:op()});
 for(const owner of [a,b]){await f.s.placeEntry({entryId:entry.id,topicId:owner.id,expectedEntryRevision:entry.revision,expectedTopicRevision:(await f.s.topic(owner.id)).organizationRevision,operationId:op()});entry=await f.s.entry(entry.id);}
 const memory=new MemoryService(f.s);await memory.ready();
 const allowed={id:key('topic','default',b.id),kind:'topic',version:1,profileId:'default',topicId:b.id,decision:'allowed',layoutGeneration:1};assert.equal(validateMemoryRow(allowed),true);await f.s.foundationWrite(t=>t.put('meta',allowed));
 return {...f,a,b,entry,memory,service:new TopicLifecycleService(f.s,f.serviceOptions)};
}
const activitySnapshot=f=>f.s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all(['topics','thoughts','sections','placements','revisions','operationReceipts','meta'].map(async name=>[name,await t.all(name)]))));
const activityRequest=async f=>({id:f.a.id,to:'dormant',expectedRevision:(await f.s.topic(f.a.id)).revision,operationId:op(),scope:f.scope});
const activityAccess=f=>f.s.repository.transaction(false,async t=>{const topics=new Map((await t.all('topics')).map(row=>[row.id,row])),state=await f.memory.state(t);return {paths:(await f.memory.permittedPaths(t,f.entry.id,topics,policy(state.rows,'default',{},topics))).map(path=>path.topic.id),rules:state.rows};});
for(const restriction of ['denied','never','section','other_profile_never'])test('TOPIC-02 dormancy preserves effective access under '+restriction,async()=>{
 const f=await restrictedActivity();
 if(restriction==='section')await f.memory.exclude({topicId:f.a.id,sectionId:f.a.sectionId,excluded:true});
 else{const profileId=restriction==='other_profile_never'?'retained':'default';if(profileId!=='default')await f.s.foundationWrite(t=>t.put('meta',{...profileDefault(),id:key('profile',profileId),profileId,name:'Synthetic retained profile'}));await f.memory.authorize({topicIds:[f.a.id],profileId,decision:restriction==='other_profile_never'?'never':restriction});}
 const before=await activitySnapshot(f),access=await activityAccess(f);assert.equal(access.paths.length,0);
 await assert.rejects(f.service.change(await activityRequest(f)),{code:'MEMORY_DENIED'});
 assert.deepEqual(await activitySnapshot(f),before);assert.deepEqual(await activityAccess(f),access);
});
test('TOPIC-02 default-off activity remains valid and only the permission owner can clear a veto',async()=>{
 const f=await restrictedActivity();await f.memory.authorize({topicIds:[f.a.id],decision:'denied'});const request=await activityRequest(f);
 await assert.rejects(f.service.change(request),{code:'MEMORY_DENIED'});await f.memory.authorize({topicIds:[f.a.id],decision:'default'});const before=await activityAccess(f);
 const result=await f.service.change(request);assert.equal(result.lifecycle,'dormant');assert.deepEqual((await activityAccess(f)).paths,[f.b.id]);assert.deepEqual((await activityAccess(f)).rules,before.rules);
 const active=await f.service.change({...request,to:'active',expectedRevision:result.revision,operationId:op()});assert.equal(active.id,f.a.id);assert.deepEqual((await activityAccess(f)).rules,before.rules);
});
test('TOPIC-02 actual replace restore restores the current restriction before an unchanged lifecycle request',async()=>{
 const f=await restrictedActivity();await f.memory.authorize({topicIds:[f.a.id],decision:'denied'});const items=await exported(new FixtureBackup(f.s,{appVersion:'0.16.0'}));
 await f.memory.authorize({topicIds:[f.a.id],decision:'default'});const request=await activityRequest(f),backup=new BackupService(f.s),staged=await prepared(backup,items),preview=await backup.previewRestore({sessionId:staged.sessionId,mode:'replace'});
 await backup.restore({sessionId:staged.sessionId,confirmation:preview.integrity,mode:'replace',targetGeneration:preview.targetGeneration,confirmReplace:true});const before=await activitySnapshot(f),access=await activityAccess(f);assert.equal(access.paths.length,0);
 await assert.rejects(f.service.change(request),{code:'MEMORY_DENIED'});assert.deepEqual(await activitySnapshot(f),before);assert.deepEqual(await activityAccess(f),access);
});
test('TOPIC-02 unrelated Topic and empty Section restrictions do not block safe activity',async()=>{
 const f=await restrictedActivity(),other=await topic(f.s,'Unrelated restricted Topic'),empty=await f.s.createSection({topicId:f.a.id,title:'Empty excluded section',expectedTopicRevision:(await f.s.topic(f.a.id)).organizationRevision,operationId:op()});
 await f.memory.authorize({topicIds:[other.id],decision:'denied'});await f.memory.exclude({topicId:f.a.id,sectionId:empty.sectionId,excluded:true});const before=await activityAccess(f);assert.deepEqual(before.paths,[f.b.id]);
 const result=await f.service.change(await activityRequest(f));assert.equal(result.lifecycle,'dormant');assert.deepEqual(await activityAccess(f),before);assert.equal((await f.s.entry(f.entry.id)).body,'One synthetic shared body');
});


import {TopicProcessingAuthority,releaseTopicProcessingAuthority} from '../core/topic-processing-authority.js';
import {createContextScopeWorkBudget,CONTEXT_TOPIC_SCOPE_LIMITS} from '../core/context-topic-scope.js';
import {registerRepositoryFinalReadFence} from '../core/idb-repository.js';

// Exercise the original lifecycle writer, original issuer and original request
// ledger. No standalone guard mutation substitutes for the actual operation.
async function strictActivity({workSignal=null}={}){
 const f=await fixture(),a=await topic(f.s,'SYNTHETIC terminal lifecycle'),caller=Object.freeze({id:op()}),abort=new AbortController(),budget=createContextScopeWorkBudget({database:f.s.repository.db,signal:workSignal}),issued=new WeakSet(),state={current:true,calls:0,caps:[],receipts:[],writeUses:[],onCurrent:null,expiry:Date.now()+600000};
 const processing={resolve:async(_t,scope)=>{state.calls++;const receipt=Object.freeze({version:1,store:f.s,caller,scope,epoch:'synthetic-lifecycle-original-authority',processing:true,expiresAt:state.expiry,revocationSignal:abort.signal});issued.add(receipt);state.receipts.push(receipt);return receipt;},isCurrent:receipt=>{state.onCurrent?.(receipt);return state.current&&issued.has(receipt);}};
 const owner=new TopicProcessingAuthority(f.s,{caller,processing,binding:{operationId:op(),mode:'synthetic_lifecycle'},workBudget:budget}),resolveProcessing=async(t,request)=>{const value=await owner.authorize(t,request);state.caps.push(value.authority);if(t.tx.mode==='readwrite')state.writeUses.push({cap:value.authority,receipt:state.receipts.at(-1),request});return value;};
 return {...f,a,caller,abort,budget,state,owner,resolveProcessing,service:new TopicLifecycleService(f.s,{resolveProcessing})};
}
const terminalSnapshot=f=>f.s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all([...f.s.repository.stores].map(async name=>[name,await t.all(name)]))));
function observeActivityWrite(f,afterPut){const write=f.s.foundationWrite.bind(f.s);f.s.foundationWrite=fn=>write(async t=>{const put=t.put.bind(t);t.put=async(table,row,...rest)=>{const result=await put(table,row,...rest);await afterPut(t,table,row,put);return result;};return fn(t);});return ()=>{f.s.foundationWrite=write;};}
for(const boundary of ['backup revocation','journal issuer'])test('TOPIC-02 original lifecycle terminal authority rolls back after '+boundary,async()=>{
 const f=await strictActivity(),before=await terminalSnapshot(f);let fired=false;const restore=observeActivityWrite(f,async(_t,table,row)=>{if(fired)return;if(boundary==='backup revocation'&&table==='meta'&&row.id==='backup-data-generation'){fired=true;f.abort.abort();}if(boundary==='journal issuer'&&table==='revisions'&&row.reason==='activity'){fired=true;f.state.current=false;}});
 try{const result=await f.service.change(await activityRequest(f)).then(value=>({accepted:true,value}),error=>({accepted:false,code:error.code}));assert.equal(fired,true,'injection follows the real owner put');if(boundary==='backup revocation')assert.equal(f.abort.signal.aborted,true);assert.equal(f.state.writeUses.length,2,'both original write-transaction admissions were genuine');assert.equal(result.accepted,false,JSON.stringify(result));assert.deepEqual(await terminalSnapshot(f),before);}finally{restore();f.owner.release();await f.s.repository.close();}
});
test('TOPIC-02 unchanged original lifecycle authority commits once and exact replay adds no history',async()=>{
 const f=await strictActivity();try{const request=await activityRequest(f),before=await terminalSnapshot(f),result=await f.service.change(request),after=await terminalSnapshot(f);assert.equal(result.lifecycle,'dormant');assert.equal(result.id,f.a.id);assert.equal(after.revisions.filter(r=>r.reason==='activity'&&r.operationId===request.operationId).length,1);assert.equal(after.operationReceipts.length,before.operationReceipts.length+1);assert.deepEqual(await f.service.change(request),result);assert.deepEqual(await terminalSnapshot(f),after);}finally{f.owner.release();await f.s.repository.close();}
});

for(const cause of ['wall expiry','earlier use release','owner release','work signal','reads exhausted','hash fields overrun','hash bytes overrun','ledger signal swap','ledger seen swap','restore epoch'])test('TOPIC-02 original lifecycle terminal rejects '+cause+' after the real backup finalizer',async()=>{
 const workAbort=new AbortController(),f=await strictActivity({workSignal:workAbort.signal}),before=await terminalSnapshot(f),now=Date.now;let fired=false;const restore=observeActivityWrite(f,async(_t,table,row,put)=>{if(fired||table!=='meta'||row.id!=='backup-data-generation')return;fired=true;
  if(cause==='wall expiry')Date.now=()=>f.state.expiry;
  else if(cause==='earlier use release')releaseTopicProcessingAuthority(f.state.writeUses[0].cap);
  else if(cause==='owner release')f.owner.release();
  else if(cause==='work signal')workAbort.abort();
  else if(cause==='reads exhausted')f.budget.reads=CONTEXT_TOPIC_SCOPE_LIMITS.reads;
  else if(cause==='hash fields overrun')f.budget.hashFields=CONTEXT_TOPIC_SCOPE_LIMITS.hashFields+1;
  else if(cause==='hash bytes overrun')f.budget.hashBytes=CONTEXT_TOPIC_SCOPE_LIMITS.hashBytes+1;
  else if(cause==='ledger signal swap')f.budget.signal=new AbortController().signal;
  else if(cause==='ledger seen swap')f.budget.seen=new Map(f.budget.seen);
  else await put('meta',{id:'recovery-restore-epoch',value:'synthetic-late-lifecycle-restore'});
 });
 try{await assert.rejects(f.service.change(await activityRequest(f)));assert.equal(fired,true);Date.now=now;assert.deepEqual(await terminalSnapshot(f),before);}finally{Date.now=now;restore();f.owner.release();await f.s.repository.close();}
});
test('TOPIC-02 lifecycle cannot renew a monotonic lease while its wall clock stalls',async()=>{
 const now=Date.now,wall=now();Date.now=()=>wall;let f,restore,fired=false;
 try{f=await strictActivity();f.state.expiry=wall+1000;const before=await terminalSnapshot(f),started=performance.now();restore=observeActivityWrite(f,async(_t,table,row)=>{if(fired||table!=='meta'||row.id!=='backup-data-generation')return;fired=true;while(performance.now()-started<1100){};});await assert.rejects(f.service.change(await activityRequest(f)));assert.equal(fired,true);Date.now=now;assert.deepEqual(await terminalSnapshot(f),before);}finally{Date.now=now;restore?.();f?.owner.release();await f?.s.repository.close();}
});
test('TOPIC-02 later genuine issuer cannot release an earlier lifecycle use in the final callback round',async()=>{
 const f=await strictActivity(),before=await terminalSnapshot(f);let armed=false,released=0;const restore=observeActivityWrite(f,async(_t,table,row)=>{if(table==='meta'&&row.id==='backup-data-generation')armed=true;});
 try{f.state.onCurrent=receipt=>{if(armed&&!released&&receipt===f.state.writeUses[1]?.receipt){released++;releaseTopicProcessingAuthority(f.state.writeUses[0].cap);}};await assert.rejects(f.service.change(await activityRequest(f)));assert.equal(released,1);assert.deepEqual(await terminalSnapshot(f),before);}finally{restore();f.owner.release();await f.s.repository.close();}
});
test('TOPIC-02 another original repository fence cannot revoke lifecycle authority after its read plan',async()=>{
 const f=await strictActivity(),before=await terminalSnapshot(f);let installed=false,revoked=false;const restore=observeActivityWrite(f,async(t,table,row)=>{if(installed||table!=='revisions'||row.reason!=='activity')return;installed=true;registerRepositoryFinalReadFence(f.s.repository,t,{isCurrent:()=>true,plan:function*(){yield {method:'get',table:'meta',key:'gate'};f.abort.abort();revoked=true;return true;}});});
 try{await assert.rejects(f.service.change(await activityRequest(f)));assert.equal(installed,true);assert.equal(revoked,true);assert.deepEqual(await terminalSnapshot(f),before);}finally{restore();f.owner.release();await f.s.repository.close();}
});
for(const failed of ['topic','search','journal','receipt','backup'])test('TOPIC-02 original lifecycle rolls back every table after actual '+failed+' write failure',async()=>{
 const f=await strictActivity(),before=await terminalSnapshot(f);let fired=false;const restore=observeActivityWrite(f,async(_t,table,row)=>{const match=failed==='topic'?table==='topics':failed==='search'?table==='libraryMigrationItems'&&row.entityKind==='search':failed==='journal'?table==='revisions'&&row.reason==='activity':failed==='receipt'?table==='operationReceipts':table==='meta'&&row.id==='backup-data-generation';if(match&&!fired){fired=true;throw Error('SYNTHETIC original lifecycle '+failed+' storage failure');}});
 try{await assert.rejects(f.service.change(await activityRequest(f)));assert.equal(fired,true);assert.deepEqual(await terminalSnapshot(f),before);}finally{restore();f.owner.release();await f.s.repository.close();}
});
test('TOPIC-02 original legacy DTO lifecycle retains its non-strict direct API',async()=>{
 const f=await fixture(),a=await topic(f.s);try{const result=await new TopicLifecycleService(f.s,f.serviceOptions).change({id:a.id,to:'dormant',expectedRevision:0,operationId:op(),scope:f.scope});assert.equal(result.lifecycle,'dormant');assert.equal((await raw(f.s,'topics',a.id)).lifecycle,'dormant');}finally{await f.s.repository.close();}
});
for(const invalid of ['copied capability','completed read capability','foreign database'])test('TOPIC-02 original lifecycle rejects '+invalid+' before any write',async()=>{
 const f=await strictActivity(),before=await terminalSnapshot(f),original=f.resolveProcessing;let held,other,writes=0;const restore=observeActivityWrite(f,async()=>{writes++;});
 try{if(invalid==='foreign database')other=await strictActivity();f.service.guard.resolveProcessing=async(t,request)=>{if(other)return other.owner.authorize(t,request);const value=await original(t,request);if(invalid==='copied capability')return {...value,authority:{...value.authority}};if(!held)held=value;return held;};await assert.rejects(f.service.change(await activityRequest(f)));assert.equal(writes,0);assert.deepEqual(await terminalSnapshot(f),before);}finally{restore();f.owner.release();await f.s.repository.close();other?.owner.release();await other?.s.repository.close();}
});
test('TOPIC-02 installed human-library journal remains an unsupported-mutation refusal',async()=>{
 const f=await strictActivity(),before=await terminalSnapshot(f);try{f.s.humanLibraryJournal={};await assert.rejects(f.service.change(await activityRequest(f)),{code:'BNS_HUMAN_UNSUPPORTED_MUTATION'});assert.deepEqual(await terminalSnapshot(f),before);}finally{f.s.humanLibraryJournal=null;f.owner.release();await f.s.repository.close();}
});
for(const kind of ['conflict','no-op'])test('TOPIC-02 genuine lifecycle '+kind+' preserves lifecycle identity and refuses revoked completion',async()=>{
 const f=await strictActivity();try{const request={...await activityRequest(f),...(kind==='conflict'?{expectedRevision:1}:{to:'active'})},before=await terminalSnapshot(f),result=await f.service.change(request);assert.deepEqual(result,kind==='conflict'?{conflict:true}:{id:f.a.id,revision:0,lifecycle:'active'});const after=await terminalSnapshot(f);const domain=row=>{const {countVersion,updatedAt,negativeUpdatedSequence,...rest}=row;return rest;};assert.deepEqual(after.topics.map(domain),before.topics.map(domain));assert.deepEqual(after.revisions,before.revisions);assert.equal(after.operationReceipts.length,before.operationReceipts.length+(kind==='conflict'?0:1));
  let fired=false;const source=f.s.sourcePresent.bind(f.s);f.s.sourcePresent=async(...args)=>{const value=await source(...args);fired=true;f.abort.abort();return value;};await assert.rejects(f.service.change({...request,operationId:op()}));assert.equal(fired,true);assert.deepEqual(await terminalSnapshot(f),after);
 }finally{f.owner.release();await f.s.repository.close();}
});

const originalIdentityEpoch='synthetic-lifecycle-original-authority';
const legacyIdentity=request=>({allowed:true,epoch:originalIdentityEpoch,inputIds:[...request.inputIds],topicIds:[...request.topicIds]});
for(const modes of ['GLLL','LGGG','GGLL','LLGG','GGGL','LLLG','GGLG','LLGL'])test('TOPIC-02 private lifecycle mode rejects prepare/write phase switch '+modes,async()=>{
 const f=await strictActivity(),before=await terminalSnapshot(f),original=f.resolveProcessing;let calls=0,writes=0;const restore=observeActivityWrite(f,async()=>{writes++;});
 try{f.service.guard.resolveProcessing=async(t,request)=>modes[calls++]==='G'?original(t,request):legacyIdentity(request);await assert.rejects(f.service.change(await activityRequest(f)));assert.ok(calls>=2&&calls<=4);assert.equal(writes,0);assert.deepEqual(await terminalSnapshot(f),before);}finally{restore();f.owner.release();await f.s.repository.close();}
});
for(const altered of ['copied','evidence reference','authority reference','untracked','foreign guard'])test('TOPIC-02 lifecycle rejects '+altered+' private preparation provenance',async()=>{
 const f=await strictActivity(),before=await terminalSnapshot(f),guard=f.service.guard,prepare=guard.prepareWithProcessingMode.bind(guard);let writes=0;const restore=observeActivityWrite(f,async()=>{writes++;});
 try{guard.prepareWithProcessingMode=async scope=>{if(altered==='untracked')return guard.prepare(scope);if(altered==='foreign guard')return new TopicLifecycleService(f.s,{resolveProcessing:f.resolveProcessing}).guard.prepareWithProcessingMode(scope);const prepared=await prepare(scope);if(altered==='copied')return {...prepared};if(altered==='evidence reference')prepared.evidence=structuredClone(prepared.evidence);else prepared.authority=structuredClone(prepared.authority);return prepared;};await assert.rejects(f.service.change(await activityRequest(f)));assert.equal(writes,0);assert.deepEqual(await terminalSnapshot(f),before);}finally{restore();f.owner.release();await f.s.repository.close();}
});
test('TOPIC-02 pure legacy mode closes later processing admission before any resolver invocation',async()=>{
 const f=await strictActivity(),before=await terminalSnapshot(f);let calls=0,reached=false;f.service.guard.resolveProcessing=async(_t,request)=>{calls++;return legacyIdentity(request);};const source=f.s.sourcePresent.bind(f.s);
 try{f.s.sourcePresent=async(t,ids)=>{reached=true;await f.service.guard.processing(t,f.scope,[f.a.id]);return source(t,ids);};await assert.rejects(f.service.change(await activityRequest(f)));assert.equal(reached,true);assert.equal(calls,4,'closed mode refuses before a fifth resolver call');assert.deepEqual(await terminalSnapshot(f),before);}finally{f.owner.release();await f.s.repository.close();}
});
for(const [mode,count] of [['genuine',20],['genuine',21],['legacy',21],['legacy',100]])test('TOPIC-02 '+mode+' lifecycle preserves its original '+count+' Input scope boundary',async()=>{
 const f=await strictActivity();try{
  await f.s.capture({epoch:(await f.s.status()).epoch,adapterVersion:'0.3.0',chat:{id:'synthetic-lifecycle-scope',url:'https://chatgpt.com/c/synthetic-lifecycle-scope',title:'Synthetic scope'},messages:Array.from({length:count-1},(_,i)=>({sourceMessageId:'scope-input-'+i,pageOrder:i+1,originalText:'SYNTHETIC distinct lifecycle scope contribution '+i}))});
  f.scope=(await rows(f.s,'inputStates')).map(row=>({inputId:row.id,role:'primary',selectedFields:['body']}));assert.equal(f.scope.length,count);if(mode==='legacy')f.service.guard.resolveProcessing=async(_t,request)=>legacyIdentity(request);const before=await terminalSnapshot(f),request=await activityRequest(f);
  if(mode==='genuine'&&count>20){await assert.rejects(f.service.change(request));assert.deepEqual(await terminalSnapshot(f),before);}else{assert.equal((await f.service.change(request)).lifecycle,'dormant');assert.equal((await raw(f.s,'topics',f.a.id)).revision,1);}
 }finally{f.owner.release();await f.s.repository.close();}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,local,derived,inputEdit,capture} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {ContextCardsService,CONTEXT_CARDS_ROW} from '../core/context-cards.js';
import {ContextTopicAccessService} from '../core/context-topic-access.js';
import {CONTEXT_TOPIC_ACCESS_ROW,CONTEXT_TOPIC_ACCESS_LIMITS,emptyContextTopicPreferences,validContextTopicPreferences,validateContextTopicChange} from '../core/context-topic-preferences.js';
import {hashText} from '../core/dedupe.js';
import {MemoryService} from '../core/memory/service.js';
import {key,profileDefault} from '../core/memory/model.js';
import {setTopicLifecycle} from '../core/topic-identity.js';
import {FilterRunner} from '../core/filter-runner.js';
import {BackupService} from '../core/backup-service.js';
import {BACKUP_SECTIONS,backupHash,backupMetaAllowed,projectBackupEntity,validateBackupItem} from '../core/backup-format.js';
import {BackupService as ExistingFileFixture} from './harness/context-legacy-file.mjs';
import {exported,prepared} from './harness/backup-v081.mjs';
import {admitPreGatePurgeFixture} from './harness/pre-gate-purge-fixture.mjs';

const op=()=>crypto.randomUUID();
const raw=(s,name,id)=>s.repository.transaction(false,t=>t.get(name,id));
const rows=(s,name)=>s.repository.transaction(false,t=>t.all(name));
const prefs=s=>raw(s,'meta',CONTEXT_TOPIC_ACCESS_ROW);
const receipts=async s=>(await rows(s,'operationReceipts')).filter(r=>r.id.startsWith('context-topic:'));
const mutate=(s,name,id,fn)=>s.foundationWrite(async t=>{const r=await t.get(name,id);fn(r);await t.put(name,r);});
const createTopic=(s,name='SYNTHETIC Local Topic')=>s.createTopic({name,operationId:op()});
const independent=s=>s.createEntry({operationId:op(),actor:'user',body:'SYNTHETIC_PRIVATE_THOUGHT_BODY',note:'SYNTHETIC_PRIVATE_NOTE',type:'idea',formation:'explicit',evidence:[]});
async function place(s,entryId,topic){return s.placeEntry({entryId,topicId:topic.id,operationId:op(),expectedEntryRevision:(await raw(s,'thoughts',entryId)).revision,expectedTopicRevision:(await raw(s,'topics',topic.id)).organizationRevision});}
async function fixture({empty=false,input=false,pause=false}={}){
 const f=await setup(OrganizerStore),{s}=f;await s.finishFoundation();await s.setFilterMode('off');
 const topic=await createTopic(s),inputRow=(await s.snapshot()).library.blocks[0],entry=empty?null:input?await derived(s,[inputRow.id],{body:'SYNTHETIC_PRIVATE_DERIVED_BODY'}):await independent(s);
 if(entry)await place(s,entry.id,topic);
 const cards=new ContextCardsService(s),access=new ContextTopicAccessService(s),memory=new MemoryService(s);
 if(!pause)for(const name of ['global','inputs'])await cards.change({kind:'access',operationId:op(),epoch:'initial',key:name,enabled:true,expectedRevision:0});
 return {...f,cards,access,memory,topic,entry,input:inputRow};
}
async function item(f,id=f.topic.id){let cursor=null;do{const page=await f.access.page({cursor,limit:100});assert.equal(page.available,true,JSON.stringify(page));const result=page.items.find(x=>x.topicId===id);if(result)return {...result,epoch:page.epoch};cursor=page.nextCursor;}while(cursor);assert.fail('Missing Topic '+id);}
const request=(i,enabled=true,overrides={})=>({topicId:i.topicId,enabled,expectedRevision:i.revision,expectedBinding:enabled?i.expectedBinding:i.binding,epoch:i.epoch,operationId:op(),...overrides});
async function enable(f,id){const c=request(await item(f,id));assert.equal((await f.access.change(c)).ok,true);return c;}
const protectedNames=['records','recordIndex','blocks','blockIndex','documents','libraryDocuments','times','thoughts','topics','sections','placements','inputStates','inputRemovals','tombstones','revisions','provenance','dependencies','organizerJobs'];
const protectedRows=s=>s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all(protectedNames.map(async name=>[name,await t.all(name)]))));
const snapshot=s=>s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all([...protectedNames,'meta','operationReceipts'].map(async name=>[name,await t.all(name)]))));
async function deny(f,id=f.topic.id,profileId='default',decision='denied'){
 await f.memory.ready();if(profileId!=='default')await f.s.foundationWrite(t=>t.put('meta',{...profileDefault(),id:key('profile',profileId),profileId,name:'SYNTHETIC_PRIVATE_PROFILE',instruction:'SYNTHETIC_PRIVATE_INSTRUCTION'}));
 await f.s.foundationWrite(t=>t.put('meta',{id:key('topic',profileId,id),kind:'topic',version:1,profileId,topicId:id,decision,layoutGeneration:1}));
}
async function merge(s,a,b){await s.startLayout({kind:'topic_merge',topicId:a.id,survivorId:b.id,expectedTopicRevision:(await raw(s,'topics',a.id)).organizationRevision,expectedSurvivorRevision:(await raw(s,'topics',b.id)).organizationRevision,operationId:op()});await s.drainLibraryMaintenance();return (await s.revisions({kind:'topic',entityId:b.id})).items.find(x=>x.reason==='merge');}
async function restoreSide(s,b,revision,side){return s.restoreRevision({id:revision.id,side,expectedRevision:(await raw(s,'topics',b.id)).revision,operationId:op()});}

test('CTX4-03 actual local directory defaults off without initializing or writing preferences, bodies or receipts',async()=>{
 const f=await fixture({input:true,pause:true}),before=await snapshot(f.s),run=f.s.run;f.s.run=()=>{throw Error('A read must not initialize storage');};
 const page=await f.access.page();f.s.run=run;assert.equal(page.available,true);assert.equal(page.complete,true);assert.equal(page.externalAllowed,false);assert.equal(page.selectedCount,0);
 const i=page.items[0];assert.equal(i.name,'SYNTHETIC Local Topic');assert.equal(i.enabled,false);assert.equal(i.revision,0);assert.equal(i.binding,null);assert.equal(i.bindingValid,false);assert.equal(i.policyAllowed,false);assert.equal(i.canEnable,true);assert.equal(i.reason,'topic_off');assert.ok(i.expectedBinding);
 assert.equal(await prefs(f.s),undefined);assert.deepEqual(await snapshot(f.s),before);
 for(const forbidden of ['SYNTHETIC_PRIVATE','thoughtText','summary','instruction','fieldDigests','sourceRecordIds'])assert.ok(!JSON.stringify(page).includes(forbidden));
 const summary=await f.s.repository.transaction(false,t=>f.access.summaryInTransaction(t,'initial'));assert.deepEqual(summary,{available:true,selectedCount:0,selectedNames:[],remainingSelectedCount:0,reason:'preferences_ready',externalAllowed:false});
 const unopened=new OrganizerStore(local());unopened.repository.open=()=>{throw Error('must not open');};assert.equal((await new ContextTopicAccessService(unopened).page()).reason,'not_ready');
});

for(const variant of ['unknown','extra','duplicate','bad_binding','missing_binding_field','name_copy','bad_revision'])test('CTX4-03 refuses '+variant+' preferences without upgrade, repair or grants',async()=>{
 const f=await fixture(),c=await enable(f),original=await prefs(f.s),row=structuredClone(original);
 if(variant==='unknown')row.version=2;if(variant==='extra')row.extra='SYNTHETIC_PRIVATE_EXTRA';if(variant==='duplicate')row.choices.push(structuredClone(row.choices[0]));if(variant==='bad_binding')row.choices[0].binding.layoutGeneration=0;if(variant==='missing_binding_field')delete row.choices[0].binding.organizationOperationDigest;if(variant==='name_copy')row.choices[0].name='SYNTHETIC_PRIVATE_NAME';if(variant==='bad_revision')row.choices[0].revision=row.revision+1;
 assert.equal(validContextTopicPreferences(row),false);await f.s.repository.transaction(true,t=>t.put('meta',row));const before=await snapshot(f.s);
 const page=await f.access.page();assert.equal(page.available,false);assert.equal(page.reason,'preferences_unavailable');assert.equal(page.selectedCount,null);assert.equal((await f.s.repository.transaction(false,t=>f.access.summaryInTransaction(t,'initial'))).available,false);
 await assert.rejects(f.access.change({...c,operationId:op()}));assert.deepEqual(await snapshot(f.s),before);
});

test('CTX4-03 explicit selection persists after reopening and preserves full Source/Input/Thought ownership',async()=>{
 const f=await fixture({input:true});await inputEdit(f.s,f.input.id,{note:'SYNTHETIC_PRIVATE_HUMAN_NOTE'});await f.s.drainInvalidations();
 const before=await protectedRows(f.s),cards=await raw(f.s,'meta',CONTEXT_CARDS_ROW),c=await enable(f),stored=await prefs(f.s);assert.equal(validContextTopicPreferences(stored),true);
 assert.deepEqual(Object.keys(stored).sort(),['choices','id','revision','version']);assert.equal(stored.choices[0].enabled,true);assert.equal((await item(f)).policyAllowed,true);assert.deepEqual(await protectedRows(f.s),before);assert.deepEqual(await raw(f.s,'meta',CONTEXT_CARDS_ROW),cards);
 await f.s.repository.close();f.s=new OrganizerStore(f.storage,{indexedDB:f.indexedDB});await f.s.finishFoundation();f.access=new ContextTopicAccessService(f.s);
 assert.deepEqual(await prefs(f.s),stored);assert.equal((await item(f)).enabled,true);assert.equal((await item(f)).policyAllowed,true);assert.deepEqual(await protectedRows(f.s),before);
 const replay=await f.access.change(c);assert.equal(replay.revision,1);assert.equal(replay.externalAllowed,false);assert.deepEqual(await prefs(f.s),stored);assert.equal((await receipts(f.s)).length,1);
});

for(const count of [20,50,144])test('CTX4-03 reaches every one of '+count+' Topics in stable order without any off-Topic body assessment',async()=>{
 const f=await fixture({empty:true});for(let i=1;i<count;i++)await createTopic(f.s,'SYNTHETIC Topic '+i);
 const before=await snapshot(f.s),transaction=f.s.repository.transaction.bind(f.s.repository);let bodyReads=0;
 f.s.repository.transaction=(write,fn,stores)=>transaction(write,t=>{const get=t.get.bind(t);t.get=(name,id)=>{if(['thoughts','blocks','dependencies','placements'].includes(name))bodyReads++;return get(name,id);};return fn(t);},stores);
 let cursor=null,all=[];do{const page=await f.access.page({cursor,limit:17});assert.equal(page.available,true,JSON.stringify(page));all.push(...page.items);cursor=page.nextCursor;assert.equal(page.complete,cursor===null);}while(cursor);
 f.s.repository.transaction=transaction;assert.equal(all.length,count);assert.equal(new Set(all.map(x=>x.topicId)).size,count);assert.equal(bodyReads,0);
 const expected=(await rows(f.s,'topics')).sort((a,b)=>f.s.repository.factory.cmp(JSON.stringify([a.createdAt,a.id]),JSON.stringify([b.createdAt,b.id]))).map(x=>x.id);assert.deepEqual(all.map(x=>x.topicId),expected);assert.deepEqual(await snapshot(f.s),before);
 const last=all.at(-1),initial=all.map(x=>x.topicId);await enable(f,last.topicId);all=[];cursor=null;do{const page=await f.access.page({cursor,limit:50});assert.equal(page.available,true);all.push(...page.items);cursor=page.nextCursor;}while(cursor);assert.deepEqual(all.map(x=>x.topicId),initial);
});

test('CTX4-03 same-ID rename and dormancy retain choice; new and promoted IDs default off',async()=>{
 const f=await fixture({empty:true});await enable(f);const stored=await prefs(f.s);await f.s.renameTopic({id:f.topic.id,name:'SYNTHETIC Renamed',expectedRevision:0,operationId:op()});assert.equal((await item(f)).name,'SYNTHETIC Renamed');assert.equal((await item(f)).policyAllowed,true);assert.deepEqual(await prefs(f.s),stored);
 await mutate(f.s,'topics',f.topic.id,t=>setTopicLifecycle(t,'dormant',{actor:'ai',operationId:op(),at:f.s.clock()}));assert.equal((await item(f)).policyAllowed,true);
 const next=await createTopic(f.s,'SYNTHETIC New identity');assert.equal((await item(f,next.id)).enabled,false);
 // Synthetic retained hidden candidate; promotion itself uses the lifecycle owner.
 await mutate(f.s,'topics',next.id,t=>{t.lifecycle='candidate';t.activeKey=1;});assert.ok(!(await f.access.page()).items.some(x=>x.topicId===next.id));
 await mutate(f.s,'topics',next.id,t=>setTopicLifecycle(t,'active',{actor:'ai',operationId:op(),at:f.s.clock()}));assert.equal((await item(f,next.id)).enabled,false);assert.deepEqual(await prefs(f.s),stored);
});

test('CTX4-03 remove/restore and missing/recreated identity retain a visible stale choice that can be disabled',async()=>{
 const f=await fixture({empty:true});await enable(f);const old=await item(f),stored=await prefs(f.s);
 await f.s.removeTopic({id:f.topic.id,expectedRevision:0,operationId:op()});let current=await item(f);assert.equal(current.enabled,true);assert.equal(current.bindingValid,false);assert.equal(current.policyAllowed,false);assert.equal(current.canDisable,true);assert.equal(current.lifecycle,'removed');assert.deepEqual(await prefs(f.s),stored);
 await f.s.restoreTopicContainer({id:f.topic.id,expectedRevision:(await raw(f.s,'topics',f.topic.id)).revision,operationId:op()});current=await item(f);assert.equal(current.reason,'selection_stale');assert.equal(current.policyAllowed,false);assert.equal((await f.access.change(request(old,true,{operationId:op()}))).conflict,true);
 assert.equal((await f.access.change(request(current,false))).ok,true);assert.deepEqual((await prefs(f.s)).choices[0].binding,old.binding);assert.equal((await item(f)).enabled,false);
 await enable(f);await f.s.foundationWrite(t=>t.delete('topics',f.topic.id));current=await item(f);assert.equal(current.lifecycle,'missing');assert.equal(current.name,'');assert.equal(current.enabled,true);assert.equal(current.canDisable,true);assert.equal((await f.access.change(request(current,false))).ok,true);
});

test('CTX4-03 merge and repeated Undo/redo cannot resurrect source or survivor choices without explicit reselection',async()=>{
 const f=await fixture({empty:true}),source=await createTopic(f.s,'SYNTHETIC Merge source');await enable(f);await enable(f,source.id);const original=await prefs(f.s),revision=await merge(f.s,source,f.topic);
 let page=await f.access.page();assert.ok(page.items.filter(x=>x.enabled).every(x=>!x.policyAllowed&&!x.bindingValid));assert.equal(page.items.find(x=>x.topicId===source.id).lifecycle,'merged');
 await restoreSide(f.s,f.topic,revision,'before');for(const id of [source.id,f.topic.id])assert.equal((await item(f,id)).reason,'selection_stale');assert.deepEqual(await prefs(f.s),original);
 await enable(f);const renewed=await prefs(f.s);await restoreSide(f.s,f.topic,revision,'after');await restoreSide(f.s,f.topic,revision,'before');assert.equal((await item(f)).reason,'selection_stale');assert.deepEqual(await prefs(f.s),renewed);
});

for(const keyName of ['global','inputs'])test('CTX4-03 '+keyName+' pause preserves choices and permits an explicit otherwise eligible local selection',async()=>{
 const f=await fixture({empty:true});await enable(f);const stored=await prefs(f.s);await f.cards.change({kind:'access',key:keyName,enabled:false,expectedRevision:1,epoch:'initial',operationId:op()});
 let i=await item(f);assert.equal(i.enabled,true);assert.equal(i.bindingValid,true);assert.equal(i.policyAllowed,false);assert.equal(i.reason,keyName+'_off');assert.deepEqual(await prefs(f.s),stored);
 const other=await createTopic(f.s,'SYNTHETIC Selected while paused');await enable(f,other.id);i=await item(f,other.id);assert.equal(i.enabled,true);assert.equal(i.policyAllowed,false);assert.equal(i.reason,keyName+'_off');
 await f.cards.change({kind:'access',key:keyName,enabled:true,expectedRevision:2,epoch:'initial',operationId:op()});assert.equal((await item(f,other.id)).policyAllowed,true);
});

for(const restriction of ['denied','never','other_profile','shared_placement','entry','input','section','wrong_digest','content_change','source_purge'])test('CTX4-03 producer '+restriction+' blocks new choice and blocks retained effective access',async()=>{
 const f=await fixture({input:true});await enable(f);const enabled=await prefs(f.s);
 if(['denied','never','other_profile'].includes(restriction))await deny(f,f.topic.id,restriction==='other_profile'?'SYNTHETIC-other-profile':'default',restriction==='never'?'never':'denied');
 if(restriction==='shared_placement'){const other=await createTopic(f.s,'SYNTHETIC Shared restricted Topic');await place(f.s,f.entry.id,other);await deny(f,other.id);await mutate(f.s,'thoughts',f.entry.id,e=>{e.topics=[f.topic.id];});}
 if(['entry','input','section'].includes(restriction))await f.memory.exclude({excluded:true,...(restriction==='entry'?{entryId:f.entry.id}:restriction==='input'?{inputId:f.input.id}:{topicId:f.topic.id,sectionId:f.topic.sectionId})});
 if(restriction==='wrong_digest')await mutate(f.s,'dependencies',JSON.stringify([f.input.id,'entry',f.entry.id]),d=>{d.fieldDigests.body='f'.repeat(64);});
 if(restriction==='content_change')await inputEdit(f.s,f.input.id,{libraryText:'SYNTHETIC_PRIVATE_NEW_BODY'});
 if(restriction==='source_purge')await admitPreGatePurgeFixture(f.s,f.input.sourceRecordId);
 const i=await item(f);assert.equal(i.enabled,true);assert.equal(i.policyAllowed,false);assert.equal(i.canDisable,true);assert.deepEqual(await prefs(f.s),enabled);
 const denied=await f.access.change(request(i));assert.equal(denied.ok,false);assert.deepEqual(await prefs(f.s),enabled);
 assert.equal((await f.access.change(request(i,false))).ok,true);assert.equal((await item(f)).enabled,false);
});

test('CTX4-03 distinct Entries sharing Input do not acquire sibling Topic veto; direct Input veto remains',async()=>{
 const f=await fixture({input:true}),other=await createTopic(f.s,'SYNTHETIC Independent idea'),entry=await derived(f.s,[f.input.id]);await place(f.s,entry.id,other);await deny(f,other.id);await enable(f);assert.equal((await item(f)).policyAllowed,true);
 await f.memory.exclude({inputId:f.input.id,excluded:true});assert.equal((await item(f)).reason,'legacy_restricted');
});

test('CTX4-03 filter eligibility is checked by actual owner before enabling and on later reads',async()=>{
 const f=await fixture({empty:true});await f.s.capture(capture((await f.s.status()).epoch,'synthetic-filter-item','继续'));const input=(await f.s.snapshot()).library.blocks.find(x=>x.id!==f.input.id),entry=await derived(f.s,[input.id]);await place(f.s,entry.id,f.topic);await enable(f);
 await f.s.setFilterMode('light');await new FilterRunner(f.s).wake();const i=await item(f);assert.equal(i.reason,'content_unavailable');assert.equal((await f.access.change(request(i))).ok,false);assert.equal((await f.access.change(request(i,false))).ok,true);
});

test('CTX4-03 exact lost acknowledgment replay is historical after policy change and different intents never retarget it',async()=>{
 const f=await fixture({input:true}),c=await enable(f),result=await f.access.change(c),digest=await hashText(JSON.stringify(c));await deny(f);const before=await snapshot(f.s);
 assert.deepEqual(await f.access.change(c),result);assert.deepEqual(await f.access.outcome({operationId:c.operationId,digest,epoch:c.epoch}),{state:'committed',result,externalAllowed:false});assert.equal((await item(f)).policyAllowed,false);
 for(const edit of [{enabled:false},{topicId:'synthetic-other-topic',expectedBinding:{...c.expectedBinding,topicId:'synthetic-other-topic'}},{expectedRevision:1}])await assert.rejects(f.access.change({...c,...edit}),{code:'INVALID_REQUEST'});
 assert.equal((await f.access.outcome({operationId:c.operationId,digest:'e'.repeat(64),epoch:c.epoch})).state,'unknown');assert.equal((await f.access.outcome({operationId:op(),digest,epoch:c.epoch})).state,'not_committed');assert.deepEqual(await snapshot(f.s),before);
});

test('CTX4-03 same-operation double click is one atomic receipt; competing expected revisions conflict',async()=>{
 const f=await fixture({empty:true}),i=await item(f),c=request(i),same=await Promise.all([f.access.change(c),f.access.change(c)]);assert.deepEqual(same[0],same[1]);assert.equal((await receipts(f.s)).length,1);assert.equal((await prefs(f.s)).revision,1);
 const current=await item(f),changes=[request(current,false),request(current,false)],results=await Promise.all(changes.map(c=>f.access.change(c)));assert.equal(results.filter(x=>x.ok).length,1);assert.equal(results.filter(x=>x.conflict).length,1);assert.equal((await prefs(f.s)).revision,2);assert.equal((await receipts(f.s)).length,2);
});

test('CTX4-03 page cursor is invalidated by a saved choice and never continues an old authority',async()=>{
 const f=await fixture({empty:true});await createTopic(f.s,'SYNTHETIC Second Topic');const page=await f.access.page({limit:1});assert.ok(page.nextCursor);await enable(f);const stale=await f.access.page({cursor:page.nextCursor,limit:1});assert.equal(stale.available,false);assert.equal(stale.reason,'stale_authority');assert.deepEqual(stale.items,[]);assert.equal(stale.complete,false);
});

test('CTX4-03 disabling absent default-off state writes only a body-free no-op receipt',async()=>{
 const f=await fixture({empty:true}),c={topicId:'synthetic-missing-topic',enabled:false,expectedRevision:0,expectedBinding:null,epoch:'initial',operationId:op()},before=await protectedRows(f.s),result=await f.access.change(c);assert.equal(result.ok,true);assert.equal(result.noOp,true);assert.equal(result.revision,0);assert.equal(await prefs(f.s),undefined);assert.deepEqual(await protectedRows(f.s),before);assert.equal((await receipts(f.s)).length,1);
});

for(const variant of ['abort','quota'])test('CTX4-03 '+variant+' cannot commit preference without its exact receipt',async()=>{
 const f=await fixture({empty:true}),c=request(await item(f)),before=await snapshot(f.s),transaction=f.s.repository.transaction.bind(f.s.repository);
 f.s.repository.transaction=(write,fn,stores)=>transaction(write,t=>{if(write){const put=t.put.bind(t);t.put=async(name,row,...args)=>{if(name==='operationReceipts'&&row.namespace==='context-topic-access'){if(variant==='abort'){t.tx.abort();throw Error('synthetic abort');}throw Object.assign(Error('synthetic quota'),{name:'QuotaExceededError'});}return put(name,row,...args);};}return fn(t);},stores);
 await assert.rejects(f.access.change(c),error=>['STORAGE_FULL','STORAGE_FAILED'].includes(error.code));f.s.repository.transaction=transaction;assert.deepEqual(await snapshot(f.s),before);assert.equal((await f.access.outcome({operationId:c.operationId,digest:await hashText(JSON.stringify(c)),epoch:c.epoch})).state,'not_committed');assert.equal((await f.access.change(c)).ok,true);
});

// Hold only the selected call; actual-owner mutations use the original crypto.
async function holdHash(f,c,number,whileHeld){
 const subtle=crypto.subtle,original=subtle.digest,transaction=f.s.repository.transaction.bind(f.s.repository);let count=0,active=0,start,release;
 const started=new Promise(resolve=>{start=resolve;}),resume=new Promise(resolve=>{release=resolve;});
 f.s.repository.transaction=async(...args)=>{active++;try{return await transaction(...args);}finally{active--;}};
 subtle.digest=async function(...args){if(++count===number){assert.equal(active,0,'hashing never awaits in a live IDB transaction');start();await resume;}return original.apply(this,args);};
 let pending;try{pending=f.access.change(c);await Promise.race([started,pending.then(()=>assert.fail('Expected held request'))]);await whileHeld(pending);release();return await pending;}finally{release();if(pending)await pending.catch(()=>{});subtle.digest=original;f.s.repository.transaction=transaction;}
}

for(const phase of ['request','scope'])test('CTX4-03 held '+phase+' digest reserves exact pending attempt before outcome can say not committed',async()=>{
 const f=await fixture({input:true}),c=request(await item(f)),digest=await hashText(JSON.stringify(c));let retry;
 const result=await holdHash(f,c,phase==='request'?1:2,async pending=>{
  assert.deepEqual(await new ContextTopicAccessService(f.s).outcome({operationId:c.operationId,digest,epoch:c.epoch}),{state:'unknown',externalAllowed:false});
  retry=new ContextTopicAccessService(f.s).change(c);assert.strictEqual(retry,pending,'same exact in-flight Promise across service instances');assert.strictEqual(f.access.change(c),pending);await assert.rejects(f.access.change({...c,enabled:false}),{code:'INVALID_REQUEST'});assert.equal(await prefs(f.s),undefined);assert.equal((await receipts(f.s)).length,0);
 });assert.deepEqual(await retry,result);assert.equal(result.ok,true);assert.equal((await receipts(f.s)).length,1);assert.equal((await f.access.outcome({operationId:c.operationId,digest,epoch:c.epoch})).state,'committed');
});

for(const variant of ['content','legacy','capture_pause','consent'])test('CTX4-03 held scope digest refuses concurrent '+variant+' without persisting a choice',async()=>{
 const f=await fixture({input:true}),c=request(await item(f));let before;
 const result=await holdHash(f,c,2,async()=>{if(variant==='content')await inputEdit(f.s,f.input.id,{libraryText:'SYNTHETIC_PRIVATE_CONCURRENT_CONTENT'});if(variant==='legacy')await deny(f);if(variant==='capture_pause')await f.s.setEnabled(false);if(variant==='consent')f.s.controlCache.settings.consentVersion=null;before=await snapshot(f.s);});
 assert.equal(result.ok,false);assert.equal(await prefs(f.s),undefined);assert.equal((await receipts(f.s)).length,0);assert.deepEqual(await snapshot(f.s),before);
});

for(const variant of ['content','legacy','rename','remove'])test('CTX4-03 final strict write refuses held prewrite '+variant+' mutation after producer evaluation',async()=>{
 const f=await fixture({input:true}),c=request(await item(f)),write=f.s.write.bind(f.s);let injected=false,before;
 f.s.write=async fn=>{if(!injected){injected=true;f.s.write=write;if(variant==='content')await inputEdit(f.s,f.input.id,{libraryText:'SYNTHETIC_PRIVATE_BEFORE_WRITE'});if(variant==='legacy')await deny(f);if(variant==='rename')await f.s.renameTopic({id:f.topic.id,name:'SYNTHETIC racing rename',expectedRevision:(await raw(f.s,'topics',f.topic.id)).revision,operationId:op()});if(variant==='remove')await f.s.removeTopic({id:f.topic.id,expectedRevision:(await raw(f.s,'topics',f.topic.id)).revision,operationId:op()});before=await snapshot(f.s);}return write(fn);};
 const result=await f.access.change(c);assert.equal(result.ok,false);assert.equal(result.reason,'stale_authority');assert.equal(await prefs(f.s),undefined);assert.deepEqual(await snapshot(f.s),before);
});

test('CTX4-03 selected page final fence rejects content mutation interleaved after its scope assessment',async()=>{
 const f=await fixture({input:true});await enable(f);const transaction=f.s.repository.transaction.bind(f.s.repository);let metadataReads=0,injected=false;
 f.s.repository.transaction=async(write,fn,stores)=>{if(!write&&stores?.length===1&&stores[0]==='meta'&&++metadataReads===2){injected=true;f.s.repository.transaction=transaction;await inputEdit(f.s,f.input.id,{libraryText:'SYNTHETIC_PRIVATE_AFTER_SCOPE'});}return transaction(write,fn,stores);};
 const page=await f.access.page();f.s.repository.transaction=transaction;assert.equal(injected,true);assert.equal(page.available,false);assert.equal(page.reason,'stale_authority');assert.deepEqual(page.items,[]);
});

for(const variant of ['premature','repeated','budget','corrupt_authority'])test('CTX4-03 '+variant+' directory or authority refuses without a truncated complete page',async()=>{
 const f=await fixture({empty:true}),transaction=f.s.repository.transaction.bind(f.s.repository),before=await snapshot(f.s);
 if(variant==='corrupt_authority')await f.s.repository.transaction(true,t=>t.put('meta',{id:'thought-sequence',value:'SYNTHETIC_PRIVATE_BAD_AUTHORITY'}));
 f.s.repository.transaction=(write,fn,stores)=>transaction(write,t=>{const scan=t.primaryRangePage.bind(t),count=t.count.bind(t);if(variant==='budget')t.count=(name,...args)=>name==='topics'?Promise.resolve(CONTEXT_TOPIC_ACCESS_LIMITS.choices+1):count(name,...args);t.primaryRangePage=async(name,options)=>{const page=await scan(name,options);if(name==='topics'&&variant==='premature')return {rows:[],next:null};if(name==='topics'&&variant==='repeated')return {rows:[...page.rows,...page.rows],next:null};return page;};return fn(t);},stores);
 const page=await f.access.page();f.s.repository.transaction=transaction;assert.equal(page.available,false);assert.equal(page.complete,false);assert.deepEqual(page.items,[]);assert.ok(!JSON.stringify(page).includes('SYNTHETIC_PRIVATE'));if(variant!=='corrupt_authority')assert.deepEqual(await snapshot(f.s),before);
});

test('CTX4-03 actual existing-file replacement preserves local body-free preferences but rotates effective binding epoch',async()=>{
 const f=await fixture({input:true}),file=await exported(new ExistingFileFixture(f.s));await enable(f);const stored=await prefs(f.s),prior=await item(f),backup=new BackupService(f.s),stage=await prepared(backup,file),preview=await backup.previewRestore({sessionId:stage.sessionId,mode:'replace'});assert.equal(preview.canRestore,true,preview.reason);
 await backup.restore({sessionId:stage.sessionId,confirmation:preview.integrity,mode:'replace',targetGeneration:preview.targetGeneration,confirmReplace:true});assert.deepEqual(await prefs(f.s),stored);const i=await item(f);assert.notEqual(i.epoch,prior.epoch);assert.equal(i.enabled,true);assert.equal(i.bindingValid,false);assert.equal(i.policyAllowed,false);assert.equal(i.reason,'selection_stale');
 assert.equal((await f.access.change(request(i,false))).ok,true);assert.deepEqual((await prefs(f.s)).choices[0].binding,stored.choices[0].binding);assert.equal((await item(f)).enabled,false);
});

test('CTX4-03 disjoint existing-file merge imports no choice and cannot renew existing local binding',async()=>{
 const f=await fixture({empty:true});await enable(f);const stored=await prefs(f.s),source={s:new OrganizerStore(local(),{indexedDB:f.indexedDB,name:'synthetic-disjoint-branch'})};await source.s.consent(true);await source.s.finishFoundation();await source.s.setFilterMode('off');
 // A synthetic disjoint branch shares its original identity-token namespace;
 // the real Backup owner correctly refuses unrelated suppression namespaces.
 const identityKey=await raw(f.s,'meta','thought-suppression-key');await source.s.foundationWrite(t=>t.put('meta',identityKey));source.topic=await createTopic(source.s,'SYNTHETIC Imported independent Topic');source.access=new ContextTopicAccessService(source.s);const file=await exported(new ExistingFileFixture(source.s));await enable(source);await assert.rejects(exported(new ExistingFileFixture(source.s)),{code:'BACKUP_INVALID'});
 const backup=new BackupService(f.s),stage=await prepared(backup,file),preview=await backup.previewRestore({sessionId:stage.sessionId,mode:'merge'});assert.equal(preview.canRestore,true,preview.reason);
 await backup.restore({sessionId:stage.sessionId,confirmation:preview.integrity,mode:'merge',targetGeneration:preview.targetGeneration,confirmMerge:true});assert.deepEqual(await prefs(f.s),stored);assert.equal((await item(f,source.topic.id)).enabled,false);assert.equal((await item(f)).bindingValid,true);
});

test('CTX4-03 selection row and any copied secret/body cannot enter portable Backup admission',async()=>{
 const f=await fixture({empty:true}),file=await exported(new ExistingFileFixture(f.s));await enable(f);const row=await prefs(f.s);assert.equal(backupMetaAllowed(row.id),false);
 for(const data of [row,{...row,body:'SYNTHETIC_PRIVATE_BODY'},{...row,secret:'SYNTHETIC_PRIVATE_SECRET'}])assert.throws(()=>validateBackupItem({type:'item',section:'organizationState',value:{id:row.id,data}}),{code:'BACKUP_INVALID'});
 assert.ok(!file.some(x=>x.section==='organizationState'&&x.value.id===row.id));assert.equal(await f.s.repository.transaction(false,t=>new ExistingFileFixture(f.s).project(t,'organizationState',row)),null);await assert.rejects(exported(new ExistingFileFixture(f.s)),{code:'BACKUP_INVALID'});assert.ok(!JSON.stringify(await receipts(f.s)).includes('SYNTHETIC'));
 await assert.rejects(new BackupService(f.s).beginExport(),{code:'FEATURE_UNAVAILABLE'});
});

test('CTX4-03 current B-02 human-content purge refusal remains unchanged with selections and receipts',async()=>{
 const f=await fixture({input:true});await inputEdit(f.s,f.input.id,{note:'SYNTHETIC_PRIVATE_HUMAN_PURGE_NOTE'});await f.s.drainInvalidations();await enable(f);const before=await snapshot(f.s);
 assert.deepEqual(await f.s.sourcePurgePreflight(f.input.sourceRecordId),{state:'owner_gate_required',gate:'B-02',targetRef:f.input.sourceRecordId});await assert.rejects(f.s.permanentDelete(f.input.sourceRecordId),{code:'SOURCE_PURGE_OWNER_GATE'});assert.deepEqual(await snapshot(f.s),before);
});

for(const variant of ['extra','missing','null_binding','wrong_topic','wrong_epoch','extra_binding','bad_operation'])test('CTX4-03 strict '+variant+' request refuses before durable writes',async()=>{
 const f=await fixture({empty:true}),c=request(await item(f)),before=await snapshot(f.s);if(variant==='extra')c.body='SYNTHETIC_PRIVATE_BODY';if(variant==='missing')delete c.expectedRevision;if(variant==='null_binding')c.expectedBinding=null;if(variant==='wrong_topic')c.expectedBinding.topicId='different-synthetic-topic';if(variant==='wrong_epoch')c.expectedBinding.epoch=op();if(variant==='extra_binding')c.expectedBinding.name='SYNTHETIC_PRIVATE_NAME';if(variant==='bad_operation')c.operationId='not-uuid';assert.throws(()=>validateContextTopicChange(c),{code:'INVALID_REQUEST'});await assert.rejects(f.access.change(c),{code:'INVALID_REQUEST'});assert.deepEqual(await snapshot(f.s),before);
});

test('CTX4-03 untouched Source purge admission stays identical with local choices and body-free receipts',async()=>{
 const f=await fixture({empty:true}),preview=await f.s.sourcePurgePreflight(f.input.sourceRecordId);assert.equal(preview.state,'unambiguous');await enable(f);const stored=await prefs(f.s);assert.deepEqual(await f.s.sourcePurgePreflight(f.input.sourceRecordId),preview);
 await f.s.permanentDelete(f.input.sourceRecordId);assert.equal((await rows(f.s,'records')).length,0);assert.deepEqual(await prefs(f.s),stored);assert.equal((await item(f)).policyAllowed,true,'a genuinely empty Topic consumes no purged Source');await f.s.capture(capture((await f.s.status()).epoch));assert.equal((await rows(f.s,'records')).length,0);
});

for(const variant of ['unknown_namespace','extra_result','wrong_target','wrong_enabled','malformed_revision','extra_receipt'])test('CTX4-03 '+variant+' receipt never acknowledges an unrelated or malformed choice',async()=>{
 const f=await fixture({empty:true}),c=await enable(f),digest=await hashText(JSON.stringify(c));await mutate(f.s,'operationReceipts','context-topic:'+c.operationId,r=>{if(variant==='unknown_namespace')r.namespace='unknown';if(variant==='extra_result')r.result.body='SYNTHETIC_PRIVATE_RECEIPT_BODY';if(variant==='wrong_target'){r.ownerId='synthetic-other-topic';r.result.topicId=r.ownerId;}if(variant==='wrong_enabled')r.result.enabled=false;if(variant==='malformed_revision')r.result.revision=2;if(variant==='extra_receipt')r.body='SYNTHETIC_PRIVATE_RECEIPT_BODY';});const before=await snapshot(f.s);
 await assert.rejects(f.access.change(c),{code:'INVALID_REQUEST'});const outcome=await f.access.outcome({operationId:c.operationId,digest,epoch:c.epoch});if(['unknown_namespace','extra_result','extra_receipt'].includes(variant))assert.equal(outcome.state,'unknown');assert.ok(!JSON.stringify(outcome).includes('SYNTHETIC_PRIVATE'));assert.deepEqual(await snapshot(f.s),before);
});

async function historicalReceiptFile(base,item){
 // Build an otherwise valid legacy file, including its real integrity chain.
 // Rejection must come from nonportable receipt admission, not a bad footer.
 const content=[...base.slice(0,-1),item],counts=Object.fromEntries(Object.keys(BACKUP_SECTIONS).map(k=>[k,0]));let hash='';
 for(const row of content){hash=await backupHash(hash,row);if(row.type==='item')counts[row.section]++;}
 return [...content,{type:'footer',itemCount:content.length-1,sectionCounts:counts,integrity:{algorithm:'SHA-256-chain',root:hash}}];
}

for(const variant of ['genuine','namespace_only','prefix_only','prefix_impersonation'])test('CTX4-03 '+variant+' projected local receipt refuses real Backup staging and replacement without effects',async()=>{
 const f=await fixture({empty:true}),baseline=await exported(new ExistingFileFixture(f.s)),c=await enable(f),receipt=(await receipts(f.s))[0];
 if(variant==='namespace_only')receipt.id=op();
 if(variant==='prefix_only')receipt.namespace='unknown';
 if(variant==='prefix_impersonation'){receipt.namespace='thought-library';receipt.operationSequence=1;receipt.result={id:receipt.ownerId,revision:1};}
 const projected=projectBackupEntity('receipts',receipt),item={type:'item',section:'receipts',value:projected};assert.equal(Object.hasOwn(projected,'epoch'),false);
 assert.throws(()=>validateBackupItem(item),{code:'BACKUP_INVALID'});
 await assert.rejects(f.s.repository.transaction(false,t=>new ExistingFileFixture(f.s).project(t,'receipts',receipt)),{code:'BACKUP_INVALID'});
 const file=await historicalReceiptFile(baseline,item),before=await snapshot(f.s),backup=new BackupService(f.s),{sessionId}=await backup.beginRestore();
 await assert.rejects(async()=>{for(let n=0;n<file.length;n+=30)await backup.stageRestore({sessionId,items:file.slice(n,n+30)});},{code:'BACKUP_INVALID'});
 await assert.rejects(backup.previewRestore({sessionId,mode:'replace'}),{code:'BACKUP_SESSION_EXPIRED'});
 await assert.rejects(backup.restore({sessionId,confirmation:file.at(-1).integrity.root,mode:'replace',targetGeneration:(await raw(f.s,'meta','backup-data-generation')).value,confirmReplace:true}),{code:'BACKUP_SESSION_EXPIRED'});
 assert.deepEqual(await snapshot(f.s),before);assert.equal((await itemForOriginal()).enabled,true);assert.equal((await f.access.change(c)).revision,1);
 async function itemForOriginal(){return (await f.access.page()).items.find(x=>x.topicId===f.topic.id);}
});

test('CTX4-03 existing-file fixtures preserve Thought receipts while Context receipts remain local',async()=>{
 const f=await fixture({empty:true}),request={kind:'access',operationId:op(),epoch:'initial',key:'now',enabled:true,expectedRevision:0},result=await f.cards.change(request);
 assert.deepEqual(await f.cards.change(request),result,'genuine local Context receipt replay remains valid');
 const localReceipt=await raw(f.s,'operationReceipts','context:'+request.operationId);
 assert.throws(()=>validateBackupItem({type:'item',section:'receipts',value:projectBackupEntity('receipts',localReceipt)}),{code:'BACKUP_INVALID'});
 const baseline=await exported(new ExistingFileFixture(f.s)),prior=baseline.filter(x=>x.section==='receipts');assert.ok(prior.every(x=>x.value.namespace!=='context-cards'&&!x.value.id.startsWith('context:')));assert.ok(prior.some(x=>x.value.namespace==='thought-library'));
 for(const row of prior)assert.strictEqual(validateBackupItem(row),row);
 const backup=new BackupService(f.s),stage=await prepared(backup,baseline),preview=await backup.previewRestore({sessionId:stage.sessionId,mode:'replace'});assert.equal(preview.canRestore,true);
 await backup.restore({sessionId:stage.sessionId,confirmation:preview.integrity,mode:'replace',targetGeneration:preview.targetGeneration,confirmReplace:true});
 for(const row of prior)assert.deepEqual(await raw(f.s,'operationReceipts',row.value.id),row.value);
 await assert.rejects(f.cards.change(request),{code:'CONTEXT_INVALIDATED'},'replacement restore still invalidates the original local request epoch');
});


test('CTX4-03 direct directory read refuses an actual in-flight global change and a fresh whole read sees the new authority',async()=>{
 const f=await fixture({pause:true});await f.cards.change({kind:'access',key:'inputs',enabled:true,expectedRevision:0,epoch:'initial',operationId:op()});await enable(f);
 const protectedBefore=await protectedRows(f.s),choiceBefore=await prefs(f.s),transaction=f.s.repository.transaction.bind(f.s.repository);let injected=false,capturedAuthority,currentAuthority;
 f.s.repository.transaction=async(write,fn,stores)=>{const value=await transaction(write,fn,stores);if(!write&&!injected&&value?.offset===0&&Array.isArray(value.items)&&value.items.some(row=>row.topicId===f.topic.id)&&typeof value.authority==='string'){
  injected=true;capturedAuthority=value.authority;f.s.repository.transaction=transaction;
  const before=await f.cards.snapshot();assert.equal(before.access.global.enabled,false);assert.equal((await f.cards.change({kind:'access',key:'global',enabled:true,expectedRevision:before.access.global.revision,epoch:before.epoch,operationId:op()})).ok,true);
  currentAuthority=(await transaction(false,t=>f.access.admission(t,undefined,{scope:true}))).authority;
 }return value;};
 const refused=await f.access.page();f.s.repository.transaction=transaction;assert.equal(injected,true);assert.notEqual(capturedAuthority,currentAuthority);assert.equal(refused.available,false);assert.equal(refused.reason,'stale_authority');assert.equal(refused.complete,false);assert.deepEqual(refused.items,[]);
 const fresh=await f.access.page({cursor:null});assert.equal(fresh.available,true);assert.equal(fresh.authority,currentAuthority);assert.equal(fresh.complete,true);assert.equal(fresh.items.find(row=>row.topicId===f.topic.id).policyAllowed,true);assert.equal(fresh.selectedCount,1);assert.equal(fresh.externalAllowed,false);assert.deepEqual(await prefs(f.s),choiceBefore);assert.deepEqual(await protectedRows(f.s),protectedBefore);
});

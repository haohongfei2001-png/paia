import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory} from './vendor/fake-indexeddb/build/esm/index.js';
import {setup,local} from './harness/thought-m1.mjs';
import {BackupService as FixtureBackup} from './harness/historical-backup.mjs';
import {exported,prepared} from './harness/backup-v081.mjs';
import {BackupService} from '../core/backup-service.js';
import {backupHash} from '../core/backup-format.js';
import {OrganizerStore} from '../core/organizer/store.js';
import {topicNameToken,topicNameFence} from '../core/topic-identity.js';
import {admitPreGatePurgeFixture} from './harness/pre-gate-purge-fixture.mjs';
import {OrganizerRunner} from '../core/organizer/runner.js';
import {DeterministicFixtureProvider} from './fixtures/organizer/provider.mjs';
const op=()=>crypto.randomUUID();
const rows=(s,name)=>s.repository.transaction(false,t=>t.all(name));
async function empty(){const s=new OrganizerStore(local(),{indexedDB:new IDBFactory()});await s.consent(true);await s.finishFoundation();return s;}
async function fixture(){const {s}=await setup(OrganizerStore),a=await s.createTopic({name:'Original synthetic name',operationId:op()}),b=await s.createTopic({name:'Independent synthetic name',operationId:op()}),e=await s.createEntry({actor:'user',operationId:op(),body:'Protected single body',type:'idea',formation:'explicit',evidence:[]});await s.placeEntry({entryId:e.id,topicId:a.id,expectedEntryRevision:0,expectedTopicRevision:0,operationId:op()});await s.fixMembershipSet({entryId:e.id,expectedRevision:1,operationId:op()});await s.keepTopicsSeparate({sourceId:a.id,targetId:b.id});await s.renameTopic({id:a.id,expectedRevision:0,name:'Renamed synthetic name',operationId:op()});await s.removeTopic({id:a.id,expectedRevision:1,operationId:op()});return {s,a,b,e,items:await exported(new FixtureBackup(s,{appVersion:'0.12.1'}))};}
async function rechain(items){let hash='';const copy=items.filter(x=>x.type!=='footer');for(const row of copy)hash=await backupHash(hash,row);const counts=Object.fromEntries(copy[0].contentSections.map(k=>[k,0]));for(const row of copy.slice(1))counts[row.section]++;return [...copy,{type:'footer',itemCount:copy.length-1,sectionCounts:counts,integrity:{algorithm:'SHA-256-chain',root:hash}}];}

test('TOPIC-01 existing-file restore retains identity, aliases, exclusions, fixed set and separation without enabling export',async()=>{
 const f=await fixture(),s=await empty(),service=new BackupService(s),stage=await prepared(service,f.items);assert.equal(stage.preview.canRestore,true);await service.restore({sessionId:stage.sessionId,confirmation:stage.preview.integrity});
 const original=await f.s.topic(f.a.id),restored=await s.topic(f.a.id);assert.deepEqual(restored.identity,original.identity);assert.deepEqual((await s.entry(f.e.id)).organizationIntents,(await f.s.entry(f.e.id)).organizationIntents);const token=await topicNameToken(s,'Original synthetic name');assert.equal((await s.repository.transaction(false,t=>topicNameFence(t,token))).blocked,true);assert.equal((await rows(s,'meta')).filter(x=>x.id.startsWith('topicKeepSeparate:')).length,1);await assert.rejects(service.beginExport(),e=>e.code==='FEATURE_UNAVAILABLE');assert.equal((await rows(s,'meta')).some(x=>x.id==='memory:config'&&x.externalAccess),false);
});
test('TOPIC-01 strict restore refuses partial, malformed, incomplete and relabeled identity graphs',async()=>{
 const f=await fixture();const mutations=[
  items=>items.find(x=>x.section==='topics').value.identity.version=9,
  items=>items.find(x=>x.section==='topics').value.identity.scope='unauthorized external access',
  items=>items.find(x=>x.section==='topics').value.identity.noRecreation=!items.find(x=>x.section==='topics').value.identity.noRecreation,
  items=>items.find(x=>x.section==='entries').value.organizationIntents.fixed.actor='ai',
  items=>items.splice(items.findIndex(x=>x.section==='organizationState'&&x.value.id.startsWith('personalTopicName:')),1),
  items=>items.splice(items.findIndex(x=>x.section==='organizationState'&&x.value.id==='thought-suppression-key'),1),
  items=>items.find(x=>x.section==='organizationState'&&x.value.id.startsWith('personalTopicName:')).value.data.topicIds.push('nonexistent-topic'),
  items=>{const pair=items.find(x=>x.section==='organizationState'&&x.value.id.startsWith('topicKeepSeparate:')).value.data;pair.targetId=pair.sourceId;},
 ];for(const mutate of mutations){const items=structuredClone(f.items);mutate(items);const s=await empty();await assert.rejects(prepared(new BackupService(s),await rechain(items)));assert.equal((await rows(s,'topics')).length,0);}
 const s=await empty();await assert.rejects(prepared(new BackupService(s),f.items.slice(0,-1)));assert.equal((await rows(s,'topics')).length,0);
});
test('TOPIC-01 legacy restore preserves unknown authority rather than manufacturing alias history',async()=>{
 const f=await fixture(),items=structuredClone(f.items).filter(x=>!(x.section==='organizationState'&&x.value.id.startsWith('personalTopicName:')));for(const x of items){if(x.section==='topics'){delete x.value.identity;delete x.value.createdBy;}if(x.section==='entries')x.value.organizationIntents={included:x.value.organizationIntents.included,excluded:x.value.organizationIntents.excluded};}
 const s=await empty(),service=new BackupService(s),stage=await prepared(service,await rechain(items));await service.restore({sessionId:stage.sessionId,confirmation:stage.preview.integrity});await s.mapTopicIdentityBatch();const row=await s.topic(f.a.id);assert.equal(row.identity.origin,'unknown');assert.deepEqual(row.identity.aliases,[]);assert.equal((await s.entry(f.e.id)).protections.topics.locked,true);assert.equal((await s.entry(f.e.id)).body,'Protected single body');
});
test('TOPIC-01 failed restore rolls back name fences and leaves local protected intent intact',async()=>{
 const f=await fixture(),s=await empty(),localTopic=await s.createTopic({name:'Local protected identity',operationId:op()}),before=await rows(s,'topics'),metaBefore=(await rows(s,'meta')).filter(x=>x.id.startsWith('personalTopicName:'));const service=new BackupService(s),stage=await prepared(service,f.items),preview=await service.previewRestore({sessionId:stage.sessionId,mode:'replace'}),transaction=s.repository.transaction.bind(s.repository);
 s.repository.transaction=(write,fn,stores)=>transaction(write,async t=>{if(write){const put=t.put.bind(t);t.put=(name,row)=>{if(name==='meta'&&row.id.startsWith('personalTopicName:'))throw {code:'STORAGE_FAILED'};return put(name,row);};}return fn(t);},stores);
 await assert.rejects(service.restore({sessionId:stage.sessionId,confirmation:preview.integrity,mode:'replace',targetGeneration:preview.targetGeneration,confirmReplace:true}));assert.deepEqual(await rows(s,'topics'),before);assert.deepEqual((await rows(s,'meta')).filter(x=>x.id.startsWith('personalTopicName:')),metaBefore);assert.equal((await s.topic(localTopic.id)).name,'Local protected identity');
});
test('TOPIC-01 foreign alias hashing key refuses merge instead of silently losing fences',async()=>{
 const f=await fixture(),s=await empty(),service=new BackupService(s),stage=await prepared(service,f.items),preview=await service.previewRestore({sessionId:stage.sessionId,mode:'merge'});assert.equal(preview.canRestore,false);assert.equal(preview.reason,'BACKUP_MERGE_CONFLICT');assert.equal((await rows(s,'topics')).length,0);
});
test('TOPIC-01 source erasure removes generated label/history but retains only body-free alias fences',async()=>{
 const {s}=await setup(OrganizerStore),input=(await s.snapshot()).library.blocks[0];await s.enqueueOrganizer({operationId:op(),specs:[{inputId:input.id,role:'primary',selectedFields:['body']}]});await new OrganizerRunner(s,{providers:[new DeterministicFixtureProvider()]}).step();const topic=(await rows(s,'topics'))[0];await s.renameTopic({id:topic.id,expectedRevision:topic.revision,name:'Independent human name',operationId:op()});const token=await topicNameToken(s,'Synthetic ideas');await admitPreGatePurgeFixture(s,input.sourceRecordId);await s.drainPurgeCleanup();const current=await s.topic(topic.id);assert.equal(current.name,'Independent human name');assert.ok(!JSON.stringify(current.identity).includes('Synthetic ideas'));assert.equal((await s.revisions({kind:'topic',entityId:topic.id})).items.some(x=>JSON.stringify(x).includes('Synthetic ideas')),false);assert.deepEqual((await s.repository.transaction(false,t=>topicNameFence(t,token))).ids,[topic.id]);assert.equal((await rows(s,'records')).length,0);
});

test('TOPIC-01 metadata mapping after source-label erasure preserves the original body-free fence',async()=>{
 const {s}=await setup(OrganizerStore),input=(await s.snapshot()).library.blocks[0];await s.enqueueOrganizer({operationId:op(),specs:[{inputId:input.id,role:'primary',selectedFields:['body']}]});await new OrganizerRunner(s,{providers:[new DeterministicFixtureProvider()]}).step();const topic=(await rows(s,'topics'))[0],token=await topicNameToken(s,'Synthetic ideas');await s.permanentDelete(input.sourceRecordId);await s.drainPurgeCleanup();await s.mapTopicIdentityBatch();const current=await s.topic(topic.id);assert.equal(current.name,'未命名主题');assert.equal(current.identity.nameToken,token);assert.ok(!JSON.stringify(current).includes('Synthetic ideas'));const items=await exported(new FixtureBackup(s,{appVersion:'0.12.1'})),target=await empty(),service=new BackupService(target),stage=await prepared(service,items);assert.equal(stage.preview.canRestore,true);await service.restore({sessionId:stage.sessionId,confirmation:stage.preview.integrity});assert.equal((await target.topic(topic.id)).identity.nameToken,token);
});

test('TOPIC-01 a real replace between name preflight and creation refuses the stale token',async()=>{
 const source=await fixture(),s=await empty(),service=new BackupService(s),stage=await prepared(service,source.items),original=s.operation.bind(s);let interleaved=false;
 s.operation=async(request,fn)=>{if(!interleaved){interleaved=true;const p=await service.previewRestore({sessionId:stage.sessionId,mode:'replace'});await service.restore({sessionId:stage.sessionId,confirmation:p.integrity,mode:'replace',targetGeneration:p.targetGeneration,confirmReplace:true});}return original(request,fn);};
 await assert.rejects(s.createTopic({name:'Alpha　Object',operationId:op()}));assert.equal((await rows(s,'topics')).some(x=>x.name==='Alpha　Object'),false);assert.equal((await rows(s,'topics')).length,2);
});
for(const action of ['rename','remove','mapping'])test('TOPIC-01 real same-snapshot restore fences preflight '+action,async()=>{
 const f=await fixture(),s=f.s,service=new BackupService(s),stage=await prepared(service,f.items);let interleaved=false;const key=action==='mapping'?'foundationWrite':'operation',original=s[key].bind(s);s[key]=async(...args)=>{if(!interleaved){interleaved=true;const p=await service.previewRestore({sessionId:stage.sessionId,mode:'replace'});await service.restore({sessionId:stage.sessionId,confirmation:p.integrity,mode:'replace',targetGeneration:p.targetGeneration,confirmReplace:true});}return original(...args);};
 await assert.rejects(action==='rename'?s.renameTopic({id:f.b.id,expectedRevision:0,name:'Stale renamed label',operationId:op()}):action==='remove'?s.removeTopic({id:f.b.id,expectedRevision:0,operationId:op()}):s.mapTopicIdentityBatch());const current=await s.topic(f.b.id);assert.equal(current.name,'Independent synthetic name');assert.equal(current.lifecycle,'active');assert.equal(current.revision,0);
});
test('TOPIC-01 prepared automatic name proof expires after an actual restore',async()=>{
 const f=await fixture(),s=f.s,token=await topicNameToken(s,'New object'),service=new BackupService(s),stage=await prepared(service,f.items),p=await service.previewRestore({sessionId:stage.sessionId,mode:'replace'});await service.restore({sessionId:stage.sessionId,confirmation:p.integrity,mode:'replace',targetGeneration:p.targetGeneration,confirmReplace:true});await assert.rejects(s.foundationWrite(async t=>s.libraryCommit.organize(t,await s.readableEntry(t,f.e.id),{newTopic:'New object'},{topicMap:{},sectionMap:{}},'ai',op(),token,null)));assert.equal((await rows(s,'topics')).length,2);
});

test('TOPIC-01 human rename after source-label erasure retains original opaque fence through restore',async()=>{
 const {s}=await setup(OrganizerStore),input=(await s.snapshot()).library.blocks[0];await s.enqueueOrganizer({operationId:op(),specs:[{inputId:input.id,role:'primary',selectedFields:['body']}]});await new OrganizerRunner(s,{providers:[new DeterministicFixtureProvider()]}).step();const before=(await rows(s,'topics'))[0],token=await topicNameToken(s,'Synthetic ideas');await s.permanentDelete(input.sourceRecordId);await s.drainPurgeCleanup();const purged=await s.topic(before.id);assert.equal(purged.name,'未命名主题');await s.editTopic({id:before.id,expectedRevision:purged.revision,changes:{name:'Independent human label after erasure'},operationId:op()});const renamed=await s.topic(before.id);assert.ok(renamed.identity.aliases.some(x=>x.token===token));assert.ok(!JSON.stringify(renamed).includes('Synthetic ideas'));const items=await exported(new FixtureBackup(s,{appVersion:'0.12.1'})),target=await empty(),service=new BackupService(target),stage=await prepared(service,items);await service.restore({sessionId:stage.sessionId,confirmation:stage.preview.integrity});assert.equal((await target.topic(before.id)).name,'Independent human label after erasure');assert.deepEqual((await target.repository.transaction(false,t=>topicNameFence(t,token))).ids,[before.id]);assert.equal((await rows(target,'records')).length,0);
});

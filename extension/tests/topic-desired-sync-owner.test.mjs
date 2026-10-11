import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {capture,inputEdit} from './harness/thought-m1.mjs';
import {LibraryDocumentsStore} from '../core/library-documents-store.js';
import {OrganizerStore} from '../core/organizer/store.js';
import {STORAGE_KEY,ArchiveError} from '../core/constants.js';
import {ContextTopicAccessService} from '../core/context-topic-access.js';
import {CONTEXT_TOPIC_ACCESS_ROW,emptyContextTopicPreferences} from '../core/context-topic-preferences.js';
import {ContextCardsService,readContextCards} from '../core/context-cards.js';
import {PromptReuseService} from '../core/prompt-reuse-service.js';
import {readPromptPreferences} from '../core/prompt-reuse-preferences.js';
import {changeTopicContainer} from '../core/topic-governance.js';
import {BackupService} from '../core/backup-service.js';
import {BackupService as ExistingFileFixture} from './harness/context-legacy-file.mjs';
import {exported,prepared} from './harness/backup-v081.mjs';
import {BrowserNativeSyncCore,validateOperation} from '../core/browser-native-sync/core.js';
import {HumanLibrarySyncJournal} from '../core/browser-native-sync/human-library-journal.js';
import {SourceBootstrapJournal} from '../core/browser-native-sync/source-bootstrap-journal.js';
import {FilterIntentSyncJournal} from '../core/browser-native-sync/filter-intent-journal.js';
import {InputWorkingSyncJournal} from '../core/browser-native-sync/input-working-journal.js';
import {ConsumerPreferenceSyncJournal} from '../core/browser-native-sync/consumer-preference-journal.js';
import {PromptSyncJournal} from '../core/browser-native-sync/prompt-journal.js';
import {ContextManualSyncJournal} from '../core/browser-native-sync/context-journal.js';
import {TopicDesiredSyncJournal} from '../core/browser-native-sync/topic-desired-journal.js';
import {TOPIC_DESIRED_PREFIX,assertTopicDesiredReference} from '../core/browser-native-sync/topic-desired-codec.js';
import {buildCheckpoint} from '../core/browser-native-sync/checkpoints.js';
import {GroupedCheckpointRestore} from '../core/browser-native-sync/group-checkpoint.js';

globalThis.IDBKeyRange=IDBKeyRange;
const op=()=>crypto.randomUUID(),datasetId='SYNTHETIC_topic_desired_actual_owner';
const meta=(f,id)=>f.s.repository.transaction(false,t=>t.get('meta',id));
const choices=async f=>(await meta(f,CONTEXT_TOPIC_ACCESS_ROW))??emptyContextTopicPreferences();
const whole=f=>f.s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all(f.s.repository.stores.map(async name=>[name,await t.all(name)]))));
const receipts=f=>f.s.repository.transaction(false,async t=>(await t.all('operationReceipts')).filter(row=>row.namespace==='context-topic-access'));
const outbox=async f=>{const result=[];for await(const row of f.core.rows('outbox'))result.push(row);return result;};
async function protocolPage(t,prefix){const rows=[];let after=null;do{const page=await t.primaryRangePage('meta',{prefix,after,limit:100});rows.push(...page.rows);assert.ok(rows.length<=128);after=page.next;}while(after);return {rows,next:null};}
const protocol=f=>f.core.transaction(false,async t=>({generation:await f.core.get(t,'generation'),device:await f.core.get(t,'device',f.core.deviceId),outbox:await protocolPage(t,await f.core.idIn(t,'outbox')),heads:await protocolPage(t,await f.core.idIn(t,'head'))}));
const protectedData=f=>f.s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all(['records','blocks','documents','inputStates','thoughts','topics','sections','placements','revisions'].map(async name=>[name,await t.all(name)]))));
const grants=f=>f.s.repository.transaction(false,async t=>({settings:structuredClone((await f.s.control(t)).settings),gate:await t.get('meta','gate'),cards:(await readContextCards(t)).access}));
function cloud(){const objects=new Map();return {async putImmutable(ref,bytes){objects.set(ref.id,bytes.slice());},async get(ref){return objects.get(ref.id)?.slice();}};}
async function fixture(device='SYNTHETIC_topic_A',{Store=LibraryDocumentsStore}={}){
 const data={};let sets=0,tick=0;const local={async get(key){return {[key]:structuredClone(data[key])};},async set(value){sets++;Object.assign(data,structuredClone(value));}};
 const s=new Store(local,{indexedDB:new IDBFactory(),name:'SYNTHETIC-topic-desired-'+op(),clock:()=>new Date(Date.UTC(2026,9,11)+tick++).toISOString(),localPublicationTerminal:true});await s.consent(true);await s.finishFoundation();const core=new BrowserNativeSyncCore(s.repository,{datasetId,deviceId:device});
 s.humanLibraryJournal=new HumanLibrarySyncJournal(core);s.sourceBootstrapJournal=new SourceBootstrapJournal(core);s.filterIntentJournal=new FilterIntentSyncJournal(core);s.inputWorkingJournal=new InputWorkingSyncJournal(core,{filterJournal:s.filterIntentJournal,logicalCommits:true});s.consumerPreferenceJournal=new ConsumerPreferenceSyncJournal(core);
 const journal=new TopicDesiredSyncJournal(core),service=new ContextTopicAccessService(s,{syncDesiredJournal:journal}),plain=new ContextTopicAccessService(s),prompt=new PromptReuseService(s,{syncJournal:new PromptSyncJournal(core,{correctionBindings:true})}),cards=new ContextCardsService(s,{syncJournal:new ContextManualSyncJournal(core)});return {s,core,journal,service,plain,prompt,cards,data,local,sets:()=>sets};
}
async function corpus(f){
 const topics=[];for(const name of ['SYNTHETIC desired Topic one','SYNTHETIC desired Topic two'])topics.push(await f.s.createTopic({name,operationId:op()}));const entry=await f.s.createEntry({actor:'user',body:'SYNTHETIC genuinely authored independent Topic body 中文🙂',type:'idea',formation:'explicit',evidence:[],operationId:op()});
 for(const topic of topics)await f.s.placeEntry({entryId:entry.id,topicId:topic.id,expectedEntryRevision:(await f.s.entry(entry.id)).revision,expectedTopicRevision:(await f.s.topic(topic.id)).organizationRevision,operationId:op()});return {topics,entry};
}
async function item(f,id,service=f.service){let cursor=null;do{const page=await service.page({cursor,limit:100});assert.equal(page.available,true,JSON.stringify(page));assert.equal(page.externalAllowed,false);const row=page.items.find(row=>row.topicId===id);if(row)return {...row,epoch:page.epoch};cursor=page.nextCursor;}while(cursor);assert.fail('Missing original Topic '+id);}
const request=(row,enabled)=>({topicId:row.topicId,enabled,expectedRevision:row.revision,expectedBinding:enabled?row.expectedBinding:row.binding,epoch:row.epoch,operationId:op()});
async function change(f,id,enabled,service=f.service){const c=request(await item(f,id,service),enabled),result=await service.change(c);assert.equal(result.ok,true,JSON.stringify(result));assert.equal(result.externalAllowed,false);return {c,result};}
async function desired(f,id){
 const row=await meta(f,TOPIC_DESIRED_PREFIX+id),head=await f.core.read('head','topicDesired',id);assert.ok(row);assert.equal(head.revisions.length,1);assert.equal(head.purged,false);const operation=(await f.core.read('revision',head.revisions[0])).operation;await validateOperation(operation);assert.deepEqual(row.value,operation.value);assert.deepEqual(Object.keys(operation.value).sort(),['id','enabled','topicRef'].sort());assert.deepEqual(Object.keys(operation.value.topicRef).sort(),['commitRevisionId','memberRevisionId'].sort());assert.equal(operation.codecVersion,1);
 const commit=(await f.core.read('revision',operation.value.topicRef.commitRevisionId)).operation,member=(await f.core.read('revision',operation.value.topicRef.memberRevisionId)).operation;await validateOperation(commit);await validateOperation(member);assert.equal(assertTopicDesiredReference(operation.value,commit,member).id,id);const proof=await f.core.transaction(false,t=>f.core.materializedOwner(t,'topicDesired',id));assert.equal(proof.ownerRevision,row.revision);assert.equal(proof.operation.revisionId,operation.revisionId);return {row,head,operation,commit,member};
}
async function producer(){
 const f=await fixture();const epoch=(await f.s.status()).epoch;for(let i=0;i<2;i++)await f.s.capture(capture(epoch,'SYNTHETIC_topic_source_'+i,'解释算法并保留限制与反例。'));const inputs=(await f.s.snapshot()).library.blocks;assert.equal(inputs.length,2);await inputEdit(f.s,inputs[0].id,{note:'SYNTHETIC original Working note'});const human=await corpus(f);
 await f.s.updatePreferences({appearance:'dark',language:'en',fontSize:'large',readingWidth:'wide',timeDisplay:'date_only',timeEmphasis:'standard'});await f.s.setFilterMode('off');const family=(await f.prompt.snapshot()).families.find(x=>x.members.length===2);assert.ok(family);await f.prompt.change({action:'edit',id:family.id,revision:(await f.s.repository.transaction(false,readPromptPreferences)).revision,text:'SYNTHETIC original full Prompt correction'});await f.prompt.change({action:'pin',id:family.id,revision:(await f.s.repository.transaction(false,readPromptPreferences)).revision});const infoId=op();assert.equal((await f.cards.change({kind:'put',card:'info',itemId:infoId,operationId:op(),epoch:'initial',expectedRevision:0,body:'SYNTHETIC original manual Context body',section:'SYNTHETIC durable context'})).ok,true);
 await change(f,human.topics[0].id,true);await change(f,human.topics[1].id,true);await change(f,human.topics[1].id,false);return {...f,...human,inputs,family,infoId};
}
async function activate(f,cut,transport,{checkpoint}={}){const restore=new GroupedCheckpointRestore(f.core,{store:f.s,restoreId:op(),checkpoint});await restore.stageCheckpoint(cut.ref,ref=>transport.get(ref));assert.equal((await restore.activate()).state,'activated');let cleanup;do{cleanup=await restore.cleanup({limit:3});}while(!cleanup.complete);return restore;}

test('original Topic choice and receipt atomically create true/false logical desired operations with no portable grants',async()=>{
 const f=await fixture();try{const {topics}=await corpus(f),id=topics[0].id,data=await protectedData(f),grant=await grants(f),before=await protocol(f),first=await change(f,id,true),a=await desired(f,id);assert.equal(a.operation.actor,'user');assert.equal(a.operation.operationId,first.c.operationId);assert.equal(a.operation.value.enabled,true);assert.deepEqual(a.operation.parents,[]);assert.equal((await outbox(f)).length,before.outbox.rows.length+1);assert.equal((await protocol(f)).device.sequence,before.device.sequence+1);const receipt=(await receipts(f)).find(row=>row.id==='context-topic:'+first.c.operationId);assert.deepEqual(receipt.result,first.result);assert.equal((await choices(f)).choices[0].enabled,true);assert.equal((await item(f,id)).policyAllowed,false);
 const second=await change(f,id,false),b=await desired(f,id);assert.equal(b.operation.value.enabled,false);assert.deepEqual(b.operation.parents,[a.operation.revisionId]);assert.equal(b.operation.operationId,second.c.operationId);assert.deepEqual(b.operation.value.topicRef,a.operation.value.topicRef);assert.equal((await choices(f)).choices[0].enabled,false);assert.deepEqual(await protectedData(f),data);assert.deepEqual(await grants(f),grant);
 }finally{await f.s.repository.close();}
});

test('an actual repeated Topic request returns its historical receipt without any second Core or local write',async()=>{
 const f=await fixture();try{const {topics}=await corpus(f),first=await change(f,topics[0].id,true),before=await whole(f),sdk=structuredClone(f.data[STORAGE_KEY]),sets=f.sets();assert.deepEqual(await f.service.change(first.c),first.result);assert.deepEqual(await whole(f),before);assert.deepEqual(f.data[STORAGE_KEY],sdk);assert.equal(f.sets(),sets);
 }finally{await f.s.repository.close();}
});

test('off with no actual choice is the original no-op receipt and creates zero portable desired history',async()=>{
 const f=await fixture();try{const {topics}=await corpus(f),id=topics[0].id,before=await protocol(f),sets=f.sets(),r=await change(f,id,false);assert.equal(r.result.noOp,true);assert.equal(r.result.revision,0);assert.deepEqual(await choices(f),emptyContextTopicPreferences());assert.equal(await meta(f,TOPIC_DESIRED_PREFIX+id),undefined);assert.equal(await f.core.read('head','topicDesired',id),undefined);assert.deepEqual(await protocol(f),before);assert.equal(f.sets(),sets);assert.equal((await receipts(f)).length,1);
 }finally{await f.s.repository.close();}
});

test('prejournal actual true and disabled choices enroll baseline without rewriting any local choice, receipt or SDK control',async()=>{
 const f=await fixture();try{const {topics}=await corpus(f);await change(f,topics[0].id,true,f.plain);await change(f,topics[1].id,true,f.plain);await change(f,topics[1].id,false,f.plain);const before=await choices(f),localReceipts=await receipts(f),data=await protectedData(f),sdk=structuredClone(f.data[STORAGE_KEY]),sets=f.sets(),out=(await outbox(f)).length;assert.deepEqual(await f.journal.bootstrap(f.service),{count:2});for(const topic of topics){const x=await desired(f,topic.id);assert.equal(x.operation.actor,'bootstrap');assert.deepEqual(x.operation.parents,[]);assert.equal(x.operation.value.enabled,before.choices.find(row=>row.topicId===topic.id).enabled);}assert.equal((await outbox(f)).length,out+2);assert.deepEqual(await choices(f),before);assert.deepEqual(await receipts(f),localReceipts);assert.deepEqual(await protectedData(f),data);assert.deepEqual(f.data[STORAGE_KEY],sdk);assert.equal(f.sets(),sets);const stable=await whole(f);assert.deepEqual(await f.journal.bootstrap(f.service),{count:0});assert.deepEqual(await whole(f),stable);
 }finally{await f.s.repository.close();}
});

test('an error after actual Topic desired commit rolls back the original choice, receipt, Core and outbox across all 37 stores',async()=>{
 const f=await fixture();try{const {topics}=await corpus(f),id=topics[0].id;await item(f,id);const before=await whole(f),sdk=structuredClone(f.data[STORAGE_KEY]),sets=f.sets(),commit=f.journal.commit.bind(f.journal);let reached=false;f.journal.commit=async(...args)=>{await commit(...args);reached=true;throw new Error('SYNTHETIC after actual Topic desired paired writes');};await assert.rejects(change(f,id,true),{code:'STORAGE_FAILED'});assert.equal(reached,true);assert.equal(Object.keys(before).length,37);assert.deepEqual(await whole(f),before);assert.deepEqual(f.data[STORAGE_KEY],sdk);assert.equal(f.sets(),sets);
 }finally{await f.s.repository.close();}
});

test('closed A full original Mixed configuration restores desired-only B, genuine local confirmation and edit reexport to fresh C without grant echo',async()=>{
 const a=await producer();let b,c;try{const transport=cloud(),expected=[await desired(a,a.topics[0].id),await desired(a,a.topics[1].id)],source=(await whole(a)).records,cut=await buildCheckpoint(a.core,transport,{grouped:{store:a.s}});await a.s.repository.close();assert.equal(a.s.repository.db,null);b=await fixture('SYNTHETIC_topic_B');const grant=await grants(b);await activate(b,cut,transport);assert.deepEqual(await grants(b),grant);assert.deepEqual(await choices(b),emptyContextTopicPreferences());assert.deepEqual(await receipts(b),[]);assert.deepEqual(await outbox(b),[]);
 for(const [i,topic]of a.topics.entries()){const x=await desired(b,topic.id),view=await item(b,topic.id);assert.deepEqual(x.operation.value,expected[i].operation.value);assert.equal(view.enabled,false);assert.equal(view.policyAllowed,false);assert.equal(view.desired.enabled,i===0);assert.equal(view.desired.resolved,true);assert.equal(view.desired.requiresLocalConfirmation,i===0);assert.equal(view.desired.externalAllowed,false);}assert.equal(b.data[STORAGE_KEY].preferences.appearance,'dark');assert.equal((await b.prompt.query()).items.find(row=>row.id===a.family.id).text,'SYNTHETIC original full Prompt correction');assert.equal((await b.cards.snapshot()).items.find(row=>row.id===a.infoId).body,'SYNTHETIC original manual Context body');assert.deepEqual((await whole(b)).records,source);
 await change(b,a.topics[0].id,true);assert.equal((await item(b,a.topics[0].id)).enabled,true);assert.equal((await item(b,a.topics[0].id)).policyAllowed,false);await change(b,a.topics[0].id,false);await change(b,a.topics[1].id,true);for(const input of a.inputs)await inputEdit(b.s,input.id,{libraryText:'SYNTHETIC genuinely continued B Working'});await b.prompt.change({action:'edit',id:a.family.id,revision:(await b.s.repository.transaction(false,readPromptPreferences)).revision,text:'SYNTHETIC genuinely continued B Prompt correction'});await b.s.updatePreferences({appearance:'light'});const later=[await desired(b,a.topics[0].id),await desired(b,a.topics[1].id)],cutB=await buildCheckpoint(b.core,transport,{grouped:{store:b.s}});await b.s.repository.close();assert.equal(b.s.repository.db,null);
 c=await fixture('SYNTHETIC_topic_C');const freshGrant=await grants(c),restore=await activate(c,cutB,transport);assert.deepEqual(await grants(c),freshGrant);assert.deepEqual(await choices(c),emptyContextTopicPreferences());assert.deepEqual(await receipts(c),[]);assert.deepEqual(await outbox(c),[]);for(const [i,topic]of a.topics.entries()){assert.deepEqual((await desired(c,topic.id)).operation.value,later[i].operation.value);const view=await item(c,topic.id);assert.equal(view.enabled,false);assert.equal(view.policyAllowed,false);assert.equal(view.desired.enabled,i===1);assert.equal(view.desired.requiresLocalConfirmation,i===1);}for(const input of a.inputs)assert.equal((await c.s.input(input.id)).libraryText,'SYNTHETIC genuinely continued B Working');assert.equal((await c.prompt.query()).items.find(row=>row.id===a.family.id).text,'SYNTHETIC genuinely continued B Prompt correction');assert.equal(c.data[STORAGE_KEY].preferences.appearance,'light');assert.equal((await c.s.entry(a.entry.id)).body,'SYNTHETIC genuinely authored independent Topic body 中文🙂');assert.deepEqual((await whole(c)).records,source);const stable=await whole(c),sdk=structuredClone(c.data[STORAGE_KEY]),sets=c.sets();assert.equal((await restore.activate()).state,'activated');assert.deepEqual(await whole(c),stable);assert.deepEqual(c.data[STORAGE_KEY],sdk);assert.equal(c.sets(),sets);
 }finally{await a.s.repository.close();if(b)await b.s.repository.close();if(c)await c.s.repository.close();}
});

test('a real grouped fault after desired materialization rolls back the complete receiver and accepts the same original checkpoint on repair',async()=>{
 const a=await producer(),b=await fixture('SYNTHETIC_topic_abort_B');try{const transport=cloud(),cut=await buildCheckpoint(a.core,transport,{grouped:{store:a.s}}),target=(await desired(a,a.topics[0].id)).operation.revisionId;await a.s.repository.close();let abort=true,reached=false;const restore=new GroupedCheckpointRestore(b.core,{store:b.s,restoreId:op(),checkpoint:async(name,id)=>{if(name==='applied-group'&&id===target){reached=true;if(abort)throw new ArchiveError('SYNTHETIC_TOPIC_GROUP_ABORT');}}});await restore.stageCheckpoint(cut.ref,ref=>transport.get(ref));const before=await whole(b),sdk=structuredClone(b.data[STORAGE_KEY]),sets=b.sets();await assert.rejects(restore.activate(),{code:'SYNTHETIC_TOPIC_GROUP_ABORT'});assert.equal(reached,true);assert.deepEqual(await whole(b),before);assert.deepEqual(b.data[STORAGE_KEY],sdk);assert.equal(b.sets(),sets);assert.equal((await restore.stage.read('restore')).phase,'validated');abort=false;assert.equal((await restore.activate()).state,'activated');assert.deepEqual(await choices(b),emptyContextTopicPreferences());assert.deepEqual(await receipts(b),[]);assert.equal((await item(b,a.topics[0].id)).desired.requiresLocalConfirmation,true);
 }finally{await a.s.repository.close();await b.s.repository.close();}
});

test('real removal and a same-name new Topic retain the old logical ref unresolved without granting or redirecting the new identity',async()=>{
 const f=await fixture();try{const {topics}=await corpus(f),id=topics[0].id;await change(f,id,true);const original=await desired(f,id),grant=await grants(f);await changeTopicContainer(f.s,{id,expectedRevision:(await f.s.topic(id)).revision,operationId:op()});const other=await f.s.createTopic({name:'SYNTHETIC desired Topic one',operationId:op()}),before=await whole(f),old=await item(f,id),next=await item(f,other.id);assert.equal(old.desired.enabled,true);assert.equal(old.desired.resolved,false);assert.equal(old.policyAllowed,false);assert.equal(next.enabled,false);assert.equal(next.policyAllowed,false);assert.equal(next.desired,undefined);assert.deepEqual((await desired(f,id)).operation.value,original.operation.value);assert.equal(await f.core.read('head','topicDesired',other.id),undefined);assert.deepEqual(await whole(f),before);assert.deepEqual(await grants(f),grant);
 }finally{await f.s.repository.close();}
});


test('actual existing-file replacement makes an enabled local choice require confirmation and refuses its old epoch without any new grant',async()=>{
 const f=await fixture('SYNTHETIC_topic_existing_file',{Store:OrganizerStore});try{const {topics}=await corpus(f),id=topics[0].id,file=await exported(new ExistingFileFixture(f.s)),first=await change(f,id,true),stored=await choices(f),logical=(await desired(f,id)).operation.value,backup=new BackupService(f.s),stage=await prepared(backup,file),preview=await backup.previewRestore({sessionId:stage.sessionId,mode:'replace'});assert.equal(preview.canRestore,true,preview.reason);
 await backup.restore({sessionId:stage.sessionId,confirmation:preview.integrity,mode:'replace',targetGeneration:preview.targetGeneration,confirmReplace:true});const before=await whole(f),sdk=structuredClone(f.data[STORAGE_KEY]),sets=f.sets(),view=await item(f,id);assert.notEqual(view.epoch,first.c.epoch);assert.equal(view.enabled,true);assert.equal(view.bindingValid,false);assert.equal(view.policyAllowed,false);assert.equal(view.reason,'selection_stale');assert.equal(view.desired.enabled,true);assert.equal(view.desired.resolved,true);assert.equal(view.desired.requiresLocalConfirmation,true);assert.equal(view.externalAllowed,false);assert.deepEqual(await choices(f),stored);assert.deepEqual((await desired(f,id)).operation.value,logical);await assert.rejects(f.service.change(first.c),{code:'CONTEXT_INVALIDATED'});assert.deepEqual(await whole(f),before);assert.deepEqual(f.data[STORAGE_KEY],sdk);assert.equal(f.sets(),sets);
 }finally{await f.s.repository.close();}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,inputEdit} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {ContextCardsService,CONTEXT_CARDS_ROW} from '../core/context-cards.js';
import {ContextTopicAccessService} from '../core/context-topic-access.js';
import {CONTEXT_TOPIC_ACCESS_ROW} from '../core/context-topic-preferences.js';
import {MemoryService} from '../core/memory/service.js';
import {key} from '../core/memory/model.js';
import {STORAGE_KEY} from '../core/constants.js';

const op=()=>crypto.randomUUID();
async function populatedOwners({denySelected=false}={}){
 const {s,storage,indexedDB}=await setup(OrganizerStore);
 const input=(await s.repository.transaction(false,t=>t.all('blocks'),['blocks']))[0].value;
 await inputEdit(s,input.id,{libraryText:'Protected human Working Input edit.'});
 const topic=await s.createTopic({name:'Human chosen topic',operationId:op()}),entry=await s.createEntry({actor:'user',body:'Independent human Thought, unchanged.',type:'idea',formation:'explicit',evidence:[],operationId:op()});
 await s.placeEntry({entryId:entry.id,topicId:topic.id,expectedEntryRevision:entry.revision,expectedTopicRevision:(await s.topic(topic.id)).organizationRevision,operationId:op()});
 const restricted=await s.createTopic({name:'Independent restricted topic',operationId:op()}),restrictedEntry=await s.createEntry({actor:'user',body:'Protected excluded Thought.',type:'idea',formation:'explicit',evidence:[],operationId:op()});
 await s.placeEntry({entryId:restrictedEntry.id,topicId:restricted.id,expectedEntryRevision:restrictedEntry.revision,expectedTopicRevision:(await s.topic(restricted.id)).organizationRevision,operationId:op()});
 const access=new ContextTopicAccessService(s),cards=new ContextCardsService(s,{topicSummary:(t,epoch)=>access.summaryInTransaction(t,epoch)}),memory=new MemoryService(s);
 for(const card of ['info','rules','now'])assert.equal((await cards.change({kind:'put',card,itemId:op(),operationId:op(),epoch:'initial',expectedRevision:0,body:`SYNTHETIC protected ${card} Item.`,section:'Personal'})).ok,true);
 for(const name of ['global','info','rules','now','inputs'])assert.equal((await cards.change({kind:'access',key:name,enabled:true,expectedRevision:0,operationId:op(),epoch:'initial'})).ok,true);
 await s.setFilterMode('off');
 const page=await access.page(),choice=page.items.find(item=>item.topicId===topic.id);assert.equal(page.available,true);assert.ok(choice?.canEnable);
 assert.equal((await access.change({topicId:topic.id,enabled:true,expectedRevision:choice.revision,expectedBinding:choice.expectedBinding,epoch:page.epoch,operationId:op()})).ok,true);
 await memory.ready();
 if(denySelected){
  await memory.settings({localOnly:true,externalAccess:false});
  await memory.authorize({topicIds:[restricted.id],decision:'never'});
  await memory.exclude({inputId:input.id,excluded:true});
  await memory.exclude({entryId:restrictedEntry.id,excluded:true});
  await memory.exclude({topicId:restricted.id,sectionId:(await s.topic(restricted.id)).defaultSectionId,excluded:true});
  await memory.authorize({topicIds:[topic.id],decision:'denied'});
 }
 const authorization=await s.repository.transaction(false,t=>t.all('meta'));
 for(const id of [CONTEXT_CARDS_ROW,CONTEXT_TOPIC_ACCESS_ROW,'memory:config',...(denySelected?[key('topic','default',restricted.id),key('topic','default',topic.id),key('input',input.id),key('entry',restrictedEntry.id),key('section',restricted.id,(await s.topic(restricted.id)).defaultSectionId)]:[])])assert.ok(authorization.some(row=>row.id===id),`nonempty actual owner row ${id}`);
 const state=await cards.snapshot();assert.equal(state.items.length,3);assert.equal(state.topicChoices.selectedCount,1);assert.equal(state.access.global.enabled,true);assert.equal(state.capabilities.external,false);
 const current=await access.page(),selected=current.items.find(item=>item.topicId===topic.id);assert.equal(selected.enabled,true);assert.equal(selected.policyAllowed,!denySelected,JSON.stringify(selected));assert.equal(current.externalAllowed,false);assert.equal(current.items.find(item=>item.topicId===restricted.id).enabled,false);
 return {s,storage,indexedDB,cards,access,memory,topic};
}
async function protectedSnapshot(s,storage){
 const result=await s.run(()=>s.repository.transaction(false,async t=>({rows:Object.fromEntries(await Promise.all(s.repository.stores.map(async name=>[name,await t.all(name)]))),control:await s.control(t)})));
 result.local=(await storage.get(STORAGE_KEY))[STORAGE_KEY];
 delete result.control.preferences.aiOrganizeStyle;delete result.local.preferences.aiOrganizeStyle;
 return result;
}
async function ownersSnapshot(s){
 const access=new ContextTopicAccessService(s),cards=new ContextCardsService(s,{topicSummary:(t,epoch)=>access.summaryInTransaction(t,epoch)}),memory=new MemoryService(s);
 return {cards:await cards.snapshot(),topics:await access.page(),memory:await s.repository.transaction(false,t=>memory.state(t))};
}
const writeStyle=async(s,value)=>{const current=await s.aiStylePreference();return s.updatePreferences({aiOrganizeStyle:{version:1,value,expectedRevision:current.revision,expectedEpoch:current.epoch}});};

test('all style choices preserve actual Source, edited Input, human Thought, placement and authorization rows',async()=>{
 const {s,storage,indexedDB}=await populatedOwners(),before=await protectedSnapshot(s,storage),owners=await ownersSnapshot(s);
 assert.equal(Object.keys(before.rows).length,s.repository.stores.length);
 for(const name of ['records','blocks','thoughts','topics','sections','placements','operationReceipts'])assert.ok(before.rows[name].length,`populated ${name}`);
 for(const value of ['balanced','original','concise','balanced']){assert.equal((await writeStyle(s,value)).ok,true);assert.deepEqual(await protectedSnapshot(s,storage),before,value);assert.deepEqual(await ownersSnapshot(s),owners,value);}
 const saved=await s.aiStylePreference();await s.repository.close();const reopened=new OrganizerStore(storage,{indexedDB});await reopened.finishFoundation();
 assert.deepEqual(await reopened.aiStylePreference(),saved);assert.deepEqual(await protectedSnapshot(reopened,storage),before);assert.deepEqual(await ownersSnapshot(reopened),owners);
});

test('style changes cannot revive a retained selected Topic veto or broaden real Card and Memory policy',async()=>{
 const {s,storage}=await populatedOwners({denySelected:true}),before=await protectedSnapshot(s,storage),owners=await ownersSnapshot(s);
 assert.ok(owners.memory.rows.some(row=>row.kind==='topic'&&row.decision==='denied'));
 assert.ok(owners.memory.rows.some(row=>row.kind==='topic'&&row.decision==='never'));
 for(const value of ['original','concise','balanced']){await writeStyle(s,value);assert.deepEqual(await protectedSnapshot(s,storage),before);assert.deepEqual(await ownersSnapshot(s),owners);}
});

test('cross-store style CAS and failed acknowledgements preserve every populated owner and local setting',async()=>{
 const {s,storage,indexedDB}=await populatedOwners({denySelected:true}),before=await protectedSnapshot(s,storage),owners=await ownersSnapshot(s),other=new OrganizerStore(storage,{indexedDB});await other.finishFoundation();
 const stale=await other.aiStylePreference();await writeStyle(s,'original');
 assert.deepEqual(await other.updatePreferences({aiOrganizeStyle:{version:1,value:'concise',expectedRevision:stale.revision,expectedEpoch:stale.epoch}}),{conflict:true});assert.equal((await other.aiStylePreference()).value,'original');
 const set=storage.set.bind(storage);let failure='before';storage.set=async row=>{if(failure==='before')throw Error('synthetic pre-write failure');await set(row);if(failure==='after')throw Error('synthetic lost acknowledgement');};
 await assert.rejects(writeStyle(other,'concise'));assert.equal((await s.aiStylePreference()).value,'original');assert.deepEqual(await protectedSnapshot(s,storage),before);assert.deepEqual(await ownersSnapshot(s),owners);
 failure='after';await assert.rejects(writeStyle(other,'concise'));failure=null;
 assert.equal((await s.aiStylePreference()).value,'concise');assert.deepEqual(await protectedSnapshot(s,storage),before);assert.deepEqual(await ownersSnapshot(s),owners);
 await writeStyle(s,'balanced');assert.equal((await other.aiStylePreference()).value,'balanced');assert.deepEqual(await protectedSnapshot(other,storage),before);assert.deepEqual(await ownersSnapshot(other),owners);
});

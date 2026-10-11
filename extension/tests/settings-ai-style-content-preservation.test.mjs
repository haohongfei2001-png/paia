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
import {CONTROL_PUBLICATION_REVISION,CONTROL_PUBLICATION_RESERVATION,validateControlPublicationStamp} from '../core/local-control-publication.js';

const op=()=>crypto.randomUUID();
const publicationEvidence=new WeakMap();
async function populatedOwners({denySelected=false}={}){
 const {s,storage,indexedDB}=await setup(OrganizerStore,{localPublicationTerminal:true});
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
 // Observe the actual local adapter boundary before injecting either failure.
 const originalSet=storage.set.bind(storage),initial=(await storage.get(STORAGE_KEY))[STORAGE_KEY];
 const evidence={lastPublished:structuredClone(initial.controlPublication),nonces:new Set([initial.controlPublication.nonce])};
 publicationEvidence.set(storage,evidence);storage.publicationFailure=null;
 storage.set=async payload=>{
  const reservation=await s.repository.transaction(false,t=>t.get('meta',CONTROL_PUBLICATION_RESERVATION),['meta']);
  assert.ok(reservation,'actual publication must own a persisted reservation');
  const stamp=payload[STORAGE_KEY].controlPublication;
  assert.deepEqual(stamp,{version:1,revision:reservation.revision,nonce:reservation.nonce});
  assert.equal(evidence.nonces.has(stamp.nonce),false,'every actual attempt has a fresh nonce');evidence.nonces.add(stamp.nonce);
  if(storage.publicationFailure==='before')throw Error('synthetic pre-write failure');
  await originalSet(payload);evidence.lastPublished=structuredClone(stamp);
  if(storage.publicationFailure==='after')throw Error('synthetic lost acknowledgement');
 };
 return {s,storage,indexedDB,cards,access,memory,topic};
}
async function protectedSnapshot(s,storage){
 const result=await s.run(()=>s.repository.transaction(false,async t=>({rows:Object.fromEntries(await Promise.all(s.repository.stores.map(async name=>[name,await t.all(name)]))),control:await s.control(t)})));
 result.local=(await storage.get(STORAGE_KEY))[STORAGE_KEY];
 assert.deepEqual(result.local.controlPublication,publicationEvidence.get(storage).lastPublished,'readback matches the last exact lease-bound adapter write, including nonce');
 delete result.control.preferences.aiOrganizeStyle;delete result.local.preferences.aiOrganizeStyle;
 return result;
}
function assertProtected(after,before,revisionDelta,publishedDelta=revisionDelta){
 const actual=structuredClone(after),expected=structuredClone(before);
 const beforeRow=expected.rows.meta.find(r=>r.id===CONTROL_PUBLICATION_REVISION);
 const afterRow=actual.rows.meta.find(r=>r.id===CONTROL_PUBLICATION_REVISION);
 assert.deepEqual(afterRow,{id:CONTROL_PUBLICATION_REVISION,version:1,revision:beforeRow.revision+revisionDelta});
 assert.equal(actual.rows.meta.some(r=>r.id===CONTROL_PUBLICATION_RESERVATION),false,'known terminal adapter leaves no orphan reservation');
 const a=validateControlPublicationStamp(actual.local.controlPublication),b=validateControlPublicationStamp(expected.local.controlPublication);
 assert.equal(a.revision,b.revision+publishedDelta);
 if(publishedDelta)assert.notEqual(a.nonce,b.nonce);else assert.equal(a.nonce,b.nonce);
 for(const snapshot of [actual,expected]){
  if(Object.hasOwn(snapshot.control,'controlPublication')){assert.deepEqual(snapshot.control.controlPublication,snapshot.local.controlPublication);delete snapshot.control.controlPublication;}
  delete snapshot.local.controlPublication;
  snapshot.rows.meta=snapshot.rows.meta.filter(r=>r.id!==CONTROL_PUBLICATION_REVISION);
 }
 assert.deepEqual(actual,expected,'all content, authorization and unrelated settings remain byte-equivalent');
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
 let publications=0;for(const value of ['balanced','original','concise','balanced']){assert.equal((await writeStyle(s,value)).ok,true);assertProtected(await protectedSnapshot(s,storage),before,++publications);assert.deepEqual(await ownersSnapshot(s),owners,value);}
 const saved=await s.aiStylePreference();await s.repository.close();const reopened=new OrganizerStore(storage,{indexedDB,localPublicationTerminal:true});await reopened.finishFoundation();
 assert.deepEqual(await reopened.aiStylePreference(),saved);assertProtected(await protectedSnapshot(reopened,storage),before,4);assert.deepEqual(await ownersSnapshot(reopened),owners);
});

test('style changes cannot revive a retained selected Topic veto or broaden real Card and Memory policy',async()=>{
 const {s,storage}=await populatedOwners({denySelected:true}),before=await protectedSnapshot(s,storage),owners=await ownersSnapshot(s);
 assert.ok(owners.memory.rows.some(row=>row.kind==='topic'&&row.decision==='denied'));
 assert.ok(owners.memory.rows.some(row=>row.kind==='topic'&&row.decision==='never'));
 let publications=0;for(const value of ['original','concise','balanced']){await writeStyle(s,value);assertProtected(await protectedSnapshot(s,storage),before,++publications);assert.deepEqual(await ownersSnapshot(s),owners);}
});

test('cross-store style CAS and failed acknowledgements preserve every populated owner and local setting',async()=>{
 const {s,storage,indexedDB}=await populatedOwners({denySelected:true}),before=await protectedSnapshot(s,storage),owners=await ownersSnapshot(s),other=new OrganizerStore(storage,{indexedDB,localPublicationTerminal:true});await other.finishFoundation();
 const stale=await other.aiStylePreference();await writeStyle(s,'original');
 assert.deepEqual(await other.updatePreferences({aiOrganizeStyle:{version:1,value:'concise',expectedRevision:stale.revision,expectedEpoch:stale.epoch}}),{conflict:true});assert.equal((await other.aiStylePreference()).value,'original');
 storage.publicationFailure='before';
 await assert.rejects(writeStyle(other,'concise'));assert.equal((await s.aiStylePreference()).value,'original');assertProtected(await protectedSnapshot(s,storage),before,2,1);assert.deepEqual(await ownersSnapshot(s),owners);
 storage.publicationFailure='after';await assert.rejects(writeStyle(other,'concise'));storage.publicationFailure=null;
 assert.equal((await s.aiStylePreference()).value,'concise');assertProtected(await protectedSnapshot(s,storage),before,3);assert.deepEqual(await ownersSnapshot(s),owners);
 await writeStyle(s,'balanced');assert.equal((await other.aiStylePreference()).value,'balanced');assertProtected(await protectedSnapshot(other,storage),before,4);assert.deepEqual(await ownersSnapshot(other),owners);
});

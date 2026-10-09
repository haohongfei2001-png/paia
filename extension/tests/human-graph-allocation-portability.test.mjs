import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {LibraryDocumentsStore} from '../core/library-documents-store.js';
import {local} from './harness/thought-m1.mjs';
import {BrowserNativeSyncCore,sealOperation} from '../core/browser-native-sync/core.js';
import {HumanLibrarySyncJournal} from '../core/browser-native-sync/human-library-journal.js';
import {digest} from '../core/browser-native-sync/value.js';
import {portableHumanTopicIdentity} from '../core/browser-native-sync/human-library-identity.js';
import {ArchiveError} from '../core/constants.js';
import {ensureThoughtTopicIndex} from '../core/thought-read-index.js';
import {invalidateThoughtTopicIndex as frozenInvalidate} from './fixtures/human-index-old-owner/thought-read-index.js';
import {BrowserNativeSyncCore as PreRoleCore} from './fixtures/human-library-pre-role-reader/extension/core/browser-native-sync/core.js';
globalThis.IDBKeyRange=IDBKeyRange;
const datasetId='synthetic-human-role-portability',op=()=>crypto.randomUUID(),indexId=id=>'thought-read-index:v1:topic:'+id;
async function fixture(device){let tick=0;const allocations=[],s=new LibraryDocumentsStore(local(),{indexedDB:new IDBFactory(),clock:()=>new Date(Date.UTC(2026,9,9)+tick++).toISOString(),uuid:()=>{const id=crypto.randomUUID();allocations.push(id);return id;}});await s.consent(true);await s.finishFoundation();const core=new BrowserNativeSyncCore(s.repository,{datasetId,deviceId:device});s.humanLibraryJournal=new HumanLibrarySyncJournal(core);return {s,core,allocations};}
async function snapshot(s){return s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all([...t.tx.objectStoreNames].map(async name=>[name,await t.all(name)]))));}
async function groups(core){const rows=[];for await(const row of core.rows('revision'))rows.push(row.operation);return rows.filter(row=>row.type==='humanLibraryCommit').sort((a,b)=>a.sequence-b.sequence).map(d=>[...d.value.members.map(ref=>rows.find(row=>row.revisionId===ref.revisionId)),d]);}
async function meta(s,id){return await s.repository.transaction(false,t=>t.get('meta',indexId(id)))??null;}
async function ensure(s,id){await ensureThoughtTopicIndex(s,{topicId:id,describe:()=>null});}
async function semantic(s){const state=await snapshot(s),secret=state.meta.find(x=>x.id==='thought-suppression-key').value,topics=[];for(const row of state.topics)topics.push({...row,identity:await portableHumanTopicIdentity(row,state.revisions,secret)});const histories=[];for(const history of state.revisions){const row=structuredClone(history);for(const side of ['before','after'])if(row.kind==='topic'&&row[side])row[side].identity=await portableHumanTopicIdentity(row[side],state.revisions,secret);histories.push(row);}return {topics,histories};}
async function preparePair(sourceState,targetState){
 const source=await fixture('synthetic-role-source'),target=await fixture('synthetic-role-target'),q=await source.s.createTopic({name:'SYNTHETIC '+sourceState+' to '+targetState,operationId:op()});
 const baseline=(await groups(source.core))[0];await target.s.humanLibraryJournal.receive(target.s,baseline);
 if(sourceState!=='absent')await ensure(source.s,q.id);if(targetState==='building')await ensure(target.s,q.id);
 await source.s.editTopic({id:q.id,expectedRevision:0,changes:{summary:'SYNTHETIC first touch'},operationId:op()});const first=(await groups(source.core)).at(-1);await target.s.humanLibraryJournal.receive(target.s,first);
 if(sourceState==='completed')await ensure(source.s,q.id);if(targetState==='completed')await ensure(target.s,q.id);
 const before=await meta(target.s,q.id);assert.equal(!!before?.buildingGeneration,targetState==='building');assert.equal(!!before?.activeGeneration,targetState!=='absent');
 await source.s.editTopic({id:q.id,expectedRevision:1,changes:{summary:'SYNTHETIC final touch'},operationId:op()});return {source,target,q,before,input:(await groups(source.core)).at(-1)};
}
test('all nine actual sender/receiver absent, building and completed index pairs preserve semantic history and use only receiver derived allocations',async()=>{
 for(const sourceState of ['absent','building','completed'])for(const targetState of ['absent','building','completed']){
  const {source,target,q,before,input}=await preparePair(sourceState,targetState),d=input.at(-1).value;assert.equal(d.allocation.indexGenerationCount,sourceState==='absent'?0:1);target.allocations.length=0;
  assert.equal((await target.s.humanLibraryJournal.receive(target.s,input)).state,'applied');assert.equal(target.allocations.length,targetState==='absent'?0:1);const after=await meta(target.s,q.id);
  const oracle=await fixture('synthetic-role-oracle'),topic=await target.s.repository.transaction(false,t=>t.get('topics',q.id)),epoch=await target.s.repository.transaction(false,t=>t.get('meta','thought-epoch'));
  await oracle.s.repository.transaction(true,async t=>{await t.put('topics',topic);if(epoch)await t.put('meta',epoch);if(before)await t.put('meta',before);});
  await oracle.s.repository.transaction(true,t=>frozenInvalidate(oracle.s,t,q.id,{preparedGeneration:()=>target.allocations[0]}));assert.deepEqual(after,await meta(oracle.s,q.id));
  if(after)assert.notEqual(after.buildingGeneration,d.events.find(e=>e.role==='index-generation')?.value);assert.deepEqual(await semantic(target.s),await semantic(source.s));
  const frozen=await snapshot(target.s);assert.equal((await target.s.humanLibraryJournal.receive(target.s,input)).state,'duplicate');assert.deepEqual(await snapshot(target.s),frozen);
 }
});
async function rewrite(input,change,{validate=true}={}){const rows=structuredClone(input),d=rows.at(-1);change(d.value);if(validate)rows[rows.length-1]=await sealOperation(d);else{delete d.revisionId;rows[rows.length-1]={...d,revisionId:await digest(d)};}return rows;}
test('unknown, missing, reordered, reclassified, mismatched counts and wrong touch anchors refuse before any canonical or protocol write',async()=>{
 const {target,input}=await preparePair('completed','absent'),before=await snapshot(target.s);
 const mutations=[v=>{v.events[0].role='unknown';},v=>{delete v.events[0].role;},v=>{v.allocation.domainCount++;},v=>{v.events.find(e=>e.role==='index-generation').ordinal++;},v=>{v.events.find(e=>e.role==='index-generation').kind='clock';},v=>{v.events.find(e=>e.role==='index-generation').value='invalid generation!';},v=>{v.events.find(e=>e.role==='index-generation').afterDomainOrdinal++;}];
 for(const change of mutations){const bad=await rewrite(input,change,{validate:false});await assert.rejects(target.s.humanLibraryJournal.receive(target.s,bad));assert.deepEqual(await snapshot(target.s),before);}
 const moved=await rewrite(input,v=>{const i=v.events.findIndex(e=>e.role==='index-generation'),[derived]=v.events.splice(i,1);derived.afterDomainOrdinal=v.events.at(-1).ordinal;v.events.push(derived);});await assert.rejects(target.s.humanLibraryJournal.receive(target.s,moved),{code:'BNS_HUMAN_ALLOCATION_CHANGED'});assert.deepEqual(await snapshot(target.s),before);
 const reordered=await rewrite(input,v=>{const clocks=v.events.filter(e=>e.role==='domain'&&e.kind==='clock');[clocks[0].value,clocks[1].value]=[clocks[1].value,clocks[0].value];});await assert.rejects(target.s.humanLibraryJournal.receive(target.s,reordered));assert.deepEqual(await snapshot(target.s),before);
 const reclassified=await rewrite(input,v=>{const at=v.events.findIndex(e=>e.role==='domain'&&e.kind==='uuid'),prior=v.events[at-1];v.events[at]={...v.events[at],role:'index-generation',afterDomainOrdinal:prior.ordinal};let domain=0,index=0;for(const e of v.events)e.ordinal=e.role==='domain'?domain++:index++;for(const e of v.events.filter(x=>x.role==='index-generation'))e.afterDomainOrdinal=v.events[v.events.indexOf(e)-1].ordinal;v.allocation={domainCount:domain,indexGenerationCount:index};});await assert.rejects(target.s.humanLibraryJournal.receive(target.s,reclassified),{code:'BNS_HUMAN_ALLOCATION_CHANGED'});assert.deepEqual(await snapshot(target.s),before);
});
test('real move touches both original index owners in order; different local branches retain complete metadata and failure rolls back every store',async()=>{
 const source=await fixture('synthetic-move-source'),target=await fixture('synthetic-move-target'),a=await source.s.createTopic({name:'SYNTHETIC move source',operationId:op()}),b=await source.s.createTopic({name:'SYNTHETIC move target',operationId:op()}),e=await source.s.createEntry({actor:'user',body:'SYNTHETIC move body',type:'idea',formation:'explicit',evidence:[],operationId:op()});await source.s.placeEntry({entryId:e.id,topicId:a.id,expectedEntryRevision:0,expectedTopicRevision:0,operationId:op()});for(const group of await groups(source.core))await target.s.humanLibraryJournal.receive(target.s,group);
 await ensure(source.s,a.id);await ensure(source.s,b.id);await ensure(target.s,b.id);const before=[await meta(target.s,a.id),await meta(target.s,b.id)],entry=await source.s.entry(e.id),ta=await source.s.topic(a.id),tb=await source.s.topic(b.id);await source.s.moveMembership({entryId:e.id,sourceTopicId:a.id,targetTopicId:b.id,expectedEntryRevision:entry.revision,expectedSourceRevision:ta.organizationRevision,expectedTargetRevision:tb.organizationRevision,operationId:op()});const input=(await groups(source.core)).at(-1),derived=input.at(-1).value.events.filter(x=>x.role==='index-generation');assert.equal(derived.length,2);assert.notEqual(derived[0].afterDomainOrdinal,derived[1].afterDomainOrdinal);
 const frozen=await snapshot(target.s),commit=target.core.commitHumanReceive.bind(target.core);target.core.commitHumanReceive=async(...args)=>{await commit(...args);throw new ArchiveError('SYNTHETIC_ROLE_INDEX_ABORT');};await assert.rejects(target.s.humanLibraryJournal.receive(target.s,input),{code:'SYNTHETIC_ROLE_INDEX_ABORT'});assert.deepEqual(await snapshot(target.s),frozen);target.core.commitHumanReceive=commit;target.allocations.length=0;assert.equal((await target.s.humanLibraryJournal.receive(target.s,input)).state,'applied');assert.equal(target.allocations.length,1);assert.equal(await meta(target.s,a.id),null);
 const oracle=await fixture('synthetic-move-oracle'),topic=await target.s.repository.transaction(false,t=>t.get('topics',b.id));await oracle.s.repository.transaction(true,async t=>{await t.put('topics',topic);await t.put('meta',before[1]);});await oracle.s.repository.transaction(true,t=>frozenInvalidate(oracle.s,t,b.id,{preparedGeneration:()=>target.allocations[0]}));assert.deepEqual(await meta(target.s,b.id),await meta(oracle.s,b.id));assert.deepEqual(await semantic(target.s),await semantic(source.s));
});
test('actual known-Human pre-role Core and codec bytes reject the new required descriptor and full group with zero store writes',async()=>{
 const base=new URL('./fixtures/human-library-pre-role-reader/',import.meta.url),manifest=JSON.parse(await readFile(new URL('manifest.json',base),'utf8'));assert.equal(manifest.commit,'963d3985bab8558720a4e67e1b6461148f5a5e00');assert.equal(Object.keys(manifest.files).length,41);
 for(const [path,proof]of Object.entries(manifest.files)){const bytes=await readFile(new URL('extension/'+path,base));assert.equal(createHash('sha256').update(bytes).digest('hex'),proof.sha256);assert.equal(createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),proof.gitBlob);}
 const source=await fixture('synthetic-new-role'),target=await fixture('synthetic-old-role');await source.s.createTopic({name:'SYNTHETIC required role',operationId:op()});const [input]=await groups(source.core),before=await snapshot(target.s),old=new PreRoleCore(target.s.repository,{datasetId,deviceId:'synthetic-pre-role'});await assert.rejects(old.prepareHumanReceive(input));assert.deepEqual(await snapshot(target.s),before);
});

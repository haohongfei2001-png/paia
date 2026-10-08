import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,collect,op,rows,raw,topic,append} from './harness/topic-02.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {HiddenTopicCandidates,TOPIC_CANDIDATE_PREFIX,TOPIC_CANDIDATE_POLICY} from '../core/topic-candidates.js';
import {TopicIdentityRetrieval} from '../core/topic-retrieval.js';
import {MemoryService} from '../core/memory/service.js';
import {BackupService as FixtureBackup} from './harness/historical-backup.mjs';
import {BackupService} from '../core/backup-service.js';
import {exported,prepared as prepareBackup} from './harness/backup-v081.mjs';
const candidates=f=>new HiddenTopicCandidates(f.s,f.serviceOptions);
async function request(f,scope=f.scope,names=['Synthetic tentative object']){return {scope,names,coverage:(await collect(f.retrieval,{scope,names})).coverage};}

test('TOPIC-02 candidates are body/label-free work metadata and absent from Topic, Context, job, suggestion and search APIs',async()=>{
 const f=await fixture(),service=candidates(f),beforeTopics=await rows(f.s,'topics'),r=await service.record(await request(f));
 assert.ok(r.candidateId.startsWith(TOPIC_CANDIDATE_PREFIX));assert.equal(r.revision,0);const row=await service.read(r.candidateId);assert.equal(row.state,'candidate');assert.equal(row.evidence.length,1);assert.equal(row.jobId,undefined);
 const serialized=JSON.stringify(row);for(const text of ['Synthetic tentative object','Synthetic explicit working input','thoughtText','summary','bodyBinding'])assert.ok(!serialized.includes(text));
 assert.deepEqual(await rows(f.s,'topics'),beforeTopics);assert.equal((await rows(f.s,'sections')).length,0);assert.equal((await f.s.libraryIndexPage()).items.length,0);assert.equal((await f.s.suggestionPage()).items.length,0);assert.equal((await f.s.organizerJobPage()).items.length,0);assert.equal((await new MemoryService(f.s).status()).items.length,0);assert.equal((await f.s.searchLibrary({query:'Synthetic tentative object'})).items.length,0);await assert.rejects(f.s.topic(r.candidateId));
 assert.equal((await rows(f.s,'organizerSuggestions')).length,0);assert.equal((await rows(f.s,'organizerJobs')).some(x=>x.id===r.candidateId),false);
});
test('TOPIC-02 candidate CAS, accumulation and restart retain only independent source references',async()=>{
 const f=await fixture(),scope=await append(f.s),service=candidates(f),one=await request(f,[scope[0]]),r=await service.record(one);
 assert.deepEqual(await service.record(one),{conflict:true});
 const both=await request(f,scope),updated=await service.record({...both,candidateId:r.candidateId,expectedRevision:0});assert.equal(updated.evidenceCount,2);assert.equal(updated.revision,1);
 await f.s.repository.close();const s=new OrganizerStore(f.storage,{indexedDB:f.indexedDB}),restart=new HiddenTopicCandidates(s,f.serviceOptions),row=await restart.read(r.candidateId);assert.equal(row.revision,1);assert.equal(row.evidence.length,2);assert.equal(new Set(row.evidence.map(e=>e.scopeToken)).size,2);assert.equal((await rows(s,'topics')).length,0);
 assert.deepEqual(await restart.discard({candidateId:r.candidateId,expectedRevision:0}),{conflict:true});assert.equal((await restart.read(r.candidateId)).revision,1);
});
test('TOPIC-02 candidate consolidation is atomic, bounded and cannot collapse keep-separate anchors',async()=>{
 const f=await fixture(),scope=await append(f.s),a=await topic(f.s,'Object A'),b=await topic(f.s,'Object B'),service=candidates(f);
 const first=await service.record({...await request(f,[scope[0]],['A']),relatedTopicIds:[a.id]}),second=await service.record({...await request(f,[scope[1]],['B']),relatedTopicIds:[b.id]});
 await f.s.keepTopicsSeparate({sourceId:a.id,targetId:b.id});const combined=await request(f,scope,['A','B']),blocked=await service.consolidate({...combined,targetId:first.candidateId,sourceId:second.candidateId,expectedTargetRevision:0,expectedSourceRevision:0});assert.equal(blocked.deferred,true);assert.equal((await rows(f.s,'organizerWorkItems')).length,2);
 const g=await fixture(),gs=await append(g.s),gsrv=candidates(g),left=await gsrv.record(await request(g,[gs[0]],['Same tentative label'])),right=await gsrv.record(await request(g,[gs[1]],['Same tentative label']));assert.notEqual(left.candidateId,right.candidateId,'names do not deduplicate identity');
 const merge={...await request(g,gs,['Same tentative label']),targetId:left.candidateId,sourceId:right.candidateId,expectedTargetRevision:0,expectedSourceRevision:0};
 const write=g.s.foundationWrite.bind(g.s);g.s.foundationWrite=fn=>write(async t=>{const value=await fn(t);throw Object.assign(Error('synthetic failure'),{value});});await assert.rejects(gsrv.consolidate(merge));g.s.foundationWrite=write;assert.equal((await rows(g.s,'organizerWorkItems')).length,2);
 const result=await gsrv.consolidate(merge);assert.equal(result.evidenceCount,2);assert.equal(result.revision,1);assert.equal(await gsrv.read(right.candidateId),null);assert.equal((await rows(g.s,'topics')).length,0);
});
test('TOPIC-02 removed aliases suppress candidates without touching existing content or creating an identity',async()=>{
 const f=await fixture(),a=await topic(f.s,'Old object name');await f.s.renameTopic({id:a.id,name:'Current name',expectedRevision:0,operationId:op()});await f.s.removeTopic({id:a.id,expectedRevision:1,operationId:op()});
 const r=await candidates(f).record(await request(f,f.scope,['Old object name']));assert.equal(r.deferred,true);assert.equal((await rows(f.s,'organizerWorkItems')).length,0);assert.equal((await rows(f.s,'topics')).length,1);assert.equal((await rows(f.s,'blocks')).length,1);
});
test('TOPIC-02 actual permanentDelete admits disposable candidates then source-index cleanup erases them',async()=>{
 const f=await fixture(),service=candidates(f),r=await service.record(await request(f)),record=(await rows(f.s,'records'))[0];
 await f.s.permanentDelete(record.id);assert.equal(await service.read(r.candidateId),null);assert.equal(await raw(f.s,'records',record.id),undefined);await f.s.drainPurgeCleanup();assert.equal(await raw(f.s,'organizerWorkItems',r.candidateId),undefined);assert.equal((await rows(f.s,'tombstones')).length>0,true);
});
test('TOPIC-02 candidate expiry and permission revocation discard only internal metadata in bounded restartable pages',async()=>{
 let now=Date.parse('2026-10-01T00:00:00Z');const f=await fixture({clock:()=>new Date(now).toISOString()}),scope=await append(f.s),service=candidates(f);
 for(const s of scope)await service.record(await request(f,[s]));const before=await Promise.all(['records','blocks','thoughts','topics'].map(name=>rows(f.s,name)));
 now+=TOPIC_CANDIDATE_POLICY.lifetimeMs+1;const first=await service.maintain({limit:1});assert.equal(first.visited,1);assert.equal(first.discarded,1);assert.equal(first.complete,false);await f.s.repository.close();const s=new OrganizerStore(f.storage,{indexedDB:f.indexedDB,clock:()=>new Date(now).toISOString()}),restart=new HiddenTopicCandidates(s,f.serviceOptions),second=await restart.maintain({cursor:first.nextCursor,limit:1});assert.equal(second.discarded,1);assert.equal(second.complete,true);assert.deepEqual(await Promise.all(['records','blocks','thoughts','topics'].map(name=>rows(s,name))),before);
 const g=await fixture(),gsrv=candidates(g),r=await gsrv.record(await request(g));g.permission.allowed=false;assert.equal(await gsrv.read(r.candidateId),null);assert.equal((await gsrv.maintain()).discarded,1);assert.equal((await rows(g.s,'blocks')).length,1);
});
test('TOPIC-02 replace restore disposes hidden candidates and invalidates retained cursors without exporting them',async()=>{
 const f=await fixture(),service=candidates(f),source=await exported(new FixtureBackup(f.s,{appVersion:'0.12.1'})),lookup=await request(f),r=await service.record(lookup);assert.ok(source.every(item=>!JSON.stringify(item).includes(TOPIC_CANDIDATE_PREFIX)));
 const restore=new BackupService(f.s),stage=await prepareBackup(restore,source),preview=await restore.previewRestore({sessionId:stage.sessionId,mode:'replace'});assert.equal(preview.canRestore,true);await restore.restore({sessionId:stage.sessionId,mode:'replace',confirmation:preview.integrity,targetGeneration:preview.targetGeneration,confirmReplace:true});
 assert.equal(await raw(f.s,'organizerWorkItems',r.candidateId),undefined);await assert.rejects(service.record(lookup));assert.equal((await rows(f.s,'blocks')).length,1);
});
test('TOPIC-02 malformed and forged candidates fail closed; terminal work flags do not grant authority',async()=>{
 for(const mutate of [r=>r.body='forged copied body',r=>r.kind='organize',r=>r.version=99,r=>r.keyToken='0'.repeat(64),r=>r.evidence[0].basedOnContentRevision++,r=>r.authority.processingEpoch='forged',r=>r.inputIds=['forged']]){
  const f=await fixture(),service=candidates(f),r=await service.record(await request(f));await f.s.foundationWrite(async t=>{const row=await t.get('organizerWorkItems',r.candidateId);mutate(row);await t.put('organizerWorkItems',row);});
  let value=null;try{value=await service.read(r.candidateId);}catch(error){assert.ok(['INVALID_REQUEST','STORAGE_FAILED'].includes(error.code));}assert.equal(value,null);assert.equal((await f.s.suggestionPage()).items.length,0);assert.equal((await f.s.organizerJobPage()).items.length,0);assert.equal((await rows(f.s,'topics')).length,0);
 }
});
test('TOPIC-02 no network, canonical body writes or external authorization expansion during candidate mechanics',async()=>{
 const f=await fixture(),scope=await append(f.s),service=candidates(f),tables=['records','blocks','inputStates','thoughts','topics','placements','tombstones'],before=await Promise.all(tables.map(name=>rows(f.s,name))),auth=(await rows(f.s,'meta')).filter(r=>/context|memory|passport|gate|consent/i.test(r.id));let calls=0;const old=globalThis.fetch;globalThis.fetch=async()=>{calls++;assert.fail('network');};try{const a=await service.record(await request(f,[scope[0]])),b=await service.record(await request(f,[scope[1]]));await service.consolidate({...await request(f,scope),targetId:a.candidateId,sourceId:b.candidateId,expectedTargetRevision:0,expectedSourceRevision:0});await service.discard({candidateId:a.candidateId,expectedRevision:1});assert.equal(calls,0);assert.deepEqual(await Promise.all(tables.map(name=>rows(f.s,name))),before);assert.deepEqual((await rows(f.s,'meta')).filter(r=>/context|memory|passport|gate|consent/i.test(r.id)),auth);}finally{globalThis.fetch=old;}
});
test('TOPIC-02 one Input can hold distinct opaque candidate boundaries without allocating Topic identities',async()=>{
 const f=await fixture(),service=candidates(f),lookup=await request(f),a=await service.record({...lookup,boundaryKey:'a'.repeat(64)}),b=await service.record({...lookup,boundaryKey:'b'.repeat(64)});assert.notEqual(a.candidateId,b.candidateId);assert.equal((await rows(f.s,'organizerWorkItems')).length,2);assert.deepEqual((await service.read(a.candidateId)).evidence,(await service.read(b.candidateId)).evidence);assert.equal((await rows(f.s,'topics')).length,0);assert.equal((await rows(f.s,'thoughts')).length,0);assert.deepEqual(await service.record({...lookup,boundaryKey:'a'.repeat(64)}),{conflict:true});await assert.rejects(service.record({...lookup,candidateId:a.candidateId,expectedRevision:0,boundaryKey:'b'.repeat(64)}));
});
test('TOPIC-02 a stable opaque boundary locates prior hidden evidence after restart and a later independent Input',async()=>{
 const f=await fixture(),service=candidates(f),boundaryKey='c'.repeat(64),first=await service.record({...await request(f),boundaryKey});const scope=await append(f.s,'later-independent-input','Later synthetic work on the same tentative boundary');await f.s.repository.close();
 const s=new OrganizerStore(f.storage,{indexedDB:f.indexedDB}),restart=new HiddenTopicCandidates(s,f.serviceOptions),retrieval=new TopicIdentityRetrieval(s,f.serviceOptions),later=scope.filter(x=>x.inputId!==f.scope[0].inputId),old=await restart.lookupBoundary({scope:later,boundaryKey});assert.equal(old.id,first.candidateId);assert.equal(old.evidence.length,1);
 const names=['Synthetic tentative object'],coverage=(await collect(retrieval,{scope,names})).coverage,updated=await restart.record({scope,names,coverage,boundaryKey,expectedRevision:old.revision});assert.equal(updated.candidateId,first.candidateId);assert.equal(updated.revision,1);assert.equal(updated.evidenceCount,2);assert.equal((await rows(s,'organizerWorkItems')).length,1);assert.equal((await rows(s,'topics')).length,0);assert.equal((await s.suggestionPage()).items.length,0);
});
test('TOPIC-02 candidate record, read and consolidation honor exact related and redirected target revocation',async()=>{
 const f=await fixture(),scope=await append(f.s),a=await topic(f.s,'Redirect'),b=await topic(f.s,'Target');await f.s.foundationWrite(async t=>{const row=await t.get('topics',a.id);row.redirectTo=b.id;row.lifecycle='merged';await t.put('topics',row);});
 let denied=null;const options={resolveProcessing:async(_t,r)=>({allowed:!r.topicIds.includes(denied),epoch:'same-broad-epoch',inputIds:[...r.inputIds],topicIds:[...r.topicIds]})};f.retrieval=new TopicIdentityRetrieval(f.s,options);const service=new HiddenTopicCandidates(f.s,options),one={...await request(f,[scope[0]]),relatedTopicIds:[a.id]},r=await service.record(one),second=await service.record(await request(f,[scope[1]])),both=await request(f,scope);
 denied=b.id;await assert.rejects(service.record({...one,candidateId:r.candidateId,expectedRevision:0}));assert.equal(await service.read(r.candidateId),null);await assert.rejects(service.consolidate({...both,targetId:r.candidateId,sourceId:second.candidateId,expectedTargetRevision:0,expectedSourceRevision:0}));assert.equal((await rows(f.s,'organizerWorkItems')).length,2);assert.equal((await service.maintain()).discarded,2,'incomplete current identity authority invalidates disposable work, never Source content');assert.equal((await rows(f.s,'blocks')).length,2);
});
async function manyConstraints(f){const ids=[];for(let i=0;i<16;i++)ids.push((await topic(f.s,'Constrained object '+i)).id);for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++)await f.s.keepTopicsSeparate({sourceId:ids[i],targetId:ids[j]});return [await topic(f.s,'Independent A'),await topic(f.s,'Independent B')];}
test('TOPIC-02 more than 100 constraints use one bounded read proof and no namespace scan in the write transaction',async()=>{
 const f=await fixture(),[a,b]=await manyConstraints(f),service=candidates(f),lookup={...await request(f),relatedTopicIds:[a.id,b.id]};let pairPages=0,maxRows=0;
 const transaction=f.s.repository.transaction.bind(f.s.repository);f.s.repository.transaction=(write,fn,...rest)=>transaction(write,async t=>{const range=t.primaryRangePage.bind(t),page=t.page.bind(t);t.primaryRangePage=async(name,options)=>{if(name==='meta'&&options.prefix==='topicKeepSeparate:'){assert.equal(write,false);pairPages++;const result=await range(name,options);maxRows=Math.max(maxRows,result.rows.length);return result;}return range(name,options);};t.page=async(name,options)=>{if(name==='topics')assert.equal(write,false);return page(name,options);};return fn(t);},...rest);
 const r=await service.record(lookup);assert.equal(r.revision,0);assert.equal(pairPages,2);assert.equal(maxRows,100);f.s.repository.transaction=transaction;assert.equal((await rows(f.s,'organizerWorkItems')).length,1);
});
test('TOPIC-02 a constraint or redirect mutation midway through a paged proof refuses without partial candidate writes',async()=>{
 for(const mutation of ['constraint','redirect']){
  const f=await fixture(),[a,b]=await manyConstraints(f),service=candidates(f),lookup={...await request(f),relatedTopicIds:[a.id,b.id]},bodies=await rows(f.s,'blocks');let pages=0;
  f.s.repository.checkpoint=async label=>{if(label==='topic-constraints-page'&&++pages===2){if(mutation==='constraint')await f.s.keepTopicsSeparate({sourceId:a.id,targetId:b.id});else await f.s.foundationWrite(async t=>{const row=await t.get('topics',a.id);row.lifecycle='merged';row.redirectTo=b.id;await t.put('topics',row);});}};
  await assert.rejects(service.record(lookup));assert.equal((await rows(f.s,'organizerWorkItems')).length,0);assert.deepEqual(await rows(f.s,'blocks'),bodies);
 }
});
test('TOPIC-02 unmapped legacy removed names fence NFKC-equivalent candidate record and consolidation without migration',async()=>{
 const f=await fixture(),scope=await append(f.s),legacy=await topic(f.s,'Legacy　Object'),service=candidates(f),a=await service.record(await request(f,[scope[0]],['Legacy Object'])),b=await service.record(await request(f,[scope[1]],['Another object']));
 await f.s.foundationWrite(async t=>{const row=await t.get('topics',legacy.id);delete row.identity;row.lifecycle='removed';row.activeKey=1;row.revision++;await t.put('topics',row);for(const m of await t.all('meta'))if(m.id.startsWith('personalTopicName:')&&m.topicIds.includes(legacy.id))await t.delete('meta',m.id);});
 const before=await Promise.all(['topics','blocks','records','meta','organizerWorkItems'].map(name=>rows(f.s,name))),single=await request(f,[scope[0]],['Legacy Object']);assert.equal(single.coverage.removedNameMatch,true);const denied=await service.record({...single,boundaryKey:'f'.repeat(64)});assert.equal(denied.deferred,true);
 const combined=await request(f,scope,['Legacy Object','Another object']),merge=await service.consolidate({...combined,targetId:a.candidateId,sourceId:b.candidateId,expectedTargetRevision:0,expectedSourceRevision:0});assert.equal(merge.deferred,true);assert.deepEqual(await Promise.all(['topics','blocks','records','meta','organizerWorkItems'].map(name=>rows(f.s,name))),before);assert.equal(await raw(f.s,'meta','personal-topic-identity-compat-v1'),undefined);assert.equal(await service.read(a.candidateId),null);
});

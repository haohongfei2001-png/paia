import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,collect,op,rows,raw,topic,append} from './harness/topic-02.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {TopicIdentityRetrieval} from '../core/topic-retrieval.js';
import {setTopicLifecycle} from '../core/topic-identity.js';

test('TOPIC-02 complete bounded retrieval covers beyond 32/8 with restart and no shortlist identity proof',async()=>{
 const f=await fixture();for(let i=0;i<73;i++)await topic(f.s,'Synthetic object '+i);
 const metrics=f.s.repository.metrics,scans=metrics.scans,writes=metrics.writes;
 const first=await f.retrieval.page({scope:f.scope,names:['Synthetic object 72'],limit:7});assert.equal(first.items.length,7);assert.equal(first.complete,false);assert.equal(first.creationAllowed,false);
 await f.s.repository.close();const s=new OrganizerStore(f.storage,{indexedDB:f.indexedDB}),retrieval=new TopicIdentityRetrieval(s,f.serviceOptions);let cursor=first.nextCursor,items=[...first.items],pages=1,last;
 do{last=await retrieval.page({scope:f.scope,names:['Synthetic object 72'],cursor,limit:7});assert.ok(last.items.length<=7);items.push(...last.items);cursor=last.nextCursor;pages++;}while(cursor);
 assert.equal(items.filter(x=>x.kind==='identity').length,73);assert.equal(new Set(items.map(x=>x.id)).size,73);assert.equal(last.coverage.visited,73);assert.equal(last.coverage.unavailable,0);assert.ok(pages>=12);assert.ok(items.some(x=>x.name==='Synthetic object 72'&&x.nameMatches[0]?.current));assert.equal(last.identityProof,false);assert.equal(last.creationAllowed,false);assert.equal(metrics.scans,scans);assert.equal(metrics.writes,writes);
 await retrieval.withCoverage({scope:f.scope,names:['Synthetic object 72'],coverage:last.coverage},async()=>({checked:true}));
});
test('TOPIC-02 aliases, dormant objects, merged redirects, removed fences and keep-separate stay in the same universe',async()=>{
 const f=await fixture(),a=await topic(f.s,'Former name'),b=await topic(f.s,'Sleeping object'),c=await topic(f.s,'Survivor'),d=await topic(f.s,'Removed former name');
 await f.s.renameTopic({id:a.id,expectedRevision:0,name:'Current name',operationId:op()});
 await f.s.foundationWrite(async t=>{const row=await t.get('topics',b.id);setTopicLifecycle(row,'dormant',{actor:'ai',operationId:op()});await t.put('topics',row);});
 await f.s.keepTopicsSeparate({sourceId:a.id,targetId:b.id});
 await f.s.startLayout({kind:'topic_merge',topicId:a.id,survivorId:c.id,expectedTopicRevision:(await f.s.topic(a.id)).organizationRevision,expectedSurvivorRevision:(await f.s.topic(c.id)).organizationRevision,operationId:op()});await f.s.drainLibraryMaintenance();
 await f.s.removeTopic({id:d.id,expectedRevision:0,operationId:op()});
 const page=await collect(f.retrieval,{scope:f.scope,names:['Former name','Removed former name'],limit:2}),found=id=>page.items.find(x=>x.id===id);
 assert.equal(found(a.id).lifecycle,'merged');assert.equal(found(a.id).canonicalId,c.id);assert.equal(found(a.id).nameMatches[0].alias,true);assert.equal(found(b.id).lifecycle,'dormant');assert.equal(found(d.id).removedFence,true);assert.equal(found(d.id).name,undefined);assert.equal(found(d.id).nameMatches[0].current,true);
 assert.deepEqual(page.items.find(x=>x.kind==='keep_separate'),{kind:'keep_separate',sourceId:a.id,targetId:b.id,canonicalSourceId:c.id,canonicalTargetId:b.id});assert.equal((await rows(f.s,'topics')).length,4);
});
test('TOPIC-02 equal names remain distinct, a miss is not identity proof and incomplete/forged coverage cannot commit',async()=>{
 const f=await fixture();await topic(f.s,'Equal name');await topic(f.s,'Equal name');const first=await f.retrieval.page({scope:f.scope,names:['Equal name'],limit:1});
 await assert.rejects(f.retrieval.withCoverage({scope:f.scope,names:['Equal name'],coverage:first.coverage},()=>assert.fail('incomplete write')));
 for(const patch of [{phase:'complete'},{after:'skip-to-end'},{visited:999},{requestKey:'0'.repeat(64)}])await assert.rejects(f.retrieval.page({scope:f.scope,names:['Equal name'],cursor:{...first.nextCursor,...patch}}));
 await assert.rejects(f.retrieval.page({scope:f.scope,names:['Different query'],cursor:first.nextCursor}));
 const all=await collect(f.retrieval,{scope:f.scope,names:['Equal name']});assert.equal(all.items.filter(x=>x.nameMatches.length).length,2);assert.equal(all.creationAllowed,false);
 const miss=await collect(f.retrieval,{scope:f.scope,names:['Absent word']});assert.ok(miss.items.every(x=>!x.nameMatches.length));assert.equal(miss.identityProof,false);
});
test('TOPIC-02 changed identity, keep-separate, processing, key or restore epoch invalidate continuations and final receipts',async()=>{
 for(const mutation of ['create','rename','separate','permission','key','restore']){
  const f=await fixture(),a=await topic(f.s,'A'),b=await topic(f.s,'B'),page=await collect(f.retrieval,{scope:f.scope});
  if(mutation==='create')await topic(f.s,'C');if(mutation==='rename')await f.s.renameTopic({id:a.id,expectedRevision:0,name:'New A',operationId:op()});if(mutation==='separate')await f.s.keepTopicsSeparate({sourceId:a.id,targetId:b.id});if(mutation==='permission')f.permission.epoch='synthetic-processing-2';
  if(mutation==='key'||mutation==='restore')await f.s.foundationWrite(t=>t.put('meta',mutation==='key'?{id:'thought-suppression-key',value:Array(32).fill(3)}:{id:'recovery-restore-epoch',value:op()}));
  await assert.rejects(f.retrieval.withCoverage({scope:f.scope,coverage:page.coverage},()=>assert.fail('stale write')),mutation);
 }
});
test('TOPIC-02 permission is default-denied, exact-scope bound and checked before evidence reads and after async work',async()=>{
 const f=await fixture();let reads=0;const original=f.s.evidenceFor.bind(f.s);f.s.evidenceFor=async(...args)=>{reads++;return original(...args);};
 await assert.rejects(new TopicIdentityRetrieval(f.s).page({scope:f.scope}));assert.equal(reads,0);
 await assert.rejects(new TopicIdentityRetrieval(f.s,{resolveProcessing:async()=>({allowed:true,epoch:'forged',inputIds:[],topicIds:[]})}).page({scope:f.scope}));assert.equal(reads,0);
 f.s.evidenceFor=async(...args)=>{const e=await original(...args);f.permission.allowed=false;return e;};await assert.rejects(f.retrieval.page({scope:f.scope}));
});
test('TOPIC-02 excluded or purged scope, disabled capture and invalid redirects fail closed',async()=>{
 for(const mode of ['excluded','purged','disabled','cycle']){
  const f=await fixture();
  if(mode==='excluded')await f.s.excludeLibrary(f.scope[0].inputId,true);
  if(mode==='purged')await f.s.permanentDelete((await rows(f.s,'records'))[0].id);
  if(mode==='disabled')await f.s.setEnabled(false);
  if(mode==='cycle'){const a=await topic(f.s),b=await topic(f.s,'B');await f.s.foundationWrite(async t=>{for(const [from,to]of [[a.id,b.id],[b.id,a.id]]){const row=await t.get('topics',from);row.redirectTo=to;row.lifecycle='merged';await t.put('topics',row);}});}
  await assert.rejects(f.retrieval.page({scope:f.scope}),mode);
 }
});
test('TOPIC-02 final read detects mutation during cursor hashing and transaction rollback remains atomic',async()=>{
 const f=await fixture(),a=await topic(f.s),original=f.retrieval.sign.bind(f.retrieval);f.retrieval.sign=async(...args)=>{const proof=await original(...args);await f.s.renameTopic({id:a.id,name:'Concurrent rename',expectedRevision:0,operationId:op()});return proof;};await assert.rejects(f.retrieval.page({scope:f.scope}));f.retrieval.sign=original;
 const page=await collect(f.retrieval,{scope:f.scope});await assert.rejects(f.retrieval.withCoverage({scope:f.scope,coverage:page.coverage},async t=>{await t.put('meta',{id:'synthetic-failed-candidate',value:1});throw Error('rollback');}));assert.equal(await raw(f.s,'meta','synthetic-failed-candidate'),undefined);
});
test('TOPIC-02 denied redirect targets and target-specific revocation during signing cannot release descriptors',async()=>{
 const f=await fixture(),a=await topic(f.s,'Redirect'),b=await topic(f.s,'Private target');await f.s.foundationWrite(async t=>{const row=await t.get('topics',a.id);row.lifecycle='merged';row.redirectTo=b.id;await t.put('topics',row);});
 let denied=b.id;const resolver=async(_t,request)=>({allowed:!request.topicIds.includes(denied),epoch:'constant-fixture-epoch',inputIds:[...request.inputIds],topicIds:[...request.topicIds]}),retrieval=new TopicIdentityRetrieval(f.s,{resolveProcessing:resolver});
 await assert.rejects(retrieval.page({scope:f.scope}));denied=null;const sign=retrieval.sign.bind(retrieval);retrieval.sign=async(...args)=>{const proof=await sign(...args);denied=b.id;return proof;};await assert.rejects(retrieval.page({scope:f.scope}));
 assert.equal((await raw(f.s,'topics',b.id)).name,'Private target');
});
test('TOPIC-02 constraint continuations accept long valid IDs while remaining authenticated and bounded',async()=>{
 let n=0;const f=await fixture({uuid:()=>('synthetic-long-id-'+String(++n).padStart(6,'0')).padEnd(180,'x')}),a=await topic(f.s,'A'),b=await topic(f.s,'B'),c=await topic(f.s,'C');await f.s.keepTopicsSeparate({sourceId:a.id,targetId:b.id});await f.s.keepTopicsSeparate({sourceId:a.id,targetId:c.id});
 const page=await collect(f.retrieval,{scope:f.scope,limit:1});assert.equal(page.items.filter(x=>x.kind==='keep_separate').length,2);assert.equal(page.coverage.visited,5);assert.equal(page.complete,true);
});
test('TOPIC-02 ineligible derived labels are withheld and unavailable identity coverage cannot authorize a write',async()=>{
 const f=await fixture(),scope=await append(f.s),a=await topic(f.s,'Source-derived private label'),sourceId=(await f.s.input(f.scope[0].inputId)).sourceRecordId;
 await f.s.foundationWrite(async t=>{const row=await t.get('topics',a.id);row.createdBy='ai';row.protections.name={locked:false};row.sourceRecordIds=[sourceId];await t.put('topics',row);});await f.s.excludeLibrary(f.scope[0].inputId,true);
 const allowed=scope.filter(x=>x.inputId!==f.scope[0].inputId),page=await collect(f.retrieval,{scope:allowed});assert.equal(page.items[0].available,false);assert.equal(page.items[0].name,undefined);assert.equal(page.coverage.unavailable,1);await assert.rejects(f.retrieval.withCoverage({scope:allowed,coverage:page.coverage},()=>assert.fail('unavailable coverage')));
});

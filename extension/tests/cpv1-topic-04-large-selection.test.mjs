import test from 'node:test';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {OrganizerStore} from '../core/organizer/store.js';
import {restoreSectionPromotion} from '../core/topic-promotion-history.js';
import {hashText} from '../core/dedupe.js';
import {promotionFixture,promotionService,decide,request,confirmed,rows,raw,op,derived,addInput,snapshot} from './harness/topic-04.mjs';

async function completeAssessment(view,reader){
 const seen=[];for(let index=0;index<reader.pageCount;index++){const page=await reader.readPage(index);assert.ok(page.entryIds.length<=100);assert.ok(page.inputs.length<=100);assert.equal(page.entries.length,page.entryIds.length);seen.push(...page.entryIds);}
 assert.equal(seen.length,view.manifest.count);assert.equal(new Set(seen).size,seen.length);
 return {...decide(view),selection:{kind:view.selection,count:seen.length,manifestDigest:view.manifest.digest,necessary:'all_selected_placements'}};
}
const whole=f=>{const r=request(f,{selection:'whole_section'});delete r.entryIds;return r;};
const digest=async f=>hashText(JSON.stringify(await snapshot(f.s)));

test('TOPIC-04 complete 257-Entry Section stages in bounded pages, survives interruption, and atomically activates one identity',async t=>{
 const f=await promotionFixture({count:257});let assessmentPages=0;f.service=promotionService(f,async(view,reader)=>{assessmentPages=reader.pageCount;return completeAssessment(view,reader);});const before=await digest(f),r=whole(f),start=performance.now(),work=await confirmed(f,r),preparedMs=performance.now()-start;assert.equal(work.h.wholeSection,true);assert.equal(work.h.selectedCount,257);assert.equal(work.h.entryIds.length,257);
 const first=await f.service.stage(work.workId);assert.equal(first.staged,100);assert.equal(first.state,'staging');assert.equal(await digest(f),before);await assert.rejects(f.service.activate(work.workId));
 await f.s.repository.close();f.s=new OrganizerStore(f.storage,{indexedDB:f.indexedDB});f.service=promotionService(f,null,{decision:null});assert.equal((await f.service.stage(work.workId)).staged,200);assert.equal((await f.service.stage(work.workId)).state,'ready');assert.equal(await digest(f),before);
 const write=f.s.foundationWrite.bind(f.s);let moved=0;f.s.foundationWrite=fn=>write(async tx=>{const put=tx.put.bind(tx);tx.put=async(name,row,...args)=>{if(name==='placements'&&row.lifecycle==='active'&&row.topicId!==f.parent.id&&++moved===129)throw Error('synthetic middle activation failure');return put(name,row,...args);};return fn(tx);});await assert.rejects(f.service.activate(work.workId));assert.equal(moved,129);assert.equal(await digest(f),before);assert.equal((await rows(f.s,'organizerWorkItems')).length,258);f.s.foundationWrite=write;
 let activationTransactionMs=0,activationWrites=0;f.s.foundationWrite=async fn=>{const start=performance.now(),writes=f.s.repository.metrics.writes,value=await write(fn);activationTransactionMs=performance.now()-start;activationWrites=f.s.repository.metrics.writes-writes;return value;};const at=performance.now(),result=await f.service.activate(work.workId),activationMs=performance.now()-at;f.s.foundationWrite=write;assert.equal(result.entryIds.length,257);assert.equal((await rows(f.s,'topics')).length,2);assert.equal((await rows(f.s,'thoughts')).length,257);assert.equal((await rows(f.s,'organizerWorkItems')).length,0);
 const placements=await rows(f.s,'placements');assert.equal(placements.filter(p=>p.topicId===result.id&&p.lifecycle==='active').length,257);assert.equal(placements.filter(p=>p.topicId===f.parent.id&&p.lifecycle==='active').length,0);for(const entry of await rows(f.s,'thoughts')){assert.ok(entry.organizationIntents.excluded.includes(f.parent.id));assert.ok(entry.organizationIntents.included.includes(result.id));assert.ok(entry.thoughtText.startsWith('Independent synthetic conclusion'));}
 const undo=await restoreSectionPromotion(f.s,{historyOperationId:result.historyOperationId,side:'before',operationId:op()}),redo=await restoreSectionPromotion(f.s,{historyOperationId:undo.historyOperationId,side:'after',operationId:op()});assert.equal(redo.id,result.id);assert.equal((await rows(f.s,'topics')).length,2);assert.deepEqual(await f.service.rollback(work.workId),{cancelled:false,committed:true});
 t.diagnostic(JSON.stringify({selected:257,assessmentPages,stageBatch:100,preparedMs:Math.round(preparedMs),activationIncludingReadbackMs:Math.round(activationMs),activationTransactionMs:Math.round(activationTransactionMs),activationWrites,activationComplexity:'atomic O(selected Entries)',environment:'Node fake IndexedDB; not native Chrome or product SLO'}));
});

test('TOPIC-04 a 111-Entry explicit subset moves completely without touching the remaining Section',async()=>{
 const f=await promotionFixture({count:113});f.service=promotionService(f,completeAssessment);const work=await confirmed(f,request(f,{entryIds:f.entryIds.slice(0,111)}));assert.equal(work.h.wholeSection,false);while((await f.service.stage(work.workId)).state!=='ready'){}const result=await f.service.activate(work.workId);assert.equal(result.entryIds.length,111);const old=(await rows(f.s,'placements')).filter(p=>p.topicId===f.parent.id&&p.lifecycle==='active');assert.equal(old.length,2);assert.deepEqual(old.map(p=>p.entryId).sort(),f.entryIds.slice(111).sort());
});

for(const scenario of ['unread_tail','forged_digest','changed_source','missing_scope','revoked_tail'])test('TOPIC-04 whole selection refuses '+scenario+' without truncation or partial work',async()=>{
 const f=await promotionFixture({count:101});let calls=0;
 if(scenario==='missing_scope'){await addInput(f,{text:'Last independent contribution for missing scope'});const scope=f.scope.find(s=>s.inputId!==f.scope[0].inputId),e=await derived(f.s,[scope.inputId]),p=await f.s.topic(f.parent.id);await f.s.placeEntry({entryId:e.id,topicId:p.id,sectionId:f.section.sectionId,expectedEntryRevision:e.revision,expectedTopicRevision:p.organizationRevision,operationId:op()});f.scope=f.scope.filter(s=>s.inputId!==scope.inputId);}
 f.service=promotionService(f,async(view,reader)=>{
  calls++;await reader.readPage(0);
  if(scenario==='changed_source'){await f.s.excludeLibrary(f.scope[0].inputId,true);await reader.readPage(1);}
  else if(scenario==='revoked_tail'){f.permission.allowed=false;await reader.readPage(1);}
  else if(scenario!=='unread_tail')for(let index=1;index<reader.pageCount;index++)await reader.readPage(index);
  return {...decide(view),selection:{kind:view.selection,count:view.manifest.count,manifestDigest:scenario==='forged_digest'?'0'.repeat(64):view.manifest.digest,necessary:'all_selected_placements'}};
 });
 await assert.rejects(f.service.prepare(whole(f)));assert.equal((await rows(f.s,'topics')).length,1);assert.equal((await rows(f.s,'organizerWorkItems')).length,0);if(scenario==='missing_scope')assert.equal(calls,0);
});

test('TOPIC-04 complete selection authorizes more than 100 independent Inputs in bounded exact scopes',async()=>{
 const f=await promotionFixture({count:0});
 for(let i=0;i<103;i++){if(i)await addInput(f,{text:'Independent source '+i});const ids=(await rows(f.s,'inputStates')).map(r=>r.id),used=new Set((await rows(f.s,'dependencies')).map(d=>d.inputId)),input=ids.find(id=>!used.has(id)),e=await derived(f.s,[input],{body:'Synthetic derived '+i}),p=await f.s.topic(f.parent.id);await f.s.placeEntry({entryId:e.id,topicId:p.id,sectionId:f.section.sectionId,expectedEntryRevision:e.revision,expectedTopicRevision:p.organizationRevision,operationId:op()});f.entryIds.push(e.id);}
 f.scope=(await rows(f.s,'inputStates')).map(row=>({inputId:row.id,role:'primary',selectedFields:['body']}));const calls=[];f.service=promotionService(f,completeAssessment,{resolveProcessing:async(_t,r)=>{calls.push(r.inputIds.length);assert.ok(r.inputIds.length<=100);return {...f.permission,inputIds:[...r.inputIds],topicIds:[...r.topicIds]};}});
 const work=await confirmed(f,whole(f));while((await f.service.stage(work.workId)).state!=='ready'){}const result=await f.service.activate(work.workId);assert.equal(result.entryIds.length,103);assert.equal(result.scope.length,103);assert.equal(Math.max(...calls),100);assert.equal((await rows(f.s,'topics')).length,2);
});

for(const selection of ['whole_section','explicit_entries'])test('TOPIC-04 mixed '+selection+' preserves an independently authored Entry without inventing Source lineage',async()=>{
 const f=await promotionFixture({count:2}),created=await f.s.createEntry({operationId:op(),actor:'user',body:'Independently authored human Thought, verbatim.',type:'idea',formation:'explicit',evidence:[]}),p=await f.s.topic(f.parent.id);await f.s.placeEntry({entryId:created.id,topicId:p.id,sectionId:f.section.sectionId,expectedEntryRevision:created.revision,expectedTopicRevision:p.organizationRevision,operationId:op()});f.entryIds.push(created.id);const before=await raw(f.s,'thoughts',created.id),facts=await Promise.all(['records','blocks','provenance','dependencies'].map(t=>rows(f.s,t)));let sawAuthored=false;
 f.service=promotionService(f,async(view,reader)=>{for(let i=0;i<reader.pageCount;i++){const page=await reader.readPage(i),entry=page.entries.find(e=>e.id===created.id);if(entry){sawAuthored=true;assert.equal(entry.evidenceKind,'independent_user_entry');assert.equal(entry.body,before.thoughtText);assert.deepEqual(entry.sourceRecordIds,[]);assert.deepEqual(entry.dependencies,[]);assert.equal(page.inputs.some(x=>x.id===created.id),false);}}return {...decide(view),selection:{kind:view.selection,count:view.manifest.count,manifestDigest:view.manifest.digest,necessary:'all_selected_placements'}};});
 const work=await confirmed(f,selection==='whole_section'?whole(f):request(f));assert.equal(work.h.lineage.contributions,1);assert.equal(sawAuthored,true);await f.service.stage(work.workId);const result=await f.service.activate(work.workId),after=await raw(f.s,'thoughts',created.id);assert.equal(result.entryIds.length,3);assert.equal(after.thoughtText,before.thoughtText);assert.equal(after.bodyBinding,before.bodyBinding);assert.deepEqual(after.sourceRecordIds,[]);assert.deepEqual(after.inputRefs,[]);assert.deepEqual(await Promise.all(['records','blocks','provenance','dependencies'].map(t=>rows(f.s,t))),facts);
 const undo=await restoreSectionPromotion(f.s,{historyOperationId:result.historyOperationId,side:'before',operationId:op()});await restoreSectionPromotion(f.s,{historyOperationId:undo.historyOperationId,side:'after',operationId:op()});assert.equal((await f.s.entry(created.id)).body,before.thoughtText);assert.equal((await rows(f.s,'thoughts')).filter(e=>e.id===created.id).length,1);
});

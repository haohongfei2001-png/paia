import test from 'node:test';
import assert from 'node:assert/strict';
import {semanticMaterialSnapshot,createMaterialSemanticIndex} from '../experiments/semantic-material-snapshot.mjs';
import {completeFixture,rows} from './harness/original-complete.mjs';
import {MemoryService} from '../core/memory/service.js';
import {inputEdit,derived} from './harness/thought-m1.mjs';
import {BackupService} from './harness/historical-backup.mjs';
import {AI_FIELDS} from '../core/organizer/ai-contract.js';
const model={id:'synthetic-local-encoder',revision:'a'.repeat(40),dimension:2};
const op=()=>crypto.randomUUID();
async function setup(texts=['SNAPSHOT 原话否定：没有批准。','SNAPSHOT 引用不等于信念。','SNAPSHOT long '+('完整多段 👩🏽‍💻\n'.repeat(1000))+'FULL_END']){
 const f=await completeFixture({texts});await f.s.finishFoundation();const memory=new MemoryService(f.s);await memory.ready();
 const records=await rows(f.s,'records'),all=(await rows(f.s,'blocks')).map(x=>x.value);
 const blocks=texts.map(text=>all.find(b=>records.find(r=>r.id===b.originalTextReference)?.value.originalText===text));
 assert.ok(blocks.every(Boolean));assert.equal(new Set(blocks.map(b=>b.id)).size,texts.length);
 return {...f,memory,blocks,texts};
}
const authority=async s=>Object.fromEntries(await Promise.all([
 'times','records','recordIndex','blocks','inputStates','dependencies','tombstones','thoughts','topics','placements','meta'
].map(async name=>[name,await rows(s,name)])));
async function topicEntry(f,name,body){
 const topic=await f.s.createTopic({name,operationId:op()}),entry=await f.s.createEntry({
  actor:'user',body,type:'idea',formation:'explicit',evidence:[],operationId:op()});
 const current=await f.s.topic(topic.id);await f.s.placeEntry({topicId:topic.id,entryId:entry.id,
  expectedEntryRevision:entry.revision,expectedTopicRevision:current.organizationRevision,operationId:op()});
 return {topic,entry};
}
test('CPV1-07 actual snapshot crosses every Input page and preserves all full current bodies',async()=>{
 const texts=Array.from({length:213},(_,i)=>'SNAPSHOT_PAGE_'+i+' '+('完整原话 👩🏽‍💻\n'.repeat(i===212?1000:3))+'FULL_END');
 const f=await setup(texts),before=await authority(f.s);
 let policyReads=0;const actual=f.memory.state.bind(f.memory);f.memory.state=async t=>{policyReads++;return actual(t);};
 const value=await semanticMaterialSnapshot(f.memory,{types:['input']});
 assert.equal(value.items.length,213);assert.deepEqual(new Set(value.items.map(x=>x.body)),new Set(texts));
 assert.equal(value.items.find(x=>x.ref.id===f.blocks[212].id).body,texts[212]);
 assert.equal(policyReads,1);assert.equal(value.items.every(x=>x.ref.kind==='input'&&x.ref.revision===0&&x.time===null),true);
 assert.deepEqual(await authority(f.s),before);assert.equal(f.requests.length,0);
});
test('CPV1-07 actual current and historical snapshots never replace originals with rewrites or revive empty work',async()=>{
 const f=await setup(),originals=await rows(f.s,'records');
 await inputEdit(f.s,f.blocks[0].id,{libraryText:'SNAPSHOT_WORKED 新表达不是历史原话。'});
 await inputEdit(f.s,f.blocks[1].id,{libraryText:''});
 const before=await authority(f.s),current=await semanticMaterialSnapshot(f.memory,{types:['input']}),
 history=await semanticMaterialSnapshot(f.memory,{mode:'history',types:['input']});
 assert.equal(current.items.length,2);assert.equal(history.items.length,3);
 assert.equal(current.items.find(x=>x.ref.id===f.blocks[0].id).body,'SNAPSHOT_WORKED 新表达不是历史原话。');
 assert.equal(current.items.find(x=>x.ref.id===f.blocks[0].id).ref.revision,1);
 assert.equal(current.items.some(x=>x.ref.id===f.blocks[1].id),false);
 for(let i=0;i<3;i++){const x=history.items.find(x=>x.ref.id===f.blocks[i].id);
  assert.equal(x.body,f.texts[i]);assert.equal(x.ref.kind,'source');assert.equal(x.ref.sourceId,f.blocks[i].originalTextReference);
  assert.equal(x.ref.revision,0);}
 assert.notEqual(current.scope,history.scope);assert.deepEqual(await rows(f.s,'records'),originals);
 assert.deepEqual(await authority(f.s),before);assert.equal(f.requests.length,0);
});
test('CPV1-07 actual snapshot applies source, known-date and Conversation scope before encoding',async()=>{
 const f=await setup();
 await f.s.foundationWrite(async t=>{
  for(let i=0;i<f.blocks.length;i++){const id=f.blocks[i].originalTextReference,record=await t.get('records',id),index=await t.get('recordIndex',id);
   record.value.platform=i===1?'claude':'chatgpt';index.platform=record.value.platform;
   const time=i===0?'2024-03-01T00:00:00Z':i===1?'2025-01-01T00:00:00Z':null;
   record.value.sourceSentAt=time;index.sourceSentAt=time;await t.put('records',record);await t.put('recordIndex',index);}
 });
 const before=await authority(f.s);
 const dated=await semanticMaterialSnapshot(f.memory,{source:'chatgpt',dateFrom:'2024-01-01',to:'2024-12-31',types:['input']});
 assert.deepEqual(dated.items.map(x=>x.ref.id),[f.blocks[0].id]);assert.equal(dated.items[0].source,'chatgpt');
 const other=await semanticMaterialSnapshot(f.memory,{source:'claude',types:['input']});
 assert.deepEqual(other.items.map(x=>x.ref.id),[f.blocks[1].id]);
 const conversation=await semanticMaterialSnapshot(f.memory,{documentId:f.blocks[0].documentId,types:['input']});
 assert.equal(conversation.items.length,3);
 assert.equal((await semanticMaterialSnapshot(f.memory,{documentId:'different-owned-document',types:['input']})).items.length,0);
 assert.deepEqual(await authority(f.s),before);assert.equal(f.requests.length,0);
});
test('CPV1-07 actual storage factory excludes denied, removed, hidden and purged material before encoder calls',async()=>{
 const f=await setup(['DENIED_SNAPSHOT_CANARY','REMOVED_SNAPSHOT_CANARY','HIDDEN_SNAPSHOT_CANARY','PURGED_SNAPSHOT_CANARY','VISIBLE_SNAPSHOT_CANARY']);
 await f.memory.exclude({inputId:f.blocks[0].id,excluded:true});
 await inputEdit(f.s,f.blocks[1].id,{excluded:true});
 await f.s.foundationWrite(async t=>{const row=await t.get('recordIndex',f.blocks[2].originalTextReference);row.hidden=true;await t.put('recordIndex',row);});
 await f.s.permanentDelete(f.blocks[3].originalTextReference);
 const before=await authority(f.s),calls=[],index=createMaterialSemanticIndex(f.memory,{
  model,scope:{types:['input']},encode:async(kind,value)=>{calls.push({kind,value:structuredClone(value)});return [1,0];}});
 assert.equal((await index.synchronize()).ok,true);assert.equal(index.status().indexed,1);
 assert.deepEqual(calls.map(x=>x.value.body),['VISIBLE_SNAPSHOT_CANARY']);
 assert.equal((await index.lookup('diagnostic')).items[0].ref.id,f.blocks[4].id);
 assert.deepEqual(await authority(f.s),before);assert.equal(f.requests.length,0);
});
test('CPV1-07 actual Thought and saved AI fields retain distinct refs, locations and complete text',async()=>{
 const f=await setup(),a=await topicEntry(f,'SNAPSHOT_TOPIC_A','THOUGHT_SNAPSHOT_A'),b=await topicEntry(f,'SNAPSHOT_TOPIC_B','THOUGHT_SNAPSHOT_B');
 const fields=Object.fromEntries(AI_FIELDS.map(field=>[field,['blockSummary','currentView'].includes(field)?'':[]]));
 await f.s.foundationWrite(t=>t.put('meta',{id:'aiPresentation:'+a.topic.id,topicId:a.topic.id,revision:0,
  updatedAt:'2026-09-26T00:00:00Z',...fields,blockSummary:'AI_SUMMARY_CANARY',currentView:'AI_VIEW_CANARY',
  evidenceEntryIds:[a.entry.id]}));
 const before=await authority(f.s),snapshot=await semanticMaterialSnapshot(f.memory,{topicId:a.topic.id,types:['thought','ai']});
 assert.equal(snapshot.items.length,3);
 const thought=snapshot.items.find(x=>x.ref.kind==='thought');assert.equal(thought.ref.id,a.entry.id);
 assert.equal(thought.body,'THOUGHT_SNAPSHOT_A');assert.equal(thought.locations[0].topicId,a.topic.id);
 assert.deepEqual(new Set(snapshot.items.filter(x=>x.ref.kind==='ai').map(x=>x.ref.field)),new Set(['blockSummary','currentView']));
 assert.equal(snapshot.items.some(x=>x.ref.id===b.entry.id),false);
 assert.equal((await semanticMaterialSnapshot(f.memory,{mode:'history',types:['thought','ai']})).items.length,0);
 assert.deepEqual(await authority(f.s),before);assert.equal(f.requests.length,0);
 await f.memory.exclude({entryId:a.entry.id,excluded:true});
 const denied=await semanticMaterialSnapshot(f.memory,{topicId:a.topic.id,types:['thought','ai']});
 assert.equal(denied.items.length,0,'denied evidence also removes every saved AI field');
});
test('CPV1-07 actual Topic scope follows provenance while exclusion and edits invalidate a derived generation',async()=>{
 const f=await setup(),entry=await derived(f.s,[f.blocks[0].id],{body:'DERIVED_SNAPSHOT_CANARY'});
 const topic=await f.s.createTopic({name:'DERIVED_SNAPSHOT_TOPIC',operationId:op()}),current=await f.s.topic(topic.id);
 await f.s.placeEntry({topicId:topic.id,entryId:entry.id,expectedEntryRevision:entry.revision,
  expectedTopicRevision:current.organizationRevision,operationId:op()});
 const scoped=await semanticMaterialSnapshot(f.memory,{topicId:topic.id,types:['input']});
 assert.deepEqual(scoped.items.map(x=>x.ref.id),[f.blocks[0].id]);
 assert.equal(scoped.items[0].locations[0].topicId,topic.id);
 const calls=[],index=createMaterialSemanticIndex(f.memory,{model,scope:{types:['input']},
  encode:async(kind,value)=>{calls.push({kind,value:structuredClone(value)});return [1,0];}});
 assert.equal((await index.synchronize()).ok,true);
 await inputEdit(f.s,f.blocks[2].id,{libraryText:'UPDATED_SNAPSHOT_CANARY'});
 assert.equal((await index.lookup('diagnostic')).reason,'index_incomplete');assert.equal(index.status().indexed,2);
 await index.synchronize();assert.equal(calls.filter(x=>x.kind==='document').length,4);
 await f.memory.exclude({inputId:f.blocks[0].id,excluded:true});
 const result=await index.lookup('diagnostic');assert.equal(result.items.length,2);
 assert.equal(result.items.some(x=>x.ref.id===f.blocks[0].id),false);
 assert.equal(calls.filter(x=>x.kind==='document').length,4);assert.equal(f.requests.length,0);
});
test('CPV1-07 snapshot refuses partial capacity and invalid filters before any encoding',async()=>{
 const f=await setup(),calls=[],before=await authority(f.s);
 const index=createMaterialSemanticIndex(f.memory,{model,maxItems:2,scope:{types:['input']},
  encode:async(...args)=>{calls.push(args);return [1,0];}});
 assert.equal((await index.synchronize()).ok,false);assert.equal(index.status().indexed,0);assert.equal(calls.length,0);
 for(const options of [{mode:'PRIVATE_UNKNOWN_CANARY'},{types:['input','input']},{types:[]},
  {includeRemoved:true},{includeFiltered:true},{dateFrom:'2026-02-30'},{dateFrom:'2026-01-02',to:'2026-01-01'}])
  await assert.rejects(semanticMaterialSnapshot(f.memory,options),/^Error: semantic_snapshot_unavailable$/);
 assert.deepEqual(await authority(f.s),before);assert.equal(f.requests.length,0);
});
test('CPV1-07 storage snapshot errors do not echo private source or adapter exceptions',async()=>{
 const f=await setup(),before=await authority(f.s);
 f.memory.state=async()=>{throw Error('PRIVATE_SNAPSHOT_STATE_CANARY');};
 await assert.rejects(semanticMaterialSnapshot(f.memory),/^Error: semantic_snapshot_unavailable$/);
 assert.deepEqual(await authority(f.s),before);assert.equal(f.requests.length,0);
});

test('CPV1-07 actual exclusion during asynchronous encoding refuses the staged snapshot',async()=>{
 const f=await setup();let start,release;
 const entered=new Promise(resolve=>{start=resolve;}),gate=new Promise(resolve=>{release=resolve;});
 let first=true;
 const index=createMaterialSemanticIndex(f.memory,{model,scope:{types:['input']},encode:async()=>{
  if(first){first=false;start();await gate;}return [1,0];}});
 const build=index.synchronize();await entered;
 await f.memory.exclude({inputId:f.blocks[0].id,excluded:true});
 const after=await authority(f.s);release();
 const result=await build;assert.equal(result.ok,false);assert.equal(result.reason,'authority_changed');
 assert.equal(index.status().indexed,0);
 assert.equal((await index.lookup('diagnostic')).usedSemantic,false);
 assert.deepEqual(await authority(f.s),after);assert.equal(f.requests.length,0);
});

const timeEvidence=createTime=>({state:'valid',createTime,updateTime:null});
async function repeatSource(f,kind,evidence){
 const record=(await rows(f.s,'records'))[0].value;
 const request={epoch:(await f.s.status()).epoch,adapterVersion:'0.3.0',
  chat:{id:record.chatId,url:record.chatUrl,...(kind==='capture'?{title:record.chatTitle}:{})},
  messages:[{sourceMessageId:record.sourceMessageId,pageOrder:record.pageOrder,
   ...(kind==='capture'?{originalText:record.originalText}:{}),sourceTime:evidence}]};
 return f.s[kind](request);
}
for(const kind of ['capture','enrich'])test('CPV1-07 repeated '+kind+' preserves complete time evidence, staged index and active backup',async()=>{
 const f=await setup(['IDEMPOTENT_TIME '+('完整多段 👩🏽‍💻\n'.repeat(1000))+'FULL_END']);
 await repeatSource(f,'enrich',timeEvidence(1577836800));
 const backup=new BackupService(f.s),session=await backup.beginExport();
 const before=await authority(f.s),calls=[];
 const index=createMaterialSemanticIndex(f.memory,{model,scope:{types:['input']},
  encode:async(encodeKind,value)=>{calls.push({kind:encodeKind,value:structuredClone(value)});
   if(encodeKind==='document')for(let i=0;i<3;i++){
    const repeat=await repeatSource(f,kind,timeEvidence(1577836800));
    if(kind==='capture'){assert.equal(repeat.added,0);assert.equal(repeat.duplicates,1);}
    else assert.equal(repeat.enriched,0);
   }
   return [1,0];}});
 const built=await index.synchronize();assert.equal(built.ok,true,JSON.stringify(built));
 assert.equal(built.coverage.indexed,1);assert.equal(calls.filter(x=>x.kind==='document').length,1);
 assert.equal(calls[0].value.body,f.texts[0]);assert.deepEqual(await authority(f.s),before);
 const found=await index.lookup('synthetic query');assert.equal(found.usedSemantic,true);
 assert.equal(found.items[0].body,f.texts[0]);assert.equal(found.items[0].time,'2020-01-01T00:00:00.000Z');
 const exported=[session.header];let sequence=0;
 for(;;){const page=await backup.exportPage({sessionId:session.sessionId,sequence:sequence++});
  exported.push(...page.items);if(page.done)break;}
 assert.equal(exported.at(-1).type,'footer');
 assert.equal(exported.find(x=>x.section==='sources').value.originalText,f.texts[0]);
 assert.equal(exported.find(x=>x.section==='timeEvidence').value.value.createTime,1577836800);
 assert.deepEqual(await authority(f.s),before);assert.equal(f.requests.length,0);
});
for(const conflict of [false,true])test('CPV1-07 '+(conflict?'conflicting':'new')+' time evidence persists and fences an in-flight index and export',async()=>{
 const f=await setup(['REAL_TIME_CHANGE complete 原话不是指令。']);
 if(conflict)await repeatSource(f,'enrich',timeEvidence(1577836800));
 const backup=new BackupService(f.s),session=await backup.beginExport(),before=await authority(f.s);
 const original=before.records[0].value;
 let enter,release;const entered=new Promise(resolve=>{enter=resolve;}),gate=new Promise(resolve=>{release=resolve;});
 const index=createMaterialSemanticIndex(f.memory,{model,scope:{types:['input']},
  encode:async()=>{enter();await gate;return [1,0];}});
 const pending=index.synchronize();await entered;
 await repeatSource(f,'enrich',timeEvidence(conflict?1577836860:1577836800));
 const after=await authority(f.s);
 assert.equal(after.meta.find(x=>x.id==='backup-data-generation').value,
  before.meta.find(x=>x.id==='backup-data-generation').value+1);
 assert.notDeepEqual(after.times,before.times);
 assert.equal(after.records[0].value.originalText,original.originalText);
 assert.equal(after.records[0].value.capturedAt,original.capturedAt);
 assert.equal(after.records.length,1);assert.equal(after.blocks.length,1);
 if(conflict){
  assert.equal(after.times[0].value.blocked,true);assert.equal(after.times[0].value.createTime,null);
  assert.deepEqual(after.records,before.records,'conflict evidence must not rewrite existing high-confidence Source');
 }else{
  assert.equal(after.times[0].value.createTime,1577836800);
  assert.equal(after.records[0].value.sourceSentAt,'2020-01-01T00:00:00.000Z');
 }
 release();const result=await pending;
 assert.equal(result.ok,false);assert.equal(result.reason,'authority_changed');assert.equal(index.status().indexed,0);
 await assert.rejects(backup.exportPage({sessionId:session.sessionId,sequence:0}),error=>error?.code==='BACKUP_CHANGED');
 // Re-observing this complete ledger (including a blocked conflict) is idempotent.
 await repeatSource(f,'capture',timeEvidence(conflict?1577836860:1577836800));
 await repeatSource(f,'enrich',timeEvidence(conflict?1577836860:1577836800));
 assert.deepEqual(await authority(f.s),after);assert.equal(f.requests.length,0);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBObjectStore} from './vendor/fake-indexeddb/build/esm/index.js';
import {setup,derived,capture} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {PromptReuseService} from '../core/prompt-reuse-service.js';
import {key} from '../core/memory/model.js';
import {projectPromptFamilies} from '../core/prompt-family.js';
import {ArchiveError} from '../core/constants.js';

async function fixture(t){
 const {s}=await setup(OrganizerStore);await s.finishFoundation();
 await s.repository.transaction(true,async tx=>{const row=await tx.get('meta','smart-filter');await tx.put('meta',{...row,mode:'off'});});
 const service=new PromptReuseService(s,{clock:()=>1800000000000});
 const data=await s.repository.transaction(false,async tx=>({inputs:await tx.all('inputStates'),blocks:await tx.all('blocks'),records:await tx.all('records'),indexes:await tx.all('recordIndex')}));
 assert.equal(data.inputs.length,1);assert.equal(data.records.length,1);
 t.after(()=>s.repository.close());return {s,service,...data,id:data.inputs[0].id};
}
async function edit(f,store,id,change){await f.s.repository.transaction(true,async t=>{const row=await t.get(store,id);await t.put(store,change(row));});}
async function countReads(fn){
 const original=IDBObjectStore.prototype.get,counts={};
 IDBObjectStore.prototype.get=function(...args){counts[this.name]=(counts[this.name]||0)+1;return original.apply(this,args);};
 try{return {value:await fn(),counts};}finally{IDBObjectStore.prototype.get=original;}
}
test('one original Input uses only two Source/index reads and no unused document metadata reads',async t=>{
 const f=await fixture(t),{value,counts}=await countReads(()=>f.service.snapshot());
 assert.equal(value.inputs.length,1);assert.equal(value.inputs[0].text,f.records[0].value.originalText);
 t.diagnostic(JSON.stringify({counts,inputs:value.inputs.length}));
 assert.equal(counts.records,2);assert.equal(counts.recordIndex,2);
 assert.equal(counts.libraryDocuments||0,0);assert.equal(counts.documents||0,0);
});
test('manual order and complete Family identity/text/score retain the original projection',async t=>{
 const f=await fixture(t);let q=await f.service.query();
 await f.service.change({action:'create',revision:q.revision,text:'Second synthetic manual expression'});
 q=await f.service.query();await f.service.change({action:'create',revision:q.revision,text:'First synthetic manual expression'});
 q=await f.service.query();await f.service.change({action:'pin',revision:q.revision,id:q.items[1].id});
 const snapshot=await f.service.snapshot(),actual=await f.service.query({includeHidden:true});
 const expected=await projectPromptFamilies(snapshot.inputs,snapshot.preferences,1800000000000);
 assert.deepEqual(snapshot.families,expected);assert.equal(actual.generation,snapshot.generation);
 assert.deepEqual(actual.manualOrder,snapshot.preferences.pins);
 assert.deepEqual(actual.items,expected.filter(x=>x.useful||x.pinned||x.edited||x.retained));
});
for(const [name,mutate] of [
 ['blank Working body',f=>edit(f,'blocks',f.id,r=>({...r,value:{...r.value,libraryText:'  \n '}}))],
 ['excluded block',f=>edit(f,'blocks',f.id,r=>({...r,value:{...r.value,excluded:true}}))],
 ['removed Input',f=>edit(f,'inputStates',f.id,r=>({...r,removalState:'removed'}))],
 ['purged Source marker',f=>edit(f,'inputStates',f.id,r=>({...r,sourcePurged:true}))],
 ['contrary Source role',f=>edit(f,'records',f.records[0].id,r=>({...r,value:{...r.value,role:'assistant'}}))],
 ['contrary author role',f=>edit(f,'records',f.records[0].id,r=>({...r,value:{...r.value,author:{role:'assistant'}}}))],
 ['contrary authorship',f=>edit(f,'records',f.records[0].id,r=>({...r,value:{...r.value,authorship:'assistant'}}))],
 ['contrary Input role',f=>edit(f,'blocks',f.id,r=>({...r,value:{...r.value,role:'assistant'}}))],
 ['Source tombstone',async f=>{const ix=f.indexes[0];await f.s.repository.transaction(true,t=>t.put('tombstones',{id:'source:'+ix.sourceKey}));}],
 ['snapshot tombstone',async f=>{const ix=f.indexes[0];await f.s.repository.transaction(true,t=>t.put('tombstones',{id:'snapshot:'+ix.dedupeKey}));}],
 ['Input memory veto',f=>f.s.repository.transaction(true,t=>t.put('meta',{id:key('input',f.id),kind:'input',version:1,inputId:f.id,excluded:true}))],
 ])test('original eligibility still excludes '+name,async t=>{const f=await fixture(t);assert.equal((await f.service.snapshot()).inputs.length,1);await mutate(f);assert.equal((await f.service.snapshot()).inputs.length,0);});
for(const revision of [-1,1.5,'0',null])test('original material reference rejects invalid revision '+JSON.stringify(revision),async t=>{
 const f=await fixture(t);await edit(f,'inputStates',f.id,r=>({...r,contentRevision:revision}));
 await assert.rejects(f.service.snapshot(),e=>e.code==='MEMORY_INVALID');
});
for(const restriction of ['entry','topic','section'])test('derived '+restriction+' memory veto remains complete',async t=>{
 const f=await fixture(t),result=await derived(f.s,[f.id]),entryId=result.id||result.entryId;assert.ok(entryId);
 const topicId=crypto.randomUUID(),sectionId=crypto.randomUUID();
 await f.s.repository.transaction(true,async tx=>{
  await tx.put('topics',{id:topicId,lifecycle:'active',activeLayoutGeneration:1});
  await tx.put('placements',{id:crypto.randomUUID(),entryId,topicId,sectionId,lifecycle:'active',layoutGeneration:1});
  const row=restriction==='entry'?{id:key('entry',entryId),kind:'entry',version:1,entryId,excluded:true}:restriction==='topic'?{id:key('topic','default',topicId),kind:'topic',version:1,profileId:'default',topicId,decision:'denied',layoutGeneration:1}:{id:key('section',topicId,sectionId),kind:'section',version:1,topicId,sectionId,excluded:true};
  await tx.put('meta',row);
 });
 assert.equal((await f.service.snapshot()).inputs.length,0);
 if(restriction!=='entry'){
  await edit(f,'topics',topicId,r=>({...r,activeLayoutGeneration:2}));
  assert.equal((await f.service.snapshot()).inputs.length,1,'inactive placement must not add a new veto');
 }
});
for(const sameConversation of [true,false])test('complete multiple Source chain: same conversation='+sameConversation,async t=>{
 const f=await fixture(t),sourceId=crypto.randomUUID();
 await f.s.repository.transaction(true,async tx=>{
  await tx.put('records',{...f.records[0],id:sourceId,value:{...f.records[0].value,id:sourceId}});
  await tx.put('recordIndex',{...f.indexes[0],id:sourceId,sourceKey:sourceId,dedupeKey:sourceId,sequence:f.indexes[0].sequence+1,...(!sameConversation?{chatKey:'another-conversation'}:{})});
  const row=await tx.get('blocks',f.id);row.value.provenance.push({...row.value.provenance[0],sourceRecordId:sourceId});await tx.put('blocks',row);
 });
 assert.equal((await f.service.snapshot()).inputs.length,sameConversation?1:0);
});
test('final generation fence still refuses a write after the page completes',async t=>{
 const f=await fixture(t),original=f.s.run;let writes=0;
 f.s.run=async function(...args){const value=await original.apply(this,args);if(!writes&&value?.prefs&&Array.isArray(value.items)){writes++;await this.setFilterTask('idle');}return value;};
 try{await assert.rejects(f.service.snapshot(),e=>e.code==='MEMORY_STALE');assert.equal(writes,1);}finally{f.s.run=original;}
 assert.equal((await f.service.snapshot()).inputs.length,1);
});
test('original deterministic Filter hides a control and original Keep restores its reuse qualification',async t=>{
 const f=await fixture(t),request=capture((await f.s.status()).epoch,'second-original-control','continue');
 request.messages[0].presence={version:1,attachment:'absent',reference:'absent',confidence:'verified'};
 await f.s.capture(request);await f.s.finishFoundation();
 const before=await f.service.snapshot(),control=before.inputs.find(x=>x.text==='continue');assert.ok(control);
 await f.s.repository.transaction(true,async tx=>{const row=await tx.get('meta','smart-filter');await tx.put('meta',{...row,mode:'light'});});
 await f.s.evaluateFilters({limit:50});
 assert.ok(!(await f.service.snapshot()).inputs.some(x=>x.id===control.id));
 await f.s.keepInput(control.id);assert.ok((await f.service.snapshot()).inputs.some(x=>x.id===control.id&&x.text==='continue'));
});
for(const code of ['MEMORY_DENIED','MEMORY_UNAVAILABLE'])test('pre-material Filter refusal '+code+' rejects the whole query',async t=>{
 const f=await fixture(t),original=f.s.isFiltered;f.s.isFiltered=async()=>{throw new ArchiveError(code);};
 try{await assert.rejects(f.service.query(),e=>e.code===code);}finally{f.s.isFiltered=original;}
});

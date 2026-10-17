import test from 'node:test';
import assert from 'node:assert/strict';
import {setup} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {ThoughtLibraryReadModel} from '../core/thought-library-read-model.js';
import {ThoughtSectionReading} from '../core/thought-section-reading.js';
import {TopicController} from '../ui/topic-workspace.js';
import {STORAGE_KEY} from '../core/constants.js';
import {formPreGatePurgeState} from './fixtures/pre-b02-purge-state.mjs';
const op=()=>crypto.randomUUID();
async function fixture(change,{sourceLinked=false}={}){
 const f=await setup(OrganizerStore);await f.s.finishFoundation();const {s}=f;
 const topic=await s.createTopic({name:'SYNTHETIC handoff qualification',operationId:op()});
 const section=await s.createSection({topicId:topic.id,title:'SYNTHETIC selected',expectedTopicRevision:(await s.topic(topic.id)).organizationRevision,operationId:op()});
 const sibling=await s.createSection({topicId:topic.id,title:'SYNTHETIC sibling',expectedTopicRevision:(await s.topic(topic.id)).organizationRevision,operationId:op()});
 const input=sourceLinked?(await s.snapshot()).library.blocks[0]:null;
 const entry=await s.continueThinking({topicId:topic.id,sectionId:section.sectionId,body:'SYNTHETIC acknowledged text',...(input?{inputId:input.id}:{}),operationId:op()});
 const reader=new ThoughtSectionReading(new ThoughtLibraryReadModel(s)),options={topicId:topic.id,scopeSectionId:section.sectionId,sort:'asc',query:'',limit:1},before=await reader.page({...options,anchorId:entry.id});
 if(change){const placement=await s.libraryPlacement(topic.id,entry.id),result=await s.placeEntry({entryId:entry.id,topicId:topic.id,expectedEntryRevision:(await s.entry(entry.id)).revision,expectedTopicRevision:(await s.topic(topic.id)).organizationRevision,expectedPlacementRevision:placement.revision,...(change==='move'?{sectionId:sibling.sectionId}:{remove:true}),operationId:op()});assert.notEqual(result.conflict,true);}
 const page=await reader.page(options),editor={entry:{protectedIds:()=>new Set()}},field={isConnected:true},handoff={id:entry.id,field,owner:editor,topicId:topic.id,sectionId:section.sectionId,authority:before.authority,recoveryEpoch:before.recoveryEpoch};
 const owner=Object.assign(Object.create(TopicController.prototype),{id:topic.id,activeSectionId:section.sectionId,editor,document:page,sectionEndHandoff:handoff});
 return {...f,reader,options,page,owner,handoff,entry,topic,section,sibling,input};
}
async function withOwner(change,run){const previous=Object.getOwnPropertyDescriptor(globalThis,'chrome'),f=await fixture(change),calls=[];let beforeFresh=null;
 globalThis.chrome={runtime:{sendMessage:async message=>{assert.equal(message.type,'GET_LIBRARY_SECTION_READING');assert.equal(message.options.scopeSectionId,f.section.sectionId);if(!message.options.anchorId&&beforeFresh)await beforeFresh();const response=await f.reader.page(message.options);calls.push({options:message.options,response});return {ok:true,data:response};}}};
 try{await run({...f,calls,beforeFresh:fn=>beforeFresh=fn});}finally{await f.s.repository.close();if(previous)Object.defineProperty(globalThis,'chrome',previous);else delete globalThis.chrome;}
}
for(const change of ['move','remove'])test('real '+change+' owner returns partial anchor refusal, then same-authority fresh scope releases only handoff pin',()=>withOwner(change,async f=>{
 assert.equal((await f.s.entry(f.entry.id)).lifecycle,'active','placement removal is distinct from Entry deletion');
 assert.equal(await f.owner.qualifySectionHandoff(f.page,()=>true),true);assert.equal(f.calls.length,2);
 const denial=f.calls[0].response;assert.equal(denial.cursorInvalid,true);assert.equal(denial.anchorUnavailable,true);assert.equal(Object.hasOwn(denial,'recoveryEpoch'),false,'actual refused anchor DTO has no epoch');assert.equal(denial.authority,f.page.authority);
 assert.equal(f.calls[1].response.recoveryEpoch,f.page.recoveryEpoch);assert.equal(f.owner.sectionEndHandoff,null);assert.equal(f.owner.topicProtectedIds().has(f.entry.id),false);
 assert.equal((await f.s.entry(f.entry.id)).body,'SYNTHETIC acknowledged text');
}));
for(const change of ['authority','epoch'])test('real '+change+' change during final scope reread refuses old handoff paint',()=>withOwner('move',async f=>{
 f.beforeFresh(async()=>{if(change==='authority')await f.s.continueThinking({topicId:f.topic.id,sectionId:f.section.sectionId,body:'SYNTHETIC new authority',operationId:op()});else await f.s.foundationWrite(t=>t.put('meta',{id:'recovery-restore-epoch',value:'SYNTHETIC restored epoch'}));});
 await assert.rejects(f.owner.qualifySectionHandoff(f.page,()=>true),/HANDOFF_CHANGED/);assert.equal(f.owner.sectionEndHandoff,f.handoff);assert.equal(f.calls.length,2);assert.equal(f.calls[0].response.anchorUnavailable,true);
 if(change==='authority')assert.notEqual(f.calls[1].response.authority,f.page.authority);else assert.notEqual(f.calls[1].response.recoveryEpoch,f.page.recoveryEpoch);
}));
test('real same-Section handoff renews qualification without widening scope or duplicate Entry creation',()=>withOwner(null,async f=>{
 const before=await f.s.repository.transaction(false,t=>t.all('thoughts'));assert.equal(await f.owner.qualifySectionHandoff(f.page,()=>true),true);assert.equal(f.calls.length,1);assert.equal(f.calls[0].response.items[0].entry.id,f.entry.id);assert.equal(f.owner.sectionEndHandoff,f.handoff);assert.equal(f.owner.topicProtectedIds().has(f.entry.id),true);assert.deepEqual(await f.s.repository.transaction(false,t=>t.all('thoughts')),before);
}));

// GET_LIBRARY_ENTRY's existing worker recoverySnapshot envelope is transport
// decoration, sourced from the real Store epoch before/after its canonical read.
async function readingEntryEnvelope(s,id){const epoch=await s.recoveryDraftEpoch(),row=await s.readingEntry(id);assert.equal(await s.recoveryDraftEpoch(),epoch);return {...row,recoveryEpoch:epoch};}
async function navigationOwner(run,{sourceLinked=false}={}){
 const previous=Object.getOwnPropertyDescriptor(globalThis,'chrome'),f=await fixture(null,{sourceLinked}),canonical=await readingEntryEnvelope(f.s,f.entry.id),pins=new Set(),calls=[];
 const tracked={saved:{body:canonical.body,note:canonical.note,type:canonical.type},local:{body:canonical.body,note:canonical.note,type:canonical.type},revision:canonical.revision};
 const row={dataset:{entryId:canonical.id,sectionId:f.section.sectionId}},field={isConnected:true,dataset:{entryField:'body'},closest:()=>row};
 const entry={entries:new Map([[canonical.id,tracked]]),surface:{composing:false},protectedIds:()=>new Set(pins),journal:{undo:[[{id:canonical.id,field:'body',before:'',after:canonical.body}]],redo:[]}};
 const editor={entry};Object.assign(f.handoff,{field,owner:editor});f.owner.editor=editor;
 let current=true,afterRead=()=>{};
 globalThis.chrome={runtime:{sendMessage:async message=>{
  let data;if(message.type==='GET_LIBRARY_ENTRY'){assert.equal(message.id,canonical.id);data=await readingEntryEnvelope(f.s,message.id);}
  else{assert.equal(message.type,'GET_LIBRARY_SECTION_READING');assert.equal(message.options.scopeSectionId,f.section.sectionId);assert.equal(message.options.anchorId,canonical.id);data=await f.reader.page(message.options);}
  calls.push({message:structuredClone(message),data:structuredClone(data)});await afterRead(message);return {ok:true,data};
 }}};
 try{await run({...f,canonical,tracked,field,editor,entryOwner:entry,pins,calls,current:()=>current,retire:()=>current=false,afterRead:fn=>afterRead=fn});}
 finally{await f.s.repository.close();if(previous)Object.defineProperty(globalThis,'chrome',previous);else delete globalThis.chrome;}
}
async function durableRows(s){return s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all(['thoughts','placements','operationReceipts','revisions'].map(async name=>[name,await t.all(name)]))));}

test('real canonical Entry and original Section anchor settle only the temporary navigation pin without writing or cloning an Entry',()=>navigationOwner(async f=>{
 const before=await durableRows(f.s),journal=f.entryOwner.journal;
 assert.equal(await f.owner.settleSectionHandoffForNavigation(f.current),true);
 assert.deepEqual(f.calls.map(call=>call.message.type),['GET_LIBRARY_ENTRY','GET_LIBRARY_SECTION_READING']);
 assert.equal(f.calls[0].data.id,f.entry.id);assert.equal(f.calls[1].data.items[0].entry.id,f.entry.id);assert.equal(f.calls[1].data.authority,f.page.authority);
 assert.equal(f.owner.sectionEndHandoff,null);assert.equal(f.owner.editor,f.editor);assert.equal(f.entryOwner.entries.get(f.entry.id),f.tracked);assert.equal(f.field.isConnected,true);assert.equal(f.entryOwner.journal,journal);assert.equal(journal.undo.length,1);
 assert.deepEqual(await durableRows(f.s),before,'qualification performs no canonical Entry/placement/receipt/history write');
}));

for(const change of ['human edit','move','epoch','historical Source purge after current B02 refusal'])test('real '+change+' refuses clean-looking old ACK navigation without deleting its native owner',()=>navigationOwner(async f=>{
 if(change==='human edit')await f.s.editEntry({id:f.entry.id,expectedRevision:(await f.s.entry(f.entry.id)).revision,changes:{body:'SYNTHETIC newer human canonical text'},operationId:op()});
 else if(change==='move'){const placement=await f.s.libraryPlacement(f.topic.id,f.entry.id);assert.notEqual((await f.s.placeEntry({entryId:f.entry.id,topicId:f.topic.id,sectionId:f.sibling.sectionId,expectedEntryRevision:(await f.s.entry(f.entry.id)).revision,expectedTopicRevision:(await f.s.topic(f.topic.id)).organizationRevision,expectedPlacementRevision:placement.revision,operationId:op()})).conflict,true);}
 else if(change==='epoch')await f.s.foundationWrite(t=>t.put('meta',{id:'recovery-restore-epoch',value:'SYNTHETIC restored epoch'}));
 else{
  assert.ok((await f.s.entry(f.entry.id)).sourceRecordIds.includes(f.input.sourceRecordId),'real independent context lineage carries its actual captured Source');
  const preflight=await f.s.sourcePurgePreflight(f.input.sourceRecordId);assert.equal(preflight.state,'owner_gate_required');assert.equal(preflight.gate,'B-02');
  const complete=async()=>({db:await f.s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all(f.s.repository.stores.map(async name=>[name,await t.all(name)])))),local:await f.storage.get(STORAGE_KEY)}),beforeDenial=await complete();
  await assert.rejects(f.s.permanentDelete(f.input.sourceRecordId),error=>error.code==='SOURCE_PURGE_OWNER_GATE');assert.deepEqual(await complete(),beforeDenial,'current B02 refusal changes no repository or local publication data');
  // Explicit historical compatibility only. This immutable existing fixture
  // forms the old state after current denial/zero-effects have been proven.
  await formPreGatePurgeState.call(f.s,f.input.sourceRecordId,true);
 }
 const before=await durableRows(f.s);assert.equal(await f.owner.settleSectionHandoffForNavigation(f.current),false);assert.equal(f.owner.sectionEndHandoff,f.handoff);assert.equal(f.entryOwner.entries.get(f.entry.id),f.tracked);assert.equal(f.field.isConnected,true);assert.equal(f.entryOwner.journal.undo.length,1);assert.deepEqual(await durableRows(f.s),before);
 if(change==='human edit')assert.equal((await f.s.readingEntry(f.entry.id)).body,'SYNTHETIC newer human canonical text');
 if(change==='move'){assert.equal(f.calls[1].data.anchorUnavailable,true);assert.equal((await f.s.libraryPlacement(f.topic.id,f.entry.id)).sectionId,f.sibling.sectionId);}
},{sourceLinked:change.includes('Source purge')}));

for(const type of ['GET_LIBRARY_ENTRY','GET_LIBRARY_SECTION_READING'])test('a newer native intent after real '+type+' prevents pin consumption and second-owner replay',()=>navigationOwner(async f=>{
 const before=await durableRows(f.s);f.afterRead(message=>{if(message.type===type)f.retire();});
 assert.equal(await f.owner.settleSectionHandoffForNavigation(f.current),false);assert.equal(f.owner.sectionEndHandoff,f.handoff);assert.equal(f.entryOwner.entries.get(f.entry.id),f.tracked);assert.equal(f.field.isConnected,true);assert.equal(f.calls.length,type==='GET_LIBRARY_ENTRY'?1:2);assert.deepEqual(await durableRows(f.s),before);
}));

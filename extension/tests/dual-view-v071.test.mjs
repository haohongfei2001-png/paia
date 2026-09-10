import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,inputEdit,capture} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {OrganizerRunner} from '../core/organizer/runner.js';
import {DeterministicFixtureProvider} from './fixtures/organizer/provider.mjs';
import {SimpleOriginalOrganizerRunner} from '../core/organizer/original-simple.js';

async function seeded(){
 const f=await setup(OrganizerStore),input=(await f.s.snapshot()).library.blocks[0];
 const runner=new OrganizerRunner(f.s,{providers:[new DeterministicFixtureProvider()]});
 await f.s.enqueueOrganizer({operationId:crypto.randomUUID(),specs:[{inputId:input.id,role:'primary',selectedFields:['body']}]});
 await runner.step();const entry=(await f.s.entryPage()).items[0],topic=(await f.s.libraryIndexPage()).items[0];
 return {...f,input,entry,topic};
}

test('v071 original and AI views share Topic/Section/provenance but AI read model is naturally empty',async()=>{
 const f=await seeded();const original=await f.s.topicDocumentPage({topicId:f.topic.id,view:'original'}),ai=await f.s.topicDocumentPage({topicId:f.topic.id,view:'ai'});
 assert.equal(original.topic.id,ai.topic.id);assert.deepEqual(original.sections.map(x=>x.sectionId),ai.sections.map(x=>x.sectionId));assert.equal(original.items.length,1);assert.equal(original.items[0].entry.body,'Synthetic explicit working input');assert.equal(original.items[0].entry.originalSource,true);assert.equal(original.items[0].entry.originalInputId,f.input.id);assert.equal(ai.items.length,0);assert.equal(ai.viewState,'not_updated');
 const provenance=await f.s.libraryProvenance(f.entry.id);assert.equal(provenance.items[0].inputId,f.input.id);
});

test('v071 delta checkpoints remain independent until v072b successfully commits an Original Organizer batch',async()=>{
 const f=await seeded();let status=await f.s.dualViewStatus();assert.equal(status.original.counts.addedInput,1);assert.equal(status.ai.counts.addedInput,1);
 const provider={describe:()=>({providerId:'fixture',adapterVersion:'1',capabilityVersion:1,modelVersion:'deterministic-1',executionKind:'fixture',supportedTaskSchemas:['organize.v1'],credentialRequirement:'opaque'}),supportsTask:kind=>kind==='original_classification',async execute(request){return {items:request.inputs.map(input=>({inputRef:input.ref,topic:{proposedName:'Synthetic topic'},section:{},type:'idea',relatedGroupingCandidate:null,spans:[],uncertain:false})),invalidItems:[]};}},credentials={acquire:async()=>({status:'ready',handle:'fixture'}),revoke(){}};await new SimpleOriginalOrganizerRunner(f.s,{provider,credentials}).wake();status=await f.s.dualViewStatus();assert.equal(status.original.counts.addedInput,0);assert.equal(status.ai.counts.addedInput,1);
 await inputEdit(f.s,f.input.id,{libraryText:'Changed synthetic input'});status=await f.s.dualViewStatus();assert.equal(status.original.counts.changedInput,1);assert.equal(status.ai.counts.addedInput,1);await f.s.setOriginalAutoUpdate(false);assert.equal((await f.s.dualViewStatus()).original.autoUpdate,false);assert.equal(await f.s.autoUpdateOriginalView(),null);
});

test('v071 delta preview exposes counts/size only and preserves user field protection',async()=>{
 const f=await seeded();const e=await f.s.entry(f.entry.id);await f.s.editEntry({id:e.id,expectedRevision:e.revision,operationId:crypto.randomUUID(),changes:{title:'User protected title'}});await f.s.capture(capture((await f.s.status()).epoch,'v071-added','New synthetic evidence'));
 const preview=await f.s.previewAIDelta();assert.equal(preview.view,'ai');assert.ok(preview.counts.addedInput>=2);assert.ok(preview.approximateContentBytes>0);assert.ok(!JSON.stringify(preview).includes('Synthetic explicit working input'));assert.ok(!JSON.stringify(preview).includes('New synthetic evidence'));const after=await f.s.entry(e.id);assert.equal(after.protections.title.locked,true);
});

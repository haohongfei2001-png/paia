import test from 'node:test';
import assert from 'node:assert/strict';
import {completeFixture,rows} from './harness/original-complete.mjs';
import {MemoryService} from '../core/memory/service.js';
import {PassportService} from '../core/passport.js';
import {ContextPackageService} from '../core/context-package-service.js';
import {hashText} from '../core/dedupe.js';
const op=()=>crypto.randomUUID();
async function setup(texts=['EXPLICIT_FIXED_CANARY','SUPPLEMENT_QUERY_NEEDLE']){
 const f=await completeFixture({texts}),memory=new MemoryService(f.s),service=new ContextPackageService(memory,new PassportService(f.s));await memory.ready();
 const records=await rows(f.s,'records'),blocks=(await rows(f.s,'blocks')).map(r=>r.value).sort((a,b)=>texts.indexOf(records.find(r=>r.id===a.originalTextReference).value.originalText)-texts.indexOf(records.find(r=>r.id===b.originalTextReference).value.originalText)),refs=blocks.map(b=>({kind:'input',id:b.id,revision:b.revision}));
 let state=await service.manual({action:'create'},'retrieval-tab');
 return {...f,memory,service,blocks,refs,get state(){return state;},async call(action,options={}){const next=await service.manual({action,selectionId:state.selectionId,generation:state.generation,...options},'retrieval-tab');state=next;return next;}};
}
async function topicEntry(f,name,body){
 const topic=await f.s.createTopic({name,operationId:op()}),entry=await f.s.createEntry({actor:'user',body,type:'idea',formation:'explicit',evidence:[],operationId:op()});
 const current=await f.s.topic(topic.id);await f.s.placeEntry({topicId:topic.id,entryId:entry.id,expectedEntryRevision:entry.revision,expectedTopicRevision:current.organizationRevision,operationId:op()});
 return {topic,entry};
}
test('VS06 task retrieval retains irrelevant explicit material and records only explicitly admitted optional supplements',async()=>{
 const f=await setup();await f.memory.settings({includeUnorganizedInputs:true});
 const explicit=f.refs[0];
 await f.call('add',{refs:[explicit]});await f.call('preview');const original=f.state.items[0],digest=f.state.manifest.previewSha256;
 const offered=await f.call('suggest',{query:'SUPPLEMENT_QUERY_NEEDLE'});
 assert.equal(offered.items.length,1);assert.equal(offered.manifest.retrievalSupplements.length,0);assert.equal(offered.manifest.previewSha256,digest);assert.equal(offered.suggestions.length,1);
 const supplement=offered.suggestions[0].ref;await f.call('addSupplement',{refs:[supplement]});
 assert.equal(f.state.manifest.explicit.length,1);assert.equal(f.state.manifest.retrievalSupplements.length,1);assert.deepEqual(f.state.manifest.explicit[0].ref,explicit);assert.equal(f.state.items[0].itemId,original.itemId);
 const provenance=f.state.manifest.retrievalSupplements[0];assert.equal(provenance.origin,'retrieval');assert.equal(provenance.retrieval.profileId,'default');assert.equal(provenance.retrieval.querySha256,await hashText('SUPPLEMENT_QUERY_NEEDLE'));
 await f.call('preview');const reviewed=f.state;assert.ok(reviewed.text.includes('EXPLICIT_FIXED_CANARY'));assert.ok(reviewed.text.includes('SUPPLEMENT_QUERY_NEEDLE'));assert.equal(reviewed.manifest.complete,true);
 assert.equal((await f.call('share',{format:'copy'})).text,reviewed.text);assert.equal(f.state.manifest.budget.selectedItems,2);
 await f.call('removeSupplements');assert.equal(f.state.items.length,1);assert.equal(f.state.items[0].itemId,original.itemId);assert.equal(f.state.items[0].body,original.body);assert.equal(f.state.manifest.retrievalSupplements.length,0);assert.equal(f.state.manifest.exclusions.length,1);
 const again=await f.call('suggest',{query:'SUPPLEMENT_QUERY_NEEDLE'});assert.equal(again.suggestions.length,0);assert.equal(f.requests.length,0);
});
test('VS06 supplement admission refuses forged or superseded suggestions atomically',async()=>{
 const f=await setup();await f.memory.settings({includeUnorganizedInputs:true});await f.call('add',{refs:[f.refs[0]]});const fixed=f.state.items.map(i=>i.itemId),generation=f.state.generation;
 await assert.rejects(f.call('addSupplement',{refs:[f.refs[1]]}),{code:'MEMORY_STALE'});
 const offered=await f.call('suggest',{query:'SUPPLEMENT_QUERY_NEEDLE'});assert.equal(offered.suggestions.length,1);
 await assert.rejects(f.call('addSupplement',{refs:[{...offered.suggestions[0].ref,span:{start:0,end:3}}]}),{code:'MEMORY_STALE'});
 const ref=offered.suggestions[0].ref,b=f.blocks.find(b=>b.id===ref.id);
 await f.s.editDocument({documentId:b.documentId,operationId:op(),blocks:[{id:b.id,expectedRevision:b.revision,libraryText:'SUPPLEMENT_QUERY_NEEDLE_CHANGED',note:b.note,excluded:false}]});
 await assert.rejects(f.call('addSupplement',{refs:[ref]}),{code:'MEMORY_STALE'});
 const retained=await f.call('read');assert.equal(retained.generation,generation);assert.deepEqual(retained.items.map(i=>i.itemId),fixed);assert.equal(retained.manifest.retrievalSupplements.length,0);assert.equal(f.requests.length,0);
});
test('VS06 reusable retrieval Profile constrains scope and never-use survives other Profile allowance',async()=>{
 const f=await setup(),a=await topicEntry(f,'Allowed A','PROFILE_QUERY_NEEDLE A'),b=await topicEntry(f,'Never B','PROFILE_QUERY_NEEDLE B');
 const created=await f.memory.profile({action:'create',name:'Task eligibility',instruction:'',budget:'short'}),profileId=created.profileId;
 await f.memory.authorize({profileId,topicIds:[a.topic.id,b.topic.id],decision:'allowed',confirmed:true});
 await f.memory.authorize({topicIds:[b.topic.id],decision:'never'});
 const metadata=await f.call('profiles');assert.ok(metadata.profiles.some(p=>p.profileId===profileId));assert.equal(JSON.stringify(metadata.profiles).includes('PROFILE_QUERY_NEEDLE'),false);
 const result=await f.call('suggest',{query:'PROFILE_QUERY_NEEDLE',profileId});assert.equal(result.suggestions.length,1);assert.equal(result.suggestions[0].ref.id,a.entry.id);assert.equal(result.retrieval.profileId,profileId);
 await f.call('addSupplement',{refs:[result.suggestions[0].ref]});await f.call('preview');assert.equal(f.state.manifest.retrievalSupplements[0].retrieval.profileId,profileId);assert.ok(f.state.text.includes('PROFILE_QUERY_NEEDLE A'));assert.equal(f.state.text.includes('PROFILE_QUERY_NEEDLE B'),false);assert.equal(f.requests.length,0);
});
test('VS06 temporary scope revocation removes supplement bytes and invalidates exact reviewed output',async()=>{
 const f=await setup(),a=await topicEntry(f,'Session scope','SESSION_QUERY_NEEDLE');
 await f.memory.authorize({topicIds:[a.topic.id],decision:'allowed',scope:'session'});
 const offer=await f.call('suggest',{query:'SESSION_QUERY_NEEDLE'});assert.equal(offer.suggestions.length,1);await f.call('addSupplement',{refs:[offer.suggestions[0].ref]});await f.call('preview');const temporaryRevision=f.state.manifest.temporaryPolicyRevision;
 await f.memory.authorize({topicIds:[a.topic.id],decision:'default',scope:'session'});
 const refused=await f.call('read');assert.equal(refused.state,'blocked');assert.equal(refused.text,'');assert.equal(refused.items[0].body,'');assert.equal(refused.manifest.complete,false);assert.ok(refused.manifest.temporaryPolicyRevision>temporaryRevision);assert.equal(refused.manifest.previewSha256,null);
 await assert.rejects(f.call('share',{format:'markdown'}),{code:'MEMORY_DENIED'});assert.equal(f.requests.length,0);
});
test('VS06 Profile revision never silently rebinds admitted supplement provenance',async()=>{
 const f=await setup(),a=await topicEntry(f,'Profile revision','REVISION_QUERY_NEEDLE'),created=await f.memory.profile({action:'create',name:'Fixed eligibility',instruction:'',budget:'short'}),profileId=created.profileId;
 await f.memory.authorize({profileId,topicIds:[a.topic.id],decision:'allowed'});
 const offer=await f.call('suggest',{query:'REVISION_QUERY_NEEDLE',profileId});await f.call('addSupplement',{refs:[offer.suggestions[0].ref]});await f.call('preview');const before=f.state.manifest.retrievalSupplements[0].retrieval.profileRevision;
 const profile=(await f.memory.status({profileId})).profiles.find(p=>p.profileId===profileId);await f.memory.profile({action:'edit',profileId,expectedRevision:profile.revision,name:'Revised eligibility'});
 const stale=await f.call('read');assert.equal(stale.state,'stale');assert.equal(stale.manifest.retrievalSupplements[0].retrieval.profileRevision,before);assert.equal(stale.manifest.previewSha256,null);assert.equal(stale.text,'');
 await assert.rejects(f.call('share',{format:'copy'}),{code:'MEMORY_STALE'});assert.equal(f.requests.length,0);
});
test('VS06 explicit whole-group selection promotes a former supplement without duplicating or dropping its full text',async()=>{
 const f=await setup();await f.memory.settings({includeUnorganizedInputs:true});
 const offer=await f.call('suggest',{query:'SUPPLEMENT_QUERY_NEEDLE'});await f.call('addSupplement',{refs:[offer.suggestions[0].ref]});assert.equal(f.state.manifest.retrievalSupplements.length,1);const original=f.state.items[0].itemId;
 const documents=await rows(f.s,'libraryDocuments');await f.call('addContainers',{containers:[{kind:'conversation',id:documents[0].id}]});
 assert.equal(f.state.items.length,2);assert.equal(f.state.items.find(i=>i.itemId===original).origin,undefined);assert.equal(f.state.manifest.retrievalSupplements.length,0);assert.equal(f.state.manifest.explicit.length,2);
 await f.call('removeSupplements');assert.equal(f.state.items.length,2);await f.call('preview');assert.equal(f.state.manifest.complete,true);assert.ok(f.state.text.includes('EXPLICIT_FIXED_CANARY'));assert.ok(f.state.text.includes('SUPPLEMENT_QUERY_NEEDLE'));assert.equal(f.requests.length,0);
});

test('VS06 unrelated portable writes cannot stale a fixed authorized suggestion',async()=>{
 const f=await setup();await f.memory.settings({includeUnorganizedInputs:true});await f.call('add',{refs:[f.refs[0]]});
 const offer=await f.call('suggest',{query:'SUPPLEMENT_QUERY_NEEDLE'}),ref=offer.suggestions[0].ref,policyRevision=offer.manifest.policyRevision,selectionGeneration=offer.generation;
 const snapshot=()=>f.s.run(()=>f.s.repository.transaction(false,async t=>(await t.get('meta','backup-data-generation'))?.value||0,['meta']));
 const fixedOffer=structuredClone(f.service.manualSelections.sessions.get(f.state.selectionId).suggestions),before=await snapshot();
 // Real independent archive/Topic write, not a mocked candidate or marker.
 await f.s.createTopic({name:'Unrelated portable activity',operationId:op()});
 assert.ok(await snapshot()>before);
 // Reproduce the exact old candidate boundary: unrelated portable writes alone
 // refuse the historical expected-generation argument despite fixed refs/scope.
 await assert.rejects(f.memory.candidates(fixedOffer.options,fixedOffer),{code:'MEMORY_STALE'});
 assert.equal((await f.call('read')).generation,selectionGeneration);assert.equal(f.state.manifest.policyRevision,policyRevision);
 await f.call('addSupplement',{refs:[ref]});
 assert.equal(f.state.manifest.explicit.length,1);assert.deepEqual(f.state.manifest.explicit[0].ref,f.refs[0]);
 assert.equal(f.state.manifest.retrievalSupplements.length,1);assert.deepEqual(f.state.manifest.retrievalSupplements[0].ref,ref);
 await f.call('preview');assert.ok(f.state.text.includes('EXPLICIT_FIXED_CANARY'));assert.ok(f.state.text.includes('SUPPLEMENT_QUERY_NEEDLE'));assert.equal((await f.call('share',{format:'copy'})).text,f.state.text);assert.equal(f.requests.length,0);
});
test('VS06 current policy revocation still invalidates the old offer without admitting a prefix',async()=>{
 const f=await setup();await f.memory.settings({includeUnorganizedInputs:true});await f.call('add',{refs:[f.refs[0]]});const ids=f.state.items.map(i=>i.itemId),generation=f.state.generation;
 const offer=await f.call('suggest',{query:'SUPPLEMENT_QUERY_NEEDLE'});assert.equal(offer.suggestions.length,1);
 await f.memory.settings({includeUnorganizedInputs:false});
 await assert.rejects(f.call('addSupplement',{refs:[offer.suggestions[0].ref]}),{code:'MEMORY_STALE'});
 const current=await f.call('read');assert.equal(current.generation,generation);assert.deepEqual(current.items.map(i=>i.itemId),ids);assert.equal(current.manifest.retrievalSupplements.length,0);assert.equal(f.requests.length,0);
});
test('VS06 editing selection after search invalidates that offer even with unchanged archive bytes',async()=>{
 const f=await setup();await f.memory.settings({includeUnorganizedInputs:true});await f.call('add',{refs:[f.refs[0]]});
 const offer=await f.call('suggest',{query:'SUPPLEMENT_QUERY_NEEDLE'});await f.call('note',{text:'Changed task after the suggestion'});
 const generation=f.state.generation;
 await assert.rejects(f.call('addSupplement',{refs:[offer.suggestions[0].ref]}),{code:'MEMORY_STALE'});
 const current=await f.call('read');assert.equal(current.generation,generation);assert.equal(current.note,'Changed task after the suggestion');assert.equal(current.items.length,1);assert.equal(current.manifest.retrievalSupplements.length,0);
});

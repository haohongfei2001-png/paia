import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,rows,topic,op} from './harness/topic-02.mjs';
import {originalProjection,materializeOriginalCandidates} from '../core/organizer/original.js';
import {requestFromInputProjection} from '../core/organizer/deepseek.js';
import {materializeOriginalBatch} from '../core/organizer/original-simple.js';

const provider={providerId:'synthetic-topic-02',adapterVersion:'1',modelVersion:'deterministic-1'};
async function material(f,row){
 const p=await originalProjection(f.s,{kind:'original_simple',specs:f.scope,consentEpoch:(await f.s.status()).epoch,topicIds:[]});p.provider=provider;const request=requestFromInputProjection(p,'original_classification');
 const result=materializeOriginalBatch({items:[{inputRef:request.inputs[0].ref,spans:[],type:'idea',topic:{},section:{},...row}],invalidItems:[]},request,p);
 return {p,request,...result};
}
test('TOPIC-02 uncertain/transient/missing destinations commit one unassigned Entry with exact body and provenance',async()=>{
 for(const row of [{uncertain:true,topic:{proposedName:'Proposed object'},section:{proposedName:'Ignored section'}},{topic:{proposedName:'下一步操作'},section:{proposedName:'Ignored section'}},{topic:{proposedName:'未归入主题'}},{topic:{}}]){
  const f=await fixture(),before=await Promise.all(['records','blocks','inputStates'].map(name=>rows(f.s,name))),m=await material(f,row);assert.equal(m.candidates.length,1);assert.equal(m.candidates[0].newTopic,undefined);assert.equal(m.candidates[0].newSection,undefined);assert.equal(m.terminal[0].status,'processed');
  const prepared=await f.s.libraryCommit.prepare(m.candidates,m.p),result=await f.s.libraryCommit.commitOriginalBatch('unassigned-batch',m.p,prepared,null,m.terminal);assert.equal(result.created.length,1);const e=await f.s.entry(result.created[0]);assert.equal(e.body,m.request.inputs[0].text);assert.deepEqual(e.topics,[]);assert.equal(e.bodyBinding,'input');assert.equal((await f.s.entryProvenance(e.id)).length,1);assert.equal((await rows(f.s,'topics')).length,0);assert.equal((await rows(f.s,'sections')).length,0);assert.equal((await rows(f.s,'placements')).length,0);assert.equal((await rows(f.s,'organizerSuggestions')).length,0);assert.deepEqual(await Promise.all(['records','blocks','inputStates'].map(name=>rows(f.s,name))),before);
  const replay=await f.s.libraryCommit.commitOriginalBatch('unassigned-batch',m.p,prepared,null,m.terminal);assert.deepEqual(replay,result);assert.equal((await rows(f.s,'thoughts')).length,1);assert.equal((await f.s.entryPage()).items[0].body,e.body);
 }
});
test('TOPIC-02 existing human catch-all names and saved candidates survive future unassigned handling',async()=>{
 const f=await fixture(),a=await topic(f.s,'未归入主题'),b=await topic(f.s,'下一步操作'),before=await rows(f.s,'topics');await f.s.foundationWrite(t=>t.put('meta',{id:'aiPresentation:'+a.id,syntheticSavedCandidate:'preserved'}));
 const m=await material(f,{uncertain:true}),prepared=await f.s.libraryCommit.prepare(m.candidates,m.p);await f.s.libraryCommit.commitOriginalBatch('unassigned-preservation',m.p,prepared,null,m.terminal);assert.deepEqual(await rows(f.s,'topics'),before);assert.equal((await f.s.topic(b.id)).name,'下一步操作');assert.equal((await rows(f.s,'meta')).find(x=>x.id==='aiPresentation:'+a.id).syntheticSavedCandidate,'preserved');
});
test('TOPIC-02 unassigned writes still refuse excluded evidence and rollback without losing capture',async()=>{
 const f=await fixture(),m=await material(f,{uncertain:true}),prepared=await f.s.libraryCommit.prepare(m.candidates,m.p);await f.s.excludeLibrary(f.scope[0].inputId,true);await assert.rejects(f.s.libraryCommit.commitOriginalBatch('stale-unassigned',m.p,prepared,null,m.terminal));assert.equal((await rows(f.s,'thoughts')).length,0);assert.equal((await rows(f.s,'records')).length,1);
 const g=await fixture(),n=await material(g,{uncertain:true}),np=await g.s.libraryCommit.prepare(n.candidates,n.p),original=g.s.libraryCommit.apply.bind(g.s.libraryCommit);g.s.libraryCommit.apply=async(...args)=>{await original(...args);throw Error('synthetic failed commit');};await assert.rejects(g.s.libraryCommit.commitOriginalBatch('failed-unassigned',n.p,np,null,n.terminal));assert.equal((await rows(g.s,'thoughts')).length,0);assert.equal((await rows(g.s,'provenance')).length,0);assert.equal((await rows(g.s,'records')).length,1);
});
test('TOPIC-02 legacy materializer and trusted commit preserve valid uncertain spans unassigned',async()=>{
 for(const row of [{uncertain:true,topic:'Named proposal'}, {topic:''}, {topic:'下一步操作'}]){
  const f=await fixture();await f.s.enqueueOrganizer({operationId:op(),specs:f.scope});const claim=await f.s.claimOrganizer('synthetic-topic-02-worker'),p=await originalProjection(f.s,claim);p.provider=provider;
  const candidates=materializeOriginalCandidates([{spans:[],type:'idea',section:'Ignored section',...row}],p.request,p);assert.equal(candidates.length,1);assert.equal(candidates[0].newTopic,undefined);assert.equal(candidates[0].newSection,undefined);
  const prepared=await f.s.libraryCommit.prepare(candidates,p),result=await f.s.libraryCommit.commit(claim,p,prepared),e=await f.s.entry(result.created[0]);assert.equal(e.body,p.request.inputs[0].fields.body);assert.deepEqual(e.topics,[]);assert.equal((await f.s.entryProvenance(e.id)).length,1);assert.equal((await rows(f.s,'topics')).length,0);
 }
});
test('TOPIC-02 legacy unassigned handling never invents an ambiguous input span or accepts invalid evidence',()=>{
 const request={inputs:[{ref:'i0',fields:{body:'First'}},{ref:'i1',fields:{body:'Second'}}]},projection={topicMap:{},sectionMap:{}};
 for(const spans of [[],[{inputRef:'i0',start:0,end:999}],[{inputRef:'missing',start:0,end:1}]])assert.throws(()=>materializeOriginalCandidates([{uncertain:true,spans}],request,projection));
 const result=materializeOriginalCandidates([{uncertain:true,spans:[{inputRef:'i1',start:0,end:6}]}],request,projection);assert.equal(result[0].body,'Second');assert.equal(result[0].evidence[0].ref,'i1');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,material} from './harness/organize-material-method-fixture.mjs';
import {captureOriginalOrganizeCommitScope,releaseOriginalOrganizeScope} from '../core/organizer/organize-processing-scope.js';
import {captureOrganizeProcessingGrant,releaseOrganizeProcessingGrant,captureOriginalOrganizeScopeReader,captureOriginalOrganizeCommitScopeReader,readOriginalOrganizeScopeReader} from '../background/organize-processing-policy.js';
import {commitLocalOrganizeCandidateInTransaction} from '../core/organizer/ai-presentation.js';
import {validateIncrementalChild} from '../core/organizer/ai-incremental-v2.js';
import {committedV3Generation,mergeIncrementalV3} from '../core/organizer/ai-incremental-v3.js';
import {digest} from '../core/ai-usage/contracts.js';
import {registerRepositoryFinalReadFence} from '../core/idb-repository.js';
const profile={contractVersion:'test',modelVersion:'test',promptVersion:'test'};
async function prepared(f){return f.read((_reader,grant,tx)=>material(f,tx,captureOriginalOrganizeScopeReader(grant,f.s,tx)));}
async function resultFor(p){
 const request={topicId:p.topic.id,inputs:p.inputs,style:p.style,profile},response={version:2,blocks:p.inputs.map(i=>({field:'currentView',text:i.text,evidenceEntryIds:[i.ref],sourceSpans:[{entryId:i.ref,revision:i.revision,start:0,end:i.text.length}]}))},blocks=validateIncrementalChild(response,request,p),generation=await committedV3Generation({jobId:'synthetic-local-result',children:[{childId:'synthetic-local-child',operationReceiptId:'synthetic-local-receipt',payloadDigest:await digest(request),validatedOutputDigest:await digest(blocks)}],style:p.style.value,profile,control:p.incremental.control}),result=mergeIncrementalV3(blocks,request,p,generation);
 return {result,manifestDigest:await digest(result)};
}
async function qualifiedCommit(f,p,result,callback=null){
 let proof,grant;try{return await f.s.run(()=>f.s.repository.transaction(true,async tx=>{proof=await captureOriginalOrganizeCommitScope(f.s,tx,f.topic.id,f.source,f.action);grant=captureOrganizeProcessingGrant(f.source,f.action,f.s,tx,proof);const cap=captureOriginalOrganizeCommitScopeReader(grant,f.s,tx),args={prepared:p,...result,candidateId:crypto.randomUUID(),scopeReader:cap};if(callback)return callback({tx,proof,grant,cap,args});return commitLocalOrganizeCandidateInTransaction(f.s,tx,args);}));}finally{releaseOrganizeProcessingGrant(grant);releaseOriginalOrganizeScope(proof);}
}
const saved=f=>f.s.repository.transaction(false,tx=>tx.get('meta','aiPresentation:'+f.topic.id));
test('the original v3 committer consumes a real writable field cap and exact own-write terminal plan',async t=>{
 const f=await fixture(t),p=await prepared(f),result=await resultFor(p),out=await qualifiedCommit(f,p,result);assert.equal(out.candidateCreated,true);const row=await saved(f);assert.equal(row.candidate.schemaVersion,4);assert.equal(row.candidate.proposal.projection.currentView,p.inputs[0].text);assert.ok(await f.s.repository.transaction(false,tx=>tx.get('libraryMigrationItems','ai-presentation-candidate-fence:'+f.topic.id)));
});
test('a copied writable field cap cannot enter the original committer',async t=>{
 const f=await fixture(t),p=await prepared(f),result=await resultFor(p);await assert.rejects(qualifiedCommit(f,p,result,({tx,cap,args})=>commitLocalOrganizeCandidateInTransaction(f.s,tx,{...args,scopeReader:{...cap}})));assert.equal(await saved(f),undefined);
});
test('the original field grant must remain live until the Repository Promise settles',async t=>{
 const f=await fixture(t),p=await prepared(f),result=await resultFor(p);await assert.rejects(qualifiedCommit(f,p,result,async({tx,grant,args})=>{const out=await commitLocalOrganizeCandidateInTransaction(f.s,tx,args);releaseOrganizeProcessingGrant(grant);return out;}));assert.equal(await saved(f),undefined);
});
test('a later ordinary Repository current callback cannot revoke the original action after candidate writes',async t=>{
 const f=await fixture(t),p=await prepared(f),result=await resultFor(p);let armed=false,called=0;await assert.rejects(qualifiedCommit(f,p,result,async({tx,args})=>{registerRepositoryFinalReadFence(f.s.repository,tx,{plan:function*(){return true;},isCurrent:()=>{if(armed){called++;f.source.invalidate();}return true;}});const out=await commitLocalOrganizeCandidateInTransaction(f.s,tx,args);armed=true;return out;}));assert.ok(called>0);assert.equal(await saved(f),undefined);
});
test('a later same-transaction edit cannot be absorbed into the original candidate after-image',async t=>{
 const f=await fixture(t),p=await prepared(f),result=await resultFor(p);await assert.rejects(qualifiedCommit(f,p,result,async({tx,args})=>{const out=await commitLocalOrganizeCandidateInTransaction(f.s,tx,args),row=await tx.get('meta','aiPresentation:'+f.topic.id);row.candidate.proposal.projection.currentView='changed after original write';await tx.put('meta',row);return out;}));assert.equal(await saved(f),undefined);
});
test('the new qualified committer does not reuse readonly or legacy cross-Topic authority',async t=>{
 const f=await fixture(t),p=await prepared(f),result=await resultFor(p);await f.read(async(_reader,grant,tx)=>{const cap=captureOriginalOrganizeScopeReader(grant,f.s,tx),before=tx.metrics.reads;await assert.rejects(commitLocalOrganizeCandidateInTransaction(f.s,tx,{prepared:p,...result,candidateId:crypto.randomUUID(),scopeReader:cap}));assert.equal(tx.metrics.reads,before);});await assert.rejects(qualifiedCommit(f,{...p,incrementalVersion:1},result));assert.equal(await saved(f),undefined);
});
test('an unknown cold Filter is a whole-scope refusal before any candidate is published',async t=>{
 const f=await fixture(t,{input:true});await f.s.repository.transaction(true,async tx=>{const row=await tx.get('filterInputs',f.inputId);await tx.put('filterInputs',{...row,id:f.inputId,aiOperationId:'unknown-history',aiDecision:{version:1,sequence:0}});});await assert.rejects(prepared(f));assert.equal(await saved(f),undefined);
});
test('one actual writable scope cannot silently replace its already registered material cap',async t=>{
 const f=await fixture(t),p=await prepared(f),result=await resultFor(p);await assert.rejects(qualifiedCommit(f,p,result,({tx,grant,cap})=>{const first=readOriginalOrganizeScopeReader(cap,f.s,tx);assert.equal(first.topicId,f.topic.id);return captureOriginalOrganizeCommitScopeReader(grant,f.s,tx);}));assert.equal(await saved(f),undefined);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {completeFixture,append,rows,meta,response} from './harness/original-complete.mjs';
import {AI_LIST_FIELDS,AI_TEXT_LIMITS,aiSynthesisPrompt} from '../core/organizer/ai-contract.js';
import {DeepSeekOrganizerProvider} from '../core/organizer/deepseek.js';
import {AIPresentationRunner,aiPresentationStatus,editAIPresentation} from '../core/organizer/ai-presentation.js';

const corpus=JSON.parse(await readFile(new URL('./fixtures/vs05-fidelity-v1.json',import.meta.url),'utf8'));
const action=()=>({userActionId:crypto.randomUUID()});
const faithful=(request,item)=>({topicId:request.topicCandidates[0].id,blockSummary:item.faithful,currentView:item.faithful,...Object.fromEntries(AI_LIST_FIELDS.map(field=>[field,[]])),evidenceEntryIds:request.inputs.map(row=>row.ref)});
async function fixture(item,mutate=value=>value){
 const f=await completeFixture({texts:item.inputs,batchLimit:20});const original=await f.runner.wake(action());assert.equal(original.error,undefined);assert.equal((await rows(f.s,'thoughts')).length,item.inputs.length);await aiPresentationStatus(f.s);const calls=[];
 const provider=new DeepSeekOrganizerProvider({limits:f.s.organizerBudget.limits,fetchImpl:async(_url,init)=>{
  const body=JSON.parse(init.body),request=JSON.parse(body.messages[1].content);calls.push({request,prompt:body.messages[0].content});
  return response({choices:[{message:{content:JSON.stringify(mutate(faithful(request,item),request))}}]});
 }});
 return {...f,calls,provider,ai:new AIPresentationRunner(f.s,{provider,credentials:f.credentials})};
}

test('VS-05 fixed fidelity review cases freeze eight independent source distinctions before provider evaluation',()=>{
 assert.equal(corpus.evidence_class,'SYNTHETIC_FIXED_CASES');assert.equal(corpus.live_model_evidence,'NOT_RUN');assert.match(corpus.decision_rule,/Any material distortion blocks/);assert.match(corpus.decision_rule,/not model semantic accuracy/);
 assert.deepEqual(corpus.cases.map(row=>row.dimension),['quotation-versus-belief','negation','uncertainty','correction','conflicting-expressions','causal-wording','emotional-intensity','missing-time']);
 assert.equal(new Set(corpus.cases.map(row=>row.id)).size,8);
 for(const item of corpus.cases){assert.ok(item.inputs.length);assert.ok(item.blockingReason);assert.notEqual(item.faithful,item.distortion);assert.ok(item.faithful.length<=AI_TEXT_LIMITS.blockSummary);}
 const prompt=aiSynthesisPrompt();for(const phrase of ['quotations','negation','uncertainty','corrects or withdraws','conflicting expressions','co-occurrence','emotional intensity','keep it unknown','never silently truncated'])assert.ok(prompt.includes(phrase),phrase);
});

// These fixed reference outputs establish exact transport/evidence/storage,
// not a claim that a real model generated or independently passed them.
for(const item of corpus.cases)test('VS-05 fixed '+item.dimension+' reference survives the real provider/persistence boundary unchanged',async()=>{
 const f=await fixture(item),before=await Promise.all(['records','thoughts','inputStates','placements','topics'].map(name=>rows(f.s,name)));
 const result=await f.ai.wake(action());assert.equal(result.completed,true,JSON.stringify(result));assert.equal(f.calls.length,1);assert.equal(f.calls[0].prompt,aiSynthesisPrompt());assert.deepEqual(f.calls[0].request.inputs.map(row=>row.text).sort(),[...item.inputs].sort());
 const topic=(await aiPresentationStatus(f.s)).topics[0];assert.equal(topic.presentation.currentView,item.faithful);assert.equal(topic.presentation.blockSummary,item.faithful);assert.deepEqual([...topic.presentation.evidenceEntryIds].sort(),f.calls[0].request.inputs.map(row=>row.ref).sort());
 assert.deepEqual(await Promise.all(['records','thoughts','inputStates','placements','topics'].map(name=>rows(f.s,name))),before);
 assert.equal((await f.ai.wake(action())).noDelta,true);assert.equal(f.calls.length,1);
});

const oversize=[
 ...['blockSummary','currentView'].map(field=>({name:field,field,kind:'text',limit:AI_TEXT_LIMITS[field]})),
 ...AI_LIST_FIELDS.map(field=>({name:field+' item',field,kind:'item',limit:AI_TEXT_LIMITS.item})),
 ...AI_LIST_FIELDS.map(field=>({name:field+' count',field,kind:'count',limit:AI_TEXT_LIMITS.items}))
];
function exceed(value,spec,item){
 const ids=value.evidenceEntryIds;
 if(spec.kind==='count')return {...value,[spec.field]:[...Array.from({length:spec.limit},()=>({text:'仍待核对的表达。',evidenceEntryIds:ids})),{text:item.faithful,evidenceEntryIds:ids}]};
 const text='说明'.repeat(Math.ceil(spec.limit/2)).slice(0,spec.limit)+' '+item.faithful;
 return {...value,[spec.field]:spec.kind==='text'?text:[{text,evidenceEntryIds:ids}]};
}
for(const [index,spec] of oversize.entries())test('VS-05 '+spec.name+' overflow rejects whole result before a material suffix or last statement can be clipped',async()=>{
 const item=corpus.cases[index%corpus.cases.length],f=await fixture(item,value=>exceed(value,spec,item)),before=await meta(f.s,'aiOrganizerCheckpoint'),receipts=await rows(f.s,'operationReceipts'),revisions=await rows(f.s,'revisions');
 const result=await f.ai.wake(action());assert.equal(result.error,'INVALID_SCHEMA',JSON.stringify(result));assert.equal(f.calls.length,1);
 assert.deepEqual(await meta(f.s,'aiOrganizerCheckpoint'),before);assert.deepEqual(await rows(f.s,'operationReceipts'),receipts);assert.deepEqual(await rows(f.s,'revisions'),revisions);assert.equal((await aiPresentationStatus(f.s)).topics[0].presentation,null);assert.equal((await aiPresentationStatus(f.s)).topics[0].pending,true);
 await aiPresentationStatus(f.s);await new AIPresentationRunner(f.s,{provider:f.provider,credentials:f.credentials}).reconcileInterrupted();assert.equal(f.calls.length,1);
});

test('VS-05 oversized update cannot overwrite protected human work, replace candidate or acknowledge its delta',async()=>{
 const item=corpus.cases.find(row=>row.id==='negation'),f=await fixture(item);await f.ai.wake(action());let topic=(await aiPresentationStatus(f.s)).topics[0];
 await editAIPresentation(f.s,{topicId:topic.topicId,field:'currentView',value:'人工维护：保留否定和书面确认条件。',expectedRevision:topic.presentation.revision,operationId:crypto.randomUUID()});
 await append(f.s,'补充：未取得书面确认，我仍未决定接受工作。','fidelity-new-evidence');await f.runner.wake(action());
 const stored=await meta(f.s,'aiPresentation:'+topic.topicId),cp=await meta(f.s,'aiOrganizerCheckpoint'),receipts=await rows(f.s,'operationReceipts'),revisions=await rows(f.s,'revisions');
 f.provider.fetchImpl=async(_url,init)=>{const body=JSON.parse(init.body),request=JSON.parse(body.messages[1].content);f.calls.push({request,prompt:body.messages[0].content});return response({choices:[{message:{content:JSON.stringify(exceed(faithful(request,item),oversize[1],item))}}]});};
 const result=await f.ai.wake(action());assert.equal(result.error,'INVALID_SCHEMA');assert.equal(f.calls.length,2);
 assert.deepEqual(await meta(f.s,'aiPresentation:'+topic.topicId),stored);assert.deepEqual(await meta(f.s,'aiOrganizerCheckpoint'),cp);assert.deepEqual(await rows(f.s,'operationReceipts'),receipts);assert.deepEqual(await rows(f.s,'revisions'),revisions);
 topic=(await aiPresentationStatus(f.s)).topics[0];assert.equal(topic.presentation.currentView,'人工维护：保留否定和书面确认条件。');assert.equal(topic.presentation.protections.currentView,true);assert.equal(topic.pending,true);assert.equal(topic.candidate,null);await aiPresentationStatus(f.s);assert.equal(f.calls.length,2);
});

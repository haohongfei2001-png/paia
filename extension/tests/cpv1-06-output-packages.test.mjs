import test from 'node:test';
import assert from 'node:assert/strict';
import {partitionManualOutput,MANUAL_OUTPUT_ENVELOPE} from '../core/manual-output-packages.js';
import {BUDGETS} from '../core/memory/model.js';
import {estimatedTokens} from '../core/memory/retrieval.js';
import {hashText} from '../core/dedupe.js';
import {completeFixture,rows} from './harness/original-complete.mjs';
import {MemoryService} from '../core/memory/service.js';
import {PassportService} from '../core/passport.js';
import {ContextPackageService} from '../core/context-package-service.js';
async function setup(texts){
 const f=await completeFixture({texts}),memory=new MemoryService(f.s),service=new ContextPackageService(memory,new PassportService(f.s));await memory.ready();
 const blocks=(await rows(f.s,'blocks')).map(r=>r.value),refs=blocks.map(b=>({kind:'input',id:b.id,revision:b.revision}));
 let state=await service.manual({action:'create'},'package-tab');
 return {...f,memory,service,refs,get state(){return state;},async call(action,options={}){const next=await service.manual({action,selectionId:state.selectionId,generation:state.generation,...options},'package-tab');state=next;return next;}};
}
for(const budget of Object.keys(BUDGETS))test('VS06 '+budget+' packages retain exact multilingual graphemes and satisfy both output budgets',()=>{
 const text='ASCII and tabs\t\r\n中文 👩🏽‍💻 e\u0301 🇨🇳 🏳️‍🌈\n'.repeat(1200),parts=partitionManualOutput(text,budget),limit=BUDGETS[budget];
 assert.ok(parts.length>1);assert.equal(parts.map(p=>p.body).join(''),text);
 const boundaries=new Set([0,text.length,...[...new Intl.Segmenter('und',{granularity:'grapheme'}).segment(text)].map(s=>s.index)]);
 for(const [index,p]of parts.entries()){
  assert.equal(p.index,index+1);assert.equal(p.count,parts.length);assert.equal(p.start,index?parts[index-1].end:0);assert.equal(p.body,text.slice(p.start,p.end));assert.ok(boundaries.has(p.start));assert.ok(boundaries.has(p.end));
  assert.equal(p.text,MANUAL_OUTPUT_ENVELOPE+p.body);assert.equal(p.characters,[...p.text].length);assert.equal(p.tokens,estimatedTokens(p.text));assert.ok(p.characters<=limit.characters);assert.ok(p.tokens<=limit.tokens);
 }
});
test('VS06 a realistic long unbroken payload is completely recoverable from budget packages',()=>{
 const text='LONG_UNBROKEN_CANARY_'+'x'.repeat(100000)+'_END',parts=partitionManualOutput(text,'short');
 assert.ok(parts.length>40);assert.equal(parts.map(p=>p.body).join(''),text);assert.equal(parts.at(-1).end,text.length);
});
test('VS06 indivisible oversized grapheme and invalid budget refuse without partial output',()=>{
 assert.throws(()=>partitionManualOutput('a'+'\u0301'.repeat(5000),'short'),{code:'MEMORY_LIMIT'});
 assert.throws(()=>partitionManualOutput('valid','unknown'),{code:'MEMORY_INVALID'});
 assert.throws(()=>partitionManualOutput('','short'),{code:'MEMORY_EMPTY'});
});
test('VS06 whole Conversation stays fixed while every package copies or exports only its exact reviewed bytes',async()=>{
 const texts=['FIXED_LONG_A '+'完整材料 👩🏽‍💻 e\u0301 '.repeat(400),'FIXED_LONG_B '+'第二份材料\n'.repeat(400)],f=await setup(texts),documents=await rows(f.s,'libraryDocuments');
 await f.call('addContainers',{containers:[{kind:'conversation',id:documents[0].id}]});const ids=f.state.items.map(i=>i.itemId);
 await f.call('budget',{budget:'short'});assert.equal(f.state.state,'dirty');await f.call('preview');const reviewed=f.state;
 assert.ok(reviewed.outputPackages.length>1);assert.equal(reviewed.outputPackages.map(p=>p.body).join(''),reviewed.text);assert.equal(reviewed.manifest.complete,true);assert.equal(reviewed.manifest.containers[0].members.length,2);
 assert.deepEqual(reviewed.items.map(i=>i.itemId),ids);assert.equal(reviewed.manifest.budget.outputMode,'split');assert.equal(reviewed.manifest.budget.selectedItems,2);
 for(const body of texts)assert.ok(reviewed.text.includes(body));assert.equal(reviewed.manifest.previewSha256,await hashText(reviewed.text));
 const held=f.service.manualSelections.sessions.get(reviewed.selectionId);assert.ok(held.reviewedPackages.every(p=>!Object.hasOwn(p,'body')&&!Object.hasOwn(p,'text')),'private session stores only offsets/digests, never an extra retained source copy');
 for(const p of reviewed.outputPackages){
  assert.equal(p.sha256,await hashText(p.text));
  for(const format of ['copy','markdown']){const shared=await f.call('share',{format,packageIndex:p.index});assert.equal(shared.text,p.text);assert.equal(shared.packageSha256,p.sha256);assert.equal(shared.packageIndex,p.index);assert.equal(shared.packageCount,p.count);assert.equal(shared.manifest.previewSha256,reviewed.manifest.previewSha256);}
 }
 for(const packageIndex of [undefined,true,0,-1,1.5,'1',reviewed.outputPackages.length+1])await assert.rejects(f.call('share',{format:'copy',...(packageIndex===undefined?{}:{packageIndex})}));
 assert.equal(f.requests.length,0);
});
test('VS06 budget changes invalidate old packages; full mode never omits or ranks fixed material',async()=>{
 const f=await setup(['FIXED_SCOPE_NEEDLE '+'长文字 '.repeat(2000)]);await f.call('add',{refs:f.refs});await f.call('budget',{budget:'short'});await f.call('preview');const first=f.state,ids=first.items.map(i=>i.itemId);
 await f.call('budget',{budget:'detailed'});assert.equal(f.state.state,'dirty');assert.deepEqual(f.state.outputPackages,[]);await assert.rejects(f.call('share',{format:'copy',packageIndex:1}),{code:'MEMORY_STALE'});
 await f.call('preview');assert.equal(f.state.text,first.text);assert.ok(f.state.outputPackages.length<first.outputPackages.length);assert.notEqual(f.state.manifest.reviewedManifestSha256,first.manifest.reviewedManifestSha256);
 await f.call('budget',{budget:null});await f.call('preview');assert.deepEqual(f.state.items.map(i=>i.itemId),ids);assert.equal(f.state.text,first.text);assert.deepEqual(f.state.outputPackages,[]);assert.equal((await f.call('share',{format:'copy'})).text,first.text);
 await assert.rejects(f.call('share',{format:'copy',packageIndex:1}),{code:'MEMORY_INVALID'});assert.equal(f.requests.length,0);
});
test('VS06 package output edits and source changes require a fresh exact review',async()=>{
 const f=await setup(['SOURCE_PRIVATE_CANARY '+'完整文字 '.repeat(1000)]);await f.call('add',{refs:f.refs});await f.call('budget',{budget:'short'});await f.call('preview');const first=f.state,ref=first.items[0].ref;
 await f.call('edit',{itemId:first.items[0].itemId,text:'OUTPUT_ONLY_EDIT '+'改写文字 '.repeat(700)});await assert.rejects(f.call('share',{format:'markdown',packageIndex:1}),{code:'MEMORY_STALE'});await f.call('preview');
 assert.equal(f.state.text.includes('SOURCE_PRIVATE_CANARY'),false);assert.ok(f.state.text.includes('OUTPUT_ONLY_EDIT'));assert.notEqual(f.state.outputPackages[0].sha256,first.outputPackages[0].sha256);
 const b=(await rows(f.s,'blocks')).map(r=>r.value).find(b=>b.id===ref.id);await f.s.editDocument({documentId:b.documentId,operationId:crypto.randomUUID(),blocks:[{id:b.id,expectedRevision:b.revision,libraryText:'SOURCE_CHANGED',note:b.note,excluded:false}]});
 const stale=await f.call('read');assert.equal(stale.state,'stale');assert.deepEqual(stale.outputPackages,[]);assert.equal(stale.text,'');await assert.rejects(f.call('share',{format:'copy',packageIndex:1}),{code:'MEMORY_STALE'});assert.equal(f.requests.length,0);
});
test('VS06 explicit AI restriction purges package-visible bytes and refuses every old part',async()=>{
 const f=await setup(['BLOCKED_PACKAGE_CANARY '+'不可泄露 '.repeat(1000)]);await f.call('add',{refs:f.refs});await f.call('budget',{budget:'short'});await f.call('preview');
 await f.memory.exclude({inputId:f.refs[0].id,excluded:true});const blocked=await f.call('read');assert.equal(blocked.state,'blocked');assert.equal(blocked.text,'');assert.deepEqual(blocked.outputPackages,[]);assert.equal(blocked.items[0].body,'');assert.equal(blocked.manifest.previewSha256,null);
 const held=f.service.manualSelections.sessions.get(blocked.selectionId);assert.equal(held.items[0].body,'');assert.equal(JSON.stringify(held.reviewedPackages).includes('BLOCKED_PACKAGE_CANARY'),false);
 await assert.rejects(f.call('share',{format:'copy',packageIndex:1}),{code:'MEMORY_DENIED'});assert.equal(f.requests.length,0);
});

test('VS06 denial during package hashing refuses the part and clears its source bytes',async()=>{
 const f=await setup(['PACKAGE_RACE_CANARY '+'完整材料 '.repeat(500)]);await f.call('add',{refs:f.refs});await f.call('budget',{budget:'short'});await f.call('preview');
 const selections=f.service.manualSelections,validate=selections.validate.bind(selections);let reads=0;
 selections.validate=async session=>{if(++reads===2)await f.memory.exclude({inputId:f.refs[0].id,excluded:true});return validate(session);};
 await assert.rejects(f.call('share',{format:'markdown',packageIndex:1}),{code:'MEMORY_DENIED'});
 const held=selections.sessions.get(f.state.selectionId);assert.equal(held.items[0].body,'');assert.equal(selections.dto(held).text,'');assert.deepEqual(selections.dto(held).outputPackages,[]);assert.equal(f.requests.length,0);
});

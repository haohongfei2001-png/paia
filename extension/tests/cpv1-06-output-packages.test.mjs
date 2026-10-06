import {assertRetiredContext} from './harness/retired-context.mjs';
import {reviewManualSelection} from './harness/manual-reviewed-selection.mjs';
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
test("Current retirement / historical scenario: VS06 whole Conversation stays fixed while every package copies or exports only its exact reviewed bytes",async()=>{
 await assertRetiredContext({"owner": "package", "method": "manual", "action": "share", "variant": "allowed", "long": true});
});
test("Current retirement / historical scenario: VS06 budget changes invalidate old packages; full mode never omits or ranks fixed material",async()=>{
 await assertRetiredContext({"owner": "package", "method": "manual", "action": "budget", "variant": "allowed", "long": true});
});
test("Current retirement / historical scenario: VS06 package output edits and source changes require a fresh exact review",async()=>{
 await assertRetiredContext({"owner": "package", "method": "manual", "action": "share", "variant": "edited"});
});
test("Current retirement / historical scenario: VS06 explicit AI restriction purges package-visible bytes and refuses every old part",async()=>{
 await assertRetiredContext({"owner": "package", "method": "manual", "action": "share", "variant": "excluded"});
});

test("Current retirement / historical scenario: VS06 denial during package hashing refuses the part and clears its source bytes",async()=>{
 await assertRetiredContext({"owner": "package", "method": "manual", "action": "share", "variant": "denied"});
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {completeFixture,rows} from './harness/original-complete.mjs';
import {inputEdit} from './harness/thought-m1.mjs';
import {recordIndex,blockIndex} from '../core/idb-repository.js';
import {ReaderStateService} from '../core/reader-state.js';
import {readPromptCandidates,PROMPT_ARCHIVE_LIMITS} from '../core/prompt-archive-reader.js';

async function fixture(texts){
 const f=await completeFixture({texts});await f.s.finishFoundation();return f;
}
const refused=(promise,code)=>assert.rejects(promise,error=>error.code===code
 &&error.message===code&&!error.message.includes('PRIVATE'));
async function canonical(s){
 const names=['records','blocks','inputStates'];
 return Object.fromEntries(await Promise.all(names.map(async name=>[name,await rows(s,name)])));
}
test('P1 reads actual current zero-revision user Inputs with complete frequency and lexical pagination',async()=>{
 const useful='请比较 ＰＡＩＡ 的方案，保留不要猜测的条件。';
 const f=await fixture([useful,'继续',useful,'Another useful prompt']);
 const before=await canonical(f.s),page=await readPromptCandidates(f.s,{query:'paia',limit:1});
 assert.equal(page.complete,true);assert.equal(page.scannedInputs,4);assert.equal(page.total,1);
 assert.equal(page.items[0].frequency,2);assert.equal(page.items[0].text,useful);
 assert.equal(page.items[0].sourceRefs.length,2);
 assert.ok(page.items[0].sourceRefs.every(r=>r.revision===0));
 const second=await readPromptCandidates(f.s,{limit:1,offset:1});
 assert.equal(second.total,2);assert.equal(second.items[0].text,'Another useful prompt');
 assert.equal(second.nextOffset,null);assert.deepEqual(await canonical(f.s),before);
 assert.equal(f.requests.length,0);
});
test('P1 current working edits change suggestions without rewriting Source or guessing source time',async()=>{
 const original='Original user prompt without an invented timestamp';
 const f=await fixture([original]),b=(await rows(f.s,'blocks'))[0].value;
 const sources=await rows(f.s,'records');
 await inputEdit(f.s,b.id,{libraryText:'User edited prompt with final negation: do not guess.'});
 const result=await readPromptCandidates(f.s);
 assert.equal(result.items[0].text,'User edited prompt with final negation: do not guess.');
 assert.equal(result.items[0].sourceRefs[0].revision,1);
 assert.equal(result.items[0].lastSourceSentAt,null);
 assert.deepEqual(await rows(f.s,'records'),sources);assert.equal(f.requests.length,0);
});
test('P1 current exclusion, Revisit and Smart Filter eligibility cannot leak hidden prompts',async()=>{
 const f=await fixture(['PRIVATE_EXCLUDED_CANARY','PRIVATE_REVISIT_CANARY','Visible substantive prompt']);
 const blocks=(await rows(f.s,'blocks')).map(r=>r.value);
 const byText=new Map();for(const b of blocks){
  const r=(await rows(f.s,'records')).find(r=>r.id===b.originalTextReference);
  byText.set(r.value.originalText,b);
 }
 await f.s.excludeLibrary(byText.get('PRIVATE_EXCLUDED_CANARY').id,true);
 await new ReaderStateService(f.s).configure({kind:'input',
  id:byText.get('PRIVATE_REVISIT_CANARY').id,excluded:true});
 const page=await readPromptCandidates(f.s);
 assert.equal(page.total,1);assert.equal(page.items[0].text,'Visible substantive prompt');
 assert.doesNotMatch(JSON.stringify(page),/PRIVATE_/);
 const s=f.s,original=s.isFiltered.bind(s);
 s.isFiltered=async(t,b,state)=>b.id===byText.get('Visible substantive prompt').id
  ||original(t,b,state);
 assert.equal((await readPromptCandidates(s)).total,0);
 assert.equal(f.requests.length,0);
});
test('P1 merged Inputs preserve every Source address while counting the Input once',async()=>{
 const f=await fixture(['First complete source','Second complete source']);
 const blocks=(await rows(f.s,'blocks')).map(r=>r.value),sources=await rows(f.s,'records');
 await f.s.foundationWrite(async t=>{
  const owner=(await t.get('blocks',blocks[0].id)).value,state=await t.get('inputStates',owner.id);
  owner.libraryText='A complete human merged prompt';owner.provenance=blocks.flatMap(b=>b.provenance);
  state.sourceRecordIds=owner.provenance.map(p=>p.sourceRecordId);state.contentRevision++;
  await t.put('blocks',{id:owner.id,value:owner});await t.put('inputStates',state);
  const other=await t.get('inputStates',blocks[1].id);other.removalState='removed';await t.put('inputStates',other);
 });
 const page=await readPromptCandidates(f.s);
 assert.equal(page.total,1);assert.equal(page.items[0].frequency,1);
 assert.equal(page.items[0].text,'A complete human merged prompt');
 assert.equal(page.items[0].sourceRefs.length,2);
 assert.deepEqual(new Set(page.items[0].sourceRefs.map(r=>r.sourceId)),
  new Set(sources.map(r=>r.id)));
 assert.deepEqual(await rows(f.s,'records'),sources);assert.equal(f.requests.length,0);
});
test('P1 never obtains AI presentation/reply bodies and refuses foreign source roles',async()=>{
 const f=await fixture(['Visible human prompt','PRIVATE_ASSISTANT_CANARY']);
 const records=await rows(f.s,'records');
 const foreign=records.find(r=>r.value.originalText==='PRIVATE_ASSISTANT_CANARY');
 await f.s.foundationWrite(async t=>{
  const source=await t.get('records',foreign.id);
  source.value.role='assistant';await t.put('records',source);
  await t.put('meta',{id:'aiPresentation:canary',body:'PRIVATE_AI_REPLY_CANARY'});
 });
 const tx=f.s.repository.transaction.bind(f.s.repository);let forbidden=0;
 f.s.repository.transaction=(write,fn,stores)=>tx(write,async t=>{
  const get=t.get.bind(t);t.get=(name,id)=>{
   if(name==='thoughts'||name==='meta'&&String(id).startsWith('aiPresentation:')){
    forbidden++;throw Error('AI body read forbidden');
   }return get(name,id);
  };return fn(t);
 },stores);
 const page=await readPromptCandidates(f.s);
 assert.equal(page.total,1);assert.equal(page.items[0].text,'Visible human prompt');
 assert.doesNotMatch(JSON.stringify(page),/PRIVATE_/);assert.equal(forbidden,0);
 assert.equal(f.requests.length,0);
});
test('P1 fences edits, exclusion, policy, capture epoch and purge between final page and release',async()=>{
 for(const kind of ['edit','exclude','revisit','epoch','purge']){
  const f=await fixture(['PRIVATE_RACE_CANARY']),b=(await rows(f.s,'blocks'))[0].value;
  const run=f.s.run.bind(f.s);let calls=0,fired=false;
  f.s.run=async fn=>{
   const result=await run(fn);
   if(++calls===2&&!fired){fired=true;
    if(kind==='edit')await inputEdit(f.s,b.id,{libraryText:'Changed full prompt'});
    if(kind==='exclude')await f.s.excludeLibrary(b.id,true);
    if(kind==='revisit')await new ReaderStateService(f.s).configure({kind:'input',id:b.id,excluded:true});
    if(kind==='epoch')await f.s.setEnabled(false);
    if(kind==='purge')await f.s.purge(b.originalTextReference,true);
   }return result;
  };
  await refused(readPromptCandidates(f.s),'PROMPT_STALE');assert.equal(fired,true);
  assert.equal(f.requests.length,0);
 }
});
test('P1 actual IndexedDB 1025-row paging retains a complete long Unicode prompt and all refs',async()=>{
 const common='Compare every option and preserve the original conditions.';
 const full='Complete long Unicode prompt '+ '🧠'.repeat(90000)+'\nDo not drop the final negation.';
 const f=await fixture([common]),s=f.s;
 const r0=(await rows(s,'records'))[0].value,b0=(await rows(s,'blocks'))[0].value,
  m0=(await rows(s,'inputStates'))[0];
 for(let start=0;start<1024;start+=100)await s.foundationWrite(async t=>{
  for(let i=start;i<Math.min(start+100,1024);i++){
   const id='p1-scale-source-'+String(i).padStart(6,'0'),sourceKey=(i+1).toString(16).padStart(64,'0');
   const r={...r0,id,sourceKey,dedupeKey:sourceKey,sourceMessageId:'p1-scale-msg-'+i,
    originalText:i===1023?full:common};
   const b={...b0,id:'block:'+id,sourceRecordId:id,originalTextReference:id,
    provenance:[{sourceRecordId:id}],provenanceSignature:JSON.stringify([{sourceRecordId:id}])};
   await t.put('records',{id,value:r});await t.put('recordIndex',recordIndex(r,i+1));
   await t.put('blocks',{id:b.id,value:b});await t.put('blockIndex',blockIndex(b,i+1,[r]));
   await t.put('inputStates',{...m0,id:b.id,sourceRecordIds:[id]});
   await t.put('filterInputs',s.initialFilter(b,{...m0,id:b.id}));
  }
 });
 const before=await canonical(s),tx=s.repository.transaction.bind(s.repository),limits=[];
 s.repository.transaction=(write,fn,stores)=>tx(write,async t=>{
  const page=t.page.bind(t);t.page=(name,options)=>{if(name==='inputStates')limits.push(options.limit);return page(name,options);};
  return fn(t);
 },stores);
 const result=await readPromptCandidates(s);
 assert.equal(result.scannedInputs,1025);assert.equal(result.complete,true);assert.equal(result.total,2);
 const repeated=result.items.find(item=>item.text===common),long=result.items.find(item=>item.text===full);
 assert.equal(repeated.frequency,1024);assert.equal(repeated.sourceRefs.length,1024);
 assert.equal(long.text,full);assert.equal(long.frequency,1);
 assert.equal(long.sourceRefs[0].revision,0);assert.equal(limits.length,11);
 assert.ok(limits.every(limit=>limit===100));
 assert.deepEqual(await canonical(s),before);assert.equal(f.requests.length,0);
});
function largeProjection(size,{generationChange=false,count=size,bodyOverride=null}={}){
 const body=bodyOverride??'Compare the alternatives and preserve all important conditions.';
 let generation=0,pageCalls=0,allCalls=0,maxLimit=0,runCalls=0;
 const numbered=id=>Number(String(id).split('-').at(-1));
 const state=i=>({id:'input-'+String(i).padStart(6,'0'),documentId:'doc',contentRevision:0,
  removalState:'active',sourcePurged:false,sourceRecordIds:['source-'+String(i).padStart(6,'0')]});
 const t={
  async count(name){assert.equal(name,'inputStates');return count;},
  async get(name,id){
   if(name==='meta')return id==='smart-filter'?{phase:'active',mode:'off'}:
    id==='backup-data-generation'?{value:generation}:null;
   if(name==='inputStates')return state(numbered(id));
   const i=numbered(id),sourceId='source-'+String(i).padStart(6,'0');
   if(name==='blocks')return {value:{id,documentId:'doc',libraryText:null,
    originalTextReference:sourceId,provenance:[{sourceRecordId:sourceId}]}};
   if(name==='recordIndex')return {id:sourceId,sourceKey:String(i).padStart(64,'0'),
    dedupeKey:String(i).padStart(64,'0'),sourceSentAt:null};
   if(name==='records')return {value:{id:sourceId,originalText:body,chatId:'p1-scale',
    chatUrl:'https://chatgpt.com/c/p1-scale',platform:'chatgpt',sourceSentAt:null}};
   if(name==='tombstones')return null;throw Error('Unexpected read '+name);
  },
  async page(name,{after,limit}){
   assert.equal(name,'inputStates');pageCalls++;maxLimit=Math.max(maxLimit,limit);
   const start=after===undefined?0:numbered(after)+1,end=Math.min(start+limit,size);
   const items=Array.from({length:end-start},(_,n)=>({key:state(start+n).id,value:state(start+n)}));
   return {rows:items,next:end<size?items.at(-1).key:null};
  },
  async all(){allCalls++;throw Error('Unbounded read forbidden');}
 };
 const store={databaseId:'synthetic-db',repository:{transaction:async(_write,fn)=>fn(t)},
  async finishFoundation(){},async control(){return {settings:{epoch:1}};},
  async isFiltered(){return false;},async run(fn){const result=await fn();
   if(generationChange&&++runCalls===2)generation++;return result;}};
 return {store,stats:()=>({pageCalls,allCalls,maxLimit}),body};
}
test('P1 complete 100000-Input reader observes all bounded pages and keeps all 100000 Source refs',async()=>{
 const f=largeProjection(100000),result=await readPromptCandidates(f.store);
 assert.equal(result.scannedInputs,100000);assert.equal(result.total,1);
 assert.equal(result.items[0].frequency,100000);assert.equal(result.items[0].sourceRefs.length,100000);
 assert.equal(result.items[0].sourceRefs[0].id,'input-000000');
 assert.equal(result.items[0].sourceRefs.at(-1).id,'input-099999');
 assert.equal(result.items[0].text,f.body);
 assert.deepEqual(f.stats(),{pageCalls:1000,allCalls:0,maxLimit:100});
});
test('P1 over-bound, repeated/corrupt pages and empty-authority changes never claim complete frequency',async()=>{
 const over=largeProjection(100001);await refused(readPromptCandidates(over.store),'PROMPT_LIMIT');
 assert.equal(over.stats().pageCalls,0);
 const largeBodies=largeProjection(400,{bodyOverride:'🧠'.repeat(90000)});
 await refused(readPromptCandidates(largeBodies.store),'PROMPT_LIMIT');
 assert.ok(largeBodies.stats().pageCalls>0);
 const bad=largeProjection(101);const tx=bad.store.repository.transaction;
 bad.store.repository.transaction=(_write,fn)=>tx(false,async t=>{
  const original=t.page.bind(t);t.page=async(...args)=>{
   const p=await original(...args);if(args[1].after!==undefined)p.rows[0].value.id='input-000000';
   return p;};return fn(t);
 });
 await refused(readPromptCandidates(bad.store),'PROMPT_UNAVAILABLE');
 const empty=largeProjection(0,{generationChange:true});
 await refused(readPromptCandidates(empty.store),'PROMPT_STALE');
 let getterReads=0;const hostile={};
 Object.defineProperty(hostile,'query',{enumerable:true,get(){getterReads++;return 'PRIVATE';}});
 await refused(readPromptCandidates(largeProjection(1).store,hostile),'PROMPT_INVALID');
 assert.equal(getterReads,0);
 assert.equal(PROMPT_ARCHIVE_LIMITS.inputCount,100000);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {DerivedSemanticIndex} from '../core/semantic-index.js';
import {materialIdentity} from '../core/manual-materials.js';
import {retrievalCorpus} from './fixtures/cpv1-07-retrieval-corpus.mjs';
import {completeFixture,rows} from './harness/original-complete.mjs';
import {MemoryService} from '../core/memory/service.js';
import {createMaterialSemanticIndex} from '../core/semantic-material-snapshot.js';
import {inputEdit} from './harness/thought-m1.mjs';

const model={id:'synthetic-local-encoder',revision:'a'.repeat(40),dimension:2};
const item=(id,body='Complete original '+id)=>({
 ref:{kind:'input',id,revision:0},title:'Title '+id,body,source:'chatgpt',time:null,locations:[]
});
function fixture(items=[item('a'),item('b'),item('c')],options={}){
 let current={scope:'synthetic-owned-scope',generation:1,items:structuredClone(items)};
 const calls=[];
 const index=new DerivedSemanticIndex({model,readEligible:async()=>structuredClone(current),
  encode:async(kind,value)=>{
   calls.push({kind,value:structuredClone(value)});
   return kind==='document'&&value.ref.id==='b'?[0,1]:[1,0];
  },...options});
 return {index,calls,set(value){current=value;},get:()=>structuredClone(current)};
}
test('CPV1-07 derived index reuses vectors, returns current full evidence and rebuilds explicitly',async()=>{
 const long='引用不是信念。👩🏽‍💻\n'.repeat(1000)+'FULL_END';
 const f=fixture([item('a',long),item('b'),item('c')]),before=f.get();
 assert.equal((await f.index.lookup('query')).reason,'index_incomplete');
 assert.equal(f.calls.length,0);
 assert.equal((await f.index.synchronize()).ok,true);
 assert.equal(f.index.status().vectorBytes,24);
 const result=await f.index.lookup('query');
 assert.deepEqual(result.items.map(x=>x.ref.id),['a','c']);
 assert.equal(result.items[0].body,long);assert.equal(result.items[0].time,null);
 assert.equal(result.coverage.storesBody,false);
 result.items[0].ref.revision=999;result.items[0].body='consumer edit';
 assert.deepEqual(f.get(),before);
 assert.equal((await f.index.synchronize()).ok,true);
 assert.equal(f.calls.filter(x=>x.kind==='document').length,3);
 assert.equal((await f.index.synchronize({rebuild:true})).ok,true);
 assert.equal(f.calls.filter(x=>x.kind==='document').length,6);
 assert.equal((await f.index.lookup(' ')).reason,'empty_query');
});

for(const [label,mutate]of [
 ['working revision',r=>{r.ref.revision++;r.body='Actual rewritten full body';}],
 ['body even without a revision bump',r=>{r.body='Different complete body';}],
 ['source provenance',r=>{r.source='claude';}],
 ['confirmed original time',r=>{r.time='2020-01-01T00:00:00Z';}],
 ['title',r=>{r.title='Changed title';}],
 ['Topic location',r=>{r.locations=[{topicId:'topic-a',sectionId:'section-a',topicName:'Actual topic'}];}]
])test('CPV1-07 changed '+label+' removes only the affected derived vector before reuse',async()=>{
 const f=fixture();await f.index.synchronize();const next=f.get();mutate(next.items[0]);next.generation++;
 f.set(next);assert.equal((await f.index.lookup('query')).reason,'index_incomplete');
 assert.equal(f.index.status().indexed,2);assert.equal(f.index.status().missing,1);
 assert.equal(f.calls.filter(x=>x.kind==='query').length,0);
 await f.index.synchronize();
 assert.equal(f.calls.filter(x=>x.kind==='document').length,4);
 const result=await f.index.lookup('query');
 assert.deepEqual(result.items.find(x=>x.ref.id==='a').ref,next.items[0].ref);
 assert.equal(result.items.find(x=>x.ref.id==='a').body,next.items[0].body);
});

test('CPV1-07 deleted/excluded records leave coverage immediately and do not trigger automatic encoding',async()=>{
 const f=fixture();await f.index.synchronize();const next=f.get();
 next.items=next.items.filter(x=>x.ref.id!=='a');next.generation++;f.set(next);
 const result=await f.index.lookup('query');
 assert.deepEqual(result.items.map(x=>x.ref.id),['c']);
 assert.equal(result.coverage.expected,2);assert.equal(result.coverage.indexed,2);
 assert.equal(f.calls.filter(x=>x.kind==='document').length,3);
 next.items=[];next.generation++;f.set(next);
 assert.deepEqual((await f.index.lookup('query')).items,[]);
 assert.equal(f.index.status().vectorBytes,0);
 assert.equal(f.calls.filter(x=>x.kind==='query').length,1);
});

test('CPV1-07 scope changes require new bindings even when eligible text is identical',async()=>{
 const f=fixture();await f.index.synchronize();const next=f.get();next.scope='different-owned-scope';f.set(next);
 assert.equal((await f.index.lookup('query')).reason,'index_incomplete');
 assert.equal(f.index.status().indexed,0);
 await f.index.synchronize();assert.equal(f.calls.filter(x=>x.kind==='document').length,6);
});

const barrier=()=>{let release;const promise=new Promise(resolve=>{release=resolve;});return {promise,release};};
test('CPV1-07 edit/deletion during document encoding refuses the complete staged generation',async()=>{
 const gate=barrier(),entered=barrier();let snapshot={scope:'scope',generation:1,items:[item('a'),item('b')]};
 const index=new DerivedSemanticIndex({model,readEligible:async()=>structuredClone(snapshot),
  encode:async()=>{entered.release();await gate.promise;return [1,0];}});
 const building=index.synchronize();await entered.promise;
 snapshot={...snapshot,generation:2,items:[{...item('a'),body:'New actual body',ref:{kind:'input',id:'a',revision:1}}]};
 gate.release();const result=await building;
 assert.equal(result.ok,false);assert.equal(result.reason,'authority_changed');
 assert.equal(index.status().indexed,0);assert.equal(index.status().expected,1);
 assert.equal((await index.lookup('query')).reason,'index_incomplete');
});

test('CPV1-07 invalidate cancels an in-flight build and cannot revive removed vectors',async()=>{
 const gate=barrier(),entered=barrier();
 const f=fixture(undefined,{encode:async()=>{entered.release();await gate.promise;return [1,0];}});
 const building=f.index.synchronize();await entered.promise;f.index.invalidate();gate.release();
 assert.equal((await building).reason,'superseded');
 assert.equal(f.index.status().indexed,0);assert.equal(f.index.status().state,'empty');
});

test('CPV1-07 deletion or scope revocation during query encoding returns no stale evidence',async()=>{
 const gate=barrier(),entered=barrier();let snapshot={scope:'scope',generation:1,items:[item('a'),item('b')]};
 const index=new DerivedSemanticIndex({model,readEligible:async()=>structuredClone(snapshot),
  encode:async(kind)=>{if(kind==='query'){entered.release();await gate.promise;}return [1,0];}});
 await index.synchronize();const lookup=index.lookup('query');await entered.promise;
 snapshot={scope:'revoked-scope',generation:2,items:[]};gate.release();
 const result=await lookup;assert.equal(result.usedSemantic,false);assert.equal(result.reason,'authority_changed');
 assert.deepEqual(result.items,[]);assert.equal(index.status().indexed,0);
});

test('CPV1-07 newer synchronization supersedes an older encoder result',async()=>{
 const gate=barrier(),entered=barrier();let first=true;
 const f=fixture([item('a')],{encode:async()=>{if(first){first=false;entered.release();await gate.promise;}return [1,0];}});
 const older=f.index.synchronize();await entered.promise;
 const newer=f.get();newer.generation=2;newer.items[0].ref.revision=1;newer.items[0].body='Newer whole body';f.set(newer);
 assert.equal((await f.index.synchronize()).ok,true);gate.release();
 assert.equal((await older).reason,'superseded');
 assert.equal((await f.index.lookup('query')).items[0].body,'Newer whole body');
});

for(const [name,bad]of [
 ['nonfinite',[NaN,0]],['zero',[0,0]],['dimension',[1,0,0]],
 ['norm',[2,0]],['boolean',[true,0]]
])test('CPV1-07 '+name+' vector failure keeps a fixed error and truthful lexical fallback signal',async()=>{
 const canary='PRIVATE_MODEL_EXCEPTION_DO_NOT_ECHO';
 const f=fixture(undefined,{encode:async()=>bad});
 const result=await f.index.synchronize();assert.equal(result.reason,'index_unavailable');
 assert.equal(result.coverage.indexed,0);assert.equal(result.coverage.state,'unavailable');
 assert.doesNotMatch(JSON.stringify(result),new RegExp(canary));
});

test('CPV1-07 source and encoder faults never become successful abstention or leak private errors',async()=>{
 let failRead=false,failQuery=false;
 const index=new DerivedSemanticIndex({model,
  readEligible:async()=>{if(failRead)throw Error('PRIVATE_SOURCE_CANARY');return {scope:'scope',generation:1,items:[item('a')]};},
  encode:async(kind)=>{if(failQuery&&kind==='query')throw Error('PRIVATE_ENCODER_CANARY');return [1,0];}});
 await index.synchronize();failQuery=true;
 let result=await index.lookup('query');assert.equal(result.reason,'index_unavailable');
 assert.equal(result.usedSemantic,false);assert.doesNotMatch(JSON.stringify(result),/PRIVATE_/);
 failQuery=false;await index.synchronize();failRead=true;
 result=await index.lookup('query');assert.equal(result.reason,'index_unavailable');
 assert.equal(result.coverage.indexed,0);assert.doesNotMatch(JSON.stringify(result),/PRIVATE_/);
});

test('CPV1-07 snapshot shape, duplicate identity, full-reference and capacity bounds refuse before encoding',async()=>{
 for(const mutate of [
  s=>{s.generation=true;},s=>{s.generation=1.5;},s=>{s.generation=-1;},
  s=>{s.scope='';},s=>{s.items.push(structuredClone(s.items[0]));},
  s=>{s.items[0].ref.span={start:0,end:1};},
  s=>{s.items[0].time='2026-02-30T00:00:00Z';},
  s=>{s.items[0].privateExtra='PRIVATE_EXTRA_CANARY';}
 ]){
  const f=fixture();const bad=f.get();mutate(bad);f.set(bad);
  assert.equal((await f.index.synchronize()).reason,'index_unavailable');assert.equal(f.calls.length,0);
 }
 for(const limits of [{maxItems:2},{maxVectorBytes:16}]){
  const f=fixture(undefined,limits);
  assert.equal((await f.index.synchronize()).reason,'index_unavailable');assert.equal(f.calls.length,0);
 }
 for(const bad of [{revision:'main'},{dimension:true},{dimension:0}]){
  assert.throws(()=>new DerivedSemanticIndex({readEligible:async()=>{},encode:async()=>[1,0],model:{...model,...bad}}),
   /^Error: semantic_index_invalid$/);
 }
});

test('CPV1-07 fixed 28-record corpus remains unchanged and eligibility precedes projection',async()=>{
 const before=structuredClone(retrievalCorpus),calls=[];
 const items=retrievalCorpus.records.filter(r=>!r.excluded).map(r=>({
  ref:{kind:'input',id:r.id,revision:0},title:r.title,body:r.body,source:r.source,time:r.time,locations:[]
 }));
 const index=new DerivedSemanticIndex({model,readEligible:async()=>({scope:'fixed-synthetic',generation:1,items}),
  encode:async(kind,value)=>{calls.push({kind,value});return [1,0];}});
 assert.equal((await index.synchronize()).ok,true);
 assert.equal(index.status().expected,27);assert.equal(index.status().vectorBytes,216);
 assert.equal(calls.length,27);
 assert.equal(calls.some(c=>c.value.ref.id==='r24'),false);
 const result=await index.lookup('diagnostic query');
 assert.equal(result.items.length,5);assert.equal(result.usedSemantic,true);
 assert.deepEqual(retrievalCorpus,before);
 for(const row of result.items){
  const original=before.records.find(x=>x.id===row.ref.id);
  assert.equal(row.body,original.body);assert.equal(row.time,original.time);
  assert.equal(row.source,original.source);
 }
 // Known numerical vectors measure lifecycle only, never actual semantic quality.
});

async function actualFixture(){
 const texts=[
  'INDEX_ACTUAL 原话否定：没有批准合并。',
  'INDEX_ACTUAL 更正：原话与当前改写分开。',
  'INDEX_ACTUAL 引用：别人说“全部合并”，不是我的意见。',
  'INDEX_ACTUAL long '+('完整多段 👩🏽‍💻\n'.repeat(1000))+'FULL_END'
 ];
 const f=await completeFixture({texts});
 await f.s.finishFoundation();
 const memory=new MemoryService(f.s);await memory.ready();
 const records=await rows(f.s,'records'),all=(await rows(f.s,'blocks')).map(r=>r.value),calls=[];
 // IndexedDB key order is not capture order. Bind each action to its full original Source.
 const blocks=texts.map(text=>all.find(b=>records.find(r=>r.id===b.originalTextReference)?.value.originalText===text));
 assert.ok(blocks.every(Boolean),'each complete original Source must have its own block');
 assert.equal(new Set(blocks.map(b=>b.id)).size,4);
 assert.deepEqual(blocks.map(b=>records.find(r=>r.id===b.originalTextReference).value.originalText),texts);
 const index=createMaterialSemanticIndex(memory,{model,scope:{types:['input']},encode:async(kind,value)=>{
  calls.push({kind,value:structuredClone(value)});return [1,0];
 }});
 return {...f,blocks,memory,index,calls};
}
const authority=async s=>Object.fromEntries(await Promise.all([
 'records','recordIndex','blocks','inputStates','dependencies','tombstones'
].map(async name=>[name,await rows(s,name)])));

test('CPV1-07 actual IndexedDB edits/exclusion/purge invalidate vectors without changing Source or task authority',async()=>{
 const f=await actualFixture(),originals=await rows(f.s,'records'),before=await authority(f.s);
 assert.equal((await f.index.synchronize()).ok,true);assert.equal(f.index.status().indexed,4);
 assert.deepEqual(await authority(f.s),before);assert.equal(f.requests.length,0);
 const block=f.blocks[0];
 await inputEdit(f.s,block.id,{libraryText:'INDEX_WORKED 完整的新工作表达，原话不是替代值。'});
 const editedAuthority=await authority(f.s);
 assert.equal((await f.index.lookup('diagnostic')).reason,'index_incomplete');
 assert.equal(f.index.status().indexed,3);
 await f.index.synchronize();assert.equal(f.calls.filter(x=>x.kind==='document').length,5);
 const edited=await f.index.lookup('diagnostic');
 assert.equal(edited.items.find(x=>x.ref.id===block.id).body,'INDEX_WORKED 完整的新工作表达，原话不是替代值。');
 assert.equal(edited.items.find(x=>x.ref.id===block.id).ref.revision,1);
 assert.deepEqual(await authority(f.s),editedAuthority);assert.deepEqual(await rows(f.s,'records'),originals);
 await f.memory.exclude({inputId:f.blocks[1].id,excluded:true});
 await f.s.permanentDelete(f.blocks[2].originalTextReference);
 const deniedAuthority=await authority(f.s),result=await f.index.lookup('diagnostic');
 assert.equal(result.usedSemantic,true);assert.equal(result.items.length,2);
 assert.equal(f.index.status().indexed,2);
 assert.ok(result.items.every(x=>![f.blocks[1].id,f.blocks[2].id].includes(x.ref.id)));
 assert.deepEqual(await authority(f.s),deniedAuthority);
 assert.equal(f.calls.filter(x=>x.kind==='document').length,5);assert.equal(f.requests.length,0);
 const long=result.items.find(x=>x.ref.id===f.blocks[3].id);
 assert.ok(long.body.endsWith('FULL_END'));assert.equal(long.body.split('完整多段').length-1,1000);
});

test('CPV1-07 hybrid cold fallback uses current full eligible evidence without encoding',async()=>{
 const long='anchor 完整原话 👩🏽‍💻\n'.repeat(1000)+'FULL_HYBRID_END';
 const f=fixture([item('a',long),item('b','unrelated evidence')]),before=f.get();
 const result=await f.index.lookupHybrid('anchor');
 assert.equal(result.mode,'lexical_fallback');assert.equal(result.reason,'index_incomplete');
 assert.equal(result.usedSemantic,false);assert.equal(f.calls.length,0);
 assert.equal(result.scope,before.scope);assert.equal(result.generation,before.generation);
 assert.equal(result.items.length,1);assert.equal(result.items[0].body,long);
 assert.deepEqual(result.items[0].ref,before.items[0].ref);
 result.items[0].body='consumer mutation';result.items[0].ref.revision=999;
 assert.deepEqual(f.get(),before);assert.equal(f.index.status().storesBody,false);
});

test('CPV1-07 hybrid independently verifies agreement, lexical ties and one query inference',async()=>{
 const originals=[item('a','anchor'),item('b','other evidence'),item('c','anchor extended')];
 const f=fixture(originals,{encode:async(kind,value)=>{
  return kind==='document'&&value.ref.id==='a'?[0,1]:[1,0];
 }});
 const before=f.get();await f.index.synchronize();
 let queries=0;const encode=f.index.encode;
 f.index.encode=async(...args)=>{if(args[0]==='query')queries++;return encode(...args);};
 const result=await f.index.lookupHybrid('anchor',{limit:3});
 assert.equal(result.mode,'hybrid');assert.equal(result.usedSemantic,true);
 assert.equal(queries,1);assert.deepEqual(result.items.map(x=>x.ref.id),['c','a','b']);
 assert.deepEqual(result.items.map(x=>x.score),[2/62,1/61,1/61]);
 for(const row of result.items){
  const original=before.items.find(x=>x.ref.id===row.ref.id);
  const {score,...evidence}=row;assert.deepEqual(evidence,original);
 }
 assert.deepEqual(f.get(),before);assert.equal(result.coverage.indexed,3);
});

test('CPV1-07 successful semantic abstention keeps lexical evidence and stays distinct from failure',async()=>{
 const f=fixture([item('a','anchor'),item('b','anchor extra')],{
  encode:async(kind)=>kind==='query'?[0,1]:[1,0]
 });
 await f.index.synchronize();const result=await f.index.lookupHybrid('anchor');
 assert.equal(result.mode,'hybrid');assert.equal(result.usedSemantic,true);
 assert.equal(result.reason,undefined);
 assert.deepEqual(result.items.map(x=>x.ref.id),['a','b']);
 assert.deepEqual(result.items.map(x=>x.score),[1/61,1/62]);
 assert.equal(result.coverage.state,'ready');
});

test('CPV1-07 hybrid encoder failure preserves verified current lexical fallback and fixed reason',async()=>{
 const f=fixture([item('a','anchor '+('整段证据\n'.repeat(1000)))],{
  encode:async(kind)=>{if(kind==='query')throw Error('PRIVATE_HYBRID_ENCODER_CANARY');return [1,0];}
 });
 await f.index.synchronize();const before=f.get(),result=await f.index.lookupHybrid('anchor');
 assert.equal(result.mode,'lexical_fallback');assert.equal(result.usedSemantic,false);
 assert.equal(result.reason,'index_unavailable');assert.equal(result.coverage.indexed,0);
 assert.equal(result.items[0].body,before.items[0].body);
 assert.deepEqual(f.get(),before);assert.doesNotMatch(JSON.stringify(result),/PRIVATE_HYBRID_/);
});

test('CPV1-07 hybrid source failure cannot expose an older lexical or semantic result',async()=>{
 const f=fixture([item('a','anchor')]);await f.index.synchronize();
 assert.equal((await f.index.lookupHybrid('anchor')).items.length,1);
 f.index.readEligible=async()=>{throw Error('PRIVATE_HYBRID_SOURCE_CANARY');};
 const result=await f.index.lookupHybrid('anchor');
 assert.equal(result.mode,'unavailable');assert.equal(result.reason,'index_unavailable');
 assert.deepEqual(result.items,[]);assert.equal(result.coverage.indexed,0);
 assert.doesNotMatch(JSON.stringify(result),/PRIVATE_HYBRID_/);
});

for(const [name,mutate]of [
 ['working revision',s=>{s.items[0].ref.revision++;s.items[0].body='new full expression';}],
 ['unversioned body',s=>{s.items[0].body='new actual body';}],
 ['source',s=>{s.items[0].source='claude';}],
 ['original time',s=>{s.items[0].time='2020-01-01T00:00:00Z';}],
 ['Topic placement',s=>{s.items[0].locations=[{topicId:'t',sectionId:null,topicName:'Actual'}];}],
 ['deletion or exclusion',s=>{s.items=s.items.slice(1);}],
 ['scope retraction',s=>{s.scope='different-owner-scope';}]
])test('CPV1-07 hybrid '+name+' during query refuses both old rankings',async()=>{
 const gate=barrier(),entered=barrier();
 const f=fixture([item('a','anchor'),item('b','anchor other')],{
  encode:async(kind)=>{if(kind==='query'){entered.release();await gate.promise;}return [1,0];}
 });
 await f.index.synchronize();const pending=f.index.lookupHybrid('anchor');await entered.promise;
 const next=f.get();mutate(next);next.generation++;f.set(next);gate.release();
 const result=await pending;
 assert.equal(result.mode,'unavailable');assert.equal(result.reason,'authority_changed');
 assert.equal(result.usedSemantic,false);assert.deepEqual(result.items,[]);
 assert.deepEqual(f.get(),next);
});

test('CPV1-07 hybrid invalidation during a query never resurrects old lexical evidence',async()=>{
 const gate=barrier(),entered=barrier();
 const f=fixture([item('a','anchor')],{encode:async(kind)=>{
  if(kind==='query'){entered.release();await gate.promise;}return [1,0];
 }});
 await f.index.synchronize();const pending=f.index.lookupHybrid('anchor');await entered.promise;
 f.index.invalidate();gate.release();
 const result=await pending;
 assert.equal(result.reason,'authority_changed');assert.deepEqual(result.items,[]);
 assert.equal(f.index.status().indexed,0);assert.equal(f.index.status().state,'empty');
});

test('CPV1-07 hybrid older query cannot retire a newer complete index generation',async()=>{
 const gate=barrier(),entered=barrier();
 const f=fixture([item('a','anchor')],{encode:async(kind)=>{
  if(kind==='query'){entered.release();await gate.promise;}return [1,0];
 }});
 await f.index.synchronize();const pending=f.index.lookupHybrid('anchor');await entered.promise;
 const next=f.get();next.generation++;next.items[0].body='anchor current complete body';
 next.items[0].ref.revision++;f.set(next);
 assert.equal((await f.index.synchronize()).ok,true);gate.release();
 assert.equal((await pending).reason,'authority_changed');
 assert.equal(f.index.status().state,'ready');assert.equal(f.index.status().checkedGeneration,2);
 assert.equal(f.index.status().indexed,1);
});

test('CPV1-07 hybrid empty query and invalid limits refuse before source or encoder acquisition',async()=>{
 const f=fixture();let reads=0;f.index.readEligible=async()=>{reads++;throw Error('must not read');};
 assert.equal((await f.index.lookupHybrid('  ')).reason,'empty_query');
 for(const [query,options]of [
  [null,{}],['q'.repeat(301),{}],['q',{limit:0}],['q',{limit:51}],
  ['q',{limit:1.5}],['q',{minimumScore:NaN}],['q',{minimumScore:true}],['q',{minimumScore:-1}]
 ])await assert.rejects(f.index.lookupHybrid(query,options),/^Error: semantic_index_invalid$/);
 assert.equal(reads,0);assert.equal(f.calls.length,0);
});

test('CPV1-07 actual scoped hybrid fallback honors edit/exclusion/purge and complete authority',async()=>{
 const f=await actualFixture(),originals=await rows(f.s,'records');
 const before=await authority(f.s);
 let result=await f.index.lookupHybrid('INDEX_ACTUAL');
 assert.equal(result.mode,'lexical_fallback');assert.equal(result.items.length,4);
 assert.equal(f.calls.length,0);assert.deepEqual(await authority(f.s),before);
 await f.index.synchronize();
 const block=f.blocks[0],body='HYBRID_CURRENT '+('新完整表达 👩🏽‍💻\n'.repeat(1000))+'CURRENT_END';
 await inputEdit(f.s,block.id,{libraryText:body});
 const edited=await authority(f.s);
 result=await f.index.lookupHybrid('HYBRID_CURRENT');
 assert.equal(result.mode,'lexical_fallback');assert.equal(result.reason,'index_incomplete');
 assert.equal(result.items.length,1);assert.equal(result.items[0].ref.id,block.id);
 assert.equal(result.items[0].ref.revision,1);assert.equal(result.items[0].body,body);
 assert.deepEqual(await authority(f.s),edited);assert.deepEqual(await rows(f.s,'records'),originals);
 await f.index.synchronize();
 await f.memory.exclude({inputId:f.blocks[1].id,excluded:true});
 await f.s.permanentDelete(f.blocks[2].originalTextReference);
 const current=await authority(f.s);
 result=await f.index.lookupHybrid('INDEX_ACTUAL');
 assert.equal(result.mode,'hybrid');assert.equal(result.usedSemantic,true);
 assert.equal(result.coverage.expected,2);assert.equal(result.items.length,2);
 assert.ok(result.items.every(x=>![f.blocks[1].id,f.blocks[2].id].includes(x.ref.id)));
 assert.equal(result.items.find(x=>x.ref.id===block.id).body,body);
 const long=result.items.find(x=>x.ref.id===f.blocks[3].id);
 assert.ok(long.body.endsWith('FULL_END'));assert.equal(long.body.split('完整多段').length-1,1000);
 assert.deepEqual(await authority(f.s),current);assert.equal(f.requests.length,0);
});

test('CPV1-07 hybrid final snapshot fences a change after query encoding and refreshes coverage',async()=>{
 const f=fixture([item('a','anchor'),item('b','anchor other')]);await f.index.synchronize();
 let reads=0;
 f.index.readEligible=async()=>{
  if(++reads===2){
   const next=f.get();next.generation++;next.items[0].ref.revision++;
   next.items[0].body='anchor CURRENT_FINAL_READ';f.set(next);
  }
  return f.get();
 };
 const result=await f.index.lookupHybrid('anchor');
 assert.equal(reads,2);assert.equal(result.reason,'authority_changed');
 assert.deepEqual(result.items,[]);assert.equal(result.coverage.checkedGeneration,2);
 assert.equal(result.coverage.indexed,1);assert.equal(result.coverage.missing,1);
 assert.equal(result.coverage.state,'partial');
 assert.equal(f.calls.filter(x=>x.kind==='document').length,2);
 assert.equal(f.calls.filter(x=>x.kind==='query').length,1);
 const fresh=await f.index.lookupHybrid('anchor');
 assert.equal(fresh.mode,'lexical_fallback');assert.equal(fresh.reason,'index_incomplete');
 assert.equal(fresh.items.find(x=>x.ref.id==='a').body,'anchor CURRENT_FINAL_READ');
 assert.equal(fresh.items.find(x=>x.ref.id==='a').ref.revision,1);
 assert.equal(f.calls.filter(x=>x.kind==='document').length,2);
 assert.equal(f.calls.filter(x=>x.kind==='query').length,1);
});

for(const [documentScale,queryScale]of [[.995,.995],[1.005,1.005],[.995,1.005],[1.005,.995]])
test('CPV1-07 cosine admission is scale independent within existing tolerance '+documentScale+'/'+queryScale,async()=>{
 const angle=Math.acos(.7),long='完整原始材料。👩🏽‍💻\n'.repeat(1000)+'FULL_COSINE_END';
 const snapshot={scope:'owned-cosine-scope',generation:1,items:[item('a',long),item('b')]};
 const document=new Float32Array([documentScale*Math.cos(angle),documentScale*Math.sin(angle)]);
 const original=Array.from(document);let documents=0,queries=0;
 const index=new DerivedSemanticIndex({model,readEligible:async()=>structuredClone(snapshot),
  encode:async(kind,value)=>{
   if(kind==='query'){queries++;return new Float32Array([queryScale,0]);}
   documents++;return value.ref.id==='a'?document:new Float32Array([-documentScale,0]);
  }});
 assert.equal((await index.synchronize()).ok,true);
 const admitted=await index.lookup('query',{minimumScore:.6999999});
 assert.deepEqual(admitted.items.map(x=>x.ref.id),['a']);
 assert.ok(Math.abs(admitted.items[0].score-.7)<1e-7);
 assert.equal(admitted.items[0].body,long);assert.equal(admitted.items[0].body.split('完整原始材料。').length-1,1000);
 const refused=await index.lookup('query',{minimumScore:.7000001});
 assert.deepEqual(refused.items,[]);assert.equal(refused.usedSemantic,true);
 assert.equal(documents,2);assert.equal(queries,2);
 assert.deepEqual(Array.from(document),original);
 assert.equal(index.status().vectorBytes,16);
 assert.deepEqual(snapshot.items[0].body,long);
});

test('CPV1-07 Float32 identical high-dimension cosine cannot exceed one or exclude an exact match',async()=>{
 const highModel={...model,dimension:768},shared=Float32Array.from({length:768},(_,i)=>
  (i%2?-1:1)*1.005/Math.sqrt(768)),before=Array.from(shared);
 const index=new DerivedSemanticIndex({model:highModel,
  readEligible:async()=>({scope:'owned-high-dimension',generation:1,items:[item('a')]}),
  encode:async()=>shared});
 assert.equal((await index.synchronize()).ok,true);
 const result=await index.lookup('exact query',{minimumScore:1});
 assert.equal(result.usedSemantic,true);assert.equal(result.items.length,1);
 assert.equal(result.items[0].score,1);
 assert.equal(index.status().vectorBytes,768*4);
 assert.deepEqual(Array.from(shared),before);
});

test('CPV1-07 complete multi-batch snapshot preserves all identities, long content and deterministic authority',async()=>{
 const full='LONG_COMPLETE_'.repeat(1000)+'LAST_MATERIAL_END';
 const materials=Array.from({length:513},(_,i)=>item(
  'batch-'+String(i).padStart(4,'0'),i===512?full:'complete material '+i));
 const f=fixture(materials,{maxItems:513}),before=f.get();
 const first=await f.index.snapshot();
 assert.equal(first.bindings.length,513);
 assert.equal(new Set(first.bindings.map(x=>x.key)).size,513);
 assert.equal(first.bindings.find(x=>x.row.ref.id==='batch-0512').row.body,full);
 assert.equal(first.bindings.find(x=>x.row.ref.id==='batch-0512').row.body.endsWith('LAST_MATERIAL_END'),true);
 const reordered=f.get();reordered.items.reverse();f.set(reordered);
 const second=await f.index.snapshot();
 assert.deepEqual(second.bindings.map(x=>[x.key,x.digest]),
  first.bindings.map(x=>[x.key,x.digest]));
 assert.equal(second.signature,first.signature);
 const changed=f.get();changed.items[0].body+=' changed without a revision bump';f.set(changed);
 const third=await f.index.snapshot();
 assert.notEqual(third.signature,first.signature);
 assert.equal(third.bindings.length,513);
 assert.deepEqual(before.items[512].body,full);
 assert.equal(f.calls.length,0);
});

test('CPV1-07 hybrid reuses first full snapshot across a 513-material long-content query',async()=>{
 const full='RARE_LONG_FINAL 保留否定、修正和原话。\n'.repeat(1000)+'LONG_EVIDENCE_END';
 const materials=Array.from({length:513},(_,i)=>item(
  'query-'+String(i).padStart(4,'0'),i===512?full:'ordinary complete material '+i));
 const f=fixture(materials,{maxItems:513}),before=f.get();
 assert.equal((await f.index.synchronize()).ok,true);
 assert.equal(f.calls.filter(x=>x.kind==='document').length,513);
 const read=f.index.readEligible;let reads=0;
 f.index.readEligible=async()=>{reads++;return read();};
 const result=await f.index.lookupHybrid('RARE_LONG_FINAL');
 assert.equal(reads,2,'first complete authority snapshot and final hybrid fence');
 assert.equal(result.mode,'hybrid');assert.equal(result.usedSemantic,true);
 assert.equal(result.coverage.expected,513);assert.equal(result.coverage.indexed,513);
 assert.equal(f.calls.filter(x=>x.kind==='document').length,513);
 assert.equal(f.calls.filter(x=>x.kind==='query').length,1);
 assert.equal(result.items.find(x=>x.ref.id==='query-0512')?.body,full);
 assert.deepEqual(f.get(),before);
});

test('CPV1-07 hybrid final fence rejects generation-only churn without stale ranking',async()=>{
 const f=fixture([item('a','anchor'),item('b','anchor other')]);
 assert.equal((await f.index.synchronize()).ok,true);
 const before=f.get(),read=f.index.readEligible;let reads=0;
 f.index.readEligible=async()=>{
  const snapshot=await read();reads++;
  if(reads===2)snapshot.generation++;
  return snapshot;
 };
 const result=await f.index.lookupHybrid('anchor');
 assert.equal(reads,2);
 assert.equal(result.mode,'unavailable');assert.equal(result.reason,'authority_changed');
 assert.equal(result.usedSemantic,false);assert.deepEqual(result.items,[]);
 assert.equal(f.calls.filter(x=>x.kind==='query').length,1);
 assert.deepEqual(f.get(),before);
});

test('CPV1-07 empty lookup rechecks complete authority before claiming verified abstention',async()=>{
 let reads=0,encodes=0;
 const index=new DerivedSemanticIndex({model,
  readEligible:async()=>{reads++;return {scope:'scope',generation:1,items:[]};},
  encode:async()=>{encodes++;return [1,0];}
 });
 const result=await index.lookup('query');
 assert.equal(reads,2);assert.equal(encodes,0);
 assert.equal(result.usedSemantic,true);assert.deepEqual(result.items,[]);
 assert.equal(result.coverage.state,'ready');assert.equal(result.coverage.expected,0);
});

test('CPV1-07 empty lookup refuses a newly eligible item or changed scope',async()=>{
 for(const changed of [
  {scope:'scope',generation:2,items:[item('arrived','Complete late evidence')]},
  {scope:'revoked-scope',generation:2,items:[]}
 ]){
  let reads=0,encodes=0;
  const index=new DerivedSemanticIndex({model,
   readEligible:async()=>structuredClone(++reads===1
    ?{scope:'scope',generation:1,items:[]}:changed),
   encode:async()=>{encodes++;return [1,0];}
  });
  const result=await index.lookup('query');
  assert.equal(reads,2);assert.equal(encodes,0);
  assert.equal(result.usedSemantic,false);assert.equal(result.reason,'authority_changed');
  assert.deepEqual(result.items,[]);assert.equal(result.coverage.state,'partial');
  assert.equal(result.coverage.expected,changed.items.length);
  assert.equal(result.coverage.indexed,0);
 }
});

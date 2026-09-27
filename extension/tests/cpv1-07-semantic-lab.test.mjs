import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSemanticLabIndex,validateUnitVector} from '../experiments/semantic-lab-index.mjs';
import {retrievalCorpus} from './fixtures/cpv1-07-retrieval-corpus.mjs';
import {eligibleRecords,evaluateRetrieval} from '../experiments/retrieval-evaluation.mjs';

const records=[
  {id:'a',title:'alpha',body:'first',source:'chatgpt',time:null,excluded:false},
  {id:'b',title:'beta',body:'second',source:'claude',time:null,excluded:false},
  {id:'c',title:'gamma',body:'third',source:'chatgpt',time:null,excluded:false},
];
test('CPV1-07 semantic lab uses distinct passage/query prefixes and reuses the frozen document projection',async()=>{
  const calls=[];
  const encode=async text=>{
    calls.push(text);
    return text.startsWith('passage: beta')?[0,1]:[1,0];
  };
  const index=await buildSemanticLabIndex(records,encode,{dimension:2});
  assert.equal(index.projectedRecords,3);
  assert.equal(index.float32ProjectionBytes,24);
  assert.equal(index.serializedProjectionBytes>24,true);
  assert.deepEqual(await index.retrieve([records[1],records[0]],'query text'),['a']);
  assert.deepEqual(await index.retrieve([records[2]],'another'),['c']);
  assert.deepEqual(calls,[
    'passage: alpha\nfirst','passage: beta\nsecond','passage: gamma\nthird',
    'query: query text','query: another']);
});
test('CPV1-07 semantic lab independently ranks known cosines and abstains below the frozen threshold',async()=>{
  const encode=async text=>text.startsWith('passage: beta')?[.6,.8]:
    text.startsWith('passage: gamma')?[.8,.6]:[1,0];
  const index=await buildSemanticLabIndex(records,encode,{dimension:2,minimumScore:.7});
  assert.deepEqual(await index.retrieve(records,'nonempty'),['a','c']);
  assert.deepEqual(await index.retrieve([records[1]],'nonempty'),[]);
  assert.deepEqual(await index.retrieve(records,' '),[]);
  assert.deepEqual(await index.retrieve([],'nonempty'),[]);
});
for(const [label,vector] of [
  ['nonfinite',[1,NaN]],['wrong dimension',[1,0,0]],['zero',[0,0]],
  ['unnormalized',[2,0]],['not array',new Float32Array([1,0])],
])test('CPV1-07 semantic lab rejects '+label+' vectors before ranking',async()=>{
  assert.throws(()=>validateUnitVector(vector,2),/invalid semantic lab projection/);
  await assert.rejects(buildSemanticLabIndex(records,async()=>vector,{dimension:2}),
    /invalid semantic lab projection/);
});
test('CPV1-07 semantic projection refuses revision/source/exclusion/unknown and duplicate substitutions',async()=>{
  const calls=[];
  const index=await buildSemanticLabIndex(records,async text=>{calls.push(text);return[1,0];},{dimension:2});
  for(const eligible of [
    [{...records[0],body:'changed'}],[{...records[0],source:'claude'}],
    [{...records[0],time:'2026-09-01T00:00:00.000Z'}],[{...records[0],excluded:true}],
    [{...records[0],id:'unknown'}],[records[0],records[0]],
  ])await assert.rejects(index.retrieve(eligible,'query'),/invalid semantic lab projection/);
  assert.equal(calls.length,3,'refused scope must not encode a query');
  await assert.rejects(buildSemanticLabIndex([{...records[0],excluded:true}],async()=>[1,0],{dimension:2}));
  await assert.rejects(buildSemanticLabIndex([records[0],records[0]],async()=>[1,0],{dimension:2}));
});
test('CPV1-07 semantic candidate receives only fixed date/source eligible scope and no relevance labels',async()=>{
  const before=JSON.stringify(retrievalCorpus);
  const index=await buildSemanticLabIndex(retrievalCorpus.records.filter(r=>!r.excluded),
    async()=>[1,0],{dimension:2});
  const report=await evaluateRetrieval(retrievalCorpus,async(eligible,query)=>{
    assert.equal(Object.hasOwn(eligible,'relevance'),false);
    assert.equal(eligible.some(r=>r.excluded),false);
    return index.retrieve(eligible,query);
  },{method:'multilingual-e5-small-onnx-lab-v1'});
  assert.equal(report.taskCount,29);
  assert.equal(report.measuredTasks,29);
  assert.equal(report.contractFailures,0);
  assert.equal(report.productionClaim,false);
  assert.equal(report.semanticCapabilityEstablished,false);
  assert.equal(report.aggregate.noAnswerAbstention,0,'positive ranking cannot manufacture no-answer quality');
  assert.equal(JSON.stringify(retrievalCorpus),before);
  const dated=retrievalCorpus.tasks.find(t=>t.category==='date_constraint');
  const ids=await index.retrieve(eligibleRecords(retrievalCorpus,dated),dated.query);
  assert.equal(ids.every(id=>eligibleRecords(retrievalCorpus,dated).some(r=>r.id===id)),true);
});

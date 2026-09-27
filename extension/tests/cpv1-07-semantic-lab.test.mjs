import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {buildSemanticLabIndex,validateUnitVector,fuseScopedLabRanks,HYBRID_RANK_RULE} from '../experiments/semantic-lab-index.mjs';
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

test('CPV1-07 actual probe failure exposes a fixed receipt without dependency/path/key/error echo',()=>{
  const path=fileURLToPath(new URL('../scripts/run-semantic-retrieval-lab.mjs',import.meta.url));
  const result=spawnSync(process.execPath,[path],{encoding:'utf8',timeout:10000,
    env:{...process.env,PAIA_SEMANTIC_LAB_ROOT:'PRIVATE_LAB_PATH_CANARY',
      PAIA_PUBLIC_MODEL_CACHE:'PRIVATE_CACHE_PATH_CANARY',HF_TOKEN:'PRIVATE_TOKEN_CANARY'}});
  assert.equal(result.status,1);
  assert.equal(result.stderr,'');
  const report=JSON.parse(result.stdout);
  assert.equal(report.status,'UNAVAILABLE');
  assert.equal(report.stage,'lab_environment');
  assert.equal(report.reason,'invalid_lab_environment');
  assert.equal(report.qualityGate,'NOT_EVALUATED');
  assert.equal(report.productionClaim,false);
  assert.deepEqual(report.publicObservations,[]);
  assert.equal(result.stdout.includes('PRIVATE'),false);
  assert.equal(result.stdout.includes('query:'),false);
});

test('CPV1-07 hybrid frozen equal RRF rule preserves each single-source order and real abstention',()=>{
  assert.deepEqual(HYBRID_RANK_RULE,{algorithm:'reciprocal_rank_fusion',constant:60,
    lexicalWeight:1,semanticWeight:1,limit:5,productionClaim:false});
  assert.equal(Object.isFrozen(HYBRID_RANK_RULE),true);
  assert.deepEqual(fuseScopedLabRanks(records,['c','a','b'],[]),['c','a','b']);
  assert.deepEqual(fuseScopedLabRanks(records,[],['b','c','a']),['b','c','a']);
  assert.deepEqual(fuseScopedLabRanks(records,[],[]),[]);
  assert.deepEqual(fuseScopedLabRanks([],[],[]),[]);
});

test('CPV1-07 hybrid independently verifies reciprocal-rank sum, agreement and lexical tie order',()=>{
  assert.deepEqual(fuseScopedLabRanks(records,['a','b'],['c','b']),['b','a','c']);
  assert.deepEqual(fuseScopedLabRanks(records,['a','b'],['b','a']),['a','b']);
  assert.deepEqual(fuseScopedLabRanks(records,['b','a'],['a','b']),['b','a']);
  assert.deepEqual(fuseScopedLabRanks(records,['a'],['a']),['a']);
});

test('CPV1-07 hybrid is finite across ten distinct candidates and never mutates complete evidence',()=>{
  const eligible=Object.freeze(Array.from({length:10},(_,i)=>Object.freeze({
    id:'h'+i,excluded:false,title:'完整标题'+i,
    body:('原始长正文 👩🏽‍💻 <literal> 否定和引用不等于信念\n').repeat(1000),
    source:i%2?'claude':'chatgpt',time:i%2?null:'2026-09-01T00:00:00.000Z'})));
  const lexical=Object.freeze(['h0','h1','h2','h3','h4']);
  const semantic=Object.freeze(['h5','h6','h7','h8','h9']);
  const before=JSON.stringify([eligible,lexical,semantic]);
  const ids=fuseScopedLabRanks(eligible,lexical,semantic);
  assert.deepEqual(ids,['h0','h5','h1','h6','h2']);
  assert.equal(ids.length,5);assert.equal(new Set(ids).size,5);
  ids.reverse();
  assert.equal(JSON.stringify([eligible,lexical,semantic]),before);
  assert.deepEqual(fuseScopedLabRanks(eligible,lexical,semantic),['h0','h5','h1','h6','h2']);
});

for(const [name,lexical,semantic]of [
  ['duplicate lexical',['a','a'],['b']],
  ['duplicate semantic',['a'],['b','b']],
  ['unknown lexical',['PRIVATE_RECORD'],['b']],
  ['unknown semantic',['a'],['PRIVATE_RECORD']],
  ['too many lexical',['a','b','c','a','b','c'],[]],
  ['too many semantic',[],['a','b','c','a','b','c']],
  ['invalid lexical',[null],['b']],
  ['invalid semantic',['a'],[{}]],
]){
  test('CPV1-07 hybrid refuses '+name+' before producing a ranked result',()=>{
    assert.throws(()=>fuseScopedLabRanks(records,lexical,semantic),
      error=>error.message==='invalid semantic lab projection'
        &&!error.message.includes('PRIVATE'));
  });
}

test('CPV1-07 hybrid scope refuses excluded, duplicate and malformed eligible identity',()=>{
  for(const scope of [[{...records[0],excluded:true}], [records[0],records[0]],
    [{...records[0],excluded:0}], [{...records[0],id:''}], [null], 'PRIVATE_SCOPE']){
    assert.throws(()=>fuseScopedLabRanks(scope,[],[]),
      error=>error.message==='invalid semantic lab projection');
  }
  assert.throws(()=>fuseScopedLabRanks(records,null,[]));
  assert.throws(()=>fuseScopedLabRanks(records,[],{}));
});

test('CPV1-07 hybrid complete fixed date/source/unknown/exclusion scopes admit only eligible ranks',async()=>{
  const original=JSON.stringify(retrievalCorpus);
  assert.equal(retrievalCorpus.records.length,28);assert.equal(retrievalCorpus.tasks.length,29);
  for(const task of retrievalCorpus.tasks){
    const eligible=eligibleRecords(retrievalCorpus,task);
    const sample=eligible.slice(0,5).map(row=>row.id);
    assert.deepEqual(fuseScopedLabRanks(eligible,sample,[]),sample);
    const outside=retrievalCorpus.records.find(row=>!eligible.some(allowed=>allowed.id===row.id));
    if(outside)assert.throws(()=>fuseScopedLabRanks(eligible,[],[outside.id]));
    const detached=eligible.map(row=>({...row,evidenceRole:'quotation',
      relevance:'PRIVATE_LABEL_MUST_NOT_INFLUENCE_RANKING'}));
    assert.deepEqual(fuseScopedLabRanks(detached,sample,[]),sample);
  }
  const measured=await evaluateRetrieval(retrievalCorpus,(scope)=>{
    const lexical=scope.slice(0,5).map(row=>row.id);
    return fuseScopedLabRanks(scope,lexical,[]);
  },{method:'official-hybrid-rrf-lab-v1'});
  assert.equal(measured.contractFailures,0);assert.equal(measured.measuredTasks,29);
  assert.equal(measured.productionClaim,false);assert.equal(measured.semanticCapabilityEstablished,false);
  assert.equal(measured.personalBeliefJudgment,false);
  assert.equal(JSON.stringify(retrievalCorpus),original);
});

import {calibrationCorpus} from './fixtures/cpv1-07-calibration-corpus.mjs';
import {CALIBRATION_RULE,validateCalibrationCorpus,calibrateDevelopmentThreshold,rankCalibrationScores}
  from '../experiments/semantic-calibration.mjs';

test('CPV1-07 development calibration freezes disjoint complete content and refuses gold/label substitutions',()=>{
  assert.equal(validateCalibrationCorpus(calibrationCorpus,retrievalCorpus),true);
  assert.equal(calibrationCorpus.records.length,9);assert.equal(calibrationCorpus.tasks.length,16);
  assert.equal(Object.isFrozen(CALIBRATION_RULE),true);
  assert.equal(Object.isFrozen(CALIBRATION_RULE.thresholds),true);
  const copy=()=>JSON.parse(JSON.stringify(calibrationCorpus));
  for(const alter of [
    c=>c.records[0].id='r01',
    c=>c.records[0].body=retrievalCorpus.records[0].body,
    c=>c.tasks[0].query=retrievalCorpus.tasks[0].query,
    c=>c.tasks[0].relevant=['d09'],
    c=>c.tasks[0].relevant=['d01','d01'],
    c=>c.tasks[0].id=c.tasks[1].id,
    c=>c.tasks[0].query=c.tasks[1].query,
    c=>c.records.pop(),c=>c.tasks.pop(),
    c=>c.tasks[8].relevant=['d01'],
    c=>c.records[0].privatePath='PRIVATE_CALIBRATION_CANARY',
  ]){
    const c=copy();alter(c);
    assert.throws(()=>validateCalibrationCorpus(c,retrievalCorpus),
      e=>e.message==='invalid semantic development calibration'&&!e.message.includes('PRIVATE'));
  }
});
test('CPV1-07 raw lab scores retain below-cutoff cosines without changing original frozen retrieval',async()=>{
  const calls=[];
  const index=await buildSemanticLabIndex(records,async value=>{
    calls.push(value);return value.startsWith('passage: beta')?[.6,.8]:
      value.startsWith('passage: gamma')?[.8,.6]:[1,0];
  },{dimension:2});
  const scope=[records[1],records[0],records[2]];
  const scored=await index.score(scope,'complete query');
  assert.deepEqual(scored,[{id:'b',score:.6},{id:'a',score:1},{id:'c',score:.8}]);
  assert.deepEqual(rankCalibrationScores(scored,.7),['a','c']);
  assert.deepEqual(await index.retrieve(scope,'complete query'),['a','c']);
  scored[0].score=1;scored.reverse();
  assert.deepEqual(await index.retrieve(scope,'complete query'),['a','c']);
  const count=calls.length;
  await assert.rejects(index.score([{...records[0],body:'substituted'}],'PRIVATE_QUERY'));
  assert.equal(calls.length,count);
});
const calibrationScoreFixture=(positiveScore,negativeScore)=>async(scope,query)=>{
  // Test oracle alone knows development relevance; the passed candidate API
  // has no label/category/excluded record/fixed-gold fields.
  assert.equal(scope.length,8);assert.equal(Object.isFrozen(scope),true);
  assert.equal(scope.some(row=>row.id==='d09'),false);
  assert.equal(scope.every(row=>Object.isFrozen(row)
    &&Object.keys(row).sort().join(',')==='body,excluded,id,title'),true);
  const task=calibrationCorpus.tasks.find(t=>t.query===query);
  return scope.map(row=>({id:row.id,score:task.relevant.includes(row.id)
    ?positiveScore:task.relevant.length ? .1 : negativeScore}));
};
test('CPV1-07 development selection applies strict no-answer constraint and finite deterministic tie rule',async()=>{
  const original=JSON.stringify([calibrationCorpus,retrievalCorpus]);
  const report=await calibrateDevelopmentThreshold(calibrationCorpus,retrievalCorpus,
    calibrationScoreFixture(.82,.51));
  assert.equal(report.status,'DEVELOPMENT_THRESHOLD_SELECTED');
  assert.equal(report.selectedThreshold,.8);
  assert.equal(report.comparisons.length,12);
  const row=report.comparisons.find(r=>r.threshold===.5);
  assert.equal(row.positiveHits,8);assert.equal(row.falsePositives,8);assert.equal(row.admissible,false);
  assert.equal(report.comparisons.find(r=>r.threshold===.8).positiveHits,8);
  assert.equal(report.comparisons.find(r=>r.threshold===.85).positiveHits,0);
  assert.equal(report.additionalModelQueries,16);
  assert.equal(report.selectionExcludedFixedEvaluation,true);
  assert.equal(report.blindAcceptance,false);assert.equal(report.modelAdmitted,false);
  assert.equal(report.productionThresholdChanged,false);
  assert.equal(JSON.stringify([calibrationCorpus,retrievalCorpus]),original);
  for(const privateValue of ['发面记录',calibrationCorpus.tasks[0].query,'"scores"','"relevant"'])
    assert.equal(JSON.stringify(report).includes(privateValue),false);
});
test('CPV1-07 development calibration refuses lowering standards when no cutoff meets both frozen constraints',async()=>{
  const report=await calibrateDevelopmentThreshold(calibrationCorpus,retrievalCorpus,
    calibrationScoreFixture(.52,.75));
  assert.equal(report.status,'NO_ADMISSIBLE_DEVELOPMENT_THRESHOLD');
  assert.equal(report.selectedThreshold,null);assert.equal(report.comparisons.some(r=>r.admissible),false);
  assert.equal(report.productionClaim,false);assert.equal(report.modelAdmitted,false);
});
test('CPV1-07 development scoring rejects duplicate/outside/partial/nonfinite rows and in-flight corpus mutation',async()=>{
  for(const alter of [
    rows=>rows.pop(),rows=>rows[0].id='PRIVATE_UNKNOWN_CANARY',
    rows=>rows[0].id=rows[1].id,rows=>rows[0].score=NaN,
    rows=>rows[0].score=Infinity,rows=>rows[0].score=1.1,
    rows=>rows[0].query='PRIVATE_QUERY_CANARY',
  ]){
    await assert.rejects(calibrateDevelopmentThreshold(calibrationCorpus,retrievalCorpus,async(scope,query)=>{
      const rows=await calibrationScoreFixture(.82,.51)(scope,query);alter(rows);return rows;
    }),e=>e.message==='invalid semantic development calibration'&&!e.message.includes('PRIVATE'));
  }
  const c=JSON.parse(JSON.stringify(calibrationCorpus));
  await assert.rejects(calibrateDevelopmentThreshold(c,retrievalCorpus,async(scope)=>{
    c.tasks[0].relevant=[];return scope.map(row=>({id:row.id,score:.8}));
  }),/invalid semantic development calibration/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {queryTerms} from '../core/search-service.js';
import {retrievalCorpus} from './fixtures/cpv1-07-retrieval-corpus.mjs';
import {validateRetrievalCorpus,eligibleRecords,productionLexicalCandidate,
  buildCharacterIndex,evaluateRetrieval} from '../experiments/retrieval-evaluation.mjs';

const clone=()=>structuredClone(retrievalCorpus);
const method='lexical-production-v1';

test('CPV1-07 fixed synthetic labels retain all mandatory task classes and quoted/corrected/unknown evidence',()=>{
  assert.equal(validateRetrievalCorpus(retrievalCorpus),true);
  assert.equal(retrievalCorpus.records.length,28);
  assert.equal(retrievalCorpus.tasks.length,29);
  assert.deepEqual([...new Set(retrievalCorpus.tasks.map(task=>task.category))],[
    'lexical','paraphrase_zh','fuzzy_recollection','no_shared_keywords','negation','correction',
    'quotation_vs_belief','no_answer','date_constraint','source_constraint',
    'date_source_constraint','exclusion','unknown_time']);
  for(const task of retrievalCorpus.tasks.filter(task=>task.category==='no_shared_keywords')) {
    const terms=queryTerms(task.query);
    for(const id of Object.keys(task.relevance)) {
      const record=retrievalCorpus.records.find(record=>record.id===id);
      const text=(record.title+'\n'+record.body).normalize('NFKC').toLowerCase();
      assert.equal(terms.some(term=>text.includes(term)),false,
        'no-shared-keyword task must not quietly become lexical');
    }
  }
  assert.equal(retrievalCorpus.records.find(record=>record.id==='r13').evidenceRole,'quotation');
  assert.equal(retrievalCorpus.records.find(record=>record.id==='r06').evidenceRole,'correction');
  assert.equal(retrievalCorpus.records.find(record=>record.id==='r22').time,null);
  assert.equal(retrievalCorpus.records.find(record=>record.id==='r24').excluded,true);
});

test('CPV1-07 independent ranked labels measure missed answers, wrong first hits and actual abstention',async()=>{
  const corpus=clone();
  corpus.tasks=corpus.tasks.filter(task=>['t01','t18','t21'].includes(task.id));
  const outputs={'派生索引':['r22','r21'],
    '城市意向从海边改到内地的明确选择':['r06','r05'],'我确定买的汽车品牌是什么':[]};
  const report=await evaluateRetrieval(corpus,async (_records,query)=>outputs[query],{method});
  assert.equal(report.contractFailures,0);
  assert.equal(report.measuredTasks,3);
  assert.deepEqual(report.rows.map(row=>row.reciprocalRankAt5),[.5,1,null]);
  assert.deepEqual(report.rows.map(row=>row.recallAt5),[1,1,null]);
  assert.equal(report.aggregate.mrrAt5,.75);
  assert.equal(report.aggregate.noAnswerAbstention,1);
  assert.equal(report.semanticCapabilityEstablished,false);
  assert.equal(report.personalBeliefJudgment,false);
  assert.equal(report.productionClaim,false);
});

for(const [name,output,reason] of [
  ['excluded',['r24'],'scope_or_unknown_record'],
  ['unknown',['PRIVATE_UNKNOWN_RECORD'],'scope_or_unknown_record'],
  ['duplicate',['r21','r21'],'duplicate_result'],
  ['private mapping',{private:'PRIVATE_RESULT_BODY'},'invalid_result_contract'],
  ['too many',['r01','r02','r03','r04','r05','r06'],'invalid_result_contract']
]) test('CPV1-07 refuses '+name+' result instead of silently filtering or reporting private data',async()=>{
  const corpus=clone();corpus.tasks=corpus.tasks.filter(task=>task.id==='t01');
  const report=await evaluateRetrieval(corpus,async ()=>output,{method});
  assert.equal(report.contractFailures,1);
  assert.equal(report.measuredTasks,0);
  assert.equal(report.rows[0].reason,reason);
  assert.equal(report.aggregate.mrrAt5,null);
  assert.equal(JSON.stringify(report).includes('PRIVATE'),false);
});

test('CPV1-07 candidate exception is a measured contract failure without diagnostic echo',async()=>{
  const corpus=clone();corpus.tasks=corpus.tasks.filter(task=>task.id==='t01');
  const report=await evaluateRetrieval(corpus,async ()=>{throw new Error('PRIVATE_MODEL_CANARY')},{method});
  assert.equal(report.rows[0].reason,'candidate_error');
  assert.equal(report.contractFailures,1);
  assert.equal(JSON.stringify(report).includes('PRIVATE'),false);
});

for(const [name,mutate] of [
  ['invalid calendar day',c=>{c.records[0].time='2025-02-30T08:00:00.000Z'}],
  ['duplicate record',c=>{c.records[1].id=c.records[0].id}],
  ['truthy exclusion',c=>{c.records[0].excluded='false'}],
  ['excluded gold',c=>{c.tasks[0].relevance={r24:3}}],
  ['out of time gold',c=>{c.tasks.find(t=>t.id==='t24').relevance={r18:3}}],
  ['unknown time inferred',c=>{c.tasks.find(t=>t.id==='t29').relevance={r23:3}}]
]) test('CPV1-07 frozen evaluation refuses '+name+' before invoking a candidate',async()=>{
  const corpus=clone();mutate(corpus);let called=false;
  await assert.rejects(()=>evaluateRetrieval(corpus,async ()=>{called=true;return []},{method}),
    /invalid synthetic retrieval benchmark/);
  assert.equal(called,false);
});

test('CPV1-07 date/source/exclusion filters reach the existing lexical scorer and leave corpus immutable',async()=>{
  const baseline=JSON.stringify(retrievalCorpus);
  const seen=[];
  const report=await evaluateRetrieval(retrievalCorpus,(records,query)=>{
    assert.ok(Object.isFrozen(records));
    assert.ok(records.every(Object.isFrozen));
    assert.ok(records.every(record=>!record.excluded));
    seen.push([query,records.map(record=>record.id)]);
    return productionLexicalCandidate(records,query);
  },{method});
  assert.equal(report.contractFailures,0);
  assert.equal(report.rows.length,29);
  assert.equal(report.categories.no_shared_keywords.tasks,3);
  assert.equal(report.retrievalTiming.sampleCount,29);
  assert.ok(Number.isFinite(report.retrievalTiming.p95Ms));
  assert.equal(report.aggregate.noAnswerAbstention<=1,true);
  const dated=seen.find(([query])=>query==='按时间对比而不推断观点改变的旧表述')[1];
  assert.deepEqual(dated,['r21','r23']);
  const source=eligibleRecords(retrievalCorpus,retrievalCorpus.tasks.find(task=>task.id==='t26'));
  assert.ok(source.every(record=>record.source==='claude'));
  const unknown=eligibleRecords(retrievalCorpus,retrievalCorpus.tasks.find(task=>task.id==='t29'));
  assert.deepEqual(unknown.map(record=>record.id),['r22','r26']);
  assert.equal(JSON.stringify(retrievalCorpus),baseline);
  for(const record of retrievalCorpus.records)
    assert.equal(JSON.stringify(report).includes(record.body),false);
});

test('CPV1-07 reusable character lab projection remains scope-bound and is explicitly lexical',async()=>{
  const before=JSON.stringify(retrievalCorpus);
  const index=buildCharacterIndex(retrievalCorpus.records.filter(record=>!record.excluded));
  assert.equal(index.projectedRecords,27);
  assert.ok(index.serializedProjectionBytes>0);
  const task=retrievalCorpus.tasks.find(task=>task.id==='t26'),records=eligibleRecords(retrievalCorpus,task);
  const first=index.retrieve(records,task.query),second=index.retrieve(records,task.query);
  assert.deepEqual(second,first);
  assert.ok(first.every(id=>records.some(record=>record.id===id)));
  assert.equal(index.retrieve(records,'').length,0);
  const report=await evaluateRetrieval(retrievalCorpus,(rows,query)=>index.retrieve(rows,query),
    {method:'character-tfidf-lab-v1'});
  assert.equal(report.contractFailures,0);
  assert.equal(report.semanticCapabilityEstablished,false);
  assert.equal(JSON.stringify(retrievalCorpus),before);
});

test('CPV1-07 actual cloud bake-off script reports honest fixed-corpus quality/resources without material',()=>{
  const script=fileURLToPath(new URL('../scripts/run-retrieval-bakeoff.mjs',import.meta.url));
  const output=JSON.parse(execFileSync(process.execPath,[script],{encoding:'utf8',timeout:10000}));
  assert.equal(output.qualityGate,'NOT_EVALUATED_FOR_PRODUCTION');
  assert.equal(output.productionIndexEnabled,false);
  assert.equal(output.semanticCandidateSelected,false);
  assert.equal(output.networkRequests,0);
  assert.equal(output.modelDownloads,0);
  assert.equal(output.providerCost,0);
  assert.equal(output.reports.length,2);
  assert.equal(output.characterProjection.projectedRecords,27);
  for(const report of output.reports) {
    assert.equal(report.taskCount,29);
    assert.equal(report.recordCount,28);
    assert.equal(report.contractFailures,0);
    assert.match(report.corpusDigest,/^[a-f0-9]{64}$/);
    assert.equal(report.semanticCapabilityEstablished,false);
    assert.equal(report.retrievalTiming.scope,'this_fixed_synthetic_corpus_not_long_library');
  }
  assert.equal(output.reports[0].corpusDigest,output.reports[1].corpusDigest);
  for(const record of retrievalCorpus.records) assert.equal(JSON.stringify(output).includes(record.body),false);
  for(const task of retrievalCorpus.tasks) assert.equal(JSON.stringify(output).includes(task.query),false);
});


import {validateRetrievalMethod} from '../experiments/retrieval-evaluation.mjs';
for(const registered of ['official-multilingual-xlm-mean-onnx-lab-v1','official-xlm-hybrid-rrf-lab-v1']){
 test('CPV1-07 '+registered+' is admitted before encoding and evaluates the complete frozen corpus',async()=>{
  assert.equal(validateRetrievalMethod(registered),true);
  const original=JSON.stringify(retrievalCorpus),queries=[];
  const report=await evaluateRetrieval(retrievalCorpus,async(scope,query)=>{
   assert.equal(Object.isFrozen(scope),true);
   assert.equal(scope.every(row=>Object.isFrozen(row)&&row.excluded===false),true);
   queries.push(query);return [];
  },{method:registered});
  assert.equal(queries.length,29);assert.equal(report.taskCount,29);assert.equal(report.recordCount,28);
  assert.deepEqual(queries,retrievalCorpus.tasks.map(task=>task.query));
  assert.equal(report.method,registered);assert.equal(report.contractFailures,0);assert.equal(report.measuredTasks,29);
  assert.equal(report.aggregate.noAnswerAbstention,1);assert.equal(report.aggregate.mrrAt5,0);
  assert.equal(report.aggregate.recallAt5,0);assert.equal(report.aggregate.ndcgAt5,0);
  assert.equal(report.productionClaim,false);assert.equal(report.semanticCapabilityEstablished,false);
  assert.equal(report.personalBeliefJudgment,false);
  assert.deepEqual(report.rows.map(row=>row.id),retrievalCorpus.tasks.map(task=>task.id));
  assert.equal(JSON.stringify(retrievalCorpus),original);
 });
}
test('CPV1-07 unregistered method refuses before any candidate/tensor invocation without admitting arbitrary labels',async()=>{
 for(const rejected of [null,undefined,true,{},'PRIVATE_UNREGISTERED_METHOD','official-multilingual-xlm-mean-onnx-lab-v1 ']){
  assert.throws(()=>validateRetrievalMethod(rejected),/^Error: invalid synthetic retrieval benchmark$/);
  let calls=0;
  await assert.rejects(evaluateRetrieval(retrievalCorpus,async()=>{calls++;return [];},{method:rejected}),
   /^Error: invalid synthetic retrieval benchmark$/);
  assert.equal(calls,0);
 }
});


test('CPV1-07 new DistilUSE methods are separately registered and preserve the complete fixed oracle',async()=>{
 const {validateRetrievalMethod}=await import('../experiments/retrieval-evaluation.mjs');
 for(const method of ['official-distiluse-dense-tanh-onnx-lab-v1','official-distiluse-hybrid-rrf-lab-v1']){
  const report=await evaluateRetrieval(retrievalCorpus,productionLexicalCandidate,{method});
  assert.equal(report.method,method);assert.equal(report.measuredTasks,29);assert.equal(report.contractFailures,0);
  assert.doesNotThrow(()=>validateRetrievalMethod(method));
 }
 assert.throws(()=>validateRetrievalMethod('official-distiluse-PRODUCTION'),/invalid synthetic retrieval benchmark/);
 assert.equal(retrievalCorpus.records.length,28);assert.equal(retrievalCorpus.tasks.length,29);
});

test('VS07 retained complete DistilUSE measurement proves scalar-cutoff failure without inference',async()=>{
  const {readFile}=await import('node:fs/promises');
  const {diagnoseMeasuredCalibration}=await import('../scripts/diagnose-retrieval-calibration.mjs');
  const evidence=JSON.parse(await readFile(new URL(
    './evidence/vs07-distiluse-development-36340314593.json',import.meta.url),'utf8'));
  assert.equal(evidence.head,'f3a19ec9bae953daa8c126f26d047ba64eba6af9');
  assert.equal(evidence.runId,36340314593);
  assert.equal(evidence.jobId,108678989659);
  assert.equal(evidence.artifactId,10937824226);
  assert.equal(evidence.artifactSha256,'4a775c03dd2d4a0e2b5b35757c90daaf74592ffdfb174a93bd1ec0b57345ccb0');
  assert.equal(evidence.calibration.comparisons.length,12);
  const before=JSON.stringify(evidence);
  const result=diagnoseMeasuredCalibration(evidence.calibration);
  assert.equal(result.status,'NO_SCALAR_THRESHOLD_CAN_MEET_RULE');
  assert.deepEqual(result.witness,{pivot:.5,
    cutoffsAtOrBelow:{minimumFalsePositives:2},cutoffsAbove:{maximumPositiveHits:3}});
  assert.equal(result.requiredPositiveHits,6);
  assert.equal(result.additionalModelQueries,0);
  assert.equal(result.productionClaim,false);
  assert.equal(result.modelAdmitted,false);
  assert.equal(result.productionThresholdChanged,false);
  assert.equal(result.blindAcceptance,false);
  assert.equal(result.upstreamConversionEquivalence,'NOT_VERIFIED');
  assert.equal(JSON.stringify(evidence),before);
  assert.equal(Object.isFrozen(result.witness.cutoffsAtOrBelow),true);
  assert.equal(Object.isFrozen(result),true);
});

test('VS07 cutoff diagnosis distinguishes a proven obstruction from unresolved grid gaps or a sampled pass',async()=>{
  const {CALIBRATION_RULE}=await import('../experiments/semantic-calibration.mjs');
  const {diagnoseMeasuredCalibration}=await import('../scripts/diagnose-retrieval-calibration.mjs');
  const make=(hits,falsePositives)=>({
    schemaVersion:1,scope:'public_synthetic_development_only',
    authoredAfterInitialModelMeasurement:true,blindAcceptance:false,
    selectionExcludedFixedEvaluation:true,productionClaim:false,
    productionThresholdChanged:false,modelAdmitted:false,additionalModelQueries:16,
    developmentCorpusDigest:'a'.repeat(64),originalFixedCorpusDigest:'b'.repeat(64),
    rule:CALIBRATION_RULE,status:'NO_ADMISSIBLE_DEVELOPMENT_THRESHOLD',selectedThreshold:null,
    comparisons:CALIBRATION_RULE.thresholds.map((threshold,index)=>({
      threshold,positiveTasks:8,noAnswerTasks:8,
      positiveHits:hits[index],falsePositives:falsePositives[index],
      positiveHitRate:hits[index]/8,noAnswerFalsePositiveRate:falsePositives[index]/8,
      admissible:hits[index]>=6&&falsePositives[index]===0,
    })),
  });
  const gap=make([8,8,8,8,8,5,5,5,5,5,5,5],[3,3,3,3,3,0,0,0,0,0,0,0]);
  assert.equal(diagnoseMeasuredCalibration(gap).status,'GRID_FAILED_CONTINUOUS_FEASIBILITY_UNDETERMINED');
  assert.equal(diagnoseMeasuredCalibration(gap).witness,null);
  const pass=make(Array(12).fill(6),Array(12).fill(0));
  pass.status='DEVELOPMENT_THRESHOLD_SELECTED';pass.selectedThreshold=.9;
  assert.equal(diagnoseMeasuredCalibration(pass).status,'SAMPLED_RULE_MET');
  assert.equal(diagnoseMeasuredCalibration(pass).modelAdmitted,false);
  const impossible=make([8,8,8,5,5,5,5,5,5,5,5,5],Array(12).fill(1));
  assert.equal(diagnoseMeasuredCalibration(impossible).witness.pivot,.5);
});

test('VS07 measured cutoff diagnosis refuses malformed, partial, nonmonotone or weakened evidence',async()=>{
  const {readFile}=await import('node:fs/promises');
  const {diagnoseMeasuredCalibration}=await import('../scripts/diagnose-retrieval-calibration.mjs');
  const calibration=JSON.parse(await readFile(new URL(
    './evidence/vs07-distiluse-development-36340314593.json',import.meta.url),'utf8')).calibration;
  const cases=[
    c=>c.comparisons.pop(),
    c=>c.comparisons.reverse(),
    c=>c.comparisons[3].threshold=.51,
    c=>c.comparisons[3].positiveHits=NaN,
    c=>c.comparisons[3].positiveHits=true,
    c=>c.comparisons[3].positiveTasks=7,
    c=>c.comparisons[3].noAnswerTasks=7,
    c=>c.comparisons[3].positiveHitRate=.75,
    c=>c.comparisons[3].noAnswerFalsePositiveRate=0,
    c=>c.comparisons[3].admissible=true,
    c=>c.comparisons[3].unexpected='PRIVATE_CANARY',
    c=>{c.comparisons[4].positiveHits=4;c.comparisons[4].positiveHitRate=.5;},
    c=>{c.comparisons[4].falsePositives=3;c.comparisons[4].noAnswerFalsePositiveRate=.375;},
    c=>c.selectedThreshold=.6,
    c=>c.status='DEVELOPMENT_THRESHOLD_SELECTED',
    c=>c.rule.minimumPositiveHitRate=.125,
    c=>c.rule.maximumNoAnswerFalsePositiveRate=.375,
    c=>c.rule.limit=1,
    c=>c.productionClaim=true,
    c=>c.productionThresholdChanged=true,
    c=>c.modelAdmitted=true,
    c=>c.blindAcceptance=true,
    c=>c.selectionExcludedFixedEvaluation=false,
    c=>c.additionalModelQueries=1,
    c=>c.developmentCorpusDigest=c.originalFixedCorpusDigest,
    c=>c.originalFixedCorpusDigest='PRIVATE_CANARY',
  ];
  for(const mutate of cases){
    const bad=structuredClone(calibration);mutate(bad);
    assert.throws(()=>diagnoseMeasuredCalibration(bad),
      error=>error.message==='invalid measured calibration diagnostic');
  }
});

test('VS07 fixed score top-five hits and no-answer nonempty results satisfy the monotonic proof premise',async()=>{
  const {rankCalibrationScores}=await import('../experiments/semantic-calibration.mjs');
  const {diagnoseMeasuredCalibration}=await import('../scripts/diagnose-retrieval-calibration.mjs');
  const {calibrateDevelopmentThreshold}=await import('../experiments/semantic-calibration.mjs');
  const {calibrationCorpus}=await import('./fixtures/cpv1-07-calibration-corpus.mjs');
  // Preserve all original 9 records/16 tasks and labels. A score callback is an
  // analytic numerical oracle, not a model or a substitute for the retained run.
  const relevant=new Map(calibrationCorpus.tasks.map(task=>[task.query,new Set(task.relevant)]));
  const score=(scope,query)=>scope.map((record,index)=>({id:record.id,
    score:relevant.get(query).size?(relevant.get(query).has(record.id)? .48:.47-index*.01):.6-index*.01}));
  const calibration=await calibrateDevelopmentThreshold(calibrationCorpus,retrievalCorpus,score);
  assert.equal(diagnoseMeasuredCalibration(calibration).status,'NO_SCALAR_THRESHOLD_CAN_MEET_RULE');
  for(const task of calibrationCorpus.tasks){
    const rows=score(calibrationCorpus.records.filter(record=>!record.excluded),task.query);
    let previous=rankCalibrationScores(rows,0);
    for(let step=1;step<=1000;step++){
      const current=rankCalibrationScores(rows,step/1000);
      assert.deepEqual(current,previous.slice(0,current.length));
      assert.equal(current.some(id=>task.relevant.includes(id))&&
        !previous.some(id=>task.relevant.includes(id)),false);
      previous=current;
    }
  }
});

test('VS07 retained fixed DistilUSE failure accounting separates abstention, missed gold and paired lift',async()=>{
  const {readFile}=await import('node:fs/promises');
  const {diagnoseRetainedRetrievalFailures}=await import('../scripts/diagnose-retrieval-failures.mjs');
  const evidence=JSON.parse(await readFile(new URL(
    './evidence/vs07-distiluse-fixed-36340314593.json',import.meta.url),'utf8'));
  assert.equal(evidence.head,'f3a19ec9bae953daa8c126f26d047ba64eba6af9');
  assert.equal(evidence.runId,36340314593);assert.equal(evidence.jobId,108678989659);
  assert.equal(evidence.artifactId,10937824226);
  assert.equal(evidence.artifactSha256,'4a775c03dd2d4a0e2b5b35757c90daaf74592ffdfb174a93bd1ec0b57345ccb0');
  assert.equal(evidence.model.revision,'826fee3d516ebb14987355af373f5b69101c7006');
  assert.equal(evidence.model.minimumCosineScore,.7);
  assert.equal(evidence.model.onnxConversionEquivalence,'NOT_VERIFIED');
  assert.equal(evidence.reports.length,4);
  assert.deepEqual(evidence.reports.map(report=>report.rows.length),[29,29,29,29]);
  const before=JSON.stringify(evidence);
  const result=diagnoseRetainedRetrievalFailures(retrievalCorpus,evidence.reports);
  assert.deepEqual(result.summaries.map(row=>[row.positiveTasks,row.noAnswerTasks,
    row.positiveHits,row.positiveAbstentions,row.nonemptyWithoutGold,row.partialRecall,row.noAnswerFalsePositives]),[
    [26,3,18,4,4,0,1],[26,3,18,4,4,1,1],[26,3,2,24,0,1,0],[26,3,18,4,4,0,1]]);
  const semantic=result.paired.find(row=>row.method==='official-distiluse-dense-tanh-onnx-lab-v1');
  assert.equal(semantic.comparisons[0].gained.length,0);
  assert.equal(semantic.comparisons[0].regressed.length,16);
  assert.equal(semantic.comparisons[1].regressed.length,17);
  assert.deepEqual(semantic.noAnswerRemovedFalsePositives,['t21']);
  const hybrid=result.paired.find(row=>row.method==='official-distiluse-hybrid-rrf-lab-v1');
  assert.equal(hybrid.identicalMeasuredRows,true);
  assert.deepEqual(hybrid.comparisons.map(row=>[row.gained.length,row.regressed.length,row.unchanged.length]),
    [[0,0,26],[0,0,26],[0,0,26]]);
  // Identical measured metrics cannot prove identical returned IDs/scores.
  assert.equal(result.rankingIdentity,'NOT_OBSERVABLE_FROM_METRICS');
  assert.equal(result.upstreamConversionEquivalence,'NOT_VERIFIED');
  assert.equal(result.additionalModelQueries,0);assert.equal(result.newMeasurement,false);
  assert.equal(result.modelAdmitted,false);assert.equal(result.productionClaim,false);
  assert.equal(result.productionThresholdChanged,false);assert.equal(result.blindAcceptance,false);
  assert.equal(result.taskCount,29);assert.equal(result.recordCount,28);
  assert.equal(JSON.stringify(evidence),before);
  assert.equal(Object.isFrozen(result),true);assert.equal(Object.isFrozen(hybrid.comparisons[0].regressed),true);
  assert.throws(()=>hybrid.comparisons[0].regressed.push('t01'),TypeError);
});

test('VS07 paired failure accounting is ID-scoped and detects balancing regressions hidden by aggregates',async()=>{
  const {readFile}=await import('node:fs/promises');
  const {diagnoseRetainedRetrievalFailures}=await import('../scripts/diagnose-retrieval-failures.mjs');
  const evidence=JSON.parse(await readFile(new URL(
    './evidence/vs07-distiluse-fixed-36340314593.json',import.meta.url),'utf8'));
  const expected=diagnoseRetainedRetrievalFailures(retrievalCorpus,evidence.reports);
  const shuffled=structuredClone(evidence.reports).reverse();
  for(const report of shuffled)report.rows.reverse();
  assert.deepEqual(diagnoseRetainedRetrievalFailures(retrievalCorpus,shuffled),expected);
  const reports=structuredClone(evidence.reports),hybrid=reports[3];
  // Analytic report oracle only; never a replacement measured model receipt.
  const first=hybrid.rows.find(row=>row.id==='t01'),last=hybrid.rows.find(row=>row.id==='t29');
  assert.equal(first.reciprocalRankAt5,1);assert.equal(last.reciprocalRankAt5,.5);
  first.reciprocalRankAt5=.5;last.reciprocalRankAt5=1;
  first.ndcgAt5=1/Math.log2(3);last.ndcgAt5=1;
  const positive=hybrid.rows.filter(row=>!row.noAnswer);
  hybrid.aggregate.mrrAt5=positive.reduce((sum,row)=>sum+row.reciprocalRankAt5,0)/26;
  hybrid.aggregate.ndcgAt5=positive.reduce((sum,row)=>sum+row.ndcgAt5,0)/26;
  assert.ok(Math.abs(hybrid.aggregate.mrrAt5-reports[0].aggregate.mrrAt5)<1e-12);
  assert.ok(Math.abs(hybrid.aggregate.ndcgAt5-reports[0].aggregate.ndcgAt5)<1e-12);
  const paired=diagnoseRetainedRetrievalFailures(retrievalCorpus,reports).paired[2];
  assert.equal(paired.identicalMeasuredRows,false);
  assert.deepEqual(paired.comparisons[0].gained,['t29']);
  assert.deepEqual(paired.comparisons[0].regressed,['t01']);
});

test('VS07 retained report accounting refuses partial, forged, inconsistent or privacy-bearing rows',async()=>{
  const {readFile}=await import('node:fs/promises');
  const {diagnoseRetainedRetrievalFailures}=await import('../scripts/diagnose-retrieval-failures.mjs');
  const original=JSON.parse(await readFile(new URL(
    './evidence/vs07-distiluse-fixed-36340314593.json',import.meta.url),'utf8')).reports;
  const mutations=[
    reports=>reports.pop(),
    reports=>reports[1]=structuredClone(reports[0]),
    reports=>reports[0].corpusDigest='a'.repeat(64),
    reports=>reports[0].scope='private',
    reports=>reports[0].productionClaim=true,
    reports=>reports[0].semanticCapabilityEstablished=true,
    reports=>reports[0].personalBeliefJudgment=true,
    reports=>reports[0].measuredTasks=28,
    reports=>reports[0].recordCount=27,
    reports=>reports[0].contractFailures=1,
    reports=>reports[0].rows.pop(),
    reports=>reports[0].rows[1]=structuredClone(reports[0].rows[0]),
    reports=>reports[0].rows[0].id='PRIVATE_ID',
    reports=>reports[0].rows[0].category='no_answer',
    reports=>reports[0].rows[0].status='ERROR',
    reports=>reports[0].rows[0].abstained='false',
    reports=>reports[0].rows[0].noAnswer=true,
    reports=>reports[0].rows[0].reciprocalRankAt5=NaN,
    reports=>reports[0].rows[0].reciprocalRankAt5=.7,
    reports=>reports[0].rows[0].recallAt5=.5,
    reports=>reports[0].rows[0].ndcgAt5=.9,
    reports=>reports[0].rows[0].abstained=true,
    reports=>reports[0].rows[20].recallAt5=0,
    reports=>reports[0].rows[0].private='PRIVATE_BODY',
    reports=>reports[0].aggregate.mrrAt5=.8,
    reports=>reports[0].aggregate.recallAt5=1,
    reports=>reports[0].aggregate.noAnswerAbstention=1,
    reports=>reports[0].aggregate.private='PRIVATE_BODY',
  ];
  for(const mutate of mutations){
    const bad=structuredClone(original);mutate(bad);
    assert.throws(()=>diagnoseRetainedRetrievalFailures(retrievalCorpus,bad),
      error=>error.message==='invalid retained retrieval failure evidence');
  }
});

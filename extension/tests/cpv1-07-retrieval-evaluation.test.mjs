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

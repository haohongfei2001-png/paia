// Offline failure accounting for complete retained public synthetic reports.
// No model inference, rank/threshold change, label selection or admission.
import {createHash} from 'node:crypto';
import {validateRetrievalCorpus} from '../experiments/retrieval-evaluation.mjs';

const methods=Object.freeze(['lexical-production-v1','character-tfidf-lab-v1',
  'official-distiluse-dense-tanh-onnx-lab-v1','official-distiluse-hybrid-rrf-lab-v1']);
const fail=()=>{throw Error('invalid retained retrieval failure evidence');};
const mean=values=>values.length?values.reduce((sum,value)=>sum+value,0)/values.length:null;
const near=(a,b)=>a===null?b===null:typeof b==='number'&&Number.isFinite(b)&&Math.abs(a-b)<1e-12;
const keys=(value,names)=>value&&typeof value==='object'&&!Array.isArray(value)
  &&Object.keys(value).length===names.length&&names.every(name=>Object.hasOwn(value,name));
const freeze=value=>{
  for(const item of Object.values(value))if(item&&typeof item==='object')freeze(item);
  return Object.freeze(value);
};
const metrics=['reciprocalRankAt5','recallAt5','ndcgAt5'];
export function diagnoseRetainedRetrievalFailures(corpus,reports) {
  try{validateRetrievalCorpus(corpus);}catch{fail();}
  const digest=createHash('sha256').update(JSON.stringify(corpus)).digest('hex');
  if(digest!=='49c998ee447eb5bec4c61636322b95900b556d69c0affabefcf7f1b574aa5217'
    ||corpus.records.length!==28||corpus.tasks.length!==29
    ||!Array.isArray(reports)||reports.length!==methods.length)fail();
  const byMethod=new Map();
  for(const report of reports){
    if(!report||!methods.includes(report.method)||byMethod.has(report.method)
      ||report.schemaVersion!==1||report.corpusId!==corpus.id||report.corpusDigest!==digest
      ||report.scope!=='synthetic_only'||report.productionClaim!==false
      ||report.semanticCapabilityEstablished!==false||report.personalBeliefJudgment!==false
      ||report.taskCount!==corpus.tasks.length||report.recordCount!==corpus.records.length
      ||report.measuredTasks!==corpus.tasks.length||report.contractFailures!==0
      ||!Array.isArray(report.rows)||report.rows.length!==corpus.tasks.length)fail();
    const rows=new Map();
    for(const row of report.rows){
      const task=corpus.tasks.find(task=>task.id===row?.id);
      if(!task||rows.has(row.id)||!keys(row,['id','category','status',...metrics,'abstained','noAnswer'])
        ||row.category!==task.category||row.status!=='MEASURED'
        ||typeof row.abstained!=='boolean'||row.noAnswer!==(task.category==='no_answer'))fail();
      if(row.noAnswer){
        if(metrics.some(metric=>row[metric]!==null))fail();
      }else{
        const relevant=Object.keys(task.relevance).length;
        if(metrics.some(metric=>typeof row[metric]!=='number'||!Number.isFinite(row[metric])
          ||row[metric]<0||row[metric]>1)
          ||![0,1,.5,1/3,.25,.2].includes(row.reciprocalRankAt5)
          ||!near(Math.round(row.recallAt5*relevant),row.recallAt5*relevant)
          ||(row.reciprocalRankAt5>0)!==(row.recallAt5>0)
          ||(row.recallAt5>0)!==(row.ndcgAt5>0)
          ||relevant===1&&row.reciprocalRankAt5>0
            &&!near(1/Math.log2(1/row.reciprocalRankAt5+1),row.ndcgAt5)
          ||row.abstained&&metrics.some(metric=>row[metric]!==0))fail();
      }
      rows.set(row.id,{...row});
    }
    const ordered=corpus.tasks.map(task=>rows.get(task.id));
    const positive=ordered.filter(row=>!row.noAnswer),negative=ordered.filter(row=>row.noAnswer);
    if(!keys(report.aggregate,['mrrAt5','recallAt5','ndcgAt5','noAnswerAbstention'])
      ||!near(mean(positive.map(row=>row.reciprocalRankAt5)),report.aggregate.mrrAt5)
      ||!near(mean(positive.map(row=>row.recallAt5)),report.aggregate.recallAt5)
      ||!near(mean(positive.map(row=>row.ndcgAt5)),report.aggregate.ndcgAt5)
      ||!near(mean(negative.map(row=>+row.abstained)),report.aggregate.noAnswerAbstention))fail();
    byMethod.set(report.method,ordered);
  }
  const baseline=byMethod.get(methods[0]);
  const summaries=methods.map(method=>{
    const rows=byMethod.get(method),positive=rows.filter(row=>!row.noAnswer),negative=rows.filter(row=>row.noAnswer);
    return {method,positiveTasks:positive.length,noAnswerTasks:negative.length,
      positiveHits:positive.filter(row=>row.recallAt5>0).length,
      positiveAbstentions:positive.filter(row=>row.abstained).length,
      nonemptyWithoutGold:positive.filter(row=>!row.abstained&&row.recallAt5===0).length,
      partialRecall:positive.filter(row=>row.recallAt5>0&&row.recallAt5<1).length,
      noAnswerFalsePositives:negative.filter(row=>!row.abstained).length};
  });
  const paired=methods.slice(1).map(method=>{
    const rows=byMethod.get(method);
    const comparisons=metrics.map(metric=>({metric,
      gained:rows.filter((row,index)=>!row.noAnswer&&row[metric]>baseline[index][metric]).map(row=>row.id),
      regressed:rows.filter((row,index)=>!row.noAnswer&&row[metric]<baseline[index][metric]).map(row=>row.id),
      unchanged:rows.filter((row,index)=>!row.noAnswer&&row[metric]===baseline[index][metric]).map(row=>row.id)}));
    return {method,baseline:methods[0],comparisons,
      noAnswerNewFalsePositives:rows.filter((row,index)=>row.noAnswer&&!row.abstained&&baseline[index].abstained).map(row=>row.id),
      noAnswerRemovedFalsePositives:rows.filter((row,index)=>row.noAnswer&&row.abstained&&!baseline[index].abstained).map(row=>row.id),
      identicalMeasuredRows:rows.every((row,index)=>metrics.every(metric=>row[metric]===baseline[index][metric])
        &&row.abstained===baseline[index].abstained&&row.noAnswer===baseline[index].noAnswer)};
  });
  return freeze({schemaVersion:1,scope:'retained_fixed_synthetic_failure_accounting_only',
    corpusDigest:digest,taskCount:corpus.tasks.length,recordCount:corpus.records.length,
    summaries,paired,additionalModelQueries:0,newMeasurement:false,modelAdmitted:false,
    productionClaim:false,productionThresholdChanged:false,blindAcceptance:false,
    rankingIdentity:'NOT_OBSERVABLE_FROM_METRICS',upstreamConversionEquivalence:'NOT_VERIFIED'});
}

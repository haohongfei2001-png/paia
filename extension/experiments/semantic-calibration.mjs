// Lab-only development calibration. Never imports product state or selects a model.
import {createHash} from 'node:crypto';
export const CALIBRATION_RULE=Object.freeze({
  thresholds:Object.freeze([.35,.4,.45,.5,.55,.6,.65,.7,.75,.8,.85,.9]),
  minimumPositiveHitRate:.75,maximumNoAnswerFalsePositiveRate:0,limit:5,
  tieBreak:'positive_hits_then_fewer_false_positives_then_higher_threshold',
  productionClaim:false
});
const fail=()=>{throw Error('invalid semantic development calibration');};
const keys=(v,allowed)=>v&&typeof v==='object'&&!Array.isArray(v)
  &&Object.keys(v).every(k=>allowed.includes(k))&&allowed.every(k=>Object.hasOwn(v,k));
const text=v=>typeof v==='string'&&v.trim().length>0;
const normalized=v=>v.normalize('NFKC').trim().toLowerCase();
export function validateCalibrationCorpus(corpus,fixed){
  if(!keys(corpus,['schemaVersion','id','scope','productionClaim','developmentOnly','records','tasks'])
    ||corpus.schemaVersion!==1||corpus.id!=='cpv1-vs07-calibration-development-v1'
    ||corpus.scope!=='synthetic_only'||corpus.productionClaim!==false||corpus.developmentOnly!==true
    ||!Array.isArray(corpus.records)||corpus.records.length!==9
    ||!Array.isArray(corpus.tasks)||corpus.tasks.length!==16
    ||!fixed||fixed.id!=='cpv1-vs07-synthetic-fixed-v1'
    ||!Array.isArray(fixed.records)||!Array.isArray(fixed.tasks))fail();
  const occupiedIds=new Set([...fixed.records,...fixed.tasks].map(r=>r.id));
  const occupiedText=new Set([...fixed.records.flatMap(r=>[r.title,r.body]),...fixed.tasks.map(t=>t.query)].map(normalized));
  const ids=new Set(),texts=new Set(),eligible=new Set();
  for(const r of corpus.records){
    if(!keys(r,['id','title','body','excluded'])||!/^d\d{2}$/.test(r.id)
      ||occupiedIds.has(r.id)||ids.has(r.id)||!text(r.title)||!text(r.body)
      ||typeof r.excluded!=='boolean')fail();
    ids.add(r.id);
    for(const value of [r.title,r.body]){
      const n=normalized(value);if(occupiedText.has(n)||texts.has(n))fail();texts.add(n);
    }
    if(!r.excluded)eligible.add(r.id);
  }
  let positives=0,negatives=0;
  for(const t of corpus.tasks){
    if(!keys(t,['id','query','relevant'])||!/^c\d{2}$/.test(t.id)
      ||occupiedIds.has(t.id)||ids.has(t.id)||!text(t.query)
      ||occupiedText.has(normalized(t.query))||texts.has(normalized(t.query))
      ||!Array.isArray(t.relevant)||new Set(t.relevant).size!==t.relevant.length
      ||t.relevant.some(id=>!eligible.has(id)))fail();
    ids.add(t.id);texts.add(normalized(t.query));
    t.relevant.length?positives++:negatives++;
  }
  if(eligible.size!==8||positives!==8||negatives!==8)fail();
  return true;
}
export function rankCalibrationScores(scores,threshold){
  if(!Number.isFinite(threshold)||threshold<0||threshold>1||!Array.isArray(scores))fail();
  const seen=new Set();
  for(const row of scores){
    if(!keys(row,['id','score'])||!text(row.id)||seen.has(row.id)
      ||!Number.isFinite(row.score)||row.score < -1.021||row.score > 1.021)fail();
    seen.add(row.id);
  }
  return [...scores].filter(row=>row.score>=threshold)
    .sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id)).slice(0,CALIBRATION_RULE.limit).map(row=>row.id);
}
export async function calibrateDevelopmentThreshold(corpus,fixed,score){
  validateCalibrationCorpus(corpus,fixed);
  if(typeof score!=='function')fail();
  // Candidate gets complete eligible document content and query, never labels.
  const eligible=Object.freeze(corpus.records.filter(r=>!r.excluded)
    .map(({id,title,body,excluded})=>Object.freeze({id,title,body,excluded})));
  const devSnapshot=JSON.stringify(corpus),fixedSnapshot=JSON.stringify(fixed);
  const ids=new Set(eligible.map(r=>r.id)),observations=[];
  for(const task of corpus.tasks){
    const rows=await score(eligible,task.query);
    if(JSON.stringify(corpus)!==devSnapshot||JSON.stringify(fixed)!==fixedSnapshot)fail();
    rankCalibrationScores(rows,.7);
    if(rows.length!==ids.size||rows.some(r=>!ids.has(r.id)))fail();
    observations.push({relevant:task.relevant,scores:rows.map(r=>({...r}))});
  }
  const comparisons=CALIBRATION_RULE.thresholds.map(threshold=>{
    let positiveHits=0,falsePositives=0;
    for(const observation of observations){
      const ranked=rankCalibrationScores(observation.scores,threshold);
      if(observation.relevant.length){
        if(ranked.some(id=>observation.relevant.includes(id)))positiveHits++;
      }else if(ranked.length)falsePositives++;
    }
    return {threshold,positiveTasks:8,noAnswerTasks:8,positiveHits,falsePositives,
      positiveHitRate:positiveHits/8,noAnswerFalsePositiveRate:falsePositives/8,
      admissible:positiveHits/8>=CALIBRATION_RULE.minimumPositiveHitRate
        &&falsePositives/8<=CALIBRATION_RULE.maximumNoAnswerFalsePositiveRate};
  });
  const selected=comparisons.filter(r=>r.admissible)
    .sort((a,b)=>b.positiveHits-a.positiveHits||a.falsePositives-b.falsePositives||b.threshold-a.threshold)[0];
  // Do not retain vectors, raw scores, document text, task queries or labels.
  return {schemaVersion:1,scope:'public_synthetic_development_only',
    developmentCorpusDigest:createHash('sha256').update(devSnapshot).digest('hex'),
    originalFixedCorpusDigest:createHash('sha256').update(fixedSnapshot).digest('hex'),
    authoredAfterInitialModelMeasurement:true,blindAcceptance:false,
    selectionExcludedFixedEvaluation:true,rule:CALIBRATION_RULE,
    status:selected?'DEVELOPMENT_THRESHOLD_SELECTED':'NO_ADMISSIBLE_DEVELOPMENT_THRESHOLD',
    selectedThreshold:selected?.threshold??null,comparisons,
    additionalModelQueries:corpus.tasks.length,productionClaim:false,
    productionThresholdChanged:false,modelAdmitted:false};
}

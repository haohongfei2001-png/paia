// Node-only root-cause accounting over one invocation's already measured
// fixed public scores. No encoder, model calls, new cutoff or production path.
import {createHash} from 'node:crypto';
import {validateRetrievalCorpus,eligibleRecords} from './retrieval-evaluation.mjs';
import {rankCalibrationScores} from './semantic-calibration.mjs';

const DIGEST='49c998ee447eb5bec4c61636322b95900b556d69c0affabefcf7f1b574aa5217';
const CUTOFF=.7;
const fail=()=>{throw Error('invalid cached fixed rank diagnostic');};
const freeze=value=>{
  if(value&&typeof value==='object'){
    for(const item of Object.values(value))freeze(item);
    Object.freeze(value);
  }
  return value;
};

// readCached receives only the original eligible records/query; labels never
// enter a scorer. It must return the complete original scores AND admitted IDs.
export function diagnoseCachedFixedRanks(corpus,readCached){
  try{
    validateRetrievalCorpus(corpus);
    if(createHash('sha256').update(JSON.stringify(corpus)).digest('hex')!==DIGEST
        ||typeof readCached!=='function')fail();
    const rows=[];
    for(const task of corpus.tasks){
      const eligible=Object.freeze(eligibleRecords(corpus,task).map(record=>Object.freeze({...record})));
      const allowed=new Set(eligible.map(record=>record.id));
      const cached=readCached(eligible,task.query);
      if(!cached||typeof cached!=='object'||Array.isArray(cached)
          ||Object.keys(cached).sort().join(',')!=='ranks,scores'
          ||!Array.isArray(cached.scores)||cached.scores.length!==allowed.size
          ||!Array.isArray(cached.ranks))fail();
      const seen=new Set();
      for(const row of cached.scores){
        if(!row||Object.keys(row).sort().join(',')!=='id,score'
            ||!allowed.has(row.id)||seen.has(row.id)
            ||!Number.isFinite(row.score)||row.score < -1.021||row.score > 1.021)fail();
        seen.add(row.id);
      }
      const admitted=rankCalibrationScores(cached.scores,CUTOFF);
      if(JSON.stringify(admitted)!==JSON.stringify(cached.ranks))fail();
      const ordered=[...cached.scores].sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
      const relevant=new Set(Object.keys(task.relevance));
      const first=ordered.findIndex(row=>relevant.has(row.id));
      const best=ordered.find(row=>relevant.has(row.id));
      const rawHit=first>=0&&first<5;
      const admittedHit=admitted.some(id=>relevant.has(id));
      const noAnswer=relevant.size===0;
      const classification=noAnswer?(admitted.length?'NO_ANSWER_ADMITTED':'NO_ANSWER_ABSTAINED')
        :admittedHit?'ADMITTED_TOP5_RELEVANCE'
        :rawHit?'THRESHOLD_SUPPRESSED_TOP5_RELEVANCE':'GOLD_OUTSIDE_UNTHRESHOLDED_TOP5';
      rows.push({id:task.id,category:task.category,eligibleCount:ordered.length,noAnswer,
        maximumCosine:ordered[0]?.score??null,
        strongestRelevantCosine:best?.score??null,
        firstRelevantRank:first<0?null:first+1,
        unthresholdedTop5Hit:noAnswer?null:rawHit,
        admittedTop5Hit:noAnswer?null:admittedHit,admittedCount:admitted.length,classification});
    }
    const count=classification=>rows.filter(row=>row.classification===classification).length;
    return freeze({schemaVersion:1,status:'FIXED_CACHED_SCORE_DIAGNOSTIC',
      scope:'public_synthetic_only',corpusDigest:DIGEST,taskCount:rows.length,
      method:'official-distiluse-dense-tanh-onnx-lab-v1',originalCutoff:CUTOFF,
      additionalModelQueries:0,newThresholdSelected:false,blindAcceptance:false,
      modelAdmitted:false,productionClaim:false,upstreamEquivalence:'NOT_VERIFIED',
      rankingWithoutCutoff:'RETROSPECTIVE_DIAGNOSTIC_NOT_ACCEPTANCE',
      aggregate:{
        admittedPositiveTop5:count('ADMITTED_TOP5_RELEVANCE'),
        thresholdSuppressedPositiveTop5:count('THRESHOLD_SUPPRESSED_TOP5_RELEVANCE'),
        goldOutsideUnthresholdedTop5:count('GOLD_OUTSIDE_UNTHRESHOLDED_TOP5'),
        noAnswerAdmitted:count('NO_ANSWER_ADMITTED'),
        noAnswerAbstained:count('NO_ANSWER_ABSTAINED')},rows});
  }catch{fail();}
}

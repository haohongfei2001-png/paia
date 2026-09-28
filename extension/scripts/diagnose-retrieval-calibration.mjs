// Offline bounded root-cause analysis of already measured lab comparisons.
// No inference, download, product state, threshold selection or model admission.
import {CALIBRATION_RULE} from '../experiments/semantic-calibration.mjs';
const fail=()=>{throw Error('invalid measured calibration diagnostic');};
const keys=(value,names)=>value&&typeof value==='object'&&!Array.isArray(value)
  &&Object.keys(value).length===names.length&&names.every(name=>Object.hasOwn(value,name));
const count=value=>Number.isInteger(value)&&value>=0&&value<=8;

export function diagnoseMeasuredCalibration(calibration) {
  if(!calibration||calibration.schemaVersion!==1
    ||calibration.scope!=='public_synthetic_development_only'
    ||calibration.authoredAfterInitialModelMeasurement!==true
    ||calibration.blindAcceptance!==false||calibration.selectionExcludedFixedEvaluation!==true
    ||calibration.productionClaim!==false||calibration.productionThresholdChanged!==false
    ||calibration.modelAdmitted!==false||calibration.additionalModelQueries!==16
    ||!['developmentCorpusDigest','originalFixedCorpusDigest'].every(key=>
      typeof calibration[key]==='string'&&/^[0-9a-f]{64}$/.test(calibration[key]))
    ||calibration.developmentCorpusDigest===calibration.originalFixedCorpusDigest
    ||JSON.stringify(calibration.rule)!==JSON.stringify(CALIBRATION_RULE)
    ||!Array.isArray(calibration.comparisons)
    ||calibration.comparisons.length!==CALIBRATION_RULE.thresholds.length)fail();
  let previousHits=8,previousFalsePositives=8;
  const rows=calibration.comparisons.map((row,index)=>{
    if(!keys(row,['threshold','positiveTasks','noAnswerTasks','positiveHits','falsePositives',
      'positiveHitRate','noAnswerFalsePositiveRate','admissible'])
      ||row.threshold!==CALIBRATION_RULE.thresholds[index]
      ||row.positiveTasks!==8||row.noAnswerTasks!==8
      ||!count(row.positiveHits)||!count(row.falsePositives)
      ||row.positiveHitRate!==row.positiveHits/8
      ||row.noAnswerFalsePositiveRate!==row.falsePositives/8
      ||row.admissible!==(row.positiveHits/8>=CALIBRATION_RULE.minimumPositiveHitRate
        &&row.falsePositives/8<=CALIBRATION_RULE.maximumNoAnswerFalsePositiveRate)
      ||row.positiveHits>previousHits||row.falsePositives>previousFalsePositives)fail();
    previousHits=row.positiveHits;previousFalsePositives=row.falsePositives;
    return {...row};
  });
  const selected=rows.filter(row=>row.admissible).sort((a,b)=>
    b.positiveHits-a.positiveHits||a.falsePositives-b.falsePositives||b.threshold-a.threshold)[0];
  if(calibration.status!==(selected?'DEVELOPMENT_THRESHOLD_SELECTED':'NO_ADMISSIBLE_DEVELOPMENT_THRESHOLD')
    ||calibration.selectedThreshold!==(selected?.threshold??null))fail();
  // For a fixed cached score/order and score>=threshold top-5 ranking, raising
  // the cutoff only removes a suffix. Hits and nonempty no-answer results are
  // monotone. If a pivot already has too few hits AND too many false positives,
  // every cutoff <=pivot fails the latter; every cutoff >pivot fails the former.
  // This is a sufficient impossibility witness, not an interpolated threshold.
  const requiredHits=Math.ceil(8*CALIBRATION_RULE.minimumPositiveHitRate);
  const witness=rows.find(row=>row.positiveHits<requiredHits
    &&row.noAnswerFalsePositiveRate>CALIBRATION_RULE.maximumNoAnswerFalsePositiveRate);
  return Object.freeze({
    schemaVersion:1,scope:'measured_development_set_only',
    basis:'fixed_cached_score_order_score_gte_cutoff_top5',
    developmentCorpusDigest:calibration.developmentCorpusDigest,
    originalFixedCorpusDigest:calibration.originalFixedCorpusDigest,
    status:witness?'NO_SCALAR_THRESHOLD_CAN_MEET_RULE':selected?'SAMPLED_RULE_MET':
      'GRID_FAILED_CONTINUOUS_FEASIBILITY_UNDETERMINED',
    requiredPositiveHits:requiredHits,positiveTasks:8,noAnswerTasks:8,
    maximumNoAnswerFalsePositiveRate:CALIBRATION_RULE.maximumNoAnswerFalsePositiveRate,
    witness:witness?Object.freeze({
      pivot:witness.threshold,
      cutoffsAtOrBelow:Object.freeze({minimumFalsePositives:witness.falsePositives}),
      cutoffsAbove:Object.freeze({maximumPositiveHits:witness.positiveHits}),
    }):null,
    additionalModelQueries:0,productionClaim:false,modelAdmitted:false,
    productionThresholdChanged:false,blindAcceptance:false,
    upstreamConversionEquivalence:'NOT_VERIFIED',
  });
}

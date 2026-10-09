import {prefix} from '../thought-model.js';
import {historicalInstant} from '../historical-time.js';

export const unknownExpressionTime=()=>({at:null,year:null,basis:'unknown'});
export function expressionInstant(value){
 const time=historicalInstant(value);
 if(time===null)return null;
 const normalized=new Date(time).toISOString();
 return /^\d{4}-/.test(normalized)?normalized:null;
}
const instant=expressionInstant;

// This is expression chronology, not the existing capture/creation sort key.
// Ambiguous legacy copies stay unknown. No text or new canonical record lives here.
export async function expressionTime(s,t,row){
 if(!row||row.lifecycle!=='active'||row.staleReasons?.includes('source_purged'))return unknownExpressionTime();
 if(row.provenanceType==='input_original'){
  const refs=(await t.all('provenance','byOwner',prefix(['entry',row.id]))).filter(p=>p.role!=='context_only');
  if(!refs.length||refs.length>100||refs.some(p=>p.contributionType!=='exact_excerpt'))return unknownExpressionTime();
  const times=new Set();
  for(const ref of refs){
   const input=await t.get('inputStates',ref.inputId),dependency=await t.edge('dependencies','byInputTarget',prefix([ref.inputId,'entry',row.id]));
   if(!input||input.removalState!=='active'||input.sourcePurged||!dependency||(input.lastRemovalSequence||0)>(dependency.eligibilityEpochAtUse||0))return unknownExpressionTime();
   if(!ref.sourceRecordIds?.length||!await s.sourcePresent(t,ref.sourceRecordIds))return unknownExpressionTime();
   for(const id of ref.sourceRecordIds){const at=instant((await t.get('records',id))?.value?.sourceSentAt);if(!at)return unknownExpressionTime();times.add(at);}
  }
  // Consolidated identical text can have multiple actual expression dates.
  // Without one attributable event, do not choose the earliest by convenience.
  if(times.size!==1)return unknownExpressionTime();
  const at=[...times][0];return {at,year:Number(at.slice(0,4)),basis:'source'};
 }
 if(row.provenanceType!=='user_created'||row.origin!=='user')return unknownExpressionTime();
 const receipt=await t.edge('operationReceipts','byOwner',prefix(['thought-library',row.id]));
 return planIndependentExpressionTime(row,receipt);
}
// Original receipt computation only; eligibility and the real byOwner read
// remain with expressionTime. A caller DTO cannot prove expression ownership.
export function planIndependentExpressionTime(row,receipt){
 const evidence=receipt?.result?.independentExpression,at=instant(evidence?.at);
 if(receipt?.namespace!=='thought-library'||receipt.ownerId!==row.id||receipt.result?.id!==row.id||evidence?.version!==1||evidence?.kind!=='committed_human_expression'||!at||at!==instant(row.createdAt))return unknownExpressionTime();
 return {at,year:Number(at.slice(0,4)),basis:'independent_creation'};
}

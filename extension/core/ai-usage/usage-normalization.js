import {exact,integer,fail} from './contracts.js';
// Neutral DTO supplied by a future qualified API adapter, NOT a claim that
// these are raw provider response keys. Missing final usage never implies zero.
export function normalizeUsage(value){
 if(value===null)return {state:'unknown',releaseReservation:false};
 exact(value,['inputTokens','completionTokens','totalTokens','reasoningTokens','cachedReadTokens','cacheCreateTokens']);
 if(!Object.values(value).every(integer)||value.inputTokens+value.completionTokens!==value.totalTokens||!Number.isSafeInteger(value.inputTokens+value.completionTokens)||value.reasoningTokens>value.completionTokens||value.cachedReadTokens>value.inputTokens||value.cacheCreateTokens>value.inputTokens-value.cachedReadTokens)fail('USAGE_INVALID');
 return {state:'known',releaseReservation:false,billable:{standardInput:value.inputTokens-value.cachedReadTokens-value.cacheCreateTokens,cachedReadInput:value.cachedReadTokens,cacheCreateInput:value.cacheCreateTokens,completion:value.completionTokens},reasoningSubset:value.reasoningTokens};
}

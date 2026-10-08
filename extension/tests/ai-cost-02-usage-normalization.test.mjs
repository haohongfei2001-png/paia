import test from 'node:test';import assert from 'node:assert/strict';import {normalizeUsage} from '../core/ai-usage/usage-normalization.js';
const usage={inputTokens:100,completionTokens:50,totalTokens:150,reasoningTokens:20,cachedReadTokens:30,cacheCreateTokens:10};
test('reasoning is not billed twice and cache categories partition input',()=>{
 assert.deepEqual(normalizeUsage(usage),{state:'known',releaseReservation:false,billable:{standardInput:60,cachedReadInput:30,cacheCreateInput:10,completion:50},reasoningSubset:20});
});
test('stream without authoritative final usage preserves unknown reservation',()=>{assert.deepEqual(normalizeUsage(null),{state:'unknown',releaseReservation:false});assert.throws(()=>normalizeUsage({}));});
test('malformed totals, subset overlap, negative and extra token categories cannot settle',()=>{
 for(const patch of [{totalTokens:149},{reasoningTokens:51},{cachedReadTokens:95},{completionTokens:-1},{completionTokens:0.5},{extra:1}])assert.throws(()=>normalizeUsage({...usage,...patch}));
 assert.throws(()=>normalizeUsage({...usage,inputTokens:Number.MAX_SAFE_INTEGER,totalTokens:Number.MAX_SAFE_INTEGER}));
});

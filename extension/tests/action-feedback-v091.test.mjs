import test from 'node:test';import assert from 'node:assert/strict';import {actionFailure} from '../ui/action-feedback.js';
test('action feedback distinguishes exhausted daily quota from local batch size without promising a paid retry',()=>{
 const daily=actionFailure('BUDGET_EXCEEDED',{usedRequests:20,dailyRequests:20,resetAt:'2030-01-01T00:00:00Z'});assert.match(daily.text,/重置时间/);assert.equal(daily.settings,true);assert.equal(daily.retry,false);
 const size=actionFailure('BUDGET_EXCEEDED',{usedRequests:0,dailyRequests:20});assert.match(size.text,/减小本批范围/);assert.doesNotMatch(size.text,/今日.*达到/);assert.equal(size.retry,false);
});
test('credential failure offers Settings; actual request failure explains explicit paid retry',()=>{
 const key=actionFailure('CREDENTIAL_FAILURE');assert.equal(key.settings,true);assert.equal(key.retry,false);assert.doesNotMatch(key.text,/再次调用/);
 const error=actionFailure('PROVIDER_UNAVAILABLE');assert.equal(error.retry,true);assert.match(error.text,/重试将再次调用/);
});

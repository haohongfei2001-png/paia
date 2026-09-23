import test from 'node:test';
import assert from 'node:assert/strict';
import {recoveryGuidance} from '../ui/recovery-guidance.js';

test('CPV1-01.4 degraded states each offer one bounded action without claiming an unsaved write',()=>{
  const expected = new Map([
    ['CONTEXT_INVALIDATED','return_to_chat'],
    ['MESSAGE_RESPONSE_TIMEOUT','return_to_chat'],
    ['STORAGE_FULL','open_archive'],
    ['STORAGE_FAILED','open_archive'],
    ['UPDATE_CHECK_FAILED','retry_update'],
    ['INDEX_UNAVAILABLE','retry_search'],
    ['PROVIDER_UNAVAILABLE','review_ai'],
  ]);
  for (const [code,action] of expected) {
    const guidance=recoveryGuidance(code);
    assert.equal(guidance.action,action,code);
    assert.ok(guidance.title&&guidance.detail&&guidance.label,code);
    assert.doesNotMatch(guidance.title,/已成功保存|更新已安装|索引已重建|自动重试/);
  }
  assert.match(recoveryGuidance('UPDATE_CHECK_FAILED').detail,/不表示更新已安装/);
  assert.equal(recoveryGuidance('CAPTURING'),null);
  assert.equal(recoveryGuidance('OUTCOME_UNKNOWN'),null,'paid unknown outcome retains its separate no-retry gate');
});

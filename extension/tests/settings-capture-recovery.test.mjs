import test from 'node:test';
import assert from 'node:assert/strict';
import {settingsCaptureRecovery} from '../ui/settings-capture-recovery.js';
const now=Date.parse('2026-10-11T00:00:00Z');
test('Settings carries original safe recovery actions with bounded stale-error eligibility in both languages',()=>{
 for(const [code,english] of [['CONTEXT_INVALIDATED',/Save any unsent text/],['STORAGE_FULL',/available space/],['STORAGE_FAILED',/manually retry saving/],['ARCHIVE_READ_FAILED',/retry reading/]]){
  const page={diagnostics:{status:code,lastError:{code:'UNKNOWN_PRIVATE',message:'secret'}}};assert.match(settingsCaptureRecovery(page,'en',now),english);assert.ok(settingsCaptureRecovery(page,'zh-CN',now));assert.doesNotMatch(settingsCaptureRecovery(page,'en',now),/secret|UNKNOWN_PRIVATE/);
 }
 for(const delta of [-1,120001])assert.equal(settingsCaptureRecovery({diagnostics:{status:'CAPTURING',lastError:{code:'STORAGE_FULL',at:new Date(now-delta).toISOString()}}},'en',now),'');
 assert.match(settingsCaptureRecovery({diagnostics:{status:'CAPTURING',lastError:{code:'STORAGE_FULL',at:new Date(now-120000).toISOString()}}},'en',now),/Do not uninstall/);
 assert.equal(settingsCaptureRecovery({diagnostics:{status:'CAPTURING'}},'en',now),'');assert.equal(settingsCaptureRecovery(null,'en',now),'');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {access,readFile} from 'node:fs/promises';
import {request,statusLabel} from '../ui/common.js';

test('retired quota, batch and credential feedback no longer offers configuration or paid retry',async()=>{
 await assert.rejects(access(new URL('../ui/action-feedback.js',import.meta.url)),{code:'ENOENT'});
 const page=await readFile(new URL('../ui/archive.html',import.meta.url),'utf8');
 assert.doesNotMatch(page,/id="(?:daily-requests|batch-size|api-key|deepseek-key)"/);
 assert.match(statusLabel('AI_SERVICE_UNAVAILABLE'),/尚未上线/);
 assert.doesNotMatch(statusLabel('AI_SERVICE_UNAVAILABLE'),/购买成功|再次调用|重置时间|减小本批/);
});
test('retired provider action explains unavailability before any transport or credential access',async t=>{
 const prior=globalThis.chrome;let calls=0;globalThis.chrome={runtime:{sendMessage(){calls++;throw Error('must not reach transport');}},get storage(){throw Error('must not read old credentials');}};
 t.after(()=>{if(prior===undefined)delete globalThis.chrome;else globalThis.chrome=prior;});
 await assert.rejects(request('START_BOUNDED_ORGANIZER'),{code:'AI_SERVICE_UNAVAILABLE'});
 assert.equal(calls,0);
});

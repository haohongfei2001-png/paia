import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {request} from '../ui/common.js';
const archive=await readFile(new URL('../ui/archive.js',import.meta.url),'utf8');
const html=await readFile(new URL('../ui/archive.html',import.meta.url),'utf8');
const worker=await readFile(new URL('../background/service-worker.js',import.meta.url),'utf8');
test('Settings replaces user credentials with an honest truthful local Context entry and unavailable external connections',()=>{
 assert.match(html,/id="settings-ai-context"/);assert.match(html,/外部连接尚未开放/);
 assert.doesNotMatch(html,/id="deepseek-|id="bounded-|id="start-thought-library"/);
 assert.doesNotMatch(archive,/SAVE_DEEPSEEK_CREDENTIAL|deepseek-api-key|CLEAR_DEEPSEEK/);
});
test('Stale credential actions refuse before transport, without reading or deleting old keys',async()=>{
 let calls=0;const prior=globalThis.chrome;globalThis.chrome={runtime:{sendMessage(){calls++;throw Error('no transport');}},storage:new Proxy({}, {get(){throw Error('no credential storage');}})};
 try{for(const type of ['GET_DEEPSEEK_STATUS','SAVE_DEEPSEEK_CREDENTIAL','CLEAR_DEEPSEEK'])await assert.rejects(request(type,{config:{apiKey:'SYNTHETIC_UNREAD'}}),{code:'AI_SERVICE_UNAVAILABLE'});assert.equal(calls,0);}finally{globalThis.chrome=prior;}
 assert.doesNotMatch(worker,/deepSeekCredentials|DeepSeekSessionCredentials|deepSeekProvider/);
});

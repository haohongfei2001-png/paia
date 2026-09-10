import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const archive=await readFile(new URL('../ui/archive.js',import.meta.url),'utf8');
const html=await readFile(new URL('../ui/archive.html',import.meta.url),'utf8');
const worker=await readFile(new URL('../background/service-worker.js',import.meta.url),'utf8');

test('Settings saves an opaque session credential without a network state machine',()=>{
 assert.match(html,/id="deepseek-save"[^>]*>保存 API Key/);
 assert.match(archive,/SAVE_DEEPSEEK_CREDENTIAL',\{config:\{apiKey\}\}/);
 assert.match(archive,/已配置 · 当前 Chrome 会话有效/);
 assert.match(archive,/deepseek-api-key'\)\.value=''/);
 assert.doesNotMatch(html,/deepseek-connect|保存并连接|Connection Test/);
 assert.doesNotMatch(archive,/CONNECT_DEEPSEEK|boundedOperation|deepSeekConnecting|CONNECTION_TIMEOUT/);
 assert.doesNotMatch(archive,/\.value=d\.(apiKey|credential|handle)/);
});

test('trusted background saves and clears only the session credential',()=>{
 assert.match(worker,/case 'SAVE_DEEPSEEK_CREDENTIAL'/);
 assert.match(worker,/deepSeekCredentials\.configure\(\{apiKey:request\.config\.apiKey\}\)/);
 assert.match(worker,/case 'CLEAR_DEEPSEEK': await boundedOrganizer\.stop\(\);await aiOrganizer\.stop\(\);await originalOrganizer\.stop\('CANCELLED'\);return deepSeekCredentials\.disable\(\)/);
 assert.doesNotMatch(worker,/CONNECT_DEEPSEEK|connectionTest|SET_DEEPSEEK_CONNECTION_TEST_ENABLED|TEST_DEEPSEEK_CONNECTION/);
 const save=worker.slice(worker.indexOf("case 'SAVE_DEEPSEEK_CREDENTIAL'"),worker.indexOf("case 'CLEAR_DEEPSEEK'"));
 assert.doesNotMatch(save,/deepSeekProvider|fetch|execute/);
 assert.match(worker,/!\['SAVE_DEEPSEEK_CREDENTIAL','CLEAR_DEEPSEEK'\]\.includes\(request\.type\)/);
});

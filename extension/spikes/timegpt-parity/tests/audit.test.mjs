import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const root=new URL('..',import.meta.url);
test('standalone manifest: no permissions, storage, background or official runtime dependencies',async()=>{
 const m=JSON.parse(await readFile(new URL('manifest.json',root),'utf8'));
 for(const key of ['permissions','host_permissions','background','web_accessible_resources'])assert.equal(m[key],undefined);
 assert.equal(m.content_scripts[0].world,'MAIN');assert.equal(m.content_scripts[0].run_at,'document_start');assert.equal(m.content_scripts[1].run_at,'document_idle');
 for(const row of m.content_scripts){assert.deepEqual(row.matches,['https://chatgpt.com/*']);for(const name of row.js){
  assert.equal(name.includes('/'),false);const code=await readFile(new URL(name,root),'utf8');
  assert.doesNotMatch(code,/chrome\.|localStorage|sessionStorage|indexedDB|XMLHttpRequest|WebSocket|sendBeacon|console\.|innerHTML|innerText|\.content\b|\.parts\b|\.text\(\)|ArchiveStore|SourceTimeResolver|CAPTURE|ENRICH_SOURCE_METADATA/);
 }}
});

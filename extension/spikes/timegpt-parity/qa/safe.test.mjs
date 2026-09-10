import test from 'node:test';
import assert from 'node:assert/strict';
import {configFor,validConfig,alias,targetURL,safeReport,readSafePanel,verdict} from './safe.mjs';
const url='https://chatgpt.com/c/11111111-1111-4111-8111-111111111111';
test('A stores only irreversible alias; B URL opt-in; strict target format',()=>{
 const a=configFor(url);assert.ok(validConfig(a));assert.equal(JSON.stringify(a).includes('11111111'),false);assert.equal(Object.hasOwn(a,'url'),false);assert.equal(alias(url,a.salt),a.alias);
 const b=configFor(url,'url');assert.ok(validConfig(b));assert.equal(b.url,url);
 for(const s of ['https://evil.example/c/a',url+'?token=secret',url+'#x',url.replace('11111111-1111-4111-8111-111111111111','------------------------------------')])assert.equal(targetURL(s),null);
});
test('reports whitelist all fields and reject sensitive reason strings',()=>{
 const r=safeReport('PASS',url,{matched:2,candidates:3,token:'SECRET',body:'PRIVATE',url,observed:1,accepted:1,rejected:0});
 assert.equal(r.reason,'HARNESS_ERROR');assert.deepEqual(Object.keys(r),['status','reason','matched','candidates','observed','accepted','rejected']);assert.equal(JSON.stringify(r).includes('SECRET'),false);
 assert.equal(verdict({ready:true,matched:1,candidates:2,observed:1}).status,'PASS');assert.equal(verdict({ready:true,matched:0,candidates:0,observed:0}).reason,'NO_DETAIL_RESPONSE');assert.equal(verdict(null).matched,null);
});
test('safe projection never returns raw panel text or private injection',()=>{
 const old=globalThis.document;globalThis.document={getElementById:()=>({shadowRoot:{getElementById:()=>({textContent:'status: observing\nMAIN hook: seen\ndrain received: yes\nmatched user messages: 3\ncreate_time candidates: 5\nobserved detail responses: 1\naccepted responses: 1\nrejected responses: 0\nPRIVATE '+url})}})};
 try{assert.deepEqual(readSafePanel(),{matched:3,candidates:5,observed:1,accepted:1,rejected:0,ready:true});}finally{globalThis.document=old;}
});
test('harness never invokes credential, network-body, screenshot or trace collectors',async()=>{
 const {readFile}=await import('node:fs/promises');
 for(const path of ['harness.mjs','run.mjs']){const code=await readFile(new URL(path,import.meta.url),'utf8');assert.doesNotMatch(code,/\.cookies\(|\.storageState\(|\.screenshot\(|\.tracing\.|sessionStorage|localStorage|Keychain|\.responseBody\(|Network\.getResponseBody|\.on\(['"](?:console|request|response|pageerror)['"]/);}
});
test('PASS can never be emitted for zero, unknown or invalid result counts',()=>{
 for(const counts of [{matched:0,candidates:1},{matched:1,candidates:0},{},{matched:-1,candidates:1}])assert.notEqual(safeReport('PASS','COUNTS_POSITIVE',counts).status,'PASS');
});

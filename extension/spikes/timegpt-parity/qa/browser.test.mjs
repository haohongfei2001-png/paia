import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,mkdir,symlink,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {launchQA,saveTarget,loadTarget,locateTarget,smoke} from './harness.mjs';
const chat='11111111-1111-4111-8111-111111111111',id='aaaaaaaa-aaaa-4aaa-8aaa-000000000001',url='https://chatgpt.com/c/'+chat;
async function offline(ctx){await ctx.route(/^https?:\/\//,route=>{
 const u=new URL(route.request().url());if(u.origin!=='https://chatgpt.com')return route.abort();
 if(u.pathname.startsWith('/backend-api/'))return route.fulfill({contentType:'application/json',body:JSON.stringify({conversation_id:chat,mapping:{x:{message:{id,author:{role:'user'},create_time:1609459200}}}})});
 return route.fulfill({contentType:'text/html',body:`<!doctype html><main><div data-message-author-role="user" data-message-id="${id}">SYNTHETIC_PRIVATE</div></main><script>fetch('/backend-api/conversation/${chat}').then(r=>r.text());</script>`});
});}
test('QA launch validates isolated extension, fresh profile; smoke hard refresh and safe counts; reuse profile/config',async()=>{
 const base=await mkdtemp(join(tmpdir(),'paia-qa-test-'));let qa;
 try{
  qa=await launchQA({base,headless:true,beforeLaunch:offline});assert.equal(qa.onlyParity,true);const p=await qa.context.newPage();await p.goto(url);
  const a=await saveTarget(qa.local,url,'alias');assert.equal(await locateTarget(qa.context,a),url);assert.equal((await readFile(join(qa.local,'target.json'),'utf8')).includes(chat),false);
  const result=await smoke(p,url,{timeout:5000,minWait:600,stableFor:300});assert.equal(result.status,'PASS');assert.equal(result.matched,1);assert.equal(result.candidates,1);assert.equal(JSON.stringify(result).includes(chat),false);
  const b=await saveTarget(qa.local,url,'url');assert.equal((await stat(join(qa.local,'target.json'))).mode&0o777,0o600);await qa.close();qa=null;
  qa=await launchQA({base,headless:true,beforeLaunch:offline});const loaded=await loadTarget(qa.local);assert.deepEqual(loaded,b);assert.equal(await locateTarget(qa.context,loaded),url);
  const r=await smoke(await qa.context.newPage(),url,{timeout:5000,minWait:600,stableFor:300});assert.equal(r.status,'PASS');
 }finally{await qa?.close();await rm(base,{recursive:true,force:true});}
});
test('refuses a non-QA existing profile and symlinked profile',async()=>{
 const base=await mkdtemp(join(tmpdir(),'paia-qa-guard-'));try{
  const path=join(base,'tests/qa-browser-profile');await mkdir(join(path,'unowned'),{recursive:true});await assert.rejects(launchQA({base,headless:true}),/PROFILE_REFUSED/);
  await rm(path,{recursive:true});await symlink(tmpdir(),path);await assert.rejects(launchQA({base,headless:true}),/PROFILE_REFUSED/);
 }finally{await rm(base,{recursive:true,force:true});}
});
test('automatic failures remain safe: missing provider, auth redirect, navigation failure and absent alias',async()=>{
 const base=await mkdtemp(join(tmpdir(),'paia-qa-fail-'));let qa;try{
  qa=await launchQA({base,headless:true,beforeLaunch:async ctx=>ctx.route(/^https?:\/\//,r=>r.fulfill({contentType:'text/html',body:'<!doctype html><main></main>'}))});
  const p=await qa.context.newPage();const a=await saveTarget(qa.local,url,'alias');assert.equal(await locateTarget(qa.context,a),null);
  const r=await smoke(p,url,{timeout:1600,minWait:300,stableFor:100});assert.equal(r.status,'FAIL');assert.equal(r.reason,'NO_DETAIL_RESPONSE');assert.equal(r.matched,0);
  await qa.context.unrouteAll();await qa.context.route(/^https?:\/\//,r=>r.request().url().includes('/c/')?r.fulfill({status:302,headers:{location:'https://chatgpt.com/auth/login'}}):r.fulfill({contentType:'text/html',body:'<button data-testid="login-button">Login</button>'}));
  assert.equal((await smoke(p,url,{timeout:1000})).reason,'AUTH_REQUIRED');
  await qa.context.unrouteAll();await qa.context.route(/^https?:\/\//,r=>r.abort());const failed=await smoke(p,url,{timeout:1000});assert.equal(failed.reason,'NAVIGATION_FAILED');assert.equal(JSON.stringify(failed).includes(chat),false);
 }finally{await qa?.close();await rm(base,{recursive:true,force:true});}
});

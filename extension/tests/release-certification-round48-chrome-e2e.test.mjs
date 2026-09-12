import test from 'node:test';
import assert from 'node:assert/strict';
import {FakeChatGPT,eventually,pause} from './harness/fake-chatgpt.mjs';

const rpc=async(page,type,fields={})=>{const r=await page.evaluate(x=>chrome.runtime.sendMessage(x),{type,...fields});assert.equal(r.ok,true,JSON.stringify(r));return r.data;};
const rawRpc=(page,type,fields={})=>page.evaluate(x=>chrome.runtime.sendMessage(x),{type,...fields});

async function consent(page){await page.locator('#consent-check').check();await page.locator('#enable-consent').click();await eventually(async()=>(await rpc(page,'GET_STATUS')).consented===true,'consent becomes durable');}
async function openUniversal(page,query){await eventually(async()=>await page.locator('#universal-search-open').isVisible(),'Universal Search control is mounted');await page.locator('#universal-search-open').click();const box=page.getByRole('searchbox',{name:'全局搜索'});await box.fill(query);await eventually(async()=>await page.locator('#universal-search-dialog .universal-hit').count()>0,'Universal Search returns a current-runtime result');return page.locator('#universal-search-dialog .universal-hit').first();}

test('Round 4.8 current release: Universal Search -> Reader / Context and Revisit are real Chrome journeys',{timeout:120000},async()=>{
 const h=await FakeChatGPT.start();
 try{
  const p=h.archive,first='ROUND48_SEARCH_TARGET 我决定把 PAIA 做成长期可阅读的个人输入档案。',second='ROUND48_REVISIT_NEW 我后来补充：回访应该只提示真正新增的本机内容。';
  await consent(p);
  await h.open({id:'round48-current',title:'Round 4.8 Current Release',base:1609459200,messages:[{id:'round48-one',text:first}]});
  await eventually(async()=>(await h.state()).records.length===1,'first Input is captured');

  // Search -> Reader uses the production Universal Search overlay and the real
  // Input Archive navigation path, rather than a unit-only projection.
  let hit=await openUniversal(p,'ROUND48_SEARCH_TARGET');
  await hit.locator('.universal-open').click();
  await eventually(async()=>await p.locator('#document-panel').isVisible()&&(await p.locator('#document-body').textContent()).includes('ROUND48_SEARCH_TARGET'),'search result opens its Input document');

  // Direct unorganized Inputs are opt-in by design. Satisfy that explicit user
  // eligibility before testing Search -> Context; the journey must not weaken
  // the default authorization boundary merely to make a search hit reusable.
  await rpc(p,'PAIA_MEMORY_SETTINGS',{options:{includeUnorganizedInputs:true}});
  const memoryStatus=await rpc(p,'PAIA_MEMORY_STATUS',{options:{profileId:'default'}});assert.equal(memoryStatus.config.includeUnorganizedInputs,true);

  // Search -> Context only prepares a bounded local retrieval query. It must not
  // invoke the remote organizer or any external request.
  hit=await openUniversal(p,'ROUND48_SEARCH_TARGET');
  await hit.locator('.universal-context').click();
  await eventually(async()=>await p.locator('#memory-builder').isVisible()&&(await p.locator('#memory-query').inputValue()).includes('ROUND48_SEARCH_TARGET'),'search result prepares AI Context query');
  const prepared=await p.locator('#memory-query').inputValue();assert.match(prepared,/重点参考我以前的这段表达/);assert.match(prepared,/我现在想继续了解/);
  assert.equal(h.deepSeekRequests.length,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.externalRequests,0);

  // First Revisit establishes a baseline; a later captured Input becomes the
  // only new-item signal and can navigate back to the canonical reader.
  await p.locator('#revisit-open').click();await eventually(async()=>await p.locator('#revisit-dialog').evaluate(el=>el.open),'Revisit opens');
  assert.match(await p.locator('.revisit-intro').textContent(),/第一次打开回访/);await p.locator('#revisit-dialog footer button').click();
  await eventually(async()=>!(await p.locator('.revisit-intro').textContent()).includes('第一次打开回访'),'Revisit baseline is stored');
  const baseline=await rpc(p,'PAIA_REVISIT_STATUS');assert.equal(baseline.firstRun,false);assert.equal(baseline.newInputs.count,0);await p.locator('.revisit-close').click();
  await h.open({id:'round48-current',title:'Round 4.8 Current Release',base:1609459200,messages:[{id:'round48-one',text:first},{id:'round48-two',text:second}]});
  await eventually(async()=>{const s=await h.state(),source=s.records.find(r=>r.originalText===second);return s.records.length===2&&!!source&&s.library?.blocks?.some(b=>!b.excluded&&b.originalTextReference===source.id);},'later Input is linked into Input Archive after baseline');
  let revisitStatus=null;await eventually(async()=>{revisitStatus=await rpc(p,'PAIA_REVISIT_STATUS');return revisitStatus.newInputs.items.some(item=>String(item.snippet||'').includes('ROUND48_REVISIT_NEW'));},'Revisit service sees the newly captured Input');assert.ok(revisitStatus.newInputs.count>=1);
  await p.locator('#revisit-open').click();
  const newCard=p.locator('.revisit-card').filter({hasText:'ROUND48_REVISIT_NEW'});await eventually(async()=>await newCard.count()===1,'Revisit UI renders the service-visible new Input');await newCard.locator('.revisit-card-open').click();
  await eventually(async()=>await p.locator('#document-panel').isVisible()&&(await p.locator('#document-body').textContent()).includes('ROUND48_REVISIT_NEW'),'Revisit item opens canonical Input reader');
  await pause(100);assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});

test('Round 4.8 current release: Passport grant binds a Context package and revoke fails closed in Chrome',{timeout:60000},async()=>{
 const h=await FakeChatGPT.start();
 try{
  const p=h.archive;await consent(p);
  const status=await rpc(p,'PAIA_PASSPORT_STATUS');assert.equal(status.localOnly,true);assert.equal(status.storesBody,false);assert.equal(status.permission,'context_export');
  const built=await rpc(p,'PAIA_MEMORY_BUILD',{options:{query:'ROUND48 passport certification',profileId:'default',budget:'short'}});assert.equal(built.contextPackage.grantId,null);assert.equal(built.contextPackage.persistedBody,false);
  const grant=await rpc(p,'PAIA_PASSPORT_CREATE',{grant:{consumer:'chatgpt',purpose:'research',profileId:'default',duration:'once'}});assert.equal(grant.state,'active');
  const bound=await rpc(p,'PAIA_CONTEXT_BIND',{previewId:built.previewId,grantId:grant.grantId});assert.equal(bound.grantId,grant.grantId);assert.equal(bound.consumer,'chatgpt');assert.equal(bound.purpose,'research');assert.equal(bound.persistedBody,false);
  const revoked=await rpc(p,'PAIA_PASSPORT_REVOKE',{grantId:grant.grantId});assert.equal(revoked.state,'revoked');
  const denied=await rawRpc(p,'PAIA_MEMORY_SHARE',{options:{previewId:built.previewId,grantId:grant.grantId,format:'copy',removed:[]}});assert.equal(denied.ok,false);assert.equal(denied.error,'MEMORY_DENIED');
  assert.equal(h.deepSeekRequests.length,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});

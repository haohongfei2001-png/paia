import {openRetainedSearchComponent} from './harness/retained-search-component.mjs';
import {settleContextCapture,assertContextUnavailable,contextSafetySnapshot,observeContextEffects,assertNoContextEffects} from './current-context-scope-helper.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {FakeChatGPT,eventually,pause} from './harness/fake-chatgpt.mjs';

const rpc=async(page,type,fields={})=>{const r=await page.evaluate(x=>chrome.runtime.sendMessage(x),{type,...fields});assert.equal(r.ok,true,JSON.stringify(r));return r.data;};
const rawRpc=(page,type,fields={})=>page.evaluate(x=>chrome.runtime.sendMessage(x),{type,...fields});

async function consent(page){await page.locator('#consent-check').check();await page.locator('#enable-consent').click();await eventually(async()=>(await rpc(page,'GET_STATUS')).consented===true,'consent becomes durable');}
async function openUniversal(page,query){assert.equal(await page.locator('#universal-search-open').isVisible(),false,'normal pages expose no global Search launcher');assert.equal(await page.locator('#archive-select-materials').count(),0,'Archive root has no duplicate material-selection launcher');await assertContextUnavailable(page);await openRetainedSearchComponent(page,{types:['input','thought','ai']});const box=page.getByRole('searchbox',{name:'全局搜索'});await box.fill(query);await eventually(async()=>await page.locator('#universal-search-dialog .universal-hit').count()>0,'internal material Search returns a current-runtime result');return page.locator('#universal-search-dialog .universal-hit').first();}

test('Round 4.8 current release: retained Search component -> Reader and Revisit survive the unavailable Context route',{timeout:120000},async()=>{
 const h=await FakeChatGPT.start();
 try{
  const p=h.archive,first='ROUND48_SEARCH_TARGET 我决定把 PAIA 做成长期可阅读的个人输入档案。',second='ROUND48_REVISIT_NEW 我后来补充：回访应该只提示真正新增的本机内容。';
  await consent(p);
  await h.open({id:'round48-current',title:'Round 4.8 Current Release',base:1609459200,messages:[{id:'round48-one',text:first}]});
  await eventually(async()=>(await h.state()).records.length===1,'first Input is captured');

  // Component-only Search still uses the real Input Archive Reader. Its former
  // Context picker launcher is withdrawn and is checked unavailable above.
  let hit=await openUniversal(p,'ROUND48_SEARCH_TARGET');
  await hit.locator('.universal-open').click();
  await eventually(async()=>await p.locator('#document-panel').isVisible()&&(await p.locator('#document-body').textContent()).includes('ROUND48_SEARCH_TARGET'),'search result opens its Input document');

  await p.locator('#back').click();await eventually(()=>p.locator('#universal-search-dialog').isVisible(),'Reader returns to its Search task');assert.equal(await p.getByRole('searchbox',{name:'全局搜索'}).inputValue(),'ROUND48_SEARCH_TARGET');

  // The withdrawn Context segment is a truthful no-op through ordinary navigation.
  await p.locator('.universal-close').click();
  await settleContextCapture(h);const before=await contextSafetySnapshot(p);await observeContextEffects(p);
  await assertContextUnavailable(p);
  assert.deepEqual(await contextSafetySnapshot(p),before);
  assert.equal((await rpc(p,'PAIA_MEMORY_STATUS')).config.includeUnorganizedInputs,false);
  await assertNoContextEffects(p,h);

  p.once('dialog',dialog=>dialog.accept());await p.locator('#primary-nav [data-view="library"]').click();await p.locator('#scope-search').fill('');await eventually(()=>p.locator('#archive-navigator').isVisible());assert.equal(await p.locator('.library-prose').count(),0,'Archive root clears only the Reader');
  // UX-R2 creates a fixed visit window; a later captured Input becomes the
  // only new-item signal and can navigate back to the canonical reader.
  await p.evaluate(()=>document.dispatchEvent(new CustomEvent('paia:navigate',{detail:{view:'revisit'}})));await eventually(async()=>await p.locator('#revisit-panel').isVisible(),'Revisit opens');
  assert.match(await p.locator('.revisit-intro').textContent(),/不表示|does not mark/i);
  assert.equal(await p.locator('#revisit-panel footer .primary').count(),0,'no mark-all or baseline action');
  await p.locator('.revisit-close').click();
  const baseline=await rpc(p,'PAIA_REVISIT_STATUS');assert.equal(baseline.firstRun,false);assert.equal(baseline.newInputs.count,0);
  await h.open({id:'round48-current',title:'Round 4.8 Current Release',base:1609459200,messages:[{id:'round48-one',text:first},{id:'round48-two',text:second}]});
  await eventually(async()=>{const s=await h.state(),source=s.records.find(r=>r.originalText===second);return s.records.length===2&&!!source&&s.library?.blocks?.some(b=>!b.excluded&&b.originalTextReference===source.id);},'later Input is linked into Input Archive after baseline');
  let revisitStatus=null;await eventually(async()=>{revisitStatus=await rpc(p,'PAIA_REVISIT_STATUS');return revisitStatus.newInputs.items.some(item=>String(item.snippet||'').includes('ROUND48_REVISIT_NEW'));},'Revisit service sees the newly captured Input');assert.ok(revisitStatus.newInputs.count>=1);
  await p.evaluate(()=>document.dispatchEvent(new CustomEvent('paia:navigate',{detail:{view:'revisit'}})));await eventually(async()=>await p.locator('#revisit-panel').isVisible(),'Revisit reopens after later Input');
  const newCard=p.locator('.revisit-card').filter({hasText:'ROUND48_REVISIT_NEW'});await eventually(async()=>await newCard.count()===1,'Revisit UI renders the service-visible new Input');await newCard.locator('.revisit-card-open').evaluate(el=>{globalThis.__round48StableRevisit=el;});const worker=h.context.serviceWorkers()[0];await worker.evaluate(()=>{void chrome.runtime.sendMessage({type:'ARCHIVE_CHANGED',cause:'CAPTURE'}).catch(()=>{});});await pause(250);assert.equal(await newCard.locator('.revisit-card-open').evaluate(el=>el===globalThis.__round48StableRevisit),true,'duplicate capture refresh keeps the same Revisit action node');await newCard.locator('.revisit-card-open').click();
  await eventually(async()=>await p.locator('#document-panel').isVisible()&&(await p.locator('#document-body').textContent()).includes('ROUND48_REVISIT_NEW'),'Revisit item opens canonical Input reader');
  await pause(100);assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});

test('Round 4.8 current release: Context requests remain retired while saved Passport grants can be revoked without releasing content',{timeout:60000},async()=>{
 const h=await FakeChatGPT.start();
 try{
  const p=h.archive;await consent(p);
  await h.open({id:'round48-passport-history',title:'Synthetic retained grant',base:1609459200,messages:[{id:'round48-history-one',text:'ROUND48 retained original evidence'}]});await eventually(async()=>(await h.state()).records.length===1);await settleContextCapture(h);
  const grantId=await p.evaluate(async()=>{
   const {OrganizerStore}=await import('../core/organizer/store.js'),{profileDefault,configDefault}=await import('../core/memory/model.js'),{validatePassportRow}=await import('../core/passport.js');
   const s=new OrganizerStore(chrome.storage.local);await s.finishFoundation();
   // A synthetic grant already stored by the historical release, never a current grant-creation call.
   const grant={id:'passport:grant:round48-historical',kind:'grant',version:1,grantId:'round48-historical',consumer:'chatgpt',purpose:'research',resourceScope:'profile',profileId:'default',permission:'context_export',duration:'once',createdAt:'2026-01-01T00:00:00.000Z',expiresAt:null,revokedAt:null,consumedAt:null,lastUsedAt:null,useCount:0};
   if(!validatePassportRow(grant))throw Error('invalid historical synthetic grant');
   await s.repository.transaction(true,async t=>{await t.put('meta',profileDefault());await t.put('meta',{...configDefault(),externalAccess:true});await t.put('meta',grant);});return grant.grantId;
  });
  const before=await contextSafetySnapshot(p),status=before.passport;assert.equal(status.localOnly,true);assert.equal(status.storesBody,false);assert.equal(status.permission,'context_export');assert.equal(status.grants[0].state,'active');
  for(const [type,fields]of [
   ['PAIA_MEMORY_SETTINGS',{options:{externalAccess:true}}],
   ['PAIA_MEMORY_BUILD',{options:{query:'ROUND48 private query',profileId:'default',budget:'short'}}],
   ['PAIA_PASSPORT_CREATE',{grant:{consumer:'chatgpt',purpose:'research',profileId:'default',duration:'once'}}],
   ['PAIA_CONTEXT_BIND',{previewId:'historical-preview',grantId}],
   ['PAIA_MEMORY_SHARE',{options:{previewId:'historical-preview',grantId,format:'copy'}}]
  ]){const denied=await rawRpc(p,type,fields);assert.equal(denied.ok,false);assert.equal(denied.error,'FEATURE_UNAVAILABLE');}
  assert.deepEqual(await contextSafetySnapshot(p),before,'old commands do not edit content, consume a grant, collect audit or change permissions');
  const revoked=await rpc(p,'PAIA_PASSPORT_REVOKE',{grantId});assert.equal(revoked.state,'revoked');assert.equal(revoked.useCount,0);
  for(const format of ['copy','markdown']){const denied=await rawRpc(p,'PAIA_MEMORY_SHARE',{options:{previewId:'historical-preview',grantId,format}});assert.equal(denied.error,'FEATURE_UNAVAILABLE');}
  const after=await contextSafetySnapshot(p);assert.deepEqual(after.records,before.records);assert.deepEqual(after.library,before.library);assert.deepEqual(after.session,before.session);assert.deepEqual(after.permissions,before.permissions);assert.deepEqual(after.passport.audits,[]);assert.equal(after.passport.grants[0].consumedAt,null);
  assert.equal(h.deepSeekRequests.length,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});

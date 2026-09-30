import test from 'node:test';
import assert from 'node:assert/strict';
import {FakeChatGPT,eventually} from './harness/fake-chatgpt.mjs';
import {openArchiveWindow} from './harness/archive-navigator.mjs';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const reply=(page,type,fields={})=>page.evaluate(message=>chrome.runtime.sendMessage(message),{type,...fields});
const rpc=async(page,type,fields={})=>{const r=await reply(page,type,fields);assert.equal(r.ok,true,JSON.stringify(r));return r.data;};
async function dump(page){return page.evaluate(async()=>{
 const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('paia-archive');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
 const names=[...db.objectStoreNames],tx=db.transaction(names,'readonly');
 const data=Object.fromEntries(await Promise.all(names.map(async name=>[name,await new Promise((resolve,reject)=>{const r=tx.objectStore(name).getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);})])));db.close();
 return {db:data,local:await chrome.storage.local.get(null)};
});}
async function settle(page){await eventually(async()=>{const value=await dump(page);return !value.db.libraryMigrationItems?.some(r=>r.entityKind==='search'&&r.statusKey===0)&&!value.db.organizerJobs?.some(r=>r.kind==='purge_cleanup'&&r.stateKey===0)&&!value.db.invalidations?.some(r=>r.stateKey===0)&&value.db.meta.find(r=>r.id==='library-search-rebuild')?.complete!==false;},'actual queued local maintenance finishes before measuring effects');}
async function fixture(extensionPath){const h=await FakeChatGPT.start(extensionPath?{extensionPath}:{}),p=h.archive;await p.locator('#consent-check').check();await p.locator('#enable-consent').click();await h.open({id:'dvn-purge-boundary',title:'SYNTHETIC purge boundary',base:1609459200,messages:[{id:'dvn-purge-message',text:'SYNTHETIC immutable source 中文 👩‍💻'}]});await eventually(async()=>(await h.state()).records.length===1);await rpc(p,'SET_ENABLED',{enabled:false});await openArchiveWindow(p,{text:'SYNTHETIC purge boundary'});const id=await p.locator('.library-prose').first().getAttribute('data-edit-id'),b=await rpc(p,'GET_INPUT',{id});await settle(p);return {h,p,b};}
const releaseRoot=mkdtempSync(join(tmpdir(),'paia-dvn-purge-release-'));test.after(()=>rmSync(releaseRoot,{recursive:true,force:true}));
console.log(execFileSync('python3',['scripts/build_current_release.py',releaseRoot],{encoding:'utf8'}));
for(const variant of ['source','release']){
 const extensionPath=variant==='release'?releaseRoot:null;
 test(`D1 mixed human purge refuses in actual worker and low-frequency UI without clearing recovery or canonical data (${variant})`,{timeout:90000},async()=>{
  const {h,p,b}=await fixture(extensionPath);try{
   const field=p.locator(`.library-prose[data-edit-id="${b.id}"]`);await field.fill('SYNTHETIC human working version');await eventually(async()=>(await rpc(p,'GET_INPUT',{id:b.id})).libraryText==='SYNTHETIC human working version');await eventually(async()=>/已保存|Saved/.test(await p.locator('#save-status').textContent()));
   const current=await rpc(p,'GET_INPUT',{id:b.id}),epoch=(await rpc(p,'GET_STATE')).recoveryEpoch;
   const draft={epoch,kind:'document',ownerId:b.documentId,token:crypto.randomUUID(),operation:{type:'EDIT_DOCUMENT',edit:{operationId:crypto.randomUUID(),documentId:b.documentId,blocks:[{id:b.id,expectedRevision:current.revision,libraryText:'SYNTHETIC unsaved human recovery',note:'',excluded:false}]}}};
   const saved=await rpc(p,'PAIA_RECOVERY_DRAFT_SAVE',{draft});await settle(p);const before=await dump(p);
   assert.deepEqual(await rpc(p,'PAIA_ARCHIVE_SOURCE_PURGE_PREFLIGHT',{id:b.sourceRecordId}),{state:'owner_gate_required',gate:'B-02',targetRef:b.sourceRecordId});assert.deepEqual(await dump(p),before);
   assert.equal((await reply(p,'PURGE_SOURCE',{id:b.sourceRecordId,confirm:true})).error,'SOURCE_PURGE_OWNER_GATE');assert.deepEqual(await dump(p),before);
   await p.locator('[data-view="settings"]').click();await p.locator('[data-settings-group="data"]').click();await p.locator('[data-view="archive"]').click();await openArchiveWindow(p,{text:'SYNTHETIC purge boundary'});await p.locator('.original-prose').first().click({button:'right'});await p.getByRole('menuitem',{name:'永久删除并忽略此来源…',exact:true}).click();
   await p.getByRole('heading',{name:'暂不能永久删除',exact:true}).waitFor();assert.equal(await p.locator('dialog[open]').count(),1);assert.match(await p.locator('.reader-confirm').textContent(),/没有删除任何材料，也没有清除恢复草稿/);await p.keyboard.press('Escape');
   await rpc(p,'UPDATE_PREFERENCES',{changes:{language:'en'}});await eventually(()=>p.evaluate(()=>document.documentElement.lang==='en'));
   await p.locator('.original-prose').first().click({button:'right'});await p.getByRole('menuitem',{name:/永久删除并忽略此来源|Permanently delete.*Source/i}).click();
   await p.getByRole('heading',{name:'Permanent deletion is unavailable',exact:true}).waitFor();assert.match(await p.locator('.reader-confirm').textContent(),/No material or recovery draft was deleted/);assert.doesNotMatch(await p.locator('.reader-confirm').textContent(),/[\u3400-\u9fff]/);await p.keyboard.press('Escape');
   assert.equal((await rpc(p,'GET_INPUT',{id:b.id})).libraryText,'SYNTHETIC human working version');assert.deepEqual(await rpc(p,'PAIA_RECOVERY_DRAFT_LOAD',{draft:{kind:draft.kind,ownerId:draft.ownerId,epoch}}),saved);assert.equal((await h.state()).records[0].originalText,'SYNTHETIC immutable source 中文 👩‍💻');assert.deepEqual(h.errors,[]);assert.equal(h.extensionNetworkRequests,0);
  }finally{await h.close();}
 });
 test(`D1 composing Input pins existing recovery and refuses another page's purge without collecting keystrokes (${variant})`,{timeout:90000},async()=>{
  const {h,p,b}=await fixture(extensionPath);try{
   const field=p.locator(`.library-prose[data-edit-id="${b.id}"]`),title=p.locator('#document-title'),originalTitle=await title.textContent(),epoch=(await rpc(p,'GET_STATE')).recoveryEpoch;
   await title.evaluate(el=>{el.focus();el.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));el.textContent='SYNTHETIC unfinished TITLE';});
   await eventually(async()=>{const row=await rpc(p,'PAIA_RECOVERY_DRAFT_LOAD',{draft:{kind:'document',ownerId:b.documentId,epoch}});return row?.operation.edit.title==='';},'title composition pins its existing owner without collecting text');
   const titleBefore=await dump(p);assert.equal((await reply(p,'PURGE_SOURCE',{id:b.sourceRecordId,confirm:true})).error,'SOURCE_PURGE_OWNER_GATE');assert.deepEqual(await dump(p),titleBefore);
   await title.evaluate((el,text)=>{el.textContent=text;el.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true}));},originalTitle);
   await eventually(async()=>!await rpc(p,'PAIA_RECOVERY_DRAFT_LOAD',{draft:{kind:'document',ownerId:b.documentId,epoch}}),'cancelled unchanged composition clears only its pin');
   await field.evaluate(el=>{el.focus();el.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));el.textContent='SYNTHETIC unfinished 中文';el.dispatchEvent(new InputEvent('input',{bubbles:true,isComposing:true,inputType:'insertCompositionText'}));});
   let pinned;
   await eventually(async()=>{pinned=await rpc(p,'PAIA_RECOVERY_DRAFT_LOAD',{draft:{kind:'document',ownerId:b.documentId,epoch}});return pinned?.sourceRecordIds.includes(b.sourceRecordId);},'actual recovery pin persists before independent purge');
   assert.equal(JSON.stringify(pinned).includes('unfinished'),false,'composition keystrokes are not collected');assert.equal(pinned.operation.edit.blocks[0].libraryText,null);
   const other=await h.context.newPage();await other.goto(p.url());await settle(p);const before=await dump(p);
   assert.equal((await reply(other,'PURGE_SOURCE',{id:b.sourceRecordId,confirm:true})).error,'SOURCE_PURGE_OWNER_GATE');assert.deepEqual(await dump(p),before);assert.equal(await field.textContent(),'SYNTHETIC unfinished 中文');
   await field.evaluate(el=>el.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true})));await eventually(async()=>(await rpc(p,'GET_INPUT',{id:b.id})).libraryText==='SYNTHETIC unfinished 中文','composition end uses the existing durable writer');assert.equal((await h.state()).records[0].originalText,'SYNTHETIC immutable source 中文 👩‍💻');assert.deepEqual(h.errors,[]);assert.equal(h.extensionNetworkRequests,0);
  }finally{await h.close();}
 });
 test(`D1 positive preview grants no deletion across a concurrent edit; untouched Source still purges and cannot recapture (${variant})`,{timeout:90000},async()=>{
  const {h,p,b}=await fixture(extensionPath);try{
   assert.equal((await rpc(p,'PAIA_ARCHIVE_SOURCE_PURGE_PREFLIGHT',{id:b.sourceRecordId})).state,'unambiguous');
   const other=await h.context.newPage();await other.goto(p.url());await rpc(other,'EDIT_DOCUMENT',{edit:{operationId:crypto.randomUUID(),documentId:b.documentId,blocks:[{id:b.id,expectedRevision:b.revision,libraryText:null,note:'SYNTHETIC concurrent note',excluded:false}]}});await settle(p);const before=await dump(p);
   assert.equal((await reply(p,'PURGE_SOURCE',{id:b.sourceRecordId,confirm:true})).error,'SOURCE_PURGE_OWNER_GATE');assert.deepEqual(await dump(p),before);await other.close();
   await rpc(p,'SET_ENABLED',{enabled:true});await h.open({id:'dvn-purge-pure',title:'SYNTHETIC untouched Source',base:1609459200,messages:[{id:'dvn-purge-pure-message',text:'SYNTHETIC pure Source'}]});await eventually(async()=>(await h.state()).records.length===2);await rpc(p,'SET_ENABLED',{enabled:false});await settle(p);const pure=(await h.state()).records.find(r=>r.chatId==='dvn-purge-pure');assert.ok(pure);
   assert.equal((await rpc(p,'PAIA_ARCHIVE_SOURCE_PURGE_PREFLIGHT',{id:pure.id})).state,'unambiguous');await rpc(p,'PURGE_SOURCE',{id:pure.id,confirm:true});await eventually(async()=>(await h.state()).records.length===1);assert.equal((await h.state()).records[0].id,b.sourceRecordId);
   await rpc(p,'SET_ENABLED',{enabled:true});await h.open({id:'dvn-purge-pure',title:'SYNTHETIC untouched Source',base:1609459200,messages:[{id:'dvn-purge-pure-message',text:'SYNTHETIC changed attempted recapture'}]});await eventually(async()=>(await h.state()).diagnostics.ingestion?.ignored===1);assert.equal((await h.state()).records.some(r=>r.chatId==='dvn-purge-pure'),false);assert.deepEqual(h.errors,[]);assert.equal(h.extensionNetworkRequests,0);
  }finally{await h.close();}
 });
}

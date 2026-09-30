import {formPreGatePurgeState} from '../fixtures/pre-b02-purge-state.mjs';

// Synthetic historical state admission, ONLY in automation's isolated profile.
// Current worker denial + whole-database/recovery equality must pass FIRST.
// The pinned pre-gate body forms the old state; current UI/read/release guards
// still run on today's production code. Nothing is added to the release/API.
export async function admitPreGatePurgeBrowserFixture(page,id,{allowCurrentPure=false}={}){
 return page.evaluate(`(async()=>{
  const {OrganizerStore}=await import(chrome.runtime.getURL('core/organizer/store.js'));
  const {ArchiveError}=await import(chrome.runtime.getURL('core/constants.js'));
  const {identifySource}=await import(chrome.runtime.getURL('core/dedupe.js'));
  const {chatOf,blockIndex}=await import(chrome.runtime.getURL('core/idb-repository.js'));
  const {detachSources}=await import(chrome.runtime.getURL('core/library.js'));
  const {clearReadingTargets,clearPurgedReaderPolicy}=await import(chrome.runtime.getURL('core/reader-state.js'));
  const {purgeSourceStructureForRecords}=await import(chrome.runtime.getURL('core/source-structure-store.js'));
  const error=code=>{throw new ArchiveError(code);},id=${JSON.stringify(id)};
  const store=new OrganizerStore(chrome.storage.local);
  await store.drainPurgeCleanup();await store.drainInvalidations();await store.drainLibraryMaintenance();
  let prior=null,stable=0;for(let n=0;n<100&&stable<3;n++){const generation=await store.repository.transaction(false,async t=>(await t.get('meta','backup-data-generation'))?.value||0,['meta']);stable=generation===prior?stable+1:0;prior=generation;if(stable<3)await new Promise(resolve=>setTimeout(resolve,25));}if(stable<3)throw Error('HISTORICAL_FIXTURE_MAINTENANCE_NOT_SETTLED');
  const preview=await chrome.runtime.sendMessage({type:'PAIA_ARCHIVE_SOURCE_PURGE_PREFLIGHT',id});
  if(!preview.ok)throw Error('HISTORICAL_FIXTURE_PREFLIGHT_FAILED');
  if(${JSON.stringify(allowCurrentPure)}&&preview.data.state==='unambiguous'){
   const result=await chrome.runtime.sendMessage({type:'PURGE_SOURCE',id,confirm:true});if(!result.ok)throw Error('CURRENT_PURE_PURGE_FAILED');return {evidenceClass:'CURRENT_PURE_PURGE'};
  }
  if(preview.data.state!=='owner_gate_required'||preview.data.gate!=='B-02')throw Error('EXPECTED_CURRENT_B02_REFUSAL');
  const digest=async()=>{
   const db=await store.repository.transaction(false,async t=>Object.fromEntries(await Promise.all(store.repository.stores.map(async name=>[name,await t.all(name)]))));
   const local=await chrome.storage.local.get(null),raw=JSON.stringify({db,local});
   return {snapshot:{db,local},hash:[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw)))].map(n=>n.toString(16).padStart(2,'0')).join('')};
  };
  const before=await digest(),snapshot=before.snapshot,denied=await chrome.runtime.sendMessage({type:'PURGE_SOURCE',id,confirm:true});
  const after=await digest();if(denied.ok||denied.error!=='SOURCE_PURGE_OWNER_GATE'||after.hash!==before.hash){const next=after.snapshot,changed=Object.keys(snapshot.db).filter(k=>JSON.stringify(snapshot.db[k])!==JSON.stringify(next.db[k])),local=Object.keys({...snapshot.local,...next.local}).filter(k=>JSON.stringify(snapshot.local[k])!==JSON.stringify(next.local[k]));throw Error('CURRENT_B02_ZERO_EFFECTS_FAILED:'+JSON.stringify({denied,changed,local}));}
  const form=${formPreGatePurgeState.toString()};await form.call(store,id,true);
  await chrome.runtime.sendMessage({type:'ARCHIVE_CHANGED',cause:'SYNTHETIC_PRE_GATE_FIXTURE'});
  return {evidenceClass:'CURRENT_B02_REFUSAL_PLUS_HISTORICAL_COMPATIBILITY',beforeDigest:before.hash};
 })()`);
}

import {formPreGatePurgeState} from '../fixtures/pre-b02-purge-state.mjs';
import {runWithPreDispatchReadRetry} from './pre-dispatch-read-retry.mjs';

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
  // This independent fixture instance can race the real worker while acquiring
  // its initial read fence. Never replay an entered callback or the pinned body.
  const preDispatchRead=${runWithPreDispatchReadRetry.toString()},originalRun=store.run.bind(store);
  store.run=callback=>preDispatchRead(originalRun,callback);
  const stage=async(label,fn)=>{try{return await fn();}catch(cause){throw new Error('HISTORICAL_FIXTURE_STAGE:'+label+':'+(cause?.code||cause?.message||'UNKNOWN'),{cause});}};
  await stage('drain-purge',()=>store.drainPurgeCleanup());await stage('drain-invalidations',()=>store.drainInvalidations());await stage('drain-library',()=>store.drainLibraryMaintenance());
  // Navigation read projections do not advance backup-data-generation. Finish
  // their actual pending scopes before freezing the complete refusal oracle;
  // never suppress a reader, discard meta rows, or retry an entered purge.
  let prior=null,stable=0;for(let n=0;n<100&&stable<8;n++){
   const filter=await store.filterStatus();if(filter.taskState==='failed')throw Error('HISTORICAL_FIXTURE_FILTER_FAILED');
   const meta=await store.repository.transaction(false,t=>t.all('meta'),['meta']);
   const scopes=new Map([['providers'],...meta.filter(row=>row.id.startsWith('ans:index-state:v1:scope:')).map(row=>row.scope)].map(scope=>[JSON.stringify(scope),scope]));
   let complete=!filter.pending&&filter.taskState==='idle';
   for(const scope of scopes.values()){
    const page=scope[0]==='providers'?{groupKind:'providers'}:scope[0]==='groups'?{providerKey:scope[1],groupKind:'groups'}:{providerKey:scope[1],groupKind:scope[2],...(scope[2]==='project'?{projectRef:{providerKey:scope[3][0],namespace:scope[3][1],projectId:scope[3][2]}}:{})};
    const result=await chrome.runtime.sendMessage({type:'PAIA_ARCHIVE_NAV_PAGE',page});if(!result.ok)throw Error('HISTORICAL_FIXTURE_NAVIGATION_FAILED');
    complete&&=result.data.coverage.state==='complete'&&result.data.coverage.archiveComplete;
   }
   const settled=await store.repository.transaction(false,t=>t.all('meta'),['meta']),catalog=settled.find(row=>row.id==='ans:index-state:v1:catalog');
   complete&&=catalog?.phase==='complete'&&!catalog.pending&&!settled.some(row=>row.id.startsWith('ans:index-state:v1:dirty:')||row.id.startsWith('ans:index-state:v1:gc:')||row.id.startsWith('ans:index-state:v1:scope:')&&(row.shadow||row.activeRevision!==row.revision));
   const current=JSON.stringify(settled);stable=complete&&current===prior?stable+1:0;prior=current;
   if(stable<8)await new Promise(resolve=>setTimeout(resolve,25));
  }if(stable<8)throw Error('HISTORICAL_FIXTURE_MAINTENANCE_NOT_SETTLED');
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
  const after=await digest();if(denied.ok||denied.error!=='SOURCE_PURGE_OWNER_GATE'||after.hash!==before.hash){const next=after.snapshot,changed=Object.keys(snapshot.db).filter(k=>JSON.stringify(snapshot.db[k])!==JSON.stringify(next.db[k])),local=Object.keys({...snapshot.local,...next.local}).filter(k=>JSON.stringify(snapshot.local[k])!==JSON.stringify(next.local[k]));const meta=changed.includes('meta')?[...new Set([...snapshot.db.meta,...next.db.meta].map(r=>r.id))].filter(id=>JSON.stringify(snapshot.db.meta.find(r=>r.id===id))!==JSON.stringify(next.db.meta.find(r=>r.id===id))):[];throw Error('CURRENT_B02_ZERO_EFFECTS_FAILED:'+JSON.stringify({denied,changed,local,meta}));}
  const form=${formPreGatePurgeState.toString()};await stage('form-historical-state',()=>form.call(store,id,true));
  await chrome.runtime.sendMessage({type:'ARCHIVE_CHANGED',cause:'SYNTHETIC_PRE_GATE_FIXTURE'});
  return {evidenceClass:'CURRENT_B02_REFUSAL_PLUS_HISTORICAL_COMPATIBILITY',beforeDigest:before.hash};
 })()`);
}

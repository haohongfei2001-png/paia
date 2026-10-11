// Synthetic legacy backup encoder invoked only by the test debugger. It is
// never copied into the release, registered with the worker, or exposed to UI.
// All import/restore and integrity checks run the unmodified production code.
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
const source=await readFile(new URL('./historical-backup.mjs',import.meta.url),'utf8');
const readRetry=await readFile(new URL('./pre-dispatch-read-retry.mjs',import.meta.url),'utf8');
const encoder=source.replace(/^import \{([^\n]+)\} from '(\.\.\/\.\.\/core\/[^']+)';$/gm,(_all,names,path)=>
 `const {${names.replace(/\s+as\s+/g,':')}}=await import(chrome.runtime.getURL(${JSON.stringify(path.slice(6))}));`)
 .replace('export class BackupService','class BackupService');

export async function historicalBackupItems(page,{retryPreDispatchReads=false}={}){
 assert.equal(typeof retryPreDispatchReads,'boolean');
 const retired=await page.evaluate(()=>chrome.runtime.sendMessage({type:'PAIA_BACKUP_BEGIN_EXPORT'}));
 assert.equal(retired.ok,false);assert.equal(retired.error,'FEATURE_UNAVAILABLE');
 const script=`(async()=>{${encoder}\n${retryPreDispatchReads?readRetry.replace('export async function','async function'):''}\n
 const {OrganizerStore}=await import(chrome.runtime.getURL('core/organizer/store.js'));
 const store=new OrganizerStore(chrome.storage.local);
 ${retryPreDispatchReads?`let stage='construct',runNumber=0;const events=[];globalThis.__uxR6BackupPhase={stage,events};const originalObservedRun=store.run.bind(store);store.run=fn=>{const event={stage,run:++runNumber,entered:false};events.push(event);if(events.length>32)events.shift();return originalObservedRun(()=>{event.entered=true;return fn();}).catch(error=>{event.error=typeof error?.code==='string'&&/^[A-Z0-9_]{1,64}$/.test(error.code)?error.code:'UNKNOWN';throw error;});};const phase=value=>{stage=value;__uxR6BackupPhase.stage=stage;};try{`:''}
 // Only a rejected acquisition before the supplied callback enters may retry.
 // Initialization and maintenance callbacks still execute at most once; their
 // effects, pending publications and all other errors are never replayed.
 ${retryPreDispatchReads?'const originalReadRun=store.run.bind(store);store.run=fn=>runWithPreDispatchReadRetry(originalReadRun,fn);':''}
 ${retryPreDispatchReads?"phase('finish-foundation');":''}await store.finishFoundation();
 ${retryPreDispatchReads?"phase('drain-purge');":''}await store.drainPurgeCleanup();
 ${retryPreDispatchReads?"phase('drain-invalidations');":''}await store.drainInvalidations();
 ${retryPreDispatchReads?"phase('drain-library');":''}await store.drainLibraryMaintenance();
 const service=new BackupService(store,{appVersion:chrome.runtime.getManifest().version});
 ${retryPreDispatchReads?"phase('begin-export');":''}const start=await service.beginExport(),items=[start.header];
 for(let sequence=0;sequence<10000;sequence++){${retryPreDispatchReads?"phase('export-page-'+sequence);":''}const page=await service.exportPage({sessionId:start.sessionId,sequence});items.push(...page.items);if(page.done)return items;}
 throw Error('Historical synthetic backup exceeded bounded fixture pages');
 ${retryPreDispatchReads?"}catch(error){__uxR6BackupPhase.failed=true;throw error;}":''}
 })()`;
 try{return await page.evaluate(script);}
 catch(error){
  if(retryPreDispatchReads)try{
   const diagnostic=await page.evaluate(()=>globalThis.__uxR6BackupPhase);
   const directory=new URL('../../work/ux-r6-release/',import.meta.url);
   await mkdir(directory,{recursive:true});
   await writeFile(new URL('historical-backup-failure-metadata.json',directory),JSON.stringify({testedHead:process.env.PAIA_TESTED_HEAD||null,...diagnostic},null,2));
   console.error('UXR6_HISTORICAL_BACKUP_FAILURE',JSON.stringify(diagnostic));
  }catch(diagnosticError){console.error('UXR6_HISTORICAL_BACKUP_DIAGNOSTIC_FAILED',diagnosticError?.name);}
  throw error;
 }
}

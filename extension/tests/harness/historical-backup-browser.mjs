// Synthetic legacy backup encoder invoked only by the test debugger. It is
// never copied into the release, registered with the worker, or exposed to UI.
// All import/restore and integrity checks run the unmodified production code.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('./historical-backup.mjs',import.meta.url),'utf8');
const encoder=source.replace(/^import \{([^\n]+)\} from '(\.\.\/\.\.\/core\/[^']+)';$/gm,(_all,names,path)=>
 `const {${names.replace(/\s+as\s+/g,':')}}=await import(chrome.runtime.getURL(${JSON.stringify(path.slice(6))}));`)
 .replace('export class BackupService','class BackupService');

export async function historicalBackupItems(page){
 const retired=await page.evaluate(()=>chrome.runtime.sendMessage({type:'PAIA_BACKUP_BEGIN_EXPORT'}));
 assert.equal(retired.ok,false);assert.equal(retired.error,'FEATURE_UNAVAILABLE');
 const script=`(async()=>{${encoder}\n
 const {OrganizerStore}=await import(chrome.runtime.getURL('core/organizer/store.js'));
 const store=new OrganizerStore(chrome.storage.local);await store.finishFoundation();await store.drainPurgeCleanup();await store.drainInvalidations();await store.drainLibraryMaintenance();
 const service=new BackupService(store,{appVersion:chrome.runtime.getManifest().version});
 const start=await service.beginExport(),items=[start.header];
 for(let sequence=0;sequence<10000;sequence++){const page=await service.exportPage({sessionId:start.sessionId,sequence});items.push(...page.items);if(page.done)return items;}
 throw Error('Historical synthetic backup exceeded bounded fixture pages');
 })()`;
 return page.evaluate(script);
}

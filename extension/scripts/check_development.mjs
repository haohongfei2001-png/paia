import {readFile,readdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url);
const manifest=JSON.parse(await readFile(new URL('manifest.json',root),'utf8'));
assert.deepEqual(manifest.permissions,['storage']);assert.ok(!JSON.stringify(manifest).includes('development/'));
for(const folder of ['development/compat/','development/reload/','development/export-probe/'])for(const file of (await readdir(new URL(folder,root))).filter(x=>x.endsWith('.js'))){
 const source=await readFile(new URL(folder+file,root),'utf8');
 assert.ok(!/\b(?:fetch|XMLHttpRequest|WebSocket|EventSource)\s*\(|sendBeacon|document\.cookie|localStorage|sessionStorage|indexedDB|innerHTML|outerHTML|innerText|document\.title|console\./.test(source),'DEV_PRIVACY_NETWORK_AUDIT');
 assert.ok(!/chrome\.(?:storage|cookies|history|downloads|tabs)\b/.test(source),'DEV_PERMISSION_AUDIT');
}
const reload=await readFile(new URL('development/reload/popup-reload.js',root),'utf8');
assert.ok(!/postMessage|onMessage|addEventListener\(['"]message|sendMessage|originalText|libraryText/.test(reload),'NO_WEB_RELOAD_CHANNEL');
process.stdout.write('DEVELOPMENT_PRIVACY_PERMISSION_NETWORK_AUDIT_PASS\n');

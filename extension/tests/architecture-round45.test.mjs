import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {assertFeatureAvailable,unavailableFeatureCode} from '../core/feature-availability.js';
const source=path=>readFile(path,'utf8');

test('retired Product Signals has no collector or product dashboard implementation',async()=>{
 for(const path of ['core/product-signals.js','ui/product-signals.js','ui/product-signals.html','ui/product-signals.css'])await assert.rejects(access(path),{code:'ENOENT'});
 const worker=await source('background/service-worker.js');assert.doesNotMatch(worker,/new ProductSignals|import[^\n]*product-signals/);
 assert.throws(()=>assertFeatureAvailable({type:'PAIA_PRODUCT_SIGNAL'}),{code:'FEATURE_UNAVAILABLE'});
});

test('trusted background rejects Context execution but retains Passport status and revocation',async()=>{
 const text=await source('background/service-worker.js');assert.match(text,/new PassportService\(store\)/);assert.match(text,/assertFeatureAvailable\(request\)/);
 for(const type of ['PAIA_MEMORY_BUILD','PAIA_MEMORY_SHARE','PAIA_CONTEXT_BIND','PAIA_CONTEXT_MANUAL','PAIA_PASSPORT_CREATE'])assert.throws(()=>assertFeatureAvailable({type}),{code:'FEATURE_UNAVAILABLE'});
 for(const type of ['PAIA_PASSPORT_STATUS','PAIA_PASSPORT_REVOKE','PAIA_MEMORY_EXCLUDE'])assert.equal(unavailableFeatureCode({type}),null);
});

test('ordinary settings has no Product Signals dashboard or Context output entry',async()=>{
 const [html,script]=await Promise.all([source('ui/archive.html'),source('ui/r6-settings.js')]);
 assert.doesNotMatch(html,/id="(?:product-signals-panel|context-bind|context-share|backup-create)"/);
 assert.doesNotMatch(script,/import[^\n]*product-signals/);
});

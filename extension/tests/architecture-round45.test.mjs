import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const source=path=>readFile(path,'utf8');

test('Product Signals remains analytics-only after Round 4.5',async()=>{
 const text=await source('core/product-signals.js');
 assert.doesNotMatch(text,/PassportService|ContextPackageService|createContextPackage|contextPackageEnvelope/);
 assert.doesNotMatch(text,/bindPackage|grantId/);
 assert.match(text,/observation-only/);
});

test('trusted background route owns Context Package and Passport commands',async()=>{
 const text=await source('background/service-worker.js');
 assert.match(text,/new PassportService\(store\)/);
 assert.match(text,/new ContextPackageService\(memory,passport\)/);
 assert.match(text,/case 'PAIA_MEMORY_BUILD': return contextPackages\.build/);
 assert.match(text,/case 'PAIA_MEMORY_SHARE': return contextPackages\.share/);
 assert.match(text,/case 'PAIA_CONTEXT_BIND': return contextPackages\.bind/);
 assert.match(text,/case 'PAIA_PASSPORT_CREATE'/);
});

test('local tools UI uses explicit Passport and Context APIs',async()=>{
 const text=await source('ui/product-signals.js');
 assert.match(text,/PAIA_PASSPORT_STATUS/);
 assert.match(text,/PAIA_PASSPORT_CREATE/);
 assert.match(text,/PAIA_PASSPORT_REVOKE/);
 assert.match(text,/PAIA_CONTEXT_BIND/);
 assert.doesNotMatch(text,/PAIA_PRODUCT_SETTINGS[^\n]*passport/);
});

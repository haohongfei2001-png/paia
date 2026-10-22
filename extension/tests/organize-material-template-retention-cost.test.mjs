import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './harness/organize-material-method-fixture.mjs';
import {captureOriginalOrganizeScopeReader,readOriginalOrganizeScopeReader} from '../background/organize-processing-policy.js';
import {IDBObjectStore} from './vendor/fake-indexeddb/build/esm/index.js';

test('internal full material reader does not allocate an unused retained Thought template, but every repeated get remains a native request',async t=>{
 const f=await fixture(t),get=IDBObjectStore.prototype.get,encode=TextEncoder.prototype.encode;let physical=0,retained=0;
 t.mock.method(IDBObjectStore.prototype,'get',function(...args){if(this.name==='thoughts'&&(new Error().stack||'').includes('/background/organize-processing-policy.js:'))physical++;return Reflect.apply(get,this,args);});
 t.mock.method(TextEncoder.prototype,'encode',function(value){if(typeof value==='string'&&value.includes('"thoughtText":')&&(new Error().stack||'').includes('/background/organize-processing-policy.js:'))retained++;return Reflect.apply(encode,this,[value]);});
 await f.read(async(_ordinary,grant,tx)=>{const reader=readOriginalOrganizeScopeReader(captureOriginalOrganizeScopeReader(grant,f.s,tx),f.s,tx).reader,first=await reader.get('thoughts',f.entry.id);assert.equal(first.thoughtText,'PRIVATE authored body');Object.defineProperty(first,'thoughtText',{value:'CALLER ONLY'});assert.equal((await reader.get('thoughts',f.entry.id)).thoughtText,'PRIVATE authored body');});
 assert.equal(physical,2);assert.equal(retained,0);t.diagnostic(JSON.stringify({physicalThoughtGets:physical,retainedThoughtEncodings:retained}));
});
test('internal full material no-template reads retain no hidden large text copies across fresh transactions',async t=>{
 const f=await fixture(t,{body:'x'.repeat(100000)});let completed=0;for(let i=0;i<30;i++)await f.read(async(_ordinary,grant,tx)=>{const reader=readOriginalOrganizeScopeReader(captureOriginalOrganizeScopeReader(grant,f.s,tx),f.s,tx).reader;await reader.get('thoughts',f.entry.id);completed++;});assert.equal(completed,30);
});

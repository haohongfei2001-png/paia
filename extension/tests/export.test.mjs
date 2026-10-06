import test from 'node:test';
import assert from 'node:assert/strict';
import {exportJSON,exportMarkdown,textBlock} from '../core/export.js';
for(const [name,exporter] of Object.entries({exportJSON,exportMarkdown,textBlock}))test(name+' rejects obsolete calls before reading content and never mutates existing data',()=>{
 let reads=0;const poison=new Proxy({},{get(){reads++;throw Error('SYNTHETIC content must not be read');},ownKeys(){reads++;throw Error('SYNTHETIC content must not be enumerated');}});
 assert.throws(()=>exporter(poison),{code:'FEATURE_UNAVAILABLE'});assert.equal(reads,0);
 const saved=Object.freeze({originalText:'SYNTHETIC original',libraryText:'SYNTHETIC edited',note:'SYNTHETIC note'});const before=structuredClone(saved);
 for(const input of [undefined,null,[],Object.freeze([saved])])assert.throws(()=>exporter(input),{code:'FEATURE_UNAVAILABLE'});
 assert.deepEqual(saved,before);
});

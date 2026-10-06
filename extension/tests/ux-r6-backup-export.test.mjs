import test from 'node:test';
import assert from 'node:assert/strict';
import {openExportRecord,buildOpenExport,exportOpenJSON,exportOpenMarkdown,OpenExportWriter} from '../core/open-export.js';
const poison=()=>new Proxy({},{get(){throw Error('SYNTHETIC legacy content read');},ownKeys(){throw Error('SYNTHETIC legacy content enumeration');}});
for(const [name,fn] of Object.entries({openExportRecord,buildOpenExport,exportOpenJSON,exportOpenMarkdown}))test('retired '+name+' cannot generate content through an old caller',()=>{assert.throws(()=>fn(poison(),poison()),{code:'FEATURE_UNAVAILABLE'});assert.throws(()=>fn([]),{code:'FEATURE_UNAVAILABLE'});});
test('retired streaming export rejects construction and direct stale prototype calls',()=>{assert.throws(()=>new OpenExportWriter(poison()),{code:'FEATURE_UNAVAILABLE'});for(const method of ['add','finish'])assert.throws(()=>OpenExportWriter.prototype[method].call(poison(),poison()),{code:'FEATURE_UNAVAILABLE'});});

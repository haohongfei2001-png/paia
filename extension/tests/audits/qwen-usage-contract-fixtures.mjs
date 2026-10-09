// Design-corpus integrity only. This is not a raw parser or a live route test.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {normalizeUsage} from '../../core/ai-usage/usage-normalization.js';
const corpus=JSON.parse(await readFile(new URL('../fixtures/qwen-usage-contract-v1.json',import.meta.url),'utf8'));
assert.equal(corpus.version,1);
assert.equal(corpus.scope,'SYNTHETIC_DESIGN_ONLY_NOT_PARSER_OR_PROVIDER_PROOF');
assert.equal(corpus.trust,'NONE');
assert.equal(corpus.productionActivation,false);
const ids=new Set(),counts={KNOWN:0,UNKNOWN:0,INVALID:0};
let normal=0,stream=0,neutralOracles=0;
for(const c of corpus.cases){
 assert.match(c.id,/^[a-z0-9-]{1,100}$/);
 assert.ok(!ids.has(c.id));ids.add(c.id);
 assert.ok(['synthetic-only-direct-compatible-thinking','synthetic-only-direct-compatible-nonthinking'].includes(c.shapeProfile));
 assert.ok(['normal','stream'].includes(c.mode));
 assert.ok(c.raw&&typeof c.raw==='object'&&!Array.isArray(c.raw));
 assert.ok(Object.hasOwn(counts,c.expected.usageState));counts[c.expected.usageState]++;
 assert.equal(c.expected.reservation,'HELD_PENDING_INDEPENDENT_FINANCIAL_PROOF');
 assert.equal(c.expected.financialAuthority,false);
 assert.equal(c.expected.dispatchAllowed,false);
 if(c.mode==='stream'){stream++;assert.ok(Array.isArray(c.raw.frames));assert.equal(typeof c.raw.done,'boolean');assert.equal(typeof c.raw.transportComplete,'boolean');}else normal++;
 if(c.expected.usageState==='KNOWN'){
  assert.ok(c.expected.neutral);
  const normalized=normalizeUsage(c.expected.neutral);
  assert.equal(normalized.state,'known');assert.equal(normalized.releaseReservation,false);
  assert.equal(normalized.billable.standardInput+normalized.billable.cachedReadInput+normalized.billable.cacheCreateInput,c.expected.neutral.inputTokens);
  assert.equal(normalized.billable.completion,c.expected.neutral.completionTokens);
  neutralOracles++;
 }else assert.equal(Object.hasOwn(c.expected,'neutral'),false);
}
for(const n of corpus.neutralNegativeOracles)assert.throws(()=>normalizeUsage(n));
assert.deepEqual(normalizeUsage(null),{state:'unknown',releaseReservation:false});
assert.ok(normal>0&&stream>0&&counts.KNOWN>0&&counts.UNKNOWN>0&&counts.INVALID>0);
console.log(JSON.stringify({scope:'DESIGN_CORPUS_INTEGRITY_ONLY',cases:ids.size,normal,stream,expectedStates:counts,neutralOracles,negativeNeutralOracles:corpus.neutralNegativeOracles.length,rawParserImplemented:false,providerQualified:false,financialAuthority:false}));

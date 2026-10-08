import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {group,testShard} from '../scripts/test-groups.mjs';

test('Prompt Foundation preserves the complete unit corpus across four whole-file jobs and fails closed before native acceptance',async()=>{
 const names=(await readdir(new URL('./',import.meta.url))).filter(name=>name.endsWith('.test.mjs')&&group(name)==='unit').sort();
 const parts=Array.from({length:4},(_,i)=>names.filter((name,position)=>testShard('tests/'+name,position,4,'unit')===i+1));
 assert.ok(names.length>100);assert.ok(parts.every(part=>part.length));assert.deepEqual(parts.flat().sort(),names);assert.equal(new Set(parts.flat()).size,names.length);
 const workflow=await readFile(new URL('../../.github/workflows/paia-prompt-reuse.yml',import.meta.url),'utf8');
 const unit=workflow.split('  unit:')[1].split('  foundation:')[0],foundation=workflow.split('  foundation:')[1];
 assert.match(unit,/shard: \['1\/4','2\/4','3\/4','4\/4'\]/);assert.match(unit,/fail-fast: false/);
 assert.match(unit,/PAIA_TEST_CONCURRENCY: '1'/);assert.match(unit,/PAIA_TEST_SHARD: \$\{\{ matrix.shard \}\}/);assert.match(unit,/npm run test:unit/);
 for(const job of [unit,foundation]){assert.match(job,/timeout-minutes: 15/);assert.doesNotMatch(job,/continue-on-error|test-name-pattern|test-skip-pattern/);}
 assert.match(foundation,/needs: unit/);assert.match(foundation,/if: needs.unit.result == 'success' &&/);
 for(const required of ['tests/cpv1-09-prompt-compatibility-chrome-e2e.test.mjs','tests/cpv1-09-prompt-insertion-chrome-e2e.test.mjs','tests/cpv1-09-prompt-surface-chrome-e2e.test.mjs','tests/cpv1-12-next-prompt-chrome-e2e.test.mjs','tests/settings-next-chrome-e2e.test.mjs',"node scripts/test.mjs 'adapter contract'","node scripts/test.mjs 'privacy/security'",'npm run check && npm run build:release'])assert.ok(foundation.includes(required),required);
 assert.doesNotMatch(foundation,/npm run test:unit/);
});

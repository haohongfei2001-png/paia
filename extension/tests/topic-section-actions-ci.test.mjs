const entryMove='topic-entry-section-move-chrome-e2e.test.mjs';
const subsequent=[entryMove,'cpv1-01-ai-cost-foundation-chrome-e2e.test.mjs'];
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {group,testShard} from '../scripts/test-groups.mjs';
const added='cpv1-topic-05-5-section-actions-chrome-e2e.test.mjs';
test('Section actions admits its whole native owner while retaining all304 actual parent routes',async()=>{
 const frozen=JSON.parse(await readFile(new URL('./fixtures/topic-section-actions-prior-routes.json',import.meta.url),'utf8'));
 assert.equal(frozen.base,'ff730401f53e7cb7a5658f7350770b201b5372d4');
 const names=(await readdir(new URL('./',import.meta.url))).filter(n=>n.endsWith('.test.mjs')&&group(n)==='browser E2E').sort();
 assert.equal(names.length,79);assert.equal(frozen.rows.length,76);assert.deepEqual(names.filter(n=>n!==added&&!subsequent.includes(n)),frozen.rows.map(r=>r[0]));
 assert.equal(group('cpv1-topic-05-5-unadmitted-chrome-e2e.test.mjs'),'historical browser E2E');
 for(const file of subsequent)for(const total of [4,5,6,7])assert.equal(testShard(file,names.indexOf(file),total,'browser E2E'),4);
 for(const total of [4,5,6,7])assert.equal(testShard(entryMove,names.indexOf(entryMove),total,'browser E2E'),4);
 let checked=0;
 for(const [column,total] of [4,5,6,7].entries()){
  assert.equal(testShard(added,names.indexOf(added),total,'browser E2E'),4);
  for(const [name,...routes] of frozen.rows){
   assert.equal(testShard(name,names.indexOf(name),total,'browser E2E'),routes[column],`${total}:${name}`);
   assert.equal(testShard('tests/'+name,names.indexOf(name),total,'browser E2E'),routes[column]);checked++;
  }
  const shards=Array.from({length:total},(_,slot)=>names.filter((n,i)=>testShard(n,i,total,'browser E2E')===slot+1));
  assert.ok(shards.every(s=>s.length));assert.deepEqual(shards.flat().sort(),names);assert.equal(new Set(shards.flat()).size,79);
 }
 assert.equal(checked,304);
 const workflow=await readFile(new URL('../../.github/workflows/paia-certification.yml',import.meta.url),'utf8');
 const job=workflow.split('  current_browser:')[1].split('  full_suite:')[0];
 assert.match(job,/timeout-minutes: 18/);assert.match(job,/npm run test:browser/);assert.doesNotMatch(job,/continue-on-error|test-name-pattern|test-skip-pattern/);
 assert.deepEqual([...job.matchAll(/shard: '(\d\/7)'/g)].map(r=>r[1]),['1/7','2/7','3/7','4/7','5/7','6/7','7/7']);
});

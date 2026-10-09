const topicReturn='topic-section-return-position-chrome-e2e.test.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {group,testShard} from '../scripts/test-groups.mjs';
test('removed Placement admits one complete file and checks all336 prior routes with one measured ReaderRevisit move',async()=>{
 const added='settings-removed-placement-chrome-e2e.test.mjs';
 const prior=JSON.parse(await readFile(new URL('./fixtures/settings-removed-placement-prior-routes.json',import.meta.url),'utf8'));
 assert.match(prior.base,/^76db8d6f[0-9a-f]{32}$/);assert.equal(prior.rows.length,84);
 const names=(await readdir(new URL('./',import.meta.url))).filter(n=>n.endsWith('.test.mjs')&&group(n)==='browser E2E').sort();
 assert.equal(names.length,86);assert.deepEqual(names.filter(n=>n!==topicReturn&&n!==added),prior.rows.map(row=>row[0]));
 assert.equal(group('settings-removed-unadmitted-chrome-e2e.test.mjs'),'historical browser E2E');
 let checked=0;
 for(const [column,total] of [4,5,6,7].entries()){
  assert.equal(testShard(added,names.indexOf(added),total,'browser E2E'),4);
  for(const [name,...routes] of prior.rows){
   for(const file of [name,'tests/'+name])assert.equal(testShard(file,names.indexOf(name),total,'browser E2E'),(total===7&&name==='ux-r2-reader-revisit-chrome-e2e.test.mjs'?6:routes[column]),`${total}:${file}`);
   checked++;
  }
  const parts=Array.from({length:total},(_,i)=>names.filter((n,p)=>testShard(n,p,total,'browser E2E')===i+1));
  assert.deepEqual(parts.flat().sort(),names);assert.equal(new Set(parts.flat()).size,86);assert.ok(parts.every(part=>part.length));
 }
 assert.equal(checked,336);assert.equal(testShard(added,names.indexOf(added),9,'browser E2E'),4);
 const workflow=await readFile(new URL('../../.github/workflows/paia-certification.yml',import.meta.url),'utf8'),job=workflow.split('  current_browser:')[1].split('  full_suite:')[0];
 assert.match(job,/timeout-minutes: 18/);assert.match(job,/npm run test:browser/);assert.doesNotMatch(job,/continue-on-error|test-name-pattern|test-skip-pattern/);
});

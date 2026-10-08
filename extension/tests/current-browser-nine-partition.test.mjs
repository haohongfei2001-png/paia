import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {group,testShard} from '../scripts/test-groups.mjs';
test('nine measured whole-file jobs preserve every legacy route and exact current coverage',async()=>{
 const plan=JSON.parse(await readFile(new URL('./fixtures/current-browser-capacity-nine.json',import.meta.url),'utf8'));
 assert.equal(plan.legacyBase,'144f87b4c6f214aeab0130bbca763d7c5a83bd28');assert.equal(plan.legacyRoutes.length,84);
 const added='settings-removed-placement-chrome-e2e.test.mjs';
 const names=(await readdir(new URL('./',import.meta.url))).filter(n=>n.endsWith('.test.mjs')&&group(n)==='browser E2E').sort();assert.equal(names.length,85);assert.deepEqual(names.filter(n=>n!==added),plan.legacyRoutes.map(row=>row[0]));assert.deepEqual([...plan.files.map(row=>row.file)].sort(),names.filter(n=>n!==added));assert.equal(testShard(added,names.indexOf(added),9,'browser E2E'),4);
 for(const [column,total]of [4,5,6,7].entries())for(const [file,...routes]of plan.legacyRoutes)for(const path of [file,'tests/'+file])assert.equal(testShard(path,names.indexOf(file),total,'browser E2E'),routes[column],`${total}:${path}`);
 const actual=Array.from({length:9},(_,i)=>names.filter((n,p)=>testShard(n,p,9,'browser E2E')===i+1));assert.deepEqual(actual.flat().sort(),names);assert.equal(new Set(actual.flat()).size,names.length);assert.ok(actual.every(files=>files.length));
 for(const bucket of plan.proposedNineBins){assert.deepEqual(actual[bucket.shard-1].filter(n=>n!==added),[...bucket.files].sort());assert.ok(bucket.conservativeJobSeconds<900,'measured planning envelope only, not a runtime PASS');assert.equal(bucket.reservedSetupArtifactSeconds,60);}
 for(const file of names)assert.equal(testShard('tests/'+file,names.indexOf(file),9,'browser E2E'),testShard(file,names.indexOf(file),9,'browser E2E'));
 assert.throws(()=>testShard('new-unadmitted-chrome-e2e.test.mjs',0,9,'browser E2E'),/CURRENT_NINE_UNADMITTED/);
 for(const [file,slot]of [['uir-04-settings-chrome-e2e.test.mjs',6],['context-cards-chrome-e2e.test.mjs',6],['cpv1-02-dvn-topic-content-chrome-e2e.test.mjs',5]])assert.equal(testShard(file,names.indexOf(file),9,'browser E2E'),slot);
 const workflow=await readFile(new URL('../../.github/workflows/paia-certification.yml',import.meta.url),'utf8'),job=workflow.split('  current_browser:')[1].split('  full_suite:')[0];
 assert.deepEqual([...job.matchAll(/shard: '(\d\/9)'/g)].map(x=>x[1]),Array.from({length:9},(_,i)=>`${i+1}/9`));assert.match(job,/timeout-minutes: 18/);assert.match(job,/PAIA_TEST_CONCURRENCY: '1'/);assert.match(job,/fail-fast: false/);assert.doesNotMatch(job,/test-name-pattern|test-skip-pattern|continue-on-error/);
});

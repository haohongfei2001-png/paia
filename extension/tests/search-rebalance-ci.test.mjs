import test from 'node:test';import assert from 'node:assert/strict';import {readFile,readdir} from 'node:fs/promises';import {group,testShard} from '../scripts/test-groups.mjs';
test('measured search rebalance changes exactly one prior whole-file route without losing coverage',async()=>{
 const prior=JSON.parse(await readFile(new URL('./fixtures/search-rebalance-prior-routes.json',import.meta.url),'utf8'));
 assert.equal(prior.base,'8a38c8644605be6919c114f0b6866ada36a2552d');assert.equal(prior.rows.length,83);
 const names=(await readdir(new URL('./',import.meta.url))).filter(n=>n.endsWith('.test.mjs')&&group(n)==='browser E2E').sort(),changed=[];
 for(const [column,total]of [4,5,6,7].entries()){
  for(const [file,...routes]of prior.rows){assert.ok(names.includes(file));const actual=testShard(file,names.indexOf(file),total,'browser E2E');if(actual!==routes[column])changed.push({file,total,before:routes[column],after:actual});}
  const all=Array.from({length:total},(_,slot)=>names.filter((n,i)=>testShard(n,i,total,'browser E2E')===slot+1)).flat();assert.deepEqual(all.sort(),names);assert.equal(new Set(all).size,names.length);
 }
 assert.deepEqual(changed,[{file:'ux-r4-search-reuse-chrome-e2e.test.mjs',total:7,before:3,after:6}]);
 const workflow=await readFile(new URL('../../.github/workflows/paia-certification.yml',import.meta.url),'utf8'),job=workflow.split('  current_browser:')[1].split('  full_suite:')[0];assert.match(job,/timeout-minutes: 18/);assert.match(job,/npm run test:browser/);assert.doesNotMatch(job,/test-name-pattern|test-skip-pattern|continue-on-error/);
});

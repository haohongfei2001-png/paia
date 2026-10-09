import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {group,testShard} from '../scripts/test-groups.mjs';
const added='topic-section-return-position-chrome-e2e.test.mjs';

test('current Section return journey preserves all 425 accepted whole-file routes',async()=>{
 const prior=JSON.parse(await readFile(new URL('./fixtures/topic-return-prior-routes.json',import.meta.url),'utf8'));
 assert.equal(prior.base,'f1963370461f5c5899eddee0bee8cef40712c822');
 assert.deepEqual(prior.widths,[4,5,6,7,9]);assert.equal(prior.rows.length,85);
 const names=(await readdir(new URL('./',import.meta.url))).filter(n=>n.endsWith('.test.mjs')&&group(n)==='browser E2E').sort();
 assert.equal(names.length,86);assert.deepEqual(names.filter(n=>n!==added),prior.rows.map(r=>r[0]));
 for(const [column,width]of prior.widths.entries()){
  for(const [name,...routes]of prior.rows)assert.equal(testShard(name,names.indexOf(name),width,'browser E2E'),routes[column],width+':'+name);
  assert.equal(testShard(added,names.indexOf(added),width,'browser E2E'),2);
  const partition=Array.from({length:width},(_,i)=>names.filter((name,p)=>testShard(name,p,width,'browser E2E')===i+1)).flat();
  assert.equal(new Set(partition).size,86);assert.deepEqual(partition.sort(),names);
 }
 assert.equal(group('topic-section-unadmitted-chrome-e2e.test.mjs'),'historical browser E2E');
});

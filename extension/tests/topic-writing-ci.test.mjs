import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {group,testShard} from '../scripts/test-groups.mjs';
const writing='topic-section-writing-chrome-e2e.test.mjs';
test('Topic writing adds one whole native file and preserves all332 actual Prompt parent routes',async()=>{
 const prior=JSON.parse(await readFile(new URL('./fixtures/topic-writing-prior-routes.json',import.meta.url),'utf8'));
 assert.equal(prior.base,'8a38c8644605be6919c114f0b6866ada36a2552d');assert.equal(prior.files,83);assert.equal(prior.rows.length,83);
 const names=(await readdir(new URL('./',import.meta.url))).filter(n=>n.endsWith('.test.mjs')&&group(n)==='browser E2E').sort();
 assert.equal(names.length,84);assert.deepEqual(names.filter(n=>n!==writing),prior.rows.map(r=>r[0]));
 assert.equal(group('topic-section-unadmitted-chrome-e2e.test.mjs'),'historical browser E2E');
 let count=0;
 for(const [column,total] of [4,5,6,7].entries()){
  assert.equal(testShard(writing,names.indexOf(writing),total,'browser E2E'),2);
  for(const [name,...routes] of prior.rows){assert.equal(testShard(name,names.indexOf(name),total,'browser E2E'),(total===7&&name==='ux-r2-reader-revisit-chrome-e2e.test.mjs'?6:total===7&&name==='ux-r4-search-reuse-chrome-e2e.test.mjs'?6:routes[column]),total+':'+name);assert.equal(testShard('tests/'+name,names.indexOf(name),total,'browser E2E'),(total===7&&name==='ux-r2-reader-revisit-chrome-e2e.test.mjs'?6:total===7&&name==='ux-r4-search-reuse-chrome-e2e.test.mjs'?6:routes[column]));count++;}
  const parts=Array.from({length:total},(_,i)=>names.filter((n,p)=>testShard(n,p,total,'browser E2E')===i+1));assert.deepEqual(parts.flat().sort(),names);assert.equal(new Set(parts.flat()).size,84);
 }
 assert.equal(count,332);
});

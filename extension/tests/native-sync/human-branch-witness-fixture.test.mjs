import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {execFileSync} from 'node:child_process';import {posix} from 'node:path';
import {nativeHumanBranchWitnessFixture} from './human-branch-witness-fixture.mjs';import {HUMAN_WITNESS_ORIGINAL_CASES,HUMAN_WITNESS_CASES,HUMAN_WITNESS_PATHS,HUMAN_WITNESS_PROOF_PATHS} from './human-branch-witness-receipt.mjs';
const source=await readFile(new URL('../human-branch-semantic-witness.test.mjs',import.meta.url),'utf8');
test('native witness compiler preserves all fourteen original case bytes and replaces only Node and physical constructor seams',()=>{
 const result=nativeHumanBranchWitnessFixture(source);execFileSync(process.execPath,['--input-type=module','--check'],{input:result,stdio:['pipe','pipe','pipe']});
 for(const line of source.split('\n').filter(x=>/^import .*from '\.\.\/core\//.test(x))){const expected=line.replace('as captureWitness','as originalCaptureWitness').replace('as revalidate,','as originalRevalidate,');assert.ok(result.includes(expected),line);}
 assert.equal(HUMAN_WITNESS_ORIGINAL_CASES.length,14);assert.equal(HUMAN_WITNESS_CASES.length,16);assert.ok(result.includes(source.slice(source.indexOf("test('six exact parent semantic cases"))));assert.doesNotMatch(result,/from ['"]node:|fake-indexeddb|new IDBFactory/);
 for(const name of HUMAN_WITNESS_CASES)assert.equal(result.split("test('"+name+"'").length,2);
 for(const proof of ['indexedDB,name,clock','originalCaptureWitness','originalRevalidate','IDBDatabase.prototype','IDBFactory.prototype','IDBCursor.prototype',"['add','put','delete','clear']","['update','delete']",'old.apply(this,args)','s.repository.db?.close()'])assert.ok(result.includes(proof),proof);
});
test('native witness compiler rejects changed original case or constructor/import seams',()=>{
 for(const [before,after]of [["test('six exact parent semantic cases","test('changed case"],['new LibraryDocumentsStore(local(),','new FakeStore(local(),'],["import test from 'node:test';",'']])assert.throws(()=>nativeHumanBranchWitnessFixture(source.replace(before,after)));
});
test('native receipt runtime inventory is the actual complete static/literal Store Core journal and plan closure',async()=>{
 const seen=new Set(),queue=['core/library-documents-store.js','core/browser-native-sync/core.js','core/browser-native-sync/human-library-journal.js','core/browser-native-sync/human-library-plan.js'];
 while(queue.length){const path=queue.pop();if(seen.has(path))continue;seen.add(path);const text=await readFile(new URL('../../'+path,import.meta.url),'utf8');for(const m of text.matchAll(/(?:from\s*|import\s*\()(['"])(\.[^'"]+)\1/g)){const next=posix.normalize(posix.join(posix.dirname(path),m[2]));if(next.endsWith('.js')&&!seen.has(next))queue.push(next);}}
 assert.deepEqual([...seen].sort(),HUMAN_WITNESS_PATHS);
});
test('native witness outer test keeps separate complete variants and original time and isolation limits',async()=>{
 const text=await readFile(new URL('./human-branch-witness-chrome.test.mjs',import.meta.url),'utf8');for(const s of ["for(const variant of ['source','release'])",'timeout:180000','index<HUMAN_WITNESS_CASES.length','await browser.isolation()','expectedProofHashes','expectedHashes','receipt.result=\'FAIL\'','work/qa-bns-human-branch-witness'])assert.ok(text.includes(s),s);assert.doesNotMatch(text,/test-name-pattern|test-skip-pattern|skip:|timeout:180001/);
});

test('native proof inventory includes the actual harness dynamic imports and copied worker dependency closure',async()=>{
 const owner='tests/human-branch-semantic-witness.test.mjs',worker='tests/native-sync/storage-worker-fixture.mjs',immutable='tests/native-sync/immutable-objects.mjs';
 const seen=new Set([owner]),queue=['tests/native-sync/human-branch-witness-chrome.test.mjs',worker,immutable];
 while(queue.length){const path=queue.pop();if(seen.has(path))continue;seen.add(path);const text=await readFile(new URL('../../'+path,import.meta.url),'utf8');
  // Only real top-level static statements / awaited literal dynamic imports;
  // compiler strings describing removed Node imports are not executed imports.
  const imports=[...text.matchAll(/(?:^|;)\s*import\b\s*(?:[^;]*?\bfrom\s*)?(['"])(\.[^'"]+)\1/gm),...text.matchAll(/\bawait\s+import\s*\(\s*(['"])(\.[^'"]+)\1\s*\)/g)];
  for(const m of imports){const next=path===worker&&m[2]==='./bns-native-immutable-objects.mjs'?immutable:posix.normalize(posix.join(path===worker?'background':posix.dirname(path),m[2]));if(next.startsWith('tests/')&&/\.m?js$/.test(next)&&!seen.has(next))queue.push(next);}
 }
 const harness=await readFile(new URL('./storage-harness.mjs',import.meta.url),'utf8'),chrome=await readFile(new URL('./human-branch-witness-chrome.test.mjs',import.meta.url),'utf8');
 assert.ok(harness.includes("join(here, 'storage-worker-fixture.mjs')"));assert.ok(harness.includes("join(here, 'immutable-objects.mjs')"));assert.ok(chrome.includes("join(root,'tests/human-branch-semantic-witness.test.mjs')"));
 assert.equal(seen.size,10);assert.deepEqual([...seen].sort(),[...HUMAN_WITNESS_PROOF_PATHS].sort());
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {join,posix} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {runInNewContext} from 'node:vm';
import {relativeImports} from './native-sync/retention-native-proof.mjs';

// These are contracts for the original evidence collector, not browser cases.
// Execute its exact snapshot and served-check bodies without starting browsers.
// Only unrelated Git metadata is stubbed; inventory bytes come from this tree.
const root=fileURLToPath(new URL('..',import.meta.url));
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const backgrounds=['background/ai-filter-consent.js','background/maintenance-processing-consent.js'];
const core='core/library-documents-store.js';
const pairs=[
 ['human-current-checkpoint-recovery-native.test.mjs','current-human-checkpoint-recovery-native-fixture.mjs'],
 ['human-current-scope-checkpoint-native.test.mjs','current-scope-checkpoint-native-fixture.mjs']
];

async function collector(name){
 const text=await readFile(join(root,'tests/native-sync',name),'utf8');
 const snapshot=text.match(/^async function snapshot\(\)\{[^\n]+\}$/m)?.[0];
 const served=text.match(/^  for\(const \[path,hash\]of served\)\{[^\n]+\}$/m)?.[0];
 assert.ok(snapshot,'exact original snapshot body remains independently testable');
 assert.ok(served,'exact original served-byte checks remain independently testable');
 return {
  snapshot(read=readFile){return runInNewContext(snapshot+'\nsnapshot()',{
   root,join,readdir,readFile:read,digest,git:(...args)=>args.join(' ')
  });},
  verify(before,entries,runtime,read=readFile){return runInNewContext('(async()=>{'+served+'\n})()',{
   assert,before,served:new Map(entries),runtime,readFile:read,join,digest
  });}
 };
}

async function closure(fixture){
 const queue=['tests/native-sync/'+fixture],seen=new Map();
 while(queue.length){
  const path=queue.pop();if(seen.has(path))continue;
  const bytes=await readFile(join(root,path));seen.set(path,digest(bytes));
  for(const dependency of relativeImports(bytes.toString())){
   const next=posix.normalize(posix.join(posix.dirname(path),dependency));
   assert.ok(!next.startsWith('../')&&!posix.isAbsolute(next));
   if(/\.m?js$/.test(next))queue.push(next);
  }
 }
 return seen;
}

for(const [name,fixture] of pairs){
 test(name+': original before snapshot covers complete independently collected fixture closure',async()=>{
  const proof=await collector(name),before=await proof.snapshot(),imports=await closure(fixture);
  assert.deepEqual([...imports.keys()].filter(p=>p!==('tests/native-sync/'+fixture)&&!p.startsWith('core/')).sort(),backgrounds);
  for(const [path,hash]of imports)assert.equal(before.hashes[path],hash,'independent fixture dependency: '+path);
 });
 test(name+': unchanged original core and background served bytes are both re-read',async()=>{
  const proof=await collector(name),before=await proof.snapshot(),paths=[core,...backgrounds],reads=[];
  await proof.verify(before,await Promise.all(paths.map(async p=>[p,digest(await readFile(join(root,p)))])),root,async path=>{
   reads.push(path);return readFile(path);
  });
  assert.deepEqual(reads,paths.map(p=>join(root,p)));
 });
 for(const background of backgrounds)for(const variant of ['source','release'])test(name+': '+variant+' '+background+' change after serving is refused by original runtime recheck',async()=>{
  const proof=await collector(name),bytes=await readFile(join(root,background)),hash=digest(bytes);
  // Supply the independent first hash to isolate the second runtime check.
  // Release reads are exercised at the real release path without claiming a build.
  const runtime=variant==='source'?root:join(root,'work/current-release');let reads=0;
  await assert.rejects(proof.verify({hashes:{[background]:hash}},[[background,hash]],runtime,async path=>{
   assert.equal(path,join(runtime,background));reads++;return Buffer.concat([bytes,Buffer.from('\n// changed after serving')]);
  }),/actual imported runtime remains unchanged/);
  assert.equal(reads,1);
 });
 test(name+': unlisted served path still refuses before a runtime read',async()=>{
  const proof=await collector(name),before=await proof.snapshot();let reads=0;
  await assert.rejects(proof.verify(before,[['background/unlisted.js','not-an-inventoried-hash']],root,async()=>{reads++;throw Error('unexpected read');}),/exact imported source or fixture bytes/);
  assert.equal(reads,0);
 });
 for(const background of backgrounds)test(name+': original after snapshot observes a changed '+background,async()=>{
  const proof=await collector(name),before=await proof.snapshot();let reads=0;
  const after=await proof.snapshot(async path=>{
   const bytes=await readFile(path);if(path===join(root,background)){reads++;return Buffer.concat([bytes,Buffer.from('\n// changed before after snapshot')]);}return bytes;
  });
  assert.equal(reads,1);assert.notEqual(after.hashes[background],before.hashes[background]);
  for(const path of Object.keys(before.hashes))if(path!==background)assert.equal(after.hashes[path],before.hashes[path]);
 });
}

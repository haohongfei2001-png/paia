import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {parseGitBlobBatch,readGitBlobSnapshot} from './harness/git-blob-snapshot.mjs';
const oid='a'.repeat(40),blob=bytes=>Buffer.concat([Buffer.from(`${oid} blob ${bytes.length}\n`),bytes,Buffer.from('\n')]);
test('immutable Git batch preserves binary newlines, NUL and independent missing paths',()=>{
 const binary=Buffer.from([0,255,10,13,97,10]),empty=Buffer.alloc(0),refs=['head:binary icon','head:missing file','head:empty'];
 const data=Buffer.concat([blob(binary),Buffer.from(refs[1]+' missing\n'),blob(empty)]),result=parseGitBlobBatch(data,refs);
 assert.deepEqual(result.get(refs[0]),binary);assert.equal(result.get(refs[1]),null);assert.deepEqual(result.get(refs[2]),empty);
});
test('Git evidence rejects truncation, nonblob, foreign missing response and extra output',()=>{
 for(const bytes of [Buffer.from(`${oid} blob 12\na\n`),Buffer.from(`${oid} tree 0\n\n`),Buffer.from('another missing\n'),Buffer.concat([blob(Buffer.from('a')),Buffer.from('extra')]),Buffer.from(`${oid} blob 1\na!`)])assert.throws(()=>parseGitBlobBatch(bytes,['head:file']));
});
test('one fixed HEAD batch agrees byte for byte with the original git show oracle',()=>{
 const root=execFileSync('git',['rev-parse','--show-toplevel'],{encoding:'utf8'}).trim(),head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),paths=['extension/manifest.json','extension/icons/icon128.png','extension/core/context-cards.js','extension/NOT-A-REAL-SNAPSHOT-FILE'];
 const snapshot=readGitBlobSnapshot(root,head,paths);
 for(const path of paths.slice(0,-1))assert.deepEqual(snapshot.get(path),execFileSync('git',['show',head+':'+path],{cwd:root}));
 assert.equal(snapshot.get(paths.at(-1)),null);
});

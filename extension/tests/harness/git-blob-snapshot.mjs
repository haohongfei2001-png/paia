import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';

// One immutable Git snapshot, preserving binary contents and optional missing
// files. Protocol errors are never treated as an absent historical blob.
export function parseGitBlobBatch(bytes,references){
 const result=new Map();let offset=0;
 for(const reference of references){
  const end=bytes.indexOf(10,offset);assert.ok(end>=offset,'complete Git batch header');
  const header=bytes.subarray(offset,end).toString('utf8');offset=end+1;
  if(header===reference+' missing'){result.set(reference,null);continue;}
  const match=/^[0-9a-f]{40,64} blob ([0-9]+)$/.exec(header);assert.ok(match,'Git snapshot contains only complete blobs');
  const size=Number(match[1]);assert.ok(Number.isSafeInteger(size)&&size>=0&&offset+size<bytes.length,'complete Git blob bytes');
  assert.equal(bytes[offset+size],10,'Git blob terminator');
  result.set(reference,bytes.subarray(offset,offset+size));offset+=size+1;
 }
 assert.equal(offset,bytes.length,'no extra Git batch output');return result;
}
export function readGitBlobSnapshot(gitRoot,head,paths){
 assert.match(head,/^[0-9a-f]{40,64}$/,'fixed immutable Git commit');
 const names=[...new Set(paths)],references=names.map(path=>{assert.ok(!/[\r\n\0]/.test(path),'one Git path per batch request');return head+':'+path;});
 const bytes=execFileSync('git',['cat-file','--batch'],{cwd:gitRoot,input:references.join('\n')+'\n',maxBuffer:64*1024*1024,stdio:['pipe','pipe','pipe']});
 const snapshot=parseGitBlobBatch(bytes,references);return new Map(names.map((path,index)=>[path,snapshot.get(references[index])]));
}

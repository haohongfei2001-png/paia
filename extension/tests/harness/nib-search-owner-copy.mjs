import assert from 'node:assert/strict';
import {cp,mkdtemp,readFile,writeFile,rm,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join,relative,sep} from 'node:path';
const excluded=new Set(['.git','node_modules','work','tests','outputs']);
const sha=value=>createHash('sha256').update(value).digest('hex');
const bridge=`\n// Disposable metadata-only diagnostic; no RPC or mutable owner is exposed.
import {readPromptReuseRefusalEvidence as nibReadRefusals} from '../core/prompt-reuse-service.js';
globalThis.__nibSearchReadRefusals=nibReadRefusals;
`;
async function files(root,prefix=''){
 const result=[];for(const entry of await readdir(join(root,prefix),{withFileTypes:true})){
  if(excluded.has(entry.name))continue;const path=join(prefix,entry.name);
  if(entry.isDirectory())result.push(...await files(root,path));else{assert.ok(entry.isFile());result.push(path);}
 }return result.sort();
}
// Same static-ESM private-copy approach as uir03-worker-copy.mjs. MV3 forbids
// dynamic import in the worker; original source/release and manifest stay exact.
export async function createNIBSearchOwnerCopy(extensionPath){
 const temporary=await mkdtemp(join(tmpdir(),'paia-nib-search-owner-')),path=join(temporary,'extension');
 try{
  const paths=await files(extensionPath),original=new Map(await Promise.all(paths.map(async p=>[p,await readFile(join(extensionPath,p))])));
  await cp(extensionPath,path,{recursive:true,filter:p=>!relative(extensionPath,p).split(sep).some(part=>excluded.has(part))});
  const worker='background/service-worker.js',instrumented=Buffer.concat([original.get(worker),Buffer.from(bridge)]);await writeFile(join(path,worker),instrumented);
  assert.deepEqual(await files(path),paths);const hashes={};
  for(const p of paths){const base=original.get(p),copy=await readFile(join(path,p));assert.deepEqual(await readFile(join(extensionPath,p)),base);assert.deepEqual(copy,p===worker?instrumented:base);hashes[p]={base:sha(base),copy:sha(copy)};}
  return {path,binding:{fixtureOnly:true,soleRuntimeDifference:worker,originalWorker:sha(original.get(worker)),instrumentedWorker:sha(instrumented),bridge:sha(bridge),files:hashes},close:()=>rm(temporary,{recursive:true,force:true})};
 }catch(error){await rm(temporary,{recursive:true,force:true});throw error;}
}

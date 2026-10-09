// Node-only evidence collector. All expected bytes are read independently of
// the receipt and the copied extension, both before and after native execution.
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {join,posix} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {RETENTION_SPECS,retentionNativeFixture} from './retention-native-fixture.mjs';
export const GENERATED_PATHS=Object.freeze(['background/service-worker.js','background/bns-native-storage-fixture.mjs','background/bns-native-immutable-objects.mjs','background/bns-retention-assert.mjs','background/bns-retention-retention.mjs','background/bns-retention-owner.mjs'].sort());
export const proofRoots=Object.freeze(['tests/native-sync/human-retention-native.test.mjs','tests/native-sync/storage-worker-fixture.mjs','tests/native-sync/immutable-objects.mjs','tests/native-sync/retention-assert.mjs','scripts/build_current_release.py']);
export const originalPaths=Object.freeze(Object.values(RETENTION_SPECS).map(s=>'tests/'+s.file));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export const hashFiles=async(base,paths)=>Object.fromEntries(await Promise.all(paths.map(async path=>[path,hash(await readFile(join(base,path)))])));
export function relativeImports(text){
 const result=[];
 for(const re of [/(?:^|;)\s*(?:import\s*(?:[^;]*?\bfrom\s*)?|export\s+[^;]*?\bfrom\s*)(['"])(\.[^'"]+)\1/gm,/\bimport\s*\(\s*(['"])(\.[^'"]+)\1\s*\)/g])for(const match of text.matchAll(re))result.push(match[2]);
 return [...new Set(result)];
}
const resolvePath=(path,dependency)=>{const result=posix.normalize(posix.join(posix.dirname(path),dependency));assert.ok(!result.startsWith('../')&&!posix.isAbsolute(result));return result;};
export async function collectInventories(base){
 const runtime=new Set(),proof=new Set(['manifest.json','package.json','background/service-worker.js',...originalPaths]);
 const runtimeQueue=['core/library-documents-store.js','core/browser-native-sync/core.js','core/browser-native-sync/human-library-journal.js','core/browser-native-sync/human-library-plan.js'];
 for(const path of originalPaths){const text=await readFile(join(base,path),'utf8');for(const dependency of relativeImports(text)){const next=resolvePath(path,dependency);if(next.startsWith('core/'))runtimeQueue.push(next);}}
 // The copied storage worker imports production owners from its installed
 // background location, not from its repository test-source directory.
 const worker='tests/native-sync/storage-worker-fixture.mjs';
 for(const dependency of relativeImports(await readFile(join(base,worker),'utf8'))){const next=resolvePath('background/bns-native-storage-fixture.mjs',dependency);if(next.startsWith('core/'))runtimeQueue.push(next);}
 for(const dependency of relativeImports(await readFile(join(base,'background/service-worker.js'),'utf8'))){const next=resolvePath('background/service-worker.js',dependency);if(next.startsWith('core/')||next.startsWith('background/'))runtimeQueue.push(next);}
 while(runtimeQueue.length){const path=runtimeQueue.pop();if(runtime.has(path))continue;runtime.add(path);for(const dependency of relativeImports(await readFile(join(base,path),'utf8'))){const next=resolvePath(path,dependency);if(/\.m?js$/.test(next))runtimeQueue.push(next);}}
 const queue=[...proofRoots];
 while(queue.length){const path=queue.pop();if(proof.has(path))continue;proof.add(path);const text=await readFile(join(base,path),'utf8');
  if(path.endsWith('.py')){for(const match of text.matchAll(/^(?:from\s+(\w+)\s+import|import\s+(\w+))/gm)){const next='scripts/'+(match[1]||match[2])+'.py';try{if((await stat(join(base,next))).isFile())queue.push(next);}catch{}}}
  else for(const dependency of relativeImports(text)){const next=path===worker?(dependency==='./bns-native-immutable-objects.mjs'?'tests/native-sync/immutable-objects.mjs':resolvePath('background/bns-native-storage-fixture.mjs',dependency)):resolvePath(path,dependency);if(next.startsWith('tests/')&&/\.m?js$/.test(next))queue.push(next);}
 }
 return {runtimePaths:[...runtime].sort(),proofPaths:[...proof].sort()};
}
export async function generatedBytes(base,runtime=base){
 const values={};let original=await readFile(join(base,'background/service-worker.js'),'utf8');
 if(runtime!==base){
  // The sole current release-worker transformation, independently reconstructed
  // from source rather than trusted because it appeared in a copied artifact.
  const removed="    case 'FILTER_DIAGNOSTICS': return store.filterDiagnostics();\n";
  assert.equal(original.split(removed).length,2);original=original.replace(removed,'');
 }
 assert.equal(await readFile(join(runtime,'background/service-worker.js'),'utf8'),original);
 const anchor="import './bns-native-storage-fixture.mjs';";
 const withStorage=anchor+'\n'+original;assert.equal(withStorage.split(anchor).length,2);
 values['background/service-worker.js']=withStorage.replace(anchor,anchor+"\nimport './bns-retention-retention.mjs';\nimport './bns-retention-owner.mjs';");
 values['background/bns-native-storage-fixture.mjs']=await readFile(join(base,'tests/native-sync/storage-worker-fixture.mjs'));
 values['background/bns-native-immutable-objects.mjs']=await readFile(join(base,'tests/native-sync/immutable-objects.mjs'));
 values['background/bns-retention-assert.mjs']=await readFile(join(base,'tests/native-sync/retention-assert.mjs'));
 for(const [kind,spec]of Object.entries(RETENTION_SPECS))values['background/bns-retention-'+kind+'.mjs']=retentionNativeFixture(await readFile(join(base,'tests',spec.file),'utf8'),kind);
 assert.deepEqual(Object.keys(values).sort(),GENERATED_PATHS);return values;
}
export async function snapshotProof(base,runtime=base,{requireClean=false}={}){
 const inventory=await collectInventories(base),values=await generatedBytes(base,runtime);
 if(requireClean)execFileSync('git',['diff','--quiet','HEAD','--',...inventory.runtimePaths,...inventory.proofPaths],{cwd:base,stdio:'pipe'});
 const head=execFileSync('git',['rev-parse','HEAD'],{cwd:base,encoding:'utf8'}).trim(),tree=execFileSync('git',['rev-parse','HEAD^{tree}'],{cwd:base,encoding:'utf8'}).trim();
 return {head,tree,...inventory,runtimeHashes:await hashFiles(base,inventory.runtimePaths),proofHashes:await hashFiles(base,inventory.proofPaths),fixtureHashes:Object.fromEntries(GENERATED_PATHS.map(path=>[path,hash(values[path])]))};
}

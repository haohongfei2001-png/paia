import assert from 'node:assert/strict';
import {cp,mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join,relative,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

// MV3 forbids import() in ServiceWorkerGlobalScope, including evaluate().
// This disposable copy uses normal static ESM imports and references to the
// original worker instances; selected source/release bytes are never modified.
export const UIR03_WORKER_BRIDGE=`
// Disposable synthetic UIR03 fixture: no new Store or public message handler.
import {prefix as uir03Prefix} from '../core/thought-model.js';
import {invalidateThoughtTopicIndex as uir03Invalidate} from '../core/thought-read-index.js';
import {ImportLedger as UIR03ImportLedger} from '../core/import/ledger.js';
import {ImportCoordinator as UIR03ImportCoordinator} from '../core/import/coordinator.js';
import {getOfficialExportAdapter as uir03Adapter} from '../core/import/registry.js';
globalThis.__uir03Worker={get store(){return store;},get library(){return libraryRunner;},ready,prefix:uir03Prefix,invalidateThoughtTopicIndex:uir03Invalidate,ImportLedger:UIR03ImportLedger,ImportCoordinator:UIR03ImportCoordinator,getOfficialExportAdapter:uir03Adapter};
`;
export async function createUIRWorkerFixture(extensionPath=fileURLToPath(new URL('../..',import.meta.url))){
 const temporary=await mkdtemp(join(tmpdir(),'paia-uir03-worker-')),path=join(temporary,'extension');
 try{
  await cp(extensionPath,path,{recursive:true,dereference:true,filter:value=>!relative(extensionPath,value).split(sep).some(name=>['.git','node_modules','work','outputs'].includes(name))});
  const selected=join(extensionPath,'background','service-worker.js'),target=join(path,'background','service-worker.js'),original=await readFile(selected),bridge=Buffer.from(UIR03_WORKER_BRIDGE);
  await writeFile(target,Buffer.concat([original,bridge]));
  assert.deepEqual(await readFile(selected),original,'selected worker bytes remain unchanged');
  assert.deepEqual(await readFile(target),Buffer.concat([original,bridge]),'disposable worker keeps all production bytes plus only static fixture references');
  assert.deepEqual(await readFile(join(path,'manifest.json')),await readFile(join(extensionPath,'manifest.json')),'fixture does not expand permissions or change worker registration');
  return {path,workerSha256:createHash('sha256').update(original).digest('hex'),bridgeSha256:createHash('sha256').update(bridge).digest('hex'),close:()=>rm(temporary,{recursive:true,force:true})};
 }catch(error){await rm(temporary,{recursive:true,force:true});throw error;}
}

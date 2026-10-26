// Prepared for the explicit combined local milestone. Never builds a release.
// Running this file is a browser execution and is NOT part of Node verification.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,readdir,realpath} from 'node:fs/promises';
import {join,isAbsolute} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {root,instrumentedExtension} from './storage-harness.mjs';
import {prepareSyncLifecycleNative,runSyncLifecycleNative} from './sync-local-lifecycle-native-preparation.mjs';
import {verifyManualPromptConflictPane} from '../harness/manual-prompt-conflict-pane-native.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const proof=['tests/native-sync/sync-local-lifecycle-chrome.test.mjs','tests/native-sync/sync-local-lifecycle-native-preparation.mjs','tests/native-sync/storage-harness.mjs','tests/native-sync/storage-worker-fixture.mjs','tests/native-sync/immutable-objects.mjs','tests/harness/manual-prompt-conflict-pane-native.mjs','tests/harness/settings-consumer-presentation.mjs','tests/harness/ans07-seed-evidence.mjs','tests/harness/checkpoint-publication-http.mjs','tests/harness/fake-chatgpt.mjs','manifest.json','package.json'];
async function snapshot(){
 const paths=[...proof];async function walk(path){for(const row of await readdir(join(root,path),{withFileTypes:true})){const next=path+'/'+row.name;if(row.isDirectory())await walk(next);else paths.push(next);}}
 for(const path of ['core','background','ui'])await walk(path);
 const hashes={};for(const path of paths.sort()){const body=await readFile(join(root,path));assert.deepEqual(body,execFileSync('git',['show','HEAD:extension/'+path],{cwd:root}),'tracked source '+path);hashes[path]=hash(body);}
 return {head:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),tree:execFileSync('git',['rev-parse','HEAD^{tree}'],{cwd:root,encoding:'utf8'}).trim(),hashes};
}
let sourceCases;
for(const variant of ['source','release'])test('actual Settings and worker local Sync plus bounded Prompt pane '+variant,{timeout:300000},async()=>{
 // Require the intended existing release before even launching Source, avoiding
 // an accidental Source run followed by a missing-release/build fallback.
 assert.ok(process.env.PAIA_NATIVE_RELEASE_PATH&&isAbsolute(process.env.PAIA_NATIVE_RELEASE_PATH),'absolute PAIA_NATIVE_RELEASE_PATH is required; no automatic build');
 const release=await realpath(process.env.PAIA_NATIVE_RELEASE_PATH);assert.notEqual(release,await realpath(root),'release must be a distinct existing artifact');
 const before=await snapshot(),receipt={schema:1,variant,...before,releasePath:release,status:'IN_PROGRESS',claim:'SYNTHETIC_LOCAL_SYNC_PARTIAL_PLUS_BOUNDED_PROMPT_DOM_ONLY'};let extension,h;
 try{
  const runtime=variant==='source'?root:release;receipt.runtimeHashes={};
  for(const path of Object.keys(before.hashes).filter(p=>/^(core|background|ui)\//.test(p))){
   if(variant==='release'&&['ui/structure-diagnostics.js','ui/fingerprint-display.js','ui/source-time-display.js'].includes(path)){await assert.rejects(readFile(join(runtime,path)),{code:'ENOENT'});receipt.runtimeHashes[path]='OMITTED_BY_ORIGINAL_RELEASE_PACKAGER';continue;}
   const actual=await readFile(join(runtime,path)),original=await readFile(join(root,path));
   if(variant==='release'&&path==='background/service-worker.js'){
    const omission="    case 'FILTER_DIAGNOSTICS': return store.filterDiagnostics();\n";assert.equal(original.toString().split(omission).length,2);assert.equal(actual.toString(),original.toString().replace(omission,''));
   }else assert.deepEqual(actual,original,'actual loaded runtime '+path);
   receipt.runtimeHashes[path]=hash(actual);
  }
  const {FakeChatGPT}=await import('../harness/fake-chatgpt.mjs');let remote=[];receipt.sync={devices:[],wholeArchiveComplete:false};receipt.preparations=[];
  for(const device of ['A','B','C']){
   extension=await instrumentedExtension(runtime);receipt.preparations.push(await prepareSyncLifecycleNative(extension,{device,remote}));
   h=await FakeChatGPT.start({extensionPath:extension.path,headless:true,launchThroughPort:true});receipt.browserVersion=h.context.browser().version();
   const result=await runSyncLifecycleNative(h,{device});remote=result.remote;delete result.remote;receipt.sync.devices.push(result);
   if(device!=='C'){await h.close();h=null;await extension.cleanup();extension=null;}
  }
  // This owner is already integrated on the parent line. It uses the same
  // isolated Archive page and adds no browser, dataset, provider or credential.
  await h.archive.evaluate(()=>document.getElementById('settings-sync-dialog')?.close());receipt.prompt=await verifyManualPromptConflictPane(h.archive);
  assert.equal(receipt.sync.wholeArchiveComplete,false);assert.equal(receipt.prompt.fullVisualQualification,false);
  assert.equal(h.externalRequests,0);assert.equal(h.extensionNetworkRequests,0);assert.deepEqual(h.errors,[]);
  receipt.isolation={externalRequests:0,extensionNetworkRequests:0,errors:[],networkHarness:'original fake-chatgpt routes plus original storage fixture fetch blockers'};
  assert.deepEqual(await snapshot(),before);const cases={sync:receipt.sync,prompt:receipt.prompt};if(variant==='source')sourceCases=cases;else assert.deepEqual(cases,sourceCases);receipt.status='PASS';
 }catch(error){receipt.status='FAIL';receipt.failure={name:error.name,message:error.message,stack:error.stack};throw error;}
 finally{const out=join(root,'work/qa-sync-local-lifecycle');await mkdir(out,{recursive:true});await writeFile(join(out,variant+'.json'),JSON.stringify(receipt,null,2)+'\n');await h?.close();await extension?.cleanup();}
});

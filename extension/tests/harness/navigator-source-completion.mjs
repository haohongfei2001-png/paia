import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {cp,mkdtemp,readFile,readdir,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,relative,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {FakeChatGPT,eventually} from './fake-chatgpt.mjs';

const sourceRoot=fileURLToPath(new URL('../../',import.meta.url));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const excluded=new Set(['node_modules','work','tests','.git']);
const listener='chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {';

// Private fixture observation only. The original handle Promise, response,
// publisher, authorization and maintenance implementations remain unchanged.
const completionInjection=`const navigatorCompletionPending=new Set();
const navigatorCompletion={accepted:0,completed:0,failedCaptures:0,failedDiagnostics:0,unexpectedSourceRefusals:0,expectedSourceRefusals:0,observerFailed:false,phase:'idle',error:null,events:[],maintenanceCompleted:false};
const navigatorCompletionInstance=crypto.randomUUID();
const navigatorOriginalHandle=handle;
const navigatorCompletionCode=error=>/^[A-Z][A-Z0-9_]{0,79}$/.test(error?.code||'')?error.code:'SOURCE_REQUEST_FAILED';
handle=function(request,sender){
 const promise=navigatorOriginalHandle(request,sender);
 if(['CAPTURE','ENRICH_SOURCE_METADATA','OBSERVE_SOURCE_STRUCTURE','DIAGNOSTIC'].includes(request?.type)){
  const type=request.type;navigatorCompletion.accepted++;navigatorCompletionPending.add(promise);
  const done=(ok,error)=>{
   navigatorCompletionPending.delete(promise);navigatorCompletion.completed++;
   const code=ok?null:navigatorCompletionCode(error);
   if(!ok&&type==='CAPTURE')navigatorCompletion.failedCaptures++;
   if(!ok&&type==='DIAGNOSTIC')navigatorCompletion.failedDiagnostics++;
   if(!ok&&['ENRICH_SOURCE_METADATA','OBSERVE_SOURCE_STRUCTURE'].includes(type)){
    if(['STALE_CAPTURE','CONTEXT_INVALIDATED'].includes(code))navigatorCompletion.expectedSourceRefusals++;
    else navigatorCompletion.unexpectedSourceRefusals++;
   }
   if(navigatorCompletion.events.length===32)navigatorCompletion.events.shift();
   navigatorCompletion.events.push({type,ok,...(code?{code}:{})});
  };
  void promise.then(()=>done(true),error=>done(false,error)).catch(()=>{navigatorCompletion.observerFailed=true;});
 }
 return promise;
};
globalThis.__navigatorSourceCompletion={
 read:()=>({...navigatorCompletion,instance:navigatorCompletionInstance,pending:navigatorCompletionPending.size,events:navigatorCompletion.events.map(event=>({...event})),owners:[safety,libraryRunner,runner].map(owner=>({running:owner.running!==null,requested:owner.requested===true,failed:owner.failed===true}))}),
 begin:()=>{
  if(navigatorCompletion.phase!=='idle')throw new Error('COMPLETION_ALREADY_STARTED');
  navigatorCompletion.phase='waiting';
  void(async()=>{
   const owners=[safety,libraryRunner,runner];let kicked=false;
   for(;;){
    const accepted=navigatorCompletion.accepted;
    await Promise.allSettled([...navigatorCompletionPending]);
    // One original wake only; never continually re-request maintenance or retry a failed owner.
    if(!kicked){kicked=true;await Promise.all(owners.map(owner=>owner.wake()));}
    // wake().finally can start a follow-up after its old Promise resolves.
    for(;;){const running=owners.map(owner=>owner.running).filter(Boolean);if(!running.length)break;await Promise.all(running);}
    await store.run(()=>Promise.resolve());
    if(owners.some(owner=>owner.failed))throw new Error('ORIGINAL_MAINTENANCE_FAILED');
    if(navigatorCompletion.observerFailed)throw new Error('COMPLETION_OBSERVER_FAILED');
    if(navigatorCompletion.failedCaptures)throw new Error('ORIGINAL_CAPTURE_FAILED');
    if(navigatorCompletion.failedDiagnostics)throw new Error('ORIGINAL_DIAGNOSTIC_FAILED');
    if(navigatorCompletion.unexpectedSourceRefusals)throw new Error('ORIGINAL_SOURCE_REQUEST_FAILED');
    if(owners.every(owner=>owner.running===null)&&!navigatorCompletionPending.size&&navigatorCompletion.accepted===accepted)break;
   }
   navigatorCompletion.maintenanceCompleted=true;navigatorCompletion.phase='complete';
  })().catch(error=>{const code=error?.code||error?.message||'';navigatorCompletion.error=/^[A-Z][A-Z0-9_]{0,79}$/.test(code)?code:'COMPLETION_FAILED';navigatorCompletion.phase='failed';});
 }
};
`;

async function copiedFiles(root,prefix=''){
 const result=[];
 for(const entry of await readdir(join(root,prefix),{withFileTypes:true})){
  if(excluded.has(entry.name))continue;
  const path=join(prefix,entry.name);
  if(entry.isDirectory())result.push(...await copiedFiles(root,path));
  else {assert.equal(entry.isFile(),true,'private mirror admits only regular files: '+path);result.push(path);}
 }
 return result.sort();
}

// Accepts the original source or an already-built standard release. It does not
// build, inject a provider, introduce an RPC, or change the original test budget.
export async function startNavigatorSourceFixture({extensionPath=sourceRoot}={}){
 const gitRoot=execFileSync('git',['rev-parse','--show-toplevel'],{cwd:sourceRoot,encoding:'utf8'}).trim();
 const head=execFileSync('git',['rev-parse','HEAD'],{cwd:gitRoot,encoding:'utf8'}).trim();
 const tree=execFileSync('git',['rev-parse','HEAD^{tree}'],{cwd:gitRoot,encoding:'utf8'}).trim();
 const paths=await copiedFiles(extensionPath),base=new Map();
 for(const path of paths)base.set(path,await readFile(join(extensionPath,path)));
 const runtimePaths=execFileSync('git',['ls-files','-z','extension/core','extension/background','extension/content','extension/ui','extension/adapter','extension/icons','extension/manifest.json'],{cwd:gitRoot,encoding:'utf8'}).split('\0').filter(Boolean);
 const sourceRuntime={},release=resolve(extensionPath)!==resolve(sourceRoot),publicOmissions=new Set(['ui/structure-diagnostics.js','ui/fingerprint-display.js','ui/source-time-display.js','icons/brand-icons-provenance.json']);
 for(const gitPath of runtimePaths){
  const path=gitPath.slice('extension/'.length),source=await readFile(join(sourceRoot,path)),git=execFileSync('git',['show',head+':'+gitPath],{cwd:gitRoot});
  sourceRuntime[path]={bytes:source.length,actual:sha(source),git:sha(git)};
  if(release&&publicOmissions.has(path)){assert.equal(base.has(path),false,'standard release diagnostic omission: '+path);continue;}
  let expected=source;
  if(release&&path==='background/service-worker.js'){
   const diagnostic="    case 'FILTER_DIAGNOSTICS': return store.filterDiagnostics();\n";
   assert.equal(source.toString().split(diagnostic).length,2,'original standard worker transformation');
   expected=Buffer.from(source.toString().replace(diagnostic,''));
  }
  assert.deepEqual(base.get(path),expected,'original source/standard-release runtime: '+path);
 }
 const original=base.get('background/service-worker.js').toString();
 assert.equal(original.split(listener).length,2,'exact original worker listener injection point');
 const actual=original.replace(listener,completionInjection+listener);
 execFileSync(process.execPath,['--input-type=module','--check'],{input:actual,encoding:'utf8'});
 const mirror=await mkdtemp(join(tmpdir(),'paia-navigator-source-completion-'));
 let harness;
 try{
  await cp(extensionPath,mirror,{recursive:true,filter:path=>!relative(extensionPath,path).split('/').some(part=>excluded.has(part))});
  await writeFile(join(mirror,'background/service-worker.js'),actual);
  assert.deepEqual(await copiedFiles(mirror),paths,'private mirror exact file set');
  const files={};
  for(const path of paths){
   const bytes=base.get(path),current=await readFile(join(extensionPath,path)),copied=await readFile(join(mirror,path));
   assert.deepEqual(current,bytes,'base did not change while copying: '+path);
   assert.deepEqual(copied,path==='background/service-worker.js'?Buffer.from(actual):bytes,'sole worker difference: '+path);
   const gitPath=relative(gitRoot,join(sourceRoot,path));
   let gitBytes=null;
   try{gitBytes=execFileSync('git',['show',head+':'+gitPath],{cwd:gitRoot,stdio:['ignore','pipe','ignore']});}catch{}
   files[path]={bytes:bytes.length,base:sha(bytes),mirror:sha(copied),sourceGit:gitBytes?sha(gitBytes):null};
  }
  const binding={head,tree,extensionPath,mirror,sourceRuntime,files,originalWorker:sha(Buffer.from(original)),instrumentedWorker:sha(Buffer.from(actual)),completionInjection:sha(Buffer.from(completionInjection)),helper:sha(await readFile(fileURLToPath(import.meta.url))),soleRuntimeDifference:'background/service-worker.js',providerInjection:null,fixtureOnly:true,productionInstrumentation:false};
  harness=await FakeChatGPT.start({extensionPath:mirror,onboarding:true,launchThroughPort:true,headless:true});
  const worker=harness.context.serviceWorkers().find(worker=>worker.url()===`chrome-extension://${harness.extensionId}/background/service-worker.js`);
  assert.ok(worker,'exact original private-mirror worker is present');
  const initial=await worker.evaluate(()=>globalThis.__navigatorSourceCompletion.read());
  const fixture={harness,binding,worker,instance:initial.instance,close:async()=>{try{await harness.close();}finally{await rm(mirror,{recursive:true,force:true});}}};
  return fixture;
 }catch(error){if(harness)try{await harness.close();}catch{}try{await rm(mirror,{recursive:true,force:true});}catch{}throw error;}
}

// Caller closes both completed synthetic hosts only after its unchanged NAV and
// selected Reader assertions. No public FILTER_STATUS poll is a drain barrier.
export async function awaitNavigatorSourceCompletion(fixture){
 const {worker,instance}=fixture;
 assert.equal((await worker.evaluate(()=>globalThis.__navigatorSourceCompletion.read())).instance,instance,'same original worker instance');
 await worker.evaluate(()=>globalThis.__navigatorSourceCompletion.begin());
 await eventually(async()=>['complete','failed'].includes((await worker.evaluate(()=>globalThis.__navigatorSourceCompletion.read())).phase),'original Source requests, diagnostics and maintenance complete',14000);
 const ticket=await worker.evaluate(()=>globalThis.__navigatorSourceCompletion.read());
 assert.equal(ticket.instance,instance,'completion cannot silently migrate to a restarted worker');
 assert.equal(ticket.phase,'complete',JSON.stringify(ticket));
 assert.ok(ticket.accepted>0,'actual original Source requests were observed');
 assert.equal(ticket.accepted,ticket.completed);
 assert.equal(ticket.pending,0);assert.equal(ticket.failedCaptures,0);assert.equal(ticket.failedDiagnostics,0);assert.equal(ticket.unexpectedSourceRefusals,0);assert.equal(ticket.observerFailed,false);assert.equal(ticket.maintenanceCompleted,true);
 assert.ok(ticket.owners.every(owner=>!owner.running&&!owner.failed));
 return ticket;
}

import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,cp,readFile,writeFile,mkdir} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash} from 'node:crypto';
const run=promisify(execFile),extension=fileURLToPath(new URL('..',import.meta.url));
const root=await mkdtemp('/tmp/paia-native-bootstrap-controls-');
await cp(extension,join(root,'extension'),{recursive:true});
const graph=join(root,'extension'),source=await readFile(join(graph,'background/service-worker.js'),'utf8');
// Read-only finite observer: booleans only, no owner/action/token/SDK references.
const observer=`\nimport {isProductionApplicationEditorGuard} from './application-editor-guard.js';
import {isProductionApplicationWorkerCoordination} from './application-worker-coordination.js';
import {isProductionApplicationLocalToolsCoordination} from './application-local-tools-coordination.js';
import {isProductionApplicationTransportCoordination} from './application-transport-coordination.js';
import {isProductionApplicationStartupEvents} from './application-startup-events.js';
globalThis.__nativeOriginObservation=ready.then(()=>({supported:nativeHostQualified,editor:nativeHostQualified&&isProductionApplicationEditorGuard(applicationEditors),sources:nativeHostQualified&&isProductionApplicationWorkerCoordination(applicationWorkerCoordination,store),tools:nativeHostQualified&&isProductionApplicationLocalToolsCoordination(applicationLocalToolsCoordination,store),transport:nativeHostQualified&&isProductionApplicationTransportCoordination(applicationTransportCoordination,store),startup:nativeHostQualified&&isProductionApplicationStartupEvents(startupEvents),selectionEnabled:applicationSelection.enabled}));\n`;
await writeFile(join(graph,'background/service-worker.js'),source+observer);
const sha=s=>createHash('sha256').update(s).digest('hex');
await writeFile(join(root,'SEAMS.json'),JSON.stringify({source:sha(source),fixture:sha(source+observer),observer:sha(observer),scope:'readonly booleans only; no config/gate change'},null,2));
console.log('PRESERVED_GRAPH',root);
async function scenario(name,body){const path=join(root,name+'.mjs');await writeFile(path,`import assert from 'node:assert/strict';\nimport {installInitialHost} from './extension/tests/harness/native-host-bootstrap-fixture.mjs';\n${body}\n`);try{const result=await run(process.execPath,[path],{timeout:30000,maxBuffer:1024*1024});await writeFile(join(root,name+'.log'),result.stdout+result.stderr);return result.stdout;}catch(e){await writeFile(join(root,name+'.log'),String(e.stdout??'')+String(e.stderr??'')+'\n'+String(e));throw e;}}
const leaf='./extension/background/native-host-bootstrap.js';
test('capture is first dependency and later dependency mutation cannot recapture',async()=>{
 assert.equal(source.split('\n')[0],"import {originalBootstrapHostSupported,readOriginalBootstrapHost} from './native-host-bootstrap.js';");
 const captureSource=await readFile(join(graph,'background/native-host-bootstrap.js'),'utf8');assert.doesNotMatch(captureSource,/^import\s/m);
 await writeFile(join(root,'mutate-after-capture.mjs'),`globalThis.chrome.runtime.getContexts=new Proxy(function(){},{apply(){globalThis.__traps++;throw new Error('replacement invoked');}});`);
 await writeFile(join(root,'ordered-entry.mjs'),`import './extension/background/native-host-bootstrap.js';\nimport './mutate-after-capture.mjs';\nexport {readOriginalBootstrapHost} from './extension/background/native-host-bootstrap.js';\n`);
 await scenario('ordering',`installInitialHost();globalThis.__traps=0;const entry=await import('./ordered-entry.mjs');assert.throws(()=>entry.readOriginalBootstrapHost(),{code:'GENERATION_NATIVE_HOST_REQUIRED'});assert.equal(globalThis.__traps,0);console.log('ordering PASS');`);
});
for(const edge of ['root','runtime','local','tabs','method'])test('replacement '+edge+' rejects without replacement Proxy/getter execution',async()=>{
 await scenario('drift-'+edge,`const {api}=installInitialHost();const leaf=await import('${leaf}');assert.equal(leaf.readOriginalBootstrapHost(),api);let traps=0;const proxy=new Proxy(function(){},{get(){traps++;throw new Error('trap');},getPrototypeOf(){traps++;throw new Error('trap');},getOwnPropertyDescriptor(){traps++;throw new Error('trap');},apply(){traps++;throw new Error('trap');}});let restore;const edge=${JSON.stringify(edge)};if(edge==='root'){restore=()=>globalThis.chrome=api;globalThis.chrome=proxy;}else if(edge==='runtime'){const old=api.runtime;restore=()=>api.runtime=old;api.runtime=proxy;}else if(edge==='local'){const old=api.storage.local;restore=()=>api.storage.local=old;api.storage.local=proxy;}else if(edge==='tabs'){const old=api.tabs;restore=()=>api.tabs=old;api.tabs=proxy;}else{const old=Object.getOwnPropertyDescriptor(api.runtime,'getContexts');restore=()=>Object.defineProperty(api.runtime,'getContexts',old);Object.defineProperty(api.runtime,'getContexts',{configurable:true,get(){traps++;return proxy;}});}assert.throws(()=>leaf.readOriginalBootstrapHost(),{code:'GENERATION_NATIVE_HOST_REQUIRED'});assert.equal(traps,0);restore();assert.throws(()=>leaf.readOriginalBootstrapHost(),{code:'GENERATION_NATIVE_HOST_REQUIRED'});assert.equal(traps,0);console.log('replacement PASS');`);
});
test('exact captured host cannot upgrade injected editor; genuine derivative relays and rejects copies',async()=>{
 await scenario('origins',`const {api,counters}=installInitialHost();const leaf=await import('${leaf}');assert.equal(leaf.originalBootstrapHostSupported(),true);const editors=await import('./extension/background/application-editor-guard.js'),events=await import('./extension/background/application-startup-events.js');const native=editors.createProductionApplicationEditorGuard(),injected=editors.createInjectedApplicationEditorGuardForTest(api),ordinary=editors.createOrdinaryApplicationEditorGuard(api);assert.equal(editors.isProductionApplicationEditorGuard(native),true);assert.equal(editors.isProductionApplicationEditorGuard(injected),false);assert.equal(editors.isProductionApplicationEditorGuard(ordinary),false);assert.throws(()=>editors.createProductionApplicationEditorGuard(api));const original=events.createProductionApplicationStartupEvents();assert.equal(events.isProductionApplicationStartupEvents(original),true);assert.equal(events.isProductionApplicationStartupEvents({...original}),false);let traps=0;assert.equal(events.isProductionApplicationStartupEvents(new Proxy(original,{get(){traps++;throw Error('trap');}})),false);assert.equal(traps,0);assert.equal(events.isProductionApplicationStartupEvents(events.createInjectedApplicationStartupEventsForTest(api)),false);let calls=0;const on=()=>calls++;original.tabs.onRemoved.addListener(on);api.tabs.onRemoved.emit(1);assert.equal(calls,1);original.tabs.onRemoved.removeListener(on);api.tabs.onRemoved.emit(2);assert.equal(calls,1);assert.equal(counters.script,0);assert.equal(counters.selectedSet,0);console.log('origin and relay PASS');`);
});
test('real supported worker adopts original production origins while null configs stay closed',async()=>{
 await scenario('worker-supported',`const {counters}=installInitialHost();await import('./extension/background/service-worker.js');const facts=await globalThis.__nativeOriginObservation;assert.deepEqual(facts,{supported:true,editor:true,sources:true,tools:true,transport:true,startup:true,selectionEnabled:false});assert.equal(counters.script,0);assert.equal(counters.selectedSet,0);console.log(JSON.stringify({facts,counters}));`);
});
test('unsupported initial accessor is not probed by capture; ordinary worker remains unqualified',async()=>{
 await scenario('worker-ordinary',`const {counters}=installInitialHost({unsupported:true});const leaf=await import('${leaf}');assert.equal(leaf.originalBootstrapHostSupported(),false);assert.equal(counters.getter,0);assert.throws(()=>leaf.readOriginalBootstrapHost(),{code:'GENERATION_NATIVE_HOST_REQUIRED'});await import('./extension/background/service-worker.js');const facts=await globalThis.__nativeOriginObservation;assert.deepEqual(facts,{supported:false,editor:false,sources:false,tools:false,transport:false,startup:false,selectionEnabled:false});assert.equal(counters.script,0);assert.equal(counters.selectedSet,0);console.log(JSON.stringify({facts,counters}));`);
});

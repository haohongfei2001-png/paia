import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {join} from 'node:path';
import {Script} from 'node:vm';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {toolbarRegistrationFixture} from './harness/toolbar-registration.mjs';
import {createUIRWorkerFixture,UIR03_WORKER_BRIDGE} from './harness/uir03-worker-copy.mjs';
import {installLibraryFixtureObservation} from './harness/uir03-worker-fixture.mjs';

test('UIR03 disposable worker preserves source/manifest bytes and uses only static original references',async()=>{
 const fixture=await createUIRWorkerFixture(),source=await readFile(new URL('../background/service-worker.js',import.meta.url));
 try{
  assert.deepEqual(await readFile(join(fixture.path,'background','service-worker.js')),Buffer.concat([source,Buffer.from(UIR03_WORKER_BRIDGE)]));
  assert.deepEqual(await readFile(join(fixture.path,'manifest.json')),await readFile(new URL('../manifest.json',import.meta.url)));
  assert.doesNotMatch(UIR03_WORKER_BRIDGE,/import\s*\(|new\s+\w+\s*\(|addListener|sendMessage/);
  assert.equal((UIR03_WORKER_BRIDGE.match(/^import /gm)||[]).length,5);assert.match(fixture.workerSha256,/^[a-f0-9]{64}$/);assert.match(fixture.bridgeSha256,/^[a-f0-9]{64}$/);
 }finally{await fixture.close();}
 await assert.rejects(access(fixture.path),{code:'ENOENT'});
});

test('actual statically instrumented worker shares its real Store and runs observation with dynamic import forbidden',async()=>{
 const saved={chrome:globalThis.chrome,indexedDB:globalThis.indexedDB,IDBKeyRange:globalThis.IDBKeyRange,fetch:globalThis.fetch},fixture=await createUIRWorkerFixture();
 globalThis.indexedDB=new IDBFactory();globalThis.IDBKeyRange=IDBKeyRange;
 const id='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',origin=`chrome-extension://${id}/`,sender={id,url:origin+'ui/archive.html'},values={},session={};let listener,network=0,imports=0;
 const storage=data=>({setAccessLevel:async()=>{},get:async keys=>keys===null?structuredClone(data):Object.fromEntries((Array.isArray(keys)?keys:[keys]).filter(key=>key in data).map(key=>[key,structuredClone(data[key])])),set:async rows=>Object.assign(data,structuredClone(rows)),remove:async keys=>{for(const key of Array.isArray(keys)?keys:[keys])delete data[key];},getBytesInUse:async()=>0});
 globalThis.chrome={runtime:{id,getManifest:()=>({version:'0.52.0'}),getURL:path=>origin+path,sendMessage:async()=>{},onMessage:{addListener:fn=>listener=fn}},storage:{local:storage(values),session:storage(session)}};toolbarRegistrationFixture(chrome);
 globalThis.fetch=async()=>{network++;throw Error('Unexpected network');};
 try{
  await import(pathToFileURL(join(fixture.path,'background','service-worker.js')).href);
  const bridge=globalThis.__uir03Worker;assert.ok(bridge);await bridge.ready;assert.equal(bridge.library.store,bridge.store);
  for(const name of ['prefix','invalidateThoughtTopicIndex','ImportLedger','ImportCoordinator','getOfficialExportAdapter'])assert.equal(typeof bridge[name],'function',name);
  // Execute the exact browser-injected function under a resolver that rejects
  // every dynamic import, matching the native failure rather than mocking it away.
  const observe=new Script('('+installLibraryFixtureObservation.toString()+')',{importModuleDynamically:()=>{imports++;throw TypeError('import() is disallowed on ServiceWorkerGlobalScope');}}).runInThisContext();observe();
  const rpc=async(type,fields={})=>{const response=await new Promise(resolve=>listener({type,...fields},sender,resolve));assert.equal(response.ok,true,JSON.stringify(response));return response.data;};
  await rpc('CONSENT',{accepted:true});
  const topic=await rpc('CREATE_LIBRARY_TOPIC',{topic:{name:'SYNTHETIC static owner',operationId:crypto.randomUUID()}}),entry=await rpc('CONTINUE_THINKING',{thought:{topicId:topic.id,body:'SYNTHETIC original worker body',operationId:crypto.randomUUID()}});
  await rpc('GET_STATUS');while(bridge.library.running)await bridge.library.running;
  const diagnostic=await globalThis.__uir03Library.read();assert.equal(diagnostic.observed,true);assert.equal(diagnostic.failed,false);assert.equal(diagnostic.index.rebuild.complete,true);assert.equal(diagnostic.index.searchPending,0);assert.equal((await bridge.store.entry(entry.id)).body,'SYNTHETIC original worker body');assert.equal(imports,0);assert.equal(network,0);
  const message=await new Promise(resolve=>listener({type:'CAPTURE'},sender,resolve));assert.equal(message.ok,false,'test bridge never expands production UI capture admission');
 }finally{
  globalThis.__uir03Library?.restore();const bridge=globalThis.__uir03Worker;while(bridge?.library?.running)await bridge.library.running;await bridge?.store?.repository.close();delete globalThis.__uir03Library;delete globalThis.__uir03Worker;Object.assign(globalThis,saved);await fixture.close();
 }
});

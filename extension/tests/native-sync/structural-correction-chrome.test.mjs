import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,cp} from 'node:fs/promises';
import {join,isAbsolute} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {instrumentedExtension,root,startNative} from './storage-harness.mjs';
const runtime=['core/ai-usage/context-correction.js','core/ai-usage/local-maintenance-session.js','core/ai-usage/maintenance-payload.js','core/ai-usage/maintenance-qualification.js','core/idb-repository.js'];
const hash=v=>createHash('sha256').update(v).digest('hex');
const replace=(text,before,after)=>{assert.equal(text.split(before).length,2,before);return text.replace(before,after);};
let sourceVector;
for(const variant of ['source','release'])test('structural Context correction original native owners '+variant,{timeout:120000},async()=>{
 const output=join(root,'work/structural-context-correction-native');await mkdir(output,{recursive:true});let extension,browser;
 const receipt={variant,result:'IN_PROGRESS',head:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),selection:'original Section-lineage and Topic-name-lineage Context correction cases only',fullOwningFile:false};
 try{
  const directory=variant==='source'?root:process.env.PAIA_NATIVE_RELEASE_PATH;assert.ok(directory&&isAbsolute(directory),'explicit frozen release required');extension=await instrumentedExtension(directory);
  const tests=join(extension.path,'tests');await mkdir(join(tests,'harness'),{recursive:true});
  await cp(join(root,'tests/native-sync/structural-correction-bridge.mjs'),join(tests,'native-bridge.mjs'));
  for(const file of ['topic-02.mjs','topic-03.mjs'])await cp(join(root,'tests/harness',file),join(tests,'harness',file));
  let helper=await readFile(join(root,'tests/harness/thought-m1.mjs'),'utf8');receipt.helperSha256=hash(helper);
  helper=replace(helper,"import {IDBFactory,IDBKeyRange} from '../vendor/fake-indexeddb/build/esm/index.js';",'');helper=replace(helper,'globalThis.IDBKeyRange=IDBKeyRange;','globalThis.__contextNativeStores=[];');
  helper=replace(helper,'indexedDB=new IDBFactory(),s=new Store(storage,{indexedDB,...options});',"indexedDB=globalThis.indexedDB,s=new Store(storage,{indexedDB,...options,name:'paia-structural-context-'+crypto.randomUUID()});globalThis.__contextNativeStores.push(s);");
  helper=replace(helper,'await s.capture(capture((await s.status()).epoch));return {s,storage,indexedDB};',"await s.capture(capture((await s.status()).epoch));if(!(s.repository.db instanceof IDBDatabase))throw Error('native database required');return {s,storage,indexedDB};");await writeFile(join(tests,'harness/thought-m1.mjs'),helper);
  await cp(join(root,'../services/ai-gateway/tests/maintenance-source-response-fixture.mjs'),join(tests,'maintenance-source-response-fixture.mjs'));
  receipt.owningSha256={};
  for(const file of ['ai-cost-03-structural-context.test.mjs','ai-cost-03-topic-context.test.mjs']){
   let text=await readFile(join(root,'tests',file),'utf8');receipt.owningSha256[file]=hash(text);
   text=replace(text,"import test from 'node:test';","import test from './native-bridge.mjs';");text=replace(text,"import assert from 'node:assert/strict';","import {assert} from './native-bridge.mjs';");text=replace(text,"'../../services/ai-gateway/tests/maintenance-source-response-fixture.mjs'","'./maintenance-source-response-fixture.mjs'");await writeFile(join(tests,file),text);
  }
  const worker=join(extension.path,'background/service-worker.js');await writeFile(worker,(await readFile(worker,'utf8'))+"\nimport '../tests/ai-cost-03-structural-context.test.mjs';\nimport '../tests/ai-cost-03-topic-context.test.mjs';\nimport {runCorrectionCases} from '../tests/native-bridge.mjs';\nconst nativePrevious=globalThis.__bnsNative;globalThis.__bnsNative={...nativePrevious,run(command,args){return command==='structural-context-matrix'?runCorrectionCases(args.prefix):nativePrevious.run(command,args);}};\n");
  receipt.hashes=Object.fromEntries(await Promise.all(runtime.map(async p=>[p,hash(await readFile(join(extension.path,p)))])));
  if(variant==='source')sourceVector=receipt.hashes;else assert.deepEqual(receipt.hashes,sourceVector);
  browser=await startNative(extension.path);receipt.browserVersion=browser.browserVersion;receipt.cases={};
  for(const [prefix,count]of [['Section-lineage Context correction',43],['Topic-name-lineage Context correction',49]]){receipt.cases[prefix]=await browser.call('structural-context-matrix',{prefix});assert.equal(receipt.cases[prefix].length,count);assert.equal(new Set(receipt.cases[prefix]).size,count);}
  receipt.isolation=await browser.isolation();assert.equal(receipt.isolation.nativeFactory,true);assert.equal(receipt.isolation.networkAttempts,0);assert.equal(receipt.isolation.httpRequests,0);receipt.result='PASS';
 }catch(e){receipt.result='FAIL';receipt.error=e.stack;throw e;}
 finally{await writeFile(join(output,variant+'.json'),JSON.stringify(receipt,null,2));await browser?.close();await extension?.cleanup();}
});

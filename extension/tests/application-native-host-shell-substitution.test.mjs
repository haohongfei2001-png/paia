import test from 'node:test';
import {mkdtemp,cp,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const root=await mkdtemp('/tmp/paia-native-shell-substitution-');await cp(fileURLToPath(new URL('..',import.meta.url)),join(root,'extension'),{recursive:true});console.log('PRESERVED_GRAPH',root);
test('caller options cannot use a self-restoring freeze to rebrand an injected selection shell',async()=>{
 const body=`import assert from 'node:assert/strict';import {installInitialHost} from './extension/tests/harness/native-host-bootstrap-fixture.mjs';const {api,counters}=installInitialHost();const commands=await import('./extension/background/application-selection-commands.js');const injected=commands.createInjectedApplicationSelectionCommandsForTest(api,{}),freeze=Object.freeze;let shim=0,returned,refused;const options={get ready(){Object.freeze=function(){shim++;Object.freeze=freeze;return injected;};return ()=>Promise.resolve();}};try{returned=commands.createProductionApplicationSelectionCommands(options);}catch(error){refused=error;}finally{Object.freeze=freeze;}assert.equal(returned,undefined);assert.equal(refused?.code,'GENERATION_NATIVE_HOST_REQUIRED');assert.equal(shim,0);assert.equal(counters.get,0);assert.equal(counters.set,0);assert.equal(counters.script,0);assert.equal(counters.native,0);console.log('original shell substitution refused before SDK');`;
 const path=join(root,'shell-negative.mjs');await writeFile(path,body);try{const r=await promisify(execFile)(process.execPath,[path],{timeout:30000,maxBuffer:1024*1024});await writeFile(join(root,'result.log'),r.stdout+r.stderr);}catch(e){await writeFile(join(root,'result.log'),String(e.stdout??'')+String(e.stderr??'')+'\n'+String(e));throw e;}
});

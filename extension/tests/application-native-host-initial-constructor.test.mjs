import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,cp,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const root=await mkdtemp('/tmp/paia-native-initial-constructor-'),source=fileURLToPath(new URL('../background/',import.meta.url));
await cp(join(source,'native-host-bootstrap.js'),join(root,'native-host-bootstrap.js'));await cp(join(source,'application-startup-events.js'),join(root,'application-startup-events.js'));await writeFile(join(root,'package.json'),'{"type":"module"}');
console.log('PRESERVED_GRAPH',root);
test('post-capture WeakMap constructor and Symbol replacements never allocate or brand private origins',async()=>{
 const fixture=pathToFileURL(fileURLToPath(new URL('./harness/native-host-bootstrap-fixture.mjs',import.meta.url))).href;
 const body=`import assert from 'node:assert/strict';import {installInitialHost} from ${JSON.stringify(fixture)};const {api}=installInitialHost();const leaf=await import('./native-host-bootstrap.js');assert.equal(leaf.readOriginalBootstrapHost(),api);const Weak=WeakMap,Sym=Symbol;let allocations=0,symbols=0;globalThis.WeakMap=function(){allocations++;return new Weak();};globalThis.Symbol=function(){symbols++;return Sym();};let events;try{events=await import('./application-startup-events.js');}finally{globalThis.WeakMap=Weak;globalThis.Symbol=Sym;}assert.equal(allocations,0);assert.equal(symbols,0);const native=events.createProductionApplicationStartupEvents(),injected=events.createInjectedApplicationStartupEventsForTest(api);assert.equal(events.isProductionApplicationStartupEvents(native),true);assert.equal(events.isProductionApplicationStartupEvents(injected),false);console.log('initial constructor and symbol PASS');`;
 const entry=join(root,'constructor-negative.mjs');await writeFile(entry,body);try{const r=await promisify(execFile)(process.execPath,[entry],{timeout:30000,maxBuffer:1024*1024});await writeFile(join(root,'result.log'),r.stdout+r.stderr);assert.match(r.stdout,/PASS/);}catch(e){await writeFile(join(root,'result.log'),String(e.stdout??'')+String(e.stderr??'')+'\n'+String(e));throw e;}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
const root=fileURLToPath(new URL('..',import.meta.url));
test('original private native Assist fixture loads the actual source controller into its isolated classic-script world',async()=>{
 const source=await readFile(join(root,'tests/harness/ai-assist-native.mjs'),'utf8'),start=source.indexOf('  const module=await readFile('),end=source.indexOf("  await world.run(`globalThis.assistReads",start);assert.ok(start>=0&&end>start);
 const context=vm.createContext({}),calls=[];const world={run:async code=>{calls.push(code);return new vm.Script(code).runInContext(context);}};
 const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
 await new AsyncFunction('readFile','join','extensionPath','world',source.slice(start,end))(readFile,join,root,world);
 assert.equal(typeof context.AssistResultController,'function');assert.equal(context.AssistResultController,context.PAIAAssistResultController);assert.equal(calls.length,1);
 const wrapper=await readFile(join(root,'content/assist-result.js'),'utf8');assert.match(wrapper,/import '\.\/assist-result-runtime\.js'/);assert.match(wrapper,/export const AssistResultController=globalThis\.PAIAAssistResultController/);
 const runtime=await readFile(join(root,'content/assist-result-runtime.js'),'utf8');assert.ok(calls[0].startsWith(runtime),'source implementation is evaluated without rewriting its controller');assert.doesNotMatch(calls[0],/\b(?:fetch|XMLHttpRequest|WebSocket)\s*\(/);
});

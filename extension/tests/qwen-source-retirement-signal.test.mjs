import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as production from '../core/ai-usage/qwen-source-profile.js';

const fixtureURL=new URL('./qwen-source-profile.test.mjs',import.meta.url),sourceURL=new URL('../core/ai-usage/qwen-source-profile.js',import.meta.url);
let helpers=(await readFile(fixtureURL,'utf8')).split("test('real source installation")[0];
helpers=helpers.replace(/^import .*$/gm,line=>line.replace(/from '(\.\.?\/[^']+)'/g,(_,p)=>'from '+JSON.stringify(new URL(p,fixtureURL).href))).replaceAll('import.meta.url',JSON.stringify(fixtureURL.href));
helpers+='\nexport {fixture,controls};';
const {fixture,controls}=await import('data:text/javascript;base64,'+Buffer.from(helpers).toString('base64'));
const nativeAborted=Object.getOwnPropertyDescriptor(AbortSignal.prototype,'aborted').get,nativeAdd=EventTarget.prototype.addEventListener;let serial=0;
async function isolated(f){
 let source=await readFile(sourceURL,'utf8');source=source.replace("import {QWEN_SOURCE_PROFILE_INSTALLATIONS} from './qwen-source-profile-installations.js';",'const QWEN_SOURCE_PROFILE_INSTALLATIONS='+JSON.stringify([f])+';');source=source.replace(/from '(\.\.?\/[^']+)'/g,(_,p)=>'from '+JSON.stringify(new URL(p,sourceURL).href));
 // Read-only ordering inspection and counter disposal exist only in this test
 // graph, never in the installed runtime or its public capability API.
 source+='\nexport function stateForTest(cap){const s=caps.get(cap);return {retired:s.retired,counterCurrent:inspectQwenBpeCounter(s.counter)!==null,compiler:s.compiler};}\nexport function retireCounterForTest(cap){caps.get(cap).counter.dispose();}\n// retirement '+serial++;
 return import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
}
async function setup(){const f=await fixture(),api=await isolated(f),cap=await api.loadInstalledQwenSourceProfile(f.id);assert.ok(cap);return {f,api,cap};}
test('source lifecycle signal is exact native identity and cannot be obtained with copied/foreign capabilities',async()=>{
 const {f,api,cap}=await setup(),signal=api.installedQwenSourceRetirementSignal(cap);assert.ok(signal instanceof AbortSignal);assert.equal(nativeAborted.call(signal),false);assert.equal(api.installedQwenSourceRetirementSignal(cap),signal);
 for(const invalid of [null,{},structuredClone(cap),new Proxy(cap,{})])assert.equal(api.installedQwenSourceRetirementSignal(invalid),null);
 const other=await isolated(f),foreign=await other.loadInstalledQwenSourceProfile(f.id);assert.ok(foreign);assert.notEqual(other.installedQwenSourceRetirementSignal(foreign),signal);assert.equal(other.installedQwenSourceRetirementSignal(cap),null);assert.equal(api.installedQwenSourceRetirementSignal(foreign),null);assert.equal(production.installedQwenSourceRetirementSignal(cap),null);
 api.retireInstalledQwenSourceProfile(f.id);other.retireInstalledQwenSourceProfile(f.id);
});
test('retirement synchronously aborts once before owned mechanism disposal and reentrant reads cannot revive it',async()=>{
 const {f,api,cap}=await setup(),signal=api.installedQwenSourceRetirementSignal(cap),events=[];
 nativeAdd.call(signal,'abort',()=>{events.push({aborted:nativeAborted.call(signal),state:api.stateForTest(cap),compilerStatus:api.stateForTest(cap).compiler.compile({...controls(f),now:Date.now()}).status,source:api.inspectInstalledQwenSourceProfile(cap),signal:api.installedQwenSourceRetirementSignal(cap)});assert.equal(api.retireInstalledQwenSourceProfile(f.id),true);});
 assert.equal(api.retireInstalledQwenSourceProfile(f.id),true);assert.equal(events.length,1);assert.equal(events[0].aborted,true);assert.equal(events[0].state.retired,true);assert.equal(events[0].state.counterCurrent,true);assert.equal(events[0].compilerStatus,'COMPILED_PARTIAL');assert.equal(events[0].state.compiler.compile({...controls(f),now:Date.now()}).status,'UNAVAILABLE');assert.equal(events[0].source,null);assert.equal(events[0].signal,null);assert.equal(api.stateForTest(cap).counterCurrent,false);assert.equal(api.compileInstalledQwenRequest(cap,controls(f)).status,'UNAVAILABLE');
 assert.equal(api.retireInstalledQwenSourceProfile(f.id),true);assert.equal(events.length,1);assert.equal(await api.loadInstalledQwenSourceProfile(f.id),null);
});
test('later public AbortController and signal callback/property tampering cannot suppress native retirement',async()=>{
 const f=await fixture(),api=await isolated(f),Controller=globalThis.AbortController,abort=Object.getOwnPropertyDescriptor(Controller.prototype,'abort'),signalDescriptor=Object.getOwnPropertyDescriptor(Controller.prototype,'signal'),dispatch=Object.getOwnPropertyDescriptor(EventTarget.prototype,'dispatchEvent');let poisoned=0,cap,signal,events=0;
 try{
  globalThis.AbortController=class {constructor(){poisoned++;throw Error('POISONED_CONSTRUCTOR');}};
  Object.defineProperty(Controller.prototype,'abort',{...abort,value(){poisoned++;}});Object.defineProperty(Controller.prototype,'signal',{...signalDescriptor,get(){poisoned++;throw Error('POISONED_SIGNAL');}});
  cap=await api.loadInstalledQwenSourceProfile(f.id);assert.ok(cap);signal=api.installedQwenSourceRetirementSignal(cap);
  Object.defineProperty(signal,'aborted',{get(){poisoned++;return false;}});Object.defineProperty(signal,'addEventListener',{value(){poisoned++;}});assert.throws(()=>Object.defineProperty(signal,'dispatchEvent',{value(){poisoned++;return true;}}),TypeError);Object.defineProperty(EventTarget.prototype,'dispatchEvent',{...dispatch,value(){poisoned++;return true;}});
  nativeAdd.call(signal,'abort',()=>{events++;},{once:true});assert.equal(api.retireInstalledQwenSourceProfile(f.id),true);assert.equal(nativeAborted.call(signal),true);assert.equal(events,1);assert.equal(api.installedQwenSourceRetirementSignal(cap),null);assert.equal(poisoned,0);
 }finally{globalThis.AbortController=Controller;Object.defineProperty(Controller.prototype,'abort',abort);Object.defineProperty(Controller.prototype,'signal',signalDescriptor);Object.defineProperty(EventTarget.prototype,'dispatchEvent',dispatch);}
});
test('original currentness detects private counter retirement and aborts its already issued signal',async()=>{
 const {f,api,cap}=await setup(),signal=api.installedQwenSourceRetirementSignal(cap);let observed=0;nativeAdd.call(signal,'abort',()=>{observed++;});api.retireCounterForTest(cap);assert.equal(nativeAborted.call(signal),false);assert.equal(api.inspectInstalledQwenSourceProfile(cap),null);assert.equal(nativeAborted.call(signal),true);assert.equal(observed,1);assert.equal(api.installedQwenSourceRetirementSignal(cap),null);assert.equal(await api.loadInstalledQwenSourceProfile(f.id),null);
});
test('original clock expiry/rollback retire and abort without renewing the source or its controls',async()=>{
 for(const mode of ['expiry','rollback']){const {f,api,cap}=await setup(),signal=api.installedQwenSourceRetirementSignal(cap),{inputTokens,...r}=controls(f),handle=api.prepareInstalledQwenControls(cap,r),clock=Date.now;assert.equal(handle.status,'CONTROLS_PREPARED');try{Date.now=()=>mode==='expiry'?f.qualification.expiresAt:f.qualification.verifiedAt-1;assert.equal(api.installedQwenSourceRetirementSignal(cap),null);assert.equal(nativeAborted.call(signal),true);assert.equal(api.finishInstalledQwenInputBound(cap,handle,{inputTokens}).status,'UNAVAILABLE');}finally{Date.now=clock;}assert.equal(api.installedQwenSourceRetirementSignal(cap),null);assert.equal(await api.loadInstalledQwenSourceProfile(f.id),null);}
});

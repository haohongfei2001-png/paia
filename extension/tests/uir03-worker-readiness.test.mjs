import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import {fakeDeviceOptions} from './harness/synthetic-device-options.mjs';
import {awakeLibraryFixtureWorker} from './harness/uir03-worker-fixture.mjs';

const harnessSource=await readFile(new URL('./harness/fake-chatgpt.mjs',import.meta.url),'utf8');
const nativeSource=await readFile(new URL('./uir-03-thought-original-chrome-e2e.test.mjs',import.meta.url),'utf8');
const eventualSource=harnessSource.slice(harnessSource.indexOf('export async function eventually('),harnessSource.indexOf('\nexport function conversation(')).replace('export ','');
const {eventually}=vm.runInNewContext(eventualSource+';({eventually});',{assert,Date,pause:ms=>new Promise(resolve=>setTimeout(resolve,ms))});
const root=fileURLToPath(new URL('..',import.meta.url));
const id='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',url=`chrome-extension://${id}/background/service-worker.js`;

// Execute the actual h.start control flow with a deterministic browser adapter.
// This is a startup-order unit control, not a claim of native Chrome execution.
async function fixture(mode='after-status'){
 const trace=[],target={url:()=>url},unrelated={url:()=>url.replace(id,'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb')};
 let workers=mode==='already-visible'?[target]:[],wakeCalls=0,published=false,releaseStatus;
 const chrome={runtime:{sendMessage:async message=>{
  assert.deepEqual(JSON.parse(JSON.stringify(message)),{type:'GET_STATUS'});wakeCalls++;trace.push('status');
  if(mode==='status-error')return {ok:false,error:'STORAGE_FAILED'};
  if(mode==='status-reject')throw Error('SYNTHETIC status rejected');
  if(mode==='status-timeout')return new Promise(resolve=>{releaseStatus=()=>resolve({ok:true,data:{consented:false}});});
  if(mode==='during-status')workers=[target];
  if(mode==='wrong-worker')workers=[unrelated];
  if(mode==='wrong-script')workers=[{url:()=>url.replace('service-worker.js','other.js')}];
  if(mode==='ambiguous')workers=[target,{url:()=>url}];
  return {ok:true,data:{consented:false}};
 }}};
 const page={on(){},async goto(value){assert.equal(value,`chrome-extension://${id}/ui/archive.html`);trace.push('page-loaded');},async evaluate(fn,message){return vm.runInNewContext('('+fn.toString()+')(message)',{chrome,message});}};
 const context={route:async()=>{},browser:()=>({newBrowserCDPSession:async()=>({send:async(name)=>{assert.equal(name,'Extensions.loadUnpacked');trace.push('registered');return {id};}})}),newPage:async()=>page,close:async()=>{},serviceWorkers(){
  trace.push('snapshot');const result=[...workers];
  if(mode==='after-status'&&wakeCalls&&!published){published=true;queueMicrotask(()=>{workers=[target];trace.push('target-visible');});}
  return result;
 }};
 const {FakeChatGPT}=vm.runInNewContext(harnessSource.slice(harnessSource.indexOf('export class FakeChatGPT')).replace('export class','class')+';({FakeChatGPT});',{assert,readFile,root,process,fakeDeviceOptions,chromium:{launchPersistentContext:async()=>context}});
 const h=await FakeChatGPT.start({onboarding:true});
 const {rpc}=vm.runInNewContext(nativeSource.slice(nativeSource.indexOf('const rpc=async('),nativeSource.indexOf('\nconst nav='))+';({rpc});',{assert});
 return {h,target,trace,wakeCalls:()=>wakeCalls,wake:()=>rpc(h.archive,'GET_STATUS'),releaseStatus:()=>releaseStatus?.()};
}

test('actual onboarding h.start returns before the target exists and the old eager snapshot fails before a normal wake',async()=>{
 const f=await fixture();assert.deepEqual(f.trace,['registered','page-loaded']);
 assert.throws(()=>{const worker=f.h.context.serviceWorkers().find(w=>w.url()===url);assert.ok(worker,'the original native worker is running');},/the original native worker is running/);
 assert.equal(f.wakeCalls(),0);
 const worker=await awakeLibraryFixtureWorker({context:f.h.context,extensionId:id,wake:f.wake,eventually});
 assert.equal(worker,f.target);assert.equal(f.wakeCalls(),1);assert.ok(f.trace.indexOf('status')<f.trace.indexOf('target-visible'));
});

for(const mode of ['already-visible','during-status','after-status'])test('one original status handshake acquires the same native-target identity: '+mode,async()=>{
 const f=await fixture(mode),worker=await awakeLibraryFixtureWorker({context:f.h.context,extensionId:id,wake:f.wake,eventually});
 assert.equal(worker,f.target);assert.equal(f.wakeCalls(),1);assert.equal(f.trace.filter(x=>x==='registered').length,1);
});

for(const mode of ['status-error','status-reject'])test('failed original status is not worker admission: '+mode,async()=>{
 const f=await fixture(mode);
 await assert.rejects(awakeLibraryFixtureWorker({context:f.h.context,extensionId:id,wake:f.wake,eventually}));
 assert.equal(f.wakeCalls(),1);assert.equal(f.trace.filter(x=>x==='snapshot').length,0);
});

for(const mode of ['status-timeout','never-visible','wrong-worker','wrong-script'])test('bounded status or target absence refuses without another wake: '+mode,async()=>{
 const f=await fixture(mode);
 await assert.rejects(awakeLibraryFixtureWorker({context:f.h.context,extensionId:id,wake:f.wake,eventually:(fn,label)=>eventually(fn,label,150)}),/the original native worker is running/);
 assert.equal(f.wakeCalls(),1);
 if(mode==='status-timeout'){assert.equal(f.trace.filter(x=>x==='snapshot').length,0);f.releaseStatus();await new Promise(resolve=>setImmediate(resolve));assert.equal(f.trace.filter(x=>x==='snapshot').length,0,'late response cannot admit a target after the deadline');}
 else assert.ok(f.trace.some(x=>x==='snapshot'),'wrong or absent target was actually inspected after status');
});

test('ambiguous original worker targets refuse rather than choosing an arbitrary owner',async()=>{
 const f=await fixture('ambiguous');await assert.rejects(awakeLibraryFixtureWorker({context:f.h.context,extensionId:id,wake:f.wake,eventually}),/Ambiguous original native worker/);assert.equal(f.wakeCalls(),1);
});

test('source and release ready share one status wake before observing and retain original owner and 300-second journey checks',()=>{
 const ready=nativeSource.slice(nativeSource.indexOf('async function ready('),nativeSource.indexOf('\nasync function seed('));
 assert.match(ready,/awakeLibraryFixtureWorker\(\{context:h.context,extensionId:h.extensionId,wake:\(\)=>rpc\(page,'GET_STATUS'\),eventually\}\)/);
 assert.ok(ready.indexOf('awakeLibraryFixtureWorker')<ready.indexOf('evaluate(installLibraryFixtureObservation)'));
 assert.match(ready,/__uir03Library.owner.store===__uir03Worker.store/);assert.match(nativeSource,/ready\(source,sourceFixture,'source'\)/);assert.match(nativeSource,/ready\(release,releaseFixture,'release'\)/);
 assert.match(eventualSource,/timeout=14000/);assert.match(nativeSource,/timeout:300000/);
});

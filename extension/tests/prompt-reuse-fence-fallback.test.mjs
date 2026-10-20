import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBObjectStore} from './vendor/fake-indexeddb/build/esm/index.js';
import {local} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {PromptReuseService} from '../core/prompt-reuse-service.js';
import {readAIMaintenanceFilterVisibility} from '../core/ai-usage/ai-filter-owner.js';
import {PromptReuseCommands} from '../background/prompt-reuse-commands.js';
import {PromptSurfaceCommands} from '../background/prompt-surface.js';
import {NextPromptCommands} from '../background/prompt-next.js';
import {NextFamilyView} from '../core/next-family-view.js';
import {SafetyRunner} from '../core/thought-runner.js';
import {observeRepositoryWriteFence,requireRepositoryWriteFence} from '../core/idb-repository.js';
import {STORAGE_KEY,ArchiveError} from '../core/constants.js';
const text='Explain sorting',clock=()=>1800000000000;
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};
async function bounded(promise){let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('FENCE_FALLBACK_WATCHDOG')),10000);})]);}finally{clearTimeout(timer);}}
async function fixture(t,count=2,{readClock=clock}={}){
 const backing=local(),hooks={get:null},storage={async get(key){const value=await backing.get(key);await new Promise(setImmediate);await hooks.get?.(new Error().stack);return value;},set:backing.set};
 const s=new OrganizerStore(storage,{indexedDB:new IDBFactory()});await s.consent(true);t.after(()=>s.repository.close());const epoch=(await s.status()).epoch;
 for(let start=0;start<count;start+=200)await s.capture({epoch,adapterVersion:'0.3.0',chat:{id:'fence-fallback',url:'https://chatgpt.com/c/fence-fallback',title:'Synthetic fence fallback'},messages:Array.from({length:Math.min(200,count-start)},(_,i)=>({sourceMessageId:'input-'+(start+i),pageOrder:start+i+1,originalText:text}))});
 await s.finishFoundation();const safety=new SafetyRunner(s);await safety.wake();assert.equal(safety.failed,false);
 assert.deepEqual(await s.processPurgeCleanup(),{processed:0,pending:false});assert.deepEqual(await s.processInvalidations(),{processed:0,pending:false});
 const service=new PromptReuseService(s,{clock:readClock}),single=await service.query(),family=single.items.find(x=>x.text===text);assert.ok(family);assert.equal(family.members.length,count);
 const durable=async()=>({control:(await storage.get(STORAGE_KEY))[STORAGE_KEY],meta:await s.repository.transaction(false,t=>t.all('meta'),['meta']),jobs:await s.repository.transaction(false,t=>t.all('organizerJobs'),['organizerJobs'])});
 return {s,service,safety,single,family,durable,hooks,storage,count};
}
function projectionGate(t,{number=1,fail=null}={}){
 const original=crypto.subtle.digest,entered=deferred(),release=deferred();let calls=0;
 crypto.subtle.digest=async function(algorithm,bytes){const result=await original.call(this,algorithm,bytes);if(new TextDecoder().decode(bytes)===JSON.stringify(['normal',text])&&++calls===number){entered.resolve();await release.promise;if(fail)throw new ArchiveError(fail);}return result;};
 t.after(()=>{release.resolve();crypto.subtle.digest=original;});return {entered:entered.promise,release:release.resolve,calls:()=>calls,restore:()=>{crypto.subtle.digest=original;}};
}
function reads(t,onGet=()=>{}){
 const original=IDBObjectStore.prototype.get,state={records:0};
 IDBObjectStore.prototype.get=function(...args){const request=original.apply(this,args);if(this.name==='records')state.records++;onGet(this,args,request,state);return request;};
 const restore=()=>{IDBObjectStore.prototype.get=original;};t.after(restore);return {state,restore};
}
async function emptyDrain(f){const status=await f.s.status();assert.equal(status.consented,true);await f.safety.wake();assert.equal(f.safety.failed,false);}
function success(f,values){for(const value of values)assert.equal(value.status,'fulfilled',value.reason?.code);assert.deepEqual(values[0].value,f.single);assert.deepEqual(values[1].value,{id:f.family.id,text,generation:f.single.generation});}
function refused(values){for(const value of values){assert.equal(value.status,'rejected');assert.equal(value.reason.code,'MEMORY_STALE');}}
function pair(f){return Promise.allSettled([f.service.query(),f.service.resolve(f.family)]);}

test('quiet original constructor pair remains one scan and exact independent results',async t=>{
 const f=await fixture(t),probe=reads(t),values=await pair(f);success(f,values);assert.equal(probe.state.records,4);
 for(const key of ['db','factory','name']){const d=Object.getOwnPropertyDescriptor(f.s.repository,key);assert.ok(d&&Object.hasOwn(d,'value'));}
});
for(const mode of ['single','shared'])test('actual empty status SafetyRunner interruption recovers '+mode+' with explicit bounded scan cost',{timeout:15000},async t=>{
 const f=await fixture(t,501),before=await f.durable(),fence=observeRepositoryWriteFence(f.s.repository);let work=null,requestedAt=null,completedAt=null;
 const probe=reads(t,(store,args,request,state)=>{if(store.name==='records'&&state.records===201){requestedAt=state.records;work=emptyDrain(f).then(()=>{completedAt=state.records;});}});
 const values=await bounded(Promise.allSettled(mode==='single'?[f.service.query()]:[f.service.query(),f.service.resolve(f.family)]));await bounded(work);
 const after=await f.durable();assert.deepEqual(after,before);assert.throws(()=>requireRepositoryWriteFence(f.s.repository,fence),e=>e.code==='STALE_BASE');
 t.diagnostic(JSON.stringify({mode,requestedAt,completedAt,sourceReads:probe.state.records,statuses:values.map(v=>v.status)}));
 if(mode==='shared')success(f,values);else{assert.equal(values[0].status,'fulfilled');assert.deepEqual(values[0].value,f.single);}
 assert.equal(probe.state.records,1002*(mode==='shared'?3:1),'the discarded shared scan plus one independent scan per caller is three, never a claimed speedup');
});
test('same-code first snapshot failure never enters private fence recovery',{timeout:15000},async t=>{
 const f=await fixture(t),gate=projectionGate(t,{fail:'MEMORY_STALE'}),probe=reads(t),pending=pair(f);
 try{await bounded(gate.entered);await emptyDrain(f);gate.release();const values=await bounded(pending);refused(values);assert.equal(probe.state.records,4,'no replacement body scan after original snapshot failure');}
 finally{gate.release();await pending;}
});
test('a second real empty write during fresh projections refuses without recursive retry',{timeout:15000},async t=>{
 const f=await fixture(t),first=projectionGate(t),originalHash=crypto.subtle.digest,enteredFresh=deferred(),releaseFresh=deferred();let hashes=0;
 crypto.subtle.digest=async function(...args){const value=await originalHash.apply(this,args);if(new TextDecoder().decode(args[1])===JSON.stringify(['normal',text])&&++hashes===2){enteredFresh.resolve();await releaseFresh.promise;}return value;};
 t.after(()=>{releaseFresh.resolve();first.restore();});const probe=reads(t),pending=pair(f);
 try{await bounded(first.entered);await emptyDrain(f);first.release();await bounded(enteredFresh.promise);await emptyDrain(f);releaseFresh.resolve();const values=await bounded(pending);refused(values);assert.equal(probe.state.records,12,'each caller is limited to its one replacement scan');}
 finally{first.release();releaseFresh.resolve();await pending;}
});
for(const key of ['db','factory','name'])test('a synchronous self-restoring '+key+' accessor cannot be reclassified as only a write fence',{timeout:15000},async t=>{
 const f=await fixture(t),gate=projectionGate(t),descriptor=Object.getOwnPropertyDescriptor(f.s.repository,key);let armed=false,installed=false,getters=0;
 const probe=reads(t,(store,args)=>{if(armed&&!installed&&store.name==='meta'&&args[0]==='backup-data-generation'){
  installed=true;store.transaction.addEventListener('complete',()=>{Object.defineProperty(f.s.repository,key,{configurable:true,enumerable:descriptor.enumerable,get(){getters++;Object.defineProperty(f.s.repository,key,descriptor);return descriptor.value;}});},{once:true});
 }});
 t.after(()=>Object.defineProperty(f.s.repository,key,descriptor));const pending=pair(f);
 try{await bounded(gate.entered);await emptyDrain(f);armed=true;gate.release();const values=await bounded(pending);
  t.diagnostic(JSON.stringify({key,installed,getters,sourceReads:probe.state.records,statuses:values.map(v=>v.status)}));
  assert.equal(installed,true);refused(values);assert.equal(getters,0,'the admitted service must reject the descriptor before invoking its getter');assert.equal(probe.state.records,4);
 }finally{Object.defineProperty(f.s.repository,key,descriptor);gate.release();await pending;}
});
for(const restoring of [false,true])for(const key of ['db','factory','name'])test('pre-existing '+key+' accessor keeps the original independent entry, restoring='+restoring,async t=>{
 const f=await fixture(t),descriptor=Object.getOwnPropertyDescriptor(f.s.repository,key),probe=reads(t);let gets=0;
 Object.defineProperty(f.s.repository,key,{configurable:true,enumerable:descriptor.enumerable,get(){gets++;if(restoring)Object.defineProperty(f.s.repository,key,descriptor);return descriptor.value;}});t.after(()=>Object.defineProperty(f.s.repository,key,descriptor));
 try{const values=await pair(f);success(f,values);assert.equal(probe.state.records,8);t.diagnostic(JSON.stringify({key,restoring,independentOriginalGetterCalls:gets}));}finally{Object.defineProperty(f.s.repository,key,descriptor);}
});
for(const key of ['db','factory','name'])test('post-admission '+key+' descriptor flags cannot masquerade as a fence-only change',async t=>{
 const f=await fixture(t),descriptor=Object.getOwnPropertyDescriptor(f.s.repository,key),gate=projectionGate(t),probe=reads(t),pending=pair(f);
 try{await bounded(gate.entered);await emptyDrain(f);Object.defineProperty(f.s.repository,key,{...descriptor,enumerable:!descriptor.enumerable});gate.release();refused(await bounded(pending));assert.equal(probe.state.records,4);}
 finally{Object.defineProperty(f.s.repository,key,descriptor);gate.release();await pending;}
});
async function revoke(f){await f.s.write(async tx=>{const c=await f.s.control(tx);c.settings.consentVersion=0;c.settings.enabled=false;c.settings.epoch++;await f.s.saveControl(tx,c);});}
for(const phase of ['before-fresh','during-fresh'])test('original consent revocation '+phase+' cannot return discarded or fresh material',{timeout:15000},async t=>{
 const f=await fixture(t),initial=projectionGate(t),hash=crypto.subtle.digest,freshEntered=deferred(),freshRelease=deferred();let calls=0;
 crypto.subtle.digest=async function(...args){const value=await hash.apply(this,args);if(new TextDecoder().decode(args[1])===JSON.stringify(['normal',text])&&++calls===2){freshEntered.resolve();await freshRelease.promise;}return value;};
 t.after(()=>{freshRelease.resolve();initial.restore();});const probe=reads(t),pending=pair(f);
 try{await bounded(initial.entered);await emptyDrain(f);if(phase==='before-fresh')await revoke(f);initial.release();if(phase==='during-fresh'){await bounded(freshEntered.promise);await revoke(f);}freshRelease.resolve();refused(await bounded(pending));assert.equal(probe.state.records,phase==='before-fresh'?4:12);}
 finally{initial.release();freshRelease.resolve();await pending;}
});
test('observed restore-epoch ABA stays refused while the other original caller returns late',{timeout:15000},async t=>{
 const f=await fixture(t),oldEpoch=await f.s.repository.transaction(false,t=>t.get('meta','recovery-restore-epoch')),before=await f.durable(),gate=projectionGate(t),late=deferred(),release=deferred(),probe=reads(t);let observing=0;
 const a=f.service.query(),b=f.service.resolve(f.family),pending=Promise.allSettled([a,b]),first=Promise.race([a,b].map(p=>p.then(()=>({status:'fulfilled'}),reason=>({status:'rejected',reason}))));
 try{
  await bounded(gate.entered);await f.s.repository.transaction(true,t=>t.put('meta',{id:'recovery-restore-epoch',value:'synthetic-observed-drift'}));
  f.hooks.get=async stack=>{if(stack.includes('observeOriginalControlPublication')&&++observing===2){late.resolve();await release.promise;}};
  gate.release();await bounded(late.promise);const rejected=await bounded(first);assert.equal(rejected.status,'rejected');assert.equal(rejected.reason.code,'MEMORY_STALE');
  await f.s.repository.transaction(true,t=>oldEpoch?t.put('meta',oldEpoch):t.delete('meta','recovery-restore-epoch'));
  f.hooks.get=null;release.resolve();refused(await bounded(pending));assert.deepEqual(await f.durable(),before);assert.equal(probe.state.records,4);
 }finally{f.hooks.get=null;gate.release();release.resolve();await pending;}
});
test('fresh replacement does not call query again or refresh a newer Family view TTL',{timeout:15000},async t=>{
 let now=0;const f=await fixture(t,2,{readClock:()=>now}),begin=NextFamilyView.prototype.begin;let serialCalls=0;NextFamilyView.prototype.begin=function(...args){serialCalls++;return begin.apply(this,args);};t.after(()=>{NextFamilyView.prototype.begin=begin;});const initial=projectionGate(t),hash=crypto.subtle.digest,freshEntered=deferred(),freshRelease=deferred();let calls=0;
 crypto.subtle.digest=async function(...args){const value=await hash.apply(this,args);if(new TextDecoder().decode(args[1])===JSON.stringify(['normal',text])&&++calls===2){freshEntered.resolve();await freshRelease.promise;}return value;};
 t.after(()=>{freshRelease.resolve();initial.restore();});const pending=pair(f);
 try{await bounded(initial.entered);await emptyDrain(f);initial.release();await bounded(freshEntered.promise);now=5;assert.deepEqual(await f.service.query(),f.single);now=20;freshRelease.resolve();success(f,await bounded(pending));assert.equal(serialCalls,2,'only the old query and the newer explicit query begin a view');now=30005;assert.equal((await f.service.nextFamilyView()).available,false);}
 finally{initial.release();freshRelease.resolve();await pending;}
});
for(const duringFresh of [false,true])test('unknown original observer exception cannot grant fence recovery, fresh='+duringFresh,{timeout:15000},async t=>{
 const f=await fixture(t),initial=projectionGate(t),hash=crypto.subtle.digest,freshEntered=deferred(),freshRelease=deferred();let calls=0,injected=0;
 crypto.subtle.digest=async function(...args){const value=await hash.apply(this,args);if(new TextDecoder().decode(args[1])===JSON.stringify(['normal',text])&&++calls===2){freshEntered.resolve();await freshRelease.promise;}return value;};
 t.after(()=>{freshRelease.resolve();initial.restore();});const probe=reads(t),pending=pair(f);
 try{
  await bounded(initial.entered);await emptyDrain(f);
  if(duringFresh){initial.release();await bounded(freshEntered.promise);}
  f.hooks.get=stack=>{if(stack.includes('observeOriginalControlPublication')&&injected++===0)throw new ArchiveError('CONTROL_PUBLICATION_CHANGED');};
  initial.release();freshRelease.resolve();refused(await bounded(pending));assert.ok(injected>=1);assert.equal(probe.state.records,duringFresh?12:4);
 }finally{f.hooks.get=null;initial.release();freshRelease.resolve();await pending;}
});
test('original observer metadata retry remains available when no fence changed',{timeout:15000},async t=>{
 const f=await fixture(t),gate=projectionGate(t),probe=reads(t),pending=pair(f);let injected=0;
 try{await bounded(gate.entered);f.hooks.get=stack=>{if(stack.includes('observeOriginalControlPublication')&&injected++===0)throw new ArchiveError('CONTROL_PUBLICATION_CHANGED');};gate.release();success(f,await bounded(pending));assert.ok(injected>=1);assert.equal(probe.state.records,4);}
 finally{f.hooks.get=null;gate.release();await pending;}
});
test('a real final metadata request exception is sticky even when the next caller can read successfully',{timeout:15000},async t=>{
 const f=await fixture(t),gate=projectionGate(t),original=IDBObjectStore.prototype.get;let armed=false,injected=0,records=0;
 IDBObjectStore.prototype.get=function(...args){if(this.name==='records')records++;if(armed&&this.name==='meta'&&args[0]==='smart-filter'&&injected++===0)throw new ArchiveError('MEMORY_STALE');return original.apply(this,args);};
 t.after(()=>{IDBObjectStore.prototype.get=original;});const pending=pair(f);
 try{await bounded(gate.entered);armed=true;gate.release();refused(await bounded(pending));assert.ok(injected>=1);assert.equal(records,4);}
 finally{gate.release();IDBObjectStore.prototype.get=original;await pending;}
});

async function filterFixture(t,{extraStatic=false}={}){
 const now=Date.parse('2026-10-18T00:00:00Z'),grants=new WeakMap();let visibility=true,publication=null;
 const issue=(request,kind)=>{const grant={allowed:true,tier:'pro',optIn:true,processingConsent:true,inputIds:[...request.candidateIds,...request.neighborIds],epochs:{entitlement:'synthetic-pro',optIn:'synthetic-opt-in',processing:'synthetic-processing',userRead:'synthetic-read'},policy:{version:'pro-ambiguous-1',qualificationId:'SYNTHETIC_READ_REUSE_CONTROL'}};grants.set(grant,kind);return grant;};
 const authority={resolve:async(_t,r)=>issue(r,'write'),resolveVisibility:async(_t,r)=>{
  if(!visibility||!publication||r.operationId!==publication.operationId)return null;
  const item=publication.filtered.find(x=>x.inputId===r.inputId),expected=item&&{version:1,policy:publication.policy,authority:publication.epochs,scope:publication.scope,proof:publication.proof,sequence:item.sequence};
  return JSON.stringify(expected)===JSON.stringify(r.decision)?issue(r,'visibility'):null;
 },isCurrent:g=>grants.has(g)&&(grants.get(g)==='write'||visibility)};
 const s=new OrganizerStore(local(),{indexedDB:new IDBFactory(),clock:()=>new Date(now).toISOString(),aiFilterAuthority:authority});await s.consent(true);t.after(()=>s.repository.close());
 const presence={version:1,attachment:'absent',reference:'absent',confidence:'verified'};
 await s.capture({epoch:(await s.status()).epoch,adapterVersion:'0.3.0',chat:{id:'synthetic-concurrent-filter',url:'https://chatgpt.com/c/synthetic-concurrent-filter',title:'Synthetic concurrent Filter'},messages:['neighbor','candidate-one','candidate-two',...(extraStatic?['static-one','static-two']:[])].map((sourceMessageId,i)=>({sourceMessageId,pageOrder:i+1,originalText:i===0?'Invented paper boat has a wide folded base':i<3?'然后':text,presence}))});
 await s.finishFoundation();await s.evaluateFilters();const snapshot=await s.snapshot(),find=id=>snapshot.library.blocks.find(b=>snapshot.records.find(r=>r.id===b.originalTextReference)?.sourceMessageId===id);
 const scope={candidateIds:['candidate-one','candidate-two'].map(id=>find(id).id).sort(),neighborIds:[find('neighbor').id]},handle=await s.run(()=>s.repository.transaction(false,t=>s.prepareAIMaintenanceFilter(t,scope)));
 const committed=await s.write(t=>s.commitAIMaintenanceFilter(t,handle,scope.candidateIds.map(inputId=>({inputId,decision:'FILTER'}))));
 publication=readAIMaintenanceFilterVisibility(committed.visibilityPublication,s);assert.ok(publication);s.releaseAIMaintenanceFilter(handle);
 return {s,service:new PromptReuseService(s,{clock:()=>now}),revoke:()=>{visibility=false;},generation:()=>s.repository.transaction(false,async t=>(await t.get('meta','backup-data-generation')).value)};
}

for(const order of ['leader-held','leader-settled'])test('dynamic decline '+order+' never enters completed-static fence recovery',{timeout:15000},async t=>{
 const f=await filterFixture(t,{extraStatic:true});f.safety=new SafetyRunner(f.s);await f.safety.wake();
 const counter=reads(t);await f.service.query();const singleReads=counter.state.records;counter.state.records=0;
 const hash=crypto.subtle.digest,entered=deferred(),release=[deferred(),deferred()];let calls=0;
 crypto.subtle.digest=async function(...args){const value=await hash.apply(this,args);if(new TextDecoder().decode(args[1])===JSON.stringify(['normal',text])){const index=calls++;if(calls===2)entered.resolve();if(index<2)await release[index].promise;}return value;};
 t.after(()=>{release.forEach(x=>x.resolve());crypto.subtle.digest=hash;});
 const first=f.service.query(),waiting=f.service.query(),a=Promise.allSettled([first]),b=Promise.allSettled([waiting]);
 try{await bounded(entered.promise);await emptyDrain(f);
  if(order==='leader-held'){release[1].resolve();const [late]=await bounded(b);assert.equal(late.status,'rejected');assert.equal(late.reason.code,'MEMORY_STALE');release[0].resolve();}
  else{release[0].resolve();assert.equal((await bounded(a))[0].status,'fulfilled');release[1].resolve();}
  assert.equal((await bounded(a))[0].status,'fulfilled');const [late]=await bounded(b);assert.equal(late.status,'rejected');assert.equal(late.reason.code,'MEMORY_STALE');
  assert.equal(counter.state.records,singleReads*2,'only the original dynamic independent branch runs, without new three-scan recovery');
 }finally{release.forEach(x=>x.resolve());await Promise.all([a,b]);}
});

async function surfaceFixture(t){
 const f=await fixture(t),data={},nonce=crypto.randomUUID(),url='https://chatgpt.com/c/parallel-family';
 const top={id:'synthetic-extension',tab:{id:1},frameId:0,documentId:'synthetic-host',documentLifecycle:'active',url};
 const frame={id:top.id,tab:{id:1},frameId:2,documentId:'synthetic-frame',documentLifecycle:'active',url:'chrome-extension://'+top.id+'/ui/prompt-surface.html#'+nonce};
 const state={open:true,active:true,focused:true,url,generation:null,binding:{url,conversation:'/c/parallel-family',cycle:1,replyId:'reply-new',revision:1}},inserted=[];
 const api={runtime:{id:top.id,getURL:path=>'chrome-extension://'+top.id+'/'+path,sendMessage:async()=>{},getContexts:async()=>[{documentId:frame.documentId,tabId:1,windowId:1,frameId:2,documentUrl:frame.url,incognito:false}]},storage:{local:{get:async key=>({[key]:data[key]}),set:async value=>Object.assign(data,structuredClone(value))}},windows:{get:async()=>({focused:state.focused,incognito:false})},tabs:{get:async()=>({id:1,windowId:1,url:state.url,active:state.active,incognito:false}),query:async()=>[],sendMessage:async(_id,message)=>{
  if(message.type==='PAIA_PROMPT_SURFACE_PROBE')return {open:state.open,expanded:false,url:state.url,nonce,dragging:false,automaticSuggestion:true};
  if(message.type==='PAIA_PROMPT_NEXT_PROBE')return {authorization:state.generation,binding:state.binding,idle:true};
  if(message.type==='PAIA_PROMPT_NEXT_ACTIVITY')return {idle:true};
  if(message.type==='PAIA_PROMPT_NEXT_INSERT'){inserted.push(message.text);return {status:'inserted',verified:true};}return {};
 }}};
 const surface=new PromptSurfaceCommands(new PromptReuseCommands(f.service,api),api),next=new NextPromptCommands(f.service,api,surface);surface.next=next;
 state.generation=(await next.configure(true)).generation;
 assert.equal((await next.handle({type:'PAIA_PROMPT_NEXT_OFFER',binding:structuredClone(state.binding),authorization:state.generation,snapshot:{completed:true,text:'Next, ask me to explain sorting.',blocks:1,excluded:false}},top)).available,true);
 return {...f,query:f.single,state,next,surface,inserted,rpc:command=>surface.handle({type:'PAIA_PROMPT_SURFACE_RPC',nonce,command},frame)};
}


for(const boundary of ['one-use','navigation','reply-generation'])test('real Surface owners retain '+boundary+' after a fence replacement',{timeout:15000},async t=>{
 const f=await surfaceFixture(t),initial=projectionGate(t),hash=crypto.subtle.digest,freshEntered=deferred(),freshRelease=deferred();let calls=0;
 crypto.subtle.digest=async function(...args){const value=await hash.apply(this,args);if(new TextDecoder().decode(args[1])===JSON.stringify(['normal',text])&&++calls===2){freshEntered.resolve();await freshRelease.promise;}return value;};
 t.after(()=>{freshRelease.resolve();initial.restore();});const probe=reads(t),pending=Promise.allSettled([f.rpc({type:'PAIA_PROMPT_QUERY'}),f.rpc({type:'suggestion_current'})]);
 try{await bounded(initial.entered);await emptyDrain(f);initial.release();await bounded(freshEntered.promise);
  if(boundary==='navigation')f.state.url='https://chatgpt.com/c/changed-document';
  if(boundary==='reply-generation')f.state.binding.replyId='different-reply';
  freshRelease.resolve();const [query,suggestion]=await bounded(pending);assert.equal(probe.state.records,12,'both actual original RPCs use independent replacement scans after the discarded shared scan');
  if(boundary==='navigation'){assert.equal(query.status,'rejected');assert.equal(suggestion.status,'rejected');assert.deepEqual(f.inserted,[]);}
  else{
   assert.equal(query.status,'fulfilled');assert.deepEqual(query.value.items,f.single.items);assert.deepEqual(query.value.manualOrder,f.single.manualOrder);assert.equal(query.value.generation,f.single.generation);
   if(boundary==='reply-generation'){assert.ok(suggestion.status==='rejected'||suggestion.value.result===null);assert.deepEqual(f.inserted,[]);}
   else{assert.equal(suggestion.status,'fulfilled');assert.equal(suggestion.value.source,'local');assert.equal(suggestion.value.result.text,text);const command={type:'suggestion_insert',source:'local',id:suggestion.value.result.id,operationId:crypto.randomUUID(),conditionPresented:true};assert.deepEqual(await f.rpc(command),{status:'inserted',verified:true});await assert.rejects(f.rpc({...command,operationId:crypto.randomUUID()}));assert.deepEqual(f.inserted,[text]);}
  }
 }finally{initial.release();freshRelease.resolve();await pending;}
});
for(const phase of ['original-same-value','original-throws','fresh-second-write'])test('original run prelude records its own db accessor boundary: '+phase,{timeout:15000},async t=>{
 const f=await fixture(t,101),descriptor=Object.getOwnPropertyDescriptor(f.s.repository,'db'),before=await f.durable(),gate=phase==='fresh-second-write'?projectionGate(t):null,probe=reads(t);
 let installed=false,getters=0,stack=null,write=null,installedAt=null;
 f.hooks.get=caller=>{if(!installed&&!caller.includes('observeOriginalControlPublication')&&probe.state.records===(phase==='fresh-second-write'?402:200)){
  installed=true;installedAt=probe.state.records;Object.defineProperty(f.s.repository,'db',{configurable:true,enumerable:descriptor.enumerable,get(){getters++;stack=new Error().stack;Object.defineProperty(f.s.repository,'db',descriptor);write=f.s.repository.transaction(true,async()=>{});if(phase==='original-throws')throw new ArchiveError('MEMORY_STALE');return descriptor.value;}});
 }};
 const pending=pair(f);
 try{
  if(gate){await bounded(gate.entered);await emptyDrain(f);gate.release();}
  const values=await bounded(pending);await bounded(write);f.hooks.get=null;Object.defineProperty(f.s.repository,'db',descriptor);
  t.diagnostic(JSON.stringify({phase,installedAt,getters,stack,sourceReads:probe.state.records,statuses:values.map(v=>v.status),codes:values.map(v=>v.reason?.code??null)}));
  assert.equal(installed,true);assert.equal(getters,1);assert.match(stack,/ArchiveRepository\.open/);assert.match(stack,/indexed-store\.js/);assert.deepEqual(await f.durable(),before);
  if(phase==='original-same-value'){
   // This original-run getter executed before this service's callback/fact
   // gate. A same-value return is not an observed authority error. Only the
   // real empty write lost a fence, so a fresh original scan may still qualify.
   success(f,values);assert.equal(probe.state.records,606);
  }else{refused(values);assert.ok(probe.state.records<=606,'no recursive body scan after the actual original failure or second write');}
 }finally{f.hooks.get=null;Object.defineProperty(f.s.repository,'db',descriptor);gate?.release();await Promise.allSettled([pending,...(write?[write]:[])]);}
});

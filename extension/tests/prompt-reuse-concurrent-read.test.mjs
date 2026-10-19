import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBObjectStore} from './vendor/fake-indexeddb/build/esm/index.js';
import {completeFixture} from './harness/original-complete.mjs';
import {local} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {readAIMaintenanceFilterVisibility} from '../core/ai-usage/ai-filter-owner.js';
import {PromptReuseService} from '../core/prompt-reuse-service.js';
import {PromptReuseCommands} from '../background/prompt-reuse-commands.js';
import {PromptSurfaceCommands} from '../background/prompt-surface.js';
import {NextPromptCommands} from '../background/prompt-next.js';
import {ArchiveError} from '../core/constants.js';
import {ArchiveRepository} from '../core/idb-repository.js';

const text='Explain sorting',clock=()=>1800000000000;
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
async function fixture(t){
 const f=await completeFixture({texts:[text,text]});await f.s.finishFoundation();
 const service=new PromptReuseService(f.s,{clock}),query=await service.query();
 const family=query.items.find(x=>x.text===text);assert.ok(family);assert.equal(family.members.length,2);
 t.after(()=>f.s.repository.close());return {...f,service,query,family};
}
async function sourceReads(fn){
 const original=IDBObjectStore.prototype.get,counts={records:0,recordIndex:0};
 IDBObjectStore.prototype.get=function(...args){if(Object.hasOwn(counts,this.name))counts[this.name]++;return original.apply(this,args);};
 try{return {value:await fn(),counts};}finally{IDBObjectStore.prototype.get=original;}
}
function holdFirstPage(t,s){
 const original=s.run,started=deferred(),held=deferred();let pages=0;
 s.run=async function(...args){const value=await original.apply(this,args);if(value?.prefs&&Array.isArray(value.items)&&Object.hasOwn(value,'current')){pages++;if(pages===1){started.resolve();await held.promise;}}return value;};
 t.after(()=>{held.resolve();s.run=original;});return {started:started.promise,release:held.resolve,pages:()=>pages};
}
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
 return {...f,state,next,surface,inserted,rpc:command=>surface.handle({type:'PAIA_PROMPT_SURFACE_RPC',nonce,command},frame)};
}

test('concurrent original query and Family resolve read each Source only once per original snapshot',async t=>{
 const f=await fixture(t),single=await sourceReads(()=>f.service.query());
 const pair=await sourceReads(()=>Promise.all([f.service.query(),f.service.resolve(f.family)]));
 assert.deepEqual(pair.value[0],f.query);assert.deepEqual(pair.value[1],{id:f.family.id,text,generation:f.query.generation});
 t.diagnostic(JSON.stringify({single:single.counts,concurrent:pair.counts}));
 assert.deepEqual(pair.counts,single.counts,'overlapping original owners must not each rescan the same Sources');
});
test('settled results are never retained as a new-call body cache',async t=>{
 const f=await fixture(t),first=await sourceReads(()=>f.service.query()),second=await sourceReads(()=>f.service.query());
 assert.ok(first.counts.records>0);assert.deepEqual(second.counts,first.counts);assert.deepEqual(second.value,first.value);
});
test('concurrent query callers own independent result objects and manual order arrays',async t=>{
 const f=await fixture(t),[a,b]=await Promise.all([f.service.query(),f.service.query({includeHidden:true})]);
 assert.deepEqual(a,b);a.items[0].text='Synthetic caller-only mutation';a.items[0].members.length=0;a.manualOrder.push('synthetic');
 assert.deepEqual(b,f.query);assert.deepEqual(await f.service.query(),f.query);
});
test('a failed original Filter read is not retained or replaced with a successful caller result',async t=>{
 const f=await fixture(t),original=f.s.isFiltered;f.s.isFiltered=async()=>{throw new ArchiveError('MEMORY_DENIED');};
 try{const outcomes=await Promise.allSettled([f.service.query(),f.service.resolve(f.family)]);for(const x of outcomes){assert.equal(x.status,'rejected');assert.equal(x.reason.code,'MEMORY_DENIED');}}
 finally{f.s.isFiltered=original;}
 const recovered=await sourceReads(()=>f.service.query());assert.deepEqual(recovered.value,f.query);assert.ok(recovered.counts.records>0);
});
test('different original service owners never share result identity or reads',async t=>{
 const f=await fixture(t),other=new PromptReuseService(f.s,{clock}),single=await sourceReads(()=>f.service.query());
 const pair=await sourceReads(()=>Promise.all([f.service.query(),other.query()]));
 assert.deepEqual(pair.value,[f.query,f.query]);assert.equal(pair.counts.records,single.counts.records*2);assert.equal(pair.counts.recordIndex,single.counts.recordIndex*2);
});
test('a real canonical write during a held page rejects its old snapshot and preserves a fresh query',async t=>{
 const f=await fixture(t),held=holdFirstPage(t,f.s),pending=f.service.query(),refused=assert.rejects(pending,e=>e.code==='MEMORY_STALE');
 await held.started;await f.s.setFilterTask('idle');held.release();await refused;
 const fresh=await f.service.query(),{generation,...rest}=fresh,{generation:before,...prior}=f.query;
 assert.ok(generation>before);assert.deepEqual(rest,prior);
});
for(const boundary of ['database-reopen','repository-replacement','aborted-write'])test('same-generation '+boundary+' cannot join the earlier pending original read',{timeout:10000},async t=>{
 const f=await fixture(t),held=holdFirstPage(t,f.s),old=f.service.query();await held.started;
 if(boundary==='database-reopen'){await f.s.repository.close();await f.s.repository.open();}
 else if(boundary==='repository-replacement'){
  const prior=f.s.repository,next=new ArchiveRepository(f.storage,{indexedDB:f.indexedDB,ia:true,smartFilter:true,thoughtLibrary:true});await next.initialize();f.s.repository=next;t.after(()=>prior.close());
 }else await assert.rejects(f.s.repository.transaction(true,async()=>{throw new ArchiveError('STORAGE_FAILED');}));
 const current=await f.service.query();assert.deepEqual(current,f.query);assert.equal(held.pages(),2,'the new original owner must perform its own snapshot');
 held.release();await old;
});
test('original Family suggestion and query stay exactly compatible at the real surface owners',async t=>{
 const f=await surfaceFixture(t),single=await sourceReads(()=>f.service.query()),ready=deferred(),originalQuery=f.service.query,originalResolve=f.service.resolve;let entered=0,pair;
 // Synchronize only the two already-admitted real owners. Neither original
 // material qualification, its Store queue nor its transaction is replaced.
 const together=fn=>async function(...args){if(++entered===2)ready.resolve();await ready.promise;return fn.apply(this,args);};
 f.service.query=together(originalQuery);f.service.resolve=together(originalResolve);
 try{pair=await sourceReads(()=>Promise.all([f.rpc({type:'PAIA_PROMPT_QUERY'}),f.rpc({type:'suggestion_current'})]));}
 finally{f.service.query=originalQuery;f.service.resolve=originalResolve;}
 const [query,suggestion]=pair.value;
 assert.deepEqual(query.items,f.query.items);assert.deepEqual(query.manualOrder,f.query.manualOrder);assert.equal(query.generation,f.query.generation);
 assert.equal(suggestion.source,'local');assert.equal(suggestion.result.text,text);assert.equal(suggestion.result.kind,'SUGGESTION');
 const command={type:'suggestion_insert',source:'local',id:suggestion.result.id,operationId:crypto.randomUUID(),conditionPresented:true};
 assert.deepEqual(await f.rpc(command),{status:'inserted',verified:true});await assert.rejects(f.rpc({...command,operationId:crypto.randomUUID()}));assert.deepEqual(f.inserted,[text]);
 t.diagnostic(JSON.stringify({single:single.counts,surfaceConcurrent:pair.counts}));
 assert.deepEqual(pair.counts,single.counts,'the two actual surface owners must share only their safe overlapping original scan');
});
test('independently admitted real surface RPCs can reuse their actually overlapping original scan',{timeout:2000},async t=>{
 const f=await surfaceFixture(t),single=await sourceReads(()=>f.service.query()),hash=crypto.subtle.digest,query=f.service.query,resolve=f.service.resolve,held=deferred(),release=deferred(),entered=deferred(),order=[];let first=true;
 // Observe the original entries, without a rendezvous or a delayed entry.
 f.service.query=function(...args){order.push('query');if(order.length===2)entered.resolve();return query.apply(this,args);};
 f.service.resolve=function(...args){order.push('resolve');if(order.length===2)entered.resolve();return resolve.apply(this,args);};
 crypto.subtle.digest=async function(algorithm,bytes){const value=await hash.call(this,algorithm,bytes);if(first&&new TextDecoder().decode(bytes)===JSON.stringify(['normal',text])){first=false;held.resolve();await release.promise;}return value;};
 t.after(()=>{release.resolve();crypto.subtle.digest=hash;f.service.query=query;f.service.resolve=resolve;});
 let independentlyCompleted=false,independentlyCompletedBeforeRelease=false;
 const pair=await sourceReads(async()=>{
  const a=f.rpc({type:'PAIA_PROMPT_QUERY'}),b=f.rpc({type:'suggestion_current'}),done=Promise.race([a,b]).then(()=>{independentlyCompleted=true;});
  await held.promise;await entered.promise;let timer;await Promise.race([done,new Promise(r=>{timer=setTimeout(r,150);})]);clearTimeout(timer);independentlyCompletedBeforeRelease=independentlyCompleted;release.resolve();return Promise.all([a,b]);
 });
 assert.deepEqual(pair.value[0].items,f.query.items);assert.equal(pair.value[1].result.text,text);
 t.diagnostic(JSON.stringify({entryOrder:order,independentlyCompletedBeforeRelease,single:single.counts,actualRPCPair:pair.counts}));
 assert.deepEqual(pair.counts,single.counts,'real asynchronous target guards must not make the optimization work only for synchronized service calls');
});
for(const change of ['frame-close','navigation','consent'])test('both original surface readers refuse a held body after '+change,async t=>{
 const f=await surfaceFixture(t),held=holdFirstPage(t,f.s),query=f.rpc({type:'PAIA_PROMPT_QUERY'}),suggestion=f.rpc({type:'suggestion_current'});
 const outcomes=Promise.allSettled([query,suggestion]);await held.started;
 if(change==='frame-close')f.state.open=false;
 else if(change==='navigation')f.state.url='https://chatgpt.com/c/new-document';
 else await f.s.write(async tx=>{const control=await f.s.control(tx);control.settings.consentVersion=0;control.settings.enabled=false;control.settings.epoch++;await f.s.saveControl(tx,control);});
 held.release();for(const x of await outcomes)assert.equal(x.status,'rejected');assert.deepEqual(f.inserted,[]);
});
test('revoking only the Family opportunity does not cancel an independent valid original query',async t=>{
 const f=await surfaceFixture(t),held=holdFirstPage(t,f.s),query=f.rpc({type:'PAIA_PROMPT_QUERY'}),suggestion=f.rpc({type:'suggestion_current'}),outcomes=Promise.allSettled([query,suggestion]);
 await held.started;await f.next.configure(false);held.release();const [q,s]=await outcomes;
 assert.equal(q.status,'fulfilled');assert.deepEqual(q.value.items,f.query.items);
 assert.ok(s.status==='rejected'||s.value.result===null);assert.deepEqual(f.inserted,[]);
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
test('same-generation AI visibility revocation requires a fresh independent original query while the older read is held',{timeout:10000},async t=>{
 const f=await filterFixture(t),before=await f.generation(),held=holdFirstPage(t,f.s),old=f.service.query();await held.started;
 f.revoke();assert.equal(await f.generation(),before,'the original permission revocation has no canonical write');
 // The second owner must finish while the old one remains held. Joining the
 // old body would both deadlock this ordering and hide newly visible Inputs.
 const current=await f.service.query();assert.equal(current.generation,before);assert.ok(current.items.some(x=>x.text==='然后'));
 held.release();assert.ok(!(await old).items.some(x=>x.text==='然后'));assert.equal(held.pages(),2);
});

for(const change of ['none','visibility-revoked','first-projection-failed'])test('a real dynamic Filter wakes its original waiting reader before the first projection settles: '+change,{timeout:2000},async t=>{
 const f=await filterFixture(t,{extraStatic:true}),before=await f.generation(),original=crypto.subtle.digest,started=deferred(),release=deferred();let first=true,completed=false;
 crypto.subtle.digest=async function(algorithm,bytes){
  if(first&&new TextDecoder().decode(bytes).startsWith('["normal",')){
   first=false;if(change==='visibility-revoked')f.revoke();started.resolve();
   await release.promise;if(change==='first-projection-failed')throw new ArchiveError('STORAGE_FAILED');
  }
  return original.call(this,algorithm,bytes);
 };
 t.after(()=>{release.resolve();crypto.subtle.digest=original;});
 const firstResult=Promise.allSettled([f.service.query()]),waiting=f.service.query().then(value=>{completed=true;return value;}),waitingResult=Promise.allSettled([waiting]);
 await started.promise;const heldAt=performance.now();
 // The timeout is only the RED-control deadline. Always release and settle
 // both actual owners before asserting, so a failure cannot leave test work.
 let timer;await Promise.race([waitingResult,new Promise(resolve=>{timer=setTimeout(resolve,150);})]);clearTimeout(timer);
 const completedBeforeRelease=completed,heldMs=performance.now()-heldAt;let lateReads=null;
 if(completedBeforeRelease&&change==='none'){
  const count=async fn=>{const get=IDBObjectStore.prototype.get,counts={meta:0,records:0,recordIndex:0};IDBObjectStore.prototype.get=function(...args){if(Object.hasOwn(counts,this.name))counts[this.name]++;return get.apply(this,args);};try{await fn();return counts;}finally{IDBObjectStore.prototype.get=get;}};
  lateReads={original:await count(()=>f.service.snapshot()),late:await count(()=>f.service.query())};
 }
 release.resolve();const [a]=await firstResult,[b]=await waitingResult;
 t.diagnostic(JSON.stringify({change,firstProjectionHeld:true,completedBeforeRelease,heldMs,firstStatus:a.status,waitingStatus:b.status}));
 assert.equal(b.status,'fulfilled');assert.equal(await f.generation(),before);
 assert.equal(b.value.items.some(x=>x.text==='然后'),change==='visibility-revoked');
 assert.equal(a.status,change==='first-projection-failed'?'rejected':'fulfilled');
 if(lateReads)assert.deepEqual(lateReads.late,lateReads.original,'an already-declined still-pending slot sends late callers directly through their original independent work');
 const view=await f.service.nextFamilyView();assert.equal(view.available,true);
 assert.deepEqual(view.items.map(x=>({id:x.id,text:x.text})),b.value.items.map(x=>({id:x.id,text:x.text})),'the later original query owns the view even when the first query finishes last');
 const fresh=await sourceReads(()=>f.service.query());assert.deepEqual(fresh.value,b.value);assert.ok(fresh.counts.records>0,'after original settlement a new call still performs its own Source read');
 assert.equal(completedBeforeRelease,true,'an observed dynamic dependency must wake the waiter into its own original scan without waiting for the first projection');
});

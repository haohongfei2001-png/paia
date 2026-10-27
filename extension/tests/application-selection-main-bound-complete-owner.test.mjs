import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBObjectStore} from './vendor/fake-indexeddb/build/esm/index.js';
import {mainBoundSelectionTailComposition} from './harness/main-bound-selection-tail-composition.mjs';

// NEW main-bound original-owner closure after the exact runtime integration.
// This is not the historical two-capture capacity fixture. One action only;
// every failure is retained and no private brand, result or receipt is supplied.
test('main-bound original owners complete one prepaid tail through actual empty-inventory adapter and retirement',async t=>{
 let f,settled,terminalSettled=false,heldAccounting=null,heldMarkers=null,outcome=null,armed=false;
 const traces=[],byTransaction=new WeakMap(),restorers=[],commits=[];
 const traceFor=tx=>{let trace=byTransaction.get(tx);if(!trace){trace={database:tx.db.name,mode:tx.mode,reads:[],writes:[],committed:false};byTransaction.set(tx,trace);traces.push(trace);tx.addEventListener('complete',()=>{trace.committed=true;},{once:true});}return trace;};
 for(const method of ['get','getAllKeys','getAll','openCursor','openKeyCursor','put','count']){
  const descriptor=Object.getOwnPropertyDescriptor(IDBObjectStore.prototype,method),original=descriptor.value;
  Object.defineProperty(IDBObjectStore.prototype,method,{...descriptor,value:function(...args){
   const request=Reflect.apply(original,this,args);
   if(!armed||!f||this.transaction.mode!=='readwrite'||![f.store.repository.name,f.seed.b.repository.name].includes(this.transaction.db.name))return request;
   const trace=traceFor(this.transaction),table=this.name;
   if(method==='put'){
    const value=args[0];trace.writes.push({table,id:value?.id,phase:value?.phase,role:value?.role});
    if(table==='meta'&&value?.id==='application-generation-selection:v1')this.transaction.addEventListener('complete',()=>commits.push({phase:value.phase,role:value.role,accounting:f.accounting()}),{once:true});
   }else{
    const q=args[0],query=q&&typeof q==='object'&&'lower'in q?{lower:q.lower,upper:q.upper,lowerOpen:q.lowerOpen,upperOpen:q.upperOpen}:q;
    const read={method,table,keyPath:this.keyPath,query,limit:args[1]??null,results:[]};trace.reads.push(read);
    request.addEventListener('success',()=>{const raw=request.result;read.results.push(method==='getAll'?{rows:structuredClone(raw)}:method==='getAllKeys'?{keys:structuredClone(raw)}:method==='count'?{count:raw}:method==='get'?{id:raw?.id??null}:{key:raw?.key??null,primaryKey:raw?.primaryKey??null});});
    request.addEventListener('error',()=>{read.error=request.error?.name??'unknown';},{once:true});
   }return request;
  }});restorers.push(()=>Object.defineProperty(IDBObjectStore.prototype,method,descriptor));
 }
 t.after(()=>{for(const restore of restorers.reverse())restore();});
 const errorView=error=>error?{name:error.name,code:error.code??null,message:error.message,stack:error.stack}:null;
 try{
  f=await mainBoundSelectionTailComposition(t,{minimalSource:true});
  assert.equal(f.preparation.state,'review-ready');
  assert.equal(f.resume.needsContextEnrollment,false);
  assert.equal(f.resume.needsPromptEnrollment,false);
  assert.equal(f.accounting(),null);
  assert.equal(f.baseline.source.records.length,1);
  assert.equal(f.baseline.source.blocks.length,1);
  assert.equal(f.baseline.source.inputStates.length,1);
  assert.equal(f.baseline.target.records.length,1);
  assert.equal(f.baseline.target.blocks.length,1);
  assert.equal(f.baseline.target.inputStates.length,1);

  // The local entry does not change the RPC gate. Production, ordinary and
  // deprecated generic construction cannot request the injected entry.
  await assert.rejects(f.invoke('PAIA_GENERATION_ACTIVATE'),{code:'GENERATION_EDITOR_PROTECTION_REQUIRED'});
  const options=()=>({activity:f.commands.createApplicationWorkerActivity(),isolated:async()=>{},ready:async()=>{},lifecycle:()=>f.lifecycle});
  const ordinary=f.commands.createOrdinaryApplicationSelectionCommands(f.api,options());
  const production=f.commands.createProductionApplicationSelectionCommands(options());
  assert.equal(Object.hasOwn(ordinary,'localCompositionActivate'),false);
  assert.equal(Object.hasOwn(production,'localCompositionActivate'),false);
  assert.throws(()=>f.commands.createOrdinaryApplicationSelectionCommands(f.api,{...options(),localComposition:true}),{code:'GENERATION_SELECTION_CAPABILITY'});
  assert.throws(()=>f.commands.createApplicationSelectionCommands(f.api,{...options(),localComposition:true}),{code:'GENERATION_SELECTION_CAPABILITY'});
  assert.throws(()=>f.commands.createProductionApplicationSelectionCommands({...options(),localComposition:true}),{code:'GENERATION_SELECTION_CAPABILITY'});
  assert.throws(()=>f.commands.bindOriginalApplicationSelectionCoordinator(ordinary,f.coordinator),{code:'GENERATION_SELECTION_CAPABILITY'});
  assert.equal(f.accounting(),null);
  assert.equal(f.sdk.sets.length,0);
  ordinary.close();production.close();

  armed=true;const accepted=f.activate();
  settled=accepted.then(value=>{terminalSettled=true;return {ok:true,value};},error=>{terminalSettled=true;return {ok:false,error};});
  const first=await Promise.race([f.sdk.accepted.promise.then(()=>({atSDK:true})),settled.then(value=>({atSDK:false,outcome:value}))]);
  if(!first.atSDK){outcome=first.outcome;if(!outcome.ok)throw outcome.error;assert.fail('original action resolved without its one SDK dispatch');}
  heldAccounting=f.accounting();heldMarkers=await f.markers();
  assert.equal(terminalSettled,false,'actual write alone is not SDK-promise settlement');
  assert.equal(f.sdk.sets.length,1);
  assert.equal(heldAccounting.phase,'dispatch-ready');
  assert.equal(heldAccounting.deadline-heldAccounting.started,30000);
  assert.equal(heldAccounting.runDone,false);
  assert.equal(heldAccounting.retired,false);
  assert.equal(heldAccounting.retirementPrepaid,true);
  assert.equal(heldAccounting.retirementConsumed,false);
  assert.equal(heldAccounting.cleanup.attempted,false);
  assert.equal(heldAccounting.receiptConsumed,false);
  assert.ok(heldAccounting.pending>0);
  assert.ok(heldAccounting.tail.reservedReferences>0);
  assert.ok(heldAccounting.tail.reservedBytes>0);
  assert.equal(heldAccounting.tail.consumed,false);
  assert.equal(heldMarkers.source.phase,'dispatched');
  assert.equal(heldMarkers.target.phase,'dispatched');
  assert.equal(heldMarkers.source.operationId,heldMarkers.target.operationId);
  assert.ok(heldMarkers.reservation);
  assert.deepEqual(f.data.personalAIArchive,f.sdk.sets[0].personalAIArchive);
  assert.notDeepEqual(f.data.personalAIArchive,f.baseline.local);
  assert.equal(f.page.isFrozen(),true);
  assert.equal(f.editor.blocksMutation(f.sender),true);
  for(const type of ['PREPARE','FROZEN','CHECK','CHECKED'])assert.ok(f.editorTrace.some(message=>message.type===type),'original editor protocol '+type);
  assert.ok(f.pageState.prepares>0&&f.pageState.checks>0);
  assert.ok(f.top.trace.some(event=>event.kind==='top-to-worker'&&event.message.type==='PAIA_PROMPT_INSERTION_RECEIVER_REGISTER'),'actual original top registration');
  assert.equal(f.top.trace.filter(event=>event.kind==='top-to-worker'&&event.message.type==='PAIA_PROMPT_INSERTION_RECONCILE').length,0,'original-empty-inventory profile registers without inventing receipt reconciliation');
  for(const type of ['PAIA_PROMPT_INSERTION_DOCUMENT_HOLD','PAIA_PROMPT_INSERTION_DOCUMENT_FENCE'])assert.ok(f.top.trace.some(event=>event.kind==='top-reply'&&event.type===type&&event.result?.held===true),'actual original top reply '+type);
  assert.match(f.top.adapterProvenance.sha256,/^[a-f0-9]{64}$/);
  assert.equal(f.top.adapterProvenance.completeSource,true);
  assert.equal(f.top.adapterProvenance.sourceTransforms,false);
  for(const event of f.top.trace.filter(event=>event.kind==='top-reply'&&['PAIA_PROMPT_INSERTION_DOCUMENT_HOLD','PAIA_PROMPT_INSERTION_DOCUMENT_FENCE'].includes(event.type)))assert.equal(event.result?.profile,'original-empty-inventory-v1');
  assert.equal(f.top.draft.data,f.top.initialDraft);
  const blockedInput=new Event('beforeinput',{cancelable:true});f.pageDocument.dispatchEvent(blockedInput);assert.equal(blockedInput.defaultPrevented,true);

  f.releaseSDK();outcome=await settled;armed=false;
  if(!outcome.ok)throw outcome.error;
  const result=outcome.value,final=f.accounting(),markers=await f.markers();
  assert.equal(result.state,'selected');
  assert.equal(result.wholeArchiveComplete,false);
  assert.equal(result.productionActivation,false);
  assert.equal(result.priorLibraryRetained,true);
  assert.equal(result.operationId,heldMarkers.source.operationId);
  assert.equal(markers.source.phase,'selected');
  assert.equal(markers.source.operationId,result.operationId);
  assert.equal(markers.target,null);
  assert.equal(markers.reservation,null);
  assert.equal(final.phase,'terminal');
  assert.equal(final.started,heldAccounting.started);
  assert.equal(final.deadline,heldAccounting.deadline);
  assert.equal(final.invalid,false);
  assert.equal(final.budgetFailed,false);
  assert.equal(final.accountingUnconfirmed,false);
  assert.equal(final.unobservable,false);
  assert.equal(final.pending,0);
  assert.equal(final.memberPending,0);
  assert.equal(final.runDone,true);
  assert.equal(final.settled,true);
  assert.equal(final.retired,true);
  assert.equal(final.retirementPrepaid,true);
  assert.equal(final.retirementConsumed,true);
  assert.deepEqual(final.cleanup,{attempted:true,entrySettled:true,reviewInvalidated:true,portalRetired:true,complete:true});
  assert.equal(final.costAttribution['retirement-prepaid'].references,5);
  assert.equal(final.receiptConsumed,true);
  assert.equal(final.tail.consumed,true);
  assert.equal(final.tail.reservedReferences,heldAccounting.tail.reservedReferences);
  assert.equal(final.tail.reservedBytes,heldAccounting.tail.reservedBytes);
  assert.ok(final.references<=4096&&final.bytes<=2*1024*1024);
  assert.ok(final.references>heldAccounting.references&&final.bytes>heldAccounting.bytes);
  assert.ok(final.references-heldAccounting.references<=final.tail.reservedReferences);
  assert.ok(final.bytes-heldAccounting.bytes<=final.tail.reservedBytes);
  for(const origin of ['driver','tail-plan','repository:source','repository:target','repository:registry'])assert.ok(final.costAttribution[origin]?.references>0,'same-action attribution '+origin);
  assert.equal(f.sdk.sets.length,1);
  const matching=f.sdk.gets.filter(raw=>JSON.stringify(raw)===JSON.stringify(f.sdk.sets[0]));
  assert.ok(matching.length>=2,'both original observe and finish fully read back the original SDK payload');
  assert.deepEqual(f.data.personalAIArchive,f.sdk.sets[0].personalAIArchive);
  assert.deepEqual(await f.content(f.store.repository),f.baseline.source);
  assert.deepEqual(await f.content(f.seed.b.repository),f.baseline.target);
  assert.equal(f.externalRequests(),0);
  assert.equal(f.counters.native,0);
  assert.ok(f.counters.script>=6,'three actual original inventory sweeps use top/exact-document probes');
  assert.equal(f.counters.script,f.top.trace.filter(event=>event.kind==='probe').length);
  assert.equal(f.top.draft.data,f.top.initialDraft);
  const prepared=commits.filter(row=>row.phase==='prepared');assert.equal(prepared.length,2);
  for(const role of ['source','target'])assert.ok(prepared.some(row=>row.role===role));
  const canonical='canonical-generation:',rangeReads=traces.flatMap(row=>row.reads).filter(row=>row.query&&typeof row.query==='object'&&Object.hasOwn(row.query,'lower'));
  const canonicalReads=rangeReads.filter(row=>row.table==='meta'&&row.query.lower===canonical&&row.query.upper===canonical+'\uffff');
  assert.ok(canonicalReads.some(row=>row.method==='getAll'),'original fresh canonical inventories actually use complete native row pages');
  assert.equal(canonicalReads.filter(row=>row.method==='getAllKeys').length,0,'verified inline-id object stores do not re-read a redundant key array');
  assert.ok(canonicalReads.some(row=>row.method==='count'),'original native canonical count remains');
  for(const read of rangeReads.filter(row=>row.method==='getAll')){
   assert.equal(read.keyPath,'id');assert.ok(Number.isSafeInteger(read.limit)&&read.limit>0&&read.limit<=100);
   for(const batch of read.results){assert.ok(Array.isArray(batch.rows)&&batch.rows.length<=read.limit);for(const row of batch.rows)assert.equal(typeof Object.getOwnPropertyDescriptor(row,'id')?.value,'string');}
  }
  for(const repository of [f.store.repository,f.seed.b.repository]){
   const preparedTrace=traces.find(row=>row.database===repository.name&&row.writes.some(value=>value.phase==='prepared'));
   assert.ok(preparedTrace?.committed);
   const scanned=new Set(preparedTrace.reads.filter(row=>row.method==='openCursor'||row.method==='getAll'&&row.query?.lower==='').map(row=>row.table));
   assert.deepEqual([...scanned].sort(),[...repository.stores].sort(),'full original table CAS still observes every table');
  }
  // This is a numeric observation, not another receipt consumer or activation.
  assert.deepEqual(f.accounting(),final);
  t.diagnostic('MAIN_BOUND_COMPLETE_OWNER '+JSON.stringify({scope:'NEW main-bound minimal complete original-owner local composition; original-empty-inventory-v1 adapter; not main regression or production/platform qualification',result,commits,traces,heldAccounting,finalAccounting:final,heldMarkers,finalMarkers:markers,sdkEvents:f.sdk.events,sdkSets:f.sdk.sets.length,matchingReadbacks:matching.length,editorTrace:f.editorTrace,topTrace:f.top.trace,adapterProvenance:f.top.adapterProvenance,providerRequests:f.externalRequests()}));
 }catch(error){
  let markers=null,markerReadError=null;
  if(f)try{markers=await f.markers();}catch(reason){markerReadError=errorView(reason);}
  t.diagnostic('MAIN_BOUND_COMPLETE_OWNER_FIRST_FAILURE '+JSON.stringify({scope:'NEW main-bound complete owner first failure; no retry',error:errorView(error),commits,traces,heldAccounting,accounting:f?.accounting()??null,heldMarkers,markers,markerReadError,sdkEvents:f?.sdk.events??[],sdkSets:f?.sdk.sets.length??0,editorTrace:f?.editorTrace??[],topTrace:f?.top.trace??[],adapterProvenance:f?.top.adapterProvenance??null,providerRequests:f?.externalRequests()??0}));
  throw error;
 }finally{
  armed=false;f?.releaseSDK();
  // Always let the accepted synthetic SDK promise settle. No retry and no
  // claim that a deadline/exception released the original retained holds.
  if(settled)await settled;
 }
});

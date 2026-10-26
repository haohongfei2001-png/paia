import test from 'node:test';
import assert from 'node:assert/strict';
import {formationFixture,runFormation,rows,raw,op,topic,parameters} from './harness/topic-03.mjs';
import {MaintenanceProcessingCommands,configureMaintenanceProcessingSource,configuredMaintenanceTopicIdentityProcessing} from '../background/maintenance-processing-commands.js';
import {createConfiguredMaintenanceSession} from '../core/ai-usage/configured-maintenance-session.js';
import {captureMaintenanceIdentityLifecycleSelection,readMaintenanceLifecycleSelection} from '../core/ai-usage/local-maintenance-session.js';
import {createTopicIdentityLifecycleDispatch,TOPIC_IDENTITY_LIFECYCLE_POLICY} from '../core/ai-usage/topic-identity-source-processing.js';
import {createTopicIdentityProcessingGrant} from '../core/ai-usage/topic-identity-processing-grant.js';
import {readMaintenanceServiceConfiguration} from '../core/ai-usage/maintenance-service-configuration.js';
import {advanceThoughtTopicIndex} from '../core/thought-read-index.js';
import {descriptorReader} from '../core/organizer/topic-reading.js';
import {OrganizerStore} from '../core/organizer/store.js';
import {readOriginalRecoveryTransactionWork,remainingOriginalRecoveryWork,chargeOriginalRecoveryWork} from '../core/idb-repository.js';

// No service fixture, signed transport, provider, worker or runner is executed.
// Only the original configured selector, Settings consent and local identity
// consumer run over fresh synthetic records in the fake IDB implementation.
async function fixture(t,{enabled=true,kind='section',cold=false}={}){
 const f=await formationFixture();t.after(()=>f.s.repository.close());f.s.clock=()=> '2026-01-01T00:00:00.000Z';
 for(const row of await rows(f.s,'recordIndex'))await f.s.changeRecord(row.id,r=>{r.sourceSentAt='2026-01-01T00:00:00.000Z';});await runFormation(f);
 let selected=(await rows(f.s,'topics'))[0];const entry=(await rows(f.s,'thoughts'))[0],placement=(await rows(f.s,'placements'))[0];
 await f.s.placeEntry({topicId:selected.id,entryId:entry.id,expectedEntryRevision:entry.revision,expectedTopicRevision:selected.organizationRevision,expectedPlacementRevision:placement.revision,operationId:op()});
 const section=(await rows(f.s,'sections'))[0];if(kind==='section')await f.s.editSection({topicId:selected.id,sectionId:section.sectionId,expectedRevision:section.revision,title:'SYNTHETIC selected section',operationId:op()});else if(kind==='topic'){selected=await raw(f.s,'topics',selected.id);await f.s.renameTopic({id:selected.id,expectedRevision:selected.revision,name:'SYNTHETIC selected rename',operationId:op()});}
 // Complete the real original activity projection before opening a fresh worker.
 let projected;do{projected=await advanceThoughtTopicIndex(f.s,{topicId:selected.id,describe:descriptorReader(f.s)});}while(projected.pending);
 if(cold){await f.s.repository.close();f.s=new OrganizerStore(f.storage,{indexedDB:f.indexedDB,clock:()=> '2026-01-01T00:00:00.000Z'});}
 const caller=Object.freeze({id:op()}),url='chrome-extension://synthetic/ui/archive.html',sender={id:'synthetic',frameId:0,documentId:'synthetic-document',documentLifecycle:'active',url,tab:{id:4,windowId:2,incognito:false}},api={runtime:{id:'synthetic',getURL:p=>'chrome-extension://synthetic/'+p,getContexts:async()=>[{contextType:'TAB',tabId:4,windowId:2,frameId:0,documentId:sender.documentId,documentUrl:url,incognito:false}]},tabs:{get:async()=>({id:4,windowId:2,incognito:false,url}),onRemoved:{addListener(){}},onUpdated:{addListener(){}}}};
 const commands=new MaintenanceProcessingCommands(f.s,api),configure=async enabled=>{const state=await commands.handle({type:'PAIA_MAINTENANCE_PROCESSING_STATUS'},sender);return commands.handle({type:'PAIA_MAINTENANCE_PROCESSING_CONFIGURE',enabled,expectedGeneration:state.generation,consentVersion:1,confirmed:true},sender);};if(enabled)await configure(true);
 let live=true,listener=null,physical=0;const deny=()=>{physical++;throw Error('No service/provider execution in this local control');};
 const service={version:1,topic:{decisionVersion:'synthetic-identity-1',parameters,resolveProcessing:deny},context:{caller,processingVerifier:{verify:deny,isCurrent:()=>false}}};
 const configuration=configureMaintenanceProcessingSource(commands,f.s,{origin:'https://synthetic.invalid',scope:'synthetic-source-identity',contractVersion:'synthetic-1',routeVersion:'synthetic-1',service,processing:null,clock:Date.now,resolveAuthority:async(_t,r)=>({allowed:live,consentEpoch:'synthetic-consent',principalId:'synthetic',libraryId:'synthetic-library',jobTypes:['AI_MAINTENANCE'],scope:{evidenceKeys:r.evidenceKeys,coverage:r.coverage}}),isCurrent:()=>live,onInvalidate:fn=>{listener=fn;return ()=>{listener=null;};},readProfile:deny,currentProfile:()=>null,tokenize:deny,isCurrentTokenizer:()=>false,readProofs:deny,fetch:deny});
 const session=createConfiguredMaintenanceSession(f.s,configuration);t.after(()=>session.dispose());assert.equal(session.available(),true);
 const options={scope:configuration.scope,contractVersion:configuration.contractVersion,routeVersion:configuration.routeVersion,cursor:'aiu:delta:pending:'+JSON.stringify(['placement',placement.id])};
 return {...f,selected,entry,section,configuration,commands,api,sender,caller,session,options,configure,physical:()=>physical,revoke:()=>{live=false;listener?.();},project:async()=>{let status;do{status=await advanceThoughtTopicIndex(f.s,{topicId:selected.id,describe:descriptorReader(f.s)});}while(status.pending);}};
}
const now=Date.parse('2026-10-01T00:00:00Z');

// New .55.16 convergence controls only. The historical suites are not imported
// or rerun. Every case owns fresh synthetic storage and one invocation ticket.
function observeTransactions(f){
 const repository=f.s.repository,original=repository.transaction,seen=[];
 repository.transaction=function(write,fn,...args){return original.call(this,write,async t=>{seen.push({write,ticket:readOriginalRecoveryTransactionWork(repository,t)});return fn(t);},...args);};
 return {seen,stop:()=>{repository.transaction=original;}};
}

test('PT08 main binding: cold original source preparation and lifecycle share one ticket through final receipt',async t=>{
 const f=await fixture(t,{cold:true}),observed=observeTransactions(f);t.after(observed.stop);
 const handle=await f.session.prepare(f.options),ticket=observed.seen.find(x=>x.ticket)?.ticket;
 assert.ok(ticket,'real preparation must expose an original physical ticket');
 const beforeMs=remainingOriginalRecoveryWork(f.s.repository,ticket),prepareCount=observed.seen.length;
 const result=await createTopicIdentityLifecycleDispatch(f.session,f.s,handle).run({now});
 assert.equal(result.items.length,1);assert.equal(result.items[0].state,'settled');assert.equal(result.items[0].result.lifecycle,'dormant');
 assert.ok(observed.seen.length>prepareCount);assert.ok(observed.seen.some(x=>x.write));
 assert.ok(observed.seen.every(x=>x.ticket===ticket),'no read, initialization prelude or write borrows/loses the original ticket');
 assert.ok(remainingOriginalRecoveryWork(f.s.repository,ticket)<=beforeMs,'the original first deadline is not renewed');
 observed.stop();
 const lifecycleReceipts=(await rows(f.s,'operationReceipts')).filter(r=>r.id.startsWith('topic-activity:'));
 assert.equal(lifecycleReceipts.length,1);assert.equal(lifecycleReceipts[0].result.id,f.selected.id);assert.equal(lifecycleReceipts[0].result.lifecycle,'dormant');
 assert.equal((await raw(f.s,'topics',f.selected.id)).lifecycle,'dormant');assert.equal(f.physical(),0);
 console.log(JSON.stringify({control:'same-ticket',transactions:observed.seen.length,prepareTransactions:prepareCount,physicalProviders:f.physical(),lifecycleReceipts:lifecycleReceipts.length}));
});

test('PT08 main binding: original consumed allowance refuses dispatch without minting a replacement ticket',async t=>{
 const f=await fixture(t),observed=observeTransactions(f);t.after(observed.stop);
 const handle=await f.session.prepare(f.options),ticket=observed.seen.find(x=>x.ticket)?.ticket;assert.ok(ticket);
 observed.stop();const before=await raw(f.s,'topics',f.selected.id),receiptsBefore=(await rows(f.s,'operationReceipts')).length;
 assert.throws(()=>chargeOriginalRecoveryWork(f.s.repository,ticket,2*1024*1024),{code:'BNS_GROUP_RESOURCE_LIMIT'});
 await assert.rejects(async()=>createTopicIdentityLifecycleDispatch(f.session,f.s,handle).run({now}),{code:'BNS_GROUP_RESOURCE_LIMIT'});
 assert.deepEqual(await raw(f.s,'topics',f.selected.id),before);assert.equal((await rows(f.s,'operationReceipts')).length,receiptsBefore);assert.equal(f.physical(),0);
 console.log(JSON.stringify({control:'consumed-original-allowance',dispatchAttempts:1,physicalProviders:f.physical(),mutation:false}));
});

test('PT08 main binding: unrelated ordinary Store read and competing dispatcher cannot adopt or poison active lifecycle ticket',async t=>{
 const f=await fixture(t),observed=observeTransactions(f);t.after(observed.stop);
 const handle=await f.session.prepare(f.options),ticket=observed.seen.find(x=>x.ticket)?.ticket;assert.ok(ticket);observed.stop();
 const first=createTopicIdentityLifecycleDispatch(f.session,f.s,handle),second=createTopicIdentityLifecycleDispatch(f.session,f.s,handle),original=f.s.operation;
 let release,entered;const held=new Promise(resolve=>{entered=resolve;}),gate=new Promise(resolve=>{release=resolve;});
 f.s.operation=async function(request,fn,options){if(request.to==='dormant'){assert.equal(options.recoveryWork,ticket);entered();await gate;}return original.call(this,request,fn,options);};
 const pending=first.run({now});pending.catch(()=>{});
 try{
  await Promise.race([held,pending.then(()=>{throw Error('Lifecycle did not enter its original operation');})]);
  await assert.rejects(second.run({now}),{code:'REQUEST_ALREADY_IN_FLIGHT'});
  const ordinary=await f.s.run(()=>f.s.repository.transaction(false,async tx=>{assert.equal(readOriginalRecoveryTransactionWork(f.s.repository,tx),null,'ordinary Store execution cannot borrow the lifecycle window');return tx.get('meta','thought-library');},['meta']));assert.ok(ordinary);
  release();const result=await pending;assert.equal(result.items[0].result.lifecycle,'dormant');assert.equal(f.physical(),0);
  console.log(JSON.stringify({control:'ordinary-isolation',ordinaryTicket:null,competingDispatcher:'REQUEST_ALREADY_IN_FLIGHT',originalResult:result.items[0].state,physicalProviders:f.physical()}));
 }finally{release();f.s.operation=original;await pending.catch(()=>{});}
});

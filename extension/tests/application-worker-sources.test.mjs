import test from 'node:test';
import assert from 'node:assert/strict';
import {assistServiceFixture} from '../../services/ai-gateway/tests/assist-client-fixture.mjs';
import {maintenanceServiceFixture} from '../../services/ai-gateway/tests/maintenance-client-fixture.mjs';
import {setup} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {SafetyRunner} from '../core/thought-runner.js';
import {LibraryRunner} from '../core/library-runner.js';
import {FilterRunner} from '../core/filter-runner.js';
import {PromptReuseService} from '../core/prompt-reuse-service.js';
import {LocalAssistSession} from '../core/ai-usage/local-assist-session.js';
import {createMaintenanceRunner} from '../core/ai-usage/maintenance-runner.js';
import {ContextConnections,CONTEXT_CONNECTION_KEY} from '../background/context-connections.js';
import {AssistPromptCommands} from '../background/prompt-assist.js';
import {NextPromptCommands} from '../background/prompt-next.js';
import {PromptReuseCommands} from '../background/prompt-reuse-commands.js';
import {PromptSurfaceCommands} from '../background/prompt-surface.js';
import {createApplicationWorkerCoordination} from '../background/application-worker-coordination.js';

// Genuine original classes over fake IndexedDB and original signed service
// fixtures. All HTTPS and SQL are synthetic protocol models. No browser, native
// listener, live account, physical provider or production configuration is used.
const deferred=()=>{let resolve;return {promise:new Promise(r=>{resolve=r;}),resolve:()=>resolve()};};
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const caught=promise=>promise.then(value=>({value}),error=>({error}));
const metadata=s=>s.repository.transaction(false,t=>t.all('meta'),['meta']);
async function fixture(t,{configuredAssist=true,unknownAssist=false}={}){
 const source=await assistServiceFixture(t,{loseProvider:unknownAssist});if(unknownAssist)await assert.rejects(source.run());source.commands.dispose();
 const store=source.s,api=source.api,service=new PromptReuseService(store),promptCommands=new PromptReuseCommands(service,api),promptSurface=new PromptSurfaceCommands(promptCommands,api),promptNext=new NextPromptCommands(service,api,promptSurface),promptAssist=new AssistPromptCommands(store,api,{configuration:configuredAssist?source.configuration:null,surface:promptSurface});
 promptSurface.next=promptNext;promptSurface.assist=promptAssist;
 const contextConnections=new ContextConnections(store,api,{configuration:null}),safety=new SafetyRunner(store),libraryRunner=new LibraryRunner(store),filterRunner=new FilterRunner(store),maintenanceRunner=createMaintenanceRunner(store,null);
 const owners={store,safety,libraryRunner,filterRunner,maintenanceRunner,contextConnections,promptAssist,promptNext,promptCommands,promptSurface},coord=createApplicationWorkerCoordination(owners);
 t.after(()=>{coord.close();contextConnections.dispose();promptAssist.dispose();promptNext.dispose();promptCommands.dispose?.();promptSurface.dispose?.();maintenanceRunner.dispose();});
 return {...source,...owners,service,owners,coord};
}
const sourceOwners=f=>[f.contextConnections,f.promptAssist,f.promptNext,f.promptCommands,f.promptSurface];
async function released(f,{except=[]}={}){
 assert.equal(f.safety.applicationSelectionHolding(),false);assert.equal(f.libraryRunner.applicationSelectionHolding(),false);
 for(const owner of sourceOwners(f).filter(owner=>!except.includes(owner))){const token=await owner.holdForApplicationSelection();assert.equal(owner.applicationSelectionHeld(token),true);assert.equal(owner.releaseApplicationSelection(token),true);}
 const token=await f.filterRunner.holdForApplicationSelection();assert.equal(f.filterRunner.releaseApplicationSelection(token),true);
}
async function pending(promise){let done=false;void promise.then(()=>{done=true;},()=>{done=true;});await tick();assert.equal(done,false);}

test('all genuine source tokens compose without becoming global selection authority',async t=>{
 const f=await fixture(t),before=await metadata(f.store),token=await f.coord.holdApplicationSources();
 assert.equal(Object.getPrototypeOf(token),null);assert.equal(Object.isFrozen(token),true);assert.deepEqual(Object.keys(token),[]);
 assert.equal(f.coord.applicationSourcesHeld(token),true);assert.equal(await f.coord.fenceApplicationSources(token),true);assert.equal(f.coord.applicationSourcesHeld({...token}),false);
 assert.throws(()=>f.coord.assertLocalMaintenanceHeld(token));assert.equal(f.coord.releaseLocalMaintenance(token),false);assert.equal(f.coord.releaseApplicationSources({}),false);
 await assert.rejects(f.coord.holdApplicationSources());await assert.rejects(f.promptCommands.dispatch({type:'PAIA_PROMPT_TARGETS'}));
 assert.deepEqual(await metadata(f.store),before);assert.equal(f.physical(),0);assert.equal(f.calls.length,0);
 assert.equal(f.coord.releaseApplicationSources(token),true);assert.equal(f.coord.releaseApplicationSources(token),false);assert.equal(f.coord.applicationSourcesHeld(token),false);await released(f);
});

test('local maintenance receipt never substitutes for all original sources',async t=>{
 const f=await fixture(t),token=await f.coord.holdLocalMaintenance();assert.equal(f.coord.applicationSourcesHeld(token),false);await assert.rejects(f.coord.fenceApplicationSources(token));assert.equal(f.coord.assertLocalMaintenanceHeld(token),true);assert.equal(f.coord.releaseApplicationSources(token),false);f.coord.releaseLocalMaintenance(token);
 const local=createApplicationWorkerCoordination({store:f.store,safety:f.safety,libraryRunner:f.libraryRunner,filterRunner:f.filterRunner,maintenanceRunner:f.maintenanceRunner});await assert.rejects(local.holdApplicationSources());assert.equal(f.safety.applicationSelectionHolding(),false);local.close();
});

test('original null Assist session can join live holds without claiming provider settlement',async t=>{
 const f=await fixture(t,{configuredAssist:false}),before=await metadata(f.store);assert.equal(f.promptAssist.session,null);assert.equal(f.promptAssist.applicationSelectionSourceIs(f.store),true);
 const token=await f.coord.holdApplicationSources();assert.equal(f.coord.applicationSourcesHeld(token),true);assert.equal(await f.coord.fenceApplicationSources(token),true);
 assert.deepEqual(await metadata(f.store),before);assert.equal(f.physical(),0);assert.equal(f.calls.length,0);
 assert.equal(f.coord.releaseApplicationSources(token),true);await released(f);
});

for(const replacement of ['forged','genuine'])for(const timing of ['before-coordinator','after-hold'])test('constructor null Assist refuses '+replacement+' session replacement '+timing,async t=>{
 const f=await fixture(t,{configuredAssist:false}),other=new AssistPromptCommands(f.store,f.api,{configuration:f.configuration,surface:f.promptSurface});t.after(()=>other.dispose());
 const replacementSession=replacement==='forged'?Object.create(LocalAssistSession.prototype):other.session;
 let token;if(timing==='after-hold')token=await f.coord.holdApplicationSources();
 f.promptAssist.session=replacementSession;
 try{
  assert.equal(f.promptAssist.applicationSelectionSourceIs(f.store),false);
  if(timing==='before-coordinator'){const coord=createApplicationWorkerCoordination(f.owners);await assert.rejects(coord.holdApplicationSources());coord.close();}
  else{assert.equal(f.coord.applicationSourcesHeld(token),false);await assert.rejects(f.coord.fenceApplicationSources(token));}
  assert.equal(f.safety.applicationSelectionHolding(),false);assert.equal(f.physical(),0);
 }finally{f.promptAssist.session=null;}
 await released(f);
});

test('configured Assist cannot replace its original session with null to evade its owner',async t=>{
 const f=await fixture(t),original=f.promptAssist.session;f.promptAssist.session=null;
 try{assert.equal(f.promptAssist.applicationSelectionSourceIs(f.store),false);const coord=createApplicationWorkerCoordination(f.owners);await assert.rejects(coord.holdApplicationSources());coord.close();assert.equal(f.safety.applicationSelectionHolding(),false);}finally{f.promptAssist.session=original;}
 await released(f);
});

for(const key of ['recovery-restore-epoch','gate'])test('null Assist live hold still rejects changed '+key+' fence and releases sources',async t=>{
 const f=await fixture(t,{configuredAssist:false}),token=await f.coord.holdApplicationSources();
 await f.store.repository.transaction(true,t=>t.put('meta',{id:key,value:'SYNTHETIC changed'}),['meta']);
 await assert.rejects(f.coord.fenceApplicationSources(token));assert.equal(f.coord.applicationSourcesHeld(token),false);assert.equal(f.safety.applicationSelectionHolding(),false);assert.equal(f.physical(),0);
});

for(const key of ['contextConnections','promptAssist','promptNext','promptCommands','promptSurface'])test('copied private-brand '+key+' cannot supply a source receipt',async t=>{
 const f=await fixture(t),copy=Object.assign(Object.create(Object.getPrototypeOf(f[key])),f[key]),coord=createApplicationWorkerCoordination({...f.owners,[key]:copy});
 await assert.rejects(coord.holdApplicationSources());await released(f);coord.close();
});

test('exact Context private store identity refuses a genuine foreign original owner',async t=>{
 const f=await fixture(t),other=await setup(OrganizerStore),foreign=new ContextConnections(other.s,f.api,{configuration:null});t.after(()=>foreign.dispose());
 assert.equal(f.contextConnections.applicationSelectionSourceIs(f.store),true);assert.equal(foreign.applicationSelectionSourceIs(f.store),false);assert.throws(()=>ContextConnections.prototype.applicationSelectionSourceIs.call(Object.create(ContextConnections.prototype),f.store));
 const coord=createApplicationWorkerCoordination({...f.owners,contextConnections:foreign});await assert.rejects(coord.holdApplicationSources());assert.equal(f.safety.applicationSelectionHolding(),false);coord.close();
});

for(const replacement of ['forged','genuine'])test(replacement+' replacement Assist session cannot refresh its original birth binding',async t=>{
 const f=await fixture(t),original=f.promptAssist.session,other=new AssistPromptCommands(f.store,f.api,{configuration:f.configuration,surface:f.promptSurface});t.after(()=>other.dispose());
 f.promptAssist.session=replacement==='forged'?Object.create(Object.getPrototypeOf(original)):other.session;
 try{assert.equal(f.promptAssist.applicationSelectionSourceIs(f.store),false);const coord=createApplicationWorkerCoordination(f.owners);await assert.rejects(coord.holdApplicationSources());coord.close();assert.equal(f.safety.applicationSelectionHolding(),false);}finally{f.promptAssist.session=original;}
});

test('Next constructor service binding cannot be refreshed before coordinator creation',async t=>{
 const f=await fixture(t),original=f.promptNext.service;f.promptNext.service=new PromptReuseService(f.store);
 try{assert.equal(f.promptNext.applicationSelectionSourceIs(f.store),false);const coord=createApplicationWorkerCoordination(f.owners);await assert.rejects(coord.holdApplicationSources());coord.close();}finally{f.promptNext.service=original;}
});

for(const scope of ['instance','prototype'])test('replaced '+scope+' session callbacks cannot hide original durable provider UNKNOWN',async t=>{
 const f=await fixture(t,{unknownAssist:true}),target=scope==='instance'?f.promptAssist.session:LocalAssistSession.prototype,methods=['holdForApplicationSelection','applicationSelectionHeld','fenceApplicationSelection','releaseApplicationSelection'],descriptors=methods.map(name=>[name,Object.getOwnPropertyDescriptor(target,name)]);let called=0;
 for(const name of methods)Object.defineProperty(target,name,{value:()=>{called++;return name==='holdForApplicationSelection'?Promise.resolve(Object.freeze({})):true;},configurable:true,writable:true});
 try{await assert.rejects(f.coord.holdApplicationSources());assert.equal(called,0);assert.equal(f.physical(),1);assert.equal((await f.store.repository.transaction(false,t=>t.all('organizerUsage')))[0].state,'OUTCOME_UNKNOWN');await released(f,{except:[f.promptAssist]});}
 finally{for(const [name,descriptor]of descriptors)if(descriptor)Object.defineProperty(target,name,descriptor);else delete target[name];}
});

test('late same-object session callback replacement cannot hide a changed original source fence',async t=>{
 const f=await fixture(t),token=await f.coord.holdApplicationSources();let called=0;f.promptAssist.session.fenceApplicationSelection=()=>{called++;return true;};
 // The original session scans its own bounded obligation record before the
 // outer command snapshot; a caller callback is not that read boundary.
 await f.store.repository.transaction(true,t=>t.put('meta',{id:'aiu:assist-service-preflight:v1',jobId:'missing',childId:'missing'}),['meta']);
 await assert.rejects(f.coord.fenceApplicationSources(token));assert.equal(called,0);assert.equal(f.coord.applicationSourcesHeld(token),false);await released(f,{except:[f.promptAssist]});
});

test('a competing composer cannot release another composer\'s private holds',async t=>{
 const f=await fixture(t),token=await f.coord.holdApplicationSources(),other=createApplicationWorkerCoordination(f.owners);await assert.rejects(other.holdApplicationSources());assert.equal(other.releaseApplicationSources(token),false);assert.equal(f.coord.applicationSourcesHeld(token),true);assert.equal(await f.coord.fenceApplicationSources(token),true);f.coord.releaseApplicationSources(token);other.close();
});

test('all original intake gates close synchronously before the first source drain',async t=>{
 const f=await fixture(t),entered=deferred(),gate=deferred(),original=f.store.processPurgeCleanup;f.store.processPurgeCleanup=async()=>{entered.resolve();await gate.promise;return {pending:false};};const running=f.safety.wake();await entered.promise;
 const holding=f.coord.holdApplicationSources();assert.equal(f.safety.applicationSelectionHolding(),true);assert.equal(f.libraryRunner.applicationSelectionHolding(),true);
 const checks=sourceOwners(f).map(owner=>assert.rejects(owner.holdForApplicationSelection()));await Promise.all(checks);await pending(holding);gate.resolve();await running;const token=await holding;assert.equal(await f.coord.fenceApplicationSources(token),true);f.coord.releaseApplicationSources(token);f.store.processPurgeCleanup=original;await released(f);
});

test('synchronous factory refusal releases early and late original acquisitions',async t=>{
 const f=await fixture(t),entered=deferred(),gate=deferred(),original=f.store.processPurgeCleanup;f.store.processPurgeCleanup=async()=>{entered.resolve();await gate.promise;return {pending:false};};const running=f.safety.wake();await entered.promise;
 const coord=createApplicationWorkerCoordination({...f.owners,maintenanceRunner:{...f.maintenanceRunner}}),holding=caught(coord.holdApplicationSources());await pending(holding);
 // Earlier resolved local holds are already released, while the original
 // Safety drain still owns its pending token. No failed attempt is ready.
 assert.equal(f.libraryRunner.applicationSelectionHolding(),false);assert.equal(coord.applicationSourcesHeld({}),false);gate.resolve();await running;assert.ok((await holding).error);f.store.processPurgeCleanup=original;await released(f);coord.close();
});

test('close during pending drain releases every late receipt and forbids reuse',async t=>{
 const f=await fixture(t),gate=deferred(),original=f.store.processPurgeCleanup;f.store.processPurgeCleanup=async()=>{await gate.promise;return {pending:false};};const running=f.safety.wake(),holding=caught(f.coord.holdApplicationSources());f.coord.close();gate.resolve();await running;assert.ok((await holding).error);f.store.processPurgeCleanup=original;await released(f);await assert.rejects(f.coord.holdApplicationSources());
});

test('post-hold owner relinking invalidates full proof and final fence releases others',async t=>{
 const f=await fixture(t),token=await f.coord.holdApplicationSources();f.promptSurface.next={};assert.equal(f.coord.applicationSourcesHeld(token),false);await assert.rejects(f.coord.fenceApplicationSources(token));f.promptSurface.next=f.promptNext;await released(f);assert.equal(f.coord.releaseApplicationSources(token),false);
});

test('final source epoch fence rejects metadata replacement and releases original tokens',async t=>{
 const f=await fixture(t),token=await f.coord.holdApplicationSources();await f.store.repository.transaction(true,t=>t.put('meta',{id:'recovery-restore-epoch',value:crypto.randomUUID()}),['meta']);
 await assert.rejects(f.coord.fenceApplicationSources(token));assert.equal(f.coord.applicationSourcesHeld(token),false);await released(f);
});

test('database replacement and forged source token never release someone else\'s hold',async t=>{
 const f=await fixture(t),token=await f.coord.holdApplicationSources(),db=f.store.repository.db;f.store.repository.db={};assert.equal(f.coord.applicationSourcesHeld(token),false);assert.equal(f.coord.releaseApplicationSources({}),false);f.store.repository.db=db;assert.equal(f.coord.releaseApplicationSources(token),true);await released(f);
});

test('cleanup exception still releases every other receipt and permanently closes the composer',async t=>{
 const f=await fixture(t),token=await f.coord.holdApplicationSources(),wake=f.safety.wake;f.safety.requested=true;f.safety.wake=()=>{throw Error('synthetic release failure');};
 assert.throws(()=>f.coord.releaseApplicationSources(token));f.safety.wake=wake;f.safety.requested=false;await released(f);await assert.rejects(f.coord.holdApplicationSources());assert.equal(f.coord.applicationSourcesHeld(token),false);
});

test('instance callback shadows cannot replace captured original owner methods',async t=>{
 const f=await fixture(t);let called=0;for(const owner of sourceOwners(f)){owner.holdForApplicationSelection=()=>{called++;throw Error('copied callback');};owner.fenceApplicationSelection=()=>{called++;return true;};owner.releaseApplicationSelection=()=>{called++;return true;};}
 const token=await f.coord.holdApplicationSources();assert.equal(await f.coord.fenceApplicationSources(token),true);assert.equal(f.coord.releaseApplicationSources(token),true);assert.equal(called,0);
});

test('cold persisted Context connection refuses composed proof despite empty host registry',async t=>{
 const f=await fixture(t),row={version:1,revision:1,profileId:crypto.randomUUID(),databaseId:f.store.databaseId,restoreEpoch:'initial',connections:[{id:crypto.randomUUID(),target:'chatgpt',state:'paused',generation:1,credentialHash:'0'.repeat(64),expiresAt:Date.now()+60000,port:49000}]};await f.api.storage.local.set({[CONTEXT_CONNECTION_KEY]:row});
 await assert.rejects(f.coord.holdApplicationSources());assert.equal(f.physical(),0);await released(f,{except:[f.contextConnections]});assert.deepEqual((await f.api.storage.local.get(CONTEXT_CONNECTION_KEY))[CONTEXT_CONNECTION_KEY],row);
});

test('configured Maintenance remains explicitly unqualified, even while idle',async t=>{
 const f=await maintenanceServiceFixture(t),runner=f.runner();t.after(()=>{runner.dispose();f.session.dispose();});assert.equal(runner.status().available,true);
 const coord=createApplicationWorkerCoordination({store:f.s,safety:new SafetyRunner(f.s),libraryRunner:new LibraryRunner(f.s),filterRunner:new FilterRunner(f.s),maintenanceRunner:runner});await assert.rejects(coord.holdLocalMaintenance(),{code:'GENERATION_WORKER_NOT_QUIET'});assert.equal(f.calls.length,0);assert.equal(f.physical(),0);coord.close();
});

// Fresh, ordinary synthetic controls only. No native browser, provider request,
// mixed/reverse execution, or SDK selection is performed by this file.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,mkdtemp,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {existingSelectionFixture} from './harness/existing-application-selection.mjs';
import {local,inputEdit} from './harness/thought-m1.mjs';
import {OriginalApplicationGenerationSelection,APPLICATION_SELECTION_MARKER,readOriginalApplicationSelectionReview as reviewIdentity,holdOriginalApplicationSelectionReview as hold,requireOriginalApplicationSelectionReviewHold as current,releaseOriginalApplicationSelectionReviewHold as release,requalifyOriginalApplicationSelectionReviewHold as renew,invalidateOriginalApplicationSelectionReviewHold as invalidate,readOriginalApplicationSelectionReviewHoldDeadline as deadline} from '../core/browser-native-sync/application-generation-selection.js';
import {STORAGE_KEY} from '../core/constants.js';
import {CANONICAL_GENERATION_REGISTRY,CANONICAL_GENERATION_GATE} from '../core/browser-native-sync/canonical-generation-publication.js';
import {CONTROL_PUBLICATION_RESERVATION} from '../core/local-control-publication.js';
import {createApplicationSelectionCommands} from '../background/application-selection-commands.js';
const ROW='paia-sync-local-lifecycle:v1',ROOT=fileURLToPath(new URL('..',import.meta.url));
const sender={id:'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',url:'chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/ui/archive.html'};
const api=storage=>({runtime:{id:sender.id,getURL:p=>'chrome-extension://'+sender.id+'/'+p},storage:{local:storage}});
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
const tick=()=>new Promise(r=>setImmediate(r));
function controlledLocal(){const base=local();let hook=null,setHook=null,sets=0;return {arm(key,fn){hook={key,fn};},armSet(key,fn){setHook={key,fn};},sets:()=>sets,async get(key){const value=await base.get(key);if(hook&&hook.key===key){const h=hook;hook=null;await h.fn();}return value;},async set(value){sets++;await base.set(value);if(setHook&&Object.hasOwn(value,setHook.key)){const h=setHook;setHook=null;await h.fn(value);}}};}
async function coreFixture(t){const storage=controlledLocal(),f=await existingSelectionFixture(t,{sourceLocal:storage}),selection=new OriginalApplicationGenerationSelection(f.a,f.coreA,storage);t.after(()=>selection.close());const review=await selection.prepare();return {...f,storage,selection,review};}
async function configuredFixture(t,{windowMs}={}){
 const storage=controlledLocal(),f=await existingSelectionFixture(t,{sourceLocal:storage}),path=await mkdtemp(join(tmpdir(),'paia-reserved-renewal-')),key='reserved_renewal_'+crypto.randomUUID();
 await mkdir(join(path,'background'));await symlink(join(ROOT,'core'),join(path,'core'),'dir');await writeFile(join(path,'package.json'),'{"type":"module"}');
 let source=await readFile(join(ROOT,'background/sync-local-lifecycle.js'),'utf8');if(windowMs!==undefined){assert.ok(source.includes('selectionNow()+30000'));source=source.replace('selectionNow()+30000','selectionNow()+'+windowMs);}await writeFile(join(path,'background/sync-local-lifecycle.js'),source);
 await writeFile(join(path,'background/sync-lifecycle-configuration.js'),`export function readSyncLifecycleConfiguration(){return globalThis[${JSON.stringify(key)}];}\n`);
 let live=true,requests=0;const config={provider:'google-drive',datasetId:f.coreA.datasetId,deviceId:f.coreA.deviceId,binding:{subject:'SYNTHETIC_reserved_renewal_subject',clientId:'000000000000-synthetic.apps.googleusercontent.com',generation:'SYNTHETIC_generation',scopes:['https://www.googleapis.com/auth/drive.appdata']},request:async()=>{requests++;throw Error('SYNTHETIC no transport is allowed');},isCurrent:()=>live};globalThis[key]=config;
 const module=await import(pathToFileURL(join(path,'background/sync-local-lifecycle.js')));
 f.a.sourceBootstrapJournal=null;f.a.filterIntentJournal=null;f.a.inputWorkingJournal=null;
 const lifecycle=await module.createConfiguredSyncLifecycle(f.a,api(storage)),selection=lifecycle.applicationSelectionOwner();
 t.after(()=>{selection.close();lifecycle.suspend();delete globalThis[key];});const review=await selection.prepare();
 return {...f,storage,config,module,lifecycle,selection,review,setCurrent:value=>live=value,requests:()=>requests};
}
async function snapshot(f){return {a:await f.snapshot(f.a),b:await f.snapshot(f.b),registry:await f.registry.transaction(false,t=>t.all('meta'),['meta']),control:await f.storage.get(STORAGE_KEY),lifecycle:await f.storage.get(ROW),sets:f.storage.sets()};}
async function blocked(selection){for(const method of ['prepare','requalify','activate','continue','status','cancel'])await assert.rejects(selection[method](),{code:'GENERATION_SELECTION_BUSY'},method);}
async function reserved(f){const token=f.lifecycle.reserveApplicationSelection(f.selection);return {token,require:()=>f.module.requireOriginalSyncSelectionReservation(token,f.selection)};}
async function noWrites(f,before){assert.deepEqual(await snapshot(f),before);assert.equal(f.requests?.()??0,0);}

test('core exact held renewal preserves full cut, operation, fixed deadline and restriction without SDK dispatch',async t=>{
 const f=await coreFixture(t);await f.a.run(async()=>{});const before=await snapshot(f),token=hold(f.selection,f.a,f.coreA,f.storage),expires=deadline(token,f.selection);
 assert.deepEqual(Reflect.ownKeys(token),[]);assert.equal(Object.isFrozen(token),true);assert.deepEqual(await renew(token,f.selection),f.review);assert.equal(deadline(token,f.selection),expires);assert.equal(current(token,f.selection),true);await blocked(f.selection);await noWrites(f,before);
 assert.equal(release(token,f.selection),true);assert.deepEqual(await f.selection.requalify(),f.review);assert.equal(invalidate(token,f.selection),false);const next=hold(f.selection,f.a,f.coreA,f.storage);assert.equal(invalidate(token,f.selection),false);assert.equal(current(next,f.selection),true);release(next,f.selection);
});
test('copied, foreign and extra-argument held renewal cannot consume the real hold or caller review',async t=>{
 const f=await coreFixture(t),other=new OriginalApplicationGenerationSelection(f.a,f.coreA,f.storage);t.after(()=>other.close());const token=hold(f.selection,f.a,f.coreA,f.storage),before=await snapshot(f);
 for(const action of [()=>renew({...token},f.selection),()=>renew(token,other),()=>renew(token,f.selection,f.review)])await assert.rejects(action(),{code:'GENERATION_SELECTION_CAPABILITY'});
 assert.equal(current(token,f.selection),true);assert.deepEqual(await renew(token,f.selection),f.review);await noWrites(f,before);release(token,f.selection);
});
for(const side of ['source','target'])test('held '+side+' unknown raw metadata cannot be silently re-reviewed',async t=>{
 const f=await coreFixture(t),token=hold(f.selection,f.a,f.coreA,f.storage);await f.raw((side==='source'?f.a:f.b).repository,s=>s.put({id:'SYNTHETIC-reserved-unknown',value:{retain:true}}));const before=await snapshot(f);
 await assert.rejects(renew(token,f.selection),{code:'GENERATION_SELECTION_REVIEW_REQUIRED'});assert.throws(()=>current(token,f.selection));assert.throws(()=>release(token,f.selection));await blocked(f.selection);await noWrites(f,before);
});
for(const side of ['source','target'])test('held '+side+' changed represented Working remains a new explicit review requirement',async t=>{
 const f=await coreFixture(t),token=hold(f.selection,f.a,f.coreA,f.storage);await inputEdit(side==='source'?f.a:f.b,f.blocks[0].id,{note:'SYNTHETIC retained original drift'});const before=await snapshot(f);
 await assert.rejects(renew(token,f.selection));assert.throws(()=>release(token,f.selection));await blocked(f.selection);await noWrites(f,before);
});
for(const change of ['registry','gate','marker','control-publication'])test('held full CAS refuses changed '+change+' without normalizing metadata',async t=>{
 const f=await coreFixture(t),token=hold(f.selection,f.a,f.coreA,f.storage);
 if(change==='registry'){const row=await f.registry.transaction(false,t=>t.get('meta',CANONICAL_GENERATION_REGISTRY),['meta']);await f.raw(f.registry,s=>s.put({...row,pending:{synthetic:true}}));}
 if(change==='gate'){const row=await f.b.repository.transaction(false,t=>t.get('meta',CANONICAL_GENERATION_GATE),['meta']);await f.raw(f.b.repository,s=>s.put({...row,writeRevision:row.writeRevision+1}));}
 if(change==='marker')await f.raw(f.a.repository,s=>s.put({id:APPLICATION_SELECTION_MARKER,phase:'prepared',synthetic:true}));
 if(change==='control-publication')await f.raw(f.b.repository,s=>s.put({id:CONTROL_PUBLICATION_RESERVATION,synthetic:'unresolved'}));
 const before=await snapshot(f);await assert.rejects(renew(token,f.selection));assert.throws(()=>release(token,f.selection));await blocked(f.selection);await noWrites(f,before);
});
test('original Sync reservation consumes exact held renewal, not replaceable public methods or a new review',async t=>{
 const f=await configuredFixture(t),r=await reserved(f),before=await snapshot(f);await f.a.run(async()=>{});
 let substituted=0;f.selection.requalify=async()=>{substituted++;return {state:'ready'};};f.selection.prepare=async()=>{substituted++;return {state:'ready'};};
 const result=await f.lifecycle.requalifyApplicationSelection(r.token);assert.deepEqual(result,{...f.review,productionActivation:false});assert.equal(substituted,0);delete f.selection.requalify;delete f.selection.prepare;
 assert.equal(r.require(),true);await blocked(f.selection);assert.equal(f.lifecycle.applicationSelectionAvailable(),false);await noWrites(f,before);assert.equal(await f.lifecycle.releaseApplicationSelection(r.token),true);assert.equal(f.lifecycle.applicationSelectionAvailable(),true);assert.deepEqual(await f.selection.requalify(),f.review);
});
test('forged or foreign lifecycle tokens do not poison the valid reservation',async t=>{
 const f=await configuredFixture(t),other=await configuredFixture(t),r=await reserved(f),foreign=await reserved(other),before=await snapshot(f);
 for(const action of [()=>f.lifecycle.requalifyApplicationSelection({...r.token}),()=>f.lifecycle.requalifyApplicationSelection(foreign.token),()=>f.lifecycle.requalifyApplicationSelection(r.token,()=>true)])await assert.rejects(action(),{code:'BNS_SYNC_SELECTION_INVALID'});
 assert.equal(r.require(),true);await f.lifecycle.requalifyApplicationSelection(r.token);assert.equal(r.require(),true);assert.equal(foreign.require(),true);await noWrites(f,before);assert.equal(await f.lifecycle.releaseApplicationSelection(r.token),true);assert.equal(await other.lifecycle.releaseApplicationSelection(foreign.token),true);
});
test('accepted renewal retains both holds while duplicate renewal, release and unrelated work are refused',async t=>{
 const f=await configuredFixture(t),r=await reserved(f),before=await snapshot(f),entered=deferred(),gate=deferred();t.after(()=>gate.resolve());f.storage.arm(STORAGE_KEY,async()=>{entered.resolve();await gate.promise;});const pending=f.lifecycle.requalifyApplicationSelection(r.token);await entered.promise;
 await assert.rejects(f.lifecycle.requalifyApplicationSelection(r.token),{code:'BNS_SYNC_SELECTION_INVALID'});await assert.rejects(f.lifecycle.releaseApplicationSelection(r.token),{code:'BNS_SYNC_SELECTION_INVALID'});await assert.rejects(f.lifecycle.reconcile(),{code:'BNS_SYNC_PAUSED'});await blocked(f.selection);assert.equal(f.lifecycle.applicationSelectionAvailable(),false);
 gate.resolve();assert.equal((await pending).operationId,f.review.operationId);assert.equal(r.require(),true);await noWrites(f,before);assert.equal(await f.lifecycle.releaseApplicationSelection(r.token),true);
});
for(const change of ['host','config','sdk','close'])test('observed '+change+' loss during held renewal permanently invalidates even after restoration',async t=>{
 const f=await configuredFixture(t),r=await reserved(f),entered=deferred(),gate=deferred();t.after(()=>gate.resolve());f.storage.arm(STORAGE_KEY,async()=>{entered.resolve();await gate.promise;});const pending=f.lifecycle.requalifyApplicationSelection(r.token);pending.catch(()=>{});await entered.promise;let restore=()=>{};
 if(change==='host'){f.setCurrent(false);restore=()=>f.setCurrent(true);}
 if(change==='config'){const old=f.config.request;f.config.request=async()=>{};restore=()=>f.config.request=old;}
 if(change==='sdk'){const old=f.storage.set;f.storage.set=async()=>{};restore=()=>f.storage.set=old;}
 if(change==='close')f.selection.close();
 assert.throws(()=>r.require());restore();gate.resolve();await assert.rejects(pending);assert.throws(()=>r.require());assert.equal(await f.lifecycle.releaseApplicationSelection(r.token),false);await blocked(f.selection);assert.equal(f.lifecycle.applicationSelectionAvailable(),false);assert.equal(f.requests(),0);
});
for(const stop of ['PAUSE','DISCONNECT'])test('genuine '+stop+' during original raw read stays effective and never authorizes late renewal',async t=>{
 const f=await configuredFixture(t),r=await reserved(f),entered=deferred(),gate=deferred();t.after(()=>gate.resolve());f.storage.arm(STORAGE_KEY,async()=>{entered.resolve();await gate.promise;});const pending=f.lifecycle.requalifyApplicationSelection(r.token);pending.catch(()=>{});await entered.promise;
 await f.lifecycle.handle({type:'PAIA_SYNC_'+stop},sender);const saved=(await f.storage.get(ROW))[ROW];assert.equal(saved.mode,stop==='PAUSE'?'paused':'disconnected');gate.resolve();await assert.rejects(pending);assert.deepEqual((await f.storage.get(ROW))[ROW],saved);assert.equal(await f.lifecycle.releaseApplicationSelection(r.token),false);await blocked(f.selection);assert.equal(f.requests(),0);
});
for(const phase of ['before','after'])test('durable lifecycle row drift '+phase+' core renewal is retained and closes the exact reservation',async t=>{
 const f=await configuredFixture(t),r=await reserved(f),changed={version:1,bindingId:'a'.repeat(64),generation:'b'.repeat(64),revision:1,mode:'paused',task:null,error:null};
 if(phase==='before')await f.storage.set({[ROW]:changed});else f.storage.arm(STORAGE_KEY,()=>f.storage.set({[ROW]:changed}));
 await assert.rejects(f.lifecycle.requalifyApplicationSelection(r.token),{code:'BNS_SYNC_STATE_CHANGED'});assert.deepEqual((await f.storage.get(ROW))[ROW],changed);assert.equal(await f.lifecycle.releaseApplicationSelection(r.token),false);await blocked(f.selection);assert.equal(f.requests(),0);
});
test('reservation timeout keeps original pending read tracked and cannot publish a late held review',async t=>{
 const f=await configuredFixture(t,{windowMs:30}),r=await reserved(f),entered=deferred(),gate=deferred();t.after(()=>gate.resolve());f.storage.arm(STORAGE_KEY,async()=>{entered.resolve();await gate.promise;});const pending=f.lifecycle.requalifyApplicationSelection(r.token);await entered.promise;
 await assert.rejects(pending,{code:'BNS_SYNC_SELECTION_EXPIRED'});await assert.rejects(f.lifecycle.releaseApplicationSelection(r.token),{code:'BNS_SYNC_SELECTION_INVALID'},'original renewal still owns its accepted entry');assert.equal(f.lifecycle.applicationSelectionAvailable(),false);assert.equal((await f.lifecycle.snapshot()).state,'suspended');assert.throws(()=>reviewIdentity(f.selection,f.a,f.a.sourceBootstrapJournal.core,f.storage),{code:'GENERATION_SELECTION_NOT_PREPARED'});await blocked(f.selection);
 gate.resolve();for(let i=0;i<3;i++)await tick();assert.equal(await f.lifecycle.releaseApplicationSelection(r.token),false);await blocked(f.selection);assert.equal(f.lifecycle.applicationSelectionAvailable(),false);assert.equal(f.requests(),0);
});
test('shipped global commands stay closed and cannot consume this renewal as host lifetime evidence',async t=>{
 const f=await configuredFixture(t),r=await reserved(f);await f.lifecycle.requalifyApplicationSelection(r.token);const commands=createApplicationSelectionCommands(api(f.storage),{isolated:async()=>{},ready:async()=>{},lifecycle:()=>f.lifecycle});
 assert.equal(commands.enabled,false);for(const type of ['PAIA_GENERATION_ACTIVATE','PAIA_GENERATION_CONTINUE','PAIA_GENERATION_RESTART'])await assert.rejects(commands.handle({type},sender),{code:'GENERATION_SELECTION_UNAVAILABLE'});assert.equal((await commands.handle({type:'PAIA_GENERATION_STATUS'},sender)).productionActivation,false);assert.equal(await f.lifecycle.releaseApplicationSelection(r.token),true);assert.equal(f.requests(),0);
});

for(const completion of ['failure','timeout'])test('queued genuine PAUSE then DISCONNECT survive renewal '+completion+' before first SDK write settles',async t=>{
 const f=await configuredFixture(t,completion==='timeout'?{windowMs:150}:{}),r=await reserved(f),renewEntered=deferred(),renewGate=deferred(),writeEntered=deferred(),writeGate=deferred();t.after(()=>{renewGate.resolve();writeGate.resolve();});const before=await snapshot(f);
 f.storage.arm(STORAGE_KEY,async()=>{renewEntered.resolve();await renewGate.promise;});const renewal=f.lifecycle.requalifyApplicationSelection(r.token);renewal.catch(()=>{});await renewEntered.promise;
 f.storage.armSet(ROW,async value=>{assert.equal(value[ROW].mode,'paused');writeEntered.resolve();await writeGate.promise;});const pause=f.lifecycle.handle({type:'PAIA_SYNC_PAUSE'},sender);pause.catch(()=>{});await writeEntered.promise;
 const disconnect=f.lifecycle.handle({type:'PAIA_SYNC_DISCONNECT'},sender);disconnect.catch(()=>{});
 assert.throws(()=>reviewIdentity(f.selection,f.a,f.a.sourceBootstrapJournal.core,f.storage),{code:'GENERATION_SELECTION_NOT_PREPARED'},'original stop immediately retires core review before pending read settles');
 if(completion==='failure'){renewGate.resolve();await assert.rejects(renewal);}else{await assert.rejects(renewal,{code:'BNS_SYNC_SELECTION_EXPIRED'});renewGate.resolve();await tick();}
 assert.notEqual((await f.lifecycle.snapshot()).state,'suspended','accepted original stops still own their queued durable work');assert.equal(f.lifecycle.applicationSelectionAvailable(),false);await blocked(f.selection);assert.equal((await f.storage.get(ROW))[ROW].mode,'paused');
 if(completion==='failure'){assert.equal(await f.lifecycle.releaseApplicationSelection(r.token),false,'failure cleanup cannot suspend queued genuine stop');assert.notEqual((await f.lifecycle.snapshot()).state,'suspended');}
 writeGate.resolve();const results=await Promise.all([pause,disconnect]);assert.equal(results[0].state,'paused');assert.equal(results[1].state,'disconnected');const saved=(await f.storage.get(ROW))[ROW];assert.equal(saved.mode,'disconnected');assert.equal(saved.revision,2);assert.equal(f.storage.sets(),before.sets+2);
 assert.equal((await f.lifecycle.snapshot()).state,'suspended');assert.equal(f.lifecycle.applicationSelectionAvailable(),false);if(completion==='failure')await assert.rejects(f.lifecycle.releaseApplicationSelection(r.token),{code:'BNS_SYNC_SELECTION_INVALID'});else assert.equal(await f.lifecycle.releaseApplicationSelection(r.token),false);assert.deepEqual(await f.snapshot(f.a),before.a);assert.deepEqual(await f.snapshot(f.b),before.b);assert.equal(f.requests(),0);
});
test('genuine stop waiting on its original row read completes after invalid renewal settles first',async t=>{
 const f=await configuredFixture(t),r=await reserved(f),renewEntered=deferred(),renewGate=deferred(),stopEntered=deferred(),stopGate=deferred();t.after(()=>{renewGate.resolve();stopGate.resolve();});
 f.storage.arm(STORAGE_KEY,async()=>{renewEntered.resolve();await renewGate.promise;});const renewal=f.lifecycle.requalifyApplicationSelection(r.token);renewal.catch(()=>{});await renewEntered.promise;
 f.storage.arm(ROW,async()=>{stopEntered.resolve();await stopGate.promise;});const stop=f.lifecycle.handle({type:'PAIA_SYNC_PAUSE'},sender);stop.catch(()=>{});await stopEntered.promise;
 renewGate.resolve();await assert.rejects(renewal);assert.notEqual((await f.lifecycle.snapshot()).state,'suspended');await blocked(f.selection);stopGate.resolve();assert.equal((await stop).state,'paused');assert.equal((await f.storage.get(ROW))[ROW].mode,'paused');assert.equal((await f.lifecycle.snapshot()).state,'suspended');assert.equal(await f.lifecycle.releaseApplicationSelection(r.token),false);assert.equal(f.requests(),0);
});


test('public suspension preserves accepted queued stops under exact selection restriction',async t=>{
 const f=await configuredFixture(t),r=await reserved(f),entered=deferred(),gate=deferred();t.after(()=>gate.resolve());
 f.storage.armSet(ROW,async()=>{entered.resolve();await gate.promise;});
 const pause=f.lifecycle.handle({type:'PAIA_SYNC_PAUSE'},sender);pause.catch(()=>{});await entered.promise;
 const disconnect=f.lifecycle.handle({type:'PAIA_SYNC_DISCONNECT'},sender);disconnect.catch(()=>{});
 f.lifecycle.suspend();f.lifecycle.suspend();
 assert.notEqual((await f.lifecycle.snapshot()).state,'suspended');assert.equal(f.lifecycle.applicationSelectionAvailable(),false);
 assert.throws(()=>reviewIdentity(f.selection,f.a,f.a.sourceBootstrapJournal.core,f.storage),{code:'GENERATION_SELECTION_NOT_PREPARED'});
 await assert.rejects(f.lifecycle.reconcile(),{code:'BNS_SYNC_PAUSED'});await blocked(f.selection);
 gate.resolve();const results=await Promise.all([pause,disconnect]);assert.equal(results[0].state,'paused');assert.equal(results[1].state,'disconnected');
 const saved=(await f.storage.get(ROW))[ROW];assert.equal(saved.mode,'disconnected');assert.equal(saved.revision,2);
 assert.equal((await f.lifecycle.snapshot()).state,'suspended');assert.equal(f.requests(),0);assert.throws(()=>r.require());
});
test('invalid selection attempt phase synchronously retires exact original core review',async t=>{
 const f=await configuredFixture(t),r=await reserved(f),before=await snapshot(f);
 assert.throws(()=>f.module.markOriginalSyncSelectionAttempt(r.token,f.selection,'sdk'),{code:'BNS_SYNC_SELECTION_INVALID'});
 assert.throws(()=>reviewIdentity(f.selection,f.a,f.a.sourceBootstrapJournal.core,f.storage),{code:'GENERATION_SELECTION_NOT_PREPARED'});
 await blocked(f.selection);assert.throws(()=>r.require());await noWrites(f,before);
});

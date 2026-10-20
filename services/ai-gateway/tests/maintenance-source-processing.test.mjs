import test from 'node:test';
import assert from 'node:assert/strict';
import {maintenanceSectionPromotionWorker} from './maintenance-section-promotion-worker-fixture.mjs';
import {maintenanceServiceFixture} from './maintenance-client-fixture.mjs';
import {MaintenanceProcessingCommands,configureMaintenanceProcessingSource} from '../../../extension/background/maintenance-processing-commands.js';
import {SettingsMaintenanceState} from '../../../extension/ui/settings-maintenance-state.js';
import {IDBObjectStore} from '../../../extension/tests/vendor/fake-indexeddb/build/esm/index.js';
import {MAINTENANCE_PROCESSING_KEY} from '../../../extension/background/maintenance-processing-consent.js';
import {requireMaintenanceProcessingSelection,needsMaintenanceProcessingSelection} from '../../../extension/core/ai-usage/maintenance-processing-source-denial.js';
import {readMaintenanceProcessingRequestPermit,readMaintenanceProcessingSelection} from '../../../extension/core/ai-usage/local-maintenance-session.js';
import {readMaintenanceQualificationRequestPermit} from '../../../extension/core/ai-usage/maintenance-qualification.js';
import {emptyTopic} from './maintenance-source-response-fixture.mjs';
const READ='PAIA_MAINTENANCE_PROCESSING_STATUS',WRITE='PAIA_MAINTENANCE_PROCESSING_CONFIGURE';
async function settings(store,enabled){
 const url='chrome-extension://synthetic/ui/archive.html',sender={id:'synthetic',frameId:0,documentId:'document-A',documentLifecycle:'active',url,tab:{id:4,windowId:2,incognito:false}};
 const api={runtime:{id:'synthetic',getURL:p=>'chrome-extension://synthetic/'+p,getContexts:async()=>[{contextType:'TAB',tabId:4,windowId:2,frameId:0,documentId:'document-A',documentUrl:url,incognito:false}]},tabs:{get:async()=>({id:4,windowId:2,incognito:false,url}),onRemoved:{addListener(){}},onUpdated:{addListener(){}}}};
 const commands=new MaintenanceProcessingCommands(store,api),state=new SettingsMaintenanceState({send:(type,fields={})=>commands.handle({type,...fields},sender)});await state.load();assert.equal(state.value.enabled,false);if(enabled)assert.equal(await state.configure(true),true);return {commands,state,sender};
}
function defer({value}){value.topic={...emptyTopic(),status:'DEFER',reason:'insufficient_evidence'};value.context={status:'DEFER',reason:'insufficient_evidence',groups:[]};value.filter={status:'NONE',reason:'',decisions:[]};value.citations=[];}
test('real Settings ON and original runner select one Input child with the source issuer, paid all-DEFER',async t=>{
 let selected;const f=await maintenanceServiceFixture(t,{transformResponse:defer,configure:async({local,configuration})=>{selected=await settings(local.s,true);configuration.processing=null;const installed=configureMaintenanceProcessingSource(selected.commands,local.s,configuration);Object.assign(configuration,installed);}});
 t.after(()=>{f.session.dispose();f.s.repository.close();});const runner=f.runner();t.after(()=>runner.dispose());const result=await runner.wake();
 assert.equal(f.physical(),1,JSON.stringify(result));assert.ok(['PARTIAL','COMMITTED'].includes(result.state),JSON.stringify(result));
 const rows=await f.s.run(()=>f.s.repository.transaction(false,t=>t.all('organizerWorkItems')));assert.equal(rows.filter(r=>r.kind==='ai_usage_v1'&&r.state==='DEFERRED').length,2);
 assert.equal(rows.filter(r=>r.kind==='ai_usage_v1'&&r.state==='ACKNOWLEDGED').length,0);
});
test('configuration null remains zero access and copied Commands cannot install',()=>{let reads=0;const denied=new Proxy({},{get(){reads++;throw Error('no read');}});assert.equal(configureMaintenanceProcessingSource(denied,denied,null),null);assert.equal(reads,0);assert.throws(()=>configureMaintenanceProcessingSource({}, {}, {processing:null}));});

async function sourceFixture(t,{enabled=true,mutate=null,configureAfter=null}={}){
 let selected;const f=await maintenanceServiceFixture(t,{transformResponse:defer,configure:async({local,configuration})=>{
  selected=await settings(local.s,enabled);configuration.processing=null;const installed=configureMaintenanceProcessingSource(selected.commands,local.s,configuration);Object.assign(configuration,installed);
  if(mutate)await mutate(local,configuration,selected);if(configureAfter)await configureAfter(local,configuration,selected);
 }});t.after(()=>{f.session.dispose();f.s.repository.close();});return {...f,selected};
}
function semanticObserver(t,active=()=>true){let reads=0;const events=[];for(const method of ['get','getAll','openCursor']){const original=IDBObjectStore.prototype[method];t.mock.method(IDBObjectStore.prototype,method,function(...args){if(active()&&['blocks','records','thoughts','revisions'].includes(this.name)){reads++;if(events.length<12)events.push({table:this.name,method,keyType:typeof args[0],stack:new Error().stack});}return original.apply(this,args);});}const value=()=>reads;value.details=()=>events;return value;}
async function runOriginal(t,f){const runner=f.runner();t.after(()=>runner.dispose());return runner.wake();}
for(const mode of ['default off','localOnly','restore mismatch','copied source facade','wrapped source facade','self-tagged copied facade'])test('original runner refuses '+mode+' before selected semantic IO and before paid dispatch',async t=>{
 const f=await sourceFixture(t,{enabled:mode!=='default off',mutate:async(local,c)=>{
  if(mode==='localOnly')await local.s.run(()=>local.s.repository.transaction(true,tx=>tx.put('meta',{id:'memory:config',localOnly:true})));
  if(mode==='restore mismatch')await local.s.run(()=>local.s.repository.transaction(true,tx=>tx.put('meta',{id:'recovery-restore-epoch',value:'SYNTHETIC-restored'})));
  if(mode==='copied source facade')c.processing=Object.freeze({...c.processing});
  if(mode==='self-tagged copied facade')c.processing=requireMaintenanceProcessingSelection(Object.freeze({...c.processing}));
  if(mode==='wrapped source facade'){const p=c.processing;c.processing=Object.freeze({resolve:(...args)=>p.resolve(...args),isCurrent:(...args)=>p.isCurrent(...args)});}
 }}),reads=semanticObserver(t);const result=await runOriginal(t,f);assert.equal(f.physical(),0,JSON.stringify(result));assert.equal(reads(),0,JSON.stringify(reads.details()));assert.notEqual(result.state,'COMMITTED');
});
test('a real existing processing issuer is retained exactly and never enters new purpose or batch selection paths',async t=>{
 let installed,original;const f=await maintenanceServiceFixture(t,{transformResponse:defer,configure:async({local,configuration})=>{const selected=await settings(local.s,false);original=configuration.processing;installed=configureMaintenanceProcessingSource(selected.commands,local.s,configuration);assert.equal(installed,configuration);assert.equal(installed.processing,original);assert.equal(needsMaintenanceProcessingSelection(original),false);}});t.after(()=>{f.session.dispose();f.s.repository.close();});let purposeReads=0;const get=IDBObjectStore.prototype.get;t.mock.method(IDBObjectStore.prototype,'get',function(key){if(this.name==='meta'&&key===MAINTENANCE_PROCESSING_KEY)purposeReads++;return get.call(this,key);});const result=await runOriginal(t,f);assert.equal(f.physical(),1,JSON.stringify(result));assert.equal(purposeReads,0);
});
test('a self-tagged fake facade receives no permit from a public request and no original source raw authority',async t=>{
 const f=await sourceFixture(t);const p=f.configuration.processing;assert.equal(needsMaintenanceProcessingSelection(p),true);const fake=requireMaintenanceProcessingSelection(Object.freeze({resolve:p.resolve,isCurrent:p.isCurrent}));assert.equal(needsMaintenanceProcessingSelection(fake),true);assert.equal(needsMaintenanceProcessingSelection({...fake}),false);assert.equal(p.isCurrent({},f.s),false);assert.equal(p.isCurrent(Object.freeze({processing:true}),f.s),false);
 await f.s.run(()=>f.s.repository.transaction(false,async tx=>{const scope=Object.freeze({purpose:'ai-maintenance-payload',inputs:[]});assert.equal(readMaintenanceQualificationRequestPermit({},f.s,tx,p),null);assert.equal(readMaintenanceProcessingRequestPermit({},f.s,tx,p),null);assert.throws(()=>readMaintenanceProcessingSelection({},f.s,tx));await assert.rejects(p.resolve(tx,scope,{}));}));assert.equal(f.physical(),0);
});
for(const mode of ['Settings OFF','persistent OFF','localOnly','restore'])test('after actual original qualification, '+mode+' at tokenizer prevents later selected semantic IO and provider',async t=>{
 let changed=false;const f=await sourceFixture(t,{configureAfter:async(local,c,selected)=>{const tokenize=c.tokenize;c.tokenize=async args=>{if(!changed){if(mode==='Settings OFF')assert.equal(await selected.state.configure(false),true);else await local.s.run(()=>local.s.repository.transaction(true,async tx=>{if(mode==='persistent OFF'){const row=await tx.get('meta',MAINTENANCE_PROCESSING_KEY);await tx.put('meta',{...row,enabled:false});}else await tx.put('meta',mode==='localOnly'?{id:'memory:config',localOnly:true}:{id:'recovery-restore-epoch',value:'SYNTHETIC-replaced'});}));changed=true;}return tokenize(args);};}});const reads=semanticObserver(t,()=>changed),result=await runOriginal(t,f);assert.equal(changed,true,JSON.stringify(result));assert.equal(f.physical(),0,JSON.stringify(result));assert.equal(reads(),0,JSON.stringify(reads.details()));
});

test('actual cold worker source registry with processing null consumes saved explicit Settings ON and one paid child',async t=>{
 const f=await sourceFixture(t);f.session.dispose();const worker=await maintenanceSectionPromotionWorker(t,f,{processingSource:true});assert.equal(worker.coldAtConstruction,true);assert.notEqual(worker.store,f.s);
 const deadline=performance.now()+10000;let rows;
 for(;;){rows=await worker.store.run(()=>worker.store.repository.transaction(false,tx=>tx.all('organizerWorkItems')));if(rows.filter(r=>r.kind==='ai_usage_v1'&&r.state==='DEFERRED').length===2)break;if(performance.now()>=deadline)assert.fail(JSON.stringify({physical:f.physical(),paths:f.calls.map(x=>x.path),rows:rows.map(r=>({kind:r.kind,state:r.state}))}));await new Promise(resolve=>setTimeout(resolve,10));}
 assert.equal(f.physical(),1);assert.equal(rows.filter(r=>r.kind==='ai_usage_v1'&&r.state==='ACKNOWLEDGED').length,0);const status=await worker.send({type:READ},worker.sender);assert.equal(status.ok,true,JSON.stringify(status));assert.equal(status.data.enabled,true);
 const off=await worker.send({type:WRITE,enabled:false,expectedGeneration:status.data.generation,consentVersion:1,confirmed:true},worker.sender);assert.equal(off.ok,true,JSON.stringify(off));assert.equal(off.data.enabled,false);assert.equal(f.physical(),1);
});

for(const mode of ['missing Source row','missing Source index','source tombstone','snapshot tombstone'])test('new source original metadata presence refuses '+mode+' without any Source body read',async t=>{
 const f=await sourceFixture(t,{mutate:async(local)=>{await local.s.run(()=>local.s.repository.transaction(true,async tx=>{const [index]=await tx.all('recordIndex');assert.ok(index);if(mode==='missing Source row')await tx.delete('records',index.id);else if(mode==='missing Source index')await tx.delete('recordIndex',index.id);else {const key=mode==='source tombstone'?index.sourceKey:index.dedupeKey;assert.equal(typeof key,'string');await tx.put('tombstones',{id:(mode==='source tombstone'?'source:':'snapshot:')+key});}}));}}),reads=semanticObserver(t);await runOriginal(t,f);assert.equal(f.physical(),0);assert.equal(reads(),0,JSON.stringify(reads.details()));
});

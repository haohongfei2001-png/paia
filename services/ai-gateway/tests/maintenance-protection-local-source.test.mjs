import test from 'node:test';
import assert from 'node:assert/strict';
import {maintenanceServiceFixture} from './maintenance-client-fixture.mjs';
import {MaintenanceProcessingCommands,configureMaintenanceProcessingSource,configuredMaintenanceTopicIdentityProcessing} from '../../../extension/background/maintenance-processing-commands.js';
import {SettingsMaintenanceState} from '../../../extension/ui/settings-maintenance-state.js';
import {LocalMaintenanceSession} from '../../../extension/core/ai-usage/local-maintenance-session.js';
import {createMaintenanceServiceClient} from '../../../extension/core/ai-usage/maintenance-service-client.js';
import {ContextCardsService,CONTEXT_CARDS_ROW} from '../../../extension/core/context-cards.js';
import {DIRTY_PREFIX,KNOWN_PREFIX} from '../../../extension/core/ai-usage/delta.js';
import {IDBObjectStore} from '../../../extension/tests/vendor/fake-indexeddb/build/esm/index.js';
const op=()=>crypto.randomUUID();
const options={scope:'synthetic-maintenance',contractVersion:'synthetic-aiu-1',routeVersion:'synthetic-maintenance-1'};
const read=(store,table,key)=>store.repository.transaction(false,t=>key?t.get(table,key):t.all(table));
async function configureSettings(store,enabled){
 const url='chrome-extension://synthetic/ui/archive.html',sender={id:'synthetic',frameId:0,documentId:'document-A',documentLifecycle:'active',url,tab:{id:4,windowId:2,incognito:false}};
 const api={runtime:{id:'synthetic',getURL:p=>'chrome-extension://synthetic/'+p,getContexts:async()=>[{contextType:'TAB',tabId:4,windowId:2,frameId:0,documentId:'document-A',documentUrl:url,incognito:false}]},tabs:{get:async()=>({id:4,windowId:2,incognito:false,url}),onRemoved:{addListener(){}},onUpdated:{addListener(){}}}};
 const commands=new MaintenanceProcessingCommands(store,api),state=new SettingsMaintenanceState({send:(type,fields={})=>commands.handle({type,...fields},sender)});await state.load();if(enabled)assert.equal(await state.configure(true),true);return {commands,state};
}
async function fixture(t,{enabled=true,manual=false}={}){
 let configuration,change,before,settings,manualId=null;
 const f=await maintenanceServiceFixture(t,{configureManifest:async({local})=>{
  const prior=new LocalMaintenanceSession(local.s,{...local.constructor,service:local.service});try{const result=await prior.run(await prior.prepare(options));assert.equal(result.state,'COMMITTED');}finally{prior.dispose();}
  const cards=new ContextCardsService(local.s),snapshot=await cards.snapshot(),item=snapshot.items.find(i=>i.origin==='automatic');assert.ok(item);
  change={kind:'put',operationId:op(),epoch:snapshot.epoch,itemId:item.id,card:item.card,expectedRevision:item.revision,body:item.body,section:item.section};await cards.change(change);if(manual){manualId=op();await cards.change({kind:'put',operationId:op(),epoch:snapshot.epoch,itemId:manualId,card:'info',expectedRevision:0,body:'SYNTHETIC unrelated human Context body',section:'SYNTHETIC manual'});}before=await read(local.s,'meta',CONTEXT_CARDS_ROW);
 },configure:async({local,configuration:base})=>{settings=await configureSettings(local.s,enabled);base.processing=null;configuration=configureMaintenanceProcessingSource(settings.commands,local.s,base);}});
 f.session.dispose();const remote=createMaintenanceServiceClient(configuration);assert.ok(remote,'original branded source configuration must construct the real client');
 const session=new LocalMaintenanceSession(f.s,{...remote.sessionOptions,remote,topicIdentityProcessing:configuredMaintenanceTopicIdentityProcessing(configuration,f.s)});
 t.after(()=>{session.dispose();f.s.repository.close();});
 const key=JSON.stringify(['context_item',change.itemId]);assert.equal((await read(f.s,'meta',KNOWN_PREFIX+key)).descriptor.localCorrection.kind,'protection_only');
 return {...f,session,configuration,change,key,before,settings,manualId};
}
async function localRows(f){return {acks:(await read(f.s,'organizerWorkItems')).filter(r=>r.state==='ACKNOWLEDGED'&&r.unit?.key===f.key),usage:(await read(f.s,'organizerUsage')).filter(r=>r.state==='COMMITTED'&&r.spendState==='NO_PROVIDER_COST')};}
test('original configured source locally ACKs a genuine protection-only correction without provider work',async t=>{
 const f=await fixture(t),result=await f.session.run(await f.session.prepare(options));
 assert.equal(result.state,'COMMITTED');assert.equal(result.localResolvedUnits,2);assert.equal(result.complete,true);assert.equal(result.dispatchAllowed,false);assert.equal(result.financialAuthority,false);
 assert.equal(f.physical(),0);assert.deepEqual(f.calls,[]);assert.deepEqual(await read(f.s,'meta',CONTEXT_CARDS_ROW),f.before);
 const rows=await localRows(f);assert.deepEqual(rows.acks.map(r=>r.unit.facet).sort(),['context','topic']);assert.equal(rows.usage.length,1);assert.equal(rows.usage[0].attemptCount,0);assert.equal(rows.usage[0].effectiveResultCount,0);assert.equal(rows.usage[0].executionKind,'local');assert.ok(rows.acks.every(r=>r.outcome==='NO_CHANGE'));assert.equal(await read(f.s,'meta',DIRTY_PREFIX+f.key),undefined);
});

test('source local protection admission preserves disabled processing and unrelated human obligations',async t=>{
 const f=await fixture(t,{enabled:false,manual:true}),manualKey=JSON.stringify(['context_item',f.manualId]),manualDirty=await read(f.s,'meta',DIRTY_PREFIX+manualKey),result=await f.session.run(await f.session.prepare(options));
 assert.equal(f.settings.state.value.enabled,false);assert.equal(result.state,'PARTIAL');assert.equal(result.localResolvedUnits,2);assert.equal(result.complete,false);assert.equal(result.nextCursor,null);assert.equal(result.remainingWork,true);assert.equal(result.pendingBatchUnits,2);
 assert.deepEqual(await read(f.s,'meta',DIRTY_PREFIX+manualKey),manualDirty);assert.deepEqual(await read(f.s,'meta',CONTEXT_CARDS_ROW),f.before);assert.equal((await read(f.s,'organizerWorkItems')).some(r=>r.state==='ACKNOWLEDGED'&&r.unit?.key===manualKey),false);
 await assert.rejects(f.session.prepare(options),{code:'UNAVAILABLE'});assert.equal(f.physical(),0);assert.deepEqual(f.calls,[]);assert.equal((await localRows(f)).acks.length,2);
});
for(const fault of ['semantic drift','dispose'])test('source local protection '+fault+' at first ACK rolls back the exact local settlement',async t=>{
 const f=await fixture(t),put=IDBObjectStore.prototype.put;let injections=0;
 t.mock.method(IDBObjectStore.prototype,'put',function(row,...args){
  const request=put.call(this,row,...args);
  if(this.transaction.db===f.s.repository.db&&this.name==='organizerWorkItems'&&row.state==='ACKNOWLEDGED'&&row.unit?.key===f.key&&!injections){
   request.addEventListener('success',()=>{if(injections)return;injections++;if(fault==='dispose'){f.session.dispose();return;}const meta=this.transaction.objectStore('meta'),read=meta.get(CONTEXT_CARDS_ROW);read.addEventListener('success',()=>{const current=read.result;current.items.find(i=>i.id===f.change.itemId).body+=' SYNTHETIC late drift';meta.put(current);},{once:true});},{once:true});
  }
  return request;
 });
 let failure;try{await f.session.prepare(options);}catch(error){failure=error;}
 assert.ok(failure,'injected final-fence failure must reject');assert.equal(injections,1,failure?.stack);assert.equal(f.physical(),0);assert.deepEqual(f.calls,[]);
 assert.deepEqual(await read(f.s,'meta',CONTEXT_CARDS_ROW),f.before);assert.equal((await localRows(f)).acks.length,0);assert.equal((await localRows(f)).usage.length,0);assert.ok(await read(f.s,'meta',DIRTY_PREFIX+f.key));assert.equal(f.physical(),0);assert.deepEqual(f.calls,[]);
});

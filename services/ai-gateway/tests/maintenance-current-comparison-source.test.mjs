import test from 'node:test';
import assert from 'node:assert/strict';
import {maintenanceServiceFixture} from './maintenance-client-fixture.mjs';
import {MaintenanceProcessingCommands,configureMaintenanceProcessingSource} from '../../../extension/background/maintenance-processing-commands.js';
import {SettingsMaintenanceState} from '../../../extension/ui/settings-maintenance-state.js';
import {LocalMaintenanceSession} from '../../../extension/core/ai-usage/local-maintenance-session.js';
import {capture} from '../../../extension/tests/harness/thought-m1.mjs';
import {ContextCardsService} from '../../../extension/core/context-cards.js';
import {maintenanceServiceResponseContract} from '../../../extension/core/ai-usage/maintenance-service-response.js';
import {hashText} from '../../../extension/core/dedupe.js';
import {canonical} from '../../../extension/core/ai-usage/contracts.js';
import {emptyTopic} from './maintenance-source-response-fixture.mjs';
const op=()=>crypto.randomUUID();
async function settings(store,enabled){
 const url='chrome-extension://synthetic/ui/archive.html',sender={id:'synthetic',frameId:0,documentId:'document-A',documentLifecycle:'active',url,tab:{id:4,windowId:2,incognito:false}};
 const api={runtime:{id:'synthetic',getURL:p=>'chrome-extension://synthetic/'+p,getContexts:async()=>[{contextType:'TAB',tabId:4,windowId:2,frameId:0,documentId:'document-A',documentUrl:url,incognito:false}]},tabs:{get:async()=>({id:4,windowId:2,incognito:false,url}),onRemoved:{addListener(){}},onUpdated:{addListener(){}}}};
 const commands=new MaintenanceProcessingCommands(store,api),state=new SettingsMaintenanceState({send:(type,fields={})=>commands.handle({type,...fields},sender)});await state.load();assert.equal(state.value.enabled,false);if(enabled)assert.equal(await state.configure(true),true);return {commands,state,sender};
}
function defer({value}){value.topic={...emptyTopic(),status:'DEFER',reason:'insufficient_evidence'};value.context={status:'DEFER',reason:'insufficient_evidence',groups:[]};value.filter={status:'NONE',reason:'',decisions:[]};value.citations=[];}

for(const enabled of [true,false])test('original source issuer current comparison with independent permission '+enabled,async t=>{
 let itemId,seen=null;
 const f=await maintenanceServiceFixture(t,{configureManifest:async({local,server})=>{
  const cards=new ContextCardsService(local.s);
  if(enabled){
   // A real already-maintained old Item, not a fabricated clean human delta.
   const prior=new LocalMaintenanceSession(local.s,{...local.constructor,service:local.service});try{await prior.run(await prior.prepare({scope:'synthetic-maintenance',contractVersion:'synthetic-aiu-1',routeVersion:'synthetic-maintenance-1'}));}finally{prior.dispose();}
   const old=(await cards.snapshot()).items[0];assert.equal(old.origin,'automatic');itemId=old.id;
   await local.s.capture(capture((await local.s.status()).epoch,'SYNTHETIC-new-comparison-source','SYNTHETIC independently new comparison text'));
  }else{itemId=op();await cards.change({kind:'put',operationId:op(),epoch:'initial',itemId,expectedRevision:0,body:'SYNTHETIC original current text',section:'SYNTHETIC comparison',card:'info'});}
  for(const key of ['global','info'])await cards.change({kind:'access',operationId:op(),epoch:'initial',key,enabled:true,expectedRevision:0});
  const contract=maintenanceServiceResponseContract({material:{currentContextComparison:{version:1,mode:'current_item_text',items:[]}}}),manifest=server.manifest;
  manifest.wire.responseFormat.json_schema.schema=structuredClone(contract.schema);manifest.wire.instructions=contract.instructions;manifest.profile.responseSchemaDigest=await hashText(canonical(contract.schema));manifest.known.responseSchemaDigest=manifest.profile.responseSchemaDigest;
 },configure:async({local,configuration})=>{const selected=await settings(local.s,enabled);configuration.processing=null;Object.assign(configuration,configureMaintenanceProcessingSource(selected.commands,local.s,configuration));},transformResponse:args=>{seen=args.payload;defer(args);args.value.version=2;}});
 t.after(()=>{f.session.dispose();f.s.repository.close();});const runner=f.runner();t.after(()=>runner.dispose());const result=await runner.wake();assert.equal(f.physical(),enabled?1:0,JSON.stringify(result));
 if(enabled){assert.equal(seen.material.currentContextComparison.items[0].itemId,itemId);assert.match(seen.material.currentContextComparison.items[0].body,/PRIVATE_CONTEXT_BODY/);assert.deepEqual(seen.material.currentContextComparisonSummary,{version:1,coverage:'open_cards_current_items',selectedItems:1,omittedItems:0,complete:true});const rows=await f.s.repository.transaction(false,t=>t.all('organizerWorkItems'));assert.equal(rows.filter(r=>r.kind==='ai_usage_v1'&&r.state==='ACKNOWLEDGED'&&r.jobId===seen.logicalJobId).length,0);assert.equal(rows.filter(r=>r.kind==='ai_usage_v1'&&r.state==='DEFERRED'&&r.jobId===seen.logicalJobId).length,2);}else assert.equal(seen,null);
});

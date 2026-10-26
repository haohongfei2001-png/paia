import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,local} from './harness/thought-m1.mjs';
import {parameters} from './harness/topic-03.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {MaintenanceProcessingCommands,configureMaintenanceProcessingSource,isOriginalMaintenanceSourceConfiguration} from '../background/maintenance-processing-commands.js';
import {createAIFilterRuntime} from '../background/ai-filter-commands.js';
import {readAIFilterServiceSourceConfiguration} from '../core/ai-usage/filter-visibility-service.js';
import {createMaintenanceServiceClient} from '../core/ai-usage/maintenance-service-client.js';
import {requireMaintenanceProcessingSelection,requireMaintenanceProcessingContext} from '../core/ai-usage/maintenance-processing-source-denial.js';
import {readMaintenanceServiceConfiguration} from '../core/ai-usage/maintenance-service-configuration.js';

// Route provenance only. No database body read, grant, provider or declaration
// is supplied by these flags; actual source preparation has its separate cases.
test('Q4 rename capabilities require exact current Commands and Filter source provenance',async t=>{
 const {s}=await setup(OrganizerStore),event={addListener(){},removeListener(){}},api={runtime:{id:'synthetic',getURL:p=>'chrome-extension://synthetic/'+p},tabs:{onRemoved:event,onUpdated:event},storage:{session:local(),onChanged:event}},commands=new MaintenanceProcessingCommands(s,api),filter=createAIFilterRuntime(api,{getStore:()=>s});
 t.after(()=>{filter.dispose();s.repository.close();});
 let calls=0;const forbidden=()=>{calls++;throw Error('NOT_RUN');},caller=Object.freeze({id:crypto.randomUUID()}),service={version:1,topic:{decisionVersion:'synthetic-route-1',parameters,resolveProcessing:forbidden},context:{caller,processingVerifier:{verify:forbidden,isCurrent:()=>false}}};
 const raw={origin:'https://synthetic.invalid',scope:'synthetic-provenance',contractVersion:'synthetic-1',routeVersion:'synthetic-provenance-1',service,processing:null,clock:Date.now,resolveAuthority:forbidden,isCurrent:()=>true,onInvalidate:()=>()=>{},readProfile:forbidden,currentProfile:()=>null,tokenize:forbidden,isCurrentTokenizer:()=>false,readProofs:forbidden,fetch:forbidden};
 const source=configureMaintenanceProcessingSource(commands,s,raw),wrapped=filter.configureService(source,null);
 function projected(configuration){const client=createMaintenanceServiceClient(configuration);assert.ok(client);try{const topic=client.sessionOptions.service.topic;assert.equal(topic.reconcileHumanSectionRestores,true);assert.equal(topic.reconcileHumanTopicRestores,true);return {names:topic.reconcileHumanNames,sections:topic.reconcileHumanSections};}finally{client.dispose();}}
 assert.equal(readMaintenanceServiceConfiguration(),null);assert.equal(createMaintenanceServiceClient(null),null);
 assert.equal(isOriginalMaintenanceSourceConfiguration(raw),false);assert.equal(isOriginalMaintenanceSourceConfiguration(source),true);assert.equal(readAIFilterServiceSourceConfiguration(wrapped),source);
 assert.deepEqual(projected(source),{names:true,sections:true});assert.deepEqual(projected(wrapped),{names:true,sections:true});
 const copiedSource={...source},copiedWrapper={...wrapped},wrappedCopy=filter.configureService(copiedSource,null);
 for(const value of [copiedSource,copiedWrapper,wrappedCopy]){assert.equal(isOriginalMaintenanceSourceConfiguration(value),false);assert.deepEqual(projected(value),{names:undefined,sections:undefined});}
 wrapped.service={...wrapped.service,topic:{...wrapped.service.topic}};assert.equal(readAIFilterServiceSourceConfiguration(wrapped),null);assert.deepEqual(projected(wrapped),{names:undefined,sections:undefined});
 const independent={...raw,processing:Object.freeze({resolve:forbidden,isCurrent:()=>false}),service:{...service,context:{...service.context},topic:{...service.topic}}};
 requireMaintenanceProcessingSelection(independent.processing);requireMaintenanceProcessingContext(independent.service.context);assert.equal(isOriginalMaintenanceSourceConfiguration(independent),false);assert.deepEqual(projected(independent),{names:undefined,sections:undefined});
 for(const [names,sections]of [[false,false],[true,false],[false,true]]){const value={...independent,service:{...independent.service,topic:{...independent.service.topic,reconcileHumanNames:names,reconcileHumanSections:sections}}};assert.deepEqual(projected(value),{names,sections});}
 const replacement=configureMaintenanceProcessingSource(commands,s,{...raw,routeVersion:'synthetic-provenance-2'});assert.equal(isOriginalMaintenanceSourceConfiguration(source),false);assert.deepEqual(projected(source),{names:undefined,sections:undefined});assert.equal(isOriginalMaintenanceSourceConfiguration(replacement),true);assert.deepEqual(projected(replacement),{names:true,sections:true});
 assert.equal(calls,0);
});

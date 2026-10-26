import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,local} from './harness/thought-m1.mjs';
import {parameters} from './harness/topic-03.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {TopicProcessingAuthority} from '../core/topic-processing-authority.js';
import {MaintenanceProcessingCommands,configureMaintenanceProcessingSource,configuredMaintenanceTopicIdentityProcessing} from '../background/maintenance-processing-commands.js';
import {createAIFilterRuntime} from '../background/ai-filter-commands.js';
import {readAIFilterServiceSourceConfiguration} from '../core/ai-usage/filter-visibility-service.js';
import {createConfiguredMaintenanceSession} from '../core/ai-usage/configured-maintenance-session.js';
import {readMaintenanceServiceConfiguration} from '../core/ai-usage/maintenance-service-configuration.js';

// New MAIN-BASE binding proof, not a replay of the earlier lifecycle suites.
// Real Commands, Filter wrapper, Session and TopicProcessingAuthority owners run
// over synthetic records. Profile qualification is the intentional stop; no
// tokenizer, signed transport, provider, native selection or worker is executed.
const op=()=>crypto.randomUUID(),rows=(s,table)=>s.repository.transaction(false,t=>t.all(table));
const tables=['records','blocks','inputStates','thoughts','topics','sections','placements','dependencies','provenance','revisions','operationReceipts'];
const semantic=async s=>Object.fromEntries(await Promise.all(tables.map(async table=>[table,await rows(s,table)])));
async function fixture(t,{enabled=true,identity=true}={}){
 const f=await setup(OrganizerStore);await f.s.finishFoundation();await f.s.setFilterMode('off');
 f.topic=await f.s.createTopic({name:'SYNTHETIC main-binding authored Topic',operationId:op()});
 f.entry=await f.s.createEntry({actor:'user',body:'SYNTHETIC main-binding authored body',type:'idea',formation:'explicit',evidence:[],operationId:op()});
 await f.s.placeEntry({topicId:f.topic.id,entryId:f.entry.id,expectedEntryRevision:f.entry.revision,expectedTopicRevision:(await f.s.topic(f.topic.id)).organizationRevision,operationId:op()});
 const url='chrome-extension://synthetic/ui/archive.html',sender={id:'synthetic',frameId:0,documentId:'main-q4-binding',documentLifecycle:'active',url,tab:{id:4,windowId:2,incognito:false}};
 const event={addListener(){},removeListener(){}},api={runtime:{id:'synthetic',getURL:path=>'chrome-extension://synthetic/'+path,getContexts:async()=>[{contextType:'TAB',tabId:4,windowId:2,frameId:0,documentId:sender.documentId,documentUrl:url,incognito:false}]},tabs:{get:async()=>({id:4,windowId:2,incognito:false,url}),onRemoved:event,onUpdated:event},storage:{session:local(),onChanged:event}};
 f.commands=new MaintenanceProcessingCommands(f.s,api);f.filter=createAIFilterRuntime(api,{getStore:()=>f.s});
 f.configure=async value=>{const status=await f.commands.handle({type:'PAIA_MAINTENANCE_PROCESSING_STATUS'},sender);return f.commands.handle({type:'PAIA_MAINTENANCE_PROCESSING_CONFIGURE',enabled:value,expectedGeneration:status.generation,consentVersion:1,confirmed:true},sender);};
 assert.equal((await f.commands.handle({type:'PAIA_MAINTENANCE_PROCESSING_STATUS'},sender)).enabled,false);if(enabled)assert.equal((await f.configure(true)).enabled,true);
 f.options={scope:'synthetic-main-q4-binding',contractVersion:'synthetic-1',routeVersion:'synthetic-main-q4-binding-1',cursor:'aiu:delta:pending:["library_entry",',limit:1};
 f.calls={profile:0,transport:0,identity:0};const caller=Object.freeze({id:op()}),abort=new AbortController(),expiresAt=Date.now()+30000,issuers=new Map();f.budgets=[];
 const processing=Object.freeze({resolve:async(_transaction,scope)=>{f.calls.identity++;return Object.freeze({version:1,store:f.s,caller,scope,epoch:'synthetic-independent-main-binding-identity',processing:identity,expiresAt,revocationSignal:abort.signal});},isCurrent:()=>identity&&!abort.signal.aborted});
 const service={version:1,topic:{reconcileAuthoredEntries:true,decisionVersion:'synthetic-main-q4-binding-1',parameters,resolveProcessing:async(transaction,request,{workBudget})=>{f.budgets.push(workBudget);let owner=issuers.get(workBudget);if(!owner){owner=new TopicProcessingAuthority(f.s,{processing,caller,binding:{operationId:op()},workBudget,signal:abort.signal});issuers.set(workBudget,owner);}return owner.authorize(transaction,request);}},context:{caller,processingVerifier:{verify:async(_caller,store,scope)=>({version:1,store,scope,accountId:'synthetic',processorId:'synthetic',authorizationGeneration:1,processing:true,expiresAt,revocationSignal:abort.signal}),isCurrent:()=>!abort.signal.aborted}}};
 const forbidden=()=>{f.calls.transport++;throw Error('Tokenizer, signed transport and provider NOT_RUN');};
 f.original={origin:'https://synthetic.invalid',scope:f.options.scope,contractVersion:f.options.contractVersion,routeVersion:f.options.routeVersion,service,processing:null,clock:Date.now,resolveAuthority:async(_transaction,request)=>({allowed:true,consentEpoch:'synthetic-consent',principalId:'synthetic-principal',libraryId:f.s.databaseId,jobTypes:['AI_MAINTENANCE'],scope:{evidenceKeys:request.evidenceKeys,coverage:request.coverage}}),isCurrent:()=>true,onInvalidate:()=>()=>{},readProfile:async()=>{f.calls.profile++;throw Object.assign(Error('Synthetic profile qualification unavailable'),{code:'UNAVAILABLE'});},currentProfile:()=>null,tokenize:forbidden,isCurrentTokenizer:()=>false,readProofs:forbidden,fetch:forbidden};
 f.source=configureMaintenanceProcessingSource(f.commands,f.s,f.original);
 f.wrapped=f.filter.configureService(f.source,null);
 f.sessions=[];f.session=configuration=>{const session=createConfiguredMaintenanceSession(f.s,configuration);f.sessions.push(session);return session;};
 t.after(()=>{for(const session of f.sessions)session.dispose();f.filter.dispose();abort.abort();for(const owner of issuers.values())owner.release();f.s.repository.close();});return f;
}
async function run(f,configuration=f.wrapped){const session=f.session(configuration);try{const handle=await session.prepare(f.options);return {handle,result:await session.run(handle)};}catch(error){return {error};}}
async function unchanged(f,before){assert.deepEqual(await semantic(f.s),before);assert.equal(f.calls.transport,0);assert.equal((await rows(f.s,'organizerWorkItems')).filter(row=>row.state==='ACKNOWLEDGED').length,0);assert.ok((await rows(f.s,'organizerUsage')).every(row=>row.attemptCount===0));}

test('MAIN-BASE default NULL remains unavailable through original Commands and Filter assembly',async t=>{
 const f=await fixture(t,{enabled:false}),before=await semantic(f.s);assert.equal(readMaintenanceServiceConfiguration(f.s),null);
 const source=configureMaintenanceProcessingSource(f.commands,f.s,readMaintenanceServiceConfiguration(f.s)),wrapped=f.filter.configureService(source,null);assert.equal(source,null);assert.equal(wrapped,null);assert.equal(f.session(wrapped).available(),false);assert.deepEqual(f.calls,{profile:0,transport:0,identity:0});await unchanged(f,before);
});

test('MAIN-BASE exact Commands to Filter to Session retains original identity and first budget',async t=>{
 const f=await fixture(t),before=await semantic(f.s);assert.notEqual(f.wrapped,f.source);assert.equal(readAIFilterServiceSourceConfiguration(f.wrapped),f.source);assert.equal(f.wrapped.processing,f.source.processing);assert.ok(configuredMaintenanceTopicIdentityProcessing(f.source,f.s));assert.equal(configuredMaintenanceTopicIdentityProcessing(f.wrapped,f.s),null,'only the exact original source configuration owns the issuer');
 const {handle,result,error}=await run(f);assert.equal(error,undefined,error?.stack);assert.ok(handle.jobId);assert.notEqual(result.state,'COMMITTED');assert.equal(f.calls.profile,1,JSON.stringify(result));assert.ok(f.calls.identity>0);assert.ok(f.budgets.length>0);assert.ok(f.budgets.every(budget=>budget===f.budgets[0]&&budget.database===f.s.repository.db));await unchanged(f,before);
});

for(const mode of ['copied-source','copied-wrapper','modified-wrapper'])test('MAIN-BASE original assembly refuses '+mode+' without profile or attempt',async t=>{
 const f=await fixture(t),before=await semantic(f.s);let configuration;
 if(mode==='copied-source'){const copy={...f.source};assert.equal(configuredMaintenanceTopicIdentityProcessing(copy,f.s),null);configuration=f.filter.configureService(copy,null);assert.equal(readAIFilterServiceSourceConfiguration(configuration),copy);}
 if(mode==='copied-wrapper'){configuration={...f.wrapped};assert.equal(readAIFilterServiceSourceConfiguration(configuration),null);}
 if(mode==='modified-wrapper'){configuration=f.wrapped;configuration.service={...configuration.service,topic:{...configuration.service.topic}};assert.equal(readAIFilterServiceSourceConfiguration(configuration),null);}
 const {error,result}=await run(f,configuration);assert.ok(error||result.state!=='COMMITTED');assert.equal(f.calls.profile,0);await unchanged(f,before);
});

for(const mode of ['saved-OFF','independent-identity-denied'])test('MAIN-BASE wrapped source preserves '+mode+' as an independent refusal',async t=>{
 const f=await fixture(t,{enabled:mode!=='saved-OFF',identity:mode!=='independent-identity-denied'}),before=await semantic(f.s),work=await rows(f.s,'organizerWorkItems');
 assert.equal(readAIFilterServiceSourceConfiguration(f.wrapped),f.source);assert.ok(configuredMaintenanceTopicIdentityProcessing(f.source,f.s));
 const {error,result}=await run(f);assert.ok(error||result.state!=='COMMITTED');assert.equal(f.calls.profile,0);if(mode==='saved-OFF')assert.deepEqual(await rows(f.s,'organizerWorkItems'),work);else assert.ok(f.calls.identity>0);await unchanged(f,before);
});

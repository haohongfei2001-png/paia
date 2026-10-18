import test from 'node:test';
import assert from 'node:assert/strict';
import {setup} from './harness/thought-m1.mjs';
import {formationFixture,runFormation,rows,op,parameters,inputEdit} from './harness/topic-03.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {LocalMaintenanceSession} from '../core/ai-usage/local-maintenance-session.js';
import {AIUsageFoundation} from '../core/ai-usage/foundation.js';
import {ContextCardsService,CONTEXT_CARDS_ROW} from '../core/context-cards.js';
import {createMaintenanceHumanContextResponseMapper,MAINTENANCE_HUMAN_CONTEXT_RESPONSE_SCHEMA,validateMaintenanceHumanContextResponse} from '../core/ai-usage/maintenance-human-context-response.js';
import {MAINTENANCE_SERVICE_RESPONSE_SCHEMA} from '../core/ai-usage/maintenance-service-response-schema.js';
import {boundedSchema,snapshot} from '../core/ai-usage/qwen-request-data.js';
const read=(s,n,id)=>s.repository.transaction(false,t=>id?t.get(n,id):t.all(n));
const wire=refs=>[{operation:'ADD',ref:'',expectedRevision:0,card:'info',body:'SYNTHETIC source mapped Context',section:'Synthetic',coverageRefs:refs,temporal:[]}];

async function fixture(kind='authored',fields={title:'SYNTHETIC human title',note:'SYNTHETIC human note'}){
 const f=kind==='authored'?await setup(OrganizerStore):await formationFixture();await f.s.setFilterMode('off');let entry,topic,p,section;
 if(kind==='authored'){topic=await f.s.createTopic({name:'SYNTHETIC human Topic',operationId:op()});entry=await f.s.createEntry({actor:'user',operationId:op(),body:'SYNTHETIC authored body',...fields,type:'idea',formation:'explicit',evidence:[]});}
 else{await runFormation(f);entry=(await rows(f.s,'thoughts'))[0];topic=(await rows(f.s,'topics'))[0];p=(await rows(f.s,'placements'))[0];if(kind==='bound'){await f.s.editEntry({id:entry.id,expectedRevision:entry.revision,operationId:op(),changes:fields});entry=await read(f.s,'thoughts',entry.id);}}
 await f.s.placeEntry({topicId:topic.id,entryId:entry.id,expectedEntryRevision:entry.revision,expectedTopicRevision:(await f.s.topic(topic.id)).organizationRevision,...(p?{expectedPlacementRevision:p.revision}:{}),operationId:op()});
 p=(await rows(f.s,'placements')).find(p=>p.entryId===entry.id);section=(await rows(f.s,'sections')).find(s=>s.topicId===topic.id);
 if(kind==='section')await f.s.editSection({topicId:topic.id,sectionId:section.sectionId,expectedRevision:section.revision,title:'SYNTHETIC changed human Section',operationId:op()});
 if(kind==='topic')await f.s.renameTopic({id:topic.id,expectedRevision:(await read(f.s,'topics',topic.id)).revision,name:'SYNTHETIC changed human Topic',operationId:op()});
 const inputDelta=(await rows(f.s,'meta')).find(r=>r.id.startsWith('aiu:delta:pending:')&&r.descriptor.kind==='input'),cursor=kind==='section'?'aiu:delta:pending:'+JSON.stringify(['placement',p.id]):kind==='topic'?'aiu:delta:pending:["topic",':kind==='placement'?'aiu:delta:pending:["placement",':inputDelta.id;
 const options={scope:'synthetic-human-source',contractVersion:'synthetic-human-source-1',routeVersion:'synthetic-human-source-1',cursor},caller=Object.freeze({id:op()}),abort=new AbortController(),state={allowed:true,metadata:null,mapper:null,payloadHook:null,metadataHook:null,responseHook:null,afterDecode:null},calls=[],scopes=[],expiry=Date.now()+600000;
 const authority=async(_t,r)=>({allowed:true,consentEpoch:'synthetic-consent',principalId:'synthetic-principal',libraryId:'synthetic-library',jobTypes:['AI_MAINTENANCE'],scope:{evidenceKeys:r.evidenceKeys,coverage:r.coverage}});
 const processing={resolve:async(_t,scope)=>{scopes.push(structuredClone(scope));return {version:1,store:f.s,caller,scope:state.scopeHook?state.scopeHook(structuredClone(scope)):scope,epoch:'synthetic-processing',processing:state.allowed,expiresAt:expiry,revocationSignal:abort.signal};},isCurrent:()=>state.allowed&&!abort.signal.aborted};
 const verifier={verify:async(_caller,store,scope)=>({version:1,store,scope:state.ownerScopeHook?state.ownerScopeHook(structuredClone(scope)):scope,accountId:'synthetic-account',processorId:'synthetic-processor',authorizationGeneration:1,processing:state.allowed,expiresAt:expiry,revocationSignal:abort.signal}),isCurrent:()=>state.allowed&&!abort.signal.aborted};
 const foundation=new AIUsageFoundation(f.s,{resolveAuthority:authority});
 const provider={describe:()=>({providerId:'synthetic-human-source',version:'1',executionKind:'fixture'}),execute:async request=>{
  calls.push(structuredClone(request));const material=structuredClone(request.material);await state.payloadHook?.(material);
  state.mapper=createMaintenanceHumanContextResponseMapper(f.s,{material,coverage:request.coverage,read:fn=>foundation.read(fn),isCurrent:()=>state.allowed&&!abort.signal.aborted});
  const value=wire(request.coverage.filter(u=>u.facet==='context').map((_,i)=>'u'+i));await state.responseHook?.(value);return {accepted:true,operationReceiptId:'synthetic-'+request.childOperationId,value};
 }};
 const service={version:1,topic:{resolveProcessing:async(_t,r)=>({allowed:kind!=='authored',epoch:'synthetic-processing',inputIds:r.inputIds,topicIds:r.topicIds}),decisionVersion:'synthetic-1',parameters},context:{caller,processingVerifier:verifier},responseAdapter:{topic:async()=>{throw Error('Human coverage cannot invent Topic formation');},context:async(response,metadata,binding)=>{state.metadata=structuredClone(metadata);await state.metadataHook?.(metadata);const value=await state.mapper.decode(response.value,metadata);state.groups=structuredClone(value);await state.afterDecode?.(value);return {binding,value};}}};
 const make=()=>{let grant;return new LocalMaintenanceSession(f.s,{authority,processing,provider,service,window:{acquire:async r=>grant=Object.freeze({version:1,kind:'fixture',dayId:'synthetic-day',windowId:op(),reservationId:op(),tier:'free',requestDigest:r.requestDigest,revocationSignal:abort.signal}),isCurrent:r=>r===grant}});};
 return {...f,kind,entry,topic,p,section,options,caller,abort,state,calls,scopes,verifier,make,session:make()};
}
const acks=async f=>(await rows(f.s,'organizerWorkItems')).filter(r=>r.state==='ACKNOWLEDGED');
const owned=s=>Promise.all(['records','blocks','thoughts','topics','sections','placements'].map(n=>rows(s,n)));
async function execute(f){try{return await f.session.run(await f.session.prepare(f.options));}finally{f.session.dispose();}}

for(const kind of ['authored','bound','placement','section','topic'])test('human source mapper '+kind+' uses actual original session and Context transaction',async()=>{
 const f=await fixture(kind),before=await owned(f.s),result=await execute(f);assert.equal(result.processedState??result.state,'COMMITTED',JSON.stringify(result));assert.equal(f.calls.length,1);const items=(await read(f.s,'meta',CONTEXT_CARDS_ROW)).items;assert.equal(items.length,1);assert.equal(items[0].body,'SYNTHETIC source mapped Context');assert.deepEqual(await owned(f.s),before);assert.ok((await acks(f)).every(a=>a.unit.facet==='context'));assert.ok((await acks(f)).length>0);
 const evidence=items[0].maintenance.provenance.evidence;if(kind==='authored'){assert.equal(evidence[0].kind,'humanEntry');assert.equal(f.calls[0].material.inputs.length,0);}if(kind==='bound'){assert.equal(evidence.length,2);assert.ok(evidence.some(e=>e.kind==='boundEntry'));assert.ok(evidence.some(e=>!e.kind&&e.selectedFields[0]==='body'));}if(kind==='section')assert.ok(evidence.every(e=>e.humanSection));if(kind==='topic')assert.ok(evidence.every(e=>e.humanTopic));
});

for(const [field,value]of [['note',''],['title','']])test('source mapper preserves deliberately cleared '+field,async()=>{
 const f=await fixture('authored'),row=await read(f.s,'thoughts',f.entry.id);await f.s.editEntry({id:row.id,expectedRevision:row.revision,operationId:op(),changes:{[field]:value}});const result=await execute(f);assert.equal(result.processedState,'COMMITTED',JSON.stringify(result));assert.equal(f.calls[0].material.authoredEntries[0].fields[field],'');assert.ok((await read(f.s,'meta',CONTEXT_CARDS_ROW)).items[0].maintenance.provenance.evidence[0].selectedFields.includes(field));
});
for(const defect of ['omit-field','extra-field','old-operation','different-topic','foreign-ref','duplicate-ref','receipt-id','item-id'])test('source mapper refuses '+defect+' with zero Context publication or ACK',async()=>{
 const f=await fixture('authored');if(['omit-field','extra-field','old-operation','different-topic'].includes(defect))f.state.metadataHook=metadata=>{const m=metadata.authoredEntries[0];if(defect==='omit-field'){m.selectedFields=['body'];for(const k of ['fieldRevisions','fieldOperationIds','fieldDigests'])delete m[k].note;}if(defect==='extra-field')m.fieldDigests.type='a'.repeat(64);if(defect==='old-operation')m.fieldOperationIds.note=op();if(defect==='different-topic')m.topicId=op();};else f.state.responseHook=value=>{if(defect==='foreign-ref')value[0].coverageRefs=['u99'];if(defect==='duplicate-ref')value[0].coverageRefs=['u0','u0'];if(defect==='receipt-id')value[0].operationReceiptId=op();if(defect==='item-id')value[0].itemId=op();};
 const result=await execute(f);assert.notEqual(result.processedState,'COMMITTED',JSON.stringify(result));assert.equal((await acks(f)).length,0);assert.equal((await read(f.s,'meta',CONTEXT_CARDS_ROW))?.items.length??0,0);
});
for(const kind of ['authored','bound'])for(const boundary of ['payload','owner'])test(kind+' independent field '+boundary+' grant cannot be narrowed',async()=>{
 const f=await fixture(kind);f.state[boundary==='payload'?'scopeHook':'ownerScopeHook']=scope=>{scope[kind==='authored'?'authoredEntries':'boundEntries'][0].selectedFields=['title'];return scope;};const result=await execute(f);assert.notEqual(result.processedState,'COMMITTED');assert.equal(f.calls.length,boundary==='payload'?0:1);assert.equal((await acks(f)).length,0);
});
for(const kind of ['authored','bound','placement','section','topic'])test(kind+' source mapper rejects a changed original owner after response',async()=>{
 const f=await fixture(kind);f.state.metadataHook=async()=>f.s.repository.transaction(true,async t=>{if(kind==='authored'||kind==='bound'){const e=await t.get('thoughts',f.entry.id);e.note='SYNTHETIC late unsent note';await t.put('thoughts',e);}else if(kind==='placement'){const journal=await t.edge('revisions','byList',IDBKeyRange.bound(['placement:'+f.p.id],['placement:'+f.p.id,[]]),'prev');journal.operationId=op();await t.put('revisions',journal);}else{const n=kind==='topic'?'topics':'sections',id=kind==='topic'?f.topic.id:f.section.id,row=await t.get(n,id);row[kind==='topic'?'name':'title']='SYNTHETIC late unsent label';await t.put(n,row);}});const result=await execute(f);assert.notEqual(result.processedState,'COMMITTED');assert.equal((await acks(f)).length,0);assert.equal((await read(f.s,'meta',CONTEXT_CARDS_ROW))?.items.length??0,0);
});
for(const kind of ['bound','placement','section','topic'])test(kind+' source mapper rejects late original Input edit',async()=>{
 const f=await fixture(kind);f.state.metadataHook=()=>inputEdit(f.s,f.entry.workingInputId,{libraryText:'SYNTHETIC late original body'});const result=await execute(f);assert.notEqual(result.processedState,'COMMITTED');assert.equal((await acks(f)).length,0);
});
for(const kind of ['authored','bound'])test(kind+' final original Context transaction refuses late human field drift',async()=>{
 const f=await fixture(kind),tx=f.s.repository.transaction.bind(f.s.repository);let hit=false;
 f.s.repository.transaction=(write,fn,...rest)=>tx(write,async t=>{if(write){const put=t.put.bind(t);t.put=async(n,row,...args)=>{const result=await put(n,row,...args);if(!hit&&n==='meta'&&row.id===CONTEXT_CARDS_ROW){hit=true;const e=await t.get('thoughts',f.entry.id);e.note='SYNTHETIC final stale note';await put('thoughts',e);}return result;};}return fn(t);},...rest);
 try{const result=await execute(f);assert.equal(hit,true);assert.notEqual(result.processedState,'COMMITTED');assert.equal((await acks(f)).length,0);assert.equal((await read(f.s,'meta',CONTEXT_CARDS_ROW))?.items.length??0,0);}finally{f.s.repository.transaction=tx;}
});
test('closed human schema composes within the unchanged complete manifest and schema depths',()=>{
 const schema={...MAINTENANCE_SERVICE_RESPONSE_SCHEMA,properties:{...MAINTENANCE_SERVICE_RESPONSE_SCHEMA.properties,context:MAINTENANCE_HUMAN_CONTEXT_RESPONSE_SCHEMA}};boundedSchema(schema);snapshot({wire:{responseFormat:{json_schema:{name:'synthetic-human',strict:true,schema}}}});assert.doesNotMatch(JSON.stringify(MAINTENANCE_HUMAN_CONTEXT_RESPONSE_SCHEMA),/permission|receipt|associationId|inputId|itemId|anyOf|oneOf/);
 for(const modify of [v=>delete v[0].ref,v=>v[0].coverageRefs.push('u0'),v=>v[0].body='\ud800',v=>v[0].temporal=[{}]]){const v=wire(['u0']);modify(v);if(v[0].coverageRefs.length===2)continue;assert.throws(()=>validateMaintenanceHumanContextResponse(v));}
});
test('a cloned sent correction proof cannot become the original private Context correction witness',async()=>{
 const f=await fixture('authored');f.state.payloadHook=material=>material.contextItems=[{proof:{kind:'text_edit'}}];const result=await execute(f);assert.notEqual(result.processedState,'COMMITTED');assert.equal((await acks(f)).length,0);
});
test('existing human Item operations fail closed without authentic independently granted original witness',async()=>{
 for(const operation of ['UPDATE','NO_CHANGE']){const f=await fixture('authored');f.state.responseHook=value=>Object.assign(value[0],{operation,ref:'c0',expectedRevision:1,...(operation==='NO_CHANGE'?{body:'',section:''}:{})});const result=await execute(f);assert.notEqual(result.processedState,'COMMITTED');assert.equal((await acks(f)).length,0);}
});
for(const state of ['removed','corrected'])test('mapper precheck refuses fresh identity over '+state+' human-derived Item',async()=>{
 const f=await fixture('authored');assert.equal((await execute(f)).processedState,'COMMITTED');const item=(await read(f.s,'meta',CONTEXT_CARDS_ROW)).items[0],cards=new ContextCardsService(f.s);
 await cards.change(state==='removed'?{kind:'delete',operationId:op(),epoch:'initial',itemId:item.id,expectedRevision:item.revision}:{kind:'put',operationId:op(),epoch:'initial',itemId:item.id,expectedRevision:item.revision,card:item.card,body:'SYNTHETIC human correction',section:'Human'});
 const request=f.calls[0],mapper=createMaintenanceHumanContextResponseMapper(f.s,{material:request.material,coverage:request.coverage,read:fn=>f.s.repository.transaction(false,fn),isCurrent:()=>true});await assert.rejects(mapper.decode(wire(['u0']),f.state.metadata),{code:'STALE_BASE'});mapper.dispose();assert.equal((await read(f.s,'meta',CONTEXT_CARDS_ROW)).items.length,1);
});
test('mapper caches one command identity and refuses changed interpretation or disposal',async()=>{
 const f=await fixture('authored');f.state.afterDecode=async groups=>{const repeated=await f.state.mapper.decode(wire(['u0']),f.state.metadata);assert.deepEqual(repeated,groups);repeated[0].change.itemId=op();assert.deepEqual(await f.state.mapper.decode(wire(['u0']),f.state.metadata),groups);const changed=wire(['u0']);changed[0].body+=' changed';assert.throws(()=>f.state.mapper.decode(changed,f.state.metadata),{code:'STALE_BASE'});};assert.equal((await execute(f)).processedState,'COMMITTED');f.state.mapper.dispose();assert.throws(()=>f.state.mapper.decode(wire(['u0']),f.state.metadata),{code:'STALE_BASE'});
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {organizeServiceFixture} from '../../services/ai-gateway/tests/organize-client-fixture.mjs';
import {AI_FIELDS,AI_LIST_FIELDS} from '../core/organizer/ai-contract.js';
import {rows} from './harness/original-complete.mjs';
import {createOrganizeActionSource} from '../background/organize-action-source.js';
import {createConfiguredOrganizeRunner} from '../core/organizer/configured-organize-runner.js';
const event=()=>({addListener(){},removeListener(){}});
async function fixture(t,options={}){
 const f=await organizeServiceFixture(t,options),sender={id:'synthetic',frameId:0,documentId:'document',url:'chrome-extension://synthetic/ui/archive.html',tab:{id:1,windowId:2,incognito:false}};
 const api={runtime:{id:sender.id,getURL:p=>'chrome-extension://synthetic/'+p,async getContexts(){return [{contextType:'TAB',documentId:sender.documentId,documentUrl:sender.url,tabId:1,windowId:2,frameId:0,incognito:false}];}},tabs:{onUpdated:event(),onRemoved:event(),async get(){return {...sender.tab,url:sender.url};}}};
 const source=createOrganizeActionSource(f.s,api),runner=createConfiguredOrganizeRunner(f.s,f.configuration,{actionSource:source});t.after(()=>source.dispose());
 return {...f,runner,run:async()=>{const scope=await runner.handle({type:'GET_AI_PRESENTATION_SCOPE',options:{topicId:f.topic.id}},sender);return runner.handle({type:'UPDATE_AI_PRESENTATION',topicId:f.topic.id,scopeBinding:scope.scopeBinding,userActionId:crypto.randomUUID()},sender);}};
}
const current=async f=>(await rows(f.s,'meta')).find(r=>r.id==='aiPresentation:'+f.topic.id);
const journal=async f=>(await rows(f.s,'revisions')).filter(r=>r.kind==='ai_presentation');
const acks=async f=>(await rows(f.s,'organizerWorkItems')).filter(r=>r.state==='ACKNOWLEDGED');
async function add(f){const e=await f.s.createEntry({actor:'user',operationId:crypto.randomUUID(),body:'SYNTHETIC additional evidence',type:'idea',formation:'explicit',evidence:[]});await f.s.placeEntry({topicId:f.topic.id,entryId:e.id,expectedEntryRevision:e.revision,expectedTopicRevision:(await f.s.topic(f.topic.id)).organizationRevision,operationId:crypto.randomUUID()});return e;}
async function protect(f){const before=await current(f);await f.s.editAIPresentation({topicId:f.topic.id,expectedRevision:before.revision,field:'currentView',value:'Human exact 👩🏽‍💻\n  spacing',operationId:crypto.randomUUID()});return current(f);}
test('fresh action publishes one AI revision and durable receipt; repeated current request makes no new call or journal',async t=>{
 const f=await fixture(t),result=await f.run();assert.equal(result.currentPublished,true,JSON.stringify(result));const before=await current(f),j=await journal(f),usage=await rows(f.s,'organizerUsage');assert.equal(before.revision,1);assert.equal(before.candidate,undefined);assert.equal(j.length,1);assert.equal(j[0].actor,'ai');
 const receipts=(await rows(f.s,'operationReceipts')).filter(r=>r.id.startsWith('ai-presentation-current:'));assert.equal(receipts.length,1);assert.equal(receipts[0].result.revision,1);assert.equal(receipts[0].result.currentPublished,true);assert.equal(usage.length,1);assert.equal(usage[0].financialSettlement.settledSpendMicros,120);
 const again=await f.run();assert.equal(again.completed,true,JSON.stringify(again));assert.ok(again.noDelta||again.cached,JSON.stringify(again));assert.equal(f.physical(),1);assert.deepEqual(await current(f),before);assert.deepEqual(await journal(f),j);assert.deepEqual(await rows(f.s,'organizerUsage'),usage);
});
test('new exact result publishes only lawful fields and keeps human bytes and provenance',async t=>{
 const f=await fixture(t);assert.equal((await f.run()).currentPublished,true);const before=await protect(f),e=await add(f),result=await f.run();assert.equal(result.currentPublished,true,JSON.stringify(result));const after=await current(f);assert.equal(after.revision,before.revision+1);assert.equal(after.projection.currentView,before.projection.currentView);assert.deepEqual(after.manifest.fields.currentView,before.manifest.fields.currentView);assert.deepEqual(after.manifest.blocks.filter(b=>b.field==='currentView'),before.manifest.blocks.filter(b=>b.field==='currentView'));assert.deepEqual(after.protections,before.protections);assert.equal(after.projection.blockSummary,'SYNTHETIC additional evidence');assert.deepEqual(f.payload().inputs.map(x=>x.ref),[e.id]);assert.ok(!f.payload().writableFields.includes('currentView'));assert.equal(f.physical(),2);assert.equal((await journal(f)).filter(r=>r.actor==='ai').length,2);
});
test('provider targets a protected field: preserve current, journal and ACK while retaining paid attempt',async t=>{
 const f=await fixture(t,{responseField:'currentView'});assert.equal((await f.run()).currentPublished,true);const before=await protect(f);await add(f);const j=await journal(f),a=await acks(f),result=await f.run();assert.ok(result.error,JSON.stringify(result));assert.deepEqual(await current(f),before);assert.deepEqual(await journal(f),j);assert.deepEqual(await acks(f),a);assert.equal(f.physical(),2);const attempts=await rows(f.s,'organizerUsage');assert.equal(attempts.length,2);assert.ok(attempts.every(r=>r.financialSettlement.settledSpendMicros===120));
});
test('journal write failure rolls back current, receipt, checkpoint and ACK as one transaction',async t=>{
 const f=await fixture(t);assert.equal((await f.run()).currentPublished,true);await add(f);const before=await current(f),j=await journal(f),a=await acks(f),cp=(await rows(f.s,'meta')).find(r=>r.id==='aiOrganizerCheckpoint'),receipts=(await rows(f.s,'operationReceipts')).filter(r=>r.id.startsWith('ai-presentation-current:'));
 const original=f.s.pruneEntity.bind(f.s);f.s.pruneEntity=async(tx,key)=>{if(key==='ai_presentation:'+f.topic.id)throw Error('SYNTHETIC journal failure');return original(tx,key);};const result=await f.run();assert.ok(result.error,JSON.stringify(result));assert.deepEqual(await current(f),before);assert.deepEqual(await journal(f),j);assert.deepEqual(await acks(f),a);assert.deepEqual((await rows(f.s,'meta')).find(r=>r.id==='aiOrganizerCheckpoint'),cp);assert.deepEqual((await rows(f.s,'operationReceipts')).filter(r=>r.id.startsWith('ai-presentation-current:')),receipts);assert.equal(f.physical(),2);
});

for(const mutation of ['after-image','revoke'])test('final '+mutation+' refuses all fresh Current writes and keeps original paid evidence',async t=>{
 const f=await fixture(t);assert.equal((await f.run()).currentPublished,true);await add(f);const before=await current(f),j=await journal(f),a=await acks(f),prune=f.s.pruneEntity.bind(f.s);let injected=false;
 f.s.pruneEntity=async(tx,key)=>{await prune(tx,key);if(key!=='ai_presentation:'+f.topic.id)return;injected=true;if(mutation==='revoke')f.revoke();else{const row=await tx.get('meta','aiPresentation:'+f.topic.id);await tx.put('meta',{...row,projection:{...row.projection,currentView:'SYNTHETIC unrelated late edit'}});}};
 const result=await f.run();assert.ok(injected);assert.ok(result.error,JSON.stringify(result));assert.deepEqual(await current(f),before);assert.deepEqual(await journal(f),j);assert.deepEqual(await acks(f),a);assert.equal(f.physical(),2);assert.equal((await rows(f.s,'organizerUsage')).length,2);
});
for(const mutation of ['edit','source'])test('concurrent '+mutation+' wins over a late provider result without stale publication',async t=>{
 let f,enabled=false,snapshot;f=await fixture(t,{afterResponse:async()=>{if(!enabled)return;enabled=false;if(mutation==='edit')await protect(f);else await f.s.editEntry({id:f.entries[0].id,expectedRevision:(await f.s.entry(f.entries[0].id)).revision,changes:{body:'SYNTHETIC changed original evidence'},operationId:crypto.randomUUID()});snapshot=await current(f);}});
 assert.equal((await f.run()).currentPublished,true);await add(f);const a=await acks(f);enabled=true;const result=await f.run();assert.ok(snapshot);assert.ok(result.error,JSON.stringify(result));assert.deepEqual(await current(f),snapshot);assert.deepEqual(await acks(f),a);assert.equal((await journal(f)).filter(r=>r.actor==='ai').length,1);assert.equal(f.physical(),2);
});

test('twelve fresh Current commits retire active jobs without duplicate requests, revisions or charge',async t=>{
 const f=await fixture(t);for(let i=0;i<12;i++){if(i)await add(f);const result=await f.run();assert.equal(result.currentPublished,true,JSON.stringify({i,result}));assert.equal(result.revision,i+1);assert.equal(f.physical(),i+1);}const jobs=await rows(f.s,'organizerJobs');assert.equal(jobs.length,12);assert.ok(jobs.every(j=>j.state==='COMMITTED'));assert.equal((await journal(f)).filter(r=>r.actor==='ai').length,12);const usage=await rows(f.s,'organizerUsage');assert.equal(usage.length,12);assert.ok(usage.every(r=>r.attemptCount===1&&r.financialSettlement.settledSpendMicros===120));const before=await current(f);const again=await f.run();assert.equal(again.completed,true,JSON.stringify(again));assert.ok(again.noDelta||again.cached,JSON.stringify(again));assert.deepEqual(await current(f),before);assert.equal(f.physical(),12);
});

for(const pending of [false,true])test('fully protected Current distinguishes '+(pending?'pending material':'genuine no-delta')+' without new writes or spending',async t=>{
 const f=await fixture(t,{responseFields:AI_FIELDS});assert.equal((await f.run()).currentPublished,true);
 for(const field of AI_FIELDS){const before=await current(f);await f.s.editAIPresentation({topicId:f.topic.id,expectedRevision:before.revision,field,value:AI_LIST_FIELDS.includes(field)?[{text:'Human '+field,evidenceEntryIds:[f.entries[0].id]}]:'Human '+field,operationId:crypto.randomUUID()});}
 if(pending)await add(f);await f.s.finishFoundation();
 const tables=['meta','revisions','organizerJobs','organizerUsage','operationReceipts','organizerWorkItems'],before=Object.fromEntries(await Promise.all(tables.map(async name=>[name,await rows(f.s,name)]))),calls=f.physical();
 const result=await f.run();assert.equal(result.completed,!pending,JSON.stringify(result));assert.equal(result.noDelta,!pending,JSON.stringify(result));assert.equal(result.blockedReason,pending?'PROTECTED_FIELDS':undefined);assert.equal(result.requestCount,0);assert.equal(f.physical(),calls);
 for(const name of tables)assert.deepEqual(await rows(f.s,name),before[name],name+' must preserve pending coverage and human content');
});

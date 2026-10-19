import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {maintenanceSectionPromotionSourceFixture} from './maintenance-section-promotion-source-fixture.mjs';
import {createMaintenanceRunner,readMaintenanceRunnerSession} from '../../../extension/core/ai-usage/maintenance-runner.js';
import {TopicSectionPromotionCommands} from '../../../extension/background/topic-section-promotion-commands.js';
import {maintenanceSectionPromotionWorker} from './maintenance-section-promotion-worker-fixture.mjs';

const read=(s,table)=>s.repository.transaction(false,t=>t.all(table));
async function workerGateway(f,runner){
 const url='chrome-extension://synthetic/ui/archive.html',sender={id:'synthetic',frameId:0,documentId:'original-runner-archive-document',documentLifecycle:'active',url,tab:{id:4,windowId:2,incognito:false}},api={runtime:{id:'synthetic',getURL:path=>'chrome-extension://synthetic/'+path,getContexts:async()=>[{contextType:'TAB',tabId:4,windowId:2,frameId:0,documentId:sender.documentId,documentUrl:url,incognito:false}]},tabs:{get:async()=>({id:4,windowId:2,incognito:false,url})}};
 // Execute the exact original worker assembly statement with its genuine
 // source runner, store and owner. No session is injected by this fixture.
 const source=await readFile(new URL('../../../extension/background/service-worker.js',import.meta.url),'utf8'),lines=source.split('\n').filter(line=>line.startsWith('const sectionPromotion='));assert.equal(lines.length,1);
 api.storage={session:{get:async()=>({}),set:async()=>{}}};
 const owner=vm.runInNewContext(lines[0]+'\nsectionPromotion;',{TopicSectionPromotionCommands,readMaintenanceRunnerSession,maintenanceRunner:runner,store:f.s,chrome:api});
 return {owner,call:(command,payload={})=>owner.handle({type:'PAIA_LIBRARY_SECTION_PROMOTION',command,...payload},sender)};
}
test('original runner opportunity reaches one paid child and the exact worker Archive assembly confirms its genuine Section offer',async t=>{
 const f=await maintenanceSectionPromotionSourceFixture(t);f.session.dispose();const runner=createMaintenanceRunner(f.s,f.configuration);t.after(()=>runner.dispose());
 const before={topics:await read(f.s,'topics'),entries:await read(f.s,'thoughts')},transaction=f.s.repository.transaction.bind(f.s.repository);let reads=0;
 f.s.repository.transaction=(...args)=>{reads++;return transaction(...args);};
 const session=readMaintenanceRunnerSession(runner,f.s);assert.ok(session);assert.notEqual(session,f.session);assert.equal(reads,0);const g=await workerGateway(f,runner);assert.equal(reads,0);assert.equal(f.physical(),0);f.s.repository.transaction=transaction;
 const opportunity=await runner.wake();assert.ok(['DEFERRED','COMMITTED','PARTIAL','NO_CHANGE'].includes(opportunity.state),JSON.stringify(opportunity));assert.equal(f.physical(),1);
 const prepared=await g.call('proposal',{request:{topicId:f.topic.id,sectionId:f.section.sectionId}});assert.equal(prepared.state,'prepared');assert.equal(prepared.preview.wholeSection,true);assert.equal(prepared.preview.selectedCount,2);assert.deepEqual(await read(f.s,'topics'),before.topics);
 const committed=await g.call('confirm',{token:prepared.token,confirmed:true});assert.equal(committed.state,'committed');assert.equal(committed.operationId,prepared.operationId);assert.equal((await read(f.s,'topics')).length,before.topics.length+1);for(const old of before.entries){const now=(await read(f.s,'thoughts')).find(x=>x.id===old.id);assert.equal(now.thoughtText,old.thoughtText);assert.deepEqual(now.bodyBinding,old.bodyBinding);}assert.equal(f.physical(),1);assert.equal(f.calls.filter(x=>x.path==='/api/provider').length,1);assert.equal((await g.call('proposal',{request:{topicId:f.topic.id,sectionId:f.section.sectionId}})).state,'pending');assert.deepEqual(await g.call('acknowledge',{token:committed.checkpointToken}),{state:'acknowledged'});assert.deepEqual(await g.call('proposal',{request:{topicId:f.topic.id,sectionId:f.section.sectionId}}),{state:'none'});
});
test('original runner session capability rejects replacement, foreign ownership, disposal and a public availability override',async t=>{
 const f=await maintenanceSectionPromotionSourceFixture(t);f.session.dispose();const runner=createMaintenanceRunner(f.s,f.configuration);t.after(()=>runner.dispose());const session=readMaintenanceRunnerSession(runner,f.s);assert.ok(session);
 assert.throws(()=>readMaintenanceRunnerSession({...runner},f.s),e=>e.code==='UNAVAILABLE');assert.throws(()=>readMaintenanceRunnerSession(runner,{repository:f.s.repository}),e=>e.code==='UNAVAILABLE');
 const repository=f.s.repository;try{f.s.repository={db:repository.db};assert.throws(()=>readMaintenanceRunnerSession(runner,f.s),e=>e.code==='STALE_BASE');}finally{f.s.repository=repository;}
 const database=repository.db;try{repository.db={};assert.throws(()=>readMaintenanceRunnerSession(runner,f.s),e=>e.code==='STALE_BASE');}finally{repository.db=database;}
 session.available=()=>true;f.revoke();assert.equal(readMaintenanceRunnerSession(runner,f.s),null);runner.dispose();assert.throws(()=>readMaintenanceRunnerSession(runner,f.s),e=>e.code==='UNAVAILABLE');assert.equal(f.physical(),0);assert.equal(f.calls.length,0);
});

async function offered(worker,f){
 const request={type:'PAIA_LIBRARY_SECTION_PROMOTION',command:'proposal',request:{topicId:f.topic.id,sectionId:f.section.sectionId}},deadline=performance.now()+10000;
 for(;;){const result=await worker.send(request,worker.sender);assert.equal(result.ok,true,JSON.stringify(result));if(result.data.state==='prepared')return result.data;if(performance.now()>=deadline)assert.fail(JSON.stringify({result,calls:f.calls.map(r=>r.path),physical:f.physical(),jobs:await read(f.s,'organizerJobs')}));await new Promise(resolve=>setTimeout(resolve,20));}
}
for(const mode of ['confirm','resume'])test('the actual cold worker startup retains its original runner proposal through '+mode+' and broadcasts the committed Archive change once',async t=>{
 const f=await maintenanceSectionPromotionSourceFixture(t);f.session.dispose();const before=(await read(f.s,'topics')).length,worker=await maintenanceSectionPromotionWorker(t,f);assert.equal(worker.coldAtConstruction,true);assert.notEqual(worker.store,f.s);
 const proposal=await offered(worker,f);assert.equal(proposal.preview.wholeSection,true);assert.equal(proposal.preview.selectedCount,2);assert.equal(f.physical(),1);const notices=()=>worker.notices.filter(r=>r.type==='ARCHIVE_CHANGED'&&r.cause==='PAIA_LIBRARY_SECTION_PROMOTION');
 assert.equal(notices().length,0);const paidBefore=structuredClone(f.server.saved());let command='confirm',payload={token:proposal.token,confirmed:true};
 if(mode==='resume'){
  const write=worker.store.foundationWrite.bind(worker.store);let lost=0;worker.store.foundationWrite=async fn=>{const result=await write(fn);if(!lost&&result?.workId==='personal-topic-promotion:'+proposal.operationId){lost++;throw Object.assign(Error('synthetic original confirm committed with return lost'),{code:'OUTCOME_UNKNOWN'});}return result;};
  const unknown=await worker.send({type:'PAIA_LIBRARY_SECTION_PROMOTION',command,...payload},worker.sender);assert.equal(unknown.ok,false);assert.equal(lost,1);assert.equal(notices().length,0);worker.store.foundationWrite=write;command='proposal_resume';payload={operationId:proposal.operationId};
 }
 const result=await worker.send({type:'PAIA_LIBRARY_SECTION_PROMOTION',command,...payload},worker.sender);assert.equal(result.ok,true,JSON.stringify(result));assert.equal(result.data.state,'committed');assert.equal(result.data.operationId,proposal.operationId);assert.equal((await read(f.s,'topics')).length,before+1);assert.equal(f.physical(),1);assert.equal(f.calls.filter(r=>r.path==='/api/provider').length,1);await new Promise(setImmediate);assert.equal(notices().length,1);
 const lookup=await worker.send({type:'PAIA_LIBRARY_SECTION_PROMOTION',command:'proposal_result',operationId:proposal.operationId},worker.sender);assert.equal(lookup.ok,true,JSON.stringify(lookup));assert.equal(lookup.data.state,'committed');await new Promise(setImmediate);assert.equal(notices().length,1,'read-only result lookup sends no mutation notice');assert.equal(f.physical(),1);assert.ok(worker.identityObservations()>0,'recovery uses the actual signed source identity channel');assert.deepEqual(f.server.saved(),paidBefore);
});

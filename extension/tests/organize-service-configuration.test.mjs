import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {setup} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';

test('original Organize RPC has a configured LocalOrganizeSession owner and remains default off',async()=>{
 const {createConfiguredOrganizeRunner}=await import('../core/organizer/configured-organize-runner.js');
 const f=await setup(OrganizerStore),runner=createConfiguredOrganizeRunner(f.s);
 assert.equal(runner.available(),false);
 await assert.rejects(runner.handle({type:'UPDATE_AI_PRESENTATION',topicId:'synthetic',userActionId:'synthetic',scopeBinding:'a'.repeat(64)}),{code:'AI_SERVICE_UNAVAILABLE'});
 const worker=await readFile(new URL('../background/service-worker.js',import.meta.url),'utf8');
 assert.match(worker,/async function initializeApplicationServices\(\)\{[\s\S]*store=await selectOriginalApplicationStore\(chrome\.storage\.local,\{aiFilterAuthority:aiFilterRuntime\.authority\}\);/);
 assert.match(worker,/organizeConfiguration=readOrganizeServiceConfiguration\(\);/);
 assert.match(worker,/organizeActionSource=organizeConfiguration===null\?null:createOrganizeActionSource\(store,startupEvents\);/);
 assert.match(worker,/aiOrganizer=createConfiguredOrganizeRunner\(store,organizeConfiguration,\{actionSource:organizeActionSource\}\);/);
 assert.match(worker,/case 'UPDATE_AI_PRESENTATION': return aiOrganizer.handle\(request,sender\)/);
 assert.match(worker,/case 'GET_AI_PRESENTATION_SCOPE': return aiOrganizer.handle\(request,sender\)/);
 assert.doesNotMatch(worker,/new AIPresentationRunner\(/);
});

test('qualified static route and exact dynamic Organize request key have separate original job identities',async()=>{
 const {AIUsageFoundation}=await import('../core/ai-usage/foundation.js'),f=await setup(OrganizerStore);
 const e=await f.s.createEntry({actor:'user',operationId:crypto.randomUUID(),body:'SYNTHETIC request key',type:'idea',formation:'explicit',evidence:[]});
 const ai=new AIUsageFoundation(f.s,{resolveAuthority:async(_t,r)=>({allowed:true,principalId:'synthetic',libraryId:'synthetic',consentEpoch:'synthetic',jobTypes:['AI_ORGANIZE'],scope:{evidenceKeys:r.evidenceKeys,coverage:r.coverage}})}),key=JSON.stringify(['library_entry',e.id]),{items}=await ai.describe({keys:[key]}),base={type:'AI_ORGANIZE',intent:'explicit',items,coverage:[{key,facet:'organize',scope:'synthetic-topic'}],contractVersion:'synthetic-contract',routeVersion:'qualified-static-route',organizeRequestKey:'a'.repeat(64)};
 const first=await ai.plan(base);await ai.cancel(first.id);const second=await ai.plan({...base,organizeRequestKey:'b'.repeat(64)});assert.notEqual(first.id,second.id);
 const saved=await ai.read(t=>ai.job(t,second.id));assert.equal(saved.routeVersion,'qualified-static-route');assert.equal(saved.organizeRequestKey,'b'.repeat(64));
 for(const organizeRequestKey of [null,'a'.repeat(63),'A'.repeat(64),1]){
  await assert.rejects(ai.plan({...base,organizeRequestKey}),{code:'INVALID_REQUEST'});
  await ai.write(t=>t.put('organizerJobs',{...saved,organizeRequestKey}));await assert.rejects(ai.read(t=>ai.job(t,saved.id)),{code:'INVALID_REQUEST'});
 }
 for(const type of ['AI_MAINTENANCE','AI_ASSIST']){
  await assert.rejects(ai.plan({...base,type}),{code:'INVALID_REQUEST'});
  await ai.write(t=>t.put('organizerJobs',{...saved,type}));await assert.rejects(ai.read(t=>ai.job(t,saved.id)),{code:'INVALID_REQUEST'});
 }
 await ai.write(t=>t.put('organizerJobs',saved));await ai.cancel(second.id);const {organizeRequestKey,...legacy}=base,old=await ai.plan(legacy),oldStored=await ai.read(t=>ai.job(t,old.id));
 assert.equal(Object.hasOwn(oldStored,'organizeRequestKey'),false);assert.equal((await ai.plan(legacy)).id,old.id);
});

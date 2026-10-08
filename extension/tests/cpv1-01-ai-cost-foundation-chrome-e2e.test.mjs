import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {FakeChatGPT} from './harness/fake-chatgpt.mjs';
const source=fileURLToPath(new URL('..',import.meta.url));
async function attach(page){return page.evaluate(async()=>{
 const {OrganizerStore}=await import(chrome.runtime.getURL('core/organizer/store.js'));
 const {AIUsageFoundation}=await import(chrome.runtime.getURL('core/ai-usage/foundation.js'));
 const storage={async get(key){return {[key]:JSON.parse(sessionStorage.getItem('aiu-synthetic-local')||'{}')[key]};},async set(value){sessionStorage.setItem('aiu-synthetic-local',JSON.stringify({...JSON.parse(sessionStorage.getItem('aiu-synthetic-local')||'{}'),...value}));}};
 const s=new OrganizerStore(storage,{name:'aiu-synthetic-native'});
 const options={resolveAuthority:async(_t,r)=>({allowed:true,principalId:'synthetic-principal',libraryId:'synthetic-library',consentEpoch:'synthetic-consent',jobTypes:['AI_MAINTENANCE'],scope:{evidenceKeys:r.evidenceKeys,coverage:r.coverage}}),committers:{topic:async(t,r)=>{await t.put('meta',{id:'synthetic-topic-owner',committed:true});return {committed:true,coverage:r.units};},context:async(t,r)=>{await t.put('meta',{id:'synthetic-context-owner',committed:true});return {committed:true,coverage:r.units};}}};
 globalThis.__aiu={s,ai:new AIUsageFoundation(s,options),options};
 return {defaultDenied:s.aiUsageFoundation.resolveAuthority===null};
});}
for(const label of ['source','release'])test(`AI-COST-01 ${label} native IndexedDB atomic delta, facet holes and page-reload unknown-attempt fence`,{timeout:120000},async()=>{
 let release=null,h;
 try{
  if(label==='release'){release=mkdtempSync(join(tmpdir(),'paia-ai-cost-foundation-'));execFileSync('python3',['scripts/build_current_release.py',release],{cwd:source,stdio:'pipe'});}
  h=await FakeChatGPT.start({extensionPath:release||source,onboarding:true});const p=h.archive;
  assert.deepEqual(await attach(p),{defaultDenied:true});
  const initial=await p.evaluate(async()=>{
   const {s,ai}=__aiu;await s.consent(true);const epoch=(await s.status()).epoch;
   for(let i=0;i<100;i++)await s.capture({epoch,adapterVersion:'0.3.0',chat:{id:'aiu-native-chat',url:'https://chatgpt.com/c/aiu-native-chat',title:'Synthetic'},messages:[{sourceMessageId:'aiu-native-'+i,pageOrder:i+1,originalText:'NATIVE_PRIVATE_BODY_'+i}]});
   const pages=[];let cursor=null;do{const result=await ai.collect({cursor,limit:19});pages.push(...result.items);cursor=result.nextCursor;}while(cursor);
   const items=pages.slice(0,2),coverage=items.flatMap(i=>[{key:i.key,facet:'topic',scope:'library'},{key:i.key,facet:'context',scope:'cards'}]);
   const request={type:'AI_MAINTENANCE',items,coverage,contractVersion:'aiu-1',routeVersion:'synthetic',intent:'maintenance'};
   const job=await ai.plan(request);await ai.reserve(job.id,{reservationId:'synthetic-reservation'});
   const provider={describe:()=>({providerId:'synthetic',version:'1',executionKind:'fixture'}),execute:async()=>({accepted:true,operationReceiptId:'synthetic-response',body:'DO_NOT_PERSIST_RESPONSE'})};
   await ai.dispatch(job.id,job.childIds[0],provider);await ai.commitFacet(job.id,job.childIds[0],{facet:'topic',units:coverage.filter(u=>u.facet==='topic')});
   const partial=await ai.status(job.id),pending=await ai.collect({limit:100});
   await ai.commitFacet(job.id,job.childIds[0],{facet:'context',units:coverage.filter(u=>u.facet==='context')});
   const remaining=await ai.collect({limit:100}),nextItems=remaining.items.slice(0,1),nextCoverage=nextItems.map(i=>({key:i.key,facet:'topic',scope:'library'})),unknownRequest={...request,items:nextItems,coverage:nextCoverage},unknown=await ai.plan(unknownRequest);
   await ai.reserve(unknown.id,{reservationId:'synthetic-unknown'});await ai.dispatch(unknown.id,unknown.childIds[0],{...provider,execute:async()=>{throw Error('synthetic timeout');}});
   sessionStorage.setItem('aiu-synthetic-job',JSON.stringify({unknownRequest,job:unknown}));
   const queue=await s.repository.transaction(false,async t=>({meta:(await t.all('meta')).filter(r=>r.id.startsWith('aiu:')),usage:await t.all('organizerUsage')}));
   return {captured:pages.length,partialState:partial.state,partialCount:partial.committedCoverage.length,pending:pending.items.length,remaining:remaining.items.length,queue:JSON.stringify(queue),attempts:(await ai.counters()).physicalAttempt};
  });
  assert.equal(initial.captured,100);assert.equal(initial.partialState,'VALIDATED');assert.equal(initial.partialCount,2);assert.equal(initial.pending,100);assert.equal(initial.remaining,98);assert.equal(initial.attempts,2);assert.doesNotMatch(initial.queue,/NATIVE_PRIVATE_BODY|DO_NOT_PERSIST_RESPONSE/);
  await p.reload();await attach(p);
  const after=await p.evaluate(async()=>{
   const {s,ai}=__aiu,{unknownRequest,job}=JSON.parse(sessionStorage.getItem('aiu-synthetic-job'));await ai.reconcileInterrupted(job.id);let calls=0;const same=await ai.plan(unknownRequest),outcome=await ai.dispatch(job.id,job.childIds[0],{describe:()=>({providerId:'synthetic',version:'1',executionKind:'fixture'}),execute:async()=>{calls++;}});
   const item=unknownRequest.items[0],before=await s.repository.transaction(false,t=>t.get('inputStates',item.descriptor.entityId));let rolledBack=false;
   try{await s.foundationWrite(async t=>{const put=t.put.bind(t);t.put=async(name,row,...args)=>{if(name==='meta'&&row.id.startsWith('aiu:delta:pending:'))throw Error('synthetic write failure');return put(name,row,...args);};await t.put('inputStates',{...before,contentRevision:99});});}catch{rolledBack=true;}
   const current=await s.repository.transaction(false,t=>t.get('inputStates',before.id));return {sameId:same.id===job.id,outcome:outcome.state,calls,rolledBack,revisionUnchanged:current.contentRevision===before.contentRevision,attempts:(await ai.counters()).physicalAttempt};
  });
  assert.deepEqual(after,{sameId:true,outcome:'OUTCOME_UNKNOWN',calls:0,rolledBack:true,revisionUnchanged:true,attempts:2});
  assert.equal(h.extensionNetworkRequests,0);assert.equal(h.externalRequests,0);assert.equal(h.deepSeekRequests.length,0);assert.deepEqual(h.errors,[]);
 }finally{try{await h?.close();}finally{if(release)rmSync(release,{recursive:true,force:true});}}
});

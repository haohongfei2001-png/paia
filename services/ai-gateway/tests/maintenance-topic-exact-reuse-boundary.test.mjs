import test from 'node:test';
import assert from 'node:assert/strict';
import {maintenanceServiceFixture} from './maintenance-client-fixture.mjs';
import {capture} from '../../../extension/tests/harness/thought-m1.mjs';
const read=(s,table)=>s.repository.transaction(false,t=>t.all(table));
async function fixture(t,mode){
 const first=await maintenanceServiceFixture(t,{exposeRemote:true});t.after(()=>first.session.dispose());
 assert.equal((await first.run()).state,'COMMITTED');const before=(await read(first.s,'thoughts')).find(x=>x.provenanceType==='input_original'),oldInput=before.workingInputId;first.session.dispose();
 const routes=new Map(first.calls.filter(x=>x.data.request?.operationId).map(x=>[x.data.request.operationId,first.configuration.fetch]));
 const request=capture((await first.s.status()).epoch,'SYNTHETIC-cross-input-'+mode,before.thoughtText);request.chat={id:'SYNTHETIC-new-'+mode,url:'https://chatgpt.com/c/SYNTHETIC-new-'+mode,title:'Synthetic other Source'};await first.s.capture(request);await first.s.finishFoundation();
 const newInput=(await read(first.s,'inputStates')).find(x=>x.id!==oldInput),grants=[],payloads=[];if(mode==='lower-union-limit')first.s.organizerBudget.limits.maxInputs=1;let granted=false,touches=0,hit=false,raw=null;
 const originalDependencies=(await read(first.s,'dependencies')).filter(x=>x.targetId===before.id),repository=first.s.repository,transaction=repository.transaction.bind(repository);
 t.mock.method(repository,'transaction',function(write,fn,...rest){return transaction(write,async tx=>{
  const get=tx.get.bind(tx),put=tx.put.bind(tx);
  tx.get=async(table,key,...args)=>{const row=await get(table,key,...args);
   if(row&&table==='thoughts'&&key===before.id){
    if(mode==='pregrant-accessor'&&!granted){const value=row.thoughtText;Object.defineProperty(row,'thoughtText',{enumerable:true,configurable:true,get(){touches++;return value;}});hit=true;}
    if(granted&&mode==='old-body-drift'){row.thoughtText+=' DIFFERENT';hit=true;}
    if(granted&&mode==='old-revision-drift'){row.revision++;hit=true;}
   }
   if(granted&&mode==='old-source-drift'&&table==='records'&&before.sourceRecordIds.includes(key)&&row){row.value.originalText+=' DIFFERENT';hit=true;}
   return row;
  };
  tx.put=async(table,value,key)=>{
   if(granted&&mode==='late-grant-revoke'&&table==='provenance'&&value.ownerId===before.id&&value.inputId===newInput.id){raw.processing=false;hit=true;}
   if(granted&&['post-intent-body-drift','post-intent-title-drift','post-intent-note-drift'].includes(mode)&&table==='thoughts'&&value.id===before.id){const field=mode==='post-intent-body-drift'?'thoughtText':mode==='post-intent-title-drift'?'title':'note';value={...value,[field]:(value[field]||'')+' DIFFERENT'};hit=true;}
   const written=await put(table,value,key);if(granted&&!hit&&mode.startsWith('late-member-')&&table==='provenance'&&value.ownerId===before.id&&value.inputId===newInput.id){hit=true;const original=structuredClone(originalDependencies[0]);if(mode==='late-member-delete')await tx.delete('dependencies',original.id);else await put('dependencies',mode==='late-member-add'?{...original,id:crypto.randomUUID()}:{...original,status:'stale'});}if(mode==='retry'&&!hit&&table==='organizerWorkItems'&&value.state==='ACKNOWLEDGED'&&value.unit?.facet==='topic'){hit=true;throw Object.assign(Error('synthetic Topic ACK storage rollback'),{code:'STORAGE_FAILED'});}return written;
  };
  return fn(tx);
 },...rest);});
 const next=await maintenanceServiceFixture(t,{reuseLocal:first,exposeRemote:true,configure:({configuration})=>{
  const resolve=configuration.processing.resolve;configuration.processing={...configuration.processing,resolve:async(tx,scope)=>{grants.push(structuredClone(scope));const result=await resolve(tx,scope);if(scope.phase==='topic-exact-reuse'){granted=true;raw=result;if(mode==='deny')return {...result,processing:false};if(mode==='incomplete-fields')return {...result,scope:{...scope,entries:scope.entries.map(e=>({...e,selectedFields:['body']}))}};}return result;}};
  const fetch=configuration.fetch;configuration.fetch=async request=>{const data=await request.clone().json(),id=data.request?.operationId;if(id&&routes.has(id))return routes.get(id)(request);if(id)routes.set(id,fetch);return fetch(request);};
 },transformResponse:({value,payload})=>{payloads.push(structuredClone(payload));value.context={status:'DEFER',reason:'Synthetic independent Context deferred',groups:[]};}});t.after(()=>next.session.dispose());
 let result=await next.run();if(result.state==='RECOVERED')result=await next.run();
 if(mode==='retry'){assert.equal(hit,true);assert.notEqual(result.facets?.find(x=>x.facet==='topic')?.state,'COMMITTED');result=await next.run();assert.equal(result.facets?.find(x=>x.facet==='topic')?.state,'COMMITTED',JSON.stringify(result));assert.equal(grants.filter(x=>x.phase==='topic-exact-reuse').length,1);assert.equal(next.physical(),1);const deps=(await read(first.s,'dependencies')).filter(x=>x.targetId===before.id);assert.deepEqual(deps.map(x=>x.inputId).sort(),[oldInput,newInput.id].sort());return;}
 assert.equal(next.physical(),1);assert.deepEqual(payloads.at(-1).material.inputs.map(x=>x.inputId),[newInput.id]);assert.ok(!JSON.stringify(payloads.at(-1).material).includes(oldInput));
 const local=grants.filter(x=>x.phase==='topic-exact-reuse');assert.equal(local.length,['pregrant-accessor','lower-union-limit'].includes(mode)?0:1);
 assert.notEqual(result.facets?.find(x=>x.facet==='topic')?.state,'COMMITTED',JSON.stringify(result));
 if(!['deny','incomplete-fields','lower-union-limit'].includes(mode))assert.equal(hit,true,'the original boundary must really execute');assert.equal(touches,0);
 // Stop the observer for actual durable rollback verification.
 t.mock.restoreAll();const after=(await read(first.s,'thoughts')).find(x=>x.id===before.id);assert.deepEqual(after,before);const deps=(await read(first.s,'dependencies')).filter(x=>x.targetId===before.id);assert.deepEqual(deps.map(x=>x.inputId),[oldInput]);assert.deepEqual(deps.sort((a,b)=>a.id.localeCompare(b.id)),originalDependencies.sort((a,b)=>a.id.localeCompare(b.id)),'all original dependency metadata must roll back exactly');
 return {result};
}
for(const mode of ['deny','incomplete-fields','pregrant-accessor','old-body-drift','old-revision-drift','old-source-drift','late-grant-revoke','post-intent-body-drift','lower-union-limit','retry','post-intent-title-drift','post-intent-note-drift','late-member-add','late-member-change','late-member-delete'])test('original exact reuse refuses '+mode,{timeout:120000},async t=>fixture(t,mode));

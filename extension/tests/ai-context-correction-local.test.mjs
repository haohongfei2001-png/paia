import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,inputEdit} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {ContextCardsService,CONTEXT_CARDS_ROW} from '../core/context-cards.js';
import {ContextMaintenanceService} from '../core/context-maintenance.js';
import {readContextTopicScope} from '../core/context-topic-scope.js';
import {inputProjection} from '../core/thought-evidence.js';
import {hashText} from '../core/dedupe.js';

const op=()=>crypto.randomUUID();
const raw=(s,name,id)=>s.repository.transaction(false,t=>t.get(name,id));
const row=f=>raw(f.s,'meta',CONTEXT_CARDS_ROW);
const snapshot=s=>s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all(['meta','records','recordIndex','blocks','inputStates','thoughts','topics','sections','placements','dependencies','provenance','revisions','operationReceipts','tombstones'].map(async n=>[n,await t.all(n)]))));
const mutation=(s,name,id,fn)=>s.foundationWrite(async t=>{const r=await t.get(name,id);fn(r);await t.put(name,r);});
function authority(s){
 const caller=Object.freeze({handle:op()}),controller=new AbortController(),state={accountId:'synthetic-account',processorId:'synthetic-processor',generation:1,processing:true,expiresAt:Date.now()+600000,hook:null,currentHook:null,scope:null};
 const verifier={async verify(actual,store,scope){state.scope=structuredClone(scope);if(state.hook)await state.hook();if(actual!==caller||store!==s)return null;return {version:1,store:s,accountId:state.accountId,processorId:state.processorId,authorizationGeneration:state.generation,scope,processing:state.processing,expiresAt:state.expiresAt,revocationSignal:controller.signal};},isCurrent(actual,r,store){state.currentHook?.();return actual===caller&&store===s&&r.accountId===state.accountId&&r.processorId===state.processorId&&r.authorizationGeneration===state.generation;}};
 return {caller,controller,state,verifier,service:new ContextMaintenanceService(s,{processingVerifier:verifier})};
}
async function fixture({body='SYNTHETIC eligible source body'}={}){
 const f=await setup(OrganizerStore);await f.s.finishFoundation();await f.s.setFilterMode('off');const input=(await f.s.snapshot()).library.blocks[0],topic=await f.s.createTopic({operationId:op(),name:'SYNTHETIC processing Topic'});
 await inputEdit(f.s,input.id,{libraryText:body,note:'SYNTHETIC eligible note'});
 const current=await f.s.input(input.id);await f.s.addToTopics({operationId:op(),kind:'input',id:input.id,expectedRevision:current.revision,topicIds:[topic.id]});
 return {...f,input,topic,cards:new ContextCardsService(f.s),...authority(f.s)};
}
async function request(f,{card='info',fields=['body'],...extra}={}){
 const scope=await readContextTopicScope(f.s,{topicId:f.topic.id});assert.equal(scope.available,true,scope.reason);
 const input=await f.s.repository.transaction(false,t=>inputProjection(f.s,t,f.input.id)),fieldDigests={};for(const field of fields)fieldDigests[field]=await hashText(input[field]);
 return {operationId:op(),epoch:scope.binding.epoch,itemId:op(),card,expectedRevision:0,body:'SYNTHETIC extracted candidate',section:'SYNTHETIC section',associationIds:[op()],evidence:[{topicId:f.topic.id,inputId:f.input.id,selectedFields:fields,fieldDigests,expectedTopicBinding:scope.binding,expectedRemovalSequence:input.lastRemovalSequence}],...extra};
}
const put=(f,c)=>f.service.maintain(f.caller,c);
import {LocalMaintenanceSession} from '../core/ai-usage/local-maintenance-session.js';
import {DIRTY_PREFIX,KNOWN_PREFIX} from '../core/ai-usage/delta.js';
const options={scope:'synthetic-correction',contractVersion:'synthetic-correction-1',routeVersion:'synthetic-correction-1',limit:1};
const usageAuthority=async(_t,r)=>({allowed:true,consentEpoch:'synthetic-consent',principalId:'synthetic-principal',libraryId:'synthetic-library',jobTypes:['AI_MAINTENANCE'],scope:{evidenceKeys:r.evidenceKeys,coverage:r.coverage}});
const localSession=f=>new LocalMaintenanceSession(f.s,{authority:usageAuthority});
async function protectedFixture(){const f=await fixture(),c=await request(f);await put(f,c);const change={kind:'put',operationId:op(),epoch:c.epoch,itemId:c.itemId,card:c.card,expectedRevision:1,body:c.body,section:c.section};await f.cards.change(change);return {...f,c,change,key:JSON.stringify(['context_item',c.itemId])};}
const usages=s=>s.repository.transaction(false,t=>t.all('organizerUsage'));
const acks=s=>s.repository.transaction(false,async t=>(await t.all('organizerWorkItems')).filter(r=>r.state==='ACKNOWLEDGED'));
test('original Context owner protection-only correction settles exact local facets without provider or window',async()=>{
 const f=await protectedFixture(),before=await row(f),receipt=await raw(f.s,'operationReceipts','context:'+f.change.operationId),session=localSession(f);
 const result=await session.prepare(options);assert.equal(result.localResolvedUnits,2);assert.equal(result.state,'PARTIAL');assert.equal(result.remainingWork,true);assert.equal((await session.run(result)).localResolvedUnits,2);
 assert.deepEqual(await row(f),before);assert.deepEqual(await raw(f.s,'operationReceipts','context:'+f.change.operationId),receipt);assert.equal(await raw(f.s,'meta',DIRTY_PREFIX+f.key),undefined);
 const checked=(await acks(f.s)).filter(a=>a.unit.key===f.key);assert.deepEqual(checked.map(a=>a.unit.facet).sort(),['context','topic']);assert.ok(checked.every(a=>a.outcome==='NO_CHANGE'));
 const attempts=await usages(f.s);assert.equal(attempts.length,1);assert.equal(attempts[0].executionKind,'local');assert.equal(attempts[0].attemptCount,0);assert.equal(attempts[0].effectiveResultCount,0);assert.equal(attempts[0].spendState,'NO_PROVIDER_COST');assert.doesNotMatch(JSON.stringify([attempts,checked,await raw(f.s,'meta',KNOWN_PREFIX+f.key)]),/SYNTHETIC extracted candidate/);
});

for(const field of ['body','section','order','card','createdAt','maintenance'])test('same-revision '+field+' drift cannot reuse protection-only witness',async()=>{
 const f=await protectedFixture();await mutation(f.s,'meta',CONTEXT_CARDS_ROW,r=>{const i=r.items.find(x=>x.id===f.c.itemId);if(field==='maintenance')i.maintenance.associationIds=[op()];else if(field==='order')i.order+=10;else if(field==='card')i.card='rules';else i[field]+=' changed';});
 await assert.rejects(localSession(f).prepare(options));assert.equal((await acks(f.s)).length,0);assert.equal((await usages(f.s)).length,0);assert.ok(await raw(f.s,'meta',DIRTY_PREFIX+f.key));
});
for(const defect of ['missing','digest','owner','revision','epoch'])test('receipt '+defect+' refuses exact local resolution',async()=>{
 const f=await protectedFixture(),id='context:'+f.change.operationId;if(defect==='missing')await f.s.foundationWrite(t=>t.delete('operationReceipts',id));else await mutation(f.s,'operationReceipts',id,r=>{if(defect==='digest')r.digest='0'.repeat(64);if(defect==='owner')r.ownerId=op();if(defect==='revision')r.result.revision++;if(defect==='epoch')r.epoch='other';});
 await assert.rejects(localSession(f).prepare(options));assert.equal((await acks(f.s)).length,0);assert.equal((await usages(f.s)).length,0);
});
test('real body edit after protection, manual creation and cosmetics remain interpretation obligations',async()=>{
 for(const mode of ['body','section','manual','unchanged-put']){const f=await protectedFixture();if(mode==='manual')await f.cards.change({...f.change,itemId:op(),operationId:op(),expectedRevision:0});else await f.cards.change({...f.change,operationId:op(),expectedRevision:2,...(mode==='body'?{body:'SYNTHETIC human correction'}:mode==='section'?{section:'Changed section'}:{})});
  const known=await raw(f.s,'meta',KNOWN_PREFIX+f.key);if(mode==='manual'){assert.ok(known.descriptor.localCorrection);continue;}
  assert.equal(known.descriptor.localCorrection,undefined);await assert.rejects(localSession(f).prepare(options));assert.equal((await acks(f.s)).length,0);
 }
});
test('direct canonical protection and copied original receipt cannot mint an owner witness',async()=>{
 const f=await fixture(),c=await request(f);await put(f,c);const unrelated=await protectedFixture(),receipt=await raw(unrelated.s,'operationReceipts','context:'+unrelated.change.operationId);
 await f.s.foundationWrite(async t=>{const r=await t.get('meta',CONTEXT_CARDS_ROW),i=r.items[0];i.protected=true;i.userEdited=true;i.revision++;await t.put('meta',r);await t.put('operationReceipts',{...receipt,ownerId:i.id,result:{...receipt.result,itemId:i.id}});});
 const known=await raw(f.s,'meta',KNOWN_PREFIX+JSON.stringify(['context_item',c.itemId]));assert.equal(known.descriptor.localCorrection,undefined);await assert.rejects(localSession(f).prepare(options));assert.equal((await acks(f.s)).length,0);
});
test('old pending Context obligation prevents protection-only witness minting',async()=>{
 const f=await fixture(),c=await request(f);await put(f,c);const key=JSON.stringify(['context_item',c.itemId]);
 // Preserve a pre-existing unsupported obligation exactly rather than claim it
 // completed when a later locally harmless protection transition is observed.
 await f.s.foundationWrite(t=>t.put('meta',{id:DIRTY_PREFIX+key,version:1,descriptor:{key,kind:'context_item',entityId:c.itemId,revision:1},signature:'historical-pending',requirements:[],pendingFacets:['context']}));
 await f.cards.change({kind:'put',operationId:op(),epoch:c.epoch,itemId:c.itemId,card:c.card,expectedRevision:1,body:c.body,section:c.section});
 assert.equal((await raw(f.s,'meta',KNOWN_PREFIX+key)).descriptor.localCorrection,undefined);await assert.rejects(localSession(f).prepare(options));assert.equal((await acks(f.s)).length,0);
});
for(const stage of ['ack','usage','job','counter'])for(const fault of ['storage','revoke','restore','body','delete','gate','dispose'])test('local '+fault+' after '+stage+' rolls back every checked facet',async()=>{
 const f=await protectedFixture(),session=localSession(f),transaction=f.s.repository.transaction.bind(f.s.repository);let reached=false,allowed=true;
 const authority=async(t,r)=>({...await usageAuthority(t,r),allowed});const active=new LocalMaintenanceSession(f.s,{authority});
 const predicates={ack:(n,r)=>n==='organizerWorkItems'&&r.state==='ACKNOWLEDGED',usage:(n,r)=>n==='organizerUsage'&&r.state==='COMMITTED',job:(n,r)=>n==='organizerJobs'&&r.state==='COMMITTED',counter:(n,r)=>n==='meta'&&r.id==='aiu:counters:v1'};
 f.s.repository.transaction=(write,fn,stores)=>transaction(write,async t=>{if(write){const original=t.put.bind(t);t.put=async(n,r,...rest)=>{const result=await original(n,r,...rest);if(!reached&&predicates[stage](n,r)){reached=true;if(fault==='storage')throw Object.assign(Error('failed'),{code:'STORAGE_FAILED'});if(fault==='revoke')allowed=false;if(fault==='restore')await original('meta',{id:'recovery-restore-epoch',value:'other'});if(fault==='dispose')active.dispose();if(fault==='gate'){const gate=await t.get('meta','gate');await original('meta',{...gate,enabled:false});}if(fault==='delete'){const row=await t.get('meta',CONTEXT_CARDS_ROW);row.items[0].lifecycle='removed';row.items[0].deletedBy=op();row.items[0].revision++;await original('meta',row);}if(fault==='body'){const row=await t.get('meta',CONTEXT_CARDS_ROW);row.items[0].body+=' changed';await original('meta',row);}}return result;};}return fn(t);},stores);
 await assert.rejects(active.prepare(options));assert.equal(reached,true);assert.equal((await acks(f.s)).length,0);assert.equal((await usages(f.s)).length,0);assert.ok(await raw(f.s,'meta',DIRTY_PREFIX+f.key));
 f.s.repository.transaction=transaction;allowed=true;assert.equal((await localSession(f).prepare(options)).localResolvedUnits,2);session.dispose();active.dispose();
});
test('restart and duplicate human command preserve original receipt and resolve only once',async()=>{
 const f=await protectedFixture(),receipt=await raw(f.s,'operationReceipts','context:'+f.change.operationId),known=await raw(f.s,'meta',KNOWN_PREFIX+f.key);await f.cards.change(f.change);assert.deepEqual(await raw(f.s,'meta',KNOWN_PREFIX+f.key),known);
 await localSession(f).prepare(options);const before=await snapshot(f.s),attempts=await usages(f.s),checked=await acks(f.s);await f.cards.change(f.change);await assert.rejects(localSession(f).prepare(options));assert.deepEqual(await usages(f.s),attempts);assert.deepEqual(await acks(f.s),checked);assert.deepEqual(await snapshot(f.s),before);assert.deepEqual(await raw(f.s,'operationReceipts',receipt.id),receipt);
});

test('new Store after restart consumes the persisted metadata-only proof',async()=>{
 const f=await protectedFixture(),restarted=new OrganizerStore(f.storage,{indexedDB:f.indexedDB});await restarted.finishFoundation();const session=new LocalMaintenanceSession(restarted,{authority:usageAuthority}),result=await session.prepare(options);assert.equal(result.localResolvedUnits,2);assert.equal((await acks(restarted)).length,2);assert.equal((await row(f)).items[0].body,f.c.body);session.dispose();
});
test('original owner rechecks exact full preimage after the semantic digest await',async()=>{
 const f=await fixture(),c=await request(f);await put(f,c);const proto=Object.getPrototypeOf(crypto.subtle),original=proto.digest;let hit=false;
 proto.digest=async function(a,b){const result=await original.call(this,a,b);if(!hit&&new TextDecoder().decode(b).includes('"maintenance"')&&new TextDecoder().decode(b).includes(c.body)){hit=true;await mutation(f.s,'meta',CONTEXT_CARDS_ROW,r=>{r.items[0].order+=10;});}return result;};
 try{await f.cards.change({kind:'put',operationId:op(),epoch:c.epoch,itemId:c.itemId,card:c.card,expectedRevision:1,body:c.body,section:c.section});}finally{proto.digest=original;}
 assert.equal(hit,true);const known=await raw(f.s,'meta',KNOWN_PREFIX+JSON.stringify(['context_item',c.itemId]));assert.equal(known.descriptor.localCorrection,undefined);await assert.rejects(localSession(f).prepare(options));assert.equal((await acks(f.s)).length,0);
});

test('a mixed page locally settles only the protection correction and retains manual body work',async()=>{
 const f=await protectedFixture(),manualId=op();await f.cards.change({...f.change,itemId:manualId,operationId:op(),expectedRevision:0,body:'SYNTHETIC new human body'});const before=await row(f),result=await localSession(f).prepare({...options,limit:37});
 assert.equal(result.localResolvedUnits,2);assert.equal(result.state,'PARTIAL');assert.equal(result.complete,false);assert.equal(result.nextCursor,null);assert.equal(result.remainingWork,true);assert.ok(await raw(f.s,'meta',DIRTY_PREFIX+JSON.stringify(['context_item',manualId])));assert.equal((await acks(f.s)).some(a=>a.unit.key===JSON.stringify(['context_item',manualId])),false);assert.deepEqual(await row(f),before);
});

test('an older sent attempt cannot be rebound or rewritten by local correction settlement',async()=>{
 const f=await fixture(),c=await request(f);await put(f,c);const {AIUsageFoundation}=await import('../core/ai-usage/foundation.js'),ai=new AIUsageFoundation(f.s,{resolveAuthority:usageAuthority}),input=(await ai.collect()).items.find(i=>i.descriptor.kind==='input'),coverage=[{key:input.key,facet:'topic',scope:options.scope}],job=await ai.plan({type:'AI_MAINTENANCE',intent:'maintenance',items:[input],coverage,children:[coverage],contractVersion:options.contractVersion,routeVersion:options.routeVersion});
 await ai.reserve(job.id,{reservationId:'synthetic-old-reservation'});await ai.dispatch(job.id,job.childIds[0],{describe:()=>({providerId:'synthetic',version:'1',executionKind:'fixture'}),execute:async()=>({accepted:true,operationReceiptId:'synthetic-old-operation'})});
 await f.cards.change({kind:'put',operationId:op(),epoch:c.epoch,itemId:c.itemId,card:c.card,expectedRevision:1,body:c.body,section:c.section});const before=await ai.status(job.id);await assert.rejects(localSession(f).prepare(options));assert.deepEqual(await ai.status(job.id),before);assert.equal((await acks(f.s)).length,0);assert.equal((await usages(f.s)).length,1);assert.equal((await usages(f.s))[0].attemptCount,1);
});

test('independent: correction final settlement fence survives the final authority await',async()=>{
 const f=await protectedFixture();let completedChecks=0,mutated=false;
 const authority=async(t,r)=>{
  const result=await usageAuthority(t,r);
  const completed=(await t.all('organizerWorkItems')).filter(x=>x.state==='ACKNOWLEDGED'&&x.unit.key===f.key);
  if(completed.length===2&&++completedChecks===2){
   const canonical=await t.get('meta',CONTEXT_CARDS_ROW);canonical.items[0].body+=' LATE DRIFT';await t.put('meta',canonical);mutated=true;
  }
  return result;
 };
 const active=new LocalMaintenanceSession(f.s,{authority});let result,error;try{result=await active.prepare(options);}catch(e){error=e;}
 // A second authority await after the exact owner fence must never publish
 // unchecked drift. Removing that redundant await is itself the safe branch.
 if(mutated){assert.ok(error,'post-fence authority drift must reject');assert.equal((await acks(f.s)).length,0);assert.ok(await raw(f.s,'meta',DIRTY_PREFIX+f.key));}
 else{assert.equal(error,undefined);assert.equal(completedChecks,1,'only the original pre-snapshot final authority fence remains');assert.equal(result.localResolvedUnits,2);assert.equal((await row(f)).items[0].body,f.c.body);}
});
test('independent: capture is rechecked after qualifier digest await',async()=>{
 const f=await protectedFixture(),proto=Object.getPrototypeOf(crypto.subtle),original=proto.digest;let mutated=false;
 proto.digest=async function(a,b){const result=await original.call(this,a,b);if(!mutated&&new TextDecoder().decode(b).includes('"maintenance"')&&new TextDecoder().decode(b).includes(f.c.body)){mutated=true;await mutation(f.s,'meta',CONTEXT_CARDS_ROW,r=>{r.items[0].body+=' DIGEST DRIFT';});}return result;};
 try{await assert.rejects(localSession(f).prepare(options));}finally{proto.digest=original;}
 assert.equal(mutated,true);assert.equal((await acks(f.s)).length,0);assert.equal((await usages(f.s)).length,0);assert.ok(await raw(f.s,'meta',DIRTY_PREFIX+f.key));
});
for(const field of ['provenance','temporal'])test('independent: same-revision '+field+' drift cannot become local NO_CHANGE',async()=>{
 const f=await protectedFixture();await mutation(f.s,'meta',CONTEXT_CARDS_ROW,r=>{const item=r.items[0];if(field==='temporal')item.maintenance.temporal={temporalScope:'SYNTHETIC changed time scope',uncertainty:null,validUntil:null};else item.maintenance.provenance.evidence[0].fieldDigests.body='0'.repeat(64);});
 await assert.rejects(localSession(f).prepare(options));assert.equal((await acks(f.s)).length,0);assert.equal((await usages(f.s)).length,0);assert.ok(await raw(f.s,'meta',DIRTY_PREFIX+f.key));
});
test('independent: a human DTO cannot supply the local witness',async()=>{
 const f=await fixture(),c=await request(f);await put(f,c);const change={kind:'put',operationId:op(),epoch:c.epoch,itemId:c.itemId,card:c.card,expectedRevision:1,body:c.body,section:c.section,localCorrection:{version:1,kind:'protection_only'}};
 await assert.rejects(f.cards.change(change));assert.equal((await row(f)).items[0].protected,false);assert.equal((await acks(f.s)).length,0);
});
test('independent: a completed one-facet job leaves only the remaining correction facet eligible',async()=>{
 const f=await protectedFixture(),{AIUsageFoundation}=await import('../core/ai-usage/foundation.js');
 const foundation=new AIUsageFoundation(f.s,{resolveAuthority:usageAuthority,committers:{topic:async(_t,r)=>({committed:true,coverage:r.units,isCurrent:()=>true})}});
 const item=(await foundation.describe({keys:[f.key]})).items[0],coverage=[{key:f.key,facet:'topic',scope:options.scope}],job=await foundation.plan({type:'AI_MAINTENANCE',intent:'maintenance',items:[item],coverage,children:[coverage],contractVersion:options.contractVersion,routeVersion:options.routeVersion});
 await foundation.resolveLocal(job.id,{facet:'topic',units:coverage});const old=await foundation.status(job.id),result=await localSession(f).prepare(options);
 assert.equal(result.localResolvedUnits,1);assert.deepEqual(await foundation.status(job.id),old);assert.deepEqual((await acks(f.s)).map(a=>a.unit.facet).sort(),['context','topic']);assert.equal(await raw(f.s,'meta',DIRTY_PREFIX+f.key),undefined);assert.ok((await usages(f.s)).every(x=>x.attemptCount===0&&x.effectiveResultCount===0&&x.spendState==='NO_PROVIDER_COST'));
});
for(const mode of ['missing','denied','wrong-scope'])test('independent authority '+mode+' cannot grant local settlement',async()=>{
 const f=await protectedFixture(),authority=mode==='missing'?null:async(t,r)=>{const result=await usageAuthority(t,r);return mode==='denied'?{...result,allowed:false}:{...result,scope:{...result.scope,coverage:[]}};};
 await assert.rejects(new LocalMaintenanceSession(f.s,{authority}).prepare(options));assert.equal((await acks(f.s)).length,0);assert.equal((await usages(f.s)).length,0);assert.ok(await raw(f.s,'meta',DIRTY_PREFIX+f.key));
});
for(const field of ['namespace','schemaVersion','result-item','result-extra','result-false'])test('independent receipt '+field+' cannot grant local settlement',async()=>{
 const f=await protectedFixture();await mutation(f.s,'operationReceipts','context:'+f.change.operationId,r=>{if(field==='namespace')r.namespace='context-maintenance';else if(field==='schemaVersion')r.schemaVersion=2;else if(field==='result-item')r.result.itemId=op();else if(field==='result-extra')r.result.extra=true;else r.result.ok=false;});
 await assert.rejects(localSession(f).prepare(options));assert.equal((await acks(f.s)).length,0);assert.equal((await usages(f.s)).length,0);assert.ok(await raw(f.s,'meta',DIRTY_PREFIX+f.key));
});
test('independent receipt replay for a different automatic owner cannot mint a proof',async()=>{
 const f=await protectedFixture(),c=await request(f,{body:'SYNTHETIC second automatic item'});await put(f,c);
 await assert.rejects(f.cards.change({...f.change,itemId:c.itemId,expectedRevision:1,body:c.body}));
 const item=(await row(f)).items.find(i=>i.id===c.itemId);assert.equal(item.protected,false);assert.equal(item.revision,1);assert.equal(await raw(f.s,'meta',KNOWN_PREFIX+JSON.stringify(['context_item',c.itemId])),undefined);
});

for(const drift of ['body','receipt','restore'])test('last required committer authority await precedes the complete '+drift+' fence',async()=>{
 const f=await protectedFixture();let mutated=false;
 const authority=async(t,r)=>{const result=await usageAuthority(t,r),completed=(await t.all('organizerWorkItems')).filter(x=>x.state==='ACKNOWLEDGED'&&x.unit.key===f.key);
  if(!mutated&&completed.length===2){mutated=true;if(drift==='body'){const canonical=await t.get('meta',CONTEXT_CARDS_ROW);canonical.items[0].body+=' FINAL AUTHORITY DRIFT';await t.put('meta',canonical);}else if(drift==='receipt'){const receipt=await t.get('operationReceipts','context:'+f.change.operationId);receipt.digest='0'.repeat(64);await t.put('operationReceipts',receipt);}else await t.put('meta',{id:'recovery-restore-epoch',value:'changed-final-epoch'});}
  return result;
 };
 await assert.rejects(new LocalMaintenanceSession(f.s,{authority}).prepare(options));assert.equal(mutated,true);assert.equal((await acks(f.s)).length,0);assert.equal((await usages(f.s)).length,0);assert.ok(await raw(f.s,'meta',DIRTY_PREFIX+f.key));
});
for(const missing of ['snapshot','synchronous'])test('local subset requires the trusted committer '+missing+' final fence',async()=>{
 const f=await protectedFixture(),{AIUsageFoundation}=await import('../core/ai-usage/foundation.js');
 const foundation=new AIUsageFoundation(f.s,{resolveAuthority:usageAuthority,committers:{topic:async(_t,r)=>({committed:true,coverage:r.units,...(missing==='snapshot'?{isCurrent:()=>true}:{fenceAfterSettlement:async()=>true})})}}),item=(await foundation.describe({keys:[f.key]})).items[0],coverage=[{key:f.key,facet:'topic',scope:options.scope}],job=await foundation.plan({type:'AI_MAINTENANCE',intent:'maintenance',items:[item],coverage,children:[coverage],contractVersion:options.contractVersion,routeVersion:options.routeVersion});
 await assert.rejects(foundation.resolveLocalSubset(job.id,{units:coverage}),{code:'STALE_BASE'});assert.equal((await acks(f.s)).length,0);assert.equal((await usages(f.s)).length,0);
});

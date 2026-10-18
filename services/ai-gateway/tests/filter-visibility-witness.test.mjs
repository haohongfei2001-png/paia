import test from 'node:test';
import assert from 'node:assert/strict';
import {maintenanceServiceFixture} from './maintenance-client-fixture.mjs';
import {AIUsageFoundation} from '../../../extension/core/ai-usage/foundation.js';
import {sealAIFilterVisibilityWitness,serializeAIFilterVisibilityWitness,readAIFilterVisibilityWitness,openAIFilterVisibilityWitness,aiFilterVisibilityWitnessDigest} from '../../../extension/core/ai-usage/filter-visibility-witness.js';
import {AIFilterConsent,readAIFilterConsentEpoch} from '../../../extension/background/ai-filter-consent.js';
const rows=(s,n)=>s.repository.transaction(false,t=>t.all(n));
async function fixture(t,{atSeal=null}={}){
 let joined=null,sealing=null,argumentsAtSeal=null;const apply=AIUsageFoundation.prototype.applyFacet;
 t.mock.method(AIUsageFoundation.prototype,'applyFacet',async function(...args){const old=this.committers;this.committers=Object.freeze({...old,filter:async(...r)=>{const out=await old.filter(...r),capture=out.captureFilterSettlement;if(!out.filterPublication)return out;return {...out,captureFilterSettlement:token=>{joined={foundation:this,publication:out.filterPublication,settlement:token};return capture(token);}};}});try{return await apply.apply(this,args);}finally{this.committers=old;}});
 const f=await maintenanceServiceFixture(t,{filter:true,configure:({configuration,filterRuntime,filterConsent})=>{
  configuration.service.filter={...filterRuntime.serviceFilter,retainPublication(capability,publication){assert.equal(publication,joined.publication);argumentsAtSeal={...joined,capability,consent:filterConsent};atSeal?.(argumentsAtSeal);sealing=sealAIFilterVisibilityWitness(argumentsAtSeal);sealing.catch(()=>{});return filterRuntime.serviceFilter.retainPublication(capability,publication);}};
 }});const result=await f.run();assert.equal(result.state,'COMMITTED',JSON.stringify(result));const token=await sealing;assert.ok(token);return {...f,token,envelope:serializeAIFilterVisibilityWitness(token,f.s),argumentsAtSeal};
}
test('real joined Filter ACK seals a body-free historical witness without retaining write capability',async t=>{
 const f=await fixture(t),data=readAIFilterVisibilityWitness(f.token,f.s);assert.equal(data.publication.filtered.length,1);assert.equal(data.settlement.outcome,'COMMITTED');assert.equal(data.request.jobId,data.settlement.jobId);assert.equal(data.request.operationId,data.settlement.childId);assert.equal(data.identity.requestHash,data.publication.epochs.entitlement.slice('service:'.length));
 const text=JSON.stringify(f.envelope);for(const source of await rows(f.s,'records'))assert.equal(text.includes(source.value.originalText),false);assert.equal(text.includes('principalToken'),false);assert.equal(text.includes('entitlementToken'),false);assert.equal(text.includes('secret'),false);
 assert.ok(await aiFilterVisibilityWitnessDigest(f.token,f.s));assert.equal(readAIFilterVisibilityWitness({...f.token},f.s),null);await assert.rejects(sealAIFilterVisibilityWitness(f.argumentsAtSeal));
 const opened=await openAIFilterVisibilityWitness(f.s,structuredClone(f.envelope));assert.deepEqual(readAIFilterVisibilityWitness(opened,f.s),data);assert.equal(f.physical(),1);
});
for(const field of ['signature','decision','proof','operation','request','policy','consent','database','restore'])test('stored witness rejects changed '+field+' without rebuilding original ACK from live rows',async t=>{
 const f=await fixture(t),saved=structuredClone(f.envelope);if(field==='signature')saved.signature='0'.repeat(64);else if(field==='decision')saved.data.publication.filtered[0].sequence++;else if(field==='proof')saved.data.publication.proof.restore='changed';else if(field==='operation')saved.data.publication.operationId='different';else if(field==='request')saved.data.request.operationId='different';else if(field==='policy')saved.data.publication.policy.qualificationId='different';else if(field==='consent')saved.data.consentEpoch='different';else if(field==='database')saved.data.databaseId='different';else saved.data.restoreEpoch='different';
 assert.equal(await openAIFilterVisibilityWitness(f.s,saved),null);assert.equal((await rows(f.s,'organizerWorkItems')).some(r=>r.unit?.facet==='filter'&&r.state==='ACKNOWLEDGED'),true);assert.equal(f.physical(),1);
});
for(const field of ['restore','key','database'])test('existing authentic witness is rejected after '+field+' identity changes',async t=>{
 const f=await fixture(t);await f.s.repository.transaction(true,async tx=>{if(field==='restore')await tx.put('meta',{id:'recovery-restore-epoch',value:'new-restore'});else if(field==='key'){const key=await tx.get('meta','thought-suppression-key');key.value[0]^=1;await tx.put('meta',key);}else{const row=await tx.get('meta','migration');row.databaseId='new-local-database';await tx.put('meta',row);}});assert.equal(await openAIFilterVisibilityWitness(f.s,f.envelope),null);
});
test('witness parsing refuses accessors and oversize data before running getters',async t=>{
 const f=await fixture(t);let reads=0;const input={...f.envelope};Object.defineProperty(input,'data',{enumerable:true,get(){reads++;throw Error();}});assert.equal(await openAIFilterVisibilityWitness(f.s,input),null);assert.equal(reads,0);const huge=structuredClone(f.envelope);huge.data.extra='x'.repeat(100000);assert.equal(await openAIFilterVisibilityWitness(f.s,huge),null);
});
test('stable consent epoch survives a worker owner restart only within the original browser-session opt-in',async()=>{
 const values={},api={storage:{session:{get:async k=>({[k]:structuredClone(values[k])}),set:async v=>Object.assign(values,structuredClone(v))}}},a=new AIFilterConsent(api,{consented:async()=>true});const old=await a.status();await a.configure({optIn:true,remoteProcessing:true,expectedGeneration:old.generation});const original=a.capture(),epoch=readAIFilterConsentEpoch(a,original);assert.ok(epoch);assert.equal(readAIFilterConsentEpoch({},original),null);assert.equal(readAIFilterConsentEpoch(a,{...original}),null);a.dispose();
 const b=new AIFilterConsent(api,{consented:async()=>true});await b.status();const renewed=b.capture();assert.notEqual(renewed.generation,original.generation);assert.equal(readAIFilterConsentEpoch(b,renewed),epoch);await b.configure({optIn:false,remoteProcessing:false,expectedGeneration:renewed.generation});assert.equal(readAIFilterConsentEpoch(b,renewed),null);b.dispose();
});
test('only exact original joined objects may seal history, even while the real source capability is live',async t=>{
 const rejected=[];await fixture(t,{atSeal:args=>{for(const mutation of [a=>({...a,settlement:{...a.settlement}}),a=>({...a,publication:{...a.publication}}),a=>({...a,capability:{...a.capability}}),a=>({...a,foundation:{s:a.foundation.s}}),a=>({...a,consent:{}})])rejected.push(assert.rejects(sealAIFilterVisibilityWitness(mutation(args))));}});await Promise.all(rejected);
});
test('a historical signature after human Keep remains only history and never rewrites the current decision',async t=>{
 const f=await fixture(t),before=await rows(f.s,'filterInputs');await f.s.repository.transaction(true,async tx=>{const row=await tx.get('filterInputs',f.candidate.id);row.filterOverride='keep';row.userEdited=true;await tx.put('filterInputs',row);});
 const authenticated=await openAIFilterVisibilityWitness(f.s,f.envelope);assert.ok(authenticated);assert.equal((await f.s.page({documentId:f.candidate.documentId})).pageItemIds.includes(f.candidate.id),true);const after=await rows(f.s,'filterInputs');assert.equal(after.find(r=>r.id===f.candidate.id).filterOverride,'keep');assert.deepEqual(after.find(r=>r.id===f.candidate.id).aiDecision,before.find(r=>r.id===f.candidate.id).aiDecision);assert.equal(f.physical(),1);
});

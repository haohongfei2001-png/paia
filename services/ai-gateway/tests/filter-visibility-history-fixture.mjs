import assert from 'node:assert/strict';
import {maintenanceServiceFixture} from './maintenance-client-fixture.mjs';
import {AIUsageFoundation} from '../../../extension/core/ai-usage/foundation.js';
import {sealAIFilterVisibilityWitness,serializeAIFilterVisibilityWitness} from '../../../extension/core/ai-usage/filter-visibility-witness.js';
// Real source reservation/response/original Filter commit + joined Foundation
// ACK in the local mechanism fixture. Signing keys and identity are synthetic.
export async function joinedVisibilityFixture(t,{atSeal=null}={}){
 let joined=null,sealing=null,argumentsAtSeal=null;const apply=AIUsageFoundation.prototype.applyFacet;
 t.mock.method(AIUsageFoundation.prototype,'applyFacet',async function(...args){const old=this.committers;this.committers=Object.freeze({...old,filter:async(...r)=>{const out=await old.filter(...r),capture=out.captureFilterSettlement;if(!out.filterPublication)return out;return {...out,captureFilterSettlement:token=>{joined={foundation:this,publication:out.filterPublication,settlement:token};return capture(token);}};}});try{return await apply.apply(this,args);}finally{this.committers=old;}});
 const f=await maintenanceServiceFixture(t,{filter:true,configure:({configuration,filterRuntime,filterConsent})=>{configuration.service.filter={...filterRuntime.serviceFilter,retainPublication(capability,publication){assert.equal(publication,joined.publication);argumentsAtSeal={...joined,capability,consent:filterConsent};atSeal?.(argumentsAtSeal);sealing=sealAIFilterVisibilityWitness(argumentsAtSeal);sealing.catch(()=>{});return filterRuntime.serviceFilter.retainPublication(capability,publication);}};}});
 const result=await f.run();assert.equal(result.state,'COMMITTED',JSON.stringify(result));const token=await sealing;assert.ok(token);return {...f,token,envelope:serializeAIFilterVisibilityWitness(token,f.s),argumentsAtSeal};
}

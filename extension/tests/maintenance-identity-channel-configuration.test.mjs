import test from 'node:test';
import assert from 'node:assert/strict';
import {withMaintenanceIdentityCurrentness,isMaintenanceIdentityCurrentness} from '../core/ai-usage/maintenance-identity-currentness.js';
import {readMaintenanceIdentityCurrentnessEndpoint} from '../core/ai-usage/maintenance-identity-currentness-configuration.js';
const configuration=()=>({origin:'https://synthetic.invalid',clock:()=>0,service:{synthetic:true},fetch:()=>{throw Error('no request during assembly');},filterIdentity:{connect:()=>true}});
test('absent original configuration remains null and cannot manufacture a service',()=>{assert.equal(withMaintenanceIdentityCurrentness(null),null);});
test('default absent endpoint strips old callback authority and preserves all original service fields',()=>{
 const input=configuration(),output=withMaintenanceIdentityCurrentness(input);assert.equal(Object.hasOwn(output,'filterIdentity'),false);assert.equal(input.filterIdentity.connect(),true);
 for(const k of ['origin','clock','service','fetch'])assert.equal(output[k],input[k]);
});
test('same-origin fixed source endpoint creates the private production owner without opening a socket',()=>{
 const input=configuration(),output=withMaintenanceIdentityCurrentness(input,input.origin+'/api/identity-currentness');assert.equal(isMaintenanceIdentityCurrentness(output.filterIdentity),true);
 assert.equal(output.filterIdentity.connect({isCurrent:()=>true,onInvalidate:()=>()=>{}}),false);output.filterIdentity.dispose();
});
test('foreign unsafe or wrong-path channel endpoint never falls back to a neutral owner',()=>{
 for(const endpoint of ['https://foreign.invalid/api/identity-currentness','http://synthetic.invalid/api/identity-currentness','https://synthetic.invalid/api/operation-status'])assert.equal(Object.hasOwn(withMaintenanceIdentityCurrentness(configuration(),endpoint),'filterIdentity'),false);
});
test('source configuration accessors fail closed without invocation',()=>{let reads=0;assert.equal(withMaintenanceIdentityCurrentness({get origin(){reads++;return 'https://synthetic.invalid';}}),null);assert.equal(reads,0);});
test('production endpoint reader stays default null regardless of local flags or caller-provided values',()=>{
 for(const value of [undefined,{tier:'pro',optIn:true,endpoint:'https://synthetic.invalid/api/identity-currentness'}])assert.equal(readMaintenanceIdentityCurrentnessEndpoint(value),null);
});

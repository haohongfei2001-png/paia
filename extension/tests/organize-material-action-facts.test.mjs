import {fixture} from './harness/organize-material-method-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {assertOriginalOrganizeActionFacts} from '../background/organize-action-source.js';
import {captureOriginalOrganizeScopeReader,assertOriginalOrganizeScopeReaderFacts,readOrganizeProcessingGrant} from '../background/organize-processing-policy.js';
const aborted=Object.getOwnPropertyDescriptor(AbortSignal.prototype,'aborted').get;
test('the original action pure retirement veto reaches the material facts tail before abort listeners are dispatched',async t=>{
 const f=await fixture(t);await f.read(async(_reader,grant,tx)=>{const cap=captureOriginalOrganizeScopeReader(grant,f.s,tx),signal=readOrganizeProcessingGrant(grant,f.s,tx).signal,descriptor=Object.getOwnPropertyDescriptor(f.s,'repository');let getters=0;
  Object.defineProperty(f.s,'repository',{configurable:true,get(){getters++;return descriptor.value;}});
  try{assert.throws(()=>assertOriginalOrganizeActionFacts(f.source,f.action,f.s));}finally{Object.defineProperty(f.s,'repository',descriptor);}
  assert.equal(getters,0);assert.equal(aborted.call(signal),false,'pure facts mark retirement without invoking abort listeners');
  let accepted=false;try{accepted=assertOriginalOrganizeScopeReaderFacts(cap,f.s,tx);}catch{}
  t.diagnostic(JSON.stringify({materialFactsAccepted:accepted,signalAborted:aborted.call(signal)}));assert.equal(accepted,false);
 });
});

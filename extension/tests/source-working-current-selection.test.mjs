import test from 'node:test';import assert from 'node:assert/strict';
import {buildGroupedCheckpoint} from '../core/browser-native-sync/group-checkpoint.js';
import {requireSourceWorkingCurrentGroupProjection,encodeSourceWorkingCurrentGroupCheckpoint,publishSourceWorkingCurrentGroupCheckpoint} from '../core/browser-native-sync/human-library-plan.js';
test('strict Source current-native opt-in refuses truthy nonbooleans and simultaneous Human before supplied readers or transport',async()=>{
 let reads=0,puts=0;const store={get repository(){reads++;throw Error('supplied repository');}},core={get repository(){reads++;throw Error('supplied Core');}},transport={async putImmutable(){puts++;}};
 for(const value of [1,'true',null,{},[]])await assert.rejects(buildGroupedCheckpoint(core,transport,{store,currentSourceWorkingProjection:value}),{code:'BNS_GROUP_SCOPE_PROOF_REQUIRED'});
 await assert.rejects(buildGroupedCheckpoint(core,transport,{store,currentSourceWorkingProjection:true,currentHumanProjection:true}),{code:'BNS_GROUP_SCOPE_PROOF_REQUIRED'});assert.equal(reads,0);assert.equal(puts,0);
});
test('Source private require/encoder/publisher accept no cloned cap, DTO plan or caller body reader',async()=>{
 let puts=0;const cap=Object.freeze({}),transport={async putImmutable(){puts++;}};
 await assert.rejects(requireSourceWorkingCurrentGroupProjection(cap),{code:'BNS_HUMAN_PROJECTION_REQUIRED'});
 await assert.rejects(encodeSourceWorkingCurrentGroupCheckpoint(cap,transport,{}),{code:'BNS_HUMAN_PROJECTION_REQUIRED'});
 await assert.rejects(publishSourceWorkingCurrentGroupCheckpoint(cap,{},transport,{}),{code:'BNS_HUMAN_PROJECTION_REQUIRED'});
 assert.equal(puts,0);
});

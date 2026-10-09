import test from 'node:test';
import assert from 'node:assert/strict';
import {BrowserNativeSyncCore,calculateHumanRetentionHeadVectors} from '../core/browser-native-sync/core.js';
const row=parents=>({operation:{parents}});
const ops=[{type:'humanLibraryMember',entityId:'entry:synthetic',revisionId:'incoming',parents:['parent']}];
const head=revisions=>[{type:ops[0].type,entityId:ops[0].entityId,head:revisions===null?null:{revisions}}];
test('fixed causal calculation follows the shared original DFS and records only concrete required lookups',()=>{
 const result=calculateHumanRetentionHeadVectors(ops,head(['root','sibling']),[['parent',row(['branch','root'])],['branch',row([])],['root',row([])]]);
 assert.deepEqual(result.expected,[{type:ops[0].type,entityId:ops[0].entityId,revisions:['incoming','sibling']}]);
 assert.deepEqual(result.required,['parent','root','branch']);
});
test('missing selector refuses while a recorded missing row retains original false ancestry',()=>{
 assert.deepEqual(calculateHumanRetentionHeadVectors(ops,head(['root']),[]),{complete:false,missing:'parent',required:['parent'],visited:0});
 const result=calculateHumanRetentionHeadVectors(ops,head(['root']),[['parent',null]]);assert.deepEqual(result.expected[0].revisions,['incoming','root']);
 assert.throws(()=>calculateHumanRetentionHeadVectors(ops,[],[]),{code:'BNS_HUMAN_EFFECT_CUT_REQUIRED'});
 assert.throws(()=>calculateHumanRetentionHeadVectors(ops,head(['root']),[['parent',null],['parent',null]]),{code:'BNS_HUMAN_EFFECT_CUT_REQUIRED'});
});
test('concrete null head, direct same-parent and cycles preserve original head replacement semantics',()=>{
 assert.deepEqual(calculateHumanRetentionHeadVectors(ops,head(null),[]).expected[0].revisions,['incoming']);
 assert.deepEqual(calculateHumanRetentionHeadVectors(ops,head(['parent']),[]).required,[]);
 const result=calculateHumanRetentionHeadVectors(ops,head(['missing']),[['parent',row(['other'])],['other',row(['parent'])]]);
 assert.deepEqual(result.required,['parent','other']);assert.deepEqual(result.expected[0].revisions,['incoming','missing']);
});
test('ordinary Core ancestor still calls the original public get and preserves its exact error object',async()=>{
 const core=new BrowserNativeSyncCore({},{datasetId:'synthetic-ancestry',deviceId:'synthetic-device'}),calls=[],failure=Error('original data hook');
 core.get=async(t,kind,id)=>{calls.push([t,kind,id]);throw failure;};const transaction={};await assert.rejects(core.ancestor(transaction,'root','parent'),e=>e===failure);assert.deepEqual(calls,[[transaction,'revision','parent']]);
});

test('explicit null observations cannot be forged by missing fields, undefined or array holes',()=>{
 for(const observed of [{type:ops[0].type,entityId:ops[0].entityId},{type:ops[0].type,entityId:ops[0].entityId,head:undefined}])assert.throws(()=>calculateHumanRetentionHeadVectors(ops,[observed],[]),{code:'BNS_HUMAN_EFFECT_CUT_REQUIRED'});
 for(const record of [['parent',undefined],Object.assign(new Array(2),{0:'parent'})])assert.throws(()=>calculateHumanRetentionHeadVectors(ops,head(['root']),[record]),{code:'BNS_HUMAN_EFFECT_CUT_REQUIRED'});
 assert.deepEqual(calculateHumanRetentionHeadVectors(ops,head(['root']),[['parent',null]]).expected[0].revisions,['incoming','root']);
});

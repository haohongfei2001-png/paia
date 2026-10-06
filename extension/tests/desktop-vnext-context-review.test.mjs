import test from 'node:test';
import assert from 'node:assert/strict';
import {assertRetiredContext} from './harness/retired-context.mjs';
import {ContextController,getContextController} from '../ui/context-workspace.js';
// These former D4 positive journeys now assert the owner-approved retirement.
// Each uses real durable synthetic content, edited versions and historical grants;
// no historical execution owner is substituted for the production boundary.
for(const [action,variant] of [
 ['create','allowed'],['compile','allowed'],['share','allowed'],['editOutput','edited'],
 ['read','local-only'],['task','allowed'],['order','allowed'],['budget','allowed'],
 ['reconcile','edited'],['redact','allowed'],['confirmReview','denied'],
 ['reconcile','removed'],['read','expired'],['share','consumed'],
 ['share','revoked'],['add','never'],['edit','hidden'],['read','missing'],
])test(`Retired D4 ${action} refuses ${variant} state without reading or altering content, grants or versions`,()=>assertRetiredContext({owner:'manual',method:'run',action,variant}));
test('Retired D4 UI cannot construct an owner, activate or dispatch after navigation',async()=>{
 let calls=0;const prior=globalThis.chrome;globalThis.chrome=new Proxy({}, {get(){calls++;throw Error('no transport');}});
 try{assert.equal(getContextController(),null);const owner=new ContextController({disabled:false});for(const active of [true,false,true])assert.equal(owner.activate(active),false);await assert.rejects(owner.rpc('create'),{code:'FEATURE_UNAVAILABLE'});await assert.rejects(owner.add({kind:'topic',id:'old'}),{code:'FEATURE_UNAVAILABLE'});assert.equal(owner.data,undefined);assert.equal(calls,0);}finally{globalThis.chrome=prior;}
});

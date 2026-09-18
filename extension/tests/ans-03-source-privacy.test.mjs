import test from 'node:test';
import assert from 'node:assert/strict';
import {
 createSourceStructurePolicy,admitSourceStructureDTO,admitSourceOrderSnapshot,
 CHATGPT_SOURCE_STRUCTURE_POLICY,SOURCE_STRUCTURE_DTO_MAX_BYTES
} from '../core/source-structure-admission.js';

const at='2026-09-19T00:10:00.000Z';
const base=()=>({
 schemaVersion:1,contractId:'chatgpt.current-conversation-presence',contractVersion:1,
 providerKey:'chatgpt',capability:'conversationIdentity',channel:'isolated_route',
 scope:'current_conversation',epoch:11,session:'ans03-private-session',generation:1,observedAt:at,
 subject:{kind:'conversation',conversationId:'ans03-private-chat'},
 observation:{}
});
const code=(expected)=>error=>error?.code===expected;

test('ANS-03 production admission rejects body/title/token/credential fields and oversized payloads',async()=>{
 for(const [path,value] of [
  ['originalText','SYNTHETIC_BODY'],['title','SYNTHETIC_TITLE'],
  ['authorization','Bearer SYNTHETIC'],['cookie','SYNTHETIC_COOKIE'],['assistant','SYNTHETIC_AI']
 ]){
  const dto=base();dto[path]=value;
  await assert.rejects(()=>admitSourceStructureDTO(dto),code('INVALID_REQUEST'));
 }
 const nested=base();nested.observation.originalText='Project A';
 await assert.rejects(()=>admitSourceStructureDTO(nested),code('INVALID_REQUEST'));
 const lifecycle=base();lifecycle.observation={sourceStatus:'observed_active'};
 await assert.rejects(()=>admitSourceStructureDTO(lifecycle),code('INVALID_REQUEST'));
 for(const invalid of [
  {...base(),schemaVersion:2},
  {...base(),contractVersion:2},
  {...base(),subject:{kind:'conversation',conversationId:'bad/id'}},
  {...base(),subject:{kind:'conversation',conversationId:' space id '}},
  {...base(),observedAt:'not-a-date'}
 ])await assert.rejects(()=>admitSourceStructureDTO(invalid),code('INVALID_REQUEST'));
 const poison=JSON.parse(JSON.stringify(base()).replace(/}$/,',"__proto__":{"polluted":true}}'));
 await assert.rejects(()=>admitSourceStructureDTO(poison),code('INVALID_REQUEST'));
 const huge=base();huge.padding='x'.repeat(SOURCE_STRUCTURE_DTO_MAX_BYTES+1);
 await assert.rejects(()=>admitSourceStructureDTO(huge),code('INVALID_REQUEST'));
 assert.equal({}.polluted,undefined);
});
test('ANS-03 unverified Project/membership/delete claims stay unavailable even when IDs or text look plausible',async()=>{
 for(const [capability,observation] of [
  ['membership',{membership:{state:'project',namespace:'account-main',projectId:'looks-real'}}],
  ['conversationDeletion',{sourceStatus:'confirmed_deleted'}],
  ['projectName',{projectName:'Looks like a Project'}]
 ]){
  const dto={...base(),capability,observation,generation:2};
  await assert.rejects(()=>admitSourceStructureDTO(dto,CHATGPT_SOURCE_STRUCTURE_POLICY),
    code('UNAVAILABLE'));
 }
 const status=base();status.httpStatus=404;
 await assert.rejects(()=>admitSourceStructureDTO(status),code('INVALID_REQUEST'));
 for(const httpStatus of [401,403,404,500]){
  const dto={...base(),capability:'conversationDeletion',
   observation:{sourceStatus:'confirmed_deleted'},httpStatus};
  await assert.rejects(()=>admitSourceStructureDTO(dto),code('INVALID_REQUEST'));
 }
});
test('ANS-03 provider namespace is a contract boundary, not a same-name heuristic',async()=>{
 const policy=createSourceStructurePolicy({
  providerKey:'chatgpt',contractId:'ans03.namespace.fixture',contractVersion:1,
  channel:'synthetic_fixture',scope:'conversation',originClass:'fixture',namespace:'account-main',
  capabilities:{membership:'verified',projectName:'verified'},
  rules:{membership:{subject:'conversation',fields:['membership']},
   projectName:{subject:'project',fields:['currentName']}}
 });
 const common={schemaVersion:1,contractId:policy.contractId,contractVersion:1,providerKey:'chatgpt',
  channel:policy.channel,scope:policy.scope,epoch:1,session:'namespace-session',generation:1,observedAt:at};
 const wrongMembership={...common,capability:'membership',
  subject:{kind:'conversation',conversationId:'ans03-namespace-chat'},
  observation:{membership:{state:'project',namespace:'other-account',projectId:'same-name'}}};
 await assert.rejects(()=>admitSourceStructureDTO(wrongMembership,policy),code('INVALID_REQUEST'));
 const wrongProject={...common,capability:'projectName',
  subject:{kind:'project',namespace:'other-account',projectId:'same-name',witnessConversationId:'ans03-namespace-chat'},
  observation:{currentName:'Same Name'}};
 await assert.rejects(()=>admitSourceStructureDTO(wrongProject,policy),code('INVALID_REQUEST'));
});
test('ANS-03 order contract rejects DOM-like partial pages, duplicate ranks and content-bearing rows',()=>{
 const policy=createSourceStructurePolicy({
  providerKey:'chatgpt',contractId:'ans03.order.fixture',contractVersion:1,
  channel:'synthetic_fixture',scope:'account-window',originClass:'fixture',
  capabilities:{windowOrder:'verified'},rules:{windowOrder:{subject:'order',fields:[]}}
 });
 const snapshot={
  schemaVersion:1,contractId:policy.contractId,contractVersion:1,providerKey:'chatgpt',
  capability:'windowOrder',channel:policy.channel,scope:policy.scope,generation:4,observedAt:at,
  completeness:{complete:true,truncated:false,continuation:null},
  items:[{conversationId:'ans03-order-one',rank:0},{conversationId:'ans03-order-two',rank:1}]
 };
 assert.equal(admitSourceOrderSnapshot(snapshot,policy).state,'available');
 for(const completeness of [
  {complete:false,truncated:false,continuation:null},
  {complete:false,truncated:true,continuation:'next-page'},
  {complete:true,truncated:false,continuation:'unexpected-next'}
 ])assert.deepEqual(admitSourceOrderSnapshot({...snapshot,completeness},policy),
   {state:'unavailable',reason:'INCOMPLETE_SCOPE'});
 assert.throws(()=>admitSourceOrderSnapshot({...snapshot,
  items:[{conversationId:'ans03-order-one',rank:0},{conversationId:'ans03-order-two',rank:0}]},policy),code('INVALID_REQUEST'));
 assert.throws(()=>admitSourceOrderSnapshot({...snapshot,
  items:[{conversationId:'ans03-order-one',rank:0},{conversationId:'ans03-order-one',rank:1}]},policy),code('INVALID_REQUEST'));
 assert.throws(()=>admitSourceOrderSnapshot({...snapshot,
  items:[{conversationId:'ans03-order-one',rank:0,originalText:'SYNTHETIC_BODY'}]},policy),code('INVALID_REQUEST'));
});

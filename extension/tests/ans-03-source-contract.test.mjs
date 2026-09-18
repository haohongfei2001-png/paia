import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {completeFixture} from './harness/original-complete.mjs';
import {SourceStructureStore} from '../core/source-structure-store.js';
import {
 createSourceStructurePolicy,admitSourceStructureDTO,admitSourceOrderSnapshot,
 CHATGPT_SOURCE_STRUCTURE_POLICY
} from '../core/source-structure-admission.js';

const at=n=>new Date(Date.UTC(2026,8,19,0,n,0)).toISOString();
const session='ans03-synthetic-session';
const synthetic=createSourceStructurePolicy({
 providerKey:'chatgpt',contractId:'ans03.synthetic.structure',contractVersion:1,
 channel:'synthetic_fixture',scope:'conversation',originClass:'fixture',
 capabilities:{conversationIdentity:'verified',membership:'verified',move:'verified',
  projectName:'verified',rename:'verified',conversationDeletion:'verified',
  projectOrder:'verified'},
 rules:{
  conversationIdentity:{subject:'conversation',fields:['sourceStatus'],sourceStatus:['observed_active']},
  membership:{subject:'conversation',fields:['membership']},
  move:{subject:'conversation',fields:['membership']},
  projectName:{subject:'project',fields:['currentName']},
  rename:{subject:'project',fields:['currentName']},
  conversationDeletion:{subject:'conversation',fields:['sourceStatus'],sourceStatus:['confirmed_deleted']},
  projectOrder:{subject:'order',fields:[]}
 }
});
const dto=(capability,subject,observation,generation)=>({
 schemaVersion:1,contractId:synthetic.contractId,contractVersion:1,providerKey:'chatgpt',
 capability,channel:synthetic.channel,scope:synthetic.scope,epoch:7,session,generation,
 observedAt:at(generation),subject,observation
});
const stable=state=>state.records.map(r=>({
 id:r.id,sourceKey:r.sourceKey,dedupeKey:r.dedupeKey,
 contentHash:r.contentHash,originalText:r.originalText,capturedAt:r.capturedAt
}));

test('ANS-03 production adapter declares capabilities individually and emits only audited current-conversation presence',async()=>{
 const context={};vm.createContext(context);
 vm.runInContext(await readFile(new URL('../adapter/source-structure-contract.js',import.meta.url),'utf8'),context);
 vm.runInContext(await readFile(new URL('../adapter/chatgpt-source-structure.js',import.meta.url),'utf8'),context);
 const caps=JSON.parse(JSON.stringify(context.SourceStructureContract.capabilities));
 assert.equal(caps.conversationIdentity,'verified');
 for(const key of ['projectIdentity','projectName','membership','projectOrder','windowOrder','rename','move','conversationDeletion','projectDeletion'])
  assert.equal(caps[key],'unverified',key);
 const id='ans03-current-conversation';
 const adapter={version:'0.3.0',route:()=>({code:'READY',id,url:`https://chatgpt.com/c/${id}`})};
 const source=new context.ChatGPTSourceStructure({adapter,clock:()=>at(1)});
 const emitted=source.observe({enabled:true,consented:true,adapterVersion:'0.3.0',epoch:7},{session});
 assert.deepEqual(JSON.parse(JSON.stringify(emitted.dto.observation)),{});
 assert.deepEqual(Object.keys(emitted.dto.subject),['kind','conversationId']);
 assert.equal(source.observe({enabled:true,consented:true,adapterVersion:'0.3.0',epoch:7},{session}),null);
 assert.equal(context.SourceStructureContract.currentConversationPresence({
  chat:{id,url:`https://chatgpt.com/g/project-looking/c/${id}`},epoch:7,session,generation:1,observedAt:at(1)
 }),null,'/g route text is never Project evidence');
});
test('ANS-03 production admission persists presence only after the conversation has an archived source',async()=>{
 const {s}=await completeFixture({texts:['ANS03 production presence source']});
 const state=await s.snapshot(),conv=state.conversations[0].sourceConversationId;
 const structure=new SourceStructureStore(s);
 const value={
  schemaVersion:1,contractId:CHATGPT_SOURCE_STRUCTURE_POLICY.contractId,contractVersion:1,
  providerKey:'chatgpt',capability:'conversationIdentity',channel:'isolated_route',
  scope:'current_conversation',epoch:3,session,generation:1,observedAt:at(2),
  subject:{kind:'conversation',conversationId:conv},observation:{}
 };
 const admitted=await admitSourceStructureDTO(value);
 const result=await structure.observeAdmitted(admitted);
 assert.equal(result.settled,true);assert.equal(result.changed,true);assert.equal(result.event,false);
 const row=await structure.conversation({platform:'chatgpt',sourceConversationId:conv});
 assert.equal(row.sourceStatus,'unknown');assert.equal(row.membership.state,'unknown');
 assert.equal(row.relationshipRevision,0);
 assert.match(row.lastEvidenceId,/^obs:/);
 const missing=await admitSourceStructureDTO({...value,generation:2,observedAt:at(3),
  subject:{kind:'conversation',conversationId:'ans03-not-archived'}});
 assert.deepEqual(await structure.observeAdmitted(missing),
  {settled:false,excluded:false,changed:false});
});

test('ANS-03 production identity evidence cannot resurrect a confirmed deletion',async()=>{
 const {s}=await completeFixture({texts:['ANS03 deleted source stays deleted']});
 const state=await s.snapshot(),conv=state.conversations[0].sourceConversationId;
 const structure=new SourceStructureStore(s),conversation={kind:'conversation',conversationId:conv};
 const apply=async value=>structure.observeAdmitted(await admitSourceStructureDTO(value,synthetic));
 await apply(dto('conversationDeletion',conversation,{sourceStatus:'confirmed_deleted'},1));
 const before=await structure.conversation({platform:'chatgpt',sourceConversationId:conv});
 assert.equal(before.sourceStatus,'confirmed_deleted');assert.equal(before.relationshipRevision,1);
 const production={
  schemaVersion:1,contractId:CHATGPT_SOURCE_STRUCTURE_POLICY.contractId,contractVersion:1,
  providerKey:'chatgpt',capability:'conversationIdentity',channel:'isolated_route',
  scope:'current_conversation',epoch:8,session:'ans03-route-after-delete',generation:2,observedAt:at(2),
  subject:{kind:'conversation',conversationId:conv},observation:{}
 };
 const result=await structure.observeAdmitted(await admitSourceStructureDTO(production));
 const after=await structure.conversation({platform:'chatgpt',sourceConversationId:conv});
 const history=await structure.history({kind:'conversation',conversationRef:{platform:'chatgpt',sourceConversationId:conv}});
 assert.equal(result.settled,true);assert.equal(result.event,false);
 assert.equal(after.sourceStatus,'confirmed_deleted');assert.equal(after.relationshipRevision,1);
 assert.equal(history.items.length,1);assert.equal(history.items[0].after.sourceStatus,'confirmed_deleted');
});
test('ANS-03 generic admitted DTO path handles none → A → B → rename → delete → reappear without changing Input truth',async()=>{
 const {s}=await completeFixture({texts:['ANS03 stable original','ANS03 stable original']});
 const before=await s.snapshot(),conv=before.conversations[0].sourceConversationId;
 const structure=new SourceStructureStore(s),conversation={kind:'conversation',conversationId:conv};
 const A={namespace:'account-main',projectId:'project-a'};
 const B={namespace:'account-main',projectId:'project-b'};
 const apply=async value=>structure.observeAdmitted(await admitSourceStructureDTO(value,synthetic));
 await apply(dto('membership',conversation,{membership:{state:'unassigned'}},1));
 await apply(dto('membership',conversation,{membership:{state:'project',...A}},2));
 await apply(dto('projectName',{kind:'project',...A,witnessConversationId:conv},{currentName:'Project A'},3));
 await apply(dto('move',conversation,{membership:{state:'project',...B}},4));
 await apply(dto('projectName',{kind:'project',...B,witnessConversationId:conv},{currentName:'Project B'},5));
 await apply(dto('rename',{kind:'project',...B,witnessConversationId:conv},{currentName:'Renamed B'},6));
 await apply(dto('conversationDeletion',conversation,{sourceStatus:'confirmed_deleted'},7));
 await apply(dto('conversationIdentity',conversation,{sourceStatus:'observed_active'},8));
 const row=await structure.conversation({platform:'chatgpt',sourceConversationId:conv});
 assert.equal(row.membership.state,'project');assert.equal(row.membership.projectRef.projectId,'project-b');
 assert.equal(row.sourceStatus,'observed_active');assert.equal(row.relationshipRevision,5);
 const project=await structure.project({providerKey:'chatgpt',...B});
 assert.equal(project.currentName,'Renamed B');assert.equal(project.relationshipRevision,2);
 assert.equal((await structure.history({kind:'conversation',conversationRef:{platform:'chatgpt',sourceConversationId:conv}})).items.length,5);
 assert.deepEqual(stable(await s.snapshot()),stable(before));
});
test('ANS-03 order admission requires complete explicit scope and rejects rank gaps as unavailable',()=>{
 const base={
  schemaVersion:1,contractId:synthetic.contractId,contractVersion:1,providerKey:'chatgpt',
  capability:'projectOrder',channel:synthetic.channel,scope:synthetic.scope,generation:9,
  observedAt:at(9),completeness:{complete:true,truncated:false,continuation:null},
  items:[{conversationId:'ans03-order-a',rank:0},{conversationId:'ans03-order-b',rank:1}]
 };
 assert.deepEqual(admitSourceOrderSnapshot(base,synthetic),{
  state:'available',scope:'conversation',generation:9,items:base.items
 });
 assert.deepEqual(admitSourceOrderSnapshot({...base,completeness:{complete:false,truncated:true,continuation:'next'}},synthetic),
  {state:'unavailable',reason:'INCOMPLETE_SCOPE'});
 assert.deepEqual(admitSourceOrderSnapshot({...base,items:[{conversationId:'ans03-order-a',rank:0},{conversationId:'ans03-order-b',rank:2}]},synthetic),
  {state:'unavailable',reason:'INCOMPLETE_SCOPE'});
 assert.deepEqual(admitSourceOrderSnapshot({...base,capability:'projectOrder'},CHATGPT_SOURCE_STRUCTURE_POLICY),
  {state:'unavailable',reason:'UNVERIFIED'});
});

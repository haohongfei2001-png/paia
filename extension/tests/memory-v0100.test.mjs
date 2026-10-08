import {assertRetiredContext} from './harness/retired-context.mjs';
import test from 'node:test';import assert from 'node:assert/strict';
import {setup,local} from './harness/thought-m1.mjs';import {OrganizerStore} from '../core/organizer/store.js';import {MemoryService} from '../core/memory/service.js';import {BUDGETS} from '../core/memory/model.js';
async function fixture(){const {s,indexedDB,storage}=await setup(OrganizerStore);const session=local();session.remove=async k=>session.set({[k]:undefined});const m=new MemoryService(s,{session});const topics={};for(const [name,body,type]of [['PAIA 项目','下一步完善 PAIA 的产品可靠性和授权预览。','decision'],['文学创作','PRIVATE_LITERATURE 不应泄漏的文学正文。','idea'],['求职','EXCLUDED_SALARY 私人薪资记录。','fact']]){const t=await s.createTopic({operationId:crypto.randomUUID(),name}),e=await s.createEntry({operationId:crypto.randomUUID(),actor:'user',body,type,formation:'explicit',evidence:[]});await s.placeEntry({operationId:crypto.randomUUID(),topicId:t.id,entryId:e.id,expectedEntryRevision:e.revision,expectedTopicRevision:(await s.topic(t.id)).organizationRevision});topics[name]={...t,entryId:e.id};}return {s,m,session,topics,indexedDB,storage};}
test("Current retirement / historical scenario: Memory default denies all, explicit Topic allow is local and rejected Topic/Entry never enter candidates",async()=>{
 await assertRetiredContext({"owner": "memory", "method": "build", "action": "create", "variant": "denied"});
});
test("Current retirement / historical scenario: Memory budgets are hard, deterministic and current Thought edit invalidates old preview sharing",async()=>{
 await assertRetiredContext({"owner": "memory", "method": "share", "action": "share", "variant": "edited", "long": true});
});
test("Current retirement / historical scenario: Memory temporary allow is session-only, deny wins, browser session reset removes it",async()=>{
 await assertRetiredContext({"owner": "memory", "method": "authorize", "action": "create", "variant": "revoked", "payload": {"decision": "allowed", "scope": "session"}});
});

test("Current retirement / historical scenario: Memory shared Entry cannot bypass a denied Topic; exclusion applies to every Profile and Section",async()=>{
 await assertRetiredContext({"owner": "memory", "method": "candidates", "action": "create", "variant": "excluded"});
});
test("Current retirement / historical scenario: Memory revoked and merged scopes fail closed across service instances",async()=>{
 await assertRetiredContext({"owner": "memory", "method": "build", "action": "create", "variant": "revoked"});
});
test("Current retirement / historical scenario: Memory metadata contains no Thought/query/context copies and activity clears independently",async()=>{
 await assertRetiredContext({"owner": "memory", "method": "share", "action": "share", "variant": "allowed"});
});
test("Current retirement / historical scenario: Memory profile lifecycle preserves Thought and requires compare-and-swap revision",async()=>{
 await assertRetiredContext({"owner": "memory", "method": "profile", "action": "update", "variant": "allowed"});
});

test("Current retirement / historical scenario: Memory global never overrides temporary status across Profiles and refuses a new session grant",async()=>{
 await assertRetiredContext({"owner": "memory", "method": "authorize", "action": "create", "variant": "never", "payload": {"decision": "allowed", "scope": "session"}});
});
import test from 'node:test';import assert from 'node:assert/strict';
import {completeFixture,append,response,rows} from './harness/original-complete.mjs';
import {productReply} from './fixtures/product-history-v080.mjs';import {conversation,historyFile} from './fixtures/history-v090.mjs';
import {ImportCoordinator} from '../core/import/coordinator.js';import {ImportLedger} from '../core/import/ledger.js';import {officialExportAdapter} from '../core/import/chatgpt-export.js';import {AIPresentationRunner} from '../core/organizer/ai-presentation.js';
test('time-only enrichment marks affected AI stale while retaining content, protections and Original checkpoint',async()=>{
 const f=await completeFixture({texts:[],fetchImpl:async(_u,init)=>response(productReply(JSON.parse(init.body)))}),c=conversation(1,1),m=Object.values(c.mapping)[1].message;
 await append(f.s,m.content.parts[0],m.id,c.id);await f.runner.wake({userActionId:crypto.randomUUID()});const topic=(await f.s.libraryIndexPage()).items[0];
 const runner=new AIPresentationRunner(f.s,{provider:f.provider,credentials:f.credentials});const r=await runner.wake({topicId:topic.id,userActionId:crypto.randomUUID()});assert.equal(r.error,undefined);
 const before=(await f.s.aiPresentationStatus()).topics[0].presentation;assert.equal(before.stale,false);const entries=await rows(f.s,'thoughts'),ledger=new ImportLedger(f.s),coordinator=new ImportCoordinator({adapter:officialExportAdapter,transport:(method,q)=>ledger[method](q,'time-page')});
 await coordinator.select(historyFile([c]),{consent:true});await coordinator.preflight();await coordinator.commit();assert.equal(f.requests.length,2);
 const state=await f.s.aiPresentationStatus(),after=state.topics[0].presentation;assert.equal(state.pendingTopics,1);assert.equal(after.stale,true);assert.equal(after.currentView,before.currentView);assert.deepEqual(after.protections,before.protections);assert.deepEqual(await rows(f.s,'thoughts'),entries);
 assert.equal((await f.s.originalOrganizerStatus()).pendingInput,0);
});

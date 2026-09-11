import test from 'node:test';
import assert from 'node:assert/strict';
import {validateDeepSeekResponse} from '../core/organizer/deepseek.js';
import {existingSectionForProposal,isLowDurabilityTopic,stabilizeTopicProposal} from '../core/organizer/topic-quality.js';
import {completeFixture,append,rows,success} from './harness/original-complete.mjs';

const limits={maxOutputBytes:64*1024};
const request=(text,topicCandidates=[])=>({inputs:[{ref:'i0',role:'primary',text}],topicCandidates});
const output=(topic,section={proposedName:'后续计划'},relatedGroupingCandidate=null)=>({items:[{inputRef:'i0',topic,section,type:'idea',relatedGroupingCandidate,spans:[],uncertain:false}]});
const action=()=>({userActionId:crypto.randomUUID()});

test('Round 5: DeepSeek validated DTO remains compatible with the production Simple Original runner',async()=>{
 const f=await completeFixture({texts:['PAIA 产品设计应该保留原话。'],batchLimit:20});
 const result=await f.runner.wake(action());
 assert.equal(result.error,undefined);
 assert.equal(result.providerRequestCount,1);
 assert.equal((await rows(f.s,'thoughts')).length,1);
 assert.equal((await rows(f.s,'topics')).length,1);
});

test('Round 5: low-durability Topic proposal reuses a strong existing durable Topic and promotes a useful Section',()=>{
 const candidates=[{id:'t0',name:'PAIA 产品设计',sections:[{id:'s0',name:'产品定位'}]}];
 const checked=validateDeepSeekResponse('original_classification',output({proposedName:'软件版本发布'}),request('PAIA v0.12 的软件版本发布主要调整思想库阅读。',candidates),limits);
 assert.deepEqual(checked.invalidItems,[]);
 assert.deepEqual(checked.items[0].topic,{existingTopicId:'t0'});
 assert.deepEqual(checked.items[0].section,{proposedName:'软件版本发布'});
});

test('Round 5: low-durability Topic without a credible existing candidate falls back instead of creating a fragment',()=>{
 const candidates=[{id:'t0',name:'求职与职业选择',sections:[{id:'s0',name:'岗位筛选'}]}];
 const checked=validateDeepSeekResponse('original_classification',output({proposedName:'想法与后续计划'}),request('PAIA 的页面动效还要再调一次。',candidates),limits);
 assert.deepEqual(checked.items[0].topic,{});
 assert.deepEqual(checked.items[0].section,{});
});

test('Round 5: ambiguous low-durability input does not pick the first strong Topic by array order',()=>{
 const candidates=[{id:'t-paia',name:'PAIA 产品设计',sections:[]},{id:'t-workflow',name:'AI 工具与工作流',sections:[]}];
 const checked=validateDeepSeekResponse('original_classification',output({proposedName:'版本发布'}),request('比较 PAIA 产品设计和 AI 工具与工作流的版本发布策略。',candidates),limits);
 assert.deepEqual(checked.items[0].topic,{});
 assert.deepEqual(checked.items[0].section,{});
 const decision=stabilizeTopicProposal({inputText:'比较 PAIA 产品设计和 AI 工具与工作流的版本发布策略。',proposedName:'版本发布',topicCandidates:candidates});
 assert.equal(decision.reason,'low_durability_ambiguous');
});

test('Round 5: explicit related grouping can resolve an otherwise ambiguous low-durability input',()=>{
 const candidates=[{id:'t-paia',name:'PAIA 产品设计',sections:[]},{id:'t-workflow',name:'AI 工具与工作流',sections:[{id:'s-release',name:'版本发布'}]}];
 const checked=validateDeepSeekResponse('original_classification',output({proposedName:'版本发布'},{proposedName:'后续计划'},'AI 工具与工作流'),request('比较 PAIA 产品设计和 AI 工具与工作流的版本发布策略。',candidates),limits);
 assert.deepEqual(checked.items[0].topic,{existingTopicId:'t-workflow'});
 assert.deepEqual(checked.items[0].section,{existingSectionId:'s-release'});
});

test('Round 5: overlapping generic words do not collapse a distinct durable product Topic',()=>{
 const candidates=[{id:'t0',name:'PAIA 产品设计',sections:[{id:'s0',name:'产品定位'}]}];
 const checked=validateDeepSeekResponse('original_classification',output({proposedName:'职业匹配产品设计'},{proposedName:'产品定位'}),request('职业匹配产品设计需要建立独立的产品定位和用户流程。',candidates),limits);
 assert.deepEqual(checked.items[0].topic,{proposedName:'职业匹配产品设计'});
 assert.deepEqual(checked.items[0].section,{proposedName:'产品定位'});
});

test('Round 5: durable distinct Topic proposals are not force-folded into unrelated candidates',()=>{
 const candidates=[{id:'t0',name:'PAIA 产品设计',sections:[{id:'s0',name:'产品定位'}]}];
 const checked=validateDeepSeekResponse('original_classification',output({proposedName:'理论物理研究'},{proposedName:'B→K 形状因子'}),request('理论物理研究里继续计算 B→K 形状因子。',candidates),limits);
 assert.deepEqual(checked.items[0].topic,{proposedName:'理论物理研究'});
 assert.deepEqual(checked.items[0].section,{proposedName:'B→K 形状因子'});
});

test('Round 5: near-duplicate Topic and Section names resolve to existing request-local ids',()=>{
 const candidates=[{id:'t0',name:'AI 工具与工作流',sections:[{id:'s0',name:'版本发布'}]}];
 const checked=validateDeepSeekResponse('original_classification',output({proposedName:'AI工具工作流'},{proposedName:'软件版本发布'}),request('继续整理 AI 工具工作流的软件版本发布过程。',candidates),limits);
 assert.deepEqual(checked.items[0].topic,{existingTopicId:'t0'});
 assert.deepEqual(checked.items[0].section,{existingSectionId:'s0'});
 assert.equal(existingSectionForProposal(candidates[0],'软件版本发布'),'s0');
});

test('Round 5: production flow keeps a release subtheme inside the existing PAIA Topic instead of creating a one-entry Topic',async()=>{
 const f=await completeFixture({texts:['PAIA 产品设计需要保留原话与用户控制。'],batchLimit:20,fetchImpl:async(_u,init)=>success(init,items=>items.map(x=>({...x,topic:{proposedName:'PAIA 产品设计'},section:{proposedName:'产品定位'}})))});
 await f.runner.wake(action());
 const firstTopic=(await rows(f.s,'topics'))[0];
 await append(f.s,'PAIA v0.12 的软件版本发布主要调整思想库阅读体验。');
 f.provider.fetchImpl=async(_u,init)=>success(init,items=>items.map(x=>({...x,topic:{proposedName:'软件版本发布'},section:{proposedName:'后续计划'}})));
 const result=await f.runner.wake(action());
 assert.equal(result.error,undefined);
 const topics=await rows(f.s,'topics'),placements=await rows(f.s,'placements'),sections=await rows(f.s,'sections');
 assert.equal(topics.length,1);
 assert.equal(topics[0].id,firstTopic.id);
 assert.equal(placements.filter(x=>x.topicId===firstTopic.id&&x.lifecycle==='active').length,2);
 assert.ok(sections.some(x=>x.topicId===firstTopic.id&&x.title==='软件版本发布'));
});

test('Round 5: a genuinely new durable subject still creates a new Topic',async()=>{
 const f=await completeFixture({texts:['PAIA 产品设计需要保留原话与用户控制。'],batchLimit:20,fetchImpl:async(_u,init)=>success(init,items=>items.map(x=>({...x,topic:{proposedName:'PAIA 产品设计'}})))});
 await f.runner.wake(action());
 await append(f.s,'理论物理研究继续计算 B→K 形状因子，并整理 trace。');
 f.provider.fetchImpl=async(_u,init)=>success(init,items=>items.map(x=>({...x,topic:{proposedName:'理论物理研究'},section:{proposedName:'B→K 形状因子'}})));
 const result=await f.runner.wake(action());
 assert.equal(result.error,undefined);
 assert.deepEqual((await rows(f.s,'topics')).map(x=>x.name).sort(),['PAIA 产品设计','理论物理研究'].sort());
});

test('Round 5: Topic stability policy is conservative and deterministic',()=>{
 assert.equal(isLowDurabilityTopic('软件版本发布'),true);
 assert.equal(isLowDurabilityTopic('想法与后续计划'),true);
 assert.equal(isLowDurabilityTopic('理论物理研究'),false);
 const reuse=stabilizeTopicProposal({inputText:'PAIA v0.12 发布记录',proposedName:'软件版本发布',topicCandidates:[{id:'t0',name:'PAIA 产品设计',sections:[]}]});
 assert.equal(reuse.existingTopicId,'t0');
 const preserve=stabilizeTopicProposal({inputText:'理论物理研究 B→K',proposedName:'理论物理研究',topicCandidates:[{id:'t0',name:'PAIA 产品设计',sections:[]}]});
 assert.equal(preserve.existingTopicId,null);
 assert.equal(preserve.suppressNewTopic,false);
});

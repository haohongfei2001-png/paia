import assert from 'node:assert/strict';
import {stabilizeTopicProposal} from '../core/organizer/topic-quality.js';

const topic=(id,name,sections=[])=>({id,name,sections:sections.map((name,index)=>({id:`${id}-s${index}`,name}))});
const paia=topic('t-paia','PAIA 产品设计',['产品定位','隐私边界']);
const workflow=topic('t-workflow','AI 工具与工作流',['浏览器与扩展','版本发布']);
const career=topic('t-career','求职与职业选择',['岗位筛选','投递策略']);
const physics=topic('t-physics','理论物理研究',['B→K 形状因子']);

const cases=[
 {name:'PAIA release folds to PAIA',inputText:'PAIA v0.12 的软件版本发布主要调整思想库阅读。',proposedName:'软件版本发布',candidates:[paia,workflow],expect:'t-paia'},
 {name:'workflow release folds to workflow',inputText:'Chrome 扩展的版本发布要跑完整测试。',proposedName:'版本发布',candidates:[workflow,paia],expect:'t-workflow'},
 {name:'PAIA update folds to PAIA',inputText:'PAIA 本次更新主要是 Topic 稳定性。',proposedName:'本次更新',candidates:[paia],expect:'t-paia'},
 {name:'career progress folds to career',inputText:'求职与职业选择最近的项目进展是继续筛岗位。',proposedName:'项目进展',candidates:[career],expect:'t-career'},
 {name:'generic follow-up folds when candidate is strong',inputText:'PAIA 还有一些后续计划要处理。',proposedName:'想法与后续计划',candidates:[paia],expect:'t-paia'},
 {name:'temporary label falls back without candidate',inputText:'这个窗口满了，先记下来。',proposedName:'chat窗口',candidates:[],expect:'fallback'},
 {name:'generic plan falls back when unrelated',inputText:'PAIA 的页面还要调整。',proposedName:'后续计划',candidates:[career],expect:'fallback'},
 {name:'version release falls back when unrelated',inputText:'一个未命名软件要发布。',proposedName:'软件版本发布',candidates:[career],expect:'fallback'},
 {name:'durable physics stays new',inputText:'理论物理研究继续计算 B→K 形状因子。',proposedName:'理论物理研究',candidates:[paia,career],expect:'new'},
 {name:'durable career stays new',inputText:'开始系统思考求职与职业选择。',proposedName:'求职与职业选择',candidates:[paia,workflow],expect:'new'},
 {name:'durable literature stays new',inputText:'重新整理早期小说的叙事结构。',proposedName:'文学与创作',candidates:[paia,physics],expect:'new'},
 {name:'durable health stays new',inputText:'开始记录运动和睡眠习惯。',proposedName:'健康与生活习惯',candidates:[career,paia],expect:'new'},
 {name:'near duplicate PAIA reuses',inputText:'继续做 PAIA。',proposedName:'PAIA产品设计',candidates:[paia],expect:'t-paia'},
 {name:'near duplicate workflow reuses',inputText:'整理 AI 工具。',proposedName:'AI工具工作流',candidates:[workflow],expect:'t-workflow'},
 {name:'near duplicate career reuses',inputText:'继续求职。',proposedName:'求职与职业选择规划',candidates:[career],expect:'t-career'},
 {name:'distinct PAIA subproduct stays new when durable',inputText:'PAIA 之外单独做一个职业匹配产品。',proposedName:'职业匹配产品',candidates:[paia],expect:'new'},
 {name:'distinct physics project stays new',inputText:'新开一个量子信息学习项目。',proposedName:'量子信息学习',candidates:[physics],expect:'new'},
 {name:'related grouping only does not force durable proposal',inputText:'PAIA 的官网之外考虑独立品牌。',proposedName:'品牌命名',relatedGroupingCandidate:'PAIA 产品设计',candidates:[paia],expect:'new'}
];

let correct=0,falseFold=0,fragmentHandled=0;
for(const item of cases){const decision=stabilizeTopicProposal({inputText:item.inputText,proposedName:item.proposedName,relatedGroupingCandidate:item.relatedGroupingCandidate,topicCandidates:item.candidates});const actual=decision.existingTopicId||decision.suppressNewTopic?'fallback':'new';const resolved=decision.existingTopicId||actual;if(resolved===item.expect)correct++;if(item.expect==='new'&&decision.existingTopicId)falseFold++;if(item.expect!=='new'&&(decision.existingTopicId||decision.suppressNewTopic))fragmentHandled++;else if(item.expect==='new'){};}
const result={cases:cases.length,correct,accuracy:correct/cases.length,falseFold,fragmentHandled,fragmentCases:cases.filter(x=>x.expect!=='new').length};
assert.equal(correct,cases.length,'Round 5 deterministic Topic policy benchmark regression');
assert.equal(falseFold,0,'Round 5 must not fold durable new subjects into an existing Topic');
assert.equal(fragmentHandled,result.fragmentCases,'Round 5 must handle every labeled fragment case');
console.log(JSON.stringify(result,null,2));

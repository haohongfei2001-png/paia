import {prefix} from '../thought-model.js';
import {inputProjection} from '../thought-evidence.js';

const normalized=text=>String(text||'').normalize('NFKC').toLocaleLowerCase().replace(/[\s\p{P}]/gu,'');
const transient=/^(?:chat(?:gpt)?窗口|窗口满(?:了)?|下一步(?:操作)?|安装状态|这个怎么办|怎么办|继续|继续操作|现在做什么|操作步骤|报错(?:了)?|测试(?:一下)?|状态|好的|可以了)$/u;
const lowDurability=/^(?:想法与后续计划|后续计划|后续安排|下一步计划|近期计划|软件版本发布|版本发布|版本更新|功能更新|本次更新|更新记录|当前进展|项目进展|问题反馈|问题与反馈|反馈与改动|临时想法|零散想法|一些想法)$/u;
const sectionWorthy=/^(?:软件版本发布|版本发布|版本更新|功能更新|更新记录)$/u;
const genericSection=/^(?:正文|其他|其他想法|后续计划|下一步计划|想法与后续计划|待整理|杂项)$/u;
export const isTransientTopic=name=>transient.test(normalized(name));
export const isLowDurabilityTopic=name=>isTransientTopic(name)||lowDurability.test(normalized(name));
export const isSectionWorthyFragment=name=>sectionWorthy.test(normalized(name));
export const isGenericSectionName=name=>genericSection.test(normalized(name));
export function topicTokens(text){const parts=String(text||'').normalize('NFKC').toLocaleLowerCase().match(/[a-z0-9]{2,}|[\p{Script=Han}]+/gu)||[],out=new Set();for(const part of parts){if(/^[a-z0-9]/.test(part))out.add(part);else for(let i=0;i<part.length-1;i++)out.add(part.slice(i,i+2));}return out;}
const tokenWeight=token=>/^[a-z0-9]/.test(token)?(token.length>=4?3:2):1;
const tokenStats=(left,right)=>{const a=topicTokens(left),b=topicTokens(right);let weighted=0,common=0;for(const token of a)if(b.has(token)){common++;weighted+=tokenWeight(token);}return {weighted,common,left:a.size,right:b.size};};
const closeSectionNames=(a,b)=>{const left=normalized(a),right=normalized(b);if(!left||!right)return false;if(left===right)return true;if(Math.min(left.length,right.length)>=4&&(left.includes(right)||right.includes(left)))return true;const stats=tokenStats(a,b),den=Math.max(1,Math.min(stats.left,stats.right));return stats.common>=2&&stats.common/den>=0.6;};
// Topic identity is intentionally stricter than Section similarity. A generic
// suffix such as “产品设计” must not collapse a distinct durable subject into
// “PAIA 产品设计” merely because their short tail overlaps.
const closeTopicNames=(a,b)=>{const left=normalized(a),right=normalized(b);if(!left||!right)return false;if(left===right)return true;const lengthRatio=Math.min(left.length,right.length)/Math.max(left.length,right.length);if(lengthRatio<0.7)return false;if(Math.min(left.length,right.length)>=4&&(left.includes(right)||right.includes(left)))return true;const stats=tokenStats(a,b),den=Math.max(1,Math.min(stats.left,stats.right));return stats.common>=2&&stats.common/den>=0.7;};
const candidateText=candidate=>[candidate?.name,...(candidate?.sections||[]).map(section=>section?.name).filter(name=>name&&!isGenericSectionName(name)&&!isLowDurabilityTopic(name))].filter(Boolean).join(' ');
const strongCandidateMatch=(inputText,candidate)=>{const candidateName=normalized(candidate?.name),input=normalized(inputText);if(candidateName&&candidateName.length>=4&&input.includes(candidateName))return true;return tokenStats(inputText,candidateText(candidate)).weighted>=3;};
export function stabilizeTopicProposal({inputText,proposedName,relatedGroupingCandidate=null,topicCandidates=[]}={}){
 const proposal=typeof proposedName==='string'?proposedName.trim():'',related=typeof relatedGroupingCandidate==='string'?relatedGroupingCandidate.trim():'',candidates=Array.isArray(topicCandidates)?topicCandidates.filter(item=>item&&typeof item.id==='string'&&typeof item.name==='string'):[];
 if(proposal){const duplicate=candidates.find(candidate=>closeTopicNames(proposal,candidate.name));if(duplicate)return {existingTopicId:duplicate.id,suppressNewTopic:false,promotedSectionName:null,reason:'near_duplicate'};}
 if(!proposal||!isLowDurabilityTopic(proposal))return {existingTopicId:null,suppressNewTopic:false,promotedSectionName:null,reason:null};
 const strongMatches=candidates.filter(candidate=>strongCandidateMatch(inputText,candidate)),relatedMatch=related?strongMatches.find(candidate=>closeTopicNames(related,candidate.name)):null;
 if(relatedMatch)return {existingTopicId:relatedMatch.id,suppressNewTopic:false,promotedSectionName:isSectionWorthyFragment(proposal)?proposal:null,reason:'low_durability_related_reuse'};
 if(strongMatches.length===1)return {existingTopicId:strongMatches[0].id,suppressNewTopic:false,promotedSectionName:isSectionWorthyFragment(proposal)?proposal:null,reason:'low_durability_reuse'};
 if(strongMatches.length>1)return {existingTopicId:null,suppressNewTopic:true,promotedSectionName:null,reason:'low_durability_ambiguous'};
 return {existingTopicId:null,suppressNewTopic:true,promotedSectionName:null,reason:'low_durability_unassigned'};
}
export function existingSectionForProposal(topicCandidate,proposedName){if(!topicCandidate||typeof proposedName!=='string'||!proposedName.trim())return null;const section=(topicCandidate.sections||[]).find(item=>item&&typeof item.id==='string'&&typeof item.name==='string'&&!isGenericSectionName(item.name)&&closeSectionNames(proposedName,item.name));return section?.id||null;}
const overlap=(query,text)=>{const tokens=topicTokens(text);let n=0;for(const token of tokens)if(query.has(token))n+=/^[a-z]/.test(token)?3:1;return n;};
async function eligibleSnippet(s,t,entryId,filter){
 let entry;try{entry=await s.readableEntry(t,entryId);}catch{return '';}
 if(!entry||entry.lifecycle!=='active')return '';
 const refs=await t.all('provenance','byOwner',prefix(['entry',entryId]));
 if(!refs.length&&entry.provenanceType!=='user_created')return '';
 for(const id of new Set(refs.map(x=>x.inputId))){const p=await inputProjection(s,t,id);if(!p||await s.isFiltered(t,p.block,filter))return '';}
 return entry.thoughtText.slice(0,1200);
}
// All scoring stays in transient local memory. Only eight Topic names and their
// Section names reach the DTO; entry excerpts and scores never leave this layer.
export async function rankTopicCandidates(s,t,texts,preferredIds=[]){
 const query=topicTokens(texts.join('\n')),preferred=new Set(preferredIds),filter=await t.get('meta','smart-filter'),ranked=[];
 for(const raw of await t.all('topics')){if(raw.lifecycle!=='active'||raw.redirectTo||raw.layoutJobId)continue;const topic=await s.safeOrganization(t,'topic',raw);if(topic.sourceUnavailable)continue;const isPreferred=preferred.has(topic.id),human=topic.createdBy==='user'||topic.protections?.name?.locked===true,fragment=isLowDurabilityTopic(topic.name)&&!human,score=overlap(query,topic.name)*4+overlap(query,topic.summary)*2+(isPreferred?100:0);ranked.push({topic,score,isPreferred,human,fragment});}
 ranked.sort((a,b)=>b.score-a.score||(a.topic.negativeUpdatedSequence||0)-(b.topic.negativeUpdatedSequence||0)||a.topic.id.localeCompare(b.topic.id));
 const shortlist=ranked.slice(0,32);
 for(const item of shortlist){const placements=await t.all('placements','byTopicOrder',prefix([item.topic.id,item.topic.activeLayoutGeneration,0]),6);let evidenceScore=0;for(const placement of placements)evidenceScore+=overlap(query,await eligibleSnippet(s,t,placement.entryId,filter));item.score+=Math.min(12,evidenceScore);if((item.score>0||item.isPreferred)&&item.human)item.score+=4;if((item.score>0||item.isPreferred)&&placements.length>1)item.score+=Math.min(4,placements.length-1);if(item.fragment&&!item.isPreferred)item.score-=12;}
 return shortlist.filter(x=>x.isPreferred||x.score>=4).sort((a,b)=>b.score-a.score||a.topic.id.localeCompare(b.topic.id)).slice(0,8).map(x=>x.topic.id);
}

const pairKey=(a,b)=>'topicKeepSeparate:'+JSON.stringify([a,b].sort());
export async function topicMergeSuggestions(s){await s.finishFoundation();return s.run(()=>s.repository.transaction(false,async t=>{
 const filter=await t.get('meta','smart-filter'),topics=[];
 for(const raw of (await t.all('topics')).filter(x=>x.lifecycle==='active'&&!x.redirectTo&&!x.layoutJobId).sort((a,b)=>(a.negativeUpdatedSequence||0)-(b.negativeUpdatedSequence||0)).slice(0,80)){const topic=await s.safeOrganization(t,'topic',raw);if(topic.sourceUnavailable||topic.name==='未归入主题')continue;let text=topic.name+' '+topic.summary;for(const p of await t.all('placements','byTopicOrder',prefix([topic.id,topic.activeLayoutGeneration,0]),4))text+=' '+await eligibleSnippet(s,t,p.entryId,filter);topics.push({topic,tokens:topicTokens(text)});}
 const items=[];
 for(let i=0;i<topics.length;i++)for(let j=i+1;j<topics.length;j++){const a=topics[i],b=topics[j];if(await t.get('meta',pairKey(a.topic.id,b.topic.id)))continue;let common=0;for(const token of a.tokens)if(b.tokens.has(token))common++;const score=common/Math.max(1,Math.min(a.tokens.size,b.tokens.size));if(common<5||score<0.55)continue;const target=a.topic.name.length>=b.topic.name.length?a.topic:b.topic,source=target===a.topic?b.topic:a.topic;items.push({sourceId:source.id,sourceName:source.name,targetId:target.id,targetName:target.name,score});}
 return {items:items.sort((a,b)=>b.score-a.score).slice(0,8).map(({score,...item})=>item)};
}));}
export async function keepTopicsSeparate(s,{sourceId,targetId}){return s.foundationWrite(async t=>{const a=await s.canonicalTopic(t,sourceId),b=await s.canonicalTopic(t,targetId);if(a.id===b.id)return {kept:false};await t.put('meta',{id:pairKey(a.id,b.id),sourceId:a.id,targetId:b.id,at:s.clock(),actor:'user'});return {kept:true};});}

// Suggestions only, using local existing headings/words; no Provider request.
export async function topicRenameSuggestions(s){await s.finishFoundation();return s.run(()=>s.repository.transaction(false,async t=>{const items=[],filter=await t.get('meta','smart-filter');for(const raw of await t.all('topics')){if(raw.lifecycle!=='active'||raw.redirectTo||raw.createdBy!=='ai'||raw.protections?.name?.locked||!isTransientTopic(raw.name))continue;const topic=await s.safeOrganization(t,'topic',raw);if(topic.sourceUnavailable)continue;let suggestedName='';const sections=await t.all('sections','byTopicOrder',prefix([topic.id,topic.activeLayoutGeneration,0]));suggestedName=sections.find(x=>x.title&&x.title.length>=4&&!isTransientTopic(x.title))?.title||'';if(!suggestedName){let text='';for(const p of await t.all('placements','byTopicOrder',prefix([topic.id,topic.activeLayoutGeneration,0]),3))text+=' '+await eligibleSnippet(s,t,p.entryId,filter);const label=text.match(/(?:^|[。！？：\s])([A-Za-z][A-Za-z0-9_-]{2,15})/);suggestedName=label?label[1]+' 相关思考':'想法与后续计划';}items.push({topicId:topic.id,name:topic.name,suggestedName,revision:topic.revision});if(items.length===8)break;}return {items};}));}

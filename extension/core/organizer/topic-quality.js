import {prefix} from '../thought-model.js';
import {inputProjection} from '../thought-evidence.js';

const normalized=text=>String(text||'').normalize('NFKC').toLocaleLowerCase().replace(/[\s\p{P}]/gu,'');
const transient=/^(?:chat(?:gpt)?窗口|窗口满(?:了)?|下一步(?:操作)?|安装状态|这个怎么办|怎么办|继续|继续操作|现在做什么|操作步骤|报错(?:了)?|测试(?:一下)?|状态|好的|可以了)$/u;
export const isTransientTopic=name=>transient.test(normalized(name));
export function topicTokens(text){const parts=String(text||'').normalize('NFKC').toLocaleLowerCase().match(/[a-z0-9]{2,}|[\p{Script=Han}]+/gu)||[],out=new Set();for(const part of parts){if(/^[a-z0-9]/.test(part))out.add(part);else for(let i=0;i<part.length-1;i++)out.add(part.slice(i,i+2));}return out;}
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
 for(const raw of await t.all('topics')){if(raw.lifecycle!=='active'||raw.redirectTo||raw.layoutJobId)continue;const topic=await s.safeOrganization(t,'topic',raw);if(topic.sourceUnavailable)continue;ranked.push({topic,score:overlap(query,topic.name)*4+overlap(query,topic.summary)*2+(preferred.has(topic.id)?100:0)});}
 ranked.sort((a,b)=>b.score-a.score||(a.topic.negativeUpdatedSequence||0)-(b.topic.negativeUpdatedSequence||0)||a.topic.id.localeCompare(b.topic.id));
 const shortlist=ranked.slice(0,32);
 for(const item of shortlist){for(const placement of await t.all('placements','byTopicOrder',prefix([item.topic.id,item.topic.activeLayoutGeneration,0]),6))item.score+=Math.min(12,overlap(query,await eligibleSnippet(s,t,placement.entryId,filter)));}
 return shortlist.filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.topic.id.localeCompare(b.topic.id)).slice(0,8).map(x=>x.topic.id);
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

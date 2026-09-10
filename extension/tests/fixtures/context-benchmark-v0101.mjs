// Synthetic relevance judgements, fixed before enhanced ranking. No runtime rules
// may depend on these domains, queries or labels. Held-out means withheld wording,
// not a claim of human blind evaluation or semantic understanding.
const domains=[
 ['产品研发','离线备份恢复','断网时恢复本地备份','本地数据找回','备份'],
 ['求职准备','面试项目复盘','面试中解释项目失败','招聘时怎样说明做砸的项目','面试'],
 ['学术研究','实验样本偏差','实验样本需要覆盖不同年龄','受试者年龄分布怎么选','样本'],
 ['文学创作','人物动机冲突','人物的行动需要明确动机','角色为何做出相反选择','动机'],
 ['硬件设计','电池续航测试','降低待机功耗延长续航','设备不用时如何省电','续航'],
 ['个人偏好','沟通反馈方式','反馈先给结论再提供依据','收到建议时喜欢怎样的表达','反馈'],
 ['长期计划','每周学习安排','每周安排两晚学习外语','下班后的语言练习时间','学习'],
 ['阅读笔记','论证证据质量','论证需要可以核验的证据','文章结论有没有可靠依据','证据'],
 ['开源项目','持续集成 CI','CI 测试失败先排查环境','持续集成报错如何定位','CI'],
 ['写作研究','引文来源标注','引文需要记录原始出处','引用他人观点怎样注明来处','引文'],
 ['生活决策','通勤路线选择','雨天优先选择地铁通勤','下雨时上班走哪条路线','通勤'],
 ['项目管理','发布风险检查','发布前检查回退方案','上线失败以后如何撤回','回退']
];
export function contextBenchmark(){const entries=[],queries=[];for(let d=0;d<domains.length;d++)for(let f=0;f<5;f++){const [domain,subject,phrase,paraphrase,short]=domains[d],facet=['日常','团队','个人','季度','长期'][f],topicId=`topic-${d}-${f}`,target=`${topicId}-0`,topicName=`${facet}${domain}`;
 for(let j=0;j<20;j++){const id=`${topicId}-${j}`;entries.push({id,entryId:id,topicId,topicName,sectionTitle:j===0?subject:'其他记录',title:j===0?subject:'工作记录',body:j===0?`${facet}${domain}：${phrase}。记录适用条件和实际证据。`:`${facet}${domain}：第 ${j} 项${['资料归档','人员协作','会议纪要','费用记录','版本整理'][j%5]}。${j%3===0?short+'只是待讨论的背景。':'本条讨论其他工作。'}`,kind:'entry',type:['decision','preference','fact','judgment','goal_plan'][j%5],human:j%2===0,current:true,pinned:j>0,confidence:1,time:`2026-08-${String(j+1).padStart(2,'0')}T00:00:00Z`,sequence:j,sourceLabel:'Thought Library',evidenceEntryIds:[id],eligible:!(j===18||j===19)});}
 queries.push({id:topicId+'-exact',group:'deterministic',category:'exact',query:`${facet}${domain}：${phrase}`,relevant:[target]}, {id:topicId+'-long',group:'deterministic',category:'long/section',query:`关于${facet}${domain}，我想了解${subject}，${phrase}有什么记录？`,relevant:[target]}, {id:topicId+'-paraphrase',group:'held-out',category:'paraphrase',query:`${facet}${domain}，${paraphrase}？`,relevant:[target]}, {id:topicId+'-short',group:'held-out',category:'short/topic',query:`${facet}${domain} ${short}`,relevant:[target]});}
 return {entries,queries,topics:60};}

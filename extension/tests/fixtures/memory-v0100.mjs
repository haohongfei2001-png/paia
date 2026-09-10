// Entirely synthetic. No real account, export, keys or user text.
export const memorySubjects=[
 {name:'PAIA 项目',entries:[['我可能先做 AI Memory；还没有最终确认。','judgment'],['PAIA 新决定：先完成 Product Hardening，再完善 AI Memory 授权与预览。','decision'],['PAIA 偏好：清晰、简洁，保护本机数据，不新增后台 AI 请求。','preference'],['PAIA 如何让上下文更容易核对？','idea']]},
 {name:'PAIA 硬件工具',entries:[['PAIA 硬件测试只使用虚构设备，关注内存占用。','fact']]},
 {name:'求职计划',entries:[['希望寻找注重产品可靠性的工程岗位。','goal_plan'],['EXCLUDED_SALARY 合成私人薪资记录，不允许分享。','fact']]},
 {name:'论文研究',entries:[['论文研究主题是可解释的本地检索和隐私边界。','idea']]},
 {name:'文学创作',entries:[['PRIVATE_LITERATURE 合成文学日记，即使搜索 PAIA 也不得进入上下文。','creation']]},
 {name:'日常生活',entries:[['日常偏好是规律作息。','preference']]}
];
export async function seedMemoryRPC(rpc){const topics=[];for(const subject of memorySubjects){const t=await rpc('CREATE_LIBRARY_TOPIC',{topic:{operationId:crypto.randomUUID(),name:subject.name}}),entries=[];for(const [body,type]of subject.entries){const e=await rpc('CREATE_LIBRARY_ENTRY',{entry:{operationId:crypto.randomUUID(),body,type}}),topic=await rpc('GET_LIBRARY_TOPIC',{id:t.id});await rpc('PLACE_LIBRARY_ENTRY',{placement:{operationId:crypto.randomUUID(),topicId:t.id,entryId:e.id,expectedEntryRevision:e.revision,expectedTopicRevision:topic.organizationRevision}});entries.push(e.id);}topics.push({...t,name:subject.name,entries});}return {topics,paia:topics[0],career:topics[2],private:topics[4]};}

// Authored before candidate implementations. No runtime imports or generated labels from ranking.
// Five near-neighbour Topics per scenario; labels explicitly include all valid topic variants.
export const scenarios=[
 ['产品开发','离线恢复','断网时从本地备份找回资料','没有连接互联网也能还原存档','recover saved material without connectivity','恢复','fact'],
 ['产品开发','界面可用性','按钮应让初次使用的人看懂','新用户能猜到控件的用途','make controls understandable to newcomers','按钮','judgment'],
 ['产品开发','持续集成','每次提交代码都自动运行测试','合入修改以前执行自动检查','validate changes on every commit','测试','decision'],
 ['产品开发','应用程序接口','服务之间通过稳定协议交换消息','跨系统通信要有明确约定','define how separate services communicate','协议','fact'],
 ['求职','面试复盘','解释失败项目时先交代自己的责任','向招聘者讲清失误和改进','describe accountability after an unsuccessful delivery','失败项目','decision'],
 ['求职','远程工作','偏好在家办公以减少通勤时间','不用每天往返公司的岗位更合适','prefer employment that avoids travelling to an office','通勤','preference'],
 ['求职','简历证据','履历中的成果必须能够核验','用可查证的产出来支持求职材料','support professional claims with verifiable achievements','履历','judgment'],
 ['求职','薪酬比较','比较岗位时同时考虑固定收入与福利','不能只看工资数字还要看待遇','evaluate compensation beyond the basic pay amount','福利','decision'],
 ['物理研究','量子测量','测量会改变待观测系统的状态','观测行为如何影响微观对象','how observation alters a microscopic system','测量','question'],
 ['物理研究','误差传播','多个量的误差共同影响最终结果','计算结果的不确定度来自各项输入','combine uncertainties in an experimental calculation','误差','fact'],
 ['物理研究','守恒检验','封闭系统的总能量应保持不变','隔绝外部交换以后核对能量收支','check whether energy remains constant in isolation','能量','judgment'],
 ['物理研究','实验复现','记录仪器配置才能重现实验条件','让别人按步骤再次得到同样结果','document apparatus so others can reproduce an observation','仪器','decision'],
 ['文学','人物动机','人物行动要符合其欲望与恐惧','角色为什么会做出这种选择','explain the desires behind a fictional character action','人物','judgment'],
 ['文学','叙述视角','第一人称叙述者可能并不可靠','讲故事的人未必知道全部真相','consider whether the narrator can be trusted','叙述者','fact'],
 ['文学','诗歌节奏','朗读时停顿影响诗句的韵律','用呼吸和断句表现声音的流动','shape verse through pauses and cadence','诗句','preference'],
 ['文学','引文出处','引用必须保留原作者和页码','摘录别人的话时注明来源位置','attribute borrowed passages to their original author','引用','decision'],
 ['个人计划','学习安排','每周留出两个晚上练习外语','下班后的语言练习需要固定时段','reserve evenings for acquiring another language','外语','goal_plan'],
 ['个人计划','睡眠习惯','睡前减少屏幕使用以便及时入睡','夜晚少看电子设备有助于休息','avoid illuminated devices before going to bed','屏幕','preference'],
 ['个人计划','预算缓冲','预留紧急储蓄应付意外支出','突发花销需要事先准备备用金','maintain a financial cushion for unforeseen expenses','储蓄','decision'],
 ['个人计划','运动持续性','选择容易坚持的运动而非短期高强度','日常锻炼需要长期可执行','favour sustainable exercise over brief intense effort','运动','preference']
];
const facets=['个人试行','团队协作','长期维护','季度回顾','独立研究'];
export function intelligenceDataset(){
 const entries=[],queries=[];
 for(let s=0;s<scenarios.length;s++)for(let f=0;f<5;f++){
  const [domain,subject,body,para,english,short,type]=scenarios[s],topicId=`t-${s}-${f}`;
  const add=(j,text,kindType=type,extra={})=>{const id=`${topicId}-${j}`;entries.push({id,entryId:id,topicId,topicName:facets[f]+domain,sectionId:`s-${s}`,sectionTitle:subject,title:j===0?subject:'记录',body:text,type:kindType,kind:'entry',human:j%3===0,fresh:true,pinned:j%4===0,confidence:1,sequence:j,time:`202${j%3+3}-09-01T00:00:00Z`,sourceLabel:'Synthetic Thought',evidenceEntryIds:[id],eligible:j<30,...extra});};
  add(0,body);add(1,'以前选择 '+body+'，后来调整了条件。','decision');
  add(2,'现在决定 '+body+'，仅限当前阶段。','decision');
  add(3,'如果不采用这项安排会怎样？','question');
  add(4,'我尚未确认是否 '+body+'。','judgment');
  for(let j=5;j<32;j++){const other=scenarios[(s+j)%scenarios.length];add(j,j>=30?body:other[2]+`。第 ${j} 次讨论，仅作参考。`,other[6],{sectionTitle:j>=30?subject:'其他背景',title:'待复核记录'});}
  const main=Array.from({length:5},(_,i)=>`t-${s}-${i}-0`),all=Array.from({length:5},(_,i)=>[0,1,2,4].map(j=>`t-${s}-${i}-${j}`)).flat();
  const push=(taxonomy,query,relevant,extra={})=>queries.push({id:`q-${s}-${f}-${taxonomy}`,taxonomy,query,relevant,scenario:s,split:s%5===4?'held-out':'development',...extra});
  // A exact phrase: every eligible occurrence is valid, not just the labelled Topic.
  push('A',body,main,{resolve:'body',needle:body});
  push('B',`${facets[f]} ${short}`,all,{resolve:'short',needle:short});
  push('C',`${facets[f]} ${para}`,main,{resolve:'body',needle:body});
  push('D',['Please help me to','I want to','How can I','Find my notes to','I need guidance to'][f]+' '+english,main,{resolve:'body',needle:body});
  push('E',`最近在${facets[f]}中遇到了困难。我想知道以前有没有记下${subject}方面的经验，尤其是${para}，可以找到什么依据？`,all);
  push('F',`${domain}有哪些想法${['？','值得回顾？','可以参考？','还没定论？','需要讨论？'][f]}`,[],{resolve:'domain',needle:domain});
  push('G',`${facets[f]} ${subject} 现在决定`,Array.from({length:5},(_,i)=>`t-${s}-${i}-2`),{expectedState:'current'});
  push('H',`${facets[f]} ${subject} 历史变化和不同表述`,all,{expectedConflict:true});
 }
 for(const q of queries){if(q.resolve==='body')q.relevant=entries.filter(e=>e.eligible&&e.body.includes(q.needle)).map(e=>e.id);if(q.resolve==='short')q.relevant=entries.filter(e=>e.eligible&&[e.body,e.title,e.sectionTitle].some(x=>x.includes(q.needle))).map(e=>e.id);if(q.resolve==='domain')q.relevant=entries.filter(e=>e.eligible&&e.topicName.includes(q.needle)).map(e=>e.id);delete q.resolve;delete q.needle;}
 // Explicit negatives and mixed acronym/punctuation/typo probes are separate slices.
 for(let i=0;i<20;i++)queries.push({id:`negative-${i}`,taxonomy:'N',query:`zxqvunknown${i}`,relevant:[],scenario:i,split:'held-out'});
 for(const [i,query,needle]of [[0,'CI 持续集成','每次提交代码'],[1,'API 应用程序接口','服务之间'],[2,'界面，可用性！','按钮应让'],[3,'interfase usability','按钮应让']])queries.push({id:`probe-${i}`,taxonomy:'P',query,relevant:entries.filter(e=>e.eligible&&e.body.includes(needle)).map(e=>e.id),scenario:i,split:'held-out'});
 return {version:1,syntheticOnly:true,topics:100,entries,queries};
}

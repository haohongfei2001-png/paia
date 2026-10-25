// Local synthetic visual adapter. No repository implementation is replaced.
// Twelve unique synthetic Inputs are reused by Archive, Thought and Prompt.
const epoch='visual-synthetic-epoch-1',authority='visual-synthetic-authority-1';
const names=['合成主题：在日常阅读与持续写作之间建立可以长期使用、允许变化并保留每一段原始表达的个人知识方法','合成主题：产品与设计','合成主题：城市观察','合成主题：学习笔记','合成主题：生活节奏','合成主题：写作练习','合成主题：阅读方法','合成主题：长期计划'];
const texts=[
 '合成输入 01：阅读时先保留原句，再写下自己的理解。这里是一段专门用于本地界面验收的文字，不属于任何真实用户档案。段落应当保持安静、清楚，并且便于持续阅读。',
 '合成输入 02：把零散的观察留在原来的时间位置，不急着替它们命名。等到有足够多的材料，再决定哪些表达属于同一个问题。',
 '合成输入 03：好的阅读页面不需要每一行都解释自己。正文之外，时间、返回与顺序控制只在必要的位置出现；右侧留白仍然保留。',
 '合成输入 04：第二个章节继续记录练习。今天尝试用短句说明一个复杂问题：先给出具体例子，再说明边界，最后留下尚未解决的疑问。',
 '合成输入 05：长内容和短内容都应该拥有合适的位置。不同长度的主题名称不应被裁成相同高度，而正文也不应为了填满屏幕而变宽。',
 '合成输入 06：在复盘里区分已经完成的事情与尚待确认的事情。保留选择不意味着连接已经可用，界面应当准确表达这种差别。',
 '合成输入 07：设计练习从观察开始：按钮的形状、行间的距离，以及文字在窄屏上的自然换行。',
 '合成输入 08：小型界面不必添加额外说明。让图标、位置和状态共同表达用途，同时保持完整的无障碍名称。',
 '合成输入 09：城市步行的合成观察。树影覆盖人行道，路口的等待让注意力慢下来。这里只用来检验段落排版。',
 '合成输入 10：在窗边读完一页，再把想到的词记下来。记录不需要立即形成结论。',
 '合成输入 11：学习计划是一份可以改变的安排。先保留今天实际完成的步骤，再看下一步需要什么。',
 '合成输入 12：结束本次练习时，检查内容是否仍然完整，顺序是否清楚，以及回到上一页的路径是否自然。'
];
const topics=names.map((name,i)=>({id:`visual-topic-${i+1}`,kind:'topic',name,summary:'',revision:1,organizationRevision:1,layoutGeneration:1,pinKey:0,lifecycle:'active',recoveryEpoch:epoch,authority,sections:[0,1].map((j)=>({id:`visual-section-${i+1}-${j+1}`,sectionId:`visual-section-${i+1}-${j+1}`,topicId:`visual-topic-${i+1}`,title:j?'持续练习':'观察与思考',revision:1,layoutGeneration:1,rank:String(j+1).padStart(12,'0'),isDefault:false,named:true,lifecycle:'active'}))}));
const inputs=texts.map((text,i)=>({id:`visual-input-${i+1}`,text,body:text,sourceSentAt:`2026-10-${String(12+i).padStart(2,'0')}T09:30:00.000Z`,documentId:i<6?'visual-document-1':'visual-document-2'}));
const records=inputs.map((r,i)=>({id:`visual-record-${i+1}`,platform:'chatgpt',chatId:i<6?'visual-chat-1':'visual-chat-2',chatTitle:i<6?'合成窗口：阅读与写作':'合成窗口：观察笔记',originalText:r.text,sourceSentAt:r.sourceSentAt,capturedAt:r.sourceSentAt,conversationOrder:i,revision:1,contentRevision:1,hidden:false,deletedAt:null,role:'user'}));
const blocks=inputs.map((r,i)=>({id:r.id,documentId:r.documentId,sourceRecordId:records[i].id,originalTextReference:records[i].id,libraryText:null,note:'',editedAt:null,excluded:false,status:'active',revision:1,contentRevision:1,provenanceSignature:'visual-provenance-'+i,provenance:[{sourceRecordId:records[i].id}],mergedSourceIds:[]}));
const documents=[0,1].map(i=>({id:`visual-document-${i+1}`,platform:'chatgpt',providerKey:'chatgpt',sourceConversationId:`visual-chat-${i+1}`,originalConversationTitle:i?'合成窗口：观察笔记':'合成窗口：阅读与写作',userTitle:'',title:i?'合成窗口：观察笔记':'合成窗口：阅读与写作',revision:1,status:'active',firstSourceSentAt:inputs[i*6].sourceSentAt,lastSourceSentAt:inputs[i*6+5].sourceSentAt,sourceRecordIds:records.slice(i*6,i*6+6).map(r=>r.id),messageCount:6,blockCount:6}));
const entries=inputs.map((r,i)=>({id:`visual-entry-${i+1}`,body:r.text,note:'',type:'idea',revision:1,contentRevision:1,fieldRevisions:{body:1,note:1,type:1},lifecycle:'active',staleReasons:[],sourceRecordIds:[records[i].id],sourceSentAt:r.sourceSentAt,expressionTime:{at:r.sourceSentAt,year:2026,basis:'source'},expressionAt:r.sourceSentAt,expressionTimeKind:'source',userCreated:false,bodyBinding:'detached',recoveryEpoch:epoch}));
const placements=entries.map((e,i)=>{const ti=i<6?0:1+Math.floor((i-6)/2),si=i<6?(i<3?0:1):i%2;return{id:`visual-placement-${i+1}`,entryId:e.id,topicId:topics[ti].id,sectionId:topics[ti].sections[si].id,layoutGeneration:1,revision:1,rank:String(i+1).padStart(12,'0'),sectionRank:topics[ti].sections[si].rank};});
export const fixture={synthetic:true,topics,inputs,records,blocks,documents,entries,placements,contextItems:[],epoch,authority};
let controls={readingSort:'desc',inputReadingSort:'desc',libraryView:'original'};
const ok=data=>({handled:true,data});
const selectedPath=documentId=>documentId?{documentId,available:true,providerKey:'chatgpt',groupKind:'project',projectRef:{providerKey:'chatgpt',projectId:'visual-project-1'}}:null;
export function fixtureRPC(message,{scene}){
 const type=message.type,p=message.page||{},o=message.options||{};
 if(type==='GET_PAGE'){
  const visible=p.documentId?blocks.filter(x=>x.documentId===p.documentId):blocks;
  const sort=p.sort||controls.inputReadingSort;
  const rows=sort==='desc'?[...visible].reverse():visible;
  return ok({settings:{consentVersion:1,captureEnabled:false},capture:{enabled:false,excludedChats:[]},preferences:{settingsVersion:2,autoSave:true,permanentSourceIgnore:true,libraryDeleteAlsoDeletesOriginal:false,timeDisplay:'date_and_time',timeEmphasis:'subtle',aiEnabled:false,aiExecutionMode:'suggest_only',appearance:scene.theme,language:'zh-CN',fontSize:'standard',readingWidth:'standard',sidebarCollapsed:false,hideContentPreviews:false},records,conversations:documents,library:{documents,blocks:visible,classificationRules:[],filterRules:[]},documents,stats:{hidden:0,trash:0,total:12,active:12},diagnostics:{},pageItemIds:p.view==='archive'?records.filter(r=>!p.documentId||r.chatId===documents.find(d=>d.id===p.documentId)?.sourceConversationId).map(r=>r.id):rows.map(r=>r.id),nextCursor:null,readingSnapshot:'visual-reading-snapshot-1',readingSort:sort,yearReading:{year:2026,nextYear:null,previousYear:null,generation:'visual-year-1',complete:true},recoveryEpoch:epoch,tracked:visible});
 }
 if(type==='PAIA_ARCHIVE_ORDER_PREFERENCE')return ok({mode:'paia'});
 if(type==='PAIA_ARCHIVE_NAV_STATUS'||type==='PAIA_ARCHIVE_NAV_PAGE'){
  let items=[];if(p.groupKind==='providers')items=[{kind:'provider',providerKey:'chatgpt'}];
  else if(p.groupKind==='groups')items=[{kind:'group',providerKey:'chatgpt',groupKind:'project',projectRef:{providerKey:'chatgpt',projectId:'visual-project-1'},title:'合成项目：日常练习',parentSourceStatus:'available'}];
  else if(p.groupKind==='project')items=documents.map(d=>({kind:'window',id:d.id,documentId:d.id,title:d.title,providerKey:'chatgpt',groupKind:'project',projectRef:{providerKey:'chatgpt',projectId:'visual-project-1'},sourceStatus:'available'}));
  return ok({items,coverage:{state:'complete'},generation:'visual-nav-1',nextCursor:null,effectiveOrdering:'paia',unavailableReason:null,selectedPath:selectedPath(p.selectedDocumentId)});
 }
 if(type==='SEARCH_INPUTS')return ok({items:inputs.filter(r=>!o.query||r.text.includes(o.query)).map(r=>({id:r.id,documentId:r.documentId,text:r.text,title:documents.find(d=>d.id===r.documentId).title,sourceSentAt:r.sourceSentAt,contentRevision:1,sourcePath:{providerKey:'chatgpt',membership:'project',project:{name:'合成项目：日常练习',ref:{providerKey:'chatgpt',projectId:'visual-project-1'}},sourceStatus:'available'},filtered:false})),nextCursor:null,searchSnapshot:{version:1,generation:1,signature:'a'.repeat(64)},searchScope:{},complete:true});
 if(type==='GET_INPUT')return ok({...blocks.find(r=>r.id===message.id),recoveryEpoch:epoch});
 if(type==='PAIA_READER_RESOLVE')return ok(null);
 if(type==='PAIA_READER_SAVE')return ok({saved:true});
 if(type==='PAIA_READER_POLICY')return ok({capture:{enabled:false,excludedChats:[]},revisit:{oldContent:false,exclusions:[]}});
 if(type==='GET_THOUGHT_LAYOUT')return ok({layout:'list'});
 if(type==='GET_THOUGHT_REVERSE_EDIT')return ok({enabled:false});
 if(type==='GET_ORGANIZER_CONTROLS')return ok({...controls});
 if(type==='SET_ORGANIZER_CONTROLS'){controls={...controls,...message.changes};return ok({...controls});}
 if(type==='GET_AI_PRESENTATION_STATUS')return ok({topics:[],pendingTopics:0,nextTopic:null,runtime:null,serviceAvailable:false});
 if(type==='GET_AI_PRESENTATION_SCOPE')return ok({available:false,sections:[]});
 if(type==='THOUGHT_POSITION')return ok(null);
 if(type==='RECORD_TOPIC_READ')return ok({recorded:true});
 if(type==='GET_LIBRARY_ROOT_PROJECTION')return ok({items:topics.map(t=>({...t,sectionOverview:{items:t.sections.map(s=>({id:s.id,title:s.title})),complete:true}})),authority,coverage:{complete:true,activeGeneration:'visual-root-1'},complete:true,indexing:false,nextCursor:null});
 if(type==='GET_LIBRARY_SECTION_PROJECTION'){const t=topics.find(t=>t.id===o.topicId);return ok({topic:t,items:t?.sections||[],nextCursor:null,complete:true,authority});}
 if(type==='GET_LIBRARY_SECTION_READING'){
  const t=topics.find(t=>t.id===o.topicId),ss=t?.sections.filter(s=>!o.scopeSectionId||s.id===o.scopeSectionId)||[];
  let items=placements.filter(p=>p.topicId===o.topicId&&(!o.scopeSectionId||p.sectionId===o.scopeSectionId)).map(p=>({entry:entries.find(e=>e.id===p.entryId),placement:p}));
  if(o.sort==='desc')items.reverse();if(o.anchorId)items=items.filter(i=>i.entry.id===o.anchorId);if(o.limit)items=items.slice(0,o.limit);
  return ok({version:1,kind:'section_reading',topic:t,scopeSectionId:o.scopeSectionId||null,sections:ss,items,tracked:entries.map(e=>({id:e.id,lifecycle:'active',revision:1,purged:false})),coverage:{complete:true,activeGeneration:'visual-topic-generation-1'},authority,recoveryEpoch:epoch,complete:true,indexing:false,year:2026,nextYear:null,nextCursor:null,previousCursor:null,sectionCursor:null});
 }
 if(type==='GET_LIBRARY_TOPIC'||type==='GET_LIBRARY_TOPIC_READING_METADATA')return ok(topics.find(t=>t.id===message.id));
 if(type==='GET_LIBRARY_ENTRY')return ok(entries.find(t=>t.id===message.id));
 if(type==='GET_LIBRARY_PLACEMENT')return ok(placements.find(t=>t.entryId===message.entryId&&t.topicId===message.topicId));
 if(type==='GET_LIBRARY_TRACKED_ENTRIES')return ok(entries.filter(e=>(o.ids||[]).includes(e.id)).map(e=>({...e,purged:false})));
 if(type==='GET_LIBRARY_FOUNDATION_STATUS')return ok({ready:true,state:'ready',recoveryEpoch:epoch,bindingMigration:{complete:true,input:12,thought:12}});
 if(type==='GET_LIBRARY_UNPLACED')return ok({items:[],nextCursor:null,complete:true});
 if(type==='GET_LIBRARY_TOPICS'||type==='LIBRARY_INDEX_PAGE')return ok({items:topics,nextCursor:null,complete:true});
 return null;
}
export async function prepareScene(scene,{owners}){
 const id=scene.id;
 if(id.startsWith('archive-')){
  await owners.navigate('library',null,null,{freshArchiveEntry:true});
  if(id==='archive-neutral')return{handled:true,readySelector:'.archive-navigator-group-toggle',evidence:{entry:'actual navigate(library,freshArchiveEntry)'}};
  if(id==='archive-search')return{handled:true,readySelector:'.search-input',actions:[{selector:'#scope-search-host input',action:'fill',value:'阅读'}],evidence:{entry:'actual ScopeSearch input handler'}};
  const actions=[{selector:'.archive-navigator-group-toggle',action:'click'}];
  if(id==='archive-browse')return{handled:true,readySelector:'.archive-navigator-window',actions,evidence:{entry:'actual navigator group disclosure'}};
  actions.push({selector:'.archive-navigator-window[data-document-id="visual-document-1"]',action:'click'});
  return{handled:true,readySelector:'#document-body .library-prose',actions,evidence:{entry:'actual navigator group/window click + Archive Reader'}};
 }
 if(id.startsWith('thought-')){
  await owners.navigate('thoughts',null,null,{freshThoughtEntry:true});
  if(id.startsWith('thought-home'))return{handled:true,readySelector:'.personal-topic-link[data-topic-id="visual-topic-1"]',evidence:{entry:'actual Thought home projection'}};
  if(id==='thought-write')return{handled:true,readySelector:'.thought-compose-workspace textarea',actions:[{selector:'.thought-root-actions > button',action:'click'}],evidence:{entry:'actual write button, no typing or save'}};
  const section=id==='thought-second-section'?'visual-section-1-2':'visual-section-1-1';
  const actions=[{selector:'.personal-section-link[data-section-id="'+section+'"]',action:'click'}];
  if(id==='thought-options')actions.push({selector:'#topic-time-jumps > summary',action:'click'});
  if(id==='thought-ascending')actions.push({selector:'#topic-order-toggle',action:'click'});
  return{handled:true,readySelector:id==='thought-options'?'#topic-time-jumps[open]':'#topic-body .entry-prose',actions,evidence:{entry:'actual Topic Section anchor; real original reader and controls',section}};
 }
 return null;
}

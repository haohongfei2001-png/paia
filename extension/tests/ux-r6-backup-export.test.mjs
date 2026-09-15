import test from 'node:test';
import assert from 'node:assert/strict';
import {buildOpenExport,exportOpenJSON,exportOpenMarkdown,OPEN_EXPORT_FORMAT,OpenExportWriter} from '../core/open-export.js';
import {exportJSON as exportFilteredSourceJSON} from '../core/export.js';

const header={type:'header',format:'PAIA Backup',formatVersion:1,schemaVersion:5,appVersion:'0.12.0',createdAt:'2026-09-15T00:00:00.000Z',contentSections:[]};
const rows=[
 header,
 {type:'item',section:'sources',order:0,value:{id:'source-1',platform:'chatgpt',chatId:'chat-1',chatTitle:'原聊天',sourceMessageId:'m1',originalText:'不可变原话',sourceSentAt:'2026-09-01T01:02:03.000Z',capturedAt:'2026-09-01T01:03:00.000Z'}},
 {type:'item',section:'inputDocuments',order:0,value:{id:'doc-1',platform:'chatgpt',sourceConversationId:'chat-1',originalConversationTitle:'原聊天'},working:{id:'doc-1',platform:'chatgpt',sourceConversationId:'chat-1',originalConversationTitle:'原聊天',userTitle:'人工标题'}},
 {type:'item',section:'inputs',order:0,value:{id:'input-1',documentId:'doc-1',sourceRecordId:'source-1',originalTextReference:'source-1',libraryText:'人工整理后的 Input',note:'人工备注',provenance:[{sourceRecordId:'source-1'}],revision:3,userEdited:true}},
 {type:'item',section:'entries',value:{id:'thought-1',storageSchema:2,body:'独立 Thought',note:'思想备注',origin:'user_created',sourceRecordIds:[],protections:{body:true},revision:2}},
 {type:'item',section:'topics',value:{id:'topic-1',name:'PAIA',summary:'长期主题',revision:2}},
 {type:'item',section:'sections',value:{id:'section-1',topicId:'topic-1',title:'体验',rank:1}},
 {type:'item',section:'placements',value:{id:'placement-1',topicId:'topic-1',entryId:'thought-1',sectionId:'section-1',rank:1}},
 {type:'item',section:'evidence',value:{id:'evidence-1',ownerKind:'thought',ownerId:'thought-1',inputId:'input-1',sourceRecordIds:['source-1']}},
 {type:'item',section:'dependencies',value:{id:'dep-1',inputId:'input-1',thoughtId:'thought-1',targetKind:'entry',targetId:'thought-1',sourceRecordIds:['source-1']}},
 {type:'item',section:'revisions',value:{id:'rev-1',kind:'input',entityId:'input-1',before:{libraryText:null},after:{libraryText:'人工整理后的 Input'},actor:'user',reason:'edit',sequence:1,at:'2026-09-02T00:00:00.000Z'}},
 {type:'item',section:'organizationState',value:{id:'aiPresentation:topic-1',data:{id:'aiPresentation:topic-1',topicId:'topic-1',blockSummary:'AI 摘要',currentView:'AI 当前理解',revision:2,evidenceEntryIds:['thought-1'],protections:{currentView:true}}}},
 {type:'item',section:'organizationState',value:{id:'organizer-budget',data:{id:'organizer-budget',usedRequests:7,internalOnly:'must-not-export'}}},
 {type:'item',section:'receipts',value:{id:'receipt-1',namespace:'ai-presentation',result:{requestId:'provider-runtime-only'}}},
 {type:'item',section:'settings',value:{id:'preferences',preferences:{appearance:'dark',hideContentPreviews:true},memoryAccessPolicy:{default:'deny'}}},
 {type:'footer',itemCount:14}
];
const role=(out,name)=>out.records.find(row=>row.role===name);

test('UX-R6 complete open export keeps Source, working Input, independent Thought, AI presentation and human revisions explicitly distinct',()=>{
 const out=buildOpenExport(rows,{exportedAt:'2026-09-15T01:00:00.000Z'});
 assert.equal(out.format,OPEN_EXPORT_FORMAT);assert.equal(role(out,'immutable_source_record').originalText,'不可变原话');
 assert.equal(role(out,'input_document').working.userTitle,'人工标题');assert.equal(role(out,'input_working_copy').libraryText,'人工整理后的 Input');assert.equal(role(out,'input_working_copy').note,'人工备注');
 assert.equal(role(out,'independent_thought').body,'独立 Thought');assert.equal(role(out,'ai_presentation').blockSummary,'AI 摘要');assert.equal(role(out,'revision').actor,'user');
 assert.equal(out.records.find(row=>row.section==='placements').entryId,'thought-1');assert.equal(out.records.find(row=>row.section==='evidence').inputId,'input-1');assert.equal(role(out,'portable_settings').preferences.hideContentPreviews,true);
});

test('UX-R6 complete open export omits operational receipts and non-user organizer state rather than calling them portable content',()=>{
 const json=exportOpenJSON(rows,{exportedAt:'2026-09-15T01:00:00.000Z'}),parsed=JSON.parse(json);
 assert.doesNotMatch(json,/internalOnly|must-not-export|provider-runtime-only|receipt-1/);assert.match(json,/omittedOperationalState/);assert.equal(role(parsed,'ai_presentation').id,'aiPresentation:topic-1');
});

test('UX-R6 Markdown is readable and explicitly distinguishes complete open export from Backup',()=>{
 const markdown=exportOpenMarkdown(rows,{exportedAt:'2026-09-15T01:00:00.000Z'});
 assert.match(markdown,/PAIA Complete Open Export/);assert.match(markdown,/不是 PAIA Backup/);assert.match(markdown,/Source Record · 不可变来源/);assert.match(markdown,/Input Archive · 工作副本/);assert.match(markdown,/Thought Library · 独立思想/);assert.match(markdown,/AI presentation · AI 整理/);assert.match(markdown,/不可变原话/);assert.match(markdown,/人工整理后的 Input/);assert.match(markdown,/独立 Thought/);assert.match(markdown,/AI 摘要/);
});

test('UX-R6 current filtered Source export remains a different, honestly scoped format',()=>{
 const filtered=exportFilteredSourceJSON([{id:'source-1',originalText:'only source'}]);assert.equal(JSON.parse(filtered).format,'personal-ai-input-archive');assert.notEqual(JSON.parse(filtered).format,OPEN_EXPORT_FORMAT);
});

test('UX-R6 streaming JSON writer handles F-LARGE 100k Inputs without collecting domain objects first',()=>{
 const writer=new OpenExportWriter('json',header,{exportedAt:'2026-09-15T01:00:00.000Z'});for(let base=0;base<100000;base+=1000)writer.add(Array.from({length:1000},(_,offset)=>({type:'item',section:'inputs',value:{id:`input-${base+offset}`,documentId:'doc',libraryText:`synthetic-${base+offset}`}})));assert.equal(writer.count,100000);const parsed=JSON.parse(writer.finish().join(''));assert.equal(parsed.recordCount,100000);assert.equal(parsed.records.length,100000);assert.equal(parsed.records[99999].role,'input_working_copy');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {TopicController} from '../ui/topic-workspace.js';
import {SECTION_AI_FIELDS} from '../ui/topic-section-ai.js';

async function fixture(change,run){
 const prior=new Map(['document','chrome'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 const node=()=>({hidden:false,value:'',children:[{}],querySelectorAll:()=>[],replaceChildren(){}}),nodes=new Map();
 const topic={id:'topic',name:'SYNTHETIC Topic'},section={id:'section',sectionId:'section',topicId:'topic'},row={topicId:'topic',revision:2,schemaVersion:1,recoveryEpoch:'epoch',stale:false,evidenceEntryIds:['entry'],currentView:'SYNTHETIC human edit'};
 const cached=structuredClone(row),editor={row,admittedFields:new Set(['currentView']),sectionEvidence:new Set(['entry']),journal:{undo:[{field:'currentView'}],redo:[]},refreshEvidence:async()=>{},readingReflowBlocked:()=>false,dirty:()=>false,collect(){},dispose(){throw Error('original editor retired');}};
 let page={topic,sections:[section],recoveryEpoch:'epoch',authority:{id:'authority'},coverage:{activeGeneration:'new-generation'},items:[{entry:{id:'entry',lifecycle:'active'},placement:{topicId:'topic',sectionId:'section'}}]};
 const owner=Object.assign(Object.create(TopicController.prototype),{serial:1,id:'topic',view:'ai',topic,activeSectionId:'section',aiScopeKey:JSON.stringify(['topic','section',true,['currentView'],'old-generation','epoch']),aiTopics:new Map([['topic',{presentation:cached}]]),aiEditor:editor,readingHistoryOwner:editor,originalPane:node(),aiPane:node(),syncReadingControls(){},ensurePanes(){},updateViewStatus:async()=>({}),filterAIReading(){},topicAnchor:()=>null,topicSectionAnchor:()=>null,resetTopicReader:async({beforePaint})=>{assert.equal(beforePaint(page),true);return {stale:false};}});
 globalThis.document={documentElement:{lang:'en'},getElementById:id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);}};
 const reads=[];globalThis.chrome={runtime:{sendMessage:async message=>{reads.push(message);if(message.type==='GET_LIBRARY_SECTION_PROJECTION')return {ok:true,data:{topic,items:[section]}};if(message.type==='GET_LIBRARY_SECTION_READING')return {ok:true,data:page};throw Error('unexpected request '+message.type);}}};
 try{await change?.({owner,editor,cached,page});await run({owner,editor,cached,reads,page});}finally{for(const [key,descriptor]of prior)if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}
}
test('fresh generation-only qualification preserves the actual saved-field editor, native owner and Undo journal',()=>fixture(null,async({owner,editor,cached,reads})=>{
 const journal=editor.journal;assert.equal(await owner.readContentRefresh(),true);assert.equal(owner.aiEditor,editor);assert.equal(owner.readingHistoryOwner,editor);assert.equal(editor.journal,journal);assert.equal(journal.undo.length,1);assert.equal(JSON.parse(owner.aiScopeKey)[4],'new-generation');assert.deepEqual(editor.row,cached);assert.ok(reads.filter(row=>row.type==='GET_LIBRARY_SECTION_READING').length>=3,'fresh initial, exact evidence and final scope qualification all execute');
}));
for(const [reason,change]of Object.entries({
 topic:({owner})=>owner.aiScopeKey=JSON.stringify(['other','section',true,['currentView'],'old-generation','epoch']),
 section:({owner})=>owner.aiScopeKey=JSON.stringify(['topic','other',true,['currentView'],'old-generation','epoch']),
 epoch:({editor})=>editor.row.recoveryEpoch='old-epoch',
 revision:({cached})=>cached.revision++,
 rowIdentity:({cached})=>cached.id='other-row',
 protection:({cached})=>cached.protections={currentView:true},
 fieldRevision:({cached})=>cached.fieldRevisions={currentView:2},
 unknownCanonicalField:({cached})=>cached.futureAuthority='changed',
 field:({cached})=>cached.currentView='SYNTHETIC external edit',
 schema:({cached})=>cached.schemaVersion++,
 stale:({cached})=>cached.stale=true,
 recoveryGeneration:({cached})=>cached.recoveryGeneration='restored',
 purgeRevision:({cached})=>cached.recoveryPurgeRevision=1,
 fieldEvidence:({cached})=>cached.fieldEvidenceEntryIds={currentView:['entry']},
 evidence:({editor})=>editor.sectionEvidence=new Set(['old-entry']),
 admitted:({editor})=>editor.admittedFields=new Set(SECTION_AI_FIELDS),
 disposed:({editor})=>editor.disposed=true,
 saving:({editor})=>editor.saving=true,
 dirty:({editor})=>editor.dirty=()=>true,
 failed:({editor})=>editor.failed=true,
 conflicted:({editor})=>editor.conflicted=true,
 foreignRecovery:({editor})=>editor.recoveryForeign=true,
 incomplete:({page})=>page.indexing=true,
 sourceUnavailable:({page})=>page.items=[],
 qualificationGenerationRace:()=>{
  const runtime=globalThis.chrome.runtime,send=runtime.sendMessage;let scopeReads=0;
  runtime.sendMessage=async message=>{
   const response=await send(message);
   if(message.type==='GET_LIBRARY_SECTION_READING'&&++scopeReads===2)return {...response,data:{...response.data,coverage:{activeGeneration:'changed-during-evidence-qualification'}}};
   return response;
  };
 },
})){test('generation change '+(['dirty','saving'].includes(reason)?'preserves active ':'still retires ')+reason+' saved-field authority',()=>fixture(change,async({owner,editor,page})=>{
 owner.aiEditor.flush=async()=>true;
 if(['dirty','saving'].includes(reason)){
  assert.equal(await owner.readContentRefresh(),true);assert.equal(owner.aiEditor,editor);assert.equal(JSON.parse(owner.aiScopeKey)[4],'new-generation');
 }else await assert.rejects(owner.readContentRefresh(),/original editor retired/);
}));}

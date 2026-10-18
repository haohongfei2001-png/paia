import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './harness/ai-reading-flush-fixture.mjs';
import {TopicController} from '../ui/topic-workspace.js';
import {SECTION_AI_FIELDS} from '../ui/topic-section-ai.js';
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
async function publication({generation='g2',withheld=false}={}){
 const f=await fixture({revision:7,lists:true}),original=f.editor,paintEntered=deferred(),paintRelease=deferred(),recoveryEntered=deferred(),recoveryRelease=deferred(),refreshed=deferred();
 original.admittedFields=new Set(SECTION_AI_FIELDS);original.sectionEvidence=new Set([f.entry.id]);
 const cached=structuredClone(original.row),Node=original.root.constructor,docNodes=new Map();
 document.getElementById=id=>{if(!docNodes.has(id)){const node=new Node();node.style={};docNodes.set(id,node);}return docNodes.get(id);};document.body=new Node('body');document.body.append(original.root);original.root.style={};
 const topic={id:f.topic.id,name:'SYNTHETIC topic'},section={id:f.topic.sectionId,sectionId:f.topic.sectionId,topicId:topic.id};
 const page={topic,sections:[section],recoveryEpoch:cached.recoveryEpoch,authority:{topicId:topic.id},coverage:{activeGeneration:generation},items:withheld?[]:[{entry:{id:f.entry.id,lifecycle:'active'},placement:{topicId:topic.id,sectionId:section.id}}]};
 const send=chrome.runtime.sendMessage;let reads=0,rounds=0;const paints=[];
 chrome.runtime.sendMessage=async m=>{if(m.type==='GET_LIBRARY_SECTION_PROJECTION')return {ok:true,data:{topic,items:[section]}};if(m.type==='GET_LIBRARY_SECTION_READING'){reads++;return {ok:true,data:page};}return send(m);};
 const owner=Object.assign(Object.create(TopicController.prototype),{serial:1,openIntent:1,id:topic.id,view:'ai',topic,activeSectionId:section.id,aiTopics:new Map([[topic.id,{presentation:cached}]]),aiScopeKey:JSON.stringify([topic.id,section.id,true,[...SECTION_AI_FIELDS].sort(),'g1',cached.recoveryEpoch]),aiEditor:original,originalPane:new Node(),aiPane:original.root,syncReadingControls(){},ensurePanes(){},updateViewStatus:async()=>({}),filterAIReading(){},renderSectionNav(){},topicAnchor:()=>null,topicSectionAnchor:()=>null,checkAllTracked:async()=>true,updateTopicSearchCount(){},readKey:()=>topic.id,
  async refreshOnce(){rounds++;if(rounds>1)owner.aiTopics.set(topic.id,{presentation:{...await f.read(),recoveryEpoch:cached.recoveryEpoch}});await owner.readContentRefresh();if(rounds>1)refreshed.resolve();},
  async resetTopicReader({beforePaint}){if(rounds===1){paintEntered.resolve();await paintRelease.promise;}const accepted=beforePaint(page)===true;paints.push(accepted);return {stale:false,paintRefused:!accepted};}});
 f.setSave(async(_m,n)=>{if(n===1){recoveryEntered.resolve();await recoveryRelease.promise;}});
 return {...f,owner,original,cached,page,paintEntered,paintRelease,recoveryEntered,recoveryRelease,refreshed,paints,reads:()=>reads,rounds:()=>rounds,async close(){paintRelease.resolve();recoveryRelease.resolve();await owner.refreshRun?.promise;if(owner.aiEditor&&owner.aiEditor!==original){await Promise.allSettled([owner.aiEditor.ready,owner.aiEditor.recoveryReady]);owner.aiEditor.dispose();}await f.close();}};
}
for(const generation of ['g1','g2'])for(const startFlush of [false,true])test(`late empty input at ${generation} publication retains its real owner, ${startFlush?'joining save':'starting save'} exactly once`,{timeout:10000},async()=>{
 const f=await publication({generation});let reading,flush;
 try{
  reading=f.owner.refresh();await f.paintEntered.promise;const initialReads=f.reads(),node=f.original.nodes.get('blockSummary')[0],row=f.original.row;
  node.textContent='';node.listeners.get('input')();if(startFlush)flush=f.original.flush();await f.recoveryEntered.promise;
  f.paintRelease.resolve();await reading;assert.deepEqual(f.paints,[true],'exact newly qualified scope publishes without replacing the live editing owner');assert.equal(f.owner.aiEditor,f.original);assert.equal(f.original.row,row);assert.equal(f.original.nodes.get('blockSummary')[0],node);assert.equal(f.original.disposed,false);assert.equal(f.edits.length,0);assert.equal((await f.read()).revision,7);
  f.recoveryRelease.resolve();assert.equal(await (flush||f.original.flush()),true);
  const after=await f.read();assert.equal(after.blockSummary,'');assert.equal(after.revision,8);assert.equal(f.edits.length,1);assert.equal(f.edits[0].edit.expectedRevision,7);assert.equal(f.paints.at(-1),true);assert.equal(f.reads(),initialReads,'all original qualification reads completed before the synchronous identity fence');assert.equal(f.rounds(),1);assert.equal(JSON.parse(f.owner.aiScopeKey)[4],generation);
  for(const field of SECTION_AI_FIELDS.filter(x=>x!=='blockSummary'))assert.deepEqual(after[field],f.cached[field]);
 }finally{f.paintRelease.resolve();f.recoveryRelease.resolve();await Promise.allSettled([reading,flush]);await f.close();}
});
for(const stop of ['dispose','route','failed','concurrent-row'])test(`late publication cannot retire a dirty draft or revive ${stop} owner`,{timeout:10000},async()=>{
 const f=await publication();let reading,flush;
 try{
  reading=f.owner.refresh();await f.paintEntered.promise;const node=f.original.nodes.get('blockSummary')[0];node.textContent='';node.listeners.get('input')();flush=f.original.flush();await f.recoveryEntered.promise;f.paintRelease.resolve();await reading;assert.deepEqual(f.paints,[true]);assert.equal(f.original.disposed,false);
  if(stop==='dispose')f.original.dispose();else if(stop==='route'){f.owner.openIntent++;f.owner.view='original';f.original.dispose();}else if(stop==='failed')f.original.failed=true;else await f.s.editAIPresentation({topicId:f.topic.id,field:'blockSummary',value:'SYNTHETIC concurrent saved value',expectedRevision:7,operationId:crypto.randomUUID()});
  f.recoveryRelease.resolve();assert.equal(await flush,false);await new Promise(resolve=>setImmediate(resolve));assert.equal(f.rounds(),1,'stale/failed owner cannot schedule a new read');assert.equal(f.owner.aiEditor,f.original);
  const after=await f.read();assert.equal(after.revision,stop==='concurrent-row'?8:7);assert.equal(f.edits.length,stop==='concurrent-row'?1:0);if(stop==='concurrent-row'){assert.equal(f.original.conflicted,true);assert.equal(after.blockSummary,'SYNTHETIC concurrent saved value');}if(['failed','concurrent-row'].includes(stop)){assert.equal(node.textContent,'');assert.equal(f.original.dirty(),true);assert.equal(f.original.disposed,false);}
 }finally{f.paintRelease.resolve();f.recoveryRelease.resolve();await Promise.allSettled([reading,flush]);await f.close();}
});
test('a clean generation change still retains the qualified editor without another refresh',{timeout:10000},async()=>{
 const f=await publication();try{const reading=f.owner.refresh();await f.paintEntered.promise;f.paintRelease.resolve();await reading;assert.deepEqual(f.paints,[true]);assert.equal(f.owner.aiEditor,f.original);assert.equal(f.original.disposed,false);assert.equal(f.rounds(),1);assert.equal(f.edits.length,0);}finally{await f.close();}
});
test('withheld evidence immediately retires late editing authority while its exact recovery snapshot remains protected',{timeout:10000},async()=>{
 const f=await publication({withheld:true});let reading,flush;
 try{reading=f.owner.refresh();await f.paintEntered.promise;const node=f.original.nodes.get('blockSummary')[0];node.textContent='';node.listeners.get('input')();flush=f.original.flush();await f.recoveryEntered.promise;
  assert.deepEqual(f.saves[0].draft.operation.values,{blockSummary:''});f.paintRelease.resolve();await reading;assert.deepEqual(f.paints,[true]);assert.equal(f.original.disposed,true);assert.equal(f.owner.aiEditor,f.original,'the same owner remains reachable solely for recovery');assert.equal(f.original.recoveryOnly,true);assert.equal(f.original.nodes.size,0,'withheld evidence cannot retain an editable pane');assert.equal(f.original.root.textContent.includes('SYNTHETIC currentView'),false);
  f.recoveryRelease.resolve();assert.equal(await flush,false);const recovered=await chrome.runtime.sendMessage({type:'PAIA_RECOVERY_DRAFT_LOAD',draft:{kind:'ai_presentation',ownerId:f.topic.id,epoch:f.cached.recoveryEpoch}});assert.equal(recovered.ok,true);assert.deepEqual(recovered.data.operation.values,{blockSummary:''});assert.equal((await f.read()).revision,7);assert.equal(f.edits.length,0);
 }finally{f.paintRelease.resolve();f.recoveryRelease.resolve();await Promise.allSettled([reading,flush]);await f.close();}
});
test('recovery-only late state publishes the freshly qualified generation without a deferred-read dead end',{timeout:10000},async()=>{
 const f=await publication();let reading;
 try{reading=f.owner.refresh();await f.paintEntered.promise;const node=f.original.nodes.get('blockSummary')[0];node.textContent='SYNTHETIC temporary draft';node.listeners.get('input')();await f.recoveryEntered.promise;node.textContent=f.cached.blockSummary;node.listeners.get('input')();assert.equal(f.original.dirty(),false);assert.equal(f.original.recoveryPending,true);
  f.paintRelease.resolve();await reading;assert.equal(f.paints.at(-1),true);assert.deepEqual(f.paints,[true]);assert.equal(f.owner.aiEditor,f.original);assert.equal(JSON.parse(f.owner.aiScopeKey)[4],'g2');f.recoveryRelease.resolve();await f.original.recovery.running;assert.equal(await f.original.flush(),true);assert.equal(f.original.recoveryPending,false);assert.equal(f.rounds(),1);assert.equal(f.edits.length,0);assert.equal((await f.read()).revision,7);
 }finally{f.paintRelease.resolve();f.recoveryRelease.resolve();await reading;await f.close();}
});
test('local field ACK mirrors canonical human protection before generation-only retention',{timeout:10000},async()=>{
 const f=await publication();try{const node=f.original.nodes.get('currentView')[0];node.textContent='SYNTHETIC human prior field';f.recoveryRelease.resolve();assert.equal(await f.original.flush(),true);const status=await f.s.aiPresentationStatus({topicId:f.topic.id}),cached={...status.topics[0].presentation,recoveryEpoch:f.cached.recoveryEpoch};f.owner.aiTopics.set(f.topic.id,{presentation:cached});assert.deepEqual(f.original.row.protections,cached.protections);const reading=f.owner.refresh();await f.paintEntered.promise;f.paintRelease.resolve();await reading;assert.equal(f.paints.at(-1),true);assert.equal(f.owner.aiEditor,f.original);assert.equal(f.original.disposed,false);}finally{await f.close();}
});

for(const [reason,change]of Object.entries({
 canonicalField:f=>f.cached.currentView='SYNTHETIC changed canonical text',
 revision:f=>f.cached.revision++,
 protection:f=>f.cached.protections={currentView:true},
 fieldRevision:f=>f.cached.fieldRevisions={currentView:2},
 rowIdentity:f=>f.cached.id='another-canonical-row',
 recoveryEpoch:f=>f.page.recoveryEpoch='restored-epoch',
 incomplete:f=>f.page.indexing=true,
 admittedFields:f=>f.original.admittedFields.delete('currentView'),
 evidence:f=>f.original.sectionEvidence=new Set(['unrelated-evidence']),
 scopeTopic:f=>{const scope=JSON.parse(f.owner.aiScopeKey);scope[0]='other-topic';f.owner.aiScopeKey=JSON.stringify(scope);},
 scopeSection:f=>{const scope=JSON.parse(f.owner.aiScopeKey);scope[1]='other-section';f.owner.aiScopeKey=JSON.stringify(scope);},
}))test('late pending work never retains changed '+reason+' authority',{timeout:10000},async()=>{
 const f=await publication();let reading,flush;
 try{change(f);reading=f.owner.refresh();await f.paintEntered.promise;const node=f.original.nodes.get('blockSummary')[0];node.textContent='';node.listeners.get('input')();flush=f.original.flush();await f.recoveryEntered.promise;f.paintRelease.resolve();await reading;assert.equal(f.original.disposed,true);assert.equal(f.owner.aiEditor,f.original);assert.equal(f.original.recoveryOnly,true);assert.equal(f.original.nodes.size,0);f.recoveryRelease.resolve();assert.equal(await flush,false);assert.equal(f.edits.length,0);assert.deepEqual(f.saves[0].draft.operation.values,{blockSummary:''});assert.equal((await f.read()).revision,7);
 }finally{f.paintRelease.resolve();f.recoveryRelease.resolve();await Promise.allSettled([reading,flush]);await f.close();}
});
test('the native control changes original read generation without changing the saved AI canonical DTO',{timeout:10000},async()=>{
 const f=await fixture({revision:7,lists:true});
 try{const {ThoughtLibraryReadModel}=await import('../core/thought-library-read-model.js'),{ThoughtSectionReading}=await import('../core/thought-section-reading.js'),reader=new ThoughtSectionReading(new ThoughtLibraryReadModel(f.s)),options={topicId:f.topic.id,scopeSectionId:f.topic.sectionId,limit:1},beforePage=await reader.page(options),before=(await f.s.aiPresentationStatus({topicId:f.topic.id})).topics[0].presentation,topic=await f.s.topic(f.topic.id);const result=await f.s.editTopic({id:topic.id,expectedRevision:topic.revision,changes:{pinned:topic.pinKey!==0},operationId:crypto.randomUUID()});assert.equal(result.conflict,undefined);const afterPage=await reader.page(options),after=(await f.s.aiPresentationStatus({topicId:f.topic.id})).topics[0].presentation;assert.notEqual(afterPage.coverage.activeGeneration,beforePage.coverage.activeGeneration);assert.deepEqual(after,before);assert.notEqual(afterPage.authority,beforePage.authority,'new original read authority is qualified afresh, never borrowed from the old pane');assert.equal((await f.s.topic(topic.id)).revision,topic.revision+1);assert.equal(afterPage.recoveryEpoch,beforePage.recoveryEpoch);assert.equal(afterPage.items[0].entry.id,beforePage.items[0].entry.id);
 }finally{await f.close();}
});

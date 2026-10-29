// Explicit in-memory synthetic service boundary. Never imported by production.
// UI handlers remain original; only bounded test records and their ACKs live here.
let current=null;
const clone=value=>structuredClone(value),ok=data=>({handled:true,data}),refusal=error=>({handled:true,expectedFailure:{error}});
const need=(condition,error)=>{if(!condition)throw Error(error);};
export function configureGapState(scene,fixture){
 const recoveryScene=['context-draft-recovery-retry','context-conflict-replacement-preserved','context-delete-ack-newer-draft'].includes(scene.id);
 const items=recoveryScene?[]:[['info','补充信息','我正在整理自己的学习笔记，希望保留原本表达的细节。'],['rules','工作方式','先给出清晰结论，再解释依据；不确定的地方请直接说明。'],['now','阶段重点','这个阶段专注于阅读、写作，以及让已有想法逐渐形成结构。']].map(([card,section,body],order)=>({id:'visual-context-'+card,card,section,body,revision:1,order,lifecycle:'active',createdAt:'2026-10-25T08:00:00.000Z',updatedAt:'2026-10-25T08:00:00.000Z'}));
 current={scene,fixture,items,initialItems:clone(items),drafts:new Map(),operations:new Map(),writes:[],expectedRefusals:[],created:[]};
 // Make one existing derived-entry slot available without altering any Input.
 if(scene.id==='thought-write-save'){const removed=fixture.entries.pop();fixture.placements.splice(fixture.placements.findIndex(p=>p.entryId===removed.id),1);}
 globalThis.__paiaGapStateEvidence=()=>({scope:'synthetic in-memory only; not native persistence/grants',writes:clone(current.writes),expectedRefusals:clone(current.expectedRefusals),created:clone(current.created),contextItems:clone(current.items),drafts:[...current.drafts.values()].map(d=>({kind:d.kind,ownerId:d.ownerId,token:d.token})),bounds:{topics:fixture.topics.length,sections:fixture.topics.map(t=>t.sections.length),inputs:fixture.inputs.length,entries:fixture.entries.length,contextItems:items.length},externalAllowed:false,providerCalls:0,realAccounts:0});
}
const text=value=>typeof value==='string'&&value.length<=4096;
function refused(type,error){current.expectedRefusals.push({type,error});return refusal(error);}
export function fixtureRPC(message,{scene,fixture}){
 need(current&&current.scene.id===scene.id,'GAP_SCENE_IDENTITY_MISMATCH');
 const id=scene.id,type=message.type;
 if(type==='PAIA_RECOVERY_DRAFT_SAVE'){
  const d=message.draft;need(d&&typeof d.kind==='string'&&typeof d.ownerId==='string'&&typeof d.token==='string'&&JSON.stringify(d).length<=20000,'GAP_DRAFT_BOUND');
  need(['context_item','document','library_entry'].includes(d.kind),'GAP_DRAFT_KIND');
  need(d.ownerId.startsWith('visual-'),'GAP_DRAFT_ID');current.drafts.set(d.kind+':'+d.ownerId,clone(d));need(current.drafts.size<=4,'GAP_DRAFT_COUNT');return ok({saved:true});
 }
 if(type==='PAIA_RECOVERY_DRAFT_LOAD'){const d=message.draft;return ok(clone(current.drafts.get(d.kind+':'+d.ownerId)||null));}
 if(type==='PAIA_RECOVERY_DRAFT_CLEAR'){const d=message.draft,key=d.kind+':'+d.ownerId,saved=current.drafts.get(key);if(saved?.token===d.token)current.drafts.delete(key);return ok(!saved||saved.token===d.token);}
 if(type==='PAIA_RECOVERY_DRAFT_CLEAR_MANY'){need(Array.isArray(message.drafts)&&message.drafts.length<=4,'GAP_CLEAR_BOUND');for(const d of message.drafts){const key=d.kind+':'+d.ownerId;if(current.drafts.get(key)?.token===d.token)current.drafts.delete(key);}return ok(true);}
 if(type==='PAIA_CONTEXT_CARDS_DRAFTS')return ok([]);
 if(type==='PAIA_CONTEXT_CARDS_SNAPSHOT'&&scene.group==='context'){
  const selected=id.startsWith('context-selected'),retained=id==='context-retained-dark';
  const access=Object.fromEntries(['global','info','rules','now','inputs'].map(key=>[key,{enabled:(selected||retained)&&['inputs','global'].includes(key)&&!(retained&&key==='global'),revision:1}]));
  return ok({epoch:'visual-context-epoch',access,counts:{info:1,rules:1,now:1,inputs:fixture.topics.length},items:message.mode==='home'?[]:clone(current.items),connections:0,connectionStatus:{available:false,reason:'not-configured',connections:[]},capabilities:{inputs:true,external:false},maintenance:{available:false},topicChoices:{available:true,selectedCount:selected||retained?2:0,selectedNames:selected||retained?fixture.topics.slice(0,2).map(t=>t.name):[]}});
 }
 if(type==='PAIA_CONTEXT_TOPICS_PAGE'&&scene.group==='context'){
  const selected=id.startsWith('context-selected'),retained=id==='context-retained-dark';
  return ok({available:true,version:1,externalAllowed:false,epoch:'visual-context-epoch',authority:'visual-topic-authority',items:fixture.topics.map((t,index)=>({topicId:t.id,name:t.name,enabled:(selected||retained)&&index<2,revision:1,canEnable:false,canDisable:index<2,policyAllowed:selected,reason:retained?'global_off':undefined,externalAllowed:false})),complete:true,nextCursor:null,selectedCount:selected||retained?2:0});
 }
 if(type==='PAIA_CONTEXT_CARDS_CHANGE'){
  need(['context-info-save','context-rules-undo','context-now-leave-blocked'].includes(id),'GAP_CONTEXT_WRITE_SCOPE');const c=message.change,item=current.items.find(x=>x.id===c?.itemId);
  need(c?.kind==='put'&&item&&c.card===item.card&&c.section===item.section&&c.epoch==='visual-context-epoch'&&text(c.body)&&c.body.trim()&&typeof c.operationId==='string','GAP_CONTEXT_WRITE_SHAPE');
  if(id==='context-now-leave-blocked')return refused(type,'UNAVAILABLE');
  if(current.operations.has(c.operationId))return ok(clone(current.operations.get(c.operationId)));
  need(c.expectedRevision===item.revision&&current.writes.length<2,'GAP_CONTEXT_REVISION_OR_WRITE_BOUND');item.body=c.body;item.revision++;
  const result={ok:true,itemId:item.id,lifecycle:'active',revision:item.revision};current.operations.set(c.operationId,result);current.writes.push({type,id:item.id,body:item.body,revision:item.revision});return ok(result);
 }
 if(type==='PAIA_CONTEXT_CARDS_OUTCOME'&&id==='context-now-leave-blocked')return ok({state:'not_committed'});
 if(type==='CONTINUE_THINKING'){
  need(['thought-write-save','thought-dirty-section-cancel'].includes(id),'GAP_THOUGHT_CREATE_SCOPE');const t=message.thought;need(t&&text(t.body)&&t.body.trim()&&typeof t.operationId==='string','GAP_THOUGHT_CREATE_SHAPE');
  if(id==='thought-dirty-section-cancel')return refused(type,'UNAVAILABLE');
  if(current.operations.has(t.operationId))return ok(clone(current.operations.get(t.operationId)));
  need(!t.topicId&&!t.sectionId&&!t.inputId&&fixture.entries.length===11&&current.created.length===0,'GAP_THOUGHT_CREATE_BOUND');
  const entry={...clone(fixture.entries[0]),id:'visual-created-entry',body:t.body,userCreated:true,sourceRecordIds:[],revision:1,contentRevision:1,fieldRevisions:{body:1,note:1,type:1},expressionAt:'2026-10-25T12:00:00.000Z'};fixture.entries.push(entry);current.created.push({id:entry.id,body:entry.body});const result={id:entry.id};current.operations.set(t.operationId,result);return ok(result);
 }
 if(type==='FILTER_PROTECT'){need(['archive-edit-save','archive-edit-undo'].includes(id)&&fixture.blocks.some(b=>b.id===message.id),'GAP_FILTER_PROTECT_SCOPE');return ok({protected:true});}
 if(type==='EDIT_DOCUMENT'){
  need(['archive-edit-save','archive-edit-undo'].includes(id),'GAP_ARCHIVE_WRITE_SCOPE');const e=message.edit;need(e?.documentId==='visual-document-1'&&Array.isArray(e.blocks)&&e.blocks.length===1&&!e.title&&!e.removeScope&&!e.restoreRevisionId&&typeof e.operationId==='string','GAP_ARCHIVE_WRITE_SHAPE');
  if(current.operations.has(e.operationId))return ok(clone(current.operations.get(e.operationId)));
  const b=e.blocks[0],saved=fixture.blocks.find(row=>row.id===b.id);need(saved&&saved.documentId===e.documentId&&saved.revision===b.expectedRevision&&(b.libraryText===null||text(b.libraryText))&&b.excluded===false&&b.note===''&&current.writes.length<2,'GAP_ARCHIVE_REVISION_OR_WRITE_BOUND');
  saved.libraryText=b.libraryText;saved.revision++;saved.contentRevision++;current.writes.push({type,id:b.id,body:b.libraryText,revision:saved.revision});const result={ok:true};current.operations.set(e.operationId,result);return ok(result);
 }
 if(type==='PAIA_ARCHIVE_OPERATION_OUTCOME'&&['archive-edit-save','archive-edit-undo'].includes(id))return ok({state:'not_committed'});
 return null;
}

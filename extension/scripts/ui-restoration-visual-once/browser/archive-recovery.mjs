// Synthetic RPC-boundary adapter; production Archive/History handlers and DOM
// remain unchanged. No browser or test execution is authorized by this file.
const NAV='archive-navigation-read-retry',LATEST='history-latest-preview',RESTORE='history-restore-pending-departure';
const ids=new Set([NAV,LATEST,RESTORE]),DOC='visual-document-1',INPUT='visual-input-1';
const OLDER='visual-history-1',NEWER='visual-history-2';
const CURSOR=Object.freeze({synthetic:'visual-navigation-continuation-1'});
const PROJECT=Object.freeze({providerKey:'chatgpt',projectId:'visual-project-1'});
const FIELD='#document-body [data-edit-id="visual-input-1"]';
const CONFIRM='#revision-list [data-restore-confirm]';
const clone=value=>structuredClone(value),ok=data=>({handled:true,data}),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const need=(value,reason)=>{if(!value)throw Error('ARCHIVE_RECOVERY_'+reason);};
const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).every(key=>keys.includes(key));
let state=null;
function current(){need(state,'NOT_CONFIGURED');return state;}
function active(scene,fixture){return ids.has(scene?.id)&&state?.scene.id===scene.id&&fixture===state.fixture;}
const snapshot=block=>({libraryText:block.libraryText,note:block.note,excluded:block.excluded,originalTextReference:block.originalTextReference,provenanceSignature:block.provenanceSignature});
function historicalText(index){return current().fixture.inputs[index].text;}
function prepared(revision){
 const s=current(),input=s.fixture.blocks.find(row=>row.id===INPUT),row=s.revisions.find(row=>row.id===revision.id),historical=clone(row[revision.side]);
 const operationId=revision.id===NEWER?(revision.side==='before'?'00000000-0000-4000-8000-000000000201':'00000000-0000-4000-8000-000000000202'):(revision.side==='before'?'00000000-0000-4000-8000-000000000101':'00000000-0000-4000-8000-000000000102');
 return {kind:'input',current:snapshot(input),historical,records:clone(s.fixture.records.filter(record=>record.id===input.originalTextReference)),input:clone(input),edit:{operationId,documentId:DOC,revisionReason:'restore',restoreRevisionId:revision.id,restoreRevisionSide:revision.side,blocks:[{id:INPUT,expectedRevision:input.revision,libraryText:historical.libraryText,note:historical.note,excluded:historical.excluded}]}};
}
function refusal(message,error,boundary){const s=current();need(!s.failures.has(message),'DUPLICATE_REFUSAL');s.failures.set(message,{error,boundary});s.refusals.push({type:message.type,error,boundary});need(s.refusals.length<=2,'REFUSAL_BOUND');return {handled:true,expectedFailure:{error,boundary}};}
function hold(key,message,response){const s=current();need(!s.held.has(key)&&!s.released.includes(key),'DUPLICATE_GATE');return new Promise(resolve=>s.held.set(key,{resolve,message,response}));}
export function configure(scene,{fixture}){
 if(!ids.has(scene?.id))return null;need(!state,'CONFIGURE_ONCE');
 need(fixture?.synthetic===true&&fixture.topics.length<=8&&fixture.topics.every(topic=>topic.sections.length<=2)&&fixture.inputs.length<=12&&fixture.entries.length<=12&&fixture.documents.length===2,'FIXTURE_BOUND');
 need(fixture.inputs.length>=4&&fixture.inputs.every(input=>typeof input.text==='string'&&input.text.length<=4096),'TEXT_BOUND');
 const input=fixture.blocks.find(row=>row.id===INPUT);need(input?.documentId===DOC&&input.revision===1&&input.libraryText===null,'INPUT_IDENTITY');
 state={scene,fixture,owners:null,held:new Map(),released:[],failures:new WeakMap(),refusals:[],navReads:[],navScope:null,revisionReads:0,prepareReads:[],edits:[],outcomeReads:0,drafts:new Map(),draftLoads:0,draftSaves:0,draftClears:0,prepared:new Map(),editDigest:null,checks:{retiredScopePreserved:null,latestPreviewPreserved:null,departureFocusPreserved:null},revisions:[]};
 const base=snapshot(input),make=(id,sequence,before,after)=>({id,sequence,kind:'input',entityId:INPUT,documentId:DOC,at:'2026-10-25T08:00:00.000Z',reason:'edit',important:false,sourceRecordIds:[input.originalTextReference],before:{...base,libraryText:before},after:{...base,libraryText:after}});
 state.revisions=[make(NEWER,2,fixture.inputs[1].text,fixture.inputs[2].text),make(OLDER,1,fixture.inputs[3].text,fixture.inputs[1].text)];
 return {handled:true};
}
function navPage(items,nextCursor=null){return {items,coverage:{state:'complete'},generation:'visual-nav-1',nextCursor,effectiveOrdering:'paia',unavailableReason:null,selectedPath:null};}
function windowRow(document){return {kind:'window',id:document.id,documentId:document.id,title:document.title,providerKey:'chatgpt',groupKind:'project',projectRef:clone(PROJECT),sourceStatus:'available'};}
function navigationRead(message){
 const s=current(),page=message.page;
 need(exact(message,['type','page'])&&exact(page,['providerKey','groupKind','projectRef','cursor','limit','mode','selectedDocumentId'])&&page.providerKey==='chatgpt'&&page.groupKind==='project'&&same(page.projectRef,PROJECT)&&page.limit===40&&page.mode==='paia'&&page.selectedDocumentId===null,'NAV_REQUEST_SHAPE');
 s.navReads.push({cursor:clone(page.cursor??null),selectedDocumentId:page.selectedDocumentId});need(s.navReads.length<=3,'NAV_READ_BOUND');
 if(s.navReads.length===1){need(page.cursor===undefined,'INITIAL_CURSOR');return ok(navPage([windowRow(s.fixture.documents[0])],clone(CURSOR)));}
 need(same(page.cursor,CURSOR),'RETRY_CURSOR_CHANGED');
 if(s.navReads.length===2)return refusal(message,'STORAGE_FAILED','synthetic_archive_navigation_read');
 s.navScope=[...s.owners.archiveNavigator.state.scopes.values()].find(scope=>scope.options.groupKind==='project');
 need(s.navScope&&s.navScope.loading&&s.navScope.items.length===1&&same(s.navScope.nextCursor,CURSOR),'RETRY_NOT_ORIGINAL_SCOPE');
 return hold('release-nav-retry',message,ok(navPage([windowRow(s.fixture.documents[1])])));
}
function draftMessage(message){
 const s=current(),draft=message.draft;need(exact(message,['type','draft'])&&draft?.kind==='document'&&draft.ownerId===DOC,'DRAFT_OWNER');
 if(message.type==='PAIA_RECOVERY_DRAFT_LOAD'){
  need(exact(draft,['kind','ownerId','epoch'])&&draft.epoch===s.fixture.epoch,'DRAFT_LOAD_SHAPE');s.draftLoads++;need(s.draftLoads<=3,'DRAFT_LOAD_BOUND');return ok(clone(s.drafts.get(DOC)||null));
 }
 if(message.type==='PAIA_RECOVERY_DRAFT_CLEAR'){s.draftClears++;throw Error('ARCHIVE_RECOVERY_UNEXPECTED_DRAFT_CLEAR');}
 need(s.scene.id===RESTORE&&exact(draft,['kind','ownerId','epoch','token','operation','sourceRecordIds'])&&draft.epoch===s.fixture.epoch&&Array.isArray(draft.sourceRecordIds)&&draft.sourceRecordIds.length<=6&&draft.sourceRecordIds.every(id=>s.fixture.records.slice(0,6).some(record=>record.id===id))&&JSON.stringify(draft).length<=20000,'DRAFT_SAVE_SHAPE');
 const selected=s.prepared.get(NEWER+':before'),operation=draft.operation;
 need(selected&&exact(operation,['type','edit','pendingRequest'])&&operation.type==='EDIT_DOCUMENT'&&same(operation.edit,selected.edit)&&operation.pendingRequest===JSON.stringify(selected.edit)&&draft.token===selected.edit.operationId,'DRAFT_PREPARED_IDENTITY');
 s.draftSaves++;need(s.draftSaves<=2,'DRAFT_SAVE_BOUND');s.drafts.set(DOC,clone(draft));need(s.drafts.size<=4,'DRAFT_COUNT');return ok({saved:true});
}
export async function fixtureRPC(message,{scene,fixture}){
 if(!ids.has(scene?.id))return null;need(active(scene,fixture),'SCENE_OR_FIXTURE_IDENTITY');const s=state,type=message?.type;need(typeof type==='string','RPC_TYPE');
 if(type==='PAIA_ARCHIVE_NAV_PAGE'&&scene.id===NAV&&message.page?.groupKind==='project')return navigationRead(message);
 if(type==='GET_REVISIONS'){
  const options=message.options;need(scene.id!==NAV&&exact(message,['type','options'])&&exact(options,['documentId','kind','entityId','cursor','limit'])&&options.documentId===DOC&&options.kind==='input'&&options.entityId===INPUT&&options.cursor===null&&options.limit===50,'REVISION_LIST_SCOPE');
  s.revisionReads++;need(s.revisionReads===1,'REVISION_LIST_BOUND');return ok({items:clone(s.revisions),nextCursor:null});
 }
 if(type==='PAIA_ARCHIVE_PREPARE_REVISION'){
  const revision=message.revision;need(scene.id!==NAV&&exact(message,['type','revision'])&&exact(revision,['id','side','documentId'])&&revision.documentId===DOC&&[NEWER,OLDER].includes(revision.id)&&['before','after'].includes(revision.side),'PREPARE_SCOPE');
  s.prepareReads.push(clone(revision));const index=s.prepareReads.length,key=revision.id+':'+revision.side;
  need(!s.prepared.has(key),'PREPARE_DUPLICATE');const response=prepared(revision);s.prepared.set(key,clone(response));
  if(scene.id===LATEST){
   need(index<=2&&(index===1?revision.id===NEWER&&revision.side==='before':revision.id===OLDER&&revision.side==='after'),'LATEST_SELECTION_ORDER');
   return hold(index===1?'release-older-preview':'release-latest-preview',message,ok(response));
  }
  need(index===1&&revision.id===NEWER&&revision.side==='before','RESTORE_SELECTION');return ok(response);
 }
 if(['PAIA_RECOVERY_DRAFT_LOAD','PAIA_RECOVERY_DRAFT_SAVE','PAIA_RECOVERY_DRAFT_CLEAR'].includes(type)&&message.draft?.kind==='document')return draftMessage(message);
 if(type==='EDIT_DOCUMENT'){
  const selected=s.prepared.get(NEWER+':before');need(scene.id===RESTORE&&exact(message,['type','edit'])&&selected&&same(message.edit,selected.edit)&&s.drafts.get(DOC)?.token===selected.edit.operationId,'RESTORE_WRITE_IDENTITY');
  s.edits.push(clone(message.edit));need(s.edits.length===1,'RESTORE_DISPATCH_BOUND');
  const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(message.edit)));s.editDigest=[...new Uint8Array(hash)].map(value=>value.toString(16).padStart(2,'0')).join('');
  return hold('reject-history-restore',message,null);
 }
 if(type==='PAIA_ARCHIVE_OPERATION_OUTCOME'){
  const query=message.query,edit=s.edits[0];need(scene.id===RESTORE&&s.released.includes('reject-history-restore')&&exact(message,['type','query'])&&exact(query,['version','namespace','ownerRef','operationId','requestDigest','epoch'])&&query.version===1&&query.namespace==='working-input'&&query.ownerRef===DOC&&query.epoch===fixture.epoch&&query.operationId===edit?.operationId&&query.requestDigest===s.editDigest,'OUTCOME_IDENTITY');
  s.outcomeReads++;need(s.outcomeReads===1,'OUTCOME_READ_BOUND');return ok({state:'not_committed'});
 }
 return null;
}
export function acceptsExpectedFailure(message,response,scene){
 const s=state,declared=s?.failures.get(message),failure=response?.expectedFailure;
 return !!(s&&scene?.id===s.scene.id&&declared&&failure&&failure.error===declared.error&&failure.boundary===declared.boundary&&((scene.id===NAV&&message.type==='PAIA_ARCHIVE_NAV_PAGE'&&declared.error==='STORAGE_FAILED'&&declared.boundary==='synthetic_archive_navigation_read')||(scene.id===RESTORE&&message.type==='EDIT_DOCUMENT'&&declared.error==='UNAVAILABLE'&&declared.boundary==='synthetic_archive_restore_refused')));
}
export async function control(command){
 const s=current(),allowed=s.scene.id===NAV?['release-nav-retry']:s.scene.id===LATEST?['release-latest-preview','release-older-preview']:['reject-history-restore'];
 need(allowed.includes(command)&&s.held.has(command)&&!s.released.includes(command),'CONTROL_NOT_FIXED_PENDING_GATE');
 const gate=s.held.get(command),priorFocus=document.activeElement,priorConfirm=document.querySelector(CONFIRM),priorThought=s.owners.thoughts?.id;
 if(command==='release-nav-retry')need(s.navReads.length===3&&s.owners.view==='thoughts'&&priorThought==='visual-topic-1'&&!s.owners.archiveNavigator.active,'NAV_NOT_RETIRED');
 if(command==='release-latest-preview')need(s.prepareReads.length===2&&!priorConfirm,'LATEST_RELEASE_ORDER');
 if(command==='release-older-preview')need(s.released.includes('release-latest-preview')&&priorConfirm&&priorFocus===priorConfirm.querySelector('button'),'OLDER_RELEASE_ORDER');
 if(command==='reject-history-restore')need(s.edits.length===1&&!document.getElementById('revision-dialog').open&&priorFocus===document.querySelector(FIELD)&&s.owners.editor?.saving===true,'RESTORE_NOT_DEPARTED');
 s.held.delete(command);s.released.push(command);
 gate.resolve(command==='reject-history-restore'?refusal(gate.message,'UNAVAILABLE','synthetic_archive_restore_refused'):gate.response);
 // Only settle a declared fixture response, then observe the original async
 // continuation after one task boundary. No DOM/owner methods are patched.
 await new Promise(resolve=>setTimeout(resolve,0));
 if(command==='release-nav-retry')s.checks.retiredScopePreserved=s.owners.view==='thoughts'&&s.owners.thoughts.id===priorThought&&!s.owners.archiveNavigator.active&&s.navScope.items.length===1&&s.navScope.items[0].documentId===DOC&&same(s.navScope.nextCursor,CURSOR)&&s.owners.archiveNavigator.state.selectedPath===null;
 if(command==='release-older-preview')s.checks.latestPreviewPreserved=document.querySelectorAll(CONFIRM).length===1&&document.querySelector(CONFIRM)===priorConfirm&&document.activeElement===priorFocus&&priorConfirm.querySelectorAll('pre')[1]?.textContent===historicalText(1)+'\n\n保留在 Input Archive';
 if(command==='reject-history-restore')s.checks.departureFocusPreserved=document.activeElement===priorFocus&&!document.getElementById('revision-dialog').open&&document.querySelectorAll(CONFIRM).length===0;
 return {handled:true,settled:command};
}
export function evidence(){
 if(!state)return null;const s=state,editor=s.owners?.editor,entry=editor?.entries.get(INPUT),selected=s.prepared.get(NEWER+':before'),draft=s.drafts.get(DOC),nav=s.owners?.archiveNavigator;
 return {scope:'synthetic in-memory RPC boundary; original production controls; not native persistence',scene:s.scene.id,adapterContentMutations:0,grantChanges:0,held:[...s.held.keys()],released:[...s.released],counts:{navReads:s.navReads.length,revisionReads:s.revisionReads,prepareReads:s.prepareReads.length,editDispatches:s.edits.length,outcomeReads:s.outcomeReads,draftLoads:s.draftLoads,draftSaves:s.draftSaves,draftClears:s.draftClears,contentMutations:0},navReads:clone(s.navReads),prepareReads:clone(s.prepareReads),expectedRefusals:clone(s.refusals),bounds:{topics:s.fixture.topics.length,sections:s.fixture.topics.map(topic=>topic.sections.length),inputs:s.fixture.inputs.length,entries:s.fixture.entries.length,historyRows:s.revisions.length,drafts:s.drafts.size},view:{space:s.owners?.view,topicId:s.owners?.thoughts?.id||null,navActive:nav?.active,navSelected:nav?.selectedDocumentId??null,modalOpen:document.getElementById('revision-dialog')?.open===true,confirmationCount:document.querySelectorAll(CONFIRM).length,editorSaving:editor?.saving===true,editorFailed:editor?.failed===true,editorPendingState:editor?.saveSession.pending?.state||null},checks:{...s.checks,canonicalInputUnchanged:s.fixture.blocks.find(row=>row.id===INPUT)?.libraryText===null,preparedRequestRetained:!!selected&&same(editor?.saveSession.pending?.edit,selected.edit),recoveryDraftRetained:!!selected&&same(draft?.operation.edit,selected.edit)&&draft?.token===selected.edit.operationId,restoredDraftStillVisible:!!selected&&entry?.local.libraryText===selected.historical.libraryText&&document.querySelector(FIELD)?.textContent===selected.historical.libraryText},externalAllowed:false,providerCalls:0,realAccounts:0,clipboardCalls:0};
}
const click=selector=>({action:'click',selector}),wait=(selector,state='visible')=>({action:'wait',selector,state}),assert=(selector,assertion,value)=>({action:'assert',selector,assertion,value}),count=(selector,value)=>({action:'assertCount',selector,value}),check=(path,value)=>({action:'assertRecovery',owner:'archiveRecovery',path,value}),settle=command=>({action:'fixtureControl',owner:'archiveRecovery',command});
export async function prepareScene(scene,{owners,fixture}){
 if(!ids.has(scene?.id))return null;need(active(scene,fixture)&&owners?.archiveNavigator&&typeof owners.navigate==='function','PREPARE_OWNER');state.owners=owners;
 await owners.navigate('library',null,null,{freshArchiveEntry:true});
 const group='.archive-navigator-group-toggle',window='.archive-navigator-window[data-document-id="visual-document-1"]',actions=[wait(group),click(group),wait(window)];
 if(scene.id===NAV){
  const retry='.archive-navigator-retry',more='.archive-navigator-more:not(.archive-navigator-retry)';
  actions.push(click(more),wait(retry),check(['counts','navReads'],2),count('.archive-navigator-window',1),click(group),click(group),wait(retry),check(['counts','navReads'],2),click(retry),check(['held'],['release-nav-retry']),check(['counts','navReads'],3),count('.archive-navigator-window',1),click('#primary-nav [data-view="thoughts"]'),wait('.personal-section-link[data-section-id="visual-section-1-1"]'),click('.personal-section-link[data-section-id="visual-section-1-1"]'),wait('#topic-body [data-entry-id="visual-entry-1"] [data-entry-field="body"]'),settle('release-nav-retry'),check(['checks','retiredScopePreserved'],true),check(['counts','navReads'],3),check(['counts','contentMutations'],0),check(['view','space'],'thoughts'));
  return {handled:true,actions,readySelector:'#topic-body [data-entry-id="visual-entry-1"] [data-entry-field="body"]',evidence:{owner:'actual ArchiveNavigator.readScope/more/retryScope and original primary/Section navigation',scope:'One failed continuation stays parked through collapse/reopen. Explicit Retry holds the same cursor once; leaving to Thought retires it before response settlement.',sourceTests:'archive-navigator-read-retry.test.mjs',contentMutations:0}};
 }
 actions.push(click(window),wait(FIELD),click('#document-menu'),click('#context-menu [role="menuitem"]:has-text("查看修改历史")'),wait('#revision-list select[aria-label="修改历史的 Input"]'),{action:'select',selector:'#revision-list select[aria-label="修改历史的 Input"]',value:INPUT},wait('#revision-list .revision-row:nth-child(1)'),count('#revision-list .revision-row',2));
 const first='#revision-list .revision-row:nth-child(1) .working-history-actions button:nth-child(1)',second='#revision-list .revision-row:nth-child(2) .working-history-actions button:nth-child(2)',commit=CONFIRM+' > button:first-of-type';
 if(scene.id===LATEST){
  actions.push(click(first),check(['held'],['release-older-preview']),click(second),check(['counts','prepareReads'],2),settle('release-latest-preview'),wait(CONFIRM),assert(CONFIRM+' .working-history-compare > section:nth-child(2) pre','text',fixture.inputs[1].text+'\n\n保留在 Input Archive'),assert(commit,'focused'),settle('release-older-preview'),check(['checks','latestPreviewPreserved'],true),count(CONFIRM,1),assert(commit,'focused'),check(['counts','editDispatches'],0),check(['counts','contentMutations'],0));
  return {handled:true,actions,readySelector:CONFIRM,evidence:{owner:'actual Archive document menu/Input history -> appendWorkingRevision',entryCorrection:'#revision-history is hidden in Archive; the original document-menu history action is used instead.',scope:'Two original revision-side selections; newer selection settles first; older completion cannot replace sole confirmation or steal focus.',sourceTests:'working-history-selection-owner.test.mjs',contentMutations:0}};
 }
 actions.push(click(first),wait(CONFIRM),click(commit),check(['held'],['reject-history-restore']),check(['counts','editDispatches'],1),count('#revision-list .working-history-actions button:disabled',4),count(CONFIRM+' > button:disabled',2),click('#close-revisions'),wait('#revision-dialog','hidden'),assert('#document-menu','focused'),click(FIELD),assert(FIELD,'focused'),settle('reject-history-restore'),wait('#retry'),check(['checks','departureFocusPreserved'],true),assert(FIELD,'focused'),count(CONFIRM,0),count('dialog[open]',0),check(['counts','editDispatches'],1),check(['counts','outcomeReads'],1),check(['counts','contentMutations'],0),check(['checks','canonicalInputUnchanged'],true),check(['checks','preparedRequestRetained'],true),check(['checks','recoveryDraftRetained'],true),check(['checks','restoredDraftStillVisible'],true),check(['view','editorPendingState'],'not_committed'),check(['view','editorSaving'],false),check(['view','editorFailed'],true));
 return {handled:true,actions,readySelector:FIELD,evidence:{owner:'actual appendWorkingRevision + original DocumentEditor/WorkingInputSaveSession',entryCorrection:'#revision-history is hidden in Archive; the original document-menu history action is used instead.',scope:'One dispatched restore held at synthetic service response; both preview and confirmation controls remain disabled. Original Close retires only modal UI. Late synthetic refusal retains the original editor/draft and honest save failure, without modal resurrection, focus theft or replay.',dispatchedWriteSemantics:'Closing History does not recall a dispatched write. This fixture explicitly returns not_committed after one refusal; no successful content mutation is simulated.',sourceTests:'working-history-selection-owner.test.mjs and cpv1-02-dvn-working-revision-chrome-e2e.test.mjs',contentMutations:0}};
}

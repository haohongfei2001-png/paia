// Source-component visual harness ONLY. Original Context owners receive trusted
// runner input; this file owns bounded, synthetic RPC records, never app state/DOM.
const DRAFT='context-draft-recovery-retry',CONFLICT='context-conflict-replacement-preserved',DELETE='context-delete-ack-newer-draft';
const ids=new Set([DRAFT,CONFLICT,DELETE]);
const EPOCH='visual-context-recovery-epoch';
const INFO='visual-context-recovery-info',RULES='visual-context-recovery-rules',MISSING='visual-context-recovery-missing';
const TEXT=Object.freeze({info:'合成信息：保留原有学习笔记。',rules:'合成规则：先给结论，再说明依据。',missing:'合成草稿：此前未完成的新信息，逐字恢复。',current:'合成信息：当前编辑器里的新文字，不得被恢复覆盖。',original:'合成规则：原冲突中的人工文字必须保留。',replacement:'合成规则：新条目已独立改写，不能被原冲突覆盖。',concurrent:'合成规则：另一页面已经保存的新版本。',deleted:'合成规则：删除确认返回之前写入的新文字。'});
const clone=value=>structuredClone(value),ok=data=>({handled:true,data});
const need=(value,reason)=>{if(!value)throw Error('CONTEXT_RECOVERY_'+reason);};
const boundedText=value=>typeof value==='string'&&value.length<=4096;
const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).every(key=>keys.includes(key));
let state=null;
function item(id,card,body){return {id,card,body,section:card==='info'?'补充信息':'工作方式',revision:1,order:card==='info'?0:1,lifecycle:'active',origin:'manual',protected:true,userEdited:true,createdAt:'2026-10-25T08:00:00.000Z',updatedAt:'2026-10-25T08:00:00.000Z',deletedBy:null};}
function newDraft(){const change={kind:'put',operationId:'visual-context-missing-operation',epoch:EPOCH,itemId:MISSING,expectedRevision:0,body:TEXT.missing,section:'补充信息',card:'info'};return {kind:'context_item',ownerId:MISSING,epoch:EPOCH,token:change.operationId,sourceRecordIds:[],operation:{type:'PAIA_CONTEXT_CARDS_CHANGE',change}};}
function active(scene){return ids.has(scene?.id)&&state?.scene.id===scene.id;}
function current(){need(state,'NOT_CONFIGURED');return state;}
function owner(){return current().owners?.contextCards||null;}
function refuse(message,error){const s=current();s.failures.set(message,error);s.expectedRefusals.push({type:message.type,error,ownerId:message.draft?.ownerId||message.change?.itemId||null});need(s.expectedRefusals.length<=16,'REFUSAL_BOUND');return {handled:true,expectedFailure:{error}};}
function held(key,message,data){const s=current();need(!s.held.has(key)&&!s.released.includes(key),'DUPLICATE_HELD_RPC');let resolve;const promise=new Promise(done=>{resolve=done;});s.held.set(key,{resolve,data:clone(data),message});return promise;}
function snapshot(message){const s=current();need(exact(message,['type','mode'])&&(message.mode===undefined||message.mode==='home'),'SNAPSHOT_SHAPE');s.snapshotReads++;need(s.snapshotReads<=16,'SNAPSHOT_BOUND');const items=s.items.filter(row=>row.lifecycle==='active');return ok({version:1,epoch:EPOCH,access:Object.fromEntries(['global','info','rules','now','inputs'].map(key=>[key,{enabled:false,revision:1}])),counts:{info:items.filter(row=>row.card==='info').length,rules:items.filter(row=>row.card==='rules').length,now:0,inputs:s.fixture.topics.length},items:message.mode==='home'?[]:clone(items),connections:0,connectionStatus:{available:false,reason:'not-configured',connections:[]},capabilities:{info:true,rules:true,now:true,inputs:true,automatic:false,external:false},maintenance:{available:false},topicChoices:{available:true,selectedCount:0,selectedNames:[],externalAllowed:false}});}
export function configure(scene,{fixture}){
 if(!ids.has(scene?.id))return null;need(!state,'CONFIGURE_ONCE');need(fixture&&fixture.topics.length<=8&&fixture.topics.every(topic=>topic.sections.length<=2)&&fixture.inputs.length<=12&&fixture.entries.length<=12,'FIXTURE_BOUND');
 const items=scene.id===DRAFT?[item(INFO,'info',TEXT.info),item(RULES,'rules',TEXT.rules)]:[item(RULES,'rules',TEXT.rules)];
 state={scene,fixture,items,drafts:new Map(),owners:null,held:new Map(),released:[],failures:new WeakMap(),expectedRefusals:[],snapshotReads:0,draftReads:0,draftSaves:0,draftClears:0,changes:[],outcomes:[],mutations:[],replacementId:null,replacementAttempt:null,attempts:new Map(),staleCardPreserved:null,currentRetryEditor:null,initialEditor:null};
 if(scene.id===DRAFT)state.drafts.set(MISSING,newDraft());return {handled:true};
}
function validateDraft(draft,{write=false}={}){
 const s=current();need(exact(draft,write?['epoch','kind','ownerId','token','operation','sourceRecordIds']:['kind','ownerId','epoch','token'])&&draft.kind==='context_item'&&typeof draft.ownerId==='string','DRAFT_SHAPE');
 if(draft.epoch!==undefined)need(draft.epoch===EPOCH,'DRAFT_EPOCH');
 if(![INFO,RULES,MISSING,s.replacementId].includes(draft.ownerId)){
  // The only dynamic owner is the UUID actually minted by keepConflict. Binding
  // requires that exact live replacement and original link, not a UUID wildcard.
  const page=owner(),original=page?.editors.get(RULES),replacement=page?.editors.get(draft.ownerId);
  need(write&&s.scene.id===CONFLICT&&!s.replacementId&&uuid(draft.ownerId)&&page?.active&&page.card==='rules'&&original?.conflicted===true&&original.replacement===replacement&&replacement?.fresh===true&&replacement.saved.revision===0&&replacement.saved.card==='rules'&&replacement.local===TEXT.original,'DYNAMIC_OWNER_NOT_ACTUAL_REPLACEMENT');
  s.replacementId=draft.ownerId;
 }
 need(s.items.some(row=>row.id===draft.ownerId)||s.drafts.has(draft.ownerId)||draft.ownerId===s.replacementId,'DRAFT_OWNER_NOT_SEEDED_OR_BOUND');
 if(write){
  need(draft.epoch===EPOCH&&typeof draft.token==='string'&&draft.token.length<=128&&Array.isArray(draft.sourceRecordIds)&&draft.sourceRecordIds.length===0&&exact(draft.operation,['type','change'])&&draft.operation.type==='PAIA_CONTEXT_CARDS_CHANGE'&&JSON.stringify(draft).length<=20000,'DRAFT_WRITE_SHAPE');
  const change=draft.operation.change;validatePut(change);need(change.itemId===draft.ownerId&&change.operationId===draft.token,'DRAFT_OPERATION_IDENTITY');
 }
 return draft;
}
function validatePut(change){
 const s=current();need(exact(change,['kind','operationId','epoch','itemId','expectedRevision','body','section','card'])&&change.kind==='put'&&uuid(change.operationId)&&change.epoch===EPOCH&&boundedText(change.body)&&change.body.trim(),'PUT_SHAPE');
 if(s.scene.id===DRAFT)need(change.itemId===INFO&&change.card==='info'&&change.section==='补充信息'&&change.expectedRevision===1&&change.body===TEXT.current,'DRAFT_PUT_SCOPE');
 else if(s.scene.id===CONFLICT){need([RULES,s.replacementId].includes(change.itemId)&&change.card==='rules'&&change.section==='工作方式'&&change.expectedRevision===(change.itemId===RULES?1:0)&&[TEXT.original,TEXT.replacement,TEXT.replacement+'中'].includes(change.body),'CONFLICT_PUT_SCOPE');}
 else need(s.scene.id===DELETE&&change.itemId===RULES&&change.card==='rules'&&change.section==='工作方式'&&change.expectedRevision===1&&change.body===TEXT.deleted,'DELETE_DRAFT_SCOPE');
}
function readDrafts(message){
 const s=current();need(exact(message,['type']),'ENUMERATION_SHAPE');s.draftReads++;
 if(s.scene.id!==DRAFT){need(s.draftReads===1,'UNEXPECTED_ENUMERATION');return ok([]);}
 const page=owner();need(page?.active,'ENUMERATION_WITHOUT_LIVE_OWNER');
 switch(s.draftReads){
  case 1:need(page.card==='info','INITIAL_ENUMERATION_CARD');return refuse(message,'STORAGE_FAILED');
  case 2:need(page.card==='info','STALE_ENUMERATION_CARD');return held('release-stale-draft-read',message,[s.drafts.get(MISSING)]);
  case 3:need(page.card==='rules'&&s.held.has('release-stale-draft-read'),'NEW_CARD_ENUMERATION_ORDER');return ok([]);
  case 4:need(page.card==='info'&&s.released.includes('release-stale-draft-read'),'REOPEN_ENUMERATION_ORDER');return refuse(message,'STORAGE_FAILED');
  case 5:need(page.card==='info'&&page.editors.get(INFO)?.local===TEXT.current&&s.drafts.get(INFO)?.operation.change.body===TEXT.current,'CURRENT_EDITOR_NOT_PROTECTED');s.currentRetryEditor=page.editors.get(INFO);return held('release-current-draft-read',message,[...s.drafts.values()]);
  default:throw Error('CONTEXT_RECOVERY_UNEXPECTED_DRAFT_ENUMERATION');
 }
}
export async function fixtureRPC(message,{scene,fixture}){
 if(!ids.has(scene?.id))return null;need(active(scene)&&fixture===state.fixture,'SCENE_OR_FIXTURE_IDENTITY');const s=state,type=message?.type;need(typeof type==='string','RPC_TYPE');
 if(type==='PAIA_CONTEXT_CARDS_SNAPSHOT')return snapshot(message);
 if(type==='PAIA_CONTEXT_CARDS_DRAFTS')return readDrafts(message);
 if(['PAIA_RECOVERY_DRAFT_SAVE','PAIA_RECOVERY_DRAFT_LOAD','PAIA_RECOVERY_DRAFT_CLEAR'].includes(type)){
  if(message.draft?.kind!=='context_item'){need(type==='PAIA_RECOVERY_DRAFT_LOAD','NON_CONTEXT_DRAFT_WRITE');return null;}
  need(exact(message,['type','draft']),'DRAFT_MESSAGE_SHAPE');const draft=validateDraft(message.draft,{write:type==='PAIA_RECOVERY_DRAFT_SAVE'});
  if(type==='PAIA_RECOVERY_DRAFT_LOAD')return ok(clone(s.drafts.get(draft.ownerId)||null));
  if(type==='PAIA_RECOVERY_DRAFT_CLEAR'){
   // These journeys must retain every protected draft. No fixture silently
   // clears one if a late acknowledgement attempts to retire newer text.
   s.draftClears++;throw Error('CONTEXT_RECOVERY_UNEXPECTED_DRAFT_CLEAR');
  }
  s.draftSaves++;need(s.draftSaves<=6,'DRAFT_SAVE_BOUND');
  if(s.scene.id===DELETE){need(s.items.find(row=>row.id===RULES)?.lifecycle==='removed','DELETE_DRAFT_BEFORE_REMOVAL');return refuse(message,'CONTEXT_INVALIDATED');}
  s.drafts.set(draft.ownerId,clone(draft));need(s.drafts.size<=4,'DRAFT_COUNT');return ok({saved:true});
 }
 if(type==='PAIA_CONTEXT_CARDS_CHANGE'){
  need(exact(message,['type','change']),'CHANGE_MESSAGE_SHAPE');const change=message.change;
  if(s.scene.id===DELETE){
   need(exact(change,['kind','operationId','epoch','itemId','expectedRevision'])&&change.kind==='delete'&&uuid(change.operationId)&&change.epoch===EPOCH&&change.itemId===RULES&&change.expectedRevision===1&&s.changes.length===0,'DELETE_SHAPE_OR_COUNT');
   const saved=s.items[0];need(saved.lifecycle==='active'&&saved.revision===1,'DELETE_REVISION');saved.lifecycle='removed';saved.revision=2;saved.deletedBy=change.operationId;
   s.changes.push(clone(change));s.mutations.push({kind:'delete',itemId:RULES,revision:2});
   return held('release-delete-ack',message,{ok:true,itemId:RULES,revision:2,lifecycle:'removed',deletedBy:change.operationId});
  }
  validatePut(change);s.changes.push(clone(change));need(s.changes.length<=4,'CHANGE_ATTEMPT_BOUND');s.attempts.set(change.operationId,clone(change));
  if(s.scene.id===DRAFT){need(s.changes.length===1,'CURRENT_EDIT_RETRY_NOT_REQUESTED');return refuse(message,'UNAVAILABLE');}
  if(change.itemId===RULES){
   need(s.changes.length===1&&change.body===TEXT.original,'ORIGINAL_CONFLICT_ONCE');const saved=s.items[0];saved.body=TEXT.concurrent;saved.revision=2;s.mutations.push({kind:'synthetic-concurrent-put',itemId:RULES,revision:2,body:TEXT.concurrent});return ok({ok:false,conflict:true,revision:2,lifecycle:'active'});
  }
  const replacement=owner()?.editors.get(s.replacementId);need(replacement&&!replacement.composing,'SAVE_DISPATCH_DURING_COMPOSITION');
  if(!s.replacementAttempt)s.replacementAttempt=clone(change);
  need(JSON.stringify(change)===JSON.stringify(s.replacementAttempt)&&change.body===TEXT.original,'PENDING_REPLACEMENT_OPERATION_CHANGED');return refuse(message,'STORAGE_FAILED');
 }
 if(type==='PAIA_CONTEXT_CARDS_OUTCOME'){
  const query=message.query;need(exact(message,['type','query'])&&exact(query,['operationId','digest','epoch'])&&query.epoch===EPOCH&&/^[0-9a-f]{64}$/i.test(query.digest||'')&&s.attempts.has(query.operationId),'OUTCOME_IDENTITY');const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(s.attempts.get(query.operationId))))),byte=>byte.toString(16).padStart(2,'0')).join('');need(query.digest===digest,'OUTCOME_DIGEST_MISMATCH');s.outcomes.push(clone(query));need(s.outcomes.length<=3,'OUTCOME_BOUND');
  if(s.scene.id===DRAFT){need(s.outcomes.length===1&&s.attempts.get(query.operationId).itemId===INFO,'CURRENT_OUTCOME_SCOPE');return ok({state:'not_committed'});}
  need(s.scene.id===CONFLICT&&s.replacementAttempt?.operationId===query.operationId,'REPLACEMENT_OUTCOME_SCOPE');return refuse(message,'STORAGE_FAILED');
 }
 if(type.startsWith('PAIA_CONTEXT_')||type.startsWith('PAIA_RECOVERY_DRAFT_')&&message.draft?.kind==='context_item'||type==='PAIA_RECOVERY_DRAFT_CLEAR_MANY')throw Error('CONTEXT_RECOVERY_UNSUPPORTED_RPC: '+type);
 return null;
}
export function acceptsExpectedFailure(message,response,scene){return active(scene)&&response?.handled===true&&exact(response.expectedFailure,['error'])&&typeof response.expectedFailure.error==='string'&&state.failures.get(message)===response.expectedFailure.error;}
export async function control(command){
 const s=current();need(ids.has(s.scene.id),'CONTROL_SCENE');const allowed=s.scene.id===DRAFT?['release-stale-draft-read','release-current-draft-read']:s.scene.id===DELETE?['release-delete-ack']:[];
 need(allowed.includes(command)&&s.held.has(command)&&!s.released.includes(command),'CONTROL_NOT_FIXED_PENDING_SETTLEMENT');const gate=s.held.get(command),page=owner(),beforePage=page?.page;
 if(command==='release-stale-draft-read')need(s.draftReads===3&&page.card==='rules'&&!page.editors.has(MISSING),'STALE_RELEASE_ORDER');
 if(command==='release-current-draft-read')need(s.draftReads===5&&page.card==='info'&&page.editors.get(INFO)===s.currentRetryEditor&&page.editors.get(INFO)?.local===TEXT.current,'CURRENT_RELEASE_ORDER');
 if(command==='release-delete-ack')need(page.card==='rules'&&page.editors.get(RULES)?.local===TEXT.deleted&&page.editors.get(RULES)?.recovery.lastFailure?.token===page.editors.get(RULES)?.recovery.currentToken,'DELETE_RELEASE_BEFORE_NEWER_PROTECTION_REFUSAL');
 s.held.delete(command);s.released.push(command);gate.resolve(ok(gate.data));
 // One task boundary allows the original request promise/owner continuation to
 // settle. This is read-only observation after fixture response settlement.
 await new Promise(resolve=>setTimeout(resolve,0));
 if(command==='release-stale-draft-read')s.staleCardPreserved=page.page===beforePage&&page.card==='rules'&&!page.editors.has(MISSING)&&!page.host.textContent.includes(TEXT.missing);
 return {handled:true,settled:command};
}
function editorEvidence(editor){if(!editor)return null;return {id:editor.id,local:editor.local,field:editor.field.innerText,savedBody:editor.saved.body,savedRevision:editor.saved.revision,fresh:editor.fresh,failed:editor.failed,conflicted:editor.conflicted,composing:editor.composing,disposed:editor.disposed===true,pending:clone(editor.commit.pending?.change||null),recoveryToken:editor.recovery.currentToken,protectionFailed:!!editor.recovery.currentToken&&editor.recovery.lastFailure?.token===editor.recovery.currentToken};}
export function evidence(){
 if(!state)return null;const s=state,page=owner(),original=page?.editors.get(s.scene.id===DRAFT?INFO:RULES),replacement=page?.editors.get(s.replacementId),missing=page?.editors.get(MISSING),currentDraft=s.drafts.get(INFO),oldDraft=s.drafts.get(RULES),replacementDraft=s.drafts.get(s.replacementId);
 return {scope:'synthetic in-memory RPC boundary; actual source handlers, not native persistence or physical OS IME',scene:s.scene.id,adapterContentMutations:s.mutations.length,grantChanges:0,externalAllowed:false,providerCalls:0,realAccounts:0,bounds:{topics:s.fixture.topics.length,sections:s.fixture.topics.map(topic=>topic.sections.length),inputs:s.fixture.inputs.length,entries:s.fixture.entries.length,contextItems:new Set([...s.items.map(row=>row.id),...(page?.editors.keys()||[])]).size,drafts:s.drafts.size},counts:{draftReads:s.draftReads,draftSaves:s.draftSaves,draftClears:s.draftClears,changes:s.changes.length,outcomes:s.outcomes.length,contentMutations:s.mutations.length,deleteChanges:s.changes.filter(change=>change.kind==='delete').length,putChanges:s.changes.filter(change=>change.kind==='put').length},held:[...s.held.keys()],released:[...s.released],expectedRefusals:clone(s.expectedRefusals),changes:clone(s.changes),mutations:clone(s.mutations),items:clone(s.items),drafts:[...s.drafts.values()].map(draft=>({ownerId:draft.ownerId,token:draft.token,body:draft.operation.change.body})),view:{card:page?.card,active:page?.active,editorCount:page?.editors.size,original:editorEvidence(original),replacement:editorEvidence(replacement),missing:editorEvidence(missing),message:page?.message?.textContent||'',recoveryState:page?.draftRecoveryNotice?.dataset.state||'',recoveryHidden:page?.draftRecoveryNotice?.hidden===true,deletePending:!!page?.deleteCommit.pending,undoCount:page?.journal.undo.length||0},checks:{staleCardPreserved:s.staleCardPreserved,currentRetryEditorPreserved:!!s.currentRetryEditor&&original===s.currentRetryEditor,currentDraftExact:currentDraft?.operation.change.body===TEXT.current,missingDraftExact:s.drafts.get(MISSING)?.operation.change.body===TEXT.missing,missingRestoredExact:missing?.local===TEXT.missing&&missing.field.innerText===TEXT.missing&&missing.fresh===true&&missing.saved.revision===0&&missing.recovery.currentToken===s.drafts.get(MISSING)?.token,bothDraftsExact:oldDraft?.operation.change.body===TEXT.original&&replacementDraft?.operation.change.body===TEXT.replacement,pendingReplacementExact:!!s.replacementAttempt&&JSON.stringify(replacement?.commit.pending?.change)===JSON.stringify(s.replacementAttempt),originalEditorPreserved:!!s.initialEditor&&original===s.initialEditor,removedWithoutResurrection:s.scene.id===DELETE&&s.items.length===1&&s.items[0].id===RULES&&s.items[0].lifecycle==='removed'&&s.items[0].body===TEXT.rules&&s.mutations.length===1,newerTextCurrentPageOnly:s.scene.id===DELETE&&original?.local===TEXT.deleted&&original.field.innerText===TEXT.deleted&&original.saved.body===TEXT.rules&&original.conflicted===true&&original.recovery.lastFailure?.token===original.recovery.currentToken&&!s.drafts.has(RULES)}};
}
const click=selector=>({action:'click',selector}),wait=(selector,state='visible')=>({action:'wait',selector,state}),assert=(selector,assertion,value)=>({action:'assert',selector,assertion,value}),check=(path,value)=>({action:'assertRecovery',owner:'contextRecovery',path,value}),settle=command=>({action:'fixtureControl',owner:'contextRecovery',command});
export async function prepareScene(scene,{owners,fixture}){
 if(!ids.has(scene?.id))return null;need(active(scene)&&fixture===state.fixture&&owners?.contextCards&&typeof owners.navigate==='function','PREPARE_IDENTITY');state.owners=owners;
 const card=scene.id===DRAFT?'info':'rules';await owners.navigate('memory',null,null,{contextCard:card});await owners.contextCards.open(card);state.initialEditor=owners.contextCards.editors.get(scene.id===DRAFT?INFO:RULES);
 const original='.context-item[data-item="'+(scene.id===DRAFT?INFO:RULES)+'"]',field=original+' .item-text',actions=[wait(field)],note='.context-detail > .context-notice:not(.context-draft-recovery)',recovery='.context-draft-recovery',retry=recovery+' button';
 if(scene.id===DRAFT){
  const missing='.context-item[data-item="'+MISSING+'"] .item-text';
  actions.push(wait(recovery+'[data-state="failed"]'),check(['counts','draftReads'],1),assert(field,'text',TEXT.info),{action:'doubleClick',selector:retry},wait(recovery+'[data-state="reading"]'),check(['counts','draftReads'],2),click('.context-back'),wait('.context-card[data-card="rules"] .card-head-button'),click('.context-card[data-card="rules"] .card-head-button'),wait('.context-item[data-item="'+RULES+'"] .item-text'),check(['counts','draftReads'],3),settle('release-stale-draft-read'),check(['checks','staleCardPreserved'],true),check(['view','card'],'rules'),wait(missing,'hidden'),click('.context-back'),wait('.context-card[data-card="info"] .card-head-button'),click('.context-card[data-card="info"] .card-head-button'),wait(recovery+'[data-state="failed"]'),check(['counts','draftReads'],4),{action:'fill',selector:field,value:TEXT.current},{action:'press',selector:field,key:'Control+Enter'},wait(original+' .item-feedback.error'),check(['checks','currentDraftExact'],true),{action:'doubleClick',selector:retry},wait(recovery+'[data-state="reading"]'),check(['counts','draftReads'],5),settle('release-current-draft-read'),wait(missing),assert(missing,'text',TEXT.missing),assert(field,'text',TEXT.current),wait(recovery,'hidden'),check(['checks','currentRetryEditorPreserved'],true),check(['checks','missingRestoredExact'],true),check(['checks','currentDraftExact'],true),check(['checks','missingDraftExact'],true),check(['counts','draftReads'],5),check(['counts','draftClears'],0),check(['counts','contentMutations'],0));
  return {handled:true,actions,readySelector:missing,evidence:{owner:'actual ContextCardsPage recoverNew/leave + ContextItemEditor; synthetic read/save refusal only',sourceTests:'context-new-draft-recovery.test.mjs',singleflightScope:'Trusted visible retry double-click yields one admitted read; detached old handler is never invoked directly.',retiredCard:'Held original info read settles only after real navigation to Rules.',contentMutations:0}};
 }
 if(scene.id===CONFLICT){
  const keep=original+' .item-feedback.error button:first-of-type',replacement='.context-item:not([data-item="'+RULES+'"])',replacementField=replacement+' .item-text';
  actions.push({action:'fill',selector:field,value:TEXT.original},{action:'press',selector:field,key:'Control+Enter'},wait(keep),click(keep),wait(replacement+' .item-feedback.error'),check(['checks','pendingReplacementExact'],true),{action:'fill',selector:replacementField,value:TEXT.replacement},{action:'ime',selector:replacementField,value:'中'},check(['view','replacement','composing'],true),assert(replacementField,'text',TEXT.replacement+'中'),{action:'press',selector:replacementField,key:'Control+Enter'},check(['view','replacement','composing'],true),check(['counts','putChanges'],2),check(['checks','pendingReplacementExact'],true),{action:'ime',selector:replacementField,value:''},check(['view','replacement','composing'],false),assert(replacementField,'text',TEXT.replacement),check(['view','replacement','local'],TEXT.replacement),check(['checks','pendingReplacementExact'],true),{action:'press',selector:replacementField,key:'Control+Enter'},wait(replacement+' .item-feedback.error'),check(['checks','bothDraftsExact'],true),click(keep),wait(note+':has-text("两份内容均保留")'),assert(field,'text',TEXT.original),assert(replacementField,'text',TEXT.replacement),check(['checks','bothDraftsExact'],true),check(['checks','pendingReplacementExact'],true),check(['checks','originalEditorPreserved'],true),check(['counts','draftClears'],0),check(['counts','contentMutations'],1),check(['view','editorCount'],2));
  return {handled:true,actions,readySelector:note,evidence:{owner:'actual ContextItemEditor conflict/composing guard and ContextCardsPage keepConflict',sourceTests:'context-conflict-replacement.test.mjs',compositionScope:'Trusted browser CDP composition + Control+Enter guard, then explicit CDP empty-text cancellation with exact local/field assertions before repeated Keep. Not physical OS IME and not a direct active-composition keepConflict invocation.',contentMutations:'one synthetic concurrent canonical change; no successful replacement save'}};
 }
 actions.push(click(original+' .item-menu > summary'),click(original+' .menu-items button.danger'),check(['held'],['release-delete-ack']),check(['counts','deleteChanges'],1),{action:'fill',selector:field,value:TEXT.deleted},check(['view','original','protectionFailed'],true),settle('release-delete-ack'),wait(note+':has-text("新文字仅保留在当前页")'),assert(field,'text',TEXT.deleted),wait(original+' .item-feedback.error button:first-of-type'),check(['checks','newerTextCurrentPageOnly'],true),check(['checks','removedWithoutResurrection'],true),check(['checks','originalEditorPreserved'],true),check(['view','deletePending'],false),check(['view','undoCount'],1),check(['counts','deleteChanges'],1),check(['counts','putChanges'],0),check(['counts','draftClears'],0),check(['bounds','drafts'],0),check(['counts','contentMutations'],1));
 return {handled:true,actions,readySelector:note,evidence:{owner:'actual ContextCardsPage remove + ContextItemEditor live draft/recovery fence',sourceTests:'context-delete-edit-recovery.test.mjs',contentMutations:'exactly one synthetic delete, no put/restore',draftMeaning:'Newer text remains in original page editor only; synthetic recovery save correctly refuses removed Item. No persistent draft success claim.'}};
}

import test from 'node:test';
import assert from 'node:assert/strict';
import {setup} from './harness/thought-m1.mjs';
import {LibraryDocumentsStore} from '../core/library-documents-store.js';
import {ContextCardsService,CONTEXT_CARDS_ROW} from '../core/context-cards.js';
import {BrowserNativeSyncCore} from '../core/browser-native-sync/core.js';
import {ContextDesiredSyncJournal} from '../core/browser-native-sync/context-desired-journal.js';
import {prepareGroupCheckpointPlan} from '../core/browser-native-sync/group-checkpoint-plan.js';
import {prepareGroupScope} from '../core/browser-native-sync/group-checkpoint-scope.js';
import {assertCurrentContextSnapshot as check,hasCurrentContextOperations} from '../core/browser-native-sync/manual-context-current-snapshot.js';
import {protocolPhysicalId} from '../core/browser-native-sync/physical-key.js';
import {KNOWN_PREFIX,DIRTY_PREFIX,deltaDescription} from '../core/ai-usage/delta.js';

// Actual original services over the existing non-native unit repository. This
// tests an unwired assertion component, never native capture or a Scope grant.
async function fixture(){
 const f=await setup(LibraryDocumentsStore);await f.s.finishFoundation();
 const core=new BrowserNativeSyncCore(f.s.repository,{datasetId:'SYNTHETIC_context_component',deviceId:crypto.randomUUID()}),cards=new ContextCardsService(f.s,{syncJournal:new ContextDesiredSyncJournal(core)});
 const ids=[];
 for(const card of ['info','rules','now']){
  const id=crypto.randomUUID();ids.push(id);await cards.change({kind:'put',card,itemId:id,body:'SYNTHETIC exact '+card+' 中文',section:'SYNTHETIC section',expectedRevision:0,epoch:'initial',operationId:crypto.randomUUID()});
 }
 await cards.change({kind:'put',card:'info',itemId:ids[0],body:'SYNTHETIC exact edited Info',section:'SYNTHETIC section',expectedRevision:1,epoch:'initial',operationId:crypto.randomUUID()});
 const deletedBy=crypto.randomUUID();await cards.change({kind:'delete',itemId:ids[1],expectedRevision:1,epoch:'initial',operationId:deletedBy});
 await cards.change({kind:'restore',itemId:ids[1],deletedBy,expectedRevision:2,epoch:'initial',operationId:crypto.randomUUID()});
 await cards.change({kind:'delete',itemId:ids[2],expectedRevision:1,epoch:'initial',operationId:crypto.randomUUID()});
 for(const key of ['info','rules','now','inputs'])await cards.change({kind:'access',key,enabled:true,expectedRevision:0,epoch:'initial',operationId:crypto.randomUUID()});
 const revisions=[];for await(const row of core.rows('revision'))revisions.push(row.operation);
 const plan=await prepareGroupCheckpointPlan(core,revisions),scope=await prepareGroupScope(plan,{store:f.s});
 const meta=await f.s.repository.transaction(false,t=>t.all('meta')),rows=new Map(meta.map(row=>[row.id,row]));
 const namespace=await core.transaction(false,t=>core.bind(t)),raw={namespace,groupMeta:meta,points:{'recovery-restore-epoch':rows.get('recovery-restore-epoch')??null}};
 const key=(kind,...parts)=>protocolPhysicalId(core.prefix,namespace,kind,parts);
 return {...f,core,plan,scope,raw,rows,meta,key,ids};
}
const refuse=(f,code='BNS_GROUP_CANONICAL_UNREPRESENTED')=>assert.throws(()=>check(f.core,f.scope,f.plan,f.raw,f.rows),{code});
test('original three-card history, desired proofs and exact scheduling metadata pass the unwired assertion only',async()=>{
 const f=await fixture(),before=structuredClone(f.meta);assert.equal(hasCurrentContextOperations(f.plan),true);assert.equal(check(f.core,f.scope,f.plan,f.raw,f.rows),undefined);
 assert.equal(f.rows.has(CONTEXT_CARDS_ROW),false);for(const key of ['info','rules','now','inputs'])assert.equal(f.rows.has(f.key('contextDesiredOwner',key)),false);
 assert.deepEqual(await f.s.repository.transaction(false,t=>t.all('meta')),before,'component never writes canonical/protocol storage');
 assert.equal(hasCurrentContextOperations({groups:[{type:'humanLibraryCommit'},{type:'promptPreferences'}]}),false);
});
test('missing or altered genuine Context known and pending descriptors refuse without storage writes',async()=>{
 for(const kind of ['known-missing','known-altered','pending-missing','removed-pending']){
  const f=await fixture(),row=f.rows.get(CONTEXT_CARDS_ROW),item=row.items.find(item=>item.lifecycle===(kind==='removed-pending'?'removed':'active')),descriptor=deltaDescription('context_item',item),known=KNOWN_PREFIX+descriptor.key,pending=DIRTY_PREFIX+descriptor.key;
  if(kind==='known-missing')f.rows.delete(known);
  else if(kind==='known-altered')f.rows.set(known,{...f.rows.get(known),descriptor:{...descriptor,revision:100}});
  else if(kind==='pending-missing')f.rows.delete(pending);
  else f.rows.set(pending,{...f.rows.get(known),id:pending,requirements:[],pendingFacets:['topic','context']});
  refuse(f,['known-altered','pending-missing'].includes(kind)?'BNS_GROUP_COMMIT_UNPROVEN':'BNS_GROUP_CANONICAL_UNREPRESENTED');assert.deepEqual(await f.s.repository.transaction(false,t=>t.all('meta')),f.meta);
 }
});
test('desired owner proof head, value and epoch cannot be substituted',async()=>{
 for(const mutate of [p=>({...p,epoch:'SYNTHETIC_wrong_epoch'}),p=>({...p,heads:['0'.repeat(64)]}),p=>({...p,value:{...p.value,enabled:false}}),()=>null]){
  const f=await fixture(),id=f.key('contextDesiredOwner','info'),replacement=mutate(f.rows.get(id));if(replacement)f.rows.set(id,replacement);else f.rows.delete(id);refuse(f,'BNS_GROUP_COMMIT_UNPROVEN');
 }
 const missing=await fixture();missing.raw.groupMeta=missing.raw.groupMeta.filter(row=>row.id!==missing.key('ownerRecoveryEpoch'));refuse(missing,'BNS_RESTORE_EPOCH_CHANGED');
});
test('optional manual anchors must form an exact valid original operation and epoch pair',async()=>{
 const f=await fixture(),head=f.plan.heads.find(head=>head.type==='contextItem'),ops=f.plan.groups.flatMap(group=>group.operations),anchor=ops.find(op=>op.type==='contextItem'&&op.parents.length===0),proof=f.key('materializedOwner',head.type,head.entityId),validation=f.key('contextValidation',head.type,head.entityId);
 f.rows.set(proof,{id:proof,version:1,revisionId:anchor.revisionId,ownerRevision:anchor.value.revision});f.rows.set(validation,{id:validation,version:1,epoch:null,revisionId:anchor.revisionId});assert.doesNotThrow(()=>check(f.core,f.scope,f.plan,f.raw,f.rows));
 const missing=await fixture(),missingHead=missing.plan.heads.find(head=>head.type==='contextItem');missing.rows.set(missing.key('contextValidation',missingHead.type,missingHead.entityId),{version:1,epoch:null,revisionId:missingHead.revisions[0]});refuse(missing,'BNS_OWNER_PROOF_INVALID');
});
test('nonrepresented physical text, nondefault desired and global effective access refuse',async()=>{
 for(const mutate of [v=>v.items[0].body='SYNTHETIC unrepresented',v=>v.items[0].origin='automatic',v=>v.access.global.enabled=true,v=>v.access.inputs.revision++]){
  const f=await fixture(),row=structuredClone(f.rows.get(CONTEXT_CARDS_ROW));mutate(row);f.rows.set(CONTEXT_CARDS_ROW,row);refuse(f);
 }
});
test('component transition checks reject altered full history without claiming authentication of DTOs',async()=>{
 for(const kind of ['immutable','missing-parent','removed-body']){
  const f=await fixture(),plan=structuredClone(f.plan),ops=plan.groups.flatMap(group=>group.operations);
  if(kind==='immutable')ops.find(op=>op.type==='contextItem'&&op.parents.length).value.createdAt='SYNTHETIC_changed';
  else if(kind==='missing-parent')ops.find(op=>op.type==='contextItem'&&op.parents.length).parents=['0'.repeat(64)];
  else ops.find(op=>op.type==='contextNowItem'&&op.value.lifecycle==='removed').value.body='SYNTHETIC_changed';
  assert.throws(()=>check(f.core,f.scope,plan,f.raw,f.rows),{code:kind==='missing-parent'?'BNS_GROUP_CAUSAL_GAP':'BNS_CONTEXT_TRANSITION_INVALID'});
 }
});

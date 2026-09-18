import test from 'node:test';
import assert from 'node:assert/strict';
import {completeFixture,rows} from './harness/original-complete.mjs';
import {exported,prepared} from './harness/backup-v081.mjs';
import {BackupService} from '../core/backup-service.js';
import {validateBackupItem} from '../core/backup-format.js';
import {buildOpenExport} from '../core/open-export.js';
import {ImportLedger} from '../core/import/ledger.js';
import {ImportCoordinator} from '../core/import/coordinator.js';
import {getOfficialExportAdapter} from '../core/import/registry.js';
import {SourceStructureStore} from '../core/source-structure-store.js';
import {sourceStructureMetaAllowed,validateSourceStructureBackupGraph} from '../core/source-structure-backup.js';

const at=n=>new Date(Date.UTC(2026,8,18,18,n,0)).toISOString();
const evidence=(id,n)=>({id,contractId:'ans-backup-test',contractVersion:1,channel:'synthetic',scope:'conversation',originClass:'fixture',requestGeneration:n,evidenceKind:'relationship',digest:n.toString(16).padStart(64,'0')});
const claudeConversation=()=>({uuid:'claude-backup-conversation',name:'Shared Project',current_leaf_message_uuid:'claude-backup-assistant',chat_messages:[
 {uuid:'claude-backup-human',sender:'human',created_at:'2026-01-02T03:04:05.000Z',parent_message_uuid:null,content:[{type:'text',text:'Claude mixed-provider private source'}]},
 {uuid:'claude-backup-assistant',sender:'assistant',created_at:'2026-01-02T03:04:06.000Z',parent_message_uuid:'claude-backup-human',content:[{type:'text',text:'ignored'}]}
]});
async function importClaude(store){
 const ledger=new ImportLedger(store),transport=(method,q)=>ledger[method](q,'ans02-backup-test'),coordinator=new ImportCoordinator({transport,resolveAdapter:getOfficialExportAdapter});
 await coordinator.select(new Blob([JSON.stringify([claudeConversation()])]),{consent:true});await coordinator.preflight();return coordinator.commit();
}
async function addRelationship(structure,conv,providerKey,namespace,projectId,name,n){
 const ref={providerKey,namespace,projectId};await structure.observeConversation({conversationRef:conv,expectedRevision:0,observedAt:at(n),evidence:evidence('rel-'+n,n),membership:{state:'project',projectRef:ref},projectName:name,sourceStatus:'observed_active'});
 await structure.observeProject({projectRef:ref,witnessConversationRef:conv,expectedRevision:0,observedAt:at(n+1),evidence:evidence('project-'+n,n+1),currentName:name,sourceStatus:'observed_active'});return ref;
}

test('ANS-02 formal Backup round-trips durable relationship history across ChatGPT + Claude without restoring ephemeral order/UI state',async()=>{
 const source=await completeFixture({texts:['ChatGPT mixed-provider private source']}),importResult=await importClaude(source.s);assert.ok(['completed','partial'].includes(importResult.phase));
 const snapshot=await source.s.snapshot(),structure=new SourceStructureStore(source.s),chatDoc=snapshot.conversations.find(d=>d.platform==='chatgpt'),claudeDoc=snapshot.conversations.find(d=>d.platform==='claude');
 assert.ok(chatDoc&&claudeDoc);
 const chatConv={platform:'chatgpt',sourceConversationId:chatDoc.sourceConversationId},claudeConv={platform:'claude',sourceConversationId:claudeDoc.sourceConversationId};
 await addRelationship(structure,chatConv,'chatgpt','account-main','same-project-id','Shared Project',10);
 await addRelationship(structure,claudeConv,'claude','account-main','same-project-id','Shared Project',20);
 await source.s.write(async t=>{await t.put('meta',{id:'ans:ui:v1',selected:'private-ui-state'});await t.put('meta',{id:'ans:order:v1:synthetic',rank:123});});
 const service=new BackupService(source.s,{appVersion:'0.12.0'}),items=await exported(service),serialized=JSON.stringify(items);
 assert.match(serialized,/"platform":"claude"/);assert.doesNotMatch(serialized,/private-ui-state|ans:order:v1:synthetic/);
 const ansItems=items.filter(x=>x.section==='organizationState'&&sourceStructureMetaAllowed(x.value.id));assert.ok(ansItems.length>=8);
 const open=buildOpenExport(items);assert.ok(open.records.some(r=>r.role==='source_relationship'));assert.ok(open.records.some(r=>r.role==='source_relationship_history'));
 assert.doesNotMatch(JSON.stringify(open.records.filter(r=>r.role==='input_working_copy')),/Shared Project/);
 const target=await completeFixture({texts:[]});await target.s.write(async t=>{await t.put('meta',{id:'ans:ui:v1',selected:'must-clear'});await t.put('meta',{id:'ans:index:v1:stale',title:'must-clear'});});
 const recovery=new BackupService(target.s,{appVersion:'0.12.0'}),stage=await prepared(recovery,items);assert.equal(stage.preview.canRestore,true);
 await recovery.restore({sessionId:stage.sessionId,confirmation:stage.preview.integrity});
 const restored=new SourceStructureStore(target.s),restoredChat=await restored.conversation(chatConv),restoredClaude=await restored.conversation(claudeConv);assert.ok(restoredChat&&restoredClaude);
 const originalHistory=await structure.history({kind:'conversation',conversationRef:chatConv}),restoredHistory=await restored.history({kind:'conversation',conversationRef:chatConv});
 assert.equal(restoredHistory.items[0].observedAt,originalHistory.items[0].observedAt);assert.equal(restoredHistory.items[0].evidence.channel,'restored');assert.equal(restoredHistory.items[0].evidence.restored,true);assert.equal(restoredHistory.items[0].evidence.restoredFromChannel,'synthetic');
 const rawDocs=await rows(target.s,'documents'),rawClaude=rawDocs.find(d=>d.value.platform==='claude');assert.equal(rawClaude.chatKey,'claude:'+claudeDoc.sourceConversationId);
 assert.deepEqual((await target.s.snapshot()).records.map(r=>[r.id,r.platform,r.sourceKey]).sort(),snapshot.records.map(r=>[r.id,r.platform,r.sourceKey]).sort());
 const restoredImports=await rows(target.s,'importSources');assert.ok(restoredImports.some(r=>r.profileId==='claude-conversations-v1'));assert.doesNotMatch(JSON.stringify(restoredImports),/"realExportVerified":true/);
 const targetMeta=await rows(target.s,'meta');assert.equal(targetMeta.some(r=>r.id==='ans:ui:v1'||r.id==='ans:index:v1:stale'),false);
});

test('ANS-02 Backup rejects unknown ANS metadata versions and broken relationship/reference graphs',async()=>{
 const v2='ans:conversation:v2:'+'a'.repeat(64);
 assert.throws(()=>validateBackupItem({type:'item',section:'organizationState',value:{id:v2,data:{id:v2}}}),error=>error.code==='BACKUP_VERSION_UNSUPPORTED');
 const source=await completeFixture({texts:['graph integrity source']}),snapshot=await source.s.snapshot(),structure=new SourceStructureStore(source.s),conv={platform:'chatgpt',sourceConversationId:snapshot.conversations[0].sourceConversationId};
 await addRelationship(structure,conv,'chatgpt','account-main','graph-project','Graph Project',30);
 const items=await exported(new BackupService(source.s,{appVersion:'0.12.0'})),ansRows=items.filter(x=>x.section==='organizationState'&&sourceStructureMetaAllowed(x.value.id)).map(x=>structuredClone(x.value.data)),docs=items.filter(x=>x.section==='inputDocuments').map(x=>x.value);
 assert.equal(await validateSourceStructureBackupGraph(ansRows,{documents:docs}),true);
 const broken=structuredClone(ansRows),conversation=broken.find(x=>x.kind==='conversation');conversation.conversationRef.sourceConversationId='different-conversation';
 await assert.rejects(()=>validateSourceStructureBackupGraph(broken,{documents:docs}));
});

test('ANS-02 restore failure during ANS metadata commit rolls back Source, Input and relationship rows atomically',async()=>{
 const source=await completeFixture({texts:['atomic backup source']}),snapshot=await source.s.snapshot(),structure=new SourceStructureStore(source.s),conv={platform:'chatgpt',sourceConversationId:snapshot.conversations[0].sourceConversationId};
 await addRelationship(structure,conv,'chatgpt','account-main','atomic-backup-project','Atomic Backup Project',40);
 const items=await exported(new BackupService(source.s,{appVersion:'0.12.0'})),target=await completeFixture({texts:[]}),service=new BackupService(target.s,{appVersion:'0.12.0'}),stage=await prepared(service,items);
 const transaction=target.s.repository.transaction.bind(target.s.repository);target.s.repository.transaction=(write,fn,stores)=>transaction(write,async t=>{if(write){const put=t.put.bind(t);let ansWrites=0;t.put=(name,row,key)=>{if(name==='meta'&&sourceStructureMetaAllowed(row?.id)&&++ansWrites===2)throw {code:'STORAGE_FAILED'};return put(name,row,key);};}return fn(t);},stores);
 await assert.rejects(()=>service.restore({sessionId:stage.sessionId,confirmation:stage.preview.integrity}));
 assert.equal((await rows(target.s,'records')).length,0);assert.equal((await rows(target.s,'blocks')).length,0);assert.equal((await rows(target.s,'meta')).some(r=>sourceStructureMetaAllowed(r.id)),false);
});


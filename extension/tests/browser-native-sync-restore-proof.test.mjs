import test from 'node:test';
import assert from 'node:assert/strict';
import {setup} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {BrowserNativeSyncCore,sealOperation} from '../core/browser-native-sync/core.js';
import {materializePrompt,PromptSyncJournal} from '../core/browser-native-sync/prompt-journal.js';
import {buildCheckpoint,StagedSyncRestore} from '../core/browser-native-sync/checkpoints.js';
import {restorePromptPreferences} from '../core/browser-native-sync/prompt-journal.js';
import {PromptReuseService} from '../core/prompt-reuse-service.js';
import {PROMPT_REUSE_ROW,readPromptPreferences} from '../core/prompt-reuse-preferences.js';
const datasetId='synthetic_conflict',manualId='manual:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const value=text=>({id:PROMPT_REUSE_ROW,version:1,pins:[],overrides:[{id:manualId,text,hidden:false}],splits:[]});
async function operation(deviceId,sequence,text,parents=[]){return sealOperation({protocol:1,datasetId,deviceId,sequence,operationId:crypto.randomUUID(),type:'promptPreferences',entityId:PROMPT_REUSE_ROW,codecVersion:1,kind:'put',actor:'user',parents,value:value(text)});}
async function scenario(bound=false){
 const f=await setup(OrganizerStore);await f.s.finishFoundation();
 const core=new BrowserNativeSyncCore(f.s.repository,{datasetId,deviceId:'synthetic_local',materialize:materializePrompt}),service=new PromptReuseService(f.s,{syncJournal:new PromptSyncJournal(core)});
 let a=await operation('synthetic_A',1,'SYNTHETIC A');await core.receive(a);
 if(bound){await service.change({action:'edit',id:manualId,revision:1,text:'SYNTHETIC A'});const head=await core.read('head','promptPreferences',PROMPT_REUSE_ROW);a=(await core.read('revision',head.revisions[0])).operation;}
 const b=await operation('synthetic_B',1,'SYNTHETIC B'),c=await operation('synthetic_C',1,'SYNTHETIC C',[a.revisionId]),resolution=await operation('synthetic_resolver',1,'SYNTHETIC resolved',[b.revisionId,c.revisionId]);
 assert.equal((await core.receive(b)).state,'conflict');assert.equal((await core.receive(c)).state,'conflict');return {...f,core,service,a,b,c,resolution};
}
const prefs=f=>f.s.repository.transaction(false,readPromptPreferences),meta=f=>f.s.repository.transaction(false,t=>t.all('meta'));

import {BackupService} from '../core/backup-service.js';
import {BACKUP_VERSION,BACKUP_SCHEMA,BACKUP_SECTIONS,backupHash} from '../core/backup-format.js';
const readPrefs=prefs;
async function replaceBackup(f,{different=false}={}){
 const prefs=structuredClone(await readPrefs(f));if(different&&prefs.overrides[0])prefs.overrides[0].text='SYNTHETIC different restored Prompt';
 const header={type:'header',format:'PAIA Backup',formatVersion:BACKUP_VERSION,appVersion:'0.23.0',createdAt:new Date().toISOString(),schemaVersion:BACKUP_SCHEMA,contentSections:Object.keys(BACKUP_SECTIONS),privacy:{localOnly:true,credentialsIncluded:false,sourceDeletionFences:true}},item={type:'item',section:'organizationState',value:{id:prefs.id,data:prefs}},counts=Object.fromEntries(Object.keys(BACKUP_SECTIONS).map(k=>[k,k==='organizationState'?1:0])),hash=await backupHash(await backupHash('',header),item),footer={type:'footer',itemCount:1,sectionCounts:counts,integrity:{algorithm:'SHA-256-chain',root:hash}};
 const service=new BackupService(f.s),{sessionId}=await service.beginRestore();await service.stageRestore({sessionId,items:[header,item,footer]});const preview=await service.previewRestore({sessionId,mode:'replace'});assert.equal(preview.canRestore,true);await service.restore({sessionId,confirmation:preview.integrity,mode:'replace',targetGeneration:preview.targetGeneration,confirmReplace:true});
}


for(const bound of [false,true])for(const reuse of [false,true])test('actual same-value backup restore refuses old ancestor proof bound '+bound+' with reuse '+reuse,async()=>{const f=await scenario(bound);const proof=await f.core.read('materializedOwner','promptPreferences',PROMPT_REUSE_ROW);await replaceBackup(f);await f.s.finishFoundation();const original=await prefs(f);if(reuse){await f.service.noteVerifiedReuse(manualId);assert.equal((await prefs(f)).overrides[0].reuseCount,original.overrides[0].reuseCount+1);}assert.deepEqual(await f.core.read('materializedOwner','promptPreferences',PROMPT_REUSE_ROW),proof);const before=await meta(f);await assert.rejects(f.core.receive(f.resolution),e=>e.code===(bound?'BNS_RESTORE_EPOCH_CHANGED':'BNS_RESTORE_EPOCH_UNBOUND'));assert.deepEqual(await meta(f),before);});
for(const bound of [false,true])for(const reuse of [false,true])test('actual staged ancestor restore cannot inherit a backup-invalidated live proof bound '+bound+' with reuse '+reuse,async()=>{const f=await scenario(bound);await replaceBackup(f);await f.s.finishFoundation();if(reuse)await f.service.noteVerifiedReuse(manualId);const g=await setup(OrganizerStore);await g.s.finishFoundation();const remote=new BrowserNativeSyncCore(g.s.repository,{datasetId,deviceId:'synthetic_stage'});const revisions=[];for await(const row of f.core.rows('revision'))revisions.push(row.operation);await remote.receiveBatch([...revisions,f.resolution]);const objects=new Map(),transport={async putImmutable(ref,bytes){objects.set(ref.id,bytes.slice());},async get(ref){return objects.get(ref.id).slice();}},cp=await buildCheckpoint(remote,transport),restore=new StagedSyncRestore(f.core,{owners:{promptPreferences:restorePromptPreferences}});await restore.stageCheckpoint(cp.ref,r=>transport.get(r));const before=await meta(f),namespace=await f.core.namespace();await assert.rejects(restore.activate(),e=>e.code===(bound?'BNS_RESTORE_EPOCH_CHANGED':'BNS_RESTORE_EPOCH_UNBOUND'));assert.equal(await f.core.namespace(),namespace);assert.deepEqual(await meta(f),before);});

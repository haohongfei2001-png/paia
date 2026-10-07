import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,local} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {ContextCardsService,CONTEXT_CARDS_ROW} from '../core/context-cards.js';
import {BackupService} from '../core/backup-service.js';
import {BackupService as ExistingFileFixture} from './harness/historical-backup.mjs';
import {exported,prepared} from './harness/backup-v081.mjs';
import {BACKUP_SECTIONS,backupHash,projectBackupEntity,validateBackupItem} from '../core/backup-format.js';
import {hashText} from '../core/dedupe.js';

const op=()=>crypto.randomUUID();
const put=()=>({kind:'put',operationId:op(),epoch:'initial',itemId:op(),expectedRevision:0,body:'SYNTHETIC independent manual Context',section:'SYNTHETIC section'});
const raw=(s,name,id)=>s.repository.transaction(false,t=>t.get(name,id));
const protectedNames=['records','recordIndex','blocks','blockIndex','documents','libraryDocuments','thoughts','topics','sections','placements','inputStates','tombstones','revisions','provenance','dependencies','meta','operationReceipts'];
const snapshot=s=>s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all(protectedNames.map(async name=>[name,await t.all(name)]))));
async function fixture(){const f=await setup(OrganizerStore);await f.s.finishFoundation();return {...f,c:new ContextCardsService(f.s)};}
async function fileWithReceipt(base,receipt){
 const rows=[...base.slice(0,-1),{type:'item',section:'receipts',value:receipt}],counts=Object.fromEntries(Object.keys(BACKUP_SECTIONS).map(key=>[key,0]));let digest='';
 for(const row of rows){digest=await backupHash(digest,row);if(row.type==='item')counts[row.section]++;}
 return [...rows,{type:'footer',itemCount:rows.length-1,sectionCounts:counts,integrity:{algorithm:'SHA-256-chain',root:digest}}];
}

for(const variant of ['genuine','namespace_only','prefix_only','prefix_other_namespace'])for(const mode of ['replace','merge'])test('CTX4 local '+variant+' receipt refuses actual '+mode+' file staging without effects',async()=>{
 const {s,c}=await fixture(),baseline=await exported(new ExistingFileFixture(s)),request=put();
 const result=await c.change(request),stored=await raw(s,'operationReceipts','context:'+request.operationId),receipt=projectBackupEntity('receipts',stored);
 assert.equal(Object.hasOwn(stored,'epoch'),true);assert.equal(Object.hasOwn(receipt,'epoch'),false);
 if(variant==='namespace_only')receipt.id=op();
 if(variant==='prefix_only')delete receipt.namespace;
 if(variant==='prefix_other_namespace')receipt.namespace='thought-library';
 const item={type:'item',section:'receipts',value:receipt};
 assert.throws(()=>validateBackupItem(item),{code:'BACKUP_INVALID'});
 await assert.rejects(s.repository.transaction(false,t=>new ExistingFileFixture(s).project(t,'receipts',stored)),{code:'BACKUP_INVALID'});
 const file=await fileWithReceipt(baseline,receipt),before=await snapshot(s),backup=new BackupService(s),{sessionId}=await backup.beginRestore();
 await assert.rejects(async()=>{for(let n=0;n<file.length;n+=30)await backup.stageRestore({sessionId,items:file.slice(n,n+30)});},{code:'BACKUP_INVALID'});
 await assert.rejects(backup.previewRestore({sessionId,mode}),{code:'BACKUP_SESSION_EXPIRED'});
 await assert.rejects(backup.restore({sessionId,mode,confirmation:file.at(-1).integrity.root,targetGeneration:(await raw(s,'meta','backup-data-generation')).value,confirmReplace:true,confirmMerge:true}),{code:'BACKUP_SESSION_EXPIRED'});
 assert.deepEqual(await snapshot(s),before);
 assert.deepEqual(await c.change(request),result,'valid local exact replay remains available');
 assert.deepEqual(await c.outcome({operationId:request.operationId,epoch:request.epoch,digest:await hashText(JSON.stringify(request))}),{state:'committed',result});
 await assert.rejects(new BackupService(s).beginExport(),{code:'FEATURE_UNAVAILABLE'});
});

for(const variant of ['absent','old_epoch','null','number','object'])test('CTX4 already-resident '+variant+' receipt cannot acknowledge a current manual edit',async()=>{
 const {s,c}=await fixture(),initial=put();await c.change(initial);
 const request={...initial,operationId:op(),expectedRevision:1,body:'SYNTHETIC pending manual edit'},digest=await hashText(JSON.stringify(request));
 const receipt={id:'context:'+request.operationId,namespace:'context-cards',schemaVersion:1,ownerId:request.itemId,createdAt:s.clock(),digest,result:{ok:true,itemId:request.itemId,revision:2,lifecycle:'active',deletedBy:null}};
 if(variant!=='absent')receipt.epoch={old_epoch:'old-restore',null:null,number:1,object:{value:'initial'}}[variant];
 await s.repository.transaction(true,t=>t.put('operationReceipts',receipt));const before=await snapshot(s);
 await assert.rejects(c.change(request),{code:'INVALID_REQUEST'});
 assert.deepEqual(await c.outcome({operationId:request.operationId,epoch:'initial',digest}),{state:'unknown'});
 assert.deepEqual(await snapshot(s),before,'receipt refusal never replaces either saved work or the resident receipt');
 assert.equal((await raw(s,'meta',CONTEXT_CARDS_ROW)).items[0].body,initial.body);
});

test('CTX4 genuine local create/edit/delete/restore/access receipts preserve exact replay and digest identity',async()=>{
 const {s,c}=await fixture(),initial=put(),requests=[initial,{...initial,operationId:op(),expectedRevision:1,body:'SYNTHETIC human-edited body'}];
 const deletion={kind:'delete',operationId:op(),epoch:'initial',itemId:initial.itemId,expectedRevision:2};
 requests.push(deletion,{kind:'restore',operationId:op(),epoch:'initial',itemId:initial.itemId,expectedRevision:3,deletedBy:deletion.operationId},{kind:'access',operationId:op(),epoch:'initial',key:'global',enabled:true,expectedRevision:0});
 for(const request of requests){
  const result=await c.change(request),before=await snapshot(s),digest=await hashText(JSON.stringify(request));
  assert.deepEqual(await c.change(structuredClone(request)),result);
  assert.deepEqual(await c.outcome({operationId:request.operationId,epoch:'initial',digest}),{state:'committed',result});
  assert.equal((await raw(s,'operationReceipts','context:'+request.operationId)).digest,digest);
  assert.deepEqual(await snapshot(s),before);
 }
 await assert.rejects(c.change({...initial,card:'info'}),{code:'INVALID_REQUEST'},'omitted Info and explicit Info request bytes never share one digest');
});

test('CTX4 non-Context portable receipts retain the existing real disjoint merge behavior',async()=>{
 const {s,indexedDB}=await fixture(),source=new OrganizerStore(local(),{indexedDB,name:'synthetic-ordinary-receipt-source'});
 await source.consent(true);await source.finishFoundation();
 // Model a disjoint synthetic branch of the same identity namespace. The
 // ordinary Backup owner must still reject unrelated suppression namespaces.
 const identity=await raw(s,'meta','thought-suppression-key');await source.foundationWrite(t=>t.put('meta',identity));
 const created=await source.createTopic({operationId:op(),name:'SYNTHETIC independent portable Topic'});
 const file=await exported(new ExistingFileFixture(source)),portable=file.filter(x=>x.section==='receipts');assert.ok(portable.length);
 assert.ok(portable.every(x=>!x.value.id.startsWith('context:')&&x.value.namespace!=='context-cards'));
 const backup=new BackupService(s),stage=await prepared(backup,file),preview=await backup.previewRestore({sessionId:stage.sessionId,mode:'merge'});assert.equal(preview.canRestore,true,preview.reason);
 await backup.restore({sessionId:stage.sessionId,confirmation:preview.integrity,mode:'merge',targetGeneration:preview.targetGeneration,confirmMerge:true});
 assert.equal((await raw(s,'topics',created.id)).name,'SYNTHETIC independent portable Topic');
 for(const item of portable)assert.deepEqual(await raw(s,'operationReceipts',item.value.id),item.value);
});

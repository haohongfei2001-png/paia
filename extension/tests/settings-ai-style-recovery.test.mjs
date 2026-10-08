import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {OrganizerStore} from '../core/organizer/store.js';
import {BackupService} from '../core/backup-service.js';
import {BackupService as HistoricalEncoder} from './harness/historical-backup.mjs';
import {completeFixture} from './harness/original-complete.mjs';
import {STORAGE_KEY} from '../core/constants.js';
const change=(value,revision,epoch='initial')=>({type:'UPDATE_PREFERENCES',changes:{aiOrganizeStyle:{version:1,value,expectedRevision:revision,expectedEpoch:epoch}}});
let imports=0;
async function worker({pending=false,failure=null}={}){
 const id='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',origin=`chrome-extension://${id}/`,ui={id,url:origin+'ui/archive.html'},values={},events=[];let listener,fail=null;
 const storage={setAccessLevel:async()=>{},get:async keys=>keys===null?structuredClone(values):Object.fromEntries((Array.isArray(keys)?keys:[keys]).filter(k=>k in values).map(k=>[k,structuredClone(values[k])])),set:async rows=>{const restoring=rows[STORAGE_KEY]?.preferences.aiOrganizeStyle?.value==='concise';if(restoring&&fail==='before')throw Error('restore publish failed');Object.assign(values,structuredClone(rows));if(restoring&&fail==='after')throw Error('restore acknowledgement lost');},remove:async keys=>{for(const key of Array.isArray(keys)?keys:[keys])delete values[key];},getBytesInUse:async()=>0};
 globalThis.indexedDB=new IDBFactory();globalThis.IDBKeyRange=IDBKeyRange;
 const seed=new OrganizerStore(storage);await seed.consent(true);await seed.finishFoundation();await seed.updatePreferences(change('original',0).changes);
 if(pending){const preferences=structuredClone(values[STORAGE_KEY].preferences);preferences.aiOrganizeStyle={version:1,value:'concise',revision:7,explicit:true};await seed.run(()=>seed.repository.transaction(true,async t=>{await t.put('meta',{id:'backup-recovery-settings',value:{id:'preferences',preferences}});await t.put('meta',{id:'recovery-restore-epoch',value:'startup-restore'});},['meta']));}
 fail=failure;globalThis.chrome={runtime:{id,getManifest:()=>({version:'0.15.0'}),getURL:path=>origin+path,sendMessage:async message=>events.push(message),onMessage:{addListener:fn=>listener=fn}},storage:{local:storage,session:{...storage,get:async()=>({}),set:async()=>{}}}};globalThis.fetch=async()=>assert.fail('no network');
 await import(`../background/service-worker.js?styleRecovery=${++imports}`);
 const send=request=>new Promise(resolve=>listener(request,ui,resolve));return {send,read:()=>send({type:'PAIA_SETTINGS_AI_STYLE'}),seed,values,events,setFailure:value=>fail=value};
}
test('style reads and writes wait for startup recovery instead of acknowledging an overwritten choice',async()=>{
 const w=await worker({pending:true});const [initial,stale]=await Promise.all([w.read(),w.send(change('balanced',1))]);
 assert.deepEqual(initial.data,{available:true,value:'concise',revision:7,explicit:true,epoch:'startup-restore'});assert.deepEqual(stale,{ok:true,data:{conflict:true}});assert.equal(w.events.some(e=>e.type==='PAIA_SETTINGS_AI_STYLE_CHANGED'),false);
 assert.deepEqual((await w.send(change('balanced',7,initial.data.epoch))).data,{ok:true,changed:true});await w.send({type:'GET_BOUNDED_ORGANIZER'});assert.equal((await w.read()).data.value,'balanced');assert.equal((await w.read()).data.revision,8);
});
for(const failure of ['before','after'])test(`failed startup recovery (${failure} publish) leaves style inaccessible and never acknowledges another choice`,async()=>{
 const w=await worker({pending:true,failure});assert.equal((await w.read()).error,'STORAGE_FAILED');assert.equal((await w.send(change('balanced',1))).error,'STORAGE_FAILED');
 assert.ok(await w.seed.run(()=>w.seed.repository.transaction(false,t=>t.get('meta','backup-recovery-settings'),['meta'])));assert.equal(w.events.some(e=>e.type==='PAIA_SETTINGS_AI_STYLE_CHANGED'),false);assert.equal(w.values[STORAGE_KEY].preferences.aiOrganizeStyle.value,failure==='before'?'original':'concise');
});
async function backupItems(){const source=await completeFixture({texts:[]});await source.s.updatePreferences(change('concise',0).changes);const encoder=new HistoricalEncoder(source.s,{appVersion:'0.15.0'}),start=await encoder.beginExport(),items=[start.header];for(let sequence=0;;sequence++){const page=await encoder.exportPage({sessionId:start.sessionId,sequence});items.push(...page.items);if(page.done)break;}return items;}
for(const failure of [null,'before','after'])test(`completed startup followed by ${failure||'successful'} restore fences prior style revision and pending recovery`,async()=>{
 const items=await backupItems(),w=await worker();await w.send({type:'GET_BOUNDED_ORGANIZER'});const prior=(await w.read()).data;
 const sessionId=(await w.send({type:'PAIA_BACKUP_BEGIN_RESTORE'})).data.sessionId;for(let i=0;i<items.length;i+=30)assert.equal((await w.send({type:'PAIA_BACKUP_STAGE',options:{sessionId,items:items.slice(i,i+30)}})).ok,true);
 const preview=(await w.send({type:'PAIA_BACKUP_PREVIEW',options:{sessionId}})).data;assert.equal(preview.canRestore,true);w.setFailure(failure);
 const restored=await w.send({type:'PAIA_BACKUP_RESTORE',options:{sessionId,confirmation:preview.integrity}});w.setFailure(null);
 if(failure){assert.equal(restored.error,'STORAGE_FAILED');assert.equal((await w.read()).error,'BACKUP_BUSY');assert.equal((await w.send(change('balanced',prior.revision,prior.epoch))).error,'BACKUP_BUSY');assert.equal(w.events.some(e=>e.type==='PAIA_SETTINGS_AI_STYLE_CHANGED'),false);await new BackupService(w.seed,{appVersion:'0.15.0'}).recoverSettings();}else assert.equal(restored.data.restored,true);
 const current=(await w.read()).data;assert.equal(current.value,'concise');assert.equal(current.revision,prior.revision,'portable revision collides intentionally');assert.notEqual(current.epoch,prior.epoch,'existing restore generation fences the stale window');
 assert.deepEqual((await w.send(change('balanced',prior.revision,prior.epoch))).data,{conflict:true});assert.equal(w.events.some(e=>e.type==='PAIA_SETTINGS_AI_STYLE_CHANGED'),false);
 assert.deepEqual((await w.send(change('balanced',current.revision,current.epoch))).data,{ok:true,changed:true});assert.equal((await w.read()).data.value,'balanced');
});

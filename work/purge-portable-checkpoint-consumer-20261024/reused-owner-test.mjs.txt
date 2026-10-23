import test from 'node:test';
import assert from 'node:assert/strict';
import {openConfiguredSyncWorker} from './harness/sync-configured-worker.mjs';
import {fakeGoogleCheckpointHTTP,fakeOneDriveCheckpointHTTP} from './harness/checkpoint-publication-http.mjs';
import {digest} from '../core/browser-native-sync/value.js';
import {STORAGE_KEY} from '../core/constants.js';
import {PROMPT_REUSE_ROW} from '../core/prompt-reuse-preferences.js';
import {PROMPT_CORRECTION_BINDING_ROW} from '../core/browser-native-sync/prompt-correction-binding.js';
const google={subject:'SYNTHETIC_google_subject',clientId:'000000000000-synthetic.apps.googleusercontent.com',generation:'SYNTHETIC_generation',scopes:['https://www.googleapis.com/auth/drive.appdata']};
const onedrive={subject:'SYNTHETIC_subject',tenantId:'9188040d-6c67-4c5b-b112-36a304b66dad',clientId:'00000000-0000-0000-0000-000000000001',generation:'SYNTHETIC_generation',scopes:['Files.ReadWrite.AppFolder']};
const display={language:'en',appearance:'dark',fontSize:'large',readingWidth:'wide',timeDisplay:'date_only',timeEmphasis:'standard'};
const raw=f=>f.bridge.store.repository.transaction(false,async t=>Object.fromEntries(await Promise.all(f.bridge.store.repository.stores.map(async name=>[name,await t.all(name)]))));
async function setup(t,kind='google'){
 const binding=kind==='google'?google:onedrive,cloud=(kind==='google'?fakeGoogleCheckpointHTTP:fakeOneDriveCheckpointHTTP)(binding),f=await openConfiguredSyncWorker({provider:kind==='google'?'google-drive':'onedrive',binding,cloud,deviceId:'SYNTHETIC_portable_purge'});t.after(()=>f.close());
 assert.equal((await f.rpc('UPDATE_PREFERENCES',{changes:display})).ok,true);assert.equal((await f.rpc('FILTER_MODE',{mode:'off'})).ok,true);
 const prompt=await f.promptChange({action:'create',revision:(await f.query()).revision,text:'SYNTHETIC retained manual Prompt'});assert.equal((await f.ui('RESUME')).ok,true);await f.capture();
 // Subsequent original owner changes retain actual historical heads, not just
 // an initial static checkpoint with one immutable setting.
 assert.equal((await f.rpc('UPDATE_PREFERENCES',{changes:{appearance:'light'}})).ok,true);await f.promptChange({action:'edit',id:prompt.id,revision:(await f.query()).revision,text:'SYNTHETIC later retained manual Prompt'});
 return {...f,cloud,options:{provider:kind==='google'?'google-drive':'onedrive',binding,cloud,deviceId:'SYNTHETIC_portable_purge',storage:f.storage,factory:f.factory},core:f.bridge.prompt.syncJournal.core};
}
const portable=r=>r.meta.filter(x=>x.id.startsWith('consumer-preference-owner:')||x.id===PROMPT_REUSE_ROW||x.id===PROMPT_CORRECTION_BINDING_ROW||x.operation&&['consumerPreference','promptPreferences','promptBinding'].includes(x.operation.type)||x.type&&['consumerPreference','promptPreferences','promptBinding'].includes(x.type)||x.id.includes(':materializedOwner:'));
for(const kind of ['google','onedrive'])test(kind+' actual worker purge preserves all seven portable intents and subsequent manual Prompt history/proofs',async t=>{
 const f=await setup(t,kind),before=await raw(f),control=await f.storage.get(STORAGE_KEY),record=before.records[0];
 assert.equal(before.meta.filter(x=>x.id.startsWith('consumer-preference-owner:')).length,7);
 const result=await f.rpc('PURGE_SOURCE',{id:record.id,confirm:true});assert.equal(result.ok,true,JSON.stringify(result));await f.bridge.store.drainPurgeCleanup();
 const after=await raw(f);assert.equal(after.records.length,0);assert.equal(after.blocks.length,0);assert.equal(after.filterInputs.length,0);assert.equal(after.tombstones.length,1);assert.deepEqual(portable(after),portable(before));assert.deepEqual(await f.storage.get(STORAGE_KEY),control);
 assert.ok(after.meta.some(x=>x.operation?.type==='sourcePurgeIntent'));assert.equal(JSON.stringify(after).includes('SYNTHETIC explain this carefully'),false);assert.equal(f.cloud.requests.length,0);
});
for(const target of ['consumerPreference','promptPreferences','promptBinding'])test('purge refuses changed '+target+' owner proof and preserves every table',async t=>{
 const f=await setup(t),entity=target==='consumerPreference'?'appearance':PROMPT_REUSE_ROW;
 await f.core.transaction(true,async tx=>{const id=await f.core.idIn(tx,'materializedOwner',target,entity),row=await tx.get('meta',id);assert.ok(row);await tx.put('meta',{...row,ownerRevision:row.ownerRevision+1});});
 const before=await raw(f),control=await f.storage.get(STORAGE_KEY),result=await f.rpc('PURGE_SOURCE',{id:before.records[0].id,confirm:true});assert.equal(result.ok,false);assert.equal(result.error,'STORAGE_FAILED');assert.deepEqual(await raw(f),before);assert.deepEqual(await f.storage.get(STORAGE_KEY),control);assert.equal(f.cloud.requests.length,0);
});

test('actual worker unknown upload permits local purge, then cold owner cannot resend deleted cut or replace receipt',async t=>{
 const f=await setup(t),writes=()=>f.cloud.requests.filter(r=>['POST','PUT'].includes(r.method)).length;f.cloud.loseNextPost();assert.equal((await f.ui('NOW')).ok,false);
 const key='paia-sync-checkpoint-publication:v1:'+await digest({datasetId:f.core.datasetId,deviceId:f.core.deviceId,databaseId:f.bridge.store.databaseId}),saved=(await f.storage.get(key))[key];assert.ok(saved);assert.equal(saved.state,'publishing');assert.ok(saved.objects.some(o=>o.state==='attempting'));const n=writes(),before=await raw(f);
 assert.equal((await f.rpc('PURGE_SOURCE',{id:before.records[0].id,confirm:true})).ok,true);await f.bridge.store.drainPurgeCleanup();assert.equal((await f.rpc('PAIA_SYNC_NOW')).ok,false);assert.deepEqual((await f.storage.get(key))[key],saved);assert.equal(writes(),n);await f.close();
 const cold=await openConfiguredSyncWorker(f.options);t.after(()=>cold.close());assert.deepEqual((await cold.storage.get(key))[key],saved);assert.equal(writes(),n);assert.equal((await cold.rpc('PAIA_SYNC_NOW')).ok,false);assert.deepEqual((await cold.storage.get(key))[key],saved);assert.equal(writes(),n);const after=await raw(cold);assert.equal(after.records.length,0);assert.equal(JSON.stringify(after).includes('SYNTHETIC explain this carefully'),false);
});

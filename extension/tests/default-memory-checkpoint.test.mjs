import {MemoryService} from '../core/memory/service.js';
import {configDefault} from '../core/memory/model.js';
import test from 'node:test';import assert from 'node:assert/strict';
import {IDBFactory} from './vendor/fake-indexeddb/build/esm/index.js';
import {local,capture} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {BrowserNativeSyncCore} from '../core/browser-native-sync/core.js';
import {ConsumerPreferenceSyncJournal} from '../core/browser-native-sync/consumer-preference-journal.js';
import {SourceBootstrapJournal} from '../core/browser-native-sync/source-bootstrap-journal.js';
import {FilterIntentSyncJournal} from '../core/browser-native-sync/filter-intent-journal.js';
import {InputWorkingSyncJournal} from '../core/browser-native-sync/input-working-journal.js';
import {buildCheckpoint} from '../core/browser-native-sync/checkpoints.js';
import {consumerPreferencesMatchLocal,consumerDisplayPreferences} from '../core/browser-native-sync/consumer-preference-restore.js';
import {GroupedCheckpointRestore} from '../core/browser-native-sync/group-checkpoint.js';
async function device(t,id){const s=new OrganizerStore(local(),{indexedDB:new IDBFactory(),name:'SYNTHETIC-local-protection-'+crypto.randomUUID(),localPublicationTerminal:true});t.after(()=>s.repository.close());await s.consent(true);await s.finishFoundation();const core=new BrowserNativeSyncCore(s.repository,{datasetId:'SYNTHETIC_local_protection',deviceId:id});s.consumerPreferenceJournal=new ConsumerPreferenceSyncJournal(core);s.sourceBootstrapJournal=new SourceBootstrapJournal(core);s.filterIntentJournal=new FilterIntentSyncJournal(core);s.inputWorkingJournal=new InputWorkingSyncJournal(core,{filterJournal:s.filterIntentJournal,logicalCommits:true});return {s,core};}
const preferences=f=>f.s.repository.transaction(false,async t=>structuredClone((await f.s.control(t)).preferences),['meta']);
const protocol=async f=>{const result=[];for await(const row of f.core.rows('revision'))result.push(row.operation);return result;};
const cloud=()=>{const objects=new Map();return {objects,async putImmutable(ref,data){objects.set(ref.id,data.slice());},async get(ref){return objects.get(ref.id)?.slice();}};};
async function restore(f,cut,remote){const r=new GroupedCheckpointRestore(f.core,{store:f.s,restoreId:crypto.randomUUID()});await r.stageCheckpoint(cut.ref,ref=>remote.get(ref));assert.equal((await r.activate()).state,'activated');while(!(await r.cleanup({limit:10})).complete){}return r;}

const memory=f=>f.s.repository.transaction(false,t=>t.get('meta','memory:config'));
test('original lazy default memory configuration survives A to initialized B to C without portable permission intent',async t=>{
 const a=await device(t,'SYNTHETIC_A'),b=await device(t,'SYNTHETIC_B'),remote=cloud();
 await new MemoryService(a.s).ready();await new MemoryService(b.s).ready();await a.s.capture(capture((await a.s.status()).epoch));
 const cut=await buildCheckpoint(a.core,remote,{grouped:{store:a.s}});await a.s.repository.close();await restore(b,cut,remote);assert.deepEqual(await memory(b),configDefault());
 await b.s.updatePreferences({appearance:'dark'});const next=await buildCheckpoint(b.core,remote,{grouped:{store:b.s}});await b.s.repository.close();const c=await device(t,'SYNTHETIC_C');await new MemoryService(c.s).ready();await restore(c,next,remote);assert.deepEqual(await memory(c),configDefault());assert.equal((await preferences(c)).appearance,'dark');assert.equal(await c.s.repository.transaction(false,t=>t.count('records')),1);assert.equal((await protocol(c)).some(op=>JSON.stringify(op).includes('memory:config')),false);
});
for(const [name,changes] of Object.entries({external:{externalAccess:true},localOnly:{localOnly:true},touched:{userTouched:true},revision:{revision:1},unknown:{extra:false}}))test('nondefault memory '+name+' stays unrepresented with no publication or writes',async t=>{
 const f=await device(t,'SYNTHETIC_refusal'),remote=cloud();await new MemoryService(f.s).ready();await f.s.capture(capture((await f.s.status()).epoch));await f.s.repository.transaction(true,async tx=>{const row=await tx.get('meta','memory:config');await tx.put('meta',{...row,...changes});});
 const raw=()=>f.s.repository.transaction(false,async tx=>Object.fromEntries(await Promise.all(f.s.repository.stores.map(async n=>[n,await tx.all(n)]))));const before=await raw();await assert.rejects(buildCheckpoint(f.core,remote,{grouped:{store:f.s}}),{code:'BNS_GROUP_CANONICAL_UNREPRESENTED'});assert.deepEqual(await raw(),before);assert.equal(remote.objects.size,0);
});

test('a separate legacy profile is not admitted with the default configuration',async t=>{
 const f=await device(t,'SYNTHETIC_profile'),remote=cloud();await new MemoryService(f.s).ready();await f.s.capture(capture((await f.s.status()).epoch));await f.s.repository.transaction(true,t=>t.put('meta',{id:'memory:profile:["default"]',kind:'profile',version:1,profileId:'default',name:'默认',budget:'standard',instruction:'',revision:0}));await assert.rejects(buildCheckpoint(f.core,remote,{grouped:{store:f.s}}),{code:'BNS_GROUP_CANONICAL_UNREPRESENTED'});assert.equal(remote.objects.size,0);
});
test('a changed target memory decision after staging refuses activation and preserves the existing target',async t=>{
 const a=await device(t,'SYNTHETIC_A'),b=await device(t,'SYNTHETIC_B'),remote=cloud();await new MemoryService(a.s).ready();await new MemoryService(b.s).ready();await a.s.capture(capture((await a.s.status()).epoch));const cut=await buildCheckpoint(a.core,remote,{grouped:{store:a.s}}),r=new GroupedCheckpointRestore(b.core,{store:b.s,restoreId:crypto.randomUUID()});await r.stageCheckpoint(cut.ref,ref=>remote.get(ref));await b.s.repository.transaction(true,async tx=>tx.put('meta',{...await tx.get('meta','memory:config'),userTouched:true,revision:1}));const raw=()=>b.s.repository.transaction(false,async tx=>Object.fromEntries(await Promise.all(b.s.repository.stores.map(async n=>[n,await tx.all(n)]))));const before=await raw();await assert.rejects(r.activate());assert.deepEqual(await raw(),before);
});

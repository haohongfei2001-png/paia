import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {ArchiveRepository} from '../core/idb-repository.js';
import {BrowserNativeSyncCore} from '../core/browser-native-sync/core.js';
import {buildCheckpoint,StagedSyncRestore} from '../core/browser-native-sync/checkpoints.js';
import {materializePrompt,restorePromptPreferences} from '../core/browser-native-sync/prompt-journal.js';
import {readPromptPreferences} from '../core/prompt-reuse-preferences.js';
import {SEGMENT_PROFILE} from '../core/browser-native-sync/segments.js';
globalThis.IDBKeyRange=IDBKeyRange;
const datasetId='dataset_checkpoint_01';
const prompt=text=>({id:'prompt-reuse:v1',version:1,pins:[],overrides:[{id:'manual:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',text,hidden:false}],splits:[]});
async function device(deviceId){const repository=new ArchiveRepository({}, {indexedDB:new IDBFactory(),name:'synthetic-checkpoint',thoughtLibrary:true,ia:true,smartFilter:true});await repository.open();return new BrowserNativeSyncCore(repository,{datasetId,deviceId,materialize:materializePrompt});}
async function local(core,text){const p=await core.prepare([{type:'promptPreferences',value:prompt(text)}]);await core.commit(p);return p.operations[0];}
function cloud(){const objects=new Map();return {objects,async putImmutable(ref,value){const previous=objects.get(ref.id);if(previous&&!Buffer.from(previous).equals(Buffer.from(value)))throw Error('collision');objects.set(ref.id,value.slice());},async get(ref){const value=objects.get(ref.id);if(!value)throw Error('missing synthetic object');return value.slice();}};}
const ownerState=core=>core.repository.transaction(false,t=>readPromptPreferences(t));
const restore=(core,options={})=>new StagedSyncRestore(core,{owners:{promptPreferences:restorePromptPreferences},...options});
test('BNS fresh virtual installation restores only verified cloud checkpoint objects atomically',async()=>{
 const a=await device('device_alpha_01'),b=await device('device_beta_001'),transport=cloud();for(const text of ['first','second','exact final 文本 e\u0301'])await local(a,text);
 const cp=await buildCheckpoint(a,transport),r=restore(b);await r.stageCheckpoint(cp.ref,ref=>transport.get(ref));assert.deepEqual(await b.state(),[]);assert.deepEqual((await ownerState(b)).overrides,[]);
 assert.equal((await r.activate()).state,'activated');assert.deepEqual(await b.state(),await a.state());assert.equal((await ownerState(b)).overrides[0].text,'exact final 文本 e\u0301');
 await local(b,'destination new edit');assert.equal((await ownerState(b)).overrides[0].text,'destination new edit');
});
test('BNS staged interruption resumes after restart while old canonical content remains usable',async()=>{
 const a=await device('device_alpha_01'),b=await device('device_beta_001'),transport=cloud(),first=await local(a,'old safe');await b.receive(first);await local(a,'new cloud');const cp=await buildCheckpoint(a,transport),restoreId=crypto.randomUUID();
 let interrupted=false;const r=restore(b,{restoreId,checkpoint:async name=>{if(name==='staged-item'&&!interrupted){interrupted=true;throw Error('synthetic worker stop');}}});
 await assert.rejects(r.stageCheckpoint(cp.ref,ref=>transport.get(ref)));assert.equal((await ownerState(b)).overrides[0].text,'old safe');assert.equal(await b.namespace(),'initial');
 const resumed=restore(b,{restoreId});await resumed.stageCheckpoint(cp.ref,ref=>transport.get(ref));await resumed.activate();assert.equal((await ownerState(b)).overrides[0].text,'new cloud');assert.deepEqual(await b.state(),await a.state());
});
test('BNS activation failure rolls back owner and active-generation pointer together',async()=>{
 const a=await device('device_alpha_01'),b=await device('device_beta_001'),transport=cloud();await local(a,'cloud committed');const cp=await buildCheckpoint(a,transport);let fail=true;
 const r=restore(b,{checkpoint:async name=>{if(name==='after-activation'&&fail)throw Error('synthetic IDB abort');}});await r.stageCheckpoint(cp.ref,ref=>transport.get(ref));await assert.rejects(r.activate());assert.deepEqual(await b.state(),[]);assert.equal(await b.namespace(),'initial');assert.deepEqual((await ownerState(b)).overrides,[]);
 fail=false;await r.activate();assert.equal((await ownerState(b)).overrides[0].text,'cloud committed');assert.equal((await r.activate()).state,'activated');
});
test('BNS local edits during restore reject activation and pre-restore prepared writes cannot cross generations',async()=>{
 const a=await device('device_alpha_01'),b=await device('device_beta_001'),transport=cloud(),first=await local(a,'root');await b.receive(first);await local(a,'remote');const cp=await buildCheckpoint(a,transport),r=restore(b);await r.stageCheckpoint(cp.ref,ref=>transport.get(ref));await local(b,'local while staging');await assert.rejects(r.activate(),{code:'BNS_RESTORE_LOCAL_CHANGED'});assert.equal((await ownerState(b)).overrides[0].text,'local while staging');
 const c=await device('device_gamma_01'),old=await c.prepare([{type:'promptPreferences',value:prompt('pre-restore unsaved preparation')}]),fresh=restore(c);await fresh.stageCheckpoint(cp.ref,ref=>transport.get(ref));await fresh.activate();await assert.rejects(c.commit(old),{code:'BNS_PREPARATION_STALE'});
});
test('BNS unmanaged local owner work and missing required codec never get overwritten',async()=>{
 const a=await device('device_alpha_01'),b=await device('device_beta_001'),transport=cloud();await local(a,'remote');const cp=await buildCheckpoint(a,transport);
 await b.repository.transaction(true,t=>t.put('meta',{...prompt('unmanaged local'),revision:7,overrides:prompt('unmanaged local').overrides.map(x=>({...x,reuseCount:0}))}));
 const r=restore(b);await r.stageCheckpoint(cp.ref,ref=>transport.get(ref));await assert.rejects(r.activate(),{code:'BNS_RESTORE_UNMANAGED_OWNER'});assert.equal((await ownerState(b)).overrides[0].text,'unmanaged local');
 await assert.rejects(restore(b).stageCheckpoint(cp.ref,ref=>transport.get(ref),{supported:{}}),{code:'BNS_REQUIRED_CODEC_UNSUPPORTED'});
});
test('BNS corrupt or missing checkpoint shard never activates a partial replacement',async()=>{
 const a=await device('device_alpha_01'),b=await device('device_beta_001'),transport=cloud();await local(a,'safe cloud');const cp=await buildCheckpoint(a,transport);transport.objects.delete(cp.manifest.root.id);
 const r=restore(b);await assert.rejects(r.stageCheckpoint(cp.ref,ref=>transport.get(ref)));await assert.rejects(r.activate(),{code:'BNS_RESTORE_NOT_READY'});assert.deepEqual(await b.state(),[]);
});
test('BNS checkpoint retains body-free purge history and stale replay cannot resurrect staging',async()=>{
 const a=await device('device_alpha_01');a.materialize=null;const old=await local(a,'body that must be purged'),p=await a.prepare([{type:'promptPreferences',entityId:'prompt-reuse:v1',kind:'purge'}]);await a.commit(p);
 const transport=cloud(),cp=await buildCheckpoint(a,transport),b=await device('device_beta_001'),r=restore(b);await r.stageCheckpoint(cp.ref,ref=>transport.get(ref));assert.equal((await r.stage.state())[0].purged,true);await r.stage.receive(old);assert.deepEqual((await r.stage.state())[0].versions,[]);
 for(const value of transport.objects.values())assert.ok(!new TextDecoder().decode(value).includes('body that must be purged'));
 // This aggregate Prompt purge has no admitted canonical deletion materializer.
 await assert.rejects(r.activate(),{code:'BNS_PROMPT_PURGE_SCOPE_UNAVAILABLE'});
});
test('BNS bounded checkpoint index pages support more than one manifest level',async()=>{
 const a=await device('device_alpha_01');a.materialize=null;
 for(let start=0;start<160;start+=80){const changes=Array.from({length:80},(_,i)=>({type:'contextItem',value:{id:`00000000-0000-4000-8000-${String(start+i).padStart(12,'0')}`,card:'info',body:'Synthetic context',section:'Information',revision:1,order:start+i,origin:'manual',protected:true,userEdited:true,lifecycle:'active',createdAt:'2026-10-07T00:00:00.000Z',updatedAt:'2026-10-07T00:00:00.000Z',deletedBy:null}}));const p=await a.prepare(changes);await a.commit(p);}
 const profile={...SEGMENT_PROFILE,target:1024},transport=cloud(),cp=await buildCheckpoint(a,transport,{profile});assert.ok(cp.manifest.level>=2);
 const b=await device('device_beta_001'),r=restore(b,{profile});await r.stageCheckpoint(cp.ref,ref=>transport.get(ref));assert.deepEqual(await r.stage.state(),await a.state());await assert.rejects(r.activate(),{code:'BNS_OWNER_RESTORE_UNSUPPORTED'});
});
test('BNS verified causal tail reconciles onto staged checkpoint before owner activation',async()=>{
 const a=await device('device_alpha_01'),b=await device('device_beta_001'),transport=cloud();await local(a,'checkpoint root');const cp=await buildCheckpoint(a,transport),tail=await local(a,'later committed tail');
 const r=restore(b);await r.stageCheckpoint(cp.ref,ref=>transport.get(ref));await r.reconcileTail([tail]);await r.activate();assert.deepEqual(await b.state(),await a.state());assert.equal((await ownerState(b)).overrides[0].text,'later committed tail');
});
test('BNS activation refuses an unvalidated staging mutation even when live owner stayed unchanged',async()=>{
 const a=await device('device_alpha_01'),b=await device('device_beta_001'),transport=cloud();await local(a,'checkpoint root');const cp=await buildCheckpoint(a,transport),tail=await local(a,'unregistered tail'),r=restore(b);await r.stageCheckpoint(cp.ref,ref=>transport.get(ref));await r.stage.receive(tail);
 await assert.rejects(r.activate(),{code:'BNS_RESTORE_STAGE_CHANGED'});assert.deepEqual(await b.state(),[]);
 await r.reconcileTail([tail]);await r.activate();assert.equal((await ownerState(b)).overrides[0].text,'unregistered tail');
});
test('BNS generation change between checkpoint validation and its receipt cannot become validated',async()=>{
 const a=await device('device_alpha_01'),b=await device('device_beta_001'),transport=cloud();await local(a,'checkpoint');const cp=await buildCheckpoint(a,transport),tail=await local(a,'changed during validation');let r;
 r=restore(b,{checkpoint:async name=>{if(name==='validated-checkpoint')await r.stage.receive(tail);}});await assert.rejects(r.stageCheckpoint(cp.ref,ref=>transport.get(ref)),{code:'BNS_SNAPSHOT_CHANGED'});assert.equal((await r.stage.read('restore')).phase,'staging');await assert.rejects(r.activate(),{code:'BNS_RESTORE_NOT_READY'});assert.deepEqual(await b.state(),[]);
});
for(const timing of ['before','after'])test('BNS '+timing+'-staging live pending work cannot be stranded by activation',async()=>{
 const a=await device('device_alpha_01'),b=await device('device_beta_001'),transport=cloud(),root=await local(a,'root');await b.receive(root);const cp=await buildCheckpoint(a,transport);await local(a,'missing parent');const child=await local(a,'pending child'),r=restore(b);
 if(timing==='before')await b.receive(child);await r.stageCheckpoint(cp.ref,ref=>transport.get(ref));if(timing==='after')await b.receive(child);
 const generation=(await b.read('generation')).value;assert.equal((await b.receive(child)).state,'pending');assert.equal((await b.read('generation')).value,generation,'duplicate pending does not create another mutation');
 await assert.rejects(r.activate(),{code:timing==='before'?'BNS_RESTORE_LIVE_PENDING':'BNS_RESTORE_LOCAL_CHANGED'});assert.ok(await b.read('pending',child.operationId));assert.equal(await b.namespace(),'initial');assert.equal((await ownerState(b)).overrides[0].text,'root');
});
test('BNS new pending-only staging receive invalidates a validated activation token',async()=>{
 const a=await device('device_alpha_01'),b=await device('device_beta_001'),transport=cloud();await local(a,'root');const cp=await buildCheckpoint(a,transport),r=restore(b);await r.stageCheckpoint(cp.ref,ref=>transport.get(ref));await local(a,'missing parent');const child=await local(a,'pending staged child');assert.equal((await r.stage.receive(child)).state,'pending');
 await assert.rejects(r.activate(),{code:'BNS_RESTORE_STAGE_CHANGED'});assert.deepEqual(await b.state(),[]);assert.ok(await r.stage.read('pending',child.operationId));
});

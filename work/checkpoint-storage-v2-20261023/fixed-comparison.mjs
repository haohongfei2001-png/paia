import test from 'node:test';import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from '../../extension/tests/vendor/fake-indexeddb/build/esm/index.js';
import {ArchiveRepository} from '../../extension/core/idb-repository.js';
import {LibraryDocumentsStore} from '../../extension/core/library-documents-store.js';
import {local} from '../../extension/tests/harness/thought-m1.mjs';
import {BrowserNativeSyncCore} from '../../extension/core/browser-native-sync/core.js';
import {HumanLibrarySyncJournal} from '../../extension/core/browser-native-sync/human-library-journal.js';
import {buildCheckpoint} from '../../extension/core/browser-native-sync/checkpoints.js';
import {CanonicalGenerationPublication} from '../../extension/core/browser-native-sync/canonical-generation-publication.js';
import {CanonicalGenerationCheckpointStage,readCanonicalPhasedHumanProof} from '../../extension/core/browser-native-sync/canonical-generation-checkpoint-stage.js';
import {CanonicalGenerationPhasedHumanRestore,completeOriginalPhasedHumanPublication} from '../../extension/core/browser-native-sync/canonical-generation-phased-human.js';
import {CANONICAL_PHASED_TASK,GENERATION_TASK_LIMITS,readOriginalGenerationControlWork,originalGenerationTaskData,originalGenerationTaskStart,originalGenerationTaskReserve,originalGenerationTaskSettle,originalGenerationTaskBurn} from '../../extension/core/browser-native-sync/canonical-generation-task-ledger.js';
globalThis.IDBKeyRange=IDBKeyRange;
async function fixture(t,count=1,checkpoint){const factory=new IDBFactory(),source=new LibraryDocumentsStore(local(),{indexedDB:factory,name:'SYNTHETIC-phased-source',clock:()=> '2026-10-23T00:00:00.000Z'});await source.consent(true);await source.finishFoundation();const sc=new BrowserNativeSyncCore(source.repository,{datasetId:'synthetic_phased',deviceId:'synthetic_source'});source.humanLibraryJournal=new HumanLibrarySyncJournal(sc);for(let i=0;i<count;i++)await source.createEntry({actor:'user',body:'SYNTHETIC original '+i,type:'idea',formation:'explicit',evidence:[],operationId:crypto.randomUUID()});const objects=new Map(),transport={async putImmutable(ref,raw){objects.set(ref.id,raw.slice());},async get(ref){return objects.get(ref.id)?.slice();}},cp=await buildCheckpoint(sc,transport,{grouped:{store:source}}),registry=new ArchiveRepository(local(),{indexedDB:factory,name:'SYNTHETIC-phased-registry'}),publication=new CanonicalGenerationPublication(registry),store=new LibraryDocumentsStore(local(),{indexedDB:factory,name:'SYNTHETIC-phased-target',clock:()=> '2026-10-23T00:00:00.000Z'}),handle=await publication.attach(store.repository,{generationId:'synthetic_generation',databaseId:'synthetic_database'});await store.consent(true);await store.finishFoundation();const core=new BrowserNativeSyncCore(store.repository,{datasetId:sc.datasetId,deviceId:'synthetic_receiver',namespace:'synthetic_replay'});store.humanLibraryJournal=new HumanLibrarySyncJournal(core);const stage=new CanonicalGenerationCheckpointStage(publication,handle,{store,core,checkpoint,protectRepository:true});await stage.begin(cp.ref,r=>transport.get(r));t.after(()=>[source.repository,registry,store.repository].forEach(r=>r.db?.close()));return {stage,publication,handle,store,core,cp,transport,registry,factory};}


import {writeFileSync} from 'node:fs';
import {decodeCheckpointManifestStorage} from '../../extension/core/browser-native-sync/checkpoint-manifest-storage.js';
import {measureSourceWorkingPhysicalTree} from '../../extension/core/browser-native-sync/source-working-physical.js';
const realUUID=crypto.randomUUID,realRandom=crypto.getRandomValues;
let serial=0,entropy=0;crypto.randomUUID=()=>`00000000-0000-4000-8000-${String(++serial).padStart(12,'0')}`;crypto.getRandomValues=array=>{for(let i=0;i<array.length;i++)array[i]=(entropy++*73+19)%256;return array;};
const STATE='canonical-generation:checkpoint:state:v1',results=[];
try{for(const count of [1,2,3]){let manifestId;for(const version of [1,2]){
 serial=0;entropy=0;const cleanups=[],f=await fixture({after:fn=>cleanups.push(fn)},count);
 try{
 if(manifestId)assert.equal(f.cp.ref.id,manifestId);else manifestId=f.cp.ref.id;
 if(version===1)await new Promise((resolve,reject)=>{const tx=f.store.repository.db.transaction(['meta'],'readwrite'),s=tx.objectStore('meta'),r=s.get(STATE);r.onsuccess=()=>{const row=r.result;s.put({...row,version:1,manifestEncoded:Array.from(decodeCheckpointManifestStorage(row.version,row.manifestEncoded,row.manifestRef.encodedBytes))});};tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);});
 const state=await f.store.repository.transaction(false,t=>t.get('meta',STATE),['meta']);
 const record={count,version,manifestId,manifestEncodedBytes:state.manifestRef.encodedBytes,statePhysicalBytes:measureSourceWorkingPhysicalTree(state).B,representationPhysicalBytes:measureSourceWorkingPhysicalTree(state.manifestEncoded).B,phases:[]};
 const task=()=>f.store.repository.transaction(false,t=>t.get('meta',CANONICAL_PHASED_TASK),['meta']);
 const run=async(name,fn)=>{const before=await task(),value=await fn(),after=await task();record.phases.push({name,ledgerBytes:(after?.workBytes||0)-(before?.workBytes||0),accumulatedBytes:after?.workBytes||0,tickets:after?.tickets||0});return value;};
 await run('authenticate',()=>f.stage.stagePhasedHumanCheckpoint(r=>f.transport.get(r)));
 const proof=await run('validate',()=>f.stage.validatePhasedHumanCheckpoint()),restore=new CanonicalGenerationPhasedHumanRestore(f);
 for(let i=0;i<count;i++)await run('owner-'+i,()=>restore.step(proof));
 await run('final-prepare',()=>restore.preparePublication(proof));await run('final-seal',()=>f.publication.sealOriginalPhasedHumanCheckpoint(f.handle,restore,proof));
 results.push(record);
 }finally{for(const fn of cleanups)fn();}
}}}finally{crypto.randomUUID=realUUID;crypto.getRandomValues=realRandom;}
writeFileSync(new URL('./fixed-comparison.json',import.meta.url),JSON.stringify({node:process.version,platform:process.platform,arch:process.arch,note:'Fixed synthetic clock, UUID sequence and migration secret. Matching original manifest hash for each v1/v2 pair. v1 is original legacy durable Array<number> format prepared before original phased authentication; v2 is actual new begin. No production clock/random mutation. No timing inference. Final reservation remains unchanged 2MiB; full original raw final seal executed for these small samples only.',results},null,2)+'\n');
console.log(JSON.stringify(results));

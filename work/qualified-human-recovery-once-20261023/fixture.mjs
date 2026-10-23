// Explicit one-shot synthetic qualification. Never part of the default test glob.
import {assert} from './generation-purge-assert.mjs';
import {ArchiveRepository} from '../core/idb-repository.js';
import {LibraryDocumentsStore} from '../core/library-documents-store.js';
import {BrowserNativeSyncCore} from '../core/browser-native-sync/core.js';
import {HumanLibrarySyncJournal} from '../core/browser-native-sync/human-library-journal.js';
import {buildCheckpoint} from '../core/browser-native-sync/checkpoints.js';
import {CanonicalGenerationPublication} from '../core/browser-native-sync/canonical-generation-publication.js';
import {CanonicalGenerationCheckpointStage} from '../core/browser-native-sync/canonical-generation-checkpoint-stage.js';
import {CanonicalGenerationPhasedHumanRestore,completeOriginalPhasedHumanPublication} from '../core/browser-native-sync/canonical-generation-phased-human.js';
import {CANONICAL_PHASED_TASK,readOriginalGenerationControlWork} from '../core/browser-native-sync/canonical-generation-task-ledger.js';
const local=()=>{const data={};return {async get(k){return {[k]:structuredClone(data[k])};},async set(v){Object.assign(data,structuredClone(v));}};};
const COUNT=129,PREFIX=64,DATASET='synthetic_qualified_129',NS='synthetic_replay';
const sourceName='paia-native-qualified-129-source',targetName='paia-native-qualified-129-target',registryName='paia-native-qualified-129-registry';
const repositories=[],objects=new Map(),refs=new Map(),events=[];
const storage=local(),registryStorage=local();
let prepared=false,continued=false,state=null,originalEntries=null,originalHistory=null;
const stamp=(phase,value)=>{const event={phase,atMs:performance.now(),...value};events.push(event);return event;};
const repository=(storage,name)=>{const r=new ArchiveRepository(storage,{indexedDB,name});repositories.push(r);return r;};
const store=(storage,name)=>{const s=new LibraryDocumentsStore(storage,{indexedDB,name});repositories.push(s.repository);return s;};
const task=s=>s.repository.transaction(false,t=>t.get('meta',CANONICAL_PHASED_TASK),['meta']);
const rows=(s,table)=>s.repository.transaction(false,t=>t.all(table),[table]);
const recordTask=async(phase,s,extra={})=>stamp(phase,{task:await task(s),control:readOriginalGenerationControlWork(s.repository),...extra});
const transport={async putImmutable(ref,raw){if(objects.has(ref.id))assert.deepEqual(Array.from(objects.get(ref.id)),Array.from(raw));refs.set(ref.id,structuredClone(ref));objects.set(ref.id,raw.slice());},async get(ref){return objects.get(ref.id)?.slice();}};
function owners(s,registry,publication,handle){
 const core=new BrowserNativeSyncCore(s.repository,{datasetId:DATASET,deviceId:'synthetic_receiver',namespace:NS});s.humanLibraryJournal=new HumanLibrarySyncJournal(core);
 return {store:s,core,registry,publication,handle,stage:new CanonicalGenerationCheckpointStage(publication,handle,{store:s,core,protectRepository:true}),restore:new CanonicalGenerationPhasedHumanRestore({store:s,core})};
}
async function prepare(){
 assert.equal(prepared,false,'one preparation only');prepared=true;
 for(const db of await indexedDB.databases())assert.equal([sourceName,targetName,registryName].includes(db.name),false,'fresh owned database required');
 stamp('source-start',{groups:COUNT});
 const source=store(local(),sourceName);await source.consent(true);await source.finishFoundation();
 const core=new BrowserNativeSyncCore(source.repository,{datasetId:DATASET,deviceId:'synthetic_source'});source.humanLibraryJournal=new HumanLibrarySyncJournal(core);
 for(let i=0;i<COUNT;i++)await source.createEntry({actor:'user',body:'SYNTHETIC qualified original '+i,type:'idea',formation:'explicit',evidence:[],operationId:crypto.randomUUID()});
 originalEntries=await rows(source,'thoughts');originalHistory=await rows(source,'revisions');assert.equal(originalEntries.length,COUNT);assert.equal(originalHistory.length,COUNT);
 const checkpoint=await buildCheckpoint(core,transport,{grouped:{store:source}});await source.repository.close();stamp('source-closed',{objects:objects.size});
 const registry=repository(registryStorage,registryName),publication=new CanonicalGenerationPublication(registry),s=store(storage,targetName),handle=await publication.attach(s.repository,{generationId:'synthetic_qualified_generation',databaseId:'synthetic_qualified_database'});
 await s.consent(true);await s.finishFoundation();state=owners(s,registry,publication,handle);state.checkpoint=checkpoint;
 await state.stage.begin(checkpoint.ref,r=>transport.get(r));await state.stage.stageQualifiedHumanCheckpoint(r=>transport.get(r));await recordTask('authenticated',s);
 state.proof=await state.stage.validateQualifiedHumanCheckpoint();const schedule=state.restore.preflight(state.proof);
 assert.equal(schedule.groups,COUNT);assert.equal(schedule.operations,COUNT*3);assert.ok(schedule.references<=4096);assert.ok(schedule.items<=775);
 await recordTask('validated-before-owner',s,{schedule});assert.equal((await rows(s,'thoughts')).length,0);
 return {checkpoint:checkpoint.ref,schedule,events,originalEntries,originalHistory,objects:[...objects].map(([id,raw])=>({ref:refs.get(id),hex:Array.from(raw,b=>b.toString(16).padStart(2,'0')).join('')}))};
}
async function continuation(){
 assert.ok(prepared&&state?.proof);assert.equal(continued,false,'one receiver run only');continued=true;
 for(let i=0;i<PREFIX;i++){const result=await state.restore.step(state.proof);assert.equal(result.completed,i+1);await recordTask('owner',state.store,{completed:result.completed});}
 const before=await task(state.store),schedule=state.restore.preflight(state.proof);
 await state.store.repository.close();await state.registry.close();stamp('cold-closed',{completed:PREFIX,taskId:before.taskId});
 const registry=repository(registryStorage,registryName),publication=new CanonicalGenerationPublication(registry),s=store(storage,targetName),handle=await publication.attach(s.repository,{generationId:'synthetic_qualified_generation',databaseId:'synthetic_qualified_database'});
 state=owners(s,registry,publication,handle);state.proof=await state.stage.revalidateQualifiedHumanCheckpoint();assert.deepEqual(state.restore.preflight(state.proof),schedule);
 let ledger=await task(s);assert.equal(ledger.taskId,before.taskId);assert.deepEqual(ledger.identity,before.identity);assert.ok(ledger.workBytes>=before.workBytes);await recordTask('cold-revalidated',s);
 const rehydrated=await state.restore.rehydrate(state.proof);assert.equal(rehydrated.completed,PREFIX);await recordTask('cold-rehydrated',s,{rehydrated});
 for(let i=PREFIX;i<COUNT;i++){const result=await state.restore.step(state.proof);assert.equal(result.completed,i+1);await recordTask('owner',s,{completed:result.completed});}
 const preparedPublication=await state.restore.preparePublication(state.proof);assert.equal(preparedPublication.references,schedule.references);await recordTask('publication-prepared',s,{preparedPublication});
 const token=await publication.sealOriginalPhasedHumanCheckpoint(handle,state.restore,state.proof),work=completeOriginalPhasedHumanPublication(state.restore,state.proof);assert.equal(work.native.references,schedule.references);assert.ok(work.native.bytes<=8*1024*1024);assert.ok(work.native.activeMs<=30000);await recordTask('sealed',s,{work});
 await publication.reserve(token,'synthetic_qualified_publication_once');assert.equal((await publication.recover()).state,'committed');
 const actual=await rows(s,'thoughts'),history=await rows(s,'revisions'),meta=await rows(s,'meta');assert.equal(actual.length,COUNT);assert.equal(history.length,COUNT);
 const semantic=row=>{const value=structuredClone(row);for(const key of ['createdSequence','updatedSequence','negativeUpdatedSequence','exactSignature'])delete value[key];return value;};
 assert.deepEqual(actual.map(semantic).sort((a,b)=>a.id.localeCompare(b.id)),originalEntries.map(semantic).sort((a,b)=>a.id.localeCompare(b.id)));
 const hist=row=>{const value=structuredClone(row);for(const key of ['sequence','listKey','documentList'])delete value[key];return value;};
 assert.deepEqual(history.map(hist).sort((a,b)=>a.id.localeCompare(b.id)),originalHistory.map(hist).sort((a,b)=>a.id.localeCompare(b.id)));
 const receipts=meta.filter(row=>row.id.startsWith('canonical-generation:phased-human:receipt:'));assert.equal(receipts.length,COUNT);assert.equal(new Set(receipts.map(r=>r.groupId)).size,COUNT);assert.ok(receipts.every(r=>r.taskId===before.taskId&&/^[a-f0-9]{64}$/.test(r.expectedDigest)));
 ledger=await task(s);assert.equal(ledger.taskId,before.taskId);assert.equal(ledger.version,2);assert.equal(ledger.phase,'verified');assert.equal(ledger.pending,null);assert.ok(ledger.workBytes<=64*1024*1024);assert.ok(ledger.activeMs<=120000);
 await publication.bindOriginalActiveStore(handle,s);const entry=actual[0];await s.editEntry({id:entry.id,expectedRevision:entry.revision,changes:{note:'SYNTHETIC ordinary edit after qualified cold restore'},operationId:crypto.randomUUID()});assert.equal((await s.entry(entry.id)).note,'SYNTHETIC ordinary edit after qualified cold restore');assert.equal((await rows(s,'thoughts')).length,COUNT);
 await recordTask('committed-and-edited',s,{groups:COUNT,receipts:receipts.length});return {result:'PASS',events,ledger,work,schedule,entries:actual,history,receipts};
}
async function evidence(){const out={events,prepared,continued};if(state){out.active=await state.publication.active();out.tables={};for(const name of state.store.repository.stores)out.tables[name]=await rows(state.store,name);}return out;}
const prior=globalThis.__bnsNative;
globalThis.__bnsNative={...prior,async run(command,...args){if(command==='qualified-129-prepare')return prepare();if(command==='qualified-129-continue')return continuation();if(command==='qualified-129-evidence')return evidence();return prior.run(command,...args);}};

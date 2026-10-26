import {APPLICATION_GENERATION_REGISTRY} from '../../background/application-store-selection.js';
import {originalOrganizerConstructor} from '../../core/organizer/store-owner.js';
import {DATABASE_NAME} from '../../core/idb-repository.js';
import {IDBFactory,IDBKeyRange} from '../vendor/fake-indexeddb/build/esm/index.js';
import {ArchiveRepository} from '../../core/idb-repository.js';
import {LibraryDocumentsStore} from '../../core/library-documents-store.js';
import {local,capture,inputEdit} from './thought-m1.mjs';
import {BrowserNativeSyncCore} from '../../core/browser-native-sync/core.js';
import {SourceBootstrapJournal} from '../../core/browser-native-sync/source-bootstrap-journal.js';
import {FilterIntentSyncJournal} from '../../core/browser-native-sync/filter-intent-journal.js';
import {InputWorkingSyncJournal} from '../../core/browser-native-sync/input-working-journal.js';
import {buildGroupedCheckpoint,GroupedCheckpointRestore} from '../../core/browser-native-sync/group-checkpoint.js';
import {CanonicalGenerationPublication,CANONICAL_GENERATION_REGISTRY as ROOT} from '../../core/browser-native-sync/canonical-generation-publication.js';
import {CanonicalGenerationCheckpointStage} from '../../core/browser-native-sync/canonical-generation-checkpoint-stage.js';
globalThis.IDBKeyRange=IDBKeyRange;
const DATASET='synthetic_local_selection',REGISTRY=APPLICATION_GENERATION_REGISTRY;
function journals(store,deviceId){const core=new BrowserNativeSyncCore(store.repository,{datasetId:DATASET,deviceId});store.sourceBootstrapJournal=new SourceBootstrapJournal(core);store.filterIntentJournal=new FilterIntentSyncJournal(core);store.inputWorkingJournal=new InputWorkingSyncJournal(core,{filterJournal:store.filterIntentJournal,logicalCommits:true});return core;}
async function raw(repository,fn){await repository.open();await new Promise((resolve,reject)=>{const tx=repository.db.transaction(['meta'],'readwrite');tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);fn(tx.objectStore('meta'));});}
const snapshot=s=>s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all(s.repository.stores.map(async name=>[name,await t.all(name)]))));
export async function existingSelectionFixture(t,{sourceLocal=local()}={}){
 const factory=new IDBFactory(),storage=local(),registry=new ArchiveRepository(local(),{indexedDB:factory,name:REGISTRY}),publication=new CanonicalGenerationPublication(registry),a=new (originalOrganizerConstructor())(sourceLocal,{indexedDB:factory,name:DATABASE_NAME}),b=new LibraryDocumentsStore(storage,{indexedDB:factory,name:'SYNTHETIC-local-selection-B'});
 const repositories=[registry,a.repository,b.repository];t.after(()=>repositories.forEach(r=>r.db?.close()));
 await a.consent(true);await a.finishFoundation();const coreA=journals(a,'synthetic_A');
 for(let n=0;n<2;n++){const q=capture((await a.status()).epoch,'synthetic-source-'+n,'SYNTHETIC original '+n);q.messages[0].pageOrder=n+1;await a.capture(q);}
 const blocks=(await a.snapshot()).library.blocks;for(const block of blocks)await inputEdit(a,block.id,{note:'SYNTHETIC initial note'});
 const handle=await publication.attach(b.repository,{generationId:'synthetic_generation',databaseId:'synthetic_database'});await b.consent(true);await b.finishFoundation();const coreB=journals(b,'synthetic_B');
 const objects=new Map(),transport={async putImmutable(ref,bytes){objects.set(ref.id,bytes.slice());},async get(ref){return objects.get(ref.id)?.slice();}},cut=await buildGroupedCheckpoint(coreA,transport,{store:a}),stage=new CanonicalGenerationCheckpointStage(publication,handle,{store:b,core:coreB,protectRepository:true});await stage.stageCheckpoint(cut.ref,r=>transport.get(r));const proof=await stage.validate(),restore=new GroupedCheckpointRestore(coreB,{store:b,restoreId:'synthetic_initial_restore'});await restore.stageCanonicalGeneration(proof);await restore.activate();await restore.prepareCanonicalGenerationPublication(proof);const seal=await publication.sealOriginalCheckpoint(handle,restore,proof);await publication.reserve(seal,'synthetic_local_publication');await publication.recover();
 while((await publication.retireCheckpointCopies(handle)).state!=='retired'){}
 await publication.bindOriginalActiveStore(handle,b);while(!(await restore.cleanup({limit:100})).complete){}
 async function cold(){const r=new ArchiveRepository(local(),{indexedDB:factory,name:REGISTRY}),p=new CanonicalGenerationPublication(r);repositories.push(r);const store=await p.openOriginalActiveStore(storage);repositories.push(store.repository);return {store,publication:p,registry:r,core:journals(store,'synthetic_B')};}
 return {factory,storage,registry,publication,a,b,coreA,coreB,transport,blocks,handle,cold,snapshot,raw};
}


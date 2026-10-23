import {IDBFactory,IDBKeyRange} from '../../extension/tests/vendor/fake-indexeddb/build/esm/index.js';
import {ArchiveRepository} from '../../extension/core/idb-repository.js';
import {LibraryDocumentsStore} from '../../extension/core/library-documents-store.js';
import {local} from '../../extension/tests/harness/thought-m1.mjs';
import {BrowserNativeSyncCore} from '../../extension/core/browser-native-sync/core.js';
import {HumanLibrarySyncJournal} from '../../extension/core/browser-native-sync/human-library-journal.js';
import {buildCheckpoint} from '../../extension/core/browser-native-sync/checkpoints.js';
import {CanonicalGenerationPublication} from '../../extension/core/browser-native-sync/canonical-generation-publication.js';
import {CanonicalGenerationCheckpointStage} from '../../extension/core/browser-native-sync/canonical-generation-checkpoint-stage.js';
import {CanonicalGenerationHumanRestore,CANONICAL_HUMAN_RESTORE_STATE} from '../../extension/core/browser-native-sync/canonical-generation-human-restore.js';
globalThis.IDBKeyRange=IDBKeyRange;
for(const count of [65,129]){
 const factory=new IDBFactory(),source=new LibraryDocumentsStore(local(),{indexedDB:factory,name:'SYNTHETIC-scale-source-'+count}),registry=new ArchiveRepository(local(),{indexedDB:factory,name:'SYNTHETIC-scale-registry-'+count}),store=new LibraryDocumentsStore(local(),{indexedDB:factory,name:'SYNTHETIC-scale-target-'+count});let phase='source',completed=0;const result={count};
 try{
  await source.consent(true);await source.finishFoundation();const sourceCore=new BrowserNativeSyncCore(source.repository,{datasetId:'synthetic_scale',deviceId:'synthetic_source'});source.humanLibraryJournal=new HumanLibrarySyncJournal(sourceCore);
  for(let i=0;i<count;i++)await source.createEntry({actor:'user',body:'SYNTHETIC original '+i,type:'idea',formation:'explicit',evidence:[],operationId:crypto.randomUUID()});
  phase='checkpoint-build';const rows=new Map(),transport={async putImmutable(ref,raw){rows.set(ref.id,raw.slice());},async get(ref){return rows.get(ref.id)?.slice();}},cp=await buildCheckpoint(sourceCore,transport,{grouped:{store:source}});result.itemCount=cp.manifest.itemCount;result.transportBytes=[...rows.values()].reduce((n,r)=>n+r.length,0);
  const publication=new CanonicalGenerationPublication(registry),handle=await publication.attach(store.repository,{generationId:'synthetic_generation',databaseId:'synthetic_database'});await store.consent(true);await store.finishFoundation();const core=new BrowserNativeSyncCore(store.repository,{datasetId:'synthetic_scale',deviceId:'synthetic_receiver',namespace:'synthetic_replay'});store.humanLibraryJournal=new HumanLibrarySyncJournal(core);const stage=new CanonicalGenerationCheckpointStage(publication,handle,{store,core,protectRepository:true});phase='authenticated-stage';await stage.stageCheckpoint(cp.ref,r=>transport.get(r));phase='validate';const proof=await stage.validate(),restore=new CanonicalGenerationHumanRestore({store,core});phase='owner-step';let state;do{state=await restore.step(proof);completed=state.completed;}while(state.state!=='complete');phase='owner-verify';await restore.verify(proof);phase='publication-prepare';await restore.preparePublication(proof);phase='publication-seal';const seal=await publication.sealOriginalHumanCheckpoint(handle,restore,proof);phase='publication';await publication.reserve(seal,'synthetic_scale_publication');await publication.recover();result.state='complete';
 }catch(error){result.state='rejected';result.phase=phase;result.error=error.code??error.name;result.stack=error.stack;}
 finally{result.completed=completed;try{result.target=await store.repository.transaction(false,async t=>({entries:await t.count('thoughts'),stage:(await t.get('meta','canonical-generation:checkpoint:state:v1'))?.phase??null,received:(await t.get('meta','canonical-generation:checkpoint:state:v1'))?.received??0,cursor:(await t.get('meta',CANONICAL_HUMAN_RESTORE_STATE))?.cursor??0}),['meta','thoughts']);}catch{}for(const r of [source.repository,registry,store.repository])r.db?.close();console.log(JSON.stringify(result));}
}

import {LibraryDocumentsStore} from '../../core/library-documents-store.js';
import {BrowserNativeSyncCore} from '../../core/browser-native-sync/core.js';
import {PromptSyncJournal} from '../../core/browser-native-sync/prompt-journal.js';
import {PromptReuseService} from '../../core/prompt-reuse-service.js';
import {PROMPT_REUSE_ROW,validPromptPreferences} from '../../core/prompt-reuse-preferences.js';
import {assertManualPromptCurrentPhysicalShape} from '../../core/browser-native-sync/manual-prompt-current-shape.js';
import {projectEntity} from '../../core/browser-native-sync/codecs.js';
import {buildCheckpoint} from '../../core/browser-native-sync/checkpoints.js';
import {equal} from '../../core/browser-native-sync/value.js';

export async function runManualPromptShapeNativeCases(){
 let assertions=0;const check=(value,label)=>{assertions++;if(!value)throw Error(label);};
 const localValues={},local={async get(key){return {[key]:structuredClone(localValues[key])};},async set(values){Object.assign(localValues,structuredClone(values));}};
 const store=new LibraryDocumentsStore(local,{indexedDB,name:'SYNTHETIC-manual-prompt-shape-'+crypto.randomUUID(),clock:()=> '2026-10-10T00:00:00.000Z'});
 try{
  await store.consent(true);await store.finishFoundation();const core=new BrowserNativeSyncCore(store.repository,{datasetId:'SYNTHETIC_manual_prompt_shape',deviceId:'SYNTHETIC_shape_source'});
  const service=new PromptReuseService(store,{syncJournal:new PromptSyncJournal(core)}),change=async value=>service.change({...value,revision:(await service.snapshot()).preferences.revision});
  const first=await change({action:'create',text:'SYNTHETIC exact manual one 中文😀'}),second=await change({action:'create',text:'SYNTHETIC exact manual two 中文'});
  await change({action:'edit',id:first.id,text:'SYNTHETIC exact edited manual one 中文😀'});await change({action:'hide',id:second.id});await change({action:'pin',id:first.id});
  const physical=await store.repository.transaction(false,t=>t.get('meta',PROMPT_REUSE_ROW));
  check(assertManualPromptCurrentPhysicalShape(physical)===true,'actual original native manual row meets selected owned shape');check(validPromptPreferences(physical),'original domain validator still qualifies');
  check(physical.overrides.length===2,'both manual owners retained');check(physical.pins.length===1&&physical.pins[0]===first.id,'original pin order retained');
  check(physical.overrides.find(row=>row.id===first.id).text==='SYNTHETIC exact edited manual one 中文😀','exact edited text retained');check(physical.overrides.find(row=>row.id===second.id).hidden===true,'explicit human hidden intent retained');
  const portable=projectEntity('promptPreferences',physical);check(!Object.hasOwn(portable,'revision'),'original local revision excluded from portable');check(portable.overrides.every(row=>!Object.hasOwn(row,'reuseCount')),'original local ranking excluded from portable');
  check(equal(projectEntity('promptPreferences',(await service.snapshot()).preferences),portable),'actual original consumer snapshot reads same portable data');
  const head=await core.read('head','promptPreferences',PROMPT_REUSE_ROW),operation=await core.read('revision',head.revisions[0]);check(equal(operation.operation.value,portable),'original latest typed operation equals actual native portable data');
  const all=()=>store.repository.transaction(false,async t=>{const result={};for(const name of store.repository.stores)result[name]=await t.all(name);return result;});const before=await all();let writes=0,error;
  try{await buildCheckpoint(core,{async putImmutable(){writes++;throw Error('unexpected transport');},async get(){throw Error('unexpected read');}},{grouped:{store,currentHumanProjection:true}});}catch(cause){error=cause;}
  check(error?.code==='BNS_GROUP_SCOPE_PROOF_REQUIRED','selected shape does not grant Prompt-only current Scope');check(writes===0,'refused unqualified Scope performs no transport');check(equal(await all(),before),'refusal leaves complete physical37 stores unchanged');check(store.repository.stores.length===37,'complete original schema checked');
  store.repository.db.close();const reopened=await new PromptReuseService(store).snapshot();check(equal(projectEntity('promptPreferences',reopened.preferences),portable),'original native DB reopen consumer preserves exact portable text and intent');
  return {status:'NATIVE_MANUAL_PROMPT_SHAPE_COMPONENT_PASS_NOT_CURRENT_SCOPE',assertions,originalPromptOperations:5,physicalShape:true,promptOnlyScopeRefused:true,whole37StoresUnchanged:true,nativeDBReopen:true,workerRestart:false,checkpointRecovery:false,provider:false};
 }finally{store.repository.db?.close();}
}

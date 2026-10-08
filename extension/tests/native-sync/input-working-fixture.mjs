import {nativeFilterIntentFixture} from './filter-intent-fixture.mjs';
// Reuse the existing native runner and exact owner assertions. Only imports and
// the fake-IDB setup are replaced; production code is never transformed.
export function nativeInputWorkingFixture(source,harness){
 const ownerImport="import {setup,inputEdit,derived} from './harness/thought-m1.mjs';";
 if(source.split(ownerImport).length!==2)throw Error('WORKING_OWNER_IMPORT_CHANGED');
 const derived=harness.slice(harness.indexOf('export async function derived(')).replace(/^export /,'');
 if(!derived.startsWith('async function derived('))throw Error('WORKING_DERIVED_HELPER_CHANGED');
 source=source.replace(ownerImport,"import {setup} from './harness/thought-m1.mjs';\nimport {inputEdit,capture} from './harness/thought-m1.mjs';")+'\n'+derived;
 const fixture=nativeFilterIntentFixture(source).replace("command==='filter-intent-matrix'","command==='input-working-matrix'");
 return fixture+`
const workingPrevious=globalThis.__bnsNative;
globalThis.__bnsNative={...workingPrevious,async run(command,...args){
 if(command==='working-durable-create'||command==='working-durable-read'){
  const s=store('bns-working-native-durable');await s.finishFoundation();
  if(command.endsWith('create')){await s.consent(true);await s.capture(capture((await s.status()).epoch));const core=new BrowserNativeSyncCore(s.repository,{datasetId:'synthetic_working_durable',deviceId:'synthetic_working_native'});s.filterIntentJournal=new FilterIntentSyncJournal(core);s.inputWorkingJournal=new InputWorkingSyncJournal(core,{filterJournal:s.filterIntentJournal});await inputEdit(s,(await s.snapshot()).library.blocks[0].id,{note:'Synthetic durable Working note'});}
  return snapshot({s});
 }
 return workingPrevious.run(command,...args);
}};
`;
}

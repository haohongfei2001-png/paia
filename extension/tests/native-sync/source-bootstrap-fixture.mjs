import {nativeFilterIntentFixture} from './filter-intent-fixture.mjs';
export function nativeSourceBootstrapFixture(source){
 const remove=["import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';","import {LibraryFoundationStore} from '../core/thought-store.js';","import {local,capture,inputEdit} from './harness/thought-m1.mjs';","globalThis.IDBKeyRange=IDBKeyRange;","import {readFile} from 'node:fs/promises';import {createHash} from 'node:crypto';"];
 for(const token of remove){if(source.split(token).length!==2)throw Error('BOOTSTRAP_FIXTURE_IMPORT_CHANGED');source=source.replace(token,'');}
 const lines=source.split('\n'),old=lines.filter(line=>line.startsWith("test('every real one-operation publication"));if(old.length!==1)throw Error('BOOTSTRAP_OLD_READER_CASE_CHANGED');source=lines.filter(line=>!line.startsWith("test('every real one-operation publication")).join('\n');
 const fresh="async function fresh(device){const s=new LibraryFoundationStore(local(),{indexedDB:new IDBFactory()});await s.consent(true);await s.finishFoundation();const core=new BrowserNativeSyncCore(s.repository,{datasetId:'synthetic_source_bootstrap',deviceId:device});return {s,core};}";
 if(source.split(fresh).length!==2)throw Error('BOOTSTRAP_FRESH_CHANGED');
 source=source.replace(fresh,"async function fresh(device){const s=store('bns-source-native-'+(++sequence));await s.consent(true);await s.finishFoundation();const core=new BrowserNativeSyncCore(s.repository,{datasetId:'synthetic_source_bootstrap',deviceId:device});return {s,core};}");
 source+="\nimport {setup} from './harness/thought-m1.mjs';\nimport {inputEdit,capture} from './harness/thought-m1.mjs';";
 let fixture=nativeFilterIntentFixture(source).replace("command==='filter-intent-matrix'","command==='source-bootstrap-matrix'");
 // Node assert.rejects also accepts a thunk; execute it, never accept an unused function.
 if(fixture.split('try{await p;}').length!==2)throw Error('BOOTSTRAP_ASSERT_CHANGED');
 fixture=fixture.replace('try{await p;}','try{await (typeof p===\'function\'?p():p);}')
  .replace('const assert={','const assert={notEqual(a,b,label){if(a===b)throw Error(label||\'notEqual\');},');
 return fixture+`
const bootstrapPrevious=globalThis.__bnsNative;
globalThis.__bnsNative={...bootstrapPrevious,async run(command,args={}){
 if(command==='source-bootstrap-durable-create'){
  const a=await source(),operations=(await publish(a)).decoded,s=store('bns-source-bootstrap-durable');await s.consent(true);await s.finishFoundation();const core=new BrowserNativeSyncCore(s.repository,{datasetId:a.core.datasetId,deviceId:'synthetic_durable_receiver'});await new SourceBootstrapReceiver(s,core).receive(operations);return {operations,before:await snapshot({s}),inputId:(await s.snapshot()).library.blocks[0].id};
 }
 if(command==='source-bootstrap-durable-read'){
  const s=store('bns-source-bootstrap-durable');await s.finishFoundation();const core=new BrowserNativeSyncCore(s.repository,{datasetId:'synthetic_source_bootstrap',deviceId:'synthetic_durable_receiver'});assert.deepEqual(await snapshot({s}),args.before);assert.equal((await new SourceBootstrapReceiver(s,core).receive(args.operations)).state,'duplicate');assert.deepEqual(await snapshot({s}),args.before);assert.deepEqual(await all(core),[]);return {duplicate:true,noEcho:true,baselineId:(await s.repository.transaction(false,t=>t.all('revisions')))[0].id};
 }
 return bootstrapPrevious.run(command,args);
}};
`;
}

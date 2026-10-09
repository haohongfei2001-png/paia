// Execute the owning current-family assertions with actual MV3 IndexedDB.
// Node-only immutable fixture hash checks run in the outer harness; here the
// same frozen actual readers still reject every operation/publication cut.
export function nativeHumanLibraryFixture(source,roleSource,groupSource,orderSource,indexedSource,derivedSource){
 for(const item of ["import {readFile} from 'node:fs/promises';","import {createHash} from 'node:crypto';","import test from 'node:test';","import assert from 'node:assert/strict';","import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';","import {local} from './harness/thought-m1.mjs';","globalThis.IDBKeyRange=IDBKeyRange;"]){if(source.split(item).length!==2)throw Error('HUMAN_FIXTURE_IMPORT_CHANGED');source=source.replace(item,'');}
 for(const [names,module]of [['changeTopicContainer','topic-governance'],['keepTopicIdentitiesSeparate','topic-identity'],['buildCheckpoint','browser-native-sync/checkpoints']]){const text="const {"+names+"}=await import('../core/"+module+".js')";if(source.split(text).length!==2)throw Error('HUMAN_DYNAMIC_IMPORT_CHANGED');source=source.replace(text,names==='buildCheckpoint'?"const unusedBuildCheckpointBridge=0":"const unused"+names+"Bridge=0");source="import {"+names+"} from '../core/"+module+".js';\n"+source;}
 const a=source.indexOf('async function fixture(){'),b=source.indexOf('\nasync function snapshot',a);if(a<0||b<0)throw Error('HUMAN_FIXTURE_CONSTRUCTOR_CHANGED');source=source.slice(0,a)+`async function fixture(){let tick=0;const s=nativeStore('bns-human-'+(++sequence),()=>new Date(Date.UTC(2026,9,9)+tick++).toISOString());await s.consent(true);await s.finishFoundation();const core=new BrowserNativeSyncCore(s.repository,{datasetId:'synthetic-human-journal',deviceId:'synthetic-human-device'});s.humanLibraryJournal=new HumanLibrarySyncJournal(core);return {s,core};}`+source.slice(b);
 const first=source.indexOf("const base=new URL('./fixtures/human-library-old-reader/'"),last=source.indexOf('\n});',first);if(first<0||last<0)throw Error('HUMAN_FROZEN_BRIDGE_CHANGED');source=source.slice(0,first)+`for(const ref of descriptors)await assert.rejects(oldSegments.readSegmentDescriptor(ref,r=>transport.get(r),{datasetId:core.datasetId}),{code:'BNS_REQUIRED_CODEC_UNSUPPORTED'});for(const operation of decoded)await assert.rejects(old.validateOperation(operation),{code:'BNS_OPERATION_INVALID'});`+source.slice(last);
 return `
import * as old from './bns-human-frozen/extension/core/browser-native-sync/core.js';
import * as oldSegments from './bns-human-frozen/extension/core/browser-native-sync/segments.js';
const cases=[],test=(name,fn)=>cases.push({name,fn});
const normalize=x=>Array.isArray(x)?x.map(normalize):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,normalize(x[k])])):x;
const check=(e,p)=>{if(p&&!(typeof p==='function'?p(e):Object.entries(p).every(([k,v])=>e[k]===v)))throw Error('wrong rejection '+e.code+': '+e.message);};
const assert={throws(fn,expected){try{fn();}catch(e){check(e,expected);return;}throw Error('expected exception');},equal(a,b,label){if(a!==b)throw Error((label||'equal')+': '+JSON.stringify([a,b]));},notEqual(a,b,label){if(a===b)throw Error(label||'notEqual');},deepEqual(a,b,label){if(JSON.stringify(normalize(a))!==JSON.stringify(normalize(b)))throw Error((label||'deepEqual')+' mismatch');},ok(x,label){if(!x)throw Error(label||'truthy');},async rejects(p,expected){try{await p;}catch(e){check(e,expected);return;}throw Error('expected rejection');}};
let sequence=0;
function nativeStore(name,clock,uuid){const prefix=name+':',storage={async get(k){const all=await chrome.storage.local.get(null);if(k===null)return Object.fromEntries(Object.entries(all).filter(([key])=>key.startsWith(prefix)).map(([key,v])=>[key.slice(prefix.length),v]));return {[k]:all[prefix+k]};},async set(v){await chrome.storage.local.set(Object.fromEntries(Object.entries(v).map(([k,x])=>[prefix+k,x])));}};return new LibraryDocumentsStore(storage,{indexedDB,name,...(clock?{clock}:{}),...(uuid?{uuid}:{})});}
${source}
${nativeHumanRoleFixture(roleSource)}
${nativeHumanGroupFixture(groupSource)}
${nativeHumanOrderFixture(orderSource)}
${nativeHumanIndexedFixture(indexedSource)}
${nativeHumanDerivedFixture(derivedSource)}
const previous=globalThis.__bnsNative;
globalThis.__bnsNative={...previous,async run(command,args={}){
 if(command==='human-library-matrix'){const names=[];for(const item of cases){try{await item.fn();}catch(e){throw Error(item.name+': '+e.stack);}names.push(item.name);}return names;}
 if(command==='human-library-group-durable-create'){
  const a=await fixture(),q=await a.s.createTopic({name:'SYNTHETIC durable grouped Topic',operationId:crypto.randomUUID()}),section=await a.s.createSection({topicId:q.id,expectedTopicRevision:0,title:'SYNTHETIC durable named Section',operationId:crypto.randomUUID()}),e=await a.s.createEntry({actor:'user',body:'SYNTHETIC durable grouped human',type:'idea',formation:'explicit',evidence:[],operationId:crypto.randomUUID()});
  await a.s.editEntry({id:e.id,expectedRevision:0,changes:{note:'SYNTHETIC durable grouped first'},operationId:crypto.randomUUID()});await a.s.editEntry({id:e.id,expectedRevision:1,changes:{note:'SYNTHETIC durable grouped latest'},operationId:crypto.randomUUID()});await a.s.placeEntry({entryId:e.id,topicId:q.id,sectionId:section.sectionId,expectedEntryRevision:2,expectedTopicRevision:1,operationId:crypto.randomUUID()});
  const objects=new Map(),transport={async putImmutable(ref,data){objects.set(ref.id,data.slice());},async get(ref){return objects.get(ref.id)?.slice();}},cut=await buildCheckpoint(a.core,transport,{grouped:{store:a.s}});
  const s=nativeStore('bns-human-group-durable');await s.consent(true);await s.finishFoundation();const core=new BrowserNativeSyncCore(s.repository,{datasetId:a.core.datasetId,deviceId:'synthetic-human-group-durable'}),restoreId=crypto.randomUUID(),restore=new GroupedCheckpointRestore(core,{store:s,restoreId});
  assert.equal((await restore.stageCheckpoint(cut.ref,r=>transport.get(r))).phase,'validated');assert.equal((await restore.activate()).state,'activated');const canonical=await snapshot(s);assert.equal(canonical.meta.filter(x=>x.id.includes(':outbox:')).length,0);
  return {restoreId,canonical,entryId:e.id,topicId:q.id,sectionId:section.sectionId,active:await core.namespace()};
 }
 if(command==='human-library-group-durable-ack'){
  const s=nativeStore('bns-human-group-durable');await s.finishFoundation();const core=new BrowserNativeSyncCore(s.repository,{datasetId:'synthetic-human-journal',deviceId:'synthetic-human-group-durable'}),restore=new GroupedCheckpointRestore(core,{store:s,restoreId:args.restoreId});
  assert.deepEqual(await snapshot(s),args.canonical,'all canonical, history, protocol and staging stores survived actual worker restart');assert.equal((await restore.activate()).namespace,args.active);assert.deepEqual(await snapshot(s),args.canonical,'duplicate grouped ACK is zero all-store writes');
  const entry=await s.entry(args.entryId),topic=await s.topic(args.topicId);assert.equal(entry.note,'SYNTHETIC durable grouped latest');assert.equal(entry.revision,3);assert.equal(topic.name,'SYNTHETIC durable grouped Topic');const sections=args.canonical.sections.filter(row=>row.topicId===args.topicId);assert.equal(sections.length,2);assert.ok(sections.some(row=>row.sectionId===args.sectionId));const edits=args.canonical.revisions.filter(row=>row.entityId===args.entryId&&row.reason==='edit');assert.equal(edits.length,1);assert.equal(args.canonical.placements.filter(row=>row.entryId===args.entryId&&row.topicId===args.topicId&&row.sectionId===args.sectionId).length,1);assert.equal(args.canonical.meta.filter(x=>x.id.includes(':outbox:')).length,0);
  return {duplicate:true,noEcho:true,allStoresPreserved:true,sections:sections.length,coalescedEdits:edits.length,history:args.canonical.revisions.length,active:args.active};
 }
 if(command==='human-library-durable-create'){
  const a=await fixture(),e=await a.s.createEntry({actor:'user',body:'SYNTHETIC durable human',type:'idea',formation:'explicit',evidence:[],operationId:crypto.randomUUID()});await a.s.editEntry({id:e.id,expectedRevision:0,changes:{note:'SYNTHETIC durable note'},operationId:crypto.randomUUID()});
  const s=nativeStore('bns-human-durable');await s.consent(true);await s.finishFoundation();const core=new BrowserNativeSyncCore(s.repository,{datasetId:a.core.datasetId,deviceId:'synthetic-human-durable'});s.humanLibraryJournal=new HumanLibrarySyncJournal(core);const input=await groups(a.core);for(const group of input)await s.humanLibraryJournal.receive(s,group);return {input,entryId:e.id};
 }
 if(command==='human-library-durable-ack'){
  const s=nativeStore('bns-human-durable');await s.finishFoundation();const core=new BrowserNativeSyncCore(s.repository,{datasetId:'synthetic-human-journal',deviceId:'synthetic-human-durable'});s.humanLibraryJournal=new HumanLibrarySyncJournal(core);const before=await snapshot(s);for(const group of args.input)assert.equal((await s.humanLibraryJournal.receive(s,group)).state,'duplicate');assert.deepEqual(await snapshot(s),before);const entry=await s.entry(args.entryId);assert.equal(entry.note,'SYNTHETIC durable note');assert.equal(entry.revision,1);assert.equal(before.meta.filter(x=>x.id.includes(':outbox:')).length,0);return {duplicate:true,noEcho:true,history:before.revisions.filter(x=>x.entityId===entry.id).length};
 }
 return previous.run(command,args);
}};
`;
}

function nativeHumanRoleFixture(source){
 if(typeof source!=='string')throw Error('HUMAN_ROLE_FIXTURE_REQUIRED');source=source.replace(/^import .*;\n/gm,'').replace('globalThis.IDBKeyRange=IDBKeyRange;','');
 const a=source.indexOf('async function fixture(device){'),b=source.indexOf('\nasync function snapshot',a);if(a<0||b<0)throw Error('HUMAN_ROLE_CONSTRUCTOR_CHANGED');source=source.slice(0,a)+`async function fixture(device){let tick=0;const allocations=[],s=nativeStore('bns-human-role-'+(++sequence),()=>new Date(Date.UTC(2026,9,9)+tick++).toISOString(),()=>{const id=crypto.randomUUID();allocations.push(id);return id;});await s.consent(true);await s.finishFoundation();const core=new BrowserNativeSyncCore(s.repository,{datasetId,deviceId:device});s.humanLibraryJournal=new HumanLibrarySyncJournal(core);return {s,core,allocations};}`+source.slice(b);
 const c=source.indexOf("const base=new URL('./fixtures/human-library-pre-role-reader/'"),d=source.indexOf("const source=await fixture('synthetic-new-role')",c);if(c<0||d<0)throw Error('HUMAN_ROLE_FROZEN_BRIDGE_CHANGED');source=source.slice(0,c)+source.slice(d);
 return `import {ensureThoughtTopicIndex} from '../core/thought-read-index.js';\nimport {portableHumanTopicIdentity} from '../core/browser-native-sync/human-library-identity.js';\nimport {invalidateThoughtTopicIndex as frozenInvalidate} from './bns-human-index-frozen/thought-read-index.js';\nimport {BrowserNativeSyncCore as PreRoleCore} from './bns-human-pre-role-frozen/extension/core/browser-native-sync/core.js';\n{\n${source}\n}`;
}

function nativeHumanAdditionalFixture(source,{imports,dataset,prefix,helpers=''}){
 if(typeof source!=='string')throw Error('HUMAN_ADDITIONAL_FIXTURE_REQUIRED');
 const actual=[...source.matchAll(/import [^;]+;/g)].map(row=>row[0]);if(actual.length!==imports.length||actual.some((row,index)=>row!==imports[index]))throw Error('HUMAN_ADDITIONAL_IMPORT_CHANGED');
 source=source.replace(/import [^;]+;/g,'').replace('globalThis.IDBKeyRange=IDBKeyRange;','');
 const a=source.indexOf('async function fixture(device){'),b=source.indexOf('\n',a);if(a<0||b<0)throw Error('HUMAN_ADDITIONAL_CONSTRUCTOR_CHANGED');
 source=source.slice(0,a)+`async function fixture(device){let tick=0;const s=nativeStore('${prefix}'+(++sequence),()=>new Date(Date.UTC(2026,9,9)+tick++).toISOString());await s.consent(true);await s.finishFoundation();const core=new BrowserNativeSyncCore(s.repository,{datasetId:${dataset},deviceId:device});s.humanLibraryJournal=new HumanLibrarySyncJournal(core);return {s,core};}`+source.slice(b);
 return `{\n${helpers}\n${source}\n}`;
}
function nativeHumanGroupFixture(source){
 const imports=["import test from 'node:test';","import assert from 'node:assert/strict';","import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';","import {LibraryDocumentsStore} from '../core/library-documents-store.js';","import {local} from './harness/thought-m1.mjs';","import {BrowserNativeSyncCore} from '../core/browser-native-sync/core.js';","import {HumanLibrarySyncJournal} from '../core/browser-native-sync/human-library-journal.js';","import {buildCheckpoint} from '../core/browser-native-sync/checkpoints.js';","import {GroupedCheckpointRestore} from '../core/browser-native-sync/group-checkpoint.js';","import {ArchiveError} from '../core/constants.js';","import {SourceBootstrapJournal} from '../core/browser-native-sync/source-bootstrap-journal.js';","import {InputWorkingSyncJournal} from '../core/browser-native-sync/input-working-journal.js';","import {FilterIntentSyncJournal} from '../core/browser-native-sync/filter-intent-journal.js';","import {capture,inputEdit} from './harness/thought-m1.mjs';"];
 const helpers=`const capture=(epoch,id='m1-synthetic-message-001',text='Synthetic explicit working input')=>({epoch,adapterVersion:'0.3.0',chat:{id:'m1-synthetic-chat',url:'https://chatgpt.com/c/m1-synthetic-chat',title:'Synthetic chat'},messages:[{sourceMessageId:id,pageOrder:1,originalText:text}]});
async function inputEdit(s,id,changes){const b=await s.input(id);return s.editDocument({operationId:crypto.randomUUID(),documentId:b.documentId,blocks:[{id,expectedRevision:b.revision,libraryText:b.libraryText,note:b.note,excluded:b.excluded,...changes}]});}`;
 return `import {GroupedCheckpointRestore} from '../core/browser-native-sync/group-checkpoint.js';\nimport {SourceBootstrapJournal} from '../core/browser-native-sync/source-bootstrap-journal.js';\nimport {InputWorkingSyncJournal} from '../core/browser-native-sync/input-working-journal.js';\nimport {FilterIntentSyncJournal} from '../core/browser-native-sync/filter-intent-journal.js';\n`+nativeHumanAdditionalFixture(source,{imports,dataset:'datasetId',prefix:'bns-human-group-',helpers});
}
function nativeHumanOrderFixture(source){
 const imports=["import test from 'node:test';","import assert from 'node:assert/strict';","import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';","import {LibraryDocumentsStore} from '../core/library-documents-store.js';","import {local} from './harness/thought-m1.mjs';","import {BrowserNativeSyncCore,sealOperation} from '../core/browser-native-sync/core.js';","import {HumanLibrarySyncJournal} from '../core/browser-native-sync/human-library-journal.js';","import {portableHumanEntity} from '../core/browser-native-sync/human-library-codec.js';","import {normalizePhysical} from '../core/browser-native-sync/human-library-journal.js';","import {humanWireRequestDigest,restoreHumanRequest} from '../core/browser-native-sync/human-library-request.js';","import {bytes,decodeJSON} from '../core/browser-native-sync/value.js';","import {hashText} from '../core/dedupe.js';"];
 return `import {portableHumanEntity} from '../core/browser-native-sync/human-library-codec.js';\nimport {normalizePhysical} from '../core/browser-native-sync/human-library-journal.js';\nimport {humanWireRequestDigest,restoreHumanRequest} from '../core/browser-native-sync/human-library-request.js';\nimport {bytes,decodeJSON} from '../core/browser-native-sync/value.js';\nimport {hashText} from '../core/dedupe.js';\n`+nativeHumanAdditionalFixture(source,{imports,dataset:"'synthetic-order-wire'",prefix:'bns-human-order-'});
}

function nativeHumanSearchFixture(source,{imports,prefix}){
 if(typeof source!=='string')throw Error('HUMAN_SEARCH_FIXTURE_REQUIRED');
 const actual=[...source.matchAll(/import [^;]+;/g)].map(row=>row[0]);if(actual.length!==imports.length||actual.some((row,index)=>row!==imports[index]))throw Error('HUMAN_SEARCH_IMPORT_CHANGED');
 source=source.replace(/import [^;]+;/g,'').replace('globalThis.IDBKeyRange=IDBKeyRange;','');
 const a=source.indexOf('async function fixture(deviceId){'),b=source.indexOf('\nasync function snapshot',a);if(a<0||b<0)throw Error('HUMAN_SEARCH_CONSTRUCTOR_CHANGED');
 source=source.slice(0,a)+`async function fixture(deviceId){let tick=0;const s=nativeStore('${prefix}'+(++sequence),()=>new Date(Date.UTC(2026,9,9)+tick++).toISOString());await s.consent(true);await s.finishFoundation();const core=new BrowserNativeSyncCore(s.repository,{datasetId:'synthetic-indexed-journal',deviceId});s.humanLibraryJournal=new HumanLibrarySyncJournal(core);return {s,core};}`+source.slice(b);
 return `{\n${source}\n}`;
}
function nativeHumanIndexedFixture(source){
 const imports=["import test from 'node:test';","import assert from 'node:assert/strict';","import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';","import {LibraryDocumentsStore} from '../core/library-documents-store.js';","import {local} from './harness/thought-m1.mjs';","import {BrowserNativeSyncCore} from '../core/browser-native-sync/core.js';","import {HumanLibrarySyncJournal} from '../core/browser-native-sync/human-library-journal.js';","import {searchBatch} from '../core/library-search.js';"];
 return `import {searchBatch} from '../core/library-search.js';\n`+nativeHumanSearchFixture(source,{imports,prefix:'bns-human-search-'});
}
function nativeHumanDerivedFixture(source){
 const imports=["import test from 'node:test';","import assert from 'node:assert/strict';","import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';","import {LibraryDocumentsStore} from '../core/library-documents-store.js';","import {local} from './harness/thought-m1.mjs';","import {BrowserNativeSyncCore,validateOperation} from '../core/browser-native-sync/core.js';","import {HumanLibrarySyncJournal} from '../core/browser-native-sync/human-library-journal.js';","import {validateHumanLibraryEntity} from '../core/browser-native-sync/human-library-codec.js';","import {digest} from '../core/browser-native-sync/value.js';"];
 return `import {validateOperation} from '../core/browser-native-sync/core.js';\nimport {validateHumanLibraryEntity} from '../core/browser-native-sync/human-library-codec.js';\n`+nativeHumanSearchFixture(source,{imports,prefix:'bns-human-derived-'});
}

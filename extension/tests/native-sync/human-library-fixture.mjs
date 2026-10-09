// Execute the owning current-family assertions with actual MV3 IndexedDB.
// Node-only immutable fixture hash checks run in the outer harness; here the
// same frozen actual readers still reject every operation/publication cut.
export function nativeHumanLibraryFixture(source,roleSource){
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
const assert={equal(a,b,label){if(a!==b)throw Error((label||'equal')+': '+JSON.stringify([a,b]));},notEqual(a,b,label){if(a===b)throw Error(label||'notEqual');},deepEqual(a,b,label){if(JSON.stringify(normalize(a))!==JSON.stringify(normalize(b)))throw Error((label||'deepEqual')+' mismatch');},ok(x,label){if(!x)throw Error(label||'truthy');},async rejects(p,expected){try{await p;}catch(e){check(e,expected);return;}throw Error('expected rejection');}};
let sequence=0;
function nativeStore(name,clock,uuid){const prefix=name+':',storage={async get(k){const all=await chrome.storage.local.get(null);if(k===null)return Object.fromEntries(Object.entries(all).filter(([key])=>key.startsWith(prefix)).map(([key,v])=>[key.slice(prefix.length),v]));return {[k]:all[prefix+k]};},async set(v){await chrome.storage.local.set(Object.fromEntries(Object.entries(v).map(([k,x])=>[prefix+k,x])));}};return new LibraryDocumentsStore(storage,{indexedDB,name,...(clock?{clock}:{}),...(uuid?{uuid}:{})});}
${source}
${nativeHumanRoleFixture(roleSource)}
const previous=globalThis.__bnsNative;
globalThis.__bnsNative={...previous,async run(command,args={}){
 if(command==='human-library-matrix'){const names=[];for(const item of cases){try{await item.fn();}catch(e){throw Error(item.name+': '+e.stack);}names.push(item.name);}return names;}
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

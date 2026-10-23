import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {LibraryFoundationStore} from '../core/thought-store.js';
import {local,capture,inputEdit} from './harness/thought-m1.mjs';
import {BrowserNativeSyncCore} from '../core/browser-native-sync/core.js';
import {SourceBootstrapJournal} from '../core/browser-native-sync/source-bootstrap-journal.js';
import {InputWorkingSyncJournal} from '../core/browser-native-sync/input-working-journal.js';
import {FilterIntentSyncJournal} from '../core/browser-native-sync/filter-intent-journal.js';
import {buildCheckpoint} from '../core/browser-native-sync/checkpoints.js';
import {LocalSyncRecoverySession} from '../core/browser-native-sync/recovery-session.js';
import {bytes} from '../core/browser-native-sync/value.js';
import {protocolObject} from '../core/browser-native-sync/segments.js';
import {GoogleDriveAppDataTransport,GOOGLE_APPDATA_SCOPE} from '../core/browser-native-sync/providers/google-drive.js';
globalThis.IDBKeyRange=IDBKeyRange;
const encode=x=>new TextEncoder().encode(typeof x==='string'?x:JSON.stringify(x));
const binding={subject:'SYNTHETIC_google_subject',clientId:'000000000000-synthetic.apps.googleusercontent.com',generation:'SYNTHETIC_generation',scopes:[GOOGLE_APPDATA_SCOPE]};
async function fresh(t,device='SYNTHETIC_device_A'){const s=new LibraryFoundationStore(local(),{indexedDB:new IDBFactory()});await s.consent(true);await s.finishFoundation();t.after(()=>s.repository.db?.close());return {s,core:new BrowserNativeSyncCore(s.repository,{datasetId:'SYNTHETIC_google_data',deviceId:device})};}
function fakeDrive(){
 const files=new Map(),requests=[];let next=0,lose=false;
 const request=async r=>{
  requests.push(r);const u=new URL(r.url);assert.equal(u.origin,'https://www.googleapis.com');assert.equal(r.binding.subject,binding.subject);assert.equal(r.headers.Authorization,undefined);assert.ok(r.maxResponseBytes<=262144||r.maxResponseBytes<=1024*1024);
  const respond=(body,status=200)=>({status,body:encode(body)});
  if(u.pathname==='/drive/v3/files/generateIds'){assert.equal(r.method,'GET');assert.equal(u.searchParams.get('space'),'appDataFolder');return respond({ids:[`SYNTHETIC_file_${++next}`]});}
  if(u.pathname==='/upload/drive/v3/files'){
   assert.equal(r.method,'POST');assert.equal(u.searchParams.get('uploadType'),'multipart');const boundary=r.headers['Content-Type'].split('boundary=')[1],text=new TextDecoder().decode(r.body),parts=text.split(`--${boundary}`);assert.equal(parts.length,4);
   const metadata=JSON.parse(parts[1].split('\r\n\r\n')[1].trim());assert.deepEqual(metadata.parents,['appDataFolder']);assert.equal(metadata.mimeType,'application/octet-stream');
   if(files.has(metadata.id))return respond({},409);
   const separator=encode('\r\n\r\n');let at=0,hits=0;for(;at<=r.body.length-separator.length;at++){if(separator.every((v,i)=>r.body[at+i]===v)&&++hits===2){at+=separator.length;break;}}
   const raw=r.body.slice(at,r.body.length-encode(`\r\n--${boundary}--\r\n`).length);files.set(metadata.id,{...metadata,spaces:['appDataFolder'],trashed:false,size:String(raw.length),raw});if(lose){lose=false;throw Error('SYNTHETIC lost POST response');}return respond({id:metadata.id});
  }
  if(u.pathname==='/drive/v3/files'){
   assert.equal(r.method,'GET');assert.equal(u.searchParams.get('spaces'),'appDataFolder');assert.equal(u.searchParams.has('orderBy'),false);const q=u.searchParams.get('q');assert.ok(q.includes('trashed = false'));
   let found=[...files.values()].filter(f=>f.appProperties?.paiaProtocol==='1');for(const match of q.matchAll(/key='([^']+)' and value='([^']+)'/g))found=found.filter(f=>f.appProperties[match[1]]===match[2]);
   const start=Number(u.searchParams.get('pageToken')||0),size=Number(u.searchParams.get('pageSize'));return respond({files:found.slice(start,start+size).map(({raw,...f})=>f),...(start+size<found.length?{nextPageToken:String(start+size)}:{})});
  }
  const id=u.pathname.slice('/drive/v3/files/'.length);assert.equal(r.method,'GET');assert.match(id,/^[A-Za-z0-9_-]+$/);const file=files.get(id);if(!file)return respond({},404);if(u.searchParams.get('alt')==='media')return {status:200,body:file.raw.slice()};const {raw,...metadata}=file;return respond(metadata);
 };
 return {files,requests,request,loseNextPost(){lose=true;}};
}
function adapter(core,cloud,options={}){return new GoogleDriveAppDataTransport(core,{binding,request:cloud.request,isCurrent:()=>true,...options});}
const object=()=>protocolObject('chunk',encode('SYNTHETIC exact bytes 中文\u0000'));

test('contained immutable publication and fresh discovery preserve exact bytes with durable retry ID',async t=>{
 const {core}=await fresh(t),cloud=fakeDrive(),transport=adapter(core,cloud),o=await object();await transport.putImmutable(o.ref,o.bytes);assert.deepEqual(await transport.get(o.ref),o.bytes);await adapter(core,cloud).putImmutable(o.ref,o.bytes);assert.equal(cloud.files.size,1);assert.equal(cloud.requests.filter(r=>r.method==='POST').length,1);assert.equal(cloud.requests.filter(r=>r.url.includes('generateIds')).length,1);
});
test('lost create completion survives adapter/core restart without allocating or uploading a second object',async t=>{
 const {core,s}=await fresh(t),cloud=fakeDrive(),o=await object();cloud.loseNextPost();await assert.rejects(adapter(core,cloud).putImmutable(o.ref,o.bytes),{code:'BNS_PROVIDER_COMPLETION_UNKNOWN'});assert.equal(cloud.files.size,1);
 const restarted=new BrowserNativeSyncCore(s.repository,{datasetId:core.datasetId,deviceId:core.deviceId});await adapter(restarted,cloud).putImmutable(o.ref,o.bytes);assert.equal(cloud.requests.filter(r=>r.method==='POST').length,1);assert.equal(cloud.requests.filter(r=>r.url.includes('generateIds')).length,1);
});
test('wrong bytes are rejected before any remote request or local allocation',async t=>{
 const {core}=await fresh(t),cloud=fakeDrive(),o=await object(),before=await core.transaction(false,t=>t.all('meta'));await assert.rejects(adapter(core,cloud).putImmutable(o.ref,new Uint8Array(o.bytes.length)),{code:'BNS_OBJECT_INTEGRITY'});assert.equal(cloud.requests.length,0);assert.deepEqual(await core.transaction(false,t=>t.all('meta')),before);
});
for(const mutation of ['spaces','dataset','bytes','size','kind'])test('reject remote '+mutation+' corruption and preserve foreign objects',async t=>{
 const {core}=await fresh(t),cloud=fakeDrive(),o=await object(),transport=adapter(core,cloud);await transport.putImmutable(o.ref,o.bytes);const row=[...cloud.files.values()][0];
 if(mutation==='spaces')row.spaces=['drive'];if(mutation==='dataset')row.appProperties.paiaDataset='f'.repeat(64);if(mutation==='bytes')row.raw[0]^=1;if(mutation==='size')row.size='999999999';if(mutation==='kind')row.appProperties.paiaKind='descriptor';
 await assert.rejects(transport.get(o.ref));assert.equal(cloud.files.size,1);assert.equal(cloud.requests.filter(r=>['DELETE','PATCH','PUT'].includes(r.method)).length,0);
});
for(const code of [401,403,429,500,404])test('HTTP '+code+' maps safely with no hidden retry',async t=>{
 const {core}=await fresh(t),cloud=fakeDrive(),o=await object();let calls=0;const transport=adapter(core,cloud,{request:async()=>{calls++;return {status:code,body:encode({message:'SYNTHETIC secret must not surface'})};}});await assert.rejects(transport.get(o.ref),e=>e.code.startsWith('BNS_PROVIDER_')&&!e.message.includes('secret'));assert.equal(calls,1);
});
test('account generation changes while request is held fence late bytes; close settles a held host',async t=>{
 const {core}=await fresh(t),cloud=fakeDrive(),o=await object();let current=true,release,arrive;const entered=new Promise(r=>arrive=r),hold=new Promise(r=>release=r);const transport=adapter(core,cloud,{isCurrent:()=>current,request:async r=>{arrive();await hold;return cloud.request(r);}});const p=transport.get(o.ref);await entered;current=false;release();await assert.rejects(p,{code:'BNS_PROVIDER_BINDING_CHANGED'});
 const second=adapter(core,cloud,{request:()=>new Promise(()=>{})});const pending=second.get(o.ref);await new Promise(r=>setImmediate(r));second.close();await assert.rejects(pending,{code:'BNS_PROVIDER_BINDING_CHANGED'});
});
test('held host times out once and cannot trigger a blind write retry',async t=>{
 const {core}=await fresh(t),cloud=fakeDrive(),o=await object();let calls=0;const transport=adapter(core,cloud,{requestTimeoutMs:20,request:()=>{calls++;return new Promise(()=>{});}});await assert.rejects(transport.get(o.ref),{code:'BNS_PROVIDER_COMPLETION_UNKNOWN'});assert.equal(calls,1);
});
test('checkpoint pagination, invalid cursor and incomplete listing are bounded',async t=>{
 const {core}=await fresh(t),cloud=fakeDrive(),transport=adapter(core,cloud);for(let i=0;i<3;i++){const o=await protocolObject('checkpoint-manifest',bytes({magic:'PAIA-BNS',protocol:1,kind:'checkpoint-manifest',datasetId:core.datasetId,clientEncryption:'none',root:null,level:0,itemCount:0,chain:'0'.repeat(64),coverage:[],parents:[String(i).repeat(64)],ownerScope:{version:1,profile:'bounded-admitted-local-owners',families:[]}}));await transport.putImmutable(o.ref,o.bytes);}
 const page=await transport.listCheckpoints({limit:2});assert.equal(page.items.length,2);assert.ok(page.nextCursor);assert.equal((await transport.listCheckpoints({limit:2,cursor:page.nextCursor})).items.length,1);await assert.rejects(transport.listCheckpoints({cursor:'\n'}),{code:'BNS_PROVIDER_PAGE_INVALID'});
 const incomplete=adapter(core,cloud,{request:async()=>({status:200,body:encode({files:[],incompleteSearch:true})})});await assert.rejects(incomplete.listCheckpoints(),{code:'BNS_PROVIDER_PAGE_INVALID'});
});
test('core namespace swap invalidates transport and never reuses another generation allocation',async t=>{
 const {core}=await fresh(t),cloud=fakeDrive(),transport=adapter(core,cloud),o=await object();await transport.putImmutable(o.ref,o.bytes);const n=cloud.requests.length;await core.transaction(true,t=>t.put('meta',{id:core.prefix+'active',namespace:'SYNTHETIC_restored_namespace'}));await assert.rejects(transport.get(o.ref),{code:'BNS_PROVIDER_BINDING_CHANGED'});assert.equal(cloud.requests.length,n);
});
test('Google contained seam publishes canonical checkpoint; sender closes; fresh B uses original recovery owner',async t=>{
 const a=await fresh(t),b=await fresh(t,'SYNTHETIC_device_B'),cloud=fakeDrive(),out=adapter(a.core,cloud);a.s.sourceBootstrapJournal=new SourceBootstrapJournal(a.core);await a.s.capture(capture((await a.s.status()).epoch));a.s.filterIntentJournal=new FilterIntentSyncJournal(a.core);a.s.inputWorkingJournal=new InputWorkingSyncJournal(a.core,{filterJournal:a.s.filterIntentJournal,logicalCommits:true});const input=(await a.s.snapshot()).library.blocks[0];await inputEdit(a.s,input.id,{note:'SYNTHETIC exact Google retained note 中文'});
 await buildCheckpoint(a.core,out,{grouped:{store:a.s}});const expected=await a.s.snapshot();out.close();a.s.repository.db.close();a.s.repository.db=null;
 const session=new LocalSyncRecoverySession(b.core,{store:b.s,transport:adapter(b.core,cloud)});assert.equal((await session.recoverDiscovered()).state,'restored');const actual=await b.s.snapshot();assert.deepEqual(actual.records,expected.records);assert.deepEqual(actual.library.blocks,expected.library.blocks);assert.equal(a.s.repository.db,null);assert.equal(cloud.requests.some(r=>r.url.includes('permissions')||r.url.includes('changes')),false);
});

test('broad scopes, credential-bearing binding and injected list query are refused',async t=>{
 const {core}=await fresh(t),cloud=fakeDrive();for(const bad of [{...binding,scopes:[...binding.scopes,'https://www.googleapis.com/auth/drive']},{...binding,token:'SYNTHETIC forbidden token'},{...binding,subject:'bad subject'}])assert.throws(()=>adapter(core,cloud,{binding:bad}),{code:'BNS_PROVIDER_BINDING'});
 await assert.rejects(adapter(core,cloud).listCheckpoints({ref:{id:"x' or trashed=true"}}),{code:'BNS_PROVIDER_PAGE_INVALID'});assert.equal(cloud.requests.length,0);
});
test('concurrent publishers atomically share durable allocation; create collision requires exact readback',async t=>{
 const {core,s}=await fresh(t),other=new BrowserNativeSyncCore(s.repository,{datasetId:core.datasetId,deviceId:core.deviceId}),cloud=fakeDrive(),o=await object();await Promise.all([adapter(core,cloud).putImmutable(o.ref,o.bytes),adapter(other,cloud).putImmutable(o.ref,o.bytes)]);assert.equal(cloud.files.size,1);assert.deepEqual(await adapter(core,cloud).get(o.ref),o.bytes);
});
test('lost local reservation commit acknowledgement cannot publish before durable identity is recovered',async t=>{
 const {core}=await fresh(t),cloud=fakeDrive(),o=await object(),transaction=core.transaction.bind(core);let once=true;core.transaction=async(write,...args)=>{const result=await transaction(write,...args);if(write&&once){once=false;throw Error('SYNTHETIC lost local commit response');}return result;};
 await assert.rejects(adapter(core,cloud).putImmutable(o.ref,o.bytes));assert.equal(cloud.requests.filter(r=>r.method==='POST').length,0);await adapter(core,cloud).putImmutable(o.ref,o.bytes);assert.equal(cloud.requests.filter(r=>r.url.includes('generateIds')).length,1);assert.equal(cloud.files.size,1);
});
test('oversized host response is refused before a copy or JSON parse',async t=>{
 const {core}=await fresh(t),cloud=fakeDrive(),o=await object();let copies=0;const raw=new Uint8Array(262145);raw.slice=()=>{copies++;throw Error('must not copy');};await assert.rejects(adapter(core,cloud,{request:async()=>({status:200,body:raw})}).get(o.ref),{code:'BNS_PROVIDER_RESPONSE_INVALID'});assert.equal(copies,0);
});

for(const id of ['', ' ', 'https://000000000000.apps.googleusercontent.com', '000000000000.apps.googleusercontent.com\n', '1'.repeat(256)])test('reject invalid OAuth client ID shape '+JSON.stringify(id.slice(0,55)),async t=>{const {core}=await fresh(t),cloud=fakeDrive();assert.throws(()=>adapter(core,cloud,{binding:{...binding,clientId:id}}),{code:'BNS_PROVIDER_BINDING'});assert.equal(cloud.requests.length,0);});

for(const action of ['close','identity'])test('held committed POST '+action+' remains unknown and reuses original durable ID',async t=>{
 const {core}=await fresh(t),cloud=fakeDrive(),o=await object();let current=true,release,arrive;const held=new Promise(r=>release=r),entered=new Promise(r=>arrive=r);
 const transport=adapter(core,cloud,{isCurrent:()=>current,request:async r=>{const response=await cloud.request(r);if(r.method==='POST'){arrive();await held;}return response;}});
 const pending=transport.putImmutable(o.ref,o.bytes);await entered;assert.equal(cloud.files.size,1);if(action==='close')transport.close();else current=false;release();await assert.rejects(pending,{code:'BNS_PROVIDER_COMPLETION_UNKNOWN'});current=true;
 await adapter(core,cloud).putImmutable(o.ref,o.bytes);assert.equal(cloud.requests.filter(r=>r.method==='POST').length,1);assert.equal(cloud.requests.filter(r=>r.url.includes('generateIds')).length,1);
});

test('one public operation has a total deadline; slow empty pages cannot multiply the timeout',async t=>{
 const {core}=await fresh(t),cloud=fakeDrive(),o=await object();let calls=0;const transport=adapter(core,cloud,{requestTimeoutMs:35,request:async()=>{calls++;await new Promise(r=>setTimeout(r,20));return {status:200,body:encode({files:[],nextPageToken:String(calls)})};}});await assert.rejects(transport.get(o.ref),e=>['BNS_PROVIDER_COMPLETION_UNKNOWN','BNS_PROVIDER_RESOURCE_LIMIT'].includes(e.code));assert.ok(calls<=2);
});
test('aggregate received bytes stop bounded pages before an unbounded rescan',async t=>{
 const {core}=await fresh(t),cloud=fakeDrive(),o=await object();let calls=0;const transport=adapter(core,cloud,{request:async()=>({status:200,body:encode({files:[],nextPageToken:String(++calls),unused:'x'.repeat(250000)})})});await assert.rejects(transport.get(o.ref),{code:'BNS_PROVIDER_RESOURCE_LIMIT'});assert.equal(calls,9);
});

for(const allowed of [404,409])test('allowed '+allowed+' response still enforces its byte ceiling before parse or write progress',async t=>{
 const {core}=await fresh(t),cloud=fakeDrive(),o=await object();let copies=0;const raw=new Uint8Array(65537);raw.slice=()=>{copies++;throw Error('must not copy');};
 const request=async r=>{if(allowed===404&&/files\/SYNTHETIC_file_/.test(r.url)||allowed===409&&r.method==='POST')return {status:allowed,body:raw};return cloud.request(r);};await assert.rejects(adapter(core,cloud,{request}).putImmutable(o.ref,o.bytes),{code:'BNS_PROVIDER_RESPONSE_INVALID'});assert.equal(copies,0);assert.equal(cloud.files.size,0);
});

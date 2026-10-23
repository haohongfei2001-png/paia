import test from 'node:test';
import assert from 'node:assert/strict';
import {createGoogleDriveHttpCapability} from '../core/browser-native-sync/providers/google-drive-http.js';
import {GOOGLE_APPDATA_SCOPE,GoogleDriveAppDataTransport} from '../core/browser-native-sync/providers/google-drive.js';
import {protocolObject} from '../core/browser-native-sync/segments.js';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {LibraryFoundationStore} from '../core/thought-store.js';
import {local} from './harness/thought-m1.mjs';
import {BrowserNativeSyncCore} from '../core/browser-native-sync/core.js';
globalThis.IDBKeyRange=IDBKeyRange;
const binding={subject:'SYNTHETIC_subject',clientId:'000000000000-synthetic.apps.googleusercontent.com',generation:'SYNTHETIC_generation',scopes:[GOOGLE_APPDATA_SCOPE]},encode=x=>new TextEncoder().encode(x);
const grant=()=>({binding,accessToken:'SYNTHETIC-token-never-live',expiresAt:Date.now()+60000});
const req=(controller=new AbortController())=>({method:'GET',url:'https://www.googleapis.com/drive/v3/files/generateIds?count=1&space=appDataFolder&type=files',body:null,headers:{},binding,signal:controller.signal,maxResponseBytes:65536});
const response=(r,body='{"ids":["SYNTHETIC_file"]}',options={})=>({status:200,url:r.url,redirected:false,type:'basic',headers:new Headers(),body:new ReadableStream({start(c){c.enqueue(encode(body));c.close();}}),...options});
const capability=(options={})=>createGoogleDriveHttpCapability({binding,isCurrent:()=>true,authorize:async()=>grant(),fetchImpl:async r=>response(r),...options});

test('ephemeral authorization uses exact binding and restrictive native Request settings',async()=>{
 let calls=0;const http=capability({authorize:async b=>{assert.deepEqual(b,binding);return grant();},fetchImpl:async r=>{calls++;assert.equal(r.headers.get('Authorization'),'Bearer SYNTHETIC-token-never-live');assert.equal(r.credentials,'omit');assert.equal(r.redirect,'error');assert.equal(r.cache,'no-store');assert.equal(r.referrerPolicy,'no-referrer');return response(r);}});const result=await http(req());assert.equal(result.status,200);assert.match(new TextDecoder().decode(result.body),/SYNTHETIC_file/);assert.equal(calls,1);assert.equal(Object.hasOwn(result,'accessToken'),false);
});
for(const mode of ['redirect','url','opaque','length'])test('reject and cancel unsafe HTTP '+mode+' before buffering',async()=>{
 let cancelled=0;const http=capability({fetchImpl:async r=>response(r,'',{body:new ReadableStream({cancel(){cancelled++;}}),...(mode==='redirect'?{redirected:true}:mode==='url'?{url:'https://evil.example/'}:mode==='opaque'?{type:'opaque'}:{headers:new Headers({'Content-Length':'65537'})})})});await assert.rejects(http(req()));await new Promise(r=>setImmediate(r));assert.equal(cancelled,1);
});
test('stream byte limit works without Content-Length and never copies the oversized chunk',async()=>{
 let copies=0,cancelled=0;const chunk=new Uint8Array(65537);chunk.slice=()=>{copies++;throw Error('must not copy');};const http=capability({fetchImpl:async r=>response(r,'',{body:new ReadableStream({start(c){c.enqueue(chunk);},cancel(){cancelled++;}})})});await assert.rejects(http(req()),{code:'BNS_PROVIDER_HTTP_LIMIT'});await new Promise(r=>setImmediate(r));assert.equal(copies,0);assert.equal(cancelled,1);
});
test('chunked exact-limit response copies only admitted bytes',async()=>{
 const r=req();r.maxResponseBytes=4;const http=capability({fetchImpl:async request=>response(request,'',{body:new ReadableStream({start(c){c.enqueue(new Uint8Array([0,1]));c.enqueue(new Uint8Array([2,255]));c.close();}})})});assert.deepEqual((await http(r)).body,new Uint8Array([0,1,2,255]));
});
for(const mode of ['expired','identity','scope','newline','exception'])test('invalid credential '+mode+' makes zero fetches and exposes no secret',async()=>{
 let calls=0;const http=capability({authorize:async()=>{const g=grant();if(mode==='exception')throw Error('SYNTHETIC-secret');if(mode==='expired')g.expiresAt=0;if(mode==='identity')g.binding={...binding,subject:'another_subject'};if(mode==='scope')g.binding={...binding,scopes:['https://www.googleapis.com/auth/drive']};if(mode==='newline')g.accessToken='SYNTHETIC\nsecret';return g;},fetchImpl:async()=>{calls++;throw Error('must not fetch');}});await assert.rejects(http(req()),e=>e.code.startsWith('BNS_')&&!e.message.includes('secret'));assert.equal(calls,0);
});
test('aborted held issuer never sends a late token',async()=>{
 let release,arrive,calls=0;const controller=new AbortController(),entered=new Promise(r=>arrive=r),held=new Promise(r=>release=r),http=capability({authorize:async()=>{arrive();await held;return grant();},fetchImpl:async()=>{calls++;throw Error('must not fetch');}});const pending=http(req(controller));await entered;controller.abort();await assert.rejects(pending,{code:'BNS_PROVIDER_BINDING_CHANGED'});release();await new Promise(r=>setImmediate(r));assert.equal(calls,0);
});
test('aborted held fetch cancels its late response body',async()=>{
 let release,arrive,cancelled=0;const controller=new AbortController(),entered=new Promise(r=>arrive=r),held=new Promise(r=>release=r),http=capability({fetchImpl:async r=>{arrive();await held;return response(r,'',{body:new ReadableStream({cancel(){cancelled++;}})});}});const pending=http(req(controller));await entered;controller.abort();await assert.rejects(pending);release();await new Promise(r=>setImmediate(r));assert.equal(cancelled,1);
});
test('abort during stalled body read settles and cancels without waiting for stream cancel completion',async()=>{
 let arrive,cancelled=0;const controller=new AbortController(),entered=new Promise(r=>arrive=r),http=capability({fetchImpl:async r=>response(r,'',{body:new ReadableStream({pull(){arrive();return new Promise(()=>{});},cancel(){cancelled++;return new Promise(()=>{});}},{highWaterMark:0})})});const pending=http(req(controller));await entered;controller.abort();await assert.rejects(pending,{code:'BNS_PROVIDER_BINDING_CHANGED'});await new Promise(r=>setImmediate(r));assert.equal(cancelled,1);
});
for(const url of ['https://evil.example/drive/v3/files','https://www.googleapis.com/drive/v3/about','https://www.googleapis.com/drive/v3/files?spaces=drive','https://www.googleapis.com/drive/v3/files/SYNTHETIC_file?alt=media&alt=media'])test('reject uncontained endpoint before issuer '+url,async()=>{
 let issued=0;const http=capability({authorize:async()=>{issued++;return grant();}});await assert.rejects(http({...req(),url}),{code:'BNS_PROVIDER_HTTP_REQUEST'});assert.equal(issued,0);
});
test('adapter consumes actual bounded HTTP capability, including staged-ID create/readback',async t=>{
 const store=new LibraryFoundationStore(local(),{indexedDB:new IDBFactory()});await store.consent(true);await store.finishFoundation();t.after(()=>store.repository.db.close());const core=new BrowserNativeSyncCore(store.repository,{datasetId:'SYNTHETIC_http_dataset',deviceId:'SYNTHETIC_http_device'});let row=null,raw=null,posts=0;
 const http=capability({fetchImpl:async r=>{const u=new URL(r.url);if(u.pathname.endsWith('/generateIds'))return response(r);if(u.pathname==='/drive/v3/files')return response(r,JSON.stringify({files:row?[row]:[]}));if(r.method==='POST'){posts++;const data=new Uint8Array(await r.arrayBuffer()),text=new TextDecoder().decode(data),boundary=r.headers.get('content-type').split('boundary=')[1],parts=text.split(`--${boundary}`);row={...JSON.parse(parts[1].split('\r\n\r\n')[1].trim()),spaces:['appDataFolder'],trashed:false};raw=encode(parts[2].split('\r\n\r\n')[1].slice(0,-2));row.size=String(raw.length);return response(r,JSON.stringify({id:row.id}));}if(!row)return response(r,'{}',{status:404});return u.searchParams.get('alt')==='media'?response(r,new TextDecoder().decode(raw)):response(r,JSON.stringify(row));}});
 const transport=new GoogleDriveAppDataTransport(core,{binding,isCurrent:()=>true,request:http}),o=await protocolObject('chunk',encode('SYNTHETIC bytes 中文'));await transport.putImmutable(o.ref,o.bytes);assert.deepEqual(await transport.get(o.ref),o.bytes);assert.equal(posts,1);
});

test('fetch settlement and abort in one turn still cancel the unassigned response body',async()=>{
 let cancelled=0;const controller=new AbortController(),http=capability({fetchImpl:async r=>{const answer=response(r,'',{body:new ReadableStream({cancel(){cancelled++;}})});queueMicrotask(()=>controller.abort());return answer;}});await assert.rejects(http(req(controller)),{code:'BNS_PROVIDER_BINDING_CHANGED'});await new Promise(r=>setImmediate(r));assert.equal(cancelled,1);
});
test('empty HTTP error body retains status without inventing a parse error',async()=>{const result=await capability({fetchImpl:async r=>response(r,'',{status:401,body:null})})(req());assert.equal(result.status,401);assert.equal(result.body.length,0);});
test('stream exception is sanitized and cancelled without revealing secret text',async()=>{
 const http=capability({fetchImpl:async r=>response(r,'',{body:new ReadableStream({pull(c){c.error(Error('SYNTHETIC-sensitive-host-failure'));}})})});await assert.rejects(http(req()),e=>e.code==='BNS_PROVIDER_COMPLETION_UNKNOWN'&&!e.message.includes('sensitive'));
});
test('caller Authorization and query injection never reach the credential issuer',async()=>{
 let issued=0;const http=capability({authorize:async()=>{issued++;return grant();}});await assert.rejects(http({...req(),headers:{Authorization:'SYNTHETIC caller token'}}),{code:'BNS_PROVIDER_HTTP_REQUEST'});
 const u=new URL('https://www.googleapis.com/drive/v3/files');u.search=new URLSearchParams({spaces:'appDataFolder',q:"trashed = false and appProperties has { key='paiaProtocol' and value='1' } and appProperties has { key='paiaDataset' and value='"+'a'.repeat(64)+"' } or trashed = true",pageSize:'100',fields:'nextPageToken,incompleteSearch,files(id,name,mimeType,spaces,trashed,size,appProperties)'});await assert.rejects(http({...req(),url:u.href}),{code:'BNS_PROVIDER_HTTP_REQUEST'});assert.equal(issued,0);
});

test('request cannot swap URL or headers while credential issuer is pending',async()=>{
 let release,arrive,seen;const held=new Promise(r=>release=r),entered=new Promise(r=>arrive=r),r=req(),original=r.url,http=capability({authorize:async()=>{arrive();await held;return grant();},fetchImpl:async outgoing=>{seen=outgoing;return response(outgoing);}});const pending=http(r);await entered;r.url='https://evil.example/';r.headers.Authorization='SYNTHETIC swapped';r.binding={...binding,subject:'other_subject'};release();await pending;assert.equal(seen.url,original);assert.equal(seen.headers.get('Authorization'),'Bearer SYNTHETIC-token-never-live');
});
test('zero-byte stream cannot evade the bounded read count',async()=>{
 let cancelled=0;const http=capability({fetchImpl:async r=>response(r,'',{body:new ReadableStream({pull(c){c.enqueue(new Uint8Array());},cancel(){cancelled++;}})})});await assert.rejects(http(req()),{code:'BNS_PROVIDER_HTTP_LIMIT'});await new Promise(r=>setImmediate(r));assert.equal(cancelled,1);
});

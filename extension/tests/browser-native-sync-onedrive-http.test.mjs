import test from 'node:test';
import assert from 'node:assert/strict';
import {createOneDriveHttpCapability} from '../core/browser-native-sync/providers/onedrive-http.js';
import {ONEDRIVE_APPFOLDER_SCOPE,OneDriveAppFolderTransport} from '../core/browser-native-sync/providers/onedrive.js';
import {protocolObject} from '../core/browser-native-sync/segments.js';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {LibraryFoundationStore} from '../core/thought-store.js';
import {local} from './harness/thought-m1.mjs';
import {BrowserNativeSyncCore} from '../core/browser-native-sync/core.js';
globalThis.IDBKeyRange=IDBKeyRange;
const binding={subject:'SYNTHETIC_subject',tenantId:'9188040d-6c67-4c5b-b112-36a304b66dad',clientId:'00000000-0000-0000-0000-000000000001',generation:'SYNTHETIC_generation',scopes:[ONEDRIVE_APPFOLDER_SCOPE]},encode=x=>new TextEncoder().encode(x);
const grant=()=>({binding,accessToken:'SYNTHETIC-token-never-live',expiresAt:Date.now()+60000});
const req=(controller=new AbortController())=>({method:'GET',authorization:'graph',url:'https://graph.microsoft.com/v1.0/me/drive/special/approot?$select=id,folder,specialFolder,parentReference',body:null,headers:{},binding,signal:controller.signal,maxResponseBytes:65536});
const response=(r,body='{"ids":["SYNTHETIC_file"]}',options={})=>({status:200,url:r.url,redirected:false,type:'basic',headers:new Headers(),body:new ReadableStream({start(c){c.enqueue(encode(body));c.close();}}),...options});
const capability=(options={})=>createOneDriveHttpCapability({binding,isCurrent:()=>true,authorize:async()=>grant(),fetchImpl:async r=>response(r),...options});

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
for(const url of ['https://evil.example/drive/v3/files','https://graph.microsoft.com/v1.0/me/drive/root/children','https://graph.microsoft.com/v1.0/users/other/drive/special/approot','https://graph.microsoft.com/v1.0/me/drive/special/approot?$select=id&$select=id'])test('reject uncontained endpoint before issuer '+url,async()=>{
 let issued=0;const http=capability({authorize:async()=>{issued++;return grant();}});await assert.rejects(http({...req(),url}),{code:'BNS_PROVIDER_HTTP_REQUEST'});assert.equal(issued,0);
});
test('fetch settlement and abort in one turn still cancel the unassigned response body',async()=>{
 let cancelled=0;const controller=new AbortController(),http=capability({fetchImpl:async r=>{const answer=response(r,'',{body:new ReadableStream({cancel(){cancelled++;}})});queueMicrotask(()=>controller.abort());return answer;}});await assert.rejects(http(req(controller)),{code:'BNS_PROVIDER_BINDING_CHANGED'});await new Promise(r=>setImmediate(r));assert.equal(cancelled,1);
});
test('empty HTTP error body retains status without inventing a parse error',async()=>{const result=await capability({fetchImpl:async r=>response(r,'',{status:401,body:null})})(req());assert.equal(result.status,401);assert.equal(result.body.length,0);});
test('stream exception is sanitized and cancelled without revealing secret text',async()=>{
 const http=capability({fetchImpl:async r=>response(r,'',{body:new ReadableStream({pull(c){c.error(Error('SYNTHETIC-sensitive-host-failure'));}})})});await assert.rejects(http(req()),e=>e.code==='BNS_PROVIDER_COMPLETION_UNKNOWN'&&!e.message.includes('sensitive'));
});
test('request cannot swap URL or headers while credential issuer is pending',async()=>{
 let release,arrive,seen;const held=new Promise(r=>release=r),entered=new Promise(r=>arrive=r),r=req(),original=r.url,http=capability({authorize:async()=>{arrive();await held;return grant();},fetchImpl:async outgoing=>{seen=outgoing;return response(outgoing);}});const pending=http(r);await entered;r.url='https://evil.example/';r.headers.Authorization='SYNTHETIC swapped';r.binding={...binding,subject:'other_subject'};release();await pending;assert.equal(seen.url,original);assert.equal(seen.headers.get('Authorization'),'Bearer SYNTHETIC-token-never-live');
});
test('zero-byte stream cannot evade the bounded read count',async()=>{
 let cancelled=0;const http=capability({fetchImpl:async r=>response(r,'',{body:new ReadableStream({pull(c){c.enqueue(new Uint8Array());},cancel(){cancelled++;}})})});await assert.rejects(http(req()),{code:'BNS_PROVIDER_HTTP_LIMIT'});await new Promise(r=>setImmediate(r));assert.equal(cancelled,1);
});

for(const method of ['GET','PUT'])test('preauthenticated '+method+' assets never request or send Graph token',async()=>{
 let issued=0,seen;const controller=new AbortController(),r={...req(controller),authorization:'none',method,url:method==='GET'?'https://synthetic.files.1drv.com/a?secret=synthetic':'https://synthetic.up.1drv.com/a?secret=synthetic',body:method==='GET'?null:new Uint8Array([1,2]),headers:method==='GET'?{}:{'Content-Length':'2','Content-Range':'bytes 0-1/2'}};
 const result=await capability({authorize:async()=>{issued++;throw Error('must not issue');},fetchImpl:async request=>{seen=request;return response(request,'{}');}})(r);assert.equal(issued,0);assert.equal(seen.headers.has('authorization'),false);assert.equal(result.status,200);assert.equal(seen.credentials,'omit');assert.equal(seen.redirect,'error');
});
for(const mode of ['bearer','wrong-host','wrong-kind','wrong-range'])test('signed asset '+mode+' rejected before token or fetch',async()=>{
 let issued=0,fetched=0;const r={...req(),authorization:'none',method:'PUT',url:'https://synthetic.up.1drv.com/a',body:new Uint8Array([1,2]),headers:{'Content-Length':'2','Content-Range':'bytes 0-1/2'}};if(mode==='bearer')r.headers.Authorization='SECRET';if(mode==='wrong-host')r.url='https://synthetic.up.1drv.com.evil.example/a';if(mode==='wrong-kind')r.url='https://synthetic.files.1drv.com/a';if(mode==='wrong-range')r.headers['Content-Range']='bytes 1-2/3';await assert.rejects(capability({authorize:()=>{issued++;return grant();},fetchImpl:()=>{fetched++;}})(r),{code:'BNS_PROVIDER_HTTP_REQUEST'});assert.equal(issued,0);assert.equal(fetched,0);
});
test('exact transport composes bounded native Request HTTP with unsigned upload/download and immutable readback',async t=>{
 const store=new LibraryFoundationStore(local(),{indexedDB:new IDBFactory()});await store.consent(true);await store.finishFoundation();t.after(()=>store.repository.db.close());const core=new BrowserNativeSyncCore(store.repository,{datasetId:'SYNTHETIC_http_dataset',deviceId:'SYNTHETIC_http_device'});let row=null,raw=null,name=null,puts=0,issued=0;
 const http=capability({authorize:async()=>{issued++;return grant();},fetchImpl:async r=>{const u=new URL(r.url);if(u.hostname==='synthetic.up.1drv.com'){assert.equal(r.headers.has('authorization'),false);puts++;raw=new Uint8Array(await r.arrayBuffer());row={id:'SYNTHETIC_file',name,size:raw.length,file:{},parentReference:{id:'SYNTHETIC_root',driveId:'SYNTHETIC_drive'},eTag:'SYNTHETIC_tag','@microsoft.graph.downloadUrl':'https://synthetic.files.1drv.com/SYNTHETIC_file'};return response(r,JSON.stringify(row),{status:201});}if(u.hostname==='synthetic.files.1drv.com'){assert.equal(r.headers.has('authorization'),false);return response(r,new TextDecoder().decode(raw));}assert.equal(r.headers.get('authorization'),'Bearer SYNTHETIC-token-never-live');if(u.pathname.endsWith('/special/approot'))return response(r,JSON.stringify({id:'SYNTHETIC_root',folder:{},specialFolder:{name:'approot'},parentReference:{driveId:'SYNTHETIC_drive'}}));if(r.method==='POST'){name=(await r.json()).item.name;return response(r,JSON.stringify({uploadUrl:'https://synthetic.up.1drv.com/SYNTHETIC_upload',expirationDateTime:new Date(Date.now()+60000).toISOString()}));}return row?response(r,JSON.stringify(row)):response(r,'{}',{status:404});}});
 const transport=new OneDriveAppFolderTransport(core,{binding,isCurrent:()=>true,request:http}),o=await protocolObject('chunk',encode('SYNTHETIC bytes 中文'));await transport.putImmutable(o.ref,o.bytes);assert.deepEqual(await transport.get(o.ref),o.bytes);assert.equal(puts,1);assert.ok(issued>0);
});

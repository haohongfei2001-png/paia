import test from 'node:test';
import assert from 'node:assert/strict';
import entry from '../api/declarations.mjs';
import {createDeclarationHandler,parseDeclarationRequest} from '../client-declaration-entry.mjs';
import {clientDeclarationHash} from '../client-declaration.mjs';
import {createClientDeclarationTransport} from '../../../extension/core/ai-usage/client-declaration-transport.js';
import {declarationPublisherFixture} from './client-declaration-fixtures.mjs';
const http=(f,action='publish',body)=>new Request('https://synthetic.invalid/api/declarations',{method:'POST',headers:{'content-type':'application/json'},body:body??JSON.stringify({action,...f.bundle,declaration:f.declaration})});
const closed=r=>{assert.equal(r.financialAuthority,false);assert.equal(r.dispatchAllowed,false);assert.equal(r.retryAllowed,false);};
test('actual default declarations API is closed independently of reservation configuration',async()=>{
 const f=declarationPublisherFixture();const response=await entry.fetch(http(f));assert.equal(response.status,503);closed(await response.json());assert.equal(response.headers.get('cache-control'),'no-store');
});
test('strict declaration HTTP parser accepts only metadata and two signed proofs',async()=>{
 const f=declarationPublisherFixture(),result=await parseDeclarationRequest(http(f));assert.deepEqual(result.bundle,f.bundle);assert.deepEqual(result.declaration,f.declaration);assert.equal(result.action,'publish');
});
test('malformed routes, duplicates, bodies, server facts and financial commands reach no publisher',async()=>{
 const f=declarationPublisherFixture(),handler=createDeclarationHandler({publisher:f.publisher}),valid=JSON.stringify({action:'publish',...f.bundle,declaration:f.declaration});
 for(const body of [valid.replace('{','{"action":"revoke",'),valid.replace('{','{"act\\u0069on":"revoke",'),valid.replace('"declaration":{','"declaration":{"payloadDigest":"x",'),valid.replace('{','{"publisher":true,'),valid.replace('{','{"authorized":true,'),valid.replace('{','{"payload":{"text":"PRIVATE"},'),valid.replace('"publish"','"reserve"'),valid.replace('"publish"','"settle"'),valid.replace('"publish"','"record"'),valid.replace('"declaration":{','"declaration":{"nested":{},'),valid+'{}'])assert.equal((await handler(http(f,'publish',body))).status,400);
 for(const url of ['https://synthetic.invalid/api/reservations','https://synthetic.invalid/api/declarations?role=publisher'])assert.equal((await handler(new Request(url,{method:'POST',headers:{'content-type':'application/json'},body:valid}))).status,404);
 assert.equal(f.protocol.calls.length,0);
});
test('unbranded or stale async publisher cannot mint request authority',async()=>{
 const f=declarationPublisherFixture();let called=0;
 for(const handler of [createDeclarationHandler({publisher:{publish(){called++;}}}),createDeclarationHandler({resolvePublisher:async()=>({publisher:f.publisher,isCurrent:()=>false})}),createDeclarationHandler({resolvePublisher:async()=>({publisher:f.publisher,isCurrent:async()=>true})})])assert.equal((await handler(http(f))).status,503);
 assert.equal(called,0);assert.equal(f.protocol.calls.length,0);
});
test('actual metadata fetch transport to HTTP publisher authenticates and preserves immutable request generation',async()=>{
 const f=declarationPublisherFixture(),handler=createDeclarationHandler({publisher:f.publisher});let calls=0;
 const transport=createClientDeclarationTransport({endpoint:'https://synthetic.invalid/api/declarations',fetch:r=>{calls++;return handler(r);}});
 const first=await transport.publish(f.bundle,f.declaration);assert.equal(first.decision,'published');assert.equal(first.generation,clientDeclarationHash(f.declaration));closed(first);
 assert.equal((await transport.publish(f.bundle,{...f.declaration,payloadDigest:'3'.repeat(64)})).decision,'deny');
 assert.equal((await transport.revoke(f.bundle,f.declaration)).decision,'revoked');assert.equal((await transport.publish(f.bundle,f.declaration)).decision,'deny');assert.equal(calls,4);assert.equal(f.rows().get(f.bundle.request.operationId).authorized,false);
});
test('signed-proof mismatch denies and lost COMMIT stays unknown through both HTTP boundaries',async()=>{
 const f=declarationPublisherFixture('http-unknown',{hook:({sql,save})=>{if(sql==='COMMIT'){save();throw Error('PRIVATE COMMIT LOSS');}}}),handler=createDeclarationHandler({publisher:f.publisher}),transport=createClientDeclarationTransport({endpoint:'https://synthetic.invalid/api/declarations',fetch:handler});
 const forged={...f.bundle,request:{...f.bundle.request,principalId:'other'}};assert.equal((await transport.publish(forged,{...f.declaration,requestHash:'3'.repeat(64)})).decision,'deny');
 const result=await transport.publish(f.bundle,f.declaration);assert.equal(result.decision,'outcome_unknown');closed(result);assert.equal(f.protocol.calls.filter(x=>x.sql==='COMMIT').length,1);assert.equal(f.protocol.calls.some(x=>x.sql==='ROLLBACK'),false);assert.equal(JSON.stringify(result).includes('PRIVATE'),false);
});
test('transport rejects false ACK, response authority, oversize and malformed bytes without retry',async()=>{
 const f=declarationPublisherFixture(),ok={decision:'published',requestHash:f.declaration.requestHash,generation:clientDeclarationHash(f.declaration),issuedAt:1,expiresAt:2,financialAuthority:false,dispatchAllowed:false,retryAllowed:false};
 for(const response of [Response.json(ok,{status:503}),Response.json({...ok,dispatchAllowed:true}),Response.json({...ok,generation:'bad'}),Response.json({...ok,body:'PRIVATE'}),new Response('x'.repeat(4097)),new Response(new Uint8Array([0xff]))]){
  let calls=0;const transport=createClientDeclarationTransport({endpoint:'https://synthetic.invalid/api/declarations',fetch:()=>{calls++;return response;}});assert.equal((await transport.publish(f.bundle,f.declaration)).decision,'outcome_unknown');assert.equal(calls,1);
 }
 let getter=0;assert.equal(createClientDeclarationTransport({get endpoint(){getter++;return 'https://synthetic.invalid/api/declarations';}}),null);assert.equal(getter,0);
});
test('public metadata transport refuses body-bearing, missing or nested requests before fetch',async()=>{
 const f=declarationPublisherFixture();let calls=0;const transport=createClientDeclarationTransport({endpoint:'https://synthetic.invalid/api/declarations',fetch:()=>{calls++;return Response.json({});}});
 const absent={...f.bundle.request};delete absent.jobId;
 for(const request of [{body:'SYNTHETIC_PRIVATE_BODY'},{...f.bundle.request,body:'SYNTHETIC_PRIVATE_BODY'},{...f.bundle.request,jobId:{text:'SYNTHETIC_PRIVATE_BODY'}},absent,{...f.bundle.request,inputTokens:'100'},{...f.bundle.request,jobId:'x'.repeat(201)}]){
  assert.equal((await transport.publish({...f.bundle,request},f.declaration)).decision,'deny');assert.equal((await transport.revoke({...f.bundle,request},f.declaration)).decision,'deny');
 }
 assert.equal(calls,0);
});

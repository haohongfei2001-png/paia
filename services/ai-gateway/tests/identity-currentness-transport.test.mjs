import test from 'node:test';
import assert from 'node:assert/strict';
import {identityChannelFixture} from './identity-currentness-fixture.mjs';
import {createClientIdentityCurrentnessTransport,readClientIdentityCurrentnessConnection} from '../../../extension/core/ai-usage/client-identity-currentness-transport.js';
const tick=()=>new Promise(r=>setImmediate(r)),url='https://synthetic.invalid/api/identity-currentness';
async function wire(t,{mutate,headers,status=200,hold=false}={}){
 const f=identityChannelFixture();t.after(f.close);const original=await f.primary.open(f.bundle,{signal:new AbortController().signal}),identity=structuredClone(original.identity);original.close();
 let controller,at=f.now,cancelled=0,fetches=0,request;
 const initial={version:1,type:'ready',sequence:0,identity,financialAuthority:false,dispatchAllowed:false,retryAllowed:false};mutate?.(initial);
 const encode=v=>new TextEncoder().encode(typeof v==='string'?v:JSON.stringify(v)+'\n');
 const tr=createClientIdentityCurrentnessTransport({endpoint:url,clock:()=>at,fetch:r=>{request=r;fetches++;return new Response(new ReadableStream({start(c){controller=c;if(!hold)c.enqueue(encode(initial));},cancel(){cancelled++;}}),{status,headers:headers??{'content-type':'application/x-ndjson; charset=utf-8'}});}});t.after(()=>tr.dispose());
 return {f,tr,initial,setClock:n=>at=n,now:()=>at,open:()=>tr.open(f.bundle),send:v=>controller.enqueue(encode(v)),raw:bytes=>controller.enqueue(bytes),end:()=>controller.close(),error:()=>controller.error(Error('SYNTHETIC')),cancelled:()=>cancelled,fetches:()=>fetches,request:()=>request};
}
for(const invalid of [
 {tier:'enterprise'},{principalId:'foreign'},{libraryId:'foreign'},{operationId:'foreign'},{jobType:'AI_ASSIST'},
 {requestHash:'f'.repeat(64)},{principalGeneration:''},{entitlementGeneration:''},{authorityGeneration:''},
 {observedAt:Date.UTC(2099,0,1)},{verifiedUntil:0},{verifiedUntil:Date.UTC(2099,0,1)},{unexpected:true}
])test('malformed channel identity '+JSON.stringify(invalid)+' never becomes current',async t=>{
 const w=await wire(t,{mutate:v=>Object.assign(v.identity,invalid)});assert.equal(await w.open(),null);assert.equal(w.fetches(),1);assert.equal(w.cancelled(),1);
});
for(const kind of ['duplicate key','second ready','wrong sequence','extra pulse field','bad UTF8','unterminated','oversize'])test('a current channel closes on '+kind+' without refreshing identity',async t=>{
 const w=await wire(t),c=await w.open();assert.ok(c?.isCurrent());
 if(kind==='duplicate key')w.send('{"version":1,"type":"pulse","sequence":1,"sequence":1}\n');
 if(kind==='second ready')w.send({...w.initial,sequence:1});
 if(kind==='wrong sequence')w.send({version:1,type:'pulse',sequence:2});
 if(kind==='extra pulse field')w.send({version:1,type:'pulse',sequence:1,verifiedUntil:w.f.now+120000});
 if(kind==='bad UTF8')w.raw(new Uint8Array([0xff,0x0a]));
 if(kind==='unterminated'){w.send('{"version":1');w.end();}
 if(kind==='oversize')w.send('x'.repeat(2049));
 await tick();assert.equal(c.isCurrent(),false);assert.equal(w.fetches(),1);
});
test('pulse cannot extend original expiry and 3 second silence expires even before a delayed timer runs',async t=>{
 const w=await wire(t),c=await w.open(),i=readClientIdentityCurrentnessConnection(c,w.tr).identity;
 w.setClock(w.f.now+2000);w.send({version:1,type:'pulse',sequence:1});await tick();assert.equal(c.isCurrent(),true);assert.equal(readClientIdentityCurrentnessConnection(c,w.tr).identity,i);
 w.setClock(w.f.now+5000);assert.equal(c.isCurrent(),false);assert.equal(w.fetches(),1);
 const second=await wire(t),c2=await second.open();second.setClock(second.f.now+60000);second.send({version:1,type:'pulse',sequence:1});await tick();assert.equal(c2.isCurrent(),false);
});
test('wall clock rollback retires rather than extending observed identity',async t=>{
 const w=await wire(t),c=await w.open();w.setClock(w.f.now-1);assert.equal(c.isCurrent(),false);w.setClock(w.f.now);assert.equal(c.isCurrent(),false);
});
for(const boundary of ['end','error','dispose'])test(boundary+' immediately retires an already returned connection',async t=>{
 const w=await wire(t),c=await w.open();let invalidated=0;c.onInvalidate(()=>invalidated++);if(boundary==='end')w.end();else if(boundary==='error')w.error();else w.tr.dispose();await tick();assert.equal(c.isCurrent(),false);assert.equal(invalidated,1);
});
for(const header of [{'content-type':'application/json'},{'content-type':'application/x-ndjson','content-length':'500'},{'content-type':'application/x-ndjson','content-encoding':'gzip'}])test('wrong stream metadata '+JSON.stringify(header)+' denies',async t=>{
 const w=await wire(t,{headers:header});assert.equal(await w.open(),null);assert.equal(w.cancelled(),1);
});
test('no valid first frame expires and aborts the exact request',async t=>{
 const w=await wire(t,{hold:true});t.mock.timers.enable({apis:['setTimeout']});const pending=w.open();while(!w.request())await tick();t.mock.timers.tick(5000);assert.equal(await pending,null);assert.equal(w.request().signal.aborted,true);assert.equal(w.cancelled(),1);
});
test('unsafe endpoint and accessor configuration are rejected before any getter or request',()=>{
 for(const endpoint of [null,'http://synthetic.invalid/api/identity-currentness','https://u:p@synthetic.invalid/api/identity-currentness','https://synthetic.invalid/api/operation-status','https://synthetic.invalid/api/identity-currentness?q=x'])assert.equal(createClientIdentityCurrentnessTransport({endpoint}),null);
 let read=0;const options={get endpoint(){read++;return url;}};assert.equal(createClientIdentityCurrentnessTransport(options),null);assert.equal(read,0);
});

test('abort-ignoring held fetches retain transport capacity until their original promises settle',async t=>{
 const f=identityChannelFixture();t.after(f.close);t.mock.timers.enable({apis:['setTimeout']});let sends=0;const held=[];
 const tr=createClientIdentityCurrentnessTransport({endpoint:url,clock:()=>f.now,fetch:()=>{sends++;return new Promise(resolve=>held.push(resolve));}});t.after(()=>tr.dispose());
 for(let round=0;round<4;round++){
  const before=sends;let settled=0;const batch=Array.from({length:8},()=>tr.open(f.bundle).then(v=>{settled++;return v;}));
  while(sends-before+settled<8)await tick();t.mock.timers.tick(5000);assert.ok((await Promise.all(batch)).every(v=>v===null));
 }
 assert.equal(sends,8,'an aborted but unresolved fetch still owns its resource slot');
 for(const resolve of held)resolve(Response.json({denied:true},{status:503}));await tick();
 const next=tr.open(f.bundle);while(sends<9)await tick();t.mock.timers.tick(5000);assert.equal(await next,null);assert.equal(sends,9);held.at(-1)(Response.json({denied:true},{status:503}));
});

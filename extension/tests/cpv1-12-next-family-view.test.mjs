import test from 'node:test';
import assert from 'node:assert/strict';
import {completeFixture,rows} from './harness/original-complete.mjs';
import {PromptReuseService} from '../core/prompt-reuse-service.js';
import {NextFamilyView,NEXT_FAMILY_VIEW_TTL} from '../core/next-family-view.js';
import {matchNextFamily} from '../core/next-family-matcher.js';
import {key} from '../core/memory/model.js';
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const reply={completed:true,text:'Next, ask me to explain sorting.',blocks:1,excluded:false};
async function fixture(){const f=await completeFixture({texts:['explain sorting','explain sorting']});let now=100;f.service=new PromptReuseService(f.s,{clock:()=>now});f.time=n=>{now=n;};return f;}
test('actual explicit query warms exact Family DTO; cold reads do no IO and warm reads only generation',async()=>{
 const f=await fixture(),before={...f.s.repository.metrics};assert.equal((await f.service.nextFamilyView()).available,false);assert.deepEqual(f.s.repository.metrics,before);
 const q=await f.service.query(),metrics={...f.s.repository.metrics},v=await f.service.nextFamilyView();assert.equal(v.available,true);assert.equal(v.items[0].id,q.items[0].id);assert.equal(matchNextFamily(reply,v).type,'PROMPT_FAMILY_MATCH');
 assert.equal(f.s.repository.metrics.scans,metrics.scans);assert.equal(f.s.repository.metrics.reads,metrics.reads+1);assert.equal(f.s.repository.metrics.writes,metrics.writes);
 v.items[0].text='caller mutation';assert.equal((await f.service.nextFamilyView()).items[0].text,'explain sorting');
 f.time(100+NEXT_FAMILY_VIEW_TTL);assert.equal((await f.service.nextFamilyView()).available,false);
 await f.service.query();f.time(0);assert.equal((await f.service.nextFamilyView()).available,false);assert.equal(f.requests.length,0);
});
for(const action of ['edit','hide','exclude','purge'])test('actual '+action+' invalidates another service warm view without rebuilding',async()=>{
 const f=await fixture(),q=await f.service.query(),other=new PromptReuseService(f.s);
 if(action==='edit'||action==='hide')await other.change({action,id:q.items[0].id,revision:q.revision,...(action==='edit'?{text:'explain graphs'}:{})});
 if(action==='exclude')await f.s.repository.transaction(true,t=>t.put('meta',{id:key('input',q.items[0].members[0]),kind:'input',version:1,inputId:q.items[0].members[0],excluded:true}));
 if(action==='purge')for(const row of await rows(f.s,'records'))await f.s.permanentDelete(row.id);
 const scans=f.s.repository.metrics.scans;assert.equal((await f.service.nextFamilyView()).available,false);assert.equal(f.s.repository.metrics.scans,scans);
});
test('failed newer query and reversed query completion cannot revive prior cache',async()=>{
 const f=await fixture(),snapshot=await f.service.snapshot(),a=deferred(),b=deferred();let calls=0;
 f.service.snapshot=()=>++calls===1?a.promise:b.promise;
 const first=f.service.query(),second=f.service.query();b.reject(Error('synthetic failed read'));await assert.rejects(second);a.resolve(snapshot);await first;assert.equal((await f.service.nextFamilyView()).available,false);
});
test('generation qualification awaiting old query cannot expose replaced projection',async()=>{
 const f=await fixture();await f.service.query();const held=deferred();f.service.assertCurrent=()=>held.promise;
 const read=f.service.nextFamilyView();await f.service.query();held.resolve();assert.equal((await read).available,false);
});
const family=(i,text='explain sorting')=>({id:'pf:'+i.toString(16).padStart(64,'0'),text,useful:true,hidden:false});
for(const [name,families,available] of [
 ['full bound',Array.from({length:64},(_,i)=>family(i)),true],
 ['too many',Array.from({length:65},(_,i)=>family(i)),false],
 ['long text',[family(0,'a'.repeat(2049))],false],
 ['byte total',Array.from({length:12},(_,i)=>family(i,'文'.repeat(2048))),false]
])test('view bound '+name+' never truncates',async()=>{const v=new NextFamilyView(()=>10);v.publish(v.begin(),{families,generation:1});const result=await v.read(async()=>{});assert.equal(result.available,available);if(available)assert.equal(result.items.length,64);});
test('generation rejection or expiry during qualification clears old view',async()=>{
 let now=1;const v=new NextFamilyView(()=>now);v.publish(v.begin(),{families:[family(1)],generation:1});assert.equal((await v.read(async()=>{throw Error('stale');})).available,false);
 v.publish(v.begin(),{families:[family(1)],generation:1});assert.equal((await v.read(async()=>{now+=NEXT_FAMILY_VIEW_TTL;})).available,false);
});
test('older successful query cannot replace newer projection and hidden explicit query never warms hidden rows',async()=>{
 const f=await fixture(),q=await f.service.query();await f.service.change({action:'hide',id:q.items[0].id,revision:q.revision});
 const hidden=await f.service.query({includeHidden:true});assert.equal(hidden.items.length,1);assert.deepEqual((await f.service.nextFamilyView()).items,[]);
 const snapshot=await f.service.snapshot(),a=deferred(),b=deferred();let calls=0;f.service.snapshot=()=>++calls===1?a.promise:b.promise;
 const first=f.service.query(),second=f.service.query();b.resolve(snapshot);await second;
 a.resolve({...snapshot,families:[family(1,'explain old')]});await first;assert.deepEqual((await f.service.nextFamilyView()).items,[]);
});
test('unavailable generation read refuses cached bytes; successful query cannot make a restart warm',async()=>{
 const f=await fixture();await f.service.query();assert.equal((await new PromptReuseService(f.s).nextFamilyView()).available,false);
 f.service.assertCurrent=async()=>{throw Error('synthetic unavailable storage');};assert.equal((await f.service.nextFamilyView()).available,false);
});

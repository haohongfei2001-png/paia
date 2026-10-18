import test from 'node:test';
import assert from 'node:assert/strict';
import {assistServiceFixture} from './assist-client-fixture.mjs';
const rows=s=>s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all([...t.tx.objectStoreNames].map(async n=>[n,await t.all(n)]))));
test('Assist boundary: a new explicit action can retry the same reply after proven prepublication cancellation',async t=>{
 const f=await assistServiceFixture(t),ai=f.commands.session.foundation,write=ai.write.bind(ai);let cancelled=false;
 ai.write=async fn=>{let staged=false;const result=await write(async tx=>{const put=tx.put.bind(tx);tx.put=async(table,row)=>{if(table==='meta'&&row.id==='aiu:assist-service-preflight:v1')staged=true;return put(table,row);};return fn(tx);});if(staged&&!cancelled){cancelled=true;await f.rpc({type:'assist_cancel'});}return result;};
 await assert.rejects(f.run());assert.equal(f.calls.length,0);assert.equal(f.physical(),0);assert.equal((await rows(f.s)).meta.some(x=>x.id==='aiu:assist-service-preflight:v1'||x.id.startsWith('aiu:assist-reply-session:v1:')),false);
 let result,error;try{result=await f.run();}catch(e){error=e.code;}assert.equal(error,undefined);assert.equal((await rows(f.s)).organizerJobs.length,1);assert.equal((await rows(f.s)).organizerJobs[0].cancelEpoch,0);
 assert.equal(result?.kind,'SUGGESTION');assert.equal(f.physical(),1);
});
test('Assist boundary: authenticated source closure during proof acquisition cannot reach physical provider',async t=>{
 const f=await assistServiceFixture(t),readProofs=f.configuration.readProofs;let changed=false;
 // This controls the original profile callback because createAssistServiceClient
 // captures callbacks at construction; restart rebuilds the original composition.
 f.configuration.readProofs=async(...args)=>{const result=await readProofs(...args);f.surfaceState.open=false;changed=true;return result;};await f.restart();f.ready(true);
 let error;try{await f.run();}catch(e){error=e.code;}assert.ok(error);assert.equal(changed,true);assert.equal(f.physical(),0);
});

test('Assist final physical-send fence rejects source closure after the original dispatch record has committed',async t=>{
 const f=await assistServiceFixture(t),ai=f.commands.session.foundation,write=ai.write.bind(ai);let changed=false;
 ai.write=async fn=>{let dispatch=false;const result=await write(async tx=>{const put=tx.put.bind(tx);tx.put=async(table,row)=>{if(table==='meta'&&row.id.startsWith('aiu:dispatched:'))dispatch=true;return put(table,row);};return fn(tx);});if(dispatch&&!changed){changed=true;f.surfaceState.open=false;}return result;};
 await assert.rejects(f.run());assert.equal(changed,true);assert.equal(f.physical(),0);assert.equal(f.calls.some(x=>x.path==='/api/provider'),false);assert.equal((await rows(f.s)).organizerUsage[0].attemptCount,1,'the original possibly-started dispatch remains recorded');
});

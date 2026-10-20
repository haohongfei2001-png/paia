import test from 'node:test';
import assert from 'node:assert/strict';
import {createMaintenanceRunner,readMaintenanceRunnerSession} from '../core/ai-usage/maintenance-runner.js';

test('default-null original runner exposes no promotion session and performs no store or body read',async()=>{
 let touches=0;const store=new Proxy({}, {get(){touches++;throw Error('unqualified runner must not inspect a store');}}),runner=createMaintenanceRunner(store,null);
 assert.equal(readMaintenanceRunnerSession(runner,store),null);assert.equal(touches,0);assert.equal((await runner.wake()).state,'UNAVAILABLE');assert.equal(touches,0);
 runner.dispose();assert.throws(()=>readMaintenanceRunnerSession(runner,store),e=>e.code==='UNAVAILABLE');assert.equal(touches,0);
});
test('copied, claimed and foreign-store runner identities cannot expose a session',()=>{
 const store={},runner=createMaintenanceRunner(store,null);
 for(const fake of [{...runner},{session:{}},Object.create(runner),null])assert.throws(()=>readMaintenanceRunnerSession(fake,store),e=>e.code==='UNAVAILABLE');
 let reads=0;const foreign=new Proxy({}, {get(){reads++;throw Error('foreign store cannot be touched');}});assert.throws(()=>readMaintenanceRunnerSession(runner,foreign),e=>e.code==='UNAVAILABLE');assert.equal(reads,0);runner.dispose();
});

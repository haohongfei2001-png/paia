// Isolated GC assertion: no browser, network, live provider or real credentials.
import assert from 'node:assert/strict';
import {fixture} from './qwen-foundation-service.mjs';
assert.equal(typeof globalThis.gc,'function');
async function collect(){for(let i=0;i<8;i++){await new Promise(r=>setTimeout(r,5));globalThis.gc();}}
async function complete(f){const result=await f.dispatch(0),ref=new WeakRef(result.value);await f.commit(0);return ref;}
const completed=await fixture();await completed.prepare();const output=await complete(completed);
// Even a caller retaining the provider plus its live original owner must not
// retain a fulfilled private response or the former immutable body handle.
await collect();assert.equal(output.deref(),undefined);assert.equal(completed.boundRefs[0].deref(),undefined);assert.equal((await completed.ai.status(completed.job.id)).state,'COMMITTED');
const unsent=await fixture();await unsent.prepare();unsent.owners[0].owner.dispose();
await collect();assert.equal(unsent.boundRefs[0].deref(),undefined);assert.equal((await unsent.providers[0].execute(unsent.owners[0].input.childIdentity)).accepted,false);assert.equal(unsent.calls.filter(c=>c.path==='/api/provider').length,0);
console.log('retirement assertions passed');

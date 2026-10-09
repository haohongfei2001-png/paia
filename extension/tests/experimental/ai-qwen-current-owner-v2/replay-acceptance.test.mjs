// Explicit future acceptance only: do not run until the separately reviewed
// current manifest is frozen on accepted main. No skipped/pending-as-PASS fallback.
import test,{after} from 'node:test';import assert from 'node:assert/strict';
import {openCurrentSuite,closeCurrentSuite,replayShort,protectedControl,unknownControl} from './replay.mjs';
const cap=await openCurrentSuite();
let networkAttempts=0;const previous=new Map();
for(const name of ['fetch','WebSocket','XMLHttpRequest']){previous.set(name,Object.getOwnPropertyDescriptor(globalThis,name));Object.defineProperty(globalThis,name,{configurable:true,writable:true,value:function(){networkAttempts++;throw Error('OFFLINE_NETWORK_FORBIDDEN');}});}
after(()=>{closeCurrentSuite(cap);for(const [name,descriptor]of previous){if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];}assert.equal(networkAttempts,0,'zero real network attempts in the entire actual-owner acceptance file');});
test('nine current actual-owner short replays preserve all three styles and identical evidence',async()=>{try{for(const id of ['SYN-T01','SYN-T02','SYN-T03']){const evidence=[];for(const style of ['original','balanced','concise']){const r=await replayShort(cap,id,style);assert.equal(r.result.quality,'NOT_RUN');assert.ok(r.entryReadback.length>0);evidence.push(r.evidenceDigest);}assert.equal(new Set(evidence).size,1);}}catch(error){closeCurrentSuite(cap);throw error;}});
test('actual protected projection refuses refresh without another attempt',async()=>{assert.equal((await protectedControl(cap)).state,'STALE_BASE');});
test('actual unknown result keeps original attempt and cannot redispatch or publish',async()=>{try{assert.equal((await unknownControl(cap)).state,'OUTCOME_UNKNOWN');}finally{closeCurrentSuite(cap);}});

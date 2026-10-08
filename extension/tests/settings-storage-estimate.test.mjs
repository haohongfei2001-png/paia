import test from 'node:test';
import assert from 'node:assert/strict';
import {refreshStorage,subscribeStorageEstimate,storageSummaryText,storageEstimateText} from '../ui/r6-settings.js';
test('the existing storage estimate owner publishes only the latest read and retains unknown/error distinctions',async()=>{
 const prior=Object.getOwnPropertyDescriptor(globalThis,'navigator'),pending=[],seen=[];Object.defineProperty(globalThis,'navigator',{configurable:true,value:{storage:{estimate:()=>new Promise((resolve,reject)=>pending.push({resolve,reject}))}}});const unsubscribe=subscribeStorageEstimate(value=>seen.push(value));
 try{const older=refreshStorage(),newer=refreshStorage();pending[1].resolve({usage:1048576,quota:3145728});await newer;assert.equal(storageSummaryText(seen.at(-1),true),'1.0 MiB');assert.match(storageEstimateText(seen.at(-1),true),/2.0 MiB available/);pending[0].resolve({usage:0,quota:0});await older;assert.equal(seen.at(-1).usage,1048576,'late read cannot overwrite current browser evidence');
 const failed=refreshStorage();pending[2].reject(Error('private failure'));await failed;assert.deepEqual(seen.at(-1),{state:'error',usage:null,quota:null});assert.equal(storageSummaryText(seen.at(-1),true),'Unavailable');
 const missing=refreshStorage();pending[3].resolve({quota:3145728});await missing;assert.equal(storageSummaryText(seen.at(-1),true),'Unknown');assert.equal(seen.at(-1).usage,null,'missing usage is never zero');
 const zero=refreshStorage();pending[4].resolve({usage:0,quota:3145728});await zero;assert.equal(storageSummaryText(seen.at(-1),false),'0.0 MiB');assert.equal(storageSummaryText({state:'loading'},true),'Reading…');
 }finally{unsubscribe();if(prior)Object.defineProperty(globalThis,'navigator',prior);else delete globalThis.navigator;}
});

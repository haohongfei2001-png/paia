import test from 'node:test';
import assert from 'node:assert/strict';
import {captureMaintenanceProcessingReceipt,assertMaintenanceProcessingReceiptFacts} from '../core/ai-usage/maintenance-processing-receipt.js';
import {createMaintenanceProcessingDenyCell,bindMaintenanceProcessingRawDenials} from '../core/ai-usage/maintenance-processing-denial.js';

for(const key of ['repository','db'])test('original bound receipt pure tail rejects replacement '+key+' accessor without calling it',()=>{
 const database={},repository={db:database},store={repository},caller=Object.freeze({}),controller=new AbortController(),scope=Object.freeze({purpose:'SYNTHETIC original source scope'}),raw=Object.freeze({version:1,store,caller,scope,epoch:'SYNTHETIC-source-first',processing:true,expiresAt:Date.now()+30000,revocationSignal:controller.signal}),issued=new WeakSet([raw]);
 const processing=Object.freeze({resolve:async()=>raw,isCurrent:(r,s)=>issued.has(r)&&s===store});bindMaintenanceProcessingRawDenials(raw,store,[createMaintenanceProcessingDenyCell({store,repository,database,signals:[controller.signal]})]);captureMaintenanceProcessingReceipt(raw,{processing,store,caller,scope});
 let reads=0;Object.defineProperty(key==='repository'?store:repository,key,{get(){reads++;return key==='repository'?repository:database;},configurable:true});
 assert.throws(()=>assertMaintenanceProcessingReceiptFacts(raw,store));assert.equal(reads,0);
});

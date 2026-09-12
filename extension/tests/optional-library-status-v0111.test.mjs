import test from 'node:test';
import assert from 'node:assert/strict';
import {boundedLocalRead,readOptionalLibraryStatus,libraryReadFailureText} from '../ui/optional-library-status.js';

test('optional local RPCs retain successful siblings when one fails',async()=>{
 const calls=[];const result=await readOptionalLibraryStatus(async type=>{calls.push(type);if(type==='GET_AI_PRESENTATION_STATUS')throw Error('PRIVATE_BODY_MUST_NOT_ESCAPE');return {safe:true};});
 assert.equal(calls.length,5);assert.deepEqual(result.unavailable,['ai']);assert.equal(Object.keys(result.values).length,4);assert.ok(!JSON.stringify(result).includes('PRIVATE'));
});
test('hanging optional RPC settles without publishing its late result',async()=>{
 let late;const result=await readOptionalLibraryStatus(type=>type==='GET_AI_PRESENTATION_STATUS'?new Promise(resolve=>late=resolve):Promise.resolve({safe:true}),{timeoutMs:15});
 assert.deepEqual(result.unavailable,['ai']);late({private:'late'});await new Promise(resolve=>setTimeout(resolve,1));assert.ok(!result.values.ai);
});
test('navigation invalidates all optional response publication',async()=>{
 let current=true;const task=readOptionalLibraryStatus(async()=>{await new Promise(resolve=>setTimeout(resolve,5));return {};},{isCurrent:()=>current});current=false;assert.equal(await task,null);
});
test('synchronous transport failure and missing result are safely unavailable',async()=>{
 assert.deepEqual(await boundedLocalRead(()=>{throw Error('secret');}),{ok:false,reason:'unavailable'});
 const result=await readOptionalLibraryStatus(async()=>undefined);assert.equal(result.unavailable.length,5);
});
test('cold and retained read failures make different claims',()=>{
 assert.match(libraryReadFailureText(false),/尚未获得/);assert.doesNotMatch(libraryReadFailureText(false),/内容保留|仍显示/);
 assert.match(libraryReadFailureText(true),/上次成功读取/);assert.match(libraryReadFailureText(true),/尚未确认最新状态/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './harness/consumer-ai-browser.mjs';
import {FakeChatGPT} from './harness/fake-chatgpt.mjs';

for(const closeRejects of [false,true])test('consumer setup failure closes only its owned browser and preserves the original error'+(closeRejects?' when cleanup also rejects':''),async()=>{
 const original=Error('SYNTHETIC original setup failure'),cleanup=Error('SYNTHETIC owned cleanup failure'),startDescriptor=Object.getOwnPropertyDescriptor(FakeChatGPT,'start'),errorDescriptor=Object.getOwnPropertyDescriptor(console,'error');
 let starts=0,closes=0,clicks=0;const diagnostics=[];
 const owned={archive:{locator(selector){assert.equal(selector,'#enable-consent');return {async click(){clicks++;throw original;}};}},async close(){closes++;if(closeRejects)throw cleanup;}};
 Object.defineProperty(FakeChatGPT,'start',{...startDescriptor,value:async options=>{starts++;assert.equal(options.headless,true);return owned;}});
 Object.defineProperty(console,'error',{...errorDescriptor,value:(...args)=>diagnostics.push(args)});
 try{
  await assert.rejects(fixture('source'),error=>error===original,'neither setup nor cleanup may replace the original failure object');
  assert.deepEqual({starts,clicks,closes},{starts:1,clicks:1,closes:1},'setup failure must not leak its browser, retry startup or open a fallback');
  assert.deepEqual(diagnostics,closeRejects?[['CONSUMER_FIXTURE_CLEANUP_FAILURE',cleanup.name]]:[]);
 }finally{Object.defineProperty(FakeChatGPT,'start',startDescriptor);Object.defineProperty(console,'error',errorDescriptor);}
});

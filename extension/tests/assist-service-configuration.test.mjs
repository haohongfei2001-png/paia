import test from 'node:test';
import assert from 'node:assert/strict';
import {createConfiguredAssistSession} from '../core/ai-usage/configured-assist-session.js';
import {readAssistServiceConfiguration} from '../core/ai-usage/assist-service-configuration.js';
test('actual Assist composition is source-owned and unconfigured service fails closed',()=>{
 assert.equal(readAssistServiceConfiguration(),null);
 assert.equal(createConfiguredAssistSession({},{}),null);
});

import {AssistPromptCommands} from '../background/prompt-assist.js';
import {setup} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
test('actual default-off worker owner refuses page configuration and remote activation with no service',async()=>{
 const {s}=await setup(OrganizerStore),values={},id='synthetic-extension';let sends=0;
 const api={runtime:{id,getURL:p=>'chrome-extension://'+id+'/'+p,sendMessage:async()=>{}},storage:{session:{get:async k=>({[k]:values[k]}),set:async r=>Object.assign(values,r)}},tabs:{get:async()=>({url:'https://chatgpt.com/c/synthetic',active:true}),query:async()=>[],sendMessage:async()=>{sends++;return {};}}};
 const commands=new AssistPromptCommands(s,api),settings={id,url:api.runtime.getURL('ui/archive.html')},host={id,url:'https://chatgpt.com/c/synthetic',frameId:0,documentId:'synthetic-document',documentLifecycle:'active',tab:{id:1}};
 assert.deepEqual(Object.fromEntries(Object.entries(await commands.handle({type:'PAIA_PROMPT_ASSIST_STATUS'},settings)).filter(([k])=>k!=='generation')),{replyAccess:false,remoteProcessing:false,serviceAvailable:false});
 await assert.rejects(commands.handle({type:'PAIA_PROMPT_ASSIST_CONFIGURE',replyAccess:true,remoteProcessing:true},host),{code:'FORBIDDEN'});
 await commands.handle({type:'PAIA_PROMPT_ASSIST_CONFIGURE',replyAccess:true,remoteProcessing:true,expectedGeneration:(await commands.handle({type:'PAIA_PROMPT_ASSIST_STATUS'},settings)).generation},settings);await commands.handle({type:'PAIA_PROMPT_ASSIST_STATUS'},host);
 await assert.rejects(commands.card({type:'assist_activate'}, {id:1,url:host.url},{identity:'synthetic',assertCurrent:async()=>{}}),{code:'AI_SERVICE_UNAVAILABLE'});
 assert.equal(sends,0);assert.equal(await s.repository.transaction(false,async t=>(await t.all('organizerJobs')).length),0);commands.dispose();
});

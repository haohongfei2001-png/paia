import {createClientOperationStatusTransport} from '../../../extension/core/ai-usage/client-operation-status-transport.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {assistServiceFixture} from './assist-client-fixture.mjs';
const rows=s=>s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all([...t.tx.objectStoreNames].map(async n=>[n,await t.all(n)]))));
test('actual explicit Assist command composes signed service owners, genuine local result and one paid child for ten activations',async t=>{
 const f=await assistServiceFixture(t);const before=await rows(f.s);
 const values=await Promise.all(Array.from({length:10},()=>f.run()));assert.equal(f.physical(),1);assert.equal(new Set(values.map(v=>v.id)).size,1);assert.equal(values[0].kind,'SUGGESTION');
 const after=await rows(f.s);assert.equal(after.organizerJobs[0].state,'COMMITTED');assert.equal(after.organizerUsage[0].spendState,'SETTLED_SERVICE');assert.equal(after.organizerWorkItems[0].outcome,'SUGGESTION');assert.equal(after.organizerJobs[0].resultReport.state,'ACKNOWLEDGED');
 for(const k of ['records','blocks','thoughts','placements','documents'])assert.deepEqual(after[k],before[k]);
 assert.equal(JSON.stringify(after).includes(f.snapshot.text),false);assert.equal(JSON.stringify(after).includes(values[0].text),false);
 assert.equal(f.payload().task,'one-current-reply-suggestion');assert.deepEqual(f.payload().context,[]);assert.equal(f.payload().reply,f.snapshot.text);
 const result=await f.rpc({type:'assist_insert',id:values[0].id,operationId:crypto.randomUUID(),conditionPresented:true});assert.deepEqual(result,{status:'inserted',verified:true});assert.deepEqual(f.insertions,[values[0].text]);
});

test('ordinary actual surface status/open never creates a job, declaration, reservation or provider request',async t=>{
 const f=await assistServiceFixture(t);for(let i=0;i<10;i++){const status=await f.rpc({type:'assist_status'});assert.equal(status.ready,true);assert.equal(status.available,true);}
 assert.equal(f.calls.length,0);assert.equal(f.physical(),0);assert.equal((await rows(f.s)).organizerJobs.length,0);
});
test('actual surface rejects forged frame/nonce/configuration before a signed service request',async t=>{
 const f=await assistServiceFixture(t),nonce=f.surfaceState.nonce;
 for(const sender of [{...f.frame,id:'other'},{...f.frame,frameId:0},{...f.frame,documentId:'other-document'},{...f.frame,url:f.frame.url+'-old'}])await assert.rejects(f.surface.handle({type:'PAIA_PROMPT_SURFACE_RPC',nonce,command:{type:'assist_activate'}},sender));
 await assert.rejects(f.rpc({type:'assist_activate',configuration:f.configuration}),{code:'FORBIDDEN'});assert.equal(f.calls.length,0);assert.equal(f.physical(),0);
});
test('consent/reply withdrawal after real signed settlement withholds output and never exposes or inserts stale body',async t=>{
 let f;f=await assistServiceFixture(t,{afterResponse:async()=>{await f.commands.configure({replyAccess:false,remoteProcessing:false});}});
 await assert.rejects(f.run());assert.equal(f.physical(),1);assert.equal(f.insertions.length,0);assert.equal(f.commands.views.size,0);const state=await rows(f.s);assert.equal(state.organizerWorkItems.length,0);assert.ok(state.organizerUsage.every(r=>r.effectiveResultCount===0));assert.equal(JSON.stringify(state).includes('SYNTHETIC explain the next step.'),false);
});
test('new reply invalidates old result and late insertion without changing the stable local prompts',async t=>{
 const f=await assistServiceFixture(t),result=await f.run();await f.newerReply();await assert.rejects(f.rpc({type:'assist_result',id:result.id}));await assert.rejects(f.rpc({type:'assist_insert',id:result.id,operationId:crypto.randomUUID(),conditionPresented:true}));assert.equal(f.physical(),1);assert.equal(f.insertions.length,0);
});
test('original local ACK failure reuses only the retained validated response, with no second paid dispatch',async t=>{
 const f=await assistServiceFixture(t),write=f.s.foundationWrite.bind(f.s);let reject=true;
 f.s.foundationWrite=fn=>write(async transaction=>{const put=transaction.put.bind(transaction);transaction.put=async(name,row)=>{if(reject&&name==='organizerWorkItems'&&row.id.startsWith('aiu:assist-result:'))throw Error('SYNTHETIC local ACK failure');return put(name,row);};return fn(transaction);});
 await assert.rejects(f.run());assert.equal(f.physical(),1);assert.equal((await rows(f.s)).organizerWorkItems.length,0);reject=false;const result=await f.run();assert.equal(result.kind,'SUGGESTION');assert.equal(f.physical(),1);assert.equal((await rows(f.s)).organizerJobs[0].state,'COMMITTED');
});
test('lost result ACK reports the original metadata again without a provider retry',async t=>{
 const f=await assistServiceFixture(t,{loseResult:true}),first=await f.run();assert.equal(first.kind,'SUGGESTION');const initial=await rows(f.s);assert.equal(initial.organizerJobs[0].resultReport.state,'PENDING');f.restoreAcks();const second=await f.run();assert.equal(second.id,first.id);assert.equal(f.physical(),1);assert.equal((await rows(f.s)).organizerJobs[0].resultReport.state,'ACKNOWLEDGED');
});

import {ContextCardsService} from '../../../extension/core/context-cards.js';
const contextPut=(id,revision,body)=>({kind:'put',operationId:crypto.randomUUID(),epoch:'initial',itemId:id,expectedRevision:revision,body,section:'Synthetic'});
test('same live prospective reply retains cache for unrelated Context changes but qualifies a new explicit relevant scope',async t=>{
 const f=await assistServiceFixture(t),cards=new ContextCardsService(f.s),relevant=crypto.randomUUID(),unrelated=crypto.randomUUID();
 await cards.change(contextPut(relevant,0,'SYNTHETIC relevant current context'));await cards.change(contextPut(unrelated,0,'SYNTHETIC unrelated context'));
 for(const key of ['global','info'])await cards.change({kind:'access',operationId:crypto.randomUUID(),epoch:'initial',key,expectedRevision:0,enabled:true});f.selected.push(relevant);
 const first=await f.run();assert.equal(f.physical(),1);assert.deepEqual(f.payload().context,['SYNTHETIC relevant current context']);
 await cards.change(contextPut(unrelated,1,'SYNTHETIC unrelated changed'));assert.equal((await f.run()).id,first.id);assert.equal(f.physical(),1);
 await cards.change(contextPut(relevant,1,'SYNTHETIC relevant changed'));await assert.rejects(f.rpc({type:'assist_result',id:first.id}));const second=await f.run();assert.notEqual(second.id,first.id);assert.equal(f.physical(),2);assert.deepEqual(f.payload().context,['SYNTHETIC relevant changed']);
});
test('final insertion requalifies selected independent Context after the worker-to-content handoff',async t=>{
 const f=await assistServiceFixture(t),cards=new ContextCardsService(f.s),id=crypto.randomUUID();await cards.change(contextPut(id,0,'SYNTHETIC insertion dependency'));for(const key of ['global','info'])await cards.change({kind:'access',operationId:crypto.randomUUID(),epoch:'initial',key,expectedRevision:0,enabled:true});f.selected.push(id);const result=await f.run(),send=f.api.tabs.sendMessage;
 f.api.tabs.sendMessage=async(tab,message,...rest)=>{if(message.type==='PAIA_PROMPT_ASSIST_INSERT')await cards.change({kind:'access',operationId:crypto.randomUUID(),epoch:'initial',key:'info',expectedRevision:1,enabled:false});return send(tab,message,...rest);};
 const outcome=await f.rpc({type:'assist_insert',id:result.id,operationId:crypto.randomUUID(),conditionPresented:true});assert.notEqual(outcome.status,'inserted');assert.equal(f.insertions.length,0);assert.equal(f.physical(),1);
});

test('real signed DEFER settles spend but reports no effective result and shares the same cached evaluation',async t=>{
 const f=await assistServiceFixture(t,{defer:true});for(let i=0;i<10;i++)assert.equal((await f.run()).kind,'DEFER');assert.equal(f.physical(),1);const after=await rows(f.s);assert.equal(after.organizerJobs[0].resultOutcome,'DEFER');assert.equal(after.organizerJobs[0].domainResultReceipt.outcome,'FAILED');const request=after.organizerUsage[0].financialRequest,status=createClientOperationStatusTransport({endpoint:f.configuration.origin+'/api/operation-status',fetch:f.configuration.fetch}),observed=await status.query({request,...await f.configuration.readProofs(request)});assert.equal(observed.effectiveResults,0);assert.equal(observed.resultResolution.outcome,'FAILED');
});

import {PromptAssistState} from '../../../extension/ui/prompt-assist-state.js';
import {SettingsAssistState} from '../../../extension/ui/settings-assist-state.js';
test('actual original Prompt view state traverses authenticated surface RPC and requires presentation before insertion',async t=>{
 const f=await assistServiceFixture(t),view=new PromptAssistState({send:f.rpc});await view.refresh();assert.equal(view.status.ready,true);assert.equal(f.physical(),0);assert.equal(await view.activate(),true);assert.equal(view.result.kind,'SUGGESTION');assert.equal(await view.insert(),false);view.markPresented(view.result);assert.equal(await view.insert(),true);assert.equal(f.insertions.length,1);assert.equal(await view.insert(),false);assert.equal(f.physical(),1);await view.dismiss();assert.equal(f.commands.views.size,0);
});
test('actual two Settings UI states use owner CAS so one cannot restore the other window\'s revoked permission',async t=>{
 const f=await assistServiceFixture(t),send=(type,options={})=>f.commands.handle({type,...options},f.settings),a=new SettingsAssistState({send}),b=new SettingsAssistState({send});await a.load();await b.load();assert.equal(await b.configure('remoteProcessing',false),true);assert.equal(await a.configure('replyAccess',false),false);assert.equal(a.value.remoteProcessing,false);assert.equal(a.value.replyAccess,true);assert.equal(f.physical(),0);
});
test('actual surface cancellation before declaration prevents a paid request and stops only that pending owner',async t=>{
 const f=await assistServiceFixture(t);let enter,release;const entered=new Promise(r=>enter=r),hold=new Promise(r=>release=r);let held=false;
 // Pause the original Foundation request before any remote declaration.
 const original=f.commands.session.foundation.serverRequest.bind(f.commands.session.foundation);f.commands.session.foundation.serverRequest=async(...args)=>{if(!held){held=true;enter();await hold;}return original(...args);};
 const view=new PromptAssistState({send:f.rpc});await view.refresh();const running=view.activate();await entered;await view.dismiss();release();assert.equal(await running,false);assert.equal(f.physical(),0);assert.equal(f.calls.some(c=>c.path==='/api/provider'||c.path==='/api/reservations'),false);assert.equal((await rows(f.s)).organizerJobs[0].state,'PLANNED');assert.equal((await rows(f.s)).organizerUsage.length,0);
});
test('actual surface cancellation after provider dispatch leaves the original possibly billed attempt and cannot publish late output',async t=>{
 let enter,release;const entered=new Promise(r=>enter=r),hold=new Promise(r=>release=r),f=await assistServiceFixture(t,{holdProvider:async()=>{enter();await hold;}}),view=new PromptAssistState({send:f.rpc});await view.refresh();const running=view.activate();await entered;const cancelled=view.dismiss();release();await cancelled;assert.equal(await running,false);assert.equal(f.physical(),1);assert.equal(f.commands.views.size,0);assert.equal(f.insertions.length,0);const after=await rows(f.s);assert.equal(after.organizerUsage[0].attemptCount,1);assert.equal(after.organizerWorkItems.length,0);assert.ok(['OUTCOME_UNKNOWN','EXPIRED_UNCOMMITTED'].includes(after.organizerJobs[0].state));
});

test('a local profile denial before publication does not consume the current reply or mint a financial attempt',async t=>{
 const f=await assistServiceFixture(t),profile=f.server.manifest.profile,version=profile.model.resolutionVersion;profile.model.resolutionVersion='SYNTHETIC-unqualified';await assert.rejects(f.run());assert.equal(f.calls.length,0);assert.equal((await rows(f.s)).organizerUsage.length,0);profile.model.resolutionVersion=version;
 assert.equal((await f.run()).kind,'SUGGESTION');assert.equal(f.physical(),1);assert.equal((await rows(f.s)).organizerJobs.length,1);
});
test('cancelling a saved preflight before publication restores only its own never-sent marker and permits the same reply',async t=>{
 const f=await assistServiceFixture(t),ai=f.commands.session.foundation,write=ai.write.bind(ai);let cancelled=false;
 ai.write=async fn=>{let staged=false;const result=await write(async tx=>{const put=tx.put.bind(tx);tx.put=async(table,row)=>{if(table==='meta'&&row.id==='aiu:assist-service-preflight:v1')staged=true;return put(table,row);};return fn(tx);});if(staged&&!cancelled){cancelled=true;await f.rpc({type:'assist_cancel'});}return result;};
 await assert.rejects(f.run());assert.equal(cancelled,true);assert.equal(f.calls.length,0);assert.equal(f.physical(),0);assert.equal((await rows(f.s)).meta.some(x=>x.id==='aiu:assist-service-preflight:v1'||x.id.startsWith('aiu:assist-reply-session:v1:')),false);
 await f.newerReply();assert.equal((await f.run()).kind,'SUGGESTION');assert.equal(f.physical(),1);
});

test('same-document conversation navigation retires the old reply and registers only the new canonical host',async t=>{
 const f=await assistServiceFixture(t),first=await f.run();f.sender.url='https://chatgpt.com/c/next-synthetic';f.surfaceState.url=f.sender.url;await f.commands.handle({type:'PAIA_PROMPT_ASSIST_STATUS'},f.sender);assert.equal(f.physical(),1);await assert.rejects(f.rpc({type:'assist_result',id:first.id}));
 Object.assign(f.binding,{url:f.sender.url,conversation:'/c/next-synthetic',replyId:'new-conversation-reply',cycle:2,revision:2});assert.equal((await f.run()).kind,'SUGGESTION');assert.equal(f.physical(),2);
});
test('the actual configured route still needs both independent current Settings consents before any remote request',async t=>{
 const f=await assistServiceFixture(t);for(const permissions of [{replyAccess:true,remoteProcessing:false},{replyAccess:false,remoteProcessing:true}]){const old=await f.commands.handle({type:'PAIA_PROMPT_ASSIST_STATUS'},f.settings);await f.commands.handle({type:'PAIA_PROMPT_ASSIST_CONFIGURE',...permissions,expectedGeneration:old.generation},f.settings);await assert.rejects(f.run());assert.equal(f.calls.length,0);assert.equal(f.physical(),0);assert.equal((await rows(f.s)).organizerJobs.length,0);}
});

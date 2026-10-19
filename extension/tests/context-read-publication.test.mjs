import test from 'node:test';
import assert from 'node:assert/strict';
import {setup} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {ContextCardsService} from '../core/context-cards.js';
import {ContextReadService} from '../core/context-read.js';
import {ContextMCPAdapter,CONTEXT_MCP_TOOLS} from '../core/context-mcp-adapter.js';

const id=()=>crypto.randomUUID();
async function fixture(){
 const {s}=await setup(OrganizerStore);await s.finishFoundation();await s.setFilterMode('off');
 const cards=new ContextCardsService(s),itemId=id();
 await cards.change({kind:'put',operationId:id(),epoch:'initial',itemId,card:'info',section:'Synthetic information',body:'SYNTHETIC granted information',expectedRevision:0});
 for(const key of ['global','info'])await cards.change({kind:'access',operationId:id(),epoch:'initial',key,enabled:true,expectedRevision:0});
 const caller=Object.freeze({}),state={generation:1,online:true,expiresAt:Date.now()+600000,hook:null};
 const verifier={async verify(actual,store){await state.hook?.();return actual===caller&&store===s?{version:1,store:s,connectionId:'synthetic-connection',accountId:'synthetic-local-account',authorizationGeneration:state.generation,readable:true,online:state.online,expiresAt:state.expiresAt}:null;},isCurrent(actual,r,store){return actual===caller&&store===s&&state.online&&r.authorizationGeneration===state.generation;}};
 const service=new ContextReadService(s,{connectionVerifier:verifier});
 return {s,cards,itemId,caller,state,service};
}
test('original read publication sends once, synchronously, after current original authority',async()=>{
 const f=await fixture(),result=await f.service.shallow(f.caller);assert.equal(result.available,true);let sent=0;
 assert.equal(await f.service.publishResults(f.caller,[result],()=>{sent++;return 'sent';}),'sent');assert.equal(sent,1);
 await assert.rejects(f.service.publishResults(f.caller,[result],()=>sent++));assert.equal(sent,1);
});
for(const change of ['global','card','body','generation','offline','expiry'])test('original read publication refuses '+change+' between read and transport send',async()=>{
 const f=await fixture(),result=await f.service.shallow(f.caller);assert.equal(result.available,true);let sent=0;
 if(change==='global'||change==='card')await f.cards.change({kind:'access',operationId:id(),epoch:'initial',key:change==='global'?'global':'info',enabled:false,expectedRevision:1});
 if(change==='body')await f.cards.change({kind:'put',operationId:id(),epoch:'initial',itemId:f.itemId,card:'info',section:'Synthetic information',body:'SYNTHETIC newer human information',expectedRevision:1});
 if(change==='generation')f.state.generation++;
 if(change==='offline')f.state.online=false;
 if(change==='expiry')f.state.expiresAt=Date.now()-1;
 await assert.rejects(f.service.publishResults(f.caller,[result],()=>sent++));assert.equal(sent,0);
});
test('original read publication rejects DTO/other caller/preview and explicitly released results',async()=>{
 const f=await fixture(),result=await f.service.shallow(f.caller);let sent=0;
 await assert.rejects(f.service.publishResults(f.caller,[structuredClone(result)],()=>sent++));
 await assert.rejects(f.service.publishResults({},[result],()=>sent++));
 const previewCapability=Object.freeze({}),previewService=new ContextReadService(f.s,{localPreviewCapability:previewCapability});
 const preview=await previewService.preview(previewCapability,{kind:'shallow',options:{}});
 await assert.rejects(previewService.publishResults(previewCapability,[preview],()=>sent++));
 f.service.releaseResults([result]);await assert.rejects(f.service.publishResults(f.caller,[result],()=>sent++));assert.equal(sent,0);
});
test('original read publication catches a mutation during final connection verification',async()=>{
 const f=await fixture(),result=await f.service.shallow(f.caller);let sent=0;
 f.state.hook=async()=>{f.state.hook=null;await f.cards.change({kind:'access',operationId:id(),epoch:'initial',key:'info',enabled:false,expectedRevision:1});};
 await assert.rejects(f.service.publishResults(f.caller,[result],()=>sent++));assert.equal(sent,0);
});
test('transport publication occurs under the final original read lock before a queued scope closure',async()=>{
 const f=await fixture(),result=await f.service.shallow(f.caller),original=f.s.repository.transaction.bind(f.s.repository);let inject=true,closed=false,sent=0;
 f.s.repository.transaction=async(write,fn,stores)=>{
  const value=await original(write,fn,stores);
  if(!write&&inject){inject=false;await f.cards.change({kind:'access',operationId:id(),epoch:'initial',key:'info',enabled:false,expectedRevision:1});closed=true;}
  return value;
 };
 await f.service.publishResults(f.caller,[result],()=>{assert.equal(closed,false,'must never send a row after the already committed scope closure');sent++;});
 assert.equal(sent,1);assert.equal(closed,true);
});

test('ChatGPT adapter exposes only original read tools and preserves exact bounded output',async()=>{
 const f=await fixture(),adapter=new ContextMCPAdapter(f.service),outputs=[];
 assert.deepEqual(adapter.list().map(x=>x.name),['read_context','list_topics','search_topic','read_topic']);
 assert.ok(CONTEXT_MCP_TOOLS.every(x=>x.annotations.readOnlyHint&&!x.annotations.destructiveHint&&!x.annotations.openWorldHint&&x.inputSchema.additionalProperties===false));
 await adapter.call(f.caller,'read_context',{limit:1},{publish:value=>{outputs.push(value);}});
 assert.equal(outputs.length,1);assert.equal(outputs[0].structuredContent.available,true);assert.deepEqual(JSON.parse(outputs[0].content[0].text),outputs[0].structuredContent);assert.equal(outputs[0].structuredContent.items[0].text,'SYNTHETIC granted information');
});
for(const args of [{accountId:'forged'},{enabled:true},{topicId:'wrong-tool'}])test('ChatGPT adapter rejects authority or unrelated arguments before reading',async()=>{
 const f=await fixture(),adapter=new ContextMCPAdapter(f.service);let reads=0;const original=f.s.repository.transaction.bind(f.s.repository);f.s.repository.transaction=(...a)=>{reads++;return original(...a);};
 await assert.rejects(adapter.call(f.caller,'read_context',args,{publish:()=>assert.fail('no send')}));assert.equal(reads,0);
});
test('ChatGPT adapter never invokes argument getters or exposes a write tool',async()=>{
 const f=await fixture(),adapter=new ContextMCPAdapter(f.service);let gets=0;const args={get limit(){gets++;return 1;}};
 await assert.rejects(adapter.call(f.caller,'read_context',args,{publish:()=>assert.fail('no send')}));assert.equal(gets,0);
 await assert.rejects(adapter.call(f.caller,'enable_context',{}, {publish:()=>assert.fail('no write')}));
});
test('ChatGPT adapter drops a cancelled read before its transport publication',async()=>{
 const f=await fixture(),adapter=new ContextMCPAdapter(f.service),controller=new AbortController();let sends=0;f.state.hook=()=>controller.abort();
 await assert.rejects(adapter.call(f.caller,'read_context',{}, {signal:controller.signal,publish:()=>sends++}));assert.equal(sends,0);
});

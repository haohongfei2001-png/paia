import test from 'node:test';
import assert from 'node:assert/strict';
import {TopicProcessingAuthority} from '../../../extension/core/topic-processing-authority.js';
import {TopicProcessingGuard} from '../../../extension/core/topic-processing.js';
import {createContextScopeWorkBudget} from '../../../extension/core/context-topic-scope.js';
import {rows} from '../../../extension/tests/harness/original-complete.mjs';
import {organizeServiceFixture} from './organize-client-fixture.mjs';
import {createConfiguredOrganizeRunner} from '../../../extension/core/organizer/configured-organize-runner.js';
import {createOrganizeActionSource} from '../../../extension/background/organize-action-source.js';
const event=()=>({addListener(){},removeListener(){}});
async function fixture(t,options={}){
 const {beforeAuthority=null,...fixtureOptions}=options;const f=await organizeServiceFixture(t,fixtureOptions);if(beforeAuthority){const original=f.configuration.resolveAuthority;f.configuration.resolveAuthority=async(...args)=>{await beforeAuthority();return Reflect.apply(original,f.configuration,args);};}const sender={id:'synthetic',frameId:0,documentId:'document',url:'chrome-extension://synthetic/ui/archive.html',tab:{id:1,windowId:2,incognito:false}};
 const api={runtime:{id:sender.id,getURL:p=>'chrome-extension://synthetic/'+p,async getContexts(){return [{contextType:'TAB',documentId:sender.documentId,documentUrl:sender.url,tabId:1,windowId:2,frameId:0,incognito:false}];}},tabs:{onUpdated:event(),onRemoved:event(),async get(){return {...sender.tab,url:sender.url};}}};
 const source=createOrganizeActionSource(f.s,api),runner=createConfiguredOrganizeRunner(f.s,f.configuration,{actionSource:source}),rpc=request=>runner.handle(request,sender);
 const select=()=>rpc({type:'GET_AI_PRESENTATION_SCOPE',options:{topicId:f.topic.id}});
 const request=scope=>({type:'UPDATE_AI_PRESENTATION',topicId:f.topic.id,userActionId:crypto.randomUUID(),scopeBinding:scope.scopeBinding});
 const run=async()=>rpc(request(await select()));t.after(()=>source.dispose());return {...f,source,runner,rpc,select,request,run,sender,api};
}
for(const count of [1,21])for(const mode of ['control','synchronous','queued'])test('actual source Organize '+count+' entries '+mode+' last genuine Topic withdrawal',async t=>{
 const f=await fixture(t,{count}),caller=Object.freeze({}),controller=new AbortController(),budget=createContextScopeWorkBudget({database:f.s.repository.db}),expiresAt=Date.now()+30000,events=[];let attached=0,hit=0,enabled=false;
 const processing=Object.freeze({resolve:async(_tx,scope)=>Object.freeze({version:1,store:f.s,caller,scope,epoch:'review-combined-last-topic',processing:true,expiresAt,revocationSignal:controller.signal}),isCurrent:()=>{
  const stack=new Error().stack;
  if(enabled&&mode!=='control'&&!hit&&stack.includes('currentFinalAuthorities')&&!stack.includes('runFinalReadFences')){hit++;const withdraw=()=>{events.push('source-invalidated');f.source.invalidate();};if(mode==='queued')queueMicrotask(withdraw);else withdraw();}
  return true;
 }});
 const authority=new TopicProcessingAuthority(f.s,{processing,caller,binding:{operationId:crypto.randomUUID()},workBudget:budget}),guard=new TopicProcessingGuard(f.s,{resolveProcessing:(tx,request)=>authority.authorize(tx,request)});t.after(()=>authority.release());
 const repository=f.s.repository,transaction=repository.transaction;
 repository.transaction=function(write,fn,...rest){return transaction.call(this,write,async tx=>{
  const out=await fn(tx);
  if(write&&!attached&&out?.type==='AI_ORGANIZE'&&out.state==='COMMITTED'){
   const candidate=await tx.get('meta','aiPresentation:'+f.topic.id);assert.equal(candidate?.revision,1,'attach only to the real original Current/domain+ACK transaction');assert.equal(candidate.candidate,undefined);attached++;
   tx.tx.addEventListener('complete',()=>events.push('commit-complete'),{once:true});tx.tx.addEventListener('abort',()=>events.push('commit-abort'),{once:true});
   await guard.processing(tx,[],[f.topic.id]);guard.registerProcessingFinalFence(tx);enabled=true;
  }
  return out;
 },...rest);};
 let result,error=null;try{result=await f.run();}catch(e){error=e;}
 repository.transaction=transaction;
 const jobs=await rows(f.s,'organizerJobs'),usage=await rows(f.s,'organizerUsage'),work=await rows(f.s,'organizerWorkItems'),candidate=await repository.transaction(false,tx=>tx.get('meta','aiPresentation:'+f.topic.id)),marker=await repository.transaction(false,tx=>tx.get('libraryMigrationItems','ai-presentation-fence:'+f.topic.id));
 const observed={count,mode,attached,hit,events,result,error:error?.code??null,physical:f.physical(),jobStates:jobs.map(x=>x.state),usageStates:usage.map(x=>x.state),acks:work.filter(x=>x.state==='ACKNOWLEDGED').length,current:!!candidate?.projection,candidate:!!candidate?.candidate,marker:!!marker,resultCalls:f.calls.filter(x=>x.path==='/api/results').length};t.diagnostic(JSON.stringify(observed));
 assert.equal(attached,1);assert.equal(f.physical(),Math.ceil(count/20));
 if(mode==='control'){
  assert.equal(hit,0);assert.equal(result.completed,true);assert.equal(observed.candidate,false);assert.equal(observed.current,true);assert.equal(observed.marker,true);assert.equal(observed.acks,count);assert.equal(observed.resultCalls,1);
  assert.deepEqual(observed.events,['commit-complete']);assert.deepEqual(observed.jobStates,['COMMITTED']);assert.deepEqual(observed.usageStates,Array(Math.ceil(count/20)).fill('COMMITTED'));
 }else{
  assert.equal(hit,1);assert.equal(observed.candidate,false,'retired original action must not publish candidate');assert.equal(observed.current,false);assert.equal(observed.marker,false);assert.equal(observed.acks,0);assert.equal(observed.resultCalls,0);
  assert.deepEqual(observed.events,['source-invalidated','commit-abort'],'original withdrawal precedes the actual writer abort, never a completion');
  assert.deepEqual(observed.jobStates,['RESPONSE_RECORDED']);assert.deepEqual(observed.usageStates,Array(Math.ceil(count/20)).fill('RESPONSE_RECORDED'),'paid responses remain recorded, without an adoption ACK or result finalization');
 }
});

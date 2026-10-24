import test from 'node:test';
import assert from 'node:assert/strict';
import {TopicController} from '../ui/topic-workspace.js';
import {PresentationNode as Node} from './harness/presentation-dom.mjs';

const tick=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve;const promise=new Promise(done=>resolve=done);return {promise,resolve};};
async function fixture(run){
 const keys=['document','chrome'],previous=new Map(keys.map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 const body=new Node('body'),nodes=new Map(['ai-topic-status','ai-presentation-toggle','thought-list','error'].map(id=>[id,new Node()]));for(const node of nodes.values())body.append(node);
 globalThis.document={body,documentElement:{lang:'zh-CN'},activeElement:null,createElement:tag=>new Node(tag),getElementById:id=>nodes.get(id)};
 const topic={topicId:'synthetic-topic',pending:true,presentation:null},state={serviceAvailable:true,topics:[topic],runtime:null},scope={topicId:topic.topicId,available:true,scopeBinding:'a'.repeat(64),blockedReason:null,complete:true,eligibleCount:2,batchCount:2,remainingCount:0};
 const calls=[],messages=[];let scopeRead=()=>scope,update=()=>({completed:true,topicId:'synthetic-topic',currentPublished:true,revision:1});
 globalThis.chrome={runtime:{sendMessage:async message=>{calls.push(structuredClone(message));const data=message.type==='GET_AI_PRESENTATION_SCOPE'?await scopeRead():message.type==='UPDATE_AI_PRESENTATION'?await update():message.type==='GET_AI_PRESENTATION_STATUS'?state:message.type==='GET_ORGANIZER_CONTROLS'?{}:message.type==='STOP_AI_PRESENTATION'?{stopped:true}:assert.fail('unexpected RPC '+message.type);return {ok:true,data:structuredClone(data)};}}};
 const owner=Object.assign(Object.create(TopicController.prototype),{id:topic.topicId,view:'ai',openIntent:1,presentationIntent:1,activeSectionId:'synthetic-section',statusEpoch:0,statusReadSerial:0,statusUnavailable:[],preferencesLoaded:true,aiState:state,aiTopics:new Map([[topic.topicId,topic]]),onStatus:(...args)=>messages.push(args),refreshes:0,async refresh(){this.refreshes++;await this.updateViewStatus();}});
 const host=nodes.get('ai-topic-status'),buttons=()=>host.children.filter(node=>node.tagName==='BUTTON'),click=async()=>{const button=buttons().find(node=>!node.disabled);assert.ok(button,'configured original Topic status exposes a deliberate action');button.listeners.get('click')();await tick();};
 try{await run({owner,state,scope,topic,host,calls,messages,buttons,click,scopeRead:fn=>scopeRead=fn,update:fn=>update=fn});}finally{for(const key of keys){const descriptor=previous.get(key);if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}}
}

test('unconfigured saved-AI status remains unavailable and reading never offers generation',()=>fixture(async f=>{
 f.state.serviceAvailable=false;f.owner.renderAITopicStatus(f.state,f.topic);assert.equal(f.host.dataset.state,'service-unavailable');assert.match(f.host.textContent,/AI 服务尚未上线/);assert.equal(f.buttons().length,0);assert.deepEqual(f.calls,[]);
 delete f.state.serviceAvailable;f.owner.renderAITopicStatus(f.state,f.topic);assert.equal(f.buttons().length,0);
 f.state.serviceAvailable=true;f.owner.view='original';f.owner.renderAITopicStatus(f.state,f.topic);assert.equal(f.host.hidden,true);assert.equal(f.buttons().length,0);
}));

test('configured original Topic status only sends fresh scope and one action after an explicit click',()=>fixture(async f=>{
 f.owner.renderAITopicStatus(f.state,f.topic);assert.equal(f.buttons().length,1);assert.deepEqual(f.calls,[],'status rendering cannot dispatch or prepare generation');
 await f.click();await tick();
 const scope=f.calls.filter(row=>row.type==='GET_AI_PRESENTATION_SCOPE'),updates=f.calls.filter(row=>row.type==='UPDATE_AI_PRESENTATION');
 assert.equal(scope.length,1);assert.deepEqual(scope[0].options,{topicId:f.topic.topicId});assert.equal(updates.length,1);assert.equal(updates[0].topicId,f.topic.topicId);assert.equal(updates[0].scopeBinding,f.scope.scopeBinding);assert.match(updates[0].userActionId,/^[a-f0-9-]{36}$/);assert.equal(f.owner.refreshes,1);assert.ok(f.calls.some(row=>row.type==='GET_AI_PRESENTATION_STATUS'));
}));

test('held update is visibly pending and repeated clicks cannot send a second request',()=>fixture(async f=>{
 const held=deferred();f.update(()=>held.promise);f.owner.renderAITopicStatus(f.state,f.topic);const first=f.buttons()[0];first.listeners.get('click')();first.listeners.get('click')();await tick();
 assert.equal(f.calls.filter(row=>row.type==='UPDATE_AI_PRESENTATION').length,1);assert.match(f.host.textContent,/正在整理/);assert.equal(f.owner.refreshes,0);held.resolve({completed:true,topicId:'synthetic-topic',currentPublished:true,revision:1});await tick();assert.equal(f.owner.refreshes,1);
}));

test('original failed-save and IME guards prevent even scope preparation',()=>fixture(async f=>{
 f.owner.editor={collect(){},dirty:()=>true,flush:async()=>false};f.owner.renderAITopicStatus(f.state,f.topic);await f.click();assert.deepEqual(f.calls,[]);
 f.owner.editor={composing:true,collect(){assert.fail('IME must not be collected');},dirty:()=>true,flush:async()=>true};f.owner.renderAITopicStatus(f.state,f.topic);await f.click();assert.deepEqual(f.calls,[]);
}));

test('fresh scope cannot spend after a newer edit, composition, or Topic navigation',async()=>{
 for(const change of [f=>{f.owner.editor={dirty:()=>true};},f=>{f.owner.aiEditor={composing:true,dirty:()=>false};},f=>{f.owner.id='other-topic';},f=>{f.owner.openIntent++;},f=>{f.owner.presentationIntent++;},f=>{f.owner.activeSectionId='other-section';}])await fixture(async f=>{
  const held=deferred();f.scopeRead(()=>held.promise);f.owner.renderAITopicStatus(f.state,f.topic);await f.click();assert.equal(f.calls.length,1);change(f);held.resolve(f.scope);await tick();assert.equal(f.calls.filter(row=>row.type==='UPDATE_AI_PRESENTATION').length,0);assert.equal(f.owner.refreshes,0);
 });
});

test('scope denial retains saved reading without generation or raw provider diagnostics',()=>fixture(async f=>{
 f.topic.presentation={revision:4,currentView:'SYNTHETIC saved human edit'};f.scope.blockedReason='BUDGET_EXCEEDED';f.owner.renderAITopicStatus(f.state,f.topic);await f.click();assert.equal(f.calls.filter(row=>row.type==='UPDATE_AI_PRESENTATION').length,0);assert.equal(f.topic.presentation.currentView,'SYNTHETIC saved human edit');assert.match(f.host.textContent,/安全范围|预算/);
}));

test('late completed update cannot refresh or paint another selected Topic',()=>fixture(async f=>{
 const held=deferred();f.update(()=>held.promise);f.owner.renderAITopicStatus(f.state,f.topic);await f.click();assert.equal(f.calls.filter(row=>row.type==='UPDATE_AI_PRESENTATION').length,1);f.owner.id='other-topic';f.owner.openIntent++;f.host.textContent='SYNTHETIC current topic status';held.resolve({completed:true,topicId:'synthetic-topic',currentPublished:true,revision:1});await tick();assert.equal(f.host.textContent,'SYNTHETIC current topic status');assert.equal(f.owner.refreshes,0);
}));

test('cached reads and status refreshes never prepare or dispatch an Organize request',()=>fixture(async f=>{
 f.topic.presentation={revision:4,currentView:'SYNTHETIC saved edit'};
 for(let i=0;i<4;i++)await f.owner.updateViewStatus();
 assert.equal(f.buttons().length,1);assert.equal(f.calls.length,8);assert.ok(f.calls.every(row=>['GET_AI_PRESENTATION_STATUS','GET_ORGANIZER_CONTROLS'].includes(row.type)));assert.equal(f.topic.presentation.currentView,'SYNTHETIC saved edit');
}));

test('partial, unavailable, wrong-topic and malformed scope never dispatch',async()=>{
 for(const change of [scope=>scope.complete=false,scope=>scope.available=false,scope=>scope.topicId='other-topic',scope=>scope.scopeBinding='invalid'])await fixture(async f=>{
  change(f.scope);f.owner.renderAITopicStatus(f.state,f.topic);await f.click();assert.equal(f.calls.length,1);assert.equal(f.calls[0].type,'GET_AI_PRESENTATION_SCOPE');assert.equal(f.owner.refreshes,0);
 });
});

test('scope cannot be read after navigation wins an in-flight original editor save',()=>fixture(async f=>{
 const held=deferred();let dirty=true;f.owner.editor={collect(){},dirty:()=>dirty,flush:()=>held.promise};f.owner.renderAITopicStatus(f.state,f.topic);await f.click();assert.deepEqual(f.calls,[]);f.owner.openIntent++;dirty=false;held.resolve(true);await tick();assert.deepEqual(f.calls,[]);
}));

test('detached old-topic action cannot generate for a newly selected topic',()=>fixture(async f=>{
 f.owner.renderAITopicStatus(f.state,f.topic);const old=f.buttons()[0];f.owner.id='other-topic';f.owner.openIntent++;old.listeners.get('click')();await tick();assert.deepEqual(f.calls,[]);
}));

test('unknown outcome is shown without any automatic retry or success claim',()=>fixture(async f=>{
 f.update(()=>({error:'OUTCOME_UNKNOWN',phase:'provider',requestCount:1}));f.owner.renderAITopicStatus(f.state,f.topic);await f.click();await tick();assert.equal(f.calls.filter(row=>row.type==='UPDATE_AI_PRESENTATION').length,1);assert.equal(f.calls.filter(row=>row.type==='GET_AI_PRESENTATION_SCOPE').length,1);assert.match(f.host.textContent,/结果未知/);assert.doesNotMatch(f.host.textContent,/结果已保存/);assert.equal(f.owner.refreshes,1);
}));

test('new human edits during provider work retain their live editor and defer result repaint',()=>fixture(async f=>{
 const held=deferred();f.update(()=>held.promise);f.owner.renderAITopicStatus(f.state,f.topic);await f.click();const editor={dirty:()=>true,local:{body:'SYNTHETIC new unsaved text'}};f.owner.editor=editor;held.resolve({completed:true,topicId:'synthetic-topic',currentPublished:true,revision:1});await tick();assert.equal(f.owner.refreshes,0);assert.equal(f.owner.editor,editor);assert.equal(editor.local.body,'SYNTHETIC new unsaved text');assert.match(f.host.textContent,/已更新当前阅读内容/);
}));

test('pending original-topic Stop sends once and never refreshes or retries generation',()=>fixture(async f=>{
 const held=deferred();f.update(()=>held.promise);f.owner.renderAITopicStatus(f.state,f.topic);await f.click();const stop=f.buttons().find(node=>node.textContent==='停止本次整理');assert.ok(stop,'the pending current-topic action remains stoppable');stop.listeners.get('click')();stop.listeners.get('click')();await tick();assert.equal(f.calls.filter(row=>row.type==='STOP_AI_PRESENTATION').length,1);assert.equal(f.calls.find(row=>row.type==='STOP_AI_PRESENTATION').topicId,f.topic.topicId);assert.equal(f.owner.refreshes,0);assert.equal(f.calls.filter(row=>row.type==='UPDATE_AI_PRESENTATION').length,1);held.resolve({error:'CANCELLED',requestCount:0});await tick();assert.equal(f.calls.filter(row=>row.type==='UPDATE_AI_PRESENTATION').length,1);
}));

test('reopened Topic shows original running status and Stop without starting another operation',()=>fixture(async f=>{
 f.state.runtime={topicId:f.topic.topicId,phase:'running',state:'running',requestCount:1};await f.owner.updateViewStatus();assert.match(f.host.textContent,/正在整理/);assert.equal(f.buttons().find(node=>node.dataset.aiOrganizeRefresh).disabled,true);const stop=f.buttons().find(node=>node.textContent==='停止本次整理');assert.ok(stop);stop.listeners.get('click')();await tick();assert.equal(f.calls.filter(row=>row.type==='STOP_AI_PRESENTATION').length,1);assert.equal(f.calls.filter(row=>row.type==='UPDATE_AI_PRESENTATION').length,0);assert.equal(f.calls.filter(row=>row.type==='GET_AI_PRESENTATION_SCOPE').length,0);
}));

test('legacy candidate or missing revision is not a confirmed Current publication',async()=>{
 for(const value of [{candidateCreated:true},{currentPublished:true},{currentPublished:true,revision:0},{}])await fixture(async f=>{
  f.update(()=>({completed:true,topicId:f.topic.topicId,...value}));f.owner.renderAITopicStatus(f.state,f.topic);await f.click();await tick();assert.match(f.host.textContent,/结果尚未确认/);assert.doesNotMatch(f.host.textContent,/已更新当前阅读内容/);assert.equal(f.calls.filter(c=>c.type==='UPDATE_AI_PRESENTATION').length,1);
 });
});

for(const protectedPending of [false,true])test('completion distinguishes '+(protectedPending?'protected pending material':'genuine no-delta')+' on the existing screen',()=>fixture(async f=>{
 f.topic.presentation={revision:4,currentView:'SYNTHETIC human content'};
 f.update(()=>({completed:!protectedPending,noDelta:!protectedPending,topicId:f.topic.topicId,requestCount:0,...(protectedPending?{blockedReason:'PROTECTED_FIELDS'}:{})}));
 f.owner.renderAITopicStatus(f.state,f.topic);await f.click();await tick();
 assert.match(f.host.textContent,protectedPending?/人工保护.*本次未更新/:/没有需要更新/);
 if(protectedPending)assert.doesNotMatch(f.host.textContent,/没有需要更新|已更新当前阅读内容/);
 assert.equal(f.topic.presentation.currentView,'SYNTHETIC human content');assert.equal(f.topic.pending,true);assert.equal(f.calls.filter(c=>c.type==='UPDATE_AI_PRESENTATION').length,1);
 assert.equal(f.buttons().length,1);assert.equal(f.buttons()[0].textContent,'更新 AI整理');
}));

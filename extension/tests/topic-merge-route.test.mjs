import test from 'node:test';
import assert from 'node:assert/strict';
import {TopicController} from '../ui/topic-workspace.js';
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
async function fixture(run){
 const previous=globalThis.chrome,writes=[],reads=[],forms=[];
 const w=Object.assign(Object.create(TopicController.prototype),{id:'A',view:'original',openIntent:4,presentationIntent:2,flushEditors:async()=>true,topics:async()=>[{id:'A',name:'Source'},{id:'T',name:'Target'}],form:async(...args)=>{forms.push(args);return {survivorId:'T'};},mutate:async(fn,{isCurrent}={})=>{if(isCurrent&&!isCurrent())return;await fn();return true;},checked:async(type,payload)=>{writes.push({type,...payload});return {jobId:'original-job'};},waitLayout:async id=>assert.equal(id,'original-job'),onStatus:()=>{}});
 globalThis.chrome={runtime:{sendMessage:async req=>{reads.push(req);return {ok:true,data:{id:req.id,organizationRevision:req.id==='A'?3:7}};}}};
 try{await run({w,writes,reads,forms});}finally{globalThis.chrome=previous;}
}
test('merge uses captured source and selected target with original current revision command',()=>fixture(async({w,writes,reads})=>{
 await w.mergeTopic();assert.deepEqual(reads.map(x=>x.id),['A','T']);assert.equal(writes.length,1);const {operationId,...layout}=writes[0].layout;assert.ok(operationId);assert.deepEqual(layout,{kind:'topic_merge',topicId:'A',survivorId:'T',expectedTopicRevision:3,expectedSurvivorRevision:7});assert.equal(w.id,'T');assert.equal(w.topicMergePending,false);
}));
for(const boundary of ['flush','topics','form','source','target'])test('held '+boundary+' cannot merge the newer Topic route',()=>fixture(async({w,writes,forms})=>{
 const entered=deferred(),held=deferred();let value;
 if(boundary==='flush'){value=true;w.flushEditors=()=>{entered.resolve();return held.promise;};}
 if(boundary==='topics'){value=[{id:'A',name:'A'},{id:'T',name:'T'}];w.topics=()=>{entered.resolve();return held.promise;};}
 if(boundary==='form'){value={survivorId:'T'};w.form=()=>{entered.resolve();return held.promise;};}
 if(['source','target'].includes(boundary))chrome.runtime.sendMessage=async req=>{if(req.id===(boundary==='source'?'A':'T')){value={ok:true,data:{id:req.id,organizationRevision:3}};entered.resolve();return held.promise;}return {ok:true,data:{id:req.id,organizationRevision:3}};};
 const pending=w.mergeTopic();await entered.promise;w.id='B';w.openIntent++;held.resolve(value);
 if(['source','target'].includes(boundary))await assert.rejects(pending,/ROUTE_CHANGED/);else await pending;
 assert.deepEqual(writes,[]);assert.equal(w.id,'B');assert.equal(w.topicMergePending,false);if(['flush','topics'].includes(boundary))assert.deepEqual(forms,[]);
}));
for(const mode of ['IME','unsaved','cancel','AI','noTopic','intent','presentation','formIME','forgedTarget','redirect','mutateRoute'])test('merge refuses '+mode+' without mutation',()=>fixture(async({w,writes})=>{
 if(mode==='IME')w.editor={composing:true};if(mode==='unsaved')w.flushEditors=async()=>false;if(mode==='cancel')w.form=async()=>null;if(mode==='AI')w.view='ai';if(mode==='noTopic')w.id=null;
 if(mode==='intent')w.topics=async()=>{w.openIntent++;return [{id:'T'}];};if(mode==='presentation')w.form=async()=>{w.presentationIntent++;return {survivorId:'T'};};if(mode==='formIME')w.form=async()=>{w.editor={composing:true};return {survivorId:'T'};};if(mode==='forgedTarget')w.form=async()=>({survivorId:'other'});
 if(mode==='redirect')chrome.runtime.sendMessage=async()=>({ok:true,data:{id:'redirected',organizationRevision:3}});if(mode==='mutateRoute')w.mutate=async fn=>{w.openIntent++;await fn();};
 if(['redirect','mutateRoute'].includes(mode))await assert.rejects(w.mergeTopic());else await w.mergeTopic();assert.deepEqual(writes,[]);assert.notEqual(w.topicMergePending,true);
}));
test('duplicate merge activation retains one pending selection',()=>fixture(async({w,writes})=>{
 const entered=deferred(),held=deferred();let count=0;w.form=()=>{count++;entered.resolve();return held.promise;};const pending=w.mergeTopic();await entered.promise;await w.mergeTopic();assert.equal(count,1);held.resolve({survivorId:'T'});await pending;assert.equal(writes.length,1);
}));
for(const boundary of ['ack','layout'])test('late '+boundary+' completion never replaces the new route',()=>fixture(async({w,writes})=>{
 const entered=deferred(),held=deferred();if(boundary==='ack')w.checked=async(type,payload)=>{writes.push({type,...payload});entered.resolve();return held.promise;};else w.waitLayout=()=>{entered.resolve();return held.promise;};
 const pending=w.mergeTopic();await entered.promise;w.id='B';w.openIntent++;held.resolve(boundary==='ack'?{jobId:'original-job'}:undefined);await pending;assert.equal(w.id,'B');assert.equal(writes.length,1);assert.equal(w.topicMergePending,false);
}));
test('original layout polling suppresses stale-route paused feedback',()=>fixture(async({w})=>{
 w.onStatus=()=>assert.fail('new route must not receive old merge status');chrome.runtime.sendMessage=async()=>({ok:true,data:{state:'paused'}});await assert.rejects(TopicController.prototype.waitLayout.call(w,'original-job',()=>false),/LAYOUT_PAUSED/);
}));

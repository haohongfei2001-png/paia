import test from 'node:test';
import assert from 'node:assert/strict';
import {TopicController} from '../ui/topic-workspace.js';
import {PresentationNode,presentationText} from './harness/presentation-dom.mjs';
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
async function fixture(run){
 const old={chrome:globalThis.chrome,document:globalThis.document},forms=[],writes=[],opens=[],host=new PresentationNode(),submit={};host.querySelector=()=>submit;
 globalThis.document={getElementById:()=>host,createElement:t=>new PresentationNode(t),createTextNode:presentationText,documentElement:{lang:'zh-CN'}};
 globalThis.chrome={runtime:{sendMessage:async r=>({ok:true,data:{id:r.id,name:'Original',revision:4,recoveryEpoch:'initial'}})}};
 const w=Object.assign(Object.create(TopicController.prototype),{id:'A',openIntent:1,presentationIntent:1,serial:0,statusEpoch:0,statusReadSerial:0,view:'original',flushEditors:async()=>true,onStatus:()=>{},onOpen:()=>opens.push(w.id),form:async(...args)=>{forms.push(args);return {name:'New name',confirm:'container'};},mutate:async(fn,{isCurrent=()=>true}={})=>{if(!isCurrent())return;await fn();return isCurrent();},checked:async(type,payload,current=()=>true)=>{assert.equal(current(),true);writes.push({type,...payload});return {id:payload.edit.id,revision:5};}});
 try{await run({w,forms,writes,opens,host});}finally{Object.assign(globalThis,old);}
}
for(const action of ['renameTopic','deleteTopic'])test(action+' held initial read cannot open A dialog on route B',()=>fixture(async({w,forms,writes})=>{
 const entered=deferred(),held=deferred();chrome.runtime.sendMessage=()=>{entered.resolve();return held.promise;};const pending=w[action]('A');await entered.promise;w.id='B';w.openIntent++;held.resolve({ok:true,data:{id:'A',name:'A',revision:4,recoveryEpoch:'initial'}});await pending;assert.deepEqual(forms,[]);assert.deepEqual(writes,[]);
}));
for(const action of ['renameTopic','deleteTopic'])for(const route of ['A',null,'suggestion-owner'])test(action+' preserves explicit target from '+route,()=>fixture(async({w,writes,opens})=>{
 w.id=route;await w[action]('A');assert.equal(writes.length,1);const {operationId,...edit}=writes[0].edit;assert.ok(operationId);assert.deepEqual(edit,{id:'A',expectedRevision:4,...(action==='renameTopic'?{changes:{name:'New name'}}:{})});assert.equal(w.id,action==='deleteTopic'&&route==='A'?null:route);assert.equal(opens.length,action==='deleteTopic'&&route==='A'?1:0);assert.notEqual(w.topicContainerPending,true);
}));
for(const action of ['renameTopic','deleteTopic'])for(const mode of ['IME','flush-failed','flush-route','form-route','form-IME','cancel','epoch','presentation','view','redirect','badchoice','mutate-route'])test(action+' refuses '+mode,()=>fixture(async({w,writes,forms})=>{
 if(mode==='IME')w.editor={composing:true};if(mode==='flush-failed')w.flushEditors=async()=>false;if(mode==='flush-route')w.flushEditors=async()=>{w.openIntent++;return true;};
 const form=w.form;if(['form-route','form-IME','cancel','epoch','presentation','view','badchoice'].includes(mode))w.form=async(...args)=>{const result=await form(...args);if(mode==='form-route')w.id='B';if(mode==='form-IME')w.dialogEditor={composing:true};if(mode==='cancel')return null;if(mode==='epoch')w.statusEpoch++;if(mode==='presentation')w.presentationIntent++;if(mode==='view')w.view='ai';if(mode==='badchoice')return {name:undefined,confirm:'all-content'};return result;};
 if(mode==='redirect')chrome.runtime.sendMessage=async()=>({ok:true,data:{id:'survivor',name:'Other',revision:4}});
 if(mode==='mutate-route')w.mutate=async fn=>{w.openIntent++;await fn();};
 if(mode==='redirect')await assert.rejects(w[action]('A'),/IDENTITY_CHANGED/);else await w[action]('A');assert.equal(writes.length,0);assert.notEqual(w.topicContainerPending,true);if(['IME','flush-failed','flush-route'].includes(mode))assert.equal(forms.length,0);
}));
for(const action of ['renameTopic','deleteTopic'])test(action+' only one pending confirmation across both container actions',()=>fixture(async({w,forms,writes})=>{
 const entered=deferred(),held=deferred();w.form=async(...args)=>{forms.push(args);entered.resolve();return held.promise;};const pending=w[action]('A');await entered.promise;await w.renameTopic('B');await w.deleteTopic('B');assert.equal(forms.length,1);held.resolve({name:'New name',confirm:'container'});await pending;assert.equal(writes.length,1);
}));
for(const action of ['renameTopic','deleteTopic'])test(action+' late ACK does not take over B or report current success',()=>fixture(async({w,writes,opens})=>{
 const entered=deferred(),held=deferred();let afterCurrent;
 w.checked=async(type,payload)=>{writes.push({type,...payload});entered.resolve();return held.promise;};w.mutate=async(fn,{isCurrent})=>{await fn();afterCurrent=isCurrent();};const pending=w[action]('A');await entered.promise;w.id='B';w.openIntent++;held.resolve({id:'A',revision:5});await pending;assert.equal(w.id,'B');assert.equal(opens.length,0);assert.equal(afterCurrent,false);assert.equal(writes.length,1);
}));
for(const action of ['renameTopic','deleteTopic'])test(action+' failed ACK retains original revision without automatic retry',()=>fixture(async({w,writes})=>{
 w.checked=async(type,payload)=>{writes.push({type,...payload});throw Error('OUTCOME_UNKNOWN');};await assert.rejects(w[action]('A'),/OUTCOME_UNKNOWN/);assert.equal(writes.length,1);assert.equal(writes[0].edit.expectedRevision,4);assert.equal(w.id,'A');assert.notEqual(w.topicContainerPending,true);
}));
test('delete own detail updates the expected route before original mutate success/refresh qualification',()=>fixture(async({w})=>{
 let currentAfter;w.mutate=async(fn,{isCurrent})=>{assert.equal(isCurrent(),true);await fn();currentAfter=isCurrent();};await w.deleteTopic('A');assert.equal(w.id,null);assert.equal(currentAfter,true);
}));
for(const action of ['renameTopic','deleteTopic'])test(action+' original mutate and leaveEditors own epoch transition can commit',()=>fixture(async({w,writes,host})=>{
 let refreshes=0;Object.assign(w,{mutate:TopicController.prototype.mutate,leave:TopicController.prototype.leave,leaveEditors:TopicController.prototype.leaveEditors,rememberTimeline:()=>{},rememberView:()=>{},cancelTopicRestore:()=>{},readRetry:{hidden:false},setBusy:()=>{},refresh:async()=>refreshes++,resetHomeCollection:()=>{}});await w[action]('A');assert.equal(writes.length,1);assert.equal(w.statusEpoch,1);assert.equal(refreshes,1);assert.equal(w.mutating,false);
}));
for(const action of ['renameTopic','deleteTopic'])test(action+' additional external leave during original mutation still refuses dispatch',()=>fixture(async({w,writes})=>{
 Object.assign(w,{mutate:TopicController.prototype.mutate,leave:async()=>{w.statusEpoch+=2;return true;},setBusy:()=>{},refresh:async()=>assert.fail('stale route refresh'),readKey:()=>'',resetHomeCollection:()=>{}});await w[action]('A');assert.equal(writes.length,0);assert.equal(w.mutating,false);
}));

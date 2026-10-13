import test from 'node:test';
import assert from 'node:assert/strict';
import {TopicController} from '../ui/topic-workspace.js';
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
const source={topicId:'A',sectionId:'section-A',revision:3,layoutGeneration:2,title:'Source chapter',isDefault:false};
const target={topicId:'A',sectionId:'target-A',revision:4,layoutGeneration:2,title:'Target chapter',isDefault:false};
async function fixture(run){
 const prior=globalThis.chrome,forms=[],writes=[],reads=[];
 const w=Object.assign(Object.create(TopicController.prototype),{id:'A',view:'original',openIntent:5,presentationIntent:2,flushEditors:async()=>true,topicSectionRows:async()=>[{...source},{...target}],form:async(title,fields)=>{forms.push({title,fields});return {targetSectionId:target.sectionId};},mutate:async(fn,{isCurrent}={})=>{if(isCurrent&&!isCurrent())return;await fn();return true;},checked:async(type,payload)=>{writes.push({type,...payload});return {jobId:'section-job'};},waitLayout:async()=>{},focusSection:async()=>{},onStatus:()=>{}});
 globalThis.chrome={runtime:{sendMessage:async req=>{reads.push(req);return {ok:true,data:{id:req.id,organizationRevision:8}};}}};
 try{await run({w,forms,writes,reads});}finally{globalThis.chrome=prior;}
}
test('management merge directory arriving after navigation cannot open an old Section modal on a new Topic',()=>fixture(async({w,forms,writes})=>{
 const entered=deferred(),held=deferred();w.topicSectionRows=()=>{entered.resolve();return held.promise;};
 const pending=w.sectionActions(source,'merge');await entered.promise;w.id='B';w.openIntent++;held.resolve([{...source},{...target}]);await pending;
 assert.deepEqual(forms,[],'the departed A directory must not open a modal on B');assert.deepEqual(writes,[]);assert.equal(w.id,'B');
}));
test('management merge refuses old directory after a same-Topic route round-trip',()=>fixture(async({w,forms,writes})=>{
 const entered=deferred(),held=deferred();w.topicSectionRows=()=>{entered.resolve();return held.promise;};
 const pending=w.sectionActions(source,'merge');await entered.promise;w.openIntent+=2;held.resolve([{...source},{...target}]);await pending;assert.deepEqual(forms,[]);assert.deepEqual(writes,[]);
}));
test('management merge cancellation changes no organization',()=>fixture(async({w,writes})=>{w.form=async()=>null;await w.sectionActions(source,'merge');assert.deepEqual(writes,[]);}));
test('management merge preserves the original Section identities and current Topic CAS',()=>fixture(async({w,writes})=>{
 await w.sectionActions(source,'merge');assert.equal(writes.length,1);const {operationId,...layout}=writes[0].layout;assert.ok(operationId);assert.deepEqual(layout,{kind:'section_merge',topicId:'A',sectionId:'section-A',targetSectionId:'target-A',expectedTopicRevision:8});
}));
for(const mode of ['IME','dirty','AI','flushRoute','formRoute','formIME','forgedTarget','sourceChanged','targetChanged','generation','mutateRoute','redirect'])test('management merge refuses '+mode+' without a write',()=>fixture(async({w,writes})=>{
 if(mode==='IME')w.editor={composing:true};if(mode==='dirty')w.flushEditors=async()=>false;if(mode==='AI')w.view='ai';if(mode==='flushRoute')w.flushEditors=async()=>{w.openIntent++;return true;};
 if(mode==='formRoute')w.form=async()=>{w.openIntent++;return {targetSectionId:target.sectionId};};if(mode==='formIME')w.form=async()=>{w.editor={composing:true};return {targetSectionId:target.sectionId};};if(mode==='forgedTarget')w.form=async()=>({targetSectionId:'not-displayed'});
 if(['sourceChanged','targetChanged','generation'].includes(mode)){let count=0;w.topicSectionRows=async()=>{count++;return [{...source,...(count>1&&mode==='sourceChanged'?{revision:4}:{}),...(count>1&&mode==='generation'?{layoutGeneration:3}:{})},{...target,...(count>1&&mode==='targetChanged'?{title:'Changed after selection'}:{})}];};}
 if(mode==='mutateRoute')w.mutate=async(fn,{isCurrent})=>{w.openIntent++;assert.equal(isCurrent(),false);await fn();};if(mode==='redirect')chrome.runtime.sendMessage=async()=>({ok:true,data:{id:'redirected',organizationRevision:8}});
 if(['sourceChanged','targetChanged','generation','mutateRoute','redirect'].includes(mode))await assert.rejects(w.sectionActions(source,'merge'));else await w.sectionActions(source,'merge');
 assert.deepEqual(writes,[]);assert.notEqual(w.sectionActionPending,true);assert.notEqual(w.sectionManagementPending,true);
}));
for(const action of ['rename','up','down'])test('management '+action+' delegates to current original Section owner including default capability',()=>fixture(async({w})=>{
 const calls=[];w.sectionContextAction=async(...args)=>{calls.push(args);};await w.sectionActions({...source,isDefault:true},action);assert.equal(calls.length,1);assert.equal(calls[0][1],action);assert.deepEqual(calls[0][2],{allowDefault:true});assert.equal(calls[0][0].isDefault,true);
}));
test('management rename refuses a changed route while the original title is entered',()=>fixture(async({w,writes})=>{
 const entered=deferred(),held=deferred();w.form=()=>{entered.resolve();return held.promise;};const pending=w.sectionActions(source,'rename');await entered.promise;w.openIntent++;held.resolve({title:'late title'});await pending;assert.deepEqual(writes,[]);
}));
test('management rename rechecks composition after its current scope read',()=>fixture(async({w,writes})=>{
 let reads=0;w.topicSectionRows=async()=>{if(++reads===2)w.editor={composing:true};return [{...source}];};w.form=async()=>({title:'rename'});await assert.rejects(w.sectionActions(source,'rename'),/ROUTE_CHANGED/);assert.deepEqual(writes,[]);
}));
test('management keeps one merge action while the original directory is pending',()=>fixture(async({w,writes})=>{
 const entered=deferred(),held=deferred();let count=0;w.topicSectionRows=()=>{if(++count===1){entered.resolve();return held.promise;}return [{...source},{...target}];};const pending=w.sectionActions(source,'merge');await entered.promise;await w.sectionActions(source,'merge');assert.equal(count,1);held.resolve([{...source},{...target}]);await pending;assert.equal(writes.length,1);
}));
test('management merge late acknowledgement does not authorize refresh of a newer route',()=>fixture(async({w,writes})=>{
 const entered=deferred(),held=deferred();let fresh;w.checked=async(type,payload)=>{writes.push({type,...payload});entered.resolve();return held.promise;};w.mutate=async(fn,{isCurrent})=>{await fn();fresh=isCurrent();};const pending=w.sectionActions(source,'merge');await entered.promise;w.id='B';w.openIntent++;held.resolve({jobId:'section-job'});await pending;assert.equal(writes.length,1);assert.equal(fresh,false);assert.equal(w.id,'B');
}));
for(const mode of ['B','latestC','departed','hidden','compose','failed'])test('real mutation releases only the qualified deferred '+mode+' reading request',()=>fixture(async({w})=>{
 const prior=globalThis.document,panel={hidden:false};globalThis.document={getElementById:()=>panel};
 const entered=deferred(),held=deferred(),reads=[],notices=[],draft={body:'unsaved new-route draft'};w.mutate=TopicController.prototype.mutate;w.leave=async()=>true;w.setBusy=()=>{};w.onStatus=x=>notices.push(x);w.readKey=()=>w.id+':'+w.openIntent;w.statusEpoch=3;w.refresh=async()=>{reads.push({id:w.id,draft:w.editor});if(mode==='failed')throw Error('read failed');};const origin=w.openIntent;
 try{
  const pending=w.mutate(async()=>{entered.resolve();await held.promise;},{isCurrent:()=>w.id==='A'&&w.openIntent===origin});await entered.promise;
  w.id='B';w.openIntent++;w.editor=draft;w.cursor='new-route-cursor';w.pages=['new-route-page'];w.history={newRoute:true};assert.equal(await w.readContentRefresh(),false);
  if(mode==='latestC'){w.id='C';w.openIntent++;await w.readContentRefresh();}if(mode==='departed'){w.id='C';w.openIntent++;}if(mode==='hidden')panel.hidden=true;if(mode==='compose')w.actions={surface:{workspace:true}};
  held.resolve();if(mode==='failed')await assert.rejects(pending,/read failed/);else await pending;
  assert.equal(reads.length,['departed','hidden','compose'].includes(mode)?0:1);if(reads.length){assert.equal(reads[0].id,mode==='latestC'?'C':'B');assert.equal(reads[0].draft,draft);}
  assert.equal(w.cursor,'new-route-cursor');assert.deepEqual(w.pages,['new-route-page']);assert.deepEqual(w.history,{newRoute:true});assert.deepEqual(notices,[]);assert.equal(w.mutating,false);assert.equal(w.mutationDeferredRead,null);
 }finally{globalThis.document=prior;}
}));

import test from 'node:test';
import assert from 'node:assert/strict';
import {TopicController} from '../ui/topic-workspace.js';
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
async function fixture(run){
 const previous=globalThis.chrome,writes=[],reads=[];
 const w=Object.assign(Object.create(TopicController.prototype),{id:'original',view:'original',openIntent:4,presentationIntent:2,flushEditors:async()=>true,form:async()=>({title:'SYNTHETIC new Section'}),mutate:async fn=>{await fn();return true;},checked:async(type,payload)=>{writes.push({type,...payload});return {sectionId:'created'};},onStatus:()=>{},focusSection:async()=>{}});
 globalThis.chrome={runtime:{sendMessage:async req=>{reads.push(req);return {ok:true,data:{id:req.id,organizationRevision:9}};}}};
 try{await run({w,writes,reads});}finally{globalThis.chrome=previous;}
}
test('creation refuses a different Topic after the original form was opened',()=>fixture(async({w,writes,reads})=>{
 const form=deferred(),entered=deferred();w.form=()=>{entered.resolve();return form.promise;};const pending=w.createSection();await entered.promise;w.id='other';w.openIntent++;form.resolve({title:'SYNTHETIC new Section'});await pending;assert.deepEqual(writes,[]);assert.deepEqual(reads,[]);
}));
test('creation refuses a round-trip route while the original Topic lookup is held',()=>fixture(async({w,writes})=>{
 const read=deferred(),entered=deferred();chrome.runtime.sendMessage=()=>{entered.resolve();return read.promise;};const pending=w.createSection();await entered.promise;w.openIntent++;read.resolve({ok:true,data:{id:'original',organizationRevision:9}});await assert.rejects(pending,/ROUTE_CHANGED/);assert.deepEqual(writes,[]);
}));

test('creation uses captured Topic and its current CAS, then focuses the exact new Section',()=>fixture(async({w,writes,reads})=>{
 const focused=[];w.focusSection=async(id,{isCurrent})=>{assert.equal(isCurrent(),true);focused.push(id);};await w.createSection();assert.deepEqual(reads,[{type:'GET_LIBRARY_TOPIC',id:'original'}]);assert.equal(writes.length,1);const {type,section}=writes[0];assert.equal(type,'CREATE_LIBRARY_SECTION');assert.deepEqual(Object.keys(section).sort(),['expectedTopicRevision','operationId','title','topicId']);assert.equal(section.topicId,'original');assert.equal(section.expectedTopicRevision,9);assert.equal(section.title,'SYNTHETIC new Section');assert.deepEqual(focused,['created']);assert.equal(w.sectionActionPending,false);
}));
for(const mode of ['IME','unsaved','cancel','blank','oversize','noTopic','AI','flushRoute','flushIntent','formView','mutateRoute','redirect','storage'])test('creation refuses '+mode+' without writes',()=>fixture(async({w,writes})=>{
 if(mode==='IME')w.editor={composing:true};if(mode==='unsaved')w.flushEditors=async()=>false;if(mode==='cancel')w.form=async()=>null;if(mode==='blank')w.form=async()=>({title:'  '});if(mode==='oversize')w.form=async()=>({title:'X'.repeat(301)});if(mode==='noTopic')w.id=null;if(mode==='AI')w.view='ai';
 if(mode==='flushRoute')w.flushEditors=async()=>{w.id='other';return true;};if(mode==='flushIntent')w.flushEditors=async()=>{w.openIntent++;return true;};if(mode==='formView')w.form=async()=>{w.presentationIntent++;return {title:'X'};};if(mode==='mutateRoute')w.mutate=async fn=>{w.openIntent++;await fn();};
 if(mode==='redirect')chrome.runtime.sendMessage=async()=>({ok:true,data:{id:'redirected',organizationRevision:9}});if(mode==='storage')chrome.runtime.sendMessage=async()=>{throw Error('STORAGE_FAILED');};
 if(['mutateRoute','redirect','storage'].includes(mode))await assert.rejects(w.createSection());else await w.createSection();assert.deepEqual(writes,[]);assert.notEqual(w.sectionActionPending,true);
}));
test('duplicate activation while form is pending shares one creation intent',()=>fixture(async({w,writes})=>{
 const entered=deferred(),form=deferred();let forms=0;w.form=()=>{forms++;entered.resolve();return form.promise;};const pending=w.createSection();await entered.promise;await w.createSection();assert.equal(forms,1);form.resolve({title:'SYNTHETIC named'});await pending;assert.equal(writes.length,1);
}));
test('late successful creation cannot focus or resurrect the departed Topic',()=>fixture(async({w,writes})=>{
 const entered=deferred(),commit=deferred();w.checked=async(type,payload)=>{writes.push({type,...payload});entered.resolve();return commit.promise;};let focused=false;w.focusSection=async()=>{focused=true;};const pending=w.createSection();await entered.promise;w.id='other';w.openIntent++;commit.resolve({sectionId:'created'});await pending;assert.equal(writes.length,1);assert.equal(focused,false);assert.equal(w.id,'other');
}));
for(const mode of ['flush','read'])test('manage Sections cannot open stale dialog after held '+mode,()=>fixture(async({w})=>{
 const entered=deferred(),held=deferred();w.closeDialog=()=>assert.fail('stale dialog must not open');if(mode==='flush')w.flushEditors=()=>{entered.resolve();return held.promise;};else w.topicSectionRows=()=>{entered.resolve();return held.promise;};const pending=w.manageSections();await entered.promise;w.openIntent++;held.resolve(mode==='flush'?true:[]);await pending;
}));

test('lost creation acknowledgement retains exact payload and retries once without a second form or operation',()=>fixture(async({w,writes})=>{
 let committed=false,forms=0;const actual=new Map();w.form=async()=>{forms++;return {title:'SYNTHETIC uncertain title'};};w.mutate=async fn=>{try{await fn();return true;}catch{return false;}};
 w.checked=async(type,{section})=>{writes.push(structuredClone(section));if(!actual.has(section.operationId))actual.set(section.operationId,{sectionId:'only-created'});if(!committed){committed=true;throw Object.assign(Error('lost'),{code:'MESSAGE_CHANNEL_INTERRUPTED'});}return actual.get(section.operationId);};
 await w.createSection();assert.equal(w.sectionCreationDrafts.get('original').title,'SYNTHETIC uncertain title');assert.equal(w.sectionCreationDrafts.get('original').uncertain,true);await w.createSection();assert.equal(forms,1);assert.equal(writes.length,2);assert.deepEqual(writes[0],writes[1]);assert.equal(actual.size,1);assert.equal(w.sectionCreationDrafts.has('original'),false);
}));
test('definitive failure retains title for editable retry and a new qualified request',()=>fixture(async({w,writes})=>{
 let forms=0;w.form=async(_,fields)=>{if(forms++)assert.equal(fields[0].value,'SYNTHETIC retained');return {title:'SYNTHETIC retained'};};w.mutate=async fn=>{try{await fn();return true;}catch{return false;}};w.checked=async(type,{section})=>{writes.push(section);if(writes.length===1)throw Object.assign(Error('STORAGE_FAILED'),{code:'STORAGE_FAILED'});return {sectionId:'saved'};};
 await w.createSection();assert.equal(w.sectionCreationDrafts.get('original').title,'SYNTHETIC retained');assert.equal(w.sectionCreationDrafts.get('original').uncertain,false);await w.createSection();assert.notEqual(writes[0].operationId,writes[1].operationId);assert.equal(w.sectionCreationDrafts.has('original'),false);
}));
test('unknown A does not block B and returning to A retries its exact original operation',()=>fixture(async({w,writes})=>{
 let firstA=true;w.mutate=async fn=>{try{await fn();return true;}catch{return false;}};w.checked=async(type,{section})=>{writes.push(structuredClone(section));if(section.topicId==='original'&&firstA){firstA=false;throw Object.assign(Error('lost'),{code:'MESSAGE_CHANNEL_INTERRUPTED'});}return {sectionId:section.topicId+'-created'};};
 await w.createSection();const original=writes[0];w.id='other';w.openIntent++;await w.createSection();assert.equal(writes.length,2,'B creates independently while A is unconfirmed');assert.equal(writes[1].topicId,'other');assert.notEqual(writes[1].operationId,original.operationId);
 w.id='original';w.openIntent++;await w.createSection();assert.deepEqual(writes[2],original);assert.equal(w.sectionCreationDrafts.size,0);
}));

test('eight unknown requests retain their exact payloads and capacity refuses a ninth without eviction',()=>fixture(async({w,writes})=>{
 let succeeds=false;const messages=[];w.onStatus=message=>messages.push(message);w.mutate=async fn=>{try{await fn();return true;}catch{return false;}};w.checked=async(type,{section})=>{writes.push(structuredClone(section));if(!succeeds)throw Object.assign(Error('lost'),{code:'TIMEOUT'});return {sectionId:'reconciled'};};
 for(let i=0;i<8;i++){w.id='topic-'+i;w.openIntent++;await w.createSection();}
 const retained=[...w.sectionCreationDrafts].map(([id,draft])=>[id,structuredClone(draft)]);assert.equal(retained.length,8);w.id='ninth';w.openIntent++;await w.createSection();assert.equal(writes.length,8);assert.deepEqual([...w.sectionCreationDrafts],retained);assert.match(messages.at(-1),/八个/);
 succeeds=true;w.id='topic-0';w.openIntent++;await w.createSection();assert.deepEqual(writes[8],writes[0]);assert.equal(w.sectionCreationDrafts.size,7);w.id='ninth';w.openIntent++;await w.createSection();assert.equal(writes[9].topicId,'ninth');assert.equal(w.sectionCreationDrafts.size,7);
}));
test('explicit cancellation abandons a known-unsaved title but not another Topic unknown request',()=>fixture(async({w,writes})=>{
 const unknown={topicId:'other',title:'Unknown',uncertain:true,attempt:{operationId:'retained'}};w.sectionCreationDrafts=new Map([['other',unknown],['original',{topicId:'original',title:'Unsaved',uncertain:false,attempt:null}]]);w.form=async(_,fields)=>{assert.equal(fields[0].value,'Unsaved');return null;};await w.createSection();assert.equal(w.sectionCreationDrafts.has('original'),false);assert.equal(w.sectionCreationDrafts.get('other'),unknown);assert.deepEqual(writes,[]);
}));
test('creation publishes Section busy through form and arrival then releases actual controls',()=>fixture(async({w})=>{
 const attrs=new Map(),trigger={setAttribute:(key,value)=>attrs.set('summary:'+key,value)},control={disabled:false},menu={open:true,setAttribute:(key,value)=>attrs.set(key,value),querySelector:()=>trigger,querySelectorAll:()=>[control]};
 w.originalPane={querySelectorAll:()=>[menu]};
 const form=deferred(),formEntered=deferred(),focus=deferred(),focusEntered=deferred();w.form=()=>{formEntered.resolve();return form.promise;};w.focusSection=()=>{focusEntered.resolve();return focus.promise;};
 const pending=w.createSection();await formEntered.promise;assert.equal(attrs.get('aria-busy'),'true');assert.equal(trigger.inert,true);assert.equal(control.disabled,true);assert.equal(menu.open,false);
 form.resolve({title:'SYNTHETIC held create'});await focusEntered.promise;assert.equal(attrs.get('aria-busy'),'true');assert.equal(control.disabled,true);focus.resolve();await pending;
 assert.equal(attrs.get('aria-busy'),'false');assert.equal(trigger.inert,false);assert.equal(control.disabled,false);
}));

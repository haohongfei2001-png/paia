import test from 'node:test';
import assert from 'node:assert/strict';
import {ArchiveError} from '../core/constants.js';
import {TopicController} from '../ui/topic-workspace.js';
import {promoteTopicSection} from '../ui/topic-section-promotion.js';
import {TopicSectionPromotionCommands} from '../background/topic-section-promotion-commands.js';
import {promotionFixture,promotionService,decide,rows,op} from './harness/topic-04.mjs';
import {PresentationNode} from './harness/presentation-dom.mjs';
class Node extends PresentationNode{close(){this.open=false;}showModal(){this.open=true;}}
async function fixture(t,run){
 const f=await promotionFixture({count:1});t.after(()=>f.s.repository.close());await f.s.finishFoundation();
 const prior=new Map(['document','chrome'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)])),nodes=new Map(),body=new Node('body');
 for(const id of ['library-dialog','library-dialog-close','library-dialog-title','library-dialog-content','library-form','standalone-revisions','notice','error']){const n=new Node(id==='library-dialog'?'dialog':id==='library-form'?'form':'div');nodes.set(id,n);body.append(n);}nodes.get('library-dialog-close').textContent='Close';nodes.get('library-dialog').append(nodes.get('library-form'),nodes.get('library-dialog-content'));
 globalThis.document={body,documentElement:{lang:'en'},createElement:tag=>new Node(tag),createTextNode:text=>{const n=new Node('#text');n.textContent=text;return n;},querySelectorAll:()=>[],getElementById:id=>nodes.get(id)||null};
 const url='chrome-extension://synthetic/ui/archive.html',sender={id:'synthetic',url,documentId:'document-A',frameId:0,tab:{id:1,windowId:2,incognito:false}},api={runtime:{id:'synthetic',getURL:p=>'chrome-extension://synthetic/'+p,getContexts:async()=>[{contextType:'TAB',tabId:1,windowId:2,frameId:0,documentId:sender.documentId,documentUrl:url,incognito:false}]},tabs:{get:async()=>({id:1,windowId:2,url,incognito:false})}},adapter=new TopicSectionPromotionCommands(f.s,api),calls=[];
 const rpc=async request=>{calls.push(structuredClone(request));try{return {ok:true,data:request.type==='GET_LIBRARY_ENTRY'?await f.s.entry(request.id):await adapter.handle(request,sender)};}catch(error){return {ok:false,error:error.code,...(error.phase?{phase:error.phase}:{})};}};globalThis.chrome={runtime:{sendMessage:rpc}};
 const status=[],navigation=[],w=Object.assign(Object.create(TopicController.prototype),{id:f.parent.id,view:'original',openIntent:1,presentationIntent:1,sectionActionPending:false,flushEditors:async()=>true,topicSectionRows:()=>rows(f.s,'sections'),syncSectionActionControls:()=>{},setBusy:()=>{},leave:async()=>true,refresh:()=>f.s.topic(f.parent.id),onStatus:(...args)=>status.push(args),openRootTarget:(...args)=>navigation.push(args)});
 const section=(await rows(f.s,'sections')).find(row=>row.sectionId===f.section.sectionId);
 const tick=()=>new Promise(resolve=>setTimeout(resolve,1));const wait=async predicate=>{const deadline=performance.now()+2000;while(performance.now()<deadline){if(predicate())return;await tick();}throw Error('actual UI promise did not reach expected owner phase '+JSON.stringify({calls,status,title:nodes.get('library-dialog-title').textContent,open:nodes.get('library-dialog').open}));};
 const submit=async name=>{await wait(()=>nodes.get('library-dialog').open);if(name!==undefined){const input=nodes.get('library-form').children[0].children[0];assert.equal(input.name,'name');input.value=name;}nodes.get('library-form').onsubmit({preventDefault(){}});};
 try{await run({...f,adapter,w,section,nodes,calls,rpc,status,navigation,submit,wait,tick});}finally{for(const [key,descriptor]of prior)if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}
}

test('manual Section UI uses actual full owner preview, explicit confirmation, same parent and original compound undo',t=>fixture(t,async f=>{
 const before=await rows(f.s,'thoughts'),pending=promoteTopicSection(f.w,f.section);await f.submit('Exact user Topic ★');await f.wait(()=>f.nodes.get('library-dialog-title').textContent==='Confirm Section promotion');
 assert.match(f.nodes.get('library-dialog-content').textContent,/Exact user Topic ★/);assert.match(f.nodes.get('library-dialog-content').textContent,/External access to the new Topic is off/);assert.equal(f.nodes.get('library-dialog-content').children.find(n=>n.tagName==='OL').children.length,1);
 const form=f.nodes.get('library-form'),host=f.nodes.get('library-dialog-content'),submit=form.children[0];assert.equal(host.nextSibling,form,'the full name, range and Entry list precede the original confirmation form');assert.deepEqual(host.children.map(node=>node.tagName),['P','P','OL']);assert.equal(submit.type,'submit');assert.equal(form.children.length,1);assert.equal(typeof form.onsubmit,'function');
 assert.equal(f.calls.filter(r=>r.command==='confirm').length,0);await f.submit();await pending;assert.equal(form.nextSibling,host,'the original shared dialog order is restored after confirmation');
 assert.equal(f.calls.filter(r=>r.command==='prepare').length,1);assert.equal(f.calls.filter(r=>r.command==='confirm').length,1);assert.equal(f.w.id,f.parent.id);assert.deepEqual(f.navigation,[]);assert.equal(f.w.sectionActionPending,false);assert.equal(f.w.sectionPromotionAttempts.size,0);
 const entries=await rows(f.s,'thoughts');assert.deepEqual(entries.map(e=>e.thoughtText),before.map(e=>e.thoughtText));assert.equal((await rows(f.s,'topics')).find(row=>row.id!==f.parent.id).name,'Exact user Topic ★');
 const undo=f.nodes.get('notice').children.find(n=>n.tagName==='BUTTON'&&n.textContent==='Undo this move');assert.ok(undo);await undo.listeners.get('click')();await f.wait(()=>f.calls.some(r=>r.command==='restore'));await f.wait(()=>!f.w.mutating&&f.nodes.get('notice').textContent.includes('The move was undone'));assert.equal((await rows(f.s,'placements')).find(row=>row.topicId===f.parent.id&&row.entryId===f.entryIds[0]).lifecycle,'active');
}));

test('manual Section UI preview cancellation calls only authentic cancel and never confirmation',t=>fixture(t,async f=>{
 const before=await rows(f.s,'topics'),pending=promoteTopicSection(f.w,f.section);await f.submit('Cancelled Topic');await f.wait(()=>f.nodes.get('library-dialog-title').textContent==='Confirm Section promotion');f.w.closeDialog();await pending;assert.equal(f.nodes.get('library-form').nextSibling,f.nodes.get('library-dialog-content'),'cancelling restores the original shared dialog order');
 assert.equal(f.calls.filter(r=>r.command==='cancel').length,1);assert.equal(f.calls.filter(r=>r.command==='confirm').length,0);assert.deepEqual(await rows(f.s,'topics'),before);assert.equal(f.w.sectionPromotionAttempts.size,0);assert.equal(f.w.sectionActionPending,false);
}));

test('manual Section UI lost commit reply exposes result action and resolves same durable operation without second confirmation',t=>fixture(t,async f=>{
 chrome.runtime.sendMessage=async request=>{const result=await f.rpc(request);if(request.command==='confirm'&&result.ok)throw Error('message channel interrupted after genuine commit');return result;};
 const pending=promoteTopicSection(f.w,f.section);await f.submit('Uncertain Topic');await f.wait(()=>f.nodes.get('library-dialog-title').textContent==='Confirm Section promotion');await f.submit();await pending;
 assert.equal(f.w.sectionActionPending,false);assert.equal(f.w.mutating,false);assert.equal(f.w.sectionPromotionAttempts.size,1);assert.ok(f.nodes.get('notice').children.some(n=>n.textContent==='Check promotion result'));const first=f.calls.find(r=>r.command==='prepare').request.operationId;
 chrome.runtime.sendMessage=f.rpc;await promoteTopicSection(f.w,f.section);
 assert.equal(f.calls.filter(r=>r.command==='confirm').length,1);assert.equal(f.calls.filter(r=>r.command==='prepare').length,1);assert.ok(f.calls.some(r=>r.command==='result'&&r.operationId===first));assert.equal((await rows(f.s,'topics')).length,2);assert.equal(f.w.sectionPromotionAttempts.size,0);
}));

for(const invalidation of ['IME','dirty','late route'])test('manual Section UI refuses '+invalidation+' without a confirmation or new operation',t=>fixture(t,async f=>{
 if(invalidation==='IME')f.w.editor={composing:true};if(invalidation==='dirty')f.w.flushEditors=async()=>false;
 if(invalidation==='late route'){let release;f.w.topicSectionRows=()=>new Promise(resolve=>release=resolve);const pending=promoteTopicSection(f.w,f.section);await f.wait(()=>!!release);f.w.openIntent++;release([f.section]);await pending;}else await promoteTopicSection(f.w,f.section);
 assert.deepEqual(f.calls,[]);assert.equal((await rows(f.s,'topics')).length,1);assert.equal(f.w.sectionActionPending,false);
}));

test('manual Section UI cancels a genuine returned preview after same-document presentation invalidation',t=>fixture(t,async f=>{
 const whole=()=>f.s.repository.transaction(false,t=>Promise.all(f.s.repository.stores.map(async name=>[name,await t.all(name)]))),before=await whole();let release,prepared;const held=new Promise(resolve=>release=resolve),ready=new Promise(resolve=>prepared=resolve);
 chrome.runtime.sendMessage=async request=>{const result=await f.rpc(request);if(request.command==='prepare'&&result.ok){prepared(result.data.token);await held;}return result;};
 const pending=promoteTopicSection(f.w,f.section);await f.submit('SYNTHETIC retained name');const token=await ready;f.w.presentationIntent++;release();await pending;
 assert.ok(f.calls.some(request=>request.command==='cancel'&&request.token===token),'the authentic returned private token is released despite late presentation intent');assert.equal(f.calls.filter(request=>request.command==='confirm').length,0);assert.deepEqual(await whole(),before);assert.equal(f.w.sectionActionPending,false);assert.equal(f.w.sectionPromotionAttempts.size,0);
}));

test('manual Section UI bounds known failed drafts without blocking a real later Section',t=>fixture(t,async f=>{
 const empty=[];for(let i=0;i<8;i++){const row=await f.s.createSection({topicId:f.parent.id,title:'Actual empty Section '+i,expectedTopicRevision:(await f.s.topic(f.parent.id)).organizationRevision,operationId:op()});empty.push((await rows(f.s,'sections')).find(section=>section.sectionId===row.sectionId));}
 const whole=()=>f.s.repository.transaction(false,t=>Promise.all(f.s.repository.stores.map(async name=>[name,await t.all(name)]))),before=await whole();
 for(let i=0;i<8;i++){const pending=promoteTopicSection(f.w,empty[i]);await f.submit('SYNTHETIC known failed '+i);await pending;}
 assert.equal(f.calls.filter(request=>request.command==='prepare').length,8);assert.equal(f.calls.filter(request=>request.command==='confirm').length,0);assert.deepEqual(await whole(),before);
 const originalForm=f.w.form.bind(f.w);let entered;const entry=new Promise(resolve=>entered=resolve);f.w.form=(...args)=>{const result=originalForm(...args);entered(true);return result;};const next=promoteTopicSection(f.w,f.section);
 assert.equal(await Promise.race([entry,next.then(()=>false)]),true,'eight confirmed-no-write drafts cannot block a new valid Section');await f.submit('SYNTHETIC valid later name');await f.wait(()=>f.nodes.get('library-dialog-title').textContent==='Confirm Section promotion');f.w.closeDialog();await next;assert.deepEqual(await whole(),before);
}));

test('manual Section UI retains eight actual signed uncertain requests and never evicts them for a new preview',t=>fixture(t,async f=>{
 const sections=[];for(let i=0;i<8;i++){const section=await f.s.createSection({topicId:f.parent.id,title:'Actual selected Section '+i,expectedTopicRevision:(await f.s.topic(f.parent.id)).organizationRevision,operationId:op()});await f.s.continueThinking({topicId:f.parent.id,sectionId:section.sectionId,body:'Actual human body '+i,operationId:op()});sections.push((await rows(f.s,'sections')).find(row=>row.sectionId===section.sectionId));}
 f.adapter.service.stage=async()=>{throw new ArchiveError('UNAVAILABLE');};
 for(let i=0;i<8;i++){const pending=promoteTopicSection(f.w,sections[i]);await f.submit('SYNTHETIC unknown '+i);await f.wait(()=>f.nodes.get('library-dialog-title').textContent==='Confirm Section promotion');await f.submit();await pending;}
 assert.equal((await rows(f.s,'organizerWorkItems')).length,8);assert.equal(f.w.sectionPromotionAttempts.size,8);const ids=[...f.w.sectionPromotionAttempts.values()].map(request=>request.operationId);assert.ok([...f.w.sectionPromotionAttempts.values()].every(request=>request.uncertain===true));
 const before=await f.s.repository.transaction(false,t=>Promise.all(f.s.repository.stores.map(async name=>[name,await t.all(name)]))),count=f.calls.length;await promoteTopicSection(f.w,f.section);assert.equal(f.calls.length,count);assert.deepEqual([...f.w.sectionPromotionAttempts.values()].map(request=>request.operationId),ids);assert.deepEqual(await f.s.repository.transaction(false,t=>Promise.all(f.s.repository.stores.map(async name=>[name,await t.all(name)]))),before);assert.equal(f.w.sectionActionPending,false);
}));


test('manual Section UI retains a visible failed outcome after genuine Working invalidation and the original refresh',t=>fixture(t,async f=>{
 const pending=promoteTopicSection(f.w,f.section);await f.submit('SYNTHETIC retained failed name');await f.wait(()=>f.nodes.get('library-dialog-title').textContent==='Confirm Section promotion');
 const input=await f.s.input(f.scope[0].inputId);await f.s.editDocument({documentId:input.documentId,operationId:op(),blocks:[{id:input.id,expectedRevision:input.revision,libraryText:'SYNTHETIC genuine later Working owner',note:input.note,excluded:input.excluded}]});
 const whole=()=>f.s.repository.transaction(false,t=>Promise.all(f.s.repository.stores.map(async name=>[name,await t.all(name)]))),before=await whole();
 f.w.refresh=async()=>{f.nodes.get('error').hidden=true;f.w.onStatus('');return f.s.topic(f.parent.id);};await f.submit();await pending;
 assert.deepEqual(await whole(),before);assert.equal(f.calls.filter(row=>row.command==='confirm').length,1);assert.equal(f.w.sectionActionPending,false);const draft=[...f.w.sectionPromotionAttempts.values()][0];assert.equal(draft.uncertain,false);assert.equal(draft.token,null);assert.equal(draft.name,'SYNTHETIC retained failed name');
 const notice=f.nodes.get('notice');assert.equal(notice.hidden,false);assert.equal(notice.dataset.state,'failed');assert.match(notice.textContent,/Confirmation did not write/);assert.equal(notice.children.filter(n=>n.tagName==='BUTTON').length,0,'known failure never claims committed or invents an unknown retry');
}));

test('the original eight uncertain Section attempts remain bounded without any website storage access',t=>fixture(t,async f=>{
 const prior=Object.getOwnPropertyDescriptor(globalThis,'sessionStorage');let touched=0;Object.defineProperty(globalThis,'sessionStorage',{configurable:true,get(){touched++;throw Error('website storage is forbidden');}});
 try{f.w.sectionPromotionAttempts=new Map(Array.from({length:8},(_,i)=>['old-'+i,{kind:'manual',operationId:op(),uncertain:true,token:null}]));const before=[...f.w.sectionPromotionAttempts];await promoteTopicSection(f.w,f.section);assert.equal(f.w.sectionPromotionAttempts.size,8);assert.deepEqual([...f.w.sectionPromotionAttempts],before);assert.deepEqual(f.calls,[]);assert.equal(f.w.sectionActionPending,false);assert.equal(touched,0);}finally{if(prior)Object.defineProperty(globalThis,'sessionStorage',prior);else delete globalThis.sessionStorage;}
}));


// UI rendering controls use a genuine original domain preview. They do not
// stand in for the separate paid-result/ACK gateway integration tests.
async function originalAIPreview(f){const service=promotionService(f,async(view,reader)=>{for(let i=0;i<reader.pageCount;i++)await reader.readPage(i);return {...decide(view),selection:{kind:'whole_section',count:view.manifest.count,manifestDigest:view.manifest.digest,necessary:'all_selected_placements'}};}),operationId=op(),preview=await service.prepare({scope:f.scope,topicId:f.parent.id,sectionId:f.section.sectionId,selection:'whole_section',operationId});return {service,operationId,preview,token:op()};}
test('AI preview rendering reuses the whole original confirmation with fixed reason and no name-entry or generation step',t=>fixture(t,async f=>{
 const original=await originalAIPreview(f),commands=[],before=await rows(f.s,'topics');chrome.runtime.sendMessage=async request=>{if(request.type==='PAIA_LIBRARY_SECTION_PROMOTION'){commands.push(request);if(request.command==='proposal')return {ok:true,data:{state:'prepared',token:original.token,operationId:original.operationId,preview:original.preview}};if(request.command==='cancel'){assert.equal(request.token,original.token);original.service.cancel(original.preview);return {ok:true,data:{state:'cancelled'}};}throw Error('unexpected generation or mutation');}return f.rpc(request);};
 const pending=promoteTopicSection(f.w,f.section);await f.wait(()=>f.nodes.get('library-dialog-title').textContent==='Confirm Section promotion');assert.equal(f.nodes.get('library-form').children.length,1);assert.equal(f.nodes.get('library-form').children[0].type,'submit');const content=f.nodes.get('library-dialog-content');assert.match(content.textContent,/AI proposal. Nothing moves until you confirm/);assert.match(content.textContent,/Existing content contains an independent goal/);assert.match(content.textContent,/Independent synthetic planning/);assert.equal(content.children.find(n=>n.tagName==='OL').children.length,f.entryIds.length);assert.deepEqual(commands.map(x=>x.command),['proposal']);f.w.closeDialog();await pending;assert.deepEqual(commands.map(x=>x.command),['proposal','cancel']);assert.deepEqual(await rows(f.s,'topics'),before);assert.equal(f.w.sectionPromotionAttempts.size,0);
}));
test('AI preview rendering refuses an unknown reason before opening a confirmation and releases the original token',t=>fixture(t,async f=>{
 const original=await originalAIPreview(f),commands=[];chrome.runtime.sendMessage=async request=>{commands.push(request.command);if(request.command==='proposal')return {ok:true,data:{state:'prepared',token:original.token,operationId:original.operationId,preview:{...original.preview,reason:'invented'}}};if(request.command==='cancel'){assert.equal(request.token,original.token);original.service.cancel(original.preview);return {ok:true,data:{state:'cancelled'}};}return f.rpc(request);};await promoteTopicSection(f.w,f.section);assert.deepEqual(commands,['proposal','cancel']);assert.ok(!f.nodes.get('library-dialog').open);assert.equal(f.w.sectionPromotionAttempts.size,0);assert.equal(f.w.sectionActionPending,false);
}));


test('an explicit retry of checkpoint persistence keeps the exact already-confirmed token and never creates another preview or operation',t=>fixture(t,async f=>{
 const operationId=op(),token='existing-original-confirmation-token',key=f.parent.id+':'+f.section.sectionId,draft={kind:'ai',name:'Original accepted name',operationId,uncertain:true,checkpointPending:true,token};f.w.sectionPromotionAttempts=new Map([[key,draft]]);const sent=[];
 chrome.runtime.sendMessage=async request=>{sent.push(structuredClone(request));return {ok:false,error:'STORAGE_FAILED',phase:'promotion_checkpoint_pending'};};await promoteTopicSection(f.w,f.section);assert.deepEqual(sent.map(r=>r.command),['confirm']);assert.equal(sent[0].token,token);assert.equal(draft.operationId,operationId);assert.equal(draft.checkpointPending,true);
 chrome.runtime.sendMessage=async request=>{sent.push(structuredClone(request));return {ok:false,error:'OUTCOME_UNKNOWN'};};await promoteTopicSection(f.w,f.section);assert.equal(sent.at(-1).command,'confirm');assert.equal(sent.at(-1).token,token);assert.equal(draft.checkpointPending,false);assert.equal(draft.uncertain,true);
 await promoteTopicSection(f.w,f.section);assert.equal(sent.at(-1).command,'proposal_result');assert.equal(sent.at(-1).operationId,operationId);assert.equal(sent.filter(r=>r.command==='confirm').length,2);assert.equal((await rows(f.s,'topics')).length,1);
}));

for(const ack of ['success','lost return'])test('explicit original Section UI consumes a known unwritten history with '+ack+' without confirming again',t=>fixture(t,async f=>{
 const operationId=op(),key=f.parent.id+':'+f.section.sectionId,commands=[];f.w.sectionPromotionAttempts=new Map([[key,{kind:'ai',name:'',operationId,uncertain:true,token:null}]]);const before=await rows(f.s,'topics');
 chrome.runtime.sendMessage=async request=>{commands.push(request);if(request.command==='proposal_result')return {ok:true,data:{state:'unwritten',operationId,sourceTopicId:f.parent.id,sourceSectionId:f.section.sectionId,checkpointToken:'original-private-delivery-token'}};if(request.command==='acknowledge'){assert.equal(request.token,'original-private-delivery-token');if(ack==='lost return')throw Error('ACK return lost');return {ok:true,data:{state:'acknowledged'}};}throw Error('unexpected confirmation or generation');};
 await promoteTopicSection(f.w,f.section);assert.deepEqual(commands.map(x=>x.command),['proposal_result','acknowledge']);assert.equal(f.w.sectionPromotionAttempts.size,0);assert.equal(f.w.sectionActionPending,false);assert.deepEqual(await rows(f.s,'topics'),before);assert.match(f.nodes.get('notice').textContent,/original request was checked/);assert.equal(f.nodes.get('notice').children.filter(n=>n.tagName==='BUTTON').length,0);assert.deepEqual(f.navigation,[]);
}));
test('an unwritten result for a different Section never consumes the original UI obligation or acknowledges it',t=>fixture(t,async f=>{
 const operationId=op(),key=f.parent.id+':'+f.section.sectionId,commands=[];f.w.sectionPromotionAttempts=new Map([[key,{kind:'ai',name:'',operationId,uncertain:true,token:null}]]);
 chrome.runtime.sendMessage=async request=>{commands.push(request);return {ok:true,data:{state:'unwritten',operationId,sourceTopicId:f.parent.id,sourceSectionId:'different-original-section',checkpointToken:'other-private-delivery-token'}};};
 await promoteTopicSection(f.w,f.section);assert.deepEqual(commands.map(x=>x.command),['proposal_result']);assert.equal(f.w.sectionPromotionAttempts.size,1);assert.equal(f.w.sectionPromotionAttempts.get(key).uncertain,true);assert.equal(f.w.sectionActionPending,false);
}));

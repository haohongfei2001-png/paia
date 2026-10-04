import test from 'node:test';
import assert from 'node:assert/strict';
import {completeFixture,rows} from './harness/original-complete.mjs';
import {MemoryService} from '../core/memory/service.js';
import {ManualContext} from '../core/manual-context.js';

async function setup(){
 const fixture=await completeFixture({texts:['FIRST_ORIGINAL synthetic material','SECOND_ORIGINAL independent material']});
 const memory=new MemoryService(fixture.s);await memory.ready();let now=Date.now();
 const context=new ManualContext(memory,{clock:()=>now});let state=await context.run({action:'create'},'tab');
 const blocks=(await rows(fixture.s,'blocks')).map(r=>r.value),refs=blocks.map(b=>({kind:'input',id:b.id,revision:b.revision}));
 const call=async(action,options={})=>state=await context.run({action,selectionId:state.selectionId,generation:state.generation,...options},'tab');
 return {...fixture,memory,context,blocks,refs,call,get state(){return state;},expire(){now+=900001;},async review(){await call('compile');return call('confirmReview',state.reviewBinding);}};
}
test('D4 compile is readable but cannot release; exact explicit review binds output and manifest',async()=>{
 const f=await setup();await f.call('add',{refs:f.refs});
 await assert.rejects(f.call('compile'),{code:'MEMORY_PURPOSE_REQUIRED'});assert.deepEqual(f.state.items.map(i=>i.ref),f.refs);
 await f.call('task',{purpose:'Compare these selected expressions'});await f.call('compile');
 assert.equal(f.state.state,'review');assert.match(f.state.text,/FIRST_ORIGINAL/);assert.match(f.state.text,/Current task/);
 await assert.rejects(f.call('share',{format:'copy'}),{code:'MEMORY_STALE'});
 const binding={...f.state.reviewBinding};delete binding.generation;
 await assert.rejects(f.call('confirmReview',{...binding,outputSha256:'0'.repeat(64)}),{code:'MEMORY_STALE'});
 await f.call('confirmReview',binding);assert.equal(f.state.state,'ready');const expected=f.state.text;
 for(const format of ['copy','markdown'])assert.equal((await f.call('share',{format})).text,expected);
 await f.call('preview');assert.equal(f.state.state,'review');await assert.rejects(f.call('share',{format:'copy'}),{code:'MEMORY_STALE'});
 assert.equal(f.requests.length,0);
});
test('D4 output-only edits preserve every original store and invalidate the previous reviewed binding',async()=>{
 const f=await setup();await f.call('add',{refs:f.refs});await f.call('task',{purpose:'Review'});
 const originals=JSON.stringify(await rows(f.s,'blocks'));await f.call('compile');
 await f.call('editOutput',{text:'OUTPUT_ONLY revised synthesis'});assert.equal(f.state.state,'review');assert.equal(f.state.outputEdited,true);
 await assert.rejects(f.call('share',{format:'copy'}),{code:'MEMORY_STALE'});
 const {generation,...binding}=f.state.reviewBinding;await f.call('confirmReview',binding);
 assert.equal((await f.call('share',{format:'copy'})).text,'OUTPUT_ONLY revised synthesis');
 assert.equal(JSON.stringify(await rows(f.s,'blocks')),originals);
 await f.call('note',{text:'new note'});assert.equal(f.state.state,'dirty');assert.equal(f.state.outputEdited,false);assert.equal(f.state.text,'');
 assert.equal(f.requests.length,0);
});
test('D4 policy changes erase output overlay and require a new compile/review, while local-only permits manual release',async()=>{
 const f=await setup();await f.call('add',{refs:f.refs});await f.call('task',{purpose:'Compare'});await f.call('compile');await f.call('editOutput',{text:'DERIVED_CANARY'});
 await f.memory.settings({localOnly:true});await f.call('read');assert.equal(f.state.state,'dirty');assert.equal(f.state.outputEdited,false);assert.equal(f.state.text,'');
 await f.call('compile');const {generation,...binding}=f.state.reviewBinding;await f.call('confirmReview',binding);assert.match((await f.call('share',{format:'copy'})).text,/ORIGINAL/);
 f.expire();await assert.rejects(f.call('read'),{code:'MEMORY_EXPIRED'});assert.equal(f.requests.length,0);
});
test('D4 task, ordering and budget mutations each invalidate review without losing incoming material',async()=>{
 const f=await setup();await f.call('add',{refs:f.refs});await f.call('task',{purpose:'Compare'});
 for(const [action,options]of [['task',{purpose:'A different task'}],['order',{itemIds:f.state.items.map(i=>i.itemId).reverse()}],['budget',{budget:'short'}]]){
  await f.call('compile');const {generation,...binding}=f.state.reviewBinding;await f.call('confirmReview',binding);
  await f.call(action,options);assert.equal(f.state.state,'dirty');assert.equal(f.state.items.length,2);assert.equal(f.state.reviewBinding,null);
  await assert.rejects(f.call('share',{format:'copy'}),{code:'MEMORY_STALE'});
 }
});
test('D4 reconcile requires exact fresh diff, preserves independent item edits and never rebases changed spans',async()=>{
 const f=await setup();await f.call('add',{refs:f.refs});await f.call('task',{purpose:'Review changes'});
 const safe=f.state.items[1];await f.call('edit',{itemId:safe.itemId,text:'SAFE_LOCAL_EDIT'});
 const b=f.blocks[0];await f.s.editDocument({documentId:b.documentId,operationId:crypto.randomUUID(),blocks:[{id:b.id,expectedRevision:b.revision,libraryText:'UPDATED_FIRST',note:b.note,excluded:false}]});
 await f.call('read');assert.equal(f.state.state,'stale');
 const proposal=await f.call('reconcile');assert.equal(proposal.reconciliation.canApply,true);assert.equal(proposal.reconciliation.changes.length,1);
 await assert.rejects(f.call('reconcile',{accept:true,diffSha256:'wrong'}),{code:'MEMORY_STALE'});
 await f.call('reconcile',{accept:true,diffSha256:proposal.reconciliation.diffSha256});
 assert.equal(f.state.state,'dirty');assert.equal(f.state.items[1].body,'SAFE_LOCAL_EDIT');assert.equal(f.state.items[0].body,'UPDATED_FIRST');
 await f.call('compile');assert.match(f.state.text,/SAFE_LOCAL_EDIT/);await assert.rejects(f.call('share',{format:'copy'}),{code:'MEMORY_STALE'});
 const g=await setup();await g.call('add',{refs:[{...g.refs[0],span:{start:0,end:5}}]});const original=g.blocks[0];
 await g.s.editDocument({documentId:original.documentId,operationId:crypto.randomUUID(),blocks:[{id:original.id,expectedRevision:original.revision,libraryText:'MOVED selection',note:original.note,excluded:false}]});
 const changed=await g.call('reconcile');assert.equal(changed.reconciliation.canApply,false);assert.equal(changed.reconciliation.changes[0].kind,'reselect_span');
 await assert.rejects(g.call('reconcile',{accept:true,diffSha256:changed.reconciliation.diffSha256}),{code:'MEMORY_STALE'});
});
test('D4 cumulative redaction removes a repeated purpose/note canary from the entire compiled and released envelope',async()=>{
 const f=await setup();await f.call('add',{refs:f.refs});await f.call('task',{purpose:'Do not repeat FIRST_ORIGINAL'});await f.call('note',{text:'FIRST_ORIGINAL private hint'});
 const item=f.state.items.find(i=>i.body.startsWith('FIRST_ORIGINAL'));await f.call('redact',{itemId:item.itemId,start:0,end:'FIRST_ORIGINAL'.length});
 assert.equal(JSON.stringify(f.state).includes('FIRST_ORIGINAL'),false);
 await f.call('compile');assert.equal(JSON.stringify(f.state).includes('FIRST_ORIGINAL'),false);
 const {generation,...binding}=f.state.reviewBinding;await f.call('confirmReview',binding);
 assert.equal(JSON.stringify(await f.call('share',{format:'copy'})).includes('FIRST_ORIGINAL'),false);
});
test('D4 denial during confirm fingerprinting erases derived bytes and never produces Ready',async()=>{
 const f=await setup();await f.call('add',{refs:f.refs});await f.call('task',{purpose:'Review'});await f.call('compile');await f.call('editOutput',{text:'FORBIDDEN_DERIVATIVE'});
 const {generation,...binding}=f.state.reviewBinding,validate=f.context.validate.bind(f.context);let reads=0;
 f.context.validate=async s=>{if(++reads===2)await f.memory.exclude({inputId:f.refs[0].id,excluded:true});return validate(s);};
 await assert.rejects(f.call('confirmReview',binding),{code:'MEMORY_STALE'});
 const internal=f.context.sessions.get(f.state.selectionId);assert.equal(internal.outputOverride,undefined);assert.equal(internal.compiled,null);assert.equal(internal.items[0].body,'');assert.equal(f.context.dto(internal).text,'');
 assert.equal(f.requests.length,0);
});
test('D4 a second source edit invalidates a proposed reconciliation rather than accepting the old diff',async()=>{
 const f=await setup();await f.call('add',{refs:f.refs});const b=f.blocks[0];
 async function edit(revision,text){await f.s.editDocument({documentId:b.documentId,operationId:crypto.randomUUID(),blocks:[{id:b.id,expectedRevision:revision,libraryText:text,note:b.note,excluded:false}]});}
 await edit(b.revision,'CHANGED_ONCE');const proposed=await f.call('reconcile');await edit(b.revision+1,'CHANGED_TWICE');
 await assert.rejects(f.call('reconcile',{accept:true,diffSha256:proposed.reconciliation.diffSha256}),{code:'MEMORY_STALE'});
 assert.equal(f.context.sessions.get(f.state.selectionId).items[0].ref.revision,b.revision);
});
test('D4 owner-bound stale read resynchronizes a committed lost acknowledgement without replay or automatic review',async()=>{
 const f=await setup();await f.call('add',{refs:f.refs});await f.call('task',{purpose:'Review'});await f.call('compile');
 const old={selectionId:f.state.selectionId,generation:f.state.generation},binding=f.state.reviewBinding;
 // Commit the edit but deliberately lose its response, as the UI epoch fence does.
 await f.context.run({action:'editOutput',...old,text:'LOST_ACK_OUTPUT'},'tab');
 const recovered=await f.context.run({action:'read',...old},'tab');assert.equal(recovered.generation,old.generation+1);assert.equal(recovered.state,'review');
 await assert.rejects(f.context.run({action:'share',...old,format:'copy'},'tab'),{code:'MEMORY_STALE'});
 await assert.rejects(f.context.run({action:'confirmReview',...old,outputSha256:binding.outputSha256,manifestSha256:binding.manifestSha256},'tab'),{code:'MEMORY_STALE'});
 await assert.rejects(f.context.run({action:'read',...old},'other-tab'),{code:'MEMORY_DENIED'});
 await assert.rejects(f.context.run({action:'read',...old,generation:recovered.generation+1},'tab'),{code:'MEMORY_STALE'});
 await assert.rejects(f.context.run({action:'share',selectionId:recovered.selectionId,generation:recovered.generation,format:'copy'},'tab'),{code:'MEMORY_STALE'});
});
test('D4 real controller epoch-discarded edit acknowledgement recovers through read without replaying edit',async()=>{
 const {ContextController}=await import('../ui/context-workspace.js');const f=await setup();await f.call('add',{refs:f.refs});await f.call('task',{purpose:'Review'});await f.call('compile');
 const ui=Object.create(ContextController.prototype);ui.data=f.state;ui.sourceEpoch=0;const oldChrome=globalThis.chrome;
 let signal,release,edits=0;const held=new Promise(r=>signal=r),gate=new Promise(r=>release=r);
 globalThis.chrome={runtime:{async sendMessage(message){try{const result=await f.context.run(message.options,'tab');if(message.options.action==='editOutput'){edits++;signal();await gate;}return {ok:true,data:result};}catch(e){return {ok:false,error:e.code};}}}};
 try{
  const old={selectionId:ui.data.selectionId,generation:ui.data.generation};const changing=ui.rpc('editOutput',{text:'HELD_OUTPUT'});await held;ui.sourceEpoch++;release();
  await assert.rejects(changing,{code:'MATERIAL_RESPONSE_STALE'});ui.data=await ui.rpc('read');assert.equal(ui.data.generation,old.generation+1);assert.equal(ui.data.state,'review');assert.equal(edits,1);
  await assert.rejects(ui.rpc('share',{format:'copy'}),{code:'MEMORY_STALE'});assert.equal(edits,1);
 }finally{globalThis.chrome=oldChrome;}
});
test('D4 whole-Topic material selection cannot continue an old click after flush or AI status navigation',async()=>{
 const {TopicController}=await import('../ui/topic-workspace.js');let release;const gate=new Promise(r=>release=r);
 const owner=Object.create(TopicController.prototype);owner.id='topic-before';owner.view='ai';owner.flushEditors=()=>gate;
 const pending=owner.selectTopicMaterials();owner.id='topic-after';release(true);await pending;
 const oldChrome=globalThis.chrome;let statusReads=0;
 globalThis.chrome={runtime:{async sendMessage(){statusReads++;owner.id='topic-after';return {ok:true,data:{topics:[]}};}}};
 try{owner.id='topic-before';owner.flushEditors=async()=>true;await owner.selectTopicMaterials();assert.equal(statusReads,1);}finally{globalThis.chrome=oldChrome;}
});
test('D4 add completes its mutation queue before navigation re-enters that same owner for refresh',async()=>{
 const {ContextController}=await import('../ui/context-workspace.js');const ui=Object.create(ContextController.prototype),oldDocument=globalThis.document;
 Object.assign(ui,{intent:0,serial:Promise.resolve(),busy:false,data:{items:[]},ensure:async()=>{},flush:async()=>{},render(){},feedback(){},rpc:async()=>({items:[{ref:{kind:'input',id:'synthetic',revision:1}}]})});
 let unlocked=false,rechecked=false;ui.onMemory=async()=>{unlocked=!ui.busy;if(unlocked)await ui.perform(async()=>{rechecked=true;});};
 globalThis.document={dispatchEvent(){}};
 try{await ui.add([{kind:'input',id:'synthetic',revision:1}]);assert.equal(unlocked,true);assert.equal(rechecked,true);assert.equal(ui.busy,false);}finally{globalThis.document=oldDocument;}
});
test('D4 an unsplittable output edit is atomic and cannot strand the UI on an old generation',async()=>{
 const f=await setup();await f.call('add',{refs:f.refs});await f.call('task',{purpose:'Review'});await f.call('budget',{budget:'short'});await f.call('compile');
 const before=f.state;await assert.rejects(f.call('editOutput',{text:'a'+'\u0301'.repeat(20000)}),{code:'MEMORY_LIMIT'});
 const current=await f.call('read');assert.equal(current.generation,before.generation);assert.equal(current.text,before.text);assert.deepEqual(current.reviewBinding,before.reviewBinding);assert.equal(current.outputEdited,false);
});
test('D4 missing purpose has a safe worker-visible classification, without exposing private exception text',async()=>{
 const {ArchiveError,safeErrorCode}=await import('../core/constants.js');assert.equal(safeErrorCode(new ArchiveError('MEMORY_PURPOSE_REQUIRED')),'MEMORY_PURPOSE_REQUIRED');assert.equal(safeErrorCode(new Error('PRIVATE_PURPOSE_CANARY')),'STORAGE_FAILED');
});
test('D4 same-data workspace activation does not remount an already visible draft field',async()=>{
 const {ContextController}=await import('../ui/context-workspace.js');const ui=Object.create(ContextController.prototype);let renders=0;
 Object.assign(ui,{intent:0,serial:Promise.resolve(),busy:false,drafts:new Map(),data:{state:'dirty',items:[],note:'',text:''},root:{firstChild:{},hidden:true},legacyRoot:{hidden:false},ensure:async()=>{},invalidateOutput(){},render(){renders++;},feedback(){}});ui.rpc=async()=>structuredClone(ui.data);
 ui.activate(true);await ui.serial;assert.equal(renders,0);assert.equal(ui.root.hidden,false);assert.equal(ui.legacyRoot.hidden,true);
});
test('D4 unchanged Ready activation restores validated output controls without replacing a draft field',async()=>{
 const {ContextController}=await import('../ui/context-workspace.js'),ui=Object.create(ContextController.prototype);let renders=0;
 const output={textContent:'EXACT_REVIEWED',replaceChildren(){this.textContent='';}},copy={disabled:false},choice={disabled:false},draft={value:'AUTHOR_DRAFT',selectionStart:3,selectionEnd:7,readOnly:false};
 const root={firstChild:{},hidden:false,querySelector(selector){return selector==='#material-output-text'?output:selector==='[data-material-edit=output]'?draft:null;},querySelectorAll(selector){return selector==='[data-output]'?[copy]:selector==='[data-package-choice]'?[choice]:[copy,choice];}};
 Object.assign(ui,{intent:0,serial:Promise.resolve(),busy:false,mode:'preview',drafts:new Map(),data:{state:'ready',items:[],text:'EXACT_REVIEWED'},root,legacyRoot:{hidden:true},ensure:async()=>{},render(){renders++;},feedback(){}});ui.rpc=async()=>structuredClone(ui.data);
 ui.activate(false);assert.equal(output.textContent,'');assert.equal(copy.disabled,true);ui.activate(true);await ui.serial;
 assert.equal(output.textContent,'EXACT_REVIEWED');assert.equal(copy.disabled,false);assert.equal(choice.disabled,false);assert.equal(renders,0);assert.deepEqual(draft,{value:'AUTHOR_DRAFT',selectionStart:3,selectionEnd:7,readOnly:false});
});
test('D4 stale unsent item drafts cannot block explicit reconciliation or removal; independent drafts survive',async()=>{
 const {ContextController}=await import('../ui/context-workspace.js'),f=await setup();await f.call('add',{refs:f.refs});
 const [changed,safe]=f.state.items,b=f.blocks[0];await f.s.editDocument({documentId:b.documentId,operationId:crypto.randomUUID(),blocks:[{id:b.id,expectedRevision:b.revision,libraryText:'CURRENT_SOURCE',note:b.note,excluded:false}]});await f.call('read');
 const ui=Object.create(ContextController.prototype),old={chrome:globalThis.chrome,document:globalThis.document,window:globalThis.window};let accept=false,prompt='';const actions=[];
 Object.assign(ui,{data:f.state,sourceEpoch:0,serial:Promise.resolve(),busy:false,drafts:new Map([[changed.itemId,'STALE_UNSENT'],[safe.itemId,'INDEPENDENT_UNSENT']]),render(){},feedback(){}});
 globalThis.document={documentElement:{lang:'en'},dispatchEvent(){}};globalThis.window={confirm(text){prompt=text;return accept;}};
 globalThis.chrome={runtime:{async sendMessage(m){actions.push(m.options.action);try{return {ok:true,data:await f.context.run(m.options,'tab')};}catch(e){return {ok:false,error:e.code};}}}};
 try{
  await ui.reconcile();assert.equal(ui.drafts.get(changed.itemId),'STALE_UNSENT');assert.match(prompt,/discards 1 affected unsent/);assert.equal(ui.data.state,'stale');assert.equal(ui.drafts.get(safe.itemId),'INDEPENDENT_UNSENT');assert.equal(ui.data.generation,f.state.generation);assert.deepEqual(actions,['reconcile']);
  accept=true;await ui.reconcile();assert.equal(ui.data.state,'dirty');assert.equal(ui.data.items[0].body,'CURRENT_SOURCE');assert.equal(ui.drafts.get(safe.itemId),'INDEPENDENT_UNSENT');assert.equal(ui.drafts.has(changed.itemId),false);
  ui.drafts.set(changed.itemId,'ANOTHER_UNSENT');await f.s.editDocument({documentId:b.documentId,operationId:crypto.randomUUID(),blocks:[{id:b.id,expectedRevision:b.revision+1,libraryText:'CURRENT_SOURCE_AGAIN',note:b.note,excluded:false}]});ui.data=await ui.rpc('read');
  await ui.change('remove',{itemId:changed.itemId});assert.equal(ui.data.items.length,1);assert.equal(ui.drafts.get(safe.itemId),'INDEPENDENT_UNSENT');assert.equal(ui.drafts.has(changed.itemId),false);
 }finally{Object.assign(globalThis,old);}
});
test('D4 a source change during reconciliation confirmation preserves every unsent draft and old selection',async()=>{
 const {ContextController}=await import('../ui/context-workspace.js'),f=await setup();await f.call('add',{refs:f.refs});const b=f.blocks[0],[changed,safe]=f.state.items;
 await f.s.editDocument({documentId:b.documentId,operationId:crypto.randomUUID(),blocks:[{id:b.id,expectedRevision:b.revision,libraryText:'FIRST_CHANGE',note:b.note,excluded:false}]});await f.call('read');
 const ui=Object.create(ContextController.prototype),old={chrome:globalThis.chrome,document:globalThis.document,window:globalThis.window};const drafts=new Map([[changed.itemId,'AFFECTED_UNSENT'],[safe.itemId,'SAFE_UNSENT'],['output','WHOLE_UNSENT']]);let confirmed=false;
 Object.assign(ui,{data:f.state,sourceEpoch:0,serial:Promise.resolve(),busy:false,drafts:new Map(drafts),render(){},feedback(){}});globalThis.document={documentElement:{lang:'en'}};globalThis.window={confirm(text){assert.match(text,/discards 2 affected unsent/);confirmed=true;return true;}};
 globalThis.chrome={runtime:{async sendMessage(m){if(m.options.action==='reconcile'&&m.options.accept)await f.s.editDocument({documentId:b.documentId,operationId:crypto.randomUUID(),blocks:[{id:b.id,expectedRevision:b.revision+1,libraryText:'SECOND_CHANGE',note:b.note,excluded:false}]});try{return {ok:true,data:await f.context.run(m.options,'tab')};}catch(e){return {ok:false,error:e.code};}}}};
 try{await ui.reconcile();assert.equal(confirmed,true);assert.deepEqual(ui.drafts,drafts);const held=f.context.sessions.get(f.state.selectionId);assert.equal(held.generation,f.state.generation);assert.equal(held.items[0].ref.revision,b.revision);}finally{Object.assign(globalThis,old);}
});
test('D4 source recheck masks an unsent complete-output draft, restores unchanged eligible editing, and clears it only on denial',async()=>{
 const oldDocument=globalThis.document;globalThis.document={documentElement:{lang:'en'}};try{
 const {ContextController}=await import('../ui/context-workspace.js'),ui=Object.create(ContextController.prototype);const field={value:'UNSENT_OUTPUT',readOnly:false,selectionStart:2,selectionEnd:6,setSelectionRange(start,end){this.selectionStart=start;this.selectionEnd=end;}},item={itemId:'material',state:'ready',body:'source'};
 const root={querySelector(selector){return ['[data-material-edit=output]','textarea:focus'].includes(selector)?field:null;},querySelectorAll(){return [];}};
 Object.assign(ui,{data:{state:'ready',items:[item],text:'COMPILED'},sourceEpoch:0,serial:Promise.resolve(),busy:false,rechecking:true,drafts:new Map([['output','UNSENT_OUTPUT']]),root,ensure:async()=>{},renderReconcileAction(){},render(){},feedback(){}});ui.rpc=async()=>structuredClone(ui.data);
 ui.invalidateOutput(true);assert.equal(field.value,'');assert.equal(field.readOnly,true);assert.equal(ui.drafts.get('output'),'UNSENT_OUTPUT');await ui.refresh();assert.equal(field.value,'UNSENT_OUTPUT');assert.equal(field.readOnly,false);assert.equal(field.selectionStart,2);assert.equal(field.selectionEnd,6);
 ui.rechecking=true;ui.invalidateOutput(true);ui.rpc=async()=>({state:'blocked',items:[{...item,state:'blocked',body:''}],text:''});await ui.refresh();assert.equal(field.value,'');assert.equal(field.readOnly,true);assert.equal(ui.drafts.has('output'),false);
 }finally{globalThis.document=oldDocument;}
});
test('D4 denial clears material bodies in the hidden workspace even while permission management prevents remount',async()=>{
 const {ContextController}=await import('../ui/context-workspace.js'),ui=Object.create(ContextController.prototype),oldDocument=globalThis.document;globalThis.document={documentElement:{lang:'en'}};
 const snippet={textContent:'HIDDEN_FORBIDDEN_BODY',replaceChildren(){this.textContent='';}},field={dataset:{materialEdit:'blocked'},value:'HIDDEN_FORBIDDEN_BODY',readOnly:false},row={dataset:{materialId:'blocked'},querySelector(){return snippet;}};
 const root={querySelector(){return null;},querySelectorAll(selector){return selector==='[data-material-id]'?[row]:selector==='[data-material-edit]'?[field]:[];}};
 Object.assign(ui,{advanced:true,data:{state:'ready',items:[{itemId:'blocked',state:'ready',body:'HIDDEN_FORBIDDEN_BODY'}]},sourceEpoch:0,serial:Promise.resolve(),busy:false,rechecking:true,drafts:new Map([['blocked','UNSENT_FORBIDDEN']]),root,ensure:async()=>{},renderReconcileAction(){},render(){},feedback(){}});ui.rpc=async()=>({state:'blocked',items:[{itemId:'blocked',state:'blocked',body:''}],text:''});
 try{await ui.refresh();assert.equal(snippet.textContent,'');assert.equal(field.value,'');assert.equal(field.readOnly,true);assert.equal(ui.drafts.has('blocked'),false);}finally{globalThis.document=oldDocument;}
});
test('D4 compatibility candidate keeps all complete files and is mandatory whenever selected',async()=>{
 const {readFile}=await import('node:fs/promises'),workflow=await readFile(new URL('../../.github/workflows/paia-candidate.yml',import.meta.url),'utf8'),job=workflow.match(/^  context_compatibility:\n([\s\S]*?)(?=^  \w+:)/m)?.[1];
 assert.ok(job);assert.match(job,/timeout-minutes: 12/);assert.match(job,/ref: \$\{\{ github\.event\.pull_request\.head\.sha \}\}/);assert.match(job,/persist-credentials: false/);
 const command=job.split('\n').find(line=>line.includes('node --test'));assert.ok(command);assert.doesNotMatch(command,/test-name-pattern|skip/);
 assert.deepEqual(command.match(/tests\/[^ ]+\.test\.mjs/g),['tests/release-certification-round48-chrome-e2e.test.mjs','tests/release-certification-round49-chrome-e2e.test.mjs','tests/ans-01-reader-surfaces-chrome-e2e.test.mjs']);
 assert.match(workflow,/needs: \[unit, contracts, release, direct_edit, shell_cutover, targeted_browser, topic_compatibility, native_popup, capture_recovery, audit_boundaries, scale_probe, macos_reload_diagnostic, context_compatibility\]/);
 assert.match(workflow,/CONTEXT_COMPAT: \$\{\{ needs\.context_compatibility\.result \}\}/);assert.match(workflow,/if \[ "\$CONTEXT_COMPAT_SELECTED" = true \]; then test "\$CONTEXT_COMPAT" = success;/);
 assert.match(job,/PAIA_DVN_CONTEXT_BROWSER/);assert.match(job,/PAIA_DVN_CONTEXT_COMPAT_BROWSER/);assert.doesNotMatch(job,/continue-on-error|secrets\.|permissions:/);
});

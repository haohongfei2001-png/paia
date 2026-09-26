import test from 'node:test';
import assert from 'node:assert/strict';
import {completeFixture,rows,append} from './harness/original-complete.mjs';
import {MemoryService} from '../core/memory/service.js';
import {PassportService} from '../core/passport.js';
import {ContextPackageService} from '../core/context-package-service.js';
import {assertLocalNetworkAllowed} from '../core/local-network-policy.js';
import {hashText} from '../core/dedupe.js';
import {MANUAL_CONTEXT_LIMITS} from '../core/context-manifest.js';
import {BackupService} from '../core/backup-service.js';
import {exported,prepared} from './harness/backup-v081.mjs';
const op=()=>crypto.randomUUID();
async function setup(texts=['合成姓名甲 的完整历史材料','另一条真实选择']){const f=await completeFixture({texts});const memory=new MemoryService(f.s),passport=new PassportService(f.s);let now=Date.now();const service=new ContextPackageService(memory,passport,{clock:()=>now});await memory.ready();const records=await rows(f.s,'records'),blocks=(await rows(f.s,'blocks')).map(x=>x.value).sort((a,b)=>texts.indexOf(records.find(r=>r.id===a.originalTextReference).value.originalText)-texts.indexOf(records.find(r=>r.id===b.originalTextReference).value.originalText)),refs=blocks.map(b=>({kind:'input',id:b.id,revision:b.revision}));let state=await service.manual({action:'create'},'tab-a');return {...f,memory,passport,service,blocks,refs,get state(){return state;},advance:()=>{now+=900001;},async call(action,options={}){const next=await service.manual({action,selectionId:state.selectionId,generation:state.generation,...options},'tab-a');state=next;return next;}};}

test('VS06 fixed manifest preserves explicit full text, same-input spans and exact copy/export hash',async()=>{
 const f=await setup(['MANIFEST_CANARY '+ '中英👩🏽‍💻\n'.repeat(6000),'SECOND_EXPLICIT_CANARY']);
 const span={...f.refs[0],span:{start:0,end:15}};
 await f.call('add',{refs:[f.refs[0],span,f.refs[1]]});await f.call('preview');
 const before=f.state;
 assert.equal(before.manifest.version,1);assert.equal(before.manifest.complete,true);assert.equal(before.manifest.partial,false);
 assert.deepEqual(before.manifest.explicit.map(i=>i.ref),[f.refs[0],span,f.refs[1]]);
 assert.ok(before.manifest.explicit.every(i=>i.origin==='explicit'));
 assert.deepEqual(before.manifest.retrievalSupplements,[]);
 assert.equal(before.manifest.automaticRelease,false);assert.equal(before.manifest.persisted,false);
 assert.equal(before.manifest.previewSha256,await hashText(before.text));
 const manifest={...before.manifest};delete manifest.previewSha256;delete manifest.reviewedManifestSha256;
 assert.equal(before.manifest.reviewedManifestSha256,await hashText(JSON.stringify(manifest)));
 assert.ok(before.text.includes('中英👩🏽‍💻\n'.repeat(6000)));
 for(const format of ['copy','markdown']){const released=await f.call('share',{format});assert.equal(released.text,before.text);assert.deepEqual(released.manifest,before.manifest);}
 const meta=JSON.stringify(await rows(f.s,'meta'));
 assert.equal(meta.includes(before.selectionId),false);assert.equal(meta.includes(before.manifest.previewSha256),false);
 assert.equal(f.requests.length,0);
});
test('VS06 policy revision invalidates a reviewed manifest without auto-send or loosening local-only',async()=>{
 const f=await setup();await f.call('add',{refs:f.refs});await f.call('preview');
 const reviewed=f.state.manifest;
 await f.memory.settings({localOnly:true});const changed=await f.call('read');
 assert.equal(changed.state,'dirty');assert.equal(changed.text,'');assert.equal(changed.manifest.previewSha256,null);
 assert.notEqual(changed.manifest.policyRevision,reviewed.policyRevision);
 await assert.rejects(f.call('share',{format:'copy'}),{code:'MEMORY_STALE'});
 await f.call('preview');assert.equal((await f.call('share',{format:'copy'})).manifest.complete,true);
 assert.equal((await f.memory.status()).config.externalAccess,false);assert.equal(f.requests.length,0);
});
test('VS06 exclusion, edit and ordering belong to the reviewed manifest; stale refs never rebind',async()=>{
 const f=await setup();await f.call('add',{refs:f.refs});await f.call('preview');const original=f.state.manifest.previewSha256;
 await f.call('remove',{itemId:f.state.items[0].itemId});assert.equal(f.state.manifest.exclusions.length,1);
 assert.equal(f.state.manifest.previewSha256,null);
 await f.call('edit',{itemId:f.state.items[0].itemId,text:'CURRENT_OUTPUT_ONLY'});
 await f.call('preview');assert.equal(f.state.manifest.explicit[0].edited,true);
 assert.notEqual(f.state.manifest.previewSha256,original);assert.ok(f.state.text.includes('CURRENT_OUTPUT_ONLY'));
 const input=f.blocks[1];await f.s.editDocument({documentId:input.documentId,operationId:op(),blocks:[{id:input.id,expectedRevision:input.revision,libraryText:'CHANGED_UPSTREAM',note:input.note,excluded:false}]});
 const stale=await f.call('read');assert.equal(stale.state,'stale');assert.equal(stale.manifest.complete,false);
 assert.equal(stale.manifest.previewSha256,null);assert.equal(stale.manifest.explicit[0].ref.revision,input.revision);
 await assert.rejects(f.call('share',{format:'markdown'}),{code:'MEMORY_STALE'});assert.equal(f.requests.length,0);
});
test('VS06 changed payload cannot reuse the prior exact preview fingerprint',async()=>{
 const f=await setup();await f.call('add',{refs:[f.refs[0]]});await f.call('preview');
 // A corrupted transient snapshot must not become permission to release bytes
 // which were never shown, even if generation/confirmed markers are unchanged.
 const internal=f.service.manualSelections.sessions.get(f.state.selectionId);
 internal.items[0].override='UNREVIEWED_OUTPUT_CANARY';
 await assert.rejects(f.call('share',{format:'copy'}),{code:'MEMORY_STALE'});
 await f.call('preview');assert.ok((await f.call('share',{format:'copy'})).text.includes('UNREVIEWED_OUTPUT_CANARY'));
});
test('VS06 effective edited material budget is atomic on add, never silently truncated',async()=>{
 const f=await setup(Array.from({length:21},(_,i)=>'BUDGET_SMALL_'+i));
 await f.call('add',{refs:f.refs.slice(0,20)});
 const replacement='中'.repeat(200000);
 for(const item of [...f.state.items])await f.call('edit',{itemId:item.itemId,text:replacement});
 assert.equal(f.state.manifest.budget.materialUTF16Units,MANUAL_CONTEXT_LIMITS.materialUTF16Units);
 const generation=f.state.generation,ids=f.state.items.map(i=>i.itemId);
 await assert.rejects(f.call('add',{refs:[f.refs[20]]}),{code:'MEMORY_LIMIT'});
 const retained=await f.call('read');assert.equal(retained.generation,generation);assert.deepEqual(retained.items.map(i=>i.itemId),ids);
 await f.call('preview');assert.equal(f.state.manifest.complete,true);assert.equal(f.state.manifest.partial,false);
 assert.ok(f.state.text.includes(replacement));assert.equal(f.state.manifest.explicit.length,20);
 assert.equal((await f.call('share',{format:'copy'})).text,f.state.text);assert.equal(f.requests.length,0);
});

test('VS06 denial during asynchronous release fingerprinting refuses payload and clears blocked bytes',async()=>{
 const f=await setup();await f.call('add',{refs:[f.refs[0]]});await f.call('preview');
 const selections=f.service.manualSelections,validate=selections.validate.bind(selections);let reads=0;
 selections.validate=async session=>{if(++reads===2)await f.memory.exclude({inputId:f.refs[0].id,excluded:true});return validate(session);};
 await assert.rejects(f.call('share',{format:'copy'}),{code:'MEMORY_DENIED'});
 const held=selections.sessions.get(f.state.selectionId);assert.equal(held.items[0].body,'');assert.equal(held.items[0].override,undefined);
 assert.equal(selections.dto(held).text,'');assert.equal(selections.dto(held).manifest.previewSha256,null);assert.equal(f.requests.length,0);
});

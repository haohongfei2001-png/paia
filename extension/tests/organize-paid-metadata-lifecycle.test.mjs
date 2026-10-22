import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {fixture} from './harness/organize-material-method-fixture.mjs';
import {captureOriginalOrganizeScope,readOriginalOrganizeScope,releaseOriginalOrganizeScope,registerOriginalOrganizePaidMetadataBaseline} from '../core/organizer/organize-processing-scope.js';
import {assertOriginalOrganizeActionFacts,createOrganizeActionSource} from '../background/organize-action-source.js';
const sender={id:'synthetic',frameId:0,documentId:'document',url:'chrome-extension://synthetic/ui/archive.html',tab:{id:1,windowId:2,incognito:false}};
const event=()=>({addListener(){},removeListener(){}});
const api=()=>({runtime:{id:'synthetic',getURL:p=>'chrome-extension://synthetic/'+p,async getContexts(){return [{contextType:'TAB',documentId:sender.documentId,documentUrl:sender.url,tabId:1,windowId:2,frameId:0,incognito:false}];}},tabs:{onUpdated:event(),onRemoved:event(),async get(){return {...sender.tab,url:sender.url};}}});
async function read(f,fn){return f.s.run(()=>f.s.repository.transaction(false,async tx=>{const proof=await captureOriginalOrganizeScope(f.s,tx,f.topic.id,f.source,f.action);try{return await fn(proof,tx,readOriginalOrganizeScope(proof,f.s,tx));}finally{releaseOriginalOrganizeScope(proof);}}));}

test('foreign caller store or transaction is refused without retiring the original valid action',async t=>{
 const f=await fixture(t);await read(f,(proof,tx,facts)=>{assert.throws(()=>readOriginalOrganizeScope(proof,{...f.s},tx));assert.throws(()=>readOriginalOrganizeScope(proof,f.s,{...tx}));assert.equal(assertOriginalOrganizeActionFacts(f.source,f.action,f.s),true);assert.strictEqual(readOriginalOrganizeScope(proof,f.s,tx),facts);});await read(f,()=>{});
});

test('an issued proof observing actual original method replacement permanently retires all action qualification',async t=>{
 const f=await fixture(t);let called=0;
 await read(f,(proof,tx)=>{const d=Object.getOwnPropertyDescriptor(tx,'get'),method=tx.get;Object.defineProperty(tx,'get',{value:function(...args){called++;return method.apply(this,args);},configurable:true,writable:true});
  assert.throws(()=>readOriginalOrganizeScope(proof,f.s,tx));if(d)Object.defineProperty(tx,'get',d);else delete tx.get;
  assert.throws(()=>readOriginalOrganizeScope(proof,f.s,tx));assert.throws(()=>assertOriginalOrganizeActionFacts(f.source,f.action,f.s));
 });assert.equal(called,0);await assert.rejects(read(f,()=>{}));
});

test('a complete membership insertion after consume is refused without updating the paid baseline',async t=>{
 const f=await fixture(t),added=await f.s.createEntry({actor:'user',operationId:crypto.randomUUID(),body:'SYNTHETIC newly placed entry',type:'idea',formation:'explicit',evidence:[]});await f.s.placeEntry({topicId:f.topic.id,entryId:added.id,expectedEntryRevision:added.revision,expectedTopicRevision:(await f.s.topic(f.topic.id)).organizationRevision,operationId:crypto.randomUUID()});const placed=await f.s.repository.transaction(false,tx=>tx.all('placements'));assert.equal(placed.length,2);assert.ok(placed.some(row=>row.entryId===added.id));await assert.rejects(read(f,()=>{}));assert.throws(()=>assertOriginalOrganizeActionFacts(f.source,f.action,f.s));
});

test('complete membership deletion after consume is refused and stays retired after restoration',async t=>{
 const f=await fixture(t);const old=await f.s.repository.transaction(true,async tx=>{const row=(await tx.all('placements'))[0];await tx.delete('placements',row.id);return row;});await assert.rejects(read(f,()=>{}));await f.s.repository.transaction(true,tx=>tx.put('placements',old));await assert.rejects(read(f,()=>{}));
});

test('initial complex restore remains on the original full-fee capture path and never becomes a reuse registration',async t=>{
 const f=await fixture(t,{consume:false});await f.s.repository.transaction(true,tx=>tx.put('meta',{id:'recovery-restore-epoch',value:{generation:'original-complex'}}));
 const selected=await f.source.select(sender,{topicId:f.topic.id});f.action=await f.source.consume(sender,{topicId:f.topic.id,scopeBinding:selected.scopeBinding,userActionId:crypto.randomUUID()});
 const first=await read(f,(_p,_t,metadata)=>metadata),second=await read(f,(_p,_t,metadata)=>metadata);assert.deepEqual(first.restoreEpoch,{generation:'original-complex'});assert.deepEqual(first,second);assert.notStrictEqual(first,second);assert.equal(assertOriginalOrganizeActionFacts(f.source,f.action,f.s),true);
 assert.throws(()=>registerOriginalOrganizePaidMetadataBaseline(f.source,f.action,f.s,second));assert.throws(()=>assertOriginalOrganizeActionFacts(f.source,f.action,f.s));
});

test('held consume cannot expose an action or register free GET metadata before final authentication',async t=>{
 const f=await fixture(t,{consume:false}),raw=api(),source=createOrganizeActionSource(f.s,raw);t.after(()=>source.dispose());
 const selected=await source.select(sender,{topicId:f.topic.id});let enters=0,release,entered;const gate=new Promise(r=>{release=r;}),atFinal=new Promise(r=>{entered=r;});const original=raw.runtime.getContexts;
 raw.runtime.getContexts=async function(...args){if(++enters===2){entered();await gate;}return original.apply(this,args);};
 let returned=false;const pending=source.consume(sender,{topicId:f.topic.id,scopeBinding:selected.scopeBinding,userActionId:crypto.randomUUID()}).then(value=>{returned=true;return value;});await atFinal;
 let free;await f.s.run(()=>f.s.repository.transaction(false,async tx=>{const proof=await captureOriginalOrganizeScope(f.s,tx,f.topic.id);try{free=readOriginalOrganizeScope(proof,f.s,tx);}finally{releaseOriginalOrganizeScope(proof);}}));
 assert.equal(returned,false);assert.throws(()=>registerOriginalOrganizePaidMetadataBaseline(source,{},f.s,free));release();const action=await pending;assert.equal(assertOriginalOrganizeActionFacts(source,action,f.s),true);await read({...f,source,action},()=>{});
});

for(const firstImport of ['./core/memory/service.js','./background/organize-action-source.js','./core/organizer/organize-processing-scope.js'])test('fresh cold '+firstImport+' immediately supports the original paid material flow',()=>{
 const program=`import assert from 'node:assert/strict';await import(${JSON.stringify(firstImport)});const {fixture,material}=await import('./tests/harness/organize-material-method-fixture.mjs');const {captureOriginalOrganizeScopeReader}=await import('./background/organize-processing-policy.js');const cleanup=[];const f=await fixture({after:fn=>cleanup.push(fn)});try{const value=await f.read(async(_r,g,tx)=>material(f,tx,captureOriginalOrganizeScopeReader(g,f.s,tx)));assert.equal(value.topic.entries.length,1);assert.equal(value.topic.id,f.topic.id);console.log('COLD_PAID_MATERIAL_OK');}finally{for(const fn of cleanup.reverse())await fn();}`;
 const result=spawnSync(process.execPath,['--input-type=module','-e',program],{cwd:fileURLToPath(new URL('../',import.meta.url)),encoding:'utf8',timeout:10000});assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/COLD_PAID_MATERIAL_OK/);
});

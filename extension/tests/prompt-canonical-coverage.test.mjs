import test from 'node:test';
import assert from 'node:assert/strict';
import {setup} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {PromptReuseService} from '../core/prompt-reuse-service.js';
import {BrowserNativeSyncCore} from '../core/browser-native-sync/core.js';
import {PromptSyncJournal,materializePrompt} from '../core/browser-native-sync/prompt-journal.js';
import {PROMPT_REUSE_ROW,readPromptPreferences} from '../core/prompt-reuse-preferences.js';
import {readPromptCanonicalCoverage} from '../core/browser-native-sync/prompt-canonical-coverage.js';
import {SyncError} from '../core/browser-native-sync/value.js';
import {readCanonicalReadiness} from '../core/browser-native-sync/canonical-readiness.js';
const datasetId='synthetic_coverage';
async function fixture(){const f=await setup(OrganizerStore);await f.s.finishFoundation();const core=new BrowserNativeSyncCore(f.s.repository,{datasetId,deviceId:'synthetic_local',materialize:materializePrompt}),journal=new PromptSyncJournal(core),service=new PromptReuseService(f.s,{syncJournal:journal});return {...f,core,journal,service};}
const preferences=f=>f.core.transaction(false,readPromptPreferences,['meta']);
const meta=f=>f.core.transaction(false,t=>t.all('meta'),['meta']);
const create=async f=>{await f.service.change({action:'create',revision:0,text:'SYNTHETIC private prompt'});return (await preferences(f)).overrides[0].id;};
test('preserved baseline: tracked Prompt currently remains unproven in original key-only readiness',async()=>{
 const f=await fixture();await create(f);const before=await meta(f),report=await readCanonicalReadiness(f.core,{promptService:f.service}),p=report.families.find(x=>x.type==='promptPreferences');
 assert.equal(p.journalBound,true);assert.equal(p.registeredHead,true);assert.ok(p.reasons.includes('CANONICAL_COVERAGE_UNPROVEN'));assert.equal(p.ready,false);assert.equal(report.fullCanonicalReady,false);assert.equal(report.productionActivation,false);assert.deepEqual(await meta(f),before);
});

const check=f=>readPromptCanonicalCoverage(f.core,{promptService:f.service});
const denied=(r,reason)=>{assert.equal(r.covered,false);assert.equal(r.state,'NOT_ADMITTED');assert.equal(r.productionActivation,false);if(reason)assert.equal(r.reason,reason);};
const unchanged=async(f,run)=>{const before=await meta(f),r=await run();assert.deepEqual(await meta(f),before);assert.doesNotMatch(JSON.stringify(r),/SYNTHETIC private|overrides|pins|revisionId/);return r;};
test('actual journal create/edit and verified ranking reuse align original persisted owner proof without admitting activation',async()=>{
 const f=await fixture(),id=await create(f);for(const action of ['created','edit','ranking']){if(action==='edit')await f.service.change({action:'edit',id,revision:(await preferences(f)).revision,text:'SYNTHETIC private edited'});if(action==='ranking')await f.service.noteVerifiedReuse(id);const r=await unchanged(f,()=>check(f));assert.deepEqual(r,{version:1,state:'NOT_ADMITTED',covered:true,reason:null,productionActivation:false});}
});
test('nonempty explicit bootstrap qualifies but absent default-empty bootstrap never supplies persisted coverage',async()=>{
 for(const nonempty of [true,false]){const f=await fixture();if(nonempty)await new PromptReuseService(f.s).change({action:'create',revision:0,text:'SYNTHETIC private bootstrap'});await f.journal.bootstrap();const r=await unchanged(f,()=>check(f));if(nonempty)assert.equal(r.covered,true);else denied(r,'empty_untracked');}
});
test('unchanged portable bytes after an untracked same-value edit remain unproven by owner revision',async()=>{
 const f=await fixture(),id=await create(f),plain=new PromptReuseService(f.s);const before=await preferences(f);await plain.change({action:'edit',id,revision:before.revision,text:before.overrides[0].text});assert.ok((await preferences(f)).revision>before.revision);denied(await unchanged(f,()=>check(f)),'owner_revision_changed');
});
test('same-text edit then reversion and ranking cannot renew a stale materialized owner proof',async()=>{
 const f=await fixture(),id=await create(f),plain=new PromptReuseService(f.s),original=(await preferences(f)).overrides[0].text;for(const text of ['SYNTHETIC private untracked',original])await plain.change({action:'edit',id,revision:(await preferences(f)).revision,text});await f.service.noteVerifiedReuse(id);denied(await unchanged(f,()=>check(f)),'owner_revision_changed');
});
for(const mode of ['canonical-absent','canonical-defaultlike-invalid','canonical-invalid','proof-absent','proof-invalid','proof-revision','revision-absent','revision-invalid','head-absent','head-changed','head-type','head-entity','proof-bytes','revision-dataset','revision-id','revision-codec','revision-codec-absent','revision-codec-undefined','revision-identity','bytes-changed','purge','multihead','fence-absent','epoch-changed','namespace-changed'])test('actual persisted '+mode+' refuses readonly coverage without writes',async()=>{
 const f=await fixture();await create(f);await f.core.transaction(true,async t=>{
  const proof=await f.core.get(t,'materializedOwner','promptPreferences',PROMPT_REUSE_ROW),head=await f.core.get(t,'head','promptPreferences',PROMPT_REUSE_ROW),revision=await f.core.get(t,'revision',proof.revisionId);
  if(mode==='canonical-absent')await t.delete('meta',PROMPT_REUSE_ROW);
  if(mode==='canonical-defaultlike-invalid')await t.put('meta',{id:PROMPT_REUSE_ROW,value:false});
  if(mode==='canonical-invalid')await t.put('meta',{...(await readPromptPreferences(t)),revision:-1});
  if(mode==='proof-absent')await t.delete('meta',proof.id);
  if(mode==='proof-invalid')await t.put('meta',{...proof,version:2});
  if(mode==='proof-revision')await t.put('meta',{...proof,ownerRevision:proof.ownerRevision+1});
  if(mode==='revision-absent')await t.delete('meta',revision.id);
  if(mode==='revision-invalid')await t.put('meta',{...revision,redacted:true});
  if(mode==='head-absent')await t.delete('meta',head.id);
  if(mode==='head-type')await t.put('meta',{...head,type:'contextItem'});
  if(mode==='head-entity')await t.put('meta',{...head,entityId:'foreign-owner'});
  if(mode==='proof-bytes')await t.put('meta',{...revision,operation:{...revision.operation,value:{...revision.operation.value,overrides:revision.operation.value.overrides.map(row=>({...row,text:'SYNTHETIC private altered proof'}))}}});
  if(mode==='revision-dataset')await t.put('meta',{...revision,operation:{...revision.operation,datasetId:'foreign_dataset'}});
  if(mode==='revision-id')await t.put('meta',{...revision,operation:{...revision.operation,revisionId:'a'.repeat(64)}});
  if(mode==='revision-codec-absent'){const operation={...revision.operation};delete operation.codecVersion;await t.put('meta',{...revision,operation});}
  if(mode==='revision-codec-undefined')await t.put('meta',{...revision,operation:{...revision.operation,codecVersion:undefined}});
  if(mode==='revision-codec')await t.put('meta',{...revision,operation:{...revision.operation,codecVersion:99}});
  if(mode==='revision-identity')await t.put('meta',{...revision,operation:{...revision.operation,entityId:'foreign-owner'}});
  if(mode==='head-changed')await t.put('meta',{...head,revisions:['a'.repeat(64)]});
  if(mode==='bytes-changed'){const row=await readPromptPreferences(t);row.overrides[0].text='SYNTHETIC private changed without revision';await t.put('meta',row);}
  if(mode==='purge')await t.put('meta',{...head,purged:true,revisions:[]});
  if(mode==='multihead')await t.put('meta',{...head,revisions:[proof.revisionId,'a'.repeat(64)]});
  if(mode==='fence-absent')await t.delete('meta',await f.core.idIn(t,'ownerRecoveryEpoch'));
  if(mode==='epoch-changed')await t.put('meta',{id:'recovery-restore-epoch',value:'unrelated_restore_epoch'});
  if(mode==='namespace-changed'){await t.delete('meta',proof.id);await t.put('meta',{...proof,id:proof.id.replace('generation:','generation:unrelated_namespace:')});}
 });
 const before=await meta(f);if(['canonical-defaultlike-invalid','canonical-invalid','proof-invalid','revision-absent','revision-invalid','revision-identity','epoch-changed'].includes(mode))await assert.rejects(check(f));else denied(await check(f));assert.deepEqual(await meta(f),before);
});
test('foreign journal/core/namespace and replaced materializer cannot claim the bound original owner',async()=>{
 const f=await fixture();await create(f);const other=new BrowserNativeSyncCore(f.s.repository,{datasetId,deviceId:'other_device',materialize:materializePrompt,namespace:'foreign_namespace'});denied(await readPromptCanonicalCoverage(other,{promptService:f.service}),'writer_not_bound');const otherService=new PromptReuseService(f.s,{syncJournal:new PromptSyncJournal(other)});denied(await readPromptCanonicalCoverage(other,{promptService:otherService}),'restore_fence_missing');denied(await readPromptCanonicalCoverage(f.core),'writer_not_bound');f.core.materialize=null;denied(await check(f),'writer_not_bound');
});

test('original storage/proof read failure propagates without a positive check or database mutation',async()=>{const f=await fixture();await create(f);const primary=new SyncError('BNS_SYNTHETIC_PROOF_READ_FAILED'),before=await meta(f);f.core.materializedOwner=async()=>{throw primary;};await assert.rejects(check(f),e=>e===primary);assert.deepEqual(await meta(f),before);});
test('public binding replaced after the original readonly outcome cannot expose its stale positive result',async()=>{const f=await fixture();await create(f);const original=f.core.transaction.bind(f.core);f.core.transaction=async(...args)=>{const value=await original(...args);f.core.materialize=null;return value;};denied(await check(f),'binding_changed');});

test('unknown original storage error keeps the existing STORAGE_FAILED refusal contract',async()=>{const f=await fixture();await create(f);const before=await meta(f);f.core.materializedOwner=async()=>{throw Error('SYNTHETIC unknown native failure');};await assert.rejects(check(f),e=>e.code==='STORAGE_FAILED');assert.deepEqual(await meta(f),before);});

for(const mode of ['protocol','actor','parents','extra-field','digest'])test('original operation validator refuses stored '+mode+' after the readonly cut',async()=>{
 const f=await fixture();await create(f);
 await f.core.transaction(true,async t=>{const proof=await f.core.materializedOwner(t,'promptPreferences',PROMPT_REUSE_ROW),row=await f.core.get(t,'revision',proof.revisionId),operation={...row.operation};
  if(mode==='protocol')operation.protocol=99;
  if(mode==='actor')operation.actor='source';
  if(mode==='parents')operation.parents=['not-a-revision'];
  if(mode==='extra-field')operation.unrecognized=true;
  if(mode==='digest')operation.operationId='synthetic_different_valid_operation';
  await t.put('meta',{...row,operation});
 });
 denied(await unchanged(f,()=>check(f)),'owner_operation_invalid');
});
async function withDigest(fn,run){const owner=crypto.subtle,before=Object.getOwnPropertyDescriptor(owner,'digest'),original=owner.digest.bind(owner);Object.defineProperty(owner,'digest',{configurable:true,writable:true,value:(...args)=>fn(original,...args)});try{return await run();}finally{if(before)Object.defineProperty(owner,'digest',before);else delete owner.digest;}}
test('original operation crypto runs only after the actual readonly transaction promise settles',async()=>{
 const f=await fixture();await create(f);let pending=false,calls=0;const transaction=f.core.transaction.bind(f.core);
 f.core.transaction=async(...args)=>{pending=true;try{return await transaction(...args);}finally{pending=false;}};
 await withDigest(async(original,...args)=>{calls++;assert.equal(pending,false,'no crypto while original readonly transaction remains pending');return original(...args);},async()=>{assert.equal((await unchanged(f,()=>check(f))).covered,true);});
 assert.ok(calls>0,'the original operation digest was actually checked');
});
test('unknown crypto failure remains the same error rather than a positive or typed refusal',async()=>{
 const f=await fixture();await create(f);const primary=Error('SYNTHETIC crypto failure'),before=await meta(f);
 await withDigest(()=>{throw primary;},()=>assert.rejects(check(f),error=>error===primary));assert.deepEqual(await meta(f),before);
});
test('original public binding changed during post-transaction crypto cannot return old positive facts',async()=>{
 const f=await fixture();await create(f);
 await withDigest(async(original,...args)=>{const value=await original(...args);f.core.materialize=null;return value;},async()=>denied(await unchanged(f,()=>check(f)),'binding_changed'));
});

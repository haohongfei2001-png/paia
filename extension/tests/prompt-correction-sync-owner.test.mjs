import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory} from './vendor/fake-indexeddb/build/esm/index.js';
import {local,capture,inputEdit} from './harness/thought-m1.mjs';
import {LibraryDocumentsStore} from '../core/library-documents-store.js';
import {PromptReuseService} from '../core/prompt-reuse-service.js';
import {projectPromptFamilies} from '../core/prompt-family.js';
import {PROMPT_REUSE_ROW,readPromptPreferences} from '../core/prompt-reuse-preferences.js';
import {BrowserNativeSyncCore,validateOperation} from '../core/browser-native-sync/core.js';
import {SourceBootstrapJournal} from '../core/browser-native-sync/source-bootstrap-journal.js';
import {InputWorkingSyncJournal} from '../core/browser-native-sync/input-working-journal.js';
import {FilterIntentSyncJournal} from '../core/browser-native-sync/filter-intent-journal.js';
import {PromptSyncJournal} from '../core/browser-native-sync/prompt-journal.js';
import {projectEntity} from '../core/browser-native-sync/codecs.js';
import {buildCheckpoint} from '../core/browser-native-sync/checkpoints.js';
import {GroupedCheckpointRestore} from '../core/browser-native-sync/group-checkpoint.js';
import {PROMPT_CORRECTION_BINDING_ROW,PROMPT_CORRECTION_NORMALIZER_VERSION,promptCorrectionEnvelope,planPromptCorrectionBinding} from '../core/browser-native-sync/prompt-correction-binding.js';

const text='解释这个算法，保留限制和反例。';
const prefs=f=>f.s.repository.transaction(false,readPromptPreferences);
const row=f=>f.s.repository.transaction(false,t=>t.get('meta',PROMPT_CORRECTION_BINDING_ROW));
const whole=f=>f.s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all(f.s.repository.stores.map(async name=>[name,await t.all(name)]))));
const protocol=f=>f.core.transaction(false,async t=>({generation:await f.core.get(t,'generation'),device:await f.core.get(t,'device',f.core.deviceId),heads:await t.primaryRangePage('meta',{prefix:await f.core.idIn(t,'head'),limit:100}),outbox:await t.primaryRangePage('meta',{prefix:await f.core.idIn(t,'outbox'),limit:100})}),['meta']);
const archive=f=>f.s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all(['records','times','blocks','inputStates','revisions','documents','libraryDocuments','filterIntents'].map(async name=>[name,await t.all(name)]))));
const permission=f=>f.s.repository.transaction(false,async t=>({control:structuredClone(await f.s.control(t)),gate:await t.get('meta','gate'),context:await t.get('meta','context-cards:v1'),topicAccess:await t.get('meta','context-topic-access:v1')}));
async function fixture({texts=[text,text,text]}={}){
 const s=new LibraryDocumentsStore(local(),{indexedDB:new IDBFactory()});await s.consent(true);await s.finishFoundation();
 const core=new BrowserNativeSyncCore(s.repository,{datasetId:'SYNTHETIC_prompt_binding_owner',deviceId:'SYNTHETIC_prompt_binding_device'});
 s.sourceBootstrapJournal=new SourceBootstrapJournal(core);s.filterIntentJournal=new FilterIntentSyncJournal(core);s.inputWorkingJournal=new InputWorkingSyncJournal(core,{filterJournal:s.filterIntentJournal,logicalCommits:true});
 const epoch=(await s.status()).epoch;for(let i=0;i<texts.length;i++)await s.capture(capture(epoch,'SYNTHETIC_prompt_source_'+i,texts[i]));
 const journal=new PromptSyncJournal(core,{correctionBindings:true}),service=new PromptReuseService(s,{syncJournal:journal});return {s,core,journal,service};
}
async function change(f,action,id,extra={}){return f.service.change({action,...(id===undefined?{}:{id}),revision:(await prefs(f)).revision,...extra});}
async function pair(f){
 const physical=await prefs(f),binding=await row(f),ph=await f.core.read('head','promptPreferences',PROMPT_REUSE_ROW),bh=await f.core.read('head','promptBinding',PROMPT_REUSE_ROW);
 assert.equal(ph.revisions.length,1);assert.equal(bh.revisions.length,1);
 const prompt=(await f.core.read('revision',ph.revisions[0])).operation,companion=(await f.core.read('revision',bh.revisions[0])).operation;
 await validateOperation(prompt);await validateOperation(companion);assert.equal(prompt.codecVersion,1);assert.equal(companion.codecVersion,1);
 assert.deepEqual(prompt.value,projectEntity('promptPreferences',physical));assert.equal(companion.value.promptRevisionId,prompt.revisionId);
 assert.deepEqual(Object.keys(companion.value).sort(),['id','version','promptRevisionId','normalizerVersion','bindings'].sort());
 assert.equal(companion.value.id,PROMPT_REUSE_ROW);assert.equal(binding.id,PROMPT_CORRECTION_BINDING_ROW);assert.deepEqual({...binding,id:PROMPT_REUSE_ROW},companion.value);
 assert.equal(companion.value.normalizerVersion,PROMPT_CORRECTION_NORMALIZER_VERSION);promptCorrectionEnvelope(companion.value,prompt.value);
 const proofs=await f.core.transaction(false,async t=>[await f.core.materializedOwner(t,'promptPreferences',PROMPT_REUSE_ROW),await f.core.materializedOwner(t,'promptBinding',PROMPT_REUSE_ROW)],['meta']);
 for(const [i,op]of [prompt,companion].entries()){assert.equal(proofs[i].revisionId,op.revisionId);assert.equal(proofs[i].ownerRevision,physical.revision);assert.deepEqual(proofs[i].operation,op);}
 return {physical,binding,prompt,companion};
}
async function seeded(){const f=await fixture();const family=(await f.service.snapshot()).families.find(x=>x.members.length===3);assert.ok(family);await change(f,'edit',family.id,{text:'SYNTHETIC original human correction 中文🙂'});return {...f,family};}

test('actual Source and Prompt owner commit two linked operations/outboxes without changing archive or permission',async()=>{
 const f=await fixture();try{const x=await f.service.snapshot(),family=x.families.find(x=>x.members.length===3),before=await protocol(f),data=await archive(f),grant=await permission(f);
 await change(f,'edit',family.id,{text:'SYNTHETIC corrected original body 👩‍💻'});const p=await pair(f),after=await protocol(f);
 assert.equal(p.prompt.actor,'user');assert.equal(p.companion.actor,'user');assert.equal(p.companion.sequence,p.prompt.sequence+1);assert.equal(after.device.sequence,before.device.sequence+2);assert.equal(after.outbox.rows.length,before.outbox.rows.length+2);
 for(const op of [p.prompt,p.companion])assert.deepEqual(await f.core.read('outbox',op.operationId),{id:await f.core.transaction(false,t=>f.core.idIn(t,'outbox',op.operationId),['meta']),operationId:op.operationId,revisionId:op.revisionId,state:'queued'});
 assert.deepEqual(p.binding.bindings,[{familyId:family.id,kind:'family',inputIds:[...family.members].sort()}]);assert.deepEqual(await archive(f),data);assert.deepEqual(await permission(f),grant);
 }finally{await f.s.repository.close();}
});

test('original full corrections, ordered pins, representative and split facts have required body-free bindings',async()=>{
 const f=await seeded();try{await change(f,'representative',f.family.id,{representative:f.family.members[0]});await change(f,'pin',f.family.id);const manual=await change(f,'create',undefined,{text:'SYNTHETIC independent manual body'});await change(f,'pin',manual.id,{order:[manual.id,f.family.id]});await change(f,'split',f.family.id,{inputIds:[f.family.members[0]]});
 const p=await pair(f);assert.deepEqual(p.physical.pins,[manual.id,f.family.id]);assert.equal(p.physical.overrides.find(x=>x.id===f.family.id).representative,f.family.members[0]);assert.equal(p.physical.splits.length,1);assert.equal(p.physical.splits[0].inputId,f.family.members[0]);assert.ok(p.physical.splits[0].group);
 assert.deepEqual(p.binding.bindings.map(x=>x.familyId),[manual.id,f.family.id].sort());assert.deepEqual(p.binding.bindings.find(x=>x.familyId===manual.id),{familyId:manual.id,kind:'manual',inputIds:[]});assert.deepEqual(p.binding.bindings.find(x=>x.familyId===f.family.id).inputIds,[...f.family.members].sort());assert.equal('portablePreferences'in p.binding,false);
 }finally{await f.s.repository.close();}
});

test('prejournal populated Prompt bootstrap preserves real row and adds only the initial two bootstrap operations',async()=>{
 const f=await fixture();try{const plain=new PromptReuseService(f.s),family=(await plain.snapshot()).families.find(x=>x.members.length===3);await plain.change({action:'edit',id:family.id,revision:0,text:'SYNTHETIC prejournal work'});await plain.change({action:'representative',id:family.id,revision:(await prefs(f)).revision,representative:family.members[0]});await plain.change({action:'pin',id:family.id,revision:(await prefs(f)).revision});await plain.change({action:'split',id:family.id,revision:(await prefs(f)).revision,inputIds:[family.members[0]]});await plain.change({action:'create',revision:(await prefs(f)).revision,text:'SYNTHETIC prejournal manual'});
 const before=await prefs(f),beforeProtocol=await protocol(f);await f.journal.bootstrap(f.service);const p=await pair(f),after=await protocol(f);assert.deepEqual(await prefs(f),before);assert.equal(p.prompt.actor,'bootstrap');assert.equal(p.companion.actor,'bootstrap');assert.deepEqual(p.prompt.parents,[]);assert.deepEqual(p.companion.parents,[]);assert.equal(after.outbox.rows.length,beforeProtocol.outbox.rows.length+2);
 await assert.rejects(f.journal.bootstrap(f.service),{code:'BNS_BOOTSTRAP_EXISTS'});
 }finally{await f.s.repository.close();}
});

test('existing actual A manual Prompt head enrolls one bootstrap companion without rewriting Prompt history',async()=>{
 const f=await fixture();try{const legacy=new PromptReuseService(f.s,{syncJournal:new PromptSyncJournal(f.core)});await legacy.change({action:'create',revision:0,text:'SYNTHETIC original A manual'});const before=await prefs(f),oldHead=await f.core.read('head','promptPreferences',PROMPT_REUSE_ROW),oldProof=await f.core.transaction(false,t=>f.core.materializedOwner(t,'promptPreferences',PROMPT_REUSE_ROW),['meta']),beforeProtocol=await protocol(f);
 await f.journal.bootstrap(f.service);const p=await pair(f);assert.deepEqual(await prefs(f),before);assert.deepEqual(await f.core.read('head','promptPreferences',PROMPT_REUSE_ROW),oldHead);assert.deepEqual(await f.core.transaction(false,t=>f.core.materializedOwner(t,'promptPreferences',PROMPT_REUSE_ROW),['meta']),oldProof);assert.equal(p.companion.actor,'bootstrap');assert.deepEqual(p.companion.parents,[]);assert.equal((await protocol(f)).outbox.rows.length,beforeProtocol.outbox.rows.length+1);
 const oldBinding=p.companion.revisionId;await change(f,'edit',p.physical.overrides[0].id,{text:'SYNTHETIC genuine later B edit'});const next=await pair(f);assert.deepEqual(next.prompt.parents,oldHead.revisions);assert.deepEqual(next.companion.parents,[oldBinding]);assert.equal(next.prompt.actor,'user');assert.equal(next.companion.actor,'user');
 }finally{await f.s.repository.close();}
});

test('genuine Working edits retain old correction Input anchors and allow a body-free current target rebind',async()=>{
 const f=await seeded();try{const initial=await pair(f),oldBindings=structuredClone(initial.binding.bindings);for(const id of f.family.members)await inputEdit(f.s,id,{libraryText:'SYNTHETIC genuinely changed Working prompt'});const current=await f.service.snapshot(),currentFamily=(await projectPromptFamilies(current.inputs,current.preferences)).find(x=>x.members.length===3);assert.ok(currentFamily);assert.notEqual(currentFamily.id,f.family.id);const owned=current.families.find(x=>x.id===f.family.id);assert.deepEqual(owned.members,[...f.family.members].sort());assert.equal(owned.text,'SYNTHETIC original human correction 中文🙂');
 await change(f,'pin',f.family.id);const p=await pair(f);assert.deepEqual(p.binding.bindings,oldBindings);assert.equal(p.physical.overrides.find(x=>x.id===f.family.id).text,'SYNTHETIC original human correction 中文🙂');
 const planned=await planPromptCorrectionBinding({binding:promptCorrectionEnvelope(p.companion.value,p.prompt.value),inputs:(await f.service.snapshot()).inputs,normalizerVersion:PROMPT_CORRECTION_NORMALIZER_VERSION});assert.equal(planned.complete,true);assert.deepEqual(planned.mappings,[{familyId:f.family.id,targetId:currentFamily.id,status:'bound'}]);assert.equal(planned.portablePreferences.overrides[0].id,f.family.id);
 }finally{await f.s.repository.close();}
});

test('verified local reuse renews both owner revisions without new portable operation or binding recapture',async()=>{
 const f=await seeded();try{const initial=await pair(f),before=await protocol(f);await f.service.noteVerifiedReuse(f.family.id);const p=await pair(f);assert.equal(p.physical.revision,initial.physical.revision+1);assert.equal(p.physical.overrides[0].reuseCount,1);assert.deepEqual(p.binding,initial.binding);assert.equal(p.prompt.revisionId,initial.prompt.revisionId);assert.equal(p.companion.revisionId,initial.companion.revisionId);assert.deepEqual(await protocol(f),before);
 }finally{await f.s.repository.close();}
});

test('a genuine formerly eligible Working edit retains work when original eligibility omits a missing Prompt anchor',async()=>{
 const f=await seeded();try{const initial=await pair(f),grant=await permission(f),missing=f.family.members[0],generation=(await f.service.snapshot()).generation;await inputEdit(f.s,missing,{libraryText:'   '});const before=await whole(f),snapshot=await f.service.snapshot();
 assert.ok(snapshot.generation>generation);assert.equal(snapshot.inputs.some(x=>x.id===missing),false);assert.equal(snapshot.bindingsComplete,false);assert.deepEqual(snapshot.unresolved,[{kind:'family',familyId:f.family.id,reason:'missing_anchor'}]);assert.ok(snapshot.unresolved.every(x=>!('text'in x)&&!('body'in x)));assert.deepEqual(await prefs(f),initial.physical);assert.deepEqual(await row(f),initial.binding);const raw=(await projectPromptFamilies(snapshot.inputs,{...snapshot.preferences,pins:[],overrides:[]})).find(x=>x.id===f.family.id);assert.equal(raw.members.length,2);assert.notEqual(raw.text,'SYNTHETIC original human correction 中文🙂');const retained=snapshot.families.find(x=>x.id===f.family.id);assert.equal(retained.text,'SYNTHETIC original human correction 中文🙂');assert.deepEqual(retained.members,[]);assert.equal(snapshot.families.filter(x=>x.id===f.family.id).length,1);assert.deepEqual(await whole(f),before);assert.deepEqual(await permission(f),grant);
 }finally{await f.s.repository.close();}
});

test('genuine Working convergence keeps both human corrections and ordered pins unresolved without overwriting either body',async()=>{
 const f=await fixture({texts:['请解释甲算法并保留反例','请解释甲算法并保留反例','请解释乙算法并保留反例','请解释乙算法并保留反例']});try{const families=(await f.service.snapshot()).families.filter(x=>x.members.length===2);assert.equal(families.length,2);for(const [i,family]of families.entries())await change(f,'edit',family.id,{text:'SYNTHETIC distinct original correction '+i});await change(f,'pin',families[0].id);await change(f,'pin',families[1].id,{order:[families[1].id,families[0].id]});const initial=await pair(f);
 for(const family of families)for(const id of family.members)await inputEdit(f.s,id,{libraryText:'SYNTHETIC both families now genuinely converge'});const before=await whole(f),snapshot=await f.service.snapshot();assert.equal(snapshot.bindingsComplete,false);assert.equal(snapshot.unresolved.length,2);assert.ok(snapshot.unresolved.every(x=>x.kind==='family'&&x.reason==='correction_collision'&&!('body'in x)&&!('text'in x)));assert.deepEqual(new Set(snapshot.unresolved.map(x=>x.familyId)),new Set(families.map(x=>x.id)));
 for(const [i,family]of families.entries()){const retained=snapshot.families.find(x=>x.id===family.id);assert.equal(retained.text,'SYNTHETIC distinct original correction '+i);assert.deepEqual(retained.members,[]);}const automatic=snapshot.families.find(x=>x.members.length===4);assert.ok(automatic);assert.equal(automatic.text,'SYNTHETIC both families now genuinely converge');assert.deepEqual(await prefs(f),initial.physical);assert.deepEqual(await row(f),initial.binding);assert.deepEqual(await whole(f),before);
 }finally{await f.s.repository.close();}
});

test('failure after real paired commit work aborts physical row, binding and both outboxes across the complete repository',async()=>{
 const f=await seeded();try{await f.service.snapshot();const before=await whole(f),commit=f.journal.commit.bind(f.journal);let reached=false;f.journal.commit=async(t,prepared)=>{const result=await commit(t,prepared);reached=true;throw new Error('SYNTHETIC after actual paired owner/outbox writes');};
 await assert.rejects(change(f,'edit',f.family.id,{text:'SYNTHETIC must roll back'}),{code:'STORAGE_FAILED'});assert.equal(reached,true);assert.deepEqual(await whole(f),before);
 }finally{await f.s.repository.close();}
});

test('a real concurrent original Prompt write after paired prepare wins CAS and leaves no half-pair',async()=>{
 const f=await seeded();try{const plain=new PromptReuseService(f.s),prepare=f.journal.prepare.bind(f.journal);let afterRace=null;f.journal.prepare=async(before,after,snapshot)=>{const prepared=await prepare(before,after,snapshot);await plain.change({action:'create',revision:before.revision,text:'SYNTHETIC real concurrent original write'});afterRace=await whole(f);return prepared;};
 await assert.rejects(change(f,'edit',f.family.id,{text:'SYNTHETIC stale proposed paired edit'}),{code:'MEMORY_STALE'});assert.ok(afterRace);assert.deepEqual(await whole(f),afterRace);
 }finally{await f.s.repository.close();}
});

test('missing physical companion refuses a subsequent genuine owner write with no repository changes',async()=>{
 const f=await seeded();try{await f.s.repository.transaction(true,t=>t.delete('meta',PROMPT_CORRECTION_BINDING_ROW));const before=await whole(f);await assert.rejects(f.service.snapshot(),{code:'BNS_PROMPT_BINDING_REQUIRED'});await assert.rejects(change(f,'edit',f.family.id,{text:'SYNTHETIC missing binding refused'}),{code:'BNS_PROMPT_BINDING_REQUIRED'});assert.deepEqual(await whole(f),before);
 }finally{await f.s.repository.close();}
});

test('a swapped older valid physical companion cannot qualify the current Prompt head or mutate the repository',async()=>{
 const f=await seeded();try{const old=await row(f);await change(f,'edit',f.family.id,{text:'SYNTHETIC newer actual correction'});assert.notEqual((await row(f)).promptRevisionId,old.promptRevisionId);await f.s.repository.transaction(true,t=>t.put('meta',old));const before=await whole(f);await assert.rejects(f.service.snapshot(),{code:'BNS_OWNER_CHANGED'});await assert.rejects(change(f,'hide',f.family.id),{code:'BNS_OWNER_CHANGED'});assert.deepEqual(await whole(f),before);
 }finally{await f.s.repository.close();}
});

test('original grouped owner consumes full Prompt from closed A through B Working continuation and closed B to fresh C',async()=>{
 const a=await fixture();let b,c;const objects=new Map(),cloud={async putImmutable(ref,bytes){objects.set(ref.id,bytes.slice());},async get(ref){return objects.get(ref.id)?.slice();}};
 async function receiver(deviceId,cut){
  const s=new LibraryDocumentsStore(local(),{indexedDB:new IDBFactory()});await s.consent(true);await s.finishFoundation();const core=new BrowserNativeSyncCore(s.repository,{datasetId:a.core.datasetId,deviceId}),filter=new FilterIntentSyncJournal(core);s.sourceBootstrapJournal=new SourceBootstrapJournal(core);s.filterIntentJournal=filter;s.inputWorkingJournal=new InputWorkingSyncJournal(core,{filterJournal:filter,logicalCommits:true});
  const journal=new PromptSyncJournal(core,{correctionBindings:true}),service=new PromptReuseService(s,{syncJournal:journal}),f={s,core,journal,service},grant=await permission(f),restore=new GroupedCheckpointRestore(core,{store:s,restoreId:crypto.randomUUID()});
  try{await restore.stageCheckpoint(cut.ref,ref=>cloud.get(ref));assert.equal((await restore.activate()).state,'activated');let cleanup;do{cleanup=await restore.cleanup({limit:3});}while(!cleanup.complete);assert.deepEqual(await permission(f),grant);const queued=[];for await(const x of core.rows('outbox'))queued.push(x);assert.deepEqual(queued,[]);return {...f,restore};}catch(error){await s.repository.close();throw error;}
 }
 try{
  const family=(await a.service.snapshot()).families.find(x=>x.members.length===3);await change(a,'split',family.id,{inputIds:[family.members[0]]});const current=(await a.service.snapshot()).families.find(x=>x.members.length===2);await change(a,'edit',current.id,{text:'SYNTHETIC original full correction A'});await change(a,'representative',current.id,{representative:current.members[0]});const manual=await change(a,'create',undefined,{text:'SYNTHETIC original independent manual A'});await change(a,'pin',current.id);await change(a,'pin',manual.id,{order:[manual.id,current.id]});
  const original=await pair(a),source=(await archive(a)).records,cutA=await buildCheckpoint(a.core,cloud,{grouped:{store:a.s}});await a.s.repository.close();assert.equal(a.s.repository.db,null);
  b=await receiver('SYNTHETIC_prompt_fresh_B',cutA);const restored=await pair(b),queryB=await b.service.query({includeHidden:true});assert.deepEqual(restored.prompt.value,original.prompt.value);assert.deepEqual(restored.companion.value,original.companion.value);assert.deepEqual(restored.physical.pins,original.physical.pins);assert.deepEqual(restored.physical.splits,original.physical.splits);assert.equal(queryB.items.find(x=>x.id===current.id).text,'SYNTHETIC original full correction A');assert.deepEqual((await archive(b)).records,source);
  for(const id of family.members)await inputEdit(b.s,id,{libraryText:'SYNTHETIC genuine postrestore B Working continuation'});const boundB=await b.service.snapshot();assert.equal(boundB.bindingsComplete,true);assert.equal(boundB.families.find(x=>x.id===current.id).text,'SYNTHETIC original full correction A');assert.deepEqual(boundB.families.find(x=>x.id===current.id).members,current.members);
  await change(b,'edit',current.id,{text:'SYNTHETIC genuine later B correction'});const successor=await pair(b);assert.equal(successor.prompt.deviceId,b.core.deviceId);assert.equal(successor.companion.value.promptRevisionId,successor.prompt.revisionId);assert.deepEqual(successor.binding.bindings,original.binding.bindings);const cutB=await buildCheckpoint(b.core,cloud,{grouped:{store:b.s}});await b.s.repository.close();assert.equal(b.s.repository.db,null);
  c=await receiver('SYNTHETIC_prompt_fresh_C',cutB);const final=await pair(c),queryC=await c.service.query({includeHidden:true});assert.deepEqual(final.prompt.value,successor.prompt.value);assert.deepEqual(final.companion.value,successor.companion.value);assert.deepEqual(final.physical.pins,original.physical.pins);assert.deepEqual(final.physical.splits,original.physical.splits);assert.equal(final.physical.overrides.find(x=>x.id===current.id).representative,current.members[0]);assert.equal(queryC.items.find(x=>x.id===current.id).text,'SYNTHETIC genuine later B correction');assert.equal(queryC.items.find(x=>x.id===manual.id).text,'SYNTHETIC original independent manual A');assert.deepEqual((await archive(c)).records,source);
  for(const id of family.members)assert.equal((await c.s.input(id)).libraryText,'SYNTHETIC genuine postrestore B Working continuation');const stable=await whole(c);assert.equal((await c.restore.activate()).state,'activated');assert.deepEqual(await whole(c),stable);
 }finally{await a.s.repository.close();if(b)await b.s.repository.close();if(c)await c.s.repository.close();}
});

test('original edit then split then new split correction preserves shared declared anchors and both authored bodies',async()=>{
 const f=await seeded();try{const old=await pair(f),splitInput=f.family.members[0],grant=await permission(f);await change(f,'pin',f.family.id);await change(f,'split',f.family.id,{inputIds:[splitInput]});const splitView=await f.service.snapshot(),splitFamily=splitView.families.find(x=>x.members.length===1&&x.members[0]===splitInput);assert.ok(splitFamily);assert.notEqual(splitFamily.id,f.family.id);
 await change(f,'edit',splitFamily.id,{text:'SYNTHETIC newly authored split correction'});await change(f,'pin',splitFamily.id,{order:[splitFamily.id,f.family.id]});const p=await pair(f),before=await whole(f),snapshot=await f.service.snapshot();
 assert.deepEqual(p.binding.bindings.find(x=>x.familyId===f.family.id),old.binding.bindings[0]);assert.deepEqual(p.binding.bindings.find(x=>x.familyId===splitFamily.id),{familyId:splitFamily.id,kind:'family',inputIds:[splitInput]});assert.equal(p.binding.bindings.reduce((n,x)=>n+x.inputIds.length,0),4);assert.deepEqual(p.physical.pins,[splitFamily.id,f.family.id]);assert.equal(p.physical.splits.length,1);assert.equal(p.physical.splits[0].inputId,splitInput);
 assert.equal(snapshot.bindingsComplete,false);assert.deepEqual(snapshot.unresolved,[{kind:'family',familyId:f.family.id,reason:'diverged_anchors'}]);const retained=snapshot.families.find(x=>x.id===f.family.id),split=snapshot.families.find(x=>x.id===splitFamily.id);assert.equal(retained.text,'SYNTHETIC original human correction 中文🙂');assert.deepEqual(retained.members,[]);assert.equal(split.text,'SYNTHETIC newly authored split correction');assert.deepEqual(split.members,[splitInput]);assert.equal(snapshot.families.filter(x=>x.id===f.family.id).length,1);assert.deepEqual(snapshot.families.filter(x=>x.pinned).map(x=>x.id),[splitFamily.id,f.family.id]);assert.deepEqual(await whole(f),before);assert.deepEqual(await permission(f),grant);
 }finally{await f.s.repository.close();}
});

test('an undeclared shared anchor in a structurally valid companion refuses actual query and write without repository changes',async()=>{
 const f=await fixture({texts:['请解释甲算法并保留反例','请解释甲算法并保留反例','请解释乙算法并保留反例','请解释乙算法并保留反例']});try{const families=(await f.service.snapshot()).families.filter(x=>x.members.length===2);assert.equal(families.length,2);for(const [i,family]of families.entries())await change(f,'edit',family.id,{text:'SYNTHETIC independent authored body '+i});const p=await pair(f);assert.deepEqual(p.physical.splits,[]);const damaged=structuredClone(p.binding),[first,second]=damaged.bindings;second.inputIds=[first.inputIds[0],second.inputIds[0]].sort();assert.equal(new Set(second.inputIds).size,2);
 await f.s.repository.transaction(true,t=>t.put('meta',damaged));const before=await whole(f);await assert.rejects(f.service.snapshot(),{code:'BNS_PROMPT_BINDING_INVALID'});await assert.rejects(change(f,'pin',families[0].id),{code:'BNS_PROMPT_BINDING_INVALID'});assert.deepEqual(await whole(f),before);
 await f.s.repository.transaction(true,t=>t.put('meta',p.binding));assert.equal((await f.service.snapshot()).bindingsComplete,true);assert.deepEqual(await prefs(f),p.physical);assert.deepEqual(await row(f),p.binding);
 }finally{await f.s.repository.close();}
});

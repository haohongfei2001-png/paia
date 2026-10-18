import test from 'node:test';
import assert from 'node:assert/strict';
import {setup} from './harness/thought-m1.mjs';
import {parameters} from './harness/topic-03.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {AIUsageFoundation} from '../core/ai-usage/foundation.js';
import {ContextMaintenanceService} from '../core/context-maintenance.js';
import {LocalMaintenanceSession} from '../core/ai-usage/local-maintenance-session.js';
import {ContextCardsService,CONTEXT_CARDS_ROW} from '../core/context-cards.js';
import {readContextTopicScope} from '../core/context-topic-scope.js';
import {readAuthoredEntryContext,authoredContextEvidence,validAuthoredContextEvidence,validAuthoredFields,authoredSelectedText,authoredSelectedFields} from '../core/context-authored-entry.js';
import {contextEvidenceIdentity,captureContextEvidence,fenceContextLineage,releaseContextLineage,validContextMaintenance} from '../core/context-item-lineage.js';
import {hashText} from '../core/dedupe.js';
const op=()=>crypto.randomUUID(),read=(s,name,id)=>s.repository.transaction(false,t=>id?t.get(name,id):t.all(name));
const options={scope:'synthetic-authored-context',contractVersion:'synthetic-aiu-1',routeVersion:'synthetic-authored-context-1'};
const ownerRows=async s=>Promise.all(['records','blocks','inputStates','thoughts','topics','sections','placements','dependencies','provenance'].map(n=>read(s,n)));
async function fixture(fields={}){
 const f=await setup(OrganizerStore);await f.s.setFilterMode('off');const topic=await f.s.createTopic({name:'Synthetic authored Topic',operationId:op()}),birth=op();
 const entry=await f.s.createEntry({actor:'user',operationId:birth,body:'SYNTHETIC authored private body',...fields,type:'idea',formation:'explicit',evidence:[]});
 await f.s.placeEntry({topicId:topic.id,entryId:entry.id,expectedEntryRevision:entry.revision,expectedTopicRevision:(await f.s.topic(topic.id)).organizationRevision,operationId:op()});
 const input=(await read(f.s,'meta')).find(r=>r.id.startsWith('aiu:delta:pending:')&&r.descriptor.kind==='input');
 const selected={...options,cursor:input.id},calls=[],scopes=[],state={payloadProcessing:true,qualificationAllowed:true,mode:'valid',adapterHook:null,providerHook:null,itemId:op(),associationId:op(),expectedRevision:0},abort=new AbortController(),caller=Object.freeze({id:op()}),expiry=Date.now()+600000;
 const authority=async(_t,r)=>({allowed:true,consentEpoch:'synthetic-consent',principalId:'synthetic-principal',libraryId:'synthetic-library',jobTypes:['AI_MAINTENANCE'],scope:{evidenceKeys:r.evidenceKeys,coverage:r.coverage}});
 const processing={resolve:async(_t,scope)=>{scopes.push(structuredClone(scope));return {version:1,store:f.s,caller,scope:scope.purpose==='ai-maintenance-payload'&&state.scopeHook?state.scopeHook(structuredClone(scope)):scope,epoch:'synthetic-processing',processing:scope.purpose==='ai-maintenance-qualification'?state.qualificationAllowed:state.payloadProcessing,expiresAt:expiry,revocationSignal:abort.signal};},isCurrent:receipt=>(receipt.scope.purpose==='ai-maintenance-qualification'?state.qualificationAllowed:state.payloadProcessing)&&!abort.signal.aborted};
 const verifier={verify:async(_caller,store,scope)=>({version:1,store,scope:state.contextScopeHook?state.contextScopeHook(structuredClone(scope)):scope,accountId:'synthetic-account',processorId:'synthetic-processor',authorizationGeneration:1,processing:state.payloadProcessing,expiresAt:expiry,revocationSignal:abort.signal}),isCurrent:()=>state.payloadProcessing&&!abort.signal.aborted};
 const provider={describe:()=>({providerId:'synthetic-authored',version:'1',executionKind:'fixture'}),execute:async request=>{calls.push(structuredClone(request));await state.providerHook?.(request);if(state.mode==='throw')throw Error('synthetic unknown');return {accepted:true,operationReceiptId:'synthetic-'+request.childOperationId,body:'SYNTHETIC derived Context'};}};
 const service={version:1,topic:{resolveProcessing:async()=>({allowed:false}),decisionVersion:'synthetic-1',parameters},context:{caller,processingVerifier:verifier},responseAdapter:{topic:async()=>{throw Error('Authored Topic must never execute');},context:async(response,metadata,binding)=>{
  await state.adapterHook?.(metadata);const evidence=[];for(const mapping of metadata.authoredEntries){const scope=await readContextTopicScope(f.s,{topicId:mapping.topicId});assert.equal(scope.available,true,JSON.stringify(scope));evidence.push(authoredContextEvidence(mapping,scope.binding,mapping.fieldDigests??mapping.bodyDigest));}
  return {binding,value:[{units:metadata.units,change:{operationId:op(),epoch:evidence[0].expectedTopicBinding.epoch,itemId:state.itemId,card:'info',expectedRevision:state.expectedRevision,body:response.body,section:'Synthetic authored',associationIds:[state.associationId],evidence}}]};
 }}};
 const make=()=>{let grant;const window={acquire:async r=>grant=Object.freeze({version:1,kind:'fixture',dayId:'synthetic-day',windowId:op(),reservationId:op(),tier:'free',requestDigest:r.requestDigest,revocationSignal:abort.signal}),isCurrent:r=>r===grant};return new LocalMaintenanceSession(f.s,{authority,processing,provider,service,window});};
 return {...f,authority,b:(await f.s.snapshot()).library.blocks[0],topic,entry,birth,selected,calls,scopes,state,abort,caller,verifier,make,session:make()};
}
async function mapping(f){return f.s.repository.transaction(false,t=>readAuthoredEntryContext(f.s,t,f.entry.id));}
async function evidence(f){const m=await mapping(f),scope=await readContextTopicScope(f.s,{topicId:f.topic.id});assert.ok(m);assert.equal(scope.available,true);const fields=authoredSelectedText(await read(f.s,'thoughts',f.entry.id),authoredSelectedFields(m)),digests={};for(const [field,text]of Object.entries(fields))digests[field]=await hashText(text);return authoredContextEvidence(m,scope.binding,digests);}
const ack=async f=>(await read(f.s,'organizerWorkItems')).filter(x=>x.state==='ACKNOWLEDGED');

for(const field of ['title','note'])test('authored '+field+' baseline sends exact granted fields and commits exact Context coverage',async()=>{
 const f=await fixture({body:'',[field]:'SYNTHETIC '+field+' only'}),before=await ownerRows(f.s);
 const r=await f.session.run(await f.session.prepare(f.selected));assert.equal(r.processedState,'COMMITTED',JSON.stringify(r));
 const e=f.calls[0].material.authoredEntries[0];assert.deepEqual(e.selectedFields,[field]);assert.deepEqual(e.fields,{[field]:'SYNTHETIC '+field+' only'});assert.deepEqual(Object.keys(e.fieldDigests),[field]);assert.equal(Object.hasOwn(e,'body'),false);assert.deepEqual(f.scopes.find(scope=>scope.purpose==='ai-maintenance-payload').authoredEntries[0].selectedFields,[field]);assert.deepEqual(await ownerRows(f.s),before);
 const a=await ack(f);assert.equal(a.length,1);assert.equal(a[0].unit.key,JSON.stringify(['library_entry',f.entry.id]));const item=(await read(f.s,'meta',CONTEXT_CARDS_ROW)).items[0];assert.deepEqual(item.maintenance.provenance.evidence[0].selectedFields,[field]);
 const basis=await new ContextCardsService(f.s).basis({itemId:item.id,expectedRevision:item.revision,epoch:item.maintenance.provenance.epoch});assert.deepEqual(basis.evidence[0].fields,[{field,excerpt:'SYNTHETIC '+field+' only',truncated:false}]);f.session.dispose();
});
test('coalesced note then body edits cannot acknowledge the note with a body-only payload',async()=>{
 const f=await fixture();for(const changes of [{note:'SYNTHETIC pending note'},{body:'SYNTHETIC latest body'}]){const row=await read(f.s,'thoughts',f.entry.id);await f.s.editEntry({id:row.id,expectedRevision:row.revision,operationId:op(),changes});}
 const r=await f.session.run(await f.session.prepare(f.selected));assert.equal(r.processedState,'COMMITTED',JSON.stringify(r));const e=f.calls[0].material.authoredEntries[0];assert.deepEqual(e.selectedFields,['body','note']);assert.deepEqual(e.fields,{body:'SYNTHETIC latest body',note:'SYNTHETIC pending note'});assert.equal((await ack(f)).length,1);f.session.dispose();
});

async function edit(f,changes){const row=await read(f.s,'thoughts',f.entry.id);return f.s.editEntry({id:row.id,expectedRevision:row.revision,operationId:op(),changes});}
async function restore(f){let row=await read(f.s,'thoughts',f.entry.id);await f.s.removeEntry({id:row.id,expectedRevision:row.revision,operationId:op()});row=await read(f.s,'thoughts',row.id);return f.s.restoreEntry({id:row.id,expectedRevision:row.revision,operationId:op()});}
for(const field of ['title','note'])test('explicit cleared '+field+' remains selected and hashed through whole-Entry ACK',async()=>{
 const f=await fixture({[field]:'SYNTHETIC old '+field});await edit(f,{[field]:''});const r=await f.session.run(await f.session.prepare(f.selected));assert.equal(r.processedState,'COMMITTED',JSON.stringify(r));const e=f.calls[0].material.authoredEntries[0];assert.deepEqual(e.selectedFields,['body',field].sort());assert.equal(e.fields[field],'');assert.equal(e.fieldDigests[field],await hashText(''));assert.equal((await ack(f)).length,1);f.session.dispose();
});
for(const field of ['title','note'])test('coalesced '+field+' ABA and genuine restore keep fresh per-field authority',async()=>{
 const f=await fixture({[field]:'SYNTHETIC original '+field}),old=await evidence(f);await restore(f);for(const value of ['SYNTHETIC intermediate '+field,'SYNTHETIC original '+field])await edit(f,{[field]:value});await restore(f);
 const current=await evidence(f);assert.notEqual(contextEvidenceIdentity({evidence:[old]}),contextEvidenceIdentity({evidence:[current]}));await assert.rejects(captureContextEvidence(f.s,[old],{epoch:old.expectedTopicBinding.epoch}),{code:'CONTEXT_INVALIDATED'});assert.equal(current.fieldRevisions[field],2);assert.equal((await f.session.run(await f.session.prepare(f.selected))).processedState,'COMMITTED');assert.equal((await ack(f)).length,1);f.session.dispose();
});
test('coalesced combined content masks retain exact title body and note authority',async()=>{
 const f=await fixture();for(const suffix of ['one','two'])await edit(f,{title:'SYNTHETIC title '+suffix,body:'SYNTHETIC body '+suffix,note:'SYNTHETIC note '+suffix});await restore(f);const m=await mapping(f);assert.deepEqual(m.selectedFields,['body','note','title']);assert.deepEqual(m.fieldRevisions,{body:2,note:2,title:2});assert.equal((await f.session.run(await f.session.prepare(f.selected))).processedState,'COMMITTED');assert.equal((await ack(f)).length,1);f.session.dispose();
});
for(const field of ['title','note'])for(const defect of ['operation','revision','mask','missing-link'])test('authored '+field+' rejects forged '+defect,async()=>{
 const f=await fixture();await edit(f,{[field]:'SYNTHETIC changed '+field});await edit(f,{body:'SYNTHETIC later body'});
 await f.s.repository.transaction(true,async t=>{const row=await t.get('thoughts',f.entry.id),journal=(await t.all('revisions')).find(j=>j.kind==='library_entry'&&j.reason==='edit'&&j.fieldMask.includes(field));if(defect==='operation'){row.authorship[field].operationId=op();row.protections[field].operationId=row.authorship[field].operationId;await t.put('thoughts',row);}if(defect==='revision'){row.fieldRevisions[field]=0;await t.put('thoughts',row);}if(defect==='mask'){journal.fieldMask=['body'];await t.put('revisions',journal);}if(defect==='missing-link')await t.delete('revisions',journal.id);});
 assert.equal(await mapping(f),null);assert.equal((await f.session.run(await f.session.prepare(f.selected))).state,'DEFERRED');assert.equal(f.calls.length,0);assert.equal((await ack(f)).length,0);f.session.dispose();
});
for(const mutation of ['body-only','extra-field','missing-digest','wrong-operation'])test('authored non-body evidence refuses '+mutation+' without ACK',async()=>{
 const f=await fixture({title:'SYNTHETIC private title',note:'SYNTHETIC private note'});f.state.adapterHook=metadata=>{const m=metadata.authoredEntries[0];if(mutation==='body-only'){m.bodyFieldRevision=m.fieldRevisions.body;m.bodyOperationId=m.fieldOperationIds.body;m.bodyDigest=m.fieldDigests.body;delete m.selectedFields;delete m.fieldRevisions;delete m.fieldOperationIds;delete m.fieldDigests;}if(mutation==='extra-field')m.fieldDigests.type='a'.repeat(64);if(mutation==='missing-digest')delete m.fieldDigests.note;if(mutation==='wrong-operation')m.fieldOperationIds.note=op();};
 const r=await f.session.run(await f.session.prepare(f.selected));assert.notEqual(r.processedState,'COMMITTED');assert.equal(f.calls.length,1);assert.equal((await ack(f)).length,0);assert.equal((await read(f.s,'meta',CONTEXT_CARDS_ROW))?.items.length??0,0);f.session.dispose();
});
for(const boundary of ['payload','context'])test('non-body '+boundary+' grant cannot silently narrow selected fields',async()=>{
 const f=await fixture({note:'SYNTHETIC granted note'}),proto=Object.getPrototypeOf(crypto.subtle),digest=proto.digest;let hashes=0;proto.digest=function(algorithm,data){if(new TextDecoder().decode(data)==='SYNTHETIC granted note')hashes++;return digest.call(this,algorithm,data);};f.state[boundary==='payload'?'scopeHook':'contextScopeHook']=scope=>{scope.authoredEntries[0].selectedFields=['body'];return scope;};
 try{const r=await f.session.run(await f.session.prepare(f.selected));assert.notEqual(r.processedState,'COMMITTED');assert.equal(f.calls.length,boundary==='payload'?0:1);if(boundary==='payload')assert.equal(hashes,0);assert.equal((await ack(f)).length,0);}finally{proto.digest=digest;f.session.dispose();}
});
for(const field of ['title','note'])for(const phase of ['hash','dispatch','commit'])test('late '+field+' drift at '+phase+' preserves final fence and zero ACK',async()=>{
 const f=await fixture({[field]:'SYNTHETIC private '+field}),h=await f.session.prepare(f.selected),proto=Object.getPrototypeOf(crypto.subtle),digest=proto.digest,foundationRead=AIUsageFoundation.prototype.read,original=f.s.repository.transaction.bind(f.s.repository);let hit=false,finalReads=0;
 const change=()=>f.s.repository.transaction(true,async t=>{const row=await t.get('thoughts',f.entry.id);row[field]='SYNTHETIC late drift';await t.put('thoughts',row);});
 if(phase==='hash')proto.digest=async function(algorithm,data){const result=await digest.call(this,algorithm,data);if(!hit&&new TextDecoder().decode(data)==='SYNTHETIC private '+field){hit=true;await change();}return result;};
 if(phase==='dispatch')AIUsageFoundation.prototype.read=async function(fn,...args){if(fn.name==='finalRead'&&++finalReads===2){hit=true;await change();}return foundationRead.call(this,fn,...args);};
 if(phase==='commit')f.s.repository.transaction=(write,fn,...args)=>original(write,async t=>{if(write){const put=t.put.bind(t);t.put=async(name,row,...more)=>{const value=await put(name,row,...more);if(!hit&&name==='meta'&&row.id===CONTEXT_CARDS_ROW){hit=true;const entry=await t.get('thoughts',f.entry.id);entry[field]='SYNTHETIC late drift';await put('thoughts',entry);}return value;};}return fn(t);},...args);
 try{const r=await f.session.run(h);assert.equal(hit,true);assert.notEqual(r.processedState,'COMMITTED');assert.equal(f.calls.length,phase==='commit'?1:0);assert.equal((await ack(f)).length,0);assert.equal((await read(f.s,'meta',CONTEXT_CARDS_ROW))?.items.length??0,0);}finally{proto.digest=digest;AIUsageFoundation.prototype.read=foundationRead;f.s.repository.transaction=original;f.session.dispose();}
});
test('non-body provenance is body-free in receipts and remains subject to original source purge proof',async()=>{
 const f=await fixture({title:'SYNTHETIC private title',note:'SYNTHETIC private note'}),before=await ownerRows(f.s);assert.equal((await f.session.run(await f.session.prepare(f.selected))).processedState,'COMMITTED');assert.doesNotMatch(JSON.stringify(await Promise.all(['organizerJobs','organizerUsage','organizerWorkItems'].map(n=>read(f.s,n)))),/SYNTHETIC private (title|note)|SYNTHETIC authored private body/);const item=(await read(f.s,'meta',CONTEXT_CARDS_ROW)).items[0];assert.equal(validContextMaintenance(item.maintenance),true);assert.equal((await new ContextCardsService(f.s).snapshot()).items.length,1);assert.deepEqual(await ownerRows(f.s),before);
 const source=(await read(f.s,'records'))[0].id;assert.equal((await f.s.sourcePurgePreflight(source)).state,'unambiguous');await f.s.permanentDelete(source);assert.equal((await new ContextCardsService(f.s).snapshot()).items.length,1);f.session.dispose();
});

test('authored selection rejects duplicate unknown sparse and decorated fields',()=>{
 for(const selected of [['body','body'],['type'],['note','body'],Object.assign(['body'],{extra:true}),Object.assign(['body',,],{extra:true})])assert.equal(validAuthoredFields(selected),false);
});

test('old body-only processing evidence cannot hash a newly added ungranted note',async()=>{
 const f=await fixture(),old=await evidence(f);await edit(f,{note:'SYNTHETIC ungranted new note'});const scope=await readContextTopicScope(f.s,{topicId:f.topic.id});old.expectedTopicBinding=scope.binding;
 const proto=Object.getPrototypeOf(crypto.subtle),digest=proto.digest;let noteHashes=0;proto.digest=function(algorithm,data){if(new TextDecoder().decode(data)==='SYNTHETIC ungranted new note')noteHashes++;return digest.call(this,algorithm,data);};
 const seen=[],verifier={...f.verifier,verify:async(caller,store,scope)=>{seen.push(structuredClone(scope));assert.deepEqual(scope.authoredEntries[0].selectedFields,['body']);return f.verifier.verify(caller,store,scope);}};
 try{await assert.rejects(new ContextMaintenanceService(f.s,{processingVerifier:verifier}).maintain(f.caller,{operationId:op(),epoch:scope.binding.epoch,itemId:op(),card:'info',expectedRevision:0,body:'SYNTHETIC must not commit',section:'Synthetic',associationIds:[op()],evidence:[old]}),{code:'CONTEXT_INVALIDATED'});assert.ok(seen.length>0);assert.equal(noteHashes,0);assert.equal((await read(f.s,'meta',CONTEXT_CARDS_ROW))?.items.length??0,0);assert.equal((await ack(f)).length,0);}finally{proto.digest=digest;f.session.dispose();}
});

test('stale authored Item does not hide a separately authorized current Item for the same Entry',async()=>{
 const f=await fixture(),owner=new ContextMaintenanceService(f.s,{processingVerifier:f.verifier}),oldId=op(),currentId=op();
 const add=async(itemId,body)=>{const e=await evidence(f);return owner.maintain(f.caller,{operationId:op(),epoch:e.expectedTopicBinding.epoch,itemId,card:'info',expectedRevision:0,body,section:'Synthetic',associationIds:[op()],evidence:[e]});};
 assert.equal((await add(oldId,'SYNTHETIC historical body-only Context')).disposition,'created');await edit(f,{note:'SYNTHETIC current authorized note'});assert.equal((await add(currentId,'SYNTHETIC current body-note Context')).disposition,'created');
 const persisted=await read(f.s,'meta',CONTEXT_CARDS_ROW);assert.equal(persisted.items.length,2);assert.deepEqual((await new ContextCardsService(f.s).snapshot()).items.map(i=>i.id),[currentId]);assert.deepEqual(await read(f.s,'meta',CONTEXT_CARDS_ROW),persisted);f.session.dispose();
});

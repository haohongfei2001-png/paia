import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFixture,rpc} from '../../../../../../services/ai-gateway/tests/organize-native-fixture.mjs';
// Explicit qualification only. The default Browser root acquires no service/pg
// dependency. Fresh Current is created by the original worker, then each legacy
// operation is performed by the original LocalOrganizeSession without a source.
for(const variant of ['source','release'])for(const mode of ['style-ACK','legacy-dispose','delta-cache'])test(`${variant} original legacy owner ${mode} after genuine unprotected Current`,{timeout:60000},async t=>{
 const f=await nativeFixture(t,{variant,count:2});
 await f.worker.evaluate(async()=>{const s=__organizeNative.store,p=await s.aiStylePreference();await s.updatePreferences({aiOrganizeStyle:{version:1,value:'original',expectedRevision:p.revision,expectedEpoch:p.epoch}});});
 assert.equal((await f.run()).currentPublished,true);const baseline=await f.snapshot();assert.ok(Object.values(baseline.candidate.protections).every(v=>v===false));assert.equal(f.backend.physical(),1);
 if(mode==='delta-cache')await rpc(f.p,'CONTINUE_THINKING',{thought:{topicId:f.topic.id,body:'SYNTHETIC legacy delta',operationId:crypto.randomUUID()}});
 const result=await f.worker.evaluate(async({topicId,profile,routeVersion,mode})=>{
  const {LocalOrganizeSession}=await import(chrome.runtime.getURL('core/organizer/local-organize-session.js')),{aiCandidateKey}=await import(chrome.runtime.getURL('core/organizer/ai-candidate.js'));
  const s=__organizeNative.store,options={incrementalVersion:3,profile,routeVersion,resolveAuthority:async(_t,r)=>({allowed:true,principalId:'SYNTHETIC-principal',libraryId:'SYNTHETIC-library',consentEpoch:'SYNTHETIC-consent',jobTypes:['AI_ORGANIZE'],scope:{evidenceKeys:r.evidenceKeys,coverage:r.coverage}})},sizes=[],read=()=>s.run(()=>s.repository.transaction(false,t=>t.get('meta','aiPresentation:'+topicId))),all=()=>s.run(()=>s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all(s.repository.stores.map(async k=>[k,await t.all(k)])))));
  const setStyle=async value=>{const p=await s.aiStylePreference();await s.updatePreferences({aiOrganizeStyle:{version:1,value,expectedRevision:p.revision,expectedEpoch:p.epoch}});};
  const provider={describe:()=>({providerId:'synthetic',version:'1',executionKind:'fixture'}),execute:async r=>{sizes.push(r.inputs.length);return {version:2,blocks:r.inputs.map(i=>({field:'currentView',text:i.text,evidenceEntryIds:[i.ref],sourceSpans:[{entryId:i.ref,revision:i.revision,start:0,end:i.text.length}]}))};}};
  const before=await read();if(mode!=='delta-cache')await setStyle('concise');
  const session=new LocalOrganizeSession(s,options),h=await session.prepare({topicId,refreshStyle:mode!=='delta-cache'}),trace=globalThis.__legacyOracleTrace={mode,handleState:h.state,jobIdPresent:!!h.jobId,protectedBefore:Object.values(before.protections).some(Boolean),sizes};
  const put=IDBObjectStore.prototype.put;let hits=0,code=null;
  try{
   if(mode!=='delta-cache'){
    IDBObjectStore.prototype.put=function(row,...args){if(!hits&&this.name==='organizerWorkItems'&&row.state==='ACKNOWLEDGED'){hits++;if(mode==='style-ACK')throw new DOMException('Synthetic v3 ACK abort','UnknownError');session.dispose();}return Reflect.apply(put,this,[row,...args]);};
    try{await session.run(h,provider);}catch(e){code=e.code;}finally{IDBObjectStore.prototype.put=put;}
    trace.code=code;trace.hits=hits;trace.rollback=JSON.stringify(await read())===JSON.stringify(before);
    if(mode==='legacy-dispose')return {...trace,nativeFactory:indexedDB instanceof IDBFactory,disposed:true};
   }
   const committed=await session.run(h,provider),candidate=(await s.aiPresentationStatus({topicId})).topics[0].candidate,proposal=await read();
   const identical=candidate.proposal.currentView===before.projection.currentView,changed=candidate.changedFields.length;
   const adoption={topicId,expectedRevision:candidate.expectedRevision,expectedCandidateKey:aiCandidateKey(candidate),candidateDecisions:Object.fromEntries(candidate.changedFields.map(k=>[k,'adopt'])),operationId:crypto.randomUUID()};await s.editAIPresentation(adoption);await s.editAIPresentation(adoption);session.dispose();const row=await read(),ledger=await all();
   const gens=Object.values(row.manifest.generations),allCommitted=gens.every(g=>g.kind==='local-committed-v1'&&ledger.organizerJobs.find(j=>j.id===g.jobId)?.state==='COMMITTED'&&g.children.every(c=>{const r=ledger.organizerUsage.find(r=>r.id==='aiu:attempt:'+c.childId);return r?.state==='COMMITTED'&&r.operationReceiptId===c.operationReceiptId;}));
   let noDelta=null,cacheExact=null,cacheRowsUnchanged=null;
   if(mode==='delta-cache'){await setStyle('concise');await setStyle('original');const beforeCache=JSON.stringify(await all()),reopened=new LocalOrganizeSession(s,options);try{noDelta=(await reopened.prepare({topicId})).state;}finally{reopened.dispose();}cacheRowsUnchanged=beforeCache===JSON.stringify(await all());cacheExact=(await s.aiPresentationStatus({topicId})).topics[0].cacheQualification.reusable;}
   return {...trace,nativeFactory:indexedDB instanceof IDBFactory,state:committed.state,identical,changed,sameBlocks:JSON.stringify(row.manifest.blocks.slice(0,2))===JSON.stringify(before.manifest.blocks),refs:row.evidenceEntryIds.length,generations:gens.length,allCommitted,noDelta,cacheExact,cacheRowsUnchanged,style:row.manifest.fields.currentView.style,proposalVersion:proposal.candidate.schemaVersion};
  }finally{IDBObjectStore.prototype.put=put;session.dispose();}
 },{topicId:f.topic.id,profile:f.backend.configuration.profile,routeVersion:f.backend.configuration.routeVersion,mode});
 t.diagnostic(JSON.stringify({variant,...result}));
 assert.equal(result.nativeFactory,true);assert.equal(result.jobIdPresent,true);assert.equal(result.protectedBefore,false);assert.equal(f.backend.physical(),1);f.quiet();
 if(mode==='style-ACK'){assert.equal(result.code,'STORAGE_FAILED');assert.equal(result.hits,1);assert.equal(result.rollback,true);assert.equal(result.identical,true);assert.equal(result.changed,8);assert.equal(result.state,'COMMITTED');assert.deepEqual(result.sizes,[2]);assert.equal(result.style,'concise');assert.equal(result.allCommitted,true);}
 else if(mode==='legacy-dispose'){assert.equal(result.disposed,true);assert.equal(result.code,'STALE_BASE');assert.equal(result.hits,1);assert.equal(result.rollback,true);assert.deepEqual(result.sizes,[2]);}
 else{assert.equal(result.state,'COMMITTED');assert.equal(result.sameBlocks,true);assert.equal(result.refs,3);assert.equal(result.generations,2);assert.equal(result.allCommitted,true);assert.deepEqual(result.sizes,[1]);assert.equal(result.noDelta,'NO_DELTA');assert.equal(result.cacheExact,false);assert.equal(result.cacheRowsUnchanged,true);}
});

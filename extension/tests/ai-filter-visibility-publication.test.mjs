import test from 'node:test';
import FakeEvent from './vendor/fake-indexeddb/build/esm/lib/FakeEvent.js';
import assert from 'node:assert/strict';
import * as FilterOwner from '../core/ai-usage/ai-filter-owner.js';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {OrganizerStore} from '../core/organizer/store.js';
globalThis.IDBKeyRange=IDBKeyRange;
const presence={version:1,attachment:'absent',reference:'absent',confidence:'verified'};
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const read=(f,name,id)=>f.s.repository.transaction(false,t=>t.get(name,id));
const snapshot=f=>f.s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all(f.s.repository.stores.map(async n=>[n,await t.all(n)]))));
async function fixture({multiple=false,maximum=false}={}){
 const values={},storage={get:async k=>({[k]:structuredClone(values[k])}),set:async v=>Object.assign(values,structuredClone(v))};
 let write=true,visibility=true,now=Date.parse('2026-10-18T00:00:00Z'),generation=1,publication=null,publicationGeneration=null,writeResolutions=0,visibilityResolutions=0;const grants=new WeakMap();
 const issue=(r,mode)=>{const grant={allowed:true,tier:'pro',optIn:true,processingConsent:true,inputIds:[...r.candidateIds,...r.neighborIds],epochs:{entitlement:'synthetic-entitlement',optIn:'synthetic-opt-in',processing:'synthetic-processing',userRead:'synthetic-read'},policy:{version:'pro-ambiguous-1',qualificationId:'SYNTHETIC_MECHANISM_ONLY'}};grants.set(grant,{mode,generation});return grant;};
 const authority={resolve:async(_t,r)=>{writeResolutions++;return write?issue(r,'write'):null;},resolveVisibility:async(_t,r)=>{
  visibilityResolutions++;if(!visibility||!publication||publicationGeneration!==generation||r.purpose!=='ai-maintenance-filter-visibility'||r.operationId!==publication.operationId||!equal(r.candidateIds,publication.scope.candidateIds)||!equal(r.neighborIds,publication.scope.neighborIds))return null;
  const item=publication.filtered.find(x=>x.inputId===r.inputId),expected=item&&{version:1,policy:publication.policy,authority:publication.epochs,scope:publication.scope,proof:publication.proof,sequence:item.sequence};
  return expected&&equal(expected,r.decision)?issue(r,'visibility'):null;
 },isCurrent:grant=>{const saved=grants.get(grant);return !!saved&&saved.generation===generation&&(saved.mode==='write'?write:visibility)&&now<Date.parse('2026-10-18T00:01:00Z');}};
 const s=new OrganizerStore(storage,{indexedDB:new IDBFactory(),clock:()=>new Date(now).toISOString(),aiFilterAuthority:authority});await s.consent(true);
 await s.capture({epoch:(await s.status()).epoch,adapterVersion:'0.3.0',chat:{id:'synthetic-read-only-filter',url:'https://chatgpt.com/c/synthetic-read-only-filter',title:'Synthetic'},messages:maximum?['candidate','candidate-two','neighbor','candidate-3','candidate-4','candidate-5','candidate-6','neighbor-two','candidate-7','candidate-8'].map((sourceMessageId,i)=>({sourceMessageId,pageOrder:i+1,originalText:sourceMessageId.startsWith('neighbor')?'Invented paper boat has a wide folded base':'然后',presence})):[{sourceMessageId:'neighbor',pageOrder:1,originalText:'Invented paper boat has a wide folded base',presence},{sourceMessageId:'candidate',pageOrder:2,originalText:'然后',presence},...(multiple?[{sourceMessageId:'neighbor-two',pageOrder:3,originalText:'Invented second paper boat has a triangular folded sail',presence},{sourceMessageId:'candidate-two',pageOrder:4,originalText:'后来',presence}]:[])]});await s.finishFoundation();await s.evaluateFilters();
 const state=await s.snapshot(),find=key=>state.library.blocks.find(b=>state.records.find(r=>r.id===b.originalTextReference)?.sourceMessageId===key),candidate=find('candidate'),neighbor=find('neighbor'),scope={candidateIds:[candidate.id],neighborIds:[neighbor.id]};
 const f={s,candidate,neighbor,scope,maximumScope:maximum?{candidateIds:['candidate','candidate-two','candidate-3','candidate-4','candidate-5','candidate-6','candidate-7','candidate-8'].map(x=>find(x).id).sort(),neighborIds:['neighbor','neighbor-two'].map(x=>find(x).id).sort()}:null,otherCandidate:find('candidate-two'),otherNeighbor:find('neighbor-two'),prepare:()=>s.run(()=>s.repository.transaction(false,t=>s.prepareAIMaintenanceFilter(t,scope))),commit:(h,decision='FILTER')=>s.write(t=>s.commitAIMaintenanceFilter(t,h,[{inputId:candidate.id,decision}])),setWrite:x=>{write=x;},setVisibility:x=>{visibility=x;},setNow:x=>{now=x;},revoke:()=>{generation++;visibility=false;},counts:()=>({writeResolutions,visibilityResolutions}),retain:data=>{publication=structuredClone(data);publicationGeneration=generation;}};
 // Independent test-only read lease derived from the actual committed row,
 // solely to isolate the original hidden() resolver defect before the new
 // private publication seam exists. Production never uses this test helper.
 f.legacyVisibility=async()=>{const row=await read(f,'filterInputs',candidate.id),d=row.aiDecision;f.retain({operationId:row.aiOperationId,scope:d.scope,epochs:d.authority,policy:d.policy,proof:d.proof,filtered:[{inputId:candidate.id,sequence:d.sequence}]});};
 return f;
}
const visible=async f=>(await f.s.page({documentId:f.candidate.documentId})).pageItemIds.includes(f.candidate.id);

test('completed original Filter remains visible only through the independent read-only resolver after write authority release',async()=>{
 const f=await fixture();try{const handle=await f.prepare();await f.commit(handle);await f.legacyVisibility();f.s.releaseAIMaintenanceFilter(handle);f.setWrite(false);const before=await snapshot(f),counts=f.counts();
  assert.equal(await visible(f),false,'committed FILTER visibility must use the read-only lease after write authority is released');assert.equal(f.counts().writeResolutions,counts.writeResolutions,'hidden() cannot resolve new write authority');assert.equal(f.counts().visibilityResolutions,counts.visibilityResolutions+1);assert.deepEqual(await snapshot(f),before);await assert.rejects(f.prepare());
 }finally{await f.s.repository.close();}
});
test('control: retaining a legacy write grant to preserve visibility also permits another original prepare',async()=>{
 const f=await fixture();try{const handle=await f.prepare();await f.commit(handle);f.s.releaseAIMaintenanceFilter(handle);const second=await f.prepare();assert.ok(second);f.s.releaseAIMaintenanceFilter(second);}finally{await f.s.repository.close();}
});

const publication=(f,token)=>FilterOwner.readAIMaintenanceFilterVisibility(token,f.s);
test('private publication binds the actual writer, operation, complete decision proof and transaction completion',async()=>{
 const f=await fixture(),other=await fixture();try{
  const handle=await f.prepare(),beforeSequence=(await read(f,'meta','smart-filter')).decisionSequence;let issued;
  const result=await f.s.write(async t=>{issued=await f.s.commitAIMaintenanceFilter(t,handle,[{inputId:f.candidate.id,decision:'FILTER'}]);assert.equal(publication(f,issued.visibilityPublication),null);return issued;});
  const data=publication(f,result.visibilityPublication);assert.ok(data);assert.equal(data.operationId,(await read(f,'filterInputs',f.candidate.id)).aiOperationId);assert.deepEqual(data.scope,f.scope);assert.deepEqual(data.decisions,[{inputId:f.candidate.id,decision:'FILTER'}]);assert.deepEqual(data.filtered,[{inputId:f.candidate.id,sequence:beforeSequence+1}]);
  assert.equal(publication(f,Object.freeze({})),null);assert.equal(publication(f,structuredClone(result.visibilityPublication)),null);assert.equal(publication(other,result.visibilityPublication),null);
  data.proof.snapshot.items.length=0;assert.equal(publication(f,result.visibilityPublication).proof.snapshot.items.length,1);
  f.retain(publication(f,result.visibilityPublication));f.s.releaseAIMaintenanceFilter(handle);f.setWrite(false);assert.equal(await visible(f),false);await assert.rejects(f.prepare());
 }finally{await f.s.repository.close();await other.s.repository.close();}
});
test('aborted original write never exposes a visibility publication and same command can retry once',async()=>{
 const f=await fixture();try{const handle=await f.prepare(),before=await snapshot(f);let token;
  await assert.rejects(f.s.write(async t=>{const r=await f.s.commitAIMaintenanceFilter(t,handle,[{inputId:f.candidate.id,decision:'FILTER'}]);token=r.visibilityPublication;throw Error('SYNTHETIC storage rollback');}));assert.ok(token);assert.equal(publication(f,token),null);assert.deepEqual(await snapshot(f),before);
  const result=await f.commit(handle);assert.ok(publication(f,result.visibilityPublication));assert.equal(publication(f,token),null);f.retain(publication(f,result.visibilityPublication));f.setWrite(false);assert.equal(await visible(f),false);
 }finally{await f.s.repository.close();}
});
for(const mutation of ['operation','decision','proof','scope'])test('read-only publication cannot resurrect modified '+mutation,async()=>{
 const f=await fixture();try{const h=await f.prepare(),r=await f.commit(h);f.retain(publication(f,r.visibilityPublication));f.setWrite(false);assert.equal(await visible(f),false);
  await f.s.write(async t=>{const row=await t.get('filterInputs',f.candidate.id);if(mutation==='operation')row.aiOperationId='synthetic-other-operation';else if(mutation==='decision')row.aiDecision.sequence++;else if(mutation==='proof')row.aiDecision.proof.restore='synthetic-other-restore';else row.aiDecision.scope.neighborIds=[f.candidate.id];await t.put('filterInputs',row);});const before=await snapshot(f);assert.equal(await visible(f),true);assert.deepEqual(await snapshot(f),before);
 }finally{await f.s.repository.close();}
});
for(const stop of ['revoke-reconnect','expiry','pause'])test('read-only visibility becomes visible on '+stop+' without minting a replacement write grant',async()=>{
 const f=await fixture();try{const h=await f.prepare(),r=await f.commit(h);f.retain(publication(f,r.visibilityPublication));f.s.releaseAIMaintenanceFilter(h);f.setWrite(false);assert.equal(await visible(f),false);const count=f.counts().writeResolutions;
  if(stop==='expiry')f.setNow(Date.parse('2026-10-18T00:01:00Z'));else if(stop==='pause')f.setVisibility(false);else{f.revoke();f.setVisibility(true);}
  assert.equal(await visible(f),true);assert.equal(f.counts().writeResolutions,count);await assert.rejects(f.prepare());
 }finally{await f.s.repository.close();}
});
for(const decision of ['KEEP','INSUFFICIENT'])test('original '+decision+' publication contains no hideable decision',async()=>{
 const f=await fixture();try{const h=await f.prepare(),r=await f.commit(h,decision),data=publication(f,r.visibilityPublication);assert.deepEqual(data.filtered,[]);assert.deepEqual(data.decisions,[{inputId:f.candidate.id,decision}]);f.retain(data);f.setWrite(false);assert.equal(await visible(f),true);}finally{await f.s.repository.close();}
});

for(const drift of ['source','working','keep','decision','neighbor-source'])test('direct original Filter pre-put expected facts reject final '+drift+' drift',async()=>{
 const f=await fixture();try{const h=await f.prepare(),before=await snapshot(f);let reached=false;
  await assert.rejects(f.s.write(async t=>{const put=t.put.bind(t);t.put=async(name,row,...rest)=>{const value=await put(name,row,...rest);if(!reached&&name==='meta'&&row.id==='smart-filter'){reached=true;
   if(drift==='working'){const changed=await t.get('blocks',f.candidate.id);changed.value.libraryText='SYNTHETIC final Working drift';await put('blocks',changed);}
   else if(drift==='keep'||drift==='decision'){const changed=await t.get('filterInputs',f.candidate.id);if(drift==='keep')changed.filterOverride='keep';else changed.aiDecision.sequence++;await put('filterInputs',changed);}
   else {const input=drift==='source'?f.candidate:f.neighbor,changed=await t.get('records',input.originalTextReference);changed.value.originalText='SYNTHETIC final Source drift';await put('records',changed);}
  }return value;};return f.s.commitAIMaintenanceFilter(t,h,[{inputId:f.candidate.id,decision:'FILTER'}]);}));assert.equal(reached,true);assert.deepEqual(await snapshot(f),before);
 }finally{await f.s.repository.close();}
});

test('synthetic complete event before original callback unwind cannot expose a token even before subsequent abort',async()=>{
 const f=await fixture();try{const h=await f.prepare(),before=await snapshot(f);let token;
  await assert.rejects(f.s.write(async t=>{const r=await f.s.commitAIMaintenanceFilter(t,h,[{inputId:f.candidate.id,decision:'FILTER'}]);token=r.visibilityPublication;t.tx.dispatchEvent(new FakeEvent('complete'));assert.equal(publication(f,token),null,'an event is not the original successful transaction unwind');throw Error('SYNTHETIC abort after event');}),error=>error.code==='STORAGE_FAILED');assert.ok(token);assert.equal(publication(f,token),null);assert.deepEqual(await snapshot(f),before);
 }finally{await f.s.repository.close();}
});
test('independent prepared Filter scopes compose across the original sequence allocator',async()=>{
 const f=await fixture({multiple:true});try{const first=await f.prepare(),scope={candidateIds:[f.otherCandidate.id],neighborIds:[f.otherNeighbor.id]},second=await f.s.run(()=>f.s.repository.transaction(false,t=>f.s.prepareAIMaintenanceFilter(t,scope)));
  const one=await f.commit(first),two=await f.s.write(t=>f.s.commitAIMaintenanceFilter(t,second,[{inputId:f.otherCandidate.id,decision:'FILTER'}]));assert.equal(one.ok,true);assert.equal(two.ok,true);assert.equal(publication(f,two.visibilityPublication).filtered[0].sequence,publication(f,one.visibilityPublication).filtered[0].sequence+1);
 }finally{await f.s.repository.close();}
});
test('bounded private facts refuse a short current Input backed by an oversized Original Source',async()=>{
 const f=await fixture();try{await f.s.write(async t=>{const b=await t.get('blocks',f.neighbor.id),r=await t.get('records',f.neighbor.originalTextReference);b.value.libraryText='Invented short current neighbor';r.value.originalText='SYNTHETIC_ORIGINAL_SOURCE '.repeat(4096);await t.put('blocks',b);await t.put('records',r);});const before=await snapshot(f);await assert.rejects(f.prepare(),{code:'BUDGET_EXCEEDED'});assert.deepEqual(await snapshot(f),before);assert.equal((await read(f,'filterInputs',f.candidate.id)).aiDecision,undefined);
 }finally{await f.s.repository.close();}
});

test('original eight-candidate two-neighbor maximum remains valid through exact commit and idempotent replay',async()=>{
 const f=await fixture({maximum:true});try{const scope=f.maximumScope,handle=await f.s.run(()=>f.s.repository.transaction(false,t=>f.s.prepareAIMaintenanceFilter(t,scope))),decisions=scope.candidateIds.map(inputId=>({inputId,decision:'FILTER'}));
  const result=await f.s.write(t=>f.s.commitAIMaintenanceFilter(t,handle,decisions));assert.equal(result.filtered,8);const before=await snapshot(f),again=await f.s.write(t=>f.s.commitAIMaintenanceFilter(t,handle,decisions));assert.equal(again.filtered,8);assert.deepEqual(publication(f,result.visibilityPublication),publication(f,again.visibilityPublication));assert.deepEqual(await snapshot(f),before);
 }finally{await f.s.repository.close();}
});
for(const extra of [0,1])test('private Source fact UTF8 row ceiling '+(extra?'rejects exact one-byte overrun':'accepts exact bound'),async()=>{
 const f=await fixture();try{await f.s.write(async t=>{const b=await t.get('blocks',f.neighbor.id),r=await t.get('records',f.neighbor.originalTextReference);b.value.libraryText='Invented short current neighbor';r.value.originalText='';const base=new TextEncoder().encode(JSON.stringify({store:'records',key:r.id,value:{id:r.id,value:{originalText:r.value.originalText}}})).length;r.value.originalText='x'.repeat(FilterOwner.AI_FILTER_FACT_LIMITS.rowBytes-base+extra);assert.equal(new TextEncoder().encode(JSON.stringify({store:'records',key:r.id,value:{id:r.id,value:{originalText:r.value.originalText}}})).length,FilterOwner.AI_FILTER_FACT_LIMITS.rowBytes+extra);await t.put('blocks',b);await t.put('records',r);});
  if(extra)await assert.rejects(f.prepare(),{code:'BUDGET_EXCEEDED'});else{const handle=await f.prepare(),r=await f.commit(handle);assert.ok(publication(f,r.visibilityPublication));}
 }finally{await f.s.repository.close();}
});

test('private facts cumulative byte ceiling is shared by the whole maximum scope',async()=>{
 const f=await fixture({maximum:true});try{await f.s.write(async t=>{for(const id of f.maximumScope.candidateIds){const r=await t.get('inputStates',id);r.syntheticMetadataPadding='x'.repeat(60000);assert.ok(new TextEncoder().encode(JSON.stringify({store:'inputStates',key:id,value:r})).length<FilterOwner.AI_FILTER_FACT_LIMITS.rowBytes);await t.put('inputStates',r);}for(const id of f.maximumScope.neighborIds){const b=await t.get('blocks',id),r=await t.get('records',b.value.originalTextReference);b.value.libraryText='Invented short current neighbor';r.value.originalText='x'.repeat(60000);assert.ok(new TextEncoder().encode(JSON.stringify({store:'records',key:r.id,value:{id:r.id,value:{originalText:r.value.originalText}}})).length<FilterOwner.AI_FILTER_FACT_LIMITS.rowBytes);await t.put('blocks',b);await t.put('records',r);}});const before=await snapshot(f);await assert.rejects(f.s.run(()=>f.s.repository.transaction(false,t=>f.s.prepareAIMaintenanceFilter(t,f.maximumScope))),{code:'BUDGET_EXCEEDED'});assert.deepEqual(await snapshot(f),before);
 }finally{await f.s.repository.close();}
});

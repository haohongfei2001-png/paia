import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {OrganizerStore} from '../core/organizer/store.js';
import {AmbiguousFilterPreflight} from '../core/ai-usage/ambiguous-filter-preflight.js';
import {decideLight} from '../core/smart-filter.js';
globalThis.IDBKeyRange=IDBKeyRange;
const presence={version:1,attachment:'absent',reference:'absent',confidence:'verified'};
const syntheticOrder=new WeakMap();
const local=()=>{const data={};return {async get(k){return {[k]:structuredClone(data[k])};},async set(v){Object.assign(data,structuredClone(v));},dump(){return structuredClone(data);}};};
async function add(s,text='然后',key='candidate',extra={},chat='preflight-synthetic-chat'){
 const order=(syntheticOrder.get(s)??0)+1;syntheticOrder.set(s,order);
 // Actual Source-time owner supplies deterministic order; unknown-time UUID
 // tie ordering cannot prove a chosen fixture is a distant neighbor.
 await s.capture({epoch:(await s.status()).epoch,adapterVersion:'0.3.0',chat:{id:chat,url:'https://chatgpt.com/c/'+chat,title:'Invented preflight conversation'},messages:[{sourceMessageId:key,pageOrder:order,originalText:text,presence,sourceTime:{state:'valid',createTime:1791475200+order,updateTime:null},...extra}]});
 const snapshot=await s.snapshot();return snapshot.library.blocks.find(b=>snapshot.records.find(r=>r.id===b.originalTextReference)?.sourceMessageId===key);
}
async function fixture(candidate='然后',extra={}){
 const storage=local(),s=new OrganizerStore(storage,{indexedDB:new IDBFactory()});await s.consent(true);
 const neighbor=await add(s,'Invented paper boat has a wide folded base','neighbor'),target=await add(s,candidate,'candidate',extra);
 await s.finishFoundation();await s.evaluateFilters();
 let now=1000,patch={},calls=0,hook=null;
 const resolve=async(_t,r)=>{calls++;const value={allowed:true,tier:'pro',optIn:true,processingConsent:true,userInputIds:[...r.candidateIds,...r.neighborIds],scope:{candidateIds:r.candidateIds,neighborIds:r.neighborIds},epochs:{entitlement:'pro-fixture-v1',optIn:'opt-v1',processing:'consent-v1',userRead:'canonical-user-fixture-v1'},...patch};if(hook)await hook();return value;};
 const reader=new AmbiguousFilterPreflight(s,{resolvePermission:resolve,clock:()=>now});
 const request=async(c=target,n=neighbor)=>s.repository.transaction(false,async t=>({candidates:[{inputId:c.id,expectedContentRevision:(await t.get('inputStates',c.id)).contentRevision,expectedEvaluationRevision:(await t.get('filterInputs',c.id)).evaluationRevision,neighbors:n?[{inputId:n.id,expectedContentRevision:(await t.get('inputStates',n.id)).contentRevision}]:[]}]}));
 return {s,storage,target,neighbor,reader,request,setPatch:p=>patch=p,setNow:n=>now=n,setHook:h=>hook=h,calls:()=>calls};
}
async function dump(f){return {stores:await f.s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all(f.s.repository.stores.map(async n=>[n,await t.all(n)])))),local:f.storage.dump(),filterMutation:f.s.filterMutation,writes:f.s.repository.metrics.writes};}
async function noWrite(f,fn){
 const before=await dump(f),original=f.s.repository.transaction,modes=[];
 f.s.repository.transaction=function(write,...args){modes.push(write);return original.call(this,write,...args);};
 try{const result=await fn();assert.deepEqual(await dump(f),before,'every actual IDB store, local control, write counter and filterMutation unchanged');assert.ok(modes.every(write=>write===false),'no readwrite transaction, even rolled back, is attempted');return result;}finally{f.s.repository.transaction=original;}
}
const bodyFree=r=>{assert.equal(r.financialAuthority,false);assert.equal(r.dispatchAllowed,false);assert.ok(!JSON.stringify(r).includes('paper boat'));assert.ok(!JSON.stringify(r).includes('然后'));assert.ok(Object.isFrozen(r));assert.ok(Object.isFrozen(r.candidates));};
async function mutateRow(f,store,id,fn){await f.s.repository.transaction(true,async t=>{const row=await t.get(store,id);fn(row);await t.put(store,row);});}

test('actual Organizer/Light/Source owners create opaque body-free private capability without any writes',async()=>{
 const f=await fixture(),request=await f.request(),r=await noWrite(f,()=>f.reader.prepare(request));
 assert.equal(r.status,'CANDIDATE_ONLY');assert.equal(r.candidates[0].eligibility,'PRIVATE_CANDIDATE');bodyFree(r);
 assert.equal(Object.getPrototypeOf(r.capability),null);assert.deepEqual(Reflect.ownKeys(r.capability),[]);assert.ok(Object.isFrozen(r.capability));
 const again=await noWrite(f,()=>f.reader.revalidate(r.capability));assert.equal(again.status,'CURRENT');assert.equal(again.capability,r.capability);bodyFree(again);
 assert.equal((await f.s.filterDiagnostics()).uncertain,2);assert.equal((await f.s.page({documentId:f.target.documentId})).pageItemIds.length,2);
 const other=new AmbiguousFilterPreflight(f.s,{resolvePermission:()=>{},clock:()=>1000});assert.equal((await other.revalidate(r.capability)).status,'STALE');f.reader.dispose();assert.equal((await f.reader.revalidate(r.capability)).status,'UNAVAILABLE');
});
test('all original Light resolved/protected grammar stays local, no hidden or AI decision is written',async()=>{
 for(const text of ['继续','好的','继续，但不要修改原始数据','继续？','继续✅','然后 https://example.invalid']){
  const f=await fixture(text),request=await f.request(),r=await noWrite(f,()=>f.reader.prepare(request));assert.equal(r.status,'NO_CAPABILITY',text);assert.equal(r.candidates[0].reason,'LIGHT_RESOLVED',text);assert.equal(r.candidates[0].lightDecision,decideLight({text,authorship:'untouched',userEdited:false,filterOverride:'none',presence}).decision);bodyFree(r);
 }
});
test('candidate missing/unknown/present/invalid attachment or reference evidence refuses, including neighbor evidence',async()=>{
 for(const [name,p]of [['missing',undefined],['attachment',{...presence,attachment:'present'}],['reference',{...presence,reference:'present'}],['unknown',{...presence,confidence:'unknown'}],['invalid',{...presence,filename:'private'}]]){
  const f=await fixture('然后',{presence:p}),r=await noWrite(f,async()=>f.reader.prepare(await f.request()));assert.equal(r.status,'NO_CAPABILITY',name);assert.equal(r.candidates[0].reason,'INPUT_UNAVAILABLE');
 }
 const f=await fixture();await mutateRow(f,'filterInputs',f.neighbor.id,r=>r.presence.reference='present');const r=await noWrite(f,async()=>f.reader.prepare(await f.request()));assert.equal(r.candidates[0].reason,'NEIGHBOR_UNAVAILABLE');
});
test('actual human edit, edit undo, Keep, removed and restored candidate never acquire capability',async()=>{
 for(const operation of ['edit','undo','keep','remove','restore']){
  const f=await fixture();if(operation==='edit'||operation==='undo'){await f.s.updateLibrary(f.target.id,{libraryText:'Invented human revision'});if(operation==='undo')await f.s.updateLibrary(f.target.id,{libraryText:null});}
  if(operation==='keep')await f.s.keepInput(f.target.id);
  if(operation==='remove'||operation==='restore'){await f.s.excludeLibrary(f.target.id,true);if(operation==='restore')await f.s.excludeLibrary(f.target.id,false);}
  const r=await noWrite(f,async()=>f.reader.prepare(await f.request()));assert.equal(r.status,'NO_CAPABILITY',operation);assert.ok(['HUMAN_PROTECTED','INPUT_UNAVAILABLE'].includes(r.candidates[0].reason));
 }
});
test('actual Source purge/tombstone, source gap and required typed metadata gaps refuse zero-write',async()=>{
 for(const kind of ['purge','source-tombstone','snapshot-tombstone','record-missing','index-missing','input-state-missing','filter-input-missing','position-missing','authorship-missing','evaluation-invalid','branch']){
  const f=await fixture(),request=await f.request();
  if(kind==='purge')await f.s.permanentDelete(f.target.originalTextReference);
  else await f.s.repository.transaction(true,async t=>{
   const source=await t.get('recordIndex',f.target.originalTextReference);
   if(kind==='source-tombstone'||kind==='snapshot-tombstone')await t.put('tombstones',{id:(kind==='source-tombstone'?'source:':'snapshot:')+(kind==='source-tombstone'?source.sourceKey:source.dedupeKey),value:{synthetic:true}});
   else if(kind.endsWith('missing')&&['record-missing','index-missing','input-state-missing','filter-input-missing','position-missing'].includes(kind))await t.delete({'record-missing':'records','index-missing':'recordIndex','input-state-missing':'inputStates','filter-input-missing':'filterInputs','position-missing':'blockIndex'}[kind],kind.startsWith('record-')||kind==='index-missing'?f.target.originalTextReference:f.target.id);
   else if(kind==='branch'){const b=await t.get('blocks',f.target.id);b.value.branchStatus='synthetic';await t.put('blocks',b);}
   else {const row=await t.get('filterInputs',f.target.id);if(kind==='authorship-missing')delete row.authorship;else row.evaluationRevision=-1;await t.put('filterInputs',row);}
  });
  const r=await noWrite(f,()=>f.reader.prepare(request));assert.equal(r.status,'NO_CAPABILITY',kind);assert.notEqual(r.candidates[0].eligibility,'PRIVATE_CANDIDATE');
 }
});
test('permission absent/revoked/off/Free/unknown or extra/rebound/non-user scope refuses before block or Source body reads',async()=>{
 for(const patch of [{allowed:false},{tier:'free'},{tier:'unknown'},{optIn:false},{processingConsent:false},{userInputIds:[]},{userInputIds:Array(11).fill('unbound')},{scope:{candidateIds:[],neighborIds:[]}},{epochs:{entitlement:'',optIn:'1',processing:'1',userRead:'1'}},{extra:'no authority'}]){
  const f=await fixture(),request=await f.request();f.setPatch(patch);let bodyReads=0;const original=f.s.repository.transaction.bind(f.s.repository);
  f.s.repository.transaction=(write,fn)=>original(write,async t=>{const get=t.get.bind(t);t.get=(name,...args)=>{if(['blocks','records'].includes(name))bodyReads++;return get(name,...args);};return fn(t);});
  const r=await noWrite(f,()=>f.reader.prepare(request));assert.equal(r.status,'UNAVAILABLE');assert.equal(r.reason,'PERMISSION_UNAVAILABLE');assert.equal(bodyReads,0);bodyFree(r);
 }
 const f=await fixture(),request=await f.request();const reader=new AmbiguousFilterPreflight(f.s,{clock:()=>1000});assert.equal((await noWrite(f,()=>reader.prepare(request))).reason,'STORE_NOT_READY');
});
test('actual owner consent OFF, Filter OFF, seal and old policy cannot prepare',async()=>{
 for(const kind of ['consent','off','seal','policy']){
  const f=await fixture(),request=await f.request();if(kind==='consent')await f.s.setEnabled(false);if(kind==='off')await f.s.setFilterMode('off');if(kind==='seal')await f.s.repository.transaction(true,t=>t.put('meta',{id:'thought-library',sealed:true}));if(kind==='policy')await mutateRow(f,'meta','smart-filter',r=>r.classifierVersion='old');
  const r=await noWrite(f,()=>f.reader.prepare(request));assert.equal(r.status,'UNAVAILABLE',kind);assert.equal(r.reason,'OWNER_UNAVAILABLE');
 }
});
test('visible edited/Kept user neighbor requires its exact current revision and same-document bounded actual position',async()=>{
 const f=await fixture();await f.s.updateLibrary(f.neighbor.id,{libraryText:'Invented current user neighbor text'});await f.s.keepInput(f.neighbor.id);const r=await noWrite(f,async()=>f.reader.prepare(await f.request()));assert.equal(r.status,'CANDIDATE_ONLY');bodyFree(r);
 const stale=await f.request();stale.candidates[0].neighbors[0].expectedContentRevision=0;assert.equal((await noWrite(f,()=>f.reader.prepare(stale))).candidates[0].reason,'NEIGHBOR_STALE');
 const other=await add(f.s,'Invented other conversation context','other',{},'other-synthetic-chat');await f.s.finishFoundation();await f.s.evaluateFilters();assert.equal((await noWrite(f,async()=>f.reader.prepare(await f.request(f.target,other)))).candidates[0].reason,'NEIGHBOR_UNAVAILABLE');
 const g=await fixture();await add(g.s,'Synthetic middle sentence','middle1');await add(g.s,'Synthetic middle sentence two','middle2');const far=await add(g.s,'Synthetic far sentence','far');await g.s.finishFoundation();await g.s.evaluateFilters();const farResult=await noWrite(g,async()=>g.reader.prepare(await g.request(g.target,far)));assert.equal(farResult.candidates[0].reason,'POSITION_UNAVAILABLE');
});
test('revalidation detects actual relevant edit/remove/restore/Keep/reevaluation/policy/restore epoch/permission transitions',async()=>{
 for(const kind of ['candidate-edit','candidate-keep','neighbor-edit','neighbor-remove','neighbor-restore','reevaluation','policy','restore-epoch','permission','source-purge','position']){
  const f=await fixture(),initial=await f.reader.prepare(await f.request());assert.equal(initial.status,'CANDIDATE_ONLY');
  if(kind==='candidate-edit')await f.s.updateLibrary(f.target.id,{libraryText:'Invented changed target'});if(kind==='candidate-keep')await f.s.keepInput(f.target.id);
  if(kind==='neighbor-edit')await f.s.updateLibrary(f.neighbor.id,{libraryText:'Invented changed neighbor'});
  if(kind==='neighbor-remove'||kind==='neighbor-restore'){await f.s.excludeLibrary(f.neighbor.id,true);if(kind==='neighbor-restore')await f.s.excludeLibrary(f.neighbor.id,false);}
  if(kind==='reevaluation')await mutateRow(f,'filterInputs',f.target.id,r=>r.evaluationRevision++);
  if(kind==='policy'){await f.s.setFilterMode('off');await f.s.setFilterMode('light');}
  if(kind==='restore-epoch')await f.s.repository.transaction(true,t=>t.put('meta',{id:'recovery-restore-epoch',value:'synthetic-restore'}));
  if(kind==='permission')f.setPatch({epochs:{entitlement:'changed',optIn:'opt-v1',processing:'consent-v1',userRead:'canonical-user-fixture-v1'}});
  if(kind==='source-purge')await f.s.permanentDelete(f.neighbor.originalTextReference);
  if(kind==='position')await mutateRow(f,'blockIndex',f.neighbor.id,r=>r.listKey=[...r.listKey,99]);
  const r=await noWrite(f,()=>f.reader.revalidate(initial.capability));assert.ok(['STALE','UNAVAILABLE'].includes(r.status),kind);assert.equal(r.capability,null);assert.equal((await noWrite(f,()=>f.reader.revalidate(initial.capability))).status,'STALE');bodyFree(r);
 }
});
test('partial batch stays bounded, no-context keeps local, duplicate/extra/sparse/accessor/rebound scope cannot grant reads',async()=>{
 const f=await fixture(),request=await f.request();const none=structuredClone(request);none.candidates[0].neighbors=[];assert.equal((await noWrite(f,()=>f.reader.prepare(none))).candidates[0].reason,'CONTEXT_INSUFFICIENT');
 const third=await add(f.s,'继续','locally-filtered');await f.s.finishFoundation();await f.s.evaluateFilters();const second=await f.request(third);request.candidates.push(second.candidates[0]);const r=await noWrite(f,()=>f.reader.prepare(request));assert.equal(r.status,'CANDIDATE_ONLY');assert.deepEqual(r.candidates.map(x=>x.eligibility),['PRIVATE_CANDIDATE','INELIGIBLE']);assert.equal((await noWrite(f,()=>f.reader.revalidate(r.capability))).status,'CURRENT');
 const base=await f.request(),invalids=[{...base,extra:true},{candidates:[]},{candidates:Array(9).fill(base.candidates[0])},{candidates:[base.candidates[0],base.candidates[0]]}];
 const rebound=structuredClone(base);rebound.candidates[0].neighbors[0].inputId=f.target.id;invalids.push(rebound);
 const negative=structuredClone(base);negative.candidates[0].expectedEvaluationRevision=-1;invalids.push(negative);
 const sparse=structuredClone(base);sparse.candidates=new Array(1);invalids.push(sparse);
 const accessor=structuredClone(base);let touched=0;Object.defineProperty(accessor.candidates,'0',{get(){touched++;return base.candidates[0];},enumerable:true});invalids.push(accessor);
 const extraArray=structuredClone(base);extraArray.candidates.extra=true;invalids.push(extraArray);
 for(const value of invalids){const r=await noWrite(f,()=>f.reader.prepare(value));assert.equal(r.reason,'INVALID_SCOPE');}assert.equal(touched,0);
});
test('text/context/proof limits reject without truncation or writes',async()=>{
 const long=await fixture('A'.repeat(1025));assert.equal((await noWrite(long,async()=>long.reader.prepare(await long.request()))).candidates[0].reason,'TEXT_BOUND');
 const f=await fixture();await f.s.updateLibrary(f.neighbor.id,{libraryText:'A'.repeat(2049)});assert.equal((await noWrite(f,async()=>f.reader.prepare(await f.request()))).candidates[0].reason,'TEXT_BOUND');
 const g=await fixture();await g.s.updateLibrary(g.neighbor.id,{libraryText:'汉'.repeat(700)});const other=await add(g.s,'汉'.repeat(700),'neighbor2');await g.s.finishFoundation();await g.s.evaluateFilters();const request=await g.request();request.candidates[0].neighbors.push((await g.request(g.target,other)).candidates[0].neighbors[0]);assert.equal((await noWrite(g,()=>g.reader.prepare(request))).reason,'TEXT_BOUND');
});
test('8 handles, 5-minute expiry, clock rollback/overflow, concurrent capacity and dispose fail closed',async()=>{
 const f=await fixture(),request=await f.request(),handles=[];for(let i=0;i<8;i++){const r=await noWrite(f,()=>f.reader.prepare(request));assert.equal(r.status,'CANDIDATE_ONLY');handles.push(r.capability);}assert.equal((await noWrite(f,()=>f.reader.prepare(request))).reason,'CAPABILITY_BOUND');
 f.setNow(301000);for(const h of handles)assert.equal((await noWrite(f,()=>f.reader.revalidate(h))).status,'STALE');const fresh=await noWrite(f,()=>f.reader.prepare(request));assert.equal(fresh.status,'CANDIDATE_ONLY');f.setNow(300999);assert.equal((await noWrite(f,()=>f.reader.revalidate(fresh.capability))).reason,'CLOCK_INVALID');
 f.setNow(Number.MAX_SAFE_INTEGER);assert.equal((await noWrite(f,()=>f.reader.prepare(request))).reason,'CLOCK_INVALID');
 const g=await fixture(),req=await g.request(),results=await noWrite(g,()=>Promise.all(Array.from({length:10},()=>g.reader.prepare(req))));assert.equal(results.filter(x=>x.status==='CANDIDATE_ONLY').length,8);assert.equal(results.filter(x=>x.reason==='CAPABILITY_BOUND').length,2);
 const h=await fixture(),hreq=await h.request();h.setHook(()=>h.reader.dispose());assert.equal((await noWrite(h,()=>h.reader.prepare(hreq))).reason,'REVOKED');
 const slow=await fixture(),slowreq=await slow.request();slow.setHook(()=>slow.setNow(301000));assert.equal((await noWrite(slow,()=>slow.reader.prepare(slowreq))).reason,'CAPABILITY_EXPIRED');
});
test('cold owner is not initialized and arbitrary thrown private error data never escapes',async()=>{
 const storage=local(),s=new OrganizerStore(storage,{indexedDB:new IDBFactory()}),reader=new AmbiguousFilterPreflight(s,{resolvePermission:()=>{},clock:()=>1});assert.equal((await reader.prepare({candidates:[]})).reason,'STORE_NOT_READY');assert.equal(s.repository.db,undefined);assert.deepEqual(storage.dump(),{});
 const f=await fixture(),request=await f.request();f.setHook(()=>{throw {reason:'paper boat PRIVATE BODY',body:'然后'};});const r=await noWrite(f,()=>f.reader.prepare(request));assert.equal(r.reason,'READ_FAILED');bodyFree(r);
});
test('permission final fence catches change during readonly reads, and revoked capability never returns to current',async()=>{
 const f=await fixture(),request=await f.request();f.setHook(()=>{if(f.calls()===1)f.setPatch({epochs:{entitlement:'new',optIn:'opt-v1',processing:'consent-v1',userRead:'canonical-user-fixture-v1'}});});const changed=await noWrite(f,()=>f.reader.prepare(request));assert.equal(changed.reason,'PERMISSION_CHANGED');assert.equal(changed.capability,null);
 const g=await fixture(),initial=await g.reader.prepare(await g.request());g.setPatch({optIn:false});const revoked=await noWrite(g,()=>g.reader.revalidate(initial.capability));assert.equal(revoked.reason,'PERMISSION_UNAVAILABLE');g.setPatch({});assert.equal((await noWrite(g,()=>g.reader.revalidate(initial.capability))).status,'STALE');
 const h=await fixture(),cap=await h.reader.prepare(await h.request());for(const forged of [Object.freeze(Object.create(null)),structuredClone(cap.capability),null,7,'unbound'])assert.equal((await noWrite(h,()=>h.reader.revalidate(forged))).status,'STALE');
});
test('read-only preflight never invokes cold initialization, nested public eligibility or any owner writer',async()=>{
 const f=await fixture(),request=await f.request();for(const method of ['run','write','finishFoundation','inputEligibility','evidenceFor','createEntry','keepInput','protect','protectUserInput','setFilterMode','evaluateFilters','editDocument'])f.s[method]=()=>{throw Error('FORBIDDEN_OWNER_METHOD_'+method);};
 const r=await noWrite(f,()=>f.reader.prepare(request));assert.equal(r.status,'CANDIDATE_ONLY');assert.equal((await noWrite(f,()=>f.reader.revalidate(r.capability))).status,'CURRENT');bodyFree(r);
});
test('missing library qualification or malformed restore fence is unavailable; restore presence cannot alias initial epoch',async()=>{
 for(const kind of ['library-missing','library-unverified','library-pending','restore-null']){
  const f=await fixture(),request=await f.request();await f.s.repository.transaction(true,async t=>{if(kind==='library-missing')await t.delete('meta','thought-library');else if(kind==='restore-null')await t.put('meta',{id:'recovery-restore-epoch',value:null});else{const row=await t.get('meta','thought-library');if(kind==='library-unverified')row.verified=false;else row.phase='verify';await t.put('meta',row);}});
  assert.equal((await noWrite(f,()=>f.reader.prepare(request))).reason,'OWNER_UNAVAILABLE');
 }
 const f=await fixture(),r=await f.reader.prepare(await f.request());await f.s.repository.transaction(true,t=>t.put('meta',{id:'recovery-restore-epoch',value:'initial'}));assert.equal((await noWrite(f,()=>f.reader.revalidate(r.capability))).status,'STALE');
});
test('temporarily unavailable owner revokes private handles rather than reviving them after readiness returns',async()=>{
 const f=await fixture(),r=await f.reader.prepare(await f.request());f.s.filterLoaded=false;assert.equal((await noWrite(f,()=>f.reader.revalidate(r.capability))).reason,'STORE_NOT_READY');f.s.filterLoaded=true;assert.equal((await noWrite(f,()=>f.reader.revalidate(r.capability))).status,'STALE');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {local} from './harness/thought-m1.mjs';
import {LibraryDocumentsStore} from '../core/library-documents-store.js';
import {BrowserNativeSyncCore,sealOperation} from '../core/browser-native-sync/core.js';
import {HumanLibrarySyncJournal} from '../core/browser-native-sync/human-library-journal.js';
import {humanPlanEntry,captureHumanBranchSemanticWitness as captureWitness,revalidateHumanBranchSemanticWitness as revalidate,executeHumanPlan} from '../core/browser-native-sync/human-library-plan.js';
import {prefix} from '../core/thought-model.js';
import {hashText} from '../core/dedupe.js';
import {humanWireRequestDigest} from '../core/browser-native-sync/human-library-request.js';
import {clone} from '../core/browser-native-sync/value.js';
globalThis.IDBKeyRange=IDBKeyRange;
const op=()=>crypto.randomUUID();
const snapshot=s=>s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all([...t.tx.objectStoreNames].map(async n=>[n,await t.all(n)]))));
const latestGroup=async(core,id)=>{const rows=[];for await(const r of core.rows('revision'))if(!r.redacted)rows.push(r.operation);const d=rows.filter(r=>r.type==='humanLibraryCommit'&&r.deviceId===core.deviceId&&r.value.request.id===id).sort((a,b)=>a.sequence-b.sequence).at(-1);return d?[...d.value.members.map(ref=>rows.find(r=>r.revisionId===ref.revisionId)),d]:null;};
const allGroups=async core=>{const rows=[];for await(const r of core.rows('revision'))if(!r.redacted)rows.push(r.operation);return rows.filter(r=>r.type==='humanLibraryCommit').sort((a,b)=>a.sequence-b.sequence).map(d=>[...d.value.members.map(ref=>rows.find(r=>r.revisionId===ref.revisionId)),d]);};
async function device(id){let tick=0;const s=new LibraryDocumentsStore(local(),{indexedDB:new IDBFactory(),clock:()=>new Date(Date.UTC(2026,9,9)+tick++).toISOString()});await s.consent(true);await s.finishFoundation();const core=new BrowserNativeSyncCore(s.repository,{datasetId:'synthetic-historical-body',deviceId:id});s.humanLibraryJournal=new HumanLibrarySyncJournal(core);return {s,core};}
async function capture(s,core,id){const base=await humanPlanEntry(s,core);return {base,read:await s.repository.transaction(false,async t=>{const page=await t.rangePage('revisions','byList',prefix(['library_entry:'+id]),null,129);assert.equal(page.next,null);return {row:await t.get('thoughts',id),history:page.rows.map(x=>x.value),placements:await t.count('placements','byEntry',prefix([id])),placementRows:[],topics:[],epoch:(await t.get('meta','thought-epoch'))?.value||0,provenance:await t.count('provenance','byOwner',prefix(['entry',id])),dependencies:await t.count('dependencies','byTarget',prefix(['entry',id]))};})};}
async function scenario({parent='create',offset=false,incomingNoDelta=false,afterParentUnrelated=false,padding='',extraEdits=0}={}){
 const a=await device('synthetic-history-a'),b=await device('synthetic-history-b');if(offset)await b.s.createEntry({actor:'user',body:'SYNTHETIC unrelated receiver counter',type:'idea',formation:'explicit',evidence:[],operationId:op()});
 const entry=await a.s.createEntry({actor:'user',body:'SYNTHETIC historical baseline 汉字'+padding,type:'idea',formation:'explicit',evidence:[],operationId:op()});let revision=0;
 if(parent!=='create'){await a.s.editEntry({id:entry.id,expectedRevision:revision++,changes:{body:'SYNTHETIC common parent first'},operationId:op()});if(parent==='coalesced')await a.s.editEntry({id:entry.id,expectedRevision:revision++,changes:{body:'SYNTHETIC common parent coalesced'},operationId:op()});if(parent==='no-delta')await a.s.editEntry({id:entry.id,expectedRevision:revision,changes:{body:'SYNTHETIC common parent first'},operationId:op()});}
 for(let i=0;i<extraEdits;i++)await a.s.editEntry({id:entry.id,expectedRevision:revision++,changes:{body:'SYNTHETIC extra parent '+i},operationId:op()});
 for(const group of await allGroups(a.core))assert.equal((await b.s.humanLibraryJournal.receive(b.s,group)).state,'applied');
 const oracle=await capture(b.s,b.core,entry.id);if(afterParentUnrelated)await b.s.createEntry({actor:'user',body:'SYNTHETIC later unrelated history counter',type:'idea',formation:'explicit',evidence:[],operationId:op()});const body=incomingNoDelta?oracle.read.row.thoughtText:'SYNTHETIC lawful branch A 🧠';
 await a.s.editEntry({id:entry.id,expectedRevision:revision,changes:{body},operationId:op()});const incoming=await latestGroup(a.core,entry.id);
 await b.s.editEntry({id:entry.id,expectedRevision:revision,changes:{body:'SYNTHETIC current canonical branch B'},operationId:op()});return {a,b,id:entry.id,incoming,oracle};
}

test('six exact parent semantic cases are readonly and mint no execution capability',async()=>{
 for(const options of [{offset:true},{parent:'new-history',offset:true},{incomingNoDelta:true},{parent:'coalesced'},{parent:'no-delta'},{parent:'coalesced',afterParentUnrelated:true}]){
  const f=await scenario(options),before=await snapshot(f.b.s),cap=await captureWitness(f.b.s,f.b.core,f.incoming);
  assert.equal(Object.isFrozen(cap),true);assert.deepEqual(Object.keys(cap),[]);assert.equal(await revalidate(f.b.s,f.b.core,cap),undefined);
  for(const fake of [cap,clone(cap)])await assert.rejects(executeHumanPlan(fake),{code:'BNS_HUMAN_PLAN_REQUIRED'});
  await assert.rejects(revalidate(f.b.s,f.b.core,clone(cap)),{code:'BNS_HUMAN_BRANCH_WITNESS_REQUIRED'});
  assert.deepEqual(await snapshot(f.b.s),before);
 }
});
test('guard await cannot reopen a database closed after the settled-tail barrier',async()=>{
 const f=await scenario(),s=f.b.s,before=await snapshot(s),old=s.repository.db,originalDigest=crypto.subtle.digest.bind(crypto.subtle),originalOpen=s.repository.factory.open.bind(s.repository.factory);const observer=await new Promise((resolve,reject)=>{const request=originalOpen(s.repository.name);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});let opens=0,injected=false;
 s.repository.factory.open=(...args)=>{opens++;return originalOpen(...args);};
 crypto.subtle.digest=async(...args)=>{if(!injected&&new Error().stack.includes('prepareHumanEntryEditPlan')){injected=true;old.close();s.repository.db=null;}return originalDigest(...args);};
 try{await assert.rejects(captureWitness(s,f.b.core,f.incoming));assert.equal(injected,true);assert.equal(opens,0,'readonly witness must never trigger actual IDBFactory.open');assert.equal(s.repository.db,null);s.repository.db=observer;assert.deepEqual(await snapshot(s),before);}finally{crypto.subtle.digest=originalDigest;observer.close();}
});
test('all readiness flags, queued reset and failure state refuse without initializing',async()=>{
 for(const flag of ['loaded','iaLoaded','filterLoaded','foundationLoaded','bindingsLoaded','documentsLoaded','foundationFailure']){
  const f=await scenario(),s=f.b.s;let init=0,opens=0;const initialize=s.repository.initialize.bind(s.repository),open=s.repository.factory.open.bind(s.repository.factory);
  s.repository.initialize=(...a)=>{init++;return initialize(...a);};s.repository.factory.open=(...a)=>{opens++;return open(...a);};
  const before=await snapshot(s);s[flag]=flag==='foundationFailure';
  await assert.rejects(captureWitness(s,f.b.core,f.incoming));assert.equal(init,0);assert.equal(opens,0);assert.deepEqual(await snapshot(s),before);
 }
 const f=await scenario(),s=f.b.s;let init=0;const original=s.repository.initialize.bind(s.repository);s.repository.initialize=(...a)=>{init++;return original(...a);};
 let release;const hold=new Promise(r=>release=r);s.tail=s.tail.then(async()=>{await hold;s.loaded=false;});
 const pending=captureWitness(s,f.b.core,f.incoming);release();await assert.rejects(pending);assert.equal(init,0);
});
test('only one capture or revalidation in flight; ninth witness revokes oldest',async()=>{
 const f=await scenario(),s=f.b.s,handles=[];
 let release;const hold=new Promise(r=>release=r);s.tail=s.tail.then(()=>hold);const pending=captureWitness(s,f.b.core,f.incoming);await assert.rejects(captureWitness(s,f.b.core,f.incoming),{code:'BNS_HUMAN_BRANCH_BUSY'});release();handles.push(await pending);
 for(let i=0;i<8;i++)handles.push(await captureWitness(s,f.b.core,f.incoming));
 await assert.rejects(revalidate(s,f.b.core,handles[0]),{code:'BNS_HUMAN_BRANCH_WITNESS_REQUIRED'});await revalidate(s,f.b.core,handles[1]);
});
test('foreign object identity and later counter/mapping/control changes revoke witness',async()=>{
 for(const kind of ['counter','mapping','control','database']){
  const f=await scenario(),s=f.b.s,cap=await captureWitness(s,f.b.core,f.incoming);
  if(kind==='counter')await s.repository.transaction(true,async t=>{const r=await t.get('meta','thought-sequence');await t.put('meta',{...r,value:r.value+1});});
  if(kind==='mapping')await f.b.core.transaction(true,async t=>{const m=await f.b.core.get(t,'humanMapping','entry:'+f.id);await f.b.core.put(t,'humanMapping',['entry:'+f.id],{...m,revisionId:'f'.repeat(64)});});
  if(kind==='control')s.pendingControl=clone(s.controlCache);
  if(kind==='database'){const other=await device('synthetic-foreign');s.repository.db=other.s.repository.db;}
  await assert.rejects(revalidate(s,f.b.core,cap));await assert.rejects(revalidate(s,f.b.core,cap),{code:'BNS_HUMAN_BRANCH_WITNESS_REQUIRED'});
 }
 const f=await scenario(),g=await device('synthetic-foreign'),cap=await captureWitness(f.b.s,f.b.core,f.incoming);await assert.rejects(revalidate(g.s,g.core,cap),{code:'BNS_HUMAN_BRANCH_WITNESS_REQUIRED'});
});

async function resealed(group,mutate,{request=false}={}){const rows=clone(group);await mutate(rows);const d=rows.at(-1).value;if(request){d.ownerRequestDigest=await hashText(JSON.stringify(d.request));d.requestDigest=await humanWireRequestDigest(d);for(const row of rows.slice(0,-1))row.value.requestDigest=d.requestDigest;}
 for(let i=0;i<rows.length-1;i++)rows[i]=await sealOperation(rows[i]);d.members=d.members.map(ref=>{const o=rows.slice(0,-1).find(x=>x.entityId===ref.entityId);return {...ref,revisionId:o.revisionId,operationId:o.operationId};});rows[rows.length-1]=await sealOperation(rows.at(-1));return rows;}

test('resealed semantic fields, actor, partial closure and hidden local index remain refused',async()=>{
 const f=await scenario(),before=await snapshot(f.b.s);
 for(const change of [rows=>{rows[0].value.after.thoughtText+=' changed';},rows=>{rows.find(x=>x.value.entityType==='history').value.after.at='2026-10-08T00:00:00.000Z';},rows=>{rows.at(-1).value.events.find(x=>x.kind==='clock').value='2026-10-08T00:00:00.000Z';}])await assert.rejects(captureWitness(f.b.s,f.b.core,await resealed(f.incoming,change)));
 const badActor=await resealed(f.incoming,rows=>{rows.at(-1).value.request.actor='ai';rows.at(-1).value.requestOrder.push('actor');},{request:true});await assert.rejects(captureWitness(f.b.s,f.b.core,badActor),{code:'BNS_HUMAN_REQUEST'});
 await assert.rejects(captureWitness(f.b.s,f.b.core,f.incoming.slice(1)));
 const currentPlan=await resealed(f.incoming,rows=>{rows.at(-1).value.request.expectedRevision=1;},{request:true});await assert.rejects(captureWitness(f.b.s,f.b.core,currentPlan),{code:'BNS_HUMAN_BRANCH_UNAVAILABLE'});
 await assert.rejects(captureWitness(f.b.s,f.b.core,await latestGroup(f.b.core,f.id)));
 assert.deepEqual(await snapshot(f.b.s),before);
 await f.b.s.repository.transaction(true,async t=>{const row=await t.get('thoughts',f.id);await t.put('thoughts',{...row,indexedSearchVersion:row.searchVersion});});const indexed=await snapshot(f.b.s);await assert.rejects(captureWitness(f.b.s,f.b.core,f.incoming),{code:'BNS_HUMAN_BRANCH_UNAVAILABLE'});assert.deepEqual(await snapshot(f.b.s),indexed);
});

test('caller mutation cannot retarget capture and final pending control invalidates it',async()=>{
 const f=await scenario(),input=clone(f.incoming);let release;const hold=new Promise(r=>release=r);f.b.s.tail=f.b.s.tail.then(()=>hold);
 const pending=captureWitness(f.b.s,f.b.core,input);input[0].value.after.thoughtText='SYNTHETIC changed after invocation';release();const cap=await pending;await revalidate(f.b.s,f.b.core,cap);
 const g=await scenario(),before=await snapshot(g.b.s),original=g.b.core.transaction.bind(g.b.core);let rawReads=0;
 g.b.core.transaction=async(...args)=>{const result=await original(...args);if(result?.records&&++rawReads===2)g.b.s.pendingControl=clone(g.b.s.controlCache);return result;};
 await assert.rejects(captureWitness(g.b.s,g.b.core,g.incoming),{code:'BNS_HUMAN_CHANGED'});assert.equal(rawReads,2);assert.deepEqual(await snapshot(g.b.s),before);
});
test('aggregate raw retention evicts before the ninth handle for large valid closures',async()=>{
 const f=await scenario({padding:'汉'.repeat(20000)}),handles=[];for(let i=0;i<8;i++)handles.push(await captureWitness(f.b.s,f.b.core,f.incoming));
 await assert.rejects(revalidate(f.b.s,f.b.core,handles[0]),{code:'BNS_HUMAN_BRANCH_WITNESS_REQUIRED'});await revalidate(f.b.s,f.b.core,handles.at(-1));
});
test('complete causal union uses original global bounds including shared closure',async()=>{
 const admitted=await scenario({extraEdits:29}),before=await snapshot(admitted.b.s);const cap=await captureWitness(admitted.b.s,admitted.b.core,admitted.incoming);await revalidate(admitted.b.s,admitted.b.core,cap);assert.deepEqual(await snapshot(admitted.b.s),before);
 const excess=await scenario({extraEdits:30}),cut=await snapshot(excess.b.s);await assert.rejects(captureWitness(excess.b.s,excess.b.core,excess.incoming),{code:'BNS_HUMAN_GRAPH_LIMIT'});assert.deepEqual(await snapshot(excess.b.s),cut);
});

test('oversize incoming byte envelope refuses before a partial proof',async()=>{
 const f=await scenario(),before=await snapshot(f.b.s),input=clone(f.incoming);input[0].value.after.thoughtText='x'.repeat(4*1024*1024);
 await assert.rejects(captureWitness(f.b.s,f.b.core,input),{code:'BNS_HUMAN_GRAPH_LIMIT'});assert.deepEqual(await snapshot(f.b.s),before);
});

test('unjournaled current Entry and every current history phase refuse despite identical physical slots',async()=>{
 for(const mutation of ['body','last-history','baseline-history','coalesced-history']){
  const f=await scenario(mutation==='coalesced-history'?{parent:'coalesced'}:{}),s=f.b.s;
  await s.repository.transaction(true,async t=>{
   if(mutation==='body'){const row=await t.get('thoughts',f.id);await t.put('thoughts',{...row,thoughtText:'SYNTHETIC unjournaled current body mutation'});}
   else{const rows=await t.rangePage('revisions','byList',prefix(['library_entry:'+f.id]),null,129),row=rows.rows[mutation==='baseline-history'?0:rows.rows.length-1].value;await t.put('revisions',{...row,after:{...row.after,body:'SYNTHETIC unjournaled history mutation'}});}
  });
  const before=await snapshot(s);await assert.rejects(captureWitness(s,f.b.core,f.incoming));assert.deepEqual(await snapshot(s),before);
 }
});

test('comparison raw cap leaves room for the fresh snapshot without widening protocol limits',async()=>{
 const f=await scenario({padding:'汉'.repeat(50000)}),before=await snapshot(f.b.s);await assert.rejects(captureWitness(f.b.s,f.b.core,f.incoming),{code:'BNS_HUMAN_GRAPH_LIMIT'});assert.deepEqual(await snapshot(f.b.s),before);
});
test('same-object control mutation after the final transaction refuses capture and revalidation',async()=>{
 for(const mode of ['capture','revalidate']){
  const f=await scenario(),s=f.b.s,cap=mode==='revalidate'?await captureWitness(s,f.b.core,f.incoming):null,before=await snapshot(s),identity=s.controlCache,original=f.b.core.transaction.bind(f.b.core);let reads=0,reached=false;
  f.b.core.transaction=async(...args)=>{const result=await original(...args);if(result?.records&&++reads===(mode==='capture'?2:1)){reached=true;s.controlCache.settings.enabled=false;s.controlCache.settings.epoch++;}return result;};
  await assert.rejects(mode==='capture'?captureWitness(s,f.b.core,f.incoming):revalidate(s,f.b.core,cap),{code:'BNS_HUMAN_CHANGED'});assert.equal(reached,true);assert.equal(s.controlCache,identity);assert.equal(s.controlCache.settings.enabled,false);assert.deepEqual(await snapshot(s),before);
 }
});

test('shared parent receipt schema, result identity and operation sequence remain strict original guards',async()=>{
 for(const mutation of ['schema','result-id','sequence-zero','sequence-fraction','sequence-unsafe']){
  const f=await scenario(),member=f.incoming.find(x=>x.value?.entityType==='entry'),parent=await f.b.core.read('revision',member.parents[0]),head=await f.b.core.read('head','humanLibraryCommit',parent.operation.value.logicalCommitId),descriptor=await f.b.core.read('revision',head.revisions[0]);
  await f.b.s.repository.transaction(true,async t=>{const r=await t.get('operationReceipts',descriptor.operation.value.domainOperationId);if(mutation==='schema')r.schemaVersion=2;else if(mutation==='result-id')r.result.id='SYNTHETIC-other-entity';else r.operationSequence=mutation==='sequence-zero'?0:mutation==='sequence-fraction'?2.5:Number.MAX_SAFE_INTEGER+1;await t.put('operationReceipts',r);});
  const before=await snapshot(f.b.s);await assert.rejects(captureWitness(f.b.s,f.b.core,f.incoming),{code:'BNS_HUMAN_BRANCH_UNAVAILABLE'});assert.deepEqual(await snapshot(f.b.s),before);
 }
});

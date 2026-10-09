import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {local} from './harness/thought-m1.mjs';
import {LibraryDocumentsStore} from '../core/library-documents-store.js';
import {BrowserNativeSyncCore,sealOperation,CORE_LIMITS} from '../core/browser-native-sync/core.js';
import {prepareGroupCheckpointPlan} from '../core/browser-native-sync/group-checkpoint-plan.js';
import {executeHumanPlan} from '../core/browser-native-sync/human-library-plan.js';
import {HumanLibrarySyncJournal} from '../core/browser-native-sync/human-library-journal.js';
import {hashText} from '../core/dedupe.js';
import {humanWireRequestDigest} from '../core/browser-native-sync/human-library-request.js';
import {canonical,bytes,clone,digest} from '../core/browser-native-sync/value.js';
import * as qualification from '../core/browser-native-sync/human-conflict-graph.js';
import * as budget from '../core/browser-native-sync/human-qualification-budget.js';
const {prepareHumanConflictGraphQualification:actualPrepare,describeHumanConflictGraphQualification:describe,releaseHumanConflictGraphQualification:release}=qualification;
// Caller-side representation adapter only; direct closed-intake tests bypass it.
async function prepare(rows,o=options){return actualPrepare(canonical({datasetId:o.datasetId,operations:rows}));}
globalThis.IDBKeyRange=IDBKeyRange;
const datasetId='synthetic-conflict-graph',options={datasetId};
const retained=[],ownerReleases=new WeakMap(),numericLeases=[];
function keepOwner(handle,releaseOwner){ownerReleases.set(handle,releaseOwner);retained.push(handle);return handle;}
const keep=async(rows,o=options)=>{const handle=await prepare(rows,o);retained.push(handle);return handle;};
test.afterEach(()=>{while(retained.length){const handle=retained.pop();try{(ownerReleases.get(handle)||release)(handle);}catch(error){assert.equal(error.code,'BNS_HUMAN_GRAPH_QUALIFICATION_REQUIRED');}}});
test.afterEach(()=>{while(numericLeases.length){try{budget.releaseHumanQualificationLease(numericLeases.pop());}catch(error){assert.equal(error.code,'BNS_HUMAN_QUALIFICATION_LEASE_REQUIRED');}}});
const numeric=lease=>(numericLeases.push(lease),lease);
async function device(label,dataset=datasetId){let tick=0;const s=new LibraryDocumentsStore(local(),{indexedDB:new IDBFactory(),clock:()=>new Date(Date.UTC(2026,9,9)+tick++).toISOString()});await s.consent(true);await s.finishFoundation();const core=new BrowserNativeSyncCore(s.repository,{datasetId:dataset,deviceId:'synthetic-graph-'+label});s.humanLibraryJournal=new HumanLibrarySyncJournal(core);return {s,core};}
async function groups(core){const operations=[];for await(const row of core.rows('revision'))if(!row.redacted)operations.push(row.operation);return operations.filter(op=>op.type==='humanLibraryCommit').sort((a,b)=>a.sequence-b.sequence).map(d=>[...d.value.members.map(ref=>operations.find(op=>op.revisionId===ref.revisionId)),d]);}
async function fixture({siblings=2,parentEdits=0,noDelta=false,padding='',dataset=datasetId,unrelated=false}={}){
 const a=await device('a',dataset),devices=[a];const entry=await a.s.createEntry({actor:'user',body:'SYNTHETIC baseline 汉字 🧠'+padding,type:'idea',formation:'explicit',evidence:[],operationId:crypto.randomUUID()});
 for(let i=0;i<parentEdits;i++)await a.s.editEntry({id:entry.id,expectedRevision:i,changes:{body:'SYNTHETIC shared parent '+i},operationId:crypto.randomUUID()});
 const parentGroups=await groups(a.core),inventory=new Map(parentGroups.flat().map(op=>[op.revisionId,op]));
 for(let i=1;i<siblings;i++){const d=await device(String(i),dataset);devices.push(d);for(const group of parentGroups)assert.equal((await d.s.humanLibraryJournal.receive(d.s,group)).state,'applied');}
 for(let i=0;i<siblings;i++){
  const d=devices[i],row=await d.s.repository.transaction(false,t=>t.get('thoughts',entry.id));await d.s.editEntry({id:entry.id,expectedRevision:parentEdits,changes:{body:noDelta&&i===0?row.thoughtText:'SYNTHETIC branch '+i+' \"\\\n 🧠'},operationId:crypto.randomUUID()});
  if(unrelated)await d.s.createEntry({actor:'user',body:'SYNTHETIC unrelated '+i,type:'idea',formation:'explicit',evidence:[],operationId:crypto.randomUUID()});
  for(const operation of (await groups(d.core)).flat())inventory.set(operation.revisionId,operation);
 }
 const rows=[...inventory.values()];for(const d of devices)d.s.repository.db.close();return {rows,id:entry.id,parentGroups,devices};
}
async function reseal(rows,mutate,{request=false}={}){
 const copy=clone(rows),descriptor=copy.find(op=>op.type==='humanLibraryCommit');mutate(copy);const d=descriptor.value;
 if(request){d.ownerRequestDigest=await hashText(JSON.stringify(d.request));d.requestDigest=await humanWireRequestDigest(d);for(const op of copy)if(op.type==='humanLibraryMember')op.value.requestDigest=d.requestDigest;}
 for(let i=0;i<copy.length;i++)if(copy[i].type==='humanLibraryMember')copy[i]=await sealOperation(copy[i]);
 d.members=d.members.map(ref=>{const member=copy.find(op=>op.type==='humanLibraryMember'&&op.entityId===ref.entityId);return {...ref,revisionId:member.revisionId,operationId:member.operationId};});
 copy[copy.indexOf(descriptor)]=await sealOperation(descriptor);return copy;
}
const rejected=async(rows,code)=>assert.rejects(prepare(rows,options),code?{code}:undefined);

test('exact three exports and complete original creation/A/B all-head graph have no body or winner',async()=>{
 assert.deepEqual(Object.keys(qualification).sort(),['describeHumanConflictGraphQualification','prepareHumanConflictGraphQualification','releaseHumanConflictGraphQualification'].sort());
 const f=await fixture(),before=canonical(f.rows),handle=await keep(f.rows),summary=describe(handle);assert.deepEqual(Object.keys(handle),[]);assert.equal(Object.isFrozen(handle),true);assert.equal(describe(handle),summary);assert.equal(Object.isFrozen(summary.heads[0].revisions),true);
 assert.equal(summary.evidence,'PURE_HUMAN_GRAPH_STRUCTURE_ONLY');assert.equal(summary.operationCount,f.rows.length);assert.equal(summary.operationBytes,f.rows.reduce((n,op)=>n+bytes(op).length,0));
 const expected=f.rows.filter(op=>op.type==='humanLibraryMember'&&op.entityId==='entry:'+f.id&&!f.rows.some(other=>other.type===op.type&&other.entityId===op.entityId&&other.parents.includes(op.revisionId))).map(op=>op.revisionId).sort();assert.equal(expected.length,2);assert.deepEqual(summary.heads.find(h=>h.entityId==='entry:'+f.id).revisions,expected);
 assert.equal(summary.groups.length,3);assert.equal(JSON.stringify(summary).includes('SYNTHETIC baseline'),false);for(const key of ['winner','body','projection','permission','operations','request'])assert.equal(Object.hasOwn(summary,key),false);assert.equal(canonical(f.rows),before);
 const reversed=clone(f.rows).reverse().map(op=>Object.fromEntries(Object.entries(op).reverse()));assert.equal(describe(await keep(reversed)).graphDigest,summary.graphDigest);
});
test('three siblings, coalesced/new history, NO_DELTA and unrelated entries retain every typed terminal',async()=>{
 for(const config of [{siblings:3},{parentEdits:2,noDelta:true,unrelated:true}]){const f=await fixture(config),summary=describe(await keep(f.rows));assert.equal(summary.operationCount,f.rows.length);
  for(const h of summary.heads){const expected=f.rows.filter(op=>op.type===h.type&&op.entityId===h.entityId&&!f.rows.some(other=>other.type===op.type&&other.entityId===op.entityId&&other.parents.includes(op.revisionId))).map(op=>op.revisionId).sort();assert.deepEqual(h.revisions,expected);}
 }
});
test('original digest, codec and wire/owner request order remain enforced',async()=>{
 const f=await fixture(),group=clone(f.parentGroups[0]);let wrong=clone(group);wrong[0].revisionId='f'.repeat(64);await rejected(wrong);
 wrong=clone(group);wrong[0].value.after.thoughtText+=' altered';await rejected(wrong,'BNS_OPERATION_DIGEST');
 wrong=clone(group);wrong[0].codecVersion=2;await rejected(wrong);
 const badRequest=await reseal(group,rows=>{rows.find(op=>op.type==='humanLibraryCommit').value.ownerRequestDigest='f'.repeat(64);});await rejected(badRequest,'BNS_HUMAN_COMMIT_INVALID');
 const badOrder=clone(group);badOrder.at(-1).value.requestOrder.reverse();badOrder.at(-1).revisionId=await digest(Object.fromEntries(Object.entries(badOrder.at(-1)).filter(([k])=>k!=='revisionId')));await rejected(badOrder,'BNS_HUMAN_COMMIT_INVALID');
});
test('duplicates, missing/orphan/reused members and identity collisions refuse whole array',async()=>{
 const f=await fixture();await rejected([...f.rows,f.rows[0]],'BNS_GROUP_DUPLICATE');await rejected(f.rows.slice(1),'BNS_HUMAN_COMMIT_INCOMPLETE');await rejected(f.rows.filter(op=>op.type!=='humanLibraryCommit'),'BNS_HUMAN_COMMIT_INCOMPLETE');
 const wrong=clone(f.rows);wrong[1].operationId=wrong[0].operationId;await rejected(wrong,'BNS_GROUP_DUPLICATE');wrong[1].operationId='synthetic-unique-op';wrong[1].deviceId=wrong[0].deviceId;wrong[1].sequence=wrong[0].sequence;await rejected(wrong,'BNS_GROUP_DUPLICATE');
});
test('missing or cross-entity ancestry and two independent creations under same ID refuse',async()=>{
 const f=await fixture(),child=(await groupsForRows(f.rows)).find(g=>g.at(-1).value.kind==='entry-edit');await rejected(child,'BNS_HUMAN_ANCESTRY_REQUIRED');
 const wrong=await reseal(child,rows=>{rows.find(op=>op.value.entityType==='entry').parents=[f.parentGroups[0].find(op=>op.value.entityType==='history').revisionId];});await rejected([...f.parentGroups.flat(),...wrong],'BNS_HUMAN_ANCESTRY_REQUIRED');
 const creation=await reseal(f.parentGroups[0],rows=>{for(const op of rows){op.operationId='alternate-'+op.operationId;op.deviceId='synthetic-alternate';op.value.deviceId=op.deviceId;op.value.logicalCommitId&&=op.value.logicalCommitId+'-alternate';}const d=rows.at(-1);d.value.id+='-alternate';d.entityId=d.value.id;});await rejected([...f.parentGroups[0],...creation],'BNS_HUMAN_ANCESTRY_REQUIRED');
});
async function groupsForRows(rows){return rows.filter(op=>op.type==='humanLibraryCommit').map(d=>[...d.value.members.map(ref=>rows.find(op=>op.revisionId===ref.revisionId)),d]);}
test('profile rejects structural edits, source coupling, lifecycle, indexed local tags and multi-parent',async()=>{
 const f=await fixture(),group=f.parentGroups[0];
 for(const mutation of [rows=>{rows[0].value.after.topics=['synthetic-topic'];},rows=>{rows[0].value.after.lifecycle='removed';},rows=>{rows[0].value.after.organizationRevision=1;}])await rejected(await reseal(group,mutation),'BNS_HUMAN_GRAPH_PROFILE_UNSUPPORTED');
 const edit=(await groupsForRows(f.rows)).find(g=>g.at(-1).value.kind==='entry-edit');await rejected(await reseal(edit,rows=>{const d=rows.at(-1).value;d.request.changes={title:'SYNTHETIC title'};d.changeOrder=['title'];},{request:true}));
 const hidden=clone(group);hidden[0].value.after.indexedSearchVersion='local';await rejected(hidden,'BNS_HUMAN_CODEC_INVALID');
 const multi=await reseal(edit,rows=>{rows[0].parents.push('e'.repeat(64));});await rejected([...f.parentGroups.flat(),...multi],'BNS_HUMAN_GRAPH_PROFILE_UNSUPPORTED');
});
test('resealed unproved history timestamp is only structure evidence, never semantic authority',async()=>{
 const f=await fixture(),groups=await groupsForRows(f.rows),edit=groups.find(g=>g.at(-1).value.kind==='entry-edit'),altered=await reseal(edit,rows=>{rows.find(op=>op.value.entityType==='history').value.after.at='2026-10-11T00:00:00.000Z';});
 const handle=await keep([...f.parentGroups.flat(),...altered]);assert.equal(describe(handle).evidence,'PURE_HUMAN_GRAPH_STRUCTURE_ONLY');assert.deepEqual(handle,{});
});
test('accessors, non-enumerable data, symbols, sparse, cycles and invalid Unicode refuse without getter calls',async()=>{
 const f=await fixture();let calls=0;
 for(const change of [rows=>Object.defineProperty(rows[0],'trap',{enumerable:true,get(){calls++;return 1;}}),rows=>Object.defineProperty(rows[0],'hidden',{value:1}),rows=>{rows[0][Symbol('private')]=1;},rows=>{delete rows[0];},rows=>{rows[0].loop=rows;},rows=>{rows[0].value.after.thoughtText='\ud800';},rows=>{rows[0].value.after.thoughtText='\udc00';}]){const rows=clone(f.rows);change(rows);assert.throws(()=>actualPrepare(rows,options),{code:'BNS_HUMAN_GRAPH_SERIALIZED_REQUIRED'});}assert.equal(calls,0);
 const accessor={};Object.defineProperty(accessor,'datasetId',{enumerable:true,get(){calls++;return datasetId;}});assert.throws(()=>actualPrepare(f.rows,accessor),{code:'BNS_HUMAN_GRAPH_SERIALIZED_REQUIRED'});assert.throws(()=>actualPrepare(accessor),{code:'BNS_HUMAN_GRAPH_SERIALIZED_REQUIRED'});assert.equal(calls,0);
 assert.throws(()=>actualPrepare(f.rows,{datasetId,store:{}}),{code:'BNS_HUMAN_GRAPH_SERIALIZED_REQUIRED'});
 const source=canonical({datasetId,operations:f.rows});for(const surrogate of ['\ud800','\udc00'])assert.throws(()=>actualPrepare(source.replace('SYNTHETIC baseline',surrogate)),{code:'BNS_TEXT_ENCODING'});
});
test('first await is bound to owned snapshot and a concurrent prepare refuses without queue',async()=>{
 const f=await fixture(),input=clone(f.rows),original=crypto.subtle.digest.bind(crypto.subtle);let unblock,entered;const hold=new Promise(r=>unblock=r),gate=new Promise(r=>entered=r);let injected=false;
 crypto.subtle.digest=async(...args)=>{if(!injected){injected=true;entered();await hold;}return original(...args);};
 try{const pending=prepare(input,options);await gate;input[0].value.after.thoughtText='SYNTHETIC caller mutation';await assert.rejects(prepare(f.rows,options),{code:'BNS_HUMAN_GRAPH_QUALIFICATION_BUSY'});unblock();const handle=await pending;retained.push(handle);assert.equal(describe(handle).graphDigest,describe(await keep(f.rows)).graphDigest);}finally{unblock?.();crypto.subtle.digest=original;}
});
test('opaque exact brand release twice/clone/foreign refuses; original plans see no capability',async()=>{
 const f=await fixture(),handle=await prepare(f.rows,options);for(const fake of [{},clone(handle),{...handle},f.rows]){assert.throws(()=>describe(fake),{code:'BNS_HUMAN_GRAPH_QUALIFICATION_REQUIRED'});assert.throws(()=>release(fake),{code:'BNS_HUMAN_GRAPH_QUALIFICATION_REQUIRED'});}
 await assert.rejects(executeHumanPlan(handle),{code:'BNS_HUMAN_PLAN_REQUIRED'});await assert.rejects(prepareGroupCheckpointPlan({datasetId},f.rows),{code:'BNS_CONFLICT_REQUIRES_RESOLUTION'});
 release(handle);assert.throws(()=>describe(handle),{code:'BNS_HUMAN_GRAPH_QUALIFICATION_REQUIRED'});assert.throws(()=>release(handle),{code:'BNS_HUMAN_GRAPH_QUALIFICATION_REQUIRED'});
});
test('global ninth live handle evicts oldest across dataset labels and invalid validation frees busy slot',async()=>{
 const handles=[];for(let i=0;i<9;i++){const dataset='synthetic-global-'+i,f=await fixture({dataset,siblings:1});handles.push(await keep(f.rows,{datasetId:dataset}));}
 assert.throws(()=>describe(handles[0]),{code:'BNS_HUMAN_GRAPH_QUALIFICATION_REQUIRED'});assert.equal(describe(handles.at(-1)).datasetId,'synthetic-global-8');
 const f=await fixture(),invalid=clone(f.rows);invalid[0].value.after.thoughtText+='wrong';await rejected(invalid,'BNS_OPERATION_DIGEST');assert.equal(describe(await keep(f.rows)).evidence,'PURE_HUMAN_GRAPH_STRUCTURE_ONLY');
});
test('protocol count/byte and stricter logical workspace stop before hashing oversized raw input',async()=>{
 const f=await fixture();let calls=0;const original=crypto.subtle.digest.bind(crypto.subtle);crypto.subtle.digest=(...a)=>{calls++;return original(...a);};
 try{await rejected(Array.from({length:CORE_LIMITS.batch+1},()=>f.rows[0]),'BNS_HUMAN_GRAPH_LIMIT');const big=clone(f.rows);big[0].value.after.thoughtText='x'.repeat(CORE_LIMITS.batchBytes);await rejected(big,'BNS_HUMAN_GRAPH_LIMIT');assert.equal(calls,0);}finally{crypto.subtle.digest=original;}
 const f2=await fixture({padding:'汉'.repeat(20000)});await rejected(f2.rows,'BNS_HUMAN_GRAPH_LIMIT');
});
test('no storage/network/domain allocation entry is touched by preparation or description',async()=>{
 const f=await fixture(),originalFetch=globalThis.fetch,originalUUID=crypto.randomUUID,originalNow=Date.now;let effects=0;globalThis.fetch=()=>{effects++;throw Error('network');};crypto.randomUUID=()=>{effects++;throw Error('uuid');};Date.now=()=>{effects++;throw Error('clock');};
 for(const d of f.devices)for(const name of ['transaction','initialize'])d.s.repository[name]=()=>{effects++;throw Error('repository');};
 try{const handle=await keep(f.rows);describe(handle);assert.equal(effects,0);}finally{globalThis.fetch=originalFetch;crypto.randomUUID=originalUUID;Date.now=originalNow;}
});

test('escaped control/non-BMP data has original canonical byte count without normalization',async()=>{
 const f=await fixture({padding:'\u0000\b\t\n\f\r\"\\汉🧠'.repeat(30)}),summary=describe(await keep(f.rows));assert.equal(summary.operationBytes,f.rows.reduce((n,op)=>n+bytes(op).length,0));assert.equal(summary.graphDigest,describe(await keep(clone(f.rows).reverse())).graphDigest);
});
test('global depth/node/invalid number limits stop before the first hash; a next valid prepare works',async()=>{
 const f=await fixture(),original=crypto.subtle.digest.bind(crypto.subtle);let hashes=0;crypto.subtle.digest=(...a)=>{hashes++;return original(...a);};
 try{
  for(const value of [NaN,Infinity,-0,undefined,1n,()=>{}]){const rows=clone(f.rows);rows[0].extra=value;assert.throws(()=>actualPrepare(rows,options),{code:'BNS_HUMAN_GRAPH_SERIALIZED_REQUIRED'});}
  const rows=clone(f.rows);rows[0].extra=null;const source=canonical({datasetId,operations:rows});
  const deep=source.replace('"extra":null','"extra":'+'{"extra":'.repeat(33)+'null'+'}'.repeat(33));assert.throws(()=>actualPrepare(deep),{code:'BNS_VALUE_LIMIT'});
  const excessive=source.replace('"extra":null','"extra":['+'null,'.repeat(199999)+'null]');assert.throws(()=>actualPrepare(excessive),{code:'BNS_VALUE_LIMIT'});
  for(const token of ['-0','1e999'])assert.throws(()=>actualPrepare(source.replace('"extra":null','"extra":'+token)),{code:'BNS_VALUE_INVALID'});assert.equal(hashes,0);
 }finally{crypto.subtle.digest=original;}
 assert.equal(describe(await keep(f.rows)).operationCount,f.rows.length);
});
test('many original groups have an honest earlier workspace refusal without dropping shared branches',async()=>{
 const d=await device('count'),rows=[];
 for(let i=0;i<40;i++)await d.s.createEntry({actor:'user',body:'SYNTHETIC small '+i,type:'idea',formation:'explicit',evidence:[],operationId:crypto.randomUUID()});
 const originals=await groups(d.core);assert.equal(originals.flat().length,120);const first=originals[0][0].value.after.id;
 for(let i=0;i<2;i++)await d.s.editEntry({id:first,expectedRevision:i,changes:{body:'SYNTHETIC count edit '+i},operationId:crypto.randomUUID()});
 rows.push(...(await groups(d.core)).flat());d.s.repository.db.close();assert.equal(rows.length,128);assert.ok(rows.reduce((n,op)=>n+bytes(op).length,0)<CORE_LIMITS.batchBytes);
 let hashes=0;const original=crypto.subtle.digest.bind(crypto.subtle);crypto.subtle.digest=(...a)=>{hashes++;return original(...a);};
 try{await rejected(rows,'BNS_HUMAN_GRAPH_LIMIT');assert.equal(hashes,0);}finally{crypto.subtle.digest=original;}
});

test('aggregate retained charge evicts before eight large handles and failed hash keeps unrelated live proof',async()=>{
 const f=await fixture({padding:'汉'.repeat(3000)}),handles=[];for(let i=0;i<8;i++)handles.push(await keep(f.rows));
 let live=0;for(const handle of handles){try{describe(handle);live++;}catch(error){assert.equal(error.code,'BNS_HUMAN_GRAPH_QUALIFICATION_REQUIRED');}}
 assert.ok(live>0&&live<8,'raw/summary charge is global, not merely the eight-handle count');
 // Root-approved source-cost adaptation: preserve original3000 eviction prefix;
 // the unrelated failure probe must not itself select that proof for eviction.
 const last=handles.at(-1),small=await fixture(),bad=clone(small.rows);bad[0].value.after.thoughtText+='invalid';await rejected(bad,'BNS_OPERATION_DIGEST');assert.equal(describe(last).evidence,'PURE_HUMAN_GRAPH_STRUCTURE_ONLY');
});

// Install before the fresh module is evaluated; no captured builtin can evade
// counters. The action runs alone without assertion-library reflection inside
// the measured window. Source fixtures/serialization belong to the caller.
async function observeIntake(action){
 const counters={reflect:0,returnedRefs:0,keys:0,descriptors:0,prototype:0,parse:0,clone:0,encode:0,hash:0,frames:0,maxFrames:0};let active=false;const originals=[];
 const wrap=(owner,name,kind)=>{const original=owner[name];originals.push([owner,name,original]);owner[name]=function(...args){if(active)counters[kind]++;const result=original.apply(this,args);if(active&&name==='ownKeys')counters.returnedRefs+=result.length;if(active&&owner===Array&&name==='from')counters.maxFrames=Math.max(counters.maxFrames,result.length);return result;};};
 wrap(Reflect,'ownKeys','reflect');for(const name of ['keys','getOwnPropertyNames','getOwnPropertySymbols'])wrap(Object,name,'keys');wrap(Object,'getOwnPropertyDescriptor','descriptors');wrap(Object,'getPrototypeOf','prototype');wrap(JSON,'parse','parse');wrap(globalThis,'structuredClone','clone');wrap(TextEncoder.prototype,'encode','encode');wrap(crypto.subtle,'digest','hash');wrap(Array,'from','frames');
 try{const m=await import('../core/browser-native-sync/human-conflict-graph.js?intake-spies='+crypto.randomUUID());active=true;let error,result;try{result=await action(m,counters);}catch(e){error=e;}active=false;if(!error){try{m.describeHumanConflictGraphQualification(result);keepOwner(result,m.releaseHumanConflictGraphQualification);}catch{}}return {error,result,counters};}finally{active=false;for(const [owner,name,original]of originals)owner[name]=original;}
}
function zeroIntake(c){for(const key of ['reflect','returnedRefs','keys','descriptors','prototype','parse','clone','encode','hash','frames'])assert.equal(c[key],0,key);}
test('actual ordinary1M/4097 hidden-key counterexamples now refuse before any owned reflected return',async()=>{
 const operation={};for(let i=0;i<1024*1024+1;i++)Object.defineProperty(operation,'hidden'+i,{value:null});
 const opts={datasetId};for(let i=0;i<4096;i++)Object.defineProperty(opts,'hidden'+i,{value:null});
 for(const [input,args]of [[operation,[operation,{}]],[opts,[]]]){
  const observed=await observeIntake(m=>{let error;try{m.prepareHumanConflictGraphQualification(args,opts);}catch(e){error=e;}if(error?.code!=='BNS_HUMAN_GRAPH_SERIALIZED_REQUIRED')throw error||Error('missing refusal');return input;});
  assert.equal(observed.error,undefined);zeroIntake(observed.counters);assert.ok(8*observed.counters.returnedRefs<=8*1024*1024);assert.ok(8*observed.counters.returnedRefs<=16*1024);
 }
});
test('direct one-argument objects/Proxies/String wrappers and any extra argument cannot inspect or coerce',async()=>{
 let effects=0;const proxy=new Proxy({}, {get(){effects++;throw Error('get');},ownKeys(){effects++;throw Error('keys');},getPrototypeOf(){effects++;throw Error('prototype');},getOwnPropertyDescriptor(){effects++;throw Error('descriptor');}}),wrapper=new String('not an envelope');wrapper.toString=()=>{effects++;throw Error('coerce');};
 for(const args of [[],[{}],[proxy],[wrapper],[()=>{effects++;}],[new Uint8Array(4)],['{}',undefined],['{}',{}]]){
  const observed=await observeIntake(m=>m.prepareHumanConflictGraphQualification(...args));assert.equal(observed.error?.code,'BNS_HUMAN_GRAPH_SERIALIZED_REQUIRED');zeroIntake(observed.counters);
 }assert.equal(effects,0);
});
test('malformed canonical literals, duplicate keys and encoding refuse with fixed scanner before private parse',async()=>{
 const f=await fixture(),source=canonical({datasetId,operations:f.rows});
 const invalid=[[' '+source,'BNS_HUMAN_GRAPH_SERIALIZED_INVALID'],['\ufeff'+source,'BNS_HUMAN_GRAPH_SERIALIZED_INVALID'],[source+'null','BNS_HUMAN_GRAPH_SERIALIZED_INVALID'],[source.slice(0,-1),'BNS_HUMAN_GRAPH_SERIALIZED_INVALID'],[source.replace('{"datasetId":','{"datasetId":"'+datasetId+'","datasetId":'),'BNS_HUMAN_GRAPH_SERIALIZED_INVALID'],[source.slice(0,-1)+',"zzz":null}','BNS_HUMAN_GRAPH_SERIALIZED_INVALID'],[source.replace('SYNTHETIC baseline','\\u0053YNTHETIC baseline'),'BNS_HUMAN_GRAPH_SERIALIZED_INVALID'],[source.replace('SYNTHETIC baseline','\\ud800'),'BNS_TEXT_ENCODING'],[source.replace('SYNTHETIC baseline','\\ud83e\\udde0'),'BNS_HUMAN_GRAPH_SERIALIZED_INVALID']];
 for(const [text,code]of invalid){const observed=await observeIntake(m=>m.prepareHumanConflictGraphQualification(text));assert.equal(observed.error?.code,code);for(const key of ['reflect','returnedRefs','keys','descriptors','prototype','parse','clone','encode','hash'])assert.equal(observed.counters[key],0,key);assert.equal(observed.counters.frames,1);assert.equal(observed.counters.maxFrames,33);}
});
test('first source/key/depth/node/operation excess allocates no private tree or reflected key vector',async()=>{
 const f=await fixture(),rows=clone(f.rows);rows[0].extra=null;const source=canonical({datasetId,operations:rows}),sourceBase=canonical({datasetId,operations:f.rows});
 const cases=[['x'.repeat(CORE_LIMITS.batchBytes+1025),'BNS_HUMAN_GRAPH_LIMIT'],[source.replace('"extra":null','"'+'k'.repeat(513)+'":null'),'BNS_HUMAN_GRAPH_LIMIT'],[source.replace('"extra":null','"extra":'+'{"extra":'.repeat(33)+'null'+'}'.repeat(33)),'BNS_VALUE_LIMIT'],[source.replace('"extra":null','"extra":['+'null,'.repeat(199999)+'null]'),'BNS_VALUE_LIMIT'],[canonical({datasetId,operations:Array.from({length:129},()=>f.rows[0])}),'BNS_HUMAN_GRAPH_LIMIT']];
 for(const [text,code]of cases){const observed=await observeIntake(m=>m.prepareHumanConflictGraphQualification(text));assert.equal(observed.error?.code,code);for(const key of ['reflect','returnedRefs','parse','clone','encode','hash'])assert.equal(observed.counters[key],0,key);assert.ok(observed.counters.maxFrames<=33);}
 const padded=await fixture({padding:'汉'.repeat(20000)}),large=canonical({datasetId,operations:padded.rows}),observed=await observeIntake(m=>m.prepareHumanConflictGraphQualification(large));assert.equal(observed.error?.code,'BNS_HUMAN_GRAPH_LIMIT');assert.equal(observed.counters.parse,0);assert.equal(observed.counters.reflect,0);assert.equal(observed.counters.clone,0);assert.equal(observed.counters.hash,0);assert.ok(large.length<CORE_LIMITS.batchBytes);
 assert.equal(describe(await keep(f.rows)).operationCount,f.rows.length);assert.ok(sourceBase.length>0);
});
test('canonical numeric forms and integer-index key order agree with original canonical binding',async()=>{
 const f=await fixture();
 for(const value of [0,1,-1,1.25,1e21,1e-7,1e-6,Number.MIN_VALUE,Number.MAX_VALUE,{'10':1,'2':2,'0':3,'01':4,'4294967294':5,'4294967295':6,z:'汉🧠'}]){
  const rows=clone(f.rows);rows[0].extra=value;const text=canonical({datasetId,operations:rows}),observed=await observeIntake(m=>m.prepareHumanConflictGraphQualification(text));assert.equal(observed.error?.code,'BNS_OPERATION_INVALID','canonical lexer reached actual original validator');assert.equal(observed.counters.parse,1);assert.equal(observed.counters.hash,0);assert.ok(observed.counters.returnedRefs>0);
 }
 const rows=clone(f.rows);rows[0].extra=null;const source=canonical({datasetId,operations:rows});
 for(const token of ['00','01','1.0','1e0','1E+21','+1','NaN','Infinity','undefined']){const observed=await observeIntake(m=>m.prepareHumanConflictGraphQualification(source.replace('"extra":null','"extra":'+token)));assert.equal(observed.error?.code,'BNS_HUMAN_GRAPH_SERIALIZED_INVALID');assert.equal(observed.counters.parse,0);assert.equal(observed.counters.returnedRefs,0);}
 for(const token of ['{"10":1,"2":2}','{"a":1,"0":2}','{"a":1,"a":2}']){const observed=await observeIntake(m=>m.prepareHumanConflictGraphQualification(source.replace('"extra":null','"extra":'+token)));assert.equal(observed.error?.code,'BNS_HUMAN_GRAPH_SERIALIZED_INVALID');assert.equal(observed.counters.parse,0);assert.equal(observed.counters.returnedRefs,0);}
});
test('private array index-name return vectors are source charged before reserved parse',async()=>{
 const f=await fixture(),rows=clone(f.rows);rows[0].extra=Array.from({length:1000},(_,i)=>i);const text=canonical({datasetId,operations:rows});
 const observed=await observeIntake(m=>m.prepareHumanConflictGraphQualification(text));assert.equal(observed.error?.code,'BNS_OPERATION_INVALID');assert.equal(observed.counters.parse,1);assert.ok(observed.counters.returnedRefs>=1001,'actual private array reflected names include all indexes and length');assert.equal(observed.counters.hash,0);
});
test('near-workspace bad hash may revoke only preselected old proofs and frees all pending state',async()=>{
 const f=await fixture({padding:'汉'.repeat(3000)}),old=await keep(f.rows),bad=clone(f.rows);bad[0].value.after.thoughtText+='invalid';await rejected(bad,'BNS_OPERATION_DIGEST');assert.throws(()=>describe(old),{code:'BNS_HUMAN_GRAPH_QUALIFICATION_REQUIRED'});
 const small=await fixture();assert.equal(describe(await keep(small.rows)).evidence,'PURE_HUMAN_GRAPH_STRUCTURE_ONLY');
});

test('shared work preserves synchronous graph gate and BUSY-before-source-limit without hashing',async()=>{
 const f=await fixture(),source=canonical({datasetId,operations:f.rows});
 const work=numeric(budget.beginHumanQualificationWork('projection',128*1024));
 let hashes=0;const original=crypto.subtle.digest.bind(crypto.subtle);crypto.subtle.digest=(...args)=>{hashes++;return original(...args);};
 try{
  assert.throws(()=>actualPrepare({}),{code:'BNS_HUMAN_GRAPH_SERIALIZED_REQUIRED'});
  assert.throws(()=>actualPrepare(source,undefined),{code:'BNS_HUMAN_GRAPH_SERIALIZED_REQUIRED'});
  assert.throws(()=>actualPrepare(source),{code:'BNS_HUMAN_GRAPH_QUALIFICATION_BUSY'});
  assert.throws(()=>actualPrepare('x'.repeat(CORE_LIMITS.batchBytes+1025)),{code:'BNS_HUMAN_GRAPH_QUALIFICATION_BUSY'});
  assert.equal(hashes,0);
 }finally{crypto.subtle.digest=original;budget.releaseHumanQualificationLease(work);}
 assert.equal(describe(await keep(f.rows)).operationCount,f.rows.length);
});

test('full projection numeric occupancy refuses graph without releasing another owner ticket',async()=>{
 const f=await fixture(),work=numeric(budget.beginHumanQualificationWork('projection',4*1024*1024));
 const occupied=numeric(budget.retainHumanQualificationLease(work,4*1024*1024));budget.releaseHumanQualificationLease(work);
 await assert.rejects(prepare(f.rows),{code:'BNS_HUMAN_GRAPH_LIMIT'});
 assert.throws(()=>budget.beginHumanQualificationWork('projection',8*1024*1024),{code:'BNS_HUMAN_QUALIFICATION_LIMIT'});
 budget.releaseHumanQualificationLease(occupied);
 const full=numeric(budget.beginHumanQualificationWork('graph',8*1024*1024));budget.releaseHumanQualificationLease(full);
 assert.equal(describe(await keep(f.rows)).operationCount,f.rows.length);
});

test('nonce graph owners share eight retained slots but cannot evict each others live handles',async()=>{
 const a=await import('../core/browser-native-sync/human-conflict-graph.js?owner-a='+crypto.randomUUID());
 const b=await import('../core/browser-native-sync/human-conflict-graph.js?owner-b='+crypto.randomUUID());
 // Use the original producer's minimal creation group to isolate slot pressure
 // from the separately covered earlier byte-pressure eviction of larger graphs.
 const f=await fixture({siblings:1}),rows=f.parentGroups[0],source=canonical({datasetId,operations:rows}),handles=[];
 for(let i=0;i<8;i++)handles.push(keepOwner(await a.prepareHumanConflictGraphQualification(source),a.releaseHumanConflictGraphQualification));
 await assert.rejects(b.prepareHumanConflictGraphQualification(source),{code:'BNS_HUMAN_GRAPH_LIMIT'});
 for(const handle of handles)assert.equal(a.describeHumanConflictGraphQualification(handle).operationCount,rows.length);
 a.releaseHumanConflictGraphQualification(handles[0]);
 const first=keepOwner(await b.prepareHumanConflictGraphQualification(source),b.releaseHumanConflictGraphQualification);
 const second=keepOwner(await b.prepareHumanConflictGraphQualification(source),b.releaseHumanConflictGraphQualification);
 assert.throws(()=>b.describeHumanConflictGraphQualification(first),{code:'BNS_HUMAN_GRAPH_QUALIFICATION_REQUIRED'});
 assert.equal(b.describeHumanConflictGraphQualification(second).operationCount,rows.length);
 for(const handle of handles.slice(1))assert.equal(a.describeHumanConflictGraphQualification(handle).operationCount,rows.length);
});

test('pending graph hash holds global work until its returned preparation settles',async()=>{
 const f=await fixture(),source=canonical({datasetId,operations:f.rows});let unblock,entered;
 const hold=new Promise(resolve=>unblock=resolve),gate=new Promise(resolve=>entered=resolve),original=crypto.subtle.digest.bind(crypto.subtle);let once=false;
 crypto.subtle.digest=async(...args)=>{if(!once){once=true;entered();await hold;}return original(...args);};
 try{
  const pending=actualPrepare(source);await gate;
  assert.throws(()=>budget.beginHumanQualificationWork('projection',256),{code:'BNS_HUMAN_QUALIFICATION_BUSY'});
  assert.throws(()=>actualPrepare(source),{code:'BNS_HUMAN_GRAPH_QUALIFICATION_BUSY'});
  unblock();const handle=await pending;keepOwner(handle,release);
  assert.equal(describe(handle).operationCount,f.rows.length);
  const work=numeric(budget.beginHumanQualificationWork('projection',256));budget.releaseHumanQualificationLease(work);
 }finally{unblock?.();crypto.subtle.digest=original;}
});

test('post-retain partial publication and cleanup faults revoke graph and release both tickets',async()=>{
 const f=await fixture(),source=canonical({datasetId,operations:f.rows});
 for(const [cleanupFault,nullFailure] of [[false,false],[true,false],[false,true]]){
  const originalSet=Map.prototype.set,originalDelete=Map.prototype.delete;let attempted=null,published=false,cleanupFailed=false,error;
  Map.prototype.set=function(key,value){const result=originalSet.call(this,key,value);if(!published&&value&&typeof value==='object'&&Object.hasOwn(value,'operations')&&Object.hasOwn(value,'summary')&&Object.hasOwn(value,'ticket')){published=true;attempted=key;if(nullFailure)throw null;throw Error('synthetic graph publication failure');}return result;};
  Map.prototype.delete=function(key){if(cleanupFault&&attempted===key&&!cleanupFailed){cleanupFailed=true;throw Error('synthetic graph cleanup failure');}return originalDelete.call(this,key);};
  try{await actualPrepare(source);}catch(caught){error=caught;}finally{Map.prototype.set=originalSet;Map.prototype.delete=originalDelete;}
  assert.equal(published,true);assert.ok(attempted);assert.equal(cleanupFailed,cleanupFault);
  if(cleanupFault){assert.equal(error instanceof AggregateError,true);assert.equal(error.message,'BNS_HUMAN_GRAPH_CLEANUP_FAILED');assert.deepEqual(error.errors.map(item=>item.message),['synthetic graph publication failure','synthetic graph cleanup failure']);}
  else if(nullFailure)assert.equal(error,null);
  else assert.equal(error?.message,'synthetic graph publication failure');
  assert.throws(()=>describe(attempted),{code:'BNS_HUMAN_GRAPH_QUALIFICATION_REQUIRED'});
  assert.throws(()=>release(attempted),{code:'BNS_HUMAN_GRAPH_QUALIFICATION_REQUIRED'});
  const full=numeric(budget.beginHumanQualificationWork('graph',8*1024*1024));budget.releaseHumanQualificationLease(full);
 }
 assert.equal(describe(await keep(f.rows)).operationCount,f.rows.length);
});

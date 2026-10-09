// Exact private source execution in a separate lexical fixture. Synthetic owned
// records exercise computation/budget only; no DB cut or commit is authenticated.
import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {clone,equal,fail,bytes,digest} from '../core/browser-native-sync/value.js';
import {CORE_LIMITS,acceptSequence,BrowserNativeSyncCore,validateHumanCommitGroup,sealOperation} from '../core/browser-native-sync/core.js';
import {protocolKey,protocolPhysicalId} from '../core/browser-native-sync/physical-key.js';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {local} from './harness/thought-m1.mjs';import {LibraryDocumentsStore} from '../core/library-documents-store.js';import {HumanLibrarySyncJournal} from '../core/browser-native-sync/human-library-journal.js';
globalThis.IDBKeyRange=IDBKeyRange;
const source=await readFile(new URL('../core/browser-native-sync/human-library-plan.js',import.meta.url),'utf8');
const coreSource=await readFile(new URL('../core/browser-native-sync/core.js',import.meta.url),'utf8');
// Frozen original oracle from 20ec13664e9e9d9a29791054f02d39fd13834343 core.js.
// Exact single-line UTF-8 SHA256 (without newline): 28307704a3bded8d0ba52052e2aea11d516099831adc178b39319890e7d2a60a
const originalIdIn=" async idIn(t,kind,...ids){return this.prefix+'generation:'+await this.bind(t)+':'+kind+':'+key(ids);}";
const start=source.indexOf('const branchWitnesses='),end=source.indexOf('function branchReady(',start),pureStart=source.indexOf('// BEGIN private retention expected effects.'),pureEnd=source.indexOf('// END private retention expected effects.',pureStart);
assert.ok(start>0&&end>start&&pureStart>end&&pureEnd>pureStart);
const finish=source.match(/^export function finishHumanBranchRetention\(.*$/m)[0].replace('export ','');
const retryStart=source.indexOf('export async function prepareHumanBranchRetentionRetry('),retryEnd=source.indexOf('\nexport function claimHumanBranchRetention(',retryStart);
const retry=source.slice(retryStart,retryEnd).replace('export ','');
const freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){for(const value of Object.values(v))freeze(value);Object.freeze(v);}return v;};
function fixture(model,hash=digest){
 const create=Function('fail','CORE_LIMITS','acceptSequence','equal','digest','protocolPhysicalId',source.slice(start,end)+`\nconst retentionKind=p=>p&&(p.kind==='retention'||p.kind==='duplicate');\n${finish}\n${retry}\n`+source.slice(pureStart,pureEnd)+`
 const store={},core={},cap=Object.freeze({}),p={...arguments[6],core,store,claimed:true,claim:{}};p.size=branchRawSize(p.raw);
 const state=branchState(store);state.handles.push(cap);state.bytes=p.size;state.busy=true;branchWitnesses.set(cap,p);const initial=p.size;
 return {derive:()=>deriveRetentionExpectedEffects(core,cap),finish:()=>finishHumanBranchRetention(core,cap,p.claim),retry:()=>prepareHumanBranchRetentionRetry(store,core,[]),state:()=>({bytes:state.bytes,busy:state.busy,cap:branchWitnesses.has(cap),size:p.size,phase:state.effectReservation?.phase??null,retained:p.effectPlan?.retainedCharge??null}),pad(n){state.candidateBytes=n;},forget:()=>branchForget(state,cap),rawSize:v=>branchRawSize(v),initial};`);
 return create(fail,CORE_LIMITS,acceptSequence,equal,hash,protocolPhysicalId,model);
}
let tick=0;const store=new LibraryDocumentsStore(local(),{indexedDB:new IDBFactory(),name:'synthetic-effects-groups',clock:()=>new Date(Date.UTC(2026,9,9)+tick++).toISOString()});
await store.consent(true);await store.finishFoundation();const core=new BrowserNativeSyncCore(store.repository,{datasetId:'synthetic-effects',deviceId:'synthetic-remote'});store.humanLibraryJournal=new HumanLibrarySyncJournal(core);
const entry=await store.createEntry({actor:'user',body:'SYNTHETIC baseline',type:'idea',formation:'explicit',evidence:[],operationId:crypto.randomUUID()});await store.editEntry({id:entry.id,expectedRevision:0,changes:{body:'SYNTHETIC fresh text 汉字'},operationId:crypto.randomUUID()});
const operations=[];for await(const row of core.rows('revision'))operations.push(row.operation);
const descriptor=operations.filter(op=>op.type==='humanLibraryCommit'&&op.value.kind==='entry-edit').at(-1);
const admitted=await validateHumanCommitGroup([...descriptor.value.members.map(ref=>operations.find(op=>op.revisionId===ref.revisionId)),descriptor],core.datasetId);await store.repository.close();
function model(group=admitted,{kind='retention',frontier=null,generation=null}={}){
 const g=freeze(clone(group)),records=[['generation',generation],['frontier',g.descriptor.deviceId,frontier],['device',g.descriptor.deviceId,null]].map(parts=>[JSON.stringify(parts.slice(0,-1)),parts.at(-1)]),expected=[];
 for(const op of g.operations){for(const [type,args]of [['receipt',[op.operationId]],['sequence',[op.deviceId,String(op.sequence).padStart(16,'0')]],['revision',[op.revisionId]],['entityRevision',[op.type,op.entityId,op.revisionId]],['head',[op.type,op.entityId]],['quarantine',[op.operationId]],['pending',[op.operationId]],['entityPending',[op.type,op.entityId,op.operationId]]])records.push([JSON.stringify([type,...args]),null]);expected.push({type:op.type,entityId:op.entityId,revisions:[op.revisionId]});}
 const base={namespace:'initial',generation:0},semantic={entry:base,records:[],history:[],parentPhysicalHistory:[],read:{row:{synthetic:'Entry'},history:[],placementRows:[],provenance:0,dependencies:0,epoch:0},receipt:null,parentReceipt:{synthetic:'parent'},currentHistory:[]};
 return {kind,protocol:g,binding:{datasetId:g.descriptor.datasetId,deviceId:'synthetic-local'},raw:freeze({...(kind==='retention'?{semantic}:{base}),protocol:{records,expected}})};
}
function edited(m,edit){const next=clone(m);edit(next);return {...next,raw:freeze(next.raw),protocol:freeze(next.protocol)};}

const refused={code:'BNS_HUMAN_EFFECT_CUT_REQUIRED'};
test('fresh inventory predicts all complete payloads and original digest, borrowing operation/head vectors',async()=>{
 const m=model(),f=fixture(m),plan=await f.derive();assert.equal(plan.rows.length,5*admitted.operations.length+2);assert.equal(plan.writes,7*admitted.operations.length);assert.equal(new Set(plan.rows.map(row=>row.id)).size,plan.rows.length);
 for(const row of plan.rows){assert.equal(row.digest,await digest(row.row));assert.equal(row.row.id,row.id);assert.equal(Object.isFrozen(row.row),true);if(row.kind==='frontier'){assert.equal(Object.isFrozen(row.row.ranges),true);for(const pair of row.row.ranges)assert.equal(Object.isFrozen(pair),true);}}
 const expected=[];for(const op of [...m.protocol.members,m.protocol.descriptor]){const head=m.raw.protocol.expected.find(h=>h.type===op.type&&h.entityId===op.entityId);for(const [kind,parts,payload]of [['revision',[op.revisionId],{operation:op,redacted:false}],['entityRevision',[op.type,op.entityId,op.revisionId],{revisionId:op.revisionId}],['head',[op.type,op.entityId],{type:op.type,entityId:op.entityId,revisions:head.revisions,purged:false,fence:null}],['receipt',[op.operationId],{digest:op.revisionId,deviceId:op.deviceId,sequence:op.sequence}],['sequence',[op.deviceId,String(op.sequence).padStart(16,'0')],{operationId:op.operationId,digest:op.revisionId}]]){const id=protocolPhysicalId('bns:v1:'+op.datasetId+':','initial',kind,parts);expected.push({kind,row:{...payload,id}});}}
 let frontier=null;for(const op of [...m.protocol.members,m.protocol.descriptor])frontier=acceptSequence(frontier,op.sequence);expected.push({kind:'frontier',row:{...frontier,deviceId:m.protocol.descriptor.deviceId,id:protocolPhysicalId('bns:v1:'+m.protocol.descriptor.datasetId+':','initial','frontier',[m.protocol.descriptor.deviceId])}},{kind:'generation',row:{value:m.protocol.operations.length,id:protocolPhysicalId('bns:v1:'+m.protocol.descriptor.datasetId+':','initial','generation',[])}});assert.deepEqual(plan.rows.map(({kind,row})=>({kind,row})),expected);
 for(const op of m.protocol.operations){const revision=plan.rows.find(row=>row.kind==='revision'&&row.row.operation.revisionId===op.revisionId);assert.equal(revision.row.operation,op);const head=plan.rows.find(row=>row.kind==='head'&&row.row.entityId===op.entityId&&row.row.type===op.type);assert.equal(head.row.revisions,m.raw.protocol.expected.find(h=>h.type===op.type&&h.entityId===op.entityId).revisions);assert.equal(head.row.purged,false);assert.equal(head.row.fence,null);}
 assert.equal(plan.unchanged.find(fact=>fact.selector==='base-without-generation').excludeGeneration,true);assert.equal(plan.rows.find(row=>row.kind==='generation').row.value,admitted.operations.length);assert.ok(plan.absent.some(fact=>fact.selector===JSON.stringify(['device',admitted.descriptor.deviceId])));assert.equal(f.state().bytes,f.initial+plan.retainedCharge);f.finish();assert.equal(f.state().bytes,0);
});
async function duplicateModel(){const m=model(),f=fixture(m),plan=await f.derive();const rows=new Map(plan.rows.map(row=>[row.id,row.row]));f.finish();return edited(model(admitted,{kind:'duplicate'}),m=>{for(const record of m.raw.protocol.records){const [kind,...parts]=JSON.parse(record[0]),id=protocolPhysicalId('bns:v1:'+admitted.descriptor.datasetId+':','initial',kind,parts);if(rows.has(id))record[1]=clone(rows.get(id));}});}
test('complete duplicate preserves full existing rows/nulls and zero writes without fresh-only semantic profile',async()=>{
 let m=await duplicateModel();m=edited(m,m=>{for(const record of m.raw.protocol.records)if(['head','generation','frontier','device'].includes(JSON.parse(record[0])[0]))record[1]=null;});const f=fixture(m),plan=await f.derive();assert.equal(plan.writes,0);assert.equal(plan.mode,'duplicate');for(const row of plan.rows)if(['head','generation','frontier'].includes(row.kind))assert.equal(row.row,null);f.finish();assert.equal(f.state().bytes,0);
});
test('complete duplicate retains larger nonpurged heads without importing the fresh two-head gate',async()=>{
 const m=edited(await duplicateModel(),m=>{for(const expected of m.raw.protocol.expected){const revisions=[expected.revisions[0],'1'.repeat(64),'2'.repeat(64)];expected.revisions=revisions;const record=m.raw.protocol.records.find(([selector])=>selector===JSON.stringify(['head',expected.type,expected.entityId]));record[1].revisions=[...revisions];}}),before=clone(m.raw),f=fixture(m),plan=await f.derive();
 assert.equal(plan.mode,'duplicate');assert.equal(plan.writes,0);for(const row of plan.rows.filter(row=>row.kind==='head')){const original=m.raw.protocol.records.find(([,value])=>value?.id===row.id)[1];assert.equal(row.row,original);assert.equal(row.row.revisions.length,3);}assert.deepEqual(m.raw,before);f.finish();assert.equal(f.state().bytes,0);
 const fresh=fixture(edited(model(),m=>m.raw.protocol.expected[0].revisions.push('1'.repeat(64),'2'.repeat(64))));await assert.rejects(fresh.derive(),refused);assert.equal(fresh.state().bytes,fresh.initial);fresh.finish();
});
test('partial presence, missing/duplicate selectors and wrong private kind refuse and refund',async()=>{
 const duplicate=await duplicateModel();for(const change of [m=>m.raw.protocol.records.pop(),m=>m.raw.protocol.records.push(m.raw.protocol.records[0]),m=>m.raw.protocol.records.find(row=>JSON.parse(row[0])[0]==='receipt')[1]=null,m=>m.kind='retention']){const m=edited(duplicate,change);const f=fixture(m);await assert.rejects(f.derive(),refused);assert.equal(f.state().bytes,f.initial);assert.equal(f.state().phase,null);f.finish();assert.equal(f.state().bytes,0);}
});
test('recorded null differs from missing generation/frontier/device and fresh overflow refuses',async()=>{
 for(const kind of ['generation','frontier','device']){const f=fixture(edited(model(),m=>m.raw.protocol.records=m.raw.protocol.records.filter(row=>JSON.parse(row[0])[0]!==kind)));await assert.rejects(f.derive(),refused);assert.equal(f.state().bytes,f.initial);f.finish();}
 const f=fixture(model(admitted,{generation:{value:Number.MAX_SAFE_INTEGER}}));await assert.rejects(f.derive(),refused);assert.equal(f.state().bytes,f.initial);f.finish();
});
test('input reorder retains descriptor order; missing head and mismatched member references refuse',async()=>{
 const original=fixture(model()),a=await original.derive();const reordered=fixture(edited(model(),m=>m.protocol.operations.reverse())),b=await reordered.derive();assert.deepEqual(b.rows.map(row=>row.digest),a.rows.map(row=>row.digest));original.finish();reordered.finish();
 for(const change of [m=>m.raw.protocol.expected.pop(),m=>m.protocol.members.reverse()]){const f=fixture(edited(model(),change));await assert.rejects(f.derive(),refused);assert.equal(f.state().bytes,f.initial);f.finish();}
});
test('sparse frontier folding matches original acceptSequence exactly',async()=>{
 const frontier={frontier:0,ranges:[[20,21],[30,31]]},m=model(admitted,{frontier}),f=fixture(m),plan=await f.derive();let expected=frontier;for(const op of [...admitted.members,admitted.descriptor])expected=acceptSequence(expected,op.sequence);const actual=plan.rows.find(row=>row.kind==='frontier').row;assert.equal(actual.frontier,expected.frontier);assert.deepEqual(actual.ranges,expected.ranges);f.finish();
});
test('4096-range final frontier remains charged after scratch release and final refund is complete',async()=>{
 const ranges=Array.from({length:4096},(_,i)=>[1000+2*i,1000+2*i]),f=fixture(model(admitted,{frontier:{frontier:100,ranges}})),plan=await f.derive();assert.equal(plan.rows.find(row=>row.kind==='frontier').row.ranges.length,4096);assert.ok(plan.retainedCharge>=128*(4096+admitted.operations.length)+256);assert.equal(f.state().bytes,f.initial+plan.retainedCharge);f.finish();assert.equal(f.state().bytes,0);
});
test('first scan excess and full reservation excess refuse before hash and refund without evicting owner',async()=>{
 for(const padding of [8*1024*1024,8*1024*1024-20000]){let hashes=0;const f=fixture(model(),async row=>{hashes++;return digest(row);});f.pad(padding);await assert.rejects(f.derive(),{code:'BNS_HUMAN_GRAPH_LIMIT'});assert.equal(hashes,0);assert.equal(f.state().bytes,f.initial);assert.equal(f.state().cap,true);f.finish();assert.equal(f.state().bytes,0);}
});
test('digest rejection restores charge and allows the same claimed calculation to retry',async()=>{
 let broken=true;const f=fixture(model(),async row=>{if(broken)throw Error('synthetic digest failure');return digest(row);});await assert.rejects(f.derive(),/synthetic digest failure/);assert.equal(f.state().bytes,f.initial);broken=false;await f.derive();f.finish();assert.equal(f.state().bytes,0);
});
test('public finish during held digest escrows all raw+work until actual inner await unwinds',async()=>{
 let entered,release;const ready=new Promise(r=>entered=r),hold=new Promise(r=>release=r);let first=true;const f=fixture(model(),async row=>{if(first){first=false;entered();await hold;}return digest(row);}),pending=f.derive();await ready;const charged=f.state().bytes;assert.ok(charged>f.initial);await assert.rejects(f.derive(),{code:'BNS_HUMAN_RETENTION_REQUIRED'});assert.equal(f.state().bytes,charged);f.finish();assert.equal(f.state().bytes,charged);assert.equal(f.state().busy,true);assert.equal(f.state().phase,'revoked');await assert.rejects(f.retry(),{code:'BNS_HUMAN_BRANCH_BUSY'});release();await assert.rejects(pending,{code:'BNS_HUMAN_RETENTION_REQUIRED'});assert.equal(f.state().bytes,0);assert.equal(f.state().busy,false);assert.equal(f.state().phase,null);
});
test('default incremental meter preserves mutable semantics and only fixed preparation invokes derive',()=>{
 const f=fixture(model());const value={a:[null,true,false,1,'汉字\n'],z:{x:'a'}};assert.equal(f.rawSize(value),bytes(value).length);let calls=0;const accessor={get value(){calls++;return 'original mutable getter';}};assert.equal(f.rawSize(accessor),bytes({value:'original mutable getter'}).length);assert.equal(calls,1);const deleting={get first(){delete this.second;return 1;},second:2};assert.throws(()=>f.rawSize(deleting),{code:'BNS_VALUE_INVALID'});assert.equal((source.match(/deriveRetentionExpectedEffects\(/g)||[]).length,2);const preparation=source.slice(source.indexOf('export async function prepareHumanRetentionNativeEffects('));assert.ok(preparation.indexOf('requireHumanRetentionEffectPreparation(core,retention,p.group)')<preparation.indexOf('await deriveRetentionExpectedEffects(core,retention)'));assert.ok(preparation.includes('await deriveRetentionExpectedEffects(core,retention)'));f.finish();
});
test('pure encoding and actual idIn preserve exact original coercion/error/order before and after bind',async()=>{
 assert.equal(protocolKey(['a:b','汉字']),['a:b','汉字'].map(encodeURIComponent).join(':'));
 const Original=Function('key',`return class{${originalIdIn}}`)(parts=>parts.map(encodeURIComponent).join(':'));
 async function run(Ctor,mode){const calls=[],receiver=new Ctor({},{datasetId:'synthetic-key',deviceId:'synthetic-id'});let prefix=mode;Object.defineProperty(receiver,'prefix',{configurable:true,get(){calls.push('getter');if(mode==='getter-error')throw Error('prefix getter');return prefix;}});receiver.bind=async()=>{calls.push('bind');prefix='changed';await Promise.resolve();return { [Symbol.toPrimitive](hint){calls.push('namespace:'+hint);return 'initial';}};};if(mode==='object'||mode==='primitive-error'||mode==='symbol')prefix={[Symbol.toPrimitive](hint){calls.push('prefix:'+hint);if(mode==='primitive-error')throw Error('prefix primitive');return mode==='symbol'?Symbol('bad'):'captured:';}};try{return {value:await receiver.idIn({},'receipt','a:b'),calls};}catch(error){return {error:error.name+':'+error.message,calls};}}
 for(const mode of ['string:',null,undefined,4,'object','primitive-error','symbol','getter-error'])assert.deepEqual(await run(BrowserNativeSyncCore,mode),await run(Original,mode));
});
async function expandedGroup(total){
 const members=[];const template=admitted.members.find(op=>op.value.entityType==='history');
 for(let i=0;i<total-1;i++){
  const input=clone(i===0?admitted.members.find(op=>op.value.entityType==='entry'):template);delete input.revisionId;input.sequence=i+1;input.operationId='synthetic-expanded-operation-'+i;
  if(i>0){const id='synthetic-expanded-history-'+i;input.value.after.id=id;if(input.value.before)input.value.before.id=id;input.entityId='history:'+id;input.value.id=input.entityId;}
  members.push(await sealOperation(input));
 }
 const input=clone(admitted.descriptor);delete input.revisionId;input.sequence=total;input.operationId='synthetic-expanded-descriptor';input.value.members=members.map(op=>({type:op.type,entityId:op.entityId,revisionId:op.revisionId,operationId:op.operationId}));const descriptor=await sealOperation(input);
 return validateHumanCommitGroup([...members,descriptor],descriptor.datasetId);
}
test('128-operation admitted group computes exactly 642 rows; 129 refuses before hash',async()=>{
 const group=await expandedGroup(128),f=fixture(model(group)),plan=await f.derive();assert.equal(plan.rows.length,642);assert.equal(plan.writes,896);f.finish();assert.equal(f.state().bytes,0);
 let hashes=0;const overflow=edited(model(group),m=>m.protocol.operations.push(m.protocol.operations[0])),bad=fixture(overflow,async row=>{hashes++;return digest(row);});await assert.rejects(bad.derive(),refused);assert.equal(hashes,0);assert.equal(bad.state().bytes,bad.initial);bad.finish();
});

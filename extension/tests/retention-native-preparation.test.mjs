// Source-owned accounting contracts; synthetic lexical state is not a native
// transaction or a production capability. Real native evidence is separate.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fail} from '../core/browser-native-sync/value.js';
import {ArchiveRepository,requireRepositoryCommittedIdentity,beginRepositoryHumanRetentionRead,awaitRepositoryHumanRetentionRead} from '../core/idb-repository.js';
import {IDBFactory} from './vendor/fake-indexeddb/build/esm/index.js';
import {prepareHumanRetentionNativeEffects,finalizeHumanRetentionNativeEffects,requireHumanRetentionDeliveredValue} from '../core/browser-native-sync/human-library-plan.js';
const source=await readFile(new URL('../core/browser-native-sync/human-library-plan.js',import.meta.url),'utf8');
const registry=source.slice(source.indexOf('const branchWitnesses='),source.indexOf('function branchReady('));
const native=source.slice(source.indexOf('const NATIVE_RETENTION_FIXED='),source.indexOf('function nativeRetentionCausalCertificate('));
function fixture(){return Function('fail',registry+'\n'+native+`
 const store={},cap=Object.freeze({}),p={store,size:1000},state=branchState(store);state.bytes=p.size;state.busy=true;state.handles.push(cap);branchWitnesses.set(cap,p);const r=nativeRetentionBegin(p,cap);
 return {phase:(slots,run)=>nativeRetentionPhase(r,'test',slots,run),cancel:()=>branchForget(state,cap),pad:n=>state.candidateBytes=n,measure:nativeRetentionMeasure,status:()=>({bytes:state.bytes,size:p.size,charge:r.charged,peak:r.peak,frames:r.frames,phase:r.phase,deferred:r.deferredCharge,busy:state.busy,cap:branchWitnesses.has(cap)}),fixed:NATIVE_RETENTION_FIXED};`)(fail);}
const frozen=Object.freeze({text:'synthetic 汉字'.repeat(40),items:Object.freeze([1,2,3])});
test('same-owner preparation measures UTF16 units and refunds only ended phase scratch',async()=>{
 const f=fixture(),base=f.status().bytes,m=f.measure(frozen);assert.ok(m.B>m.T);assert.ok(m.V>0&&m.E>0);let during;
 await f.phase([['exact clone slot',2,'clone',frozen]],async()=>{during=f.status();assert.equal(during.frames,1);});
 assert.ok(during.bytes>base);assert.equal(f.status().bytes,base);assert.equal(f.status().frames,0);assert.ok(f.status().peak>f.fixed);
});
test('preparation admission refuses before helper without evicting original owner',async()=>{
 const f=fixture(),base=f.status().bytes;f.pad(8*1024*1024-base);let entered=false;await assert.rejects(f.phase([['clone',1,'clone',frozen]],async()=>{entered=true;}),{code:'BNS_HUMAN_GRAPH_LIMIT'});assert.equal(entered,false);assert.equal(f.status().bytes,base);assert.equal(f.status().cap,true);
});
test('held preparation cancellation keeps entire charge and busy state until real frame unwinds',async()=>{
 const f=fixture();let start,release;const ready=new Promise(r=>start=r),hold=new Promise(r=>release=r);const pending=f.phase([['clone',1,'clone',frozen]],async()=>{start();await hold;});await ready;const charged=f.status().bytes;f.cancel();assert.equal(f.status().bytes,charged);assert.equal(f.status().deferred,charged);assert.equal(f.status().size,0);assert.equal(f.status().busy,true);release();await assert.rejects(pending,{code:'BNS_HUMAN_RETENTION_REQUIRED'});assert.equal(f.status().frames,0);assert.equal(f.status().bytes,charged);assert.equal(f.status().phase,'revoked');
});
test('phase failure preserves even a null primary and refunds ordinary ended scratch',async()=>{
 const f=fixture(),base=f.status().bytes;let caught=false;try{await f.phase([['clone',1,'clone',frozen]],async()=>{throw null;});}catch(error){caught=true;assert.equal(error,null);}assert.equal(caught,true);assert.equal(f.status().bytes,base);
});
test('fixed native preparation/finalization cannot accept fabricated or unclaimed handles',async()=>{
 await assert.rejects(prepareHumanRetentionNativeEffects({},{}),{code:'BNS_HUMAN_RETENTION_REQUIRED'});await assert.rejects(finalizeHumanRetentionNativeEffects({}, {},{}),{code:'BNS_HUMAN_RETENTION_REQUIRED'});
});
test('closed nonnative Repository scope cannot become committed native identity or readonly observer',async()=>{
 const repo=new ArchiveRepository({}, {indexedDB:new IDBFactory(),name:'synthetic-observer'});let scope;await repo.transaction(true,async t=>{scope=t;await t.put('meta',{id:'synthetic',value:1});});
 assert.throws(()=>requireRepositoryCommittedIdentity(repo,scope),{code:'BNS_HUMAN_RETENTION_REQUIRED'});assert.throws(()=>beginRepositoryHumanRetentionRead(repo,scope,{}),{code:'BNS_HUMAN_RETENTION_REQUIRED'});await assert.rejects(awaitRepositoryHumanRetentionRead(repo,scope,{},{}),{code:'BNS_HUMAN_RETENTION_REQUIRED'});assert.equal((await repo.transaction(false,t=>t.get('meta','synthetic'))).value,1);repo.close();
});
function actualReplaySlots(body){
 const parent={id:'synthetic-entry',thoughtText:'old',title:'',note:'',type:'idea',formation:'explicit',revision:0,fieldRevisions:{body:0}};
 const deepFreeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))deepFreeze(child);Object.freeze(value);}return value;};
 const s=deepFreeze({entry:{namespace:'initial',secret:[1,2,3],sequence:{value:1},revision:{value:1}},parent,mapping:{local:{revision:0}},read:{row:parent,history:[],placementRows:[],topics:[]},history:[]});
 const protocol=deepFreeze({descriptor:{value:{request:{id:parent.id,operationId:'synthetic-operation',expectedRevision:0,changes:{body}},events:[]}}});
 const start=source.indexOf("await nativeRetentionPhase(r,'parent-replay',")+"await nativeRetentionPhase(r,'parent-replay',".length,end=source.indexOf(',async()=>',start);
 assert.ok(start>0&&end>start);return Function('s','protocol','return '+source.slice(start,end))(s,protocol);
}
test('actual replay slots cover large incoming text independently of tiny old body',async()=>{
 const f=fixture(),body='n'.repeat(100*1024),slots=actualReplaySlots(body),base=f.status().bytes;let charged=0;
 await f.phase(slots,async()=>{charged=f.status().bytes-base;});assert.ok(charged>=12*body.length);assert.equal(f.status().bytes,base);
});
test('oversized incoming replay refuses before any semantic helper under the same eight MiB cap',async()=>{
 const f=fixture();let entered=false;await assert.rejects(f.phase(actualReplaySlots('n'.repeat(1024*1024)),async()=>{entered=true;}),{code:'BNS_HUMAN_GRAPH_LIMIT'});assert.equal(entered,false);assert.equal(f.status().cap,true);
});
test('native delivered arrays reject excessive length before enumeration and preserve original mutable mode',()=>{
 const meter=Function('fail',registry+'\nreturn (value,mode)=>branchRawMeasure(value,4*1024*1024,null,mode);')(fail);let enumerated=false;
 const huge=new Proxy(new Array(200001),{ownKeys(){enumerated=true;return [];}});assert.throws(()=>meter(huge,'native'),{code:'BNS_HUMAN_GRAPH_LIMIT'});assert.equal(enumerated,false);
 const extra=[];extra.extra='value';assert.throws(()=>meter(extra,'native'),{code:'BNS_HUMAN_EFFECT_CUT_REQUIRED'});assert.equal(meter(extra,false),2);
});
test('captured index keyPath is fixed-shape checked without canonicalizing an oversized legacy array',()=>{
 const start=source.indexOf('function nativeRetentionSource('),end=source.indexOf('function nativeRetentionPoint(',start);let elementReads=0;const path=new Proxy(new Array(200001),{get(target,key){if(key==='0')elementReads++;return Reflect.get(target,key);}}),store={},index={},transaction={};
 const n={store:()=>store,storeTransaction:()=>transaction,storeName:()=> 'revisions',storeKeyPath:()=> 'id',index:()=>index,indexStore:()=>store,indexName:()=> 'byList',indexKeyPath:()=>path};
 const original=Function('retentionNative','fail',source.slice(start,end)+'\nreturn nativeRetentionSource;')(n,fail);assert.throws(()=>original(transaction,{store:'revisions',index:'byList',indexPath:['one']}),{code:'BNS_HUMAN_RETENTION_REQUIRED'});assert.equal(elementReads,0);
 n.indexKeyPath=()=> 'listKey';assert.equal(original(transaction,{store:'revisions',index:'byList',indexPath:'listKey'}),index);
});
test('native budget reserves a fresh causal recomputation instead of borrowing retained certificate charge',()=>{
 const start=source.indexOf('function nativeRetentionCausalReplaySlots('),end=source.indexOf('function nativeRetentionTaskBudget(',start),measure=Function('fail',registry+'\n'+source.slice(source.indexOf('function nativeRetentionMeasure('),source.indexOf('function nativeRetentionResize('))+'\nreturn nativeRetentionMeasure;')(fail);
 const calculate=Function('nativeRetentionMeasure','nativeRetentionSlot',source.slice(start,end)+'\nreturn nativeRetentionCausalReplaySlots;')(measure,(kind,m)=>2*m.T+128*m.V+8*m.E+128+16*m.E+2*m.B+128);
 const expected=Object.freeze([Object.freeze({type:'x',entityId:'synthetic',revisions:Object.freeze(['r'])})]);
 const p={raw:{protocol:{expected}},nativeWork:{certificate:{revisions:[['r',{operation:{parents:Array.from({length:128},()=> 'p')}}]],heads:[{head:{revisions:['r']}}]}}};const sparse=calculate(p);p.nativeWork.certificate.revisions[0][1].operation.parents.length=0;assert.equal(sparse-calculate(p),16*128);assert.match(source,/S:Math\.max\([^\n]+nativeRetentionCausalReplaySlots\(p\)/);
});

test('existing final head is bounded before canonical comparison through the original owner-only check',async()=>{
 const start=source.indexOf('function nativeRetentionDelivered('),end=source.indexOf('function nativeRetentionSource(',start);
 const core={},cap={},store={},p={kind:'retention',core,claimed:true,store,nativeEffects:{authenticated:true}},state={};
 const r={owner:p,cap,state,phase:'validated',accounted:true,nativeBudget:{W:1024,V:128,T:512}};p.nativeWork=r;state.effectReservation=r;
 const works=new WeakMap([[cap,r]]);
 // The registry owns its own lexical map: install precisely this synthetic
 // contract's witness, not a production proof or a native scope.
 const owning=Function('fail','nativeRetentionWorks','nativeRetentionCurrent','retentionKind','p','cap',registry+'\nbranchWitnesses.set(cap,p);\n'+source.slice(start,end).replace('export function','function')+'\nreturn requireHumanRetentionDeliveredValue;')(fail,works,x=>{if(x!==r||x.state.effectReservation!==x)fail('BNS_HUMAN_RETENTION_REQUIRED');},x=>x?.kind==='retention',p,cap);
 const coreSource=await readFile(new URL('../core/browser-native-sync/core.js',import.meta.url),'utf8');assert.match(coreSource,/const head=await this\.get\(t,'head',expected\.type,expected\.entityId\);current\(\);requireHumanRetentionDeliveredValue\(this,retention,head\);if\(head\?\.purged\|\|!equal\(head\?\.revisions,expected\.revisions\)\)/);
 let comparisons=0;const compare=head=>{owning(core,cap,head);comparisons++;};
 assert.throws(()=>compare({revisions:['x'.repeat(2048)]}),{code:'BNS_HUMAN_GRAPH_LIMIT'});assert.equal(comparisons,0);
 compare({revisions:['r'],purged:false});assert.equal(comparisons,1);assert.doesNotThrow(()=>owning(core,cap,undefined));assert.doesNotThrow(()=>owning(core,cap,null));
 assert.throws(()=>owning({},cap,{revisions:['r']}),{code:'BNS_HUMAN_RETENTION_REQUIRED'});r.phase='verified';assert.throws(()=>owning(core,cap,{revisions:['r']}),{code:'BNS_HUMAN_RETENTION_REQUIRED'});
 assert.throws(()=>requireHumanRetentionDeliveredValue({}, {},new Proxy({}, {ownKeys(){throw new Error('must not inspect foreign value');}})),{code:'BNS_HUMAN_RETENTION_REQUIRED'});
});

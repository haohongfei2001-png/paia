// Fixed-owner predicate tests are isolated source-execution contracts, not native
// IndexedDB evidence. Actual imported Plan tests below use non-native IndexedDB
// only to prove refusal; no synthetic fixture certifies a committed retention.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {ArchiveError} from '../../core/constants.js';
import {BrowserNativeSyncCore,requireHumanRetentionOwnerPhase} from '../../core/browser-native-sync/core.js';
import {IDBFactory,IDBKeyRange} from '../vendor/fake-indexeddb/build/esm/index.js';
import {local} from '../harness/thought-m1.mjs';
import {LibraryDocumentsStore} from '../../core/library-documents-store.js';
import {HumanLibrarySyncJournal} from '../../core/browser-native-sync/human-library-journal.js';
import {captureHumanBranchSemanticWitness,prepareHumanBranchRetention,claimHumanBranchRetention,requireHumanBranchRetentionInTransaction,finishHumanBranchRetention} from '../../core/browser-native-sync/human-library-plan.js';

globalThis.IDBKeyRange=IDBKeyRange;
const coreSource=await readFile(new URL('../../core/browser-native-sync/core.js',import.meta.url),'utf8');
const repositorySource=await readFile(new URL('../../core/idb-repository.js',import.meta.url),'utf8');
const declaration=coreSource.match(/^const humanRetentionTransactions=new WeakMap\(\);$/gm);
assert.equal(declaration?.length,1);
const assertionStart=coreSource.indexOf('export function requireHumanRetentionOwnerPhase('),assertionEnd=coreSource.indexOf('\nexport function requireHumanRetentionClosingPhase(',assertionStart);
assert.ok(assertionStart>0&&assertionEnd>assertionStart);
const fixedAssertion=coreSource.slice(assertionStart,assertionEnd).replace('export ','');
const delegate=coreSource.match(/^ requireHumanRetentionTransaction\(t,retention,group\)\{.*\}$/gm);
assert.equal(delegate?.length,1);
const ownerStart=repositorySource.indexOf('// Only this owner'),ownerEnd=repositorySource.indexOf('const backupDataStores',ownerStart);
const dataStart=repositorySource.indexOf('class Transaction {'),dataEnd=repositorySource.indexOf('export class ArchiveRepository {',dataStart);
assert.ok(ownerStart>0&&ownerEnd>ownerStart&&dataStart>ownerEnd&&dataEnd>dataStart);
const coreDataMethods=['get','put'].map(name=>{const matches=coreSource.match(new RegExp('^ async '+name+'\\(.*$','gm'));assert.equal(matches?.length,1);return matches[0];}).join('\n');
const coreProfileStart=coreSource.indexOf('// BEGIN original retention Core data methods.'),coreProfileEnd=coreSource.indexOf('// END original retention Core data methods.',coreProfileStart);
assert.ok(coreProfileStart>0&&coreProfileEnd>coreProfileStart);
const coreDataProfile=coreSource.slice(coreProfileStart,coreProfileEnd);
function predicateFixture(){
 const context={ArchiveError};
 return runInNewContext(`(()=>{
  const database={};let nativeMode='readwrite';
  class IDBTransaction{get db(){return database;}get mode(){return nativeMode;}}
  ${repositorySource.slice(ownerStart,ownerEnd).replaceAll('export ','')}
  ${repositorySource.slice(dataStart,dataEnd)}
  ${declaration[0]}
  function fail(code){throw new ArchiveError(code);}
  ${fixedAssertion}
  class BrowserNativeSyncCore{${delegate[0]}\n${coreDataMethods}}
  ${coreDataProfile}
  const repository={db:database},scope=new Transaction(new IDBTransaction(),{}),token=Object.freeze({}),retention=Object.freeze({}),group=Object.freeze({});
  const identity=Object.freeze({token,database,mode:'readwrite',nativeTransaction:true});
  const record={repository,transaction:scope.tx,dataPrototype:Object.getPrototypeOf(scope),identity,nativeSettled:false,unwound:false};
  repositoryScopes.set(scope,record);
  const core=new BrowserNativeSyncCore();core.repository=repository;core.boundTransactions=new WeakMap([[scope,'initial']]);
  const proof={core,wrapper:scope,retention,group,repository,database,namespace:'initial',phase:'validate'};
  return {
   active(){humanRetentionTransactions.set(token,Object.freeze({...proof}));},
   phase(value){humanRetentionTransactions.set(token,Object.freeze({...proof,phase:value}));},
   change(key,value){humanRetentionTransactions.set(token,Object.freeze({...proof,[key]:value}));},
   absent(){humanRetentionTransactions.delete(token);},
   direct(){return requireHumanRetentionOwnerPhase(core,scope,retention,group);},
   delegated(){return core.requireHumanRetentionTransaction(scope,retention,group);},
   alias(){return requireHumanRetentionOwnerPhase(core,Object.create(scope),retention,group);},
   proxy(){return requireHumanRetentionOwnerPhase(core,new Proxy(scope,{}),retention,group);},
   clonedHandle(){return requireHumanRetentionOwnerPhase(core,scope,{},group);},
   dataOverride(){scope.get=()=>undefined;},
   settled(){record.nativeSettled=true;},
   nonnative(){record.identity=Object.freeze({...identity,nativeTransaction:false});},
   readonly(){record.identity=Object.freeze({...identity,mode:'readonly'});},
  };
 })()`,context);
}
const refusal={code:'BNS_HUMAN_RETENTION_REQUIRED'};
test('fixed original predicate and original public delegate admit only exact active validate proof',()=>{
 const f=predicateFixture();f.active();assert.equal(f.direct(),undefined);assert.equal(f.delegated(),undefined);
 for(const phase of ['opening','apply','closing']){f.phase(phase);assert.throws(()=>f.direct(),refusal,phase);assert.throws(()=>f.delegated(),refusal,phase);}
 f.absent();assert.throws(()=>f.direct(),refusal);
});
test('original predicate refuses each mismatched private identity and exact Transaction facade mutation',()=>{
 for(const field of ['core','wrapper','retention','group','repository','database','namespace']){const f=predicateFixture();f.change(field,{});assert.throws(()=>f.direct(),refusal,field);}
 for(const change of ['alias','proxy','clonedHandle','dataOverride','settled','nonnative','readonly']){
  const f=predicateFixture();f.active();if(['alias','proxy','clonedHandle'].includes(change))assert.throws(()=>f[change](),refusal,change);
  else{f[change]();assert.throws(()=>f.direct(),refusal,change);}
 }
});

const operationId=()=>crypto.randomUUID();
async function device(deviceId){
 let tick=0;const store=new LibraryDocumentsStore(local(),{indexedDB:new IDBFactory(),clock:()=>new Date(Date.UTC(2026,9,9)+tick++).toISOString()});
 await store.consent(true);await store.finishFoundation();const core=new BrowserNativeSyncCore(store.repository,{datasetId:'synthetic-owner-phase',deviceId});store.humanLibraryJournal=new HumanLibrarySyncJournal(core);return {store,core};
}
async function groups(core){const operations=[];for await(const row of core.rows('revision'))if(!row.redacted)operations.push(row.operation);return operations.filter(op=>op.type==='humanLibraryCommit').sort((a,b)=>a.sequence-b.sequence).map(descriptor=>[...descriptor.value.members.map(ref=>operations.find(op=>op.revisionId===ref.revisionId)),descriptor]);}
async function claimedPlan(){
 const a=await device('synthetic-owner-a'),b=await device('synthetic-owner-b');
 const entry=await a.store.createEntry({actor:'user',body:'SYNTHETIC initial',type:'idea',formation:'explicit',evidence:[],operationId:operationId()});
 for(const group of await groups(a.core))await b.store.humanLibraryJournal.receive(b.store,group);
 await a.store.editEntry({id:entry.id,expectedRevision:0,changes:{body:'SYNTHETIC incoming'},operationId:operationId()});
 const incoming=(await groups(a.core)).at(-1);
 await b.store.editEntry({id:entry.id,expectedRevision:0,changes:{body:'SYNTHETIC current'},operationId:operationId()});
 const witness=await captureHumanBranchSemanticWitness(b.store,b.core,incoming),plan=await prepareHumanBranchRetention(b.store,b.core,witness),claim=claimHumanBranchRetention(b.core,plan);
 return {...b,plan,claim};
}
test('actual imported Plan ignores a no-op public method for a genuine claimed handle outside Core retention',async()=>{
 const f=await claimedPlan();let publicCalls=0;
 f.core.requireHumanRetentionTransaction=()=>{publicCalls++;};
 try{
  await f.store.repository.transaction(true,async scope=>{
   let dependentReads=0;scope.get=()=>{dependentReads++;throw Error('unexpected dependent data read');};
   assert.throws(()=>requireHumanRetentionOwnerPhase(f.core,scope,f.plan,f.claim.group),refusal);
   await assert.rejects(requireHumanBranchRetentionInTransaction(scope,f.core,f.plan),refusal);
   assert.equal(publicCalls,0);assert.equal(dependentReads,0);
  });
 }finally{finishHumanBranchRetention(f.core,f.plan,f.claim);await f.store.repository.close();}
});

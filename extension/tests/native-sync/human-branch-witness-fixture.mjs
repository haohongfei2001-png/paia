import {HUMAN_WITNESS_ORIGINAL_CASES} from './human-branch-witness-receipt.mjs';
// Compile the unchanged owning assertions into a temporary test-only MV3 worker.
// No production worker or runtime module is modified.
export function nativeHumanBranchWitnessFixture(original){
 const excluded=["import test from 'node:test';","import assert from 'node:assert/strict';","import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';","import {local} from './harness/thought-m1.mjs';"];
 for(const text of excluded){if(original.split(text).length!==2)throw Error('WITNESS_FIXTURE_IMPORT_CHANGED');}
 const names=[...original.matchAll(/test\('([^']+)'/g)].map(m=>m[1]);
 if(JSON.stringify(names)!==JSON.stringify(HUMAN_WITNESS_ORIGINAL_CASES))throw Error('WITNESS_FIXTURE_CASES_CHANGED');
 let source=original;for(const text of excluded)source=source.replace(text,'');
 if(source.split('globalThis.IDBKeyRange=IDBKeyRange;').length!==2)throw Error('WITNESS_FIXTURE_KEY_RANGE_CHANGED');
 source=source.replace('globalThis.IDBKeyRange=IDBKeyRange;','');
 const witnessImport="import {humanPlanEntry,captureHumanBranchSemanticWitness as captureWitness,revalidateHumanBranchSemanticWitness as revalidate,executeHumanPlan} from '../core/browser-native-sync/human-library-plan.js';";
 if(source.split(witnessImport).length!==2)throw Error('WITNESS_FIXTURE_OWNER_IMPORT_CHANGED');
 source=source.replace(witnessImport,witnessImport.replace('as captureWitness','as originalCaptureWitness').replace('as revalidate,','as originalRevalidate,'));
 const begin=source.indexOf('async function device(id){'),end=source.indexOf('\nasync function capture(',begin);
 if(begin<0||end<0)throw Error('WITNESS_FIXTURE_DEVICE_CHANGED');
 const device=source.slice(begin,end);
 if(!device.includes('new LibraryDocumentsStore(local(),{indexedDB:new IDBFactory(),clock:'))throw Error('WITNESS_FIXTURE_NATIVE_CONSTRUCTOR_CHANGED');
 source=source.slice(0,begin)+`async function device(id){let tick=0;const s=nativeStore(()=>new Date(Date.UTC(2026,9,9)+tick++).toISOString());await s.consent(true);await s.finishFoundation();const core=new BrowserNativeSyncCore(s.repository,{datasetId:'synthetic-historical-body',deviceId:id});s.humanLibraryJournal=new HumanLibrarySyncJournal(core);return {s,core};}`+source.slice(end);
 if(/fake-indexeddb|new IDBFactory|from ['"]node:/.test(source))throw Error('WITNESS_FIXTURE_FAKE_NATIVE');
 return prelude+'\n'+source+'\n'+nativeCases;
}
const prelude=String.raw`
const cases=[],test=(name,fn)=>cases.push({name,fn}),stores=[],invocations=[];let sequence=0,currentCase=-1;
const normalize=v=>Array.isArray(v)?v.map(normalize):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,normalize(v[k])])):v;
const check=(error,expected)=>{if(expected&&!(typeof expected==='function'?expected(error):Object.entries(expected).every(([k,v])=>error[k]===v)))throw Error('Wrong native rejection: '+error.code);};
const assert={equal(a,b,label){if(!Object.is(a,b))throw Error(label||'native equality');},notEqual(a,b,label){if(Object.is(a,b))throw Error(label||'native inequality');},deepEqual(a,b,label){if(JSON.stringify(normalize(a))!==JSON.stringify(normalize(b)))throw Error(label||'native exact snapshot');},ok(v,label){if(!v)throw Error(label||'native truthy');},throws(fn,expected){try{fn();}catch(e){check(e,expected);return;}throw Error('Expected native throw');},async rejects(value,expected){try{await value;}catch(e){check(e,expected);return;}throw Error('Expected native rejection');}};
const active=new Set(),caseDatabases=new Set(),restorers=[];
function observe(target,key,call){const old=target[key];target[key]=function(...args){return call.call(this,old,args);};restorers.push(()=>target[key]=old);}
function installObservers(){
 const ownOpen=Object.getOwnPropertyDescriptor(indexedDB,'open');restorers.push(()=>{if(ownOpen)Object.defineProperty(indexedDB,'open',ownOpen);else delete indexedDB.open;});
 observe(IDBDatabase.prototype,'transaction',function(old,args){caseDatabases.add(this);const tx=old.apply(this,args);for(const row of active){row.transactions++;if(!(tx instanceof IDBTransaction))row.nonNativeTransactions++;if(tx.mode!=='readonly')row.readwriteTransactions++;if(tx.db!==row.database)row.foreignTransactions++;}return tx;});
 for(const key of ['add','put','delete','clear'])observe(IDBObjectStore.prototype,key,function(old,args){for(const row of active)row.writes++;return old.apply(this,args);});
 for(const key of ['update','delete'])observe(IDBCursor.prototype,key,function(old,args){for(const row of active)row.writes++;return old.apply(this,args);});
 observe(IDBFactory.prototype,'open',function(old,args){for(const row of active)row.factoryOpens++;return old.apply(this,args);});
}
function nativeStore(clock){const name='bns-human-witness-'+(++sequence),prefix=name+':',storage={async get(k){const all=await chrome.storage.local.get(null);if(k===null)return Object.fromEntries(Object.entries(all).filter(([key])=>key.startsWith(prefix)).map(([key,v])=>[key.slice(prefix.length),v]));return {[k]:all[prefix+k]};},async set(v){for(const row of active)row.controlWrites++;await chrome.storage.local.set(Object.fromEntries(Object.entries(v).map(([k,x])=>[prefix+k,x])));}};
 const s=new LibraryDocumentsStore(storage,{indexedDB,name,clock});stores.push(s);
 for(const [target,key]of [[s.repository,'initialize'],[s,'initializeIA'],[s,'initializeFilter'],[s,'finishFoundation']]){if(typeof target[key]!=='function')throw Error('Missing initialization observer');const old=target[key];target[key]=function(...args){for(const row of active)row.initializations++;return old.apply(this,args);};}
 return s;
}
function measured(kind,fn,s,core,value){
 if(invocations.length>=256)throw Error('Native invocation evidence bound');
 const row={caseIndex:currentCase,kind,result:null,code:null,transactions:0,nonNativeTransactions:0,readwriteTransactions:0,foreignTransactions:0,writes:0,factoryOpens:0,initializations:0,controlWrites:0,storeNative:s instanceof LibraryDocumentsStore,factoryNative:s.repository.factory===indexedDB&&indexedDB instanceof IDBFactory,databaseNative:s.repository.db instanceof IDBDatabase,repositoryMatches:core.repository===s.repository,journalMatches:s.humanLibraryJournal?.core===core,database:s.repository.db};invocations.push(row);active.add(row);
 const settle=(ok,result)=>{active.delete(row);row.result=ok?'resolved':'rejected';row.code=ok?null:String(result.code||result.name||'Error');delete row.database;if(ok){assert.equal(row.storeNative,true);assert.equal(row.factoryNative,true);assert.equal(row.databaseNative,true);assert.equal(row.repositoryMatches,true);assert.equal(row.journalMatches,true);if(kind==='capture'){assert.equal(Object.isFrozen(result),true);assert.deepEqual(Object.keys(result),[]);assert.ok(row.transactions>=2);}else{assert.equal(result,undefined);assert.ok(row.transactions>=1);}}for(const key of ['nonNativeTransactions','readwriteTransactions','foreignTransactions','writes','factoryOpens','initializations','controlWrites'])assert.equal(row[key],0,'Witness wrote, initialized or changed native DB: '+key);if(ok)return result;throw result;};
 try{return Promise.resolve(fn(s,core,value)).then(v=>settle(true,v),e=>settle(false,e));}catch(e){return Promise.resolve().then(()=>settle(false,e));}
}
const captureWitness=(s,c,g)=>measured('capture',originalCaptureWitness,s,c,g),revalidate=(s,c,w)=>measured('revalidate',originalRevalidate,s,c,w);
`;
const nativeCases=String.raw`
test('native same-name reopened database and foreign Core or journal cannot reuse a witness',async()=>{
 const f=await scenario(),s=f.b.s,core=f.b.core,before=await snapshot(s),cap=await captureWitness(s,core,f.incoming),old=s.repository.db,name=old.name;
 old.close();s.repository.db=null;await s.repository.open();assert.equal(s.repository.db.name,name);assert.notEqual(s.repository.db,old);assert.deepEqual(await snapshot(s),before);
 await assert.rejects(revalidate(s,core,cap),{code:'BNS_HUMAN_CHANGED'});await assert.rejects(revalidate(s,core,cap),{code:'BNS_HUMAN_BRANCH_WITNESS_REQUIRED'});
 const next=await captureWitness(s,core,f.incoming),otherCore=new BrowserNativeSyncCore(s.repository,{datasetId:core.datasetId,deviceId:core.deviceId});await assert.rejects(revalidate(s,otherCore,next),{code:'BNS_HUMAN_BRANCH_WITNESS_REQUIRED'});
 const journal=s.humanLibraryJournal;s.humanLibraryJournal=new HumanLibrarySyncJournal(core);await assert.rejects(revalidate(s,core,next),{code:'BNS_HUMAN_CHANGED'});s.humanLibraryJournal=journal;assert.deepEqual(await snapshot(s),before);
});
test('native revalidation refuses every readiness or failure flag without opening or writing',async()=>{
 for(const flag of ['loaded','iaLoaded','filterLoaded','foundationLoaded','bindingsLoaded','documentsLoaded','foundationFailure','volatileError']){
  const f=await scenario(),s=f.b.s,before=await snapshot(s),cap=await captureWitness(s,f.b.core,f.incoming),old=s[flag];s[flag]=['foundationFailure','volatileError'].includes(flag)?true:false;
  await assert.rejects(revalidate(s,f.b.core,cap),{code:'BNS_HUMAN_CHANGED'});await assert.rejects(revalidate(s,f.b.core,cap),{code:'BNS_HUMAN_BRANCH_WITNESS_REQUIRED'});s[flag]=old;assert.deepEqual(await snapshot(s),before);
 }
});
const previous=globalThis.__bnsNative;
globalThis.__bnsNative={...previous,async run(command,args={}){
 if(command==='human-branch-witness-case'){
  if(!Number.isInteger(args.index)||args.index<0||args.index>=cases.length)throw Error('Native witness case range');currentCase=args.index;const start=invocations.length;installObservers();
  try{await cases[currentCase].fn();const observations=invocations.slice(start);assert.ok(observations.length>0);return {name:cases[currentCase].name,observations};}
  finally{active.clear();while(restorers.length)restorers.pop()();for(const db of caseDatabases)db.close();caseDatabases.clear();for(const s of stores)s.repository.db?.close();stores.length=0;currentCase=-1;}
 }
 return previous.run(command,args);
}};
`;

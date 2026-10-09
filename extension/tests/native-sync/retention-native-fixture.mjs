import {createHash} from 'node:crypto';
export const RETENTION_SPECS=Object.freeze({
  "retention": {
    "file": "human-sibling-retention.test.mjs",
    "sha256": "178acc01ccf8ef2c4cf86a9e1a2692859a3b83419dddaafedfd07d52de32fa42",
    "names": [
      "first complete human sibling retained atomically without canonical writes or echo; exact retry is write-free",
      "retention consumes semantic handle; clones, ordinary plans and fake transactions cannot authorize it",
      "new body, protection, permission or namespace after prepare invalidates retention without undoing the change",
      "native repository fault after protocol writes aborts every head, receipt and frontier before exact retry",
      "after durable commit a late control loss is unknown to the caller, and exact duplicate reconciles without writes",
      "complete receipts only: missing member cannot be repaired under duplicate authority",
      "mixed semantic, retention and duplicate handles share the original eight-handle lifetime",
      "ordinary bound edit of unresolved body is refused, unrelated Entry still progresses",
      "both offline directions retain identical logical graphs while preserving each current body",
      "all six original semantic scenarios retain complete groups without allocating domain counters",
      "a genuine unrelated transaction has no retention provenance, and overriding public transaction cannot inject a DTO",
      "duplicate authority remains standalone body-only even for a previously accepted placed edit",
      "active retention cannot widen origin, materialization, exact member or capability authority",
      "active physical retention scope rejects alias, Proxy and foreign Core before materialization"
    ]
  },
  "owner": {
    "file": "human-retention-repository-owner.test.mjs",
    "sha256": "801c2ac3efdb7deee7c8da55605d281a3efc2efb6f0fa518ceed99c0062f6224",
    "names": [
      "original owner exact identity rejects aliases, proxies, changed tx and foreign owner, retaining ordinary reads/writes",
      "owner settlement waits for aborted native transaction AND authentic callback unwind",
      "callback failure preserves owner rollback and waits to expose closed settlement",
      "retention opening rejects reentrant local materialization during first binding await",
      "wrapper return before any authentic callback permanently consumes and rejects a late callback",
      "wrapper early return after authentic opening keeps ownership until callback and native settlement",
      "private native completion observer survives public event property replacement",
      "original backup finalization failure aborts before owner settlement is exposed",
      "commit evidence requires authentic completed original success, never pending, aborted or foreign scope",
      "public wrapper cannot mask original owner abort after authentic callback",
      "public wrapper cannot mask original owner finalizer after authentic callback",
      "public wrapper cannot mask original owner completed-then-throw after authentic callback",
      "normal original commit and exact duplicate both have completed owner evidence"
    ]
  }
});

export const NATIVE_OWNER_EXTRA='native owner ignores instance listener interception and transaction-shaped event DTOs';
export function retentionNativeFixture(original,kind){
 const spec=RETENTION_SPECS[kind];if(!spec||createHash('sha256').update(original).digest('hex')!==spec.sha256)throw Error('RETENTION_ORIGINAL_HASH_CHANGED');
 let source=original;
 const replace=(from,to='')=>{if(source.split(from).length!==2)throw Error('RETENTION_ENV_SUBSTITUTION_CHANGED');source=source.replace(from,to);};
 replace("import test from 'node:test';");
 replace("import assert from 'node:assert/strict';","import assert,{assertionCount} from './bns-retention-assert.mjs';");
 replace("import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';");
 replace("import {local} from './harness/thought-m1.mjs';");
 replace('globalThis.IDBKeyRange=IDBKeyRange;');
 const begin=source.indexOf('async function device(id){'),end=source.indexOf('\nasync function capture(',begin);
 if(begin<0||end<0)throw Error('RETENTION_DEVICE_ENV_CHANGED');
 source=source.slice(0,begin)+`async function device(id){let tick=0;const s=nativeStore(()=>new Date(Date.UTC(2026,9,9)+tick++).toISOString());await s.consent(true);await s.finishFoundation();const core=new BrowserNativeSyncCore(s.repository,{datasetId:'synthetic-historical-body',deviceId:id});s.humanLibraryJournal=new HumanLibrarySyncJournal(core);return {s,core};}`+source.slice(end);
 if(kind==='owner')replace('const turn=()=>new Promise(resolve=>setImmediate(resolve));','const turn=()=>new Promise(resolve=>setTimeout(resolve,0));');
 if(/fake-indexeddb|new IDBFactory|from ['"]node:/.test(source))throw Error('RETENTION_NON_NATIVE_DEPENDENCY');
 const names=[...spec.names,...(kind==='owner'?[NATIVE_OWNER_EXTRA]:[])];
 return prelude+'\n'+source+'\n'+(kind==='owner'?extraCase:'')+'\n'+suffix(kind,names);
}
const prelude=String.raw`
const cases=[],test=(name,fn)=>cases.push({name,fn}),nativeStores=[];let nativeSequence=0;
function nativeStore(clock){
 const name='paia-retention-'+crypto.randomUUID()+'-'+(++nativeSequence),prefix=name+':';
 const storage={async get(key){const values=await chrome.storage.local.get(prefix+key);return {[key]:values[prefix+key]};},async set(values){await chrome.storage.local.set(Object.fromEntries(Object.entries(values).map(([key,value])=>[prefix+key,value])));}};
 const store=new LibraryDocumentsStore(storage,{indexedDB,name,clock});nativeStores.push(store);return store;
}
`;
const extraCase=String.raw`
test('native owner ignores instance listener interception and transaction-shaped event DTOs',async()=>{
 const f=await scenario(),s=f.b.s,core=f.b.core,db=s.repository.db,originalTransaction=db.transaction,originalBind=core.bind.bind(core);
 const nativeAdd=EventTarget.prototype.addEventListener,nativeRemove=EventTarget.prototype.removeEventListener;let armed=false,intercepts=0,removals=0,dtoInvocations=0,trustedCompletes=0,falseEvents=0;
 db.transaction=function(...args){const transaction=originalTransaction.apply(this,args);if(armed&&args[1]==='readwrite'){
  const observedComplete=event=>{if(event.isTrusted!==true||event.target!==transaction||event.currentTarget!==transaction)return;trustedCompletes++;nativeRemove.call(transaction,'complete',observedComplete);};
  nativeAdd.call(transaction,'complete',observedComplete);
  transaction.addEventListener=(type,listener)=>{intercepts++;dtoInvocations++;listener({type,isTrusted:true,target:transaction,currentTarget:transaction});};
  transaction.removeEventListener=()=>{removals++;};
 }return transaction;};
 const witness=await captureWitness(s,core,f.incoming),plan=await prepareHumanBranchRetention(s,core,witness);armed=true;
 core.bind=async t=>{if(armed&&!falseEvents){const dto={type:'complete',isTrusted:true,target:t.tx,currentTarget:t.tx};assert.throws(()=>t.tx.dispatchEvent(dto),TypeError);const event=new Event('complete');assert.equal(event.isTrusted,false);t.tx.dispatchEvent(event);falseEvents++;}return originalBind(t);};
 try{
  assert.deepEqual(await core.retainHumanBranch(plan),{state:'retained-conflict'});
  assert.equal(intercepts,0);assert.equal(removals,0);assert.equal(dtoInvocations,0);assert.equal(falseEvents,1);assert.equal(trustedCompletes,1);
  for(const operation of f.incoming)assert.equal((await core.read('receipt',operation.operationId)).digest,operation.revisionId);
  return {intercepts,removals,dtoInvocations,falseEvents,trustedCompletes};
 }finally{db.transaction=originalTransaction;core.bind=originalBind;}
});
`;
function suffix(kind,names){return `
const expectedNames=${JSON.stringify(names)};
assert.deepEqual(cases.map(item=>item.name),expectedNames);
const previous=globalThis.__bnsNative;
globalThis.__bnsNative={...previous,async run(command,args={}){
 if(command!=='human-retention-case'||args.suite!==${JSON.stringify(kind)})return previous.run(command,args);
 if(!Number.isInteger(args.index)||args.index<0||args.index>=cases.length)throw Error('RETENTION_NATIVE_CASE_RANGE');
 const current=cases[args.index],before=assertionCount(),started=performance.now();
 try{
  const extra=await current.fn();assert.equal(indexedDB instanceof IDBFactory,true);
  for(const store of nativeStores){assert.equal(store.repository.factory,indexedDB);if(store.repository.db)assert.equal(store.repository.db instanceof IDBDatabase,true);}
  return {suite:args.suite,index:args.index,name:current.name,result:'PASS',assertions:assertionCount()-before,nativeFactory:true,durationMs:performance.now()-started,...(extra?{extra}: {})};
 }finally{for(const store of nativeStores)store.repository.db?.close();nativeStores.length=0;}
}};
`;}

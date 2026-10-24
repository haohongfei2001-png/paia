import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdir,mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {FakeChatGPT} from './harness/fake-chatgpt.mjs';

const root=fileURLToPath(new URL('..',import.meta.url));
const cases=['complete','backup-revoke','journal-issuer','earlier-use-release','later-issuer-release','work-abort','reads-exhausted','hash-bytes-overrun','ledger-seen-swap','restore-drift','second-fence-revoke','receipt-failure','wall-expiry','legacy-compatibility','phase-downgrade','phase-upgrade','mixed-write','human-journal-refusal','conflict','no-op'];
async function install(page){
 await page.evaluate(async()=>{
  const [{OrganizerStore},{TopicLifecycleService},{TopicProcessingAuthority,releaseTopicProcessingAuthority},{createContextScopeWorkBudget,CONTEXT_TOPIC_SCOPE_LIMITS},{DATABASE_NAME,registerRepositoryFinalReadFence}]=await Promise.all([
   import(chrome.runtime.getURL('core/organizer/store.js')),import(chrome.runtime.getURL('core/topic-lifecycle.js')),import(chrome.runtime.getURL('core/topic-processing-authority.js')),import(chrome.runtime.getURL('core/context-topic-scope.js')),import(chrome.runtime.getURL('core/idb-repository.js'))
  ]);
  const check=(value,label)=>{if(!value)throw Error(label);},same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),op=()=>crypto.randomUUID();
  const nativeRequest=request=>new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(Error('Native synthetic request failed'));});
  async function inspect(db,names){const tx=db.transaction(names,'readonly'),done=new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onabort=()=>reject(Error('Native snapshot failed'));});done.catch(()=>{});const rows=await Promise.all(names.map(async table=>[table,await nativeRequest(tx.objectStore(table).getAll())]));await done;return Object.fromEntries(rows);}
  globalThis.__topicLifecycleNative=async mode=>{
   check(indexedDB instanceof IDBFactory&&/\[native code\]/.test(IDBFactory.prototype.open.toString()),'Native IndexedDB required');
   const values={},storage={async get(key){return {[key]:structuredClone(values[key])};},async set(changes){Object.assign(values,structuredClone(changes));}},name='paia-topic-lifecycle-native-'+op();check(name!==DATABASE_NAME,'Disposable fixture database only');
   const s=new OrganizerStore(storage,{indexedDB,name});let owner,observer;const wall=Date.now;let completed=false,aborted=false,trustedComplete=false,trustedAbort=false,fired=false,revoked=0,registered=false,backupReads=null;
   try{
    await s.consent(true);await s.capture({epoch:(await s.status()).epoch,adapterVersion:'0.3.0',chat:{id:'synthetic-lifecycle-chat',url:'https://chatgpt.com/c/synthetic-lifecycle-chat',title:'SYNTHETIC lifecycle'},messages:[{sourceMessageId:'synthetic-lifecycle-input',pageOrder:1,originalText:'SYNTHETIC exact original Input'}]});await s.finishFoundation();
    const a=await s.createTopic({name:'SYNTHETIC terminal Topic',operationId:op()}),scope=(await s.repository.transaction(false,t=>t.all('inputStates'))).map(r=>({inputId:r.id,role:'primary',selectedFields:['body']})),caller=Object.freeze({id:op()}),abort=new AbortController(),workAbort=new AbortController(),budget=createContextScopeWorkBudget({database:s.repository.db,signal:workAbort.signal}),issued=new WeakSet(),state={current:true,calls:0,expiry:Date.now()+600000,writeUses:[]};
    const processing={resolve:async(_t,scope)=>{state.calls++;const receipt=Object.freeze({version:1,store:s,caller,scope,epoch:'synthetic-native-lifecycle-original',processing:true,expiresAt:state.expiry,revocationSignal:abort.signal});issued.add(receipt);state.last=receipt;return receipt;},isCurrent:receipt=>{if(mode==='later-issuer-release'&&fired&&!revoked&&receipt===state.writeUses[1]?.receipt){revoked++;releaseTopicProcessingAuthority(state.writeUses[0].cap);}return state.current&&issued.has(receipt);}};
    owner=new TopicProcessingAuthority(s,{caller,processing,binding:{operationId:op(),mode:'synthetic_lifecycle'},workBudget:budget});
    let phase=0;const resolveProcessing=async(t,request)=>{const modes={'phase-downgrade':'GGLL','phase-upgrade':'LLGG','mixed-write':'GGGL'},legacy=mode==='legacy-compatibility'||modes[mode]?.[phase++]==='L';if(legacy){if(mode!=='legacy-compatibility')fired=true;return {allowed:true,epoch:'synthetic-native-lifecycle-original',inputIds:[...request.inputIds],topicIds:[...request.topicIds]};}const value=await owner.authorize(t,request);if(t.tx.mode==='readwrite')state.writeUses.push({cap:value.authority,receipt:state.last});return value;},service=new TopicLifecycleService(s,{resolveProcessing}),request={id:a.id,to:mode==='no-op'?'active':'dormant',expectedRevision:mode==='conflict'?1:0,operationId:op(),scope};
    observer=await nativeRequest(indexedDB.open(name));const names=[...s.repository.stores],snapshot=()=>inspect(observer,names),before=await snapshot(),write=s.foundationWrite.bind(s);
    s.foundationWrite=fn=>write(async t=>{
     check(t.tx instanceof IDBTransaction,'Original native transaction');t.tx.addEventListener('complete',event=>{completed=true;trustedComplete=event.isTrusted;},{once:true});t.tx.addEventListener('abort',event=>{aborted=true;trustedAbort=event.isTrusted;},{once:true});
     const put=t.put.bind(t);t.put=async(table,row,...rest)=>{const result=await put(table,row,...rest);
      if(mode==='journal-issuer'&&table==='revisions'&&row.reason==='activity'){fired=true;state.current=false;}
      if(mode==='receipt-failure'&&table==='operationReceipts'){fired=true;throw Error('SYNTHETIC original receipt storage failure');}
      if(mode==='second-fence-revoke'&&!registered&&table==='revisions'&&row.reason==='activity'){registered=true;registerRepositoryFinalReadFence(s.repository,t,{isCurrent:()=>true,plan:function*(){yield {method:'get',table:'meta',key:'gate'};fired=true;abort.abort();return true;}});}
      if(table==='meta'&&row.id==='backup-data-generation'){
       backupReads=budget.reads;
       if(['backup-revoke','earlier-use-release','later-issuer-release','work-abort','reads-exhausted','hash-bytes-overrun','ledger-seen-swap','restore-drift','wall-expiry'].includes(mode))fired=true;
       if(mode==='backup-revoke')abort.abort();
       if(mode==='earlier-use-release')releaseTopicProcessingAuthority(state.writeUses[0].cap);
       if(mode==='work-abort')workAbort.abort();
       if(mode==='reads-exhausted')budget.reads=CONTEXT_TOPIC_SCOPE_LIMITS.reads;
       if(mode==='hash-bytes-overrun')budget.hashBytes=CONTEXT_TOPIC_SCOPE_LIMITS.hashBytes+1;
       if(mode==='ledger-seen-swap')budget.seen=new Map(budget.seen);
       if(mode==='restore-drift')await put('meta',{id:'recovery-restore-epoch',value:'synthetic-terminal-restore'});
       if(mode==='wall-expiry')Date.now=()=>state.expiry;
      }
      return result;
     };return fn(t);
    });
    if(mode==='human-journal-refusal')s.humanLibraryJournal={};
    const outcome=await service.change(request).then(value=>({accepted:true,value}),error=>({accepted:false,code:error.code}));Date.now=wall;s.humanLibraryJournal=null;const after=await snapshot(),unchanged=same(before,after),history=after.revisions.filter(r=>r.operationId===request.operationId&&r.reason==='activity').length,persisted=after.operationReceipts.some(r=>r.id===request.operationId);let replay=false;
    if(mode==='complete'||mode==='legacy-compatibility'){
     check(outcome.accepted&&outcome.value.lifecycle==='dormant'&&completed&&trustedComplete&&!aborted,'Genuine original transaction commits');check(history===1&&persisted,'Exactly one lifecycle history and receipt');if(mode==='complete'){check(budget.reads-backupReads===1,'Terminal control read charges original ledger exactly once');check(state.calls===4&&state.writeUses.length===2,'Original admissions are not refreshed during terminal');}else check(state.calls===0,'Legacy compatibility makes no strict-authority claim');s.foundationWrite=write;const prior=await service.change(request);replay=same(prior,outcome.value)&&same(after,await snapshot());check(replay,'Exact replay makes no new mutation');
    }else if(mode==='conflict'||mode==='no-op'){
     check(outcome.accepted&&completed&&trustedComplete&&!aborted,'Genuine non-transition completion');check(history===0,'No fake transition history');check(after.topics.find(r=>r.id===a.id).lifecycle==='active'&&after.topics.find(r=>r.id===a.id).revision===0,'No lifecycle mutation');check(mode==='conflict'?outcome.value.conflict===true&&!persisted&&unchanged:persisted,'Original receipt semantics');
    }else{
     check(!outcome.accepted&&unchanged&&!persisted&&history===0,'Complete original database rollback');if(mode==='human-journal-refusal')check(!completed&&!aborted&&outcome.code==='BNS_HUMAN_UNSUPPORTED_MUTATION','Human owner refuses before operation transaction');else check(aborted&&trustedAbort&&!completed,'Trusted native abort, never commit');if(mode!=='human-journal-refusal')check(fired,'Actual awaited injection boundary reached');if(mode==='later-issuer-release')check(revoked===1,'Later issuer released original earlier use');
    }
    return {passed:true,mode,nativeFactory:true,accepted:outcome.accepted,completed,aborted,trustedComplete,trustedAbort,fired,revoked,unchanged,persisted,history,replay};
   }finally{Date.now=wall;owner?.release();observer?.close();await s.repository.close();await nativeRequest(indexedDB.deleteDatabase(name));}
  };
 });
}
for(const variant of ['source','release'])test('TOPIC-02 native '+variant+' original lifecycle terminal authority',{timeout:120000},async t=>{
 const temporary=await mkdtemp(join(tmpdir(),'paia-topic-lifecycle-native-')),output=join(root,'work','topic-lifecycle-terminal',variant);let harness;
 try{
  const extensionPath=variant==='source'?root:join(temporary,'release');if(variant==='release')execFileSync('python3',[join(root,'scripts/build_current_release.py'),extensionPath],{cwd:root,stdio:'pipe'});
  harness=await FakeChatGPT.start({extensionPath});const page=harness.archive,settings=await page.evaluate(()=>chrome.storage.local.get(null));await install(page);const reports=[];await mkdir(output,{recursive:true});
  for(const mode of cases)await t.test(mode,{timeout:20000},async()=>{const result=await page.evaluate(mode=>globalThis.__topicLifecycleNative(mode),mode);assert.equal(result.passed,true);reports.push(result);await writeFile(join(output,'mechanism-trace.json'),JSON.stringify({variant,syntheticOnly:true,automaticDormancy:false,providerCalls:0,reports},null,2)+'\n');});
  assert.deepEqual(await page.evaluate(()=>chrome.storage.local.get(null)),settings);assert.equal(harness.extensionNetworkRequests,0);assert.equal(harness.externalRequests,0);assert.equal(harness.deepSeekRequests.length,0);assert.deepEqual(harness.errors,[]);
 }finally{if(harness)await harness.close();await rm(temporary,{recursive:true,force:true});}
});

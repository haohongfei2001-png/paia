import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {cp,mkdir,mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,relative,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {FakeChatGPT,eventually} from './harness/fake-chatgpt.mjs';

const root=fileURLToPath(new URL('..',import.meta.url));
const cases=[
 'deep-read-pagination-and-revocation','default-denied','commit-replay-human-takeover-delete-undo','post-commit-regrant-before-settlement',
 ...['maintain','snapshot','shallow','recovery'].map(path=>path+'-hash-race'),
 ...['item','receipt','post-callback'].flatMap(phase=>['cancel','revoke'].map(kind=>phase+'-'+kind)),
 'post-callback-expiry','closed-database-before-write','denied-input-before-hash'
];

// The harness supplies only an offline extension origin. All domain calls use
// production modules, separate native databases and synthetic local settings.
// There is deliberately no new worker route, provider, live verifier or UI claim.
async function install(page){
 await page.evaluate(async()=>{
  const [{OrganizerStore},{ContextMaintenanceService},{ContextCardsService,CONTEXT_CARDS_ROW},
   {ContextReadService},{ContextTopicAccessService},{readContextTopicScope},{inputProjection},{hashText},{DATABASE_NAME}]=await Promise.all([
   import(chrome.runtime.getURL('core/organizer/store.js')),
   import(chrome.runtime.getURL('core/context-maintenance.js')),
   import(chrome.runtime.getURL('core/context-cards.js')),
   import(chrome.runtime.getURL('core/context-read.js')),
   import(chrome.runtime.getURL('core/context-topic-access.js')),
   import(chrome.runtime.getURL('core/context-topic-scope.js')),
   import(chrome.runtime.getURL('core/thought-evidence.js')),
   import(chrome.runtime.getURL('core/dedupe.js')),
   import(chrome.runtime.getURL('core/idb-repository.js'))
  ]);
  const op=()=>crypto.randomUUID(),body='SYNTHETIC native selected Input body',
   note='SYNTHETIC native selected Input note',candidate='SYNTHETIC native automatic Item',
   manualBody='SYNTHETIC native independent manual Item',humanBody='SYNTHETIC native human takeover';
  const assertion=label=>Object.assign(Error(label),{ctx4Assertion:label});
  const check=(value,label)=>{if(!value)throw assertion(label);};
  const equal=(actual,expected,label)=>check(JSON.stringify(actual)===JSON.stringify(expected),label);
  const settled=promise=>Promise.resolve(promise).then(value=>({fulfilled:true,value}),error=>({fulfilled:false,code:error?.code||null}));
  const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};
  const bounded=async(promise,label,ms=10000)=>{
   let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(assertion(label)),ms);})]);}
   finally{clearTimeout(timer);}
  };
  check(indexedDB instanceof IDBFactory&&/\[native code\]/.test(IDBFactory.prototype.open.toString()),'Browser IndexedDB is native');
  check(crypto.subtle instanceof SubtleCrypto&&/\[native code\]/.test(SubtleCrypto.prototype.digest.toString()),'Browser WebCrypto is native');
  const nativeRequest=request=>new Promise((resolve,reject)=>{
   request.addEventListener('success',()=>resolve(request.result),{once:true});
   request.addEventListener('error',()=>reject(Error('Native fixture request failed')),{once:true});
  });
  // Full durable owner oracle. No body/provenance/revision table is projected
  // away; comparisons stay in the browser and never enter the trace artifact.
  async function inspect(db,names){
   const tx=db.transaction(names,'readonly'),done=new Promise((resolve,reject)=>{
    tx.addEventListener('complete',resolve,{once:true});
    tx.addEventListener('abort',()=>reject(Error('Native oracle aborted')),{once:true});
   });
   done.catch(()=>{});
   const rows=await Promise.all(names.map(async name=>[name,await nativeRequest(tx.objectStore(name).getAll())]));
   await done;return Object.fromEntries(rows);
  }
  async function fixture({worker=false}={}){
   const values={},syntheticLocal={async get(key){return {[key]:structuredClone(values[key])};},
    async set(changes){Object.assign(values,structuredClone(changes));}};
   // Only the separately launched disposable worker profile uses its app DB.
   // Ordinary domain cases keep the harness app DB and settings unchanged.
   const local=worker?chrome.storage.local:syntheticLocal,name=worker?DATABASE_NAME:'paia-ctx4-05-native-'+op();
   check(worker||name!==DATABASE_NAME,'Domain fixture must not use the app database');
   const s=new OrganizerStore(local,{indexedDB:globalThis.indexedDB,name});
   await s.consent(true);
   await s.capture({epoch:(await s.status()).epoch,adapterVersion:'0.3.0',
    chat:{id:'ctx4-05-synthetic-chat',url:'https://chatgpt.com/c/ctx4-05-synthetic-chat',title:'SYNTHETIC native Context'},
    messages:[{sourceMessageId:'ctx4-05-synthetic-message',pageOrder:1,originalText:'SYNTHETIC immutable Source'}]});
   await s.finishFoundation();await s.setFilterMode('off');
   const input=(await s.snapshot()).library.blocks[0],topic=await s.createTopic({operationId:op(),name:'SYNTHETIC native processing Topic'});
   const edit=async changes=>{const current=await s.input(input.id);return s.editDocument({operationId:op(),documentId:current.documentId,
    blocks:[{id:current.id,expectedRevision:current.revision,libraryText:current.libraryText,note:current.note,excluded:current.excluded,...changes}]});};
   await edit({libraryText:body,note});
   const current=await s.input(input.id);
   check(!(await s.addToTopics({operationId:op(),kind:'input',id:input.id,expectedRevision:current.revision,topicIds:[topic.id]})).conflict,'Fixture Input placement');
   await s.continueThinking({operationId:op(),body:'SYNTHETIC independently protected Thought',topicId:topic.id});
   const cards=new ContextCardsService(s),caller=Object.freeze({handle:op()}),revocation=new AbortController();
   const state={processing:true,generation:1,expiresAt:Date.now()+600000,scope:null,verifyCount:0,verifyHook:null};
   const verifier={async verify(actual,store,scope){
    state.verifyCount++;state.scope=structuredClone(scope);await state.verifyHook?.(state.verifyCount);
    if(actual!==caller||store!==s)return null;
    return {version:1,store:s,accountId:'synthetic-native-account',processorId:'synthetic-native-processor',
     authorizationGeneration:state.generation,scope,processing:state.processing,expiresAt:state.expiresAt,revocationSignal:revocation.signal};
   },isCurrent(actual,receipt,store){return actual===caller&&store===s&&receipt.accountId==='synthetic-native-account'
    &&receipt.processorId==='synthetic-native-processor'&&receipt.authorizationGeneration===state.generation;}};
   const service=new ContextMaintenanceService(s,{processingVerifier:verifier});
   const readerCaller=Object.freeze({handle:op()}),connectionVerifier={async verify(actual,store){return actual===readerCaller&&store===s?
    {version:1,store:s,connectionId:'synthetic-native-connection',accountId:'synthetic-native-account',authorizationGeneration:1,
     readable:true,online:true,expiresAt:Date.now()+60000}:null;},isCurrent(actual,receipt,store){return actual===readerCaller&&store===s;}};
   const reader=new ContextReadService(s,{connectionVerifier});
   const observer=await nativeRequest(indexedDB.open(name)),names=[...s.repository.stores];
   const snapshot=()=>inspect(observer,names);
   const owners=await snapshot();
   check(owners.records.length>0&&owners.blocks.length>0&&owners.inputStates.length>0
    &&owners.thoughts.some(row=>row.thoughtText==='SYNTHETIC independently protected Thought'&&row.protections.body.locked),
   'Preservation oracle contains real Source, Input and human-protected Thought');
   const request=async(card='info')=>{
    const scope=await readContextTopicScope(s,{topicId:topic.id});check(scope.available,'Native fixture scope available');
    const projection=await s.repository.transaction(false,t=>inputProjection(s,t,input.id));
    return {operationId:op(),epoch:scope.binding.epoch,itemId:op(),card,expectedRevision:0,body:candidate,section:'SYNTHETIC section',
     associationIds:[op()],evidence:[{topicId:topic.id,inputId:input.id,selectedFields:['body','note'],
      fieldDigests:{body:await hashText(projection.body),note:await hashText(projection.note)},
      expectedTopicBinding:scope.binding,expectedRemovalSequence:projection.lastRemovalSequence}]};
   };
   const outcome=async c=>service.outcome(caller,{operationId:c.operationId,digest:await hashText(JSON.stringify(c)),epoch:c.epoch,scope:state.scope});
   const row=async()=>s.repository.transaction(false,t=>t.get('meta',CONTEXT_CARDS_ROW));
   const put=c=>service.maintain(caller,c);
   const manual=(c,text=humanBody,revision=1)=>({kind:'put',operationId:op(),epoch:c.epoch,itemId:c.itemId,card:c.card,
    expectedRevision:revision,body:text,section:'SYNTHETIC human section'});
   const draft=c=>({kind:'context_item',ownerId:c.itemId,epoch:c.epoch,sourceRecordIds:[],
    operation:{type:'PAIA_CONTEXT_CARDS_CHANGE',change:manual(c)}});
   const open=async()=>{for(const key of ['global','info','rules','now'])await cards.change({kind:'access',operationId:op(),epoch:'initial',key,
    enabled:true,expectedRevision:(await row())?.access[key].revision||0});};
   const close=async()=>{observer.close();await s.repository.close();if(!worker)await nativeRequest(indexedDB.deleteDatabase(name));};
   return {s,name,input,topic,cards,caller,revocation,state,verifier,service,reader,readerCaller,edit,snapshot,request,outcome,row,put,manual,draft,open,close};
  }
  function probe(f,events){
   const active=new Set(),ids=new WeakMap(),terminal=new Map(),native={
    transaction:IDBDatabase.prototype.transaction,put:IDBObjectStore.prototype.put,open:IDBFactory.prototype.open,digest:SubtleCrypto.prototype.digest};
   let transactionSequence=0;
   const p={active,ids,terminal,hashes:0,selectedHashes:0,opens:0,hashHook:null,putHook:null,restore:null};
   const mark=(event,detail={})=>events.push({sequence:events.length,event,...detail});p.mark=mark;
   IDBDatabase.prototype.transaction=function(...args){
    const tx=Reflect.apply(native.transaction,this,args);if(this.name!==f.name)return tx;
    const id=++transactionSequence;ids.set(tx,id);active.add(tx);mark('transaction-start',{transaction:id,mode:tx.mode});
    for(const event of ['complete','abort'])tx.addEventListener(event,()=>{active.delete(tx);terminal.set(tx,event);mark('transaction-'+event,{transaction:id});},{once:true});
    return tx;
   };
   IDBFactory.prototype.open=function(...args){if(args[0]===f.name){p.opens++;mark('database-open');}return Reflect.apply(native.open,this,args);};
   IDBObjectStore.prototype.put=function(...args){
    const request=Reflect.apply(native.put,this,args),tx=this.transaction,value=args[0];
    if(tx.db.name===f.name){
     const phase=this.name==='meta'&&value?.id===CONTEXT_CARDS_ROW?'item':this.name==='operationReceipts'&&value?.namespace==='context-maintenance'?
      'receipt':this.name==='meta'&&value?.id==='backup-data-generation'?'post-callback':null;
     if(phase){mark('put-issued',{transaction:ids.get(tx),phase});request.addEventListener('success',()=>{
      mark('put-success',{transaction:ids.get(tx),phase});p.putHook?.({phase,tx,store:this,request});
     },{once:true});}
    }
    return request;
   };
   SubtleCrypto.prototype.digest=function(...args){
    const bytes=args[1],text=new TextDecoder().decode(bytes),selected=text===body||text===note;
    p.hashes++;if(selected)p.selectedHashes++;
    mark('native-digest-start',{selected,activeTransactions:active.size});
    // Never substitute a digest or run an implementation of SHA in the test.
    const digest=Reflect.apply(native.digest,this,args);
    return (async()=>{if(p.hashHook)await p.hashHook({selected,note:text===note});const result=await digest;
     mark('native-digest-resolved',{selected,activeTransactions:active.size});return result;})();
   };
   p.restore=()=>{IDBDatabase.prototype.transaction=native.transaction;IDBObjectStore.prototype.put=native.put;
    IDBFactory.prototype.open=native.open;SubtleCrypto.prototype.digest=native.digest;};
   return p;
  }
  const protectedOwners=snapshot=>Object.fromEntries(Object.entries(snapshot).filter(([name])=>!['meta','operationReceipts'].includes(name)));
  const bodyFree=value=>![body,note,candidate,manualBody,humanBody,'SYNTHETIC section','SYNTHETIC human section'].some(text=>JSON.stringify(value).includes(text));
  async function run(name){
   const events=[],f=await fixture();let p=null,result={name,passed:false,events};
   try{
    const c=await f.request();
    if(name==='deep-read-pagination-and-revocation'){
     const access=new ContextTopicAccessService(f.s),expected=new Map();
     const text='SYNTHETIC 多字节🙂e\u0301 '+('尾部🙂 '.repeat(9))+' EXACT_TAIL';
     await f.edit({libraryText:text,note:'SYNTHETIC_NOTE_尾🙂'});
     // Bind the final Working revision, not the earlier maintenance fixture's stale placement.
     f.topic=await f.s.createTopic({operationId:op(),name:'SYNTHETIC deep read Topic'});
     const updated=await f.s.input(f.input.id);check(!(await f.s.addToTopics({operationId:op(),kind:'input',id:f.input.id,expectedRevision:updated.revision,topicIds:[f.topic.id]})).conflict,'Final Working revision bound');
     await f.s.continueThinking({operationId:op(),body:'SYNTHETIC independent Thought excluded from Input reading',topicId:f.topic.id});expected.set(f.input.id,{body:text,note:'SYNTHETIC_NOTE_尾🙂'});
     for(let i=0;i<2;i++){
      const content='SYNTHETIC additional '+i+'🙂 EXACT_TAIL';
      await f.s.capture({epoch:(await f.s.status()).epoch,adapterVersion:'0.3.0',chat:{id:'native-deep-'+i,url:'https://chatgpt.com/c/native-deep-'+i,title:'SYNTHETIC'},messages:[{sourceMessageId:'native-deep-'+i,pageOrder:1,originalText:content}]});
      const input=(await f.s.snapshot()).library.blocks.find(x=>!expected.has(x.id));check(input,'Additional actual Input exists');
      const current=await f.s.input(input.id);check(!(await f.s.addToTopics({operationId:op(),kind:'input',id:input.id,expectedRevision:current.revision,topicIds:[f.topic.id]})).conflict,'Additional whole Input placed');expected.set(input.id,{body:content,note:''});
     }
     await f.s.finishFoundation();
     const toggle=async(key,enabled)=>{const row=await f.row();check((await f.cards.change({kind:'access',operationId:op(),epoch:'initial',key,enabled,expectedRevision:row?.access[key].revision||0})).ok,'Real access owner acknowledged');};
     const topicToggle=async enabled=>{const scope=await readContextTopicScope(f.s,{topicId:f.topic.id}),row=await f.s.repository.transaction(false,t=>access.row(t)),choice=row.choices.find(x=>x.topicId===f.topic.id);const answer=await access.change({operationId:op(),topicId:f.topic.id,epoch:scope.binding.epoch,enabled,expectedBinding:scope.binding,expectedRevision:choice?.revision||0});check(answer.ok,'Real Topic access owner acknowledged: '+answer.reason);};
     await toggle('global',true);await toggle('inputs',true);await topicToggle(true);
     const opts={topicId:f.topic.id,limit:2,chunkSize:7},baseline=await f.snapshot(),segments=new Map();let cursor=null,pages=0;
     do{const page=await f.reader.readTopic(f.readerCaller,{...opts,cursor});check(page.available,'Deep read available');equal(page.complete,page.nextCursor===null,'True end matches cursor');check(page.items.length<=2,'Bounded read page');
      for(const part of page.items){check(expected.has(part.inputId),'Only permitted whole Inputs');equal(part.authority,'data','Input content is data');const key=part.inputId+':'+part.field,prior=segments.get(key)||'';equal(part.offset,prior.length,'Exact contiguous original offsets');check(!/^[\uDC00-\uDFFF]|[\uD800-\uDBFF]$/u.test(part.text),'Unicode pair stays intact');segments.set(key,prior+part.text);equal(part.fieldComplete,part.end===part.totalLength,'Honest field terminal');}
      cursor=page.nextCursor;check(++pages<100,'Bounded traversal reaches end');
     }while(cursor);check(pages>1,'Actually traversed multiple pages');
     for(const [id,fields]of expected)for(const field of ['body','note'])equal(segments.get(id+':'+field),fields[field],'Complete exact original field reconstructed');equal(segments.size,6,'No independent Thought prose returned');
     const hits=[];cursor=null;do{const page=await f.reader.searchTopic(f.readerCaller,{topicId:f.topic.id,query:'EXACT_TAIL',limit:1,cursor});check(page.available,'Tail search available');hits.push(...page.items);cursor=page.nextCursor;equal(page.complete,cursor===null,'Search true end');}while(cursor);
     equal([...new Set(hits.map(x=>x.inputId))].sort(),[...expected.keys()].sort(),'Search finds all exact tail identities');check(hits.every(x=>x.snippet.includes('EXACT_TAIL')),'Tail snippets contain real match');
     const refused=r=>{check(!r.available,'Unauthorized/stale read unavailable');check(!r.items?.length,'Refusal leaks no rows');};
     refused(await f.reader.readTopic(f.readerCaller,{...opts,inputId:f.input.id}));refused(await f.reader.readTopic(f.readerCaller,{...opts,archive:true}));equal(await f.snapshot(),baseline,'Read and search never mutate durable owners');
     const first=await f.reader.readTopic(f.readerCaller,opts);check(first.nextCursor,'Cursor exists before revocation');await topicToggle(false);refused(await f.reader.readTopic(f.readerCaller,{...opts,cursor:first.nextCursor}));refused(await f.reader.readTopic(f.readerCaller,opts));await topicToggle(true);
     const second=await f.reader.readTopic(f.readerCaller,opts);await toggle('global',false);refused(await f.reader.readTopic(f.readerCaller,{...opts,cursor:second.nextCursor}));await toggle('global',true);
     const fourth=await f.reader.readTopic(f.readerCaller,opts),nativeNow=Date.now;check(fourth.available&&fourth.nextCursor,'Live cursor exists before controlled TTL expiry');
     try{const future=nativeNow()+300001;Date.now=()=>future;const expired=await f.reader.readTopic(f.readerCaller,{...opts,cursor:fourth.nextCursor});refused(expired);equal(expired.reason,'stale_cursor','Expired cursor is specifically refused');}finally{Date.now=nativeNow;}
     // Clock injection covers local cursor TTL, not real host/session expiry.
     check((await f.reader.readTopic(f.readerCaller,opts)).available,'Fresh qualified read works after expired cursor');
     const third=await f.reader.readTopic(f.readerCaller,opts);await f.edit({libraryText:text+' changed'});refused(await f.reader.readTopic(f.readerCaller,{...opts,cursor:third.nextCursor}));

    }else if(name==='default-denied'){
     const before=await f.snapshot();p=probe(f,events);
     const denied=await settled(new ContextMaintenanceService(f.s).maintain({processing:true},c));
     check(!denied.fulfilled,'Default verifier must deny maintenance');
     equal([p.hashes,p.opens,events.length],[0,0,0],'Default denial must precede hashing and storage');
     equal(await f.snapshot(),before,'Default denial preserves every durable owner');
     const visible=await f.cards.snapshot();check(!visible.capabilities.automatic&&!visible.capabilities.external,'No automatic or external capability activation');
    }else if(name==='commit-replay-human-takeover-delete-undo'){
     const before=await f.snapshot();p=probe(f,events);
     const created=await f.put(c);equal(created,{ok:true,itemId:c.itemId,revision:1,disposition:'created',externalAllowed:false},'Native create exact result');
     const saved=await f.snapshot();equal(await f.put(c),created,'Exact replay result');equal(await f.snapshot(),saved,'Replay has no durable side effects');
     const recovered=await f.outcome(c);equal(recovered,{state:'committed',result:created,externalAllowed:false},'Lost acknowledgement recovers exact receipt');
     check(bodyFree(recovered),'Outcome exposes no body or section');
     const receipt=saved.operationReceipts.find(r=>r.id==='context-maintenance:'+c.operationId);check(receipt&&bodyFree(receipt),'Maintenance receipt is body-free');
     equal(receipt.digest,await hashText(JSON.stringify(c)),'Receipt uses actual SHA-256 request digest');
     const updated={...c,operationId:op(),expectedRevision:1,body:'SYNTHETIC native refreshed Item',associationIds:[...c.associationIds,op()]};
     equal((await f.put(updated)).disposition,'updated','Automatic update');
     const refreshed=(await f.row()).items[0];equal(refreshed.revision,2,'Automatic update revision');equal(refreshed.body,updated.body,'Automatic update body');
     const duplicate=await f.put({...updated,operationId:op(),itemId:op(),expectedRevision:0});
     check(duplicate.disposition==='duplicate'&&duplicate.itemId===c.itemId,'Association suppresses replacement identity');
     await f.cards.change(f.manual(c,humanBody,2));const protectedItem=(await f.row()).items[0];
     check(protectedItem.origin==='automatic'&&protectedItem.protected&&protectedItem.userEdited,'Human takeover is permanent');
     equal(protectedItem.maintenance,refreshed.maintenance,'Takeover preserves all source lineage and associations');
     for(const itemId of [c.itemId,op()])check((await f.put({...updated,operationId:op(),itemId,expectedRevision:3})).disposition==='protected','Protected association refuses maintenance');
     equal((await f.row()).items,[protectedItem],'Suppression cannot rewrite protected Item');
     const deletion={kind:'delete',operationId:op(),epoch:c.epoch,itemId:c.itemId,expectedRevision:3};await f.cards.change(deletion);
     const removed=(await f.row()).items[0];check(removed.lifecycle==='removed'&&removed.deletedBy===deletion.operationId,'Deletion keeps stable tombstone');
     check((await f.put({...updated,operationId:op(),itemId:op(),expectedRevision:0})).disposition==='removed','Deleted association prevents recreation');
     equal((await f.cards.snapshot()).items,[],'Deleted Item stays absent from local reads');
     await f.cards.change({kind:'restore',operationId:op(),epoch:c.epoch,itemId:c.itemId,expectedRevision:4,deletedBy:deletion.operationId});
     const restored=(await f.row()).items[0];check(restored.protected&&restored.userEdited&&restored.body===humanBody,'Undo preserves takeover');
     check((await f.put({...updated,operationId:op(),expectedRevision:5})).disposition==='protected','Undo does not restore automatic authority');
     equal((await f.row()).items,[restored],'No replacement Item or overwrite after Undo');
     f.state.processing=false;f.revocation.abort();equal(await f.put(c),created,'Revoked processing can acknowledge exact committed history');
     check(!(await settled(f.put({...updated,operationId:op(),expectedRevision:5}))).fulfilled,'Revoked processing cannot create new maintenance');
     const historic=await f.snapshot(),granted=new AbortController(),verify=f.verifier.verify.bind(f.verifier);
     f.state.generation++;f.state.processing=true;
     f.verifier.verify=async(...args)=>({...await verify(...args),revocationSignal:granted.signal});
     const previousGeneration=await settled(f.put(c));
     check(!previousGeneration.fulfilled&&previousGeneration.code==='INVALID_REQUEST','Regrant cannot replay a prior-generation receipt');
     equal(await f.outcome(c),{state:'unknown',externalAllowed:false},'Prior-generation outcome cannot cross the authorization identity');
     equal(await f.snapshot(),historic,'Cross-generation queries preserve every durable owner and historical receipt');
     const currentGeneration={...updated,operationId:op(),expectedRevision:5};
     equal((await f.put(currentGeneration)).disposition,'protected','Current-generation fresh request retains human protection');
     equal((await f.outcome(currentGeneration)).state,'committed','Current-generation receipt acknowledges its own fresh operation');
     equal((await f.row()).items,[restored],'Regrant never overwrites the human-owned Item');
     equal(protectedOwners(await f.snapshot()),protectedOwners(before),'Source, Input, Thought and all protected owner rows unchanged');
     const visible=await f.cards.snapshot();check(!visible.capabilities.automatic&&!visible.capabilities.external&&!visible.access.global.enabled,'Dormant capabilities and external access stay off');
     check(p.selectedHashes>0,'Native selected-field WebCrypto actually ran');
    }else if(name==='post-commit-regrant-before-settlement'){
     const transaction=f.s.repository.transaction.bind(f.s.repository),arrived=deferred(),release=deferred(),before=await f.snapshot();
     let held=false,receiptWrites=0,writeTransactions=0;
     p=probe(f,events);
     f.s.repository.transaction=async(write,fn,stores)=>{
      let nativeTransaction;
      const value=await transaction(write,async t=>{if(write){writeTransactions++;nativeTransaction=t.tx;const save=t.put.bind(t);t.put=async(name,row)=>{if(name==='operationReceipts'&&row.namespace==='context-maintenance')receiptWrites++;return save(name,row);};}return fn(t);},stores);
      if(write&&!held&&value?.ok&&value.itemId===c.itemId){
       held=true;check(p.terminal.get(nativeTransaction)==='complete','The acknowledgement barrier follows the actual native commit');
       p.mark('maintenance-native-commit-before-settlement',{transaction:p.ids.get(nativeTransaction)});arrived.resolve();await release.promise;
      }
      return value;
     };
     const original=f.put(c),originalResult=settled(original);
     try{
      await bounded(Promise.race([arrived.promise,originalResult.then(()=>{throw assertion('Operation settled before its native commit barrier');})]),'Native committed acknowledgement barrier did not arrive');
      const stored=await f.snapshot();check(receiptWrites===1&&writeTransactions===1,'One native transaction and receipt committed');
      equal(stored.meta.find(row=>row.id===CONTEXT_CARDS_ROW).items[0].revision,1,'Committed Item has revision one');
      equal(stored.operationReceipts.find(row=>row.id==='context-maintenance:'+c.operationId).authorizationGeneration,1,'Committed receipt retains generation one');
      check(f.put(c)===original,'Same-generation bound request shares the pending acknowledgement');
      f.state.processing=false;f.revocation.abort();check(f.put(c)===original,'Same-generation revoked processing still shares committed history');
      f.state.generation++;f.state.processing=true;const granted=new AbortController(),verify=f.verifier.verify.bind(f.verifier);
      f.verifier.verify=async(...args)=>({...await verify(...args),revocationSignal:granted.signal});
      const joined=f.put(c);check(joined!==original,'A new generation cannot join the old bound promise');
      equal(await settled(joined),{fulfilled:false,code:'CONTEXT_INVALIDATED'},'New-generation pending join explicitly refuses');
      equal(await f.outcome(c),{state:'unknown',externalAllowed:false},'New-generation outcome cannot acknowledge the old committed identity');
      equal(await f.snapshot(),stored,'Pending retry and outcome preserve every durable row');
      release.resolve();const acknowledged=await originalResult;
      check(acknowledged.fulfilled,'The originally authorized call retains its durable acknowledgement');
      equal(acknowledged.value,{ok:true,itemId:c.itemId,revision:1,disposition:'created',externalAllowed:false},'Original native commit is acknowledged exactly');
      equal(await settled(f.put(c)),{fulfilled:false,code:'INVALID_REQUEST'},'Settled receipt replay uses the distinct persisted-identity refusal');
      equal(await f.snapshot(),stored,'No second write or receipt occurs after settlement');
      check(receiptWrites===1&&writeTransactions===1,'Exactly one write transaction and receipt remain');
      equal(protectedOwners(stored),protectedOwners(before),'Source, Input, Thought and other protected owners remain unchanged');
      p.mark('maintenance-new-generation-join-refused-original-acknowledged');
     }finally{release.resolve();await originalResult;f.s.repository.transaction=transaction;}
    }else if(name.endsWith('-hash-race')){
     const path=name.slice(0,-10);let draft,sources,manual;
     if(path!=='maintain'){
      await f.put(c);await f.cards.change(f.manual(c));
      manual={...f.manual(c,manualBody,0),itemId:op()};await f.cards.change(manual);
      draft={...f.draft(c),operation:{type:'PAIA_CONTEXT_CARDS_CHANGE',change:f.manual(c,humanBody,2)}};
      sources=await f.cards.recoverySources(draft);check(sources.length>0,'Automatic recovery has canonical source ownership');
      if(path==='shallow')await f.open();
     }
     const before=await f.snapshot();p=probe(f,events);const entered=deferred(),release=deferred();let held=false;
     p.hashHook=async info=>{if(!held&&info.note){held=true;p.mark('selected-note-digest-held',{activeTransactions:p.active.size});entered.resolve();await release.promise;}};
     const read=()=>path==='maintain'?f.put(c):path==='snapshot'?f.cards.snapshot():path==='shallow'?f.reader.shallow(f.readerCaller):
      f.cards.recoverySources({...draft,sourceRecordIds:sources},{stored:true});
     const pending=settled(read());
     try{
      await bounded(Promise.race([entered.promise,pending.then(()=>{throw assertion('Read finished before selected-field hash barrier');})]),'Selected-field native digest did not start');
      equal(p.active.size,0,'Selected-field material transaction completed before WebCrypto');
      // The Topic dependency uses body only. This note barrier therefore
      // intercepts the shared automatic-lineage owner, not scope hashing.
      const edited=await f.edit({libraryText:'SYNTHETIC native edit while digest result is pending'});check(!edited?.conflict,'Actual concurrent Input edit committed');
      p.mark('concurrent-input-edit-committed');const afterEdit=await f.snapshot();
      equal(afterEdit.records,before.records,'Concurrent Input edit preserves immutable Source');
      release.resolve();p.mark('selected-note-digest-released');const outcome=await bounded(pending,'Race did not settle');
      if(path==='snapshot'){
       check(outcome.fulfilled,'Domain snapshot preserves independently readable manual work');
       equal(outcome.value.items.map(x=>x.id),[manual.itemId],'Incomplete snapshot exposes no automatic body');
       equal(outcome.value.automaticEvaluation,{complete:false,reason:'unavailable'},'Snapshot explicitly reports incomplete automatic evaluation');
       equal(outcome.value.counts,{info:null,rules:0,now:0,inputs:0},'Incomplete affected-card count is unknown, not zero');
      }else if(path==='shallow'){
       check(outcome.fulfilled,'Shallow race returns its normal fail-closed DTO');
       const value=outcome.value;check(value.available===false&&value.complete===false&&value.nextCursor===null&&value.externalAllowed===false,'Shallow final fence refuses availability, cursor and completion');
       equal(value.items,[],'Shallow race leaks no stale Items');check(bodyFree(value),'Shallow refusal is body-free');
      }else check(!outcome.fulfilled&&outcome.code===(path==='recovery'?'UNAVAILABLE':'CONTEXT_INVALIDATED'),'Final lineage fence refuses changed authority');
      equal(await f.snapshot(),afterEdit,'Race changes no durable owners beyond the explicit Input edit');
      if(path==='maintain')check((await f.outcome(c)).state==='not_committed','Invalidated maintenance leaves no committed receipt');
      else{
       const local=await f.cards.snapshot();equal(local.items.map(x=>x.id),[manual.itemId],'Fresh snapshot filters only stale automatic lineage');
       equal(local.counts.info,1,'Fresh snapshot count excludes stale protected automatic Item');
       equal((await f.row()).items.find(x=>x.id===c.itemId).body,humanBody,'Stale lineage never deletes human takeover');
       if(path==='shallow')equal((await f.reader.shallow(f.readerCaller)).items.map(x=>x.itemId),[manual.itemId],'Fresh shallow retains source-free manual Item');
       check(!(await settled(f.cards.recoverySources({...draft,sourceRecordIds:sources},{stored:true}))).fulfilled,'Stale automatic recovery stays unavailable');
      }
     }finally{release.resolve();await bounded(pending,'Pending race cleanup did not settle');}
    }else if(name==='closed-database-before-write'){
     const before=await f.snapshot();p=probe(f,events);let closed=false;
     f.state.verifyHook=async count=>{if(count===2){await f.s.repository.close();closed=true;p.mark('database-closed-before-write');}};
     const outcome=await settled(f.put(c));check(closed,'Storage closed after evidence hashing and before commit');
     check(!outcome.fulfilled,'Closed database invalidates pending maintenance');check(f.s.repository.db===null,'Maintenance must leave closed database closed');
     equal(p.opens,0,'Maintenance must not reopen or initialize closed storage');
     equal(await f.snapshot(),before,'Independent native observer sees no Item, receipt or protected-owner mutation');
    }else if(name==='denied-input-before-hash'){
     await f.edit({excluded:true});const before=await f.snapshot();p=probe(f,events);
     check(!(await settled(f.put(c))).fulfilled,'Excluded selected Input refuses maintenance');
     equal(p.selectedHashes,0,'Denied Input text must not reach WebCrypto');equal(await f.snapshot(),before,'Denied Input preserves all durable owners');
    }else{
     const expiry=name==='post-callback-expiry',phase=name.startsWith('post-callback')?'post-callback':name.split('-')[0],
      kind=expiry?'expiry':name.endsWith('-cancel')?'cancel':'revoke',cancel=new AbortController();
     const before=await f.snapshot();p=probe(f,events);let target=null,keepAliveRequests=0;
     if(expiry)f.state.verifyHook=count=>{if(count===2)f.state.expiresAt=Date.now()+1000;};
     p.putHook=event=>{
      if(target||event.phase!==phase)return;target=event.tx;
      check(p.active.has(target)&&!p.terminal.has(target),'Put event occurs before native transaction completion');
      if(expiry){
       p.mark('post-callback-expiry-hold',{transaction:p.ids.get(target)});
       // Native requests keep the real transaction pending after the service
       // callback. A request-scoped expiry guard must still abort before commit.
       const keepAlive=()=>{
        if(p.terminal.has(target)||Date.now()>f.state.expiresAt+250)return;
        let request;try{request=event.store.get('backup-data-generation');}catch{return;}
        keepAliveRequests++;request.addEventListener('success',keepAlive,{once:true});
       };keepAlive();
      }else{
       p.mark('control-signal-abort',{transaction:p.ids.get(target),kind});
       (kind==='cancel'?cancel:f.revocation).abort();
      }
     };
     const outcome=await bounded(settled(f.service.maintain(f.caller,c,{signal:cancel.signal})),'Native atomicity operation did not settle');
     check(target,'Expected native put success boundary was reached');check(!outcome.fulfilled,'Pre-complete invalidation rejects maintenance');
     equal(p.terminal.get(target),'abort','The Item and receipt transaction must abort, not complete');
     if(phase!=='item')check(events.some(e=>e.event==='put-success'&&e.phase==='item'&&e.transaction===p.ids.get(target)),'Atomic failure followed actual Item put');
     if(phase==='post-callback')check(events.some(e=>e.event==='put-success'&&e.phase==='receipt'&&e.transaction===p.ids.get(target)),'Post-callback failure followed actual receipt put');
     if(expiry){check(keepAliveRequests>0&&Date.now()>=f.state.expiresAt,'Real expiry elapsed during native pending transaction');p.mark('real-expiry-observed');f.state.expiresAt=Date.now()+60000;}
     equal(await f.snapshot(),before,'Native abort rolls back Item, receipt and every other durable owner');
     equal((await f.outcome(c)).state,'not_committed','Aborted operation cannot claim committed or remain pending');
    }
    if(p)check(events.filter(e=>e.event==='native-digest-start').every(e=>e.activeTransactions===0),'WebCrypto never starts inside a native transaction');
    result.passed=true;result.nativeIndexedDB=true;result.nativeDigestCalls=p?.hashes||0;return result;
   }catch(error){
    // Unexpected exception messages can contain request data. Only our fixed
    // assertion labels or a fixed failure category belong in public evidence.
    result.failure=error.ctx4Assertion||'Unexpected native fixture or production failure';return result;
   }
   finally{p?.restore();await f.close();}
  }
  const residentDrafts=async()=>Object.entries(await chrome.storage.local.get(null))
   .filter(([key])=>key.startsWith('paia-recovery-draft:v1:context_item:')).sort(([a],[b])=>a.localeCompare(b));
  let workerFixture=null,workerBeforeEdit=null,workerAfterEdit=null,workerSavedRow=null,workerSavedDrafts=null;
  globalThis.__ctx4Native={run,async prepareWorker(){
   workerFixture=await fixture({worker:true});
  },async seedWorkerDrafts(){
   const f=workerFixture;
   for(let index=0;index<2;index++){
    const request=await f.request();await f.put(request);
    const draft={...f.draft(request),token:op()};
    const saved=await chrome.runtime.sendMessage({type:'PAIA_RECOVERY_DRAFT_SAVE',draft});
    check(saved.ok&&saved.data.sourceRecordIds.length>0,'Real worker saves source-linked recovery draft');
   }
   const drafts=await chrome.runtime.sendMessage({type:'PAIA_CONTEXT_CARDS_DRAFTS'});
   check(drafts.ok&&drafts.data.length===2,'Real worker initially returns both eligible drafts');
   workerSavedRow=await f.row();workerSavedDrafts=await residentDrafts();
   check(workerSavedDrafts.length===2,'Both original recovery rows are resident');return {draftCount:drafts.data.length};
  },async editWorkerSource(){
   workerBeforeEdit=await workerFixture.snapshot();await workerFixture.edit({libraryText:'SYNTHETIC worker batch concurrent Input edit'});
  },async captureWorkerEditBaseline(){
   workerAfterEdit=await workerFixture.snapshot();equal(workerAfterEdit.records,workerBeforeEdit.records,'Worker race preserves immutable Source');
   equal(await workerFixture.snapshot(),workerAfterEdit,'Complete post-edit owner snapshot is stable after actual maintenance finishes');
  },async verifyWorkerAfter(){
   equal(await workerFixture.snapshot(),workerAfterEdit,'Worker final fence makes no canonical changes after explicit Input edit');
   equal(await workerFixture.row(),workerSavedRow,'Worker invalidation retains both canonical Items and lineage');
   equal(await residentDrafts(),workerSavedDrafts,'Source freshness refusal preserves both complete resident draft bytes and tokens');
   const fresh=await chrome.runtime.sendMessage({type:'PAIA_CONTEXT_CARDS_DRAFTS'});
   equal(fresh,{ok:false,error:'UNAVAILABLE'},'Fresh recovery explicitly refuses stale draft availability with no data');
   equal(await residentDrafts(),workerSavedDrafts,'Repeated unavailable read preserves both complete resident draft bytes and tokens');
   return {canonicalItemsRetained:true,residentDraftsRetained:true,returnedDraftBodies:0};
  },async closeWorker(){await workerFixture?.close();workerFixture=null;}};
 });
}

async function observeWorkerMaintenance(worker,page){
 await worker.evaluate(()=>{
  const {filter,safety,library,cards}=globalThis.__ctx4WorkerOwners||{},owners=new Set([filter,safety,library]);
  if(owners.size!==3||[...owners].some(owner=>typeof owner?.wake!=='function'||owner.store!==library?.store)
   ||cards?.s!==library?.store)throw Error('Actual worker maintenance owners were not observed');
  globalThis.__ctx4Maintenance={owners,async settle(){
   // Filtering and safety invalidation can enqueue Library work. Drain those
   // real owners in that order, including each follow-on wake, so Library
   // cannot finish before the preceding owners queue their derived work.
   for(const owner of owners){await owner.wake();while(owner.running)await owner.running;}
   for(;;){const running=[...owners].map(owner=>owner.running).filter(Boolean);if(!running.length)break;await Promise.all(running);}
   if([...owners].some(owner=>owner.failed||owner.store.libraryMaintenanceFailed))throw Error('Actual worker maintenance failed');
   const store=library.store;
   const foundation=await store.libraryStatus(),filter=await store.filterStatus();
   const pending=await store.repository.transaction(false,async t=>({
    searchComplete:(await t.get('meta','library-search-rebuild'))?.complete===true,
    tasks:(await t.all('libraryMigrationItems')).filter(row=>row.statusKey===0).length
   }),['meta','libraryMigrationItems']);
   if(!foundation.compatibility.complete||foundation.pendingCleanupJobs||foundation.pendingInvalidations||!pending.searchComplete||pending.tasks
    ||(filter.mode!=='off'&&filter.pending)||['running','failed'].includes(filter.taskState)||[...owners].some(owner=>owner.running))
    throw Error('Actual worker maintenance is not settled');
  }};
 });
 // GET_STATUS uses the existing worker dispatch path which wakes all three
 // local owners after responding. The fixture observes the already-created
 // instances; their wake methods and maintenance behavior stay unchanged.
 await page.evaluate(async()=>{const value=await chrome.runtime.sendMessage({type:'GET_STATUS'});if(!value.ok)throw Error('Worker status unavailable');});
}

async function workerRecoveryBatch(extensionPath){
 const temporary=await mkdtemp(join(tmpdir(),'paia-ctx4-05-worker-')),fixturePath=join(temporary,'extension');
 const report={name:'worker-recovery-batch-final-fence',passed:false,events:[]};let h,page,worker,phase='copy-worker-fixture';
 try{
  // MV3 service workers reject dynamic import(), including from evaluate().
  // Keep the selected source/release worker bytes intact and append only a
  // test bridge to its existing production instances in a disposable copy.
  await cp(extensionPath,fixturePath,{recursive:true,dereference:true,
   filter:path=>!relative(extensionPath,path).split(sep).some(name=>['.git','node_modules','work','outputs'].includes(name))});
  const workerPath=join(fixturePath,'background','service-worker.js'),original=await readFile(join(extensionPath,'background','service-worker.js'));
  const bridge=Buffer.from('\n// Disposable native fixture: references only; no replacement owners or dispatch.\nglobalThis.__ctx4WorkerOwners={filter:runner,safety,library:libraryRunner,cards:contextCards};\n');
  await writeFile(workerPath,Buffer.concat([original,bridge]));
  assert.deepEqual(await readFile(workerPath),Buffer.concat([original,bridge]),'Disposable worker retains complete production bytes and only the reference bridge');
  assert.deepEqual(await readFile(join(extensionPath,'background','service-worker.js')),original,'Selected worker payload remains unchanged');
  report.workerInstrumentation='existing-production-owner-references';report.productionWorkerBytesPreserved=true;
  phase='launch-worker-fixture';h=await FakeChatGPT.start({extensionPath:fixturePath});page=h.archive;
  phase='install-page-fixture';await install(page);
  phase='discover-worker';
  worker=h.context.serviceWorkers().find(value=>value.url()===`chrome-extension://${h.extensionId}/background/service-worker.js`);assert.ok(worker);
  phase='observe-worker-maintenance';await observeWorkerMaintenance(worker,page);
  phase='prepare-worker-data';await page.evaluate(()=>__ctx4Native.prepareWorker());
  phase='settle-fixture-maintenance';await worker.evaluate(()=>__ctx4Maintenance.settle());
  phase='seed-worker-drafts';
  assert.equal((await page.evaluate(()=>__ctx4Native.seedWorkerDrafts())).draftCount,2);
  phase='install-native-hooks';await worker.evaluate(()=>{
   const prototype=Object.getPrototypeOf(__ctx4WorkerOwners.cards),recoverySources=prototype.recoverySources,
    digest=SubtleCrypto.prototype.digest,transaction=IDBDatabase.prototype.transaction,active=new Set(),events=[];
   let release;const gate=new Promise(resolve=>{release=resolve;});
   const state={events,active,held:false,notes:0,resolvedNotes:0,validatedDrafts:0,release,mark(event,detail={}){events.push({sequence:events.length,event,...detail});}};
   IDBDatabase.prototype.transaction=function(...args){const tx=Reflect.apply(transaction,this,args);active.add(tx);
    for(const event of ['complete','abort'])tx.addEventListener(event,()=>active.delete(tx),{once:true});return tx;};
   SubtleCrypto.prototype.digest=function(...args){
    const selected=new TextDecoder().decode(args[1])==='SYNTHETIC native selected Input note',ordinal=selected?++state.notes:0;
    const result=Reflect.apply(digest,this,args);
    if(selected)state.mark('worker-selected-note-digest-start',{ordinal,activeTransactions:active.size});
    return (async()=>{const value=await result;if(selected){state.resolvedNotes++;state.mark('worker-selected-note-digest-resolved',{ordinal});}return value;})();
   };
   // Hold delivery of the actual second successful production validation.
   // Its data is unchanged; both native lineage fences have already passed.
   // Only the worker's subsequent aggregate fence can reject the coming edit.
   prototype.recoverySources=async function(...args){
    const value=await Reflect.apply(recoverySources,this,args);
    if(args[1]?.stored&&args[0]?.kind==='context_item'){
     const ordinal=++state.validatedDrafts;state.mark('worker-draft-validation-complete',{ordinal,activeTransactions:active.size});
     if(ordinal===2){state.held=true;state.mark('worker-second-validated-draft-held');await gate;}
    }
    return value;
   };
   state.restore=()=>{release();SubtleCrypto.prototype.digest=digest;IDBDatabase.prototype.transaction=transaction;
    prototype.recoverySources=recoverySources;};globalThis.__ctx4BatchProbe=state;
  });
  phase='second-draft-validation';await page.evaluate(()=>{globalThis.__ctx4BatchPending=chrome.runtime.sendMessage({type:'PAIA_CONTEXT_CARDS_DRAFTS'});});
  await eventually(()=>worker.evaluate(()=>__ctx4BatchProbe.held),'both real worker drafts complete their individual native source validations');
  assert.deepEqual(await worker.evaluate(()=>({notes:__ctx4BatchProbe.notes,resolved:__ctx4BatchProbe.resolvedNotes,
   validated:__ctx4BatchProbe.validatedDrafts,active:__ctx4BatchProbe.active.size})),
   {notes:2,resolved:2,validated:2,active:0},'Both individual validations completed before aggregate race outside native transactions');
  phase='concurrent-input-edit';await page.evaluate(()=>__ctx4Native.editWorkerSource());
  phase='settle-edit-maintenance';await worker.evaluate(()=>__ctx4Maintenance.settle());
  await page.evaluate(()=>__ctx4Native.captureWorkerEditBaseline());
  await worker.evaluate(()=>__ctx4BatchProbe.mark('worker-derived-maintenance-settled'));
  await worker.evaluate(()=>{__ctx4BatchProbe.mark('worker-concurrent-input-edit-committed');__ctx4BatchProbe.release();});
  phase='aggregate-response';const response=await page.evaluate(async()=>{const value=await __ctx4BatchPending;return {ok:value.ok,error:value.error,hasData:Object.hasOwn(value,'data')};});
  assert.deepEqual(response,{ok:false,error:'CONTEXT_INVALIDATED',hasData:false},'Final worker batch fence cannot expose the earlier now-stale draft');
  phase='fresh-read';assert.deepEqual(await page.evaluate(()=>__ctx4Native.verifyWorkerAfter()),{canonicalItemsRetained:true,residentDraftsRetained:true,returnedDraftBodies:0});
  assert.equal(await worker.evaluate(()=>__ctx4BatchProbe.events.filter(event=>event.event==='worker-selected-note-digest-start')
   .every(event=>event.activeTransactions===0)),true,'Worker selected-field WebCrypto always starts outside native transactions');
  phase='network-and-errors';
  assert.equal(h.extensionNetworkRequests,0);assert.equal(h.externalRequests,0);assert.equal(h.deepSeekRequests.length,0);assert.deepEqual(h.errors,[]);
  report.passed=true;report.nativeIndexedDB=true;report.workerCommand='PAIA_CONTEXT_CARDS_DRAFTS';
 }catch(error){
  report.failure='Actual worker recovery batch boundary failed';report.failurePhase=phase;
  // Exception text and stacks may contain bodies. Emit only a fixed category.
  report.failureCategory=['AssertionError','TypeError','ReferenceError','SyntaxError','TimeoutError'].includes(error?.name)?error.name:'Error';
 }
 finally{
  if(worker)report.events=await worker.evaluate(()=>{const value=__ctx4BatchProbe;if(!value)return [];value.restore();return value.events;}).catch(()=>[]);
  try{if(page)await page.evaluate(()=>globalThis.__ctx4Native?.closeWorker()).catch(()=>{});if(h)await h.close();}
  finally{await rm(temporary,{recursive:true,force:true});}
 }
 return report;
}

for(const variant of ['source','release'])test('CTX4-05 native '+variant+' dormant maintenance transaction and lineage fences',{timeout:180000},async t=>{
 const output=join(root,'work','ctx4-05',variant),temporary=await mkdtemp(join(tmpdir(),'paia-ctx4-05-native-'));
 const reports=[];let harness;
 await mkdir(output,{recursive:true});
 try{
  const extensionPath=variant==='source'?root:join(temporary,'release');
  if(variant==='release')execFileSync('python3',[join(root,'scripts','build_current_release.py'),extensionPath],{cwd:root,stdio:'pipe'});
  harness=await FakeChatGPT.start({extensionPath});const page=harness.archive;
  const appSettings=await page.evaluate(()=>chrome.storage.local.get(null));await install(page);
  const record=async report=>{
   reports.push(report);
   const trace=JSON.stringify({variant,syntheticOnly:true,dormantMaintenance:true,
    modelExtractionClaim:false,liveProcessingClaim:false,cases:reports},null,2);
   assert.doesNotMatch(trace,/SYNTHETIC|synthetic-native-account|synthetic-native-processor/,'Mechanism trace contains no fixture bodies or account identity');
   await writeFile(join(output,'mechanism-trace.json'),trace);
   assert.equal(report.passed,true,report.failure||report.name);
  };
  for(const name of cases)await t.test(name,{timeout:20000},async()=>{
   await record(await page.evaluate(name=>globalThis.__ctx4Native.run(name),name));
  });
  assert.deepEqual(await page.evaluate(()=>chrome.storage.local.get(null)),appSettings,'Isolated fixtures preserve actual app settings');
  assert.equal(harness.extensionNetworkRequests,0);assert.equal(harness.externalRequests,0);assert.equal(harness.deepSeekRequests.length,0);
  assert.deepEqual(harness.errors,[]);
  await harness.close();harness=null;
  await t.test('worker-recovery-batch-final-fence',{timeout:20000},async()=>record(await workerRecoveryBatch(extensionPath)));
 }finally{
  if(harness)await harness.close();await rm(temporary,{recursive:true,force:true});
 }
});

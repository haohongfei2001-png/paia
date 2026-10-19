import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,derived} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import * as actionOwner from '../background/organize-action-source.js';
import {captureOriginalOrganizeScope,releaseOriginalOrganizeScope} from '../core/organizer/organize-processing-scope.js';
import {captureOrganizeProcessingGrant,releaseOrganizeProcessingGrant} from '../background/organize-processing-policy.js';
import {createOrganizeFilterVisibilityScope,takeFilterVisibilityConsumerOperations} from '../core/ai-usage/filter-visibility-consumer-scope.js';
import {configDefault} from '../core/memory/model.js';

const event=()=>({addListener(){},removeListener(){}});
async function fixture(t,{localOnly=false}={}){
 const {s}=await setup(OrganizerStore),inputId=await s.repository.transaction(false,async tx=>(await tx.all('blocks'))[0].id),entry=await derived(s,[inputId]),topic=await s.createTopic({name:'Private selected Topic',operationId:crypto.randomUUID()});
 await s.placeEntry({topicId:topic.id,entryId:entry.id,expectedEntryRevision:entry.revision,expectedTopicRevision:(await s.topic(topic.id)).organizationRevision,operationId:crypto.randomUUID()});
 const operationId=crypto.randomUUID();
 // These rows are metadata discovery fixtures, never a historical ACK witness
 // and never evidence that a generated decision is valid or may hide content.
 await s.repository.transaction(true,async tx=>{const row=await tx.get('filterInputs',inputId);await tx.put('filterInputs',{...row,aiOperationId:operationId,aiDecision:{version:1,proof:{private:'must not read'}}});if(localOnly)await tx.put('meta',{...configDefault(),localOnly:true});});
 const sender={id:'synthetic',frameId:0,documentId:'document',url:'chrome-extension://synthetic/ui/archive.html',tab:{id:1,windowId:2,incognito:false}},api={runtime:{id:sender.id,getURL:p=>'chrome-extension://synthetic/'+p,async getContexts(){return [{contextType:'TAB',documentId:sender.documentId,documentUrl:sender.url,tabId:1,windowId:2,frameId:0,incognito:false}];}},tabs:{onUpdated:event(),onRemoved:event(),async get(){return {...sender.tab,url:sender.url};}}};
 const source=actionOwner.createOrganizeActionSource(s,api);t.after(()=>{source.dispose();s.repository.db?.close();});
 const selected=await source.select(sender,{topicId:topic.id}),action=await source.consume(sender,{topicId:topic.id,scopeBinding:selected.scopeBinding,userActionId:crypto.randomUUID()});
 const capture=({before=null,after=null,grantValue=value=>value}={})=>s.run(()=>s.repository.transaction(false,async tx=>{
  const proof=await captureOriginalOrganizeScope(s,tx,topic.id);let grant;
  try{grant=captureOrganizeProcessingGrant(source,action,s,tx,proof);if(before)await before(tx,proof);const admission=await actionOwner.captureOriginalOrganizeFilterSelection(source,action,s,tx,proof,grantValue(grant));if(after)await after(tx,proof,admission);return admission;}
  finally{if(grant)releaseOrganizeProcessingGrant(grant);releaseOriginalOrganizeScope(proof);}
 }));
 const take=(token,visit=null)=>s.run(()=>s.repository.transaction(false,async tx=>{if(visit)visit(tx);return takeFilterVisibilityConsumerOperations(s,token,tx);},['meta','filterInputs']));
 return {s,source,action,topic,inputId,operationId,capture,take};
}
function watchMetadata(tx,counts){
 const objectStore=tx.tx.objectStore.bind(tx.tx);tx.tx.objectStore=name=>{
  const store=objectStore(name),get=store.get.bind(store);store.get=key=>{
   counts.gets.push([name,key]);const request=get(key);request.addEventListener('success',()=>{
    const row=request.result;if(name!=='filterInputs'||!row)return;
    for(const key of ['futurePrivateText','body','note'])Object.defineProperty(row,key,{enumerable:true,configurable:true,get(){counts.text++;throw Error('Unselected semantic field');}});
    if(row.aiDecision)Object.defineProperty(row.aiDecision,'proof',{enumerable:true,configurable:true,get(){counts.text++;throw Error('Unselected historical proof');}});
   });return request;
  };return store;
 };
}

test('real consumed Organize action prepares only its complete selected Input metadata after independent purpose admission',async t=>{
 const f=await fixture(t),admission=await f.capture(),metadata=actionOwner.readOriginalOrganizeFilterSelection(admission,f.s);
 assert.ok(Object.isFrozen(metadata));assert.ok(Object.isFrozen(metadata.inputIds));assert.deepEqual(metadata.inputIds,[f.inputId]);assert.equal(typeof metadata.authority,'string');
 const scope=createOrganizeFilterVisibilityScope(f.s,admission);assert.ok(scope);
 assert.deepEqual(await f.take(scope),[f.operationId]);assert.equal(await f.take(scope),null,'preparation scope is one-use');assert.equal(createOrganizeFilterVisibilityScope(f.s,admission),null,'the original admission cannot mint another preparation scope');
});

test('Organize metadata preparation never evaluates body, note, unknown properties or historical proof',async t=>{
 const f=await fixture(t),scope=createOrganizeFilterVisibilityScope(f.s,await f.capture()),counts={gets:[],text:0};
 assert.deepEqual(await f.take(scope,tx=>watchMetadata(tx,counts)),[f.operationId]);assert.equal(counts.text,0);assert.deepEqual(counts.gets.filter(x=>x[0]==='filterInputs'),[['filterInputs',f.inputId]]);assert.ok(counts.gets.every(x=>['meta','filterInputs'].includes(x[0])));
});

for(const reason of ['copied admission','public Input DTO','foreign Store'])test('Organize preparation refuses '+reason+' without a new authority',async t=>{
 const f=await fixture(t),admission=await f.capture();const token=reason==='copied admission'?{...admission}:reason==='public Input DTO'?{inputIds:[f.inputId],authority:'fake'}:admission;
 assert.equal(createOrganizeFilterVisibilityScope(reason==='foreign Store'?{...f.s}:f.s,token),null);
 assert.ok(createOrganizeFilterVisibilityScope(f.s,admission),'a refused foreign attempt must not consume the original admission');
});

for(const reason of ['action invalidation','action release','source disposal'])test('Organize '+reason+' after capture refuses before selected Filter metadata',async t=>{
 const f=await fixture(t),scope=createOrganizeFilterVisibilityScope(f.s,await f.capture());
 if(reason==='action invalidation')f.source.invalidate();else if(reason==='action release')f.source.release(f.action);else f.source.dispose();
 const counts={gets:[],text:0};assert.equal(await f.take(scope,tx=>watchMetadata(tx,counts)),null);assert.deepEqual(counts.gets,[]);assert.equal(counts.text,0);
});

for(const key of ['recovery-restore-epoch','backup-data-generation'])test('Organize '+key+' changing across preparation transactions rejects the old root before Filter metadata',async t=>{
 const f=await fixture(t),scope=createOrganizeFilterVisibilityScope(f.s,await f.capture());
 await f.s.repository.transaction(true,tx=>tx.put('meta',{id:key,value:crypto.randomUUID()}));
 const counts={gets:[],text:0};assert.equal(await f.take(scope,tx=>watchMetadata(tx,counts)),null);assert.deepEqual(counts.gets.filter(x=>x[0]==='filterInputs'),[]);assert.equal(counts.text,0);
});

test('local-only purpose refusal occurs before original Organize Filter admission can be captured',async t=>{
 const f=await fixture(t,{localOnly:true});let entered=false;
 await assert.rejects(f.capture({before(){entered=true;}}));assert.equal(entered,false);
});

test('Organize Filter preparation consumes the original cumulative action budget without a new ledger',async t=>{
 const f=await fixture(t);let admission=null;
 await assert.rejects(f.capture({before(tx,proof){actionOwner.chargeOriginalOrganizeWork(f.source,f.action,f.s,tx,proof,{reads:4096});},after(_tx,_proof,value){admission=value;}}));
 assert.equal(admission,null);await assert.rejects(f.capture(),'exhausted action cannot get a fresh allowance');
});

for(const kind of ['missing','copied'])test('a real consumed action with '+kind+' independent processing grant cannot mint a Filter selection',async t=>{
 const f=await fixture(t);let captured=false;await assert.rejects(f.capture({grantValue:value=>kind==='missing'?undefined:{...value},after(){captured=true;}}));assert.equal(captured,false);
 const real=await f.capture();assert.ok(createOrganizeFilterVisibilityScope(f.s,real),'failed foreign grant cannot mint or exhaust the genuine action');
});

test('original Memory local-only change after capture invalidates the old preparation root',async t=>{
 const {MemoryService}=await import('../core/memory/service.js');const f=await fixture(t),scope=createOrganizeFilterVisibilityScope(f.s,await f.capture());
 await new MemoryService(f.s).settings({localOnly:true,externalAccess:false});const counts={gets:[],text:0};
 assert.equal(await f.take(scope,tx=>watchMetadata(tx,counts)),null);assert.deepEqual(counts.gets.filter(x=>x[0]==='filterInputs'),[]);assert.equal(counts.text,0);
});

test('an admission metadata read refuses an aiDecision version accessor without invoking it',async t=>{
 const f=await fixture(t),scope=createOrganizeFilterVisibilityScope(f.s,await f.capture());let reads=0;
 const result=await f.take(scope,tx=>{const objectStore=tx.tx.objectStore.bind(tx.tx);tx.tx.objectStore=name=>{const store=objectStore(name);if(name!=='filterInputs')return store;const get=store.get.bind(store);store.get=key=>{const request=get(key);request.addEventListener('success',()=>{if(request.result?.aiDecision)Object.defineProperty(request.result.aiDecision,'version',{enumerable:true,configurable:true,get(){reads++;return 1;}});});return request;};return store;};});
 assert.equal(result,null);assert.equal(reads,0);
});

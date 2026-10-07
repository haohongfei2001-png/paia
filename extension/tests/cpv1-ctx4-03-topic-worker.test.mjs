import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {SafetyRunner} from '../core/thought-runner.js';
import {FilterRunner} from '../core/filter-runner.js';
import {CONTEXT_TOPIC_ACCESS_ROW} from '../core/context-topic-preferences.js';
import {hashText} from '../core/dedupe.js';

const operationId=()=>crypto.randomUUID();
const turn=()=>new Promise(resolve=>setImmediate(resolve));
const types=['PAIA_CONTEXT_TOPICS_PAGE','PAIA_CONTEXT_TOPICS_CHANGE','PAIA_CONTEXT_TOPICS_OUTCOME'];

test('CTX4-03 actual worker keeps Topic choices local, durable, strictly fenced and body-free',async t=>{
 const previous=Object.fromEntries(['chrome','indexedDB','IDBKeyRange','fetch'].map(key=>[key,globalThis[key]]));
 const id='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',origin=`chrome-extension://${id}/`;
 const archive={id,url:origin+'ui/archive.html'},popup={id,url:origin+'ui/popup.html'};
 const sourceUrl='https://chatgpt.com/c/ctx4-topic-worker';
 const content={id,url:sourceUrl,frameId:0,tab:{id:7,url:sourceUrl,incognito:false}};
 const notifications=[],tabMessages=[],values={},sessionValues={},runners=new Set(),stores=new Set();
 let listener,network=0;
 const storage=data=>({
  setAccessLevel:async()=>{},
  get:async keys=>keys===null?structuredClone(data):Object.fromEntries((Array.isArray(keys)?keys:[keys]).filter(key=>key in data).map(key=>[key,structuredClone(data[key])])),
  set:async rows=>Object.assign(data,structuredClone(rows)),
  remove:async keys=>{for(const key of Array.isArray(keys)?keys:[keys])delete data[key];},
  getBytesInUse:async()=>0,
 });
 // Observe the real worker's owners without replacing any maintenance work.
 // In particular, search/filter startup may mutate rows before our baseline.
 const wakeOriginals=[SafetyRunner,FilterRunner].map(Class=>[Class,Class.prototype.wake]);
 for(const [Class,wake] of wakeOriginals)Class.prototype.wake=function(...args){runners.add(this);stores.add(this.store);return wake.apply(this,args);};
 globalThis.indexedDB=new IDBFactory();globalThis.IDBKeyRange=IDBKeyRange;
 globalThis.chrome={
  runtime:{id,getManifest:()=>({version:'0.15.0'}),getURL:path=>origin+path,
   sendMessage:async message=>{notifications.push(structuredClone(message));},
   onMessage:{addListener:fn=>{listener=fn;}},onStartup:{addListener:()=>{}},
  },
  tabs:{query:async()=>[],sendMessage:async(...args)=>{tabMessages.push(args);}},
  storage:{local:storage(values),session:storage(sessionValues)},
 };
 globalThis.fetch=async()=>{network++;throw Error('Unexpected network request');};
 async function settled(){
  for(let attempt=0;attempt<100;attempt++){
   await turn();
   await Promise.all([...runners].map(runner=>runner.running).filter(Boolean));
   await turn();
   if([...runners].every(runner=>!runner.running&&!runner.requested)){
    for(const runner of runners)assert.equal(runner.failed,false,`${runner.constructor.name} failed`);
    return;
   }
  }
  assert.fail('Actual worker maintenance did not settle');
 }
 t.after(async()=>{
  await settled();
  for(const store of stores)await store.repository.close();
  for(const [Class,wake] of wakeOriginals)Class.prototype.wake=wake;
  for(const [key,value] of Object.entries(previous))if(value===undefined)delete globalThis[key];else globalThis[key]=value;
 });
 await import('../background/service-worker.js');
 const send=(message,sender=archive)=>new Promise(resolve=>assert.equal(listener(message,sender,resolve),true));
 const rpc=async(type,fields={},sender=archive)=>{const result=await send({type,...fields},sender);assert.equal(result.ok,true,JSON.stringify(result));return result.data;};
 const emptyChange=()=>({topicId:'synthetic-unselected-topic',enabled:false,expectedRevision:0,expectedBinding:null,epoch:'initial',operationId:operationId()});
 const emptyQuery=()=>({operationId:operationId(),digest:'a'.repeat(64),epoch:'initial'});
 const envelope=type=>({type,...(type.endsWith('_PAGE')?{options:{cursor:null,limit:1}}:type.endsWith('_CHANGE')?{change:emptyChange()}:{query:emptyQuery()})});

 await t.test('all three routes require consent before dispatch',async()=>{
  for(const type of types)assert.deepEqual(await send(envelope(type)),{ok:false,error:'CONSENT_REQUIRED'},type);
  await rpc('CONSENT',{accepted:true});
  // This existing command also awaits the worker's interrupted-job recovery.
  await rpc('GET_BOUNDED_ORGANIZER');await settled();
  assert.equal(runners.size,3,'Safety, Library and Filter owners actually ran');
  assert.equal(stores.size,1,'fixtures use the actual worker-owned store');
 });

 const store=[...stores][0];
 const raw=(name,key)=>store.repository.transaction(false,tx=>tx.get(name,key));
 const rows=name=>store.repository.transaction(false,tx=>tx.all(name));
 const protectedNames=[...store.repository.db.objectStoreNames].filter(name=>!['meta','operationReceipts'].includes(name));
 const protectedRows=()=>store.repository.transaction(false,async tx=>Object.fromEntries(await Promise.all(protectedNames.map(async name=>[name,await tx.all(name)]))));
 const allPage=async()=>{
  const result=await rpc('PAIA_CONTEXT_TOPICS_PAGE',{options:{cursor:null,limit:100}});
  assert.equal(result.available,true,JSON.stringify(result));assert.equal(result.complete,true);assert.equal(result.externalAllowed,false);return result;
 };
 const topicItem=async topicId=>{const page=await allPage(),item=page.items.find(row=>row.topicId===topicId);assert.ok(item);return {...item,epoch:page.epoch};};
 const changeFor=(item,enabled)=>({topicId:item.topicId,enabled,expectedRevision:item.revision,expectedBinding:enabled?item.expectedBinding:item.binding,epoch:item.epoch,operationId:operationId()});
 const summary=async selectedCount=>{
  const snapshot=await rpc('PAIA_CONTEXT_CARDS_SNAPSHOT');
  assert.deepEqual(snapshot.topicChoices,{available:true,selectedCount,externalAllowed:false});
  assert.equal(snapshot.capabilities.inputs,true);assert.equal(snapshot.capabilities.external,false);assert.equal(snapshot.connections,0);
  return snapshot;
 };
 let topic,entry,input,baseline,enableChange,enableResult,enabledPreferences;

 await t.test('content, wrong origin/id, arbitrary archive fragments and popup fragments are forbidden',async()=>{
  const denied=[content,{id,url:'https://example.invalid/ui/archive.html'},
   {id:'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',url:archive.url},
   {id,url:origin+'ui/prompt-surface.html'},
   {id,url:archive.url+'#untrusted'},
   {id,url:popup.url+'#context'},{id,url:popup.url+'#untrusted'},
  ];
  for(const sender of denied)for(const type of types)assert.deepEqual(await send(envelope(type),sender),{ok:false,error:'FORBIDDEN'},`${type}: ${sender.url}`);
  for(const sender of [archive,popup]){
   const result=await rpc('PAIA_CONTEXT_TOPICS_PAGE',{options:{cursor:null,limit:1}},sender);
   assert.equal(result.available,true);assert.deepEqual(result.items,[]);
  }
 });

 await t.test('real Source and manual Topic/Entry/Placement seed default-off directory without body copies',async()=>{
  const status=await rpc('GET_STATUS');
  const capture=await rpc('CAPTURE',{epoch:status.epoch,adapterVersion:'0.3.0',contentVersion:'0.15.0',
   chat:{id:'ctx4-topic-worker',url:sourceUrl,title:'SYNTHETIC_PRIVATE_SOURCE_TITLE'},
   messages:[{sourceMessageId:'ctx4-topic-worker-input',pageOrder:1,originalText:'SYNTHETIC_PRIVATE_SOURCE_BODY'}],
  },content);
  assert.equal(capture.added,1);
  await rpc('FILTER_MODE',{mode:'off'});
  topic=await rpc('CREATE_LIBRARY_TOPIC',{topic:{name:'Synthetic local Topic',operationId:operationId()}});
  entry=await rpc('CREATE_LIBRARY_ENTRY',{entry:{body:'SYNTHETIC_PRIVATE_THOUGHT_BODY',note:'SYNTHETIC_PRIVATE_THOUGHT_NOTE',type:'idea',operationId:operationId()}});
  const currentTopic=await rpc('GET_LIBRARY_TOPIC',{id:topic.id}),currentEntry=await rpc('GET_LIBRARY_ENTRY',{id:entry.id});
  await rpc('PLACE_LIBRARY_ENTRY',{placement:{entryId:entry.id,topicId:topic.id,expectedEntryRevision:currentEntry.revision,expectedTopicRevision:currentTopic.organizationRevision,operationId:operationId()}});
  const state=await rpc('GET_STATE');input=state.library.blocks[0];
  assert.equal(state.records.length,1);assert.ok(input?.id);
  await settled();baseline=await protectedRows();
  assert.ok(baseline.records.length&&baseline.blocks.length&&baseline.thoughts.length&&baseline.topics.length&&baseline.sections.length&&baseline.placements.length);
  const item=await topicItem(topic.id);
  assert.equal(item.name,'Synthetic local Topic');assert.equal(item.enabled,false);assert.equal(item.revision,0);
  assert.equal(item.binding,null);assert.ok(item.expectedBinding);assert.equal(item.canEnable,true);assert.equal(item.reason,'topic_off');
  assert.equal(await raw('meta',CONTEXT_TOPIC_ACCESS_ROW),undefined);
  await summary(0);
  assert.ok(!JSON.stringify(await allPage()).includes('SYNTHETIC_PRIVATE'));
  assert.deepEqual(await protectedRows(),baseline);
 });

 await t.test('strict envelopes and nested payloads reject extra fields without writing',async()=>{
  const item=await topicItem(topic.id),change=changeFor(item,true),query=emptyQuery();
  for(const message of [
   {type:types[0],options:{cursor:null,limit:1},extra:true},
   {type:types[1],change,extra:true},{type:types[2],query,extra:true},
   {type:types[1],change:{...change,body:'SYNTHETIC_PRIVATE_INJECTED_BODY'}},
   {type:types[2],query:{...query,topicId:topic.id}},
  ])assert.deepEqual(await send(message),{ok:false,error:'INVALID_REQUEST'});
  const invalidPage=await rpc(types[0],{options:{cursor:null,limit:1,extra:true}});
  assert.equal(invalidPage.available,false);assert.equal(invalidPage.reason,'invalid_request');assert.deepEqual(invalidPage.items,[]);
  assert.equal(await raw('meta',CONTEXT_TOPIC_ACCESS_ROW),undefined);assert.deepEqual(await protectedRows(),baseline);
 });

 await t.test('selection uses current real scope, updates Context count and emits only a local notification',async()=>{
  // Enable both independent card switches through their actual worker owner.
  const snapshot=await summary(0);
  for(const key of ['global','inputs'])assert.equal((await rpc('PAIA_CONTEXT_CARDS_CHANGE',{change:{kind:'access',key,enabled:true,expectedRevision:snapshot.access[key].revision,epoch:snapshot.epoch,operationId:operationId()}})).ok,true);
  await settled();notifications.length=0;
  enableChange=changeFor(await topicItem(topic.id),true);
  enableResult=await rpc(types[1],{change:enableChange});
  assert.deepEqual(enableResult,{ok:true,topicId:topic.id,enabled:true,revision:1,noOp:false,externalAllowed:false});
  await turn();assert.deepEqual(notifications,[{type:'PAIA_CONTEXT_CARDS_CHANGED'}]);
  enabledPreferences=await raw('meta',CONTEXT_TOPIC_ACCESS_ROW);
  assert.deepEqual(enabledPreferences.choices,[{topicId:topic.id,enabled:true,revision:1,binding:enableChange.expectedBinding}]);
  const selected=await topicItem(topic.id);
  assert.equal(selected.enabled,true);assert.equal(selected.bindingValid,true);assert.equal(selected.policyAllowed,true);assert.equal(selected.reason,'policy_allowed');assert.equal(selected.externalAllowed,false);
  assert.ok(!JSON.stringify(selected).includes('SYNTHETIC_PRIVATE'),'enabled scope returns metadata without Source/Input/Thought bodies');
  await summary(1);assert.deepEqual(await protectedRows(),baseline);
  assert.equal(network,0);assert.deepEqual(tabMessages,[]);
 });

 await t.test('exact receipts recover a lost acknowledgement; replay and conflicts preserve bodies and choices',async()=>{
  notifications.length=0;
  const digest=await hashText(JSON.stringify(enableChange)),query={operationId:enableChange.operationId,digest,epoch:enableChange.epoch};
  assert.deepEqual(await rpc(types[2],{query}),{state:'committed',result:enableResult,externalAllowed:false});
  assert.deepEqual(await rpc(types[2],{query:{...query,digest:'0'.repeat(64)}}),{state:'unknown',externalAllowed:false});
  assert.deepEqual(await rpc(types[2],{query:{...query,operationId:operationId()}}),{state:'not_committed',externalAllowed:false});
  assert.deepEqual(notifications,[],'outcome reads never publish changes');
  assert.deepEqual(await rpc(types[1],{change:enableChange}),enableResult);
  await turn();notifications.length=0;
  const conflict=await rpc(types[1],{change:{...enableChange,operationId:operationId()}});
  assert.equal(conflict.ok,false);assert.equal(conflict.conflict,true);assert.equal(conflict.reason,'revision_changed');
  assert.deepEqual(await send({type:types[1],change:{...enableChange,enabled:false}}),{ok:false,error:'INVALID_REQUEST'});
  await turn();assert.deepEqual(notifications,[]);
  assert.deepEqual(await raw('meta',CONTEXT_TOPIC_ACCESS_ROW),enabledPreferences);
  const receiptRows=(await rows('operationReceipts')).filter(row=>row.id.startsWith('context-topic:'));
  assert.equal(receiptRows.length,1);assert.equal(receiptRows[0].digest,digest);assert.deepEqual(receiptRows[0].result,enableResult);
  assert.ok(!JSON.stringify(receiptRows).includes('SYNTHETIC_PRIVATE'));assert.deepEqual(await protectedRows(),baseline);
 });

 await t.test('fresh worker reopens the persisted choice; explicit off persists and new identity stays off',async()=>{
  await settled();await store.repository.close();runners.clear();
  await import('../background/service-worker.js?ctx4-topic-worker-restart');
  await rpc('GET_BOUNDED_ORGANIZER');await settled();
  const reopened=[...runners][0].store;assert.notEqual(reopened,store);
  const reopenedRows=()=>reopened.repository.transaction(false,async tx=>Object.fromEntries(await Promise.all(protectedNames.map(async name=>[name,await tx.all(name)]))));
  assert.deepEqual(await reopenedRows(),baseline);
  assert.equal((await topicItem(topic.id)).enabled,true);await summary(1);
  assert.deepEqual(await rpc(types[2],{query:{operationId:enableChange.operationId,digest:await hashText(JSON.stringify(enableChange)),epoch:enableChange.epoch}}),{state:'committed',result:enableResult,externalAllowed:false},'a fresh worker recovers the exact persisted receipt');
  notifications.length=0;
  const disable=changeFor(await topicItem(topic.id),false),disabled=await rpc(types[1],{change:disable});
  assert.deepEqual(disabled,{ok:true,topicId:topic.id,enabled:false,revision:2,noOp:false,externalAllowed:false});
  await turn();assert.deepEqual(notifications,[{type:'PAIA_CONTEXT_CARDS_CHANGED'}]);
  assert.equal((await topicItem(topic.id)).enabled,false);await summary(0);
  assert.deepEqual(await reopenedRows(),baseline);
  const persisted=await reopened.repository.transaction(false,tx=>tx.get('meta',CONTEXT_TOPIC_ACCESS_ROW));
  assert.equal(persisted.choices[0].enabled,false);assert.equal(persisted.choices[0].revision,2);
  const next=await rpc('CREATE_LIBRARY_TOPIC',{topic:{name:'Synthetic new identity',operationId:operationId()}});await settled();
  const laterBaseline=await reopenedRows(),newItem=await topicItem(next.id);
  assert.equal(newItem.enabled,false);assert.equal(newItem.revision,0);assert.equal(newItem.binding,null);assert.equal(newItem.reason,'topic_off');
  const first=await rpc(types[0],{options:{cursor:null,limit:1}});
  assert.equal(first.available,true);assert.equal(first.complete,false);assert.ok(first.nextCursor);
  const second=await rpc(types[0],{options:{cursor:first.nextCursor,limit:1}});
  assert.equal(second.available,true);assert.equal(second.complete,true);assert.equal(second.nextCursor,null);
  assert.deepEqual(new Set([...first.items,...second.items].map(item=>item.topicId)),new Set([topic.id,next.id]));
  await summary(0);assert.deepEqual(await reopenedRows(),laterBaseline);
  await reopened.repository.close();runners.clear();
  await import('../background/service-worker.js?ctx4-topic-worker-off-restart');
  await rpc('GET_BOUNDED_ORGANIZER');await settled();
  const finalStore=[...runners][0].store;
  assert.equal((await topicItem(topic.id)).enabled,false);assert.equal((await topicItem(next.id)).enabled,false);await summary(0);
  assert.deepEqual(await finalStore.repository.transaction(false,tx=>tx.get('meta',CONTEXT_TOPIC_ACCESS_ROW)),persisted);
  assert.deepEqual(await finalStore.repository.transaction(false,async tx=>Object.fromEntries(await Promise.all(protectedNames.map(async name=>[name,await tx.all(name)])))),laterBaseline);
 });

 await t.test('retired outbound paths remain closed and no network/provider work was created',async()=>{
  for(const type of ['PAIA_CONTEXT_MANUAL','PAIA_CONTEXT_BIND','PAIA_MEMORY_BUILD','PAIA_MEMORY_SHARE','PAIA_BACKUP_BEGIN_EXPORT'])assert.equal((await send({type})).error,'FEATURE_UNAVAILABLE',type);
  assert.equal((await send({type:'SAVE_DEEPSEEK_CREDENTIAL'})).error,'AI_SERVICE_UNAVAILABLE');
  assert.equal(network,0);assert.deepEqual(tabMessages,[]);
  const finalStore=[...runners][0].store;
  for(const name of ['organizerJobs','organizerUsage'])assert.deepEqual(await finalStore.repository.transaction(false,tx=>tx.all(name)),[],`${name} has no provider work`);
 });
});

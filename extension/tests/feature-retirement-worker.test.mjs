import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {assertFeatureAvailable,unavailableFeatureCode} from '../core/feature-availability.js';
import {unavailableAIProvider,unavailableAICredentials} from '../core/organizer/unavailable-service.js';

const retired = [
  'PAIA_BACKUP_BEGIN_EXPORT','PAIA_BACKUP_EXPORT_PAGE','PAIA_CONTEXT_MANUAL',
  'PAIA_CONTEXT_BIND','PAIA_MEMORY_PROFILE','PAIA_MEMORY_BUILD','PAIA_MEMORY_SHARE',
  'PAIA_PASSPORT_CREATE','PAIA_PRODUCT_SIGNAL','PAIA_CORE_LOOP_ACTION','RESPONSE_VIEW','RESPONSE_ARM',
];
const ai = ['GET_DEEPSEEK_STATUS','SAVE_DEEPSEEK_CREDENTIAL','CLEAR_DEEPSEEK',
  'START_BOUNDED_ORGANIZER','UPDATE_AI_PRESENTATION','GET_AI_PRESENTATION_SCOPE',
  'UPDATE_ORIGINAL_LIBRARY_VIEW','SET_ORIGINAL_LIBRARY_AUTO_UPDATE','PREVIEW_AI_LIBRARY_UPDATE'];

test('retired command policy keeps restoration, saved content and revocation available',()=>{
  for (const type of retired) assert.throws(()=>assertFeatureAvailable({type}),{code:'FEATURE_UNAVAILABLE'});
  for (const type of ai) assert.throws(()=>assertFeatureAvailable({type}),{code:'AI_SERVICE_UNAVAILABLE'});
  for (const type of ['PAIA_BACKUP_BEGIN_RESTORE','PAIA_BACKUP_STAGE','PAIA_BACKUP_PREVIEW','PAIA_BACKUP_RESTORE','PAIA_BACKUP_CANCEL','PAIA_MEMORY_STATUS','PAIA_MEMORY_EXCLUDE','PAIA_PASSPORT_STATUS','PAIA_PASSPORT_REVOKE','PAIA_PASSPORT_CLEAR_AUDITS','GET_INPUT','EDIT_DOCUMENT','THOUGHT_EDIT_HISTORY','EDIT_AI_PRESENTATION','GET_AI_PRESENTATION_REVISIONS','GET_AI_PRESENTATION_STATUS']) assert.equal(unavailableFeatureCode({type}),null,type);
  assert.equal(unavailableFeatureCode({type:'CONTINUE_THINKING',thought:{body:'SYNTHETIC independent'}}),null);
  assert.equal(unavailableFeatureCode({type:'CONTINUE_THINKING',thought:{body:'SYNTHETIC independent',relation:undefined}}),'FEATURE_UNAVAILABLE');
  for (const key of ['budget','retentionDays','onboarded','includeUnorganizedInputs']) assert.equal(unavailableFeatureCode({type:'PAIA_MEMORY_SETTINGS',options:{[key]:false}}),'FEATURE_UNAVAILABLE');
  assert.equal(unavailableFeatureCode({type:'PAIA_MEMORY_SETTINGS',options:{externalAccess:true}}),'FEATURE_UNAVAILABLE');
  assert.equal(unavailableFeatureCode({type:'PAIA_MEMORY_SETTINGS',options:{externalAccess:false}}),null);
  for (const decision of ['default','denied','never']) assert.equal(unavailableFeatureCode({type:'PAIA_MEMORY_AUTHORIZE',options:{decision}}),null);
  assert.equal(unavailableFeatureCode({type:'PAIA_MEMORY_AUTHORIZE',options:{decision:'allowed'}}),'FEATURE_UNAVAILABLE');
  assert.equal(unavailableFeatureCode({type:'PAIA_PRODUCT_SETTINGS',settings:{enabled:true}}),'FEATURE_UNAVAILABLE');
  assert.equal(unavailableFeatureCode({type:'PAIA_PRODUCT_SETTINGS',settings:{enabled:false}}),null);
  for (const key of ['dailyRequests','batchMode','aiOnboardingSeen']) assert.equal(unavailableFeatureCode({type:'SET_ORGANIZER_CONTROLS',changes:{[key]:1}}),'AI_SERVICE_UNAVAILABLE');
  assert.equal(unavailableFeatureCode({type:'SET_ORGANIZER_CONTROLS',changes:{readingSort:'asc',libraryView:'original'}}),null);
});

test('unlaunched membership dependencies never acquire credentials or execute a provider',async()=>{
  const poison = new Proxy({}, {get(){throw Error('unexpected dependency access');}});
  assert.throws(()=>unavailableAIProvider.describe(),{code:'AI_SERVICE_UNAVAILABLE'});
  assert.equal(unavailableAIProvider.supportsTask('original_classification'),false);
  await assert.rejects(unavailableAIProvider.execute(poison,poison),{code:'AI_SERVICE_UNAVAILABLE'});
  await assert.rejects(unavailableAICredentials.acquire(poison),{code:'AI_SERVICE_UNAVAILABLE'});
});

test('actual worker refuses withdrawn commands, preserves capture/edit data and does not read legacy keys',async()=>{
  globalThis.indexedDB=new IDBFactory();globalThis.IDBKeyRange=IDBKeyRange;
  const id='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',origin=`chrome-extension://${id}/`,ui={id,url:origin+'ui/archive.html'};
  let listener,networkCalls=0;const values={},sessionValues={'deepseek-organizer-session-credential':{apiKey:'SYNTHETIC_NEVER_READ'}},sessionReads=[];
  globalThis.fetch=async()=>{networkCalls++;throw Error('unexpected network');};
  const storage=data=>({setAccessLevel:async()=>{},get:async keys=>keys===null?structuredClone(data):Object.fromEntries((Array.isArray(keys)?keys:[keys]).filter(k=>k in data).map(k=>[k,structuredClone(data[k])])),set:async rows=>Object.assign(data,structuredClone(rows)),remove:async keys=>{for(const key of Array.isArray(keys)?keys:[keys])delete data[key];},getBytesInUse:async()=>0});
  const local=storage(values),session=storage(sessionValues),read=session.get;session.get=async key=>{sessionReads.push(key);return read(key);};
  globalThis.chrome={runtime:{id,getManifest:()=>({version:'0.12.0'}),getURL:path=>origin+path,sendMessage:async()=>{},onMessage:{addListener:fn=>listener=fn}},storage:{local,session}};
  await import('../background/service-worker.js');
  const send=(message,sender=ui)=>new Promise(resolve=>listener(message,sender,resolve));
  const rpc=async(type,fields={})=>{const reply=await send({type,...fields});assert.equal(reply.ok,true,JSON.stringify(reply));return reply.data;};
  assert.equal((await send({type:'PAIA_BACKUP_BEGIN_EXPORT'})).error,'CONSENT_REQUIRED');
  assert.equal((await send({type:'START_BOUNDED_ORGANIZER'})).error,'CONSENT_REQUIRED');
  await rpc('CONSENT',{accepted:true});
  const url='https://chatgpt.com/c/retirement',content={id,url,frameId:0,tab:{id:9,url,incognito:false}};
  for(const type of [...retired,...ai]) assert.equal((await send({type},content)).error,'FORBIDDEN',type);
  assert.deepEqual((await send({type:'RESPONSE_POLL'},content)).data,{arm:false,fingerprintAllowed:false});
  const epoch=(await rpc('GET_STATUS')).epoch;
  assert.equal((await send({type:'CAPTURE',epoch,adapterVersion:'0.3.0',contentVersion:'0.12.0',chat:{id:'retirement',url,title:'SYNTHETIC retained archive'},messages:[{sourceMessageId:'retained-message',pageOrder:1,originalText:'SYNTHETIC immutable input'}]},content)).ok,true);
  const before=await rpc('GET_STATE'),block=before.library.blocks[0];
  for(const type of retired) assert.equal((await send({type,options:{},grant:{},signal:{},confirm:true})).error,'FEATURE_UNAVAILABLE',type);
  for(const type of ai) assert.equal((await send({type,config:{apiKey:'SYNTHETIC_NEW_UNUSED'},userActionId:'SYNTHETIC'})).error,'AI_SERVICE_UNAVAILABLE',type);
  assert.equal((await send({type:'CONTINUE_THINKING',thought:{operationId:'synthetic-relation',body:'SYNTHETIC',relation:{id:'old'}}})).error,'FEATURE_UNAVAILABLE');
  assert.equal((await send({type:'PAIA_MEMORY_SETTINGS',options:{externalAccess:true}})).error,'FEATURE_UNAVAILABLE');
  const after=await rpc('GET_STATE');assert.deepEqual(after.records,before.records);assert.deepEqual(after.library.blocks,before.library.blocks);
  await rpc('EDIT_DOCUMENT',{edit:{operationId:crypto.randomUUID(),documentId:block.documentId,blocks:[{id:block.id,expectedRevision:block.revision,libraryText:'SYNTHETIC edited input',note:block.note,excluded:block.excluded}]}});
  assert.equal((await rpc('GET_INPUT',{id:block.id})).libraryText,'SYNTHETIC edited input');
  assert.deepEqual((await rpc('GET_STATE')).records,before.records);
  assert.equal(networkCalls,0);assert.deepEqual(sessionReads,[]);assert.equal(sessionValues['deepseek-organizer-session-credential'].apiKey,'SYNTHETIC_NEVER_READ');
  assert.deepEqual(await rpc('PAIA_PRODUCT_STATUS'),{enabled:false,retired:true,hasHistory:false,legacyEnabled:false});
  assert.equal((await send({type:'PAIA_PRODUCT_CLEAR'})).error,'INVALID_REQUEST');
});

test('UI request policy prevents accidental retired messages before transport',async()=>{
  let calls=0;globalThis.chrome={runtime:{sendMessage:async()=>{calls++;return {ok:true,data:null};}}};
  const {request}=await import('../ui/common.js');
  for(const type of retired) await assert.rejects(request(type),{code:'FEATURE_UNAVAILABLE'});
  for(const type of ai) await assert.rejects(request(type),{code:'AI_SERVICE_UNAVAILABLE'});
  assert.equal(calls,0);await request('GET_STATUS');assert.equal(calls,1);
});

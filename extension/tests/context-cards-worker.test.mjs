import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
test('CTX4 actual worker caller/consent/draft fences and retired outbound routes remain closed',async()=>{
 globalThis.indexedDB=new IDBFactory();globalThis.IDBKeyRange=IDBKeyRange;
 const id='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',origin=`chrome-extension://${id}/`,ui={id,url:origin+'ui/archive.html'},values={},sessionValues={};let listener,network=0;
 const storage=data=>({setAccessLevel:async()=>{},get:async keys=>keys===null?structuredClone(data):Object.fromEntries((Array.isArray(keys)?keys:[keys]).filter(k=>k in data).map(k=>[k,structuredClone(data[k])])),set:async rows=>Object.assign(data,structuredClone(rows)),remove:async keys=>{for(const key of Array.isArray(keys)?keys:[keys])delete data[key];},getBytesInUse:async()=>0});
 globalThis.chrome={runtime:{id,getManifest:()=>({version:'0.12.1'}),getURL:path=>origin+path,sendMessage:async()=>{},onMessage:{addListener:fn=>listener=fn}},storage:{local:storage(values),session:storage(sessionValues)}};globalThis.fetch=async()=>{network++;throw Error('unexpected network');};await import('../background/service-worker.js');
 const send=(message,sender=ui)=>new Promise(resolve=>listener(message,sender,resolve)),rpc=async(type,fields={})=>{const r=await send({type,...fields});assert.equal(r.ok,true,JSON.stringify(r));return r.data;};
 const types=['PAIA_CONTEXT_CARDS_SNAPSHOT','PAIA_CONTEXT_CARDS_CHANGE','PAIA_CONTEXT_CARDS_OUTCOME','PAIA_CONTEXT_CARDS_DRAFTS'];for(const type of types)assert.equal((await send({type})).error,'CONSENT_REQUIRED');await rpc('CONSENT',{accepted:true});
 for(const sender of [{id,url:'https://chatgpt.com/c/synthetic',frameId:0,tab:{id:1,url:'https://chatgpt.com/c/synthetic'}},{id:'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',url:ui.url},{id,url:origin+'ui/prompt-surface.html'}])for(const type of types)assert.equal((await send({type},sender)).error,'FORBIDDEN');
 const snapshot=await rpc('PAIA_CONTEXT_CARDS_SNAPSHOT'),change={kind:'put',operationId:crypto.randomUUID(),epoch:snapshot.epoch,itemId:crypto.randomUUID(),expectedRevision:0,section:'Manual',body:'SYNTHETIC failed-new-item draft'};
 const draft={kind:'context_item',ownerId:change.itemId,epoch:snapshot.epoch,token:change.operationId,sourceRecordIds:[],operation:{type:'PAIA_CONTEXT_CARDS_CHANGE',change}};
 await rpc('PAIA_RECOVERY_DRAFT_SAVE',{draft});assert.equal((await rpc('PAIA_CONTEXT_CARDS_DRAFTS'))[0].operation.change.body,change.body);assert.equal((await rpc('PAIA_CONTEXT_CARDS_SNAPSHOT')).items.length,0);
 for(const invalid of [{...draft,ownerId:crypto.randomUUID()},{...draft,sourceRecordIds:['invented-source']},{...draft,epoch:'stale'}])assert.equal((await send({type:'PAIA_RECOVERY_DRAFT_SAVE',draft:invalid})).ok,false);
 await rpc('PAIA_CONTEXT_CARDS_CHANGE',{change});await rpc('PAIA_CONTEXT_CARDS_CHANGE',{change:{kind:'delete',itemId:change.itemId,expectedRevision:1,epoch:snapshot.epoch,operationId:crypto.randomUUID()}});assert.equal((await send({type:'PAIA_RECOVERY_DRAFT_SAVE',draft})).ok,false);assert.deepEqual(await rpc('PAIA_CONTEXT_CARDS_DRAFTS'),[]);
 for(const type of ['PAIA_CONTEXT_MANUAL','PAIA_CONTEXT_BIND','PAIA_MEMORY_BUILD','PAIA_MEMORY_SHARE','PAIA_BACKUP_BEGIN_EXPORT'])assert.equal((await send({type})).error,'FEATURE_UNAVAILABLE');assert.equal((await send({type:'SAVE_DEEPSEEK_CREDENTIAL'})).error,'AI_SERVICE_UNAVAILABLE');assert.equal(network,0);
});

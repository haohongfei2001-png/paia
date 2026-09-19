import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {ArchiveRepository} from '../core/idb-repository.js';
const id='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',origin='chrome-extension://'+id+'/',ui={id,url:origin+'ui/archive.html'};
const chatId='ans04-worker-chat',url='https://chatgpt.com/c/'+chatId,content={id,url,frameId:0,tab:{id:99,url,incognito:false}};
async function fixture(){
 globalThis.IDBKeyRange=IDBKeyRange;globalThis.indexedDB=new IDBFactory();let listener;const values={},notifications=[];
 globalThis.chrome={runtime:{id,getManifest:()=>({version:'0.12.0'}),getURL:path=>origin+path,sendMessage:async m=>notifications.push(m),onMessage:{addListener:fn=>{listener=fn;}}},storage:{local:{setAccessLevel:async()=>{},get:async key=>({[key]:structuredClone(values[key])}),set:async patch=>Object.assign(values,structuredClone(patch)),getBytesInUse:async()=>0}}};
 await import('../background/service-worker.js?ans04-worker='+crypto.randomUUID());
 return {notifications,send:(request,sender=ui)=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('worker request timeout')),5000);assert.equal(listener(request,sender,r=>{clearTimeout(timer);resolve(r);}),true);})};
}
test('ANS-04 real worker gates Navigator to consented exact extension UI and never uses GET_STATE/materialize/network',async t=>{
 const oldChrome=globalThis.chrome,oldDB=globalThis.indexedDB,oldFetch=globalThis.fetch,materialize=ArchiveRepository.prototype.materialize;let network=0,snapshots=0;
 t.after(()=>{globalThis.chrome=oldChrome;globalThis.indexedDB=oldDB;globalThis.fetch=oldFetch;ArchiveRepository.prototype.materialize=materialize;});
 globalThis.fetch=async()=>{network++;throw Error('unexpected network');};const app=await fixture();
 for(const type of ['PAIA_ARCHIVE_NAV_PAGE','PAIA_ARCHIVE_NAV_STATUS']){
  assert.deepEqual(await app.send({type}),{ok:false,error:'CONSENT_REQUIRED'});
  for(const sender of [content,{}, {...ui,id:'other'},{...ui,url:origin+'ui/archive.html?spoof=1'},{...ui,url:'https://example.invalid'}])assert.deepEqual(await app.send({type},sender),{ok:false,error:'FORBIDDEN'});
 }
 assert.equal((await app.send({type:'CONSENT',accepted:true})).ok,true);
 const status=(await app.send({type:'GET_STATUS'})).data;
 assert.equal((await app.send({type:'CAPTURE',epoch:status.epoch,adapterVersion:'0.3.0',chat:{id:chatId,url,title:'Synthetic worker title'},messages:[{sourceMessageId:'ans04-worker-msg',pageOrder:1,originalText:'WORKER_BODY_NOT_NAV_METADATA'}]},content)).ok,true);
 ArchiveRepository.prototype.materialize=async()=>{snapshots++;throw Error('Navigator used full snapshot');};
 const page={providerKey:'chatgpt',groupKind:'unknown',mode:'source'};let answer;
 for(let i=0;i<40;i++){
  const r=await app.send({type:'PAIA_ARCHIVE_NAV_PAGE',page});assert.equal(r.ok,true,JSON.stringify(r));answer=r.data;
  assert.equal(answer.operations.inputBodyReads,0);assert.ok(answer.operations.metadataScanned<=100);
  if(answer.coverage.state==='complete')break;
 }
 assert.equal(answer.coverage.state,'complete');assert.equal(answer.items.length,1);assert.equal(answer.items[0].title,'Synthetic worker title');assert.doesNotMatch(JSON.stringify(answer),/WORKER_BODY_NOT_NAV_METADATA/);
 assert.equal(answer.effectiveOrdering,'paia');assert.equal(answer.unavailableReason,'SOURCE_ORDER_UNAVAILABLE');
 assert.deepEqual(await app.send({type:'PAIA_ARCHIVE_NAV_PAGE',page:{limit:41}}),{ok:false,error:'INVALID_REQUEST'});
 assert.equal((await app.send({type:'SET_ENABLED',enabled:false})).ok,true);
 assert.equal((await app.send({type:'PAIA_ARCHIVE_NAV_STATUS',page})).ok,true,'capture pause does not revoke local read consent');
 assert.deepEqual(await app.send({type:'PAIA_ARCHIVE_NAV_STATUS',page},content),{ok:false,error:'FORBIDDEN'});
 assert.equal(snapshots,0);assert.equal(network,0);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {promotionFixture,rows,raw,op,inputEdit} from './harness/topic-04.mjs';
import {ContextTopicAccessService} from '../core/context-topic-access.js';
import {BrowserNativeSyncCore} from '../core/browser-native-sync/core.js';
import {HumanLibrarySyncJournal} from '../core/browser-native-sync/human-library-journal.js';
import {ArchiveError,STORAGE_KEY} from '../core/constants.js';
import {TopicSectionPromotionCommands} from '../background/topic-section-promotion-commands.js';
const TYPE='PAIA_LIBRARY_SECTION_PROMOTION',url='chrome-extension://synthetic/ui/archive.html';
const rejects=(promise,code)=>assert.rejects(promise,error=>error.code===code);
async function fixture(t){
 const f=await promotionFixture({count:1});t.after(()=>f.s.repository.close());
 const entry=await f.s.createEntry({actor:'user',body:'Independent human body',type:'idea',formation:'explicit',evidence:[],operationId:op()}),parent=await f.s.topic(f.parent.id);
 await f.s.placeEntry({entryId:entry.id,topicId:parent.id,sectionId:f.section.sectionId,expectedEntryRevision:entry.revision,expectedTopicRevision:parent.organizationRevision,operationId:op()});f.entryIds.push(entry.id);
 await f.s.finishFoundation();await f.s.run(()=>undefined);
 let documentId='document-A';
 const sender=()=>({id:'synthetic',frameId:0,documentId,documentLifecycle:'active',url,tab:{id:4,windowId:2,incognito:false}});
 const contexts=()=>[{contextType:'TAB',tabId:4,windowId:2,frameId:0,documentId,documentUrl:url,incognito:false}];
 const api={runtime:{id:'synthetic',getURL:path=>'chrome-extension://synthetic/'+path,getContexts:async()=>contexts()},tabs:{get:async()=>({id:4,windowId:2,incognito:false,url})}};
 const adapter=new TopicSectionPromotionCommands(f.s,api);
 return {...f,adapter,api,sender,contexts,changeDocument:value=>{documentId=value;},request:()=>({topicId:f.parent.id,sectionId:f.section.sectionId,selection:'whole_section',name:'Human independent object',operationId:op()})};
}
const call=(f,command,payload={})=>f.adapter.handle({type:TYPE,command,...payload},f.sender());
async function snapshot(f){const names=f.s.repository.stores;assert.equal(names.length,37);return f.s.repository.transaction(false,t=>Promise.all(names.map(async name=>[name,await t.all(name)])));}
const sdk=f=>f.storage.get(STORAGE_KEY);
const prepare=f=>call(f,'prepare',{request:f.request()});

test('manual gateway authentic whole-Section preview/cancel has no domain or SDK writes',async t=>{
 const f=await fixture(t),before=await snapshot(f),control=await sdk(f),p=await prepare(f);
 assert.deepEqual(p.preview.entryIds,f.entryIds);assert.equal(p.preview.selectedCount,2);assert.equal(p.preview.wholeSection,true);assert.equal(p.preview.semanticAssessment,false);assert.equal(JSON.stringify(p).includes('Independent human body'),false);
 assert.deepEqual(await snapshot(f),before);assert.deepEqual(await sdk(f),control);assert.deepEqual(await call(f,'cancel',{token:p.token}),{state:'cancelled'});
 await rejects(call(f,'confirm',{token:p.token,confirmed:true}),'INVALID_REQUEST');assert.deepEqual(await snapshot(f),before);assert.deepEqual(await sdk(f),control);
});

test('manual gateway original commit and compound undo preserve bodies, provenance, anchors and access off',async t=>{
 const f=await fixture(t),before=await Promise.all(['records','blocks','inputStates','provenance','dependencies'].map(name=>rows(f.s,name))),entries=await rows(f.s,'thoughts'),sections=await rows(f.s,'sections'),parent=await f.s.topic(f.parent.id),p=await prepare(f);
 const result=await call(f,'confirm',{token:p.token,confirmed:true});assert.equal(result.state,'committed');assert.equal(result.operationId,p.operationId);assert.notEqual(result.id,parent.id);assert.deepEqual(result.entryIds,f.entryIds);
 const created=await f.s.topic(result.id),current=await f.s.topic(parent.id);assert.equal(created.identity.origin,'user');assert.equal(created.name,p.preview.name);assert.equal(current.redirectTo,undefined);assert.equal(current.defaultSectionId,parent.defaultSectionId);assert.deepEqual((await rows(f.s,'sections')).filter(row=>row.topicId===parent.id),sections);
 assert.deepEqual(await Promise.all(['records','blocks','inputStates','provenance','dependencies'].map(name=>rows(f.s,name))),before);
 for(const old of entries){const after=await raw(f.s,'thoughts',old.id);for(const key of ['thoughtText','bodyBinding','origin','provenanceType','sourceRecordIds','inputRefs'])assert.deepEqual(after[key],old[key]);assert.ok(after.organizationIntents.excluded.includes(parent.id));}
 for(const id of f.entryIds){const placements=(await rows(f.s,'placements')).filter(row=>row.entryId===id),old=placements.find(row=>row.topicId===parent.id),moved=placements.find(row=>row.topicId===created.id);assert.equal(old.lifecycle,'removed');assert.equal(moved.lifecycle,'active');assert.equal(moved.rank,old.rank);}
 const access=await new ContextTopicAccessService(f.s).page(),choice=access.items.find(row=>row.topicId===created.id);assert.equal(choice.enabled,false);assert.equal(choice.externalAllowed,false);
 const committed=await snapshot(f);assert.deepEqual(await call(f,'result',{operationId:result.operationId}),result);assert.deepEqual(await snapshot(f),committed);
 const undo=await call(f,'restore',{request:{historyOperationId:result.historyOperationId,side:'before',operationId:op()}});assert.equal(undo.state,'committed');for(const id of f.entryIds)assert.equal((await rows(f.s,'placements')).find(row=>row.topicId===parent.id&&row.entryId===id).lifecycle,'active');
});

test('manual gateway forged tokens, stale document, frame and unknown fields refuse without any writes',async t=>{
 const f=await fixture(t),p=await prepare(f),before=await snapshot(f);
 await rejects(call(f,'confirm',{token:{...p.preview},confirmed:true}),'INVALID_REQUEST');
 for(const sender of [{...f.sender(),documentId:'other'}, {...f.sender(),frameId:1}, {...f.sender(),url:'https://chatgpt.com/'}, {...f.sender(),tab:{...f.sender().tab,incognito:true}}])await rejects(f.adapter.handle({type:TYPE,command:'confirm',token:p.token,confirmed:true},sender),'FORBIDDEN');
 await rejects(f.adapter.handle({type:TYPE,command:'cancel',token:p.token,extra:true},f.sender()),'INVALID_REQUEST');assert.deepEqual(await snapshot(f),before);
});

test('manual gateway real Working edit after preview rejects the original stale confirmation',async t=>{
 const f=await fixture(t),p=await prepare(f);await inputEdit(f.s,f.scope[0].inputId,{libraryText:'Genuine newer Working body'});await f.s.run(()=>undefined);const before=await snapshot(f),control=await sdk(f);
 await rejects(call(f,'confirm',{token:p.token,confirmed:true}),'INVALID_REQUEST');assert.deepEqual(await snapshot(f),before);assert.deepEqual(await sdk(f),control);
});

test('manual gateway configured real Human journal refuses before direct foundation writes',async t=>{
 const f=await fixture(t),p=await prepare(f),core=new BrowserNativeSyncCore(f.s.repository,{datasetId:op(),deviceId:op()});f.s.humanLibraryJournal=new HumanLibrarySyncJournal(core);const before=await snapshot(f),control=await sdk(f);
 await rejects(call(f,'confirm',{token:p.token,confirmed:true}),'BNS_GROUP_OWNER_UNSUPPORTED');assert.deepEqual(await snapshot(f),before);assert.deepEqual(await sdk(f),control);
});

test('manual gateway capture pause stays independent; held status does not qualify a replaced document',async t=>{
 const f=await fixture(t);await f.s.setEnabled(false);await f.s.run(()=>undefined);const p=await prepare(f);assert.equal((await call(f,'confirm',{token:p.token,confirmed:true})).state,'committed');
 const g=await fixture(t),original=g.s.status.bind(g.s);g.s.status=async()=>{const result=await original();g.changeDocument('replacement');return result;};const old=g.sender(),before=await snapshot(g);
 await rejects(g.adapter.handle({type:TYPE,command:'prepare',request:g.request()},old),'FORBIDDEN');assert.deepEqual(await snapshot(g),before);
});

test('manual gateway durable commit with lost old-document acknowledgement resolves original result, never reconfirms',async t=>{
 const f=await fixture(t),p=await prepare(f);f.api.runtime.getContexts=async()=>{if(await raw(f.s,'operationReceipts',p.operationId))f.changeDocument('replacement');return f.contexts();};
 await rejects(call(f,'confirm',{token:p.token,confirmed:true}),'FORBIDDEN');assert.equal((await rows(f.s,'topics')).length,2);const before=await snapshot(f),result=await call(f,'result',{operationId:p.operationId});assert.equal(result.state,'committed');assert.equal(result.operationId,p.operationId);assert.deepEqual(await call(f,'resume',{operationId:p.operationId}),result);assert.deepEqual(await snapshot(f),before);
});

test('manual gateway confirmation-started failure cannot falsely cancel signed work; original resume completes it',async t=>{
 const f=await fixture(t),p=await prepare(f),stage=f.adapter.service.stage.bind(f.adapter.service);f.adapter.service.stage=async()=>{throw new ArchiveError('UNAVAILABLE');};
 await rejects(call(f,'confirm',{token:p.token,confirmed:true}),'UNAVAILABLE');assert.equal((await rows(f.s,'organizerWorkItems')).length,1);const before=await snapshot(f);
 await rejects(call(f,'cancel',{token:p.token}),'REQUEST_ALREADY_IN_FLIGHT');assert.deepEqual(await snapshot(f),before);f.adapter.service.stage=stage;
 assert.equal((await call(f,'resume',{operationId:p.operationId})).state,'committed');assert.equal((await rows(f.s,'organizerWorkItems')).length,0);assert.equal((await rows(f.s,'topics')).length,2);
});

test('manual gateway proven replaced preview documents reclaim eight slots without durable writes',async t=>{
 const f=await fixture(t),before=await snapshot(f);for(let i=0;i<10;i++){f.changeDocument('document-'+i);const p=await prepare(f);assert.equal(p.preview.selectedCount,2);}assert.deepEqual(await snapshot(f),before);
});

async function fallback(f){
 delete f.api.runtime.getContexts;let listener,closed=0,identityCalls=0;
 const scope={location:{href:url},navigator:{serviceWorker:{addEventListener:(_type,fn)=>{listener=fn;},removeEventListener:()=>{listener=null;}}}};scope.self=scope;scope.top=scope;
 f.api.runtime.sendMessage=async r=>{identityCalls++;try{return {ok:true,data:await f.adapter.handle(r,f.sender())};}catch(error){return {ok:false,error:error.code};}};
 const {installSectionPromotionClient}=await import('../ui/topic-promotion-client.js');const dispose=installSectionPromotionClient(f.api,scope);
 const client={id:'actual-original-window-client',type:'window',frameType:'top-level',url,postMessage:(data,ports)=>listener({data,ports,isTrusted:true,source:{scriptURL:f.api.runtime.getURL('background/service-worker.js')}})};
 let live=client;f.adapter.clients={matchAll:async()=>[client],get:async()=>live};
 return {client,dispose,scope,replace:()=>{live={...client,id:'new-client'};},remove:()=>{live=null;},calls:()=>identityCalls,closed:()=>closed};
}

test('manual gateway missing-getContexts consumes original private WindowClient/port and current MessageSender',async t=>{
 const f=await fixture(t),client=await fallback(f);t.after(client.dispose);const before=await snapshot(f),p=await prepare(f);assert.equal(p.preview.selectedCount,2);assert.ok(client.calls()>=2);assert.deepEqual(await snapshot(f),before);
 await call(f,'cancel',{token:p.token});assert.deepEqual(await snapshot(f),before);
 await rejects(call(f,'identify',{nonce:op()}),'FORBIDDEN');assert.deepEqual(await snapshot(f),before);
});

test('manual gateway present but failed/malformed context API never falls back or assumes absence',async t=>{
 const f=await fixture(t);let probes=0;f.adapter.clients={matchAll:async()=>{probes++;return [];},get:async()=>null};const before=await snapshot(f);
 f.api.runtime.getContexts=async()=>{throw new ArchiveError('UNAVAILABLE');};await rejects(prepare(f),'UNAVAILABLE');
 f.api.runtime.getContexts=async()=>[{contextType:'TAB',tabId:4}];await rejects(prepare(f),'UNAVAILABLE');assert.equal(probes,0);assert.deepEqual(await snapshot(f),before);
});

test('manual gateway private fallback rejects exact-URL replacement Client and forged port identity',async t=>{
 const f=await fixture(t),client=await fallback(f);t.after(client.dispose);const before=await snapshot(f);client.replace();await rejects(prepare(f),'FORBIDDEN');assert.deepEqual(await snapshot(f),before);
 const g=await fixture(t);delete g.api.runtime.getContexts;
 const forged={id:'forged-window-client',type:'window',frameType:'top-level',url,postMessage:(r,ports)=>ports[0].postMessage({type:r.type,nonce:r.nonce,documentId:g.sender().documentId,tabId:4,windowId:2,incognito:false})};g.adapter.clients={matchAll:async()=>[forged],get:async()=>forged};const pristine=await snapshot(g);await rejects(prepare(g),'FORBIDDEN');assert.deepEqual(await snapshot(g),pristine);
});

test('manual gateway ordinary preview cancellations immediately free all slots in the same document',async t=>{
 const f=await fixture(t),before=await snapshot(f);for(let i=0;i<12;i++){const p=await prepare(f);assert.deepEqual(await call(f,'cancel',{token:p.token}),{state:'cancelled'});}assert.deepEqual(await snapshot(f),before);
});

test('manual gateway late Sync binding still permits side-effect-free preview release and original committed status',async t=>{
 const f=await fixture(t),p=await prepare(f),core=new BrowserNativeSyncCore(f.s.repository,{datasetId:op(),deviceId:op()});f.s.humanLibraryJournal=new HumanLibrarySyncJournal(core);const before=await snapshot(f);
 assert.deepEqual(await call(f,'cancel',{token:p.token}),{state:'cancelled'});assert.deepEqual(await snapshot(f),before);
 const g=await fixture(t),prepared=await prepare(g),result=await call(g,'confirm',{token:prepared.token,confirmed:true});g.s.humanLibraryJournal=new HumanLibrarySyncJournal(new BrowserNativeSyncCore(g.s.repository,{datasetId:op(),deviceId:op()}));const committed=await snapshot(g);
 assert.deepEqual(await call(g,'result',{operationId:result.operationId}),result);assert.deepEqual(await snapshot(g),committed);await rejects(call(g,'resume',{operationId:result.operationId}),'BNS_GROUP_OWNER_UNSUPPORTED');
});

test('manual gateway settled original pre-confirm rejection proves no owned work and immediately frees slots',async t=>{
 const f=await fixture(t);for(let i=0;i<10;i++){const p=await prepare(f),entry=await f.s.entry(f.entryIds[1]);await f.s.editLibraryFields({id:entry.id,expectedRevision:entry.revision,expectedFieldRevisions:{note:entry.fieldRevisions.note},changes:{note:'Actual later note '+i},operationId:op()});const before=await snapshot(f);
 await assert.rejects(call(f,'confirm',{token:p.token,confirmed:true}),error=>error.code==='INVALID_REQUEST'&&error.phase==='promotion_not_confirmed');assert.deepEqual(await snapshot(f),before);assert.equal((await rows(f.s,'organizerWorkItems')).length,0);await rejects(call(f,'cancel',{token:p.token}),'INVALID_REQUEST');}
});

test('manual gateway retired confirmed documents release private slots without cancelling signed work or minting confirmation',async t=>{
 const f=await fixture(t),stage=f.adapter.service.stage.bind(f.adapter.service),operations=[];f.adapter.service.stage=async()=>{throw new ArchiveError('UNAVAILABLE');};
 for(let i=0;i<8;i++){const p=await prepare(f);operations.push(p.operationId);await rejects(call(f,'confirm',{token:p.token,confirmed:true}),'UNAVAILABLE');}
 assert.equal((await rows(f.s,'organizerWorkItems')).length,8);const before=await snapshot(f),control=await sdk(f);f.changeDocument('actual-fresh-document');const ninth=await prepare(f);assert.equal(ninth.preview.selectedCount,2);assert.deepEqual(await snapshot(f),before);assert.deepEqual(await sdk(f),control);await call(f,'cancel',{token:ninth.token});
 for(const operationId of operations){const resumed=await f.adapter.service.resume('personal-topic-manual-promotion:'+operationId);assert.equal(resumed.row.confirmed.request.operationId,operationId);assert.equal(resumed.row.state,'confirmed');}
 assert.deepEqual(await snapshot(f),before);f.adapter.service.stage=stage;const result=await call(f,'resume',{operationId:operations[0]});assert.equal(result.state,'committed');assert.equal(result.operationId,operations[0]);assert.equal((await rows(f.s,'topics')).length,2);assert.equal((await rows(f.s,'organizerWorkItems')).length,7);
});

test('manual gateway atomically bounds nine concurrent original prepares and releases failed reservations',async t=>{
 const f=await fixture(t),original=f.adapter.service.prepare.bind(f.adapter.service),before=await snapshot(f),releases=[];let entered=0,resolveBoundary;const boundary=new Promise(resolve=>resolveBoundary=resolve),errors=[];
 f.adapter.service.prepare=async request=>{const handle=await original(request);entered++;if(entered===9||entered===8&&errors.includes('REQUEST_ALREADY_IN_FLIGHT'))resolveBoundary();await new Promise(resolve=>releases.push(resolve));return handle;};
 const requests=Array.from({length:9},()=>prepare(f).catch(error=>{errors.push(error.code);if(error.code==='REQUEST_ALREADY_IN_FLIGHT'&&entered===8)resolveBoundary();throw error;})),finished=Promise.allSettled(requests);
 try{await boundary;assert.equal(entered,8,'no ninth real owner prepare may start while eight private reservations remain live');assert.deepEqual(errors,['REQUEST_ALREADY_IN_FLIGHT']);assert.deepEqual(await snapshot(f),before);}finally{for(const release of releases.splice(0))release();await finished;}
 const outcomes=await finished;assert.equal(outcomes.filter(result=>result.status==='fulfilled').length,8);for(const result of outcomes)if(result.status==='fulfilled')await call(f,'cancel',{token:result.value.token});assert.deepEqual(await snapshot(f),before);
 f.adapter.service.prepare=async()=>{throw new ArchiveError('INVALID_REQUEST');};for(let i=0;i<10;i++)await rejects(prepare(f),'INVALID_REQUEST');f.adapter.service.prepare=original;const p=await prepare(f);await call(f,'cancel',{token:p.token});assert.deepEqual(await snapshot(f),before);
});

test('installed metadata checkpoint lookup preserves the original paused-capture manual Section action',async t=>{
 const f=await fixture(t);await f.s.setEnabled(false);await f.s.run(()=>undefined);f.adapter=new TopicSectionPromotionCommands(f.s,f.api,{checkpointStorage:{session:null}});
 assert.deepEqual(await call(f,'proposal',{request:{topicId:f.parent.id,sectionId:f.section.sectionId}}),{state:'none'});const prepared=await prepare(f),result=await call(f,'confirm',{token:prepared.token,confirmed:true});assert.equal(result.state,'committed');assert.equal(result.operationId,prepared.operationId);assert.equal((await f.s.status()).enabled,false);
});

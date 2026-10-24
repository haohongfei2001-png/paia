import {MemoryService} from '../../core/memory/service.js';
import assert from 'node:assert/strict';
import {setup,derived} from './thought-m1.mjs';
import {OrganizerStore} from '../../core/organizer/store.js';
import {createOrganizeActionSource,chargeOriginalOrganizeWork} from '../../background/organize-action-source.js';
import {captureOriginalOrganizeScope,releaseOriginalOrganizeScope} from '../../core/organizer/organize-processing-scope.js';
import {captureOrganizeProcessingGrant,readOrganizeProcessingGrant,organizeProcessingReader,releaseOrganizeProcessingGrant,captureOriginalOrganizeScopeReader,readOriginalOrganizeScopeReader,assertOriginalOrganizeScopeReaderFacts} from '../../background/organize-processing-policy.js';
import {inputProjection} from '../../core/thought-evidence.js';
import {readLocalOrganizeScopeInTransaction} from '../../core/organizer/ai-presentation.js';
import {configDefault,key as memoryKey} from '../../core/memory/model.js';

const event=()=>({addListener(){},removeListener(){}});
async function fixture(t,{input=false,restriction=null,presentation=null,memorySetup=null,body='PRIVATE authored body',consume=true,style=null}={}){
 const {s}=await setup(OrganizerStore),topic=await s.createTopic({name:'PRIVATE topic',operationId:crypto.randomUUID()}),inputId=await s.run(()=>s.repository.transaction(false,async tx=>(await tx.all('blocks'))[0].id));
 const entry=input?await derived(s,[inputId]):await s.createEntry({actor:'user',operationId:crypto.randomUUID(),body,title:'PRIVATE title',note:'PRIVATE note',type:'idea',formation:'explicit',evidence:[]});
 await s.placeEntry({topicId:topic.id,entryId:entry.id,expectedEntryRevision:entry.revision,expectedTopicRevision:(await s.topic(topic.id)).organizationRevision,operationId:crypto.randomUUID()});
 const sender={id:'synthetic',frameId:0,documentId:'document',url:'chrome-extension://synthetic/ui/archive.html',tab:{id:1,windowId:2,incognito:false}},api={runtime:{id:sender.id,getURL:p=>'chrome-extension://synthetic/'+p,async getContexts(){return [{contextType:'TAB',documentId:sender.documentId,documentUrl:sender.url,tabId:1,windowId:2,frameId:0,incognito:false}];}},tabs:{onUpdated:event(),onRemoved:event(),async get(){return {...sender.tab,url:sender.url};}}},source=createOrganizeActionSource(s,api);
 t.after(()=>{source.dispose();s.repository.db?.close();});
 if(restriction)await s.repository.transaction(true,async tx=>{if(restriction==='localOnly')await tx.put('meta',{...configDefault(),localOnly:true});if(restriction==='entry')await tx.put('meta',{id:memoryKey('entry',entry.id),kind:'entry',version:1,entryId:entry.id,excluded:true});if(restriction==='input')await tx.put('meta',{id:memoryKey('input',inputId),kind:'input',version:1,inputId,excluded:true});if(restriction==='topic')await tx.put('meta',{id:memoryKey('topic','default',topic.id),kind:'topic',version:1,profileId:'default',topicId:topic.id,decision:'never',layoutGeneration:1});});
 if(memorySetup)await memorySetup(new MemoryService(s));
 if(presentation){const row=await presentation({s,topic,entry,inputId});await s.repository.transaction(true,tx=>tx.put('meta',row));}
 if(style)assert.equal((await s.updatePreferences({aiOrganizeStyle:{version:1,value:style,expectedRevision:0,expectedEpoch:'initial'}})).ok,true);
 const selection=await source.select(sender,{topicId:topic.id}),action=consume?await source.consume(sender,{topicId:topic.id,scopeBinding:selection.scopeBinding,userActionId:crypto.randomUUID()}):null;
 const read=fn=>s.run(()=>s.repository.transaction(false,async tx=>{const proof=await captureOriginalOrganizeScope(s,tx,topic.id,source,action);let grant;try{grant=captureOrganizeProcessingGrant(source,action,s,tx,proof);return await fn(organizeProcessingReader(grant,s,tx),grant,tx);}finally{if(grant)releaseOrganizeProcessingGrant(grant);releaseOriginalOrganizeScope(proof);}}));
 return {s,source,topic,entry,inputId,action,read};
}


const profile={contractVersion:'test',modelVersion:'test',promptVersion:'test'};
const material=(f,tx,cap)=>readLocalOrganizeScopeInTransaction(f.s,tx,f.topic.id,profile,3,1,false,cap);
function rawObserve(tx,onRow){const stores=new WeakSet(),original=tx.tx.objectStore.bind(tx.tx);tx.tx.objectStore=name=>{const store=original(name);if(stores.has(store))return store;stores.add(store);const get=store.get.bind(store);store.get=key=>{const request=get(key);request.addEventListener('success',()=>onRow(name,key,request.result));return request;};return store;};}



export {fixture,material};

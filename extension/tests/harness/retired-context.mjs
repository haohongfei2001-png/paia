import assert from 'node:assert/strict';
import {setup,local,derived,inputEdit} from './thought-m1.mjs';
import {OrganizerStore} from '../../core/organizer/store.js';
import {MemoryService} from '../../core/memory/service.js';
import {profileDefault,configDefault,key,SESSION_KEY} from '../../core/memory/model.js';
import {PassportService,passportGrantId} from '../../core/passport.js';
import {ContextPackageService} from '../../core/context-package-service.js';
import {ManualContext} from '../../core/manual-context.js';

// Historical metadata is inserted only as synthetic pre-retirement user state.
// None of these fixtures replaces, patches, or enables a production service.
export async function retainedContextFixture({variant='allowed',long=false}={}){
 const {s,storage,indexedDB}=await setup(OrganizerStore);
 await s.setFilterMode('off');await s.finishFoundation();
 const input=(await s.snapshot()).library.blocks[0];
 const e=await derived(s,[input.id],{body:'SYNTHETIC retained Thought '+(long?'内容'.repeat(20000):'human evidence')});
 const edited=await s.editEntry({operationId:crypto.randomUUID(),id:e.id,expectedRevision:e.revision,changes:{body:'SYNTHETIC protected human revision '+(long?'历史'.repeat(20000):'remains readable')}});
 const created=await s.createTopic({operationId:crypto.randomUUID(),name:'Synthetic retained Topic'}),topic=await s.topic(created.id);
 await s.placeEntry({operationId:crypto.randomUUID(),topicId:topic.id,entryId:e.id,expectedEntryRevision:edited.revision,expectedTopicRevision:(await s.topic(topic.id)).organizationRevision});
 const session=local();await session.set({[SESSION_KEY]:{version:1,revision:1,grants:{[key('topic','default',topic.id)]:topic.activeLayoutGeneration}},'deepseek-organizer-session-credential':{apiKey:'SYNTHETIC_UNREAD_LEGACY_KEY'}});
 const memory=new MemoryService(s,{session});
 await s.repository.transaction(true,async t=>{
  await t.put('meta',{...configDefault(),externalAccess:true,includeUnorganizedInputs:true,userTouched:true});
  await t.put('meta',profileDefault());
  await t.put('meta',{...profileDefault(),id:key('profile','historical'),profileId:'historical',name:'Historical profile',instruction:'Synthetic saved instruction',revision:7});
  await t.put('meta',{id:key('topic','default',topic.id),kind:'topic',version:1,profileId:'default',topicId:topic.id,decision:variant==='denied'?'denied':variant==='never'?'never':'allowed',layoutGeneration:topic.activeLayoutGeneration});
  await t.put('meta',{id:'product-signals-v1',version:1,enabled:true,daily:{'2026-01-01':{'synthetic':3}}});
 });
 const passport=new PassportService(s),grant=await passport.create({consumer:'chatgpt',purpose:'research',profileId:'default',duration:variant==='once'?'once':'7d'});
 if(variant==='revoked')await passport.revoke(grant.grantId);
 if(variant==='expired')await s.repository.transaction(true,async t=>{const row=await t.get('meta',passportGrantId(grant.grantId));await t.put('meta',{...row,expiresAt:'2000-01-01T00:00:00.000Z'});});
 if(variant==='consumed')await passport.consume(grant.grantId,'copy');
 if(variant==='excluded')await memory.exclude({inputId:input.id,excluded:true});
 if(variant==='edited')await inputEdit(s,input.id,{libraryText:'SYNTHETIC newer Input revision'});
 if(variant==='removed')await s.excludeLibrary(input.id,true);
 if(variant==='hidden')await s.repository.transaction(true,async t=>{const row=await t.get('recordIndex',input.sourceRecordId);await t.put('recordIndex',{...row,hidden:true});});
 if(variant==='missing')await s.repository.transaction(true,t=>t.delete('records',input.sourceRecordId));
 if(variant==='legacy')await s.repository.transaction(true,async t=>{const row=await t.get('meta','memory:config');delete row.externalAccess;delete row.localOnly;delete row.includeUnorganizedInputs;await t.put('meta',row);});
 if(variant==='local-only')await memory.settings({externalAccess:false,localOnly:true});
 return {s,storage,indexedDB,input,entry:e,topic,session,memory,passport,grant};
}

export async function durableRows(s){
 const names=[...s.repository.db.objectStoreNames];
 return s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all(names.map(async name=>[name,await t.all(name)]))),names);
}

export async function assertRetiredContext({owner='package',method='manual',action='create',variant='allowed',long=false,payload={}}={}){
 const f=await retainedContextFixture({variant,long});
 const before=await durableRows(f.s),sessionBefore=await f.session.get(SESSION_KEY),credentialBefore=await f.session.get('deepseek-organizer-session-credential');
 const packages=new ContextPackageService(f.memory,f.passport),manual=new ManualContext(f.memory,f.passport);
 const target=owner==='memory'?f.memory:owner==='manual'?manual:packages;
 const options={action,query:'PRIVATE_QUERY_MUST_NOT_BE_READ',profileId:'historical',previewId:'old-preview',selectionId:'old-selection',generation:7,grantId:f.grant.grantId,format:'copy',refs:[{kind:'input',id:f.input.id,revision:f.input.revision}],...payload};
 // Fail if a retired method even opens a transaction, reads a credential, asks
 // for permission, or creates a network request; snapshot equality also covers
 // versions, source rows, old profiles, signals, grants and their audit history.
 const tx=f.s.repository.transaction,sessionGet=f.session.get,sessionSet=f.session.set,fetchBefore=globalThis.fetch;
 let accesses=0;
 const forbidden=()=>{accesses++;throw Error('Retired entry accessed content, credentials or transport');};
 f.s.repository.transaction=forbidden;f.session.get=forbidden;f.session.set=forbidden;globalThis.fetch=forbidden;
 try{await assert.rejects(async()=>target[method](options,{id:'synthetic-owner',tab:{id:1}}),{code:'FEATURE_UNAVAILABLE'});}
 finally{f.s.repository.transaction=tx;f.session.get=sessionGet;f.session.set=sessionSet;globalThis.fetch=fetchBefore;}
 assert.equal(accesses,0);
 assert.equal(packages.packages.size,0);assert.equal(packages.manualSelections.sessions.size,0);assert.equal(manual.sessions.size,0);assert.equal(f.memory.previews.size,0);
 assert.deepEqual(await durableRows(f.s),before);
 assert.deepEqual(await f.session.get(SESSION_KEY),sessionBefore);
 assert.deepEqual(await f.session.get('deepseek-organizer-session-credential'),credentialBefore);
 return f;
}

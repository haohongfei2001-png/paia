import {MemoryService} from '../core/memory/service.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,derived} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {createOrganizeActionSource} from '../background/organize-action-source.js';
import {captureOriginalOrganizeScope,releaseOriginalOrganizeScope} from '../core/organizer/organize-processing-scope.js';
import {captureOrganizeProcessingGrant,readOrganizeProcessingGrant,organizeProcessingReader,releaseOrganizeProcessingGrant} from '../background/organize-processing-policy.js';
import {inputProjection} from '../core/thought-evidence.js';
import {readLocalOrganizeScopeInTransaction} from '../core/organizer/ai-presentation.js';
import {configDefault,key as memoryKey} from '../core/memory/model.js';

const event=()=>({addListener(){},removeListener(){}});
async function fixture(t,{input=false,restriction=null,presentation=null,memorySetup=null,body='PRIVATE authored body'}={}){
 const {s}=await setup(OrganizerStore),topic=await s.createTopic({name:'PRIVATE topic',operationId:crypto.randomUUID()}),inputId=await s.run(()=>s.repository.transaction(false,async tx=>(await tx.all('blocks'))[0].id));
 const entry=input?await derived(s,[inputId]):await s.createEntry({actor:'user',operationId:crypto.randomUUID(),body,title:'PRIVATE title',note:'PRIVATE note',type:'idea',formation:'explicit',evidence:[]});
 await s.placeEntry({topicId:topic.id,entryId:entry.id,expectedEntryRevision:entry.revision,expectedTopicRevision:(await s.topic(topic.id)).organizationRevision,operationId:crypto.randomUUID()});
 const sender={id:'synthetic',frameId:0,documentId:'document',url:'chrome-extension://synthetic/ui/archive.html',tab:{id:1,windowId:2,incognito:false}},api={runtime:{id:sender.id,getURL:p=>'chrome-extension://synthetic/'+p,async getContexts(){return [{contextType:'TAB',documentId:sender.documentId,documentUrl:sender.url,tabId:1,windowId:2,frameId:0,incognito:false}];}},tabs:{onUpdated:event(),onRemoved:event(),async get(){return {...sender.tab,url:sender.url};}}},source=createOrganizeActionSource(s,api);
 t.after(()=>{source.dispose();s.repository.db?.close();});
 if(restriction)await s.repository.transaction(true,async tx=>{if(restriction==='localOnly')await tx.put('meta',{...configDefault(),localOnly:true});if(restriction==='entry')await tx.put('meta',{id:memoryKey('entry',entry.id),kind:'entry',version:1,entryId:entry.id,excluded:true});if(restriction==='input')await tx.put('meta',{id:memoryKey('input',inputId),kind:'input',version:1,inputId,excluded:true});if(restriction==='topic')await tx.put('meta',{id:memoryKey('topic','default',topic.id),kind:'topic',version:1,profileId:'default',topicId:topic.id,decision:'never',layoutGeneration:1});});
 if(memorySetup)await memorySetup(new MemoryService(s));
 if(presentation){const row=await presentation({s,topic,entry,inputId});await s.repository.transaction(true,tx=>tx.put('meta',row));}
 const selection=await source.select(sender,{topicId:topic.id}),action=await source.consume(sender,{topicId:topic.id,scopeBinding:selection.scopeBinding,userActionId:crypto.randomUUID()});
 const read=fn=>s.run(()=>s.repository.transaction(false,async tx=>{const proof=await captureOriginalOrganizeScope(s,tx,topic.id,source,action);let grant;try{grant=captureOrganizeProcessingGrant(source,action,s,tx,proof);return await fn(organizeProcessingReader(grant,s,tx),grant,tx);}finally{if(grant)releaseOrganizeProcessingGrant(grant);releaseOriginalOrganizeScope(proof);}}));
 return {s,source,topic,entry,inputId,action,read};
}

test('original authored Entry qualifier reads exact permitted fields through its original readable owner',async t=>{
 const f=await fixture(t);await f.read(async(reader,grant,tx)=>{const scope=readOrganizeProcessingGrant(grant,f.s,tx).scope;assert.equal(scope.purpose,'organize-local-qualification');assert.deepEqual(scope.entries[0].selectedFields,['body','title','note','type','formation']);const row=await f.s.readableEntry(reader,f.entry.id);assert.equal(row.thoughtText,'PRIVATE authored body');assert.equal(row.title,'PRIVATE title');assert.equal(row.note,'PRIVATE note');assert.equal(row.type,'idea');assert.equal((await reader.get('topics',f.topic.id)).name,'PRIVATE topic');});
});

test('Input and original Source qualification reuses inputProjection without legacy Source annotation access',async t=>{
 const f=await fixture(t,{input:true});let legacy=0;
 await f.read(async(reader,_g,tx)=>{const objectStore=tx.tx.objectStore.bind(tx.tx);tx.tx.objectStore=table=>{const store=objectStore(table);if(table!=='records')return store;const get=store.get.bind(store);store.get=id=>{const r=get(id);r.addEventListener('success',()=>{if(r.result)for(const k of ['note','editedText'])Object.defineProperty(r.result.value,k,{enumerable:true,configurable:true,get(){legacy++;throw Error('UNAUTHORIZED_LEGACY');}});});return r;};return store;};const input=await inputProjection(f.s,reader,f.inputId);assert.equal(input.body,'Synthetic explicit working input');assert.equal(input.sourceRecordIds.length,1);assert.equal((await f.s.readableEntry(reader,f.entry.id)).thoughtText,'Synthetic conclusion');});assert.equal(legacy,0);
});

for(const restriction of ['localOnly','entry','input','topic'])test('explicit Organize intent cannot override independent '+restriction+' restriction',async t=>{
 const f=await fixture(t,{input:restriction==='input',restriction});let called=false;await assert.rejects(f.read(async()=>{called=true;}));assert.equal(called,false);
});

test('copied or foreign grants cannot create a qualification reader',async t=>{
 const f=await fixture(t);await f.read(async(_r,g,tx)=>{assert.throws(()=>organizeProcessingReader({...g},f.s,tx));assert.throws(()=>organizeProcessingReader(g,{...f.s},tx));assert.throws(()=>organizeProcessingReader(g,f.s,{...tx}));});
});

test('a returned row still checks the original action before evaluating a text descriptor',async t=>{
 const f=await fixture(t);await f.read(async reader=>{const row=await reader.get('thoughts',f.entry.id);f.source.invalidate();assert.throws(()=>row.thoughtText);});
});

test('future nested metadata accessors and unselected semantic properties are not cloned by the qualifier',async t=>{
 const f=await fixture(t);let reads=0;
 await f.read(async(reader,_g,tx)=>{const objectStore=tx.tx.objectStore.bind(tx.tx);tx.tx.objectStore=table=>{const store=objectStore(table);if(table!=='thoughts')return store;const get=store.get.bind(store);store.get=id=>{const r=get(id);r.addEventListener('success',()=>{if(r.result){Object.defineProperty(r.result,'futurePrivateText',{enumerable:true,get(){reads++;throw Error('PRIVATE');}});Object.defineProperty(r.result.fieldRevisions,'futurePrivateText',{enumerable:true,get(){reads++;throw Error('PRIVATE');}});}});return r;};return store;};const row=await f.s.readableEntry(reader,f.entry.id);assert.equal(row.thoughtText,'PRIVATE authored body');assert.equal('futurePrivateText' in row,false);});assert.equal(reads,0);
});

test('an unrelated Entry or Input is not authorized by the selected Topic intent',async t=>{
 const f=await fixture(t),other=await f.s.createEntry({actor:'user',operationId:crypto.randomUUID(),body:'OTHER body',type:'fact',formation:'explicit',evidence:[]});
 await f.read(async reader=>{await assert.rejects(reader.get('thoughts',other.id));await assert.rejects(reader.get('blocks',f.inputId));});
});

test('a presentation appearing after original action invalidates qualification before semantic fields',async t=>{
 const f=await fixture(t);await f.s.repository.transaction(true,tx=>tx.put('meta',{id:'aiPresentation:'+f.topic.id,topicId:f.topic.id,body:'PRIVATE prior generated body'}));let entered=0;await assert.rejects(f.read(async()=>{entered++;}));assert.equal(entered,0);
});

test('original complete Organize scope consumes only the independently qualified initial fields',async t=>{
 const f=await fixture(t);await f.read(async reader=>{
  const prepared=await readLocalOrganizeScopeInTransaction(f.s,reader,f.topic.id,{contractVersion:'test',modelVersion:'test',promptVersion:'test'},3,1,false);
  assert.equal(prepared.topic.id,f.topic.id);assert.equal(prepared.inputs.length,1);assert.equal(prepared.inputs[0].text,'PRIVATE authored body');
 });
});


test('accepted legacy presentation fields require the same original selected action and complete qualifier',async t=>{
 const {AI_LIST_FIELDS}=await import('../core/organizer/ai-contract.js');
 const f=await fixture(t,{presentation:({topic,entry})=>({id:'aiPresentation:'+topic.id,topicId:topic.id,revision:1,blockSummary:'Accepted summary',currentView:'Accepted view',...Object.fromEntries(AI_LIST_FIELDS.map(k=>[k,[]])),evidenceEntryIds:[entry.id],protections:{},basedOnCheckpoint:{entryVersions:{[entry.id]:'old-version'}}})});
 await f.read(async(reader,grant,tx)=>{
  assert.deepEqual(readOrganizeProcessingGrant(grant,f.s,tx).scope.presentations.map(x=>x.id),['aiPresentation:'+f.topic.id]);
  const saved=await reader.get('meta','aiPresentation:'+f.topic.id);assert.equal(saved.currentView,'Accepted view');assert.deepEqual(saved.evidenceEntryIds,[f.entry.id]);
  const prepared=await readLocalOrganizeScopeInTransaction(f.s,reader,f.topic.id,{contractVersion:'test',modelVersion:'test',promptVersion:'test'},1,1,false);assert.equal(prepared.topic.stored.currentView,'Accepted view');
 });
});

test('pending presentation never grants access to its unaccepted proposal',async t=>{
 const f=await fixture(t,{presentation:({topic})=>({id:'aiPresentation:'+topic.id,topicId:topic.id,revision:1,candidate:{private:'PRIVATE pending body'}})});let entered=0;await assert.rejects(f.read(async()=>{entered++;}));assert.equal(entered,0);
});

test('original v3 retained-block planning remains NO_DELTA through the exact accepted-field qualifier',async t=>{
 const profile={contractVersion:'test',modelVersion:'test',promptVersion:'test'};
 const {validateIncrementalChild}=await import('../core/organizer/ai-incremental-v2.js');
 const {committedV3Generation,mergeIncrementalV3}=await import('../core/organizer/ai-incremental-v3.js');
 const f=await fixture(t,{presentation:async({s,topic})=>{
  const prepared=await s.repository.transaction(false,tx=>readLocalOrganizeScopeInTransaction(s,tx,topic.id,profile,3,1,false)),input=prepared.inputs[0],request={topicId:topic.id,style:prepared.style,profile,inputs:prepared.inputs};
  const blocks=validateIncrementalChild({version:2,blocks:[{field:'currentView',text:input.text,evidenceEntryIds:[input.ref],sourceSpans:[{entryId:input.ref,revision:input.revision,start:0,end:input.text.length}]}]},request,prepared);
  const generation=await committedV3Generation({jobId:'synthetic-job',children:[{childId:'synthetic-child',operationReceiptId:'synthetic-receipt',payloadDigest:'a'.repeat(64),validatedOutputDigest:'b'.repeat(64)}],style:prepared.style.value,profile,control:prepared.incremental.control});
  return {...mergeIncrementalV3(blocks,request,prepared,generation),id:'aiPresentation:'+topic.id,revision:1,basedOnCheckpoint:{entryVersions:prepared.topic.versions}};
 }});
 await f.read(async reader=>{const prepared=await readLocalOrganizeScopeInTransaction(f.s,reader,f.topic.id,profile,3,1,false);assert.equal(prepared.inputs.length,0);assert.equal(prepared.incremental.selected.length,0);assert.equal(prepared.incremental.retained.length,1);assert.equal(prepared.topic.stored.projection.currentView,'PRIVATE authored body');});
});


for(const route of ['leave local-only','revoke external connections'])test('new explicit Organize action remains available after original Memory '+route,async t=>{
 const f=await fixture(t,{memorySetup:async memory=>{if(route==='leave local-only'){await memory.settings({localOnly:true,externalAccess:false});await memory.settings({localOnly:false,externalAccess:false});}else await memory.settings({externalAccess:false,clearTemporary:true});}});
 await f.read(async reader=>assert.equal((await f.s.readableEntry(reader,f.entry.id)).thoughtText,'PRIVATE authored body'));
});

test('actual Memory local-only setting still refuses all Organize qualification',async t=>{
 const f=await fixture(t,{memorySetup:memory=>memory.settings({localOnly:true,externalAccess:false})});let entered=0;await assert.rejects(f.read(async()=>entered++));assert.equal(entered,0);
});


test('one original Organize action cannot reset its byte budget by reissuing transaction grants',async t=>{
 const f=await fixture(t,{body:'x'.repeat(100000)});
 await f.read(async reader=>{const row=await reader.get('thoughts',f.entry.id);for(let i=0;i<12;i++)assert.equal(row.thoughtText.length,100000);});
 await assert.rejects(f.read(async reader=>{const row=await reader.get('thoughts',f.entry.id);for(let i=0;i<12;i++)assert.equal(row.thoughtText.length,100000);}));
 await assert.rejects(f.read(async reader=>reader.get('thoughts',f.entry.id)));
});


test('original complete Organize scope retains current Input-derived Entry filtering qualification',async t=>{
 const f=await fixture(t,{input:true});await f.read(async reader=>{const prepared=await readLocalOrganizeScopeInTransaction(f.s,reader,f.topic.id,{contractVersion:'test',modelVersion:'test',promptVersion:'test'},3,1,false);assert.equal(prepared.inputs.length,1);assert.equal(prepared.inputs[0].text,'Synthetic conclusion');});
});


for(const keep of [false,true])test('original deterministic filtered Input stays excluded unless original Keep owner protects it: '+keep,async t=>{
 const f=await fixture(t,{input:true});await f.s.repository.transaction(true,async tx=>{const row=await tx.get('filterInputs',f.inputId),state=await tx.get('inputStates',f.inputId);await tx.put('filterInputs',{...row,decision:'filter',authorship:'untouched',userEdited:false,filterOverride:'none',basedOnContentRevision:state.contentRevision,presence:{version:1,confidence:'verified',attachment:'absent',reference:'absent'}});});
 if(keep)await f.s.keepInput(f.inputId);
 const work=()=>f.read(reader=>readLocalOrganizeScopeInTransaction(f.s,reader,f.topic.id,{contractVersion:'test',modelVersion:'test',promptVersion:'test'},3,1,false));
 if(keep)assert.equal((await work()).inputs[0].text,'Synthetic conclusion');else await assert.rejects(work());
});

test('an existing AI Filter decision defers Organize until its original independent read owner is connected',async t=>{
 const f=await fixture(t,{input:true});await f.s.repository.transaction(true,async tx=>{const row=await tx.get('filterInputs',f.inputId);await tx.put('filterInputs',{...row,aiDecision:{version:1}});});
 await assert.rejects(f.read(reader=>readLocalOrganizeScopeInTransaction(f.s,reader,f.topic.id,{contractVersion:'test',modelVersion:'test',promptVersion:'test'},3,1,false)));
});


test('qualification projects only original control fields and its selected Topic checkpoint',async t=>{
 const f=await fixture(t);let hiddenReads=0;await f.s.repository.transaction(true,tx=>tx.put('meta',{id:'aiOrganizerCheckpoint',view:'ai',version:3,lastSequence:0,inputVersions:{},topicVersions:{[f.topic.id]:{}}}));
 await f.read(async(reader,_g,tx)=>{const original=tx.tx.objectStore.bind(tx.tx),wrapped=new WeakSet();tx.tx.objectStore=table=>{const store=original(table);if(table!=='meta'||wrapped.has(store))return store;wrapped.add(store);const get=store.get.bind(store);store.get=id=>{const request=get(id);request.addEventListener('success',()=>{if(!request.result)return;Object.defineProperty(request.result,'unselectedPrivateText',{enumerable:true,get(){hiddenReads++;throw Error('PRIVATE');}});if(id==='aiOrganizerCheckpoint')Object.defineProperty(request.result.topicVersions,'unselected-topic',{enumerable:true,get(){hiddenReads++;throw Error('PRIVATE');}});});return request;};return store;};const prepared=await readLocalOrganizeScopeInTransaction(f.s,reader,f.topic.id,{contractVersion:'test',modelVersion:'test',promptVersion:'test'},3,1,false);assert.equal(prepared.inputs[0].text,'PRIVATE authored body');assert.deepEqual(Object.keys(prepared.checkpoint.topicVersions),[f.topic.id]);assert.equal(JSON.stringify(prepared.checkpoint).includes('unselected'),false);});assert.equal(hiddenReads,0);
});

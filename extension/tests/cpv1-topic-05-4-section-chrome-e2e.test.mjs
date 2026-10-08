import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {resolve,join} from 'node:path';
import {FakeChatGPT,eventually} from './harness/fake-chatgpt.mjs';
import {thoughtPrimary} from './harness/current-thought-navigation.mjs';
const rpc=async(p,type,fields={})=>{const r=await p.evaluate(message=>chrome.runtime.sendMessage(message),{type,...fields});assert.equal(r?.ok,true,JSON.stringify(r));return r.data;};
for(const variant of ['source','release'])test('TOPIC-05.4 native bounded Section reading and exact retained prose '+variant,{timeout:180000},async()=>{
 const release=variant==='release'?await mkdtemp(join(tmpdir(),'paia-section-reading-')):null;
 if(release)execFileSync('python3',['scripts/build_current_release.py',release],{stdio:'pipe'});
 const h=await FakeChatGPT.start({extensionPath:release||resolve('.')}),p=h.archive,dir='work/qa-topic05-section/'+variant;await mkdir(dir,{recursive:true});
 try{
  await p.setViewportSize({width:1440,height:1000});await p.locator('#enable-consent').click();if(await p.locator('#onboarding-skip').isVisible())await p.locator('#onboarding-skip').click();
  const f=await p.evaluate(async()=>{
   const {OrganizerStore}=await import('../core/organizer/store.js'),s=new OrganizerStore(chrome.storage.local),op=()=>crypto.randomUUID();await s.finishFoundation();
   const topic=await s.createTopic({name:'SYNTHETIC continuous Section native',operationId:op()}),sections=[];
   for(const title of ['SYNTHETIC Chapter A','SYNTHETIC Chapter B','SYNTHETIC empty chapter'])sections.push(await s.createSection({topicId:topic.id,expectedTopicRevision:(await s.topic(topic.id)).organizationRevision,title,operationId:op()}));
   const first=await s.continueThinking({topicId:topic.id,body:'SYNTHETIC native 000\n\n中文 👩🏽‍💻 é\n\n```js\nconst value = 0;\n```',operationId:op()}),largeBody='SYNTHETIC long prose\n\n'+('中文 exact long paragraph 👩🏽‍💻\n\n'.repeat(4000)),ids=[first.id],bodies=[(await s.readingEntry(first.id)).body];
   // Seed every row through the actual domain owner; no synthetic index or
   // authority shortcuts are used by this native fixture.
   for(let i=1;i<165;i++){
    const body=i===1?largeBody:`SYNTHETIC native ${String(i).padStart(3,'0')}\n\n中文 precise paragraph ${i}`,entry=await s.continueThinking({topicId:topic.id,body,operationId:op()});ids.push(entry.id);bodies.push(body);
    if(i>=55){const placement=await s.libraryPlacement(topic.id,entry.id);await s.placeEntry({entryId:entry.id,topicId:topic.id,sectionId:sections[i<110?0:1].sectionId,expectedEntryRevision:entry.revision,expectedPlacementRevision:placement.revision,expectedTopicRevision:(await s.topic(topic.id)).organizationRevision,operationId:op()});}
   }
   return {topicId:topic.id,defaultSectionId:topic.defaultSectionId,ids,bodies,sections:sections.map(x=>x.sectionId),largeBody};
  });
  const admitted=await rpc(p,'GET_LIBRARY_SECTION_READING',{options:{topicId:f.topicId,limit:40}});assert.equal(admitted.unavailable,undefined,JSON.stringify(admitted));
  await thoughtPrimary(p,'thoughts');const link=p.locator(`.personal-topic-block[data-topic-id="${f.topicId}"] .personal-topic-link`);await link.click();
  const field=id=>p.locator(`#topic-body [data-entry-id="${id}"] [data-entry-field="body"]`);
  await field(f.ids[0]).waitFor({state:'visible'});assert.equal(await field(f.ids[0]).textContent(),f.bodies[0]);
  const large=p.locator(`#topic-body [data-entry-id="${f.ids[1]}"]`);await large.getByRole('button',{name:'读取完整内容',exact:true}).click();await field(f.ids[1]).waitFor({state:'visible'});assert.equal(await field(f.ids[1]).textContent(),f.largeBody);
  assert.equal(await p.locator('#topic-body .topic-expression-year').count(),0,'Section reading has no old year timeline');
  assert.equal(await p.locator(`#topic-body .topic-section[data-section-id] > .section-heading`).count()>=0,true);
  assert.equal(await p.locator(`#topic-body .topic-section[data-section-id="${f.defaultSectionId}"] > .section-heading`).count(),0,'untitled default Section has no manufactured heading');
  // Native composition must pin the exact editor node across forward loads.
  await field(f.ids[0]).focus();await field(f.ids[0]).evaluate(node=>{globalThis.__sectionPinned=node;node.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true,data:'合'}));node.textContent+=' SYNTHETIC composing draft';node.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertCompositionText',data:'合',isComposing:true}));});
  await p.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));
  await eventually(()=>p.locator(`#topic-body [data-entry-id="${f.ids[50]}"]`).count().then(n=>n===1),'forward reading extends while the composing editor remains protected');
  assert.equal(await field(f.ids[0]).evaluate(node=>node===globalThis.__sectionPinned&&node.isConnected),true);assert.match(await field(f.ids[0]).textContent(),/SYNTHETIC composing draft/);assert.equal((await rpc(p,'GET_LIBRARY_ENTRY',{id:f.ids[0]})).body,f.bodies[0],'composition is not durably committed');
  await field(f.ids[0]).evaluate((node,body)=>{node.textContent=body;node.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:''}));node.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText'}));},f.bodies[0]);await p.locator('#topic-heading').click();
  await eventually(async()=>{await p.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));return await p.locator('#topic-continuous-after').getAttribute('data-terminal')==='true';},'all 165 canonical Entries reach the actual end',30000);
  assert.equal(await field(f.ids[164]).textContent(),f.bodies[164]);assert.equal(await p.locator(`#topic-body [data-entry-id="${f.ids[0]}"]`).count(),0,'old unprotected Entry is actually evicted');assert.ok(await p.locator('#topic-body [data-entry-id]').count()<=120,'retained DOM respects the three-chunk window');
  for(const [i,title]of [[1,'SYNTHETIC Chapter B'],[2,'SYNTHETIC empty chapter']])assert.equal(await p.locator(`.topic-section[data-section-id="${f.sections[i]}"] > .section-heading > h2`).textContent(),title);
  await p.screenshot({path:dir+'/end.png',fullPage:true});
  // Scroll back through real spacer geometry; hydrate the same first identity.
  await eventually(async()=>{await p.evaluate(()=>scrollTo(0,0));return await field(f.ids[0]).count()===1;},'backward hydration restores the evicted canonical Entry',30000);
  assert.equal(await field(f.ids[0]).textContent(),f.bodies[0]);await field(f.ids[0]).focus();assert.equal(await field(f.ids[0]).evaluate(node=>document.activeElement===node),true);assert.equal(await field(f.ids[1]).textContent(),f.largeBody,'explicit expansion survives eviction and hydration');
  assert.equal(h.extensionNetworkRequests,0);assert.equal(h.externalRequests,0);assert.equal(h.deepSeekRequests.length,0);assert.deepEqual(h.errors,[]);
  await writeFile(dir+'/result.json',JSON.stringify({head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),variant,count:165,window:120,compositionPinned:true,longExpansion:true,evictedAndReturned:true,status:'PASS'}));
 }catch(error){await writeFile(dir+'/failure.json',JSON.stringify({error:String(error),stack:error.stack}));await p.screenshot({path:dir+'/failure.png',fullPage:true}).catch(()=>{});throw error;}finally{await h.close();if(release)await rm(release,{recursive:true,force:true});}
});

for(const variant of ['source','release'])test('TOPIC-05.4 native late Section response cannot repaint purged synthetic Source '+variant,{timeout:120000},async()=>{
 const release=variant==='release'?await mkdtemp(join(tmpdir(),'paia-section-reading-')):null;
 if(release)execFileSync('python3',['scripts/build_current_release.py',release],{stdio:'pipe'});
 const h=await FakeChatGPT.start({extensionPath:release||resolve('.')}),p=h.archive;
 try{
  await p.locator('#enable-consent').click();if(await p.locator('#onboarding-skip').isVisible())await p.locator('#onboarding-skip').click();
  const f=await p.evaluate(async()=>{
   const {OrganizerStore}=await import('../core/organizer/store.js'),s=new OrganizerStore(chrome.storage.local),op=()=>crypto.randomUUID();await s.finishFoundation();
   await s.capture({epoch:(await s.status()).epoch,adapterVersion:'0.3.0',chat:{id:'synthetic-section-purge',url:'https://chatgpt.com/c/synthetic-section-purge',title:'SYNTHETIC purge'},messages:[{sourceMessageId:'synthetic-section-purge-001',pageOrder:1,originalText:'SYNTHETIC source for purge boundary'}]});
   const snapshot=await s.snapshot(),record=snapshot.records.find(row=>row.originalText==='SYNTHETIC source for purge boundary'),input=snapshot.library.blocks.find(row=>row.sourceRecordId===record?.id);if(!input)throw Error('synthetic source missing '+JSON.stringify(snapshot.records.map(row=>({keys:Object.keys(row),text:row.originalText})))) ;
   const {OrganizerRunner}=await import('../core/organizer/runner.js');
   // Equivalent to the repository's deterministic fixture provider: no model,
   // network or credential service. Production admission/commit owns lineage.
   const provider={describe:()=>({providerId:'synthetic-fixture',adapterVersion:'1',capabilityVersion:1,modelVersion:'deterministic-1',executionKind:'fixture',supportedTaskSchemas:['organize.v1'],credentialRequirement:'none'}),async execute(request){const input=request.inputs.find(x=>x.role!=='context_only'),body=input.fields.body;return {requestId:request.requestId,schemaVersion:1,providerVersion:'1',modelVersion:'deterministic-1',result:[{action:'create',body:'SYNTHETIC PURGE_OLD_PROSE',type:'idea',formation:'explicit',evidence:[{ref:input.ref,field:'body',start:0,end:body.length}],newTopic:'SYNTHETIC purge Section',newSection:'SYNTHETIC automatic chapter'}]};}};
   await s.enqueueOrganizer({operationId:op(),specs:[{inputId:input.id,role:'primary',selectedFields:['body']}]});const run=await new OrganizerRunner(s,{providers:[provider]}).step();if(run.error)throw Error(JSON.stringify(run));
   const topic=await s.repository.transaction(false,async t=>(await t.all('topics'))[0]),entry=await s.repository.transaction(false,async t=>(await t.all('thoughts'))[0]);
   return {topicId:topic.id,entryId:entry.id,sourceId:input.sourceRecordId};
  });
  await p.reload();await thoughtPrimary(p,'thoughts');await p.locator(`.personal-topic-block[data-topic-id="${f.topicId}"]`).waitFor();
  await p.evaluate(()=>{const send=chrome.runtime.sendMessage.bind(chrome.runtime);globalThis.__heldSection={send,held:false};chrome.runtime.sendMessage=async(message,...args)=>{const response=await send(message,...args);if(message.type==='GET_LIBRARY_SECTION_READING'&&!__heldSection.held){__heldSection.held=true;__heldSection.response=response;await new Promise(resolve=>__heldSection.release=resolve);}return response;};});
  await p.locator(`.personal-topic-block[data-topic-id="${f.topicId}"] .personal-topic-link`).click();await p.waitForFunction(()=>!!globalThis.__heldSection?.release);
  assert.equal(await p.evaluate(id=>__heldSection.response.data.items.some(item=>item.entry.id===id),f.entryId),true,'the actual delayed response contains the soon-purged Entry');
  await rpc(p,'PURGE_SOURCE',{id:f.sourceId,confirm:true});await p.evaluate(()=>__heldSection.release());
  const page=await rpc(p,'GET_LIBRARY_SECTION_READING',{options:{topicId:f.topicId,limit:40}});assert.equal(page.items?.some(item=>item.entry.id===f.entryId)||false,false,'fresh qualified read refuses purged provenance');
  await p.waitForFunction(()=>document.querySelector('.workspace')?.dataset.state==='ready'&&!document.querySelector('.workspace').inert);
  assert.equal(await p.locator(`#topic-body [data-entry-id="${f.entryId}"]`).count(),0,'a late pre-purge response cannot repaint the removed body');assert.equal(await p.locator('#topic-body').innerText().then(text=>text.includes('PURGE_OLD_PROSE')),false);
  assert.equal(h.extensionNetworkRequests,0);assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);
 }finally{await h.close();if(release)await rm(release,{recursive:true,force:true});}
});

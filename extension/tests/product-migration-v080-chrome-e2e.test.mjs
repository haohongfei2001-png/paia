import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,cp,rm,writeFile,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {FakeChatGPT,eventually} from './harness/fake-chatgpt.mjs';
import {productHistory,productReply} from './fixtures/product-history-v080.mjs';

const currentVersion=JSON.parse(await readFile('manifest.json','utf8')).version;
for(const baseline of [{ref:'22111fa',version:'0.11.0',report:'work/reading-v0111/migration-v0110.json'},{ref:'3a58fcd1',version:'0.10.1',report:'work/intelligence-v0110/migration-v0101.json'},{ref:'5223fa3',version:'0.10.0',report:'work/context-v0101/migration-v0100.json'},{ref:'d64e850',version:'0.9.2',report:'work/memory-v0100/migration-v092.json'},{ref:'102160d',version:'0.7.2.20',report:'work/v080-product-e2e/migration.json'},{ref:'b1708bd',version:'0.8.0',report:'work/v081-migration-e2e/migration.json'},{ref:'9b41ee5',version:'0.8.1',report:'work/history-v090/migration-v081.json'},{ref:'9584442',version:'0.9.0',report:'work/hardening-v092/migration-v090.json'},{ref:'990566b',version:'0.9.1',report:'work/hardening-v092/migration-v091.json'}])test(`frozen ${baseline.version} → ${currentVersion} same extension migration preserves user work and rejects partial AI cache`,{timeout:120000},async()=>{
 const parent=await mkdtemp(join(tmpdir(),'paia-v080-upgrade-')),old=join(parent,'old'),installed=join(parent,'installed'),next=join(parent,'next');let h;
 try{
  await mkdir(old);execFileSync('git',['archive',baseline.ref,'-o',join(parent,'old.tar')]);execFileSync('tar',['-xf',join(parent,'old.tar'),'-C',old]);
  const build="import sys;sys.path.insert(0,'scripts');from build_internal import build_internal;build_internal(sys.argv[1],sys.argv[2])";
  execFileSync('/usr/bin/python3',['-c',build,old,installed]);execFileSync('/usr/bin/python3',['-c',build,process.cwd(),next]);
  h=await FakeChatGPT.start({extensionPath:installed,headless:false,deepSeekFixture:productReply});let p=h.archive;
  const send=async(type,fields={})=>{const r=await p.evaluate(x=>chrome.runtime.sendMessage(x),{type,...fields});assert.equal(r.ok,true,JSON.stringify(r));return r.data;};
  await p.locator('#consent-check').check();await p.locator('#enable-consent').click();await h.open({id:'v080-upgrade',title:'虚构迁移验收',base:1785542400,messages:productHistory.slice(0,5)});await eventually(async()=>(await h.state()).records.length===5);
  await send('SAVE_DEEPSEEK_CREDENTIAL',{config:{apiKey:'synthetic-migration-only'}});const organized=await send('UPDATE_ORIGINAL_LIBRARY_VIEW',{userActionId:crypto.randomUUID()});assert.equal(organized.error,undefined,JSON.stringify(organized));assert.equal(organized.bootstrap.processed,5);
  const topic=(await send('LIBRARY_INDEX_PAGE',{options:{mode:'all'}})).items[0];await send('EDIT_LIBRARY_TOPIC',{edit:{id:topic.id,expectedRevision:topic.revision,changes:{name:'人工命名的产品主题'},operationId:crypto.randomUUID()}});
  const entry=(await send('TOPIC_DOCUMENT_PAGE',{options:{topicId:topic.id}})).items[0].entry;
  await send('EDIT_LIBRARY_FIELDS',{edit:{id:entry.id,expectedRevision:entry.revision,expectedFieldRevisions:entry.fieldRevisions,changes:{body:entry.body+' 人工保留的修正。'},operationId:crypto.randomUUID()}});
  // A wholly synthetic legacy partial row models an interrupted/unknown old AI state.
  await p.evaluate(async topicId=>{const {OrganizerStore}=await import('../core/organizer/store.js');const s=new OrganizerStore(chrome.storage.local);await s.foundationWrite(t=>t.put('meta',{id:'aiPresentation:'+topicId,topicId,revision:1,partial:true,currentView:'旧的不完整结果'}));await s.repository.close();},topic.id);
  const read=()=>p.evaluate(async()=>{const {OrganizerStore}=await import('../core/organizer/store.js');const s=new OrganizerStore(chrome.storage.local);await s.finishFoundation();await s.drainPurgeCleanup();await s.drainInvalidations();await s.drainLibraryMaintenance();const tables=['records','times','tombstones','blocks','documents','libraryDocuments','inputStates','inputRemovals','thoughts','topics','placements','provenance','revisions'];const result=await s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all(tables.map(async n=>[n,await t.all(n)]))));for(const topic of result.topics)delete topic.countCache;await s.repository.close();return result;});
  const source=(await h.state()).records.at(-1);await send('PURGE_SOURCE',{id:source.id,confirm:true});await eventually(async()=>(await h.state()).records.length===4);await send('RETRY_LIBRARY_MAINTENANCE');
  if(['0.10.0','0.10.1','0.11.0'].includes(baseline.version)){await send('PAIA_MEMORY_AUTHORIZE',{options:{topicIds:[topic.id],decision:'allowed'}});await send('PAIA_MEMORY_EXCLUDE',{options:{entryId:entry.id,excluded:true}});}
  if(['0.10.1','0.11.0'].includes(baseline.version))await send('PAIA_MEMORY_SETTINGS',{options:{externalAccess:false}});
  if(baseline.version==='0.11.0'){const legacy=await send('GET_LIBRARY_ENTRY',{id:entry.id});await send('EDIT_LIBRARY_FIELDS',{edit:{id:legacy.id,expectedRevision:legacy.revision,expectedFieldRevisions:legacy.fieldRevisions,changes:{title:'Unexpected synthetic legacy title preserved'},operationId:crypto.randomUUID()}});}
  const before=await read();assert.equal(before.tombstones.length,1);assert.ok(before.revisions.length>0);const identity=h.extensionId,calls=h.deepSeekRequests.length;
  const manager=await h.context.newPage();await manager.goto('chrome://extensions');await manager.locator('#devMode').click();await manager.close();await p.close();await cp(next,installed,{recursive:true});const popup=await h.context.newPage();await popup.goto(`chrome-extension://${identity}/ui/popup.html`);await popup.locator('#development-reload').click().catch(()=>{});
  p=await h.context.newPage();h.archive=p;p.on('pageerror',e=>h.errors.push(e.message));await eventually(async()=>{try{await p.goto(`chrome-extension://${identity}/ui/archive.html`);return await p.evaluate(()=>chrome.runtime.getManifest().version)===currentVersion;}catch{return false;}},'reload same synthetic extension into '+currentVersion);
  for(let i=0;i<2;i++){const memory=await send('PAIA_MEMORY_STATUS');assert.equal(memory.allowed,['0.10.0','0.10.1','0.11.0'].includes(baseline.version)?1:0);assert.equal(memory.config.externalAccess,!['0.10.1','0.11.0'].includes(baseline.version));if(['0.10.0','0.10.1','0.11.0'].includes(baseline.version))assert.equal(memory.excluded,1);assert.equal(memory.config.defaultPolicy,'denied');const status=await send('GET_AI_PRESENTATION_STATUS');assert.equal(status.topics[0].presentation,null);assert.equal(status.topics[0].stale,true);assert.equal(status.pendingTopics,1);assert.deepEqual(await read(),before);}
  assert.equal(await p.evaluate(()=>chrome.runtime.id),identity);assert.equal(h.deepSeekRequests.length,calls);assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);
  await mkdir(baseline.report.slice(0,baseline.report.lastIndexOf('/')),{recursive:true});await writeFile(baseline.report,JSON.stringify({from:baseline.ref+' / '+baseline.version,to:currentVersion,syntheticOnly:true,sameExtensionId:true,idempotent:true,sourceInputEntryTopicRevisionEquality:true,invalidCacheStale:true,upgradeRequests:0,externalRequests:0},null,2));
 }finally{await h?.close();await rm(parent,{recursive:true,force:true});}
});

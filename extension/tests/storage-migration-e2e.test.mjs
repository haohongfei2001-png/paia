import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,cp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {FakeChatGPT,conversation,eventually,pause} from './harness/fake-chatgpt.mjs';

test('frozen 7af4c0e extension → real IndexedDB migration → frozen downgrade cannot recapture or overwrite', {timeout:100000},async()=>{
 const parent=await mkdtemp(join(tmpdir(),'paia-migration-'));let h;
 try{
  const oldSource=join(parent,'frozen'),oldBuild=join(parent,'old'),newBuild=join(parent,'new'),installed=join(parent,'installed');await mkdir(oldSource);
  const archive=spawnSync('git',['archive','7af4c0e'],{maxBuffer:20*1024*1024});assert.equal(archive.status,0);assert.equal(spawnSync('tar',['-x','-C',oldSource],{input:archive.stdout}).status,0);
  const build=(source,target)=>{const p=spawnSync('python3',['-c','from pathlib import Path;from scripts.build_internal import build_internal;import sys;build_internal(Path(sys.argv[1]),Path(sys.argv[2]))',source,target],{encoding:'utf8'});assert.equal(p.status,0,p.stderr);};
  build(oldSource,oldBuild);build(process.cwd(),newBuild);await cp(oldBuild,installed,{recursive:true});
  assert.equal(await readFile(join(installed,'core/store.js'),'utf8'),spawnSync('git',['show','7af4c0e:core/store.js'],{encoding:'utf8'}).stdout);
  h=await FakeChatGPT.start({extensionPath:installed});const manager=await h.context.newPage();await manager.goto('chrome://extensions');await manager.locator('#devMode').click();await manager.close();
  await h.archive.locator('#consent-check').check();await h.archive.locator('#enable-consent').click();const c=conversation('synthetic-migration-real');const chat=await h.open(c);await eventually(async()=>(await h.state()).records.length===3);
  const seed=await h.state();await h.archive.evaluate(async s=>{
   await chrome.runtime.sendMessage({type:'UPDATE_LIBRARY',id:s.library.blocks[0].id,changes:{libraryText:'Synthetic migration authored text',note:'Synthetic retained note'}});
   await chrome.runtime.sendMessage({type:'UPDATE_DOCUMENT',id:s.conversations[0].id,changes:{userTitle:'Synthetic preserved title'}});
   await chrome.runtime.sendMessage({type:'EXCLUDE_LIBRARY',id:s.library.blocks[0].id,excluded:true});
   await chrome.runtime.sendMessage({type:'TRASH_RECORD',id:s.records[1].id});await chrome.runtime.sendMessage({type:'PURGE_RECORD',id:s.records[1].id});
   await chrome.runtime.sendMessage({type:'SET_ENABLED',enabled:false});
  },seed);await chat.close();const before=await h.archive.evaluate(async()=>(await chrome.storage.local.get('personalAIArchive')).personalAIArchive);
  const reload=async build=>{await cp(build,installed,{recursive:true});const popup=await h.context.newPage();await popup.goto(`chrome-extension://${h.extensionId}/ui/popup.html`);await popup.locator('#development-reload').click().catch(e=>{if(!popup.isClosed())throw e;});await pause(500);h.archive=await h.context.newPage();await h.archive.goto(`chrome-extension://${h.extensionId}/ui/archive.html`);};
  await reload(newBuild);const after=await h.state();for(const field of ['records','library','conversations','settings','preferences'])assert.deepEqual(after[field],before[field],field);
  const evidence=await h.archive.evaluate(()=>chrome.runtime.sendMessage({type:'GET_MIGRATION_STATUS'}));assert.equal(evidence.data.verified,true);assert.equal(evidence.data.recoveryVerified,true);
  const databaseState=()=>h.archive.evaluate(async()=>{const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('paia-archive');r.onsuccess=()=>resolve(r.result);r.onerror=reject;});try{const t=db.transaction(['records','times','tombstones','migrationBackup']);const get=name=>new Promise(resolve=>{const r=t.objectStore(name).getAll();r.onsuccess=()=>resolve(r.result);});return {records:await get('records'),times:await get('times'),tombstones:await get('tombstones'),backup:await get('migrationBackup')};}finally{db.close();}});
  const dbBefore=await databaseState();assert.equal(dbBefore.backup.length,0);assert.deepEqual(dbBefore.tombstones.map(t=>t.value),before.tombstones);assert.deepEqual(Object.fromEntries(dbBefore.times.map(t=>[t.id,t.value])),before.sourceTimes);
  const sealed=await h.archive.evaluate(()=>chrome.storage.local.get(null));assert.equal(sealed.personalAIArchive.records,undefined);
  await reload(oldBuild);assert.equal(await h.archive.evaluate(()=>chrome.runtime.getManifest().version),'0.4.1');
  for(const message of [{type:'GET_STATE'},{type:'CONSENT',accepted:true},{type:'SET_ENABLED',enabled:true}])assert.deepEqual(await h.archive.evaluate(m=>chrome.runtime.sendMessage(m),message),{ok:false,error:'STORAGE_FAILED'});
  await h.open(c);await pause(1700);assert.deepEqual(await databaseState(),dbBefore);assert.deepEqual(await h.archive.evaluate(()=>chrome.storage.local.get(null)),sealed);
  await reload(newBuild);assert.deepEqual((await h.state()).records,before.records);assert.equal(h.extensionNetworkRequests,0);
 }finally{await h?.close();await rm(parent,{recursive:true,force:true});}
});

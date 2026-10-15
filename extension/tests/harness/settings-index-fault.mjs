import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {mkdtemp,mkdir,rm,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {FakeChatGPT,eventually} from './fake-chatgpt.mjs';
import {chooseConsumerGroup} from './settings-consumer-presentation.mjs';

const root=fileURLToPath(new URL('../..',import.meta.url));
const rpc=async(page,type,fields={})=>{const response=await page.evaluate(message=>chrome.runtime.sendMessage(message),{type,...fields});assert.equal(response.ok,true,JSON.stringify(response));return response.data;};
const searchOptions={query:'syntheticindexneedle',limit:40};
const search=page=>page.evaluate(async options=>{const {request}=await import('./common.js');try{return {ok:true,data:await request('SEARCH_LIBRARY',{options})};}catch(error){return {ok:false,error:error.code};}},searchOptions);
const state=page=>page.evaluate(async()=>{
 const request=indexedDB.open('paia-archive'),db=await new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
 try{const names=[...db.objectStoreNames],transaction=db.transaction(names);return {stores:Object.fromEntries(await Promise.all(names.map(async name=>[name,await new Promise((resolve,reject)=>{const request=transaction.objectStore(name).getAll();request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);})]))),local:await chrome.storage.local.get(null),permissions:await chrome.permissions.getAll()};}finally{db.close();}
});
function canonical(snapshot){
 const copy=structuredClone(snapshot);
 delete copy.stores.librarySearchTerms;
 copy.stores.libraryMigrationItems=copy.stores.libraryMigrationItems.filter(row=>row.entityKind!=='search');
 copy.stores.meta=copy.stores.meta.filter(row=>row.id!=='library-search-rebuild');
 for(const name of ['thoughts','topics','sections'])for(const row of copy.stores[name]){delete row.searchVersion;delete row.indexedSearchVersion;}
 return copy;
}
const frame=page=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
async function reachable(locator){
 await locator.scrollIntoViewIfNeeded();
 return locator.evaluate(node=>{const rect=node.getBoundingClientRect(),x=rect.x+rect.width/2,y=rect.y+rect.height/2,hit=document.elementFromPoint(x,y);return {visible:!!rect.width&&!!rect.height,hiddenAncestor:!!node.closest('[hidden],[inert]'),hit:hit===node||node.contains(hit),disabled:node.disabled};});
}
const approved08={path:'docs/consumer-product-v1/design/approved-visuals-2026-10-07/PAIA-Settings-Design-v2/Prototype.html',sha256:'64f574ad29df5abdc619dc1227e2f9592e2d97c283e9fb2b8864060ee11eecb9',scope:'original warning CSS and modal primary control; not all26 scenes or PNG identity'};
const near=(actual,expected,label)=>assert.ok(Math.abs(Number.parseFloat(actual)-expected)<.01,label+' '+actual+' expected '+expected);
async function warningMetrics(page){
 return page.evaluate(()=>{
  const node=document.getElementById('settings-search-warning'),heading=node.querySelector('h3'),description=node.querySelector('p'),button=document.getElementById('settings-search-repair'),group=document.getElementById('ux-settings-data-group');
  const style=node=>{const s=getComputedStyle(node);return Object.fromEntries(['paddingTop','paddingRight','paddingBottom','paddingLeft','marginBottom','marginTop','borderLeftWidth','borderLeftColor','borderLeftStyle','borderRadius','backgroundColor','color','fontSize','fontWeight','lineHeight','minHeight'].map(key=>[key,s[key]]));};
  const rect=node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
  return {warning:style(node),heading:style(heading),description:style(description),button:style(button),rect:{warning:rect(node),heading:rect(heading),description:rect(description),button:rect(button),groupHeading:rect(group.querySelector('h2'))}};
 });
}
function checkWarning(metrics){
 const {warning,heading,description,button,rect}=metrics;
 for(const [key,value]of Object.entries({paddingTop:16,paddingRight:20,paddingBottom:16,paddingLeft:20,marginBottom:16,borderLeftWidth:2,borderRadius:0}))near(warning[key],value,'approved08 warning '+key);
 assert.equal(warning.backgroundColor,'rgb(250, 245, 233)');assert.equal(warning.color,'rgb(120, 90, 32)');assert.equal(warning.borderLeftColor,warning.color);assert.equal(warning.borderLeftStyle,'solid');
 near(heading.fontSize,14,'approved08 heading size');assert.equal(heading.fontWeight,'500');near(heading.lineHeight,23.8,'approved08 heading line');near(heading.marginBottom,4,'approved08 heading spacing');assert.equal(heading.color,warning.color);
 near(description.fontSize,12,'approved08 description size');near(description.lineHeight,21.6,'approved08 description line');assert.equal(description.color,warning.color);
 near(button.fontSize,13,'approved08 repair action size');near(button.minHeight,44,'approved08 repair target');near(button.marginTop,8,'approved08 repair spacing');near(button.paddingTop,6,'approved08 repair top inset');near(button.paddingBottom,6,'approved08 repair bottom inset');
 near(rect.warning.x,rect.groupHeading.x,'warning remains above ordinary Data rows');near(rect.heading.x,rect.warning.x+22,'warning text left inset');near(rect.heading.y,rect.warning.y+16,'warning text top inset');assert.ok(rect.button.width>0&&rect.button.height>=44);assert.ok(rect.warning.width>0&&rect.warning.right<=rect.groupHeading.right+.01);
}
async function primaryMetrics(button){return button.evaluate(node=>{const s=getComputedStyle(node),r=node.getBoundingClientRect();return {backgroundColor:s.backgroundColor,color:s.color,borderColor:s.borderColor,borderRadius:s.borderRadius,borderWidth:s.borderWidth,fontSize:s.fontSize,lineHeight:s.lineHeight,paddingTop:s.paddingTop,paddingRight:s.paddingRight,paddingBottom:s.paddingBottom,paddingLeft:s.paddingLeft,width:r.width,height:r.height};});}
function checkPrimary(metrics){assert.equal(metrics.backgroundColor,'rgb(34, 40, 50)');assert.equal(metrics.borderColor,metrics.backgroundColor);assert.equal(metrics.color,'rgb(255, 255, 255)');near(metrics.borderWidth,1,'original modal primary border');near(metrics.borderRadius,6,'original modal primary radius');near(metrics.fontSize,13,'original modal primary size');near(metrics.lineHeight,22.1,'original modal primary line');for(const [key,value]of Object.entries({paddingTop:8,paddingBottom:8,paddingLeft:16,paddingRight:16}))near(metrics[key],value,'original modal primary '+key);assert.ok(metrics.width>0&&metrics.height>=44);}
async function installFaults(worker){
 await worker.evaluate(()=>{
  const cursor=IDBIndex.prototype.openCursor,put=IDBObjectStore.prototype.put;
  const fixture=globalThis.__settingsIndexFault={failRead:true,failRepair:false,readAborts:0,repairAborts:0,repairPuts:0,readNative:[],writeNative:[],restore:()=>{IDBIndex.prototype.openCursor=cursor;IDBObjectStore.prototype.put=put;}};
  IDBIndex.prototype.openCursor=function(...args){
   const request=cursor.apply(this,args);
   if(fixture.failRead&&this.name==='byToken'&&this.objectStore.name==='librarySearchTerms'){
    fixture.readAborts++;const transaction=this.objectStore.transaction;
    request.addEventListener('error',event=>fixture.readNative.push({trusted:event.isTrusted,error:request.error?.name}));
    transaction.addEventListener('abort',event=>fixture.readNative.push({trusted:event.isTrusted,outcome:'abort'}),{once:true});transaction.abort();
   }
   return request;
  };
  IDBObjectStore.prototype.put=function(row,...args){
   const request=put.call(this,row,...args);
   if(this.name==='meta'&&row?.id==='library-search-rebuild'){
    fixture.repairPuts++;
    if(fixture.failRepair){fixture.repairAborts++;const transaction=this.transaction;transaction.addEventListener('abort',event=>fixture.writeNative.push({trusted:event.isTrusted,outcome:'abort'}),{once:true});transaction.abort();}
   }
   return request;
  };
 });
}
async function installTransportObservation(page){
 await page.evaluate(()=>{
  const send=chrome.runtime.sendMessage.bind(chrome.runtime);
  const fixture=globalThis.__settingsIndexRequests={send,rebuild:[],hold:false,held:false,release:null,clicks:[],button:document.getElementById('library-rebuild-search'),status:document.getElementById('library-maintenance-status')};
  fixture.button.addEventListener('click',event=>fixture.clicks.push({trusted:event.isTrusted,id:event.currentTarget.id}));
  chrome.runtime.sendMessage=async(message,...args)=>{
   if(message.type!=='REBUILD_LIBRARY_SEARCH')return send(message,...args);
   const call={type:message.type};fixture.rebuild.push(call);const response=await send(message,...args);call.ok=response?.ok===true;call.error=response?.error;
   if(fixture.hold){fixture.held=true;await new Promise(resolve=>fixture.release=resolve);fixture.held=false;fixture.release=null;}
   return response;
  };
 });
}
const repairCalls=page=>page.evaluate(()=>__settingsIndexRequests.rebuild.length);

// A caller imports this function from the existing complete owning browser file.
// Faults abort actual original IDB transactions; no fabricated worker response,
// recovery-state setter, test button, replacement store or successful owner exists.
export async function settingsIndexFaultEvidence(variant){
 assert.ok(['source','release'].includes(variant));
 const release=variant==='release'?await mkdtemp(join(tmpdir(),'paia-settings-index-fault-')):null;
 const out=join(root,'work/settings-index-fault',variant);await mkdir(out,{recursive:true});
 let harness,worker,before,completed=false;
 const bound=['tests/harness/settings-index-fault.mjs','tests/settings-data-destinations-chrome-e2e.test.mjs','ui/settings-details.js','ui/maintenance-recovery.js','ui/topic-workspace.js','ui/common.js','ui/archive.html','background/service-worker.js','core/library-search.js','core/library-documents-owner.js','core/idb-repository.js','ui/settings-preferences.css','ui/desktop-tokens.css','ui/ui-refresh.css','ui/archive.css','ui/app-shell.css'];
 const hashes={};for(const path of bound){const bytes=await readFile(join(root,path));hashes[path]=createHash('sha256').update(bytes).digest('hex');}
 await writeFile(join(out,'prelaunch.json'),JSON.stringify({variant,head:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),hashes},null,2));
 try{
  if(release)execFileSync('python3',['scripts/build_current_release.py',release],{cwd:root,stdio:'pipe'});
  harness=await FakeChatGPT.start({extensionPath:release||root,headless:true,launchThroughPort:true});const page=harness.archive;
  await page.locator('#enable-consent').click();await eventually(async()=>(await rpc(page,'GET_STATUS')).consented===true);if(await page.locator('#onboarding-skip').isVisible())await page.locator('#onboarding-skip').click();
  await page.setViewportSize({width:1440,height:900});await rpc(page,'UPDATE_PREFERENCES',{changes:{language:'zh-CN',appearance:'light'}});await eventually(()=>page.locator('html').getAttribute('lang').then(language=>language==='zh-CN'));await eventually(()=>page.locator('html').getAttribute('data-paia-theme').then(theme=>theme==='light'));
  await harness.open({id:'settings-index-fault-source',title:'SYNTHETIC preserved Source',base:1609459200,messages:[{id:'settings-index-fault-input',text:'SYNTHETIC immutable Source and independent Working Input'}]});await eventually(async()=>(await rpc(page,'GET_STATE')).records.length===1);
  for(const host of harness.context.pages())if(host.url().startsWith('https://chatgpt.com/'))await host.close();await eventually(async()=>{const filter=await rpc(page,'FILTER_STATUS');return filter.pending===0&&filter.taskState==='idle';});
  const entry=await rpc(page,'CREATE_LIBRARY_ENTRY',{entry:{title:'SYNTHETIC independent Thought',body:'syntheticindexneedle original independent human body',note:'SYNTHETIC original note',type:'idea',operationId:randomUUID()}});
  const context=await rpc(page,'PAIA_CONTEXT_CARDS_SNAPSHOT');await rpc(page,'PAIA_CONTEXT_CARDS_CHANGE',{change:{kind:'put',itemId:randomUUID(),card:'info',section:'Synthetic',body:'SYNTHETIC manual Context preserved by search repair',epoch:context.epoch,expectedRevision:0,operationId:randomUUID()}});
  await eventually(async()=>{const result=await search(page);return result.ok&&result.data.complete===true&&result.data.items.some(item=>item.entryId===entry.id);},'original search completes before fault baseline');
  await page.locator('.sidebar-bottom [data-view="settings"]').click();await chooseConsumerGroup(page,'data');await frame(page);
  const originalButton=page.locator('#library-rebuild-search'),status=page.locator('#library-maintenance-status'),outer=page.getByRole('button',{name:'修复搜索',exact:true});
  assert.equal(await originalButton.isVisible(),false,'healthy recovery control is really invisible, including ancestors');assert.equal(await status.isVisible(),false,'healthy Settings has no permanent maintenance status');assert.equal(await outer.count(),0,'healthy Settings offers no repair action');
  const invalid=await page.evaluate(async()=>{const {request}=await import('./common.js');try{await request('SEARCH_LIBRARY',{options:{query:[],limit:40}});return null;}catch(error){return error.code;}});assert.equal(invalid,'INVALID_REQUEST');assert.equal(await outer.count(),0,'original invalid request is not a confirmed storage fault');
  await installTransportObservation(page);before=await state(page);assert.equal(Object.keys(before.stores).length,37);
  worker=harness.context.serviceWorkers().find(item=>item.url().endsWith('/background/service-worker.js'));assert.ok(worker);await installFaults(worker);
  const refused=await search(page);assert.deepEqual(refused,{ok:false,error:'STORAGE_FAILED'});
  await worker.evaluate(()=>__settingsIndexFault.failRead=false);
  const nativeRead=await worker.evaluate(()=>({count:__settingsIndexFault.readAborts,events:__settingsIndexFault.readNative}));assert.ok(nativeRead.count>0);assert.ok(nativeRead.events.some(event=>event.outcome==='abort'&&event.trusted===true));assert.ok(nativeRead.events.some(event=>event.error==='AbortError'&&event.trusted===true));
  assert.deepEqual(await state(page),before,'confirmed search read failure does not modify any original row, control or permission');assert.equal(await repairCalls(page),0,'actual fault discovery cannot repair automatically');
  await outer.waitFor({state:'visible'});await frame(page);assert.deepEqual(await reachable(outer),{visible:true,hiddenAncestor:false,hit:true,disabled:false},'confirmed fault warning has an accessible repair destination');
  await page.mouse.move(1,1);await frame(page);const warning=await warningMetrics(page);await writeFile(join(out,'fault-warning-metrics.json'),JSON.stringify({approvedReference:approved08,variant,viewport:page.viewportSize(),metrics:warning},null,2));await page.screenshot({path:join(out,'08-confirmed-fault.png'),fullPage:true});checkWarning(warning);
  await outer.click();const dialog=page.getByRole('dialog').filter({has:originalButton});await dialog.waitFor({state:'visible'});assert.match(await dialog.innerText(),/根据现有正文重新建立搜索索引，不修改输入、主题或版本历史/);assert.equal(await originalButton.innerText(),'开始修复');assert.equal(await repairCalls(page),0,'opening confirmation has no repair RPC');
  await page.mouse.move(1,1);await frame(page);const primary=await primaryMetrics(originalButton);await writeFile(join(out,'fault-confirmation-metrics.json'),JSON.stringify({approvedReference:approved08,variant,viewport:page.viewportSize(),metrics:primary},null,2));await page.screenshot({path:join(out,'08-repair-confirmation.png'),fullPage:true});checkPrimary(primary);
  await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});assert.equal(await repairCalls(page),0,'cancelling confirmation has no repair RPC');assert.equal(await outer.isVisible(),true);assert.deepEqual(await state(page),before);
  await outer.click();await dialog.waitFor({state:'visible'});await worker.evaluate(()=>__settingsIndexFault.failRepair=true);await page.evaluate(()=>{__settingsIndexRequests.hold=true;});
  await originalButton.click();await eventually(()=>page.evaluate(()=>__settingsIndexRequests.held),'real refused repair response is held after worker transaction abort');
  assert.equal(await repairCalls(page),1);assert.equal(await originalButton.isDisabled(),true,'same original final control is disabled during genuine in-flight request');assert.equal(await status.isVisible(),true);assert.ok((await status.innerText()).trim(),'in-flight status is visible');
  await page.evaluate(()=>{__settingsIndexRequests.hold=false;__settingsIndexRequests.release();});await eventually(async()=>!await originalButton.isDisabled());
  const first=await page.evaluate(()=>__settingsIndexRequests.rebuild[0]);assert.deepEqual(first,{type:'REBUILD_LIBRARY_SEARCH',ok:false,error:'STORAGE_FAILED'});assert.equal(await dialog.isVisible(),true);assert.equal(await status.isVisible(),true);assert.ok((await status.innerText()).trim());assert.equal(await originalButton.isVisible(),true,'real refusal retains the same accessible retry control');
  assert.deepEqual(await state(page),before,'native aborted repair preserves all37 original stores and permissions');
  const identity=await page.evaluate(()=>__settingsIndexRequests.button===document.getElementById('library-rebuild-search')&&__settingsIndexRequests.status===document.getElementById('library-maintenance-status'));assert.equal(identity,true,'original control and status are never replaced');
  await worker.evaluate(()=>__settingsIndexFault.failRepair=false);await originalButton.click();await eventually(()=>page.evaluate(()=>__settingsIndexRequests.rebuild.length===2&&__settingsIndexRequests.rebuild[1].ok===true));
  await eventually(async()=>!await originalButton.isDisabled());assert.match(await status.innerText(),/已请求|等待|队列|正在/);assert.doesNotMatch(await status.innerText(),/已修复|修复完成|已恢复/,'queued original acknowledgement is not completed repair');
  let healthy;await eventually(async()=>{healthy=await search(page);return healthy.ok&&healthy.data.complete===true&&healthy.data.items.some(item=>item.entryId===entry.id);},'actual original rebuilt postings and search complete');
  assert.equal(await outer.count(),0,'a complete healthy original search hides the fault warning');if(await dialog.isVisible())await page.keyboard.press('Escape');assert.equal(await originalButton.isVisible(),false);assert.equal(await status.isVisible(),false);
  assert.deepEqual(canonical(await state(page)),canonical(before),'rebuild only changes original derived search fields; Source, Working, body, note, provenance, history, Context and permissions stay exact');
  const calls=await page.evaluate(()=>({rebuild:__settingsIndexRequests.rebuild,clicks:__settingsIndexRequests.clicks}));assert.equal(calls.rebuild.length,2);assert.deepEqual(calls.clicks,[{trusted:true,id:'library-rebuild-search'},{trusted:true,id:'library-rebuild-search'}]);
  const nativeWrite=await worker.evaluate(()=>({refusals:__settingsIndexFault.repairAborts,events:__settingsIndexFault.writeNative}));assert.equal(nativeWrite.refusals,1);assert.deepEqual(nativeWrite.events,[{trusted:true,outcome:'abort'}]);
  assert.equal(harness.externalRequests,0);assert.equal(harness.extensionNetworkRequests,0);assert.equal(harness.deepSeekRequests.length,0);assert.deepEqual(harness.errors,[]);
  await page.screenshot({path:join(out,'healthy-after-repair.png'),fullPage:true});completed=true;
  await writeFile(join(out,'result.json'),JSON.stringify({variant,result:'PASS',confirmedNativeReadAbort:true,confirmedNativeWriteAbort:true,allStores:37,originalControls:true,repairRequests:2,healthySearchComplete:true,zeroHTTP:true,realServiceVerified:false},null,2));
 }finally{
  if(harness&&!completed){const page=harness.archive;await writeFile(join(out,'failure-ui.json'),JSON.stringify(await page.evaluate(()=>({rebuild:globalThis.__settingsIndexRequests?.rebuild,button:(()=>{const node=document.getElementById('library-rebuild-search');return node?{hidden:node.hidden,hiddenAncestor:!!node.closest('[hidden],[inert]'),disabled:node.disabled,connected:node.isConnected}:null;})(),status:(()=>{const node=document.getElementById('library-maintenance-status');return node?{hidden:node.hidden,hiddenAncestor:!!node.closest('[hidden],[inert]'),connected:node.isConnected}:null;})()})).catch(()=>null),null,2));await page.screenshot({path:join(out,'failure.png'),fullPage:true}).catch(()=>{});}
  await worker?.evaluate(()=>__settingsIndexFault?.restore()).catch(()=>{});
  await harness?.archive.evaluate(()=>{if(globalThis.__settingsIndexRequests){__settingsIndexRequests.release?.();chrome.runtime.sendMessage=__settingsIndexRequests.send;}}).catch(()=>{});
  const after={};for(const path of bound){after[path]=createHash('sha256').update(await readFile(join(root,path))).digest('hex');}await writeFile(join(out,'execution-binding.json'),JSON.stringify({variant,completed,prelaunch:hashes,postexecution:after},null,2));assert.deepEqual(after,hashes,'all actual consuming code remains unchanged through browser execution');
  await harness?.close();if(release)await rm(release,{recursive:true,force:true});
 }
}

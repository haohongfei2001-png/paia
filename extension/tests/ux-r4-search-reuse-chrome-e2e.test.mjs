import {previewReviewedContext,confirmCompiledContext} from './harness/context-browser-review.mjs';
import {seedUXLarge} from './harness/ux-large.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {FakeChatGPT} from './harness/fake-chatgpt.mjs';
const dir=new URL('../work/ux-r4/',import.meta.url);
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,label='condition',attempts=120){for(let i=0;i<attempts;i++){if(await fn())return;await pause(100);}throw Error('Timed out: '+label);}
const rpc=(p,type,fields={})=>p.evaluate(async x=>{const r=await chrome.runtime.sendMessage(x);if(!r?.ok)throw Error(JSON.stringify(r));return r.data;},{type,...fields});
const tray=p=>p.evaluate(async()=>{const {getContextController}=await import(chrome.runtime.getURL('ui/context-workspace.js'));return getContextController().data;});
async function observeSupplementAdmission(p){
 await p.evaluate(async()=>{
  const {getContextController}=await import(chrome.runtime.getURL('ui/context-workspace.js')),current=getContextController(),original=current.rpc.bind(current);
  globalThis.__vs06Admission=[];
  current.rpc=async(action,options={})=>{
   const item={action,requestedGeneration:current.data?.generation,policyRevision:current.data?.manifest?.policyRevision,temporaryPolicyRevision:current.data?.manifest?.temporaryPolicyRevision,done:false};
   globalThis.__vs06Admission.push(item);
   try{const result=await original(action,options);Object.assign(item,{ok:true,returnedGeneration:result.generation,itemCount:result.items.length,supplementCount:result.manifest.retrievalSupplements.length});return result;}
   catch(error){Object.assign(item,{ok:false,code:error.code||'UNCLASSIFIED'});throw error;}
   finally{item.done=true;}
  };
 });
}
async function requireSupplementAdmission(p){
 await until(()=>p.evaluate(()=>globalThis.__vs06Admission?.some(r=>r.action==='addSupplement'&&r.done)),'actual supplement RPC completed');
 const evidence=await p.evaluate(()=>globalThis.__vs06Admission.map(r=>({...r})));
 const result=evidence.findLast(r=>r.action==='addSupplement');
 assert.equal(result.ok,true,'supplement RPC refused: '+JSON.stringify(evidence));
}
async function waitForStableDataGeneration(p,label='portable data generation settles'){
 let previous=null,stable=0;
 await until(async()=>{
  const current=await p.evaluate(async()=>{
   const {OrganizerStore}=await import('../core/organizer/store.js');
   const s=new OrganizerStore(chrome.storage.local);
   return s.run(()=>s.repository.transaction(false,async t=>(await t.get('meta','backup-data-generation'))?.value||0,['meta']));
  });
  if(current===previous)stable++;else{previous=current;stable=0;}
  return stable>=4;
 },label,80);
}
async function start(messages){const h=await FakeChatGPT.start(),p=h.archive;try{await p.locator('#consent-check').check();await p.locator('#enable-consent').click();await until(async()=>(await rpc(p,'GET_STATUS')).consented);const chat=await h.open({id:'uxr4-synthetic',title:'UX-R4 synthetic',base:1609459200,messages:messages.map((text,i)=>({id:'uxr4-input-'+i,text}))});await until(async()=>(await h.state()).records.length===messages.length,'fixture capture');return {h,p,chat};}catch(e){await h.close();throw e;}}
async function search(p,q){await p.evaluate(()=>{if(globalThis.__uxr4Search)return;globalThis.__uxr4Search=[];const send=chrome.runtime.sendMessage.bind(chrome.runtime);chrome.runtime.sendMessage=async(...args)=>{const result=await send(...args);if(args[0]?.type==='SEARCH_INPUTS')globalThis.__uxr4Search.push({options:args[0].options,ok:result.ok,error:result.error,count:result.data?.items?.length,cursor:result.data?.nextCursor});return result;};});assert.equal(await p.locator('#universal-search-open').isVisible(),false);assert.equal(await p.locator('#archive-select-materials').count(),0);await p.locator('#primary-nav [data-view="memory"]').click();await until(()=>p.locator('#material-workbench').isVisible(),'For AI material tray');await p.getByRole('button',{name:'从档案选择',exact:true}).click();await p.getByRole('searchbox',{name:'全局搜索'}).fill(q);await until(async()=>(await p.locator('#universal-search-dialog').getAttribute('data-query'))===q&&await p.locator('.universal-hit').count()>0,'completed query');}
const clean=h=>{assert.equal(h.deepSeekRequests.length,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);};
test('UX-R4 real Search pages retain 3 fixed refs through Reader return, query change and 20 new Inputs',{timeout:180000},async()=>{const {h,p,chat}=await start(Array.from({length:45},(_,i)=>'UXR4_SEARCH 合成材料 '+i));try{await search(p,'UXR4_SEARCH');const worker=h.context.serviceWorkers().find(w=>w.url().includes('/background/service-worker.js'));assert.ok(worker);await p.evaluate(()=>{globalThis.__uxr4StableHit=document.querySelector('.universal-hit');});await worker.evaluate(()=>{void chrome.runtime.sendMessage({type:'ARCHIVE_CHANGED',cause:'RECORD_TOPIC_READ'}).catch(()=>{});});await pause(250);assert.equal(await p.evaluate(()=>globalThis.__uxr4StableHit===document.querySelector('.universal-hit')),true,'maintenance notification must not remount Universal Search results');
// A delayed older response must not replace the newer query; composition must not issue requests.
await p.evaluate(()=>{const send=chrome.runtime.sendMessage.bind(chrome.runtime);chrome.runtime.sendMessage=async(...a)=>{const r=await send(...a);if(a[0]?.type==='SEARCH_INPUTS'&&a[0].options.query==='材料 1')await new Promise(r=>setTimeout(r,700));return r;};});
const box=p.getByRole('searchbox',{name:'全局搜索'});await box.fill('材料 1');await pause(300);await box.fill('材料 2');await until(async()=>(await p.locator('#universal-search-dialog').getAttribute('data-query'))==='材料 2');await pause(800);assert.equal(await p.locator('#universal-search-dialog').getAttribute('data-query'),'材料 2');
const calls=await p.evaluate(()=>globalThis.__uxr4Search.length);await box.evaluate(el=>{el.dispatchEvent(new CompositionEvent('compositionstart'));el.value='UXR4_SEARCH';el.dispatchEvent(new InputEvent('input',{isComposing:true,bubbles:true}));});await pause(300);assert.equal(await p.evaluate(()=>globalThis.__uxr4Search.length),calls);await box.evaluate(el=>el.dispatchEvent(new CompositionEvent('compositionend')));await until(async()=>(await p.locator('#universal-search-dialog').getAttribute('data-query'))==='UXR4_SEARCH');
await rpc(p,'UPDATE_PREFERENCES',{changes:{language:'en'}});await until(()=>p.getByRole('searchbox',{name:'Global search'}).isVisible());assert.ok((await p.locator('.universal-hit').first().textContent()).includes('合成材料'));assert.ok((await p.locator('.universal-status').textContent()).includes('Currently loaded'));await p.screenshot({path:new URL('search-english.png',dir).pathname});await rpc(p,'UPDATE_PREFERENCES',{changes:{language:'zh-CN'}});await until(()=>p.getByRole('searchbox',{name:'全局搜索'}).isVisible());
await until(async()=>await p.locator('.universal-hit').count()===40);await p.locator('.universal-hit input[type=checkbox]').nth(0).check();await p.locator('.universal-hit input[type=checkbox]').nth(1).check();await p.locator('.universal-pagination').getByRole('button',{name:'下一页',exact:true}).click();try{await until(async()=>await p.locator('.universal-hit').count()===5,'second search page');}catch(e){await writeFile(new URL('search-debug.json',dir),JSON.stringify({status:await p.locator('.universal-status').textContent(),count:await p.locator('.universal-hit').count(),errors:h.errors,requests:await p.evaluate(()=>globalThis.__uxr4Search)}));throw e;}await p.locator('.universal-hit input[type=checkbox]').first().check();await p.locator('.universal-open').first().click();await until(()=>p.locator('#document-panel').isVisible());await p.locator('#back').click();await until(()=>p.locator('#universal-search-dialog').isVisible());assert.equal(await p.getByRole('searchbox',{name:'全局搜索'}).inputValue(),'UXR4_SEARCH');assert.equal(await p.locator('.universal-hit').count(),5);await p.locator('.universal-selection').getByRole('button',{name:'加入本次材料 (3)',exact:true}).click();await until(async()=>(await tray(p))?.items.length===3);await p.evaluate(()=>{globalThis.__uxr4StablePreview=document.querySelector('#material-preview');});await worker.evaluate(()=>{void chrome.runtime.sendMessage({type:'ARCHIVE_CHANGED',cause:'RECORD_TOPIC_READ'}).catch(()=>{});});await pause(250);assert.equal(await p.evaluate(()=>globalThis.__uxr4StablePreview===document.querySelector('#material-preview')),true,'maintenance notification must not remount the Material Tray');await p.evaluate(()=>{globalThis.__uxr4StableClose=[...document.querySelectorAll('#material-workbench button')].find(b=>b.textContent==='从档案选择');});const scanBefore=(await rpc(p,'GET_PAGE',{page:{view:'settings'}})).diagnostics.lastScanAt;await h.edit(chat,'uxr4-input-0','UXR4_SEARCH 合成材料 0',false);await until(async()=>String((await rpc(p,'GET_PAGE',{page:{view:'settings'}})).diagnostics.lastScanAt)!==String(scanBefore),'duplicate capture scan');await pause(300);assert.equal(await p.evaluate(()=>globalThis.__uxr4StablePreview===document.querySelector('#material-preview')),true,'idempotent duplicate capture must not remount Preview action');assert.equal(await p.evaluate(()=>globalThis.__uxr4StableClose===[...document.querySelectorAll('#material-workbench button')].find(b=>b.textContent==='从档案选择')),true,'idempotent duplicate capture must not remount workspace selection action');const before=(await tray(p)).items.map(i=>i.ref);await p.getByRole('button',{name:'从档案选择',exact:true}).click();await p.getByRole('searchbox',{name:'全局搜索'}).fill('材料 4');await until(async()=>await p.locator('.universal-hit').count()!==5);await h.open({id:'uxr4-additional',title:'Additional',base:1609459200,messages:Array.from({length:20},(_,i)=>({id:'uxr4-extra-'+i,text:'UXR4_SEARCH 新材料 '+i}))});await until(async()=>(await h.state()).records.length===65);assert.deepEqual((await tray(p)).items.map(i=>i.ref),before);clean(h);}finally{await h.close();}});
test('UX-R4 unorganized Input -> exact editable preview -> redaction/rebuild/export works Local-only; source purge blocks old output',{timeout:180000},async()=>{const {h,p}=await start(['合成姓名甲 UXR4_PRIVATE '+ '完整长文 👩🏽‍💻 '.repeat(400),'合成姓名甲 UXR4_PRIVATE 第二条','合成姓名甲 UXR4_EXTRA 补充材料']);try{await mkdir(dir,{recursive:true});await rpc(p,'PAIA_MEMORY_SETTINGS',{options:{externalAccess:false,localOnly:true}});await rpc(p,'SAVE_DEEPSEEK_CREDENTIAL',{config:{apiKey:'synthetic-local-only-test'}});const blockedCall=await rpc(p,'UPDATE_ORIGINAL_LIBRARY_VIEW',{userActionId:'uxr4-local-only'});assert.ok(blockedCall.error||blockedCall.failed);assert.equal(h.extensionNetworkRequests,0);await search(p,'UXR4_PRIVATE');await p.locator('.universal-selection').getByRole('button',{name:'全选本页',exact:true}).click();await p.locator('.universal-selection').getByRole('button',{name:/加入本次材料/}).click();await until(async()=>(await tray(p))?.items.length===2);await previewReviewedContext(p);await p.evaluate(()=>{const send=chrome.runtime.sendMessage.bind(chrome.runtime);let release;globalThis.__uxr4ActivationReadStarted=false;globalThis.__uxr4ActivationGate=new Promise(r=>{release=r;});globalThis.__releaseUXR4ActivationRead=release;chrome.runtime.sendMessage=async(...args)=>{const result=await send(...args);if(!globalThis.__uxr4ActivationReadStarted&&args[0]?.type==='PAIA_CONTEXT_MANUAL'&&args[0].options?.action==='read'&&document.querySelector('#material-output-text')){globalThis.__uxr4ActivationReadStarted=true;await globalThis.__uxr4ActivationGate;}return result;};});await p.evaluate(async()=>{const {getContextController}=await import(chrome.runtime.getURL('ui/context-workspace.js'));void getContextController().refresh();});await until(()=>p.evaluate(()=>globalThis.__uxr4ActivationReadStarted),'Preview activation read');await until(async()=>(await tray(p)).state==='ready');await p.evaluate(()=>{globalThis.__uxr4StableEdit=document.querySelector('#material-workbench button:not([data-output])');globalThis.__uxr4StableEdit=[...document.querySelectorAll('#material-workbench button')].find(b=>b.textContent==='修改本次输出');});await p.evaluate(()=>globalThis.__releaseUXR4ActivationRead());await until(()=>p.evaluate(async()=>{const {getContextController}=await import(chrome.runtime.getURL('ui/context-workspace.js'));return !getContextController().busy;}),'Preview activation recheck');assert.equal(await p.evaluate(()=>globalThis.__uxr4StableEdit===[...document.querySelectorAll('#material-workbench button')].find(b=>b.textContent==='修改本次输出')),true,'same-data activation recheck must not remount confirmed Preview');const worker=h.context.serviceWorkers().find(w=>w.url().includes('/background/service-worker.js'));assert.ok(worker);await worker.evaluate(()=>{for(let i=0;i<5;i++)setTimeout(()=>{void chrome.runtime.sendMessage({type:'ARCHIVE_CHANGED',cause:'RECORD_TOPIC_READ'}).catch(()=>{});},i*30);});await pause(300);assert.equal(await p.evaluate(()=>globalThis.__uxr4StableEdit===[...document.querySelectorAll('#material-workbench button')].find(b=>b.textContent==='修改本次输出')),true,'filter maintenance notifications must not remount confirmed Preview');await p.evaluate(async()=>{const {getContextController}=await import(chrome.runtime.getURL('ui/context-workspace.js'));const tray=getContextController();await tray.refresh();await tray.refresh();});assert.equal(await p.evaluate(()=>globalThis.__uxr4StableEdit===[...document.querySelectorAll('#material-workbench button')].find(b=>b.textContent==='修改本次输出')),true,'same-data periodic refresh must not remount confirmed Preview');await p.getByRole('button',{name:'修改本次输出',exact:true}).click();const field=p.locator('[data-material-edit]').nth(1);await field.evaluate(el=>{el.focus();el.setSelectionRange(0,5);});await field.locator('..').getByRole('button',{name:'遮去所选文字',exact:true}).click();await until(async()=>(await tray(p)).items.every(i=>!i.body.includes('合成姓名甲')));await p.getByRole('button',{name:'确认本次修改',exact:true}).click();await confirmCompiledContext(p);await until(async()=>(await tray(p)).state==='ready');let expected=await p.locator('#material-output-text').textContent();assert.equal(expected.includes('合成姓名甲'),false);const fixed=await tray(p);assert.equal(fixed.manifest.complete,true);assert.equal(fixed.manifest.partial,false);assert.equal(fixed.manifest.explicit.length,2);assert.equal(fixed.manifest.previewSha256,await p.evaluate(async text=>{const bytes=new TextEncoder().encode(text),digest=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(digest)].map(n=>n.toString(16).padStart(2,'0')).join('');},expected));assert.equal(await p.locator('.material-output-coverage').count(),1);assert.ok((await p.locator('.material-output-coverage').textContent()).includes('2 项材料完整保留'));await p.getByRole('button',{name:'返回材料',exact:true}).click();await previewReviewedContext(p);await until(async()=>(await tray(p)).state==='ready');assert.equal(await p.locator('#material-output-text').textContent(),expected);await p.getByRole('button',{name:'返回材料',exact:true}).click();await p.locator('[data-material-edit=note]').fill('UXR4_EXTRA');await rpc(p,'PAIA_MEMORY_SETTINGS',{options:{includeUnorganizedInputs:true}});await p.locator('.material-suggestions summary').click();await observeSupplementAdmission(p);await p.getByRole('button',{name:'查找补充',exact:true}).click();await until(async()=>await p.locator('.material-suggestion-results article').count()===1);assert.equal((await p.locator('.material-suggestion-results').textContent()).includes('合成姓名甲'),false);await p.locator('.material-suggestion-results').getByRole('button',{name:'加入本次材料',exact:true}).click();await requireSupplementAdmission(p);await until(async()=>(await tray(p)).items.length===3);await previewReviewedContext(p);await until(async()=>(await tray(p)).state==='ready');expected=await p.locator('#material-output-text').textContent();assert.equal(expected.includes('合成姓名甲'),false);await p.evaluate(()=>{globalThis.__uxr4Copied=null;Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{globalThis.__uxr4Copied=text;}}});});await p.locator('[data-output=copy]').click();await until(async()=>await p.evaluate(()=>globalThis.__uxr4Copied!==null));assert.equal(await p.evaluate(()=>globalThis.__uxr4Copied),expected);const download=p.waitForEvent('download');await p.locator('[data-output=markdown]').click();const file=await download;await file.saveAs(new URL('preview-export.md',dir).pathname);const {readFile}=await import('node:fs/promises');assert.equal(await readFile(new URL('preview-export.md',dir),'utf8'),expected);await p.screenshot({path:new URL('preview-initial.png',dir).pathname,fullPage:true});const data=await tray(p),inputId=data.items[0].ref.id;
await rpc(p,'PAIA_MEMORY_EXCLUDE',{options:{inputId,excluded:true}});await until(async()=>(await tray(p)).state==='blocked');await p.getByRole('button',{name:'返回材料',exact:true}).click();await p.getByRole('button',{name:'修改此项限制',exact:true}).click();await p.getByRole('button',{name:'确认撤销这项限制',exact:true}).click();await until(async()=>await p.locator('dialog[open]').count()===0);assert.equal((await tray(p)).state,'blocked');await p.locator('.material-row').first().getByRole('button',{name:'移除',exact:true}).click();await until(async()=>(await tray(p)).items.length===2);await p.evaluate(async ref=>{const {getContextController}=await import(chrome.runtime.getURL('ui/context-workspace.js'));await getContextController().add([ref]);},data.items[0].ref);await until(async()=>(await tray(p)).items.length===3);await previewReviewedContext(p);await until(async()=>(await tray(p)).state==='ready');assert.equal((await p.locator('#material-output-text').textContent()).includes('合成姓名甲'),false);
const source=(await rpc(p,'GET_INPUT',{id:inputId})).originalTextReference;await p.evaluate(()=>{const send=chrome.runtime.sendMessage.bind(chrome.runtime);let delayed=false,release;globalThis.__uxr4ReadDelayed=false;globalThis.__uxr4ReadGate=new Promise(r=>{release=r;});globalThis.__releaseUXR4Read=release;chrome.runtime.sendMessage=async(...args)=>{const result=await send(...args);if(!delayed&&args[0]?.type==='PAIA_CONTEXT_MANUAL'&&args[0].options?.action==='read'){delayed=true;globalThis.__uxr4ReadDelayed=true;await globalThis.__uxr4ReadGate;}return result;};});await rpc(p,'PURGE_SOURCE',{id:source,confirm:true});await until(()=>p.evaluate(()=>globalThis.__uxr4ReadDelayed),'delayed material recheck');assert.equal((await tray(p)).state,'ready');await p.evaluate(()=>{document.documentElement.lang='en';});await pause(100);assert.equal(await p.locator('#material-output-text').count(),0);assert.equal(await p.locator('[data-output]').count(),0);await p.evaluate(()=>{document.documentElement.lang='zh-CN';globalThis.__releaseUXR4Read();});await until(async()=>(await tray(p)).state==='blocked');assert.equal(await p.locator('[data-output=copy]').count(),0);assert.equal(await p.locator('#material-output-text').count(),0);clean(h);}finally{await h.close();}});

test('UX-R4 historical Source, comparison, scope, tray and preview responsive matrix; IME, keyboard, zoom and worker expiry',{timeout:240000},async()=>{const {h,p}=await start(['UXR4_MATRIX 当时的想法甲','UXR4_MATRIX 当时的想法乙','UXR4_MATRIX 未知时间表达']);try{await mkdir(dir,{recursive:true});await h.open({id:'uxr4-unknown-time',title:'Unknown source time',messages:[{id:'uxr4-unknown-input',text:'UXR4_MATRIX 时间证据未知'}]});await until(async()=>(await h.state()).records.length===4);await search(p,'UXR4_MATRIX');await matrix('search');const original=await rpc(p,'SEARCH_INPUTS',{options:{universal:true,paged:true,query:'UXR4_MATRIX'}}),first=original.items[0],b=await rpc(p,'GET_INPUT',{id:first.id});await rpc(p,'EDIT_DOCUMENT',{edit:{documentId:b.documentId,operationId:crypto.randomUUID(),blocks:[{id:b.id,expectedRevision:b.revision,libraryText:'今天改写 UXR4_CURRENT_ONLY',note:b.note,excluded:false}]}});await p.getByRole('button',{name:'按时间看 · 以前的我',exact:true}).click();await until(async()=>await p.locator('.historical-body').count()===4);assert.equal((await p.locator('.universal-results').textContent()).includes('UXR4_CURRENT_ONLY'),false);await p.getByRole('button',{name:'选择并置',exact:true}).nth(0).click();await p.getByRole('button',{name:'选择并置',exact:true}).nth(0).click();await p.getByRole('button',{name:'并置所选两条',exact:true}).click();assert.equal(await p.locator('.historical-comparison pre').count(),2);
 async function matrix(name){for(const appearance of ['light','dark']){await rpc(p,'UPDATE_PREFERENCES',{changes:{appearance}});for(const [width,height]of [[1440,900],[1024,768],[390,844],[320,720]]){await p.setViewportSize({width,height});await pause(80);await p.screenshot({path:new URL(name+'-'+appearance+'-'+width+'.png',dir).pathname});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),name+' horizontal overflow');}}}
 assert.ok((await p.locator('.universal-results').textContent()).includes('发送时间未知'));await matrix('history');await p.setViewportSize({width:1440,height:900});await p.locator('.universal-context').first().click();await until(async()=>(await tray(p))?.items.length===1);await matrix('tray');await previewReviewedContext(p);await until(async()=>(await tray(p)).state==='ready');await matrix('preview');await p.setViewportSize({width:390,height:844});await p.emulateMedia({reducedMotion:'reduce'});await p.getByRole('button',{name:'修改本次输出',exact:true}).click();const area=p.locator('[data-material-edit]').nth(1);await area.evaluate(el=>{el.focus();el.dispatchEvent(new CompositionEvent('compositionstart',{data:'新'}));el.value+=' 新的';el.dispatchEvent(new InputEvent('input',{data:'的',isComposing:true,bubbles:true}));});await rpc(p,'UPDATE_PREFERENCES',{changes:{appearance:'light'}});assert.ok((await area.inputValue()).includes('新的'));await area.evaluate(el=>el.dispatchEvent(new CompositionEvent('compositionend',{data:'新的'})));await p.getByRole('button',{name:'确认本次修改',exact:true}).click();await confirmCompiledContext(p);await until(async()=>(await tray(p)).state==='ready');assert.ok((await p.locator('#material-output-text').textContent()).includes('新的'));await p.keyboard.press('Tab');assert.ok(await p.evaluate(()=>document.activeElement!==document.body));const cdp=await h.context.newCDPSession(p);await cdp.send('Emulation.setPageScaleFactor',{pageScaleFactor:2});await p.screenshot({path:new URL('preview-200pct.png',dir).pathname});await cdp.send('Emulation.setPageScaleFactor',{pageScaleFactor:1});await h.restartWorker();await p.evaluate(async()=>{const {getContextController}=await import(chrome.runtime.getURL('ui/context-workspace.js'));const data=getContextController().data;const r=await chrome.runtime.sendMessage({type:'PAIA_CONTEXT_MANUAL',options:{action:'share',selectionId:data.selectionId,generation:data.generation,format:'copy'}});if(r.error!=='MEMORY_EXPIRED')throw Error('Old preview must expire at the worker boundary');});await p.locator('[data-output=copy]').click({timeout:1500}).catch(async error=>{if(!await p.getByRole('button',{name:'重新选择材料',exact:true}).isVisible())throw error;});await until(()=>p.getByRole('button',{name:'重新选择材料',exact:true}).isVisible());assert.equal(await p.locator('#material-output-text').count(),0);await p.screenshot({path:new URL('preview-expired.png',dir).pathname});clean(h);}finally{await h.close();}});

test('UX-R4 F-LARGE search and direct long Input reuse stay bounded; Grant once/revoke and sender fences run in the real worker',{timeout:300000},async()=>{const h=await FakeChatGPT.start(),p=h.archive;try{await p.locator('#consent-check').check();await p.locator('#enable-consent').click();await until(async()=>(await rpc(p,'GET_STATUS')).consented);const seed=await seedUXLarge(p);assert.deepEqual(seed.counts,{inputs:100000,documents:1000,topics:300,entries:5000});const measure=await p.evaluate(async()=>{const {OrganizerStore}=await import('../core/organizer/store.js');const s=new OrganizerStore(chrome.storage.local);await s.finishFoundation();s.repository.metrics={reads:0,writes:0,scans:0};const start=performance.now(),page=await s.searchInputs({universal:true,paged:true,query:'',documentId:'document:large-501',types:['input'],limit:40});return {ms:performance.now()-start,...s.repository.metrics,count:page.items.length,scanned:page.scanned,next:!!page.nextCursor};});assert.equal(measure.count,40);assert.ok(measure.scanned<=200);assert.equal(measure.writes,0);await search(p,'Synthetic');assert.ok(await p.locator('.universal-hit').count()<=40);await p.screenshot({path:new URL('large-search.png',dir).pathname});await p.locator('.universal-close').click();const long={kind:'input',id:'block:large-record-00050110',revision:0};let state=await rpc(p,'PAIA_CONTEXT_MANUAL',{options:{action:'create'}});state=await rpc(p,'PAIA_CONTEXT_MANUAL',{options:{action:'add',selectionId:state.selectionId,generation:state.generation,refs:[long]}});assert.ok(state.items[0].body.length>=50000);state=await rpc(p,'PAIA_CONTEXT_MANUAL',{options:{action:'task',selectionId:state.selectionId,generation:state.generation,purpose:'Inspect the full selected long synthetic Input'}});state=await rpc(p,'PAIA_CONTEXT_MANUAL',{options:{action:'compile',selectionId:state.selectionId,generation:state.generation}});assert.equal(state.state,'review');state=await rpc(p,'PAIA_CONTEXT_MANUAL',{options:{action:'confirmReview',selectionId:state.selectionId,generation:state.generation,outputSha256:state.reviewBinding.outputSha256,manifestSha256:state.reviewBinding.manifestSha256}});assert.ok(state.text.includes('中'.repeat(50000)));await writeFile(new URL('large-fixture.json',dir),JSON.stringify({seed,search:measure,manualCharacters:state.characters},null,2));
 clean(h);
 }finally{await h.close();}});

test('UX-R4 real worker Grant once, revocation and manual identity fences remain independent',{timeout:120000},async()=>{const {h,p,chat}=await start(['UXR4_GRANT_MATCH 合成受控文字']);try{
 await until(async()=>p.evaluate(async()=>{
  const {OrganizerStore}=await import('../core/organizer/store.js');
  const {SourceStructureStore}=await import('../core/source-structure-store.js');
  const row=await new SourceStructureStore(new OrganizerStore(chrome.storage.local)).conversation({platform:'chatgpt',sourceConversationId:'uxr4-synthetic'});
  return row?.membership.state==='unassigned';
 }),'grant fixture source observation settles');
 // The grant concurrency test starts from a settled archive, without a live
 // producer invalidating its preview between build and the two share calls.
 await chat.close();

 // This test exercises Grant once/revoke concurrency, not capture freshness.
 // Wait until all real capture/enrichment/source-structure writes have stopped
 // changing the same portable-data generation that MemoryService binds into a
 // preview. A later real data change must still produce MEMORY_STALE.
 await until(async()=>{const filter=await rpc(p,'FILTER_STATUS');return filter.pending===0&&filter.taskState==='idle';},'grant fixture capture/filter quiescence');
 await waitForStableDataGeneration(p,'grant fixture portable data generation settles');
await rpc(p,'PAIA_MEMORY_SETTINGS',{options:{includeUnorganizedInputs:true,externalAccess:true}});const built=await rpc(p,'PAIA_MEMORY_BUILD',{options:{query:'UXR4_GRANT_MATCH',budget:'short'}});assert.ok(built.items.length>0);const grant=await rpc(p,'PAIA_PASSPORT_CREATE',{grant:{consumer:'chatgpt',purpose:'research',profileId:'default',duration:'once'}});await rpc(p,'PAIA_CONTEXT_BIND',{previewId:built.previewId,grantId:grant.grantId});const results=await p.evaluate(async opts=>Promise.all([1,2].map(()=>chrome.runtime.sendMessage({type:'PAIA_MEMORY_SHARE',options:opts}))),{previewId:built.previewId,grantId:grant.grantId,format:'copy'});assert.equal(results.filter(r=>r.ok).length,1,JSON.stringify(results));assert.equal((await rpc(p,'PAIA_PASSPORT_STATUS')).grants.find(g=>g.grantId===grant.grantId).useCount,1);const denied=await p.evaluate(id=>chrome.runtime.sendMessage({type:'PAIA_CONTEXT_MANUAL',options:{action:'read',selectionId:id,generation:0}}),built.previewId);assert.equal(denied.error,'MEMORY_EXPIRED');clean(h);
const second=await rpc(p,'PAIA_MEMORY_BUILD',{options:{query:'UXR4_GRANT_MATCH'}}),revocable=await rpc(p,'PAIA_PASSPORT_CREATE',{grant:{consumer:'claude',purpose:'writing',profileId:'default',duration:'7d'}});await rpc(p,'PAIA_CONTEXT_BIND',{previewId:second.previewId,grantId:revocable.grantId});await rpc(p,'PAIA_PASSPORT_REVOKE',{grantId:revocable.grantId});const rejected=await p.evaluate(options=>chrome.runtime.sendMessage({type:'PAIA_MEMORY_SHARE',options}),{previewId:second.previewId,grantId:revocable.grantId,format:'markdown'});assert.equal(rejected.error,'MEMORY_DENIED');clean(h);
}finally{await h.close();}});

test('VS06 whole-group chooser fixes Conversation and cross-page Topics; membership changes refuse old output',{timeout:180000},async()=>{
 const texts=['CONVERSATION_LONG_CANARY '+ '完整长句 👩🏽‍💻\n'.repeat(500),'CONVERSATION_SECOND_CANARY'],{h,p,chat}=await start(texts);
 try{
  await p.locator('#primary-nav [data-view="memory"]').click();await until(()=>p.locator('#material-workbench').isVisible());
  await p.getByRole('button',{name:'整组选择',exact:true}).click();const dialog=p.locator('.material-container-dialog');
  await until(async()=>await dialog.locator('input[type=checkbox]').count()===1,'Conversation metadata chooser');
  await dialog.locator('input[type=checkbox]').check();await dialog.getByRole('button',{name:'加入整组材料',exact:true}).click();
  await until(async()=>(await tray(p)).containers?.length===1&&!(await dialog.count()),'whole Conversation admitted');
  const selected=await tray(p);assert.equal(selected.items.length,2);assert.deepEqual(new Set(selected.items.map(i=>i.body)),new Set(texts));assert.equal(selected.manifest.containers[0].members.length,2);
  await previewReviewedContext(p);await until(async()=>(await tray(p)).state==='ready');const fixed=await tray(p);assert.equal(await p.locator('#material-output-text').textContent(),fixed.text);
  for(const text of texts)assert.ok(fixed.text.includes(text));assert.equal(fixed.manifest.complete,true);assert.equal(fixed.manifest.partial,false);
  await h.send(chat,{id:'vs06-group-new-input',text:'NEW_CONVERSATION_MEMBER'});
  await until(async()=>(await h.state()).records.length===3,'upstream added Input');
  await p.evaluate(async()=>{const {getContextController}=await import(chrome.runtime.getURL('ui/context-workspace.js'));await getContextController().refresh();});
  await until(async()=>(await tray(p)).state==='stale','new member invalidates fixed group');assert.equal((await tray(p)).items.length,2);assert.equal(await p.locator('#material-output-text').count(),0);assert.equal(await p.locator('[data-output]').count(),0);
  await p.getByRole('button',{name:'返回材料',exact:true}).click();await p.getByRole('button',{name:'清空本次材料',exact:true}).click();await until(async()=>(await tray(p)).items.length===0);
  const seeded=await p.evaluate(async()=>{
   const {OrganizerStore}=await import('../core/organizer/store.js');const s=new OrganizerStore(chrome.storage.local);await s.finishFoundation();const topics=[];
   for(let i=0;i<42;i++){
    const topic=await s.createTopic({name:'GROUP_TOPIC_'+String(i).padStart(2,'0'),operationId:crypto.randomUUID()});
    const entry=await s.createEntry({actor:'user',body:'TOPIC_BODY_'+i,type:'idea',formation:'explicit',evidence:[],operationId:crypto.randomUUID()});
    await s.placeEntry({entryId:entry.id,topicId:topic.id,expectedEntryRevision:entry.revision,expectedTopicRevision:(await s.topic(topic.id)).organizationRevision,operationId:crypto.randomUUID()});topics.push(topic.id);
   }
   return topics;
  });
  await p.getByRole('button',{name:'整组选择',exact:true}).click();await p.locator('.material-container-dialog').getByRole('button',{name:'Topic',exact:true}).click();
  await until(async()=>await dialog.locator('input[type=checkbox]').count()===40,'first metadata page');
  const firstId=await dialog.locator('input[type=checkbox]').first().getAttribute('data-container-id');await dialog.locator('input[type=checkbox]').first().check();
  await dialog.getByRole('button',{name:'下一页',exact:true}).click();await until(async()=>await dialog.locator('input[type=checkbox]').count()===2,'second metadata page');
  const secondId=await dialog.locator('input[type=checkbox]').first().getAttribute('data-container-id');await dialog.locator('input[type=checkbox]').first().check();
  await dialog.getByRole('button',{name:'上一页',exact:true}).click();await until(async()=>await dialog.locator('input[type=checkbox]').count()===40,'return to first metadata page');assert.equal(await dialog.locator('input[type=checkbox]').first().isChecked(),true);
  await dialog.getByRole('button',{name:'加入整组材料',exact:true}).click();await until(async()=>(await tray(p)).containers?.length===2&&!(await dialog.count()),'two Topics admitted');
  assert.deepEqual((await tray(p)).containers.map(g=>g.id),[firstId,secondId]);assert.equal((await tray(p)).items.length,2);
  await previewReviewedContext(p);await until(async()=>(await tray(p)).state==='ready');const output=await tray(p);
  for(const id of [firstId,secondId])assert.ok(output.text.includes('TOPIC_BODY_'+seeded.indexOf(id)));assert.equal(output.manifest.complete,true);assert.equal(output.manifest.containers.length,2);
  await p.evaluate(()=>{globalThis.__vs06GroupCopied=null;Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{globalThis.__vs06GroupCopied=text;}}});});
  await p.locator('[data-output=copy]').click();await until(()=>p.evaluate(()=>globalThis.__vs06GroupCopied!==null));assert.equal(await p.evaluate(()=>globalThis.__vs06GroupCopied),output.text);
  const denied=await rpc(p,'PAIA_MEMORY_AUTHORIZE',{options:{topicIds:[firstId],decision:'never'}});assert.equal(denied.saved,true);
  await p.evaluate(async()=>{const {getContextController}=await import(chrome.runtime.getURL('ui/context-workspace.js'));await getContextController().refresh();});
  await until(async()=>(await tray(p)).state==='blocked');assert.equal(await p.locator('#material-output-text').count(),0);assert.equal((await tray(p)).text,'');assert.equal((await tray(p)).manifest.complete,false);clean(h);
 }finally{await h.close();}
});

test('VS06 authorized supplements stay optional and removing them preserves exact fixed material',{timeout:180000},async()=>{
 const texts=['FIXED_IRRELEVANT_CANARY','TASK_RETRIEVAL_NEEDLE '+ '补充文字 👩🏽‍💻 '.repeat(100)],{h,p}=await start(texts);
 try{
  await rpc(p,'PAIA_MEMORY_SETTINGS',{options:{includeUnorganizedInputs:true}});
  await waitForStableDataGeneration(p,'retrieval fixture source generation settles');
  await p.locator('#primary-nav [data-view="memory"]').click();await until(()=>p.locator('#material-workbench').isVisible());
  const fixedRef=await p.evaluate(async()=>{
   const {OrganizerStore}=await import('../core/organizer/store.js');const s=new OrganizerStore(chrome.storage.local);await s.finishFoundation();
   const {MemoryService}=await import('../core/memory/service.js'),{materialRead}=await import('../core/manual-materials.js');const memory=new MemoryService(s);await memory.ready();
   return s.run(()=>s.repository.transaction(false,async t=>{
    for(const state of await t.all('inputStates')){const ref={kind:'input',id:state.id,revision:state.contentRevision};if((await materialRead(memory,t,ref)).body==='FIXED_IRRELEVANT_CANARY')return ref;}
    throw Error('fixed Input not found');
   }));
  });
  await p.evaluate(async ref=>{const {getContextController}=await import(chrome.runtime.getURL('ui/context-workspace.js'));await getContextController().add([ref]);},fixedRef);await until(async()=>(await tray(p)).items.length===1);const fixedItem=(await tray(p)).items[0].itemId;
  const more=p.locator('.material-suggestions');await more.locator('summary').click();await until(async()=>await more.locator('select').getAttribute('data-loaded')==='true','retrieval Profile metadata');
  await more.getByRole('textbox',{name:'检索补充的任务',exact:true}).fill('TASK_RETRIEVAL_NEEDLE');await observeSupplementAdmission(p);await more.getByRole('button',{name:'查找补充',exact:true}).click();
  await until(async()=>await more.locator('.material-suggestion-row').count()===1,'authorized optional suggestion');
  assert.equal((await tray(p)).items.length,1);assert.equal((await tray(p)).manifest.retrievalSupplements.length,0);
  await more.locator('.material-suggestion-row').getByRole('button',{name:'加入本次材料',exact:true}).click();await requireSupplementAdmission(p);await until(async()=>(await tray(p)).manifest.retrievalSupplements.length===1,'explicit supplement admission');
  assert.equal((await tray(p)).manifest.explicit.length,1);assert.equal((await tray(p)).items[0].itemId,fixedItem);
  await previewReviewedContext(p);await until(async()=>(await tray(p)).state==='ready');const reviewed=await tray(p);
  for(const text of texts)assert.ok(reviewed.text.includes(text));assert.equal(await p.locator('#material-output-text').textContent(),reviewed.text);
  assert.ok((await p.locator('.material-output-coverage').textContent()).includes('1 项检索补充'));
  await p.getByRole('button',{name:'返回材料',exact:true}).click();await more.locator('summary').click();
  await more.getByRole('button',{name:'移除所有检索补充',exact:true}).click();await until(async()=>(await tray(p)).items.length===1&&!(await tray(p)).manifest.retrievalSupplements.length,'remove optional material only');
  assert.equal((await tray(p)).items[0].itemId,fixedItem);assert.equal((await tray(p)).items[0].body,texts[0]);assert.equal((await tray(p)).manifest.exclusions.length,1);
  await previewReviewedContext(p);await until(async()=>(await tray(p)).state==='ready');const final=await tray(p);assert.ok(final.text.includes(texts[0]));assert.equal(final.text.includes('TASK_RETRIEVAL_NEEDLE'),false);clean(h);
 }finally{await h.close();}
});


test('VS06 budget packages expose exact copy/export and never describe one fragment as a whole group',{timeout:180000},async()=>{
 const texts=['BUDGET_FULL_CANARY '+'完整文字 👩🏽‍💻 e\u0301 '.repeat(600),'BUDGET_SECOND_CANARY'],{h,p}=await start(texts);
 try{
  await mkdir(dir,{recursive:true});await p.locator('#primary-nav [data-view="memory"]').click();await until(()=>p.locator('#material-workbench').isVisible());
  await p.getByRole('button',{name:'整组选择',exact:true}).click();const dialog=p.locator('.material-container-dialog');await until(async()=>await dialog.locator('input[type=checkbox]').count()===1,'budget whole Conversation');
  await dialog.locator('input[type=checkbox]').check();await dialog.getByRole('button',{name:'加入整组材料',exact:true}).click();await until(async()=>(await tray(p)).items.length===2&&!(await dialog.count()),'fixed complete selection');
  const ids=(await tray(p)).items.map(i=>i.itemId);await p.getByRole('combobox',{name:'每包输出预算',exact:true}).selectOption('short');await until(async()=>(await tray(p)).outputBudget==='short','chosen budget acknowledged');
  await previewReviewedContext(p);await until(async()=>(await tray(p)).state==='ready');const reviewed=await tray(p);
  assert.ok(reviewed.outputPackages.length>1);assert.equal(reviewed.outputPackages.map(p=>p.body).join(''),reviewed.text);assert.deepEqual(reviewed.items.map(i=>i.itemId),ids);for(const text of texts)assert.ok(reviewed.text.includes(text));assert.equal(reviewed.manifest.complete,true);
  await p.evaluate(()=>{globalThis.__vs06PackageCopied=null;Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{globalThis.__vs06PackageCopied=text;}}});});
  for(const part of reviewed.outputPackages){
   await p.getByRole('combobox',{name:'查看分包',exact:true}).selectOption(String(part.index));await until(async()=>(await p.locator('#material-output-text').textContent())===part.text,'exact selected package');
   assert.ok((await p.locator('.material-output-coverage').textContent()).includes('不代表整组材料'));assert.ok(part.characters<=2400);assert.ok(part.tokens<=1800);
   await p.evaluate(()=>{globalThis.__vs06PackageCopied=null;});await p.locator('[data-output=copy]').click();await until(()=>p.evaluate(()=>globalThis.__vs06PackageCopied!==null),'exact package copied');assert.equal(await p.evaluate(()=>globalThis.__vs06PackageCopied),part.text);
   const actualDigest=await p.evaluate(async text=>{const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return [...new Uint8Array(digest)].map(n=>n.toString(16).padStart(2,'0')).join('');},part.text);assert.equal(actualDigest,part.sha256);
  }
  const last=reviewed.outputPackages.at(-1),download=p.waitForEvent('download');await p.locator('[data-output=markdown]').click();const file=await download;assert.equal(file.suggestedFilename(),'PAIA-Context-'+last.index+'-of-'+last.count+'.md');const target=new URL('budget-package-export.md',dir);await file.saveAs(target.pathname);const {readFile}=await import('node:fs/promises');assert.equal(await readFile(target,'utf8'),last.text);
  await p.getByRole('button',{name:'返回材料',exact:true}).click();await p.getByRole('combobox',{name:'每包输出预算',exact:true}).selectOption('detailed');await until(async()=>(await tray(p)).outputBudget==='detailed'&&(await tray(p)).state==='dirty');assert.deepEqual((await tray(p)).outputPackages,[]);
  await previewReviewedContext(p);await until(async()=>(await tray(p)).state==='ready');assert.equal((await tray(p)).text,reviewed.text);assert.ok((await tray(p)).outputPackages.length<reviewed.outputPackages.length);
  await rpc(p,'PAIA_MEMORY_EXCLUDE',{options:{inputId:reviewed.items[0].ref.id,excluded:true}});
  await p.evaluate(async()=>{const {getContextController}=await import(chrome.runtime.getURL('ui/context-workspace.js'));await getContextController().refresh();});await until(async()=>(await tray(p)).state==='blocked');assert.deepEqual((await tray(p)).outputPackages,[]);assert.equal((await tray(p)).text,'');assert.equal(await p.locator('#material-output-text').count(),0);assert.equal(await p.locator('[data-output]').count(),0);clean(h);
 }finally{await h.close();}
});


test('VS06 workspace permission round-trip preserves fixed task drafts and revalidates changed source restrictions',{timeout:180000},async()=>{
 const {h,p,chat}=await start(['WORKSPACE_ARCHIVE_CANARY']);
 try{
  await chat.close();await until(async()=>{const s=await rpc(p,'FILTER_STATUS');return s.pending===0&&s.taskState==='idle';},'workspace capture settles');
  await waitForStableDataGeneration(p,'workspace source snapshot settles');
  const topicId=await p.evaluate(async()=>{
   const {OrganizerStore}=await import('../core/organizer/store.js');const s=new OrganizerStore(chrome.storage.local);await s.finishFoundation();
   const topic=await s.createTopic({name:'WORKSPACE_SCOPE_TOPIC',operationId:crypto.randomUUID()});
   const entry=await s.createEntry({actor:'user',body:'WORKSPACE_FIXED_CANARY',type:'idea',formation:'explicit',evidence:[],operationId:crypto.randomUUID()});
   await s.placeEntry({entryId:entry.id,topicId:topic.id,expectedEntryRevision:entry.revision,expectedTopicRevision:(await s.topic(topic.id)).organizationRevision,operationId:crypto.randomUUID()});return topic.id;
  });
  await p.locator('#primary-nav [data-view="memory"]').click();await until(()=>p.locator('#material-workbench').isVisible());
  await p.getByRole('button',{name:'整组选择',exact:true}).click();const chooser=p.locator('.material-container-dialog');await chooser.getByRole('button',{name:'Topic',exact:true}).click();
  await until(async()=>await chooser.locator('input[type=checkbox]').count()===1,'whole Topic choice');await chooser.locator('input[type=checkbox]').check();await chooser.getByRole('button',{name:'加入整组材料',exact:true}).click();
  await until(async()=>(await tray(p)).containers?.length===1&&!(await chooser.count()),'workspace fixed Topic');
  const selected=await tray(p),note=p.getByRole('textbox',{name:'你准备问什么？（可不填）',exact:true});assert.equal(selected.containers[0].id,topicId);assert.equal(selected.items.length,1);
  await note.fill('WORKSPACE_UNSENT_NOTE');
  const permissions=p.locator('.material-permissions-open'),dialog=p.locator('.material-connections-dialog');
  const before=await rpc(p,'PAIA_MEMORY_STATUS',{options:{profileId:'default'}}),passport=await rpc(p,'PAIA_PASSPORT_STATUS');assert.equal(passport.grants.length,0);
  await permissions.click();await until(async()=>(await dialog.locator('.material-connections-status').textContent()).includes('当前本机记录'),'readonly current permission records');
  assert.ok((await dialog.textContent()).includes('不代表已连接或已发送'));
  assert.equal(await dialog.locator('button').count(),4,'explicit scope, close, create and refresh controls');
  assert.equal(await dialog.locator('.passport-create').isDisabled(),true,'creation requires complete explicit choices');
  for(const field of await dialog.locator('.passport-grant-form select').all())assert.equal(await field.inputValue(),'');
  assert.equal(await dialog.locator('[name=confirm_read]').isChecked(),false,'no read/export permission implied by opening');
  await p.keyboard.press('Escape');await until(async()=>await dialog.count()===0,'keyboard close');assert.equal(await permissions.evaluate(el=>el===document.activeElement),true);
  assert.equal(await note.inputValue(),'WORKSPACE_UNSENT_NOTE');assert.equal((await tray(p)).generation,selected.generation);assert.equal((await tray(p)).note,selected.note);
  const after=await rpc(p,'PAIA_MEMORY_STATUS',{options:{profileId:'default'}});assert.deepEqual(after.config,before.config);assert.deepEqual(after.profiles,before.profiles);assert.deepEqual((await rpc(p,'PAIA_PASSPORT_STATUS')).grants,passport.grants);
  await permissions.click();await dialog.getByRole('button',{name:'管理允许范围',exact:true}).click();await until(()=>p.locator('#memory-authorizations').isVisible(),'existing scope management');
  assert.equal(await p.locator('#material-return-to-task').isVisible(),true);assert.equal(await p.locator('#material-workbench').isVisible(),false);
  await p.locator('#material-return-to-task').click();await until(async()=>await p.locator('#material-workbench').isVisible()&&await p.evaluate(async()=>{const {getContextController}=await import(chrome.runtime.getURL('ui/context-workspace.js'));const t=getContextController();return !t.rechecking&&!t.busy;}),'same fixed task revalidated');
  assert.equal(await note.inputValue(),'WORKSPACE_UNSENT_NOTE');assert.equal((await tray(p)).selectionId,selected.selectionId);assert.equal((await tray(p)).generation,selected.generation);assert.deepEqual((await tray(p)).items.map(i=>i.itemId),selected.items.map(i=>i.itemId));
  assert.equal(await permissions.evaluate(el=>el===document.activeElement),true);
  await previewReviewedContext(p);await until(async()=>(await tray(p)).state==='ready');const reviewed=await tray(p);assert.ok(reviewed.text.includes('WORKSPACE_UNSENT_NOTE'));assert.ok(reviewed.text.includes('WORKSPACE_FIXED_CANARY'));assert.equal(await p.locator('#material-output-text').textContent(),reviewed.text);
  await p.evaluate(()=>{globalThis.__workspaceCopied=null;Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{globalThis.__workspaceCopied=text;}}});});
  await p.locator('[data-output=copy]').click();await until(()=>p.evaluate(()=>globalThis.__workspaceCopied!==null));assert.equal(await p.evaluate(()=>globalThis.__workspaceCopied),reviewed.text);
  await permissions.click();await dialog.getByRole('button',{name:'管理允许范围',exact:true}).click();await until(()=>p.locator('#memory-authorizations').isVisible());
  await p.getByRole('combobox',{name:'WORKSPACE_SCOPE_TOPIC · 长期授权',exact:true}).selectOption('never');await until(async()=>(await rpc(p,'PAIA_MEMORY_STATUS',{options:{profileId:'default'}})).items.find(i=>i.id===topicId)?.permanentDecision==='never','actual permanent restriction saved');
  await p.locator('#material-return-to-task').click();await until(async()=>await p.locator('#material-workbench').isVisible()&&(await tray(p)).state==='blocked'&&await p.evaluate(async()=>{const {getContextController}=await import(chrome.runtime.getURL('ui/context-workspace.js'));const t=getContextController();return !t.rechecking&&!t.busy;}),'return revalidates current restriction');
  const blocked=await tray(p);assert.equal(blocked.selectionId,selected.selectionId);assert.deepEqual(blocked.items.map(i=>i.itemId),selected.items.map(i=>i.itemId));assert.equal(blocked.items[0].body,'');assert.equal(blocked.text,'');assert.equal(blocked.manifest.complete,false);assert.equal(await p.locator('#material-output-text').count(),0);assert.equal(await p.locator('[data-output]').count(),0);
  assert.equal((await rpc(p,'PAIA_PASSPORT_STATUS')).grants.length,0);clean(h);
 }finally{await h.close();}
});


test('VS06 readable edited preview remains literal and clipboard uncertainty never reports success or retries',{timeout:180000},async()=>{
 const texts=['READABLE_ORIGINAL_CANARY','SECOND_ORIGINAL_CANARY'],{h,p}=await start(texts);
 try{
  await mkdir(dir,{recursive:true});await p.locator('#primary-nav [data-view="memory"]').click();await until(()=>p.locator('#material-workbench').isVisible());
  await p.getByRole('button',{name:'整组选择',exact:true}).click();const chooser=p.locator('.material-container-dialog');await until(async()=>await chooser.locator('input[type=checkbox]').count()===1);await chooser.locator('input[type=checkbox]').check();await chooser.getByRole('button',{name:'加入整组材料',exact:true}).click();await until(async()=>(await tray(p)).items.length===2&&!(await chooser.count()));
  await previewReviewedContext(p);await until(async()=>(await tray(p)).state==='ready');
  const initial=await tray(p);assert.ok(initial.text.startsWith('这次准备给 AI 的内容'));assert.equal(/^# 这次|^## 本次|^## \d/m.test(initial.text),false);
  for(const item of initial.items){assert.equal(initial.text.includes(item.ref.id),false);if(item.time)assert.equal(initial.text.includes(item.time),false);}
  await p.getByRole('button',{name:'修改本次输出',exact:true}).click();
  const literal='# USER_MARKDOWN_CANARY\n<script>globalThis.__untrustedArchiveAction=true</script>\n<img src="https://example.invalid/no-request" onerror="globalThis.__untrustedArchiveAction=true">\nLiteral source time 2021-01-01T00:00:00Z';
  await p.getByRole('textbox',{name:'本次材料文字',exact:true}).first().fill(literal);await p.getByRole('textbox',{name:'本次说明（不是历史表达）',exact:true}).fill('READABLE_TASK_NOTE');
  assert.equal(await p.locator('[data-output=copy]').isDisabled(),true);assert.equal(await p.locator('[data-output=markdown]').isDisabled(),true);
  await p.getByRole('button',{name:'确认本次修改',exact:true}).click();await confirmCompiledContext(p);await until(async()=>{const current=await tray(p);return current.state==='ready'&&current.text.includes(literal)&&current.text.includes('READABLE_TASK_NOTE')&&current.manifest.previewSha256!==initial.manifest.previewSha256;},'new reviewed output reaches Ready');const reviewed=await tray(p),shown=await p.locator('#material-output-text').textContent();
  assert.equal(shown,reviewed.text);assert.ok(shown.includes(literal));assert.ok(shown.includes('READABLE_TASK_NOTE'));assert.equal(shown.includes('READABLE_ORIGINAL_CANARY'),false);
  assert.notEqual(reviewed.manifest.previewSha256,initial.manifest.previewSha256);assert.equal(await p.locator('#material-output-text script,#material-output-text img').count(),0);assert.equal(await p.evaluate(()=>globalThis.__untrustedArchiveAction),undefined);
  const canonical=await p.evaluate(async refs=>{const {OrganizerStore}=await import('../core/organizer/store.js'),{MemoryService}=await import('../core/memory/service.js'),{materialRead}=await import('../core/manual-materials.js');const s=new OrganizerStore(chrome.storage.local),m=new MemoryService(s);await m.ready();return s.run(()=>s.repository.transaction(false,async t=>{const bodies=[];for(const ref of refs)bodies.push((await materialRead(m,t,ref)).body);return bodies;}));},initial.items.map(i=>i.ref));
  assert.deepEqual(canonical,initial.items.map(i=>i.body));
  await p.evaluate(()=>{globalThis.__readableCopyAttempts=[];Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{globalThis.__readableCopyAttempts.push(text);throw new DOMException('Unknown acknowledgement','NotAllowedError');}}});});
  await p.locator('[data-output=copy]').click();await until(()=>p.locator('.material-copy-fallback').isVisible(),'verified copy fallback');
  assert.deepEqual(await p.evaluate(()=>globalThis.__readableCopyAttempts),[shown]);assert.equal(await p.locator('.material-copy-fallback').inputValue(),shown);assert.equal(await p.locator('.material-copy-fallback').getAttribute('readonly'),'');assert.ok((await p.locator('.material-status').textContent()).includes('剪贴板写入失败'));assert.equal((await p.locator('.material-status').textContent()).includes('已复制'),false);
  const download=p.waitForEvent('download');await p.locator('[data-output=markdown]').click();const file=await download;const target=new URL('readable-exact-export.md',dir);await file.saveAs(target.pathname);const {readFile}=await import('node:fs/promises');assert.equal(await readFile(target,'utf8'),shown);assert.ok((await p.locator('.material-status').textContent()).includes('下载已开始'));assert.equal((await p.locator('.material-status').textContent()).startsWith('已保存'),false);
  await rpc(p,'PAIA_MEMORY_EXCLUDE',{options:{inputId:initial.items[0].ref.id,excluded:true}});await p.evaluate(async()=>{const {getContextController}=await import(chrome.runtime.getURL('ui/context-workspace.js'));await getContextController().refresh();});await until(async()=>(await tray(p)).state==='blocked');
  assert.equal(await p.locator('.material-copy-fallback').count(),0);assert.equal(await p.locator('#material-output-text').count(),0);assert.equal((await tray(p)).text,'');assert.deepEqual(await p.evaluate(()=>globalThis.__readableCopyAttempts),[shown]);clean(h);
 }finally{await h.close();}
});


test('VS06 Passport workspace creates and revokes only explicit read-export metadata without changing this task',{timeout:180000},async()=>{
 const {h,p}=await start(['PASSPORT_WORKSPACE_SOURCE_CANARY']);
 try{
  await p.locator('#primary-nav [data-view="memory"]').click();await until(()=>p.locator('#material-workbench').isVisible());
  const note=p.getByRole('textbox',{name:'你准备问什么？（可不填）',exact:true});await note.fill('PASSPORT_UNSENT_NOTE');
  const before=await tray(p),memory=await rpc(p,'PAIA_MEMORY_STATUS',{options:{profileId:'default'}});
  const opener=p.locator('.material-permissions-open');await opener.click();
  const dialog=p.locator('.material-connections-dialog'),form=dialog.locator('.passport-grant-form');
  await until(()=>form.isVisible(),'controlled permission choices');
  assert.equal((await rpc(p,'PAIA_PASSPORT_STATUS')).grants.length,0);
  assert.equal(await form.locator('button').isDisabled(),true);
  await form.locator('[name=consumer]').selectOption('chatgpt');
  await form.locator('[name=purpose]').selectOption('career');
  await form.locator('[name=profileId]').selectOption('default');
  await form.locator('[name=duration]').selectOption('7d');
  assert.equal(await form.locator('button').isDisabled(),true,'choices alone do not authorize');
  await form.locator('[name=confirm_read]').check();await form.locator('button').click();
  await until(async()=>(await dialog.locator('.material-connections-status').textContent()).includes('本机权限记录已创建'),'matching mutation readback');
  const grants=(await rpc(p,'PAIA_PASSPORT_STATUS')).grants;assert.equal(grants.length,1);
  const grant=grants[0];assert.equal(grant.consumer,'chatgpt');assert.equal(grant.purpose,'career');assert.equal(grant.profileId,'default');assert.equal(grant.duration,'7d');assert.equal(grant.permission,'context_export');assert.equal(grant.resourceScope,'profile');assert.equal(grant.state,'active');
  assert.equal(grant.useCount,0);assert.equal(grant.lastUsedAt,null);
  assert.ok((await dialog.locator('.material-permission-facts').textContent()).includes('1 项有效记录'));
  const row=dialog.locator('.passport-grant');assert.ok((await row.textContent()).includes('ChatGPT'));assert.ok((await row.textContent()).includes('职业任务'));assert.ok((await row.textContent()).includes(memory.profiles.find(p=>p.profileId==='default').name));assert.ok((await row.textContent()).includes('7 天'));assert.ok((await row.textContent()).includes('尚无受控使用'));
  assert.equal(await form.locator('[name=confirm_read]').isChecked(),false);
  await row.getByRole('button',{name:'撤销这项权限',exact:true}).click();
  await until(async()=>(await dialog.locator('.material-connections-status').textContent()).includes('已撤销；后续受控使用将被拒绝'),'exact revoked readback');
  const after=(await rpc(p,'PAIA_PASSPORT_STATUS')).grants;assert.equal(after.length,1);assert.equal(after[0].grantId,grant.grantId);assert.equal(after[0].state,'revoked');assert.ok(after[0].revokedAt);assert.equal(after[0].useCount,0);
  assert.ok((await dialog.locator('.material-permission-facts').textContent()).includes('0 项有效记录'));
  assert.equal(await row.locator('button').count(),0);
  const denied=await p.evaluate(async grantId=>{const {OrganizerStore}=await import('../core/organizer/store.js'),{PassportService}=await import('../core/passport.js');try{await new PassportService(new OrganizerStore(chrome.storage.local)).resolve(grantId);return false;}catch(e){return e.code==='MEMORY_DENIED';}},grant.grantId);assert.equal(denied,true,'actual authority denies revoked record');
  await p.keyboard.press('Escape');await until(async()=>await dialog.count()===0);
  assert.equal(await opener.evaluate(el=>el===document.activeElement),true);assert.equal(await note.inputValue(),'PASSPORT_UNSENT_NOTE');
  const same=await tray(p);assert.equal(same.selectionId,before.selectionId);assert.equal(same.note,before.note);assert.deepEqual(same.items,before.items);
  const nextMemory=await rpc(p,'PAIA_MEMORY_STATUS',{options:{profileId:'default'}});assert.deepEqual(nextMemory.config,memory.config);assert.deepEqual(nextMemory.profiles,memory.profiles);clean(h);
 }finally{await h.close();}
});

test('VS06 Passport workspace refuses unknown mutation acknowledgements and requires fresh explicit confirmation',{timeout:180000},async()=>{
 const {h,p}=await start(['PASSPORT_UNCERTAIN_SOURCE_CANARY']);
 try{
  await p.locator('#primary-nav [data-view="memory"]').click();await until(()=>p.locator('#material-workbench').isVisible());
  const note=p.getByRole('textbox',{name:'你准备问什么？（可不填）',exact:true});await note.fill('PASSPORT_UNCERTAIN_UNSENT_NOTE');
  const before=await tray(p);
  await p.evaluate(()=>{const send=chrome.runtime.sendMessage.bind(chrome.runtime);globalThis.__passportCreateAttempts=0;chrome.runtime.sendMessage=async q=>{const response=await send(q);if(q.type==='PAIA_PASSPORT_CREATE'){globalThis.__passportCreateAttempts++;return {...response,data:{...response.data,profileId:'unconfirmed_wrong_scope'}};}return response;};});
  await p.locator('.material-permissions-open').click();const dialog=p.locator('.material-connections-dialog'),form=dialog.locator('.passport-grant-form');await until(()=>form.isVisible());
  await form.locator('[name=consumer]').selectOption('claude');await form.locator('[name=purpose]').selectOption('research');await form.locator('[name=profileId]').selectOption('default');await form.locator('[name=duration]').selectOption('once');await form.locator('[name=confirm_read]').check();await form.locator('button').click();
  await until(async()=>(await dialog.locator('.material-connections-status').textContent()).includes('操作结果尚未确认'),'unknown result is explicit');
  assert.equal(await p.evaluate(()=>globalThis.__passportCreateAttempts),1);assert.equal(await form.locator('button').isDisabled(),true);
  assert.equal((await rpc(p,'PAIA_PASSPORT_STATUS')).grants.length,1,'the authority wrote once despite mismatched acknowledgement');
  await form.dispatchEvent('submit');assert.equal(await p.evaluate(()=>globalThis.__passportCreateAttempts),1,'no blind replay');
  await dialog.getByRole('button',{name:'重新读取权限记录',exact:true}).click();await until(async()=>(await dialog.locator('.material-connections-status').textContent()).includes('已重新读取本机权限记录'));
  assert.equal(await dialog.locator('.passport-grant').count(),1);assert.equal(await form.locator('[name=confirm_read]').isChecked(),false);assert.equal(await form.locator('button').isDisabled(),true,'fresh confirmation required even after explicit refresh');
  assert.equal(await p.evaluate(()=>globalThis.__passportCreateAttempts),1);assert.ok((await dialog.locator('.passport-grant').textContent()).includes('有效'));
  await p.keyboard.press('Escape');await until(async()=>await dialog.count()===0);assert.equal(await note.inputValue(),'PASSPORT_UNCERTAIN_UNSENT_NOTE');const same=await tray(p);assert.equal(same.selectionId,before.selectionId);assert.deepEqual(same.items,before.items);assert.equal(same.note,before.note);clean(h);
 }finally{await h.close();}
});

test('VS06 Passport workspace refresh removes a deleted scope and does not silently choose another',{timeout:180000},async()=>{
 const {h,p}=await start(['PASSPORT_DELETED_SCOPE_CANARY']);
 try{
  const added=await rpc(p,'PAIA_MEMORY_PROFILE',{options:{action:'create',name:'SAVED_SCOPE_CHOICE'}});
  await p.locator('#primary-nav [data-view="memory"]').click();await until(()=>p.locator('#material-workbench').isVisible());await p.locator('.material-permissions-open').click();
  const dialog=p.locator('.material-connections-dialog'),form=dialog.locator('.passport-grant-form');await until(()=>form.isVisible());
  await form.locator('[name=consumer]').selectOption('gemini');await form.locator('[name=purpose]').selectOption('writing');await form.locator('[name=profileId]').selectOption(added.profileId);await form.locator('[name=duration]').selectOption('30d');await form.locator('[name=confirm_read]').check();
  assert.equal(await form.locator('button').isDisabled(),false);
  const memory=await rpc(p,'PAIA_MEMORY_STATUS',{options:{profileId:'default'}}),profile=memory.profiles.find(row=>row.profileId===added.profileId);
  await rpc(p,'PAIA_MEMORY_PROFILE',{options:{action:'delete',profileId:added.profileId,expectedRevision:profile.revision}});
  await dialog.getByRole('button',{name:'重新读取权限记录',exact:true}).click();await until(async()=>(await dialog.locator('.material-connections-status').textContent()).includes('已重新读取本机权限记录'));
  assert.equal(await form.locator('[name=profileId]').inputValue(),'');assert.equal(await form.locator('[name=profileId] option').count(),2,'only blank and default remain');assert.equal(await form.locator('[name=confirm_read]').isChecked(),false);assert.equal(await form.locator('button').isDisabled(),true);assert.equal((await rpc(p,'PAIA_PASSPORT_STATUS')).grants.length,0);
  await p.keyboard.press('Escape');clean(h);
 }finally{await h.close();}
});

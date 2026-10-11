// Real Settings DOM/worker/storage, with explicitly synthetic browser-update
// callbacks. No online update check, installation, provider or Popup cutover.
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {FakeChatGPT,eventually} from './harness/fake-chatgpt.mjs';
import {chooseConsumerGroup} from './harness/settings-consumer-presentation.mjs';

const root=fileURLToPath(new URL('..',import.meta.url));
const UPDATE_KEY='paia-consumer-update:v1';
const paths=['ui/settings-about.js','ui/settings-preferences.js','ui/installation-update-check.js','core/settings-update-status.js'];
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const hashes=async base=>Object.fromEntries(await Promise.all(paths.map(async path=>[path,sha(await readFile(join(base,path)))])));
const rpc=async(page,type,fields={})=>{const r=await page.evaluate(message=>chrome.runtime.sendMessage(message),{type,...fields});assert.equal(r.ok,true,JSON.stringify(r));return r.data;};

// Install before the original page modules mount. Only the browser update API's
// callback is controlled. Status reads complete through the genuine worker;
// one explicit synthetic read failure and one delayed completed reply exercise
// presentation recovery. No actual control-write/SDK identity is replaced.
function installUpdateFixture(){
 if(location.pathname!=='/ui/archive.html')return;
 const runtime=chrome.runtime,originalCheck=runtime.requestUpdateCheck,originalSend=runtime.sendMessage.bind(runtime);
 const f={calls:0,callbacks:[],reads:0,completedReads:0,held:null,holdNext:false,failNext:false,failures:0,clicks:[]};
 f.focus=[];f.focusMark=stage=>{if(f.focus.length<32)f.focus.push({stage,active:document.activeElement?.id==='settings-check-update'?'check':document.activeElement===document.body?'body':'other',disabled:document.getElementById('settings-check-update')?.disabled===true,connected:document.getElementById('settings-check-update')?.isConnected===true,visible:document.visibilityState});};
 for(const type of ['focusin','focusout','pointerdown','keydown'])document.addEventListener(type,event=>{if(event.target?.id==='settings-check-update'||document.getElementById('settings-update-status')?.getAttribute('aria-busy')==='true')f.focusMark(type+':'+String(event.isTrusted));},true);
 runtime.requestUpdateCheck=callback=>{f.calls++;f.callbacks.push(callback);};
 runtime.sendMessage=async(message,...args)=>{
  if(message?.type!=='PAIA_SETTINGS_UPDATE_STATUS')return originalSend(message,...args);
  f.reads++;
  if(f.failNext){f.failNext=false;f.failures++;return {ok:false,error:'STORAGE_FAILED'};}
  const hold=f.holdNext;f.holdNext=false;
  const reply=await originalSend(message,...args);f.completedReads++;
  if(hold){await new Promise(resolve=>{f.held={reply,release:resolve};});f.held=null;}
  return reply;
 };
 document.addEventListener('click',event=>{if(event.target.closest?.('#settings-check-update'))f.clicks.push({trusted:event.isTrusted});},true);
 f.finish=(status,details)=>{if(f.callbacks.length!==1)throw Error('EXPECTED_ONE_UPDATE_CALLBACK');f.callbacks.shift()(status,details);};
 f.restore=()=>{f.held?.release();f.held=null;runtime.requestUpdateCheck=originalCheck;runtime.sendMessage=originalSend;};
 globalThis.__settingsUpdateFixture=f;
}

for(const variant of ['source','release'])test(`NIB S4 Settings current-install update replacement (${variant})`,{timeout:180000},async t=>{
 const head=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
 const tree=execFileSync('git',['rev-parse','HEAD^{tree}'],{cwd:root,encoding:'utf8'}).trim();
 const sourceHashes=await hashes(root),testHash=sha(await readFile(fileURLToPath(import.meta.url)));
 if(variant==='release'&&!process.env.NIB_SETTINGS_RELEASE_PATH)execFileSync('python3',['scripts/build_current_release.py'],{cwd:root,maxBuffer:16*1024*1024});
 const extensionPath=variant==='release'?(process.env.NIB_SETTINGS_RELEASE_PATH||join(root,'work/current-release')):root;
 assert.deepEqual(await hashes(extensionPath),sourceHashes,'all original consumed update owners are exact source/release bytes');
 const screenDir=join(root,'work/nib-v4-settings-entry');await mkdir(screenDir,{recursive:true});
 const cases=[];let h;
 try{
  h=await FakeChatGPT.start({extensionPath,onboarding:true,launchThroughPort:true,headless:true});
  const page=h.archive;
  // This desktop Settings scenario uses an owned headless browser window. The
  // default small CDP window correctly moves navigation into the compact menu.
  const session=await h.context.newCDPSession(page),{windowId}=await session.send('Browser.getWindowForTarget');
  await session.send('Browser.setWindowBounds',{windowId,bounds:{width:1280,height:900}});
  const {bounds}=await session.send('Browser.getWindowBounds',{windowId});assert.equal(bounds.width,1280);assert.equal(bounds.height,900);await session.detach();
  await page.setViewportSize({width:1280,height:900});
  await page.addInitScript(installUpdateFixture);await page.reload();
  await eventually(()=>page.locator('#onboarding-start').isVisible().then(async visible=>visible||await page.locator('#consent-check').isVisible()),'original onboarding is ready');
  if(await page.locator('#onboarding-start').isVisible())await page.locator('#onboarding-start').click();
  await page.locator('#consent-check').waitFor({state:'visible'});await page.locator('#consent-check').check();await page.locator('#enable-consent').click();
  await eventually(async()=>(await rpc(page,'GET_STATUS')).consented===true,'genuine consent is acknowledged');
  await rpc(page,'UPDATE_PREFERENCES',{changes:{language:'en'}});await eventually(()=>page.evaluate(()=>document.documentElement.lang==='en'));
  await page.locator('.sidebar-bottom [data-view="settings"]').click();await page.locator('#settings-panel').waitFor({state:'visible'});
  const controlBefore=await page.evaluate(()=>chrome.storage.local.get('personalAIArchive'));
  const recordsBefore=(await h.state()).records;
  const version=await page.evaluate(()=>chrome.runtime.getManifest().version),parts=version.split('.').map(Number);parts[parts.length-1]++;const target=parts.join('.');
  const button=page.locator('#settings-check-update'),status=page.locator('#settings-update-status');
  const idle=()=>eventually(async()=>await status.getAttribute('aria-busy')==='false'&&await button.isEnabled(),'original update owner completed');
  const fixture=()=>page.evaluate(()=>({calls:__settingsUpdateFixture.calls,pending:__settingsUpdateFixture.callbacks.length,reads:__settingsUpdateFixture.reads,completed:__settingsUpdateFixture.completedReads,held:!!__settingsUpdateFixture.held,failures:__settingsUpdateFixture.failures,clicks:__settingsUpdateFixture.clicks}));
  const finish=(state,details)=>page.evaluate(({state,details})=>__settingsUpdateFixture.finish(state,details),{state,details});
  const check=async(name,fn)=>{let completed=false;await t.test(name,async()=>{await fn();completed=true;});assert.equal(completed,true,name+' completed its original assertions');cases.push({name,result:'PASS'});};

  await check('mount and About navigation never automatically check for updates',async()=>{
   assert.equal((await fixture()).calls,0);await chooseConsumerGroup(page,'about');await idle();
   assert.equal((await fixture()).calls,0);assert.equal(await button.count(),1);assert.equal(await button.textContent(),'Check this installation for updates');
   assert.equal(await page.locator('.ux-about-version').textContent(),`PAIA ${version}`);assert.equal(await page.locator('.ux-about-links a').count(),4);
   assert.equal(await button.getAttribute('aria-describedby'),'settings-update-status');assert.equal(await status.getAttribute('role'),'status');
   await page.screenshot({path:join(screenDir,variant+'-about-current-install.png')});
  });
  await check('trusted explicit check is single-flight until the held callback; no_update is installation-source bounded',async()=>{
   const before=await page.evaluate(key=>chrome.storage.local.get(key),UPDATE_KEY);await button.click();
   assert.equal((await fixture()).calls,1);assert.equal((await fixture()).pending,1);assert.equal(await button.isDisabled(),true);
   assert.equal(await status.textContent(),'Checking updates for this installation source…');
   // A genuine second pointer click on the disabled control cannot dispatch.
   const box=await button.boundingBox();assert.ok(box);await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
   await chooseConsumerGroup(page,'reading');await chooseConsumerGroup(page,'about');assert.equal((await fixture()).calls,1);
   await finish('no_update');await idle();assert.equal(await status.textContent(),'This installation source currently has no pending update.');
   assert.doesNotMatch(await status.textContent(),/latest|GitHub|installed|up to date/i);
   assert.deepEqual(await page.evaluate(key=>chrome.storage.local.get(key),UPDATE_KEY),before);
  });
  await check('available response uses the original strict version owner and actual Chrome-local event record',async()=>{
   await page.evaluate(()=>__settingsUpdateFixture.focusMark('available-before-click'));await button.click();await page.evaluate(()=>__settingsUpdateFixture.focusMark('available-after-click'));await finish('update_available',{version:target});await idle();await page.evaluate(()=>__settingsUpdateFixture.focusMark('available-after-idle'));
   assert.equal(await status.textContent(),`Chrome reported version ${target} available. You can keep working.`);
   try{assert.equal(await button.evaluate(node=>document.activeElement===node),true,'completed check preserves the genuine control focus');}catch(error){try{console.error('SETTINGS_CHECK_FOCUS_FAILURE',JSON.stringify(await page.evaluate(()=>__settingsUpdateFixture.focus)));}catch{}throw error;}
   const record=await page.evaluate(key=>chrome.storage.local.get(key),UPDATE_KEY);assert.deepEqual(Object.keys(record[UPDATE_KEY]).sort(),['at','fromVersion','state','toVersion']);
   assert.equal(record[UPDATE_KEY].state,'available');assert.equal(record[UPDATE_KEY].fromVersion,version);assert.equal(record[UPDATE_KEY].toVersion,target);assert.ok(Number.isSafeInteger(record[UPDATE_KEY].at));
   assert.equal((await rpc(page,'PAIA_SETTINGS_UPDATE_STATUS')).targetVersion,target);
  });
  await check('unknown, throttled, missing, malformed, equal and older versions never claim availability or install',async()=>{
   const baseline=await page.evaluate(key=>chrome.storage.local.get(key),UPDATE_KEY);
   for(const [response,details]of [['unknown'],['throttled'],['update_available'],['update_available',{version:'private invalid version'}],['update_available',{version}],['update_available',{version:'0.0.0'}],['update_available',{version:'999999.0'}],['update_available',{version:'0.043.19'}]]){
    const count=(await fixture()).calls;await button.click();assert.equal((await fixture()).calls,count+1);await finish(response,details);await idle();
    assert.equal(await button.textContent(),'Retry check');assert.equal(await status.textContent(),'This update check could not be confirmed. Keep the current installation and local data; retry manually later. This does not mean an update was installed.');assert.doesNotMatch(await status.textContent(),/private invalid|latest|GitHub/);assert.equal((await status.textContent()).includes(target),false);
    assert.deepEqual(await page.evaluate(key=>chrome.storage.local.get(key),UPDATE_KEY),baseline,'unqualified callback never rewrites the original event');
   }
  });
  await check('a genuinely held check retains its control focus across native disabled rendering',async()=>{
   await button.click();assert.equal(await button.isDisabled(),true);assert.equal((await fixture()).pending,1);
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   await page.evaluate(()=>__settingsUpdateFixture.focusMark('held-after-render'));
   await finish('no_update');await idle();
   try{assert.equal(await button.evaluate(node=>document.activeElement===node),true,'completed held check preserves the genuine control focus');}catch(error){try{console.error('SETTINGS_HELD_FOCUS_FAILURE',JSON.stringify(await page.evaluate(()=>__settingsUpdateFixture.focus)));}catch{}throw error;}
  });
  await check('a later trusted Tab intent keeps its actual destination when the check completes',async()=>{
   await button.click();assert.equal((await fixture()).pending,1);await page.keyboard.press('Tab');
   await page.evaluate(()=>{__settingsUpdateFixture.focusDestination=document.activeElement;});assert.equal(await button.evaluate(node=>document.activeElement===node),false);
   await finish('no_update');await idle();assert.equal(await page.evaluate(()=>document.activeElement===__settingsUpdateFixture.focusDestination),true,"completion cannot reclaim focus from the user's Tab destination");
  });
  await check('leaving About while checking cannot move focus back to its hidden control',async()=>{
   await button.click();await chooseConsumerGroup(page,'reading');await page.evaluate(()=>{__settingsUpdateFixture.focusDestination=document.activeElement;});
   assert.equal(await button.isVisible(),false);await finish('no_update');await eventually(async()=>(await fixture()).pending===0);await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)));
   assert.equal(await page.evaluate(()=>document.activeElement===__settingsUpdateFixture.focusDestination),true,'completion cannot reclaim focus after leaving About');assert.equal(await button.evaluate(node=>document.activeElement===node),false);
   await chooseConsumerGroup(page,'about');await idle();
  });
  await check('failed status read keeps a truthful error and reopening About performs one real retry without update dispatch',async()=>{
   await chooseConsumerGroup(page,'reading');await page.evaluate(()=>{__settingsUpdateFixture.failNext=true;});const count=(await fixture()).calls;
   await chooseConsumerGroup(page,'about');await idle();assert.equal((await fixture()).failures,1);assert.equal(await status.textContent(),'Could not read update status. Reopen About PAIA to retry.');
   await chooseConsumerGroup(page,'reading');await chooseConsumerGroup(page,'about');await idle();
   assert.equal((await fixture()).calls,count);assert.equal(await status.textContent(),`Chrome reported version ${target} available. You can keep working.`);
   assert.ok((await fixture()).completed>0,'retry consumed an actual worker status reply');
  });
  await check('a completed old worker read released after the explicit check cannot overwrite its newer result',async()=>{
   await chooseConsumerGroup(page,'reading');await page.evaluate(({key,version})=>chrome.storage.local.set({[key]:{state:'installed',fromVersion:null,toVersion:version,at:Date.now()}}),{key:UPDATE_KEY,version});
   await page.evaluate(()=>{__settingsUpdateFixture.holdNext=true;});await chooseConsumerGroup(page,'about');await eventually(async()=>(await fixture()).held,'original completed status read is held');
   const old=await page.evaluate(()=>__settingsUpdateFixture.held.reply);assert.equal(old.ok,true);assert.equal(old.data.version,version);assert.equal(old.data.state,'installed');
   await button.click();await finish('no_update');await idle();const outcome=await status.textContent();assert.equal(outcome,'This installation source currently has no pending update.');
   await page.evaluate(()=>__settingsUpdateFixture.held.release());await eventually(async()=>!(await fixture()).held,'old completed reply delivered exactly once');
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));assert.equal(await status.textContent(),outcome);assert.equal(await button.isEnabled(),true);
  });
  await check('failed Settings read retains a reachable retry in compact groups and the directory',async()=>{
   const retryPage=await h.context.newPage();
   try{
    await retryPage.setViewportSize({width:1280,height:900});
    await retryPage.goto(page.url());await retryPage.locator('.sidebar-bottom [data-view="settings"]').click();
    await retryPage.locator('#settings-panel').waitFor({state:'visible'});await chooseConsumerGroup(retryPage,'content');
    await retryPage.evaluate(()=>{
     const send=chrome.runtime.sendMessage.bind(chrome.runtime);
     globalThis.__settingsRetry={reads:0,writes:0,fail:true};
     chrome.runtime.sendMessage=message=>{
      if(['UPDATE_PREFERENCES','SET_ENABLED','CONSENT'].includes(message?.type))__settingsRetry.writes++;
      if(message?.type==='GET_PAGE'&&message.page?.view==='settings'){
       __settingsRetry.reads++;if(__settingsRetry.fail)return Promise.resolve({ok:false,error:'STORAGE_FAILED'});
      }
      return send(message);
     };
    });
    // Deliver the original worker-to-page refresh event after actual entry.
    // Only this page's subsequent read is unavailable; no policy is written.
    const worker=h.context.serviceWorkers().find(w=>w.url().endsWith('/background/service-worker.js'));
    await worker.evaluate(()=>chrome.runtime.sendMessage({type:'PAIA_READER_POLICY_CHANGED'}).catch(()=>{}));
    const retry=retryPage.locator('#settings-read-retry'),feedback=retryPage.locator('#ux-settings-feedback');
    await eventually(()=>feedback.getAttribute('data-kind').then(kind=>kind==='error'),'original Settings load fails truthfully');
    await retryPage.setViewportSize({width:320,height:900});
    assert.equal(await feedback.isVisible(),true);assert.equal(await retry.isVisible(),true,'retry follows the visible error outside the hidden desktop header');
    assert.equal(await retry.getAttribute('aria-describedby'),'ux-settings-feedback');
    await retry.evaluate(node=>{globalThis.__retryNode=node;});
    await retryPage.locator('#ux-settings-group-back').click();assert.equal(await retry.isVisible(),true,'directory retains the same retry');
    await chooseConsumerGroup(retryPage,'reading');assert.equal(await retry.isVisible(),true);assert.equal(await retry.evaluate(node=>node===__retryNode),true);
    await retryPage.screenshot({path:join(screenDir,variant+'-compact-recovery.png')});
    const before=await retryPage.evaluate(()=>{__settingsRetry.fail=false;return __settingsRetry.reads;});await retry.click();
    await eventually(()=>retry.isHidden(),'real retry consumes the original confirmed Settings reply');
    assert.equal(await retryPage.evaluate(()=>__settingsRetry.reads),before+1);assert.equal(await retryPage.evaluate(()=>__settingsRetry.writes),0);
    assert.equal(await feedback.getAttribute('data-kind'),'status');assert.equal(await retryPage.locator('#ux-font-size').isEnabled(),true);
   }finally{await retryPage.close();}
  });
  await check('genuine Settings Next consent and capture pause/resume retain independent manual work and composer draft',async()=>{
   // Separate owned context: the seven original About/recovery cases and their
   // complete control/record equality below remain unchanged.
   const controlPaths=['ui/settings-next.js','ui/settings-next-state.js','ui/settings-local-state.js','ui/settings-preferences.js','background/prompt-next.js'];
   const controlHashes=async base=>Object.fromEntries(await Promise.all(controlPaths.map(async path=>[path,sha(await readFile(join(base,path)))])));
   const controlsBefore=await controlHashes(root);assert.deepEqual(await controlHashes(extensionPath),controlsBefore);
   let controls;
   try{
    controls=await FakeChatGPT.start({extensionPath,onboarding:true,launchThroughPort:true,headless:true});
    const settings=controls.archive;
    const cdp=await controls.context.newCDPSession(settings),{windowId}=await cdp.send('Browser.getWindowForTarget');
    await cdp.send('Browser.setWindowBounds',{windowId,bounds:{width:1280,height:900}});
    const {bounds}=await cdp.send('Browser.getWindowBounds',{windowId});assert.equal(bounds.width,1280);assert.equal(bounds.height,900);await cdp.detach();await settings.setViewportSize({width:1280,height:900});
    await eventually(()=>settings.locator('#onboarding-start').isVisible().then(async visible=>visible||await settings.locator('#consent-check').isVisible()),'independent original onboarding is ready');
    if(await settings.locator('#onboarding-start').isVisible())await settings.locator('#onboarding-start').click();
    await settings.locator('#consent-check').waitFor({state:'visible'});await settings.locator('#consent-check').check();await settings.locator('#enable-consent').click();
    await eventually(async()=>(await rpc(settings,'GET_STATUS')).consented===true,'independent informed capture consent is confirmed');
    await rpc(settings,'UPDATE_PREFERENCES',{changes:{language:'en'}});await eventually(()=>settings.evaluate(()=>document.documentElement.lang==='en'));
    // Create the independent manual Prompt before starting the owned capture producer.
    // Its real revision CAS remains strict; later capture and controls must preserve it.
    const query=await rpc(settings,'PAIA_PROMPT_QUERY'),manualText='SYNTHETIC S4 independent manual Prompt';
    const authored=await rpc(settings,'PAIA_PROMPT_CHANGE',{change:{action:'create',revision:query.revision,text:manualText}});
    const createdPrompt=await rpc(settings,'PAIA_PROMPT_QUERY',{includeHidden:true}),manual=createdPrompt.items.find(item=>item.id===authored.id);let promptBefore,lastPromptGeneration;
    assert.equal(manual.text,manualText);assert.equal(manual.edited,true);assert.deepEqual(manual.members,[]);
    const source={id:'s4-e04-manual-source',title:'SYNTHETIC S4 retained manual work',base:1609459200,messages:[{id:'s4-e04-source-input',text:'SYNTHETIC S4 original source expression'}]};
    const host=await controls.open(source,{arrival:'dom-first'});
    await eventually(async()=>{const state=await controls.state(),record=state.records.find(row=>row.originalText===source.messages[0].text);return !!record&&state.library.blocks.some(block=>block.originalTextReference===record.id);},'original capture creates the real paired Source/Input');
    const captured=await controls.state(),record=captured.records.find(row=>row.originalText===source.messages[0].text),block=captured.library.blocks.find(block=>block.originalTextReference===record.id);
    assert.ok(block,'Input retains the original captured Source relation');
    const first=await rpc(settings,'GET_INPUT',{id:block.id}),manualBody='SYNTHETIC S4 independently authored Working body';
    await rpc(settings,'EDIT_DOCUMENT',{edit:{operationId:crypto.randomUUID(),documentId:first.documentId,blocks:[{id:first.id,expectedRevision:first.revision,libraryText:manualBody,note:first.note,excluded:false}]}});
    const inputBefore=await rpc(settings,'GET_INPUT',{id:first.id});assert.equal(inputBefore.libraryText,manualBody);
    const recordsBeforePause=(await controls.state()).records;
    await host.locator('textarea').fill('SYNTHETIC independent unsent composer draft');
    await host.locator('textarea').evaluate(node=>{globalThis.__s4Composer=node;node.setSelectionRange(10,21);globalThis.__s4NoSend=0;document.addEventListener('submit',()=>__s4NoSend++,true);node.addEventListener('keydown',event=>{if(event.key==='Enter')__s4NoSend++;});});
    const composer=()=>host.locator('textarea').evaluate(node=>({same:node===__s4Composer,value:node.value,start:node.selectionStart,end:node.selectionEnd,send:__s4NoSend}));
    const composerBefore=await composer();assert.equal(composerBefore.same,true);assert.equal(composerBefore.send,0);
    await settings.evaluate(()=>{
     const original=chrome.runtime.sendMessage.bind(chrome.runtime);globalThis.__s4Controls={original,next:[],capture:[],clicks:[]};
     chrome.runtime.sendMessage=async(message,...args)=>{if(message?.type==='PAIA_PROMPT_NEXT_CONFIGURE')__s4Controls.next.push(message.enabled);if(message?.type==='SET_ENABLED')__s4Controls.capture.push(message.enabled);return original(message,...args);};
     document.addEventListener('click',event=>{const id=event.target.closest?.('#settings-next-enabled,#settings-next-cancel,#settings-next-confirm,#toggle-capture')?.id;if(id)__s4Controls.clicks.push({id,trusted:event.isTrusted});},true);
    });
    await settings.locator('.sidebar-bottom [data-view="settings"]').click();await settings.locator('#settings-panel').waitFor({state:'visible'});await chooseConsumerGroup(settings,'ai');
    const next=settings.locator('#settings-next-enabled'),dialog=settings.locator('#settings-next-consent');
    await eventually(()=>next.isEnabled(),'actual Settings Next owner is ready');assert.equal(await next.isChecked(),false);assert.equal((await rpc(settings,'PAIA_PROMPT_NEXT_STATUS')).enabled,false);
    assert.equal(await settings.locator('#settings-next-explanation').textContent(),'Off by default, for this browser session only; independent of capture pause.');
    await next.click();await dialog.waitFor({state:'visible'});assert.equal((await rpc(settings,'PAIA_PROMPT_NEXT_STATUS')).enabled,false);await settings.locator('#settings-next-cancel').click();await dialog.waitFor({state:'hidden'});
    assert.equal((await rpc(settings,'PAIA_PROMPT_NEXT_STATUS')).enabled,false);assert.deepEqual(await settings.evaluate(()=>__s4Controls.next),[],'cancel makes no authorization write');
    await next.click();await dialog.waitFor({state:'visible'});assert.match(await dialog.textContent(),/only the current AI reply completed after enabling/);await settings.locator('#settings-next-confirm').click();
    await eventually(async()=>await next.isChecked()&&await next.isEnabled(),'genuine informed Settings confirmation completes');
    const authorization=await rpc(settings,'PAIA_PROMPT_NEXT_STATUS');assert.equal(authorization.enabled,true);assert.equal(typeof authorization.generation,'string');assert.deepEqual(await settings.evaluate(()=>__s4Controls.next),[true]);
    const retained=async()=>{
     assert.deepEqual(await rpc(settings,'GET_INPUT',{id:first.id}),inputBefore,'capture control cannot overwrite manual Working body/revision');
     assert.deepEqual((await controls.state()).records,recordsBeforePause,'pause/resume keeps every original Source record');
     const current=await rpc(settings,'PAIA_PROMPT_QUERY',{includeHidden:true});
     // This is the original whole-dataset backup freshness fence, not the
     // manual preferences revision. SET_ENABLED wakes original maintenance;
     // backup-allowed writes may advance it while all manual work stays exact.
     const {generation,...work}=current,{generation:baselineGeneration,...baselineWork}=promptBefore;
     assert.ok(Number.isSafeInteger(generation)&&generation>=lastPromptGeneration&&generation>=baselineGeneration,'original query freshness generation is valid and never goes backward');lastPromptGeneration=generation;
     assert.deepEqual(work,baselineWork,'all other original Prompt query fields, including manual identity/body/order/revision, remain exact');
     assert.deepEqual(await composer(),composerBefore,'independent host draft/selection/node remain; no sending');
    };
    await chooseConsumerGroup(settings,'content');
    assert.equal(await settings.getByText('Currently supports ChatGPT. Temporary Chat is skipped. Pausing keeps saved inputs; resuming can save eligible inputs already visible on the page.',{exact:true}).isVisible(),true,'original honest backfill explanation remains reachable');
    const capture=settings.locator('#toggle-capture');await eventually(()=>capture.isEnabled());assert.equal(await capture.getAttribute('aria-checked'),'true');
    // Settings initializes its original filter consumers before the control
    // experiment. Their lawful writes can advance global backup generation.
    await rpc(settings,'FILTER_STATUS');promptBefore=await rpc(settings,'PAIA_PROMPT_QUERY',{includeHidden:true});
    assert.ok(Number.isSafeInteger(promptBefore.generation)&&promptBefore.generation>=createdPrompt.generation);lastPromptGeneration=promptBefore.generation;
    assert.deepEqual(promptBefore.items,createdPrompt.items);assert.deepEqual(promptBefore.manualOrder,createdPrompt.manualOrder);assert.equal(promptBefore.revision,createdPrompt.revision);
    await capture.click();await eventually(async()=>await capture.isEnabled()&&await capture.getAttribute('aria-checked')==='false'&&(await rpc(settings,'GET_STATUS')).enabled===false,'original Settings pause ACK and rendering complete');
    assert.deepEqual(await rpc(settings,'PAIA_PROMPT_NEXT_STATUS'),authorization,'pause never revokes or rotates the independent Next authorization');await retained();
    await capture.click();await eventually(async()=>await capture.isEnabled()&&await capture.getAttribute('aria-checked')==='true'&&(await rpc(settings,'GET_STATUS')).enabled===true,'original Settings resume ACK and rendering complete');
    assert.deepEqual(await rpc(settings,'PAIA_PROMPT_NEXT_STATUS'),authorization,'resume never enables a new Next authorization');await retained();
    assert.deepEqual(await settings.evaluate(()=>__s4Controls.capture),[false,true],'one trusted pause and resume consume original SET_ENABLED exactly once each');assert.deepEqual(await settings.evaluate(()=>__s4Controls.next),[true],'capture does not route through Next configure');
    await chooseConsumerGroup(settings,'ai');await eventually(()=>next.isEnabled());assert.equal(await next.isChecked(),true);await next.click();await eventually(async()=>!await next.isChecked()&&await next.isEnabled(),'genuine Settings revocation completes');
    const revoked=await rpc(settings,'PAIA_PROMPT_NEXT_STATUS');assert.equal(revoked.enabled,false);assert.notEqual(revoked.generation,authorization.generation);assert.deepEqual(await settings.evaluate(()=>__s4Controls.next),[true,false]);assert.equal((await rpc(settings,'GET_STATUS')).enabled,true);await retained();
    const clicks=await settings.evaluate(()=>__s4Controls.clicks);assert.equal(clicks.filter(row=>row.id==='toggle-capture').length,2);assert.ok(clicks.every(row=>row.trusted));
    assert.equal(controls.extensionNetworkRequests,0);assert.equal(controls.externalRequests,0);assert.deepEqual(controls.deepSeekRequests,[]);assert.deepEqual(controls.errors,[]);
    assert.deepEqual(await controlHashes(root),controlsBefore);assert.deepEqual(await controlHashes(extensionPath),controlsBefore);
   }finally{if(controls){try{await controls.archive.evaluate(()=>{if(globalThis.__s4Controls)chrome.runtime.sendMessage=__s4Controls.original;});}finally{await controls.close();}}}
  });
  const observed=await fixture();assert.equal(observed.pending,0);assert.ok(observed.clicks.length>0);assert.ok(observed.clicks.every(event=>event.trusted),'all update button activations are genuine trusted browser events');
  assert.deepEqual(await page.evaluate(()=>chrome.storage.local.get('personalAIArchive')),controlBefore,'checks do not alter consent, pause, Next, display or authority control');
  assert.deepEqual((await h.state()).records,recordsBefore);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);
  assert.deepEqual(await hashes(root),sourceHashes);assert.deepEqual(await hashes(extensionPath),sourceHashes);
  const receipt={head,tree,testHash,variant,result:'PASS',evidence:'SYNTHETIC_BROWSER_SDK_CALLBACKS_ACTUAL_SETTINGS_WORKER_STORAGE',scope:'S4 Settings update replacement component',fullS4:false,popupCutover:false,installed:false,onlineUpdate:false,hashes:sourceHashes,cases,calls:observed.calls,completedStatusReads:observed.completed,network:{extension:0,external:0}};
  const out=join(root,'work/nib-v4-settings-entry');await mkdir(out,{recursive:true});await writeFile(join(out,variant+'-receipt.json'),JSON.stringify(receipt,null,2)+'\n');
 }finally{
  if(h){try{await h.archive.evaluate(()=>globalThis.__settingsUpdateFixture?.restore());}finally{await h.close();}}
 }
});

// Development evidence only: unchanged production Source, synthetic host/data.
// Run only in the existing GitHub cloud entry. No local Chrome, provider or acceptance run.
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {FakeChatGPT,eventually} from '../tests/harness/fake-chatgpt.mjs';
import {routeComposer} from '../tests/harness/prompt-composer.mjs';
import {readAssistServiceConfiguration} from '../core/ai-usage/assist-service-configuration.js';

assert.equal(process.env.GITHUB_ACTIONS,'true','Native smoke is restricted to GitHub Actions.');
assert.equal(process.env.GITHUB_REF,'refs/heads/evidence/assist-development-20261018','Use the scoped development branch.');
assert.equal(process.env.PLAYWRIGHT_MODULE,'playwright','Use the existing locked repository browser dependency.');
assert.ok(process.env.CHROME_PATH,'Use the existing hosted Chrome.');
assert.equal(readAssistServiceConfiguration(),null,'The packaged Assist service must remain unconfigured.');
const root=fileURLToPath(new URL('..',import.meta.url)),out=join(root,'work/assist-development');
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
const sha=git('rev-parse','HEAD'),tree=git('rev-parse','HEAD^{tree}');
assert.equal(sha,process.env.GITHUB_SHA,'The receipt must identify the exact checked-out workflow head.');
assert.equal(git('status','--porcelain','--untracked-files=all','--','manifest.json','background','content','core','ui'),'','Source runtime must be clean.');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),runtimeSha256={},evidenceSha256={};
const runtimeFiles=git('ls-files','--','manifest.json','background','content','core','ui').split('\n').filter(file=>/\.(?:js|mjs|css|html|svg|json)$/.test(file));
for(const file of runtimeFiles)runtimeSha256[file]=hash(await readFile(join(root,file)));
for(const file of ['scripts/capture-assist-development.mjs','tests/harness/fake-chatgpt.mjs','tests/harness/prompt-composer.mjs'])evidenceSha256[file]=hash(await readFile(join(root,file)));
await mkdir(out,{recursive:true});
const prompt='Give me a concrete example.';
const receipt={sha,tree,runId:process.env.GITHUB_RUN_ID,attempt:process.env.GITHUB_RUN_ATTEMPT,variant:'source',evidence:'SOURCE_SYNTHETIC_NATIVE_DEVELOPMENT',syntheticDataOnly:true,bodyFreeReceipt:true,runtimeSha256,evidenceSha256,syntheticPromptSha256:hash(prompt),native:'NOT_RUN',fullCertification:'NOT_RUN',releaseParity:'NOT_RUN',realSite:'NOT_RUN',liveProvider:'NOT_RUN',humanVisualAcceptance:'NOT_RUN',animationAcceptance:'NOT_RUN',screens:[]};
const until=(fn,label)=>eventually(fn,label,8000);
const rpc=async(page,type,fields={})=>{const r=await page.evaluate(message=>chrome.runtime.sendMessage(message),{type,...fields});assert.equal(r.ok,true,`${type} must be acknowledged`);return r.data;};
const settle=async frame=>{await frame.evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)));await until(()=>frame.evaluate(()=>!document.documentElement.hasAttribute('data-layout-pending')),'original layout settles');};
const clickFrame=async(frame,target)=>{
 await target.scrollIntoViewIfNeeded();await settle(frame);
 const hit=await target.evaluate(node=>{const r=node.getBoundingClientRect(),at=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return at===node||node.contains(at);});
 assert.equal(hit,true,'the visible original button owns its native center hit');await target.click();
};
const frames=page=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
const network=h=>({external:h.externalRequests,provider:h.deepSeekRequests.length,extension:h.extensionNetworkRequests,history:h.historyRequests});
const assertZeroNetwork=h=>assert.deepEqual(network(h),{external:0,provider:0,extension:0,history:0});
const assertOff=value=>{assert.equal(value.replyAccess,false);assert.equal(value.remoteProcessing,false);assert.equal(value.serviceAvailable,false);};
// Pure evidence guard, exercised directly by the companion deterministic tests.
// The install owner can write a disabled record; neither absence nor status alone
// proves no grant. Keep the validated record private for exact baseline comparison.
function inspectAssistAuthorizationStorage({session,local}){
 const key='promptAssistAuthorizationV1',automaticKey='promptAssistAutomaticPreferenceV2',fail=()=>{throw Error('INVALID_ASSIST_AUTHORIZATION_STORAGE');};
 const plain=value=>value!==null&&typeof value==='object'&&[Object.prototype,null].includes(Object.getPrototypeOf(value));
 // This historical manual capture certifies absent durable permissions only.
 // Any automatic preference, even malformed or disabled, is outside that proof.
 if(!plain(session)||!plain(local)||Object.hasOwn(local,key)||Object.hasOwn(local,automaticKey)||Object.hasOwn(session,automaticKey))fail();
 if(!Object.hasOwn(session,key))return {sessionPresent:false,localPresent:false,record:null};
 const entry=Object.getOwnPropertyDescriptor(session,key);if(!Object.hasOwn(entry,'value')||!entry.enumerable)fail();
 const value=entry.value,fields=['version','replyAccess','remoteProcessing','generation'];
 if(!plain(value)||Reflect.ownKeys(value).length!==fields.length||Reflect.ownKeys(value).some(field=>!fields.includes(field)))fail();
 const descriptors=Object.getOwnPropertyDescriptors(value);
 if(fields.some(field=>!Object.hasOwn(descriptors[field],'value')||!descriptors[field].enumerable))fail();
 if(value.version!==1||value.replyAccess!==false||value.remoteProcessing!==false||typeof value.generation!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value.generation))fail();
 return {sessionPresent:true,localPresent:false,record:{version:value.version,replyAccess:value.replyAccess,remoteProcessing:value.remoteProcessing,generation:value.generation}};
}
const authorizationStorage=async page=>inspectAssistAuthorizationStorage(await page.evaluate(async()=>{
 const keys=['promptAssistAuthorizationV1','promptAssistAutomaticPreferenceV2'];return {session:await chrome.storage.session.get(keys),local:await chrome.storage.local.get(keys)};
}));
const assertAuthorizationUnchanged=(actual,baseline)=>assert.equal(isDeepStrictEqual(actual,baseline),true,'original authorization storage must remain exactly unchanged');

const screenshot=async(page,filename,observation)=>{
 await frames(page);await page.screenshot({path:join(out,filename),animations:'disabled',caret:'hide'});
 receipt.screens.push({filename,sha256:hash(await readFile(join(out,filename))),viewport:page.viewportSize(),dpr:await page.evaluate(()=>devicePixelRatio),...observation});
 console.log('CAPTURE',filename);
};
let h,page,phase='start';
try{
 h=await FakeChatGPT.start({extensionPath:root,headless:true,launchThroughPort:true});
 h.context.setDefaultTimeout(8000);h.context.setDefaultNavigationTimeout(8000);
 receipt.native='RUNNING';receipt.browser=h.context.browser().version();
 phase='synthetic-local-consent';
 await h.archive.locator('#enable-consent').click();
 await until(async()=>{const s=await h.state();return s.settings?.consentVersion===1&&s.settings?.enabled===true;},'original synthetic local-saving consent settles');
 await rpc(h.archive,'UPDATE_PREFERENCES',{changes:{language:'en'}});
 await until(()=>h.archive.locator('html').getAttribute('lang').then(value=>value==='en'),'original language preference applied');
 const before=await rpc(h.archive,'PAIA_PROMPT_ASSIST_STATUS');assertOff(before);
 const authorizationBefore=await authorizationStorage(h.archive);
 receipt.authorizationBaseline={sessionRecord:authorizationBefore.sessionPresent?'PREEXISTING_DISABLED':'ABSENT',localRecordPresent:false};
 const nextBefore=await rpc(h.archive,'PAIA_PROMPT_NEXT_STATUS');assert.equal(nextBefore.enabled,false);
 phase='seed-one-local-prompt';
 const engineering=await h.context.newPage();await engineering.goto('chrome-extension://'+h.extensionId+'/ui/prompt-reuse-test.html');
 let query=await rpc(engineering,'PAIA_PROMPT_QUERY');
 const {id}=await rpc(engineering,'PAIA_PROMPT_CHANGE',{change:{action:'create',text:prompt,revision:query.revision}});
 query=await rpc(engineering,'PAIA_PROMPT_QUERY');await rpc(engineering,'PAIA_PROMPT_CHANGE',{change:{action:'pin',id,revision:query.revision}});
 await routeComposer(h.context,root);
 page=await h.context.newPage();page.on('pageerror',error=>h.errors.push(error.message));
 await page.setViewportSize({width:960,height:720});await page.emulateMedia({colorScheme:'light',reducedMotion:'reduce'});
 await page.goto('https://chatgpt.com/c/prompt-insertion-fixture');await page.waitForFunction(()=>!!globalThis.fixture?.view);
 // Only synthetic host styling. Never patch extension DOM, CSS, handlers, service or Store.
 await page.evaluate(()=>{fixture.set('');document.getElementById('send').textContent='↑';document.getElementById('blur').textContent='';});
 await page.addStyleTag({content:'html{color-scheme:light}body{margin:0;background:#f8f9fb;color:#1f2937;font:16px/24px system-ui,sans-serif}form{position:fixed;left:120px;right:120px;bottom:24px;height:80px;border:1px solid #dce0e5;border-radius:24px;background:#fff;box-sizing:border-box}#mount{position:absolute;left:22px;top:18px;right:60px}.ProseMirror{outline:0;min-height:24px}.ProseMirror p{margin:0}.ProseMirror p:has(br:only-child):before{content:"Message AI…";opacity:.48;pointer-events:none}#send{position:absolute;right:14px;bottom:14px;width:34px;height:34px;border:0;border-radius:50%;background:#222;color:#fff}#blur{position:fixed;left:0;top:0;width:1px;height:1px;opacity:0}'});
 const orb=page.locator('[data-paia-prompt-surface]');await orb.waitFor({state:'visible'});
 await until(()=>orb.getAttribute('data-surface-form').then(value=>value==='orb'),'actual R3 collapsed circle');
 const anchor=await orb.boundingBox();assert.equal(anchor.width,48);assert.equal(anchor.height,48);
 phase='more-explicit-assist';
 await orb.click();await until(()=>page.frames().some(frame=>frame.url().includes('prompt-surface.html#')),'actual private Source frame');
 const frame=page.frames().find(frame=>frame.url().includes('prompt-surface.html#'));
 const saved=frame.locator('.row').filter({has:frame.locator('.text').filter({hasText:prompt})});
 await until(()=>saved.count().then(count=>count===1),'one known synthetic prompt is available');
 await until(()=>frame.locator('#refresh').isEnabled(),'original list ready');
 await settle(frame);const restingShell=await(await frame.frameElement()).boundingBox();
 assert.equal(restingShell.width,336);assert.equal(restingShell.height,328);
 const assertAnchor=async()=>{assert.deepEqual(await orb.boundingBox(),anchor,'the original 48px entry rectangle never moves');assert.equal(await page.evaluate(r=>document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.matches('[data-paia-prompt-surface]'),anchor),true,'the fixed entry still owns its native hit');};
 await assertAnchor();
 await clickFrame(frame,frame.locator('#surface-more'));
 assert.equal(await frame.locator('#surface-more').getAttribute('aria-expanded'),'true');await assertAnchor();
 const explicit=frame.locator('#prompt-assist-open');assert.equal(await explicit.textContent(),'Current AI suggestion');assert.equal(await explicit.isVisible(),true);
 await clickFrame(frame,explicit);
 await until(()=>frame.locator('#status').textContent().then(text=>text==='AI suggestions are unavailable. Saved prompts remain available.'),'genuine default-null unavailable explanation');
 assert.equal(await frame.locator('#status').isVisible(),true);assert.equal(await frame.locator('#status').getAttribute('data-quiet'),'false');
 assert.equal(await frame.locator('#surface-more').getAttribute('aria-expanded'),'false');
 assert.equal(await frame.locator('#prompt-assist-insert').count(),0,'no fabricated remote suggestion');
 assert.equal(await saved.locator('.insert').isEnabled(),true);assert.equal(await saved.locator('.insert').isVisible(),true);
 assert.equal(await orb.getAttribute('data-surface-form'),'board');await assertAnchor();
 await settle(frame);const shell=await(await frame.frameElement()).boundingBox();
 assert.equal(shell.width,restingShell.width);assert.ok(shell.height>=restingShell.height,'status uses the original bounded flow');assert.equal(shell.x+shell.width,anchor.x+anchor.width);assert.equal(shell.y+shell.height,anchor.y+anchor.height);assert.ok(shell.x>=0&&shell.y>=0&&shell.x+shell.width<=960&&shell.y+shell.height<=720);
 assert.equal(isDeepStrictEqual(await rpc(h.archive,'PAIA_PROMPT_ASSIST_STATUS'),before),true,'explicit unavailable action cannot grant either permission');
 assertAuthorizationUnchanged(await authorizationStorage(h.archive),authorizationBefore);assertZeroNetwork(h);
 await screenshot(page,'source-more-assist-unavailable.png',{state:'MORE_ACTION_TO_ASSIST_UNAVAILABLE',savedPromptUsable:true,anchor,shell});
 phase='saved-prompt-insertion';
 await page.locator('#prompt-textarea').focus();await clickFrame(frame,saved.locator('.insert'));
 await until(()=>page.evaluate(text=>fixture.text()===text&&!!document.activeElement?.closest('#mount'),prompt),'actual saved prompt fills the host composer and restores focus');
 assert.equal(await page.evaluate(()=>fixture.send),0);assert.equal(await page.evaluate(()=>fixture.enter),0);
 assert.equal(await orb.getAttribute('data-surface-form'),'board');await assertAnchor();
 receipt.geometry={anchor,restingShell,unavailableShell:shell,fixedEntryAcrossMoreUnavailableInsertion:true};
 receipt.insertion={source:'SAVED_LOCAL_PROMPT',exactSyntheticTextVerified:true,sendCount:0,enterCount:0,focus:'HOST_COMPOSER',boardRemainsOpen:true};
 phase='archive-settings-permissions';
 const settings=h.archive;await settings.bringToFront();await settings.setViewportSize({width:960,height:720});await settings.emulateMedia({colorScheme:'light',reducedMotion:'reduce'});
 await settings.locator('.sidebar-bottom [data-view="settings"]').click();await settings.locator('#settings-panel').waitFor({state:'visible'});
 const aiGroup=settings.locator('[data-settings-group="ai"]'),groupBack=settings.locator('#ux-settings-group-back');
 if(!await aiGroup.isVisible()&&await groupBack.isVisible())await groupBack.click();
 await aiGroup.click();await settings.locator('[data-group="ai"]').waitFor({state:'visible'});
 const section=settings.locator('#settings-assist'),reply=settings.locator('#settings-assist-replyAccess'),remote=settings.locator('#settings-assist-remoteProcessing');
 await until(async()=>await reply.getAttribute('data-loaded')==='true'&&await remote.getAttribute('data-loaded')==='true','both separate original controls loaded');
 await frames(settings);await section.scrollIntoViewIfNeeded();await frames(settings);
 assert.equal(await section.locator('input[role="switch"]').count(),2);
 for(const control of [reply,remote]){assert.equal(await control.isChecked(),false);assert.equal(await control.isEnabled(),true);assert.equal(await control.isVisible(),true);}
 assert.equal(await settings.locator('#settings-assist-replyAccess-name').textContent(),'Read the current reply');
 assert.equal(await settings.locator('#settings-assist-remoteProcessing-name').textContent(),'Current AI suggestion');
 assert.notEqual(await reply.getAttribute('aria-describedby'),await remote.getAttribute('aria-describedby'));
 assert.equal(await settings.locator('#settings-assist-status').textContent(),'AI service is not configured. Saved prompts and local suggestions remain available.');
 assert.equal(await settings.locator('#settings-assist-consent').isVisible(),false,'opening Settings must not open an authorization action');
 const after=await rpc(settings,'PAIA_PROMPT_ASSIST_STATUS');assertOff(after);assert.equal(isDeepStrictEqual(after,before),true,'opening Settings cannot grant or rotate permissions');
 assertAuthorizationUnchanged(await authorizationStorage(settings),authorizationBefore);
 assert.deepEqual(await rpc(settings,'PAIA_PROMPT_NEXT_STATUS'),nextBefore,'independent local Next remains off and unchanged');
 const controls=await section.locator('input[role="switch"]').evaluateAll(nodes=>nodes.map(node=>{const r=node.labels[0].getBoundingClientRect();return{id:node.id,checked:node.checked,x:r.x,y:r.y,width:r.width,height:r.height};}));
 assert.ok(controls.every(r=>r.x>=0&&r.y>=0&&r.x+r.width<=960&&r.y+r.height<=720),'both real permission labels fit the screenshot');
 receipt.authorization={replyAccess:false,remoteProcessing:false,serviceAvailable:false,openingSettingsChangedAuthorization:false,sessionRecord:authorizationBefore.sessionPresent?'PREEXISTING_DISABLED':'ABSENT',sessionRecordCreatedByActions:false,sessionRecordUnchanged:true,localRecordPresent:false,nextUnchanged:true,controls};
 await screenshot(settings,'source-settings-assist-consents.png',{state:'ORIGINAL_SETTINGS_AI_GROUP',controls});
 phase='final-original-boundaries';
 assert.equal(await page.evaluate(()=>fixture.send),0);assert.equal(await page.evaluate(()=>fixture.enter),0);
 assert.deepEqual(h.errors,[]);assertZeroNetwork(h);receipt.network=network(h);
 assert.equal(receipt.screens.length,2);receipt.native='PASS';
}catch(error){
 receipt.native='FAIL';receipt.failure={phase,name:error.name};
 // No raw page/worker/storage/body dumps or extra screenshots in this receipt.
 console.error('ASSIST_SOURCE_DEVELOPMENT_FAILED',phase,error.name);throw error;
}finally{
 if(h)receipt.network=network(h);
 let cleanupFailure;try{if(h)await h.close();}catch(error){cleanupFailure=error;receipt.native='FAIL';receipt.failure={phase:'harness-cleanup',name:error.name};}
 await writeFile(join(out,'source.json'),JSON.stringify(receipt,null,2)+'\n');
 if(cleanupFailure)throw cleanupFailure;
}
console.log('ASSIST_SOURCE_DEVELOPMENT_PASS',sha);

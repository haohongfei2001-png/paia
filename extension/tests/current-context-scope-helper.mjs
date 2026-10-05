import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {FakeChatGPT,eventually} from './harness/fake-chatgpt.mjs';

const downloadCounts=new WeakMap();

const rpc=async(page,type,fields={})=>{
 const result=await page.evaluate(message=>chrome.runtime.sendMessage(message),{type,...fields});
 assert.equal(result.ok,true,JSON.stringify(result));return result.data;
};

// Current owner amendment: ordinary Context navigation is an unavailable UI.
// These checks never create, replace or enable a Context controller.
export async function assertNoContextSession(page){
 assert.deepEqual(await page.evaluate(async()=>{
  const {getContextController}=await import(chrome.runtime.getURL('ui/context-workspace.js'));
  const owner=getContextController();return {disabled:owner?.disabled,data:owner?.data,hidden:owner?.root.hidden};
 }),{disabled:true,data:null,hidden:true},'Context remains disabled with no material session');
}

export async function contextSafetySnapshot(page,{thoughtIds=[]}={}){
 const state=await rpc(page,'GET_STATE');
 return {
  records:state.records,library:state.library,settings:state.settings,memoryAccessPolicy:state.memoryAccessPolicy,
  thoughts:await Promise.all(thoughtIds.map(id=>rpc(page,'GET_LIBRARY_ENTRY',{id}))),
  memory:await rpc(page,'PAIA_MEMORY_STATUS'),passport:await rpc(page,'PAIA_PASSPORT_STATUS'),
  permissions:await page.evaluate(()=>chrome.permissions.getAll()),
  session:await page.evaluate(()=>chrome.storage.session.get(null))
 };
}

export async function settleContextCapture(h){
 // The offline harness owns these synthetic pages. Stop fixture capture before
 // attributing exact storage differences to an unavailable UI action.
 for(const page of h.context.pages())if(page.url().startsWith('https://chatgpt.com/c/'))await page.close();
 await eventually(async()=>{const filter=await rpc(h.archive,'FILTER_STATUS');return filter.pending===0&&filter.taskState==='idle';},'synthetic capture/filter work finishes before Context snapshot');
 let previous=null,stable=0;
 await eventually(async()=>{const current=(await rpc(h.archive,'PAIA_MEMORY_STATUS')).generation;if(current===previous)stable++;else{previous=current;stable=0;}return stable>=4;},'real portable-data generation settles before the first snapshot');
}

export async function observeContextEffects(page){
 if(!downloadCounts.has(page)){downloadCounts.set(page,0);page.on('download',()=>downloadCounts.set(page,downloadCounts.get(page)+1));}
 await page.evaluate(()=>{
  if(globalThis.__currentContextEffects)return;
  const effects=globalThis.__currentContextEffects={commands:[],clipboard:0,unavailable:0},send=chrome.runtime.sendMessage.bind(chrome.runtime);
  const mutations=new Set(['PAIA_CONTEXT_MANUAL','PAIA_MEMORY_BUILD','PAIA_MEMORY_SHARE','PAIA_CONTEXT_BIND','PAIA_PASSPORT_CREATE','PAIA_PASSPORT_REVOKE','PAIA_MEMORY_AUTHORIZE','PAIA_MEMORY_EXCLUDE','PAIA_MEMORY_SETTINGS']);
  chrome.runtime.sendMessage=(...args)=>{if(mutations.has(args[0]?.type))effects.commands.push(args[0].type);return send(...args);};
  Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{effects.clipboard++;throw Error('Unavailable Context must not write the clipboard');}}});
  document.addEventListener('paia:context-unavailable',()=>effects.unavailable++);
 });
}

export async function assertNoContextEffects(page,h){
 await assertNoContextSession(page);
 const effects=await page.evaluate(()=>globalThis.__currentContextEffects);
 assert.ok(effects,'side-effect observer is installed');
 assert.deepEqual(effects.commands,[],'unavailable UI does not call any Context/permission mutation');
 assert.equal(effects.clipboard,0,'unavailable UI does not copy');
 assert.equal(downloadCounts.get(page),0,'unavailable UI starts no download');
 assert.equal(h.deepSeekRequests.length,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);
}

export async function selectCurrentPrimary(page,view){
 const width=await page.evaluate(()=>innerWidth);
 await eventually(()=>page.evaluate(({width,view})=>{
  const target=document.querySelector(`.sidebar [data-view="${view}"]`);
  return !!target&&(width<768?target.parentElement.id==='archive-compact-nav-items':target.parentElement.id==='primary-nav');
 },{width,view}),'ordinary primary navigation has reached its responsive parent');
 if(width<768){
  const menu=page.locator('#archive-compact-navigation');
  if(!await menu.evaluate(node=>node.open))await menu.locator(':scope > summary').click();
  await page.locator(`#archive-compact-nav-items [data-view="${view}"]`).click();
 }else await page.locator(`#primary-nav [data-view="${view}"]`).click();
}

export async function assertContextUnavailable(page,{navigate=true,exercise=true}={}){
 if(navigate)await selectCurrentPrimary(page,'memory');
 const root=page.locator('#context-workspace-design-preview');
 await eventually(()=>root.isVisible(),'ordinary Context route displays the approved unavailable page');
 assert.equal(await root.count(),1);assert.match(await root.innerText(),/功能未开放|unavailable|not available/i);
 assert.match(await root.innerText(),/未生成、未保存|not generated or saved/i);
 assert.equal(await root.locator('[data-preview-action]:enabled').count(),0);
 assert.equal(await page.locator('.context-presentation-header [data-preview-action]:enabled').count(),0);
 assert.equal(await root.locator('input:enabled,textarea:not([readonly])').count(),0);
 assert.equal(await root.locator('textarea').inputValue(),'');
 assert.equal(await root.locator('[data-preview-material]').count(),0,'ordinary navigation supplies no retrieved/selected material');
 assert.equal(await page.locator('#material-preview,#material-output-text,[data-output]').count(),0);
 assert.equal(await page.locator('#universal-search-dialog').isVisible(),false,'ordinary Context does not launch retained Search');
 await assertNoContextSession(page);
 if(exercise){
  // DOM-dispatched clicks prove even an event on a disabled presentation action
  // is disconnected. They do not synthesize a navigation or a functional owner.
  const storage=await page.evaluate(async()=>{
   const before=await chrome.storage.local.get(null);
   for(const node of document.querySelectorAll('#context-workspace-design-preview [data-preview-action],.context-presentation-header [data-preview-action]'))node.dispatchEvent(new MouseEvent('click',{bubbles:true}));
   await new Promise(resolve=>setTimeout(resolve,0));return {before,after:await chrome.storage.local.get(null)};
  });
  assert.deepEqual(storage.after,storage.before,'disabled presentation actions do not change any extension-local value');
 }
}

export async function runCurrentContextMatrix({variant,label,extensionPath,steps=['task','select','retrieve','review','ready']}){
 const h=await FakeChatGPT.start(extensionPath?{extensionPath}:{}),page=h.archive;
 let downloads=0;page.on('download',()=>downloads++);
 try{
  await page.locator('#consent-check').check();await page.locator('#enable-consent').click();
  await eventually(async()=>(await rpc(page,'GET_STATUS')).consented);
  if(await page.locator('#onboarding-skip').isVisible())await page.locator('#onboarding-skip').click();
  await rpc(page,'UPDATE_PREFERENCES',{changes:{language:'zh-CN',appearance:'light',readingWidth:'standard'}});
  const capture=await h.open({id:label+'-'+variant,title:'Current Context synthetic source',base:1609459200,messages:[
   {id:label+'-message-a',text:'CONTEXT_UNAVAILABLE_SOURCE 第一段原始表达。'},
   {id:label+'-message-b',text:'CONTEXT_UNAVAILABLE_SOURCE 第二段原始表达。'}
  ]});
  await eventually(async()=>(await h.state()).records.length===2,'synthetic Source capture completes');await capture.close();
  await eventually(async()=>{const filter=await rpc(page,'FILTER_STATUS');return filter.pending===0&&filter.taskState==='idle';},'capture filtering completes before the no-write proof');
  const topic=await rpc(page,'CREATE_LIBRARY_TOPIC',{topic:{name:'Context unchanged Thoughts',operationId:crypto.randomUUID()}}),thoughtIds=[];
  for(const body of ['CONTEXT_UNAVAILABLE_THOUGHT 独立思想保持原样。','CONTEXT_UNAVAILABLE_THOUGHT 第二条思想保持原样。'])thoughtIds.push((await rpc(page,'CONTINUE_THINKING',{thought:{topicId:topic.id,body,operationId:crypto.randomUUID()}})).id);
  await settleContextCapture(h);
  const options={thoughtIds};
  await observeContextEffects(page);await page.bringToFront();
  await mkdir('work/current-context-scope',{recursive:true});
  for(const [width,height,appearance] of [[1440,1000,'light'],[1440,1000,'dark'],[768,1000,'light'],[320,1000,'dark']]){
   await page.setViewportSize({width,height});await rpc(page,'UPDATE_PREFERENCES',{changes:{appearance}});
   await eventually(()=>page.evaluate(theme=>document.documentElement.dataset.paiaTheme===theme,appearance));
   await selectCurrentPrimary(page,'library');await eventually(()=>page.locator('#archive-root-main').isVisible());
   // Theme changes are authorized fixture writes. Compare every business value,
   // including portable generation, across only the subsequent Context actions.
   const before=await contextSafetySnapshot(page,options);
   await assertContextUnavailable(page);
   for(const step of steps){
    const stepButton=page.locator(`[data-context-preview-page="${step}"]`);
    // Compact Context displays only the current step and has no step menu.
    // Select other stages through the visible wide UI, then verify their compact
    // rendering. This does not claim unsupported compact step navigation.
    const selectWide=width<768&&!await stepButton.isVisible();
    if(selectWide)await page.setViewportSize({width:768,height});
    await stepButton.click();
    if(selectWide)await page.setViewportSize({width,height});
    assert.equal(await page.locator('#context-workspace-design-preview').getAttribute('data-context-step'),step);
    if(width<768){
     assert.equal(await page.evaluate(()=>innerWidth),width,'every compact stage is checked at the original viewport');
     assert.equal(await page.locator('.context-presentation-steps button:visible').count(),1,'compact Context displays only its current step');
     assert.equal(await stepButton.isVisible(),true,'the selected step is visible after returning to compact rendering');
    }
    await assertContextUnavailable(page,{navigate:false});
    assert.equal(await page.locator('h1:visible').count(),1,'Context uses one visible ordinary page heading');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'Context has no root overflow at '+width);
    assert.equal(await page.locator('dialog:modal').count(),0,'Context stays in the main workspace');
    await page.screenshot({path:`work/current-context-scope/${label}-${variant}-${step}-${width}-${appearance}.png`,fullPage:false});
   }
   assert.deepEqual(await contextSafetySnapshot(page,options),before,'Source, Input, Thought, policy, grants, permissions and session storage remain exactly unchanged');
   await assertNoContextEffects(page,h);
  }
  assert.equal(downloads,0,'unavailable Context starts no download');
  await assertNoContextEffects(page,h);
 }finally{await h.close();}
}

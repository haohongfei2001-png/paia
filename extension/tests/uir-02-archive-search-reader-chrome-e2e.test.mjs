import {openRetainedSearchComponent} from './harness/retained-search-component.mjs';
import {assertContextUnavailable,settleContextCapture} from './current-context-scope-helper.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {FakeChatGPT,eventually,pause} from './harness/fake-chatgpt.mjs';
import {openArchiveWindow,waitArchiveWindow} from './harness/archive-navigator.mjs';
import {rememberArchiveDirectory,assertArchiveDirectoryUnchanged,assertBlankArchiveReader} from './harness/d7-archive-reference.mjs';

const execFileAsync=promisify(execFile);
const rpc=async(page,type,fields={})=>{
  const response=await page.evaluate(message=>chrome.runtime.sendMessage(message),{type,...fields});
  assert.equal(response.ok,true,JSON.stringify(response));
  return response.data;
};

async function consent(page){
  const action=page.locator('#enable-consent');
  await action.waitFor({state:'visible'});
  await eventually(async()=>!(await action.isDisabled()),'UIR-02 consent action is available');
  await action.click();
  await eventually(async()=>(await rpc(page,'GET_STATUS')).consented===true,'UIR-02 consent is durable');
  assert.equal(await page.locator('#onboarding-history-step').isVisible(),false,'Archive root stays blank after consent');
  await eventually(async()=>!(await page.locator('#onboarding-history-step').isVisible()),'optional history onboarding is dismissed before Archive evidence');
}

async function prepare(h,label='UIR02_SOURCE'){
  const page=h.archive;
  await consent(page);
  await rpc(page,'UPDATE_PREFERENCES',{changes:{language:'zh-CN',appearance:'light'}});
  await h.open({
    id:label.toLowerCase(),
    title:'UIR-02 合成阅读档案',
    base:1609459200,
    messages:[
      {id:`${label}-1`,text:'UIR02_TARGET 第一段合成输入，用于档案列表、搜索与阅读器呈现验证。'},
      {id:`${label}-2`,text:'UIR02_TARGET 第二段合成输入。\n包含多行、中文和 https://example.invalid/uir02/path 。'},
      {id:`${label}-3`,text:'UIR02_TARGET 第三段合成输入，只用于隔离测试，不代表真实用户内容。'}
    ]
  });
  await eventually(async()=>(await h.state()).records.length>=3,'UIR-02 synthetic inputs captured');
  await settleContextCapture(h);await page.bringToFront();
  await waitArchiveWindow(page,{label:'Archive document row is reachable'});
  return page;
}

async function shot(page,name,{fullPage=true}={}){
  await mkdir('work/ux-r2',{recursive:true});
  await page.screenshot({path:`work/ux-r2/${name}.png`,fullPage});
}

async function assertOffline(h){
  assert.equal(h.deepSeekRequests.length,0,'UIR-02 journey makes no Provider request');
  assert.equal(h.extensionNetworkRequests,0,'UIR-02 journey makes no extension external request');
  assert.equal(h.externalRequests,0,'UIR-02 journey makes no unexpected external request');
  assert.deepEqual(h.errors,[]);
}

async function openSearch(page,query){
  assert.equal(await page.locator('#universal-search-open').isVisible(),false,'normal pages expose no global Search launcher');
  assert.equal(await page.locator('#archive-select-materials').count(),0,'Archive root no longer duplicates the material-selection entry');
  await assertContextUnavailable(page);
  await openRetainedSearchComponent(page,{types:['input','thought','ai']});
  const input=page.getByRole('searchbox',{name:'全局搜索'});
  await input.fill(query);
  await eventually(async()=>await page.locator('#universal-search-dialog').getAttribute('data-query')===query&&await page.locator('.universal-hit').count()>0,'internal material Search returns current-scope results');
  return input;
}

async function navigate(page,detail){
  await page.evaluate(value=>document.dispatchEvent(new CustomEvent('paia:navigate',{detail:value})),detail);
}

async function readerMenu(page,label,field=page.locator('.library-prose').first()){
  await field.click({button:'right'});
  await page.locator('#context-menu button').filter({hasText:label}).click();
}

async function sourceJourney(page,h){
  await page.setViewportSize({width:1440,height:900});
  await rpc(page,'UPDATE_PREFERENCES',{changes:{appearance:'light'}});
  await eventually(async()=>await page.evaluate(()=>document.documentElement.dataset.paiaTheme)==='light','light theme applies');

  assert.equal(await page.locator('h1:visible').count(),0,'Archive root has no duplicate title above its persistent directory');await assertBlankArchiveReader(page);
  assert.deepEqual(await page.locator('#scope-search,#reader-scope-search').evaluateAll(nodes=>nodes.map(node=>node.placeholder)),['',''],'search controls have accessible labels without placeholder copy');
  assert.equal(await page.locator('#onboarding-history-step').isVisible(),false,'Archive evidence is not dominated by optional onboarding');
  assert.equal(await page.locator('.conversation-document .summary').first().evaluate(el=>getComputedStyle(el).display),'none','generic Archive subtitle is not presented');
  assert.match(await page.locator('#result-count').evaluate(el=>getComputedStyle(el,'::before').content),/当前范围/,'Archive count is explicitly scoped');
  const archiveOverflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  assert.ok(archiveOverflow<=2,`Archive has no root horizontal overflow; got ${archiveOverflow}`);
  const target=await waitArchiveWindow(page);await target.scrollIntoViewIfNeeded();await rememberArchiveDirectory(page,'UIR normal selection');
  await shot(page,'uir-02-archive-1440x900-light',{fullPage:false});

  await openArchiveWindow(page,{label:'Archive window opens through current navigation'});
  await eventually(()=>page.locator('#document-panel').isVisible(),'Reader opens from Archive');await assertArchiveDirectoryUnchanged(page,'UIR normal selection');
  assert.equal(await page.locator('#archive-reader-navigator-slot #back').count(),0,'directory header is not replaced by Back');
  assert.equal(await page.locator('#reader-compact-tools #archive-reader-back-slot #back').count(),1,'existing Back belongs to the right Reader tools');
  for(const shortcut of ['Control+f','Meta+f']){await page.locator('#back').focus();await page.keyboard.press(shortcut);assert.equal(await page.evaluate(()=>document.activeElement.id),'reader-scope-search');}
  await page.locator('#reader-scope-search').fill('第二段');await eventually(()=>page.locator('.document-search-hit').count().then(count=>count===1),'Reader query finds only its conversation');assert.equal(await page.locator('#scope-search').inputValue(),'','Archive query remains independent');await page.locator('#reader-scope-search').fill('');await eventually(async()=>!await page.locator('#document-search-tools').isVisible(),'Reader query clears');await assertArchiveDirectoryUnchanged(page,'UIR normal selection');
  const shell=await page.locator('#document-page').boundingBox();
  const body=await page.locator('#document-body').boundingBox();
  assert.ok(shell&&body&&shell.width>body.width,'Reader workspace is wider than the saved prose column');
  assert.ok(body.width<=722,'Reader prose keeps the saved 640/680/720px width semantics');
  assert.equal(await page.locator('h1:visible').count(),1,'Reader has only its document h1');
  await shot(page,'uir-02-reader-1440x900-light',{fullPage:false});
  await pause(3300);

  await rpc(page,'UPDATE_PREFERENCES',{changes:{appearance:'dark'}});
  await eventually(async()=>await page.evaluate(()=>document.documentElement.dataset.paiaTheme)==='dark','dark theme applies');
  assert.notEqual(await page.locator('#document-page').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(255, 255, 255)','dark Reader has no forced white page');
  await shot(page,'uir-02-reader-1440x900-dark');

  await rememberArchiveDirectory(page,'UIR Reader closes');await page.locator('#back').click();
  await eventually(()=>page.locator('#collection-panel').isVisible(),'Reader returns to Archive');await assertArchiveDirectoryUnchanged(page,'UIR Reader closes');await assertBlankArchiveReader(page);
  await rpc(page,'UPDATE_PREFERENCES',{changes:{appearance:'light'}});
  await eventually(async()=>await page.evaluate(()=>document.documentElement.dataset.paiaTheme)==='light');

  const query=await openSearch(page,'UIR02_TARGET');
  assert.equal(await page.locator('#universal-search-title').evaluate(el=>el.tagName),'H1');
  assert.equal(await page.locator('h1:visible').count(),1,'Search has one visible page heading');
  const searchBox=await page.locator('#universal-search-dialog').boundingBox();
  assert.ok(searchBox&&searchBox.width>900,'Search uses the main workspace instead of a narrow modal composition');
  assert.equal(await page.locator('.universal-results').evaluate(el=>getComputedStyle(el).overflowY),'visible','Search results use window flow rather than an internal y-scroll');
  assert.equal(await page.locator('.universal-modes').evaluate((m,f)=>m.compareDocumentPosition(document.querySelector(f))&Node.DOCUMENT_POSITION_FOLLOWING,'.universal-filters')!==0,true,'Search modes precede optional filters');
  assert.doesNotMatch(await page.locator('.universal-open small').first().textContent(),/T\d{2}:\d{2}/,'Search does not expose raw ISO timestamps');
  await shot(page,'uir-02-search-1440x900-light');

  await rpc(page,'UPDATE_PREFERENCES',{changes:{hideContentPreviews:true}});
  await eventually(async()=>await page.evaluate(()=>document.documentElement.classList.contains('paia-hide-content-previews')),'preview mask applies');
  await page.getByRole('button',{name:/按时间看/}).click();
  await eventually(async()=>await page.locator('.historical-body').count()>0,'historical Search bodies are rendered before presentation masking');
  assert.equal(await page.locator('.historical-body').first().evaluate(el=>getComputedStyle(el).display),'none','preview mask hides Search historical source bodies');
  await page.getByRole('button',{name:'全部结果',exact:true}).click();
  await eventually(async()=>(await page.getByRole('button',{name:'全部结果',exact:true}).getAttribute('aria-pressed'))==='true'&&await page.locator('.universal-open').count()>0,'Search returns to current results');

  await page.locator('.universal-open').first().click();
  await eventually(()=>page.locator('#document-panel').isVisible(),'Search result opens Reader');
  await eventually(()=>page.locator('#reader-scope-search').isEnabled(),'actual Reader scope is ready');
  assert.equal(await page.locator('#reader-scope-search').inputValue(),'UIR02_TARGET','explicit result query belongs to the Reader scope');assert.equal(await page.locator('#scope-search').inputValue(),'','explicit result does not overwrite the Archive query');
  assert.match(await page.locator('#document-body').textContent(),/UIR02_TARGET/,'explicit Reader full text remains readable while preview mask is enabled');
  const detailField=page.locator('.library-prose').first();
  const detailId=await detailField.getAttribute('data-edit-id');
  assert.ok(detailId,'Reader exposes the existing Input identity for review restoration');

  await readerMenu(page,'查看原始内容',detailField);
  await eventually(()=>page.locator('#info-dialog').evaluate(el=>el.open),'Source panel opens');
  assert.equal(await page.locator('#info-dialog h2').textContent(),'所选 Input · 原始内容','Source mode is named as the immutable record');
  assert.equal(await page.locator('#info-content [contenteditable]').count(),0,'Source record stays read-only');
  assert.match(await page.locator('#info-content .source-original').textContent(),/UIR02_TARGET/,'explicit Source full text remains readable while preview mask is enabled');
  await shot(page,'uir-02-source-1440x900-light');
  await page.locator('#close-info').click();

  await readerMenu(page,'版本历史',detailField);
  await eventually(()=>page.locator('#revision-dialog').evaluate(el=>el.open),'Revision panel opens');
  assert.equal(await page.locator('#revision-dialog h2').textContent(),'所选 Input · 修改历史','revision mode remains distinct from Source');
  assert.match(await page.locator('#revision-dialog > p').textContent(),/恢复会建立新版本/,'revision copy keeps restore-as-new-version semantics');
  await shot(page,'uir-02-revision-1440x900-light');
  await page.locator('#close-revisions').click();

  await page.locator('#back').click();
  await eventually(()=>page.locator('#universal-search-dialog').isVisible(),'Reader Back restores Search task');
  assert.equal(await query.inputValue(),'UIR02_TARGET','Search query survives Reader return');
  await rpc(page,'UPDATE_PREFERENCES',{changes:{hideContentPreviews:false}});
  await eventually(async()=>!(await page.evaluate(()=>document.documentElement.classList.contains('paia-hide-content-previews'))),'preview mask can be removed without leaving Search');
  await page.locator('.universal-close').click();
  await assertContextUnavailable(page,{navigate:false});
  await page.locator('#primary-nav [data-view="library"]').click();
  await eventually(()=>page.locator('#collection-panel').isVisible(),'Archive remains directly reachable after material selection');
  await eventually(()=>page.locator('#scope-search').isEnabled(),'actual Archive scope is ready after the task closes');
  assert.equal(await page.locator('#scope-search').inputValue(),'','Reader/material-task query does not overwrite the independent Archive-root filter');
  await page.locator('#scope-search').fill('');
  await eventually(()=>page.locator('#archive-navigator').isVisible(),'clearing the Archive filter restores the source tree before Revisit');
  assert.equal(await page.locator('#uir-archive-assist,#uir-archive-frame').count(),0,'Archive does not restore the legacy side dashboard');

  await navigate(page,{view:'revisit'});
  await eventually(()=>page.locator('#revisit-panel').isVisible(),'Revisit task opens');
  assert.equal(await page.locator('h1:visible').count(),1,'Revisit has one visible page heading');
  assert.notEqual(await page.locator('#revisit-panel').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(255, 255, 255)','Revisit does not force a white dialog surface');
  await shot(page,'uir-02-revisit-1440x900-light');
  await page.locator('.revisit-close').click();
  await eventually(()=>page.locator('#collection-panel').isVisible(),'Revisit returns to Archive');

  await rpc(page,'EXCLUDE_LIBRARY',{id:detailId,excluded:true});
  await navigate(page,{view:'excluded'});
  await eventually(()=>page.locator('#review-navigation').isVisible(),'removed-input review opens');
  await eventually(()=>page.locator('.conversation-document').isVisible(),'removed document remains reachable for review');
  await page.locator('.conversation-document').first().click();
  const removed=page.locator('.review-actions[data-review-state="removed"]').first();
  await eventually(()=>removed.isVisible(),'removed Input has an explicit review state');
  assert.match(await removed.textContent(),/已移除/,'removed state is named at the real recovery action');
  assert.match(await removed.textContent(),/当时记录不会被改写/,'review copy separates working text recovery from Source');
  await shot(page,'uir-02-review-removed-1440x900-light');
  await removed.getByRole('button',{name:'恢复到输入档案'}).click();
  await eventually(()=>page.locator('#document-panel').isVisible(),'restoring the removed working copy returns to Reader');

  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>{
    const send=chrome.runtime.sendMessage.bind(chrome.runtime);
    let failOnce=true;
    chrome.runtime.sendMessage=async message=>{
      if(failOnce&&message?.type==='EDIT_DOCUMENT'){
        failOnce=false;
        throw new Error('UIR02_SYNTHETIC_SAVE_FAILURE');
      }
      return send(message);
    };
  });
  const prose=page.locator('.library-prose').first();
  await prose.click();
  await prose.evaluate(el=>{
    el.textContent+=' UIR02_BUFFER_STAYS';
    el.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:' UIR02_BUFFER_STAYS'}));
  });
  await eventually(()=>page.locator('#retry').isVisible(),'failed save exposes retry without dropping the edit buffer');
  assert.match(await prose.textContent(),/UIR02_BUFFER_STAYS/,'failed save keeps the current text in place');
  assert.equal(await page.locator('.reader-mobile-edit,#reader-title-edit').count(),0,'narrow Reader retires separate Edit/Done modes');
  assert.equal(await prose.getAttribute('contenteditable'),'plaintext-only','failed narrow edit remains directly editable');
  const mobileOverflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  assert.ok(mobileOverflow<=2,`390px Reader has no root horizontal overflow; got ${mobileOverflow}`);
  await shot(page,'uir-02-reader-390x844-save-failure',{fullPage:false});
  await assertOffline(h);
}

async function releaseJourney(page,h){
  await page.setViewportSize({width:1440,height:900});
  await rpc(page,'UPDATE_PREFERENCES',{changes:{appearance:'light',language:'zh-CN'}});
  await waitArchiveWindow(page,{label:'built release Archive is usable'});
  await assertBlankArchiveReader(page);await shot(page,'uir-02-current-release-archive-1440x900-light',{fullPage:false});
  const target=await waitArchiveWindow(page);await target.scrollIntoViewIfNeeded();await rememberArchiveDirectory(page,'release normal selection');await openArchiveWindow(page);await eventually(()=>page.locator('#document-panel').isVisible(),'release ordinary Reader opens');await assertArchiveDirectoryUnchanged(page,'release normal selection');await shot(page,'uir-02-current-release-reader-1440x900-light',{fullPage:false});
  await page.locator('#back').click();await eventually(()=>page.locator('#collection-panel').isVisible(),'release closes to Archive');await assertArchiveDirectoryUnchanged(page,'release normal selection');await assertBlankArchiveReader(page);
  const input=await openSearch(page,'UIR02_TARGET');
  await rpc(page,'UPDATE_PREFERENCES',{changes:{hideContentPreviews:true}});
  await eventually(async()=>await page.evaluate(()=>document.documentElement.classList.contains('paia-hide-content-previews')),'built release preview mask applies');
  await page.getByRole('button',{name:/按时间看/}).click();
  await eventually(async()=>await page.locator('.historical-body').count()>0,'built release history results render');
  assert.equal(await page.locator('.historical-body').first().evaluate(el=>getComputedStyle(el).display),'none','built release masks historical Search bodies');
  await page.getByRole('button',{name:'全部结果',exact:true}).click();
  await eventually(async()=>(await page.getByRole('button',{name:'全部结果',exact:true}).getAttribute('aria-pressed'))==='true'&&await page.locator('.universal-open').count()>0);
  await page.locator('.universal-open').first().click();
  await eventually(()=>page.locator('#document-panel').isVisible(),'built release Search opens Reader');await eventually(()=>page.locator('#reader-scope-search').isEnabled(),'release Reader query ready');assert.equal(await page.locator('#reader-scope-search').inputValue(),'UIR02_TARGET');assert.equal(await page.locator('#scope-search').inputValue(),'');
  assert.match(await page.locator('#document-body').textContent(),/UIR02_TARGET/,'built release Reader full text is not masked');
  await page.locator('#back').click();
  await eventually(()=>page.locator('#universal-search-dialog').isVisible(),'built release Reader returns to Search');
  assert.equal(await input.inputValue(),'UIR02_TARGET');
  await assertOffline(h);
}

test('UIR-02 Archive, Search, Revisit and Reader presentation stays on existing owners in source and built release Chrome',{timeout:300000},async()=>{
  let source;
  try{
    source=await FakeChatGPT.start({onboarding:true});
    const page=await prepare(source);
    await sourceJourney(page,source);
  }finally{
    await source?.close();
  }

  await execFileAsync('python3',['scripts/build_current_release.py'],{cwd:process.cwd(),maxBuffer:16*1024*1024});
  let release;
  try{
    release=await FakeChatGPT.start({extensionPath:'work/current-release',onboarding:true});
    const page=await prepare(release,'UIR02_RELEASE');
    await releaseJourney(page,release);
  }finally{
    await release?.close();
  }
});

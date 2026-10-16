import test from 'node:test';
import assert from 'node:assert/strict';
import {FakeChatGPT,eventually,pause} from './harness/fake-chatgpt.mjs';
import {openArchiveWindow,waitArchiveWindow} from './harness/archive-navigator.mjs';

const op=()=>crypto.randomUUID();
const rpc=async(page,type,fields={})=>{
  const response=await page.evaluate(message=>chrome.runtime.sendMessage(message),{type,...fields});
  assert.equal(response.ok,true,JSON.stringify(response));
  return response.data;
};
const nav=async(page,view)=>{await page.locator(view==='settings'?'.sidebar-bottom [data-view="settings"]':`#primary-nav [data-view="${view}"]`).click();await eventually(()=>page.locator(view==='settings'?'#settings-panel':view==='thoughts'?'#thought-panel':'#collection-panel').isVisible(),'page navigation completes');};
const shortcut=(page,key,options={})=>page.evaluate(({key,options})=>document.dispatchEvent(new KeyboardEvent('keydown',{key,bubbles:true,cancelable:true,...options})),{key,options});
const activeId=page=>page.evaluate(()=>document.activeElement?.id||'');
const visibleSearches=page=>page.locator('input[type="search"]:visible').count();

async function ready(h){
  const page=h.archive;
  await page.locator('#enable-consent').waitFor({state:'visible'});
  await page.locator('#enable-consent').click();
  await eventually(async()=>(await rpc(page,'GET_STATUS')).consented===true,'UIS-02 consent is durable');
  if(await page.locator('#onboarding-skip').isVisible())await page.locator('#onboarding-skip').click();
  await rpc(page,'UPDATE_PREFERENCES',{changes:{language:'zh-CN',appearance:'light'}});
  return page;
}

async function seedInputs(h){
  await h.open({id:'uis02-doc-a',title:'UIS02 文档甲',base:1609459200,messages:[
    {id:'uis02-a-1',text:'UIS02_DOC_A_TARGET 只属于甲文档的第一条输入。'},
    {id:'uis02-a-2',text:'UIS02_DOC_A_SECOND 甲文档第二条输入用于文档内搜索。'}
  ]});
  await h.open({id:'uis02-doc-b',title:'UIS02 文档乙',base:1609459300,messages:[
    {id:'uis02-b-1',text:'UIS02_DOC_B_TARGET 只属于乙文档，甲文档搜索不得返回。'}
  ]});
  await eventually(async()=>(await h.state()).records.length===3,'UIS-02 input fixtures captured');
}

async function seedThoughts(page){
  const a=await rpc(page,'CREATE_LIBRARY_TOPIC',{topic:{name:'UIS02 主题甲',operationId:op()}});
  await rpc(page,'CONTINUE_THINKING',{thought:{operationId:op(),topicId:a.id,body:'UIS02_TOPIC_A_TARGET 只属于主题甲的思想正文。'}});
  const b=await rpc(page,'CREATE_LIBRARY_TOPIC',{topic:{name:'UIS02 主题乙',operationId:op()}});
  await rpc(page,'CONTINUE_THINKING',{thought:{operationId:op(),topicId:b.id,body:'UIS02_TOPIC_B_TARGET 只属于主题乙，主题甲内搜索不得返回。'}});
  return {a,b};
}

async function expectSingleSearch(page,id,label){
  assert.equal(await visibleSearches(page),1,`${label} exposes exactly one visible search box`);
  assert.equal(await page.locator('#'+id).isVisible(),true,`${label} owns the visible search box`);
  assert.equal(await page.locator('#universal-search-open').isVisible(),false,`${label} has no visible global search launcher`);
  await eventually(()=>page.locator('#'+id).isEnabled(),`${label} releases its actual scoped search before keyboard input`);
}

test('UIS-02 search is page-scoped across Archive, Reader, Thought root/topic and absent from Settings',{timeout:180000},async()=>{
  const h=await FakeChatGPT.start({onboarding:true});
  try{
    const page=await ready(h);
    await seedInputs(h);
    const topics=await seedThoughts(page);
    await page.bringToFront();

    // Archive root: the one visible search box covers eligible Archive/Input content.
    await nav(page,'library');
    await waitArchiveWindow(page,{text:'UIS02 文档甲'});await waitArchiveWindow(page,{text:'UIS02 文档乙'});
    assert.equal(await page.locator('.archive-navigator-window').count(),2,'Archive narrow directory shows both documents');
    assert.equal(await page.locator('#document-body').textContent(),'','default Reader stays empty');
    await expectSingleSearch(page,'scope-search','Archive root');
    await shortcut(page,'/');
    assert.equal(await activeId(page),'scope-search','/ focuses Archive root search');
    await page.locator('#scope-search').fill('UIS02_DOC_B_TARGET');
    await eventually(async()=>await page.locator('#document-list .search-input').count()===1,'Archive root search finds the other document');
    assert.match(await page.locator('#document-list').innerText(),/UIS02_DOC_B_TARGET/);
    await page.locator('#scope-search').fill('');
    await waitArchiveWindow(page,{label:'clearing Archive root search restores browse navigation'});

    // Reader search is retired. Its former hotkeys cannot focus hidden inputs,
    // and ordinary reading keeps current-document identity and exact text.
    await openArchiveWindow(page,{text:'UIS02 文档甲'});
    await eventually(()=>page.locator('#document-panel').isVisible());
    console.error('READER_SEARCH_STATE',JSON.stringify(await page.evaluate(()=>({route:history.state,search:[...document.querySelectorAll('input[type=search]')].filter(n=>n.getClientRects().length&&getComputedStyle(n).visibility!=='hidden').map(n=>({id:n.id,html:n.outerHTML})),body:document.body.dataset}))));assert.equal(await visibleSearches(page),0);
    for(const [key,options]of [['/',{}],['k',{metaKey:true}],['f',{metaKey:true}]]){
      await page.locator('#back').focus();await shortcut(page,key,options);
      assert.notEqual(await activeId(page),'reader-scope-search');assert.notEqual(await activeId(page),'scope-search');
    }
    assert.match(await page.locator('#document-body').textContent(),/UIS02_DOC_A_TARGET/);
    assert.doesNotMatch(await page.locator('#document-body').textContent(),/UIS02_DOC_B_TARGET/);
    await page.locator('#back').click();await eventually(()=>page.locator('#scope-search').isVisible(),'actual Back navigation restores discovery before assertions');await expectSingleSearch(page,'scope-search','Archive return');
    assert.equal(await page.locator('#scope-search').inputValue(),'');
    // Explicit Archive result still resolves its exact Input without a Reader query UI.
    await page.locator('#scope-search').fill('UIS02_DOC_B_TARGET');await eventually(async()=>await page.locator('#document-list .search-input').count()===1);
    await page.locator('#document-list .search-input').first().click();await eventually(()=>page.locator('#document-panel').isVisible());
    assert.equal(await visibleSearches(page),0);assert.match(await page.locator('#document-body').textContent(),/UIS02_DOC_B_TARGET/);assert.doesNotMatch(await page.locator('#document-body').textContent(),/UIS02_DOC_A_TARGET/);
    await page.locator('#back').click();await eventually(()=>page.locator('#scope-search').isVisible());assert.equal(await page.locator('#scope-search').inputValue(),'UIS02_DOC_B_TARGET');

    // Thought Home and reader expose no app search, while backend qualified
    // retrieval remains separately covered by its owning tests and consumers.
    await nav(page,'thoughts');await eventually(async()=>await page.locator('#thought-list article.personal-topic-block').count()===2);
    assert.equal(await visibleSearches(page),0);assert.equal(await page.locator('#thought-list .personal-entry-preview').count(),0);
    const slots=await page.locator('#thought-list article.personal-topic-block').evaluateAll(nodes=>nodes.map(node=>[node.dataset.topicId,node.dataset.rootSlot]));
    await shortcut(page,'/');await shortcut(page,'k',{metaKey:true});assert.notEqual(await activeId(page),'thought-search');
    assert.deepEqual(await page.locator('#thought-list article.personal-topic-block').evaluateAll(nodes=>nodes.map(node=>[node.dataset.topicId,node.dataset.rootSlot])),slots);
    await page.locator(`.personal-topic-link[data-topic-id="${topics.a.id}"]`).click();
    await eventually(()=>page.locator('#topic-body').textContent().then(text=>text.includes('UIS02_TOPIC_A_TARGET')));
    assert.equal(await visibleSearches(page),0);assert.doesNotMatch(await page.locator('#topic-body').textContent(),/UIS02_TOPIC_B_TARGET/);
    await shortcut(page,'f',{metaKey:true});assert.notEqual(await activeId(page),'topic-search');

    // Settings: no search box, no visible launcher, and PAIA search-focus shortcuts do not open hidden/global search.
    await nav(page,'settings');
    await eventually(()=>page.locator('#settings-panel').isVisible(),'Settings opens');
    assert.equal(await visibleSearches(page),0,'Settings exposes no search box');
    assert.equal(await page.locator('#universal-search-open').isVisible(),false,'Settings exposes no search launcher');
    assert.equal(await page.locator('#universal-search-dialog').isVisible(),false,'internal search shell starts closed');
    const before=await activeId(page);
    await shortcut(page,'/');
    await shortcut(page,'k',{metaKey:true});
    await pause(50);
    assert.equal(await page.locator('#universal-search-dialog').isVisible(),false,'Settings shortcuts never route to hidden/global search');
    assert.notEqual(await activeId(page),'universal-search-open');
    assert.equal(await activeId(page),before,'Settings leaves PAIA focus unchanged when no surface search exists');

    assert.equal(h.deepSeekRequests.length,0,'UIS-02 search does not invoke paid AI');
    assert.equal(h.extensionNetworkRequests,0,'UIS-02 search remains local');
    assert.equal(h.externalRequests,0,'UIS-02 search makes no unexpected external request');
    assert.deepEqual(h.errors,[]);
  }finally{
    await h.close();
  }
});

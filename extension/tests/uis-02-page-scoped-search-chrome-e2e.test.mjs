import test from 'node:test';
import assert from 'node:assert/strict';
import {FakeChatGPT,eventually,pause} from './harness/fake-chatgpt.mjs';

const op=()=>crypto.randomUUID();
const rpc=async(page,type,fields={})=>{
  const response=await page.evaluate(message=>chrome.runtime.sendMessage(message),{type,...fields});
  assert.equal(response.ok,true,JSON.stringify(response));
  return response.data;
};
const nav=(page,view)=>page.locator(view==='settings'?'.sidebar-bottom [data-view="settings"]':`#primary-nav [data-view="${view}"]`).click();
const shortcut=(page,key,options={})=>page.evaluate(({key,options})=>document.dispatchEvent(new KeyboardEvent('keydown',{key,bubbles:true,cancelable:true,...options})),{key,options});
const activeId=page=>page.evaluate(()=>document.activeElement?.id||'');
const visibleSearches=page=>page.locator('input[type="search"]:visible').count();

async function ready(h){
  const page=h.archive;
  await page.locator('#consent-check').check();
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
    await eventually(async()=>await page.locator('#document-list .conversation-document').count()===2,'Archive root shows both documents');
    await expectSingleSearch(page,'search','Archive root');
    await shortcut(page,'/');
    assert.equal(await activeId(page),'search','/ focuses Archive root search');
    await page.locator('#search').fill('UIS02_DOC_B_TARGET');
    await eventually(async()=>await page.locator('#document-list .search-input').count()===1,'Archive root search finds the other document');
    assert.match(await page.locator('#document-list').innerText(),/UIS02_DOC_B_TARGET/);
    await page.locator('#search').fill('');
    await eventually(async()=>await page.locator('#document-list .conversation-document').count()===2,'clearing Archive root search restores browse list');

    // One Archive document: current-document search uses documentId and never leaks another document.
    await page.locator('#document-list .conversation-document').filter({hasText:'UIS02 文档甲'}).click();
    await eventually(()=>page.locator('#document-search').isVisible(),'Archive Reader exposes its scoped search');
    await expectSingleSearch(page,'document-search','Archive document');
    await page.evaluate(()=>{globalThis.__uis02SearchRequests=[];const send=chrome.runtime.sendMessage.bind(chrome.runtime);chrome.runtime.sendMessage=async message=>{if(message?.type==='SEARCH_INPUTS')globalThis.__uis02SearchRequests.push(structuredClone(message.options));return send(message);};});
    await shortcut(page,'k',{metaKey:true});
    assert.equal(await activeId(page),'document-search','Cmd/Ctrl+K focuses current Archive document search instead of a global launcher');
    await page.locator('#document-search').fill('UIS02_DOC_B_TARGET');
    await eventually(async()=>/没有匹配|No matching/.test(await page.locator('#document-search-status').innerText()),'other-document input is excluded');
    assert.equal(await page.locator('.document-search-hit').count(),0,'Archive document search cannot leak another document');
    await page.locator('#document-search').fill('UIS02_DOC_A_TARGET');
    await eventually(async()=>await page.locator('.document-search-hit').count()===1,'current document result appears');
    const scoped=await page.evaluate(()=>globalThis.__uis02SearchRequests.filter(x=>x?.paged===true));
    assert.ok(scoped.length>0,'document search uses the shared paged lexical coordinator');
    assert.ok(scoped.every(x=>typeof x.documentId==='string'&&x.documentId.length>0),'every Reader search request is explicitly document-scoped');
    const queryBeforeOpen=await page.locator('#document-search').inputValue();
    await page.locator('.document-search-hit').first().click();
    await eventually(async()=>await page.locator('[data-search-origin="true"]').count()===1,'search result opens exact Reader input');
    assert.equal(await page.locator('#document-search').inputValue(),queryBeforeOpen,'document search query survives exact-result Reader navigation');
    assert.ok(await page.evaluate(()=>CSS.highlights?.has('paia-search')===true),'Reader keeps local match highlighting after result open');
    await page.locator('#back').click();
    await eventually(()=>page.locator('#search').isVisible(),'Reader returns to Archive root');
    assert.equal(await page.locator('#search').inputValue(),'','Reader search state does not overwrite Archive-root search state');

    // Thought Library root: its existing local search remains the sole visible search.
    await nav(page,'thoughts');
    await eventually(async()=>await page.locator('#thought-list [data-topic-id]').count()===2,'Thought root shows both topics');
    await expectSingleSearch(page,'thought-search','Thought Library root');
    await shortcut(page,'/');
    assert.equal(await activeId(page),'thought-search','/ focuses Thought Library root search');
    await page.locator('#thought-search').fill('UIS02_TOPIC_B_TARGET');
    await eventually(async()=>await page.locator('#thought-list .topic-index-row').count()===1,'Thought root search finds content across Thought Library');
    assert.match(await page.locator('#thought-list').innerText(),/主题乙|UIS02_TOPIC_B_TARGET/);
    await page.locator('#thought-search').fill('');
    await eventually(async()=>await page.locator('#thought-list [data-topic-id]').count()===2,'Thought root query clears locally');

    // One Thought topic: search is restricted to that topic/document.
    await page.locator(`[data-topic-id="${topics.a.id}"]`).click();
    await eventually(()=>page.locator('#topic-search').isVisible(),'Thought topic search is visible');
    await expectSingleSearch(page,'topic-search','Thought topic');
    await shortcut(page,'f',{metaKey:true});
    assert.equal(await activeId(page),'topic-search','Cmd/Ctrl+F focuses current Thought topic search');
    await page.locator('#topic-search').fill('UIS02_TOPIC_B_TARGET');
    await eventually(async()=>/0 条匹配内容/.test(await page.locator('#topic-search-count').innerText()),'other-topic content is excluded');
    assert.equal(await page.locator('#topic-body [data-entry-id]').count(),0,'Thought topic search cannot leak another topic');
    await page.locator('#topic-search').fill('UIS02_TOPIC_A_TARGET');
    await eventually(async()=>/1 条匹配内容/.test(await page.locator('#topic-search-count').innerText()),'current topic match appears');
    assert.equal(await page.locator('#topic-body [data-entry-id]').count(),1);

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

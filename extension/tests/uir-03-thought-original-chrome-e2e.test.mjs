import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {FakeChatGPT,eventually,pause} from './harness/fake-chatgpt.mjs';

const execFileAsync=promisify(execFile);
const op=()=>crypto.randomUUID();
const rpc=async(page,type,fields={})=>{
  const response=await page.evaluate(message=>chrome.runtime.sendMessage(message),{type,...fields});
  assert.equal(response.ok,true,JSON.stringify(response));
  return response.data;
};
const nav=(page,view)=>page.locator(`[data-view="${view}"]`).first().click();

async function ready(h){
  const page=h.archive;
  const action=page.locator('#enable-consent');
  await action.waitFor({state:'visible'});
  await eventually(async()=>!(await action.isDisabled()),'UIR-03 consent action is available');
  await action.click();
  await eventually(async()=>(await rpc(page,'GET_STATUS')).consented===true,'UIR-03 consent is durable');
  if(await page.locator('#onboarding-skip').isVisible())await page.locator('#onboarding-skip').click();
  await rpc(page,'UPDATE_PREFERENCES',{changes:{language:'zh-CN',appearance:'light'}});
  return page;
}

async function seed(page,prefix){
  const names=[
    `${prefix} 一个足够长的稳定主题名称，用于验证标题自然换行而不是固定两行裁切`,
    `${prefix} 稳定主题二`,
    `${prefix} 稳定主题三`
  ];
  const topics=[];
  for(let i=0;i<names.length;i++){
    const topic=await rpc(page,'CREATE_LIBRARY_TOPIC',{topic:{name:names[i],operationId:op()}});
    topics.push(topic);
    await rpc(page,'CONTINUE_THINKING',{thought:{operationId:op(),topicId:topic.id,body:`${prefix}_THOUGHT_${i}_A 这是主题 ${i+1} 的第一段完整思想正文。\n它保留真实换行，不是卡片摘要。`}});
    await rpc(page,'CONTINUE_THINKING',{thought:{operationId:op(),topicId:topic.id,body:`${prefix}_THOUGHT_${i}_B 第二段正文用于连续阅读、日期和工具层级验证。`}});
  }
  topics[0].readingIds=(await rpc(page,'TOPIC_DOCUMENT_PAGE',{options:{topicId:topics[0].id,sort:'asc',limit:40}})).items.map(x=>x.entry.id);
  for(let i=0;i<45;i++){
    const thought=await rpc(page,'CONTINUE_THINKING',{thought:{operationId:op(),topicId:topics[0].id,body:`${prefix}_LATER_${String(i).padStart(2,'0')} 独立留下的后续记录，保留原话与创建时间。`}});
    topics[0].readingIds.push(thought.id);
  }
  topics[0].summary=`${prefix} 这是保留完整来源表达的真实内容线索。 `.repeat(40);
  const current=await rpc(page,'GET_LIBRARY_TOPIC',{id:topics[0].id});
  await rpc(page,'EDIT_LIBRARY_TOPIC',{edit:{id:current.id,expectedRevision:current.revision,changes:{summary:topics[0].summary},operationId:op()}});
  await rpc(page,'RECORD_TOPIC_READ',{id:topics[1].id});
  return topics;
}

async function shot(page,name,{fullPage=true}={}){
  await mkdir('work/ux-r3',{recursive:true});
  await page.screenshot({path:`work/ux-r3/${name}.png`,fullPage});
}

async function assertOffline(h){
  assert.equal(h.deepSeekRequests.length,0,'UIR-03 home/original journey makes no Provider request');
  assert.equal(h.extensionNetworkRequests,0,'UIR-03 home/original journey makes no extension external request');
  assert.equal(h.externalRequests,0,'UIR-03 home/original journey makes no unexpected external request');
  assert.deepEqual(h.errors,[]);
}

async function homeAndOriginalJourney(page,h,topics,{release=false}={}){
  await page.bringToFront();
  await nav(page,'thoughts');
  await eventually(async()=>await page.locator('#thought-list [data-topic-id]').count()===3,'Thought home renders the seeded Topics');
  assert.equal(await page.locator('input[type="search"]:visible').count(),1,'Thought root exposes exactly one visible search control');
  assert.equal(await page.locator('#thought-search').isVisible(),true,'Thought root keeps its page-scoped search');
  assert.equal(await page.locator('#library-view-switch').isVisible(),false,'Thought root hides AI presentation controls until a Topic is open');
  assert.equal(await page.locator('#ai-presentation-toggle').isVisible(),false,'Thought root has no visible AI organize toggle');
  assert.equal(await page.locator('#thought-recent').count(),0,'Thought root no longer renders 最近阅读');
  const index=await rpc(page,'LIBRARY_INDEX_PAGE',{options:{mode:'stable'}});
  assert.ok(index.recent?.some(item=>item.id===topics[1].id),'recent-read metadata remains available behind the removed root section');
  const homeMenu=page.locator('#thought-home-tools .library-actions').first();
  await homeMenu.locator('summary').click();
  assert.equal(await homeMenu.getByRole('button',{name:'添加主题',exact:true}).isVisible(),true,'root menu keeps Add Topic');
  assert.equal(await homeMenu.getByRole('button',{name:'列表 / 网格',exact:true}).isVisible(),true,'root menu keeps layout control');
  assert.equal(await homeMenu.getByRole('button',{name:'整理新增内容',exact:true}).count(),0,'root menu no longer starts AI organization');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#thought-home-tools').getByRole('button',{name:'接着写',exact:true}).isVisible(),true,'independent Thought creation remains reachable');

  await page.setViewportSize({width:1440,height:900});
  await rpc(page,'UPDATE_PREFERENCES',{changes:{appearance:'light'}});
  await eventually(async()=>await page.evaluate(()=>document.documentElement.dataset.paiaTheme)==='light','light theme applies');
  assert.equal(await page.locator('h1:visible').count(),1,'Thought home has one visible page heading');
  assert.equal(await page.locator('#thought-document').isVisible(),false,'Topic document stays out of the home view');
  assert.equal((await rpc(page,'GET_THOUGHT_LAYOUT')).layout,'list','new users default to compact Topic scanning');
  await eventually(async()=>await page.locator('#thought-list').evaluate(el=>el.classList.contains('topic-list-layout')),'compact layout applies');
  assert.equal(await page.locator('#thought-list').evaluate(el=>getComputedStyle(el).display),'block','List mode actually uses one stacked column, including wide desktops');
  const listRows=await page.locator('#thought-list [data-topic-id]').evaluateAll(nodes=>nodes.map(node=>{const r=node.getBoundingClientRect();return {left:r.left,width:r.width};}));
  assert.ok(listRows.every(row=>Math.abs(row.left-listRows[0].left)<=2&&Math.abs(row.width-listRows[0].width)<=2),'all compact Topic rows share one reading column');
  assert.equal(await page.locator('#thought-list .topic-index-row strong').first().textContent(),(await rpc(page,'GET_LIBRARY_TOPIC',{id:topics[0].id})).name,'root keeps the complete Topic title');
  assert.equal(await page.locator('#thought-list .topic-index-row .summary').first().textContent(),topics[0].summary,'the root cue retains the original summary text');
  assert.equal(await page.locator('#thought-list .topic-index-row .summary').first().evaluate(el=>getComputedStyle(el).webkitLineClamp),'2','root content cue is visually bounded');
  await shot(page,release?'vs05-release-thought-list-1440x900-light':'vs05-thought-list-1440x900-light');
  await homeMenu.locator('summary').click();
  await homeMenu.getByRole('button',{name:'列表 / 网格',exact:true}).click();
  await eventually(async()=>!(await page.locator('#thought-list').evaluate(el=>el.classList.contains('topic-list-layout'))),'explicit grid choice applies');
  assert.equal((await rpc(page,'GET_THOUGHT_LAYOUT')).layout,'grid','an explicit user grid choice is durable');
  await shot(page,release?'uir-03-current-release-thought-home-1440x900-light':'uir-03-thought-home-1440x900-light');

  if(!release){
    await rpc(page,'UPDATE_PREFERENCES',{changes:{appearance:'dark'}});
    await eventually(async()=>await page.evaluate(()=>document.documentElement.dataset.paiaTheme)==='dark','dark theme applies');
    await shot(page,'uir-03-thought-home-1440x900-dark');
    await rpc(page,'UPDATE_PREFERENCES',{changes:{appearance:'light'}});
    await eventually(async()=>await page.evaluate(()=>document.documentElement.dataset.paiaTheme)==='light');
  }

  await page.setViewportSize({width:1200,height:800});
  const gridAt1200=await page.locator('#thought-list').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').filter(Boolean).length);
  assert.equal(gridAt1200,2,'Thought home uses two columns when the main workspace is below the three-column threshold');
  const cardWidth=await page.locator('#thought-list .topic-index-row').first().evaluate(el=>el.getBoundingClientRect().width);
  assert.ok(cardWidth>=300,`Topic card keeps an approximately 300px minimum readable width; got ${cardWidth}`);
  assert.notEqual(await page.locator('#thought-list .topic-index-row strong').first().evaluate(el=>getComputedStyle(el).webkitLineClamp),'2','long Topic titles are not forced to the old two-line clamp');

  await page.setViewportSize({width:390,height:844});
  const mobileColumns=await page.locator('#thought-list').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').filter(Boolean).length);
  assert.equal(mobileColumns,1,'Thought home becomes one column on the mobile-like viewport');
  const homeOverflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  assert.ok(homeOverflow<=2,`390px Thought home has no root horizontal overflow; got ${homeOverflow}`);
  const topicMenuBox=await page.locator('#thought-list .topic-tile>.library-actions>summary').first().boundingBox();
  assert.ok(topicMenuBox&&topicMenuBox.width>=44&&topicMenuBox.height>=44,'touch Topic more action remains a 44px target');

  await page.setViewportSize({width:1440,height:900});
  await page.locator(`[data-topic-id="${topics[0].id}"]`).click();
  await eventually(()=>page.locator('#thought-document').isVisible(),'Topic opens from the existing home owner');
  await eventually(()=>page.locator('#original-reading-body .topic-section').count().then(count=>count>0),'Original content renders in the existing Topic document');
  assert.equal(await page.locator('h1:visible').count(),1,'Topic has one visible h1');
  assert.equal(await page.locator('#view-title').isVisible(),false,'global Thought Library title no longer competes with the Topic h1');
  assert.equal(await page.locator('#topic-heading>p').textContent(),topics[0].summary,'opening the Topic reveals the unchanged complete summary');
  assert.equal(await page.locator('#back').isVisible(),true,'Topic keeps the existing return path');

  const shell=await page.locator('#thought-document').boundingBox();
  const section=await page.locator('#original-reading-body .topic-section').first().boundingBox();
  assert.ok(shell&&section&&shell.width>900,'Topic shell uses the main workspace rather than the old narrow document shell');
  assert.ok(section.width<=722,`Original prose keeps the saved 640/680/720px reading-width boundary; got ${section?.width}`);
  assert.ok(shell.width-section.width>120,'Topic shell and readable prose width remain distinct');
  assert.equal(await page.locator('input[type="search"]:visible').count(),1,'open Topic exposes exactly one visible search control');
  assert.equal(await page.locator('#topic-search').isVisible(),true,'current-Topic search remains in the existing toolbar');
  assert.equal(await page.locator('#library-view-switch').isVisible(),true,'AI presentation controls appear only with a concrete open Topic');
  assert.equal(await page.locator('#ai-presentation-toggle').isVisible(),true,'Topic keeps its contextual AI presentation switch');
  assert.equal(await page.locator('#create-entry').isVisible(),true,'continue-thinking entry remains reachable');
  const topicMenu=page.locator('#topic-menu .library-actions');
  await topicMenu.locator('summary').click();
  assert.equal(await topicMenu.getByRole('button',{name:'导出主题',exact:true}).isVisible(),true,'Topic-scoped export remains reachable in the Topic ··· menu');
  assert.equal(await page.getByRole('button',{name:'导出思想库',exact:true}).count(),0,'no whole-Library export scope is invented');
  await page.keyboard.press('Escape');

  const firstId=topics[0].readingIds[0],latestId=topics[0].readingIds.at(-1);
  const beforeFirst=await rpc(page,'GET_LIBRARY_ENTRY',{id:firstId}),beforeLatest=await rpc(page,'GET_LIBRARY_ENTRY',{id:latestId});
  await page.locator('#topic-search').fill('_THOUGHT_0_A');
  await eventually(async()=>await page.locator('#original-reading-body [data-entry-id]').count()===1,'Topic search narrows original records');
  await page.locator('[data-reading-start="desc"]').click();
  await eventually(async()=>await page.locator('#original-reading-body [data-entry-id]').first().getAttribute('data-entry-id')===latestId,'recent-time jump reaches a record beyond the initial 40-row page');
  assert.equal(await page.locator('#topic-search').inputValue(),'','time navigation explicitly returns to all original records');
  assert.equal((await rpc(page,'GET_ORGANIZER_CONTROLS')).readingSort,'desc','time navigation durably records its direction');
  assert.equal(await page.locator('#original-reading-body [data-entry-id]').first().evaluate(el=>document.activeElement===el),true,'keyboard focus follows the addressed original record');
  await page.locator('[data-reading-start="asc"]').click();
  await eventually(async()=>await page.locator('#original-reading-body [data-entry-id]').first().getAttribute('data-entry-id')===firstId,'earlier-time jump starts with the original earliest record');
  assert.equal((await rpc(page,'GET_ORGANIZER_CONTROLS')).readingSort,'asc');
  const afterFirst=await rpc(page,'GET_LIBRARY_ENTRY',{id:firstId}),afterLatest=await rpc(page,'GET_LIBRARY_ENTRY',{id:latestId});
  assert.equal(afterFirst.body,beforeFirst.body);
  assert.equal(afterFirst.revision,beforeFirst.revision);
  assert.equal(afterLatest.body,beforeLatest.body);
  assert.equal(afterLatest.revision,beforeLatest.revision,'time jumps change no human content or revision');
  assert.ok(await page.locator('#original-reading-body [data-entry-id]').count()<=120,'Topic keeps its bounded continuous reading window');
  await shot(page,release?'uir-03-current-release-topic-original-1440x900-light':'uir-03-topic-original-1440x900-light');

  if(!release){
    await rpc(page,'UPDATE_PREFERENCES',{changes:{appearance:'dark'}});
    await eventually(async()=>await page.evaluate(()=>document.documentElement.dataset.paiaTheme)==='dark');
    assert.notEqual(await page.locator('#thought-document').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(255, 255, 255)','dark Topic does not force a white document shell');
    await shot(page,'uir-03-topic-original-1440x900-dark');
    await rpc(page,'UPDATE_PREFERENCES',{changes:{appearance:'light'}});
    await eventually(async()=>await page.evaluate(()=>document.documentElement.dataset.paiaTheme)==='light');

    for(const [width,height] of [[1024,768],[390,844]]){
      await page.setViewportSize({width,height});
      await pause(80);
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
      assert.ok(overflow<=2,`${width}px Topic has no root horizontal overflow; got ${overflow}`);
      if(width===390){
        const searchBox=await page.locator('#topic-search').boundingBox();
        const continueBox=await page.locator('#create-entry').boundingBox();
        assert.ok(searchBox&&searchBox.height>=44,'mobile Topic search keeps a 44px target');
        assert.ok(continueBox&&continueBox.height>=44,'mobile continue-thinking action keeps a 44px target');
        await shot(page,'uir-03-topic-original-390x844-light',{fullPage:false});
      }
    }
  }

  await assertOffline(h);
}

test('UIR-03 Thought home and Topic Original presentation keep existing identity, editing owners and reading width in source and built release Chrome',{timeout:300000},async()=>{
  let source;
  try{
    source=await FakeChatGPT.start({onboarding:true});
    const page=await ready(source);
    const topics=await seed(page,'UIR03_SOURCE');
    await homeAndOriginalJourney(page,source,topics);
  }finally{
    await source?.close();
  }

  await execFileAsync('python3',['scripts/build_current_release.py'],{cwd:process.cwd(),maxBuffer:16*1024*1024});
  let release;
  try{
    release=await FakeChatGPT.start({extensionPath:'work/current-release',onboarding:true});
    const page=await ready(release);
    const topics=await seed(page,'UIR03_RELEASE');
    await homeAndOriginalJourney(page,release,topics,{release:true});
  }finally{
    await release?.close();
  }
});

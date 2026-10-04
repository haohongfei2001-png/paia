import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {FakeChatGPT,eventually} from '../tests/harness/fake-chatgpt.mjs';
import {openD5Reference} from '../tests/harness/d5-shell-reference.mjs';

const directory='work/desktop-appearance-preview';
const sample=[
 '我可能更适合做消费产品，但现在样本还太少。我不想把一次顺利的试做，写成对自己的永久结论。',
 '最近越来越希望做面向普通人的工具。我在意的不只是“能完成什么”，还有人愿不愿意一直用下去。',
 '但我不想因为“AI”这个词，就把过去学到的东西全部否定。目前更确定的是我想解决的问题，而不是某个职位的名字。'
];
const titles=['职业方向','做一个轻一点的产品','长期学习'];
const rpc=async(page,type,fields={})=>{const r=await page.evaluate(message=>chrome.runtime.sendMessage(message),{type,...fields});assert.equal(r.ok,true,JSON.stringify(r));return r.data;};
const frame=page=>page.evaluate(async()=>{await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
const capture=async(page)=>page.evaluate(()=>{
 const read=node=>{if(!node)return null;const r=node.getBoundingClientRect(),s=getComputedStyle(node);return {text:node.textContent,x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom,font:s.fontSize,lineHeight:s.lineHeight,color:s.color,background:s.backgroundColor};};
 const preview=document.body.dataset.desktopAppearancePreview,selectors={topic:'#thought-document',compose:'.thought-compose-workspace',organize:'.organize-scope-workspace',context:'#context-workspace-design-preview .context-presentation-workspace'},root=preview?document.querySelector(selectors[preview]):document.querySelector('.workspace.context,.workspace.wide,.workspace');
 return {viewport:{width:innerWidth,height:innerHeight},overflow:document.documentElement.scrollWidth-innerWidth,modal:!!document.querySelector('dialog:modal'),root:read(root),heading:read(root?.querySelector('h1,h2')),firstBody:read(root?.querySelector('.entry-prose,textarea,.material-snippet,.organize-scope-primary')),header:read(document.querySelector('.workspace-header,.topbar')),visibleControls:[...root?.querySelectorAll('button,summary,input,select,textarea')||[]].filter(node=>{const r=node.getBoundingClientRect();return r.width&&r.height&&getComputedStyle(node).visibility!=='hidden';}).map(node=>({tag:node.tagName,disabled:node.disabled||false,...read(node)}))};
});

for(const variant of ['source','release'])test(`Full Desktop appearance preview from shared production components (${variant})`,{timeout:300000},async()=>{
 await mkdir(directory,{recursive:true});if(variant==='release')execFileSync('python3',['scripts/build_current_release.py'],{maxBuffer:16*1024*1024});
 const h=await FakeChatGPT.start(variant==='release'?{extensionPath:'work/current-release'}:{}),page=h.archive,rows=[],errors=[],head=process.env.PAIA_TESTED_HEAD||execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 const persist=result=>writeFile(`${directory}/${variant}.json`,JSON.stringify({head,variant,result,rows,errors,scope:'Opt-in complete-layout preview using real production components. Normal entry routes use the new presentation; unconnected T05/O01 commit and return controls remain explicit. Exact production/source data and existing authorization owners stay authoritative.'},null,2));
 try{
  await persist('PENDING');await page.locator('#consent-check').check();await page.locator('#enable-consent').click();if(await page.locator('#onboarding-skip').isVisible())await page.locator('#onboarding-skip').click();
  await rpc(page,'UPDATE_PREFERENCES',{changes:{language:'zh-CN',appearance:'light',fontSize:'small',readingWidth:'wide'}});
  for(let i=0;i<3;i++)await h.open({id:'dvn-preview-context-'+i,title:titles[i],base:1609459200+i*86400,messages:[{id:'dvn-preview-input-'+i,text:sample[i]}]});
  await eventually(async()=>(await h.state()).records.length===3);const originals=structuredClone((await h.state()).records);await page.bringToFront();
  const seed=await page.evaluate(async sample=>{
   const {OrganizerStore}=await import('../core/organizer/store.js'),store=new OrganizerStore(chrome.storage.local),topic=await store.createTopic({name:'职业方向',operationId:crypto.randomUUID()}),evidence=[],ids=[];
   for(const year of [2021,2023,2024,2025,2026])for(let i=0;i<2;i++){const at=new Date(Date.UTC(year,i,i+1,10,24)).toISOString();store.clock=()=>at;ids.push((await store.continueThinking({operationId:crypto.randomUUID(),topicId:topic.id,body:sample[i]})).id);evidence.push({id:'normal-'+year+'-'+i,year,date:`${year}年${i+1}月${i+1}日`,body:sample[i]});}
   await store.repository.close();return {topicId:topic.id,ids,evidence};
  },sample);
  const before=await Promise.all(seed.ids.map(id=>rpc(page,'GET_LIBRARY_ENTRY',{id})));
  const contextModel={purpose:'准备一次产品设计面试。我想让 AI 了解我的职业选择、河岸散步试作，以及那些还没有决定的部分。',materials:sample.map((body,i)=>({id:'synthetic-material-'+i,title:titles[i],body})),suggestions:sample.slice(0,2).map((body,i)=>({id:'synthetic-suggestion-'+i,body})),output:{purpose:'准备一次产品设计面试。我想让 AI 了解我的职业选择、河岸散步试作，以及那些还没有决定的部分。',sections:[{title:'职业方向',paragraphs:sample.slice(1),meta:'2021—2026 · 合成示例材料'},{title:'做一个轻一点的产品',body:'河岸散步是一次很小的试作。我原本想把路线规划得更完整，后来发现，有人只是在傍晚走十分钟。',meta:'2023—2026 · 合成示例材料'}]}};
  await rpc(page,'SAVE_DEEPSEEK_CREDENTIAL',{config:{apiKey:'synthetic-appearance-preview-only'}});await rpc(page,'PAIA_MEMORY_SETTINGS',{options:{externalAccess:true,localOnly:false}});
  const open=options=>page.evaluate(async options=>{globalThis.__desktopPreview=await(await import(chrome.runtime.getURL('ui/archive.js'))).openDesktopAppearancePreview(options);return !!__desktopPreview;},options);
  const normalScope=await rpc(page,'GET_AI_PRESENTATION_SCOPE',{options:{topicId:seed.topicId}});
  for(const screen of ['topic','years','organize','context-task','context-select','context-retrieve','context-review','context-ready','compose']){
   const route=screen==='topic'?'topic-original':screen==='years'?'longitudinal':screen==='compose'?'add-thought':screen==='organize'?'organize-scope':screen,reference=await openD5Reference(h,route);
   try{
    await reference.setViewportSize({width:1440,height:900});await reference.screenshot({path:`${directory}/${variant}-${screen}-canonical-original.png`,animations:'disabled'});
    if(screen==='topic'){
     await reference.evaluate(evidence=>{DVN.evidence.splice(0,DVN.evidence.length,...evidence);location.hash='topics-root';},seed.evidence);await reference.goto('https://paia-reference.invalid/screens/index.html#topic-original');
     assert.equal(await open({screen:'topic',topicId:seed.topicId}),true);await page.evaluate(async()=>{await __desktopPreview.presenter.owner.changeReadingSort('desc',{fromStart:true});__desktopPreview.presenter.sync();});
    }else if(screen==='years'){await page.locator('[data-topic-view=years]').click();await page.locator('#topic-timeline .topic-year-section').first().waitFor();assert.equal(await page.locator('#thought-document').evaluate(node=>node.classList.contains('dvn-topic-composition')),true);assert.equal(await page.locator('.dvn-topic-years').isVisible(),false);}
    else if(screen==='organize')assert.equal(await open({screen:'organize',topicId:seed.topicId,scope:normalScope}),true);
    else if(screen==='compose'){
     assert.equal(await open({screen:'topic',topicId:seed.topicId}),true);await page.locator('#create-entry').click();await page.locator('.thought-compose-workspace').waitFor();await page.locator('.thought-compose-workspace textarea').fill('我还没有确定结论。先把今天看到的变化留下来。');await page.locator('.thought-compose-workspace textarea').blur();
    }else{
     if(screen==='context-task'){await page.locator('#primary-nav [data-view=memory]').click();await page.locator('#context-workspace-design-preview').waitFor();assert.match(await page.locator('#context-workspace-design-preview').innerText(),/功能未开放/);assert.equal(await page.locator('#context-workspace-design-preview [data-preview-action]:enabled').count(),0);assert.equal(await open({screen:'context',step:'task',model:contextModel}),true);}
     else await page.evaluate(stage=>__desktopPreview.presenter.setStage(stage),screen.slice('context-'.length));
    }

    if(screen.startsWith('context-')){await reference.evaluate(({materials,suggestions,titles,route})=>{DVN.materials.splice(0,DVN.materials.length,...materials.concat(suggestions));for(let i=0;i<titles.length;i++)DVN.topics[i].title=titles[i];location.hash='topics-root';},{materials:contextModel.materials,suggestions:contextModel.suggestions,titles,route});await reference.goto('https://paia-reference.invalid/screens/index.html#'+route);if(screen==='context-task')await reference.locator('textarea').fill(contextModel.purpose);}
    const sizes=[[1440,'light'],[1440,'dark']];if(['topic','organize','context-task','context-select','compose'].includes(screen))sizes.push([320,'dark']);if(['topic','context-task','compose'].includes(screen))sizes.push([1280,'light'],[1024,'light'],[768,'light']);
    for(const [width,theme]of sizes){
     await page.setViewportSize({width,height:900});await reference.setViewportSize({width,height:900});await rpc(page,'UPDATE_PREFERENCES',{changes:{appearance:theme}});await eventually(()=>page.evaluate(theme=>document.documentElement.dataset.paiaTheme===theme,theme));await reference.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);await page.evaluate(()=>scrollTo(0,0));await reference.evaluate(()=>scrollTo(0,0));await frame(page);await frame(reference);
     const actual=await capture(page),expected=await capture(reference),stem=`${directory}/${variant}-${screen}-${width}-${theme}`;await page.screenshot({path:stem+'-actual.png',animations:'disabled'});await reference.screenshot({path:stem+'-reference.png',animations:'disabled'});rows.push({screen,width,theme,actual,reference:expected});await persist('PENDING');
     if(actual.overflow>2)errors.push(`${screen}/${width}/${theme}: horizontal overflow ${actual.overflow}`);if(actual.modal)errors.push(`${screen}/${width}/${theme}: workspace still modal`);
     if(!actual.heading?.width||!actual.heading?.height||!actual.root?.width||!actual.root?.height)errors.push(`${screen}/${width}/${theme}: missing heading`);
    }
   }catch(error){errors.push(screen+': '+(error.stack||error.message));await persist('PENDING');}finally{await reference.close();}
  }
  assert.deepEqual((await h.state()).records,originals,'all preview pages preserve immutable Source');assert.deepEqual(await Promise.all(seed.ids.map(id=>rpc(page,'GET_LIBRARY_ENTRY',{id}))),before,'preview never rewrites existing Thoughts');assert.equal(h.deepSeekRequests.length,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);
  assert.equal(rows.length,32,'all nine complete screens and representative breakpoints are retained');assert.deepEqual(errors,[]);await persist('PASS');
 }catch(error){errors.push(error.stack||error.message);await persist('FAIL');throw error;}finally{await h.close();}
});

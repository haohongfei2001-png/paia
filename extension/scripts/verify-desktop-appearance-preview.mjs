import test from 'node:test';
import assert from 'node:assert/strict';
import {isDeepStrictEqual} from 'node:util';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {FakeChatGPT,eventually} from '../tests/harness/fake-chatgpt.mjs';

const directory='work/desktop-appearance-preview';
const thoughtScreens=new Set(['root','topic','years','compose']);
const masters=new URL('../docs/consumer-product-v1/desktop-vnext/d6-final-visual-master/screens/',import.meta.url);
const d6Dark={'#FFFFFF':'#171D28','#FAFBFD':'#121823','#17233C':'#E8EDF7','#63728A':'#B0BDD0','#68778E':'#A5B4CB','#E6EBF2':'#303B4C','#F4F6FA':'#202939','#EAF1FF':'#263B5B','#235DD3':'#94BAFF','#A34F46':'#E2A295'};
async function renderThoughtReference(page,screen,theme='light'){
 const artboard=screen==='topic'&&theme==='dark'?'T03':{root:'T01',topic:'T02',years:'T04',compose:'T05'}[screen],nativeDark=artboard==='T03'&&theme==='dark',name=artboard+'-1440-'+(nativeDark?'dark':'light')+'.svg',original=await readFile(new URL(name,masters),'utf8'),svg=theme==='dark'&&!nativeDark?original.replace(/#[0-9a-f]{6}/gi,color=>d6Dark[color.toUpperCase()]||color):original;
 await page.setViewportSize({width:1440,height:1000});await page.setContent('<style>html,body{margin:0;background:'+ (theme==='dark'?'#171d28':'#fff')+'}img{display:block;width:1440px;height:1000px}</style><img alt="Approved D6.2 '+artboard+' master" src="data:image/svg+xml;base64,'+Buffer.from(svg).toString('base64')+'">');await page.locator('img').evaluate(node=>node.decode());
 return {artboard,name,paletteDerived:theme==='dark'&&!nativeDark,differentStateReference:nativeDark,sourceKind:nativeDark?'different-state T03 dark reference, not T02 state equivalence':theme==='dark'?'approved-palette derivative, not an independent approved artboard':'approved original'};
}
async function thoughtReference(h,screen){const page=await h.context.newPage();await renderThoughtReference(page,screen);return page;}

const organizeArtboards={organize:'O01','organize-running':'O02','organize-ready':'O03','organize-compare':'O04','organize-decisions':'O05','organize-stale':'O06','organize-many':'O07','organize-first':'O08','organize-failed':'O09'};
async function renderOrganizeReference(page,screen,width=1440,theme='light'){
 const artboard=organizeArtboards[screen],nativeCompact=artboard==='O04'&&width===768,nativeDark=artboard==='O04'&&theme==='dark'&&width===1440,referenceWidth=nativeCompact?768:1440,name=`${artboard}-${referenceWidth}-${nativeDark?'dark':'light'}.svg`,original=await readFile(new URL(name,masters),'utf8'),svg=theme==='dark'&&!nativeDark?original.replace(/#[0-9a-f]{6}/gi,color=>d6Dark[color.toUpperCase()]||color):original;
 await page.setViewportSize({width:referenceWidth,height:1000});await page.setContent('<style>html,body{margin:0;background:'+(theme==='dark'?'#171d28':'#fff')+'}img{display:block;width:'+referenceWidth+'px;height:1000px}</style><img alt="Approved D6.2 '+artboard+' master" src="data:image/svg+xml;base64,'+Buffer.from(svg).toString('base64')+'">');await page.locator('img').evaluate(node=>node.decode());
 return {artboard,name,width:referenceWidth,height:1000,paletteDerived:theme==='dark'&&!nativeDark,comparison:width===referenceWidth?'approved geometry reference; actual fields, explicit preview disclosure and saved preferences retained':'responsive-rule derivative; no independent reference at this width'};
}
async function organizeReference(h,screen){const page=await h.context.newPage();await renderOrganizeReference(page,screen);return page;}


const contextArtboards={'context-task':'C01','context-select':'C02','context-retrieve':'C03','context-review':'C04','context-ready':'C08','context-empty':'C00','context-edit':'C05','context-stale':'C06','context-budget':'C07','context-copied':'C09','context-blocked':'C10','context-incomplete':'C11'};
async function renderContextReference(page,screen,width=1440,theme='light'){
 const artboard=contextArtboards[screen],referenceWidth=artboard==='C01'&&[320,768].includes(width)?width:1440,nativeDark=artboard==='C04'&&theme==='dark'&&width===1440,name=`${artboard}-${referenceWidth}-${nativeDark?'dark':'light'}.svg`,original=await readFile(new URL(name,masters),'utf8'),svg=theme==='dark'&&!nativeDark?original.replace(/#[0-9a-f]{6}/gi,color=>d6Dark[color.toUpperCase()]||color):original;
 await page.setViewportSize({width:referenceWidth,height:1000});await page.setContent('<style>html,body{margin:0;background:'+(theme==='dark'?'#171d28':'#fff')+'}img{display:block;width:'+referenceWidth+'px;height:1000px}</style><img alt="Approved D6.2 '+artboard+' master" src="data:image/svg+xml;base64,'+Buffer.from(svg).toString('base64')+'">');await page.locator('img').evaluate(node=>node.decode());
 return {artboard,name,width:referenceWidth,height:1000,paletteDerived:theme==='dark'&&!nativeDark,comparison:width===referenceWidth?'approved geometry reference; display-only disclosure, supplied snapshots and saved 17px/680px preferences retained':'responsive-rule derivative; no approved Context artboard at this width'};
}
async function contextReference(h,screen){const page=await h.context.newPage();await renderContextReference(page,screen);return page;}

const settingsArtboards={'settings-reading':'S01','settings-capture':'S03','settings-data':'S04','settings-invalid':'S05'};
async function captureSettingsPages(h,variant,rows,persist){
 const page=h.archive,reference=await h.context.newPage();
 const choose=async group=>{const select=page.locator('#ux-settings-group-switch');if(await select.isVisible())await select.selectOption(group);else await page.locator(`[data-settings-group="${group}"]`).click();await page.locator(`[data-group="${group}"]`).waitFor({state:'visible'});};
 try{
  await page.setViewportSize({width:1440,height:1000});await settlePrimary(page,1440);await page.locator('.sidebar-bottom [data-view=settings]').click();await page.locator('#settings-panel').waitFor({state:'visible'});
  await choose('data');await page.locator('#ux-history-start').click();await page.locator('#history-dialog').waitFor({state:'visible'});assert.equal(await page.locator('#history-file-consent').isChecked(),false);await page.locator('#history-close').click();assert.equal(await page.locator('#history-dialog').isVisible(),false);
  for(const [screen,artboard]of Object.entries(settingsArtboards)){
   await choose(screen==='settings-reading'?'reading':screen==='settings-capture'?'content':'data');
   if(screen==='settings-invalid'){
    const picker=page.waitForEvent('filechooser');await page.locator('#backup-choose').click();await (await picker).setFiles({name:'synthetic-invalid.paia-backup',mimeType:'application/x-ndjson',buffer:Buffer.from('{"not":"a PAIA backup"}\n')});
    await page.locator('#backup-settings[data-inspection-failure]').waitFor();assert.equal(await page.locator('#backup-restore').isDisabled(),true);assert.match(await page.locator('#backup-status').innerText(),/未修改任何内容/);
   }
   for(const [width,theme]of [[1440,'light'],[1440,'dark'],[320,'dark']]){
    await page.setViewportSize({width,height:1000});await settlePrimary(page,width);await rpc(page,'UPDATE_PREFERENCES',{changes:{appearance:theme}});await eventually(()=>page.evaluate(theme=>document.documentElement.dataset.paiaTheme===theme,theme));await page.evaluate(()=>scrollTo(0,0));await frame(page);
    const name=`${artboard}-1440-light.svg`,original=await readFile(new URL(name,masters),'utf8'),svg=theme==='dark'?original.replace(/#[0-9a-f]{6}/gi,color=>d6Dark[color.toUpperCase()]||color):original;
    await reference.setViewportSize({width:1440,height:1000});await reference.setContent('<style>body{margin:0}img{display:block}</style><img alt="Approved D6.2 '+artboard+' reference" src="data:image/svg+xml;base64,'+Buffer.from(svg).toString('base64')+'">');await reference.locator('img').evaluate(node=>node.decode());
    const actual=await capture(page),stem=`${directory}/${variant}-${screen}-${width}-${theme}`,rail=width>=1280?184:width>=1024?160:width>=768?64:0,gutter=width<768?20:width<1024?36:44;
    await page.screenshot({path:stem+'-actual.png',animations:'disabled'});await reference.screenshot({path:stem+'-reference.png',animations:'disabled'});rows.push({screen,width,theme,actual,reference:{artboard,name,width:1440,height:1000,paletteDerived:theme==='dark',comparison:screen==='settings-invalid'?'Real rejected inspection in the existing Backup owner; exact file reason and an explicit cancel/return action remain. Compact is a responsive-rule derivative.':'Ordinary Settings group; original functional controls and six-group navigation retained. S03/S04 use standalone master hierarchy within the existing Settings owner; compact is a responsive-rule derivative.'}});await persist('PENDING');
    assert.ok(actual.overflow<=2,screen+' no horizontal overflow');assert.ok(Math.abs(actual.heading.x-rail-gutter)<=2,screen+' D6.2 left axis');assert.ok(Math.abs(actual.root.width-Math.min(880,width-rail-gutter*2))<=2,screen+' 880px layout cap');assert.equal(parseFloat(actual.heading.font),width<768?24:28);assert.equal(actual.modal,false);assert.match(await page.locator('#ux-settings-title').evaluate(node=>getComputedStyle(node).fontFamily),/Georgia/);assert.equal(await page.locator('.sidebar [data-view=settings]').getAttribute('aria-current'),'page');
    if(screen==='settings-reading'){assert.equal(await page.locator('#ux-font-size').inputValue(),'standard');assert.equal(await page.locator('#ux-reading-width').inputValue(),'standard');assert.equal(await page.locator('#ux-appearance').isEnabled(),true);assert.equal(await page.locator('#ux-reduced-motion :is(input,select,button)').count(),0);}
    if(screen==='settings-capture'){assert.match(await page.locator('#ux-capture-last').innerText(),/最近一次成功扫描|尚无成功扫描/);assert.equal(await page.locator('#toggle-capture').isEnabled(),true);}
    if(screen==='settings-data'){for(const id of ['ux-history-start','backup-create','backup-create-segmented','backup-choose','r6-export-json','r6-export-markdown'])assert.equal(await page.locator('#'+id).isEnabled(),true);}
    if(screen==='settings-invalid'){
     assert.equal(await page.locator('h1:visible').count(),1);assert.equal(actual.heading.text,'数据与恢复');assert.equal(await page.locator('.ux-settings-nav').isVisible(),false);assert.equal(await page.locator('#ux-history-start').isVisible(),false);assert.equal(await page.locator('#backup-create').isVisible(),false);
     assert.equal(await page.locator('#ux-backup-failure-title').evaluate(node=>getComputedStyle(node).fontSize),'24px','S05 failure heading matches the actual master type size');
     assert.equal(await page.locator('#backup-choose').innerText(),'重新选择文件');assert.equal(await page.locator('#backup-choose').isEnabled(),true);assert.equal(await page.locator('#backup-failure-return').isEnabled(),true);
     assert.equal(await page.locator('#backup-settings > :first-child').getAttribute('id'),'backup-failure-page-title');assert.equal(await page.locator('#backup-choose').getAttribute('aria-describedby'),'ux-backup-failure-title backup-status');
     for(const id of ['ux-backup-failure-title','backup-status','backup-choose']){const box=await page.locator('#'+id).boundingBox();assert.ok(box&&box.y>=0&&box.y+box.height<=1000,id+' is visible in the first S05 viewport');}
     if(width<768)for(const id of ['backup-choose','backup-failure-return']){const box=await page.locator('#'+id).boundingBox();assert.ok(box&&box.width>=44&&box.height>=44,id+' keeps the compact 44px action target');}
     if(width===1440){const title=await page.locator('#ux-backup-failure-title').boundingBox(),choose=await page.locator('#backup-choose').boundingBox();assert.ok(Math.abs(title.x-228)<=2&&Math.abs(title.y-154)<=2,'S05 failure title uses its master axis');assert.ok(Math.abs(choose.x-228)<=2&&Math.abs(choose.y-288)<=2,'S05 reselect button uses its master axis');}
    }
   }
  }
  const inspectionChecks={};rows.at(-1).inspectionChecks=inspectionChecks;
  await page.evaluate(()=>{globalThis.__s05TextZoom=[...document.querySelectorAll('#backup-failure-page-title,#ux-backup-failure-title,#backup-status,#backup-choose,#backup-failure-return,#backup-failure-note')].map(node=>({node,value:node.style.getPropertyValue('font-size'),priority:node.style.getPropertyPriority('font-size'),size:parseFloat(getComputedStyle(node).fontSize)}));for(const row of __s05TextZoom)row.node.style.setProperty('font-size',row.size*2+'px','important');});
  try{
   await frame(page);await page.evaluate(()=>scrollTo(0,0));assert.ok((await capture(page)).overflow<=2,'S05 text200 retains horizontal reflow');
   inspectionChecks.text200=await page.evaluate(()=>__s05TextZoom.map(({node})=>{const box=node.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(node);return{id:node.id,font:getComputedStyle(node).fontSize,inside:[...range.getClientRects()].every(r=>r.left>=box.left-2&&r.right<=box.right+2&&r.top>=box.top-2&&r.bottom<=box.bottom+2)};}));
   assert.equal(inspectionChecks.text200.find(row=>row.id==='backup-failure-page-title').font,'48px');for(const row of inspectionChecks.text200)assert.equal(row.inside,true,row.id+' text200 fits its real control/text box');
   const title=await page.locator('#backup-failure-page-title').boundingBox(),back=await page.locator('#backup-failure-return').boundingBox();assert.ok(title.x+title.width<=back.x,'S05 text200 title and return do not overlap');
   await page.screenshot({path:`${directory}/${variant}-settings-invalid-320-dark-text200-actual.png`,animations:'disabled'});await persist('PENDING');
  }finally{await page.evaluate(()=>{for(const row of __s05TextZoom)row.node.style.setProperty('font-size',row.value,row.priority);delete globalThis.__s05TextZoom;});await frame(page);}
  await page.setViewportSize({width:1440,height:1000});await settlePrimary(page,1440);const touch=await h.context.newCDPSession(page);
  try{await touch.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});await frame(page);assert.equal(await page.evaluate(()=>matchMedia('(pointer:coarse)').matches),true);inspectionChecks.coarse=[];for(const id of ['backup-choose','backup-failure-return']){const box=await page.locator('#'+id).boundingBox();inspectionChecks.coarse.push({id,...box});assert.ok(box&&box.width>=44&&box.height>=44,id+' retains desktop coarse 44px target');}await persist('PENDING');}
  finally{await touch.send('Emulation.setTouchEmulationEnabled',{enabled:false});await touch.detach();await page.setViewportSize({width:320,height:1000});await settlePrimary(page,320);}
  // Cancel the real failed-inspection view with a trusted keyboard action. The
  // existing Data controls and original picker return without a new route.
  await page.locator('#backup-failure-return').focus();await page.keyboard.press('Enter');await eventually(()=>page.locator('#backup-settings[data-inspection-failure]').count().then(n=>n===0));assert.equal(await page.evaluate(()=>document.activeElement?.id),'backup-choose');assert.equal(await page.locator('#ux-history-start').isVisible(),true);assert.equal(await page.locator('#r6-export-json').isEnabled(),true);
  await page.locator('#archive-compact-navigation > summary').click();await page.locator('#archive-compact-nav-items [data-view=library]').click();await settlePrimary(page,320);await page.locator('#archive-compact-navigation > summary').click();await page.locator('#archive-compact-nav-items [data-view=settings]').click();await settlePrimary(page,320);await page.locator('#settings-panel').waitFor({state:'visible'});assert.equal(await page.locator('#ux-settings-shell').count(),1);
 }finally{await reference.close();}
}


const sample=[
 '我可能更适合做消费产品，但现在样本还太少。我不想把一次顺利的试做，写成对自己的永久结论。',
 '最近越来越希望做面向普通人的工具。我在意的不只是“能完成什么”，还有人愿不愿意一直用下去。',
 '但我不想因为“AI”这个词，就把过去学到的东西全部否定。目前更确定的是我想解决的问题，而不是某个职位的名字。'
];
const titles=['职业方向','做一个轻一点的产品','长期学习'];
const rpc=async(page,type,fields={})=>{const r=await page.evaluate(message=>chrome.runtime.sendMessage(message),{type,...fields});assert.equal(r.ok,true,JSON.stringify(r));return r.data;};
const frame=page=>page.evaluate(async()=>{await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
// Same settled-parent boundary as the adopted D7 Archive journey. A breakpoint
// acknowledgement alone does not establish that primary buttons have moved.
async function settlePrimary(page,width){
 await eventually(()=>page.evaluate(width=>{
  const menu=document.getElementById('archive-compact-navigation'),compact=width<768&&['library','archive','thoughts','memory','settings'].includes(document.body.dataset.paiaSpace),buttons=[...document.querySelectorAll('.sidebar [data-view]')];
  return innerWidth===width&&buttons.length===4&&menu.hidden===!compact&&!menu.open&&buttons.every(node=>compact?node.parentElement.id==='archive-compact-nav-items':node.dataset.view==='settings'?node.parentElement.classList.contains('sidebar-bottom'):node.parentElement.id==='primary-nav');
 },width),'primary navigation final breakpoint parents and disclosure state').catch(async error=>{const actual=await page.evaluate(()=>({width:innerWidth,space:document.body.dataset.paiaSpace,menu:{hidden:document.getElementById('archive-compact-navigation').hidden,open:document.getElementById('archive-compact-navigation').open},buttons:[...document.querySelectorAll('.sidebar [data-view]')].map(n=>({view:n.dataset.view,parent:n.parentElement.id||n.parentElement.className}))}));throw Error(error.message+' '+JSON.stringify(actual));});
}
async function selectWidePrimary(page,view){
 await page.setViewportSize({width:1440,height:1000});await settlePrimary(page,1440);await page.locator(`#primary-nav [data-view="${view}"]`).click();
}

const rootMenuSelector='#thought-root-source>.library-actions>summary,.topic-compact-row>.library-actions>summary';
async function verifyRootMenuGlyphs(page){
 const rows=await page.locator(rootMenuSelector).evaluateAll(nodes=>nodes.map(node=>{
  const box=node.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(node);const glyph=range.getBoundingClientRect(),style=getComputedStyle(node),row=node.closest('.topic-compact-row')?.getBoundingClientRect();
  return {label:node.getAttribute('aria-label'),text:node.textContent,font:style.fontFamily,size:style.fontSize,box:{left:box.left,right:box.right,top:box.top,bottom:box.bottom,width:box.width,height:box.height},glyph:{left:glyph.left,right:glyph.right,top:glyph.top,bottom:glyph.bottom,width:glyph.width},rowRight:row?.right};
 }));
 assert.equal(rows.length,7,'six real Topic menus and the existing root menu remain');
 for(const row of rows){assert.equal(row.text,'···');assert.ok(row.label);assert.ok(row.box.width>=44&&row.box.height>=44,'native menu retains its 44px target');assert.ok(row.glyph.left>=row.box.left-1&&row.glyph.right<=row.box.right+1,'all three visible dots fit the real trigger');if(row.rowRight)assert.ok(row.glyph.right<=row.rowRight+1,'Topic marker stays inside its row');}
 return rows;
}
async function verifyRootMenus(page,variant){
 for(const selector of ['#thought-root-source>.library-actions>summary','.topic-compact-row>.library-actions>summary']){
  const trigger=page.locator(selector).first(),menu=trigger.locator('..'),settled=expected=>menu.evaluate((node,expected)=>node.open===expected&&node.firstElementChild.getAttribute('aria-expanded')===String(expected),expected);await trigger.focus();await page.keyboard.press('Enter');await eventually(()=>settled(true),'native Enter and the existing toggle event expose the same open root menu');
  assert.equal(await trigger.getAttribute('aria-expanded'),'true');const first=menu.locator('.library-action-list button').first();await page.keyboard.press('Tab');assert.equal(await first.evaluate(node=>document.activeElement===node),true,'Tab reaches the first real action');
  const bounds=await first.boundingBox();assert.ok(bounds&&bounds.x>=0&&bounds.x+bounds.width<=320,'compact menu action stays within the viewport');
  await page.screenshot({path:`${directory}/${variant}-root-menu-${selector.startsWith('#')?'root':'topic'}-320-open.png`,animations:'disabled'});
  await page.keyboard.press('Escape');await eventually(()=>settled(false));assert.equal(await trigger.evaluate(node=>document.activeElement===node),true,'Escape returns focus to the exact native trigger');
  await trigger.click();await eventually(()=>settled(true),'pointer opens the same native menu');await trigger.click();await eventually(()=>settled(false),'pointer closes the same native menu');
 }
}

const capture=async(page)=>page.evaluate(()=>{
 const read=node=>{if(!node)return null;const r=node.getBoundingClientRect(),s=getComputedStyle(node);return {text:node.textContent,x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom,font:s.fontSize,lineHeight:s.lineHeight,color:s.color,background:s.backgroundColor};};
 const preview=document.body.dataset.desktopAppearancePreview,selectors={topic:'#thought-document',compose:'.thought-compose-workspace',organize:'.organize-scope-workspace',context:'#context-workspace-design-preview .context-presentation-workspace'},root=preview?document.querySelector(selectors[preview]):document.body.dataset.paiaSpace==='settings'?document.querySelector('#ux-settings-shell'):document.body.dataset.paiaSpace==='thoughts'?document.querySelector(document.body.dataset.paiaSurface==='reader'?'#thought-document':'#thought-panel'):document.querySelector('.workspace.context,.workspace.wide,.workspace');
 return {viewport:{width:innerWidth,height:innerHeight},overflow:document.documentElement.scrollWidth-innerWidth,modal:!!document.querySelector('dialog:modal'),root:read(root),heading:read([...root?.querySelectorAll('h1,h2')||[]].find(node=>{const r=node.getBoundingClientRect();return r.width&&r.height&&getComputedStyle(node).visibility!=='hidden';})),firstBody:read(root?.querySelector('.entry-prose,textarea,.material-snippet,.organize-scope-primary')),header:read(document.querySelector('.workspace-header,.topbar')),visibleControls:[...root?.querySelectorAll('button,summary,input,select,textarea')||[]].filter(node=>{const r=node.getBoundingClientRect();return r.width&&r.height&&getComputedStyle(node).visibility!=='hidden';}).map(node=>({tag:node.tagName,disabled:node.disabled||false,...read(node)}))};
});

execFileSync('python3',['docs/consumer-product-v1/desktop-vnext/d6-final-visual-master/source/unpack_masters.py']);

for(const variant of ['source','release'])test(`Full Desktop appearance preview from shared production components (${variant})`,{timeout:300000},async()=>{
 await mkdir(directory,{recursive:true});if(variant==='release')execFileSync('python3',['scripts/build_current_release.py'],{maxBuffer:16*1024*1024});
 const h=await FakeChatGPT.start(variant==='release'?{extensionPath:'work/current-release'}:{}),page=h.archive,rows=[],errors=[],head=process.env.PAIA_TESTED_HEAD||execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 const persist=result=>writeFile(`${directory}/${variant}.json`,JSON.stringify({head,variant,result,rows,errors,scope:'Opt-in complete-layout preview using real production components. Normal entry routes use the new presentation; unconnected T05/O01 commit and return controls remain explicit. Exact production/source data and existing authorization owners stay authoritative.'},null,2));
 try{
  await persist('PENDING');await page.locator('#consent-check').check();await page.locator('#enable-consent').click();if(await page.locator('#onboarding-skip').isVisible())await page.locator('#onboarding-skip').click();
  await rpc(page,'UPDATE_PREFERENCES',{changes:{language:'zh-CN',appearance:'light',fontSize:'standard',readingWidth:'standard'}});
  for(let i=0;i<3;i++)await h.open({id:'dvn-preview-context-'+i,title:titles[i],base:1609459200+i*86400,messages:[{id:'dvn-preview-input-'+i,text:sample[i]}]});
  await eventually(async()=>(await h.state()).records.length===3);const originals=structuredClone((await h.state()).records);await page.bringToFront();
  const seed=await page.evaluate(async sample=>{
   const {OrganizerStore}=await import('../core/organizer/store.js'),store=new OrganizerStore(chrome.storage.local),topic=await store.createTopic({name:'职业方向',operationId:crypto.randomUUID()}),evidence=[],ids=[];
   for(const year of [2021,2023,2024,2025,2026])for(let i=0;i<2;i++){const at=new Date(Date.UTC(year,i,i+1,10,24)).toISOString();store.clock=()=>at;ids.push((await store.continueThinking({operationId:crypto.randomUUID(),topicId:topic.id,body:sample[i]})).id);evidence.push({id:'normal-'+year+'-'+i,year,date:`${year}年${i+1}月${i+1}日`,body:sample[i]});}
   for(const name of ['做一个轻一点的产品','长期学习','边界与自主','写作和表达','河岸散步']){const sibling=await store.createTopic({name,operationId:crypto.randomUUID()});ids.push((await store.continueThinking({operationId:crypto.randomUUID(),topicId:sibling.id,body:sample[0]})).id);}
   await store.repository.close();return {topicId:topic.id,ids,evidence};
  },sample);
  const before=await Promise.all(seed.ids.map(id=>rpc(page,'GET_LIBRARY_ENTRY',{id})));
  const contextModel={purpose:'准备一次产品设计面试。我想让 AI 了解我的职业选择、河岸散步试作，以及那些还没有决定的部分。',materials:sample.map((body,i)=>({id:'synthetic-material-'+i,title:titles[i],body})),suggestions:sample.slice(0,2).map((body,i)=>({id:'synthetic-suggestion-'+i,body})),output:{purpose:'准备一次产品设计面试。我想让 AI 了解我的职业选择、河岸散步试作，以及那些还没有决定的部分。',sections:[{title:'职业方向',paragraphs:sample.slice(1),meta:'2021—2026 · 合成示例材料'},{title:'做一个轻一点的产品',body:'河岸散步是一次很小的试作。我原本想把路线规划得更完整，后来发现，有人只是在傍晚走十分钟。',meta:'2023—2026 · 合成示例材料'}]}};
  contextModel.parts=[{title:'职业方向 · 2021—2023',meta:'给定分份快照 · 未执行分份'},{title:'职业方向 · 2024—2025',meta:'给定分份快照 · 未执行分份'},{title:'近期判断与项目表达',meta:'给定分份快照 · 未执行分份'}];contextModel.coverage={loaded:124,total:160};contextModel.blockedOutput={purpose:contextModel.output.purpose,sections:[contextModel.output.sections[1]]};
  await rpc(page,'SAVE_DEEPSEEK_CREDENTIAL',{config:{apiKey:'synthetic-appearance-preview-only'}});await rpc(page,'PAIA_MEMORY_SETTINGS',{options:{externalAccess:true,localOnly:false}});
  const open=options=>page.evaluate(async options=>{globalThis.__desktopPreview=await(await import(chrome.runtime.getURL('ui/archive.js'))).openDesktopAppearancePreview(options);return !!__desktopPreview;},options);
  const normalScope=await rpc(page,'GET_AI_PRESENTATION_SCOPE',{options:{topicId:seed.topicId}});
  const organizeModel={materials:sample.map((body,i)=>({id:'organize-evidence-'+i,body,meta:['2023年6月18日 · 10:24','2024年9月12日 · 14:08','2025年11月6日 · 20:16'][i]})),current:{blockSummary:sample[0],currentView:sample[1]},candidate:{baseKind:'saved',changedFields:['blockSummary','currentView'],proposal:{blockSummary:'我正在探索消费产品方向。这个倾向仍需要更多真实使用证据，不是最终的职业结论。',currentView:'更在意产品如何被使用，同时保留还没有确定的问题。',evidenceEntryIds:['organize-evidence-0','organize-evidence-1']}},choices:{blockSummary:'adopt',currentView:'adopt'},manyChoices:{blockSummary:'adopt',currentView:'keep',keyInformation:'adopt'}};
  organizeModel.firstCandidate={...organizeModel.candidate,baseKind:'none'};organizeModel.manyCandidate={...organizeModel.candidate,changedFields:['blockSummary','currentView','keyInformation','preferences','decisions','judgments','openQuestions','possibleEvolution'],proposal:{...organizeModel.candidate.proposal,...Object.fromEntries(['keyInformation','preferences','decisions','judgments','openQuestions','possibleEvolution'].map(field=>[field,[{text:'合成候选示例：这处内容仍需要逐项核对，不代表用户已经确认。',evidenceEntryIds:['organize-evidence-0']}]]))}};
  await captureSettingsPages(h,variant,rows,persist);
  for(const screen of ['root','topic','years','organize',...Object.keys(organizeArtboards).filter(key=>key!=='organize'),...Object.keys(contextArtboards),'compose']){
   const route=screen==='topic'?'topic-original':screen==='years'?'longitudinal':screen==='compose'?'add-thought':screen==='organize'?'organize-scope':screen,reference=thoughtScreens.has(screen)?await thoughtReference(h,screen):organizeArtboards[screen]?await organizeReference(h,screen):await contextReference(h,screen);
   try{
    await reference.setViewportSize({width:1440,height:1000});await reference.screenshot({path:`${directory}/${variant}-${screen}-canonical-original.png`,animations:'disabled'});
    if(screen==='root'){
     await selectWidePrimary(page,'thoughts');await page.locator(`[data-topic-id="${seed.topicId}"]`).waitFor();
    }else if(screen==='topic'){
     await page.locator(`[data-topic-id="${seed.topicId}"]`).click();await page.locator('#original-reading-body [data-entry-id]').first().waitFor();
    }else if(screen==='years'){await page.locator('[data-topic-view=years]').click();await page.locator('#topic-timeline .topic-year-section').first().waitFor();await page.locator('#thought-document[data-state=ready]').waitFor();assert.equal(await page.locator('#thought-document').evaluate(node=>node.classList.contains('dvn-topic-composition')),true);assert.equal(await page.locator('.dvn-topic-years').isVisible(),false);}
    else if(screen==='organize')assert.equal(await open({screen:'organize',topicId:seed.topicId,scope:normalScope}),true);
    else if(screen.startsWith('organize-'))assert.equal(await open({screen:'organize',topicId:seed.topicId,scope:normalScope,organizeOptions:{stage:screen.slice(9),model:organizeModel}}),true);
    else if(screen==='compose'){
     await page.setViewportSize({width:1440,height:1000});await selectWidePrimary(page,'thoughts');await page.locator('#thought-document[data-state=ready]').waitFor();await page.locator('#back').click();await page.locator(`[data-topic-id="${seed.topicId}"]`).waitFor();await page.locator(`[data-topic-id="${seed.topicId}"]`).click();await page.locator('#create-entry').click();await page.locator('.thought-compose-workspace').waitFor();await page.locator('.thought-compose-workspace textarea').fill('我还没有确定结论。先把今天看到的变化留下来。');await page.locator('.thought-compose-workspace textarea').blur();
    }else{
     if(screen==='context-task'){await selectWidePrimary(page,'memory');await page.locator('#context-workspace-design-preview').waitFor();assert.match(await page.locator('#context-workspace-design-preview').innerText(),/功能未开放/);assert.equal(await page.locator('#context-workspace-design-preview [data-preview-action]:enabled').count(),0);assert.equal(await page.locator('#context-workspace-design-preview textarea').inputValue(),'');assert.equal(await page.locator('#context-workspace-design-preview [data-preview-material]').count(),0);await page.screenshot({path:`${directory}/${variant}-context-normal-entry-actual.png`,animations:'disabled'});await page.setViewportSize({width:320,height:1000});await settlePrimary(page,320);await page.locator('#archive-compact-navigation > summary').click();await page.locator('#archive-compact-nav-items [data-view=library]').click();await settlePrimary(page,320);await page.locator('#archive-compact-navigation > summary').click();await page.locator('#archive-compact-nav-items [data-view=memory]').click();await settlePrimary(page,320);await page.locator('#context-workspace-design-preview').waitFor();assert.equal(await page.locator('#context-workspace-design-preview').count(),1);await page.screenshot({path:`${directory}/${variant}-context-normal-compact-actual.png`,animations:'disabled'});await page.setViewportSize({width:1440,height:1000});await settlePrimary(page,1440);assert.equal(await open({screen:'context',step:'task',model:contextModel}),true);}
     else await page.evaluate(stage=>__desktopPreview.presenter.setStage(stage),screen.slice('context-'.length));
    }

    const extraContext=contextArtboards[screen]&&!['context-task','context-select','context-retrieve','context-review','context-ready'].includes(screen);const sizes=(screen.startsWith('organize-')||extraContext)?[[1440,'light']]:[[1440,'light'],[1440,'dark']];if(screen==='organize-compare')sizes.push([1440,'dark'],[768,'light'],[320,'light']);if(['root','years'].includes(screen))sizes.push([320,'light']);if(['topic','organize','context-task','context-select','compose'].includes(screen))sizes.push([320,'dark']);if(['topic','context-task','compose'].includes(screen))sizes.push([1280,'light'],[1024,'light'],[768,'light']);
    if(screen==='context-task')sizes.push([320,'light']);
    for(const [width,theme]of sizes){
     await page.setViewportSize({width,height:1000});await settlePrimary(page,width);if(!thoughtScreens.has(screen)&&!organizeArtboards[screen]&&!contextArtboards[screen])await reference.setViewportSize({width,height:1000});await rpc(page,'UPDATE_PREFERENCES',{changes:{appearance:theme}});await eventually(()=>page.evaluate(theme=>document.documentElement.dataset.paiaTheme===theme,theme));await reference.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);await page.evaluate(()=>scrollTo(0,0));await reference.evaluate(()=>scrollTo(0,0));await frame(page);await frame(reference);
     const actual=await capture(page),expected=thoughtScreens.has(screen)?{...await renderThoughtReference(reference,screen,theme),width:1440,height:1000,comparison:width===1440?'supplied geometry/style master; real dataset, full Content window, provenance and saved preferences retained':'responsive-rule derivative; no supplied compact Thought master'}:organizeArtboards[screen]?await renderOrganizeReference(reference,screen,width,theme):await renderContextReference(reference,screen,width,theme),stem=`${directory}/${variant}-${screen}-${width}-${theme}`;await page.screenshot({path:stem+'-actual.png',animations:'disabled'});await reference.screenshot({path:stem+'-reference.png',animations:'disabled'});rows.push({screen,width,theme,actual,reference:expected});await persist('PENDING');
     if(actual.overflow>2)errors.push(`${screen}/${width}/${theme}: horizontal overflow ${actual.overflow}`);if(actual.modal)errors.push(`${screen}/${width}/${theme}: workspace still modal`);
     if(!actual.heading?.width||!actual.heading?.height||!actual.root?.width||!actual.root?.height)errors.push(`${screen}/${width}/${theme}: missing heading`);
     if(organizeArtboards[screen]){
      assert.match(await page.locator('.organize-scope-preview-note').innerText(),/外观预览/);assert.equal(await page.locator('.organize-scope-workspace :is(button,input):enabled').count(),0);
      const rail=width>=1280?184:width>=1024?160:width>=768?64:0,gutter=width<768?20:width<1024?36:44,axis=screen==='organize-failed'?rail+(width<768?20:44):rail+Math.max(gutter,(width-rail-960)/2);
      assert.ok(Math.abs(actual.heading.x-axis)<=2,`${screen}/${width}: D6.2 comparison or failure-page axis`);assert.equal(parseFloat(actual.heading.font),width<768?24:28);assert.match(await page.locator('.organize-scope-title').evaluate(node=>getComputedStyle(node).fontFamily),/Georgia/);
      const disclosures=await page.locator('.organize-scope-workspace summary').evaluateAll(nodes=>nodes.map(node=>({color:getComputedStyle(node).color,evidence:!!node.closest('.ai-candidate-evidence')})));for(const disclosure of disclosures)assert.equal(disclosure.color,disclosure.evidence?(theme==='dark'?'rgb(148, 186, 255)':'rgb(35, 93, 211)'):(theme==='dark'?'rgb(176, 189, 208)':'rgb(99, 114, 138)'),'disclosure follows D6.2 theme ink, not legacy summary green');
      if(screen==='organize-first'){assert.match(await page.locator('.organize-scope-workspace').innerText(),/还没有已保存的 AI 整理/);assert.match(await page.locator('.organize-scope-workspace [data-candidate-version=current]').first().innerText(),/用户原话依据/);}
      if(screen==='organize-many'){assert.equal(await page.locator('.organize-scope-workspace [data-ai-candidate-field]').count(),8);assert.match(await page.locator('.organize-scope-workspace .ai-candidate-footer').innerText(),/3 \/ 8 已决定/);}
      if(screen==='organize'){await page.locator('.organize-scope-details > summary').focus();await page.keyboard.press('Enter');assert.equal(await page.locator('.organize-scope-details').evaluate(node=>node.open),true);assert.match(await page.locator('.organize-scope-details').innerText(),/确认后才发送/);await page.keyboard.press('Enter');assert.equal(await page.locator('.organize-scope-details').evaluate(node=>node.open),false);}
     }
     if(contextArtboards[screen]){
      const root=page.locator('#context-workspace-design-preview');assert.match(await root.innerText(),/功能未开放/);assert.match(await root.innerText(),/未生成、未保存/);assert.equal(await root.locator('[data-preview-action]:enabled').count(),0);assert.equal(await root.locator('input:enabled,textarea:not([readonly])').count(),0);
      const rail=width>=1280?184:width>=1024?160:width>=768?64:0,gutter=width<768?20:width<1024?36:44,standalone=['context-empty','context-incomplete'].includes(screen),axis=rail+(standalone?gutter:Math.max(gutter,(width-rail-880)/2));
      assert.ok(Math.abs(actual.heading.x-axis)<=2,`${screen}/${width}: approved journey or standalone axis`);assert.equal(parseFloat(actual.heading.font),width<768?24:28);assert.match(await root.locator('h1').evaluate(node=>getComputedStyle(node).fontFamily),/Georgia/);
      // Compare every extension-local key and value, including harness prefs.
      // Object insertion order is not stored-data meaning. Keep both complete
      // snapshots so a real difference is diagnosed, never excluded or retried.
      const storage=await page.evaluate(async()=>{
       const before=await chrome.storage.local.get(null);for(const button of document.querySelectorAll('#context-workspace-design-preview [data-preview-action]'))button.dispatchEvent(new MouseEvent('click',{bubbles:true}));await new Promise(resolve=>setTimeout(resolve,0));return {before,after:await chrome.storage.local.get(null)};
      });const changedKeys=[...new Set([...Object.keys(storage.before),...Object.keys(storage.after)])].filter(key=>!isDeepStrictEqual(storage.before[key],storage.after[key]));assert.deepEqual(storage.after,storage.before,'preview actions write no extension-local data; changed keys: '+changedKeys.join(', '));
      if(screen==='context-copied')assert.match(await root.innerText(),/未复制到剪贴板/);
      if(screen==='context-blocked'){const body=await root.locator('[data-context-panel=blocked]').innerText();assert.doesNotMatch(body,/职业方向\n/);assert.match(body,/不显示普通输出快照/);}
      if(['context-review','context-ready'].includes(screen)){const prose=await root.locator(`[data-context-panel=${screen.slice(8)}] .context-preview-prose`).first().evaluate(node=>({size:getComputedStyle(node).fontSize,width:getComputedStyle(node).maxWidth}));assert.deepEqual(prose,{size:'17px',width:'680px'});}
     }
     if(thoughtScreens.has(screen)){
      const rail=width>=1280?184:width>=1024?160:width>=768?64:0,gutter=width<768?20:44;
      assert.ok(Math.abs(actual.heading.x-rail-gutter)<=2,`${screen}/${width}: D6.2 left reading axis`);
      const expectedSize=width<768?24:screen==='compose'?26:28;assert.equal(parseFloat(actual.heading.font),expectedSize,`${screen}/${width}: D6.2 title size`);
      const font=await page.locator(screen==='root'?'#thought-root-heading h1':screen==='compose'?'.thought-compose-title':'#topic-heading h1').evaluate(node=>getComputedStyle(node).fontFamily);assert.match(font,/Georgia/,'D6.2 serif title role');
      if(screen==='root'){rows.at(-1).rootMenuGlyphs=await verifyRootMenuGlyphs(page);await persist('PENDING');}
      if(screen==='compose'){
       assert.equal(await page.locator('.thought-compose-save').isDisabled(),true);assert.equal(await page.locator('.thought-compose-cancel').isDisabled(),true);assert.match(await page.locator('.thought-compose-preview-note').innerText(),/保存与返回尚未接通/);
       assert.equal(await page.locator('.thought-compose-workspace textarea').inputValue(),'我还没有确定结论。先把今天看到的变化留下来。');assert.equal(await page.locator('.thought-compose-topic select').isEnabled(),true);
      }
     }
    }
    if(screen==='root'){
     await verifyRootMenus(page,variant);
     await page.locator(rootMenuSelector).evaluateAll(nodes=>{globalThis.__rootMenuTextZoom=nodes.map(node=>({node,style:node.getAttribute('style')}));for(const node of nodes){const style=getComputedStyle(node),size=parseFloat(style.fontSize),lineHeight=parseFloat(style.lineHeight);node.style.fontSize=size*2+'px';node.style.lineHeight=lineHeight*2+'px';}});
     try{await frame(page);rows.at(-1).rootMenuGlyphsText200=await verifyRootMenuGlyphs(page);await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`${directory}/${variant}-root-menu-glyphs-320-text200.png`,animations:'disabled'});await persist('PENDING');}
     finally{await page.evaluate(()=>{for(const {node,style} of __rootMenuTextZoom){if(style===null)node.removeAttribute('style');else node.setAttribute('style',style);}delete globalThis.__rootMenuTextZoom;});await frame(page);}
     try{await page.locator('#thought-search').fill('职业方向');await eventually(()=>page.locator('#thought-list > .topic-index-row').count().then(n=>n===1),'same scoped search filters the actual root');assert.match(await page.locator('#thought-list > .topic-index-row').innerText(),/职业方向/);}
     finally{await page.locator('#thought-search').fill('');await eventually(()=>page.locator('#thought-list [data-topic-id]').count().then(n=>n===6),'clear restores the actual root');}
     await settlePrimary(page,320);await page.locator('#archive-compact-navigation > summary').click();await page.locator('#archive-compact-nav-items [data-view=thoughts]').click();await page.locator(`[data-topic-id="${seed.topicId}"]`).waitFor();await page.keyboard.press('Escape');await settlePrimary(page,320);
    }
    if(screen==='years'){
     await page.setViewportSize({width:1440,height:1000});await settlePrimary(page,1440);await page.locator('[data-open-year="2026"]').click();await eventually(()=>page.locator('#topic-timeline > .topic-year-expression').count().then(n=>n===2),'existing full-year owner loads both synthetic expressions');
     await page.screenshot({path:`${directory}/${variant}-years-open-2026-actual.png`,animations:'disabled'});await page.getByRole('button',{name:'返回这些年',exact:true}).click();await page.locator('[data-year-section="2026"]').waitFor();
    }
   }catch(error){errors.push(screen+': '+(error.stack||error.message));await persist('PENDING');}finally{await reference.close();}
  }
  assert.deepEqual((await h.state()).records,originals,'all preview pages preserve immutable Source');assert.deepEqual(await Promise.all(seed.ids.map(id=>rpc(page,'GET_LIBRARY_ENTRY',{id}))),before,'preview never rewrites existing Thoughts');assert.equal(h.deepSeekRequests.length,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);
  assert.equal(rows.length,67,'all 55 retained rows plus 12 ordinary Settings source states are captured');assert.deepEqual(errors,[]);await persist('PASS');
 }catch(error){errors.push(error.stack||error.message);await persist('FAIL');throw error;}finally{await h.close();}
});

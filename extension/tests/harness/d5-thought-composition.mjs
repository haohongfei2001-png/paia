import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {openD5Reference} from './d5-shell-reference.mjs';
import {eventually} from './fake-chatgpt.mjs';
const frame=page=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
const rpc=async(page,type,fields={})=>{const value=await page.evaluate(message=>chrome.runtime.sendMessage(message),{type,...fields});assert.equal(value.ok,true);return value.data;};

export async function inspectTopicComposition(page,label){
 const row=await page.evaluate(()=>{
  const read=node=>{const r=node.getBoundingClientRect(),s=getComputedStyle(node);return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height,fontSize:s.fontSize,lineHeight:s.lineHeight,color:s.color,background:s.backgroundColor,border:s.borderTopWidth,borderRadius:s.borderRadius,minHeight:s.minHeight,gap:s.gap,text:node.textContent};};
  const ids=['create-entry','topic-presentation','topic-menu','library-undo','library-redo','ai-library-update','ai-library-retry','topic-source-scope','topic-order-toggle'];
  const glyph=document.getElementById('ai-presentation-toggle'),thumb=getComputedStyle(glyph,':before'),obsolete=getComputedStyle(glyph,':after');
  return {width:innerWidth,overflow:document.documentElement.scrollWidth-innerWidth,heading:read(document.querySelector('#topic-heading h1')),toolbar:read(document.querySelector('.topic-title-actions')),tabs:read(document.getElementById('topic-original-tabs')),switchLabel:read(document.querySelector('.ai-toggle-label')),switchGlyph:read(glyph),thumb:{width:thumb.width,height:thumb.height,transitionDuration:thumb.transitionDuration,obsoleteContent:obsolete.content},controls:Object.fromEntries(ids.map(id=>[id,read(document.getElementById(id))])),sameRow:document.getElementById('topic-toolbar').closest('.topic-title-row')===document.getElementById('topic-heading').parentElement,aiStatusOwnerSeparate:!document.getElementById('topic-toolbar').contains(document.getElementById('library-view-switch')),primaryOrder:[...document.getElementById('topic-toolbar').children].map(node=>node.id||node.className),brand:getComputedStyle(document.documentElement).getPropertyValue('--brand').trim()};
 });
 assert.equal(row.sameRow,true,label+' title and actions share their approved row');assert.deepEqual(row.primaryOrder,['create-entry','topic-menu','library-history-tools']);assert.ok(row.overflow<=2,label+' no horizontal overflow');
 assert.equal(row.controls['create-entry'].border,'0px');assert.equal(row.controls['create-entry'].fontSize,'14px');assert.equal(row.switchLabel.fontSize,'14px');assert.equal(row.switchLabel.border,'0px');assert.equal(row.switchGlyph.width,34);assert.equal(row.switchGlyph.height,20);assert.ok(row.switchLabel.height>=(row.width<768?44:36));
 for(const id of ['ai-library-update','ai-library-retry'])assert.equal(row.controls[id].minHeight,row.width<768?'44px':'36px',label+' '+id+' keeps its independent target floor');assert.equal(row.aiStatusOwnerSeparate,true);assert.deepEqual(row.thumb,{width:'14px',height:'14px',transitionDuration:'0s',obsoleteContent:'none'});
 for(const key of ['create-entry','topic-presentation','topic-menu']){const control=row.controls[key];if(control.height)assert.ok(control.x>=row.toolbar.x-1&&control.right<=row.toolbar.right+1,label+' '+key+' contained');}
 assert.ok(row.tabs.y>=Math.max(row.heading.bottom,row.toolbar.bottom)-1,label+' tabs follow the complete title/action row');
 return row;
}

export async function inspectComposeAppearance(h,variant){
 const page=h.archive,directory='work/qa-dvn-thought-composition',reference=await openD5Reference(h,'add-thought'),rows=[],interactions=[];
 const saved=(await rpc(page,'GET_PAGE',{page:{view:'settings'}})).preferences,viewport=page.viewportSize(),dialog=page.locator('#topic-action-dialog'),draft=dialog.locator('.thought-draft'),original=await draft.inputValue();
 await mkdir(directory,{recursive:true});
 const persist=result=>writeFile(`${directory}/${variant}-compose.json`,JSON.stringify({head:process.env.PAIA_TESTED_HEAD,result,variant,rows,interactions,scope:'Approved T05 writing roles within the existing native modal. Modal hierarchy, Close and optional real Topic controls remain visible; main-workspace navigation is not claimed.'},null,2));
 const measure=(target,ref=false)=>target.evaluate(ref=>{
  const host=document.querySelector(ref?'.workspace':'#topic-action-dialog'),read=node=>{const r=node.getBoundingClientRect(),s=getComputedStyle(node);return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height,fontSize:s.fontSize,lineHeight:s.lineHeight,fontWeight:s.fontWeight,color:s.color,background:s.backgroundColor,border:s.borderTopWidth,borderRadius:s.borderRadius,padding:s.padding,gap:s.gap,marginTop:s.marginTop};};
  return {width:innerWidth,overflow:document.documentElement.scrollWidth-innerWidth,host:read(host),heading:read(host.querySelector(ref?'h1':'h2')),draft:read(host.querySelector('textarea')),actions:read(host.querySelector(ref?'.actions':'.thought-compose-actions')),modal:ref?null:host.matches(':modal'),order:ref?null:[...host.querySelector('.topic-action-content').children].map(node=>node.className),roles:ref?null:[...host.querySelector('.thought-compose-actions').children].map(node=>node.textContent)};
 },ref);
 try{
  await page.evaluate(()=>{globalThis.__composeAppearanceNodes=[document.querySelector('.thought-draft'),document.querySelector('.thought-compose-topics'),...document.querySelectorAll('.thought-compose-actions button')];});
  await draft.fill('我还没有确定结论。先把今天看到的变化留下来。');
  for(const width of [1440,1280,1024,768,390,320])for(const theme of ['light','dark']){
   await page.setViewportSize({width,height:900});await reference.setViewportSize({width,height:900});await rpc(page,'UPDATE_PREFERENCES',{changes:{appearance:theme}});await eventually(()=>page.evaluate(theme=>document.documentElement.dataset.paiaTheme===theme,theme));await reference.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);await page.evaluate(()=>document.fonts.ready);await reference.evaluate(()=>document.fonts.ready);await dialog.evaluate(node=>node.scrollTop=0);await frame(page);await frame(reference);
   const actual=await measure(page),expected=await measure(reference,true),label=`${variant}/${width}/${theme}`;
   assert.equal(actual.modal,true);assert.ok(actual.overflow<=2);assert.ok(Math.abs(actual.host.width-(width<768?width:Math.min(824,width-48)))<=2,label+' declared native-modal container');
   for(const key of ['fontSize','lineHeight','fontWeight','color'])assert.equal(actual.heading[key],expected.heading[key],label+' heading '+key);
   for(const key of ['fontSize','lineHeight','color','background','border','borderRadius'])assert.equal(actual.draft[key],expected.draft[key],label+' textarea '+key);
   assert.equal(actual.actions.gap,'10px');assert.equal(actual.actions.marginTop,'24px');assert.ok(actual.order.indexOf('thought-draft')>actual.order.findIndex(name=>name.includes('thought-compose-topics')));assert.deepEqual(actual.roles,['保存想法','取消','复制当前文字']);
   assert.equal(await page.evaluate(()=>__composeAppearanceNodes.every(node=>node.isConnected&&document.getElementById('topic-action-dialog').contains(node))),true);
   const stem=`${directory}/${variant}-compose-${width}-${theme}`;await page.screenshot({path:stem+'-production.png',animations:'disabled'});await reference.screenshot({path:stem+'-reference.png',animations:'disabled'});rows.push({width,theme,actual,reference:expected});await persist('PENDING');
  }
  await page.setViewportSize({width:320,height:900});await page.evaluate(()=>{globalThis.__composeAppearanceZoom=[...document.querySelectorAll('#topic-action-dialog h2,#topic-action-dialog p,#topic-action-dialog summary,#topic-action-dialog button,#topic-action-dialog textarea')].map(node=>({node,prior:node.style.fontSize,size:parseFloat(getComputedStyle(node).fontSize)}));for(const row of __composeAppearanceZoom)row.node.style.fontSize=row.size*2+'px';});
  try{for(const name of ['保存想法','取消','复制当前文字']){const target=dialog.getByRole('button',{name,exact:true});await target.focus();await frame(page);const point=await target.evaluate(node=>{const r=node.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {focused:document.activeElement===node,height:r.height,hit:hit===node||node.contains(hit)};});assert.ok(point.focused&&point.height>=44&&point.hit);interactions.push({kind:'text200-focus',name,...point});await page.screenshot({path:`${directory}/${variant}-compose-text200-${name==='保存想法'?'save':name==='取消'?'cancel':'copy'}.png`,animations:'disabled'});}assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));}
  finally{await page.evaluate(()=>{for(const row of __composeAppearanceZoom)row.node.style.fontSize=row.prior;delete globalThis.__composeAppearanceZoom;});}
  await draft.focus();for(const name of ['保存想法','取消','复制当前文字']){await page.keyboard.press('Tab');assert.equal(await dialog.getByRole('button',{name,exact:true}).evaluate(node=>document.activeElement===node),true);interactions.push({kind:'native-tab',name});}
  await persist('PASS');
 }catch(error){await persist('FAIL');throw error;}
 finally{await draft.fill(original);await rpc(page,'UPDATE_PREFERENCES',{changes:{appearance:saved.appearance}});await page.setViewportSize(viewport);await reference.close();await draft.focus();await page.evaluate(()=>delete globalThis.__composeAppearanceNodes);}
}

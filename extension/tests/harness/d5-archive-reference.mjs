import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {eventually} from './fake-chatgpt.mjs';
import {openArchiveWindow} from './archive-navigator.mjs';
import {openD5Reference} from './d5-shell-reference.mjs';
async function metrics(p,ref){return p.evaluate(ref=>{
 const measure=selector=>{const e=document.querySelector(selector),r=e.getBoundingClientRect(),c=getComputedStyle(e);return {x:r.x,y:r.y,width:r.width,height:r.height,paddingTop:c.paddingTop,paddingLeft:c.paddingLeft,paddingRight:c.paddingRight,fontSize:c.fontSize,lineHeight:c.lineHeight,borderRightWidth:c.borderRightWidth};};
 return {rail:measure(ref?'.rail':'.sidebar'),navigator:measure(ref?'.navigator':'#archive-navigator'),header:measure(ref?'.topbar':'.workspace-header'),body:measure(ref?'.main>.workspace':'#document-page'),title:measure(ref?'.main h1':'#document-title'),prose:measure(ref?'.prose':'.library-prose'),overflow:document.documentElement.scrollWidth-innerWidth};
 },ref);}
export async function compareD5Archive(h,variant){
 const p=h.archive,ref=await openD5Reference(h,'reader'),rows=[];
 try{
  // Add equivalent canonical synthetic expression content through real capture.
  // The prior UIR fixture is retained unchanged.
  const content=await ref.evaluate(()=>({title:document.querySelector('.main h1').textContent,bodies:[...document.querySelectorAll('.input-entry .prose')].map(e=>e.innerText)}));
  const fixture={id:'d5-q2-'+variant,title:content.title,base:Date.parse('2023-04-27T22:11:00Z')/1000,messages:content.bodies.map((text,i)=>({id:`d5-q2-${variant}-message-${i}`,text}))};
  const response=h.response(fixture),times=['2023-04-27T22:11:00Z','2024-05-09T18:36:00Z','2026-09-18T10:24:00Z'];
  for(const [i,key]of ['first','second','third'].entries()){response.mapping[key].message.create_time=Date.parse(times[i])/1000;response.mapping[key].message.update_time=response.mapping[key].message.create_time+1;}
  h.pending.set(fixture.id,response);await h.open(fixture);
  await eventually(async()=>{const state=await h.state();return content.bodies.every((text,i)=>state.records.some(row=>row.originalText===text&&row.sourceSentAt===new Date(times[i]).toISOString()));},'canonical synthetic expressions captured completely');
  await p.bringToFront();await openArchiveWindow(p,{text:content.title,label:'D5 Reader opens through existing navigation'});
  await eventually(()=>p.locator('#scope-search').isEnabled(),'Reader navigation completes');
  assert.equal(content.bodies.length,3,'canonical fixture contains exactly three expressions');
  await eventually(async()=>await p.locator('.library-prose').count()===3,'all three canonical expressions mounted');
  assert.deepEqual(await p.locator('.library-prose').allTextContents(),content.bodies);
  const renderedTimes=await p.evaluate(times=>times.map(t=>new Date(t).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit',hour12:false})),times);
  assert.deepEqual(await p.locator('#document-body .block-time').allTextContents(),renderedTimes);
  await p.evaluate(()=>globalThis.__d5ReaderNode=document.querySelector('.library-prose'));
  await mkdir('work/qa-dvn-shell/d5-archive',{recursive:true});
  for(const width of [1440,1280,1024,768,320])for(const theme of ['light','dark']){
   await p.setViewportSize({width,height:900});await ref.setViewportSize({width,height:900});
   const r=await p.evaluate(changes=>chrome.runtime.sendMessage({type:'UPDATE_PREFERENCES',changes}),{appearance:theme,language:'zh-CN'});assert.equal(r.ok,true);
   await eventually(()=>p.evaluate(theme=>document.documentElement.dataset.paiaTheme===theme,theme),'D5 Reader settled theme');await ref.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
   await p.emulateMedia({reducedMotion:'reduce'});await ref.emulateMedia({reducedMotion:'reduce'});
   await p.locator('#back').focus();await p.keyboard.press('Tab');
   if(width<1024){assert.equal(await p.evaluate(()=>document.activeElement.id),'archive-navigator-toggle','Tab follows visible Back then Navigator');await p.keyboard.press('Tab');}
   assert.equal(await p.evaluate(()=>document.activeElement.id),'scope-search','Tab reaches search in visual order');await p.locator('#scope-search').evaluate(e=>e.blur());
   const production=await metrics(p,false),reference=await metrics(ref,true);
   const stem=`work/qa-dvn-shell/d5-archive/${variant}-${width}-${theme}`;
   await writeFile(stem+'.json',JSON.stringify({head:process.env.PAIA_TESTED_HEAD,production,reference},null,2));
   await p.screenshot({path:stem+'-production.png',fullPage:true,animations:'disabled'});await ref.screenshot({path:stem+'-reference.png',fullPage:true,animations:'disabled'});
   assert.ok(production.overflow<=1);assert.equal(await p.evaluate(()=>__d5ReaderNode.isConnected),true,'visual changes retain the actual editor node');
   if(width>=1024){
    for(const [key,fields]of Object.entries({navigator:['x','y','width'],header:['x','width'],body:['x','width']}))for(const field of fields)assert.ok(Math.abs(production[key][field]-reference[key][field])<=2,`${width} ${key}.${field}: ${production[key][field]} vs ${reference[key][field]}`);
    assert.equal(production.navigator.borderRightWidth,'1px');
   }else{assert.equal(await p.locator('#archive-navigator-toggle').isVisible(),true,'narrow navigation remains explicit');}
   for(const key of ['paddingTop','paddingLeft','paddingRight'])assert.equal(production.body[key],reference.body[key]);
   assert.equal(production.title.fontSize,reference.title.fontSize);assert.equal(production.title.lineHeight,reference.title.lineHeight);
   assert.equal(await p.locator('.workspace-header #input-time-toggle').count(),1,'same sole order control lives in topbar');
   rows.push({width,theme,production,reference,scope:'Archive fixed composition with canonical synthetic expression content; wrapping follows retained reader preferences'});
  }
  await writeFile(`work/qa-dvn-shell/d5-archive/${variant}.json`,JSON.stringify({head:process.env.PAIA_TESTED_HEAD,result:'PASS',variant,rows},null,2));
 }finally{
  await ref.close();await p.emulateMedia({reducedMotion:'no-preference'});await p.setViewportSize({width:1440,height:900});
  if(await p.locator('#document-panel').isVisible()){await p.locator('#back').click();await eventually(async()=>await p.locator('#collection-panel').isVisible()&&await p.locator('#scope-search').isEnabled(),'D5 comparison returns through existing Back');}
 }
}

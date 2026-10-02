// Canonical docs are served only inside this offline test page, never imported by production.
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {eventually} from './fake-chatgpt.mjs';
const base=new URL('../../docs/consumer-product-v1/desktop-vnext/',import.meta.url);
const files=new Map([['/screens/index.html','text/html'],['/screens/specimens.js','text/javascript'],['/screens/screens.css','text/css'],['/tokens.css','text/css'],['/assets/paia-icon-32.png','image/png']]);
const rpc=async(p,changes)=>{const r=await p.evaluate(changes=>chrome.runtime.sendMessage({type:'UPDATE_PREFERENCES',changes}),changes);assert.equal(r.ok,true);};
async function metrics(p,reference){return p.evaluate(reference=>{
 const get=s=>{const e=document.querySelector(s),r=e.getBoundingClientRect(),c=getComputedStyle(e);return {x:r.x,y:r.y,width:r.width,height:r.height,color:c.color,background:c.backgroundColor,border:c.borderRightColor,fontSize:c.fontSize,lineHeight:c.lineHeight,letterSpacing:c.letterSpacing};};
 return {rail:get(reference?'.rail':'.sidebar'),logo:get(reference?'.logo img':'.brand img'),brand:get(reference?'.logo':'.brand'),first:get(reference?'.rail nav a': '#primary-nav button'),nav:get(reference?'.rail nav':'#primary-nav'),selected:get(reference?'.rail nav a[aria-current]':'#primary-nav button[aria-current="page"]')};
 },reference);}
export async function compareD5Shell(h,variant){
 const p=h.archive,ref=await h.context.newPage(),rows=[];
 try{
  await ref.route('https://paia-reference.invalid/**',async route=>{const path=new URL(route.request().url()).pathname,type=files.get(path);assert.ok(type,'reference requests only fixed local files');await route.fulfill({contentType:type,body:await readFile(new URL(path.slice(1),base))});});
  await ref.goto('https://paia-reference.invalid/screens/index.html#archive-root');
  await mkdir('work/qa-dvn-shell/d5',{recursive:true});
  const logo=await readFile(new URL('../../ui/assets/paia-logo-32.png',import.meta.url));
  assert.equal(createHash('sha256').update(logo).digest('hex'),'6e487abdab45de5f5dbec02f2a05098797616e949c409c93082a4e0488194065');
  for(const width of [1440,1280,1024,768,320])for(const theme of ['light','dark']){
   await p.setViewportSize({width,height:900});await ref.setViewportSize({width,height:900});
   await rpc(p,{language:'en',appearance:theme});await eventually(()=>p.evaluate(theme=>document.documentElement.dataset.paiaTheme===theme&&document.documentElement.lang==='en',theme),'D5 settled theme and locale');
   await ref.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
   await p.emulateMedia({reducedMotion:'reduce'});await ref.emulateMedia({reducedMotion:'reduce'});
   await eventually(()=>p.locator('.brand img').evaluate(e=>e.complete&&e.naturalWidth===32),'approved logo loaded');
   assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'D5 no page overflow');
   const production=await metrics(p,false),reference=await metrics(ref,true);
   if(width>=768){
    for(const [component,keys]of Object.entries({rail:['x','y','width','height'],logo:['x','y','width','height'],nav:['x','y','width'],first:['height']}))for(const key of keys)assert.ok(Math.abs(production[component][key]-reference[component][key])<=2,`${variant} ${width} ${theme} ${component}.${key}: ${production[component][key]} vs ${reference[component][key]}`);
    for(const key of ['background','border'])assert.equal(production.rail[key],reference.rail[key]);
    for(const key of ['color','background'])assert.equal(production.selected[key],reference.selected[key]);
    for(const key of ['fontSize','letterSpacing'])assert.equal(production.brand[key],reference.brand[key]);
   }else{
    assert.equal(production.logo.width,32);assert.equal(production.logo.height,32);
    assert.ok(await p.locator('#primary-nav [aria-current="page"]').isVisible(),'compact current-space navigation remains usable');
   }
   await p.locator('#primary-nav button').first().focus();assert.equal(await p.locator('#primary-nav button').first().evaluate(e=>document.activeElement===e),true);
   const stem=`work/qa-dvn-shell/d5/${variant}-${width}-${theme}`;
   await p.screenshot({path:stem+'-production.png',fullPage:true,animations:'disabled'});await ref.screenshot({path:stem+'-reference.png',fullPage:true,animations:'disabled'});
   rows.push({width,theme,production,reference,comparison:width>=768?'fixed shell geometry <=2px':'compact production navigation; canonical desktop rail absent',scope:'shell only; content surfaces not yet D5 certified'});
  }
  await writeFile(`work/qa-dvn-shell/d5/${variant}.json`,JSON.stringify({result:'PASS',head:process.env.PAIA_TESTED_HEAD||'local-uncommitted',variant,rows,originalLogoSha256:createHash('sha256').update(logo).digest('hex')},null,2));
 }finally{await ref.close();await p.emulateMedia({reducedMotion:'no-preference'});await rpc(p,{language:'zh-CN',appearance:'light'});await p.setViewportSize({width:1440,height:900});}
}

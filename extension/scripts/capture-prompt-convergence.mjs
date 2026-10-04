// Literal frozen targets versus actual extension UI. No runtime CSS/DOM painting.
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {mkdir,writeFile,readFile,readdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {FakeChatGPT,eventually} from '../tests/harness/fake-chatgpt.mjs';
import {routeComposer} from '../tests/harness/prompt-composer.mjs';
const root=fileURLToPath(new URL('..',import.meta.url)),out=join(root,'work/prompt-convergence'),masters=join(root,'docs/consumer-product-v1/prompt-reuse-visual-v1/screens');
await mkdir(out,{recursive:true});
const sha=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
const prompts=['帮我把这件事拆成下一步可以执行的任务','检查一下有没有逻辑漏洞','不要重新设计，继续修改现有方案','用更简单的话解释','比较这两个方案的主要差别','整理成待办清单'];
const files=(await readdir(masters)).filter(x=>x.endsWith('.svg')).sort();
const rpc=async(p,type,fields={})=>{const r=await p.evaluate(x=>chrome.runtime.sendMessage(x),{type,...fields});assert.equal(r.ok,true,JSON.stringify(r));return r.data;};
const hashes={};for(const file of ['content/prompt-surface.js','core/prompt-surface-layout.js','ui/prompt-surface.css','ui/prompt-surface.js'])hashes[file]=createHash('sha256').update(await readFile(join(root,file))).digest('hex');
for(const variant of (process.env.PAIA_VISUAL_VARIANTS||'source,release').split(',')){
 if(variant==='release')execFileSync('python3',['scripts/build_current_release.py'],{cwd:root,stdio:'inherit'});
 const h=await FakeChatGPT.start({extensionPath:variant==='source'?root:join(root,'work/current-release'),headless:true,launchThroughPort:true});
 const receipt={sha,hashes,variant,evidence:'SYNTHETIC_BROWSER',ownerAcceptance:'PENDING',realChatGPT:'DEFERRED_EXTERNAL_EVIDENCE',screens:[]};
 try{
  await h.archive.locator('#consent-check').check();await h.archive.locator('#enable-consent').click();
  const engineering=await h.context.newPage();await engineering.goto('chrome-extension://'+h.extensionId+'/ui/prompt-reuse-test.html');
  const ids=[];for(const text of prompts){const q=await rpc(engineering,'PAIA_PROMPT_QUERY');ids.push((await rpc(engineering,'PAIA_PROMPT_CHANGE',{change:{action:'create',text,revision:q.revision}})).id);}
  for(const id of ids){const q=await rpc(engineering,'PAIA_PROMPT_QUERY');await rpc(engineering,'PAIA_PROMPT_CHANGE',{change:{action:'pin',id,revision:q.revision}});}
  await routeComposer(h.context,root);
  for(let i=0;i<files.length;i++){
   const file=files[i],name=file.replace('.svg',''),compact=i===6,dark=i===5,viewport=compact?{width:390,height:844}:{width:1440,height:900};
   const svg=await readFile(join(masters,file),'utf8');
   const target=await h.context.newPage();await target.setViewportSize(viewport);await target.goto('file://'+join(masters,file));await target.screenshot({path:join(out,'target-'+name+'.png')});await target.close();
   // A saved, bounded site placement is fixture data, not a style override.
   const x=i===0?1229:compact?312:1228,y=i===0?659:compact?638:614;
   await engineering.evaluate(state=>chrome.storage.local.set({promptSurfaceV1:state}),{version:1,open:i!==0,position:{x:x/(viewport.width-44),y:y/(viewport.height-44)}});
   const page=await h.context.newPage();page.on('pageerror',e=>h.errors.push(e.message));await page.setViewportSize(viewport);await page.emulateMedia({colorScheme:dark?'dark':'light',reducedMotion:'reduce'});
   await page.goto('https://chatgpt.com/c/prompt-insertion-fixture');await page.waitForFunction(()=>!!globalThis.fixture?.view);
   // Extract only host background/composer art. All Prompt/orb pixels are production.
   const host=svg.slice(0,svg.indexOf('  <g filter='))+svg.slice(svg.lastIndexOf('  <text x="34"'));
   await page.evaluate(({host,compact,dark})=>{
    const art=new DOMParser().parseFromString(host,'image/svg+xml').documentElement;
    for(const text of [...art.querySelectorAll('text')])if(text.getAttribute('x')===(compact?'42':'362'))text.remove();
    art.id='host-art';art.setAttribute('aria-hidden','true');document.body.prepend(document.importNode(art,true));document.documentElement.classList.toggle('dark',dark);
    document.getElementById('blur').textContent='';document.getElementById('send').textContent='';fixture.set('');
   },{host,compact,dark});
   await page.addStyleTag({content:`html{color-scheme:${dark?'dark':'light'}}body{margin:0;background:${dark?'#151922':'#f8f9fb'};font:16px/24px "Noto Sans CJK SC",system-ui,sans-serif;color:${dark?'#eef2f8':'#1f2937'}}#host-art{position:fixed;inset:0;pointer-events:none}form{position:fixed;left:${compact?20:340}px;top:${compact?694:750}px;width:${compact?350:760}px;height:94px;margin:0;padding:0}#mount{position:absolute;left:22px;top:14px;right:55px}.ProseMirror{outline:0;min-height:24px}.ProseMirror p{margin:0}.ProseMirror p:has(br:only-child):before{content:'Message AI…';position:absolute;pointer-events:none}#send{position:absolute;right:16px;bottom:9px;width:36px;height:36px;border:0;background:transparent}#blur{position:fixed;left:0;top:0;width:1px;height:1px;opacity:0}`});
   const orb=page.locator('[data-paia-prompt-surface]');await orb.waitFor({state:'visible'});let f;
   if(i!==0){await eventually(()=>page.frames().some(x=>x.url().includes('prompt-surface.html#')));f=page.frames().find(x=>x.url().includes('prompt-surface.html#'));await eventually(()=>f.locator('.row').count().then(n=>n===6));await eventually(()=>f.locator('#refresh').isEnabled());}
   if(compact){const q=await rpc(engineering,'PAIA_PROMPT_QUERY');await rpc(engineering,'PAIA_PROMPT_CHANGE',{change:{action:'hide',id:ids[5],revision:q.revision}});await f.locator('#refresh').click();await eventually(()=>f.locator('.row').count().then(n=>n===5));}
   await page.locator('#blur').focus();await page.mouse.move(compact?10:500,100);
   if(i===2)await f.locator('.row').nth(1).hover();
   if(i===3)await f.locator('.row').nth(1).locator('.edit-shortcut').click();
   if(i===4){await f.locator('.row').nth(1).hover();const from=await f.locator('.row').nth(1).locator('.grip').boundingBox(),to=await f.locator('.row').nth(2).boundingBox();await page.mouse.move(from.x+11,from.y+13);await page.mouse.down();await page.mouse.move(to.x+20,to.y+8,{steps:8});}
   if(i===7){await page.locator('#prompt-textarea').focus();await f.locator('.insert').first().click();await eventually(()=>f.locator('#status').textContent().then(x=>x.includes('已插入，未发送')));await page.mouse.move(500,100);}
   await page.waitForTimeout(200);await page.screenshot({path:join(out,variant+'-'+name+'.png'),animations:'disabled',caret:'hide'});
   const orbBox=await orb.boundingBox(),cardBox=f?await(await f.frameElement()).boundingBox():null,formBox=await page.locator('form').boundingBox();
   const disjoint=(a,b)=>a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y;
   for(const box of [orbBox,cardBox].filter(Boolean)){assert.ok(disjoint(box,formBox));assert.ok(box.x>=0&&box.x+box.width<=viewport.width);}
   assert.equal(orbBox.width,44);assert.equal(orbBox.height,44);assert.equal(await page.evaluate(()=>fixture.send),0);assert.equal(await page.evaluate(()=>fixture.text()),i===7?prompts[0]:'');
   if(f){assert.equal(await f.evaluate(()=>getComputedStyle(document.documentElement).color),dark?'rgb(233, 238, 246)':'rgb(29, 39, 56)');assert.ok(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
   receipt.screens.push({name,typography:f?await f.locator('.insert').first().evaluate(el=>({font:getComputedStyle(el).font,body:getComputedStyle(document.body).font})):null,viewport,theme:dark?'dark':'light',dpr:await page.evaluate(()=>devicePixelRatio),scale:1,prompts:compact?prompts.slice(0,5):prompts,orb:orbBox,card:cardBox,composer:formBox,targetSha256:createHash('sha256').update(svg).digest('hex')});
   console.log('CAPTURE',variant,name);
   if(i===4)await page.mouse.up();
   await page.close();
   if(compact){const q=await rpc(engineering,'PAIA_PROMPT_QUERY');await rpc(engineering,'PAIA_PROMPT_CHANGE',{change:{action:'show',id:ids[5],revision:q.revision}});}
  }
  assert.deepEqual(h.errors,[]);assert.deepEqual({external:h.externalRequests,provider:h.deepSeekRequests.length,extension:h.extensionNetworkRequests,history:h.historyRequests},{external:0,provider:0,extension:0,history:0});receipt.capture='PASS';
 }catch(error){receipt.capture='FAIL';receipt.error=error.stack;throw error;}finally{await writeFile(join(out,variant+'.json'),JSON.stringify(receipt,null,2));await h.close();}
}

import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {FakeChatGPT,eventually} from './harness/fake-chatgpt.mjs';
import {openArchiveWindow,waitArchiveWindow} from './harness/archive-navigator.mjs';
const root=fileURLToPath(new URL('..',import.meta.url)),repo=fileURLToPath(new URL('../..',import.meta.url));
const baseline='c168b13170d762b4774740ce218613a45e31cde4',temp=mkdtempSync(join(tmpdir(),'paia-iah-selected-'));
const out=join(root,'work','iah11-selected',new Date().toISOString().replaceAll(':','-'));mkdirSync(out,{recursive:true});
const digest=b=>createHash('sha256').update(b).digest('hex'),head=execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim();
const files=execFileSync('git',['ls-files','extension/core','extension/ui','extension/content','extension/background','extension/tests/harness','extension/package.json','extension/package-lock.json','extension/manifest.json'],{cwd:repo,encoding:'utf8'}).trim().split('\n');
files.push('extension/tests/iah11-selected-acceptance-chrome-e2e.test.mjs');
const hashes=()=>Object.fromEntries(files.map(p=>[p,digest(readFileSync(join(repo,p)))]));const before=hashes();
const require=createRequire(import.meta.url),pw=process.env.PLAYWRIGHT_MODULE;assert.ok(pw,'explicit matching PLAYWRIGHT_MODULE required');
const dependency={module:pw,version:require(join(pw,'package.json')).version};assert.equal(dependency.version,'1.63.0');
execFileSync('tar',['-x','-C',temp],{input:execFileSync('git',['archive',baseline,'extension'],{cwd:repo,maxBuffer:64*1024*1024})});
const release=join(temp,'release');console.log(execFileSync('python3',['scripts/build_current_release.py',release],{cwd:root,encoding:'utf8'}));
const evidence={head,baseline,dependency,before,variants:{},images:{}};
console.log('SELECTED_ACCEPTANCE_OUTPUT='+out);
test.after(()=>{evidence.after=hashes();writeFileSync(join(out,'evidence.json'),JSON.stringify(evidence,null,2));rmSync(temp,{recursive:true,force:true});assert.deepEqual(evidence.after,before,'runtime/fixture bytes remain frozen');});
const rpc=async(p,type,fields={})=>{const r=await p.evaluate(m=>chrome.runtime.sendMessage(m),{type,...fields});assert.equal(r.ok,true,JSON.stringify(r));return r.data;};
const frame=p=>p.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
async function shot(p,name){const path=join(out,name+'.png');await frame(p);await p.screenshot({path});evidence.images[name]=digest(readFileSync(path));}
async function shape(p,selectors){return p.evaluate(selectors=>Object.fromEntries(selectors.map(s=>{const n=document.querySelector(s);if(!n)return[s,null];const b=n.getBoundingClientRect(),c=getComputedStyle(n);return [s,{x:b.x,y:b.y,width:b.width,height:b.height,font:c.fontFamily,size:c.fontSize,line:c.lineHeight,color:c.color,background:c.backgroundColor,padding:c.padding,gap:c.gap}];})),selectors);}
function same(actual,expected){for(const s of Object.keys(expected)){assert.ok(actual[s]&&expected[s],s);for(const k of Object.keys(expected[s])){const a=actual[s][k],b=expected[s][k];if(typeof a==='number')assert.ok(Math.abs(a-b)<=2,`${s} ${k}: ${a} versus ${b}`);else assert.equal(a,b,s+' '+k);}}}
const title='SYNTHETIC Selected Archive '+ 'LongLocation'.repeat(12),body='Do not publish unless approved. 中文 👩‍💻 é.\n'+('SYNTHETIC original paragraph.\n'.repeat(100))+'SYNTHETIC_SELECTED_DEEP';
for(const [variant,path]of [['baseline',join(temp,'extension')],['source',root],['release',release]])test('IAH selected baseline/visual/accessibility '+variant,{timeout:90000},async()=>{
 const h=await FakeChatGPT.start({extensionPath:path,headless:true,hasTouch:true,viewport:{width:1440,height:900}}),p=h.archive;const data=evidence.variants[variant]={};const cdp=await h.context.newCDPSession(p);
 try{
  await p.locator('#enable-consent').click();await eventually(async()=>(await rpc(p,'GET_STATUS')).consented===true);
  await rpc(p,'UPDATE_PREFERENCES',{changes:{appearance:'light',language:'zh-CN'}});
  await h.open({id:'iah-selected',title,base:1609459200,messages:[{id:'iah-selected-input',text:body}]});await eventually(async()=>(await h.state()).records.length===1);
  await waitArchiveWindow(p);await p.bringToFront();await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});await frame(p);assert.equal(await p.evaluate(()=>matchMedia('(pointer:coarse)').matches),false,'baseline neutral measured with fine pointer');
  assert.equal(await p.locator('#document-panel').isVisible(),false);assert.equal(await p.locator('#collection-panel h1:visible').count(),0);
  data.neutral=await shape(p,['.sidebar','#archive-root-header','#archive-navigator']);await shot(p,variant+'-neutral-wide');
  await openArchiveWindow(p);await eventually(()=>p.locator('#document-panel').isVisible());await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});await frame(p);assert.equal(await p.evaluate(()=>matchMedia('(pointer:coarse)').matches),false,'baseline Reader measured with fine pointer');
  data.reader=await shape(p,['.sidebar','#document-page','#document-body','.library-prose']);await shot(p,variant+'-reader-wide');
  if(variant!=='baseline'){same(data.neutral,evidence.variants.baseline.neutral);same(data.reader,evidence.variants.baseline.reader);}
  await p.locator('#back').click();await eventually(()=>p.locator('#scope-search').isEnabled());
  const start=performance.now();await p.locator('#scope-search').fill('SYNTHETIC_SELECTED_DEEP');const row=p.locator('.search-input').first();await eventually(()=>row.isVisible());data.queryMs=performance.now()-start;
  if(variant==='baseline'){await shot(p,variant+'-results-wide');return;}
  assert.match(await p.locator('#scope-search').getAttribute('aria-label'),/搜索全部档案/);
  assert.equal(await row.locator('mark.search-match').first().evaluate(n=>{const box=n.closest('.search-excerpt').getBoundingClientRect();const rects=[...n.getClientRects()];return rects.length>0&&rects.every(r=>r.top>=box.top-1&&r.bottom<=box.bottom+1&&r.left>=box.left-1&&r.right<=box.right+1);}),true,'actual deep-result matching text is not visually clipped');
  await row.focus();const arrival=performance.now();await p.keyboard.press('Enter');await eventually(()=>p.locator('#document-panel').isVisible());
  await eventually(()=>p.evaluate(()=>{const ranges=[...(CSS.highlights.get('paia-search')||[])];return ranges.some(n=>n.toString()==='SYNTHETIC_SELECTED_DEEP'&&n.getBoundingClientRect().top>=0&&n.getBoundingClientRect().bottom<=innerHeight);}), 'deep matching occurrence visibly arrives');data.arrivalMs=performance.now()-arrival;
  assert.equal(await p.locator('#reader-scope-search').inputValue(),'');assert.equal(await p.locator('#reader-scope-search').getAttribute('aria-label'),'在当前聊天窗口中查找');assert.equal(await p.locator('#reader-scope-search').getAttribute('placeholder'),'在此对话中查找');
  data.backPosition=await p.locator('#back').evaluate(n=>{const nodes=[];for(let e=n;e&&e!==document.body;e=e.parentElement)nodes.push({id:e.id,position:getComputedStyle(e).position});return nodes;});
  assert.ok(!data.backPosition.some(n=>['sticky','fixed'].includes(n.position)),'Back has no sticky/fixed ancestor');
  await p.locator('#back').focus();const back=performance.now();await p.keyboard.press('Enter');await eventually(()=>row.evaluate(n=>document.activeElement===n));data.returnMs=performance.now()-back;
  const targetFailures=[];
  for(const mode of [{name:'wide-dark',width:1440,dark:true,scale:1},{name:'narrow-light',width:320,dark:false,scale:1},{name:'narrow-dark-text200',width:320,dark:true,scale:2}]){
   await p.setViewportSize({width:mode.width,height:900});await rpc(p,'UPDATE_PREFERENCES',{changes:{appearance:mode.dark?'dark':'light'}});await p.emulateMedia({reducedMotion:'reduce'});await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
   if(mode.scale===2)await p.evaluate(()=>{window.__iahScale=[...document.querySelectorAll('#scope-search,#document-list *,#back,#reader-scope-search')].filter(n=>n instanceof HTMLElement).map(n=>({n,style:n.getAttribute('style'),size:parseFloat(getComputedStyle(n).fontSize),leading:parseFloat(getComputedStyle(n).lineHeight)}));for(const {n,size,leading}of __iahScale){n.style.setProperty('font-size',size*2+'px','important');if(Number.isFinite(leading))n.style.setProperty('line-height',leading*2+'px','important');}});
   await row.scrollIntoViewIfNeeded();await frame(p);
   if(mode.scale===2)assert.equal(await p.locator('.search-excerpt').first().evaluate(n=>parseFloat(getComputedStyle(n).fontSize)),28,'result text is actually doubled from14px to28px');
   const metric=await p.evaluate(()=>({overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,coarse:matchMedia('(pointer: coarse)').matches}));
   assert.ok(metric.overflow<=2,mode.name+' root reflow '+JSON.stringify(metric));assert.equal(metric.reduced,true);assert.equal(metric.coarse,true);
   assert.equal(await row.locator('mark.search-match').first().evaluate(n=>{const box=n.closest('.search-excerpt').getBoundingClientRect();const rects=[...n.getClientRects()];return rects.length>0&&rects.every(r=>r.top>=box.top-1&&r.bottom<=box.bottom+1&&r.left>=box.left-1&&r.right<=box.right+1);}),true,mode.name+' actual matching text stays visible');
   const box=await row.boundingBox();assert.ok(box.width>=44&&box.height>=44,'coarse result target');data[mode.name]={...metric,row:box};
   await row.focus();assert.equal(await row.evaluate(n=>document.activeElement===n),true);await shot(p,variant+'-'+mode.name+'-result');
   await p.keyboard.press('Enter');await eventually(()=>p.locator('#document-panel').isVisible());
   if(mode.scale===2)await p.evaluate(()=>{window.__iahReaderScale=[...document.querySelectorAll('#document-body .library-prose,#document-page h1')].map(n=>({n,style:n.getAttribute('style'),size:parseFloat(getComputedStyle(n).fontSize),leading:parseFloat(getComputedStyle(n).lineHeight)}));for(const {n,size,leading}of __iahReaderScale){n.style.setProperty('font-size',size*2+'px','important');if(Number.isFinite(leading))n.style.setProperty('line-height',leading*2+'px','important');}});
   if(mode.scale===2)assert.equal(await p.evaluate(()=>__iahReaderScale.every(({n,size})=>parseFloat(getComputedStyle(n).fontSize)===size*2)),true,'actual current Reader prose/title text doubles');
   await p.locator('#back').scrollIntoViewIfNeeded();
   assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth<=2),mode.name+' Reader root reflows');
   data[mode.name].pointerBeforeReaderMeasurement=await p.evaluate(()=>matchMedia('(pointer:coarse)').matches);
   await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});await frame(p);
   assert.equal(await p.evaluate(()=>matchMedia('(pointer:coarse)').matches),true,'actual coarse media established at Reader target measurement');
   const backBox=await p.locator('#back').boundingBox();data[mode.name].back=backBox;if(backBox.width<44||backBox.height<44)targetFailures.push({mode:mode.name,control:'Back',width:backBox.width,height:backBox.height});await shot(p,variant+'-'+mode.name+'-reader-back');
   await p.locator('#back').focus();await p.keyboard.press('Enter');await eventually(()=>row.evaluate(n=>document.activeElement===n));assert.equal(await p.locator('#scope-search').inputValue(),'SYNTHETIC_SELECTED_DEEP');
   if(mode.scale===2)await p.evaluate(()=>{for(const {n,style}of __iahScale)if(style===null)n.removeAttribute('style');else n.setAttribute('style',style);delete window.__iahScale;for(const {n,style}of window.__iahReaderScale||[])if(style===null)n.removeAttribute('style');else n.setAttribute('style',style);delete window.__iahReaderScale;});
  }
  await cdp.detach();data.targetFailures=targetFailures;assert.deepEqual(targetFailures,[],'every affected coarse Back target must be at least44×44');assert.equal(h.externalRequests,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.deepSeekRequests.length,0);assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});

import {applyArchiveWhiteRoles} from './harness/archive-white-reference.mjs';
import {assertArchiveDevice} from './harness/archive-device-evidence.mjs';
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
function same(actual,expected,retired={}){for(const s of Object.keys(expected)){assert.ok(actual[s]&&expected[s],s);for(const k of Object.keys(expected[s])){if(retired[s]?.includes(k))continue;const a=actual[s][k],b=expected[s][k];if(typeof a==='number')assert.ok(Math.abs(a-b)<=2,`${s} ${k}: ${a} versus ${b}`);else assert.equal(a,b,s+' '+k);}}}
const title='SYNTHETIC Selected Archive '+ 'LongLocation'.repeat(12),body='Do not publish unless approved. 中文 👩‍💻 é.\n'+('SYNTHETIC original paragraph.\n'.repeat(100))+'SYNTHETIC_SELECTED_DEEP';
async function seedArchive(h,p){
 await p.locator('#enable-consent').click();await eventually(async()=>(await rpc(p,'GET_STATUS')).consented===true);
 await rpc(p,'UPDATE_PREFERENCES',{changes:{appearance:'light',language:'zh-CN'}});
 await h.open({id:'iah-selected',title,base:1609459200,messages:[{id:'iah-selected-input',text:body}]});await eventually(async()=>(await h.state()).records.length===1);
 await waitArchiveWindow(p);await p.bringToFront();
}
function assertOffline(h){assert.equal(h.externalRequests,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.deepSeekRequests.length,0);assert.deepEqual(h.errors,[]);}
async function deviceEvidence(p,data,label,hasTouch,target=null){
 const sample=await p.evaluate(target=>{const rect=target?document.querySelector(target)?.getBoundingClientRect():null;return {coarse:matchMedia('(pointer:coarse)').matches,fine:matchMedia('(pointer:fine)').matches,maxTouchPoints:navigator.maxTouchPoints,...(rect?{rect:{x:rect.x,y:rect.y,width:rect.width,height:rect.height}}:{})};},target);
 (data.deviceSamples??=[]).push({label,...sample});assertArchiveDevice(sample,{hasTouch,label});return sample;
}

for(const [variant,path]of [['baseline',join(temp,'extension')],['source',root],['release',release]])test('IAH selected baseline/visual/accessibility '+variant,{timeout:90000},async()=>{
 // Fine geometry and coarse accessibility have separate lifetime-fixed devices.
 // A second CDP owner must not override Playwright's context device state.
 let h=await FakeChatGPT.start({extensionPath:path,headless:true,hasTouch:false,viewport:{width:1440,height:900}}),p=h.archive;const data=evidence.variants[variant]={};
 try{
  await seedArchive(h,p);await frame(p);await deviceEvidence(p,data,'baseline neutral measured with fine pointer',false);
  assert.equal(await p.locator('#document-panel').isVisible(),false);assert.equal(await p.locator('#collection-panel h1:visible').count(),0);
  data.neutral=await shape(p,['.sidebar','#archive-root-header','#archive-navigator']);await shot(p,variant+'-neutral-wide');
  if(variant!=='baseline'){
   const source=p.locator('#archive-source-scope');assert.equal(await source.count(),1);assert.equal(await source.isVisible(),true);assert.equal(await source.inputValue(),'chatgpt');
   data.source=await shape(p,['#archive-source-scope']);assert.equal(data.source['#archive-source-scope'].height,44,'approved source control retains 44px target');
   data.discovery=await p.evaluate(()=>{const search=document.getElementById('scope-search').getBoundingClientRect(),source=document.getElementById('archive-source-scope').getBoundingClientRect();return {searchHeight:search.height,sourceGap:source.top-search.bottom};});
   assert.ok(Math.abs(data.discovery.searchHeight-38)<=2,'retained UX PRE_YEAR section4 keeps the discovery search38px');
   assert.ok(Math.abs(data.discovery.sourceGap-12)<=2,'retained UX PRE_YEAR section4 keeps one12px search-to-source gap');
   assert.equal(await source.evaluate(n=>n.closest('#archive-root-tools')!==null),true,'single source name stays outside the tree');
   assert.equal(await p.locator('.archive-navigator-provider').count(),1);assert.equal(await p.locator('.archive-navigator-provider').getAttribute('data-provider-key'),'chatgpt');
   assert.equal(await p.locator('.archive-navigator-provider-title:visible').count(),0,'specific-source tree has no duplicate provider heading');
  }
  await openArchiveWindow(p);await eventually(()=>p.locator('#document-panel').isVisible());await frame(p);await deviceEvidence(p,data,'baseline Reader measured with fine pointer',false);
  data.reader=await shape(p,['.sidebar','#document-page','#document-body','.library-prose']);await shot(p,variant+'-reader-wide');
  data.identity=await shape(p,['#document-title']);
  data.readerFlow=await p.evaluate(()=>{const page=document.getElementById('document-page'),body=document.getElementById('document-body'),block=body.querySelector('.library-block'),pageBox=page.getBoundingClientRect(),bodyBox=body.getBoundingClientRect();return {blockMargin:parseFloat(getComputedStyle(block).marginBottom),bottomPadding:parseFloat(getComputedStyle(page).paddingBottom),outsideBodyReserve:pageBox.bottom-bodyBox.bottom-parseFloat(getComputedStyle(page).paddingBottom)};});
  if(variant!=='baseline'){
   // IAH-1.3 U2/7/8 moves the existing 44px source control outside the tree;
   // UX §3 replaces old prose leading; IAH-1.4 replaces only color roles.
   // The old baseline remains captured unchanged; all unaffected values stay exact.
   const neutral=applyArchiveWhiteRoles(evidence.variants.baseline.neutral),reader=applyArchiveWhiteRoles(evidence.variants.baseline.reader);
   // Current UX0 retains PRE_YEAR section4: search38 + gap12 replaces
   // the historical search38 + header padding16. Keep all other geometry.
   const headerDelta=38+12-neutral['#archive-root-header'].height;
   neutral['#archive-root-header'].height=38+12;neutral['#archive-root-header'].padding='0px 20px';
   neutral['#archive-navigator'].y+=44+headerDelta;neutral['#archive-navigator'].height-=44+headerDelta;
   const font=parseFloat(reader['.library-prose'].size);assert.equal(font,17,'fixed baseline comparison font');
   reader['.library-prose'].line='28.05px';assert.ok(parseFloat(data.reader['.library-prose'].line)>=27&&parseFloat(data.reader['.library-prose'].line)<=29,'approved ordinary17px leading');
   same(data.neutral,neutral);
   // PRE_SECTION section2 removes the28px headline and48px gap. Its vertical
   // positions/total chrome height are superseded; all reading axes, widths,
   // body heights, type and palette still compare with the immutable baseline.
   same(data.reader,reader,{'#document-page':['height'],'#document-body':['y'],'.library-prose':['y']});
   const identity=data.identity['#document-title'],baselineIdentity=evidence.variants.baseline.identity['#document-title'];
   assert.equal(identity.size,'13px');assert.equal(identity.line,'20px');assert.equal(identity.font,baselineIdentity.font);
   data.compact=await p.evaluate(()=>{const title=document.getElementById('document-title'),tools=document.getElementById('reader-compact-tools'),status=document.getElementById('reader-status-slot'),body=document.getElementById('document-body'),style=getComputedStyle(status),t=tools.getBoundingClientRect(),s=status.getBoundingClientRect();return {title:title.textContent,owner:title.closest('#reader-compact-tools')?.id,toolsBottom:t.bottom,toolsGap:parseFloat(getComputedStyle(tools).marginBottom),titleTop:title.getBoundingClientRect().top,titleBottom:title.getBoundingClientRect().bottom,toolsTop:t.top,bodyTop:body.getBoundingClientRect().top,statusVisible:style.display!=='none',statusBottom:s.bottom,statusGap:parseFloat(style.marginBottom)};});
   assert.equal(data.compact.title,title);assert.equal(data.compact.owner,'reader-compact-tools');assert.equal(data.compact.toolsGap,12);
   assert.ok(data.compact.titleTop>=data.compact.toolsTop&&data.compact.titleBottom<=data.compact.toolsBottom+2,'the complete compact identity stays in the existing Back/actions line');
   assert.ok(Math.abs(data.compact.bodyTop-(data.compact.statusVisible?data.compact.statusBottom+data.compact.statusGap:data.compact.toolsBottom+12))<=2,'no retired headline or gap remains between actual compact chrome and prose');
   const bodyShift=data.reader['#document-body'].y-reader['#document-body'].y;
   assert.ok(Math.abs(data.reader['.library-prose'].y-reader['.library-prose'].y-bodyShift)<=2,'the actual Input moves only with its reading column');
   // The last Input margin collapses outside #document-body. PRE_SECTION §5
   // replaces that old48px reserve with18px; the body/prose boxes above retain
   // their exact baseline height, and the original bottom padding is unchanged.
   const baselineFlow=evidence.variants.baseline.readerFlow;assert.equal(baselineFlow.blockMargin,48);assert.equal(data.readerFlow.blockMargin,18);assert.equal(data.readerFlow.bottomPadding,baselineFlow.bottomPadding);
   assert.ok(Math.abs(baselineFlow.outsideBodyReserve-48)<=2,'immutable baseline has the original trailing Input reserve');assert.ok(Math.abs(data.readerFlow.outsideBodyReserve-18)<=2,'only the approved18px trailing Input reserve remains');
   const reserveShift=18-48;
   assert.ok(Math.abs(data.reader['#document-page'].height-reader['#document-page'].height-bodyShift-reserveShift)<=2,'compact chrome and the approved48-to18px Input reserve account for the entire page-height change');
  }
  await p.locator('#back').click();await eventually(()=>p.locator('#scope-search').isEnabled());
  if(variant!=='baseline')await p.locator('#archive-source-scope').selectOption(''); // Explicit All preserves this original all-archive journey.
  const start=performance.now();await p.locator('#scope-search').fill('SYNTHETIC_SELECTED_DEEP');let row=p.locator('.search-input').first();await eventually(()=>row.isVisible());data.queryMs=performance.now()-start;
  if(variant==='baseline'){await shot(p,variant+'-results-wide');assertOffline(h);return;}
  assert.match(await p.locator('#scope-search').getAttribute('aria-label'),/搜索全部档案/);
  assert.equal(await row.locator('mark.search-match').first().evaluate(n=>{const box=n.closest('.search-excerpt').getBoundingClientRect();const rects=[...n.getClientRects()];return rects.length>0&&rects.every(r=>r.top>=box.top-1&&r.bottom<=box.bottom+1&&r.left>=box.left-1&&r.right<=box.right+1);}),true,'actual deep-result matching text is not visually clipped');
  await row.focus();const arrival=performance.now();await p.keyboard.press('Enter');await eventually(()=>p.locator('#document-panel').isVisible());
  await eventually(()=>p.evaluate(()=>{const ranges=[...(CSS.highlights.get('paia-search')||[])];return ranges.some(n=>n.toString()==='SYNTHETIC_SELECTED_DEEP'&&n.getBoundingClientRect().top>=0&&n.getBoundingClientRect().bottom<=innerHeight);}), 'deep matching occurrence visibly arrives');data.arrivalMs=performance.now()-arrival;
  assert.equal(await p.locator('#reader-scope-search').count(),0);assert.equal(await p.locator('input[type=search]:visible').count(),0);
  data.backPosition=await p.locator('#back').evaluate(n=>{const nodes=[];for(let e=n;e&&e!==document.body;e=e.parentElement)nodes.push({id:e.id,position:getComputedStyle(e).position});return nodes;});
  assert.ok(!data.backPosition.some(n=>['sticky','fixed'].includes(n.position)),'Back has no sticky/fixed ancestor');
  await p.locator('#back').focus();const back=performance.now();await p.keyboard.press('Enter');await eventually(()=>row.evaluate(n=>document.activeElement===n));data.returnMs=performance.now()-back;
  assertOffline(h);await h.close();h=null;
  // Chrome155 loses primary coarse media on extension navigation in headless mode.
  // Use the same headed touch mode already qualified by Settings in this shard.
  assert.notEqual(process.env.PAIA_HEADLESS,'1','IAH coarse acceptance requires the qualified headed Chrome mode');
  h=await FakeChatGPT.start({extensionPath:path,headless:false,hasTouch:true,viewport:{width:1440,height:900}});p=h.archive;data.coarseBrowser={headless:false,version:h.context.browser().version()};
  await deviceEvidence(p,data,'fresh coarse context before seed',true);
  await seedArchive(h,p);await deviceEvidence(p,data,'fresh coarse context',true);
  await p.locator('#archive-source-scope').selectOption('');
  await p.locator('#scope-search').fill('SYNTHETIC_SELECTED_DEEP');row=p.locator('.search-input').first();await eventually(()=>row.isVisible());
  const targetFailures=[];
  for(const mode of [{name:'wide-dark',width:1440,dark:true,scale:1},{name:'narrow-light',width:320,dark:false,scale:1},{name:'narrow-dark-text200',width:320,dark:true,scale:2}]){
   await p.setViewportSize({width:mode.width,height:900});await rpc(p,'UPDATE_PREFERENCES',{changes:{appearance:mode.dark?'dark':'light'}});await p.emulateMedia({reducedMotion:'reduce'});await deviceEvidence(p,data,mode.name+' viewport',true);
   if(mode.scale===2)await p.evaluate(()=>{window.__iahScale=[...document.querySelectorAll('#scope-search,#document-list *,#back,#reader-scope-search')].filter(n=>n instanceof HTMLElement).map(n=>({n,style:n.getAttribute('style'),size:parseFloat(getComputedStyle(n).fontSize),leading:parseFloat(getComputedStyle(n).lineHeight)}));for(const {n,size,leading}of __iahScale){n.style.setProperty('font-size',size*2+'px','important');if(Number.isFinite(leading))n.style.setProperty('line-height',leading*2+'px','important');}});
   await row.scrollIntoViewIfNeeded();await frame(p);
   if(mode.scale===2)assert.equal(await p.locator('.search-excerpt').first().evaluate(n=>parseFloat(getComputedStyle(n).fontSize)),28,'result text is actually doubled from14px to28px');
   const metric=await p.evaluate(()=>({overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,coarse:matchMedia('(pointer: coarse)').matches}));
   assert.ok(metric.overflow<=2,mode.name+' root reflow '+JSON.stringify(metric));assert.equal(metric.reduced,true);assert.equal(metric.coarse,true);
   assert.equal(await row.locator('mark.search-match').first().evaluate(n=>{const box=n.closest('.search-excerpt').getBoundingClientRect();const rects=[...n.getClientRects()];return rects.length>0&&rects.every(r=>r.top>=box.top-1&&r.bottom<=box.bottom+1&&r.left>=box.left-1&&r.right<=box.right+1);}),true,mode.name+' actual matching text stays visible');
   const box=(await deviceEvidence(p,data,mode.name+' result target',true,'.search-input')).rect;assert.ok(box.width>=44&&box.height>=44,'coarse result target');data[mode.name]={...metric,row:box};
   await row.focus();assert.equal(await row.evaluate(n=>document.activeElement===n),true);await shot(p,variant+'-'+mode.name+'-result');await deviceEvidence(p,data,mode.name+' after result screenshot',true);
   await p.keyboard.press('Enter');await eventually(()=>p.locator('#document-panel').isVisible());await deviceEvidence(p,data,mode.name+' after Enter',true);
   if(mode.scale===2)await p.evaluate(()=>{window.__iahReaderScale=[...document.querySelectorAll('#document-body .library-prose,#document-page h1')].map(n=>({n,style:n.getAttribute('style'),size:parseFloat(getComputedStyle(n).fontSize),leading:parseFloat(getComputedStyle(n).lineHeight)}));for(const {n,size,leading}of __iahReaderScale){n.style.setProperty('font-size',size*2+'px','important');if(Number.isFinite(leading))n.style.setProperty('line-height',leading*2+'px','important');}});
   if(mode.scale===2)assert.equal(await p.evaluate(()=>__iahReaderScale.every(({n,size})=>parseFloat(getComputedStyle(n).fontSize)===size*2)),true,'actual current Reader prose/title text doubles');
   await p.locator('#back').scrollIntoViewIfNeeded();
   assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth<=2),mode.name+' Reader root reflows');
   await frame(p);
   const measured=await deviceEvidence(p,data,mode.name+' actual coarse media established at Reader target measurement',true,'#back');data[mode.name].pointerBeforeReaderMeasurement=measured.coarse;
   const backBox=measured.rect;data[mode.name].back=backBox;if(backBox.width<44||backBox.height<44)targetFailures.push({mode:mode.name,control:'Back',width:backBox.width,height:backBox.height});await shot(p,variant+'-'+mode.name+'-reader-back');await deviceEvidence(p,data,mode.name+' after Reader screenshot',true);
   await p.locator('#back').focus();await p.keyboard.press('Enter');await eventually(()=>row.evaluate(n=>document.activeElement===n));assert.equal(await p.locator('#scope-search').inputValue(),'SYNTHETIC_SELECTED_DEEP');await deviceEvidence(p,data,mode.name+' after Back',true);
   if(mode.scale===2)await p.evaluate(()=>{for(const {n,style}of __iahScale)if(style===null)n.removeAttribute('style');else n.setAttribute('style',style);delete window.__iahScale;for(const {n,style}of window.__iahReaderScale||[])if(style===null)n.removeAttribute('style');else n.setAttribute('style',style);delete window.__iahReaderScale;});
  }
  data.targetFailures=targetFailures;assert.deepEqual(targetFailures,[],'every affected coarse Back target must be at least44×44');assertOffline(h);
 }finally{await h?.close();}
});

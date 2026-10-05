// Real Reader owners and unchanged offline D6.2 SVGs. Baseline images are retained
// at their original test head; this runner never relabels them as current proof.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {FakeChatGPT,eventually} from '../tests/harness/fake-chatgpt.mjs';
import {openArchiveWindow} from '../tests/harness/archive-navigator.mjs';
import {openReaderDialogReference,readerDialogContract} from '../tests/harness/d7-reader-dialog-reference.mjs';
import {assertTitleVisibility} from '../tests/harness/d7-title-visibility.mjs';

const directory='work/d7-reader-dialogs',baselineHead='e2f90cd8e81af5ba8bc3c840366d9e4f3e68f415';
const baseline={productionHead:baselineHead,testHead:'75a68058cb172eb08f7423bd6f4ddde1d921ebe6',run:37255812722,artifact:11323020941,sha256:'2eddef43e9b9924e7a2a4ed70c0e890b35b9f73f36e61df1aaa7644ee40dddab'};
const dimensions=[{width:1440,theme:'light'},{width:1440,theme:'dark'},{width:1024,theme:'light'},{width:1023,theme:'light'},{width:320,theme:'dark'},{width:768,theme:'light',stress:'text200'},{width:320,theme:'dark',stress:'text200'}];
const originalTail='SYNTHETIC_ORIGINAL_END 完整原文尾标记 👩‍💻 é';
const original='SYNTHETIC 原始内容，只读保留。\n\n'+Array.from({length:42},(_,i)=>`${i+1}. 合成的长段落用于实际滚动检查。中文、English、👩‍💻 é 和换行保持完整，不把一次观察写成永久结论。`).join('\n\n')+'\n\n'+originalTail;
const current=original+'\n\nSYNTHETIC_CURRENT_END 后来的工作文字，不改写原始来源。';
const rpc=async(p,type,fields={})=>{const reply=await p.evaluate(message=>chrome.runtime.sendMessage(message),{type,...fields});assert.equal(reply?.ok,true,JSON.stringify(reply));return reply.data;};
const frame=p=>p.evaluate(async()=>{await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const modalFor=kind=>kind==='original'?'#info-dialog':'#revision-dialog';
async function measure(p,kind){return p.evaluate(kind=>{
 const dialog=document.querySelector(kind==='original'?'#info-dialog':'#revision-dialog'),body=dialog.querySelector(kind==='original'?'#info-content':'#revision-list');
 const read=node=>{if(!node)return null;const r=node.getBoundingClientRect(),s=getComputedStyle(node);return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom,padding:s.padding,borderRadius:s.borderRadius,borderWidth:s.borderWidth,background:s.backgroundColor,color:s.color,boxShadow:s.boxShadow,fontSize:s.fontSize,fontWeight:s.fontWeight,fontFamily:s.fontFamily,lineHeight:s.lineHeight,overflowY:s.overflowY,scrollTop:node.scrollTop,scrollHeight:node.scrollHeight,clientHeight:node.clientHeight,overflowX:node.scrollWidth-node.clientWidth};};
 return {dialog:read(dialog),body:read(body),heading:read(dialog.querySelector('h2')),close:read(dialog.querySelector('header button')),prose:read(dialog.querySelector('pre')),pair:[...dialog.querySelectorAll('.working-history-compare>section')].map(read),viewport:{width:innerWidth,height:innerHeight},rootOverflow:document.documentElement.scrollWidth-innerWidth,declaredPreference:document.documentElement.style.getPropertyValue('--paia-prose-size')};
},kind);}
async function textVisibility(p,selector,tail=''){return p.locator(selector).evaluate((node,tail)=>{
 const rects=[],clips=[],hidden=[],unsupported=[],walker=document.createTreeWalker(node,NodeFilter.SHOW_TEXT);let text;
 while((text=walker.nextNode())){if(!text.data)continue;const start=tail?text.data.indexOf(tail):0;if(start<0)continue;const range=document.createRange();range.setStart(text,start);range.setEnd(text,tail?start+tail.length:text.length);for(const r of range.getClientRects())rects.push({left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height});}
 for(let parent=node;parent;parent=parent.parentElement){const s=getComputedStyle(parent),r=parent.getBoundingClientRect(),id=parent.id||parent.tagName;if(s.display==='none'||s.visibility!=='visible'||Number(s.opacity)===0)hidden.push(id);if(s.clipPath!=='none'||s.clip!=='auto'||parseInt(s.webkitLineClamp)>0||s.maskImage!=='none')unsupported.push({id,clipPath:s.clipPath,clip:s.clip,lineClamp:s.webkitLineClamp,mask:s.maskImage});const x=s.overflowX!=='visible',y=s.overflowY!=='visible';if(x||y)clips.push({id,x,y,left:r.left+parent.clientLeft,right:r.left+parent.clientLeft+parent.clientWidth,top:r.top+parent.clientTop,bottom:r.top+parent.clientTop+parent.clientHeight});}
 return {rects,clips,hidden,unsupported,viewport:{left:0,top:0,right:innerWidth,bottom:innerHeight}};
},tail);}
async function resetText(p){await p.evaluate(()=>{for(const {node,properties} of globalThis.__dialogTextResize||[])for(const {name,prior,priority} of properties)node.style.setProperty(name,prior,priority);delete globalThis.__dialogTextResize;});}
async function settle(p,kind,row){
 await resetText(p);await p.setViewportSize({width:row.width,height:1000});await rpc(p,'UPDATE_PREFERENCES',{changes:{appearance:row.theme}});
 await eventually(()=>p.evaluate(theme=>document.documentElement.dataset.paiaTheme===theme,row.theme));
 if(row.stress==='text200')await p.locator(modalFor(kind)).evaluate(dialog=>{
  // Accessibility text resizing only: no width, padding, display or overflow is
  // injected. Preserve/restore every prior inline value and priority exactly.
  globalThis.__dialogTextResize=[...dialog.querySelectorAll('h2,h3,p,pre,button')].map(node=>({node,properties:['font-size','line-height'].map(name=>({name,prior:node.style.getPropertyValue(name),priority:node.style.getPropertyPriority(name),value:parseFloat(getComputedStyle(node).getPropertyValue(name))}))}));
  for(const {node,properties}of __dialogTextResize)for(const {name,value}of properties)node.style.setProperty(name,`${value*2}px`,'important');
 });
 await p.locator(modalFor(kind)).evaluate(dialog=>{dialog.scrollTop=0;dialog.querySelector('#info-content,#revision-list').scrollTop=0;});await frame(p);
}
async function openMenu(p,label){await p.locator('.reader-more').evaluate(node=>globalThis.__readerDialogInvoker=node);await p.locator('.reader-more').click();await p.getByRole('menuitem',{name:label,exact:true}).click();}
async function closeAndCheck(p,kind){
 await p.keyboard.press('Escape');await eventually(()=>p.locator(modalFor(kind)).isHidden());
 await eventually(()=>p.evaluate(()=>globalThis.__readerDialogInvoker?.isConnected&&document.activeElement===globalThis.__readerDialogInvoker),'native modal close returns focus to the surviving Reader invoker');
 assert.equal(await p.locator(kind==='original'?'#info-content':'#revision-list').textContent(),'','dismissal clears transient content');
}
async function assertVisibleText(p,selector,label,tail=''){const visibility=await textVisibility(p,selector,tail);assertTitleVisibility(visibility,label);return visibility;}
async function usedHeadingFonts(p,kind){
 const cdp=await p.context().newCDPSession(p);
 try{await cdp.send('DOM.enable');await cdp.send('CSS.enable');const {root}=await cdp.send('DOM.getDocument'),{nodeId}=await cdp.send('DOM.querySelector',{nodeId:root.nodeId,selector:`${modalFor(kind)} h2`});const {fonts}=await cdp.send('CSS.getPlatformFontsForNode',{nodeId});assert.ok(fonts.some(font=>font.glyphCount>0&&font.familyName.includes('Noto Serif CJK')),'actual CJK title glyphs use the approved installed serif role');return fonts;}
 finally{await cdp.detach();}
}
async function assertFrame(p,kind,row,reference){
 const actual=await measure(p,kind),contract=readerDialogContract(reference,row.width),scale=row.stress==='text200'?2:1;
 for(const key of ['width','padding','borderWidth','borderRadius','background','color','boxShadow'])assert.equal(actual.dialog[key],contract.surface[key],`${kind} ${row.width} ${row.theme} ${key}`);
 assert.equal(actual.heading.fontSize,`${23*scale}px`);assert.equal(actual.heading.lineHeight,`${32*scale}px`);assert.equal(actual.heading.fontWeight,'500');assert.match(actual.heading.fontFamily,/Georgia.*Noto Serif CJK SC.*serif/);
 assert.equal(actual.prose.fontSize,`${17*scale}px`,'saved standard prose preference remains effective');assert.equal(actual.declaredPreference,'17px');
 assert.equal(actual.dialog.overflowY,'hidden');assert.equal(actual.body.overflowY,'auto');assert.equal(actual.dialog.scrollTop,0);assert.ok(actual.body.scrollHeight>actual.body.clientHeight,'the actual long body is scrollable');
 assert.ok(actual.dialog.y>=24&&actual.dialog.bottom<=976);assert.equal(actual.dialog.x,(row.width-actual.dialog.width)/2);assert.ok(actual.dialog.overflowX<=2&&actual.body.overflowX<=2&&actual.rootOverflow<=2);
 assert.ok(actual.close.height>=(row.width<768?44:36));
 if(kind==='history'){const [current,past]=actual.pair;assert.equal(actual.pair.length,2);if(row.width<1024)assert.ok(past.y>=current.bottom-2,'comparison stacks below1024');else assert.ok(past.x>current.x&&Math.abs(past.y-current.y)<=2,'comparison remains side by side at1024');}
 const heading=await assertVisibleText(p,`${modalFor(kind)} h2`,'complete modal heading'),close=await assertVisibleText(p,`${modalFor(kind)} header button`,'reachable Close label');
 return {actual,contract,textVisibility:{heading,close}};
}
async function captureMatrix(p,kind,variant,references,rows,interactions,persist){
 const screen=kind==='original'?'A07':'A08';
 for(const row of dimensions){
  await settle(p,kind,row);const reference=references.get(`${screen}-${row.theme}`),proof=await assertFrame(p,kind,row,reference),suffix=`${row.width}-${row.theme}${row.stress?'-'+row.stress:''}`,name=`${variant}-after-${screen}-${suffix}`;
  if(row.width===1440&&row.theme==='light')proof.usedHeadingFonts=await usedHeadingFonts(p,kind);
  await p.screenshot({path:`${directory}/${name}.png`,animations:'disabled'});rows.push({screen,...row,name,...proof});await persist('PENDING');
  const action=p.locator(kind==='original'?'#original-copy':'[data-restore-confirm] button').first();await action.scrollIntoViewIfNeeded();await frame(p);const after=await measure(p,kind);
  assert.equal(after.dialog.scrollTop,0,'only the modal body scrolls');assert.ok(after.body.scrollTop>0,'the actual body reaches its lower controls');
  assert.equal(after.heading.y,proof.actual.heading.y,'heading stays pinned during body scroll');assert.equal(after.close.y,proof.actual.close.y,'Close stays pinned during body scroll');
  await assertVisibleText(p,`${modalFor(kind)} h2`,'heading after long scroll');await assertVisibleText(p,`${modalFor(kind)} header button`,'Close after long scroll');await assertVisibleText(p,kind==='original'?'#original-copy':'[data-restore-confirm] button:first-of-type','lower action label');
  if(kind==='history')await assertVisibleText(p,'[data-restore-confirm] button:last-of-type','Cancel label');
  if(row.width===320)await p.screenshot({path:`${directory}/${name}-actions.png`,animations:'disabled'});
  const tailSelector=kind==='original'?'.source-original':'.working-history-compare>section:last-child pre';
  // Reach the exact final text range through the real scroll container, without
  // changing content or layout, independently of the confirmation's position.
  await p.locator(tailSelector).evaluate((node,tail)=>{const range=document.createRange(),text=node.firstChild,start=text.data.indexOf(tail);if(start<0)throw Error('Complete original Unicode tail is missing');range.setStart(text,start);range.setEnd(text,start+tail.length);const r=range.getBoundingClientRect(),body=node.closest('#info-content,#revision-list'),b=body.getBoundingClientRect();body.scrollTop+=r.bottom-b.bottom+16;},originalTail);await frame(p);
  const tail=await assertVisibleText(p,tailSelector,'complete original Unicode tail',originalTail);
  await p.screenshot({path:`${directory}/${name}-tail.png`,animations:'disabled'});interactions.push({kind:'long-tail',screen,...row,after,tail,...(row.width===320?{actionsImage:`${name}-actions.png`}:{})});await persist('PENDING');
 }
 await resetText(p);
}

for(const variant of ['source','release'])test(`D7 Reader dialogs match approved A07/A08 while preserving native reading and revision owners (${variant})`,{timeout:90000},async()=>{
 await mkdir(directory,{recursive:true});const actualHead=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),head=process.env.PAIA_TESTED_HEAD||actualHead;assert.equal(head,actualHead,'evidence identifies the checked-out candidate head');
 const rows=[],interactions=[],references=new Map(),releaseRuntime={},runtimeFiles=['ui/reader.css','ui/archive.js','ui/archive.html','ui/original-surface.js','ui/working-history.js','ui/reading-modal.js'];
 const runtime=Object.fromEntries(await Promise.all(runtimeFiles.map(async path=>[path,digest(await readFile(path))])));
 for(const path of runtimeFiles.filter(path=>path!=='ui/reader.css'))assert.equal(runtime[path],digest(execFileSync('git',['show',`${baselineHead}:extension/${path}`])),`${path} retains the adopted production owner`);
 let h;const persist=async(result,error)=>writeFile(`${directory}/${variant}-after.json`,JSON.stringify({head,baseline,variant,result,error,syntheticOnly:true,phase:'after-approved-dialog-style-change',expectedRows:14,rows,interactions,runtime:{source:runtime,release:releaseRuntime},network:h?{externalRequests:h.externalRequests,extensionNetworkRequests:h.extensionNetworkRequests,providerRequests:h.deepSeekRequests.length,pageErrors:h.errors}:null,qualification:'Bounded A07/A08 visual implementation. Complete before evidence remains at its own baseline test head; neither this slice nor a synthetic Chrome run is final whole-D7 owner acceptance.'},null,2));
 try{
  await persist('PENDING');let extensionPath;
  if(variant==='release'){extensionPath=resolve('work/reader-dialogs-release');execFileSync('python3',['scripts/build_current_release.py',extensionPath],{timeout:60000,maxBuffer:16*1024*1024});for(const path of runtimeFiles){releaseRuntime[path]=digest(await readFile(resolve(extensionPath,path)));if(!['ui/archive.js','ui/archive.html'].includes(path))assert.equal(releaseRuntime[path],runtime[path],`built release retains ${path}`);}}
  h=await FakeChatGPT.start(extensionPath?{extensionPath}:{});const p=h.archive;p.setDefaultTimeout(7000);await p.setViewportSize({width:1440,height:1000});await p.emulateMedia({reducedMotion:'reduce'});
  await p.locator('#consent-check').check();await p.locator('#enable-consent').click();await eventually(async()=>(await rpc(p,'GET_STATUS')).consented===true);if(await p.locator('#onboarding-skip').isVisible())await p.locator('#onboarding-skip').click();
  const title='SYNTHETIC Reader 弹窗核对';await h.open({id:'reader-dialog-baseline-'+variant,title,base:1609459200,messages:[{id:'reader-dialog-input-'+variant,text:original}]});
  await eventually(async()=>(await h.state()).records.some(row=>row.originalText===original));await rpc(p,'SET_ENABLED',{enabled:false});await p.bringToFront();await openArchiveWindow(p,{text:title});await eventually(()=>p.locator('#scope-search').isEnabled());
  const field=p.locator('.library-prose'),id=await field.getAttribute('data-edit-id'),sources=structuredClone((await h.state()).records),before=await rpc(p,'GET_INPUT',{id});
  for(const screen of ['A07','A08'])for(const theme of ['light','dark']){const reference=await openReaderDialogReference(h,screen,theme);references.set(`${screen}-${theme}`,reference);await reference.page.screenshot({path:`${directory}/${variant}-${screen}-reference-1440-${theme}.png`,animations:'disabled'});}
  await p.bringToFront();await openMenu(p,'查看原始内容');await eventually(()=>p.locator('#original-copy').isEnabled());assert.equal(await p.locator('.source-original').textContent(),original);
  await captureMatrix(p,'original',variant,references,rows,interactions,persist);
  await p.evaluate(()=>{globalThis.__readerDialogCopied=null;Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{globalThis.__readerDialogCopied=text;}}});});
  await p.locator('#original-copy').click();await eventually(()=>p.evaluate(()=>typeof __readerDialogCopied==='string'),'complete original copy receives its asynchronous acknowledgement');assert.equal(await p.evaluate(()=>__readerDialogCopied),original,'Copy reads the complete original, including the Unicode tail');await closeAndCheck(p,'original');assert.deepEqual(await rpc(p,'GET_INPUT',{id}),before);
  await p.setViewportSize({width:1440,height:1000});await field.fill(current);await field.blur();await eventually(async()=>(await rpc(p,'GET_INPUT',{id})).libraryText===current,'native edit receives durable acknowledgement');
  await openMenu(p,'版本历史');await p.locator('.revision-row').first().getByRole('button',{name:'恢复操作前',exact:true}).click();await p.locator('.working-history-compare').waitFor();const reviewed=await rpc(p,'GET_INPUT',{id});assert.equal(reviewed.revision,before.revision+1);
  const versions=await p.locator('.working-history-compare pre').allTextContents();assert.ok(versions[0].startsWith(current));assert.ok(versions[1].startsWith(original));
  await captureMatrix(p,'history',variant,references,rows,interactions,persist);
  await p.locator('[data-restore-confirm]').getByRole('button',{name:'取消',exact:true}).click();assert.deepEqual(await rpc(p,'GET_INPUT',{id}),reviewed,'Cancel never writes a restoration');
  await p.locator('.revision-row').first().getByRole('button',{name:'恢复此版本',exact:true}).click();await p.locator('.working-history-compare').waitFor();assert.ok((await p.locator('.working-history-compare pre').allTextContents()).every(text=>text.startsWith(current)),'after-side comparison uses the selected real version');await p.locator('[data-restore-confirm]').getByRole('button',{name:'取消',exact:true}).click();assert.deepEqual(await rpc(p,'GET_INPUT',{id}),reviewed);await closeAndCheck(p,'history');
  // The same info-dialog is reused by a real non-reading owner. Its pre-existing
  // typography and width must survive an Original → Source detail transition.
  await p.setViewportSize({width:1440,height:1000});await p.locator('#document-menu').click();await p.getByRole('menuitem',{name:'来源变化',exact:true}).click();await p.locator('#info-dialog[data-reading-surface="source-detail"]').waitFor();const detail=await measure(p,'original');assert.equal(detail.dialog.width,720);assert.equal(detail.dialog.padding,'28px');assert.equal(detail.heading.fontSize,'18px');assert.equal(detail.heading.fontWeight,'600');assert.doesNotMatch(detail.heading.fontFamily,/Georgia/);await p.locator('#close-info').click();interactions.push({kind:'source-detail-isolation',actual:detail});
  assert.deepEqual((await h.state()).records,sources);assert.equal(h.externalRequests,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.deepSeekRequests.length,0);assert.deepEqual(h.errors,[]);assert.equal(rows.length,14);await persist('PASS');
 }catch(error){await persist('FAIL',String(error.stack||error));if(h)await h.archive.screenshot({path:`${directory}/${variant}-after-failure.png`,animations:'disabled',timeout:5000}).catch(()=>{});throw error;}
 finally{if(h)await resetText(h.archive).catch(()=>{});for(const reference of references.values())await reference.page.close().catch(()=>{});await h?.close();}
});

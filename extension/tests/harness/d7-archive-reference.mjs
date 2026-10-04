// Offline D6.2 comparison only. Production never imports this helper or the masters.
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {eventually} from './fake-chatgpt.mjs';
import {openArchiveWindow} from './archive-navigator.mjs';
import {assertTitleVisibility} from './d7-title-visibility.mjs';

const masters=new URL('../../docs/consumer-product-v1/desktop-vnext/d6-final-visual-master/screens/',import.meta.url);
import {D7_ARCHIVE_MATRIX,D7_FULL_MATRIX} from './d7-archive-matrix.mjs';
export {D7_ARCHIVE_MATRIX,D7_FULL_MATRIX};

export const D7_READER_FIXTURE=Object.freeze({
 title:'关于产品方向，先保留不确定性',
 times:['2023-06-18T10:24:00.000Z','2024-09-12T14:08:00.000Z','2025-11-06T20:16:00.000Z','2026-10-03T09:42:00.000Z'],
 bodies:[
  '我可能更适合做消费产品，但现在样本还太少。我不想把一次顺利的试做，写成对自己的永久结论。\n河岸散步是一次小试作。我想先看人们怎样使用它，再决定哪些能力值得继续做。',
  '最近越来越在意产品被怎样使用，而不只是它能完成什么。\n我希望一个人打开它的时候，不必先学习一整套新的概念。\n先做好一件事：让人愿意回来，而不是一次展示全部功能。\n\nCapture  →  Revisit  →  Understand  →  Reuse\n留下表达，回到当时，再决定这次带走什么。',
  '我不想因为“AI”这个词，就把过去学到的东西全部否定。\n目前更确定的是想解决的问题，而不是某个职位的名字。\n短暂的新鲜感不是长期价值。下次试用，我想认真听听那些没有继续使用的人怎么说。',
  '现在我更希望做面向普通人的 AI 产品。但我仍然需要通过真实使用，检验这个判断，而不是提前把它写成结论。'
 ]
});
const qualifications=[
 'Existing preference normalization resolves both new and saved standard reading settings to 17px/680px. The approved 16px/29px/800px drawing is retained unchanged; this comparison never invents an unset preference or changes the standard mappings.',
 'The Source model has no project description and the navigator has no window-date field. The original A01 descriptions and A02 navigator dates remain in canonical images; actual content does not fabricate them.',
 'The A02 decorative code panel is captured as literal plaintext in Working Input. No Markdown interpretation, extra body store, or synthetic rendered code panel is introduced.',
 'Actual Reader date range and My inputs subtitle come from the existing owner. The drawing recent-modification subtitle and already-modified marker are not fabricated.',
 'A01 has only a 1440 light standalone master. Other root widths use the approved responsive rules with the original wide master retained, not a scaled desktop image advertised as a reflow drawing. Missing dark standalone masters use the approved palette on the unchanged light geometry.',
 'Actual localization follows the existing language preference; English product labels in the canonical master are retained in the target and never forced onto Chinese controls.',
 'The accepted stable Back fallback keeps its same visible slot at every width. Desktop retains a separate36px return row plus8px gap; the current window begins at166px rather than the drawing123px. Main title/body and compact layout remain aligned.',
 'Native controls, including the root overflow and compact Reader actions, remain reachable even where the static drawing omits their full hit areas. Geometry differences are recorded for independent visual review, never hidden by a pixel tolerance.'
];
const darkPalette={'#FFFFFF':'#171D28','#FAFBFD':'#121823','#17233C':'#E8EDF7','#63728A':'#B0BDD0','#68778E':'#A5B4CB','#E6EBF2':'#303B4C','#F4F6FA':'#202939','#EAF1FF':'#263B5B','#235DD3':'#94BAFF','#A34F46':'#E2A295'};
const digest=value=>createHash('sha256').update(value).digest('hex');
const rpc=async(page,type,fields={})=>{const value=await page.evaluate(message=>chrome.runtime.sendMessage(message),{type,...fields});assert.equal(value.ok,true,JSON.stringify(value));return value.data;};
const frame=page=>page.evaluate(async()=>{await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
const near=(actual,expected,label)=>assert.ok(Number.isFinite(actual)&&Math.abs(actual-expected)<=2,`${label}: ${actual} versus ${expected} (2px maximum)`);
const visible=locator=>locator.isVisible().catch(()=>false);

export async function consentD7Archive(h){
 const page=h.archive;
 await page.locator('#consent-check').check();await page.locator('#enable-consent').click();
 await eventually(async()=>(await rpc(page,'GET_STATUS')).consented===true,'D7 synthetic local-save consent');
 await page.locator('#onboarding-skip').waitFor({state:'visible'});await page.locator('#onboarding-skip').click();
 await rpc(page,'UPDATE_PREFERENCES',{changes:{language:'zh-CN',appearance:'light'}});
}

// Capture the normal synthetic text through the real adapter. Only relationship
// metadata is added with the existing SourceStructureStore fixture API.
export async function seedD7Archive(h,{readerOnly=false}={}){
 const prior=await h.state(),priorIds=new Set(prior.records.map(row=>row.id));
 const titles=[D7_READER_FIXTURE.title,'第一次试用之后的想法','路线可以少一点吗','Onboarding: what stays simple','长期使用，而不是一次惊喜','职业方向','学习与写作','日常想法','一次还没命名的讨论'];
 const projects=['河岸散步','河岸散步','河岸散步','河岸散步','河岸散步','职业方向','学习与写作','日常想法',null],fixtures=[];
 for(let i=0;i<(readerOnly?1:titles.length);i++){
  const fixture={id:`d7-archive-normal-${i}`,title:titles[i],base:Date.parse(i?'2026-09-27T09:00:00Z':D7_READER_FIXTURE.times[0])/1000+(i?(9-i)*60:0),messages:(i?['这是用于 D7 档案视觉验证的合成输入。']:D7_READER_FIXTURE.bodies).map((text,j)=>({id:`d7-archive-normal-${i}-${j}`,text}))};
  const response=h.response(fixture);
  if(!i)for(const [j,node]of ['first','second','third','node3'].entries()){response.mapping[node].message.create_time=Date.parse(D7_READER_FIXTURE.times[j])/1000;response.mapping[node].message.update_time=response.mapping[node].message.create_time+1;}
  h.pending.set(fixture.id,response);const capture=await h.open(fixture);fixtures.push({id:fixture.id,project:projects[i]});
  await eventually(async()=>{const state=await h.state();return fixture.messages.every(message=>state.records.some(row=>row.sourceMessageId===message.id&&row.originalText===message.text));},'D7 normal fixture captured');
  await capture.close();
 }
 await h.archive.evaluate(async fixtures=>{
  const {OrganizerStore}=await import('../core/organizer/store.js'),{SourceStructureStore}=await import('../core/source-structure-store.js'),store=new OrganizerStore(chrome.storage.local),structure=new SourceStructureStore(store);
  try{for(const [i,item]of fixtures.entries()){
   const conversationRef={platform:'chatgpt',sourceConversationId:item.id},current=await structure.conversation(conversationRef),projectRef=item.project?{providerKey:'chatgpt',namespace:'d7-normal-fixture',projectId:'project-'+['河岸散步','职业方向','学习与写作','日常想法'].indexOf(item.project)}:null;
   await structure.observeConversation({conversationRef,expectedRevision:current?.relationshipRevision||0,observedAt:new Date(Date.now()+i+1).toISOString(),evidence:{id:`d7-normal-relationship-${i}`,contractId:'d7.synthetic',contractVersion:1,channel:'synthetic',scope:'conversation',originClass:'fixture',requestGeneration:i+1,evidenceKind:'relationship',digest:(i+1).toString(16).padStart(64,'0')},membership:{state:projectRef?'project':'unassigned',projectRef},...(item.project?{projectName:item.project}:{}),sourceStatus:'observed_active'});
   if(!projectRef)continue;
   const project=await structure.project(projectRef);
   if(project?.currentName!==item.project)await structure.observeProject({projectRef,witnessConversationRef:conversationRef,expectedRevision:project?.relationshipRevision||0,observedAt:new Date(Date.now()+100+i).toISOString(),evidence:{id:`d7-normal-project-${i}`,contractId:'d7.synthetic',contractVersion:1,channel:'synthetic',scope:'project',originClass:'fixture',requestGeneration:20+i,evidenceKind:'relationship',digest:(20+i).toString(16).padStart(64,'0')},currentName:item.project,sourceStatus:'observed_active'});
  }}finally{await store.repository.close();}
  document.dispatchEvent(new Event('paia:navigator-refresh'));
 },fixtures);
 await h.archive.bringToFront();await h.archive.reload();
 await eventually(async()=>await h.archive.locator('.archive-navigator-group-toggle').filter({hasText:'河岸散步'}).count()===1&&(!readerOnly?await h.archive.locator('.archive-navigator-group-toggle').count()===5:true),'normal project source metadata is visible');
 const state=await h.state();assert.equal(state.records.length,prior.records.length+(readerOnly?4:12),'all prior Sources plus the complete new fixture remain');assert.deepEqual(state.records.filter(row=>priorIds.has(row.id)),prior.records,'new comparison fixture does not replace the existing journey fixture');
 const primary=state.records.filter(row=>row.chatId==='d7-archive-normal-0').sort((a,b)=>a.sourceSentAt.localeCompare(b.sourceSentAt));
 assert.deepEqual(primary.map(row=>row.originalText),D7_READER_FIXTURE.bodies);assert.deepEqual(primary.map(row=>row.sourceSentAt),D7_READER_FIXTURE.times);
 return {sourceBefore:structuredClone(state.records),workingBefore:structuredClone(state.library.blocks),fixtures};
}

let mastersVerified=false;
export async function openD7Reference(h,{screen='A02',width=1440,theme='light'}={}){
 if(!mastersVerified){execFileSync('python3',[fileURLToPath(new URL('../source/unpack_masters.py',masters))],{timeout:30000,maxBuffer:1024*1024});mastersVerified=true;}
 const canonicalWidth=screen==='A01'?1440:width,name=`${screen}-${canonicalWidth}-${theme==='dark'&&screen==='A02'&&width===1440?'dark':'light'}.svg`,bytes=await readFile(new URL(name,masters));
 const paletteDerived=theme==='dark'&&!name.endsWith('-dark.svg'),svg=paletteDerived?bytes.toString().replace(/#[0-9a-f]{6}/gi,color=>darkPalette[color.toUpperCase()]||color):bytes.toString();
 const page=await h.context.newPage();
 await page.route('https://paia-reference.invalid/d7/**',route=>{
  const pathname=new URL(route.request().url()).pathname;
  if(pathname!==`/d7/${name}`)return route.abort();
  return route.fulfill({contentType:'text/html',body:`<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><style>html,body{margin:0;background:${theme==='dark'?'#171d28':'white'}}svg{display:block}</style>${svg}`});
 });
 await page.setViewportSize({width:canonicalWidth,height:1000});await page.goto(`https://paia-reference.invalid/d7/${name}`);await frame(page);
 return {page,name,sha256:digest(bytes),paletteDerived,independentReflow:screen==='A02'||width===1440,referenceWidth:canonicalWidth};
}

async function measure(page,screen){return page.evaluate(screen=>{
 const titleVisibility=selector=>{
  const node=document.querySelector(selector),rects=[],clips=[],hidden=[],unsupported=[];
  const walker=document.createTreeWalker(node,NodeFilter.SHOW_TEXT);let text;
  while((text=walker.nextNode())){if(!text.data)continue;const range=document.createRange();range.selectNodeContents(text);for(const r of range.getClientRects())rects.push({left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height});}
  for(let ancestor=node;ancestor;ancestor=ancestor.parentElement){
   const s=getComputedStyle(ancestor),r=ancestor.getBoundingClientRect(),id=ancestor.id||ancestor.tagName;
   if(s.display==='none'||s.visibility!=='visible'||Number(s.opacity)===0)hidden.push(id);
   if(s.clipPath!=='none'||s.clip!=='auto'||parseInt(s.webkitLineClamp)>0||(s.maskImage&&s.maskImage!=='none')||(s.webkitMaskImage&&s.webkitMaskImage!=='none'))unsupported.push({id,clipPath:s.clipPath,clip:s.clip,lineClamp:s.webkitLineClamp,maskImage:s.maskImage,webkitMaskImage:s.webkitMaskImage});
   const x=s.overflowX!=='visible',y=s.overflowY!=='visible';
   if(x||y)clips.push({id,x,y,left:r.left+ancestor.clientLeft,right:r.left+ancestor.clientLeft+ancestor.clientWidth,top:r.top+ancestor.clientTop,bottom:r.top+ancestor.clientTop+ancestor.clientHeight});
  }
  return {rects,clips,hidden,unsupported,viewport:{left:0,top:0,right:innerWidth,bottom:innerHeight}};
 };
 const read=selector=>{const node=document.querySelector(selector);if(!node)return null;const r=node.getBoundingClientRect(),s=getComputedStyle(node);return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height,visible:!!(r.width&&r.height)&&s.visibility!=='hidden',text:node.textContent,value:node.value,scrollWidth:node.scrollWidth,clientWidth:node.clientWidth,scrollHeight:node.scrollHeight,clientHeight:node.clientHeight,...Object.fromEntries(['fontFamily','fontSize','fontWeight','lineHeight','color','backgroundColor','borderRightColor','whiteSpace','paddingTop','paddingRight','paddingBottom','paddingLeft'].map(key=>[key,s[key]]))};};
 const reader=screen==='A02';
 return {titleVisibility:titleVisibility(reader?'#document-title':'#archive-root-heading h1'),viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},overflow:document.documentElement.scrollWidth-innerWidth,theme:document.documentElement.dataset.paiaTheme,language:document.documentElement.lang,coarse:matchMedia('(pointer:coarse)').matches,fontEnvironment:{sans:document.fonts.check('16px "Noto Sans CJK SC"'),serif:document.fonts.check('28px "Noto Serif CJK SC"'),timezone:Intl.DateTimeFormat().resolvedOptions().timeZone},rail:read('.sidebar'),logo:read('.brand img'),brand:read('.brand'),nav:read('#primary-nav'),selected:read('.sidebar [data-view="library"]'),navigator:read('#archive-reader-navigator-slot'),root:read(reader?'#document-page':'#collection-panel'),title:read(reader?'#document-title':'#archive-root-heading h1'),search:read('#scope-search'),searchHost:document.querySelector('#scope-search-host')?.parentElement.id,back:read('#back'),backHost:document.querySelector('#back')?.parentElement.id,sort:read('#input-time-toggle'),menu:read('#document-menu'),status:read('#save-status'),actions:read(reader?'#reader-heading-actions':'#archive-root-header-actions'),body:read('#document-body'),prose:read('.library-prose'),caption:read('#document-body .block-time'),compact:read('#archive-compact-navigation'),rootOverflow:read('#archive-root-overflow'),contextGroup:read('.archive-navigator-context-group .archive-navigator-group-toggle'),selectedWindow:read('.archive-navigator-window[aria-current="page"]'),contextBackParent:document.getElementById('archive-reader-back-slot')?.parentElement.id,groupTitles:[...document.querySelectorAll('.archive-navigator-group-toggle')].map(node=>node.textContent),documentTitleInsidePage:!!document.querySelector('#document-page #document-title'),oneSearch:document.querySelectorAll('#scope-search').length,oneSort:document.querySelectorAll('#input-time-toggle').length,modal:!!document.querySelector('dialog:modal'),declaredPreference:{size:document.documentElement.style.getPropertyValue('--paia-prose-size'),width:document.documentElement.style.getPropertyValue('--paia-prose-width')}};
 },screen);}


function assertLayout(actual,row){
 const {width,theme,screen,stress}=row,reader=screen==='A02',rail=width>=1280?184:width>=1024?160:width>=768?64:0,nav=reader&&width>=1024?(width>=1440?312:width>=1280?280:240):0,gutter=width>=768?44:20;
 row.geometryContract={authority:'D6.2 DESIGN_SYSTEM + RESPONSIVE',maximumTolerancePx:2,railWidth:width<768?width:rail,navigatorWidth:nav,gutter,titleX:rail+nav+gutter,bodyWidth:reader?Math.min(680,width-rail-nav-gutter*2):null,titleSize:(width<768?24:28)*(stress==='text200'?2:1),standardPreference:{size:17,width:680},unchangedMasterReading:{size:16,leading:29,maximumWidth:800}};
 row.fixedGeometryDifference={railWidth:actual.rail.width-row.geometryContract.railWidth,titleX:actual.title.x-row.geometryContract.titleX,...(reader?{bodyWidth:actual.body.width-row.geometryContract.bodyWidth,navigatorWidth:width>=1024?actual.navigator.width-nav:null}:{}),meaning:'Numeric differences from the declared applicable fixed geometry; text/preference differences remain visible in original-target pixel diagnostics.'};
 assert.equal(actual.theme,theme);assert.equal(actual.oneSearch,1);assert.equal(actual.oneSort,1);assert.equal(actual.modal,false);assert.ok(actual.overflow<=2,`${row.id} root overflow ${actual.overflow}`);
 near(actual.rail.width,width<768?width:rail,row.id+' primary rail width');
 if(width<768)near(actual.rail.height,58,row.id+' compact header height');
 else{near(actual.rail.x,0,row.id+' rail x');near(actual.rail.y,0,row.id+' rail y');near(actual.logo.width,width<1024?40:48,row.id+' approved mark width');near(actual.logo.height,width<1024?40:48,row.id+' approved mark height');if(width>=1024){near(actual.logo.x,(rail-48)/2,row.id+' brand centered');near(actual.logo.y,28,row.id+' brand y');near(actual.nav.y,135,row.id+' first navigation row');}}
 near(actual.title.x,rail+nav+gutter,row.id+' title reading axis');
 assert.match(actual.title.fontFamily,/Georgia.*Noto Serif CJK SC/,'Reader/root title retains the approved serif role');assert.equal(actual.title.fontWeight,'500');
 assert.equal(parseFloat(actual.title.fontSize),(width<768?24:28)*(stress==='text200'?2:1));
 assert.equal(actual.searchHost,reader?(width>=1024?'archive-reader-search-slot':'reader-search-slot'):'archive-root-header-actions');
 assert.equal(actual.rail.backgroundColor,theme==='dark'?'rgb(18, 24, 35)':'rgb(250, 251, 253)');assert.equal(actual.title.color,theme==='dark'?'rgb(232, 237, 247)':'rgb(23, 35, 60)');
 assert.equal(actual.search.backgroundColor,theme==='dark'?'rgb(32, 41, 57)':'rgb(244, 246, 250)');
 assert.ok(actual.search.visible&&actual.search.width>0&&actual.search.x>=0&&actual.search.right<=width+2,'same search is visible and horizontally reachable');
 if(reader){
  assert.equal(actual.documentTitleInsidePage,true);assert.equal(actual.backHost,'archive-reader-back-slot');
  if(width>=1024){near(actual.navigator.x,rail,row.id+' navigator x');near(actual.navigator.width,nav,row.id+' navigator width');near(actual.search.x,rail+20,row.id+' navigator search x');near(actual.search.width,nav-40,row.id+' navigator search width');if(!stress)near(actual.search.y,24,row.id+' navigator search y');}
  near(actual.body.x,rail+nav+gutter,row.id+' body reading axis');
  near(actual.body.width,Math.min(680,width-rail-nav-gutter*2),row.id+' exact retained standard width');
  assert.equal(parseFloat(actual.prose.fontSize),17*(stress==='text200'?2:1),'actual standard body size is reported honestly');assert.equal(actual.declaredPreference.width,'680px');assert.equal(actual.declaredPreference.size,'17px');
  assert.equal(actual.prose.whiteSpace,'pre-wrap');assert.ok(actual.caption.visible,'native time caption remains visible');
  if(!stress&&width>=1024){near(actual.title.y,24,row.id+' title top');assert.equal(actual.contextBackParent,'archive-reader-navigator-slot');near(actual.contextGroup.y,actual.back.bottom+8,row.id+' fixed Back before project heading');near(actual.selectedWindow.y,166,row.id+' current project first window with accepted independent Back row');}
  if(!stress&&width===320){near(actual.title.y,109,row.id+' compact title top');near(actual.search.y,219,row.id+' compact search after subtitle');near(actual.caption.y,301,row.id+' compact first caption');}
 }else{near(actual.root.x,rail,row.id+' root starts immediately after primary rail');if(width>=768)near(actual.title.y,24,row.id+' root title top');assert.equal(actual.rootOverflow.visible,true,'root overflow remains available');}
 assert.equal(parseFloat(actual.title.lineHeight),(width<768?35:38)*(stress==='text200'?2:1),'exact approved title line height');
 assertTitleVisibility(actual.titleVisibility,row.id+' whole title');
}

async function nativeReachability(page,selectors,{floor=32}={}){
 const hits=[];
 for(const selector of selectors){await exposeReaderControl(page,selector);const locator=page.locator(selector);await locator.focus();await locator.scrollIntoViewIfNeeded();const hit=await locator.evaluate(node=>{const r=node.getBoundingClientRect(),at=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {id:node.id,width:r.width,height:r.height,x:r.x,y:r.y,right:r.right,bottom:r.bottom,focused:document.activeElement===node,hit:at===node||node.contains(at),outline:getComputedStyle(node).outlineStyle};});assert.ok(hit.focused&&hit.hit&&hit.width>=floor&&hit.height>=floor,`${selector} native focus and unobscured ${floor}px target: ${JSON.stringify(hit)}`);hits.push(hit);}
 return hits;
}
async function exposeReaderControl(page,selector){
 const menu=page.locator('#archive-compact-navigation');if(!await visible(menu))return;
 const needsMenu=await page.locator(selector).evaluate(node=>!!node.closest('#archive-compact-nav-items'));
 if(await menu.evaluate(node=>node.open)!==needsMenu)await menu.locator('summary').click();
}
async function settleD7Presentation(page,row){
 await eventually(()=>page.evaluate(({screen,width})=>{
  const get=id=>document.getElementById(id),phone=width<768,desktop=width>=1024,reader=screen==='A02';
  if(get('archive-compact-navigation').hidden===phone)return false;
  if(get('scope-search-host').parentElement.id!==(reader?(desktop?'archive-reader-search-slot':'reader-search-slot'):'archive-root-header-actions'))return false;
  if(!reader)return true;
  if(get('back').parentElement.id!=='archive-reader-back-slot')return false;
  if(get('archive-navigator-toggle').parentElement.id!==(phone?'archive-compact-reader-actions':desktop?'reader-compact-tools':'archive-reader-back-slot'))return false;
  if(get('document-menu').parentElement.id!==(phone?'archive-compact-reader-actions':'reader-heading-actions'))return false;
  if(getComputedStyle(get('document-menu')).fontSize!==(phone?'13px':'17px'))return false;
  return !!document.querySelector('.archive-navigator-window[aria-current="page"]')&&(!desktop||get('archive-reader-back-slot').parentElement.id==='archive-reader-navigator-slot'&&!!document.querySelector('.archive-navigator-context-group'));
 },row),'responsive control parents, normal text size and selected window are ready');
}

async function pixelDifference(reference,actualBuffer,targetBuffer,path){
 const difference=await reference.evaluate(async({actual,target})=>{
  const load=src=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src='data:image/png;base64,'+src;});
  const [a,b]=await Promise.all([load(actual),load(target)]),canvas=document.createElement('canvas');canvas.width=a.width;canvas.height=a.height;const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(a,0,0);const aa=context.getImageData(0,0,a.width,a.height);context.clearRect(0,0,a.width,a.height);context.drawImage(b,0,0);const bb=context.getImageData(0,0,a.width,a.height);let differingPixels=0;for(let i=0;i<aa.data.length;i+=4){const d=Math.max(Math.abs(aa.data[i]-bb.data[i]),Math.abs(aa.data[i+1]-bb.data[i+1]),Math.abs(aa.data[i+2]-bb.data[i+2]));if(d)differingPixels++;aa.data[i]=d;aa.data[i+1]=0;aa.data[i+2]=d;aa.data[i+3]=255;}context.putImageData(aa,0,0);return {png:canvas.toDataURL('image/png').split(',')[1],differingPixels,totalPixels:a.width*a.height};
 },{actual:actualBuffer.toString('base64'),target:targetBuffer.toString('base64')});
 await writeFile(path,Buffer.from(difference.png,'base64'));return {differingPixels:difference.differingPixels,totalPixels:difference.totalPixels,meaning:'Unthresholded diagnostic only; not a visual acceptance score. Original target text, preference, metadata and rasterization differences remain visible.'};
}

async function selectArchive(page){
 // The caller just requested1440px; wait for the real resize owner to move its
 // controls before choosing a navigation branch from a stale visibility read.
 await eventually(()=>page.evaluate(()=>{const menu=document.getElementById('archive-compact-navigation'),archive=document.querySelector('.sidebar [data-view="library"]'),settings=document.querySelector('.sidebar [data-view="settings"]');return innerWidth===1440&&!matchMedia('(max-width:767px)').matches&&menu.hidden&&!menu.open&&archive?.parentElement.id==='primary-nav'&&archive.getClientRects().length>0&&settings?.parentElement.classList.contains('sidebar-bottom');}),'wide primary navigation placement settled');
 await page.locator('#primary-nav [data-view="library"]').click();
 await eventually(()=>page.locator('#collection-panel').isVisible(),'normal primary Archive navigation');
 await eventually(()=>page.locator('#scope-search').isEnabled(),'Archive search owner ready');
}

async function openNormalReader(page){
 await openArchiveWindow(page,{text:D7_READER_FIXTURE.title,label:'D7 ordinary root to project to Reader'});
 await eventually(async()=>await page.locator('#document-panel').isVisible()&&await page.locator('#scope-search').isEnabled()&&await page.locator('.library-prose').count()===4,'D7 normal Reader is complete');
 await eventually(()=>page.locator('.archive-navigator-context-group .archive-navigator-window[aria-current="page"]').isVisible(),'existing selected path and contextual Reader header are ready');
 // Discovery may expand earlier projects. Match the master selected-project
 // state with the existing disclosure controls, without changing source order.
 for(const group of await page.locator('.archive-navigator-group-toggle').all())if(!/河岸散步/.test(await group.textContent())&&await group.getAttribute('aria-expanded')==='true')await group.click();
 assert.deepEqual(await page.locator('.library-prose').allTextContents(),D7_READER_FIXTURE.bodies,'exact synthetic Working Input text');
 const dates=await page.evaluate(times=>times.map(at=>new Date(at).toLocaleDateString('zh-CN',{year:'numeric',month:'long',day:'numeric'})+' · '+new Date(at).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit',hour12:false})),D7_READER_FIXTURE.times);
 assert.deepEqual(await page.locator('#document-body .block-time').allTextContents(),dates,'exact native captured source times');
 assert.equal(await page.locator('#document-search-tools').isVisible(),false,'empty query has no phantom search area');
 await page.evaluate(()=>{globalThis.__d7ReaderNode=document.querySelector('.library-prose');globalThis.__d7ControlNodes=['scope-search','back','input-time-toggle','document-menu','save-status'].map(id=>[id,document.getElementById(id)]);});
}

async function inspectSource(page,bodies){
 await page.locator('#document-menu').click();await page.getByRole('menuitem',{name:'查看原始内容',exact:true}).click();
 await eventually(async()=>await page.locator('#info-dialog').evaluate(node=>node.open)&&await page.locator('#info-content .source-original').count()===bodies.length,'explicit immutable Source opens');
 assert.deepEqual(await page.locator('#info-content .source-original').allTextContents(),bodies);assert.equal(await page.locator('#info-content [contenteditable]').count(),0);
 await page.locator('#close-info').click();await eventually(()=>page.locator('#document-menu').evaluate(node=>document.activeElement===node),'Source close restores original menu focus');
}

async function verifyD7ResponsiveFocus(page,record){
 await page.setViewportSize({width:1440,height:1000});await settleD7Presentation(page,{screen:'A02',width:1440});await frame(page);
 const focusSnapshot=()=>page.evaluate(()=>({activeId:document.activeElement?.id,activeTag:document.activeElement?.tagName,space:document.body.dataset.paiaSpace,menuOpen:document.getElementById('archive-compact-navigation').open,controls:['back','document-menu','archive-navigator-toggle'].map(id=>{const node=document.getElementById(id);return {id,parent:node.parentElement.id,connected:node.isConnected,rects:node.getClientRects().length};})}));
 const resizeFocused=async(id,width,label)=>{await record('responsive-focus-before',{id,width,snapshot:await focusSnapshot()});try{await page.setViewportSize({width,height:1000});await eventually(()=>page.evaluate(({id,width})=>{const get=id=>document.getElementById(id),compact=width<768,desktop=width>=1024,node=get(id),menu=get('archive-compact-navigation');return innerWidth===width&&menu.hidden===!compact&&menu.open===(compact&&id==='document-menu')&&get('scope-search-host').parentElement.id===(desktop?'archive-reader-search-slot':'reader-search-slot')&&get('archive-navigator-toggle').parentElement.id===(compact?'archive-compact-reader-actions':desktop?'reader-compact-tools':'archive-reader-back-slot')&&get('document-menu').parentElement.id===(compact?'archive-compact-reader-actions':'reader-heading-actions')&&get('back').parentElement.id==='archive-reader-back-slot'&&document.activeElement===node&&node.getClientRects().length>0;},{id,width}),label);}finally{await record('responsive-focus-after',{id,width,snapshot:await focusSnapshot()});}};
 await page.locator('#back').focus();await resizeFocused('back',320,'focused Back survives both responsive owners');assert.equal(await page.locator('#archive-compact-navigation').evaluate(node=>node.open),false,'Back does not open unrelated actions');await resizeFocused('back',1440,'focused Back returns to contextual desktop header');
 await page.locator('#document-menu').focus();await resizeFocused('document-menu',320,'focused document action is exposed in phone disclosure');assert.equal(await page.locator('#archive-compact-navigation').evaluate(node=>node.open),true);await resizeFocused('document-menu',1440,'focused document action returns to desktop');await record('responsive-focused-back-and-action');
}

export async function verifyD7ArchiveBehavior(h,seed,{directory,variant,observations,persist}){
 const page=h.archive,record=async(kind,data={})=>{observations.push({kind,...data});await persist();};
 await page.setViewportSize({width:1440,height:1000});await rpc(page,'UPDATE_PREFERENCES',{changes:{appearance:'light'}});await frame(page);await page.evaluate(()=>scrollTo(0,0));
 // Negative oracle controls use an independent offline page. The real editor
 // is never mutated, and each control gets a fresh document rather than cleanup.
 const titleBefore=await page.locator('#document-title').evaluate(node=>{const s=getComputedStyle(node);return {text:node.textContent,inline:node.getAttribute('style'),width:node.getBoundingClientRect().width,fontFamily:s.fontFamily,fontSize:s.fontSize,fontWeight:s.fontWeight,lineHeight:s.lineHeight};});
 assertTitleVisibility((await measure(page,'A02')).titleVisibility,'normal production title before negative controls');
 const probe=await h.context.newPage(),probeURL='https://paia-reference.invalid/d7/title-visibility-oracle';
 try{
  const text=titleBefore.text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
  await probe.route(probeURL,route=>route.fulfill({contentType:'text/html',body:`<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><style>body{margin:24px}#document-title{margin:0;width:${titleBefore.width}px;font-family:${titleBefore.fontFamily};font-size:${titleBefore.fontSize};font-weight:${titleBefore.fontWeight};line-height:${titleBefore.lineHeight};white-space:pre-wrap;overflow-wrap:anywhere}</style><h1 id="document-title">${text}</h1>`}));
  await probe.setViewportSize({width:1440,height:1000});
  for(const [kind,style]of [['overflow-hidden','height:1px;overflow:hidden'],['line-clamp','width:120px;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:1;overflow:hidden'],['mask','mask-image:linear-gradient(transparent,transparent)']]){
   await probe.goto(probeURL);await frame(probe);assertTitleVisibility((await measure(probe,'A02')).titleVisibility,'fresh unmodified control');
   await probe.locator('#document-title').evaluate((node,style)=>node.style.cssText=style,style);await frame(probe);
   const mutant=await measure(probe,'A02');assert.throws(()=>assertTitleVisibility(mutant.titleVisibility),/clipping|line clamp/);await record('title-clipping-oracle-rejects',{mutantKind:kind,isolatedPage:true,visibility:mutant.titleVisibility});
  }
 }finally{await probe.close();}
 await page.bringToFront();await frame(page);assert.equal(await page.locator('#document-title').getAttribute('style'),titleBefore.inline);assert.equal(await page.locator('#document-title').textContent(),titleBefore.text);assertTitleVisibility((await measure(page,'A02')).titleVisibility,'unmodified production title after negative controls');await record('title-clipping-production-untouched',{inlineStyle:titleBefore.inline});

 // DOM order follows the real relocated controls: search, then project Back.
 await page.locator('#scope-search').focus();await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'back');
 const group=page.locator('#archive-navigator .archive-navigator-group-toggle').first();assert.equal(await group.textContent(),'河岸散步');await page.keyboard.press('Tab');assert.equal(await group.evaluate(node=>document.activeElement===node),true,'Back and current group have adjacent DOM focus order');
 await group.click();assert.equal(await group.getAttribute('aria-expanded'),'false');assert.equal(await page.locator('#archive-navigator .archive-navigator-group-toggle').first().textContent(),'河岸散步','collapsed current group remains first');await group.click();await eventually(()=>page.locator('.archive-navigator-window[aria-current="page"]').isVisible(),'current group reopens');
 await page.setViewportSize({width:1440,height:500});await frame(page);const beforeScroll=await page.evaluate(()=>({back:document.getElementById('back').getBoundingClientRect().top,group:document.querySelector('.archive-navigator-context-group .archive-navigator-group-toggle').getBoundingClientRect().top}));await page.locator('#archive-navigator').hover();await page.mouse.wheel(0,180);await eventually(()=>page.locator('#archive-navigator').evaluate(node=>node.scrollTop>0),'real wheel scrolls the contextual navigator');
 const afterScroll=await page.evaluate(()=>({back:document.getElementById('back').getBoundingClientRect().top,group:document.querySelector('.archive-navigator-context-group .archive-navigator-group-toggle').getBoundingClientRect().top}));near(afterScroll.back,beforeScroll.back,'fixed Back remains above the independently scrolling navigator');assert.ok(afterScroll.group<beforeScroll.group,'project/window list actually scrolls');await page.locator('#back').focus();await page.locator('#back').scrollIntoViewIfNeeded();await page.setViewportSize({width:1440,height:1000});await frame(page);await record('context-heading-order-collapse-and-fixed-back',{beforeScroll,afterScroll});
 await page.locator('#input-time-toggle').focus();await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'document-menu');
 await record('wide-keyboard-order',{order:['scope-search','back','input-time-toggle','document-menu'],note:'navigator rows and editable title occur between Back and sort in the full native tab sequence'});
 await page.locator('#scope-search').fill('短暂的新鲜感');await eventually(()=>page.locator('.document-search-hit').count().then(count=>count>0),'existing local Reader search returns the exact normal fixture');await page.locator('#scope-search').fill('');
 await eventually(async()=>await page.locator('.library-prose').count()===4&&!await page.locator('#document-search-tools').isVisible(),'clearing Reader search returns the normal body');assert.deepEqual(await page.locator('.library-prose').allTextContents(),D7_READER_FIXTURE.bodies);await record('reader-search-clear');
 for(const [sort,query,expected]of [['desc','现在我更希望',D7_READER_FIXTURE.bodies.toReversed()],['asc','我可能更适合',D7_READER_FIXTURE.bodies]]){
  await page.locator('#input-time-toggle').press('Enter');await eventually(async()=>await page.locator('#input-time-toggle').getAttribute('data-current-sort')===sort&&(await rpc(page,'GET_ORGANIZER_CONTROLS')).inputReadingSort===sort,'native sort and persisted preference '+sort);
  const anchoredBodies=await page.locator('.library-prose').allTextContents();
  // Existing sort retains the current Input anchor, so its bounded window may
  // omit a prefix. Open this order's first Input through ordinary Reader search.
  await page.locator('#scope-search').fill(query);await eventually(()=>page.locator('.document-search-hit').count().then(count=>count===1),'unique order endpoint search');await page.locator('.document-search-hit').click();
  await eventually(async()=>JSON.stringify(await page.locator('.library-prose').allTextContents())===JSON.stringify(expected)&&await page.locator('#scope-search').isEnabled(),'all four exact bodies after opening '+sort+' endpoint');
  await page.locator('#scope-search').fill('');await eventually(async()=>!await page.locator('#document-search-tools').isVisible(),'endpoint search cleared without restoring prior anchor');
  assert.deepEqual(await page.locator('.library-prose').allTextContents(),expected);assert.equal((await rpc(page,'GET_ORGANIZER_CONTROLS')).inputReadingSort,sort);await record('sort-endpoint',{sort,anchoredBodies,endpointQuery:query,exactBodies:expected});
 }
 await record('sort-both-directions');
 await inspectSource(page,D7_READER_FIXTURE.bodies);const beforeEdit=await h.state();assert.deepEqual(beforeEdit.records,seed.sourceBefore,'all Sources unchanged before the edit');assert.deepEqual(beforeEdit.library.blocks,seed.workingBefore,'visual changes, search and sort preserve every existing Working Input');await record('source-and-working-before-edit');
 const field=page.locator('.library-prose').first(),id=await field.getAttribute('data-edit-id'),literal=D7_READER_FIXTURE.bodies[0]+'\n\n  D7 保存核验：空格与换行不变。\n\t<literal>& **原样**  ';
 await field.fill(literal);await page.locator('#scope-search').focus();await eventually(async()=>(await rpc(page,'GET_INPUT',{id})).libraryText===literal,'basic edit durably stores exact literal text');
 await page.reload();await eventually(async()=>await page.locator(`.library-prose[data-edit-id="${id}"]`).count()===1,'normal Reader route reloads after durable save');assert.equal(await page.locator(`.library-prose[data-edit-id="${id}"]`).textContent(),literal);assert.equal((await rpc(page,'GET_INPUT',{id})).libraryText,literal);
 await inspectSource(page,D7_READER_FIXTURE.bodies);const afterEdit=await h.state();assert.deepEqual(afterEdit.records,seed.sourceBefore,'all immutable Source fields survive capture, visual changes, edit and reload');assert.deepEqual(afterEdit.library.blocks.filter(block=>block.id!==id),seed.workingBefore.filter(block=>block.id!==id),'a basic edit changes no other Working Input');
 await record('durable-edit-reload-and-immutable-source',{inputId:id,sha256:digest(literal),literalLength:literal.length});
 // Moving the one search into the editor root must not give it body Undo ownership.
 await page.setViewportSize({width:320,height:1000});await frame(page);assert.equal(await page.locator('#document-page #scope-search').count(),1);
 await page.locator('#scope-search').fill('');await page.locator('#scope-search').focus();await page.keyboard.type('D7 保存核验');assert.equal(await page.locator('#scope-search').inputValue(),'D7 保存核验');
 await page.keyboard.press('Control+z');await eventually(async()=>await page.locator('#scope-search').inputValue()!=='D7 保存核验','native query Undo changes the query buffer');
 assert.equal((await rpc(page,'GET_INPUT',{id})).libraryText,literal,'query Undo cannot undo the durably saved Working Input');assert.deepEqual((await h.state()).records,seed.sourceBefore,'query Undo cannot write Source');await record('compact-search-native-undo-isolation',{inputId:id,queryAfterUndo:await page.locator('#scope-search').inputValue(),savedWorkingSha256:digest(literal)});
 await page.locator('#scope-search').fill('');await eventually(async()=>await page.locator('.library-prose').count()===4&&!await page.locator('#document-search-tools').isVisible(),'Undo probe leaves the normal Reader restored');assert.equal(await page.locator(`.library-prose[data-edit-id="${id}"]`).textContent(),literal);await page.setViewportSize({width:1440,height:1000});
 await page.locator('#document-menu').click();await page.getByRole('menuitem',{name:'查看修改历史',exact:true}).click();await page.locator('#revision-dialog').waitFor({state:'visible'});await page.getByLabel('修改历史的 Input',{exact:true}).selectOption(id);await eventually(()=>page.locator('#revision-list .revision-row').count().then(count=>count>0),'the edited Input has durable real history');await page.locator('#revision-list .revision-row').first().getByRole('button',{name:'恢复此版本',exact:true}).click();await page.locator('.working-history-compare').waitFor({state:'visible'});assert.match(await page.locator('.working-history-compare section').first().textContent(),/D7 保存核验/);await page.locator('.working-history-confirm').getByRole('button',{name:'取消',exact:true}).click();assert.equal((await rpc(page,'GET_INPUT',{id})).libraryText,literal,'history comparison Cancel does not restore');await page.locator('#close-revisions').click();await record('existing-history-open-compare-cancel-close');
 const readerOrigin=await page.evaluate(()=>({documentId:history.state?.paiaReader?.documentId,returnTo:history.state?.paiaReader?.returnTo}));assert.equal(readerOrigin.returnTo,'library');
 await page.locator('.sidebar-bottom > [data-view="settings"]').click();await page.locator('[data-settings-group="reading"]').click();
 for(const [fontSize,readingWidth,px,cap]of [['large','wide',19,720],['standard','standard',17,680]]){
  await page.locator('#ux-font-size').selectOption(fontSize);await eventually(async()=>(await rpc(page,'GET_PAGE',{page:{view:'settings'}})).preferences.fontSize===fontSize,'font preference saved');
  await page.locator('#ux-reading-width').selectOption(readingWidth);await eventually(async()=>(await rpc(page,'GET_PAGE',{page:{view:'settings'}})).preferences.readingWidth===readingWidth,'width preference saved');
  await page.evaluate(()=>globalThis.__d7SettingsBack=document.getElementById('ux-settings-back'));await page.locator('#ux-settings-back').focus();await page.locator('#ux-settings-back').press('Enter');await eventually(async()=>await page.locator('#document-panel').isVisible()&&await page.locator('#scope-search').isEnabled()&&await page.evaluate(origin=>history.state?.paiaReader?.documentId===origin.documentId&&history.state?.paiaReader?.returnTo===origin.returnTo,readerOrigin),'keyboard Settings Back restores the settled Reader route');
  assert.equal(await page.evaluate(()=>__d7SettingsBack===document.getElementById('ux-settings-back')),true,'Settings retains the same Back control');assert.deepEqual(await page.evaluate(()=>({documentId:history.state?.paiaReader?.documentId,returnTo:history.state?.paiaReader?.returnTo})),readerOrigin);
  const current=await measure(page,'A02');near(current.body.width,cap,'saved reading width mapping');assert.equal(parseFloat(current.prose.fontSize),px);assert.equal(await page.locator(`.library-prose[data-edit-id="${id}"]`).textContent(),literal);
  await page.reload();await eventually(async()=>await page.locator('#document-panel').isVisible()&&await page.locator('#scope-search').isEnabled()&&await page.evaluate(origin=>history.state?.paiaReader?.documentId===origin.documentId&&history.state?.paiaReader?.returnTo===origin.returnTo,readerOrigin),'saved preference Reader reload retains its settled original route');const restored=await measure(page,'A02');near(restored.body.width,cap,'saved width survives reload');assert.equal(parseFloat(restored.prose.fontSize),px);await record('saved-reading-preference',{fontSize,readingWidth,pixels:px,width:cap,reload:true});
  if(fontSize==='large'){await page.locator('.sidebar-bottom > [data-view="settings"]').click();await page.locator('[data-settings-group="reading"]').click();}
 }
 // The bounded route repair retains the original Reader parent across both
 // Settings returns and reloads; the real Back must now reach Archive root.
 assert.deepEqual(await page.evaluate(()=>({documentId:history.state?.paiaReader?.documentId,returnTo:history.state?.paiaReader?.returnTo})),readerOrigin);
 await page.evaluate(()=>history.back());await eventually(async()=>await page.locator('#settings-panel').isVisible()&&await page.locator('#scope-search').isEnabled(),'browser Back settles on the intermediate Settings entry');
 await page.evaluate(()=>history.forward());await eventually(async()=>await page.locator('#document-panel').isVisible()&&await page.locator('#scope-search').isEnabled(),'browser Forward restores the settled Reader');assert.deepEqual(await page.evaluate(()=>({documentId:history.state?.paiaReader?.documentId,returnTo:history.state?.paiaReader?.returnTo})),readerOrigin);assert.equal(await page.locator(`.library-prose[data-edit-id="${id}"]`).textContent(),literal);
 await page.locator('#back').click();await eventually(()=>page.locator('#archive-root-main').isVisible(),'post-Settings Reader Back returns to the originating Archive');await record('preserved-settings-reader-return-target',{destination:'library',settingsRoundTrips:2,readerReloads:2,browserBackForward:true});
 await selectArchive(page);await page.locator('#archive-root-overflow > summary').focus();await page.keyboard.press('ArrowDown');assert.equal(await page.evaluate(()=>document.activeElement.id),'archive-root-history','existing More keyboard action remains reachable');assert.equal(await page.locator('#archive-source-scope').isVisible(),true);await page.locator('#archive-source-scope').focus();await page.keyboard.press('ArrowDown');assert.equal(await page.evaluate(()=>document.activeElement.id),'archive-source-scope','native source choice keeps its own arrow keys');await page.locator('#archive-source-scope').selectOption('chatgpt');await page.locator('#archive-source-scope').selectOption('');await page.locator('#archive-root-overflow > summary').click();await record('primary-root-source-chooser-after-settings');
 await page.setViewportSize({width:320,height:1000});await page.locator('#archive-compact-navigation > summary').click();assert.equal(await page.locator('#archive-compact-nav-items > [data-view]').count(),4);assert.equal(await page.locator('#primary-nav > button').count(),0);assert.equal(await page.locator('#archive-compact-navigation').evaluate(node=>node.open),true,'primary navigation is disclosed before reachability');await nativeReachability(page,['#archive-compact-nav-items [data-view="library"]'],{floor:44});assert.equal(await page.locator('#archive-compact-navigation').evaluate(node=>node.open),true,'reachability keeps the real primary navigation disclosed');await page.locator('#archive-compact-nav-items [data-view="library"]').click();await record('same-compact-primary-buttons');
 assert.deepEqual((await h.state()).records,seed.sourceBefore);await page.screenshot({path:`${directory}/${variant}-post-behavior-root.png`,animations:'disabled'});
}

export async function compareD7Archive(h,variant,{matrix='full',directory='work/d7-archive-reader',head=process.env.PAIA_TESTED_HEAD||execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),seed=null}={}){
 assert.ok(['archive','reader-compat','full'].includes(matrix));const page=h.archive,declared=matrix==='archive'?D7_ARCHIVE_MATRIX:matrix==='reader-compat'?D7_FULL_MATRIX.filter(row=>row.screen==='A02'&&!row.stress):D7_FULL_MATRIX,rows=declared.map(row=>({...row,status:'PENDING'})),errors=[],observations=[],references=new Map(),started=Date.now();
 await mkdir(directory,{recursive:true});
 const receipt={head,variant,matrix,expectedRows:declared.length,rows,errors,observations,qualifications,fixture:matrix==='full'?{kind:'D6.2 normal synthetic text through real capture',conversations:9,sources:12,readerTitle:D7_READER_FIXTURE.title,readerTimes:D7_READER_FIXTURE.times,readerBodySha256:D7_READER_FIXTURE.bodies.map(digest)}:{kind:'Existing caller synthetic Archive fixture retained unchanged',comparisonScope:'Root shell and responsive rules; canonical root project content is not claimed equal in this compatibility subset'},result:'PENDING',visualAcceptance:'PENDING_INDEPENDENT_FULL_WINDOW_REVIEW',scope:'Actual normal extension routes, exact literal Source/Working content, original immutable D6.2 frames, approved fixed geometry <=2px. No screenshot-only or pixel-threshold PASS.'};
 const persist=()=>writeFile(`${directory}/${variant}-${matrix}.json`,JSON.stringify({...receipt,elapsedMs:Date.now()-started},null,2));
 try{
  await persist();await page.setViewportSize({width:1440,height:1000});await selectArchive(page);await page.locator('#scope-search').fill('');
  if(matrix==='full'){await openNormalReader(page);await verifyD7ResponsiveFocus(page,async(kind,data)=>{observations.push({kind,...data});await persist();});await page.locator('#back').click();await eventually(()=>page.locator('#collection-panel').isVisible(),'fixed Back returns to Archive after early focus proof');}
  await eventually(()=>page.locator('#archive-navigator').isVisible(),'root navigator ready');
  // Keep root projects closed using their ordinary disclosure controls.
  for(const label of ['河岸散步','职业方向','学习与写作','日常想法']){const group=page.locator('.archive-navigator-group-toggle').filter({hasText:label}).first();if(await group.count()&&await group.getAttribute('aria-expanded')==='true')await group.click();}
  await page.evaluate(()=>{globalThis.__d7Search=document.getElementById('scope-search');globalThis.__d7PrimaryNodes=[...document.querySelectorAll('.sidebar [data-view]')];});
  let readerOpened=false;
  for(const row of rows){let cdp=null;
   if(Date.now()-started>230000)throw Error('D7 matrix exhausted its bounded execution budget; remaining declared rows stay PENDING, never PASS');
   try{
    if(row.screen==='A02'&&!readerOpened){await page.setViewportSize({width:1440,height:1000});await openNormalReader(page);readerOpened=true;}
    await page.evaluate(()=>document.activeElement?.blur());await page.setViewportSize({width:row.width,height:row.height});await rpc(page,'UPDATE_PREFERENCES',{changes:{appearance:row.theme,language:'zh-CN'}});await eventually(()=>page.evaluate(theme=>document.documentElement.dataset.paiaTheme===theme,row.theme),'D7 theme settled');await page.emulateMedia({reducedMotion:'reduce'});await settleD7Presentation(page,row);
    const defaultMenu=page.locator('#archive-compact-navigation');if(await visible(defaultMenu)&&await defaultMenu.evaluate(node=>node.open))await defaultMenu.locator('summary').click();assert.equal(await defaultMenu.evaluate(node=>node.open),false,'default comparison starts with the existing disclosure closed');await page.mouse.move(0,0);
    if(row.stress==='text200')await page.evaluate(()=>{globalThis.__d7TextZoom=[...document.querySelectorAll('#document-title,#document-subtitle,#document-body .library-prose,#document-body .block-time,#scope-search,#input-time-toggle,#document-menu,#archive-navigator-toggle')].map(node=>({node,properties:['font-size','line-height'].map(name=>({name,prior:node.style.getPropertyValue(name),priority:node.style.getPropertyPriority(name),value:parseFloat(getComputedStyle(node).getPropertyValue(name))}))}));for(const {node,properties}of __d7TextZoom)for(const {name,value}of properties)node.style.setProperty(name,`${value*2}px`,'important');});
    if(row.stress==='coarse'){cdp=await h.context.newCDPSession(page);await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});}
    await page.evaluate(()=>{document.activeElement?.blur();getSelection()?.removeAllRanges();scrollTo(0,0);});await frame(page);await eventually(async()=>{row.actual=await measure(page,row.screen);return row.screen!=='A02'||!!row.actual.selectedWindow&&(row.width<1024||!!row.actual.contextGroup);},'complete selected-window snapshot after asynchronous refresh');
    const stem=`${directory}/${variant}-${row.id}`,actualBuffer=await page.screenshot({path:stem+'-actual.png',animations:'disabled',fullPage:false});row.actualFile=stem.split('/').at(-1)+'-actual.png';
    const refKey=`${row.screen}-${row.screen==='A01'?1440:row.width}-${row.theme}`;
    if(!references.has(refKey)){
     const ref=await openD7Reference(h,row);references.set(refKey,ref);const file=`${directory}/${variant}-${refKey}-${ref.paletteDerived?'palette-derived':'canonical-original'}.png`;ref.buffer=await ref.page.screenshot({path:file,animations:'disabled',fullPage:false});ref.file=file.split('/').at(-1);
     // A derived dark frame never replaces its immutable light source artifact.
     if(ref.paletteDerived){const original=await openD7Reference(h,{...row,theme:'light'});try{await original.page.screenshot({path:`${directory}/${variant}-${refKey}-source-canonical-original.png`,animations:'disabled',fullPage:false});}finally{await original.page.close();}}
    }
    const ref=references.get(refKey);row.reference={file:ref.file,source:ref.name,sha256:ref.sha256,comparison:row.stress?'REACHABILITY_STRESS':ref.referenceWidth!==row.width?'RESPONSIVE_RULE_DERIVATIVE':ref.paletteDerived?'APPROVED_PALETTE_DERIVATIVE':'CANONICAL_ORIGINAL',originalUnchanged:true};
    if(!row.stress&&ref.referenceWidth===row.width)row.pixelDifference=await pixelDifference(ref.page,actualBuffer,ref.buffer,stem+'-difference.png');
    await persist();assertLayout(row.actual,row);
    assert.equal(await page.evaluate(()=>document.getElementById('scope-search')===__d7Search&&__d7PrimaryNodes.every(node=>node.isConnected)),true,'same search and primary nodes survive every responsive/theme projection');
    if(row.screen==='A02'){
     assert.equal(await page.evaluate(()=>__d7ReaderNode.isConnected&&__d7ControlNodes.every(([id,node])=>node===document.getElementById(id)&&node.isConnected)),true,'real editor and existing control nodes remain connected');
     assert.deepEqual(await page.locator('.library-prose').allTextContents(),D7_READER_FIXTURE.bodies);
     if(row.width<768){
      assert.equal(await page.locator('#archive-compact-reader-actions #archive-navigator-toggle').count(),1);assert.equal(await page.locator('#archive-compact-reader-actions #input-time-toggle').count(),1);assert.equal(await page.locator('#archive-compact-reader-actions #document-menu').count(),1);assert.equal(await page.locator('#reader-heading-actions').isVisible(),false,'phone has no empty action row');
      await page.locator('#back').focus();await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'document-title','phone Back leads directly into the reading title');
      await exposeReaderControl(page,'#archive-navigator-toggle');await page.locator('#archive-navigator-toggle').focus();await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'input-time-toggle');await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'document-menu');if(row.theme==='light'&&!row.stress)await page.screenshot({path:`${directory}/${variant}-A02-320-actions-open.png`,animations:'disabled'});await page.keyboard.press('Escape');assert.equal(await page.locator('#archive-compact-nav-label').evaluate(node=>document.activeElement===node),true,'disclosed actions return focus to the existing compact navigation');
     }else if(row.width<1024){await page.locator('#back').focus();await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'archive-navigator-toggle','tablet Back precedes the visible navigator toggle');}
    }
    if(row.stress){
     row.reachability=await nativeReachability(page,['#back','#archive-navigator-toggle','#scope-search','#input-time-toggle','#document-menu'],{floor:44});
     if(row.width<768){row.disclosedMenuLabel=await page.locator('#document-menu .document-menu-label').evaluate(node=>({fontSize:getComputedStyle(node).fontSize,visible:node.getClientRects().length>0,text:node.textContent}));assert.equal(row.disclosedMenuLabel.visible,true);assert.equal(parseFloat(row.disclosedMenuLabel.fontSize),row.stress==='text200'?26:13,'actual phone action label follows text enlargement');}
     if(row.stress==='text200'){
      row.stressMethod='200% text size on actual title, captions, prose and controls; not a claim of browser page zoom';
      assert.equal(row.actual.title.text,D7_READER_FIXTURE.title);assertTitleVisibility(row.actual.titleVisibility,'200% title');
     }else{
      assert.equal(row.actual.coarse,true);await page.locator('#document-menu').scrollIntoViewIfNeeded();const box=await page.locator('#document-menu').boundingBox();await page.evaluate(()=>{globalThis.__d7Touch=[];document.getElementById('document-menu').addEventListener('click',event=>__d7Touch.push({trusted:event.isTrusted,pointerType:event.pointerType}),{once:true});});await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.locator('#context-menu').waitFor({state:'visible'});row.touch=await page.evaluate(()=>__d7Touch);assert.deepEqual(row.touch,[{trusted:true,pointerType:'touch'}]);await page.keyboard.press('Escape');
     }
    }
    row.status='PASS';
   }catch(error){row.status='FAIL';row.error=String(error.stack||error);errors.push({id:row.id,error:row.error});await page.screenshot({path:`${directory}/${variant}-${row.id}-failure.png`,animations:'disabled',timeout:5000}).catch(()=>{});}
   finally{const compactMenu=page.locator('#archive-compact-navigation');if(await visible(compactMenu)&&await compactMenu.evaluate(node=>node.open))await compactMenu.locator('summary').click().catch(()=>{});if(row.stress==='text200')await page.evaluate(()=>{for(const {node,properties}of globalThis.__d7TextZoom||[])for(const {name,prior,priority}of properties)node.style.setProperty(name,prior,priority);delete globalThis.__d7TextZoom;}).catch(()=>{});if(cdp){await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false}).catch(()=>{});await cdp.detach();}await persist();}
  }
  if(matrix==='reader-compat'){assert.ok(seed,'Reader compatibility requires a retained fixture');assert.deepEqual((await h.state()).records,seed.sourceBefore);assert.deepEqual((await h.state()).library.blocks,seed.workingBefore);}
  if(matrix==='full'){
   assert.ok(seed,'full matrix requires the fixture/source snapshot returned by seedD7Archive');await verifyD7ArchiveBehavior(h,seed,{directory,variant,observations,persist});
  }
  assert.equal(h.externalRequests,0,'no external request');assert.equal(h.extensionNetworkRequests,0,'no provider/extension network request');assert.equal(h.deepSeekRequests.length,0,'no AI request');assert.deepEqual(h.errors,[],'no browser page errors');
  assert.equal(rows.length,declared.length);assert.deepEqual(rows.map(row=>row.id),declared.map(row=>row.id),'every declared row retained');assert.equal(rows.filter(row=>row.status==='PASS').length,declared.length,'every declared matrix row must pass assertions');assert.deepEqual(errors,[]);
  receipt.result='PASS';await persist();return receipt;
 }catch(error){receipt.result='FAIL';errors.push({id:'matrix-or-behavior',error:String(error.stack||error)});await persist();throw error;}
 finally{
  receipt.network={externalRequests:h.externalRequests,extensionNetworkRequests:h.extensionNetworkRequests,providerRequests:h.deepSeekRequests.length,pageErrors:[...h.errors]};
  await persist();
  for(const ref of references.values())await ref.page.close();await page.emulateMedia({reducedMotion:'no-preference'}).catch(()=>{});await page.setViewportSize({width:1440,height:1000}).catch(()=>{});
  if(await visible(page.locator('#document-panel'))){await page.locator('#back').click();await eventually(()=>page.locator('#collection-panel').isVisible(),'D7 comparison returns through existing Back');}
  await rpc(page,'UPDATE_PREFERENCES',{changes:{appearance:'light',language:'zh-CN'}}).catch(()=>{});
 }
}

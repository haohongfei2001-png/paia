// Current owner-approved Archive geometry with historical offline D6.2 references. Production never imports this helper or the masters.
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {eventually} from './fake-chatgpt.mjs';
import {openArchiveWindow,waitArchiveWindow} from './archive-navigator.mjs';
import {openRawDocument,rawDocumentMenu} from './raw-source-navigation.mjs';
import {assertTitleVisibility} from './d7-title-visibility.mjs';
import {renderedTypography} from './rendered-typography.mjs';
import {whitePalette} from './white-refinement-reference.mjs';
import {archiveWhiteReference} from './archive-white-reference.mjs';

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
 'PAIA-WHITE-UI-1.0 / IAH-1.4 replaces historical D6.2 palette only. Current exact light/dark color assertions use the independently transcribed final approved refinement; historical master bytes, geometry, keyboard, source and interaction coverage remain unchanged.',
 'The owner October 7 decision replaces A01 full-width directory with a narrow directory and an empty reading area, The implementation uses 272px for the widest narrow directory. Original D6.2 images remain historical references; their replaced geometry is not a current acceptance target. Unchanged Reader geometry, themes, typography and reachability retain their exact assertions.',
 'Existing preference normalization resolves both new and saved standard reading settings to 17px/680px. The approved 16px/29px/800px drawing is retained unchanged; this comparison never invents an unset preference or changes the standard mappings.',
 'The Source model has no project description and the navigator has no window-date field. The original A01 descriptions and A02 navigator dates remain in canonical images; actual content does not fabricate them.',
 'The A02 decorative code panel is captured as literal plaintext in Working Input. No Markdown interpretation, extra body store, or synthetic rendered code panel is introduced.',
 'Actual Reader date range and My inputs subtitle come from the existing owner. The drawing recent-modification subtitle and already-modified marker are not fabricated.',
 'A01 has only a 1440 light standalone master. Other root widths use the approved responsive rules with the original wide master retained, not a scaled desktop image advertised as a reflow drawing. Missing dark standalone masters use the approved palette on the unchanged light geometry.',
 'Actual localization follows the existing language preference; English product labels in the canonical master are retained in the target and never forced onto Chinese controls.',
 'Current UX §4 retires all app-owned Reader queries, including the navigator. Archive discovery search remains at its original owner. PRE_SECTION §2 replaces the large headline with the same Conversation identity in the top tool line at13px; original title bytes, clipping controls, Back node, body axis, native reachability and search-free Reader remain verified.',
 'Native controls, including the root overflow and compact Reader actions, remain reachable even where the static drawing omits their full hit areas. Geometry differences are recorded for independent visual review, never hidden by a pixel tolerance.'
];
const darkPalette={'#FFFFFF':'#171D28','#FAFBFD':'#121823','#17233C':'#E8EDF7','#63728A':'#B0BDD0','#68778E':'#A5B4CB','#E6EBF2':'#303B4C','#F4F6FA':'#202939','#EAF1FF':'#263B5B','#235DD3':'#94BAFF','#A34F46':'#E2A295'};
const digest=value=>createHash('sha256').update(value).digest('hex');
const rpc=async(page,type,fields={})=>{const value=await page.evaluate(message=>chrome.runtime.sendMessage(message),{type,...fields});assert.equal(value.ok,true,JSON.stringify(value));return value.data;};
const frame=page=>page.evaluate(async()=>{await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
const near=(actual,expected,label)=>assert.ok(Number.isFinite(actual)&&Math.abs(actual-expected)<=2,`${label}: ${actual} versus ${expected} (2px maximum)`);
const visible=locator=>locator.isVisible().catch(()=>false);

// Hold the production nodes themselves: equal labels alone cannot detect a remount.
export async function rememberArchiveDirectory(page,key='directory'){
 return page.evaluate(key=>{
  const host=document.getElementById('archive-navigator'),selector='.archive-navigator-provider,.archive-navigator-group,.archive-navigator-group-toggle,.archive-navigator-window-row,.archive-navigator-window',nodes=[host,document.getElementById('archive-root-header'),document.getElementById('scope-search'),...host.querySelectorAll(selector)],shape=()=>({order:[...host.querySelectorAll('.archive-navigator-group-toggle,.archive-navigator-window')].map(node=>node.textContent),expanded:[...host.querySelectorAll('.archive-navigator-group-toggle')].map(node=>node.getAttribute('aria-expanded')),scrollTop:host.scrollTop,scrollLeft:host.scrollLeft,query:document.getElementById('scope-search').value});
  globalThis.__archiveDirectoryProofs??=new Map();for(const proof of __archiveDirectoryProofs.values())proof.observer.disconnect();__archiveDirectoryProofs.clear();const state=shape(),changes=[],record=records=>{for(const mutation of records)for(const node of [...mutation.addedNodes,...mutation.removedNodes])if(node.nodeType===Node.ELEMENT_NODE)changes.push(node.id||node.className||node.tagName);},observer=new MutationObserver(record);observer.observe(document.getElementById('archive-reader-navigator-slot'),{childList:true,subtree:true});globalThis.__archiveDirectoryProofs.set(key,{nodes,parents:nodes.map(node=>node.parentElement),selector,state,changes,record,observer});return state;
 },key);
}
export async function assertArchiveDirectoryUnchanged(page,key='directory'){
 const actual=await page.evaluate(key=>{
  const saved=globalThis.__archiveDirectoryProofs.get(key),host=document.getElementById('archive-navigator'),nodes=[host,document.getElementById('archive-root-header'),document.getElementById('scope-search'),...host.querySelectorAll(saved.selector)];saved.record(saved.observer.takeRecords());
  return {structuralChanges:[...saved.changes],sameNodes:nodes.length===saved.nodes.length&&nodes.every((node,index)=>node===saved.nodes[index]&&node.isConnected&&node.parentElement===saved.parents[index]),before:saved.state,after:{order:[...host.querySelectorAll('.archive-navigator-group-toggle,.archive-navigator-window')].map(node=>node.textContent),expanded:[...host.querySelectorAll('.archive-navigator-group-toggle')].map(node=>node.getAttribute('aria-expanded')),scrollTop:host.scrollTop,scrollLeft:host.scrollLeft,query:document.getElementById('scope-search').value}};
 },key);
 assert.deepEqual(actual.structuralChanges,[],key+' never removes, inserts or reorders directory elements during selection');assert.equal(actual.sameNodes,true,key+' preserves exact directory nodes and parents');assert.deepEqual(actual.after,actual.before,key+' preserves directory order, expanded groups, scroll and query');return actual.after;
}
export async function assertBlankArchiveReader(page){
 const state=await page.evaluate(()=>({title:document.getElementById('document-title').textContent.trim(),subtitle:document.getElementById('document-subtitle').textContent.trim(),body:document.getElementById('document-body').textContent.trim(),readerVisible:!!document.getElementById('document-panel').getClientRects().length,selected:document.querySelectorAll('.archive-navigator-window[aria-current="page"]').length,visibleTools:[...document.querySelectorAll('#reader-scope-search,#back,#input-time-toggle,#document-menu,.pagination')].filter(node=>node.getClientRects().length).map(node=>node.id||node.className)}));
 assert.deepEqual(state,{title:'',subtitle:'',body:'',readerVisible:false,selected:0,visibleTools:[]},'unselected Reader has no stale title, body, search, actions or global pager');
}

export async function consentD7Archive(h){
 const page=h.archive;
 await page.locator('#enable-consent').waitFor({state:'visible'});assert.equal((await rpc(page,'GET_STATUS')).consented,false,'capture is not consented before the actual explicit confirmation');await page.locator('#enable-consent').click();
 await eventually(async()=>(await rpc(page,'GET_STATUS')).consented===true,'D7 synthetic local-save consent');
 await page.locator('.sidebar-bottom [data-view="settings"]').click();await page.locator('[data-settings-group="data"]').click();if(await page.locator('#onboarding-skip').isVisible())await page.locator('#onboarding-skip').click();await page.locator('#ux-settings-back').click();
 await rpc(page,'UPDATE_PREFERENCES',{changes:{language:'zh-CN',appearance:'light'}});
}

// Capture the normal synthetic text through the real adapter. Only relationship
// metadata is added with the existing SourceStructureStore fixture API.
export async function seedD7Archive(h,{readerOnly=false,beforeMetadata=null}={}){
 const prior=await h.state(),priorIds=new Set(prior.records.map(row=>row.id));
 const titles=[D7_READER_FIXTURE.title,'第一次试用之后的想法','路线可以少一点吗','Onboarding: what stays simple','长期使用，而不是一次惊喜','职业方向','学习与写作','日常想法','一次还没命名的讨论'];
 const projects=['河岸散步','河岸散步','河岸散步','河岸散步','河岸散步','职业方向','学习与写作','日常想法',null],fixtures=[];
 for(let i=0;i<(readerOnly?1:titles.length);i++){
  const fixture={id:`d7-archive-normal-${i}`,title:titles[i],base:Date.parse(i?'2026-09-27T09:00:00Z':D7_READER_FIXTURE.times[0])/1000+(i?(9-i)*60:0),messages:(i?['这是用于 D7 档案视觉验证的合成输入。']:D7_READER_FIXTURE.bodies).map((text,j)=>({id:`d7-archive-normal-${i}-${j}`,text}))};
  const response=h.response(fixture);
  if(!i)for(const [j,node]of ['first','second','third','node3'].entries()){response.mapping[node].message.create_time=Date.parse(D7_READER_FIXTURE.times[j])/1000;response.mapping[node].message.update_time=response.mapping[node].message.create_time+1;}
  h.pending.set(fixture.id,response);const capture=await h.open(fixture);fixtures.push({id:fixture.id,project:projects[i]});
  try{await eventually(async()=>{const state=await h.state();return fixture.messages.every(message=>state.records.some(row=>row.sourceMessageId===message.id&&row.originalText===message.text));},'D7 normal fixture captured '+fixture.id);}
  catch(error){try{
   const state=await h.state();await mkdir('work/d7-archive-reader',{recursive:true});
   await writeFile('work/d7-archive-reader/capture-failure.json',JSON.stringify({fixtureId:fixture.id,expected:fixture.messages.map(message=>({id:message.id,matched:state.records.some(row=>row.sourceMessageId===message.id&&row.originalText===message.text)})),actual:state.records.map(row=>({id:row.id,sourceMessageId:row.sourceMessageId,conversationId:row.conversationId})),status:await rpc(h.archive,'GET_STATUS'),pendingResponse:h.pending.has(fixture.id),capture:await capture.evaluate(()=>({url:location.href,visibility:document.visibilityState,historyGateActive:window.historyGateActive,ready:document.readyState,userIds:[...document.querySelectorAll('[data-message-author-role="user"]')].map(node=>node.dataset.messageId)}))},null,2));}catch(diagnosticError){console.error('D7_CAPTURE_DIAGNOSTIC_UNAVAILABLE '+diagnosticError.name);}throw error;
  }
  await capture.close();
 }
 // Run an optional completion barrier after all original capture checks and
 // closed synthetic hosts, before the existing SDK metadata operations.
 if(beforeMetadata)await beforeMetadata();
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
  const node=document.querySelector(selector),rects=[],clips=[],hidden=[],unsupported=[];if(!node)return null;
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
 return {blankReader:{title:document.getElementById('document-title')?.textContent?.trim(),body:document.getElementById('document-body')?.textContent?.trim(),subtitle:document.getElementById('document-subtitle')?.textContent?.trim(),panelHidden:document.getElementById('document-panel')?.hidden,sortVisible:!!document.getElementById('input-time-toggle')?.getClientRects().length},titleVisibility:reader?titleVisibility('#document-title'):null,viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},overflow:document.documentElement.scrollWidth-innerWidth,theme:document.documentElement.dataset.paiaTheme,language:document.documentElement.lang,coarse:matchMedia('(pointer:coarse)').matches,fontEnvironment:{sans:document.fonts.check('16px "Noto Sans CJK SC"'),serif:document.fonts.check('28px "Noto Serif CJK SC"'),timezone:Intl.DateTimeFormat().resolvedOptions().timeZone},rail:read('.sidebar'),logo:read('.brand img'),brand:read('.brand'),nav:read('#primary-nav'),selected:read('.sidebar [data-view="library"]'),navigator:read('#archive-reader-navigator-slot'),root:read(reader?'#document-page':'#collection-panel'),title:read(reader?'#document-title':'#archive-root-heading'),search:read(reader?'#reader-scope-search':'#scope-search'),directorySearch:read('#scope-search'),readerSearchHost:document.getElementById('reader-scope-search-host')?.parentElement.id,readerTools:read('#reader-compact-tools'),heading:read('#reader-heading'),subtitle:read('#document-subtitle'),archiveHeadingVisible:!!document.getElementById('view-title')?.getClientRects().length,searchPlaceholders:[...document.querySelectorAll('#scope-search,#reader-scope-search')].map(node=>node.placeholder),searchHost:document.querySelector('#scope-search-host')?.parentElement.id,back:read('#back'),backSlot:read('#archive-reader-back-slot'),titleToolOwner:document.getElementById('reader-heading')?.parentElement.id,backHost:document.querySelector('#back')?.parentElement.id,sort:read('#input-time-toggle'),menu:read('#document-menu'),status:read('#save-status'),actions:read(reader?'#reader-heading-actions':'#archive-root-header-actions'),body:read('#document-body'),prose:read('.library-prose'),caption:read('#document-body .block-time'),compact:read('#archive-compact-navigation'),rootOverflow:read('#archive-root-overflow'),firstGroup:read('.archive-navigator-group-toggle'),selectedWindow:read('.archive-navigator-window[aria-current="page"]'),contextBackParent:document.getElementById('archive-reader-back-slot')?.parentElement.id,groupTitles:[...document.querySelectorAll('.archive-navigator-group-toggle')].map(node=>node.textContent),documentTitleInsidePage:!!document.querySelector('#document-page #document-title'),oneSearch:document.querySelectorAll('#scope-search').length,oneReaderSearch:document.querySelectorAll('#reader-scope-search').length,oneSort:document.querySelectorAll('#input-time-toggle').length,modal:!!document.querySelector('dialog:modal'),declaredPreference:{size:document.documentElement.style.getPropertyValue('--paia-prose-size'),width:document.documentElement.style.getPropertyValue('--paia-prose-width')}};
 },screen);}


function assertLayout(actual,row){
 const {width,theme,screen,stress}=row,reader=screen==='A02',rail=width>=1280?184:width>=1024?160:width>=768?64:0,nav=reader?(width>=1024?(width>=1440?272:width>=1280?280:240):0):(width>=1440?272:width>=1280?280:width>=768?240:width),gutter=reader?(width>=768?44:20):20,titleX=reader?actual.backSlot.right+8:null;
 row.geometryContract={authority:'Current UX / PRE_SECTION §2 compact identity; retained Archive body and responsive axes',maximumTolerancePx:2,railWidth:width<768?width:rail,navigatorWidth:nav,gutter,titleX,bodyWidth:reader?Math.min(680,width-rail-nav-gutter*2):null,titleSize:reader?13*(stress==='text200'?2:1):null,standardPreference:{size:17,width:680},unchangedMasterReading:{size:16,leading:29,maximumWidth:800}};
 row.fixedGeometryDifference={railWidth:actual.rail.width-row.geometryContract.railWidth,...(reader?{titleX:actual.title.x-row.geometryContract.titleX}:{}),...(reader?{bodyWidth:actual.body.width-row.geometryContract.bodyWidth,navigatorWidth:width>=1024?actual.navigator.width-nav:null}:{}),meaning:'Numeric differences from the declared applicable fixed geometry; text/preference differences remain visible in original-target pixel diagnostics.'};
 assert.equal(actual.theme,theme);assert.equal(actual.oneSearch,1);assert.equal(actual.oneReaderSearch,0,'UX §4 retires Reader Find from the DOM');assert.deepEqual(actual.searchPlaceholders,['搜索全部档案'],'Archive discovery remains the sole app search');assert.equal(actual.archiveHeadingVisible,false,'no duplicate Archive title');assert.equal(actual.oneSort,1);assert.equal(actual.modal,false);assert.ok(actual.overflow<=2,`${row.id} root overflow ${actual.overflow}`);
 near(actual.rail.width,width<768?width:rail,row.id+' primary rail width');
 if(width<768)near(actual.rail.height,58,row.id+' compact header height');
 else{near(actual.rail.x,0,row.id+' rail x');near(actual.rail.y,0,row.id+' rail y');near(actual.logo.width,width<1024?40:48,row.id+' approved mark width');near(actual.logo.height,width<1024?40:48,row.id+' approved mark height');if(width>=1024){near(actual.logo.x,(rail-48)/2,row.id+' brand centered');near(actual.logo.y,28,row.id+' brand y');near(actual.nav.y,135,row.id+' first navigation row');}}
 if(reader){near(actual.title.x,titleX,row.id+' compact identity follows original Back tools');assert.equal(actual.titleToolOwner,'reader-compact-tools','the single semantic title stays inside the top tool line');assert.match(actual.title.fontFamily,/Georgia.*Noto Serif CJK SC/,'Reader title retains the approved serif role');assert.equal(actual.title.fontWeight,'500');assert.equal(parseFloat(actual.title.fontSize),row.geometryContract.titleSize);}
 else assert.equal(actual.title.visible,false,'directory has no duplicate Archive heading');
 assert.equal(actual.searchHost,'archive-root-header-actions','Archive search keeps its persistent directory owner');assert.equal(actual.readerSearchHost,undefined,'retired Reader query has no hidden host');
 const palette=whitePalette(theme);
 assert.equal(actual.rail.backgroundColor,palette.rail,'approved white/dark primary rail');if(reader)assert.equal(actual.title.color,palette.heading,'approved white/dark Archive Reader title');
 if(!reader){assert.equal(actual.search.backgroundColor,palette.search,'approved white/dark discovery search surface');assert.ok(actual.search.visible&&actual.search.width>0&&actual.search.x>=0&&actual.search.right<=width+2,'the Archive discovery search is visible and horizontally reachable');}else{assert.equal(actual.search,null,'Reader has no local search');assert.equal(actual.directorySearch.visible,false,'Reader has no global Archive search');}
 if(reader){
  assert.equal(actual.documentTitleInsidePage,true);assert.equal(actual.backHost,'archive-reader-back-slot');
  if(width>=1024){near(actual.navigator.x,rail,row.id+' navigator x');near(actual.navigator.width,nav,row.id+' navigator width');}
  near(actual.body.x,rail+nav+gutter,row.id+' body reading axis');
  near(actual.body.width,Math.min(680,width-rail-nav-gutter*2),row.id+' exact retained standard width');
  assert.equal(parseFloat(actual.prose.fontSize),17*(stress==='text200'?2:1),'actual standard body size is reported honestly');assert.equal(actual.declaredPreference.width,'680px');assert.equal(actual.declaredPreference.size,'17px');
  assert.equal(actual.prose.whiteSpace,'pre-wrap');assert.ok(actual.caption.visible,'native time caption remains visible');
  assert.equal(actual.contextBackParent,'reader-compact-tools','Back stays in the right Reader');
  if(actual.status?.visible&&actual.status.text.trim()){assert.ok(actual.status.y>=actual.readerTools.bottom,row.id+' saving status stays below the Reader tools');assert.ok(actual.caption.y>=actual.status.bottom,row.id+' Input caption stays below saving status');}
  if(!stress){assert.ok(actual.title.y>=actual.readerTools.y&&actual.title.bottom<=actual.readerTools.bottom+2,'compact identity stays inside the top tool line');assert.equal(actual.subtitle.visible,false,'retired Reader date-range introduction is absent');assert.ok(actual.caption.y>=actual.heading.bottom,'Input caption follows compact Reader chrome');}
 }else{
  near(actual.navigator.x,rail,row.id+' directory follows primary navigation');near(actual.navigator.width,nav,row.id+' narrow directory width');
  near(actual.root.x,width>=768?rail+nav:0,row.id+' blank reading column follows directory');near(actual.search.y,width>=768?24:82,row.id+' persistent directory search top');
  assert.equal(actual.rootOverflow.visible,true,'root overflow remains available');assert.equal(actual.selectedWindow,null,'root selects no conversation');
  assert.deepEqual(actual.blankReader,{title:'',body:'',subtitle:'',panelHidden:true,sortVisible:false},'root reading title, time, sort and body remain empty');
 }
 if(reader){assert.equal(parseFloat(actual.title.lineHeight),20*(stress==='text200'?2:1),'exact current title line height');assertTitleVisibility(actual.titleVisibility,row.id+' whole title');}
}

async function verifyCompactInputActions(page,row){
 const action=page.locator('#document-body .reader-more').first();await action.scrollIntoViewIfNeeded();
 // The gutter must also accept a first pointer visit before keyboard focus.
 const pointerBox=await action.boundingBox();assert.ok(pointerBox);await page.mouse.move(pointerBox.x+pointerBox.width/2,pointerBox.y+pointerBox.height/2);
 const pointer=await action.evaluate(n=>{const r=n.getBoundingClientRect(),at=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {hit:at===n||n.contains(at),opacity:getComputedStyle(n.parentElement).opacity};});assert.equal(pointer.hit,true,'the actual More gutter accepts a pointer before focus');assert.equal(pointer.opacity,'1','the native pointer visit exposes the original More control');await action.focus();await action.scrollIntoViewIfNeeded();
 const value=await action.evaluate(node=>{const rect=n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};},box=rect(node),block=node.closest('.library-block'),prose=rect(block.querySelector('.library-prose')),at=document.elementFromPoint(box.x+box.width/2,box.y+box.height/2),blocks=[...document.querySelectorAll('#document-body .library-block')];return {button:box,prose,focused:document.activeElement===node,hit:at===node||node.contains(at),margin:parseFloat(getComputedStyle(block).marginBottom),gaps:blocks.slice(1).map((next,i)=>({year:next.querySelector('.block-time').classList.contains('input-year-start'),pixels:rect(next.querySelector('.block-time')).y-rect(blocks[i].querySelector('.library-prose')).bottom}))};});
 assert.equal(value.focused,true);assert.equal(value.hit,true,'same contextual Input button is genuinely reachable');assert.ok(value.button.width>=44&&value.button.height>=44,'real Input action retains44px target');assert.ok(value.button.x>=0&&value.button.right<=row.width+2,'Input action stays inside the existing gutter or metadata row');
 assert.ok(value.button.bottom<=value.prose.y+2||value.button.x>=value.prose.right-2,'Input action never covers literal prose');assert.equal(value.margin,18,'approved adjacent Input spacing removes old48px reserve');
 for(const gap of value.gaps)assert.ok(gap.pixels>=16&&gap.pixels<=(gap.year?44:20),'actual prose-to-next-date gap has only18px plus the single24px year boundary: '+JSON.stringify(gap));
 const rules=await page.evaluate(()=>{
  const blocks=[...document.querySelectorAll('#document-body .library-block')].filter(node=>!node.hidden&&node.getClientRects().length),read=block=>{const stamp=block.querySelector('.block-time'),style=getComputedStyle(stamp,'::before');return {year:stamp.classList.contains('input-year-start'),content:style.content,width:parseFloat(style.width),position:style.position,top:style.top,border:style.borderTopWidth,borderStyle:style.borderTopStyle,color:style.borderTopColor,pointer:style.pointerEvents};},rows=blocks.map(read),first=blocks[0],second=blocks[1];
  let hiddenFirst=null,emptyPageFirst=null;if(first&&second){first.hidden=true;hiddenFirst=read(second);first.hidden=false;}
  const empty=document.createElement('div');empty.className='reader-page';document.getElementById('document-body').prepend(empty);try{emptyPageFirst=first?read(first):null;}finally{empty.remove();}
  return {rows,hiddenFirst,emptyPageFirst};
 });
 assert.ok(rules.rows.length>1,'the actual bounded Reader retains a real year boundary');
 for(const [index,rule]of rules.rows.entries()){
  if(index===0||!rule.year)assert.equal(rule.content,'none','only a real subsequent year receives a rule');
  else{assert.equal(rule.content,'""');assert.equal(rule.position,'absolute');assert.equal(rule.top,'-12px');assert.equal(rule.border,'1px');assert.equal(rule.borderStyle,'solid');assert.ok(rule.width>0);assert.notEqual(rule.color,'rgba(0, 0, 0, 0)');assert.equal(rule.pointer,'none','year chrome cannot intercept native text or actions');}
 }
 assert.equal(rules.hiddenFirst?.content,'none','a hidden preceding Input cannot create an orphan top rule');assert.equal(rules.emptyPageFirst?.content,'none','an empty first page cannot create an orphan top rule');value.yearRules=rules;
 await action.click();await page.locator('#context-menu').waitFor({state:'visible'});await page.keyboard.press('Escape');return value;
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
  // UX_CONTRACT §4 and PRE_YEAR §4: Reader Find is retired, including its host.
  if(get('scope-search-host').parentElement.id!=='archive-root-header-actions'||get('reader-scope-search-host')||get('reader-scope-search'))return false;
  if(!reader)return true;
  if(get('back').parentElement.id!=='archive-reader-back-slot')return false;
  if(get('archive-navigator-toggle').parentElement.id!==(phone?'archive-compact-reader-actions':desktop?'reader-compact-tools':'archive-reader-back-slot'))return false;
  if(get('document-menu').parentElement.id!==(phone?'archive-compact-reader-actions':'reader-heading-actions'))return false;
  if(getComputedStyle(get('document-menu')).fontSize!==(phone?'13px':'17px'))return false;
  return !!document.querySelector('.archive-navigator-window[aria-current="page"]')&&get('archive-reader-back-slot').parentElement.id==='reader-compact-tools';
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

async function openNormalReader(page,{onWindowWait=()=>{}}={}){
 await openArchiveWindow(page,{text:D7_READER_FIXTURE.title,label:'D7 ordinary root to project to Reader'});
 await eventually(async()=>await page.locator('#document-panel').isVisible()&&await page.locator('#document-page').evaluate(node=>!node.inert)&&await page.locator('.library-prose').count()>0,'D7 current Reader has qualified its initial year');
 assert.equal(await page.locator('#input-time-toggle').getAttribute('data-current-sort'),'desc','approved fresh Reader opens the newest actual year first');
 const expected=[...D7_READER_FIXTURE.bodies].reverse(),times=[...D7_READER_FIXTURE.times].reverse(),observed=[];
 const repeated=await page.evaluate(()=>globalThis.__d7ObservedAnnualDocument===history.state?.paiaReader?.documentId&&globalThis.__d7ObservedAnnualDocument!=null);
 // Preserve all four exact Source/Working observations, through each genuine
 // explicit year. The original bounded owner retains at most two40-row pages;
 // four distinct years are not an authorization to force four mounted pages.
 for(let step=0;!repeated&&step<expected.length;step++){
  await eventually(async()=>(await page.locator('.library-prose').allTextContents()).includes(expected[step]),'each explicit year paints its exact original Input');
  observed.push(expected[step]);assert.ok(await page.locator('#document-body>.reader-page').count()<=2,'all annual traversal keeps the original two-page window');
  if(step===expected.length-1)break;
  const next=page.locator('#reader-next-year');await next.waitFor({state:'visible'});assert.match(await next.textContent(),new RegExp(times[step+1].slice(0,4)),'the actual next year owns the native action');await next.click();
 }
 if(!repeated)assert.deepEqual(observed,expected,'all four original annual Inputs remain reachable once in the approved descending order');
 else assert.deepEqual(await page.evaluate(()=>__d7ObservedAnnualBodies),expected,'same-document restoration retains this journey’s already-proven four exact annual inputs');
 const mounted=expected.slice(-2),mountedTimes=times.slice(-2);
 // Re-entering a saved annual session first admits its anchor year, then
 // asynchronously restores already-opened years. Exact content, not one
 // visible anchor or Navigator selection, completes this two-page fixture.
 onWindowWait();await eventually(async()=>JSON.stringify(await page.locator('.library-prose').allTextContents())===JSON.stringify(mounted),'the saved annual window finishes restoring both exact original Inputs');
 assert.equal(await page.locator('#reader-scope-search,#reader-scope-search-host').count(),0,'retired Reader Find is absent');assert.equal(await page.locator('#scope-search').isVisible(),false,'Archive discovery search is absent during Reader');
 await eventually(()=>page.locator('.archive-navigator-window[aria-current="page"]').isVisible(),'existing selected path is ready without moving its group');
 assert.deepEqual(await page.locator('.library-prose').allTextContents(),mounted,'the original bounded window contains the exact final two yearly Inputs');
 const dates=await page.evaluate(times=>times.map(at=>new Date(at).toLocaleDateString('zh-CN',{year:'numeric',month:'long',day:'numeric',timeZone:'UTC'})+' '+new Date(at).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit',hourCycle:'h23',timeZone:'UTC'})),mountedTimes);
 assert.deepEqual(await page.locator('#document-body .block-time').allTextContents(),dates,'exact native captured source times');assert.equal(await page.locator('#document-search-tools').isVisible(),false,'empty query has no phantom search area');
 await page.evaluate(({bodies,all})=>{globalThis.__d7ObservedAnnualDocument=history.state.paiaReader.documentId;globalThis.__d7ObservedAnnualBodies=all;globalThis.__d7ExpectedBodies=bodies;globalThis.__d7ReaderNode=document.querySelector('.library-prose');globalThis.__d7ControlNodes=['scope-search','back','input-time-toggle','document-menu','save-status'].map(id=>[id,document.getElementById(id)]);},{bodies:mounted,all:expected});
}

async function openNormalReaderWithHeldRestoration(page){
 const target={year:Number(D7_READER_FIXTURE.times[0].slice(0,4)),body:D7_READER_FIXTURE.bodies[0]};
 await page.evaluate(({year})=>{const original=chrome.runtime.sendMessage.bind(chrome.runtime),documentId=globalThis.__d7ObservedAnnualDocument;if(!documentId)throw Error('D7_RESTORED_ANNUAL_SESSION_REQUIRED');const gate={original,release:null,released:false};globalThis.__d7RestorationGate=gate;chrome.runtime.sendMessage=async message=>{const reply=await original(message);if(!gate.released&&message.type==='GET_PAGE'&&message.page?.documentId===documentId&&message.page?.yearReading?.year===year&&!gate.release)await new Promise(resolve=>gate.release=()=>{gate.released=true;resolve();});return reply;};},target);
 let settled=false,failed=false,windowWait=false;const opening=openNormalReader(page,{onWindowWait:()=>windowWait=true}).then(value=>{settled=true;return {value};},error=>{settled=true;return {error};});
 try{
  await eventually(()=>page.evaluate(()=>!!__d7RestorationGate.release),'the original already-opened year restoration read is held');
  await eventually(async()=>await page.locator('#document-panel').isVisible()&&await page.locator('#document-page').evaluate(node=>!node.inert)&&await page.locator('.library-prose').count()===1,'the restored anchor is visible before its second original year');
  assert.equal((await page.locator('.library-prose').allTextContents()).includes(target.body),false,'held original year cannot already be painted');
  await eventually(()=>windowWait,'the real helper reaches its exact final-window wait while the original year read is held');
  assert.equal(settled,false,'one visible anchor cannot complete the exact annual window helper');
  await page.evaluate(()=>__d7RestorationGate.release());const result=await opening;if(result.error)throw result.error;
  return {kind:'held-original-year-restoration',year:target.year,anchorVisibleBeforeRelease:true,helperWaited:true,exactOriginalWindow:true};
 }catch(error){failed=true;throw error;}
 finally{try{await page.locator('html').evaluate(()=>{const gate=globalThis.__d7RestorationGate;if(gate){gate.released=true;gate.release?.();chrome.runtime.sendMessage=gate.original;delete globalThis.__d7RestorationGate;}},null,{timeout:1000});}catch(error){if(!failed)throw error;}await opening;}
}

async function d7ReaderReady(page,documentId,input=null){
 await eventually(async()=>await page.locator('#document-panel').isVisible()&&await page.locator('#document-page').evaluate(node=>!node.inert)&&await page.evaluate(id=>history.state?.paiaReader?.view==='library'&&history.state.paiaReader.documentId===id,documentId)&&(input?await page.locator('.library-prose[data-edit-id="'+input.id+'"]').textContent().catch(()=>null)===input.body:await page.locator('.library-prose').count()>0),'the actual canonical Reader and requested Input finish qualified paint');
 assert.equal(await page.locator('#reader-scope-search,#reader-scope-search-host').count(),0);assert.equal(await page.locator('#scope-search').isVisible(),false);
}
async function d7DiscoveryBack(page){
 await page.locator('#back').click();await eventually(async()=>await page.locator('#collection-panel').isVisible()&&await page.locator('#scope-search').isVisible()&&await page.locator('#scope-search').isEnabled()&&await page.evaluate(()=>history.state?.paiaReader?.view==='library'&&history.state.paiaReader.documentId===null),'real Reader Back exposes the actual Archive discovery search');
}
async function d7DiscoveryResult(page,input,query,{directoryProof=null}={}){
 assert.equal(await page.locator('#scope-search').isVisible(),true);await page.locator('#scope-search').fill(query);
 const result=page.locator('#document-list .search-input[data-input-id="'+input.id+'"]');
 await eventually(async()=>await page.locator('#document-list .search-input').count()===1&&await result.isVisible()&&await result.locator('mark.search-match').allTextContents().then(values=>values.includes(query))&&await page.locator('#document-list').getAttribute('aria-busy')!=='true','the new exact canonical Input result and query highlight settle before its native click');
 assert.equal(await result.getAttribute('data-input-id'),input.id);if(directoryProof)await rememberArchiveDirectory(page,directoryProof);await result.click();await d7ReaderReady(page,input.documentId,input);if(directoryProof)await assertArchiveDirectoryUnchanged(page,directoryProof);
}
async function d7AnnualTraversal(page,inputs,sort){
 assert.notEqual(await page.locator('#input-time-toggle').getAttribute('data-current-sort'),sort,'each traversal begins with an explicit change to the opposite chronological endpoint');await page.locator('#input-time-toggle').focus();await page.locator('#input-time-toggle').press('Enter');
 const expected=sort==='asc'?inputs:[...inputs].reverse();await eventually(async()=>await page.locator('#input-time-toggle').getAttribute('data-current-sort')===sort&&(await rpc(page,'GET_ORGANIZER_CONTROLS')).inputReadingSort===sort&&JSON.stringify(await page.locator('.library-prose').evaluateAll(nodes=>nodes.map(node=>node.dataset.editId)))===JSON.stringify([expected[0].id]),'native order change starts at its single actual populated endpoint year');
 const observed=[];
 for(const [index,input]of expected.entries()){
  await d7ReaderReady(page,input.documentId,input);const field=page.locator('.library-prose[data-edit-id="'+input.id+'"]'),stamp=await field.evaluate(node=>node.closest('.library-block').querySelector('.block-time').textContent),date=await page.evaluate(at=>new Date(at).toLocaleDateString('zh-CN',{year:'numeric',month:'long',day:'numeric',timeZone:'UTC'})+' '+new Date(at).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit',hourCycle:'h23',timeZone:'UTC'}),input.at);assert.equal(stamp,date,'each exact Input keeps its actual captured timestamp');observed.push({id:input.id,body:await field.textContent(),at:input.at});
  const mounted=await page.locator('.library-prose').evaluateAll(nodes=>nodes.map(node=>node.dataset.editId));assert.deepEqual(mounted,expected.slice(Math.max(0,index-1),index+1).map(row=>row.id),'the original two-page window contains only the two latest explicitly opened annual Inputs');assert.ok(await page.locator('#document-body>.reader-page').count()<=2);
  if(index===expected.length-1){await eventually(()=>page.locator('#reader-next-year').isHidden(),'a fully qualified final year has no invented next-year action');break;}
  for(const unopened of expected.slice(index+1))assert.equal(await page.locator('.library-prose[data-edit-id="'+unopened.id+'"]').count(),0,'an unopened year is not mounted, even as hidden prose');
  await field.evaluate(node=>globalThis.__d7PriorAnnualNode=node);const next=page.locator('#reader-next-year');await next.waitFor({state:'visible'});assert.match(await next.textContent(),new RegExp(expected[index+1].at.slice(0,4)));await next.click();await d7ReaderReady(page,input.documentId,expected[index+1]);assert.equal(await field.evaluate(node=>node===__d7PriorAnnualNode),true,'appending one year retains the preceding actual editor node');
 }
 assert.deepEqual(observed,expected.map(({id,body,at})=>({id,body,at})));return observed;
}
async function inspectSource(h,documentId,bodies){
 const page=h.archive,nodes=await page.locator('.library-prose').evaluateAll(nodes=>{globalThis.__d7SourceInspectionNodes=nodes;return nodes.map(node=>node.dataset.editId);}),raw=await h.context.newPage();raw.on('pageerror',error=>h.errors.push(error.message));
 try{
  await raw.setViewportSize({width:1440,height:1000});await raw.goto(new URL('./archive.html',page.url()).href);await eventually(()=>raw.locator('.sidebar [data-view="settings"]').isVisible());await openRawDocument(raw,documentId);await rawDocumentMenu(raw);await raw.getByRole('menuitem',{name:'查看原始内容',exact:true}).click();
  await eventually(async()=>await raw.locator('#info-dialog').evaluate(node=>node.open)&&await raw.locator('#info-content .source-original').count()===bodies.length,'the existing Settings raw-data route opens the same complete immutable Source scope');assert.deepEqual(await raw.locator('#info-content .source-original').allTextContents(),bodies);assert.equal(await raw.locator('#info-content [contenteditable]').count(),0);assert.deepEqual(await raw.locator('#info-content .source-original').evaluateAll(nodes=>nodes.map(node=>node.isContentEditable)),bodies.map(()=>false));
  await raw.locator('#close-info').click();await eventually(()=>raw.locator('#document-menu').evaluate(node=>document.activeElement===node),'Source close restores its actual raw-document menu invoker');assert.equal(await raw.locator('#info-content').textContent(),'');assert.equal(raw.context(),page.context());
 }finally{await raw.close();await page.bringToFront();}
 assert.deepEqual(await page.locator('.library-prose').evaluateAll(nodes=>nodes.map(node=>node.dataset.editId)),nodes);assert.equal(await page.evaluate(()=>__d7SourceInspectionNodes.every(node=>node.isConnected)&&[...document.querySelectorAll('.library-prose')].every((node,index)=>node===__d7SourceInspectionNodes[index])),true,'low-frequency Source inspection in the same context does not remount the original Reader');
}

async function verifyD7ResponsiveFocus(page,record){
 await page.setViewportSize({width:1440,height:1000});await settleD7Presentation(page,{screen:'A02',width:1440});await frame(page);
 const focusSnapshot=()=>page.evaluate(()=>({activeId:document.activeElement?.id,activeTag:document.activeElement?.tagName,space:document.body.dataset.paiaSpace,menuOpen:document.getElementById('archive-compact-navigation').open,controls:['back','document-menu','archive-navigator-toggle'].map(id=>{const node=document.getElementById(id);return {id,parent:node.parentElement.id,connected:node.isConnected,rects:node.getClientRects().length};})}));
 const resizeFocused=async(id,width,label)=>{await record('responsive-focus-before',{id,width,snapshot:await focusSnapshot()});try{await page.setViewportSize({width,height:1000});await eventually(()=>page.evaluate(({id,width})=>{const get=id=>document.getElementById(id),compact=width<768,desktop=width>=1024,node=get(id),menu=get('archive-compact-navigation');return innerWidth===width&&menu.hidden===!compact&&menu.open===(compact&&id==='document-menu')&&get('scope-search-host').parentElement.id==='archive-root-header-actions'&&!get('reader-scope-search-host')&&!get('reader-scope-search')&&get('archive-navigator-toggle').parentElement.id===(compact?'archive-compact-reader-actions':desktop?'reader-compact-tools':'archive-reader-back-slot')&&get('document-menu').parentElement.id===(compact?'archive-compact-reader-actions':'reader-heading-actions')&&get('back').parentElement.id==='archive-reader-back-slot'&&document.activeElement===node&&node.getClientRects().length>0;},{id,width}),label);}finally{await record('responsive-focus-after',{id,width,snapshot:await focusSnapshot()});}};
 await page.locator('#back').focus();await resizeFocused('back',320,'focused Back survives both responsive owners');assert.equal(await page.locator('#archive-compact-navigation').evaluate(node=>node.open),false,'Back does not open unrelated actions');await resizeFocused('back',1440,'focused Back returns to the desktop Reader tools');
 await page.locator('#document-menu').focus();await resizeFocused('document-menu',320,'focused document action is exposed in phone disclosure');assert.equal(await page.locator('#archive-compact-navigation').evaluate(node=>node.open),true);await resizeFocused('document-menu',1440,'focused document action returns to desktop');await record('responsive-focused-back-and-action');
}

export async function verifyD7ArchiveBehavior(h,seed,{directory,variant,observations,persist}){
 const page=h.archive,record=async(kind,data={})=>{observations.push({kind,...data});await persist();};
 const sources=seed.sourceBefore.filter(row=>row.chatId==='d7-archive-normal-0').sort((a,b)=>a.sourceSentAt.localeCompare(b.sourceSentAt));assert.deepEqual(sources.map(row=>row.originalText),D7_READER_FIXTURE.bodies);assert.deepEqual(sources.map(row=>row.sourceSentAt),D7_READER_FIXTURE.times);
 const inputs=sources.map(source=>{const matches=seed.workingBefore.filter(row=>row.originalTextReference===source.id);assert.equal(matches.length,1);return {id:matches[0].id,documentId:matches[0].documentId,sourceId:source.id,body:source.originalText,at:source.sourceSentAt};}),documentId=inputs[0].documentId;assert.equal(new Set(inputs.map(row=>row.documentId)).size,1);await d7ReaderReady(page,documentId);
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

 // Directory controls keep their own order; Back belongs only to the Reader.
 assert.equal(await page.locator('#archive-reader-navigator-slot #back').count(),0);
 const group=page.locator('#archive-navigator .archive-navigator-group-toggle').filter({hasText:'河岸散步'}).first(),groupOrder=await page.locator('.archive-navigator-group-toggle').allTextContents();
 await group.click();assert.equal(await group.getAttribute('aria-expanded'),'false');assert.deepEqual(await page.locator('.archive-navigator-group-toggle').allTextContents(),groupOrder,'collapsing the selected project does not move it');await group.click();await eventually(()=>page.locator('.archive-navigator-window[aria-current="page"]').isVisible(),'same project reopens in place');
 await page.setViewportSize({width:1440,height:500});await frame(page);const beforeScroll=await page.evaluate(()=>({back:document.getElementById('back').getBoundingClientRect().top,group:document.querySelector('.archive-navigator-group-toggle').getBoundingClientRect().top}));await page.locator('#archive-navigator').hover();await page.mouse.wheel(0,180);await eventually(()=>page.locator('#archive-navigator').evaluate(node=>node.scrollTop>0),'real wheel scrolls the directory');
 const afterScroll=await page.evaluate(()=>({back:document.getElementById('back').getBoundingClientRect().top,group:document.querySelector('.archive-navigator-group-toggle').getBoundingClientRect().top}));near(afterScroll.back,beforeScroll.back,'Reader Back stays outside the independently scrolling directory');assert.ok(afterScroll.group<beforeScroll.group,'project/window list actually scrolls');await page.setViewportSize({width:1440,height:1000});await frame(page);await record('persistent-directory-order-collapse-and-independent-reader-back',{groupOrder,beforeScroll,afterScroll});
 await page.locator('#input-time-toggle').focus();await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'document-menu');
 await page.evaluate(()=>{globalThis.__d7FindEvents=[];document.addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='f')queueMicrotask(()=>__d7FindEvents.push({key:event.key,ctrl:event.ctrlKey,meta:event.metaKey,prevented:event.defaultPrevented}));});});
 for(const shortcut of ['Control+f','Meta+f']){await page.locator('#back').focus();await page.keyboard.press(shortcut);assert.equal(await page.locator('#reader-scope-search,#reader-scope-search-host').count(),0);assert.equal(await page.locator('#scope-search').isVisible(),false);await page.keyboard.press('Escape');}
 const findEvents=await page.evaluate(()=>__d7FindEvents);assert.deepEqual(findEvents.map(event=>({key:event.key.toLowerCase(),ctrl:event.ctrl,meta:event.meta})),[{key:'f',ctrl:true,meta:false},{key:'f',ctrl:false,meta:true}],'both real Find shortcuts must reach the DOM with their actual modifier owners');assert.ok(findEvents.every(event=>event.prevented===false),'Reader never intercepts browser-owned Find');await record('independent-query-keyboard-owners',{archiveNext:'archive-root-overflow',readerFind:null,browserOwnedFind:true,events:findEvents,readerActions:['input-time-toggle','document-menu']});
 for(const sort of ['asc','desc']){const observed=await d7AnnualTraversal(page,inputs,sort);await record('sort-endpoint',{sort,exactInputs:observed,allFourYearsExplicit:true,twoPageMaximum:2});}await record('sort-both-directions');
 await d7DiscoveryBack(page);await assertBlankArchiveReader(page);await page.locator('#scope-search').focus();await page.keyboard.press('Tab');assert.equal(await page.locator('#archive-root-overflow > summary').evaluate(node=>document.activeElement===node),true,'visible Archive discovery search leads to its persistent directory menu');
 await d7DiscoveryResult(page,inputs[2],'短暂的新鲜感',{directoryProof:'Archive discovery target'});assert.equal(await page.locator('.library-prose[data-edit-id="'+inputs[2].id+'"]').textContent(),inputs[2].body);await d7DiscoveryBack(page);assert.equal(await page.locator('#scope-search').inputValue(),'短暂的新鲜感','Back restores the actual discovery query');await page.locator('#scope-search').fill('');await eventually(async()=>await page.locator('#document-list .search-input').count()===0&&await page.locator('#archive-navigator').isVisible(),'clearing discovery restores its real directory');await assertBlankArchiveReader(page);await record('archive-discovery-search-clear',{exactInputId:inputs[2].id});
 await d7DiscoveryResult(page,inputs[0],'我可能更适合');

 await inspectSource(h,documentId,D7_READER_FIXTURE.bodies);const beforeEdit=await h.state();assert.deepEqual(beforeEdit.records,seed.sourceBefore,'all Sources unchanged before the edit');assert.deepEqual(beforeEdit.library.blocks,seed.workingBefore,'visual changes, search and sort preserve every existing Working Input');await record('source-and-working-before-edit');
 const id=inputs[0].id,field=page.locator('.library-prose[data-edit-id="'+id+'"]'),literal=D7_READER_FIXTURE.bodies[0]+'\n\n  D7 保存核验：空格与换行不变。\n\t<literal>& **原样**  ';
 await field.fill(literal);await page.locator('#document-title').focus();await eventually(async()=>(await rpc(page,'GET_INPUT',{id})).libraryText===literal,'basic edit durably stores exact literal text');
 await eventually(()=>page.locator('#save-status').textContent().then(text=>/已保存|Saved/.test(text)),'durable edit acknowledges its real saved status');await frame(page);const savedLayout=await measure(page,'A02');assert.ok(savedLayout.status.visible&&savedLayout.status.y>=savedLayout.readerTools.bottom,'actual saved receipt stays below the current compact Reader tools');assert.ok(savedLayout.caption.y>=savedLayout.status.bottom,'saved receipt does not overlap the first Input caption');await page.screenshot({path:`${directory}/${variant}-saved-status.png`,animations:'disabled',fullPage:false});await record('saved-status-clear-of-reader-tools',{readerToolsBottom:savedLayout.readerTools.bottom,statusTop:savedLayout.status.y,statusBottom:savedLayout.status.bottom,captionTop:savedLayout.caption.y});
 await page.reload();await eventually(async()=>await page.locator(`.library-prose[data-edit-id="${id}"]`).count()===1,'normal Reader route reloads after durable save');await d7ReaderReady(page,documentId,{...inputs[0],body:literal});assert.equal(await page.locator(`.library-prose[data-edit-id="${id}"]`).textContent(),literal);assert.equal((await rpc(page,'GET_INPUT',{id})).libraryText,literal);
 await inspectSource(h,documentId,D7_READER_FIXTURE.bodies);const afterEdit=await h.state();assert.deepEqual(afterEdit.records,seed.sourceBefore,'all immutable Source fields survive capture, visual changes, edit and reload');assert.deepEqual(afterEdit.library.blocks.filter(block=>block.id!==id),seed.workingBefore.filter(block=>block.id!==id),'a basic edit changes no other Working Input');
 await record('durable-edit-reload-and-immutable-source',{inputId:id,sha256:digest(literal),literalLength:literal.length});
 // The retained native query Undo belongs to actual Archive discovery;
 // it must never undo the durably saved Working Input or write immutable Source.
 await page.setViewportSize({width:320,height:1000});await frame(page);await d7DiscoveryBack(page);assert.equal(await page.locator('#reader-scope-search').count(),0);await page.locator('#scope-search').fill('');await page.locator('#scope-search').focus();await page.keyboard.type('D7 保存核验');assert.equal(await page.locator('#scope-search').inputValue(),'D7 保存核验');
 await page.keyboard.press('ControlOrMeta+z');await eventually(async()=>await page.locator('#scope-search').inputValue()!=='D7 保存核验','native discovery query Undo changes only its query buffer');assert.equal((await rpc(page,'GET_INPUT',{id})).libraryText,literal,'query Undo cannot undo the durably saved Working Input');assert.deepEqual((await h.state()).records,seed.sourceBefore,'query Undo cannot write Source');await record('compact-search-native-undo-isolation',{inputId:id,queryAfterUndo:await page.locator('#scope-search').inputValue(),savedWorkingSha256:digest(literal)});
 await d7DiscoveryResult(page,{...inputs[0],body:literal},'D7 保存核验');assert.equal(await page.locator('.library-prose[data-edit-id="'+id+'"]').textContent(),literal);await page.setViewportSize({width:1440,height:1000});await settleD7Presentation(page,{screen:'A02',width:1440});
 await page.locator('#document-menu').click();await page.getByRole('menuitem',{name:'查看修改历史',exact:true}).click();await page.locator('#revision-dialog').waitFor({state:'visible'});await page.getByLabel('修改历史的 Input',{exact:true}).selectOption(id);await eventually(()=>page.locator('#revision-list .revision-row').count().then(count=>count>0),'the edited Input has durable real history');await page.locator('#revision-list .revision-row').first().getByRole('button',{name:'恢复此版本',exact:true}).click();await page.locator('.working-history-compare').waitFor({state:'visible'});assert.match(await page.locator('.working-history-compare section').first().textContent(),/D7 保存核验/);await page.locator('.working-history-confirm').getByRole('button',{name:'取消',exact:true}).click();assert.equal((await rpc(page,'GET_INPUT',{id})).libraryText,literal,'history comparison Cancel does not restore');await page.locator('#close-revisions').click();await record('existing-history-open-compare-cancel-close');
 const readerOrigin=await page.evaluate(()=>({documentId:history.state?.paiaReader?.documentId,returnTo:history.state?.paiaReader?.returnTo}));assert.equal(readerOrigin.returnTo,'library');
 await page.locator('.sidebar-bottom > [data-view="settings"]').click();await page.locator('[data-settings-group="reading"]').click();
 for(const [fontSize,readingWidth,px,cap]of [['large','wide',19,720],['standard','standard',17,680]]){
  await page.locator('#ux-font-size').selectOption(fontSize);await eventually(async()=>(await rpc(page,'GET_PAGE',{page:{view:'settings'}})).preferences.fontSize===fontSize,'font preference saved');
  await page.locator('#ux-reading-width').selectOption(readingWidth);await eventually(async()=>(await rpc(page,'GET_PAGE',{page:{view:'settings'}})).preferences.readingWidth===readingWidth,'width preference saved');
  await page.evaluate(()=>globalThis.__d7SettingsBack=document.getElementById('ux-settings-back'));await page.locator('#ux-settings-back').focus();await page.locator('#ux-settings-back').press('Enter');await eventually(async()=>await page.locator('#document-panel').isVisible()&&await page.locator('#input-time-toggle').isEnabled()&&await page.locator('#document-page').evaluate(node=>!node.inert)&&await page.evaluate(origin=>history.state?.paiaReader?.documentId===origin.documentId&&history.state?.paiaReader?.returnTo===origin.returnTo,readerOrigin),'keyboard Settings Back restores the settled Reader route');await d7ReaderReady(page,documentId,{...inputs[0],body:literal});
  assert.equal(await page.evaluate(()=>__d7SettingsBack===document.getElementById('ux-settings-back')),true,'Settings retains the same Back control');assert.deepEqual(await page.evaluate(()=>({documentId:history.state?.paiaReader?.documentId,returnTo:history.state?.paiaReader?.returnTo})),readerOrigin);
  const current=await measure(page,'A02');near(current.body.width,cap,'saved reading width mapping');assert.equal(parseFloat(current.prose.fontSize),px);assert.equal(await page.locator(`.library-prose[data-edit-id="${id}"]`).textContent(),literal);
  await page.reload();await eventually(async()=>await page.locator('#document-panel').isVisible()&&await page.locator('#input-time-toggle').isEnabled()&&await page.locator('#document-page').evaluate(node=>!node.inert)&&await page.evaluate(origin=>history.state?.paiaReader?.documentId===origin.documentId&&history.state?.paiaReader?.returnTo===origin.returnTo,readerOrigin),'saved preference Reader reload retains its settled original route');await d7ReaderReady(page,documentId,{...inputs[0],body:literal});const restored=await measure(page,'A02');near(restored.body.width,cap,'saved width survives reload');assert.equal(parseFloat(restored.prose.fontSize),px);await record('saved-reading-preference',{fontSize,readingWidth,pixels:px,width:cap,reload:true});
  if(fontSize==='large'){await page.locator('.sidebar-bottom > [data-view="settings"]').click();await page.locator('[data-settings-group="reading"]').click();}
 }
 // The bounded route repair retains the original Reader parent across both
 // Settings returns and reloads; the real Back must now reach Archive root.
 assert.deepEqual(await page.evaluate(()=>({documentId:history.state?.paiaReader?.documentId,returnTo:history.state?.paiaReader?.returnTo})),readerOrigin);
 await page.evaluate(()=>history.back());await eventually(async()=>await page.locator('#settings-panel').isVisible()&&await page.locator('#ux-settings-back').isVisible(),'browser Back settles on the intermediate Settings entry');
 await page.evaluate(()=>history.forward());await eventually(async()=>await page.locator('#document-panel').isVisible()&&await page.locator('#input-time-toggle').isEnabled()&&await page.locator('#document-page').evaluate(node=>!node.inert),'browser Forward restores the settled Reader');await d7ReaderReady(page,documentId,{...inputs[0],body:literal});assert.deepEqual(await page.evaluate(()=>({documentId:history.state?.paiaReader?.documentId,returnTo:history.state?.paiaReader?.returnTo})),readerOrigin);assert.equal(await page.locator(`.library-prose[data-edit-id="${id}"]`).textContent(),literal);
 await page.locator('#back').click();
 try{await eventually(async()=>await page.locator('#collection-panel').isVisible()&&await page.locator('#scope-search').isEnabled()&&await page.evaluate(()=>history.state?.paiaReader?.view==='library'&&history.state.paiaReader.documentId===null),'post-Settings Reader Back returns to the originating Archive');await assertBlankArchiveReader(page);}
 finally{await record('post-settings-reader-back-route',await page.evaluate(()=>({route:history.state?.paiaReader,collectionVisible:!!document.getElementById('collection-panel').getClientRects().length,readerVisible:!!document.getElementById('document-panel').getClientRects().length,rootInnerHeight:document.getElementById('archive-root-main').getBoundingClientRect().height})));}
 await record('preserved-settings-reader-return-target',{destination:'library',settingsRoundTrips:2,readerReloads:2,browserBackForward:true});
 await selectArchive(page);await page.locator('#archive-root-overflow > summary').focus();await page.keyboard.press('ArrowDown');assert.equal(await page.evaluate(()=>document.activeElement.id),'filter-recent-open','the original filter review is the first actual More action');await page.keyboard.press('ArrowDown');assert.equal(await page.evaluate(()=>document.activeElement.dataset.view),'revisit','the existing Revisit action retains its keyboard position');await page.keyboard.press('ArrowDown');assert.equal(await page.evaluate(()=>document.activeElement.id),'archive-root-history','existing history completion remains keyboard reachable after both preceding real actions');assert.equal(await page.locator('#archive-source-scope').isVisible(),true);await page.locator('#archive-source-scope').focus();await page.keyboard.press('ArrowDown');assert.equal(await page.evaluate(()=>document.activeElement.id),'archive-source-scope','native source choice keeps its own arrow keys');await nativeReachability(page,['#filter-recent-open','#archive-root-overflow [data-view="revisit"]','#archive-root-history']);await page.screenshot({path:`${directory}/${variant}-directory-overflow-open.png`,animations:'disabled',fullPage:false});await page.locator('#archive-root-overflow > summary').click();assert.equal(await page.locator('#archive-root-overflow').evaluate(node=>node.open),false,'close the real More popover before reaching the Source chooser beneath it');await nativeReachability(page,['#archive-source-scope'],{floor:44});await page.locator('#archive-source-scope').selectOption('chatgpt');assert.equal(await page.locator('#archive-source-scope').inputValue(),'chatgpt');await page.locator('#archive-source-scope').selectOption('');await page.locator('#archive-root-overflow > summary').click();assert.equal(await page.locator('#archive-root-overflow').evaluate(node=>node.open),true);await page.locator('#archive-root-history').click();await page.locator('#history-dialog').waitFor({state:'visible'});assert.equal(await page.locator('#history-file-consent').isChecked(),false,'history import keeps its existing per-file consent');assert.equal(await page.locator('#history-choose').isDisabled(),true);await page.locator('#history-close').click();await eventually(async()=>!await page.locator('#history-dialog').isVisible(),'history import closes without reading a file');await record('primary-root-source-chooser-and-history-import-after-settings');
 await page.evaluate(()=>{globalThis.__d7PrimaryNodes=[...document.querySelectorAll('.sidebar [data-view]')];});await page.setViewportSize({width:320,height:1000});await page.locator('#archive-compact-navigation > summary').click();assert.deepEqual(await page.locator('#archive-compact-nav-items > [data-view]').evaluateAll(nodes=>nodes.map(node=>node.dataset.view)),['library','thoughts','memory','settings'],'all four existing primary destinations retain their exact order');assert.equal(await page.evaluate(()=>{const nodes=[...document.querySelectorAll('#archive-compact-nav-items > [data-view]')];return nodes.length===__d7PrimaryNodes.length&&nodes.every((node,index)=>node===__d7PrimaryNodes[index]);}),true,'compact navigation moves the exact existing controls, including Settings');assert.equal(await page.locator('#primary-nav > button').count(),0);assert.equal(await page.locator('#archive-compact-navigation').evaluate(node=>node.open),true,'primary navigation is disclosed before reachability');await nativeReachability(page,['library','thoughts','memory','settings'].map(view=>'#archive-compact-nav-items [data-view="'+view+'"]'),{floor:44});assert.equal(await page.locator('#archive-compact-navigation').evaluate(node=>node.open),true,'reachability keeps the real primary navigation disclosed');await page.locator('#archive-compact-nav-items [data-view="library"]').click();await record('same-compact-primary-buttons');
 assert.deepEqual((await h.state()).records,seed.sourceBefore);await page.screenshot({path:`${directory}/${variant}-post-behavior-root.png`,animations:'disabled'});
}

export async function compareD7Archive(h,variant,{matrix='full',directory='work/d7-archive-reader',head=process.env.PAIA_TESTED_HEAD||execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),seed=null}={}){
 assert.ok(['archive','reader-compat','full'].includes(matrix));const page=h.archive,declared=matrix==='archive'?D7_ARCHIVE_MATRIX:matrix==='reader-compat'?D7_FULL_MATRIX.filter(row=>row.screen==='A02'&&!row.stress):D7_FULL_MATRIX,rows=declared.map(row=>({...row,status:'PENDING'})),errors=[],observations=[],references=new Map(),started=Date.now();
 await mkdir(directory,{recursive:true});
 const receipt={head,variant,matrix,paletteAuthority:archiveWhiteReference,expectedRows:declared.length,rows,errors,observations,qualifications,fixture:matrix==='full'?{kind:'D6.2 normal synthetic text through real capture',conversations:9,sources:12,readerTitle:D7_READER_FIXTURE.title,readerTimes:D7_READER_FIXTURE.times,readerBodySha256:D7_READER_FIXTURE.bodies.map(digest)}:{kind:'Existing caller synthetic Archive fixture retained unchanged',comparisonScope:'Root shell and responsive rules; canonical root project content is not claimed equal in this compatibility subset'},result:'PENDING',visualAcceptance:'PENDING_INDEPENDENT_FULL_WINDOW_REVIEW',scope:'Actual normal extension routes, exact literal Source/Working content, original immutable D6.2 historical frames, current owner-approved fixed geometry <=2px. No screenshot-only or pixel-threshold PASS.'};
 const persist=()=>writeFile(`${directory}/${variant}-${matrix}.json`,JSON.stringify({...receipt,elapsedMs:Date.now()-started},null,2));
 try{
  await persist();await page.setViewportSize({width:1440,height:1000});await selectArchive(page);await page.locator('#scope-search').fill('');
  // This historical comparison explicitly exercises all-source search.
  await page.locator('#archive-source-scope').selectOption('');
  await eventually(()=>page.locator('#scope-search').getAttribute('placeholder').then(value=>value==='搜索全部档案'),'explicit all-source scenario is ready');
  if(matrix==='full'){
   await waitArchiveWindow(page,{text:D7_READER_FIXTURE.title});
   // Discovery can finish while another expanded scope is still repainting.
   // Establish the real completed projection before starting the identity proof.
   await eventually(()=>page.evaluate(async title=>{
    const status=await chrome.runtime.sendMessage({type:'PAIA_ARCHIVE_NAV_STATUS',page:{groupKind:'providers'}});if(!status.ok)throw Error('Archive readiness status failed: '+JSON.stringify(status));if(status.data.coverage.state!=='complete'||!status.data.coverage.archiveComplete)return false;
    const host=document.getElementById('archive-navigator'),tree=host.querySelector('.archive-navigator-tree'),ready=()=>!host.hidden&&!host.querySelector('.archive-navigator-loading,.archive-navigator-error,.archive-navigator-more:disabled')&&host.getAttribute('aria-busy')!=='true'&&!document.getElementById('scope-search').disabled;
    if(!ready())return false;const target=[...host.querySelectorAll('.archive-navigator-window')].find(node=>node.querySelector('.archive-navigator-window-title')?.textContent===title);if(!target)return false;
    const rows=[...tree.children];target.scrollIntoView({block:'nearest'});await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    return ready()&&target.isConnected&&rows.length===tree.children.length&&rows.every((node,index)=>node===tree.children[index]);
   },D7_READER_FIXTURE.title),'complete Archive projection and current row settle before the directory snapshot');
   await rememberArchiveDirectory(page,'normal root to Reader');await assertBlankArchiveReader(page);
   await page.screenshot({path:`${directory}/${variant}-persistent-directory-before.png`,animations:'disabled',fullPage:false});await openNormalReader(page);await assertArchiveDirectoryUnchanged(page,'normal root to Reader');
   await page.screenshot({path:`${directory}/${variant}-persistent-directory-after.png`,animations:'disabled',fullPage:false});observations.push({kind:'persistent-directory-before-after',before:`${variant}-persistent-directory-before.png`,after:`${variant}-persistent-directory-after.png`,sameNodesOrderExpansionScroll:true});await persist();
   await verifyD7ResponsiveFocus(page,async(kind,data)=>{observations.push({kind,...data});await persist();});await rememberArchiveDirectory(page,'Reader closes');await page.locator('#back').click();await eventually(()=>page.locator('#collection-panel').isVisible(),'Reader Back returns to the same Archive directory');await assertArchiveDirectoryUnchanged(page,'Reader closes');await assertBlankArchiveReader(page);
  }
  await eventually(()=>page.locator('#archive-navigator').isVisible(),'root navigator ready');
  // Keep root projects closed using their ordinary disclosure controls.
  for(const label of ['河岸散步','职业方向','学习与写作','日常想法']){const group=page.locator('.archive-navigator-group-toggle').filter({hasText:label}).first();if(await group.count()&&await group.getAttribute('aria-expanded')==='true')await group.click();}
  await page.evaluate(()=>{globalThis.__d7Search=document.getElementById('scope-search');globalThis.__d7PrimaryNodes=[...document.querySelectorAll('.sidebar [data-view]')];});
  let readerOpened=false;
  for(const row of rows){let cdp=null;
   if(Date.now()-started>230000)throw Error('D7 matrix exhausted its bounded execution budget; remaining declared rows stay PENDING, never PASS');
   try{
    if(row.screen==='A02'&&!readerOpened){await page.setViewportSize({width:1440,height:1000});if(matrix==='full')observations.push(await openNormalReaderWithHeldRestoration(page));else await openNormalReader(page);readerOpened=true;}
    await page.evaluate(()=>document.activeElement?.blur());await page.setViewportSize({width:row.width,height:row.height});await rpc(page,'UPDATE_PREFERENCES',{changes:{appearance:row.theme,language:'zh-CN'}});await eventually(()=>page.evaluate(theme=>document.documentElement.dataset.paiaTheme===theme,row.theme),'D7 theme settled');await page.emulateMedia({reducedMotion:'reduce'});await settleD7Presentation(page,row);
    const defaultMenu=page.locator('#archive-compact-navigation');if(await visible(defaultMenu)&&await defaultMenu.evaluate(node=>node.open))await defaultMenu.locator('summary').click();assert.equal(await defaultMenu.evaluate(node=>node.open),false,'default comparison starts with the existing disclosure closed');await page.mouse.move(0,0);
    if(row.stress==='text200')await page.evaluate(()=>{globalThis.__d7TextZoom=[...document.querySelectorAll('#document-title,#document-subtitle,#document-body .library-prose,#document-body .block-time,#reader-scope-search,#input-time-toggle,#document-menu,#archive-navigator-toggle')].map(node=>({node,properties:['font-size','line-height'].map(name=>({name,prior:node.style.getPropertyValue(name),priority:node.style.getPropertyPriority(name),value:parseFloat(getComputedStyle(node).getPropertyValue(name))}))}));for(const {node,properties}of __d7TextZoom)for(const {name,value}of properties)node.style.setProperty(name,`${value*2}px`,'important');});
    if(row.stress==='coarse'){cdp=await h.context.newCDPSession(page);await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});}
    await page.evaluate(()=>{document.activeElement?.blur();getSelection()?.removeAllRanges();scrollTo(0,0);});await frame(page);await eventually(async()=>{row.actual=await measure(page,row.screen);return row.screen!=='A02'||!!row.actual.selectedWindow;},'complete selected-window snapshot after asynchronous refresh');
    const stem=`${directory}/${variant}-${row.id}`,actualBuffer=await page.screenshot({path:stem+'-actual.png',animations:'disabled',fullPage:false});row.actualFile=stem.split('/').at(-1)+'-actual.png';
    const refKey=`${row.screen}-${row.screen==='A01'?1440:row.width}-${row.theme}`;
    if(!references.has(refKey)){
     const ref=await openD7Reference(h,row);references.set(refKey,ref);const file=`${directory}/${variant}-${refKey}-${ref.paletteDerived?'palette-derived':'canonical-original'}.png`;ref.buffer=await ref.page.screenshot({path:file,animations:'disabled',fullPage:false});ref.file=file.split('/').at(-1);
     // A derived dark frame never replaces its immutable light source artifact.
     if(ref.paletteDerived){const original=await openD7Reference(h,{...row,theme:'light'});try{await original.page.screenshot({path:`${directory}/${variant}-${refKey}-source-canonical-original.png`,animations:'disabled',fullPage:false});}finally{await original.page.close();}}
    }
    const ref=references.get(refKey);row.reference={file:ref.file,source:ref.name,sha256:ref.sha256,comparison:row.screen==='A01'||row.width===1440?'HISTORICAL_REFERENCE_OWNER_GEOMETRY_SUPERSEDED':row.stress?'REACHABILITY_STRESS':ref.referenceWidth!==row.width?'RESPONSIVE_RULE_DERIVATIVE':ref.paletteDerived?'APPROVED_PALETTE_DERIVATIVE':'CANONICAL_ORIGINAL',originalUnchanged:true};
    if(row.width===1440&&row.theme==='light'&&!row.stress){
     row.actualTypography=await renderedTypography(page,row.screen==='A01'?['.archive-navigator-provider-title','.archive-navigator-group-toggle']:['#document-title','.archive-navigator-window[aria-current="page"] .archive-navigator-window-title','.library-prose','.block-time']);
     row.referenceTypography=await renderedTypography(ref.page,row.screen==='A01'?['svg text[font-size="28"]','svg text[font-size="21"]']:['svg text[font-size="28"]','svg text[font-size="16"]']);
     row.density=await page.locator(row.screen==='A01'?'.archive-navigator-group-toggle':'.archive-navigator-window').evaluateAll(nodes=>nodes.map(node=>({text:node.textContent,height:node.getBoundingClientRect().height,minHeight:getComputedStyle(node).minHeight,padding:getComputedStyle(node).padding})));
     for(const item of row.density)assert.equal(item.minHeight,'44px','title-only navigation does not reserve absent description/date space');
     for(const item of [...row.actualTypography,...row.referenceTypography])assert.ok(item.fonts.some(font=>font.glyphCount>0),'actual glyph-font evidence: '+item.selector);
    }
    if(!row.stress&&ref.referenceWidth===row.width)row.pixelDifference=await pixelDifference(ref.page,actualBuffer,ref.buffer,stem+'-difference.png');
    await persist();assertLayout(row.actual,row);if(row.screen==='A01')await assertBlankArchiveReader(page);
    assert.equal(await page.evaluate(()=>document.getElementById('scope-search')===__d7Search&&__d7PrimaryNodes.every(node=>node.isConnected)),true,'same search and primary nodes survive every responsive/theme projection');
    if(row.screen==='A02'){
     assert.equal(await page.evaluate(()=>__d7ReaderNode.isConnected&&__d7ControlNodes.every(([id,node])=>node===document.getElementById(id)&&node.isConnected)),true,'real editor and existing control nodes remain connected');
     assert.deepEqual(await page.locator('.library-prose').allTextContents(),await page.evaluate(()=>__d7ExpectedBodies));
     row.compactInputActions=await verifyCompactInputActions(page,row);
     if(row.width<768){
      assert.equal(await page.locator('#archive-compact-reader-actions #archive-navigator-toggle').count(),1);assert.equal(await page.locator('#archive-compact-reader-actions #input-time-toggle').count(),1);assert.equal(await page.locator('#archive-compact-reader-actions #document-menu').count(),1);assert.equal(await page.locator('#reader-heading-actions').isVisible(),false,'phone has no empty action row');
      await page.locator('#back').focus();await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'document-title','phone Back leads directly into the reading title');
      await exposeReaderControl(page,'#archive-navigator-toggle');await page.locator('#archive-navigator-toggle').focus();await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'input-time-toggle');await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'document-menu');if(row.theme==='light'&&!row.stress)await page.screenshot({path:`${directory}/${variant}-A02-320-actions-open.png`,animations:'disabled'});await page.keyboard.press('Escape');assert.equal(await page.locator('#archive-compact-nav-label').evaluate(node=>document.activeElement===node),true,'disclosed actions return focus to the existing compact navigation');
     }else if(row.width<1024){await page.locator('#back').focus();await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'archive-navigator-toggle','tablet Back precedes the visible navigator toggle');}
    }
    if(row.stress){
     row.reachability=await nativeReachability(page,['#back','#archive-navigator-toggle','#input-time-toggle','#document-menu'],{floor:44});
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

import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,rmSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {FakeChatGPT,eventually} from './harness/fake-chatgpt.mjs';

const release=mkdtempSync(join(tmpdir(),'paia-d2-years-'));
test.after(()=>rmSync(release,{recursive:true,force:true}));
console.log(execFileSync('python3',['scripts/build_current_release.py',release],{encoding:'utf8'}));
const rpc=async(p,type,fields={})=>{const r=await p.evaluate(x=>chrome.runtime.sendMessage(x),{type,...fields});assert.equal(r?.ok,true,JSON.stringify(r));return r.data;};
for(const variant of ['source','release'])test(`D2 retired Years successor: Section time facts, full search, return and mutation fences (${variant})`,{timeout:180000},async()=>{
 const h=await FakeChatGPT.start(variant==='release'?{extensionPath:release}:{}),p=h.archive;let d5;
 try{
  await p.locator('#enable-consent').click();if(await p.locator('#onboarding-skip').isVisible())await p.locator('#onboarding-skip').click();
  const seed=await p.evaluate(async()=>{
   const {OrganizerStore}=await import('../core/organizer/store.js'),s=new OrganizerStore(chrome.storage.local),op=()=>crypto.randomUUID(),topic=await s.createTopic({name:'SYNTHETIC 多年的表达与不确定性',operationId:op()}),ids=[],chapter=await s.createSection({topicId:topic.id,title:'SYNTHETIC durable chapter',expectedTopicRevision:(await s.topic(topic.id)).organizationRevision,operationId:op()}),empty=await s.createSection({topicId:topic.id,title:'SYNTHETIC empty chapter',expectedTopicRevision:(await s.topic(topic.id)).organizationRevision,operationId:op()});
   for(let i=0;i<160;i++){s.clock=()=>new Date(Date.UTC(i<100?2021:2023,0,1)+i*1000).toISOString();ids.push((await s.continueThinking({operationId:op(),body:(i===155?'SYNTHETIC_LATE_MATCH ':'SYNTHETIC 表达 '+i+' ')+(i%2?'访谈者说“我不愿意”，我还没做判断。':'我可能更适合消费产品，但现在样本还太少。')+' 👩‍💻 é',topicId:topic.id})).id);const entry=await s.entry(ids.at(-1));await s.placeEntry({entryId:entry.id,topicId:topic.id,sectionId:chapter.sectionId,expectedEntryRevision:entry.revision,expectedPlacementRevision:(await s.libraryPlacement(topic.id,entry.id)).revision,expectedTopicRevision:(await s.topic(topic.id)).organizationRevision,operationId:op()});}
   await s.foundationWrite(async t=>{for(const receipt of await t.all('operationReceipts'))if(receipt.ownerId===ids[159]){delete receipt.result.independentExpression;await t.put('operationReceipts',receipt);}});
   await s.repository.close();const {ThoughtWorkspace}=await import('../ui/thoughts.js'),create=ThoughtWorkspace.prototype.createTopicReader;ThoughtWorkspace.prototype.createTopicReader=function(...args){globalThis.__d2Content=this;return create.apply(this,args);};return {topicId:topic.id,ids,chapter:chapter.sectionId,empty:empty.sectionId};
  });
  await p.locator('[data-view="thoughts"]').click();await eventually(()=>p.locator(`.personal-topic-link[data-topic-id="${seed.topicId}"]`).count().then(n=>n===1));await p.locator(`.personal-topic-link[data-topic-id="${seed.topicId}"]`).click();
  await eventually(()=>p.locator('#original-reading-body [data-entry-id]').count().then(n=>n>0));
  // Retired Years must not acquire the actual reader, including during IME.
  const original=p.locator('#original-reading-body [data-entry-field="body"]').first();await original.focus();await original.evaluate(el=>{globalThis.__retiredYearsNode=el;el.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true,data:'中'}));});
  await p.evaluate(()=>__d2Content.switchOriginalMode('years'));assert.equal(await p.evaluate(()=>__d2Content.originalMode),'content');assert.equal(await original.evaluate(el=>el===__retiredYearsNode&&el.isConnected),true);assert.equal(await p.locator('[data-topic-view="years"]').count(),0);
  await original.evaluate(el=>el.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:''})));await p.locator('#topic-heading h1').click();
  for(let i=0;i<6;i++){if(await p.evaluate(()=>__d2Content.topicReader?.terminalNext))break;const count=await p.evaluate(()=>__d2Content.topicReader.items.length);await p.locator('#topic-continuous-after').evaluate(el=>el.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})));await eventually(()=>p.evaluate(n=>__d2Content.topicReader.items.length>n||__d2Content.topicReader?.terminalNext,count));}
  const facts=await p.evaluate(async topicId=>{const rows=[];let cursor=null;do{const result=await chrome.runtime.sendMessage({type:'GET_LIBRARY_SECTION_READING',options:{topicId,cursor,limit:40}});if(!result.ok||result.data.cursorInvalid)throw Error('TIME_PROOF_READ_FAILED');rows.push(...result.data.items.map(row=>({id:row.entry.id,time:row.entry.expressionTime})));cursor=result.data.nextCursor;}while(cursor);return rows;},seed.topicId);assert.deepEqual(facts.map(row=>row.id),seed.ids);assert.equal(facts.filter(row=>row.time.year===2021).length,100);assert.equal(facts.filter(row=>row.time.year===2023).length,59);assert.equal(facts.filter(row=>row.time.basis==='unknown').length,1);assert.equal(facts.filter(row=>row.time.year===2022).length,0);
  for(const row of facts){const i=seed.ids.indexOf(row.id);if(i<159)assert.equal(row.time.at,new Date(Date.UTC(i<100?2021:2023,0,1)+i*1000).toISOString());}
  assert.ok(await p.locator('#original-reading-body [data-entry-id]').count()<=120);assert.equal(await p.locator(`.topic-section[data-section-id="${seed.empty}"] [data-entry-id]`).count(),0);assert.equal(await p.locator(`.topic-section[data-section-id="${seed.empty}"] h2`).textContent(),'SYNTHETIC empty chapter');
  await p.locator(`[data-entry-id="${seed.ids[159]}"]`).scrollIntoViewIfNeeded();await p.mouse.wheel(0,-1000000);await eventually(()=>p.locator(`[data-entry-id="${seed.ids[0]}"]`).count().then(n=>n===1),'backward reading restores the unloaded first Section body');
  mkdirSync('work/qa-dvn-topic-years',{recursive:true});const matrix=[];d5=await openSectionReading(h,variant,'content',seed.ids[0]);
  for(const appearance of ['light','dark']){await rpc(p,'UPDATE_PREFERENCES',{changes:{appearance}});for(const width of [1440,1280,1024,768,390,320]){await p.setViewportSize({width,height:900});await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)));const overflow=await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth);assert.ok(overflow<=2,`${appearance}/${width}: ${overflow}`);await p.screenshot({path:`work/qa-dvn-topic-years/${variant}-${appearance}-${width}.png`});matrix.push({appearance,width,overflow});await d5.capture(width,appearance);}}
  await d5.verifyPreferences();await d5.verifyTextZoom();assert.equal(await p.locator('.topic-year-section,.topic-expression-year').count(),0,'no manufactured year groups');
  await p.setViewportSize({width:1280,height:900});await p.locator('#topic-heading h1').click();
  for(let i=0;i<6;i++){if(await p.locator(`[data-entry-id="${seed.ids[99]}"]`).count())break;const count=await p.evaluate(()=>__d2Content.topicReader.items.length);await p.locator('#topic-continuous-after').evaluate(el=>el.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})));await eventually(()=>p.evaluate(n=>__d2Content.topicReader.items.length>n||__d2Content.topicReader?.terminalNext,count));}
  const ids=await p.evaluate(()=>__d2Content.topicReader.items.slice(0,100).map(row=>row.entry.id));assert.deepEqual(ids,seed.ids.slice(0,100));await d5.state('full-section','#original-reading-body [data-entry-id]');
  const selected=seed.ids[80];await p.locator(`[data-entry-id="${selected}"]`).scrollIntoViewIfNeeded();
  await p.locator('#topic-search').fill('SYNTHETIC_LATE_MATCH');
  await eventually(()=>p.locator(`[data-entry-id="${seed.ids[155]}"]`).count().then(n=>n===1),'full-topic search reaches unmounted later year',30000);
  assert.match(await p.locator('#original-reading-body').innerText(),/SYNTHETIC_LATE_MATCH/);
  await p.locator('#back').click();await eventually(()=>p.locator(`.personal-topic-link[data-topic-id="${seed.topicId}"]`).count().then(n=>n===1));await p.locator(`.personal-topic-link[data-topic-id="${seed.topicId}"]`).click();
  await eventually(async()=>await p.evaluate(()=>__d2Content.topicReader?.query)==='SYNTHETIC_LATE_MATCH'&&await p.locator(`[data-entry-id="${seed.ids[155]}"]`).count()===1,'root return preserves active search',30000);
  await p.locator('#topic-search').fill('');await eventually(()=>p.locator(`[data-entry-id="${selected}"]`).count().then(n=>n===1),'closing search after root return restores prior full-year extent',30000);
  await p.evaluate(()=>__d2Content.switchView('ai'));await eventually(()=>p.locator('#original-reading-body [data-entry-id]').count().then(n=>n>0));
  await p.evaluate(()=>__d2Content.switchView('original'));await eventually(()=>p.locator(`[data-entry-id="${selected}"]`).count().then(n=>n===1),'tab return retains year extent',30000);
  await p.locator('#back').click();await eventually(()=>p.locator(`.personal-topic-link[data-topic-id="${seed.topicId}"]`).count().then(n=>n===1));
  assert.equal(await p.locator('#topic-timeline [data-expression-id]').count(),0,'retired hidden timeline canonical DTO DOM remains absent');
  await p.locator(`.personal-topic-link[data-topic-id="${seed.topicId}"]`).click();await eventually(()=>p.locator(`[data-entry-id="${selected}"]`).count().then(n=>n===1),'root return retains year window',30000);
  // A held old read must be cleared on mutation before it can render again.
  await p.evaluate(id=>{const send=chrome.runtime.sendMessage.bind(chrome.runtime);globalThis.__d2Restore=()=>chrome.runtime.sendMessage=send;globalThis.__d2Held=[];globalThis.__d2HoldClaimed=false;chrome.runtime.sendMessage=(message,...args)=>Promise.resolve(send(message,...args)).then(value=>{if(message.type==='GET_LIBRARY_SECTION_READING'&&message.options?.query==='SYNTHETIC_LATE_MATCH'&&!__d2HoldClaimed&&value?.data?.items?.some(row=>row.entry.id===id)){__d2HoldClaimed=true;globalThis.__d2HeldResult=value;return new Promise(resolve=>__d2Held.push(()=>resolve(value)));}return value;});},seed.ids[155]);
  await p.locator('#topic-search').fill('SYNTHETIC_LATE_MATCH');await eventually(()=>p.evaluate(()=>__d2Held.length===1));assert.equal(await p.evaluate(id=>__d2HeldResult.data.items.some(row=>row.entry.id===id&&row.entry.body.includes('SYNTHETIC_LATE_MATCH')),seed.ids[155]),true,'the held real response contains the soon-edited old match');
  const pendingQuery=await p.evaluate(()=>({query:document.getElementById('topic-search').value,documentState:document.getElementById('thought-document').dataset.state,inert:document.getElementById('topic-body').inert,count:{text:document.getElementById('topic-search-count').textContent,hidden:document.getElementById('topic-search-count').hidden},before:document.getElementById('topic-continuous-before-status').textContent,after:document.getElementById('topic-continuous-after-status').textContent,reader:{loading:__d2Content.topicReader.loadingNext,query:__d2Content.topicReader.query,terminal:__d2Content.topicReader.terminalNext},mountedIds:[...document.querySelectorAll('#original-reading-body [data-entry-id]')].map(n=>n.dataset.entryId)}));writeFileSync(`work/qa-dvn-topic-years/${variant}-pending-query.json`,JSON.stringify(pendingQuery,null,2));await p.screenshot({path:`work/qa-dvn-topic-years/${variant}-pending-query.png`});
  const entry=await rpc(p,'GET_LIBRARY_ENTRY',{id:seed.ids[155]});await rpc(p,'EDIT_LIBRARY_FIELDS',{edit:{operationId:crypto.randomUUID(),id:entry.id,expectedRevision:entry.revision,expectedFieldRevisions:entry.fieldRevisions,changes:{body:'SYNTHETIC_UPDATED_EXPRESSION'}}});
  // Section retains unaffected prior-window rows while an authority read is pending.
  // The edited match must never remain or be revived as old search content.
  await eventually(()=>p.locator(`#original-reading-body [data-entry-id="${seed.ids[155]}"]`).count().then(n=>n===0),'the edited old query match is absent before releasing its stale response');assert.ok(!(await p.locator('#original-reading-body').innerText()).includes('SYNTHETIC_LATE_MATCH'));
  await p.evaluate(()=>{__d2Restore();for(const finish of __d2Held)finish();});
  await eventually(async()=>await p.evaluate(()=>__d2Content.topicReader?.query==='SYNTHETIC_LATE_MATCH'&&__d2Content.topicReader.terminalNext&&!__d2Content.topicReader.loadingNext)&&await p.locator('#original-reading-body [data-entry-id]').count()===0,'new empty query is fully rendered after mutation',30000);assert.equal(await p.locator('#original-reading-body [data-entry-id]').count(),0,'the completed query has no result after its sole match was edited');assert.ok(!(await p.locator('#original-reading-body').innerText()).includes('SYNTHETIC_LATE_MATCH'));
  await p.locator('#back').click();
  const sparse=await p.evaluate(async()=>{const {OrganizerStore}=await import('../core/organizer/store.js'),s=new OrganizerStore(chrome.storage.local),topic=await s.createTopic({name:'SYNTHETIC sparse query',operationId:crypto.randomUUID()});let first,last;for(let i=0;i<241;i++){s.clock=()=>new Date(Date.UTC(2022,0,1)+i*1000).toISOString();last=await s.continueThinking({operationId:crypto.randomUUID(),topicId:topic.id,body:i===240?'SYNTHETIC_FAR_LATE_MATCH SYNTHETIC_EDGE_MATCH':i===0?'SYNTHETIC_EDGE_MATCH first':'SYNTHETIC unrelated '+i});if(i===0)first=last.id;}await s.repository.close();return {topicId:topic.id,last:last.id,first};});
  await p.locator('[data-view="thoughts"]').click();await eventually(()=>p.locator(`.personal-topic-link[data-topic-id="${sparse.topicId}"]`).count().then(n=>n===1),'refresh root after out-of-band synthetic store seed');await p.locator(`.personal-topic-link[data-topic-id="${sparse.topicId}"]`).click();await eventually(()=>p.locator('#original-reading-body [data-entry-id]').count().then(n=>n>0),'sparse Topic content loads');await p.evaluate(()=>{scrollTo(0,document.body.scrollHeight);scrollTo(0,0);});
  await p.locator('#topic-search').fill('SYNTHETIC_FAR_LATE_MATCH');await eventually(async()=>await p.evaluate(()=>__d2Content.topicReader?.query)==='SYNTHETIC_FAR_LATE_MATCH'&&await p.locator(`[data-entry-id="${sparse.last}"]`).count()===1,'sparse full-topic search passes six empty descriptor pages',30000);assert.equal(await p.locator('#original-reading-body [data-entry-id]').count(),1);
  await p.locator('#topic-search').fill('SYNTHETIC_EDGE_MATCH');await eventually(()=>p.evaluate(()=>__d2Content.topicReader?.query==='SYNTHETIC_EDGE_MATCH'&&!__d2Content.topicReader.loadingNext),'new edge query first page settles');for(let i=0;i<10&&!await p.evaluate(()=>__d2Content.topicReader.terminalNext);i++){const cursor=await p.evaluate(()=>__d2Content.topicReader.nextCursor);await p.locator('#topic-continuous-after').evaluate(el=>el.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})));await eventually(()=>p.evaluate(cursor=>!__d2Content.topicReader.loadingNext&&(__d2Content.topicReader.nextCursor!==cursor||__d2Content.topicReader.terminalNext),cursor),'explicit Section continuation advances sparse query');}await eventually(async()=>await p.evaluate(()=>__d2Content.topicReader?.query)==='SYNTHETIC_EDGE_MATCH'&&await p.locator(`[data-entry-id="${sparse.last}"]`).count()===1&&await p.evaluate(()=>__d2Content.topicReader?.terminalNext),'both-edge query reaches last match',30000);
  for(let i=0;i<10;i++){if(await p.locator(`[data-entry-id="${sparse.first}"]`).count())break;const before=p.locator('#topic-continuous-before');assert.ok(await before.isVisible());await before.evaluate(el=>el.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})));await eventually(()=>p.evaluate(()=>!__d2Content.topicReader.loadingPrevious));}
  await eventually(()=>p.locator(`[data-entry-id="${sparse.first}"]`).count().then(n=>n===1),'explicit backward reading reaches the first distant match without auto-forward bounce',30000);
  await rpc(p,'UPDATE_PREFERENCES',{changes:{language:'en'}});await eventually(()=>p.locator('#topic-continuous-after-status').textContent().then(t=>/End of/.test(t)));assert.equal(await p.locator('[data-topic-view="years"]').count(),0);assert.deepEqual(await p.locator('#original-reading-body [data-entry-id]').evaluateAll(nodes=>nodes.map(n=>n.dataset.entryId)),[sparse.first,sparse.last]);
  assert.equal(h.externalRequests,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.deepSeekRequests.length,0);assert.deepEqual(h.errors,[]);
  await d5.finish();
  writeFileSync(`work/qa-dvn-topic-years/${variant}.json`,JSON.stringify({status:'PASS',headSha:process.env.PAIA_TESTED_HEAD||execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),variant,matrix,dated:159,unknown:1,completeSectionFirst100:true,retiredYearsRefused:true,queryReturn:true,aiViewReturn:true,rootReturn:true,imePreserved:true,mutationFence:true,sparseQuery241:true,zeroProviderCalls:true},null,2));
 }catch(error){const state=await p.evaluate(()=>({query:document.getElementById('topic-search')?.value,inert:document.getElementById('topic-body')?.inert,rows:[...document.querySelectorAll('#original-reading-body [data-entry-id]')].map(n=>({id:n.dataset.entryId,text:n.textContent})),reader:__d2Content?.topicReader?.state(),held:globalThis.__d2HeldResult,serial:__d2Content?.serial})).catch(()=>null);mkdirSync('work/qa-dvn-topic-years',{recursive:true});writeFileSync(`work/qa-dvn-topic-years/${variant}-failure.json`,JSON.stringify({error:{message:error.message,stack:error.stack},state},null,2));throw error;}finally{try{await d5?.close();}finally{await h.close();}}
});


import {measureTopicHeader,assertTopicHeader,verifyTopicHeaderInteractions} from './harness/d5-topic-header.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import {openThoughtReference,thoughtLayout,thoughtPalette} from './harness/d7-thought-reference.mjs';
import {openThoughtReadingOptions} from './harness/current-thought-navigation.mjs';
const fonts={small:16,standard:17,large:19,xlarge:21};
const widths={narrow:640,standard:680,wide:720};
const frame=page=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
async function measure(page,kind,id,reference=false){return page.evaluate(({kind,id,reference})=>{
 const entry=document.querySelector(reference?'.year .input-entry':kind==='content'?`#original-reading-body [data-entry-id="${id}"]`:'[data-year-section="2023"] .topic-year-expression');
 const year=entry?.closest(reference?'.year':kind==='content'?'.topic-section':'.topic-year-section');
 const nodes={header:document.querySelector(reference?'.topbar':'.workspace-header'),container:document.querySelector(reference?'.workspace.context':'#thought-panel'),heading:document.querySelector(reference?'.row h1':'#topic-heading h1'),year,yearHeading:year?.querySelector(reference?'.year-title':kind==='content'?'.section-heading h2':':scope>h2'),entry,stamp:entry?.querySelector(reference?'time':'.entry-sent-time'),prose:entry?.querySelector(reference?'.prose':kind==='content'?'[data-entry-field="body"]':'.entry-prose')};
 if(kind==='years')nodes.yearsNav=document.querySelector(reference?'.years':'.topic-year-links');
 const metrics=Object.fromEntries(Object.entries(nodes).map(([key,node])=>{if(!node)throw Error('Missing D5 reading role '+key);const r=node.getBoundingClientRect(),c=getComputedStyle(node);return [key,{x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,visible:r.bottom>0&&r.top<innerHeight,text:node.textContent,...Object.fromEntries(['fontSize','lineHeight','fontWeight','fontFamily','fontSynthesis','color','marginTop','marginBottom','paddingTop','paddingBottom','paddingLeft','paddingRight','gap','borderTopWidth','borderBottomWidth','borderRadius','boxShadow'].map(key=>[key,c[key]]))}];}));
 return {scrollY,viewport:{width:innerWidth,height:innerHeight},font:getComputedStyle(document.documentElement).getPropertyValue('--paia-prose-size'),readingWidth:getComputedStyle(document.documentElement).getPropertyValue('--paia-prose-width'),nodes:metrics};
 },{kind,id,reference});}
async function openSectionReading(h,variant,kind,id){
 const p=h.archive,ref=await openThoughtReference(h,kind==='content'?'T02':'T04'),directory=`work/qa-dvn-topic-years/section-visual`;
 const saved=(await rpc(p,'GET_PAGE',{page:{view:'settings'}})).preferences,rows=[],failures=[],preferences=[],targets=[],headers=[],headerInteractions=[];
 await mkdir(directory,{recursive:true});await p.emulateMedia({reducedMotion:'reduce'});
 const persist=result=>writeFile(`${directory}/${variant}.json`,JSON.stringify({result,head:process.env.PAIA_TESTED_HEAD,variant,kind,rows,failures,preferences,targets,headers,headerInteractions,scope:'TOPIC-05.4 durable Section roles with retained D6.2 header, preference and interaction guarantees. T02 comparison is used only for unchanged header roles; retired year/tab composition is explicitly absent.'},null,2));
 const near=(a,b,label)=>{if(Math.abs(a-b)>2)failures.push(`${label}: ${a} != ${b}`);};
 const exact=(a,b,label)=>{if(a!==b)failures.push(`${label}: ${a} != ${b}`);};
 const body=()=>p.locator(kind==='content'?`[data-entry-id="${id}"] [data-entry-field="body"]`:'[data-year-section="2023"] .topic-year-expression .entry-prose').first();
 async function verifyPreference(label,fontSize,readingWidth){
  const measured=await measure(p,kind,id),n=measured.nodes,available=n.container.width-parseFloat(n.container.paddingLeft)-parseFloat(n.container.paddingRight),expectedWidth=Math.min(available,widths[readingWidth],760),expectedFont=fonts[fontSize];
  preferences.push({label,fontSize,readingWidth,expectedWidth,measured});await persist('PENDING');
  assert.equal(parseFloat(n.prose.fontSize),expectedFont,label+' saved body size');assert.ok(Math.abs(parseFloat(n.prose.lineHeight)-expectedFont*1.85)<.01,label+' body line height');assert.ok(Math.abs(n.year.width-expectedWidth)<=2,label+' exact saved reading-width formula');
  const actual=(await rpc(p,'GET_PAGE',{page:{view:'settings'}})).preferences;assert.equal(actual.fontSize,fontSize);assert.equal(actual.readingWidth,readingWidth);
 }
 async function overflowTarget(label){
  const trigger=p.locator(`[data-entry-id="${id}"] .entry-meta>.library-actions>summary`);await trigger.scrollIntoViewIfNeeded();await frame(p);
  const measured=await trigger.evaluate(node=>{const r=node.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);globalThis.__d5ReadingTrigger=node;return {width:r.width,height:r.height,hit:hit===node||node.contains(hit),pointerEvents:getComputedStyle(node).pointerEvents,coarse:matchMedia('(pointer:coarse)').matches};});
  targets.push({label,...measured});await persist('PENDING');assert.ok(measured.width>=44&&measured.height>=44,label+' actual44px target');assert.notEqual(measured.pointerEvents,'none');assert.equal(measured.hit,true,label+' uncovered target');
  await trigger.click();assert.equal(await trigger.evaluate(node=>node.parentElement.open),true,'pointer opens the owning menu');await p.keyboard.press('Escape');assert.equal(await trigger.evaluate(node=>!node.parentElement.open&&node===__d5ReadingTrigger&&document.activeElement===node),true,'Escape closes and returns focus to the same trigger');
 }
 return {
  async capture(width,theme){
   await eventually(()=>p.evaluate(theme=>document.documentElement.dataset.paiaTheme===theme,theme),'D6.2 reading settled theme');
   await p.evaluate(()=>scrollTo(0,0));await frame(p);
   const production=await measure(p,kind,id),a=production.nodes,label=`${variant}/${kind}/${width}/${theme}`,layout=thoughtLayout(width),palette=thoughtPalette(theme);
   near(a.container.x,layout.rail,label+' workspace axis');near(a.container.width,width-layout.rail,label+' workspace width');near(a.heading.x,layout.rail+layout.gutter,label+' left reading axis');near(a.year.x,a.heading.x,label+' durable Section shares reading axis');
   for(const [key,value]of Object.entries({fontSize:width<768?'24px':'28px',lineHeight:width<768?'35px':'38px',fontWeight:'500',color:palette.text}))exact(a.heading[key],value,label+' heading.'+key);
   assert.match(a.heading.fontFamily,/Georgia/,'D6.2 serif heading role');
   assert.equal(await p.locator('#topic-original-tabs button').count(),0,'retired Content/Years tabs do not return');
   for(const [key,value]of Object.entries({fontSize:width<768?'20px':'22px',lineHeight:width<768?'30px':'33px',fontWeight:'500',marginBottom:'0px'}))exact(a.yearHeading[key],value,label+' yearHeading.'+key);
   for(const [key,value]of Object.entries({fontSize:'12px',lineHeight:'20px',marginBottom:'8px',color:await p.evaluate(()=>{const n=document.createElement('span');n.style.color='var(--muted)';document.body.append(n);const color=getComputedStyle(n).color;n.remove();return color;})}))exact(a.stamp[key],value,label+' stamp.'+key);
   exact(a.entry.marginBottom,kind==='years'?'20px':'32px',label+' entry.marginBottom');exact(a.year.paddingTop,'0px',label+' year.paddingTop');exact(a.year.borderBottomWidth,'0px',label+' year.borderBottomWidth');
   if(kind==='years')for(const [key,value]of Object.entries({gap:'12px',marginBottom:'24px'}))exact(a.yearsNav[key],value,label+' yearsNav.'+key);
   const current=(await rpc(p,'GET_PAGE',{page:{view:'settings'}})).preferences;await verifyPreference(label,current.fontSize,current.readingWidth);
   const stem=`${directory}/${variant}-${width}-${theme}`;await p.screenshot({path:stem+'-top-production.png'});const reference=await ref.capture(theme,stem+'-top-reference.png');
   const header={width,theme,production:await measureTopicHeader(p),reference};headers.push(header);await persist('PENDING');assertTopicHeader(header.production,reference,label);
   await body().scrollIntoViewIfNeeded();await frame(p);
   const bodyProduction=await measure(p,kind,id);assert.ok(bodyProduction.nodes.prose.visible&&bodyProduction.nodes.prose.text.trim(),label+' actual body intersects viewport '+JSON.stringify({scroll:bodyProduction.scrollY,prose:bodyProduction.nodes.prose,section:bodyProduction.nodes.year}));
   await p.screenshot({path:stem+'-body-production.png'});rows.push({width,theme,production,reference,bodyProduction});await persist('PENDING');
   if(kind==='content'&&width<=390)await overflowTarget(label+' overflow');await p.evaluate(()=>scrollTo(0,0));await frame(p);
  },
  async verifyPreferences(){
   const initial=(await rpc(p,'GET_PAGE',{page:{view:'settings'}})).preferences;
   try{
    if(kind==='content')await body().evaluate(field=>{const node=field.firstChild,start=node.data.indexOf('👩‍💻');if(start<0)throw Error('Synthetic Unicode selection missing');globalThis.__d5PreferenceSelection={field,node,parent:field.parentElement,text:field.textContent,start,end:start+'👩‍💻'.length};const range=document.createRange();range.setStart(node,start);range.setEnd(node,__d5PreferenceSelection.end);getSelection().removeAllRanges();getSelection().addRange(range);});
    for(const width of [1440,767,320]){
     await p.setViewportSize({width,height:900});
     const combinations=[...Object.keys(fonts).map(fontSize=>({fontSize,readingWidth:'standard'})),...Object.keys(widths).map(readingWidth=>({fontSize:'standard',readingWidth}))];
     for(const changes of combinations){await rpc(p,'UPDATE_PREFERENCES',{changes});await eventually(()=>p.evaluate(({font,width})=>{const style=getComputedStyle(document.documentElement);return parseFloat(style.getPropertyValue('--paia-prose-size'))===font&&parseFloat(style.getPropertyValue('--paia-prose-width'))===width;},{font:fonts[changes.fontSize],width:widths[changes.readingWidth]}),'both saved reading preferences applied');await frame(p);await verifyPreference(`${width}/${changes.fontSize}/${changes.readingWidth}`,changes.fontSize,changes.readingWidth);
      if(kind==='content')assert.equal(await p.evaluate(()=>{const s=__d5PreferenceSelection,selection=getSelection();return s.node===s.field.firstChild&&s.field.parentElement===s.parent&&s.field.textContent===s.text&&selection.anchorNode===s.node&&selection.focusNode===s.node&&selection.anchorOffset===s.start&&selection.focusOffset===s.end;}),true,'reading preferences preserve the exact authored node and Unicode selection');
     }
    }
   }finally{
    if(kind==='content')await p.evaluate(()=>{getSelection().removeAllRanges();delete globalThis.__d5PreferenceSelection;});await rpc(p,'UPDATE_PREFERENCES',{changes:{fontSize:initial.fontSize,readingWidth:initial.readingWidth}});await p.setViewportSize({width:1440,height:900});await frame(p);await persist('PENDING');
   }
   if(kind==='content'){
    const session=await h.context.newCDPSession(p);
    try{
     await session.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});await openThoughtReadingOptions(p);assert.equal(await p.evaluate(()=>matchMedia('(pointer:coarse)').matches),true,'actual coarse media query');
     const controls=await p.locator('#topic-toolbar :is(button,summary),#topic-reading-controls :is(button,summary,select),#topic-source-scope,#topic-outline>summary,#topic-original-tabs button').evaluateAll(nodes=>nodes.map(node=>({node,r:node.getBoundingClientRect()})).filter(({r})=>r.width&&r.height).map(({node,r})=>({id:node.id,text:node.textContent,width:r.width,height:r.height})));
     targets.push({label:'desktop coarse visible controls',controls});await persist('PENDING');assert.ok(controls.length>0);for(const control of controls)assert.ok(control.width>=44&&control.height>=44,`coarse control44px ${control.id||control.text}`);
     await p.locator('.dvn-topic-options>summary').click();await overflowTarget('desktop coarse overflow');
    }finally{await session.send('Emulation.setTouchEmulationEnabled',{enabled:false});await session.detach();await p.evaluate(()=>scrollTo(0,0));await frame(p);}
   }
  },
  async verifyTextZoom(){
   await p.setViewportSize({width:320,height:900});const before=await measure(p,kind,id);
   try{
    await p.evaluate(()=>{globalThis.__d5ReadingZoom=[...document.querySelectorAll('#thought-document h1,#thought-document h2,#thought-document p,#thought-document button,#thought-document summary,#thought-document select,#thought-document .entry-prose,#thought-document .entry-sent-time')].map(node=>({node,prior:node.style.getPropertyValue('font-size'),priority:node.style.getPropertyPriority('font-size'),size:parseFloat(getComputedStyle(node).fontSize)}));for(const item of __d5ReadingZoom)item.node.style.setProperty('font-size',(item.size*2)+'px','important');});
    await body().scrollIntoViewIfNeeded();await frame(p);const measured=await measure(p,kind,id),overflow=await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
    targets.push({label:'320px 200% text',overflow,measured});await persist('PENDING');await p.screenshot({path:`${directory}/${variant}-text200-320.png`});assert.equal(parseFloat(measured.nodes.prose.fontSize),parseFloat(before.nodes.prose.fontSize)*2,'actual prose computed size doubles');assert.ok(overflow<=2,'200% reading text has no horizontal page overflow');assert.ok(measured.nodes.prose.visible&&measured.nodes.prose.text.trim(),'200% actual body is visible');
    if(kind==='content')await overflowTarget('320px 200% text overflow');
   }finally{await p.evaluate(()=>{for(const item of globalThis.__d5ReadingZoom||[])item.node.style.setProperty('font-size',item.prior,item.priority);delete globalThis.__d5ReadingZoom;scrollTo(0,0);});await p.setViewportSize({width:1440,height:900});await frame(p);}
  },
  async finishInteractions(){
   if(kind!=='content')return;
   const observe=label=>p.evaluate(label=>{const active=document.activeElement,selection=getSelection();return {label,active:{tag:active?.tagName,id:active?.id,entryId:active?.closest('[data-entry-id]')?.dataset.entryId||null},pins:[...__d2Content.editor.entry.protectedIds()],selectionCollapsed:selection?.isCollapsed,openEntryMenus:[...document.querySelectorAll('#original-reading-body [data-entry-id] details[open]')].map(node=>node.closest('[data-entry-id]').dataset.entryId)};},label);
   const before=await observe('after exact menu focus return');targets.push(before);await persist('PENDING');assert.equal(before.active.entryId,id,'the added menu journey retains its exact first-entry invoker');assert.deepEqual(before.pins,[id],'the existing owner protects that focused entry');
   await p.locator('#topic-heading h1').click();await frame(p);const after=await observe('neutral heading focus before original paging journey');targets.push(after);await persist('PENDING');assert.equal(after.active.entryId,null);assert.deepEqual(after.pins,[],'explicitly leave the completed interaction before testing the unpinned120-row paging window');assert.deepEqual(after.openEntryMenus,[]);
  },
  async verifyHeaderInteractions(){assert.equal(kind,'content','native additions stay in the isolated Content visual fixture');try{await verifyTopicHeaderInteractions(h,variant,id,{directory,persist,interactions:headerInteractions});}catch(error){failures.push('header interactions: '+error.message);await persist('FAIL');throw error;}},
  async state(name,selector){const target=p.locator(selector).first();await target.scrollIntoViewIfNeeded();assert.ok((await target.textContent()).trim());await p.screenshot({path:`${directory}/${variant}-${name}.png`});},
  async finish(){await persist(failures.length?'FAIL':'PASS');assert.deepEqual(failures,[],'all observed fixed Thought reading comparisons must pass');},
  async close(){await ref.close();await p.emulateMedia({reducedMotion:'no-preference'});await rpc(p,'UPDATE_PREFERENCES',{changes:{fontSize:saved.fontSize,readingWidth:saved.readingWidth}});}
 };
}

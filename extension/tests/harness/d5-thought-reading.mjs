import {measureTopicHeader,assertTopicHeader,verifyTopicHeaderInteractions} from './d5-topic-header.mjs';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {openThoughtReference,thoughtLayout,thoughtPalette} from './d7-thought-reference.mjs';
import {eventually} from './fake-chatgpt.mjs';
import {openThoughtReadingOptions} from './current-thought-navigation.mjs';
const fonts={small:16,standard:17,large:19,xlarge:21};
const widths={narrow:640,standard:680,wide:720};
const rpc=async(page,type,fields={})=>{const result=await page.evaluate(message=>chrome.runtime.sendMessage(message),{type,...fields});assert.equal(result?.ok,true,JSON.stringify(result));return result.data;};
const frame=page=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
async function measure(page,kind,id,reference=false){return page.evaluate(({kind,id,reference})=>{
 const entry=document.querySelector(reference?'.year .input-entry':kind==='content'?`#original-reading-body [data-entry-id="${id}"]`:'[data-year-section="2023"] .topic-year-expression');
 const year=entry?.closest(reference?'.year':kind==='content'?'.topic-expression-year':'.topic-year-section');
 const nodes={header:document.querySelector(reference?'.topbar':'.workspace-header'),container:document.querySelector(reference?'.workspace.context':'#thought-panel'),heading:document.querySelector(reference?'.row h1':'#topic-heading h1'),tabs:document.querySelector(reference?'.tabs':'#topic-original-tabs'),year,yearHeading:year?.querySelector(reference?'.year-title':kind==='content'?'.section-heading h2':':scope>h2'),entry,stamp:entry?.querySelector(reference?'time':'.entry-sent-time'),prose:entry?.querySelector(reference?'.prose':kind==='content'?'[data-entry-field="body"]':'.entry-prose')};
 if(kind==='years')nodes.yearsNav=document.querySelector(reference?'.years':'.topic-year-links');
 const metrics=Object.fromEntries(Object.entries(nodes).map(([key,node])=>{if(!node)throw Error('Missing D5 reading role '+key);const r=node.getBoundingClientRect(),c=getComputedStyle(node);return [key,{x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,visible:r.bottom>0&&r.top<innerHeight,text:node.textContent,...Object.fromEntries(['fontSize','lineHeight','fontWeight','fontFamily','fontSynthesis','color','marginTop','marginBottom','paddingTop','paddingBottom','paddingLeft','paddingRight','gap','borderTopWidth','borderBottomWidth','borderRadius','boxShadow'].map(key=>[key,c[key]]))}];}));
 return {scrollY,viewport:{width:innerWidth,height:innerHeight},font:getComputedStyle(document.documentElement).getPropertyValue('--paia-prose-size'),readingWidth:getComputedStyle(document.documentElement).getPropertyValue('--paia-prose-width'),nodes:metrics};
 },{kind,id,reference});}
export async function openD5ThoughtReading(h,variant,kind,id){
 const p=h.archive,ref=await openThoughtReference(h,kind==='content'?'T02':'T04'),directory=`work/qa-dvn-topic-${kind}/d7`;
 const saved=(await rpc(p,'GET_PAGE',{page:{view:'settings'}})).preferences,rows=[],failures=[],preferences=[],targets=[],headers=[],headerInteractions=[];
 await mkdir(directory,{recursive:true});await p.emulateMedia({reducedMotion:'reduce'});
 const persist=result=>writeFile(`${directory}/${variant}.json`,JSON.stringify({result,head:process.env.PAIA_TESTED_HEAD,variant,kind,rows,failures,preferences,targets,headers,headerInteractions,scope:'D6.2 T02/T04 structural roles and explicit saved-preference formulas. Original approved masters remain unchanged; actual chronology, provenance, coverage and complete editable Content windows remain authoritative. Writing Save/Cancel is held.'},null,2));
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
   near(a.container.x,layout.rail,label+' workspace axis');near(a.container.width,width-layout.rail,label+' workspace width');near(a.heading.x,layout.rail+layout.gutter,label+' left reading axis');near(a.year.x,a.heading.x,label+' year shares reading axis');
   for(const [key,value]of Object.entries({fontSize:width<768?'24px':'28px',lineHeight:width<768?'35px':'38px',fontWeight:'500',color:palette.text}))exact(a.heading[key],value,label+' heading.'+key);
   assert.match(a.heading.fontFamily,/Georgia/,'D6.2 serif heading role');
   for(const [key,value]of Object.entries({gap:'24px',marginTop:'0px',marginBottom:'0px'}))exact(a.tabs[key],value,label+' tabs.'+key);
   for(const [key,value]of Object.entries({fontSize:'24px',lineHeight:'33px',fontWeight:'500',marginBottom:'16px'}))exact(a.yearHeading[key],value,label+' yearHeading.'+key);
   for(const [key,value]of Object.entries({fontSize:'12px',lineHeight:kind==='years'?'20px':'18px',marginBottom:kind==='years'?'8px':'12px',color:palette.quiet}))exact(a.stamp[key],value,label+' stamp.'+key);
   exact(a.entry.marginBottom,kind==='years'?'20px':'32px',label+' entry.marginBottom');exact(a.year.paddingTop,'0px',label+' year.paddingTop');exact(a.year.borderBottomWidth,'0px',label+' year.borderBottomWidth');
   if(kind==='years')for(const [key,value]of Object.entries({gap:'12px',marginBottom:'24px'}))exact(a.yearsNav[key],value,label+' yearsNav.'+key);
   const current=(await rpc(p,'GET_PAGE',{page:{view:'settings'}})).preferences;await verifyPreference(label,current.fontSize,current.readingWidth);
   const stem=`${directory}/${variant}-${width}-${theme}`;await p.screenshot({path:stem+'-top-production.png'});const reference=await ref.capture(theme,stem+'-top-reference.png');
   const header={width,theme,production:await measureTopicHeader(p),reference};headers.push(header);await persist('PENDING');assertTopicHeader(header.production,reference,label);
   await body().evaluate(node=>node.scrollIntoView({block:'center'}));await frame(p);
   const bodyProduction=await measure(p,kind,id);assert.ok(bodyProduction.nodes.prose.visible&&bodyProduction.nodes.prose.text.trim(),label+' actual body intersects viewport');
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
    await body().evaluate(node=>node.scrollIntoView({block:'center'}));await frame(p);const measured=await measure(p,kind,id),overflow=await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
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

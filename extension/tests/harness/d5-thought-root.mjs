import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {openThoughtReference,thoughtLayout,thoughtPalette} from './d7-thought-reference.mjs';
import {eventually} from './fake-chatgpt.mjs';
const directory='work/qa-dvn-topic-root/d7';
async function measure(page,reference){return page.evaluate(reference=>{
 const selectors=reference?{header:'.topbar',body:'.workspace.context',heading:'.workspace h1',list:'.topic-row',row:'.topic-row',title:'.topic-row h2',cue:'.topic-row p',caption:'.topic-row time',search:'.scope input',searchIcon:'.scope>span'}:{header:'.workspace-header',body:'#thought-panel',heading:'#thought-root-heading h1',list:'#thought-list',row:'.topic-compact-row>.topic-index-row',title:'.topic-compact-row strong',cue:'.topic-compact-row .summary',caption:'.topic-compact-row small',search:'#thought-search',searchIcon:'.thought-search-icon'};
 const metrics=Object.fromEntries(Object.entries(selectors).map(([key,selector])=>{const node=document.querySelector(selector),r=node.getBoundingClientRect(),c=getComputedStyle(node);return [key,{x:r.x,y:r.y,width:r.width,height:r.height,paddingTop:c.paddingTop,paddingLeft:c.paddingLeft,paddingRight:c.paddingRight,fontSize:c.fontSize,lineHeight:c.lineHeight,fontWeight:c.fontWeight,fontFamily:c.fontFamily,fontSynthesis:c.fontSynthesis,color:c.color,background:c.backgroundColor,borderRadius:c.borderRadius,overflow:node.scrollWidth-node.clientWidth}];}));
 if(!reference){const label=document.getElementById('thought-source-scope-label'),range=document.createRange();range.selectNode(label.firstChild);metrics.sourceLabel={text:label.firstChild.textContent,lines:range.getClientRects().length,whiteSpace:getComputedStyle(label).whiteSpace};}
 return metrics;
 },reference);}
export async function openD5ThoughtRoot(h,variant){
 const ref=await openThoughtReference(h,'T01'),rows=[],failures=[],p=h.archive;
 await mkdir(directory,{recursive:true});
 return {async capture(width,theme){
  await eventually(()=>p.evaluate(theme=>document.documentElement.dataset.paiaTheme===theme,theme),'D6.2 root settled theme');
  const production=await measure(p,false),label=`${variant}/${width}/${theme}`,layout=thoughtLayout(width),palette=thoughtPalette(theme);
  const exact=(a,b,name)=>{if(a!==b)failures.push(`${label} ${name}: ${a} != ${b}`);},near=(a,b,name)=>{if(Math.abs(a-b)>2)failures.push(`${label} ${name}: ${a} != ${b}`);};
  near(production.body.x,layout.rail,'D6.2 workspace axis');near(production.body.width,width-layout.rail,'D6.2 available workspace');
  exact(production.body.paddingTop,'24px','root top gutter');for(const key of ['paddingLeft','paddingRight'])exact(production.body[key],layout.gutter+'px','root '+key);
  const contextWidth=Math.min(layout.cap,width-layout.rail-layout.gutter*2);near(production.list.width,contextWidth,'D6.2 936px content cap');near(production.list.x,layout.rail+layout.gutter,'D6.2 left reading axis');near(production.heading.x,production.list.x,'heading aligns with actual reading column');
  const roles={heading:{fontSize:width<768?'24px':'28px',lineHeight:width<768?'35px':'38px',fontWeight:'500',color:palette.text},title:{fontSize:'23px',lineHeight:'32px',fontWeight:'500',color:palette.text},cue:{fontSize:'15px',lineHeight:'23px',color:palette.text},caption:{fontSize:'12px',lineHeight:'20px',color:palette.muted}};
  for(const [target,expected]of Object.entries(roles))for(const [key,value]of Object.entries(expected))exact(production[target][key],value,target+'.'+key);
  for(const target of ['heading','title']){assert.ok(production[target].fontSynthesis.split(' ').includes('weight'),label+' '+target+' permits declared CJK weight');assert.match(production[target].fontFamily,/Georgia/,label+' D6.2 serif role');}
  exact(production.sourceLabel.lines,1,'product Source label stays on one line');exact(production.row.paddingTop,'24px','row padding');exact(production.search.background,palette.soft,'search surface');
  if(width>=1024){near(production.header.x,width-294,'D6.2 trailing header');near(production.header.width,250,'D6.2 scoped search width');exact(production.header.paddingTop,'0px','absolute header top padding');near(production.search.x-production.searchIcon.x-production.searchIcon.width,8,'search icon gap');near(production.heading.y,24,'D6.2 root heading y');}
  assert.equal(await p.locator('.thought-search-icon').textContent(),'');assert.equal(await p.locator('.thought-search-icon > svg[data-paia-icon="search"]').count(),1);assert.equal(await p.locator('.thought-search-icon > svg').getAttribute('aria-hidden'),'true');assert.equal(await p.locator('.thought-search-icon > svg').getAttribute('focusable'),'false');assert.equal(await p.locator('.thought-search-icon').getAttribute('aria-hidden'),'true');
  assert.equal(await p.evaluate(()=>document.querySelector('#thought-root-header').contains(document.querySelector('#thought-search'))),true,'existing sole search is in the root header');
  assert.equal(await p.locator('#thought-root-source #thought-source-scope').isVisible(),true,'existing source scope remains in the root body');assert.equal(await p.locator('#thought-topic-header').isVisible(),false);assert.equal(await p.locator('#thought-search').count(),1);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth<=2));
  const stem=`${directory}/${variant}-${width}-${theme}`;await p.screenshot({path:stem+'-production.png',fullPage:false});const reference=await ref.capture(theme,stem+'-reference.png');
  rows.push({width,theme,production,reference});await writeFile(`${directory}/${variant}-root.json`,JSON.stringify({head:process.env.PAIA_TESTED_HEAD,variant,result:failures.length?'FAIL':'PENDING',rows,failures,scope:'D6.2 T01 structural contract, left reading axis and 936px content cap; full real cue attribution/time and compact navigation remain truthful. Historical D5 centered geometry is superseded.'},null,2));
 },async finish(){assert.deepEqual(failures,[],'all observed fixed Thought-root comparisons must pass');await writeFile(`${directory}/${variant}-root.json`,JSON.stringify({head:process.env.PAIA_TESTED_HEAD,variant,result:'PASS',rows,failures},null,2));},async close(){await ref.close();}};
}


export async function observeD5ThoughtRootScroll(page){await page.evaluate(async()=>{
 const {TopicController}=await import('./topic-workspace.js'),create=TopicController.prototype.createHomeCollection,restore=TopicController.prototype.restoreHomeAnchor;globalThis.__d5RootScroll=[];
 TopicController.prototype.createHomeCollection=function(...args){globalThis.__d5RootOwner=this;return create.apply(this,args);};
 TopicController.prototype.restoreHomeAnchor=function(anchor){globalThis.__d5RootOwner=this;__d5RootScroll.push({time:performance.now(),scrollY,anchor,restoring:this.homeRestoring});if(__d5RootScroll.length>20)__d5RootScroll.shift();return restore.call(this,anchor);};
});}

export async function verifyD5ThoughtRootTextZoom(page,variant){
 const snapshots=[],path=`work/qa-dvn-topic-root/${variant}-text200-320`,selectors=['#thought-search','#thought-source-scope','#thought-root-source>.library-actions>summary','#thought-root-source>button'];
 const sample=label=>page.evaluate(({label,selectors})=>{const rect=el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom};},owner=globalThis.__d5RootOwner;return {label,time:performance.now(),scrollY,viewport:{width:innerWidth,height:innerHeight},overflow:document.documentElement.scrollWidth-innerWidth,owner:owner?{restoring:owner.homeRestoring,shifting:owner.homeWindowShifting,loading:!!owner.homeCollection?.loading,hydrating:!!owner.homeCollection?.hydration}:null,rail:rect(document.querySelector('.sidebar')),header:rect(document.querySelector('.workspace-header')),controls:selectors.map(selector=>{const el=document.querySelector(selector),r=rect(el),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {selector,...r,hit:!!hit&&(hit===el||el.contains(hit)),active:document.activeElement===el};}),trace:globalThis.__d5RootScroll};},{label,selectors});
 try{
  snapshots.push(await sample('before zoom'));
  await page.evaluate(()=>{globalThis.__d2ZoomRows=[...document.querySelectorAll('#thought-root-heading h1,#thought-home-tools input,#thought-root-source summary,#thought-root-source button,#thought-root-source label,#thought-root-source select,#thought-panel button,#thought-panel strong,#thought-panel span,#thought-panel small,#thought-panel p,#thought-panel label,#thought-panel select')].map(node=>({node,size:getComputedStyle(node).fontSize,prior:node.style.fontSize}));for(const row of __d2ZoomRows)row.node.style.fontSize=(parseFloat(row.size)*2)+'px';scrollTo(0,0);});
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)));snapshots.push(await sample('original one-frame capture'));await page.screenshot({path:path+'-initial.png'});assert.ok(snapshots.at(-1).overflow<=2,'200% text at320px has no page horizontal overflow');
  await eventually(()=>page.evaluate(()=>!!globalThis.__d5RootOwner&&!__d5RootOwner.homeRestoring&&!__d5RootOwner.homeWindowShifting&&!__d5RootOwner.homeCollection?.loading&&!__d5RootOwner.homeCollection?.hydration),'root restoration finishes before measuring enlarged controls');
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await page.evaluate(()=>scrollTo(0,0));await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const settled=await sample('settled explicit top');snapshots.push(settled);await page.screenshot({path:path+'.png'});assert.ok(settled.overflow<=2,'200% text at320px has no page horizontal overflow');assert.ok(settled.scrollY<=2,'explicit top remains at top after pending restoration');assert.ok(settled.header.y>=settled.rail.bottom-2,'enlarged header is below the compact rail');
  for(const control of settled.controls){assert.ok(control.width>0&&control.height>=44,'enlarged control has a usable target: '+control.selector);assert.ok(control.y>=settled.rail.bottom-2&&control.bottom<=settled.viewport.height,'enlarged control remains inside the usable viewport: '+control.selector);assert.equal(control.hit,true,'enlarged control is not covered: '+control.selector);}
  await page.locator(selectors[0]).click();assert.equal(await page.locator(selectors[0]).evaluate(el=>document.activeElement===el),true,'actual pointer reaches enlarged search');
  for(const selector of selectors.slice(1)){await page.keyboard.press('Tab');assert.equal(await page.locator(selector).evaluate(el=>document.activeElement===el),true,'native Tab reaches enlarged header control: '+selector);}
  snapshots.push(await sample('pointer and native Tab'));
 }finally{snapshots.push(await sample('final'));await writeFile(path+'.json',JSON.stringify({head:process.env.PAIA_TESTED_HEAD,variant,snapshots},null,2));await page.evaluate(()=>{for(const row of globalThis.__d2ZoomRows||[])row.node.style.fontSize=row.prior;delete globalThis.__d2ZoomRows;});}
}

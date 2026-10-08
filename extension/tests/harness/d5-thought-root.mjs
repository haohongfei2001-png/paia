import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {thoughtLayout,thoughtPalette} from './d7-thought-reference.mjs';
import {eventually} from './fake-chatgpt.mjs';

const directory='work/qa-dvn-topic-root/d7';
const widths=[1440,1280,1024,768,390,320];
// T01 remains historical compact-list evidence. It is not a TL-PT1 reference,
// and must never be relabelled as approval of the current Personal Topic grid.
const authority={contract:'TL-PT1-UI-1.0',sharedRoles:'D6.2 shell/tokens',historicalReference:'T01 compact list superseded',visualApproval:'NOT_CLAIMED',referenceComparison:'Current written contract; no exact private-reference reproduction'};

async function measure(page){return page.evaluate(()=>{
 const selectors={header:'.workspace-header',body:'#thought-panel',heading:'#thought-root-heading h1',list:'#thought-list',block:'article.personal-topic-block',title:'article.personal-topic-block h2',section:'.personal-section-link:not([hidden])',continuation:'.personal-topic-more:not([hidden])',search:'#thought-search',searchIcon:'.thought-search-icon'};
 const metrics=Object.fromEntries(Object.entries(selectors).map(([key,selector])=>{
  const node=document.querySelector(selector);if(!node)return [key,null];
  const r=node.getBoundingClientRect(),c=getComputedStyle(node);
  return [key,{x:r.x,y:r.y,width:r.width,height:r.height,paddingTop:c.paddingTop,paddingLeft:c.paddingLeft,paddingRight:c.paddingRight,fontSize:c.fontSize,lineHeight:c.lineHeight,fontWeight:c.fontWeight,fontFamily:c.fontFamily,fontSynthesis:c.fontSynthesis,color:c.color,background:c.backgroundColor,borderRadius:c.borderRadius,overflow:node.scrollWidth-node.clientWidth}];
 }));
 metrics.grid={columns:getComputedStyle(document.getElementById('thought-list')).gridTemplateColumns.split(' ').length,gap:getComputedStyle(document.getElementById('thought-list')).gap};
 return metrics;
});}

export async function openD5ThoughtRoot(h,variant){
 const rows=[],failures=[],p=h.archive;await mkdir(directory,{recursive:true});
 const receipt=result=>writeFile(`${directory}/${variant}-root.json`,JSON.stringify({head:process.env.PAIA_TESTED_HEAD,variant,result,authority,rows,failures},null,2));
 return {async capture(width,theme){
  await eventually(()=>p.evaluate(theme=>document.documentElement.dataset.paiaTheme===theme,theme),'Root settled theme');
  const production=await measure(p),label=`${variant}/${width}/${theme}`,layout=thoughtLayout(width),palette=thoughtPalette(theme);
  const exact=(a,b,name)=>{if(a!==b)failures.push(`${label} ${name}: ${a} != ${b}`);},near=(a,b,name)=>{if(Math.abs(a-b)>2)failures.push(`${label} ${name}: ${a} != ${b}`);};
  near(production.body.x,layout.rail,'shared workspace axis');near(production.body.width,width-layout.rail,'available workspace');
  exact(production.body.paddingTop,'24px','root top gutter');for(const key of ['paddingLeft','paddingRight'])exact(production.body[key],layout.gutter+'px','root '+key);
  // The adopted grid uses available workspace width; the old 936px compact
  // list cap is not a limit on the new four-column Root.
  near(production.list.width,width-layout.rail-layout.gutter*2,'grid available width');near(production.list.x,layout.rail+layout.gutter,'shared left axis');near(production.heading.x,production.list.x,'heading/list alignment');
  exact(production.grid.columns,Math.max(1,Math.min(4,Math.floor((production.list.width+16)/240))),'responsive columns');
  const roles={heading:{fontSize:width<768?'24px':'28px',lineHeight:width<768?'35px':'38px',fontWeight:'500',color:palette.text},title:{fontWeight:'500',color:palette.text},section:{color:palette.muted},continuation:{color:palette.muted}};
  for(const [target,expected]of Object.entries(roles)){
   if(!production[target]){failures.push(`${label} missing ${target} fixture`);continue;}
   for(const [key,value]of Object.entries(expected))exact(production[target][key],value,target+'.'+key);
  }
  for(const target of ['heading','title']){
   if(!production[target]?.fontSynthesis.split(' ').includes('weight'))failures.push(`${label} ${target} must permit declared CJK weight`);
   if(!/Georgia/.test(production[target]?.fontFamily||''))failures.push(`${label} ${target} must retain the shared serif role`);
  }
  assert.ok(parseFloat(production.heading.fontSize)>parseFloat(production.title.fontSize),'Topic h2 remains subordinate to the Root h1');
  assert.ok(parseFloat(production.title.fontSize)>parseFloat(production.section.fontSize),'real Section overview remains subordinate to its Topic');
  exact(production.search.background,palette.soft,'search surface');
  if(width>=1024){near(production.header.x,width-294,'shared trailing header');near(production.header.width,250,'scoped search width');exact(production.header.paddingTop,'0px','absolute header top padding');near(production.search.x-production.searchIcon.x-production.searchIcon.width,8,'search icon gap');near(production.heading.y,24,'root heading y');}
  assert.equal(await p.locator('.thought-search-icon').textContent(),'');assert.equal(await p.locator('.thought-search-icon > svg[data-paia-icon="search"]').count(),1);assert.equal(await p.locator('.thought-search-icon > svg').getAttribute('aria-hidden'),'true');assert.equal(await p.locator('.thought-search-icon > svg').getAttribute('focusable'),'false');assert.equal(await p.locator('.thought-search-icon').getAttribute('aria-hidden'),'true');
  assert.equal(await p.evaluate(()=>document.querySelector('#thought-root-header').contains(document.querySelector('#thought-search'))),true,'existing sole search remains in the root header');
  assert.equal(await p.locator('#thought-source-scope').isHidden(),true,'superseded Source selector is hidden');assert.equal(await p.locator('#thought-root-source > button').isVisible(),true,'same Add Thought owner');assert.equal(await p.locator('#thought-root-source > .library-actions > summary').isVisible(),true,'same overflow owner');assert.equal(await p.locator('#thought-topic-header').isVisible(),false);assert.equal(await p.locator('#thought-search').count(),1);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth<=2));
  const screenshot=`${directory}/${variant}-${width}-${theme}-production.png`;await p.screenshot({path:screenshot,fullPage:false});
  rows.push({width,theme,production,screenshot});await receipt(failures.length?'FAIL':'PENDING');
 },async finish(){
  assert.deepEqual(rows.map(({width,theme})=>`${width}/${theme}`).sort(),widths.flatMap(width=>['light','dark'].map(theme=>`${width}/${theme}`)).sort(),'each source/release run captures twelve distinct native cells');
  await receipt(failures.length?'FAIL':'PASS');assert.deepEqual(failures,[],'all current Root and retained shared-role comparisons must pass');
 },async close(){}};
}

export async function observeD5ThoughtRootScroll(page){await page.evaluate(async()=>{
 const {TopicController}=await import('./topic-workspace.js'),create=TopicController.prototype.createHomeCollection,restore=TopicController.prototype.restoreHomeAnchor;globalThis.__d5RootScroll=[];
 TopicController.prototype.createHomeCollection=function(...args){globalThis.__d5RootOwner=this;return create.apply(this,args);};
 TopicController.prototype.restoreHomeAnchor=function(anchor){globalThis.__d5RootOwner=this;__d5RootScroll.push({time:performance.now(),scrollY,anchor,restoring:this.homeRestoring});if(__d5RootScroll.length>20)__d5RootScroll.shift();return restore.call(this,anchor);};
});}

// Inspect actual glyph/line rectangles, not only the link's outer box. A clamp
// may retain invisible text fragments in Range.getClientRects(); intersect other
// labels with all effective overflow clips before checking visible collisions.
async function textGeometry(page){return page.evaluate(()=>{
 const rect=r=>({left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.right-r.left,height:r.bottom-r.top});
 const intersect=(a,b)=>{const r={left:Math.max(a.left,b.left),top:Math.max(a.top,b.top),right:Math.min(a.right,b.right),bottom:Math.min(a.bottom,b.bottom)};return r.right>r.left&&r.bottom>r.top?rect(r):null;};
 const visible=node=>node.getClientRects().length>0&&getComputedStyle(node).visibility==='visible';
 const clips=node=>{
  const result=[];
  for(let current=node;current;current=current.parentElement){
   const style=getComputedStyle(current),r=current.getBoundingClientRect(),x=/(hidden|clip|auto|scroll)/.test(style.overflowX),y=/(hidden|clip|auto|scroll)/.test(style.overflowY);
   if(x||y)result.push({left:x?r.left+current.clientLeft:-Infinity,right:x?r.left+current.clientLeft+current.clientWidth:Infinity,top:y?r.top+current.clientTop:-Infinity,bottom:y?r.top+current.clientTop+current.clientHeight:Infinity});
  }
  return result;
 };
 const textRects=node=>{
  const walker=document.createTreeWalker(node,NodeFilter.SHOW_TEXT),out=[];let text;
  while((text=walker.nextNode())){if(!text.textContent.trim())continue;const range=document.createRange();range.selectNodeContents(text);for(const r of range.getClientRects())if(r.width>0&&r.height>0)out.push(rect(r));}
  return out;
 };
 const bands=(rects,size)=>{
  const lines=[];
  for(const r of [...rects].sort((a,b)=>(a.top+a.bottom)-(b.top+b.bottom))){const center=(r.top+r.bottom)/2,last=lines.at(-1);if(last&&Math.abs(last.center-center)<Math.max(3,size*.4)){last.top=Math.min(last.top,r.top);last.bottom=Math.max(last.bottom,r.bottom);}else lines.push({top:r.top,bottom:r.bottom,center});}
  return lines;
 };
 const labels=[...document.querySelectorAll('#thought-root-heading h1,.personal-topic-link,.personal-section-link,.personal-topic-more,#thought-root-source>button,#thought-root-source>.library-actions>summary')].filter(visible).map(node=>{
  const raw=textRects(node),boundaries=clips(node),paintClips=[...boundaries,{left:0,top:0,right:innerWidth,bottom:innerHeight}],painted=raw.map(r=>paintClips.reduce((value,clip)=>value&&intersect(value,clip),r)).filter(Boolean),size=parseFloat(getComputedStyle(node).fontSize);
  return {node,text:node.textContent,kind:node.className||node.tagName,sectionId:node.dataset.sectionId||null,raw,painted,lines:bands(node.classList.contains('personal-section-link')?raw:painted,size),clipped:raw.some(r=>boundaries.some(c=>r.left<c.left-1||r.right>c.right+1||r.top<c.top-1||r.bottom>c.bottom+1))};
 });
 const failures=[];
 for(const label of labels){
  for(let i=1;i<label.lines.length;i++)if(label.lines[i-1].bottom>label.lines[i].top+1)failures.push({kind:'line-overlap',text:label.text,lines:[label.lines[i-1],label.lines[i]]});
  if(label.sectionId&&label.clipped)failures.push({kind:'clipped-Section',sectionId:label.sectionId,text:label.text,raw:label.raw});
 }
 for(let i=0;i<labels.length;i++)for(let j=i+1;j<labels.length;j++){
  if(!labels[i].sectionId&&!labels[j].sectionId)continue;
  const overlap=labels[i].painted.some(a=>labels[j].painted.some(b=>{const r=intersect(a,b);return r&&r.width>1&&r.height>1;}));
  if(overlap)failures.push({kind:'neighbour-label-collision',texts:[labels[i].text,labels[j].text]});
 }
 return {labels:labels.map(({node,...value})=>value),failures};
});}

export async function verifyD5ThoughtRootTextZoom(page,variant){
 await page.setViewportSize({width:320,height:900});
 const snapshots=[],path=`work/qa-dvn-topic-root/${variant}-text200-320`,selectors=['#thought-search','#thought-root-source>.library-actions>summary','#thought-root-source>button'];
 const sample=label=>page.evaluate(({label,selectors})=>{
  const rect=el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom};},owner=globalThis.__d5RootOwner;
  return {label,time:performance.now(),scrollY,viewport:{width:innerWidth,height:innerHeight},overflow:document.documentElement.scrollWidth-innerWidth,owner:owner?{restoring:owner.homeRestoring,shifting:owner.homeWindowShifting,loading:!!owner.homeCollection?.loading,hydrating:!!owner.homeCollection?.hydration}:null,rail:rect(document.querySelector('.sidebar')),header:rect(document.querySelector('.workspace-header')),controls:selectors.map(selector=>{const el=document.querySelector(selector),r=rect(el),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {selector,...r,hit:!!hit&&(hit===el||el.contains(hit)),active:document.activeElement===el};}),trace:globalThis.__d5RootScroll};
 },{label,selectors});
 try{
  await eventually(()=>page.evaluate(()=>!!globalThis.__d5RootOwner&&!!__d5RootOwner.homeCollection&&!__d5RootOwner.homeRestoring&&!__d5RootOwner.homeWindowShifting&&!__d5RootOwner.homeCollection?.loading&&!__d5RootOwner.homeCollection?.hydration),'Root settles before text enlargement');
  snapshots.push(await sample('before zoom'));
  await page.evaluate(()=>{
   // Read every base size first so doubling h2 and its link does not compound.
   globalThis.__d2ZoomRows=[...document.querySelectorAll('#thought-root-heading h1,#thought-home-tools input,#thought-root-source summary,#thought-root-source button,#thought-root-source label,#thought-root-source select,#thought-panel button,#thought-panel strong,#thought-panel span,#thought-panel small,#thought-panel p,#thought-panel label,#thought-panel select,#thought-list h2,#thought-list .personal-topic-link,#thought-list .personal-section-link,#thought-list .personal-topic-more')].map(node=>({node,size:parseFloat(getComputedStyle(node).fontSize),prior:node.style.fontSize}));
   for(const row of __d2ZoomRows)row.node.style.fontSize=(row.size*2)+'px';scrollTo(0,0);
  });
  const enlargement=await page.evaluate(()=>__d2ZoomRows.filter(({node})=>node.matches('#thought-root-heading h1,#thought-list h2,.personal-topic-link,.personal-section-link,.personal-topic-more')).map(({node,size})=>({kind:node.tagName==='H1'?'h1':node.tagName==='H2'?'h2':node.className,before:size,after:parseFloat(getComputedStyle(node).fontSize)})));
  for(const kind of ['h1','h2','personal-topic-link','personal-section-link','personal-topic-more'])assert.ok(enlargement.some(row=>row.kind===kind),kind+' is present in the real 200% fixture');
  for(const row of enlargement)assert.ok(Math.abs(row.after-row.before*2)<.1,row.kind+' really doubles at 320px');snapshots.push({label:'verified 200% text sizes',enlargement});
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)));snapshots.push(await sample('original one-frame capture'));await page.screenshot({path:path+'-initial.png'});assert.ok(snapshots.at(-1).overflow<=2,'200% text at 320px has no page horizontal overflow');
  await eventually(()=>page.evaluate(()=>!!globalThis.__d5RootOwner&&!!__d5RootOwner.homeCollection&&!__d5RootOwner.homeRestoring&&!__d5RootOwner.homeWindowShifting&&!__d5RootOwner.homeCollection?.loading&&!__d5RootOwner.homeCollection?.hydration),'Root restoration finishes before measuring enlarged controls');
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await page.evaluate(()=>scrollTo(0,0));await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const settled=await sample('settled explicit top');snapshots.push(settled);await page.screenshot({path:path+'.png'});snapshots.push({label:'settled Range text geometry',...await textGeometry(page)});assert.ok(settled.overflow<=2,'200% text at 320px has no page horizontal overflow');assert.ok(settled.scrollY<=2,'explicit top remains at top after pending restoration');assert.ok(settled.header.y>=settled.rail.bottom-2,'enlarged header is below the compact rail');
  for(const control of settled.controls){assert.ok(control.width>0&&control.height>=44,'enlarged control has a usable target: '+control.selector);assert.ok(control.y>=settled.rail.bottom-2&&control.bottom<=settled.viewport.height,'enlarged control remains inside the usable viewport: '+control.selector);assert.equal(control.hit,true,'enlarged control is not covered: '+control.selector);}
  assert.equal(await page.locator('#thought-source-scope').isHidden(),true,'hidden Source control is excluded from native Tab order');
  await page.locator(selectors[0]).click();assert.equal(await page.locator(selectors[0]).evaluate(el=>document.activeElement===el),true,'actual pointer reaches enlarged search');
  for(const selector of selectors.slice(1)){await page.keyboard.press('Tab');assert.equal(await page.locator(selector).evaluate(el=>document.activeElement===el),true,'native Tab reaches enlarged header control: '+selector);}
  const links=page.locator('article.personal-topic-block').first().locator('a:not([hidden])'),count=await links.count();assert.ok(count>=3,'real Topic, wrapped Section and continuation links remain reachable');
  for(let i=0;i<count;i++){
   const link=links.nth(i);await page.keyboard.press('Tab');assert.equal(await link.evaluate(el=>document.activeElement===el),true,'native Tab reaches each visible Root link');
   await link.scrollIntoViewIfNeeded();const hit=await link.evaluate(el=>{const r=el.getBoundingClientRect(),target=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {height:r.height,width:r.width,hit:!!target&&(target===el||el.contains(target)),focus:getComputedStyle(el).outlineStyle};});
   assert.ok(hit.height>=44&&hit.width>=44,'enlarged Topic/Section/continuation has a 44px target');assert.equal(hit.hit,true,'enlarged Root link is hit-testable');assert.notEqual(hit.focus,'none','native keyboard focus stays visible');
  }
  snapshots.push(await sample('pointer and native Tab'));
  const geometry=await textGeometry(page);snapshots.push({label:'actual Range text geometry',...geometry});await page.screenshot({path:path+'-labels.png'});
  assert.ok(geometry.labels.some(label=>label.sectionId&&/中文 Mixed 👩🏽‍💻 é/.test(label.text)&&label.lines.length>=2),'the real mixed-script Section fixture actually wraps at 200%');
  assert.deepEqual(geometry.failures,[],'enlarged text has no line overlap, clipped Section label or painted-neighbour collision');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth<=2),'200% text remains within 320px after native focus scrolling');
 }finally{
  snapshots.push(await sample('final'));await writeFile(path+'.json',JSON.stringify({head:process.env.PAIA_TESTED_HEAD,variant,authority,snapshots},null,2));
  await page.evaluate(()=>{for(const row of globalThis.__d2ZoomRows||[])row.node.style.fontSize=row.prior;delete globalThis.__d2ZoomRows;});
 }
}

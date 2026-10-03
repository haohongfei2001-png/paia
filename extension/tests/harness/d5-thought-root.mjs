import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {openD5Reference} from './d5-shell-reference.mjs';
const directory='work/qa-dvn-topic-root/d5';
async function measure(page,reference){return page.evaluate(reference=>{
 const selectors=reference?{header:'.topbar',body:'.workspace.context',heading:'.workspace h1',list:'.topic-row',row:'.topic-row',title:'.topic-row h2',cue:'.topic-row p',caption:'.topic-row time',search:'.scope input',searchIcon:'.scope>span'}:{header:'.workspace-header',body:'#thought-panel',heading:'#thought-root-heading h1',list:'#thought-list',row:'.topic-compact-row>.topic-index-row',title:'.topic-compact-row strong',cue:'.topic-compact-row .summary',caption:'.topic-compact-row small',search:'#thought-search',searchIcon:'.thought-search-icon'};
 const metrics=Object.fromEntries(Object.entries(selectors).map(([key,selector])=>{const node=document.querySelector(selector),r=node.getBoundingClientRect(),c=getComputedStyle(node);return [key,{x:r.x,y:r.y,width:r.width,height:r.height,paddingTop:c.paddingTop,paddingLeft:c.paddingLeft,paddingRight:c.paddingRight,fontSize:c.fontSize,lineHeight:c.lineHeight,fontWeight:c.fontWeight,fontFamily:c.fontFamily,fontSynthesis:c.fontSynthesis,color:c.color,background:c.backgroundColor,borderRadius:c.borderRadius,overflow:node.scrollWidth-node.clientWidth}];}));
 if(!reference){const label=document.getElementById('thought-source-scope-label'),range=document.createRange();range.selectNode(label.firstChild);metrics.sourceLabel={text:label.firstChild.textContent,lines:range.getClientRects().length,whiteSpace:getComputedStyle(label).whiteSpace};}
 return metrics;
 },reference);}
export async function openD5ThoughtRoot(h,variant){
 const ref=await openD5Reference(h,'topics-root'),rows=[],failures=[],p=h.archive;
 await mkdir(directory,{recursive:true});
 return {async capture(width,theme){
  await ref.setViewportSize({width,height:900});await ref.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
  const production=await measure(p,false),reference=await measure(ref,true),label=`${variant}/${width}/${theme}`;
  const exact=(a,b,name)=>{if(a!==b)failures.push(`${label} ${name}: ${a} != ${b}`);},near=(a,b,name)=>{if(Math.abs(a-b)>2)failures.push(`${label} ${name}: ${a} != ${b}`);};
  for(const key of ['x','width'])near(production.header[key],reference.header[key],'header.'+key);
  for(const key of ['x','width'])near(production.body[key],reference.body[key],'body.'+key);
  for(const key of ['paddingTop','paddingLeft','paddingRight'])exact(production.body[key],reference.body[key],'body.'+key);
  const contextWidth=Math.min(880,production.body.width-parseFloat(production.body.paddingLeft)-parseFloat(production.body.paddingRight));near(production.list.width,contextWidth,'explicit880px context cap');near(production.list.x,production.body.x+(production.body.width-contextWidth)/2,'centered context column');near(production.heading.x,production.list.x,'heading aligns with actual context column');if(reference.list.width<=880)for(const key of ['x','width'])near(production.list[key],reference.list[key],'list.'+key);
  for(const target of ['heading','title','cue','caption'])for(const key of ['fontSize','lineHeight','color'])exact(production[target][key],reference[target][key],target+'.'+key);
  for(const target of ['heading','title'])assert.ok(production[target].fontSynthesis.split(' ').includes('weight'),label+' '+target+' permits the declared CJK weight');exact(production.sourceLabel.lines,1,'product Source label stays on one line');
  exact(production.heading.fontWeight,reference.heading.fontWeight,'heading weight');exact(production.title.fontWeight,reference.title.fontWeight,'Topic-row heading weight');exact(production.row.paddingTop,reference.row.paddingTop,'row padding');exact(production.search.background,reference.search.background,'search surface');
  if(width>=1024){for(const target of ['search','searchIcon'])for(const key of ['x','width'])near(production[target][key],reference[target][key],target+'.'+key);near(production.search.x-production.searchIcon.x-production.searchIcon.width,8,'search icon gap');near(production.header.height,reference.header.height,'header height');near(production.heading.y,reference.heading.y,'heading y');}
  assert.equal(await p.locator('.thought-search-icon').textContent(),'⌕');assert.equal(await p.locator('.thought-search-icon').getAttribute('aria-hidden'),'true');
  assert.equal(await p.evaluate(()=>document.querySelector('#thought-root-header').contains(document.querySelector('#thought-search'))),true,'existing sole search is in the root header');
  assert.equal(await p.locator('#thought-root-source #thought-source-scope').isVisible(),true,'existing source scope remains in the root body');assert.equal(await p.locator('#thought-topic-header').isVisible(),false);assert.equal(await p.locator('#thought-search').count(),1);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth<=2));
  const stem=`${directory}/${variant}-${width}-${theme}`;await p.screenshot({path:stem+'-production.png',fullPage:false});await ref.screenshot({path:stem+'-reference.png',fullPage:false});
  rows.push({width,theme,production,reference});await writeFile(`${directory}/${variant}-root.json`,JSON.stringify({head:process.env.PAIA_TESTED_HEAD,variant,result:failures.length?'FAIL':'PENDING',rows,failures,scope:'Fixed root composition and style; declared context cap is880px. The1280px specimen container has896px inner space after24px padding; both measurements are retained. Real cue attribution/time and compact navigation remain truthful.'},null,2));
 },async finish(){assert.deepEqual(failures,[],'all observed fixed Thought-root comparisons must pass');await writeFile(`${directory}/${variant}-root.json`,JSON.stringify({head:process.env.PAIA_TESTED_HEAD,variant,result:'PASS',rows,failures},null,2));},async close(){await ref.close();}};
}

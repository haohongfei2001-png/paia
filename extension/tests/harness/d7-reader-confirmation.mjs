// Bounded presentation evidence inside the original removal/purge owner cases.
// The approved SVG stays an offline reference, never a runtime replacement.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {eventually} from './fake-chatgpt.mjs';
import {openD7Reference} from './d7-archive-reference.mjs';

const frame=page=>page.evaluate(async()=>{await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
const near=(actual,expected,label)=>assert.ok(Number.isFinite(actual)&&Math.abs(actual-expected)<=1,`${label}: ${actual} versus ${expected}`);
const selector=surface=>`.reader-confirm[data-confirm-surface="${surface}"][open]`;
const matrix=[
 {id:'1440-light',width:1440,theme:'light'},
 {id:'1440-dark',width:1440,theme:'dark'},
 {id:'320-dark',width:320,theme:'dark'},
 {id:'320-text200',width:320,theme:'dark',text200:true},
 {id:'1440-coarse',width:1440,theme:'light',coarse:true},
 {id:'320-long-copy',width:320,theme:'dark',longCopy:true}
];
async function measure(dialog){return dialog.evaluate(node=>{
 const read=el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el),at=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height,scrollWidth:el.scrollWidth,clientWidth:el.clientWidth,scrollHeight:el.scrollHeight,clientHeight:el.clientHeight,scrollTop:el.scrollTop,text:el.textContent,hit:at===el||el.contains(at),...Object.fromEntries(['padding','borderWidth','borderRadius','backgroundColor','color','fontSize','lineHeight','fontWeight','fontFamily','boxShadow','overflowY','gap','borderTopWidth','borderTopColor','paddingTop','marginTop'].map(key=>[key,s[key]]))};};
 return {surface:read(node),heading:read(node.querySelector('h2')),content:read(node.querySelector('.reader-confirm-content')),actions:read(node.querySelector('.reader-confirm-actions')),buttons:[...node.querySelectorAll('.reader-confirm-actions>button')].map(read),coarse:matchMedia('(pointer:coarse)').matches,theme:document.documentElement.dataset.paiaTheme,viewport:{width:innerWidth,height:innerHeight},pageOverflow:document.documentElement.scrollWidth-innerWidth};
});}
async function bodyEdge(dialog,edge){return dialog.evaluate((node,edge)=>{
 const content=node.querySelector('.reader-confirm-content');content.scrollTop=edge==='first'?0:content.scrollHeight;
 const walker=document.createTreeWalker(content,NodeFilter.SHOW_TEXT),texts=[];let text;while((text=walker.nextNode()))if(text.data.trim())texts.push(text);
 const target=edge==='first'?texts[0]:texts.at(-1),offset=edge==='first'?target.data.search(/\S/):target.data.trimEnd().length-1,range=document.createRange();range.setStart(target,offset);range.setEnd(target,offset+1);
 const r=range.getBoundingClientRect(),c=content.getBoundingClientRect(),footer=node.querySelector('.reader-confirm-actions').getBoundingClientRect(),at=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
 return {edge,text:range.toString(),x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height,content:{x:c.x,y:c.y,right:c.right,bottom:c.bottom,scrollTop:content.scrollTop,scrollHeight:content.scrollHeight,clientHeight:content.clientHeight},footerY:footer.y,footerBottom:footer.bottom,dialogScrollTop:node.scrollTop,hit:at===target.parentElement||target.parentElement.contains(at)};
 },edge);}
function checkEdge(row){assert.ok(row.text&&row.width>0&&row.height>0&&row.hit,`${row.edge} real body glyph is hit-testable`);assert.ok(row.x>=row.content.x-1&&row.right<=row.content.right+1&&row.y>=row.content.y-1&&row.bottom<=row.content.bottom+1,`${row.edge} glyph lies inside the scrolling body`);assert.equal(row.dialogScrollTop,0,'the dialog itself never scrolls');}
async function restoreStress(dialog){await dialog.evaluate(node=>{
 const state=node.__confirmationEvidence;if(!state)return;
 if(state.longText){state.longText.node.data=state.longText.prior;delete state.longText;}
 for(const {node:el,style}of state.scaled||[]){if(style===null)el.removeAttribute('style');else el.setAttribute('style',style);}delete state.scaled;
 node.querySelector('.reader-confirm-content').scrollTop=0;
 });}

export async function auditReaderConfirmation(h,{variant,surface}){
 assert.ok(['removal','purge-blocked'].includes(surface));const page=h.archive,dialog=page.locator(selector(surface)),screen=surface==='removal'?'A11':'A12',directory=`work/qa-dvn-${surface==='removal'?'removal':'purge'}/reader-confirmation`,refs=[];
 await mkdir(directory,{recursive:true});const headSha=process.env.PAIA_TESTED_HEAD||execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),originalViewport=page.viewportSize(),originalMedia=await page.evaluate(()=>({colorScheme:matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light',reducedMotion:matchMedia('(prefers-reduced-motion:reduce)').matches?'reduce':'no-preference'}));
 const receipt={result:'PENDING',headSha,variant,surface,screen,rows:[],references:[],originalOwnerCase:'PENDING',qualifications:['A11/A12 each have only an unchanged 1440×1000 light SVG; dark is an approved palette derivative. Compact and enlarged-text production use RESPONSIVE, not an invented compact drawing.','Actual complete target, wording, existing Cancel/confirmation controls and runtime content height remain authoritative. The illustrative master wording and A12 Return label are not substituted.','200% is text-only enlargement of existing DOM, not browser zoom. Long-copy stress changes only a temporary presentation text node and restores it exactly.','Historical before pixels are available for A11 only. No A12 before-pixel claim is made.']};
 const persist=()=>writeFile(`${directory}/${variant}-${screen}-receipt.json`,JSON.stringify(receipt,null,2));
 const finish=async(error=null)=>{receipt.originalOwnerCase=error?'FAIL':'PASS';receipt.result=error?'FAIL':'PASS';if(error){receipt.ownerError=String(error.stack||error);await page.screenshot({path:`${directory}/${variant}-${screen}-owner-failure.png`,fullPage:false,animations:'disabled',timeout:5000}).catch(()=>{});}receipt.network={externalRequests:h.externalRequests,extensionNetworkRequests:h.extensionNetworkRequests,providerRequests:h.deepSeekRequests.length,pageErrors:[...h.errors]};await persist();};
 let cdp;
 try{
  await dialog.waitFor();await dialog.evaluate(node=>node.__confirmationEvidence={nodes:[node,...node.querySelectorAll('*')].map(el=>({el,parent:el.parentElement,style:el.getAttribute('style')})),text:node.textContent,target:node.getAttribute('data-removal-target')});
  for(const theme of ['light','dark']){
   const reference=await openD7Reference(h,{screen,width:1440,theme});refs.push(reference.page);
   const master=await reference.page.evaluate(()=>{const card=document.querySelector('svg>rect[width="700"][height="352"][rx="10"]'),title=card?.nextElementSibling;if(!card||title?.tagName!=='text')throw Error('Unchanged A11/A12 card and heading are required');return {width:Number(card.getAttribute('width')),padding:Number(title.getAttribute('x'))-Number(card.getAttribute('x')),radius:Number(card.getAttribute('rx')),headingSize:Number(title.getAttribute('font-size')),headingWeight:title.getAttribute('font-weight'),headingFamily:title.getAttribute('font-family')};});
   assert.deepEqual(master,{width:700,padding:32,radius:10,headingSize:23,headingWeight:'500',headingFamily:'Georgia, Noto Serif CJK SC, serif'});
   const file=`${variant}-${screen}-1440-${theme}-reference.png`;await reference.page.screenshot({path:`${directory}/${file}`,fullPage:false,animations:'disabled'});
   receipt.references.push({file,name:reference.name,sha256:reference.sha256,theme,master,width:1440,height:1000,comparison:reference.paletteDerived?'APPROVED_PALETTE_DERIVATIVE':'CANONICAL_ORIGINAL',originalUnchanged:true});
  }
  await page.bringToFront();cdp=await h.context.newCDPSession(page);
  for(const spec of matrix){
   const row={...spec,height:1000,status:'PENDING',reference:receipt.references.find(ref=>ref.theme===spec.theme).file,comparison:spec.longCopy||spec.text200||spec.coarse?'REACHABILITY_STRESS':spec.width<1440?'RESPONSIVE_RULE_DERIVATIVE':spec.theme==='dark'?'APPROVED_PALETTE_DERIVATIVE':'CANONICAL_GEOMETRY'};receipt.rows.push(row);await persist();
   try{
    await page.setViewportSize({width:spec.width,height:row.height});await page.emulateMedia({colorScheme:spec.theme,reducedMotion:'reduce'});await eventually(()=>page.evaluate(theme=>document.documentElement.dataset.paiaTheme===theme,spec.theme),'the existing system appearance listener applies the emulated theme');
    await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:!!spec.coarse,...(spec.coarse?{maxTouchPoints:1}:{})});await eventually(()=>page.evaluate(coarse=>matchMedia('(pointer:coarse)').matches===coarse,!!spec.coarse),'native coarse-pointer media has settled');await frame(page);
    if(spec.text200)row.scaling=await dialog.evaluate(node=>{
     // Cache every computed size before any write: descendants must not inherit
     // an already doubled ancestor and accidentally receive 400% text.
     const scaled=[...node.querySelectorAll('h2,.reader-confirm-content,.reader-confirm-content *,.reader-confirm-actions>button')].map(el=>({node:el,style:el.getAttribute('style'),fontSize:parseFloat(getComputedStyle(el).fontSize)}));node.__confirmationEvidence.scaled=scaled;
     for(const row of scaled)row.node.style.setProperty('font-size',`${row.fontSize*2}px`,'important');
     return scaled.map(row=>({index:node.__confirmationEvidence.nodes.findIndex(saved=>saved.el===row.node),tag:row.node.tagName,before:row.fontSize,after:parseFloat(getComputedStyle(row.node).fontSize),styleBeforeStress:row.style,styleDuringStress:row.node.getAttribute('style')}));
    });
    if(spec.longCopy)await dialog.evaluate(node=>{const text=node.querySelector('.reader-confirm-content>p').firstChild;node.__confirmationEvidence.longText={node:text,prior:text.data};text.data+=' '+('SYNTHETIC presentation-only long explanation 中文 '+ 'UnbrokenBoundary'.repeat(8)+' ').repeat(12)+' END';});
    await frame(page);row.actual=await measure(dialog);row.capture=`${variant}-${screen}-${spec.id}-production.png`;await page.screenshot({path:`${directory}/${row.capture}`,fullPage:false,animations:'disabled'});await persist();
    const {surface:card,heading,content,actions,buttons}=row.actual,dark=spec.theme==='dark';near(card.width,Math.min(700,spec.width-32),'approved width');near(card.x,(spec.width-card.width)/2,'centered modal');assert.ok(card.y>=23&&card.bottom<=row.height-23&&card.height<=row.height-48,'viewport-minus48 height reserve');assert.ok(card.scrollWidth-card.clientWidth<=2&&card.scrollHeight-card.clientHeight<=2&&row.actual.pageOverflow<=2,'no horizontal page/dialog overflow or outer-dialog scrolling');assert.equal(card.padding,spec.width<768?'20px':'32px');assert.equal(card.borderWidth,'1px');assert.equal(card.borderRadius,'10px');assert.equal(card.backgroundColor,dark?'rgb(23, 29, 40)':'rgb(255, 255, 255)');assert.equal(card.color,dark?'rgb(232, 237, 247)':'rgb(23, 35, 60)');assert.equal(card.boxShadow,'rgba(23, 35, 60, 0.18) 0px 18px 60px 0px');assert.equal(card.overflowY,'hidden');
    near(parseFloat(heading.fontSize),spec.text200?46:23,'serif heading size');near(parseFloat(heading.lineHeight),spec.text200?64:32,'serif heading leading');assert.equal(heading.fontWeight,'500');assert.match(heading.fontFamily,/Georgia.*Noto Serif CJK SC.*serif/);assert.ok(heading.scrollWidth<=heading.clientWidth+2&&heading.scrollHeight<=heading.clientHeight+2);assert.ok(content.height>0&&content.y>=heading.bottom&&content.bottom<=actions.y,'heading, scrolling body and fixed footer remain separate');assert.equal(content.overflowY,'auto');assert.equal(actions.gap,'12px');assert.equal(actions.borderTopWidth,'1px');assert.equal(actions.paddingTop,'18px');assert.equal(buttons.length,2,'same Cancel and existing action');assert.match(buttons[0].text,/^(取消|Cancel)$/);if(surface==='purge-blocked')assert.match(buttons[1].text,/^(关闭|Close)$/);
    for(const button of buttons)assert.ok(button.hit&&button.width>=44&&button.height>=(spec.width<768||spec.coarse?44:36)&&button.x>=card.x&&button.right<=card.right&&button.bottom<=row.height-23,'every full action hit target is visible and reachable');
    for(const scale of row.scaling||[])near(scale.after,scale.before*2,'actual 200% text');
    row.body=[];for(const edge of ['first','last']){const actual=await bodyEdge(dialog,edge);row.body.push(actual);await persist();checkEdge(actual);}near(row.body[0].footerY,row.body[1].footerY,'body scroll never moves footer');near(row.body[0].footerBottom,row.body[1].footerBottom,'footer stays fixed');if(spec.longCopy)assert.ok(row.body[1].content.scrollTop>0,'long text exercises real inner scrolling');
    if(spec.text200||spec.longCopy){row.bottomCapture=`${variant}-${screen}-${spec.id}-body-end.png`;await page.screenshot({path:`${directory}/${row.bottomCapture}`,fullPage:false,animations:'disabled'});}
    const controls=dialog.locator('.reader-confirm-actions>button');await controls.first().focus();await page.keyboard.press('Tab');assert.equal(await controls.nth(1).evaluate(node=>node===document.activeElement),true,'Tab reaches the existing second action');await page.keyboard.press('Shift+Tab');assert.equal(await controls.first().evaluate(node=>node===document.activeElement),true,'Shift+Tab returns to Cancel');
    row.status='PASS';
   }catch(error){row.status='FAIL';row.error=String(error.stack||error);await page.screenshot({path:`${directory}/${variant}-${screen}-${spec.id}-failure.png`,fullPage:false,animations:'disabled',timeout:5000}).catch(()=>{});throw error;}
   finally{await restoreStress(dialog);await persist();}
   row.restoration=await dialog.evaluate(node=>{const state=node.__confirmationEvidence,current=[node,...node.querySelectorAll('*')],describe=el=>el?{tag:el.tagName,id:el.id,className:el.className}:null,nodes=state.nodes.map(({el,parent,style},index)=>({index,...describe(el),connected:el.isConnected,insideOriginalDialog:el===node||node.contains(el),samePosition:current[index]===el,sameParent:parent===el.parentElement,beforeParent:describe(parent),afterParent:describe(el.parentElement),beforeStyle:style,afterStyle:el.getAttribute('style')})),text={before:state.text,after:node.textContent},target={before:state.target,after:node.getAttribute('data-removal-target')},checks={connected:nodes.every(el=>el.connected),styles:nodes.every(el=>el.beforeStyle===el.afterStyle),text:text.before===text.after,target:target.before===target.after};return {nodes,text,target,checks,currentNodeCount:current.length,originalNodeCount:state.nodes.length,preserved:checks.connected&&checks.styles&&checks.text&&checks.target};});await persist();
   assert.equal(row.restoration.preserved,true,'presentation preserves every owner node, exact inline style, original label, text and target');
  }
  assert.deepEqual(receipt.rows.map(row=>row.id),matrix.map(row=>row.id));assert.ok(receipt.rows.every(row=>row.status==='PASS'));assert.equal(h.externalRequests,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.deepSeekRequests.length,0);assert.deepEqual(h.errors,[]);receipt.result='PRESENTATION_PASS_OWNER_PENDING';await persist();return {finish};
 }catch(error){receipt.result='FAIL';receipt.error=String(error.stack||error);await page.screenshot({path:`${directory}/${variant}-${screen}-failure.png`,fullPage:false,animations:'disabled',timeout:5000}).catch(()=>{});await persist();throw error;}
 finally{
  if(cdp){await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});await cdp.detach();}
  for(const ref of refs)await ref.close();await page.bringToFront();await page.emulateMedia(originalMedia);await eventually(()=>page.evaluate(theme=>document.documentElement.dataset.paiaTheme===theme,originalMedia.colorScheme),'original emulated appearance is restored');await page.setViewportSize(originalViewport||{width:1440,height:800});await frame(page);
 }
}

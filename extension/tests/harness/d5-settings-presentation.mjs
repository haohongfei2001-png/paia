import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';

import {eventually} from './fake-chatgpt.mjs';

export const SETTINGS_BASE='96832cd7e07db7f9946648c0079d1c49e2dfd6cc';
const directory='work/qa-dvn-settings',groups=['content','reading','ai','privacy','data','advanced'];
// Current D7 actual-master reference. The exact historical baseline below is unchanged.
async function renderSettingsReference(page,group,theme){
 const artboard=group==='content'?'S03':group==='data'?'S04':'S01',name=`${artboard}-1440-light.svg`,palette={'#FFFFFF':'#171D28','#FAFBFD':'#121823','#17233C':'#E8EDF7','#63728A':'#B0BDD0','#68778E':'#A5B4CB','#E6EBF2':'#303B4C','#F4F6FA':'#202939','#EAF1FF':'#263B5B','#235DD3':'#94BAFF'},original=await readFile(new URL(`../../docs/consumer-product-v1/desktop-vnext/d6-final-visual-master/screens/${name}`,import.meta.url),'utf8'),svg=theme==='dark'?original.replace(/#[0-9a-f]{6}/gi,color=>palette[color.toUpperCase()]||color):original;
 await page.setViewportSize({width:1440,height:1000});await page.setContent('<style>body{margin:0}img{display:block}</style><img alt="Approved D6.2 '+artboard+' reference" src="data:image/svg+xml;base64,'+Buffer.from(svg).toString('base64')+'">');await page.locator('img').evaluate(node=>node.decode());
 return {artboard,name,paletteDerived:theme==='dark',comparison:'Approved 1440px shell/reference; ordinary six groups, real controls and responsive-rule derivatives remain distinct from the system standalone drawings.',heading:{fontSize:'28px',lineHeight:'38px',fontWeight:'500'},section:{fontSize:'22px',lineHeight:'32px',fontWeight:'500'},tokens:{focus:theme==='dark'?'rgb(148, 186, 255)':'rgb(35, 93, 211)'}};
}

const rpc=async(page,type,fields={})=>{const value=await page.evaluate(message=>chrome.runtime.sendMessage(message),{type,...fields});assert.equal(value.ok,true,JSON.stringify(value));return value.data;};
const frame=page=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
const head=()=>process.env.PAIA_TESTED_HEAD||execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
export async function chooseSettingsGroup(page,group){const select=page.locator('#ux-settings-group-switch');if(await select.isVisible())await select.selectOption(group);else await page.locator(`[data-settings-group="${group}"]`).click();await page.locator(`[data-group="${group}"]`).waitFor({state:'visible'});}
async function touchSettingsGroup(page,cdp,group){
 const button=page.locator(`[data-settings-group="${group}"]`);await button.scrollIntoViewIfNeeded();await frame(page);
 const point=await button.evaluate(node=>{const r=node.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2,hit=document.elementFromPoint(x,y);return{x,y,width:r.width,height:r.height,hit:hit===node||node.contains(hit),disabled:node.disabled};});assert.ok(point.hit&&!point.disabled&&point.width>=44&&point.height>=44,'coarse group center is reachable');
 await page.evaluate(group=>{globalThis.__d5SettingsTouchEvents=[];globalThis.__d5SettingsTouchObserver=event=>{const button=event.target.closest?.('[data-settings-group]');if(button?.dataset.settingsGroup===group)__d5SettingsTouchEvents.push({type:event.type,trusted:event.isTrusted,pointerType:event.pointerType,group:button.dataset.settingsGroup});};for(const type of ['pointerdown','pointerup','click'])document.addEventListener(type,__d5SettingsTouchObserver,true);},group);
 try{await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:point.x,y:point.y,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await eventually(async()=>await button.getAttribute('aria-current')==='page'&&await page.locator(`[data-group="${group}"]`).isVisible());const events=await page.evaluate(()=>__d5SettingsTouchEvents);assert.deepEqual(events.map(event=>event.type),['pointerdown','pointerup','click'],'one native touch activation');for(const event of events){assert.equal(event.trusted,true);assert.equal(event.pointerType,'touch');assert.equal(event.group,group);}return{group,point,events};}
 finally{await page.evaluate(()=>{for(const type of ['pointerdown','pointerup','click'])document.removeEventListener(type,__d5SettingsTouchObserver,true);delete globalThis.__d5SettingsTouchObserver;delete globalThis.__d5SettingsTouchEvents;});}
}
async function touchSettingsLabel(page,cdp,selector,expected){
 const input=page.locator(selector);await input.scrollIntoViewIfNeeded();await frame(page);
 const before=await input.evaluate(node=>{const label=node.labels?.[0],r=label?.getBoundingClientRect(),glyph=node.getBoundingClientRect();if(!r)return null;const points=[[r.x+8,r.y+8],[r.right-8,r.bottom-8],[r.x+r.width/2,r.y+r.height/2]],point=points.map(([x,y])=>({x,y})).find(({x,y})=>{const hit=document.elementFromPoint(x,y);return !(x>=glyph.x&&x<=glyph.right&&y>=glyph.y&&y<=glyph.bottom)&&(hit===label||label.contains(hit));});return{point,width:r.width,height:r.height,associated:label.control===node,glyph:{width:glyph.width,height:glyph.height},checked:node.checked,disabled:node.disabled};});assert.ok(before?.associated&&before.point&&before.width>=44&&before.height>=44,'existing associated label has a reachable44px target outside the glyph');assert.equal(before.glyph.width,16);assert.equal(before.glyph.height,16);
 await input.evaluate(node=>{globalThis.__d5SettingsLabelChanges=[];globalThis.__d5SettingsLabelObserver=event=>__d5SettingsLabelChanges.push({type:event.type,trusted:event.isTrusted,checked:node.checked});node.addEventListener('change',__d5SettingsLabelObserver);});
 try{await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...before.point,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await frame(page);await eventually(async()=>await input.isChecked()===expected);assert.equal(await input.isChecked(),expected);const changes=await page.evaluate(()=>__d5SettingsLabelChanges);assert.deepEqual(changes,before.disabled?[]:[{type:'change',trusted:true,checked:expected}]);return{selector,before,checked:expected,changes};}
 finally{await input.evaluate(node=>{node.removeEventListener('change',__d5SettingsLabelObserver);delete globalThis.__d5SettingsLabelObserver;delete globalThis.__d5SettingsLabelChanges;});}
}
export async function measureSettingsGeometry(page){return page.evaluate(()=>{const nav=document.querySelector('.ux-settings-nav').getBoundingClientRect(),body=document.querySelector('.ux-settings-body').getBoundingClientRect();return {nav:nav.width,body:body.width,navX:nav.x,bodyX:body.x,gap:body.y-nav.bottom,horizontalGap:body.x-nav.right};});}
async function measure(page,reference=false,group='content'){return page.evaluate(({reference,group})=>{
 const read=node=>{if(!node)return null;const r=node.getBoundingClientRect(),s=getComputedStyle(node);return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom,...Object.fromEntries(['fontSize','lineHeight','fontWeight','color','backgroundColor','borderBottomWidth','borderBottomColor','borderRadius','boxShadow','paddingTop','paddingBottom','paddingLeft','paddingRight','position','whiteSpace'].map(key=>[key,s[key]]))};};
 const tokens={};for(const key of ['text','muted','line','brand','control']){const probe=document.createElement('span');probe.style.color=`var(--${key})`;document.body.append(probe);tokens[key]=getComputedStyle(probe).color;probe.remove();}
 const visible=node=>node&&node.getBoundingClientRect().width&&node.getBoundingClientRect().height;
 const nav=document.querySelector('.ux-settings-nav'),body=document.querySelector('.ux-settings-body'),shell=document.querySelector(reference?'.workspace':'#ux-settings-shell'),index=['content','reading','ai','privacy','data','advanced'].indexOf(group),section=reference?document.querySelectorAll('.workspace h2')[index]:document.querySelector(`[data-group="${group}"]>h2`);
 const toggles=reference?[]:[...document.querySelectorAll('.ux-settings-group:not([hidden]) input:is([type=checkbox],[type=radio])')].filter(visible).map(node=>({glyph:read(node),label:read(node.labels?.[0]),associated:node.labels?.[0]?.control===node}));
 return {toggles,shell:read(shell),heading:read(document.querySelector(reference?'.workspace h1':'#ux-settings-title')),section:read(section),nav:read(nav),body:read(body),tokens,buttons:reference?[]:[...nav.querySelectorAll('[data-settings-group]')].filter(visible).map(node=>({key:node.dataset.settingsGroup,current:node.getAttribute('aria-current'),...read(node)})),mobile:read(document.querySelector('#ux-settings-group-switch')),overflow:document.documentElement.scrollWidth-innerWidth,viewport:{width:innerWidth,height:innerHeight}};
},{reference,group});}

export async function materializeSettingsBaseline(){
 const path=resolve('work/d5-settings-baseline'),archive=resolve('work/d5-settings-baseline.tar');await mkdir(path,{recursive:true});
 execFileSync('git',['archive','--format=tar','--output='+archive,SETTINGS_BASE,'extension'],{cwd:resolve('..')});const members=execFileSync('tar',['-tf',archive],{encoding:'utf8',maxBuffer:8*1024*1024}).trim().split('\n');for(const member of members)assert.ok(member.startsWith('extension/')&&!member.split('/').includes('..'));
 execFileSync('tar',['-xf',archive,'--strip-components=1','-C',path]);return path;
}
export async function captureSettingsBaseline(h){
 await mkdir(directory,{recursive:true});const page=h.archive,rows=[],persist=(result,error)=>writeFile(`${directory}/baseline.json`,JSON.stringify({result,error,head:head(),baselineHead:SETTINGS_BASE,rows,scope:'Actual adopted source extension before S01 geometry replacement; original 180/840/32 assertions retained here.'},null,2));
 try{await persist('PENDING');for(const group of groups){await chooseSettingsGroup(page,group);await page.evaluate(()=>scrollTo(0,0));const actual=await measure(page,false,group),geometry=await measureSettingsGeometry(page);rows.push({group,width:1440,theme:'light',actual,geometry});await persist('PENDING');await page.screenshot({path:`${directory}/baseline-${group}-1440-light.png`,fullPage:true,animations:'disabled'});assert.ok(geometry.nav>=179&&geometry.nav<=181);assert.ok(geometry.body>=830&&geometry.body<=842);assert.ok(geometry.horizontalGap>=31&&geometry.horizontalGap<=33);}await persist('PASS');}catch(error){await persist('FAIL',error.message);throw error;}
}

// SETTINGS-CV2 replaces only the current production presentation oracle.
// Exact historical baseline capture above remains unchanged.
export {compareConsumerSettings as compareD5Settings} from './settings-consumer-presentation.mjs';

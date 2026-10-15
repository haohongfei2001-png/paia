import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,rm,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {FakeChatGPT} from './fake-chatgpt.mjs';

// Independently transcribed from approved Context HTML ae103313b9d48ee77631b043360a4a3a7c5ce3011d45ff698f652d84030b46ae:
// .drawer and .drawer-head/content/bottom; <=760 and <=530 overrides.
// These literals are never extracted from production CSS or a measured screenshot.
const scenes=[
 {width:1440,drawer:530,head:[27,29,20,29],content:[26,31,34,31],foot:[17,29,22,29]},
 {width:761,drawer:530,head:[27,29,20,29],content:[26,31,34,31],foot:[17,29,22,29]},
 {width:760,drawer:460,head:[21,24,16,24],content:[23,25,29,25],foot:[15,24,20,24]},
 {width:531,drawer:460,head:[21,24,16,24],content:[23,25,29,25],foot:[15,24,20,24]},
 {width:530,drawer:530,head:[19,20,16,20],content:[21,21,21,21],foot:[14,20,21,20]},
 {width:320,drawer:320,head:[19,20,16,20],content:[21,21,21,21],foot:[14,20,21,20]}
];
export function registerContextDrawerGeometryTests(){
for(const variant of ['source','release'])test('Context actual opened native drawers obey original geometry '+variant,{timeout:180000},async t=>{
 const releaseDir=variant==='release'?await mkdtemp(join(tmpdir(),'paia-drawer-native-')):null;
 if(releaseDir){t.after(()=>rm(releaseDir,{recursive:true,force:true}));execFileSync('python3',['scripts/build_current_release.py',releaseDir],{stdio:'pipe'});}
 const h=await FakeChatGPT.start({extensionPath:releaseDir||resolve('.'),headless:true}),p=h.archive;t.after(()=>h.close());
 const dir=`work/context-drawer-geometry/${variant}`;await mkdir(dir,{recursive:true});const observations=[];
 for(const theme of ['light','dark'])for(const scene of scenes)for(const owner of ['scope','basis','topic']){
  await p.setViewportSize({width:scene.width,height:900});
  await p.evaluate(async({theme,owner})=>{
   document.documentElement.setAttribute('data-paia-theme',theme);
   const trigger=document.createElement('button');trigger.id='drawer-geometry-return';trigger.textContent='Synthetic geometry opener';document.body.append(trigger);trigger.focus();
   const modules={scope:['./context-scope-preview.js','ContextScopePreview'],basis:['./context-item-basis.js','ContextItemBasis'],topic:['./context-topic-viewer.js','ContextTopicViewer']};
   const [path,name]=modules[owner],Owner=(await import(path))[name];
   // Real production constructor/showModal/cancel/close and full archive cascade.
   // Geometry-only long local fixture: deliberately no connector/read/write request.
   const viewer=new Owner({host:document.body,send:async()=>{throw Error('Unexpected geometry fixture RPC');},identity:{itemId:'synthetic',expectedRevision:1,epoch:'synthetic'},topicId:'synthetic',name:'Synthetic Topic'});
   window.__drawerGeometry=viewer;
   for(let i=0;i<60;i++){const row=document.createElement('p');row.className='entry-prose';row.textContent='Synthetic local drawer overflow geometry '+i;viewer.body.append(row);}
   await document.fonts.ready;
  },{theme,owner});
  const measured=await p.evaluate(()=>{
   const root=window.__drawerGeometry.root,[head,content,foot]=root.children;
   const box=node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right};};
   const padding=node=>{const s=getComputedStyle(node);return ['Top','Right','Bottom','Left'].map(k=>parseFloat(s['padding'+k]));};
   const before={head:box(head),foot:box(foot)};content.scrollTop=100;
   document.querySelector('#drawer-geometry-return').focus();
   return {root:box(root),head:box(head),foot:box(foot),content:box(content),padding:{head:padding(head),content:padding(content),foot:padding(foot)},before,scroll:content.scrollTop,rootScroll:root.scrollTop,overflow:getComputedStyle(root).overflow,contentOverflow:getComputedStyle(content).overflowY,focusInside:root.contains(document.activeElement),font:parseFloat(getComputedStyle(head.querySelector('h2')).fontSize),horizontal:content.scrollWidth>content.clientWidth};
  });
  const label=`${variant}/${theme}/${scene.width}/${owner}`;
  observations.push({label,measured});await writeFile(`${dir}/geometry.json`,JSON.stringify(observations,null,2)+'\n');
  await p.screenshot({path:`${dir}/latest-measurement.png`});
  assert.deepEqual(measured.root,{x:scene.width-scene.drawer,y:0,width:scene.drawer,height:900,bottom:900,right:scene.width},label+' exact opened frame');
  assert.deepEqual(measured.padding,{head:scene.head,content:scene.content,foot:scene.foot},label+' original paddings');
  assert.equal(measured.font,16,label+' original header type');assert.equal(measured.overflow,'hidden');assert.equal(measured.contentOverflow,'auto');assert.equal(measured.scroll,100);assert.equal(measured.rootScroll,0);assert.equal(measured.horizontal,false);
  assert.deepEqual(measured.before,{head:measured.head,foot:measured.foot},label+' header/footer remain fixed during middle scroll');
  assert.equal(measured.content.y,measured.head.bottom);assert.equal(measured.content.bottom,measured.foot.y);assert.equal(measured.foot.bottom,900);assert.equal(measured.focusInside,true,label+' native modal excludes background focus');
  if([1440,760,530,320].includes(scene.width))await p.screenshot({path:`${dir}/${theme}-${scene.width}-${owner}.png`});
  await p.keyboard.press('Escape');
  assert.equal(await p.locator('.context-drawer').count(),0,label+' retained Escape closes');
  assert.equal(await p.evaluate(()=>document.activeElement?.id),'drawer-geometry-return',label+' native focus return');
  await p.evaluate(()=>document.querySelector('#drawer-geometry-return').remove());
 }
 await writeFile(`${dir}/geometry.json`,JSON.stringify(observations,null,2)+'\n');
});

}

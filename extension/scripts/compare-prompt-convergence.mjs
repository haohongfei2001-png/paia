// Exact build parity; pinned adopted R3 references are distinct from actual evidence.
// Neither a historical v2 pixel difference nor build parity grants visual acceptance.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {dirname,join} from 'node:path';
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {CONTRACT,readApprovedAuthority,selectedStates,assertCompleteReceipts,assertExactPixels,measuredCrop} from './prompt-convergence-authority.mjs';
const require=createRequire(import.meta.url),{PNG}=require(join(dirname(require.resolve('playwright-core/package.json')),'lib/utilsBundle.js'));
const root=fileURLToPath(new URL('..',import.meta.url)),out=join(root,'work/prompt-convergence');
const source=JSON.parse(await readFile(join(out,'source.json'))),release=JSON.parse(await readFile(join(out,'release.json')));
const coverage=assertCompleteReceipts(source,release,selectedStates(process.env.PAIA_VISUAL_STATES));
const authority=await readApprovedAuthority(root);assert.deepEqual(source.authority,authority.identity,'capture binds the approved reference identity');
const report={sha:source.sha,hashes:source.hashes,authority:authority.identity,coverage,parity:'PASS',designAcceptance:'OWNER_VISUAL_ACCEPTANCE_PENDING',openAcceptance:['native-size owner visual inspection','six-direction motion and physical high-refresh qualification','complete real host/zoom/IME/accessibility matrix'],note:'Build parity is exact. Adopted R3 references have different host/viewport and are not pixel-aligned goldens. Historical v2 differences are archival diagnostics only.',states:[]};
let html=`<!doctype html><meta charset="utf-8"><title>Adopted R3 double-card · actual V01–V08 evidence</title><style>body{margin:0;padding:24px;background:#eee;color:#252525;font:14px/1.5 Arial,sans-serif}h1{font-size:22px}h2{font-size:18px}section{padding:20px;background:white;border-radius:16px;margin-bottom:24px;width:1320px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.grid img{width:100%;height:auto}.crop{position:relative;overflow:hidden;background:#f8f9fb}.crop img{position:absolute;width:auto;height:auto;max-width:none}h3{font-size:14px;font-weight:500}.references{display:flex;flex-wrap:wrap;gap:20px}.references img{max-width:290px;max-height:220px;object-fit:contain}.diff{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}.diff img{width:100%}a{color:#536987}</style><h1>${CONTRACT} · adopted R3 double-card and actual production evidence</h1><p>Source and built release · synthetic data · DPR 1 · scale 1 · ${coverage.complete?'all eight original scenarios':'explicit selected scenarios only'} · owner acceptance pending</p><section><h2>Frozen adopted R3 design references</h2><p>These unmodified SVGs and design screenshots establish silhouette, tokens and design context. They are not screenshots of this runtime and are not pixel-aligned browser goldens. The adopted R3 single skin shares the fixed 48px control’s right/bottom edges with the board and capsule. The 720px lossy preview is not a pixel golden; original full PNGs are not checked into Git. No actual image is fed back into this reference set. Editor/drag states have no dedicated approved pixel golden.</p><div class="references">`;
for(const reference of authority.references.filter(r=>/\.(svg|jpg)$/.test(r.path))){const file='adopted-R3-'+reference.path.split('/').at(-1);html+=`<a href="${file}"><img src="${file}" alt="Frozen adopted R3 ${reference.path}"><br>${reference.path}</a>`;}
html+='</div></section>';
const delta=(a,b)=>{
 assert.equal(a.width,b.width);assert.equal(a.height,b.height);const diff=new PNG({width:a.width,height:a.height});let changed=0,total=0;
 for(let n=0;n<a.data.length;n+=4){let max=0;for(let k=0;k<3;k++){const d=Math.abs(a.data[n+k]-b.data[n+k]);total+=d;max=Math.max(max,d);}if(max)changed++;diff.data[n]=255;diff.data[n+1]=255-Math.min(255,max*4);diff.data[n+2]=255-Math.min(255,max*3);diff.data[n+3]=255;}
 return{diff,changed,meanChannelDifference:total/(a.width*a.height*3)};
};
for(const screen of source.screens){
 const i=Number(screen.name.slice(0,2))-1,name=screen.name;
 const historical=PNG.sync.read(await readFile(join(out,'historical-v2-'+name+'.png'))),actual=PNG.sync.read(await readFile(join(out,'source-'+name+'.png'))),built=PNG.sync.read(await readFile(join(out,'release-'+name+'.png')));
 assertExactPixels(actual,built,name);
 const stats=[];for(const[variant,png]of[['source',actual],['release',built]]){const d=delta(historical,png);await writeFile(join(out,variant+'-historical-v2-difference-'+name+'.png'),PNG.sync.write(d.diff));stats.push({variant,changedPixels:d.changed,meanChannelDifference:d.meanChannelDifference});}
 const crop=measuredCrop(screen);
 html+=`<section id="V${i+1}"><h2>V0${i+1} · ${name.slice(3)} · ${screen.viewport.width} × ${screen.viewport.height} · ${screen.theme}</h2><div class="grid">`;
 for(const variant of ['source','release']){const file=variant+'-'+name+'.png';html+=`<div><h3>${variant==='source'?'Source actual':'Built release actual'} · measured entry/board union</h3><div class="crop" style="height:${crop.height}px;width:${crop.width}px"><img src="${file}" style="left:-${crop.x}px;top:-${crop.y}px"></div><a href="${file}"><img src="${file}"></a></div>`;}
 const old='historical-v2-'+name+'.png';html+=`<div><h3>Historical v2 only · superseded appearance</h3><p>Retained original synthetic scene and former design. Not current R3 authority or acceptance target.</p><a href="${old}"><img src="${old}"></a></div></div><details><summary>Historical v2 difference diagnostics only</summary><div class="diff">`;
 for(const variant of ['source','release']){const file=variant+'-historical-v2-difference-'+name+'.png';html+=`<div><h3>Historical v2 / ${variant} difference · amplified 4×</h3><a href="${file}"><img src="${file}"></a></div>`;}
 html+='</div></details><p>Source/release pixel parity: exactly identical. This is build equivalence only; visual acceptance remains pending owner review.</p></section>';
 if(i===7){
  const suffix='08-inserted-feedback.png';assertExactPixels(PNG.sync.read(await readFile(join(out,'source-'+suffix))),PNG.sync.read(await readFile(join(out,'release-'+suffix))),suffix);
  html+='<section><h2>V08 · verified transient insertion feedback</h2><p>Observed inside the original 480ms feedback window; no runtime duration extension. Exact Source/release pixel parity remains required.</p><div class="grid">';
  for(const variant of ['source','release'])html+=`<div><h3>${variant} actual transient feedback</h3><a href="${variant}-${suffix}"><img src="${variant}-${suffix}"></a></div>`;
  html+='</div></section>';
 }
 report.states.push({name,conditions:screen,actualCrop:crop,parityChangedPixels:0,...(i===7?{transientFeedback:{file:'08-inserted-feedback.png',parityChangedPixels:0,designMs:480,observedInsideWindow:true}}:{}),historicalV2Differences:stats});
}
const expected=source.screens.flatMap(s=>['orb-close-'+s.name+'.png',...(s.name.startsWith('01-')||s.name.startsWith('06-')?['orb-hover-'+s.theme+'.png','orb-focus-'+s.theme+'.png','orb-backdrop-'+s.theme+'.png']:[]),...(s.name.startsWith('02-')||s.name.startsWith('06-')?['more-view-'+s.theme+'.png']:[])]).sort();
const files=await readdir(out);report.supplementalParity=[];
for(const variant of ['source','release'])assert.deepEqual(files.filter(x=>(x.startsWith(variant+'-orb-')||x.startsWith(variant+'-more-'))&&x.endsWith('.png')).map(x=>x.slice(variant.length+1)).sort(),expected,'complete supplemental '+variant+' evidence');
for(const file of expected){assertExactPixels(PNG.sync.read(await readFile(join(out,'source-'+file))),PNG.sync.read(await readFile(join(out,'release-'+file))),file);report.supplementalParity.push(file);}
assert.deepEqual(source.capsules,release.capsules,'exact R3 capsule geometry and original interaction receipts');
const capsuleThemes=source.screens.filter(s=>s.name.startsWith('02-')||s.name.startsWith('06-')).map(s=>s.theme);
assert.deepEqual(source.capsules.map(x=>x.theme),capsuleThemes);
report.r3CapsuleParity=[];
for(const theme of capsuleThemes){const file='r3-capsule-'+theme+'.png';assertExactPixels(PNG.sync.read(await readFile(join(out,'source-'+file))),PNG.sync.read(await readFile(join(out,'release-'+file))),file);report.r3CapsuleParity.push(file);html+='<section><h2>R3 ordinary capsule · '+theme+'</h2><p>272×48 shared skin; original left224 text hit inserts once, right48 toggles the same private frame; zero Send.</p><div class="grid">';for(const variant of ['source','release'])html+='<img src="'+variant+'-'+file+'">';html+='</div></section>';}
await writeFile(join(out,'index.html'),html);await writeFile(join(out,'comparison.json'),JSON.stringify(report,null,2));
const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
try{const page=await browser.newPage({viewport:{width:1408,height:1000},deviceScaleFactor:1});await page.goto('file://'+join(out,'index.html'));for(const screen of source.screens){const id=screen.name.slice(0,2);await page.locator('#V'+Number(id)).screenshot({path:join(out,'V'+id+'-comparison.png')});}}finally{await browser.close();}
console.log('Adopted R3 references and actual comparisons written; exact source/release parity PASS; OWNER_VISUAL_ACCEPTANCE_PENDING.');

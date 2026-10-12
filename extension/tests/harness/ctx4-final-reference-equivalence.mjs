// Synthetic visual acceptance only. No connector, automatic producer, or provider grant.
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import {FakeChatGPT,eventually} from './fake-chatgpt.mjs';

const defaultReference=fileURLToPath(new URL('../../docs/consumer-product-v1/design/approved-visuals-2026-10-07/PAIA-AI-Context-Cards-v2/',import.meta.url));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const rpc=async(page,type,fields={})=>{const result=await page.evaluate(message=>chrome.runtime.sendMessage(message),{type,...fields});assert.equal(result.ok,true,JSON.stringify({type,error:result.error}));return result.data;};
const read=page=>rpc(page,'PAIA_CONTEXT_CARDS_SNAPSHOT');
const selectorPairs=[
 ['page','.context-page','.context-page'],['heading','.context-head h1','.context-head h1'],
 ['back','.context-back','.context-back'],['global','.access.global','.context-access.global'],
 ['card','.context-card','.context-card'],['cardTitle','.card-title','.card-title'],
 ['cardAccess','.context-card>.access','.context-card>.context-access'],
 ['summary','.card-summary','.card-summary'],['footer','.card-footer','.card-footer'],
 ['connections','.connections-link','.connections-link'],['maintenance','.maintenance','.maintenance'],
 ['section','.context-section','.context-section'],['sectionTitle','.context-section h2','.context-section h2'],
 ['item','.item-text','.item-text'],['add','.add-item','.add-item'],
 ['topics','.topic-field','.topic-field'],['topic','.topic-access','.topic-access'],
 ['topicNote','.topics-note','.topics-note'],['newMark','.new-topic-mark','.new-topic-mark'],
 ['feedback','.item-feedback.error','.item-feedback.error']
];
const styleKeys=['fontFamily','fontSize','fontWeight','lineHeight','color','backgroundColor','borderTopWidth','borderTopColor','borderRadius','paddingTop','paddingRight','paddingBottom','paddingLeft','marginTop','marginBottom','gap','minHeight'];
async function metrics(page,side){return page.evaluate(({pairs,keys,side})=>{
 const result={viewport:{width:innerWidth,height:innerHeight,ratio:devicePixelRatio},theme:document.documentElement.dataset.paiaTheme,overflow:document.documentElement.scrollWidth>innerWidth,groups:{}};
 for(const [name,reference,actual]of pairs)result.groups[name]=[...document.querySelectorAll(side==='reference'?reference:actual)].filter(el=>el.getClientRects().length).map(el=>{const rect=el.getBoundingClientRect(),style=getComputedStyle(el);return {rect:Object.fromEntries(['x','y','width','height'].map(key=>[key,rect[key]+(key==='y'?scrollY:0)])),style:Object.fromEntries(keys.map(key=>[key,style[key]])),textLength:el.textContent.length,pressed:el.getAttribute('aria-pressed'),on:el.dataset.on??null,paused:el.dataset.paused??null};});
 return result;
},{pairs:selectorPairs,keys:styleKeys,side});}
function compare(reference,actual,scene){
 const failures=[],record=(selector,index,field,expected,observed)=>failures.push({selector,index,field,expected,actual:observed});
 if(actual.overflow)record('document',0,'horizontalOverflow',false,true);
 for(const [name,,selector]of selectorPairs){
  const expected=reference.groups[name],found=actual.groups[name];
  // Original Design §6.1 permits at most a transient first-view cue. It does
  // not require a marker. Neither a timestamp nor the last row creates one.
  if(name==='newMark'&&scene.id==='17-New-Topic'&&found.length===0)continue;
  if(expected.length!==found.length){record(selector,0,'count',expected.length,found.length);continue;}
  for(let index=0;index<expected.length;index++){
   const a=expected[index],b=found[index];
   for(const key of styleKeys){
    // The sole owner-approved reference override is actual shared reading 17px/680px.
    const value=name==='item'&&key==='fontSize'?'17px':name==='item'&&key==='lineHeight'?'30.8125px':a.style[key];
    if(value!==b.style[key])record(selector,index,key,value,b.style[key]);
   }
   // Reading-body vertical flow changes with the explicit 17px/680px override.
   // Its typography, padding, colors and hierarchy above remain strict.
   const positional=['page','heading','back','global','card','cardTitle','cardAccess','summary','footer','connections','maintenance','topics','topic','topicNote','newMark'].includes(name);
   if(positional)for(const key of ['x','y','width','height']){
    // Whole detail height accumulates the explicitly accepted reading override;
    // independent shell/header positions and all remaining styles stay exact.
    if(name==='page'&&key==='height'&&['info','rules','now'].includes(new URLSearchParams(scene.query).get('page')))continue;
    if(name==='topic'&&key==='width'&&scene.id==='17-New-Topic'&&index===expected.length-1&&actual.groups.newMark.length===0)continue;
    if(Math.abs(a.rect[key]-b.rect[key])>.1)record(selector,index,'rect.'+key,a.rect[key],b.rect[key]);
   }
   if(['global','cardAccess','topic'].includes(name))for(const key of ['on','paused']){
    // Unselected Topics have no read grant; their data-paused implementation
    // differs while colors, geometry and actual selected/default-off states do
    // not. Selected paused Topics remain an exact visual/state comparison.
    if(name==='topic'&&key==='paused'&&a.on==='false'&&b.on==='false')continue;
    if(a[key]!==b[key])record(selector,index,key,a[key],b[key]);
   }
  }
 }
 return failures.map(item=>({scene:scene.id,...item}));
}
async function settle(page){await page.mouse.move(1,1);await page.evaluate(async()=>{await document.fonts.ready;await Promise.all(document.getAnimations().filter(animation=>Number.isFinite(animation.effect?.getComputedTiming().endTime)).map(animation=>animation.finished.catch(()=>{})));await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});}
async function home(page){if(await page.locator('.context-back').count())await page.locator('.context-back').click();await page.locator('.context-card').first().waitFor();await page.waitForFunction(()=>!history.state?.paiaReader?.contextCard&&document.querySelector('.context-page')?.inert===false);}
async function open(page,card){await home(page);if(card){await page.locator(`.context-card[data-card="${card}"] .card-link`).click();await page.waitForFunction(card=>history.state?.paiaReader?.contextCard===card&&document.querySelector('.context-page')?.inert===false,card);}}
async function access(page,key,enabled){const snapshot=await read(page);if(snapshot.access[key].enabled===enabled)return;const result=await rpc(page,'PAIA_CONTEXT_CARDS_CHANGE',{change:{kind:'access',key,enabled,expectedRevision:snapshot.access[key].revision,epoch:snapshot.epoch,operationId:randomUUID()}});assert.equal(result.ok,true);}
async function directory(page){const items=[];let cursor=null;do{const result=await rpc(page,'PAIA_CONTEXT_TOPICS_PAGE',{options:{limit:100,cursor}});assert.equal(result.available,true);assert.equal(result.externalAllowed,false);items.push(...result.items);cursor=result.nextCursor;}while(cursor);return items;}

export async function runContextReferenceEquivalence(variant){
 const reference=resolve(process.env.PAIA_CONTEXT_REFERENCE_DIR||defaultReference),screens=JSON.parse(await readFile(join(reference,'Screens.json'))),out=resolve('work/ctx4-final-reference-equivalence-r3',variant);
 await mkdir(out,{recursive:true});
 const release=variant==='release'?await mkdtemp(join(tmpdir(),'paia-ctx4-final-release-')):null;
 let harness,prototype;
 const scenes=[],failures=[],referenceHashes={};
 const binding={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),tree:execFileSync('git',['rev-parse','HEAD^{tree}'],{encoding:'utf8'}).trim(),variant,readingOverride:{fontSize:17,width:680},externalUnavailable:['11-Connections','20-Connect'],globalAcceptance:false};
 try{
  const manifestBytes=await readFile(join(reference,'Artifact-Manifest.json'));
  referenceHashes['Artifact-Manifest.json']=sha(manifestBytes);
  assert.equal(referenceHashes['Artifact-Manifest.json'],'0c68f5a5e656d0e11aac4d9f98dcc93ebc090a40e65feb0fd294a30fe1345858','approved original Context manifest');
  const manifest=JSON.parse(manifestBytes);
  for(const entry of manifest.files){const bytes=await readFile(join(reference,entry.file));assert.equal(bytes.length,entry.bytes,'original reference size '+entry.file);referenceHashes[entry.file]=sha(bytes);assert.equal(referenceHashes[entry.file],entry.sha256,'original reference bytes '+entry.file);}
  if(release)execFileSync('python3',['scripts/build_current_release.py',release],{stdio:'pipe'});
  const vector=JSON.parse(execFileSync('python3',['-c',"import sys,json,hashlib;from pathlib import Path;sys.path.insert(0,'scripts');from package_assets import release_files;root=Path('.').resolve();files=release_files(root)+[root/'scripts'/x for x in ['build_current_release.py','build_daily_use.py','package_assets.py']];print(json.dumps([{'path':str(f.relative_to(root)),'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for f in sorted(set(files))]))"],{encoding:'utf8'}));
  const testVector=[];for(const file of ['tests/context-cards-chrome-e2e.test.mjs','tests/harness/ctx4-final-reference-equivalence.mjs']){const bytes=await readFile(file);testVector.push({path:file,bytes:bytes.length,sha256:sha(bytes)});}
  const releaseVector=release?JSON.parse(execFileSync('python3',['-c',"import sys,json,hashlib;from pathlib import Path;root=Path(sys.argv[1]);print(json.dumps([{'path':str(f.relative_to(root)),'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for f in sorted(root.rglob('*')) if f.is_file()]))",release],{encoding:'utf8'})):null;
  await writeFile(join(out,'prelaunch-binding.json'),JSON.stringify({binding,vector,testVector,releaseVector,referenceHashes},null,2));
  harness=await FakeChatGPT.start({extensionPath:release||resolve('.'),headless:true,viewport:{width:1440,height:900}});
  const page=harness.archive;page.setDefaultTimeout(14000);
  prototype=await harness.context.newPage();
  await prototype.goto(pathToFileURL(join(reference,'AI-Context.html')).href);await settle(prototype);
  const initial=await prototype.evaluate(()=>structuredClone(window.design.state));
  await page.locator('#consent-check').check();await page.locator('#enable-consent').click();await eventually(async()=>(await rpc(page,'GET_STATUS')).consented);
  if(await page.locator('#onboarding-skip').isVisible())await page.locator('#onboarding-skip').click();
  await rpc(page,'UPDATE_PREFERENCES',{changes:{language:'zh-CN',appearance:'light',fontSize:'standard',readingWidth:'standard'}});
  await page.locator('.sidebar [data-view="memory"]').click();await page.locator('.context-card').first().waitFor();
  const topics=[];
  const seed=async count=>{while(topics.length<count){const ref=initial.topics[topics.length]||(await prototype.evaluate(()=>{const original=window.design.state;return original.topics;}))[topics.length];assert.ok(ref,'reference provides each synthetic Topic');const topic=await rpc(page,'CREATE_LIBRARY_TOPIC',{topic:{name:ref.name,operationId:randomUUID()}});topics.push(topic);}
   await eventually(async()=>{const status=await rpc(page,'FILTER_STATUS');return status.pending===0&&status.taskState==='idle';});
   const rows=await directory(page);for(let index=0;index<Math.min(13,count);index++){const row=rows.find(row=>row.topicId===topics[index].id);if(!row.enabled){const result=await rpc(page,'PAIA_CONTEXT_TOPICS_CHANGE',{change:{topicId:row.topicId,enabled:true,expectedRevision:row.revision,expectedBinding:row.expectedBinding,epoch:(await read(page)).epoch,operationId:randomUUID()}});assert.equal(result.ok,true,JSON.stringify({reason:result.reason}));}}
  };
  const capture=async id=>{
   const scene=screens.find(item=>item.id===id),query=new URLSearchParams(scene.query),card=query.get('page'),empty=query.get('state')==='empty';
   await home(page);await page.setViewportSize(scene.viewport);await prototype.setViewportSize(scene.viewport);
   await prototype.goto(pathToFileURL(join(reference,'AI-Context.html')).href+'?'+scene.query);await settle(prototype);
   const referenceState=await prototype.evaluate(()=>structuredClone(window.design.state));
   for(const key of ['global','info','rules','now','inputs'])await access(page,key,empty?false:key==='global'?referenceState.global:referenceState.groups[key]);
   await rpc(page,'UPDATE_PREFERENCES',{changes:{appearance:query.get('theme')==='dark'?'dark':'light'}});
   await open(page,card);await page.waitForFunction(theme=>document.documentElement.dataset.paiaTheme===theme,query.get('theme')==='dark'?'dark':'light');
   let restore=null;
   if(id==='05-Inline-Editing'){
    const saved='日常交流主要使用中文，技术术语保留英文。';
    for(const target of [prototype,page]){const field=target.locator('.item-text').nth(3);await field.fill(saved);await field.press('Control+Enter');}
    await eventually(async()=>(await read(page)).items.filter(item=>item.card==='info')[3].body===saved);
    await page.locator('.item-feedback').nth(3).getByText('已保存',{exact:true}).waitFor();
    for(const target of [prototype,page])await target.locator('.item-text').nth(3).evaluate(el=>{el.focus();const range=document.createRange();range.setStart(el.firstChild,el.textContent.indexOf('技术'));range.setEnd(el.firstChild,el.textContent.length);getSelection().removeAllRanges();getSelection().addRange(range);});
    restore=async()=>{for(const target of [prototype,page]){const field=target.locator('.item-text').nth(3);await field.fill(referenceState.items.info[3].text);await field.press('Control+Enter');}};
   }
   if(id==='16-Save-Failed'){
    const worker=harness.context.serviceWorkers().find(worker=>worker.url().endsWith('/background/service-worker.js'));
    await worker.evaluate(()=>{const put=IDBObjectStore.prototype.put;globalThis.__ctx4FinalPut=put;IDBObjectStore.prototype.put=function(value,...args){if(this.name==='operationReceipts'&&value.namespace==='context-cards')throw new DOMException('Synthetic write refusal','UnknownError');return put.call(this,value,...args);};});
    for(const target of [prototype,page]){await target.locator('.item-text').nth(3).fill('日常交流主要使用中文，技术术语保留英文。');await target.locator('.item-text').nth(3).press('Control+Enter');}
    await page.locator('.item-feedback.error').first().waitFor();assert.equal((await read(page)).items.filter(item=>item.card==='info')[3].body,referenceState.items.info[3].text);
    restore=async()=>{await worker.evaluate(()=>{IDBObjectStore.prototype.put=globalThis.__ctx4FinalPut;delete globalThis.__ctx4FinalPut;});};
   }
   if(card==='inputs')await page.waitForFunction(count=>document.querySelector('.context-inputs')?.getAttribute('aria-busy')==='false'&&document.querySelectorAll('.topic-access').length===count&&[...document.querySelectorAll('.topic-access')].every(node=>!node.disabled),referenceState.topics.length);
   await settle(prototype);await settle(page);
   const expected=await metrics(prototype,'reference'),actual=await metrics(page,'actual'),mismatches=compare(expected,actual,scene);
   if(card&&card!=='inputs')assert.equal(await page.locator('.detail-content').evaluate(el=>getComputedStyle(el).maxWidth),'680px');
   const snapshot=await read(page);assert.equal(snapshot.capabilities.external,false);assert.equal(snapshot.capabilities.automatic,false);assert.equal(snapshot.connections,0);
   referenceHashes[scene.file]=sha(await readFile(join(reference,scene.file)));
   await prototype.screenshot({path:join(out,id+'-reference.png'),fullPage:true});await page.screenshot({path:join(out,id+'-'+variant+'.png'),fullPage:true});
   const acceptedVariations={readingFlow:!!card&&['info','rules','now'].includes(card),optionalNewCue:id==='17-New-Topic'&&actual.groups.newMark.length===0,unselectedPausedDataset:id==='14-Inputs-Paused',boundedHomePreview:!card};
   let canonicalUnsaved=null;
   if(id==='05-Inline-Editing'){
    const before=(await read(page)).items.filter(item=>item.card==='info')[3];
    for(const target of [prototype,page]){const field=target.locator('.item-text').nth(3);await field.evaluate(el=>el.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true})));await field.fill(before.body+' 仍在组合的虚构补充。');}
    const retained=(await read(page)).items.find(item=>item.id===before.id);assert.deepEqual(retained,before,'composition retains actual saved owner without false commit');
    assert.equal(await page.locator('.item-text').nth(3).evaluate(el=>el===document.activeElement),true);
    const successMarker=(await page.locator('.item-feedback').nth(3).textContent()).includes('已保存');
    await settle(prototype);await settle(page);
    await prototype.screenshot({path:join(out,id+'-unsaved-reference.png'),fullPage:true});await page.screenshot({path:join(out,id+'-unsaved-'+variant+'.png'),fullPage:true});
    canonicalUnsaved={sameSavedItem:true,sameRevision:true,focused:true,successMarker,comparison:compare(await metrics(prototype,'reference'),await metrics(page,'actual'),scene)};
    if(successMarker)canonicalUnsaved.comparison.push({scene:id+'-new-composition',selector:'.item-feedback',index:3,field:'successMarkerForUncommittedVisibleText',expected:false,actual:true});
    failures.push(...canonicalUnsaved.comparison);
    for(const target of [prototype,page]){const field=target.locator('.item-text').nth(3);await field.fill(before.body);await field.evaluate(el=>el.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true})));}
   }
   scenes.push({id,referencePngSHA256:referenceHashes[scene.file],viewport:scene.viewport,reference:expected,actual,mismatches,acceptedVariations,canonicalUnsaved,unavailableReferenceFields:{connections:referenceState.connections.length,automaticMaintenance:card&&card!=='inputs'},syntheticOwnerState:{items:snapshot.items.length,topics:(await directory(page)).length,selected:snapshot.topicChoices.selectedCount,access:Object.fromEntries(Object.entries(snapshot.access).map(([key,value])=>[key,value.enabled]))}});
   failures.push(...mismatches);await writeFile(join(out,'measurements.json'),JSON.stringify({binding,referenceHashes,scenes,failures},null,2));if(restore)await restore();
  };
  await capture('15-Empty');
  for(const [card,items]of Object.entries(initial.items))for(const item of items){const result=await rpc(page,'PAIA_CONTEXT_CARDS_CHANGE',{change:{kind:'put',card,epoch:(await read(page)).epoch,itemId:randomUUID(),expectedRevision:0,section:item.section,body:item.text,operationId:randomUUID()}});assert.equal(result.ok,true);}
  // Use the full original 144-name synthetic fixture through its original query.
  await prototype.goto(pathToFileURL(join(reference,'AI-Context.html')).href+'?page=inputs&topics=144');const allNames=await prototype.evaluate(()=>structuredClone(window.design.state.topics));initial.topics=allNames;
  await seed(20);
  for(const id of ['01-Home','02-Cards-Off','03-Global-Off','04-Info','05-Inline-Editing','06-Rules','07-Now','08-Inputs-20','14-Inputs-Paused','12-Compact','13-Dark','19-Compact-Info','21-Tablet','22-No-AI'])await capture(id);
  const newTopic=await rpc(page,'CREATE_LIBRARY_TOPIC',{topic:{name:'语音交互',operationId:randomUUID()}});await capture('17-New-Topic');
  const originalNew=await rpc(page,'GET_LIBRARY_TOPIC',{id:newTopic.id});await rpc(page,'REMOVE_LIBRARY_TOPIC',{edit:{id:newTopic.id,expectedRevision:originalNew.revision,operationId:randomUUID()}});
  await seed(50);for(const id of ['09-Inputs-50','18-Dark-Inputs'])await capture(id);
  await seed(144);await capture('10-Inputs-144');await capture('16-Save-Failed');
  assert.equal(scenes.length,20);assert.equal(harness.externalRequests,0);assert.equal(harness.extensionNetworkRequests,0);assert.equal(harness.deepSeekRequests.length,0);assert.deepEqual(harness.errors,[]);
  await writeFile(join(out,'summary.json'),JSON.stringify({binding,referenceHashes,localScenes:20,mismatches:failures.length,zeroExternalHTTP:true,realSystemOrCloudVerified:false,localVisualMetricsAccepted:failures.length===0,completeVisualAcceptance:false},null,2));
  assert.equal(failures.length,0,JSON.stringify(failures.slice(0,12)));
 }finally{
  await writeFile(join(out,'execution.json'),JSON.stringify({binding,referenceHashes,completedScenes:scenes.length,mismatches:failures.length},null,2));
  await prototype?.close().catch(()=>{});await harness?.close();if(release)await rm(release,{recursive:true,force:true});
 }
}

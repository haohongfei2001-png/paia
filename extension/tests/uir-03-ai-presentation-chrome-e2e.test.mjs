import {thoughtHistoryAction} from './harness/current-thought-navigation.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture as baseFixture,rpc,authority,savedRow,editSaved,refusedAI,setAIView as rawSetAIView,openTopic,noApproval,quiet,screenshotMatrix} from './harness/consumer-ai-browser.mjs';
import {eventually} from './harness/fake-chatgpt.mjs';

async function verifySavedSummaryAccess(p,variant){
 const summary=p.locator('[data-ai-saved-fields] > summary'),details=p.locator('[data-ai-saved-fields]'),cdp=await p.context().newCDPSession(p);
 const initial=await summary.evaluate(n=>({font:parseFloat(getComputedStyle(n).fontSize),style:n.getAttribute('style')}));
 try{
  await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
  assert.equal(await p.evaluate(()=>matchMedia('(pointer:coarse)').matches),true,'real coarse pointer media is active');
  await summary.evaluate((n,size)=>n.style.setProperty('font-size',size*2+'px','important'),initial.font);
  for(const [language,label] of [['en','Saved AI organization'],['zh-CN','已保存的 AI 整理']]){
   await rpc(p,'UPDATE_PREFERENCES',{changes:{language}});await eventually(async()=>await summary.textContent()===label);
   await summary.scrollIntoViewIfNeeded();await summary.focus();
   const g=await summary.evaluate(n=>{const r=n.getBoundingClientRect(),at=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {x:r.x+r.width/2,y:r.y+r.height/2,width:r.width,height:r.height,font:parseFloat(getComputedStyle(n).fontSize),sw:n.scrollWidth,cw:n.clientWidth,sh:n.scrollHeight,ch:n.clientHeight,overflow:document.documentElement.scrollWidth-innerWidth,hit:at===n||n.contains(at),focused:document.activeElement===n};});
   console.log('SAVED_SUMMARY_COARSE_TEXT200',variant,language,JSON.stringify(g));
   assert.equal(g.font,initial.font*2);assert.ok(g.width>=44&&g.height>=44&&g.hit&&g.focused,'coarse enlarged summary remains reachable');assert.ok(g.overflow<=2&&g.sw<=g.cw&&g.sh<=g.ch,'enlarged label fits without clipping or horizontal overflow');
   const opened=await details.evaluate(n=>n.open);await summary.evaluate(n=>{globalThis.__summaryTouch=[];n.addEventListener('click',e=>__summaryTouch.push({trusted:e.isTrusted,pointerType:e.pointerType}),{once:true});});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:g.x,y:g.y,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   await eventually(async()=>await details.evaluate(n=>n.open)!==opened,'trusted touch toggles the real saved-field disclosure');assert.deepEqual(await p.evaluate(()=>__summaryTouch),[{trusted:true,pointerType:'touch'}]);
   await summary.focus();await p.keyboard.press('Space');assert.equal(await details.evaluate(n=>n.open),opened);assert.equal(await summary.evaluate(n=>document.activeElement===n),true);
   await p.screenshot({path:`work/consumer-cleanup/${variant}-saved-summary-coarse-text200-${language}.png`});
  }
 }finally{await summary.evaluate((n,style)=>{if(style===null)n.removeAttribute('style');else n.setAttribute('style',style);},initial.style);try{await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});}finally{await cdp.detach();}}
}

async function setAIView(p,on){await rawSetAIView(p,on);if(on){const details=p.locator('[data-ai-saved-fields]');await details.waitFor();if(!await details.evaluate(n=>n.open))await details.locator('summary').click();}}

import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
async function fixture(variant,options={}){
 if(variant!=='release')return baseFixture(variant,options);
 const path=await mkdtemp(join(tmpdir(),'paia-ai-reading-release-'));
 try{execFileSync('python3',['scripts/build_current_release.py',join(path,'release')],{stdio:'pipe'});const f=await baseFixture(variant,{...options,releasePath:join(path,'release')}),close=f.h.close.bind(f.h);f.h.close=async()=>{try{await close();}finally{await rm(path,{recursive:true,force:true});}};return f;}catch(error){await rm(path,{recursive:true,force:true});throw error;}
}

test('UIR-03 saved Organized presentation remains readable and editable while retired Provider commands refuse in source and release',{timeout:300000},async()=>{
 for(const variant of ['source','release']){const f=await fixture(variant);try{const {p,h,topic}=f,before=await authority(p);await setAIView(p,true);await p.locator('[data-ai-field="currentView"]').waitFor();await noApproval(p);await refusedAI(p,topic.id);await screenshotMatrix(p,'saved-ai',variant);const savedBefore=await savedRow(p,topic.id),savedEdit=await editSaved(f);await thoughtHistoryAction(p,'library-undo');await eventually(async()=>(await savedRow(p,topic.id)).blockSummary===savedBefore.blockSummary,'visible undo targets saved AI');await p.setViewportSize({width:320,height:900});await thoughtHistoryAction(p,'library-redo');await eventually(async()=>(await savedRow(p,topic.id)).blockSummary===savedEdit.blockSummary,'visible redo restores the AI edit');assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'open AI menu stays inside narrow viewport');await p.setViewportSize({width:1440,height:900});const after=await authority(p);assert.deepEqual(after.records,before.records);assert.deepEqual(after.thoughts,before.thoughts);const history=await rpc(p,'GET_AI_PRESENTATION_REVISIONS',{options:{topicId:topic.id}});assert.ok(history.items.length>0);await quiet(h);}finally{await f.h.close();}}
});
test('VS-05 long Topic remains interactive across refused AI, navigation and reduced motion in source and release',{timeout:300000},async()=>{
 for(const variant of ['source','release']){const f=await fixture(variant,{count:64});try{const {p,h,topic}=f;await setAIView(p,true);await refusedAI(p,topic.id);await p.emulateMedia({reducedMotion:'reduce'});await setAIView(p,false);await p.locator('#topic-search').fill('原始思想 0');await eventually(async()=>/1\+? 条匹配/.test(await p.locator('#topic-search-count').textContent()));assert.ok(await p.locator('#original-reading-body [data-entry-id]').count()<=60);await p.locator('#topic-search').fill('');await openTopic(p,topic);await setAIView(p,true);await p.locator('[data-ai-field="currentView"]').waitFor();const row=await savedRow(p,topic.id);await setAIView(p,false);await setAIView(p,true);assert.deepEqual(await savedRow(p,topic.id),row,'view transitions do not create phantom revisions');await quiet(h);}finally{await f.h.close();}}
});
for(const variant of ['source','release'])test(`D7 retired worker launch cannot create pending work or replace saved AI (${variant})`,{timeout:180000},async()=>{
 const f=await fixture(variant);try{await setAIView(f.p,true);await refusedAI(f.p,f.topic.id);await f.h.restartWorker();await refusedAI(f.p,f.topic.id);await f.p.locator('[data-ai-field="blockSummary"]').waitFor();await noApproval(f.p);await quiet(f.h);}finally{await f.h.close();}
});

for(const variant of ['source','release'])test(`TOPIC-05.7 saved revision waits for Unicode selection and composition (${variant})`,{timeout:180000},async()=>{
 const f=await fixture(variant);try{const {p,topic}=f;await setAIView(p,true);await p.locator('[data-ai-field="currentView"]').waitFor();
 for(const mode of ['selection','composition']){
  const row=await savedRow(p,topic.id),value='SYNTHETIC newer '+mode+' 👩‍💻 é';
  await p.evaluate(({revision,mode})=>{
   const original=chrome.runtime.sendMessage.bind(chrome.runtime);let release;
   const gate=new Promise(r=>release=r);window.__aiReflow={original,release,mode,held:false,delivered:false,entryReads:0};
   chrome.runtime.sendMessage=async function(message,...args){const result=await original(message,...args);const state=window.__aiReflow;
    if(message.type==='GET_AI_PRESENTATION_STATUS'&&result?.data?.topics?.some(x=>x.presentation?.revision>revision)&&!state.held){state.held=true;await gate;state.delivered=true;}
    if(message.type==='GET_LIBRARY_ENTRY'&&state.delivered)state.entryReads++;
    return result;
   };
  },{revision:row.revision,mode});
  await rpc(p,'EDIT_AI_PRESENTATION',{edit:{topicId:topic.id,field:'currentView',value,expectedRevision:row.revision,operationId:crypto.randomUUID()}});
  await eventually(()=>p.evaluate(()=>window.__aiReflow.held),'actual higher revision response is held');
  await p.evaluate(mode=>{
   const node=document.querySelector('[data-ai-field="currentView"]');node.focus();window.__aiReflow.node=node;window.__aiReflow.text=node.textContent;
   const selection=getSelection();selection.removeAllRanges();
   if(mode==='selection'){const text=node.firstChild,start=text.data.indexOf('👩');if(start<0)throw Error('Unicode fixture absent');const range=document.createRange();range.setStart(text,start);range.setEnd(text,start+'👩‍💻 é'.length);selection.addRange(range);window.__aiReflow.selected=selection.toString();}
   else node.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true,data:'中'}));
   window.__aiReflow.release();
  },mode);
  await eventually(()=>p.evaluate(()=>window.__aiReflow.entryReads>0),'real eligibility reads continue after held status');
  await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  assert.deepEqual(await p.evaluate(()=>{const s=window.__aiReflow;return {same:s.node===document.querySelector('[data-ai-field="currentView"]'),text:s.node.textContent===s.text,selected:s.mode!=='selection'||getSelection().toString()===s.selected};}),{same:true,text:true,selected:true});
  await p.evaluate(()=>{const s=window.__aiReflow;chrome.runtime.sendMessage=s.original;if(s.mode==='selection')getSelection().removeAllRanges();else s.node.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:''}));});
  await eventually(async()=>await p.locator('[data-ai-field="currentView"]').textContent()===value,'current owner rereads saved revision after protected interaction ends');
  assert.equal((await savedRow(p,topic.id)).revision,row.revision+1,'reading never writes an extra saved revision');
 }
 await p.evaluate(async row=>{const {AIReadingEditor}=await import('./ai-presentation.js');const host=document.createElement('div');host.id='legacy-evidence-fixture';document.querySelector('#topic-body').append(host);window.__legacyEvidence=new AIReadingEditor(host,row,()=>{},()=>{});await window.__legacyEvidence.ready;},await savedRow(p,topic.id));
 const entry=await rpc(p,'GET_LIBRARY_ENTRY',{id:f.entries[0].id}),nextBody='SYNTHETIC current excerpt 👩‍💻 é';
 await p.evaluate(id=>{
  const node=document.querySelector('#legacy-evidence-fixture [data-entry-id="'+id+'"] [data-entry-field="body"]');if(!node)throw Error('saved evidence excerpt absent');node.focus();
  const text=node.firstChild,range=document.createRange();range.selectNodeContents(node);getSelection().removeAllRanges();getSelection().addRange(range);
  const original=chrome.runtime.sendMessage.bind(chrome.runtime);window.__aiExcerpt={node,text,body:node.textContent,selected:getSelection().toString(),original,reads:0};
  chrome.runtime.sendMessage=async function(message,...args){const result=await original(message,...args);if(message.type==='GET_LIBRARY_ENTRY'&&message.id===id&&result?.data?.revision>1)window.__aiExcerpt.reads++;return result;};
 },entry.id);
 await rpc(p,'EDIT_LIBRARY_BATCH',{edit:{operationId:crypto.randomUUID(),entries:[{id:entry.id,expectedRevision:entry.revision,expectedFieldRevisions:entry.fieldRevisions,expectedInputRevision:entry.currentInputRevision,changes:{body:nextBody}}]}});
 await p.evaluate(()=>window.__legacyEvidence.refreshEvidence());
 await eventually(()=>p.evaluate(()=>window.__aiExcerpt.reads>0),'new evidence revision is actually read');
 await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 assert.deepEqual(await p.evaluate(()=>{const s=window.__aiExcerpt;return {same:s.node.isConnected&&s.node.firstChild===s.text,body:s.node.textContent===s.body,selection:getSelection().toString()===s.selected};}),{same:true,body:true,selection:true});
 await p.evaluate(()=>{chrome.runtime.sendMessage=window.__aiExcerpt.original;getSelection().removeAllRanges();});
 await eventually(async()=>p.locator('#legacy-evidence-fixture [data-entry-id="'+entry.id+'"] [data-entry-field="body"]').first().textContent().then(x=>x===nextBody),'excerpt rereads current body after selection ends');
 assert.equal((await rpc(p,'GET_LIBRARY_ENTRY',{id:entry.id})).revision,entry.revision+1);
 await quiet(f.h);
 }finally{await f.p.evaluate(()=>{window.__legacyEvidence?.dispose();document.getElementById('legacy-evidence-fixture')?.remove();if(window.__aiExcerpt)chrome.runtime.sendMessage=window.__aiExcerpt.original;else if(window.__aiReflow){chrome.runtime.sendMessage=window.__aiReflow.original;window.__aiReflow.release();}}).catch(()=>{});await f.h.close();}
});

for(const variant of ['source','release'])test(`TOPIC-05.7 cached A never conceals new durable B (${variant})`,{timeout:180000},async()=>{
 const f=await fixture(variant,{count:1});try{const {p,topic}=f;
 const section=await rpc(p,'CREATE_LIBRARY_SECTION',{section:{topicId:topic.id,expectedTopicRevision:(await rpc(p,'GET_LIBRARY_TOPIC',{id:topic.id})).organizationRevision,title:'SYNTHETIC named Section',operationId:crypto.randomUUID()}});
 const b=await rpc(p,'CONTINUE_THINKING',{thought:{topicId:topic.id,sectionId:section.sectionId,body:'SYNTHETIC B not processed\n条件与否定保持不变。',operationId:crypto.randomUUID()}});
 await eventually(async()=>{const rows=(await authority(p)).thoughts;return rows.every(row=>row.indexedSearchVersion===row.searchVersion);},'actual local search indexing completes before read-only snapshot');
 const sections=async()=>(await rpc(p,'GET_LIBRARY_SECTION_PROJECTION',{options:{topicId:topic.id,limit:100}})).items;
 const beforeSections=await sections(),before=await authority(p),saved=await savedRow(p,topic.id);assert.equal(saved.evidenceEntryIds.includes(b.id),false);
 await rawSetAIView(p,true);const body=p.locator(`#original-reading-body [data-entry-id="${b.id}"] [data-entry-field="body"]`);await body.waitFor();assert.equal(await body.innerText(),'SYNTHETIC B not processed\n条件与否定保持不变。');
 assert.equal(await p.locator(`#topic-body [data-entry-id="${b.id}"]`).count(),1);assert.equal(await p.locator('#ai-reading-body [data-entry-field="body"],#ai-reading-body .evolution-stage').count(),0);
 assert.equal(await p.locator(`[data-section-id="${section.sectionId}"] h2`).innerText(),'SYNTHETIC named Section');
 await eventually(()=>p.evaluate(()=>!document.documentElement.classList.contains('paia-recomposing')),'ON transition settles before Entry anchor capture');
 await rawSetAIView(p,false);await eventually(()=>p.evaluate(()=>!document.documentElement.classList.contains('paia-recomposing')));assert.equal(await p.evaluate(()=>scrollY),0,'short page clamps at its natural start');assert.ok(await body.evaluate(n=>{const r=n.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;}),'short page target remains fully visible');await rawSetAIView(p,true);await eventually(()=>p.evaluate(()=>!document.documentElement.classList.contains('paia-recomposing')));
 await p.setViewportSize({width:1440,height:500});await body.evaluate(n=>n.closest('[data-entry-id]').scrollIntoView({block:'center',behavior:'instant'}));const anchor=await body.evaluate(n=>n.closest('[data-entry-id]').getBoundingClientRect().top);
 console.log('AI_OFF_ANCHOR_BEFORE',variant,await body.evaluate(n=>({top:n.closest('[data-entry-id]').getBoundingClientRect().top,scrollY,max:document.documentElement.scrollHeight-innerHeight,height:n.getBoundingClientRect().height,recomposing:document.documentElement.classList.contains('paia-recomposing')})));
 await p.locator('#ai-presentation-toggle').evaluate(n=>n.focus({preventScroll:true}));await p.keyboard.press('Space');await eventually(async()=>!await p.locator('#ai-presentation-toggle').isChecked()&&await p.locator('#ai-presentation-toggle').isEnabled());await body.waitFor();await eventually(()=>p.evaluate(()=>!document.documentElement.classList.contains('paia-recomposing')),'OFF transition settles before Entry anchor comparison');console.log('AI_OFF_ANCHOR_AFTER',variant,await body.evaluate(n=>({top:n.closest('[data-entry-id]').getBoundingClientRect().top,scrollY,max:document.documentElement.scrollHeight-innerHeight,height:n.getBoundingClientRect().height,recomposing:document.documentElement.classList.contains('paia-recomposing')})));await eventually(async()=>Math.abs(await body.evaluate(n=>n.closest('[data-entry-id]').getBoundingClientRect().top)-anchor)<=2,'OFF restores exact Entry-relative anchor within 2px');
 await rawSetAIView(p,true);await body.waitFor();assert.deepEqual(await sections(),beforeSections,'same durable Section IDs names and ranks');assert.deepEqual(await authority(p),before);assert.deepEqual(await savedRow(p,topic.id),saved);
 await p.setViewportSize({width:320,height:900});await rpc(p,'UPDATE_PREFERENCES',{changes:{appearance:'dark'}});await eventually(()=>p.evaluate(()=>document.documentElement.dataset.paiaTheme==='dark'));assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
 await eventually(()=>p.evaluate(()=>!document.documentElement.classList.contains('paia-recomposing')),'completed native view transition before visual capture');
 assert.equal(await p.locator('#topic-heading').count(),1);await screenshotMatrix(p,'durable-ai-sections',variant);
 await p.setViewportSize({width:320,height:900});await p.evaluate(()=>scrollTo(0,0));await p.screenshot({path:`work/consumer-cleanup/${variant}-durable-ai-viewport-top.png`});
 await body.scrollIntoViewIfNeeded();await p.screenshot({path:`work/consumer-cleanup/${variant}-durable-ai-viewport-body.png`});
 const summary=p.locator('[data-ai-saved-fields] > summary'),details=p.locator('[data-ai-saved-fields]');assert.ok((await summary.boundingBox()).height>=44,'narrow native disclosure target');
 await summary.focus();await p.keyboard.press('Enter');assert.equal(await details.evaluate(n=>n.open),true);await p.keyboard.press('Space');assert.equal(await details.evaluate(n=>n.open),false);assert.equal(await summary.evaluate(n=>n===document.activeElement),true);await p.keyboard.press('Enter');
 await p.evaluate(()=>{const n=document.querySelector('[data-ai-field="currentView"]');window.__localeField={node:n,text:n.textContent,first:n.firstChild};n.focus();n.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true,data:'中'}));});
 await rpc(p,'UPDATE_PREFERENCES',{changes:{language:'en'}});await eventually(async()=>await summary.textContent()==='Saved AI organization');assert.equal(await p.locator('[data-ai-field="currentView"]').getAttribute('aria-label'),'Current understanding');
 assert.deepEqual(await p.evaluate(()=>{const s=window.__localeField;return {same:s.node===document.querySelector('[data-ai-field="currentView"]'),first:s.first===s.node.firstChild,text:s.text===s.node.textContent};}),{same:true,first:true,text:true});
 await rpc(p,'UPDATE_PREFERENCES',{changes:{language:'zh-CN'}});await eventually(async()=>await summary.textContent()==='已保存的 AI 整理');await p.evaluate(()=>window.__localeField.node.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:''})));assert.deepEqual(await savedRow(p,topic.id),saved);await verifySavedSummaryAccess(p,variant);assert.deepEqual(await authority(p),before);assert.deepEqual(await savedRow(p,topic.id),saved);await quiet(f.h);
 }finally{await f.h.close();}
});

for(const variant of ['source','release'])test(`TOPIC-05.7 exact repeats reveal original owners without writes (${variant})`,{timeout:180000},async()=>{
 const f=await fixture(variant,{saved:false,count:0});const {p,h,topic}=f;
 try{
  const entries=[];for(let i=0;i<3;i++)entries.push(await rpc(p,'CONTINUE_THINKING',{thought:{topicId:topic.id,body:'SYNTHETIC exact original 👩‍💻 é\n条件与否定不合并。',operationId:crypto.randomUUID()}}));
  const third=await rpc(p,'GET_LIBRARY_ENTRY',{id:entries[2].id});await rpc(p,'EDIT_LIBRARY_BATCH',{edit:{operationId:crypto.randomUUID(),entries:[{id:third.id,expectedRevision:third.revision,expectedFieldRevisions:third.fieldRevisions,expectedInputRevision:third.currentInputRevision,changes:{note:'SYNTHETIC distinct human note'}}]}});
  // Synthetic already-saved cache with actual current revision tokens. This
  // qualifies local reading only and never simulates a generated provider reply.
  await p.evaluate(async({topicId,ids})=>{const {OrganizerStore}=await import('../core/organizer/store.js'),{AI_FIELDS,AI_LIST_FIELDS,AI_SCHEMA_VERSION}=await import('../core/organizer/ai-contract.js'),s=new OrganizerStore(chrome.storage.local);await s.finishFoundation();await s.foundationWrite(async t=>{const versions={};for(const id of ids){const row=await t.get('thoughts',id);versions[id]=JSON.stringify([row.revision,row.dependencyRevision||0,[]]);}await t.put('meta',{id:'aiOrganizerCheckpoint',topicVersions:{[topicId]:versions}});await t.put('meta',{id:'aiPresentation:'+topicId,topicId,schemaVersion:AI_SCHEMA_VERSION,revision:1,evidenceEntryIds:ids,protections:{},...Object.fromEntries(AI_FIELDS.map(key=>[key,AI_LIST_FIELDS.includes(key)?[]:'SYNTHETIC saved field']))});});await s.repository.close();},{topicId:topic.id,ids:entries.map(x=>x.id)});
  await p.reload();await p.locator('#topic-heading h1').filter({hasText:topic.name}).waitFor();await rawSetAIView(p,true);await eventually(()=>p.locator('[data-exact-repeat]').count().then(n=>n===1),'qualified exact repeat disclosure');
  const a=p.locator(`#original-reading-body [data-entry-id="${entries[0].id}"]`),b=p.locator(`#original-reading-body [data-entry-id="${entries[1].id}"]`),c=p.locator(`#original-reading-body [data-entry-id="${entries[2].id}"]`);
  assert.equal(await b.isVisible(),false);assert.equal(await c.isVisible(),true,'different human note cannot be folded');
  await p.setViewportSize({width:320,height:900});await rpc(p,'UPDATE_PREFERENCES',{changes:{appearance:'dark'}});await eventually(()=>p.evaluate(()=>document.documentElement.dataset.paiaTheme==='dark'&&!document.documentElement.classList.contains('paia-recomposing')));const repeatButton=p.locator('[data-exact-repeat]');await repeatButton.scrollIntoViewIfNeeded();assert.ok((await repeatButton.boundingBox()).height>=44);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await p.screenshot({path:`work/consumer-cleanup/${variant}-exact-repeat-320-dark.png`});
  await p.evaluate(ids=>{window.__repeatNodes=ids.map(id=>document.querySelector(`#original-reading-body [data-entry-id="${id}"]`));window.__repeatSource=__repeatNodes.map(n=>({body:n.querySelector('[data-entry-field="body"]').textContent,time:n.querySelector('.entry-sent-time').textContent,note:n.querySelector('[data-entry-field="note"]').value,source:n.querySelector('.entry-provenance')}));const original=chrome.runtime.sendMessage;window.__repeatRPC={original,calls:[]};chrome.runtime.sendMessage=function(...args){__repeatRPC.calls.push(args[0].type);return original.apply(this,args);};},entries.map(x=>x.id));
  const fold=p.locator('[data-exact-repeat]');await fold.focus();await p.keyboard.press('Enter');await b.waitFor({state:'visible'});assert.equal(await fold.count(),0);assert.deepEqual(await p.evaluate(()=>__repeatRPC.calls),[],'expansion itself sends zero RPC');
  assert.equal(await p.evaluate(()=>__repeatNodes.every((n,i)=>n.isConnected&&n.querySelector('[data-entry-field="body"]').textContent===__repeatSource[i].body&&n.querySelector('.entry-sent-time').textContent===__repeatSource[i].time&&n.querySelector('[data-entry-field="note"]').value===__repeatSource[i].note&&n.querySelector('.entry-provenance')===__repeatSource[i].source)),true);
  await p.evaluate(()=>{chrome.runtime.sendMessage=__repeatRPC.original;});
  const before=await authority(p),sectionBefore=(await rpc(p,'GET_LIBRARY_SECTION_PROJECTION',{options:{topicId:topic.id,limit:100}})).items,saved=await savedRow(p,topic.id);
  await p.emulateMedia({reducedMotion:'reduce'});
  await p.evaluate(()=>{__repeatRPC.calls=[];chrome.runtime.sendMessage=function(...args){__repeatRPC.calls.push(args[0].type);return __repeatRPC.original.apply(this,args);};});
  for(let i=0;i<20;i++){await rawSetAIView(p,i%2===1);await eventually(()=>p.evaluate(()=>!document.documentElement.classList.contains('paia-recomposing')));}
  const calls=await p.evaluate(()=>{chrome.runtime.sendMessage=__repeatRPC.original;return __repeatRPC.calls;});console.log('EXACT_REPEAT_LOCAL_READ_RPCS',variant,JSON.stringify(calls.reduce((out,type)=>(out[type]=(out[type]||0)+1,out),{})));assert.ok(calls.every(type=>type.startsWith('GET_')||type==='PAIA_ARCHIVE_NAV_PAGE'),'twenty view toggles use read RPCs only');
  assert.deepEqual(await authority(p),before);assert.deepEqual((await rpc(p,'GET_LIBRARY_SECTION_PROJECTION',{options:{topicId:topic.id,limit:100}})).items,sectionBefore);assert.deepEqual(await savedRow(p,topic.id),saved);
  await quiet(h);
 }finally{await f.h.close();}
});

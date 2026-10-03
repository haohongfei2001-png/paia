import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,rmSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {FakeChatGPT,eventually} from './harness/fake-chatgpt.mjs';
import {openD5ThoughtReading} from './harness/d5-thought-reading.mjs';
const release=mkdtempSync(join(tmpdir(),'paia-d2-years-'));
test.after(()=>rmSync(release,{recursive:true,force:true}));
console.log(execFileSync('python3',['scripts/build_current_release.py',release],{encoding:'utf8'}));
const rpc=async(p,type,fields={})=>{const r=await p.evaluate(x=>chrome.runtime.sendMessage(x),{type,...fields});assert.equal(r?.ok,true,JSON.stringify(r));return r.data;};
for(const variant of ['source','release'])test(`D2 actual years, full-year search, return and mutation fences (${variant})`,{timeout:180000},async()=>{
 const h=await FakeChatGPT.start(variant==='release'?{extensionPath:release}:{}),p=h.archive;let d5;
 try{
  await p.locator('#enable-consent').click();if(await p.locator('#onboarding-skip').isVisible())await p.locator('#onboarding-skip').click();
  const seed=await p.evaluate(async()=>{
   const {OrganizerStore}=await import('../core/organizer/store.js'),s=new OrganizerStore(chrome.storage.local),op=()=>crypto.randomUUID(),topic=await s.createTopic({name:'SYNTHETIC 多年的表达与不确定性',operationId:op()}),ids=[];
   for(let i=0;i<160;i++){s.clock=()=>new Date(Date.UTC(i<100?2021:2023,0,1)+i*1000).toISOString();ids.push((await s.continueThinking({operationId:op(),body:(i===155?'SYNTHETIC_LATE_MATCH ':'SYNTHETIC 表达 '+i+' ')+(i%2?'访谈者说“我不愿意”，我还没做判断。':'我可能更适合消费产品，但现在样本还太少。')+' 👩‍💻 é',topicId:topic.id})).id);}
   await s.foundationWrite(async t=>{for(const receipt of await t.all('operationReceipts'))if(receipt.ownerId===ids[159]){delete receipt.result.independentExpression;await t.put('operationReceipts',receipt);}});
   await s.repository.close();return {topicId:topic.id,ids};
  });
  await p.locator('[data-view="thoughts"]').click();await eventually(()=>p.locator(`[data-topic-id="${seed.topicId}"]`).count().then(n=>n===1));await p.locator(`[data-topic-id="${seed.topicId}"]`).click();
  await eventually(()=>p.locator('#original-reading-body [data-entry-id]').count().then(n=>n>0));
  // A still-composing content editor must never be disposed by the years tab.
  const original=p.locator('#original-reading-body [data-entry-field="body"]').first();await original.focus();await original.evaluate(el=>el.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true,data:'中'})));
  await p.locator('[data-topic-view="years"]').evaluate(el=>el.click());assert.equal(await p.locator('[data-topic-view="content"]').getAttribute('aria-pressed'),'true');
  await original.evaluate(el=>el.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:''})));
  await p.locator('[data-topic-view="years"]').click();
  await eventually(()=>p.locator('[data-open-year="unknown"]').count().then(n=>n===1),'complete year overview',30000);
  assert.match(await p.locator('[data-year-section="2021"]').innerText(),/100/);assert.match(await p.locator('[data-year-section="2023"]').innerText(),/59/);assert.match(await p.locator('[data-year-section="2022"]').innerText(),/没有已收录记录/);
  assert.equal(await p.locator('[data-year-section="2021"] [data-expression-id]').count(),2);assert.equal(await p.locator('[data-year-section="2023"] [data-expression-id]').count(),2);assert.equal(await p.locator('[data-year-section="unknown"] [data-expression-id]').count(),1);
  assert.equal(await p.locator('#original-reading-body [data-entry-id]').count(),0,'content DTO DOM is released while years owns reading');
  mkdirSync('work/qa-dvn-topic-years',{recursive:true});const matrix=[];d5=await openD5ThoughtReading(h,variant,'years');
  for(const appearance of ['light','dark']){await rpc(p,'UPDATE_PREFERENCES',{changes:{appearance}});for(const width of [1440,1280,1024,768,390,320]){await p.setViewportSize({width,height:900});await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)));const overflow=await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth);assert.ok(overflow<=2,`${appearance}/${width}: ${overflow}`);await p.screenshot({path:`work/qa-dvn-topic-years/${variant}-${appearance}-${width}.png`});matrix.push({appearance,width,overflow});await d5.capture(width,appearance);}}
  await d5.verifyPreferences();await d5.verifyTextZoom();await d5.state('known-empty','[data-year-section="2022"]');await d5.state('unknown','[data-year-section="unknown"]');
  await p.setViewportSize({width:1280,height:900});await p.locator('[data-open-year="2021"]').click();
  await eventually(()=>p.locator('#topic-timeline [data-expression-id]').count().then(n=>n>0));
  for(let i=0;i<4;i++){const next=p.locator('[data-timeline-after]');if(!await next.isVisible())break;const before=await p.locator('#topic-timeline [data-expression-id]').count();await next.click();await eventually(async()=>await p.locator('#topic-timeline [data-expression-id]').count()>before||await next.isHidden());}
  await eventually(()=>p.locator('#topic-timeline [data-expression-id]').count().then(n=>n===100));
  const ids=await p.locator('#topic-timeline [data-expression-id]').evaluateAll(nodes=>nodes.map(n=>n.dataset.expressionId));assert.deepEqual(ids,seed.ids.slice(0,100));
  await d5.state('full-year','#topic-timeline>.topic-year-expression');
  const selected=seed.ids[80];await p.locator(`[data-expression-id="${selected}"]`).scrollIntoViewIfNeeded();
  await p.locator('#topic-search').fill('SYNTHETIC_LATE_MATCH');
  await eventually(()=>p.locator(`[data-expression-id="${seed.ids[155]}"]`).count().then(n=>n===1),'full-topic search reaches unmounted later year',30000);
  assert.match(await p.locator('#topic-timeline [data-match-year="2023"]').innerText(),/SYNTHETIC_LATE_MATCH/);
  await p.locator('#back').click();await eventually(()=>p.locator(`[data-topic-id="${seed.topicId}"]`).count().then(n=>n===1));await p.locator(`[data-topic-id="${seed.topicId}"]`).click();
  await eventually(async()=>await p.locator('#topic-timeline').getAttribute('data-timeline-query')==='SYNTHETIC_LATE_MATCH'&&await p.locator(`[data-expression-id="${seed.ids[155]}"]`).count()===1,'root return preserves active search',30000);
  await p.locator('#topic-search').fill('');await eventually(()=>p.locator(`[data-expression-id="${selected}"]`).count().then(n=>n===1),'closing search after root return restores prior full-year extent',30000);
  await p.locator('[data-topic-view="content"]').click();await eventually(()=>p.locator('#original-reading-body [data-entry-id]').count().then(n=>n>0));
  await p.locator('[data-topic-view="years"]').click();await eventually(()=>p.locator(`[data-expression-id="${selected}"]`).count().then(n=>n===1),'tab return retains year extent',30000);
  await p.locator('#back').click();await eventually(()=>p.locator(`[data-topic-id="${seed.topicId}"]`).count().then(n=>n===1));
  assert.equal(await p.locator('#topic-timeline [data-expression-id]').count(),0,'leaving clears hidden canonical DTO DOM');
  await p.locator(`[data-topic-id="${seed.topicId}"]`).click();await eventually(()=>p.locator(`[data-expression-id="${selected}"]`).count().then(n=>n===1),'root return retains year window',30000);
  // A held old read must be cleared on mutation before it can render again.
  await p.evaluate(()=>{const send=chrome.runtime.sendMessage.bind(chrome.runtime);globalThis.__d2Restore=()=>chrome.runtime.sendMessage=send;globalThis.__d2Held=[];chrome.runtime.sendMessage=(message,...args)=>{const result=send(message,...args);return message.type==='GET_LIBRARY_TOPIC_TIMELINE'?Promise.resolve(result).then(value=>new Promise(resolve=>__d2Held.push(()=>resolve(value)))):result;};});
  await p.locator('#topic-search').fill('SYNTHETIC_LATE_MATCH');await eventually(()=>p.evaluate(()=>__d2Held.length>0));
  const entry=await rpc(p,'GET_LIBRARY_ENTRY',{id:seed.ids[155]});await rpc(p,'EDIT_LIBRARY_FIELDS',{edit:{operationId:crypto.randomUUID(),id:entry.id,expectedRevision:entry.revision,expectedFieldRevisions:entry.fieldRevisions,changes:{body:'SYNTHETIC_UPDATED_EXPRESSION'}}});
  await eventually(()=>p.locator('#topic-timeline [data-expression-id]').count().then(n=>n===0));
  await p.evaluate(()=>{__d2Restore();for(const finish of __d2Held)finish();});
  await eventually(()=>p.locator('#topic-timeline').innerText().then(t=>/末尾|End of/.test(t)),'new query result after mutation',30000);assert.ok(!(await p.locator('#topic-timeline').innerText()).includes('SYNTHETIC_LATE_MATCH'));
  await p.locator('#back').click();
  const sparse=await p.evaluate(async()=>{const {OrganizerStore}=await import('../core/organizer/store.js'),s=new OrganizerStore(chrome.storage.local),topic=await s.createTopic({name:'SYNTHETIC sparse query',operationId:crypto.randomUUID()});let first,last;for(let i=0;i<241;i++){s.clock=()=>new Date(Date.UTC(2022,0,1)+i*1000).toISOString();last=await s.continueThinking({operationId:crypto.randomUUID(),topicId:topic.id,body:i===240?'SYNTHETIC_FAR_LATE_MATCH SYNTHETIC_EDGE_MATCH':i===0?'SYNTHETIC_EDGE_MATCH first':'SYNTHETIC unrelated '+i});if(i===0)first=last.id;}await s.repository.close();return {topicId:topic.id,last:last.id,first};});
  await p.locator('[data-view="thoughts"]').click();await eventually(()=>p.locator(`[data-topic-id="${sparse.topicId}"]`).count().then(n=>n===1),'refresh root after out-of-band synthetic store seed');await p.locator(`[data-topic-id="${sparse.topicId}"]`).click();await eventually(()=>p.locator('#original-reading-body [data-entry-id]').count().then(n=>n>0),'sparse Topic content loads');await p.locator('[data-topic-view="years"]').click();await eventually(()=>p.locator('[data-open-year="2022"]').count().then(n=>n===1),'sparse Topic year overview loads');await p.locator('[data-open-year="2022"]').click();await eventually(()=>p.locator('#topic-timeline [data-expression-id]').count().then(n=>n>0),'sparse full-year first page loads');await p.evaluate(()=>{scrollTo(0,document.body.scrollHeight);scrollTo(0,0);});
  await p.locator('#topic-search').fill('SYNTHETIC_FAR_LATE_MATCH');await eventually(async()=>await p.locator('#topic-timeline').getAttribute('data-timeline-query')==='SYNTHETIC_FAR_LATE_MATCH'&&await p.locator(`[data-expression-id="${sparse.last}"]`).count()===1,'sparse full-topic search passes six empty descriptor pages',30000);assert.equal(await p.locator('#topic-timeline [data-expression-id]').count(),1);
  await p.locator('#topic-search').fill('SYNTHETIC_EDGE_MATCH');await eventually(async()=>await p.locator('#topic-timeline').getAttribute('data-timeline-query')==='SYNTHETIC_EDGE_MATCH'&&await p.locator(`[data-expression-id="${sparse.last}"]`).count()===1&&await p.locator('[data-timeline-after]').isHidden(),'both-edge query reaches last match',30000);
  for(let i=0;i<10;i++){if(await p.locator(`[data-expression-id="${sparse.first}"]`).count())break;const before=p.locator('[data-timeline-before]');assert.ok(await before.isVisible());await before.click();await eventually(async()=>await p.locator('#topic-timeline').getAttribute('aria-busy')!=='true');}
  await eventually(()=>p.locator(`[data-expression-id="${sparse.first}"]`).count().then(n=>n===1),'explicit backward reading reaches the first distant match without auto-forward bounce',30000);
  await rpc(p,'UPDATE_PREFERENCES',{changes:{language:'en'}});await eventually(()=>p.locator('[data-topic-view="years"]').textContent().then(t=>t==='Through the years'));await eventually(()=>p.locator('#topic-timeline>h2').textContent().then(t=>t==='Matching expressions in this Topic'));
  await d5.finish();
  assert.equal(h.externalRequests,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.deepSeekRequests.length,0);assert.deepEqual(h.errors,[]);
  writeFileSync(`work/qa-dvn-topic-years/${variant}.json`,JSON.stringify({status:'PASS',headSha:process.env.PAIA_TESTED_HEAD||execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),variant,matrix,dated:159,unknown:1,fullYear:100,queryReturn:true,tabReturn:true,rootReturn:true,imePreserved:true,mutationFence:true,sparseQuery241:true,zeroProviderCalls:true},null,2));
 }finally{try{await d5?.close();}finally{await h.close();}}
});

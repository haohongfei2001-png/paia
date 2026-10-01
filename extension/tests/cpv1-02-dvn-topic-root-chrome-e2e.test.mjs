import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,rmSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {FakeChatGPT,eventually} from './harness/fake-chatgpt.mjs';
const release=mkdtempSync(join(tmpdir(),'paia-d2-root-'));
test.after(()=>rmSync(release,{recursive:true,force:true}));
console.log(execFileSync('python3',['scripts/build_current_release.py',release],{encoding:'utf8'}));
const rpc=async(p,type,fields={})=>{const r=await p.evaluate(x=>chrome.runtime.sendMessage(x),{type,...fields});assert.equal(r?.ok,true,JSON.stringify(r));return r.data;};
const op=()=>crypto.randomUUID();
for(const variant of ['source','release'])test(`D2 compact Topic root migrates grid and renders exact excerpts with actual worker chronology (${variant})`,{timeout:120000},async()=>{
 const h=await FakeChatGPT.start(variant==='release'?{extensionPath:release}:{}),p=h.archive;
 try{
  await p.locator('#enable-consent').click();if(await p.locator('#onboarding-skip').isVisible())await p.locator('#onboarding-skip').click();
  const name='SYNTHETIC 长主题名称 '+('长期保留原话与不确定性 '.repeat(6)),body='  SYNTHETIC 我可能更适合消费产品，但现在样本还太少。👩‍💻 é\n'+('不自动改写结论。'.repeat(30));
  const topic=await rpc(p,'CREATE_LIBRARY_TOPIC',{topic:{name,operationId:op()}}),created=await rpc(p,'CONTINUE_THINKING',{thought:{operationId:op(),body,topicId:topic.id}});
  const original=await rpc(p,'GET_LIBRARY_ENTRY',{id:created.id});
  const excerpt=await rpc(p,'ADD_TO_TOPICS',{selection:{operationId:op(),kind:'thought',id:created.id,expectedRevision:original.revision,span:{start:0,end:11},topicIds:[topic.id]}});
  await p.evaluate(async()=>{const {OrganizerStore}=await import('../core/organizer/store.js'),s=new OrganizerStore(chrome.storage.local);await s.foundationWrite(t=>t.put('meta',{id:'thought-layout:v1',version:1,layout:'grid'}));});
  await p.reload();await p.locator('[data-view="thoughts"]').click();
  await eventually(()=>p.locator(`[data-topic-id="${topic.id}"]`).count().then(n=>n===1));
  assert.equal((await rpc(p,'GET_THOUGHT_LAYOUT')).layout,'list');
  const migration=await p.evaluate(async()=>{const {OrganizerStore}=await import('../core/organizer/store.js'),s=new OrganizerStore(chrome.storage.local);return s.repository.transaction(false,t=>t.get('meta','thought-layout:v1'));});
  assert.equal(migration.previousLayout,'grid');assert.equal(migration.migration,'desktop-vnext-compact');
  const root=await rpc(p,'LIBRARY_INDEX_PAGE',{options:{mode:'stable'}}),cue=root.items.find(x=>x.id===topic.id).rootCue;
  assert.equal(cue.text,body.slice(cue.range.start,cue.range.end));assert.equal(cue.entryId,created.id);
  const row=p.locator(`[data-topic-id="${topic.id}"]`);
  assert.equal(await row.locator('strong').textContent(),name);assert.equal(await row.locator('.summary').evaluate(el=>el.firstChild.textContent),cue.text);
  assert.equal(await p.locator('.topic-grid,.topic-tile').count(),0);
  const timeline=await rpc(p,'GET_LIBRARY_TOPIC_TIMELINE',{options:{topicId:topic.id}});
  assert.equal(timeline.overview.total,2);assert.equal(timeline.overview.unknownCount,1);
  assert.equal(timeline.items.find(x=>x.entry.id===excerpt.id).entry.expressionTime.basis,'unknown');
  mkdirSync('work/qa-dvn-topic-root',{recursive:true});const matrix=[];
  for(const appearance of ['light','dark']){
   await rpc(p,'UPDATE_PREFERENCES',{changes:{appearance}});
   for(const width of [1440,1280,1024,768,390,320]){
    await p.setViewportSize({width,height:900});await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)));
    const overflow=await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth);assert.ok(overflow<=2,`${appearance}/${width}: ${overflow}`);
    const style=await row.evaluate(el=>({border:getComputedStyle(el).borderRadius,title:getComputedStyle(el.querySelector('strong')).webkitLineClamp}));
    assert.equal(style.border,'0px');assert.ok(!style.title||style.title==='none','complete title is not line-clamped');
    await p.screenshot({path:`work/qa-dvn-topic-root/${variant}-${appearance}-${width}.png`});matrix.push({appearance,width,overflow});
   }
  }
  await rpc(p,'UPDATE_PREFERENCES',{changes:{language:'en'}});await eventually(()=>row.locator('small').textContent().then(x=>/Thought excerpt/.test(x)));
  assert.equal((await rpc(p,'GET_LIBRARY_ENTRY',{id:created.id})).body,body);
  await p.evaluate(()=>{const send=chrome.runtime.sendMessage.bind(chrome.runtime);globalThis.__d2RestoreSend=()=>chrome.runtime.sendMessage=send;globalThis.__d2Held=[];chrome.runtime.sendMessage=(message,...args)=>{const result=send(message,...args);return message.type==='LIBRARY_INDEX_PAGE'?Promise.resolve(result).then(value=>new Promise(resolve=>__d2Held.push(()=>resolve(value)))):result;};});
  await p.locator('[data-view="thoughts"]').click();await eventually(()=>p.evaluate(()=>__d2Held.length>0),'root reread is held before mutation');
  const live=await rpc(p,'GET_LIBRARY_ENTRY',{id:created.id}),replacement='SYNTHETIC newer independent expression';
  await rpc(p,'EDIT_LIBRARY_FIELDS',{edit:{operationId:op(),id:live.id,expectedRevision:live.revision,expectedFieldRevisions:live.fieldRevisions,changes:{body:replacement}}});
  await eventually(()=>row.locator('.summary').textContent().then(text=>text===''),'mutation synchronously clears the old transient root cue');
  await p.evaluate(old=>{globalThis.__d2StaleRendered=false;globalThis.__d2CueObserver=new MutationObserver(()=>{if(document.getElementById('thought-list').textContent.includes(old))__d2StaleRendered=true;});__d2CueObserver.observe(document.getElementById('thought-list'),{subtree:true,childList:true,characterData:true});__d2RestoreSend();for(const finish of __d2Held)finish();},cue.text);
  await eventually(()=>row.locator('.summary').textContent().then(text=>text===replacement),'queued fresh read uses the new authoritative text');
  assert.equal(await p.evaluate(()=>__d2StaleRendered),false,'late pre-mutation root response never resurrects its excerpt');await p.evaluate(()=>__d2CueObserver.disconnect());
  assert.equal(h.externalRequests,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.deepSeekRequests.length,0);assert.deepEqual(h.errors,[]);
  writeFileSync(`work/qa-dvn-topic-root/${variant}.json`,JSON.stringify({status:'PASS',headSha:process.env.PAIA_TESTED_HEAD||execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),variant,matrix,migration:true,sourceUnchanged:true,zeroProviderCalls:true},null,2));
 }finally{await h.close();}
});

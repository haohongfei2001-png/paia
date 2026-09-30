import {admitPreGatePurgeBrowserFixture} from './harness/pre-gate-purge-browser-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {FakeChatGPT,eventually} from './harness/fake-chatgpt.mjs';
import {materialKey} from '../core/manual-materials.js';

const rpc=(p,type,fields={})=>p.evaluate(async message=>{
 const result=await chrome.runtime.sendMessage(message);
 if(!result?.ok)throw Error(JSON.stringify(result));
 return result.data;
},{type,...fields});
const originals=[
 'HISTORY_COMPARE 原话：我提出合并，但还没有决定。\n'+('长段限定条件 👩🏽‍💻 <script>只作为字面原话</script>\n'.repeat(600))+'SOURCE_LONG_END',
 'HISTORY_COMPARE 后续修正：我收回合并提议。引用“全部合并更好”不是我的判断。',
 'HISTORY_COMPARE 第三条：保留反例与不确定性。',
 'HISTORY_COMPARE 时间未知：收录不等于表达时刻。'
];
const searchReady=async p=>eventually(async()=>{
 const root=p.locator('#universal-search-dialog');
 return !(await root.locator('.universal-results').getAttribute('aria-busy'))
  && await root.getAttribute('data-query')==='HISTORY_COMPARE'&&await root.locator('.universal-hit').count()===4;
},'complete actual historical query');
const selectTwo=async p=>{
 await p.getByRole('button',{name:'选择并置',exact:true}).nth(0).click();
 await p.getByRole('button',{name:'选择并置',exact:true}).nth(0).click();
 await p.getByRole('button',{name:'并置所选两条',exact:true}).click();
 await eventually(()=>p.locator('.historical-comparison').isVisible(),'explicit comparison');
};

test('VS07 historical comparison keeps complete originals and current edits distinct across scope and deletion',
 {timeout:180000},async()=>{
 const h=await FakeChatGPT.start(),p=h.archive;
 try{
  await p.locator('#consent-check').check();await p.locator('#enable-consent').click();
  await h.open({id:'vs07-comparison-known',title:'Synthetic historical comparison',base:1577836800,
   messages:originals.slice(0,3).map((text,i)=>({id:'vs07-compare-'+i,text}))});
  await h.open({id:'vs07-comparison-unknown',title:'Synthetic unknown time',
   messages:[{id:'vs07-compare-unknown',text:originals[3]}]});
  await eventually(async()=>(await h.state()).records.length===4,'all four full sources captured');
  const initial=await rpc(p,'SEARCH_INPUTS',{options:{universal:true,paged:true,mode:'history',query:'HISTORY_COMPARE',limit:20}});
  assert.equal(initial.items.length,4);
  const original=initial.items.find(x=>x.body===originals[0]);assert.ok(original);
  const block=await rpc(p,'GET_INPUT',{id:original.id});
  await rpc(p,'EDIT_DOCUMENT',{edit:{documentId:block.documentId,operationId:crypto.randomUUID(),blocks:[{
   id:block.id,expectedRevision:block.revision,libraryText:'CURRENT_INPUT_ONLY 当前重写不改当年原话',note:block.note,excluded:false}]}});
  const sourceBefore=(await h.state()).records;
  await p.locator('#primary-nav [data-view="memory"]').click();
  await eventually(()=>p.locator('#material-workbench').isVisible(),'For AI workbench');
  await p.getByRole('button',{name:'从档案选择',exact:true}).click();
  await p.getByRole('button',{name:'按时间看 · 以前的我',exact:true}).click();
  await p.getByRole('searchbox',{name:'全局搜索'}).fill('HISTORY_COMPARE');
  await searchReady(p);
  assert.equal(await p.locator('.universal-hit .historical-body').count(),4);
  assert.equal((await p.locator('.universal-results').textContent()).includes('CURRENT_INPUT_ONLY'),false);
  const row=p.locator('.universal-hit').filter({hasText:'SOURCE_LONG_END'});
  assert.equal(await row.count(),1);
  await row.getByRole('button',{name:'选择并置',exact:true}).click();
  await p.locator('.universal-hit').filter({hasText:'后续修正'}).getByRole('button',{name:'选择并置',exact:true}).click();
  assert.equal(await p.getByRole('button',{name:'选择并置',exact:true}).nth(0).isEnabled(),false,'exactly two admitted sources');
  await p.getByRole('button',{name:'并置所选两条',exact:true}).click();
  const panel=p.getByRole('region',{name:'历史表达对照'});
  await eventually(()=>panel.isVisible());
  assert.deepEqual(await panel.locator('.historical-body').allTextContents(),originals.slice(0,2));
  assert.ok((await panel.textContent()).includes('并置不代表观点变化'));
  assert.equal(await panel.locator('script').count(),0,'original HTML is literal text');
  assert.equal(await p.evaluate(()=>document.activeElement.classList.contains('historical-comparison')),true);
  const working=panel.locator('.historical-evidence').filter({hasText:'SOURCE_LONG_END'}).locator('.historical-working');
  await working.locator('summary').click();
  assert.equal(await working.locator('.historical-working-body').textContent(),'CURRENT_INPUT_ONLY 当前重写不改当年原话');
  const projected=await rpc(p,'SEARCH_INPUTS',{options:{universal:true,paged:true,mode:'history',query:'HISTORY_COMPARE',limit:20}});
  const actual=projected.items.find(x=>x.id===original.id);
  assert.equal(actual.body,originals[0]);assert.notEqual(actual.sourceSentAt,actual.working.editedAt);
  assert.equal(actual.working.revision,1);assert.ok(actual.working.editedAt);
  assert.equal(await panel.locator('.historical-source').count(),2);
  // A second real edit revokes a comparison containing the older current Input.
  const editedBlock=await rpc(p,'GET_INPUT',{id:original.id});
  await rpc(p,'EDIT_DOCUMENT',{edit:{documentId:editedBlock.documentId,operationId:crypto.randomUUID(),blocks:[{
   id:editedBlock.id,expectedRevision:editedBlock.revision,libraryText:'CURRENT_INPUT_SECOND 第二次工作修正',note:editedBlock.note,excluded:false}]}});
  await searchReady(p);
  assert.equal(await p.locator('.historical-comparison').count(),0,'working edit revokes stale projected comparison');
  assert.equal(await p.getByRole('button',{name:'并置所选两条',exact:true}).isEnabled(),false);
  await row.getByRole('button',{name:'选择并置',exact:true}).click();
  await p.locator('.universal-hit').filter({hasText:'后续修正'}).getByRole('button',{name:'选择并置',exact:true}).click();
  await p.getByRole('button',{name:'并置所选两条',exact:true}).click();
  await eventually(()=>panel.isVisible());
  assert.deepEqual(await panel.locator('.historical-body').allTextContents(),originals.slice(0,2));
  assert.equal(await panel.locator('.historical-working-body').first().textContent(),'CURRENT_INPUT_SECOND 第二次工作修正');
  await p.setViewportSize({width:390,height:844});
  assert.equal(await panel.locator('.historical-comparison-columns').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length),1);
  assert.equal(await panel.evaluate(el=>el.scrollWidth<=el.clientWidth+1),true,'full long evidence has no horizontal overflow');
  const dir=new URL('../work/vs07-history-comparison/',import.meta.url);await mkdir(dir,{recursive:true});
  await p.screenshot({path:new URL('comparison-narrow.png',dir).pathname,fullPage:false});
  await rpc(p,'UPDATE_PREFERENCES',{changes:{language:'en'}});
  await eventually(()=>p.getByRole('region',{name:'Historical expression comparison'}).isVisible());
  assert.deepEqual(await p.locator('.historical-comparison .historical-body').allTextContents(),originals.slice(0,2));
  await p.getByRole('button',{name:'Close comparison',exact:true}).click();
  assert.equal(await p.locator('.historical-comparison').count(),0);
  assert.equal(await p.getByRole('button',{name:'Compare two records',exact:true}).isEnabled(),true);
  await rpc(p,'UPDATE_PREFERENCES',{changes:{language:'zh-CN'}});
  await eventually(()=>p.getByRole('button',{name:'并置所选两条',exact:true}).isVisible());
  await p.getByRole('button',{name:'并置所选两条',exact:true}).click();
  await p.locator('.universal-filters > summary').click();
  await p.getByLabel('到日期',{exact:true}).fill('2021-12-31');
  await p.getByLabel('到日期',{exact:true}).press('Tab');
  await eventually(async()=>await p.locator('.universal-hit').count()===3&&!await p.locator('.universal-results').getAttribute('aria-busy'));
  assert.equal(await p.locator('.historical-comparison').count(),0);
  assert.equal(await p.getByRole('button',{name:'并置所选两条',exact:true}).isEnabled(),false);
  await p.getByLabel('到日期',{exact:true}).fill('');
  await p.getByLabel('到日期',{exact:true}).press('Tab');
  await searchReady(p);
  await selectTwo(p);
  // Hold one actual server read, then delete a real source. Its late response
  // must never repaint the original or reconstruct an old comparison.
  await p.evaluate(()=>{
   const send=chrome.runtime.sendMessage.bind(chrome.runtime);let release;
   globalThis.__historyReadStarted=false;
   globalThis.__historyReadGate=new Promise(r=>{release=r;});globalThis.__releaseHistoryRead=release;
   chrome.runtime.sendMessage=async(...args)=>{
    const result=await send(...args);
    if(!globalThis.__historyReadStarted&&args[0]?.type==='SEARCH_INPUTS'&&args[0].options?.query==='HISTORY_COMPARE 原话'){
     globalThis.__historyReadStarted=true;await globalThis.__historyReadGate;
    }return result;
   };
  });
  await p.getByRole('searchbox',{name:'全局搜索'}).fill('HISTORY_COMPARE 原话');
  assert.equal(await p.locator('.historical-comparison').count(),0,'query input immediately revokes comparison');
  await eventually(()=>p.evaluate(()=>globalThis.__historyReadStarted),'actual old search response held');
  await admitPreGatePurgeBrowserFixture(p,original.ref.sourceId);
  await p.getByRole('searchbox',{name:'全局搜索'}).fill('HISTORY_COMPARE');
  await eventually(async()=>await p.locator('.universal-hit').count()===3
   &&await p.locator('#universal-search-dialog').getAttribute('data-query')==='HISTORY_COMPARE'
   &&!await p.locator('.universal-results').getAttribute('aria-busy'),'post-purge current scope');
  await p.evaluate(()=>globalThis.__releaseHistoryRead());
  await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  assert.equal(await p.locator('.historical-comparison').count(),0);
  assert.equal((await p.locator('.universal-results').textContent()).includes('SOURCE_LONG_END'),false);
  assert.equal(await p.getByRole('button',{name:'并置所选两条',exact:true}).isEnabled(),false);
  const after=(await h.state()).records;
  assert.equal(after.length,3);assert.deepEqual(after,sourceBefore.filter(r=>r.id!==original.ref.sourceId));
  assert.equal(h.deepSeekRequests.length,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.externalRequests,0);
  assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});

test('VS07 historical paging refuses changed generations without mixing old comparison evidence',
 {timeout:120000},async()=>{
 const h=await FakeChatGPT.start(),p=h.archive;
 try{
  await p.locator('#consent-check').check();await p.locator('#enable-consent').click();
  const texts=Array.from({length:42},(_,i)=>'HISTORY_PAGE 合成独立原文 '+i);
  await h.open({id:'vs07-history-paging',title:'Synthetic history paging',base:1577836800,
   messages:texts.map((text,i)=>({id:'vs07-history-page-'+i,text}))});
  await eventually(async()=>(await h.state()).records.length===42,'all 42 sources captured');
  const sources=(await h.state()).records;
  await p.locator('#primary-nav [data-view="memory"]').click();
  await eventually(()=>p.locator('#material-workbench').isVisible());
  await p.getByRole('button',{name:'从档案选择',exact:true}).click();
  await p.getByRole('button',{name:'按时间看 · 以前的我',exact:true}).click();
  await p.getByRole('searchbox',{name:'全局搜索'}).fill('HISTORY_PAGE');
  await eventually(async()=>await p.locator('.universal-hit').count()===40
   &&!await p.locator('.universal-results').getAttribute('aria-busy'),'first finite page');
  await p.locator('.universal-hit input[type=checkbox]').first().check();
  await selectTwo(p);
  await p.evaluate(()=>{
   const send=chrome.runtime.sendMessage.bind(chrome.runtime);
   globalThis.__historyPageEvidence=[];
   chrome.runtime.sendMessage=async(...args)=>{
    const result=await send(...args);
    if(args[0]?.type==='SEARCH_INPUTS'&&args[0].options?.cursor)
     globalThis.__historyPageEvidence.push({changed:result.data?.changed,generation:result.data?.generation});
    return result;
   };
  });
  await h.open({id:'vs07-history-later',title:'Later capture',base:1640995200,
   messages:[{id:'vs07-page-added',text:'HISTORY_PAGE new source after fixed page'}]});
  await eventually(async()=>(await h.state()).records.length===43,'actual new source changes generation');
  await p.getByRole('button',{name:'继续按时间读取',exact:true}).click();
  await eventually(async()=>await p.evaluate(()=>globalThis.__historyPageEvidence.some(x=>x.changed===true)),
   'actual server detects stale paging generation');
  await eventually(async()=>(await p.locator('.universal-status').textContent()).includes('范围刚有变化'));
  assert.equal(await p.locator('.historical-comparison').count(),0);
  assert.equal(await p.locator('.universal-hit').count(),0,'no mixed-generation old or new page');
  assert.ok((await p.locator('.universal-selection').textContent()).includes('(1)'),'explicit material selection retained');
  const all=(await h.state()).records;
  assert.deepEqual(all.filter(r=>sources.some(s=>s.id===r.id)),sources);
  await p.getByRole('searchbox',{name:'全局搜索'}).press('Enter');
  await eventually(async()=>await p.locator('.universal-hit').count()===40
   &&!await p.locator('.universal-results').getAttribute('aria-busy'),'explicit fresh scope');
  assert.equal(await p.getByRole('button',{name:'并置所选两条',exact:true}).isEnabled(),false);
  assert.equal(h.deepSeekRequests.length,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.externalRequests,0);
  assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});


async function searchLifetimeFixture(){
 const h=await FakeChatGPT.start(),p=h.archive;
 try{
  await p.locator('#consent-check').check();await p.locator('#enable-consent').click();
  const texts=Array.from({length:42},(_,i)=>'SEARCH_LIFETIME 合成独立原文 '+i+
   (i===41?'\n'+'完整长研究 👩🏽‍💻 <script>原文非指令</script>\n'.repeat(1000)+'LIFETIME_LONG_END':''));
  await h.open({id:'vs07-search-lifetime',title:'Synthetic search lifetime',base:1577836800,
   messages:texts.map((text,i)=>({id:'vs07-search-lifetime-'+i,text}))});
  await eventually(async()=>{const rows=(await h.state()).records;return rows.length===42&&rows.every(row=>row.sourceSentAt);},
   'all42 complete known-time Sources captured');
  const sources=(await h.state()).records;
  assert.deepEqual(new Set(sources.map(row=>row.originalText)),new Set(texts),
   'every complete body, including1000paragraphs, must be present');
  await p.locator('#primary-nav [data-view="memory"]').click();
  await eventually(()=>p.locator('#material-workbench').isVisible());
  await p.getByRole('button',{name:'从档案选择',exact:true}).click();
  await p.getByRole('button',{name:'按时间看 · 以前的我',exact:true}).click();
  await p.getByRole('searchbox',{name:'全局搜索'}).fill('SEARCH_LIFETIME');
  await eventually(async()=>await p.locator('.universal-hit').count()===40
   &&!await p.locator('.universal-results').getAttribute('aria-busy'),'first exact page');
  await p.locator('.universal-hit input[type=checkbox]').first().check();
  return {h,p,sources,texts};
 }catch(error){await h.close();throw error;}
}

for(const boundary of ['query','filter','page'])
test('VS07 search read failure clears unchecked '+boundary+' results and preserves explicit selection',
 {timeout:180000},async()=>{
 const {h,p,sources}=await searchLifetimeFixture();
 try{
  await selectTwo(p);
  await p.evaluate(()=>{
   const send=chrome.runtime.sendMessage.bind(chrome.runtime);
   globalThis.__failNextLifetimeRead=true;globalThis.__lifetimeReadFailure=false;
   chrome.runtime.sendMessage=async(...args)=>{
    const result=await send(...args);
    if(args[0]?.type==='SEARCH_INPUTS'&&globalThis.__failNextLifetimeRead){
     globalThis.__failNextLifetimeRead=false;globalThis.__lifetimeReadFailure=true;
     return {ok:false,error:'STORAGE_FAILED'};
    }return result;
   };
  });
  if(boundary==='query')await p.getByRole('searchbox',{name:'全局搜索'}).fill('SEARCH_LIFETIME missing');
  else if(boundary==='filter'){
   await p.locator('.universal-filters > summary').click();
   await p.getByLabel('到日期',{exact:true}).fill('2020-12-31');
   await p.getByLabel('到日期',{exact:true}).press('Tab');
  }else await p.getByRole('button',{name:'继续按时间读取',exact:true}).click();
  await eventually(async()=>await p.evaluate(()=>globalThis.__lifetimeReadFailure)
   &&(await p.locator('.universal-status').textContent()).includes('当前范围未能查完')
   &&!await p.locator('.universal-results').getAttribute('aria-busy'),'actual failed read handled');
  assert.equal(await p.locator('.universal-hit').count(),0);
  assert.equal(await p.locator('.historical-comparison').count(),0);
  assert.equal(await p.locator('#universal-search-dialog').getAttribute('data-query'),null);
  assert.ok((await p.locator('.universal-selection').textContent()).includes('(1)'));
  assert.equal(await p.getByRole('button',{name:'下一页',exact:true}).count(),0);
  assert.equal(await p.getByRole('button',{name:'继续按时间读取',exact:true}).count(),0);
  // A localization render cannot turn the failed scope back into old healthy hits.
  await p.evaluate(()=>{document.documentElement.lang='en';});
  await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  assert.equal(await p.locator('.universal-hit').count(),0);
  assert.ok((await p.locator('.universal-status').textContent()).includes('当前范围未能查完'));
  await p.evaluate(()=>{document.documentElement.lang='zh-CN';});
  await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await p.getByRole('searchbox',{name:'全局搜索'}).fill('SEARCH_LIFETIME');
  await p.getByRole('searchbox',{name:'全局搜索'}).press('Enter');
  await eventually(async()=>await p.locator('.universal-hit').count()===40
   &&!await p.locator('.universal-results').getAttribute('aria-busy'),'explicit fresh search');
  assert.deepEqual((await h.state()).records,sources);
  assert.equal(h.deepSeekRequests.length,0);assert.equal(h.extensionNetworkRequests,0);
  assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});

for(const outcome of ['success','failure'])
test('VS07 superseded whole-result enumeration '+outcome+' cannot release a newer search fence',
 {timeout:180000},async()=>{
 const {h,p,sources}=await searchLifetimeFixture();
 try{
  await p.evaluate(mode=>{
   const send=chrome.runtime.sendMessage.bind(chrome.runtime);let oldRelease,newRelease;
   globalThis.__oldLifetimeGate=new Promise(r=>{oldRelease=r;});
   globalThis.__newLifetimeGate=new Promise(r=>{newRelease=r;});
   globalThis.__releaseOldLifetime=oldRelease;globalThis.__releaseNewLifetime=newRelease;
   globalThis.__oldLifetimeStarted=false;globalThis.__newLifetimeStarted=false;
   globalThis.__oldLifetimeDone=false;globalThis.__lifetimeConfirmations=0;
   window.confirm=()=>{globalThis.__lifetimeConfirmations++;return true;};
   chrome.runtime.sendMessage=async(...args)=>{
    const result=await send(...args),message=args[0];
    if(message?.type==='SEARCH_INPUTS'&&message.options?.query==='SEARCH_LIFETIME'
       &&!globalThis.__oldLifetimeStarted){
     globalThis.__oldLifetimeStarted=true;await globalThis.__oldLifetimeGate;
     globalThis.__oldLifetimeDone=true;
     return mode==='failure'?{ok:false,error:'STORAGE_FAILED'}:result;
    }
    if(message?.type==='SEARCH_INPUTS'&&message.options?.query==='SEARCH_LIFETIME 合成独立原文 1'
       &&!globalThis.__newLifetimeStarted){
     globalThis.__newLifetimeStarted=true;await globalThis.__newLifetimeGate;
    }return result;
   };
  },outcome);
  await p.getByRole('button',{name:'全选全部结果',exact:true}).click();
  await eventually(()=>p.evaluate(()=>globalThis.__oldLifetimeStarted),'old actual enumeration held');
  await p.getByRole('searchbox',{name:'全局搜索'}).fill('SEARCH_LIFETIME 合成独立原文 1');
  await eventually(()=>p.evaluate(()=>globalThis.__newLifetimeStarted),'new actual query held');
  assert.equal(await p.locator('.universal-hit').count(),0,'new scope immediately retires old hits');
  await p.evaluate(()=>globalThis.__releaseOldLifetime());
  await eventually(()=>p.evaluate(()=>globalThis.__oldLifetimeDone),'old actual response released');
  await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  assert.deepEqual(await p.evaluate(()=>({
   busy:document.querySelector('.universal-results').getAttribute('aria-busy'),
   selection:document.querySelector('.universal-selection').inert,
   paging:document.querySelector('.universal-pagination').inert,
   results:document.querySelector('.universal-results').inert,
   confirms:globalThis.__lifetimeConfirmations,
  })),{busy:'true',selection:true,paging:true,results:true,confirms:0});
  assert.ok((await p.locator('.universal-status').textContent()).includes('正在查找本机文字'));
  assert.ok((await p.locator('.universal-selection').textContent()).includes('(1)'));
  await p.evaluate(()=>globalThis.__releaseNewLifetime());
  await eventually(async()=>await p.locator('.universal-hit').count()===11
   &&!await p.locator('.universal-results').getAttribute('aria-busy'),'new actual scope completes');
  assert.equal(await p.locator('#universal-search-dialog').getAttribute('data-query'),'SEARCH_LIFETIME 合成独立原文 1');
  assert.equal(await p.locator('.universal-selection').evaluate(el=>el.inert),false);
  assert.equal(await p.evaluate(()=>globalThis.__lifetimeConfirmations),0);
  assert.deepEqual((await h.state()).records,sources);
  assert.equal(h.deepSeekRequests.length,0);assert.equal(h.extensionNetworkRequests,0);
  assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});

const currentRefreshBody='SEARCH_LIFETIME CURRENT_REFRESH_ONLY 当前完整修正。\n'
 +'完整当前表达 👩🏽‍💻 <script>仍为原文字面</script>\n'.repeat(1000)+'CURRENT_REFRESH_LONG_END';
const currentReady=async p=>eventually(async()=>await p.locator('.universal-hit').count()===40
 &&await p.locator('#universal-search-dialog').getAttribute('data-query')==='SEARCH_LIFETIME'
 &&!await p.locator('.universal-results').getAttribute('aria-busy'),'complete current query');
const frames=p=>p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
async function currentMaintenanceReady(p,count){
 let priorGeneration=null;
 await eventually(async()=>{
  const filter=await rpc(p,'FILTER_STATUS');
  if(filter.taskState==='failed')throw Error('Actual Smart Filter maintenance failed');
  if(filter.taskState==='running'||(filter.mode!=='off'&&filter.pending))return false;
  const foundation=await rpc(p,'GET_LIBRARY_FOUNDATION_STATUS');
  if(foundation.pendingCleanupJobs||foundation.pendingInvalidations||!foundation.compatibility.complete)return false;
  const page=await rpc(p,'SEARCH_INPUTS',{options:{universal:true,paged:true,mode:'current',query:'SEARCH_LIFETIME',limit:100}});
  if(!page.complete||page.items.length!==count){priorGeneration=null;return false;}
  const stable=priorGeneration===page.generation;priorGeneration=page.generation;
  return stable;
 },'actual filter/library completion and stable complete current generation');
}
async function currentLifetimeFixture(){
 const fixture=await searchLifetimeFixture(),{p}=fixture;
 try{
  await p.getByRole('button',{name:'全部结果',exact:true}).click();await currentReady(p);
  await currentMaintenanceReady(p,42);
  await p.getByRole('searchbox',{name:'全局搜索'}).press('Enter');await currentReady(p);
  const page=await rpc(p,'SEARCH_INPUTS',{options:{universal:true,paged:true,mode:'current',query:'SEARCH_LIFETIME',limit:100}});
  assert.equal(page.items.length,42);assert.equal(page.complete,true);
  const block=await rpc(p,'GET_INPUT',{id:page.items[0].id});
  return {...fixture,block,generation:page.generation};
 }catch(error){await fixture.h.close();throw error;}
}
const editCurrent=async(p,block)=>rpc(p,'EDIT_DOCUMENT',{edit:{documentId:block.documentId,
 operationId:crypto.randomUUID(),blocks:[{id:block.id,expectedRevision:block.revision,
 libraryText:currentRefreshBody,note:block.note,excluded:false}]}});
async function assertCurrentFullAuthority({h,p,sources,block}){
 const page=await rpc(p,'SEARCH_INPUTS',{options:{universal:true,paged:true,mode:'history',query:'SEARCH_LIFETIME',limit:100}});
 const row=page.items.find(x=>x.id===block.id);assert.ok(row);
 assert.equal(row.working.body,currentRefreshBody);assert.equal(row.working.revision,block.revision+1);
 assert.equal(row.body,sources.find(x=>x.id===row.ref.sourceId).originalText);
 assert.deepEqual((await h.state()).records,sources,'all42 complete originals stay unchanged');
 assert.equal(h.deepSeekRequests.length,0);assert.equal(h.extensionNetworkRequests,0);
 assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);
}
async function notifyCurrent(h,cause){
 const worker=h.context.serviceWorkers().find(w=>w.url().endsWith('/background/service-worker.js'));
 assert.ok(worker);
 await worker.evaluate(message=>chrome.runtime.sendMessage(message).catch(()=>{}),
  cause===undefined?{type:'ARCHIVE_CHANGED'}:{type:'ARCHIVE_CHANGED',cause});
}

for(const visibility of ['visible','hidden'])
test('VS07 current search real edit retires '+visibility+' results and refreshes full working evidence',
 {timeout:180000},async()=>{
 const fixture=await currentLifetimeFixture(),{h,p,block}=fixture;
 try{
  if(visibility==='hidden'){
   await p.evaluate(()=>document.dispatchEvent(new CustomEvent('paia:search-close')));
   assert.equal(await p.locator('#universal-search-dialog').isVisible(),false);
  }
  await editCurrent(p,block);
  if(visibility==='hidden'){
   await eventually(async()=>await p.locator('.universal-hit').count()===0
    &&await p.locator('#universal-search-dialog').getAttribute('data-query')===null,'hidden scope retired');
   assert.equal(await p.locator('.universal-results').getAttribute('aria-busy'),null);
   assert.equal(await p.locator('.universal-pagination button:not([hidden])').count(),0);
   await p.evaluate(()=>{document.documentElement.lang='en';});await frames(p);
   assert.equal(await p.locator('.universal-hit').count(),0);
   assert.ok((await p.locator('.universal-status').textContent()).includes('材料已变化'));
   await p.evaluate(()=>{document.documentElement.lang='zh-CN';
    document.dispatchEvent(new CustomEvent('paia:search-open'));});
  }
  await eventually(async()=>(await p.locator('.universal-results').textContent()).includes('CURRENT_REFRESH_ONLY'),
   'actual edited current body published');
  await currentReady(p);
  assert.ok((await p.locator('.universal-results').textContent()).includes('CURRENT_REFRESH_ONLY'));
  assert.ok((await p.locator('.universal-selection').textContent()).includes('(1)'));
  await assertCurrentFullAuthority(fixture);
 }finally{await h.close();}
});

for(const outcome of ['success','failure'])
test('VS07 current edit fences an older actual query '+outcome+' without releasing the newer scope',
 {timeout:180000},async()=>{
 const fixture=await currentLifetimeFixture(),{h,p,block}=fixture;
 try{
  await p.evaluate(mode=>{
   const send=chrome.runtime.sendMessage.bind(chrome.runtime);let oldRelease,newRelease;
   globalThis.__currentOldGate=new Promise(r=>{oldRelease=r;});
   globalThis.__currentNewGate=new Promise(r=>{newRelease=r;});
   globalThis.__releaseCurrentOld=oldRelease;globalThis.__releaseCurrentNew=newRelease;
   globalThis.__currentOldStarted=false;globalThis.__currentNewStarted=false;globalThis.__currentOldDone=false;
   chrome.runtime.sendMessage=async(...args)=>{
    const result=await send(...args),o=args[0]?.options;
    if(args[0]?.type==='SEARCH_INPUTS'&&o?.universal&&o.mode==='current'&&o.query==='SEARCH_LIFETIME'){
     if(!globalThis.__currentOldStarted){globalThis.__currentOldStarted=true;await globalThis.__currentOldGate;
      globalThis.__currentOldDone=true;return mode==='failure'?{ok:false,error:'STORAGE_FAILED'}:result;}
     globalThis.__currentNewStarted=true;await globalThis.__currentNewGate;
    }return result;
   };
  },outcome);
  await p.getByRole('searchbox',{name:'全局搜索'}).press('Enter');
  await eventually(()=>p.evaluate(()=>globalThis.__currentOldStarted),'old actual current read held');
  await editCurrent(p,block);
  await eventually(()=>p.evaluate(()=>globalThis.__currentNewStarted),'real edit starts a fresh current read');
  assert.equal(await p.locator('.universal-hit').count(),0);
  assert.equal(await p.locator('#universal-search-dialog').getAttribute('data-query'),null);
  await p.evaluate(()=>globalThis.__releaseCurrentOld());
  await eventually(()=>p.evaluate(()=>globalThis.__currentOldDone));await frames(p);
  assert.deepEqual(await p.evaluate(()=>({
   busy:document.querySelector('.universal-results').getAttribute('aria-busy'),
   inert:document.querySelector('.universal-results').inert,
   selection:document.querySelector('.universal-selection').inert,
   paging:document.querySelector('.universal-pagination').inert
  })),{busy:'true',inert:true,selection:true,paging:true});
  assert.ok((await p.locator('.universal-status').textContent()).includes('正在查找本机文字'));
  assert.ok((await p.locator('.universal-selection').textContent()).includes('(1)'));
  await p.evaluate(()=>globalThis.__releaseCurrentNew());await currentReady(p);
  assert.ok((await p.locator('.universal-results').textContent()).includes('CURRENT_REFRESH_ONLY'));
  await assertCurrentFullAuthority(fixture);
 }finally{await h.close();}
});

test('VS07 current mutation refresh failure stays unavailable through localization and explicit retry',
 {timeout:180000},async()=>{
 const fixture=await currentLifetimeFixture(),{h,p,block}=fixture;
 try{
  await p.evaluate(()=>{
   const send=chrome.runtime.sendMessage.bind(chrome.runtime);globalThis.__currentFail=true;
   chrome.runtime.sendMessage=async(...args)=>{
    const result=await send(...args),o=args[0]?.options;
    return args[0]?.type==='SEARCH_INPUTS'&&o?.universal&&o.mode==='current'&&globalThis.__currentFail
     ?{ok:false,error:'STORAGE_FAILED'}:result;
   };
  });
  await editCurrent(p,block);
  await eventually(async()=>!(await p.locator('.universal-results').getAttribute('aria-busy'))
   &&(await p.locator('.universal-status').textContent()).includes('当前范围未能查完'));
  assert.equal(await p.locator('.universal-hit').count(),0);
  assert.equal(await p.locator('#universal-search-dialog').getAttribute('data-query'),null);
  assert.equal(await p.locator('.universal-pagination button:not([hidden])').count(),0);
  assert.ok((await p.locator('.universal-selection').textContent()).includes('(1)'));
  await p.evaluate(()=>{document.documentElement.lang='en';});await frames(p);
  assert.equal(await p.locator('.universal-hit').count(),0);
  assert.ok((await p.locator('.universal-status').textContent()).includes('当前范围未能查完'));
  await p.evaluate(()=>{globalThis.__currentFail=false;document.documentElement.lang='zh-CN';});
  await p.getByRole('searchbox',{name:'全局搜索'}).press('Enter');await currentReady(p);
  assert.ok((await p.locator('.universal-results').textContent()).includes('CURRENT_REFRESH_ONLY'));
  await assertCurrentFullAuthority(fixture);
 }finally{await h.close();}
});

test('VS07 current unlabelled eligibility completion rereads while benign notifications preserve the query',
 {timeout:180000},async()=>{
 const {h,p,sources}=await currentLifetimeFixture();
 try{
  await p.evaluate(()=>{
   const send=chrome.runtime.sendMessage.bind(chrome.runtime);globalThis.__currentReadCount=0;
   chrome.runtime.sendMessage=async(...args)=>{
    const o=args[0]?.options;
    if(args[0]?.type==='SEARCH_INPUTS'&&o?.universal&&o.mode==='current')globalThis.__currentReadCount++;
    return send(...args);
   };
  });
  for(const cause of ['UPDATE_PREFERENCES','RECORD_TOPIC_READ','SET_ONBOARDING'])await notifyCurrent(h,cause);
  await frames(p);assert.equal(await p.evaluate(()=>globalThis.__currentReadCount),0);
  assert.equal(await p.locator('.universal-hit').count(),40);
  await notifyCurrent(h,undefined);
  await eventually(()=>p.evaluate(()=>globalThis.__currentReadCount===1),'actual unlabelled notification reread');
  await currentReady(p);
  assert.ok((await p.locator('.universal-selection').textContent()).includes('(1)'));
  assert.deepEqual((await h.state()).records,sources);
  assert.equal(h.deepSeekRequests.length,0);assert.equal(h.extensionNetworkRequests,0);
  assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});

test('VS07 current mutation during composition retires results without searching unfinished input',
 {timeout:180000},async()=>{
 const fixture=await currentLifetimeFixture(),{h,p,block}=fixture;
 try{
  await p.evaluate(()=>{
   const send=chrome.runtime.sendMessage.bind(chrome.runtime);globalThis.__compositionSearches=[];
   chrome.runtime.sendMessage=async(...args)=>{
    const o=args[0]?.options;
    if(args[0]?.type==='SEARCH_INPUTS'&&o?.universal&&o.mode==='current')globalThis.__compositionSearches.push(o.query);
    return send(...args);
   };
   const input=document.querySelector('.universal-search-box input');
   input.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true,data:'未完成'}));
  });
  await editCurrent(p,block);
  await eventually(async()=>(await p.locator('.universal-status').textContent()).includes('材料已变化'),
   'real mutation notification received while composing');
  await frames(p);
  assert.deepEqual(await p.evaluate(()=>globalThis.__compositionSearches),[]);
  assert.equal(await p.locator('.universal-hit').count(),0);
  assert.equal(await p.locator('#universal-search-dialog').getAttribute('data-query'),null);
  assert.equal(await p.locator('.universal-results').getAttribute('aria-busy'),'true');
  assert.equal(await p.locator('.universal-selection').evaluate(el=>el.inert),true);
  await p.evaluate(()=>document.querySelector('.universal-search-box input')
   .dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:'已完成'})));
  await currentReady(p);
  assert.deepEqual(await p.evaluate(()=>globalThis.__compositionSearches),['SEARCH_LIFETIME']);
  assert.ok((await p.locator('.universal-results').textContent()).includes('CURRENT_REFRESH_ONLY'));
  await assertCurrentFullAuthority(fixture);
 }finally{await h.close();}
});

for(const outcome of ['success','failure'])
test('VS07 current edit cancels whole-result enumeration '+outcome+' without confirmation or old selection expansion',
 {timeout:180000},async()=>{
 const fixture=await currentLifetimeFixture(),{h,p,block}=fixture;
 try{
  await p.evaluate(mode=>{
   const send=chrome.runtime.sendMessage.bind(chrome.runtime);let oldRelease,newRelease;
   globalThis.__currentEnumGate=new Promise(r=>{oldRelease=r;});
   globalThis.__currentRefreshGate=new Promise(r=>{newRelease=r;});
   globalThis.__releaseCurrentEnum=oldRelease;globalThis.__releaseCurrentRefresh=newRelease;
   globalThis.__currentEnumStarted=false;globalThis.__currentRefreshStarted=false;
   globalThis.__currentEnumDone=false;globalThis.__currentConfirmations=0;
   window.confirm=()=>{globalThis.__currentConfirmations++;return true;};
   chrome.runtime.sendMessage=async(...args)=>{
    const result=await send(...args),o=args[0]?.options;
    if(args[0]?.type==='SEARCH_INPUTS'&&o?.universal&&o.mode==='current'&&o.query==='SEARCH_LIFETIME'){
     if(o.limit===40&&!globalThis.__currentEnumStarted
       &&document.querySelector('.universal-status').textContent==='正在枚举全部结果…'){
      globalThis.__currentEnumStarted=true;await globalThis.__currentEnumGate;globalThis.__currentEnumDone=true;
      return mode==='failure'?{ok:false,error:'STORAGE_FAILED'}:result;
     }
     if(o.limit===40){globalThis.__currentRefreshStarted=true;await globalThis.__currentRefreshGate;}
    }return result;
   };
  },outcome);
  await p.getByRole('button',{name:'全选全部结果',exact:true}).click();
  await eventually(()=>p.evaluate(()=>globalThis.__currentEnumStarted));
  await editCurrent(p,block);
  await eventually(()=>p.evaluate(()=>globalThis.__currentRefreshStarted));
  await p.evaluate(()=>globalThis.__releaseCurrentEnum());
  await eventually(()=>p.evaluate(()=>globalThis.__currentEnumDone));await frames(p);
  assert.equal(await p.evaluate(()=>globalThis.__currentConfirmations),0);
  assert.ok((await p.locator('.universal-selection').textContent()).includes('(1)'));
  assert.equal(await p.locator('.universal-results').getAttribute('aria-busy'),'true');
  assert.equal(await p.locator('.universal-selection').evaluate(el=>el.inert),true);
  assert.equal(await p.locator('.universal-pagination').evaluate(el=>el.inert),true);
  await p.evaluate(()=>globalThis.__releaseCurrentRefresh());await currentReady(p);
  assert.equal(await p.evaluate(()=>globalThis.__currentConfirmations),0);
  assert.ok((await p.locator('.universal-results').textContent()).includes('CURRENT_REFRESH_ONLY'));
  await assertCurrentFullAuthority(fixture);
 }finally{await h.close();}
});

test('VS07 current real capture replaces loaded generation without mixing old paging',
 {timeout:180000},async()=>{
 const {h,p,sources,generation}=await currentLifetimeFixture();
 try{
  await p.evaluate(()=>{
   const send=chrome.runtime.sendMessage.bind(chrome.runtime);globalThis.__captureSearchGenerations=[];globalThis.__captureUIReads=[];
   chrome.runtime.sendMessage=async(...args)=>{
    const result=await send(...args),o=args[0]?.options;
    if(args[0]?.type==='SEARCH_INPUTS'&&o?.universal&&o.mode==='current'){
     globalThis.__captureSearchGenerations.push(result.data?.generation);
     if(o.limit===40)globalThis.__captureUIReads.push({options:o,data:result.data,ok:result.ok});
    }
    return result;
   };
  });
  const complete='SEARCH_LIFETIME CAPTURE_CURRENT_NEW '+('新增完整表达 中文 <literal>\n'.repeat(1000))+'CAPTURE_NEW_END';
  const capture=await h.open({id:'vs07-current-capture-new',title:'New current source',base:1640995200,
   messages:[{id:'vs07-current-capture-new-message',text:complete}]});
  await h.ready(capture);
  await eventually(async()=>{
   const rows=(await h.state()).records,newSource=rows.find(row=>row.originalText===complete);
   return rows.length===43&&newSource?.sourceSentAt==='2022-01-01T00:00:00.000Z';
  },'complete new Source plus actual formal sent-time evidence');
  await eventually(()=>p.evaluate(old=>globalThis.__captureSearchGenerations.some(x=>x>old),generation),
   'actual new capture refreshes visible current generation');
  // Capture completion precedes real filter/library maintenance. Pagination is
  // checked only after those actual jobs and the complete generation settle.
  await currentMaintenanceReady(p,43);
  // The real capture and its visible generation change were observed above.
  // Pause further capture before asserting a stable healthy two-page snapshot;
  // ongoing capture is allowed to invalidate it and must never be papered over.
  await rpc(p,'SET_ENABLED',{enabled:false});
  assert.equal((await rpc(p,'GET_STATUS')).enabled,false,'actual user pause closes capture admission');
  await currentMaintenanceReady(p,43);
  let first,whole,admitted=false;
  // Maintenance/status completion is not a promise that no later archive
  // transaction can commit. A real changed-generation read must be refused;
  // only an explicit user requery may establish the complete current scope.
  for(let attempt=0;attempt<3;attempt++){
   const beforeExplicit=await p.evaluate(()=>globalThis.__captureUIReads.length);
   await p.getByRole('searchbox',{name:'全局搜索'}).press('Enter');
   await eventually(()=>p.evaluate(n=>globalThis.__captureUIReads.length>n,beforeExplicit),
    'explicit fresh production UI response completed');
   await currentReady(p);
   first=await p.evaluate(()=>globalThis.__captureUIReads.at(-1));
   assert.equal(first.ok,true);assert.equal(first.options.cursor,null);
   assert.equal(first.data.items.length,40);assert.equal(first.data.changed,false);
   whole=await rpc(p,'SEARCH_INPUTS',{options:{...first.options,limit:100}});
   assert.equal(whole.complete,true);assert.equal(whole.items.length,43);
   if(whole.generation===first.data.generation){admitted=true;break;}
   assert.ok(whole.generation>first.data.generation,'a later actual archive transaction changed the observed generation');
   const refused=await rpc(p,'SEARCH_INPUTS',{options:{...first.options,cursor:first.data.nextCursor}});
   assert.equal(refused.changed,true,'the actual old generation cursor must be refused, never used as healthy paging');
   assert.ok(refused.generation>first.data.generation);
  }
  assert.equal(admitted,true,'three explicit requeries must establish one unchanged complete actual generation');
  assert.equal(whole.generation,first.data.generation,'the final actual UI page and whole authority share one generation');
  const nextExpected=await rpc(p,'SEARCH_INPUTS',{options:{...first.options,cursor:first.data.nextCursor}});
  assert.equal(nextExpected.changed,false);assert.equal(nextExpected.generation,whole.generation);
  assert.equal(nextExpected.items.length,3,'actual bounded production next page retains all three remaining inputs');
  assert.ok((await p.locator('.universal-selection').textContent()).includes('(1)'));
  const beforeNext=await p.evaluate(()=>globalThis.__captureUIReads.length);
  await p.getByRole('button',{name:'下一页',exact:true}).click();
  await eventually(()=>p.evaluate(n=>globalThis.__captureUIReads.length>n,beforeNext),
   'actual current UI paging response completed');
  const next=await p.evaluate(()=>globalThis.__captureUIReads.at(-1));
  assert.equal(next.ok,true);assert.deepEqual(next.options.cursor,first.data.nextCursor);
  assert.equal(next.data.changed,false,'settled paused-capture UI next page is fresh');assert.equal(next.data.generation,whole.generation);
  assert.deepEqual(next.data.items.map(x=>x.ref),nextExpected.items.map(x=>x.ref));
  await eventually(async()=>!await p.locator('.universal-results').getAttribute('aria-busy'),'current paging released');
  assert.equal(await p.locator('.universal-hit').count(),3,JSON.stringify(await p.evaluate(()=>({
   status:document.querySelector('.universal-status').textContent,
   query:document.querySelector('#universal-search-dialog').dataset.query,
   reads:globalThis.__captureUIReads.map(x=>({cursor:x.options.cursor,items:x.data?.items?.map(y=>y.id),
    generation:x.data?.generation,changed:x.data?.changed}))
  }))));
  assert.deepEqual(new Set([...first.data.items,...next.data.items].map(x=>x.id)),
   new Set(whole.items.map(x=>x.id)),'all43 inputs exactly once across the two real UI pages');
  assert.equal((await p.locator('.universal-status').textContent()).includes('范围刚有变化'),false);
  const all=(await h.state()).records;
  assert.deepEqual(all.filter(row=>sources.some(x=>x.id===row.id)),sources);
  assert.equal(all.find(row=>row.originalText===complete)?.originalText,complete);
  // Preserve concurrency coverage deterministically after the healthy snapshot:
  // a real Working edit must revoke that same cursor, with zero mixed rows.
  const edited=await rpc(p,'GET_INPUT',{id:first.data.items[0].id});
  const original=all.find(row=>row.id===edited.originalTextReference)?.originalText;
  assert.equal(typeof original,'string');
  const changed=await rpc(p,'EDIT_DOCUMENT',{edit:{documentId:edited.documentId,
   operationId:crypto.randomUUID(),blocks:[{id:edited.id,expectedRevision:edited.revision,
    libraryText:(edited.libraryText??original)+'\nSYNTHETIC explicit current paging mutation',note:edited.note,excluded:edited.excluded}]}});
  assert.equal(changed.ok,true);
  const stale=await rpc(p,'SEARCH_INPUTS',{options:{...first.options,cursor:first.data.nextCursor}});
  assert.equal(stale.changed,true,'real mutation rejects the exact previously healthy cursor');
  assert.ok(stale.generation>whole.generation);
  // The existing RPC may return diagnostic rows alongside changed=true; they
  // are not an admitted page. Verify fresh UI rendering, never admit that page.
  await currentMaintenanceReady(p,43);
  await p.getByRole('searchbox',{name:'全局搜索'}).press('Enter');await currentReady(p);
  const refreshed=await p.evaluate(()=>globalThis.__captureUIReads.at(-1));
  assert.equal(refreshed.ok,true);assert.equal(refreshed.options.cursor,null);
  assert.equal(refreshed.data.changed,false);assert.equal(refreshed.data.items.length,40);
  assert.deepEqual(await p.locator('.universal-hit').evaluateAll(rows=>rows.map(row=>row.dataset.materialKey)),
   refreshed.data.items.map(item=>materialKey(item.ref)),'UI contains exactly the fresh first page, with no mixed stale tail');
  assert.deepEqual((await h.state()).records,all,'all43 complete immutable Sources survive concurrent Working edit');
  assert.ok((await p.locator('.universal-selection').textContent()).includes('(1)'),'explicit selection survives real invalidation');
  assert.equal(h.deepSeekRequests.length,0);assert.equal(h.extensionNetworkRequests,0);
  assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});

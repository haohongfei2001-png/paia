import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {FakeChatGPT,eventually} from './harness/fake-chatgpt.mjs';

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
  await rpc(p,'PURGE_SOURCE',{id:original.ref.sourceId,confirm:true});
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

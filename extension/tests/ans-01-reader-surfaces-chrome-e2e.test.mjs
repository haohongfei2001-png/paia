import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {FakeChatGPT,eventually,pause} from './harness/fake-chatgpt.mjs';

const op=()=>crypto.randomUUID();
const rpc=async(page,type,fields={})=>{
  const response=await page.evaluate(message=>chrome.runtime.sendMessage(message),{type,...fields});
  assert.equal(response.ok,true,JSON.stringify(response));
  return response.data;
};

async function consent(page){
  await page.locator('#consent-check').check();
  await page.locator('#enable-consent').click();
  await eventually(async()=>(await rpc(page,'GET_STATUS')).consented===true,'ANS-01 consent persists');
  const skip=page.locator('#onboarding-skip');
  if(await skip.isVisible().catch(()=>false))await skip.click();
}

async function openReader(page){
  await page.locator('#primary-nav [data-view="library"]').click();
  await eventually(()=>page.locator('.conversation-document').isVisible(),'ANS-01 Archive document appears');
  await page.locator('.conversation-document').first().click();
  await eventually(()=>page.locator('#input-time-toggle').isVisible(),'ANS-01 Reader opens');
}

async function tray(page){
  return page.evaluate(async()=>{
    const {getMaterialTray}=await import(chrome.runtime.getURL('ui/material-tray.js'));
    return getMaterialTray().data;
  });
}

test('ANS-01 Reader surfaces stay quiet while order, time, reuse and failure recovery remain real',{timeout:240000},async()=>{
  const h=await FakeChatGPT.start();
  try{
    const p=h.archive;
    await consent(p);
    await rpc(p,'UPDATE_PREFERENCES',{changes:{language:'zh-CN',appearance:'light'}});
    await h.open({
      id:'ans01-reader-chat',
      title:'ANS-01 Reader',
      base:1609459200,
      messages:[
        {id:'ans01-message-001',text:'ANS01_FIRST 第一条输入'},
        {id:'ans01-message-002',text:'ANS01_SECOND 第二条输入'},
        {id:'ans01-message-003',text:'ANS01_THIRD 第三条输入'}
      ]
    });
    await eventually(async()=>{
      const state=await h.state();
      return state.records.length===3&&state.records.every(row=>!!row.sourceSentAt);
    },'ANS-01 source times are known');
    await p.bringToFront();
    await eventually(()=>p.locator('.conversation-document').isVisible());

    assert.equal(await p.locator('#archive-select-materials').count(),0,'Archive root duplicate material launcher is removed');
    await openReader(p);
    assert.equal(await p.locator('#input-time-order button').count(),1,'Reader exposes one time-order control');
    const toggle=p.locator('#input-time-toggle');
    assert.equal(await toggle.getAttribute('data-current-sort'),'asc');
    assert.equal(await toggle.getAttribute('aria-pressed'),'false');
    assert.match(await toggle.textContent(),/正序/);

    const timeMetrics=await p.locator('.library-block').evaluateAll(rows=>rows.map(row=>{
      const time=row.querySelector('.block-time'),prose=row.querySelector('.library-prose');
      return {opacity:getComputedStyle(time).opacity,timeSize:parseFloat(getComputedStyle(time).fontSize),proseSize:parseFloat(getComputedStyle(prose).fontSize),text:time.textContent};
    }));
    assert.equal(timeMetrics.length,3);
    assert.ok(timeMetrics.every(x=>x.opacity==='1'),'timestamps are visible without hover');
    assert.ok(timeMetrics.every(x=>x.timeSize<x.proseSize),'timestamps remain subordinate to body text');
    assert.ok(timeMetrics.every(x=>/\d{2}:\d{2}/.test(x.text)),'known source time is displayed');

    assert.equal(await p.locator('.core-loop-reuse').count(),0,'persistent per-Input material action is removed');
    const first=p.locator('.library-prose').filter({hasText:'ANS01_FIRST'}).first();
    await first.click({button:'right'});
    assert.equal(await p.locator('#context-menu button').filter({hasText:'加入本次材料'}).count(),1,'Input more menu still owns exact reuse');
    await p.keyboard.press('Escape').catch(()=>{});
    await p.mouse.click(10,10);
    await first.evaluate(el=>{
      const node=el.firstChild||el,range=document.createRange();range.setStart(node,0);range.setEnd(node,Math.min(5,node.textContent.length));
      const selection=getSelection();selection.removeAllRanges();selection.addRange(range);document.dispatchEvent(new Event('selectionchange'));
    });
    await eventually(()=>p.locator('.reader-selection').isVisible(),'native text selection opens the retained toolbar');
    assert.equal(await p.locator('.reader-selection').getByRole('button',{name:'加入本次材料',exact:true}).count(),1,'native selected-text reuse remains available');
    await p.evaluate(()=>getSelection()?.removeAllRanges());

    const failureAnchorText=await p.locator('.library-prose').first().textContent();
    await p.evaluate(()=>{
      const send=chrome.runtime.sendMessage.bind(chrome.runtime);let fail=true;
      chrome.runtime.sendMessage=async message=>{
        if(fail&&message?.type==='SET_ORGANIZER_CONTROLS'){fail=false;throw new Error('ANS01_SYNTHETIC_SORT_FAILURE');}
        return send(message);
      };
    });
    await toggle.click();
    await eventually(async()=>(await p.locator('#error').textContent()).includes('排序偏好尚未保存'),'failed sort reports the completed rollback');
    const failedControls=await rpc(p,'GET_ORGANIZER_CONTROLS');
    assert.equal(failedControls.inputReadingSort,'asc','failed sort keeps the persisted preference');
    assert.equal(await toggle.getAttribute('data-current-sort'),'asc','failed sort keeps the rendered preference');
    assert.equal(await toggle.getAttribute('aria-pressed'),'false','failed sort leaves the single toggle in ascending state');
    assert.equal(await p.locator('.library-prose').first().textContent(),failureAnchorText,'failed sort keeps the original Reader ordering');

    await toggle.click();
    await eventually(async()=>{
      const controls=await rpc(p,'GET_ORGANIZER_CONTROLS');
      return controls.inputReadingSort==='desc'&&await toggle.getAttribute('data-current-sort')==='desc';
    },'single toggle persists desc');
    assert.equal(await toggle.getAttribute('aria-pressed'),'true');
    const descBodies=await p.locator('.library-prose').allTextContents();
    assert.equal(descBodies[0].includes('ANS01_THIRD'),true,'descending Reader places latest Input first');

    await p.reload();
    await eventually(async()=>await p.locator('#input-time-toggle').isVisible()||await p.locator('.conversation-document').isVisible(),'reload restores a usable Archive route');
    if(!await p.locator('#input-time-toggle').isVisible())await openReader(p);
    await eventually(async()=>await p.locator('#input-time-toggle').getAttribute('data-current-sort')==='desc','desc persists across reload');

    await p.bringToFront();
    assert.equal(await p.locator('#input-time-toggle').evaluate(el=>{el.focus();return document.activeElement===el;}),true,'keyboard sort toggle receives focus');
    await p.locator('#input-time-toggle').press('Enter');
    await eventually(async()=>{const controls=await rpc(p,'GET_ORGANIZER_CONTROLS');return controls.inputReadingSort==='asc'&&await p.locator('#input-time-toggle').getAttribute('data-current-sort')==='asc';},'keyboard toggles back to asc');

    await mkdir('work/ans-01',{recursive:true});
    for(const appearance of ['light','dark']){
      await rpc(p,'UPDATE_PREFERENCES',{changes:{appearance}});
      for(const [width,height] of [[1440,900],[1024,768],[390,844],[320,720]]){
        await p.setViewportSize({width,height});await pause(80);
        assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'Reader has no root horizontal overflow at '+width);
        assert.ok(await p.locator('.block-time').evaluateAll(nodes=>nodes.every(n=>getComputedStyle(n).opacity==='1')),'timestamps stay visible at '+width);
        const contrast=await p.locator('.block-time').first().evaluate(node=>{
          const parse=value=>value.match(/[\d.]+/g).slice(0,3).map(Number),linear=v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;},lum=value=>{const [r,g,b]=parse(value);return .2126*linear(r)+.7152*linear(g)+.0722*linear(b);};
          const fg=lum(getComputedStyle(node).color),bg=lum(getComputedStyle(document.querySelector('.workspace')).backgroundColor),hi=Math.max(fg,bg),lo=Math.min(fg,bg);return (hi+.05)/(lo+.05);
        });
        assert.ok(contrast>=4.5,'timestamp contrast stays readable at '+appearance+' '+width+'; got '+contrast);
        await p.screenshot({path:'work/ans-01/reader-'+appearance+'-'+width+'.png',fullPage:false});
      }
    }
    await p.setViewportSize({width:1024,height:768});
    const cdp=await h.context.newCDPSession(p);await cdp.send('Emulation.setPageScaleFactor',{pageScaleFactor:2});
    assert.equal(await p.locator('#input-time-toggle').isVisible(),true,'order control remains reachable at 200% zoom');
    await cdp.send('Emulation.setPageScaleFactor',{pageScaleFactor:1});

    const unknownPage=await h.open({id:'ans01-unknown-chat',title:'ANS-01 unknown time',messages:[{id:'ans01-unknown-message',text:'ANS01_UNKNOWN_TIME 只有 DOM 来源证据'}]},{arrival:'manual'});
    await eventually(async()=>{
      const state=await h.state(),row=state.records.find(r=>r.sourceMessageId==='ans01-unknown-message');return row&&row.sourceSentAt===null;
    },'unknown source time remains unknown instead of borrowing capture time');
    await p.bringToFront();await p.locator('#primary-nav [data-view="library"]').click();
    await eventually(()=>p.locator('.conversation-document').filter({hasText:'ANS-01 unknown time'}).isVisible(),'unknown-time document appears');
    await p.locator('.conversation-document').filter({hasText:'ANS-01 unknown time'}).click();
    await eventually(async()=>(await p.locator('#document-title').textContent()).includes('ANS-01 unknown time'),'unknown-time Reader opens');
    await eventually(async()=>await p.locator('.block-time').count()===1,'unknown-time document replaces the prior Reader body');
    assert.match(await p.locator('.block-time').first().textContent(),/未知/,'unknown source time has an honest visible label');
    assert.equal(await p.locator('.block-time').first().evaluate(n=>getComputedStyle(n).opacity),'1','unknown time is visible without hover');
    await unknownPage.close();

    assert.equal(h.deepSeekRequests.length,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);
  }finally{await h.close();}
});

test('ANS-01 Topic whole-selection moves into the existing menu and keeps the bounded trusted material path',{timeout:300000},async()=>{
  const h=await FakeChatGPT.start();
  try{
    const p=h.archive;
    await consent(p);
    await h.open({id:'ans01-material-source',title:'ANS-01 material source',base:1609459200,messages:[{id:'ans01-source-message',text:'ANS01_ARCHIVE_TARGET 可从材料盘继续选择'}]});
    await eventually(async()=>(await h.state()).records.length===1,'ANS-01 source captured');

    const small=await rpc(p,'CREATE_LIBRARY_TOPIC',{topic:{name:'ANS01 小主题',operationId:op()}});
    await rpc(p,'CONTINUE_THINKING',{thought:{topicId:small.id,body:'ANS01_TOPIC_A 第一段思想',operationId:op()}});
    await rpc(p,'CONTINUE_THINKING',{thought:{topicId:small.id,body:'ANS01_TOPIC_B 第二段思想',operationId:op()}});
    const big=await rpc(p,'CREATE_LIBRARY_TOPIC',{topic:{name:'ANS01 大主题',operationId:op()}});
    await p.evaluate(async topicId=>{
      for(let i=0;i<201;i++){
        const r=await chrome.runtime.sendMessage({type:'CONTINUE_THINKING',thought:{topicId,body:'ANS01_BIG_'+String(i).padStart(3,'0'),operationId:crypto.randomUUID()}});
        if(!r?.ok)throw Error(JSON.stringify(r));
      }
    },big.id);

    await p.bringToFront();
    await p.locator('#primary-nav [data-view="thoughts"]').click();
    await eventually(()=>p.locator('[data-topic-id]').filter({hasText:'ANS01 小主题'}).isVisible(),'small topic appears');
    await p.locator('[data-topic-id]').filter({hasText:'ANS01 小主题'}).click();
    await eventually(()=>p.locator('#topic-menu summary').isVisible(),'small topic reader opens');
    assert.equal(await p.locator('#topic-material-select').count(),0,'whole-topic material action is not a toolbar surface');
    await p.locator('#topic-menu summary').click();
    const choose=p.locator('#topic-menu button').filter({hasText:'选择本主题材料'});
    assert.equal(await choose.count(),1,'whole-topic selection is retained in the topic menu');
    p.once('dialog',dialog=>dialog.accept());
    await choose.click();
    await eventually(async()=>((await tray(p))?.items||[]).length===2,'whole-topic menu selection adds exact saved Thought refs');
    assert.equal(await p.locator('#material-preview').isVisible(),true,'selected material opens the existing tray');

    await p.getByRole('button',{name:'从档案选择',exact:true}).click();
    await eventually(()=>p.locator('#universal-search-dialog').isVisible(),'retained tray opens internal Archive material search');
    await p.getByRole('searchbox',{name:'全局搜索'}).fill('ANS01_ARCHIVE_TARGET');
    await eventually(async()=>await p.locator('.universal-hit').count()===1,'internal material search still finds Input');
    await p.locator('.universal-close').click();

    await p.locator('#back').click();
    await eventually(()=>p.locator('[data-topic-id]').filter({hasText:'ANS01 大主题'}).isVisible(),'Thought home returns');
    await p.locator('[data-topic-id]').filter({hasText:'ANS01 大主题'}).click();
    await eventually(()=>p.locator('#topic-menu summary').isVisible(),'large topic opens');
    await p.locator('#topic-menu summary').click();
    let unexpectedDialog=false;
    p.once('dialog',async dialog=>{unexpectedDialog=true;await dialog.dismiss();});
    await p.locator('#topic-menu button').filter({hasText:'选择本主题材料'}).click();
    await eventually(async()=>!await p.locator('#notice').isHidden()&&(await p.locator('#notice').textContent()).includes('超过本次 200 项保护上限'),'large topic gives bounded-selection notice');
    assert.equal(unexpectedDialog,false,'over-limit selection does not ask to confirm a truncated set');
    assert.equal((await tray(p)).items.length,2,'over-limit selection does not silently change the existing tray');

    assert.equal(h.deepSeekRequests.length,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);
  }finally{await h.close();}
});

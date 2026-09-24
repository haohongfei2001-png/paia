import test from 'node:test';
import assert from 'node:assert/strict';
import {FakeChatGPT,conversation,eventually} from './harness/fake-chatgpt.mjs';

async function consent(page){
 await page.locator('#consent-check').check();
 await page.locator('#enable-consent').click();
}

test('CPV1-02.4 Reader keeps actions contextual and removal reversible', {timeout:60000},async()=>{
 const h=await FakeChatGPT.start();
 try{
  const p=h.archive;await consent(p);
  await h.open(conversation('cpv1-reader-actions'));
  await eventually(async()=>(await h.state()).records.length===3);
  await p.locator('.conversation-document').click();
  const before=await h.state(),first=p.locator('.library-prose').first();
  await eventually(async()=>await p.locator('.library-block .reader-more').count()===3,'Reader actions mounted');
  assert.equal(await p.locator('.library-block .reading-copy,.library-block .input-remove').count(),0);
  await first.evaluate(el=>{const range=document.createRange();range.setStart(el.firstChild,0);range.setEnd(el.firstChild,Math.min(8,el.firstChild.length));getSelection().removeAllRanges();getSelection().addRange(range);});
  await eventually(()=>p.locator('.reader-selection').isVisible());
  assert.deepEqual(await p.locator('.reader-selection button').allTextContents(),['复制所选文字','加入主题','加入本次材料','更多']);
  await p.locator('.reader-selection').getByRole('button',{name:'更多'}).click();
  assert.equal(await p.getByRole('menuitem',{name:'复制这条输入'}).count(),1);
  await p.getByRole('menuitem',{name:'从档案移除'}).click();
  await eventually(async()=>(await h.state()).library.blocks[0].excluded);
  await p.locator('#notice').getByRole('button',{name:'撤销'}).click();
  await eventually(async()=>!(await h.state()).library.blocks[0].excluded);
  assert.deepEqual((await h.state()).records,before.records);
  assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});

test('CPV1-02.4 Reader bounds long conversations and restores preceding range', {timeout:90000},async()=>{
 const h=await FakeChatGPT.start();
 try{
  const p=h.archive;await consent(p);
  const c=conversation('cpv1-reader-window');
  c.messages=Array.from({length:205},(_,i)=>({id:'cpv1-reader-'+String(i).padStart(3,'0'),text:'Synthetic continuous reading '+i}));
  await h.open(c);
  await eventually(async()=>(await h.state()).records.length===205,'205 synthetic inputs captured');
  await p.locator('.conversation-document').click();
  await eventually(async()=>await p.locator('.library-prose').count()===100);
  const firstHeight=await p.evaluate(()=>document.scrollingElement.scrollHeight);
  await p.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
  await eventually(async()=>await p.locator('.library-prose').count()===200,'second range appended');
  await eventually(async()=>await p.evaluate(min=>document.scrollingElement.scrollHeight>min*1.5,firstHeight),'second range participates in scroll layout');
  await p.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
  await eventually(async()=>await p.locator('.library-prose').count()===105,'oldest range evicted after third range');
  assert.match(await p.locator('.library-prose').last().textContent(),/204/);
  await p.evaluate(()=>window.scrollTo(0,document.querySelector('#document-body').offsetTop));
  await eventually(async()=>await p.locator('.library-prose').count()===200,'preceding range restored on reverse scroll');
  assert.match(await p.locator('.library-prose').first().textContent(),/Synthetic continuous reading 0/);
  assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});

test('CPV1-02.4 conversation search steps into unmounted text and close restores reading anchor', {timeout:75000},async()=>{
 const h=await FakeChatGPT.start();
 try{
  const p=h.archive;await consent(p);
  const c=conversation('cpv1-reader-search');
  c.messages=Array.from({length:101},(_,i)=>({id:'cpv1-search-'+String(i).padStart(3,'0'),text:`Synthetic text ${i}${i===0||i===100?' CPV1_MATCH':''}`}));
  await h.open(c);await eventually(async()=>(await h.state()).records.length===101);
  await p.locator('.conversation-document').click();
  const first=p.locator('.library-prose').first();await first.focus();await first.scrollIntoViewIfNeeded();
  const firstId=await first.getAttribute('data-edit-id');
  await p.locator('#document-search').fill('CPV1_MATCH');
  await eventually(async()=>await p.locator('.document-search-hit').count()===2,'both mounted and unmounted matches are indexed');
  await p.locator('#document-search-match-next').click();
  await eventually(async()=>await p.locator('#document-search-status').textContent().then(t=>t.includes('已定位 1/2')));
  await p.locator('#document-search-match-next').click();
  await eventually(async()=>await p.locator('#document-search-status').textContent().then(t=>t.includes('已定位 2/2')));
  await eventually(async()=>await p.locator('.library-prose').filter({hasText:'Synthetic text 100'}).isVisible(),'next match opens unmounted body');
  await p.locator('#document-search-close').click();
  await eventually(async()=>await p.locator(`[data-edit-id="${firstId}"]`).isVisible(),'closing search restores the prior reading Input');
  assert.equal(await p.locator('#document-search').inputValue(),'');
  assert.equal(await p.locator('#document-search-results').isVisible(),false);
  assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});

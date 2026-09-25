import test from 'node:test';
import assert from 'node:assert/strict';
import {FakeChatGPT,conversation,eventually} from './harness/fake-chatgpt.mjs';

async function consent(page){
 await page.locator('#consent-check').check();
 await page.locator('#enable-consent').click();
}

async function openCapturedReader(page){
 await page.bringToFront();
 await eventually(()=>page.locator('#archive-navigator').isVisible(),'Archive Navigator is visible');
 const group=page.locator('.archive-navigator-group-toggle').filter({hasText:'未归属 Project'}).first();
 await eventually(()=>group.isVisible(),'captured conversation group is visible');
 if(await group.getAttribute('aria-expanded')!=='true')await group.click();
 const window=page.locator('.archive-navigator-window').first();
 await eventually(()=>window.isVisible(),'captured conversation is visible');
 await window.click();
 await eventually(()=>page.locator('.library-prose').first().isVisible(),'Reader opens');
}

test('CPV1-02.4 Reader keeps actions contextual and removal reversible', {timeout:60000},async()=>{
 const h=await FakeChatGPT.start();
 try{
  const p=h.archive;await consent(p);
  await h.open(conversation('cpv1-reader-actions'));
  await eventually(async()=>(await h.state()).records.length===3);
  await openCapturedReader(p);
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
  await openCapturedReader(p);
  const rows=p.locator('.library-prose'),index=async edge=>Number((await (edge==='first'?rows.first():rows.last()).textContent()).match(/reading (\d+)/)?.[1]??-1);
  const scrollUntil=async(edge,expected,label)=>eventually(async()=>{if(edge==='last'&&await index('last')>=expected||edge==='first'&&await index('first')<=expected)return true;await p.evaluate(edge==='last'?()=>window.scrollTo(0,document.body.scrollHeight):()=>window.scrollTo(0,document.querySelector('#document-body').offsetTop));return false;},label,30000);
  await eventually(async()=>await rows.count()===40);
  const firstHeight=await p.evaluate(()=>document.scrollingElement.scrollHeight);
  await scrollUntil('last',79,'second 40-Input range appended');
  assert.equal(await rows.count(),80,'Reader keeps two bounded ranges');
  await eventually(async()=>await p.evaluate(min=>document.scrollingElement.scrollHeight>min*1.5,firstHeight),'second range participates in scroll layout');
  await scrollUntil('last',204,'all 205 Inputs reachable through bounded pages');
  assert.ok(await rows.count()<=80,'mounted Reader stays within two 40-Input ranges');
  assert.ok(await index('first')>0,'oldest range is evicted after forward reading');
  await scrollUntil('first',0,'preceding range restored on reverse scroll');
  assert.ok(await rows.count()<=80,'reverse navigation remains bounded');
  const original=(await h.state()).records[0].originalText,first=p.locator('.library-prose').first(),firstId=await first.getAttribute('data-edit-id');
  await first.evaluate(el=>{el.focus();el.textContent='Edited continuous reading 0';el.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText'}));});
  await eventually(async()=>{if(await p.locator('#reader-window-guard').isVisible())return true;await p.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));return false;},'focused edit asks before evicting its range',30000);
  assert.ok(await rows.count()<=80&&await p.locator(`[data-edit-id="${firstId}"]`).count()===1,'focused editing range is retained until explicit continuation');
  await p.locator('#reader-window-guard-continue').click();
  await scrollUntil('last',204,'explicit saved continuation reaches the final range');
  await eventually(async()=>(await h.state()).library.blocks.find(block=>block.id===firstId)?.libraryText==='Edited continuous reading 0','edited Input is durably saved before eviction');
  assert.equal((await h.state()).records[0].originalText,original,'Reader edit never rewrites immutable Source');
  await scrollUntil('first',0,'edited preceding range restores');
  assert.equal(await p.locator('.library-prose').first().textContent(),'Edited continuous reading 0');
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
  await openCapturedReader(p);
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

test('VS-04 search positions a lexical hit inside a long Input without mutating the text',{timeout:75000},async()=>{
 const h=await FakeChatGPT.start({headless:false});
 try{
  const p=h.archive;await consent(p);
  const body='Long reading '.repeat(2500)+' UNIQUE_LEXICAL_TARGET '+'ending '.repeat(100);
  const c=conversation('vs04-long-search');c.messages=[{id:'vs04-long-search-input',text:body}];
  await h.open(c);await eventually(async()=>(await h.state()).records.length===1);
  await openCapturedReader(p);
  await p.locator('#document-search').fill('UNIQUE_LEXICAL_TARGET');
  await eventually(async()=>await p.locator('.document-search-hit').count()===1,'long Input is indexed');
  await p.locator('.document-search-hit').click();
  await eventually(async()=>p.evaluate(async()=>{
   const target=document.querySelector('.library-prose');
   const {firstLexicalRange}=await import('./search-experience.js');
   const rect=firstLexicalRange(target,'UNIQUE_LEXICAL_TARGET')?.getBoundingClientRect();
   return !!rect&&rect.top>=0&&rect.bottom<=innerHeight;
  }),'exact lexical hit is in the viewport');
  assert.equal(await p.locator('.library-prose').textContent(),body);
  assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});

test('VS-04 direct Input edit stays traceable through search, Source and restore-as-new-current',{timeout:90000},async()=>{
 const h=await FakeChatGPT.start({headless:false});
 try{
  const p=h.archive;await consent(p);
  await h.open(conversation('vs04-edit-source-history'));
  await eventually(async()=>(await h.state()).records.length===3);
  const baseline=await h.state();
  await openCapturedReader(p);
  const first=p.locator('.library-prose').first(),id=await first.getAttribute('data-edit-id');
  const initial=baseline.library.blocks.find(b=>b.id===id),initialRevision=initial.revision;
  const source=baseline.records.find(r=>r.id===initial.originalTextReference)?.originalText;
  assert.ok(source,'first Input retains its Source text');
  const changed='中文编辑 🧭 VS04 unique retrieval line · code: const answer = 42;';
  await first.fill(changed);
  await eventually(async()=>{
   const current=await h.state();
   return current.library.blocks.find(b=>b.id===id)?.libraryText===changed;
  },'direct Input edit autosaves');
  assert.deepEqual((await h.state()).records,baseline.records,'editing cannot rewrite Source');

  await p.locator('.library-block .reader-more').first().click();
  await p.getByRole('menuitem',{name:'查看当时记录'}).click();
  await p.locator('#info-dialog').waitFor({state:'visible'});
  assert.equal(await p.locator('#info-dialog .source-original').first().textContent(),source);
  assert.equal(await p.locator('#info-dialog .reader-working-comparison').textContent(),changed);
  await p.locator('#info-dialog').getByRole('button',{name:'查看工作版本'}).click();
  await p.locator('#revision-dialog').waitFor({state:'visible'});
  assert.match(await p.locator('#revision-list .revision-row').first().textContent(),/编辑/);
  await p.locator('#close-revisions').click();

  await p.locator('#back').click();
  await p.locator('#search').fill('VS04 unique retrieval');
  await eventually(()=>p.locator('.search-input').first().isVisible(),'edited Input is searchable');
  await p.locator('.search-input').first().click();
  await eventually(()=>p.locator('[data-edit-id="'+id+'"]').isVisible(),'search reopens the edited Input');
  assert.equal(await p.locator('[data-edit-id="'+id+'"]').textContent(),changed);

  await p.locator('[data-block-id="'+id+'"] .reader-more').click();
  await p.getByRole('menuitem',{name:'版本历史'}).click();
  await p.locator('#revision-dialog').waitFor({state:'visible'});
  const history=p.locator('#revision-list .revision-row').first();
  await history.waitFor();
  assert.match(await history.textContent(),/编辑/);
  await history.getByRole('button',{name:'恢复操作前'}).click();
  const confirmation=p.locator('dialog.reader-confirm');
  await confirmation.waitFor({state:'visible'});
  assert.match(await confirmation.textContent(),/恢复会建立今天的新版本/);
  await confirmation.getByRole('button',{name:'恢复这个工作版本'}).click();
  await eventually(async()=>{
   const current=await h.state(),block=current.library.blocks.find(b=>b.id===id);
   return block?.revision>initialRevision+1;
  },'restore creates a new current revision');
  await eventually(async()=>await p.locator('[data-edit-id="'+id+'"]').textContent()===source,'restored text appears in Reader');
  assert.deepEqual((await h.state()).records,baseline.records,'Source remains immutable after restore');
  assert.equal(h.extensionNetworkRequests,0);
  assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});

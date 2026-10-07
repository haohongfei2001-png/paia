import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,rmSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {FakeChatGPT,eventually} from './harness/fake-chatgpt.mjs';
const release=mkdtempSync(join(tmpdir(),'paia-iah11-results-'));
test.after(()=>rmSync(release,{recursive:true,force:true}));
console.log(execFileSync('python3',['scripts/build_current_release.py',release],{encoding:'utf8'}));
const out=new URL('../work/iah11-results/',import.meta.url).pathname;mkdirSync(out,{recursive:true});
for(const variant of ['source','release'])test(`IAH11 actual Input-first results preserve selection, native activation and flat narrow/dark presentation (${variant})`,{timeout:90000},async()=>{
 const h=await FakeChatGPT.start({headless:true,...(variant==='release'?{extensionPath:release}:{})}),p=h.archive;
 try{
  await p.locator('#consent-check').check();await p.locator('#enable-consent').click();
  const title='SYNTHETIC_TITLE_ONLY '+ 'LongSyntheticLocation'.repeat(16);
  const text='SYNTHETIC_NEEDLE Do not publish unless approved. 中文 👩‍💻 é. İx ＱＺ';
  await h.open({id:'iah11-results',title,base:1609459200,messages:[{id:'iah11-input',text}]});
  await eventually(async()=>(await h.state()).records.length===1);assert.equal(await p.locator('#scope-search').getAttribute('placeholder'),'搜索全部档案');await p.locator('#scope-search').fill('SYNTHETIC_NEEDLE');await eventually(()=>p.locator('.search-input').count().then(n=>n===1));
  const row=p.locator('.search-input');assert.equal(await row.locator(':scope > :first-child').textContent(),text);assert.equal(await row.locator('.search-result-path').textContent(),title);assert.equal(await row.locator('.search-title-match').count(),0);
  // Native pointer drag must not become activation. No programmatic Selection
  // and no forced clicks stand in for the actual text-selection gesture.
  await p.bringToFront();const box=await row.locator('.search-excerpt').boundingBox();await p.mouse.move(box.x+5,box.y+8);await p.mouse.down();await p.mouse.move(box.x+180,box.y+8,{steps:12});await p.mouse.up();
  assert.ok(await p.evaluate(()=>document.getSelection().toString().length>0),'real pointer drag selects excerpt');assert.equal(await p.locator('#document-panel').isVisible(),false,'selection does not open Reader');
  await row.focus();await p.keyboard.press('Enter');await eventually(()=>p.locator('#document-panel').isVisible());assert.match(await p.locator('#document-body').textContent(),/Do not publish unless approved/);assert.equal(await p.locator('#reader-scope-search').getAttribute('placeholder'),'在此对话中查找');assert.equal(await p.locator('#scope-search').inputValue(),'SYNTHETIC_NEEDLE','opening Reader retains the separate Archive query');
  await p.locator('#back').click();await eventually(()=>p.locator('#scope-search').isEnabled());await p.locator('#scope-search').fill('SYNTHETIC_TITLE_ONLY');await eventually(()=>p.locator('.search-title-match').count().then(n=>n===1));assert.equal(await row.locator('.search-excerpt mark').count(),0);
  for(const {name,width,dark} of [{name:'wide',width:1440,dark:false},{name:'narrow',width:320,dark:false},{name:'narrow-dark',width:320,dark:true}]){
   await p.setViewportSize({width,height:900});await p.evaluate(dark=>document.documentElement.dataset.paiaTheme=dark?'dark':'light',dark);await row.scrollIntoViewIfNeeded();assert.equal(await row.evaluate(el=>getComputedStyle(el).borderRadius),'0px');assert.equal(await row.evaluate(el=>el.scrollWidth<=el.clientWidth+1),true,'result reflows without horizontal overflow');await p.screenshot({path:out+variant+'-'+name+'.png'});
  }
  await p.setViewportSize({width:1440,height:900});
  const inputId=await row.getAttribute('data-input-id');
  const readInput=()=>p.evaluate(async id=>{const r=await chrome.runtime.sendMessage({type:'GET_INPUT',id});if(!r.ok)throw Error(JSON.stringify(r));return r.data;},inputId);
  const before=await readInput(),unicode=[];
  for(const [query,original] of [['x','x'],['qz','ＱＺ'],['é','é']]){
   await p.locator('#scope-search').fill(query);
   await eventually(async()=>await row.locator('.search-excerpt mark').allTextContents().then(values=>values.includes(original)),'Unicode result marks the original glyphs');
   await row.focus();await p.keyboard.press('Enter');
   await eventually(()=>p.locator('#document-panel').isVisible(),'Unicode result opens actual Reader');
   const rangeEvidence=()=>p.evaluate(({inputId,original})=>{
    const field=document.querySelector('[data-edit-id="'+inputId+'"]');
    const ranges=[...(CSS.highlights.get('paia-search')||[])].filter(range=>field?.contains(range.startContainer));
    return {body:field?.textContent,ranges:ranges.map(range=>({text:range.toString(),start:range.startOffset,end:range.endOffset,visible:range.getBoundingClientRect().height>0})),matched:ranges.some(range=>range.toString()===original)};
   },{inputId,original});
   await eventually(async()=>(await rangeEvidence()).matched,'actual Reader CSS Range uses original Unicode');
   const evidence=await rangeEvidence();assert.equal(evidence.body,text);assert.ok(evidence.ranges.some(range=>range.text===original&&range.visible));
   assert.deepEqual(await readInput(),before,'search arrival never changes canonical Input or revision');unicode.push({query,original,...evidence});
   await p.locator('#back').click();await eventually(()=>p.locator('#scope-search').isEnabled());
  }
  writeFileSync(out+variant+'-unicode.json',JSON.stringify({inputId,before,after:await readInput(),unicode},null,2));
  const filteredChat={id:'iah11-filter-context',title:'SYNTHETIC_FILTER_CONTEXT',base:1609459300,messages:[{id:'iah11-normal',text:'SYNTHETIC_NORMAL_CONTEXT'},{id:'iah11-filter-before',text:'继续'},{id:'iah11-filter-target',text:'请继续'},{id:'iah11-filter-after',text:'开始吧'}]};
  await h.open(filteredChat);await eventually(async()=>(await h.state()).records.length===5);
  await eventually(async()=>{const r=await p.evaluate(()=>chrome.runtime.sendMessage({type:'FILTER_RECENT'}));return r.ok&&r.data.items.length===3;},'three actual captured Inputs are filtered');
  const capture=(await h.state()).records,targetRecord=capture.find(r=>r.originalText==='请继续'),normalRecord=capture.find(r=>r.originalText==='SYNTHETIC_NORMAL_CONTEXT');
  assert.ok(targetRecord&&normalRecord);const targetId='block:'+targetRecord.id,normalId='block:'+normalRecord.id;
  const filterState=()=>p.evaluate(async()=>{const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('paia-archive');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});try{const names=['records','blocks','filterInputs','filterIntents','inputStates','revisions'],tx=db.transaction(names,'readonly');return Object.fromEntries(await Promise.all(names.map(name=>new Promise((resolve,reject)=>{const r=tx.objectStore(name).getAll();r.onsuccess=()=>resolve([name,r.result]);r.onerror=()=>reject(r.error);}))))}finally{db.close();}});
  const filterBefore=await filterState();
  await p.locator('#scope-search').fill('请继续');await p.locator('#search-include-filtered').check();
  const filteredRow=p.locator('.search-input[data-input-id="'+targetId+'"]');await eventually(()=>filteredRow.count().then(n=>n===1),'explicit filtered search exposes target');await filteredRow.focus();await p.keyboard.press('Enter');
  await eventually(()=>p.locator('[data-edit-id="'+targetId+'"]').isVisible(),'filtered target arrives in real Reader');
  const visibleIds=()=>p.locator('#document-body [data-edit-id]:visible').evaluateAll(nodes=>nodes.map(n=>n.dataset.editId));
  assert.deepEqual((await visibleIds()).sort(),[normalId,targetId].sort(),'temporary target does not reveal either filtered neighbour');
  assert.equal(await p.locator('[data-edit-id="'+targetId+'"]').textContent(),'请继续');
  assert.deepEqual(await filterState(),filterBefore,'temporary reveal never Keep/protects or rewrites originals/revisions');
  await p.locator('#back').click();await eventually(()=>p.locator('#scope-search').isEnabled());await p.locator('#scope-search').fill('');
  const group=p.locator('.archive-navigator-group-toggle').filter({hasText:'未归属 Project'}).first();await eventually(()=>group.isVisible());if(await group.getAttribute('aria-expanded')!=='true')await group.click();
  const ordinary=p.locator('.archive-navigator-window').filter({hasText:'SYNTHETIC_FILTER_CONTEXT'});await eventually(()=>ordinary.isVisible());await ordinary.click();
  await eventually(async()=>JSON.stringify(await visibleIds())===JSON.stringify([normalId]),'ordinary Reader again hides every filtered Input');
  assert.deepEqual(await filterState(),filterBefore,'ordinary return does not persist temporary visibility');
  writeFileSync(out+variant+'-filter-context.json',JSON.stringify({targetId,normalId,visibleIds:await visibleIds(),unchanged:true},null,2));
  assert.equal(h.extensionNetworkRequests,0);assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});

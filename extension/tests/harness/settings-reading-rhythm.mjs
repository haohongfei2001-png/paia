import assert from 'node:assert/strict';
import {eventually} from './fake-chatgpt.mjs';
import {openArchiveWindow} from './archive-navigator.mjs';
import {rpc} from './settings-consumer-presentation.mjs';
export async function settingsReadingRhythm(h){
 const p=h.archive,title='SYNTHETIC shared reading rhythm',body='SYNTHETIC 自动换行 👩🏽‍💻 é '+ '保留原话与完整表达。'.repeat(25)+'\n第二段，不重排。\n\n\n诗第一行\n诗第二行\n\n- 项目一\n- 项目二\n\n```js\n  const a = 1;\n\n  a++;\n```';
 await h.open({id:'shared-reading-rhythm',title,base:1609459200,messages:[{id:'shared-rhythm-1',text:body},{id:'shared-rhythm-2',text:'SYNTHETIC separate Input'}]});await eventually(async()=>(await h.state()).records.some(x=>x.originalText===body));
 const topic=await rpc(p,'CREATE_LIBRARY_TOPIC',{topic:{name:title,operationId:crypto.randomUUID()}}),entry=await rpc(p,'CONTINUE_THINKING',{thought:{topicId:topic.id,body,operationId:crypto.randomUUID()}}),thoughtBefore=await rpc(p,'GET_LIBRARY_ENTRY',{id:entry.id});
 const snapshot=await rpc(p,'PAIA_CONTEXT_CARDS_SNAPSHOT'),itemId=crypto.randomUUID();await rpc(p,'PAIA_CONTEXT_CARDS_CHANGE',{change:{kind:'put',operationId:crypto.randomUUID(),epoch:snapshot.epoch,itemId,card:'info',expectedRevision:0,body,section:'Synthetic'}});const contextBefore=(await rpc(p,'PAIA_CONTEXT_CARDS_SNAPSHOT')).items;
 let inputId,inputBefore;const rhythms=[];
 for(const [fontSize,pixels,appearance,width]of [['standard',17,'light',1440],['small',16,'dark',390],['large',19,'light',390],['xlarge',21,'dark',320]]){
  await rpc(p,'UPDATE_PREFERENCES',{changes:{fontSize,appearance,readingWidth:'narrow'}});await p.setViewportSize({width,height:900});await eventually(()=>p.evaluate(theme=>document.documentElement.dataset.paiaTheme===theme,appearance));
  for(const surface of ['archive','thought','context']){
   await p.setViewportSize({width:1440,height:900});let node;
   if(surface==='archive'){await p.locator('.sidebar [data-view="library"]').click();await openArchiveWindow(p,{text:title});node=p.locator('.library-prose').first();await node.waitFor();if(!inputId){inputId=await node.getAttribute('data-edit-id');inputBefore=await rpc(p,'GET_INPUT',{id:inputId});}}
   if(surface==='thought'){await p.locator('.sidebar [data-view="thoughts"]').click();node=p.locator(`[data-entry-id="${entry.id}"] [data-entry-field="body"]`);await eventually(async()=>await node.isVisible()||await p.locator(`.personal-topic-link[data-topic-id="${topic.id}"]`).isVisible(),'Thought route reaches existing detail or Root');if(!await node.isVisible())await p.locator(`.personal-topic-link[data-topic-id="${topic.id}"]`).click();}
   if(surface==='context'){await p.locator('.sidebar [data-view="memory"]').click();node=p.locator(`.context-item[data-item="${itemId}"] .item-text`);await eventually(async()=>await node.isVisible()||await p.locator('.context-card[data-card="info"] .card-link').isVisible(),'Context route reaches existing detail or Home');if(!await node.isVisible())await p.locator('.context-card[data-card="info"] .card-link').click();}
   await node.waitFor();await p.setViewportSize({width,height:900});const style=await node.evaluate(el=>{const s=getComputedStyle(el);return {size:parseFloat(s.fontSize),line:parseFloat(s.lineHeight),text:el.innerText,space:s.whiteSpace,children:[...el.children].map(c=>({tag:c.tagName,marginTop:getComputedStyle(c).marginTop,marginBottom:getComputedStyle(c).marginBottom}))};});console.info('READING_RHYTHM '+JSON.stringify({surface,width,fontSize,...style,text:undefined}));
   assert.equal(style.text,body,'all intentional newlines, blank lines, code indentation and Unicode remain');assert.equal(style.size,pixels);assert.equal(style.space,'pre-wrap');rhythms.push({surface,size:style.size,line:style.line});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await node.focus();assert.equal(await node.evaluate(el=>getComputedStyle(el).lineHeight),style.line+'px');assert.equal(await node.innerText(),body,'active editor preserves exact authored text');const selected=await node.evaluate(el=>{const selection=getSelection(),range=document.createRange();range.selectNodeContents(el);selection.removeAllRanges();selection.addRange(range);const value=selection.toString();selection.collapseToEnd();return value;});assert.equal(selected,body,'copy selection retains all original whitespace and code');
  }
 }
 for(const r of rhythms)assert.ok(Math.abs(r.line/r.size-1.65)<0.01,`${r.surface}: ${r.line}/${r.size}`);
 assert.deepEqual(await rpc(p,'GET_INPUT',{id:inputId}),inputBefore);assert.deepEqual(await rpc(p,'GET_LIBRARY_ENTRY',{id:entry.id}),thoughtBefore);assert.deepEqual((await rpc(p,'PAIA_CONTEXT_CARDS_SNAPSHOT')).items,contextBefore);assert.ok((await h.state()).records.some(x=>x.originalText===body));await rpc(p,'UPDATE_PREFERENCES',{changes:{fontSize:'xlarge',appearance:'light',readingWidth:'wide'}});await p.setViewportSize({width:1440,height:900});
}

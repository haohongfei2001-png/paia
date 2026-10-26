import assert from 'node:assert/strict';

// A bounded actual-DOM owner check for an existing isolated extension page.
// Caller owns its browser/network isolation and Source/release identity. This
// helper launches nothing; composition events are controlled, not physical IME.
export async function verifyManualPromptConflictPane(page){
 const mount=async mode=>page.evaluate(async mode=>{
  globalThis.__manualPromptPane?.view.dispose();globalThis.__manualPromptPane?.container.remove();
  const {mountManualPromptConflict}=await import(chrome.runtime.getURL('ui/prompt-conflict-view.js'));
  const container=document.createElement('section');container.id='synthetic-manual-prompt-conflict-pane';Object.assign(container.style,{position:'fixed',inset:'12px',zIndex:'2147483647',overflow:'auto',background:'white',color:'black'});document.body.append(container);
  const x={container,requests:[],notes:[],pending:[],committed:0,done:0,settled:false,release:null};
  const view=mountManualPromptConflict(container,{token:'synthetic-review',localText:'SYNTHETIC 本机\r\n原文',otherText:'SYNTHETIC 另一版本\n原文'},{
   button:(label,callback)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',event=>{if(event.isTrusted&&event.detail<2){x.lastAction=Promise.resolve(callback());x.lastAction.finally(()=>{x.settled=true;});}});return b;},
   copy:(node,text,attribute)=>{if(attribute)node.setAttribute(attribute,text);else node.textContent=text;},
   resolve:async request=>{x.requests.push(request);if(mode==='pending')await new Promise(resolve=>x.release=resolve);x.committed++;if(mode==='unknown')throw Error('SYNTHETIC committed; ACK missing');},
   done:()=>{x.done++;},cancel:()=>{},error:message=>x.notes.push(message),pending:value=>x.pending.push(value)
  });x.view=view;globalThis.__manualPromptPane=x;
  return [...container.querySelectorAll('.check-body')].map(n=>n.textContent);
 },mode);
 const state=()=>page.evaluate(()=>{const x=globalThis.__manualPromptPane;return {requests:x.requests,notes:x.notes,pending:x.pending,committed:x.committed,done:x.done,draft:x.container.querySelector('textarea').value,disabled:[...x.container.querySelectorAll('button')].slice(0,4).every(b=>b.disabled)};});
 try{
  assert.deepEqual(await mount('success'),['SYNTHETIC 本机\r\n原文','SYNTHETIC 另一版本\n原文']);
  const pane=page.locator('#synthetic-manual-prompt-conflict-pane');
  await pane.locator('textarea').evaluate(n=>n.dispatchEvent(new CompositionEvent('compositionstart')));
  await pane.getByRole('button',{name:'保存整理后的正文',exact:true}).click();assert.equal((await state()).requests.length,0);
  await pane.locator('textarea').evaluate(n=>n.dispatchEvent(new CompositionEvent('compositionend')));
  await pane.getByRole('button',{name:'保存整理后的正文',exact:true}).click();await page.evaluate(()=>globalThis.__manualPromptPane.lastAction);let result=await state();assert.equal(result.requests[0].text,'SYNTHETIC 本机\r\n原文');assert.equal(result.done,1);
  await mount('unknown');await pane.locator('textarea').fill('SYNTHETIC retained human draft');await pane.getByRole('button',{name:'保存整理后的正文',exact:true}).click();await page.evaluate(()=>globalThis.__manualPromptPane.lastAction);result=await state();assert.equal(result.committed,1);assert.equal(result.done,0);assert.equal(result.requests.length,1);assert.equal(result.draft,'SYNTHETIC retained human draft');assert.equal(result.disabled,true);assert.match(result.notes[0],/结果尚未确认/);assert.doesNotMatch(result.notes[0],/未保存/);
  await mount('pending');await pane.getByRole('button',{name:'保留另一版本',exact:true}).click();await page.waitForFunction(()=>typeof globalThis.__manualPromptPane.release==='function');await page.evaluate(async()=>{const x=globalThis.__manualPromptPane;x.view.dispose();x.container.remove();x.release();await x.lastAction;});result=await state();assert.equal(result.committed,1);assert.equal(result.done,0);assert.deepEqual(result.pending,[true]);assert.deepEqual(result.notes,[]);
  return {literalBodies:true,crlfExact:true,controlledCompositionRefusal:true,committedReplyLossUnconfirmed:true,draftRetained:true,noAutomaticResubmit:true,disposedLateCompletionQuiet:true,fullVisualQualification:false,physicalIME:false};
 }finally{await page.evaluate(()=>{const x=globalThis.__manualPromptPane;if(x){x.view.dispose();x.container.remove();delete globalThis.__manualPromptPane;}});}
}

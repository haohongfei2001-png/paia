import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {eventually} from './fake-chatgpt.mjs';
const rpc=async(p,type,fields={})=>{const r=await p.evaluate(m=>chrome.runtime.sendMessage(m),{type,...fields});assert.equal(r?.ok,true,JSON.stringify(r));return r.data;};
export async function verifyD5NativeEdit({h,p,field,id,variant,segment}){
 const source=structuredClone((await h.state()).records),outcomes=[];
 const observe=()=>{globalThis.__d5NativeEvents=[];const ids=new WeakMap();let serial=0;const id=node=>node?(ids.has(node)?ids.get(node):(ids.set(node,++serial),serial)):null;
  for(const type of ['beforeinput','input','keydown','keyup','compositionstart','compositionend'])document.addEventListener(type,event=>{const field=event.target?.closest?.('[data-edit-id]');if(!field)return;const walk=document.createTreeWalker(field,NodeFilter.SHOW_TEXT),nodes=[];let node;while((node=walk.nextNode()))nodes.push({id:id(node),data:node.data});const elements=[field,...field.querySelectorAll('*')].map(node=>({id:id(node),name:node.nodeName,parent:id(node.parentNode),children:[...node.childNodes].map(id)})),selection=getSelection();__d5NativeEvents.push({type,trusted:event.isTrusted,inputType:event.inputType,key:event.key,data:event.data,composing:event.isComposing,html:field.innerHTML,nodes,elements,anchor:{node:id(selection?.anchorNode),offset:selection?.anchorOffset},focus:{node:id(selection?.focusNode),offset:selection?.focusOffset},collapsed:selection?.isCollapsed});if(__d5NativeEvents.length>200)__d5NativeEvents.shift();},true);
 };await p.addInitScript(observe);await p.evaluate(observe);

 const neutralReplacementProbe=async expected=>{
  const events=await p.evaluate(()=>__d5NativeEvents),before=[...events].reverse().find(event=>event.type==='beforeinput'&&event.inputType==='insertText'&&event.data===expected);
  if(!before||!outcomes.length)return null;
  const definitions=new Map([...before.elements,...before.nodes].map(node=>[node.id,node])),tree=id=>{const node=definitions.get(id);return node.name?{id,name:node.name,children:node.children.map(tree)}:{id,data:node.data};},topology=tree(before.elements[0].id);
  const presentation=await field.evaluate(el=>({className:el.className,theme:document.documentElement.dataset.paiaTheme,lang:document.documentElement.lang,rootStyle:document.documentElement.style.cssText,css:[...document.styleSheets].flatMap(sheet=>[...sheet.cssRules].map(rule=>rule.cssText)).join('\n')}));
  const moduleSource=await readFile(new URL('../../ui/editable-text.js',import.meta.url),'utf8'),rows=[];
  const shapes=['retained-dom','canonical-text','exact-topology','exact-topology-ranges','exact-topology-listeners','exact-topology-css','exact-topology-css-ranges-listeners'];
  for(const shape of shapes)for(const action of ['fill','keyboard']){
   let page;
   try{
    page=await h.context.newPage();await page.setContent('<!doctype html><meta charset="utf-8"><style>body{font:18px/1.85 system-ui;margin:24px}#neutral{white-space:pre-wrap;min-height:80px;outline:1px solid #777}</style><div id="document-body"><section class="library-block"><div id="neutral" data-edit-id="neutral" contenteditable="plaintext-only"></div></section></div>');
    if(shape.includes('css')){await page.addStyleTag({content:presentation.css});await page.evaluate(style=>{const el=document.getElementById('neutral');el.className=style.className;document.documentElement.dataset.paiaTheme=style.theme;document.documentElement.lang=style.lang;document.documentElement.style.cssText=style.rootStyle;},presentation);}
    const prepared=await page.evaluate(({html,body,shape,topology})=>{
     const el=document.getElementById('neutral'),nodes=new Map();const build=node=>{const value=node.name?document.createElement(node.name):document.createTextNode(node.data);nodes.set(node.id,value);if(node.name)value.append(...node.children.map(build));return value;};
     if(shape==='retained-dom')el.innerHTML=html;else if(shape==='canonical-text')el.textContent=body;else el.replaceChildren(...topology.children.map(build));
     const describe=node=>node.nodeType===3?{data:node.data}:{name:node.nodeName,children:[...node.childNodes].map(describe)},expected=node=>node.name?{name:node.name,children:node.children.map(expected)}:{data:node.data},exactTopology=JSON.stringify(describe(el))===JSON.stringify(expected(topology));
     globalThis.__d5Ranges=[];if(shape.includes('ranges')){const texts=[...nodes.values()].filter(node=>node.nodeType===3);for(const node of [texts[0],texts.at(-1)]){const range=document.createRange();range.setStart(node,0);range.setEnd(node,node.length);__d5Ranges.push(range);}const selected=document.createRange();selected.selectNodeContents(el);__d5Ranges.push(selected);}
     return {exactTopology,topology:describe(el),liveRanges:__d5Ranges.length};
    },{html:before.html,body:outcomes.at(-1).expected,shape,topology});
    if(shape.startsWith('exact-topology'))assert.equal(prepared.exactTopology,true,'neutral replay preserves every adjacent Text-node boundary');
    await page.evaluate(observe);
    if(shape.includes('listeners'))await page.evaluate(async code=>{
     const url=URL.createObjectURL(new Blob([code],{type:'text/javascript'}));try{const {editableTextSnapshot,NativeLineBreakTracker}=await import(url),el=document.getElementById('neutral'),owner=new NativeLineBreakTracker();
      el.addEventListener('beforeinput',event=>{owner.before(el,event,getSelection());const selection=getSelection();if(selection.rangeCount){const range=selection.getRangeAt(0);range.intersectsNode(el);for(const old of __d5Ranges){range.isPointInRange(old.startContainer,old.startOffset);range.isPointInRange(old.endContainer,old.endOffset);}}});
      el.addEventListener('input',event=>owner.input(el,event,getSelection()));document.addEventListener('selectionchange',()=>{editableTextSnapshot(el);const selection=getSelection();if(selection.rangeCount){globalThis.__d5SelectedRange=selection.getRangeAt(0).cloneRange();__d5SelectedRange.getClientRects();}});
     }finally{URL.revokeObjectURL(url);}
    },moduleSource);
    const neutral=page.locator('#neutral');if(action==='fill')await neutral.fill(expected);else{await neutral.focus();await page.keyboard.press('Control+a');await page.keyboard.insertText(expected);}
    rows.push({shape,action,expected,prepared,trackerHistory:shape.includes('listeners')?'fresh tracker; prior product provenance is not reconstructed':null,after:await neutral.evaluate(el=>({html:el.innerHTML,text:el.innerText,textContent:el.textContent})),events:await page.evaluate(()=>__d5NativeEvents)});
    await page.screenshot({path:`work/qa-dvn-direct-edit/d5-reading-surfaces/${variant}-${segment}-neutral-${shape}-${action}.png`});
   }catch(error){rows.push({shape,action,error:String(error)});}
   finally{if(page)await page.close().catch(error=>rows.push({shape,action,closeError:String(error)}));await writeFile(`work/qa-dvn-direct-edit/d5-reading-surfaces/${variant}-${segment}-neutral-partial.json`,JSON.stringify({before,canonicalBody:outcomes.at(-1).expected,rows},null,2));}
  }
  return {before,canonicalBody:outcomes.at(-1).expected,rows,scope:'Fresh offline neutral fields: exact node topology, live Ranges, copied product CSS and read-only tracker/selection listeners isolated; no storage or product acceptance'};
 };
 try{
 const saved=async(expected,label)=>{
  try{await eventually(async()=>(await rpc(p,'GET_INPUT',{id})).libraryText===expected&&await p.locator('#save-status').getAttribute('data-state')==='saved',label);outcomes.push({label,expected,actual:(await rpc(p,'GET_INPUT',{id})).libraryText,html:await field.evaluate(e=>e.innerHTML)});}
  catch(error){await mkdir('work/qa-dvn-direct-edit/d5-reading-surfaces',{recursive:true});await writeFile(`work/qa-dvn-direct-edit/d5-reading-surfaces/${variant}-${segment}-native-edit-failure.json`,JSON.stringify({label,expected,actual:await rpc(p,'GET_INPUT',{id}),dom:await field.evaluate(e=>({html:e.innerHTML,text:e.innerText,textContent:e.textContent})),outcomes,events:await p.evaluate(()=>__d5NativeEvents),neutral:await neutralReplacementProbe(expected).catch(error=>({error:String(error)})),errors:h.errors},null,2));throw error;}
 };
 if(segment==='bulk'){
 for(const value of ['A\nB','A\n\nB','A\n\n\nB','\nA','\n\nA','A\n','A\n\n','\n\n','', ' literal <div> & <br>\t👩‍💻 é\n  tail  ']){await field.fill(value);await saved(value,'native bulk text preserves '+JSON.stringify(value));}
 for(const [key,count]of [['Enter',1],['Enter',2],['Shift+Enter',1],['Shift+Enter',2]]){
  await field.fill('HEAD');await saved('HEAD','keyboard base');await field.press('End');for(let i=0;i<count;i++)await p.keyboard.press(key);await p.keyboard.insertText('TAIL');await saved('HEAD'+'\n'.repeat(count)+'TAIL',key+' internal line breaks');
 }
 await field.fill('TAIL');await saved('TAIL','leading keyboard base');await field.press('Home');await p.keyboard.press('Enter');await saved('\nTAIL','leading Enter keeps the empty first line');
 await field.fill('');await saved('','bulk insertion base');await p.keyboard.insertText('\nPasted block one\n\nPasted block two\n');await saved('\nPasted block one\n\nPasted block two\n','native bulk insertion retains leading, blank and trailing lines');
 await field.fill('HEAD');await saved('HEAD','trailing keyboard base');await field.press('End');await p.keyboard.press('Shift+Enter');await saved('HEAD\n','trailing Shift+Enter placeholder is not an extra authored newline');
 }
 if(segment==='reload'){
 // A saved/reloaded body is one literal text node. Real editing then mixes
 // literal newlines with native line containers; do not test only fill's shape.
 const reloaded='HEAD\n\nTAIL';
 for(const [key,offset,expected]of [['Enter',4,'HEAD\n\n\nTAIL'],['Enter',5,'HEAD\n\n\nTAIL'],['Shift+Enter',6,'HEAD\n\n\nTAIL'],['Backspace',6,'HEAD\nTAIL'],['Delete',4,'HEAD\nTAIL'],['Enter',10,'HEAD\n\nTAIL\n'],['Enter',0,'\nHEAD\n\nTAIL']]){
  await field.fill(reloaded);await saved(reloaded,'reload edit base');await p.reload();await field.waitFor();assert.equal(await field.textContent(),reloaded);
  await field.evaluate((el,at)=>{assertTextNode(el);el.focus();getSelection().setBaseAndExtent(el.firstChild,at,el.firstChild,at);function assertTextNode(node){if(node.childNodes.length!==1||node.firstChild.nodeType!==3)throw Error('reload must render the canonical literal text node');}},offset);
  await p.keyboard.press(key);await saved(expected,`reloaded literal body ${key} at ${offset}`);
 }
 }
 if(segment==='sentinel'){
 const line=async(key='Enter')=>{await field.fill('HEAD');await saved('HEAD','terminal lifecycle base');await field.press('End');await p.keyboard.press(key);await saved('HEAD\n','one native terminal break');};
 await line();await p.keyboard.press('Enter');await saved('HEAD\n\n','second native terminal break after first save');await p.keyboard.insertText('TAIL');await saved('HEAD\n\nTAIL','typing consumes the native terminal caret placeholder');
 await line('Shift+Enter');await field.evaluate(el=>{const walk=document.createTreeWalker(el,NodeFilter.SHOW_TEXT),first=walk.nextNode();getSelection().setBaseAndExtent(first,0,first,0);});await p.keyboard.insertText('BEFORE ');await saved('BEFORE HEAD\n','editing before terminal placeholder preserves its identity');await p.locator('#document-title').focus();await field.focus();await saved('BEFORE HEAD\n','blur and refocus do not reinterpret the sentinel as authored text');
 await line();await p.keyboard.press('Backspace');await saved('HEAD','Backspace removes the authored final break');
 await line();await p.keyboard.press('Delete');await saved('HEAD\n','Delete at terminal caret does not delete an authored break');
 await field.fill('EXACT\n\n');await saved('EXACT\n\n','select-all replacement retains two authored trailing newlines');
 for(const exact of ['\n','\n\n','']){await line();await field.fill(exact);await saved(exact,'select-all terminal replacement preserves '+JSON.stringify(exact));if(exact==='\n\n'){await field.press('Control+End');await p.keyboard.press('Enter');await saved('\n\n\n','native Enter after replaced empty lines preserves every authored break');await p.keyboard.insertText('TAIL');await saved('\n\n\nTAIL','typing after replaced empty lines preserves exact preceding breaks');await p.keyboard.press('Enter');await saved('\n\n\nTAIL\n','terminal Enter after residue and typing preserves both independent exclusions');await p.keyboard.press('Shift+Enter');await saved('\n\n\nTAIL\n\n','repeated terminal break retains residue and authored whitespace');const selected=await field.evaluate(async el=>{el.focus();getSelection().selectAllChildren(el);const {captureReaderSelection}=await import('./reader-selection.js');const current=captureReaderSelection(document.getElementById('document-body'),getSelection());return {text:current.text,body:current.input.body,span:current.input.span};});assert.deepEqual(selected,{text:'\n\n\nTAIL\n\n',body:'\n\n\nTAIL\n\n',span:{start:0,end:9}},'selection shares exact residue and terminal provenance');}}
 await line();await field.press('Control+z');await saved('HEAD','Undo drops the terminal edit');await field.press('Control+Shift+z');await saved('HEAD\n','Redo paints exact canonical text without a native sentinel');await p.reload();await field.waitFor();assert.equal(await field.textContent(),'HEAD\n','reload retains exactly one authored terminal newline');
 await line();await field.evaluate(el=>{el.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));el.textContent='SYNTHETIC 未完 ni\n\n';el.dispatchEvent(new InputEvent('input',{bubbles:true,isComposing:true,inputType:'insertCompositionText',data:'ni'}));});await p.waitForTimeout(650);assert.equal((await rpc(p,'GET_INPUT',{id})).libraryText,'HEAD\n','unfinished synthetic composition never persists partial text');
 const completed='SYNTHETIC 完整中文\n\n';await field.evaluate((el,value)=>{el.textContent=value;el.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:value}));el.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:value}));},completed);await saved(completed,'completed composition replacement retains authored trailing whitespace');
 }
 if(segment==='range'){
 await field.fill('HEAD\n');await saved('HEAD\n','reused-node canonical base');await p.reload();await field.waitFor();assert.equal(await field.textContent(),'HEAD\n');await field.fill('HEAD');await saved('HEAD','full replacement supersedes the authored old trailing LF');
 await field.evaluate(el=>{const node=el.firstChild;el.focus();getSelection().setBaseAndExtent(node,0,node,0);});await p.keyboard.insertText('BEFORE ');await saved('BEFORE HEAD','native prefix insertion moves the within-node sentinel range');await p.locator('#document-title').focus();await field.focus();await saved('BEFORE HEAD','within-node sentinel survives blur and refocus');
 await field.evaluate(el=>{getSelection().selectAllChildren(el);});await eventually(()=>p.locator('.reader-selection').isVisible());await p.evaluate(()=>{globalThis.__d5RangeCopy=null;Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{globalThis.__d5RangeCopy=text;}}});});await p.keyboard.press('Alt+s');await p.keyboard.press('Enter');assert.equal(await p.evaluate(()=>__d5RangeCopy),'BEFORE HEAD','full selected copy excludes only the proved terminal character');
 const captured=await field.evaluate(async el=>{const {captureReaderSelection}=await import('./reader-selection.js');const selected=captureReaderSelection(document.getElementById('document-body'),getSelection());return {text:selected.text,body:selected.input.body,span:selected.input.span};});assert.deepEqual(captured,{text:'BEFORE HEAD',body:'BEFORE HEAD',span:{start:0,end:11}});await p.reload();await field.waitFor();assert.equal(await field.textContent(),'BEFORE HEAD','reload contains only acknowledged authored text');
 }
 if(segment==='selection'){
 const topic=await rpc(p,'CREATE_LIBRARY_TOPIC',{topic:{name:'SYNTHETIC multiline selection',operationId:crypto.randomUUID()}});
 const body='A👩‍💻\n\nB é',selected='👩‍💻\n\nB é';await field.fill(body);await saved(body,'multiline selection base');
 await field.evaluate(el=>{el.focus();const walk=document.createTreeWalker(el,NodeFilter.SHOW_TEXT),nodes=[];let node;while((node=walk.nextNode()))if(node.data)nodes.push(node);getSelection().setBaseAndExtent(nodes[0],1,nodes.at(-1),nodes.at(-1).length);});
 await eventually(()=>p.locator('.reader-selection').isVisible());await p.evaluate(()=>{globalThis.__d5Copied=null;Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{globalThis.__d5Copied=text;}}});});
 await p.keyboard.press('Alt+s');await p.keyboard.press('Enter');assert.equal(await p.evaluate(()=>__d5Copied),selected,'native multiline selection Copy uses authored line boundaries');
 await p.locator('.reader-selection').getByRole('button',{name:'加入主题',exact:true}).click();const picker=p.locator('#topic-action-dialog');await picker.waitFor();assert.equal(await picker.locator('.topic-selection-preview').textContent(),selected);
 await picker.getByLabel('SYNTHETIC multiline selection',{exact:true}).check();await picker.getByRole('button',{name:'加入',exact:true}).click();await eventually(()=>picker.isHidden());
 const entries=await rpc(p,'TOPIC_DOCUMENT_PAGE',{options:{topicId:topic.id,limit:40}});assert.equal(entries.items.length,1);assert.equal(entries.items[0].entry.body,selected,'trusted range resolves the same exact substring, not shifted text');
 const first='First\n\nversion',second='Second\n\nversion';await field.fill(first);await saved(first,'undo first');await field.fill(second);await saved(second,'undo second');await field.press('Control+z');await saved(first,'existing undo journal preserves exact multiline work');
 assert.deepEqual((await h.state()).records,source,'native edits and excerpt reuse leave immutable Source unchanged');assert.deepEqual(h.errors,[]);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.externalRequests,0);
 await p.reload();await p.locator(`[data-edit-id="${id}"]`).waitFor();assert.equal(await p.locator(`[data-edit-id="${id}"]`).textContent(),first,'reload renders the same authored newlines');
 }
 assert.deepEqual((await h.state()).records,source);assert.deepEqual(h.errors,[]);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.externalRequests,0);
 await mkdir('work/qa-dvn-direct-edit/d5-reading-surfaces',{recursive:true});await writeFile(`work/qa-dvn-direct-edit/d5-reading-surfaces/${variant}-${segment}-native-edit.json`,JSON.stringify({result:'PASS',head:process.env.PAIA_TESTED_HEAD,variant,segment,outcomes,sourceUnchanged:true},null,2));
 }finally{await mkdir('work/qa-dvn-direct-edit/d5-reading-surfaces',{recursive:true});await writeFile(`work/qa-dvn-direct-edit/d5-reading-surfaces/${variant}-${segment}-native-retained.json`,JSON.stringify({head:process.env.PAIA_TESTED_HEAD,variant,segment,outcomes,events:await p.evaluate(()=>globalThis.__d5NativeEvents).catch(error=>({unavailable:error.message})),errors:h.errors},null,2));}
}
